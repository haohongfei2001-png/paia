import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture,rpc,eventually} from './organize-native-fixture.mjs';
for(const variant of ['source','release'])test('Organize signed native '+variant+' original sender and atomic result',{timeout:60000},async t=>{
 const f=await nativeFixture(t,{variant});
 const result=await f.run();if(!result.completed)t.diagnostic(JSON.stringify({failure:await f.worker.evaluate(()=>globalThis.__organizeNative.failure),bridge:f.bridge,calls:f.backend.calls.map(x=>x.path),snapshot:await f.snapshot()}));assert.equal(result.completed,true,JSON.stringify(result));assert.equal(result.currentPublished,true);assert.equal(result.revision,1);
 const state=await f.snapshot();assert.equal(state.jobs.length,1);assert.equal(state.jobs[0].state,'COMMITTED');assert.equal(f.backend.physical(),1);assert.equal(state.usage[0].attemptCount,1);assert.equal(state.usage[0].financialSettlement.settledSpendMicros,120);assert.equal(state.candidate?.revision,1);assert.equal(state.candidate?.candidate,undefined);assert.equal(state.revisions.filter(r=>r.kind==='ai_presentation'&&r.actor==='ai').length,1);
 const native=await f.worker.evaluate(()=>({native:/\[native code\]/.test(IDBFactory.prototype.open.toString()),senders:globalThis.__organizeNative.senders}));
 assert.equal(native.native,true);assert.ok(native.senders.some(s=>s.type==='UPDATE_AI_PRESENTATION'&&s.frameId===0&&s.documentId&&s.tabId>=0&&s.url===chromeURL(s.id)));
 function chromeURL(id){return 'chrome-extension://'+id+'/ui/archive.html';}
 f.quiet();t.diagnostic(JSON.stringify({variant,browser:await f.h.context.browser().version(),native:true,senders:native.senders.length,physical:f.backend.physical(),job:state.jobs[0].state,bridge:f.bridge}));
});

for(const variant of ['source','release'])for(const mode of ['control','synchronous','queued'])test('Organize native '+variant+' last Topic fence '+mode,{timeout:60000},async t=>{
 const f=await nativeFixture(t,{variant,count:21});await f.worker.evaluate(({mode,topicId})=>globalThis.__organizeNative.installTerminal(mode,topicId),{mode,topicId:f.topic.id});
 const result=await f.run(),state=await f.snapshot(),terminal=await f.worker.evaluate(()=>globalThis.__organizeNative.terminal);
 assert.equal(terminal.attached,1);assert.equal(f.backend.physical(),2);assert.equal(state.usage.length,2);assert.ok(state.usage.every(x=>x.attemptCount===1&&x.financialSettlement.settledSpendMicros===120));
 if(mode==='control'){assert.equal(result.completed,true);assert.equal(state.candidate?.revision,1);assert.equal(state.candidate?.candidate,undefined);assert.equal(state.revisions.filter(r=>r.kind==='ai_presentation'&&r.actor==='ai').length,1);assert.equal(terminal.hit,0);assert.ok(terminal.events.some(e=>e.kind==='complete'&&e.trusted));}
 else{assert.ok(result.error);assert.equal(terminal.hit,1);assert.equal(!!state.candidate?.candidate,false);assert.equal(state.candidate,undefined);assert.equal(state.revisions.filter(r=>r.kind==='ai_presentation').length,0);assert.equal(state.receipts.filter(r=>r.id.startsWith('ai-presentation-current:')).length,0);assert.equal(state.marker,undefined);assert.equal(state.work.filter(x=>x.state==='ACKNOWLEDGED').length,0);assert.equal(f.backend.calls.filter(x=>x.path==='/api/results').length,0);assert.ok(terminal.events.some(e=>e.kind==='abort'&&e.trusted));assert.equal(terminal.events.some(e=>e.kind==='complete'),false);}
 await f.worker.evaluate(()=>globalThis.__organizeNative.restoreTerminal());f.quiet();t.diagnostic(JSON.stringify({variant,mode,terminal,physical:f.backend.physical(),job:state.jobs[0].state}));
});

for(const variant of ['source','release'])for(const mode of ['invalidate','close','edit','undo'])test('Organize native '+variant+' held provider '+mode,{timeout:60000},async t=>{
 let enter,release;const entered=new Promise(r=>enter=r),held=new Promise(r=>release=r);
 const f=await nativeFixture(t,{variant,holdProvider:async()=>{enter();await held;}});t.after(()=>release());
 const before=await f.snapshot(),entry=before.entries[0],task=f.run();task.catch(()=>{});
 try{
  await Promise.race([entered,task.then(result=>{throw Error('Provider not entered: '+JSON.stringify(result));})]);
  if(mode==='invalidate')await f.worker.evaluate(()=>globalThis.__organizeNative.source.invalidate());
  if(mode==='close')await f.p.close();
  if(mode==='edit'||mode==='undo'){
   const field=f.p.locator('[data-entry-id="'+entry.id+'"] [data-entry-field="body"]');await field.waitFor({state:'visible'});
   await field.evaluate(node=>{globalThis.__nativeEditEvents=[];node.addEventListener('input',event=>globalThis.__nativeEditEvents.push({trusted:event.isTrusted,type:event.inputType}));});
   await field.click();await f.p.keyboard.press(process.platform==='darwin'?'Meta+ArrowRight':'End');await f.p.keyboard.type(' edited');
   await eventually(async()=>(await rpc(f.p,'GET_LIBRARY_ENTRY',{id:entry.id})).body===entry.thoughtText+' edited','real edit durable');
   assert.ok((await f.p.evaluate(()=>globalThis.__nativeEditEvents)).some(e=>e.trusted));
   if(mode==='undo'){await f.p.keyboard.press(process.platform==='darwin'?'Meta+z':'Control+z');await eventually(async()=>(await rpc(f.p,'GET_LIBRARY_ENTRY',{id:entry.id})).body===entry.thoughtText,'real Undo durable');}
  }
  release();const result=await task.catch(error=>({closed:true,message:error.message}));
  if(mode==='close'){assert.equal(result.closed,true);await eventually(()=>f.worker.evaluate(()=>globalThis.__organizeNative.results.some(r=>r.type==='UPDATE_AI_PRESENTATION')),'closed sender settles in original worker');}
  else assert.ok(result.error,JSON.stringify(result));
  const after=await f.snapshot();assert.equal(f.backend.physical(),1);assert.equal(after.usage.length,1);assert.equal(after.usage[0].attemptCount,1);assert.equal(!!after.candidate?.candidate,false);assert.equal(after.candidate,undefined);assert.equal(after.revisions.filter(r=>r.kind==='ai_presentation').length,0);assert.equal(after.receipts.filter(r=>r.id.startsWith('ai-presentation-current:')).length,0);assert.equal(after.work.filter(x=>x.state==='ACKNOWLEDGED').length,0);
  if(mode==='edit')assert.equal(after.entries[0].thoughtText,entry.thoughtText+' edited');if(mode==='undo'){assert.equal(after.entries[0].thoughtText,entry.thoughtText);assert.ok(after.entries[0].revision>entry.revision);}
  if(mode==='invalidate'||mode==='close')assert.equal(await f.worker.evaluate(async()=>{const n=globalThis.__organizeNative;if(!n.lastAction)throw Error('Original action was never captured');try{return await n.source.current(n.lastAction,n.lastSender);}catch(error){if(error.code!=='UNAVAILABLE')throw error;return false;}}),false,'retired original action cannot accept the late result');
  f.quiet();t.diagnostic(JSON.stringify({variant,mode,physical:f.backend.physical(),job:after.jobs[0].state,bridge:f.bridge}));
 }finally{release();await task.catch(()=>{});}
});

test('Organize native real 30-second selection expiry and separate 35-second HTTP abort',{timeout:45000},async t=>{
 let enter,release;const entered=new Promise(r=>enter=r),held=new Promise(r=>release=r);
 // Hold the HTTP reply, not the provider: its original 20-second timeout
 // would otherwise finish before the unchanged client 35-second timer.
 const f=await nativeFixture(t,{holdProviderResponse:async()=>{enter();await held;}});t.after(()=>release());const start=performance.now(),task=f.run();task.catch(()=>{});
 try{await Promise.race([entered,task.then(result=>{throw Error('Provider not entered '+JSON.stringify(result));})]);await new Promise(r=>setTimeout(r,Math.max(0,30100-(performance.now()-start))));assert.equal(await f.worker.evaluate(async()=>{const n=globalThis.__organizeNative;if(!n.lastAction)throw Error('Original action was never captured');try{return await n.source.current(n.lastAction,n.lastSender);}catch(error){if(error.code!=='UNAVAILABLE')throw error;return false;}}),false,'original selection is already expired at 30 seconds');await eventually(()=>Promise.resolve(f.bridge.aborts>=1),'unchanged 35-second HTTP owner abort reaches transport');release();const result=await task;assert.ok(result.error);const state=await f.snapshot();assert.equal(!!state.candidate?.candidate,false);assert.equal(state.candidate,undefined);assert.equal(state.revisions.filter(r=>r.kind==='ai_presentation').length,0);assert.equal(state.receipts.filter(r=>r.id.startsWith('ai-presentation-current:')).length,0);assert.equal(state.work.filter(x=>x.state==='ACKNOWLEDGED').length,0);assert.equal(f.backend.physical(),1);assert.ok(f.bridge.aborts>=1);f.quiet();t.diagnostic(JSON.stringify({elapsed:performance.now()-start,job:state.jobs[0].state,bridge:f.bridge}));}finally{release();await task.catch(()=>{});}
});

test('Organize native retained CAS result needs fresh action after real first deadline and no extra provider',{timeout:45000},async t=>{
 const f=await nativeFixture(t);await f.worker.evaluate(()=>globalThis.__organizeNative.failNextACK());const start=performance.now();
 const first=await f.run();assert.equal(first.error,'STORAGE_FAILED');assert.equal(await f.worker.evaluate(()=>globalThis.__organizeNative.failedACK()),true);const before=await f.snapshot();assert.equal(f.backend.physical(),1);assert.equal(!!before.candidate?.candidate,false);assert.equal(before.candidate,undefined);assert.equal(before.revisions.filter(r=>r.kind==='ai_presentation').length,0);assert.equal(before.receipts.filter(r=>r.id.startsWith('ai-presentation-current:')).length,0);
 await new Promise(r=>setTimeout(r,Math.max(0,30100-(performance.now()-start))));const result=await f.run();assert.equal(result.completed,true,JSON.stringify(result));const after=await f.snapshot();assert.equal(after.jobs[0].id,before.jobs[0].id);assert.equal(after.jobs.length,1);assert.equal(after.usage[0].id,before.usage[0].id);assert.deepEqual(after.usage[0].financialSettlement,before.usage[0].financialSettlement);assert.equal(f.backend.physical(),1);assert.equal(after.jobs[0].state,'COMMITTED');assert.equal(after.candidate?.revision,1);assert.equal(after.candidate?.candidate,undefined);assert.equal(after.revisions.filter(r=>r.kind==='ai_presentation'&&r.actor==='ai').length,1);f.quiet();t.diagnostic(JSON.stringify({elapsed:performance.now()-start,sameJob:true,physical:f.backend.physical()}));
});
