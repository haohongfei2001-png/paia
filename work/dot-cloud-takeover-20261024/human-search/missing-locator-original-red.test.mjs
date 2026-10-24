import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';
import {planSearchQueueLocator} from '../core/library-search.js';
import {local} from './harness/thought-m1.mjs';
globalThis.IDBKeyRange=IDBKeyRange;
const id=()=>crypto.randomUUID();
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await t.all(name)]))));
function transport(){const objects=new Map();let writes=0;return {objects,get writes(){return writes;},async putImmutable(ref,raw){writes++;objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}};}
async function fixture(t){
 const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),name:'SYNTHETIC_'+id()});await s.consent(true);await s.finishFoundation();t.after(()=>s.repository.close());
 const core=new BrowserNativeSyncCore(s.repository,{datasetId:'SYNTHETIC_human_search_completeness',deviceId:id()});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);
 await s.createTopic({name:'SYNTHETIC complete search Topic',operationId:id()});
 await s.createEntry({actor:'user',body:'SYNTHETIC complete search Entry',type:'idea',formation:'explicit',evidence:[],operationId:id()});
 const rows=await snapshot(s),expected=[['entry','thoughts'],['topic','topics'],['section','sections']].flatMap(([kind,name])=>rows[name].map(row=>planSearchQueueLocator(kind,row)));
 assert.equal(expected.length,3);assert.deepEqual(rows.libraryMigrationItems,[...expected].sort((a,b)=>a.id<b.id?-1:1));assert.equal(rows.librarySearchTerms.length,0);
 return {s,core,expected};
}
test('original untouched Human pending queue remains a complete grouped checkpoint input',async t=>{
 const {s,core}=await fixture(t),before=await snapshot(s),cloud=transport();assert.ok((await buildCheckpoint(core,cloud,{grouped:{store:s}})).ref);assert.ok(cloud.writes>0);assert.deepEqual(await snapshot(s),before);
});
for(const kind of ['entry','topic','section'])test('original grouped exporter refuses a missing '+kind+' search locator before publishing',async t=>{
 const {s,core,expected}=await fixture(t),row=expected.find(row=>row.ownerKind===kind);await s.repository.transaction(true,t=>t.delete('libraryMigrationItems',row.id));
 const before=await snapshot(s),cloud=transport();let rejection;try{await buildCheckpoint(core,cloud,{grouped:{store:s}});}catch(error){rejection=error;}
 assert.deepEqual(await snapshot(s),before);assert.equal(rejection?.code,'BNS_GROUP_CANONICAL_UNREPRESENTED','a missing required locator must not be admitted');assert.equal(cloud.writes,0);
});
