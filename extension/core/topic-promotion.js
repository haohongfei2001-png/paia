import {applyConfirmedPromotion} from './topic-promotion-commit.js';
import {fail,keys,idOK,revisionOK,same,keyedHash} from './thought-model.js';
import {hashText} from './dedupe.js';
import {TopicIdentityRetrieval} from './topic-retrieval.js';
import {publicTopicAuthority} from './topic-processing.js';
import {readFormationEvidence,formationEntryDescriptor,readableFormationSection,validateFormationSources} from './topic-formation-evidence.js';
import {PromotionSelection,PROMOTION_PAGE_SIZE} from './topic-promotion-selection.js';
import {PROMOTION_LIMITS,evaluateSectionPromotion,formationParameters,promotionPlacementId,promotionSectionId,promotionOrganization} from './topic-promotion-policy.js';

export const PROMOTION_WORK_PREFIX='personal-topic-promotion:';
const TABLE='organizerWorkItems',unique=xs=>[...new Set(xs)];
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const active=signal=>{if(signal?.aborted)fail();};
const workId=operationId=>PROMOTION_WORK_PREFIX+operationId;
const itemId=(id,index)=>id+':'+String(index).padStart(3,'0');
const token=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const validWorkId=id=>typeof id==='string'&&id.startsWith(PROMOTION_WORK_PREFIX)&&idOK(id.slice(PROMOTION_WORK_PREFIX.length))&&!id.slice(PROMOTION_WORK_PREFIX.length).includes(':');
const descriptor=row=>Object.fromEntries(['id','topicId','sectionId','title','isDefault','revision','layoutGeneration'].filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));

// A domain-only seam. No production assessor, provider, worker, background
// runner, UI, external permission or command is installed by this module.
export class SectionPromotionService {
 #plans=new WeakMap();
 #decision;
 #parameters;
 constructor(store,{resolveProcessing=null,decision=null,parameters=null}={}){
  this.store=store;this.retrieval=new TopicIdentityRetrieval(store,{resolveProcessing});this.selection=new PromotionSelection(this);
  if(decision!==null){keys(decision,['version','assess'],['version','assess']);if(typeof decision.assess!=='function'||!/^[-a-zA-Z0-9_.]{1,80}$/.test(decision.version))fail();this.#decision=Object.freeze({...decision});}
  this.#parameters=parameters===null?null:formationParameters(parameters);
 }
 async read(prepared,fn){return this.store.run(()=>this.store.repository.transaction(false,async t=>{await this.retrieval.guard.check(t,prepared);return fn(t);}));}
 async authorize(t,prepared,ids){for(let i=0;i<ids.length;i+=100)if(await this.retrieval.guard.processing(t,prepared.evidence,ids.slice(i,i+100))!==prepared.authority.processingEpoch)fail();}
 validateRequest(request){
  keys(request,['scope','topicId','sectionId','entryIds','selection','operationId'],['scope','topicId','sectionId','selection','operationId']);
  if(![request.topicId,request.sectionId,request.operationId].every(idOK)||request.operationId.length<8||request.operationId.includes(':')||!['explicit_entries','whole_section'].includes(request.selection)||!Array.isArray(request.scope)||!request.scope.length)fail();
  if(request.selection==='explicit_entries'&&(!Array.isArray(request.entryIds)||!request.entryIds.length||new Set(request.entryIds).size!==request.entryIds.length||request.entryIds.some(id=>!idOK(id)))||request.selection==='whole_section'&&request.entryIds!==undefined)fail();
 }
 async snapshot(t,prepared,request){
  await this.authorize(t,prepared,[request.topicId]);
  const topic=await t.get('topics',request.topicId);
  if(!topic||topic.lifecycle!=='active'||topic.redirectTo||topic.layoutJobId)fail();
  const raw=await t.get('sections',promotionSectionId(topic.id,topic.activeLayoutGeneration,request.sectionId));
  if(!raw||raw.lifecycle!=='active'||raw.redirectTo)fail();
  const section=await readableFormationSection(this.store,t,raw);if(section.sourceUnavailable)fail();
  const evidence=await readFormationEvidence(this.store,t,prepared,request.entryIds),placements=[],organizations=[];
  for(const entryId of request.entryIds){
   const placement=await t.get('placements',promotionPlacementId(topic.id,topic.activeLayoutGeneration,entryId)),entry=await t.get('thoughts',entryId);
   if(!placement||placement.lifecycle!=='active'||placement.sectionId!==section.sectionId)fail();
   placements.push(placement);organizations.push({entryId,...promotionOrganization(entry)});
  }
  placements.sort((a,b)=>a.rank<b.rank?-1:a.rank>b.rank?1:a.entryId<b.entryId?-1:a.entryId>b.entryId?1:0);
  return {topic,section,evidence,placements,organizations};
 }
 async prepare(request,{signal=null}={}){
  this.validateRequest(request);if(!this.#decision||!this.#parameters)fail();active(signal);request=structuredClone(request);
  const large=request.selection==='whole_section'||request.entryIds.length>PROMOTION_PAGE_SIZE||request.scope.length>PROMOTION_PAGE_SIZE,lookupScope=request.scope.slice(0,PROMOTION_PAGE_SIZE);
  const identities=[],constraints=[];let cursor=null,last;
  do{active(signal);last=await this.retrieval.page({scope:lookupScope,cursor});for(const item of last.items)(item.kind==='identity'?identities:constraints).push(item);cursor=last.nextCursor;}while(cursor);
  const prepared=await this.retrieval.prepareCoverage({scope:lookupScope,coverage:last.coverage}),identityIds=unique(identities.flatMap(row=>[row.id,row.canonicalId]));
  const authoredSelection=!large&&await this.read(prepared,async t=>{await this.authorize(t,prepared,[request.topicId]);for(const id of request.entryIds)if(!await t.count('dependencies','byTarget',IDBKeyRange.bound(['entry',id],['entry',id,[]],false,true)))return true;return false;});
  const selectionState=large||authoredSelection?await this.selection.collect(request,prepared):null,snapshot=selectionState?.snapshot||await this.read(prepared,t=>this.snapshot(t,prepared,request));await validateFormationSources(snapshot.evidence);
  if(selectionState)await this.read(prepared,t=>this.selection.check(t,selectionState,identityIds));
  const reader=selectionState?this.selection.reader(selectionState,signal,identityIds):null;
  const view=freeze(structuredClone({version:1,selection:request.selection,...(selectionState?{manifest:{count:snapshot.placements.length,pageCount:selectionState.pages.length,digest:snapshot.selection.manifestDigest}}:{}),section:descriptor(snapshot.section),inputs:snapshot.evidence.inputs.map(({sourceIds,...input})=>input),entries:snapshot.evidence.entries.map(entry=>formationEntryDescriptor(entry,snapshot.evidence.inputs)),identities,constraints,parameters:this.#parameters}));
  const limits=this.store.organizerBudget?.limits;
  if(limits&&(new TextEncoder().encode(JSON.stringify(view.inputs)).length>limits.maxContentBytes||new TextEncoder().encode(JSON.stringify(view)).length>limits.maxRequestBytes))fail();
  let assessment;active(signal);try{assessment=freeze(structuredClone(await this.#decision.assess(view,reader?.api)));}catch{fail();}active(signal);
  const claims=selectionState?this.selection.acknowledge(assessment,selectionState,reader.seen):assessment,plan=evaluateSectionPromotion(claims,snapshot,identities,this.#parameters);if(selectionState)plan.entryIds=snapshot.selection.manifest.entryIds;
  const nameToken=await keyedHash(prepared.authority.secret,['personal-topic-name-v1',plan.name.normalize('NFKC').toLocaleLowerCase().trim()]);
  const proof=await this.retrieval.constraintProof(prepared,{nameTokens:[nameToken],relatedTopicIds:[request.topicId]});if(proof.blocked)fail();
  const snapshotDigest=await hashText(JSON.stringify(snapshot));
  await this.read(prepared,async t=>{await this.authorize(t,prepared,identityIds);if(selectionState)await this.selection.check(t,selectionState,identityIds);else if(!same(snapshot,await this.snapshot(t,prepared,request)))fail();active(signal);});
  const handle=freeze({version:1,name:plan.name,sourceTopicId:request.topicId,sourceSectionId:request.sectionId,selection:request.selection,entryIds:plan.entryIds,requestedCount:request.entryIds?.length??snapshot.placements.length,selectedCount:plan.entryIds.length,wholeSection:request.selection==='whole_section',reason:plan.reason,checks:plan.checks,lineage:plan.lineage});
  this.#plans.set(handle,{request,prepared,snapshot,snapshotDigest,identityIds,plan,nameToken,proof,signal,selectionState,cancelled:false});return handle;
 }
 cancel(handle){const state=this.#plans.get(handle);if(!state)fail();state.cancelled=true;}
 async confirm(handle,confirmation){
  keys(confirmation,['confirmed'],['confirmed']);if(confirmation.confirmed!==true)fail();
  const state=this.#plans.get(handle);if(!state||state.cancelled)fail();active(state.signal);
  const {request,prepared,snapshot,snapshotDigest,identityIds,plan,nameToken,proof}=state,at=Date.parse(this.store.clock());
  const confirmed=state.confirmed??={request,authority:publicTopicAuthority(prepared.authority),snapshotDigest,identityIds,plan,nameToken,proof,manifestSelection:!!state.selectionState,decisionVersion:this.#decision.version,sourceRecordIds:unique([...prepared.evidence.flatMap(e=>e.sourceRecordIds),...(snapshot.section.sourceRecordIds||[]),...(snapshot.topic.sourceRecordIds||[]),...(snapshot.selection?.sourceRecordIds||[]),...snapshot.evidence.entries.flatMap(e=>e.sourceRecordIds)]),inputIds:request.scope.map(e=>e.inputId),at,expiresAt:at+PROMOTION_LIMITS.lifetimeMs};
  const signature=await keyedHash(prepared.authority.secret,['confirmed-section-promotion-v1',confirmed]),id=workId(request.operationId);
  return this.store.foundationWrite(async t=>{
   await this.retrieval.guard.check(t,prepared);await this.authorize(t,prepared,identityIds);
   if(!await this.retrieval.checkConstraintProof(t,prepared,proof)||state.cancelled)fail();if(state.selectionState)await this.selection.check(t,state.selectionState,identityIds);else if(!same(snapshot,await this.snapshot(t,prepared,request)))fail();active(state.signal);
   const prior=await t.get(TABLE,id);if(prior){this.validateWork(prior);if(!same(prior.confirmed,confirmed)||prior.signature!==signature)fail();return {workId:id,state:prior.state,revision:prior.revision};}
   if(await t.get('operationReceipts',request.operationId))fail();
   await t.put(TABLE,{id,kind:'personal_topic_promotion',version:1,state:'confirmed',stateKey:1,revision:0,offset:0,confirmed,signature,sourceRecordIds:confirmed.sourceRecordIds,inputIds:confirmed.inputIds});
   if(state.cancelled)fail();active(state.signal);return {workId:id,state:'confirmed',revision:0};
  });
 }
 validateWork(row){
  keys(row,['id','kind','version','state','stateKey','revision','offset','confirmed','signature','sourceRecordIds','inputIds'],['id','kind','version','state','stateKey','revision','offset','confirmed','signature','sourceRecordIds','inputIds']);
  if(!validWorkId(row.id)||row.kind!=='personal_topic_promotion'||row.version!==1||!['confirmed','staging','ready'].includes(row.state)||row.stateKey!==1||!revisionOK(row.revision)||!revisionOK(row.offset)||!token(row.signature))fail();
  const c=row.confirmed;keys(c,['request','authority','snapshotDigest','identityIds','plan','nameToken','proof','manifestSelection','decisionVersion','sourceRecordIds','inputIds','at','expiresAt'],['request','authority','snapshotDigest','identityIds','plan','nameToken','proof','manifestSelection','decisionVersion','sourceRecordIds','inputIds','at','expiresAt']);this.validateRequest(c.request);
  if(row.id!==workId(c.request.operationId)||!token(c.snapshotDigest)||!token(c.nameToken)||!Array.isArray(c.plan.entryIds)||!c.plan.entryIds.length||new Set(c.plan.entryIds).size!==c.plan.entryIds.length||c.plan.entryIds.some(id=>!idOK(id)||c.request.entryIds&&!c.request.entryIds.includes(id))||row.offset>c.plan.entryIds.length||!same(row.sourceRecordIds,c.sourceRecordIds)||!same(row.inputIds,c.inputIds)||!Number.isFinite(c.at)||c.expiresAt-c.at!==PROMOTION_LIMITS.lifetimeMs)fail();
 }
 async resume(id){
  if(!validWorkId(id))fail();await this.store.finishFoundation();
  const row=await this.store.run(()=>this.store.repository.transaction(false,t=>t.get(TABLE,id)));if(!row)fail();this.validateWork(row);
  const c=row.confirmed,prepared=await this.retrieval.guard.prepare(c.request.scope.slice(0,PROMOTION_PAGE_SIZE));
  if(!same(c.authority,publicTopicAuthority(prepared.authority))||c.expiresAt<=Date.parse(this.store.clock())||row.signature!==await keyedHash(prepared.authority.secret,['confirmed-section-promotion-v1',c]))fail();
  const large=c.manifestSelection,selectionState=large?await this.selection.collect(c.request,prepared):null;
  const snapshot=selectionState?.snapshot||await this.read(prepared,async t=>{await this.authorize(t,prepared,c.identityIds);if(!await this.retrieval.checkConstraintProof(t,prepared,c.proof))fail();return this.snapshot(t,prepared,c.request);});
  if(await hashText(JSON.stringify(snapshot))!==c.snapshotDigest)fail();
  return {row,prepared,snapshot,selectionState};
 }
 async check(t,{row,prepared,snapshot,selectionState}){
  await this.retrieval.guard.check(t,prepared);await this.authorize(t,prepared,row.confirmed.identityIds);
  if(!same(row,await t.get(TABLE,row.id))||row.confirmed.expiresAt<=Date.parse(this.store.clock()))fail();
  if(selectionState)await this.selection.check(t,selectionState,row.confirmed.identityIds);else if(!same(snapshot,await this.snapshot(t,prepared,row.confirmed.request)))fail();
 }
 async stage(id,{limit=PROMOTION_LIMITS.batch}={}){
  if(!Number.isSafeInteger(limit)||limit<1||limit>PROMOTION_LIMITS.batch)fail();const state=await this.resume(id),{row,snapshot}=state,c=row.confirmed;
  return this.store.foundationWrite(async t=>{
   await this.check(t,state);if(row.state==='ready')return {workId:id,state:'ready',staged:row.offset,total:c.plan.entryIds.length,revision:row.revision};const end=Math.min(row.offset+limit,c.plan.entryIds.length),placements=new Map(snapshot.placements.map(p=>[p.entryId,p])),organizations=new Map(snapshot.organizations.map(e=>[e.entryId,e]));
   for(let i=row.offset;i<end;i++){
    const entryId=c.plan.entryIds[i],placement=placements.get(entryId),organization=organizations.get(entryId);
    await t.put(TABLE,{id:itemId(id,i),kind:'personal_topic_promotion_placement',version:1,stateKey:1,parentId:id,index:i,entryId,placement,organization,sourceRecordIds:c.sourceRecordIds,inputIds:c.inputIds});
   }
   row.offset=end;row.revision++;row.state=end===c.plan.entryIds.length?'ready':'staging';await t.put(TABLE,row);return {workId:id,state:row.state,staged:end,total:c.plan.entryIds.length,revision:row.revision};
  });
 }
 async rollback(id){
  if(!validWorkId(id))fail();await this.store.finishFoundation();
  return this.store.foundationWrite(async t=>{
   const row=await t.get(TABLE,id);if(!row)return await t.get('operationReceipts',id.slice(PROMOTION_WORK_PREFIX.length))?{cancelled:false,committed:true}:{cancelled:true};this.validateWork(row);
   for(let i=0;i<row.confirmed.plan.entryIds.length;i++)await t.delete(TABLE,itemId(id,i));await t.delete(TABLE,id);return {cancelled:true};
  });
 }
 async activate(id){
  if(!validWorkId(id))fail();
  const prior=await this.result(id.slice(PROMOTION_WORK_PREFIX.length));if(prior)return prior;
  const state=await this.resume(id),{row,prepared,snapshot}=state,c=row.confirmed;if(row.state!=='ready'||row.offset!==c.plan.entryIds.length)fail();
  const request={kind:'confirmed-section-promotion',...c.request,confirmation:row.signature},digest=await hashText(JSON.stringify(request));
  return this.store.foundationWrite(async t=>{
   const replay=await t.get('operationReceipts',c.request.operationId);if(replay){if(replay.digest!==digest)fail();for(const guard of state.selectionState?.guards||[prepared]){await this.retrieval.guard.check(t,guard,{generation:false});await this.authorize(t,guard,[replay.result.id,replay.result.sourceTopicId]);}return replay.result;}
   await this.check(t,state);if(!await this.retrieval.checkConstraintProof(t,prepared,c.proof))fail();
   const placements=new Map(snapshot.placements.map(p=>[p.entryId,p])),organizations=new Map(snapshot.organizations.map(e=>[e.entryId,e]));
   for(let i=0;i<c.plan.entryIds.length;i++){
    const staged=await t.get(TABLE,itemId(id,i)),entryId=c.plan.entryIds[i];
    if(!staged||staged.kind!=='personal_topic_promotion_placement'||staged.parentId!==id||staged.index!==i||staged.entryId!==entryId||!same(staged.placement,placements.get(entryId))||!same(staged.organization,organizations.get(entryId)))fail();
   }
   return applyConfirmedPromotion(this.store,t,{snapshot,confirmed:c,request,digest,id,itemId,origin:'ai',authorizeTarget:async topicId=>{for(const guard of state.selectionState?.guards||[prepared])await this.authorize(t,guard,[topicId]);}});
  });
 }
 async result(operationId){
  if(!idOK(operationId))fail();await this.store.finishFoundation();const prior=await this.store.run(()=>this.store.repository.transaction(false,t=>t.get('operationReceipts',operationId)));
  if(!prior)return null;const result=prior.result;
  if(result?.kind!=='personal_topic_promotion'||result.operationId!==operationId||result.version!==1||result.intentMode==='user_structural')fail();
  for(let offset=0;offset<result.scope.length;offset+=PROMOTION_PAGE_SIZE){const prepared=await this.retrieval.guard.prepare(result.scope.slice(offset,offset+PROMOTION_PAGE_SIZE));await this.read(prepared,t=>this.authorize(t,prepared,[result.id,result.sourceTopicId]));}
  await this.store.run(()=>this.store.repository.transaction(false,async t=>{for(const mapping of result.mappings){const revision=await t.get('revisions',mapping.targetRevisionId);if(!revision||!await this.store.sourcePresent(t,revision.sourceRecordIds))fail();}}));
  return result;
 }
}
