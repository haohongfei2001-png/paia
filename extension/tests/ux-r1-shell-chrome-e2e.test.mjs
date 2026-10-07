import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {openArchiveWindow} from './harness/archive-navigator.mjs';
import {syntheticRow} from './fixtures/import-adapter.mjs';

const rpc=async(page,type,fields={})=>{const r=await page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
async function consent(page){const action=page.locator('#enable-consent');await action.waitFor({state:'visible'});await eventually(async()=>!(await action.isDisabled()),'primary local-save consent is actionable');await action.click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'consent becomes durable');}
async function assertNoNetwork(h){assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);}

test('UX-R1 clean install keeps example isolated and the primary action itself grants local-save consent',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true});
 try{
  const p=h.archive;
  await eventually(()=>p.locator('#consent-panel').isVisible(),'consent intro is the first-use surface');
  assert.equal(await p.locator('#onboarding-welcome').isVisible(),false,'old module-teaching welcome must not precede consent');
  assert.match(await p.locator('#consent-title').textContent(),/保存你的表达|Save what you share/i);
  assert.match((await p.locator('#enable-consent').textContent()).trim(),/开始在本机保存|Start saving locally/i);
  assert.equal(await p.locator('#consent-check').isChecked(),false,'legacy acknowledgement is not a prerequisite');
  assert.equal(await p.locator('#enable-consent').isDisabled(),false,'primary action itself must be actionable');
  const before=await rpc(p,'GET_STATUS');assert.equal(before.consented,false);assert.equal(before.enabled,false);
  await p.locator('#ux-onboarding-example').click();await eventually(()=>p.locator('#ux-example-dialog').evaluate(el=>el.open),'example dialog opens');
  assert.match(await p.locator('#ux-example-dialog').textContent(),/示例，不会写入你的档案|Example only; not saved/i);
  await p.locator('#ux-example-dialog button').click();
  const afterExample=await rpc(p,'GET_STATUS');assert.deepEqual(afterExample,before,'example must not change consent/capture state');
  assert.equal((await h.state()).records.length,0,'example must not write a real Source record');
  await consent(p);const afterConsent=await rpc(p,'GET_STATUS');assert.equal(afterConsent.consented,true);assert.equal(afterConsent.enabled,true);
  assert.equal((await h.state()).records.length,0,'consent itself does not fabricate content');
  await assertNoNetwork(h);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('UX-R1 shell uses real recently-captured content, same-URL history, reversible settings and responsive navigation',{timeout:180000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true});
 try{
  const p=h.archive,text='UXR1_CAPTURE 这是一条用于验证最近收录与新外壳的合成输入。';
  await consent(p);if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN'}});await eventually(async()=>await p.evaluate(()=>document.documentElement.lang)==='zh-CN','explicit zh-CN shell preference applies');
  const chat={id:'ux-r1-capture',title:'UX-R1 最近收录',base:1609459200,messages:[{id:'ux-r1-message',text}]};
  await h.open(chat);await eventually(async()=>(await h.state()).records.some(row=>row.originalText===text),'real synthetic capture reaches Source');
  await p.bringToFront();await eventually(()=>p.locator('#archive-reader-navigator-slot').isVisible(),'current Archive root is visible');
  assert.deepEqual(await p.locator('#primary-nav button').allTextContents(),['档案','思想库','用于 AI']);
  assert.equal((await p.locator('.sidebar-bottom [data-view="settings"]').textContent()).trim(),'设置');
  assert.equal((await p.locator('#ux-local-state').textContent()).trim(),'本机保存');
  assert.equal(await p.evaluate(()=>location.hash+location.search),'','UX-R1 history must not invent hash/query routes');
  const recent=await rpc(p,'GET_PAGE',{page:{view:'library',limit:1}});assert.equal(recent.recentCapturedDocument?.id!==undefined,true);assert.equal(recent.recentCapturedDocument?.originalConversationTitle,'UX-R1 最近收录');
  assert.equal(await p.locator('#archive-root-recent,#archive-root-continue').count(),0);
  await openArchiveWindow(p,{text:'UX-R1 最近收录'});
  await eventually(async()=>await p.locator('#document-panel').isVisible()&&(await p.locator('#document-body').textContent()).includes('UXR1_CAPTURE'),'recently captured opens canonical Reader');
  await p.locator('#back').click();await eventually(()=>p.locator('#archive-reader-navigator-slot').isVisible(),'Reader returns to Archive home');

  await p.locator('#primary-nav [data-view="thoughts"]').click();await eventually(()=>p.locator('#thought-panel').isVisible(),'Thought Library remains reachable');
  await p.locator('.sidebar-bottom [data-view="settings"]').click();await eventually(()=>p.locator('#settings-panel').isVisible(),'Settings opens');
  await eventually(async()=>JSON.stringify(await p.locator('.ux-settings-nav button').allTextContents())===JSON.stringify(['输入档案','阅读与外观','AI 与提示词','隐私与访问','数据与恢复','关于 PAIA']),'Settings groups follow the active interface language');
  await p.locator('[data-settings-group="about"]').click();assert.match(await p.locator('[data-group="about"]').textContent(),/尚未接通/);
  await p.locator('#ux-settings-back').click();await eventually(()=>p.locator('#thought-panel').isVisible(),'Settings Back restores its originating root through same-URL history');
  assert.equal(await p.locator('#primary-nav [data-view="memory"]').count(),1,'approved local Context has one launcher');
  await p.locator('#primary-nav [data-view="library"]').click();await eventually(()=>p.locator('#archive-reader-navigator-slot').isVisible(),'Archive navigation commits before browser Back');await p.evaluate(()=>history.back());await eventually(()=>p.locator('#thought-panel').isVisible(),'browser Back restores Thought root');await p.evaluate(()=>history.forward());await eventually(()=>p.locator('#archive-reader-navigator-slot').isVisible(),'browser Forward restores blank Archive root');
  assert.equal(await p.evaluate(()=>location.hash+location.search),'','Back/Forward keeps the verified archive URL unchanged');
  await p.locator('#primary-nav [data-view="library"]').click();await eventually(()=>p.locator('#archive-reader-navigator-slot').isVisible());

  assert.equal(await p.locator('#universal-search-open').isVisible(),false,'normal shell exposes no global Search launcher');await eventually(()=>p.locator('#scope-search').isEnabled(),'Archive navigation completes before shortcut');await p.locator('#primary-nav [data-view="library"]').focus();await p.keyboard.press('Control+k');await eventually(async()=>await p.locator('#scope-search').evaluate(el=>document.activeElement===el),'Ctrl/Cmd+K focuses the Archive surface search');assert.equal(await p.locator('#universal-search-dialog').isVisible(),false,'Archive shortcut does not open the internal material-search shell');
  const skip=p.locator('#ux-skip-main');await skip.focus();assert.equal(await skip.isVisible(),true,'skip link is keyboard reachable');

  await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:'dark',fontSize:'large',readingWidth:'wide',language:'zh-CN'}});
  await eventually(async()=>await p.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark','dark preference applies immediately');
  const prefs=(await rpc(p,'GET_PAGE',{page:{view:'settings'}})).preferences;assert.equal(prefs.appearance,'dark');assert.equal(prefs.fontSize,'large');assert.equal(prefs.readingWidth,'wide');
  await rpc(p,'SET_ENABLED',{enabled:false});
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
  const cdp=await p.context().newCDPSession(p);await p.setViewportSize({width:640,height:900});await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});
  await p.screenshot({path:'work/ux-r1/archive-200pct-light.png',fullPage:true});assert.equal(await p.locator('#scope-search').isVisible(),true,'200% page scale keeps primary Archive search reachable');await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await cdp.detach();
  await p.setViewportSize({width:390,height:844});await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});
  await eventually(()=>p.evaluate(()=>{const menu=document.getElementById('archive-compact-navigation'),buttons=[...document.querySelectorAll('.sidebar [data-view]')];return !menu.hidden&&!menu.open&&buttons.length===4&&buttons.every(button=>button.parentElement.id==='archive-compact-nav-items');}),'mobile root navigation reaches its actual compact owner');
  await p.evaluate(()=>globalThis.__uxrCompactButtons=[...document.querySelectorAll('.sidebar [data-view]')]);await p.locator('#archive-compact-navigation > summary').click();
  for(const view of ['library','thoughts','memory','settings'])assert.equal(await p.locator(`#archive-compact-nav-items [data-view="${view}"]`).isVisible(),true,'same primary action is reachable: '+view);
  await p.locator('#archive-compact-navigation > summary').press('Escape');assert.equal(await p.locator('#archive-compact-navigation').evaluate(node=>node.open),false);assert.equal(await p.locator('#archive-compact-navigation > summary').evaluate(node=>document.activeElement===node),true);
  await openArchiveWindow(p,{text:'UX-R1 最近收录'});await eventually(()=>p.locator('#document-panel').isVisible());assert.equal(await p.locator('#archive-compact-navigation > summary').isVisible(),true,'narrow Reader retains compact top navigation');assert.equal(await p.evaluate(()=>__uxrCompactButtons.every(node=>node.isConnected&&node.parentElement.id==='archive-compact-nav-items')),true,'Reader preserves the same primary button owners');
  await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  await assertNoNetwork(h);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('UX-R1 optional history import previews, confirms and reads one real imported document',{timeout:150000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'paia-ux-r1-import-'));let h;
 try{
  for(const name of ['manifest.json','adapter','content','background','core','ui','icons'])await cp(name,join(dir,name),{recursive:true});
  await writeFile(join(dir,'core/import/synthetic-test-adapter.js'),await readFile('tests/fixtures/import-adapter.mjs'));
  await writeFile(join(dir,'core/import/registry.js'),"import {syntheticAdapter} from './synthetic-test-adapter.js';export const VERIFIED_EXPORT_ADAPTER_IDS=Object.freeze([]);export const SUPPORTED_EXPORT_ADAPTER_IDS=Object.freeze(['synthetic-v1']);export const getOfficialExportAdapter=()=>syntheticAdapter;export const officialExportStatus=()=>({available:true,schemaVerified:false});\n");
  h=await FakeChatGPT.start({extensionPath:dir,onboarding:true});const p=h.archive;await consent(p);
  await eventually(()=>p.locator('#onboarding-history-step').isVisible(),'fresh consent preserves the first-use import owner in Archive');assert.equal(await p.locator('#history-settings').isVisible(),false,'Settings import is not duplicated into Archive');
  await p.locator('#onboarding-history').click();await eventually(()=>p.locator('#history-dialog').evaluate(el=>el.open),'history chooser opens');
  await p.locator('#history-file-consent').check();const chooser=p.waitForEvent('filechooser');await p.locator('#history-choose').click();await(await chooser).setFiles({name:'synthetic-history.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([syntheticRow(1),syntheticRow(2)]))});
  await eventually(()=>p.locator('#history-commit').isEnabled(),'history is previewed before commit');assert.equal((await h.state()).records.length,0,'preflight must not write Source');
  assert.match(await p.locator('#history-status').textContent(),/检查完成/);await p.locator('#history-commit').click();await eventually(async()=>(await p.locator('#history-status').textContent())==='历史补全完成。','history commit completes');
  assert.equal(await p.locator('#onboarding-history-step').isVisible(),false,'completed import removes first-run prompt');const imported=await h.state();assert.equal(imported.records.length,2);assert.equal(imported.library.blocks.length,2);assert.ok(imported.records.every(row=>row.originalText.includes('Synthetic')));assert.equal((await rpc(p,'PAIA_REVISIT_STATUS')).newInputs.count,0,'UX-R2: imported history creates no new-input debt');assert.deepEqual(await rpc(p,'PAIA_READER_RECENT'),[],'import is not a formal read');
  assert.match(await p.locator('#history-read').textContent(),/读一篇|Read one/i);await p.locator('#history-read').click();
  await eventually(()=>p.locator('#document-panel').isVisible(),'Read one opens the canonical imported Reader directly');const body=(await p.locator('#document-body').textContent()).trim();assert.ok(body.length>0,'imported Reader contains real saved content');
  await assertNoNetwork(h);assert.deepEqual(h.errors,[]);
 }finally{await h?.close();await rm(dir,{recursive:true,force:true});}
});
