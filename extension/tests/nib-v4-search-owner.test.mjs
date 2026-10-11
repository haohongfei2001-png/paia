import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {PromptSurfaceCommands} from '../background/prompt-surface.js';
import {PromptReuseCommands} from '../background/prompt-reuse-commands.js';
import {PROMPT_HISTORY_SCOPE} from '../core/prompt-selection.js';
import {findInputPage} from '../ui/input-search.js';
const body='SYNTHETIC A👩🏽‍💻é\n  NOT delete. ';
const all=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await t.all(name)]))));
async function fixture(texts=[body]){const f=await completeFixture({texts});await f.s.finishFoundation();return {...f,service:new PromptReuseService(f.s)};}
const page=(service,query='SYNTHETIC',cursor=null)=>findInputPage({query,cursor,ranked:true,qualified:true,read:({query,cursor,searchSnapshot})=>service.queryHistory({query,cursor,searchSnapshot})});
async function changeInput(f,id,text){const b=await f.s.input(id);await f.s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id,expectedRevision:b.revision,libraryText:text,note:b.note,excluded:false}]});}
test('history pages consume the exact Archive qualified order and keep independent/rare Inputs',async()=>{
 const f=await fixture(Array.from({length:55},(_,i)=>'SYNTHETIC unique '+i));
 assert.equal((await f.service.query()).items.length,0,'rare Inputs are not useful Families');
 let cursor=null,count=0;do{const next=await page(f.service,'SYNTHETIC',cursor);const raw=await findInputPage({query:'SYNTHETIC',cursor,ranked:true,qualified:true,read:options=>f.s.searchInputs({...PROMPT_HISTORY_SCOPE,...options})});assert.deepEqual(next.items.map(x=>[x.id,x.contentRevision,x.text]),raw.items.map(x=>[x.id,x.contentRevision,x.text]));for(const item of next.items){assert.equal(item.ref.generation,next.searchSnapshot.generation);assert.equal((await f.service.resolveSelection(item.ref)).text,item.text);}count+=next.items.length;cursor=next.nextCursor;}while(cursor);assert.equal(count,55);
 const before=await all(f.s);assert.deepEqual((await f.service.queryHistory({query:' ',cursor:null,searchSnapshot:null})).items,[]);assert.deepEqual(await all(f.s),before);assert.equal(f.requests.length,0);
});
test('history current Working body is independent of edited manual/Family text',async()=>{
 const f=await fixture([body,body]),family=(await f.service.query()).items[0];await f.service.change({action:'edit',id:family.id,revision:0,text:'SYNTHETIC reusable override'});
 const hit=(await page(f.service)).items[0];assert.equal((await f.service.resolveSelection(hit.ref)).text,body);await changeInput(f,hit.id,'SYNTHETIC current Working');await assert.rejects(f.service.resolveSelection(hit.ref),e=>e.code==='MEMORY_STALE');const current=(await page(f.service)).items.find(x=>x.id===hit.id);assert.equal((await f.service.resolveSelection(current.ref)).text,'SYNTHETIC current Working');
});
test('exact original ranges honor graphemes and never round or fall back to whole',async()=>{
 const f=await fixture(),hit=(await page(f.service)).items[0],start=body.indexOf('👩'),end=body.indexOf('\n');const range={start,end};assert.equal((await f.service.resolveSelection(hit.ref,range)).text,'👩🏽‍💻é');
 for(const bad of [{start:start+1,end},{start,end:end-1},{start:-1,end},{start,end:body.length+1},{start:0,end:0},{start:0,end:1.2},{start:0,end:1,extra:true}])await assert.rejects(f.service.resolveSelection(hit.ref,bad),e=>e.code==='INVALID_REQUEST');
 assert.equal((await f.service.resolveSelection(hit.ref)).text,body);await assert.rejects(f.service.resolveSelection({...hit.ref,extra:1}),e=>e.code==='INVALID_REQUEST');
});
test('removed or purged source cannot resolve old history or be recovered by query',async()=>{
 const f=await fixture(),hit=(await page(f.service)).items[0],b=await f.s.input(hit.id);await f.s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id:b.id,expectedRevision:b.revision,libraryText:b.libraryText,note:b.note,excluded:true}]});await assert.rejects(f.service.resolveSelection(hit.ref));assert.equal((await page(f.service)).items.length,0);
});
test('explicit contrary source role rejects history before exposing its body',async()=>{
 const f=await fixture(),hit=(await page(f.service)).items[0];await f.s.repository.transaction(true,async t=>{for(const row of await t.all('records')){row.value.role='assistant';await t.put('records',row);}});await assert.rejects(f.service.resolveSelection(hit.ref),e=>e.code==='MEMORY_STALE');await assert.rejects(page(f.service),e=>e.code==='MEMORY_STALE');
});
test('typed Family and manual ranges are revision-bound and retain existing aggregate ownership',async()=>{
 const f=await fixture([body,body]),q=await f.service.query(),item=q.items[0],ref={kind:'prompt_family',id:item.id,revision:q.revision,generation:q.generation};assert.equal((await f.service.resolveSelection(ref,{start:0,end:9})).text,'SYNTHETIC');
 await f.service.change({action:'edit',id:item.id,revision:q.revision,text:'SYNTHETIC manual body'});await assert.rejects(f.service.resolveSelection(ref),e=>e.code==='MEMORY_STALE');const next=await f.service.query(),manual={kind:'manual_reuse',id:item.id,revision:next.revision,generation:next.generation};assert.equal((await f.service.resolveSelection(manual)).text,'SYNTHETIC manual body');await assert.rejects(f.service.resolveSelection({...manual,kind:'prompt_family'}),e=>e.code==='MEMORY_STALE');
});
test('typed coordinator shares original one-shot map and never fabricates history frequency',async()=>{
 const f=await fixture(),hit=(await page(f.service)).items[0],before=await all(f.s),sent=[];const url='https://chatgpt.com/c/synthetic';const api={runtime:{id:'ext',getURL:p=>'chrome-extension://ext/'+p},windows:{get:async()=>({id:4,focused:true})},tabs:{get:async()=>({id:7,url,windowId:4,active:true}),update:async()=>{},sendMessage:async(...args)=>{sent.push(args);return {status:'inserted',verified:true};}}};const c=new PromptReuseCommands(f.service,api),r={type:'PAIA_PROMPT_SELECTION_INSERT',ref:hit.ref,range:{start:0,end:9},tabId:7,url,operationId:crypto.randomUUID()};const [a,b]=await Promise.all([c.dispatch(r),c.dispatch(r)]);assert.deepEqual(a,b);assert.equal(a.verified,true);assert.equal(sent.length,1);assert.equal(sent[0][1].text,'SYNTHETIC');assert.deepEqual(Object.keys(sent[0][1]).sort(),['operationId','text','type','url']);await assert.rejects(c.dispatch({...r,range:null}));assert.deepEqual(await all(f.s),before);
});
test('typed coordinator rechecks source after target lookup before any effect',async()=>{
 const f=await fixture(),hit=(await page(f.service)).items[0],url='https://chatgpt.com/c/synthetic';let sent=0;const api={runtime:{id:'ext'},windows:{get:async()=>{await changeInput(f,hit.id,'SYNTHETIC changed during target await');return {id:4,focused:true};}},tabs:{get:async()=>({id:7,url,windowId:4,active:true}),update:async()=>{throw Error('typed route must not reactivate');},sendMessage:async()=>{sent++;return {status:'inserted',verified:true};}}};const c=new PromptReuseCommands(f.service,api);await assert.rejects(c.dispatch({type:'PAIA_PROMPT_SELECTION_INSERT',ref:hit.ref,range:null,tabId:7,url,operationId:crypto.randomUUID()}),e=>e.code==='MEMORY_STALE');assert.equal(sent,0);
});

test('history edit creates only explicit Prompt work and final source CAS refuses stale save',async()=>{
 const f=await fixture(),hit=(await page(f.service)).items[0],source=await rows(f.s,'records'),blocks=await rows(f.s,'blocks');const result=await f.service.createFromHistory(hit.ref,'SYNTHETIC explicitly saved expression',0);assert.match(result.id,/^manual:/);assert.deepEqual(await rows(f.s,'records'),source);assert.deepEqual(await rows(f.s,'blocks'),blocks);assert.equal((await f.service.query()).items[0].text,'SYNTHETIC explicitly saved expression');
 const before=await all(f.s);await assert.rejects(f.service.createFromHistory(hit.ref,'SYNTHETIC stale copy',1),e=>e.code==='MEMORY_STALE');assert.deepEqual(await all(f.s),before);
});
test('body-free Archive arrival requalifies exact current Input, generation and original snapshot signature',async()=>{
 const f=await fixture(),result=await page(f.service),ref=result.items[0].ref,descriptor={version:1,query:'SYNTHETIC',scope:result.searchScope,searchSnapshot:result.searchSnapshot,ref};assert.deepEqual(await f.service.qualifyArchiveArrival(descriptor),descriptor);assert.doesNotMatch(JSON.stringify(descriptor),/NOT delete/);
 for(const bad of [{...descriptor,body:body},{...descriptor,searchSnapshot:{...descriptor.searchSnapshot,signature:'0'.repeat(64)}},{...descriptor,ref:{...ref,contentRevision:ref.contentRevision+1}},{...descriptor,scope:{...descriptor.scope,includeFiltered:false}}])await assert.rejects(f.service.qualifyArchiveArrival(bad));
 await changeInput(f,ref.id,'SYNTHETIC later Input');await assert.rejects(f.service.qualifyArchiveArrival(descriptor),e=>e.code==='MEMORY_STALE');
});
test('actual surface gateway binds typed reading and insertion to the same nonce, frame document and chat',async()=>{
 const f=await fixture(),url='https://chatgpt.com/c/synthetic',nonce='11111111-1111-4111-8111-111111111111',sent=[];let currentURL=url;const api={runtime:{id:'ext',getURL:p=>'chrome-extension://ext/'+p,sendMessage:async()=>{},getContexts:async()=>[{documentId:'private-document',tabId:7,windowId:4,frameId:9,documentUrl:'chrome-extension://ext/ui/prompt-surface.html#'+nonce}]},windows:{get:async()=>({id:4,focused:true})},tabs:{get:async()=>({id:7,url:currentURL,windowId:4,active:true}),update:async()=>{},sendMessage:async(_id,r)=>{if(r.type==='PAIA_PROMPT_SURFACE_PROBE')return {open:true,nonce,url:currentURL};sent.push(r);return {status:'inserted',verified:true};}}};const commands=new PromptReuseCommands(f.service,api),gateway=new PromptSurfaceCommands(commands,api),sender={id:'ext',tab:{id:7},frameId:9,url:api.runtime.getURL('ui/prompt-surface.html')+'#'+nonce,documentId:'private-document',documentLifecycle:'active'};const send=command=>gateway.handle({type:'PAIA_PROMPT_SURFACE_RPC',nonce,command},sender);
 const q=await findInputPage({query:'SYNTHETIC',ranked:true,qualified:true,read:({query,cursor,searchSnapshot})=>send({type:'PAIA_PROMPT_HISTORY_QUERY',query,cursor,searchSnapshot})});const hit=q.items[0],read=await send({type:'PAIA_PROMPT_SELECTION_READ',ref:hit.ref,range:null});assert.deepEqual(read.target,{url,documentId:'private-document',nonce});
 const insert={type:'PAIA_PROMPT_SELECTION_INSERT',ref:hit.ref,range:{start:0,end:9},target:read.target,operationId:crypto.randomUUID()};currentURL=url+'-new-chat';await assert.rejects(send(insert),e=>e.code==='FORBIDDEN');assert.equal(sent.length,0);currentURL=url;await assert.rejects(send({...insert,target:{...read.target,nonce:'bad'}}),e=>e.code==='FORBIDDEN');assert.equal(sent.length,0);assert.equal((await send(insert)).verified,true);assert.equal(sent.length,1);assert.equal(sent[0].text,'SYNTHETIC');
 for(const bad of [{...sender,frameId:0},{...sender,url:sender.url+'?extra'},{...sender,id:'foreign'}])await assert.rejects(gateway.handle({type:'PAIA_PROMPT_SURFACE_RPC',nonce,command:{type:'PAIA_PROMPT_HISTORY_QUERY',query:'SYNTHETIC',cursor:null,searchSnapshot:null}},bad),e=>e.code==='FORBIDDEN');
});

test('empty explicit Archive arrival is neutral and never becomes a full-history feed',async()=>{const f=await fixture(),descriptor={version:1,query:'',scope:{...PROMPT_HISTORY_SCOPE},searchSnapshot:null,ref:null},before=await all(f.s);assert.deepEqual(await f.service.qualifyArchiveArrival(descriptor),descriptor);assert.deepEqual(await all(f.s),before);for(const bad of [{...descriptor,searchSnapshot:{version:1,generation:0,signature:'0'.repeat(64)}},{...descriptor,ref:{kind:'history_input',id:'unknown',documentId:'unknown',contentRevision:0,generation:0}}])await assert.rejects(f.service.qualifyArchiveArrival(bad),e=>e.code==='INVALID_REQUEST');});


test('same-URL iframe reload after original target await refuses typed insertion before effect',async()=>{
 const f=await fixture(),url='https://chatgpt.com/c/synthetic',nonce='11111111-1111-4111-8111-111111111111';let live=true,sent=0;
 const api={runtime:{id:'ext',getURL:p=>'chrome-extension://ext/'+p,getContexts:async()=>live?[{documentId:'original-private-document',tabId:7,windowId:4,frameId:9,documentUrl:'chrome-extension://ext/ui/prompt-surface.html#'+nonce}]:[]},windows:{get:async()=>({id:4,focused:true})},tabs:{get:async()=>({id:7,url,windowId:4,active:true}),update:async()=>{throw Error('typed route must not reactivate');},sendMessage:async(_id,r)=>{if(r.type==='PAIA_PROMPT_SURFACE_PROBE')return {open:true,nonce,url};sent++;return {status:'inserted',verified:true};}}};
 const gateway=new PromptSurfaceCommands(new PromptReuseCommands(f.service,api),api),sender={id:'ext',tab:{id:7},frameId:9,url:api.runtime.getURL('ui/prompt-surface.html')+'#'+nonce,documentId:'original-private-document',documentLifecycle:'active'},hit=(await page(f.service)).items[0];
 const resolve=f.service.resolveSelection.bind(f.service);f.service.resolveSelection=async(...args)=>{const value=await resolve(...args);live=false;return value;};const before=await all(f.s);await assert.rejects(gateway.handle({type:'PAIA_PROMPT_SURFACE_RPC',nonce,command:{type:'PAIA_PROMPT_SELECTION_INSERT',ref:hit.ref,range:null,target:{url,nonce,documentId:sender.documentId},operationId:crypto.randomUUID()}},sender),e=>e.code==='FORBIDDEN');assert.equal(sent,0);assert.deepEqual(await all(f.s),before);
});


test('typed board refuses background tab/window before body/effect and never reactivates them',async()=>{
 for(const initial of ['background-tab','unfocused-window','loses-focus-during-read']){
  const f=await fixture(),hit=(await page(f.service)).items[0],url='https://chatgpt.com/c/synthetic';let active=initial!=='background-tab',focused=initial!=='unfocused-window',effects=0,activations=0,reads=0;
  const original=f.service.resolveSelection.bind(f.service);f.service.resolveSelection=async(...args)=>{reads++;const value=await original(...args);if(initial==='loses-focus-during-read')active=false;return value;};
  const api={runtime:{id:'ext'},windows:{get:async()=>({focused})},tabs:{get:async()=>({id:7,url,windowId:4,active}),update:async()=>{activations++;},sendMessage:async()=>{effects++;return {status:'inserted',verified:true};}}};const before=await all(f.s);
  await assert.rejects(new PromptReuseCommands(f.service,api).dispatch({type:'PAIA_PROMPT_SELECTION_INSERT',ref:hit.ref,range:null,tabId:7,url,operationId:crypto.randomUUID()}),e=>e.code==='FORBIDDEN');assert.equal(effects,0);assert.equal(activations,0);assert.equal(reads,initial==='loses-focus-during-read'?2:0);assert.deepEqual(await all(f.s),before);
 }
});


test('query-only Archive qualification uses the original signed scope owner without a null document key',async()=>{
 const f=await fixture(),result=await page(f.service),descriptor={version:1,query:'SYNTHETIC',scope:result.searchScope,searchSnapshot:result.searchSnapshot,ref:null},before=await all(f.s);let documentReads=0;
 const transaction=f.s.repository.transaction.bind(f.s.repository);f.s.repository.transaction=(write,fn,...args)=>transaction(write,async t=>{const get=t.get.bind(t);t.get=(name,id,...rest)=>{if(name==='documents'){documentReads++;assert.notEqual(id,null,'null is not an IndexedDB key');}return get(name,id,...rest);};return fn(t);},...args);
 try{assert.deepEqual(await f.service.qualifyArchiveArrival(descriptor),descriptor);assert.equal(documentReads,0);await assert.rejects(f.service.qualifyArchiveArrival({...descriptor,searchSnapshot:{...descriptor.searchSnapshot,signature:'0'.repeat(64)}}),e=>e.code==='INVALID_REQUEST');await assert.rejects(f.service.qualifyArchiveArrival({...descriptor,searchSnapshot:{...descriptor.searchSnapshot,generation:descriptor.searchSnapshot.generation+1}}),e=>e.code==='MEMORY_STALE');}finally{f.s.repository.transaction=transaction;}
 assert.deepEqual(await all(f.s),before);
});


test('typed operation ACK cannot be rebound to a same-URL replacement iframe document',async()=>{
 const f=await fixture(),url='https://chatgpt.com/c/synthetic',nonce='11111111-1111-4111-8111-111111111111',hit=(await page(f.service)).items[0];let documentId='private-original',effects=0,activations=0;
 const api={runtime:{id:'ext',getURL:p=>'chrome-extension://ext/'+p,getContexts:async()=>[{documentId,tabId:7,windowId:4,frameId:9,documentUrl:'chrome-extension://ext/ui/prompt-surface.html#'+nonce}]},windows:{get:async()=>({focused:true})},tabs:{get:async()=>({id:7,url,windowId:4,active:true}),update:async()=>{activations++;},sendMessage:async(_id,r)=>{if(r.type==='PAIA_PROMPT_SURFACE_PROBE')return {open:true,nonce,url};effects++;return {status:'inserted',verified:true};}}};
 const gateway=new PromptSurfaceCommands(new PromptReuseCommands(f.service,api),api),operationId=crypto.randomUUID(),send=()=>gateway.handle({type:'PAIA_PROMPT_SURFACE_RPC',nonce,command:{type:'PAIA_PROMPT_SELECTION_INSERT',ref:hit.ref,range:null,target:{url,documentId,nonce},operationId}},{id:'ext',tab:{id:7},frameId:9,url:api.runtime.getURL('ui/prompt-surface.html')+'#'+nonce,documentId,documentLifecycle:'active'});
 const result=await send();assert.equal(result.verified,true);assert.deepEqual(await send(),result);documentId='private-replacement';await assert.rejects(send(),e=>e.code==='INVALID_REQUEST');assert.equal(effects,1);assert.equal(activations,0);
});
