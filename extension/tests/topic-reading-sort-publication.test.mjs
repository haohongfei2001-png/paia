import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {PresentationNode} from './harness/presentation-dom.mjs';

// Keep the real order action and original editor flush. Only the pending
// publication, transport and browser controls are supplied by this fixture.
async function withPublication(run){
 const names=['document','chrome'],previous=new Map(names.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 let release;const pending=new Promise(resolve=>release=resolve),calls=[],button={dataset:{},disabled:false};
 const controls={querySelectorAll:()=>[button],setAttribute(){},removeAttribute(){}};
 globalThis.document={getElementById:id=>id==='topic-time-order'?controls:null};
 globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(message);return {ok:true,data:{}};}}};
 const editor={collect(){calls.push('collect');},async flush(){calls.push('flush');return true;},dirty:()=>false};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',openIntent:1,rootCueEpoch:0,presentationIntent:1,activeSectionId:'section',readingSort:'desc',editor,refreshRun:{promise:pending},topicAnchor:()=>null,syncReadingControls(){},async refresh(){calls.push('refresh');}});
 try{await run({owner,calls,button,release});}finally{release();for(const [key,value]of previous)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
}

test('explicit chronology waits for its existing return publication before flushing or changing saved order',()=>withPublication(async f=>{
 const action=f.owner.changeReadingSort('asc',{fromStart:true});await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(f.calls,[],'retained rows are not proof that the returning editor owner is admitted');
 assert.equal(f.button.disabled,true);f.release();await action;
 assert.deepEqual(f.calls.map(call=>typeof call==='string'?call:call.type),['collect','flush','SET_ORGANIZER_CONTROLS','refresh']);
 assert.equal(f.owner.readingSort,'asc');assert.equal(f.owner.topicResetFromStart,true);assert.equal(f.owner.topicTimeEdge,'earliest');assert.equal(f.owner.topicNavigationAnchor,null);assert.equal(f.button.disabled,false);
}));

for(const [name,retire]of [
 ['route',owner=>owner.openIntent++],['pending open claim',owner=>owner.topicOpenIntent=(owner.topicOpenIntent||0)+1],['Section',owner=>owner.activeSectionId='sibling'],
 ['Root authority',owner=>owner.rootCueEpoch++],['presentation',owner=>owner.presentationIntent++],
 ['IME',owner=>owner.editor.surface={composing:true}],
])test(`waiting chronology cannot change order after ${name} changes`,()=>withPublication(async f=>{
 const action=f.owner.changeReadingSort('asc',{fromStart:true});retire(f.owner);f.release();await action;
 assert.equal(f.calls.some(call=>call?.type==='SET_ORGANIZER_CONTROLS'),false);
 assert.equal(f.owner.readingSort,'desc');assert.equal(f.button.disabled,false);
}));


test('chronology refuses a still-pending open before flushing or changing saved order',()=>withPublication(async f=>{
 f.owner.topicOpening=1;
 const action=f.owner.changeReadingSort('asc',{fromStart:true});await new Promise(resolve=>setImmediate(resolve));f.release();await action;
 assert.deepEqual(f.calls,[]);assert.equal(f.owner.readingSort,'desc');assert.equal(f.owner.readingSortBusy,undefined);
}));

function gate(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
async function withOpening(run){
 const names=['document','chrome','scrollTo'],previous=new Map(names.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const node=()=>Object.assign(new PresentationNode(),{disabled:false}),button=node(),elements=new Map(['ai-presentation-toggle','thought-list'].map(id=>[id,node()]));elements.set('topic-order-toggle',button);
 globalThis.document={documentElement:{lang:'en'},getElementById:id=>elements.get(id)||null,createElement:node,createElementNS:node};
 const calls=[];globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(message.type);return {ok:true,data:null};}}};globalThis.scrollTo=()=>{};
 const leave=gate(),refresh=gate(),restore=gate(),refreshStarted=gate(),restoreStarted=gate();
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',openIntent:1,rootCueEpoch:0,presentationIntent:1,activeSectionId:'section',readingSort:'desc',lastSections:new Map([['topic','section']]),homePositions:new Map([['topic',{sort:'desc'}]]),aiViewSession:{position:()=>null},topicReader:{scopeSectionId:'section'},rememberView(){},captureHomePosition:()=>null,leave:()=>leave.promise,clearActionFeedback(){},onOpen(){},restoreContent(){},async refresh(){refreshStarted.resolve();await refresh.promise;},async restorePosition(){restoreStarted.resolve();await restore.promise;},schedulePosition(){}});
 try{await run({owner,button,calls,leave,refresh,restore,refreshStarted,restoreStarted});}
 finally{leave.resolve(false);refresh.resolve();restore.resolve();for(const [key,value]of previous)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
}

test('original open disables actual chronology through leave, canonical refresh and exact position restoration',()=>withOpening(async f=>{
 const opening=f.owner.open('topic');assert.equal(f.owner.topicOpening,1);assert.equal(f.button.disabled,true);
 await f.owner.changeReadingSort('asc',{fromStart:true});assert.deepEqual(f.calls,[]);assert.equal(f.owner.readingSort,'desc');
 f.leave.resolve(true);await f.refreshStarted.promise;assert.equal(f.owner.topicOpening,1);assert.equal(f.button.disabled,true);
 f.refresh.resolve();await f.restoreStarted.promise;assert.equal(f.owner.topicOpening,1);assert.equal(f.button.disabled,true);
 f.restore.resolve();assert.equal(await opening,2);assert.equal(f.owner.topicOpening,undefined);assert.equal(f.button.disabled,false);assert.deepEqual(f.calls,['THOUGHT_POSITION']);
}));

for(const failure of ['refused','rejected'])test(`original open clears its chronology ownership after leave is ${failure}`,()=>withOpening(async f=>{
 const opening=f.owner.open('topic');assert.equal(f.button.disabled,true);
 if(failure==='refused'){f.leave.resolve(false);await opening;}else{f.leave.reject(Error('SYNTHETIC_LEAVE_FAILURE'));await assert.rejects(opening,/SYNTHETIC_LEAVE_FAILURE/);}
 assert.equal(f.owner.topicOpening,undefined);assert.equal(f.button.disabled,false);
}));

test('retired open cannot clear or re-enable a newer pending open chronology control',()=>withOpening(async f=>{
 const firstLeave=gate(),secondLeave=gate();let calls=0;f.owner.leave=()=>++calls===1?firstLeave.promise:secondLeave.promise;
 const first=f.owner.open('topic'),second=f.owner.open('topic');assert.equal(f.owner.topicOpening,2);assert.equal(f.button.disabled,true);
 firstLeave.resolve(false);await first;assert.equal(f.owner.topicOpening,2);assert.equal(f.button.disabled,true);
 secondLeave.resolve(false);await second;assert.equal(f.owner.topicOpening,undefined);assert.equal(f.button.disabled,false);
}));

test('open completion retains a separately pending chronology busy owner',()=>withOpening(async f=>{
 f.owner.readingSortBusy=true;const opening=f.owner.open('topic');assert.equal(f.button.disabled,true);
 f.leave.resolve(false);await opening;assert.equal(f.owner.topicOpening,undefined);assert.equal(f.button.disabled,true);
}));
