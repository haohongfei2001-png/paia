import test from 'node:test';
import assert from 'node:assert/strict';
import {NextPromptCommands} from '../background/prompt-next.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
async function fixture(){
 const url='https://chatgpt.com/c/reopen-fixture',stored={},sends=[],entered=deferred(),idle=deferred();
 let consented=true,binding={url,conversation:'/c/reopen-fixture',cycle:1,replyId:'reply-1',revision:1};
 const api={runtime:{id:'extension',getURL:p=>'chrome-extension://extension/'+p,sendMessage:async()=>{}},storage:{session:{get:async()=>({...stored}),set:async x=>Object.assign(stored,x)}},tabs:{get:async()=>({id:1,url,incognito:false}),query:async()=>[],sendMessage:async(id,message,options)=>{sends.push({id,message,options});if(message.type==='PAIA_PROMPT_NEXT_PROBE')return {authorization:(await commands.authorization()).generation,binding:{...binding},idle:true};return {opened:true};}}};
 const commands=new NextPromptCommands({s:{status:async()=>({consented})}},api,{isIdle:async id=>{assert.equal(id,1);entered.resolve();return idle.promise;}});
 const popup={id:'extension',url:api.runtime.getURL('ui/popup.html')};
 const configure=enabled=>commands.handle({type:'PAIA_PROMPT_NEXT_CONFIGURE',enabled},popup);
 await configure(true);
 const offer=await commands.handle({type:'PAIA_PROMPT_NEXT_OFFER',binding:{...binding},authorization:(await commands.authorization()).generation,snapshot:{completed:true,text:'回复“继续”。',blocks:1,excluded:false}},{id:'extension',url,tab:{id:1},frameId:0,documentId:'document-1',documentLifecycle:'active'});
 assert.equal(offer.available,true);
 return {commands,offer,entered,idle,configure,sends,reopens:()=>sends.filter(x=>x.message.type==='PAIA_PROMPT_NEXT_REOPEN'),replaceReply(){binding={...binding,replyId:'reply-2',revision:2};},revokeConsent(){consented=false;}};
}
for(const boundary of ['authorization revoked','current reply replaced','capture consent revoked'])test('next_reopen rejects '+boundary+' while real idle probe is pending',async()=>{
 const f=await fixture(),pending=f.commands.card({type:'next_reopen'},{id:1});
 await f.entered.promise;assert.equal(f.reopens().length,0);
 if(boundary==='authorization revoked')await f.configure(false);
 else if(boundary==='current reply replaced')f.replaceReply();
 else f.revokeConsent();
 f.idle.resolve(true);
 const result=await pending.then(value=>({value}),error=>({error}));
 assert.equal(f.reopens().length,0,'stale candidate must never be dispatched to its document');
 assert.equal(result.error?.code,'FORBIDDEN','stale reopen fails closed');
});
test('next_reopen dispatches the unchanged current candidate once after idle resolves',async()=>{
 const f=await fixture(),pending=f.commands.card({type:'next_reopen'},{id:1});await f.entered.promise;assert.equal(f.reopens().length,0);f.idle.resolve(true);assert.deepEqual(await pending,{opened:true});assert.deepEqual(f.reopens(),[{id:1,message:{type:'PAIA_PROMPT_NEXT_REOPEN',id:f.offer.id},options:{documentId:'document-1'}}]);
});
