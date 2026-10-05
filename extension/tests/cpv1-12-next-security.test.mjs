import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {NextPromptCommands,NEXT_AUTH_KEY} from '../background/prompt-next.js';
const url='https://chatgpt.com/c/next-fixture',nonce='11111111-1111-4111-8111-111111111111';
async function fixture(){
 const stored={},writes=[],sends=[];let consented=true,liveBinding={url,conversation:'/c/next-fixture',cycle:1,replyId:'reply-1',revision:2},insertResult={status:'inserted',verified:true};
 const api={runtime:{id:'extension',getURL:p=>'chrome-extension://extension/'+p,sendMessage:async()=>{}},storage:{session:{get:async()=>({...stored}),set:async x=>{writes.push(x);Object.assign(stored,x);}}},tabs:{get:async()=>({id:1,url,incognito:false}),query:async()=>[{id:1,url}],sendMessage:async(id,r,options)=>{sends.push({id,r,options});if(r.type==='PAIA_PROMPT_NEXT_PROBE')return {authorization:(await c.authorization()).generation,binding:liveBinding,nonce,idle:true};if(r.type==='PAIA_PROMPT_NEXT_INSERT')return insertResult;return {};}}};
 const c=new NextPromptCommands({s:{status:async()=>({consented})}},api,{isIdle:async()=>true});
 const top={id:'extension',url,tab:{id:1},frameId:0,documentId:'document-1',documentLifecycle:'active'},popup={id:'extension',url:api.runtime.getURL('ui/popup.html')},frame={id:'extension',url:api.runtime.getURL('ui/prompt-surface.html')+'#next-'+nonce,tab:{id:1},frameId:3,documentId:'private-frame'};
 const config=enabled=>c.handle({type:'PAIA_PROMPT_NEXT_CONFIGURE',enabled},popup);
 const offer=async(text='登录完成后告诉我“已登录”。')=>c.handle({type:'PAIA_PROMPT_NEXT_OFFER',binding:{...liveBinding},authorization:(await c.authorization()).generation,snapshot:{completed:true,text,blocks:1,excluded:false}},top);
 const rpc=command=>c.handle({type:'PAIA_PROMPT_NEXT_RPC',nonce,command},frame);
 return {c,api,stored,writes,sends,top,popup,frame,config,offer,rpc,setBinding:b=>{liveBinding=b;},getBinding:()=>liveBinding,setConsent:x=>{consented=x;},setInsert:r=>{insertResult=r;}};
}
test('default OFF, separate explicit popup authorization, no body admission or storage while OFF',async()=>{
 const f=await fixture();assert.equal((await f.c.authorization()).enabled,false);await assert.rejects(f.offer);assert.equal(f.c.groups.size,0);assert.equal(f.writes.length,0);
 for(const sender of [f.top,f.frame,{...f.popup,id:'host'},{...f.popup,url:f.popup.url+'?fake'}])await assert.rejects(()=>f.c.handle({type:'PAIA_PROMPT_NEXT_CONFIGURE',enabled:true},sender));
 assert.equal((await f.config(true)).enabled,true);assert.equal(f.writes.length,1);assert.deepEqual(Object.keys(f.stored[NEXT_AUTH_KEY]).sort(),['enabled','generation']);
});
test('candidate is bounded, exact, ephemeral and independently bound to source document',async()=>{
 const f=await fixture();await f.config(true);await f.offer();const view=await f.rpc({type:'get'});assert.equal(view.choices[0].text,'已登录');assert.equal(view.condition,'登录后');assert.equal(view.type,'DIRECT_REPLY');
 assert.equal(JSON.stringify([...f.c.groups.values()]).includes('登录完成后告诉我'),false);assert.equal(JSON.stringify(f.writes).includes('已登录'),false);
 const status=await f.rpc({type:'insert',id:view.choices[0].id,operationId:crypto.randomUUID()});assert.deepEqual(status,{status:'inserted',verified:true});
 const send=f.sends.find(x=>x.r.type==='PAIA_PROMPT_NEXT_INSERT');assert.equal(send.r.text,'已登录');assert.deepEqual(send.options,{documentId:'document-1'});assert.equal(Object.keys(send.r).includes('snapshot'),false);
 await assert.rejects(()=>f.rpc({type:'copy',id:view.choices[0].id}));await assert.rejects(()=>f.rpc({type:'insert',id:view.choices[0].id,operationId:crypto.randomUUID()}));
});
for(const status of ['failed','uncertain'])test(status+' insertion is one-shot; only failure permits checked copy',async()=>{
 const f=await fixture();await f.config(true);await f.offer();f.setInsert({status});const v=await f.rpc({type:'get'}),id=v.choices[0].id;
 assert.equal((await f.rpc({type:'insert',id,operationId:crypto.randomUUID()})).status,status);assert.equal((await f.rpc({type:'copy',id})).text,'已登录');await assert.rejects(()=>f.rpc({type:'insert',id,operationId:crypto.randomUUID()}));assert.equal(f.sends.filter(x=>x.r.type==='PAIA_PROMPT_NEXT_INSERT').length,1);
});
for(const change of ['replyId','revision','cycle','url','conversation'])test('stale '+change+' cannot reveal or insert candidate',async()=>{
 const f=await fixture();await f.config(true);await f.offer();const v=await f.rpc({type:'get'}),b={...f.getBinding()};b[change]=typeof b[change]==='number'?b[change]+1:b[change]+'changed';f.setBinding(b);await assert.rejects(()=>f.rpc({type:'get'}));await assert.rejects(()=>f.rpc({type:'insert',id:v.choices[0].id,operationId:crypto.randomUUID()}));assert.equal(f.sends.some(x=>x.r.type==='PAIA_PROMPT_NEXT_INSERT'),false);
});
test('revoke blocks late offer, clears candidates, and re-enable creates a different authorization',async()=>{
 const f=await fixture();await f.config(true);const initial=await f.c.authorization();await f.offer();const g=f.c.groups.get(1);await f.config(false);assert.equal(f.c.groups.size,0);await assert.rejects(()=>f.c.assertCurrent(g));assert.equal((await f.c.authorization()).enabled,false);await f.config(true);assert.notEqual((await f.c.authorization()).generation,initial.generation);assert.equal(f.c.groups.size,0);
});
test('revoke while offer awaits live proof prevents late result resurrection',async()=>{
 const f=await fixture();await f.config(true);const original=f.api.tabs.sendMessage;let release;f.api.tabs.sendMessage=async(...args)=>args[1].type==='PAIA_PROMPT_NEXT_PROBE'?new Promise(resolve=>{release=()=>original(...args).then(resolve);}):original(...args);
 const pending=f.offer();while(!release)await new Promise(resolve=>setTimeout(resolve,0));await f.config(false);release();await assert.rejects(()=>pending);assert.equal(f.c.groups.size,0);
});
test('worker restart loses candidates and rotates authorization without retaining reply bodies',async()=>{
 const f=await fixture();await f.config(true);await f.offer();const before=await f.c.authorization(),fresh=new NextPromptCommands(f.c.service,f.api,f.c.surface);assert.equal(fresh.groups.size,0);assert.equal((await fresh.authorization()).enabled,true);assert.notEqual((await fresh.authorization()).generation,before.generation);
});
test('wrong frame, nonce, tab, document and forged text cannot insert',async()=>{
 const f=await fixture();await f.config(true);await f.offer();const v=await f.rpc({type:'get'}),command={type:'insert',id:v.choices[0].id,operationId:crypto.randomUUID()};
 for(const sender of [f.top,{...f.frame,frameId:0},{...f.frame,tab:{id:2}},{...f.frame,url:f.frame.url+'bad'},{...f.frame,id:'host'}])await assert.rejects(()=>f.c.handle({type:'PAIA_PROMPT_NEXT_RPC',nonce,command},sender));
 await assert.rejects(()=>f.rpc({...command,text:'forged'}));assert.equal(f.sends.some(x=>x.r.type==='PAIA_PROMPT_NEXT_INSERT'),false);
});
test('consent revocation and source document invalidation do not affect the Stage 1/2 service',async()=>{
 const f=await fixture();await f.config(true);const offered=await f.offer();await f.c.handle({type:'PAIA_PROMPT_NEXT_INVALIDATE',id:'22222222-2222-4222-8222-222222222222'},f.top);assert.equal(f.c.groups.size,1);await f.c.handle({type:'PAIA_PROMPT_NEXT_INVALIDATE',id:offered.id},f.top);assert.equal(f.c.groups.size,0);
 await f.offer();f.setConsent(false);await assert.rejects(()=>f.rpc({type:'get'}));assert.equal(f.c.service.s.status instanceof Function,true);
});
test('Stage 3A has no network/body persistence/logging; existing user-only capture remains separate',async()=>{
 for(const path of ['adapter/chatgpt-current-reply.js','content/prompt-next.js','core/next-action-detector.js','core/prompt-next-layout.js','background/prompt-next.js','ui/prompt-next.js']){
  const s=await readFile(new URL('../'+path,import.meta.url),'utf8');assert.doesNotMatch(s,/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|indexedDB|localStorage|sessionStorage)\b|console\.|\.submit\(|\.requestSubmit\(|postMessage\(|innerHTML|outerHTML|createObjectStore/,path);
 }
 const worker=await readFile(new URL('../background/service-worker.js',import.meta.url),'utf8');assert.match(worker,/if\(!request.type.startsWith\('PAIA_PROMPT_NEXT_'\)\)await productSignals.observe/);assert.match(worker,/PAIA_BACKUP_RESTORE.*promptNext.configure\(false\)/);
 const capture=await readFile(new URL('../adapter/chatgpt-adapter.js',import.meta.url),'utf8');assert.doesNotMatch(capture,/CurrentReply|next-action/);
 const manifest=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url),'utf8'));assert.deepEqual(manifest.permissions,['storage','scripting']);assert.deepEqual(manifest.host_permissions,['https://api.deepseek.com/*','https://chatgpt.com/*']);
});
