import test from 'node:test';
import assert from 'node:assert/strict';
import {promotionFixture,promotionService,decide,rows,op} from './harness/topic-04.mjs';
import {createContextScopeWorkBudget} from '../core/context-topic-scope.js';
import {readPromotionQualifiedMutation} from '../core/topic-promotion-commit.js';
import {TopicProcessingAuthority} from '../core/topic-processing-authority.js';
import {createMaintenanceQualification,releaseMaintenanceQualification} from '../core/ai-usage/maintenance-qualification.js';
import {planMaintenanceSectionPromotion,maintenanceSectionPromotionQualification,releaseMaintenanceSectionPromotion,captureMaintenanceSectionPromotion,maintenanceSectionPromotionPayload,settleMaintenanceSectionPromotion,acceptMaintenanceSectionPromotion,maintenanceSectionPromotionProposal} from '../core/ai-usage/maintenance-section-promotion.js';

function wire(view,binding){
 const a=decide(view),citations=[],ref=c=>{let i=citations.findIndex(x=>JSON.stringify(x)===JSON.stringify(c));if(i<0){i=citations.length;citations.push(structuredClone(c));}return i;},claim=c=>({...c,citations:c.citations.map(ref)}),f=a.formation;
 return {version:1,...binding,status:'PROPOSE',reason:'',citations,kind:f.kind,name:f.name,substance:claim(f.substance),boundary:claim(f.boundary),returnValue:claim(f.returnValue),continuity:claim(f.continuity),evidence:f.evidence.map(ref),relations:f.relations.map(r=>({...r,citations:r.citations.map(ref)})),entries:f.entries.map(e=>({entryId:e.entryId,expectedRevision:view.entries.find(x=>x.id===e.id||x.id===e.entryId).revision,span:ref(e.span),type:e.type})),independence:claim(a.independence),selection:{kind:'whole_section',count:view.manifest.count,manifestDigest:view.manifest.digest,necessary:'all_selected_placements'}};
}
async function setup({summary=null}={}){
 const f=await promotionFixture({count:2});if(summary!==null)await f.s.repository.transaction(true,async t=>{const row=await t.get('topics',f.parent.id);row.summary=summary;await t.put('topics',row);});const workBudget=createContextScopeWorkBudget({database:f.s.repository.db}),plan=await f.s.repository.transaction(false,t=>planMaintenanceSectionPromotion(f.s,t,{topicIds:[f.parent.id],entryIds:f.entryIds,scope:f.scope},{workBudget})),fieldCaller=Object.freeze({id:op()}),identityCaller=Object.freeze({id:op()}),fieldAbort=new AbortController(),identityAbort=new AbortController(),state={fields:true,identity:true,identityCalls:0},expiresAt=Date.now()+600000,fieldReceipts=new WeakSet(),identityReceipts=new WeakSet(),binding={logicalJobId:op(),childOperationId:op(),proposalOperationId:op(),sectionRef:'s0'};
 const fieldProcessing={resolve:async(_t,scope)=>{const receipt={version:1,store:f.s,caller:fieldCaller,scope,epoch:'promotion-exact-fields',processing:true,expiresAt,revocationSignal:fieldAbort.signal};fieldReceipts.add(receipt);return receipt;},isCurrent:r=>state.fields&&fieldReceipts.has(r)};
 const qualification=await f.s.repository.transaction(false,t=>createMaintenanceQualification(f.s,t,{items:[],coverage:[]},{processing:fieldProcessing,caller:fieldCaller,binding,isCurrent:()=>state.fields,signal:fieldAbort.signal,workBudget,selection:maintenanceSectionPromotionQualification(plan,f.s)}));
 const identityProcessing={resolve:async(_t,scope)=>{state.identityCalls++;const receipt={version:1,store:f.s,caller:identityCaller,scope,epoch:'promotion-independent-identity',processing:true,expiresAt,revocationSignal:identityAbort.signal};identityReceipts.add(receipt);return receipt;},isCurrent:r=>state.identity&&identityReceipts.has(r)};
 const identity=new TopicProcessingAuthority(f.s,{caller:identityCaller,processing:identityProcessing,binding:{operationId:binding.proposalOperationId},workBudget});let captured;
 const service=promotionService(f,async(view,_reader,cap)=>{captured=await captureMaintenanceSectionPromotion(f.s,plan,cap,binding);state.view=structuredClone(view);state.payload=maintenanceSectionPromotionPayload(captured,f.s);state.wire=wire(view,binding);return (await settleMaintenanceSectionPromotion(captured,f.s,state.wire)).assessment;},{resolveQualification:()=>qualification,resolveProcessing:(t,request)=>identity.authorize(t,request)}),request={scope:f.scope,topicId:f.parent.id,sectionId:f.section.sectionId,selection:'whole_section',operationId:binding.proposalOperationId};
 const close=async()=>{releaseMaintenanceSectionPromotion(captured);releaseMaintenanceSectionPromotion(plan);releaseMaintenanceQualification(qualification);identity.release();await f.s.repository.close();};
 return {...f,workBudget,plan,qualification,fieldAbort,identityAbort,state,expiresAt,identity,service,request,close,prepare:async()=>{const preview=await service.prepare(request);await acceptMaintenanceSectionPromotion(captured,f.s,preview);return maintenanceSectionPromotionProposal(captured,f.s);}};
}

test('genuine independently qualified source proposal confirms, stages and activates under original closed terminal authority',async()=>{
 const f=await setup();try{const proposal=await f.prepare();assert.equal(proposal.owner,f.service);const work=await proposal.owner.confirm(proposal.handle,{confirmed:true});const staged=await proposal.owner.stage(work.workId);assert.equal(staged.state,'ready');const result=await proposal.owner.activate(work.workId);assert.equal(result.operationId,f.request.operationId);assert.equal(result.intentMode,'ai_proposal');assert.equal((await rows(f.s,'topics')).length,2);assert.equal((await rows(f.s,'operationReceipts')).filter(x=>x.id===f.request.operationId).length,1);assert.ok(f.state.identityCalls>1);assert.ok(f.workBudget.hashBytes>0);}finally{await f.close();}
});

for(const phase of ['confirm','stage'])test('qualified '+phase+' rejects field revocation on the actual awaited Topic row before dereferencing its label',async()=>{const f=await setup();const transaction=f.s.repository.transaction.bind(f.s.repository);let armed=false,reads=0,touches=0;try{const proposal=await f.prepare();let work;if(phase==='stage')work=await f.service.confirm(proposal.handle,{confirmed:true});f.s.repository.transaction=(write,fn,...args)=>transaction(write,async t=>{if(write){const get=t.get.bind(t);t.get=async(table,id,...rest)=>{const row=await get(table,id,...rest);if(armed&&table==='topics'&&id===f.parent.id&&row){reads++;f.fieldAbort.abort();const name=row.name;Object.defineProperty(row,'name',{enumerable:true,configurable:true,get(){touches++;return name;}});}return row;};}return fn(t);},...args);armed=true;await assert.rejects(phase==='confirm'?f.service.confirm(proposal.handle,{confirmed:true}):f.service.stage(work.workId));assert.ok(reads>0);assert.equal(touches,0,'no label read after the original field signal was revoked');}finally{f.s.repository.transaction=transaction;await f.close();}});

test('selected parent summary has its own local grant and is absent from the actual assessment and remote wire',async()=>{const summary='SYNTHETIC PRIVATE PARENT SUMMARY ONLY',f=await setup({summary});try{const requested=maintenanceSectionPromotionQualification(f.plan,f.s),parent=requested.structures.find(x=>x.store==='topics'&&x.recordId===f.parent.id);assert.deepEqual(parent.selectedFields,['name','summary']);const proposal=await f.prepare();assert.equal(proposal.owner,f.service);for(const data of [f.state.view,f.state.payload,f.state.wire])assert.equal(JSON.stringify(data).includes(summary),false);}finally{await f.close();}});

for(const phase of ['prepare','confirm','stage'])for(const changed of ['revoked','expired'])test('selected parent summary '+phase+' rejects '+changed+' permission before its actual field getter',async()=>{
 const f=await setup({summary:'SYNTHETIC LOCAL SUMMARY'}),transaction=f.s.repository.transaction.bind(f.s.repository),now=Date.now;let touches=0,hit=false,armed=false;
 try{let proposal,work;if(phase!=='prepare')proposal=await f.prepare();if(phase==='stage')work=await f.service.confirm(proposal.handle,{confirmed:true});
  f.s.repository.transaction=(write,fn,...args)=>transaction(write,async t=>{const get=t.get.bind(t);t.get=async(table,id,...rest)=>{const row=await get(table,id,...rest);if(armed&&!hit&&table==='topics'&&id===f.parent.id&&row){hit=true;const value=row.summary;Object.defineProperty(row,'summary',{enumerable:true,configurable:true,get(){touches++;return value;}});if(changed==='revoked')f.fieldAbort.abort();else Date.now=()=>f.expiresAt;}return row;};return fn(t);},...args);armed=true;
  await assert.rejects(phase==='prepare'?f.prepare():phase==='confirm'?f.service.confirm(proposal.handle,{confirmed:true}):f.service.stage(work.workId));assert.equal(hit,true);assert.equal(touches,0);
 }finally{Date.now=now;f.s.repository.transaction=transaction;await f.close();}
});

const protectedTables=['topics','sections','thoughts','placements','dependencies','provenance','revisions','operationReceipts','organizerWorkItems','records','blocks','meta'];
const databaseFacts=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(protectedTables.map(async table=>[table,await t.all(table)]))));
const nativePut=(t,table,row)=>new Promise((resolve,reject)=>{const request=t.tx.objectStore(table).put(row);request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error);});
for(const drift of ['entry body','entry title','entry note','entry revision','parent summary','source'])test('strict original activation rolls back external '+drift+' after its own receipt without refreshing the sent baseline',async()=>{
 const f=await setup({summary:'SYNTHETIC ORIGINAL SUMMARY'}),transaction=f.s.repository.transaction.bind(f.s.repository);let hit=false;
 try{const proposal=await f.prepare(),work=await f.service.confirm(proposal.handle,{confirmed:true});await f.service.stage(work.workId);const before=await databaseFacts(f.s);
  f.s.repository.transaction=(write,fn,...args)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(table,row,...rest)=>{const result=await put(table,row,...rest);if(!hit&&table==='operationReceipts'&&row.id===f.request.operationId){hit=true;if(drift.startsWith('entry')){const value=await t.get('thoughts',f.entryIds[0]);if(drift==='entry revision')value.revision++;else{const field=drift==='entry body'?'thoughtText':drift==='entry title'?'title':'note';value[field]=(value[field]||'')+' SYNTHETIC UNAUTHORIZED DRIFT';}await nativePut(t,'thoughts',value);}else if(drift==='parent summary'){const value=await t.get('topics',f.parent.id);value.summary+=' SYNTHETIC UNAUTHORIZED DRIFT';await nativePut(t,'topics',value);}else{const [value]=await t.all('records');value.value.originalText+=' SYNTHETIC UNAUTHORIZED DRIFT';await nativePut(t,'records',value);}}return result;};}return fn(t);},...args);
  await assert.rejects(f.service.activate(work.workId));assert.equal(hit,true);assert.deepEqual(await databaseFacts(f.s),before);
 }finally{f.s.repository.transaction=transaction;await f.close();}
});
for(const revoked of ['fields','identity','parent summary'])test('strict original activation rejects '+revoked+' after Repository backup finalization and rolls back',async()=>{
 const f=await setup({summary:'SYNTHETIC ORIGINAL SUMMARY'}),transaction=f.s.repository.transaction.bind(f.s.repository);let entered=false,hit=false;
 try{const proposal=await f.prepare(),work=await f.service.confirm(proposal.handle,{confirmed:true});await f.service.stage(work.workId);const before=await databaseFacts(f.s);
  f.s.repository.transaction=(write,fn,...args)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(table,row,...rest)=>{const result=await put(table,row,...rest);if(table==='operationReceipts'&&row.id===f.request.operationId)entered=true;if(entered&&!hit&&table==='meta'&&row.id==='backup-data-generation'){hit=true;if(revoked==='fields')f.fieldAbort.abort();else if(revoked==='identity')f.identityAbort.abort();else{const parent=await t.get('topics',f.parent.id);parent.summary+=' SYNTHETIC LATE SUMMARY';await nativePut(t,'topics',parent);}}return result;};}return fn(t);},...args);
  await assert.rejects(f.service.activate(work.workId));assert.equal(hit,true);assert.deepEqual(await databaseFacts(f.s),before);
 }finally{f.s.repository.transaction=transaction;await f.close();}
});


test('actual private own-mutation capability binds original writer, grant, transaction and immutable old semantics',async()=>{
 const f=await setup({summary:'SYNTHETIC LOCAL SUMMARY'}),other=await setup(),resolve=f.service.retrieval.guard.resolveOwnMutation;let cap,original,checks=0;
 try{const proposal=await f.prepare(),work=await f.service.confirm(proposal.handle,{confirmed:true});await f.service.stage(work.workId);
  f.service.retrieval.guard.resolveOwnMutation=t=>{const token=resolve(t);if(token){const state=readPromotionQualifiedMutation(token,f.s,t,f.qualification);if(state.rows.length){cap=token;original=t;checks++;assert.ok(Object.isFrozen(state)&&Object.isFrozen(state.rows));for(const row of state.rows){assert.ok(Object.isFrozen(row.before)&&Object.isFrozen(row.after));assert.ok(row.table==='thoughts'?f.entryIds.includes(row.key):row.table==='topics'&&row.key===f.parent.id);assert.equal(row.after.revision,row.before.revision+1);assert.equal(row.after.organizationRevision,row.before.organizationRevision+1);for(const field of row.table==='thoughts'?['thoughtText','title','note']:['name','nameKey','summary'])assert.deepEqual(row.before[field],row.after[field]);}assert.throws(()=>readPromotionQualifiedMutation({...token},f.s,t,f.qualification));assert.throws(()=>readPromotionQualifiedMutation(token,other.s,t,f.qualification));assert.throws(()=>readPromotionQualifiedMutation(token,f.s,{...t,tx:t.tx},f.qualification));assert.throws(()=>readPromotionQualifiedMutation(token,f.s,t,{...f.qualification}));}}return token;};
  await f.service.activate(work.workId);assert.ok(checks>0);assert.throws(()=>readPromotionQualifiedMutation(cap,f.s,original,f.qualification));await f.s.repository.transaction(true,t=>assert.throws(()=>readPromotionQualifiedMutation(cap,f.s,t,f.qualification)));
 }finally{f.service.retrieval.guard.resolveOwnMutation=resolve;await other.close();await f.close();}
});
for(const field of ['thoughtText','unknownSemantic'])test('own-row final comparison refuses '+field+' accessor without dereferencing it',async()=>{
 const f=await setup(),transaction=f.s.repository.transaction.bind(f.s.repository);let entered=false,touches=0,hit=false;
 try{const proposal=await f.prepare(),work=await f.service.confirm(proposal.handle,{confirmed:true});await f.service.stage(work.workId);const before=await databaseFacts(f.s);
  f.s.repository.transaction=(write,fn,...args)=>transaction(write,async t=>{if(write){const put=t.put.bind(t),get=t.get.bind(t);t.put=async(table,row,...rest)=>{const result=await put(table,row,...rest);if(table==='operationReceipts'&&row.id===f.request.operationId)entered=true;return result;};t.get=async(table,id,...rest)=>{const row=await get(table,id,...rest);if(entered&&table==='thoughts'&&id===f.entryIds[0]&&row){hit=true;const value=row[field];Object.defineProperty(row,field,{enumerable:true,configurable:true,get(){touches++;return value;}});}return row;};}return fn(t);},...args);
  await assert.rejects(f.service.activate(work.workId));assert.equal(hit,true);assert.equal(touches,0);f.s.repository.transaction=transaction;assert.deepEqual(await databaseFacts(f.s),before);
 }finally{f.s.repository.transaction=transaction;await f.close();}
});

test('strict original activation retains one committed result after a lost repository acknowledgement',async()=>{
 const f=await setup(),transaction=f.s.repository.transaction.bind(f.s.repository);let lost=false;
 try{const proposal=await f.prepare(),work=await f.service.confirm(proposal.handle,{confirmed:true});await f.service.stage(work.workId);
  f.s.repository.transaction=async(write,fn,...args)=>{const result=await transaction(write,fn,...args);if(write&&!lost&&result?.kind==='personal_topic_promotion'){lost=true;throw Object.assign(Error('SYNTHETIC acknowledgement lost'),{code:'STORAGE_FAILED'});}return result;};
  await assert.rejects(f.service.activate(work.workId));assert.equal(lost,true);const committed=(await rows(f.s,'operationReceipts')).find(row=>row.id===f.request.operationId);assert.ok(committed);const before=await databaseFacts(f.s),retried=await f.service.activate(work.workId);assert.deepEqual(retried,committed.result);assert.deepEqual(await databaseFacts(f.s),before);assert.equal((await rows(f.s,'topics')).length,2);
 }finally{f.s.repository.transaction=transaction;await f.close();}
});

for(const field of ['thoughtText','unknownSemantic','nestedUnknownSemantic'])test('post-own original evidence read refuses '+field+' accessor before its original binding clone',async()=>{
 const f=await setup(),transaction=f.s.repository.transaction.bind(f.s.repository),check=f.service.checkSentEvidence;let armed=false,touches=0,hit=false;
 try{const proposal=await f.prepare(),work=await f.service.confirm(proposal.handle,{confirmed:true});await f.service.stage(work.workId);const before=await databaseFacts(f.s);
  f.service.checkSentEvidence=async function(t,state,selectedIds=[]){if(selectedIds.length)armed=true;return check.call(this,t,state,selectedIds);};
  f.s.repository.transaction=(write,fn,...args)=>transaction(write,async t=>{if(write){const get=t.get.bind(t);t.get=async(table,id,...rest)=>{const row=await get(table,id,...rest);if(armed&&table==='thoughts'&&id===f.entryIds[0]&&row){hit=true;const target=field==='nestedUnknownSemantic'?row.protections.body:row,value=target[field];Object.defineProperty(target,field,{enumerable:true,configurable:true,get(){touches++;return value;}});}return row;};}return fn(t);},...args);
  const accepted=await f.service.activate(work.workId).then(()=>true,()=>false);assert.deepEqual({accepted,hit,touches},{accepted:false,hit:true,touches:0});f.s.repository.transaction=transaction;assert.deepEqual(await databaseFacts(f.s),before);
 }finally{f.service.checkSentEvidence=check;f.s.repository.transaction=transaction;await f.close();}
});

test('post-own entry revision ABA cannot recover the pre-write field baseline',async()=>{
 const f=await setup(),transaction=f.s.repository.transaction.bind(f.s.repository),check=f.service.checkSentEvidence;let armed=false,touches=0,hit=false;
 try{const proposal=await f.prepare(),work=await f.service.confirm(proposal.handle,{confirmed:true});await f.service.stage(work.workId);const before=await databaseFacts(f.s),old=before.thoughts.find(row=>row.id===f.entryIds[0]);
  f.service.checkSentEvidence=async function(t,state,selectedIds=[]){if(selectedIds.length)armed=true;return check.call(this,t,state,selectedIds);};
  f.s.repository.transaction=(write,fn,...args)=>transaction(write,async t=>{if(write){const get=t.get.bind(t);t.get=async(table,id,...rest)=>{const row=await get(table,id,...rest);if(armed&&table==='thoughts'&&id===f.entryIds[0]&&row){hit=true;row.revision=old.revision;row.organizationRevision=old.organizationRevision;const value=row.thoughtText;Object.defineProperty(row,'thoughtText',{enumerable:true,configurable:true,get(){touches++;return value;}});}return row;};}return fn(t);},...args);
  const accepted=await f.service.activate(work.workId).then(()=>true,()=>false);assert.deepEqual({accepted,hit,touches},{accepted:false,hit:true,touches:0});f.s.repository.transaction=transaction;assert.deepEqual(await databaseFacts(f.s),before);
 }finally{f.service.checkSentEvidence=check;f.s.repository.transaction=transaction;await f.close();}
});
