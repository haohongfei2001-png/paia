import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {setup} from './harness/thought-m1.mjs';
import {PresentationNode} from './harness/presentation-dom.mjs';

const op=()=>crypto.randomUUID();
class Node extends PresentationNode {querySelectorAll(){return [];}querySelector(){return null;}}
async function fixture(){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();await s.setFilterMode('off');
 const topic=await s.createTopic({name:'SYNTHETIC durable scope',operationId:op()}),named=await s.createSection({topicId:topic.id,title:'SYNTHETIC named reading',expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()}),entries=[];
 for(let i=0;i<5;i++)entries.push(await s.continueThinking({topicId:topic.id,sectionId:named.sectionId,body:'SYNTHETIC exact named Entry '+i,operationId:op()}));
 const target=await s.entry(entries[2].id);await s.topicPosition({topicId:topic.id,entryId:target.id,revision:target.revision,offset:7,sort:'asc',expanded:[]});
 const globals=Object.fromEntries(['document','chrome'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)])),nodes=new Map(),calls=[],resets=[];
 const listeners=new Map(),body=new Node('body');globalThis.document={body,documentElement:{lang:'zh-CN'},activeElement:null,querySelector:()=>null,addEventListener(type,fn,{signal}={}){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);signal?.addEventListener('abort',()=>listeners.get(type).delete(fn),{once:true});},getElementById:id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);}};
 const model=new ThoughtLibraryReadModel(s),reading=new ThoughtSectionReading(model);let held=null,release=null,afterPage=null;
 globalThis.chrome={runtime:{sendMessage:async message=>{
  calls.push(structuredClone(message));let data;
  if(message.type==='GET_LIBRARY_SECTION_PROJECTION')data=await model.sectionPage(message.options);
  else if(message.type==='THOUGHT_POSITION')data=await s.topicPosition(message.position);
  else if(message.type==='GET_LIBRARY_PLACEMENT')data=await s.libraryPlacement(message.topicId,message.entryId);
  else if(message.type==='GET_LIBRARY_SECTION_READING'){data=await reading.page(message.options);await afterPage?.(message,data);}
  else throw Error('Unexpected original RPC '+message.type);
  if(held===message.type){held=null;await new Promise(resolve=>release=resolve);}return {ok:true,data};
 }}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:topic.id,view:'original',openIntent:3,serial:1,statusEpoch:2,presentationIntent:4,rootCueEpoch:0,topicRestoreInputEpoch:0,readingSort:'asc',activeSectionId:null,explicitSectionId:null,topicProviderKey:null,resumeAnchor:await s.topicPosition({topicId:topic.id}),aiPane:new Node(),originalPane:new Node(),syncReadingControls(){},ensurePanes(){this.originalPane??=new Node();this.aiPane??=new Node();},updateTopicSourceOptions(){},checkAllTracked:async()=>true,updateTopicSearchCount(){},renderSectionNav(){},topicProtectedIds:()=>new Set(),
  async resetTopicReader(options){
   resets.push({...options});const reader=TopicController.prototype.createTopicReader.call(this,{anchorId:options.anchorId,sectionId:options.sectionId});this.topicReader=reader;
   await reader.initial();for(let n=0;n<30&&reader.indexing;n++)await reader.next();
   if(reader.stale||reader.errorNext)return {...reader.state(),paintRefused:true};
   const page={...reader.pageMeta,items:reader.items,scopeSectionId:reader.scopeSectionId};if(options.beforePaint&&options.beforePaint(page)!==true)return {...reader.state(),paintRefused:true};
   this.document=page;return reader.state();
  }
 });
 return {s,topic,named,target,entries,owner,calls,resets,nodes,listeners,input:type=>{for(const fn of listeners.get(type)||[])fn({type,isTrusted:true});},hold:type=>held=type,held:()=>!!release,release:()=>release?.(),afterPage:fn=>afterPage=fn,async close(){release?.();await s.repository.close();for(const [k,d]of Object.entries(globals))if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}};
}
async function waitHeld(f){const deadline=Date.now()+2000;while(!f.held()&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,1));assert.equal(f.held(),true);}

test('actual cold Topic read qualifies saved named placement and loads its exact original Entry',async()=>{
 const f=await fixture();try{assert.equal(await f.owner.readContentRefresh(),true);assert.equal(f.owner.activeSectionId,f.named.sectionId);assert.equal(f.resets[0].anchorId,f.target.id);assert.equal(f.owner.topicReader.scopeSectionId,f.named.sectionId);assert.ok(f.owner.document.items.some(x=>x.entry.id===f.target.id&&x.entry.body===f.target.body));assert.ok(f.calls.some(x=>x.type==='GET_LIBRARY_PLACEMENT'&&x.entryId===f.target.id));assert.ok(f.calls.filter(x=>x.type==='GET_LIBRARY_SECTION_READING').every(x=>x.options.scopeSectionId===f.named.sectionId));assert.equal((await f.s.entry(f.target.id)).body,f.target.body);}finally{await f.close();}
});
for(const kind of ['explicit Section','current Section','explicit Entry','explicit time reset'])test('durable Topic position never overrides '+kind,async()=>{
 const f=await fixture();try{if(kind==='explicit Section'){f.owner.explicitSectionId=f.topic.sectionId;f.owner.activeSectionId=f.topic.sectionId;}if(kind==='current Section')f.owner.activeSectionId=f.topic.sectionId;if(kind==='explicit Entry')f.owner.topicNavigationAnchor={entryId:f.entries[0].id,top:140,prepareInitial:true,isCurrent:()=>true};if(kind==='explicit time reset')f.owner.topicResetFromStart=true;
  await f.owner.readContentRefresh();assert.equal(f.calls.some(x=>x.type==='GET_LIBRARY_PLACEMENT'),false,'original current/explicit intent takes priority over old durable metadata');assert.equal(f.resets[0].anchorId,kind==='explicit Entry'?f.entries[0].id:null);
 }finally{await f.close();}
});
test('a moved saved Entry resolves its current original placement instead of its old position metadata',async()=>{
 const f=await fixture();try{const p=await f.s.libraryPlacement(f.topic.id,f.target.id);await f.s.placeEntry({topicId:f.topic.id,sectionId:f.topic.sectionId,entryId:f.target.id,expectedEntryRevision:f.target.revision,expectedPlacementRevision:p.revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,operationId:op()});f.owner.resumeAnchor=await f.s.topicPosition({topicId:f.topic.id});assert.equal(f.owner.resumeAnchor.position.sectionId,f.named.sectionId);await f.owner.readContentRefresh();assert.equal(f.owner.activeSectionId,f.topic.sectionId);assert.equal(f.resets[0].anchorId,f.target.id);assert.ok(f.owner.document.items.some(x=>x.entry.id===f.target.id));}finally{await f.close();}
});
test('original removed-position nearby resolution loads its fresh exact named Entry without replaying the removed body',async()=>{
 const f=await fixture();try{const p=await f.s.libraryPlacement(f.topic.id,f.target.id);await f.s.placeEntry({topicId:f.topic.id,entryId:f.target.id,remove:true,expectedEntryRevision:f.target.revision,expectedPlacementRevision:p.revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,operationId:op()});f.owner.resumeAnchor=await f.s.topicPosition({topicId:f.topic.id});assert.equal(f.owner.resumeAnchor.nearby,true);assert.notEqual(f.owner.resumeAnchor.entryId,f.target.id);await f.owner.readContentRefresh();assert.equal(f.resets[0].anchorId,f.owner.resumeAnchor.entryId);assert.equal(f.owner.document.items.some(x=>x.entry.id===f.target.id),false);}finally{await f.close();}
});
for(const changed of ['route','serial','purge cue','new wheel input','IME'])test('held actual saved-placement reply cannot publish after '+changed,async()=>{
 const f=await fixture();try{f.hold('GET_LIBRARY_PLACEMENT');const pending=f.owner.readContentRefresh();await waitHeld(f);if(changed==='route')f.owner.openIntent++;if(changed==='serial')f.owner.serial++;if(changed==='purge cue')f.owner.rootCueEpoch++;if(changed==='new wheel input')f.owner.topicRestoreInputEpoch++;if(changed==='IME')f.owner.editor={composing:true};f.release();assert.equal(await pending,false);assert.equal(f.resets.length,0);assert.equal(f.owner.activeSectionId,null);}finally{await f.close();}
});

for(const changed of ['new wheel input','IME','purge cue'])test('actual qualified body arriving after '+changed+' cannot publish a durable-position read',async()=>{
 const f=await fixture();try{f.afterPage((message,page)=>{if(page.items?.some(item=>item.entry.id===f.target.id)){if(changed==='new wheel input')f.owner.topicRestoreInputEpoch++;if(changed==='IME')f.owner.editor={composing:true};if(changed==='purge cue')f.owner.rootCueEpoch++;}});assert.equal(await f.owner.readContentRefresh(),false);assert.equal(f.owner.document,undefined);assert.equal((await f.s.entry(f.target.id)).body,f.target.body);}finally{await f.close();}
});
test('an edited saved body cannot be painted under its old durable position revision',async()=>{
 const f=await fixture();try{await f.s.editEntry({id:f.target.id,expectedRevision:f.target.revision,changes:{body:'SYNTHETIC newer original body'},operationId:op()});assert.equal(await f.owner.readContentRefresh(),false);assert.equal(f.owner.document,undefined);assert.equal((await f.s.entry(f.target.id)).body,'SYNTHETIC newer original body');}finally{await f.close();}
});

function nativeFieldBoundary(f){
 // Geometry belongs to the native seven-case journey. Here only actual
 // qualified DTOs may supply a mounted identity for the original focus owner.
 const root=new Node(),mounted=[];root.querySelectorAll=()=>mounted;f.nodes.set('topic-body',root);
 globalThis.document.createTreeWalker=()=>({nextNode:()=>null});globalThis.NodeFilter={SHOW_TEXT:4};
 f.owner.rememberContent=()=>{};f.owner.onStatus=()=>{};f.owner.sectionIntent=1;
 f.owner.refresh=async()=>{const accepted=await f.owner.readContentRefresh();if(!accepted)return;for(const item of f.owner.document.items){const field=new Node('p');field.textContent=item.entry.body;field.dataset.entryField='body';const node=new Node();node.dataset.entryId=item.entry.id;node.querySelector=()=>field;node.scrollIntoView=()=>{};node.append(field);mounted.push(node);}};
 return mounted;
}
test('missing durable body never switches an existing current Section to an old saved sibling',async()=>{
 const f=await fixture();const prior=globalThis.NodeFilter;try{nativeFieldBoundary(f);f.owner.activeSectionId=f.topic.sectionId;assert.equal(await f.owner.restorePosition(f.owner.resumeAnchor,{allowScopeChange:false}),false);assert.equal(f.owner.activeSectionId,f.topic.sectionId);assert.equal(f.calls.some(x=>x.type==='GET_LIBRARY_SECTION_READING'),false);assert.equal(f.resets.length,0);}finally{globalThis.NodeFilter=prior;await f.close();}
});
for(const kind of ['same current Section','Topic-only missing current Section'])test('missing durable body uses the actual qualified focus owner within '+kind,async()=>{
 const f=await fixture();const prior=globalThis.NodeFilter;try{const mounted=nativeFieldBoundary(f);f.owner.activeSectionId=kind==='same current Section'?f.named.sectionId:null;await f.owner.restorePosition(f.owner.resumeAnchor,{allowScopeChange:kind!=='same current Section'});assert.equal(f.owner.activeSectionId,f.named.sectionId);assert.ok(f.calls.some(x=>x.type==='GET_LIBRARY_SECTION_READING'&&x.options.anchorId===f.target.id&&x.options.scopeSectionId===f.named.sectionId));const node=mounted.find(n=>n.dataset.entryId===f.target.id);assert.ok(node);assert.equal(node.querySelector().textContent,f.target.body);assert.equal(document.activeElement,node.querySelector());}finally{globalThis.NodeFilter=prior;await f.close();}
});
test('a missing-body fallback cannot revive a removed original placement',async()=>{
 const f=await fixture();const prior=globalThis.NodeFilter;try{nativeFieldBoundary(f);const p=await f.s.libraryPlacement(f.topic.id,f.target.id);await f.s.placeEntry({topicId:f.topic.id,entryId:f.target.id,remove:true,expectedEntryRevision:f.target.revision,expectedPlacementRevision:p.revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,operationId:op()});assert.equal(await f.owner.restorePosition(f.owner.resumeAnchor,{allowScopeChange:true}),false);assert.equal(f.calls.some(x=>x.type==='GET_LIBRARY_SECTION_READING'),false);assert.equal(f.resets.length,0);}finally{globalThis.NodeFilter=prior;await f.close();}
});
for(const type of ['pointerdown','input'])test('held automatic missing-body restoration retires on newer human '+type,async()=>{
 const f=await fixture();const prior=globalThis.NodeFilter;try{nativeFieldBoundary(f);f.owner.activeSectionId=f.named.sectionId;f.hold('GET_LIBRARY_PLACEMENT');const pending=f.owner.restorePosition(f.owner.resumeAnchor);await waitHeld(f);f.input(type);f.release();assert.equal(await pending,false);assert.equal(f.resets.length,0);assert.equal(f.calls.some(x=>x.type==='GET_LIBRARY_SECTION_READING'),false);assert.equal(f.owner.topicRestoreInputEpoch,1);assert.equal(f.listeners.get(type).size,0,'settled automatic return releases its temporary native intent owner');}finally{globalThis.NodeFilter=prior;await f.close();}
});
for(const stage of ['THOUGHT_POSITION','GET_LIBRARY_PLACEMENT'])for(const type of ['pointerdown','input'])test('actual cold open retires automatic position at '+stage+' on newer human '+type,async()=>{
 const f=await fixture(),prior=globalThis.scrollTo;try{
  f.owner.id=null;f.owner.timelinePositions=new Map();f.owner.homePositions=new Map();f.owner.aiTopics=new Map();f.owner.aiViewSession={position:()=>null,view:()=>'original'};f.owner.rememberView=()=>{};f.owner.captureHomePosition=()=>null;f.owner.leave=async()=>true;f.owner.onOpen=()=>{};f.owner.restoreContent=()=>{};f.owner.schedulePosition=()=>{};globalThis.scrollTo=()=>{throw Error('retired automatic open cannot replay scroll');};
  let restores=0;f.owner.restorePosition=async()=>{restores++;};f.owner.refresh=()=>f.owner.readContentRefresh();f.hold(stage);
  const pending=f.owner.open(f.topic.id);await waitHeld(f);f.input(type);f.release();await pending;
  assert.equal(restores,0);assert.equal(f.owner.resumeAnchor,null);assert.equal(f.listeners.get(type).size,0);if(stage==='GET_LIBRARY_PLACEMENT')assert.equal(f.resets.length,0,'new intent retires the actual qualified placement before bounded reader publication');
 }finally{globalThis.scrollTo=prior;await f.close();}
});
for(const removed of [false,true])test('actual same-session '+(removed?'removed-anchor fallback':'qualified saved window')+' paints before a held durable-position reply despite Root sort',async()=>{
 const f=await fixture(),keys=['scrollTo','scrollY','requestAnimationFrame'],prior=Object.fromEntries(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));let pending;
 try{
  const reader=new ContinuousTopicReader({load:options=>chrome.runtime.sendMessage({type:'GET_LIBRARY_SECTION_READING',options}).then(x=>x.data)});reader.reset({topicId:f.topic.id,scopeSectionId:f.named.sectionId,chronology:'expression',sort:'asc',anchorId:f.target.id});await reader.initial();for(let n=0;n<30&&reader.indexing;n++)await reader.next();const snapshot=reader.snapshot({id:f.target.id,top:140});assert.ok(snapshot.extent.some(x=>x.entry.id===f.target.id));await f.s.topicPosition({topicId:f.topic.id,entryId:f.target.id,revision:f.target.revision,offset:0,sort:'desc',expanded:[]});
  if(removed){const p=await f.s.libraryPlacement(f.topic.id,f.target.id);await f.s.placeEntry({topicId:f.topic.id,entryId:f.target.id,remove:true,expectedEntryRevision:f.target.revision,expectedPlacementRevision:p.revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,operationId:op()});}
  f.owner.id=null;f.owner.readingSort='desc';f.owner.timelinePositions=new Map();f.owner.homePositions=new Map([[f.topic.id,{sort:'asc'}]]);f.owner.lastSections=new Map([[f.topic.id,f.named.sectionId]]);f.owner.aiTopics=new Map();f.owner.aiViewSession={position:()=>null,view:()=>'original'};f.owner.rememberView=()=>{};f.owner.captureHomePosition=()=>null;f.owner.leave=async()=>true;f.owner.onOpen=()=>{};f.owner.onStatus=()=>{};f.owner.restoreContent=function(){this.contentResume=snapshot;};f.owner.schedulePosition=()=>{};f.owner.restorePosition=async()=>true;f.owner.updateTopicContinuous=()=>{};f.owner.resetTopicReader=TopicController.prototype.resetTopicReader;
  f.owner.renderTopicReader=async function(anchor,restore,{beforePaint}={}){if(!await this.topicReader.hydrateWindow())return false;const page=this.topicPageFromReader();if(beforePaint&&beforePaint(page)!==true)return false;this.document=page;return true;};f.owner.refresh=()=>f.owner.readContentRefresh();globalThis.scrollTo=()=>{};globalThis.scrollY=0;globalThis.requestAnimationFrame=fn=>fn();
  f.hold('THOUGHT_POSITION');pending=f.owner.open(f.topic.id);await waitHeld(f);assert.equal(f.owner.readingSort,'asc','Topic session owns its order independently of the Root');assert.ok(f.owner.document?.items.some(x=>x.entry.id===(removed?f.entries[3].id:f.target.id)&&!x.unloaded),'the original bounded reader publishes current same-scope bodies before old durable metadata settles');assert.equal(f.owner.document.scopeSectionId,f.named.sectionId);if(removed)assert.equal(f.owner.document.items.some(x=>x.entry.id===f.target.id),false);const published=f.owner.document;f.input('pointerdown');f.release();await pending;assert.equal(f.owner.readingSort,'asc','late old durable sort cannot replace the actual Topic order after newer user intent');assert.equal(f.owner.document,published,'late metadata never rebuilds over current qualified reading');
 }finally{f.release();await pending?.catch(()=>{});for(const [k,d]of Object.entries(prior))if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];await f.close();}
});
