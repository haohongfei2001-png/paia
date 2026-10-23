import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {root,instrumentedExtension} from '../../extension/tests/native-sync/storage-harness.mjs';
import {FakeChatGPT,eventually} from '../../extension/tests/harness/fake-chatgpt.mjs';
test('actual extension page owners freeze only settled pages and preserve an IME Context draft',{timeout:90000},async()=>{
 let extension,h;const receipt={claim:'EXTENSION_DOCUMENT_FREEZE_ONLY_NOT_ACTIVATION',status:'IN_PROGRESS'};
 try{
  extension=await instrumentedExtension(root);
  await writeFile(join(extension.path,'background/editor-consent-observer.mjs'),await readFile(join(root,'tests/harness/ans07-seed-evidence.mjs')));
  const path=join(extension.path,'background/service-worker.js');await writeFile(path,await readFile(path,'utf8')+`\nglobalThis.__editorNative={ready,async freeze(){await ready;const rows=await chrome.runtime.getContexts({});const row=rows.find(c=>c.documentUrl===chrome.runtime.getURL('ui/archive.html'));if(!row)throw Error('ARCHIVE_DOCUMENT_MISSING');this.token=await applicationEditors.freezeExtensionPages(row.documentId);return {count:rows.filter(c=>c.contextType!=='BACKGROUND').length};},async check(){await applicationEditors.fenceExtensionPages(this.token);return applicationEditors.assertFrozenExtensionPages(this.token);},release(){applicationEditors.release(this.token);this.token=null;}};\n`);
  h=await FakeChatGPT.start({extensionPath:extension.path,headless:true,launchThroughPort:true,viewport:{width:1440,height:900}});const p=h.archive;
  const session=await h.context.newCDPSession(p),{windowId}=await session.send('Browser.getWindowForTarget');try{await session.send('Browser.setWindowBounds',{windowId,bounds:{width:1280,height:900}});}finally{await session.detach();}await p.setViewportSize({width:1280,height:900});
  await p.evaluate(async()=>{const {observeANS07Consent}=await import(chrome.runtime.getURL('background/editor-consent-observer.mjs'));globalThis.__editorConsent=observeANS07Consent(chrome.runtime,{});});
  await p.locator('#enable-consent').click();await p.evaluate(()=>__editorConsent.complete());await p.evaluate(()=>__editorConsent.stop());
  if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  await p.locator('.sidebar-bottom [data-view="settings"]').click();await p.locator('#settings-panel').waitFor({state:'visible'});
  const popup=await h.context.newPage();popup.on('pageerror',e=>h.errors.push(e.message));await popup.goto('chrome-extension://'+h.extensionId+'/ui/popup.html');await popup.waitForFunction(()=>document.getElementById('next-enabled')?.disabled===false);
  const worker=h.context.serviceWorkers().find(w=>w.url().endsWith('/background/service-worker.js'));
  receipt.settled=await worker.evaluate(()=>__editorNative.freeze());assert.equal(receipt.settled.count,2);assert.equal(await worker.evaluate(()=>__editorNative.check()),true);
  assert.equal(await p.evaluate(()=>{const e=new InputEvent('beforeinput',{bubbles:true,cancelable:true,data:'SYNTHETIC_BLOCKED'});document.body.dispatchEvent(e);return e.defaultPrevented;}),true);
  await worker.evaluate(()=>__editorNative.release());
  await p.locator('.sidebar [data-view="memory"]').click();await p.locator('.context-card[data-card="info"] .card-link').click();await p.locator('.add-item').click();const field=p.locator('#memory-panel .item-text').first();
  await field.evaluate(el=>{el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));el.textContent='SYNTHETIC unsaved IME draft';});
  const denied=await worker.evaluate(async()=>{try{await __editorNative.freeze();return 'UNEXPECTED_ACCEPT';}catch(e){return e.code;}});assert.equal(denied,'GENERATION_EDITOR_PROTECTION_REQUIRED');assert.equal(await field.innerText(),'SYNTHETIC unsaved IME draft');
  const snapshot=await p.evaluate(()=>chrome.runtime.sendMessage({type:'PAIA_CONTEXT_CARDS_SNAPSHOT'}));assert.equal(snapshot.ok,true);assert.equal(snapshot.data.items.length,0);receipt.draft={denied,retained:true,committedItems:0};
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);receipt.network={external:0,extension:0,errors:[]};receipt.chrome=h.context.browser().version();receipt.status='PASS';
 }catch(e){receipt.status='FAIL';if(h){receipt.page=await h.archive.evaluate(()=>({width:innerWidth,dialogs:[...document.querySelectorAll('dialog[open]')].map(x=>x.id),buttons:[...document.querySelectorAll('[data-view]')].map(x=>({view:x.dataset.view,visible:!!x.getClientRects().length}))})).catch(()=>null);await h.archive.screenshot({path:new URL('./native-window-failure.png',import.meta.url).pathname}).catch(()=>{});}receipt.error={name:e.name,message:e.message,stack:e.stack};throw e;}
 finally{await writeFile(new URL('./native-window-result.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');await h?.close();await extension?.cleanup();}
});
