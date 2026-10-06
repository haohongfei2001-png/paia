import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from '../ui/common.js';
import {IntegrityPanel} from '../ui/integrity.js';
import {PresentationNode} from './harness/presentation-dom.mjs';

function fixture(t){
 const prior={document:globalThis.document,chrome:globalThis.chrome},nodes=new Map(),calls=[];
 for(const id of ['product-diagnostics','library-rebuild-search','integrity-check','integrity-cancel','integrity-status','integrity-results']){const node=new PresentationNode();node.id=id;nodes.set(id,node);}
 nodes.get('product-diagnostics').hidden=true;nodes.get('library-rebuild-search').hidden=true;
 globalThis.document={documentElement:{lang:'zh-CN'},getElementById:id=>nodes.get(id),createElement:tag=>new PresentationNode(tag)};
 let reply=async()=>({ok:true,data:{}});
 globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(message);return reply(message);}}};
 t.after(()=>{for(const [key,value]of Object.entries(prior)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}});
 return {calls,node:id=>nodes.get(id),reply:fn=>reply=fn};
}
const refused=code=>async()=>({ok:false,error:code});

test('maintenance stays hidden for transport, consent, full-disk and request errors; a real storage read failure clears after recovery',async t=>{
 const f=fixture(t);
 for(const code of ['MESSAGE_CHANNEL_INTERRUPTED','MESSAGE_RESPONSE_TIMEOUT','UNAVAILABLE','CONSENT_REQUIRED','INVALID_REQUEST','STORAGE_FULL']){
  f.reply(refused(code));await assert.rejects(request('GET_PAGE',{page:{view:'settings'}}),{code});
  assert.equal(f.node('product-diagnostics').hidden,true,code);assert.equal(f.node('library-rebuild-search').hidden,true,code);
 }
 f.reply(refused('STORAGE_FAILED'));await assert.rejects(request('GET_PAGE'),{code:'STORAGE_FAILED'});assert.equal(f.node('product-diagnostics').hidden,false);
 f.reply(async()=>({ok:true,data:{settings:{consentVersion:1}}}));await request('GET_PAGE');assert.equal(f.node('product-diagnostics').hidden,true);
 assert.ok(f.calls.every(call=>call.type==='GET_PAGE'),'observing failures never starts maintenance');
});

test('search failures expose only their repair control and data reads cannot clear them; explicit rebuild and healthy search clear stale state',async t=>{
 const f=fixture(t);f.reply(refused('STORAGE_FAILED'));
 await assert.rejects(request('LIBRARY_INDEX_PAGE',{options:{query:'SYNTHETIC'}}));
 assert.equal(f.node('library-rebuild-search').hidden,false);assert.equal(f.node('product-diagnostics').hidden,true);
 f.reply(async()=>({ok:true,data:{}}));await request('GET_PAGE');assert.equal(f.node('library-rebuild-search').hidden,false);
 f.reply(async()=>({ok:true,data:{indexing:true,items:[]}}));await request('SEARCH_LIBRARY',{options:{query:'SYNTHETIC'}});assert.equal(f.node('library-rebuild-search').hidden,false,'pending index work is not repaired');
 f.reply(async()=>({ok:true,data:{items:[],indexing:false}}));await request('SEARCH_LIBRARY',{options:{query:'SYNTHETIC'}});assert.equal(f.node('library-rebuild-search').hidden,true);
 f.reply(refused('STORAGE_FAILED'));await assert.rejects(request('SEARCH_LIBRARY'));assert.equal(f.node('library-rebuild-search').hidden,false);
 f.reply(async()=>({ok:true,data:{queued:true}}));await request('REBUILD_LIBRARY_SEARCH');assert.equal(f.node('library-rebuild-search').hidden,true);
 assert.equal(f.calls.filter(call=>call.type==='REBUILD_LIBRARY_SEARCH').length,1,'only the explicit repair call rebuilds');
});

test('a late failed read cannot reopen recovery after a newer successful read',async t=>{
 const f=fixture(t);let finish;f.reply(()=>new Promise(resolve=>finish=resolve));
 const old=request('GET_PAGE');const failed=assert.rejects(old,{code:'STORAGE_FAILED'});
 f.reply(async()=>({ok:true,data:{}}));await request('GET_PAGE');finish({ok:false,error:'STORAGE_FAILED'});await failed;
 assert.equal(f.node('product-diagnostics').hidden,true);
});

test('actual integrity panel retains detected relation faults until a clean check, and ignores a cancelled late result',async t=>{
 const f=fixture(t),panel=new IntegrityPanel();let count=2;
 f.reply(async message=>({ok:true,data:message.type==='PAIA_INTEGRITY_BEGIN'?{sessionId:'synthetic-check',state:'ready',counts:{orphan_entries:count}}:{}}));
 await panel.run();assert.equal(f.node('product-diagnostics').hidden,false);assert.match(f.node('integrity-status').textContent,/2 处关系/);
 await request('GET_PAGE');assert.equal(f.node('product-diagnostics').hidden,false,'a page read cannot certify relation repair');
 count=0;await panel.run();assert.equal(f.node('product-diagnostics').hidden,true);assert.match(f.node('integrity-status').textContent,/未发现异常/);
 let finish;f.reply(message=>message.type==='PAIA_INTEGRITY_BEGIN'?new Promise(resolve=>finish=resolve):Promise.resolve({ok:true,data:{}}));
 const pending=panel.run();assert.equal(f.node('product-diagnostics').hidden,false,'an active check retains its controls');await panel.cancel();finish({ok:true,data:{sessionId:'synthetic-late',state:'ready',counts:{orphan_entries:4}}});await pending;
 assert.equal(f.node('product-diagnostics').hidden,true);assert.match(f.node('integrity-status').textContent,/已停止/);
});
