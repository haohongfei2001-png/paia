import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,rm,readFile,writeFile} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{
 const response=await page.evaluate(value=>chrome.runtime.sendMessage(value),{type,...fields});
 assert.equal(response.ok,true,JSON.stringify(response));
 return response.data;
};

async function openBackup(page){
 await page.locator('.sidebar [data-view=settings]').click();
 const select=page.locator('#ux-settings-group-switch');
 if(await select.isVisible())await select.selectOption('data');
 else await page.locator('[data-settings-group="data"]').click();
 await page.locator('#backup-create').waitFor({state:'visible'});
}

async function libraryDigest(harness){
 const worker=harness.context.serviceWorkers().find(item=>item.url().includes('/background/service-worker.js'));
 return worker.evaluate(async()=>{
  const store=globalThis.cpv1015.store;
  await store.finishFoundation();
  const rows=await store.run(()=>store.repository.transaction(false,async tx=>{
   const result={};
   for(const name of ['records','blocks','thoughts','topics','provenance','revisions','tombstones'])result[name]=await tx.all(name);
   return result;
  }));
  const digest=async value=>{
   const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));
   return [...new Uint8Array(bytes)].map(item=>item.toString(16).padStart(2,'0')).join('');
  };
  return {
   counts:Object.fromEntries(Object.entries(rows).map(([name,values])=>[name,values.length])),
   thoughts:await digest(rows.thoughts.map(row=>[row.id,row.thoughtText,row.revision,row.protections,row.sourceRecordIds])),
   provenance:await digest(rows.provenance),
   revisions:await digest(rows.revisions.map(row=>[row.id,row.before,row.after,row.reason,row.important])),
  };
 });
}

test('CPV1-01.5 current Backup is verified, keeps the current library safe, and restores to an isolated empty profile',{timeout:240000},async()=>{
 const root=new URL('../',import.meta.url).pathname;
 const dir=await mkdtemp(join(tmpdir(),'paia-cpv1-015-'));
 const output=join(dir,'recovery.paia-backup');
 await cp(root,dir,{recursive:true,filter:path=>{
  const relative=path.startsWith(root)?path.slice(root.length):path;
  return !/^(?:\.git|work|outputs)(?:\/|$)/.test(relative);
 }});
 const workerPath=join(dir,'background/service-worker.js');
 await writeFile(workerPath,(await readFile(workerPath,'utf8'))+"\nimport {seedLongTerm} from '../tests/fixtures/long-term-v081.mjs';globalThis.cpv1015={store,seed:options=>seedLongTerm(store,options)};\n");
 // CI's Xvfb display is isolated from the user's desktop. Chrome's extension
 // download path is exercised there; local runs stay headless.
 const headless=!(process.env.CI==='1'&&process.env.DISPLAY);
 let harness;
 try{
  harness=await FakeChatGPT.start({headless,extensionPath:dir});
  let page=harness.archive;
  await page.locator('#consent-check').check();
  await page.locator('#enable-consent').click();
  const worker=harness.context.serviceWorkers().find(item=>item.url().includes('/background/service-worker.js'));
  await worker.evaluate(()=>globalThis.cpv1015.seed({inputCount:120,entryCount:90}));
  const before=await libraryDigest(harness);
  assert.equal(before.counts.records,119);
  assert.equal(before.counts.thoughts,90);
  await openBackup(page);
  await rpc(page,'SAVE_DEEPSEEK_CREDENTIAL',{config:{apiKey:'synthetic-backup-key-must-not-export'}});
  let file;
  try{
   [file]=await Promise.all([
    page.waitForEvent('download',{timeout:90000}),
    page.locator('#backup-create').click(),
   ]);
  }catch(error){
   const status=await page.locator('#backup-status').textContent().catch(()=>'(browser closed)');
   throw new Error(`Backup did not download; status=${status}; ${error.message}`);
  }
  await file.saveAs(output);
  await eventually(async()=>/已生成.*完整性校验/.test(await page.locator('#backup-status').textContent()));
  const content=await readFile(output,'utf8');
  assert.doesNotMatch(content,/synthetic-backup-key-must-not-export|apiKey|recordIndex/);
  await page.locator('#backup-file').setInputFiles(output);
  await eventually(async()=>await page.locator('#backup-preview').isVisible());
  assert.equal(await page.locator('#backup-restore').isDisabled(),true);
  assert.deepEqual(await libraryDigest(harness),before);
  await harness.close();harness=undefined;

  harness=await FakeChatGPT.start({headless,extensionPath:dir});
  page=harness.archive;
  await page.locator('#consent-check').check();
  await page.locator('#enable-consent').click();
  await openBackup(page);
  await page.locator('#backup-file').setInputFiles(output);
  await eventually(async()=>await page.locator('#backup-restore').isEnabled(),'empty-library restore preview',60000);
  await page.locator('#backup-restore').click();
  await eventually(async()=>/恢复已完成/.test(await page.locator('#backup-status').textContent()),'atomic recovery',60000);
  assert.deepEqual(await libraryDigest(harness),before);
  assert.equal((await rpc(page,'GET_DEEPSEEK_STATUS')).hasCredential,false);
  assert.equal(harness.externalRequests,0);
  assert.deepEqual(harness.errors,[]);
 }finally{await harness?.close();await rm(dir,{recursive:true,force:true});}
});
