// Bounded D7 evidence through the existing Settings/file/controller/worker path.
// All imported bodies are synthetic. No private export or screenshot is loaded.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FakeChatGPT,eventually} from '../tests/harness/fake-chatgpt.mjs';
import {conversation,branched} from '../tests/fixtures/history-v090.mjs';
import {zip} from '../tests/fixtures/import-zip.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const directory=join(root,'work/d7-history-import-appearance');
const digest=value=>createHash('sha256').update(value).digest('hex');
const frame=page=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
const rpc=async(page,type,payload)=>{const result=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...(payload?{payload}:{})});assert.equal(result.ok,true,JSON.stringify(result));return result.data;};
const phase=page=>page.locator('#history-diagnostic').textContent().then(text=>JSON.parse(text).state);
const material=state=>({records:state.records,library:state.library});
const originalRows=state=>state.records.map(record=>({id:record.sourceMessageId,text:record.originalText})).sort((a,b)=>a.id.localeCompare(b.id));
const expectedRows=items=>items.flatMap(item=>Object.values(item.mapping).filter(node=>node.message?.author?.role==='user').map(node=>({id:node.message.id,text:node.message.content.parts.join('\n')}))).sort((a,b)=>a.id.localeCompare(b.id));

async function pick(page,file){
 assert.equal(await page.locator('#history-choose').isDisabled(),true,'a new pick needs explicit per-file consent');
 await page.locator('#history-file-consent').check();
 const chooser=page.waitForEvent('filechooser');await page.locator('#history-choose').click();await(await chooser).setFiles(file);
 await eventually(()=>page.locator('#history-file-consent').isEnabled(),'file inspection finishes',30000);
 assert.equal(await page.locator('#history-file-consent').isChecked(),false,'selection consumes the checkbox consent');
}

async function holdCommittedAcknowledgment(page){
 await page.evaluate(()=>{
  const original=chrome.runtime.sendMessage.bind(chrome.runtime);window.historyAppearanceTransport=original;
  chrome.runtime.sendMessage=async function(request,...args){
   const result=await original(request,...args);
   // The real worker transaction completes first. Only this page's second
   // acknowledgment is delayed, leaving the first batch visibly acknowledged.
   if(request.type==='IMPORT_COMMIT'&&request.payload.sequence===1&&!window.historyAppearanceHeld){
    window.historyAppearanceHeld=true;await new Promise(resolve=>{window.releaseHistoryAppearance=resolve;});
   }
   return result;
  };
 });
}
async function releaseAcknowledgment(page){await page.evaluate(()=>{if(window.historyAppearanceTransport)chrome.runtime.sendMessage=window.historyAppearanceTransport;window.releaseHistoryAppearance?.();delete window.historyAppearanceTransport;});}

async function measure(page){return page.locator('#history-dialog').evaluate(dialog=>{
 const read=node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,scrollHeight:node.scrollHeight,clientHeight:node.clientHeight,scrollTop:node.scrollTop,hit:hit===node||node.contains(hit),text:node.textContent,...Object.fromEntries(['color','backgroundColor','borderRadius','fontSize','fontWeight','fontFamily','lineHeight','position','outlineColor','outlineWidth'].map(key=>[key,s[key]]))};};
 return {dialog:read(dialog),heading:read(dialog.querySelector('h2')),header:read(dialog.querySelector('header')),actions:read(dialog.querySelector('.history-actions')),close:read(dialog.querySelector('#history-close')),steps:read(dialog.querySelector('.history-steps')),buttons:[...dialog.querySelectorAll('.history-actions button:not([hidden])')].map(read),theme:document.documentElement.dataset.paiaTheme,coarse:matchMedia('(pointer:coarse)').matches,viewport:{width:innerWidth,height:innerHeight},pageOverflow:document.documentElement.scrollWidth-innerWidth};
});}

for(const variant of ['source','release'])test(`D7 existing history import appearance and consent/recovery (${variant})`,{timeout:180000},async()=>{
 await mkdir(directory,{recursive:true});
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 assert.equal(process.env.PAIA_TESTED_HEAD||head,head,'evidence must name the actual checkout head');
 const receipt={head,variant,evidence:'SYNTHETIC_BROWSER',result:'PENDING',visualAcceptance:'PENDING_INDEPENDENT_FULL_WINDOW_REVIEW',rows:[],qualifications:['The existing history import has no independent D6.2 artboard; this is a bounded consistency derivation of the approved palette, type, controls and responsive rules.','Existing owner text, task state, file consent, source identity and commit semantics are retained. No real official-export compatibility claim.','200% is text-only enlargement of the existing nodes, restored exactly; no browser zoom or synthetic state facade.'],runtimeSHA256:{}};
 const persist=()=>writeFile(join(directory,`${variant}-receipt.json`),JSON.stringify(receipt,null,2));
 let h,cdp;
 try{
  await persist();
  if(variant==='release')execFileSync('python3',['scripts/build_current_release.py'],{cwd:root,timeout:60000,maxBuffer:16*1024*1024});
  const extensionPath=variant==='source'?root:join(root,'work/current-release');
  for(const file of ['ui/settings-preferences.css','ui/thought-reader.css','ui/app-shell.css','ui/history-completion.js','core/import/coordinator.js'])receipt.runtimeSHA256[file]=digest(await readFile(join(extensionPath,file)));
  receipt.testSHA256=digest(await readFile(fileURLToPath(import.meta.url)));
  h=await FakeChatGPT.start({extensionPath,headless:!process.env.DISPLAY,viewport:{width:1440,height:1000}});
  const page=h.archive;page.setDefaultTimeout(7000);cdp=await h.context.newCDPSession(page);
  const capture=async(id,extra={})=>{await frame(page);const file=`${variant}-${id}.png`,buffer=await page.screenshot({path:join(directory,file),fullPage:false,animations:'disabled'});const row={id,file,sha256:digest(buffer),...extra};receipt.rows.push(row);await persist();return row;};
  const theme=async(value,width=1440,coarse=false)=>{
   await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme:value,reducedMotion:'reduce'});
   await eventually(()=>page.evaluate(expected=>document.documentElement.dataset.paiaTheme===expected,value),'the existing system preference applies theme');
   await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:coarse,...(coarse?{maxTouchPoints:1}:{})});
   await eventually(()=>page.evaluate(expected=>matchMedia('(pointer:coarse)').matches===expected,coarse),'native pointer mode settles');
  };
  const shot=async(id,{dark=false,width=1440,coarse=false,text200=false,details=false}={})=>{
   const before=material(await h.state());await theme(dark?'dark':'light',width,coarse);
   const dialog=page.locator('#history-dialog');
   if(details)await page.locator('#history-details').evaluate(node=>{node.open=true;});
   let scaling;
   if(text200)scaling=await dialog.evaluate(node=>{
    node.__historyAppearanceFonts=[node,...node.querySelectorAll('*')].map(el=>({el,parent:el.parentElement,text:el.textContent,style:el.getAttribute('style'),size:parseFloat(getComputedStyle(el).fontSize)}));
    for(const {el,size}of node.__historyAppearanceFonts)el.style.setProperty('font-size',`${size*2}px`,'important');
    // Read the actual attribute while stress is active: Blink may serialize
    // inline styles lazily, and cleanup must compare the real before/after.
    return node.__historyAppearanceFonts.map(({el,style,size},index)=>({index,id:el.id,tag:el.tagName,before:size,after:parseFloat(getComputedStyle(el).fontSize),styleBefore:style,styleDuring:el.getAttribute('style')}));
   });
   try{
    await dialog.evaluate(node=>{node.scrollTop=0;});await frame(page);const top=await measure(page);
    receipt.lastMeasurement={id,actual:top};await persist();
    assert.equal(top.dialog.backgroundColor,dark?'rgb(23, 29, 40)':'rgb(255, 255, 255)');
    assert.equal(top.dialog.color,dark?'rgb(232, 237, 247)':'rgb(23, 35, 60)');
    assert.equal(top.steps.color,dark?'rgb(176, 189, 208)':'rgb(99, 114, 138)');
    assert.equal(top.dialog.borderRadius,'10px');assert.equal(top.heading.fontWeight,'500');assert.match(top.heading.fontFamily,/Georgia.*Noto Serif CJK SC/);
    assert.equal(parseFloat(top.heading.fontSize),text200?48:24);
    assert.ok(top.dialog.x>=15&&top.dialog.right<=width-15&&top.dialog.y>=15&&top.dialog.bottom<=985,'native dialog stays inside viewport');
    assert.ok(top.dialog.scrollWidth<=top.dialog.clientWidth+1&&top.pageOverflow<=1,'dialog and page reflow without horizontal scrolling');
    for(const control of [top.close,...top.buttons])assert.ok(control.hit&&control.width>=44&&control.height>=(width<768||coarse?44:36)&&control.x>=top.dialog.x&&control.right<=top.dialog.right&&control.bottom<=top.dialog.bottom,'full Close/action target remains visible and hit-testable');
    for(const size of scaling||[])assert.equal(size.after,size.before*2,'each existing node receives exactly 200% text');
    const currentPhase=await phase(page);await capture(id,{phase:currentPhase,actual:top,...(scaling?{scaling}:{})});
    await dialog.evaluate(node=>{node.scrollTop=node.scrollHeight;});await frame(page);const tail=await measure(page);
    assert.ok(Math.abs(tail.actions.bottom-top.actions.bottom)<=1,'scrolling details keeps the footer fixed');
    assert.ok(Math.abs(tail.header.y-top.header.y)<=1&&tail.close.hit,'scrolling retains reachable heading and Close');
    assert.ok(tail.buttons.every(button=>button.hit),'footer actions remain hit-testable at the end');
    if(text200||details)await capture(`${id}-details-end`,{phase:currentPhase,actual:tail});
    await page.locator('#history-close').focus();await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.querySelector('#history-dialog').contains(document.activeElement)),true,'native modal contains keyboard focus');
    const focus=await page.evaluate(()=>({color:getComputedStyle(document.activeElement).outlineColor,width:getComputedStyle(document.activeElement).outlineWidth,visible:document.activeElement.matches(':focus-visible')}));
    assert.equal(focus.visible,true);assert.equal(focus.width,'2px');assert.equal(focus.color,dark?'rgb(148, 186, 255)':'rgb(35, 93, 211)');
   }finally{
    const restoration=await dialog.evaluate(node=>{
     const saved=node.__historyAppearanceFonts||[],current=[node,...node.querySelectorAll('*')];
     for(const {el,style}of saved){if(style===null)el.removeAttribute('style');else el.setAttribute('style',style);}
     const nodes=saved.map(({el,parent,text,style},index)=>({index,id:el.id,sameNode:el===current[index],sameParent:el.parentElement===parent,sameText:el.textContent===text,styleBefore:style,styleAfter:el.getAttribute('style'),connected:el.isConnected}));
     delete node.__historyAppearanceFonts;node.querySelector('#history-details').open=false;node.scrollTop=0;
     return {nodes,sameNodeCount:!saved.length||saved.length===current.length,preserved:nodes.every(row=>row.sameNode&&row.sameParent&&row.sameText&&row.styleBefore===row.styleAfter&&row.connected)};
    });
    if(text200){receipt.text200Restoration=restoration;await persist();assert.equal(restoration.sameNodeCount,true);assert.equal(restoration.preserved,true,'200% text restores every original node, parent, text and exact inline style');}
   }
   assert.deepEqual(material(await h.state()),before,'appearance, details, focus and resize preserve stored material exactly');
  };

  await page.locator('#consent-check').check();await page.locator('#enable-consent').click();await page.locator('#onboarding-skip').click();
  await theme('light');
  await page.locator('#primary-nav [data-view="thoughts"]').click();await page.locator('#thought-empty').waitFor();
  assert.equal(await page.locator('#thought-continuous-sentinel').isVisible(),false,'confirmed empty root has no contradictory all-loaded footer');
  const emptyStyle=await page.locator('#thought-empty').evaluate(node=>({heading:getComputedStyle(node.querySelector('h2')).fontSize,copy:getComputedStyle(node.querySelector('p')).fontSize,color:getComputedStyle(node).color}));
  assert.equal(emptyStyle.heading,'24px');assert.equal(emptyStyle.copy,'16px');
  await capture('thought-empty',{actual:emptyStyle});
  await page.locator('#thought-empty-settings').click();await eventually(()=>page.evaluate(()=>document.body.dataset.paiaSpace==='library'),'existing empty CTA returns to Archive');
  await page.locator('.sidebar [data-view="settings"]').click();await page.locator('[data-settings-group="data"]').click();
  await page.locator('#ux-history-start').waitFor();
  const controls=await page.locator('#ux-history-start,#backup-create,#backup-choose').evaluateAll(nodes=>nodes.map(node=>{const s=getComputedStyle(node);return {color:s.color,background:s.backgroundColor,radius:s.borderRadius,fontSize:s.fontSize,height:node.getBoundingClientRect().height};}));
  assert.ok(controls.every(control=>control.color==='rgb(23, 35, 60)'&&control.background==='rgb(255, 255, 255)'&&control.radius==='6px'&&control.fontSize==='13px'&&control.height>=36));
  await capture('settings-data',{controls});
  await page.locator('#ux-history-start').click();await page.locator('#history-dialog').waitFor();
  assert.equal(await page.locator('#history-choose').isDisabled(),true);assert.equal(await page.locator('#history-commit').isDisabled(),true);
  const empty=material(await h.state());
  await page.locator('#history-file').setInputFiles({name:'no-consent.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([conversation(900,1)]))});
  assert.deepEqual(material(await h.state()),empty);assert.deepEqual((await rpc(page,'IMPORT_TASKS')).tasks,[],'selecting without consent never starts a task');
  await shot('selection-light');await shot('selection-dark',{dark:true});await shot('selection-320-text200',{dark:true,width:320,text200:true,details:true});await shot('selection-coarse',{coarse:true});
  await theme('light');
  const main=[conversation(901,70)],blob=zip([{name:'folder/conversations.json',text:JSON.stringify(main)},{name:'account.json',text:'SYNTHETIC_ACCOUNT_DATA_NEVER_IMPORT'}]);
  const file={name:'synthetic-history.zip',mimeType:'application/zip',buffer:Buffer.from(await blob.arrayBuffer())};
  await pick(page,file);await eventually(()=>page.locator('#history-commit').isEnabled(),'real ZIP preview is ready');
  assert.equal(await phase(page),'ready');assert.match(await page.locator('#history-format').textContent(),/ZIP.*1 个窗口.*70 条用户文字/);
  assert.deepEqual(material(await h.state()),empty,'preflight does not import content');
  await shot('preview-light');await shot('preview-320',{width:320});
  await theme('dark');await holdCommittedAcknowledgment(page);await page.locator('#history-commit').click();
  await eventually(()=>page.evaluate(()=>window.historyAppearanceHeld===true),'real second batch committed before delayed acknowledgment');
  assert.equal((await h.state()).records.length,64);assert.match(await page.locator('#history-status').textContent(),/32 \/ 70/);
  await shot('importing-dark',{dark:true});
  await page.locator('#history-pause').click();await eventually(()=>phase(page).then(value=>value==='paused'),'explicit pause revokes this file session');
  await releaseAcknowledgment(page);await eventually(()=>page.locator('#history-file-consent').isEnabled(),'paused import leaves processing');
  await eventually(()=>phase(page).then(value=>value==='paused'),'late acknowledgment cannot complete a paused import');
  const paused=material(await h.state());assert.equal(paused.records.length,64);
  assert.equal(await page.locator('#history-commit').isDisabled(),true);assert.equal(await page.locator('#history-choose').isDisabled(),true);
  await shot('paused-320-dark',{dark:true,width:320});
  await page.locator('#history-close').click();await page.locator('#history-dialog').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>document.activeElement.id),'ux-history-start','native close restores the surviving Data invoker');
  await theme('light');await page.locator('#ux-history-start').click();await page.locator('#history-tasks button').filter({hasText:'继续未完成'}).click();
  assert.equal(await phase(page),'awaiting_file');assert.equal(await page.locator('#history-choose').isDisabled(),true);
  await shot('reselect-light',{details:true});
  await pick(page,file);await eventually(()=>page.locator('#history-commit').isEnabled(),'same original file revalidates resume');
  assert.deepEqual(material(await h.state()),paused,'resume preflight preserves the committed checkpoint');
  await page.locator('#history-commit').click();await eventually(()=>phase(page).then(value=>value==='completed'),'resumed import completes',30000);
  assert.deepEqual(originalRows(await h.state()),expectedRows(main),'all original text and stable message identities survive resume exactly once');
  await shot('completed-light');

  // A second, independent partial file exercises the real branch-review result.
  const partial=[branched()],partialFile={name:'synthetic-branches.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(partial))};
  const completed=material(await h.state());await pick(page,partialFile);await eventually(()=>page.locator('#history-commit').isEnabled());assert.deepEqual(material(await h.state()),completed);
  await page.locator('#history-commit').click();await eventually(()=>phase(page).then(value=>value==='partial'),'branch result stays honestly partial');
  assert.equal(await page.locator('#history-review').isVisible(),true);await shot('partial-dark',{dark:true});
  const partialSaved=material(await h.state());assert.deepEqual(originalRows(partialSaved),expectedRows([...main,...partial]));assert.equal(partialSaved.library.blocks.filter(block=>block.branchStatus).length,1);

  // Explicit cancellation of a real ready task must retain all saved material.
  await pick(page,file);await eventually(()=>page.locator('#history-commit').isEnabled());await page.locator('#history-cancel').click();
  await eventually(()=>phase(page).then(value=>value==='cancelled'));assert.deepEqual(material(await h.state()),partialSaved);await shot('cancelled-light');
  await pick(page,{name:'synthetic-unsupported.json',mimeType:'application/json',buffer:Buffer.from('{"title":"SYNTHETIC_PRIVATE_TITLE","body":"SYNTHETIC_PRIVATE_BODY"}')});
  await eventually(()=>phase(page).then(value=>value==='unsupported'),'unknown file fails closed');assert.equal(await page.locator('#history-commit').isDisabled(),true);
  assert.doesNotMatch(await page.locator('#history-dialog').textContent(),/SYNTHETIC_PRIVATE/);assert.deepEqual(material(await h.state()),partialSaved);
  await shot('error-320',{width:320,details:true});
  await page.locator('#history-close').focus();await page.keyboard.press('Escape');await page.locator('#history-dialog').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>document.activeElement.id),'ux-history-start');
  assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
  receipt.result='PASS';receipt.invariants={explicitPerFileConsent:true,previewWritesNoBodies:true,committedBeforePause:64,completedSources:70,partialSources:73,exactSourceTextAndIdentity:true,pauseReselectResume:true,cancelRetainsCommittedMaterial:true,rejectedFileRetainsMaterial:true,externalRequests:0,providerRequests:0,pageErrors:[]};
 }catch(error){receipt.result='FAIL';receipt.error=String(error.stack||error);if(h)await h.archive.screenshot({path:join(directory,`${variant}-failure.png`),fullPage:false,animations:'disabled',timeout:5000}).catch(()=>{});throw error;}
 finally{if(h)await releaseAcknowledgment(h.archive).catch(()=>{});if(cdp)await cdp.detach().catch(()=>{});await persist();await h?.close();}
});
