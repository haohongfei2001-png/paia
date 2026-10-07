import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicFormationService} from '../core/topic-formation.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {formationFixture,assessment,citation,parameters,request,runFormation,rows,raw,op,topic,addInput,snapshot} from './harness/topic-03.mjs';

test('TOPIC-03 first sufficient explicit object admits once with stable default Section, exact body and no grants',async()=>{
 const f=await formationFixture(),source=await Promise.all(['records','blocks','inputStates'].map(name=>rows(f.s,name))),grants=(await rows(f.s,'meta')).filter(x=>/context|memory|passport/i.test(x.id));
 const {r,prepared,result}=await runFormation(f);assert.equal(result.outcome,'create');assert.equal(result.topicIds.length,1);assert.equal(result.entryIds.length,1);assert.ok(Object.values(result.checks).every(Boolean));
 const [entry]=await rows(f.s,'thoughts'),[created]=await rows(f.s,'topics'),sections=await rows(f.s,'sections'),[placement]=await rows(f.s,'placements');assert.equal(created.createdBy,'ai');assert.equal(created.identity.origin,'ai');assert.equal(entry.bodyBinding,'input');assert.equal((await f.s.entry(entry.id)).body,'Synthetic explicit working input');assert.equal(sections.length,1);assert.equal(sections[0].isDefault,true);assert.equal(placement.sectionId,created.defaultSectionId);assert.equal((await rows(f.s,'provenance')).length,1);assert.equal((await rows(f.s,'organizerJobs')).length,0);assert.equal((await rows(f.s,'organizerUsage')).length,0);
 assert.deepEqual(await Promise.all(['records','blocks','inputStates'].map(name=>rows(f.s,name))),source);assert.deepEqual((await rows(f.s,'meta')).filter(x=>/context|memory|passport/i.test(x.id)),grants);assert.deepEqual(await f.service.commit(prepared),result);
 await f.s.repository.close();const s=new OrganizerStore(f.storage,{indexedDB:f.indexedDB}),restart=new TopicFormationService(s,{...f.serviceOptions,parameters,decision:{version:f.decision.version,assess:()=>{throw Error('must not reassess a receipt');}}});assert.deepEqual(await restart.commit(await restart.prepare(r)),result);assert.equal((await rows(s,'topics')).length,1);
});
test('TOPIC-03 no installed trusted processing or decision mechanism stays denied; supplied booleans cannot authorize',async()=>{
 for(const options of [{},{parameters,decision:{version:'synthetic-v1',assess:assessment}},{parameters,resolveProcessing:async(_t,r)=>({allowed:true,epoch:'x',inputIds:r.inputIds,topicIds:r.topicIds})}]){const f=await formationFixture();const before=await snapshot(f.s);await assert.rejects(new TopicFormationService(f.s,options).prepare(request(f)));assert.deepEqual(await snapshot(f.s),before);}
 const f=await formationFixture({decide:view=>({...assessment(view),confidence:1,admitted:true})});await assert.rejects(f.service.prepare(request(f)));assert.equal((await rows(f.s,'topics')).length,0);
 const g=await formationFixture();await assert.rejects(g.service.prepare({...request(g),allowed:true}));await assert.rejects(g.service.commit({outcome:'create',checks:{humanIntent:true}}));
});
test('TOPIC-03 incidental entity, insufficient subject and transient names preserve substantive unassigned content',async()=>{
 for(const variation of ['incidental','subject','transient']){
  const f=await formationFixture({decide:view=>{const value=assessment(view);if(variation==='incidental'){value.boundary.reason='incidental';value.continuity.reason='incidental';value.returnValue={reason:'none',citations:[]};}else if(variation==='subject'){value.kind='subject';value.boundary.reason='sustained_subject';value.continuity.reason='recurring_subject';}else value.name='下一步操作';return value;}});
  const {result}=await runFormation(f);assert.equal(result.outcome,variation==='incidental'?'unassigned':'candidate');assert.equal((await rows(f.s,'topics')).length,0);assert.equal((await rows(f.s,'sections')).length,0);assert.equal((await rows(f.s,'placements')).length,0);assert.equal((await f.s.entry(result.entryIds[0])).body,'Synthetic explicit working input');assert.equal((await f.s.libraryIndexPage()).items.length,0);assert.equal((await rows(f.s,'organizerSuggestions')).length,0);
 }
});
test('TOPIC-03 recurring-subject thresholds are explicit versioned parameters rather than product constants',async()=>{
 const decide=view=>assessment(view,{kind:'subject',boundary:{reason:'sustained_subject',citations:view.inputs.map(x=>citation(x))},continuity:{reason:'recurring_subject',citations:view.inputs.map(x=>citation(x))}});
 const f=await formationFixture({decide});await addInput(f,{text:'Independent retrieval decision for study methods.'});await addInput(f,{text:'Independent later reflection on study methods.',chat:'third-synthetic-chat'});const {result}=await runFormation(f);assert.equal(result.outcome,'create');assert.equal(result.lineage.contributions,3);assert.equal(result.lineage.contexts,3);
 const g=await formationFixture({decide,policy:{version:'synthetic-policy-2',subject:{minContributions:2,minContexts:1},section:{minContributions:4,minContexts:2}}});await addInput(g,{text:'Second independent policy-variation contribution.',chat:'m1-synthetic-chat'});assert.equal((await runFormation(g)).result.outcome,'create');assert.equal((await rows(g.s,'topics')).length,1);
});
test('TOPIC-03 complete identity comparisons are required and equal labels do not merge independent objects',async()=>{
 const f=await formationFixture(),a=await topic(f.s,'Same name'),b=await topic(f.s,'Same name');
 const service=new TopicFormationService(f.s,{...f.serviceOptions,parameters,decision:{version:'synthetic-v1',assess:view=>assessment(view,{name:'Same name'})}}),handle=await service.prepare(request(f)),result=await service.commit(handle);assert.equal(result.outcome,'create');assert.equal((await rows(f.s,'topics')).length,3);assert.ok(![a.id,b.id].includes(result.topicIds[0]));
 const missing=new TopicFormationService(f.s,{...f.serviceOptions,parameters,decision:{version:'synthetic-v1',assess:view=>assessment(view,{relations:[]})}});await assert.rejects(missing.prepare(request(f)));
 const ambiguous=new TopicFormationService(f.s,{...f.serviceOptions,parameters,decision:{version:'synthetic-v1',assess:view=>{const value=assessment(view);value.relations.forEach(x=>{x.relation='ambiguous';x.citations=[];});return value;}}});assert.equal((await ambiguous.commit(await ambiguous.prepare(request(f)))).outcome,'unassigned');assert.equal((await rows(f.s,'topics')).length,3);
});
