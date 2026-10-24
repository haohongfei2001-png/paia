import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBObjectStore,IDBTransaction} from './vendor/fake-indexeddb/build/esm/index.js';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {PromptReuseCommands} from '../background/prompt-reuse-commands.js';
import {PromptSurfaceCommands} from '../background/prompt-surface.js';
import {NextPromptCommands} from '../background/prompt-next.js';
import {AssistPromptCommands} from '../background/prompt-assist.js';
import {PromptInsertionReceipts,PROMPT_INSERTION_RUNTIME} from '../background/prompt-insertion-receipts.js';
import {assistServiceFixture} from '../../services/ai-gateway/tests/assist-client-fixture.mjs';
const url='https://chatgpt.com/c/synthetic',nonce='11111111-1111-4111-8111-111111111111',receiverNonce='22222222-2222-4222-8222-222222222222';
const deferred=()=>{let resolve,reject;return {promise:new Promise((a,b)=>{resolve=a;reject=b;}),resolve:v=>resolve(v),reject:e=>reject(e)};};
const tick=async()=>{for(let i=0;i<6;i++)await new Promise(setImmediate);};
async function pending(p){let settled=false;void p.then(()=>{settled=true;},()=>{settled=true;});await tick();assert.equal(settled,false);}
async function fixture(t,{assist=false}={}){
 const original=assist?await assistServiceFixture(t):await setup(OrganizerStore),s=original.s;await s.finishFoundation();original.commands?.dispose();
 const top={id:'synthetic-extension',tab:{id:1,windowId:4},url,frameId:0,documentId:'original-top',documentLifecycle:'active'},tab={id:1,windowId:4,url,active:true,incognito:false},values={},notices=[],sends=[];
 const api=original.api??{runtime:{id:top.id,getURL:p=>'chrome-extension://'+top.id+'/'+p,sendMessage:async m=>notices.push(m)},storage:{local:{get:async()=>structuredClone(values),set:async v=>Object.assign(values,structuredClone(v))}},tabs:{query:async()=>[],update:async()=>{}},windows:{get:async()=>({focused:true,incognito:false})}};
 let beforeGet=null;api.tabs.get=async()=>{await beforeGet?.();return {...tab};};api.tabs.query=async()=>[];api.tabs.update=async()=>{};api.windows.get=async()=>({focused:true,incognito:false});
 const frame={id:top.id,tab:{id:1,windowId:4},url:api.runtime.getURL('ui/prompt-surface.html')+'#'+nonce,frameId:2,documentId:'initiating-private-frame',documentLifecycle:'active'};
 api.runtime.getContexts=async()=>[{documentId:frame.documentId,tabId:1,windowId:4,frameId:2,documentUrl:frame.url,incognito:false}];
 const reply={url,conversation:'/c/synthetic',cycle:1,replyId:'original-reply',revision:1};
 let owner,manual,surface,next,commands,outcome='inserted',physical=0,transport=null,beforeSend=null,beforeQualify=null;
 const row=()=>s.repository.transaction(false,t=>t.get('meta',PROMPT_INSERTION_RUNTIME),['meta']);
 api.tabs.sendMessage=async(id,r,target)=>{
  sends.push({id,r:structuredClone(r),target:structuredClone(target)});
  if(r.type==='PAIA_PROMPT_INSERTION_RECEIVER_PROBE'){await owner.registerReceiver({type:'PAIA_PROMPT_INSERTION_RECEIVER_REGISTER',version:1,nonce:receiverNonce,recoveryToken:r.recoveryToken},top);return {version:1,nonce:receiverNonce};}
  if(r.type==='PAIA_PROMPT_SURFACE_PROBE')return {open:true,nonce,url:tab.url,idle:true};
  if(r.type==='PAIA_PROMPT_NEXT_PROBE')return {authorization:(await next.authorization()).generation,binding:reply,nonce,idle:true};
  if(r.type==='PAIA_PROMPT_ASSIST_PROBE')return {generation:r.generation,ready:true,binding:reply,...(r.snapshot?{snapshot:{completed:true,text:'SYNTHETIC newly completed reply.',blocks:1,excluded:false}}:{})};
  if(['PAIA_PROMPT_INSERT_SELECTED','PAIA_PROMPT_NEXT_INSERT','PAIA_PROMPT_ASSIST_INSERT'].includes(r.type)){
   physical++;assert.equal(target.documentId,top.documentId);assert.equal('frameId'in target,false);assert.notEqual(target.documentId,frame.documentId);
   const durable=await row(),claim=durable.claims.find(c=>c.envelope.operationId===r.operationId);assert.ok(claim,'PENDING must be committed before actual insertion transport');assert.equal(claim.state,'pending');assert.deepEqual(claim.envelope,r.insertionReceipt);
   await beforeQualify?.(r);
   assert.equal((await owner.handleQualify({type:'PAIA_PROMPT_INSERTION_QUALIFY',version:1,envelope:r.insertionReceipt},top)).qualified,true);
   if(r.type==='PAIA_PROMPT_ASSIST_INSERT')assert.equal((await commands.handle({type:'PAIA_PROMPT_ASSIST_QUALIFY',id:r.id,operationId:r.operationId,generation:r.generation},top)).qualified,true);
   if(r.type==='PAIA_PROMPT_NEXT_INSERT')assert.equal((await next.handle({type:'PAIA_PROMPT_NEXT_INSERT_CURRENT',id:r.id,choiceId:r.choiceId,operationId:r.operationId},top)).current,true);
   await beforeSend?.(r);if(transport)return transport.promise;
   if(outcome==='reject')throw Error('SYNTHETIC transport outcome unknown');
   if(outcome==='legacy')return {status:'inserted',verified:true};
   return {status:outcome==='inserted'?'inserted':'failed',verified:outcome==='inserted',insertionAck:{version:1,envelope:r.insertionReceipt,outcome}};
  }
  return {};
 };
 owner=new PromptInsertionReceipts(s,api);const caps={},register=owner.registerProducer;owner.registerProducer=function(lane,producer){const cap=register.call(this,lane,producer);caps[lane]=cap;return cap;};const service=new PromptReuseService(s);manual=new PromptReuseCommands(service,api,{insertionReceipts:owner});surface=new PromptSurfaceCommands(manual,api);next=new NextPromptCommands(service,api,surface,{insertionReceipts:owner});commands=new AssistPromptCommands(s,api,{surface,configuration:original.configuration??null,insertionReceipts:owner});surface.next=next;surface.assist=commands;delete owner.registerProducer;
 t.after(()=>{manual.dispose();surface.dispose();next.dispose();commands.dispose();owner.dispose();s.repository.db?.close();});
 const created=await service.change({action:'create',revision:0,text:'SYNTHETIC selected expression'}),projection=await service.query(),ref={kind:'manual_reuse',id:created.id,revision:projection.revision,generation:projection.generation},popup={id:top.id,url:api.runtime.getURL('ui/popup.html'),documentId:'popup-original',frameId:0};
 const rpc=command=>surface.handle({type:'PAIA_PROMPT_SURFACE_RPC',nonce,command},frame);
 const prepare=()=>rpc({type:'PAIA_PROMPT_SELECTION_READ',ref,range:null,prepareInsertion:true});
 const insert=p=>rpc({type:'PAIA_PROMPT_SELECTION_INSERT',ref,range:null,target:p.target,operationId:p.insertionAction.operationId,insertionAction:p.insertionAction});
 const offer=async(present=true)=>{await next.handle({type:'PAIA_PROMPT_NEXT_CONFIGURE',enabled:true},popup);await next.handle({type:'PAIA_PROMPT_NEXT_OFFER',binding:reply,authorization:(await next.authorization()).generation,snapshot:{completed:true,text:'Reply "continue".',blocks:1,excluded:false}},top);return present?rpc({type:'suggestion_current'}):null;};
 const assistResult=async(present=true)=>{const auth=await commands.handle({type:'PAIA_PROMPT_ASSIST_STATUS'},top);await commands.handle({type:'PAIA_PROMPT_ASSIST_READY',generation:auth.generation},top);return present?rpc({type:'suggestion_current'}):null;};
 return {s,api,owner,caps,manual,surface,next,commands,service,ref,tab,top,frame,popup,row,rpc,prepare,insert,offer,assistResult,sends,notices,physical:()=>physical,setOutcome:v=>{outcome=v;},setTransport:v=>{transport=v;},setBeforeSend:fn=>{beforeSend=fn;},setBeforeQualify:fn=>{beforeQualify=fn;},setBeforeGet:fn=>{beforeGet=fn;},claim:async()=> (await row())?.claims.at(-1)};
}

for(const route of ['manual','standalone','next','legacy-next','assist'])test(route+' actual producer commits PENDING before exact top-document transport and terminal CAS',async t=>{
 const f=await fixture(t,{assist:route==='assist'});let result;
 if(route==='manual'){const p=await f.prepare();assert.equal(await f.row(),undefined,'presentation has no durable claim');result=await f.insert(p);}
 if(route==='standalone'){const p=await f.manual.handle({type:'PAIA_PROMPT_INSERT_PREPARE',id:f.ref.id,text:'SYNTHETIC selected expression',tabId:1,url},f.popup);assert.equal(await f.row(),undefined);result=await f.manual.handle({type:'PAIA_PROMPT_INSERT',id:f.ref.id,text:p.text,tabId:1,url,operationId:p.insertionAction.operationId,insertionAction:p.insertionAction},f.popup);}
 if(route==='next'||route==='assist'){const p=route==='next'?await f.offer():await f.assistResult();assert.equal(p.source,route==='next'?'local':'assist');assert.equal(await f.row(),undefined);result=await f.rpc({type:'suggestion_insert',source:p.source,id:p.result.id,conditionPresented:true,operationId:p.result.insertionAction.operationId,insertionAction:p.result.insertionAction});}
 if(route==='legacy-next'){await f.next.handle({type:'PAIA_PROMPT_NEXT_CONFIGURE',enabled:true},f.popup);const binding={url,conversation:'/c/synthetic',cycle:1,replyId:'original-reply',revision:1};await f.next.handle({type:'PAIA_PROMPT_NEXT_OFFER',binding,authorization:(await f.next.authorization()).generation,snapshot:{completed:true,text:'Reply "continue".',blocks:1,excluded:false}},f.top);const sender={...f.frame,url:f.api.runtime.getURL('ui/prompt-surface.html')+'#next-'+nonce};f.api.runtime.getContexts=async()=>[{documentId:sender.documentId,tabId:1,windowId:4,frameId:2,documentUrl:sender.url,incognito:false}];const rpc=command=>f.next.handle({type:'PAIA_PROMPT_NEXT_RPC',nonce,command},sender),p=await rpc({type:'get'}),choice=p.choices[0];result=await rpc({type:'insert',id:choice.id,operationId:choice.insertionAction.operationId,insertionAction:choice.insertionAction});}
 assert.equal(result.status,'inserted');assert.equal(f.physical(),1);assert.equal((await f.claim()).state,'inserted');assert.equal((await f.owner.inspect()).legacyCoverageUnknown,true);
});

for(const outcome of ['legacy','reject'])test('manual '+outcome+' response cannot manufacture durable completion or replay',async t=>{const f=await fixture(t),p=await f.prepare();f.setOutcome(outcome);assert.equal((await f.insert(p)).status,'uncertain');assert.equal((await f.claim()).state,'pending');assert.equal((await f.insert(p)).status,'uncertain');assert.equal(f.physical(),1);await assert.rejects(f.manual.holdForApplicationSelection(),{code:'OUTCOME_UNKNOWN'});});

test('manual exact late ACK settles original durable claim without preference write or stale UI success',async t=>{
 const f=await fixture(t),p=await f.prepare(),gate=deferred(),entered=deferred();f.setTransport(gate);f.setBeforeSend(r=>entered.resolve(r));t.mock.timers.enable({apis:['setTimeout']});
 const running=f.insert(p),message=await entered.promise;t.mock.timers.tick(2000);assert.equal((await running).status,'uncertain');assert.equal((await f.claim()).state,'pending');
 gate.resolve({status:'inserted',verified:true,insertionAck:{version:1,envelope:message.insertionReceipt,outcome:'inserted'}});await tick();assert.equal((await f.claim()).state,'inserted');assert.equal((await f.insert(p)).status,'uncertain');assert.equal(f.physical(),1);assert.equal((await f.service.query()).items.find(x=>x.id===f.ref.id).reuseCount??0,0);await assert.rejects(f.manual.holdForApplicationSelection(),{code:'OUTCOME_UNKNOWN'});
});

for(const change of ['action','initiator'])test('manual cached result does not accept changed '+change+' authority',async t=>{const f=await fixture(t),p=await f.prepare();assert.equal((await f.insert(p)).status,'inserted');if(change==='action')p.insertionAction.actionId=crypto.randomUUID();else{f.frame.documentId='other-private-frame';p.target.documentId=f.frame.documentId;}await assert.rejects(f.insert(p));assert.equal(f.physical(),1);});

test('receipt owner replacement and request-supplied owner are not producer authority',async t=>{const f=await fixture(t),p=await f.prepare();await assert.rejects(f.rpc({type:'PAIA_PROMPT_SELECTION_INSERT',ref:f.ref,range:null,target:p.target,operationId:p.insertionAction.operationId,insertionAction:p.insertionAction,insertionReceipts:{}}));assert.throws(()=>f.owner.registerProducer('manual',{insertionReceiptSourceIs:()=>true}));assert.equal(f.physical(),0);});

// Hold the real synthetic transaction's completion ACK, not a replacement
// owner promise. No helper is permitted to manufacture a durable claim.
function holdPendingCommit(t){
 const entered=deferred(),release=deferred(),marked=new WeakSet(),put=IDBObjectStore.prototype.put,emit=IDBTransaction.prototype.dispatchEvent;let held=false;
 t.mock.method(IDBObjectStore.prototype,'put',function(value,...rest){if(value?.id===PROMPT_INSERTION_RUNTIME&&value.claims.some(c=>c.state==='pending'))marked.add(this.transaction);return put.call(this,value,...rest);});
 t.mock.method(IDBTransaction.prototype,'dispatchEvent',function(event){if(!held&&event.type==='complete'&&marked.has(this)){held=true;entered.resolve();void release.promise.then(()=>emit.call(this,event));return true;}return emit.call(this,event);});
 t.after(()=>release.resolve());return {entered:entered.promise,release:release.resolve};
}
for(const changed of ['source','consent','receiver','admission'])test('manual post-PENDING '+changed+' change revalidates before dispatch and proves not-dispatched',async t=>{
 const f=await fixture(t),p=await f.prepare(),gate=holdPendingCommit(t),running=f.insert(p);await gate.entered;assert.equal(f.physical(),0);let holding;
 if(changed==='source')await f.service.change({action:'edit',id:f.ref.id,revision:f.ref.revision,text:'SYNTHETIC changed expression'});
 if(changed==='consent')await f.s.write(async tx=>{const control=await f.s.control(tx);control.settings.consentVersion=0;control.settings.enabled=false;control.settings.epoch++;await f.s.saveControl(tx,control);});
 if(changed==='receiver'){f.top.documentId='replaced-top';f.owner.removeTab(1);}
 if(changed==='admission')holding=f.manual.holdForApplicationSelection().catch(e=>e);
 gate.release();assert.equal((await running).status,'uncertain');assert.equal(f.physical(),0);assert.equal((await f.claim()).state,'not_dispatched');if(holding)assert.equal((await holding).code,'OUTCOME_UNKNOWN');
});
for(const route of ['next','assist'])test(route+' permission revoked after PENDING commit cannot reach physical insertion',async t=>{
 const f=await fixture(t,{assist:route==='assist'}),p=route==='next'?await f.offer():await f.assistResult(),gate=holdPendingCommit(t),running=f.rpc({type:'suggestion_insert',source:p.source,id:p.result.id,conditionPresented:true,operationId:p.result.insertionAction.operationId,insertionAction:p.result.insertionAction});await gate.entered;
 if(route==='next')await f.next.configure(false);else await f.commands.configure({replyAccess:false,remoteProcessing:false});gate.release();assert.equal((await running).status,'uncertain');assert.equal(f.physical(),0);assert.equal((await f.claim()).state,'not_dispatched');
});

test('manual original action cannot cross revoke and regrant of the Store consent epoch',async t=>{const f=await fixture(t),p=await f.prepare();await f.s.setEnabled(false);await f.s.consent(true);assert.equal((await f.insert(p)).status,'uncertain');assert.equal(f.physical(),0);assert.equal(await f.row(),undefined);});
test('cached manual ACK does not restore success after exact source or receiving page changes',async t=>{const f=await fixture(t),p=await f.prepare();assert.equal((await f.insert(p)).status,'inserted');await tick();await f.service.change({action:'edit',id:f.ref.id,revision:(await f.service.query()).revision,text:'SYNTHETIC newer source'});assert.equal((await f.insert(p)).status,'uncertain');f.tab.url=url+'-changed';await assert.rejects(f.insert(p));assert.equal(f.physical(),1);});

test('epoch retirement waits for the actual early manual preference publication and rejects the old issued action',async t=>{
 const f=await fixture(t),p=await f.prepare(),entered=deferred(),release=deferred(),note=f.service.noteVerifiedReuse.bind(f.service);f.service.noteVerifiedReuse=async(...args)=>{entered.resolve();await release.promise;return note(...args);};
 assert.equal((await f.insert(p)).status,'inserted');await entered.promise;const retiring=f.owner.rotateEpoch(f.caps.manual);await pending(retiring);release.resolve();await retiring;
 const retired=await f.row();assert.equal(retired.claims.length,0);assert.ok(retired.retiredEpochFloor>0);await assert.rejects(f.insert(p));const refreshed=await f.service.query();f.ref.revision=refreshed.revision;f.ref.generation=refreshed.generation;const fresh=await f.prepare();assert.notEqual(fresh.insertionAction.operationId,p.insertionAction.operationId);assert.notEqual(fresh.insertionAction.receiptEpoch,p.insertionAction.receiptEpoch);assert.equal((await f.insert(fresh)).status,'inserted');assert.equal(f.physical(),2);
});

test('restart inspects retained uncertainty without automatic insertion or permission to replay',async t=>{
 const f=await fixture(t),p=await f.prepare();f.setOutcome('legacy');assert.equal((await f.insert(p)).status,'uncertain');const cold=new PromptInsertionReceipts(f.s,f.api);t.after(()=>cold.dispose());const snapshot=await cold.inspect();assert.equal(snapshot.pendingOperations,1);assert.equal(snapshot.legacyCoverageUnknown,true);await tick();assert.equal(f.physical(),1);assert.equal((await f.claim()).state,'pending');
});

for(const route of ['next','assist'])test(route+' concurrent presentation preserves one original issued action',async t=>{
 const f=await fixture(t,{assist:route==='assist'});if(route==='next')await f.offer(false);else await f.assistResult(false);const results=await Promise.all([f.rpc({type:'suggestion_current'}),f.rpc({type:'suggestion_current'})]);assert.deepEqual(results[0].result.insertionAction,results[1].result.insertionAction);assert.equal(f.physical(),0);
});

for(const route of ['next','assist'])test(route+' issued action cannot adopt a new Store consent epoch',async t=>{
 const f=await fixture(t,{assist:route==='assist'}),p=route==='next'?await f.offer():await f.assistResult();await f.s.setEnabled(false);await f.s.consent(true);const running=f.rpc({type:'suggestion_insert',source:p.source,id:p.result.id,conditionPresented:true,operationId:p.result.insertionAction.operationId,insertionAction:p.result.insertionAction});if(route==='assist')await assert.rejects(running,{code:'STALE_BASE'});else assert.equal((await running).status,'uncertain');assert.equal(f.physical(),0);assert.equal(await f.row(),undefined);
});

for(const route of ['manual','next','assist'])test(route+' source change after transport invocation refuses receiver qualification without NOT_DISPATCHED',async t=>{
 const f=await fixture(t,{assist:route==='assist'}),p=route==='manual'?await f.prepare():route==='next'?await f.offer():await f.assistResult();
 f.setBeforeQualify(async()=>{if(route==='manual')await f.service.change({action:'edit',id:f.ref.id,revision:f.ref.revision,text:'SYNTHETIC source changed after dispatch'});else if(route==='next')await f.next.configure(false);else await f.commands.configure({replyAccess:false,remoteProcessing:false});});
 const result=await (route==='manual'?f.insert(p):f.rpc({type:'suggestion_insert',source:p.source,id:p.result.id,conditionPresented:true,operationId:p.result.insertionAction.operationId,insertionAction:p.result.insertionAction}));assert.equal(result.status,'uncertain');assert.equal(f.physical(),1);assert.equal((await f.claim()).state,'pending');
});

test('exact early manual native ACK after source replacement settles only the claim without reuse publication',async t=>{
 const f=await fixture(t),p=await f.prepare(),entered=deferred(),release=deferred();let publications=0;f.service.noteVerifiedReuse=async()=>{publications++;};f.setTransport(release);f.setBeforeSend(r=>entered.resolve(r));const running=f.insert(p),message=await entered.promise;
 await f.service.change({action:'edit',id:f.ref.id,revision:f.ref.revision,text:'SYNTHETIC independently changed source'});release.resolve({status:'inserted',verified:true,insertionAck:{version:1,envelope:message.insertionReceipt,outcome:'inserted'}});assert.equal((await running).status,'uncertain');assert.equal((await f.claim()).state,'inserted');assert.equal(publications,0);assert.equal(f.physical(),1);
});

for(const route of ['next','assist'])test(route+' exact late ACK settles only the original claim and retains sticky source uncertainty',async t=>{
 const f=await fixture(t,{assist:route==='assist'}),p=route==='next'?await f.offer():await f.assistResult(),entered=deferred(),release=deferred();f.setTransport(release);f.setBeforeSend(r=>entered.resolve(r));t.mock.timers.enable({apis:['setTimeout']});
 const request={type:'suggestion_insert',source:p.source,id:p.result.id,conditionPresented:true,operationId:p.result.insertionAction.operationId,insertionAction:p.result.insertionAction},running=f.rpc(request),message=await entered.promise;t.mock.timers.tick(2000);assert.equal((await running).status,'uncertain');assert.equal((await f.claim()).state,'pending');
 release.resolve({status:'inserted',verified:true,insertionAck:{version:1,envelope:message.insertionReceipt,outcome:'inserted'}});await tick();assert.equal((await f.claim()).state,'inserted');await assert.rejects(f.rpc(request));assert.equal(f.physical(),1);await assert.rejects((route==='next'?f.next:f.commands).holdForApplicationSelection(),{code:'OUTCOME_UNKNOWN'});
});

for(const boundary of ['presentation','pending-commit','receiver-qualification'])test('retained legacy Next requires the exact original initiating iframe at '+boundary,async t=>{
 const f=await fixture(t);await f.offer(false);const sender={...f.frame,url:f.api.runtime.getURL('ui/prompt-surface.html')+'#next-'+nonce},rpc=command=>f.next.handle({type:'PAIA_PROMPT_NEXT_RPC',nonce,command},sender);let live=boundary!=='presentation';f.api.runtime.getContexts=async()=>live?[{documentId:sender.documentId,tabId:1,windowId:4,frameId:2,documentUrl:sender.url,incognito:false}]:[];
 if(boundary==='presentation'){await assert.rejects(rpc({type:'get'}));assert.equal(f.physical(),0);assert.equal(await f.row(),undefined);return;}
 const choice=(await rpc({type:'get'})).choices[0],request={type:'insert',id:choice.id,operationId:choice.insertionAction.operationId,insertionAction:choice.insertionAction};
 if(boundary==='pending-commit'){const held=holdPendingCommit(t),running=rpc(request);await held.entered;live=false;held.release();assert.equal((await running).status,'uncertain');assert.equal(f.physical(),0);assert.equal((await f.claim()).state,'not_dispatched');}
 else{f.setBeforeQualify(()=>{live=false;});assert.equal((await rpc(request)).status,'uncertain');assert.equal(f.physical(),1);assert.equal((await f.claim()).state,'pending');}
});

for(const route of ['next','assist'])test(route+' early exact ACK after authorization changed settles ledger without stale UI success',async t=>{
 const f=await fixture(t,{assist:route==='assist'}),p=route==='next'?await f.offer():await f.assistResult(),entered=deferred(),release=deferred();f.setTransport(release);f.setBeforeSend(r=>entered.resolve(r));const running=f.rpc({type:'suggestion_insert',source:p.source,id:p.result.id,conditionPresented:true,operationId:p.result.insertionAction.operationId,insertionAction:p.result.insertionAction}),message=await entered.promise;
 if(route==='next')await f.next.configure(false);else await f.commands.configure({replyAccess:false,remoteProcessing:false});release.resolve({status:'inserted',verified:true,insertionAck:{version:1,envelope:message.insertionReceipt,outcome:'inserted'}});assert.equal((await running).status,'uncertain');assert.equal((await f.claim()).state,'inserted');assert.equal(f.physical(),1);
});

for(const route of ['manual','next','assist'])test(route+' current-check tail remains inside the original 2s UI deadline and retirement drain',async t=>{
 const f=await fixture(t,{assist:route==='assist'}),p=route==='manual'?await f.prepare():route==='next'?await f.offer():await f.assistResult(),entered=deferred(),release=deferred();let hold=false;f.setBeforeGet(async()=>{if(hold){entered.resolve();await release.promise;}});f.setBeforeSend(()=>{hold=true;});t.mock.timers.enable({apis:['setTimeout']});
 const running=route==='manual'?f.insert(p):f.rpc({type:'suggestion_insert',source:p.source,id:p.result.id,conditionPresented:true,operationId:p.result.insertionAction.operationId,insertionAction:p.result.insertionAction});await entered.promise;t.mock.timers.tick(2000);assert.equal((await running).status,'uncertain');assert.equal((await f.claim()).state,'inserted');const retiring=f.owner.rotateEpoch(f.caps[route]);await pending(retiring);release.resolve();await retiring;assert.equal(f.physical(),1);if(route==='manual')assert.equal((await f.service.query()).items.find(x=>x.id===f.ref.id).reuseCount??0,0);
});

for(const route of ['manual','next','assist'])test(route+' earliest actual insertion receiver probe uses the original opaque action event',async t=>{
 const f=await fixture(t,{assist:route==='assist'}),p=route==='manual'?await f.prepare():route==='next'?await f.offer():await f.assistResult(),action=route==='manual'?p.insertionAction:p.result.insertionAction;
 const presentation=f.sends.filter(x=>x.r.type==='PAIA_PROMPT_INSERTION_RECEIVER_PROBE');assert.ok(presentation.length>=2);assert.ok(presentation.every(x=>x.r.recoveryToken===action.receiptEpoch));assert.equal(await f.row(),undefined);const boundary=f.sends.length;
 const result=await (route==='manual'?f.insert(p):f.rpc({type:'suggestion_insert',source:p.source,id:p.result.id,conditionPresented:true,operationId:action.operationId,insertionAction:action}));assert.equal(result.status,'inserted');const insertion=f.sends.slice(boundary).filter(x=>x.r.type==='PAIA_PROMPT_INSERTION_RECEIVER_PROBE');assert.ok(insertion.length>=6);assert.equal(insertion[0].r.recoveryToken,action.actionId);assert.ok(insertion.every(x=>x.r.recoveryToken===action.actionId));assert.equal(f.physical(),1);
});
