import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createHash,webcrypto} from 'node:crypto';

// NEW main-bound mechanism controls. Execute the COMPLETE current classic
// adapter, with unchanged host clock/timers and a synthetic editable DOM. No
// registration/receipt/ACK is invented: positive registered HOLD/FENCE belongs
// to the separate actual complete-owner test. These tests only exercise legacy
// behavior and negative empty-inventory admission before any worker RPC.
const adapterURL=new URL('../adapter/chatgpt-composer.js',import.meta.url);
const source=await readFile(adapterURL,'utf8');
const provenance={path:adapterURL.href,sha256:createHash('sha256').update(source).digest('hex'),completeSource:true,sourceTransforms:false,clock:'unchanged host performance.now/setTimeout',dom:'synthetic; not native-browser qualification'};
const deferred=()=>{let resolve;const promise=new Promise(yes=>{resolve=yes;});return {promise,resolve};};
function events(){const listeners=new Map();return {addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);},emit(type,event){for(const fn of [...listeners.get(type)??[]])fn(event);}};}
function documentFixture({unknownPredecessor=false}={}){
 const commands=[],rpc=[],listeners=new Set(),entered=deferred();
 const document={...events(),activeElement:null},location={origin:'https://chatgpt.com',href:'https://chatgpt.com/c/SYNTHETIC-main-adapter'};
 const root={nodeType:1,tagName:'HTML',parentElement:null},text={nodeType:3,data:'abc'};
 const node={...events(),nodeType:1,tagName:'DIV',isConnected:true,isContentEditable:true,parentElement:root,childNodes:[text],querySelector:()=>null,closest:()=>null,getClientRects:()=>[{}],getBoundingClientRect:()=>({width:500,height:100}),classList:{contains:()=>false},contains:value=>value===node||value===text,focus:()=>{document.activeElement=node;}};
 Object.assign(text,{parentNode:node,parentElement:node});
 const logical=(container,offset)=>container===text?offset:offset?text.data.length:0;
 const makeRange=()=>({startContainer:text,endContainer:text,startOffset:0,endOffset:0,setStart(container,offset){this.startContainer=container;this.startOffset=offset;},collapse(){this.endContainer=this.startContainer;this.endOffset=this.startOffset;},compareBoundaryPoints(_,other){return Math.sign(logical(this.startContainer,this.startOffset)-logical(other.startContainer,other.startOffset));}});
 let range=makeRange();range.setStart(text,1);range.collapse();
 const selection={rangeCount:1,getRangeAt:()=>range,removeAllRanges(){this.rangeCount=0;},addRange(value){range=value;this.rangeCount=1;}};
 Object.assign(document,{documentElement:root,defaultView:{...events(),getComputedStyle:()=>({display:'block',visibility:'visible',contentVisibility:'visible',opacity:'1'})},querySelectorAll:()=>[node],createRange:makeRange,getSelection:()=>selection,execCommand(command,_,insertion){commands.push({command,insertion});const offset=logical(range.startContainer,range.startOffset);text.data=text.data.slice(0,offset)+insertion+text.data.slice(offset);range=makeRange();range.setStart(text,offset+insertion.length);range.collapse();const event={isTrusted:true,inputType:'insertText',isComposing:false,target:node};node.emit('input',event);document.emit('input',event);entered.resolve();return true;}});
 const runtime={id:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',onMessage:{addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn)},sendMessage:async message=>{rpc.push(structuredClone(message));throw Error('NO_WORKER_REGISTRATION_AUTHORIZED_IN_NEGATIVE_CONTROL');}};
 const context=vm.createContext({document,location,crypto:webcrypto,TextEncoder,queueMicrotask,performance:globalThis.performance,setTimeout,clearTimeout,chrome:{runtime},...(unknownPredecessor?{PAIAChatGPTComposerAdapter:function UnknownPredecessor(){}}:{})});context.top=context;
 const reload=()=>vm.runInContext(source,context,{filename:adapterURL.href});reload();
 const adapters=[],construct=()=>{const adapter=new context.PAIAChatGPTComposerAdapter({document,location});adapters.push(adapter);return adapter;};
 const dispatch=(message,sender={id:runtime.id})=>new Promise((resolve,reject)=>{let answered=false,asynchronous=false;try{for(const listener of listeners)if(listener(message,sender,value=>{answered=true;resolve(value);})===true)asynchronous=true;if(!answered&&!asynchronous)resolve(undefined);}catch(error){reject(error);}});
 const probe=()=>dispatch({type:'PAIA_PROMPT_INSERTION_RECEIVER_PROBE',version:1,recoveryToken:webcrypto.randomUUID()});
 const request=text=>({text,operationId:webcrypto.randomUUID(),url:location.href});
 return {document,location,text,commands,rpc,entered,construct,dispatch,probe,request,reload,close(){document.defaultView.emit('pagehide',{});for(const adapter of adapters)adapter.dispose();}};
}
function fixture(t,options){const f=documentFixture(options);t.after(()=>{f.close();t.diagnostic('MAIN_BOUND_ADAPTER '+JSON.stringify({provenance,commands:f.commands,workerRPC:f.rpc.length}));});return f;}

test('main legacy insert replay and direct once preserve original editing behavior; history survives reconstruction',async t=>{
 const f=fixture(t),adapter=f.construct(),request=f.request('X');
 const inserted=await adapter.insert(request);assert.equal(inserted.status,'inserted');assert.equal(inserted.verified,true);assert.equal(f.text.data,'aXbc');
 const replay=await adapter.insert(request);assert.equal(replay.status,'inserted');assert.equal(replay.replayed,true);assert.equal(f.commands.length,1);
 const once=await adapter.once('Y',f.location.href);assert.equal(once.status,'inserted');assert.equal(f.text.data,'aXYbc');assert.equal(f.commands.length,2);
 assert.equal(await f.probe(),null,'legacy history cannot be advertised as empty');
 adapter.dispose();f.reload();f.construct();assert.equal(await f.probe(),null,'same-document reconstruction/re-evaluation cannot erase history');assert.equal(f.rpc.length,0);
});

test('even a rejected legacy request permanently refuses the empty-inventory profile',async t=>{
 const f=fixture(t),adapter=f.construct();
 const result=await adapter.insert({...f.request('X'),operationId:'invalid'});assert.equal(result.status,'failed');assert.equal(result.reason,'invalid_request');assert.equal(f.commands.length,0);
 adapter.dispose();f.construct();assert.equal(await f.probe(),null);assert.equal(f.rpc.length,0);
});

test('pending original once never advertises empty inventory or starts a concurrent edit',async t=>{
 const f=fixture(t),adapter=f.construct();let settled=false;
 const pending=adapter.once('P',f.location.href).then(value=>{settled=true;return value;});
 await f.entered.promise;assert.equal(settled,false,'real native-result delay is still pending');
 assert.equal(await f.probe(),null);const overlapping=await adapter.once('Q',f.location.href);assert.equal(overlapping.status,'failed');assert.equal(overlapping.reason,'busy');assert.equal(f.commands.length,1);
 const result=await pending;assert.equal(result.status,'inserted');assert.equal(await f.probe(),null);assert.equal(f.rpc.length,0);
});

test('invalid document challenges and an unknown predecessor cannot create an empty-inventory proof',async t=>{
 const f=fixture(t),adapter=f.construct();
 const message={version:1,receiver:{tabId:1,windowId:1,documentId:'SYNTHETIC-unregistered',nonce:webcrypto.randomUUID()},ownerToken:webcrypto.randomUUID(),domainDigest:'1'.repeat(64),challenge:'invalid'};
 for(const type of ['PAIA_PROMPT_INSERTION_DOCUMENT_HOLD','PAIA_PROMPT_INSERTION_DOCUMENT_FENCE','PAIA_PROMPT_INSERTION_DOCUMENT_RELEASE']){const reply=await f.dispatch({type,...message});assert.equal(reply.held,false);}
 assert.equal((await adapter.once('Z',f.location.href)).status,'inserted','malformed challenge did not install a hold');assert.equal(f.rpc.length,0);
 const prior=fixture(t,{unknownPredecessor:true});prior.construct();assert.equal(await prior.probe(),null);assert.equal(prior.rpc.length,0);
});
