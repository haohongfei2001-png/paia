import test from 'node:test';
import assert from 'node:assert/strict';
import {promotionFixture,promotionService,decide,rows,op,topic,snapshot} from './harness/topic-04.mjs';
import {createContextScopeWorkBudget,CONTEXT_TOPIC_SCOPE_LIMITS} from '../core/context-topic-scope.js';
import {planMaintenanceSectionPromotion,maintenanceSectionPromotionQualification,maintenanceSectionPromotionSummary,maintenanceSectionPromotionPayloadScope,assertMaintenanceSectionPromotion,releaseMaintenanceSectionPromotion} from '../core/ai-usage/maintenance-section-promotion.js';
import {captureMaintenanceSectionPromotion,maintenanceSectionPromotionPayload,settleMaintenanceSectionPromotion,acceptMaintenanceSectionPromotion,maintenanceSectionPromotionProposal} from '../core/ai-usage/maintenance-section-promotion.js';
import {createMaintenanceQualification,releaseMaintenanceQualification} from '../core/ai-usage/maintenance-qualification.js';
import {readSectionPromotionAssessmentCapture,readSectionPromotionPreparedCapture} from '../core/topic-promotion.js';

const request=f=>({topicIds:[f.parent.id],entryIds:f.entryIds,scope:f.scope});
const read=(f,fn)=>f.s.repository.transaction(false,fn);
const budget=f=>createContextScopeWorkBudget({database:f.s.repository.db});
async function plan(f,r=request(f),workBudget=budget(f)){const handle=await read(f,t=>planMaintenanceSectionPromotion(f.s,t,r,{workBudget}));return {handle,workBudget};}
function trap(t,touched){
 const protect=(table,row)=>{
  if(!row)return row;
  if(['blocks','records'].includes(table))throw Error('ungranted content store');
  const fields={thoughts:['thoughtText','title','note'],topics:['name','nameKey','summary'],sections:['title'],revisions:['before','after']}[table]||[];
  for(const key of fields)Object.defineProperty(row,key,{configurable:true,enumerable:true,get(){touched.push([table,key]);throw Error('ungranted field');}});
  return row;
 };
 const get=t.get.bind(t),range=t.rangePage.bind(t),primary=t.primaryRangePage.bind(t);
 t.get=async(table,...args)=>protect(table,await get(table,...args));
 t.rangePage=async(table,...args)=>{const p=await range(table,...args);for(const row of p.rows)protect(table,row.value);return p;};
 t.primaryRangePage=async(table,...args)=>{const p=await primary(table,...args);for(const row of p.rows)protect(table,row.value);return p;};
 return t;
}
test('metadata plan requests each original qualification field without changing Source, Entry or receipts',async()=>{
 const f=await promotionFixture({count:2}),before=await snapshot(f.s),{handle,workBudget}=await plan(f),q=maintenanceSectionPromotionQualification(handle,f.s),s=maintenanceSectionPromotionSummary(handle,f.s);
 assert.equal(s.status,'READY');assert.equal(s.completeIdentityUniverse,true);assert.deepEqual(new Set(q.entryIds),new Set(f.entryIds));assert.deepEqual(q.historyEntryIds,q.entryIds);assert.deepEqual(q.inputIds,f.scope.map(i=>i.inputId));
 assert.deepEqual(q.structures,[{store:'topics',recordId:f.parent.id,selectedFields:['name','summary']},{store:'sections',recordId:JSON.stringify([f.parent.id,1,f.section.sectionId]),selectedFields:['title']}]);
 const used=workBudget.reads;assert.ok(used>0);await read(f,t=>assertMaintenanceSectionPromotion(f.s,t,handle));assert.ok(workBudget.reads>used);assert.deepEqual(await snapshot(f.s),before);
});
test('selection and assertion never acquire labels, Entry fields, history bodies, Input or Source text',async()=>{
 const f=await promotionFixture(),touched=[],workBudget=budget(f),handle=await read(f,t=>planMaintenanceSectionPromotion(f.s,trap(t,touched),request(f),{workBudget}));
 await read(f,t=>assertMaintenanceSectionPromotion(f.s,trap(t,touched),handle));assert.deepEqual(touched,[]);assert.equal(maintenanceSectionPromotionSummary(handle,f.s).status,'READY');
});
test('complete identity metadata includes another exact ID even with an identical label',async()=>{
 const f=await promotionFixture(),other=await topic(f.s,'Parent synthetic object'),{handle}=await plan(f),q=maintenanceSectionPromotionQualification(handle,f.s);
 assert.deepEqual(new Set(q.structures.filter(x=>x.store==='topics').map(x=>x.recordId)),new Set([f.parent.id,other.id]));
 assert.deepEqual(q.structures.find(x=>x.recordId===other.id).selectedFields,['name']);assert.deepEqual(q.structures.find(x=>x.recordId===f.parent.id).selectedFields,['name','summary']);assert.equal(maintenanceSectionPromotionSummary(handle,f.s).completeIdentityUniverse,true);
});
test('the ninth identity defers the entire proposal before any content read instead of certifying a shortlist',async()=>{
 const f=await promotionFixture();for(let i=0;i<8;i++)await topic(f.s,'Other synthetic identity '+i);
 const touched=[],workBudget=budget(f),handle=await read(f,t=>planMaintenanceSectionPromotion(f.s,trap(t,touched),request(f),{workBudget}));
 assert.equal(maintenanceSectionPromotionSummary(handle,f.s).reason,'IDENTITY_UNIVERSE_OVER_BUDGET');assert.equal(maintenanceSectionPromotionSummary(handle,f.s).completeIdentityUniverse,false);assert.equal(maintenanceSectionPromotionQualification(handle,f.s),null);assert.deepEqual(touched,[]);
});
test('a whole Section prefix yields no processing-field request',async()=>{
 const f=await promotionFixture({count:2}),r=request(f);r.entryIds=r.entryIds.slice(0,1);const {handle}=await plan(f,r);
 assert.equal(maintenanceSectionPromotionQualification(handle,f.s),null);assert.equal(maintenanceSectionPromotionSummary(handle,f.s).status,'DEFER');assert.equal(maintenanceSectionPromotionSummary(handle,f.s).omitted[0].reason,'WHOLE_SECTION_NOT_SELECTED');
});
test('foreign Source identity provenance cannot expand selected Input scope',async()=>{
 const f=await promotionFixture();await f.s.repository.transaction(true,async t=>{const row=await t.get('topics',f.parent.id);row.sourceRecordIds=['unselected-source'];await t.put('topics',row);});
 const {handle}=await plan(f);assert.equal(maintenanceSectionPromotionSummary(handle,f.s).reason,'IDENTITY_SOURCE_OUTSIDE_SELECTED_SCOPE');assert.equal(maintenanceSectionPromotionQualification(handle,f.s),null);
});
for(const change of ['topic revision','Entry revision','Section revision','placement revision','dependency status','keep separate','new identity'])test('frozen metadata rejects '+change+' without a new selection',async()=>{
 const f=await promotionFixture(),{handle}=await plan(f);
 if(change==='new identity')await topic(f.s,'Later identity');else await f.s.repository.transaction(true,async t=>{
  if(change==='keep separate'){await t.put('meta',{id:'topicKeepSeparate:'+op(),sourceId:f.parent.id,targetId:op(),actor:'user',revision:1});return;}
  const table=change.startsWith('topic')?'topics':change.startsWith('Entry')?'thoughts':change.startsWith('Section')?'sections':change.startsWith('placement')?'placements':'dependencies';
  const key=table==='topics'?f.parent.id:table==='thoughts'?f.entryIds[0]:table==='sections'?JSON.stringify([f.parent.id,1,f.section.sectionId]):null,row=key?await t.get(table,key):(await t.all(table))[0];
  if(table==='dependencies')row.status='input_removed';else row.revision++;await t.put(table,row);
 });await assert.rejects(read(f,t=>assertMaintenanceSectionPromotion(f.s,t,handle)));
});
test('same-root in-place identity metadata drift is compared, not refreshed',async()=>{
 const f=await promotionFixture(),{handle}=await plan(f);
 await assert.rejects(read(f,t=>{const range=t.rangePage.bind(t);t.rangePage=async(table,...args)=>{const page=await range(table,...args);if(table==='topics')for(const row of page.rows)row.value.identity.revision++;return page;};return assertMaintenanceSectionPromotion(f.s,t,handle);}));
});
test('released, forged, foreign-store and changed-database metadata capabilities fail closed',async()=>{
 const f=await promotionFixture(),{handle}=await plan(f);
 assert.throws(()=>maintenanceSectionPromotionQualification({},f.s));assert.throws(()=>maintenanceSectionPromotionQualification(handle,{}));
 const db=f.s.repository.db;f.s.repository.db={};assert.throws(()=>maintenanceSectionPromotionQualification(handle,f.s));f.s.repository.db=db;
 releaseMaintenanceSectionPromotion(handle);assert.throws(()=>maintenanceSectionPromotionSummary(handle,f.s));await assert.rejects(read(f,t=>assertMaintenanceSectionPromotion(f.s,t,handle)));
});
test('the original branded cumulative work limit stops before another metadata or body read',async()=>{
 const f=await promotionFixture(),workBudget=budget(f),{handle}=await plan(f,request(f),workBudget);workBudget.reads=CONTEXT_TOPIC_SCOPE_LIMITS.reads;
 let reads=0;await assert.rejects(read(f,t=>{t.get=async()=>{reads++;throw Error('read after exhausted budget');};return assertMaintenanceSectionPromotion(f.s,t,handle);}));assert.equal(reads,0);
 await assert.rejects(plan(f,request(f),{reads:0,seen:new Map(),hashBytes:0,hashFields:0,database:f.s.repository.db}));
});
test('aborted original work budget and accessor-bearing request never start metadata selection',async()=>{
 const f=await promotionFixture(),controller=new AbortController(),workBudget=createContextScopeWorkBudget({database:f.s.repository.db,signal:controller.signal});controller.abort();
 await assert.rejects(plan(f,request(f),workBudget));let touches=0;const r=request(f);Object.defineProperty(r,'scope',{enumerable:true,get(){touches++;return f.scope;}});await assert.rejects(plan(f,r));assert.equal(touches,0);
});

function response(view,binding){
 const a=decide(view),citations=[],ref=c=>{let i=citations.findIndex(x=>JSON.stringify(x)===JSON.stringify(c));if(i<0){i=citations.length;citations.push(structuredClone(c));}return i;},claim=c=>({...c,citations:c.citations.map(ref)}),f=a.formation;
 return {version:1,...binding,status:'PROPOSE',reason:'',citations,kind:f.kind,name:f.name,substance:claim(f.substance),boundary:claim(f.boundary),returnValue:claim(f.returnValue),continuity:claim(f.continuity),evidence:f.evidence.map(ref),relations:f.relations.map(r=>({...r,citations:r.citations.map(ref)})),entries:f.entries.map(e=>({entryId:e.entryId,expectedRevision:view.entries.find(x=>x.id===e.entryId).revision,span:ref(e.span),type:e.type})),independence:claim(a.independence),selection:{kind:'whole_section',count:view.manifest.count,manifestDigest:view.manifest.digest,necessary:'all_selected_placements'}};
}
async function sourceFixture({mutateGrant=null}={}){
 const f=await promotionFixture({count:2}),{handle:planHandle,workBudget}=await plan(f),controller=new AbortController(),caller=Object.freeze({id:op()}),state={current:true,grant:null},expiresAt=Date.now()+600000;
 const binding={logicalJobId:op(),childOperationId:op(),proposalOperationId:op(),sectionRef:'s0'},r={scope:f.scope,topicId:f.parent.id,sectionId:f.section.sectionId,selection:'whole_section',operationId:binding.proposalOperationId};
 const processing={resolve:async(_t,scope)=>{state.grant=structuredClone(scope);return {version:1,store:f.s,caller,scope:mutateGrant?mutateGrant(structuredClone(scope)):scope,epoch:'synthetic-promotion-fields',processing:true,expiresAt,revocationSignal:controller.signal};},isCurrent:()=>state.current};
 const qualify=()=>read(f,t=>createMaintenanceQualification(f.s,t,{items:[],coverage:[]},{processing,caller,binding,isCurrent:()=>state.current,signal:controller.signal,workBudget,selection:maintenanceSectionPromotionQualification(planHandle,f.s)}));
 return {...f,planHandle,workBudget,controller,caller,state,expiresAt,binding,r,qualify};
}
test('actual original qualified capture maps the already selected page into a genuine private preview without writing',async()=>{
 const f=await sourceFixture(),token=await f.qualify(),before=await snapshot(f.s);let captured,payload,original;
 const service=promotionService(f,async(view,_reader,cap)=>{original=cap;assert.ok(readSectionPromotionAssessmentCapture(cap,f.s));captured=await captureMaintenanceSectionPromotion(f.s,f.planHandle,cap,f.binding);payload=maintenanceSectionPromotionPayload(captured,f.s);const mapped=await settleMaintenanceSectionPromotion(captured,f.s,response(view,f.binding));return mapped.assessment;},{resolveQualification:()=>token});
 try{
  const preview=await service.prepare(f.r);assert.equal(readSectionPromotionAssessmentCapture(original,f.s),null);assert.equal(readSectionPromotionPreparedCapture(preview,f.s).owner,service);
  await acceptMaintenanceSectionPromotion(captured,f.s,preview);const proposal=maintenanceSectionPromotionProposal(captured,f.s);assert.equal(proposal.owner,service);assert.equal(proposal.handle,preview);assert.equal(proposal.operationId,f.r.operationId);assert.equal(preview.wholeSection,true);assert.equal(payload.pages[0].entries.length,2);assert.deepEqual(await snapshot(f.s),before);assert.ok(f.workBudget.hashBytes>0);
  assert.throws(()=>maintenanceSectionPromotionProposal({...captured},f.s));await assert.rejects(service.confirm(preview,{confirmed:false}));
  releaseMaintenanceSectionPromotion(captured);assert.throws(()=>readSectionPromotionPreparedCapture(preview,f.s));await assert.rejects(service.confirm(preview,{confirmed:true}));
 }finally{releaseMaintenanceQualification(token);releaseMaintenanceSectionPromotion(f.planHandle);await f.s.repository.close();}
});
for(const field of ['Topic name','Topic summary','Section title','Entry body','Entry title','Entry note','history','Input note','Source'])test('resolver denial of '+field+' refuses before any original content read or response capture',async()=>{
 const f=await sourceFixture({mutateGrant:scope=>{if(field==='Topic summary')scope.structures.find(x=>x.store==='topics'&&x.selectedFields.includes('summary')).selectedFields=['name'];else if(field==='Topic name'||field==='Section title')scope.structures=scope.structures.filter(x=>x.store!==(field==='Topic name'?'topics':'sections'));else if(field.startsWith('Entry'))scope.entries[0].selectedFields=scope.entries[0].selectedFields.filter(x=>x!==field.slice(6));else if(field==='history')scope.journals=[];else if(field==='Input note')scope.inputs[0].selectedFields=['body'];else scope.sources=[];return scope;}});
 let touched=[];const transaction=f.s.repository.transaction.bind(f.s.repository);f.s.repository.transaction=(write,fn,...args)=>transaction(write,t=>fn(trap(t,touched)),...args);
 try{await assert.rejects(f.qualify());assert.deepEqual(touched,[]);assert.equal((await rows(f.s,'organizerJobs')).length,0);}finally{f.s.repository.transaction=transaction;releaseMaintenanceSectionPromotion(f.planHandle);await f.s.repository.close();}
});
test('legacy direct owner still works but its real unqualified capability cannot enter the Maintenance bridge',async()=>{
 const f=await sourceFixture();let original,rejected=false;const service=promotionService(f,async(view,reader,cap)=>{original=cap;await assert.rejects(captureMaintenanceSectionPromotion(f.s,f.planHandle,cap,f.binding));rejected=true;await reader.readPage(0);return {...decide(view),selection:{kind:'whole_section',count:view.manifest.count,manifestDigest:view.manifest.digest,necessary:'all_selected_placements'}};});
 const preview=await service.prepare(f.r);assert.equal(rejected,true);assert.equal(readSectionPromotionPreparedCapture(preview,f.s).qualification,null);assert.equal(readSectionPromotionAssessmentCapture(original,f.s),null);assert.equal(readSectionPromotionPreparedCapture({...preview},f.s),null);
});
for(const change of ['forged capability','foreign store','wrong operation','wrong role','unknown ref','stale revision','second settlement','revoked grant'])test('source binding rejects '+change+' without proposal or writes',async()=>{
 const f=await sourceFixture(),token=await f.qualify(),before=await snapshot(f.s);let captured,entered=false;
 const service=promotionService(f,async(view,_reader,cap)=>{entered=true;
  if(change==='forged capability')return captureMaintenanceSectionPromotion(f.s,f.planHandle,{...cap},f.binding);
  if(change==='foreign store')return captureMaintenanceSectionPromotion({},f.planHandle,cap,f.binding);
  if(change==='wrong operation')return captureMaintenanceSectionPromotion(f.s,f.planHandle,cap,{...f.binding,proposalOperationId:op()});
  captured=await captureMaintenanceSectionPromotion(f.s,f.planHandle,cap,f.binding);const wire=response(view,f.binding);
  if(change==='unknown ref')wire.sectionRef='s1';if(change==='stale revision')wire.entries[0].expectedRevision++;if(change==='revoked grant')f.controller.abort();
  const mapped=await settleMaintenanceSectionPromotion(captured,f.s,wire);if(change==='second settlement')return settleMaintenanceSectionPromotion(captured,f.s,wire);return mapped.assessment;
 },{resolveQualification:()=>token});
 if(change==='wrong role')f.r.scope=f.r.scope.map(x=>({...x,role:'supporting'}));
 try{await assert.rejects(service.prepare(f.r));assert.equal(entered,true);assert.deepEqual(await snapshot(f.s),before);if(captured)assert.throws(()=>maintenanceSectionPromotionProposal(captured,f.s));}finally{releaseMaintenanceSectionPromotion(captured);releaseMaintenanceQualification(token);releaseMaintenanceSectionPromotion(f.planHandle);await f.s.repository.close();}
});
test('release cancels the original preview even while its processing qualification is revoked',async()=>{
 const f=await sourceFixture(),token=await f.qualify();let captured;
 const service=promotionService(f,async(view,_reader,cap)=>{captured=await captureMaintenanceSectionPromotion(f.s,f.planHandle,cap,f.binding);return (await settleMaintenanceSectionPromotion(captured,f.s,response(view,f.binding))).assessment;},{resolveQualification:()=>token});
 const preview=await service.prepare(f.r);await acceptMaintenanceSectionPromotion(captured,f.s,preview);f.state.current=false;releaseMaintenanceSectionPromotion(captured);f.state.current=true;
 await assert.rejects(service.confirm(preview,{confirmed:true}));assert.throws(()=>maintenanceSectionPromotionProposal(captured,f.s));releaseMaintenanceQualification(token);releaseMaintenanceSectionPromotion(f.planHandle);await f.s.repository.close();
});


test('remote payload scope comes only from exact metadata and separates local-only qualification fields',async()=>{
 const f=await promotionFixture({count:2}),touched=[],workBudget=budget(f),binding={logicalJobId:op(),childOperationId:op(),proposalOperationId:op(),sectionRef:'s0'};let handle;
 try{handle=await read(f,t=>planMaintenanceSectionPromotion(f.s,trap(t,touched),request(f),{workBudget}));const before=workBudget.reads,scope=maintenanceSectionPromotionPayloadScope(handle,f.s,binding);assert.equal(scope.purpose,'ai-maintenance-section-promotion-payload');assert.deepEqual({...scope.binding},binding);assert.equal(workBudget.reads,before);assert.deepEqual(touched,[]);assert.deepEqual(scope.entries.map(x=>x.entryId).sort(),f.entryIds.slice().sort());assert.ok(scope.entries.every(x=>JSON.stringify(x.selectedFields)==='["body"]'));assert.ok(scope.structures.every(x=>JSON.stringify(x.selectedFields)===JSON.stringify([x.store==='topics'?'name':'title'])));assert.ok(scope.inputs.every(x=>Number.isSafeInteger(x.revision)));assert.equal(scope.inputs.length,f.scope.length);for(const forbidden of ['originalText','summary','thoughtText','before.body','after.body'])assert.ok(!JSON.stringify(scope).includes('"'+forbidden+'"'));assert.ok(Object.isFrozen(scope)&&Object.isFrozen(scope.metadata.entries));assert.throws(()=>maintenanceSectionPromotionPayloadScope({...handle},f.s,binding));assert.throws(()=>maintenanceSectionPromotionPayloadScope(handle,{repository:f.s.repository},binding));releaseMaintenanceSectionPromotion(handle);assert.throws(()=>maintenanceSectionPromotionPayloadScope(handle,f.s,binding));}finally{releaseMaintenanceSectionPromotion(handle);await f.s.repository.close();}
});
