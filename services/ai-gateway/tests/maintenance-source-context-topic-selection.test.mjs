import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceMaintenanceFixture} from './maintenance-source-response-fixture.mjs';
import {MAINTENANCE_SERVICE_TOPIC_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_TOPIC_INSTRUCTIONS} from '../../../extension/core/ai-usage/maintenance-service-response-schema.js';
import {readContextCards} from '../../../extension/core/context-cards.js';
const op=()=>crypto.randomUUID(),read=(s,fn)=>s.repository.transaction(false,fn),rows=(s,n)=>read(s,t=>t.all(n)),cards=s=>read(s,t=>readContextCards(t));
const section={kind:'default',sectionId:'',name:'',aspectReason:'unknown',aspectCitations:[],returnReason:'none',returnCitations:[]};
async function fixture(t,{configure=null,patch=null,...options}={}){
 let primary,additional;const f=await sourceMaintenanceFixture(t,{...options,responseSchema:MAINTENANCE_SERVICE_TOPIC_RESPONSE_SCHEMA,responseInstructions:MAINTENANCE_SERVICE_TOPIC_INSTRUCTIONS,configure:async args=>{const {local}=args;primary=await local.s.createTopic({name:'SYNTHETIC true main Topic',operationId:op()});additional=await local.s.createTopic({name:'SYNTHETIC secondary Topic',operationId:op()});await configure?.({...args,primary,additional});},responsePatch:async(value,args)=>{value.topic={...value.topic,section:structuredClone(section),sectionRelations:[],entries:value.topic.entries.map(({additional,...e})=>({...e,entryId:''})),additionalPlacements:[{entryIndex:0,topicId:additional.id,reason:'reuse',citations:[value.topic.evidence[0]]}]};for(const r of value.topic.relations)r.relation=r.topicId===primary.id?'same':'distinct';await patch?.(value,{...args,primary,additional});}});return {...f,primary,additional};
}
test('configured source additional membership selects genuine original main Topic for new Context',async t=>{
 const f=await fixture(t),result=await f.run();assert.equal(result.processedState??result.state,'COMMITTED',JSON.stringify(result));assert.equal(f.physical(),1);assert.equal(f.decoded.length,0);assert.equal((await rows(f.s,'thoughts')).length,1);assert.equal((await rows(f.s,'placements')).length,2);const items=(await cards(f.s)).items;assert.equal(items.length,1);assert.equal(items[0].maintenance.provenance.evidence.length,1);assert.equal(items[0].maintenance.provenance.evidence[0].topicId,f.primary.id);assert.equal(f.server.saved().rows[0].resultCommitted,true);await f.run();assert.equal(f.physical(),1);
});
