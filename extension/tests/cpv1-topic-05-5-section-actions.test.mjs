import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {renderTopicSectionProse} from '../ui/topic-section-prose.js';
import {PresentationNode} from './harness/presentation-dom.mjs';
class Node extends PresentationNode {
 querySelectorAll(selector){const all=this.children.flatMap(n=>[n,...n.querySelectorAll('*')]);return selector==='*'?all:all.filter(n=>selector[0]==='.'?n.classList.contains(selector.slice(1)):selector[0]==='['?false:n.tagName===selector.toUpperCase());}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
const section={sectionId:'named',topicId:'topic',revision:3,layoutGeneration:2,title:'SYNTHETIC chapter',rank:'000000001024'};
async function fixture(run){
 const prior=new Map(['document','chrome'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)])),body=new Node('body'),calls=[],writes=[],focus=[];
 globalThis.document={body,documentElement:{lang:'zh'},createElement:tag=>new Node(tag),createElementNS:(_,tag)=>new Node(tag),querySelectorAll:()=>[],getElementById:()=>null};
 const w=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',openIntent:7,presentationIntent:4,editor:{composing:false},flushEditors:async()=>true,topicSectionRows:async()=>[{...section}],form:async()=>({title:'Renamed'}),mutate:async run=>{await run();return true;},checked:async(type,value)=>{writes.push({type,...value});return {jobId:'job'};},waitLayout:async id=>{assert.equal(id,'job');},focusSection:async id=>focus.push(id)});
 globalThis.chrome={runtime:{sendMessage:async request=>{calls.push(request);return {ok:true,data:request.type==='GET_LIBRARY_TOPIC'?{id:'topic',organizationRevision:11}:{id:'adjacent'}};}}};
 try{await run({w,body,calls,writes,focus});}finally{for(const [key,value]of prior)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
}
test('05.5 named and empty Section menus retain native controls and updated identities; default has no heading/menu',()=>fixture(async({w,body})=>{
 const named={...section},empty={...section,sectionId:'empty',title:'Empty',rank:'000000002048'},defaultRow={...section,sectionId:'default',isDefault:true,title:'',rank:'000000000000'};
 const page={topic:{id:'topic',defaultSectionId:'default'},sections:[defaultRow,named,empty],items:[]};
 const render=()=>renderTopicSectionProse({body,page,entryNode:()=>{throw Error('no body expected');},sectionActions:(header,row)=>w.renderSectionActions(header,row)});
 render();assert.equal(body.children.length,2);assert.equal(body.querySelectorAll('h2').length,2);assert.equal(body.querySelectorAll('details').length,2);
 const menu=body.querySelector('details'),summary=menu.querySelector('summary');assert.equal(summary.getAttribute('aria-label'),'章节操作');assert.equal(summary.getAttribute('role'),'button');assert.deepEqual(menu.querySelectorAll('button').map(n=>n.textContent),['重命名','向上移动','向下移动']);
 summary.focus();named.revision=4;named.title='New label';render();assert.equal(body.querySelector('details'),menu);assert.equal(document.activeElement,summary);assert.equal(menu.parentElement.sectionActionRow.revision,4);assert.equal(body.querySelector('h2').textContent,'New label');
 menu.open=true;let prevented=false;menu.listeners.get('keydown')({key:'Escape',preventDefault(){prevented=true;},stopPropagation(){}});assert.equal(menu.open,false);assert.equal(prevented,true);assert.equal(document.activeElement,summary);
}));
test('05.5 rename sends only title with exact stable identity and expected revision',()=>fixture(async({w,writes,focus})=>{await w.sectionContextAction(section,'rename');assert.equal(writes.length,1);assert.deepEqual(Object.keys(writes[0].edit).sort(),['expectedRevision','operationId','sectionId','title','topicId']);assert.equal(writes[0].type,'EDIT_LIBRARY_SECTION');assert.equal(writes[0].edit.sectionId,'named');assert.equal(writes[0].edit.expectedRevision,3);assert.equal(writes[0].edit.title,'Renamed');assert.deepEqual(focus,['named']);assert.equal(w.sectionActionPending,false);}));
for(const action of ['up','down'])test('05.5 '+action+' uses current adjacency and organization CAS',()=>fixture(async({w,calls,writes})=>{await w.sectionContextAction(section,action);assert.equal(writes.length,1);assert.equal(writes[0].type,'START_LIBRARY_LAYOUT');assert.equal(writes[0].layout.expectedTopicRevision,11);assert.equal(writes[0].layout.sectionId,'named');assert.equal(writes[0].layout.targetSectionId,'adjacent');assert.ok(calls.filter(r=>r.type==='GET_LIBRARY_TOPIC_ADJACENCY').every(r=>r.options.direction===action));}));
for(const mode of ['IME','unsaved','cancel','default','route','intent','view','stale','removed','generation','storage'])test('05.5 refuses '+mode+' without mutation',()=>fixture(async({w,writes,focus})=>{
 let row=section;
 if(mode==='IME')w.editor.composing=true;
 if(mode==='unsaved')w.flushEditors=async()=>false;
 if(mode==='cancel')w.form=async()=>null;
 if(mode==='default')row={...section,isDefault:true};
 if(['route','intent','view'].includes(mode))w.form=async()=>{if(mode==='route')w.id='other';if(mode==='intent')w.openIntent++;if(mode==='view')w.view='ai';return {title:'Rename'};};
 if(mode==='stale')w.topicSectionRows=async()=>[{...section,revision:4}];
 if(mode==='generation')w.topicSectionRows=async()=>[{...section,layoutGeneration:3}];
 if(mode==='removed')w.topicSectionRows=async()=>[];
 if(mode==='storage')w.topicSectionRows=async()=>{throw Error('STORAGE_FAILED');};
 if(['stale','removed','generation','storage'].includes(mode))await assert.rejects(w.sectionContextAction(row,'rename'));else await w.sectionContextAction(row,'rename');
 assert.deepEqual(writes,[]);assert.deepEqual(focus,[]);assert.notEqual(w.sectionActionPending,true);
}));
test('05.5 held read ignores round-trip route intent and duplicate activation',()=>fixture(async({w,writes})=>{
 let release;w.topicSectionRows=()=>new Promise(resolve=>release=resolve);const pending=w.sectionContextAction(section,'rename');await Promise.resolve();assert.equal(typeof release,'function');await w.sectionContextAction(section,'down');w.openIntent++;release([{...section}]);await assert.rejects(pending,/ROUTE_CHANGED/);assert.deepEqual(writes,[]);assert.equal(w.sectionActionPending,false);
}));
test('05.5 revalidates after leave/save before a rename is dispatched',()=>fixture(async({w,writes})=>{let read=0;w.topicSectionRows=async()=>[{...section,revision:++read===1?3:4}];await assert.rejects(w.sectionContextAction(section,'rename'),/SECTION_CHANGED/);assert.deepEqual(writes,[]);}));
