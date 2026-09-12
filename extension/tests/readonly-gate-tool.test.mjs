import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const skip=new Set(['node_modules','work','outputs','.git']);
const include=source=>!relative(root,source).split(sep).some(part=>skip.has(part));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function eventually(fn,label='expected state',timeout=15000){const deadline=Date.now()+timeout;while(Date.now()<deadline){if(await fn())return;await pause(100);}assert.fail(label);}

async function extensionId(context){
 const current=context.serviceWorkers().find(w=>w.url().startsWith('chrome-extension://'));
 if(current)return new URL(current.url()).host;
 const worker=await context.waitForEvent('serviceworker',{timeout:15000});
 return new URL(worker.url()).host;
}

test('read-only gate can be added after unpacked extension load and reads only aggregate structure',{timeout:120000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'paia-readonly-runtime-'));
 const profile=await mkdtemp(join(tmpdir(),'paia-readonly-profile-'));
 let context;
 try{
  await cp(root,dir,{recursive:true,filter:include});
  context=await chromium.launchPersistentContext(profile,{
   headless:false,
   executablePath:chromium.executablePath(),
   ignoreDefaultArgs:['--disable-extensions'],
   args:[`--disable-extensions-except=${dir}`,`--load-extension=${dir}`,'--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']
  });
  const id=await extensionId(context);
  const archive=await context.newPage();
  await archive.goto(`chrome-extension://${id}/ui/archive.html`);
  if(await archive.locator('#onboarding-start').count())await archive.locator('#onboarding-start').click();
  await archive.locator('#consent-check').waitFor();
  await archive.locator('#consent-check').check();await archive.locator('#enable-consent').click();
  await eventually(async()=>{const r=await archive.evaluate(()=>chrome.runtime.sendMessage({type:'GET_STATE'}));return r.ok&&r.data.settings.consentVersion===1;},'synthetic extension archive initialized');
  const created=await archive.evaluate(()=>chrome.runtime.sendMessage({type:'CREATE_LIBRARY_TOPIC',topic:{operationId:crypto.randomUUID(),name:'Synthetic aggregate-only topic'}}));
  assert.equal(created.ok,true,JSON.stringify(created));

  // The diagnostic resources appear only now, after Chrome has already loaded
  // the unpacked extension. This is the exact property needed by the Mac helper:
  // it must not reload or replace the daily extension before inspecting its DB.
  await cp(join(root,'development/readonly-gate'),join(dir,'__paia_readonly_gate'),{recursive:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`chrome-extension://${id}/__paia_readonly_gate/index.html`);
  await eventually(async()=>await page.locator('#gate-status').textContent()==='Read-only check complete','dynamic same-origin diagnostic page');
  const report=JSON.parse(await page.locator('#gate-report').textContent());
  assert.equal(report.readOnly,true);assert.equal(report.complete,true);assert.equal(report.status,'complete');
  assert.equal(typeof report.totals.topics,'number');assert.ok(report.totals.topics>=1);
  assert.equal(typeof report.totals.sections,'number');assert.equal(typeof report.totals.placements,'number');
  const serialized=JSON.stringify(report);
  assert.doesNotMatch(serialized,/Synthetic aggregate-only topic|chatgpt\.com|originalText|thoughtText|libraryText|apiKey|sourceMessageId|chatUrl/i);
  assert.deepEqual(errors,[]);
 }finally{await context?.close();await rm(dir,{recursive:true,force:true});await rm(profile,{recursive:true,force:true});}
});
