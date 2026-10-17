import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {LibraryEntryEditor} from '../ui/library-entry-editor.js';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';
import {PresentationNode,presentationText} from './harness/presentation-dom.mjs';
class Node extends PresentationNode {
 constructor(tag){super(tag);this.style={removeProperty(name){delete this[name];}};}
 focus(options){this.focusOptions=options;document.activeElement=this;}
 matches(selector){return selector.split(',').some(part=>{part=part.trim();const cls=[...part.matchAll(/\.([\w-]+)/g)].map(x=>x[1]),data=[...part.matchAll(/\[data-([\w-]+)(?:="([^"]*)")?\]/g)];return cls.every(name=>this.classList.contains(name))&&data.every(([,key,value])=>{key=key.replace(/-([a-z])/g,(_,x)=>x.toUpperCase());return key in this.dataset&&(value===undefined||this.dataset[key]===value);})&&(!/^[a-z]/i.test(part)||this.tagName===part.match(/^[\w-]+/)[0].toUpperCase());});}
 querySelectorAll(selector){return this.children.flatMap(node=>[...(node.matches(selector)?[node]:[]),...node.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 before(node){this.parentElement.insertBefore(node,this);}
 scrollIntoView(){this.scrolled=true;}
 getBoundingClientRect(){return {top:140,bottom:320,height:180};}
}

const op=()=>crypto.randomUUID();
async function fixture({empty=false}={}){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();await s.setFilterMode('off');
 const topic=await s.createTopic({name:'SYNTHETIC Topic',operationId:op()}),created=await s.createSection({topicId:topic.id,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,title:'SYNTHETIC qualified named Section',operationId:op()});
 const sectionId=created.sectionId,key=JSON.stringify([topic.id,1,sectionId]);let entry=null;
 if(!empty){entry=await s.continueThinking({topicId:topic.id,body:'SYNTHETIC canonical expression',operationId:op()});const path=(await s.entryPaths(entry.id))[0];await s.placeEntry({topicId:topic.id,sectionId,entryId:entry.id,expectedEntryRevision:entry.revision,expectedPlacementRevision:path.placement.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:op()});entry=await s.entry(entry.id);}
 const other=await s.createTopic({name:'SYNTHETIC other Topic',operationId:op()}),model=new ThoughtLibraryReadModel(s),reading=new ThoughtSectionReading(model);
 const keys=['requestAnimationFrame','document','chrome','scrollY','innerHeight','getSelection'],prior=Object.fromEntries(keys.map(k=>[k,globalThis[k]])),pins=new Set(),nodes=new Map();
 const body=new Node('body'),pane=new Node('div'),panel=new Node('div'),heading=new Node('div'),unplaced=new Node('div'),sentinel=new Node('div'),collection=new Node('div'),list=new Node('div');pane.id='original-reading-body';panel.hidden=false;unplaced.hidden=true;unplaced.append(sentinel);collection.append(list);body.append(pane,heading,panel,collection);
 for(const [id,node]of Object.entries({'topic-body':pane,'topic-heading':heading,'thought-panel':panel,'thought-collection':collection,'thought-list':list,'library-unplaced-list':unplaced,'unplaced-continuous-sentinel':sentinel}))nodes.set(id,node);
 globalThis.document={body,documentElement:{lang:'en'},activeElement:null,querySelectorAll:selector=>body.querySelectorAll(selector),createElement:tag=>new Node(tag),createTextNode:presentationText,getElementById:id=>{if(!nodes.has(id))nodes.set(id,new Node('div'));return nodes.get(id);}};
 globalThis.requestAnimationFrame=callback=>callback();globalThis.scrollY=0;globalThis.innerHeight=1000;globalThis.getSelection=()=>null;
 const calls=[],statuses=[];let hold=null,release=null,override=null;
 globalThis.chrome={runtime:{sendMessage:async message=>{
  calls.push(structuredClone(message));let data;
  try{if(message.type==='GET_LIBRARY_SECTION_PROJECTION')data=await model.sectionPage(message.options);else if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA')data=await model.topicReadingMetadata({id:message.id});else if(message.type==='GET_LIBRARY_SECTION_READING')data=override?await override(message):await reading.page(message.options);else throw Error('Unexpected original qualified RPC '+message.type);}
  catch(error){return {ok:false,error:error.code||'UNAVAILABLE'};}
  const response={ok:true,data:structuredClone(data)};
  if(hold?.type===message.type&&++hold.seen===hold.at){hold=null;return new Promise(resolve=>release=()=>{release=null;resolve(response);});}return response;
 }}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:topic.id,activeSectionId:sectionId,openIntent:0,serial:1,statusEpoch:1,view:'original',readingSort:'asc',topicProviderKey:null,originalMode:'content',originalPane:pane,aiPane:new Node('div'),homePositions:new Map(),editor:{collect(){},async flush(){return true;},dirty(){return false;},metadata:[],entry:{protectedIds:()=>pins,addRows(){},releaseRows(){},receive(){}}},onStatus:text=>statuses.push(text),async open(id){this.openCount=(this.openCount||0)+1;this.id=id;return ++this.openIntent;},ensurePanes(){},checkAllTracked:async()=>true,rememberContent(){},restoreContent(){},applyLayout(){},renderSectionNav(){},renderSectionActions(){},observeTopicWindowSpacers(){},updateTopicContinuous(){},invalidateTimeline(){},clearHomeRows(){},entryNode(item){const node=new Node('div');node.dataset.entryId=item.entry.id;const field=new Node('p');field.textContent=item.entry.body;field.dataset.entryField='body';node.append(field);return node;}});
 // This fixture uses the original manual Section page, with an explicit
 // selected scope. No legacy Topic document or isolated heading fallback.
 owner.createTopicReader=function({anchorId=null,sectionId:anchorSection=null}={}){const reader=new ContinuousTopicReader({pins:()=>pins,load:async options=>(await chrome.runtime.sendMessage({type:'GET_LIBRARY_SECTION_READING',options})).data});reader.reset({topicId:this.id,scopeSectionId:this.activeSectionId,sort:'asc',query:'',anchorId,sectionId:anchorSection});return reader;};
 const mutate=async patch=>s.foundationWrite(async t=>{const row=await t.get('sections',key);await patch(row,t);if(row)await t.put('sections',row);const epoch=await t.get('meta','thought-epoch');await t.put('meta',{id:'thought-epoch',value:(epoch?.value||0)+1});});
 return {s,model,reading,topic,other,sectionId,key,entry,owner,pane,panel,body,pins,calls,statuses,mutate,hold(type,at=1){hold={type,at,seen:0};},held:()=>!!release,release:()=>release?.(),override:fn=>override=fn,async open(){await owner.openRootTarget(topic.id,sectionId);},async restore(){await s.repository.close();for(const k of keys)if(prior[k]===undefined)delete globalThis[k];else globalThis[k]=prior[k];}};
}
const chapter=f=>f.pane.querySelector('.topic-section'),heading=f=>chapter(f)?.querySelector('h2');
// This fixture intentionally stubs directory paint. Its label oracle is the
// actual qualified Section DTO, never a replacement or fabricated heading.
const qualifiedSection=f=>f.owner.document?.sections.find(row=>row.sectionId===f.sectionId);
async function waitHeld(f){for(let i=0;i<100&&!f.held();i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(f.held(),true);}

test('TOPIC-05.3 actual selected Section chapter and canonical editor survive repeated qualified redraw',async()=>{
 const f=await fixture();try{await f.open();const node=chapter(f),section=structuredClone(qualifiedSection(f)),canonical=f.pane.querySelector('[data-entry-id]'),before=canonical.textContent,body=structuredClone(await f.s.entry(f.entry.id));assert.ok(node);assert.equal(section.title,'SYNTHETIC qualified named Section');assert.equal(heading(f),null,'selected prose does not repeat its qualified Section label');assert.equal(document.activeElement,node);assert.equal(node.dataset.sectionId,f.sectionId);assert.equal(f.owner.topicReader.scopeSectionId,f.sectionId);assert.equal(f.owner.document.kind,'section_reading');assert.equal(f.pane.querySelector('.topic-root-section-anchor'),null);
 for(let i=0;i<3;i++){assert.equal(await f.owner.renderTopicReader(),true);assert.equal(chapter(f),node);assert.equal(heading(f),null);assert.deepEqual(qualifiedSection(f),section);assert.equal(f.pane.querySelector('[data-entry-id]'),canonical);assert.equal(canonical.parentElement,node);assert.equal(canonical.textContent,before);assert.equal(document.activeElement,node);assert.deepEqual(await f.s.entry(f.entry.id),body);}
 assert.equal(f.calls.some(call=>call.type==='TOPIC_DOCUMENT_PAGE'),false);assert.equal(f.calls.some(call=>call.type==='GET_LIBRARY_SECTION_READING'&&call.options.scopeSectionId===f.sectionId),true);
 }finally{await f.restore();}
});
const mutations={
 'changed title':async f=>{const row=await f.s.repository.transaction(false,t=>t.get('sections',f.key));await f.s.editSection({topicId:f.topic.id,sectionId:f.sectionId,expectedRevision:row.revision,title:'SYNTHETIC current changed title',operationId:op()});},
 'removed Section':f=>f.mutate(row=>row.lifecycle='removed'),
 'foreign Topic':f=>f.mutate(row=>row.topicId=f.other.id),
 'different layout':f=>f.mutate(row=>row.layoutGeneration=2),
 'changed revision':f=>f.mutate(row=>row.revision++),
 'newer navigation intent':async f=>{f.owner.openIntent++;},
 'unqualified source':f=>f.mutate(row=>{row.sourceRecordIds=['SYNTHETIC missing Source'];row.protections.title.locked=false;}),
 'removed lifecycle':f=>f.mutate(row=>row.lifecycle='removed'),
 'redirected Section':f=>f.mutate(row=>row.redirectTo='SYNTHETIC redirect'),
 'foreign reader page':async f=>{const foreign=await f.reading.page({topicId:f.other.id,scopeSectionId:f.other.sectionId});f.override(async()=>foreign);}
};
for(const [name,mutate]of Object.entries(mutations))test('TOPIC-05.3 qualified Section redraw refuses '+name+' without replacing canonical work',async()=>{
 const f=await fixture();try{await f.open();const node=chapter(f),title=heading(f),canonical=f.pane.querySelector('[data-entry-id]'),before=structuredClone(await f.s.entry(f.entry.id));f.hold('GET_LIBRARY_TOPIC_READING_METADATA');const pending=f.owner.renderTopicReader();await waitHeld(f);await mutate(f);f.release();let accepted,error;try{accepted=await pending;}catch(cause){error=cause;accepted=false;}if(error)assert.ok(['TOPIC_READING_CHANGED','TOPIC_METADATA_CHANGED','UNAVAILABLE','TOPIC_READ_UNAVAILABLE'].includes(error.code||error.message),'only the original qualified read may refuse: '+String(error.code||error.message));if(name!=='newer navigation intent')assert.ok(f.calls.some(call=>call.type==='GET_LIBRARY_SECTION_READING'&&typeof call.options.expectedReadGeneration==='string'),'the real final generation fence is exercised');assert.notEqual(accepted,true,'stale qualification cannot publish a chapter');assert.equal(chapter(f),node);assert.equal(heading(f),title);assert.equal(f.pane.querySelector('[data-entry-id]'),canonical);assert.equal(node.dataset.sectionId,f.sectionId);assert.equal(f.pane.querySelectorAll('.topic-section').length,1);assert.equal(f.pane.querySelector('.topic-root-section-anchor'),null);assert.equal(canonical.textContent,before.body);assert.deepEqual(await f.s.entry(f.entry.id),before);
 }finally{await f.restore();}
});

test('TOPIC-05.3 human-protected Section title remains qualified after actual missing Source qualification',async()=>{const f=await fixture();try{await f.open();await f.mutate(row=>row.sourceRecordIds=['SYNTHETIC removed Source']);await f.owner.resetTopicReader({sectionId:f.sectionId});const qualified=qualifiedSection(f);assert.equal(qualified.sourceUnavailable,true);assert.equal(qualified.titleProtected,true);assert.equal(qualified.title,'SYNTHETIC qualified named Section');assert.equal(chapter(f).dataset.sectionId,f.sectionId);assert.equal(heading(f),null);assert.equal(f.pane.querySelector('.topic-root-section-anchor'),null);assert.equal((await f.s.entry(f.entry.id)).body,f.entry.body);}finally{await f.restore();}});
test('TOPIC-05.3 genuinely empty selected Section stays reachable without invented Entry',async()=>{const f=await fixture({empty:true});try{await f.open();const node=chapter(f),section=structuredClone(qualifiedSection(f));assert.ok(node);assert.equal(section.title,'SYNTHETIC qualified named Section');assert.equal(heading(f),null);assert.equal(node.dataset.sectionId,f.sectionId);assert.equal(document.activeElement,node);assert.equal(f.pane.querySelector('[data-entry-id]'),null);assert.equal(await f.owner.renderTopicReader(),true);assert.equal(chapter(f),node);assert.equal(heading(f),null);assert.deepEqual(qualifiedSection(f),section);assert.equal(document.activeElement,node);}finally{await f.restore();}});
test('TOPIC-05.3 clean body eviction retains only the real scoped empty chapter, never a weak fallback',async()=>{const f=await fixture();try{await f.open();const node=chapter(f),title=heading(f),reader=f.owner.topicReader;reader.items=[];reader.index.clear();reader.bodyRevision++;assert.equal(await f.owner.renderTopicReader(),true);assert.equal(chapter(f),node);assert.equal(heading(f),title);assert.equal(f.pane.querySelector('[data-entry-id]'),null);assert.equal(f.pane.querySelector('.topic-root-section-anchor'),null);}finally{await f.restore();}});
test('TOPIC-05.3 pinned canonical editor remains inside its real selected Section chapter outside the clean window',async()=>{const f=await fixture();try{await f.open();const node=chapter(f),title=heading(f),canonical=f.pane.querySelector('[data-entry-id]'),reader=f.owner.topicReader;f.pins.add(f.entry.id);reader.items=[];reader.index.clear();reader.bodyRevision++;assert.equal(await f.owner.renderTopicReader(),true);assert.equal(chapter(f),node);assert.equal(heading(f),title);assert.equal(f.pane.querySelector('[data-entry-id]'),canonical);assert.equal(canonical.parentElement,node);assert.equal(canonical.isConnected,true);assert.equal(canonical.textContent,f.entry.body);assert.equal(f.pane.querySelector('.topic-root-section-anchor'),null);}finally{await f.restore();}});
for(const stage of ['initial qualification','target projection'])test('TOPIC-05.3 purge invalidation fences held '+stage+' against stale navigation or chapter revival',async()=>{const f=await fixture();try{if(stage==='initial qualification')f.owner.id=null;f.hold('GET_LIBRARY_SECTION_PROJECTION',stage==='initial qualification'?1:2);const pending=f.open();await waitHeld(f);f.owner.invalidateHomeSnapshot({cause:'PURGE_SOURCE'});const focused=document.activeElement;f.release();await pending;assert.equal(chapter(f),null);assert.equal(f.pane.querySelector('[data-entry-id]'),null);assert.equal(document.activeElement,focused);if(stage==='initial qualification')assert.equal(f.owner.openCount||0,0);}finally{await f.restore();}});
test('TOPIC-05.3 held selected Section target cannot mount after changing to saved AI reading',async()=>{const f=await fixture();try{f.hold('GET_LIBRARY_SECTION_PROJECTION',2);const pending=f.open();await waitHeld(f);f.owner.view='ai';const focused=document.activeElement;f.release();await pending;assert.equal(chapter(f),null);assert.equal(f.pane.querySelector('[data-entry-id]'),null);assert.equal(document.activeElement,focused);}finally{await f.restore();}});

for(const timing of ['before navigation','during final qualification'])test('TOPIC-05.3 native body selection '+timing+' cannot carry a sibling canonical node into another selected Section',async()=>{
 const f=await fixture();try{await f.open();const canonical=f.pane.querySelector('[data-entry-id]'),node=chapter(f),previousReader=f.owner.topicReader,previousDocument=f.owner.document,saved={body:f.entry.body},entryOwner={root:f.pane,collect(){},entries:new Map([[f.entry.id,{saved,local:structuredClone(saved)}]]),recoveries:new Map()};f.owner.editor.entry.protectedIds=()=>LibraryEntryEditor.prototype.protectedIds.call(entryOwner);let selected=timing==='before navigation';globalThis.getSelection=()=>selected?{rangeCount:1,isCollapsed:false,getRangeAt:()=>({intersectsNode:current=>current===canonical})}:null;document.activeElement=new Node('button');
 if(timing==='during final qualification')f.hold('GET_LIBRARY_TOPIC_READING_METADATA');const pending=f.owner.navigateTopicSection(f.topic.sectionId);if(timing==='during final qualification'){await waitHeld(f);selected=true;f.release();}assert.equal(await pending,false,'another Section cannot publish while its sibling canonical field is protected');assert.equal(f.owner.topicProtectedIds().has(f.entry.id),true,'the original Entry editor still qualifies the held native selection');assert.equal(f.owner.activeSectionId,f.sectionId);assert.equal(f.owner.topicReader,previousReader);assert.equal(f.owner.document,previousDocument);assert.equal(chapter(f),node);assert.equal(f.pane.querySelectorAll('.topic-section').length,1);assert.equal(f.pane.querySelector('[data-entry-id]'),canonical);assert.equal(canonical.textContent,f.entry.body);assert.equal(document.activeElement.tagName,'BUTTON','a refused scope switch cannot steal focus');assert.equal((await f.s.entry(f.entry.id)).body,f.entry.body);
 }finally{f.release();await f.restore();}
});
