import test from 'node:test';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';import {seedMemoryRPC} from './fixtures/memory-v0100.mjs';
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(q=>chrome.runtime.sendMessage(q),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
async function observe(p,selector){return p.evaluate(selector=>{
 const root=document.querySelector(selector),node=root.firstElementChild;window.readingWatch={root,node,mutations:0,loads:0,reads:0};
 const send=chrome.runtime.sendMessage.bind(chrome.runtime);window.readingRestore=()=>chrome.runtime.sendMessage=send;
 chrome.runtime.sendMessage=q=>{if(q.type==='TOPIC_DOCUMENT_PAGE'||q.type==='LIBRARY_INDEX_PAGE')window.readingWatch.reads++;return send(q);};
 window.readingObserver=new MutationObserver(ms=>{for(const m of ms){if(m.type==='childList')window.readingWatch.mutations++;if(m.attributeName==='data-state'&&m.target.dataset.state==='loading')window.readingWatch.loads++;}});
 window.readingObserver.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['data-state']});
},selector);}
async function result(p){return p.evaluate(()=>{const x=window.readingWatch;window.readingObserver.disconnect();window.readingRestore();return {same:x.node===x.root.firstElementChild,mutations:x.mutations,loads:x.loads,reads:x.reads};});}
test('Home and Topic each stay stable for 60 seconds; real updates retain editing nodes and scroll',{timeout:210000},async()=>{
 const h=await FakeChatGPT.start({headless:true}),p=h.archive;const evidence={syntheticOnly:true,headless:true};
 try{
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();const f=await seedMemoryRPC((t,o)=>rpc(p,t,o));await p.locator('[data-view=thoughts]').click();await eventually(async()=>await p.locator('[data-topic-id]').count()>0);await p.waitForTimeout(2500);
  for(const label of ['home','topic']){
   if(label==='topic'){await p.locator(`[data-topic-id="${f.paia.id}"]`).click();await p.locator('[data-entry-field=body]').first().waitFor();await p.waitForTimeout(800);}
   await observe(p,label==='home'?'#thought-list':'#topic-body');const started=Date.now();
   for(let i=0;i<12;i++){await p.evaluate(i=>chrome.storage.local.set({readingSyntheticStatus:{phase:i%2?'idle':'pending',pending:i}}),i);await rpc(p,'SET_ORGANIZER_CONTROLS',{changes:{dailyRequests:20+i%2}});await p.waitForTimeout(5000);}
   evidence[label]={milliseconds:Date.now()-started,...await result(p)};assert.ok(evidence[label].milliseconds>=60000);assert.deepEqual({...evidence[label],milliseconds:0},{milliseconds:0,same:true,mutations:0,loads:0,reads:0});
  }
  const body=p.locator('#original-reading-body [data-entry-field=body]').first(),id=await body.evaluate(n=>n.closest('[data-entry-id]').dataset.entryId);
  await body.fill('Synthetic reading edit 保留光标与正文');await body.evaluate(n=>{n.focus();const r=new Range();r.setStart(n.firstChild,8);r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r);window.readingFocusNode=n;});
  await eventually(async()=>(await rpc(p,'GET_LIBRARY_ENTRY',{id})).body.includes('保留光标'));
  const before=await p.evaluate(()=>({node:document.activeElement===window.readingFocusNode,offset:getSelection().anchorOffset,scroll:scrollY}));
  await observe(p,'#topic-body');await p.evaluate(()=>chrome.runtime.sendMessage({type:'EDIT_LIBRARY_TOPIC',edit:{}})); // invalid action cannot mutate
  await p.evaluate(()=>chrome.runtime.sendMessage({type:'GET_LIBRARY_TOPIC',id:'missing-synthetic'}));
  await p.evaluate(()=>{chrome.runtime.onMessage.dispatchEvent?.({type:'ARCHIVE_CHANGED'});});
  const topic=await rpc(p,'GET_LIBRARY_TOPIC',{id:f.paia.id});const added=await rpc(p,'CREATE_LIBRARY_ENTRY',{entry:{body:'Synthetic new paragraph',note:'',type:'idea',operationId:crypto.randomUUID()}});
  await rpc(p,'PLACE_LIBRARY_ENTRY',{placement:{entryId:added.id,topicId:topic.id,expectedEntryRevision:added.revision,expectedTopicRevision:topic.organizationRevision,operationId:crypto.randomUUID()}});
  await eventually(async()=>await p.locator(`[data-entry-id="${added.id}"]`).count()===1);
  const after=await p.evaluate(()=>({node:document.activeElement===window.readingFocusNode,offset:getSelection().anchorOffset,scroll:scrollY}));assert.deepEqual(after,before);evidence.insertion={...await result(p),focusAndSelection:true};assert.equal(evidence.insertion.same,true);assert.equal(evidence.insertion.loads,0);
  assert.equal(await p.locator('[data-entry-field=title]').count(),0);assert.equal(await p.locator('#save-status').textContent(),'');assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
  await mkdir('work/reading-v0111',{recursive:true});await p.screenshot({path:'work/reading-v0111/topic.png',fullPage:true});await p.locator('#back').click();await p.screenshot({path:'work/reading-v0111/home.png',fullPage:true});await writeFile('work/reading-v0111/stability.json',JSON.stringify({...evidence,providerRequests:0,errors:h.errors},null,2));
 }finally{await h.close();}
});
