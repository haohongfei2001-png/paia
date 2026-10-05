// Paired canonical/production evidence. Documentation stays offline and outside runtime.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT,eventually} from './fake-chatgpt.mjs';
import {openArchiveWindow} from './archive-navigator.mjs';
import {openD5Reference} from './d5-shell-reference.mjs';
import {openReaderDialogReference,readerDialogContract} from './d7-reader-dialog-reference.mjs';
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(m=>chrome.runtime.sendMessage(m),{type,...fields});assert.equal(r?.ok,true,JSON.stringify(r));return r.data;};
const directory='work/qa-dvn-direct-edit/d5-reading-surfaces';
async function styles(page,selectors){return page.evaluate(selectors=>Object.fromEntries(Object.entries(selectors).map(([key,selector])=>{
 const e=document.querySelector(selector);if(!e)throw Error('Missing measured surface '+key);const r=e.getBoundingClientRect(),c=getComputedStyle(e);
 return [key,{x:r.x,y:r.y,width:r.width,height:r.height,padding:c.padding,borderWidth:c.borderWidth,borderColor:c.borderColor,borderRadius:c.borderRadius,background:c.backgroundColor,color:c.color,fontSize:c.fontSize,fontFamily:c.fontFamily,fontWeight:c.fontWeight,lineHeight:c.lineHeight,gap:c.gap,boxShadow:c.boxShadow,minHeight:c.minHeight,overflow:e.scrollWidth-e.clientWidth}];
})),selectors);}
async function settle(p,ref,width,theme){
 await p.setViewportSize({width,height:900});await ref.setViewportSize({width,height:900});
 await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:theme}});await eventually(()=>p.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,theme));await ref.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
 await p.emulateMedia({reducedMotion:'reduce'});await ref.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
// A07/A08 now use approved D6.2 originals; Selection retains its existing owner.
// A compact production derivative is never presented as a new compact artboard.
async function settleModal(p,width,theme){
 await p.setViewportSize({width,height:900});await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:theme}});await eventually(()=>p.evaluate(theme=>document.documentElement.dataset.paiaTheme===theme,theme));await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
}
async function retain(p,ref,variant,target,width,theme,production,reference){
 const stem=`${directory}/${variant}-${target}-${width}-${theme}`;
 await writeFile(stem+'.json',JSON.stringify({production,reference},null,2));
 await p.screenshot({path:stem+'-production.png',fullPage:false,animations:'disabled'});await ref.screenshot({path:stem+'-reference.png',fullPage:false,animations:'disabled'});
}
const near=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<=2,`${label}: ${actual} vs ${expected}`);
export async function compareD5ReadingSurfaces({variant,extensionPath}){
 const h=await FakeChatGPT.start(extensionPath?{extensionPath}:{}),p=h.archive,refs=[],rows=[],failures=[];
 const audit=(label,check)=>{try{check();}catch(error){failures.push({label,error:error.message});}};
 try{
  await mkdir(directory,{recursive:true});await p.setViewportSize({width:1440,height:900});
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented);if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const selectionRef=await openD5Reference(h,'selection');refs.push(selectionRef);
  const canonical=await selectionRef.evaluate(()=>({title:document.querySelector('.main h1').textContent,body:document.querySelector('.input-entry .prose').innerText}));
  const fixture={id:'d5-surfaces-'+variant,title:canonical.title,base:Date.parse('2023-04-27T22:11:00Z')/1000,messages:[{id:'d5-surface-input-'+variant,text:canonical.body}]};
  await h.open(fixture);await eventually(async()=>(await h.state()).records.some(r=>r.originalText===canonical.body&&r.sourceSentAt===new Date(fixture.base*1000).toISOString()));
  await openArchiveWindow(p,{text:canonical.title});await eventually(()=>p.locator('#scope-search').isEnabled());await rpc(p,'SET_ENABLED',{enabled:false});
  const field=p.locator('.library-prose'),id=await field.getAttribute('data-edit-id'),source=structuredClone((await h.state()).records),baseline=await rpc(p,'GET_INPUT',{id});await p.evaluate(()=>globalThis.__d5ReadingNode=document.querySelector('.library-prose'));
  for(const width of [1440,1280,1024,768,320])for(const theme of ['light','dark']){
   await settle(p,selectionRef,width,theme);
   // Complete a real deselection turn before selecting again after Escape.
   // The production owner deliberately keeps an identical dismissed range hidden.
   await field.evaluate(()=>{getSelection().removeAllRanges();document.dispatchEvent(new Event('selectionchange'));});
   await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
   await field.evaluate(e=>{e.focus();const range=document.createRange();range.selectNodeContents(e);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new Event('selectionchange'));});
   await eventually(()=>p.locator('.reader-selection').isVisible());
   const production=await styles(p,{surface:'.reader-selection',control:'.reader-selection button'}),reference=await styles(selectionRef,{surface:'.selectionbar',control:'.selectionbar button'});
   await retain(p,selectionRef,variant,'selection',width,theme,production,reference);
   audit(`Selection ${width}/${theme}`,()=>{for(const key of ['padding','borderWidth','borderColor','borderRadius','background','boxShadow','gap'])assert.equal(production.surface[key],reference.surface[key],'selection '+key);
   for(const key of ['fontSize','lineHeight','borderWidth','borderRadius'])assert.equal(production.control[key],reference.control[key],'selection control '+key);
   assert.ok(production.surface.x>=14&&production.surface.x+production.surface.width<=width-14);assert.ok(production.surface.y>=14&&production.surface.y+production.surface.height<=886);assert.ok(production.surface.overflow<=2);
   assert.ok(production.control.height>=(width<768?44:36));});assert.equal(await field.evaluate(e=>getSelection().toString()===e.textContent),true,'presentation never rewrites the native range');
   await p.keyboard.press('Alt+s');assert.equal(await p.locator('.reader-selection button').first().evaluate(e=>e===document.activeElement),true,'selection actions are keyboard reachable');await p.keyboard.press('Escape');await eventually(()=>p.locator('.reader-selection').isHidden());rows.push({target:'A03',width,theme,production,reference});
  }
  await p.setViewportSize({width:1440,height:900});await field.evaluate(e=>{e.blur();getSelection().removeAllRanges();});
  const originalRefs={};for(const theme of ['light','dark']){originalRefs[theme]=await openReaderDialogReference(h,'A07',theme);refs.push(originalRefs[theme].page);}await p.bringToFront();
  await p.locator('.reader-more').click();await p.getByRole('menuitem',{name:'查看原始内容',exact:true}).click();await eventually(()=>p.locator('#original-copy').isEnabled());assert.equal(await p.locator('.source-original').textContent(),canonical.body);
  assert.equal(await p.locator('dialog[open]').count(),1);assert.equal(await p.evaluate(()=>document.activeElement?.closest('dialog')?.id),'info-dialog');
  for(const width of [1440,1280,1024,768,320])for(const theme of ['light','dark']){
   await settleModal(p,width,theme);const originalRef=originalRefs[theme].page,production=await styles(p,{surface:'#info-dialog',heading:'#info-dialog h2',caption:'.original-time',prose:'.source-original',control:'#original-copy'}),reference=readerDialogContract(originalRefs[theme],width);
   await retain(p,originalRef,variant,'original',width,theme,production,reference);
   audit(`Original ${width}/${theme}`,()=>{for(const key of ['padding','borderWidth','borderRadius','background','color','boxShadow'])assert.equal(production.surface[key],reference.surface[key],'Original '+key);
   for(const key of ['fontSize','lineHeight','fontWeight'])assert.equal(production.heading[key],reference.heading[key],'Original heading '+key);assert.match(production.heading.fontFamily,/Georgia.*Noto Serif CJK SC.*serif/);
   for(const key of ['fontSize','lineHeight','color'])assert.equal(production.caption[key],reference.caption[key],'Original caption '+key);
   near(production.surface.width,Math.min(700,width-32),'approved D6.2 Original width formula');if(width>=768)near(production.surface.width,reference.surface.width,'Original fixed width');
   assert.ok(production.surface.width<=width-30&&production.surface.height<=852&&production.surface.overflow<=2);near(production.surface.x,(width-production.surface.width)/2,'Original centered');});assert.equal(await p.locator('.source-original').textContent(),canonical.body);
   rows.push({target:'A07',width,theme,production,reference});
  }
  // Read-only instrumentation around the previously failing native edit. All
  // events and commands still delegate to their existing production owner.
  await p.evaluate(async()=>{
   const {DocumentEditor}=await import('./library.js'),collect=DocumentEditor.prototype.collect;
   DocumentEditor.prototype.collect=function(...args){globalThis.__d5Editor=this;return collect.apply(this,args);};
   globalThis.__d5EditEvents=[];const note=event=>{const a=__d5EditEvents;if(a.length>=128)a.shift();a.push({type:event.type,inputType:event.inputType,prevented:event.defaultPrevented,target:event.target?.id||event.target?.className,at:performance.now(),active:document.activeElement?.id||document.activeElement?.className});};
   for(const type of ['beforeinput','input','focusin','focusout','selectionchange','cancel','close'])document.addEventListener(type,note,true);
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__d5EditCommands=[];chrome.runtime.sendMessage=async(message,...args)=>{const tracked=['EDIT_DOCUMENT','PAIA_ARCHIVE_OPERATION_OUTCOME','PAIA_RECOVERY_DRAFT_SAVE','PAIA_RECOVERY_DRAFT_LOAD','PAIA_RECOVERY_DRAFT_CLEAR'].includes(message.type),entry=tracked?{message,at:performance.now()}:null;if(entry){if(__d5EditCommands.length>=64)__d5EditCommands.shift();__d5EditCommands.push(entry);}try{const result=await send(message,...args);if(entry)Object.assign(entry,{result,done:performance.now()});return result;}catch(error){if(entry)Object.assign(entry,{error:String(error),done:performance.now()});throw error;}};
  });
  const snapshots=[];
  const snapshot=async(stage,expected)=>{const actual=await rpc(p,'GET_INPUT',{id}),dom=await field.evaluate((el,id)=>{const owner=globalThis.__d5Editor,e=owner?.entries?.get(id),selection=getSelection();return {text:el.innerText,textContent:el.textContent,html:el.innerHTML,connected:el.isConnected,sameNode:el===globalThis.__d5ReadingNode,editId:el.dataset.editId,editable:el.isContentEditable,active:document.activeElement?.id||document.activeElement?.className,focused:document.hasFocus(),dialogs:[...document.querySelectorAll('dialog[open]')].map(x=>x.id),status:document.getElementById('save-status')?.textContent,error:document.getElementById('error')?.textContent,selection:{text:selection?.toString(),anchor:selection?.anchorOffset,focus:selection?.focusOffset},owner:owner?{disposed:owner.disposed,composing:owner.composing,saving:owner.saving,failed:owner.failed,conflicted:owner.conflicted,dirty:owner.dirty(),entry:e,pending:owner.saveSession?.pending}:null,events:globalThis.__d5EditEvents,commands:globalThis.__d5EditCommands};},id);snapshots.push({stage,expected,actual,dom,errors:h.errors});await writeFile(`${directory}/${variant}-save-diagnostics.json`,JSON.stringify(snapshots,null,2));};
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement?.closest('dialog')?.id),'info-dialog');await p.keyboard.press('Escape');await eventually(()=>p.locator('#info-dialog').isHidden());assert.equal(await p.locator('#info-content').textContent(),'');
  await p.setViewportSize({width:1440,height:900});const current=canonical.body+'\n\nSYNTHETIC 后来的工作文字，原文保持不变。';await snapshot('before-fill',current);await field.fill(current);await snapshot('after-fill',current);
  try{await eventually(async()=>(await rpc(p,'GET_INPUT',{id})).libraryText===current,'native edit must reach exact durable current text');}catch(error){await snapshot('durable-equality-failure',current);throw error;}await snapshot('durable-equality-pass',current);await field.blur();
  const historyRefs={};for(const theme of ['light','dark']){historyRefs[theme]=await openReaderDialogReference(h,'A08',theme);refs.push(historyRefs[theme].page);}await p.bringToFront();
  await p.locator('.reader-more').evaluate(node=>globalThis.__d5HistoryInvoker=node);await p.locator('.reader-more').click();await p.getByRole('menuitem',{name:'版本历史',exact:true}).click();await p.locator('.revision-row').first().getByRole('button',{name:'恢复操作前',exact:true}).click();await p.locator('.working-history-compare').waitFor();
  const beforeReview=await rpc(p,'GET_INPUT',{id});assert.equal(beforeReview.revision,baseline.revision+1);
  const texts=await p.locator('.working-history-compare pre').allTextContents();assert.ok(texts[0].startsWith(current));assert.ok(texts[1].startsWith(canonical.body));assert.equal(await p.locator('dialog[open]').count(),1);
  for(const width of [1440,1280,1024,768,320])for(const theme of ['light','dark']){
   await settleModal(p,width,theme);const historyRef=historyRefs[theme].page,production=await styles(p,{surface:'#revision-dialog',heading:'#revision-dialog h2',pair:'.working-history-compare',current:'.working-history-compare>section:first-child',past:'.working-history-compare>section:last-child'}),reference=readerDialogContract(historyRefs[theme],width);
   await retain(p,historyRef,variant,'history',width,theme,production,reference);
   audit(`History ${width}/${theme}`,()=>{for(const key of ['padding','borderWidth','borderRadius','background','color','boxShadow'])assert.equal(production.surface[key],reference.surface[key],'History '+key);
   for(const key of ['fontSize','lineHeight','fontWeight'])assert.equal(production.heading[key],reference.heading[key],'History heading '+key);assert.match(production.heading.fontFamily,/Georgia.*Noto Serif CJK SC.*serif/);
   near(production.surface.width,Math.min(860,width-32),'approved D6.2 History width formula');if(width>=1024)near(production.surface.width,reference.surface.width,'History fixed width');assert.equal(production.pair.gap,reference.pair.gap,'History compare gap');
   assert.ok(production.surface.width<=width-30&&production.surface.height<=852&&production.surface.overflow<=2);if(width<1024)assert.ok(production.past.y>=production.current.y+production.current.height-2);else assert.ok(production.past.x>production.current.x);});
   rows.push({target:'A08',width,theme,production,reference});
  }
  // Last frame is320px dark: actually reach the selected past text and lower
  // restore controls, then return to Close. A clipped screenshot is not proof.
  const modal=p.locator('#revision-dialog'),past=p.locator('.working-history-compare>section:last-child pre'),confirm=p.locator('[data-restore-confirm]').getByRole('button',{name:'确认恢复这个工作版本',exact:true});
  for(const [name,target]of [['selected past text',past],['restore confirmation',confirm]]){await target.scrollIntoViewIfNeeded();const box=await target.boundingBox(),surface=await modal.boundingBox();assert.ok(box.y+box.height>surface.y&&box.y<surface.y+surface.height,name+' is reachable inside the narrow scrolling History');}
  await p.screenshot({path:`${directory}/${variant}-history-320-dark-confirm-reachable.png`});
  await p.locator('[data-restore-confirm]').getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(await rpc(p,'GET_INPUT',{id}),beforeReview,'visual review and Cancel do not restore a revision');await p.locator('#close-revisions').focus();const close=await p.locator('#close-revisions').boundingBox();assert.ok(close.y>=24&&close.y+close.height<=876,'keyboard reaches Close after scrolling');assert.equal(await p.locator('#close-revisions').evaluate(e=>e===document.activeElement),true);await modal.evaluate(dialog=>{globalThis.__d5HistoryClosed=false;dialog.addEventListener('close',()=>queueMicrotask(()=>{globalThis.__d5HistoryCloseState={connected:__d5HistoryInvoker.isConnected,invoker:__d5HistoryInvoker.outerHTML,active:document.activeElement?.outerHTML};globalThis.__d5HistoryClosed=true;}),{once:true});});await p.keyboard.press('Escape');await eventually(()=>p.evaluate(()=>__d5HistoryClosed),'native close event and the modal owner focus microtask complete');await eventually(()=>p.locator('#revision-dialog').isHidden());assert.equal(await p.locator('#revision-list').textContent(),'');assert.equal(await p.evaluate(()=>__d5HistoryInvoker.isConnected&&__d5HistoryInvoker===document.activeElement),true,'History returns focus to its surviving original invoker');
  assert.deepEqual((await h.state()).records,source);assert.equal(await p.evaluate(()=>__d5ReadingNode.isConnected),true);assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
  const head=process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();await writeFile(`${directory}/${variant}-comparison.json`,JSON.stringify({result:failures.length?'FAIL':'PASS',head,variant,rows,failures,intentionalDifferences:['Saved Reader font-size preferences stay authoritative for raw prose.','Original target, exact page coverage and real history revision/restore labels remain truthful.','Constrained modal widths keep the explicit viewport-minus32px formula (including History768px) and48px height reserve; A07/A08 retain the unchanged1440px SVG while compact production uses approved responsive rules. Coarse/narrow action targets are44px.','History compares current and selected real versions; the canonical illustrative dates and revision-list content are not forged.']},null,2));assert.deepEqual(failures,[],'every retained fixed-geometry comparison must pass');
 }finally{await writeFile(`${directory}/${variant}-retained-progress.json`,JSON.stringify({head:process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),variant,historyFocus:await p.evaluate(()=>globalThis.__d5HistoryCloseState||null).catch(()=>null),observedRows:rows.length,rows,failures,fullMatrix:rows.length===30},null,2));for(const ref of refs)await ref.close();await h.close();}
}
