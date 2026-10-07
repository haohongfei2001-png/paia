import {chooseConsumerGroup as chooseGroup} from './harness/settings-consumer-presentation.mjs';
import {settingsReadingSafety} from './harness/settings-reading-safety.mjs';
import {measureSettingsGeometry,materializeSettingsBaseline,captureSettingsBaseline,compareD5Settings} from './harness/d5-settings-presentation.mjs';
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
async function consentAndRefreshOrder(page){
 const refused=await page.evaluate(()=>chrome.runtime.sendMessage({type:'PAIA_ARCHIVE_ORDER_PREFERENCE'}));
 assert.equal(refused.ok,false);assert.equal(refused.error,'CONSENT_REQUIRED','real worker still refuses before consent');
 await page.evaluate(()=>{
  const send=chrome.runtime.sendMessage.bind(chrome.runtime);window.__uir04OrderCalls=[];window.__uir04OrderOwner=document.getElementById('archive-order-mode');window.__uir04RestoreOrderSend=()=>{chrome.runtime.sendMessage=send;};
  chrome.runtime.sendMessage=async message=>{if(message.type==='PAIA_ARCHIVE_ORDER_PREFERENCE')window.__uir04OrderCalls.push({...message});return send(message);};
 });
 try{
  await consent(page);
  await eventually(async()=>/使用 PAIA 稳定顺序/.test(await page.locator('#archive-order-status').textContent()),'confirmed consent refreshes archive order automatically without reload or manual choice');
  const proof=await page.evaluate(()=>({calls:window.__uir04OrderCalls,sameOwner:window.__uir04OrderOwner===document.getElementById('archive-order-mode'),mode:document.getElementById('archive-order-mode').value}));
  assert.ok(proof.calls.length>0,'the successful state follows a real preference read');assert.ok(proof.calls.every(message=>Object.keys(message).length===1&&message.type==='PAIA_ARCHIVE_ORDER_PREFERENCE'),'automatic recovery only reads the preference');assert.equal(proof.sameOwner,true);assert.equal(proof.mode,'paia');
 }finally{await page.evaluate(()=>{window.__uir04RestoreOrderSend();delete window.__uir04RestoreOrderSend;delete window.__uir04OrderCalls;delete window.__uir04OrderOwner;});}
}
async function openSettings(page){await page.locator('.sidebar-bottom [data-view="settings"]').click();await eventually(()=>page.locator('#settings-panel').isVisible(),'Settings opens');}

async function shot(page,name){await mkdir('work/ux-r6',{recursive:true});await page.screenshot({path:`work/ux-r6/${name}.png`,fullPage:true});}
async function assertOwner(page,selector,key){const count=await page.locator(selector).count();assert.equal(count,1,`${selector} keeps one DOM owner`);assert.equal(await page.locator(selector).evaluate(el=>el.closest('.ux-settings-group')?.dataset.group),key,`${selector} projects into ${key}`);}
async function assertNoNetwork(h){assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);}

async function sourceJourney(h){
 const page=h.archive;await consentAndRefreshOrder(page);await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light',readingWidth:'wide'}});await page.setViewportSize({width:1440,height:900});await openSettings(page);
 assert.equal(await page.locator('h1:visible').count(),1);const boxes=await measureSettingsGeometry(page);assert.ok(Math.abs(boxes.nav-196)<=2);assert.ok(Math.abs(boxes.body-680)<=2);assert.ok(Math.abs(boxes.horizontalGap-44)<=2);assert.equal(await page.locator('#ux-settings-group-switch').count(),0);assert.equal(await page.locator('.ux-settings-nav>[data-settings-group]:visible').count(),6);
 for(const [selector,key]of [['#toggle-capture','content'],['#smart-filter-settings','content'],['#history-settings','data'],['#ux-appearance','reading'],['#ux-language','reading'],['#ux-font-size','reading'],['#ux-reading-width','reading'],['#time-display','reading'],['#settings-ai-context','ai'],['#memory-settings','ai'],['#r6-hide-content-previews','privacy'],['#backup-settings','data'],['#manage-excluded','data'],['#legacy-entry','data'],['#library-management','data'],['#product-diagnostics','data']])await assertOwner(page,selector,key);
 assert.equal(await page.locator('#reader-revisit-settings').evaluate(node=>node.parentElement.id),'revisit-panel');for(const selector of ['#time-emphasis','#prune-revisions','#thought-reverse-edit','[data-group="advanced"]','#diagnostics','#deepseek-settings','#library-updates','#library-updates-drawer','#backup-create','#r6-complete-export'])assert.equal(await page.locator(selector).count(),0);assert.equal(await page.locator('[data-group="data"] [data-view="archive"]').count(),1);await shot(page,'set2-content-1440-light');
 await chooseGroup(page,'reading');const width=page.locator('#ux-reading-width');assert.equal(await width.inputValue(),'wide');await page.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__uir04Send=send;chrome.runtime.sendMessage=async message=>message.type==='UPDATE_PREFERENCES'&&message.changes?.readingWidth==='narrow'?{ok:false,error:'STORAGE_FAILED'}:send(message);});await width.selectOption('narrow');await eventually(async()=>await page.locator('#ux-settings-feedback').getAttribute('data-kind')==='error');assert.equal(await width.inputValue(),'wide');assert.equal((await rpc(page,'GET_PAGE',{page:{view:'settings'}})).preferences.readingWidth,'wide');await page.evaluate(()=>{chrome.runtime.sendMessage=__uir04Send;delete globalThis.__uir04Send;});
 await page.locator('#ux-language').selectOption('en');await eventually(()=>page.evaluate(()=>document.documentElement.lang==='en'));assert.deepEqual(await page.locator('.ux-settings-nav button span').allTextContents(),['Input Archive','Reading & appearance','AI & prompts','Privacy & access','Data & recovery','About PAIA']);await page.locator('#ux-language').selectOption('zh-CN');await eventually(()=>page.evaluate(()=>document.documentElement.lang==='zh-CN'));
 await rpc(page,'SET_ENABLED',{enabled:false});await page.reload();await page.locator('#settings-panel').waitFor();assert.equal((await rpc(page,'GET_STATUS')).enabled,false);await chooseGroup(page,'content');assert.equal(await page.locator('#toggle-capture').getAttribute('aria-checked'),'false');
 await page.setViewportSize({width:390,height:844});await chooseGroup(page,'privacy');await page.evaluate(()=>globalThis.__privacyOwner=document.getElementById('r6-hide-content-previews'));await chooseGroup(page,'data');await chooseGroup(page,'privacy');assert.equal(await page.evaluate(()=>__privacyOwner===document.getElementById('r6-hide-content-previews')),true);assert.equal(await page.locator('#ux-settings-group-back').isVisible(),true);assert.equal(await page.locator('.ux-settings-nav').isVisible(),false);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=2);await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});await eventually(()=>page.evaluate(()=>document.documentElement.dataset.paiaTheme==='dark'));await shot(page,'set2-privacy-390-dark');
 await page.setViewportSize({width:1440,height:900});await rpc(page,'SET_ENABLED',{enabled:true});await settingsReadingSafety(h);await assertNoNetwork(h);
}
async function releaseJourney(h){
 const page=h.archive;await consentAndRefreshOrder(page);await page.setViewportSize({width:1440,height:900});await openSettings(page);const geometry=await measureSettingsGeometry(page);assert.ok(Math.abs(geometry.nav-196)<=2&&Math.abs(geometry.body-680)<=2&&Math.abs(geometry.horizontalGap-44)<=2);await assertOwner(page,'#r6-hide-content-previews','privacy');assert.equal(await page.locator('#r6-complete-export,#filter-advanced').count(),0);await page.setViewportSize({width:390,height:844});await chooseGroup(page,'data');assert.equal(await page.locator('#ux-settings-group-back').isVisible(),true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=2);await shot(page,'set2-release-data-390');await page.setViewportSize({width:1440,height:900});await settingsReadingSafety(h);await assertNoNetwork(h);
}

test('UIR-04 Settings keeps one six-group owner projection with the adopted directory and compact Back flow in source and built release Chrome',{timeout:300000},async()=>{
 let source;try{source=await FakeChatGPT.start({onboarding:true});await sourceJourney(source);}finally{await source?.close();}
 await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});
 let release;try{release=await FakeChatGPT.start({extensionPath:'work/current-release',onboarding:true});await releaseJourney(release);}finally{await release?.close();}
});


// Before evidence executes the exact adopted source, retaining the old geometry contract.
test('D5 S01 records adopted Settings geometry before its presentation replacement',{timeout:120000},async()=>{
 const extensionPath=await materializeSettingsBaseline();let h;
 try{h=await FakeChatGPT.start({extensionPath,onboarding:true});const page=h.archive;await consent(page);await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});await eventually(()=>page.evaluate(()=>document.documentElement.lang==='zh-CN'&&document.documentElement.dataset.paiaTheme==='light'));await page.setViewportSize({width:1440,height:900});await openSettings(page);await captureSettingsBaseline(h);await assertNoNetwork(h);}
 finally{await h?.close();}
});
for(const variant of ['source','release'])test(`D5 S01 Settings preserves six group owners with paired reading-column, keyboard and reflow evidence (${variant})`,{timeout:240000},async()=>{
 if(variant==='release')await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});
 let h;try{h=await FakeChatGPT.start({...(variant==='release'?{extensionPath:'work/current-release'}:{}),onboarding:true});const page=h.archive;await consent(page);await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});await eventually(()=>page.evaluate(()=>document.documentElement.lang==='zh-CN'&&document.documentElement.dataset.paiaTheme==='light'));await page.setViewportSize({width:1440,height:900});await openSettings(page);await compareD5Settings(h,variant);await assertNoNetwork(h);}
 finally{await h?.close();}
});
