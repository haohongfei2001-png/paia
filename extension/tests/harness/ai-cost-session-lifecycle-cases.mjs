import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {mkdtempSync,rmSync,mkdirSync,appendFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT} from './fake-chatgpt.mjs';
import {verifyOrganizeLifecycleNative} from './ai-organize-lifecycle-native.mjs';
import {verifyOrganizeProviderNative} from './ai-organize-provider-native.mjs';
import {verifyPrivateAssistNative} from './ai-assist-native.mjs';
import {createAssistNativeService,stageAssistNativeService,mountAssistNativeService} from './assist-receipt-native-service.mjs';
const source=fileURLToPath(new URL('../..',import.meta.url));
// These complete journeys own independent databases and sessions. Keep them
// in independent cases registered by the existing Foundation CI entry.
for(const label of ['source','release'])test(`AI-COST-05/06 ${label} complete Organize and Assist lifecycle`,{timeout:120000},async(t)=>{
 const dir=join(source,'work','ai-cost-session-phases');mkdirSync(dir,{recursive:true});
 const journal=join(dir,`${label}-${process.pid}-${Date.now()}.jsonl`),started=performance.now();let active=null,phaseStarted=started,h,release,assistService,assistStage,assistRelay;
 const record=(phase,status)=>appendFileSync(journal,JSON.stringify({variant:label,phase,status,elapsedMs:Math.round(performance.now()-started),phaseMs:Math.round(performance.now()-phaseStarted)})+'\n');
 const phase=name=>{if(active)record(active,'end');active=name;phaseStarted=performance.now();record(name,'start');};
 const aborted=()=>{if(active)record(active,'aborted');};t.signal.addEventListener('abort',aborted,{once:true});
 try{
  phase('build');if(label==='release'){release=mkdtempSync(join(tmpdir(),'paia-ai-session-'));execFileSync('python3',['scripts/build_current_release.py',release],{cwd:source,stdio:'pipe'});}
  phase('assist-test-stage');assistService=await createAssistNativeService(t,{variant:label,condition:'After checking the prerequisite'});assistStage=await stageAssistNativeService(release||source,assistService);console.log('AI_ASSIST_TEST_STAGE',JSON.stringify(assistStage.vector));
  phase('browser-start');h=await FakeChatGPT.start({extensionPath:assistStage.directory,onboarding:true});assistRelay=await mountAssistNativeService(h.archive,assistService);
  phase('organize-lifecycle');await verifyOrganizeLifecycleNative(h.archive,label);
  phase('organize-provider');await verifyOrganizeProviderNative(h.archive,label);
  phase('private-assist');await verifyPrivateAssistNative(h,{extensionPath:assistStage.directory,dependencyRoot:source,label,nativeService:assistService,phase:name=>phase(`private-assist:${name}`)});
  phase('network-invariants');assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
  record(active,'end');active=null;record('body','verified');
 }catch(error){try{if(active)record(active,'failed');}catch{}active=null;throw error;}
 finally{
  try{phase('cleanup');}catch{}
  try{try{await assistRelay?.close();await h?.close();}finally{assistService?.dispose();await assistStage?.close();if(release)rmSync(release,{recursive:true,force:true});}try{record('cleanup','end');}catch{}active=null;}
  catch(error){try{record('cleanup','failed');}catch{}throw error;}
  finally{t.signal.removeEventListener('abort',aborted);}
 }
});
