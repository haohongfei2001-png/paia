// Current durable-Section route replacement coverage; historical ANS08 skip stays.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {runWithPreDispatchReadRetry} from './harness/pre-dispatch-read-retry.mjs';
import {thoughtPrimary} from './harness/current-thought-navigation.mjs';
const rpc=async(p,type,fields={})=>{const result=await p.evaluate(m=>chrome.runtime.sendMessage(m),{type,...fields});assert.equal(result?.ok,true,JSON.stringify(result));return result.data;};
const offset=160;
// Observe native completion, never substitute RPC/restore results or wait for geometry success.
function observeTopicCompletion(TopicController){
 const state=globalThis.__topicCompletion={sequence:0,current:null,events:[]};
 const record=(kind,data={})=>{state.events.push({kind,...data});if(state.events.length>80)state.events.shift();};
 const track=(promise,scope,kind,done=()=>{})=>{scope.pending++;record(kind+'-start',{sequence:scope.sequence});promise.then(value=>{scope.pending--;done(value);record(kind+'-end',{sequence:scope.sequence});},error=>{scope.pending--;scope.failed=true;record(kind+'-error',{sequence:scope.sequence,name:error?.name||'Error'});});return promise;};
 const open=TopicController.prototype.open,restore=TopicController.prototype.restorePosition;
 TopicController.prototype.open=function(id){const scope={sequence:++state.sequence,topicId:id,intent:null,pending:0,completed:false,failed:false};state.current=scope;const promise=open.call(this,id);scope.intent=this.openIntent;return track(promise,scope,'open',intent=>{scope.completed=intent===scope.intent&&this.openIntent===scope.intent&&this.id===id;});};
 TopicController.prototype.restorePosition=function(anchor){const scope=state.current,promise=restore.call(this,anchor);return scope&&scope.intent===this.openIntent?track(promise,scope,'restore'):promise;};
 const send=chrome.runtime.sendMessage;
 chrome.runtime.sendMessage=function(message,...args){const scope=state.current,promise=send.call(this,message,...args);return scope&&message?.type==='THOUGHT_POSITION'&&message.position?.topicId===scope.topicId&&!message.position?.entryId?track(promise,scope,'position-read'):promise;};
 for(const name of ['scrollTo','scrollBy']){const original=window[name];window[name]=function(...args){record(name,{args,scrollY});return original.apply(this,args);};}
}

async function fixture(){
 const h=await FakeChatGPT.start({headless:true}),p=h.archive;
 p.on('console',message=>{const text=message.text();if(text.startsWith('SECTION_FIXTURE_ACQUISITIONS '))console.log(text);});
 try{await p.setViewportSize({width:1440,height:1000});await p.locator('#enable-consent').click();
 await eventually(async()=>{const status=await rpc(p,'GET_STATUS');return status.consented===true&&status.enabled===true;},'consent is durably acknowledged before independent Section setup');
 const seed=await p.evaluate(`(async()=>{
  const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),op=()=>crypto.randomUUID(),preDispatchRead=${runWithPreDispatchReadRetry.toString()},originalRun=s.run.bind(s),events=[];let stage='foundation';
  s.run=callback=>preDispatchRead(work=>{const event={stage,entered:false};events.push(event);if(events.length>128)events.shift();return originalRun(()=>{event.entered=true;return work();}).catch(error=>{event.code=typeof error?.code==='string'&&/^[A-Z0-9_]{1,64}$/.test(error.code)?error.code:'UNKNOWN';throw error;});},callback);
  try{await s.finishFoundation();stage='create-topic';
  const topic=await s.createTopic({name:'SYNTHETIC current Section return',operationId:op()});stage='read-topic';const currentTopic=await s.topic(topic.id);stage='create-section';const section=await s.createSection({topicId:topic.id,expectedTopicRevision:currentTopic.organizationRevision,title:'SYNTHETIC durable named Section',operationId:op()}),entries=[];
  for(let i=0;i<12;i++){stage='create-entry-'+i;const created=await s.continueThinking({topicId:topic.id,sectionId:i<4?topic.defaultSectionId:section.sectionId,body:Array.from({length:20},(_,line)=>'SYNTHETIC Entry '+i+' paragraph '+line+' 中文 é 👩🏽‍💻 precise reading text.').join('\\n\\n'),operationId:op()});stage='read-entry-'+i;entries.push(await s.entry(created.id));}
  return {topicId:topic.id,sectionId:section.sectionId,target:entries[7],next:entries[8]};
  }finally{s.run=originalRun;console.log('SECTION_FIXTURE_ACQUISITIONS '+JSON.stringify(events));s.repository.close();}
 })()`);
 await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN'}});
 const observerScript='import("../ui/topic-workspace.js").then(({TopicController})=>('+observeTopicCompletion.toString()+')(TopicController))';await p.addInitScript(observerScript);await p.evaluate(observerScript);
 return {h,p,seed};
 }catch(error){try{await h.close();}catch(cleanup){console.error('SECTION_FIXTURE_CLEANUP',cleanup?.name||'Error');}throw error;}
}
const field=(p,id)=>p.locator(`#topic-body [data-entry-id="${id}"] [data-entry-field="body"]`);
async function seedPosition(p,s,entry=s.target,at=offset){assert.deepEqual(await rpc(p,'THOUGHT_POSITION',{position:{topicId:s.topicId,entryId:entry.id,revision:entry.revision,offset:at,sort:'asc',expanded:[]}}),{saved:true});}
async function open(p,s){await thoughtPrimary(p,'thoughts');await p.locator(`.personal-topic-link[data-topic-id="${s.topicId}"]`).click();await field(p,s.target.id).waitFor();}
async function back(p){await p.locator('#back').evaluate(n=>n.focus({preventScroll:true}));await p.keyboard.press('Enter');}
async function geometry(p,id,at){return p.evaluate(({id,at})=>{
 const root=document.querySelector(`#topic-body [data-entry-id="${id}"]`),body=root?.querySelector('[data-entry-field="body"]');if(!body)return null;
 const walk=document.createTreeWalker(body,NodeFilter.SHOW_TEXT);let node,left=at,top=null;while(node=walk.nextNode()){if(left<=node.length){const range=document.createRange();range.setStart(node,left);range.collapse(true);top=range.getBoundingClientRect().top;break;}left-=node.length;}
 return {id:root.dataset.entryId,sectionId:root.dataset.sectionId||root.closest('[data-section-id]')?.dataset.sectionId,top,entryTop:root.getBoundingClientRect().top,scrollY,maxScroll:document.documentElement.scrollHeight-innerHeight,viewport:innerHeight};
 },{id,at});}
async function settled(p){await p.evaluate(()=>document.fonts.ready);await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function exact(p,s,entry=s.target,at=offset){
 try{
 await field(p,entry.id).waitFor();await p.waitForFunction(id=>history.state?.paiaReader?.topicId===id&&document.querySelector('.workspace')?.dataset.state==='ready'&&!document.querySelector('.workspace').inert&&globalThis.__topicCompletion?.current?.topicId===id&&__topicCompletion.current.completed&&!__topicCompletion.current.failed&&__topicCompletion.current.pending===0,s.topicId,{timeout:14000});await settled(p);const saved=await rpc(p,'THOUGHT_POSITION',{position:{topicId:s.topicId}}),row=await rpc(p,'GET_LIBRARY_ENTRY',{id:entry.id});
 assert.equal(saved.entryId,entry.id);assert.equal(saved.revision,row.revision);assert.equal(saved.offset,at);const place=await geometry(p,entry.id,at);assert.ok(place&&Number.isFinite(place.top));assert.equal(place.sectionId,s.sectionId);
 assert.ok(Math.abs(place.top-140)<=2||(Math.abs(place.scrollY-place.maxScroll)<=2&&place.top>=140&&place.top<place.viewport),'exact text offset aligns to reading edge unless bounded by remaining scroll range: '+JSON.stringify(place));return {saved,place};
 }catch(error){try{await mkdir('work/topic-return-position',{recursive:true});const trace=await p.locator('html').evaluate(()=>({completion:globalThis.__topicCompletion,scrollY,route:history.state?.paiaReader?.topicId}),null,{timeout:1000});await writeFile('work/topic-return-position/exact-failure-'+Date.now()+'.json',JSON.stringify({trace,error:error.message},null,2));}catch(diagnostic){console.error('TOPIC_EXACT_DIAGNOSTIC_UNAVAILABLE',diagnostic?.name||'Error');}throw error;}
}
async function evidence(f,name,data){assert.equal(f.h.externalRequests,0);assert.equal(f.h.extensionNetworkRequests,0);assert.equal(f.h.deepSeekRequests.length,0);assert.deepEqual(f.h.errors,[]);await mkdir('work/topic-return-position',{recursive:true});await writeFile('work/topic-return-position/'+name+'.json',JSON.stringify(data,null,2));}
async function delayedPositionCannotOverrideUser(p,s){
 await back(p);await p.locator(`.personal-topic-link[data-topic-id="${s.topicId}"]`).waitFor();
 await rpc(p,'THOUGHT_POSITION',{position:{topicId:s.topicId,entryId:s.target.id,revision:s.target.revision,offset:0,sort:'desc',expanded:[]}});
 await p.evaluate(()=>{const send=chrome.runtime.sendMessage;globalThis.__positionRestoreSend=()=>chrome.runtime.sendMessage=send;globalThis.__positionLate={held:false,delivered:false,reads:[]};chrome.runtime.sendMessage=async function(message,...args){if(message.type==='GET_LIBRARY_SECTION_READING')__positionLate.reads.push(message.options.sort);const result=await send.call(this,message,...args);if(message.type==='THOUGHT_POSITION'&&!message.position.entryId&&!__positionLate.held){__positionLate.held=true;await new Promise(resolve=>globalThis.__releasePositionLate=resolve);__positionLate.delivered=true;}return result;};});
 try{await p.locator(`.personal-topic-link[data-topic-id="${s.topicId}"]`).click();await field(p,s.target.id).waitFor();await eventually(()=>p.evaluate(()=>__positionLate.held),'real stale durable-position response held after current session paint');await settled(p);
  const scrollBeforeWheel=await p.evaluate(()=>scrollY);await p.mouse.move(1000,600);await p.mouse.wheel(0,350);await eventually(()=>p.evaluate(y=>Math.abs(scrollY-y)>1,scrollBeforeWheel),'actual wheel changes current reading viewport');await settled(p);const before=await geometry(p,s.target.id,offset),reads=await p.evaluate(()=>__positionLate.reads.length);await p.evaluate(()=>__releasePositionLate());await eventually(()=>p.evaluate(()=>__positionLate.delivered),'old durable-position response actually delivered');await settled(p);const after=await geometry(p,s.target.id,offset),late=await p.evaluate(n=>__positionLate.reads.slice(n),reads);
  assert.ok(Math.abs(after.scrollY-before.scrollY)<=2,'late position cannot scroll over a newer native wheel');assert.ok(Math.abs(after.top-before.top)<=2,'latest session text location survives late metadata');assert.equal(late.includes('desc'),false,'old durable sort cannot rebuild over current session');return {before,after,late};
 }finally{await p.evaluate(()=>{globalThis.__releasePositionLate?.();globalThis.__positionRestoreSend?.();});}
}
test('TOPIC-05.4 current named Section restores exact Entry/revision/offset through Root reopen and cold reload',{timeout:90000},async()=>{
 const f=await fixture();try{const {p,seed:s}=f;await seedPosition(p,s);await open(p,s);const initial=await exact(p,s);
  await back(p);await p.locator(`.personal-topic-link[data-topic-id="${s.topicId}"]`).waitFor();await p.locator(`.personal-topic-link[data-topic-id="${s.topicId}"]`).click();const returned=await exact(p,s);
  const late=await delayedPositionCannotOverrideUser(p,s);await seedPosition(p,s);console.log('TOPIC_RETURN_BEFORE_RELOAD '+JSON.stringify({initial,returned,late}));await p.addInitScript(()=>{globalThis.__topicPositionScrollTrace=[];for(const name of ['scrollTo','scrollBy']){const original=window[name];window[name]=function(...args){if(__topicPositionScrollTrace.length<60)__topicPositionScrollTrace.push({name,args,scrollY,stack:new Error().stack?.split('\n').slice(1,5)});return original.apply(this,args);};}});await p.reload();let reloaded;try{reloaded=await exact(p,s);}finally{console.log('TOPIC_RETURN_RELOAD_SCROLL_TRACE '+JSON.stringify(await p.evaluate(()=>__topicPositionScrollTrace)));}await evidence(f,'saved-return',{initial,returned,late,reloaded});
 }finally{await f.h.close();}
});
test('TOPIC-05.4 unsaved storage failure and IME refuse departure; acknowledged edit returns at the same reading offset',{timeout:90000},async()=>{
 const f=await fixture();let worker;try{const {p,seed:s}=f;await seedPosition(p,s);await open(p,s);await exact(p,s);worker=f.h.context.serviceWorkers().find(w=>w.url().endsWith('/background/service-worker.js'));assert.ok(worker);
  await worker.evaluate(id=>{const put=IDBObjectStore.prototype.put;globalThis.__positionRestorePut=()=>IDBObjectStore.prototype.put=put;globalThis.__positionPutFaults=0;IDBObjectStore.prototype.put=function(row,...args){if(this.name==='thoughts'&&row.id===id){__positionPutFaults++;throw new DOMException('SYNTHETIC current Entry save refusal','UnknownError');}return put.call(this,row,...args);};},s.target.id);
  const body=field(p,s.target.id);let draft=s.target.body+'\n\nSYNTHETIC unsaved ending';await body.evaluate((n,draft)=>{globalThis.__positionOriginalEditor=n;n.textContent=draft;n.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'SYNTHETIC unsaved ending'}));},draft);await p.locator('#topic-heading').evaluate(n=>n.focus({preventScroll:true}));await eventually(()=>worker.evaluate(()=>__positionPutFaults>0),'real native Entry put refused');
  await back(p);assert.equal(await body.evaluate(n=>n===__positionOriginalEditor),true);assert.equal(await body.textContent(),draft);assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:s.target.id})).body,s.target.body);assert.equal(await p.locator('#thought-document').isVisible(),true);
  await body.dispatchEvent('compositionstart');await back(p);assert.equal(await body.evaluate(n=>n===__positionOriginalEditor),true);assert.equal(await body.textContent(),draft);await body.dispatchEvent('compositionend');await worker.evaluate(()=>__positionRestorePut());
  // Genuine subsequent input retries the existing owner after the storage fault.
  draft+=' SYNTHETIC retry edit';await body.evaluate((n,text)=>{n.textContent=text;n.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:' SYNTHETIC retry edit'}));},draft);await p.locator('#topic-heading').evaluate(n=>n.focus({preventScroll:true}));await eventually(async()=> (await rpc(p,'GET_LIBRARY_ENTRY',{id:s.target.id})).body===draft,'actual Entry revision acknowledged');
  const savedEntry=await rpc(p,'GET_LIBRARY_ENTRY',{id:s.target.id});assert.ok(savedEntry.revision>s.target.revision);await seedPosition(p,s,savedEntry);await p.evaluate(({id,at})=>{const body=document.querySelector(`[data-entry-id="${id}"] [data-entry-field="body"]`),walk=document.createTreeWalker(body,NodeFilter.SHOW_TEXT);let n,left=at;while(n=walk.nextNode()){if(left<=n.length){const r=document.createRange();r.setStart(n,left);r.collapse(true);scrollBy(0,r.getBoundingClientRect().top-140);break;}left-=n.length;}},{id:s.target.id,at:offset});
  await settled(p);const beforeLeave=await geometry(p,s.target.id,offset);console.log('TOPIC_SAVED_EDIT_BEFORE_RETURN '+JSON.stringify({beforeLeave,revision:savedEntry.revision,offset,bodyEqualsDTO:await body.textContent()===savedEntry.body,dom:await body.evaluate(n=>({tags:[...n.children].map(x=>x.tagName),lineCount:n.textContent.split('\n').length}))}));await back(p);await p.locator(`.personal-topic-link[data-topic-id="${s.topicId}"]`).waitFor();await p.locator(`.personal-topic-link[data-topic-id="${s.topicId}"]`).click();let returned;try{returned=await exact(p,s,savedEntry);}finally{console.log('TOPIC_SAVED_EDIT_AFTER_RETURN '+JSON.stringify({after:await geometry(p,s.target.id,offset),position:await rpc(p,'THOUGHT_POSITION',{position:{topicId:s.topicId}}),bodyEqualsDTO:await body.textContent()===savedEntry.body,dom:await body.evaluate(n=>({tags:[...n.children].map(x=>x.tagName),lineCount:n.textContent.split('\n').length}))}));}assert.equal(await field(p,s.target.id).textContent(),draft);await evidence(f,'unsaved-saved-return',{returned,nativePutFaults:await worker.evaluate(()=>__positionPutFaults)});
 }finally{if(worker)await worker.evaluate(()=>globalThis.__positionRestorePut?.()).catch(()=>{});await f.h.close();}
});
test('TOPIC-05.4 removed persisted Section Entry restores the canonical nearby target with current revision and offset zero',{timeout:90000},async()=>{
 const f=await fixture();try{const {p,seed:s}=f;await seedPosition(p,s);const paths=await rpc(p,'GET_LIBRARY_PATHS',{id:s.target.id}),topic=await rpc(p,'GET_LIBRARY_TOPIC',{id:s.topicId});await rpc(p,'PLACE_LIBRARY_ENTRY',{placement:{entryId:s.target.id,topicId:s.topicId,expectedEntryRevision:s.target.revision,expectedTopicRevision:topic.organizationRevision,expectedPlacementRevision:paths[0].placement.revision,remove:true,operationId:crypto.randomUUID()}});
  const nearby=await rpc(p,'THOUGHT_POSITION',{position:{topicId:s.topicId}});assert.equal(nearby.nearby,true);assert.equal(nearby.entryId,s.next.id);assert.equal(nearby.offset,0);assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:s.target.id})).body,s.target.body);
  await thoughtPrimary(p,'thoughts');await p.locator(`.personal-topic-link[data-topic-id="${s.topicId}"]`).click();await p.getByText('原位置已移除，从附近继续。',{exact:true}).waitFor();const restored=await exact(p,s,s.next,0);assert.equal(await field(p,s.target.id).count(),0);await evidence(f,'nearby-return',{nearby,restored});
 }finally{await f.h.close();}
});

test('TOPIC-05.4 a real pending save ACK cannot start a replacement reader while departure is flushing',{timeout:90000},async()=>{
 const f=await fixture();try{const {p,seed:s}=f;await seedPosition(p,s);await open(p,s);await exact(p,s);
  await p.evaluate(async()=>{
   const {TopicController}=await import('../ui/topic-workspace.js');globalThis.__leaveAckTrace={depth:0,refreshWhileLeaving:0,held:false,released:false};
   const leave=TopicController.prototype.leaveEditors,refresh=TopicController.prototype.refresh;
   TopicController.prototype.leaveEditors=function(...args){__leaveAckTrace.depth++;const pending=leave.apply(this,args);pending.then(()=>__leaveAckTrace.depth--,()=>__leaveAckTrace.depth--);return pending;};
   TopicController.prototype.refresh=function(...args){if(__leaveAckTrace.depth)__leaveAckTrace.refreshWhileLeaving++;return refresh.apply(this,args);};
   const send=chrome.runtime.sendMessage;globalThis.__leaveAckRestore=()=>chrome.runtime.sendMessage=send;
   chrome.runtime.sendMessage=async function(message,...args){const result=await send.call(this,message,...args);if(message.type==='EDIT_LIBRARY_BATCH'&&!__leaveAckTrace.held){__leaveAckTrace.held=true;await new Promise(resolve=>globalThis.__releaseLeaveAck=resolve);__leaveAckTrace.released=true;}return result;};
  });
  const body=field(p,s.target.id),draft=s.target.body+'\n\nSYNTHETIC held real save ACK';await body.evaluate((n,text)=>{n.textContent=text;n.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'SYNTHETIC held real save ACK'}));},draft);await p.locator('#topic-heading').evaluate(n=>n.focus({preventScroll:true}));
  await eventually(()=>p.evaluate(()=>__leaveAckTrace.held),'the original storage commit completes before its actual editor ACK');const saved=await rpc(p,'GET_LIBRARY_ENTRY',{id:s.target.id});assert.equal(saved.body,draft);assert.ok(saved.revision>s.target.revision);await seedPosition(p,s,saved);
  await p.evaluate(({id,at})=>{const b=document.querySelector(`[data-entry-id="${id}"] [data-entry-field="body"]`),w=document.createTreeWalker(b,NodeFilter.SHOW_TEXT);let n,left=at;while(n=w.nextNode()){if(left<=n.length){const r=document.createRange();r.setStart(n,left);r.collapse(true);scrollBy(0,r.getBoundingClientRect().top-140);break;}left-=n.length;}},{id:s.target.id,at:offset});await settled(p);
  await back(p);await eventually(()=>p.evaluate(()=>__leaveAckTrace.depth>0),'real departure is awaiting the same pending editor save');assert.equal(await p.locator('#thought-document').isVisible(),true);await p.evaluate(()=>__releaseLeaveAck());await p.locator(`.personal-topic-link[data-topic-id="${s.topicId}"]`).waitFor();assert.equal(await p.evaluate(()=>__leaveAckTrace.refreshWhileLeaving),0,'save completion must not start a replacement reader during the real departure');
  await p.locator(`.personal-topic-link[data-topic-id="${s.topicId}"]`).click();const returned=await exact(p,s,saved);assert.equal(await field(p,s.target.id).textContent(),draft);await evidence(f,'pending-save-ack-return',{returned,trace:await p.evaluate(()=>__leaveAckTrace)});
 }finally{await f.p.locator('html').evaluate(()=>{globalThis.__releaseLeaveAck?.();globalThis.__leaveAckRestore?.();},null,{timeout:1000}).catch(()=>{});await f.h.close();}
});
