import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,rm,readFile,writeFile,mkdir} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

async function openBackup(page){
 await page.locator('.sidebar [data-view=settings]').click();
 const select=page.locator('#ux-settings-group-switch');
 if(await select.isVisible())await select.selectOption('data');
 else await page.locator('[data-settings-group="data"]').click();
 await page.locator('#backup-create-segmented').waitFor({state:'visible'});
}

async function enableConsent(page){
 const welcome=page.locator('#onboarding-start'),consent=page.locator('#consent-check');
 const consented=async()=>{
  try{
   const response=await page.evaluate(()=>chrome.runtime.sendMessage({type:'GET_STATE'}));
   return response?.ok===true&&response.data?.settings?.consentVersion===1;
  }catch{return false;}
 };
 await eventually(async()=>await welcome.isVisible()||await consent.isVisible()||await consented(),
  'onboarding or existing consent',30000);
 if(await welcome.isVisible())await welcome.click();
 if(!await consented()){
  await consent.waitFor({state:'visible'});
  await consent.check();
  await page.locator('#enable-consent').click();
  await eventually(consented,'durable local consent',30000);
 }
 assert.equal(await consented(),true);
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
  const result={};
  for(const [name,values] of Object.entries(rows)){
   const data=new TextEncoder().encode(JSON.stringify(values));
   const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',data));
   result[name]={count:values.length,digest:[...hash].map(x=>x.toString(16).padStart(2,'0')).join('')};
  }
  return result;
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
  harness=await FakeChatGPT.start({headless,extensionPath:dir,onboarding:true});
  let page=harness.archive;
  await enableConsent(page);
  const worker=harness.context.serviceWorkers().find(item=>item.url().includes('/background/service-worker.js'));
  await worker.evaluate(()=>globalThis.cpv1033.seed({inputCount:120,entryCount:90}));
  const before=await domainDigest(harness);
  assert.equal(before.records.count,119);
  assert.equal(before.thoughts.count,90);
  await openBackup(page);
  const baselineDownload=page.waitForEvent('download',{timeout:90000});
  await page.locator('#backup-create').click();
  const baselineFile=await baselineDownload;
  const baselinePath=join(dir,'baseline.paia-backup');
  await baselineFile.saveAs(baselinePath);
  const baselineItems=(await readFile(baselinePath,'utf8')).trimEnd().split('\n')
   .map(JSON.parse).filter(row=>row.type==='item');
  assert.ok(baselineItems.length>200);
  await eventually(async()=>await page.locator('#backup-create-segmented').isEnabled(),
   'backup controls unlock after baseline export',30000);
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
  const downloaded=[];
  for(const path of paths.filter(path=>path.includes('.part-')).sort())
   downloaded.push(...(await readFile(path,'utf8')).trimEnd().split('\n').map(JSON.parse).filter(row=>row.type==='item'));
  assert.deepEqual(downloaded,baselineItems);
  await page.locator('#backup-file').setInputFiles(paths);
  await eventually(async()=>await page.locator('#backup-preview').isVisible(),
   'non-empty library restore preview',60000);
  assert.equal(await page.locator('#backup-restore').isDisabled(),true);
  await page.locator('#backup-mode').selectOption('merge');
  await eventually(async()=>/存在同一来源/.test(await page.locator('#backup-preview-content').innerText()),
   'overlapping merge refuses to activate',30000);
  assert.equal(await page.locator('#backup-restore').isDisabled(),true);
  assert.deepEqual(await domainDigest(harness),before);
  await page.locator('#backup-mode').selectOption('replace');
  await eventually(async()=>/替换会清除当前库内容/.test(await page.locator('#backup-preview-content').innerText()),
   'explicit replace preview',30000);
  assert.equal(await page.locator('#backup-restore').isDisabled(),true);
  await page.locator('#backup-confirm-replace').check();
  assert.equal(await page.locator('#backup-restore').isEnabled(),true);
  await page.locator('#backup-restore').click();
  await eventually(async()=>/恢复已完成/.test(await page.locator('#backup-status').textContent()),
   'atomic nonempty replacement',60000);
  assert.deepEqual(await domainDigest(harness),before);
  assert.equal(harness.externalRequests,0);
  await harness.close();harness=undefined;

  harness=await FakeChatGPT.start({headless,extensionPath:dir,onboarding:true});
  page=harness.archive;
  await enableConsent(page);
  await openBackup(page);
  const part=paths.find(path=>path.includes('.part-'));
  const damaged=join(dir,'damaged',part.split('/').at(-1));
  await mkdir(join(dir,'damaged'));
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
  await eventually(async()=>await page.locator('#backup-create-segmented').isEnabled(),
   'backup controls unlock after restore',30000);
  const afterDownloads=[];
  page.on('download',download=>afterDownloads.push(download));
  let restoredExportComplete=false;
  for(let attempt=0;attempt<5&&!restoredExportComplete;attempt++){
   afterDownloads.length=0;
   await eventually(async()=>await page.locator('#backup-create-segmented').isEnabled(),
    'backup controls unlock for restored export',30000);
   await page.locator('#backup-create-segmented').click();
   await eventually(async()=>{
    const status=await page.locator('#backup-status').textContent();
    return afterDownloads.some(item=>item.suggestedFilename().endsWith('.manifest.paia-backup'))
      ||/备份期间内容发生变化/.test(status);
   },'restored export completes or detects concurrent index rebuild',30000);
   restoredExportComplete=afterDownloads.some(item=>item.suggestedFilename().endsWith('.manifest.paia-backup'));
   if(!restoredExportComplete){
    assert.equal(afterDownloads.some(item=>item.suggestedFilename().endsWith('.manifest.paia-backup')),false,
     'a changed library must not publish a completion manifest');
   }
  }
  assert.equal(restoredExportComplete,true,
   `restored export never reached a stable generation: ${await page.locator('#backup-status').textContent()}`);
  assert.ok(afterDownloads.some(item=>item.suggestedFilename().includes('.part-')));
  const afterDir=join(dir,'after');
  await mkdir(afterDir);
  const afterPaths=[];
  for(const item of afterDownloads){
   const path=join(afterDir,item.suggestedFilename());
   await item.saveAs(path);afterPaths.push(path);
  }
  const afterItems=[];
  for(const path of afterPaths.filter(path=>path.includes('.part-')).sort())
   afterItems.push(...(await readFile(path,'utf8')).trimEnd().split('\n').map(JSON.parse).filter(row=>row.type==='item'));
  assert.deepEqual(afterItems,baselineItems);
  assert.equal(harness.externalRequests,0);
  assert.deepEqual(harness.errors,[]);
 }finally{await harness?.close();await rm(dir,{recursive:true,force:true});}
});
