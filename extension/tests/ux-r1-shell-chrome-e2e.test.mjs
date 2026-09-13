import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {syntheticRow} from './fixtures/import-adapter.mjs';

const rpc=async(page,type,fields={})=>{const r=await page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
async function consent(page){await page.locator('#consent-check').waitFor({state:'visible'});await page.locator('#consent-check').check();await page.locator('#enable-consent').click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'consent becomes durable');}
async function assertNoNetwork(h){assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);}

test('UX-R1 clean install keeps example isolated until explicit local-save consent',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true});
 try{
  const p=h.archive;
  await eventually(()=>p.locator('#consent-panel').isVisible(),'consent intro is the first-use surface');
  assert.equal(await p.locator('#onboarding-welcome').isVisible(),false,'old module-teaching welcome must not precede consent');
  assert.match(await p.locator('#consent-title').textContent(),/你对 AI 说过的|What you told AI/i);
  assert.match((await p.locator('#enable-consent').textContent()).trim(),/开始在本机保存|Start saving locally/i);
  const before=await rpc(p,'GET_STATUS');assert.equal(before.consented,false);assert.equal(before.enabled,false);
  await p.locator('#ux-onboarding-example').click();await eventually(()=>p.locator('#ux-example-dialog').evaluate(el=>el.open),'example dialog opens');
  assert.match(await p.locator('#ux-example-dialog').textContent(),/示例，不会写入你的档案|Example only; not saved/i);
  await p.locator('#ux-example-dialog button').click();
  const after=await rpc(p,'GET_STATUS');assert.deepEqual(after,before,'example must not change consent/capture state');
  assert.equal((await h.state()).records.length,0,'example must not write a real Source record');
  await assertNoNetwork(h);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('UX-R1 shell uses real recently-captured content, three roots, reversible settings and responsive navigation',{timeout:180000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true});
 try{
  const p=h.archive,text='UXR1_CAPTURE 这是一条用于验证最近收录与新外壳的合成输入。';
  await consent(p);
  await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN'}});await eventually(async()=>await p.evaluate(()=>document.documentElement.lang)==='zh-CN','explicit zh-CN shell preference applies');
  const chat={id:'ux-r1-capture',title:'UX-R1 最近收录',base:1609459200,messages:[{id:'ux-r1-message',text}]};
  await h.open(chat);await eventually(async()=>(await h.state()).records.some(row=>row.originalText===text),'real synthetic capture reaches Source');
  await p.bringToFront();await eventually(()=>p.locator('#core-loop-home').isVisible(),'Archive home is visible');
  assert.deepEqual(await p.locator('#primary-nav button').allTextContents(),['档案','思想库','用于 AI']);
  assert.equal((await p.locator('.sidebar-bottom [data-view="settings"]').textContent()).trim(),'设置');
  assert.equal((await p.locator('#ux-local-state').textContent()).trim(),'本机保存');
  const recent=await rpc(p,'GET_PAGE',{page:{view:'library',limit:1}});assert.equal(recent.recentCapturedDocument?.id!==undefined,true);assert.equal(recent.recentCapturedDocument?.originalConversationTitle,'UX-R1 最近收录');
  const recentButton=p.locator('#core-loop-continue');await eventually(async()=>!(await recentButton.isDisabled())&&(await recentButton.textContent()).includes('UX-R1 最近收录'),'recent capture projection reaches home');
  assert.match(await recentButton.textContent(),/最近收录/);await recentButton.click();
  await eventually(async()=>await p.locator('#document-panel').isVisible()&&(await p.locator('#document-body').textContent()).includes('UXR1_CAPTURE'),'recently captured opens canonical Reader');
  await p.locator('#back').click();await eventually(()=>p.locator('#core-loop-home').isVisible(),'Reader returns to Archive home');

  await p.locator('#primary-nav [data-view="thoughts"]').click();await eventually(()=>p.locator('#thought-panel').isVisible(),'Thought Library remains reachable');
  await p.locator('.sidebar-bottom [data-view="settings"]').click();await eventually(()=>p.locator('#settings-panel').isVisible(),'Settings opens');
  assert.deepEqual(await p.locator('.ux-settings-nav button').allTextContents(),['内容与收录','阅读与外观','AI','隐私与对外使用','数据与设备','高级']);
  await p.locator('[data-settings-group="data"]').click();assert.match(await p.locator('[data-group="data"]').textContent(),/当前版本未提供设备同步/);
  await p.locator('#ux-settings-back').click();await eventually(()=>p.locator('#thought-panel').isVisible(),'Settings returns to the originating root');
  await p.locator('#primary-nav [data-view="memory"]').click();await eventually(()=>p.locator('#memory-panel').isVisible(),'For AI remains the existing MemoryPanel path');
  await p.locator('#primary-nav [data-view="library"]').click();await eventually(()=>p.locator('#core-loop-home').isVisible());

  await p.keyboard.press('Control+k');await eventually(()=>p.locator('#universal-search-dialog').evaluate(el=>el.open),'Ctrl/Cmd+K opens global Search');await p.locator('.universal-close').click();
  const skip=p.locator('#ux-skip-main');await skip.focus();assert.equal(await skip.isVisible(),true,'skip link is keyboard reachable');

  await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:'dark',fontSize:'large',readingWidth:'wide',language:'zh-CN'}});
  await eventually(async()=>await p.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark','dark preference applies immediately');
  const prefs=(await rpc(p,'GET_PAGE',{page:{view:'settings'}})).preferences;assert.equal(prefs.appearance,'dark');assert.equal(prefs.fontSize,'large');assert.equal(prefs.readingWidth,'wide');
  await rpc(p,'SET_ENABLED',{enabled:false});
  if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  await p.reload();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented===true,'existing user reload keeps consent');
  const paused=await rpc(p,'GET_STATUS');assert.equal(paused.enabled,false,'MIG-01 must not resume paused capture');
  assert.equal(await p.locator('#consent-panel').isVisible(),false,'existing user must not repeat consent onboarding');
  const reloadPrefs=(await rpc(p,'GET_PAGE',{page:{view:'settings'}})).preferences;assert.equal(reloadPrefs.appearance,'dark');assert.equal(reloadPrefs.fontSize,'large');assert.equal(reloadPrefs.readingWidth,'wide');

  await mkdir('work/ux-r1',{recursive:true});
  const matrix=[[1440,900],[1024,768],[390,844],[320,720]];
  for(const [width,height] of matrix){
   await p.setViewportSize({width,height});
   for(const theme of ['light','dark']){
    await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:theme}});await eventually(async()=>await p.evaluate(()=>document.documentElement.dataset.paiaTheme)===theme,theme+' applied');
    await p.screenshot({path:`work/ux-r1/archive-${width}x${height}-${theme}.png`,fullPage:true});
   }
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.ok(overflow<=2,`root must reflow at ${width}px; overflow=${overflow}`);
  }
  await p.setViewportSize({width:390,height:844});await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});await eventually(()=>p.locator('#primary-nav').isVisible(),'mobile root navigation visible');
  await p.locator('#core-loop-continue').click();await eventually(()=>p.locator('#document-panel').isVisible());assert.equal(await p.locator('#primary-nav').isVisible(),false,'Reader removes bottom root navigation on mobile');
  await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  await assertNoNetwork(h);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('UX-R1 optional history import still previews, confirms, writes once and opens the canonical Reader',{timeout:150000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'paia-ux-r1-import-'));let h;
 try{
  for(const name of ['manifest.json','adapter','content','background','core','ui','icons'])await cp(name,join(dir,name),{recursive:true});
  await writeFile(join(dir,'core/import/synthetic-test-adapter.js'),await readFile('tests/fixtures/import-adapter.mjs'));
  await writeFile(join(dir,'core/import/registry.js'),"import {syntheticAdapter} from './synthetic-test-adapter.js';export const VERIFIED_EXPORT_ADAPTER_IDS=Object.freeze([]);export const SUPPORTED_EXPORT_ADAPTER_IDS=Object.freeze(['synthetic-v1']);export const getOfficialExportAdapter=()=>syntheticAdapter;export const officialExportStatus=()=>({available:true,schemaVerified:false});\n");
  h=await FakeChatGPT.start({extensionPath:dir,onboarding:true});const p=h.archive;await consent(p);
  await eventually(()=>p.locator('#onboarding-history-step').isVisible(),'optional history step appears after new-user consent');
  await p.locator('#onboarding-history').click();await eventually(()=>p.locator('#history-dialog').evaluate(el=>el.open),'history chooser opens');
  await p.locator('#history-file-consent').check();const chooser=p.waitForEvent('filechooser');await p.locator('#history-choose').click();await(await chooser).setFiles({name:'synthetic-history.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([syntheticRow(1),syntheticRow(2)]))});
  await eventually(()=>p.locator('#history-commit').isEnabled(),'history is previewed before commit');assert.equal((await h.state()).records.length,0,'preflight must not write Source');
  assert.match(await p.locator('#history-status').textContent(),/检查完成/);await p.locator('#history-commit').click();await eventually(async()=>(await p.locator('#history-status').textContent())==='历史补全完成。','history commit completes');
  assert.equal((await h.state()).records.length,2);await p.locator('#history-read').click();await eventually(()=>p.locator('#core-loop-home').isVisible(),'history success returns to Archive');
  const recent=p.locator('#core-loop-continue');await eventually(async()=>!(await recent.isDisabled()),'imported content becomes real recently captured target');await recent.click();await eventually(async()=>await p.locator('#document-panel').isVisible()&&(await p.locator('#document-body').textContent()).includes('Synthetic'),'imported content opens canonical Reader');
  await assertNoNetwork(h);assert.deepEqual(h.errors,[]);
 }finally{await h?.close();await rm(dir,{recursive:true,force:true});}
});
