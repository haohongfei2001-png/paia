import assert from 'node:assert/strict';
import {localMaintenanceFixture} from './maintenance-local-fixture.mjs';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {emptyTopic} from './maintenance-source-response-fixture.mjs';
import {MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_SCHEMA,MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS} from '../../../extension/core/ai-usage/maintenance-service-response.js';
import {hashText} from '../../../extension/core/dedupe.js';
import {canonical} from '../../../extension/core/ai-usage/contracts.js';
import {decide} from '../../../extension/tests/harness/topic-04.mjs';

const options={scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'};
const read=(s,table)=>s.repository.transaction(false,t=>t.all(table));
export async function maintenanceCurrentContextPromotionSourceFixture(t,{transform=null,configure=null,configureManifest=null}={}){
 const local=await localMaintenanceFixture({inputs:2});assert.equal((await local.session.run(await local.session.prepare(options))).state,'COMMITTED');local.session.dispose();
 const topic=(await read(local.s,'topics'))[0],entries=await read(local.s,'thoughts'),section=await local.s.createSection({topicId:topic.id,title:'Synthetic whole Section proposal',expectedTopicRevision:(await local.s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});
 for(const e of entries){const placement=(await read(local.s,'placements')).find(p=>p.entryId===e.id);await local.s.placeEntry({entryId:e.id,topicId:topic.id,sectionId:section.sectionId,expectedEntryRevision:(await local.s.repository.transaction(false,t=>t.get('thoughts',e.id))).revision,expectedTopicRevision:(await local.s.topic(topic.id)).organizationRevision,expectedPlacementRevision:placement.revision,operationId:crypto.randomUUID()});}
 local.calls.length=0;let captured;
 const f=await maintenanceServiceFixture(t,{reuseLocal:local,exposeRemote:true,configureManifest:async context=>{const m=context.server.manifest;m.wire.instructions=MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS;m.wire.responseFormat.json_schema.schema=structuredClone(MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_SCHEMA);m.profile.responseSchemaDigest=m.known.responseSchemaDigest=await hashText(canonical(MAINTENANCE_CURRENT_CONTEXT_SECTION_PROMOTION_RESPONSE_SCHEMA));await configureManifest?.(context);},configure,transformResponse:async context=>{
  const {value,payload}=context,original=structuredClone(value);value.version=2;captured=structuredClone(payload);assert.ok(payload.material.sectionPromotion,'original paid child contains the genuinely captured whole Section');
  value.citations=[];value.topic={...emptyTopic(),status:payload.coverage.some(u=>u.facet==='topic')?'DEFER':'NONE',reason:payload.coverage.some(u=>u.facet==='topic')?'Synthetic independent proposal only':''};value.context={status:payload.coverage.some(u=>u.facet==='context')?'DEFER':'NONE',reason:payload.coverage.some(u=>u.facet==='context')?'Synthetic independent proposal only':'',groups:[]};value.filter={status:payload.coverage.some(u=>u.facet==='filter')?'DEFER':'NONE',reason:payload.coverage.some(u=>u.facet==='filter')?'Synthetic independent proposal only':'',decisions:[]};
  const p=payload.material.sectionPromotion,page=p.pages[0],view={...p.view,inputs:page.inputs,entries:page.entries},a=decide(view),formation=a.formation,citations=[],ref=c=>{let i=citations.findIndex(v=>canonical(v)===canonical(c));if(i<0){i=citations.length;citations.push(c);}return i;},claim=v=>({...v,citations:v.citations.map(ref)});
  value.sectionProposal={version:1,logicalJobId:payload.logicalJobId,childOperationId:payload.childOperationId,proposalOperationId:p.proposalOperationId,sectionRef:p.sectionRef,status:'PROPOSE',reason:'',citations,kind:formation.kind,name:formation.name,substance:claim(formation.substance),boundary:claim(formation.boundary),returnValue:claim(formation.returnValue),continuity:claim(formation.continuity),evidence:formation.evidence.map(ref),relations:formation.relations.map(r=>({...r,citations:r.citations.map(ref)})),entries:formation.entries.map(e=>({entryId:e.entryId,expectedRevision:page.entries.find(x=>x.id===e.entryId).revision,span:ref(e.span),type:e.type})),independence:claim(a.independence),selection:{kind:'whole_section',count:view.manifest.count,manifestDigest:view.manifest.digest,necessary:'all_selected_placements'}};
  await transform?.({...context,original});
 }});t.after(()=>f.session.dispose());return {...f,topic,section,entries,captured:()=>captured};
}
