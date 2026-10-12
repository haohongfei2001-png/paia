import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,conversation,eventually} from './harness/fake-chatgpt.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

// Observe the original handle Promise in the single generated release only.
// No message/body is retained, callback is replayed, or response is replaced.
const lifecycleObservation=`
const lifecycleProbe={accepted:0,completed:0,rejected:0,pending:0,types:{},events:[],lastStatus:null,observerFailed:false};
const lifecycleCode=value=>typeof value==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(value)?value:'UNCLASSIFIED';
function observeLifecyclePromise(promise,request){
 const type=request?.type;
 if(!['GET_STATUS','CAPTURE','DIAGNOSTIC','ENRICH_SOURCE_METADATA','OBSERVE_SOURCE_STRUCTURE'].includes(type))return promise;
 const row={sequence:++lifecycleProbe.accepted,type,phase:'pending'};
 if(type==='DIAGNOSTIC')row.code=lifecycleCode(request.code);
 request=null;
 const counters=lifecycleProbe.types[type]||(lifecycleProbe.types[type]={accepted:0,completed:0,rejected:0});
 counters.accepted++;lifecycleProbe.pending++;
 lifecycleProbe.events.push(row);if(lifecycleProbe.events.length>64)lifecycleProbe.events.shift();
 void promise.then(value=>{
  row.phase='returned';counters.completed++;lifecycleProbe.completed++;lifecycleProbe.pending--;
  if(type==='CAPTURE')row.added=Number.isSafeInteger(value?.added)?value.added:null;
  if(type==='GET_STATUS'){
   const version=value=>typeof value==='string'&&/^[0-9.]{1,40}$/.test(value)?value:null;
   lifecycleProbe.lastStatus={consented:typeof value?.consented==='boolean'?value.consented:null,enabled:typeof value?.enabled==='boolean'?value.enabled:null,epoch:Number.isSafeInteger(value?.epoch)?value.epoch:null,adapterVersion:version(value?.adapterVersion),runtimeVersion:version(value?.runtimeVersion)};
  }
 },error=>{row.phase='rejected';row.error=lifecycleCode(error?.code);counters.rejected++;lifecycleProbe.rejected++;lifecycleProbe.pending--;}).catch(()=>{lifecycleProbe.observerFailed=true;});
 return promise;
}
globalThis.__cpv1LifecycleRead=()=>structuredClone(lifecycleProbe);
`;

async function observedRelease(release){
 const path=join(release,'background/service-worker.js'),original=await readFile(path,'utf8');
 const listener='chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {';
 const handle='  handle(request, sender)\n';
 assert.equal(original.split(listener).length,2);assert.equal(original.split(handle).length,2);
 const instrumented=original.replace(listener,lifecycleObservation+'\n'+listener).replace(handle,'  observeLifecyclePromise(handle(request, sender), request)\n');
 await writeFile(path,instrumented);
 return {fixtureOnly:true,productionInstrumentation:false,soleReleaseDifference:'background/service-worker.js',gitWorker:sha(execFileSync('git',['show','HEAD:extension/background/service-worker.js'],{cwd:root})),sourceWorker:sha(await readFile(join(root,'background/service-worker.js'))),originalGeneratedWorker:sha(original),instrumentedWorker:sha(instrumented),injection:sha(lifecycleObservation)};
}

function observeExistingState(h,diagnostic){
 const state=h.state.bind(h);
 h.state=()=>{
  const pending=state();
  void pending.then(value=>{
   const rows=Array.isArray(value?.records)?value.records:[];
   diagnostic.lastState={records:rows.length,before:rows.slice(0,32).filter(row=>row.chatId==='cpv1-lifecycle-before').length,after:rows.slice(0,32).filter(row=>row.chatId==='cpv1-lifecycle-after').length};
  },()=>{}).catch(()=>{});
  return pending;
 };
}

async function lifecycleEvidence(h,diagnostic,name){
 try{
  const worker=h?.context.serviceWorkers().find(worker=>worker.url()===`chrome-extension://${h.extensionId}/background/service-worker.js`);
  let timer;
  let observation=null;
  if(worker)try{
   observation=await Promise.race([worker.evaluate(()=>globalThis.__cpv1LifecycleRead?.()||null),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('DIAGNOSTIC_TIMEOUT')),1000);})]);
  }finally{clearTimeout(timer);}
  const chat=h?.context.pages().find(page=>page.url().endsWith(diagnostic.phase.startsWith('second')?'/cpv1-lifecycle-after':'/cpv1-lifecycle-before'));
  const host=chat?await chat.locator('html').evaluate(()=>({historyReady:window.historyGateActive===true,userMessages:document.querySelectorAll('[data-message-author-role="user"]:not([contenteditable]) .whitespace-pre-wrap').length}),null,{timeout:1000}):null;
  const output={...diagnostic,manifestVersion:h?.manifest.version||null,host,observation};
  await mkdir('work/cpv1-lifecycle-diagnostic',{recursive:true});await writeFile('work/cpv1-lifecycle-diagnostic/'+name+'.json',JSON.stringify(output,null,2)+'\n');
  if(name==='failure')console.error('CPV1_LIFECYCLE_DIAGNOSTIC',JSON.stringify(output));
 }catch{}
}

async function consent(h){
 await eventually(async()=>!await h.archive.locator('#enable-consent').isDisabled());
 await h.archive.locator('#enable-consent').click();
 await eventually(async()=>(await h.archive.evaluate(()=>chrome.runtime.sendMessage({type:'GET_STATUS'}))).data?.consented===true);
}

test('CPV1-01.6 synthetic Chrome restart and unpacked rollback retain archive, consent and capture identity',
 {timeout:180000},async()=>{
  const release=await mkdtemp(join(tmpdir(),'paia-cpv1-lifecycle-release-'));
  const profile=await mkdtemp(join(tmpdir(),'paia-cpv1-lifecycle-profile-'));
  execFileSync('python3',['scripts/build_current_release.py',release],{cwd:root,stdio:'pipe'});
  const manifestPath=join(release,'manifest.json');
  const baseline=JSON.parse(await readFile(manifestPath,'utf8'));
  let h;
  const diagnostic={phase:'first-start',starts:0,lastState:null,identityChecks:[],binding:null};
  try{
   diagnostic.binding=await observedRelease(release);
   h=await FakeChatGPT.start({extensionPath:release,headless:true,userDataDir:profile});
   diagnostic.starts++;observeExistingState(h,diagnostic);
   await consent(h);
   const originalId=h.extensionId;
   diagnostic.phase='initial-capture';const first=await h.open(conversation('cpv1-lifecycle-before'));
   await h.ready(first);
   diagnostic.phase='initial-capture-count';
   await eventually(async()=>(await h.state()).records.length===3);
   diagnostic.phase='first-close';await h.close();h=undefined;

   await writeFile(manifestPath,JSON.stringify({...baseline,version:'0.12.1'},null,2));
   diagnostic.phase='second-start';
   h=await FakeChatGPT.start({extensionPath:release,headless:true,userDataDir:profile,onboarding:true});
   diagnostic.starts++;observeExistingState(h,diagnostic);diagnostic.identityChecks.push(h.extensionId===originalId);
   assert.equal(h.extensionId,originalId,'unpacked update retains extension identity');
   assert.equal((await h.state()).records.length,3,'old archive survives browser restart and update');
   diagnostic.phase='second-capture';const second=await h.open(conversation('cpv1-lifecycle-after'));
   await h.ready(second);
   diagnostic.phase='second-capture-count';
   await eventually(async()=>(await h.state()).records.length===6);
   diagnostic.phase='worker-restart';await h.restartWorker();
   assert.equal((await h.state()).records.length,6,'worker termination cannot remove saved archive');
   diagnostic.phase='second-close';await h.close();h=undefined;

   await writeFile(manifestPath,JSON.stringify(baseline,null,2));
   diagnostic.phase='rollback-start';
   h=await FakeChatGPT.start({extensionPath:release,headless:true,userDataDir:profile,onboarding:true});
   diagnostic.starts++;observeExistingState(h,diagnostic);diagnostic.identityChecks.push(h.extensionId===originalId);
   assert.equal(h.extensionId,originalId,'unpacked rollback retains extension identity');
   assert.equal((await h.archive.evaluate(()=>chrome.runtime.sendMessage({type:'GET_STATUS'}))).data?.consented,true);
   assert.equal((await h.state()).records.length,6,'rollback preserves both captured conversations');
   diagnostic.phase='rollback-reopen';const reopened=await h.open(conversation('cpv1-lifecycle-before'));
   await h.ready(reopened);
   diagnostic.phase='rollback-reopen-count';
   await eventually(async()=>(await h.state()).records.length===6,'reopened old tab does not duplicate capture');
   assert.equal(await reopened.locator('#paia-reconnect-notice').count(),0);
   assert.equal(h.externalRequests,0);
   assert.deepEqual(h.errors,[]);
   diagnostic.phase='complete';await lifecycleEvidence(h,diagnostic,'complete');
  }catch(error){
   await lifecycleEvidence(h,diagnostic,'failure');throw error;
  }finally{
   await h?.close();
   await rm(release,{recursive:true,force:true});
   await rm(profile,{recursive:true,force:true});
  }
 });
