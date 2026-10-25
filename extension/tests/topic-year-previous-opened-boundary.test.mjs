import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';
import {TopicController} from '../ui/topic-workspace.js';
import {TopicWorkspacePresentation} from '../ui/topic-workspace-presentation.js';
import {PresentationNode} from './harness/presentation-dom.mjs';

const op=()=>crypto.randomUUID();
class Node extends PresentationNode{
 get parentNode(){return this.parentElement;}
 querySelectorAll(selector){const rows=this.children.flatMap(node=>[node,...node.querySelectorAll('*')]);return selector==='*'?rows:selector.startsWith('.')?rows.filter(node=>node.classList.contains(selector.slice(1))):selector.startsWith('#')?rows.filter(node=>node.id===selector.slice(1)):rows.filter(node=>node.tagName===selector.toUpperCase());}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 before(node){this.parentElement?.insertBefore(node,this);}
 after(node){this.parentElement?.insertBefore(node,this.nextSibling);}
}
async function fixture(){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();await s.setFilterMode('off');
 const topic=await s.createTopic({name:'SYNTHETIC original opened-year boundary',operationId:op()});
 s.clock=()=> '2026-01-01T12:00:00.000Z';
 const known=await s.continueThinking({operationId:op(),topicId:topic.id,body:'SYNTHETIC actual2026 canonical body'});
 s.clock=()=> '2019-01-01T12:00:00.000Z';
 const unknown=await s.continueThinking({operationId:op(),topicId:topic.id,body:'SYNTHETIC actual undated canonical body'});
 // A genuine legacy expression has no independent-expression receipt. Its
 // creation timestamp must not substitute for qualified expression time.
 await s.foundationWrite(async t=>{for(const receipt of await t.all('operationReceipts'))if(receipt.ownerId===unknown.id){delete receipt.result.independentExpression;await t.put('operationReceipts',receipt);}});
 const service=new ThoughtSectionReading(new ThoughtLibraryReadModel(s)),calls=[];
 const makeReader=(anchorId=null)=>{const reader=new ContinuousTopicReader({chunk:1,windowChunks:1,maxReferences:1,load:async options=>{calls.push(structuredClone(options));return service.page({...options,limit:1});}});reader.reset({topicId:topic.id,scopeSectionId:topic.sectionId,chronology:'expression',sort:'desc',anchorId});return reader;};
 const ready=async reader=>{await reader.initial();for(let n=0;reader.indexing&&n<20;n++)await reader.next();assert.equal(reader.indexing,false);assert.equal(reader.stale,false);assert.equal(reader.errorNext,null);};
 return {s,topic,known,unknown,calls,makeReader,ready,close:()=>s.repository.close()};
}
async function restoredUnknown(f){
 const original=f.makeReader();await f.ready(original);while(!original.terminalNext)await original.next();
 assert.deepEqual(original.openedYears,[2026]);assert.equal(original.nextYear,'unknown');
 await original.openNextYear();while(!original.terminalNext)await original.next();
 assert.deepEqual(original.openedYears,[2026,'unknown']);assert.deepEqual(original.items.map(item=>item.entry.id),[f.unknown.id]);
 assert.equal(original.items[0].entry.body,(await f.s.entry(f.unknown.id)).body);
 const saved=original.snapshot({id:f.unknown.id,top:140});assert.doesNotMatch(JSON.stringify(saved),/canonical body/);
 const reader=f.makeReader(f.unknown.id);assert.equal(reader.restore(saved),true);assert.equal(await reader.hydrateWindow(),true);
 assert.deepEqual(reader.openedYears,[2026,'unknown']);assert.equal(reader.items[0].readingYear,'unknown');assert.equal(reader.previousCursor,null);assert.equal(reader.terminalPrevious,true,'the raw per-year cursor boundary remains terminal');
 return reader;
}
function present(f,reader,run){
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document'),body=new Node('body'),nodes=new Map(),make=(id,tag='div',className='')=>{const node=new Node(tag);node.id=id;node.className=className;nodes.set(id,node);return node;};
 const root=make('thought-document','article'),title=make('title-row','div','topic-title-row'),presentation=make('topic-presentation'),toolbar=make('topic-toolbar'),menu=make('topic-menu'),menuList=make('menu-list','div','library-action-list'),history=make('history-tools','div','library-history-tools'),tabs=make('topic-original-tabs'),controls=make('topic-reading-controls'),order=make('topic-time-order'),outline=make('topic-outline','details'),prose=make('topic-body'),revision=make('revision-history','button');
 body.append(root,revision);title.append(presentation);toolbar.append(menu,history);menu.append(menuList);controls.append(order);
 for(const edge of ['before','after']){const node=make('topic-continuous-'+edge);node.append(make('topic-continuous-'+edge+'-status','span'),make('topic-continuous-'+edge+'-retry','button'));}
 const before=nodes.get('topic-continuous-before'),after=nodes.get('topic-continuous-after');root.append(title,toolbar,tabs,controls,outline,before,prose,after);
 globalThis.document={body,activeElement:body,documentElement:{lang:'zh-CN'},createElement:tag=>new Node(tag),querySelector:selector=>body.querySelector(selector),getElementById:id=>nodes.get(id)||null,addEventListener(){},removeEventListener(){}};
 const owner={id:f.topic.id,view:'original',sectionDirectory:[...reader.sections.values()],topicReader:reader,topicNextYear:make('topic-next-year','button'),topicContinuousVisible:()=>true,updateTopicSearchCount(){},mountSectionEndWriter:async()=>{}};
 const view=new TopicWorkspacePresentation(owner);owner.desktopPresentation=view;
 try{TopicController.prototype.updateTopicContinuous.call(owner);return run({before,status:nodes.get('topic-continuous-before-status'),view,owner});}
 finally{view.dispose();clearTimeout(owner.topicContinuousTimer);if(prior)Object.defineProperty(globalThis,'document',prior);else delete globalThis.document;}
}

test('restored undated-only extent exposes the already-opened earlier year through actual state and presentation',async()=>{
 const f=await fixture();try{const reader=await restoredUnknown(f),count=f.calls.length;
  present(f,reader,({before,status})=>{assert.equal(reader.state().terminalPrevious,false,'an earlier opened year is not the global Topic beginning');assert.equal(before.hidden,false,'the real presentation must expose the original previous control');assert.equal(before.dataset.terminal,'false');assert.doesNotMatch(status.textContent,/已到主题开头/);});
  assert.equal(f.calls.length,count,'presenting the boundary does not read or open a year');
 }finally{await f.close();}
});

test('the original previous method reads the exact already-opened year after body-free restore',async()=>{
 const f=await fixture();try{const reader=await restoredUnknown(f),start=f.calls.length,unknownBefore=await f.s.entry(f.unknown.id),knownBefore=await f.s.entry(f.known.id);
  await reader.previous();assert.equal(reader.stale,false);assert.equal(reader.errorPrevious,null);assert.equal(reader.items[0].entry.id,f.known.id);assert.equal(reader.items[0].entry.body,knownBefore.body);assert.deepEqual(reader.openedYears,[2026,'unknown']);
  const calls=f.calls.slice(start);assert.ok(calls.length>0);assert.ok(calls.every(call=>call.year===2026&&call.direction==='prev'&&call.scopeSectionId===f.topic.sectionId&&call.chronology==='expression'));assert.equal(reader.terminalPrevious,true);assert.equal(reader.state().terminalPrevious,true,'the first actual opened year is the global boundary');
  assert.deepEqual(await f.s.entry(f.unknown.id),unknownBefore);assert.deepEqual(await f.s.entry(f.known.id),knownBefore);
 }finally{await f.close();}
});

test('a fresh undated anchor does not expose or read a year that was never opened',async()=>{
 const f=await fixture();try{const reader=f.makeReader(f.unknown.id);await f.ready(reader);for(let n=0;!reader.terminalPrevious&&n<20;n++)await reader.previous();assert.deepEqual(reader.openedYears,['unknown']);assert.equal(reader.terminalPrevious,true);const start=f.calls.length;
  present(f,reader,({before})=>{assert.equal(reader.state().terminalPrevious,true);assert.equal(before.hidden,true);assert.equal(before.dataset.terminal,'true');});
  await reader.previous();assert.equal(f.calls.length,start);assert.deepEqual(reader.items.map(item=>item.entry.id),[f.unknown.id]);assert.deepEqual(reader.openedYears,['unknown']);
 }finally{await f.close();}
});
