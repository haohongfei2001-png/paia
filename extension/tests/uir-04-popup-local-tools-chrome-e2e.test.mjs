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
 assert.equal(await popup.locator('h1:visible').count(),1);assert.equal((await popup.locator('h1').textContent()).trim(),'PAIA');assert.equal(await popup.locator('#open-archive').isVisible(),true);assert.equal(await popup.locator('#toggle-capture').isVisible(),true);assert.equal(await popup.locator('#popup-internal-tools').count(),1,'source keeps internal tools owner');await assertNoOverflow(popup,'350px source popup');await shot(popup,'uir-04-popup-350x600-light');
 await popup.locator('#toggle-capture').click();await eventually(async()=>(await rpc(popup,'GET_STATUS')).enabled===false,'popup pause uses existing capture handler');await eventually(async()=>/恢复捕获/.test(await popup.locator('#toggle-capture').textContent()),'popup renders paused action');
 await popup.locator('#toggle-capture').click();await eventually(async()=>(await rpc(popup,'GET_STATUS')).enabled===true,'popup resume uses existing capture handler');
 await popup.locator('#popup-internal-tools > summary').click();assert.equal(await popup.locator('#popup-internal-tools a[href="product-signals.html"]').count(),1,'Passport/local-tools entry remains reachable');
 await rpc(archive,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});await popup.reload();await eventually(async()=>await popup.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark','popup follows saved dark appearance');await shot(popup,'uir-04-popup-350x600-dark');await popup.close();

 const tools=await openExtensionPage(h,'product-signals.html',{width:1024,height:768});await tools.locator('#signals-status').waitFor();await eventually(async()=>await tools.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark','local tools follows saved dark appearance');assert.equal(await tools.locator('h1:visible').count(),1);assert.equal((await tools.locator('h1').textContent()).trim(),'本机工具');assert.match(await tools.locator('#local-tools-back').getAttribute('href'),/archive\.html$/);assert.equal(await tools.locator('#passport-section').count(),1);assert.equal(await tools.locator('#context-package-section').count(),1);await assertNoOverflow(tools,'1024px local tools');await shot(tools,'uir-04-local-tools-1024x768-dark');
 await rpc(archive,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});await tools.reload();await tools.setViewportSize({width:390,height:844});await eventually(async()=>await tools.evaluate(()=>document.documentElement.dataset.paiaTheme)==='light','local tools restores saved light appearance');await assertNoOverflow(tools,'390px local tools');const back=await tools.locator('#local-tools-back').boundingBox();assert.ok(back&&back.height>=18,'local tools back link remains visible on narrow viewport');await shot(tools,'uir-04-local-tools-390x844-light');await tools.close();await assertNoNetwork(h);
}

async function releaseJourney(h){
 const archive=h.archive;await consent(archive);await rpc(archive,'UPDATE_PREFERENCES',{changes:{appearance:'dark',language:'zh-CN'}});
 const popup=await openExtensionPage(h,'popup.html',{width:350,height:600});await popup.locator('#record-count').waitFor();await eventually(async()=>await popup.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark');assert.equal(await popup.locator('#popup-internal-tools').count(),0,'release keeps popup internal-tool pruning');assert.equal(await popup.locator('#open-archive').isVisible(),true);assert.equal(await popup.locator('#toggle-capture').isVisible(),true);await assertNoOverflow(popup,'350px release popup');await shot(popup,'uir-04-current-release-popup-350x600-dark');await popup.close();
 const tools=await openExtensionPage(h,'product-signals.html',{width:390,height:844});await tools.locator('#signals-status').waitFor();await eventually(async()=>await tools.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark');assert.equal(await tools.locator('h1:visible').count(),1);assert.equal(await tools.locator('#local-tools-back').count(),1);await assertNoOverflow(tools,'390px release local tools');await tools.close();await assertNoNetwork(h);
}

test('UIR-04 popup and local tools reuse capture/Passport owners while matching shared theme and narrow-layout contracts in source and built release Chrome',{timeout:300000},async()=>{
 let source;try{source=await FakeChatGPT.start({onboarding:true});await sourceJourney(source);}finally{await source?.close();}
 await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});
 let release;try{release=await FakeChatGPT.start({extensionPath:'work/current-release',onboarding:true});await releaseJourney(release);}finally{await release?.close();}
});
