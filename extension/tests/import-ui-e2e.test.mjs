import test from 'node:test';import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
test('isolated Chrome file consent, schema gate, safe UI, and close lifecycle never import or change settings',{timeout:60000},async()=>{
 const h=await FakeChatGPT.start();try{
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await h.archive.locator('#sync-history').waitFor();const before=await h.state();
  await h.archive.locator('#sync-history').click();assert.equal(await h.archive.locator('#history-choose').isDisabled(),true);assert.equal(await h.archive.locator('#history-commit').isDisabled(),true);
  await h.archive.locator('#history-file-consent').check();const chooser=h.archive.waitForEvent('filechooser');await h.archive.locator('#history-choose').click();await (await chooser).setFiles({name:'SYNTHETIC_PRIVATE_FILENAME.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({title:'SYNTHETIC_PRIVATE_TITLE',body:'SYNTHETIC_PRIVATE_BODY'}))});
  await eventually(async()=>(await h.archive.locator('#history-status').textContent()).includes('无法可靠识别'));assert.equal(await h.archive.locator('#history-commit').isDisabled(),true);assert.equal(await h.archive.locator('#history-file-consent').isChecked(),false);
  const text=await h.archive.locator('#history-dialog').textContent();for(const secret of ['SYNTHETIC_PRIVATE_FILENAME','SYNTHETIC_PRIVATE_TITLE','SYNTHETIC_PRIVATE_BODY'])assert.equal(text.includes(secret),false);
  assert.deepEqual(await h.state(),before);const tasks=await h.archive.evaluate(()=>chrome.runtime.sendMessage({type:'IMPORT_TASKS'}));assert.deepEqual(tasks.data,{tasks:[],nextCursor:null});
  await mkdir('work/import-ui',{recursive:true});await h.archive.screenshot({path:'work/import-ui/schema-gate.png'});
  await h.archive.locator('#history-close').click();await h.archive.locator('#history-dialog').waitFor({state:'hidden'});await h.archive.locator('[data-view="settings"]').click();await h.archive.locator('[data-view="archive"]').click();await h.archive.locator('#sync-history').click();assert.equal(await h.archive.locator('#history-file-consent').isChecked(),false);assert.equal(await h.archive.locator('#history-pause').isDisabled(),true);await h.archive.keyboard.press('Escape');await h.archive.locator('#history-dialog').waitFor({state:'hidden'});
  assert.deepEqual(await h.state(),before);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
test('isolated test-only adapter exercises real background IDB batches, paused file reselection and dedupe',{timeout:60000},async()=>{
 const {mkdtemp,cp,readFile,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {syntheticRow}=await import('./fixtures/import-adapter.mjs');const dir=await mkdtemp(join(tmpdir(),'paia-synthetic-import-'));let h;
 try{
  for(const name of ['manifest.json','adapter','content','background','core','ui','icons'])await cp(name,join(dir,name),{recursive:true});
  // Only the disposable test extension registers an invented adapter. Production registry stays empty.
  await writeFile(join(dir,'core/import/synthetic-test-adapter.js'),await readFile('tests/fixtures/import-adapter.mjs'));
  await writeFile(join(dir,'core/import/registry.js'),"import {syntheticAdapter} from './synthetic-test-adapter.js';export const VERIFIED_EXPORT_ADAPTER_IDS=Object.freeze([]);export const SUPPORTED_EXPORT_ADAPTER_IDS=Object.freeze(['synthetic-v1']);export const getOfficialExportAdapter=()=>syntheticAdapter;export const officialExportStatus=()=>({available:true,schemaVerified:false});\n");
  h=await FakeChatGPT.start({extensionPath:dir});await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await h.archive.locator('#sync-history').waitFor();
  const pick=async()=>{await h.archive.locator('#history-file-consent').check();const c=h.archive.waitForEvent('filechooser');await h.archive.locator('#history-choose').click();await(await c).setFiles({name:'synthetic-only.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(Array.from({length:33},(_,i)=>syntheticRow(i+1))))});await eventually(()=>h.archive.locator('#history-commit').isEnabled());};
  await h.archive.locator('#sync-history').click();await pick();assert.equal((await h.state()).records.length,0);await h.archive.locator('#history-close').click();await h.archive.locator('#history-dialog').waitFor({state:'hidden'});
  await h.restartWorker();await h.archive.locator('#sync-history').click();await h.archive.locator('#history-tasks button').first().click();await pick();await h.archive.locator('#history-commit').click();await eventually(async()=>(await h.archive.locator('#history-status').textContent())==='历史补全完成。');
  const state=await h.state();assert.equal(state.records.length,33);assert.equal(state.library.blocks.length,33);assert.ok(state.records.every(r=>r.timeSource==='official_export'));
  await h.archive.locator('#history-close').click();await h.archive.locator('#history-dialog').waitFor({state:'hidden'});await h.archive.locator('#sync-history').click();await pick();await h.archive.locator('#history-commit').click();await eventually(async()=>(await h.archive.locator('#history-status').textContent())==='历史补全完成。');assert.deepEqual((await h.state()).records,state.records);assert.deepEqual((await h.state()).library,state.library);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h?.close();await rm(dir,{recursive:true,force:true});}
});
