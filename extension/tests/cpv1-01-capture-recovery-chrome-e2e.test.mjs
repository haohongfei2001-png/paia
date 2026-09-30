// Hosted synthetic Chrome only. No real user profile, input, credentials or site calls.
import {mkdtemp,readFile,rm,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,conversation,eventually,pause} from './harness/fake-chatgpt.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const evidence=join(root,'work/capture-recovery');
const baseline='81478c9';
async function rpc(h,message){const result=await h.archive.evaluate(m=>chrome.runtime.sendMessage(m),message);assert.equal(result.ok,true,JSON.stringify(result));return result.data;}
async function allow(h){await rpc(h,{type:'CONSENT',accepted:true});await rpc(h,{type:'FILTER_MODE',mode:'off'});}
async function devMode(h){
 const page=await h.context.newPage();
 try{await page.goto('chrome://extensions/');const toggle=page.locator('extensions-manager extensions-toolbar #devMode');
  await toggle.waitFor({state:'visible'});assert.equal(await toggle.evaluate(e=>e.disabled),false);
  if(!await toggle.evaluate(e=>e.checked))await toggle.click();
  await eventually(()=>page.evaluate(async()=>Boolean((await chrome.developerPrivate.getProfileConfiguration()).inDeveloperMode)));
 }finally{await page.close();}
}
async function isolated(h,page){
 const cdp=await h.context.newCDPSession(page),worlds=new Map();
 cdp.on('Runtime.executionContextCreated',({context})=>worlds.set(context.id,context));
 cdp.on('Runtime.executionContextDestroyed',({executionContextId})=>worlds.delete(executionContextId));
 cdp.on('Runtime.executionContextsCleared',()=>worlds.clear());await cdp.send('Runtime.enable');
 async function evaluate(expression){
  for(const world of [...worlds.values()].reverse())if(world.auxData?.isDefault===false){
   try{const {result}=await cdp.send('Runtime.evaluate',{contextId:world.id,returnByValue:true,expression:`Boolean(globalThis.chrome?.runtime?.id) && typeof globalThis.ChatGPTAdapter === 'function'`});
    if(result.value===true)return (await cdp.send('Runtime.evaluate',{contextId:world.id,returnByValue:true,expression})).result.value;
   }catch{}
  }
  return null;
 }
 return {cdp,evaluate};
}
async function reload(h,version){
 try{await h.archive.evaluate(()=>chrome.runtime.reload());}catch(error){if(!/Target page, context or browser has been closed|Execution context was destroyed/.test(String(error)))throw error;}
 await eventually(async()=>{const {extensions}=await h.cdp.send('Extensions.getExtensions');return extensions.some(e=>e.id===h.extensionId&&e.enabled&&e.version===version);},'same extension is enabled after actual reload',20000);
 h.archive=await h.context.newPage();await h.archive.goto(`chrome-extension://${h.extensionId}/ui/archive.html`);
 await eventually(async()=>{try{return (await rpc(h,{type:'GET_STATUS'}))!==null;}catch{return false;}},'new extension UI can read its existing archive');
}
async function saveEvidence(h,page,name,fields={}){
 await mkdir(evidence,{recursive:true});
 const records=(await h.state()).records;
 assert.ok(records.every(r=>!/(UNSENT_|FAKE_DRAFT|FAKE_EDITOR|FAKE_ASSISTANT|RESPONSE_BODY)/.test(r.originalText)));
 assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);
 await page.screenshot({path:join(evidence,name+'.png')});
 await writeFile(join(evidence,name+'.json'),JSON.stringify({status:'PASS',headSha:process.env.PAIA_TESTED_HEAD||null,name,recordCount:records.length,noExternalRequests:true,noUnsentOrAssistantArchived:true,...fields},null,2));
}
async function setup(old=false){
 const workspace=await mkdtemp(join(tmpdir(),'paia-recovery-')),release=join(workspace,'release');
 if(old){
  const archive=execFileSync('git',['archive',baseline,'extension'],{cwd:root,maxBuffer:64*1024*1024});
  execFileSync('tar',['-xf','-','-C',workspace],{input:archive});
  execFileSync('python3',['scripts/build_current_release.py',release],{cwd:join(workspace,'extension'),stdio:'pipe'});
 }else execFileSync('python3',['scripts/build_current_release.py',release],{cwd:root,stdio:'pipe'});
 const h=await FakeChatGPT.start({extensionPath:release,headless:true});await devMode(h);
 return {h,workspace,release,async close(){await h.close();await rm(workspace,{recursive:true,force:true});}};
}

for(const old of [false,true])test(`capture recovery: ${old?'unmodified old main upgrade':'same-version pending-status reload'} keeps the existing document and resumes durable capture`,{timeout:120000},async()=>{
 const f=await setup(old),{h,release}=f;
 try{
  await allow(h);const page=await h.open(conversation(old?'recover-legacy-chat':'recover-current-chat'),{arrival:'dom-first'});
  await eventually(async()=>(await h.state()).records.length===3);
  await h.draft(page,'UNSENT_RECOVERY_CANARY');await page.evaluate(()=>{window.documentIdentity='same-document';});
  const world=await isolated(h,page);
  if(!old){
   await world.evaluate(`(() => { const send=chrome.runtime.sendMessage.bind(chrome.runtime); globalThis.pendingRecoveryStatus=0; chrome.runtime.sendMessage=m=>{if(m.type==='GET_STATUS'&&m.contentVersion){globalThis.pendingRecoveryStatus++;return new Promise(()=>{});}return send(m);};return true;})()`);
   await eventually(async()=>await world.evaluate('globalThis.pendingRecoveryStatus')>0,'old capture awaits a lost transport reply');
  }else{
   // Build new bytes into the exact same unpacked path; never uninstall or reset data.
   execFileSync('python3',['scripts/build_current_release.py',release],{cwd:root,stdio:'pipe'});
  }
  await reload(h,'0.12.0');
  await eventually(async()=>await world.evaluate('globalThis.PAIACaptureLifecycle?.active === true && globalThis.PAIACaptureLifecycle?.ready === true'),'new pipeline acknowledges fresh status in the same document',20000);
  assert.equal(await page.evaluate(()=>window.documentIdentity),'same-document');
  assert.equal(await page.locator('textarea').inputValue(),'UNSENT_RECOVERY_CANARY');
  await h.send(page,{id:'recovered-new-message-004',text:'Synthetic sent text after automatic reconnect'});
  await eventually(async()=>(await h.state()).records.length===4,'actual source persists without refreshing ChatGPT');
  await page.evaluate(()=>window.postMessage({channel:'archive-response-control-v1',active:true,chat:location.pathname.split('/').at(-1),epoch:0,session:'late-legacy',history:true},location.origin));
  await h.respond(page,conversation(old?'recover-legacy-chat':'recover-current-chat'));
  await pause(2400);assert.equal((await h.state()).records.length,4,'late legacy controls and metadata do not duplicate source');
  assert.equal(await page.locator('#paia-reconnect-notice').count(),0);
  // Repeated same-version reload must replace the instance and preserve source IDs.
  const first=await world.evaluate('globalThis.PAIACaptureLifecycle.instance');
  const manifestPath=join(release,'manifest.json'),updated=JSON.parse(await readFile(manifestPath,'utf8'));
  updated.version='0.12.1';await writeFile(manifestPath,JSON.stringify(updated,null,2));
  await reload(h,'0.12.1');
  await eventually(async()=>{const current=await world.evaluate('globalThis.PAIACaptureLifecycle?.ready && globalThis.PAIACaptureLifecycle.instance');return current&&current!==first;});
  await h.send(page,{id:'recovered-new-message-005',text:'Synthetic sent text after repeated reconnect'});
  await eventually(async()=>(await h.state()).records.length===5);
  assert.equal(new Set((await h.state()).records.map(r=>r.sourceKey)).size,5);
  assert.equal(await page.evaluate(()=>window.documentIdentity),'same-document');
  assert.equal(await page.locator('textarea').inputValue(),'UNSENT_RECOVERY_CANARY');
  await saveEvidence(h,page,old?'legacy-upgrade':'same-version-reload',{baseline:old?baseline:null,sameDocument:true,repeatedReconnect:true});
  await world.cdp.detach();
 }finally{await f.close();}
});

test('capture recovery: no consent and pause remain fail-closed across real reload',{timeout:120000},async()=>{
 const f=await setup(),{h}=f;
 try{
  const page=await h.open(conversation('recover-consent-chat'),{arrival:'dom-first'});await h.draft(page,'UNSENT_NO_CONSENT');
  await reload(h,'0.12.0');await pause(2500);assert.equal((await h.state()).records.length,0);
  await allow(h);await eventually(async()=>(await h.state()).records.length===3);
  await rpc(h,{type:'SET_ENABLED',enabled:false});
  await h.send(page,{id:'paused-sent-message-004',text:'Synthetic sent while paused'});
  await reload(h,'0.12.0');await pause(2500);assert.equal((await h.state()).records.length,3);
  assert.equal((await rpc(h,{type:'GET_STATUS'})).enabled,false);
  assert.equal(await page.locator('#paia-reconnect-notice').count(),0);
  await saveEvidence(h,page,'consent-pause',{unconsentedRecords:0,pausedRecords:3});
 }finally{await f.close();}
});

test('capture recovery: transient status timeout and worker termination recover without any notice',{timeout:90000},async()=>{
 const f=await setup(),{h}=f;
 try{
  await allow(h);const page=await h.open(conversation('recover-timeout-chat'),{arrival:'dom-first'});await h.ready(page);
  await eventually(async()=>(await h.state()).records.length===3);const world=await isolated(h,page);
  await world.evaluate(`(() => {const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.timeoutInjected=false;chrome.runtime.sendMessage=m=>{if(m.type==='GET_STATUS'&&m.contentVersion&&!globalThis.timeoutInjected){globalThis.timeoutInjected=true;return new Promise(()=>{});}return send(m);};return true;})()`);
  await eventually(async()=>await world.evaluate('globalThis.timeoutInjected')===true);
  await h.send(page,{id:'timeout-sent-message-004',text:'Synthetic sent during a status timeout'});
  await eventually(async()=>(await h.state()).records.length===4,'timed-out cycle retries fresh status and persists pending DOM source',16000);
  assert.equal(await page.locator('#paia-reconnect-notice').count(),0);
  await h.restartWorker();await h.send(page,{id:'worker-sent-message-005',text:'Synthetic sent after worker termination'});
  await eventually(async()=>(await h.state()).records.length===5);
  assert.equal(await page.locator('#paia-reconnect-notice').count(),0);
  await saveEvidence(h,page,'transient-worker',{statusTimeoutRecovered:true,workerRestartRecovered:true});await world.cdp.detach();
 }finally{await f.close();}
});


test('capture recovery: permanent deletion wins over visible replay and late metadata',{timeout:90000},async()=>{
 const f=await setup(),{h}=f;
 try{
  await allow(h);const c=conversation('recover-tombstone-chat'),page=await h.open(c,{arrival:'dom-first'});
  await eventually(async()=>(await h.state()).records.length===3);
  const before=(await h.state()).records,deleted=before[0],world=await isolated(h,page);
  await world.evaluate('globalThis.PAIACaptureLifecycle.dispose(); true');
  await rpc(h,{type:'PURGE_SOURCE',id:deleted.id,confirm:true});
  await reload(h,'0.12.0');await h.ready(page);await h.respond(page,c);await pause(2600);
  const state=await h.state();assert.equal(state.records.length,2);
  assert.equal(state.records.some(r=>r.sourceKey===deleted.sourceKey),false);
  assert.ok(state.tombstones.some(t=>t.sourceIdentityHash===deleted.sourceKey&&t.status==='permanently_ignored'));
  for(const row of state.records){const original=before.find(r=>r.id===row.id);assert.ok(original);assert.equal(row.originalText,original.originalText);assert.equal(row.sourceKey,original.sourceKey);}
  await h.send(page,{id:'tombstone-new-message-004',text:'Synthetic allowed sent message after purge'});
  await eventually(async()=>(await h.state()).records.length===3);
  await saveEvidence(h,page,'tombstone-replay',{purgedSourceStayedAbsent:true,lateMetadataDidNotResurrect:true});await world.cdp.detach();
 }finally{await f.close();}
});
