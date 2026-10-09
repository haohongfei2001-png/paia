import test from 'node:test';import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {ArchiveError} from '../core/constants.js';
import {local} from './harness/thought-m1.mjs';
import {revisionShouldPrune,REVISION_POLICY} from '../core/ia-store.js';
import {prepareHumanAllocation,beginHumanAllocation,humanClock,finishHumanAllocation,releaseHumanAllocation} from '../core/browser-native-sync/human-library-allocation.js';
globalThis.IDBKeyRange=IDBKeyRange;
test('shared prune predicate matches the real original cursor, including old important rows, cutoff and invalid date',async()=>{
 const now='2026-10-09T00:00:00.000Z',cutoff=Date.parse(now)-REVISION_POLICY.days*86400000,s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=>now});await s.consent(true);await s.finishFoundation();
 const rows=Array.from({length:24},(_,n)=>({id:'synthetic-important-'+n,entityKey:'library_entry:synthetic-prune',sequence:n+1,listKey:['library_entry:synthetic-prune',n+1],important:true,at:new Date(cutoff-1).toISOString()}));
 for(const [suffix,at]of [['boundary',new Date(cutoff).toISOString()],['old',new Date(cutoff-1).toISOString()],['invalid','invalid-date']]){const sequence=rows.length+1;rows.push({id:'synthetic-'+suffix,entityKey:'library_entry:synthetic-prune',sequence,listKey:['library_entry:synthetic-prune',sequence],important:false,at});}
 let important=0;const expected=[...rows].reverse().filter(row=>{if(row.important)important++;return !revisionShouldPrune(row,cutoff,important);}).map(r=>r.id).sort();
 await s.repository.transaction(true,async t=>{for(const row of rows)await t.put('revisions',row);await s.pruneEntity(t,'library_entry:synthetic-prune');});
 assert.deepEqual((await s.repository.transaction(false,t=>t.all('revisions'))).map(r=>r.id).sort(),expected);assert.ok(expected.includes('synthetic-boundary'));assert.ok(expected.includes('synthetic-invalid'));assert.equal(expected.filter(id=>id.startsWith('synthetic-important-')).length,20);
});
test('private human prune slot is transaction scoped, preserves rollback and refuses two active history owners',async()=>{
 const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();const a=prepareHumanAllocation(s),at=a.clock(),cap=a.seal(),active=new WeakSet();s.humanLibraryJournal={pruneTime:t=>active.has(t)?humanClock(s,t):null};
 await assert.rejects(s.foundationWrite(async t=>{beginHumanAllocation(t,cap);active.add(t);try{await t.put('revisions',{id:'synthetic-old',entityKey:'input:old',listKey:['input:old',1],at:'2000-01-01T00:00:00.000Z'});await s.pruneEntity(t,'input:old');finishHumanAllocation(t,cap);throw new ArchiveError('SYNTHETIC_ROLLBACK');}finally{active.delete(t);releaseHumanAllocation(t);}}),{code:'SYNTHETIC_ROLLBACK'});assert.equal(await s.repository.transaction(false,t=>t.count('revisions')),0);
 s.humanLibraryJournal={pruneTime:()=>at};s.inputWorkingJournal={pruneTime:()=>at};await assert.rejects(s.foundationWrite(t=>s.pruneEntity(t,'input:old')),{code:'BNS_HISTORY_OWNER_CONFLICT'});await assert.rejects(s.pruneRevisions(),{code:'BNS_HUMAN_HISTORY_RETIREMENT_UNAVAILABLE'});
});
