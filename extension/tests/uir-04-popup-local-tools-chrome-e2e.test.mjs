import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
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

// Computed presentation belongs to the real popup document, including when
// inspected through Chrome's native action Window. No replacement tab is used.
function popupPresentation(native=false){
 const w=native?chrome.extension.getViews({type:'popup'}).find(view=>view.location.pathname==='/ui/popup.html'):window;
 if(!w)throw Error('Native action popup closed before presentation inspection');
 const d=w.document,style=selector=>w.getComputedStyle(d.querySelector(selector)),rect=selector=>{const r=d.querySelector(selector).getBoundingClientRect();return {width:r.width,height:r.height,top:r.top,bottom:r.bottom};};
 const logo=d.querySelector('header img'),summary=d.querySelector('#update-details > summary'),glyph=summary.querySelector('svg[data-paia-icon="chevron-right"]'),disclosure=w.getComputedStyle(glyph);
 return {theme:d.documentElement.dataset.paiaTheme,font:style('body').fontFamily,canvas:style('body').backgroundColor,text:style('body').color,secondary:style('.count > span').color,primary:style('#open-archive').backgroundColor,onPrimary:style('#open-archive').color,pause:style('#toggle-capture').backgroundColor,pauseHovered:d.querySelector('#toggle-capture').matches(':hover:not(:disabled)'),update:style('body').backgroundColor,line:style('.update-status').borderTopColor,controlRadius:style('#open-archive').borderRadius,
  logo:{source:logo?.getAttribute('src'),loaded:!!logo?.complete&&logo.naturalWidth===32,width:logo?.width,height:logo?.height,decorative:logo?.getAttribute('alt')===''},
  disclosure:{width:disclosure.width,height:disclosure.height,stroke:glyph.getAttribute('stroke-width'),hidden:glyph.getAttribute('aria-hidden'),focusable:glyph.getAttribute('focusable'),path:glyph.querySelector('path').getAttribute('d'),transform:disclosure.transform},summary:rect('#update-details > summary'),primaryRect:rect('#open-archive'),updateRect:rect('.update-status'),order:[...d.querySelectorAll('main details')].map(details=>details.id),retired:d.querySelectorAll('#popup-internal-tools,#prompt-reuse-diagnostics').length};
}
function assertPopupPresentation(value,theme){
 const palette=theme==='dark'?{canvas:'rgb(23, 29, 40)',text:'rgb(232, 237, 247)',secondary:'rgb(176, 189, 208)',primary:'rgb(148, 186, 255)',onPrimary:'rgb(23, 29, 40)',update:'rgb(23, 29, 40)',line:'rgb(48, 59, 76)'}:{canvas:'rgb(255, 255, 255)',text:'rgb(23, 35, 60)',secondary:'rgb(99, 114, 138)',primary:'rgb(35, 93, 211)',onPrimary:'rgb(255, 255, 255)',update:'rgb(255, 255, 255)',line:'rgb(230, 235, 242)'};
 assert.equal(value.theme,theme);
 for(const [role,color] of Object.entries(palette))assert.equal(value[role],color,`${theme} popup uses the D6.2 ${role} role`);
 assert.equal(value.pause,value.pauseHovered?(theme==='dark'?'rgb(32, 41, 57)':'rgb(244, 246, 250)'):palette.canvas,'pause remains a secondary control, including its quiet hover state');
 assert.match(value.font,/Noto Sans CJK SC.*PingFang SC.*Microsoft YaHei.*system-ui/,'popup shares the main UI font stack');
 assert.deepEqual(value.logo,{source:'assets/paia-logo-32.png',loaded:true,width:32,height:32,decorative:true},'the compact header uses the actual existing PAIA logo');
 assert.equal(value.controlRadius,'6px','buttons share the main UI control shape');
 assert.equal(value.disclosure.width,'18px');assert.equal(value.disclosure.height,'18px');assert.equal(value.disclosure.stroke,'1.4');assert.equal(value.disclosure.hidden,'true');assert.equal(value.disclosure.focusable,'false');assert.equal(value.disclosure.path,'M6 4l5 5-5 5');
 assert.ok(value.summary.height>=40,'diagnostics remain a usable disclosure target');
 assert.ok(value.primaryRect.height>=44&&value.primaryRect.bottom<=value.updateRect.top,'the main action precedes the quieter update section');
 assert.deepEqual(value.order,['update-details'],'only on-demand update help remains');assert.equal(value.retired,0);
}

async function popupJourney(h){
 const archive=h.archive;await consent(archive);const popup=await openExtensionPage(h,'popup.html',{width:350,height:600});popup.on('pageerror',e=>h.errors.push(e.message));
 await eventually(()=>popup.locator('#record-count').textContent().then(x=>x==='0'));
 await popup.locator('#toggle-capture').click();await eventually(async()=>(await rpc(popup,'GET_STATUS')).enabled===false);await popup.locator('#toggle-capture').click();await eventually(async()=>(await rpc(popup,'GET_STATUS')).enabled===true);
 await popup.locator('#update-details > summary').focus();await popup.keyboard.press('Enter');assert.equal(await popup.locator('#update-details').getAttribute('open'),'');await popup.keyboard.press('Enter');assert.equal(await popup.locator('#update-details').getAttribute('open'),null);
 for(const appearance of ['light','dark']){await rpc(archive,'UPDATE_PREFERENCES',{changes:{appearance}});await popup.reload();await eventually(()=>popup.evaluate(a=>document.documentElement.dataset.paiaTheme===a,appearance));for(const width of [350,320]){await popup.setViewportSize({width,height:600});await assertNoOverflow(popup,'popup '+width);assertPopupPresentation(await popup.evaluate(popupPresentation),appearance);await shot(popup,'consumer-popup-'+width+'-'+appearance);}}
 await popup.evaluate(()=>{chrome.tabs.create=async()=>{throw Error('SYNTHETIC tab unavailable');};});await popup.locator('#open-archive').click();await eventually(()=>popup.locator('#error').isVisible());assert.match(await popup.locator('#error').textContent(),/不可用|无法|稍后/);assert.deepEqual(h.errors,[],'tabs.create failure is shown without ReferenceError');
 const denied=await popup.evaluate(async()=>{try{const response=await fetch(chrome.runtime.getURL('ui/product-signals.html'));return !response.ok;}catch{return true;}});assert.equal(denied,true,'retired dedicated dashboard is absent from actual runtime');await popup.close();await assertNoNetwork(h);
}

test('UIR-04 popup keeps compact capture, accessible help and honest failure feedback with retired tools absent in source/release',{timeout:300000},async()=>{
 const releaseRoot=await mkdtemp(join(tmpdir(),'paia-popup-release-'));
 try{
  const releasePath=join(releaseRoot,'release');
  await execFileAsync('python3',['scripts/build_current_release.py',releasePath],{cwd:process.cwd(),maxBuffer:16*1024*1024});
  for(const extensionPath of ['.',releasePath]){const h=await FakeChatGPT.start({extensionPath,onboarding:true,headless:true});try{await popupJourney(h);}finally{await h.close();}}
 }finally{await rm(releaseRoot,{recursive:true,force:true});}
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
 h.nativePopupTarget=targets[0];
 for(const page of h.context.pages())assert.equal(page.viewportSize(),null,'native popup and existing pages retain disabled viewport emulation');
 assert.equal(await p.evaluate(async()=>{const url=chrome.runtime.getURL('ui/popup.html');return (await chrome.tabs.query({})).filter(tab=>tab.url===url).length;}),0,'native popup is not a tabs.create/newPage substitute');
 return p;
}
async function nativePopupSnapshot(p){return p.evaluate(()=>{
 const w=chrome.extension.getViews({type:'popup'}).find(view=>view.location.pathname==='/ui/popup.html');
 if(!w)throw Error('Native action popup closed before inspection');
 const d=w.document,rect=id=>{const r=d.querySelector(id).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
 return {url:w.location.href,devicePixelRatio:w.devicePixelRatio,scrollY:w.scrollY,scrollHeight:d.documentElement.scrollHeight,helpOpen:!!d.querySelector('#update-details')?.open,helpText:rect('#update-details p'),width:w.innerWidth,clientWidth:d.documentElement.clientWidth,scrollbarGutter:w.innerWidth-d.documentElement.clientWidth,height:w.innerHeight,bodyWidth:d.body.getBoundingClientRect().width,overflow:d.documentElement.scrollWidth-d.documentElement.clientWidth,count:d.querySelector('#record-count').textContent,label:rect('.count > span'),background:w.getComputedStyle(d.body).backgroundColor,consent:d.querySelector('#first-use').hidden,toggleHidden:d.querySelector('#toggle-capture').hidden,toggleText:d.querySelector('#toggle-capture').textContent,active:d.querySelector('#status-dot').classList.contains('active'),action:rect('#open-archive')};
 });}
async function closeNativePopup(p){await p.evaluate(()=>{for(const view of chrome.extension.getViews({type:'popup'}))view.close();});await eventually(()=>p.evaluate(()=>chrome.extension.getViews({type:'popup'}).length===0),'native action popup closes');}
const nativeArtifactDir='work/bounded-popup';
const errorDetails=error=>({name:error?.name||'Error',message:String(error?.message||error),stack:error?.stack||null});
const artifactJSON=(name,data)=>writeFile(`${nativeArtifactDir}/${name}.json`,JSON.stringify(data,null,2)+'\n');

// Opt-in hosted evidence only: one raw Xvfb frame includes Chrome's own toolbar.
// The existing popup target screenshots remain the functional/geometry evidence.
async function captureNativeBrowserFrame(h){
 assert.equal(process.env.CI,'1','whole-window capture is limited to the synthetic hosted fixture');
 assert.equal(process.platform,'linux');assert.ok(process.env.DISPLAY,'the existing Xvfb display is required');
 const display=await h.archive.evaluate(()=>({width:screen.width,height:screen.height,pixelRatio:devicePixelRatio,icons:chrome.runtime.getManifest().action.default_icon}));
 const report={status:'PENDING',kind:'synthetic-hosted-browser-window',headSha:h.nativeEvidenceHead,viewportEmulation:null,display,file:'native-browser-window-active.png'};
 await artifactJSON('native-browser-window-active',report);
 try{
  await execFileAsync('/usr/bin/import',['-window','root',`${nativeArtifactDir}/${report.file}`],{timeout:5000});
  const png=await readFile(`${nativeArtifactDir}/${report.file}`);
  assert.ok(png.length>24&&png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
  assert.equal(png.readUInt32BE(16),display.width);assert.equal(png.readUInt32BE(20),display.height);
  report.status='captured';report.bytes=png.length;await artifactJSON('native-browser-window-active',report);return report;
 }catch(error){report.status='FAIL';report.error=errorDetails(error);await artifactJSON('native-browser-window-active',report);throw error;}
}

// Public Playwright CDPSession.send cannot address an arbitrary target session
// directly. This documented nested CDP transport handles popup targets that
// Playwright does not expose as a Page; it never creates a replacement tab.
// https://chromedevtools.github.io/devtools-protocol/tot/Target/#method-attachToTarget
// https://chromedevtools.github.io/devtools-protocol/tot/Target/#method-sendMessageToTarget
// https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-captureScreenshot
async function screenshotNativeTarget(cdp,targetId){
 const {sessionId}=await cdp.send('Target.attachToTarget',{targetId,flatten:false});
 const pending=new Map();let nextId=0;
 const receive=event=>{
  if(event.sessionId!==sessionId)return;
  let response;try{response=JSON.parse(event.message);}catch{return;}
  const entry=pending.get(response.id);if(!entry)return;
  pending.delete(response.id);clearTimeout(entry.timer);
  if(response.error)entry.reject(new Error(`${entry.method}: ${response.error.code} ${response.error.message}`));
  else entry.resolve(response.result);
 };
 const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++nextId,timer=setTimeout(()=>{pending.delete(id);reject(new Error(`${method}: native target response timed out after 5000ms`));},5000);
  pending.set(id,{resolve,reject,timer,method});
  void cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id,method,params})}).catch(error=>{
   const entry=pending.get(id);if(!entry)return;pending.delete(id);clearTimeout(timer);reject(error);
  });
 });
 cdp.on('Target.receivedMessageFromTarget',receive);
 try{
  const result=await send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
  if(!result?.data)throw Error('Page.captureScreenshot returned no PNG data for the native action target');
  return Buffer.from(result.data,'base64');
 }finally{
  cdp.removeListener('Target.receivedMessageFromTarget',receive);
  for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(Error('Native screenshot session detached'));}
  pending.clear();await cdp.send('Target.detachFromTarget',{sessionId}).catch(()=>{});
 }
}
async function captureNativeEvidence(h,name,{countEvidence='real-extension-state',failure=null}={}){
 await mkdir(nativeArtifactDir,{recursive:true});
 const report={kind:'native-action-popup',state:name,capturedAt:new Date().toISOString(),headSha:h.nativeEvidenceHead,expectedHeadSha:process.env.PAIA_TESTED_HEAD||null,viewportEmulation:null,countEvidence,failure,screenshot:{status:'pending'}};
 // Write metadata before screenshot/geometry assertions so failure keeps evidence.
 await artifactJSON(name,report);
 try{
  report.geometry=await nativePopupSnapshot(h.archive);
  report.presentation=await h.archive.evaluate(popupPresentation,true);
  const targets=(await h.cdp.send('Target.getTargets')).targetInfos;
  const target=targets.find(item=>item.targetId===h.nativePopupTarget?.targetId&&item.url===report.geometry.url);
  if(!target)throw Error('NATIVE_POPUP_TARGET_MISSING: actual action target is unavailable; no ordinary-tab fallback is allowed');
  report.target={targetId:target.targetId,type:target.type,url:target.url};
  const attempts=[];let png,method;
  const page=h.context.pages().find(candidate=>candidate.url()===target.url);
  if(page){
   let session;
   try{
    assert.equal(page.viewportSize(),null,'actual popup Page has no emulated viewport');
    session=await h.context.newCDPSession(page);
    const actual=await session.send('Target.getTargetInfo');
    assert.equal(actual.targetInfo.targetId,target.targetId,'screenshot Page is the verified action target');
    png=await page.screenshot({type:'png',fullPage:false,timeout:5000});method='Playwright Page.screenshot (verified native target)';
   }catch(error){attempts.push({method:'Playwright Page.screenshot',error:errorDetails(error)});}
   finally{await session?.detach().catch(()=>{});}
  }
  if(!png){
   try{png=await screenshotNativeTarget(h.cdp,target.targetId);method='CDP Page.captureScreenshot (verified native target)';}
   catch(error){attempts.push({method:'CDP Page.captureScreenshot',error:errorDetails(error)});report.screenshot={status:'unsupported-or-failed',attempts};throw Error('NATIVE_POPUP_SCREENSHOT_UNAVAILABLE: '+attempts.map(attempt=>`${attempt.method}: ${attempt.error.message}`).join('; '));}
  }
  assert.ok(png.length>24&&png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'native capture contains PNG bytes');
  const file=`${name}.png`;await writeFile(`${nativeArtifactDir}/${file}`,png);
  report.screenshot={status:'captured',file,method,width:png.readUInt32BE(16),height:png.readUInt32BE(20),bytes:png.length,attempts};
  report.geometryAfterCapture=await nativePopupSnapshot(h.archive);
  await artifactJSON(name,report);return report;
 }catch(error){report.error=errorDetails(error);if(report.screenshot.status==='pending')report.screenshot.status='failed';await artifactJSON(name,report);throw error;}
}

function assertNativeGeometry(value,label){
 assert.ok(Math.abs(value.clientWidth-350)<=2,label+' native usable viewport keeps intrinsic 350px width: '+JSON.stringify(value));
 assert.ok(value.scrollbarGutter>=0,label+' reports a nonnegative native scrollbar gutter');
 assert.ok(Math.abs(value.width-(350+value.scrollbarGutter))<=2,label+' layout width allows only the measured native scrollbar gutter');
 assert.equal(value.bodyWidth,350);assert.ok(value.label.width>=132,label+' count label stays readable');
 assert.ok(value.overflow<=2,label+' has no horizontal overflow');
 assert.ok(value.action.width>=260&&value.action.height>=42,label+' primary action remains usable');
}

test('Bounded native action popup has intrinsic width, readable count labels and reachable update help',{timeout:90000},async()=>{
 let h,headSha=null,nativeBrowserFrame=null;const states=[];let currentState='startup';
 await mkdir(nativeArtifactDir,{recursive:true});
 try{
  headSha=(await execFileAsync('git',['rev-parse','HEAD'],{cwd:process.cwd()})).stdout.trim();
  assert.match(headSha,/^[a-f0-9]{40}$/,'native evidence uses an exact Git commit');
  await artifactJSON('acceptance',{status:'RUNNING',headSha,states});
  if(process.env.PAIA_TESTED_HEAD)assert.equal(headSha,process.env.PAIA_TESTED_HEAD,'checked-out HEAD must match the requested native-popup test head');
  h=await FakeChatGPT.start({onboarding:true,headless:false,viewport:null});h.nativeEvidenceHead=headSha;
  const p=h.archive;await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:'light',language:'zh-CN'}});
  const capture=async(name,options)=>{currentState=name;const report=await captureNativeEvidence(h,name,options);states.push({name,screenshot:report.screenshot.file,geometry:report.geometry,presentation:report.presentation,target:report.target,countEvidence:report.countEvidence});assertPopupPresentation(report.presentation,'light');return report.geometry;};
  currentState='unconsented';await openNativePopup(h);let value=await capture(currentState);assertNativeGeometry(value,'unconsented');assert.equal(value.count,'0');assert.equal(value.consent,false);assert.equal(value.toggleHidden,true);assert.equal(value.active,false);assert.equal(value.background,'rgb(255, 255, 255)');await closeNativePopup(p);
  currentState='active';await consent(p);await openNativePopup(h);value=await capture(currentState);assertNativeGeometry(value,'active');assert.equal(value.active,true);assert.equal(value.toggleHidden,false);assert.match(value.toggleText,/暂停/);
  if(process.env.PAIA_NATIVE_BROWSER_FRAME==='1')nativeBrowserFrame=await captureNativeBrowserFrame(h);
  currentState='paused';await p.evaluate(()=>chrome.extension.getViews({type:'popup'})[0].document.querySelector('#toggle-capture').click());
  await eventually(async()=>(await rpc(p,'GET_STATUS')).enabled===false,'native popup pauses through real handler');
  await eventually(async()=>(await nativePopupSnapshot(p)).active===false,'native popup paints paused state');value=await capture(currentState);assertNativeGeometry(value,'paused');assert.match(value.toggleText,/恢复/);
  // Presentation stress only: actual capture/count correctness is covered by
  // the real zero above and capture suites. Do not seed thousands of records
  // merely to test the width of formatted digits in this native popup.
  for(const [name,count] of [['count-2545','2,545'],['count-large','9,999,999,999,999']]){
   currentState=name;await p.evaluate(count=>{chrome.extension.getViews({type:'popup'})[0].document.querySelector('#record-count').textContent=count;},count);
   value=await capture(name,{countEvidence:'DOM presentation stress only; archive count remains zero'});assert.equal(value.count,count);assertNativeGeometry(value,count);
  }
  currentState='help-expanded';await p.evaluate(()=>{const w=chrome.extension.getViews({type:'popup'})[0];w.document.querySelector('#update-details').open=true;});
  value=await capture(currentState,{countEvidence:'DOM presentation stress only; archive count remains zero'});assertNativeGeometry(value,'expanded update help');assert.equal(value.helpOpen,true);
  await p.evaluate(()=>{const w=chrome.extension.getViews({type:'popup'})[0];w.document.querySelector('#update-details p').scrollIntoView({block:'end'});});
  value=await capture('help-reachable',{countEvidence:'DOM presentation stress only; archive count remains zero'});assert.ok(value.helpText.y>=0&&value.helpText.bottom<=value.height+1,'on-demand help remains reachable within the actual popup');
  await closeNativePopup(p);await assertNoNetwork(h);
  await artifactJSON('acceptance',{status:'PASS',headSha,kind:'native-action-popup',states,viewportEmulation:null,nativeBrowserFrame});
 }catch(error){
  const failure={status:'FAIL',headSha,expectedHeadSha:process.env.PAIA_TESTED_HEAD||null,state:currentState,states,error:errorDetails(error)};
  if(h){try{await captureNativeEvidence(h,'failure-current',{countEvidence:'inspect state metadata; may contain DOM presentation stress',failure});}catch(captureError){failure.artifactError=errorDetails(captureError);}}
  await artifactJSON('failure',failure);await artifactJSON('acceptance',failure);throw error;
 }finally{await h?.close();}
});
