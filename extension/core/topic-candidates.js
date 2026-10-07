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

// Disposable internal work, not a Topic or saved presentation suggestion. No
// Topic ID, name, summary, excerpt, body, job, grant or user-facing count exists.
// Existing Source cleanup deletes this table bySource; replace restore clears
// it. Omitting jobId deliberately keeps these rows out of runnable work indexes.
export class HiddenTopicCandidates {
 constructor(store,options={}){this.store=store;this.retrieval=new TopicIdentityRetrieval(store,options);}
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
 async record(request){
  keys(request,['scope','names','coverage','candidateId','expectedRevision','relatedTopicIds','boundaryKey'],['scope','coverage']);
  const {candidateId=null,expectedRevision=null,relatedTopicIds=[],boundaryKey=null}=request;
  if(boundaryKey!==null&&!tokenOK(boundaryKey))fail();
  if(candidateId!==null&&!candidateIdOK(candidateId)||expectedRevision!==null&&!revisionOK(expectedRevision)||!Array.isArray(relatedTopicIds)||relatedTopicIds.length>20||relatedTopicIds.some(x=>!idOK(x)))fail();
  const prepared=await this.retrieval.prepareCoverage(request),keyToken=await this.keyToken(prepared);
  // One Input can contain several independent tentative boundaries. The future
  // decision service supplies an opaque key; neither name nor evidence overlap
  // is semantic identity proof. With no key this is just an unresolved bundle.
  const boundaryToken=await keyedHash(prepared.authority.secret,['topic-candidate-boundary-v1',boundaryKey]);
  const id=candidateId||TOPIC_CANDIDATE_PREFIX+await keyedHash(prepared.authority.secret,boundaryKey!==null?['topic-candidate-boundary-work-v1',boundaryToken]:['topic-candidate-evidence-v1',boundaryToken,prepared.evidence.map(e=>[e.inputId,e.scopeToken]).sort((a,b)=>a[0].localeCompare(b[0]))]);
  const snapshot=await this.store.run(()=>this.store.repository.transaction(false,t=>t.get(TABLE,id)));if(snapshot)this.validate(snapshot);
  const nameTokens=unique([...(snapshot?.nameTokens||[]),...prepared.nameTokens]),related=unique([...(snapshot?.relatedTopicIds||[]),...relatedTopicIds]);
  const proof=await this.retrieval.constraintProof(prepared,{nameTokens,relatedTopicIds:related});
  return this.store.foundationWrite(async t=>{
   await this.retrieval.guard.check(t,prepared);const old=await t.get(TABLE,id);
   if(!same(old,snapshot))return {conflict:true};
   if(old){if(old.revision!==expectedRevision)return {conflict:true};if(boundaryKey!==null&&old.boundaryToken!==boundaryToken||!this.current(old,prepared,keyToken))fail();}
   else if(candidateId!==null||expectedRevision!==null)return {conflict:true};
   if(!await this.retrieval.checkConstraintProof(t,prepared,proof))return {deferred:true,reason:'identity_constraint'};
   const at=Date.parse(this.store.clock()),row={id,kind:'personal_topic_candidate',version:1,state:'candidate',stateKey:1,revision:(old?.revision??-1)+1,evidence:prepared.evidence.map(reference),inputIds:prepared.evidence.map(e=>e.inputId),sourceRecordIds:unique(prepared.evidence.flatMap(e=>e.sourceRecordIds)),nameTokens,relatedTopicIds:related,authority:publicTopicAuthority(prepared.authority),keyToken,boundaryToken:old?.boundaryToken??boundaryToken,createdAt:old?.createdAt??at,expiresAt:old?.expiresAt??at+TOPIC_CANDIDATE_POLICY.lifetimeMs};
   this.validate(row);await t.put(TABLE,row);return result(row);
  });
 }
 async consolidate(request){
  keys(request,['scope','names','coverage','targetId','sourceId','expectedTargetRevision','expectedSourceRevision'],['scope','coverage','targetId','sourceId','expectedTargetRevision','expectedSourceRevision']);
  if(!candidateIdOK(request.targetId)||!candidateIdOK(request.sourceId)||request.targetId===request.sourceId||!revisionOK(request.expectedTargetRevision)||!revisionOK(request.expectedSourceRevision))fail();
  const prepared=await this.retrieval.prepareCoverage(request),keyToken=await this.keyToken(prepared);
  const snapshots=await this.store.run(()=>this.store.repository.transaction(false,async t=>[await t.get(TABLE,request.targetId),await t.get(TABLE,request.sourceId)]));
  if(snapshots.some(row=>!row))return {conflict:true};for(const row of snapshots)this.validate(row);
  const nameTokens=unique([...snapshots[0].nameTokens,...snapshots[1].nameTokens,...prepared.nameTokens]),relatedTopicIds=unique([...snapshots[0].relatedTopicIds,...snapshots[1].relatedTopicIds]);
  const proof=await this.retrieval.constraintProof(prepared,{nameTokens,relatedTopicIds});
  return this.store.foundationWrite(async t=>{
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
  if(!candidateIdOK(id))fail();await this.store.finishFoundation();
  const old=await this.store.run(()=>this.store.repository.transaction(false,t=>t.get(TABLE,id)));if(!old)return null;this.validate(old);
  let prepared;try{prepared=await this.retrieval.guard.prepare(scopeFor(old.evidence));}catch(error){if(error?.code==='INVALID_REQUEST')return null;throw error;}
  const keyToken=await this.keyToken(prepared);
  try{if(!this.current(old,prepared,keyToken))return null;const proof=await this.retrieval.constraintProof(prepared,{nameTokens:old.nameTokens,relatedTopicIds:old.relatedTopicIds});return await this.store.run(()=>this.store.repository.transaction(false,async t=>{await this.retrieval.guard.check(t,prepared);const row=await t.get(TABLE,id);if(!row||!same(row,old)||!this.current(row,prepared,keyToken)||!await this.retrieval.checkConstraintProof(t,prepared,proof))return null;return row;}));}catch(error){if(error?.code==='INVALID_REQUEST')return null;throw error;}
 }
 async lookupBoundary({scope,boundaryKey}){
  if(!tokenOK(boundaryKey))fail();const prepared=await this.retrieval.guard.prepare(scope),boundaryToken=await keyedHash(prepared.authority.secret,['topic-candidate-boundary-v1',boundaryKey]);
  const id=TOPIC_CANDIDATE_PREFIX+await keyedHash(prepared.authority.secret,['topic-candidate-boundary-work-v1',boundaryToken]),row=await this.read(id);
  await this.store.run(()=>this.store.repository.transaction(false,t=>this.retrieval.guard.check(t,prepared)));return row;
 }
 async discard({candidateId,expectedRevision}){
  if(!candidateIdOK(candidateId)||!revisionOK(expectedRevision))fail();
  return this.store.foundationWrite(async t=>{const row=await t.get(TABLE,candidateId);if(!row)return {discarded:true};this.validate(row);if(row.revision!==expectedRevision)return {conflict:true};await t.delete(TABLE,candidateId);return {discarded:true};});
 }
 async maintain({cursor=null,limit=50}={}){
  if(!Number.isInteger(limit)||limit<1||limit>100||cursor!==null&&!candidateIdOK(cursor))fail();await this.store.finishFoundation();
  const page=await this.store.run(()=>this.store.repository.transaction(false,t=>t.primaryRangePage(TABLE,{prefix:TOPIC_CANDIDATE_PREFIX,after:cursor,limit})));
  let discarded=0;for(const {value:row}of page.rows){if(!await this.read(row.id)){const outcome=await this.discard({candidateId:row.id,expectedRevision:row.revision});if(outcome.discarded)discarded++;}}
  return {visited:page.rows.length,discarded,nextCursor:page.next,complete:!page.next};
 }
}
