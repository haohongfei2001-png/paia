// Test-only before evidence for the adopted Reader dialogs. No production styles
// are injected: both variants enter the existing menus and native modal owners.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {FakeChatGPT,eventually} from '../tests/harness/fake-chatgpt.mjs';
import {openArchiveWindow} from '../tests/harness/archive-navigator.mjs';

const directory='work/d7-reader-dialogs',baselineHead='e2f90cd8e81af5ba8bc3c840366d9e4f3e68f415';
const dimensions=[{width:1440,theme:'light'},{width:1440,theme:'dark'},{width:320,theme:'dark'}];
const original='SYNTHETIC 原始内容，只读保留。\n\n'+Array.from({length:42},(_,i)=>`${i+1}. 合成的长段落用于实际滚动检查。中文、English、👩‍💻 é 和换行保持完整，不把一次观察写成永久结论。`).join('\n\n')+'\n\nSYNTHETIC_ORIGINAL_END 完整原文尾标记 👩‍💻 é';
const current=original+'\n\nSYNTHETIC_CURRENT_END 后来的工作文字，不改写原始来源。';
const rpc=async(p,type,fields={})=>{const reply=await p.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(reply?.ok,true,JSON.stringify(reply));return reply.data;};
const frame=p=>p.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function measure(p,kind){return p.evaluate(kind=>{
 const dialog=document.querySelector(kind==='original'?'#info-dialog':'#revision-dialog'),body=dialog.querySelector(kind==='original'?'#info-content':'#revision-list');
 const read=node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,padding:s.padding,borderRadius:s.borderRadius,borderWidth:s.borderWidth,fontSize:s.fontSize,fontWeight:s.fontWeight,fontFamily:s.fontFamily,lineHeight:s.lineHeight,overflowY:s.overflowY,scrollTop:node.scrollTop,scrollHeight:node.scrollHeight,clientHeight:node.clientHeight,overflowX:node.scrollWidth-node.clientWidth};};
 return {dialog:read(dialog),body:read(body),heading:read(dialog.querySelector('h2')),close:read(dialog.querySelector('header button')),viewport:{width:innerWidth,height:innerHeight},rootOverflow:document.documentElement.scrollWidth-innerWidth};
},kind);}
async function settle(p,kind,row){
 await p.setViewportSize({width:row.width,height:1000});await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:row.theme}});
 await eventually(()=>p.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,row.theme));
 await p.locator(kind==='original'?'#info-dialog':'#revision-dialog').evaluate(dialog=>{dialog.scrollTop=0;const body=dialog.querySelector('#info-content,#revision-list');body.scrollTop=0;});
 await frame(p);
}
async function openMenu(p,label){
 await p.locator('.reader-more').evaluate(node=>globalThis.__readerDialogInvoker=node);
 await p.locator('.reader-more').click();await p.getByRole('menuitem',{name:label,exact:true}).click();
}
async function closeAndCheck(p,kind){
 const dialog=p.locator(kind==='original'?'#info-dialog':'#revision-dialog');
 await p.keyboard.press('Escape');await eventually(()=>dialog.isHidden());
 await eventually(()=>p.evaluate(()=>globalThis.__readerDialogInvoker?.isConnected&&document.activeElement===globalThis.__readerDialogInvoker),'native modal close returns focus to the surviving Reader invoker');
 assert.equal(await p.locator(kind==='original'?'#info-content':'#revision-list').textContent(),'','dismissal clears transient content');
}

for(const variant of ['source','release'])test(`D7 Reader dialogs retain exact adopted baseline through real Original and History owners (${variant})`,{timeout:90000},async()=>{
 await mkdir(directory,{recursive:true});const actualHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),head=process.env.PAIA_TESTED_HEAD||actualHead;
 assert.equal(head,actualHead,'evidence identifies the checked-out candidate head');
 const rows=[],interactions=[],releaseRuntime={},runtimeFiles=['ui/reader.css','ui/archive.js','ui/archive.html','ui/original-surface.js','ui/working-history.js','ui/reading-modal.js'];
 const runtime=Object.fromEntries(await Promise.all(runtimeFiles.map(async path=>[path,digest(await readFile(path))])));
 // The baseline patch may add tests/docs/CI, but it must not change any adopted
 // production file. Keep the immutable source identity in every receipt.
 const changed=execFileSync('git',['diff','--name-only',baselineHead,'--','.'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 assert.ok(changed.every(path=>/^(extension\/(tests|docs)\/|extension\/scripts\/verify-d7-reader-dialogs\.mjs$|\.github\/workflows\/)/.test(path)),`baseline contains production changes: ${changed.join(', ')}`);
 let h;const persist=async(result,error)=>writeFile(`${directory}/${variant}-baseline.json`,JSON.stringify({head,baselineHead,variant,result,error,syntheticOnly:true,phase:'before-production-style-change',expectedRows:6,rows,interactions,runtime:{source:runtime,release:releaseRuntime},network:h?{externalRequests:h.externalRequests,extensionNetworkRequests:h.extensionNetworkRequests,providerRequests:h.deepSeekRequests.length,pageErrors:h.errors}:null,qualification:'Actual adopted dialogs. This is baseline capture, not D6.2 visual acceptance. History currently scrolls its whole dialog; the before image intentionally retains that defect.'},null,2));
 try{
  await persist('PENDING');let extensionPath;
  if(variant==='release'){extensionPath=resolve('work/reader-dialogs-baseline-release');execFileSync('python3',['scripts/build_current_release.py',extensionPath],{timeout:60000,maxBuffer:16*1024*1024});for(const path of runtimeFiles){releaseRuntime[path]=digest(await readFile(resolve(extensionPath,path)));if(!['ui/archive.js','ui/archive.html'].includes(path))assert.equal(releaseRuntime[path],runtime[path],`built baseline retains ${path}`);}}
  h=await FakeChatGPT.start(extensionPath?{extensionPath}:{});const p=h.archive;p.setDefaultTimeout(7000);await p.setViewportSize({width:1440,height:1000});await p.emulateMedia({reducedMotion:'reduce'});
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented===true);
  if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const title='SYNTHETIC Reader 弹窗核对';await h.open({id:'reader-dialog-baseline-'+variant,title,base:1609459200,messages:[{id:'reader-dialog-input-'+variant,text:original}]});
  await eventually(async()=>(await h.state()).records.some(row=>row.originalText===original));await rpc(p,'SET_ENABLED',{enabled:false});await p.bringToFront();await openArchiveWindow(p,{text:title});await eventually(()=>p.locator('#scope-search').isEnabled());
  const field=p.locator('.library-prose'),id=await field.getAttribute('data-edit-id'),sources=structuredClone((await h.state()).records),before=await rpc(p,'GET_INPUT',{id});
  await openMenu(p,'查看原始内容');await eventually(()=>p.locator('#original-copy').isEnabled());assert.equal(await p.locator('.source-original').textContent(),original);
  for(const row of dimensions){
   await settle(p,'original',row);const actual=await measure(p,'original');
   assert.equal(actual.dialog.width,Math.min(720,row.width-32));assert.equal(actual.heading.fontSize,'18px');assert.equal(actual.heading.fontWeight,'600');assert.equal(actual.dialog.padding,row.width<768?'20px 16px':'28px');
   const name=`${variant}-before-A07-${row.width}-${row.theme}`;await p.screenshot({path:`${directory}/${name}.png`,animations:'disabled'});rows.push({screen:'A07',...row,name,actual});await persist('PENDING');
  }
  await p.locator('#original-copy').scrollIntoViewIfNeeded();const originalTail=await measure(p,'original');
  assert.ok(originalTail.body.scrollTop>0,'actual Original body reaches its complete tail');assert.ok(originalTail.close.y>=24&&originalTail.close.bottom<=976,'Original Close remains reachable');
  await p.screenshot({path:`${directory}/${variant}-before-A07-320-dark-tail.png`,animations:'disabled'});interactions.push({kind:'original-tail',actual:originalTail});
  await p.evaluate(()=>{globalThis.__readerDialogCopied=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{globalThis.__readerDialogCopied=text;}}});});
  await p.locator('#original-copy').click();await eventually(()=>p.evaluate(()=>typeof __readerDialogCopied==='string'),'complete original copy receives its asynchronous acknowledgement');assert.equal(await p.evaluate(()=>__readerDialogCopied),original,'Copy reads the complete original, including the Unicode tail');await closeAndCheck(p,'original');assert.deepEqual(await rpc(p,'GET_INPUT',{id}),before);
  await p.setViewportSize({width:1440,height:1000});await field.fill(current);await field.blur();await eventually(async()=>(await rpc(p,'GET_INPUT',{id})).libraryText===current,'native edit receives durable acknowledgement');
  await openMenu(p,'版本历史');await p.locator('.revision-row').first().getByRole('button',{name:'恢复操作前',exact:true}).click();await p.locator('.working-history-compare').waitFor();const reviewed=await rpc(p,'GET_INPUT',{id});assert.equal(reviewed.revision,before.revision+1);
  const versions=await p.locator('.working-history-compare pre').allTextContents();assert.ok(versions[0].startsWith(current));assert.ok(versions[1].startsWith(original));
  for(const row of dimensions){
   await settle(p,'history',row);const actual=await measure(p,'history');
   assert.equal(actual.dialog.width,Math.min(960,row.width-32));assert.equal(actual.heading.fontSize,'18px');assert.equal(actual.heading.fontWeight,'600');assert.equal(actual.dialog.padding,row.width<768?'20px 16px':'28px');
   const name=`${variant}-before-A08-${row.width}-${row.theme}`;await p.screenshot({path:`${directory}/${name}.png`,animations:'disabled'});rows.push({screen:'A08',...row,name,actual});await persist('PENDING');
  }
  const cancel=p.locator('[data-restore-confirm]').getByRole('button',{name:'取消',exact:true});await cancel.scrollIntoViewIfNeeded();const historyTail=await measure(p,'history');assert.ok(historyTail.dialog.scrollTop>0,'baseline records the existing whole-dialog History scroll');
  await p.screenshot({path:`${directory}/${variant}-before-A08-320-dark-confirm.png`,animations:'disabled'});interactions.push({kind:'history-tail',actual:historyTail});
  await cancel.click();assert.deepEqual(await rpc(p,'GET_INPUT',{id}),reviewed,'Cancel never writes a restoration');await p.locator('#close-revisions').focus();const close=await p.locator('#close-revisions').boundingBox();assert.ok(close.y>=24&&close.y+close.height<=976,'Close can be reached after scrolling the old History');await closeAndCheck(p,'history');
  assert.deepEqual((await h.state()).records,sources);assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);assert.equal(rows.length,6);await persist('PASS');
 }catch(error){await persist('FAIL',String(error.stack||error));if(h)await h.archive.screenshot({path:`${directory}/${variant}-baseline-failure.png`,animations:'disabled',timeout:5000}).catch(()=>{});throw error;}
 finally{await h?.close();}
});
