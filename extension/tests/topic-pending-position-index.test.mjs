import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {setup} from './harness/thought-m1.mjs';
import {PresentationNode} from './harness/presentation-dom.mjs';

// The real store, Section adapter, opaque metadata cursor, continuous reader,
// controller open/refresh/reset/publication and text-position restoration are
// retained. Only browser layout and dispatch of the actual scheduled clock are synthetic.
class Node extends PresentationNode {
 querySelectorAll(selector){const rows=this.children.flatMap(node=>[node,...node.querySelectorAll('*')]);if(selector==='*')return rows;if(selector.startsWith('.'))return rows.filter(node=>node.classList.contains(selector.slice(1)));if(selector.startsWith('[data-')){const [,name,value]=selector.match(/^\[data-([^=\]]+)(?:="([^"]*)")?\]$/)||[],key=name?.replace(/-([a-z])/g,(_,v)=>v.toUpperCase());return rows.filter(node=>key in node.dataset&&(value===undefined||node.dataset[key]===value));}return [];}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 getBoundingClientRect(){return {top:190,bottom:230,height:40};}
 scrollIntoView(){}
}
async function fixture({count=841}={}){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();await s.setFilterMode('off');
 const topic=await s.createTopic({name:'SYNTHETIC pending exact position',operationId:crypto.randomUUID()}),first=await s.continueThinking({topicId:topic.id,body:'SYNTHETIC exact original position 👩🏽‍💻',operationId:crypto.randomUUID()});
 const template=await s.repository.transaction(false,async t=>({entry:await t.get('thoughts',first.id),placement:await t.get('placements',JSON.stringify([topic.id,1,first.id]))}));
 // Actual canonical rows, not fabricated read DTOs. The default841 rows need
 // 22 original limit40 metadata pages, beyond the unchanged20-read admission.
 await s.repository.transaction(true,async t=>{for(let i=1;i<count;i++){const id='pending-position-'+String(i).padStart(4,'0');await t.put('thoughts',{...template.entry,id});await t.put('placements',{...template.placement,id:JSON.stringify([topic.id,1,id]),entryId:id,rank:String(100000+i).padStart(12,'0')});}});
 const target=await s.entry('pending-position-0800');await s.topicPosition({topicId:topic.id,entryId:target.id,revision:target.revision,offset:7,sort:'asc',expanded:[]});
 const keys=['document','chrome','NodeFilter','scrollY','scrollBy','scrollTo','requestAnimationFrame','setTimeout','clearTimeout'],prior=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)])),nodes=new Map(),listeners=new Map(),calls=[],paints=[],offsets=[],readers=[],errors=[];
 const body=new Node('body'),host=new Node(),pane=new Node();body.append(host);host.append(pane);nodes.set('topic-body',host);nodes.set('thought-document',host);
 const node=id=>{if(!nodes.has(id)){const value=new Node();body.append(value);nodes.set(id,value);}return nodes.get(id);};
 const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;let scheduled=null,capturingContinuation=false;
 globalThis.setTimeout=(fn,ms,...args)=>capturingContinuation&&(ms===0||ms===250)?(scheduled={fn,args,delay:ms}):originalSet(fn,ms,...args);globalThis.clearTimeout=timer=>{if(timer===scheduled)scheduled=null;else originalClear(timer);};
 globalThis.scrollY=0;globalThis.scrollTo=()=>{};globalThis.scrollBy=(_x,delta)=>offsets.push({delta,offset:rangeOffset});globalThis.requestAnimationFrame=()=>0;globalThis.NodeFilter={SHOW_TEXT:4};let rangeOffset=null;
 globalThis.document={body,activeElement:body,documentElement:{lang:'zh-CN'},getElementById:node,querySelector:()=>null,createElement:tag=>new Node(tag),createTextNode:text=>{const value=new PresentationNode('#text');value.textContent=text;return value;},addEventListener(type,fn,{signal}={}){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);signal?.addEventListener('abort',()=>listeners.get(type).delete(fn),{once:true});},createTreeWalker:field=>({nextNode(){if(this.done)return null;this.done=true;return {length:field.textContent.length};}}),createRange:()=>({setStart(_part,offset){rangeOffset=offset;},collapse(){},getBoundingClientRect:()=>({top:190,height:16})})};
 const model=new ThoughtLibraryReadModel(s),reading=new ThoughtSectionReading(model);let responseHook=null;
 globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(structuredClone(message));let data;
  if(message.type==='THOUGHT_POSITION')data=await s.topicPosition(message.position);
  else if(message.type==='GET_LIBRARY_PLACEMENT')data=await s.libraryPlacement(message.topicId,message.entryId);
  else if(message.type==='GET_LIBRARY_SECTION_PROJECTION')data=await model.sectionPage(message.options);
  else if(message.type==='GET_LIBRARY_SECTION_READING')data=await reading.page(message.options);
  else if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA')data=await model.topicReadingMetadata({id:message.id});
  else if(message.type==='GET_LIBRARY_ENTRY')data=await s.entry(message.id);
  else throw Error('Unexpected original RPC '+message.type);
  await responseHook?.(message,data);return {ok:true,data};
 }}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:null,view:'original',originalMode:'content',serial:0,statusEpoch:0,statusReadSerial:0,rootCueEpoch:0,openIntent:0,topicRestoreInputEpoch:0,readingSort:'desc',timelinePositions:new Map(),homePositions:new Map(),aiTopics:new Map(),aiViewSession:{position:()=>null,view:()=>'original'},originalPane:pane,aiPane:new Node(),topicReaderInstalled:true,topicNextYear:node('topic-next-year'),readRetry:node('topic-read-retry'),
  rememberView(){},rememberContent(){},captureHomePosition:()=>null,leave:async()=>true,onOpen(){},restoreContent(){},schedulePosition(){},syncOriginalTabs(){},syncReadingControls(){},renderAITopicStatus(){},updateTopicSourceOptions:async()=>{},ensurePanes(){this.originalPane=pane;if(!host.children.includes(pane))host.append(pane);this.aiPane??=new Node();},topicProtectedIds:()=>new Set(),checkAllTracked:async()=>true,flushEditors:async()=>true,queueOptionalStatus(){},renderSectionNav(){},refreshTopicStamps(){},observeTopicWindowSpacers(){},loadRemainingTopicSections(){},onStatus(){},topicMetadata:()=>null,
  updateTopicContinuous(...args){capturingContinuation=true;try{return TopicController.prototype.updateTopicContinuous.apply(this,args);}finally{capturingContinuation=false;}},
  async readRefresh(){try{return await TopicController.prototype.readRefresh.call(this);}catch(error){errors.push(error.stack);throw error;}},
  createTopicReader(options){const reader=TopicController.prototype.createTopicReader.call(this,options);assert.ok(reader instanceof ContinuousTopicReader);assert.equal(reader.maxEmptyLoads,20);readers.push(reader);if(readers.length>1)console.error('PENDING_POSITION_ADDITIONAL_READER',new Error().stack);return reader;},
  renderDocument(page){paints.push(page);pane.replaceChildren();const entries=new Map();for(const item of page.items){const row=new Node(),field=new Node();row.dataset.entryId=item.entry.id;row.dataset.sectionId=item.placement.sectionId;field.dataset.entryField='body';field.textContent=item.entry.body;row.append(field);pane.append(row);entries.set(item.entry.id,{revision:item.entry.revision,saved:{body:item.entry.body}});}this.editor={metadata:[],entry:{entries,dirty:()=>false,receive(){},surface:{composing:false}}};},
 });
 return {s,topic,target,owner,calls,paints,offsets,readers,listeners,errors,pane,pendingDelay:()=>scheduled?.delay,async tick(){assert.ok(scheduled,'the real updateTopicContinuous schedules its pending owner');const timer=scheduled;scheduled=null;timer.fn(...timer.args);},hook:fn=>responseHook=fn,input(type){for(const fn of listeners.get(type)||[])fn({type,isTrusted:true});},async continue(){for(let step=0;step<8&&owner.topicReader?.indexing;step++)await owner.loadTopicContinuous('next',{explicit:false});},async close(){scheduled=null;originalClear(owner.topicContinuousTimer);originalClear(owner.positionTimer);await s.repository.close();for(const [key,value]of prior)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}};
}

test('actual pending durable position continues its original >20-page metadata owner and publishes the exact offset once',async()=>{
 const f=await fixture();try{
  await f.owner.open(f.topic.id);assert.deepEqual(f.errors,[]);const pending=f.owner.topicReader;assert.equal(pending.indexing,true,'the unchanged bounded initial budget must leave honest preparation');assert.equal(f.paints.length,0);assert.equal(f.offsets.length,0);
  await f.continue();assert.equal(f.owner.topicReader,pending,'preparation must continue the same original reader instead of restarting the annual scan');assert.equal(f.readers.length,1);assert.equal(pending.indexing,false);
  assert.ok(f.paints.length>0);for(const page of f.paints){assert.equal(page.scopeSectionId,f.topic.sectionId);const actual=page.items.find(item=>item.entry.id===f.target.id);assert.ok(actual,'the first published body extent includes the original exact target');assert.equal(actual.entry.revision,f.target.revision);assert.equal(actual.entry.body,f.target.body);assert.equal(actual.placement.sectionId,f.topic.sectionId);}
  assert.deepEqual(f.offsets,[{delta:50,offset:7}],'first qualified canonical paint restores the actual saved character offset exactly once');
  const reads=f.calls.filter(message=>message.type==='GET_LIBRARY_SECTION_READING'&&message.options.chronology==='expression'&&message.options.limit===40);assert.ok(reads.length>20);assert.equal(reads[0].options.anchorId,f.target.id);assert.ok(reads.slice(1).every(message=>message.options.cursor),'all later pages use the original opaque cursor, which retains the effective anchor');
  await f.owner.loadTopicContinuous('next',{explicit:false});assert.equal(f.offsets.length,1,'ordinary later paging cannot replay the durable offset');
 }finally{await f.close();}
});

test('the real scheduled index continuation cannot retire its own automatic durable position',async()=>{
 const f=await fixture();try{
  await f.owner.open(f.topic.id);const reader=f.owner.topicReader,epoch=f.owner.topicRestoreInputEpoch;
  assert.ok(reader.indexing&&reader.pendingPosition);
  let run;const load=f.owner.loadTopicContinuous.bind(f.owner);f.owner.loadTopicContinuous=(...args)=>(run=load(...args));
  await f.tick();await run;
  assert.equal(f.owner.topicRestoreInputEpoch,epoch,'an automatic scheduled continuation is not new human intent');
  assert.equal(f.owner.topicReader,reader);assert.equal(f.readers.length,1);
  assert.deepEqual(f.offsets,[{delta:50,offset:7}]);
 }finally{f.owner.retirePendingTopicPosition();await f.close();}
});

for(const composing of [false,true])test('pending durable position intent lease '+(composing?'survives an IME-refused departure':'ends on a successful keyboard departure'),async()=>{
 const f=await fixture();try{
  await f.owner.open(f.topic.id);const reader=f.owner.topicReader,pending=reader.pendingPosition;
  assert.ok(pending);assert.equal(f.listeners.get('pointerdown').size,1);assert.equal(f.listeners.get('input').size,1);
  if(composing)f.owner.editor={surface:{composing:true}};
  assert.equal(await TopicController.prototype.leaveEditors.call(f.owner),!composing);
  for(const type of ['pointerdown','input'])assert.equal(f.listeners.get(type).size,composing?1:0);
  if(composing){assert.equal(reader.pendingPosition,pending);assert.equal(f.owner.resumeAnchor,pending.anchor);}
  else{assert.equal(reader.pendingPosition,undefined);assert.equal(reader.pendingInitialPublication,undefined);assert.equal(f.owner.resumeAnchor,null);const epoch=f.owner.topicRestoreInputEpoch;f.input('pointerdown');assert.equal(f.owner.topicRestoreInputEpoch,epoch,'later page input cannot reach a departed position owner');}
 }finally{f.owner.retirePendingTopicPosition();await f.close();}
});

for(const type of ['pointerdown','input'])test('newer real '+type+' retires a durable position while its original metadata preparation is pending',async()=>{
 const f=await fixture();try{await f.owner.open(f.topic.id);assert.equal(f.owner.topicReader.indexing,true);const before=f.owner.topicRestoreInputEpoch;f.input(type);assert.equal(f.owner.topicRestoreInputEpoch,before+1,'the pending original position retains its real temporary native-intent owner');await f.continue();assert.deepEqual(f.offsets,[],'a retired automatic position must never reclaim the user scroll or selection');assert.equal(f.listeners.get(type)?.size||0,0,'retirement releases the temporary intent listener');}finally{await f.close();}
});
for(const boundary of ['route','Root purge cue','recovery epoch'])test('pending exact position cannot publish after '+boundary+' retirement',async()=>{
 const f=await fixture();let release,drain;try{
  await f.owner.open(f.topic.id);assert.equal(f.owner.topicReader.indexing,true);let held=false,arrived;const entered=new Promise(resolve=>arrived=resolve),gate=new Promise(resolve=>release=resolve);
  f.hook(async(message,page)=>{if(!held&&message.type==='GET_LIBRARY_SECTION_READING'&&message.options.chronology==='expression'&&!page.indexing&&page.items?.some(item=>item.entry.id===f.target.id)){held=true;arrived();await gate;}});
  drain=(async()=>{for(let step=0;step<8&&!held;step++)await f.owner.loadTopicContinuous('next',{explicit:false});})();await Promise.race([entered,drain.then(()=>assert.fail('the original pending owner must reach its actual qualified target response'))]);assert.equal(f.paints.length,0,'hold the actual first body response before any paint');
  if(boundary==='route')f.owner.openIntent++;else if(boundary==='Root purge cue')f.owner.rootCueEpoch++;else await f.s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'SYNTHETIC-restored-epoch'}));release();await drain;
  assert.deepEqual(f.offsets,[]);assert.equal(f.paints.length,0,'retired or different-epoch preparation cannot publish an old position-qualified body');
 }finally{release?.();await drain?.catch(()=>{});await f.close();}
});

// This test drives the real scheduled owner, rather than privately paging the
// reader. Canonical5000 rows require125 qualified limit40 metadata reads; the
// original initial budget stays20. A completed bounded scan can yield the event
// loop without inserting another polling delay before each known next page.
test('actual5000-row initial metadata preparation yields promptly through all125 qualified original pages',async()=>{
 const f=await fixture({count:5000});try{
  await f.owner.open(f.topic.id);const reader=f.owner.topicReader,epoch=f.owner.topicRestoreInputEpoch,delays=[],dispatches=[];
  assert.equal(reader.indexing,true);assert.ok(reader.pendingInitialPublication&&reader.pendingPosition);assert.equal(f.paints.length,0);assert.equal(reader.maxEmptyLoads,20);
  let run;const load=f.owner.loadTopicContinuous.bind(f.owner);f.owner.loadTopicContinuous=(...args)=>{dispatches.push(args);return run=load(...args);};
  for(let turn=0;reader.indexing&&turn<125;turn++){
   assert.equal(reader.pageMeta.yearMetadata.pending,true);assert.ok(reader.pageMeta.operations.descriptorRowsRead>0);assert.equal(reader.pageMeta.operations.hydratedEntries,0);assert.ok(reader.nextCursor);
   delays.push(f.pendingDelay());run=null;await f.tick();await run;
  }
  assert.deepEqual(f.errors,[]);assert.equal(reader.indexing,false);assert.equal(f.owner.topicReader,reader);assert.equal(f.readers.length,1);assert.equal(f.owner.topicRestoreInputEpoch,epoch);
  const reads=f.calls.filter(message=>message.type==='GET_LIBRARY_SECTION_READING'&&message.options.chronology==='expression'&&message.options.limit===40);
  assert.equal(reads.length,125,'the actual canonical Section metadata consumes all5000 rows through125 original bounded pages');assert.equal(reads[0].options.anchorId,f.target.id);assert.ok(reads.slice(1).every(message=>message.options.cursor),'every continuation uses its real opaque metadata cursor');
  assert.equal(delays.length,104,'21 initial pages leave104 genuine scheduled continuations');
  for(const page of f.paints){const actual=page.items.find(item=>item.entry.id===f.target.id);assert.ok(actual);assert.equal(actual.entry.revision,f.target.revision);assert.equal(actual.entry.body,f.target.body);assert.equal(actual.placement.sectionId,f.topic.sectionId);}
  assert.ok(f.paints.length>0);assert.deepEqual(f.offsets,[{delta:50,offset:7}]);
  assert.ok(delays.every(delay=>delay===0),'known-progress metadata preparation yields without a250ms polling wait per original page');assert.ok(dispatches.every(args=>args[1]?.explicit===false),'an automatic preparation callback never invents a deliberate user reading gesture');
 }finally{f.owner.retirePendingTopicPosition();await f.close();}
});

// Retirement is tested before the actual queued callback fires. The worker
// cannot be asked to do obsolete work merely because today's route is visible.
for(const boundary of ['reader','serial','route','status epoch','Root purge cue','human pointer','human input'])test('scheduled initial metadata callback refuses a retired '+boundary+' before dispatch',async()=>{
 const f=await fixture();try{
  await f.owner.open(f.topic.id);const reader=f.owner.topicReader;assert.ok(reader.indexing&&reader.pendingInitialPublication&&reader.pendingPosition);assert.equal(f.pendingDelay()!==undefined,true);
  const readsBefore=f.calls.length,paintsBefore=f.paints.length,offsetsBefore=f.offsets.length;let run;
  const load=f.owner.loadTopicContinuous.bind(f.owner);f.owner.loadTopicContinuous=(...args)=>(run=load(...args));
  if(boundary==='reader')f.owner.topicReader=TopicController.prototype.createTopicReader.call(f.owner,{anchorId:f.target.id});else if(boundary==='serial')f.owner.serial++;else if(boundary==='route')f.owner.openIntent++;else if(boundary==='status epoch')f.owner.statusEpoch++;else if(boundary==='Root purge cue')f.owner.rootCueEpoch++;else f.input(boundary==='human pointer'?'pointerdown':'input');
  await f.tick();await run;
  assert.equal(f.calls.length,readsBefore,'a retired queued preparation issues zero further RPCs');assert.equal(f.paints.length,paintsBefore);assert.equal(f.offsets.length,offsetsBefore);
 }finally{f.owner.retirePendingTopicPosition();await f.close();}
});

test('unproven index polling retains its250ms delay and cannot interrupt an active restoration',async()=>{
 const f=await fixture();try{
  await f.owner.open(f.topic.id);const reader=f.owner.topicReader;
  delete reader.pageMeta.operations;f.owner.updateTopicContinuous();assert.equal(f.pendingDelay(),250,'indexing without a consumed descriptor page is still ordinary bounded polling');
  const restore=f.owner.beginTopicRestore(reader,f.owner.serial),epoch=f.owner.topicRestoreInputEpoch,readsBefore=f.calls.length;let run;
  const load=f.owner.loadTopicContinuous.bind(f.owner);f.owner.loadTopicContinuous=(...args)=>(run=load(...args));
  await f.tick();await run;
  assert.equal(f.calls.length,readsBefore);assert.equal(f.owner.topicRestoreInputEpoch,epoch,'polling must not cancel restoration as though a human requested next');assert.equal(f.owner.topicRestore,restore);assert.equal(restore.cancelled,false);
 }finally{f.owner.retirePendingTopicPosition();await f.close();}
});
