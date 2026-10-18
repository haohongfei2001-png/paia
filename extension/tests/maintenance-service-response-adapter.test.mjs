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
