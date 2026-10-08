import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';

async function fixture(run){
 const prior={requestAnimationFrame:globalThis.requestAnimationFrame,scrollY:globalThis.scrollY},frames=[];
 globalThis.requestAnimationFrame=callback=>frames.push(callback);globalThis.scrollY=0;
 let release;const held=new Promise(resolve=>release=resolve),state={items:[]};
 const reader={initial:()=>held,state:()=>state};
 const owner=Object.assign(Object.create(TopicController.prototype),{serial:1,openIntent:1,view:'original',createTopicReader:()=>reader,updateTopicContinuous(){},renderTopicReader:async()=>{},loadRemainingTopicSections(){}});
 try{await run({owner,reader,release,frames});}finally{for(const [key,value]of Object.entries(prior))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
}
for(const target of [{anchorId:'saved-entry'},{sectionId:'named-section'}])test('explicit initial arrival owns restoration before hydration and queued layout: '+Object.keys(target)[0],()=>fixture(async({owner,release,frames})=>{
 const pending=owner.resetTopicReader(target);assert.equal(owner.topicRestoring(),true,'initial target must block automatic adjacent prefetch before hydration');
 await owner.loadTopicContinuous('previous',{explicit:false});
 release();await pending;assert.equal(owner.topicRestoring(),true,'arrival keeps ownership through queued layout events');
 assert.equal(frames.length,1);frames.shift()();assert.equal(owner.topicRestoring(),true);frames.shift()();assert.equal(owner.topicRestoring(),false);
}));
test('deliberate reading input cancels initial arrival without later queued restoration',()=>fixture(async({owner,release,frames})=>{
 const pending=owner.resetTopicReader({anchorId:'saved-entry'});owner.topicRestoreInput({isTrusted:true,type:'keydown',key:'PageDown'});
 assert.equal(owner.topicRestoring(),false);assert.equal(owner.topicRestoreInputEpoch,1);release();await pending;assert.equal(frames.length,0);
}));
