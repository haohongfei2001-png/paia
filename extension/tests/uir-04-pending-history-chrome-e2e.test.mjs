// The complete independent pending-history scenario keeps its original safety
// assertions and deadline, isolated from Backup/Removed's own full journeys.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {pendingInputDialogSafety} from './harness/uir04-pending-history.mjs';
const execFileAsync=promisify(execFile);
for(const variant of ['source','release'])test('UIR-04 independent pending history retains locale, original held reads/ACKs and assignment owners ('+variant+')',{timeout:300000},async()=>{
 let releasePath,h;const marker='SYNTHETIC UIR04 pending history original record';
 try{
  if(variant==='release'){releasePath=await mkdtemp(join(tmpdir(),'paia-uir04-pending-release-'));await execFileAsync('python3',['scripts/build_current_release.py',releasePath],{cwd:process.cwd(),maxBuffer:16*1024*1024});}
  h=await FakeChatGPT.start({onboarding:true,...(releasePath?{extensionPath:releasePath}:{})});const p=h.archive,consent=p.locator('#enable-consent');await consent.waitFor({state:'visible'});await eventually(async()=>!await consent.isDisabled());await consent.click();await eventually(()=>p.evaluate(async()=>(await chrome.runtime.sendMessage({type:'GET_STATUS'})).data.consented===true));
  const response=await p.evaluate(()=>chrome.runtime.sendMessage({type:'UPDATE_PREFERENCES',changes:{language:'zh-CN',appearance:'light'}}));assert.equal(response.ok,true);
  await h.open({id:'uir04-pending-source',title:'SYNTHETIC pending history Source',base:1609459200,messages:[{id:'uir04-pending-original',text:marker}]});await eventually(async()=>(await h.state()).records.some(row=>row.originalText===marker));await p.bringToFront();await p.setViewportSize({width:1440,height:900});
  await pendingInputDialogSafety(h);
  assert.ok((await h.state()).records.some(row=>row.originalText===marker),'independent pending operations retain the captured original');assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
  await mkdir('work/ux-r6',{recursive:true});await writeFile('work/ux-r6/uir04-pending-history-'+variant+'.json',JSON.stringify({variant,result:'PASS',fixture:'synthetic-original-source-and-own-six-imports',externalRequests:h.externalRequests,providerRequests:h.deepSeekRequests.length,pageErrors:h.errors})+'\n');
 }finally{await h?.close();if(releasePath)await rm(releasePath,{recursive:true,force:true});}
});
