import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,cp,readFile,appendFile,writeFile,mkdir,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import {FakeChatGPT} from './harness/fake-chatgpt.mjs';
test('M5 real Chrome background mechanics faults and protection matrix with actual IndexedDB',{timeout:120000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'paia-m5-mechanics-'));let h;try{
 await cp(process.cwd(),dir,{recursive:true,filter:p=>!/(\/\.git(?:\/|$)|\/work(?:\/|$)|\/outputs(?:\/|$))/.test(p)});
 const source=await readFile('tests/organizer-m3.test.mjs','utf8');const selected=['synthetic pipeline','exact replay','cancel fences','small budget','timeout is bounded','tombstone fences','note-only','genuinely new non-context','retry eventually','superseded protected','old worker result','logical budget','write failure after first'];const lines=source.split('\n').filter(l=>l.startsWith('test(')&&selected.some(x=>l.includes('M3 '+x)));assert.equal(lines.length,selected.length);
 const helpers=`
import {OrganizerStore} from '../core/organizer/store.js';
import {BudgetPolicy} from '../core/organizer/budget.js';
import {DeterministicFixtureProvider} from '../tests/fixtures/organizer/provider.mjs';
globalThis.m5Acceptance=async()=>{
 const tests=[],stores=[];const test=(name,fn)=>tests.push({name,fn});
 const assert={equal(a,b){if(a!==b)throw Error('ASSERT_EQUAL '+String(a)+' '+String(b));},ok(a){if(!a)throw Error('ASSERT_OK');},deepEqual(a,b){if(JSON.stringify(a)!==JSON.stringify(b))throw Error('ASSERT_DEEP');},async rejects(fn){let rejected=false;try{await(typeof fn==='function'?fn():fn);}catch{rejected=true;}if(!rejected)throw Error('EXPECTED_REJECTION');}};
 const capture=(epoch,id='m1-synthetic-message-001',text='Synthetic explicit working input')=>({epoch,adapterVersion:'0.3.0',chat:{id:'m1-synthetic-chat',url:'https://chatgpt.com/c/m1-synthetic-chat',title:'Synthetic chat'},messages:[{sourceMessageId:id,pageOrder:1,originalText:text}]});
 async function setup(Store,options={}){let values={};const storage={async get(k){return {[k]:structuredClone(values[k])};},async set(v){Object.assign(values,structuredClone(v));}},name='m5-real-idb-'+crypto.randomUUID();const s=new Store(storage,{name,...options});stores.push(s);await s.consent(true);await s.capture(capture((await s.status()).epoch));return {s,storage,indexedDB:globalThis.indexedDB};}
 async function inputEdit(s,id,changes){const b=await s.input(id);return s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id,expectedRevision:b.revision,libraryText:b.libraryText,note:b.note,excluded:b.excluded,...changes}]});}
 ${source.split('\n').find(l=>l.startsWith('async function fixture'))}
 ${lines.join('\n')}
 const reports=[];for(const {name,fn}of tests){const at=performance.now();await fn();reports.push({name,passed:true,ms:performance.now()-at});}for(const s of stores)await s.repository.close();return reports;
};`;
 // The restart-budget test constructs a new store with the default name. Carry the named repository through its local fixture.
 const fixed=helpers.replace('return {s,storage,indexedDB:globalThis.indexedDB};','storage.syntheticDatabaseName=name;return {s,storage,indexedDB:globalThis.indexedDB};').replaceAll('new OrganizerStore(f.storage,{indexedDB:f.indexedDB,organizerBudget:policy})','new OrganizerStore(f.storage,{name:f.storage.syntheticDatabaseName,indexedDB:f.indexedDB,organizerBudget:policy})');
 await appendFile(join(dir,'background/service-worker.js'),fixed);h=await FakeChatGPT.start({extensionPath:dir,headless:false});await h.state();const reports=await h.context.serviceWorkers()[0].evaluate(()=>globalThis.m5Acceptance());assert.equal(reports.length,selected.length);assert.ok(reports.every(r=>r.passed));assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);await mkdir('work',{recursive:true});await writeFile('work/v070-m5-mechanics.json',JSON.stringify({syntheticOnly:true,actualIndexedDB:true,backgroundWriter:true,reports},null,2));
 }finally{await h?.close();await rm(dir,{recursive:true,force:true});}
});
