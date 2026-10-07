import {fixture,rows,raw,op,topic} from './topic-02.mjs';
import {parameters,assessment,citation,derived,addInput} from './topic-03.mjs';
import {SectionPromotionService} from '../../core/topic-promotion.js';
export {rows,raw,op,topic,parameters,assessment,citation,derived,addInput};
export {inputEdit} from './thought-m1.mjs';
export const decide=view=>({formation:assessment(view,{name:'Independent synthetic planning',entries:view.entries.map(e=>({entryId:e.id,type:'judgment',span:citation(view.inputs.find(i=>e.dependencies.some(d=>d.inputId===i.id))),additional:[]}))}),independence:{reason:'independent_goal',citations:[citation(view.inputs[0])]}});
export function promotionService(f,decision=decide,options={}){return new SectionPromotionService(f.s,{...f.serviceOptions,parameters,decision:{version:'synthetic-promotion-1',assess:decision},...options});}
export async function promotionFixture({count=1,defaultSection=false,...options}={}){
 const f=await fixture(options);f.parent=await topic(f.s,'Parent synthetic object');
 f.section=defaultSection?{sectionId:f.parent.sectionId}:await f.s.createSection({topicId:f.parent.id,title:'Manual internal aspect',expectedTopicRevision:(await f.s.topic(f.parent.id)).organizationRevision,operationId:op()});
 f.entryIds=[];
 for(let i=0;i<count;i++){
  const e=await derived(f.s,[f.scope[0].inputId],{body:'Independent synthetic conclusion '+i}),p=await f.s.topic(f.parent.id);
  await f.s.placeEntry({entryId:e.id,topicId:p.id,sectionId:f.section.sectionId,expectedEntryRevision:e.revision,expectedTopicRevision:p.organizationRevision,operationId:op()});f.entryIds.push(e.id);
 }
 f.service=promotionService(f);return f;
}
export const request=(f,extra={})=>({scope:f.scope,topicId:f.parent.id,sectionId:f.section.sectionId,entryIds:f.entryIds,selection:'explicit_entries',operationId:op(),...extra});
export async function confirmed(f,r=request(f)){const h=await f.service.prepare(r),work=await f.service.confirm(h,{confirmed:true});return {h,r,...work};}
export async function promote(f,r=request(f)){
 const work=await confirmed(f,r);let staged;do{staged=await f.service.stage(work.workId);}while(staged.state!=='ready');return {...work,result:await f.service.activate(work.workId)};
}
export const canonicalTables=['records','blocks','inputStates','thoughts','topics','sections','placements','provenance','dependencies','revisions','operationReceipts'];
export const snapshot=s=>Promise.all(canonicalTables.map(name=>rows(s,name)));
