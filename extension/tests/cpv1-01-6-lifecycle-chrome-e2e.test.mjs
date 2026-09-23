import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,conversation,eventually} from './harness/fake-chatgpt.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));

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
  try{
   h=await FakeChatGPT.start({extensionPath:release,headless:true,userDataDir:profile});
   await consent(h);
   const originalId=h.extensionId;
   const first=await h.open(conversation('cpv1-lifecycle-before'));
   await h.ready(first);
   await eventually(async()=>(await h.state()).records.length===3);
   await h.close();h=undefined;

   await writeFile(manifestPath,JSON.stringify({...baseline,version:'0.12.1'},null,2));
   h=await FakeChatGPT.start({extensionPath:release,headless:true,userDataDir:profile,onboarding:true});
   assert.equal(h.extensionId,originalId,'unpacked update retains extension identity');
   assert.equal((await h.state()).records.length,3,'old archive survives browser restart and update');
   const second=await h.open(conversation('cpv1-lifecycle-after'));
   await h.ready(second);
   await eventually(async()=>(await h.state()).records.length===6);
   await h.restartWorker();
   assert.equal((await h.state()).records.length,6,'worker termination cannot remove saved archive');
   await h.close();h=undefined;

   await writeFile(manifestPath,JSON.stringify(baseline,null,2));
   h=await FakeChatGPT.start({extensionPath:release,headless:true,userDataDir:profile,onboarding:true});
   assert.equal(h.extensionId,originalId,'unpacked rollback retains extension identity');
   assert.equal((await h.archive.evaluate(()=>chrome.runtime.sendMessage({type:'GET_STATUS'}))).data?.consented,true);
   assert.equal((await h.state()).records.length,6,'rollback preserves both captured conversations');
   const reopened=await h.open(conversation('cpv1-lifecycle-before'));
   await h.ready(reopened);
   await eventually(async()=>(await h.state()).records.length===6,'reopened old tab does not duplicate capture');
   assert.equal(await reopened.locator('#paia-reconnect-notice').count(),0);
   assert.equal(h.externalRequests,0);
   assert.deepEqual(h.errors,[]);
  }finally{
   await h?.close();
   await rm(release,{recursive:true,force:true});
   await rm(profile,{recursive:true,force:true});
  }
 });
