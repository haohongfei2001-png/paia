import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {mkdtemp,rm,readFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import {tmpdir} from 'node:os';import {join} from 'node:path';import {fileURLToPath} from 'node:url';import {validateBundle} from '../../scripts/import_golden.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/hhf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=fileURLToPath(new URL('../..',import.meta.url));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
export async function eventually(fn){for(let n=0;n<150;n++){if(await fn())return;await delay(100);}assert.fail('COMPAT_REPLAY_TIMEOUT');}
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export function htmlAST(node){if(node.text)return escape(node.text);return `<${node.tag} ${Object.entries(node.attrs).map(([k,v])=>`${k}="${escape(v)}"`).join(' ')}>${node.children.map(htmlAST).join('')}</${node.tag}>`;}
export async function replay(bundle,{verifyExport=false,disableDrain=false,disableDetector=false,rejectSample=false}={}){
 assert.equal(validateBundle(bundle),true,'PRIVACY_REJECTED');const temp=await mkdtemp(join(tmpdir(),'paia-compat-'));let context;let calls=0,external=0;
 try{
  assert.equal(spawnSync('python3',[join(root,'scripts/package_development.py'),temp]).status,0);
  if(disableDrain){const {writeFile}=await import('node:fs/promises');const p=join(temp,'development/compat/main.js');await writeFile(p,(await readFile(p,'utf8')).replace('function drain(){','function drain(){return;'));}
  if(disableDetector){const {writeFile}=await import('node:fs/promises');const p=join(temp,'development/compat/main.js');const s=await readFile(p,'utf8');assert.ok(s.includes('globalThis.ChatGPTHistoryContract.parseStructural(value,chat)'));await writeFile(p,s.replace('globalThis.ChatGPTHistoryContract.parseStructural(value,chat)','null'));}
  context=await chromium.launchPersistentContext('',{headless:true,acceptDownloads:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',ignoreDefaultArgs:['--disable-extensions'],args:['--enable-unsafe-extension-debugging','--disable-background-networking','--disable-sync','--host-resolver-rules=MAP * ~NOTFOUND']});
  const f=bundle.files,chat=f['identity-map.json'].chat,url='https://chatgpt.com/c/'+chat;
  const endpoint=f['response.json'].endpointClass==='conversation_load_candidate'?'/backend-api/conversation/'+chat:'/backend-api/compat-structure';
  await context.route(/^https?:\/\//,route=>{const u=new URL(route.request().url());if(u.origin!=='https://chatgpt.com'){external++;return route.abort();}
   if(u.pathname===endpoint){calls++;return route.fulfill({contentType:f['response.json'].contentType,body:JSON.stringify(rejectSample?{...f['response.json'].body,unreviewed_private_key:'SYNTHETIC_PRIVATE'}:f['response.json'].body)});}
   if(u.pathname==='/c/'+chat)return route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><title>TEST</title><style>.whitespace-pre-wrap{white-space:pre-wrap}</style>${htmlAST(f['dom.json'])}<script>window.responses=0;fetch('${endpoint}').then(r=>r.json()).then(()=>window.responses++);</script>`});return route.abort();
  });
  const cdp=await context.browser().newBrowserCDPSession();const {id}=await cdp.send('Extensions.loadUnpacked',{path:temp});
  const archive=await context.newPage();await archive.goto(`chrome-extension://${id}/ui/archive.html`);
  // Actual response completes before consent. Only development buffer + authorized drain may recover it.
  const page=await context.newPage();await page.goto(url);await page.waitForFunction(()=>window.responses===1);await delay(200);
  if(await archive.locator('#onboarding-start').count())await archive.locator('#onboarding-start').click();
  await archive.locator('#consent-check').check();await archive.locator('#enable-consent').click();
  async function state(){const r=await archive.evaluate(()=>chrome.runtime.sendMessage({type:'GET_STATE'}));assert.equal(r.ok,true);return r.data;}
  const expected=f['expected-time.json'].messages;await eventually(async()=>(await state()).records.length===expected.length);
  if(rejectSample){
   let downloads=0;page.on('download',()=>downloads++);
   await page.locator('#compat-check').click();await eventually(async()=>/reasonCode: UNKNOWN_SCHEMA_KEY/.test(await page.locator('#compat-status').textContent()));
   const summary=await page.locator('#compat-status').textContent();assert.equal((summary.match(/PASS|FAIL/g)||[]).length,4);assert.match(summary,/source time recovery: FAIL/);
   await page.locator('#compat-export').click();await eventually(async()=>(await page.locator('#compat-status').textContent())==='UNKNOWN_SCHEMA_KEY');assert.equal(downloads,0);return;
  }
  if(disableDrain||disableDetector){await delay(1200);assert.ok((await state()).records.every(r=>r.sourceSentAt===null));return;}
  await eventually(async()=>(await state()).records.every(r=>r.sourceSentAt===expected.find(x=>x.id===r.sourceMessageId)?.sourceSentAt));
  const records=(await state()).records;
  for(const e of expected){const r=records.find(r=>r.sourceMessageId===e.id);assert.ok(r);for(const key of ['sourceSentAt','timeSource','timeConfidence','conversationOrder'])assert.equal(r[key],e[key],key);assert.notEqual(r.capturedAt,r.sourceSentAt);}
  await archive.reload();await archive.locator('[data-view="settings"]').click();await archive.locator('[data-view="archive"]').click();await archive.locator('.conversation-document').click();await eventually(async()=>await archive.locator('.archive-block').count()===expected.length);
  const displayedIDs=await archive.locator('.archive-block').evaluateAll(nodes=>nodes.map(n=>n.dataset.recordId));
  const displayed=displayedIDs.map(id=>records.find(r=>r.id===id));
  const known=displayed.filter(r=>r.sourceSentAt);assert.deepEqual(known.map(r=>r.sourceSentAt),known.map(r=>r.sourceSentAt).sort());
  for(const r of records){
   await archive.locator(`[data-record-id="${r.id}"] .original-prose`).click({button:'right'});await archive.getByRole('menuitem',{name:'记录信息…'}).click();
   const label=(await archive.locator('#info-content').textContent()).split('发送于 ')[1];
   if(r.sourceSentAt){assert.ok(label);assert.equal(label.includes('发送时间未知'),false);assert.ok(label.includes(new Date(r.sourceSentAt).getUTCFullYear().toString()));}
   else assert.ok(label.startsWith('发送时间未知'));
   assert.ok(label.includes('捕获于'));await archive.locator('#close-info').click();
  }

  await page.locator('#compat-check').click();await eventually(async()=>/reasonCode:/.test(await page.locator('#compat-status').textContent()));
  const selfTest=await page.locator('#compat-status').textContent();assert.match(selfTest,/canonical capture: PASS/);assert.match(selfTest,/source time recovery: PASS/);
  if(verifyExport){const download=page.waitForEvent('download');await page.locator('#compat-export').click();const file=await download;const sample=JSON.parse(await readFile(await file.path(),'utf8'));assert.equal(validateBundle(sample),true);assert.equal(sample.provenance,'user-sampled');}
  assert.equal(calls,1);assert.equal(external,0);
 }finally{await context?.close();await rm(temp,{recursive:true,force:true});}
}
