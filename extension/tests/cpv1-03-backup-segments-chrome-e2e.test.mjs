import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,rm,readFile,writeFile} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

async function openBackup(page){
 await page.locator('.sidebar [data-view=settings]').click();
 const select=page.locator('#ux-settings-group-switch');
 if(await select.isVisible())await select.selectOption('data');
 else await page.locator('[data-settings-group="data"]').click();
 await page.locator('#backup-create-segmented').waitFor({state:'visible'});
}

async function domainDigest(harness){
 const worker=harness.context.serviceWorkers().find(item=>item.url().includes('/background/service-worker.js'));
 return worker.evaluate(async()=>{
  const store=globalThis.cpv1033.store;
  await store.finishFoundation();
  const rows=await store.run(()=>store.repository.transaction(false,async tx=>{
   const result={};
   for(const name of ['records','blocks','thoughts','topics','provenance','revisions','tombstones'])
    result[name]=await tx.all(name);
   return result;
  }));
  const data=new TextEncoder().encode(JSON.stringify(rows));
  const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',data));
  return [...hash].map(x=>x.toString(16).padStart(2,'0')).join('');
 });
}

test('CPV1-03 segmented downloads authenticate before staged restore in an isolated browser',
 {timeout:240000},async()=>{
 const root=new URL('../',import.meta.url).pathname;
 const dir=await mkdtemp(join(tmpdir(),'paia-cpv1-033-'));
 await cp(root,dir,{recursive:true,filter:path=>{
  const relative=path.startsWith(root)?path.slice(root.length):path;
  return !/^(?:\.git|work|outputs)(?:\/|$)/.test(relative);
 }});
 const workerPath=join(dir,'background/service-worker.js');
 await writeFile(workerPath,(await readFile(workerPath,'utf8'))+
  "\nimport {seedLongTerm} from '../tests/fixtures/long-term-v081.mjs';globalThis.cpv1033={store,seed:options=>seedLongTerm(store,options)};\n");
 const headless=!(process.env.CI==='1'&&process.env.DISPLAY);
 let harness;
 try{
  harness=await FakeChatGPT.start({headless,extensionPath:dir});
  let page=harness.archive;
  await page.locator('#consent-check').check();
  await page.locator('#enable-consent').click();
  const worker=harness.context.serviceWorkers().find(item=>item.url().includes('/background/service-worker.js'));
  await worker.evaluate(()=>globalThis.cpv1033.seed({inputCount:120,entryCount:90}));
  const before=await domainDigest(harness);
  await openBackup(page);
  const downloads=[];
  page.on('download',download=>downloads.push(download));
  await page.locator('#backup-create-segmented').click();
  await eventually(async()=>downloads.some(item=>item.suggestedFilename().endsWith('.manifest.paia-backup'))
    &&downloads.some(item=>item.suggestedFilename().includes('.part-')),
   'segmented files and completion manifest',90000);
  assert.match(await page.locator('#backup-status').textContent(),/已开始下载/);
  const paths=[];
  for(const item of downloads){
   const path=join(dir,item.suggestedFilename());
   await item.saveAs(path);paths.push(path);
  }
  assert.equal(paths.filter(path=>path.endsWith('.manifest.paia-backup')).length,1);
  await harness.close();harness=undefined;

  harness=await FakeChatGPT.start({headless,extensionPath:dir});
  page=harness.archive;
  await page.locator('#consent-check').check();
  await page.locator('#enable-consent').click();
  await openBackup(page);
  const part=paths.find(path=>path.includes('.part-'));
  const damaged=join(dir,'damaged',part.split('/').at(-1));
  await import('node:fs/promises').then(fs=>fs.mkdir(join(dir,'damaged')));
  const text=await readFile(part,'utf8');
  await writeFile(damaged,'X'+text.slice(1));
  await page.locator('#backup-file').setInputFiles([
   ...paths.filter(path=>path!==part),damaged,
  ]);
  await eventually(async()=>/完整性校验未通过/.test(await page.locator('#backup-status').textContent()),
   'tampered segment rejection',60000);
  assert.equal(await page.locator('#backup-restore').isDisabled(),true);
  await page.locator('#backup-file').setInputFiles(paths);
  await eventually(async()=>await page.locator('#backup-restore').isEnabled(),
   'verified segmented restore preview',60000);
  await page.locator('#backup-restore').click();
  await eventually(async()=>/恢复已完成/.test(await page.locator('#backup-status').textContent()),
   'segmented recovery',60000);
  assert.equal(await domainDigest(harness),before);
  assert.equal(harness.externalRequests,0);
  assert.deepEqual(harness.errors,[]);
 }finally{await harness?.close();await rm(dir,{recursive:true,force:true});}
});
