import test from 'node:test';
import assert from 'node:assert/strict';
import {SectionPromotionService} from '../core/topic-promotion.js';
import {promotionFixture,promotionService,decide,request,confirmed,promote,rows,raw,op,topic,snapshot} from './harness/topic-04.mjs';

test('TOPIC-04 proposal and cancellation are side-effect free; only explicit opaque confirmation stages work',async()=>{
 const f=await promotionFixture(),before=await snapshot(f.s),h=await f.service.prepare(request(f));assert.deepEqual(await snapshot(f.s),before);assert.equal((await rows(f.s,'organizerWorkItems')).length,0);
 assert.equal(h.wholeSection,false);assert.equal(h.selection,'explicit_entries');
 await assert.rejects(f.service.confirm({...h},{confirmed:true}));await assert.rejects(promotionService(f).confirm(h,{confirmed:true}));await assert.rejects(f.service.confirm(h,{confirmed:false}));f.service.cancel(h);await assert.rejects(f.service.confirm(h,{confirmed:true}));assert.deepEqual(await snapshot(f.s),before);
 const g=await promotionFixture(),work=await confirmed(g),unchanged=await snapshot(g.s);assert.equal((await rows(g.s,'topics')).length,1);await g.service.stage(work.workId);assert.deepEqual(await snapshot(g.s),unchanged);await g.service.rollback(work.workId);assert.equal((await rows(g.s,'organizerWorkItems')).length,0);assert.deepEqual(await snapshot(g.s),unchanged);
});

for(const defaultSection of [false,true])test('TOPIC-04 promotion preserves parent/default identity, body/provenance and selected ordering '+defaultSection,async()=>{
 const f=await promotionFixture({count:3,defaultSection}),p=await f.s.topic(f.parent.id),sections=await rows(f.s,'sections'),facts=await Promise.all(['records','blocks','inputStates','provenance','dependencies'].map(t=>rows(f.s,t))),entries=await rows(f.s,'thoughts');
 const extra=await topic(f.s,'Other independent object'),e=await f.s.entry(f.entryIds[0]);await f.s.placeEntry({entryId:e.id,topicId:extra.id,expectedEntryRevision:e.revision,expectedTopicRevision:0,operationId:op()});
 const result=(await promote(f,request(f,{entryIds:f.entryIds.slice(0,2)}))).result,current=await f.s.topic(f.parent.id),created=await f.s.topic(result.id);
 assert.notEqual(result.id,p.id);assert.equal(current.id,p.id);assert.equal(current.defaultSectionId,p.defaultSectionId);assert.equal(current.activeLayoutGeneration,p.activeLayoutGeneration);assert.equal(current.redirectTo,undefined);assert.equal(current.name,p.name);assert.equal(created.protections.name.locked,true);assert.equal(created.identity.origin,'ai');assert.notEqual(created.defaultSectionId,p.defaultSectionId);
 assert.deepEqual((await rows(f.s,'sections')).filter(s=>s.topicId===p.id),sections);assert.deepEqual(await Promise.all(['records','blocks','inputStates','provenance','dependencies'].map(t=>rows(f.s,t))),facts);assert.deepEqual((await rows(f.s,'thoughts')).map(e=>[e.id,e.thoughtText]),entries.map(e=>[e.id,e.thoughtText]));
 const placements=await rows(f.s,'placements');for(const id of f.entryIds.slice(0,2)){const old=placements.find(x=>x.entryId===id&&x.topicId===p.id),moved=placements.find(x=>x.entryId===id&&x.topicId===created.id);assert.equal(old.lifecycle,'removed');assert.equal(moved.lifecycle,'active');assert.equal(moved.rank,old.rank);assert.equal(moved.membershipAuthorship,'user');const entry=await f.s.entry(id);assert.ok(entry.organizationIntents.excluded.includes(p.id));assert.ok(entry.organizationIntents.included.includes(created.id));}
 assert.equal(placements.find(x=>x.entryId===f.entryIds[2]&&x.topicId===p.id).lifecycle,'active');assert.equal(placements.find(x=>x.entryId===f.entryIds[0]&&x.topicId===extra.id).lifecycle,'active');assert.equal((await rows(f.s,'organizerWorkItems')).length,0);
 assert.equal((await rows(f.s,'meta')).some(row=>row.id.startsWith('memory:topic:')&&row.topicId===created.id),false);assert.equal((await rows(f.s,'organizerJobs')).some(j=>j.kind==='library_layout'),false);
 for(const mapping of result.mappings){const revision=await raw(f.s,'revisions',mapping.sourceRevisionId);assert.equal(revision.before.sectionId,f.section.sectionId);assert.equal(revision.before.topicId,p.id);assert.equal(revision.after.lifecycle,'removed');assert.equal(JSON.stringify(revision).includes('thoughtText'),false);}
});

test('TOPIC-04 volume, internal aspects, incomplete identity claims and wrong Entry spans cannot justify promotion',async()=>{
 for(const mutate of [a=>a.independence.reason='volume',a=>a.formation.relations[0].relation='internal_aspect',a=>a.formation.relations=[],a=>a.formation.entries[0].span.inputId='unrelated',a=>delete a.formation.entries[0].entryId,a=>a.formation.section={kind:'named',name:'Other'}]){
  const f=await promotionFixture({count:2}),s=promotionService(f,view=>{const a=decide(view);mutate(a);return a;}),before=await snapshot(f.s);await assert.rejects(s.prepare(request(f)));assert.deepEqual(await snapshot(f.s),before);
 }
});

test('TOPIC-04 invalid selections and unacknowledged whole-Section requests refuse without truncation',async()=>{
 const f=await promotionFixture();await assert.rejects(f.service.prepare(request(f,{selection:'whole_section'})));await assert.rejects(f.service.prepare(request(f,{entryIds:Array.from({length:101},()=>op())})));assert.equal((await rows(f.s,'topics')).length,1);assert.equal((await rows(f.s,'organizerWorkItems')).length,0);
});

test('TOPIC-04 fixed membership sets and unrelated exclusions survive the explicitly confirmed move',async()=>{
 const f=await promotionFixture(),other=await topic(f.s,'Another excluded object');let e=await f.s.entry(f.entryIds[0]);await f.s.placeEntry({entryId:e.id,topicId:other.id,remove:true,expectedEntryRevision:e.revision,expectedTopicRevision:0,operationId:op()});e=await f.s.entry(e.id);await f.s.fixMembershipSet({entryId:e.id,expectedRevision:e.revision,operationId:op()});
 const {result}=await promote(f);e=await f.s.entry(e.id);assert.deepEqual(e.organizationIntents.fixed.topicIds,[result.id]);assert.ok(e.organizationIntents.excluded.includes(other.id));assert.ok(e.organizationIntents.excluded.includes(f.parent.id));assert.equal(e.organizationIntents.edges[result.id].actor,'user');
});

test('TOPIC-04 default-denied service and empty selections cannot invoke assessment',async()=>{
 const f=await promotionFixture();let calls=0;const service=new SectionPromotionService(f.s,{decision:{version:'synthetic',assess:()=>{calls++;}}});await assert.rejects(service.prepare(request(f)));await assert.rejects(f.service.prepare(request(f,{entryIds:[]})));assert.equal(calls,0);
});
