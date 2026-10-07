import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreSectionPromotion} from '../core/topic-promotion-history.js';
import {TopicFormationService} from '../core/topic-formation.js';
import {promotionFixture,promote,rows,raw,op,topic,snapshot,parameters,assessment,inputEdit} from './harness/topic-04.mjs';
const restore=(f,result,side,extra={})=>restoreSectionPromotion(f.s,{historyOperationId:result.historyOperationId,side,operationId:op(),...extra});

test('TOPIC-04 undo/redo preserves one new identity, parent anchors, body and durable reverse exclusions',async()=>{
 const f=await promotionFixture({count:3}),{result}=await promote(f),before=await Promise.all(['records','blocks','provenance','dependencies'].map(t=>rows(f.s,t))),bodies=(await rows(f.s,'thoughts')).map(e=>[e.id,e.thoughtText]);
 const undone=await restore(f,result,'before');assert.equal((await f.s.topic(result.id)).lifecycle,'removed');assert.equal((await f.s.topic(f.parent.id)).defaultSectionId,f.parent.sectionId);for(const entryId of f.entryIds){const e=await f.s.entry(entryId);assert.ok(e.organizationIntents.included.includes(f.parent.id));assert.ok(e.organizationIntents.excluded.includes(result.id));}
 const redone=await restore(f,undone,'after');assert.equal(redone.id,result.id);assert.equal((await rows(f.s,'topics')).length,2);assert.equal((await f.s.topic(result.id)).lifecycle,'active');assert.equal((await f.s.topic(result.id)).identity.noRecreation,false);
 assert.deepEqual(await Promise.all(['records','blocks','provenance','dependencies'].map(t=>rows(f.s,t))),before);assert.deepEqual((await rows(f.s,'thoughts')).map(e=>[e.id,e.thoughtText]),bodies);
 for(const entryId of f.entryIds){const e=await f.s.entry(entryId);assert.ok(e.organizationIntents.excluded.includes(f.parent.id));assert.ok(e.organizationIntents.included.includes(result.id));}
 assert.deepEqual(await restore(f,result,'before'),{conflict:true});
});

test('TOPIC-04 later notes and parent names survive history; a later new-Topic rename blocks destructive undo',async()=>{
 const f=await promotionFixture(),{result}=await promote(f),entry=await f.s.entry(f.entryIds[0]);await f.s.editLibraryFields({id:entry.id,expectedRevision:entry.revision,expectedFieldRevisions:{note:entry.fieldRevisions.note},changes:{note:'Later manual annotation'},operationId:op()});const p=await f.s.topic(f.parent.id);await f.s.editTopic({id:p.id,expectedRevision:p.revision,changes:{name:'New parent label'},operationId:op()});
 const undone=await restore(f,result,'before');assert.equal((await f.s.entry(entry.id)).note,'Later manual annotation');assert.equal((await f.s.topic(p.id)).name,'New parent label');const redone=await restore(f,undone,'after');assert.equal((await f.s.entry(entry.id)).note,'Later manual annotation');const t=await f.s.topic(result.id);await f.s.editTopic({id:t.id,expectedRevision:t.revision,changes:{name:'Protected later promoted name'},operationId:op()});const before=await snapshot(f.s);assert.deepEqual(await restore(f,redone,'before'),{conflict:true});assert.deepEqual(await snapshot(f.s),before);
});

for(const later of ['membership','exclusion','order','fixed','keep','section','remove'])test('TOPIC-04 structural history refuses later manual '+later,async()=>{
 const f=await promotionFixture({count:2}),{result}=await promote(f),e=await f.s.entry(f.entryIds[0]),t=await f.s.topic(result.id);
 if(later==='membership'){const a=await topic(f.s,'Later membership');await f.s.placeEntry({entryId:e.id,topicId:a.id,expectedEntryRevision:e.revision,expectedTopicRevision:0,operationId:op()});}
 else if(later==='exclusion')await f.s.placeEntry({entryId:e.id,topicId:t.id,remove:true,expectedEntryRevision:e.revision,expectedTopicRevision:t.organizationRevision,expectedPlacementRevision:0,operationId:op()});
 else if(later==='order')await f.s.reorderPlacement({topicId:t.id,entryId:f.entryIds[0],otherEntryId:f.entryIds[1],expectedTopicRevision:t.organizationRevision,operationId:op()});
 else if(later==='fixed')await f.s.fixMembershipSet({entryId:e.id,expectedRevision:e.revision,operationId:op()});
 else if(later==='keep')await f.s.editTopic({id:t.id,expectedRevision:t.revision,changes:{pinned:true},operationId:op()});
 else if(later==='section')await f.s.createSection({topicId:t.id,title:'Later manual section',expectedTopicRevision:t.organizationRevision,operationId:op()});
 else await f.s.removeEntry({id:e.id,expectedRevision:e.revision,operationId:op()});
 const before=await snapshot(f.s);let outcome;try{outcome=await restore(f,result,'before');}catch{outcome={conflict:true};}assert.equal(outcome.conflict,true);assert.deepEqual(await snapshot(f.s),before);
});

test('TOPIC-04 failed history transaction rolls back and repeat operation is idempotent',async()=>{
 const f=await promotionFixture(),{result}=await promote(f),request={historyOperationId:result.historyOperationId,side:'before',operationId:op()},before=await snapshot(f.s),write=f.s.foundationWrite.bind(f.s);f.s.foundationWrite=fn=>write(async t=>{const put=t.put.bind(t);t.put=async(name,row,...args)=>{if(name==='operationReceipts'&&row.id===request.operationId)throw Error('synthetic history storage failure');return put(name,row,...args);};return fn(t);});await assert.rejects(restoreSectionPromotion(f.s,request));assert.deepEqual(await snapshot(f.s),before);f.s.foundationWrite=write;const undone=await restoreSectionPromotion(f.s,request);assert.deepEqual(await restoreSectionPromotion(f.s,request),undone);assert.equal((await raw(f.s,'topics',result.id)).lifecycle,'removed');
});

test('TOPIC-04 undo/redo after a lawful current Input body edit never rewrites Source or the current shared Entry body',async()=>{
 const f=await promotionFixture({count:0}),formation=new TopicFormationService(f.s,{...f.serviceOptions,parameters,decision:{version:'synthetic-original-1',assess:view=>{const value=assessment(view);value.relations.find(r=>r.topicId===f.parent.id).relation='same';value.section={kind:'existing',sectionId:f.section.sectionId};return value;}}});
 const made=await formation.commit(await formation.prepare({scope:f.scope,operationId:op()}));f.entryIds=made.entryIds;const e=await f.s.entry(f.entryIds[0]);assert.equal(e.bodyBinding,'input');const source=await rows(f.s,'records'),{result}=await promote(f);
 await inputEdit(f.s,f.scope[0].inputId,{libraryText:'Later lawful current Working Input, preserved verbatim.'});const current=await f.s.entry(e.id),input=await rows(f.s,'blocks');assert.equal(current.body,'Later lawful current Working Input, preserved verbatim.');
 const undo=await restore(f,result,'before');assert.equal((await f.s.entry(e.id)).body,current.body);await restore(f,undo,'after');assert.equal((await f.s.entry(e.id)).body,current.body);assert.deepEqual(await rows(f.s,'blocks'),input);assert.deepEqual(await rows(f.s,'records'),source);
});
