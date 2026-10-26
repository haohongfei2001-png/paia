import {readSectionPromotionRecovery} from './section-promotion-recovery.js';
import {equal,fail} from './contracts.js';
import {snapshot,freeze} from './qwen-request-data.js';
import {contextScopeTransactionReader,forkContextScopeWorkBudget} from '../context-topic-scope.js';
import {rootReadAuthority} from '../organizer/root-read.js';
import {selectSectionPromotionScope,sectionPromotionScopeData,assertSectionPromotionScope,releaseSectionPromotionScope,SECTION_PROMOTION_SCOPE_LIMITS} from './topic-promotion-scope.js';
import {assertMaintenanceQualification,assertMaintenanceQualificationFacts,maintenanceQualificationReceipt,maintenanceQualificationWorkBudget,chargeMaintenanceQualificationHash} from './maintenance-qualification.js';
import {readSectionPromotionAssessmentCapture,checkSectionPromotionAssessmentCapture,assertSectionPromotionAssessmentFacts,readSectionPromotionPreparedCapture,readDetachedSectionPromotion,freezeDetachedSectionPromotionPublications,releaseDetachedSectionPromotion} from '../topic-promotion.js';
import {readTopicFormationPublication} from '../topic-formation.js';
import {readContextMaintenancePublication} from '../context-maintenance.js';
import {captureSectionPromotionResponse,sectionPromotionResponsePayload,mapSectionPromotionResponse,releaseSectionPromotionResponse} from './topic-promotion-response.js';
import {hashText} from '../dedupe.js';

const plans=new WeakMap(),captures=new WeakMap(),detached=new WeakMap(),need=(v,code='UNAVAILABLE')=>{if(!v)fail(code);};
const id=v=>typeof v==='string'&&v.length>0&&v.length<=200;
const own=(row,key)=>{const d=Object.getOwnPropertyDescriptor(row||{},key);need(!d||Object.hasOwn(d,'value'));return d?.value;};
const scalar=v=>{need(v===undefined||v===null||['string','boolean'].includes(typeof v)||typeof v==='number'&&Number.isFinite(v));return v;};
const pick=(row,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(row||{},k)).map(k=>[k,scalar(own(row,k))]));
const ids=(value,max)=>{need(Array.isArray(value)&&value.length<=max&&new Set(value).size===value.length&&value.every(id));return [...value];};
function inputScope(value){
 need(Array.isArray(value)&&value.length<=SECTION_PROMOTION_SCOPE_LIMITS.inputs&&new Set(value.map(x=>x?.inputId)).size===value.length);
 return value.map(x=>{need(x&&Object.keys(x).sort().join(',')==='inputId,role,selectedFields'&&id(x.inputId)&&['primary','supporting'].includes(x.role));const fields=ids(x.selectedFields,2);need(fields.length&&fields.every(f=>['body','note'].includes(f)));return {inputId:x.inputId,role:x.role,selectedFields:fields.sort()};}).sort((a,b)=>a.inputId.localeCompare(b.inputId));
}
function request(value){
 const r=snapshot(value,{maxBytes:32768,maxKeys:4096,maxDepth:8,maxString:200});
 need(Object.keys(r).sort().join(',')==='entryIds,scope,topicIds');
 return freeze({topicIds:ids(r.topicIds,SECTION_PROMOTION_SCOPE_LIMITS.topics).sort(),entryIds:ids(r.entryIds,SECTION_PROMOTION_SCOPE_LIMITS.entries).sort(),scope:inputScope(r.scope)});
}
function identity(row){
 need(row&&id(own(row,'id')));
 const out=pick(row,['id','revision','organizationRevision','activeLayoutGeneration','lifecycle','redirectTo','layoutJobId']);
 out.sourceRecordIds=ids(own(row,'sourceRecordIds')||[],128);
 const i=own(row,'identity');
 if(i!==undefined){
  // The original identity schema currently permits only null scope. Unknown
  // semantic scope is not free metadata and never becomes a label grant.
  need(own(i,'scope')===null);
  out.identity=pick(i,['version','revision','origin','scope','legacy','noRecreation','nameToken']);
  const aliases=own(i,'aliases');need(Array.isArray(aliases)&&aliases.length<=128);
  out.identity.aliases=aliases.map(a=>pick(a,['token','actor','revision','operationId','at']));
  const intent=own(i,'lifecycleIntent');if(intent)out.identity.lifecycleIntent=pick(intent,['actor','operationId','at','previous','to']);
 }
 return out;
}
async function identities(t,selected){
 // A complete *bounded* identity universe, not a semantic shortlist. A ninth
 // Topic causes DEFER before any Topic label, Source or Input body is acquired.
 const count=await t.count('topics');
 if(count>SECTION_PROMOTION_SCOPE_LIMITS.topics)return {reason:'IDENTITY_UNIVERSE_OVER_BUDGET'};
 const rows=(await t.all('topics')).map(identity).sort((a,b)=>a.id.localeCompare(b.id));need(rows.length===count,'STALE_BASE');
 const known=new Map(rows.map(r=>[r.id,r]));
 for(const row of rows){
  let current=row;const visited=new Set();
  while(current.redirectTo){need(!visited.has(current.id)&&known.has(current.redirectTo));visited.add(current.id);current=known.get(current.redirectTo);}
  if(!['active','dormant','removed'].includes(current.lifecycle)||current.layoutJobId)return {reason:'IDENTITY_UNAVAILABLE'};
 }
 const inputIds=new Set(selected.scope.map(i=>i.inputId)),sources=new Set(),inputs=[];
 for(const inputId of inputIds){const s=await t.get('inputStates',inputId);need(s?.id===inputId&&s.removalState==='active'&&!s.sourcePurged);const row=pick(s,['id','contentRevision','lastRemovalSequence','removalState','sourcePurged']);row.sourceRecordIds=ids(own(s,'sourceRecordIds')||[],128);for(const source of row.sourceRecordIds)sources.add(source);inputs.push(row);}
 need(sources.size<=128,'BUDGET_EXCEEDED');
 // The old identity owner may validate source-derived labels. Its complete
 // original Input closure must already be in this child; labels do not widen
 // the selected Input or facet coverage set.
 const sourceIndexes=[];
 for(const source of [...new Set(rows.flatMap(r=>r.sourceRecordIds))].sort()){
  if(!sources.has(source))return {reason:'IDENTITY_SOURCE_OUTSIDE_SELECTED_SCOPE'};
  const total=await t.count('blockIndex','byRecord',source);
  if(total<1||total>SECTION_PROMOTION_SCOPE_LIMITS.inputs)return {reason:'IDENTITY_SOURCE_OUTSIDE_SELECTED_SCOPE'};
  const values=await t.all('blockIndex','byRecord',source);need(values.length===total,'STALE_BASE');
  if(values.some(r=>!inputIds.has(r.id)))return {reason:'IDENTITY_SOURCE_OUTSIDE_SELECTED_SCOPE'};
  sourceIndexes.push(...values.map(r=>pick(r,['id','recordId','documentId','excluded','branchStatus'])));
 }
 const constraints=[];
 await t.scanPrimary('meta','topicKeepSeparate:',row=>{
  const x=pick(row,['id','sourceId','targetId','revision','actor','at','scope']);need(known.has(x.sourceId)&&known.has(x.targetId));constraints.push(x);
 });
 return {rows,inputs,sources:[...sources].sort(),sourceIndexes:sourceIndexes.sort((a,b)=>a.id.localeCompare(b.id)),constraints:constraints.sort((a,b)=>a.id.localeCompare(b.id))};
}
function held(handle,store){const p=plans.get(handle);need(p&&p.store===store&&p.database===store.repository.db,'STALE_BASE');return p;}

// Metadata only. The returned selection is an exact *request for* independent
// processing fields, never a processing receipt or a permission capability.
export async function planMaintenanceSectionPromotion(store,transaction,value,{workBudget}={}){
 const selected=request(value),budget=forkContextScopeWorkBudget(workBudget,{database:store.repository.db}),t=contextScopeTransactionReader(store,transaction,budget),authority=await rootReadAuthority(t);
 const scope=await selectSectionPromotionScope(store,t,{topicIds:selected.topicIds,entryIds:selected.entryIds,inputs:selected.scope.map(({inputId,selectedFields})=>({inputId,selectedFields}))});
 try{
  const data=sectionPromotionScopeData(scope,store),candidate=data.candidates[0],identityState=candidate?await identities(t,selected):null;
  const reason=!candidate?'NO_COMPLETE_SELECTED_SECTION':identityState.reason??null;
  const selection=reason?null:{inputIds:selected.scope.map(i=>i.inputId),entryIds:[...candidate.entryIds],historyEntryIds:[...candidate.entryIds],structures:[...identityState.rows.map(r=>({store:'topics',recordId:r.id,selectedFields:r.id===candidate.topic.id?['name','summary']:['name']})),{store:'sections',recordId:candidate.section.id,selectedFields:['title']}]};
  const summary=freeze({version:1,status:reason?'DEFER':'READY',reason,coverage:'selected_processing_scope',completeIdentityUniverse:!reason,omitted:data.omitted});
  need(await rootReadAuthority(t)===authority,'STALE_BASE');
  const handle=Object.freeze(Object.create(null));plans.set(handle,{store,database:store.repository.db,selected,budget,workBudget,authority,scope,candidate,identityState,selection:selection&&freeze(selection),summary});return handle;
 }catch(error){releaseSectionPromotionScope(scope);throw error;}
}
export function maintenanceSectionPromotionQualification(handle,store){return held(handle,store).selection;}
export function maintenanceSectionPromotionSummary(handle,store){return held(handle,store).summary;}
export function maintenanceSectionPromotionRequest(handle,store,binding){
 const p=held(handle,store),b=snapshot(binding,{maxBytes:2048,maxKeys:8,maxDepth:2,maxString:200});need(p.candidate&&p.selection&&Object.keys(b).sort().join(',')==='childOperationId,logicalJobId,proposalOperationId,sectionRef'&&Object.values(b).every(id)&&b.proposalOperationId.length>=8&&!b.proposalOperationId.includes(':')&&/^s[0-9]$/.test(b.sectionRef));
 return freeze({scope:p.selected.scope.filter(x=>p.candidate.inputs.some(i=>i.inputId===x.inputId)),topicId:p.candidate.topic.id,sectionId:p.candidate.section.sectionId,selection:'whole_section',operationId:b.proposalOperationId});
}
// Exact metadata request for a separate remote payload grant. This is not the
// local qualification receipt. No semantic field is read to build this scope.
export function maintenanceSectionPromotionPayloadScope(handle,store,binding){
 const p=held(handle,store),request=maintenanceSectionPromotionRequest(handle,store,binding),selected=new Set(request.scope.map(x=>x.inputId)),candidate=p.candidate;
 const value={version:1,purpose:'ai-maintenance-section-promotion-payload',binding:{...binding},rootAuthority:p.authority,selection:'whole_section',
  inputs:request.scope.map(input=>{const current=p.identityState.inputs.find(x=>x.id===input.inputId);need(current,'STALE_BASE');return {...input,revision:current.contentRevision};}),
  entries:candidate.entries.map(row=>({entryId:row.id,revision:row.revision,organizationRevision:row.organizationRevision,dependencyRevision:row.dependencyRevision,selectedFields:['body']})),
  structures:[...p.identityState.rows.map(row=>({store:'topics',recordId:row.id,revision:row.revision,identityRevision:row.identity?.revision??null,selectedFields:['name']})),{store:'sections',recordId:candidate.section.id,revision:candidate.section.revision,selectedFields:['title']}],
  metadata:{topic:candidate.topic,section:candidate.section,placements:candidate.placements,entries:candidate.entries,dependencies:candidate.dependencies,inputs:p.identityState.inputs.filter(row=>selected.has(row.id)),identities:p.identityState.rows,constraints:p.identityState.constraints}};
 // The original receipt scope ceiling remains binding. An oversized metadata
 // closure defers; it cannot obtain a partial or widened remote grant.
 return freeze(snapshot(value,{maxBytes:32768,maxKeys:4096,maxDepth:16,maxString:32768}));
}
export async function assertMaintenanceSectionPromotion(store,transaction,handle){
 const p=held(handle,store),t=contextScopeTransactionReader(store,transaction,p.budget);
 need(await rootReadAuthority(t)===p.authority,'STALE_BASE');
 await assertSectionPromotionScope(store,t,p.scope);
 if(p.candidate)need(equal(await identities(t,p.selected),p.identityState),'STALE_BASE');
 return true;
}
function qualification(p,token){
 assertMaintenanceQualification(token,p.store);const receipt=maintenanceQualificationReceipt(token,p.store),scope=receipt.scope;
 need(maintenanceQualificationWorkBudget(token,p.store)===p.workBudget&&scope.rootAuthority===p.authority,'STALE_BASE');
 const has=(rows,key,value,fields)=>rows.some(row=>row[key]===value&&fields.every(field=>row.selectedFields.includes(field)));
 need(p.selection&&p.selection.inputIds.every(id=>has(scope.inputs,'inputId',id,['body','note'])));
 need(p.candidate.entryIds.every(id=>has(scope.entries,'entryId',id,['body','title','note'])));
 need(p.selection.structures.every(x=>scope.structures.some(y=>y.store===x.store&&y.recordId===x.recordId&&x.selectedFields.every(field=>y.selectedFields.includes(field)))));
 need(p.identityState.sources.every(id=>has(scope.sources,'sourceRecordId',id,['originalText'])));
 for(const row of scope.journals.filter(x=>p.candidate.entryIds.includes(x.entityId)))need(['body','title','note'].flatMap(f=>['before.'+f,'after.'+f]).every(field=>row.selectedFields.includes(field)));
 return receipt;
}
function captured(handle,store){
 const c=captures.get(handle);need(c&&c.store===store&&c.database===store.repository.db,'STALE_BASE');const p=held(c.plan,store);qualification(p,c.qualification);
 if(c.phase==='accepted'){const owner=readSectionPromotionPreparedCapture(c.preview,store);need(owner&&owner.assessmentCapture===c.original&&owner.qualification===c.qualification,'STALE_BASE');}
 else need(readSectionPromotionAssessmentCapture(c.original,store),'STALE_BASE');
 return c;
}
// Called only inside the original AI owner's assess callback. The third
// callback argument is a module-private capability, not a model/caller DTO.
export async function captureMaintenanceSectionPromotion(store,plan,original,binding){
 const p=held(plan,store),source=readSectionPromotionAssessmentCapture(original,store);need(p.selection&&source&&source.strictQualification===true&&source.qualification);
 qualification(p,source.qualification);
 const expectedScope=p.selected.scope.filter(x=>p.candidate.inputs.some(i=>i.inputId===x.inputId));
 need(source.request.selection==='whole_section'&&source.request.topicId===p.candidate.topic.id&&source.request.sectionId===p.candidate.section.sectionId&&source.request.operationId===binding?.proposalOperationId&&equal(inputScope(source.request.scope),expectedScope),'STALE_BASE');
 await store.run(()=>store.repository.transaction(false,t=>assertMaintenanceSectionPromotion(store,t,plan)));
 let response;
 try{
  response=await captureSectionPromotionResponse(binding,source.view,source.reader);qualification(p,source.qualification);
  const payload=sectionPromotionResponsePayload(response),text=JSON.stringify(payload),limits=store.organizerBudget.limits;
  need(new TextEncoder().encode(text).length<=limits.maxRequestBytes&&new TextEncoder().encode(JSON.stringify(payload.pages)).length<=limits.maxContentBytes,'BUDGET_EXCEEDED');
  chargeMaintenanceQualificationHash(source.qualification,store,text);const payloadDigest=await hashText(text);qualification(p,source.qualification);
  need(readSectionPromotionAssessmentCapture(original,store),'STALE_BASE');
  const handle=Object.freeze(Object.create(null));captures.set(handle,{store,database:store.repository.db,plan,original,qualification:source.qualification,response,payloadDigest,phase:'captured',mapped:null,preview:null});return handle;
 }catch(error){if(response)releaseSectionPromotionResponse(response);throw error;}
}
export async function checkMaintenanceSectionPromotion(handle,store){const c=captured(handle,store);need(c.phase==='captured','STALE_BASE');await store.run(()=>store.repository.transaction(false,t=>assertMaintenanceSectionPromotion(store,t,c.plan)));await checkSectionPromotionAssessmentCapture(c.original,store);captured(handle,store);return assertMaintenanceSectionPromotionFacts(handle,store);}
export function maintenanceSectionPromotionPayload(handle,store){const c=captured(handle,store);need(c.phase==='captured','STALE_BASE');return sectionPromotionResponsePayload(c.response);}
export async function settleMaintenanceSectionPromotion(handle,store,wire){
 const c=captured(handle,store);need(c.phase==='captured','STALE_BASE');
 await store.run(()=>store.repository.transaction(false,t=>assertMaintenanceSectionPromotion(store,t,c.plan)));
 const source=readSectionPromotionAssessmentCapture(c.original,store);need(source,'STALE_BASE');
 const mapped=mapSectionPromotionResponse(c.response,wire,source.view);captured(handle,store);c.mapped=mapped;c.phase='settled';return mapped;
}
export async function acceptMaintenanceSectionPromotion(handle,store,preview){
 const c=captures.get(handle);need(c&&c.store===store&&c.phase==='settled'&&c.mapped?.status==='PROPOSE','STALE_BASE');const p=held(c.plan,store);qualification(p,c.qualification);
 const source=readSectionPromotionPreparedCapture(preview,store);need(source&&source.assessmentCapture===c.original&&source.qualification===c.qualification&&equal(source.assessment,c.mapped.assessment),'STALE_BASE');
 await store.run(()=>store.repository.transaction(false,t=>assertMaintenanceSectionPromotion(store,t,c.plan)));
 c.preview=preview;c.owner=source.owner;c.phase='accepted';captured(handle,store);return handle;
}
// Internal production bridge only. Public preview data never issues a confirm
// capability; it must retain this exact original owner and private handle.
export function maintenanceSectionPromotionProposal(handle,store){const c=captured(handle,store);need(c.phase==='accepted','STALE_BASE');const source=readSectionPromotionPreparedCapture(c.preview,store);return Object.freeze({owner:source.owner,handle:c.preview,operationId:source.request.operationId,preview:c.preview});}
export function releaseMaintenanceSectionPromotion(handle){
 const c=captures.get(handle);if(c){if(c.preview)try{c.owner?.cancel(c.preview);}catch{}releaseSectionPromotionResponse(c.response);captures.delete(handle);return;}
 const p=plans.get(handle);if(p)releaseSectionPromotionScope(p.scope);plans.delete(handle);
}

// Detach only a genuinely settled and accepted original assessment. The
// derived name/preview remains sensitive and bounded by the original owner's
// deadline. No old receipt, body, full response or page reader survives here.
export function detachMaintenanceSectionPromotion(handle,store){
 const c=captured(handle,store);need(c.phase==='accepted','STALE_BASE');const p=held(c.plan,store),source=readSectionPromotionPreparedCapture(c.preview,store);
 const ticket=source.owner.detachProposal(c.preview),token=Object.freeze({});
 detached.set(token,{store,repository:store.repository,database:store.repository.db,ticket,selected:p.selected,authority:p.authority,scopeData:sectionPromotionScopeData(p.scope,store),identityState:p.identityState,selection:p.selection,summary:p.summary,confirmation:null});
 releaseSectionPromotionResponse(c.response);captures.delete(handle);releaseSectionPromotionScope(p.scope);plans.delete(c.plan);return token;
}
function detachedState(handle,store){const p=detached.get(handle);need(p&&p.store===store&&p.repository===store.repository&&p.database===store.repository.db,'STALE_BASE');readDetachedSectionPromotion(p.ticket,store);return p;}
export function maintenanceDetachedSectionPromotion(handle,store){const p=detachedState(handle,store);return Object.freeze({ticket:p.ticket,...readDetachedSectionPromotion(p.ticket,store)});}
// A new explicit confirmation has a new original request ledger and a new
// independent field grant. Its metadata closure must still equal the old sent
// selection before the grant is requested; revisions and IDs never refresh.
async function detachedMetadata(store,transaction,handle,{workBudget,publications=[]}={}){
 const p=detachedState(handle,store);need(Array.isArray(publications)&&publications.length<=100&&new Set(publications).size===publications.length);
 need(p.publicationAuthority===undefined||publications.length===0,'STALE_BASE');let authority=p.publicationAuthority??p.authority;for(const token of publications){const value=readTopicFormationPublication(token,store)||readContextMaintenancePublication(token,store);need(value&&value.beforeAuthority===authority,'STALE_BASE');authority=value.authority;}
 const budget=forkContextScopeWorkBudget(workBudget,{database:store.repository.db}),t=contextScopeTransactionReader(store,transaction,budget);need(await rootReadAuthority(t)===authority,'STALE_BASE');
 const scope=await selectSectionPromotionScope(store,t,{topicIds:p.selected.topicIds,entryIds:p.selected.entryIds,inputs:p.selected.scope.map(({inputId,selectedFields})=>({inputId,selectedFields}))});
 try{
  const data=sectionPromotionScopeData(scope,store);need(equal(data,p.scopeData),'STALE_BASE');const identityState=await identities(t,p.selected);need(equal(identityState,p.identityState),'STALE_BASE');need(await rootReadAuthority(t)===authority,'STALE_BASE');detachedState(handle,store);
  return {p,record:{store,database:store.repository.db,selected:p.selected,budget,workBudget,authority,scope,candidate:data.candidates[0],identityState:p.identityState,selection:p.selection,summary:p.summary}};
 }catch(error){releaseSectionPromotionScope(scope);throw error;}
}
export function releaseMaintenanceDetachedSectionPromotion(handle){const p=detached.get(handle);if(p){releaseDetachedSectionPromotion(p.ticket);if(p.confirmation)releaseMaintenanceSectionPromotion(p.confirmation);detached.delete(handle);}}

export async function freezeMaintenanceDetachedSectionPromotionPublications(store,t,handle,options){
 const p=detachedState(handle,store);need(p.publicationAuthority===undefined,'STALE_BASE');const {record}=await detachedMetadata(store,t,handle,options);
 try{need(p.publicationAuthority===undefined,'STALE_BASE');const authority=freezeDetachedSectionPromotionPublications(p.ticket,store,options?.publications??[]);need(authority===record.authority,'STALE_BASE');p.publicationAuthority=authority;return true;}finally{releaseSectionPromotionScope(record.scope);}
}
export async function assertMaintenanceDetachedSectionPromotion(store,t,handle,options){const {record}=await detachedMetadata(store,t,handle,options);releaseSectionPromotionScope(record.scope);return true;}
export async function planMaintenanceSectionPromotionConfirmation(store,t,handle,options){
 const p=detachedState(handle,store);need(!p.confirmation,'STALE_BASE');const {record}=await detachedMetadata(store,t,handle,options);try{need(!p.confirmation,'STALE_BASE');const plan=Object.freeze({});plans.set(plan,record);p.confirmation=plan;return plan;}catch(error){releaseSectionPromotionScope(record.scope);throw error;}
}

// Fresh recovery can request fields only after the original signed work has
// passed its local envelope/signature/root verification. Current field grants
// still cannot replace that work's immutable original snapshot digest.
export async function planMaintenanceSectionPromotionRecovery(store,t,recovery,{workBudget}={}){
 const old=readSectionPromotionRecovery(recovery,store);need(old.request.selection==='whole_section','UNAVAILABLE');
 const plan=await planMaintenanceSectionPromotion(store,t,{topicIds:[old.request.topicId],entryIds:old.entryIds,scope:old.request.scope},{workBudget});
 try{const p=held(plan,store);readSectionPromotionRecovery(recovery,store);need(p.authority===old.rootAuthority&&p.candidate&&equal([...p.candidate.entryIds].sort(),[...old.entryIds].sort()),'STALE_BASE');return plan;}catch(error){releaseMaintenanceSectionPromotion(plan);throw error;}
}

export function assertMaintenanceSectionPromotionFacts(handle,store){const c=captures.get(handle);need(c&&c.store===store&&c.database===store.repository.db&&c.phase==='captured','STALE_BASE');assertMaintenanceQualificationFacts(c.qualification,store);return assertSectionPromotionAssessmentFacts(c.original,store);}
