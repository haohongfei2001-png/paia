import test from 'node:test';
import assert from 'node:assert/strict';
import {createMaintenanceServiceResponseAdapter,MAINTENANCE_SERVICE_RESPONSE_SCHEMA,readMaintenanceResponseDefer} from '../core/ai-usage/maintenance-service-response.js';
import {createMaintenanceServiceClient} from '../core/ai-usage/maintenance-service-client.js';
import {boundedSchema,snapshot} from '../core/ai-usage/qwen-request-data.js';
import {assessment} from './harness/topic-03.mjs';
import {maintenanceSourceResponse,emptyTopic} from '../../services/ai-gateway/tests/maintenance-source-response-fixture.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const unit=facet=>({key:JSON.stringify(['input','synthetic-input']),facet,scope:'synthetic-scope'});
function fixture({facets=['topic'],id='synthetic-child',signal=null}={}){
 const body='Synthetic complete evidence for one continuing object',material={version:1,purpose:'AI_MAINTENANCE',inputs:[{ref:'i0',inputId:'synthetic-input',revision:0,body}],identities:[],sections:[],constraints:[]};
 const payload={logicalJobId:'synthetic-job',childOperationId:id,type:'AI_MAINTENANCE',contractVersion:'synthetic-contract',routeVersion:'synthetic-route',automaticRetries:0,coverage:facets.map(unit),material};
 const view={inputs:[{id:'synthetic-input',role:'primary',fields:{body},revision:0}],entries:[],identities:[],sections:[],constraints:[]};
 const original={fixture:{topicAssessment:assessment(view),contextProposal:{body:'Synthetic derived context'},filterDecisions:[{inputId:'synthetic-input',decision:'KEEP'}]}},value=maintenanceSourceResponse(payload,original);
 const binding={logicalJobId:payload.logicalJobId,childOperationId:id,operationReceiptId:'synthetic-receipt'},response={accepted:true,operationReceiptId:binding.operationReceiptId,value};
 const owner=createMaintenanceServiceResponseAdapter(),foundation={s:{},read:()=>{throw Error('Unexpected storage read');}},state={current:true};owner.registerChild(foundation,payload,()=>state.current,signal);
 return {owner,foundation,payload,view,binding,response,state,decode:()=>owner.adapter.topic(response,view,binding)};
}

test('source schema is accepted by the original bounded Qwen validator inside its original current-binding snapshot depth',()=>{
 boundedSchema(MAINTENANCE_SERVICE_RESPONSE_SCHEMA);
 assert.doesNotThrow(()=>snapshot({profile:{wire:{responseFormat:{json_schema:{schema:MAINTENANCE_SERVICE_RESPONSE_SCHEMA}}}}}));
 const schema=JSON.stringify(MAINTENANCE_SERVICE_RESPONSE_SCHEMA);assert.doesNotMatch(schema,/anyOf|oneOf|additionalProperties":true/);
});

test('closed source Topic maps every original claim and immediately erases its last-facet child registration',async()=>{
 const f=fixture(),result=await f.decode();assert.deepEqual(clone(result.value),assessment(f.view));assert.deepEqual(clone(result.binding),f.binding);
 await assert.rejects(f.decode(),{code:'UNAVAILABLE'});
 // Successful re-registration proves the old private Map entry was deleted,
 // rather than retained behind an isCurrent=false check.
 assert.doesNotThrow(()=>f.owner.registerChild(f.foundation,f.payload,()=>true));
});

for(const [name,mutate]of [
 ['unknown envelope field',r=>{r.extra=true;}],['unknown Topic field',r=>{r.value.topic.extra=true;}],
 ['unknown Input citation',r=>{r.value.citations[0].inputId='outside-input';}],['unknown citation index',r=>{r.value.topic.evidence=[99];}],
 ['duplicate/unknown relations',r=>{r.value.topic.relations=[{topicId:'outside-topic',relation:'same',citations:[0]}];}],
 ['unknown Entry',r=>{r.value.topic.entries[0].entryId='outside-entry';}],['unknown Section',r=>{r.value.topic.section.kind='existing';r.value.topic.section.sectionId='outside-section';}],
 ['invalid empty Section sentinel',r=>{r.value.topic.section.name='unused hidden instruction';}],['invalid boundary digest sentinel',r=>{r.value.topic.boundaryKey='not-a-hash';}],
 ['extra unused citation with unknown Input',r=>{r.value.citations.push({inputId:'outside-input',field:'body',start:0,end:1});}],
 ['bound exceeded',r=>{r.value.topic.name='x'.repeat(301);}],['sparse array',r=>{delete r.value.citations[0];}],
 ['accessor',r=>{Object.defineProperty(r.value.topic,'name',{enumerable:true,get(){throw Error('Getter must not execute');}});}],
 ['symbol',r=>{r.value[Symbol('hidden')]=true;}],['alias',r=>{r.value.topic.boundary.citations=r.value.topic.substance.citations;}],
 ['cyclic data',r=>{r.value.loop=r.value;}],['wrong job',r=>{r.value.logicalJobId='other-job';}],['wrong child',r=>{r.value.childOperationId='other-child';}],
 ['missing active facet',r=>{r.value.topic={...emptyTopic()};r.value.citations=[];}],['unpaired sentinel content',r=>{r.value.context.reason='content for absent facet';}],
 ['invalid additional Entry index',r=>{r.value.topic.additional=[{entryIndex:99,topicId:'unseen',returnReason:'reuse',returnCitations:[0]}];}]
]) test('source adapter rejects '+name+' and erases the failed private binding',async()=>{
 const f=fixture();mutate(f.response);await assert.rejects(f.decode());assert.doesNotThrow(()=>f.owner.registerChild(f.foundation,f.payload,()=>true));
});

test('accessor snapshots refuse without executing even a harmless getter',async()=>{
 const f=fixture();let calls=0;Object.defineProperty(f.response.value.topic,'name',{enumerable:true,get(){calls++;return 'unsafe';}});await assert.rejects(f.decode());assert.equal(calls,0);
});

test('private correlation rejects a forged facet receipt and clears the retained sibling binding',async()=>{
 const f=fixture({facets:['topic','filter']});await f.decode();const binding={...f.binding,operationReceiptId:'different-receipt'},response={...f.response,operationReceiptId:'different-receipt'};
 await assert.rejects(f.owner.adapter.filter(response,{units:[unit('filter')],inputIds:['synthetic-input']},binding),{code:'STALE_BASE'});
 assert.doesNotThrow(()=>f.owner.registerChild(f.foundation,f.payload,()=>true));
});

for(const mode of ['revoke','signal','release-child','release-job','dispose'])test(mode+' removes private child state without a body cache',async()=>{
 const signal=new AbortController(),f=fixture({signal:signal.signal});
 if(mode==='revoke')f.state.current=false;else if(mode==='signal')signal.abort();else if(mode==='release-child')f.owner.releaseChild(f.payload.childOperationId);else if(mode==='release-job')f.owner.releaseJob(f.payload.logicalJobId);else f.owner.dispose();
 await assert.rejects(f.decode(),{code:'UNAVAILABLE'});
 if(mode!=='dispose')assert.doesNotThrow(()=>f.owner.registerChild(f.foundation,f.payload,()=>true));
});

test('source DEFER is privately authenticated, bounded, exact, non-clonable and releases final facet state',async()=>{
 const f=fixture();f.response.value.topic={...emptyTopic(),status:'DEFER',reason:'Insufficient qualified evidence'};f.response.value.citations=[];
 let error;try{await f.decode();}catch(e){error=e;}const data=readMaintenanceResponseDefer(error);assert.ok(data);assert.deepEqual(clone(data),{binding:f.binding,facet:'topic',units:[unit('topic')],retryCondition:'TOPIC_MAPPING_UNAVAILABLE',groups:[]});assert.ok(Object.isFrozen(data)&&Object.isFrozen(data.units));assert.equal(readMaintenanceResponseDefer(structuredClone(error)),null);assert.equal(readMaintenanceResponseDefer({...data}),null);assert.doesNotThrow(()=>f.owner.registerChild(f.foundation,f.payload,()=>true));
});

test('filter result covers exact sent inputs and cannot return another unit',async()=>{
 for(const changed of [false,true]){const f=fixture({facets:['filter']});if(changed)f.response.value.filter.decisions[0].inputId='outside';const request=f.owner.adapter.filter(f.response,{units:[unit('filter')],inputIds:['synthetic-input']},f.binding);if(changed)await assert.rejects(request);else assert.deepEqual(clone((await request).value),[{inputId:'synthetic-input',decision:'KEEP'}]);}
});

test('remote client rejects externally supplied response callbacks',()=>{
 const config={origin:'https://service.invalid',scope:'scope',contractVersion:'v1',routeVersion:'route',service:{version:1,topic:{},context:{},responseAdapter:{topic(){},context(){}}},processing:{},clock:()=>100,resolveAuthority:()=>{},isCurrent:()=>true,onInvalidate:()=>{},readProfile:()=>{},currentProfile:()=>{},tokenize:()=>{},isCurrentTokenizer:()=>true,readProofs:()=>{}};
 assert.equal(createMaintenanceServiceClient(config),null);
});

test('remote client refuses a fixture/open schema before tokenizing, declaring or reserving',async()=>{
 const f=fixture(),calls=[],manifest={profile:{jobType:'AI_MAINTENANCE',contractVersion:'v1',routeVersion:'route',thinking:{enabled:false}},wire:{responseFormat:{json_schema:{schema:{type:'object',properties:{data:{type:'string',minLength:1,maxLength:60000}},required:['data'],additionalProperties:false}}}}};
 const config={origin:'https://service.invalid',scope:'scope',contractVersion:'v1',routeVersion:'route',service:{version:1,topic:{},context:{}},processing:{},clock:()=>100,resolveAuthority:()=>{},isCurrent:()=>true,onInvalidate:()=>{},readProfile:()=>manifest,currentProfile:()=>manifest,tokenize:()=>{calls.push('tokenize');},isCurrentTokenizer:()=>true,readProofs:()=>{calls.push('proofs');},fetch:()=>{calls.push('fetch');}};
 const client=createMaintenanceServiceClient(config),metadata={...f.payload};delete metadata.material;
 const foundation={read:fn=>fn({}),job:async()=>({childIds:[f.payload.childOperationId]}),current:async()=>{},childRequest:()=>metadata};
 await assert.rejects(client.prepareChild(foundation,{id:f.payload.logicalJobId},f.payload,{assertCurrent:async()=>{},assertBeforeSend:async()=>{},isCurrent:()=>true,signal:new AbortController().signal}),{code:'UNAVAILABLE'});assert.deepEqual(calls,[]);client.dispose();
});

test('throwing currentness owner releases the private child binding',async()=>{const f=fixture();f.owner.releaseChild(f.payload.childOperationId);let throwing=false;f.owner.registerChild(f.foundation,f.payload,()=>{if(throwing)throw Error('SYNTHETIC currentness failure');return true;});throwing=true;await assert.rejects(f.decode(),{code:'UNAVAILABLE'});assert.doesNotThrow(()=>f.owner.registerChild(f.foundation,f.payload,()=>true));});

for(const key of ['identities','sections','constraints','entries'])test('fresh '+key+' cannot replace the exact sent semantic snapshot',async()=>{const f=fixture();f.view[key].push({id:'SYNTHETIC-changed',revision:1,name:'SYNTHETIC changed interpretation'});await assert.rejects(f.decode(),{code:'STALE_BASE'});assert.doesNotThrow(()=>f.owner.registerChild(f.foundation,f.payload,()=>true));});

async function existingFixture({inputs=1,id='synthetic-existing-child'}={}){
 const {localMaintenanceFixture}=await import('../../services/ai-gateway/tests/maintenance-local-fixture.mjs'),{CONTEXT_CARDS_ROW}=await import('../core/context-cards.js');
 const local=await localMaintenanceFixture({inputs});try{assert.equal((await local.session.run(await local.session.prepare({scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'}))).state,'COMMITTED');}finally{local.session.dispose();}
 const row=await local.s.repository.transaction(false,t=>t.get('meta',CONTEXT_CARDS_ROW)),item=row.items[0],sentInputs=local.calls[0].material.inputs;
 const semantic={itemRef:'c0',itemId:item.id,revision:item.revision,card:item.card,origin:item.origin,protected:item.protected,userEdited:item.userEdited,lifecycle:item.lifecycle,body:item.body,section:item.section};
 const evidence=item.maintenance.provenance.evidence.map(({contentRevision,sourceRecordIds,sourceIdentityTokens,...e})=>e),metadataItem={...clone(semantic),epoch:item.maintenance.provenance.epoch,associationIds:[...item.maintenance.associationIds],provenance:clone(item.maintenance.provenance),currentEvidence:clone(evidence),currentProvenance:clone(item.maintenance.provenance)};
 const coverage=sentInputs.map(i=>({key:JSON.stringify(['input',i.inputId]),facet:'context',scope:'synthetic-existing-scope'})),payload={logicalJobId:'synthetic-existing-job',childOperationId:id,type:'AI_MAINTENANCE',contractVersion:'synthetic-contract',routeVersion:'synthetic-route',automaticRetries:0,coverage,material:{version:1,purpose:'AI_MAINTENANCE',inputs:clone(sentInputs),identities:[],sections:[],constraints:[],existingContextItems:[clone(semantic)],existingContextSummary:{version:1,coverage:'selected_processing_scope',selectedItems:1,omittedItems:0,complete:true}}};
 const binding={logicalJobId:payload.logicalJobId,childOperationId:id,operationReceiptId:'synthetic-existing-receipt-'+id},group={operation:'UPDATE',reason:'',unitKeys:coverage.map(u=>u.key),topicId:'',itemId:item.id,expectedRevision:item.revision,card:item.card,body:'SYNTHETIC refreshed baseline',section:'Synthetic refresh',temporal:{present:false,temporalScope:'',uncertainty:'',validUntil:''}},response={accepted:true,operationReceiptId:binding.operationReceiptId,value:{version:1,logicalJobId:payload.logicalJobId,childOperationId:id,citations:[],topic:emptyTopic(),context:{status:'APPLY',reason:'',groups:[group]},filter:{status:'NONE',reason:'',decisions:[]}}};
 const foundation={s:local.s,read:fn=>local.s.repository.transaction(false,fn)},metadata={units:coverage,inputIds:sentInputs.map(i=>i.inputId),existingContextItems:[metadataItem]},owner=createMaintenanceServiceResponseAdapter();owner.registerChild(foundation,payload,()=>true);
 return {owner,foundation,payload,binding,response,group,metadata,item,metadataItem,decode:()=>owner.adapter.context(response,metadata,binding)};
}
const asOutcome=(f,operation)=>Object.assign(f.group,{operation,body:'',section:''});
const catchDefer=async work=>{let error;try{await work();}catch(e){error=e;}const deferred=readMaintenanceResponseDefer(error);assert.ok(deferred,'must be authentic exact coverage DEFER');return deferred;};

test('existing source UPDATE uses exact sent stable target and original associations without generating a replacement Item',async()=>{
 const f=await existingFixture(),result=await f.decode(),change=result.value[0].change;assert.equal(change.itemId,f.item.id);assert.equal(change.expectedRevision,f.item.revision);assert.equal(change.epoch,f.item.maintenance.provenance.epoch);assert.deepEqual(clone(change.associationIds),f.item.maintenance.associationIds);assert.deepEqual(clone(change.evidence),f.metadataItem.currentEvidence);assert.equal(Object.hasOwn(change,'temporal'),false);assert.doesNotThrow(()=>f.owner.registerChild(f.foundation,f.payload,()=>true));
});
for(const [name,change]of [
 ['revision',f=>f.group.expectedRevision++],['card',f=>f.group.card='rules'],['sent semantic body',f=>f.metadataItem.body='SYNTHETIC changed unsent body'],['display reference',f=>f.metadataItem.itemRef='c9'],['private epoch',f=>f.metadataItem.epoch=crypto.randomUUID()],['manual origin',f=>{f.payload.material.existingContextItems[0].origin='manual';f.metadataItem.origin='manual';}],['protected state',f=>{f.payload.material.existingContextItems[0].protected=true;f.metadataItem.protected=true;}],['human edited state',f=>{f.payload.material.existingContextItems[0].userEdited=true;f.metadataItem.userEdited=true;}],['removed lifecycle',f=>{f.payload.material.existingContextItems[0].lifecycle='removed';f.metadataItem.lifecycle='removed';}]
])test('existing source rejects wrong '+name+' and releases private body registration',async()=>{
 const f=await existingFixture();change(f);
 // Re-register mutated semantic fixtures so the production public/private
 // comparison and lifecycle guard each exercise their intended exact boundary.
 if(['manual origin','protected state','human edited state','removed lifecycle'].includes(name)){f.owner.releaseChild(f.payload.childOperationId);f.owner.registerChild(f.foundation,f.payload,()=>true);}
 await assert.rejects(f.decode(),{code:'STALE_BASE'});assert.doesNotThrow(()=>f.owner.registerChild(f.foundation,f.payload,()=>true));
});

test('NO_CHANGE may check a real prior Input subset while the unrelated remainder stays deferred',async()=>{
 const f=await existingFixture({inputs:2});asOutcome(f,'NO_CHANGE');f.group.unitKeys=[f.payload.coverage[0].key];f.response.value.context.groups.push({operation:'DEFER',reason:'Unprocessed subset',unitKeys:[f.payload.coverage[1].key],topicId:'',itemId:'',expectedRevision:0,card:'info',body:'',section:'',temporal:{present:false,temporalScope:'',uncertainty:'',validUntil:''}});
 const deferred=await catchDefer(f.decode);assert.equal(deferred.groups.length,1);assert.equal(deferred.groups[0].operation,'NO_CHANGE');assert.equal(deferred.groups[0].change.evidence.length,1);assert.equal(deferred.groups[0].change.evidence[0].inputId,JSON.parse(f.group.unitKeys[0])[1]);assert.deepEqual(clone(deferred.units),[f.payload.coverage[1]]);assert.doesNotThrow(()=>f.owner.registerChild(f.foundation,f.payload,()=>true));
});

test('REMOVE_CANDIDATE refuses a partial old lineage even when revision and associations are exact',async()=>{
 const f=await existingFixture({inputs:2});asOutcome(f,'REMOVE_CANDIDATE');f.group.unitKeys=[f.payload.coverage[0].key];f.response.value.context.groups.push({operation:'DEFER',reason:'Unprocessed subset',unitKeys:[f.payload.coverage[1].key],topicId:'',itemId:'',expectedRevision:0,card:'info',body:'',section:'',temporal:{present:false,temporalScope:'',uncertainty:'',validUntil:''}});
 const deferred=await catchDefer(f.decode);assert.equal(deferred.groups.length,0);assert.equal(deferred.units.length,2);
});
for(const operation of ['NO_CHANGE','REMOVE_CANDIDATE'])test(operation+' cannot substitute another Source family for the prior registered lineage',async()=>{
 const f=await existingFixture();asOutcome(f,operation);f.metadataItem.provenance.evidence[0].sourceRecordIds=[crypto.randomUUID()];const deferred=await catchDefer(f.decode);assert.equal(deferred.groups.length,0);assert.deepEqual(clone(deferred.units),f.payload.coverage);
});

test('same display ref c0 in another physical child cannot target the first child Item or borrow its baseline',async()=>{
 const a=await existingFixture({id:'synthetic-child-a'}),b=await existingFixture({id:'synthetic-child-b'});assert.equal(a.payload.material.existingContextItems[0].itemRef,b.payload.material.existingContextItems[0].itemRef);assert.notEqual(a.item.id,b.item.id);
 a.owner.registerChild(b.foundation,b.payload,()=>true);b.group.itemId=a.item.id;asOutcome(b,'NO_CHANGE');const deferred=await catchDefer(()=>a.owner.adapter.context(b.response,b.metadata,b.binding));assert.equal(deferred.groups.length,0);assert.deepEqual(clone(deferred.units),b.payload.coverage);assert.equal((await a.decode()).value[0].change.itemId,a.item.id);assert.doesNotThrow(()=>a.owner.registerChild(b.foundation,b.payload,()=>true));
});
