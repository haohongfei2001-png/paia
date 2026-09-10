import {organizeSingleUI} from './harness/reading-closure.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,mkdir,rm,readFile,writeFile,readdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';import {conversation} from './fixtures/history-v090.mjs';import {productReply} from './fixtures/product-history-v080.mjs';import {BackupValidator} from '../core/backup-format.js';
const name=process.env.PAIA_ARTIFACT_NAME||'PAIA-v0.9.0-history-onboarding';
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
test('v090 actual package contract: onboarding, production import profile, reading, explicit Organizer and Backup',{timeout:120000},async()=>{
 const parent=await mkdtemp(join(tmpdir(),'paia-v090-package-')),reports=[];await mkdir('work/history-v090',{recursive:true});
 try{for(const kind of ['internal','release']){
  const target=process.env.PAIA_ARTIFACT_DIRECTORY?join(process.env.PAIA_ARTIFACT_DIRECTORY,name+'-'+kind):join(parent,kind);
  if(!process.env.PAIA_ARTIFACT_DIRECTORY){const build=`import sys;sys.path.insert(0,'scripts');from ${kind==='internal'?'build_internal import build_internal':'build_history_onboarding import build_release'};${kind==='internal'?'build_internal':'build_release'}(sys.argv[1],sys.argv[2])`;execFileSync('/usr/bin/python3',['-c',build,process.cwd(),target]);}
  if(kind==='release'){execFileSync('/usr/bin/python3',['scripts/check_release_product.py',target]);assert.equal((await readdir(target+'/ui')).includes('development-reload.js'),false);assert.equal((await readdir(target+'/ui')).includes('response-time.html'),false);}
  const h=await FakeChatGPT.start({extensionPath:target,headless:false,onboarding:true,deepSeekFixture:productReply}),p=h.archive;
  try{
   await p.locator('#onboarding-start').click();await p.locator('#consent-check').check();await p.locator('#enable-consent').click();await p.locator('#onboarding-history').click();
   await p.locator('#history-file-consent').check();await p.locator('#history-file').setInputFiles({name:'synthetic-package.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([conversation(1,5)]))});await eventually(()=>p.locator('#history-commit').isEnabled());assert.equal((await h.state()).records.length,0);
   await p.locator('#history-commit').click();await eventually(()=>p.locator('#history-success').isVisible());assert.equal((await h.state()).records.length,5);assert.equal(h.deepSeekRequests.length,0);await p.screenshot({path:'work/history-v090/package-'+kind+'-import.png'});
   await p.locator('#history-read').click();await p.locator('.conversation-document').click();await p.locator('.library-prose').first().waitFor();await p.screenshot({path:'work/history-v090/package-'+kind+'-reading.png'});
   await rpc(p,'SAVE_DEEPSEEK_CREDENTIAL',{config:{apiKey:'synthetic-package-only'}});await p.locator('[data-view="thoughts"]').click();await organizeSingleUI(p);await eventually(async()=>await p.locator('.topic-index-row').count()===1);
   await p.locator('[data-view="settings"]').click();await p.locator('#backup-create').waitFor();
   if(kind==='release'){assert.equal(await p.locator('#diagnostics,#filter-advanced,#library-organizer-jobs').count(),0);assert.equal((await rpc(p,'IMPORT_CAPABILITIES')).available,true);}
   const download=p.waitForEvent('download');await p.locator('#backup-create').click();const file=await download,temporary=join(parent,kind+'.paia-backup');await file.saveAs(temporary);const text=await readFile(temporary,'utf8'),validator=new BackupValidator();for(const line of text.trim().split('\n'))await validator.add(JSON.parse(line));
   assert.equal(validator.preview().counts.sources,5);assert.equal(validator.preview().counts.entries,5);assert.match(text,/"importProvider":"official_export"/);assert.doesNotMatch(text,/synthetic-package-only|apiKey/);assert.equal(h.deepSeekRequests.length,1);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
   reports.push({kind,onboarding:true,history:true,reading:true,backup:true,importRequests:0,explicitRequests:1,externalRequests:0,errors:[]});
  }finally{await h.close();}
 }await writeFile('work/history-v090/packages.json',JSON.stringify({syntheticOnly:true,visibleChrome:true,actualArtifacts:!!process.env.PAIA_ARTIFACT_DIRECTORY,structures:reports,externalRequests:0,errors:[]},null,2));
 }finally{await rm(parent,{recursive:true,force:true});}
});
