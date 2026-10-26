import {protections,markHuman,rankBetween,fail,prefix,same} from './thought-model.js';
import {initializeTopicIdentity,registerTopicName} from './topic-identity.js';
import {recordMembershipIntent} from './topic-intent.js';
import {journal,saveReceipt} from './thought-journal.js';
import {queueSearch} from './library-search.js';
import {promotionPlacementId,promotionSectionId,promotionOrganization} from './topic-promotion-policy.js';
import {bindingRead} from './thought-binding.js';
import {registerRepositoryFinalReadFence,requireRepositoryTransactionScope} from './idb-repository.js';
import {readSectionPromotionActivationCapture,readSectionPromotionWorkCapture} from './topic-promotion.js';
import {assertMaintenanceQualification,assertMaintenanceQualificationFacts,maintenanceQualificationReader,maintenanceQualificationWorkBudget} from './ai-usage/maintenance-qualification.js';
import {contextScopeTransactionReader,CONTEXT_TOPIC_SCOPE_LIMITS} from './context-topic-scope.js';
import {rootReadAuthority} from './organizer/root-read.js';
import {assertPromotionPathRemovalAllowed} from './topic-promotion-access.js';
const TABLE='organizerWorkItems';
const qualifiedMutations=new WeakMap();
const mutationFields={thoughts:['id','revision','contentRevision','organizationRevision','bodyBinding','workingInputId','bindingRevision','bindingLength','lifecycle','sourceRecordIds','inputRefs','thoughtText','title','note'],topics:['id','topicId','sectionId','revision','organizationRevision','activeLayoutGeneration','layoutGeneration','lifecycle','name','nameKey','summary']};
const mutationText={thoughts:['thoughtText','title','note'],topics:['name','nameKey','summary']};
const immutable=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))immutable(child);Object.freeze(value);}return value;};
function originalPromotionScope(store,t){for(let scope=t,depth=0;scope&&depth<16;scope=Object.getPrototypeOf(scope),depth++){try{requireRepositoryTransactionScope(store.repository,scope);return scope;}catch(error){if(Object.hasOwn(scope,'tx'))throw error;}}fail();}
const mutationProjection=(table,row)=>Object.fromEntries(mutationFields[table].filter(key=>Object.hasOwn(row,key)).map(key=>[key,structuredClone(row[key])]));
// Only applyConfirmedPromotion mints this capability, after the original
// SectionPromotionService has privately attested its actual activation checks.
// Consumers get immutable pre-put facts, never a live row or a DTO mint API.
export function readPromotionQualifiedMutation(token,store,t,qualification){
 const record=qualifiedMutations.get(token);if(!record||!record.active||record.store!==store||record.database!==store.repository.db||record.qualification!==qualification||originalPromotionScope(store,t)!==record.scope)fail();
 requireRepositoryTransactionScope(store.repository,record.scope);return record.view;
}
// The qualified reader uses this fixed original-writer checker before a
// post-mutation row can reach an older whole-row clone. Its exact expected
// data is the already retained original pre-put intent, never a live refresh.
export function assertPromotionQualifiedOwnRow(token,store,t,qualification,table,row){
 readPromotionQualifiedMutation(token,store,t,qualification);const record=qualifiedMutations.get(token),id=Object.getOwnPropertyDescriptor(row||{},'id');
 if(!id||!Object.hasOwn(id,'value')||!['thoughts','topics'].includes(table))fail();
 const expected=record.exact.get(JSON.stringify([table,id.value]));
 if(!expected||!sameOwnData(row,expected,()=>assertMaintenanceQualificationFacts(qualification,store)))fail();return true;
}
function mutationCapture(store,t,qualification,activation){
 const source=readSectionPromotionActivationCapture(activation,store,t,qualification);if(!source)fail();
 const scope=originalPromotionScope(store,t),before=new Map(source.entries.map(row=>[JSON.stringify(['thoughts',row.id]),immutable(mutationProjection('thoughts',row))]));before.set(JSON.stringify(['topics',source.topic.id]),immutable(mutationProjection('topics',source.topic)));
 const token=Object.freeze({}),record={store,database:store.repository.db,scope,qualification,operationId:source.operationId,active:true,before,rows:new Map(),exact:new Map(),view:Object.freeze({rows:Object.freeze([])})};qualifiedMutations.set(token,record);return {token,record};
}
function plannedMutation(record,table,key,value){
 if(!record||!mutationFields[table]||value===null)return null;const encoded=JSON.stringify([table,key]),before=record.before.get(encoded);if(!before)return null;
 const after=mutationProjection(table,value);if(after.revision!==before.revision+1||after.organizationRevision!==before.organizationRevision+1)fail();
 for(const field of mutationText[table])if(!same(before[field],after[field]))fail();
 for(const field of mutationFields[table])if(!['revision','organizationRevision'].includes(field)&&!mutationText[table].includes(field)&&!same(before[field],after[field]))fail();
 return immutable({table,key,before,after});
}
function acceptMutation(record,row,expected){if(!row)return;const key=JSON.stringify([row.table,row.key]);record.rows.set(key,row);record.exact.set(key,immutable(expected));record.view=Object.freeze({rows:Object.freeze([...record.rows.values()])});}
function sameOwnData(actual,expected,current=()=>{}){
 current();if(Object.is(actual,expected))return true;if(actual===null||expected===null||typeof actual!=='object'||typeof expected!=='object'||Array.isArray(actual)!==Array.isArray(expected))return false;
 const a=Object.getOwnPropertyDescriptors(actual),b=Object.getOwnPropertyDescriptors(expected),ak=Reflect.ownKeys(a),bk=Reflect.ownKeys(b);if(ak.length!==bk.length||ak.some(key=>!Object.hasOwn(b,key)))return false;
 for(const key of bk){current();if(!Object.hasOwn(a[key],'value')||!Object.hasOwn(b[key],'value')||!sameOwnData(a[key].value,b[key].value,current))return false;}return true;
}


// Explicit private CAS projection. The byte cap is a resource bound, never a
// processing grant; a production caller still needs each semantic field's grant.
const ENTRY_FACT_FIELDS=['id','revision','contentRevision','organizationRevision','dependencyRevision','thoughtText','title','note','type','formation','bodyBinding','workingInputId','bindingRevision','bindingLength','thoughtEditedAt','origin','provenanceType','lifecycle','freshness','integrity','staleReasons','sourceRecordIds','inputRefs','hasHumanAction','userEdited','protections','authorship','organizationIntents','topics'];
export function promotionEntryFacts(row){
 if(!row)fail();const facts={};for(const key of ENTRY_FACT_FIELDS)if(Object.hasOwn(row,key))facts[key]=structuredClone(row[key]);return facts;
}

const pick=(row,fields)=>row?Object.fromEntries(fields.filter(key=>Object.hasOwn(row,key)).map(key=>[key,structuredClone(row[key])])):null;
const rootIds=['thought-sequence','thought-epoch','input-delta-sequence','revision-sequence','recovery-restore-epoch','backup-data-generation'];
const inputFacts=row=>row?{id:row.id,value:pick(row.value,['id','documentId','libraryText','note','excluded','branchStatus','provenance','originalTextReference'])}:null;
const sourceFacts=row=>row?{id:row.id,value:pick(row.value,['originalText'])}:null;
const indexFacts=row=>pick(row,['id','sourceKey','dedupeKey']);
const identityFacts=row=>{
 if(!row)return null;const out=pick(row,['id','name','nameKey','revision','organizationRevision','activeLayoutGeneration','defaultSectionId','lifecycle','redirectTo','layoutJobId','sourceRecordIds']);
 if(row.identity){out.identity=pick(row.identity,['version','revision','origin','scope','legacy','noRecreation','nameToken']);if(Object.hasOwn(row.identity,'aliases'))out.identity.aliases=row.identity.aliases.map(x=>pick(x,['token','actor','revision','operationId','at']));if(Object.hasOwn(row.identity,'lifecycleIntent'))out.identity.lifecycleIntent=pick(row.identity.lifecycleIntent,['actor','operationId','at','previous','to']);}
 if(row.protections)out.protections=Object.fromEntries(['name','title','keep','lifecycle','organization'].filter(k=>Object.hasOwn(row.protections,k)).map(k=>[k,pick(row.protections[k],['locked','reason','operationId','at'])]));return out;
};
// Freeze pre-mutation facts only. Text is limited to the original independently
// granted Input/Source closure; this never enumerates unrelated canonical bodies.
async function captureTerminalFacts(store,t,c,qualification,retain){
 const reader=qualification?maintenanceQualificationReader(qualification,store,t,{strictTopicIdentity:true}):t,facts=[],ranges=[];
 const add=async(table,key,project=row=>row??null)=>{const expected=retain(project(await reader.get(table,key)));facts.push({table,key,project,expected});return expected;};
 for(const id of ['gate','thought-library','thought-suppression-key'])await add('meta',id);
 for(const inputId of c.inputIds){
  const input=await add('blocks',inputId,inputFacts);await add('inputStates',inputId);
  for(const ref of input?.value?.provenance||[]){
   const index=await add('recordIndex',ref.sourceRecordId,indexFacts);await add('records',ref.sourceRecordId,sourceFacts);
   if(index){await add('tombstones','source:'+index.sourceKey);await add('tombstones','snapshot:'+index.dedupeKey);}
  }
 }
 for(const topicId of c.identityIds)await add('topics',topicId,identityFacts);
 // The full restrictive metadata membership is small/bounded independently of
 // text selection. Exact keys + count detect delete/add/ABA without a final scan.
 for(const p of ['memory:topic:','memory:section:','topicKeepSeparate:']){
  let after=null,count=0;do{const page=await reader.primaryRangePage('meta',{prefix:p,after,limit:100});
   for(const {value}of page.rows){if(++count>CONTEXT_TOPIC_SCOPE_LIMITS.refs)fail();facts.push({table:'meta',key:value.id,project:row=>row??null,expected:retain(value)});}after=page.next;
  }while(after);ranges.push({table:'meta',key:IDBKeyRange.bound(p,p+'\uffff',false,true),expected:count});
 }
 return {facts,ranges};
}
function terminalWork(qualification,store,table,row,request=false){
 if(!qualification)return;
 assertMaintenanceQualification(qualification,store);const budget=maintenanceQualificationWorkBudget(qualification,store);
 if(request){if(budget.reads>=CONTEXT_TOPIC_SCOPE_LIMITS.reads)fail();budget.reads++;}
 else if(row){const ids=budget.seen.get(table)||new Set();if(typeof row.id!=='string')fail();ids.add(row.id);budget.seen.set(table,ids);if(ids.size>CONTEXT_TOPIC_SCOPE_LIMITS.refs)fail();}
}
function registerPromotionTerminal(store,t,{intents,graphs,expectedRoot,terminalFacts,snapshot,c,topicId,sectionId,sourceCountBefore,qualification,isCurrent,compatibilityRecheck,authority=null}){
 const writes=[...intents.values()].map(x=>structuredClone(x)),root=structuredClone(expectedRoot),facts=terminalFacts.facts,ranges=terminalFacts.ranges;
 if(t.backupChanged)root[5]=(root[5]||0)+1;
 const membership=graphs.map(graph=>{const expected=new Map(graph.rows.map(row=>[row.id,structuredClone(row)]));for(const {table,key,value}of writes)if(table===graph.table){if(value===null)expected.delete(key);else if(graph.table==='placements'?value.entryId===graph.entryId:graph.table==='dependencies'?value.targetKind==='entry'&&value.targetId===graph.entryId:value.ownerKind==='entry'&&value.ownerId===graph.entryId)expected.set(key,value);}return {...graph,rows:[...expected.values()]};});
 const own=new Map(writes.map(x=>[JSON.stringify([x.table,x.key]),x.value]));
 const get=function*(table,key){terminalWork(qualification,store,table,null,true);const row=yield {method:'get',table,key};terminalWork(qualification,store,table,row);return row;};
 const count=function*(table,index,key){terminalWork(qualification,store,table,null,true);return yield {method:'count',table,...(index?{index}:{}),key};};
 const database=store.repository.db,current=()=>{if(database!==store.repository.db||c.expiresAt<=Date.parse(store.clock()))fail();if(qualification)assertMaintenanceQualification(qualification,store);return isCurrent?isCurrent()===true:true;};
 registerRepositoryFinalReadFence(store.repository,t,{authority,isCurrent:current,compatibilityRecheck,plan:function*(){
  const actual=[];for(const key of rootIds)actual.push((yield*get('meta',key))?.value??null);const filter=yield*get('meta','smart-filter');actual.push(['mode','phase','policyEpoch','decisionSequence','filterVersion','policyVersion','classifierVersion'].map(k=>filter?.[k]??null));if(!same(actual,root))fail();
  for(const {table,key,value}of writes)if(!sameOwnData((yield*get(table,key))??null,value,()=>{if(qualification)assertMaintenanceQualificationFacts(qualification,store);}))fail();
  for(const graph of membership){if((yield*count(graph.table,graph.index,graph.range))!==graph.rows.length)fail();for(const row of graph.rows)if(!same(yield*get(graph.table,row.id),row))fail();}
  for(const fact of facts){const key=JSON.stringify([fact.table,fact.key]),expected=own.has(key)?fact.project(own.get(key)):fact.expected;if(!same(fact.project(yield*get(fact.table,fact.key)),expected))fail();}
  for(const range of ranges)if((yield*count(range.table,null,range.key))!==range.expected)fail();
  if(!same(yield*get('sections',snapshot.section.id),snapshot.section))fail();
  if((yield*count('placements','bySectionOrder',prefix([snapshot.topic.id,snapshot.topic.activeLayoutGeneration,snapshot.section.sectionId,0])))!==sourceCountBefore-c.plan.entryIds.length||(yield*count('placements','bySectionOrder',prefix([topicId,1,sectionId,0])))!==c.plan.entryIds.length)fail();
  return true;
 }});
}

// Preparation/staging writes have no authorized domain mutation. Their facts
// are captured before the original work put, through the same granted reader.
const workTerminals=new WeakMap();
export async function capturePromotionWorkTerminal(store,t,original,qualification){
 const source=readSectionPromotionWorkCapture(original,store,t,qualification),{snapshot,confirmed:c,intents}=source,reader=maintenanceQualificationReader(qualification,store,t);let bytes=0;
 const retain=value=>{const copy=structuredClone(value);bytes+=new TextEncoder().encode(JSON.stringify(copy)).length;if(bytes>8*1024*1024)fail();return copy;},facts=await captureTerminalFacts(store,t,c,qualification,retain),root=JSON.parse(await rootReadAuthority(reader)),graphs=[];
 for(const row of [snapshot.topic,snapshot.section]){const table=row===snapshot.topic?'topics':'sections';if(!same(await reader.get(table,row.id),row))fail();facts.facts.push({table,key:row.id,project:row=>row??null,expected:retain(row)});}
 for(const entry of snapshot.entryFacts){if(!same(promotionEntryFacts(await reader.get('thoughts',entry.id)),entry))fail();facts.facts.push({table:'thoughts',key:entry.id,project:promotionEntryFacts,expected:retain(entry)});}
 for(const entryId of c.plan.entryIds)for(const [table,index,key]of [['placements','byEntry',[entryId]],['dependencies','byTarget',['entry',entryId]],['provenance','byOwner',['entry',entryId]]]){const range=prefix(key),rows=await reader.all(table,index,range,1001);if(rows.length>1000)fail();graphs.push({table,index,range,rows:retain(rows)});}
 const sectionRange=prefix([snapshot.topic.id,snapshot.topic.activeLayoutGeneration,snapshot.section.sectionId,0]),sectionCount=await reader.count('placements','bySectionOrder',sectionRange);if(c.request.selection==='whole_section'&&sectionCount!==snapshot.placements.length)fail();
 const handle=Object.freeze({});workTerminals.set(handle,{store,database:store.repository.db,t,qualification,c,root,backupChanged:!!t.backupChanged,facts,graphs,sectionRange,sectionCount,intents:retain(intents)});return handle;
}
export function registerPromotionWorkTerminal(store,t,handle,{qualification,isCurrent,authority}){
 const p=workTerminals.get(handle);if(!p||p.store!==store||p.database!==store.repository.db||p.t!==t||p.qualification!==qualification||typeof isCurrent!=='function'||!authority)fail();requireRepositoryTransactionScope(store.repository,t);workTerminals.delete(handle);
 if(!!t.backupChanged!==p.backupChanged)fail();const expectedRoot=[...p.root];if(p.backupChanged)expectedRoot[5]=(expectedRoot[5]||0)+1;
 const get=function*(table,key){terminalWork(qualification,store,table,null,true);const row=yield {method:'get',table,key};terminalWork(qualification,store,table,row);return row;},count=function*(table,index,key){terminalWork(qualification,store,table,null,true);return yield {method:'count',table,...(index?{index}:{}),key};};
 registerRepositoryFinalReadFence(store.repository,t,{authority,isCurrent:()=>{if(p.database!==store.repository.db||p.c.expiresAt<=Date.parse(store.clock()))fail();return isCurrent()===true;},plan:function*(){
  const root=[];for(const key of rootIds)root.push((yield*get('meta',key))?.value??null);const filter=yield*get('meta','smart-filter');root.push(['mode','phase','policyEpoch','decisionSequence','filterVersion','policyVersion','classifierVersion'].map(k=>filter?.[k]??null));if(!same(root,expectedRoot))fail();
  for(const row of p.intents)if(!sameOwnData(yield*get(TABLE,row.id),row,()=>assertMaintenanceQualificationFacts(qualification,store)))fail();
  for(const fact of p.facts.facts)if(!sameOwnData(fact.project(yield*get(fact.table,fact.key)),fact.expected,()=>assertMaintenanceQualificationFacts(qualification,store)))fail();
  for(const range of p.facts.ranges)if((yield*count(range.table,null,range.key))!==range.expected)fail();
  for(const graph of p.graphs){if((yield*count(graph.table,graph.index,graph.range))!==graph.rows.length)fail();for(const row of graph.rows)if(!sameOwnData(yield*get(graph.table,row.id),row,()=>assertMaintenanceQualificationFacts(qualification,store)))fail();}
  if((yield*count('placements','bySectionOrder',p.sectionRange))!==p.sectionCount)fail();return true;
 }});
}

// Shared transaction body for the two trusted, explicitly confirmed Topic04
// entry points. Callers own opaque preparation, current authority, exact staged
// selection and CAS checks. An assessor can never supply origin or this call.
export async function applyConfirmedPromotion(store,t,{snapshot,confirmed:c,request,digest,id,itemId,origin,scope,authorizeTarget,finalFence=null,qualification=null,terminalCurrentness=null,terminalCompatibility=null,activation=null,mutationReady=null}){
   if(finalFence!==null&&typeof finalFence!=='function')fail();
   const original=qualification?originalPromotionScope(store,t):t,mutation=qualification?mutationCapture(store,original,qualification,activation):null;
   try{
   if(mutation){if(typeof mutationReady!=='function')fail();mutationReady(mutation.token);t=maintenanceQualificationReader(qualification,store,original,{ownMutation:mutation.token});}
   // Private original-writer intents are captured BEFORE put/delete, with nested
   // injected writes excluded. They describe this mutation, not refreshed rows.
   const intents=new Map(),graphs=[];let bytes=0,depth=0,expectedRoot=null,sourceCountBefore=null,terminalFacts=null;
   const retain=value=>{const copy=structuredClone(value);bytes+=new TextEncoder().encode(JSON.stringify(copy)).length;if(bytes>8*1024*1024)fail();return copy;};
   const originalPut=t.put,originalDelete=t.delete;
   if(finalFence){
    if(qualification){assertMaintenanceQualification(qualification,store);if(typeof terminalCurrentness!=='function'||terminalCompatibility!==null)fail();}
    terminalFacts=await captureTerminalFacts(store,t,c,qualification,retain);
    expectedRoot=JSON.parse(await rootReadAuthority(t));sourceCountBefore=await t.count('placements','bySectionOrder',prefix([snapshot.topic.id,snapshot.topic.activeLayoutGeneration,snapshot.section.sectionId,0]));if(c.request.selection==='whole_section'&&sourceCountBefore!==snapshot.placements.length)fail();
    for(const entryId of c.plan.entryIds)for(const [table,index,key]of [['placements','byEntry',[entryId]],['dependencies','byTarget',['entry',entryId]],['provenance','byOwner',['entry',entryId]]]){const range=prefix(key),rows=await t.all(table,index,range,1001);if(rows.length>1000)fail();bytes+=new TextEncoder().encode(JSON.stringify(rows)).length;if(bytes>8*1024*1024)fail();graphs.push({table,index,range,rows,entryId});}
    const record=(table,key,value)=>{if(depth)return;const encoded=JSON.stringify([table,key]),prior=intents.get(encoded),next={table,key,value:value===null?null:structuredClone(value)};bytes-=prior?new TextEncoder().encode(JSON.stringify(prior)).length:0;bytes+=new TextEncoder().encode(JSON.stringify(next)).length;if(bytes>8*1024*1024)fail();intents.set(encoded,next);if(table==='meta'){const i=rootIds.indexOf(key);if(i>=0)expectedRoot[i]=value?.value??null;else if(key==='smart-filter')expectedRoot[6]=['mode','phase','policyEpoch','decisionSequence','filterVersion','policyVersion','classifierVersion'].map(k=>value?.[k]??null);}return next;};
    t.put=async(table,value,key)=>{const outer=depth===0,id=key===undefined?value?.id:key,next=outer?plannedMutation(mutation?.record,table,id,value):null;const captured=record(table,id,value);if(next)immutable(captured.value);depth++;try{const result=await originalPut.call(t,table,value,key);if(outer)acceptMutation(mutation?.record,next,captured?.value);return result;}finally{depth--;}};
    t.delete=async(table,key)=>{record(table,key,null);depth++;try{return await originalDelete.call(t,table,key);}finally{depth--;}};
   }
   try{
   await assertPromotionPathRemovalAllowed(t,snapshot.topic.id,[snapshot.section.sectionId]);
   const operationId=c.request.operationId,at=store.clock(),topicId=store.uuid(),sectionId=store.uuid(),rank=rankBetween();
   const target={id:topicId,defaultSectionId:sectionId,name:c.plan.name,nameKey:c.plan.name.toLocaleLowerCase(),summary:'',sourceRecordIds:origin==='user'?[]:c.sourceRecordIds,revision:0,organizationRevision:1,activeLayoutGeneration:1,activeKey:0,pinKey:1,pinRank:rank,negativeUpdatedSequence:0,lifecycle:'active',createdBy:origin,createdAt:at,protections:protections(origin,operationId,at)};
   initializeTopicIdentity(target,origin);for(const field of ['name','organization'])markHuman(target,field,operationId,at,'section_promotion');
   await authorizeTarget(topicId);await registerTopicName(t,target,c.nameToken);
   const section={id:promotionSectionId(topicId,1,sectionId),topicId,sectionId,layoutGeneration:1,isDefault:true,title:'',rank,revision:0,activeKey:0,lifecycle:'active',protections:protections('user',operationId,at)};markHuman(section,'title',operationId,at,'section_promotion');markHuman(section,'order',operationId,at,'section_promotion');
   await t.put('topics',target);await t.put('sections',section);
   const mappings=[],entryFacts=new Map((snapshot.entryFacts||[]).map(row=>[row.id,row])),sourcePlacements=new Map(snapshot.placements.map(row=>[row.entryId,row]));
   for(const entryId of c.plan.entryIds){
    const sourcePlacement=await t.get('placements',promotionPlacementId(snapshot.topic.id,snapshot.topic.activeLayoutGeneration,entryId)),entry=await t.get('thoughts',entryId),beforeIntent=promotionOrganization(entry),before=structuredClone(sourcePlacement);
    if(!same(sourcePlacement,sourcePlacements.get(entryId))||!same({entryId,...promotionOrganization(entry)},snapshot.organizations.find(row=>row.entryId===entryId)))fail();
    if(finalFence){if(!entryFacts.has(entryId)||!same(promotionEntryFacts(entry),entryFacts.get(entryId)))fail();}
    else if(snapshot.entries){const expected=snapshot.entries.find(row=>row.entryId===entryId),bound=await bindingRead(store,t,entry);if(!expected||bound.thoughtText!==expected.body||entry.revision!==expected.revision||entry.contentRevision!==expected.contentRevision||entry.bodyBinding!==expected.bodyBinding||(entry.workingInputId??null)!==expected.workingInputId||entry.origin!==expected.origin||entry.provenanceType!==expected.provenanceType||!same(entry.sourceRecordIds||[],expected.sourceRecordIds))fail();}
    Object.assign(sourcePlacement,{lifecycle:'removed',activeKey:1,revision:sourcePlacement.revision+1,membershipAuthorship:'user',sectionProtection:true,orderProtection:true,membershipOperationId:operationId,excludedByUser:true});
    const destination={...before,id:promotionPlacementId(topicId,1,entryId),topicId,layoutGeneration:1,sectionId,sectionRank:rank,revision:0,lifecycle:'active',activeKey:0,membershipAuthorship:'user',sectionProtection:true,orderProtection:true,membershipOperationId:operationId};delete destination.excludedByUser;delete destination.removedWithTopicOperationId;
    recordMembershipIntent(entry,snapshot.topic.id,false,operationId,at,'user_edit');recordMembershipIntent(entry,topicId,true,operationId,at,'user_edit');entry.organizationRevision++;entry.revision++;
    await t.put('thoughts',entry);await t.put('placements',sourcePlacement);await t.put('placements',destination);
    const base={actor:'user',reason:'section_promotion',important:true,operationId,sourceRecordIds:entry.sourceRecordIds};
    const sourceRevisionId=await journal(store,t,{...base,kind:'placement',entityId:sourcePlacement.id,documentId:snapshot.topic.id,before,after:sourcePlacement,fieldMask:['membership'],baseRevision:before.revision,afterRevision:sourcePlacement.revision});
    const targetRevisionId=await journal(store,t,{...base,kind:'placement',entityId:destination.id,documentId:topicId,before:null,after:destination,fieldMask:['membership','section','order'],afterRevision:0});
    const intentRevisionId=await journal(store,t,{...base,kind:'membership_intent',entityId:entryId,before:beforeIntent,after:promotionOrganization(entry),fieldMask:['membership'],baseRevision:beforeIntent.organizationRevision,afterRevision:entry.organizationRevision});
    mappings.push({entryId,sourcePlacementId:sourcePlacement.id,targetPlacementId:destination.id,sourceRevisionId,targetRevisionId,intentRevisionId});await queueSearch(t,'entry',entry);
   }
   const source=structuredClone(await t.get('topics',snapshot.topic.id)),beforeSource=structuredClone(source);if(!same(source,snapshot.topic))fail();source.organizationRevision++;source.revision++;
   await store.touchTopic(t,source);await store.touchTopic(t,target);await queueSearch(t,'topic',source);await queueSearch(t,'topic',target);
   const sourceTopicRevisionId=await journal(store,t,{kind:'topic',entityId:source.id,before:beforeSource,after:source,fieldMask:['organization'],actor:'user',reason:'section_promotion',important:true,operationId,sourceRecordIds:[]});
   const topicRevisionId=await journal(store,t,{kind:'topic',entityId:topicId,before:null,after:target,fieldMask:['name','organization'],actor:'user',reason:'section_promotion',important:true,operationId,sourceRecordIds:target.sourceRecordIds});
   await journal(store,t,{kind:'section',entityId:sectionId,documentId:topicId,before:null,after:section,fieldMask:['title','rank'],actor:'user',reason:'section_promotion',important:true,operationId,sourceRecordIds:[]});
   const result={kind:'personal_topic_promotion',version:1,intentMode:origin==='user'?'user_structural':'ai_proposal',id:topicId,operationId,historyOperationId:operationId,state:'after',sourceTopicId:source.id,sourceSectionId:snapshot.section.sectionId,sourceGeneration:source.activeLayoutGeneration,defaultSectionId:sectionId,entryIds:c.plan.entryIds,selection:c.request.selection,scope:scope??c.request.scope,mappings,sourceTopicRevisionId,topicRevisionId};
   for(let i=0;i<c.plan.entryIds.length;i++)await t.delete(TABLE,itemId(id,i));await t.delete(TABLE,id);
   await authorizeTarget(topicId);await saveReceipt(store,t,request,digest,result);
   // The actual receipt/history writes are still inside this original transaction.
   await assertPromotionPathRemovalAllowed(t,snapshot.topic.id,[snapshot.section.sectionId]);
   if(finalFence){
    if(await rootReadAuthority(t)!==JSON.stringify(expectedRoot))fail();
    const ownReader=qualification?contextScopeTransactionReader(store,original,maintenanceQualificationWorkBudget(qualification,store)):t;
    for(const {table,key,value}of intents.values()){if(qualification)assertMaintenanceQualification(qualification,store);const actual=await ownReader.get(table,key);if(qualification)assertMaintenanceQualification(qualification,store);if(!sameOwnData(actual??null,value,()=>{if(qualification)assertMaintenanceQualificationFacts(qualification,store);}))fail();}
    for(const graph of graphs){const expected=new Map(graph.rows.map(row=>[row.id,row]));for(const {table,key,value}of intents.values())if(table===graph.table){if(value===null)expected.delete(key);else if(graph.table==='placements'?value.entryId===graph.entryId:graph.table==='dependencies'?value.targetKind==='entry'&&value.targetId===graph.entryId:value.ownerKind==='entry'&&value.ownerId===graph.entryId)expected.set(key,value);}const rows=await t.all(graph.table,graph.index,graph.range,1001),sort=xs=>xs.sort((a,b)=>a.id.localeCompare(b.id));if(!same(sort(rows),sort([...expected.values()])))fail();}
    if(!same(await t.get('sections',snapshot.section.id),snapshot.section))fail();
    const sourceCount=await t.count('placements','bySectionOrder',prefix([snapshot.topic.id,snapshot.topic.activeLayoutGeneration,snapshot.section.sectionId,0])),targetCount=await t.count('placements','bySectionOrder',prefix([topicId,1,sectionId,0]));
    if(sourceCount!==sourceCountBefore-c.plan.entryIds.length||targetCount!==c.plan.entryIds.length)fail();
    // No storage read follows the terminal original evidence/authority fence.
    const authority=await finalFence(topicId);if(qualification&&!authority)fail();
    registerPromotionTerminal(store,original,{intents,graphs,expectedRoot,terminalFacts,snapshot,c,topicId,sectionId,sourceCountBefore,qualification,authority:authority??null,isCurrent:terminalCurrentness,compatibilityRecheck:terminalCompatibility?()=>terminalCompatibility(topicId):null});
   }
   return result;
   }finally{t.put=originalPut;t.delete=originalDelete;intents.clear();graphs.length=0;}
   }finally{if(mutation){mutation.record.active=false;mutation.record.rows.clear();mutation.record.before.clear();mutation.record.exact.clear();}}
}
