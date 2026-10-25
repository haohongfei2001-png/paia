// Local synthetic owner fixture retained from the original producer receipt suite.
import test from 'node:test';
import {ArchiveError,safeErrorCode} from '../core/constants.js';
import {PromptAssistState} from '../ui/prompt-assist-state.js';
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
 let refreshRequired=false;
 let owner,manual,surface,next,commands,outcome='inserted',physical=0,transport=null,beforeSend=null,beforeQualify=null;
 const row=()=>s.repository.transaction(false,t=>t.get('meta',PROMPT_INSERTION_RUNTIME),['meta']);
 api.tabs.sendMessage=async(id,r,target)=>{
  sends.push({id,r:structuredClone(r),target:structuredClone(target)});
  if(r.type==='PAIA_PROMPT_INSERTION_RECEIVER_PROBE'){if(refreshRequired)throw new ArchiveError('PROMPT_PAGE_REFRESH_REQUIRED');await owner.registerReceiver({type:'PAIA_PROMPT_INSERTION_RECEIVER_REGISTER',version:1,nonce:receiverNonce,recoveryToken:r.recoveryToken},top);return {version:1,nonce:receiverNonce};}
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
 return {s,api,owner,caps,manual,surface,next,commands,service,ref,tab,top,frame,popup,row,rpc,prepare,insert,offer,assistResult,sends,notices,physical:()=>physical,setRefresh:v=>{refreshRequired=v;},setOutcome:v=>{outcome=v;},setTransport:v=>{transport=v;},setBeforeSend:fn=>{beforeSend=fn;},setBeforeQualify:fn=>{beforeQualify=fn;},setBeforeGet:fn=>{beforeGet=fn;},claim:async()=> (await row())?.claims.at(-1)};
}

const refreshError=()=>new ArchiveError('PROMPT_PAGE_REFRESH_REQUIRED');
test('page refresh condition survives original safe error transport',()=>assert.equal(safeErrorCode(refreshError()),'PROMPT_PAGE_REFRESH_REQUIRED'));
for(const route of ['manual','next','assist'])test(route+' pre-action presentation preserves exact refresh condition without a claim',async t=>{
 const f=await fixture(t,{assist:route==='assist'});f.setRefresh(true);
 await assert.rejects(route==='manual'?f.prepare():route==='next'?f.offer():f.assistResult(),{code:'PROMPT_PAGE_REFRESH_REQUIRED'});
 assert.equal(await f.row(),undefined);assert.equal(f.physical(),0);
 if(route==='assist')assert.equal(f.commands.views.size,1,'protocol mismatch does not discard original ready result');
});
for(const route of ['manual','next','assist'])test(route+' pre-PENDING insert preserves explicit refresh reason without dispatch',async t=>{
 const f=await fixture(t,{assist:route==='assist'}),p=route==='manual'?await f.prepare():route==='next'?await f.offer():await f.assistResult();f.setRefresh(true);
 const result=route==='manual'?await f.insert(p):await f.rpc({type:'suggestion_insert',source:p.source,id:p.result.id,conditionPresented:true,operationId:p.result.insertionAction.operationId,insertionAction:p.result.insertionAction});
 assert.equal(result.status,'failed');assert.equal(result.reason,'page_refresh_required');assert.equal(await f.row(),undefined);assert.equal(f.physical(),0);
});
const stateSuggestion={id:'175ab221-36e8-4d72-89f2-9feb84371d20',kind:'SUGGESTION',text:'Synthetic next step',condition:''};
function stateFixture({currentError=false,resultError=false,ack={status:'inserted',verified:true}}={}){const calls=[],state=new PromptAssistState({send:async c=>{calls.push(c);if(c.type==='suggestion_current'){if(currentError)throw refreshError();return {source:'assist',result:stateSuggestion};}if(c.type==='suggestion_result'){if(resultError)throw refreshError();return stateSuggestion;}return ack;}});return {state,calls};}
test('suggestion initial refresh shows manual page refresh requirement',async()=>{const {state,calls}=stateFixture({currentError:true});assert.equal(await state.refresh(),false);assert.equal(state.message,'page_refresh_required');assert.equal(calls.length,1);assert.equal(state.result,null);});
test('suggestion final preparation refresh error sends no insertion and remains explicit',async()=>{const {state,calls}=stateFixture({resultError:true});await state.refresh();state.markPresented(stateSuggestion);assert.equal(await state.insert(),false);assert.equal(state.message,'page_refresh_required');assert.equal(calls.some(c=>c.type==='suggestion_insert'),false);});
test('suggestion exact failed pre-PENDING outcome shows refresh while retaining one-shot attempt',async()=>{const {state,calls}=stateFixture({ack:{status:'failed',reason:'page_refresh_required'}});await state.refresh();state.markPresented(stateSuggestion);await state.insert();assert.equal(state.message,'page_refresh_required');assert.equal(state.attempted,true);await state.insert();assert.equal(calls.filter(c=>c.type==='suggestion_insert').length,1);});
test('unknown insertion stays unknown despite reason-shaped data',async()=>{const {state}=stateFixture({ack:{status:'uncertain',reason:'page_refresh_required'}});await state.refresh();state.markPresented(stateSuggestion);await state.insert();assert.equal(state.message,'uncertain');state.send=async()=>{throw refreshError();};await state.refresh();assert.equal(state.message,'uncertain');});
