import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const execFileAsync=promisify(execFile);
const rpc=async(page,type,fields={})=>{const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(response.ok,true,JSON.stringify(response));return response.data;};
async function consent(page){
 const action=page.locator('#enable-consent');await action.waitFor({state:'visible'});await eventually(async()=>!(await action.isDisabled()));await action.click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true);
 if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();
}
async function shot(page,name){await mkdir('work/ux-r6',{recursive:true});await page.screenshot({path:`work/ux-r6/${name}.png`,fullPage:true});}
async function assertNoNetwork(h){assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);}
async function openExtensionPage(h,path,{width,height}){const page=await h.context.newPage();await page.setViewportSize({width,height});await page.goto(`chrome-extension://${h.extensionId}/ui/${path}`);return page;}
async function assertNoOverflow(page,label){const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.ok(overflow<=2,`${label} has no root horizontal overflow; got ${overflow}`);}

async function sourceJourney(h){
 const archive=h.archive;await consent(archive);await rpc(archive,'UPDATE_PREFERENCES',{changes:{appearance:'light',language:'zh-CN'}});
 const popup=await openExtensionPage(h,'popup.html',{width:350,height:600});await popup.locator('#record-count').waitFor();await eventually(async()=>await popup.evaluate(()=>document.documentElement.dataset.paiaTheme)==='light','popup follows saved light appearance');
 assert.equal(await popup.locator('h1:visible').count(),1);assert.equal((await popup.locator('h1').textContent()).trim(),'PAIA');assert.equal(await popup.locator('#open-archive').isVisible(),true);assert.equal(await popup.locator('#toggle-capture').isVisible(),true);assert.equal(await popup.locator('#popup-internal-tools').count(),1,'source keeps internal tools owner');await assertNoOverflow(popup,'350px popup document tab (not native sizing)' );await shot(popup,'uir-04-popup-350x600-light');
 await popup.locator('#toggle-capture').click();await eventually(async()=>(await rpc(popup,'GET_STATUS')).enabled===false,'popup pause uses existing capture handler');await eventually(async()=>/恢复捕获/.test(await popup.locator('#toggle-capture').textContent()),'popup renders paused action');
 await popup.locator('#toggle-capture').click();await eventually(async()=>(await rpc(popup,'GET_STATUS')).enabled===true,'popup resume uses existing capture handler');
 await popup.locator('#popup-internal-tools > summary').click();assert.equal(await popup.locator('#popup-internal-tools a[href="product-signals.html"]').count(),1,'Passport/local-tools entry remains reachable');
 await rpc(archive,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});await popup.reload();await eventually(async()=>await popup.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark','popup follows saved dark appearance');await shot(popup,'uir-04-popup-350x600-dark');await popup.close();

 const tools=await openExtensionPage(h,'product-signals.html',{width:1024,height:768});await tools.locator('#signals-status').waitFor();await eventually(async()=>await tools.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark','local tools follows saved dark appearance');assert.equal(await tools.locator('h1:visible').count(),1);assert.equal((await tools.locator('h1').textContent()).trim(),'本机工具');assert.match(await tools.locator('#local-tools-back').getAttribute('href'),/archive\.html$/);assert.equal(await tools.locator('#passport-section').count(),1);assert.equal(await tools.locator('#context-package-section').count(),1);await assertNoOverflow(tools,'1024px local tools');await shot(tools,'uir-04-local-tools-1024x768-dark');
 await rpc(archive,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});await tools.reload();await tools.setViewportSize({width:390,height:844});await eventually(async()=>await tools.evaluate(()=>document.documentElement.dataset.paiaTheme)==='light','local tools restores saved light appearance');await assertNoOverflow(tools,'390px local tools');const back=await tools.locator('#local-tools-back').boundingBox();assert.ok(back&&back.height>=18,'local tools back link remains visible on narrow viewport');await shot(tools,'uir-04-local-tools-390x844-light');await tools.close();await assertNoNetwork(h);
}

async function releaseJourney(h){
 const archive=h.archive;await consent(archive);await rpc(archive,'UPDATE_PREFERENCES',{changes:{appearance:'dark',language:'zh-CN'}});
 const popup=await openExtensionPage(h,'popup.html',{width:350,height:600});await popup.locator('#record-count').waitFor();await eventually(async()=>await popup.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark');assert.equal(await popup.locator('#popup-internal-tools').count(),0,'release keeps popup internal-tool pruning');assert.equal(await popup.locator('#open-archive').isVisible(),true);assert.equal(await popup.locator('#toggle-capture').isVisible(),true);await assertNoOverflow(popup,'350px release popup document tab (not native sizing)' );await shot(popup,'uir-04-current-release-popup-350x600-dark');await popup.close();
 const tools=await openExtensionPage(h,'product-signals.html',{width:390,height:844});await tools.locator('#signals-status').waitFor();await eventually(async()=>await tools.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark');assert.equal(await tools.locator('h1:visible').count(),1);assert.equal(await tools.locator('#local-tools-back').count(),1);await assertNoOverflow(tools,'390px release local tools');await tools.close();await assertNoNetwork(h);
}

test('UIR-04 popup document-tab rendering and local tools preserve capture/Passport owners in source and built release Chrome',{timeout:300000},async()=>{
 let source;try{source=await FakeChatGPT.start({onboarding:true});await sourceJourney(source);}finally{await source?.close();}
 await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});
 let release;try{release=await FakeChatGPT.start({extensionPath:'work/current-release',onboarding:true});await releaseJourney(release);}finally{await release?.close();}
});

// Native action popup, not popup.html in a resized ordinary tab. Chrome 127+
// documents action.openPopup(); extension.getViews({type:'popup'}) supplies the
// native popup Window. This test also passes viewport:null at context creation
// so even popup targets recognized as pages get no Playwright emulation.
// https://developer.chrome.com/docs/extensions/reference/api/action#method-openPopup
// https://developer.chrome.com/docs/extensions/reference/api/extension#method-getViews
// https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context-option-viewport
async function openNativePopup(h){
 const p=h.archive;for(const page of h.context.pages())assert.equal(page.viewportSize(),null,'native popup context has no emulated page viewport');await p.bringToFront();
 const before=new Set((await h.cdp.send('Target.getTargets')).targetInfos.map(target=>target.targetId));
 await p.evaluate(()=>chrome.action.openPopup());
 await eventually(()=>p.evaluate(()=>chrome.extension.getViews({type:'popup'}).some(view=>view.location.pathname==='/ui/popup.html'&&/^[\d,]+$/.test(view.document.querySelector('#record-count')?.textContent||''))),'native action popup finishes loading');
 const targets=(await h.cdp.send('Target.getTargets')).targetInfos.filter(target=>!before.has(target.targetId)&&target.url===`chrome-extension://${h.extensionId}/ui/popup.html`);
 assert.equal(targets.length,1,'opening action creates exactly one native popup target');
 for(const page of h.context.pages())assert.equal(page.viewportSize(),null,'native popup and existing pages retain disabled viewport emulation');
 assert.equal(await p.evaluate(async()=>{const url=chrome.runtime.getURL('ui/popup.html');return (await chrome.tabs.query({})).filter(tab=>tab.url===url).length;}),0,'native popup is not a tabs.create/newPage substitute');
 return p;
}
async function nativePopupSnapshot(p){return p.evaluate(()=>{
 const w=chrome.extension.getViews({type:'popup'}).find(view=>view.location.pathname==='/ui/popup.html');
 if(!w)throw Error('Native action popup closed before inspection');
 const d=w.document,rect=id=>{const r=d.querySelector(id).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
 return {width:w.innerWidth,clientWidth:d.documentElement.clientWidth,scrollbarGutter:w.innerWidth-d.documentElement.clientWidth,height:w.innerHeight,bodyWidth:d.body.getBoundingClientRect().width,overflow:d.documentElement.scrollWidth-d.documentElement.clientWidth,count:d.querySelector('#record-count').textContent,label:rect('.count > span'),background:w.getComputedStyle(d.body).backgroundColor,consent:d.querySelector('#first-use').hidden,toggleHidden:d.querySelector('#toggle-capture').hidden,toggleText:d.querySelector('#toggle-capture').textContent,active:d.querySelector('#status-dot').classList.contains('active'),action:rect('#open-archive')};
 });}
async function closeNativePopup(p){await p.evaluate(()=>{for(const view of chrome.extension.getViews({type:'popup'}))view.close();});await eventually(()=>p.evaluate(()=>chrome.extension.getViews({type:'popup'}).length===0),'native action popup closes');}
function assertNativeGeometry(value,label){
 assert.ok(Math.abs(value.clientWidth-350)<=2,label+' native usable viewport keeps intrinsic 350px width: '+JSON.stringify(value));
 assert.ok(value.scrollbarGutter>=0,label+' reports a nonnegative native scrollbar gutter');
 assert.ok(Math.abs(value.width-(350+value.scrollbarGutter))<=2,label+' layout width allows only the measured native scrollbar gutter');
 assert.equal(value.bodyWidth,350);assert.ok(value.label.width>=132,label+' count label stays readable');
 assert.ok(value.overflow<=2,label+' has no horizontal overflow');
 assert.ok(value.action.width>=260&&value.action.height>=42,label+' primary action remains usable');
}

test('Bounded native action popup has intrinsic width, readable count labels and reachable diagnostics',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true,headless:false,viewport:null});
 try{
  const p=h.archive;await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:'light',language:'zh-CN'}});
  await openNativePopup(h);let value=await nativePopupSnapshot(p);assertNativeGeometry(value,'unconsented');assert.equal(value.count,'0');assert.equal(value.consent,false);assert.equal(value.toggleHidden,true);assert.equal(value.active,false);assert.equal(value.background,'rgb(255, 255, 255)');await closeNativePopup(p);
  await consent(p);await openNativePopup(h);value=await nativePopupSnapshot(p);assertNativeGeometry(value,'active');assert.equal(value.active,true);assert.equal(value.toggleHidden,false);assert.match(value.toggleText,/暂停/);
  await p.evaluate(()=>chrome.extension.getViews({type:'popup'})[0].document.querySelector('#toggle-capture').click());
  await eventually(async()=>(await rpc(p,'GET_STATUS')).enabled===false,'native popup pauses through real handler');
  await eventually(async()=>(await nativePopupSnapshot(p)).active===false,'native popup paints paused state');value=await nativePopupSnapshot(p);assertNativeGeometry(value,'paused');assert.match(value.toggleText,/恢复/);
  // Presentation stress only: actual capture/count correctness is covered by
  // the real zero above and capture suites. Do not seed thousands of records
  // merely to test the width of formatted digits in this native popup.
  for(const count of ['2,545','9,999,999,999,999']){
   await p.evaluate(count=>{chrome.extension.getViews({type:'popup'})[0].document.querySelector('#record-count').textContent=count;},count);
   value=await nativePopupSnapshot(p);assert.equal(value.count,count);assertNativeGeometry(value,count);
  }
  await p.evaluate(()=>{const w=chrome.extension.getViews({type:'popup'})[0];w.document.querySelector('#popup-internal-tools').open=true;});
  await eventually(()=>p.evaluate(()=>{const w=chrome.extension.getViews({type:'popup'})[0];return w.document.documentElement.scrollHeight>w.innerHeight;}),'expanded native diagnostics exceed the popup viewport');
  await p.evaluate(()=>{const w=chrome.extension.getViews({type:'popup'})[0];w.document.querySelector('#popup-internal-tools a[href="product-signals.html"]').scrollIntoView({block:'end'});});
  const diagnostics=await p.evaluate(()=>{const w=chrome.extension.getViews({type:'popup'})[0],r=w.document.querySelector('#popup-internal-tools a[href="product-signals.html"]').getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:w.innerHeight,scroll:w.scrollY};});
  assert.ok(diagnostics.scroll>0&&diagnostics.top>=0&&diagnostics.bottom<=diagnostics.height+1,'last diagnostic action is reachable by vertical scrolling');
  value=await nativePopupSnapshot(p);assertNativeGeometry(value,'expanded diagnostics');
  await closeNativePopup(p);await assertNoNetwork(h);
 }finally{await h.close();}
});
