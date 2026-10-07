import {fail,keys,idOK,prefix,same,keyedHash,protections,rankBetween} from './thought-model.js';
import {TopicIdentityRetrieval} from './topic-retrieval.js';
import {HiddenTopicCandidates} from './topic-candidates.js';
import {initializeTopicIdentity,registerTopicName,setTopicLifecycle,resolveTopicIdentity} from './topic-identity.js';
import {automaticMembershipAllowed} from './topic-intent.js';
import {journal,receipt,saveReceipt} from './thought-journal.js';
import {hashText} from './dedupe.js';
import {queueSearch} from './library-search.js';
import {readFormationEvidence,formationEntryDescriptor,readableFormationSection,validateFormationSources,FORMATION_WORK_LIMITS} from './topic-formation-evidence.js';
import {evaluateTopicFormation,formationParameters} from './topic-formation-policy.js';

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
 #decision;
 #parameters;
 constructor(store,{resolveProcessing=null,decision=null,parameters=null}={}){
  this.store=store;this.retrieval=new TopicIdentityRetrieval(store,{resolveProcessing});this.candidates=new HiddenTopicCandidates(store,{resolveProcessing});
  if(decision!==null){keys(decision,['version','assess'],['version','assess']);if(typeof decision.assess!=='function'||typeof decision.version!=='string'||!/^[-a-zA-Z0-9_.]{1,80}$/.test(decision.version))fail();this.#decision=Object.freeze({...decision});}
  this.#parameters=parameters===null?null:formationParameters(parameters);
 }
 async read(prepared,fn){return this.store.run(()=>this.store.repository.transaction(false,async t=>{await this.retrieval.guard.check(t,prepared);return fn(t);}));}
 async authorizeTopics(t,prepared,ids){for(let i=0;i<ids.length;i+=100)if(await this.retrieval.guard.processing(t,prepared.evidence,ids.slice(i,i+100))!==prepared.authority.processingEpoch)fail();}
 async prepare(request,{signal=null}={}){
  keys(request,['scope','operationId','entryIds','candidateId','expectedCandidateRevision'],['scope','operationId']);
  if(!idOK(request.operationId)||request.operationId.length<8||!this.#decision||!this.#parameters||request.entryIds!==undefined&&(!Array.isArray(request.entryIds)||request.entryIds.length>FORMATION_WORK_LIMITS.entries||new Set(request.entryIds).size!==request.entryIds.length||request.entryIds.some(x=>!idOK(x))))fail();
  if(request.candidateId!==undefined&&(!idOK(request.candidateId)||!Number.isSafeInteger(request.expectedCandidateRevision)||request.expectedCandidateRevision<0)||request.candidateId===undefined&&request.expectedCandidateRevision!==undefined)fail();
  assertActive(signal);request=structuredClone(request);
  const operation={kind:'personal-topic-formation',...request,decisionVersion:this.#decision.version,parameters:this.#parameters};
  const initial=await this.retrieval.guard.prepare(request.scope),prior=await this.store.priorOperation(operation);
  if(prior){await this.read(initial,t=>this.authorizeTopics(t,initial,prior.topicIds||[]));assertActive(signal);const handle=freeze({...prior,replayed:true});this.#plans.set(handle,{request,operation,signal,prior});return handle;}
  const identities=[],constraints=[];let cursor=null,last;
  do{assertActive(signal);last=await this.retrieval.page({scope:request.scope,cursor});for(const item of last.items)(item.kind==='identity'?identities:constraints).push(item);cursor=last.nextCursor;}while(cursor);
  const prepared=await this.retrieval.prepareCoverage({scope:request.scope,coverage:last.coverage}),topicIds=unique(identities.flatMap(x=>[x.id,x.canonicalId])),sections=[];
  const snapshot=await this.read(prepared,t=>readFormationEvidence(this.store,t,prepared,request.entryIds||[]));await validateFormationSources(snapshot);
  for(const topicId of unique(identities.filter(x=>x.available).map(x=>x.canonicalId))){
   let after=null;do{assertActive(signal);const page=await this.read(prepared,async t=>{await this.authorizeTopics(t,prepared,[topicId]);const topic=await resolveTopicIdentity(t,topicId);const page=await t.rangePage('sections','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]),after,100);for(const item of page.rows)item.value=await readableFormationSection(this.store,t,item.value);return page;});
    for(const {value:section}of page.rows)if(section.lifecycle==='active'&&!section.redirectTo)sections.push({id:section.id,topicId:section.topicId,sectionId:section.sectionId,title:section.title,isDefault:!!section.isDefault,lifecycle:section.lifecycle,revision:section.revision,layoutGeneration:section.layoutGeneration});after=page.next;
   }while(after);
  }
  const decisionInput=freeze(structuredClone({version:1,inputs:snapshot.inputs.map(({sourceIds,...input})=>input),entries:snapshot.entries.map(entry=>formationEntryDescriptor(entry,snapshot.inputs)),identities,sections,constraints,parameters:this.#parameters}));
  const limits=this.store.organizerBudget?.limits;
  if(limits&&(new TextEncoder().encode(JSON.stringify(decisionInput.inputs)).length>limits.maxContentBytes||new TextEncoder().encode(JSON.stringify(decisionInput)).length>limits.maxRequestBytes))fail();
  assertActive(signal);let assessment;try{assessment=freeze(structuredClone(await this.#decision.assess(decisionInput)));}catch{fail();}assertActive(signal);
  const plan=evaluateTopicFormation(assessment,snapshot,identities,sections,this.#parameters);
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
  const implicit=await this.read(prepared,async t=>{const out=[];for(const {item}of entryPlans)if(item){const row=await t.edge('thoughts','byExact',item.exactKey);if(row?.lifecycle==='active')out.push(row.id);}return unique(out);});
  const finalSnapshot=await this.read(prepared,t=>readFormationEvidence(this.store,t,prepared,unique([...(request.entryIds||[]),...implicit])));
  if(!same(snapshot.inputs,finalSnapshot.inputs)||!same(snapshot.sources,finalSnapshot.sources))fail();
  let candidatePlan=null,consumePlan=null;
  if(plan.outcome==='candidate'){
   const names=plan.name?[plan.name]:[];let namedCursor=null,namedPage;do{assertActive(signal);namedPage=await this.retrieval.page({scope:request.scope,names,cursor:namedCursor});namedCursor=namedPage.nextCursor;}while(namedCursor);
   candidatePlan=await this.candidates.prepareRecord({scope:request.scope,names,coverage:namedPage.coverage,...(plan.boundaryKey?{boundaryKey:plan.boundaryKey}:{}),...(request.candidateId?{candidateId:request.candidateId,expectedRevision:request.expectedCandidateRevision}:{})});
  }
  if(request.candidateId&&['create','reuse'].includes(plan.outcome)){
   const candidate=await this.candidates.read(request.candidateId);if(!candidate||candidate.revision!==request.expectedCandidateRevision)fail();
   const complete=candidate.evidence.every(e=>e.selectedFields.every(field=>{const input=snapshot.inputs.find(x=>x.id===e.inputId),spans=assessment.evidence.filter(c=>c.inputId===e.inputId&&c.field===field).sort((a,b)=>a.start-b.start);let end=0;for(const span of spans){if(span.start>end)return false;end=Math.max(end,span.end);}return input&&end===input.fields[field].length;}));
   if(complete)consumePlan=await this.candidates.prepareConsume({candidateId:request.candidateId,expectedRevision:request.expectedCandidateRevision,scope:request.scope,boundaryKey:plan.boundaryKey});
  }
  await this.read(prepared,async t=>{await this.authorizeTopics(t,prepared,topicIds);assertActive(signal);});
  const handle=freeze({...publicReport(plan),decisionVersion:this.#decision.version});this.#plans.set(handle,{request,operation,signal,prepared,plan,projection,entryPlans,snapshot:finalSnapshot,topicIds,nameTokens,proof,candidatePlan,consumePlan});return handle;
 }
 cancel(handle){const state=this.#plans.get(handle);if(!state)fail();state.cancelled=true;}
 async commit(handle){
  const state=this.#plans.get(handle);if(!state||state.cancelled)fail();assertActive(state.signal);
  const {request,operation}=state,current=await this.retrieval.guard.prepare(request.scope),prior=await this.store.priorOperation(operation);
  if(prior){await this.read(current,t=>this.authorizeTopics(t,current,prior.topicIds||[]));assertActive(state.signal);if(state.cancelled)fail();return prior;}
  if(state.prior)fail();
  const {prepared,plan,projection,entryPlans,snapshot,topicIds,nameTokens,proof,candidatePlan,consumePlan}=state,digest=await hashText(JSON.stringify(operation));
  return this.store.foundationWrite(async t=>{
   const replay=await receipt(t,operation,digest);if(replay){await this.retrieval.guard.check(t,current);await this.authorizeTopics(t,current,replay.topicIds||[]);assertActive(state.signal);if(state.cancelled)fail();return replay;}
   const active=()=>{assertActive(state.signal);if(state.cancelled)fail();};active();
   await this.retrieval.guard.check(t,prepared);await this.authorizeTopics(t,prepared,topicIds);
   if(!same(snapshot,await readFormationEvidence(this.store,t,prepared,snapshot.entries.map(e=>e.id))))fail();
   if(!await this.retrieval.checkConstraintProof(t,prepared,proof)&&plan.outcome!=='unassigned')fail();
   for(const {entry,item}of entryPlans)if(item){
    for(const evidence of item.evidence)if((await t.all('thoughtSuppressions','byScope',evidence.scopeToken)).some(x=>x.status==='active'))fail();
    if((await t.all('thoughtSuppressions','byExact',item.exactSignature)).some(x=>x.status==='active'))fail();
    const exact=await t.edge('thoughts','byExact',item.exactKey);if(exact?.lifecycle==='active'&&!snapshot.entries.some(e=>e.id===exact.id&&e.body===entry.body))fail();
   }
   let candidateResult=null;if(candidatePlan){candidateResult=await this.candidates.recordPreparedInTransaction(t,candidatePlan);if(candidateResult.conflict||candidateResult.deferred)fail();}
   let topic=null,section=null;
   if(plan.outcome==='create')topic=await this.#createTopic(t,plan,prepared,nameTokens[0],operation.operationId);
   else if(plan.outcome==='reuse'){
    topic=await resolveTopicIdentity(t,plan.topicId);if(topic.id!==plan.topicId||!['active','dormant'].includes(topic.lifecycle)||topic.layoutJobId||!await this.store.sourcePresent(t,topic.sourceRecordIds))fail();
    if(topic.lifecycle==='dormant'){
     if(topic.protections?.lifecycle?.locked)fail();const before=structuredClone(topic);setTopicLifecycle(topic,'active',{actor:'ai',operationId:operation.operationId,at:this.store.clock()});topic.revision++;topic.organizationRevision++;await t.put('topics',topic);await queueSearch(t,'topic',topic);await journal(this.store,t,{kind:'topic',entityId:topic.id,before,after:topic,fieldMask:['lifecycle'],actor:'ai',reason:'activity',important:true,operationId:operation.operationId,sourceRecordIds:topic.sourceRecordIds||[]});
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
     await this.store.libraryCommit.apply(t,{candidate:{action:'assign',topicRef:'destination',sectionRef:'destination',evidence:[]},evidence:[]},projection,row,'ai',operation.operationId);
     if(!result.topicIds.includes(target.id))result.topicIds.push(target.id);
    }
   }
   if(consumePlan){await this.candidates.consumePreparedInTransaction(t,consumePlan);result.consumedCandidateId=request.candidateId;}
   result.entryIds=unique(result.entryIds);result.createdEntryIds=unique(result.createdEntryIds);result.checks.humanIntent=!proof.blocked;await this.authorizeTopics(t,prepared,result.topicIds);active();await saveReceipt(this.store,t,operation,digest,result);active();return result;
  });
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
