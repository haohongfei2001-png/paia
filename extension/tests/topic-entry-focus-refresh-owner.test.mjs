import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';
import {renderTopicSectionProse} from '../ui/topic-section-prose.js';
import {PresentationNode} from './harness/presentation-dom.mjs';

class Node extends PresentationNode{
 constructor(tag='div'){super(tag);this.style={};this.scrolls=0;}
 querySelectorAll(selector){const rows=this.children.flatMap(node=>[node,...node.querySelectorAll('*')]);if(selector==='*')return rows;if(selector.startsWith('.'))return rows.filter(node=>node.classList.contains(selector.slice(1)));if(selector.startsWith('[data-')){const [,raw,value]=selector.match(/^\[data-([^=\]]+)(?:="([^"]*)")?\]$/)||[],key=raw?.replace(/-([a-z])/g,(_,x)=>x.toUpperCase());return rows.filter(node=>key in node.dataset&&(value===undefined||node.dataset[key]===value));}return rows.filter(node=>node.tagName===selector.toUpperCase());}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 scrollIntoView(){this.scrolls++;}
 getBoundingClientRect(){return {top:140,bottom:180,height:40};}
}

// Keep actual focusEntry, refresh/refreshOnce, reset/publication, continuous
// reader and retained prose. Only transport, refresh input and layout are fake.
async function withFocusRefresh(run,{pending=true,holdAt=null,preparationPending=false,actualPipeline=false,exhaustPreparation=false,targetLarge=true}={}){
 const names=['chrome','document','scrollY','requestAnimationFrame'],prior=new Map(names.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const body=new Node('body'),host=new Node(),pane=new Node(),heading=new Node();host.append(pane);body.append(host,heading);
 const nodes=new Map([['topic-body',host],['thought-document',host],['topic-heading',heading]]);
 for(const id of ['thought-home-tools','thought-collection','revision-history','ai-topic-tools','ai-revision-history','topic-source-scope-label','topic-source-scope','topic-time-order','topic-search-count','topic-toolbar'])nodes.set(id,new Node());
 globalThis.document={body,activeElement:body,createElement:tag=>new Node(tag),getElementById:id=>nodes.get(id)};globalThis.scrollY=0;globalThis.requestAnimationFrame=()=>0;
 let release,arrived,reads=0,placements=0,flushes=0,oldRefresh;const gate=new Promise(resolve=>release=resolve),entered=new Promise(resolve=>arrived=resolve),paints=[];
 let releaseQualification,arrivedQualification;const qualificationGate=new Promise(resolve=>releaseQualification=resolve),qualificationEntered=new Promise(resolve=>arrivedQualification=resolve);
 const holdQualification=async()=>{arrivedQualification();await qualificationGate;};
 const topic={id:'topic',name:'SYNTHETIC qualified Topic',summary:'',revision:1,recoveryEpoch:'epoch',authority:'authority'};
 const item=id=>({entry:{id,revision:1,...(id==='target'&&targetLarge?{large:true}:{body:'SYNTHETIC '+id+' expression'})},placement:{topicId:'topic',sectionId:'section',revision:1}});
 const page=id=>({kind:'section_reading',scopeSectionId:'section',topic,authority:'authority',recoveryEpoch:'epoch',coverage:{activeGeneration:'generation'},sections:[{sectionId:'section',topicId:'topic',title:'Section',revision:1}],items:[item(id)],previousCursor:null,nextCursor:null,indexing:false});
 const metadata={beginQualifiedRead(){return this.qualifiedReadToken=Symbol();},receiveQualified(_row,token){return token===this.qualifiedReadToken;}};
 globalThis.chrome={runtime:{sendMessage:async message=>{
  if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA')return {ok:true,data:topic};
  if(message.type==='GET_LIBRARY_PLACEMENT'){placements++;if(holdAt==='placement')await holdQualification();return {ok:true,data:{sectionId:'section'}};}
  assert.equal(message.type,'GET_LIBRARY_SECTION_READING');if(holdAt==='Section qualification'&&message.options.anchorId==='target')await holdQualification();return {ok:true,data:page(message.options.anchorId||'target')};
 }}};
 const owner=Object.assign(Object.create(TopicController.prototype),{
  id:'topic',activeSectionId:'section',serial:1,statusEpoch:1,statusReadSerial:0,openIntent:1,rootCueEpoch:0,view:'original',originalMode:'content',originalPane:pane,readRetry:{hidden:true},
  topicMetadata:()=>metadata,topicContinuousVisible:()=>true,topicProtectedIds(){return this.editor?.composing?new Set([this.editor.protectedId||'target']):new Set();},
  flushEditors:async()=>{flushes++;return true;},checkAllTracked:async()=>true,topicSectionRows:async()=>{if(holdAt==='Section directory')await holdQualification();return [{sectionId:'section'}];},
  rememberContent(){},updateTopicContinuous(){},refreshTopicStamps(){},observeTopicWindowSpacers(){},loadRemainingTopicSections(){},queueOptionalStatus(){},onStatus(){},readFailure(){throw Error('SYNTHETIC_UNEXPECTED_READ_FAILURE');},
  renderDocument(received){paints.push(received.items.map(row=>row.entry.id));renderTopicSectionProse({body:pane,page:received,pins:this.topicProtectedIds(),entryNode:({entry})=>{const node=new Node('article');node.dataset.entryId=entry.id;const control=new Node(entry.large?'button':'div');if(entry.large)control.textContent='读取完整内容';else{control.dataset.entryField='body';control.textContent=entry.body;}node.append(control);return node;}});},
  async readRefresh(){const navigationAnchor=this.topicNavigationAnchor,anchorId=navigationAnchor?.entryId||null;this.topicNavigationAnchor=null;const state=await this.resetTopicReader({anchorId,sectionId:this.activeSectionId,prepareInitial:navigationAnchor?.prepareInitial===true});return !state.stale&&!state.paintRefused;},
  createTopicReader({anchorId,sectionId}){const reader=new ContinuousTopicReader({load:async()=>{
   reads++;if(pending&&reads===2){arrived();await gate;}if(holdAt==='explicit preparation'&&reads===4&&anchorId==='target')await holdQualification();if(preparationPending&&(reads===2||anchorId==='target'&&(reads===3||exhaustPreparation&&reads>=3)))return {...page('unknown'),indexing:true,items:[],sections:[],nextCursor:'original-index-continuation-'+reads};return page(anchorId||'unknown');
  }});reader.reset({topicId:'topic',scopeSectionId:'section',anchorId,sectionId});return reader;}
 });
 if(actualPipeline){owner.readRefresh=TopicController.prototype.readRefresh;Object.assign(owner,{aiPane:new Node(),syncOriginalTabs(){},syncReadingControls(){},updateTopicSourceOptions:async()=>{},updateTopicSearchCount(){},renderAITopicStatus(){}});}
 const target=()=>pane.querySelectorAll('[data-entry-id]').find(node=>node.dataset.entryId==='target');
 try{
  assert.equal((await owner.resetTopicReader({anchorId:'target',sectionId:'section'})).paintRefused,false);const original=target();
  if(pending){oldRefresh=owner.refresh();await entered;assert.equal(target(),original);assert.ok(owner.refreshRun?.promise);}
  if(preparationPending){if(actualPipeline)owner.topicResetFromStart=true;await owner.refresh();assert.equal(owner.refreshRun,null);assert.equal(owner.topicReader.indexing,true);assert.equal(owner.topicReader.items.length,0);assert.equal(target(),original);}
  return await run({owner,pane,target,original,release,oldRefresh,paints,qualificationEntered,releaseQualification,counts:()=>({reads,placements,flushes})});
 }finally{release();releaseQualification();await oldRefresh;for(const [key,descriptor]of prior)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
}

test('mounted exact Entry waits for the original refresh before deciding whether its target must be requalified',()=>withFocusRefresh(async f=>{
 let settled=false;const focus=f.owner.focusEntry('target').then(value=>{settled=true;return value;});await Promise.resolve();const settledBeforeRefresh=settled;
 f.release();await f.oldRefresh;assert.equal(await focus,true);
 assert.deepEqual({settledBeforeRefresh,mountedTarget:!!f.target(),readerIds:f.owner.topicReader.items.map(row=>row.entry.id)},{settledBeforeRefresh:false,mountedTarget:true,readerIds:['target']},'an existing DOM row cannot establish arrival while its original refresh can still replace it');
 assert.ok(f.target(),'the exact requested large Entry remains reachable after the old refresh settles');assert.equal(f.target().querySelector('button').textContent,'读取完整内容');
 assert.deepEqual(f.counts(),{reads:3,placements:1,flushes:1});assert.deepEqual(f.paints,[['target'],['unknown'],['target']]);
}));

test('route retirement during the refresh wait cannot reopen or focus the old exact Entry',()=>withFocusRefresh(async f=>{
 const focus=f.owner.focusEntry('target');f.owner.openIntent++;f.release();await f.oldRefresh;assert.equal(await focus,false);
 assert.equal(f.counts().placements,0);assert.equal(f.counts().flushes,0);assert.equal(f.original.scrolls,0);
}));

test('IME beginning during the refresh wait preserves the same native target and never starts an exact re-read',()=>withFocusRefresh(async f=>{
 const focus=f.owner.focusEntry('target'),editor={composing:true};f.owner.editor=editor;f.release();await f.oldRefresh;assert.equal(await focus,false);
 assert.equal(f.owner.editor,editor);assert.equal(f.target(),f.original);assert.equal(f.counts().placements,0);assert.equal(f.counts().flushes,0);assert.equal(f.original.scrolls,0);
}));

test('without a pending refresh the existing exact Entry keeps its node and requires no reopen or write',()=>withFocusRefresh(async f=>{
 assert.equal(await f.owner.focusEntry('target'),true);assert.equal(f.target(),f.original);assert.equal(f.original.scrolls,1);assert.deepEqual(f.counts(),{reads:1,placements:0,flushes:0});
},{pending:false}));

test('a newer explicit Entry focus owns the shared refresh wait without replaying the older target',()=>withFocusRefresh(async f=>{
 const older=f.owner.focusEntry('target'),newer=f.owner.focusEntry('unknown');f.release();await f.oldRefresh;
 assert.equal(await older,false);assert.equal(await newer,true);assert.equal(f.target(),undefined);assert.equal(f.original.scrolls,0);
 assert.equal(f.pane.querySelectorAll('[data-entry-id]').find(node=>node.dataset.entryId==='unknown').scrolls,1);assert.deepEqual(f.counts(),{reads:2,placements:0,flushes:0});
}));

test('a newer Section intent retires the old Entry focus while its original refresh is held',()=>withFocusRefresh(async f=>{
 const focus=f.owner.focusEntry('target');f.owner.sectionIntent=(f.owner.sectionIntent||0)+1;f.release();await f.oldRefresh;
 assert.equal(await focus,false);assert.equal(f.original.scrolls,0);assert.deepEqual(f.counts(),{reads:2,placements:0,flushes:0});
}));

test('a rejected original refresh owner cannot turn retained DOM into a successful Entry arrival',()=>withFocusRefresh(async f=>{
 f.owner.refreshOnce=async()=>{throw Error('SYNTHETIC_REFRESH_OWNER_REJECTED');};
 const refresh=f.owner.refresh().catch(error=>error),focus=f.owner.focusEntry('target');
 assert.match(String(await refresh),/SYNTHETIC_REFRESH_OWNER_REJECTED/);assert.equal(await focus,false);assert.equal(f.target(),f.original);assert.equal(f.original.scrolls,0);assert.deepEqual(f.counts(),{reads:1,placements:0,flushes:0});
},{pending:false}));

for(const stage of ['placement','Section qualification','Section directory'])test('IME starting during exact '+stage+' after the old refresh cannot reopen the requested Entry',()=>withFocusRefresh(async f=>{
 const focus=f.owner.focusEntry('target');f.release();await f.oldRefresh;await f.qualificationEntered;
 const native=f.pane.querySelectorAll('[data-entry-id]').find(node=>node.dataset.entryId==='unknown'),field=native.querySelector('[data-entry-field="body"]');field.textContent='SYNTHETIC IME 未完成';field.focus();const editor={composing:true,protectedId:'unknown'};f.owner.editor=editor;
 f.releaseQualification();const result=await focus;
 assert.deepEqual({result,mountedTarget:!!f.target(),reads:f.counts().reads},{result:false,mountedTarget:false,reads:2},'a focus still awaiting its exact placement must defer to the newly composing native field');
 assert.equal(f.owner.editor,editor);assert.equal(f.pane.querySelectorAll('[data-entry-id]').find(node=>node.dataset.entryId==='unknown'),native);assert.equal(field.textContent,'SYNTHETIC IME 未完成');assert.equal(document.activeElement,field);
 assert.equal(f.target(),undefined);assert.deepEqual(f.counts(),{reads:2,placements:1,flushes:1});
},{holdAt:stage}));

test('retained target cannot establish arrival after refresh ends while its original reader still prepares an index',()=>withFocusRefresh(async f=>{
 assert.equal(f.original.isConnected,true);assert.equal(f.original.querySelector('button').textContent,'读取完整内容');
 const result=await f.owner.focusEntry('target');
 const atArrival={result,indexing:f.owner.topicReader.indexing,readerIds:f.owner.topicReader.items.map(row=>row.entry.id),mountedTarget:!!f.target()};
 // Exercise the same original continuous action that the 250ms owner schedules,
 // without substituting wall-clock polling or creating another reader owner.
 await f.owner.loadTopicContinuous('next');
 assert.deepEqual({atArrival,afterContinuation:{readerIds:f.owner.topicReader.items.map(row=>row.entry.id),mountedTarget:!!f.target()}},{atArrival:{result:true,indexing:false,readerIds:['target'],mountedTarget:true},afterContinuation:{readerIds:['target'],mountedTarget:true}},'only a qualified settled exact target may complete focus; an old retained large-row button grants no reader authority');
},{pending:false,preparationPending:true}));

test('actual refresh pipeline prepares the explicit target then admits only its qualified editable snapshot',()=>withFocusRefresh(async f=>{
 assert.equal(await f.owner.focusEntry('target'),true);assert.deepEqual(f.owner.topicReader.items.map(row=>row.entry.id),['target']);assert.equal(f.owner.topicReader.indexing,false);assert.equal(f.target(),f.original);
 assert.equal(f.owner.snapshotKey,f.owner.readKey());assert.equal(Object.hasOwn(f.owner.topicReader,'initialAdmission'),false);assert.equal(document.getElementById('topic-body').inert,false);assert.equal(f.owner.refreshRun,null);assert.equal(f.owner.topicNavigationAnchor,null);assert.deepEqual(f.counts(),{reads:4,placements:1,flushes:1});
},{pending:false,preparationPending:true,actualPipeline:true}));

test('actual explicit preparation keeps its original native composing field when IME begins inside the continuation await',()=>withFocusRefresh(async f=>{
 const focus=f.owner.focusEntry('target');await f.qualificationEntered;const field=f.original.querySelector('[data-entry-field="body"]');field.textContent='SYNTHETIC native IME draft';field.focus();const editor={composing:true};f.owner.editor=editor;
 f.releaseQualification();assert.equal(await focus,false);assert.equal(f.owner.editor,editor);assert.equal(f.target(),f.original);assert.equal(field.textContent,'SYNTHETIC native IME draft');assert.equal(document.activeElement,field);assert.deepEqual(f.paints,[['target']]);assert.notEqual(f.owner.snapshotKey,f.owner.readKey());
},{pending:false,preparationPending:true,actualPipeline:true,targetLarge:false,holdAt:'explicit preparation'}));

test('actual explicit target budget exhaustion retains the prior DOM without publishing or admitting a pending reader',()=>withFocusRefresh(async f=>{
 assert.equal(await f.owner.focusEntry('target'),false);assert.equal(f.owner.topicReader.indexing,true);assert.equal(f.owner.topicReader.items.length,0);assert.equal(f.target(),f.original);assert.equal(f.original.scrolls,0);assert.deepEqual(f.paints,[['target']]);assert.notEqual(f.owner.snapshotKey,f.owner.readKey());assert.equal(f.counts().reads,23,'one initial paint, old pending read, exact initial read, then the unchanged20 original continuations');assert.equal(f.owner.refreshRun,null);
},{pending:false,preparationPending:true,actualPipeline:true,exhaustPreparation:true}));
