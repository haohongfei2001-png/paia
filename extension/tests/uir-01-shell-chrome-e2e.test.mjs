import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const execFileAsync=promisify(execFile);
const rpc=async(page,type,fields={})=>{const r=await page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
async function consent(page){const action=page.locator('#enable-consent');await action.waitFor({state:'visible'});await eventually(async()=>!(await action.isDisabled()),'UIR-01 local-save consent is actionable');await action.click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'UIR-01 consent is durable');await eventually(async()=>await page.locator('#onboarding-skip').isVisible(),'optional history onboarding appears');await page.locator('#onboarding-skip').click();await eventually(async()=>!(await page.locator('#onboarding-history-step').isVisible()),'optional history onboarding can be skipped');}
async function prepareArchive(h,label='UIR01_CAPTURE'){const p=h.archive;await consent(p);await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});const text=`${label} 用于验证 UI Refresh Shell 与 Archive 框架的合成输入。`;await h.open({id:label.toLowerCase(),title:'UIR-01 最近收录',base:1609459200,messages:[{id:label+'-message',text}]});await eventually(async()=>(await h.state()).records.some(row=>row.originalText===text),'synthetic capture reaches immutable Source');await p.bringToFront();await eventually(()=>p.locator('#core-loop-home').isVisible(),'Archive root is visible');return {p,text};}
async function assertNoNetwork(h){assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);}
async function assertShell(p){
 assert.equal(await p.locator('#primary-nav > button').count(),3,'three root destinations remain the only primary nav');
 assert.equal(await p.locator('#primary-nav > button .ux-nav-icon').count(),3,'each root destination has one restrained icon');
 assert.equal(await p.locator('.sidebar-bottom > [data-view="settings"] .ux-nav-icon').count(),1,'Settings has its shell icon');
 assert.equal((await p.locator('#workspace-heading').textContent()).trim(),'档案');
 assert.equal(await p.locator('h1:visible').count(),1,'Archive has one visible page-level heading');
 assert.equal(await p.locator('#universal-search-open').isVisible(),false,'normal Archive shell has no visible global search launcher');assert.equal(await p.locator('#universal-search-open').count(),0,'obsolete launcher is removed from the DOM, not merely hidden');assert.equal(await p.locator('#search').isVisible(),true,'Archive root owns the visible search box');
 assert.equal(await p.locator('#uir-revisit-row').count(),1,'Archive composes the two historic Revisit contracts into one visual row');assert.equal(await p.locator('#revisit-open').isVisible(),true,'the direct Revisit contract remains visible and clickable');assert.equal(await p.locator('#core-loop-return').isVisible(),true,'the return-state contract remains visible and clickable');assert.equal((await p.locator('#core-loop-return .core-loop-card-label').textContent()).trim(),'本机变化');assert.equal(await p.locator('#core-loop-return > strong').isVisible(),false,'the status card does not repeat a second visible Revisit label');
 assert.equal(await p.locator('#uir-archive-main').count(),1);assert.equal(await p.locator('#uir-archive-assist').count(),1);assert.equal(await p.evaluate(()=>location.hash+location.search),'','UI refresh must not invent URL routes');
}
async function assertLocaleChrome(p){
 await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'en'}});await eventually(async()=>await p.evaluate(()=>document.documentElement.lang)==='en','English shell applies');
 assert.deepEqual(await p.locator('#primary-nav .ux-nav-label').allTextContents(),['Archive','Thought Library','For AI']);assert.equal(await p.locator('#primary-nav .ux-nav-icon').count(),3);assert.equal(await p.locator('#universal-search-open').isVisible(),false,'English shell also keeps global search launcher hidden');assert.equal(await p.locator('#search').isVisible(),true);assert.match(await p.locator('#revisit-open').textContent(),/Open Revisit/);assert.equal((await p.locator('#core-loop-return .core-loop-card-label').textContent()).trim(),'Local changes');
 await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN'}});await eventually(async()=>await p.evaluate(()=>document.documentElement.lang)==='zh-CN','Chinese shell restores');await assertShell(p);
}
async function screenshotArchiveMatrix(p){
 await mkdir('work/ux-r1',{recursive:true});
 for(const [width,height,theme] of [[1440,900,'light'],[1440,900,'dark'],[1024,768,'light'],[390,844,'light']]){
  await p.setViewportSize({width,height});await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:theme}});await eventually(async()=>await p.evaluate(()=>document.documentElement.dataset.paiaTheme)===theme,`${theme} theme applies`);
  const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.ok(overflow<=2,`${width}px Archive reflows without horizontal root overflow; got ${overflow}`);
  const main=await p.locator('#uir-archive-main').boundingBox(),assist=await p.locator('#uir-archive-assist').boundingBox();assert.ok(main&&assist);
  if(width>=1224)assert.ok(assist.x>main.x,'wide Archive keeps real auxiliary state beside the main list');else assert.ok(assist.y<=main.y,'narrow Archive stacks auxiliary state before the main list');
  const file=`work/ux-r1/uir-01-archive-${width}x${height}-${theme}.png`;await p.screenshot({path:file,fullPage:true});
 }
}

test('UIR-01 shell and Archive frame stay semantic across source and current-release Chrome',{timeout:240000},async()=>{
 let h;
 try{
  h=await FakeChatGPT.start({onboarding:true});const {p}=await prepareArchive(h);await assertShell(p);await assertLocaleChrome(p);await screenshotArchiveMatrix(p);
  await p.setViewportSize({width:1440,height:900});await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});await p.locator('.sidebar-bottom > [data-view="settings"]').click();await eventually(()=>p.locator('#settings-panel').isVisible(),'Settings opens');assert.equal(await p.locator('h1:visible').count(),1,'Settings has one visible page-level heading');assert.equal((await p.locator('#ux-settings-title').textContent()).trim(),'设置');assert.equal(await p.locator('#page-breadcrumb').isVisible(),false,'Settings hides duplicate global breadcrumb');assert.equal(await p.locator('.workspace-header #back').isVisible(),false,'Settings hides duplicate global return');await mkdir('work/ux-r6',{recursive:true});await p.screenshot({path:'work/ux-r6/uir-01-settings-1440x900-light.png',fullPage:true});
  await p.locator('#ux-settings-back').click();await eventually(()=>p.locator('#core-loop-home').isVisible(),'Settings Back restores Archive root');assert.equal(await p.locator('#universal-search-open').isVisible(),false,'global Search launcher stays absent after Settings return');await p.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',metaKey:true,bubbles:true,cancelable:true})));await eventually(async()=>await p.locator('#search').evaluate(el=>document.activeElement===el),'Archive shortcut focuses the current-surface search');assert.equal(await p.locator('#universal-search-dialog').isVisible(),false,'shortcut does not open the internal search shell');assert.equal(await p.evaluate(()=>location.hash+location.search),'');await assertNoNetwork(h);
 }finally{await h?.close();}

 await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});
 let release;
 try{
  release=await FakeChatGPT.start({extensionPath:'work/current-release',onboarding:true});const {p}=await prepareArchive(release,'UIR01_RELEASE');await assertShell(p);await p.setViewportSize({width:1440,height:900});await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});await eventually(async()=>await p.evaluate(()=>document.documentElement.dataset.paiaTheme)==='light');await p.screenshot({path:'work/ux-r1/uir-01-current-release-archive-1440x900-light.png',fullPage:true});await assertNoNetwork(release);
 }finally{await release?.close();}
});
