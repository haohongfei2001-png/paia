import {readContextMaintenancePublication} from '../context-maintenance.js';
import {takeMaintenanceTopicCandidateResponse} from './maintenance-service-response.js';
import {HiddenTopicCandidates,sameTopicCandidateMetadata} from '../topic-candidates.js';
import {contextScopeTransactionReader,CONTEXT_TOPIC_SCOPE_LIMITS} from '../context-topic-scope.js';
import {rootReadAuthority} from '../organizer/root-read.js';
import {readFormationEvidence,validateFormationSources} from '../topic-formation-evidence.js';
import {checkEvidenceInTransaction} from '../thought-evidence.js';
import {readTopicFormationPublication} from '../topic-formation.js';
import {assertMaintenanceQualification,maintenanceQualificationReceipt,maintenanceQualificationReader,maintenanceQualificationWorkBudget} from './maintenance-qualification.js';
import {idOK,revisionOK} from '../thought-model.js';
import {canonical,equal,exact,fail} from './contracts.js';

// Candidate discovery is bounded pending-work discovery, not identity proof or
// a semantic relevance claim. Historical text is acquired only by the separate
// original qualified-reader phase, on the exact same request work ledger.
// A metadata selection or candidate capability never grants text.
export const MAINTENANCE_TOPIC_CANDIDATE_LIMITS=Object.freeze({page:50,inputs:20,sources:20,requestBytes:32768});
const held=new WeakMap(),operations=new WeakMap(),copy=x=>structuredClone(x),bytes=x=>new TextEncoder().encode(JSON.stringify(x)).length;
const need=(x,code='UNAVAILABLE')=>{if(!x)fail(code);};
const own=(row,key)=>{const d=Object.getOwnPropertyDescriptor(row||{},key);need(!d||Object.hasOwn(d,'value'));return d?.value;};
const stateFields=['id','contentRevision','lastRemovalSequence','sourceRecordIds','removalState','sourcePurged'];
const metadataScalar=value=>{need(value===null||['string','number','boolean','undefined'].includes(typeof value));return value;};
const metadataArray=value=>{need(Array.isArray(value));const length=own(value,'length');need(Number.isSafeInteger(length)&&length>=0&&length<=1000);return Array.from({length},(_,i)=>metadataScalar(own(value,String(i))));};
const inputMetadata=row=>Object.fromEntries(stateFields.filter(k=>Object.hasOwn(row||{},k)).map(k=>[k,k==='sourceRecordIds'?metadataArray(own(row,k)):metadataScalar(own(row,k))]));
const spec=e=>({inputId:e.inputId,role:e.role,selectedFields:[...e.selectedFields]});
function active(h){let ok=false;try{const value=h.isCurrent();ok=value===true;if(!ok)Promise.resolve(value).catch(()=>{});}catch{}need(ok&&!h.released&&!h.signal?.aborted&&h.store.repository.db===h.database);if(h.qualification)assertMaintenanceQualification(h.qualification,h.store);}
function state(handle){const h=held.get(handle);need(h);active(h);return h;}
async function input(t,id){const row=await t.get('inputStates',id);if(!row)return null;const m=inputMetadata(row);return m.id===id&&revisionOK(m.contentRevision)&&m.removalState==='active'&&!m.sourcePurged&&Array.isArray(m.sourceRecordIds)&&m.sourceRecordIds.every(idOK)?m:null;}
function scopeOf(h,items,inputs){return {purpose:'ai-maintenance-topic-candidates',version:1,binding:copy(h.binding),candidates:items.map(({row,ref})=>({candidateRef:ref,candidateId:row.id,revision:row.revision,inputIds:[...row.inputIds]})),inputs:[...inputs.values()].map(({metadata:m,evidence})=>({inputId:m.id,revision:m.contentRevision,selectedFields:['body','note'],evidence:spec(evidence)})),sources:[...new Set([...inputs.values()].flatMap(({metadata})=>metadata.sourceRecordIds))].sort().map(sourceRecordId=>({sourceRecordId,selectedFields:['originalText']}))};}
export async function selectMaintenanceTopicCandidates(store,transaction,{inputScope,binding,workBudget,cursor=null,signal=null,isCurrent,resolveProcessing=null,resolveQualification=null}={}){
 need(typeof isCurrent==='function'&&Array.isArray(inputScope)&&inputScope.length&&inputScope.length<=Math.min(20,store.organizerBudget.limits.maxInputs));
 const ids=new Set();for(const s of inputScope){exact(s,['inputId','role','selectedFields']);need(idOK(s.inputId)&&!ids.has(s.inputId)&&['primary','supporting'].includes(s.role)&&Array.isArray(s.selectedFields)&&s.selectedFields.length&&s.selectedFields.length<=2&&new Set(s.selectedFields).size===s.selectedFields.length&&s.selectedFields.every(f=>['body','note'].includes(f)));ids.add(s.inputId);}
 need(binding&&typeof binding==='object'&&!Array.isArray(binding)&&bytes(binding)<=8192);
 const h={store,database:store.repository.db,binding:copy(binding),workBudget,signal,isCurrent,items:[],inputs:new Map(),currentInputIds:[...ids],released:false,qualification:null,captured:false,qualified:[],material:null,snapshot:null,evidence:null};h.owner=new HiddenTopicCandidates(store,{resolveProcessing,resolveQualification:()=>h.qualification});active(h);
 const t=contextScopeTransactionReader(store,transaction,workBudget);h.authority=await rootReadAuthority(t);
 for(const s of inputScope){const m=await input(t,s.inputId);need(m);h.inputs.set(s.inputId,{metadata:m,evidence:copy(s)});}
 need(new Set([...h.inputs.values()].flatMap(x=>x.metadata.sourceRecordIds)).size<=20,'BUDGET_EXCEEDED');
 // Charge this metadata page once against the same branded ledger. The raw
 // transaction below avoids double charging the qualified reader's wrapper.
 // Validate before and after; never allocate a second phase allowance.
 need(workBudget.reads+MAINTENANCE_TOPIC_CANDIDATE_LIMITS.page+1<=CONTEXT_TOPIC_SCOPE_LIMITS.reads,'BUDGET_EXCEEDED');
 const pageReader=Object.create(t);pageReader.primaryRangePage=async(...args)=>{active(h);const page=await transaction.primaryRangePage(...args);active(h);need(Array.isArray(page.rows)&&page.rows.length<=50);workBudget.reads+=page.rows.length+1;const seen=workBudget.seen.get('organizerWorkItems')||new Set();for(const {value}of page.rows)seen.add(own(value,'id'));need(seen.size<=CONTEXT_TOPIC_SCOPE_LIMITS.refs,'BUDGET_EXCEEDED');workBudget.seen.set('organizerWorkItems',seen);contextScopeTransactionReader(store,transaction,workBudget);return page;};
 let page;try{page=await h.owner.selectPageInTransaction(pageReader,{cursor,limit:50,maxEvidence:20,maxSources:20,maxBytes:CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes-workBudget.hashBytes});h.tokens=page.items;let omitted=page.omitted;
  for(const token of page.items){active(h);const row=h.owner.selectionMetadata(token),union=new Map(h.inputs);let valid=true;
   for(const e of row.evidence){const previous=union.get(e.inputId);if(previous&&!equal(spec(previous.evidence),spec(e))){valid=false;break;}if(!previous){const m=await input(t,e.inputId);if(!m){valid=false;break;}union.set(e.inputId,{metadata:m,evidence:spec(e)});}const m=union.get(e.inputId).metadata;if(m.contentRevision!==e.basedOnContentRevision||!equal([...m.sourceRecordIds].sort(),[...e.sourceRecordIds].sort())){valid=false;break;}}
   const item={token,row,ref:'candidate-'+h.items.length},next=[...h.items,item];if(!valid||union.size>Math.min(20,store.organizerBudget.limits.maxInputs)||new Set([...union.values()].flatMap(x=>x.metadata.sourceRecordIds)).size>20||bytes(scopeOf(h,next,union))>32768){omitted++;continue;}h.items=next;h.inputs=union;
  }
  need(await rootReadAuthority(t)===h.authority,'STALE_BASE');active(h);h.scope=scopeOf(h,h.items,h.inputs);need(bytes(h.scope)<=32768,'BUDGET_EXCEEDED');h.summary={version:1,coverage:'bounded_candidate_page',visited:page.visited,selectedCandidates:h.items.length,omittedCandidates:omitted,complete:page.complete&&omitted===0,nextCursor:page.nextCursor};const handle=Object.freeze({});held.set(handle,h);return handle;
 }catch(error){for(const token of page?.items||[])h.owner.releaseSelection(token);throw error;}
}
export function maintenanceTopicCandidateScope(handle){return copy(state(handle).scope);}
export function maintenanceTopicCandidateSummary(handle){return copy(state(handle).summary);}
export function maintenanceTopicCandidateSelection(handle,ref){const h=state(handle),item=h.items.find(x=>x.ref===ref);need(item);return item.token;}
export function maintenanceTopicCandidateQualificationRequest(handle){const h=state(handle);return {request:{items:[],coverage:[]},phase:'topic-candidates',binding:{...copy(h.binding),candidateSelection:copy(h.scope.candidates)},selection:{inputIds:[...h.inputs.keys()]}};}
export async function assertMaintenanceTopicCandidateSelection(store,transaction,handle,{publications=[]}={}){
 const h=state(handle);need(h.store===store&&Array.isArray(publications));const t=contextScopeTransactionReader(store,transaction,h.workBudget),expected=new Map(h.items.map(x=>[x.row.id,x.row]));let authority=h.authority;
 for(const token of publications){const p=readTopicFormationPublication(token,store,{transaction})||readContextMaintenancePublication(token,store,{transaction});need(p&&p.beforeAuthority===authority,'STALE_BASE');authority=p.authority;for(const write of p.writes)if(write.store==='organizerWorkItems'&&expected.has(write.id))expected.set(write.id,write.value);}
 need(await rootReadAuthority(t)===authority,'STALE_BASE');for(const {token,row}of h.items){h.owner.selectionMetadata(token);need(sameTopicCandidateMetadata((await t.get('organizerWorkItems',row.id))??null,expected.get(row.id)),'STALE_BASE');}
 for(const [id,{metadata}]of h.inputs)need(equal(await input(t,id),metadata),'STALE_BASE');
 if(h.captured&&h.items.length){const q=maintenanceQualificationReader(h.qualification,store,transaction,{topicLabels:true});await checkEvidenceInTransaction(store,q,h.evidence);need(equal(await readFormationEvidence(store,q,{evidence:h.evidence}),h.snapshot),'STALE_BASE');}
 active(h);return true;
}
export async function captureMaintenanceTopicCandidates(store,handle,{qualification,maxContentBytes=store.organizerBudget.limits.maxContentBytes,maxRequestBytes=store.organizerBudget.limits.maxRequestBytes,publications=[]}={}){
 const h=state(handle);need(h.store===store);if(h.captured){need(h.qualification===qualification);await store.run(()=>store.repository.transaction(false,t=>assertMaintenanceTopicCandidateSelection(store,t,handle,{publications})));return copy(h.material);}need(Number.isSafeInteger(maxContentBytes)&&maxContentBytes>=0&&Number.isSafeInteger(maxRequestBytes)&&maxRequestBytes>=0,'BUDGET_EXCEEDED');
 try{if(!h.items.length){h.captured=true;h.material={candidates:[],inputs:[]};return copy(h.material);}
  need(maxContentBytes>0&&maxRequestBytes>0,'BUDGET_EXCEEDED');const receipt=maintenanceQualificationReceipt(qualification,store),request=maintenanceTopicCandidateQualificationRequest(handle),scope=receipt.scope;
  need(maintenanceQualificationWorkBudget(qualification,store)===h.workBudget&&scope.purpose==='ai-maintenance-qualification'&&scope.phase===request.phase&&equal(scope.binding,request.binding)&&scope.batchFingerprint===canonical(request.request)&&scope.rootAuthority===h.authority&&equal(scope.inputs,h.scope.inputs.map(({inputId,revision,selectedFields})=>({inputId,revision,selectedFields})))&&equal(scope.sources,h.scope.sources)&&['entries','structures','journals'].every(key=>Array.isArray(scope[key])&&!scope[key].length));
  h.qualification=qualification;active(h);const clear=()=>releaseMaintenanceTopicCandidates(handle);receipt.revocationSignal.addEventListener('abort',clear,{once:true});h.signal?.addEventListener('abort',clear,{once:true});h.removeAbort=()=>{receipt.revocationSignal.removeEventListener('abort',clear);h.signal?.removeEventListener('abort',clear);};const expire=()=>{if(Date.now()>=receipt.expiresAt){clear();return;}h.expiryTimer=setTimeout(expire,Math.min(receipt.expiresAt-Date.now(),2147483647));h.expiryTimer?.unref?.();};expire();await store.run(()=>store.repository.transaction(false,t=>assertMaintenanceTopicCandidateSelection(store,t,handle)));
  const selectedScope=[...h.inputs.values()].map(x=>spec(x.evidence));for(const item of h.items){active(h);h.qualified.push(await h.owner.qualifySelection(item.token,{scope:selectedScope}));}
  h.evidence=h.owner.qualifiedEvidence(h.qualified[0]);h.snapshot=await store.run(()=>store.repository.transaction(false,async t=>{const q=maintenanceQualificationReader(qualification,store,t,{topicLabels:true});await checkEvidenceInTransaction(store,q,h.evidence);return readFormationEvidence(store,q,{evidence:h.evidence});}));
  await validateFormationSources(h.snapshot,{store,qualification});active(h);
  h.material={candidates:h.items.map(({ref,row})=>({candidateRef:ref,revision:row.revision,evidence:row.evidence.map(spec)})),inputs:h.snapshot.inputs.filter(x=>!h.currentInputIds.includes(x.id)).map(({id,role,fields,revision})=>({inputId:id,role,fields:copy(fields),revision}))};
  need(bytes(h.material.inputs)<=Math.min(maxContentBytes,store.organizerBudget.limits.maxContentBytes)&&bytes(h.material)<=Math.min(maxRequestBytes,store.organizerBudget.limits.maxRequestBytes),'BUDGET_EXCEEDED');h.captured=true;await store.run(()=>store.repository.transaction(false,t=>assertMaintenanceTopicCandidateSelection(store,t,handle)));return copy(h.material);
 }catch(error){releaseMaintenanceTopicCandidates(handle);throw error;}
}
export function maintenanceTopicCandidateMaterial(handle){const h=state(handle);need(h.captured);return copy(h.material);}
export function maintenanceTopicCandidateCapability(handle,ref){const h=state(handle);need(h.captured);const index=h.items.findIndex(x=>x.ref===ref);need(index>=0&&h.qualified[index]);return h.qualified[index];}
// A source-owned operation binds the already sent candidate snapshot and
// current primary set before the original Topic owner prepares any mutation.
// Neither its identity nor its selected ref can be reconstructed from a DTO.
export function maintenanceTopicCandidateOperation(handle,ref,operationId,response=null,publications=[]){
 const h=state(handle);need(h.captured&&h.items.length&&idOK(operationId));const sent=takeMaintenanceTopicCandidateResponse(response,h.store);if(ref===undefined)ref=sent.candidateRef||null;need(sent.binding.logicalJobId===h.binding.logicalJobId&&sent.binding.childOperationId===h.binding.childOperationId&&sent.candidateRef===(ref??'')&&equal(sent.inputs,h.snapshot.inputs.map(({id,role,revision,fields})=>({id,role,revision,fields})))&&equal(sent.candidates,h.material.candidates),'STALE_BASE');need(ref===null||typeof ref==='string');const index=ref===null?-1:h.items.findIndex(x=>x.ref===ref);need(ref===null||index>=0&&h.qualified[index]);
 const token=Object.freeze({});need(Array.isArray(publications));operations.set(token,{h,handle,index,operationId,publications:[...publications]});return token;
}
export function readMaintenanceTopicCandidateOperation(token,store,{operationId,qualification}={}){
 const o=operations.get(token);need(o&&o.h.store===store&&o.operationId===operationId&&o.h.qualification===qualification);const h=o.h;active(h);need(h.captured&&h.evidence&&h.items.length);
 const item=o.index<0?null:h.items[o.index],candidate=o.index<0?null:h.qualified[o.index];if(candidate)h.owner.qualifiedEvidence(candidate);
 return {candidate,candidateId:item?.row.id??null,candidateRevision:item?.row.revision??null,scope:h.evidence.map(spec),mutationInputIds:h.currentInputIds.filter(id=>h.inputs.get(id)?.evidence.role==='primary'),baselines:h.items.map(x=>copy(x.row)),binding:copy(h.binding)};
}
export async function assertMaintenanceTopicCandidateOperation(token,store,t,options={}){const o=operations.get(token);readMaintenanceTopicCandidateOperation(token,store,options);return assertMaintenanceTopicCandidateSelection(store,t,o.handle,{...options,publications:options.publications??o.publications});}
export function releaseMaintenanceTopicCandidates(handle){const h=held.get(handle);if(!h)return;h.released=true;h.removeAbort?.();clearTimeout(h.expiryTimer);for(const token of [...(h.tokens||[]),...h.qualified])h.owner.releaseSelection(token);h.items.length=0;h.qualified.length=0;h.inputs.clear();h.scope=null;h.summary=null;h.material=null;h.snapshot=null;h.evidence=null;h.qualification=null;held.delete(handle);}
