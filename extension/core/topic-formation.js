import {prepareOriginalFormationSync,beginOriginalFormationSync,finishOriginalFormationSync,completeOriginalFormationSync,releaseOriginalFormationSync} from './browser-native-sync/topic-formation-journal.js';
import {readAuthoredTopicReconciliation,evaluateAuthoredTopicReconciliation} from './topic-authored-reconciliation.js';
import {readAuthoredEntryContext as readAuthoredEntryContextForTopic} from './context-authored-entry.js';
import {chargeMaintenanceQualificationHash,maintenanceQualificationWorkBudget,maintenanceQualificationReader,assertMaintenanceQualification,assertMaintenanceQualificationFacts,readMaintenanceTopicExactReuseQualification,releaseMaintenanceQualification} from './ai-usage/maintenance-qualification.js';
import {captureTopicExactReuseMetadata,topicExactReuseEntryMetadata} from './topic-exact-reuse-metadata.js';
import {contextScopeTransactionReader} from './context-topic-scope.js';
import {requireRepositoryTransactionScope} from './idb-repository.js';
import {checkEvidenceInTransaction} from './thought-evidence.js';
import {captureTopicFormationTerminal,registerTopicFormationTerminal,sameTopicWriteData,captureTopicFormationMembers,expectedTopicFormationMembers,assertTopicFormationMembers,topicFormationMemberOwner} from './topic-formation-terminal.js';
import {readMaintenanceTopicCandidateOperation,assertMaintenanceTopicCandidateOperation} from './ai-usage/maintenance-topic-candidates.js';
import {rootReadAuthority} from './organizer/root-read.js';
import {CONTEXT_LINEAGE_LIMITS} from './context-item-lineage.js';
import {fail,keys,idOK,prefix,same,keyedHash,protections,rankBetween} from './thought-model.js';
import {TopicIdentityRetrieval} from './topic-retrieval.js';
import {HiddenTopicCandidates,TOPIC_CANDIDATE_PREFIX} from './topic-candidates.js';
import {initializeTopicIdentity,registerTopicName,setTopicLifecycle,resolveTopicIdentity} from './topic-identity.js';
import {automaticMembershipAllowed} from './topic-intent.js';
import {journal,receipt,saveReceipt} from './thought-journal.js';
import {hashText} from './dedupe.js';
import {queueSearch} from './library-search.js';
import {readFormationEvidence,formationEntryDescriptor,readableFormationSection,validateFormationSources,FORMATION_WORK_LIMITS} from './topic-formation-evidence.js';
import {evaluateTopicFormation,formationParameters} from './topic-formation-policy.js';


// Only this original writer can mint publication capabilities. They contain
// bounded metadata write intents, never provider proposals or refreshed rows.
const originalFormationServices=new WeakMap(),formationSyncPlans=new WeakMap();
export function requireOriginalFormationService(service){const r=originalFormationServices.get(service);if(!r||!r.originalWriter||service.store!==r.store||service.store.repository!==r.repository)fail();for(const [name,method]of r.methods)if(Object.hasOwn(service,name)||TopicFormationService.prototype[name]!==method)fail();return r.store;}
export async function readOriginalFormationSyncPlan(service,cap){requireOriginalFormationService(service);const r=formationSyncPlans.get(cap);if(!r||r.service!==service||r.state.cancelled)fail();const s=r.state;assertActive(s.signal);if(s.prior)return {request:structuredClone(s.request),operation:structuredClone(s.operation),prior:structuredClone(s.prior)};if(s.authored||s.exactReuse||s.candidatePlan||s.consumePlan||s.candidateOperation||s.plan.outcome!=='reuse'||s.plan.newSection||s.entryPlans.length!==1||s.entryPlans.some(x=>x.item||x.entry.additional.length)||s.request.entryIds?.length!==1)fail();return service.read(s.prepared,async t=>{await service.authorizeTopics(t,s.prepared,[s.plan.topicId]);const topic=await resolveTopicIdentity(t,s.plan.topicId),entryId=s.entryPlans[0].entry.entryId,placement=await t.get('placements',JSON.stringify([topic.id,topic.activeLayoutGeneration,entryId]));if(topic.id!==s.plan.topicId||topic.lifecycle!=='dormant'||topic.protections?.lifecycle?.locked||!placement||placement.lifecycle!=='active'||(s.plan.selectedSection?.sectionId??topic.defaultSectionId)!==placement.sectionId)fail();return {request:structuredClone(s.request),operation:structuredClone(s.operation),topic:structuredClone(topic),entryId,sectionId:placement.sectionId,result:{...publicReport(s.plan),checks:{...s.plan.checks,humanIntent:!s.proof.blocked},decisionVersion:s.operation.decisionVersion,topicIds:[topic.id],entryIds:[entryId],createdEntryIds:[]},plan:{outcome:s.plan.outcome,topicId:s.plan.topicId,entryId,sectionId:placement.sectionId,decisionVersion:s.operation.decisionVersion,parameters:structuredClone(s.operation.parameters)}};});}
const publications=new WeakMap(),rootIds=['thought-sequence','thought-epoch','input-delta-sequence','revision-sequence','recovery-restore-epoch','backup-data-generation'];
const graphStores=new Set(['topics','sections','thoughts','placements','dependencies','provenance']);
const candidateIntent=(store,id,value)=>store==='organizerWorkItems'&&typeof id==='string'&&id.startsWith(TOPIC_CANDIDATE_PREFIX)&&(value===null||value?.kind==='personal_topic_candidate');
const entryMetadata=['id','revision','lifecycle','freshness','staleReasons','bodyBinding','workingInputId','bindingRevision','bindingLength','sourceRecordIds','inputRefs','provenanceType','integrity'];
export function readTopicFormationPublication(token,store,{transaction=null}={}){
 const p=publications.get(token);if(!p||p.store!==store||p.database!==store.repository.db||!p.frozen||(!p.committed&&transaction!==p.transaction))return null;
 return structuredClone({operationId:p.operationId,beforeAuthority:p.beforeAuthority,authority:p.committed?p.afterAuthority:p.stagedAuthority,writes:p.writes,members:p.members});
}

const exactReuseSelections=new WeakMap(),exactReuseMutations=new WeakMap(),nativeAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
const data=(x,k)=>{const d=Object.getOwnPropertyDescriptor(x||{},k);if(d&&!Object.hasOwn(d,'value'))fail();return d?.value;};
export function assertTopicExactReuseSelectionFacts(token,store,base){const h=exactReuseSelections.get(token);if(!h||h.released||h.store!==store||h.base!==base||data(store,'repository')!==h.repository||data(h.repository,'db')!==h.database||h.signal&&nativeAborted.call(h.signal))fail();assertMaintenanceQualificationFacts(base,store);return true;}
export function readTopicExactReuseSelection(token,store,base){assertTopicExactReuseSelectionFacts(token,store,base);assertMaintenanceQualification(base,store);assertTopicExactReuseSelectionFacts(token,store,base);return exactReuseSelections.get(token).view;}
export function releaseTopicExactReuseSelection(token){const h=exactReuseSelections.get(token);if(!h)return;h.released=true;h.clear?.();exactReuseSelections.delete(token);}
function exactMutation(token,store,t,qualification){
 const h=exactReuseMutations.get(token);if(!h||h.released||h.store!==store||h.qualification!==qualification||data(store,'repository')!==h.repository||data(h.repository,'db')!==h.database)fail();
 let cursor=t,found=false;for(let n=0;cursor&&n<24;n++,cursor=Object.getPrototypeOf(cursor)){if(cursor===h.transaction){found=true;break;}if(Object.hasOwn(cursor,'tx'))fail();}if(!found)fail();requireRepositoryTransactionScope(h.repository,h.transaction);assertMaintenanceQualificationFacts(qualification,store);return h;
}
export function readTopicExactReuseMutation(token,store,t,qualification){const h=exactMutation(token,store,t,qualification);return Object.freeze({rows:Object.freeze([...h.rows].map(([key,after])=>Object.freeze({key,before:h.before.get(key),after})))});}
export function assertTopicExactReuseOwnRow(token,store,t,qualification,row){const h=exactMutation(token,store,t,qualification),expected=h.rows.get(data(row,'id'));if(!expected||!sameTopicWriteData(row,expected))fail();return true;}

const unique=xs=>[...new Set(xs)];
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const assertActive=signal=>{if(signal?.aborted)fail();};
const publicReport=plan=>({outcome:plan.outcome,reason:plan.reason,policyVersion:plan.policyVersion,checks:{...plan.checks},lineage:{...plan.lineage}});

// Trusted, local domain seam only. No instance, semantic assessor, provider,
// worker command, network transport or background runner is installed here.
// A future admitted service must separately supply current processing authority
// and a trusted semantic mechanism. Citations/schema establish mechanics, never
// the truth or quality of the semantic judgments themselves.
export class TopicFormationService {
 #plans=new WeakMap();
 #materials=new WeakMap();
 #decision;
 #parameters;
 #writeTransaction;
 #baseQualification;#localQualification=null;#resolveExactReuse;#exactMutation=null;#busy=false;
 constructor(store,{resolveProcessing=null,decision=null,parameters=null,writeTransaction=null,resolveQualification=null,resolveExactReuse=null}={}){
  if(writeTransaction!==null&&typeof writeTransaction!=='function')fail();
  // Constructor-private delegation only; the original callback retains every
  // domain guard and can share its native transaction with exact facet ACK.
  this.#writeTransaction=writeTransaction??((fn,_fence,_publication,workLimit)=>store.foundationWrite(fn,workLimit??null));
  if(resolveExactReuse!==null&&typeof resolveExactReuse!=='function')fail();this.#resolveExactReuse=resolveExactReuse;this.#baseQualification=resolveQualification;const qualified=resolveQualification===null?null:()=>this.#localQualification??resolveQualification();
  this.store=store;this.retrieval=new TopicIdentityRetrieval(store,{resolveProcessing,resolveQualification:qualified,resolveOwnMutation:()=>this.#exactMutation});this.candidates=new HiddenTopicCandidates(store,{resolveProcessing,resolveQualification});
  if(decision!==null){keys(decision,['version','assess'],['version','assess']);if(typeof decision.assess!=='function'||typeof decision.version!=='string'||!/^[-a-zA-Z0-9_.]{1,80}$/.test(decision.version))fail();this.#decision=Object.freeze({...decision});}
  this.#parameters=parameters===null?null:formationParameters(parameters);originalFormationServices.set(this,{store,repository:store.repository,originalWriter:writeTransaction===null,methods:Object.getOwnPropertyNames(TopicFormationService.prototype).filter(k=>k!=='constructor').map(k=>[k,TopicFormationService.prototype[k]])});
 }
 async read(prepared,fn){return this.store.run(()=>this.store.repository.transaction(false,async t=>{const reader=this.retrieval.guard.reader(t);await this.retrieval.guard.check(reader,prepared);return fn(reader);}));}
 async authorizeTopics(t,prepared,ids){for(let i=0;i<ids.length;i+=100)if(await this.retrieval.guard.processing(t,prepared.evidence,ids.slice(i,i+100))!==prepared.authority.processingEpoch)fail();}
 // Local constructor-owned material seam. Opaque handles cannot mint
 // processing permission, a provider decision, or domain mutation authority.
 async #collectMaterial(scope,entryIds,signal){
  const identities=[],constraints=[];let cursor=null,last;
  do{assertActive(signal);last=await this.retrieval.page({scope:scope,cursor});for(const item of last.items)(item.kind==='identity'?identities:constraints).push(item);cursor=last.nextCursor;}while(cursor);
  const prepared=await this.retrieval.prepareCoverage({scope:scope,coverage:last.coverage}),topicIds=unique(identities.flatMap(x=>[x.id,x.canonicalId])),sections=[];
  const snapshot=await this.read(prepared,t=>readFormationEvidence(this.store,this.retrieval.guard.reader(t),prepared,entryIds));await validateFormationSources(snapshot,{store:this.store,qualification:this.retrieval.guard.qualification()});
  for(const topicId of unique(identities.filter(x=>x.available).map(x=>x.canonicalId))){
   let after=null;do{assertActive(signal);const page=await this.read(prepared,async t=>{await this.authorizeTopics(t,prepared,[topicId]);const topic=await resolveTopicIdentity(t,topicId);const page=await t.rangePage('sections','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]),after,100);for(const item of page.rows)item.value=await readableFormationSection(this.store,t,item.value);return page;});
    for(const {value:section}of page.rows)if(section.lifecycle==='active'&&!section.redirectTo)sections.push({id:section.id,topicId:section.topicId,sectionId:section.sectionId,title:section.title,isDefault:!!section.isDefault,lifecycle:section.lifecycle,revision:section.revision,layoutGeneration:section.layoutGeneration});after=page.next;
   }while(after);
  }
  const decisionInput=freeze(structuredClone({version:1,inputs:snapshot.inputs.map(({sourceIds,...input})=>input),entries:snapshot.entries.map(entry=>formationEntryDescriptor(entry,snapshot.inputs)),identities,sections,constraints,parameters:this.#parameters}));
  const limits=this.store.organizerBudget?.limits;
  if(limits&&(new TextEncoder().encode(JSON.stringify(decisionInput.inputs)).length>limits.maxContentBytes||new TextEncoder().encode(JSON.stringify(decisionInput)).length>limits.maxRequestBytes))fail();
  return {prepared,topicIds,snapshot,identities,sections,constraints,decisionInput};
 }
 async prepareAuthoredMaterial({entryId,descriptor=null}={}, {signal=null}={}){
  if(!idOK(entryId)||!this.#parameters)fail();assertActive(signal);
  let processingMode;const prepared={evidence:[],authority:await this.store.run(()=>this.store.repository.transaction(false,async t=>{const authority=await this.retrieval.guard.authority(t,[]);processingMode=this.retrieval.guard.processingMode(t);return authority;}))};
  const selected=await this.read(prepared,async t=>{const mapping=await readAuthoredEntryContextForTopic(this.store,t,entryId,descriptor);if(!mapping)fail();await this.authorizeTopics(t,prepared,[mapping.topicId]);const selected=await readAuthoredTopicReconciliation(this.store,t,entryId,descriptor);if(this.retrieval.guard.processingMode(t)!==processingMode)fail();return selected;});
  if(!selected)fail();assertActive(signal);
  const handle=Object.freeze({}),view={version:1,inputs:[],entries:[],identities:[],sections:[],constraints:[],authoredTopic:selected.material};
  const limits=this.store.organizerBudget?.limits;if(limits&&(new TextEncoder().encode(JSON.stringify(selected.material.fields)).length>limits.maxContentBytes||new TextEncoder().encode(JSON.stringify(view)).length>limits.maxRequestBytes))fail();
  this.#materials.set(handle,{authored:true,processingMode,entryId,descriptor:structuredClone(descriptor),prepared,selected,decisionInput:freeze(structuredClone(view)),signal});return handle;
 }
 async prepareMaterial({scope,entryIds=[]}={}, {signal=null}={}){
  if(!this.#parameters||!Array.isArray(entryIds)||entryIds.length>FORMATION_WORK_LIMITS.entries||new Set(entryIds).size!==entryIds.length||entryIds.some(id=>!idOK(id)))fail();
  const selected=structuredClone(scope),entries=structuredClone(entryIds);assertActive(signal);
  const material=await this.#collectMaterial(selected,entries,signal);assertActive(signal);
  const handle=Object.freeze({});this.#materials.set(handle,{...material,signal});return handle;
 }
 async checkMaterial(handle,finalRead=null){
  if(finalRead!==null&&typeof finalRead!=='function')fail();
  const m=this.#materials.get(handle);if(!m)fail();assertActive(m.signal);
  if(m.authored){await this.read(m.prepared,async t=>{await this.authorizeTopics(t,m.prepared,[m.selected.mapping.topicId]);if(!same(await readAuthoredTopicReconciliation(this.store,t,m.entryId,m.descriptor),m.selected))fail();if(this.retrieval.guard.processingMode(t)!==m.processingMode)fail();if(finalRead)await finalRead(t);});assertActive(m.signal);return;}
  const current=await this.read(m.prepared,async t=>{await this.authorizeTopics(t,m.prepared,m.topicIds);return readFormationEvidence(this.store,t,m.prepared,m.snapshot.entries.map(e=>e.id));});
  if(!same(current,m.snapshot))fail();await validateFormationSources(current,{store:this.store,qualification:this.retrieval.guard.qualification()});assertActive(m.signal);
  // Hashes complete outside IDB, then the original authority/identity/restore
  // generation is checked again before releasing any selected Working bytes.
  // A trusted caller may join its additional material fence to this exact
  // final transaction. No separate await may reopen a gap after Input guards.
  await this.read(m.prepared,async t=>{await this.authorizeTopics(t,m.prepared,m.topicIds);if(finalRead)await finalRead(t);});assertActive(m.signal);
 }
 async readMaterial(handle){
  await this.checkMaterial(handle);const m=this.#materials.get(handle);assertActive(m.signal);
  return {view:structuredClone(m.decisionInput),sourceCount:m.authored?0:new Set(m.snapshot.inputs.flatMap(i=>i.sourceIds)).size};
 }
 releaseMaterial(handle){this.#materials.delete(handle);}
 async prepareAuthoredReconciliation(request,{signal=null}={}){
  keys(request,['entryId','descriptor','operationId'],['entryId','descriptor','operationId']);if(!idOK(request.operationId)||request.operationId.length<8||!this.#decision||this.#busy)fail();this.#busy=true;
  let material;
  try{material=await this.prepareAuthoredMaterial(request,{signal});const held=this.#materials.get(material),assessment=await this.#decision.assess(held.decisionInput);await this.checkMaterial(material);const result=evaluateAuthoredTopicReconciliation(assessment,held.selected.material),operation={kind:'personal-topic-authored-reconciliation',...structuredClone(request),decisionVersion:this.#decision.version};const handle=freeze({...result,decisionVersion:this.#decision.version});this.#plans.set(handle,{authored:true,...held,request:structuredClone(request),operation,result:{...result,decisionVersion:this.#decision.version},signal});return handle;}
  finally{if(material)this.releaseMaterial(material);this.#busy=false;}
 }
 async #commitAuthored(state){
  assertActive(state.signal);if(state.cancelled)fail();const digest=await hashText(JSON.stringify(state.operation)),qualification=this.retrieval.guard.qualification();
  let transaction=null,publication=null,published=null,root=null,processingFinal=false;const facts=[],members=[];
  const current=()=>{assertActive(state.signal);if(state.cancelled||published&&published.database!==this.store.repository.db)fail();if(qualification)assertMaintenanceQualification(qualification,this.store);if(processingFinal)this.retrieval.guard.assertProcessingFacts(transaction);return true;};
  const check=async t=>{current();await this.retrieval.guard.check(t,state.prepared);await this.authorizeTopics(t,state.prepared,[state.selected.mapping.topicId]);if(this.retrieval.guard.processingMode(t)!==state.processingMode)fail();if(!same(await readAuthoredTopicReconciliation(this.store,this.retrieval.guard.reader(t),state.entryId,state.descriptor),state.selected))fail();await assertTopicFormationMembers(this.retrieval.guard.reader(t),members);if(root&&await rootReadAuthority(t)!==JSON.stringify(root))fail();current();return true;};
  const finalFence=async t=>{if(t!==transaction)fail();if(processingFinal)return current();await check(t);if(state.processingMode==='authority'){this.retrieval.guard.registerProcessingFinalFence(t,{qualification});processingFinal=true;}return true;};
  try{const result=await this.#writeTransaction(async t=>{
   transaction=t;await check(t);const beforeAuthority=await rootReadAuthority(t);root=JSON.parse(beforeAuthority);members.push(...await captureTopicFormationMembers(this.retrieval.guard.reader(t),[state.entryId]));
   // Keep exact selected owner rows in the original terminal collection. The
   // qualified reader supplies prose; no other Entry or historical Source is read.
   const reader=this.retrieval.guard.reader(t),seen=new Set();let retained=0;
   const retain=(table,key,row)=>{if(!row)return;const ref=JSON.stringify([table,key]);if(seen.has(ref))return;seen.add(ref);const project=value=>{if(value==null)return null;if(table==='topics'||table==='sections'){const fields=table==='topics'?['id','revision','organizationRevision','activeLayoutGeneration','lifecycle','redirectTo','layoutJobId','identity','createdBy','sourceRecordIds','name']:['id','topicId','sectionId','layoutGeneration','rank','revision','lifecycle','activeKey','redirectTo'];return Object.fromEntries(fields.filter(k=>Object.hasOwn(value,k)).map(k=>[k,structuredClone(value[k])]));}const fields=table==='thoughts'?['id','storageSchema','origin','provenanceType','bodyBinding','workingInputId','bindingRevision','bindingLength','inputRefs','sourceRecordIds','hasHumanAction','userEdited','integrity','lifecycle','freshness','staleReasons','revision','contentRevision','organizationRevision','dependencyRevision','createdAt','thoughtText','title','note','type','formation','thoughtEditedAt','fieldRevisions','authorship','protections','organizationIntents']:table==='revisions'?['id','kind','entityId','documentId','actor','sourceRecordIds','baseRevision','afterRevision','sequence','operationId','reason','fieldMask','important','before','after']:[];if(!fields.length)fail();return Object.fromEntries(fields.filter(k=>Object.hasOwn(value,k)).map(k=>[k,structuredClone(value[k])]));},expected=project(row);retained+=new TextEncoder().encode(JSON.stringify(expected)).length;if(retained>CONTEXT_LINEAGE_LIMITS.hashBytes)fail();facts.push({ref,table,key,project,expected});};
   const tracked=Object.create(reader);tracked.get=async(table,key)=>{const row=await reader.get(table,key);retain(table,key,row);return row;};tracked.edge=async(table,...args)=>{const row=await reader.edge(table,...args);if(row)retain(table,row.id,row);return row;};
   if(!same(await readAuthoredTopicReconciliation(this.store,tracked,state.entryId,state.descriptor),state.selected))fail();
   facts.push(...await captureTopicFormationTerminal(this.store,reader,[],{retain:value=>structuredClone(value),current}));
   const prior=await receipt(t,state.operation,digest),result=prior??structuredClone(state.result);if(prior&&!same(prior,state.result))fail();
   const put=t.put.bind(t);t.put=async(table,row,...args)=>{current();if(table==='meta'){const i=rootIds.indexOf(row.id);if(i>=0)root[i]=row.value??null;}const value=await put(table,row,...args);current();return value;};
   if(!prior)await saveReceipt(this.store,t,state.operation,digest,result);await check(t);const receiptIntent={store:'operationReceipts',id:state.operation.operationId,value:structuredClone(await t.get('operationReceipts',state.operation.operationId))};if(receiptIntent.value?.digest!==digest||!same(receiptIntent.value.result,result))fail();
   publication=Object.freeze({});const after=structuredClone(root);if(t.backupChanged)after[5]=(after[5]||0)+1;published={store:this.store,database:this.store.repository.db,transaction:t,operationId:state.operation.operationId,beforeAuthority,stagedAuthority:JSON.stringify(root),afterAuthority:JSON.stringify(after),writes:[],members:structuredClone(members),frozen:true,committed:false};publications.set(publication,published);
   registerTopicFormationTerminal(this.store,t,{facts,intents:new Map([[receiptIntent.id,receiptIntent]]),root,members,qualification,current,compatibilityRecheck:async()=>{if(processingFinal){this.retrieval.guard.assertProcessingCurrent(t);return current();}if(await this.retrieval.guard.processing(t,[],[])!==state.prepared.authority.processingEpoch)fail();await this.authorizeTopics(t,state.prepared,[state.selected.mapping.topicId]);current();}});await finalFence(t);return result;
  },finalFence,()=>publication);published.committed=true;published.transaction=null;return result;}finally{if(published&&!published.committed)publications.delete(publication);}
 }
 async prepare(request,options={}){if(this.#busy)fail();this.#busy=true;let completed=false;try{const result=await this.#prepare(request,options);completed=true;return result;}finally{if(!completed&&this.#localQualification)releaseMaintenanceQualification(this.#localQualification);this.#localQualification=null;this.#exactMutation=null;this.#busy=false;}}
 async #prepare(request,{signal=null,maintenanceCandidate=null}={}){
  keys(request,['scope','operationId','entryIds','candidateId','expectedCandidateRevision'],['scope','operationId']);
  if(!idOK(request.operationId)||request.operationId.length<8||!this.#decision||!this.#parameters||request.entryIds!==undefined&&(!Array.isArray(request.entryIds)||request.entryIds.length>FORMATION_WORK_LIMITS.entries||new Set(request.entryIds).size!==request.entryIds.length||request.entryIds.some(x=>!idOK(x))))fail();
  if(request.candidateId!==undefined&&(!idOK(request.candidateId)||!Number.isSafeInteger(request.expectedCandidateRevision)||request.expectedCandidateRevision<0)||request.candidateId===undefined&&request.expectedCandidateRevision!==undefined)fail();
  assertActive(signal);request=structuredClone(request);
  const candidateOperation=maintenanceCandidate===null?null:readMaintenanceTopicCandidateOperation(maintenanceCandidate,this.store,{operationId:request.operationId,qualification:this.retrieval.guard.qualification()});
  if(candidateOperation){if(!same(request.scope,candidateOperation.scope)||request.candidateId!==undefined&&request.candidateId!==candidateOperation.candidateId||request.expectedCandidateRevision!==undefined&&request.expectedCandidateRevision!==candidateOperation.candidateRevision)fail();if(candidateOperation.candidateId)Object.assign(request,{candidateId:candidateOperation.candidateId,expectedCandidateRevision:candidateOperation.candidateRevision});await this.store.run(()=>this.store.repository.transaction(false,t=>assertMaintenanceTopicCandidateOperation(maintenanceCandidate,this.store,t,{operationId:request.operationId,qualification:this.retrieval.guard.qualification()})));}
  const operation={kind:'personal-topic-formation',...request,decisionVersion:this.#decision.version,parameters:this.#parameters};
  const initial=await this.retrieval.guard.prepare(request.scope),prior=await this.store.priorOperation(operation);
  if(prior){await this.read(initial,t=>this.authorizeTopics(t,initial,prior.topicIds||[]));assertActive(signal);const handle=freeze({...prior,replayed:true});this.#plans.set(handle,{request,operation,signal,prior,maintenanceCandidate,candidateOperation});return handle;}
  const {prepared,topicIds,snapshot,identities,sections,constraints,decisionInput}=await this.#collectMaterial(request.scope,request.entryIds||[],signal);
  assertActive(signal);let assessment;try{assessment=freeze(structuredClone(await this.#decision.assess(decisionInput)));}catch{fail();}assertActive(signal);
  const plan=evaluateTopicFormation(assessment,snapshot,identities,sections,this.#parameters);
  // Historical primary roles remain evidence roles. The independent source
  // capability, not the assessor, fixes this child's permitted Entry mutations.
  if(candidateOperation&&(plan.entries.some(e=>!candidateOperation.mutationInputIds.includes(e.span.inputId))||candidateOperation.candidate&&plan.boundaryKey!==null))fail();
  const nameTokens=['create','candidate'].includes(plan.outcome)&&plan.name?[await keyedHash(prepared.authority.secret,['personal-topic-name-v1',plan.name.normalize('NFKC').toLocaleLowerCase().trim()])]:[];
  // Coverage establishes which identities were considered, never their meaning.
  // Recheck its generation and separate negative-intent proof at final write.
  const proof=await this.retrieval.constraintProof(prepared,{nameTokens,relatedTopicIds:plan.topicId?[plan.topicId]:[]});
  if(proof.blocked){plan.outcome='unassigned';plan.reason='identity_constraint';plan.topicId=null;plan.newSection=null;plan.selectedSection=null;for(const entry of plan.entries)entry.additional=[];}
  const maps=Object.fromEntries(prepared.evidence.map((e,i)=>['i'+i,e])),projection={maps,entryMap:{},topicMap:{},sectionMap:{},provider:{providerId:'personal-topic-local',adapterVersion:'1',modelVersion:this.#decision.version},request:{entries:[]}};
  const entryPlans=[];
  for(const entry of plan.entries){
   if(entry.entryId){entryPlans.push({entry,item:null});continue;}
   const ref=Object.keys(maps).find(ref=>maps[ref].inputId===entry.span.inputId),candidate={action:'create',localOriginal:true,body:entry.body,type:entry.type,formation:'explicit',evidence:[{ref,field:entry.span.field,start:entry.span.start,end:entry.span.end}]};
   const [item]=await this.store.libraryCommit.prepare([candidate],projection);entryPlans.push({entry,item});
  }
  // Exact-excerpt dedupe may reuse an Entry. Authorize every dependency before
  // adding membership, rather than using a body match as processing authority.
  const exactMatches=await this.read(prepared,async t=>{const out=[];for(const {item}of entryPlans)if(item){const row=await t.edge('thoughts','byExact',item.exactKey);if(row?.lifecycle==='active'&&!out.some(x=>x.entryId===row.id))out.push({entryId:row.id,exactKey:item.exactKey});}return out;}),implicit=exactMatches.map(x=>x.entryId);
  const needsLocalExact=this.#resolveExactReuse&&exactMatches.length?await this.read(prepared,async t=>{const sent=new Set(prepared.evidence.map(e=>e.inputId));for(const {entryId}of exactMatches){const range=prefix(['entry',entryId]),count=await t.count('dependencies','byTarget',range);if(!Number.isSafeInteger(count)||count<0||count>1000)fail();const dependencies=await t.all('dependencies','byTarget',range,1001);if(dependencies.length!==count)fail();if(dependencies.some(row=>!sent.has(data(row,'inputId'))))return true;}return false;}):false;
  let exactReuse=null;
  if(needsLocalExact){
   // This producer exists only at the original owner-selected index seam, after
   // the original response assessment. No caller-supplied Entry selector mints it.
   if(candidateOperation)fail();const base=this.#baseQualification?.();if(!base)fail();
   const captured=await this.store.run(()=>this.store.repository.transaction(false,async transaction=>{const t=contextScopeTransactionReader(this.store,transaction,maintenanceQualificationWorkBudget(base,this.store));await this.retrieval.guard.check(t,prepared);const metadata=await captureTopicExactReuseMetadata(t,{matches:exactMatches,sentInputIds:prepared.evidence.map(x=>x.inputId),maxInputs:Math.min(20,this.store.organizerBudget.limits.maxInputs),charge:text=>chargeMaintenanceQualificationHash(base,this.store,text)});return {metadata,authority:await rootReadAuthority(t)};}));
   const selection=Object.freeze({}),h={store:this.store,repository:this.store.repository,database:this.store.repository.db,base,signal,released:false,view:freeze({operationId:request.operationId,matches:structuredClone(exactMatches),sentInputIds:prepared.evidence.map(x=>x.inputId),...captured})};exactReuseSelections.set(selection,h);
   try{const qualification=await this.#resolveExactReuse(selection,base);readMaintenanceTopicExactReuseQualification(qualification,this.store,selection,base);this.#localQualification=qualification;
    const evidence=await this.store.evidenceFor(captured.metadata.inputs.map(x=>({inputId:x.id,role:'primary',selectedFields:['body']})),{qualification});
    for(const {collections}of captured.metadata.members)for(const d of collections.find(x=>x.table==='dependencies').rows){const e=evidence.find(x=>x.inputId===d.inputId);if(!e||!same(e.fieldDigests,d.fieldDigests)||e.scopeToken!==d.scopeToken||e.versionToken!==d.versionToken)fail();}
    const local=await this.read(prepared,async t=>{await checkEvidenceInTransaction(this.store,t,evidence);const snapshot=await readFormationEvidence(this.store,t,{evidence},implicit),rows=[];for(const id of implicit)rows.push(freeze(structuredClone(await t.get('thoughts',id))));return {snapshot,rows};});
    for(const entry of local.snapshot.entries){for(const d of entry.dependencies){const input=local.snapshot.inputs.find(x=>x.id===d.inputId);if(!input||entry.body!==input.fields.body)fail();}for(const r of entry.references){const input=local.snapshot.inputs.find(x=>x.id===r.inputId);if(!input||r.kind!=='exact_excerpt'||r.span?.start!==0||r.span.end!==input.fields.body.length)fail();}}
    await validateFormationSources(local.snapshot,{store:this.store,qualification});exactReuse={selection,qualification,evidence,snapshot:local.snapshot,rows:local.rows};h.clear=()=>{exactReuse.snapshot=null;exactReuse.rows.length=0;exactReuse.evidence.length=0;if(h.planState){h.planState.snapshot.entries=h.planState.snapshot.entries.filter(x=>!implicit.includes(x.id));h.planState.exactReuse=null;h.planState=null;}};
   }catch(error){releaseMaintenanceQualification(this.#localQualification);this.#localQualification=null;releaseTopicExactReuseSelection(selection);throw error;}
  }

  const finalMaterial=await this.read(prepared,async t=>{const reader=this.retrieval.guard.reader(t),snapshot=await readFormationEvidence(this.store,reader,prepared,unique([...(request.entryIds||[]),...(exactReuse?[]:implicit)]));if(exactReuse)snapshot.entries.push(...exactReuse.snapshot.entries.filter(e=>!snapshot.entries.some(x=>x.id===e.id)));return {snapshot,members:await captureTopicFormationMembers(reader,snapshot.entries.map(e=>e.id),{charge:this.retrieval.guard.qualification()?text=>chargeMaintenanceQualificationHash(this.retrieval.guard.qualification(),this.store,text):null})};}),finalSnapshot=finalMaterial.snapshot;
  if(!same(snapshot.inputs,finalSnapshot.inputs)||!same(snapshot.sources,finalSnapshot.sources))fail();
  let candidatePlan=null,consumePlan=null;
  if(plan.outcome==='candidate'){
   const names=plan.name?[plan.name]:[];let namedCursor=null,namedPage;do{assertActive(signal);namedPage=await this.retrieval.page({scope:request.scope,names,cursor:namedCursor});namedCursor=namedPage.nextCursor;}while(namedCursor);
   candidatePlan=await this.candidates.prepareRecord({scope:request.scope,names,coverage:namedPage.coverage,...(!candidateOperation?.candidate&&plan.boundaryKey?{boundaryKey:plan.boundaryKey}:{}),...(request.candidateId?{candidateId:request.candidateId,expectedRevision:request.expectedCandidateRevision}:{})},{candidate:candidateOperation?.candidate??null});
  }
  if(request.candidateId&&['create','reuse'].includes(plan.outcome)){
   const candidate=candidateOperation?.candidate?this.candidates.selectionMetadata(candidateOperation.candidate):await this.candidates.read(request.candidateId);if(!candidate||candidate.revision!==request.expectedCandidateRevision)fail();
   const complete=candidate.evidence.every(e=>e.selectedFields.every(field=>{const input=snapshot.inputs.find(x=>x.id===e.inputId),spans=assessment.evidence.filter(c=>c.inputId===e.inputId&&c.field===field).sort((a,b)=>a.start-b.start);let end=0;for(const span of spans){if(span.start>end)return false;end=Math.max(end,span.end);}return input&&end===input.fields[field].length;}));
   if(complete)consumePlan=await this.candidates.prepareConsume({candidateId:request.candidateId,expectedRevision:request.expectedCandidateRevision,scope:request.scope,boundaryKey:candidateOperation?.candidate?null:plan.boundaryKey},{candidate:candidateOperation?.candidate??null});
  }
  await this.read(prepared,async t=>{await this.authorizeTopics(t,prepared,topicIds);assertActive(signal);});
  if(candidateOperation)readMaintenanceTopicCandidateOperation(maintenanceCandidate,this.store,{operationId:request.operationId,qualification:this.retrieval.guard.qualification()});
  const handle=freeze({...publicReport(plan),decisionVersion:this.#decision.version});this.#plans.set(handle,{request,operation,signal,prepared,plan,projection,entryPlans,snapshot:finalSnapshot,members:finalMaterial.members,exactReuse,topicIds,nameTokens,proof,candidatePlan,consumePlan,maintenanceCandidate,candidateOperation});if(exactReuse)exactReuseSelections.get(exactReuse.selection).planState=this.#plans.get(handle);return handle;
 }
 cancel(handle){const state=this.#plans.get(handle);if(!state)fail();state.cancelled=true;if(state.exactReuse)releaseMaintenanceQualification(state.exactReuse.qualification);}
 async commit(handle){if(this.#busy)fail();this.#busy=true;const state=this.#plans.get(handle),syncPlan=Object.freeze({});let sync=null;if(state)formationSyncPlans.set(syncPlan,{service:this,state});try{sync=await prepareOriginalFormationSync(this,syncPlan);if(state?.exactReuse){assertMaintenanceQualification(state.exactReuse.qualification,this.store);this.#localQualification=state.exactReuse.qualification;}const result=await this.#commit(handle,sync);await completeOriginalFormationSync(sync,result);if(state?.exactReuse){state.prior=structuredClone(result);releaseMaintenanceQualification(state.exactReuse.qualification);}return result;}finally{releaseOriginalFormationSync(sync);formationSyncPlans.delete(syncPlan);this.#localQualification=null;this.#exactMutation=null;this.#busy=false;}}
 async #commit(handle,sync=null){
  const state=this.#plans.get(handle);if(!state||state.cancelled)fail();assertActive(state.signal);if(state.authored)return this.#commitAuthored(state);
  const {request,operation}=state;
  const candidateOperation=state.maintenanceCandidate===null||state.maintenanceCandidate===undefined?null:readMaintenanceTopicCandidateOperation(state.maintenanceCandidate,this.store,{operationId:request.operationId,qualification:this.retrieval.guard.qualification()});
  if(!same(candidateOperation,state.candidateOperation??null))fail();
  const current=await this.retrieval.guard.prepare(request.scope),prior=await this.store.priorOperation(operation);
  if(prior){await this.read(current,t=>this.authorizeTopics(t,current,prior.topicIds||[]));assertActive(state.signal);if(state.cancelled)fail();return prior;}
  if(state.prior)fail();
  const {prepared,plan,projection,entryPlans,snapshot,topicIds,nameTokens,proof,candidatePlan,consumePlan}=state,digest=await hashText(JSON.stringify(operation));
  let transaction=null,rawIntentGet=null,committedTopicIds=[],publication=null,publicationState=null,recording=false,depth=0,rootExpected=null,terminalFacts=null,retained=new TextEncoder().encode(JSON.stringify([candidateOperation?.baselines||[],state.exactReuse?.rows||[],state.exactReuse?.snapshot??null])).length;const intents=new Map(),members=new Map(),heldMembers=new Map(state.members.map(x=>[x.entryId,x]));if(retained>CONTEXT_LINEAGE_LIMITS.hashBytes)fail();
  const publicationToken=()=>publication;
  const retainTerminal=value=>{const bytes=new TextEncoder().encode(JSON.stringify(value)).length;retained+=bytes;if(retained>CONTEXT_LINEAGE_LIMITS.hashBytes)fail();return structuredClone(value);};
  const terminalCurrent=()=>{assertActive(state.signal);if(state.cancelled||publicationState&&publicationState.database!==this.store.repository.db)fail();return true;};
  const record=(store,id,value)=>{if(!recording||depth)return;if(graphStores.has(store)||candidateIntent(store,id,value)||store==='operationReceipts'&&id===operation.operationId){const key=JSON.stringify([store,id]),prior=intents.get(key);retained-=prior?new TextEncoder().encode(JSON.stringify(prior)).length:0;const next={store,id,value:value===null?null:structuredClone(value)};retained+=new TextEncoder().encode(JSON.stringify(next)).length;if(retained>CONTEXT_LINEAGE_LIMITS.hashBytes)fail();intents.set(key,next);}if(store==='meta'){const index=rootIds.indexOf(id);if(index>=0)rootExpected[index]=value?.value??null;else if(id==='smart-filter')rootExpected[6]=['mode','phase','policyEpoch','decisionSequence','filterVersion','policyVersion','classifierVersion'].map(key=>value?.[key]??null);}};
  const seal=()=>{recording=false;publicationState.stagedAuthority=JSON.stringify(rootExpected);const after=structuredClone(rootExpected);if(transaction.backupChanged)after[5]=(after[5]||0)+1;publicationState.afterAuthority=JSON.stringify(after);publicationState.writes=[...intents.values()].filter(x=>['thoughts','placements','dependencies','provenance'].includes(x.store)||candidateIntent(x.store,x.id,x.value)).map(x=>({...x,value:x.store==='thoughts'&&x.value?Object.fromEntries(entryMetadata.filter(k=>Object.hasOwn(x.value,k)).map(k=>[k,structuredClone(x.value[k])])):structuredClone(x.value)}));publicationState.members=retainTerminal(expectedTopicFormationMembers([...members.values()],intents));publicationState.frozen=true;registerTopicFormationTerminal(this.store,transaction,{facts:terminalFacts,intents,baselines:candidateOperation?.baselines,root:rootExpected,members:publicationState.members,qualification:this.retrieval.guard.qualification(),current:terminalCurrent,compatibilityRecheck:async()=>{if(await this.retrieval.guard.processing(transaction,prepared.evidence,[])!==prepared.authority.processingEpoch)fail();await this.authorizeTopics(transaction,prepared,unique([...topicIds,...committedTopicIds]));terminalCurrent();}});};
  // Original owner capability, never provider/schema data. A joined owner may
  // recheck this exact processing/evidence grant after staging its own ACK.
  const finalFence=async t=>{if(t!==transaction)fail();if(candidateOperation){readMaintenanceTopicCandidateOperation(state.maintenanceCandidate,this.store,{operationId:request.operationId,qualification:this.retrieval.guard.qualification()});for(const row of candidateOperation.baselines){const intent=intents.get(JSON.stringify(['organizerWorkItems',row.id])),expected=intent?intent.value:row;if(!sameTopicWriteData((await t.get('organizerWorkItems',row.id))??null,expected))fail();}}await this.retrieval.guard.check(t,prepared);const source=await readFormationEvidence(this.store,this.retrieval.guard.reader(t),prepared);if(!same(source.inputs,snapshot.inputs)||!same(source.sources,snapshot.sources))fail();if(state.exactReuse){const local=state.exactReuse,reader=this.retrieval.guard.reader(t);await checkEvidenceInTransaction(this.store,reader,local.evidence);const actual=await readFormationEvidence(this.store,reader,{evidence:local.evidence});if(!same(actual.inputs,local.snapshot.inputs)||!same(actual.sources,local.snapshot.sources))fail();}await this.authorizeTopics(t,prepared,unique([...topicIds,...committedTopicIds]));assertActive(state.signal);if(state.cancelled)fail();if(rootExpected&&await rootReadAuthority(t)!==JSON.stringify(rootExpected))fail();for(const {store,id,value}of intents.values()){const own=store==='thoughts'&&state.exactReuse?.rows.some(x=>x.id===id),actual=await(own?rawIntentGet(store,id):t.get(store,id));if(own){assertMaintenanceQualification(state.exactReuse.qualification,this.store);assertTopicExactReuseOwnRow(this.#exactMutation,this.store,t,state.exactReuse.qualification,actual);}if(!sameTopicWriteData(actual??null,value))fail();}await assertTopicFormationMembers(this.retrieval.guard.reader(t),expectedTopicFormationMembers([...members.values()],intents));return true;};
  try{const result=await this.#writeTransaction(async t=>{
   transaction=t;await beginOriginalFormationSync(this,t,sync);if(state.exactReuse){const token=Object.freeze({});exactReuseMutations.set(token,{store:this.store,repository:this.store.repository,database:this.store.repository.db,transaction:t,qualification:state.exactReuse.qualification,before:new Map(state.exactReuse.rows.map(row=>[row.id,row])),rows:new Map(),allowedTopics:new Set(),released:false});this.#exactMutation=token;}if(candidateOperation)await assertMaintenanceTopicCandidateOperation(state.maintenanceCandidate,this.store,t,{operationId:request.operationId,qualification:this.retrieval.guard.qualification()});const originalGet=t.get.bind(t),originalEdge=t.edge.bind(t),qualifiedRead=this.retrieval.guard.reader(Object.assign(Object.create(t),{get:originalGet,edge:originalEdge}));rawIntentGet=originalGet;t.get=(table,id)=>['blocks','records','inputStates'].includes(table)||table==='thoughts'&&state.exactReuse?.rows.some(x=>x.id===id)?qualifiedRead.get(table,id):originalGet(table,id);if(state.exactReuse)t.edge=(table,...args)=>table==='thoughts'?qualifiedRead.edge(table,...args):originalEdge(table,...args);publication=Object.freeze({});const beforeAuthority=await rootReadAuthority(t);rootExpected=JSON.parse(beforeAuthority);publicationState={store:this.store,database:this.store.repository.db,transaction:t,operationId:operation.operationId,beforeAuthority,stagedAuthority:null,afterAuthority:null,writes:[],members:[],frozen:false,committed:false};publications.set(publication,publicationState);terminalFacts=await captureTopicFormationTerminal(this.store,this.retrieval.guard.reader(t),[...prepared.evidence,...(state.exactReuse?.evidence||[]).filter(e=>!prepared.evidence.some(x=>x.inputId===e.inputId))],{retain:retainTerminal,current:terminalCurrent});recording=true;
   const memberReader=this.retrieval.guard.reader(t),ensureMember=async id=>{if(!id||members.has(id))return;const held=heldMembers.get(id);if(held){await assertTopicFormationMembers(memberReader,[held]);members.set(id,retainTerminal(held));}else{if(await t.get('thoughts',id))fail();const [empty]=await captureTopicFormationMembers(memberReader,[id],{charge:this.retrieval.guard.qualification()?text=>chargeMaintenanceQualificationHash(this.retrieval.guard.qualification(),this.store,text):null});if(empty.collections.some(x=>x.rows.length))fail();members.set(id,retainTerminal(empty));}};
   const put=t.put.bind(t),remove=t.delete.bind(t);t.put=async(store,value,key)=>{if(recording&&!depth){const id=key===undefined?value?.id:key;if(['thoughts','placements','dependencies','provenance'].includes(store)){const prior=await t.get(store,id);await ensureMember(topicFormationMemberOwner(store,prior));await ensureMember(topicFormationMemberOwner(store,value));}}record(store,key===undefined?value?.id:key,value);let ownAfter=null,ownState=null,ownId=key===undefined?value?.id:key;if(store==='thoughts'&&state.exactReuse?.rows.some(x=>x.id===ownId)){
     ownState=exactMutation(this.#exactMutation,this.store,t,state.exactReuse.qualification);assertMaintenanceQualification(state.exactReuse.qualification,this.store);
     const before=ownState.before.get(ownId),expected=ownState.rows.get(ownId)||before,actual=await originalGet('thoughts',ownId);assertMaintenanceQualification(state.exactReuse.qualification,this.store);if(!sameTopicWriteData(actual,expected))fail();
     const after=structuredClone(value),allowed=new Set(['dependencyRevision','organizationRevision','sourceRecordIds','inputRefs','topics','workingInputId','bodyBinding','bindingRevision','bindingLength','updatedAt','updatedSequence','meaningfulContentAt','lifecycleKey','activeKey','listKey','negativeUpdatedSequence']);
     topicExactReuseEntryMetadata(after);for(const field of new Set([...Reflect.ownKeys(before),...Reflect.ownKeys(after)]))if(!allowed.has(field)&&!sameTopicWriteData(data(before,field),data(after,field)))fail();
     const oldProofs=new Set(heldMembers.get(ownId).collections.find(x=>x.table==='provenance').rows.map(x=>x.id)),newProofs=[...intents.values()].filter(x=>x.store==='provenance'&&x.value?.ownerId===ownId&&!oldProofs.has(x.id));if(after.dependencyRevision!==before.dependencyRevision+newProofs.length)fail();
     const permittedInputs=new Map((before.inputRefs||[]).map(x=>[x.inputBlockId,x.basedOnContentRevision]));for(const e of prepared.evidence)permittedInputs.set(e.inputId,e.basedOnContentRevision);if((before.inputRefs||[]).some(x=>!after.inputRefs.some(y=>same(x,y)))||after.inputRefs.some(x=>permittedInputs.get(x.inputBlockId)!==x.basedOnContentRevision))fail();
     const sources=new Set([...(before.sourceRecordIds||[]),...prepared.evidence.flatMap(e=>e.sourceRecordIds)]);if(before.sourceRecordIds.some(x=>!after.sourceRecordIds.includes(x))||after.sourceRecordIds.some(x=>!sources.has(x)))fail();
     const newTopics=after.topics.filter(x=>!before.topics.includes(x));if(before.topics.some(x=>!after.topics.includes(x))||newTopics.some(x=>!ownState.allowedTopics.has(x))||new Set(after.topics).size!==after.topics.length||after.organizationRevision!==before.organizationRevision+newTopics.length)fail();
     if(after.workingInputId!==undefined&&after.workingInputId!==before.workingInputId||!['input','thought'].includes(after.bodyBinding)||after.bodyBinding!==before.bodyBinding&&after.bodyBinding!=='thought')fail();
     for(const field of ['bindingRevision','bindingLength'])if(after[field]!==undefined&&!Object.is(after[field],before[field]))fail();
     assertMaintenanceQualificationFacts(state.exactReuse.qualification,this.store);ownAfter=freeze(retainTerminal(after));
    }depth++;try{const result=await put(store,value,key);if(ownState){assertMaintenanceQualificationFacts(state.exactReuse.qualification,this.store);ownState.rows.set(ownId,ownAfter);}return result;}finally{depth--;}};t.delete=async(store,id)=>{if(recording&&!depth&&['thoughts','placements','dependencies','provenance'].includes(store))await ensureMember(topicFormationMemberOwner(store,await t.get(store,id)));record(store,id,null);depth++;try{return await remove(store,id);}finally{depth--;}};
   const replay=await receipt(t,operation,digest);if(replay){record('operationReceipts',operation.operationId,await t.get('operationReceipts',operation.operationId));await this.retrieval.guard.check(t,current);await this.authorizeTopics(t,current,replay.topicIds||[]);assertActive(state.signal);if(state.cancelled)fail();committedTopicIds=[...(replay.topicIds||[])];await finalFence(t);seal();return replay;}
   const active=()=>{assertActive(state.signal);if(state.cancelled)fail();};active();
   await this.retrieval.guard.check(t,prepared);await this.authorizeTopics(t,prepared,topicIds);
   {const reader=this.retrieval.guard.reader(t),local=state.exactReuse,ids=new Set(local?.rows.map(x=>x.id)||[]),fresh=await readFormationEvidence(this.store,reader,prepared,snapshot.entries.filter(e=>!ids.has(e.id)).map(e=>e.id));if(local){await checkEvidenceInTransaction(this.store,reader,local.evidence);const actual=await readFormationEvidence(this.store,reader,{evidence:local.evidence},[...ids]);if(!same(actual,local.snapshot))fail();fresh.entries.push(...actual.entries.filter(e=>!fresh.entries.some(x=>x.id===e.id)));}if(!same(snapshot,fresh))fail();}
   if(!await this.retrieval.checkConstraintProof(t,prepared,proof)&&plan.outcome!=='unassigned')fail();
   for(const {entry,item}of entryPlans)if(item){
    for(const evidence of item.evidence)if((await t.all('thoughtSuppressions','byScope',evidence.scopeToken)).some(x=>x.status==='active'))fail();
    if((await t.all('thoughtSuppressions','byExact',item.exactSignature)).some(x=>x.status==='active'))fail();
    const exact=await t.edge('thoughts','byExact',item.exactKey);if(exact?.lifecycle==='active'&&!snapshot.entries.some(e=>e.id===exact.id&&e.body===entry.body))fail();
   }
   // Revalidate the original prepare collection before any domain put.
   await assertTopicFormationMembers(memberReader,state.members);
   let candidateResult=null;if(candidatePlan){candidateResult=await this.candidates.recordPreparedInTransaction(t,candidatePlan);if(candidateResult.conflict||candidateResult.deferred)fail();}
   let topic=null,section=null;
   if(plan.outcome==='create')topic=await this.#createTopic(t,plan,prepared,nameTokens[0],operation.operationId);
   else if(plan.outcome==='reuse'){
    topic=await resolveTopicIdentity(t,plan.topicId);if(topic.id!==plan.topicId||!['active','dormant'].includes(topic.lifecycle)||topic.layoutJobId||!await this.store.sourcePresent(t,topic.sourceRecordIds))fail();
    if(topic.lifecycle==='dormant'){
     if(topic.protections?.lifecycle?.locked)fail();const before=structuredClone(topic);setTopicLifecycle(topic,'active',{actor:'ai',operationId:operation.operationId,at:sync?.transitionAt??this.store.clock()});topic.revision++;topic.organizationRevision++;await t.put('topics',topic);await queueSearch(t,'topic',topic);await journal(this.store,t,{kind:'topic',entityId:topic.id,before,after:topic,fieldMask:['lifecycle'],actor:'ai',reason:'activity',important:true,operationId:operation.operationId,sourceRecordIds:topic.sourceRecordIds||[]},{boundedPrune:!!sync});
    }
   }
   if(topic){
    section=plan.selectedSection?await t.get('sections',plan.selectedSection.id):await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,topic.defaultSectionId]));
    if(plan.newSection){
     let needsPlacement=false;for(const {entry,item}of entryPlans){const existing=entry.entryId?await t.get('thoughts',entry.entryId):await t.edge('thoughts','byExact',item.exactKey),placement=existing?.lifecycle==='active'?await t.get('placements',JSON.stringify([topic.id,topic.activeLayoutGeneration,existing.id])):null;if(placement?.lifecycle!=='active'){needsPlacement=true;break;}}
     if(needsPlacement)section=await this.#createSection(t,topic,plan.newSection,prepared,operation.operationId,plan.sectionInputIds);
    }
    if(!section||section.topicId!==topic.id||section.lifecycle!=='active'||section.redirectTo||section.layoutGeneration!==topic.activeLayoutGeneration)fail();
   }
   const result={...publicReport(plan),decisionVersion:this.#decision.version,topicIds:topic?[topic.id]:[],entryIds:[],createdEntryIds:[],...(candidateResult?{candidateId:candidateResult.candidateId,candidateRevision:candidateResult.revision}:{})};
   for(const {entry,item}of entryPlans){
    active();let id=entry.entryId;
    if(item){const applied=await this.store.libraryCommit.apply(t,item,projection,null,'ai',operation.operationId);id=applied.id;if(applied.created)result.createdEntryIds.push(id);}
    result.entryIds.push(id);
    const destinations=topic?[{topic,section},...await Promise.all(entry.additional.map(async topicId=>{const target=await resolveTopicIdentity(t,topicId);if(target.id!==topicId||target.lifecycle!=='active'||target.layoutJobId)fail();return {topic:target,section:await t.get('sections',JSON.stringify([target.id,target.activeLayoutGeneration,target.defaultSectionId]))};}))]:[];
    for(const destination of destinations){
     active();const row=await this.store.readableEntry(t,id),target=destination.topic,sectionRow=destination.section,placement=await t.get('placements',JSON.stringify([target.id,target.activeLayoutGeneration,id]));
     if(row.lifecycle!=='active'||!sectionRow||sectionRow.lifecycle!=='active'||sectionRow.redirectTo)fail();
     // Existing membership is a no-op, never permission to move human anchors.
     if(placement?.lifecycle==='active')continue;
     if(!await automaticMembershipAllowed(t,row,target.id,placement))fail();
     projection.topicMap.destination={id:target.id};projection.sectionMap.destination={id:sectionRow.id};
     if(this.#exactMutation)exactReuseMutations.get(this.#exactMutation).allowedTopics.add(target.id);
     await this.store.libraryCommit.apply(t,{candidate:{action:'assign',topicRef:'destination',sectionRef:'destination',evidence:[]},evidence:[]},projection,row,'ai',operation.operationId);
     if(!result.topicIds.includes(target.id))result.topicIds.push(target.id);
    }
   }
   if(consumePlan){await this.candidates.consumePreparedInTransaction(t,consumePlan);result.consumedCandidateId=request.candidateId;}
   result.entryIds=unique(result.entryIds);result.createdEntryIds=unique(result.createdEntryIds);result.checks.humanIntent=!proof.blocked;await this.authorizeTopics(t,prepared,result.topicIds);active();committedTopicIds=[...result.topicIds];await saveReceipt(this.store,t,operation,digest,result);await finalFence(t);active();seal();await finishOriginalFormationSync(this,t,sync,result);return result;
  },finalFence,publicationToken,sync?{}:null);if(publicationState){publicationState.committed=true;publicationState.transaction=null;}return result;}finally{recording=false;if(this.#exactMutation){const mutation=exactReuseMutations.get(this.#exactMutation);if(mutation)mutation.released=true;exactReuseMutations.delete(this.#exactMutation);this.#exactMutation=null;}intents.clear();if(publicationState&&!publicationState.committed)publications.delete(publication);}
 }
 async #createTopic(t,plan,prepared,nameToken,operationId){
  const store=this.store,id=store.uuid(),sectionId=store.uuid(),at=store.clock(),sourceRecordIds=unique(prepared.evidence.filter(e=>plan.sourceInputIds.includes(e.inputId)).flatMap(e=>e.sourceRecordIds));
  const topic={id,defaultSectionId:sectionId,name:plan.name,nameKey:plan.name.toLocaleLowerCase(),summary:'',sourceRecordIds,revision:0,organizationRevision:0,activeLayoutGeneration:1,activeKey:0,pinKey:1,pinRank:rankBetween(),negativeUpdatedSequence:0,lifecycle:'active',createdBy:'ai',createdAt:at,protections:protections('ai',operationId,at)};
  initializeTopicIdentity(topic,'ai');await registerTopicName(t,topic,nameToken);await t.put('topics',topic);
  const section={id:JSON.stringify([id,1,sectionId]),topicId:id,layoutGeneration:1,sectionId,isDefault:true,title:'',rank:rankBetween(),revision:0,activeKey:0,lifecycle:'active',protections:protections('ai',operationId,at)};
  await t.put('sections',section);await queueSearch(t,'topic',topic);
  await journal(store,t,{kind:'topic',entityId:id,before:null,after:topic,fieldMask:['name'],actor:'ai',reason:'baseline',important:true,operationId,sourceRecordIds});
  await journal(store,t,{kind:'section',entityId:sectionId,documentId:id,before:null,after:section,fieldMask:['title','rank'],actor:'ai',reason:'baseline',important:true,operationId,sourceRecordIds:[]});return topic;
 }
 async #createSection(t,topic,title,prepared,operationId,sourceInputIds){
  const store=this.store,sectionId=store.uuid(),last=await t.edge('sections','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]),'prev'),sourceRecordIds=unique(prepared.evidence.filter(e=>sourceInputIds.includes(e.inputId)).flatMap(e=>e.sourceRecordIds)),section={id:JSON.stringify([topic.id,topic.activeLayoutGeneration,sectionId]),topicId:topic.id,layoutGeneration:topic.activeLayoutGeneration,sectionId,title,sourceRecordIds,rank:rankBetween(last?.rank||null),revision:0,activeKey:0,lifecycle:'active',protections:protections('ai',operationId,store.clock())};
  await t.put('sections',section);topic.organizationRevision++;await t.put('topics',topic);await queueSearch(t,'section',section);await journal(store,t,{kind:'section',entityId:sectionId,documentId:topic.id,before:null,after:section,fieldMask:['title','rank'],actor:'ai',reason:'baseline',important:true,operationId,sourceRecordIds});return section;
 }
}
