import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {TopicController} from '../ui/topic-workspace.js';
const op=()=>crypto.randomUUID();
async function fixture(change){
 const f=await setup(OrganizerStore);await f.s.finishFoundation();const {s}=f;
 const topic=await s.createTopic({name:'SYNTHETIC handoff qualification',operationId:op()});
 const section=await s.createSection({topicId:topic.id,title:'SYNTHETIC selected',expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()});
 const sibling=await s.createSection({topicId:topic.id,title:'SYNTHETIC sibling',expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()});
 const entry=await s.continueThinking({topicId:topic.id,sectionId:section.sectionId,body:'SYNTHETIC acknowledged text',operationId:op()});
 const reader=new ThoughtSectionReading(new ThoughtLibraryReadModel(s)),options={topicId:topic.id,scopeSectionId:section.sectionId,sort:'asc',query:'',limit:1},before=await reader.page({...options,anchorId:entry.id});
 if(change){const placement=await s.libraryPlacement(topic.id,entry.id),result=await s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:(await s.entry(entry.id)).revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,expectedPlacementRevision:placement.revision,...(change==='move'?{sectionId:sibling.sectionId}:{remove:true}),operationId:op()});assert.notEqual(result.conflict,true);}
 const page=await reader.page(options),editor={entry:{protectedIds:()=>new Set()}},field={isConnected:true},handoff={id:entry.id,field,owner:editor,topicId:topic.id,sectionId:section.sectionId,authority:before.authority,recoveryEpoch:before.recoveryEpoch};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:topic.id,activeSectionId:section.sectionId,editor,document:page,sectionEndHandoff:handoff});
 return {...f,reader,options,page,owner,handoff,entry,topic,section};
}
async function withOwner(change,run){const previous=Object.getOwnPropertyDescriptor(globalThis,'chrome'),f=await fixture(change),calls=[];let beforeFresh=null;
 globalThis.chrome={runtime:{sendMessage:async message=>{assert.equal(message.type,'GET_LIBRARY_SECTION_READING');assert.equal(message.options.scopeSectionId,f.section.sectionId);if(!message.options.anchorId&&beforeFresh)await beforeFresh();const response=await f.reader.page(message.options);calls.push({options:message.options,response});return {ok:true,data:response};}}};
 try{await run({...f,calls,beforeFresh:fn=>beforeFresh=fn});}finally{await f.s.repository.close();if(previous)Object.defineProperty(globalThis,'chrome',previous);else delete globalThis.chrome;}
}
for(const change of ['move','remove'])test('real '+change+' owner returns partial anchor refusal, then same-authority fresh scope releases only handoff pin',()=>withOwner(change,async f=>{
 assert.equal((await f.s.entry(f.entry.id)).lifecycle,'active','placement removal is distinct from Entry deletion');
 assert.equal(await f.owner.qualifySectionHandoff(f.page,()=>true),true);assert.equal(f.calls.length,2);
 const denial=f.calls[0].response;assert.equal(denial.cursorInvalid,true);assert.equal(denial.anchorUnavailable,true);assert.equal(Object.hasOwn(denial,'recoveryEpoch'),false,'actual refused anchor DTO has no epoch');assert.equal(denial.authority,f.page.authority);
 assert.equal(f.calls[1].response.recoveryEpoch,f.page.recoveryEpoch);assert.equal(f.owner.sectionEndHandoff,null);assert.equal(f.owner.topicProtectedIds().has(f.entry.id),false);
 assert.equal((await f.s.entry(f.entry.id)).body,'SYNTHETIC acknowledged text');
}));
for(const change of ['authority','epoch'])test('real '+change+' change during final scope reread refuses old handoff paint',()=>withOwner('move',async f=>{
 f.beforeFresh(async()=>{if(change==='authority')await f.s.continueThinking({topicId:f.topic.id,sectionId:f.section.sectionId,body:'SYNTHETIC new authority',operationId:op()});else await f.s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:'SYNTHETIC restored epoch'}));});
 await assert.rejects(f.owner.qualifySectionHandoff(f.page,()=>true),/HANDOFF_CHANGED/);assert.equal(f.owner.sectionEndHandoff,f.handoff);assert.equal(f.calls.length,2);assert.equal(f.calls[0].response.anchorUnavailable,true);
 if(change==='authority')assert.notEqual(f.calls[1].response.authority,f.page.authority);else assert.notEqual(f.calls[1].response.recoveryEpoch,f.page.recoveryEpoch);
}));
test('real same-Section handoff renews qualification without widening scope or duplicate Entry creation',()=>withOwner(null,async f=>{
 const before=await f.s.repository.transaction(false,t=>t.all('thoughts'));assert.equal(await f.owner.qualifySectionHandoff(f.page,()=>true),true);assert.equal(f.calls.length,1);assert.equal(f.calls[0].response.items[0].entry.id,f.entry.id);assert.equal(f.owner.sectionEndHandoff,f.handoff);assert.equal(f.owner.topicProtectedIds().has(f.entry.id),true);assert.deepEqual(await f.s.repository.transaction(false,t=>t.all('thoughts')),before);
}));
