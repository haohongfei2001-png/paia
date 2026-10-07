import {ArchiveError} from './constants.js';
import {ContextCardsService} from './context-cards.js';
import {hashText} from './dedupe.js';
import {MemoryService} from './memory/service.js';
import {idOK,revisionOK} from './thought-model.js';
import {BINDING_ROW} from './thought-binding.js';
import {FILTER_VERSIONS} from './smart-filter.js';
import {rootReadAuthority} from './organizer/root-read.js';
import {validTopicIdentity,validTopicNameRegistry} from './topic-identity-backup.js';
import {contextTopicOperationReservation,contextTopicSelectionBinding,evaluateContextTopicAccess} from './context-topic-access-policy.js';
import {readContextTopicScope} from './context-topic-scope.js';
import {CONTEXT_TOPIC_ACCESS_ROW,CONTEXT_TOPIC_ACCESS_LIMITS,emptyContextTopicPreferences,validContextTopicPreferences,validateContextTopicChange,contextTopicEpoch,contextTopicOperationId,contextTopicDigest,sameContextTopicBinding} from './context-topic-preferences.js';

const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,keys)=>plain(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const only=(x,keys)=>plain(x)&&Object.keys(x).every(k=>keys.includes(k));
const stamp=x=>typeof x==='string'&&x.length<=64&&Number.isFinite(Date.parse(x));
const token=x=>typeof x==='string'&&x.length>0&&x.length<=500;
const states=['candidate','active','dormant','merged','removed'];
const allowedReasons=new Set(['policy_allowed','global_off','inputs_off']);
const PREFIX='context-topic:',NAMESPACE='context-topic-access';
// One trusted worker owns the store. Share transient attempts across service
// instances for that store; a worker restart cannot resume an old JS attempt.
// No durable pending row or content is retained.
const attempts=new WeakMap();
const fail=code=>{throw new ArchiveError(code);};
const refuse=reason=>{throw Object.assign(new ArchiveError('CONTEXT_INVALIDATED'),{topicReason:reason});};
const requireFact=(value,reason)=>{if(!value)refuse(reason);};
const refusal=reason=>({ok:false,conflict:false,reason,externalAllowed:false});
const conflict=(reason,revision)=>({ok:false,conflict:true,reason,revision,externalAllowed:false});
const unavailable=reason=>({available:false,reason,version:1,epoch:null,authority:null,items:[],nextCursor:null,complete:false,selectedCount:null,externalAllowed:false});
const errorReason=error=>error?.topicReason||({'CONSENT_REQUIRED':'consent_unavailable','CONTEXT_INVALIDATED':'epoch_changed','STORAGE_FAILED':'storage_unavailable','STORAGE_FULL':'storage_unavailable'}[error?.code]??'storage_unavailable');
const storedCount=row=>row.choices.filter(c=>c.enabled).length;
function validResult(x){return exact(x,['ok','topicId','enabled','revision','noOp','externalAllowed'])&&x.ok===true&&idOK(x.topicId)&&typeof x.enabled==='boolean'&&revisionOK(x.revision)&&typeof x.noOp==='boolean'&&x.externalAllowed===false&&(x.noOp?x.enabled===false&&x.revision===0:x.revision>0);}
function validReceipt(r){return exact(r,['id','namespace','schemaVersion','ownerId','createdAt','digest','epoch','result'])&&typeof r.id==='string'&&r.id.startsWith(PREFIX)&&contextTopicOperationId(r.id.slice(PREFIX.length))&&r.namespace===NAMESPACE&&r.schemaVersion===1&&idOK(r.ownerId)&&stamp(r.createdAt)&&contextTopicDigest(r.digest)&&contextTopicEpoch(r.epoch)&&validResult(r.result)&&r.result.topicId===r.ownerId;}

export class ContextTopicAccessService {
 constructor(store){this.s=store;this.cards=new ContextCardsService(store);if(!attempts.has(store))attempts.set(store,new Map());this.attempts=attempts.get(store);}
 ready(){return !!this.s?.repository?.db&&!!this.s.controlCache&&typeof this.s.readableEntry==='function';}
 async row(t){const row=await t.get('meta',CONTEXT_TOPIC_ACCESS_ROW);if(row&&!validContextTopicPreferences(row))refuse('preferences_unavailable');return row||emptyContextTopicPreferences();}
 async admission(t,expectedEpoch,{scope=false}={}){
  const epoch=await this.cards.admitted(t,expectedEpoch),gate=await t.get('meta','gate'),control=await this.s.control(t);
  requireFact(contextTopicEpoch(epoch),'authority_unavailable');
  requireFact(plain(gate)&&revisionOK(gate.epoch)&&typeof gate.enabled==='boolean'&&gate.epoch===control.settings.epoch&&gate.enabled===control.settings.enabled,'consent_unavailable');
  const restore=await t.get('meta','recovery-restore-epoch');requireFact(!restore||contextTopicOperationId(restore.value),'authority_unavailable');
  const result={epoch,gate:JSON.stringify([gate.epoch,gate.enabled,control.settings.consentVersion])};
  if(!scope)return result;
  for(const id of ['thought-sequence','thought-epoch','input-delta-sequence','revision-sequence','backup-data-generation']){const row=await t.get('meta',id);requireFact(!row||revisionOK(row.value),'authority_unavailable');}
  const foundation=await t.get('meta','thought-library'),binding=await t.get('meta',BINDING_ROW),filter=await t.get('meta','smart-filter');
  requireFact(foundation?.phase==='active'&&foundation.verified===true&&foundation.sealed===0&&binding?.version===1&&binding.complete===true,'not_ready');
  requireFact(filter?.phase==='active'&&['off','light'].includes(filter.mode)&&Object.entries(FILTER_VERSIONS).every(([k,v])=>filter[k]===v)&&revisionOK(filter.policyEpoch)&&revisionOK(filter.decisionSequence),'filter_unavailable');
  result.authority=await rootReadAuthority(t);requireFact(token(result.authority),'authority_unavailable');
  return result;
 }
 async summaryInTransaction(t,epoch){
  try{await this.admission(t,epoch);const row=await this.row(t);return {available:true,selectedCount:storedCount(row),reason:'preferences_ready',externalAllowed:false};}
  catch(error){return {available:false,selectedCount:null,reason:errorReason(error),externalAllowed:false};}
 }
 async prospective(t,topic,epoch){
  if(!topic||!validTopicIdentity(topic.identity)||topic.identity.aliases.length>CONTEXT_TOPIC_ACCESS_LIMITS.choices||topic.identity.noRecreation!==(['removed','merged'].includes(topic.lifecycle)||!!topic.redirectTo))return null;
  for(const name of [topic.identity.nameToken,...topic.identity.aliases.map(x=>x.token)].filter(Boolean)){
   const registry=await t.get('meta','personalTopicName:'+name);if(!validTopicNameRegistry(registry)||registry.topicIds.length>CONTEXT_TOPIC_ACCESS_LIMITS.choices||!registry.topicIds.includes(topic.id))return null;
  }
  const marker=topic.protections?.organization,reservation=marker?contextTopicOperationReservation(await t.get('operationReceipts',marker.operationId)):null;
  return contextTopicSelectionBinding(topic,epoch,reservation);
 }
 async directory(t,row){
  const count=await t.count('topics');requireFact(revisionOK(count)&&count<=CONTEXT_TOPIC_ACCESS_LIMITS.choices,'directory_budget');
  const topics=new Map();let after=null,total=0;
  do{
   const page=await t.primaryRangePage('topics',{after,limit:CONTEXT_TOPIC_ACCESS_LIMITS.page});
   requireFact(exact(page,['rows','next'])&&Array.isArray(page.rows)&&page.rows.length<=CONTEXT_TOPIC_ACCESS_LIMITS.page&&(page.next===null||page.rows.length>0),'incomplete_page');
   let previous=after;
   for(const item of page.rows){
    const topic=item?.value;requireFact(plain(item)&&idOK(item.key)&&topic?.id===item.key&&(previous===null||this.s.repository.factory.cmp(previous,item.key)<0)&&!topics.has(item.key)&&stamp(topic.createdAt)&&states.includes(topic.lifecycle),'incomplete_page');
    previous=item.key;total++;requireFact(total<=CONTEXT_TOPIC_ACCESS_LIMITS.choices,'directory_budget');topics.set(topic.id,topic);
   }
   requireFact(page.next===null||page.next===previous&&(after===null||this.s.repository.factory.cmp(after,page.next)<0),'incomplete_page');after=page.next;
  }while(after!==null);
  requireFact(total===count,'incomplete_page');
  const choices=new Map(row.choices.map(c=>[c.topicId,c])),items=[];
  for(const topic of topics.values())if(['active','dormant'].includes(topic.lifecycle)&&!topic.redirectTo||choices.has(topic.id))items.push({topic,choice:choices.get(topic.id)||null});
  for(const choice of row.choices)if(!topics.has(choice.topicId))items.push({topic:{id:choice.topicId,createdAt:choice.binding.createdAt,lifecycle:'missing'},choice});
  // The existing Thought stable directory uses this exact createdAt/id key.
  // Read the canonical rows, including retained stale selections, without the
  // root projection's initialization, count rebuild or excerpt/body reads.
  requireFact(items.length<=CONTEXT_TOPIC_ACCESS_LIMITS.choices,'directory_budget');
  items.sort((a,b)=>this.s.repository.factory.cmp(JSON.stringify([a.topic.createdAt,a.topic.id]),JSON.stringify([b.topic.createdAt,b.topic.id])));
  return items;
 }
 async page(options={}){
  if(!only(options,['cursor','limit']))return unavailable('invalid_request');
  const {cursor=null,limit=50}=options;
  if(!Number.isInteger(limit)||limit<1||limit>CONTEXT_TOPIC_ACCESS_LIMITS.page||cursor!==null&&(!exact(cursor,['version','authority','epoch','offset'])||cursor.version!==1||!token(cursor.authority)||!contextTopicEpoch(cursor.epoch)||!revisionOK(cursor.offset)||cursor.offset<1||cursor.offset>CONTEXT_TOPIC_ACCESS_LIMITS.choices))return unavailable('invalid_request');
  if(!this.ready())return unavailable('not_ready');
  try{
   const captured=await this.s.repository.transaction(false,async t=>{
    const admission=await this.admission(t,undefined,{scope:true}),row=await this.row(t);
    if(cursor&&(cursor.authority!==admission.authority||cursor.epoch!==admission.epoch))refuse('stale_authority');
    const all=await this.directory(t,row),offset=cursor?.offset||0;requireFact(offset<=all.length,'invalid_request');
    const items=[],memory=new MemoryService(this.s);
    for(const {topic,choice} of all.slice(offset,offset+limit)){
     const expectedBinding=await this.prospective(t,topic,admission.epoch),binding=choice?.binding||null;
     let name='';if(topic.lifecycle!=='missing'&&typeof topic.name==='string'&&topic.name.length<=300&&(topic.sourceRecordIds===undefined||Array.isArray(topic.sourceRecordIds)&&topic.sourceRecordIds.length<=CONTEXT_TOPIC_ACCESS_LIMITS.choices&&topic.sourceRecordIds.every(idOK)))name=await memory.safeLabel(t,topic,'name');
     const bindingValid=!!binding&&sameContextTopicBinding(binding,expectedBinding),enabled=choice?.enabled===true;
     items.push({topicId:topic.id,name,createdAt:topic.createdAt,lifecycle:topic.lifecycle,enabled,revision:choice?.revision||0,binding,expectedBinding,bindingValid,policyAllowed:false,reason:enabled?(bindingValid?'scope_pending':'selection_stale'):expectedBinding?'topic_off':'topic_unavailable',canEnable:!!expectedBinding,canDisable:enabled,externalAllowed:false});
    }
    return {...admission,items,total:all.length,offset,selectedCount:storedCount(row)};
   });
   for(const item of captured.items)if(item.enabled){
    const scope=await readContextTopicScope(this.s,{topicId:item.topicId,expectedAuthority:captured.authority});
    if(!scope.available){item.reason=scope.reason;item.policyAllowed=false;continue;}
    const verdict=evaluateContextTopicAccess({...scope.snapshot,selection:{...item.binding,enabled:true}});
    item.bindingValid=sameContextTopicBinding(item.binding,scope.binding);item.policyAllowed=verdict.policyAllowed;item.reason=verdict.reason;
   }
   await this.s.repository.transaction(false,async t=>{const current=await this.admission(t,captured.epoch,{scope:true});requireFact(current.authority===captured.authority&&current.gate===captured.gate,'stale_authority');},['meta']);
   const offset=captured.offset+captured.items.length,complete=offset===captured.total;
   return {available:true,reason:'page_ready',version:1,epoch:captured.epoch,authority:captured.authority,items:captured.items,nextCursor:complete?null:{version:1,authority:captured.authority,epoch:captured.epoch,offset},complete,selectedCount:captured.selectedCount,externalAllowed:false};
  }catch(error){return unavailable(errorReason(error));}
 }
 async receipt(t,operationId,digest,epoch,change){
  const receipt=await t.get('operationReceipts',PREFIX+operationId);if(!receipt)return null;
  if(!validReceipt(receipt)||receipt.digest!==digest||receipt.epoch!==epoch||change&&(receipt.ownerId!==change.topicId||receipt.result.enabled!==change.enabled||receipt.result.revision!==(receipt.result.noOp?0:change.expectedRevision+1)||receipt.result.noOp&&change.expectedRevision!==0))fail('INVALID_REQUEST');
  return receipt.result;
 }
 change(input){
  // Return the same reserved Promise, not an async wrapper around it. Validation
  // still rejects asynchronously, and the attempt exists before any digest work.
  try{
   const c=structuredClone(validateContextTopicChange(input)),serialized=JSON.stringify(c),prior=this.attempts.get(c.operationId);
   if(prior){if(prior.serialized!==serialized)fail('INVALID_REQUEST');return prior.promise;}
   const attempt={serialized,promise:null};this.attempts.set(c.operationId,attempt);
   attempt.promise=Promise.resolve().then(()=>this.applyChange(c,serialized)).finally(()=>{if(this.attempts.get(c.operationId)===attempt)this.attempts.delete(c.operationId);});
   return attempt.promise;
  }catch(error){return Promise.reject(error);}
 }
 async applyChange(c,serialized){
  const digest=await hashText(serialized);
  if(!this.ready())return refusal('not_ready');
  // Acknowledgment is historical, never a current read permission. Check it
  // before assessing current content, so lost acknowledgments remain resolvable.
  const prior=await this.s.repository.transaction(false,async t=>{await this.admission(t,c.epoch);return this.receipt(t,c.operationId,digest,c.epoch,c);},['meta','operationReceipts']);
  if(prior)return prior;
  let captured=null,scope=null;
  if(c.enabled){
   try{captured=await this.s.repository.transaction(false,t=>this.admission(t,c.epoch,{scope:true}),['meta']);}
   catch(error){return refusal(errorReason(error));}
   scope=await readContextTopicScope(this.s,{topicId:c.topicId,expectedAuthority:captured.authority});
   if(!scope.available)return refusal(scope.reason);
   if(!sameContextTopicBinding(c.expectedBinding,scope.binding))return conflict('binding_changed',c.expectedRevision);
   const verdict=evaluateContextTopicAccess({...scope.snapshot,selection:{...scope.binding,enabled:true}});
   if(!allowedReasons.has(verdict.reason))return refusal(verdict.reason);
  }
  return this.s.write(async t=>{
   const admission=await this.admission(t,c.epoch),prior=await this.receipt(t,c.operationId,digest,c.epoch,c);if(prior)return prior;
   const row=await this.row(t);let choice=row.choices.find(x=>x.topicId===c.topicId),revision=choice?.revision||0;
   if(revision!==c.expectedRevision)return conflict('revision_changed',revision);
   if(c.enabled){
    const current=await this.admission(t,c.epoch,{scope:true});
    if(current.authority!==captured.authority||current.gate!==captured.gate||scope.snapshot.currentAuthority!==current.authority)return conflict('stale_authority',revision);
    const binding=await this.prospective(t,await t.get('topics',c.topicId),admission.epoch);
    if(!sameContextTopicBinding(binding,scope.binding)||!sameContextTopicBinding(binding,c.expectedBinding))return conflict('binding_changed',revision);
    if(!choice){if(row.choices.length>=CONTEXT_TOPIC_ACCESS_LIMITS.choices)return refusal('preferences_limit');choice={topicId:c.topicId,enabled:true,revision:0,binding};row.choices.push(choice);}else choice.binding=binding;
   }else if(choice&&!sameContextTopicBinding(c.expectedBinding,choice.binding))return conflict('binding_changed',revision);
   const noOp=!choice;
   if(choice){choice.enabled=c.enabled;choice.revision++;row.revision++;if(!validContextTopicPreferences(row))return refusal('preferences_limit');await t.put('meta',row);revision=choice.revision;}
   const result={ok:true,topicId:c.topicId,enabled:c.enabled,revision,noOp,externalAllowed:false};
   await t.put('operationReceipts',{id:PREFIX+c.operationId,namespace:NAMESPACE,schemaVersion:1,ownerId:c.topicId,createdAt:this.s.clock(),digest,epoch:c.epoch,result});
   return result;
  });
 }
 async outcome(query){
  if(!exact(query,['operationId','digest','epoch'])||!contextTopicOperationId(query.operationId)||!contextTopicDigest(query.digest)||!contextTopicEpoch(query.epoch))fail('INVALID_REQUEST');
  if(!this.ready())return {state:'unknown',externalAllowed:false};
  const pending=this.attempts.has(query.operationId);
  return this.s.repository.transaction(false,async t=>{
   await this.admission(t,query.epoch);const receipt=await t.get('operationReceipts',PREFIX+query.operationId);
   if(!receipt)return {state:pending||this.attempts.has(query.operationId)?'unknown':'not_committed',externalAllowed:false};
   if(!validReceipt(receipt)||receipt.digest!==query.digest||receipt.epoch!==query.epoch)return {state:'unknown',externalAllowed:false};
   return {state:'committed',result:receipt.result,externalAllowed:false};
  },['meta','operationReceipts']);
 }
}
