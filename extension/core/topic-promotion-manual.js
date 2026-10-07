import {fail,keys,idOK,revisionOK,same,keyedHash,prefix} from './thought-model.js';
import {hashText} from './dedupe.js';
import {topicIdentityBase,assertTopicIdentityBase} from './topic-identity.js';
import {inputProjection} from './thought-evidence.js';
import {bindingRead} from './thought-binding.js';
import {readableFormationSection} from './topic-formation-evidence.js';
import {promotionPlacementId,promotionSectionId,promotionOrganization,PROMOTION_LIMITS} from './topic-promotion-policy.js';
import {applyConfirmedPromotion} from './topic-promotion-commit.js';

export const MANUAL_PROMOTION_PREFIX='personal-topic-manual-promotion:';
const TABLE='organizerWorkItems',PAGE=100,unique=xs=>[...new Set(xs)];
const itemId=(id,index)=>id+':'+String(index).padStart(3,'0');
const workIdOK=id=>typeof id==='string'&&id.startsWith(MANUAL_PROMOTION_PREFIX)&&idOK(id.slice(MANUAL_PROMOTION_PREFIX.length))&&!id.slice(MANUAL_PROMOTION_PREFIX.length).includes(':');
const active=signal=>{if(signal?.aborted)fail();};
const publicAuthority=({secret,...authority})=>authority;
const freeze=value=>{if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;};

// PT-02/PT-07 ordinary user organization, not an AI admission fallback. A
// trusted local manual command supplies the actual user-entered name/selection.
// No assessor, automatic-processing resolver, provider or UI is installed here.
// The method does not infer identity, recurrence or permission from its content.
export class ManualSectionPromotionService {
 #plans=new WeakMap();
 constructor(store){this.store=store;}
 request(value){
  keys(value,['topicId','sectionId','selection','entryIds','name','operationId'],['topicId','sectionId','selection','name','operationId']);
  if(![value.topicId,value.sectionId,value.operationId].every(idOK)||value.operationId.length<8||value.operationId.includes(':')||typeof value.name!=='string'||!value.name.trim()||value.name.length>300||!['whole_section','explicit_entries'].includes(value.selection))fail();
  if(value.selection==='whole_section'&&value.entryIds!==undefined||value.selection==='explicit_entries'&&(!Array.isArray(value.entryIds)||!value.entryIds.length||new Set(value.entryIds).size!==value.entryIds.length||value.entryIds.some(id=>!idOK(id))))fail();
 }
 async authority(t){
  const library=await t.get('meta','thought-library');if(library?.sealed)fail();
  return {...await topicIdentityBase(t),generation:(await t.get('meta','backup-data-generation'))?.value??0,thoughtEpoch:(await t.get('meta','thought-epoch'))?.value??0,gateEpoch:(await t.get('meta','gate'))?.epoch??0};
 }
 async checkAuthority(t,authority,{generation=true}={}){
  await assertTopicIdentityBase(t,authority);const current=await this.authority(t),select=a=>({restoreEpoch:a.restoreEpoch,thoughtEpoch:a.thoughtEpoch,gateEpoch:a.gateEpoch,...(generation?{generation:a.generation}:{})});if(!same(select(current),select(authority)))fail();
 }
 async read(authority,fn){return this.store.run(()=>this.store.repository.transaction(false,async t=>{await this.checkAuthority(t,authority);return fn(t);}));}
 async entry(t,id){
  const raw=await this.store.readableEntry(t,id);if(raw.lifecycle!=='active'||!await this.store.sourcePresent(t,raw.sourceRecordIds)||(await t.all('thoughtSuppressions','byEntry',id)).some(r=>r.status==='active'))fail();
  const dependencies=await t.all('dependencies','byTarget',prefix(['entry',id])),scope=[];
  // Unlike an AI evidence reader, a trusted manual move does not relabel a
  // readable retained Entry's authorship or require it to prove a new Source.
  // Existing owner/deletion fences above remain decisive.
  const filter=await t.get('meta','smart-filter');
  for(const dependency of dependencies){const input=await inputProjection(this.store,t,dependency.inputId);if(!input||await this.store.isFiltered(t,input.block,filter))fail();scope.push({inputId:input.inputId,role:'primary',selectedFields:['body']});}
  const row=await bindingRead(this.store,t,raw);if(typeof row.thoughtText!=='string'||!row.thoughtText.trim())fail();
  // Body is a private CAS snapshot only. Notes never enter the preview, staging,
  // assessment or a copied journal. No Source/Input identifier is synthesized.
  return {entryId:id,body:row.thoughtText,revision:raw.revision,contentRevision:raw.contentRevision,bodyBinding:row.bodyBinding,workingInputId:row.workingInputId??null,origin:raw.origin,provenanceType:raw.provenanceType,sourceRecordIds:raw.sourceRecordIds||[],organization:promotionOrganization(raw),scope};
 }
 async collect(request,authority){
  const base=await this.read(authority,async t=>{const topic=await t.get('topics',request.topicId);if(!topic||topic.lifecycle!=='active'||topic.redirectTo||topic.layoutJobId)fail();const raw=await t.get('sections',promotionSectionId(topic.id,topic.activeLayoutGeneration,request.sectionId));if(!raw||raw.lifecycle!=='active'||raw.redirectTo)fail();const section=await readableFormationSection(this.store,t,raw);if(section.sourceUnavailable)fail();return {topic,section};});
  const placements=[],entries=[];const add=async(t,p)=>{if(!p||p.lifecycle!=='active'||p.sectionId!==base.section.sectionId)fail();placements.push(p);entries.push(await this.entry(t,p.entryId));};
  if(request.selection==='whole_section'){let cursor=null;do{const page=await this.read(authority,async t=>{const page=await t.rangePage('placements','bySectionOrder',prefix([base.topic.id,base.topic.activeLayoutGeneration,base.section.sectionId,0]),cursor,PAGE);for(const {value}of page.rows)await add(t,value);return page;});cursor=page.next;}while(cursor);}
  else for(let offset=0;offset<request.entryIds.length;offset+=PAGE)await this.read(authority,async t=>{for(const id of request.entryIds.slice(offset,offset+PAGE))await add(t,await t.get('placements',promotionPlacementId(base.topic.id,base.topic.activeLayoutGeneration,id)));});
  if(!placements.length)fail();placements.sort((a,b)=>a.rank<b.rank?-1:a.rank>b.rank?1:a.entryId<b.entryId?-1:a.entryId>b.entryId?1:0);
  const snapshot={...base,placements,entries,organizations:entries.map(e=>({entryId:e.entryId,...e.organization}))};await this.read(authority,t=>this.checkSnapshot(t,request,snapshot));return snapshot;
 }
 async checkSnapshot(t,request,snapshot){
  if(!same(snapshot.topic,await t.get('topics',request.topicId))||!same(snapshot.section,await t.get('sections',snapshot.section.id)))fail();
  if(request.selection==='whole_section'&&await t.count('placements','bySectionOrder',prefix([snapshot.topic.id,snapshot.topic.activeLayoutGeneration,snapshot.section.sectionId,0]))!==snapshot.placements.length)fail();
  const entries=new Map(snapshot.entries.map(e=>[e.entryId,e]));for(const p of snapshot.placements){if(!same(p,await t.get('placements',p.id))||!same(entries.get(p.entryId),await this.entry(t,p.entryId)))fail();}
 }
 async prepare(request,{signal=null}={}){
  this.request(request);active(signal);request=structuredClone(request);await this.store.finishFoundation();const authority=await this.store.run(()=>this.store.repository.transaction(false,t=>this.authority(t))),snapshot=await this.collect(request,authority),nameToken=await keyedHash(authority.secret,['personal-topic-name-v1',request.name.normalize('NFKC').toLocaleLowerCase().trim()]),snapshotDigest=await hashText(JSON.stringify(snapshot));active(signal);
  const handle=freeze({version:1,intentMode:'user_structural',name:request.name,sourceTopicId:request.topicId,sourceSectionId:request.sectionId,selection:request.selection,entryIds:snapshot.placements.map(p=>p.entryId),selectedCount:snapshot.placements.length,wholeSection:request.selection==='whole_section',semanticAssessment:false});
  this.#plans.set(handle,{request,authority,snapshot,snapshotDigest,nameToken,signal,cancelled:false});return handle;
 }
 cancel(handle){const state=this.#plans.get(handle);if(!state)fail();state.cancelled=true;}
 async confirm(handle,confirmation){
  keys(confirmation,['confirmed'],['confirmed']);if(confirmation.confirmed!==true)fail();const state=this.#plans.get(handle);if(!state||state.cancelled)fail();active(state.signal);const {request,authority,snapshot,nameToken,snapshotDigest}=state,at=Date.parse(this.store.clock());
  const confirmed=state.confirmed??={request,authority:publicAuthority(authority),snapshotDigest,nameToken,plan:{name:request.name,entryIds:snapshot.placements.map(p=>p.entryId)},sourceRecordIds:unique([...(snapshot.topic.sourceRecordIds||[]),...(snapshot.section.sourceRecordIds||[]),...snapshot.entries.flatMap(e=>e.sourceRecordIds)]),scope:[...new Map(snapshot.entries.flatMap(e=>e.scope).map(s=>[s.inputId,s])).values()],at,expiresAt:at+PROMOTION_LIMITS.lifetimeMs};
  const signature=await keyedHash(authority.secret,['confirmed-user-section-promotion-v1',confirmed]),id=MANUAL_PROMOTION_PREFIX+request.operationId;
  return this.store.foundationWrite(async t=>{
   await this.checkAuthority(t,authority);await this.checkSnapshot(t,request,snapshot);active(state.signal);if(state.cancelled)fail();const old=await t.get(TABLE,id);
   if(old){this.validate(old);if(!same(old.confirmed,confirmed)||old.signature!==signature)fail();return {workId:id,state:old.state,revision:old.revision};}
   if(await t.get('operationReceipts',request.operationId))fail();await t.put(TABLE,{id,kind:'personal_topic_manual_promotion',version:1,state:'confirmed',stateKey:1,revision:0,offset:0,confirmed,signature,sourceRecordIds:confirmed.sourceRecordIds,inputIds:confirmed.scope.map(s=>s.inputId)});active(state.signal);if(state.cancelled)fail();return {workId:id,state:'confirmed',revision:0};
  });
 }
 validate(row){
  keys(row,['id','kind','version','state','stateKey','revision','offset','confirmed','signature','sourceRecordIds','inputIds'],['id','kind','version','state','stateKey','revision','offset','confirmed','signature','sourceRecordIds','inputIds']);
  if(!workIdOK(row.id)||row.kind!=='personal_topic_manual_promotion'||row.version!==1||row.stateKey!==1||!['confirmed','staging','ready'].includes(row.state)||!revisionOK(row.revision)||!revisionOK(row.offset)||!Array.isArray(row.confirmed?.plan?.entryIds)||!row.confirmed.plan.entryIds.length||new Set(row.confirmed.plan.entryIds).size!==row.confirmed.plan.entryIds.length||row.offset>row.confirmed.plan.entryIds.length||!same(row.sourceRecordIds,row.confirmed.sourceRecordIds)||!same(row.inputIds,row.confirmed.scope.map(s=>s.inputId)))fail();
  this.request(row.confirmed.request);if(row.id!==MANUAL_PROMOTION_PREFIX+row.confirmed.request.operationId||row.confirmed.plan.name!==row.confirmed.request.name||row.confirmed.expiresAt-row.confirmed.at!==PROMOTION_LIMITS.lifetimeMs)fail();
 }
 async resume(id){
  if(!workIdOK(id))fail();await this.store.finishFoundation();const row=await this.store.run(()=>this.store.repository.transaction(false,t=>t.get(TABLE,id)));if(!row)fail();this.validate(row);const authority=await this.store.run(()=>this.store.repository.transaction(false,t=>this.authority(t))),c=row.confirmed;
  if(!same(publicAuthority(authority),c.authority)||c.expiresAt<=Date.parse(this.store.clock())||row.signature!==await keyedHash(authority.secret,['confirmed-user-section-promotion-v1',c]))fail();const snapshot=await this.collect(c.request,authority);if(await hashText(JSON.stringify(snapshot))!==c.snapshotDigest||!same(snapshot.placements.map(p=>p.entryId),c.plan.entryIds))fail();return {row,authority,snapshot};
 }
 async check(t,{row,authority,snapshot}){await this.checkAuthority(t,authority);if(!same(row,await t.get(TABLE,row.id))||row.confirmed.expiresAt<=Date.parse(this.store.clock()))fail();await this.checkSnapshot(t,row.confirmed.request,snapshot);}
 async stage(id,{limit=100}={}){
  if(!Number.isSafeInteger(limit)||limit<1||limit>100)fail();const state=await this.resume(id),{row,snapshot}=state,c=row.confirmed;
  return this.store.foundationWrite(async t=>{await this.check(t,state);if(row.state==='ready')return {workId:id,state:'ready',staged:row.offset,total:c.plan.entryIds.length};const end=Math.min(row.offset+limit,c.plan.entryIds.length),placements=new Map(snapshot.placements.map(p=>[p.entryId,p])),organizations=new Map(snapshot.organizations.map(e=>[e.entryId,e]));for(let index=row.offset;index<end;index++){const entryId=c.plan.entryIds[index];await t.put(TABLE,{id:itemId(id,index),kind:'personal_topic_manual_promotion_placement',version:1,stateKey:1,parentId:id,index,entryId,placement:placements.get(entryId),organization:organizations.get(entryId),sourceRecordIds:c.sourceRecordIds,inputIds:c.scope.map(s=>s.inputId)});}row.offset=end;row.revision++;row.state=end===c.plan.entryIds.length?'ready':'staging';await t.put(TABLE,row);return {workId:id,state:row.state,staged:end,total:c.plan.entryIds.length,revision:row.revision};});
 }
 async rollback(id){
  if(!workIdOK(id))fail();return this.store.foundationWrite(async t=>{const row=await t.get(TABLE,id);if(!row)return await t.get('operationReceipts',id.slice(MANUAL_PROMOTION_PREFIX.length))?{cancelled:false,committed:true}:{cancelled:true};this.validate(row);for(let i=0;i<row.confirmed.plan.entryIds.length;i++)await t.delete(TABLE,itemId(id,i));await t.delete(TABLE,id);return {cancelled:true};});
 }
 async result(operationId){
  if(!idOK(operationId))fail();await this.store.finishFoundation();return this.store.run(()=>this.store.repository.transaction(false,async t=>{const receipt=await t.get('operationReceipts',operationId);if(!receipt)return null;const r=receipt.result;if(r?.kind!=='personal_topic_promotion'||r.intentMode!=='user_structural'||r.operationId!==operationId)fail();await this.authority(t);for(const m of r.mappings){const history=await t.get('revisions',m.targetRevisionId);if(!history||!await this.store.sourcePresent(t,history.sourceRecordIds))fail();}return r;}));
 }
 async activate(id){
  if(!workIdOK(id))fail();const prior=await this.result(id.slice(MANUAL_PROMOTION_PREFIX.length));if(prior)return prior;const state=await this.resume(id),{row,snapshot,authority}=state,c=row.confirmed;if(row.state!=='ready'||row.offset!==c.plan.entryIds.length)fail();const request={kind:'confirmed-user-section-promotion',...c.request,confirmation:row.signature},digest=await hashText(JSON.stringify(request));
  return this.store.foundationWrite(async t=>{
   const replay=await t.get('operationReceipts',c.request.operationId);if(replay){if(replay.digest!==digest)fail();await this.checkAuthority(t,authority,{generation:false});return replay.result;}await this.check(t,state);
   const placements=new Map(snapshot.placements.map(p=>[p.entryId,p])),organizations=new Map(snapshot.organizations.map(e=>[e.entryId,e]));for(let index=0;index<c.plan.entryIds.length;index++){const staged=await t.get(TABLE,itemId(id,index)),entryId=c.plan.entryIds[index];if(!staged||staged.kind!=='personal_topic_manual_promotion_placement'||staged.parentId!==id||staged.index!==index||staged.entryId!==entryId||!same(staged.placement,placements.get(entryId))||!same(staged.organization,organizations.get(entryId)))fail();}
   return applyConfirmedPromotion(this.store,t,{snapshot,confirmed:c,request,digest,id,itemId,origin:'user',scope:c.scope,authorizeTarget:async()=>this.checkAuthority(t,authority)});
  });
 }
}
