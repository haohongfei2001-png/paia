import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './harness/ai-reading-flush-fixture.mjs';
import {TopicController} from '../ui/topic-workspace.js';
import {SECTION_AI_FIELDS} from '../ui/topic-section-ai.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
test('one saved AI flush owns recovery protection and duplicate blur/refresh callers',async()=>{
 const f=await fixture(),entered=deferred(),release=deferred();f.setSave(async(_m,n)=>{if(n===1){entered.resolve();await release.promise;}});
 try {const node=f.editor.nodes.get('currentView')[0];node.textContent='SYNTHETIC authored once';f.editor.collect();const first=f.editor.flush();await entered.promise;const second=f.editor.flush(),saving=f.editor.saving;release.resolve();await Promise.all([first,second]);assert.equal(saving,true,'recovery protection belongs to the pending save owner');assert.equal((await f.read()).revision,2,'one durable human change is exactly +1');assert.equal(f.edits.length,1,'concurrent caller must join one original EDIT dispatch');assert.equal(f.editor.row.revision,2);assert.equal(f.editor.dirty(),false);}finally{release.resolve();await f.close();}
});
test('composition beginning during recovery protection forbids a save of in-progress text',async()=>{
 const f=await fixture(),entered=deferred(),release=deferred();f.setSave(async(_m,n)=>{if(n===1){entered.resolve();await release.promise;}});
 try {const node=f.editor.nodes.get('currentView')[0];node.textContent='SYNTHETIC draft before IME';f.editor.collect();const pending=f.editor.flush();await entered.promise;node.listeners.get('compositionstart')();node.textContent='SYNTHETIC incomplete IME';release.resolve();const result=await pending;assert.equal(f.edits.length,0,'no commit may sample a field while real composition is active');assert.equal((await f.read()).revision,1);assert.equal(result,false);}finally{release.resolve();await f.close();}
});
test('editor disposal during recovery protection retires its unsent commit',async()=>{
 const f=await fixture(),entered=deferred(),release=deferred();f.setSave(async(_m,n)=>{if(n===1){entered.resolve();await release.promise;}});
 try {const node=f.editor.nodes.get('currentView')[0];node.textContent='SYNTHETIC disposed draft';f.editor.collect();const pending=f.editor.flush();await entered.promise;f.editor.dispose();release.resolve();const result=await pending;assert.equal(f.edits.length,0,'disposed original owner must not issue a new EDIT after await');assert.equal((await f.read()).revision,1);assert.equal(result,false);}finally{release.resolve();await f.close();}
});

test('a held field ACK keeps later human edits on the same owner until their exact CAS commits',async()=>{
 const f=await fixture(),entered=deferred(),release=deferred();f.setEdit(async(_call,n)=>{if(n===1){entered.resolve();await release.promise;}});
 try{
  const current=f.editor.nodes.get('currentView')[0];current.textContent='SYNTHETIC first';f.editor.collect();const first=f.editor.flush();await entered.promise;
  current.textContent='SYNTHETIC later current';f.editor.nodes.get('blockSummary')[0].textContent='SYNTHETIC later summary';f.editor.collect();const joined=f.editor.flush();
  assert.equal(f.editor.saving,true);assert.equal(f.edits.length,1);assert.equal((await f.read()).revision,2);assert.equal(f.editor.row.revision,1,'held ACK has not advanced the UI owner');
  release.resolve();assert.deepEqual(await Promise.all([first,joined]),[true,true]);
  const row=await f.read();assert.equal(row.revision,4);assert.equal(f.editor.row.revision,row.revision);assert.equal(row.currentView,'SYNTHETIC later current');assert.equal(row.blockSummary,'SYNTHETIC later summary');
  assert.deepEqual(f.edits.map(c=>c.edit.expectedRevision),[1,2,3]);assert.equal(new Set(f.edits.map(c=>c.edit.operationId)).size,3);assert.equal(f.editor.dirty(),false);assert.equal(f.editor.saving,false);
 }finally{release.resolve();await f.close();}
});

test('a genuinely concurrent domain edit is still a strict CAS conflict for every joined caller',async()=>{
 const f=await fixture(),entered=deferred(),release=deferred();f.setSave(async(_m,n)=>{if(n===1){entered.resolve();await release.promise;}});
 try{
  f.editor.nodes.get('currentView')[0].textContent='SYNTHETIC local draft';f.editor.collect();const first=f.editor.flush();await entered.promise;const joined=f.editor.flush();
  await f.s.editAIPresentation({topicId:f.topic.id,field:'currentView',value:'SYNTHETIC independently saved',expectedRevision:1,operationId:crypto.randomUUID()});
  release.resolve();assert.deepEqual(await Promise.all([first,joined]),[false,false]);assert.equal(f.edits.length,1);assert.equal(f.editor.conflicted,true);assert.equal(f.editor.dirty(),true);assert.equal(f.editor.saving,false);
  const row=await f.read();assert.equal(row.revision,2);assert.equal(row.currentView,'SYNTHETIC independently saved');assert.equal(f.editor.nodes.get('currentView')[0].textContent,'SYNTHETIC local draft');
 }finally{release.resolve();await f.close();}
});

for(const stop of ['composition','dispose'])test('the first excerpt await retains one flush owner and rechecks '+stop,async()=>{
 const f=await fixture(),entered=deferred(),release=deferred();let calls=0;
 const excerpt={collect(){},async flush(){calls++;entered.resolve();await release.promise;return true;},dirty:()=>false,dispose(){}};
 try{
  f.editor.excerptEditors.push(excerpt);f.editor.nodes.get('currentView')[0].textContent='SYNTHETIC unsent after excerpt';const first=f.editor.flush();await entered.promise;const joined=f.editor.flush();
  if(stop==='dispose')f.editor.dispose();else f.editor.nodes.get('currentView')[0].listeners.get('compositionstart')();
  release.resolve();assert.deepEqual(await Promise.all([first,joined]),[false,false]);assert.equal(calls,1);assert.equal(f.edits.length,0);assert.equal((await f.read()).revision,1);assert.equal(f.editor.saving,false);
 }finally{release.resolve();await f.close();}
});

for(const stop of ['composition','dispose'])test('an already sent field keeps its receipt but cannot send another field after '+stop,async()=>{
 const f=await fixture(),entered=deferred(),release=deferred();f.setEdit(async(_call,n)=>{if(n===1){entered.resolve();await release.promise;}});
 try{
  f.editor.nodes.get('blockSummary')[0].textContent='SYNTHETIC sent overview';f.editor.nodes.get('currentView')[0].textContent='SYNTHETIC unsent current';f.editor.collect();const pending=f.editor.flush();await entered.promise;
  if(stop==='dispose')f.editor.dispose();else f.editor.nodes.get('currentView')[0].listeners.get('compositionstart')();
  release.resolve();assert.equal(await pending,false);assert.equal(f.edits.length,1);const row=await f.read();assert.equal(row.revision,2);assert.equal(f.editor.row.revision,2);assert.equal(row.blockSummary,'SYNTHETIC sent overview');assert.equal(row.currentView,'SYNTHETIC currentView');
 }finally{release.resolve();await f.close();}
});

// Real Topic/editor/recovery/domain owners; controlled detached multiline DOM
// semantics reproduce the phantom +3 mechanism, not native layout acceptance.
test('blank-summary Topic refresh cannot revive a retired save and flatten authored list newlines',{timeout:10000},async()=>{
const f=await fixture({revision:7,lists:true}),protectEntered=deferred(),protectHeld=deferred(),firstAckEntered=deferred(),firstAckHeld=deferred(),duplicateAckHeld=deferred();
const original=f.editor,tasks=[];let owner;
try{
// Controlled DOM sampling, not native-browser layout proof: these two editable
// nodes have rendered line breaks represented by block boundaries. Removing
// their DOM ancestry exposes flattened textContent through unrendered innerText.
for(const key of ['openQuestions','possibleEvolution']){const node=original.nodes.get(key)[0],text=original.row[key][0].text;node.renderedText=text;node.replaceChildren(...text.split('\n').map(line=>{const block=new node.constructor();block.textContent=line;return block;}));}
f.setSave(async(_m,n)=>{if(n===1){protectEntered.resolve();await protectHeld.promise;}});
f.setEdit(async(_c,n)=>{if(n===1){firstAckEntered.resolve();await firstAckHeld.promise;}else if(n===2)await duplicateAckHeld.promise;});
const before=await f.read();original.nodes.get('blockSummary')[0].textContent='';original.collect();const first=original.flush();tasks.push(first);await protectEntered.promise;const duplicate=original.flush();tasks.push(duplicate);protectHeld.resolve();await firstAckEntered.promise;await f.read();
firstAckHeld.resolve();await first;
const cached={...await f.read(),recoveryEpoch:f.qualified.recoveryEpoch};
const Node=original.root.constructor,docNodes=new Map(),idNode=id=>{if(!docNodes.has(id)){const n=new Node();n.style={};docNodes.set(id,n);}return docNodes.get(id);};
document.getElementById=idNode;document.body=new Node('body');document.body.append(original.root);original.root.style={};
const topic={id:f.topic.id,name:'SYNTHETIC topic'},section={id:f.topic.sectionId,sectionId:f.topic.sectionId,topicId:topic.id};
const page={topic,sections:[section],recoveryEpoch:cached.recoveryEpoch,authority:{topicId:topic.id},coverage:{activeGeneration:'g2'},items:[{entry:{id:f.entry.id,lifecycle:'active'},placement:{topicId:topic.id,sectionId:section.id}}]};
const send=chrome.runtime.sendMessage;chrome.runtime.sendMessage=async m=>m.type==='GET_LIBRARY_SECTION_PROJECTION'?{ok:true,data:{topic,items:[section]}}:m.type==='GET_LIBRARY_SECTION_READING'?{ok:true,data:page}:send(m);
owner=Object.assign(Object.create(TopicController.prototype),{serial:1,id:topic.id,view:'ai',topic,activeSectionId:section.id,aiTopics:new Map([[topic.id,{presentation:cached}]]),aiScopeKey:JSON.stringify([topic.id,section.id,true,[...SECTION_AI_FIELDS].sort(),'g1',cached.recoveryEpoch]),aiEditor:original,originalPane:new Node(),aiPane:original.root,syncReadingControls(){},ensurePanes(){},updateViewStatus:async()=>({}),filterAIReading(){},renderSectionNav(){},topicAnchor:()=>null,topicSectionAnchor:()=>null,checkAllTracked:async()=>true,updateTopicSearchCount(){},resetTopicReader:async({beforePaint})=>{assert.equal(beforePaint(page),true);return {stale:false};}});
assert.equal(await owner.readContentRefresh(),true,'production Topic refresh publishes the narrower blank-summary scope');assert.notEqual(owner.aiEditor,original,'blank summary removes its admitted field and retires original editor');assert.equal(original.disposed,true);
duplicateAckHeld.resolve();await duplicate;
const after=await f.read();assert.equal(f.edits.length,1);assert.deepEqual(SECTION_AI_FIELDS.filter(k=>JSON.stringify(after[k])!==JSON.stringify(before[k])),['blockSummary']);for(const key of ['openQuestions','possibleEvolution'])assert.equal(after[key][0].text,before[key][0].text);assert.equal(after.revision,before.revision+1,'one deliberate blank-summary edit must preserve all authored list newlines');
}finally{protectHeld.resolve();firstAckHeld.resolve();duplicateAckHeld.resolve();await Promise.allSettled(tasks);if(owner?.aiEditor){await Promise.allSettled([owner.aiEditor.ready,owner.aiEditor.recoveryReady]);owner.aiEditor.dispose();}await f.close();}
});

for(const state of ['conflicted','failed'])test('independent original excerpts still flush before the parent AI '+state+' refusal',async()=>{
 const f=await fixture();let flushes=0;
 try{
  f.editor.excerptEditors.push({collect(){},async flush(){flushes++;return true;},dirty:()=>false,dispose(){}});f.editor[state]=true;
  assert.equal(await f.editor.flush(),false);assert.equal(flushes,1);assert.equal(f.edits.length,0);assert.equal((await f.read()).revision,1);
 }finally{await f.close();}
});
