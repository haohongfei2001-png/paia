import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const sources=await Promise.all(['adapter/chatgpt-current-reply.js','content/assist-result-runtime.js','content/prompt-assist.js'].map(p=>readFile(new URL('../'+p,import.meta.url),'utf8')));
async function fixture({enabled=true}={}){
 let now=0,generation='synthetic-generation',auth=enabled,reads=0,inserted=0,send=0;
 const calls=[],observers=[],messages=[],changes=[],events=new Map(),timers=new Map();let timerId=0;
 const element=(tag,children=[])=>({nodeType:1,isConnected:true,childNodes:children,getClientRects:()=>[{}],closest:()=>null,contains:()=>false,matches:s=>s.split(',').some(x=>x===tag)});
 const body=element('div',[element('p',[{nodeType:3,data:'SYNTHETIC current reply.'}])]);
 const node=()=>({...element('div'),querySelectorAll:()=>[body]});
 const url='https://chatgpt.com/c/synthetic',state={url,latest:node(),replyId:'reply-old',userId:'user-1',signature:'1:user-1',streaming:false,complete:true,uncertain:false};
 const win={addEventListener:(k,f)=>events.set(k,f),removeEventListener:()=>{}},document={documentElement:element('html'),hidden:false,defaultView:win,addEventListener:(k,f)=>events.set(k,f),removeEventListener:()=>{}};
 class Observer{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){}takeRecords(){return [];}}
 const context=vm.createContext({document,location:{href:url,origin:'https://chatgpt.com',pathname:'/c/synthetic'},window:win,MutationObserver:Observer,TextEncoder,performance:{now:()=>now},setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),chrome:{runtime:{id:'synthetic-extension',onMessage:{addListener:fn=>messages.push(fn),removeListener:()=>{}},sendMessage:async r=>{calls.push(r);return {ok:true,data:r.type==='PAIA_PROMPT_ASSIST_STATUS'?{replyAccess:auth,remoteProcessing:auth,generation,serviceAvailable:true}:{qualified:true,generation}};}},storage:{onChanged:{addListener:fn=>changes.push(fn),removeListener:()=>{}}}}});
 vm.runInContext(sources[0],context);context.PAIAChatGPTCurrentReplyAdapter.prototype.inspect=()=>state;
 const snapshot=context.PAIAChatGPTCurrentReplyAdapter.prototype.snapshot;context.PAIAChatGPTCurrentReplyAdapter.prototype.snapshot=function(){reads++;return snapshot.call(this);};
 context.PAIAChatGPTComposerAdapter=class{find(){return null;}dispose(){}insert(r){if(!r.guard())return {status:'failed'};inserted++;return {status:'inserted',verified:true};}send(){send++;}};
 vm.runInContext(sources[1],context);vm.runInContext(sources[2],context);await new Promise(setImmediate);
 const scan=()=>{for(const o of observers)o.fn([]);};
 const message=(r,s={id:'synthetic-extension'})=>new Promise(resolve=>{let answered=false;for(const f of messages){const value=f(r,s,v=>{answered=true;resolve(v);});if(value===true)return;}if(!answered)resolve(undefined);});
 const complete=()=>{now=10;state.streaming=true;state.complete=false;scan();now=20;state.latest=node();state.replyId='reply-new';scan();now=30;state.streaming=false;state.complete=true;scan();now=700;scan();};
 return {context,state,calls,complete,scan,message,events,reads:()=>reads,inserted:()=>inserted,send:()=>send,generation:()=>generation,auth:async value=>{auth=value;generation+='-next';await message({type:'PAIA_PROMPT_ASSIST_AUTH_CHANGED'});await new Promise(setImmediate);}};
}
test('actual content bridge observes newly completed metadata but ordinary completion/card reads perform zero body snapshots or paid requests',async()=>{
 const f=await fixture();assert.equal((await f.message({type:'PAIA_PROMPT_ASSIST_PROBE',generation:f.generation(),snapshot:true})).ready,undefined);assert.equal(f.reads(),0,'old final reply is not captured');
 f.complete();const metadata=await f.message({type:'PAIA_PROMPT_ASSIST_PROBE',generation:f.generation(),snapshot:false});assert.equal(metadata.ready,true);assert.equal(f.reads(),0);
 assert.ok(f.calls.every(r=>['PAIA_PROMPT_ASSIST_STATUS','PAIA_PROMPT_ASSIST_INVALIDATE','PAIA_PROMPT_ASSIST_READY'].includes(r.type)));
 const snapshot=await f.message({type:'PAIA_PROMPT_ASSIST_PROBE',generation:f.generation(),snapshot:true});assert.equal(snapshot.snapshot.text.trim(),'SYNTHETIC current reply.');assert.equal(f.reads(),1);assert.equal(f.calls.some(r=>'snapshot'in r||'reply'in r),false);
});
test('actual bridge uses original final qualification and insertion controller, presents conditions, never sends',async()=>{
 const f=await fixture();f.complete();const {binding}=await f.message({type:'PAIA_PROMPT_ASSIST_PROBE',generation:f.generation()});const request={type:'PAIA_PROMPT_ASSIST_INSERT',generation:f.generation(),id:'synthetic-result',operationId:'synthetic-operation',binding,text:'SYNTHETIC suggestion.',condition:'If wanted.',conditionPresented:false};
 assert.equal((await f.message(request)).status,'failed');assert.equal(f.inserted(),0);assert.equal((await f.message({...request,conditionPresented:true})).status,'inserted');assert.equal(f.inserted(),1);assert.equal(f.send(),0);assert.equal(f.calls.filter(r=>r.type==='PAIA_PROMPT_ASSIST_QUALIFY').length,1);
 await f.auth(false);assert.equal((await f.message({...request,conditionPresented:true})).status,'failed');assert.equal(f.inserted(),1);
});
test('revocation/re-enable and worker generation change cannot reinterpret current historical reply',async()=>{
 const f=await fixture();f.complete();await f.auth(false);await f.auth(true);const result=await f.message({type:'PAIA_PROMPT_ASSIST_PROBE',generation:f.generation(),snapshot:true});assert.notEqual(result.ready,true);assert.equal(f.reads(),0);
 assert.equal(await f.message({type:'PAIA_PROMPT_ASSIST_PROBE',generation:f.generation(),snapshot:true},{id:'wrong-extension'}),undefined);assert.equal(f.reads(),0);
});
