import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join,isAbsolute} from 'node:path';
import {FakeChatGPT,eventually} from '../harness/fake-chatgpt.mjs';
import {rpc,chooseConsumerGroup,scaleText,verifyIndependentSettingsJourneys} from '../harness/settings-consumer-presentation.mjs';
// Explicit supplemental acceptance, not a replacement for the original complete
// Settings parent or its still-required headed touch qualification.
for(const variant of ['source','release'])test('Settings independent original directory/history/control/About/style journeys '+variant,{timeout:180000},async()=>{
 const directory='work/qa-settings-independent',head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();await mkdir(directory,{recursive:true});
 let h;const receipt={head,variant,scope:'independent-original-post-touch-journeys',fullSettings:false,touchQualification:false,result:'IN_PROGRESS',interactions:[]};
 try{
  const release=process.env.PAIA_NATIVE_RELEASE_PATH;if(variant==='release')assert.equal(isAbsolute(release||''),true,'explicit previously built release required');
  h=await FakeChatGPT.start({...(variant==='release'?{extensionPath:release}:{}),onboarding:true});const page=h.archive;
  const action=page.locator('#enable-consent');await action.waitFor({state:'visible'});await eventually(async()=>!await action.isDisabled());await action.click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true);if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();
  await page.locator('.sidebar-bottom [data-view="settings"]').click();await page.locator('#settings-panel').waitFor();
  await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'dark',language:'en',fontSize:'xlarge'}});await eventually(()=>page.evaluate(()=>document.documentElement.lang==='en'&&document.documentElement.dataset.paiaTheme==='dark'));await scaleText(page,1);await page.setViewportSize({width:320,height:900});await chooseConsumerGroup(page,'reading');
  // Re-establish the exact visible failure prerequisite through the original UI.
  // No touch success or preceding layout matrix is fabricated for this profile.
  const before=(await rpc(page,'GET_PAGE',{page:{view:'settings'}})).preferences.readingWidth,attempt=before==='narrow'?'wide':'narrow';
  await page.evaluate(attempt=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__independentSettingsSend=send;chrome.runtime.sendMessage=message=>message.type==='UPDATE_PREFERENCES'&&message.changes?.readingWidth===attempt?Promise.resolve({ok:false,error:'STORAGE_FAILED'}):send(message);},attempt);
  try{await page.locator('#ux-reading-width').selectOption(attempt);await eventually(async()=>await page.locator('#ux-settings-feedback').getAttribute('data-kind')==='error');assert.equal(await page.locator('#ux-reading-width').inputValue(),before);assert.equal((await rpc(page,'GET_PAGE',{page:{view:'settings'}})).preferences.readingWidth,before);}finally{await page.evaluate(()=>{chrome.runtime.sendMessage=__independentSettingsSend;delete globalThis.__independentSettingsSend;});}
  await verifyIndependentSettingsJourneys(h,{variant,directory,head,interactions:receipt.interactions});
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);receipt.network={models:0,extension:0,external:0};receipt.result='PASS';
 }catch(error){receipt.result='FAIL';receipt.error=error.message;throw error;}finally{await writeFile(join(directory,variant+'.json'),JSON.stringify(receipt,null,2));await h?.close();}
});
