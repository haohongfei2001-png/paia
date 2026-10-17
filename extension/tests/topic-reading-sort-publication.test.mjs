import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';

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
 ['route',owner=>owner.openIntent++],['Section',owner=>owner.activeSectionId='sibling'],
 ['Root authority',owner=>owner.rootCueEpoch++],['presentation',owner=>owner.presentationIntent++],
 ['IME',owner=>owner.editor.surface={composing:true}],
])test(`waiting chronology cannot change order after ${name} changes`,()=>withPublication(async f=>{
 const action=f.owner.changeReadingSort('asc',{fromStart:true});retire(f.owner);f.release();await action;
 assert.equal(f.calls.some(call=>call?.type==='SET_ORGANIZER_CONTROLS'),false);
 assert.equal(f.owner.readingSort,'desc');assert.equal(f.button.disabled,false);
}));
