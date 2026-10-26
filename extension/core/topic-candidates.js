import {fail,keys,idOK,keyedHash,revisionOK,same} from './thought-model.js';
import {TopicIdentityRetrieval} from './topic-retrieval.js';
import {publicTopicAuthority} from './topic-processing.js';

export const TOPIC_CANDIDATE_PREFIX='personal-topic-candidate:';
export const TOPIC_CANDIDATE_POLICY=Object.freeze({version:1,maxEvidence:100,maxNames:8,maxRelatedTopics:20,lifetimeMs:30*24*60*60*1000});
const TABLE='organizerWorkItems',tokenOK=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const candidateIdOK=id=>typeof id==='string'&&id.startsWith(TOPIC_CANDIDATE_PREFIX)&&tokenOK(id.slice(TOPIC_CANDIDATE_PREFIX.length));
const scopeFor=evidence=>evidence.map(e=>({inputId:e.inputId,role:e.role,selectedFields:e.selectedFields}));
const evidenceKey=e=>JSON.stringify([e.inputId,e.role,e.selectedFields]);
const reference=e=>Object.fromEntries(['inputId','role','selectedFields','basedOnContentRevision','fieldDigests','scopeToken','versionToken','epoch','sourceRecordIds','sourceIdentityTokens'].map(k=>[k,structuredClone(e[k])]));
const sameEvidence=(a,b)=>same([...a].sort((a,b)=>evidenceKey(a).localeCompare(evidenceKey(b))),[...b].sort((a,b)=>evidenceKey(a).localeCompare(evidenceKey(b))));
const unique=values=>[...new Set(values)];
const result=row=>({candidateId:row.id,revision:row.revision,evidenceCount:row.evidence.length});
// Original-owner capabilities cross instances only within the same live Store
// and database. A selected body-free row is not a processing permission.
const selections=new WeakMap();
function selection(owner,token,{qualified=false}={}){
 const held=selections.get(token),now=Date.parse(owner.store.clock());
 if(!held||held.released||held.parent?.released||held.store!==owner.store||held.database!==owner.store.repository.db||!Number.isFinite(now)||held.snapshot.expiresAt<=now||qualified&&!held.prepared)fail();
 if(qualified&&owner.retrieval.guard.qualification()!==held.qualification)fail();
 return held;
}

// Disposable internal work, not a Topic or saved presentation suggestion. No
// Topic ID, name, summary, excerpt, body, job, grant or user-facing count exists.
// Existing Source cleanup deletes this table bySource; replace restore clears
// it. Omitting jobId deliberately keeps these rows out of runnable work indexes.
// Metadata admission never clones unknown nested properties or evaluates an
// accessor. Existing row validation still runs on this explicit projection.
const candidateFields=['id','kind','version','state','stateKey','revision','evidence','inputIds','sourceRecordIds','nameTokens','relatedTopicIds','authority','keyToken','boundaryToken','createdAt','expiresAt'];
const evidenceFields=['inputId','role','selectedFields','basedOnContentRevision','fieldDigests','scopeToken','versionToken','epoch','sourceRecordIds','sourceIdentityTokens'];
const authorityFields=['processingEpoch','gateEpoch','thoughtEpoch','generation','restoreEpoch'];
const metadataOwn=(row,key)=>{const d=Object.getOwnPropertyDescriptor(row||{},key);if(!d||!Object.hasOwn(d,'value'))fail();return d.value;};
const metadataScalar=value=>{if(value!==null&&!['string','number','boolean'].includes(typeof value))fail();return value;};
const metadataArray=(value,project=metadataScalar)=>{if(!Array.isArray(value))fail();const length=metadataOwn(value,'length');if(!Number.isSafeInteger(length)||length<0||length>1000)fail();return Array.from({length},(_,i)=>project(metadataOwn(value,String(i))));};
function candidateMetadata(row){
 keys(row,candidateFields,candidateFields);
 const evidence=e=>{keys(e,evidenceFields,evidenceFields);const fields=metadataArray(metadataOwn(e,'selectedFields'));const digests=metadataOwn(e,'fieldDigests');keys(digests,fields,fields);return Object.fromEntries(evidenceFields.map(k=>[k,k==='selectedFields'?fields:k==='fieldDigests'?Object.fromEntries(fields.map(f=>[f,metadataScalar(metadataOwn(digests,f))])):['sourceRecordIds','sourceIdentityTokens'].includes(k)?metadataArray(metadataOwn(e,k)):metadataScalar(metadataOwn(e,k))]));};
 return Object.fromEntries(candidateFields.map(k=>[k,k==='evidence'?metadataArray(metadataOwn(row,k),evidence):k==='authority'?(()=>{const value=metadataOwn(row,k);keys(value,authorityFields,authorityFields);return Object.fromEntries(authorityFields.map(f=>[f,metadataScalar(metadataOwn(value,f))]));})():['inputIds','sourceRecordIds','nameTokens','relatedTopicIds'].includes(k)?metadataArray(metadataOwn(row,k)):metadataScalar(metadataOwn(row,k))]));
}

export function sameTopicCandidateMetadata(actual,expected){if(actual==null||expected==null)return actual==null&&expected==null;return same(candidateMetadata(actual),candidateMetadata(expected));}

export class HiddenTopicCandidates {
 #recordPlans=new WeakMap();
 #consumePlans=new WeakMap();
 constructor(store,options={}){this.store=store;this.retrieval=new TopicIdentityRetrieval(store,options);}
 async selectPageInTransaction(t,{cursor=null,limit=50,maxEvidence=100,maxSources=1000,maxBytes=this.store.organizerBudget.limits.maxRequestBytes}={}){
  if(t?.tx?.db!==this.store.repository.db||!Number.isInteger(limit)||limit<1||limit>100||cursor!==null&&!candidateIdOK(cursor)||!Number.isSafeInteger(maxEvidence)||maxEvidence<1||maxEvidence>100||!Number.isSafeInteger(maxSources)||maxSources<1||maxSources>1000||!Number.isSafeInteger(maxBytes)||maxBytes<0)fail();
  const page=await t.primaryRangePage(TABLE,{prefix:TOPIC_CANDIDATE_PREFIX,after:cursor,limit}),items=[];let omitted=0,retainedBytes=0;
  const now=Date.parse(this.store.clock());if(!Number.isFinite(now))fail();
  for(const {value}of page.rows){const row=candidateMetadata(value);this.validate(row);if(row.expiresAt<=now)continue;
   if(row.evidence.length>maxEvidence||row.sourceRecordIds.length>maxSources||row.evidence.some(e=>e.sourceRecordIds.length>maxSources||e.sourceIdentityTokens.length>maxSources)){omitted++;continue;}
   const size=new TextEncoder().encode(JSON.stringify(row)).length;if(retainedBytes+size>maxBytes){omitted++;continue;}retainedBytes+=size;
   const token=Object.freeze({});selections.set(token,{store:this.store,database:this.store.repository.db,snapshot:structuredClone(row),released:false,prepared:null});items.push(token);
  }
  return {items,visited:page.rows.length,omitted,retainedBytes,nextCursor:page.next,complete:!page.next};
 }
 selectionMetadata(token){return structuredClone(selection(this,token).snapshot);}
 qualifiedEvidence(token){return structuredClone(selection(this,token,{qualified:true}).prepared.evidence);}
 async assertSelectionInTransaction(t,token){
  const held=selection(this,token);if(t?.tx?.db!==held.database||!sameTopicCandidateMetadata(await t.get(TABLE,held.snapshot.id),held.snapshot))fail();
  selection(this,token);return true;
 }
 async qualifySelection(token,{scope}={}){
  const held=selection(this,token);
  // The optional original direct APIs remain compatible. This new cross-window
  // seam, however, always requires the original independently granted reader.
  const qualification=this.retrieval.guard.qualification();if(qualification===null)fail();
  await this.retrieval.guard.run(()=>this.store.repository.transaction(false,t=>this.assertSelectionInTransaction(t,token)));
  const prepared=await this.retrieval.guard.prepare(scope),keyToken=await this.keyToken(prepared);
  if(!this.current(held.snapshot,prepared,keyToken))fail();
  const proof=await this.retrieval.constraintProof(prepared,{nameTokens:held.snapshot.nameTokens,relatedTopicIds:held.snapshot.relatedTopicIds});if(proof.blocked)fail();
  await this.retrieval.guard.run(()=>this.store.repository.transaction(false,async t=>{await this.assertSelectionInTransaction(t,token);await this.retrieval.guard.check(t,prepared);if(!await this.retrieval.checkConstraintProof(t,prepared,proof))fail();}));
  if(this.retrieval.guard.qualification()!==qualification)fail();
  const qualified=Object.freeze({});selections.set(qualified,{...held,prepared,keyToken,proof,qualification,parent:held});return qualified;
 }
 async assertQualifiedSelectionInTransaction(t,token){
  const held=selection(this,token,{qualified:true});if(this.retrieval.guard.qualification()===null)fail();
  await this.assertSelectionInTransaction(t,token);await this.retrieval.guard.check(t,held.prepared);
  if(!await this.retrieval.checkConstraintProof(t,held.prepared,held.proof))fail();selection(this,token,{qualified:true});return true;
 }
 releaseSelection(token){const held=selections.get(token);if(!held)return;held.released=true;selections.delete(token);}
 async keyToken(prepared){return keyedHash(prepared.authority.secret,['topic-candidate-key-v1']);}
 validate(row){
  keys(row,['id','kind','version','state','stateKey','revision','evidence','inputIds','sourceRecordIds','nameTokens','relatedTopicIds','authority','keyToken','boundaryToken','createdAt','expiresAt'],['id','kind','version','state','stateKey','revision','evidence','inputIds','sourceRecordIds','nameTokens','relatedTopicIds','authority','keyToken','boundaryToken','createdAt','expiresAt']);
  if(!tokenOK(row.boundaryToken))fail();
  if(!candidateIdOK(row.id)||row.kind!=='personal_topic_candidate'||row.version!==1||row.state!=='candidate'||row.stateKey!==1||!revisionOK(row.revision)||!tokenOK(row.keyToken)||!Array.isArray(row.evidence)||!row.evidence.length||row.evidence.length>100||!Array.isArray(row.nameTokens)||row.nameTokens.length>8||row.nameTokens.some(x=>!tokenOK(x))||!Array.isArray(row.relatedTopicIds)||row.relatedTopicIds.length>20||row.relatedTopicIds.some(x=>!idOK(x))||!Number.isFinite(row.createdAt)||!Number.isFinite(row.expiresAt)||row.expiresAt<=row.createdAt||row.expiresAt-row.createdAt>TOPIC_CANDIDATE_POLICY.lifetimeMs)fail();
  keys(row.authority,['processingEpoch','gateEpoch','thoughtEpoch','generation','restoreEpoch'],['processingEpoch','gateEpoch','thoughtEpoch','generation','restoreEpoch']);
  if(!idOK(row.authority.processingEpoch)||!['gateEpoch','thoughtEpoch','generation'].every(k=>revisionOK(row.authority[k]))||row.authority.restoreEpoch!==null&&!idOK(row.authority.restoreEpoch))fail();
  for(const e of row.evidence){
   keys(e,['inputId','role','selectedFields','basedOnContentRevision','fieldDigests','scopeToken','versionToken','epoch','sourceRecordIds','sourceIdentityTokens'],['inputId','role','selectedFields','basedOnContentRevision','fieldDigests','scopeToken','versionToken','epoch','sourceRecordIds','sourceIdentityTokens']);
   if(!idOK(e.inputId)||!['primary','supporting'].includes(e.role)||!revisionOK(e.basedOnContentRevision)||!revisionOK(e.epoch)||!tokenOK(e.scopeToken)||!tokenOK(e.versionToken)||!Array.isArray(e.selectedFields)||!e.selectedFields.length||e.selectedFields.length>2||new Set(e.selectedFields).size!==e.selectedFields.length||e.selectedFields.some(x=>!['body','note'].includes(x))||!Array.isArray(e.sourceRecordIds)||e.sourceRecordIds.length>1000||e.sourceRecordIds.some(x=>!idOK(x))||!Array.isArray(e.sourceIdentityTokens)||e.sourceIdentityTokens.length>1000||e.sourceIdentityTokens.some(x=>typeof x!=='string'||!x.length||x.length>512))fail();
   keys(e.fieldDigests,e.selectedFields,e.selectedFields);if(Object.values(e.fieldDigests).some(x=>!tokenOK(x)))fail();
  }
  if(new Set(row.inputIds).size!==row.evidence.length)fail();
  if(!same(row.inputIds,row.evidence.map(e=>e.inputId))||!same(row.sourceRecordIds,unique(row.evidence.flatMap(e=>e.sourceRecordIds))))fail();
 }
 current(row,prepared,keyToken){
  this.validate(row);
  if(row.expiresAt<=Date.parse(this.store.clock())||row.keyToken!==keyToken)return false;
  for(const key of ['processingEpoch','gateEpoch','thoughtEpoch','restoreEpoch'])if(row.authority[key]!==prepared.authority[key])return false;
  const current=new Map(prepared.evidence.map(e=>[e.inputId,reference(e)]));
  if(row.evidence.some(e=>!same(e,current.get(e.inputId))))return false;
  return true;
 }
 async record(request){const prepared=await this.prepareRecord(request);return this.retrieval.guard.write(t=>this.recordPreparedInTransaction(t,prepared));}
 async prepareRecord(request,{candidate=null}={}){
  keys(request,['scope','names','coverage','candidateId','expectedRevision','relatedTopicIds','boundaryKey'],['scope','coverage']);
  const selected=candidate===null?null:selection(this,candidate,{qualified:true});
  if(selected){if(request.boundaryKey!=null||request.candidateId!==undefined&&request.candidateId!==selected.snapshot.id||request.expectedRevision!==undefined&&request.expectedRevision!==selected.snapshot.revision)fail();request={...request,candidateId:selected.snapshot.id,expectedRevision:selected.snapshot.revision};}
  const {candidateId=null,expectedRevision=null,relatedTopicIds=[],boundaryKey=null}=request;
  if(boundaryKey!==null&&!tokenOK(boundaryKey))fail();
  if(candidateId!==null&&!candidateIdOK(candidateId)||expectedRevision!==null&&!revisionOK(expectedRevision)||!Array.isArray(relatedTopicIds)||relatedTopicIds.length>20||relatedTopicIds.some(x=>!idOK(x)))fail();
  const prepared=await this.retrieval.prepareCoverage(request),keyToken=await this.keyToken(prepared);
  // One Input can contain several independent tentative boundaries. The future
  // decision service supplies an opaque key; neither name nor evidence overlap
  // is semantic identity proof. With no key this is just an unresolved bundle.
  const boundaryToken=selected?selected.snapshot.boundaryToken:await keyedHash(prepared.authority.secret,['topic-candidate-boundary-v1',boundaryKey]);
  const id=candidateId||TOPIC_CANDIDATE_PREFIX+await keyedHash(prepared.authority.secret,boundaryKey!==null?['topic-candidate-boundary-work-v1',boundaryToken]:['topic-candidate-evidence-v1',boundaryToken,prepared.evidence.map(e=>[e.inputId,e.scopeToken]).sort((a,b)=>a[0].localeCompare(b[0]))]);
  const rawSnapshot=await this.retrieval.guard.run(()=>this.store.repository.transaction(false,t=>t.get(TABLE,id))),snapshot=rawSnapshot?candidateMetadata(rawSnapshot):rawSnapshot;if(snapshot)this.validate(snapshot);
  if(selected&&(!same(snapshot,selected.snapshot)||!this.current(snapshot,prepared,keyToken)))fail();
  const nameTokens=unique([...(snapshot?.nameTokens||[]),...prepared.nameTokens]),related=unique([...(snapshot?.relatedTopicIds||[]),...relatedTopicIds]);
  const proof=await this.retrieval.constraintProof(prepared,{nameTokens,relatedTopicIds:related});
  const handle=Object.freeze({});this.#recordPlans.set(handle,{prepared,keyToken,boundaryToken,id,snapshot,nameTokens,related,proof,candidateId,expectedRevision,boundaryKey,selection:candidate});return handle;
 }
 async recordPreparedInTransaction(t,handle){
  const plan=this.#recordPlans.get(handle);if(!plan||t?.tx?.db!==this.store.repository.db||t.tx.mode!=='readwrite')fail();
  if(plan.selection!==null)selection(this,plan.selection,{qualified:true});
  const {prepared,keyToken,boundaryToken,id,snapshot,nameTokens,related,proof,candidateId,expectedRevision,boundaryKey}=plan;
  await this.retrieval.guard.check(t,prepared);const rawOld=await t.get(TABLE,id),old=rawOld?candidateMetadata(rawOld):rawOld;
  if(!same(old,snapshot))return {conflict:true};
  if(old){if(old.revision!==expectedRevision)return {conflict:true};if(boundaryKey!==null&&old.boundaryToken!==boundaryToken||!this.current(old,prepared,keyToken))fail();}
  else if(candidateId!==null||expectedRevision!==null)return {conflict:true};
  if(!await this.retrieval.checkConstraintProof(t,prepared,proof))return {deferred:true,reason:'identity_constraint'};
  const at=Date.parse(this.store.clock()),row={id,kind:'personal_topic_candidate',version:1,state:'candidate',stateKey:1,revision:(old?.revision??-1)+1,evidence:prepared.evidence.map(reference),inputIds:prepared.evidence.map(e=>e.inputId),sourceRecordIds:unique(prepared.evidence.flatMap(e=>e.sourceRecordIds)),nameTokens,relatedTopicIds:related,authority:publicTopicAuthority(prepared.authority),keyToken,boundaryToken:old?.boundaryToken??boundaryToken,createdAt:old?.createdAt??at,expiresAt:old?.expiresAt??at+TOPIC_CANDIDATE_POLICY.lifetimeMs};
  this.validate(row);if(plan.selection!==null)selection(this,plan.selection,{qualified:true});await t.put(TABLE,row);if(plan.selection!==null)selection(this,plan.selection,{qualified:true});return result(row);
 }

 async consolidate(request){
  keys(request,['scope','names','coverage','targetId','sourceId','expectedTargetRevision','expectedSourceRevision'],['scope','coverage','targetId','sourceId','expectedTargetRevision','expectedSourceRevision']);
  if(!candidateIdOK(request.targetId)||!candidateIdOK(request.sourceId)||request.targetId===request.sourceId||!revisionOK(request.expectedTargetRevision)||!revisionOK(request.expectedSourceRevision))fail();
  const prepared=await this.retrieval.prepareCoverage(request),keyToken=await this.keyToken(prepared);
  const snapshots=await this.retrieval.guard.run(()=>this.store.repository.transaction(false,async t=>[await t.get(TABLE,request.targetId),await t.get(TABLE,request.sourceId)]));
  if(snapshots.some(row=>!row))return {conflict:true};for(const row of snapshots)this.validate(row);
  const nameTokens=unique([...snapshots[0].nameTokens,...snapshots[1].nameTokens,...prepared.nameTokens]),relatedTopicIds=unique([...snapshots[0].relatedTopicIds,...snapshots[1].relatedTopicIds]);
  const proof=await this.retrieval.constraintProof(prepared,{nameTokens,relatedTopicIds});
  return this.retrieval.guard.write(async t=>{
   await this.retrieval.guard.check(t,prepared);const a=await t.get(TABLE,request.targetId),b=await t.get(TABLE,request.sourceId);
   if(!a||!b||!same([a,b],snapshots)||a.revision!==request.expectedTargetRevision||b.revision!==request.expectedSourceRevision)return {conflict:true};
   if(!this.current(a,prepared,keyToken)||!this.current(b,prepared,keyToken))fail();
   const union=[...new Map([...a.evidence,...b.evidence].map(e=>[e.inputId,e])).values()];if(!sameEvidence(union,prepared.evidence.map(reference)))fail();
   if(!await this.retrieval.checkConstraintProof(t,prepared,proof))return {deferred:true,reason:'identity_constraint'};
   const row={...a,revision:a.revision+1,evidence:prepared.evidence.map(reference),inputIds:prepared.evidence.map(e=>e.inputId),sourceRecordIds:unique(prepared.evidence.flatMap(e=>e.sourceRecordIds)),nameTokens,relatedTopicIds,authority:publicTopicAuthority(prepared.authority),createdAt:Math.min(a.createdAt,b.createdAt),expiresAt:Math.min(a.expiresAt,b.expiresAt)};
   this.validate(row);await t.put(TABLE,row);await t.delete(TABLE,b.id);return result(row);
  });
 }
 async read(id){
  if(!candidateIdOK(id))fail();await this.store.finishFoundation({recoveryWork:this.retrieval.guard.recoveryWork()});
  const old=await this.retrieval.guard.run(()=>this.store.repository.transaction(false,t=>t.get(TABLE,id)));if(!old)return null;this.validate(old);
  let prepared;try{prepared=await this.retrieval.guard.prepare(scopeFor(old.evidence));}catch(error){if(error?.code==='INVALID_REQUEST')return null;throw error;}
  const keyToken=await this.keyToken(prepared);
  try{if(!this.current(old,prepared,keyToken))return null;const proof=await this.retrieval.constraintProof(prepared,{nameTokens:old.nameTokens,relatedTopicIds:old.relatedTopicIds});return await this.retrieval.guard.run(()=>this.store.repository.transaction(false,async t=>{await this.retrieval.guard.check(t,prepared);const row=await t.get(TABLE,id);if(!row||!same(row,old)||!this.current(row,prepared,keyToken)||!await this.retrieval.checkConstraintProof(t,prepared,proof))return null;return row;}));}catch(error){if(error?.code==='INVALID_REQUEST')return null;throw error;}
 }
 async lookupBoundary({scope,boundaryKey}){
  if(!tokenOK(boundaryKey))fail();const prepared=await this.retrieval.guard.prepare(scope),boundaryToken=await keyedHash(prepared.authority.secret,['topic-candidate-boundary-v1',boundaryKey]);
  const id=TOPIC_CANDIDATE_PREFIX+await keyedHash(prepared.authority.secret,['topic-candidate-boundary-work-v1',boundaryToken]),row=await this.read(id);
  await this.retrieval.guard.run(()=>this.store.repository.transaction(false,t=>this.retrieval.guard.check(t,prepared)));return row;
 }
 // Admission consumes a fully accounted-for evidence bundle, never identity
 // inferred from its opaque key. Prepared handles are instance/store-bound.
 async prepareConsume({candidateId,expectedRevision,scope,boundaryKey=null},{candidate=null}={}){
  if(!candidateIdOK(candidateId)||!revisionOK(expectedRevision)||boundaryKey!==null&&!tokenOK(boundaryKey))fail();
  const selected=candidate===null?null:selection(this,candidate,{qualified:true});
  if(selected&&(boundaryKey!==null||candidateId!==selected.snapshot.id||expectedRevision!==selected.snapshot.revision))fail();
  if(selected)await this.retrieval.guard.run(()=>this.store.repository.transaction(false,t=>this.assertSelectionInTransaction(t,candidate)));
  const snapshot=selected?structuredClone(selected.snapshot):await this.read(candidateId);if(!snapshot||snapshot.revision!==expectedRevision)fail();
  const prepared=await this.retrieval.guard.prepare(scope),keyToken=await this.keyToken(prepared),boundaryToken=selected?snapshot.boundaryToken:await keyedHash(prepared.authority.secret,['topic-candidate-boundary-v1',boundaryKey]);
  if(!this.current(snapshot,prepared,keyToken)||snapshot.boundaryToken!==boundaryToken)fail();
  const proof=await this.retrieval.constraintProof(prepared,{nameTokens:snapshot.nameTokens,relatedTopicIds:snapshot.relatedTopicIds});
  if(proof.blocked)fail();const handle=Object.freeze({});this.#consumePlans.set(handle,{snapshot,prepared,keyToken,proof,selection:candidate});return handle;
 }
 async consumePreparedInTransaction(t,handle){
  const plan=this.#consumePlans.get(handle);if(!plan||t?.tx?.db!==this.store.repository.db||t.tx.mode!=='readwrite')fail();
  if(plan.selection!==null)selection(this,plan.selection,{qualified:true});
  const {snapshot,prepared,keyToken,proof}=plan;await this.retrieval.guard.check(t,prepared);
  const rawRow=await t.get(TABLE,snapshot.id),row=rawRow?candidateMetadata(rawRow):rawRow;if(!same(row,snapshot)||!this.current(row,prepared,keyToken)||!await this.retrieval.checkConstraintProof(t,prepared,proof))fail();
  if(plan.selection!==null)selection(this,plan.selection,{qualified:true});await t.delete(TABLE,row.id);if(plan.selection!==null)selection(this,plan.selection,{qualified:true});return {consumed:true};
 }
 async discard({candidateId,expectedRevision}){
  if(!candidateIdOK(candidateId)||!revisionOK(expectedRevision))fail();
  return this.retrieval.guard.write(async t=>{const row=await t.get(TABLE,candidateId);if(!row)return {discarded:true};this.validate(row);if(row.revision!==expectedRevision)return {conflict:true};await t.delete(TABLE,candidateId);return {discarded:true};});
 }
 async maintain({cursor=null,limit=50}={}){
  if(!Number.isInteger(limit)||limit<1||limit>100||cursor!==null&&!candidateIdOK(cursor))fail();await this.store.finishFoundation({recoveryWork:this.retrieval.guard.recoveryWork()});
  const page=await this.retrieval.guard.run(()=>this.store.repository.transaction(false,t=>t.primaryRangePage(TABLE,{prefix:TOPIC_CANDIDATE_PREFIX,after:cursor,limit})));
  let discarded=0;for(const {value:row}of page.rows){if(!await this.read(row.id)){const outcome=await this.discard({candidateId:row.id,expectedRevision:row.revision});if(outcome.discarded)discarded++;}}
  return {visited:page.rows.length,discarded,nextCursor:page.next,complete:!page.next};
 }
}
