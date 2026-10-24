import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from '../worktree-human-search/extension/tests/vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../worktree-human-search/extension/core/library-documents-store.js';
import {BrowserNativeSyncCore} from '../worktree-human-search/extension/core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../worktree-human-search/extension/core/browser-native-sync/source-bootstrap-journal.js';
import {prepareSavedWorkPublication,publishSavedWorkBootstrap} from '../worktree-human-search/extension/core/browser-native-sync/saved-work-bootstrap.js';
import {buildCheckpoint,StagedSyncRestore} from '../worktree-human-search/extension/core/browser-native-sync/checkpoints.js';
import {local,capture} from '../worktree-human-search/extension/tests/harness/thought-m1.mjs';
globalThis.IDBKeyRange=IDBKeyRange;
const id=()=>crypto.randomUUID(),generator={providerId:'fixture',providerVersion:'1',modelVersion:'deterministic-1',taskSchemaVersion:1,promptTemplateVersion:1,policyVersion:1};
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await t.all(name)]))));
async function device(t){const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),name:'SYNTHETIC_'+id()});await s.consent(true);await s.finishFoundation();t.after(()=>s.repository.close());return {s,core:new BrowserNativeSyncCore(s.repository,{datasetId:'SYNTHETIC_saved_search_review',deviceId:id()})};}
function transport(){const rows=new Map();return {async putImmutable(ref,bytes){rows.set(ref.id,bytes.slice());},async get(ref){return rows.get(ref.id)?.slice();}};}
async function source(t){
 const a=await device(t);a.s.sourceBootstrapJournal=new SourceBootstrapJournal(a.core);await a.s.capture(capture((await a.s.status()).epoch));
 const input=(await a.s.snapshot()).library.blocks[0],evidence=await a.s.evidenceFor([{inputId:input.id,role:'primary',selectedFields:['body']}]);
 const entry=await a.s.createEntry({actor:'ai',operationId:id(),body:'SYNTHETIC saved original',type:'idea',formation:'explicit',evidence,generator});
 await a.s.editEntry({id:entry.id,expectedRevision:0,operationId:id(),changes:{body:'SYNTHETIC savedsearchneedle protected body'}});
 await publishSavedWorkBootstrap(a.s,await prepareSavedWorkPublication(a.s,a.core,entry.id));
 const cloud=transport(),cut=await buildCheckpoint(a.core,cloud,{grouped:{store:a.s}});return {...a,cloud,cut,entry};
}
async function maintenance(s){for(let n=0;n<10;n++)if(!(await s.processLibraryMaintenance()).pending)return;assert.fail('small original maintenance did not settle');}
async function restore(t,a,completedEmpty=false){
 const b=await device(t);if(completedEmpty){await maintenance(b.s);assert.equal((await snapshot(b.s)).meta.find(row=>row.id==='library-search-rebuild').complete,true);}
 const owner=new StagedSyncRestore(b.core,{grouped:{store:b.s}});await owner.stageCheckpoint(a.cut.ref,ref=>a.cloud.get(ref));await owner.activate();return b;
}
test('untouched real cold Saved restore has no locator and rebuilds through original maintenance',async t=>{
 const a=await source(t),b=await restore(t,a),rows=await snapshot(b.s);assert.equal(rows.thoughts.length,1);assert.equal(rows.libraryMigrationItems.length,0);assert.equal(rows.librarySearchTerms.length,0);assert.equal(rows.meta.some(row=>row.id==='library-search-rebuild'),false);
 await buildCheckpoint(b.core,transport(),{grouped:{store:b.s}});assert.deepEqual(await snapshot(b.s),rows);
 const before=await b.s.searchLibrary({query:'savedsearchneedle'});assert.equal(before.complete,false);assert.equal(before.indexing,true);
 await maintenance(b.s);const result=await b.s.searchLibrary({query:'savedsearchneedle'});assert.equal(result.complete,true);assert.ok(result.items.some(row=>row.entryId===a.entry.id));
});
test('hypothesis: a previously completed empty search index must not hide genuinely restored Saved content',async t=>{
 const a=await source(t),b=await restore(t,a,true),rows=await snapshot(b.s);assert.equal(rows.thoughts.length,1);assert.equal(rows.libraryMigrationItems.length,0);assert.equal(rows.meta.find(row=>row.id==='library-search-rebuild').complete,true);
 const result=await b.s.searchLibrary({query:'savedsearchneedle'});t.diagnostic(JSON.stringify({complete:result.complete,indexing:result.indexing,items:result.items.length,queue:rows.libraryMigrationItems.length,postings:rows.librarySearchTerms.length}));
 assert.ok(result.items.some(row=>row.entryId===a.entry.id)||result.complete===false,'retained content is either found or truthfully rebuilding, never silently complete-and-missing');
});
