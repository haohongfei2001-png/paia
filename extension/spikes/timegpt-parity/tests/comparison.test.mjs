// Read-only behavioral counterexamples against the frozen v0.3.0 observer.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const chat='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const tick=()=>new Promise(r=>setTimeout(r,10));
async function fixture(target=chat){
 const response=new Response(JSON.stringify({conversation_id:target,mapping:{one:{message:{id:'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',author:{role:'user'},create_time:1609459200,update_time:null}}}}),{headers:{'content-type':'application/json'}});
 Object.defineProperty(response,'url',{value:'https://chatgpt.com/backend-api/conversation/'+target});
 const handlers=new Map(),sent=[],window={fetch:()=>Promise.resolve(response),addEventListener:(k,fn)=>handlers.set(k,fn),postMessage:d=>sent.push(d)};
 const c=vm.createContext({window,location:{pathname:'/c/'+chat},URL,Response,TextDecoder,setTimeout,clearTimeout});
 for(const p of ['adapter/response-parser.js','adapter/json-fingerprint.js','adapter/history-contract.js','content/response-observer.js'])vm.runInContext(await readFile(new URL('../../../'+p,import.meta.url),'utf8'),c);
 const control=which=>handlers.get('message')({source:window,origin:'https://chatgpt.com',data:{channel:'archive-response-control-v1',active:true,chat:which,epoch:1,session:'synthetic',historySession:'synthetic-history',history:true,fingerprint:false}});
 return {window,c,control,sent,close:()=>handlers.get('pagehide')()};
}
test('v0.3.0 explicitly subscribes to actual detail endpoint once active',async()=>{
 const f=await fixture();try{f.control(chat);await f.window.fetch();for(let i=0;i<100&&!f.sent.some(d=>d.history);i++)await tick();assert.ok(f.sent.some(d=>d.history?.rows.length===1));assert.ok(f.sent.some(d=>d.trace?.endpointClass==='conversation_load_candidate'));}finally{f.close();}
});
test('v0.3.0 response fully before first control is lost, not buffered for later activation',async()=>{
 const f=await fixture();try{await(await f.window.fetch()).text();await tick();f.control(chat);await tick();assert.equal(f.sent.some(d=>d.history),false);}finally{f.close();}
});
test('v0.3.0 other-conversation prefetch is lost after route switch without another fetch',async()=>{
 const f=await fixture(other);try{f.control(chat);await(await f.window.fetch()).text();await tick();f.c.location.pathname='/c/'+other;f.control(other);await tick();assert.equal(f.sent.some(d=>d.history),false);}finally{f.close();}
});
