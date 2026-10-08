import {revisionShouldPrune,REVISION_POLICY} from '../ia-store.js';
import {ownerVersion} from '../library-search.js';
import {planHumanTopicCreation,planHumanEntryCreation,planHumanTopicTouch,planHumanEntryFields,finishHumanEntryFields} from '../thought-store.js';
import {planJournalRevision} from '../thought-journal.js';
import {prepareTopicName,assertTopicIdentityBase} from '../topic-identity.js';
import {keys,idOK,revisionOK,prefix,keyedHash,validateFields,entrySnapshot,ENTRY_FIELDS} from '../thought-model.js';
import {hashText} from '../dedupe.js';
import {CONSENT_VERSION,ArchiveError} from '../constants.js';
import {prepareHumanAllocation,beginHumanAllocation,finishHumanAllocation,releaseHumanAllocation} from './human-library-allocation.js';
import {clone,equal,fail} from './value.js';
const plans=new WeakMap();
async function base(store,core,t){
 const control=await store.control(t);if(!control.settings.enabled||control.settings.consentVersion!==CONSENT_VERSION)fail('BNS_HUMAN_PERMISSION');
 return {namespace:await core.bind(t),generation:(await core.get(t,'generation'))?.value||0,epoch:(await t.get('meta','recovery-restore-epoch'))?.value??null,secret:(await t.get('meta','thought-suppression-key'))?.value,settings:control.settings,revision:await t.get('meta','revision-sequence')??null,sequence:await t.get('meta','thought-sequence')??null,library:await t.get('meta','thought-library')};
}
export async function humanPlanEntry(store,core){
 await store.finishFoundation();if(core.repository!==store.repository)fail('BNS_HUMAN_BINDING');return store.run(()=>core.transaction(false,t=>base(store,core,t)));
}
// First named planner: actual Topic/default Section/both baseline histories and
// the existing Library touch/operation receipt. No callback or virtual store.
export async function prepareHumanTopicPlan(store,core,request,entry){
 keys(request,['name','operationId'],['name','operationId']);if(typeof request.name!=='string'||!request.name.trim()||request.name.length>300||!idOK(request.operationId)||request.operationId.length<8)fail('BNS_HUMAN_REQUEST');
 if(!store.libraryDocumentMode||!entry)fail('BNS_HUMAN_UNSUPPORTED');
 const nameIdentity=await prepareTopicName(store,request.name),before=await store.run(()=>core.transaction(false,async t=>{await assertTopicIdentityBase(t,nameIdentity);return {...await base(store,core,t),registry:await t.get('meta','personalTopicName:'+nameIdentity.token)??null,receipt:await t.get('operationReceipts',request.operationId)??null};}));
 const {registry,receipt,...cut}=before;if(!equal(cut,entry)||cut.library?.sealed)fail('BNS_HUMAN_CHANGED');
 const requestDigest=await hashText(JSON.stringify(request));if(receipt){if(receipt.digest!==requestDigest)fail('BNS_HUMAN_OPERATION_COLLISION');return {duplicate:true,result:clone(receipt.result)};}
 const allocation=prepareHumanAllocation(store),id=allocation.uuid(),sectionId=allocation.uuid(),at=allocation.clock(),{topic,section}=planHumanTopicCreation(request,{id,sectionId,at});topic.identity.nameToken=nameIdentity.token;
 let revisionSequence=before.revision?.value||0,thoughtSequence=before.sequence?.value||0;
 const history=[];for(const data of [{kind:'topic',entityId:id,before:null,after:clone(topic),fieldMask:['name']},{kind:'section',entityId:sectionId,documentId:id,before:null,after:clone(section),fieldMask:['title','rank']}]){
  const p=planJournalRevision({...data,actor:'user',reason:'baseline',important:true,operationId:request.operationId,sourceRecordIds:[]},null,allocation.clock()),sequence=++revisionSequence,historyId=allocation.uuid();history.push({...p.row,id:historyId,sequence,listKey:[p.entityKey,sequence],documentList:[p.row.documentId,sequence]});allocation.clock(); // existing prune invocation, even an empty new entity history
 }
 topic.searchVersion=ownerVersion('topic',topic);Object.assign(topic,planHumanTopicTouch(topic,{at:allocation.clock(),sequence:++thoughtSequence}));section.searchVersion=ownerVersion('section',section);
 const result={id,sectionId,revision:0},operationReceipt={id:request.operationId,namespace:'thought-library',schemaVersion:1,ownerId:id,operationSequence:++thoughtSequence,createdAt:allocation.clock(),digest:requestDigest,result};
 const collision=await store.run(()=>core.transaction(false,async t=>({index:await t.get('meta','thought-read-index:v1:topic:'+id),topic:await t.get('topics',id),section:await t.get('sections',section.id),history:await Promise.all(history.map(r=>t.get('revisions',r.id)))})));
 if(collision.index||collision.topic||collision.section||collision.history.some(Boolean))fail('BNS_HUMAN_ID_COLLISION');
 const cap=Object.freeze({});plans.set(cap,{kind:'topic',store,core,entry:clone(entry),before,request:clone(request),nameIdentity,allocation:allocation.seal(),events:allocation.events(),topic,section,history,result,operationReceipt,revisionSequence,thoughtSequence});return cap;
}
export function humanTopicPlan(cap){const p=plans.get(cap);if(p?.kind!=='topic')fail('BNS_HUMAN_PLAN_REQUIRED');return {topic:clone(p.topic),section:clone(p.section),history:clone(p.history),result:clone(p.result),operationReceipt:clone(p.operationReceipt),events:clone(p.events)};}
export async function requireHumanTopicPlan(t,cap,store,core){const p=plans.get(cap);if(p?.kind!=='topic'||p.store!==store||p.core!==core)fail('BNS_HUMAN_PLAN_REQUIRED');if(!equal(await base(store,core,t),p.entry))fail('BNS_HUMAN_CHANGED');await assertTopicIdentityBase(t,p.nameIdentity);if(!equal(await t.get('meta','personalTopicName:'+p.nameIdentity.token)??null,p.before.registry)||await t.get('operationReceipts',p.request.operationId)||await t.get('topics',p.topic.id)||await t.get('meta','thought-read-index:v1:topic:'+p.topic.id)||await t.get('sections',p.section.id))fail('BNS_HUMAN_CHANGED');for(const h of p.history)if(await t.get('revisions',h.id))fail('BNS_HUMAN_CHANGED');return p.allocation;}

export async function prepareHumanEntryPlan(store,core,request,entry){
 keys(request,['operationId','actor','title','body','note','type','formation','evidence'],['operationId','actor','body','type','formation','evidence']);
 validateFields({body:request.body,title:request.title??'',note:request.note??'',type:request.type,formation:request.formation});
 if(!idOK(request.operationId)||request.operationId.length<8)fail('BNS_HUMAN_REQUEST');
 if(request.actor!=='user'||request.formation!=='explicit'||!Array.isArray(request.evidence)||request.evidence.length||!store.libraryDocumentMode||!entry)fail('BNS_HUMAN_UNSUPPORTED');
 const before=await store.run(()=>core.transaction(false,async t=>({...await base(store,core,t),receipt:await t.get('operationReceipts',request.operationId)??null}))),{receipt,...cut}=before;
 if(!equal(cut,entry)||cut.library?.sealed)fail('BNS_HUMAN_CHANGED');const requestDigest=await hashText(JSON.stringify(request));if(receipt){if(receipt.digest!==requestDigest)fail('BNS_HUMAN_OPERATION_COLLISION');return {duplicate:true,result:clone(receipt.result)};}
 const exactSignature=await keyedHash(before.secret,['body',request.type,request.body]),allocation=prepareHumanAllocation(store),id=allocation.uuid(),at=allocation.clock();let thoughtSequence=before.sequence?.value||0,revisionSequence=before.revision?.value||0;
 const row=planHumanEntryCreation(request,{id,at,sequence:++thoughtSequence,exactSignature,evidence:[],nonContext:[]});allocation.uuid(); // actual generation ID is allocated even with no provenance rows
 const snap=entrySnapshot(row),p=planJournalRevision({kind:'library_entry',entityId:id,before:snap,after:snap,fieldMask:ENTRY_FIELDS,actor:'user',reason:'baseline',important:true,operationId:request.operationId,baseRevision:0,afterRevision:0,sourceRecordIds:[]},null,allocation.clock()),sequence=++revisionSequence,historyId=allocation.uuid(),history=[{...p.row,id:historyId,sequence,listKey:[p.entityKey,sequence],documentList:[p.row.documentId,sequence]}];allocation.clock();
 row.searchVersion=ownerVersion('entry',row);const result={id,revision:row.revision},operationReceipt={id:request.operationId,namespace:'thought-library',schemaVersion:1,ownerId:id,operationSequence:++thoughtSequence,createdAt:allocation.clock(),digest:requestDigest,result};
 const cap=Object.freeze({});plans.set(cap,{kind:'entry',store,core,entry:clone(entry),before,request:clone(request),allocation:allocation.seal(),events:allocation.events(),row,history,result,operationReceipt,revisionSequence,thoughtSequence});return cap;
}
export function humanEntryPlan(cap){const p=plans.get(cap);if(p?.kind!=='entry')fail('BNS_HUMAN_PLAN_REQUIRED');return {entry:clone(p.row),history:clone(p.history),result:clone(p.result),operationReceipt:clone(p.operationReceipt),events:clone(p.events)};}
export async function requireHumanEntryPlan(t,cap,store,core){const p=plans.get(cap);if(p?.kind!=='entry'||p.store!==store||p.core!==core)fail('BNS_HUMAN_PLAN_REQUIRED');if(!equal(await base(store,core,t),p.entry)||await t.get('operationReceipts',p.request.operationId)||await t.get('thoughts',p.row.id))fail('BNS_HUMAN_CHANGED');for(const h of p.history)if(await t.get('revisions',h.id))fail('BNS_HUMAN_CHANGED');return p.allocation;}

async function editReadSet(t,id){
 const history=await t.rangePage('revisions','byList',prefix(['library_entry:'+id]),null,129);if(history.next||history.rows.length>128)fail('BNS_HUMAN_HISTORY_LIMIT');
 return {row:await t.get('thoughts',id)??null,history:history.rows.map(x=>x.value),placements:await t.count('placements','byEntry',prefix([id])),provenance:await t.count('provenance','byOwner',prefix(['entry',id])),dependencies:await t.count('dependencies','byTarget',prefix(['entry',id]))};
}
export async function prepareHumanEntryEditPlan(store,core,request,entry){
 keys(request,['id','operationId','expectedRevision','changes','actor','expectedFieldRevisions'],['id','operationId','expectedRevision','changes']);if(!idOK(request.id)||!idOK(request.operationId)||request.operationId.length<8||!revisionOK(request.expectedRevision)||request.actor&&request.actor!=='user')fail('BNS_HUMAN_REQUEST');validateFields(request.changes);
 if(request.expectedFieldRevisions!==undefined){keys(request.expectedFieldRevisions,ENTRY_FIELDS);for(const f of Object.keys(request.changes))if(!revisionOK(request.expectedFieldRevisions[f]))fail('BNS_HUMAN_REQUEST');}
 const before=await store.run(()=>core.transaction(false,async t=>({base:await base(store,core,t),read:await editReadSet(t,request.id),receipt:await t.get('operationReceipts',request.operationId)??null})));
 if(!entry||!equal(before.base,entry)||before.base.library?.sealed)fail('BNS_HUMAN_CHANGED');const requestDigest=await hashText(JSON.stringify(request));if(before.receipt){if(before.receipt.digest!==requestDigest)fail('BNS_HUMAN_OPERATION_COLLISION');return {duplicate:true,result:clone(before.receipt.result)};}
 const old=before.read.row;if(!old||old.storageSchema!==2||old.bodyBinding!=='thought'||old.provenanceType!=='user_created'||old.lifecycle!=='active'||old.sourceRecordIds?.length||before.read.provenance||before.read.dependencies||before.read.placements)fail('BNS_HUMAN_UNSUPPORTED');
 if(request.expectedFieldRevisions?Object.keys(request.changes).some(f=>old.fieldRevisions[f]!==request.expectedFieldRevisions[f]):old.revision!==request.expectedRevision)return {conflict:true};
 const exactSignature=await keyedHash(before.base.secret,['body',request.changes.type??old.type,request.changes.body??old.thoughtText]),allocation=prepareHumanAllocation(store),at=allocation.clock(),fieldPlan=planHumanEntryFields(old,request,{at});let thoughtSequence=entry.sequence?.value||0,revisionSequence=entry.revision?.value||0,row=fieldPlan.row,history=clone(before.read.history);
 if(fieldPlan.fields.length){
  row=finishHumanEntryFields(row,fieldPlan.fields,{at,sequence:++thoughtSequence,exactSignature});const data={kind:'library_entry',entityId:row.id,before:entrySnapshot(old),after:entrySnapshot(row),fieldMask:fieldPlan.fields,actor:'user',reason:'edit',important:false,operationId:request.operationId,baseRevision:request.expectedRevision,afterRevision:row.revision,sourceRecordIds:[]},p=planJournalRevision(data,history.at(-1)??null,allocation.clock());
  if(p.coalesced)history[history.length-1]=p.row;else{const sequence=++revisionSequence,h={...p.row,id:allocation.uuid(),sequence,listKey:[p.entityKey,sequence],documentList:[p.row.documentId,sequence]};history.push(h);const cutoff=Date.parse(allocation.clock())-REVISION_POLICY.days*86400000;let important=0;for(const item of [...history].reverse()){if(item.important)important++;if(revisionShouldPrune(item,cutoff,important))fail('BNS_HUMAN_HISTORY_RETIREMENT_UNAVAILABLE');}}
 }
 row.searchVersion=ownerVersion('entry',row);const result={id:row.id,revision:row.revision},operationReceipt={id:request.operationId,namespace:'thought-library',schemaVersion:1,ownerId:row.id,operationSequence:++thoughtSequence,createdAt:allocation.clock(),digest:requestDigest,result};
 const cap=Object.freeze({});plans.set(cap,{kind:'entry-edit',store,core,entry:clone(entry),before,request:clone(request),allocation:allocation.seal(),events:allocation.events(),row,history,result,operationReceipt,revisionSequence,thoughtSequence});return cap;
}
export function humanEntryEditPlan(cap){const p=plans.get(cap);if(p?.kind!=='entry-edit')fail('BNS_HUMAN_PLAN_REQUIRED');return {entry:clone(p.row),history:clone(p.history),result:clone(p.result),operationReceipt:clone(p.operationReceipt),events:clone(p.events)};}
export async function requireHumanEntryEditPlan(t,cap,store,core){const p=plans.get(cap);if(p?.kind!=='entry-edit'||p.store!==store||p.core!==core)fail('BNS_HUMAN_PLAN_REQUIRED');if(!equal(await base(store,core,t),p.entry)||!equal(await editReadSet(t,p.row.id),p.before.read)||await t.get('operationReceipts',p.request.operationId))fail('BNS_HUMAN_CHANGED');return p.allocation;}

// The only execution entry accepts the private, revalidated named plan. The
// ordinary public method and its original transaction/index hooks do the write;
// callers cannot supply a reducer, transaction or before/after callback.
const executions=new WeakMap(),completedPlans=new WeakSet();
export async function executeHumanPlan(cap){const p=plans.get(cap);if(!p)fail('BNS_HUMAN_PLAN_REQUIRED');if(completedPlans.has(cap))fail('BNS_HUMAN_CHANGED');const request=clone(p.request);executions.set(request,{cap,p,allocation:null});try{const result=await (p.kind==='topic'?p.store.createTopic(request):p.kind==='entry'?p.store.createEntry(request):p.store.editEntry(request));completedPlans.add(cap);return result;}finally{executions.delete(request);}}
export async function beginHumanOperation(store,t,request){const x=executions.get(request);if(!x)return;const {p,cap}=x;if(p.store!==store)fail('BNS_HUMAN_PLAN_REQUIRED');const requirePlan=p.kind==='topic'?requireHumanTopicPlan:p.kind==='entry'?requireHumanEntryPlan:requireHumanEntryEditPlan;x.allocation=await requirePlan(t,cap,store,p.core);beginHumanAllocation(t,x.allocation);}
export async function finishHumanOperation(store,t,request,result){const x=executions.get(request);if(!x)return;const p=x.p;if(p.store!==store||!equal(result,p.result))fail('BNS_HUMAN_PLAN_CHANGED');
 const row=await t.get(p.kind==='topic'?'topics':'thoughts',p.kind==='topic'?p.topic.id:p.row.id);if(!equal(row,p.kind==='topic'?p.topic:p.row))fail('BNS_HUMAN_PLAN_CHANGED');if(p.kind==='topic'&&!equal(await t.get('sections',p.section.id),p.section))fail('BNS_HUMAN_PLAN_CHANGED');
 for(const h of p.history)if(!equal(await t.get('revisions',h.id),h))fail('BNS_HUMAN_PLAN_CHANGED');if(!equal(await t.get('operationReceipts',request.operationId),p.operationReceipt))fail('BNS_HUMAN_PLAN_CHANGED');
 if(!equal(await base(store,p.core,t),{...p.entry,sequence:{id:'thought-sequence',value:p.thoughtSequence},revision:{id:'revision-sequence',value:p.revisionSequence}}))fail('BNS_HUMAN_CHANGED');finishHumanAllocation(t,x.allocation);
}
export function releaseHumanOperation(t,request){if(executions.has(request))releaseHumanAllocation(t);}

export function humanOperationError(request,error){return executions.has(request)&&error?.code?.startsWith('BNS_')?new ArchiveError(error.code):error;}
