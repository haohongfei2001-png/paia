import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const execFileAsync=promisify(execFile);
const rpc=async(page,type,fields={})=>{const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(response.ok,true,JSON.stringify(response));return response.data;};
const tray=page=>page.evaluate(async()=>{const {getMaterialTray}=await import(chrome.runtime.getURL('ui/material-tray.js'));return getMaterialTray().data;});
const nav=(page,view)=>page.locator(`[data-view="${view}"]`).first().click();

async function consent(page){
  const action=page.locator('#enable-consent');
  await action.waitFor({state:'visible'});
  await eventually(async()=>!(await action.isDisabled()),'UIR-04 consent action is available');
  await action.click();
  await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'UIR-04 consent is durable');
  if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();
}

async function prepare(h,label){
  const page=h.archive;
  await consent(page);
  await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light',readingWidth:'wide'}});
  await h.open({id:label.toLowerCase(),title:'UIR-04 合成材料',base:1609459200,messages:[
    {id:`${label}-1`,text:`${label}_TARGET 第一段合成材料，用于 Context 工作台与输出预览验证。`},
    {id:`${label}-2`,text:`${label}_TARGET 第二段合成材料。\n包含多行文字与 https://example.invalid/uir04/path 。`},
    {id:`${label}-3`,text:`${label}_OTHER 第三段材料，不应被本次搜索选中。`}
  ]});
  await eventually(async()=>(await h.state()).records.length>=3,'UIR-04 synthetic Inputs captured');
  await page.bringToFront();
  await nav(page,'memory');
  await eventually(()=>page.locator('#material-workbench').isVisible(),'MaterialTray is the default Context owner');
  await eventually(async()=>await page.locator('#view-title').textContent()==='用于 AI','Context outer heading is localized');
  return page;
}

async function shot(page,name,{fullPage=true}={}){await mkdir('work/ux-r4',{recursive:true});await page.screenshot({path:`work/ux-r4/${name}.png`,fullPage});}

async function addTwoFromSearch(page,label){
  await page.getByRole('button',{name:'从档案选择',exact:true}).click();
  await eventually(()=>page.locator('#universal-search-dialog').isVisible(),'Archive picker opens through existing Universal Search');
  const input=page.getByRole('searchbox',{name:'全局搜索'});
  await input.fill(`${label}_TARGET`);
  await eventually(async()=>await page.locator('.universal-hit').count()===2,'two current Inputs are found');
  await page.locator('.universal-hit input[type=checkbox]').nth(0).check();
  await page.locator('.universal-hit input[type=checkbox]').nth(1).check();
  await page.locator('.universal-selection').getByRole('button',{name:'加入本次材料 (2)',exact:true}).click();
  await eventually(async()=>(await tray(page))?.items.length===2,'two exact refs enter MaterialTray');
  await eventually(()=>page.locator('.material-drawer').isVisible(),'search selection opens the existing MaterialTray as a drawer');
}

async function sourceJourney(page,h,label){
  await page.setViewportSize({width:1440,height:900});
  assert.equal(await page.locator('h1:visible').count(),1,'Context keeps one visible page h1');
  assert.equal(await page.locator('#material-title').textContent(),'本次材料');
  assert.match(await page.locator('.material-status').textContent(),/只在本机准备，尚未发送/);
  const workspace=await page.locator('#material-workbench').boundingBox();
  assert.ok(workspace&&workspace.width>900,`Context uses the main workspace instead of the old 680px shell; got ${workspace?.width}`);
  const main=await page.locator('.material-tray-main').boundingBox(),secondary=await page.locator('.material-tray-secondary').boundingBox();
  assert.ok(main&&secondary&&secondary.x>main.x,'wide Context separates materials from task controls without cloning the owner');
  await page.evaluate(()=>{globalThis.__uir04MaterialRoot=document.querySelector('#material-workbench');});
  await shot(page,'uir-04-context-empty-1440x900-light');

  await addTwoFromSearch(page,label);
  assert.equal(await page.evaluate(()=>globalThis.__uir04MaterialRoot===document.querySelector('#material-workbench')),true,'drawer moves the same MaterialTray root');
  const drawer=await page.locator('.material-drawer').boundingBox();
  assert.ok(drawer&&drawer.width>=398&&drawer.width<=402,`desktop drawer stays about 400px; got ${drawer?.width}`);
  assert.equal(await page.locator('.app-shell').evaluate(el=>el.inert),false,'desktop drawer stays non-modal');
  assert.match(await page.locator('#material-count').textContent(),/2/);
  assert.equal(await page.locator('.material-source-role').count(),2,'each selected material keeps an explicit source role');
  await shot(page,'uir-04-context-drawer-1440x900-light',{fullPage:false});

  await page.locator('#material-preview').click();
  await eventually(async()=>(await tray(page)).state==='ready','local preview is ready');
  await eventually(()=>page.locator('#material-output-text').isVisible(),'continuous output preview is visible');
  assert.equal(await page.locator('#material-title').textContent(),'输出预览');
  assert.equal(await page.locator('.material-drawer-close').count(),0,'drawer-only close control is removed after the same root returns to the Context page');
  const previewWorkspace=await page.locator('#material-workbench').boundingBox(),output=await page.locator('#material-output-text').boundingBox();
  assert.ok(previewWorkspace&&output&&previewWorkspace.width>output.width,'Context frame remains wider than preview prose');
  assert.ok(output.width<=722&&output.width>=700,`wide reading preference constrains preview near 720px; got ${output?.width}`);
  assert.match(await page.locator('.material-output-meta').textContent(),/实际字数/);
  assert.equal(await page.locator('[data-output=copy]').isEnabled(),true);
  await shot(page,'uir-04-context-preview-1440x900-light');

  await page.getByRole('button',{name:'修改本次输出',exact:true}).click();
  const editable=page.locator('[data-material-edit]').nth(1);
  await editable.evaluate(el=>{el.focus();el.dispatchEvent(new CompositionEvent('compositionstart',{data:'新'}));el.value+=' UIR04_IME_DRAFT';el.dispatchEvent(new InputEvent('input',{data:'T',isComposing:true,bubbles:true}));});
  await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});
  assert.match(await editable.inputValue(),/UIR04_IME_DRAFT/,'IME draft stays in the same owner during preference projection');
  await editable.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend',{data:'UIR04_IME_DRAFT'})));
  await page.getByRole('button',{name:'确认本次修改',exact:true}).click();
  await eventually(async()=>(await tray(page)).state==='ready'&&await page.locator('#material-output-text').isVisible(),'edited preview is revalidated');
  assert.match(await page.locator('#material-output-text').textContent(),/UIR04_IME_DRAFT/);
  await shot(page,'uir-04-context-preview-1440x900-dark');

  await page.getByRole('button',{name:'返回材料',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{const {getMaterialTray}=await import(chrome.runtime.getURL('ui/material-tray.js'));getMaterialTray().openDrawer();});
  await eventually(()=>page.locator('.material-drawer').isVisible(),'mobile MaterialTray opens');
  assert.equal(await page.evaluate(()=>globalThis.__uir04MaterialRoot===document.querySelector('#material-workbench')),true,'mobile drawer still moves the same root');
  const mobileDrawer=await page.locator('.material-drawer').boundingBox();
  assert.ok(mobileDrawer&&mobileDrawer.width>=388,`mobile drawer fills the viewport; got ${mobileDrawer?.width}`);
  assert.equal(await page.locator('.app-shell').evaluate(el=>el.inert),true,'<=600px MaterialTray keeps the existing modal/inert boundary');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'mobile Context has no root horizontal overflow');
  await shot(page,'uir-04-context-drawer-390x844-dark',{fullPage:false});
  await page.getByRole('button',{name:'关闭材料盘',exact:true}).click();
  assert.equal(await page.locator('.app-shell').evaluate(el=>el.inert),false,'closing mobile MaterialTray restores the app shell');

  await page.setViewportSize({width:1024,height:768});
  const layout=page.locator('.material-tray-layout');
  const responsive=await layout.evaluate(el=>getComputedStyle(el).display);
  assert.equal(responsive,'block','1024px Context stacks before the wide two-column breakpoint');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'1024px Context has no root horizontal overflow');

  const blockedId=(await tray(page)).items[0].ref.id;
  await rpc(page,'PAIA_MEMORY_EXCLUDE',{options:{inputId:blockedId,excluded:true}});
  await eventually(async()=>(await tray(page)).state==='blocked','persistent restriction invalidates the current selection');
  await page.locator('#material-preview').click();
  await pause(120);
  assert.equal(await page.locator('#material-output-text').count(),0,'blocked state exposes no old output body');
  assert.equal(await page.locator('[data-output]').count(),0,'blocked state exposes no copy/export bypass');
  assert.equal(h.deepSeekRequests.length,0,'manual Context journey never calls a Provider');
  assert.equal(h.extensionNetworkRequests,0,'manual Context journey makes no extension external request');
  assert.equal(h.externalRequests,0,'manual Context journey makes no unexpected external request');
  assert.deepEqual(h.errors,[]);
}

async function releaseJourney(page,h,label){
  await page.setViewportSize({width:1440,height:900});
  await addTwoFromSearch(page,label);
  await page.locator('#material-preview').click();
  await eventually(async()=>(await tray(page)).state==='ready'&&await page.locator('#material-output-text').isVisible(),'built release MaterialTray produces a local preview');
  const root=await page.locator('#material-workbench').boundingBox(),output=await page.locator('#material-output-text').boundingBox();
  assert.ok(root&&output&&root.width>output.width&&output.width<=722,'built release preserves wide Context frame plus saved prose width');
  await shot(page,'uir-04-current-release-context-preview-1440x900-light');
  assert.equal(h.deepSeekRequests.length,0);
  assert.equal(h.extensionNetworkRequests,0);
  assert.equal(h.externalRequests,0);
  assert.deepEqual(h.errors,[]);
}

test('UIR-04 Context keeps MaterialTray as the single owner while widening the workspace and preserving drawer, draft, reading-width and restriction boundaries in source and built release Chrome',{timeout:300000},async()=>{
  let source;
  try{source=await FakeChatGPT.start({onboarding:true});const page=await prepare(source,'UIR04_CONTEXT');await sourceJourney(page,source,'UIR04_CONTEXT');}finally{await source?.close();}
  await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});
  let release;
  try{release=await FakeChatGPT.start({extensionPath:'work/current-release',onboarding:true});const page=await prepare(release,'UIR04_RELEASE');await releaseJourney(page,release,'UIR04_RELEASE');}finally{await release?.close();}
});
