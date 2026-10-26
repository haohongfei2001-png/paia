import {applyConfirmedPromotion,promotionEntryFacts,capturePromotionWorkTerminal,registerPromotionWorkTerminal} from './topic-promotion-commit.js';
import {rootReadAuthority} from './organizer/root-read.js';
import {readTopicFormationPublication} from './topic-formation.js';
import {readContextMaintenancePublication} from './context-maintenance.js';
import {requireRepositoryTransactionScope} from './idb-repository.js';
import {fail,keys,idOK,revisionOK,same,keyedHash,prefix} from './thought-model.js';
import {hashText} from './dedupe.js';
import {TopicIdentityRetrieval} from './topic-retrieval.js';
import {assertPromotionPathRemovalAllowed} from './topic-promotion-access.js';
import {publicTopicAuthority,captureTopicProcessingReadFacts,assertTopicProcessingReadFacts} from './topic-processing.js';
import {readFormationEvidence,formationEntryDescriptor,readableFormationSection,validateFormationSources} from './topic-formation-evidence.js';
import {PromotionSelection,PROMOTION_PAGE_SIZE} from './topic-promotion-selection.js';
import {PROMOTION_LIMITS,evaluateSectionPromotion,formationParameters,promotionPlacementId,promotionSectionId,promotionOrganization} from './topic-promotion-policy.js';
import {assertMaintenanceQualification,assertMaintenanceQualificationFacts,maintenanceQualificationReader,maintenanceQualificationWorkBudget,chargeMaintenanceQualificationHash} from './ai-usage/maintenance-qualification.js';

export const PROMOTION_WORK_PREFIX='personal-topic-promotion:';
const TABLE='organizerWorkItems',unique=xs=>[...new Set(xs)];
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const active=signal=>{if(signal?.aborted)fail();};
const workId=operationId=>PROMOTION_WORK_PREFIX+operationId;
const itemId=(id,index)=>id+':'+String(index).padStart(3,'0');
const token=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const validWorkId=id=>typeof id==='string'&&id.startsWith(PROMOTION_WORK_PREFIX)&&idOK(id.slice(PROMOTION_WORK_PREFIX.length))&&!id.slice(PROMOTION_WORK_PREFIX.length).includes(':');
const descriptor=row=>Object.fromEntries(['id','topicId','sectionId','title','isDefault','revision','layoutGeneration'].filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));
const assessmentCaptures=new WeakMap(),preparedCaptures=new WeakMap(),activationCaptures=new WeakMap(),workCaptures=new WeakMap(),detachedProposals=new WeakMap();
const proposalMonotonic=globalThis.performance?.now?.bind(globalThis.performance);
function detachedCurrent(ticket,store){
 const p=detachedProposals.get(ticket),wall=Date.now(),mono=proposalMonotonic?.();
 if(!p||p.store!==store||p.repository!==store.repository||p.database!==store.repository.db||p.cancelled||!Number.isSafeInteger(wall)||!Number.isFinite(mono)||wall<p.lastWall||mono<p.lastMono||wall>=p.expiresAt||mono>=p.deadlineMono){if(p)p.cancelled=true;fail();}
 p.lastWall=wall;p.lastMono=mono;return p;
}
function preparedCurrent(state){
 if(!state||state.cancelled)fail();active(state.signal);const p=state.proposalClock;if(!p||state.confirmedCommitted)return true;
 const wall=Date.now(),mono=proposalMonotonic?.();if(!Number.isSafeInteger(wall)||!Number.isFinite(mono)||wall<p.lastWall||mono<p.lastMono||wall>=p.expiresAt||mono>=p.deadlineMono){state.cancelled=true;fail();}p.lastWall=wall;p.lastMono=mono;return true;
}
export function readSectionPromotionWorkCapture(token,store,t,qualification){const p=workCaptures.get(token);if(!p||p.store!==store||p.database!==store.repository.db||p.scope!==t||p.qualification!==qualification)fail();requireRepositoryTransactionScope(store.repository,t);assertMaintenanceQualification(qualification,store);return p.value;}
function publicationAuthority(p,publications){
 if(!Array.isArray(publications)||publications.length>100||new Set(publications).size!==publications.length||p.publicationAuthority!==undefined&&publications.length)fail();let authority=p.publicationAuthority??p.rootAuthority;
 for(const token of publications){const value=readTopicFormationPublication(token,p.store)||readContextMaintenancePublication(token,p.store);if(!value||value.beforeAuthority!==authority)fail();authority=value.authority;}
 return authority;
}
// A detached object is a bounded derived proposal, not a grant or proof of a
// paid response. The production bridge separately authenticates its exact
// recorded child/result and joined ACK publication capabilities.
// One private, immutable authority projection after the source bridge has
// verified its real paid-result/joined-ACK handoff. Retain no publication token,
// writer, field receipt or material; the old semantic digests never change.
export function freezeDetachedSectionPromotionPublications(ticket,store,publications){
 const p=detachedCurrent(ticket,store);if(p.running||p.publicationAuthority!==undefined)fail();const authority=publicationAuthority(p,publications);detachedCurrent(ticket,store);p.publicationAuthority=authority;return authority;
}
export function assertDetachedSectionPromotionCurrent(ticket,store){detachedCurrent(ticket,store);return true;}
export function readDetachedSectionPromotion(ticket,store){const p=detachedCurrent(ticket,store);return freeze(structuredClone({request:p.request,preview:p.preview,expiresAt:p.expiresAt}));}
export function releaseDetachedSectionPromotion(ticket){const p=detachedProposals.get(ticket);if(p){p.cancelled=true;p.assessment=null;p.preview=null;detachedProposals.delete(ticket);}}
export function readSectionPromotionActivationCapture(handle,store,t,qualification){const record=activationCaptures.get(handle);if(!record||record.store!==store||record.database!==store.repository.db||record.qualification!==qualification)return null;let original=null;for(let scope=t,depth=0;scope&&depth<16;scope=Object.getPrototypeOf(scope),depth++){try{requireRepositoryTransactionScope(store.repository,scope);original=scope;break;}catch(error){if(Object.hasOwn(scope,'tx'))throw error;}}if(original!==record.scope)return null;assertMaintenanceQualification(qualification,store);return record.value;}
// Source-only capabilities. A wire DTO, copied object or assessor return value
// cannot claim that the original owner captured or validated a promotion.
export function readSectionPromotionAssessmentCapture(handle,store){const p=assessmentCaptures.get(handle);if(!p||p.store!==store||p.database!==store.repository.db)return null;p.current();return p.value;}
export async function checkSectionPromotionAssessmentCapture(handle,store){const p=assessmentCaptures.get(handle);if(!p||p.store!==store||p.database!==store.repository.db||!p.value.qualification||!p.value.strictQualification)fail();p.current();await p.check();if(assessmentCaptures.get(handle)!==p)fail();p.current();return assertSectionPromotionAssessmentFacts(handle,store);}
export function assertSectionPromotionAssessmentFacts(handle,store){const p=assessmentCaptures.get(handle);if(!p||p.store!==store||p.database!==store.repository.db||!p.readFacts)fail();assertMaintenanceQualificationFacts(p.value.qualification,store);return assertTopicProcessingReadFacts(p.readFacts,store);}
export function assertSectionPromotionConfirmationFacts(handle,store){const p=preparedCaptures.get(handle);if(!p||p.store!==store||p.database!==store.repository.db)fail();return p.facts();}
export function readSectionPromotionPreparedCapture(handle,store){const p=preparedCaptures.get(handle);if(!p||p.store!==store||p.database!==store.repository.db)return null;p.current();return p.value;}

// A domain-only seam. No production assessor, provider, worker, background
// runner, UI, external permission or command is installed by this module.
export class SectionPromotionService {
 #plans=new WeakMap();
 #mutations=new WeakMap();
 #decision;
 #parameters;
 constructor(store,{resolveProcessing=null,resolveQualification=null,decision=null,parameters=null}={}){
  this.store=store;this.retrieval=new TopicIdentityRetrieval(store,{resolveProcessing,resolveQualification,resolveOwnMutation:t=>this.#mutations.get(t.tx)??null,strictQualification:resolveQualification!==null});this.selection=new PromotionSelection(this);
  if(decision!==null){keys(decision,['version','assess'],['version','assess']);if(typeof decision.assess!=='function'||!/^[-a-zA-Z0-9_.]{1,80}$/.test(decision.version))fail();this.#decision=Object.freeze({...decision});}
  this.#parameters=parameters===null?null:formationParameters(parameters);
 }
 reader(t){const token=this.retrieval.guard.qualification();return token===null?t:maintenanceQualificationReader(token,this.store,t,{ownMutation:this.#mutations.get(t.tx)??null});}
 async read(prepared,fn){return this.store.run(()=>this.store.repository.transaction(false,async t=>{await this.retrieval.guard.check(t,prepared);return fn(this.reader(t));}));}
 async hash(value){const text=JSON.stringify(value),qualification=this.retrieval.guard.qualification();if(qualification)chargeMaintenanceQualificationHash(qualification,this.store,text);const result=await hashText(text);if(qualification)assertMaintenanceQualification(qualification,this.store);return result;}
 async keyed(secret,value){const qualification=this.retrieval.guard.qualification();if(qualification)chargeMaintenanceQualificationHash(qualification,this.store,JSON.stringify(value));const result=await keyedHash(secret,value);if(qualification)assertMaintenanceQualification(qualification,this.store);return result;}
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
  const snapshot={topic,section,evidence,placements,organizations};snapshot.entryFacts=await this.pinEntryFacts(t,snapshot);return snapshot;
 }
 async pinEntryFacts(t,snapshot){
  const facts=[];let bytes=0;for(const p of snapshot.placements){const row=promotionEntryFacts(await t.get('thoughts',p.entryId));bytes+=new TextEncoder().encode(JSON.stringify(row)).length;if(bytes>8*1024*1024)fail();facts.push(structuredClone(row));}return facts;
 }
 // Compare the original sent evidence, including every whole-Section page.
 // Only this owner's selected Entry organization/revision increments are allowed
 // after promotion; body, direct lineage and Input/Source semantics never refresh.
 async checkSentEvidence(t,{prepared,snapshot,selectionState},selectedIds=[]){
  const selected=new Set(selectedIds);if(!selected.size&&snapshot.entryFacts)for(const row of snapshot.entryFacts)if(!same(row,promotionEntryFacts(await t.get('thoughts',row.id))))fail();const guards=selectionState?.guards||[prepared],byInput=new Map(guards.flatMap(g=>g.evidence).map(e=>[e.inputId,e]));
  for(const guard of guards)await this.retrieval.guard.check(t,guard);
  for(const page of selectionState?.pages||[{evidence:snapshot.evidence,authored:[]}]){
   const evidence=page.evidence,p={...prepared,evidence:evidence.inputs.map(i=>byInput.get(i.id))};
   if(p.evidence.some(e=>!e))fail();
   const current=await readFormationEvidence(this.store,t,p,evidence.entries.map(e=>e.id)),expected=structuredClone(evidence);
   for(const e of expected.entries)if(selected.has(e.id)){e.revision++;e.organizationRevision++;}
   if(!same(current,expected))fail();
   for(const e of page.authored||[]){const row=await this.store.readableEntry(t,e.id);
    if(row.lifecycle!=='active'||row.origin!=='user'||row.provenanceType!=='user_created'||row.bodyBinding!=='thought'||row.sourceRecordIds?.length||row.inputRefs?.length||await t.count('dependencies','byTarget',prefix(['entry',e.id]))||await t.count('provenance','byOwner',prefix(['entry',e.id]))||row.thoughtText!==e.body||row.contentRevision!==e.contentRevision||row.revision!==e.revision+(selected.has(e.id)?1:0)||row.organizationRevision!==e.organizationRevision+(selected.has(e.id)?1:0))fail();
   }
  }
 }
 async prepare(request,options={}){return this.#prepare(request,options);}
 async #prepare(request,{signal=null}={},retained=null){
  const started={wall:Date.now(),mono:proposalMonotonic?.()};
  this.validateRequest(request);if(!this.#decision||!this.#parameters)fail();active(signal);request=structuredClone(request);
  const large=request.selection==='whole_section'||request.entryIds.length>PROMOTION_PAGE_SIZE||request.scope.length>PROMOTION_PAGE_SIZE,lookupScope=request.scope.slice(0,PROMOTION_PAGE_SIZE);
  const identities=[],constraints=[];let cursor=null,last;
  do{active(signal);last=await this.retrieval.page({scope:lookupScope,cursor});for(const item of last.items)(item.kind==='identity'?identities:constraints).push(item);cursor=last.nextCursor;}while(cursor);
  const prepared=await this.retrieval.prepareCoverage({scope:lookupScope,coverage:last.coverage}),identityIds=unique(identities.flatMap(row=>[row.id,row.canonicalId]));
  const authoredSelection=!large&&await this.read(prepared,async t=>{await this.authorize(t,prepared,[request.topicId]);for(const id of request.entryIds)if(!await t.count('dependencies','byTarget',IDBKeyRange.bound(['entry',id],['entry',id,[]],false,true)))return true;return false;});
  const selectionState=large||authoredSelection?await this.selection.collect(request,prepared):null,snapshot=selectionState?.snapshot||await this.read(prepared,t=>this.snapshot(t,prepared,request));if(selectionState)snapshot.entryFacts=await this.read(prepared,t=>this.pinEntryFacts(t,snapshot));await validateFormationSources(snapshot.evidence,{store:this.store,qualification:this.retrieval.guard.qualification()});
  if(selectionState)await this.read(prepared,t=>this.selection.check(t,selectionState,identityIds));
  const reader=selectionState?this.selection.reader(selectionState,signal,identityIds):null;
  const view=freeze(structuredClone({version:1,selection:request.selection,...(selectionState?{manifest:{count:snapshot.placements.length,pageCount:selectionState.pages.length,digest:snapshot.selection.manifestDigest}}:{}),section:descriptor(snapshot.section),inputs:snapshot.evidence.inputs.map(({sourceIds,...input})=>input),entries:snapshot.evidence.entries.map(entry=>formationEntryDescriptor(entry,snapshot.evidence.inputs)),identities,constraints,parameters:this.#parameters}));
  const limits=this.store.organizerBudget?.limits;
  if(limits&&(new TextEncoder().encode(JSON.stringify(view.inputs)).length>limits.maxContentBytes||new TextEncoder().encode(JSON.stringify(view)).length>limits.maxRequestBytes))fail();
  const assessmentCapture=Object.freeze(Object.create(null)),qualification=this.retrieval.guard.qualification(),database=this.store.repository.db;
  const capturedCurrent=()=>{active(signal);if(this.store.repository.db!==database)fail();if(qualification)assertMaintenanceQualification(qualification,this.store);};
  const checkCaptured=async()=>{capturedCurrent();await this.read(prepared,async t=>{
   await this.authorize(t,prepared,identityIds);if(selectionState)await this.selection.check(t,selectionState,identityIds);else if(!same(snapshot,await this.snapshot(t,prepared,request)))fail();await this.checkSentEvidence(t,{prepared,snapshot,selectionState});
   // Every displayed identity name is independently granted. Compare only the
   // original known canonical IDs; no fresh search/page or model view is made.
   for(const identity of identities){const row=await t.get('topics',identity.id),canonical=identity.canonicalId===identity.id?row:await t.get('topics',identity.canonicalId);if(!row||!canonical||row.revision!==identity.revision||(row.identity?.revision??0)!==identity.identityRevision||Object.hasOwn(identity,'name')&&canonical.name!==identity.name)fail();}
   this.retrieval.guard.assertProcessingCurrent(t);assertMaintenanceQualificationFacts(qualification,this.store);this.retrieval.guard.assertProcessingFacts(t);const held=assessmentCaptures.get(assessmentCapture);if(!held)fail();held.readFacts=captureTopicProcessingReadFacts(this.retrieval.guard,t,{qualification});
  });capturedCurrent();assertSectionPromotionAssessmentFacts(assessmentCapture,this.store);};
  assessmentCaptures.set(assessmentCapture,{store:this.store,database,current:capturedCurrent,check:checkCaptured,value:Object.freeze({owner:this,request:freeze(structuredClone(request)),view,reader:reader?.api??null,qualification,strictQualification:this.retrieval.guard.strictQualification===true})});
  let assessment,earlySnapshotDigest=null,viewDigest=null;
  try{
   active(signal);
   if(qualification)viewDigest=await this.hash(view);
   if(retained){
    detachedCurrent(retained.ticket,this.store);
    if(viewDigest!==retained.state.viewDigest)fail();earlySnapshotDigest=await this.hash(snapshot);if(earlySnapshotDigest!==retained.state.snapshotDigest)fail();
    // Reacquisition has its own exact grant. Reading these original pages only
    // revalidates the old immutable evidence; it never calls an assessor/model.
    if(reader)for(let index=0;index<reader.api.pageCount;index++)await reader.api.readPage(index);
    assessment=retained.state.assessment;
   }else assessment=freeze(structuredClone(await this.#decision.assess(view,reader?.api,assessmentCapture)));
  }catch{fail();}finally{assessmentCaptures.delete(assessmentCapture);}active(signal);
  const claims=selectionState?this.selection.acknowledge(assessment,selectionState,reader.seen):assessment,plan=evaluateSectionPromotion(claims,snapshot,identities,this.#parameters);if(selectionState)plan.entryIds=snapshot.selection.manifest.entryIds;
  const nameToken=await this.keyed(prepared.authority.secret,['personal-topic-name-v1',plan.name.normalize('NFKC').toLocaleLowerCase().trim()]);
  const proof=await this.retrieval.constraintProof(prepared,{nameTokens:[nameToken],relatedTopicIds:[request.topicId]});if(proof.blocked)fail();
  const snapshotDigest=earlySnapshotDigest??await this.hash(snapshot);
  const rootAuthority=await this.read(prepared,async t=>{await this.authorize(t,prepared,identityIds);if(selectionState)await this.selection.check(t,selectionState,identityIds);else if(!same(snapshot,await this.snapshot(t,prepared,request)))fail();await this.checkSentEvidence(t,{prepared,snapshot,selectionState});active(signal);return qualification?rootReadAuthority(t):null;});
  if(retained){const old=retained.state,authority=publicTopicAuthority(prepared.authority),expected=JSON.parse(retained.authority);detachedCurrent(retained.ticket,this.store);if(rootAuthority!==retained.authority||authority.gateEpoch!==old.authority.gateEpoch||authority.restoreEpoch!==old.authority.restoreEpoch||authority.thoughtEpoch!==(expected[1]??0)||authority.generation!==(expected[5]??0)||snapshotDigest!==old.snapshotDigest||nameToken!==old.nameToken||!same(plan,old.plan))fail();}
  const handle=freeze({version:1,name:plan.name,sourceTopicId:request.topicId,sourceSectionId:request.sectionId,selection:request.selection,entryIds:plan.entryIds,requestedCount:request.entryIds?.length??snapshot.placements.length,selectedCount:plan.entryIds.length,wholeSection:request.selection==='whole_section',reason:plan.reason,checks:plan.checks,lineage:plan.lineage});
  const state={request,prepared,snapshot,snapshotDigest,viewDigest,rootAuthority,started,assessment,retained:retained!==null,proposalClock:retained?Object.fromEntries(['expiresAt','deadlineMono','lastWall','lastMono'].map(k=>[k,retained.state[k]])):null,identityIds,plan,nameToken,proof,signal,selectionState,cancelled:false};this.#plans.set(handle,state);
  preparedCaptures.set(handle,{store:this.store,database,current:()=>{capturedCurrent();preparedCurrent(state);},facts:()=>preparedCurrent(state),value:Object.freeze({owner:this,assessmentCapture,qualification,request:freeze(structuredClone(request)),assessment,preview:handle})});return handle;
 }
 detachProposal(handle){
  const state=this.#plans.get(handle),capture=readSectionPromotionPreparedCapture(handle,this.store);
  if(!state||state.cancelled||state.confirmed||state.retained||!capture?.qualification||!this.retrieval.guard.strictQualification||!state.viewDigest||!state.rootAuthority||!Number.isFinite(state.started.mono))fail();active(state.signal);
  const ticket=Object.freeze({}),now=Date.now(),mono=proposalMonotonic();if(now<state.started.wall||mono<state.started.mono)fail();
  const record={store:this.store,repository:this.store.repository,database:this.store.repository.db,request:freeze(structuredClone(state.request)),assessment:state.assessment,preview:handle,snapshotDigest:state.snapshotDigest,viewDigest:state.viewDigest,rootAuthority:state.rootAuthority,authority:freeze(publicTopicAuthority(state.prepared.authority)),nameToken:state.nameToken,plan:freeze(structuredClone(state.plan)),decisionVersion:this.#decision.version,expiresAt:state.started.wall+PROMOTION_LIMITS.lifetimeMs,deadlineMono:state.started.mono+PROMOTION_LIMITS.lifetimeMs,lastWall:now,lastMono:mono,cancelled:false,running:false};
  detachedProposals.set(ticket,record);detachedCurrent(ticket,this.store);
  // No old field receipt, reader, full Input/Source/Entry snapshot or signal is
  // retained by this owner after detachment. Preview/name are derived content.
  state.cancelled=true;this.#plans.delete(handle);preparedCaptures.delete(handle);for(const key of ['snapshot','selectionState','prepared','assessment'])state[key]=null;return ticket;
 }
 async revalidateProposal(ticket,{signal=null,publications=[]}={}){
  const state=detachedCurrent(ticket,this.store);if(state.running||!this.retrieval.guard.strictQualification||state.decisionVersion!==this.#decision?.version)fail();state.running=true;
  try{
   const qualification=this.retrieval.guard.qualification(),authority=publicationAuthority(state,publications);
   // Root admission is checked before any reacquired body. Only committed
   // original owner tokens advance it; production additionally requires ACKs.
   await this.store.run(()=>this.store.repository.transaction(false,async t=>{if(await rootReadAuthority(this.reader(t))!==authority)fail();detachedCurrent(ticket,this.store);assertMaintenanceQualification(qualification,this.store);}));
   const handle=await this.#prepare(state.request,{signal},{ticket,state,authority});detachedCurrent(ticket,this.store);releaseDetachedSectionPromotion(ticket);return handle;
  }catch(error){releaseDetachedSectionPromotion(ticket);throw error;}
 }
 cancel(handle){const state=this.#plans.get(handle);if(!state)fail();state.cancelled=true;}
 async confirm(handle,confirmation){
  keys(confirmation,['confirmed'],['confirmed']);if(confirmation.confirmed!==true)fail();
  const state=this.#plans.get(handle);preparedCurrent(state);
  const {request,prepared,snapshot,snapshotDigest,identityIds,plan,nameToken,proof}=state,at=Date.parse(this.store.clock());
  const confirmed=state.confirmed??={request,authority:publicTopicAuthority(prepared.authority),snapshotDigest,identityIds,plan,nameToken,proof,manifestSelection:!!state.selectionState,decisionVersion:this.#decision.version,sourceRecordIds:unique([...prepared.evidence.flatMap(e=>e.sourceRecordIds),...(snapshot.section.sourceRecordIds||[]),...(snapshot.topic.sourceRecordIds||[]),...(snapshot.selection?.sourceRecordIds||[]),...snapshot.evidence.entries.flatMap(e=>e.sourceRecordIds)]),inputIds:request.scope.map(e=>e.inputId),at,expiresAt:at+PROMOTION_LIMITS.lifetimeMs};
  const signature=await this.keyed(prepared.authority.secret,['confirmed-section-promotion-v1',confirmed]),id=workId(request.operationId);
  const result=await this.store.foundationWrite(async t=>{
   const original=t;t=this.reader(t);
   await this.retrieval.guard.check(t,prepared);await this.authorize(t,prepared,identityIds);
   if(!await this.retrieval.checkConstraintProof(t,prepared,proof)||state.cancelled)fail();if(state.selectionState)await this.selection.check(t,state.selectionState,identityIds);else if(!same(snapshot,await this.snapshot(t,prepared,request)))fail();await this.checkSentEvidence(t,{prepared,snapshot,selectionState:state.selectionState});active(state.signal);
   const prior=await t.get(TABLE,id);if(prior){this.validateWork(prior);if(!same(prior.confirmed,confirmed)||prior.signature!==signature)fail();const terminal=await this.#captureWork(original,state,confirmed,[prior]);this.#registerWork(original,terminal,()=>preparedCurrent(state));return {workId:id,state:prior.state,revision:prior.revision};}
   if(await t.get('operationReceipts',request.operationId))fail();
   const row={id,kind:'personal_topic_promotion',version:1,state:'confirmed',stateKey:1,revision:0,offset:0,confirmed,signature,sourceRecordIds:confirmed.sourceRecordIds,inputIds:confirmed.inputIds},terminal=await this.#captureWork(original,state,confirmed,[row]);
   await t.put(TABLE,row);preparedCurrent(state);this.#registerWork(original,terminal,()=>preparedCurrent(state));return {workId:id,state:'confirmed',revision:0};
  });state.confirmedCommitted=true;return result;
 }
 async #captureWork(t,state,confirmed,intents){
  const qualification=this.retrieval.guard.qualification();if(!qualification)return null;const cap=Object.freeze({});workCaptures.set(cap,{store:this.store,database:this.store.repository.db,scope:t,qualification,value:freeze(structuredClone({snapshot:state.snapshot,confirmed,intents}))});
  try{return await capturePromotionWorkTerminal(this.store,t,cap,qualification);}finally{workCaptures.delete(cap);}
 }
 #registerWork(t,terminal,extra=()=>true){
  if(!terminal)return;const qualification=this.retrieval.guard.qualification(),budget=maintenanceQualificationWorkBudget(qualification,this.store);this.retrieval.guard.registerProcessingFinalFence(t,{qualification});
  const current=()=>{extra();assertMaintenanceQualification(qualification,this.store);this.retrieval.guard.assertProcessingCurrent(t);extra();assertMaintenanceQualificationFacts(qualification,this.store);return this.retrieval.guard.assertProcessingFacts(t,{workBudget:budget});};
  registerPromotionWorkTerminal(this.store,t,terminal,{qualification,isCurrent:current,authority:this.retrieval.guard.finalFactsCapability(t)});
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
  const currentAuthority=publicTopicAuthority(prepared.authority);let authorityMatches=same(c.authority,currentAuthority);
  if(!authorityMatches&&this.retrieval.guard.strictQualification){
   // A fresh independent grant may have a new processing epoch. Only a real
   // synchronous identity use admits that distinction; every persistent fact
   // and the original signed confirmation remain exact and are never rewritten.
   await this.read(prepared,t=>this.retrieval.guard.assertProcessingCurrent(t));
   const withoutProcessing=({processingEpoch,...facts})=>facts;authorityMatches=same(withoutProcessing(c.authority),withoutProcessing(currentAuthority));
  }
  if(!authorityMatches||c.expiresAt<=Date.parse(this.store.clock())||row.signature!==await this.keyed(prepared.authority.secret,['confirmed-section-promotion-v1',c]))fail();
  const large=c.manifestSelection,selectionState=large?await this.selection.collect(c.request,prepared):null;
  const snapshot=selectionState?.snapshot||await this.read(prepared,async t=>{await this.authorize(t,prepared,c.identityIds);if(!await this.retrieval.checkConstraintProof(t,prepared,c.proof))fail();return this.snapshot(t,prepared,c.request);});
  if(selectionState)snapshot.entryFacts=await this.read(prepared,t=>this.pinEntryFacts(t,snapshot));if(await this.hash(snapshot)!==c.snapshotDigest)fail();
  return {row,prepared,snapshot,selectionState};
 }
 async check(t,{row,prepared,snapshot,selectionState}){
  await this.retrieval.guard.check(t,prepared);await this.authorize(t,prepared,row.confirmed.identityIds);
  if(!same(row,await t.get(TABLE,row.id))||row.confirmed.expiresAt<=Date.parse(this.store.clock()))fail();
  if(selectionState)await this.selection.check(t,selectionState,row.confirmed.identityIds);else if(!same(snapshot,await this.snapshot(t,prepared,row.confirmed.request)))fail();await this.checkSentEvidence(t,{prepared,snapshot,selectionState});
 }
 async stage(id,{limit=PROMOTION_LIMITS.batch}={}){
  if(!Number.isSafeInteger(limit)||limit<1||limit>PROMOTION_LIMITS.batch)fail();const state=await this.resume(id),{row,snapshot}=state,c=row.confirmed;
  return this.store.foundationWrite(async t=>{
   const original=t;t=this.reader(t);
   await this.check(t,state);if(row.state==='ready'){const terminal=await this.#captureWork(original,state,c,[row]);this.#registerWork(original,terminal);return {workId:id,state:'ready',staged:row.offset,total:c.plan.entryIds.length,revision:row.revision};}const end=Math.min(row.offset+limit,c.plan.entryIds.length),placements=new Map(snapshot.placements.map(p=>[p.entryId,p])),organizations=new Map(snapshot.organizations.map(e=>[e.entryId,e])),writes=[];
   for(let i=row.offset;i<end;i++){
    const entryId=c.plan.entryIds[i],placement=placements.get(entryId),organization=organizations.get(entryId);
    writes.push({id:itemId(id,i),kind:'personal_topic_promotion_placement',version:1,stateKey:1,parentId:id,index:i,entryId,placement,organization,sourceRecordIds:c.sourceRecordIds,inputIds:c.inputIds});
   }
   const next={...row,offset:end,revision:row.revision+1,state:end===c.plan.entryIds.length?'ready':'staging'},terminal=await this.#captureWork(original,state,c,[...writes,next]);for(const write of writes)await t.put(TABLE,write);await t.put(TABLE,next);this.#registerWork(original,terminal);return {workId:id,state:next.state,staged:end,total:c.plan.entryIds.length,revision:next.revision};
  });
 }
 async rollback(id){
  if(!validWorkId(id))fail();await this.store.finishFoundation();
  return this.store.foundationWrite(async t=>{
   t=this.reader(t);
   const row=await t.get(TABLE,id);if(!row)return await t.get('operationReceipts',id.slice(PROMOTION_WORK_PREFIX.length))?{cancelled:false,committed:true}:{cancelled:true};this.validateWork(row);
   for(let i=0;i<row.confirmed.plan.entryIds.length;i++)await t.delete(TABLE,itemId(id,i));await t.delete(TABLE,id);return {cancelled:true};
  });
 }
 async activate(id){
  if(!validWorkId(id))fail();
  const prior=await this.result(id.slice(PROMOTION_WORK_PREFIX.length));if(prior)return prior;
  const state=await this.resume(id),{row,prepared,snapshot}=state,c=row.confirmed;if(row.state!=='ready'||row.offset!==c.plan.entryIds.length)fail();
  const request={kind:'confirmed-section-promotion',...c.request,confirmation:row.signature},digest=await this.hash(request);
  return this.store.foundationWrite(async t=>{
   const original=t;t=this.reader(t);
   const replay=await t.get('operationReceipts',c.request.operationId);if(replay){if(replay.digest!==digest)fail();for(const guard of state.selectionState?.guards||[prepared]){await this.retrieval.guard.check(t,guard,{generation:false});await this.authorize(t,guard,[replay.result.id,replay.result.sourceTopicId]);}return replay.result;}
   await this.check(t,state);if(!await this.retrieval.checkConstraintProof(t,prepared,c.proof))fail();
   const placements=new Map(snapshot.placements.map(p=>[p.entryId,p])),organizations=new Map(snapshot.organizations.map(e=>[e.entryId,e]));
   for(let i=0;i<c.plan.entryIds.length;i++){
    const staged=await t.get(TABLE,itemId(id,i)),entryId=c.plan.entryIds[i];
    if(!staged||staged.kind!=='personal_topic_promotion_placement'||staged.parentId!==id||staged.index!==i||staged.entryId!==entryId||!same(staged.placement,placements.get(entryId))||!same(staged.organization,organizations.get(entryId)))fail();
   }
   const qualification=this.retrieval.guard.qualification(),budget=qualification?maintenanceQualificationWorkBudget(qualification,this.store):null,activation=qualification?Object.freeze({}):null;
   if(activation)activationCaptures.set(activation,{store:this.store,database:this.store.repository.db,scope:original,qualification,value:freeze(structuredClone({operationId:c.request.operationId,topic:snapshot.topic,entries:snapshot.entryFacts}))});
   const terminalCurrentness=qualification?()=>{assertMaintenanceQualification(qualification,this.store);this.retrieval.guard.assertProcessingCurrent(original);assertMaintenanceQualificationFacts(qualification,this.store);return this.retrieval.guard.assertProcessingFacts(original,{workBudget:budget});}:null;
   try{return await applyConfirmedPromotion(this.store,original,{activation,mutationReady:cap=>this.#mutations.set(original.tx,cap),terminalCurrentness,snapshot,confirmed:c,request,digest,id,itemId,origin:'ai',qualification,terminalCompatibility:this.retrieval.guard.strictQualification?null:async targetId=>{for(const guard of state.selectionState?.guards||[prepared])await this.authorize(t,guard,unique([...c.identityIds,snapshot.topic.id,targetId]));},finalFence:async targetId=>{t=this.reader(original);await this.checkSentEvidence(t,state,c.plan.entryIds);if(!await this.retrieval.checkConstraintProof(t,prepared,c.proof))fail();await assertPromotionPathRemovalAllowed(t,snapshot.topic.id,[snapshot.section.sectionId]);for(const guard of state.selectionState?.guards||[prepared])await this.authorize(t,guard,unique([...c.identityIds,snapshot.topic.id,targetId]));if(c.expiresAt<=Date.parse(this.store.clock()))fail();if(qualification){this.retrieval.guard.registerProcessingFinalFence(original,{qualification});return this.retrieval.guard.finalFactsCapability(original);}},authorizeTarget:async topicId=>{for(const guard of state.selectionState?.guards||[prepared])await this.authorize(t,guard,[topicId]);}});}finally{if(activation)activationCaptures.delete(activation);this.#mutations.delete(original.tx);}
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
