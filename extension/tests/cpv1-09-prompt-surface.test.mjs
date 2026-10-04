import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
import {PromptSurfaceCommands,validSurface} from '../background/prompt-surface.js';
const nonce='11111111-1111-4111-8111-111111111111',url='https://chatgpt.com/c/synthetic';
function fixture(){const sent=[],writes=[],calls=[],storage={};let consent=true;
 const api={runtime:{id:'ext',getURL:p=>'chrome-extension://ext/'+p,sendMessage:async()=>{}},storage:{local:{get:async()=>storage,set:async x=>{writes.push(x);Object.assign(storage,x);}}},tabs:{get:async()=>({id:7,url}),sendMessage:async(...args)=>{sent.push(args);return {open:true,nonce,url,dark:false};}}};
 const commands={service:{s:{status:async()=>({consented:consent})},members:async()=>[]},dispatch:async c=>{calls.push(c);return {items:[]};}};
 const s=new PromptSurfaceCommands(commands,api),sender={id:'ext',tab:{id:7},frameId:2,url:api.runtime.getURL('ui/prompt-surface.html')+'#'+nonce},request={type:'PAIA_PROMPT_SURFACE_RPC',nonce,command:{type:'PAIA_PROMPT_QUERY'}};
 return {s,api,sender,request,sent,writes,calls,revoke(){consent=false;}};
}
test('surface frames require exact origin, nonce, current host, positive frame and consent',async()=>{
 const f=fixture();assert.deepEqual(await f.s.handle(f.request,f.sender),{items:[],theme:'light'});
 for(const sender of [{...f.sender,id:'foreign'},{...f.sender,frameId:0},{...f.sender,frameId:undefined},{...f.sender,url},{...f.sender,tab:{id:7,incognito:true}},{...f.sender,url:f.sender.url+'x'}])await assert.rejects(()=>f.s.handle(f.request,sender));
 f.api.tabs.sendMessage=async()=>({open:true,nonce,url:url+'/changed'});await assert.rejects(()=>f.s.handle(f.request,f.sender));f.revoke();await assert.rejects(()=>f.s.handle(f.request,f.sender),e=>e.code==='CONSENT_REQUIRED');
});
test('host gets only geometry; frame insertion is forcibly bound to its own tab and cannot query arbitrary capabilities',async()=>{
 const f=fixture(),sender={...f.sender,frameId:0,url};assert.deepEqual(await f.s.handle({type:'PAIA_PROMPT_SURFACE_HOST'},sender),{version:1,open:false,position:null});
 await assert.rejects(()=>f.s.handle(f.request,sender));
 await f.s.handle({...f.request,command:{type:'PAIA_PROMPT_INSERT',id:'p',text:'selected',operationId:nonce}},f.sender);assert.deepEqual(f.calls.at(-1),{type:'PAIA_PROMPT_INSERT',id:'p',text:'selected',operationId:nonce,tabId:7,url});
 for(const command of [{type:'GET_STATE'},{type:'PAIA_PROMPT_TARGETS'},{type:'PAIA_PROMPT_INSERT',tabId:99}])await assert.rejects(()=>f.s.handle({...f.request,command},f.sender));
 assert.ok(f.sent.every(x=>!JSON.stringify(x).includes('selected')),'probe contains no template body');
});
test('position is bounded device-only metadata, with no website or archive body storage',async()=>{
 const f=fixture(),sender={...f.sender,frameId:0,url},state={version:1,open:true,position:{x:.25,y:.5}};
 await f.s.handle({type:'PAIA_PROMPT_SURFACE_HOST',state},sender);assert.equal(f.writes.length,1);
 for(const bad of [{...state,text:'private'},{...state,position:{x:NaN,y:0}},{...state,position:{x:2,y:0}},{...state,version:2}]){assert.equal(!!validSurface(bad),false);await assert.rejects(()=>f.s.handle({type:'PAIA_PROMPT_SURFACE_HOST',state:bad},sender));}
 assert.equal(f.writes.length,1);
});
test('safe geometry clamps orb and card, excludes native composer controls at 320px and expanded scale',async()=>{
 const sandbox={};vm.runInNewContext(await readFile(new URL('../core/prompt-surface-layout.js',import.meta.url),'utf8'),sandbox);
 for(const width of [320,640,1280])for(const height of [500,800])for(const position of [null,{x:0,y:0},{x:1,y:1},{x:.5,y:.9}]){
  const form={left:8,right:width-8,top:height-140,bottom:height-10},g=sandbox.PAIAPromptLayout(width,height,form,position);assert.ok(g);for(const box of [g.orb,g.card]){assert.ok(box);assert.ok(box.x>=0&&box.y>=0&&box.x+box.w<=width&&box.y+box.h<=height);assert.ok(box.y+box.h<=form.top||box.y>=form.bottom);}assert.equal(g.orb.w,44);
 }
});
test('surface publishes only one static extension frame, no host library bridge or new privileged host',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url),'utf8'));assert.deepEqual(manifest.web_accessible_resources,[{resources:['ui/prompt-surface.html'],matches:['https://chatgpt.com/*']}]);
 for(const file of ['content/prompt-surface.js','background/prompt-surface.js','ui/prompt-surface.js']){const source=await readFile(new URL('../'+file,import.meta.url),'utf8');assert.doesNotMatch(source,/postMessage\s*\(|localStorage|sessionStorage|\.submit\s*\(|fetch\s*\(|innerHTML|setInterval\s*\(/,file);}
 const host=await readFile(new URL('../content/prompt-surface.js',import.meta.url),'utf8');assert.doesNotMatch(host,/PAIA_PROMPT_QUERY|PAIA_PROMPT_COPY_TEXT|PAIA_PROMPT_CHANGE/);assert.match(host,/mode:'closed'/);
});
