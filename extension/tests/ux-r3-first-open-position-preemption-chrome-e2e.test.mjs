import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const op=()=>crypto.randomUUID();
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const nav=(p,view)=>p.locator(`[data-view="${view}"]`).first().click();

async function ready(h){
 const p=h.archive;
 await p.locator('#enable-consent').click();
 await eventually(async()=>(await rpc(p,'GET_STATUS')).consented);
 if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
 await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN'}});
 return p;
}

test('UX-R3 first Topic open starts the body read before durable position metadata resolves',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true});
 try{
  const p=await ready(h),topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'R3 first-open position preemption',operationId:op()}});
  for(let i=0;i<90;i++)await rpc(p,'CONTINUE_THINKING',{thought:{operationId:op(),body:`R3 first-open entry ${String(i).padStart(2,'0')}`,topicId:topic.id}});
  const first=await rpc(p,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id,sort:'asc',limit:40}});
  assert.ok(first.nextCursor,'fixture must span more than one Topic page');
  const second=await rpc(p,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id,sort:'asc',cursor:first.nextCursor,limit:40}}),anchor=second.items[10].entry;
  await rpc(p,'THOUGHT_POSITION',{position:{topicId:topic.id,entryId:anchor.id,revision:anchor.revision,offset:4,sort:'asc',expanded:[]}});

  await nav(p,'thoughts');
  await p.locator(`[data-topic-id="${topic.id}"]`).waitFor({timeout:30000});
  await p.evaluate(topicId=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);
   let releasePosition;
   const positionGate=new Promise(resolve=>{releasePosition=resolve;});
   window.r3FirstOpenPreemption={topicId,positionDelayed:false,positionReleased:false,topicReadStarted:false};
   window.r3ReleaseFirstOpenPosition=()=>{if(window.r3FirstOpenPreemption.positionReleased)return;window.r3FirstOpenPreemption.positionReleased=true;releasePosition();};
   window.r3RestoreFirstOpenSend=()=>{chrome.runtime.sendMessage=send;};
   chrome.runtime.sendMessage=(message,...args)=>{
    const position=message?.position;
    if(message?.type==='THOUGHT_POSITION'&&position?.topicId===topicId&&!position?.entryId&&!window.r3FirstOpenPreemption.positionDelayed){
     window.r3FirstOpenPreemption.positionDelayed=true;
     return positionGate.then(()=>send(message,...args));
    }
    if(message?.type==='TOPIC_DOCUMENT_PAGE'&&message?.options?.topicId===topicId)window.r3FirstOpenPreemption.topicReadStarted=true;
    return send(message,...args);
   };
  },topic.id);

  await p.locator(`[data-topic-id="${topic.id}"]`).click();
  await p.waitForFunction(()=>window.r3FirstOpenPreemption?.positionDelayed===true,null,{timeout:5000});
  await p.waitForFunction(()=>window.r3FirstOpenPreemption?.topicReadStarted===true,null,{timeout:5000});
  await p.locator('#topic-body [data-entry-id]').first().waitFor({timeout:10000});
  assert.equal(await p.evaluate(()=>window.r3FirstOpenPreemption.positionReleased),false,'first Topic body must render before durable position metadata resolves');

  await p.evaluate(()=>window.r3ReleaseFirstOpenPosition());
  await p.locator(`[data-entry-id="${anchor.id}"]`).waitFor({timeout:30000});
  assert.equal(await p.evaluate(id=>history.state?.paiaReader?.topicId===id,topic.id),true);
  assert.equal(h.externalRequests,0);
  assert.equal(h.extensionNetworkRequests,0);
  assert.equal(h.deepSeekRequests.length,0);
  assert.deepEqual(h.errors,[]);
 }finally{
  await h.archive.evaluate(()=>{window.r3ReleaseFirstOpenPosition?.();window.r3RestoreFirstOpenSend?.();}).catch(()=>{});
  await h.close();
 }
});
