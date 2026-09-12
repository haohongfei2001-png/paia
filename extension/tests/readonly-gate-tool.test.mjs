import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const skip=new Set(['node_modules','work','outputs','.git']);
const include=source=>!relative(root,source).split(sep).some(part=>skip.has(part));

test('read-only gate can be added after unpacked extension load and reads only aggregate structure',{timeout:120000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'paia-readonly-gate-'));let h;
 try{
  await cp(root,dir,{recursive:true,filter:include});
  h=await FakeChatGPT.start({extensionPath:dir,headless:true});
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();
  await eventually(async()=>(await h.state()).settings.consentVersion===1,'synthetic archive initialized');
  await cp(join(root,'development/readonly-gate'),join(dir,'__paia_readonly_gate'),{recursive:true});
  const page=await h.context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`chrome-extension://${h.extensionId}/__paia_readonly_gate/index.html`);
  await eventually(async()=>await page.locator('#gate-status').textContent()==='Read-only check complete','dynamic same-origin diagnostic page');
  const report=JSON.parse(await page.locator('#gate-report').textContent());
  assert.equal(report.readOnly,true);assert.equal(report.complete,true);assert.equal(report.status,'complete');
  assert.equal(typeof report.totals.topics,'number');assert.equal(typeof report.totals.sections,'number');assert.equal(typeof report.totals.placements,'number');
  const serialized=JSON.stringify(report);
  assert.doesNotMatch(serialized,/chatgpt\.com|originalText|thoughtText|libraryText|apiKey|sourceMessageId|chatUrl/i);
  assert.deepEqual(errors,[]);assert.equal(h.externalRequests,0);
 }finally{await h?.close();await rm(dir,{recursive:true,force:true});}
});
