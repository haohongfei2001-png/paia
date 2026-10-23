// Prepared only: no test registration or browser launch. The integration owner
// calls this on an original instrumentedExtension disposable copy, then passes
// its existing isolated FakeChatGPT instance to the runner below.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {root} from './storage-harness.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function prepareSyncLifecycleNative(extension){
 assert.ok(extension?.path&&extension.path!==root&&typeof extension.cleanup==='function','owned disposable extension required');
 const configPath=join(extension.path,'background/sync-lifecycle-configuration.js'),workerPath=join(extension.path,'background/service-worker.js');
 const before=await readFile(configPath,'utf8');assert.equal(before,await readFile(join(root,'background/sync-lifecycle-configuration.js'),'utf8'));
 const config=`let attempts=0;export const syntheticAttempts=()=>attempts;export function readSyncLifecycleConfiguration(){return {provider:'google-drive',datasetId:'SYNTHETIC_native_local_sync',deviceId:'SYNTHETIC_native_device',binding:{subject:'SYNTHETIC_native_subject',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_native_generation',scopes:['https://www.googleapis.com/auth/drive.appdata']},isCurrent:()=>true,request:async()=>{attempts++;throw Error('SYNTHETIC transport unavailable; no HTTP');}};}\n`;
 const bridge=`\nimport {syntheticAttempts} from './sync-lifecycle-configuration.js';
globalThis.__localSyncNative={ready,async inspect(){await ready;return {native:store.repository.db instanceof IDBDatabase,view:await syncLifecycle.snapshot(),attempts:syntheticAttempts(),task:(await chrome.storage.local.get('paia-sync-local-lifecycle:v1'))['paia-sync-local-lifecycle:v1']?.task,journals:[store.sourceBootstrapJournal,store.sourcePurgeJournal,store.filterIntentJournal,store.inputWorkingJournal].every(j=>j?.core.repository===store.repository)};},async capture(){await ready;return store.capture({epoch:(await store.status()).epoch,adapterVersion:'0.3.0',chat:{id:'SYNTHETIC_native_sync',url:'https://chatgpt.com/c/SYNTHETIC_native_sync',title:'SYNTHETIC local sync'},messages:[{sourceMessageId:'SYNTHETIC_one',pageOrder:1,originalText:'SYNTHETIC original retained'}]});}};\n`;
 const worker=await readFile(workerPath,'utf8');await writeFile(configPath,config);await writeFile(workerPath,worker+bridge);
 return {configurationSha256:sha(config),originalWorkerSha256:sha(worker),bridgeSha256:sha(bridge),claim:'PREPARED_ONLY_NO_NATIVE_RESULT'};
}
export async function runSyncLifecycleNative(h){
 // This uses the visible original Settings modal inside the headless harness,
 // not a parallel Sync page or a direct lifecycle.handle replacement.
 const p=h.archive,worker=()=>h.context.serviceWorkers().find(w=>w.url()===`chrome-extension://${h.extensionId}/background/service-worker.js`),inspect=()=>worker().evaluate(()=>globalThis.__localSyncNative.inspect());
 // Match the original Settings owning native fixture: the default small CDP
 // window uses compact navigation and legitimately hides the desktop sidebar.
 // Resize the owned headless window/viewport; never force a hidden UI control.
 const session=await h.context.newCDPSession(p),{windowId}=await session.send('Browser.getWindowForTarget');
 try{await session.send('Browser.setWindowBounds',{windowId,bounds:{width:1280,height:900}});const {bounds}=await session.send('Browser.getWindowBounds',{windowId});assert.equal(bounds.width,1280);assert.equal(bounds.height,900);}finally{await session.detach();}
 await p.setViewportSize({width:1280,height:900});
 // FakeChatGPT's ordinary onboarding entry already advances the welcome page.
 // Consume the genuine one-click consent path and await its actual readback.
 await p.locator('#enable-consent').waitFor({state:'visible'});await p.locator('#enable-consent').click();
 await p.waitForFunction(async()=>{const r=await chrome.runtime.sendMessage({type:'GET_STATUS'});return r?.ok===true&&r.data.consented===true;});
 await p.locator('.sidebar-bottom [data-view=settings]').click();await p.locator('#settings-panel').waitFor({state:'visible'});await p.locator('#settings-sync').click();
 const button=name=>p.locator(`#settings-sync-dialog [data-sync-command=${name}]`);
 await button('RESUME').waitFor({state:'visible'});assert.equal((await inspect()).attempts,0);await button('RESUME').click();await button('NOW').waitFor({state:'visible'});
 const baseline=await inspect();assert.equal(baseline.native,true);assert.equal(baseline.journals,true);assert.equal(baseline.view.wholeArchiveComplete,false);
 assert.equal((await worker().evaluate(()=>globalThis.__localSyncNative.capture())).added,1);
 await button('NOW').click();await p.waitForFunction(()=>/未确定|undetermined/.test(document.querySelector('#settings-sync-state')?.textContent??''));
 const unknown=await inspect();assert.equal(unknown.view.task.phase,'unknown');assert.ok(unknown.attempts>0);assert.equal(unknown.view.wholeArchiveComplete,false);assert.equal(await button('NOW').isVisible(),false);
 await button('STATUS').click();await button('PAUSE').waitFor({state:'visible'});await button('PAUSE').click();await button('RESUME').waitFor({state:'visible'});
 const paused=await inspect();assert.equal(paused.view.state,'paused');assert.equal(paused.attempts,unknown.attempts);
 await h.restartWorker();const cold=await inspect();assert.equal(cold.view.state,'paused');assert.deepEqual(cold.task,paused.task);assert.equal(cold.attempts,0,'cold startup never resends unknown work');
 assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
 return {status:'LOCAL_SETTINGS_WORKER_NATIVE_PARTIAL_ONLY',unknownTaskRetained:true,coldPaused:true,noAutomaticTransfer:true,wholeArchiveComplete:false,checkpointProduced:false,confirmedUpload:false};
}
