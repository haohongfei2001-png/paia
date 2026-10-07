import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicFormationService} from '../core/topic-formation.js';
import {TopicLifecycleService} from '../core/topic-lifecycle.js';
import {formationFixture,assessment,citation,parameters,request,runFormation,rows,raw,op,topic,addInput,derived} from './harness/topic-03.mjs';
const reuse=(id,section={kind:'default'},extra={})=>view=>{const value=assessment(view,{section,...extra});value.relations=value.relations.map(r=>({...r,relation:r.topicId===id?'same':'distinct'}));return value;};
const service=(f,decide)=>new TopicFormationService(f.s,{...f.serviceOptions,parameters,decision:{version:'synthetic-v1',assess:decide}});
const commit=(s,r)=>s.prepare(r).then(h=>s.commit(h));

test('TOPIC-03 user rename keeps identity and permits a new eligible edge under its protected unusual name',async()=>{
 const f=await formationFixture(),first=await runFormation(f),id=first.result.topicIds[0];await f.s.renameTopic({id,name:'一些想法',expectedRevision:0,operationId:op()});const original=await raw(f.s,'topics',id),firstEntry=await f.s.entry(first.result.entryIds[0]);await addInput(f,{text:'New substantive work on the same explicit object.'});
 const latest=f.scope.find(x=>x.inputId!==firstEntry.workingInputId).inputId,s=service(f,view=>{const value=reuse(id)(view);value.name='Old generated name';value.entries=[{span:citation(view.inputs.find(x=>x.id===latest)),type:'decision',additional:[]}];return value;});const result=await commit(s,request(f));assert.deepEqual(result.topicIds,[id]);assert.equal((await rows(f.s,'topics')).length,1);assert.equal((await rows(f.s,'placements')).length,2);assert.equal((await raw(f.s,'topics',id)).name,original.name);assert.deepEqual((await raw(f.s,'topics',id)).protections.name,original.protections.name);assert.equal((await f.s.entry(firstEntry.id)).body,firstEntry.body);
});
test('TOPIC-03 dormant and redirected identities reuse the exact survivor without access inheritance',async()=>{
 for(const variant of ['dormant','redirect']){
  const f=await formationFixture(),a=await topic(f.s,'Historical object'),b=await topic(f.s,'Survivor');let id=a.id;
  if(variant==='dormant')await new TopicLifecycleService(f.s,f.serviceOptions).change({id,to:'dormant',expectedRevision:0,operationId:op(),scope:f.scope});else{await f.s.startLayout({kind:'topic_merge',topicId:a.id,survivorId:b.id,expectedTopicRevision:0,expectedSurvivorRevision:0,operationId:op()});await f.s.drainLibraryMaintenance();id=b.id;}
  const before=(await rows(f.s,'meta')).filter(x=>/context|memory|passport/i.test(x.id)),s=service(f,reuse(id)),result=await commit(s,request(f));assert.deepEqual(result.topicIds,[id]);assert.equal((await raw(f.s,'topics',id)).lifecycle,'active');assert.equal((await rows(f.s,'topics')).length,2);assert.deepEqual((await rows(f.s,'meta')).filter(x=>/context|memory|passport/i.test(x.id)),before);
 }
});
test('TOPIC-03 removed identity under a new label and removed prior-name tokens both prevent recreation',async()=>{
 for(const variant of ['same_object_new_label','former_name','normalized_name']){
  const f=await formationFixture(),a=await topic(f.s,'Old Name');await f.s.renameTopic({id:a.id,name:'New Name',expectedRevision:0,operationId:op()});await f.s.removeTopic({id:a.id,expectedRevision:1,operationId:op()});
  const s=service(f,view=>{const value=assessment(view,{name:variant==='same_object_new_label'?'Another label':variant==='former_name'?'Old Name':'ＮＥＷ ＮＡＭＥ'});if(variant==='same_object_new_label')value.relations[0].relation='same';return value;}),result=await commit(s,request(f));assert.equal(result.outcome,'unassigned');assert.equal((await rows(f.s,'topics')).length,1);assert.equal((await raw(f.s,'topics',a.id)).lifecycle,'removed');assert.equal((await rows(f.s,'placements')).length,0);
 }
});
test('TOPIC-03 keep-separate cannot be collapsed by a same-identity judgment through two peers',async()=>{
 const f=await formationFixture(),a=await topic(f.s,'Independent A'),b=await topic(f.s,'Independent B');await f.s.keepTopicsSeparate({sourceId:a.id,targetId:b.id});const before=await rows(f.s,'topics'),s=service(f,view=>{const value=assessment(view);value.relations.forEach(x=>x.relation='same');return value;}),result=await commit(s,request(f));assert.equal(result.outcome,'unassigned');assert.deepEqual(await rows(f.s,'topics'),before);assert.equal((await rows(f.s,'placements')).length,0);
});
test('TOPIC-03 default Section is complete; named Sections need recurrence and preserve manual order',async()=>{
 const f=await formationFixture(),a=await topic(f.s,'Synthetic project'),manual=await f.s.createSection({topicId:a.id,title:'当前进展',expectedTopicRevision:0,operationId:op()}),before=await raw(f.s,'sections',manual.id);
 const named=view=>reuse(a.id,{kind:'named',name:'Pricing decisions',aspect:{reason:'recurring_internal_aspect',citations:view.inputs.map(x=>citation(x))},returnValue:{reason:'reading',citations:[citation(view.inputs[0])]},relations:[{sectionId:manual.sectionId,relation:'distinct',citations:[citation(view.inputs[0])]}]})(view);
 let s=service(f,named),first=await commit(s,request(f));assert.equal((await rows(f.s,'sections')).length,2);assert.equal((await rows(f.s,'placements'))[0].sectionId,(await raw(f.s,'topics',a.id)).defaultSectionId);
 await addInput(f,{text:'Independent packaging and payment-boundary work.'});const oldInput=(await f.s.entry(first.entryIds[0])).workingInputId;s=service(f,view=>{const value=named(view);value.entries[0].span=citation(view.inputs.find(x=>x.id!==oldInput));return value;});await commit(s,request(f));const sections=await rows(f.s,'sections'),created=sections.find(x=>x.title==='Pricing decisions');assert.ok(created);assert.equal(sections.length,3);assert.deepEqual(await raw(f.s,'sections',manual.id),before);
 s=service(f,reuse(a.id,{kind:'existing',sectionId:manual.sectionId}));await commit(s,request(f));assert.deepEqual(await raw(f.s,'sections',manual.id),before);assert.equal((await rows(f.s,'placements')).find(p=>p.entryId===first.entryIds[0]).sectionId,(await raw(f.s,'topics',a.id)).defaultSectionId);
});
test('TOPIC-03 transient Section proposals never become durable headings or discard exact content',async()=>{
 for(const name of ['软件版本发布','当前进展','next steps','一些想法']){
  const f=await formationFixture(),a=await topic(f.s,'Synthetic project');await addInput(f);const s=service(f,view=>reuse(a.id,{kind:'named',name,aspect:{reason:'recurring_internal_aspect',citations:view.inputs.map(x=>citation(x))},returnValue:{reason:'reading',citations:[citation(view.inputs[0])]},relations:[]})(view));await commit(s,request(f));assert.equal((await rows(f.s,'sections')).length,1);assert.equal((await rows(f.s,'thoughts')).length,1);
 }
});
test('TOPIC-03 one idea has two independently useful metadata-only placements; lexical extras are dropped',async()=>{
 const f=await formationFixture(),a=await topic(f.s,'Object A'),b=await topic(f.s,'Object B'),c=await topic(f.s,'Similar vocabulary');await f.s.keepTopicsSeparate({sourceId:a.id,targetId:b.id});const s=service(f,view=>{const value=reuse(a.id)(view);value.entries[0].additional=[{topicId:b.id,returnValue:{reason:'reuse',citations:[citation(view.inputs[0])]}},{topicId:c.id,returnValue:{reason:'lexical',citations:[citation(view.inputs[0])]}}];return value;}),result=await commit(s,request(f));assert.equal(result.entryIds.length,1);assert.equal((await rows(f.s,'thoughts')).length,1);const placements=await rows(f.s,'placements');assert.equal(placements.length,2);assert.equal(new Set(placements.map(p=>p.entryId)).size,1);assert.deepEqual(new Set(placements.map(p=>p.topicId)),new Set([a.id,b.id]));assert.equal((await rows(f.s,'provenance')).length,1);
});
test('TOPIC-03 include/exclude, fixed sets and existing human placements retain specific authority',async()=>{
 for(const mode of ['excluded','fixed','human_anchor']){
  const f=await formationFixture(),a=await topic(f.s,'Object A'),b=await topic(f.s,'Object B'),entry=await derived(f.s,[f.scope[0].inputId]);await f.s.placeEntry({entryId:entry.id,topicId:a.id,expectedEntryRevision:0,expectedTopicRevision:0,operationId:op()});
  if(mode==='excluded')await f.s.moveMembership({entryId:entry.id,sourceTopicId:a.id,targetTopicId:b.id,expectedEntryRevision:1,expectedSourceRevision:1,expectedTargetRevision:0,operationId:op()});else if(mode==='fixed')await f.s.fixMembershipSet({entryId:entry.id,expectedRevision:1,operationId:op()});
  const before=await Promise.all(['thoughts','placements','topics','sections'].map(name=>rows(f.s,name))),target=mode==='fixed'?b.id:a.id,s=service(f,view=>{const value=reuse(target)(view);value.entries[0].entryId=entry.id;return value;});
  if(mode==='human_anchor'){await commit(s,request(f,{entryIds:[entry.id]}));assert.deepEqual(await Promise.all(['thoughts','placements','topics','sections'].map(name=>rows(f.s,name))),before);}else{await assert.rejects(commit(s,request(f,{entryIds:[entry.id]})));assert.deepEqual(await Promise.all(['thoughts','placements','topics','sections'].map(name=>rows(f.s,name))),before);}
 }
});
