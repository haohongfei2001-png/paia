import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,copyFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FakeChatGPT,conversation,eventually,pause} from './harness/fake-chatgpt.mjs';

test('actual internal UI reload loads disk changes, preserves all archive/library data and rejects page/synthetic commands', {timeout:65000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'paia-reload-e2e-'));let h;
 try{
  const built=spawnSync('python3',['-c','from pathlib import Path; from scripts.build_internal import build_internal; import sys; build_internal(Path.cwd(),Path(sys.argv[1]))',dir],{encoding:'utf8'});assert.equal(built.status,0,built.stderr);
  const internalPopup=await readFile(join(dir,'ui/popup.html'),'utf8'),internalScript=await readFile(join(dir,'ui/development-reload.js'),'utf8');
  // Start without the reload control: this models first deployment in an existing unpacked build.
  await copyFile('ui/popup.html',join(dir,'ui/popup.html'));await rm(join(dir,'ui/development-reload.js'));
  h=await FakeChatGPT.start({extensionPath:dir});const id=h.extensionId;
  // Match an ordinary unpacked development installation, only in this disposable profile.
  const manager=await h.context.newPage();await manager.goto('chrome://extensions');
  await manager.locator('#devMode').click();assert.equal(await manager.locator('#devMode').getAttribute('aria-pressed'),'true');await manager.close();
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();const c=conversation('synthetic-reload-chat'),chat=await h.open(c);await eventually(async()=>(await h.state()).records.length===3);
  const initial=await h.state();await h.archive.evaluate(async blocks=>{
   await chrome.runtime.sendMessage({type:'UPDATE_LIBRARY',id:blocks[0].id,changes:{libraryText:'虚构持久整理',note:'虚构持久备注'}});
   await chrome.runtime.sendMessage({type:'EXCLUDE_LIBRARY',id:blocks[1].id,excluded:true});
   await chrome.runtime.sendMessage({type:'SET_ENABLED',enabled:false});
  },initial.library.blocks);
  const before=await h.archive.evaluate(()=>chrome.storage.local.get(null));
  const worker=h.context.serviceWorkers().find(w=>w.url().includes(id));await worker.evaluate(()=>{globalThis.syntheticReloadMarker=true;});
  let popup=await h.context.newPage();const popupURL=`chrome-extension://${id}/ui/popup.html`;await popup.goto(popupURL);assert.equal(await popup.locator('#development-reload').count(),0);await popup.close();
  await writeFile(join(dir,'ui/popup.html'),internalPopup);await writeFile(join(dir,'ui/development-reload.js'),internalScript);
  const manifest=JSON.parse(await readFile(join(dir,'manifest.json')));manifest.version_name+=' synthetic-disk-update';await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest));
  popup=await h.context.newPage();await popup.goto(popupURL);await popup.locator('#development-reload').waitFor();
  assert.equal(await worker.evaluate(()=>globalThis.syntheticReloadMarker),true,'new popup sees disk control before any extension reload');
  await chat.evaluate(()=>{window.postMessage({type:'DEV_RELOAD'},'*');window.postMessage({channel:'paia-development',command:'reload'},'*');});
  await popup.evaluate(()=>{document.getElementById('development-reload').click();window.postMessage({type:'DEV_RELOAD'},'*');});
  const rejected=await h.archive.evaluate(()=>chrome.runtime.sendMessage({type:'DEV_RELOAD'}));assert.equal(rejected.ok,false);
  await pause(250);assert.equal(await worker.evaluate(()=>globalThis.syntheticReloadMarker),true);
  await popup.locator('#development-reload').click().catch(error=>{if(!popup.isClosed())throw error;});
  // Browser may close or recreate extension pages as part of a real reload.
  await pause(500);
  const check=await h.context.newPage();
  await check.goto(popupURL);
  assert.equal(await check.evaluate(()=>chrome.runtime.getManifest().version_name),manifest.version_name);
  const awake=h.context.serviceWorkers().find(w=>w.url().includes(id));assert.ok(awake);assert.equal(await awake.evaluate(()=>typeof globalThis.syntheticReloadMarker),'undefined','fresh worker heap even when Chromium reuses the target object');
  assert.deepEqual(await check.evaluate(()=>chrome.storage.local.get(null)),before,'reload never clears or rewrites durable archive/library');
  h.archive=await h.context.newPage();await h.archive.goto(`chrome-extension://${id}/ui/archive.html`);
  const after=await h.state();assert.deepEqual(after.records,initial.records);assert.equal(after.library.blocks[0].libraryText,'虚构持久整理');assert.equal(after.library.blocks[1].excluded,true);
  assert.equal(h.extensionNetworkRequests,0);
 }finally{await h?.close();await rm(dir,{recursive:true,force:true});}
});
