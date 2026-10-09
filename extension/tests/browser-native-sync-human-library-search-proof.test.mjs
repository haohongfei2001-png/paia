import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {humanPlanEntry,prepareHumanTopicEditPlan,humanPlanJournalRows} from '../core/browser-native-sync/human-library-plan.js';
import {captureHumanCompletedSearch,requireHumanCompletedSearch,projectHumanSearchRow} from '../core/browser-native-sync/human-library-search-proof.js';
import {searchBatch,rebuildBatch} from '../core/library-search.js';
globalThis.IDBKeyRange=IDBKeyRange;
async function fixture(){let tick=0;const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString()});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-completed-search',deviceId:'synthetic-source'});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core};}
async function snapshot(s){return s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async key=>[key,await t.all(key)]))));}
async function completed(s){for(let n=0;n<30;n++)if(!(await searchBatch(s)).pending)return;assert.fail('original bounded index did not finish');}
const op=()=>crypto.randomUUID();
async function topic(f){return f.s.createTopic({name:'Synthetic Ｃompleted 汉字',operationId:op()});}
async function planned(f,id){return prepareHumanTopicEditPlan(f.s,f.core,{id,expectedRevision:0,changes:{summary:'Synthetic next summary'},operationId:op()},await humanPlanEntry(f.s,f.core));}
async function physical(s,store,row){await new Promise((resolve,reject)=>{const tx=s.repository.db.transaction([store],'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>{};tx.objectStore(store).put(structuredClone(row));});}

test('actual completed owners qualify through one readonly capture, empty/cloned capabilities have no authority',async()=>{
 const f=await fixture();await topic(f);await f.s.createEntry({actor:'user',body:'Synthetic body café 🧭',title:'Synthetic title',type:'idea',formation:'explicit',evidence:[],operationId:op()});await completed(f.s);
 const before=await snapshot(f.s),writes=[],transaction=f.s.repository.transaction.bind(f.s.repository);f.s.repository.transaction=(write,fn,...rest)=>{writes.push(write);return transaction(write,fn,...rest);};
 const cap=await captureHumanCompletedSearch(f.s,f.core);assert.deepEqual(writes,[false]);assert.deepEqual(Reflect.ownKeys(cap),[]);assert.ok(Object.isFrozen(cap));assert.deepEqual(await snapshot(f.s),before);
 await f.core.transaction(true,t=>requireHumanCompletedSearch(t,cap));
 for(const bad of [{},structuredClone(cap),Object.freeze({completed:true})])await assert.rejects(f.core.transaction(true,t=>requireHumanCompletedSearch(t,bad)),{code:'BNS_HUMAN_SEARCH_PROOF_REQUIRED'});
 assert.deepEqual(await snapshot(f.s),before);
});
test('original planned canonical and exact pre-queue Topic history phases omit only proven copied local completion',async()=>{
 const f=await fixture(),q=await topic(f);await completed(f.s);const before=await snapshot(f.s),cap=await captureHumanCompletedSearch(f.s,f.core),plan=await planned(f,q.id),view=humanPlanJournalRows(plan),current=view.rows.find(r=>r.type==='topic'),history=view.rows.find(r=>r.type==='history'&&r.after.kind==='topic'&&r.after.reason==='edit');
 assert.ok(current.before.indexedSearchVersion);assert.ok(history.after.before.indexedSearchVersion);assert.ok(history.after.after.indexedSearchVersion);
 assert.notDeepEqual(history.after.after,current.after,'actual history is before queueSearch/touch, not final canonical');
 for(const phase of ['CANONICAL_BEFORE','CANONICAL_AFTER']){
  const raw=phase==='CANONICAL_BEFORE'?current.before:current.after,out=projectHumanSearchRow(cap,plan,'topic',raw,phase),expected=structuredClone(raw);delete expected.indexedSearchVersion;assert.deepEqual(out,expected);
 }
 const out=projectHumanSearchRow(cap,plan,'history',history.after,'CANONICAL_AFTER'),expected=structuredClone(history.after);delete expected.before.indexedSearchVersion;delete expected.after.indexedSearchVersion;assert.deepEqual(out,expected,'all four phase fields, entire canonical text and history metadata remain exact');
 assert.throws(()=>projectHumanSearchRow(cap,plan,'topic',{...current.after,summary:'caller-forged'},'CANONICAL_AFTER'),{code:'BNS_HUMAN_SEARCH_PROOF_REQUIRED'});
 assert.throws(()=>projectHumanSearchRow(cap,plan,'topic',current.before,'UNKNOWN_PHASE'),{code:'BNS_HUMAN_SEARCH_PROOF_REQUIRED'});
 assert.deepEqual(await snapshot(f.s),before,'proof and original plan do not commit any changes');
});
test('untouched exact queues stay admissible and future plan remains original, no future posting state is invented',async()=>{
 const f=await fixture(),q=await topic(f),before=await snapshot(f.s),cap=await captureHumanCompletedSearch(f.s,f.core),plan=await planned(f,q.id),row=humanPlanJournalRows(plan).rows.find(r=>r.type==='topic').after;
 assert.equal(Object.hasOwn(row,'indexedSearchVersion'),false);assert.deepEqual(projectHumanSearchRow(cap,plan,'topic',row,'CANONICAL_AFTER'),row);assert.deepEqual(await snapshot(f.s),before);
});
test('450-token original partial write and old-index partial delete refuse without any additional writes',async()=>{
 const f=await fixture();const e=await f.s.createEntry({actor:'user',body:Array.from({length:450},(_,i)=>'synthetic_token_'+i).join(' '),type:'idea',formation:'explicit',evidence:[],operationId:op()});await searchBatch(f.s);let before=await snapshot(f.s);assert.equal(before.libraryMigrationItems.find(t=>t.ownerId===e.id).phase,'write');assert.equal(before.libraryMigrationItems.find(t=>t.ownerId===e.id).offset,200);await assert.rejects(captureHumanCompletedSearch(f.s,f.core),{code:'BNS_HUMAN_SEARCH_UNPROVEN'});assert.deepEqual(await snapshot(f.s),before);
 await completed(f.s);const journal=f.s.humanLibraryJournal;f.s.humanLibraryJournal=null;await f.s.editEntry({id:e.id,expectedRevision:0,changes:{body:'Synthetic changed next'},operationId:op()});f.s.humanLibraryJournal=journal;await searchBatch(f.s);before=await snapshot(f.s);assert.equal(before.libraryMigrationItems.find(t=>t.ownerId===e.id).phase,'delete');assert.ok(before.librarySearchTerms.length>0);await assert.rejects(captureHumanCompletedSearch(f.s,f.core),{code:'BNS_HUMAN_SEARCH_UNPROVEN'});assert.deepEqual(await snapshot(f.s),before);
});
test('exact complete posting oracle rejects missing/extra/body-containing/foreign rows and preserves actual stores',async()=>{
 for(const change of ['missing','body','foreign','extra']){
  const f=await fixture();await topic(f);await completed(f.s);const baseline=await snapshot(f.s),row=structuredClone(baseline.librarySearchTerms[0]);
  if(change==='missing')await f.s.repository.transaction(true,t=>t.delete('librarySearchTerms',row.id));
  else{if(change==='body')row.body='Synthetic forbidden derivative body';if(change==='foreign'){row.ownerId='synthetic-orphan';row.id=JSON.stringify([row.ownerKind,row.ownerId,row.field,row.tokenHash]);}if(change==='extra'){row.tokenHash='synthetic_extra';row.id=JSON.stringify([row.ownerKind,row.ownerId,row.field,row.tokenHash]);}await physical(f.s,'librarySearchTerms',row);}
  const before=await snapshot(f.s);await assert.rejects(captureHumanCompletedSearch(f.s,f.core),{code:'BNS_HUMAN_SEARCH_UNPROVEN'});assert.deepEqual(await snapshot(f.s),before);
 }
});
test('actual local search-only drift between prepare and final transaction aborts even an already-started canonical write',async()=>{
 const f=await fixture();await topic(f);await completed(f.s);const cap=await captureHumanCompletedSearch(f.s,f.core),state=await snapshot(f.s),row=structuredClone(state.librarySearchTerms[0]);row.version='synthetic-stale-version';await physical(f.s,'librarySearchTerms',row);const before=await snapshot(f.s);
 await assert.rejects(f.core.transaction(true,async t=>{await t.put('meta',{id:'synthetic-proof-aborted-pointer',value:1});await requireHumanCompletedSearch(t,cap);}),{code:'BNS_HUMAN_CHANGED'});assert.deepEqual(await snapshot(f.s),before,'complete canonical/queue/history/Core/pointer rollback');
});
test('original incomplete rebuild refuses and only exact completed rebuild metadata can qualify',async()=>{
 const f=await fixture();await topic(f);await completed(f.s);await f.s.ensureLibrarySearch();const before=await snapshot(f.s);await assert.rejects(captureHumanCompletedSearch(f.s,f.core),{code:'BNS_HUMAN_SEARCH_UNPROVEN'});assert.deepEqual(await snapshot(f.s),before);
 for(let i=0;i<5;i++)await rebuildBatch(f.s);await completed(f.s);await captureHumanCompletedSearch(f.s,f.core);
 const m=(await snapshot(f.s)).meta.find(r=>r.id==='library-search-rebuild');await physical(f.s,'meta',{...m,extra:true});await assert.rejects(captureHumanCompletedSearch(f.s,f.core),{code:'BNS_HUMAN_SEARCH_UNPROVEN'});
});

test('actual device identity change cannot reuse a captured completion proof or project a named plan',async()=>{
 const f=await fixture(),q=await topic(f);await completed(f.s);const cap=await captureHumanCompletedSearch(f.s,f.core),plan=await planned(f,q.id),row=humanPlanJournalRows(plan).rows.find(r=>r.type==='topic').after,before=await snapshot(f.s);f.core.deviceId='synthetic-other-device';
 assert.throws(()=>projectHumanSearchRow(cap,plan,'topic',row,'CANONICAL_AFTER'),{code:'BNS_HUMAN_CHANGED'});
 await assert.rejects(f.core.transaction(true,t=>requireHumanCompletedSearch(t,cap)),{code:'BNS_HUMAN_CHANGED'});assert.deepEqual(await snapshot(f.s),before);
});

test('a physically identical second actual database cannot reuse a captured database-lifetime capability',async()=>{
 const f=await fixture(),q=await topic(f);await completed(f.s);const cap=await captureHumanCompletedSearch(f.s,f.core),plan=await planned(f,q.id),row=humanPlanJournalRows(plan).rows.find(r=>r.type==='topic').after,source=await snapshot(f.s),oldDatabase=f.s.repository.db;
 const factory=new IDBFactory(),next=await new Promise((resolve,reject)=>{const request=factory.open('synthetic-physical-fork',1);request.onupgradeneeded=()=>{for(const name of Object.keys(source)){const schema=oldDatabase.transaction([name]).objectStore(name),store=request.result.createObjectStore(name,{keyPath:schema.keyPath,autoIncrement:schema.autoIncrement});for(const key of schema.indexNames){const index=schema.index(key);store.createIndex(key,index.keyPath,{unique:index.unique,multiEntry:index.multiEntry});}}};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 await new Promise((resolve,reject)=>{const tx=next.transaction(Object.keys(source),'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>{};for(const [name,rows]of Object.entries(source))for(const value of rows)tx.objectStore(name).put(structuredClone(value));});
 f.s.repository.db=next;assert.deepEqual(await snapshot(f.s),source,'all actual stored bytes are identical but database lifetime differs');
 assert.throws(()=>projectHumanSearchRow(cap,plan,'topic',row,'CANONICAL_AFTER'),{code:'BNS_HUMAN_CHANGED'});
 await assert.rejects(f.core.transaction(true,t=>requireHumanCompletedSearch(t,cap)),{code:'BNS_HUMAN_CHANGED'});assert.deepEqual(await snapshot(f.s),source);f.s.repository.db=oldDatabase;next.close();
});
