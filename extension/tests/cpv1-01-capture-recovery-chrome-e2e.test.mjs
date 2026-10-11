// Hosted synthetic Chrome only. No real user profile, input, credentials or site calls.
import {mkdtemp,readFile,rm,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {STORAGE_KEY,ArchiveError,safeErrorCode} from '../core/constants.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,conversation,eventually,pause} from './harness/fake-chatgpt.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const evidence=join(root,'work/capture-recovery');
const baseline='81478c9';
const currentVersion=JSON.parse(await readFile(join(root,'manifest.json'),'utf8')).version;
const nextVersion=currentVersion.split('.').map((part,index,parts)=>index===parts.length-1?String(Number(part)+1):part).join('.');
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
  const archive=execFileSync('git',['archive',baseline,'extension'],{cwd:join(root,'..'),maxBuffer:64*1024*1024});
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
  await reload(h,currentVersion);
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
  updated.version=nextVersion;await writeFile(manifestPath,JSON.stringify(updated,null,2));
  await reload(h,nextVersion);
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
  await reload(h,currentVersion);await pause(2500);assert.equal((await h.state()).records.length,0);
  await allow(h);await eventually(async()=>(await h.state()).records.length===3);
  await rpc(h,{type:'SET_ENABLED',enabled:false});
  await h.send(page,{id:'paused-sent-message-004',text:'Synthetic sent while paused'});
  await reload(h,currentVersion);await pause(2500);assert.equal((await h.state()).records.length,3);
  assert.equal((await rpc(h,{type:'GET_STATUS'})).enabled,false);
  assert.equal(await page.locator('#paia-reconnect-notice').count(),0);
  await saveEvidence(h,page,'consent-pause',{unconsentedRecords:0,pausedRecords:3});
 }catch(error){
  try{const diagnostic=await h.archive.evaluate(async key=>{
   const raw=(await chrome.storage.local.get(key))[key];
   const {controlPublicationDigest}=await import('../core/local-control-publication.js');
   const actualDigest=raw?await controlPublicationDigest(raw):null;
   const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('paia-archive');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
   try{const ids=['local-control-publication:reservation','local-control-publication:revision','gate','migration','recovery-restore-epoch','bns:consumer-preference-publication:pending','backup-recovery-settings'];const tx=db.transaction('meta','readonly'),done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);}),rows=await Promise.all(ids.map(id=>new Promise((resolve,reject)=>{const req=tx.objectStore('meta').get(id);req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error);})));await done;const [reservation,revision,gate,migration,epoch,consumer,backup]=rows;
    return {database:db.name,schema:db.version,storeCount:db.objectStoreNames.length,reservation,revision,gate,migrationPhase:migration?.phase??null,restoreEpoch:epoch?.value??null,consumerPending:!!consumer,backupPending:!!backup,localSchema:raw?.schemaVersion??null,localStamp:raw?.controlPublication??null,localConsentVersion:raw?.settings?.consentVersion??null,localEnabled:raw?.settings?.enabled??null,localEpoch:raw?.settings?.epoch??null,beforeDigestMatches:reservation?.beforeDigest===actualDigest,afterDigestMatches:reservation?.afterDigest===actualDigest};
   }finally{db.close();}
  },STORAGE_KEY);await mkdir(evidence,{recursive:true});await writeFile(join(evidence,'no-consent-reload-failure-metadata.json'),JSON.stringify(diagnostic,null,2));console.error('NO_CONSENT_RELOAD_METADATA '+JSON.stringify(diagnostic));}catch(diagnosticError){console.error('NO_CONSENT_RELOAD_DIAGNOSTIC_FAILED '+JSON.stringify({name:diagnosticError?.name}));}throw error;
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
  await reload(h,currentVersion);await h.ready(page);await h.respond(page,c);await pause(2600);
  const state=await h.state();assert.equal(state.records.length,2);
  assert.equal(state.records.some(r=>r.sourceKey===deleted.sourceKey),false);
  assert.ok(state.tombstones.some(t=>t.sourceIdentityHash===deleted.sourceKey&&t.status==='permanently_ignored'));
  for(const row of state.records){const original=before.find(r=>r.id===row.id);assert.ok(original);assert.equal(row.originalText,original.originalText);assert.equal(row.sourceKey,original.sourceKey);}
  await h.send(page,{id:'tombstone-new-message-004',text:'Synthetic allowed sent message after purge'});
  await eventually(async()=>(await h.state()).records.length===3);
  await saveEvidence(h,page,'tombstone-replay',{purgedSourceStayedAbsent:true,lateMetadataDidNotResurrect:true});await world.cdp.detach();
 }finally{await f.close();}
});

// Whole-file coverage of the original local publication owner across real reload.
const LEASE='local-control-publication:reservation',REVISION='local-control-publication:revision';
async function publicationOracle(h){return h.archive.evaluate(async()=>{
 const {DATABASE_NAME}=await import('/core/idb-repository.js'),{STORAGE_KEY}=await import('/core/constants.js');
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(DATABASE_NAME);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{const names=[...db.objectStoreNames],tx=db.transaction(names,'readonly'),done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});const rows=Object.fromEntries(await Promise.all(names.map(async name=>[name,await new Promise((resolve,reject)=>{const r=tx.objectStore(name).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);})])));await done;return {rows,local:(await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY]};}finally{db.close();}
 });}

for(const variant of ['source','release'])for(const phase of ['undispatched','visible','unknown'])test(`original publication reload ${variant}: ${phase}`,{timeout:90000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'paia-publication-reload-'));let h;
 try{
  const path=variant==='source'?root:join(dir,'release');if(variant==='release')execFileSync('python3',['scripts/build_current_release.py',path],{cwd:root,stdio:'pipe'});
  h=await FakeChatGPT.start({extensionPath:path,headless:true});await devMode(h);await rpc(h,{type:'CONSENT',accepted:true});await rpc(h,{type:'GET_LIBRARY_FOUNDATION_STATUS'});
  // Settle the original consent-to-history onboarding transition before the
  // full-store publication baseline; reload may read it again but not change it.
  const onboarding=await rpc(h,{type:'GET_ONBOARDING'});assert.ok(['history','done'].includes(onboarding.step));
  // Complete the original empty Archive navigation before the publication cut.
  // A later UI read must not initialize unrelated derived rows inside the
  // strict unknown-write comparison; all37 rows remain in every equality.
  await eventually(async()=>{const page=await rpc(h,{type:'PAIA_ARCHIVE_NAV_PAGE',page:{groupKind:'providers'}});return page.coverage.state==='complete'&&page.coverage.archiveComplete===true;},'original empty Archive navigation completes before publication fault');
  const worker=h.context.serviceWorkers().find(w=>w.url().startsWith(`chrome-extension://${h.extensionId}/`));assert.ok(worker);
  await worker.evaluate(({phase,storageKey})=>{
   globalThis.__publicationReloadEntered=false;
   if(phase==='undispatched'){
    // Stop only after the original transaction committed its unprepared lease:
    // the next original digest is preparing the SDK payload, before dispatch.
    let reserved=false;const put=IDBObjectStore.prototype.put,digest=crypto.subtle.digest.bind(crypto.subtle);
    IDBObjectStore.prototype.put=function(row,...args){const result=put.call(this,row,...args);if(this.name==='meta'&&row?.id==='local-control-publication:reservation'&&row.afterDigest===null)this.transaction.addEventListener('complete',()=>{reserved=true;},{once:true});return result;};
    crypto.subtle.digest=async(...args)=>{if(reserved){globalThis.__publicationReloadEntered=true;return new Promise(()=>{});}return digest(...args);};
   }else{const original=chrome.storage.local.set.bind(chrome.storage.local);chrome.storage.local.set=async value=>{if(!Object.hasOwn(value,storageKey))return original(value);if(phase==='visible')await original(value);globalThis.__publicationReloadEntered=true;await new Promise(()=>{});};}
  },{phase,storageKey:STORAGE_KEY});
  const pending=rpc(h,{type:'SET_ENABLED',enabled:false}).then(()=>({acknowledged:true}),()=>({acknowledged:false}));
  await eventually(()=>worker.evaluate(()=>globalThis.__publicationReloadEntered),'original publisher reached exact injected interruption');
  const before=await publicationOracle(h),lease=before.rows.meta.find(r=>r.id===LEASE),revision=before.rows.meta.find(r=>r.id===REVISION);assert.equal(Object.keys(before.rows).length,37);assert.equal(before.rows.meta.find(r=>r.id==='first-run-onboarding').step,onboarding.step);assert.ok(lease);assert.equal(lease.afterDigest===null,phase==='undispatched');assert.equal(before.rows.meta.find(r=>r.id==='gate').enabled,false);
  if(phase==='visible')assert.deepEqual(before.local.controlPublication,{version:1,revision:lease.revision,nonce:lease.nonce});
  await reload(h,currentVersion);assert.deepEqual(await pending,{acknowledged:false},'a lost response is never an acknowledged operation');
  const after=await publicationOracle(h),expected=structuredClone(before);if(phase!=='unknown')expected.rows.meta=expected.rows.meta.filter(r=>r.id!==LEASE);assert.deepEqual(after,expected,'only a proven exact lease may be removed; all 37 stores and original local control body stay intact');assert.equal((await rpc(h,{type:'GET_STATUS'})).enabled,false);
  if(phase==='unknown'){const result=await h.archive.evaluate(()=>chrome.runtime.sendMessage({type:'SET_ENABLED',enabled:true}));assert.equal(result.ok,false);assert.equal(result.error,safeErrorCode(new ArchiveError('CONTROL_PUBLICATION_PENDING')));assert.deepEqual(await publicationOracle(h),after,'unknown SDK outcome stays held without an automatic or explicit replay');}
  else{await rpc(h,{type:'SET_ENABLED',enabled:true});const final=await publicationOracle(h);assert.equal(final.rows.meta.some(r=>r.id===LEASE),false);assert.equal(final.rows.meta.find(r=>r.id===REVISION).revision,revision.revision+1);assert.notEqual(final.local.controlPublication.nonce,lease.nonce);assert.equal((await rpc(h,{type:'GET_STATUS'})).enabled,true);}
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);
 }finally{await h?.close();await rm(dir,{recursive:true,force:true});}
});
