import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PromptReuseCommands} from '../background/prompt-reuse-commands.js';
import {copyPrompt} from '../core/prompt-clipboard.js';
const url='https://chatgpt.com/c/synthetic-0001';
function fixture(result={status:'inserted',verified:true}){
 const sends=[],uses=[],calls=[];const service={s:{status:async()=>({consented:true})},query:async()=>({items:[{text:'SECRET_LIBRARY'}]}),resolve:async x=>({id:x.id,text:'selected only'}),assertCurrent:async()=>{},noteVerifiedReuse:async id=>uses.push(id)};
 const api={runtime:{id:'extension',getURL:p=>'chrome-extension://extension/'+p},tabs:{get:async()=>({id:7,url}),update:async()=>{},query:async()=>[{id:7,url}],sendMessage:async(...args)=>{sends.push(args);return result;}}};
 const c=new PromptReuseCommands(service,api),sender={id:'extension',url:api.runtime.getURL('ui/prompt-reuse-test.html')};
 const request={type:'PAIA_PROMPT_INSERT',id:'family',text:'selected only',tabId:7,url,operationId:crypto.randomUUID()};return {c,sender,request,sends,uses,service,api,calls};
}
test('host content and forged extension locations cannot query the library or trigger insertion',async()=>{
 const f=fixture();for(const sender of [{id:'extension',url,tab:{id:7},frameId:0},{id:'other',url:f.sender.url},{id:'extension',url:f.sender.url+'?spoof'}])for(const request of [f.request,{type:'PAIA_PROMPT_QUERY'}])await assert.rejects(()=>f.c.handle(request,sender),e=>e.code==='FORBIDDEN');assert.equal(f.sends.length,0);
});
test('only explicitly selected text reaches top frame; duplicate operation never repeats insertion',async()=>{
 const f=fixture();const [a,b]=await Promise.all([f.c.handle(f.request,f.sender),f.c.handle(f.request,f.sender)]);assert.deepEqual(a,b);assert.equal(a.status,'inserted');assert.equal(f.sends.length,1);assert.equal(f.uses.length,1);
 assert.deepEqual(Object.keys(f.sends[0][1]).sort(),['operationId','text','type','url']);assert.deepEqual(f.sends[0][2],{frameId:0});assert.doesNotMatch(JSON.stringify(f.sends),/SECRET_LIBRARY|family/);
 await assert.rejects(()=>f.c.handle({...f.request,text:'other'},f.sender));
});
for(const result of [null,{status:'inserted'}, {status:'uncertain'},{status:'failed',reason:'insertion_rejected'}])test('unverified acknowledgement is never successful or automatically retried: '+JSON.stringify(result),async()=>{
 const f=fixture(result),r=await f.c.handle(f.request,f.sender);assert.notEqual(r.status,'inserted');await f.c.handle(f.request,f.sender);assert.equal(f.sends.length,1);assert.equal(f.uses.length,0);
});
test('consent, stale selected text and tab navigation fail before sending',async()=>{
 const f=fixture();f.service.s.status=async()=>({consented:false});await assert.rejects(()=>f.c.handle(f.request,f.sender));assert.equal(f.sends.length,0);
 f.service.s.status=async()=>({consented:true});f.api.tabs.get=async()=>({id:7,url:url+'/changed'});assert.equal((await f.c.handle(f.request,f.sender)).status,'failed');assert.equal(f.sends.length,0);
});
test('clipboard success waits for browser acknowledgement; rejection does not report copied',async()=>{
 let release;const promise=copyPrompt('完整\ntext', {writeText:text=>{assert.equal(text,'完整\ntext');return new Promise(resolve=>{release=resolve;});}});let settled=false;promise.then(()=>{settled=true;});await Promise.resolve();assert.equal(settled,false);release();assert.deepEqual(await promise,{status:'copied',verified:true});assert.deepEqual(await copyPrompt('text',{writeText:async()=>{throw Error('denied');}}),{status:'failed'});
});
test('new Stage 1/2 runtime has no network, send, reply, website storage, page bridge or raw HTML write',async()=>{
 const paths=['adapter/chatgpt-composer.js','content/prompt-reuse.js','core/prompt-family.js','core/prompt-reuse-service.js','background/prompt-reuse-commands.js'];
 for(const path of paths){const text=await readFile(new URL('../'+path,import.meta.url),'utf8');assert.doesNotMatch(text,/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(|(?:localStorage|sessionStorage)|(?:innerHTML|outerHTML)\s*=|\.submit\s*\(|\.requestSubmit\s*\(|dispatchEvent\s*\(|postMessage\s*\(|KeyboardEvent\s*\(/,path);}
 const manifest=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url),'utf8'));assert.deepEqual(manifest.host_permissions,['https://api.deepseek.com/*','https://chatgpt.com/*']);assert.deepEqual(manifest.permissions,['storage','scripting']);assert.equal(manifest.web_accessible_resources,undefined);
 const scripts=manifest.content_scripts.filter(x=>x.js.includes('content/prompt-reuse.js'));assert.equal(scripts.length,1);assert.equal(scripts[0].world,'ISOLATED');
});
