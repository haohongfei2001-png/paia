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

async function portableItems(harness){
 const worker=harness.context.serviceWorkers().find(item=>item.url().includes('/background/service-worker.js'));
 return worker.evaluate(async()=>{
  const backup=globalThis.cpv1033.backup;
  const {sessionId}=await backup.beginExport();
  const items=[];
  try{
   for(let sequence=0;;sequence++){
    const page=await backup.exportPage({sessionId,sequence});
    items.push(...page.items.filter(row=>row.type==='item'));
    if(page.done)break;
   }
  }finally{backup.cancel({sessionId});}
  return items;
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
  "\nimport {seedLongTerm} from '../tests/fixtures/long-term-v081.mjs';import {BackupService} from '../core/backup-service.js';globalThis.cpv1033={store,backup:new BackupService(store,{appVersion:'0.12.0'}),seed:options=>seedLongTerm(store,options)};\n");
 const headless=!(process.env.CI==='1'&&process.env.DISPLAY);
 let harness;
 try{
  harness=await FakeChatGPT.start({headless,extensionPath:dir,onboarding:true});
  let page=harness.archive;
  await enableConsent(page);
  const worker=harness.context.serviceWorkers().find(item=>item.url().includes('/background/service-worker.js'));
  await worker.evaluate(()=>globalThis.cpv1033.seed({inputCount:120,entryCount:90}));
  const before=await portableItems(harness);
  assert.ok(before.length>200);
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
  const downloaded=[];
  for(const path of paths.filter(path=>path.includes('.part-')).sort())
   downloaded.push(...(await readFile(path,'utf8')).trimEnd().split('\n').map(JSON.parse).filter(row=>row.type==='item'));
  assert.deepEqual(downloaded,before);
  await page.locator('#backup-file').setInputFiles(paths);
  await eventually(async()=>await page.locator('#backup-preview').isVisible(),
   'non-empty library restore preview',60000);
  assert.equal(await page.locator('#backup-restore').isDisabled(),true);
  assert.deepEqual(await portableItems(harness),before);
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
  assert.deepEqual(await portableItems(harness),before);
  assert.equal(harness.externalRequests,0);
  assert.deepEqual(harness.errors,[]);
 }finally{await harness?.close();await rm(dir,{recursive:true,force:true});}
});
