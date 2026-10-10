import {invalidateSemanticJobs} from './semantic-invalidation.js';
// AIU-1.0 local, rebuildable scheduling metadata. Canonical rows remain the
// only content owners. Neither capture nor these hooks can dispatch a provider.
export const DIRTY_PREFIX='aiu:delta:pending:';
export const KNOWN_PREFIX='aiu:delta:known:';
export const HUMAN_FENCE='aiu:delta:human-fence';
export const DELTA_COUNTER='aiu:delta:sequence';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const unique=xs=>[...new Set(xs)].sort();
const integer=x=>Number.isSafeInteger(x)&&x>=0?x:0;
const keyFor=(kind,id)=>JSON.stringify([kind,id]);
const semanticFields=new Set(['body','title','note','name','summary','organization','lifecycle','redirect','membership','section','placement','type','formation']);

export function deltaDescription(store,row){
 if(!row)return null;
 if(store==='inputStates')return {key:keyFor('input',row.id),kind:'input',entityId:row.id,revision:integer(row.contentRevision),removed:row.removalState!=='active'||row.sourcePurged===true,removalEpoch:integer(row.lastRemovalSequence),sourceRecordIds:unique(row.sourceRecordIds||[]),inputIds:[row.id],lineage:[keyFor('input',row.id)],independent:true,affectedRefs:[],human:false};
 if(store==='context_item')return {key:keyFor('context_item',row.id),kind:'context_item',entityId:row.id,recordId:row.id,revision:integer(row.revision),removed:row.lifecycle!=='active',removalEpoch:integer(row.revision),sourceRecordIds:[],inputIds:[],lineage:[],independent:false,affectedRefs:[row.card],human:true};
 if(store==='constraint')return {key:keyFor('constraint',row.id),kind:'constraint',entityId:row.id,revision:integer(row.revision),operationId:row.operationId||null,removed:false,sourceRecordIds:[],inputIds:[],lineage:[],independent:false,affectedRefs:[],human:true,fenceOnly:true};
 if(store!=='revisions'||row.actor!=='user')return null;
 if(!['library_entry','topic','section','placement'].includes(row.kind)||!row.fieldMask?.some(x=>semanticFields.has(x)))return {key:keyFor('human_fence',row.entityId),kind:'human_fence',entityId:row.entityId,journalId:row.id,revision:integer(row.afterRevision),removed:false,sourceRecordIds:[],inputIds:[],lineage:[],independent:false,affectedRefs:[],human:true,fenceOnly:true};
 const owner=row.after||row.before||{},independent=row.kind==='library_entry'&&owner.provenanceType==='user_created'&&owner.bodyBinding!=='input',inputIds=unique((owner.inputRefs||[]).map(x=>x.inputBlockId));
 // Journal IDs and canonical revisions are stable across duplicate delivery.
 // Never retain before/after images, labels, authored text or timestamps here.
 return {key:keyFor(row.kind,row.entityId),kind:row.kind,entityId:row.entityId,recordId:owner.id||row.entityId,topicId:owner.topicId||null,layoutGeneration:integer(owner.layoutGeneration),revision:integer(row.afterRevision??owner.revision),journalId:row.id,removed:owner.lifecycle==='removed'||owner.lifecycle==='invalidated',removalEpoch:integer(row.afterRevision??owner.revision),sourceRecordIds:unique(row.sourceRecordIds||[]),inputIds,lineage:independent?[keyFor('thought',row.entityId)]:inputIds.map(id=>keyFor('input',id)),independent,affectedRefs:unique([row.documentId,owner.topicId,owner.sectionId].filter(x=>typeof x==='string')),human:true};
}
export const deltaSignature=descriptor=>{if(!descriptor||descriptor.fenceOnly)return JSON.stringify(descriptor);const {journalId,...semantic}=descriptor;return JSON.stringify(semantic);};
export async function trackSemanticWrite(t,store,id,value){
 if(t.semanticEnabled&&store==='meta'&&['gate','recovery-restore-epoch'].includes(id)){const before=await t.get(store,id);if(!same(before,value))t.aiUsageBoundaryChanged=true;}
 const context=store==='meta'&&id==='context-cards:v1',constraint=store==='meta'&&id?.startsWith('topicKeepSeparate:');
 if(store!=='inputStates'&&store!=='revisions'&&!context&&!constraint)return;
 // Older physical databases have no AI job stores. Do not create a parallel
 // metadata queue during their migration or change their transaction scope.
 if(!t.semanticEnabled)return;
 // Removing an old history row is not removal of its canonical entity.
 if(store==='revisions'&&value===null)return;
 const before=await t.get(store,id);
 if(context){const human=x=>x.origin==='manual'||x.protected===true||x.deletedBy;const old=new Map((before?.items||[]).filter(human).map(x=>[x.id,x])),next=new Map((value?.items||[]).filter(human).map(x=>[x.id,x]));for(const itemId of new Set([...old.keys(),...next.keys()]))observe(t,deltaDescription('context_item',old.get(itemId)),deltaDescription('context_item',next.get(itemId)));return;}
 const old=deltaDescription(constraint?'constraint':store,before),next=deltaDescription(constraint?'constraint':store,value);observe(t,old,next);
}
export async function trackSemanticClear(t,store){
 const kind={inputStates:'input',thoughts:'library_entry',topics:'topic',sections:'section',placements:'placement'}[store];
 if(!kind||!t.semanticEnabled)return;
 // Library replace drops canonical owners, so their rebuildable scheduling
 // metadata cannot remain eligible. Never clear dispatched-operation fences,
 // single-flight markers, reservations or other financial recovery metadata.
 for(const base of [KNOWN_PREFIX,DIRTY_PREFIX]){
  const prefix=base+JSON.stringify([kind]).slice(0,-1)+',';let after=null;
  do{const page=await t.primaryRangePage('meta',{prefix,after,limit:100});for(const {key}of page.rows)await t.delete('meta',key);after=page.next;}while(after);
 }
 // A put followed by clear in this transaction must not recreate old work
 // during the final flush. Later restored canonical writes enqueue afresh.
 for(const [slot,change]of t.semanticChanges||[])if(change.after.kind===kind)t.semanticChanges.delete(slot);
}
function observe(t,old,next){
 if(!old&&!next||same(old,next))return;
 const changes=t.semanticChanges??=new Map();observeSemanticChange(changes,old,next);
}
// Original coalescing decision shared with the bounded canonical consumer.
// These pure descriptions grant no transaction, provider or write authority.
export function observeSemanticChange(changes,old,next){
 if(!old&&!next||same(old,next))return;
 const subject=next||{...old,removed:true,revision:old.revision+1};
 const slot=JSON.stringify([subject.key,subject.recordId||null]),prior=changes.get(slot);
 // Restore may replay journals in arbitrary UUID order in one transaction.
 // Coalesce the newest revision for each physical owner before flushing it.
 if(subject.journalId&&prior?.after.journalId&&subject.revision<prior.after.revision)return;
 changes.set(slot,{before:prior?prior.before:old,after:subject});
}
export function semanticDeltaLiveEligible(after,{ownerPresent=false,live=null,topicPresent=false,topic=null}={}){
 if(after.journalId&&!after.fenceOnly){
  if(ownerPresent&&(!live||live.revision<after.revision))return false;
  if(after.topicId&&topicPresent&&(!topic||topic.activeLayoutGeneration!==after.layoutGeneration))return false;
 }
 return true;
}
export function planSemanticDeltaWrite(before,after,known,previous,sequence){
 if(same(before,after))return null;
 const signature=deltaSignature(after);if(known?.signature===signature)return null;
 if(after.journalId&&known?.descriptor.journalId&&after.recordId===known.descriptor.recordId&&after.revision<known.descriptor.revision)return null;
 const row={id:KNOWN_PREFIX+after.key,version:1,descriptor:after,signature,sequence:sequence+1};
 const dirty=after.removed||after.fenceOnly?null:{...row,id:DIRTY_PREFIX+after.key,requirements:[],pendingFacets:['topic','context'],...(previous?.signature===signature?{requirements:previous.requirements||[],pendingFacets:previous.pendingFacets||['topic','context']}:{})};
 return {row,dirty};
}
export async function flushSemanticWrites(t){
 if(!t.semanticChanges?.size&&!t.aiUsageBoundaryChanged)return;
 let sequence=integer((await t.get('meta',DELTA_COUNTER))?.value),human=false,changed=false;const changedEvidence=new Map();
 for(const {before,after}of (t.semanticChanges||new Map()).values()){
  const key=after.key;if(same(before,after))continue;
  let ownerPresent=false,live=null,topicPresent=false,topic=null;
  if(after.journalId&&!after.fenceOnly){
   const table={library_entry:'thoughts',topic:'topics',section:'sections',placement:'placements'}[after.kind];
   if(table&&t.tx.objectStoreNames.contains(table)){ownerPresent=true;live=await t.get(table,after.recordId);}
   // A historical layout incarnation cannot replace the current Section owner.
   if(after.topicId&&t.tx.objectStoreNames.contains('topics')){topicPresent=true;topic=await t.get('topics',after.topicId);}
  }
  if(!semanticDeltaLiveEligible(after,{ownerPresent,live,topicPresent,topic}))continue;
  const known=await t.get('meta',KNOWN_PREFIX+key);
  // Journal replay cannot replace the newest known human revision. Transport
  // delivery order is not semantic novelty, and history deletion is not intent.
  const previous=await t.get('meta',DIRTY_PREFIX+key);
  const planned=planSemanticDeltaWrite(before,after,known,previous,sequence);if(!planned)continue;
  changed=true;human||=after.human;const {row,dirty}=planned;sequence=row.sequence;
  await t.put('meta',row);changedEvidence.set(key,row);
  // Removed evidence never waits for paid cleanup. The known tombstone/fence
  // invalidates outstanding handles even if create/delete coalesces to no work.
  if(dirty===null){await t.delete('meta',DIRTY_PREFIX+key);continue;}
  await t.put('meta',dirty);
 }
 if(changed)await t.put('meta',{id:DELTA_COUNTER,value:sequence});
 if(human)await t.put('meta',{id:HUMAN_FENCE,value:integer((await t.get('meta',HUMAN_FENCE))?.value)+1});
 if(changed||t.aiUsageBoundaryChanged)t.aiUsageInvalidation=await invalidateSemanticJobs(t,changedEvidence);
}
