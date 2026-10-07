import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
test('TOPIC-05.2 actual Root navigation claims latest intent before asynchronous identity validation',async()=>{
 const panel={hidden:false},pending=[],opened=[];globalThis.document={documentElement:{lang:'en'},getElementById:id=>id==='thought-panel'?panel:null};globalThis.chrome={runtime:{sendMessage:message=>new Promise(resolve=>pending.push({message,resolve}))}};
 const owner=Object.assign(Object.create(TopicController.prototype),{openIntent:0,serial:1,statusEpoch:1,id:null,onStatus:()=>{},open:async function(id){opened.push(id);this.id=id;return ++this.openIntent;}});
 const first=owner.openRootTarget('synthetic-A'),second=owner.openRootTarget('synthetic-B');pending[0].resolve({ok:true,data:{topic:{id:'synthetic-A'},items:[]}});await first;assert.deepEqual(opened,[]);pending[1].resolve({ok:true,data:{topic:{id:'synthetic-B'},items:[]}});await second;assert.deepEqual(opened,['synthetic-B']);
});
test('TOPIC-05.2 actual Root target cannot navigate after leaving the Thought shell',async()=>{
 const panel={hidden:false},pending=[],opened=[];globalThis.document={documentElement:{lang:'en'},getElementById:id=>id==='thought-panel'?panel:null};globalThis.chrome={runtime:{sendMessage:message=>new Promise(resolve=>pending.push(resolve))}};
 const owner=Object.assign(Object.create(TopicController.prototype),{openIntent:0,serial:1,statusEpoch:1,id:null,onStatus:()=>{},open:async id=>opened.push(id)}),read=owner.openRootTarget('synthetic-A');
 panel.hidden=true;owner.serial++;owner.statusEpoch++;pending[0]({ok:true,data:{topic:{id:'synthetic-A'},items:[]}});await read;assert.deepEqual(opened,[]);
});
