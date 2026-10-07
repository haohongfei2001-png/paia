import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {chooseConsumerGroup,rpc,scaleText} from './harness/settings-consumer-presentation.mjs';
import {settingsAboutStatusEvidence} from './harness/settings-about-status.mjs';
const directory='work/qa-dvn-settings-touch-diagnostic';
const device=page=>page.evaluate(()=>({coarse:matchMedia('(pointer:coarse)').matches,anyCoarse:matchMedia('(any-pointer:coarse)').matches,maxTouchPoints:navigator.maxTouchPoints}));
for(const variant of ['source','release'])test(`Settings native touch-device diagnosis and independent About owner evidence (${variant})`,{timeout:120000},async()=>{
 if(variant==='release')execFileSync('python3',['scripts/build_current_release.py'],{stdio:'pipe'});
 const h=await FakeChatGPT.start({onboarding:true,hasTouch:true,...(variant==='release'?{extensionPath:'work/current-release'}:{})}),page=h.archive;await mkdir(directory,{recursive:true});
 const receipt={head:process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),variant,scope:'DIAGNOSTIC_ONLY; does not replace the four-file nine-case Settings gate',trials:[],aboutResult:'NOT_RUN',aboutRows:[]};const persist=()=>writeFile(`${directory}/${variant}.json`,JSON.stringify(receipt,null,2));let cdp;const deadline=async(phase,run)=>{receipt.phase=phase;await persist();let timer;try{return await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Diagnostic acknowledgement timed out: '+phase)),10000);})]);}finally{clearTimeout(timer);}};const command=(method,params={})=>deadline(method,()=>cdp.send(method,params));
 try{
  const enable=page.locator('#enable-consent');await enable.waitFor();await eventually(async()=>!await enable.isDisabled());await enable.click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented);if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();await page.setViewportSize({width:1440,height:900});await page.locator('.sidebar-bottom [data-view="settings"]').click();await page.locator('#settings-panel').waitFor();cdp=await h.context.newCDPSession(page);receipt.browser=await command('Browser.getVersion');
  receipt.phase='independent-about';await persist();receipt.aboutRows=await settingsAboutStatusEvidence(page,{chooseGroup:chooseConsumerGroup,rpc,scaleText,directory,variant});assert.equal(receipt.aboutRows.length,8);receipt.aboutResult='PASS';assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);await persist();await page.setViewportSize({width:1440,height:900});
  for(const mode of ['playwright-touchscreen','dispatch-touch']){
   const trial={mode};receipt.trials.push(trial);
   try{
    await chooseConsumerGroup(page,'reading');if(mode==='dispatch-touch')await command('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
    const control=page.locator('[data-settings-group="content"]');await control.scrollIntoViewIfNeeded();trial.before=await device(page);trial.point=await control.evaluate(node=>{const r=node.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height};});assert.equal(trial.before.coarse,true);assert.equal(trial.before.maxTouchPoints,1);assert.ok(trial.point.width>=44&&trial.point.height>=44);
    await page.evaluate(()=>{globalThis.__touchDiagnostic=[];globalThis.__touchDiagnosticListener=event=>{if(event.target.closest?.('[data-settings-group="content"]'))__touchDiagnostic.push({type:event.type,trusted:event.isTrusted,pointerType:event.pointerType});};for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,__touchDiagnosticListener,true);});
    const {x,y}=trial.point;if(mode==='dispatch-touch'){await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await deadline('Playwright.touchscreen.tap',()=>page.touchscreen.tap(x,y));}
    trial.events=await page.evaluate(()=>__touchDiagnostic);trial.after=await device(page);trial.afterBox=await control.evaluate(node=>{const r=node.getBoundingClientRect();return{width:r.width,height:r.height,minHeight:getComputedStyle(node).minHeight};});assert.deepEqual(trial.events.map(event=>event.type),['pointerdown','pointerup','click']);for(const event of trial.events){assert.equal(event.trusted,true);assert.equal(event.pointerType,'touch');}assert.equal(trial.after.coarse,true);assert.equal(trial.after.maxTouchPoints,1);assert.ok(trial.afterBox.width>=44&&trial.afterBox.height>=44);assert.equal(await page.locator('[data-group="content"]').isVisible(),true);trial.result='PASS';
   }catch(error){trial.result='FAIL';trial.error=error.message;}
   finally{await page.evaluate(()=>{for(const type of ['pointerdown','pointerup','click'])document.removeEventListener(type,globalThis.__touchDiagnosticListener,true);delete globalThis.__touchDiagnosticListener;delete globalThis.__touchDiagnostic;});await persist();}
  }
  assert.ok(receipt.trials.some(trial=>trial.result==='PASS'),'no stable native touch device mode was established');
 }finally{await persist();await cdp?.detach();await h.close();}
});
