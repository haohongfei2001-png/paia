// Paired actual receipt-owner / VM adapter protocol. Native DOM and Chrome transport remain synthetic.
// Private VM fixture copied from prompt-composer-selection-hold; no shared harness changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
const contractURL=new URL('../background/prompt-insertion-receipts.js',import.meta.url);
const {PromptInsertionReceipts,PROMPT_INSERTION_RUNTIME,promptInsertionDigest,validPromptInsertionEnvelope}=await import(contractURL);

const source=await readFile(new URL('../adapter/chatgpt-composer.js',import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(setImmediate);};
function events(){const listeners=new Map();return {addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);},emit(type,event){for(const fn of [...listeners.get(type)||[]])fn(event);}};}
function fixture({tabId=7,documentId='synthetic-real-top-document',draft='SYNTHETIC draft',offset=4,accepted=true,trusted=true,caret=true,mutate=true}={}){
 let originalActionCount=0,registrationDomain='5'.repeat(64),retirementSummary={domainDigest:'5'.repeat(64),retiredEpochFloor:0,retiredRanges:[]},now=0,remainingMs=30000,qualified=true,acceptAck=true,retiredAck=false,rpcHandler=null,protocolHandler=null,ownerToken=webcrypto.randomUUID(),recoveryToken=webcrypto.randomUUID();
 let registrationHandler=null;const settledOperations=new Set();
 const domainDigest='5'.repeat(64),receiver={tabId,windowId:1,documentId},receiptEpoch=webcrypto.randomUUID();
 const deadlineTimers=new Map();let timerId=0;const timers=[],commands=[],messages=[],listeners=new Set(),location={origin:'https://chatgpt.com',href:'https://chatgpt.com/c/synthetic-original-'+tabId};
 let hold=false,commandResolve;const commandEntered=new Promise(resolve=>commandResolve=resolve);
 const document={...events(),activeElement:null};
 const root={nodeType:1,tagName:'HTML',parentElement:null};
 const node={...events(),nodeType:1,tagName:'DIV',isConnected:true,isContentEditable:true,parentElement:root,querySelector:()=>null,closest:()=>null,getClientRects:()=>[{}],getBoundingClientRect:()=>({width:500,height:100}),contains(value){return value===this||value===text;},focus(){document.activeElement=this;},classList:{contains:()=>false}};
 const text={nodeType:3,data:draft,parentNode:node,parentElement:node};node.childNodes=[text];
 let range;
 const logical=(container,n)=>container===text?n:n?text.data.length:0;
 function makeRange(){return {startContainer:text,endContainer:text,startOffset:0,endOffset:0,setStart(container,n){this.startContainer=container;this.startOffset=n;},collapse(){this.endContainer=this.startContainer;this.endOffset=this.startOffset;},compareBoundaryPoints(_,other){return Math.sign(logical(this.startContainer,this.startOffset)-logical(other.startContainer,other.startOffset));}};}
 range=makeRange();range.setStart(text,offset);range.collapse();
 const selection={rangeCount:1,getRangeAt:()=>range,removeAllRanges(){this.rangeCount=0;},addRange(value){range=value;this.rangeCount=1;}};
 Object.assign(document,{documentElement:root,defaultView:{...events(),getComputedStyle:()=>({display:'block',visibility:'visible',contentVisibility:'visible',opacity:'1'})},querySelectorAll:()=>[node],createRange:makeRange,getSelection:()=>selection,execCommand(command,_,insertion){commands.push({command,insertion});commandResolve();const at=logical(range.startContainer,range.startOffset);if(mutate){text.data=text.data.slice(0,at)+insertion+text.data.slice(at);if(caret){range=makeRange();range.setStart(text,at+insertion.length);range.collapse();}}const event={isTrusted:trusted,inputType:'insertText',isComposing:false,target:node};node.emit('input',event);document.emit('input',event);return accepted;}});
 const context=vm.createContext({document,location,crypto:webcrypto,TextEncoder,queueMicrotask,performance:{now:()=>now},setTimeout(fn,ms){if(ms===30000){const id=++timerId;deadlineTimers.set(id,fn);return id;}if(hold)timers.push(fn);else queueMicrotask(fn);},clearTimeout(id){deadlineTimers.delete(id);},chrome:{runtime:{id:'synthetic-extension',onMessage:{addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn)},sendMessage:async message=>{messages.push(structuredClone(message));if(protocolHandler&&message.type.startsWith('PAIA_PROMPT_INSERTION_'))return protocolHandler(structuredClone(message));if(message.type==='PAIA_PROMPT_INSERTION_RECEIVER_REGISTER'){const response={ok:true,data:{registered:true,version:1,ownerToken,recoveryToken:message.recoveryToken??ownerToken,domainDigest:registrationDomain,receiver:{...receiver,nonce:message.nonce}}};return registrationHandler?registrationHandler(message,response):response;}if(message.type==='PAIA_PROMPT_INSERTION_QUALIFY')return {ok:true,data:{qualified:(typeof qualified==='function'?await qualified(message):qualified)&&!settledOperations.has(message.envelope.operationId),remainingMs}};if(message.type==='PAIA_PROMPT_INSERTION_RECONCILE')return {ok:true,data:{ownerToken,recoveryToken,retirementSummary,results:await Promise.all(message.acks.map(async ack=>{const settled=!retiredAck&&(typeof acceptAck==='function'?await acceptAck({ack}):acceptAck);if(settled)settledOperations.add(ack.envelope.operationId);return {claimId:ack.envelope.claimId,...(retiredAck?{settled:false,retired:true}:{settled})};}))}};
 if(message.type==='PAIA_PROMPT_INSERTION_ACK'){const settled=!retiredAck&&(typeof acceptAck==='function'?await acceptAck(message):acceptAck);if(settled)settledOperations.add(message.ack.envelope.operationId);return {ok:true,data:retiredAck?{settled:false,retired:true}:{settled}};}if(rpcHandler)return rpcHandler(message);return {ok:false};}}}});
 context.top=context;const reload=()=>vm.runInContext(source,context);reload();
 const adapter=()=>new context.PAIAChatGPTComposerAdapter({document,location});
 const dispatch=(message,sender={id:'synthetic-extension'})=>new Promise(resolve=>{let answered=false,async=false;for(const listener of [...listeners]){if(listener(message,sender,value=>{answered=true;resolve(value);})===true)async=true;}if(!answered&&!async)resolve(undefined);});
 const admitted=async({lane='manual',epoch=1,receiptEpoch:token=receiptEpoch,domainDigest:domain=domainDigest,operationId=webcrypto.randomUUID(),text='SYNTHETIC receipt insertion',fields={}}={})=>{
  const actionId=webcrypto.randomUUID();recoveryToken=actionId;if(originalActionCount>=500){ownerToken=webcrypto.randomUUID();originalActionCount=0;}originalActionCount++;
  if(domain!==registrationDomain){registrationDomain=domain;ownerToken=webcrypto.randomUUID();originalActionCount=1;retirementSummary={domainDigest:domain,retiredEpochFloor:0,retiredRanges:[]};}
  const {nonce}=await dispatch({type:'PAIA_PROMPT_INSERTION_RECEIVER_PROBE',version:1,recoveryToken});
  const message={type:{manual:'PAIA_PROMPT_INSERT_SELECTED',assist:'PAIA_PROMPT_ASSIST_INSERT',next:'PAIA_PROMPT_NEXT_INSERT'}[lane],operationId,text,url:location.href,...fields};
  const envelope={version:1,claimId:webcrypto.randomUUID(),actionId,operationId,receiptEpoch:token,domainDigest:domain,epoch,lane,receiver:{...receiver,nonce},sourceDigest:'1'.repeat(64),authorizationDigest:'2'.repeat(64),initiatorDigest:'3'.repeat(64)};
  envelope.digest=await promptInsertionDigest({domain:'paia-prompt-insertion-v1',envelope,message});
  assert.equal(validPromptInsertionEnvelope(envelope),true);
  return {...message,insertionReceipt:envelope};
 };
 return {async binding(){const {nonce}=await this.probe();return {receiver:{...receiver,nonce},ownerToken,domainDigest:registrationDomain,challenge:webcrypto.randomUUID()};},expire(){now+=30000;for(const fn of [...deadlineTimers.values()])fn();},document,node,text,context,adapter,reload,commands,commandEntered,messages,location,selection,dispatch,probe:()=>dispatch({type:'PAIA_PROMPT_INSERTION_RECEIVER_PROBE',version:1,recoveryToken}),admitted,receiptEpoch,domainDigest,setRegistration(fn){registrationHandler=fn;},setRpc(fn){rpcHandler=fn;},setProtocol(fn){protocolHandler=fn;},setSummary(value){retirementSummary=value;},qualification(value){qualified=value;},advance(ms){now+=ms;},budget(ms){remainingMs=ms;},acceptAck(value){acceptAck=value;},retiredAck(value){retiredAck=value;},changeOwnerToken(){ownerToken=webcrypto.randomUUID();originalActionCount=0;recoveryToken=webcrypto.randomUUID();return ownerToken;},setNativeTrusted(value){trusted=value;},insert(adapter,message,extra={}){return adapter.insert({text:message.text,operationId:message.operationId,url:message.url,lane:message.insertionReceipt.lane,insertionMessage:message,...extra});},hold(){hold=true;},async release(){hold=false;for(const fn of timers.splice(0))fn();await flush();},request(fields={}){return {text:'SYNTHETIC insertion',operationId:webcrypto.randomUUID(),url:location.href,...fields};}};
}

import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function sdkEvent(){const listeners=new Set();return {addListener(fn){listeners.add(fn);},removeListener(fn){listeners.delete(fn);},emit(...args){for(const fn of [...listeners])fn(...args);},listeners};}
async function inventory(t,{count=2}={}){
 const {s,storage}=await setup(OrganizerStore);await s.finishFoundation();
 const docs=Array.from({length:count},(_,i)=>{const tabId=i+7,documentId='synthetic-top-'+tabId,f=fixture({tabId,documentId}),adapter=f.adapter();return {tabId,documentId,f,adapter};});
 const outbound=[],state={query:null,script:null,send:null,get:null,registration:null};let owner;
 const tab=d=>({id:d.tabId,windowId:1,url:d.f.location.href,incognito:false,discarded:false,frozen:false});
 const api={runtime:{id:'synthetic-extension'},storage:{local:storage},tabs:{onCreated:sdkEvent(),onRemoved:sdkEvent(),onReplaced:sdkEvent(),onUpdated:sdkEvent(),query:async request=>{assert.deepEqual(request,{url:['https://chatgpt.com/*']});const result=docs.map(tab);return state.query?state.query(result):result;},get:async id=>{const d=docs.find(d=>d.tabId===id);if(!d)throw Error('missing synthetic tab');const result=tab(d);return state.get?state.get(id,result):result;},sendMessage:async(id,message,options)=>{const d=docs.find(d=>d.tabId===id);assert.ok(d);assert.ok(options.frameId===0||options.documentId===d.documentId);outbound.push(structuredClone(message));const actual=d.f.dispatch(structuredClone(message),{id:api.runtime.id});return state.send?state.send(d,message,actual):actual;}},scripting:{executeScript:async request=>{assert.equal(request.world,'ISOLATED');const d=docs.find(d=>d.tabId===request.target.tabId);assert.ok(d);assert.ok(request.target.frameIds?.[0]===0||request.target.documentIds?.[0]===d.documentId);assert.equal(request.files,undefined);const result=[{frameId:0,documentId:d.documentId,result:vm.runInContext('('+request.func.toString()+')()',d.f.context)}];return state.script?state.script(d,request,result):result;}}};
 owner=new PromptInsertionReceipts(s,api);
 for(const d of docs)d.f.setProtocol(async message=>{const sender={id:api.runtime.id,tab:{id:d.tabId,windowId:1},frameId:0,documentId:d.documentId,documentLifecycle:'active',url:d.f.location.href};const method={PAIA_PROMPT_INSERTION_RECEIVER_REGISTER:'registerReceiver',PAIA_PROMPT_INSERTION_RECONCILE:'handleReconcile',PAIA_PROMPT_INSERTION_ACK:'handleAck',PAIA_PROMPT_INSERTION_QUALIFY:'handleQualify'}[message.type];assert.ok(method);try{if(state.registration&&method==='registerReceiver')await state.registration(d,message,sender);return {ok:true,data:structuredClone(await owner[method](structuredClone(message),sender))};}catch(error){return {ok:false,error:error.code||'STORAGE_FAILED'};}});
 const read=()=>s.repository.transaction(false,t=>t.get('meta',PROMPT_INSERTION_RUNTIME),['meta']);
 t.after(async()=>{owner.dispose();for(const d of docs)d.adapter.dispose();await flush();s.repository.db?.close();});
 return {s,owner,docs,api,state,outbound,read,tab};
}
test('actual original owner discovers two unregistered top documents and holds the exact complete current inventory',async t=>{
 const p=await inventory(t),before=await p.read(),token=await p.owner.holdCurrentTopDocumentsForApplicationSelection();
 assert.equal(p.owner.currentTopDocumentsHeldForApplicationSelection(token),true);
 assert.equal(await p.owner.fenceCurrentTopDocumentsForApplicationSelection(token),true);
 assert.equal(await p.owner.releaseCurrentTopDocumentsForApplicationSelection(token),true);
 assert.equal(await p.owner.releaseCurrentTopDocumentsForApplicationSelection(token),false);
 assert.deepEqual(await p.read(),before);assert.equal((await p.owner.inspect()).legacyCoverageUnknown,true);
 assert.equal(p.docs.reduce((n,d)=>n+d.f.commands.length,0),0);
 assert.equal(p.outbound.filter(m=>m.type.endsWith('_HOLD')).length,2);
 assert.equal(p.outbound.filter(m=>m.type.endsWith('_RELEASE')).length,2);
});
