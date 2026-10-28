import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,capture} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService,CONTEXT_CARDS_ROW} from '../core/context-cards.js';
import {ContextMaintenanceService,validateContextMaintenanceDuplicateCurrent} from '../core/context-maintenance.js';
import {readContextTopicScope} from '../core/context-topic-scope.js';
import {inputProjection} from '../core/thought-evidence.js';
import {hashText} from '../core/dedupe.js';
import {createMaintenanceQualification,releaseMaintenanceQualification} from '../core/ai-usage/maintenance-qualification.js';
import {createMaintenanceServiceResponseAdapter,maintenanceServiceResponseContract,MAINTENANCE_SERVICE_RESPONSE_SCHEMA,MAINTENANCE_CURRENT_CONTEXT_RESPONSE_SCHEMA,readMaintenanceResponseDefer} from '../core/ai-usage/maintenance-service-response.js';
import {boundedSchema} from '../core/ai-usage/qwen-request-data.js';
import {emptyTopic} from '../../services/ai-gateway/tests/maintenance-source-response-fixture.mjs';

const op=()=>crypto.randomUUID(),clone=x=>structuredClone(x),read=(s,table,id)=>s.repository.transaction(false,t=>t.get(table,id)),cards=s=>read(s,'meta',CONTEXT_CARDS_ROW);
const semantic=item=>({itemRef:'c0',itemId:item.id,revision:item.revision,card:item.card,origin:item.origin,protected:item.protected,userEdited:item.userEdited,lifecycle:item.lifecycle,body:item.body,section:item.section});
async function evidence(s,inputId,topicId){const scope=await readContextTopicScope(s,{topicId});assert.equal(scope.available,true,scope.reason);const p=await s.repository.transaction(false,t=>inputProjection(s,t,inputId));return {p,evidence:[{topicId,inputId,selectedFields:['body'],fieldDigests:{body:await hashText(p.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:p.lastRemovalSequence}]};}
async function fixture({origin='automatic'}={}){
 const f=await setup(OrganizerStore),s=f.s;await s.finishFoundation();await s.setFilterMode('off');
 const oldInput=(await s.snapshot()).library.blocks[0],oldTopic=await s.createTopic({operationId:op(),name:'SYNTHETIC old Topic'});await s.addToTopics({operationId:op(),kind:'input',id:oldInput.id,expectedRevision:(await s.input(oldInput.id)).revision,topicIds:[oldTopic.id]});
 const caller=Object.freeze({id:op()}),controller=new AbortController(),state={processing:true,grant:true,scope:null};
 const verifier={async verify(actual,store,scope){state.scope=clone(scope);if(actual!==caller||store!==s||scope.currentContextComparison&&!state.grant)return null;return {version:1,store:s,accountId:'synthetic-account',processorId:'synthetic-processor',authorizationGeneration:1,scope,processing:state.processing,expiresAt:Date.now()+60000,revocationSignal:controller.signal};},isCurrent(actual,r,store){return actual===caller&&store===s&&r.authorizationGeneration===1;}};
 const service=new ContextMaintenanceService(s,{processingVerifier:verifier}),cardOwner=new ContextCardsService(s),old=await evidence(s,oldInput.id,oldTopic.id),original={operationId:op(),epoch:old.evidence[0].expectedTopicBinding.epoch,itemId:op(),card:'info',expectedRevision:0,body:'SYNTHETIC current Item',section:'Synthetic section',associationIds:[op()],evidence:old.evidence};
 await service.maintain(caller,original);let itemId=original.itemId;
 if(origin==='manual'){itemId=op();await cardOwner.change({kind:'put',operationId:op(),epoch:original.epoch,itemId,card:'info',expectedRevision:0,body:'SYNTHETIC manual current Item',section:'Synthetic human section'});}
 if(origin==='protected')await cardOwner.change({kind:'put',operationId:op(),epoch:original.epoch,itemId,card:'info',expectedRevision:1,body:'SYNTHETIC human-protected Item',section:'Synthetic human section'});
 await s.capture(capture((await s.status()).epoch,'synthetic-new-source','SYNTHETIC complete new independent evidence'));
 const newInput=(await s.snapshot()).library.blocks.find(x=>x.id!==oldInput.id),newTopic=await s.createTopic({operationId:op(),name:'SYNTHETIC new Topic'});await s.addToTopics({operationId:op(),kind:'input',id:newInput.id,expectedRevision:(await s.input(newInput.id)).revision,topicIds:[newTopic.id]});
 for(const key of ['global','info'])await cardOwner.change({kind:'access',operationId:op(),epoch:original.epoch,key,enabled:true,expectedRevision:(await cards(s)).access[key].revision});
 const current=await evidence(s,newInput.id,newTopic.id),item=(await cards(s)).items.find(x=>x.id===itemId),comparison=semantic(item),change={version:1,operation:'DUPLICATE_CURRENT',operationId:op(),epoch:original.epoch,itemId,card:item.card,expectedRevision:item.revision,comparison,evidence:current.evidence};
 return {...f,caller,controller,state,verifier,service,cardOwner,oldInput,oldTopic,newInput,newTopic,original,item,comparison,change,current};
}

for(const origin of ['automatic','manual','protected'])test('cross-source duplicate retains exact '+origin+' Item and writes only a versioned comparison receipt',async()=>{
 const f=await fixture({origin}),before=await cards(f.s),transaction=f.s.repository.transaction.bind(f.s.repository);let oldReads=0;
 f.s.repository.transaction=(write,fn,...rest)=>transaction(write,async t=>{const get=t.get.bind(t);t.get=async(table,id,...args)=>{if(table==='records'&&id===f.oldInput.originalTextReference){oldReads++;throw Error('Old Source must not be read');}return get(table,id,...args);};return fn(t);},...rest);
 try{const result=await f.service.compareDuplicate(f.caller,f.change);assert.equal(result.disposition,'duplicate_current');assert.equal(result.revision,f.item.revision);assert.equal(oldReads,0);assert.deepEqual(await cards(f.s),before);const receipt=await read(f.s,'operationReceipts','context-maintenance:'+f.change.operationId);assert.equal(receipt.schemaVersion,2);assert.equal(Object.hasOwn(receipt,'associationId'),false);assert.doesNotMatch(JSON.stringify(receipt),/SYNTHETIC|provenance|sourceRecordIds/);assert.deepEqual(await f.service.compareDuplicate(f.caller,f.change),result);assert.deepEqual((await f.service.outcome(f.caller,{operationId:f.change.operationId,digest:await hashText(JSON.stringify(f.change)),epoch:f.change.epoch,scope:f.state.scope})).result,result);}finally{f.s.repository.transaction=transaction;}
});

test('old NO_CHANGE still refuses unrelated new evidence; new UPDATE uses only independently captured new provenance',async()=>{
 const f=await fixture(),before=await cards(f.s),base={operationId:op(),epoch:f.change.epoch,itemId:f.item.id,card:f.item.card,expectedRevision:f.item.revision,associationIds:[...f.item.maintenance.associationIds],evidence:clone(f.change.evidence)};
 assert.equal((await f.service.noChange(f.caller,{operation:'NO_CHANGE',...base})).conflict,true);assert.deepEqual(await cards(f.s),before);
 const updated=await f.service.maintain(f.caller,{...base,operationId:op(),body:'SYNTHETIC whole body independently supported by new delta',section:'Synthetic new section'});assert.equal(updated.disposition,'updated');const item=(await cards(f.s)).items.find(i=>i.id===f.item.id);assert.deepEqual(item.maintenance.associationIds,f.item.maintenance.associationIds);assert.deepEqual(item.maintenance.provenance.evidence.map(e=>e.inputId),[f.newInput.id]);assert.equal(item.revision,2);
});

for(const defect of ['missing-grant','processing-off','revoked','closed-card','changed-body','changed-revision','removed'])test('current duplicate refuses '+defect+' without a receipt',async()=>{
 const f=await fixture();if(defect==='missing-grant')f.state.grant=false;if(defect==='processing-off')f.state.processing=false;if(defect==='revoked')f.controller.abort();
 if(defect==='closed-card')await f.cardOwner.change({kind:'access',operationId:op(),epoch:f.change.epoch,key:'info',enabled:false,expectedRevision:(await cards(f.s)).access.info.revision});
 if(defect==='changed-body')f.change.comparison.body='SYNTHETIC unsent substituted body';if(defect==='changed-revision'){f.change.expectedRevision++;f.change.comparison.revision++;}
 if(defect==='removed')await f.cardOwner.change({kind:'delete',operationId:op(),epoch:f.change.epoch,itemId:f.item.id,expectedRevision:f.item.revision});const before=await cards(f.s);
 let result;try{result=await f.service.compareDuplicate(f.caller,f.change);}catch(error){assert.ok(['CONTEXT_INVALIDATED','INVALID_REQUEST'].includes(error.code));}if(result)assert.equal(result.conflict,true);assert.deepEqual(await cards(f.s),before);assert.equal(await read(f.s,'operationReceipts','context-maintenance:'+f.change.operationId),undefined);
});

for(const drift of ['target','new-source','access'])test('comparison receipt-stage '+drift+' drift rolls back the original transaction',async()=>{
 const f=await fixture(),before=await cards(f.s),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false;
 f.s.repository.transaction=(write,fn,...rest)=>transaction(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(table,row,...args)=>{const result=await put(table,row,...args);if(!reached&&table==='operationReceipts'&&row.id==='context-maintenance:'+f.change.operationId){reached=true;if(drift==='new-source'){const source=await t.get('records',f.newInput.originalTextReference);source.value.originalText='SYNTHETIC changed source';await put('records',source);}else{const target=await t.get('meta',CONTEXT_CARDS_ROW);if(drift==='target')target.items.find(i=>i.id===f.item.id).body='SYNTHETIC changed target';else target.access.info.enabled=false;await put('meta',target);}}return result;};}return fn(t);},...rest);
 try{await assert.rejects(f.service.compareDuplicate(f.caller,f.change));assert.equal(reached,true);assert.deepEqual(await cards(f.s),before);assert.equal(await read(f.s,'operationReceipts','context-maintenance:'+f.change.operationId),undefined);}finally{f.s.repository.transaction=transaction;}
});

test('comparison command cannot carry old source authority, associations or a legacy no-change operation',async()=>{
 const f=await fixture();for(const change of [{...f.change,operation:'NO_CHANGE'},{...f.change,version:2},{...f.change,associationIds:f.original.associationIds},{...f.change,comparison:{...f.change.comparison,currentEvidence:f.original.evidence}},{...f.change,evidence:[]}])assert.throws(()=>validateContextMaintenanceDuplicateCurrent(change),{code:'INVALID_REQUEST'});await assert.rejects(f.service.noChange(f.caller,f.change),{code:'INVALID_REQUEST'});
});

async function responseFixture(options={}){
 const f=await fixture(options),coverage=[{key:JSON.stringify(['input',f.newInput.id]),facet:'context',scope:'synthetic-scope'}],envelope={version:1,mode:'current_item_text',items:[clone(f.comparison)]};
 const payload={logicalJobId:'synthetic-job',childOperationId:'synthetic-child',type:'AI_MAINTENANCE',contractVersion:'synthetic-contract',routeVersion:'synthetic-route',automaticRetries:0,coverage,material:{version:1,purpose:'AI_MAINTENANCE',inputs:[{ref:'i0',inputId:f.newInput.id,revision:f.current.p.contentRevision,body:f.current.p.body}],identities:[{id:f.newTopic.id,canonicalId:f.newTopic.id}],sections:[],constraints:[],currentContextComparison:envelope}},binding={logicalJobId:'synthetic-job',childOperationId:'synthetic-child',operationReceiptId:'synthetic-receipt'};
 const group={operation:'DUPLICATE_CURRENT',reason:'',unitKeys:[coverage[0].key],topicId:f.newTopic.id,itemId:f.item.id,expectedRevision:f.item.revision,card:f.item.card,body:'',section:'',temporal:{present:false,temporalScope:'',uncertainty:'',validUntil:''}},response={accepted:true,operationReceiptId:binding.operationReceiptId,value:{version:2,logicalJobId:binding.logicalJobId,childOperationId:binding.childOperationId,citations:[],topic:emptyTopic(),context:{status:'APPLY',reason:'',groups:[group]},filter:{status:'NONE',reason:'',decisions:[]}}};
 const privateItem={...clone(f.comparison),epoch:f.change.epoch,associationIds:[...(f.item.maintenance?.associationIds||[])],...(f.item.maintenance?{provenance:clone(f.item.maintenance.provenance)}:{})},metadata={units:coverage,inputIds:[f.newInput.id],currentContextComparison:{version:1,mode:'current_item_text',items:[privateItem]}},foundation={s:f.s,read:fn=>f.s.repository.transaction(false,fn)},owner=createMaintenanceServiceResponseAdapter();
 const processing={resolve:async(_t,scope)=>({version:1,store:f.s,caller:f.caller,scope,epoch:'synthetic-processing',processing:true,expiresAt:Date.now()+60000,revocationSignal:f.controller.signal}),isCurrent:(receipt,store)=>store===f.s&&receipt.caller===f.caller&&!f.controller.signal.aborted};
 const qualification=await f.s.repository.transaction(false,t=>createMaintenanceQualification(f.s,t,{items:[],coverage:[]},{processing,caller:f.caller,binding:{logicalJobId:binding.logicalJobId,childOperationId:binding.childOperationId},phase:'child',isCurrent:()=>true,selection:{inputIds:[f.newInput.id],topicIds:[f.newTopic.id]}}));
 owner.registerChild(foundation,payload,()=>true);return {...f,payload,binding,group,response,metadata,privateItem,foundation,owner,qualification,decode:(qualified=true)=>owner.adapter.context(response,metadata,binding,qualified?qualification:null),close:()=>{owner.dispose();releaseMaintenanceQualification(qualification);}};
}

test('current comparison chooses a bounded separate version 2 schema without widening version 1',async()=>{
 const f=await responseFixture();try{boundedSchema(MAINTENANCE_CURRENT_CONTEXT_RESPONSE_SCHEMA);assert.equal(maintenanceServiceResponseContract(f.payload,f.s).schema,MAINTENANCE_CURRENT_CONTEXT_RESPONSE_SCHEMA);assert.equal(MAINTENANCE_SERVICE_RESPONSE_SCHEMA.properties.version.maximum,1);assert.equal(MAINTENANCE_SERVICE_RESPONSE_SCHEMA.properties.context.properties.groups.items.properties.operation.enum.includes('DUPLICATE_CURRENT'),false);f.response.value.version=1;await assert.rejects(f.decode(),{code:'INVALID_RESPONSE'});}finally{f.close();}
});
for(const origin of ['automatic','manual'])test('real response mapper constructs '+origin+' current duplicate from only new evidence',async()=>{
 const f=await responseFixture({origin});try{const result=await f.decode(),mapped=result.value[0];assert.equal(mapped.operation,'DUPLICATE_CURRENT');assert.deepEqual(mapped.change.comparison,f.comparison);assert.deepEqual(mapped.change.evidence,f.change.evidence);assert.equal(Object.hasOwn(mapped.change,'associationIds'),false);assert.equal((await f.service.compareDuplicate(f.caller,mapped.change)).disposition,'duplicate_current');}finally{f.close();}
});
test('new-evidence UPDATE reuses stable Item associations while replacing only independently supported body',async()=>{
 const f=await responseFixture();try{Object.assign(f.group,{operation:'UPDATE_FROM_NEW_EVIDENCE',body:'SYNTHETIC independently complete new body',section:'Synthetic new section'});const mapped=(await f.decode()).value[0];assert.equal(mapped.operation,'UPDATE_FROM_NEW_EVIDENCE');assert.deepEqual(mapped.change.evidence,f.change.evidence);assert.deepEqual(mapped.change.associationIds,f.original.associationIds);assert.equal((await f.service.maintain(f.caller,mapped.change)).disposition,'updated');}finally{f.close();}
});
for(const operation of ['NO_CHANGE','REMOVE_CANDIDATE','UPDATE_FROM_NEW_EVIDENCE'])test('comparison-only manual Item cannot become '+operation,async()=>{
 const f=await responseFixture({origin:'manual'});try{f.group.operation=operation;if(operation==='UPDATE_FROM_NEW_EVIDENCE'){f.group.body='SYNTHETIC unauthorized rewrite';f.group.section='Synthetic';}else f.group.topicId='';let error;try{await f.decode();}catch(e){error=e;}const deferred=readMaintenanceResponseDefer(error);assert.ok(deferred);assert.equal(deferred.groups.length,0);assert.deepEqual(clone(deferred.units),f.payload.coverage);}finally{f.close();}
});
test('new duplicate cannot use a qualification-free caller flag',async()=>{const f=await responseFixture();try{await assert.rejects(f.decode(false),{code:'UNAVAILABLE'});}finally{f.close();}});
test('new UPDATE lacking old structural closure remains exact DEFER',async()=>{
 const f=await responseFixture();try{f.privateItem.provenance.evidence[0].humanTopic={kind:'topic',topicId:f.oldTopic.id,selectedFields:['name']};Object.assign(f.group,{operation:'UPDATE_FROM_NEW_EVIDENCE',body:'SYNTHETIC attempted structural carry',section:'Synthetic'});let error;try{await f.decode();}catch(e){error=e;}const deferred=readMaintenanceResponseDefer(error);assert.ok(deferred);assert.deepEqual(clone(deferred.units),f.payload.coverage);assert.equal(deferred.groups.length,0);}finally{f.close();}
});
