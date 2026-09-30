import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {capture,inputEdit,derived} from './harness/thought-m1.mjs';
import {recoveryDraftPrefix} from '../core/recovery-draft.js';
globalThis.IDBKeyRange=IDBKeyRange;
function storage(){let data={};return {async get(keys){return keys===null?structuredClone(data):Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in data).map(k=>[k,structuredClone(data[k])]));},async set(values){Object.assign(data,structuredClone(values));},async remove(keys){for(const key of Array.isArray(keys)?keys:[keys])delete data[key];}};}
async function fixture(){const local=storage(),indexedDB=new IDBFactory(),s=new OrganizerStore(local,{indexedDB});await s.consent(true);await s.capture(capture((await s.status()).epoch));await s.finishFoundation();const b=(await s.snapshot()).library.blocks[0];return {s,b,local,indexedDB};}
const dump=async({s,local})=>({db:await s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await t.all(name)])))),local:await local.get(null)});
async function refuses(f){const before=await dump(f);assert.deepEqual(await f.s.sourcePurgePreflight(f.b.sourceRecordId),{state:'owner_gate_required',gate:'B-02',targetRef:f.b.sourceRecordId});assert.deepEqual(await dump(f),before,'readonly preflight has no persisted or recovery effects');await assert.rejects(f.s.permanentDelete(f.b.sourceRecordId),{code:'SOURCE_PURGE_OWNER_GATE'});assert.deepEqual(await dump(f),before,'commit refuses before every persisted effect');}
function draft(f,operation,extra={}){return {version:1,kind:'document',ownerId:f.b.documentId,token:crypto.randomUUID(),sourceRecordIds:[],updatedAt:1,expiresAt:2,operation,...extra};}

test('Q4 untouched Source preflight is body-free/readonly; existing purge/tombstone/recapture fence remains available',async()=>{
 const f=await fixture(),before=await dump(f),preview=await f.s.sourcePurgePreflight(f.b.sourceRecordId);assert.deepEqual(preview,{state:'unambiguous',targetRef:f.b.sourceRecordId,coverage:'complete',sourceCount:1,inputCount:1});assert.deepEqual(await dump(f),before);
 await f.s.permanentDelete(f.b.sourceRecordId);assert.equal((await f.s.snapshot()).records.length,0);assert.equal((await f.s.snapshot()).library.blocks.length,0);await f.s.capture(capture((await f.s.status()).epoch));assert.equal((await f.s.snapshot()).records.length,0);assert.equal(await f.s.repository.transaction(false,t=>t.count('tombstones')),1);
});
test('Q4 current human Input and original-backed Current with human past versions both refuse with full database/storage equality',async()=>{
 for(const reset of [false,true]){const f=await fixture();await inputEdit(f.s,f.b.id,{libraryText:'SYNTHETIC human rewrite '+'.'.repeat(220)});if(reset)await inputEdit(f.s,f.b.id,{libraryText:null});await refuses(f);const h=await f.s.revisions({documentId:f.b.documentId});assert.ok(h.items.some(r=>r.after.libraryText?.startsWith('SYNTHETIC human rewrite')));}
});
test('Q4 legacy Source note/edit and lost title owner/history refuse; a surviving independent title is preserved',async()=>{
 for(const changes of [{note:'SYNTHETIC Source note'},{editedText:'SYNTHETIC legacy edit'}]){const f=await fixture();await f.s.update(f.b.sourceRecordId,changes);await refuses(f);}
 const f=await fixture();await f.s.updateDocument(f.b.documentId,{userTitle:'SYNTHETIC human title'});await refuses(f);await f.s.capture(capture((await f.s.status()).epoch,'second-source','SYNTHETIC second Source'));
 assert.equal((await f.s.sourcePurgePreflight(f.b.sourceRecordId)).state,'unambiguous');await f.s.permanentDelete(f.b.sourceRecordId);assert.equal((await f.s.snapshot()).conversations.find(d=>d.id===f.b.documentId).userTitle,'SYNTHETIC human title');assert.ok((await f.s.revisions({documentId:f.b.documentId})).items.some(r=>r.kind==='title'));
});
test('Q4 affected protected Thought/AI/Topic, user relation and sealed unknown quarantine refuse without cleanup jobs',async()=>{
 for(const kind of ['thought','ai','topic','relation','sealed']){
  const f=await fixture();
  if(kind==='thought'){const e=await derived(f.s,[f.b.id]),row=await f.s.entry(e.id);await f.s.editLibraryFields({id:e.id,expectedRevision:row.revision,expectedFieldRevisions:row.fieldRevisions,changes:{note:'SYNTHETIC protected note'},operationId:crypto.randomUUID()});}
  else await f.s.repository.transaction(true,async t=>{
   if(kind==='sealed'){await t.put('thoughts',{id:'synthetic-sealed-unknown',quarantineSealed:true,quarantineKey:1,lifecycle:'quarantined'});return;}
   if(kind==='relation'){await t.put('entryRelations',{id:'synthetic-relation',actor:'user',sourceRecordIds:[f.b.sourceRecordId]});return;}
   if(kind==='topic'){await t.put('topics',{id:'synthetic-topic',name:'SYNTHETIC protected name',sourceRecordIds:[f.b.sourceRecordId],protections:{name:{locked:true}}});return;}
   await t.put('meta',{id:'aiPresentation:synthetic-ai',topicId:'synthetic-ai',evidenceEntryIds:[],protections:{currentView:true},currentView:'SYNTHETIC human AI edit'});await t.put('libraryMigrationItems',{id:'synthetic-ai-fence',entityKind:'organizer_metadata',ownerKind:'ai_presentation',ownerId:'synthetic-ai',sourceRecordIds:[f.b.sourceRecordId]});
  });await refuses(f);
 }
});
test('Q4 resident expired, malformed, title-only and exact pending-request recovery cannot be cleared to permit Source purge',async()=>{
 for(const kind of ['expired','malformed','title','pending']){
  const f=await fixture(),edit={documentId:f.b.documentId,blocks:[]},operation={type:'EDIT_DOCUMENT',edit};
  if(kind==='expired')edit.blocks.push({id:f.b.id,expectedRevision:0,libraryText:'SYNTHETIC expired human draft'});
  if(kind==='title')edit.title='SYNTHETIC recovered title';
  if(kind==='pending')operation.pendingRequest=JSON.stringify({documentId:f.b.documentId,restoreRevisionId:'synthetic-pending-history',blocks:[{id:f.b.id,expectedRevision:0,libraryText:'SYNTHETIC pending restore'}]});
  const row=kind==='malformed'?{unknown:'SYNTHETIC unknown resident recovery'}:draft(f,operation);await f.local.set({[recoveryDraftPrefix+'document:'+f.b.documentId]:row});await refuses(f);
 }
});
test('Q4 fresh commit refuses real concurrent human edit after a positive preview and between assessment/transaction',async()=>{
 const f=await fixture();assert.equal((await f.s.sourcePurgePreflight(f.b.sourceRecordId)).state,'unambiguous');const other=new OrganizerStore(f.local,{indexedDB:f.indexedDB});await other.finishFoundation();
 const transaction=f.s.repository.transaction.bind(f.s.repository);let inject=true;
 f.s.repository.transaction=async(write,fn,...rest)=>{if(write&&inject){inject=false;await inputEdit(other,f.b.id,{note:'SYNTHETIC concurrent protected note'});}return transaction(write,fn,...rest);};
 await assert.rejects(f.s.permanentDelete(f.b.sourceRecordId),{code:'SOURCE_PURGE_OWNER_GATE'});assert.equal((await f.s.input(f.b.id)).note,'SYNTHETIC concurrent protected note');assert.equal(await transaction(false,t=>t.count('tombstones')),0);assert.equal(await transaction(false,t=>t.count('organizerJobs')),0);
});
test('Q4 final recovery read and aborted eligible purge retain all Source and existing metadata',async()=>{
 const f=await fixture(),get=f.local.get.bind(f.local);let reads=0;
 f.local.get=async keys=>{if(keys===null&&++reads===2)await f.local.set({[recoveryDraftPrefix+'document:'+f.b.documentId]:draft(f,{type:'EDIT_DOCUMENT',edit:{documentId:f.b.documentId,title:'SYNTHETIC racing recovery',blocks:[]}})});return get(keys);};
 await assert.rejects(f.s.permanentDelete(f.b.sourceRecordId),{code:'SOURCE_PURGE_OWNER_GATE'});assert.equal(await f.s.repository.transaction(false,t=>t.count('records')),1);assert.equal(await f.s.repository.transaction(false,t=>t.count('tombstones')),0);
 const pure=await fixture(),before=await dump(pure);pure.s.beforeSourcePurge=async()=>{throw Error('SYNTHETIC transaction abort');};await assert.rejects(pure.s.permanentDelete(pure.b.sourceRecordId),{code:'STORAGE_FAILED'});assert.deepEqual(await dump(pure),before);
});
test('Q4 incomplete/corrupt provenance refuses without effects; ordinary reversible Input removal still works',async()=>{
 const f=await fixture();await inputEdit(f.s,f.b.id,{excluded:true});assert.equal((await f.s.sourcePurgePreflight(f.b.sourceRecordId)).state,'unambiguous');await inputEdit(f.s,f.b.id,{excluded:false});assert.equal((await f.s.input(f.b.id)).excluded,false);
 await f.s.repository.transaction(true,async t=>{const row=await t.get('blocks',f.b.id);row.value.provenance.push({sourceRecordId:'synthetic-missing-source'});await t.put('blocks',row);});await refuses(f);
});
test('Q4 known automatic evidence remains purgeable; Source/derived cleanup never grants authorization',async()=>{
 const f=await fixture(),e=await derived(f.s,[f.b.id]);assert.equal((await f.s.sourcePurgePreflight(f.b.sourceRecordId)).state,'unambiguous');await f.s.permanentDelete(f.b.sourceRecordId);assert.equal((await f.s.entry(e.id)).body,'');await f.s.drainPurgeCleanup();await assert.rejects(f.s.entry(e.id));await f.s.capture(capture((await f.s.status()).epoch));assert.equal((await f.s.snapshot()).records.length,0);
});
test('Q4 complete Source snapshot scope above the transaction bound refuses the entire target without a prefix purge',async()=>{
 const f=await fixture();await f.s.repository.transaction(true,async t=>{
  const row=await t.get('records',f.b.sourceRecordId),index=await t.get('recordIndex',f.b.sourceRecordId);
  for(let i=1;i<=1000;i++){const id='synthetic-snapshot-'+i,dedupeKey=i.toString(16).padStart(64,'0');await t.put('records',{id,value:{...row.value,id,dedupeKey,originalText:'SYNTHETIC snapshot '+i}});await t.put('recordIndex',{...index,id,dedupeKey,sequence:i});}
 });const before=await dump(f);assert.deepEqual(await f.s.sourcePurgePreflight(f.b.sourceRecordId),{state:'unavailable',targetRef:f.b.sourceRecordId});await assert.rejects(f.s.permanentDelete(f.b.sourceRecordId),{code:'SOURCE_PURGE_UNAVAILABLE'});assert.deepEqual(await dump(f),before);assert.equal(await f.s.repository.transaction(false,t=>t.count('records')),1001);
});

test('Q4 affected dependency owners with incomplete Source index or unknown protection cannot escape admission',async()=>{
 const f=await fixture(),e=await derived(f.s,[f.b.id]),current=await f.s.entry(e.id);await f.s.editLibraryFields({id:e.id,expectedRevision:current.revision,expectedFieldRevisions:current.fieldRevisions,changes:{note:'SYNTHETIC human dependency note'},operationId:crypto.randomUUID()});
 await f.s.repository.transaction(true,async t=>{const row=await t.get('thoughts',e.id);row.sourceRecordIds=[];await t.put('thoughts',row);});await refuses(f);
 const unknown=await fixture(),auto=await derived(unknown.s,[unknown.b.id]);await unknown.s.repository.transaction(true,async t=>{const row=await t.get('thoughts',auto.id);row.protections={body:'unknown'};await t.put('thoughts',row);});await refuses(unknown);
});
