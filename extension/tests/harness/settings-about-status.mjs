import assert from 'node:assert/strict';
import {eventually} from './fake-chatgpt.mjs';

export async function settingsAboutStatusEvidence(page,{chooseGroup,rpc,scaleText,directory,variant}){
 const key='paia-consumer-update:v1',saved=await page.evaluate(key=>chrome.storage.local.get(key),key),version=await page.evaluate(()=>chrome.runtime.getManifest().version),target=version.split('.').map(Number);target[0]++;const targetVersion=target.join('.'),rows=[];
 try{
  await scaleText(page,1);await page.setViewportSize({width:320,height:900});await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});
  for(const language of ['zh-CN','en']){
   await rpc(page,'UPDATE_PREFERENCES',{changes:{language}});await eventually(()=>page.evaluate(language=>document.documentElement.lang===language,language));await scaleText(page,2);
   for(const state of ['unknown','available','installed']){
    await page.evaluate(({key,state,version,targetVersion})=>chrome.storage.local.set({[key]:state==='unknown'?{state:'invalid'}:{state,fromVersion:state==='available'?version:null,toVersion:state==='available'?targetVersion:version,at:Date.now()}}),{key,state,version,targetVersion});await chooseGroup(page,'about');
    const status=page.locator('#settings-update-status');await eventually(async()=>await status.getAttribute('aria-busy')==='false');const text=await status.textContent();assert.match(text,state==='available'?new RegExp(targetVersion.replaceAll('.','\\.')):state==='installed'?/安装完成|version installed/:/尚无可确认|No confirmed/);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=2);assert.equal(await page.locator('#settings-about-feedback').getAttribute('href'),'mailto:haohongfei2001@gmail.com');rows.push({language,state,text});await page.screenshot({path:`${directory}/${variant}-about-${state}-320-dark-${language}-2x.png`,fullPage:true});
   }
   await scaleText(page,1);
  }
  await page.evaluate(()=>{globalThis.__set2AboutSend=chrome.runtime.sendMessage.bind(chrome.runtime);chrome.runtime.sendMessage=message=>message.type==='PAIA_SETTINGS_UPDATE_STATUS'?Promise.resolve({ok:false,error:'STORAGE_FAILED'}):__set2AboutSend(message);});
  try{for(const language of ['zh-CN','en']){await rpc(page,'UPDATE_PREFERENCES',{changes:{language}});await eventually(()=>page.evaluate(language=>document.documentElement.lang===language,language));await scaleText(page,2);await chooseGroup(page,'reading');await chooseGroup(page,'about');await eventually(async()=>/暂时无法读取|Could not read/.test(await page.locator('#settings-update-status').textContent()));assert.equal(await page.locator('#settings-update-status').isVisible(),true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=2);rows.push({language,state:'read-error',text:await page.locator('#settings-update-status').textContent()});await page.screenshot({path:`${directory}/${variant}-about-read-error-320-dark-${language}-2x.png`,fullPage:true});await scaleText(page,1);}}
  finally{await page.evaluate(()=>{chrome.runtime.sendMessage=__set2AboutSend;delete globalThis.__set2AboutSend;});}
  return rows;
 }finally{await scaleText(page,1);await page.evaluate(({key,saved})=>Object.hasOwn(saved,key)?chrome.storage.local.set(saved):chrome.storage.local.remove(key),{key,saved});}
}
