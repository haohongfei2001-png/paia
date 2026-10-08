import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';
import {PresentationNode,presentationText} from './harness/presentation-dom.mjs';
class Node extends PresentationNode {
 matches(selector){return selector.split(',').some(part=>{part=part.trim();const cls=[...part.matchAll(/\.([\w-]+)/g)].map(x=>x[1]),data=[...part.matchAll(/\[data-([\w-]+)(?:="([^"]*)")?\]/g)];return cls.every(name=>this.classList.contains(name))&&data.every(([,key,value])=>{key=key.replace(/-([a-z])/g,(_,x)=>x.toUpperCase());return key in this.dataset&&(value===undefined||this.dataset[key]===value);})&&(!/^[a-z]/i.test(part)||this.tagName===part.match(/^[\w-]+/)[0].toUpperCase());});}
 querySelectorAll(selector){return this.children.flatMap(node=>[...(node.matches(selector)?[node]:[]),...node.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 before(node){this.parentElement.insertBefore(node,this);}
 scrollIntoView(){this.scrolled=true;}
 getBoundingClientRect(){return {top:140,bottom:320,height:180};}
}

function fixture(){
 const keys=['document','chrome','scrollY','innerHeight','getSelection'],prior=Object.fromEntries(keys.map(key=>[key,globalThis[key]])),pins=new Set();
const unplaced=new Node('div'),sentinel=new Node('div'),collection=new Node('div'),list=new Node('div');unplaced.hidden=true;unplaced.append(sentinel);collection.append(list);
const body=new Node('body'),pane=new Node('div'),heading=new Node('div'),panel=new Node('div'),search=new Node('input');pane.id='original-reading-body';panel.hidden=false;body.append(pane,heading,panel,search,collection);
globalThis.document={body,documentElement:{lang:'en'},activeElement:null,querySelectorAll:selector=>body.querySelectorAll(selector),createElement:tag=>new Node(tag),createTextNode:presentationText,getElementById:id=>({'thought-panel':panel,'thought-collection':collection,'thought-list':list,'topic-body':pane,'topic-heading':heading,'topic-search':search,'thought-search':search,'library-unplaced-list':unplaced,'unplaced-continuous-sentinel':sentinel}[id]||null)};
globalThis.scrollY=0;globalThis.innerHeight=1000;globalThis.getSelection=()=>null;
const section={id:'SYNTHETIC-section',sectionId:'SYNTHETIC-section',topicId:'SYNTHETIC-topic',title:'SYNTHETIC qualified named Section',lifecycle:'active',revision:1,layoutGeneration:1,sourceUnavailable:false,titleProtected:true,protections:{title:{locked:true}}},entry={id:'SYNTHETIC-entry',revision:1,body:'SYNTHETIC canonical expression',expressionTime:{at:'2026-10-07T00:00:00Z'}};
const page={topic:{id:section.topicId,name:'SYNTHETIC Topic',activeLayoutGeneration:1},sections:[section],items:[{entry,placement:{sectionId:section.id}}],nextCursor:null,previousCursor:null,sectionCursor:null,coverage:{activeGeneration:'SYNTHETIC-generation'}};
const rpc=[];globalThis.chrome={runtime:{sendMessage:async message=>{rpc.push(message.type);if(message.type==='GET_LIBRARY_SECTION_PROJECTION')return {ok:true,data:{topic:page.topic,items:[section]}};if(message.type==='TOPIC_DOCUMENT_PAGE')return {ok:true,data:page};throw Error('Unexpected fixture RPC '+message.type);}}};
const owner=Object.assign(Object.create(TopicController.prototype),{id:section.topicId,openIntent:0,serial:1,statusEpoch:1,view:'original',readingSort:'asc',originalMode:'content',originalPane:pane,aiPane:new Node('div'),editor:{collect(){},async flush(){return true;},dirty(){return false;},metadata:[],entry:{protectedIds:()=>pins,addRows(){},releaseRows(){},receive(){}}},onStatus(){},open:async function(id){this.openCount=(this.openCount||0)+1;this.id=id;return ++this.openIntent;},ensurePanes(){},checkAllTracked:async()=>true,applyLayout(){},renderSectionNav(){},observeTopicWindowSpacers(){},updateTopicContinuous(){},entryNode(item){const node=new Node('div');node.dataset.entryId=item.entry.id;const field=new Node('p');field.textContent=item.entry.body;field.dataset.entryField='body';node.append(field);return node;}});

 // Retain the legacy DTO/redraw regression while TOPIC-05.4 independently
 // exercises the qualified Section-reading RPC and its genuine headings.
 // This fixture intentionally supplies the old document boundary: every
 // existing retention, invalidation, purge and canonical-node assertion stays.
 owner.createTopicReader=function({anchorId=null,sectionId=null}={}){
  const reader=new ContinuousTopicReader({pins:()=>pins,load:async options=>{
   const response=await chrome.runtime.sendMessage({type:'TOPIC_DOCUMENT_PAGE',options});return response.data;
  }});reader.reset({topicId:this.id,sort:'asc',query:'',anchorId,sectionId});return reader;
 };
 Object.assign(owner,{homePositions:new Map(),homeCollection:null,invalidateTimeline(){},clearHomeRows(){}});
 return {owner,page,section,entry,pane,panel,search,body,pins,restore(){for(const key of keys)if(prior[key]===undefined)delete globalThis[key];else globalThis[key]=prior[key];}};
}

test('TOPIC-05.3 qualified Section anchor and canonical editor node survive actual repeated reader redraw',async()=>{
 const f=fixture();try{await f.owner.openRootTarget(f.section.topicId,f.section.id);const anchor=f.pane.querySelector('.topic-root-section-anchor'),canonical=f.pane.querySelector('[data-entry-id]'),before=canonical.textContent,body=JSON.stringify(f.entry);assert.ok(anchor);assert.equal(document.activeElement,anchor.querySelector('h2'));
 for(let i=0;i<3;i++){await f.owner.renderTopicReader();assert.equal(f.pane.querySelector('.topic-root-section-anchor'),anchor);assert.equal(f.pane.querySelector('[data-entry-id]'),canonical);assert.equal(anchor.nextSibling,canonical);assert.equal(anchor.isConnected,true);assert.equal(canonical.textContent,before);assert.equal(document.activeElement,anchor.querySelector('h2'));assert.equal(JSON.stringify(f.entry),body);}
 }finally{f.restore();}
});
const mutations={
 'changed title':f=>f.section.title='SYNTHETIC current changed title','removed Section':f=>f.page.sections=[],
 'foreign Topic':f=>f.section.topicId='SYNTHETIC other Topic','different layout':f=>f.section.layoutGeneration=2,
 'changed revision':f=>f.section.revision++,'newer navigation intent':f=>f.owner.openIntent++,
 'unqualified source':f=>{f.section.sourceUnavailable=true;f.section.protections.title.locked=false;},
 'removed lifecycle':f=>f.section.lifecycle='removed','redirected Section':f=>f.section.redirectTo='SYNTHETIC redirect',
 'foreign reader page':f=>f.page.topic.id='SYNTHETIC other page'
};
for(const [name,mutate]of Object.entries(mutations))test('TOPIC-05.3 retained Section anchor refuses '+name,async()=>{const f=fixture();try{await f.owner.openRootTarget(f.section.topicId,f.section.id);const canonical=f.pane.querySelector('[data-entry-id]');mutate(f);f.owner.renderDocument(f.page);assert.equal(f.pane.querySelector('.topic-root-section-anchor'),null);assert.equal(f.pane.querySelector('[data-entry-id]'),canonical);}finally{f.restore();}});
test('TOPIC-05.3 independently human-protected Section title remains lawful after source loss',async()=>{const f=fixture();try{await f.owner.openRootTarget(f.section.topicId,f.section.id);const anchor=f.pane.querySelector('.topic-root-section-anchor');f.section.sourceUnavailable=true;f.owner.renderDocument(f.page);assert.equal(f.pane.querySelector('.topic-root-section-anchor'),anchor);}finally{f.restore();}});
test('TOPIC-05.3 existing direct-body empty Section remains reachable without invented Entry',async()=>{const f=fixture();try{f.page.items=[];await f.owner.openRootTarget(f.section.topicId,f.section.id);const anchor=f.pane.querySelector('.topic-root-section-anchor');assert.ok(anchor);assert.equal(anchor.parentElement,f.pane);await f.owner.renderTopicReader();assert.equal(f.pane.querySelector('.topic-root-section-anchor'),anchor);assert.equal(f.pane.querySelector('[data-entry-id]'),null);}finally{f.restore();}});
test('TOPIC-05.3 window eviction never fabricates a formerly nested Section chapter',async()=>{const f=fixture();try{await f.owner.openRootTarget(f.section.topicId,f.section.id);const anchor=f.pane.querySelector('.topic-root-section-anchor');assert.notEqual(anchor.parentElement,f.pane);f.page.items=[];f.owner.renderDocument(f.page);assert.equal(f.pane.querySelector('.topic-root-section-anchor'),null);}finally{f.restore();}});
test('TOPIC-05.3 protected canonical editor keeps its existing qualified Section anchor outside ordinary window',async()=>{const f=fixture();try{await f.owner.openRootTarget(f.section.topicId,f.section.id);const anchor=f.pane.querySelector('.topic-root-section-anchor'),canonical=f.pane.querySelector('[data-entry-id]');f.pins.add(f.entry.id);f.page.items=[];f.owner.renderDocument(f.page);assert.equal(f.pane.querySelector('.topic-root-section-anchor'),anchor);assert.equal(anchor.nextSibling,canonical);assert.equal(canonical.isConnected,true);}finally{f.restore();}});
for(const stage of ['initial qualification','target projection'])test('TOPIC-05.3 actual purge invalidation fences held '+stage+' against stale navigation or anchor revival',async()=>{const f=fixture();try{let finish,reads=0;const send=chrome.runtime.sendMessage;chrome.runtime.sendMessage=message=>message.type==='GET_LIBRARY_SECTION_PROJECTION'&&++reads===(stage==='initial qualification'?1:2)?new Promise(resolve=>finish=resolve):send(message);if(stage==='initial qualification')f.owner.id=null;const pending=f.owner.openRootTarget(f.section.topicId,f.section.id);for(let i=0;i<100&&!finish;i++)await new Promise(resolve=>setImmediate(resolve));assert.ok(finish);f.owner.invalidateHomeSnapshot({cause:'PURGE_SOURCE'});finish({ok:true,data:{topic:f.page.topic,items:[f.section]}});await pending;assert.equal(f.pane.querySelector('.topic-root-section-anchor'),null);if(stage==='initial qualification')assert.equal(f.owner.openCount||0,0);}finally{f.restore();}});
test('TOPIC-05.3 held Section target cannot mount after changing to saved AI reading',async()=>{const f=fixture();try{let finish,reads=0;const send=chrome.runtime.sendMessage;chrome.runtime.sendMessage=message=>message.type==='GET_LIBRARY_SECTION_PROJECTION'&&++reads===2?new Promise(resolve=>finish=resolve):send(message);const pending=f.owner.openRootTarget(f.section.topicId,f.section.id);for(let i=0;i<100&&!finish;i++)await new Promise(resolve=>setImmediate(resolve));assert.ok(finish);f.owner.view='ai';finish({ok:true,data:{topic:f.page.topic,items:[f.section]}});await pending;assert.equal(f.pane.querySelector('.topic-root-section-anchor'),null);}finally{f.restore();}});
