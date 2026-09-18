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

test('UX-R3 browser history restore preempts an invalidated Thought home read',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true});
 try{
  const p=await ready(h),topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'R3 history preemption',operationId:op()}});
  for(let i=0;i<60;i++)await rpc(p,'CONTINUE_THINKING',{thought:{operationId:op(),body:`R3 history entry ${String(i).padStart(2,'0')}`,topicId:topic.id}});
  const page=await rpc(p,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id,sort:'asc',limit:40}}),anchor=page.items[20].entry;
  await rpc(p,'THOUGHT_POSITION',{position:{topicId:topic.id,entryId:anchor.id,revision:anchor.revision,offset:3,sort:'asc',expanded:[]}});

  await nav(p,'thoughts');
  await p.locator(`[data-topic-id="${topic.id}"]`).click();
  await p.locator(`[data-entry-id="${anchor.id}"]`).waitFor();

  await p.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);
   let releaseHome;
   const homeGate=new Promise(resolve=>{releaseHome=resolve;});
   window.r3HistoryPreemption={homeDelayed:false,homeReleased:false,topicReadStarted:false};
   window.r3ReleaseHomeRead=()=>{if(window.r3HistoryPreemption.homeReleased)return;window.r3HistoryPreemption.homeReleased=true;releaseHome();};
   window.r3RestoreSendMessage=()=>{chrome.runtime.sendMessage=send;};
   chrome.runtime.sendMessage=(message,...args)=>{
    if(message?.type==='LIBRARY_INDEX_PAGE'&&!window.r3HistoryPreemption.homeDelayed){
     window.r3HistoryPreemption.homeDelayed=true;
     return homeGate.then(()=>send(message,...args));
    }
    if(message?.type==='TOPIC_DOCUMENT_PAGE')window.r3HistoryPreemption.topicReadStarted=true;
    return send(message,...args);
   };
  });

  await p.locator('#back').click();
  await p.waitForFunction(()=>window.r3HistoryPreemption?.homeDelayed===true);
  assert.equal(await p.locator('#thought-collection').isVisible(),true);

  await p.goBack();
  await p.waitForFunction(()=>window.r3HistoryPreemption?.topicReadStarted===true,null,{timeout:5000});
  assert.equal(await p.evaluate(()=>window.r3HistoryPreemption.homeReleased),false,'Topic restore must not wait for the stale home request');
  await p.evaluate(()=>window.r3ReleaseHomeRead());
  await p.locator(`[data-entry-id="${anchor.id}"]`).waitFor({timeout:30000});
  assert.equal(await p.evaluate(id=>history.state?.paiaReader?.topicId===id,topic.id),true);
  assert.equal(h.externalRequests,0);
  assert.equal(h.extensionNetworkRequests,0);
  assert.equal(h.deepSeekRequests.length,0);
  assert.deepEqual(h.errors,[]);
 }finally{
  await h.archive.evaluate(()=>{window.r3ReleaseHomeRead?.();window.r3RestoreSendMessage?.();}).catch(()=>{});
  await h.close();
 }
});

test('UX-R3 same-session Back restores a saved Topic page before durable position metadata resolves',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true});
 try{
  const p=await ready(h),topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'R3 saved page resume',operationId:op()}});
  for(let i=0;i<90;i++)await rpc(p,'CONTINUE_THINKING',{thought:{operationId:op(),body:`R3 saved page entry ${String(i).padStart(2,'0')}`,topicId:topic.id}});
  const first=await rpc(p,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id,sort:'asc',limit:40}});
  assert.ok(first.nextCursor,'fixture must span more than one Topic page');
  const second=await rpc(p,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id,sort:'asc',cursor:first.nextCursor,limit:40}}),anchor=second.items[10].entry;
  await rpc(p,'THOUGHT_POSITION',{position:{topicId:topic.id,entryId:anchor.id,revision:anchor.revision,offset:4,sort:'asc',expanded:[]}});

  await nav(p,'thoughts');
  await p.locator(`[data-topic-id="${topic.id}"]`).click();
  await p.locator(`[data-entry-id="${anchor.id}"]`).waitFor({timeout:30000});
  await p.locator('#back').click();
  await p.locator(`[data-topic-id="${topic.id}"]`).waitFor({timeout:30000});

  await p.evaluate(({topicId,anchorId})=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);
   let releasePosition;
   const positionGate=new Promise(resolve=>{releasePosition=resolve;});
   window.r3PositionPreemption={topicId,anchorId,positionDelayed:false,positionReleased:false,positionSawAnchor:false,topicReadStarted:false,originalStatusRequests:0};
   window.r3ReleasePositionRead=()=>{if(window.r3PositionPreemption.positionReleased)return;window.r3PositionPreemption.positionReleased=true;releasePosition();};
   window.r3RestorePositionSendMessage=()=>{chrome.runtime.sendMessage=send;};
   chrome.runtime.sendMessage=(message,...args)=>{
    const position=message?.position;
    if(message?.type==='GET_ORIGINAL_ORGANIZER_STATUS')window.r3PositionPreemption.originalStatusRequests++;
    if(message?.type==='THOUGHT_POSITION'&&position?.topicId===topicId&&!position?.entryId&&!window.r3PositionPreemption.positionDelayed){
     window.r3PositionPreemption.positionDelayed=true;
     window.r3PositionPreemption.positionSawAnchor=!!document.querySelector(`[data-entry-id="${anchorId}"]`);
     return positionGate.then(()=>send(message,...args));
    }
    if(message?.type==='TOPIC_DOCUMENT_PAGE'&&message?.options?.topicId===topicId)window.r3PositionPreemption.topicReadStarted=true;
    return send(message,...args);
   };
  },{topicId:topic.id,anchorId:anchor.id});

  await p.goBack();
  await p.waitForFunction(()=>window.r3PositionPreemption?.topicReadStarted===true,null,{timeout:5000});
  await p.locator(`[data-entry-id="${anchor.id}"]`).waitFor({timeout:10000});
  await p.waitForFunction(()=>window.r3PositionPreemption?.positionDelayed===true,null,{timeout:5000});
  assert.equal(await p.evaluate(()=>window.r3PositionPreemption.positionSawAnchor),true,'durable position metadata must be requested only after the saved Topic page is committed to DOM');
  assert.equal(await p.evaluate(()=>window.r3PositionPreemption.originalStatusRequests),0,'passive Topic restore must not dispatch the 100k-capable Original planner');
  assert.equal(await p.evaluate(()=>window.r3PositionPreemption.positionReleased),false,'saved Topic page must not depend on durable position metadata resolving');
  assert.equal(await p.evaluate(id=>history.state?.paiaReader?.topicId===id,topic.id),true);
  await p.evaluate(()=>window.r3ReleasePositionRead());
  await eventually(async()=>await p.evaluate(()=>window.r3PositionPreemption.positionReleased===true));
  assert.equal(h.externalRequests,0);
  assert.equal(h.extensionNetworkRequests,0);
  assert.equal(h.deepSeekRequests.length,0);
  assert.deepEqual(h.errors,[]);
 }finally{
  await h.archive.evaluate(()=>{window.r3ReleasePositionRead?.();window.r3RestorePositionSendMessage?.();}).catch(()=>{});
  await h.close();
 }
});
