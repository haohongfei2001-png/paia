import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture,eventually} from './organize-native-fixture.mjs';
import {setAIView} from '../../../extension/tests/harness/consumer-ai-browser.mjs';

for(const variant of ['source','release'])test('configured original '+variant+' UI click reaches original worker action and saved Current',{timeout:60000},async t=>{
 const f=await nativeFixture(t,{variant});
 await setAIView(f.p,true);
 const refresh=f.p.locator('[data-ai-organize-refresh]');await refresh.waitFor({state:'visible'});
 assert.equal(f.backend.physical(),0,'opening the configured AI view cannot dispatch');
 await refresh.evaluate(node=>node.addEventListener('click',event=>{globalThis.__organizeClickTrusted=event.isTrusted;},{once:true}));
 await refresh.click();
 await eventually(async()=>(await f.snapshot()).jobs.some(row=>row.state==='COMMITTED'),'original UI action commits');
 await eventually(async()=>await refresh.isEnabled()&&await f.p.locator('#ai-topic-status').textContent().then(text=>text.includes('本次整理已更新当前阅读内容')),'original UI confirms Current');
 assert.equal(await f.p.evaluate(()=>globalThis.__organizeClickTrusted),true);
 const state=await f.snapshot(),trace=await f.worker.evaluate(()=>globalThis.__organizeNative.senders);
 assert.equal(f.backend.physical(),1);assert.equal(state.candidate?.revision,1);assert.equal(state.candidate?.candidate,undefined);assert.equal(state.revisions.filter(r=>r.kind==='ai_presentation'&&r.actor==='ai').length,1);
 assert.deepEqual(trace.map(row=>row.type),['GET_AI_PRESENTATION_SCOPE','UPDATE_AI_PRESENTATION']);
 assert.equal(trace[0].documentId,trace[1].documentId);assert.equal(trace[0].tabId,trace[1].tabId);
 await eventually(()=>f.p.locator('[data-ai-field="currentView"]').textContent().then(text=>text.includes('SYNTHETIC original native entry 0')),'new Current is actually read back into the existing editor');
 assert.equal(await f.p.locator('[data-topic-candidate-review]').count(),0);
 assert.equal(await f.p.locator('[data-candidate-decision]').count(),0,'retired adoption controls remain absent');
 assert.equal(f.backend.physical(),1,'reading Current cannot dispatch');
 f.quiet();t.diagnostic(JSON.stringify({variant,trustedClick:true,originalWorker:true,physical:1,current:true}));
});

for(const variant of ['source','release'])test('configured original '+variant+' UI stop refuses a late result without another attempt',{timeout:60000},async t=>{
 let enter,release;const entered=new Promise(resolve=>enter=resolve),held=new Promise(resolve=>release=resolve);
 const f=await nativeFixture(t,{variant,holdProvider:async()=>{enter();await held;}});t.after(()=>release());
 await setAIView(f.p,true);const refresh=f.p.locator('[data-ai-organize-refresh]');await refresh.click();
 await entered;await f.p.getByRole('button',{name:'停止本次整理',exact:true}).click();
 await eventually(()=>f.worker.evaluate(async()=>{const n=globalThis.__organizeNative;if(!n.lastAction)throw Error('Original action missing');try{return !await n.source.current(n.lastAction,n.lastSender);}catch(error){if(error.code!=='UNAVAILABLE')throw error;return true;}}),'original stop retires the consumed action before the held response');
 release();
 await eventually(()=>f.worker.evaluate(()=>globalThis.__organizeNative.results.some(row=>row.type==='UPDATE_AI_PRESENTATION')),'original stopped request settles');
 await eventually(()=>refresh.isEnabled(),'UI leaves its pending state');
 const state=await f.snapshot(),text=await f.p.locator('#ai-topic-status').textContent();
 assert.equal(!!state.candidate?.candidate,false);assert.equal(state.candidate,undefined);assert.equal(state.revisions.filter(r=>r.kind==='ai_presentation').length,0);assert.equal(state.work.filter(row=>row.state==='ACKNOWLEDGED').length,0);
 assert.equal(f.backend.physical(),1);assert.equal(f.backend.calls.filter(row=>row.path==='/api/results').length,0);
 assert.doesNotMatch(text,/本次整理已更新当前阅读内容|本次整理结果已保存/);
 f.quiet();t.diagnostic(JSON.stringify({variant,stopped:true,candidate:false,physical:1,status:text}));
});
