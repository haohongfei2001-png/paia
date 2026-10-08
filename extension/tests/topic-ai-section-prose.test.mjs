import test from 'node:test';import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';import {OrganizerStore} from '../core/organizer/store.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {TopicController} from '../ui/topic-workspace.js';
test('actual CONTINUE_THINKING B remains in durable reader when cached AI only knows A',async()=>{
 const {s}=await setup(OrganizerStore);await s.finishFoundation();const topic=await s.createTopic({name:'SYNTHETIC Topic',operationId:crypto.randomUUID()});
 const a=await s.continueThinking({topicId:topic.id,body:'SYNTHETIC A',operationId:crypto.randomUUID()}),cached={revision:1,evidenceEntryIds:[a.id]};
 const b=await s.continueThinking({topicId:topic.id,body:'SYNTHETIC B not processed',operationId:crypto.randomUUID()});
 const nodes=new Map(),node=()=>({hidden:false,value:'',children:[{}],querySelectorAll:()=>[],replaceChildren(){}});globalThis.document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);}};
 let page;const owner=Object.assign(Object.create(TopicController.prototype),{id:topic.id,serial:0,view:'ai',topic,aiTopics:new Map([[topic.id,{presentation:cached}]]),originalPane:node(),aiPane:node(),syncReadingControls(){},ensurePanes(){},updateViewStatus:async()=>({}),filterAIReading(){},aiEditor:{row:cached,refreshEvidence:async()=>{},readingReflowBlocked:()=>false,dirty:()=>false},topicAnchor:()=>null,topicSectionAnchor:()=>null,resetTopicReader:async()=>{page=await new ThoughtSectionReading(new ThoughtLibraryReadModel(s)).page({topicId:topic.id});return {...page,terminalNext:true,terminalPrevious:true};}});
 await owner.readContentRefresh();assert.equal(owner.originalPane.hidden,false);assert.ok(page,'actual durable Section read is reached');assert.deepEqual(new Set(page.items.map(x=>x.entry.id)),new Set([a.id,b.id]));assert.equal(page.items.find(x=>x.entry.id===b.id).entry.body,'SYNTHETIC B not processed');assert.deepEqual(cached.evidenceEntryIds,[a.id]);
});

test('toolbar history follows the actual last body or saved-field editor and refuses a replaced owner',()=>{
 const calls=[],entry={history:v=>calls.push(['body',v])},ai={history:v=>calls.push(['ai',v])},body={},field={};
 const owner=Object.assign(Object.create(TopicController.prototype),{view:'ai',editor:{entry},aiEditor:ai,originalPane:{contains:n=>n===body},aiPane:{contains:n=>n===field}});
 owner.rememberReadingEditor({closest:()=>body});owner.readingHistory(false);owner.rememberReadingEditor({closest:()=>field});owner.readingHistory(true);owner.aiEditor={};owner.readingHistory(false);assert.deepEqual(calls,[['body',false],['ai',true],['body',false]]);
});
