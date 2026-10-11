import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';

function fixture(){
 const prior=globalThis.document,nodes=new Map();
 for(const edge of ['before','after'])for(const suffix of ['','-status','-retry'])nodes.set('topic-continuous-'+edge+suffix,{hidden:false,dataset:{},textContent:''});
 globalThis.document={documentElement:{lang:'en'},getElementById:id=>nodes.get(id)};
 const state={terminalPrevious:true,terminalNext:true,coverage:{complete:true}},draft={body:'SYNTHETIC unsaved 原文',selection:[2,5]};
 const owner=Object.assign(Object.create(TopicController.prototype),{topicReader:{state:()=>state},topicContinuousVisible:()=>true,originalPane:draft});
 return {owner,state,draft,node:(edge,suffix='')=>nodes.get('topic-continuous-'+edge+suffix),close(){clearTimeout(owner.topicContinuousTimer);if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}};
}
test('actual continuation presenter translates both edges and retry without touching retained editor content',()=>{
 const f=fixture();try{
  f.owner.updateTopicContinuous();assert.equal(f.node('before','-status').textContent,'Beginning of the Topic');assert.equal(f.node('after','-status').textContent,'End of the Topic');
  for(const lang of ['zh-CN','en']){document.documentElement.lang=lang;f.state.continuationPrevious=true;f.state.errorNext=Error('SYNTHETIC');f.owner.updateTopicContinuous();assert.equal(f.node('before','-retry').textContent,lang==='en'?'Continue loading':'继续载入');assert.equal(f.node('after','-retry').textContent,lang==='en'?'Retry loading':'重试加载');assert.equal(f.node('after','-retry').hidden,false);assert.equal(f.node('after').dataset.terminal,'false');}
  assert.equal(f.owner.originalPane,f.draft);assert.deepEqual(f.draft,{body:'SYNTHETIC unsaved 原文',selection:[2,5]});
 }finally{f.close();}
});
test('pending or invalidated reads cannot advertise either old terminal boundary',()=>{
 for(const patch of [{loadingNext:true},{loadingPrevious:true},{indexing:true},{stale:true}]){
  const f=fixture();try{Object.assign(f.state,patch);f.owner.updateTopicContinuous();for(const edge of ['before','after']){assert.equal(f.node(edge).dataset.terminal,'false');assert.doesNotMatch(f.node(edge,'-status').textContent,/Beginning of|End of|已到/);}assert.equal(f.owner.originalPane,f.draft);}finally{f.close();}
 }
});
test('actual reset paints loading before a held new-query result and preserves the old editor owner',async()=>{
 const f=fixture();let release;const gate=new Promise(resolve=>release=resolve);try{
  const reader={state:()=>f.state,initial:async()=>{f.state.loadingNext=true;await gate;f.state.loadingNext=false;},invalidate(){}};
  Object.assign(f.owner,{serial:1,openIntent:1,view:'original',cancelTopicRestore(){},createTopicReader:()=>reader,renderTopicReader:async()=>{f.owner.updateTopicContinuous();},loadRemainingTopicSections(){}});
  f.owner.updateTopicContinuous();const pending=f.owner.resetTopicReader();
  assert.equal(f.node('after').dataset.terminal,'false');assert.equal(f.node('before').dataset.terminal,'false');assert.match(f.node('after','-status').textContent,/Loading/);assert.equal(f.owner.originalPane,f.draft);
  release();await pending;assert.equal(f.node('after','-status').textContent,'End of the Topic');assert.deepEqual(f.draft.selection,[2,5]);
 }finally{release?.();f.close();}
});

test('directional page coverage preserves each proven boundary and forward loading never says earlier',()=>{
 const f=fixture();try{
  Object.assign(f.state,{coverage:{complete:false,start:true,end:false},terminalPrevious:true,terminalNext:false});f.owner.updateTopicContinuous();
  assert.equal(f.node('before').dataset.terminal,'true');assert.equal(f.node('before','-status').textContent,'Beginning of the Topic');assert.equal(f.node('after','-status').textContent,'Scroll down to continue');
  Object.assign(f.state,{coverage:{complete:false,start:false,end:true},terminalPrevious:false,terminalNext:true});f.owner.updateTopicContinuous();assert.equal(f.node('after').dataset.terminal,'true');assert.equal(f.node('after','-status').textContent,'End of the Topic');assert.equal(f.node('before','-status').textContent,'Scroll up to continue');
  f.state.loadingNext=true;f.owner.updateTopicContinuous();assert.equal(f.node('before','-status').textContent,'Loading more…');assert.doesNotMatch(f.node('before','-status').textContent,/earlier/);
  f.state.loadingNext=false;f.state.loadingPrevious=true;f.owner.updateTopicContinuous();assert.equal(f.node('before','-status').textContent,'Loading earlier content…');
  f.state.loadingPrevious=false;f.state.indexing=true;f.owner.updateTopicContinuous();assert.equal(f.node('before','-status').textContent,'Preparing the Topic index…');
 }finally{f.close();}
});

// Keep the original canonical query owner and cursors; only DOM paint is inert.
// A completed next page must update the same count as the initial page.
test('real Section query continuation updates the visible count and rejects a superseded query count',async()=>{
 const {s}=await setup(OrganizerStore),f=fixture();
 try{
  await s.finishFoundation();const topic=await s.createTopic({name:'SYNTHETIC continuation',operationId:crypto.randomUUID()}),entries=[];
  for(let i=0;i<3;i++)entries.push(await s.continueThinking({topicId:topic.id,body:'SYNTHETIC countneedle '+i,operationId:crypto.randomUUID()}));
  const reading=new ThoughtSectionReading(new ThoughtLibraryReadModel(s)),pages=[];
  const reader=new ContinuousTopicReader({load:async options=>{const page=await reading.page({...options,limit:1});pages.push(page);return page;}});
  reader.reset({topicId:topic.id,query:'countneedle'});reader.providerKey=null;await reader.initial();
  assert.equal(reader.stale,false);assert.equal(reader.items.length,1);assert.ok(reader.nextCursor);assert.equal(reader.terminalPrevious,true);
  const count={textContent:'1+ 条匹配内容'},input={value:'countneedle'},priorGet=document.getElementById;
  document.getElementById=id=>id==='topic-search-count'?count:id==='topic-search'?input:priorGet(id);
  Object.assign(f.owner,{id:topic.id,view:'original',originalMode:'content',serial:1,openIntent:1,topicProviderKey:null,topicReader:reader,topicAnchor:()=>null,topicSectionAnchor:()=>null,checkAllTracked:async()=>true,renderTopicReader:async()=>f.owner.updateTopicContinuous()});
  await f.owner.loadTopicContinuous('next');assert.equal(count.textContent,'2+ 条匹配内容');
  await f.owner.loadTopicContinuous('next');assert.equal(count.textContent,'3 条匹配内容');
  assert.deepEqual(reader.items.map(item=>item.entry.id),entries.map(entry=>entry.id));assert.deepEqual(reader.items.map(item=>item.entry.body),['SYNTHETIC countneedle 0','SYNTHETIC countneedle 1','SYNTHETIC countneedle 2']);
  assert.equal(pages.length,3);assert.ok(pages.every(page=>!page.cursorInvalid&&!page.unavailable&&!page.indexing));assert.equal(reader.terminalNext,true);
  // Restoring an exact saved extent must requalify its real canonical bodies.
  // Hold only the first completed original owner response, then release once.
  let release,entered;const held=new Promise(resolve=>release=resolve),arrived=new Promise(resolve=>entered=resolve);let first=true;
  const restored=new ContinuousTopicReader({load:async options=>{const page=await reading.page({...options,limit:1});if(first){first=false;entered();await held;}return page;}});
  restored.reset({topicId:topic.id,query:'countneedle'});restored.providerKey=null;assert.equal(restored.restore(reader.snapshot(null)),true);
  f.owner.topicReader=restored;const pending=restored.initial();
  try{await arrived;assert.equal(restored.hydrating,true);f.owner.updateTopicContinuous();assert.equal(count.textContent,'3+ 条匹配内容','saved terminal flags cannot claim completion during canonical hydration');}
  finally{release();await pending;}
  assert.equal(restored.stale,false);assert.equal(restored.hydrating,false);f.owner.updateTopicContinuous();assert.equal(count.textContent,'3 条匹配内容');
  assert.deepEqual(restored.items.map(item=>item.entry.body),reader.items.map(item=>item.entry.body));
  input.value='differentneedle';f.owner.serial++;f.owner.updateTopicContinuous();assert.equal(count.textContent,'','old reader cannot label the newly typed query');
  input.value='countneedle';restored.invalidate({cursorInvalid:true});f.owner.updateTopicContinuous();assert.equal(count.textContent,'','refused reader cannot advertise a complete count');
  assert.deepEqual(f.draft,{body:'SYNTHETIC unsaved 原文',selection:[2,5]});
 }finally{f.close();await s.repository.close();}
});
