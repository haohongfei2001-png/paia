import test from 'node:test';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT} from '../tests/harness/fake-chatgpt.mjs';
import {consentD7Archive,seedD7Archive,compareD7Archive,D7_FULL_MATRIX} from '../tests/harness/d7-archive-reference.mjs';

const directory='work/d7-archive-reader';
for(const variant of ['source','release'])test(`D7 normal Archive and Reader complete source/release visual and data acceptance (${variant})`,{timeout:300000},async()=>{
 await mkdir(directory,{recursive:true});
 const actualHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),head=process.env.PAIA_TESTED_HEAD||actualHead;
 if(head!==actualHead)throw Error(`D7 evidence head does not match checkout: ${head} / ${actualHead}`);
 let h;
 try{
  await writeFile(`${directory}/${variant}-launch.json`,JSON.stringify({head,variant,result:'PENDING',expectedRows:D7_FULL_MATRIX.length,declaredRows:D7_FULL_MATRIX.map(row=>row.id)},null,2));
  if(variant==='release')execFileSync('python3',['scripts/build_current_release.py'],{timeout:60000,maxBuffer:16*1024*1024});
  h=await FakeChatGPT.start(variant==='release'?{extensionPath:'work/current-release'}:{});h.archive.setDefaultTimeout(7000);
  await consentD7Archive(h);const seed=await seedD7Archive(h);
  await compareD7Archive(h,variant,{matrix:'full',directory,head,seed});
  await writeFile(`${directory}/${variant}-launch.json`,JSON.stringify({head,variant,result:'PASS',expectedRows:D7_FULL_MATRIX.length,visualAcceptance:'PENDING_INDEPENDENT_FULL_WINDOW_REVIEW'},null,2));
 }catch(error){
  await writeFile(`${directory}/${variant}-launch.json`,JSON.stringify({head,variant,result:'FAIL',expectedRows:D7_FULL_MATRIX.length,declaredRows:D7_FULL_MATRIX.map(row=>row.id),network:h?{externalRequests:h.externalRequests,extensionNetworkRequests:h.extensionNetworkRequests,providerRequests:h.deepSeekRequests.length,pageErrors:h.errors}:null,error:String(error.stack||error)},null,2));
  if(h)await h.archive.screenshot({path:`${directory}/${variant}-terminal-failure.png`,animations:'disabled',timeout:5000}).catch(()=>{});
  throw error;
 }finally{await h?.close();}
});
