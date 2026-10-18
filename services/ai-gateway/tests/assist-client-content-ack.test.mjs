import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {assistServiceFixture} from './assist-client-fixture.mjs';
import {ContextCardsService} from '../../../extension/core/context-cards.js';
const sources=await Promise.all(['adapter/chatgpt-current-reply.js','content/assist-result-runtime.js','content/prompt-assist.js'].map(p=>readFile(new URL('../../../extension/'+p,import.meta.url),'utf8')));
async function content(f){
 let now=0,inserted=0,sent=0;const observers=[],messages=[],events=new Map(),timers=new Map();let timerId=0;
 const element=(tag,children=[])=>({nodeType:1,isConnected:true,childNodes:children,getClientRects:()=>[{}],closest:()=>null,contains:()=>false,matches:s=>s.split(',').some(x=>x===tag)});
 const body=element('div',[element('p',[{nodeType:3,data:'SYNTHETIC current reply.'}])]);const node=()=>({...element('div'),querySelectorAll:()=>[body]});
 const url=f.sender.url,state={url,latest:node(),replyId:'reply-old',userId:'user-1',signature:'1:user-1',streaming:false,complete:true,uncertain:false};
 const win={addEventListener:(k,fn)=>events.set(k,fn),removeEventListener:()=>{}},document={documentElement:element('html'),hidden:false,defaultView:win,addEventListener:(k,fn)=>events.set(k,fn),removeEventListener:()=>{}};
 class Observer{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){}takeRecords(){return [];}}
 const context=vm.createContext({document,location:{href:url,origin:'https://chatgpt.com',pathname:'/c/synthetic'},window:win,MutationObserver:Observer,TextEncoder,performance:{now:()=>now},setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),chrome:{runtime:{id:f.sender.id,onMessage:{addListener:fn=>messages.push(fn),removeListener:()=>{}},sendMessage:async r=>{try{return {ok:true,data:await f.commands.handle(r,f.sender)};}catch(e){return {ok:false,error:e.code};}}},storage:{onChanged:f.api.storage.onChanged}}});
 vm.runInContext(sources[0],context);context.PAIAChatGPTCurrentReplyAdapter.prototype.inspect=()=>state;
 context.PAIAChatGPTComposerAdapter=class{find(){return null;}dispose(){}insert(r){if(!r.guard())return {status:'failed'};inserted++;return {status:'inserted',verified:true};}send(){sent++;}};
 vm.runInContext(sources[1],context);vm.runInContext(sources[2],context);await new Promise(setImmediate);
 const message=(r,s={id:f.sender.id})=>new Promise(resolve=>{let answered=false;for(const fn of messages){const value=fn(r,s,v=>{answered=true;resolve(v);});if(value===true)return;}if(!answered)resolve(undefined);});
 const old=f.api.tabs.sendMessage;f.api.tabs.sendMessage=(tab,r,...rest)=>['PAIA_PROMPT_ASSIST_PROBE','PAIA_PROMPT_ASSIST_INSERT','PAIA_PROMPT_ASSIST_AUTH_CHANGED','PAIA_CONTEXT_CARDS_CHANGED'].includes(r.type)?(assert.equal(rest[0]?.documentId,f.sender.documentId),message(r)):old(tab,r,...rest);
 const generation=(await f.commands.status()).generation;for(let i=0;i<50;i++){const ack=await message({type:'PAIA_PROMPT_ASSIST_PROBE',generation});if(ack?.generation===generation)break;await new Promise(r=>setTimeout(r,1));}
 const scan=()=>{for(const o of observers)o.fn([]);};scan();
 now=10;state.streaming=true;state.complete=false;scan();now=20;state.latest=node();state.replyId='reply-new';scan();now=30;state.streaming=false;state.complete=true;scan();now=700;scan();await new Promise(setImmediate);
 return {message,inserted:()=>inserted,sent:()=>sent};
}
test('actual content script and result controller reject Context revoke during final qualification ACK',async t=>{
 const f=await assistServiceFixture(t),cards=new ContextCardsService(f.s),id=crypto.randomUUID();await cards.change({kind:'put',card:'rules',operationId:crypto.randomUUID(),epoch:'initial',itemId:id,expectedRevision:0,body:'SYNTHETIC selected context.',section:'Synthetic'});for(const key of ['global','rules'])await cards.change({kind:'access',operationId:crypto.randomUUID(),epoch:'initial',key,expectedRevision:0,enabled:true});f.selected.push(id);
 const c=await content(f),result=await f.run();assert.equal(result.kind,'SUGGESTION');const handle=f.commands.handle.bind(f.commands);let changed=false;
 f.commands.handle=async(...args)=>{const response=await handle(...args);if(args[0].type==='PAIA_PROMPT_ASSIST_QUALIFY'&&!changed){changed=true;f.revokeContext();await f.commands.contextChanged();}return response;};
 const outcome=await f.rpc({type:'assist_insert',id:result.id,operationId:crypto.randomUUID(),conditionPresented:true});assert.equal(changed,true);assert.notEqual(outcome.status,'inserted');assert.equal(c.inserted(),0);assert.equal(c.sent(),0);
});

test('a delivered Context notification grants nothing; fresh original worker qualification can still insert an unrelated cached result',async t=>{
 const f=await assistServiceFixture(t),c=await content(f),first=await f.run();await f.commands.contextChanged();assert.equal(f.commands.views.size,0);assert.equal(c.inserted(),0);const next=await f.run();assert.equal(next.text,first.text);assert.equal(f.physical(),1);assert.ok(f.broadcasts.some(x=>x.type==='PAIA_PROMPT_ASSIST_CHANGED'));
 const outcome=await f.rpc({type:'assist_insert',id:next.id,operationId:crypto.randomUUID(),conditionPresented:true});assert.equal(outcome.status,'inserted');assert.equal(c.inserted(),1);assert.equal(c.sent(),0);
});
