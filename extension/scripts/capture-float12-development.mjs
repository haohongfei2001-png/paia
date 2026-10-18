// Development evidence only: production Source extension, synthetic host and data.
// Does not replace certification, release parity, real-site or human visual acceptance.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {FakeChatGPT,eventually} from '../tests/harness/fake-chatgpt.mjs';
import {routeComposer} from '../tests/harness/prompt-composer.mjs';

const root=fileURLToPath(new URL('..',import.meta.url)),out=join(root,'work/float12-development');
await mkdir(out,{recursive:true});
const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const runtimeFiles=['content/prompt-surface.js','core/prompt-surface-layout.js','ui/prompt-surface.css','ui/prompt-surface.html','ui/prompt-surface.js'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),hashes={};
for(const file of runtimeFiles)hashes[file]=hash(await readFile(join(root,file)));
const referencePath='docs/consumer-product-v1/PAIA_FLOAT_UI_1_2_APPROVED_COMPONENTS.webp';
const reference=await readFile(join(root,referencePath));
assert.equal(hash(reference),'fd0c56cba50817374fba40a60c1b24e9e5de72312d7e5daf9ac999ab41799293');
await writeFile(join(out,'approved-components.webp'),reference);
const prompts=['Check my previous message.','Give me a concrete example.',"Don’t just agree, point out flaws.",'Rewrite this in a simpler way.','Break the steps down clearly.','Use a more natural, conversational tone.'];
const receipt={sha,variant:'source',runtimeSha256:hashes,reference:{path:referencePath,sha256:hash(reference)},evidence:'SOURCE_SYNTHETIC_NATIVE',visualFidelity:'PENDING_VISUAL_COMPARISON',reducedMotion:'reduce',animationAcceptance:'NOT_RUN',fullCertification:'NOT_RUN',releaseParity:'NOT_RUN',realSite:'NOT_RUN',screens:[],capture:'NOT_RUN'};
const rpc=async(page,type,fields={})=>{const response=await page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(response.ok,true,JSON.stringify(response));return response.data;};
const settleFrame=async frame=>{await frame.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));await eventually(()=>frame.evaluate(()=>!document.documentElement.hasAttribute('data-layout-pending')));};
const clickFrame=async(frame,target)=>{await settleFrame(frame);await target.click();};
const disjoint=(a,b)=>a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y;
let h,page;
try{
 h=await FakeChatGPT.start({extensionPath:root,headless:true,launchThroughPort:true});
 await h.archive.locator('#enable-consent').click();
 await eventually(async()=>{const state=await h.state();return state.settings?.consentVersion===1&&state.settings?.enabled===true;},'explicit synthetic consent is durably acknowledged');
 await rpc(h.archive,'UPDATE_PREFERENCES',{changes:{language:'en'}});
 const engineering=await h.context.newPage();
 await engineering.goto('chrome-extension://'+h.extensionId+'/ui/prompt-reuse-test.html');
 const ids=[];
 for(const text of prompts){const query=await rpc(engineering,'PAIA_PROMPT_QUERY');ids.push((await rpc(engineering,'PAIA_PROMPT_CHANGE',{change:{action:'create',text,revision:query.revision}})).id);}
 for(const id of ids){const query=await rpc(engineering,'PAIA_PROMPT_QUERY');await rpc(engineering,'PAIA_PROMPT_CHANGE',{change:{action:'pin',id,revision:query.revision}});}
 await routeComposer(h.context,root);
 for(const theme of ['light','dark']){
  page=await h.context.newPage();page.on('pageerror',error=>h.errors.push(error.message));
  await page.setViewportSize({width:960,height:720});
  await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
  await page.goto('https://chatgpt.com/c/prompt-insertion-fixture');
  await page.waitForFunction(()=>!!globalThis.fixture?.view);
  // Only the synthetic host is styled. The extension's closed shadow root and
  // cross-origin frame retain their exact runtime DOM, SVG, CSS and event owners.
  await page.evaluate(dark=>{document.documentElement.classList.toggle('dark',dark);fixture.set('');document.getElementById('send').textContent='↑';document.getElementById('blur').textContent='';},theme==='dark');
  await page.addStyleTag({content:`html{color-scheme:${theme}}body{margin:0;background:${theme==='dark'?'#202124':'#f8f9fb'};color:${theme==='dark'?'#eef2f8':'#1f2937'};font:16px/24px system-ui,sans-serif}form{position:fixed;left:120px;right:120px;bottom:24px;height:80px;border:1px solid ${theme==='dark'?'#555960':'#dce0e5'};border-radius:24px;background:${theme==='dark'?'#303238':'#fff'};box-sizing:border-box}#mount{position:absolute;left:22px;top:18px;right:60px}.ProseMirror{outline:0;min-height:24px}.ProseMirror p{margin:0}.ProseMirror p:has(br:only-child):before{content:'Message AI…';opacity:.48;pointer-events:none}#send{position:absolute;right:14px;bottom:14px;width:34px;height:34px;border:0;border-radius:50%;background:${theme==='dark'?'#eee':'#222'};color:${theme==='dark'?'#222':'#fff'}}#blur{position:fixed;left:0;top:0;width:1px;height:1px;opacity:0}`});
  const orb=page.locator('[data-paia-prompt-surface]');
  await orb.waitFor({state:'visible'});
  await eventually(()=>orb.getAttribute('data-surface-form').then(form=>form==='orb'),'initial actual collapsed circle');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const anchor=await orb.boundingBox();assert.equal(anchor.width,48);assert.equal(anchor.height,48);
  let frame;
  const capture=async(name,state,{background='plain'}={})=>{
   if(frame&&!frame.isDetached())await settleFrame(frame);
   await page.locator('#blur').focus();await page.mouse.move(20,20);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal(await orb.getAttribute('data-surface-form'),state);
   const actualAnchor=await orb.boundingBox(),composer=await page.locator('form').boundingBox();
   assert.deepEqual(actualAnchor,anchor,'the same circle stays at the same coordinates through all states');
   assert.ok(disjoint(actualAnchor,composer));
   const shell=state==='orb'?null:await(await frame.frameElement()).boundingBox();
   if(shell){assert.ok(disjoint(shell,composer));assert.ok(shell.x>=0&&shell.y>=0&&shell.x+shell.width<=960&&shell.y+shell.height<=720);}
   const computed=state==='orb'?null:await frame.evaluate(()=>{
    const root=getComputedStyle(document.documentElement),card=getComputedStyle(document.getElementById('card'));
    return {form:document.documentElement.dataset.surfaceForm,language:document.documentElement.lang,rootColor:root.color,cardBackground:card.backgroundColor,cardRadius:card.borderRadius,bodyFont:getComputedStyle(document.body).font,rows:[...document.querySelectorAll('.row')].map(el=>({height:el.getBoundingClientRect().height,font:getComputedStyle(el.querySelector('.text')).font,color:getComputedStyle(el.querySelector('.text')).color})),capsuleText:document.getElementById('capsule-text').textContent};
   });
   const filename=`source-${theme}-${name}.png`;
   await page.screenshot({path:join(out,filename),animations:'disabled',caret:'hide'});
   receipt.screens.push({filename,theme,background,state,anchor:actualAnchor,shell,composer,computed,viewport:{width:960,height:720},dpr:await page.evaluate(()=>devicePixelRatio)});
   console.log('CAPTURE',filename);
  };
  await capture('orb','orb');
  await orb.click();
  await eventually(()=>page.frames().some(candidate=>candidate.url().includes('prompt-surface.html#')));
  frame=page.frames().find(candidate=>candidate.url().includes('prompt-surface.html#'));
  await eventually(()=>frame.locator('.row').count().then(count=>count===6));
  await eventually(()=>frame.locator('#refresh').isEnabled());
  await capture('board','board');
  await clickFrame(frame,frame.locator('#surface-more'));
  await clickFrame(frame,frame.locator('#collapse-capsule'));
  await eventually(()=>orb.getAttribute('data-surface-form').then(form=>form==='capsule'));
  await capture('capsule','capsule');
  await orb.click();
  await eventually(()=>orb.getAttribute('data-surface-form').then(form=>form==='board'));
  assert.deepEqual(await orb.boundingBox(),anchor,'the original circle reopens the board without moving');
  if(theme==='light'){
   const inserted=await frame.locator('.insert .text').first().textContent();
   assert.ok(prompts.includes(inserted),'insert only one known synthetic fixture prompt');
   await page.locator('#prompt-textarea').focus();
   await clickFrame(frame,frame.locator('.insert').first());
   await eventually(()=>page.evaluate(text=>fixture.text()===text&&!!document.activeElement?.closest('#mount'),inserted),'actual insertion restores the composer focus');
   assert.equal(await page.evaluate(()=>fixture.send),0);assert.equal(await page.evaluate(()=>fixture.enter),0);
   assert.equal(await orb.getAttribute('data-surface-form'),'board','successful insertion keeps the board open');
   receipt.insertion={exactText:inserted,sendCount:0,enterCount:0,focus:'HOST_COMPOSER',boardRemainsOpen:true};
   await eventually(()=>frame.locator('#status').textContent().then(text=>text===''),'original transient feedback settles');
   await capture('inserted','board');
  }
  // Busy pixels belong to the host only; they expose production glass opacity.
  await page.addStyleTag({content:'body{background:repeating-linear-gradient(90deg,transparent 0 31px,#8895b24d 32px 33px,transparent 34px 64px),repeating-linear-gradient(0deg,transparent 0 23px,#b6a5bf66 24px 25px,transparent 26px 48px),linear-gradient(125deg,#d9e3ed,#ddd8ea 52%,#d6e8de);min-height:100vh}'});
  await capture('board-backdrop','board',{background:'synthetic-grid-gradient'});
  await orb.click();
  await eventually(()=>orb.getAttribute('data-surface-form').then(form=>form==='capsule'));
  assert.deepEqual(await orb.boundingBox(),anchor,'the original circle closes the board without moving');
  await orb.click();await eventually(()=>orb.getAttribute('data-surface-form').then(form=>form==='board'));
  await clickFrame(frame,frame.locator('#surface-more'));await clickFrame(frame,frame.locator('#collapse-orb'));
  await eventually(()=>orb.getAttribute('data-surface-form').then(form=>form==='orb'));
  await eventually(()=>engineering.evaluate(async()=>((await chrome.storage.local.get('promptSurfaceV1')).promptSurfaceV1?.collapsedForm)==='orb'),'the original mode owner durably saves the closed circle');
  assert.equal(await page.evaluate(()=>fixture.send),0);assert.equal(await page.evaluate(()=>fixture.enter),0);
  await page.close();page=null;
 }
 assert.deepEqual(h.errors,[]);
 receipt.network={external:h.externalRequests,provider:h.deepSeekRequests.length,extension:h.extensionNetworkRequests,history:h.historyRequests};
 assert.deepEqual(receipt.network,{external:0,provider:0,extension:0,history:0});
 receipt.capture='PASS';
}catch(error){
 receipt.capture='FAIL';receipt.error=error.stack;
 if(page&&!page.isClosed())await page.screenshot({path:join(out,'failure.png')}).catch(()=>{});
 throw error;
}finally{
 if(h)receipt.network={external:h.externalRequests,provider:h.deepSeekRequests.length,extension:h.extensionNetworkRequests,history:h.historyRequests};
 await writeFile(join(out,'source.json'),JSON.stringify(receipt,null,2));
 if(h)await h.close();
}
