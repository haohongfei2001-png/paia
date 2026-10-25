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
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {PromptReuseCommands} from '../background/prompt-reuse-commands.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function sdkEvent(){const listeners=new Set();return {addListener(fn){listeners.add(fn);},removeListener(fn){listeners.delete(fn);},emit(...args){for(const fn of [...listeners])fn(...args);},listeners};}
async function inventory(t,{count=2}={}){
 const {s,storage}=await setup(OrganizerStore);await s.finishFoundation();
 const docs=Array.from({length:count},(_,i)=>{const tabId=i+7,documentId='synthetic-top-'+tabId,f=fixture({tabId,documentId}),adapter=f.adapter();return {tabId,documentId,f,adapter};});
 const outbound=[],state={query:null,script:null,send:null,get:null,registration:null};let owner;
 const tab=d=>({id:d.tabId,windowId:1,url:d.f.location.href,incognito:false,discarded:false,frozen:false});
 const api={runtime:{id:'synthetic-extension',getURL:p=>'chrome-extension://synthetic-extension/'+p},windows:{get:async()=>({focused:true})},storage:{local:storage},tabs:{onCreated:sdkEvent(),onRemoved:sdkEvent(),onReplaced:sdkEvent(),onUpdated:sdkEvent(),query:async request=>{assert.deepEqual(request,{url:['https://chatgpt.com/*']});const result=docs.map(tab);return state.query?state.query(result):result;},get:async id=>{const d=docs.find(d=>d.tabId===id);if(!d)throw Error('missing synthetic tab');const result=tab(d);return state.get?state.get(id,result):result;},sendMessage:async(id,message,options)=>{const d=docs.find(d=>d.tabId===id);assert.ok(d);assert.ok(options.frameId===0||options.documentId===d.documentId);outbound.push(structuredClone(message));const actual=message.type==='PAIA_PROMPT_INSERT_SELECTED'?d.f.insert(d.adapter,structuredClone(message)):d.f.dispatch(structuredClone(message),{id:api.runtime.id});const response=await (state.send?state.send(d,message,actual):actual);return response===undefined?undefined:structuredClone(response);}},scripting:{executeScript:async request=>{assert.equal(request.world,'ISOLATED');const d=docs.find(d=>d.tabId===request.target.tabId);assert.ok(d);assert.ok(request.target.frameIds?.[0]===0||request.target.documentIds?.[0]===d.documentId);assert.equal(request.files,undefined);const result=[{frameId:0,documentId:d.documentId,result:structuredClone(vm.runInContext('('+request.func.toString()+')()',d.f.context))}];return state.script?state.script(d,request,result):result;}}};
 owner=new PromptInsertionReceipts(s,api);let cap;const register=owner.registerProducer;owner.registerProducer=function(...args){cap=register.apply(this,args);return cap;};const producer=new PromptReuseCommands(new PromptReuseService(s),api,{insertionReceipts:owner});delete owner.registerProducer;
 for(const d of docs)d.f.setProtocol(async message=>{const sender={id:api.runtime.id,tab:{id:d.tabId,windowId:1},frameId:0,documentId:d.documentId,documentLifecycle:'active',url:d.f.location.href};const method={PAIA_PROMPT_INSERTION_RECEIVER_REGISTER:'registerReceiver',PAIA_PROMPT_INSERTION_RECONCILE:'handleReconcile',PAIA_PROMPT_INSERTION_ACK:'handleAck',PAIA_PROMPT_INSERTION_QUALIFY:'handleQualify'}[message.type];assert.ok(method);try{if(state.registration&&method==='registerReceiver')await state.registration(d,message,sender);return {ok:true,data:structuredClone(await owner[method](structuredClone(message),sender))};}catch(error){return {ok:false,error:error.code||'STORAGE_FAILED'};}});
 const read=()=>s.repository.transaction(false,t=>t.get('meta',PROMPT_INSERTION_RUNTIME),['meta']);
 t.after(async()=>{owner.dispose();producer.dispose();for(const d of docs)d.adapter.dispose();await flush();s.repository.db?.close();});
 const dispatch=async(d=docs[0])=>{const receiver=await owner.resolveReceiver(d.tabId,d.f.location.href,d.documentId),binding={receiptEpoch:owner.admissionEpoch(cap),receiver,sourceDigest:await owner.digest(['inventory','source']),authorizationDigest:await owner.digest(['inventory','consent']),initiatorDigest:await owner.digest(['inventory',crypto.randomUUID()])},action=await owner.issueAction(cap,binding);return owner.dispatch(cap,{action,...Object.fromEntries(['sourceDigest','authorizationDigest','initiatorDigest'].map(key=>[key,binding[key]])),receiver,message:{type:'PAIA_PROMPT_INSERT_SELECTED',text:'SYNTHETIC original inventory insertion',url:d.f.location.href,operationId:action.operationId}},async()=>{});};return {s,owner,docs,api,state,outbound,read,tab,dispatch};
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
for(const mode of ['empty','duplicate','frozen','discarded','incognito','wrong-origin'])test('complete current inventory refuses '+mode+' without silently dropping a member',async t=>{
 const p=await inventory(t);p.state.query=rows=>mode==='empty'?[]:mode==='duplicate'?[rows[0],rows[0]]:rows.map((row,i)=>i?row:{...row,...(mode==='wrong-origin'?{url:'https://example.invalid/'}:{[mode]:true})});
 await assert.rejects(p.owner.holdCurrentTopDocumentsForApplicationSelection());assert.equal(p.outbound.filter(m=>m.type.endsWith('_HOLD')).length,0);assert.equal(p.docs.reduce((n,d)=>n+d.f.commands.length,0),0);
});
for(const mode of ['missing-document','duplicate-frame','wrong-frame','document-changed'])test('browser document identity refuses '+mode,async t=>{
 const p=await inventory(t);p.state.script=(_d,request,rows)=>mode==='missing-document'?[{...rows[0],documentId:''}]:mode==='duplicate-frame'?[rows[0],rows[0]]:mode==='wrong-frame'?[{...rows[0],frameId:1}]:request.target.documentIds?[{...rows[0],documentId:'changed-document'}]:rows;
 await assert.rejects(p.owner.holdCurrentTopDocumentsForApplicationSelection());assert.equal(p.outbound.filter(m=>m.type.endsWith('_HOLD')).length,0);
});
test('old protocol reply refuses enrollment and never receives a HOLD',async t=>{
 const p=await inventory(t);p.state.send=async(_d,message,actual)=>{const reply=await actual;return message.type==='PAIA_PROMPT_INSERTION_RECEIVER_PROBE'?{version:reply.version,nonce:reply.nonce}:reply;};
 await assert.rejects(p.owner.holdCurrentTopDocumentsForApplicationSelection(),{code:'PROMPT_PAGE_REFRESH_REQUIRED'});assert.equal(p.outbound.filter(m=>m.type.endsWith('_HOLD')).length,0);assert.equal((await p.owner.inspect()).legacyCoverageUnknown,true);
});
for(const event of ['onCreated','onRemoved','onReplaced','onUpdated'])test('original '+event+' synchronously invalidates a ready inventory before worker-ready continuations',async t=>{
 const p=await inventory(t),token=await p.owner.holdCurrentTopDocumentsForApplicationSelection();p.api.tabs[event].emit(7,{status:'loading'});assert.equal(p.owner.currentTopDocumentsHeldForApplicationSelection(token),false);await assert.rejects(p.owner.fenceCurrentTopDocumentsForApplicationSelection(token));await flush();assert.equal(p.docs.reduce((n,d)=>n+d.f.commands.length,0),0);
});
test('changed final query refuses and cleans only already attempted exact HOLDs',async t=>{
 const p=await inventory(t);let queries=0;p.state.query=rows=>++queries===1?rows:rows.slice(1);let failure;try{await p.owner.holdCurrentTopDocumentsForApplicationSelection();assert.fail();}catch(error){failure=error;}
 await flush();assert.equal(p.outbound.filter(m=>m.type.endsWith('_HOLD')).length,2);assert.equal(await p.owner.releaseFailedCurrentTopDocumentsForApplicationSelection(failure),true);assert.equal(p.outbound.filter(m=>m.type.endsWith('_RELEASE')).length,2);assert.equal((await p.owner.inspect()).legacyCoverageUnknown,true);
});
test('same tab new document at final enumeration refuses without replay',async t=>{
 const p=await inventory(t);let queries=0;p.state.query=rows=>{queries++;return rows;};p.state.script=(_d,_r,rows)=>queries>1?[{...rows[0],documentId:'replacement-document'}]:rows;
 await assert.rejects(p.owner.holdCurrentTopDocumentsForApplicationSelection());await flush();assert.equal(p.outbound.filter(m=>m.type.endsWith('_HOLD')).length,2);assert.equal(p.docs.reduce((n,d)=>n+d.f.commands.length,0),0);
});
test('private enrollment refuses another sender and unrelated public resolve while its original registration awaits',async t=>{
 const p=await inventory(t),entered=deferred(),done=deferred();let original;
 p.state.registration=async(d,message,sender)=>{if(!original){original={d,message,sender};entered.resolve();await done.promise;}};
 const acquire=p.owner.holdCurrentTopDocumentsForApplicationSelection();acquire.catch(()=>{});await entered.promise;
 await assert.rejects(p.owner.registerReceiver(original.message,{...original.sender,documentId:'wrong-original-document'}),{code:'PROMPT_INSERTION_HELD'});
 await assert.rejects(p.owner.resolveReceiver(7,p.docs[0].f.location.href),{code:'PROMPT_INSERTION_HELD'});
 await assert.rejects(p.owner.registerReceiver({...original.message,recoveryToken:crypto.randomUUID()},original.sender),{code:'PROMPT_INSERTION_HELD'});
 done.resolve();const token=await acquire;assert.equal(p.owner.currentTopDocumentsHeldForApplicationSelection(token),true);assert.equal(await p.owner.releaseCurrentTopDocumentsForApplicationSelection(token),true);
});
test('original registration final await rechecks event identity and cannot enroll a navigated document',async t=>{
 const p=await inventory(t),entered=deferred(),done=deferred();let held=false;
 p.state.registration=async()=>{if(!held){held=true;entered.resolve();await done.promise;}};
 const acquire=p.owner.holdCurrentTopDocumentsForApplicationSelection();acquire.catch(()=>{});await entered.promise;p.api.tabs.onUpdated.emit(7,{url:'https://chatgpt.com/c/replaced'});done.resolve();await assert.rejects(acquire);await flush();assert.equal(p.outbound.filter(m=>m.type.endsWith('_HOLD')).length,0);
});
test('missing inventory SDK capability refuses only this profile and leaves original receipt resolution usable',async t=>{
 const p=await inventory(t);delete p.api.scripting;await assert.rejects(p.owner.holdCurrentTopDocumentsForApplicationSelection(),{code:'PROMPT_INSERTION_CAPABILITY'});const receiver=await p.owner.resolveReceiver(7,p.docs[0].f.location.href,p.docs[0].documentId);assert.equal(receiver.documentId,p.docs[0].documentId);
});
test('actual UTF8 identity budget rejects oversized inventory before any HOLD',async t=>{
 const p=await inventory(t);p.docs[0].f.location.href='https://chatgpt.com/c/'+('界'.repeat(800000));await assert.rejects(p.owner.holdCurrentTopDocumentsForApplicationSelection(),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(p.outbound.length,0);
});
test('multiple individually bounded URLs share one cumulative original inventory allowance',async t=>{
 const p=await inventory(t);for(const d of p.docs)d.f.location.href='https://chatgpt.com/c/'+d.tabId+'x'.repeat(400000);await assert.rejects(p.owner.holdCurrentTopDocumentsForApplicationSelection(),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(p.outbound.filter(m=>m.type.endsWith('_HOLD')).length,0);
});
test('late original query after deadline cannot reopen admission or invent document cleanup',async t=>{
 const p=await inventory(t),entered=deferred(),done=deferred();p.state.query=async rows=>{entered.resolve();await done.promise;return rows;};t.mock.timers.enable({apis:['setTimeout']});
 const acquire=p.owner.holdCurrentTopDocumentsForApplicationSelection();acquire.catch(()=>{});await entered.promise;t.mock.timers.tick(30001);let failure;try{await acquire;assert.fail();}catch(error){failure=error;}
 assert.equal(await p.owner.releaseFailedCurrentTopDocumentsForApplicationSelection(failure),false);done.resolve();await flush();assert.equal(await p.owner.releaseFailedCurrentTopDocumentsForApplicationSelection(failure),false);await assert.rejects(p.owner.resolveReceiver(7,p.docs[0].f.location.href),{code:'PROMPT_INSERTION_HELD'});assert.equal(p.outbound.length,0);t.mock.timers.reset();
});
test('late actual VM HOLD receives one exact RELEASE after actual settlement and remains timed out',async t=>{
 const p=await inventory(t),entered=deferred(),done=deferred();p.state.send=async(_d,message,actual)=>{const reply=await actual;if(message.type.endsWith('_HOLD')){entered.resolve();await done.promise;}return reply;};t.mock.timers.enable({apis:['setTimeout']});
 const acquire=p.owner.holdCurrentTopDocumentsForApplicationSelection();acquire.catch(()=>{});await entered.promise;t.mock.timers.tick(30001);let failure;try{await acquire;assert.fail();}catch(error){failure=error;}
 assert.equal(p.outbound.filter(m=>m.type.endsWith('_RELEASE')).length,0);done.resolve();await flush();assert.equal(p.outbound.filter(m=>m.type.endsWith('_RELEASE')).length,1);assert.equal(await p.owner.releaseFailedCurrentTopDocumentsForApplicationSelection(failure),false);t.mock.timers.reset();
});
test('dispose unregisters only its exact original topology listeners',async t=>{
 const p=await inventory(t),foreign=()=>{};for(const name of ['onCreated','onRemoved','onReplaced','onUpdated'])p.api.tabs[name].addListener(foreign);p.owner.dispose();for(const name of ['onCreated','onRemoved','onReplaced','onUpdated'])assert.deepEqual([...p.api.tabs[name].listeners],[foreign]);
});

test('extra genuinely registered receiver missing from the current query is not deleted to manufacture completeness',async t=>{
 const p=await inventory(t,{count:3}),extra=p.docs[2];await p.owner.resolveReceiver(extra.tabId,extra.f.location.href,extra.documentId);p.state.query=rows=>rows.slice(0,2);await assert.rejects(p.owner.holdCurrentTopDocumentsForApplicationSelection());assert.equal(p.outbound.filter(m=>m.type.endsWith('_HOLD')).length,0);
});
test('genuine ambiguous native outcome and durable pending remain unchanged after current-top refusal',async t=>{
 const p=await inventory(t,{count:1});p.docs[0].f.setNativeTrusted(false);assert.equal((await p.dispatch()).status,'uncertain');await flush();const before=await p.read();assert.equal(before.claims[0].state,'pending');assert.equal(p.docs[0].f.commands.length,1);
 await assert.rejects(p.owner.holdCurrentTopDocumentsForApplicationSelection());await flush();assert.deepEqual(await p.read(),before);assert.equal(p.docs[0].f.commands.length,1);assert.equal((await p.owner.inspect()).legacyCoverageUnknown,true);
});
test('genuine prior terminal ACK remains intact through current-top inventory and release',async t=>{
 const p=await inventory(t,{count:1});assert.equal((await p.dispatch()).status,'inserted');await flush();const before=await p.read();assert.equal(before.claims[0].state,'inserted');const token=await p.owner.holdCurrentTopDocumentsForApplicationSelection();assert.equal(p.owner.currentTopDocumentsHeldForApplicationSelection(token),true);assert.equal(await p.owner.releaseCurrentTopDocumentsForApplicationSelection(token),true);assert.deepEqual(await p.read(),before);assert.equal(p.docs[0].f.commands.length,1);
});
test('public known-subset APIs cannot consume a current-top token or release its inventory hold',async t=>{
 const p=await inventory(t),token=await p.owner.holdCurrentTopDocumentsForApplicationSelection();assert.equal(p.owner.knownDocumentsHeldForApplicationSelection(token),false);await assert.rejects(p.owner.fenceKnownDocumentsForApplicationSelection(token));assert.equal(await p.owner.releaseKnownDocumentsForApplicationSelection(token),false);assert.equal(p.owner.currentTopDocumentsHeldForApplicationSelection(token),true);assert.equal(p.outbound.filter(m=>m.type.endsWith('_RELEASE')).length,0);
 assert.equal(await p.owner.releaseCurrentTopDocumentsForApplicationSelection(token),true);
});
test('failed current-top inventory is not releasable through the subset error channel',async t=>{
 const p=await inventory(t);let queries=0;p.state.query=rows=>++queries===1?rows:rows.slice(1);let failure;try{await p.owner.holdCurrentTopDocumentsForApplicationSelection();assert.fail();}catch(error){failure=error;}
 await flush();assert.equal(await p.owner.releaseFailedKnownDocumentsForApplicationSelection(failure),false);await assert.rejects(p.owner.resolveReceiver(7,p.docs[0].f.location.href),{code:'PROMPT_INSERTION_HELD'});assert.equal(await p.owner.releaseFailedCurrentTopDocumentsForApplicationSelection(failure),true);
});
test('changed top inventory cannot be requalified by calling the subset fence',async t=>{
 const p=await inventory(t),token=await p.owner.holdCurrentTopDocumentsForApplicationSelection();p.state.query=rows=>rows.slice(1);await assert.rejects(p.owner.fenceKnownDocumentsForApplicationSelection(token));await assert.rejects(p.owner.fenceCurrentTopDocumentsForApplicationSelection(token));assert.equal(p.owner.currentTopDocumentsHeldForApplicationSelection(token),false);
});
