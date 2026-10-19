import test from 'node:test';import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';import {OrganizerStore} from '../core/organizer/store.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {TopicController} from '../ui/topic-workspace.js';
const op=()=>crypto.randomUUID();
for(const lateIME of [false,true])test('original selected Section handoff '+(lateIME?'preserves late IME despite different destination fields':'still publishes qualified different fields without IME'),async()=>{
 const {s}=await setup(OrganizerStore);await s.finishFoundation();const topic=await s.createTopic({name:'SYNTHETIC Topic',operationId:op()});
 const other=await s.createSection({topicId:topic.id,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,title:'SYNTHETIC B',operationId:op()});
 const a=await s.continueThinking({topicId:topic.id,sectionId:topic.sectionId,body:'SYNTHETIC A',operationId:op()}),b=await s.continueThinking({topicId:topic.id,sectionId:other.sectionId,body:'SYNTHETIC B',operationId:op()});
 const model=new ThoughtLibraryReadModel(s),reader=new ThoughtSectionReading(model),page=await reader.page({topicId:topic.id,scopeSectionId:topic.sectionId,limit:1});
 const cached={topicId:topic.id,revision:1,recoveryEpoch:page.recoveryEpoch,currentView:'',keyInformation:[{text:'SYNTHETIC A only',evidenceEntryIds:[a.id]}],preferences:[{text:'SYNTHETIC B only',evidenceEntryIds:[b.id]}],evidenceEntryIds:[a.id,b.id]};
 const editor={row:cached,admittedFields:new Set(['preferences']),sectionEvidence:new Set([b.id]),nodes:new Map(),composing:false,disposed:false,refreshes:0,refreshEvidence:async()=>{editor.refreshes++;},readingReflowBlocked:()=>editor.composing,dirty:()=>false,withdraw(){this.disposed=true;return true;}};
 let pointReads=0,publications=0,readerResets=0;
 globalThis.chrome={runtime:{sendMessage:async message=>{
  if(message.type==='GET_LIBRARY_SECTION_PROJECTION')return {ok:true,data:await model.sectionPage(message.options)};
  if(message.type==='GET_LIBRARY_SECTION_READING'){const data=await reader.page(message.options);if(message.options.anchorId===a.id){pointReads++;if(lateIME)editor.composing=true;}return {ok:true,data};}
  throw Error('unexpected original reader request '+message.type);
 }}};
 const nodes=new Map(),node=()=>({hidden:false,value:'',children:[{}],querySelectorAll:()=>[],replaceChildren(){}});
 globalThis.document={documentElement:{lang:'en'},getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:topic.id,serial:0,view:'ai',topic,activeSectionId:topic.sectionId,openIntent:1,aiScopeKey:JSON.stringify([topic.id,other.sectionId,true,['preferences'],page.coverage.activeGeneration,page.recoveryEpoch]),aiTopics:new Map([[topic.id,{presentation:cached}]]),originalPane:node(),aiPane:node(),syncReadingControls(){},ensurePanes(){},updateViewStatus:async()=>({}),filterAIReading(){},aiEditor:editor,topicAnchor:()=>null,topicSectionAnchor:()=>null,
  aiSectionNavigationRun:{topicId:topic.id,intent:1,published:false,previous:{section:other.sectionId}},
  resetTopicReader:async({beforePaint}={})=>{readerResets++;const actual=await reader.page({topicId:topic.id,scopeSectionId:topic.sectionId});const permitted=beforePaint?.(actual);if(permitted)publications++;return {...actual,paintRefused:permitted===false,terminalNext:true,terminalPrevious:true};},
 });
 try{const result=await owner.readContentRefresh();assert.ok(pointReads>0,'actual destination evidence read occurred');assert.equal(editor.refreshes,1,'original old-editor evidence refresh still precedes presentation');
  if(lateIME){assert.equal(result,false);assert.equal(publications,0,'destination cannot replace a composing old native owner');assert.equal(readerResets,0);assert.equal(editor.disposed,false);assert.equal(editor.composing,true);assert.equal(owner.aiEditor,editor);}
  else{assert.equal(publications,1);assert.equal(readerResets,1);assert.equal(editor.disposed,true);}
 }finally{await s.repository.close();}
});
