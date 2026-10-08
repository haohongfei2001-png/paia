import {validateOperation} from './core.js';
import {validateEntity,validateEntityAsync,projectEntity} from './codecs.js';
import {JournalRestoreFence} from './prompt-journal.js';
import {clone,equal,fail,hash} from './value.js';

// Optional existing-Source-only owner. No Source creation, restore, or transport.
const LIMIT=16, BODY_LIMIT=1024*1024;
async function sources(t,key){
 if(!hash(key))fail('BNS_FILTER_SOURCE_UNQUALIFIED');
 if(await t.get('tombstones','source:'+key))fail('BNS_FILTER_SOURCE_PURGED');
 const indexes=await t.all('recordIndex','bySource',key,LIMIT+1);
 if(!indexes.length||indexes.length>LIMIT)fail('BNS_FILTER_SOURCE_UNQUALIFIED');
 const rows=[];let bodyChars=0;
 for(const index of indexes){
  const row=(await t.get('records',index.id))?.value;
  if(!row||row.id!==index.id||row.sourceKey!==key||index.sourceKey!==key||index.dedupeKey!==row.dedupeKey||typeof row.originalText!=='string'||row.originalText.length>BODY_LIMIT)fail('BNS_FILTER_SOURCE_UNQUALIFIED');
  if(await t.get('tombstones','snapshot:'+row.dedupeKey))fail('BNS_FILTER_SOURCE_PURGED');
  if((bodyChars+=row.originalText.length)>BODY_LIMIT)fail('BNS_FILTER_SOURCE_UNQUALIFIED');
  rows.push(projectEntity('source',row));
 }
 return rows;
}

export class FilterIntentSyncJournal{
 constructor(core){this.core=core;this.fence=new JournalRestoreFence(core);this.prepared=new WeakMap();}
 assertStore(store){if(store.repository!==this.core.repository)fail('BNS_BINDING_CHANGED');}
 async qualify(keys){
  keys=[...new Set(keys)];if(!keys.length||keys.length>LIMIT)fail('BNS_FILTER_SOURCE_UNQUALIFIED');
  const before=await this.core.transaction(false,async t=>({fence:await this.fence.snapshot(t),generation:(await t.get('meta','backup-data-generation'))?.value||0,sources:await Promise.all(keys.map(key=>sources(t,key))),local:await Promise.all(keys.map(key=>t.get('filterIntents',key)))}));
  for(const rows of before.sources)for(const row of rows)await validateEntityAsync('source',row);
  // Bounded transient verified bodies support exact commit comparison; never persisted.
  return {...before,keys};
 }
 async current(t,before){
  if(!equal(await this.fence.snapshot(t),before.fence)||((await t.get('meta','backup-data-generation'))?.value||0)!==before.generation)fail('BNS_FILTER_SOURCE_CHANGED');
  for(let i=0;i<before.keys.length;i++)if(!equal(await sources(t,before.keys[i]),before.sources[i])||!equal((await t.get('filterIntents',before.keys[i]))??null,before.local[i]??null))fail('BNS_OWNER_CHANGED');
 }
 async prepareKeep(store,id){
  this.assertStore(store);
  const binding=await store.run(()=>store.repository.transaction(false,async t=>{
   const b=(await t.get('blocks',id))?.value;if(!b||b.excluded||b.branchStatus||!Array.isArray(b.provenance)||b.provenance.length>LIMIT)fail('BNS_FILTER_SOURCE_UNQUALIFIED');
   return {provenance:clone(b.provenance),keys:await Promise.all(b.provenance.map(async p=>(await t.get('recordIndex',p.sourceRecordId))?.sourceKey))};
  }));
  const before=await this.qualify(binding.keys),at=store.clock(),changes=[];
  for(let i=0;i<before.keys.length;i++){
   const key=before.keys[i],head=await this.core.read('head','filterIntent',key),old=before.local[i];
   if(head?.purged)fail('BNS_ENTITY_PURGED');if(head?.revisions.length>1)fail('BNS_CONFLICT_REQUIRES_RESOLUTION');
   if(head){const previous=await this.core.read('revision',head.revisions[0]);if(!equal(previous?.operation.value,old))fail('BNS_OWNER_CHANGED');}
   else if(old)fail('BNS_BOOTSTRAP_REQUIRED');
   changes.push({type:'filterIntent',value:{id:key,keep:true,reason:'restored_from_filter',at},expectedParents:head?.revisions||[]});
  }
  const prepared=await this.fence.prepare(()=>this.core.prepare(changes));this.prepared.set(prepared,{before,id,at,binding});return prepared;
 }
 async authorize(t,prepared,b,reason,userEdited){
  const saved=this.prepared.get(prepared);if(!saved||saved.id!==b.id||reason!=='restored_from_filter'||userEdited)fail('BNS_FILTER_WRITER_UNSUPPORTED');
  const keys=await Promise.all(b.provenance.map(async p=>(await t.get('recordIndex',p.sourceRecordId))?.sourceKey));
  if(!equal(b.provenance,saved.binding.provenance)||!equal(keys,saved.binding.keys))fail('BNS_OWNER_CHANGED');
  await this.current(t,saved.before);await this.fence.commit(t,prepared);return saved.at;
 }
 release(prepared){this.prepared.delete(prepared);}
 async commit(t,prepared){if(!this.prepared.has(prepared))fail('BNS_PREPARATION_REQUIRED');return this.core.commitPrepared(t,prepared,{materialize:false});}
 async receive(input){
  const operation=clone(await validateOperation(input));if(operation.datasetId!==this.core.datasetId)fail('BNS_DATASET_MISMATCH');
  if(operation.type!=='filterIntent'||operation.kind!=='put')fail('BNS_FILTER_WRITER_UNSUPPORTED');validateEntity('filterIntent',operation.value);
  const before=await this.qualify([operation.entityId]);
  // This bounded owner does not admit unresolved dependency queues or full restore.
  return this.core.transaction(true,async t=>{
   await this.current(t,before);
   for(const parent of operation.parents)if(!await this.core.get(t,'revision',parent))fail('BNS_FILTER_ANCESTRY_REQUIRED');
   const old=await this.core.get(t,'head','filterIntent',operation.entityId),local=before.local[0];
   if(old?.purged)fail('BNS_ENTITY_PURGED');
   if(local){const values=await Promise.all((old?.revisions||[]).map(async id=>(await this.core.get(t,'revision',id))?.operation.value));if(!values.some(value=>equal(value,local)))fail('BNS_OWNER_CHANGED');}
   const result=await this.core.applyInTransaction(t,operation,{origin:'remote',materialize:false});
   const head=await this.core.get(t,'head','filterIntent',operation.entityId);
   if(head?.revisions.length===1&&head.revisions[0]===operation.revisionId&&!equal(before.local[0]??null,operation.value))await t.put('filterIntents',clone(operation.value));
   return result;
  });
 }
}
