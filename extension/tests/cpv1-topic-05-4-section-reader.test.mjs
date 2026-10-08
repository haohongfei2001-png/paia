import test from 'node:test';
import assert from 'node:assert/strict';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';
import {renderTopicSectionProse,coherentTopicEditorRow} from '../ui/topic-section-prose.js';
import {TopicController,MetadataEditor} from '../ui/topic-workspace.js';
import {TopicAIViewSession} from '../core/topic-ai-view-session.js';
import {TopicTimelinePositions} from '../ui/topic-timeline-window.js';
import {LibraryEntryEditor} from '../ui/library-entry-editor.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {PresentationNode} from './harness/presentation-dom.mjs';

const rank=i=>String(i).padStart(12,'0');
const section=(id,i,title='',extra={})=>({sectionId:id,topicId:'topic',revision:1,layoutGeneration:1,rank:rank(i),title,isDefault:id==='default',titleProtected:true,...extra});
const item=(i,id='default',extra={})=>({entry:{id:'entry-'+i,revision:2,contentRevision:1,fieldRevisions:{body:1},bodyBinding:i%2?'input':'thought',...(i%2?{workingInputId:'input-'+i,bindingRevision:4,currentInputRevision:4}:{currentInputRevision:null}),lifecycle:'active',recoveryEpoch:'initial',body:'SYNTHETIC BODY '+i+'\n\n段落。\nconst x = 1;',note:'SYNTHETIC NOTE',type:'idea',...extra},placement:{id:'placement-'+i,topicId:'topic',sectionId:id,layoutGeneration:1,revision:3,rank:rank(i)}});
class Node extends PresentationNode {
 constructor(tag='div'){super(tag);this.style={};}
 get innerText(){return this.textContent;}
 matches(selector){return selector.split(',').some(value=>value.startsWith('[data-')?this.parentElement?.querySelectorAll(value).includes(this):this.tagName===value.toUpperCase());}
 closest(selector){for(let node=this;node;node=node.parentElement)if(node.matches(selector))return node;return null;}
 querySelectorAll(selector){const rows=this.children.flatMap(node=>[node,...node.querySelectorAll('*')]);if(selector==='*')return rows;if(selector.startsWith('.'))return rows.filter(node=>node.classList.contains(selector.slice(1)));if(selector.startsWith('[data-')){const [,raw,value]=selector.match(/^\[data-([^=\]]+)(?:="([^"]*)")?\]$/)||[];const key=raw?.replace(/-([a-z])/g,(_,x)=>x.toUpperCase());return rows.filter(node=>key in node.dataset&&(value===undefined||node.dataset[key]===value));}return rows.filter(node=>node.tagName===selector.toUpperCase());}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 scrollIntoView(options){this.scrolled=options;}
 focus(options){super.focus();this.focusOptions=options;}
 getBoundingClientRect(){return {top:100,bottom:180,height:80};}
}
async function withDOM(run){
 const keys=['document','chrome','scrollY','scrollBy','scrollTo','requestAnimationFrame'],prior=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)])),nodes=new Map(),body=new Node('body');
 const get=id=>{if(!nodes.has(id)){const node=new Node();node.id=id;nodes.set(id,node);body.append(node);}return nodes.get(id);};
 globalThis.document={body,activeElement:body,documentElement:{lang:'en'},createElement:tag=>new Node(tag),createElementNS:(_namespace,tag)=>new Node(tag),getElementById:get,querySelector:selector=>body.querySelector(selector)};globalThis.scrollY=0;globalThis.scrollBy=()=>{};
 const entryNode=({entry})=>{const node=new Node();node.className='library-entry';node.dataset.entryId=entry.id;const prose=new Node();prose.dataset.entryField='body';prose.className='entry-prose';prose.textContent=entry.body;node.append(prose);return node;};
 try{return await run({body:get('original-reading-body'),get,entryNode});}finally{for(const [key,descriptor]of prior)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
}
const page=(sections,items)=>({kind:'section_reading',topic:{id:'topic',defaultSectionId:'default'},sections,items});

test('TOPIC-05.4 untitled default prose preserves paragraphs, code and mixed language without a manufactured heading',()=>withDOM(({body,entryNode})=>{
 const rows=[item(0),item(1)];renderTopicSectionProse({body,page:page([section('default',0)],rows),entryNode});
 assert.equal(body.querySelectorAll('h2').length,0);assert.deepEqual(body.querySelectorAll('[data-entry-field="body"]').map(node=>node.textContent),rows.map(row=>row.entry.body));
 assert.equal(body.children.length,1);assert.equal(body.children[0].dataset.sectionId,'default');assert.doesNotMatch(body.textContent,/Default|General|Uncategorized|时间未知/);
}));
test('TOPIC-05.4 genuine named and empty Sections follow durable rank; an empty default reserves no chapter',()=>withDOM(({body,entryNode})=>{
 const sections=[section('last',4,'Last'),section('default',0),section('empty',2,'Human empty'),section('first',1,'First')];
 renderTopicSectionProse({body,page:page(sections,[item(8,'last'),item(4,'first')]),entryNode});
 assert.deepEqual(body.children.map(node=>node.dataset.sectionId),['first','empty','last']);assert.deepEqual(body.querySelectorAll('h2').map(node=>node.textContent),['First','Human empty','Last']);assert.equal(body.children[1].querySelectorAll('[data-entry-id]').length,0);
}));
test('TOPIC-05.4 partial pages keep one Section heading and native body nodes; pins retain their original Section and composition text',()=>withDOM(({body,entryNode})=>{
 const sections=[section('default',0),section('named',1,'Named'),section('later',2,'Later')];
 const render=(rows,pins=new Set())=>renderTopicSectionProse({body,page:page(sections,rows),entryNode,pins});
 render([item(0),item(1,'named')]);const named=body.children[1],original=body.querySelectorAll('[data-entry-id]')[1],prose=original.firstElementChild;document.activeElement=prose;prose.textContent='IME 未完 draft';
 render([item(0),item(1,'later'),item(2,'later')],new Set(['entry-1']));
 assert.equal(body.children[1],named);assert.equal(original.parentElement,named);assert.equal(document.activeElement,prose);assert.equal(prose.textContent,'IME 未完 draft');assert.equal(body.querySelectorAll('h2').filter(node=>node.textContent==='Named').length,1);
 render([item(2,'later')],new Set(['entry-1']));assert.equal(original.parentElement,named);assert.equal(prose.textContent,'IME 未完 draft');
}));
test('TOPIC-05.4 window spacers stay in their durable Section without per-entry cards or year headings',()=>withDOM(({body,entryNode})=>{
 const data=page([section('default',0),section('named',1,'Named')],[item(4,'named')]);data.windowLayout=[{kind:'spacer',sectionId:'default',from:0,to:1,height:300},{kind:'spacer',sectionId:'named',from:2,to:3,height:200},{kind:'item',item:data.items[0]}];
 renderTopicSectionProse({body,page:data,entryNode});assert.deepEqual(body.querySelectorAll('.topic-window-spacer').map(node=>[node.parentElement.dataset.sectionId,node.style.height]),[['default','300px'],['named','200px']]);assert.equal(body.querySelectorAll('h2').length,1);assert.equal(body.querySelectorAll('[data-expression-year]').length,0);
}));

function readerFixture({count=240,maxReferences=10000,pins=new Set()}={}){
 const rows=Array.from({length:count},(_,i)=>item(i,i<40?'default':i<120?'one':'two')),sections=[section('default',0),section('one',1,'One'),section('two',2,'Two')],calls=[];let generation='g1',epoch='initial',mutate=null,fail=false;
 const load=async options=>{calls.push(structuredClone(options));if(fail)throw Error('READ_FAILED');const anchor=options.anchorId?rows.findIndex(row=>row.entry.id===options.anchorId):-1,start=anchor>=0?anchor:options.direction==='prev'?Math.max(0,options.cursor.at-40):options.cursor?.at||0,end=options.direction==='prev'?options.cursor.at:Math.min(count,start+40);const result={...page(sections,structuredClone(rows.slice(start,end))),recoveryEpoch:epoch,coverage:{activeGeneration:generation},previousCursor:start?{at:start}:null,nextCursor:end<count?{at:end}:null};if(mutate)mutate(result,options);return result;};
 const reader=new ContinuousTopicReader({load,pins:()=>pins,maxReferences});reader.reset({topicId:'topic'});
 return {reader,rows,load,calls,pins,changeGeneration:()=>generation='g2',restoreEpoch:()=>epoch='restored',mutate:fn=>mutate=fn,fail:value=>fail=value};
}
test('TOPIC-05.4 mixed binding refs survive eviction body-free and split omitted ranges at Section boundaries',async()=>{
 const f=readerFixture();await f.reader.initial();while(!f.reader.terminalNext)await f.reader.next();
 assert.equal(f.reader.state().retainedBodies,120);const snapshot=f.reader.snapshot({id:'entry-160',top:144});assert.doesNotMatch(JSON.stringify(snapshot),/SYNTHETIC BODY|SYNTHETIC NOTE|const x/);assert.equal(snapshot.extent[1].entry.workingInputId,'input-1');assert.equal(snapshot.extent[1].placement.sectionId,'default');
 assert.deepEqual(f.reader.layout().filter(part=>part.kind==='spacer').map(part=>[part.sectionId,part.from,part.to]),[['default',0,39],['one',40,119]]);
 const restored=new ContinuousTopicReader({load:f.load});restored.reset({topicId:'topic'});assert.equal(restored.restore(snapshot),true);await restored.initial();assert.equal(restored.stale,false);assert.equal(restored.items[160].entry.body,f.rows[160].entry.body);assert.equal(restored.sections.get('one').title,'One');assert.ok(restored.state().retainedBodies<=120);
});
for(const change of ['move','delete','placement-revision','binding','body-revision','generation','restore'])test('TOPIC-05.4 hydration refuses stale '+change+' references and removes cached Section labels',async()=>{
 const f=readerFixture();await f.reader.initial();while(!f.reader.terminalNext)await f.reader.next();f.reader.moveWindowToStart();
 if(change==='generation')f.changeGeneration();else if(change==='restore')f.restoreEpoch();else f.mutate(result=>{if(change==='move')result.items[0].placement.sectionId='moved';if(change==='delete')result.items.shift();if(change==='placement-revision')result.items[0].placement.revision++;if(change==='binding')result.items[1].entry.workingInputId='changed';if(change==='body-revision')result.items[1].entry.fieldRevisions.body++;});
 assert.equal(await f.reader.hydrateWindow(),false);assert.equal(f.reader.stale,true);assert.equal(f.reader.sections.size,0);assert.equal(f.reader.pageMeta,null);assert.doesNotMatch(JSON.stringify(f.reader.items),/SYNTHETIC BODY|SYNTHETIC NOTE/);
});
test('TOPIC-05.4 paging through only empty Sections progresses without fabricating bodies or claiming a premature end',async()=>{
 let reads=0;const reader=new ContinuousTopicReader({load:async()=>({kind:'section_reading',topic:{id:'topic'},items:[],sections:[section('empty-'+reads,reads,'Empty '+reads)],recoveryEpoch:'initial',coverage:{activeGeneration:'g'},nextCursor:++reads<3?'opaque-'+reads:null})});reader.reset({topicId:'topic'});
 await reader.initial();assert.equal(reads,1);assert.equal(reader.terminalNext,false);await reader.next();await reader.next();assert.equal(reader.terminalNext,true);assert.equal(reader.sections.size,3);assert.deepEqual(reader.items,[]);assert.ok(reader.bodyRevision>=3);
});
test('TOPIC-05.4 continuation failure retains bodies and retries the exact frontier',async()=>{
 const f=readerFixture();await f.reader.initial();const first=f.reader.items[0];f.fail(true);await f.reader.next();assert.equal(f.reader.items[0],first);assert.equal(f.reader.terminalNext,false);assert.match(f.reader.errorNext.message,/READ_FAILED/);f.fail(false);await f.reader.next();assert.equal(f.reader.items.length,80);assert.equal(f.reader.errorNext,null);assert.deepEqual(f.calls.slice(-2).map(call=>call.cursor),[{at:40},{at:40}]);
});
test('TOPIC-05.4 a bounded reference extent can revisit both real ends through opaque frontiers',async()=>{
 const f=readerFixture({count:560,maxReferences:160});await f.reader.initial();while(!f.reader.terminalNext){await f.reader.next();assert.ok(f.reader.items.length<=160);assert.ok(f.reader.state().retainedBodies<=120);}assert.equal(f.reader.items.at(-1).entry.id,'entry-559');assert.equal(f.reader.terminalPrevious,false);
 while(!f.reader.terminalPrevious){await f.reader.previous();assert.ok(f.reader.items.length<=160);assert.ok(f.reader.state().retainedBodies<=120);}assert.equal(f.reader.items[0].entry.id,'entry-0');assert.equal(f.reader.terminalNext,false);
});
test('TOPIC-05.4 a composing pin blocks bounded ref eviction until released without dropping its body',async()=>{
 const f=readerFixture({count:360,maxReferences:160});await f.reader.initial();f.pins.add('entry-0');for(let i=0;i<4;i++)await f.reader.next();assert.equal(f.reader.protectionBlocked,true);assert.equal(f.reader.items[0].entry.body,f.rows[0].entry.body);const calls=f.calls.length;await f.reader.next();assert.equal(f.calls.length,calls);f.pins.clear();await f.reader.next();assert.equal(f.reader.protectionBlocked,false);assert.ok(f.reader.items.length<=160);
});
for(const patch of [{id:'other'},{revision:3},{name:'changed'},{summary:undefined},{recoveryEpoch:'restored'}])test('TOPIC-05.4 metadata baseline rejects incoherent '+JSON.stringify(patch),()=>{
 const model={topic:{id:'topic',revision:2,name:'Name'},recoveryEpoch:'initial'},row={id:'topic',revision:2,name:'Name',summary:'SYNTHETIC SAVED SUMMARY',recoveryEpoch:'initial'};assert.equal(coherentTopicEditorRow(model,row),true);assert.equal(coherentTopicEditorRow(model,{...row,...patch}),false);
});

test('TOPIC-05.4 actual controller keeps ordinary and lexical scopes distinct through the qualified owner despite a saved desc preference',()=>withDOM(async({get})=>{
 const calls=[];globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(message);return {ok:true,data:{items:[],sections:[],nextCursor:null}};}}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',readingSort:'desc',topicProviderKey:'chatgpt'});
 await owner.createTopicReader({sectionId:'section'}).initial();get('topic-search').value='needle';await owner.createTopicReader().initial();
 assert.deepEqual(calls.map(call=>call.type),['GET_LIBRARY_SECTION_READING','GET_LIBRARY_SECTION_READING']);assert.equal(calls[0].options.sort,'asc');assert.equal(calls[0].options.sectionId,'section');assert.equal(calls[0].options.providerKey,'chatgpt');assert.equal(calls[1].options.query,'needle');assert.equal(calls[1].options.sort,'asc');assert.equal(calls[1].options.chronology,undefined);assert.equal(owner.readingSort,'desc');assert.equal(calls[1].options.expectedReadGeneration,null);
}));
for(const empty of [false,true])test(`TOPIC-05.4 Root opens ${empty?'empty':'nonempty'} named Section with exactly one genuine heading and focus`,()=>withDOM(async({body,entryNode,get})=>{
 const f=rootSectionRouteFixture({body,entryNode,get},{empty});
 renderTopicSectionProse({body,page:f.data,entryNode});
 await f.owner.openRootTarget('topic','named');
 assert.equal(f.calls.filter(call=>call.type==='GET_LIBRARY_SECTION_PROJECTION').length,1,'no fallback projection/heading injection after the validated durable render');
 assert.equal(f.calls.some(call=>call.type==='GET_LIBRARY_SECTION_READING'&&call.options.sectionId==='named'),true,'an existing heading still requires a qualified target read');
 assert.deepEqual(f.statuses,[]);assert.equal(body.querySelectorAll('h2').length,1);assert.equal(document.activeElement,body.querySelector('h2'));assert.deepEqual(document.activeElement.focusOptions,{preventScroll:true});
}));

test('TOPIC-05.4 an empty-Section-only extent stays bounded and rereads discarded headings toward both real ends',async()=>{
 const sections=Array.from({length:560},(_,i)=>section('empty-'+i,i,'Empty '+i));
 const reader=new ContinuousTopicReader({maxReferences:160,load:async options=>{const start=options.direction==='prev'?Math.max(0,options.cursor.at-100):options.cursor?.at||0,end=options.direction==='prev'?options.cursor.at:Math.min(sections.length,start+100);return {kind:'section_reading',items:[],sections:sections.slice(start,end),coverage:{activeGeneration:'g'},previousCursor:start?{at:start}:null,nextCursor:end<sections.length?{at:end}:null};}});reader.reset({topicId:'topic'});
 await reader.initial();while(!reader.terminalNext){await reader.next();assert.ok(reader.sections.size<=160);assert.ok(reader.frontiers.length<=2);}assert.equal(reader.sections.has('empty-559'),true);assert.equal(reader.terminalPrevious,false);
 while(!reader.terminalPrevious){await reader.previous();assert.ok(reader.sections.size<=160);}assert.equal(reader.sections.has('empty-0'),true);assert.equal(reader.terminalNext,false);assert.equal(reader.items.length,0);
});

test('TOPIC-05.4 the actual DocumentSession and LibraryEntryEditor preserve composition across a Section page update',()=>withDOM(async({body,entryNode,get})=>{
 const calls=[];globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(message);assert.equal(message.type,'PAIA_RECOVERY_DRAFT_LOAD');return {ok:true,data:null};}}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',originalPane:body,aiPane:get('ai-reading-body'),entryNode,applyLayout(){},onStatus(){}}),data=page([section('default',0),section('one',1,'One')],[item(1)]);data.topic={...data.topic,name:'Topic',revision:1,summary:'Saved summary',recoveryEpoch:'initial'};
 owner.renderDocument(data);await Promise.all([owner.editor.entry.recoveryReady,...owner.editor.metadata.map(editor=>editor.recoveryReady)]);
 const session=owner.editor,entryEditor=session.entry,prose=body.querySelector('[data-entry-field="body"]'),node=prose.parentElement;
 assert.ok(entryEditor instanceof LibraryEntryEditor);document.activeElement=prose;body.listeners.get('compositionstart')({target:prose});prose.textContent='未完成的组合文字';
 owner.renderDocument({...data,items:[item(1),item(2,'one')]});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(owner.editor,session);assert.equal(owner.editor.entry,entryEditor);assert.equal(prose.parentElement,node);assert.equal(document.activeElement,prose);assert.equal(prose.textContent,'未完成的组合文字');assert.equal(entryEditor.surface.composing,true);assert.equal(entryEditor.recoveries.get('entry-1').epoch,'initial');assert.equal(calls.every(call=>call.type==='PAIA_RECOVERY_DRAFT_LOAD'),true);
 owner.editor.dispose();
}));

for(const accepted of [true,false])test(`TOPIC-05.4 Settings departure ${accepted?'accepts':'refuses'} through the existing Thought leave owner and onAccepted boundary`,()=>withDOM(async({body,entryNode,get})=>{
 const data=page([section('one',1,'One')],[item(1,'one')]);renderTopicSectionProse({body,page:data,entryNode});const prose=body.querySelector('[data-entry-field="body"]');prose.textContent='SYNTHETIC DRAFT';
 let finish;const hold=new Promise(resolve=>finish=resolve),events=[],active={collect(){},flush:()=>hold,dirty:()=>!accepted,dispose(){events.push('dispose');}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',originalMode:'content',originalPane:body,aiPane:get('ai-reading-body'),editor:active,readRetry:get('retry'),serial:1,statusEpoch:0,statusReadSerial:0,rememberView(){},rememberTimeline(){}});
 const source=readFileSync(new URL('../ui/archive.js',import.meta.url),'utf8'),leaveSource=source.slice(source.indexOf('async function leave('),source.indexOf('\nlet navigationIntent'));
 const context={editor:null,view:'thoughts',documentId:null,topicActions:{leave:()=>true},contextCards:{leave:()=>true},thoughts:owner,serial:0,partHistory:null,routeStates:new Map(),query:'',pageCursor:null,pageHistory:[],window:{scrollY:200}};
 vm.createContext(context);vm.runInContext(leaveSource+';globalThis.runLeave=leave;',context);const pending=context.runLeave(false,()=>events.push('accepted'));
 await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(events,[]);assert.equal(prose.textContent,'SYNTHETIC DRAFT');finish(accepted);assert.equal(await pending,accepted);assert.deepEqual(events,accepted?['dispose','accepted']:[]);assert.equal(owner.editor,accepted?null:active);assert.equal(prose.textContent,'SYNTHETIC DRAFT');
}));

for(const state of ['coherent','different-summary-revision','restore-after-metadata','purge-after-metadata'])test('TOPIC-05.4 production reader metadata handoff fences '+state,()=>withDOM(async({body})=>{
 const f=readerFixture({count:1});await f.reader.initial();f.reader.pageMeta.topic={id:'topic',name:'Topic',revision:2,defaultSectionId:'default'};
 const paints=[],calls=[],owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',serial:1,topicProviderKey:null,topicReader:f.reader,originalPane:body,renderDocument:value=>paints.push(value),updateTopicContinuous(){},observeTopicWindowSpacers(){},checkAllTracked:async()=>{calls.push('tracked');return true;}});
 globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(message.type);if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA')return {ok:true,data:{id:'topic',name:'Topic',revision:state==='different-summary-revision'?3:2,summary:'SYNTHETIC SAVED SUMMARY',recoveryEpoch:'initial'}};assert.equal(message.type,'GET_LIBRARY_SECTION_READING');return {ok:true,data:state==='purge-after-metadata'?{cursorInvalid:true}:{coverage:{activeGeneration:'g1'},recoveryEpoch:state==='restore-after-metadata'?'restore':'initial'}};}}};
 if(state==='coherent'){assert.equal(await owner.renderTopicReader(),true);assert.equal(paints[0].topic.summary,'SYNTHETIC SAVED SUMMARY');assert.equal(paints[0].topic.recoveryEpoch,'initial');}
 else{await assert.rejects(owner.renderTopicReader(),/TOPIC_(METADATA|READING)_CHANGED/);assert.equal(paints.length,0);if(state!=='different-summary-revision'){assert.equal(f.reader.stale,true);assert.equal(f.reader.sections.size,0);assert.equal(calls.at(-1),'tracked');}}
}));

for(const timing of ['fresh','during-save'])test('TOPIC-05.4 composition leave guard retains the real editor for '+timing+' IME',()=>withDOM(async({body,entryNode,get})=>{
 const calls=[];let releaseSave,saveStarted;const started=new Promise(resolve=>saveStarted=resolve),save=new Promise(resolve=>releaseSave=resolve);
 globalThis.chrome={runtime:{sendMessage:async message=>{
  calls.push(message);
  if(message.type==='PAIA_RECOVERY_DRAFT_LOAD')return {ok:true,data:null};
  if(message.type==='EDIT_LIBRARY_BATCH'){saveStarted();await save;return {ok:true,data:{items:[{id:'entry-1',revision:3,fieldRevisions:{body:2,note:0,type:0},currentInputRevision:4}]}};}
  if(message.type.startsWith('PAIA_RECOVERY_DRAFT_'))return {ok:true,data:true};
  throw Error(message.type);
 }}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',originalMode:'content',originalPane:body,aiPane:get('ai-reading-body'),entryNode,applyLayout(){},onStatus(){},refresh:async()=>{},readRetry:get('retry'),serial:1,statusEpoch:0,statusReadSerial:0,rememberView(){},rememberTimeline(){}}),data=page([section('default',0)],[item(1)]);
 data.topic={...data.topic,name:'Topic',revision:1,summary:'Saved summary',recoveryEpoch:'initial'};owner.renderDocument(data);const session=owner.editor,entry=session.entry;
 await Promise.all([entry.recoveryReady,...session.metadata.map(editor=>editor.recoveryReady)]);
 const prose=body.querySelector('[data-entry-field="body"]');document.activeElement=prose;
 const compose=()=>{body.listeners.get('compositionstart')({target:prose});prose.textContent='SYNTHETIC 未完成组合 👩🏽‍💻';};
 if(timing==='fresh')compose();else{prose.textContent='SYNTHETIC SAVING';entry.collect();}
 const source=readFileSync(new URL('../ui/archive.js',import.meta.url),'utf8'),leaveSource=source.slice(source.indexOf('async function leave('),source.indexOf('\nlet navigationIntent'));
 const accepted=[],context={editor:null,view:'thoughts',documentId:null,topicActions:{leave:()=>true},contextCards:{leave:()=>true},thoughts:owner,serial:0,partHistory:null,routeStates:new Map(),query:'',pageCursor:null,pageHistory:[],window:{scrollY:200}};
 vm.createContext(context);vm.runInContext(leaveSource+';globalThis.runLeave=leave;',context);
 try{
  if(timing==='fresh')assert.equal(entry.dirty(),false,'fresh native composition is not collected into local dirty state');
  const pending=context.runLeave(false,()=>accepted.push(true));
  if(timing==='during-save'){await started;compose();releaseSave();}
  assert.equal(await pending,false,'composition must refuse the existing navigation leave boundary');
  assert.equal(owner.editor,session);assert.equal(entry.disposed,undefined);assert.equal(entry.surface.composing,true);assert.equal(entry.entries.has('entry-1'),true);assert.equal(document.activeElement,prose);assert.equal(prose.textContent,'SYNTHETIC 未完成组合 👩🏽‍💻');assert.deepEqual(accepted,[]);
  assert.equal(calls.filter(message=>message.type==='EDIT_LIBRARY_BATCH').length,timing==='fresh'?0:1);
 }finally{releaseSave();session.dispose();}
}));

test('TOPIC-05.4 lexical queries render only headings represented by actual hits or retained spacers',()=>withDOM(({body,entryNode})=>{
 const data={...page([section('unmatched',0,'Unmatched'),section('one',1,'One'),section('empty',2,'Human empty'),section('two',3,'Two')],[item(1,'one')]),query:'needle'};
 data.windowLayout=[{kind:'item',item:data.items[0]},{kind:'spacer',sectionId:'two',from:1,to:3,height:200}];
 renderTopicSectionProse({body,page:data,entryNode});assert.deepEqual(body.querySelectorAll('h2').map(node=>node.textContent),['One','Two']);assert.doesNotMatch(body.textContent,/Unmatched|Human empty/);
 renderTopicSectionProse({body,page:{...data,query:''},entryNode});assert.deepEqual(body.querySelectorAll('h2').map(node=>node.textContent),['Unmatched','One','Human empty','Two']);
}));
test('TOPIC-05.4 lexical reader never supplements qualified labels with the legacy unscoped Section continuation',()=>withDOM(async()=>{
 globalThis.chrome={runtime:{sendMessage:()=>assert.fail('reading must not fetch unqualified Section labels')}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',topicReader:{query:'needle',sectionCursor:{at:100}}});await owner.loadRemainingTopicSections();
}));

function emptySectionFixture({mixed=false}={}){
 const rows=[...(mixed?[section('default',0)]:[]),...Array.from({length:205},(_,i)=>section('empty-'+i,i+(mixed?1:0),'SYNTHETIC named '+i))],calls=[],cursors=new Map();let token=0,generation='empty-generation',epoch='initial',failed=false,hold=null;
 const topic=()=>({id:'topic',name:'SYNTHETIC Empty Topic',revision:1,defaultSectionId:'default',summary:'SYNTHETIC SAVED SUMMARY',recoveryEpoch:epoch,authority:'empty-authority'});
 const issue=(at,direction)=>{const key='opaque-'+(++token);cursors.set(key,{at,direction});return key;};
 const load=async(options={})=>{
  calls.push(structuredClone(options));if(hold){const pending=hold;hold=null;await pending;}if(failed)throw Error('EMPTY_SECTION_READ_FAILED');
  if(options.expectedReadGeneration&&options.expectedReadGeneration!==generation)return {cursorInvalid:true,items:[],sections:[]};
  const point=options.cursor?cursors.get(options.cursor):null;if(options.cursor&&(!point||point.direction!==options.direction))return {cursorInvalid:true,items:[],sections:[]};
  const at=options.sectionId?rows.findIndex(row=>row.sectionId===options.sectionId):point?.at||0;
  if(at<0)return {cursorInvalid:true,anchorUnavailable:true,items:[],sections:[]};
  const start=options.direction==='prev'?Math.max(0,at-100):at,end=options.direction==='prev'?at:Math.min(rows.length,start+100);
  return {kind:'section_reading',topic:topic(),items:mixed&&start===0?[item(1)]:[],sections:structuredClone(rows.slice(start,end)),recoveryEpoch:epoch,coverage:{activeGeneration:generation},previousCursor:start?issue(start,'prev'):null,nextCursor:end<rows.length?issue(end,'next'):null};
 };
 const reader=new ContinuousTopicReader({load});reader.reset({topicId:'topic'});
 return {reader,load,rows,calls,topic,async prime(all=true){await reader.initial();if(all)while(!reader.terminalNext)await reader.next();},snapshot(index=150){return reader.snapshot(null,{...reader.sections.get('empty-'+index),recoveryEpoch:epoch,top:140});},expireCursors:()=>cursors.clear(),expireGeneration:()=>{generation+='-new';cursors.clear();},replace:()=>{epoch='replaced';generation+='-restore';},fail:value=>failed=value,holdNext:promise=>hold=promise};
}
test('TOPIC-05.4 205 empty named Sections restore through a bounded exact Section reference and fresh directional cursors',async()=>{
 const f=emptySectionFixture();await f.prime();assert.equal(f.reader.sections.size,205);const saved=f.snapshot();assert.deepEqual(saved.extent,[]);assert.equal(saved.sectionAnchor.sectionId,'empty-150');assert.deepEqual(Object.keys(saved.sectionAnchor),['sectionId','topicId','revision','layoutGeneration','rank','recoveryEpoch','top']);assert.doesNotMatch(JSON.stringify(saved.sectionAnchor),/SYNTHETIC|summary|body/);
 const reader=new ContinuousTopicReader({load:f.load});reader.reset({topicId:'topic'});assert.equal(reader.restore(saved),true);assert.equal(reader.pageMeta,null);await reader.initial();assert.equal(reader.stale,false);assert.equal(reader.sections.has('empty-150'),true);assert.ok(reader.sections.size<=100);assert.equal(reader.items.length,0);assert.equal(reader.terminalPrevious,false);assert.equal(reader.sectionRestoreAnchor.top,140);assert.equal(f.calls.at(-1).sectionId,'empty-150');
 await reader.previous();assert.equal(reader.sections.has('empty-50'),true);while(!reader.terminalPrevious)await reader.previous();assert.equal(reader.sections.has('empty-0'),true);
});
test('TOPIC-05.4 an expired Section read generation renews only an unchanged revision/layout/epoch',async()=>{
 const f=emptySectionFixture();await f.prime();const saved=f.snapshot();f.expireGeneration();const reader=new ContinuousTopicReader({load:f.load});reader.reset({topicId:'topic'});assert.equal(reader.restore(saved),true);await reader.initial();assert.equal(reader.stale,false);assert.deepEqual(f.calls.slice(-2).map(call=>[call.sectionId,call.expectedReadGeneration]),[['empty-150','empty-generation'],['empty-150',null]]);assert.equal(reader.sections.has('empty-0'),false,'old metadata outside the fresh anchored read is not replayed');assert.equal(reader.sections.has('empty-150'),true);
});
for(const change of ['revision','deleted','rank','layout','topic','restore','unavailable-heading'])test('TOPIC-05.4 Section-only restoration refuses '+change+' without replaying old heading metadata',async()=>{
 const f=emptySectionFixture();await f.prime();const saved=f.snapshot();if(change==='restore')f.replace();else{f.expireGeneration();const row=f.rows[150];if(change==='revision')row.revision++;if(change==='deleted')f.rows.splice(150,1);if(change==='rank')row.rank=rank(999);if(change==='layout')row.layoutGeneration++;if(change==='topic')row.topicId='other';if(change==='unavailable-heading'){row.title='';row.sourceUnavailable=true;}}
 const reader=new ContinuousTopicReader({load:f.load});reader.reset({topicId:'topic'});assert.equal(reader.restore(saved),true);await reader.initial();assert.equal(reader.stale,true);assert.equal(reader.anchorUnavailable,true);assert.equal(reader.sectionRestoreRefused,true);assert.equal(reader.sectionRestoreAnchor,null);assert.equal(reader.pageMeta,null);assert.equal(reader.sections.size,0);assert.equal(reader.items.length,0);
});
test('TOPIC-05.4 a failed empty-Section hydration retains its exact reference for explicit retry',async()=>{
 const f=emptySectionFixture();await f.prime();const reader=new ContinuousTopicReader({load:f.load});reader.reset({topicId:'topic'});assert.equal(reader.restore(f.snapshot()),true);f.fail(true);await reader.initial();assert.match(reader.hydrationError.message,/EMPTY_SECTION_READ_FAILED/);assert.equal(reader.pendingSectionAnchor.sectionId,'empty-150');assert.equal(reader.pageMeta,null);f.fail(false);assert.equal(await reader.hydrateWindow(),true);assert.equal(reader.hydrationError,null);assert.equal(reader.sectionRestoreAnchor.sectionId,'empty-150');assert.equal(reader.items.length,0);
});
test('TOPIC-05.4 Entry anchors take precedence over Section fallback and query snapshots never adopt one',async()=>{
 const f=readerFixture({count:1});await f.reader.initial();const fallback={...f.reader.sections.get('default'),recoveryEpoch:'initial',top:140},saved=f.reader.snapshot({id:'entry-0',top:155},fallback);assert.equal(saved.sectionAnchor,null);saved.sectionAnchor=fallback;
 const reader=new ContinuousTopicReader({load:f.load});reader.reset({topicId:'topic'});assert.equal(reader.restore(saved),true);assert.equal(reader.pendingSectionAnchor,null);await reader.initial();assert.equal(f.calls.at(-1).anchorId,'entry-0');assert.equal(f.calls.at(-1).sectionId,undefined);
 f.reader.query='needle';assert.equal(f.reader.snapshot(null,fallback).sectionAnchor,null);
});
test('TOPIC-05.4 newer reader intent cancels a held Section-only restoration',async()=>{
 const f=emptySectionFixture();await f.prime();const reader=new ContinuousTopicReader({load:f.load});reader.reset({topicId:'topic'});reader.restore(f.snapshot());let release;f.holdNext(new Promise(resolve=>release=resolve));const pending=reader.initial();reader.reset({topicId:'other'});release();await pending;assert.equal(reader.topicId,'other');assert.equal(reader.sectionRestoreAnchor,null);assert.equal(reader.sections.size,0);assert.equal(reader.pageMeta,null);
});

async function withEmptySectionController(run,{all=true,mixed=false}={}){return withDOM(async({body,entryNode,get})=>{
 const f=emptySectionFixture({mixed});await f.prime(all);const scrolls=[],frames=[];globalThis.scrollBy=(_x,delta)=>{scrolls.push(delta);globalThis.scrollY+=delta;};globalThis.scrollTo=(_x,value)=>{scrolls.push({absolute:value});globalThis.scrollY=value;};globalThis.requestAnimationFrame=callback=>frames.push(callback);
 globalThis.chrome={runtime:{sendMessage:async message=>{
  if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA')return {ok:true,data:f.topic()};
  if(message.type==='GET_LIBRARY_SECTION_READING'){try{return {ok:true,data:await f.load(message.options)};}catch{return {ok:false,error:'STORAGE_FAILED'};}}
  if(message.type==='PAIA_RECOVERY_DRAFT_LOAD'||message.type==='THOUGHT_POSITION')return {ok:true,data:null};
  throw Error('UNEXPECTED '+message.type);
 }}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',originalMode:'content',readingSort:'asc',topicProviderKey:null,serial:1,statusEpoch:0,statusReadSerial:0,openIntent:0,readRetry:get('retry'),originalPane:body,aiPane:get('ai-reading-body'),topicReader:f.reader,contentPositions:new TopicTimelinePositions(),timelinePositions:new TopicTimelinePositions(),aiViewSession:new TopicAIViewSession(),homePositions:new Map(),aiTopics:new Map(),entryNode,applyLayout(){},onStatus(){},onOpen(){},updateTopicContinuous(){},observeTopicWindowSpacers(){}});
 owner.renderDocument=function(data){TopicController.prototype.renderDocument.call(this,data);for(const node of body.children)node.getBoundingClientRect=()=>{const top=300+body.children.indexOf(node)*44-scrollY;return {top,bottom:top+44,height:44};};for(const node of body.querySelectorAll('[data-entry-id]'))node.getBoundingClientRect=()=>node.parentElement.getBoundingClientRect();};
 owner.renderDocument({...owner.topicPageFromReader(),topic:f.topic()});await Promise.all([owner.editor.entry.recoveryReady,...owner.editor.metadata.map(editor=>editor.recoveryReady)]);
 globalThis.scrollY=300+(all?150:75)*44-140;
 try{await run({...f,owner,body,scrolls,frames,get});}finally{await new Promise(resolve=>setImmediate(resolve));clearTimeout(owner.positionTimer);owner.editor?.dispose();}
});}
test('TOPIC-05.4 warm Settings return rehydrates the same empty Section through actual content snapshot owners',()=>withEmptySectionController(async f=>{
 const anchor=f.owner.topicSectionAnchor();assert.equal(anchor.sectionId,'empty-150');assert.equal(f.owner.topicAnchor(),null);f.owner.rememberContent();const saved=f.owner.contentPositions.get('topic').snapshot;assert.equal(saved.sectionAnchor.sectionId,'empty-150');
 assert.equal(await f.owner.leave(),true);f.owner.restoreContent('topic');await f.owner.resetTopicReader({saved:f.owner.contentResume});assert.equal(f.owner.topicReader.sectionAnchorRestored,true);assert.equal(f.owner.topicSectionAnchor().sectionId,'empty-150');assert.equal(f.owner.topicSectionAnchor().top,anchor.top);assert.equal(f.body.querySelectorAll('[data-entry-id]').length,0);assert.ok(f.body.querySelectorAll('h2').length<=100);assert.equal(f.owner.editor.metadata[0].saved.summary,'SYNTHETIC SAVED SUMMARY');
}));
test('TOPIC-05.4 expired empty-Section continuation renews the current Section and then reaches the real end',()=>withEmptySectionController(async f=>{
 const anchor=f.owner.topicSectionAnchor();assert.equal(anchor.sectionId,'empty-75');f.expireCursors();await f.owner.loadTopicContinuous('next');assert.equal(f.owner.topicReader.stale,false);assert.equal(f.owner.topicSectionAnchor().sectionId,'empty-75');assert.equal(f.owner.topicSectionAnchor().top,anchor.top);assert.equal(f.owner.topicReader.terminalNext,false);
 await f.owner.loadTopicContinuous('next');assert.equal(f.owner.topicReader.terminalNext,true);assert.equal(f.owner.topicReader.sections.has('empty-204'),true);assert.equal(f.body.querySelectorAll('[data-entry-id]').length,0);
},{all:false}));
test('TOPIC-05.4 failed Settings Section return retries without fabricating an Entry or losing its heading top',()=>withEmptySectionController(async f=>{
 f.owner.rememberContent();assert.equal(await f.owner.leave(),true);f.owner.restoreContent('topic');f.fail(true);await assert.rejects(f.owner.resetTopicReader({saved:f.owner.contentResume}),error=>error.code==='STORAGE_FAILED');assert.equal(f.owner.topicReader.pendingSectionAnchor.sectionId,'empty-150');
 f.fail(false);await f.owner.loadTopicContinuous('next');assert.equal(f.owner.topicReader.hydrationError,null);assert.equal(f.owner.topicSectionAnchor().sectionId,'empty-150');assert.equal(f.owner.topicSectionAnchor().top,140);assert.equal(f.owner.topicReader.sectionAnchorRestored,true);assert.equal(f.body.querySelectorAll('[data-entry-id]').length,0);
}));
test('TOPIC-05.4 actual Topic open cannot overwrite a restored Section with the old scalar scroll',()=>withEmptySectionController(async f=>{
 f.owner.refresh=async()=>{f.owner.restoreContent('topic');return f.owner.resetTopicReader({saved:f.owner.contentResume});};
 const before=f.owner.topicSectionAnchor();await f.owner.open('topic');assert.equal(f.owner.topicReader.sectionAnchorRestored,true);assert.equal(f.owner.topicSectionAnchor().sectionId,before.sectionId);assert.equal(f.owner.topicSectionAnchor().top,before.top);assert.equal(f.scrolls.some(value=>typeof value==='object'),false,'open must retain the validated heading position');
}));

test('TOPIC-05.4 subsequent empty-Section paging cannot replay an already consumed return anchor',()=>withEmptySectionController(async f=>{
 f.expireCursors();await f.owner.loadTopicContinuous('next');assert.equal(f.owner.topicReader.sectionRestoreAnchor,null);assert.equal(f.owner.topicSectionAnchor().sectionId,'empty-75');
 globalThis.scrollY=300+75*44-140;assert.equal(f.owner.topicSectionAnchor().sectionId,'empty-150');const before=f.scrolls.length;await f.owner.loadTopicContinuous('next');assert.equal(f.owner.topicSectionAnchor().sectionId,'empty-150');assert.equal(f.owner.topicSectionAnchor().top,140);assert.equal(f.scrolls.length,before);
},{all:false}));
test('TOPIC-05.4 deliberate reading input cancels a held Section return without a later paging jump',()=>withEmptySectionController(async f=>{
 const saved=f.owner.topicReader.snapshot(null,f.owner.topicSectionAnchor());let release;f.holdNext(new Promise(resolve=>release=resolve));const pending=f.owner.resetTopicReader({saved});f.owner.topicRestoreInput({type:'wheel',isTrusted:true});globalThis.scrollY=50;const count=f.scrolls.length;release();await pending;assert.equal(f.scrolls.length,count);assert.equal(f.owner.topicReader.sectionAnchorRestored,false);assert.equal(f.owner.topicReader.sectionRestoreAnchor,null);assert.equal(f.owner.topicRestoring(),false);
}));

test('TOPIC-05.4 mixed Topic return honors the empty-region Section anchor despite retained earlier Entry refs',()=>withEmptySectionController(async f=>{
 const target=f.body.children.find(node=>node.dataset.sectionId==='empty-150');globalThis.scrollY=300+f.body.children.indexOf(target)*44-140;
 assert.equal(f.owner.topicAnchor(),null);const saved=f.owner.topicReader.snapshot(null,f.owner.topicSectionAnchor());assert.equal(saved.extent.length,1);assert.equal(saved.sectionAnchor.sectionId,'empty-150');
 f.owner.rememberContent();assert.equal(await f.owner.leave(),true);f.owner.restoreContent('topic');await f.owner.resetTopicReader({saved:f.owner.contentResume});
 assert.equal(f.owner.topicReader.sectionAnchorRestored,true);assert.equal(f.owner.topicSectionAnchor().sectionId,'empty-150');assert.equal(f.owner.topicSectionAnchor().top,140);assert.equal(f.owner.topicReader.items.length,0,'clean earlier bodies need not be restored into the empty reading region');
},{mixed:true}));
test('TOPIC-05.4 mixed empty-region restoration revalidates and retains a composing Entry pin and its native field',()=>withEmptySectionController(async f=>{
 const target=f.body.children.find(node=>node.dataset.sectionId==='empty-150');globalThis.scrollY=300+f.body.children.indexOf(target)*44-140;
 const editor=f.owner.editor,prose=f.body.querySelector('[data-entry-field="body"]');document.activeElement=prose;f.body.listeners.get('compositionstart')({target:prose});prose.textContent='SYNTHETIC 保留的组合草稿';
 const saved=f.owner.topicReader.snapshot(null,f.owner.topicSectionAnchor());assert.equal(saved.extent.length,1);await f.owner.resetTopicReader({saved});
 assert.equal(f.owner.editor,editor);assert.equal(f.body.querySelector('[data-entry-field="body"]'),prose);assert.equal(document.activeElement,prose);assert.equal(prose.textContent,'SYNTHETIC 保留的组合草稿');assert.equal(editor.entry.surface.composing,true);assert.equal(f.owner.topicReader.sectionAnchorRestored,true);assert.equal(f.owner.topicReader.index.has('entry-1'),true);assert.ok(f.calls.some(call=>call.anchorId==='entry-1'));assert.ok(f.owner.topicReader.state().retainedBodies<=120);assert.equal(f.owner.topicSectionAnchor().sectionId,'empty-150');
},{mixed:true}));

for(const query of ['', 'SYNTHETIC'])test(`TOPIC-05.4 actual ${query?'query':'ordinary'} reader mounts the qualified masked metadata baseline and rechecks exactly its own scope`,()=>withDOM(async({body,entryNode,get})=>{
 const f=readerFixture({count:1});await f.reader.initial();f.reader.query=query;f.reader.providerKey='chatgpt';f.reader.coverage={activeGeneration:query?'qualified-query-generation':'qualified-ordinary-generation'};f.reader.pageMeta={...f.reader.pageMeta,coverage:f.reader.coverage,topic:{id:'topic',name:'',revision:2,defaultSectionId:'default'},authority:'qualified-authority'};
 const safe={id:'topic',name:'',summary:'',revision:2,recoveryEpoch:'initial',defaultSectionId:'default',organizationRevision:7,activeLayoutGeneration:1,authority:'qualified-authority'},calls=[];
 globalThis.chrome={runtime:{sendMessage:async message=>{
  calls.push(structuredClone(message));if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA')return {ok:true,data:safe};
  if(message.type==='GET_LIBRARY_SECTION_READING'){assert.deepEqual(message.options,{topicId:'topic',query,sort:'asc',providerKey:'chatgpt',limit:1,expectedReadGeneration:f.reader.coverage.activeGeneration});return {ok:true,data:{coverage:{activeGeneration:f.reader.coverage.activeGeneration},recoveryEpoch:'initial'}};}
  if(message.type==='PAIA_RECOVERY_DRAFT_LOAD')return {ok:true,data:null};throw Error('UNQUALIFIED_OR_UNEXPECTED '+message.type);
 }}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',serial:1,topicReader:f.reader,topicProviderKey:'chatgpt',readingSort:'desc',originalPane:body,aiPane:get('ai-reading-body'),entryNode,onStatus(){},applyLayout(){},observeTopicWindowSpacers(){},updateTopicContinuous(){}});
 try{assert.equal(await owner.renderTopicReader(),true);await Promise.all([owner.editor.entry.recoveryReady,...owner.editor.metadata.map(editor=>editor.recoveryReady)]);const metadata=owner.editor.metadata[0];assert.deepEqual(metadata.saved,{name:'',summary:''});assert.equal(metadata.row.revision,2);assert.equal(metadata.recovery.epoch,'initial');assert.equal(metadata.dirty(),false);assert.equal(get('topic-heading').querySelector('h1').textContent,'');assert.equal(calls.some(message=>message.type==='GET_LIBRARY_TOPIC'||message.type.startsWith('EDIT_')),false);assert.equal(owner.readingSort,'desc');}finally{owner.editor?.dispose();}
}));
for(const stale of ['ordinary-generation','cursor-invalid','metadata-authority'])test('TOPIC-05.4 query-scoped metadata handoff refuses '+stale,()=>withDOM(async({body})=>{
 const f=readerFixture({count:1});await f.reader.initial();f.reader.query='needle';f.reader.providerKey='chatgpt';f.reader.coverage={activeGeneration:'query-generation'};f.reader.pageMeta={...f.reader.pageMeta,coverage:f.reader.coverage,topic:{id:'topic',name:'Topic',revision:2},authority:'current-authority'};let paints=0;
 globalThis.chrome={runtime:{sendMessage:async message=>{
  if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA')return {ok:true,data:{id:'topic',name:'Topic',summary:'Safe',revision:2,recoveryEpoch:'initial',authority:stale==='metadata-authority'?'stale-authority':'current-authority'}};
  assert.equal(message.type,'GET_LIBRARY_SECTION_READING');assert.equal(message.options.query,'needle');assert.equal(message.options.sort,'asc');assert.equal(message.options.providerKey,'chatgpt');assert.equal(message.options.expectedReadGeneration,'query-generation');
  return {ok:true,data:stale==='cursor-invalid'?{cursorInvalid:true}:{coverage:{activeGeneration:'ordinary-generation'},recoveryEpoch:'initial'}};
 }}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',serial:1,topicReader:f.reader,topicProviderKey:'chatgpt',originalPane:body,renderDocument(){paints++;},checkAllTracked:async()=>true});await assert.rejects(owner.renderTopicReader(),/TOPIC_(METADATA|READING)_CHANGED/);assert.equal(paints,0);
}));
test('TOPIC-05.4 cold query indexing keeps the loading state and never initializes a metadata editor without a generation',()=>withDOM(async({body})=>{
 const reader=new ContinuousTopicReader({load:async()=>({kind:'section_reading',topic:{id:'topic'},query:'needle',items:[],sections:[],indexing:true,coverage:{activeGeneration:null},recoveryEpoch:'initial'})});reader.reset({topicId:'topic',query:'needle'});await reader.initial();let status=0;
 globalThis.chrome={runtime:{sendMessage:()=>assert.fail('an incomplete index must not initialize editor metadata')}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',serial:1,topicReader:reader,originalPane:body,renderDocument:()=>assert.fail('incomplete query page cannot be painted'),updateTopicContinuous:()=>status++});assert.equal(await owner.renderTopicReader(),false);assert.equal(owner.editor,undefined);assert.equal(reader.indexing,true);assert.equal(reader.terminalNext,false);assert.equal(body.hidden,true);assert.equal(status,1);
}));
test('TOPIC-05.4 contextual Section destinations consume qualified projection identities and never supplement reader labels',()=>withDOM(async()=>{
 const calls=[],cache=new Map([['cached',section('cached',9,'Cached')]]),owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',topicReader:{sections:cache}});
 globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(message);assert.equal(message.type,'GET_LIBRARY_SECTION_PROJECTION');return {ok:true,data:{topic:{id:'topic'},items:message.options.cursor?[{id:'masked',topicId:'topic',title:'',revision:8,sourceUnavailable:true}]:[{id:'named',topicId:'topic',title:'Qualified name',revision:3}],nextCursor:message.options.cursor?null:'opaque-next'}};}}};
 const rows=await owner.topicSectionRows();assert.deepEqual(rows.map(row=>[row.sectionId,row.title,row.revision]),[['named','Qualified name',3],['masked','',8]]);assert.equal(cache.size,1);assert.deepEqual(calls.map(message=>message.options.cursor),[null,'opaque-next']);assert.ok(calls.every(message=>message.options.limit===100));
}));
test('TOPIC-05.4 Topic-note comparison reads two qualified baselines and keeps the existing canonical CAS edit',()=>withDOM(async({body,entryNode,get})=>{
 const calls=[],safe={id:'topic',name:'',summary:'',revision:2,recoveryEpoch:'initial',defaultSectionId:'default'},owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',originalPane:body,aiPane:get('ai-reading-body'),entryNode,onStatus(){},applyLayout(){},form:async()=>({decision:'mine'})});
 globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(structuredClone(message));if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA')return {ok:true,data:safe};if(message.type==='PAIA_RECOVERY_DRAFT_LOAD')return {ok:true,data:null};if(message.type==='EDIT_LIBRARY_TOPIC')return {ok:true,data:{revision:3}};if(message.type.startsWith('PAIA_RECOVERY_DRAFT_'))return {ok:true,data:true};throw Error('UNQUALIFIED_OR_UNEXPECTED '+message.type);}}};
 owner.renderDocument({kind:'section_reading',topic:safe,items:[],sections:[]});await Promise.all([owner.editor.entry.recoveryReady,...owner.editor.metadata.map(editor=>editor.recoveryReady)]);const metadata=owner.topicMetadata();metadata.local.summary='SYNTHETIC HUMAN DRAFT';get('topic-heading').querySelector('textarea').value=metadata.local.summary;metadata.conflicted=true;
 try{await owner.compareTopicNote();assert.equal(calls.filter(message=>message.type==='GET_LIBRARY_TOPIC_READING_METADATA').length,2);const edit=calls.find(message=>message.type==='EDIT_LIBRARY_TOPIC')?.edit;assert.ok(edit);assert.equal(edit.id,'topic');assert.equal(edit.expectedRevision,2);assert.deepEqual(edit.changes,{summary:'SYNTHETIC HUMAN DRAFT'});assert.equal(metadata.saved.summary,'SYNTHETIC HUMAN DRAFT');assert.equal(calls.some(message=>message.type==='GET_LIBRARY_TOPIC'),false);}finally{metadata.dispose();owner.editor.entry.dispose();}
}));

async function withQualifiedMetadata(run,{transport=null,awaitRecovery=true}={}){return withDOM(async({get})=>{
 const row={id:'topic',name:'SYNTHETIC GENERATED NAME',summary:'SYNTHETIC GENERATED SUMMARY',revision:2,recoveryEpoch:'initial',authority:'eligible-authority'},root=get('qualified-metadata'),name=new Node('h1'),summary=new Node('textarea'),calls=[],statuses=[];
 name.dataset.metaField='name';name.textContent=row.name;summary.dataset.metaField='summary';summary.value=row.summary;root.append(name,summary);
 globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(structuredClone(message));const result=await transport?.(message);if(result!==undefined)return result;if(message.type==='PAIA_RECOVERY_DRAFT_LOAD')return {ok:true,data:null};if(message.type.startsWith('PAIA_RECOVERY_DRAFT_'))return {ok:true,data:true};throw Error('UNEXPECTED '+message.type);}}};
 const editor=new MetadataEditor(root,{...row},'topic',(...status)=>statuses.push(status)),masked={...row,name:'',summary:'',authority:'filtered-authority'};
 try{if(awaitRecovery)await editor.recoveryReady;await run({editor,row,masked,root,name,summary,calls,statuses});}finally{await new Promise(resolve=>setImmediate(resolve));editor.dispose();}
});}
for(const reason of ['filtered','excluded'])test('TOPIC-05.4 same-revision '+reason+' qualification updates clean metadata without writes or focus replacement',()=>withQualifiedMetadata(async f=>{
 f.name.focus();const masked={...f.masked,authority:reason+'-authority'};assert.equal(f.editor.receiveQualified(masked,f.editor.beginQualifiedRead()),true);assert.equal(f.name.textContent,'');assert.equal(f.summary.value,'');assert.deepEqual(f.editor.saved,{name:'',summary:''});assert.equal(f.editor.row.revision,2);assert.equal(f.editor.recovery.epoch,'initial');assert.equal(f.editor.qualifiedAuthority,masked.authority);assert.equal(document.activeElement,f.name);assert.equal(f.editor.dirty(),false);await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(f.calls.map(message=>message.type),['PAIA_RECOVERY_DRAFT_LOAD']);
}));
for(const draft of ['SYNTHETIC HUMAN SUMMARY',''])test('TOPIC-05.4 partial dirty metadata keeps the exact draft and its save precondition under qualification '+JSON.stringify(draft),()=>withQualifiedMetadata(async f=>{
 f.editor.local.summary=draft;f.summary.value=draft;f.summary.focus();assert.equal(f.editor.receiveQualified(f.masked,f.editor.beginQualifiedRead()),true);assert.equal(f.name.textContent,'');assert.equal(f.summary.value,draft);assert.equal(f.editor.local.summary,draft);assert.equal(f.editor.saved.summary,f.row.summary);assert.equal(f.editor.dirty(),true);assert.equal(document.activeElement,f.summary);const edit=f.editor.buildEdit();assert.equal(edit.expectedRevision,2);assert.deepEqual(edit.changes,{summary:draft});assert.equal(f.calls.some(message=>message.type==='EDIT_LIBRARY_TOPIC'),false);
}));
test('TOPIC-05.4 qualified metadata waits for real composition end, then masks only untouched fields',()=>withQualifiedMetadata(async f=>{
 f.summary.focus();f.root.listeners.get('compositionstart')();f.summary.value='SYNTHETIC HUMAN IME';assert.equal(f.editor.receiveQualified(f.masked,f.editor.beginQualifiedRead()),true);assert.equal(f.name.textContent,f.row.name);assert.equal(f.summary.value,'SYNTHETIC HUMAN IME');assert.ok(f.editor.pendingQualification);f.root.listeners.get('compositionend')();assert.equal(f.name.textContent,'');assert.equal(f.summary.value,'SYNTHETIC HUMAN IME');assert.equal(f.editor.local.summary,'SYNTHETIC HUMAN IME');assert.equal(f.editor.saved.summary,f.row.summary);assert.equal(document.activeElement,f.summary);assert.equal(f.editor.pendingQualification,null);assert.equal(f.editor.row.revision,2);assert.equal(f.calls.some(message=>message.type==='EDIT_LIBRARY_TOPIC'),false);
}));
for(const success of [true,false])test('TOPIC-05.4 qualification waits for the real '+(success?'accepted':'failed')+' metadata save without rebasing its draft',async()=>{
 let started,release;const waiting=new Promise(resolve=>started=resolve),held=new Promise(resolve=>release=resolve);
 await withQualifiedMetadata(async f=>{
  f.editor.local.summary='SYNTHETIC HUMAN SAVE';f.summary.value=f.editor.local.summary;const saving=f.editor.flush();await waiting;f.editor.receiveQualified(f.masked,f.editor.beginQualifiedRead());assert.equal(f.name.textContent,f.row.name);assert.equal(f.editor.saving,true);release();assert.equal(await saving,success);assert.equal(f.summary.value,'SYNTHETIC HUMAN SAVE');
  if(success){assert.equal(f.editor.row.revision,3);assert.equal(f.editor.saved.summary,'SYNTHETIC HUMAN SAVE');assert.equal(f.editor.receiveQualified({...f.masked,revision:3,summary:'SYNTHETIC HUMAN SAVE',authority:'after-save-authority'},f.editor.beginQualifiedRead()),true);assert.equal(f.name.textContent,'');assert.equal(f.editor.row.revision,3);assert.equal(f.editor.dirty(),false);}
  else{assert.equal(f.editor.row.revision,2);assert.equal(f.editor.saved.summary,f.row.summary);assert.equal(f.editor.failed,true);assert.equal(f.name.textContent,'');assert.equal(f.editor.dirty(),true);}
  assert.equal(f.calls.filter(message=>message.type==='EDIT_LIBRARY_TOPIC').length,1);assert.equal(f.calls.find(message=>message.type==='EDIT_LIBRARY_TOPIC').edit.expectedRevision,2);
 },{transport:async message=>{if(message.type==='EDIT_LIBRARY_TOPIC'){started();await held;return success?{ok:true,data:{revision:3}}:{ok:false,error:'STORAGE_FAILED'};}}});
});
test('TOPIC-05.4 old qualified callbacks cannot restore masked labels; a later current read can unmask without a write',()=>withQualifiedMetadata(async f=>{
 const old=f.editor.beginQualifiedRead(),current=f.editor.beginQualifiedRead();assert.equal(f.editor.receiveQualified(f.masked,current),true);assert.equal(f.editor.receiveQualified(f.row,old),false);assert.equal(f.name.textContent,'');const restored={...f.row,authority:'later-eligible-authority'};assert.equal(f.editor.receiveQualified(restored,f.editor.beginQualifiedRead()),true);assert.equal(f.name.textContent,f.row.name);assert.equal(f.summary.value,f.row.summary);assert.equal(f.editor.row.revision,2);assert.equal(f.calls.some(message=>message.type==='EDIT_LIBRARY_TOPIC'),false);
}));
test('TOPIC-05.4 a restore epoch mismatch blocks the old metadata editor without rebinding or losing its human draft',()=>withQualifiedMetadata(async f=>{
 f.editor.local.summary='SYNTHETIC UNSAVED HUMAN';f.summary.value=f.editor.local.summary;f.summary.focus();assert.equal(f.editor.receiveQualified({...f.masked,recoveryEpoch:'restored'},f.editor.beginQualifiedRead()),false);assert.equal(f.editor.qualifiedEpochMismatch,true);assert.equal(f.editor.row.recoveryEpoch,'initial');assert.equal(f.editor.recovery.epoch,'initial');assert.equal(f.summary.value,'SYNTHETIC UNSAVED HUMAN');assert.equal(document.activeElement,f.summary);f.editor.failed=false;f.editor.conflicted=false;assert.equal(await f.editor.flush(),false);assert.equal(f.calls.some(message=>message.type==='EDIT_LIBRARY_TOPIC'),false);assert.equal(f.editor.receiveQualified(f.row,f.editor.beginQualifiedRead()),false,'later old-epoch callbacks cannot undo the restore fence');
}));
test('TOPIC-05.4 restore mismatch discovered during recovery load prevents the old operation from being replayed',async()=>{
 let release;const held=new Promise(resolve=>release=resolve);
 await withQualifiedMetadata(async f=>{
  f.editor.receiveQualified({...f.masked,recoveryEpoch:'restored'},f.editor.beginQualifiedRead());release({ok:true,data:{token:'old-operation',operation:{type:'EDIT_LIBRARY_TOPIC',edit:{id:'topic',expectedRevision:2,changes:{summary:'OLD RECOVERY DRAFT'},operationId:'old-operation'}}}});assert.equal(await f.editor.recoveryReady,false);assert.equal(f.calls.some(message=>message.type==='EDIT_LIBRARY_TOPIC'),false);assert.equal(f.editor.recovery.epoch,'initial');assert.equal(f.summary.value,f.row.summary);
 },{awaitRecovery:false,transport:message=>message.type==='PAIA_RECOVERY_DRAFT_LOAD'?held:undefined});
});
test('TOPIC-05.4 a metadata save acknowledgement arriving after restore mismatch cannot mark the old draft saved',async()=>{
 let started,release;const waiting=new Promise(resolve=>started=resolve),held=new Promise(resolve=>release=resolve);
 await withQualifiedMetadata(async f=>{
  f.editor.local.summary='SYNTHETIC PENDING HUMAN';f.summary.value=f.editor.local.summary;const saving=f.editor.flush();await waiting;f.editor.receiveQualified({...f.masked,recoveryEpoch:'restored'},f.editor.beginQualifiedRead());release();assert.equal(await saving,false);assert.equal(f.editor.row.revision,2);assert.equal(f.editor.saved.summary,f.row.summary);assert.equal(f.editor.local.summary,'SYNTHETIC PENDING HUMAN');assert.equal(f.editor.recovery.epoch,'initial');assert.equal(f.statuses.some(([text])=>text==='已保存到本机'),false);
 },{transport:async message=>{if(message.type==='EDIT_LIBRARY_TOPIC'){started();await held;return {ok:true,data:{revision:3}};}}});
});

for(const dirty of [false,true])test('TOPIC-05.4 actual controller reapplies same-revision qualified metadata to an existing '+(dirty?'partially dirty':'clean')+' editor',()=>withDOM(async({body,entryNode,get})=>{
 const f=readerFixture({count:1});await f.reader.initial();let authority='eligible',generation='generation-eligible',name='SYNTHETIC GENERATED',summary='SYNTHETIC GENERATED SUMMARY';
 const update=()=>{f.reader.coverage={activeGeneration:generation};f.reader.pageMeta={...f.reader.pageMeta,coverage:f.reader.coverage,authority,topic:{id:'topic',name,revision:2,defaultSectionId:'default'}};};update();
 const calls=[];globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(message);if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA')return {ok:true,data:{id:'topic',name,summary,revision:2,recoveryEpoch:'initial',defaultSectionId:'default',authority}};if(message.type==='GET_LIBRARY_SECTION_READING')return {ok:true,data:{coverage:{activeGeneration:generation},recoveryEpoch:'initial'}};if(message.type==='PAIA_RECOVERY_DRAFT_LOAD')return {ok:true,data:null};throw Error('UNEXPECTED '+message.type);}}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',serial:1,topicReader:f.reader,topicProviderKey:null,originalPane:body,aiPane:get('ai-reading-body'),entryNode,onStatus(){},applyLayout(){},observeTopicWindowSpacers(){},updateTopicContinuous(){}});
 try{await owner.renderTopicReader();const editor=owner.topicMetadata();await editor.recoveryReady;const title=get('topic-heading').querySelector('h1'),field=get('topic-heading').querySelector('textarea');if(dirty){editor.local.summary='SYNTHETIC HUMAN RETAINED';field.value=editor.local.summary;field.focus();}else title.focus();
  name='';summary='';authority='excluded';generation='generation-excluded';update();await owner.renderTopicReader();assert.equal(owner.topicMetadata(),editor);assert.equal(title.textContent,'');assert.equal(field.value,dirty?'SYNTHETIC HUMAN RETAINED':'');assert.equal(editor.row.revision,2);assert.equal(editor.qualifiedAuthority,'excluded');assert.equal(document.activeElement,dirty?field:title);assert.equal(calls.some(message=>message.type==='EDIT_LIBRARY_TOPIC'),false);
 }finally{owner.editor?.dispose();}
}));

test('TOPIC-05.4 restore mismatch during draft protection stops canonical metadata dispatch before it starts',async()=>{
 let started,release;const waiting=new Promise(resolve=>started=resolve),held=new Promise(resolve=>release=resolve);
 await withQualifiedMetadata(async f=>{
  f.editor.local.summary='SYNTHETIC PROTECTED HUMAN';f.summary.value=f.editor.local.summary;const saving=f.editor.flush();await waiting;f.editor.receiveQualified({...f.masked,recoveryEpoch:'restored'},f.editor.beginQualifiedRead());release();assert.equal(await saving,false);assert.equal(f.calls.some(message=>message.type==='EDIT_LIBRARY_TOPIC'),false);assert.equal(f.editor.local.summary,'SYNTHETIC PROTECTED HUMAN');assert.equal(f.editor.recovery.epoch,'initial');
 },{transport:async message=>{if(message.type==='PAIA_RECOVERY_DRAFT_SAVE'){started();await held;return {ok:true,data:true};}}});
});

// Exercise the current controller/reader RPC path separately from the retained
// legacy document-DTO anchor regression. Only the transport and browser DOM are
// synthetic; navigation, paging, qualification and rendering are production.
function rootSectionRouteFixture({body,entryNode,get},{empty=false,hold=null}={}){
 const topic={id:'topic',name:'Topic',summary:'SYNTHETIC summary',revision:2,organizationRevision:1,activeLayoutGeneration:1,defaultSectionId:'default',recoveryEpoch:'initial',authority:'qualified-root'};
 const named={...section('named',1,'Named'),id:'named',lifecycle:'active'},rows=empty?[]:[item(1,'named')];
 const data={...page([named],rows),topic,recoveryEpoch:'initial',authority:'qualified-root',coverage:{activeGeneration:'qualified-root'},nextCursor:null,previousCursor:null};
 get('topic-body').append(body);get('thought-panel').hidden=false;get('library-unplaced-list').hidden=true;
 document.querySelectorAll=selector=>document.body.querySelectorAll(selector);
 const calls=[],statuses=[];let release,reading=0;
 globalThis.chrome={runtime:{sendMessage:message=>{
  calls.push(message);let result,stage;
  if(message.type==='GET_LIBRARY_SECTION_PROJECTION'){result={topic,items:[named],nextCursor:null};stage='root qualification';}
  else if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA'){result=topic;stage='metadata';}
  else if(message.type==='GET_LIBRARY_SECTION_READING'){result=data;stage=++reading===1?'initial reading':'authority recheck';}
  else throw Error('Unexpected current Section RPC '+message.type);
  const response={ok:true,data:structuredClone(result)};
  return stage===hold?new Promise(resolve=>{release=()=>resolve(response);}):Promise.resolve(response);
 }}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',serial:1,statusEpoch:0,openIntent:0,rootCueEpoch:0,readingSort:'asc',topicProviderKey:null,originalPane:body,aiPane:get('ai-reading-body'),homePositions:new Map(),entryNode,onStatus:text=>statuses.push(text),async open(){return ++this.openIntent;},ensurePanes(){},checkAllTracked:async()=>true,applyLayout(){},renderSectionNav(){},observeTopicWindowSpacers(){},updateTopicContinuous(){},invalidateTimeline(){},clearHomeRows(){},editor:{collect(){},async flush(){return true;},dirty(){return false;},metadata:[],entry:{protectedIds:()=>new Set(),addRows(){},releaseRows(){},receive(){}}}});
 return {owner,calls,statuses,data,release:()=>release?.(),held:()=>!!release};
}
for(const empty of [false,true])test(`TOPIC-05.4 current Root RPC path retains ${empty?'empty':'nonempty'} Section heading and canonical nodes through repeated qualified redraw`,()=>withDOM(async env=>{
 const f=rootSectionRouteFixture(env,{empty});await f.owner.openRootTarget('topic','named');const heading=env.body.querySelector('h2'),entry=env.body.querySelector('[data-entry-id]');
 assert.ok(heading);assert.equal(heading.textContent,'Named');assert.equal(document.activeElement,heading);assert.equal(f.owner.document.kind,'section_reading');assert.equal(f.calls.some(call=>call.type==='GET_LIBRARY_SECTION_READING'&&call.options.sectionId==='named'),true);
 const before=entry?.textContent;
 for(let i=0;i<3;i++){assert.equal(await f.owner.renderTopicReader(),true);assert.equal(env.body.querySelector('h2'),heading);assert.equal(document.activeElement,heading);assert.equal(env.body.querySelectorAll('h2').length,1);assert.equal(env.body.querySelector('[data-entry-id]'),entry);assert.equal(entry?.textContent,before);}
 assert.deepEqual(f.statuses,[]);assert.equal(f.calls.some(call=>call.type==='TOPIC_DOCUMENT_PAGE'),false);assert.equal(env.body.querySelector('.topic-root-section-anchor'),null);
}));
for(const hold of ['root qualification','initial reading','metadata','authority recheck'])for(const cause of ['purge','AI navigation'])test(`TOPIC-05.4 current Root ${hold} cannot paint or focus after ${cause}`,()=>withDOM(async env=>{
 const f=rootSectionRouteFixture(env,{hold}),pending=f.owner.openRootTarget('topic','named');
 for(let i=0;i<100&&!f.held();i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(f.held(),true);
 if(cause==='purge')f.owner.invalidateHomeSnapshot({cause:'PURGE_SOURCE'});else{f.owner.view='ai';f.owner.openIntent++;}
 const focused=document.activeElement;f.release();await pending;
 assert.equal(env.body.querySelector('h2'),null);assert.equal(env.body.querySelector('[data-entry-id]'),null);assert.equal(document.activeElement,focused);
 if(cause==='purge'&&hold!=='root qualification'){assert.equal(f.owner.topicReader.stale,true);assert.equal(f.owner.topicReader.sections.size,0);assert.equal(f.owner.topicReader.pageMeta,null);assert.equal(f.owner.topicReader.items.some(row=>typeof row.entry?.body==='string'),false);}
}));
