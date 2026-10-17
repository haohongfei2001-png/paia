import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {withTopicActions,tick} from './harness/topic-action-dom.mjs';
function descendants(root){return root.children.flatMap(node=>[node,...descendants(node)]);}
async function fixture(run){return withTopicActions(async f=>{
 f.owner.close(true);const pane=document.createElement('div'),host=document.createElement('section'),aiPane=document.createElement('div'),heading=document.createElement('div');host.className='topic-section';host.dataset.sectionId='default';host.querySelector=()=>null;host.scrollIntoView=()=>{};pane.append(host);document.body.append(pane,aiPane,heading);
 pane.querySelectorAll=selector=>descendants(pane).filter(node=>selector==='.topic-section'?node.classList.contains('topic-section'):selector==='[data-entry-id]'?!!node.dataset.entryId:false);
 const readers=nextYear=>({state:()=>({initialized:true,terminalNext:true,nextYear,stale:false,indexing:false,errorNext:null,loadingNext:false,loadingPrevious:false})}),oldReader=readers(null),newReader=readers(2021),nodes={'library-dialog':f.owner.dialog,'topic-body':pane,'topic-heading':heading};document.getElementById=id=>nodes[id]??null;
 const editor={collect(){},flush:async()=>true,dirty:()=>false,dispose(){}},owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',originalMode:'content',activeSectionId:'default',openIntent:1,serial:1,statusEpoch:0,statusReadSerial:0,rootCueEpoch:0,presentationIntent:0,actions:f.owner,editor,originalPane:pane,aiPane,topicReader:oldReader,readRetry:document.createElement('button'),homePositions:new Map(),topicSectionRows:async()=>[{sectionId:'default'},{sectionId:'named'}],checkAllTracked:async()=>true,crossSectionProtected:()=>false,rememberContent(){},restoreContent(){this.contentResume=null;},renderSectionNav(){},rememberView(){},topicAnchor:()=>null,cancelTopicRestore(){},onStatus(){},resetTopicReader:async({sectionId,beforePaint})=>{const page={scopeSectionId:sectionId,items:[],sections:[{sectionId}]};assert.equal(beforePaint(page),true);const next=document.createElement('section');next.className='topic-section';next.dataset.sectionId=sectionId;next.querySelector=()=>null;next.scrollIntoView=()=>{};pane.replaceChildren(next);owner.topicReader=newReader;owner.document=page;return {stale:false,errorNext:null};}});
 await owner.mountSectionEndWriter();const writer=owner.sectionEndWriter;assert.ok(writer);writer.field.matches=()=>false;Object.defineProperty(writer.field,'innerText',{get:()=>writer.field.textContent});assert.equal(writer.hasDraft(),false);assert.equal(writer.field.isConnected,true);assert.equal(f.rpcCalls.length,0);
 try{return await run({...f,owner,writer,oldReader,newReader,pane,host});}finally{owner.sectionEndWriter?.dispose();writer.dispose();}
});}
test('successful selected-Section switch retires its old blank native writer so Back can leave a nonfinal annual Section',()=>fixture(async f=>{
 assert.equal(await f.owner.navigateTopicSection('named'),true);assert.equal(f.owner.activeSectionId,'named');assert.equal(f.owner.topicReader,f.newReader);assert.equal(f.pane.children.length,1);assert.equal(f.pane.firstElementChild.dataset.sectionId,'named');assert.equal(f.writer.field.isConnected,false);assert.equal(f.writer.hasDraft(),false);
 await f.owner.mountSectionEndWriter();assert.equal(await f.owner.leaveEditors(),true,'the old detached/scope-retired blank writer must not block the real Back leave owner');assert.equal(f.owner.sectionEndWriter,null);assert.equal(f.rpcCalls.length,0,'retiring a blank writer creates no Entry, placement, receipt or grant');
}));
test('a composing native Section writer refuses switching while preserving its exact field and original scope',()=>fixture(async f=>{
 f.writer.field.listeners.get('compositionstart')();f.writer.field.textContent='SYNTHETIC 未完成 👩🏽‍💻\n\n';assert.equal(await f.owner.navigateTopicSection('named'),false);assert.equal(f.owner.activeSectionId,'default');assert.equal(f.owner.topicReader,f.oldReader);assert.equal(f.owner.sectionEndWriter,f.writer);assert.equal(f.writer.field.isConnected,true);assert.equal(f.writer.field.textContent,'SYNTHETIC 未完成 👩🏽‍💻\n\n');assert.equal(await f.owner.leaveEditors(),false);assert.equal(f.rpcCalls.length,0);
}));

for(const state of ['dirty','whitespace','empty IME','pending ACK','unknown ACK'])test('detached '+state+' native writer keeps its real owner before ineligible replacement mount',()=>fixture(async f=>{
 const field=f.writer.field,surface=f.owner.actions.surface;let pending=null;
 if(state==='empty IME')field.listeners.get('compositionstart')();
 else{field.textContent=state==='whitespace'?' \n':'SYNTHETIC '+state+' exact 👩🏽‍💻\n\n';field.listeners.get('input')({isTrusted:true});}
 if(state==='pending ACK'||state==='unknown ACK'){pending=f.writer.flush();await tick();assert.equal(f.calls.length,1);if(state==='unknown ACK'){await f.respond({ok:false,error:'MESSAGE_CHANNEL_INTERRUPTED'});assert.equal(await pending,false);pending=null;}field.textContent='';}
 const beforeText=field.textContent,requests=f.rpcCalls.length;assert.equal(f.writer.hasDraft(),true,'the original draft owner protects more than nonblank text');f.host.remove();f.owner.activeSectionId='named';f.owner.topicReader=f.newReader;assert.equal(field.isConnected,false);
 await f.owner.mountSectionEndWriter();assert.equal(f.owner.sectionEndWriter,f.writer);assert.equal(f.owner.actions.surface,surface);assert.equal(f.owner.actions.draft,field);assert.equal(field.textContent,beforeText);assert.equal(field.listeners.has('compositionstart'),true);assert.equal(f.rpcCalls.length,requests,'retirement performs no forced flush, retry or new creation');assert.equal(f.writer.hasDraft(),true);assert.equal(await f.owner.leaveEditors(),false,'detached protected work must block departure without silently discarding it');
 if(pending){await f.respond({ok:false,error:'INVALID_REQUEST'});assert.equal(await pending,false);}
}));

test('a failed Section admission retains its connected blank writer for the original rollback scope',()=>fixture(async f=>{
 f.owner.resetTopicReader=async()=>({stale:true});assert.equal(await f.owner.navigateTopicSection('named'),false);assert.equal(f.owner.activeSectionId,'default');assert.equal(f.owner.topicReader,f.oldReader);assert.equal(f.owner.sectionEndWriter,f.writer);assert.equal(f.writer.field.isConnected,true);assert.equal(f.writer.hasDraft(),false);await f.owner.mountSectionEndWriter();assert.equal(f.owner.sectionEndWriter,f.writer);assert.equal(f.owner.actions.draft,f.writer.field);assert.equal(await f.owner.leaveEditors(),true,'a still-current blank writer leaves through its original idempotent owner');assert.equal(f.rpcCalls.length,0);
}));


test('pending blank writer qualification cannot publish a new owner during the original Back leave flush',()=>fixture(async f=>{
 f.writer.dispose();f.owner.sectionEndWriter=null;
 const compose=f.owner.actions.compose.bind(f.owner.actions);let releaseCompose,composeEntered,releaseFlush,flushEntered,handle;
 const composeHeld=new Promise(resolve=>releaseCompose=resolve),composed=new Promise(resolve=>composeEntered=resolve),flushHeld=new Promise(resolve=>releaseFlush=resolve),flushing=new Promise(resolve=>flushEntered=resolve);
 f.owner.actions.compose=async options=>{handle=await compose(options);handle.field.matches=()=>false;Object.defineProperty(handle.field,'innerText',{get:()=>handle.field.textContent});composeEntered();await composeHeld;return handle;};
 f.owner.editor.flush=async()=>{flushEntered();await flushHeld;return true;};
 const mounting=f.owner.mountSectionEndWriter();let leaving;
 try{
  await composed;assert.equal(handle.hasDraft(),false);assert.equal(handle.field.isConnected,true);assert.equal(f.owner.sectionEndWriter,null,'the original mount still awaits its same qualification');
  leaving=f.owner.leaveEditors();await flushing;
  releaseCompose();await mounting;releaseFlush();
  assert.equal(await leaving,true,'the exact original Back flush succeeds without a second click or discarded human work');
  assert.equal(f.owner.sectionEndWriter,null);assert.equal(handle.field.isConnected,false,'only the unused blank late handle is retired');assert.equal(f.rpcCalls.length,0,'no Entry, permission or receipt is created');
 }finally{releaseCompose();releaseFlush();await mounting;await leaving;handle?.dispose();}
}));

for(const guard of ['leavePublication','departureFlush'])test('a new writer mount is not started during '+guard,()=>fixture(async f=>{
 f.writer.dispose();f.owner.sectionEndWriter=null;let called=0;const compose=f.owner.actions.compose.bind(f.owner.actions);f.owner.actions.compose=async options=>{called++;return compose(options);};
 f.owner[guard]=guard==='leavePublication'?Symbol('active leave'):1;
 await f.owner.mountSectionEndWriter();assert.equal(called,0,'departure owns admission before any blank surface construction');assert.equal(f.owner.sectionEndWriter,null);assert.equal(f.rpcCalls.length,0);
}));


for(const state of ['dirty','empty IME'])test('a human '+state+' handle admitted before departure remains protected when its mount settles late',()=>fixture(async f=>{
 f.writer.dispose();f.owner.sectionEndWriter=null;
 const compose=f.owner.actions.compose.bind(f.owner.actions);let releaseCompose,composeEntered,releaseFlush,flushEntered,handle;
 const composeHeld=new Promise(resolve=>releaseCompose=resolve),composed=new Promise(resolve=>composeEntered=resolve),flushHeld=new Promise(resolve=>releaseFlush=resolve),flushing=new Promise(resolve=>flushEntered=resolve);
 f.owner.actions.compose=async options=>{handle=await compose(options);handle.field.matches=()=>false;Object.defineProperty(handle.field,'innerText',{get:()=>handle.field.textContent});composeEntered();await composeHeld;return handle;};
 f.owner.editor.flush=async()=>{flushEntered();await flushHeld;return true;};
 const mounting=f.owner.mountSectionEndWriter();let leaving;
 try{
  await composed;if(state==='empty IME')handle.field.listeners.get('compositionstart')();else handle.field.textContent='SYNTHETIC exact human draft 👩🏽‍💻';
  const before=handle.field.textContent;assert.equal(handle.hasDraft(),true);leaving=f.owner.leaveEditors();await flushing;
  releaseCompose();await mounting;releaseFlush();assert.equal(await leaving,false,'new human editing ownership refuses the old Back flush');
  assert.equal(f.owner.sectionEndWriter,handle);assert.equal(handle.field.isConnected,true);assert.equal(handle.field.textContent,before);assert.equal(handle.hasDraft(),true);assert.equal(f.rpcCalls.length,0);
 }finally{releaseCompose();releaseFlush();await mounting;await leaving;handle?.dispose();}
}));
