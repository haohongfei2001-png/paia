import {settingsPromptPositionEvidence} from './harness/settings-prompt-position-browser.mjs';
import {promptStatusGeometry,assertPromptStatusClearance} from './harness/prompt-status-clearance.mjs';
import {readApprovedAuthority,assertThemePalette} from '../scripts/prompt-convergence-authority.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {join} from 'node:path';import {mkdir,writeFile,mkdtemp} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';import {routeComposer,isolated} from './harness/prompt-composer.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),url='https://chatgpt.com/c/prompt-insertion-fixture',receiptDir=join(root,'work/prompt-surface');
const approvedThemeAuthority=await readApprovedAuthority(root);
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const settleSurface=async frame=>{
 // Original child measurement ACK precedes the host's scheduled frame reflow.
 // Wait for both actual surfaces before one trusted action, within the existing
 // eventually budget. Do not retry a click or force a target through movement.
 await eventually(async()=>{
  const element=await frame.frameElement(),before=await element.boundingBox();
  for(let turn=0;turn<2;turn++){
   await frame.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
   await frame.page().evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
   if(await frame.evaluate(()=>document.documentElement.hasAttribute('data-layout-pending')))return false;
  }
  const after=await element.boundingBox();return before&&after&&['x','y','width','height'].every(key=>before[key]===after[key]);
 },'original Prompt child ACK and parent frame geometry are settled');
};
const surfaceReady=async frame=>{await eventually(()=>frame.locator('#refresh').isEnabled(),'the original refresh owner has completed');await settleSurface(frame);};
const clickSurface=async(frame,locator)=>{
 await surfaceReady(frame);
 try{await locator.click();}catch(error){
  // Failure-only geometry/owner evidence: no bodies, values, retry or action.
  // A diagnostic failure must never replace the original click exception.
  try{
   const state=await frame.locator('html').evaluate(()=>{
    const shape=node=>{if(!node)return null;const r=node.getBoundingClientRect(),style=getComputedStyle(node);return {tag:node.tagName,id:node.id,class:node.className,hidden:node.hidden,disabled:node.disabled,display:style.display,visibility:style.visibility,rect:{x:r.x,y:r.y,width:r.width,height:r.height}};};
    return {pending:document.documentElement.hasAttribute('data-layout-pending'),viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},focusTag:document.activeElement?.tagName,list:shape(document.querySelector('#list')),check:shape(document.querySelector('#check-text')),editor:shape(document.querySelector('#editor')),row:shape(document.querySelector('.row')),more:shape(document.querySelector('.row .more'))};
   },null,{timeout:1000});
   const owner=await (await frame.frameElement()).evaluate(node=>{const shape=n=>{if(!n)return null;const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {tag:n.tagName,id:n.id,hidden:n.hidden,display:s.display,visibility:s.visibility,rect:{x:r.x,y:r.y,width:r.width,height:r.height}};};return {frame:shape(node),parent:shape(node.parentElement),host:shape(node.getRootNode()?.host),viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio}};});
   await mkdir(receiptDir,{recursive:true});await writeFile(join(receiptDir,'click-owner-failure-'+Date.now()+'.json'),JSON.stringify({frameUrl:frame.url(),state,owner},null,2)+'\n');
  }catch(diagnosticError){console.error('Prompt click owner diagnostic unavailable:',diagnosticError.name);}
  throw error;
 }
};
const openSurfaceTools=async frame=>{if(await frame.locator('#surface-tools').isHidden()){await frame.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));await frame.waitForFunction(()=>!document.documentElement.hasAttribute('data-layout-pending'));await frame.locator('#surface-more').click();await frame.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));await frame.waitForFunction(()=>!document.documentElement.hasAttribute('data-layout-pending'));}};
const surfaceClick=async(frame,selector)=>{await openSurfaceTools(frame);await clickSurface(frame,frame.locator(selector));};
const leaveSurfaceCheck=async frame=>{
 if(!await frame.locator('#check-text').isVisible())return;
 await clickSurface(frame,frame.getByRole('button',{name:'返回',exact:true}));
 // The next refresh is intentionally ignored while the original check owns
 // the view. Observe that single trusted Back action before preparing rows.
 await eventually(()=>frame.locator('#check-text').isHidden(),'original full-text check has returned to the list');
};
for(const variant of ['source','release'])test('CPV1-09 surface '+variant+' isolated native Chrome',{timeout:240000},async t=>{
 const extensionPath=variant==='source'?root:process.env.NIB_RELEASE_PATH||await mkdtemp(join(root,'work/prompt-diagnostic-release-'));if(variant==='release'&&!process.env.NIB_RELEASE_PATH)execFileSync('python3',['scripts/build_current_release.py',extensionPath],{cwd:root,stdio:'pipe'});
 let failures=0,failureProbe=null;const check=(name,fn)=>t.test(name,async()=>{try{await fn();}catch(error){failures++;try{await failureProbe?.(name);}catch(diagnosticError){console.error('Prompt case diagnostic unavailable:',diagnosticError.name);}console.error(name,error.stack);throw error;}});
 // This native DOM/input suite uses headless Chrome even when CI provides Xvfb.
 // OS/tab visibility belongs to its separate native lifecycle tests.
 const statusTrace=[];
 const assertStatusAction=async(frame,action,withinStatus=false)=>{
  await surfaceReady(frame);await action.scrollIntoViewIfNeeded();await action.focus();await settleSurface(frame);
  const measured=await action.evaluate(promptStatusGeometry);statusTrace.push({...measured,withinStatus});
  await writeFile(join(receiptDir,variant+'-status-clearance.json'),JSON.stringify({variant,readings:statusTrace},null,2));
  assertPromptStatusClearance(measured,{withinStatus});assert.equal(measured.focused,true,'original status-related action retains keyboard focus');
 };
 const h=await FakeChatGPT.start({extensionPath,headless:true,launchThroughPort:true}),screens=[];let world,diagnosticCDP;const navigationTrace=[],diagnosticReads=[];await mkdir(receiptDir,{recursive:true});
 try{
  await h.archive.locator('#enable-consent').waitFor({state:'visible'});await h.archive.locator('#enable-consent').click();await rpc(h.archive,'UPDATE_PREFERENCES',{changes:{language:'zh-CN'}});
  const engineering=await h.context.newPage();await engineering.goto('chrome-extension://'+h.extensionId+'/ui/prompt-reuse-test.html');
  const text='请保留引用。\nOnly test.🙂',secret='PRIVATE_LIBRARY_NEVER_IN_HOST';let q=await rpc(engineering,'PAIA_PROMPT_QUERY');
  const a=await rpc(engineering,'PAIA_PROMPT_CHANGE',{change:{action:'create',revision:q.revision,text}});await rpc(engineering,'PAIA_PROMPT_CHANGE',{change:{action:'create',revision:a.revision,text:secret}});
  await routeComposer(h.context,root);const page=await h.context.newPage();page.on('pageerror',e=>h.errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>!!globalThis.fixture?.view);
  const arrange=async p=>{await p.addStyleTag({content:'body{margin:0;min-height:100vh}form{position:fixed;left:16px;right:16px;bottom:16px;border:1px solid #aaa;padding:12px;background:#fafafa}#blur{position:fixed;top:8px;left:8px}@media(prefers-color-scheme:dark){body{background:#1f1f1f;color:#eee}form{background:#292929}}'});};await arrange(page);
  const orb=page.locator('[data-paia-prompt-surface]');await orb.waitFor({state:'visible'});
  const card=()=>page.frames().find(f=>f.url().includes('/ui/prompt-surface.html#'));
  failureProbe=async name=>{
   const frame=card(),child=frame?await frame.locator('html').evaluate(()=>{
    const status=document.getElementById('status')?.textContent??'',shape=node=>{if(!node)return null;const r=node.getBoundingClientRect();return {hidden:node.hidden,disabled:node.disabled,rect:{x:r.x,y:r.y,width:r.width,height:r.height}};};
    return {pending:document.documentElement.hasAttribute('data-layout-pending'),focusTag:document.activeElement?.tagName,status:{empty:!status,inserted:status.includes('已插入'),inserting:status.includes('正在插入'),unknown:status.includes('未确认'),stale:status.includes('已变化'),unavailable:status.includes('不可用')},check:shape(document.getElementById('check-text')),fill:shape(document.querySelector('#check-text .actions button')),rows:document.querySelectorAll('.row').length};
   },null,{timeout:1000}):null;
   const host=await page.locator('html').evaluate(()=>{const view=globalThis.fixture?.view,selection=view?.state?.selection;return {documentFocused:document.hasFocus(),visibility:document.visibilityState,focusTag:document.activeElement?.tagName,focusEditable:document.activeElement?.isContentEditable===true,editorFocused:view?.hasFocus(),selection:selection?{from:selection.from,to:selection.to,empty:selection.empty}:null,bodyLength:view?.state?.doc?.textContent.length};},null,{timeout:1000});
   let uncertainCommandCalls=null,timer;try{if(world)uncertainCommandCalls=await Promise.race([world.run('Number.isSafeInteger(globalThis.__promptUncertainCalls)?globalThis.__promptUncertainCalls:null'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('DIAGNOSTIC_TIMEOUT')),1000);})]);}catch{}finally{clearTimeout(timer);}
   const diagnostic=JSON.stringify({name,child,host,uncertainCommandCalls},null,2)+'\n';await writeFile(join(receiptDir,variant+'-case-failure.json'),diagnostic);await writeFile(join(receiptDir,variant+'-case-failure-'+String(failures).padStart(2,'0')+'.json'),diagnostic);
  };
  // Resolve the current closed-shadow iframe within the existing readiness budget.
  // Only an actually detached Frame permits reacquisition; all other errors fail.
  const readyCard=async(resolve=card)=>{let ready;await eventually(async()=>{const f=resolve();if(!f||f.isDetached())return false;let visible;try{visible=await f.locator('.row').first().isVisible();}catch(error){if(f.isDetached())return false;throw error;}if(!visible||f.isDetached()||resolve()!==f)return false;ready=f;return true;},'current Prompt frame has visible rows');await (await ready.frameElement()).evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished));});await ready.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await ready.waitForFunction(()=>!document.documentElement.hasAttribute('data-layout-pending'));await settleSurface(ready);assert.equal(ready.isDetached(),false,'ready Prompt frame remains attached');assert.equal(resolve(),ready,'ready Prompt owner remains current');return ready;};
  const open=async()=>{
   // Initial visible mount can still be restoring an already-open frame.
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const worker=h.context.serviceWorkers().find(w=>w.url().endsWith('/background/service-worker.js'));assert.ok(worker);
   const host=await worker.evaluate(async url=>{const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*'}),matches=tabs.filter(tab=>tab.url===url);if(matches.length!==1)throw Error('Exact original source tab missing');return chrome.tabs.sendMessage(matches[0].id,{type:'PAIA_PROMPT_SURFACE_PROBE'},{frameId:0});},page.url());assert.equal(host.url,page.url());
   if(host.open)await eventually(()=>card()?.url().endsWith('#'+host.nonce),'original current host nonce owns the restored frame');else await orb.click();return readyCard();
  };
  const fill=async(f,value=text)=>{await clickSurface(f,f.getByRole('button',{name:value,exact:true}));assert.equal(await f.locator('#check-text').isVisible(),false,'ordinary eligible use has no mandatory second confirmation');};
  // Read-only synthetic lifecycle trace: no retry, timeout or assertion changes.
  const frameIds=new WeakMap();let nextFrameId=0;const frameId=f=>{if(!frameIds.has(f))frameIds.set(f,++nextFrameId);return frameIds.get(f);};
  const trace=(phase,data={})=>navigationTrace.push({at:Date.now(),phase,...data});
  for(const event of ['frameattached','framedetached','framenavigated'])page.on(event,f=>trace(event,{frame:frameId(f),main:f===page.mainFrame(),url:f.url(),detached:f.isDetached()}));
  diagnosticCDP=await h.context.newCDPSession(page);const diagnosticContexts=new Map();
  diagnosticCDP.on('Runtime.executionContextCreated',({context:c})=>diagnosticContexts.set(c.id,c));
  diagnosticCDP.on('Runtime.executionContextDestroyed',e=>diagnosticContexts.delete(e.executionContextId));
  diagnosticCDP.on('Runtime.executionContextsCleared',()=>diagnosticContexts.clear());
  const traceLifecycle=phase=>{const read=Promise.all([...diagnosticContexts.values()].filter(c=>!c.auxData?.isDefault).map(async c=>{try{const r=await diagnosticCDP.send('Runtime.evaluate',{contextId:c.id,expression:'JSON.stringify({active:globalThis.PAIACaptureLifecycle?.active,ready:globalThis.PAIACaptureLifecycle?.ready,version:globalThis.PAIACaptureLifecycle?.version,surface:!!globalThis.PAIAPromptSurface})',returnByValue:true});trace(phase,{context:c.id,frame:c.auxData?.frameId,lifecycle:r.result.value,error:r.exceptionDetails?.text});}catch(e){trace(phase,{context:c.id,error:e.message});}}));diagnosticReads.push(read);};
  diagnosticCDP.on('Page.frameNavigated',({frame:f})=>{trace('cdp-frameNavigated',{frame:f.id,parent:f.parentId,documentNonce:f.loaderId,url:f.url});traceLifecycle('navigation-lifecycle');});
  await diagnosticCDP.send('Runtime.enable');await diagnosticCDP.send('Page.enable');
  // Mount visibility precedes the original scheduled host layout. Retain only its completed collapsed geometry.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await eventually(async()=>{const b=await orb.boundingBox();return b?.width===44&&b.height===44&&await orb.evaluate(n=>getComputedStyle(n).position==='fixed');},'the original collapsed host layout is complete');
  const collapsedBeforeOpen=await orb.boundingBox();await open();await card().locator('#close').click();await eventually(()=>!card());assert.deepEqual(await orb.boundingBox(),collapsedBeforeOpen);await open();world=await isolated(page,h.extensionId);
  await check('orb toggle collapses idle card, preserves anchor and uses native Enter and Space',async()=>{
   // Preserve the user's saved visible anchor across both states (default placement stays unchanged).
   await page.locator('#blur').focus();await page.keyboard.press('Tab');await page.keyboard.press('Alt+ArrowLeft');await page.waitForTimeout(100);
   const anchor=await orb.boundingBox();await page.mouse.move(anchor.x+22,anchor.y+22);await page.mouse.down();await page.mouse.up();await eventually(()=>!card(),'same-point idle click collapses');assert.deepEqual(await orb.boundingBox(),anchor);
   // No second mouse.move: reopen at the identical physical target.
   await page.mouse.down();await page.mouse.up();await eventually(()=>!!card(),'same-point idle click reopens without another action');await readyCard();assert.deepEqual(await orb.boundingBox(),anchor);const opened=await (await card().frameElement()).boundingBox();assert.equal(opened.y+opened.height,anchor.y);

   for(const key of ['Enter','Space']){
    await page.locator('#blur').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-paia-prompt-surface')),true);await page.keyboard.press(key);await eventually(()=>!card(),key+' closes');assert.equal(await page.evaluate(()=>document.activeElement?.hasAttribute('data-paia-prompt-surface')),true,key+' close retains host entry focus after the old frame retires');await page.keyboard.press(key);await eventually(()=>!!card(),key+' reopens');await open();assert.deepEqual(await orb.boundingBox(),anchor);
   }
   // A sub-threshold pointer excursion remains an ordinary click.
   const b=await orb.boundingBox();await page.mouse.move(b.x+22,b.y+22);await page.mouse.down();await page.mouse.move(b.x+24,b.y+24);await page.mouse.up();await eventually(()=>!card(),'short pointer movement still toggles');await open();
  });
  await check('orb, Close and both Escape owners preserve editing, composition and pending work',async()=>{
   const f=card(),draft='unsaved toggle draft\n中文 🙂';await surfaceClick(f,'#new');await f.getByRole('textbox',{name:'复用文本'}).fill(draft);
   for(const gesture of [()=>orb.click(),()=>f.locator('#close').click(),async()=>{await f.getByRole('textbox',{name:'复用文本'}).focus();await page.keyboard.press('Escape');},async()=>{await page.locator('#blur').focus();await page.keyboard.press('Tab');await page.keyboard.press('Escape');}]){
    await gesture();await eventually(()=>f.locator('#status').textContent().then(x=>x==='请先保存或取消编辑。'));assert.equal(card(),f);assert.equal(await f.getByRole('textbox',{name:'复用文本'}).inputValue(),draft);
   }
   await f.getByRole('textbox',{name:'复用文本'}).focus();const cdp=await h.context.newCDPSession(page);await cdp.send('Input.imeSetComposition',{text:'汉',selectionStart:1,selectionEnd:1});await page.keyboard.press('Escape');assert.equal(card(),f);await orb.click();assert.equal(card(),f);assert.match(await f.getByRole('textbox',{name:'复用文本'}).inputValue(),/unsaved toggle draft/);await f.getByRole('textbox',{name:'复用文本'}).focus();await cdp.send('Input.insertText',{text:'汉'});await cdp.detach();
   await f.getByRole('button',{name:'取消',exact:true}).click();await eventually(()=>f.locator('#refresh').isEnabled());
   // Hold the actual frame RPC, rather than replacing the close guard or worker.
   await f.evaluate(()=>{globalThis.toggleSend=chrome.runtime.sendMessage.bind(chrome.runtime);chrome.runtime.sendMessage=r=>r.type==='PAIA_PROMPT_SURFACE_RPC'&&r.command?.type==='PAIA_PROMPT_QUERY'?new Promise(resolve=>{globalThis.releaseToggleQuery=()=>toggleSend(r).then(resolve);}):toggleSend(r);});
   try{if(await f.locator('#check-text').isVisible())await f.getByRole('button',{name:'返回',exact:true}).click();await surfaceClick(f,'#refresh');await eventually(()=>f.evaluate(()=>typeof releaseToggleQuery==='function'));await orb.click();await page.locator('#blur').focus();await page.keyboard.press('Tab');await page.keyboard.press('Escape');await page.waitForTimeout(150);assert.equal(card(),f);assert.equal(await f.locator('#close').isDisabled(),true);}
   finally{await f.evaluate(()=>{chrome.runtime.sendMessage=toggleSend;if(typeof releaseToggleQuery==='function')releaseToggleQuery();});}
   await eventually(()=>f.locator('#refresh').isEnabled());
   await f.evaluate(()=>{chrome.runtime.sendMessage=r=>r.type==='PAIA_PROMPT_SURFACE_RPC'&&r.command?.type==='close'?new Promise(resolve=>{globalThis.releaseToggleClose=()=>toggleSend(r).then(resolve);}):toggleSend(r);});
   await orb.click();await eventually(()=>f.evaluate(()=>typeof releaseToggleClose==='function'));assert.equal(await f.locator('#new').isDisabled(),true);assert.equal(await f.locator('#close').isDisabled(),true);assert.equal(card(),f);await f.evaluate(()=>{chrome.runtime.sendMessage=toggleSend;releaseToggleClose();});await eventually(()=>!card(),'only the authenticated close result destroys the idle frame');await open();
   await page.locator('#blur').focus();await page.keyboard.press('Tab');await page.keyboard.press('Escape');await eventually(()=>!card(),'orb Escape closes idle card');await open();await card().locator('.row').first().locator('.insert').focus();await page.keyboard.press('Escape');await eventually(()=>!card(),'card Escape closes idle card');await open();
  });
  await check('private card stays isolated and first multiline use inserts exactly into the retained draft',async()=>{
   assert.equal(await page.evaluate(()=>document.querySelector('[data-paia-prompt-surface]').shadowRoot),null);
   assert.doesNotMatch(await page.locator('body').textContent(),/PRIVATE_LIBRARY_NEVER_IN_HOST|Only test/);
   assert.equal(await page.evaluate(()=>{try{return !!frames[0].document;}catch{return false;}}),false);
   await page.evaluate(()=>fixture.set('原草稿-A｜B',6));await page.waitForTimeout(60);
   await fill(card());await eventually(()=>card().locator('#status').textContent().then(x=>x.includes('已插入，未发送')));
   assert.equal(await page.evaluate(()=>fixture.text()),'原草稿-A｜'+text+'B');assert.equal(await page.evaluate(()=>document.activeElement.id),'prompt-textarea');
   await page.keyboard.insertText('续');await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>fixture.text()),'原草稿-A｜'+text+'续B');assert.ok(card());
   const f=card(),rows=await f.locator('.row').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.id,y:n.getBoundingClientRect().y})));assert.equal(await f.locator('#status').textContent(),'已插入，未发送。');assert.equal(await f.locator('#status button').count(),0);
   await eventually(()=>f.locator('#status').textContent().then(x=>x===''));assert.equal(await f.locator('#status').isVisible(),false);assert.equal(card(),f);assert.deepEqual(await f.locator('.row').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.id,y:n.getBoundingClientRect().y}))),rows);assert.equal(await f.locator('.row').getByRole('button',{name:text,exact:true,includeHidden:true}).isEnabled(),true,'later deliberate reuse is available after verified feedback without replay');assert.equal(await page.evaluate(()=>fixture.text()),'原草稿-A｜'+text+'续B');
  });
  await check('success feedback timer cannot erase a newer unsaved-edit warning',async()=>{
   const f=card();if(await f.locator('#check-text').isVisible())await f.getByRole('button',{name:'返回',exact:true}).click();await surfaceClick(f,'#refresh');await page.evaluate(()=>fixture.set('timer draft',11));await fill(f);await eventually(()=>f.locator('#status').textContent().then(x=>x==='已插入，未发送。'));
   await surfaceClick(f,'#new');await f.getByRole('textbox',{name:'复用文本'}).fill('unsaved timer test');await clickSurface(f,f.locator('#close'));assert.equal(await f.locator('#status').textContent(),'请先保存或取消编辑。');await page.waitForTimeout(1900);assert.equal(await f.locator('#status').textContent(),'请先保存或取消编辑。');assert.equal(await f.getByRole('textbox',{name:'复用文本'}).inputValue(),'unsaved timer test');await assertStatusAction(f,f.getByRole('button',{name:'取消',exact:true}));await f.getByRole('button',{name:'取消',exact:true}).click();await eventually(()=>f.locator('#refresh').isEnabled());
  });
  await check('approved NIB text axis and action rail retain geometry, reorder and inline editing',async()=>{
   const f=card();if(await f.locator('#check-text').isVisible())await f.getByRole('button',{name:'返回',exact:true}).click();await surfaceClick(f,'#refresh');await eventually(()=>f.locator('#refresh').isEnabled());
   await page.locator('#blur').focus();await page.mouse.move(2,2);const row=f.locator('.row').first(),before=await row.boundingBox();
   assert.equal(await f.locator('#list').evaluate(e=>getComputedStyle(e,'::-webkit-scrollbar').width),'3px');
   const textBefore=await row.locator('.text').boundingBox(),frameBox=await (await f.frameElement()).boundingBox();
   const axisProbe={variant,global:{text:textBefore,frame:frameBox,delta:textBefore.x-frameBox.x},child:await row.evaluate(node=>{const shape=n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {rect:r.toJSON(),paddingLeft:s.paddingLeft,borderLeftWidth:s.borderLeftWidth,transform:s.transform,zoom:s.zoom,display:s.display};};return {text:shape(node.querySelector('.text')),insert:shape(node.querySelector('.insert')),row:shape(node),list:shape(node.parentElement),body:shape(document.body),viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,scrollX,scrollY}};}),owner:await (await f.frameElement()).evaluate(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return {rect:r.toJSON(),clientLeft:node.clientLeft,borderLeftWidth:s.borderLeftWidth,paddingLeft:s.paddingLeft,transform:s.transform,zoom:s.zoom,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,scrollX,scrollY}};})};
   await writeFile(join(receiptDir,variant+'-reference-axis.json'),JSON.stringify(axisProbe,null,2));await page.screenshot({path:join(receiptDir,variant+'-reference-axis.png')});
   // Chromium's cross-frame boundingBox omits the iframe border. Measure
   // child DOM coordinates from the native content origin, then include the
   // owner border once. The physical outer-board target/tolerance is unchanged.
   assert.equal(axisProbe.owner.transform,'none');assert.equal(axisProbe.owner.zoom,'1');
   assert.ok(Math.abs(axisProbe.child.text.rect.x+axisProbe.owner.clientLeft-18)<0.6,'actual text starts at the approved18px outer-board axis');
   assert.equal(await f.locator('#open-search [data-paia-icon="search"]').count(),1);assert.equal(await f.locator('#open-search').getAttribute('aria-label'),'搜索全部档案');
   const rail=await row.locator('.insert,.grip,.copy-shortcut,.edit-shortcut,.more').evaluateAll(nodes=>nodes.map(node=>({kind:node.className,left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right,width:node.getBoundingClientRect().width})));
   assert.deepEqual(rail.map(x=>x.kind),['insert','more']);
   for(let i=1;i<rail.length;i++)assert.ok(rail[i].left>=rail[i-1].right-0.5,'each existing action keeps its own non-overlapping hit target');
   assert.ok(rail[1].width>=32,'the single secondary More action keeps its independent target');

   assert.equal(await row.locator('.more').evaluate(e=>getComputedStyle(e).opacity),'0');
   await row.hover();await page.waitForTimeout(160);assert.deepEqual(await row.boundingBox(),before);assert.deepEqual(await row.locator('.text').boundingBox(),textBefore,'hover never shifts the approved text axis or truncation threshold');
   assert.equal(await row.locator('.more').evaluate(e=>getComputedStyle(e).opacity),'1');
   await row.locator('.more').focus();await page.keyboard.press('Enter');await f.getByRole('button',{name:'编辑',exact:true}).focus();await page.keyboard.press('Enter');assert.equal(await f.locator('#list').isVisible(),true);assert.equal(await f.locator('#list > #editor').count(),1);
   assert.equal(await f.getByRole('textbox',{name:'复用文本'}).inputValue(),text);assert.equal(await f.locator('.row:not(.editing-row)').count(),1);
   await f.getByRole('button',{name:'取消',exact:true}).click();await eventually(()=>f.locator('#refresh').isEnabled());assert.equal(await f.locator('.editing-row').count(),0);
  });
  await check('edit, pin/unpin, hidden recovery, explicit independent delete and no management insertion',async()=>{
   const priorViewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));await page.setViewportSize({width:1280,height:900});
   try{
   const before=await page.evaluate(()=>fixture.text());let f=card();if(await f.locator('#check-text').isVisible())await clickSurface(f,f.getByRole('button',{name:'返回',exact:true}));await surfaceClick(f,'#refresh');const row=f.locator('.row').filter({hasText:secret});await clickSurface(f,row.locator('.more'));await clickSurface(f,f.getByRole('button',{name:'编辑',exact:true}));await f.getByRole('textbox',{name:'复用文本'}).fill('edited synthetic template');await surfaceReady(f);const surfaceBounds=async()=>({frame:await (await f.frameElement()).boundingBox(),entry:await orb.boundingBox()}),normalBefore=await surfaceBounds();assert.equal(normalBefore.frame.width,336);assert.equal(normalBefore.frame.height,312);await clickSurface(f,orb);await clickSurface(f,f.locator('#close'));await surfaceReady(f);const normalAfter=await surfaceBounds();assert.deepEqual(normalAfter,normalBefore,'persistent message keeps normal board and entry rectangles unchanged');await page.setViewportSize({width:780,height:437});await surfaceReady(f);await writeFile(join(receiptDir,variant+'-status-surface-geometry.json'),JSON.stringify({normalBefore,normalAfter,short:await surfaceBounds()},null,2));assert.equal(await f.getByRole('textbox',{name:'复用文本'}).inputValue(),'edited synthetic template');await page.evaluate(()=>{history.pushState({},'',location.pathname+'?editing=1');document.body.append(document.createElement('i'));});await page.waitForTimeout(100);assert.equal(await f.getByRole('textbox',{name:'复用文本'}).inputValue(),'edited synthetic template');await assertStatusAction(f,f.getByRole('button',{name:'保存',exact:true}));await clickSurface(f,f.getByRole('button',{name:'保存',exact:true}));await f.getByRole('button',{name:'edited synthetic template',exact:true}).waitFor();
   await clickSurface(f,f.locator('.row').filter({hasText:'edited synthetic template'}).locator('.more'));await clickSurface(f,f.getByRole('button',{name:'置顶',exact:true}));await eventually(async()=>await f.locator('.row').first().innerText()==='edited synthetic template\n⋯');
   await clickSurface(f,f.locator('.row').first().locator('.more'));await clickSurface(f,f.getByRole('button',{name:'取消置顶',exact:true}));await clickSurface(f,f.locator('.row').filter({hasText:'edited synthetic template'}).locator('.more'));await clickSurface(f,f.getByRole('button',{name:'隐藏',exact:true}));await eventually(()=>f.locator('.row').filter({hasText:'edited synthetic template'}).count().then(n=>n===0));
   await surfaceClick(f,'#hidden');await clickSurface(f,f.locator('.row').filter({hasText:'edited synthetic template'}).locator('.more'));await clickSurface(f,f.getByRole('button',{name:'恢复',exact:true}));await clickSurface(f,f.locator('.row').filter({hasText:'edited synthetic template'}).locator('.more'));await clickSurface(f,f.getByRole('button',{name:'删除',exact:true}));await clickSurface(f,f.getByRole('button',{name:'确认删除',exact:true}));await eventually(()=>f.locator('.row').filter({hasText:'edited synthetic template'}).count().then(n=>n===0));
   assert.equal(await page.evaluate(()=>fixture.text()),before);assert.equal((await rpc(engineering,'PAIA_PROMPT_QUERY',{includeHidden:true})).items.some(x=>x.text==='edited synthetic template'),false);await surfaceClick(f,'#hidden');
   }finally{await page.setViewportSize(priorViewport);}
  });
  await check('new template, keyboard move controls and drag pin retain manual order without inserting',async()=>{
   const f=card(),before=await page.evaluate(()=>fixture.text());await surfaceClick(f,'#new');await f.getByRole('textbox',{name:'复用文本'}).fill('move me synthetic');await clickSurface(f,f.getByRole('button',{name:'保存',exact:true}));await clickSurface(f,f.locator('.row').filter({hasText:'move me synthetic'}).locator('.more'));await f.getByRole('button',{name:'上移',exact:true}).focus();await page.keyboard.press('Enter');
   await eventually(async()=>await f.locator('.row').first().innerText()==='move me synthetic\n⋯');assert.equal((await rpc(engineering,'PAIA_PROMPT_QUERY')).items[0].pinned,true);
   const moving=f.locator('.row').filter({hasText:text});await clickSurface(f,moving.locator('.more'));const dragControl=f.locator('.tools .handle');await eventually(()=>dragControl.isEnabled(),'original More drag handle enabled after pin/refresh settles');await f.waitForFunction(()=>!document.documentElement.hasAttribute('data-layout-pending'));await f.evaluate(()=>{globalThis.dragTrace=[];for(const kind of ['pointerdown','pointermove','pointerup'])document.addEventListener(kind,e=>dragTrace.push({kind,trusted:e.isTrusted,x:e.clientX,y:e.clientY,target:e.target.className,disabled:e.target.disabled}),true);});const handle=dragControl,from=await handle.boundingBox(),to=await f.locator('.row').first().boundingBox();await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(to.x+20,to.y+10,{steps:8});await page.mouse.up();await writeFile(join(receiptDir,variant+'-manual-drag-trace.json'),JSON.stringify(await f.evaluate(()=>({events:dragTrace,rows:[...document.querySelectorAll('.row')].map(n=>({id:n.dataset.id,text:n.textContent,box:n.getBoundingClientRect().toJSON()}))})),null,2));
   await eventually(async()=>await f.locator('.row').first().getAttribute('data-id')===a.id);assert.equal(await f.locator('.row').first().locator('.text').textContent(),text);const q=await rpc(engineering,'PAIA_PROMPT_QUERY');assert.equal(q.items[0].id,a.id);assert.equal(q.items[0].pinned,true);assert.equal(await page.evaluate(()=>fixture.text()),before);
  });
  await check('older failed background query cannot erase a newer explicit refresh',async()=>{
   const f=card();if(await f.locator('#check-text').isVisible())await f.getByRole('button',{name:'返回',exact:true}).click();await surfaceClick(f,'#refresh');await eventually(()=>f.locator('#refresh').isEnabled());
   await f.evaluate(()=>{globalThis.originalPromptSend=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.holdOneQuery=true;chrome.runtime.sendMessage=request=>{if(request?.command?.type==='PAIA_PROMPT_QUERY'&&globalThis.holdOneQuery){globalThis.holdOneQuery=false;return new Promise(resolve=>{globalThis.failOlderQuery=()=>resolve({ok:false,error:'MEMORY_STALE'});});}return globalThis.originalPromptSend(request);};});
   await engineering.evaluate(()=>chrome.runtime.sendMessage({type:'PAIA_PROMPT_CHANGED'}));await f.waitForFunction(()=>typeof globalThis.failOlderQuery==='function');
   if(await f.locator('#check-text').isVisible())await f.getByRole('button',{name:'返回',exact:true}).click();await surfaceClick(f,'#refresh');await eventually(()=>f.getByRole('button',{name:text,exact:true}).isEnabled());const ids=await f.locator('.row').evaluateAll(rows=>rows.map(r=>r.dataset.id));assert.equal(ids.length,2);
   await f.evaluate(async()=>{globalThis.failOlderQuery();await new Promise(resolve=>setTimeout(resolve,0));chrome.runtime.sendMessage=globalThis.originalPromptSend;});
   assert.deepEqual(await f.locator('.row').evaluateAll(rows=>rows.map(r=>r.dataset.id)),ids);assert.doesNotMatch(await f.locator('#status').textContent(),/内容已变化/);
  });
  await check('split correction uses selected historical expressions without changing archive bodies',async()=>{
   await h.archive.evaluate(async()=>{const {OrganizerStore}=await import('../core/organizer/store.js');const s=new OrganizerStore(chrome.storage.local);await s.finishFoundation();for(const [i,text]of ['解释这个算法','请解释这个算法'].entries())await s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'surface-synthetic-history',url:'https://chatgpt.com/c/surface-synthetic-history',title:'Synthetic'},messages:[{sourceMessageId:'surface-'+i,pageOrder:i+1,originalText:text}]});});
   const before=(await h.state()).records;assert.equal(before.length,2);
   // Direct fixture capture runs outside the worker's queue. Establish the complete
   // production projection before the explicit UI snapshot refresh.
   let ready;await eventually(async()=>{const r=await engineering.evaluate(()=>chrome.runtime.sendMessage({type:'PAIA_PROMPT_QUERY'}));if(!r.ok){assert.equal(r.error,'MEMORY_STALE','only a concurrent fixture projection may delay readiness');return false;}ready=r.data;return ready.items.find(x=>x.text.includes('解释这个算法'))?.members.length===2;},'both captured inputs must be in the production family before refreshing the card');const family=ready.items.find(x=>x.text.includes('解释这个算法'));assert.equal(family.members.length,2);
   // Hold a real owner reply after reading qualified members, then invalidate
   // the open chooser through the production message listener. Late bodies
   // must remain absent; cancellation must also work before any reply arrives.
   const splitFrame=card();await surfaceClick(splitFrame,'#refresh');
   for(const action of ['invalidate','cancel']){
    await splitFrame.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.restoreSplitSend=()=>{chrome.runtime.sendMessage=send;};chrome.runtime.sendMessage=async request=>{const result=await send(request);if(request?.command?.type==='members')return new Promise(resolve=>{globalThis.releaseSplitMembers=()=>resolve(result);});return result;};});
    await clickSurface(splitFrame,splitFrame.locator('.row').filter({hasText:'解释这个算法'}).locator('.more'));await clickSurface(splitFrame,splitFrame.getByRole('button',{name:'拆分',exact:true}));
    await splitFrame.waitForFunction(()=>typeof globalThis.releaseSplitMembers==='function');
    assert.equal(await splitFrame.getByRole('button',{name:'取消',exact:true}).isEnabled(),true);assert.equal(await splitFrame.locator('#editor input[type=checkbox]').count(),0);
    if(action==='invalidate'){
     await engineering.evaluate(()=>chrome.runtime.sendMessage({type:'PAIA_PROMPT_CHANGED'}));
     await eventually(()=>splitFrame.locator('#editor').textContent().then(text=>text.includes('原文已变化')),'original split listener invalidated the current choice');
    }else await clickSurface(splitFrame,splitFrame.getByRole('button',{name:'取消',exact:true}));
    await splitFrame.evaluate(async()=>{globalThis.releaseSplitMembers();delete globalThis.releaseSplitMembers;globalThis.restoreSplitSend();await new Promise(resolve=>setTimeout(resolve,0));});
    assert.equal(await splitFrame.locator('#editor input[type=checkbox]').count(),0);assert.doesNotMatch(await splitFrame.locator('#editor').textContent(),/解释这个算法/);
    if(action==='invalidate'){assert.equal(await splitFrame.getByRole('button',{name:'拆分',exact:true}).isDisabled(),true);await clickSurface(splitFrame,splitFrame.getByRole('button',{name:'取消',exact:true}));}
    await surfaceReady(splitFrame);
   }
   const f=card();if(await f.locator('#check-text').isVisible())await f.getByRole('button',{name:'返回',exact:true}).click();await surfaceClick(f,'#refresh');await eventually(()=>f.locator('#refresh').isEnabled());assert.equal(await f.locator('.row').filter({hasText:'解释这个算法'}).count(),1,JSON.stringify({status:await f.locator('#status').textContent(),rows:await f.locator('.row').allTextContents()}));await clickSurface(f,f.locator('.row').filter({hasText:'解释这个算法'}).locator('.more'));await clickSurface(f,f.getByRole('button',{name:'拆分',exact:true}));await f.locator('#editor input[type=checkbox]').first().waitFor({state:'visible'});await surfaceReady(f);await f.locator('#editor input[type=checkbox]').first().check();await clickSurface(f,f.getByRole('button',{name:'拆分',exact:true}));await eventually(()=>f.locator('#editor').isHidden());await surfaceReady(f);assert.equal((await rpc(engineering,'PAIA_PROMPT_QUERY')).items.filter(x=>x.text.includes('解释这个算法')).length,2);assert.deepEqual((await h.state()).records,before);
  });
  await check('worker restart, SPA and page reload preserve durable templates without duplicate surface',async()=>{
   await h.restartWorker();await surfaceClick(card(),'#refresh');await card().locator('.row').first().waitFor();
   await page.evaluate(()=>{history.pushState({},'', '/c/prompt-insertion-fixture?route=project');document.body.append(document.createElement('i'));});await eventually(()=>card()?.url().includes('prompt-surface.html#'));await page.waitForTimeout(150);assert.equal(await orb.count(),1);
   trace('case10-before-goto');traceLifecycle('case10-before-goto-lifecycle');await page.goto(url);trace('case10-after-goto');traceLifecycle('case10-after-goto-lifecycle');await arrange(page);await orb.waitFor({state:'visible'});await open();assert.equal(await orb.count(),1);assert.ok((await rpc(engineering,'PAIA_PROMPT_QUERY')).items.find(x=>x.text==='move me synthetic'));
   await world.cdp.detach();world=await isolated(page,h.extensionId);
  });
  await check('second tab and actual tab discard restore their own surface and draft target',async()=>{
   const second=await h.context.newPage();await second.goto(url+'#second-tab');await arrange(second);await second.waitForFunction(()=>!!globalThis.fixture?.view);await second.locator('[data-paia-prompt-surface]').waitFor({state:'visible'});await page.evaluate(()=>fixture.set('first-tab-draft',15));await second.evaluate(()=>fixture.set('second-tab-draft',16));
   let sf=second.frames().find(f=>f.url().includes('prompt-surface.html#'));if(!sf){await second.locator('[data-paia-prompt-surface]').click();await eventually(()=>!!second.frames().find(f=>f.url().includes('prompt-surface.html#')),'second tab opens its own card');sf=second.frames().find(f=>f.url().includes('prompt-surface.html#'));}const secondCard=()=>second.frames().find(f=>f.url().includes('prompt-surface.html#'));sf=await readyCard(secondCard);await surfaceReady(sf);const firstFrame=card();await second.locator('[data-paia-prompt-surface]').click();await eventually(()=>!second.frames().some(f=>f.url().includes('prompt-surface.html#')),'second tab closes its own card');assert.equal(card(),firstFrame);await second.locator('[data-paia-prompt-surface]').click();await eventually(()=>!!second.frames().find(f=>f.url().includes('prompt-surface.html#')),'second tab opens its own card');sf=await readyCard(secondCard);await surfaceReady(sf);await fill(sf);await eventually(()=>sf.locator('#status').textContent().then(x=>x.includes('已插入')),'second tab insertion acknowledges its own selected draft');assert.equal(await page.evaluate(()=>fixture.text()),'first-tab-draft');assert.equal(await second.evaluate(()=>fixture.text()),'second-tab-draft'+text);
   await page.bringToFront();const worker=h.context.serviceWorkers().find(w=>w.url().endsWith('/background/service-worker.js'));const tabs=await worker.evaluate(()=>chrome.tabs.query({url:'https://chatgpt.com/*'}));const inactive=tabs.find(x=>x.url===url+'#second-tab');assert.ok(inactive&&!inactive.active);const discarded=await worker.evaluate(id=>chrome.tabs.discard(id),inactive.id);assert.equal(discarded.discarded,true);await worker.evaluate(id=>chrome.tabs.update(id,{active:true}),discarded.id);await eventually(()=>h.context.pages().some(p=>!p.isClosed()&&p.url()===url+'#second-tab'));const restored=h.context.pages().find(p=>!p.isClosed()&&p.url()===url+'#second-tab');await restored.waitForFunction(()=>!!globalThis.fixture?.view);await arrange(restored);await restored.locator('[data-paia-prompt-surface]').waitFor({state:'visible'});assert.equal(await restored.locator('[data-paia-prompt-surface]').count(),1);await restored.close();await page.bringToFront();
  });
  await check('current/last selection, native IME and uncertain outcome keep one-shot safety through the real card',async()=>{
   let f=card();if(await f.locator('#check-text').isVisible())await f.getByRole('button',{name:'返回',exact:true}).click();await surfaceClick(f,'#refresh');await page.evaluate(()=>fixture.set('ABCDE',1,4));await page.waitForTimeout(60);await fill(f);await eventually(()=>f.locator('#status').textContent().then(x=>x.includes('已插入')));assert.equal(await page.evaluate(()=>fixture.text()),'ABCD'+text+'E');
   if(await f.locator('#check-text').isVisible())await f.getByRole('button',{name:'返回',exact:true}).click();await surfaceClick(f,'#refresh');await page.evaluate(()=>fixture.set(''));await page.evaluate(()=>{fixture.ended=0;document.getElementById('prompt-textarea').addEventListener('compositionend',()=>fixture.ended++);});const cdp=await h.context.newCDPSession(page);await cdp.send('Input.imeSetComposition',{text:'汉',selectionStart:1,selectionEnd:1});await fill(f);await eventually(()=>f.locator('#status').textContent().then(x=>!x.includes('正在插入')));assert.notEqual(await page.evaluate(()=>fixture.text()),text);await page.locator('#prompt-textarea').focus();await cdp.send('Input.insertText',{text:'汉'});await page.waitForTimeout(70);assert.ok((await page.evaluate(()=>fixture.text())).includes('汉'));await cdp.detach();
   if(await f.locator('#check-text').isVisible())await f.getByRole('button',{name:'返回',exact:true}).click();await surfaceClick(f,'#refresh');await page.evaluate(()=>fixture.set('draft',5));await world.run("globalThis.nativeCommand=document.execCommand.bind(document);globalThis.__promptUncertainCalls=0;document.execCommand=(...args)=>{++globalThis.__promptUncertainCalls;nativeCommand(...args);return false;}");await fill(f);await eventually(()=>f.locator('#status').textContent().then(x=>x.includes('未确认')));assert.equal(await world.run('globalThis.__promptUncertainCalls'),1,'uncertain insertion attempts exactly one native command');assert.equal(await page.evaluate(()=>fixture.text()),'draft'+text);assert.equal(await f.locator('.row').getByRole('button',{name:text,exact:true,includeHidden:true}).isDisabled(),true);await world.run('document.execCommand=nativeCommand;');await page.waitForTimeout(1900);assert.match(await f.locator('#status').textContent(),/未确认/);assert.equal(await page.evaluate(()=>fixture.text()),'draft'+text);
   await assertStatusAction(f,f.getByRole('button',{name:'复制',exact:true}),true);await f.getByRole('button',{name:'复制',exact:true}).click();await eventually(()=>f.locator('#status').textContent().then(x=>/已复制|未能复制/.test(x)));assert.match(await f.locator('#status').textContent(),/已复制|未能复制/);
   if(await f.locator('#check-text').isVisible())await f.getByRole('button',{name:'返回',exact:true}).click();await surfaceClick(f,'#refresh');await page.evaluate(()=>fixture.set('failed draft',12));await world.run('document.execCommand=()=>false;');await fill(f);await eventually(()=>f.locator('#status').textContent().then(x=>x.includes('无法安全插入')));await world.run('document.execCommand=nativeCommand;');await page.waitForTimeout(1900);assert.equal(await page.evaluate(()=>fixture.text()),'failed draft');assert.equal(await f.locator('.row').getByRole('button',{name:text,exact:true,includeHidden:true}).isDisabled(),true);assert.equal(await f.getByRole('button',{name:'复制',exact:true}).isVisible(),true);await assertStatusAction(f,f.getByRole('button',{name:'复制',exact:true}),true);await f.getByRole('button',{name:'复制',exact:true}).click();await eventually(()=>f.locator('#status').textContent().then(x=>/已复制|未能复制/.test(x)));
  });
  await check('light/dark, long scroll, 320px, 200% text, coarse input, keyboard and reduced motion remain bounded',async()=>{
   await leaveSurfaceCheck(card());
   for(let i=0;i<6;i++){const q=await rpc(engineering,'PAIA_PROMPT_QUERY');await rpc(engineering,'PAIA_PROMPT_CHANGE',{change:{action:'create',revision:q.revision,text:'长段落 '+i+'\n'+('保留完整内容和代码 `a !== b`。Unicode 🙂 English.\n').repeat(3)}});}await surfaceClick(card(),'#refresh');await eventually(()=>card().locator('.row').count().then(n=>n===10));assert.ok(await card().locator('#list').evaluate(e=>e.scrollHeight>e.clientHeight));await card().locator('.row').last().scrollIntoViewIfNeeded();assert.equal(await card().locator('.row').last().isVisible(),true);await card().locator('#list').evaluate(e=>e.scrollTop=0);
   for(const theme of ['light','dark'])for(const width of [1280,320]){await page.setViewportSize({width,height:800});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.waitForTimeout(120);const f=card();if(await f.locator('#check-text').isVisible())await f.getByRole('button',{name:'返回',exact:true}).click();await surfaceClick(f,'#refresh');await f.locator('.row').first().waitFor();assert.ok(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await f.evaluate(()=>document.scrollingElement.scrollTop),0,'footer focus must not shift card contents');assert.ok(await f.evaluate(()=>document.querySelector('#list').clientHeight>0));await openSurfaceTools(f);await surfaceReady(f);assert.ok(await f.locator('#new').evaluate(e=>e.getBoundingClientRect().height>=44));await clickSurface(f,f.locator('#surface-more'));await settleSurface(f);const path=join(receiptDir,variant+'-'+theme+'-'+width+'.png');await page.screenshot({path});screens.push(path.split('/').at(-1));}
   await card().evaluate(()=>document.documentElement.style.fontSize='28px');await page.screenshot({path:join(receiptDir,variant+'-200-percent.png')});screens.push(variant+'-200-percent.png');assert.ok(await card().evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await card().locator('#close').focus();await page.keyboard.press('Enter');await eventually(()=>!card());await orb.click();await eventually(()=>!!card(),'explicit pointer click reopens before coarse-input checks');await open();
   const cdp=await h.context.newCDPSession(page),frameCdp=await h.context.newCDPSession(card());
   for(const session of [cdp,frameCdp])await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
   await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
   assert.equal(await card().evaluate(()=>matchMedia('(pointer:coarse)').matches),true);
   assert.equal(await card().locator('#surface-more').evaluate(e=>getComputedStyle(e).opacity),'1');
   const more=await card().locator('.more').first().boundingBox();assert.ok(more.width>=44&&more.height>=44);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:more.x+more.width/2,y:more.y+more.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await card().getByRole('button',{name:'编辑',exact:true}).waitFor();
   for(const session of [cdp,frameCdp]){await session.send('Emulation.setTouchEmulationEnabled',{enabled:false});await session.detach();}
  });
  await check('native 200% browser zoom keeps the card and management clear of the composer',async()=>{
   await page.setViewportSize({width:1280,height:900});await page.emulateMedia({colorScheme:'light'});await surfaceClick(card(),'#refresh');await eventually(()=>card().locator('#refresh').isEnabled());
   const worker=h.context.serviceWorkers().find(w=>w.url().endsWith('/background/service-worker.js'));
   const tab=await worker.evaluate(async url=>(await chrome.tabs.query({url:'https://chatgpt.com/*'})).find(t=>t.url===url).id,page.url());
   const before=await page.evaluate(()=>({width:innerWidth,dpr:devicePixelRatio}));
   const zoomWorld=await isolated(page,h.extensionId);
   // DPR changes before the content owner's scheduled layout necessarily runs.
   // Observe completion of that real callback; do not invoke layout or change its scheduling.
   await zoomWorld.run(`(()=>{const original=requestAnimationFrame,state={width:null,dpr:null};globalThis.__zoomLayout=state;globalThis.requestAnimationFrame=callback=>original.call(globalThis,time=>{callback(time);if(callback.name==='layout'){state.width=innerWidth;state.dpr=devicePixelRatio;}});__zoomLayout.restore=()=>{globalThis.requestAnimationFrame=original;delete globalThis.__zoomLayout;};})()`);
   try{
    await worker.evaluate(id=>chrome.tabs.setZoom(id,2),tab);assert.equal(await worker.evaluate(id=>chrome.tabs.getZoom(id),tab),2);
    await eventually(()=>zoomWorld.run('({dpr:devicePixelRatio,width:__zoomLayout.width,layoutDpr:__zoomLayout.dpr})').then(value=>value.dpr===before.dpr*2&&value.layoutDpr===before.dpr*2&&value.width===before.width/2),'native zoom and actual Prompt layout completion');
    assert.equal(await page.evaluate(()=>innerWidth),before.width/2);
    const bounds=await page.evaluate(()=>{const form=document.querySelector('form').getBoundingClientRect(),orb=document.querySelector('[data-paia-prompt-surface]').getBoundingClientRect();return {form:{x:form.x,y:form.y,right:form.right,bottom:form.bottom},orb:{x:orb.x,y:orb.y,right:orb.right,bottom:orb.bottom},width:innerWidth,height:innerHeight};});
    const frame=await card().frameElement(),box=await frame.boundingBox();
    const zoomTrace={variant,bounds,box,at:Date.now(),current:await frame.evaluate(node=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};return {width:innerWidth,height:innerHeight,dpr:devicePixelRatio,card:rect(node),style:node.getAttribute('style'),orb:rect(document.querySelector('[data-paia-prompt-surface]')),form:rect(document.querySelector('form'))};})};await writeFile(join(receiptDir,variant+'-zoom-diagnostic.json'),JSON.stringify(zoomTrace,null,2));
    for(const rect of [{x:box.x,y:box.y,right:box.x+box.width,bottom:box.y+box.height},bounds.orb]){assert.ok(rect.x>=0&&rect.y>=0&&rect.right<=bounds.width&&rect.bottom<=bounds.height,JSON.stringify(zoomTrace));assert.ok(rect.bottom<=bounds.form.y||rect.y>=bounds.form.bottom||rect.right<=bounds.form.x||rect.x>=bounds.form.right);}
    assert.ok(await card().evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await surfaceClick(card(),'#new');await card().getByRole('textbox',{name:'复用文本'}).fill('zoom draft');await card().getByRole('button',{name:'取消',exact:true}).click();await eventually(()=>card().locator('#refresh').isEnabled());
    const path=join(receiptDir,variant+'-browser-zoom200.png');await page.screenshot({path});screens.push(path.split('/').at(-1));
   }finally{try{await zoomWorld.run('__zoomLayout.restore()');}finally{await zoomWorld.cdp.detach();await worker.evaluate(id=>chrome.tabs.setZoom(id,1),tab);await eventually(()=>page.evaluate(()=>devicePixelRatio).then(value=>value===before.dpr));}}
  });
  await check('system and explicit PAIA theme transitions keep frame contrast without reordering or losing an edit',async()=>{
   await page.emulateMedia({colorScheme:'light'});await surfaceClick(card(),'#refresh');await eventually(()=>card().locator('#refresh').isEnabled());
   const f=card(),ids=await f.locator('.row').evaluateAll(rows=>rows.map(r=>r.dataset.id));
   const themeReadings=[];
   const expectTheme=async theme=>{
    let actual=null,passed=false;
    try{
     await eventually(()=>orb.getAttribute('data-theme').then(x=>x===theme),'host theme '+theme);
     await eventually(async()=>{
      actual=await f.evaluate(()=>{const candidate=document.querySelector('.row .text'),panel=document.getElementById('card');return {color:getComputedStyle(document.documentElement).color,candidateColor:candidate?getComputedStyle(candidate).color:null,surface:panel?getComputedStyle(panel).backgroundColor:null,frameTheme:document.documentElement.dataset.paiaTheme??null};});
      try{assertThemePalette(actual,theme,approvedThemeAuthority.tokens);return true;}catch{return false;}
     },'approved B frame palette '+theme);
     assert.deepEqual(await f.locator('.row').evaluateAll(rows=>rows.map(r=>r.dataset.id)),ids);passed=true;
    }finally{
     themeReadings.push({requestedTheme:theme,actual,passed});
     await writeFile(join(receiptDir,variant+'-theme-transitions.json'),JSON.stringify({variant,authority:approvedThemeAuthority.identity,readings:themeReadings},null,2));
    }
   };
   for(const theme of ['dark','light','dark','light']){await page.emulateMedia({colorScheme:theme});await expectTheme(theme);}
   await clickSurface(f,f.locator('.row').first().locator('.more'));await clickSurface(f,f.getByRole('button',{name:'编辑',exact:true}));await f.getByRole('textbox',{name:'复用文本'}).fill('unsaved theme transition');
   // An explicit PAIA choice wins over both system media and unrelated host classes.
   await page.emulateMedia({colorScheme:'light'});await rpc(h.archive,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});await expectTheme('dark');assert.equal(await f.getByRole('textbox',{name:'复用文本'}).inputValue(),'unsaved theme transition');
   await page.evaluate(()=>document.documentElement.classList.add('dark'));await rpc(h.archive,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});await expectTheme('light');assert.equal(await f.getByRole('textbox',{name:'复用文本'}).inputValue(),'unsaved theme transition');await page.evaluate(()=>document.documentElement.classList.remove('dark'));await rpc(h.archive,'UPDATE_PREFERENCES',{changes:{appearance:'system'}});await f.getByRole('button',{name:'取消',exact:true}).click();
  });
  await check('fixed entry retains pointer/keyboard ownership, legacy metadata and whole-surface lifecycle',async()=>{
   await page.setViewportSize({width:1280,height:900});await open();await page.evaluate(()=>fixture.set('DRAG_DRAFT_UNCHANGED',4));await page.waitForTimeout(80);
   const bounds=async()=>({orb:await orb.boundingBox(),card:await (await card().frameElement()).boundingBox()});
   const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1,label+': '+a+' vs '+b);
   const attached=async()=>{assert.ok(card(),'card stays open');const b=await bounds();near(b.orb.x,b.card.x+b.card.width-44,'attached x');near(b.orb.y,b.card.y+b.card.height,'entry below board without candidate overlap');return b;};
   const saved=()=>engineering.evaluate(async()=> (await chrome.storage.local.get('promptSurfaceV1')).promptSurfaceV1);
   // Seed a distinct legacy coordinate through the real authenticated owner.
   // A native key must persist its compatible metadata without moving the shell.
   const seedWorld=await isolated(page,h.extensionId);try{const seeded=await seedWorld.run(`(async()=>{const read=await chrome.runtime.sendMessage({type:'PAIA_PROMPT_SURFACE_HOST'});if(!read.ok)return read;const {displayPreferences,...state}=read.data;return chrome.runtime.sendMessage({type:'PAIA_PROMPT_SURFACE_HOST',state:{...state,position:{x:.2,y:.3}}});})()`);assert.equal(seeded.ok,true);assert.deepEqual(seeded.data.position,{x:.2,y:.3});}finally{await seedWorld.cdp.detach();}
   await page.locator('#blur').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-paia-prompt-surface')),true);
   const anchorTrace={variant,platform:process.platform,steps:[]};
   const anchorState=async()=>({bounds:await bounds(),saved:await saved(),focus:await page.evaluate(()=>({documentFocused:document.hasFocus(),orbFocused:document.activeElement?.hasAttribute('data-paia-prompt-surface')===true,width:innerWidth,height:innerHeight,dpr:devicePixelRatio}))});
   await page.evaluate(()=>{globalThis.__anchorKeys=[];globalThis.__anchorKeyListener=event=>{if(event.target?.hasAttribute('data-paia-prompt-surface'))__anchorKeys.push({key:event.key,alt:event.altKey,trusted:event.isTrusted,prevented:event.defaultPrevented});};document.addEventListener('keydown',__anchorKeyListener);});
   try{
    anchorTrace.before=await anchorState();
    for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']){await page.keyboard.press('Alt+'+key);anchorTrace.steps.push({key,state:await anchorState()});}
    await eventually(async()=>{const b=await attached(),v=await saved();return b.orb.x===anchorTrace.before.bounds.orb.x&&b.orb.y===anchorTrace.before.bounds.orb.y&&v.position&&Math.abs(v.position.x*1236-b.orb.x)<1&&Math.abs(v.position.y*856-b.orb.y)<1;},'native keyboard changes legacy metadata while the fixed entry does not move');
    assert.notDeepEqual((await saved()).position,{x:.2,y:.3});assert.deepEqual(await bounds(),anchorTrace.before.bounds);
    const events=(await page.evaluate(()=>__anchorKeys)).filter(event=>['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key));assert.deepEqual(events.map(event=>event.key),anchorTrace.steps.map(step=>step.key));for(const event of events){assert.equal(event.trusted,true);assert.equal(event.alt,true);assert.equal(event.prevented,true);}assert.equal(await page.evaluate(()=>document.activeElement?.hasAttribute('data-paia-prompt-surface')),true,'native anchor setup retains orb focus');anchorTrace.result='PASS';
   }catch(error){anchorTrace.result='FAIL';anchorTrace.error=error.message;throw error;}
   finally{anchorTrace.after=await anchorState();anchorTrace.events=await page.evaluate(()=>{document.removeEventListener('keydown',__anchorKeyListener);const events=__anchorKeys;delete globalThis.__anchorKeyListener;delete globalThis.__anchorKeys;return events;});await writeFile(join(receiptDir,variant+'-native-anchor.json'),JSON.stringify(anchorTrace,null,2));}
   await page.evaluate(()=>{globalThis.orbPointerTrace=[];for(const type of ['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture'])document.addEventListener(type,e=>orbPointerTrace.push({type,trusted:e.isTrusted,x:e.clientX,y:e.clientY,buttons:e.buttons,target:e.target.tagName,surface:e.target.hasAttribute?.('data-paia-prompt-surface')}),true);});
   const initial=await attached(),sameFrame=card();await page.mouse.move(initial.orb.x+22,initial.orb.y+22);await page.mouse.down();
   assert.deepEqual(await bounds(),initial,'pointerdown does not jump');
   await page.mouse.move(initial.orb.x+14,initial.orb.y+16);await eventually(async()=>await (await sameFrame.frameElement()).evaluate(e=>getComputedStyle(e).pointerEvents)==='none','the native drag crosses the original gesture threshold');let b=await attached();near(b.orb.x,initial.orb.x,'drag cannot move the fixed entry x');near(b.orb.y,initial.orb.y,'vertical safe anchor stays fixed');near(b.card.x,initial.card.x,'drag cannot move the fixed board x');near(b.card.y,initial.card.y,'card stays bottom anchored');near(b.card.height,initial.card.height,'card height stays stable');assert.equal(card(),sameFrame);assert.equal(await (await sameFrame.frameElement()).evaluate(e=>getComputedStyle(e).pointerEvents),'none','only the moved orb gesture disables iframe hit testing');
   for(const [dx,dy]of [[-40,-20],[-80,-50],[-120,-80]]){await page.mouse.move(initial.orb.x+22+dx,initial.orb.y+22+dy);await writeFile(join(receiptDir,variant+'-orb-pointer-trace.json'),JSON.stringify(await page.evaluate(()=>orbPointerTrace),null,2));await eventually(async()=>await (await sameFrame.frameElement()).evaluate(e=>getComputedStyle(e).pointerEvents)==='none','original native drag remains active '+dx);b=await attached();near(b.orb.x,initial.orb.x,'fixed pointer target x');near(b.orb.y,initial.orb.y,'vertical pointer motion retains safe band');assert.equal(card(),sameFrame);}
   await page.mouse.up();const moved=await attached();assert.equal(await (await sameFrame.frameElement()).evaluate(e=>getComputedStyle(e).pointerEvents),'auto','native release restores iframe interaction');await eventually(async()=>{const v=await saved();return v?.open&&v.position&&Math.abs(v.position.x*1236-moved.orb.x)<1&&Math.abs(v.position.y*856-moved.orb.y)<1;});
   assert.equal(await page.evaluate(()=>fixture.text()),'DRAG_DRAFT_UNCHANGED');assert.equal(await page.evaluate(()=>fixture.send),0);assert.equal(await page.evaluate(()=>fixture.enter),0);
   await orb.click();await eventually(()=>!card(),'ordinary click after true drag closes');near((await orb.boundingBox()).x,moved.orb.x,'closed anchor x');near((await orb.boundingBox()).y,moved.orb.y,'closed anchor y');await open();assert.deepEqual(await attached(),moved);
   await page.reload();await arrange(page);await page.waitForFunction(()=>!!globalThis.fixture?.view);await orb.waitFor({state:'visible'});assert.equal(card(),undefined,'new document begins collapsed');await open();trace('case16-reload-before-geometry',{frame:frameId(card()),animations:await (await card().frameElement()).evaluate(e=>e.getAnimations().map(a=>({currentTime:a.currentTime,playState:a.playState,timing:a.effect?.getComputedTiming()}))),geometry:await bounds()});assert.deepEqual(await attached(),moved);
   const restartTrace=[];let restartFailure=false;
   const restartState=async phase=>{const f=card();restartTrace.push({phase,framePresent:!!f,refreshEnabled:f?await f.locator('#refresh').isEnabled():null,closeEnabled:f?await f.locator('#close').isEnabled():null,rows:f?await f.locator('.row').count():0,savedOpen:(await saved())?.open===true});};
   try{
    await page.evaluate(()=>{history.pushState({},'',location.pathname+'?drag-route=1');document.body.append(document.createElement('i'));});await page.waitForTimeout(80);assert.deepEqual(await attached(),moved);
    await h.restartWorker();const refreshed=card();await surfaceClick(refreshed,'#refresh');await restartState('refresh-requested');
    // Existing rows remain visible during refresh; the real card refuses closure
    // while busy, as the held-RPC refusal case above verifies explicitly.
    await eventually(()=>refreshed.locator('#refresh').isEnabled(),'Prompt refresh finishes after worker restart');await refreshed.locator('.row').first().waitFor();await restartState('refresh-ready');assert.deepEqual(await attached(),moved);assert.equal((await saved()).open,true);
    await orb.click();await eventually(()=>!card(),'toggle after SPA and worker restart');await restartState('closed');await eventually(async()=>(await saved()).open===false);assert.deepEqual(await orb.boundingBox(),moved.orb);await open();assert.deepEqual(await attached(),moved);await eventually(async()=>(await saved()).open===true);
    // Reach the production closed-shadow handle through native keyboard traversal.
    b=await attached();await page.locator('#blur').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-paia-prompt-surface')),true);await page.keyboard.press('Alt+ArrowLeft');await page.waitForTimeout(60);const keyed=await attached();near(keyed.orb.x,b.orb.x,'keyboard retains fixed entry');near(keyed.card.x,b.card.x,'keyboard retains fixed board');near(keyed.orb.y,b.orb.y,'keyboard retains fixed entry y');
    await eventually(async()=>Math.abs((await saved()).position.x*1236-keyed.orb.x)<1,'keyboard position persists after SPA and worker restart');
   }catch(error){restartFailure=true;await restartState('failed').catch(()=>{});await writeFile(join(receiptDir,variant+'-restart-state.json'),JSON.stringify({variant,status:'FAIL',trace:restartTrace})).catch(()=>{});throw error;}
   finally{try{await page.evaluate(url=>history.replaceState({},'',url),url);}catch(error){if(!restartFailure)throw error;}}
   const safe=async()=>{const now=await attached(),f=await page.locator('form').boundingBox(),size=page.viewportSize();for(const r of [now.orb,now.card]){assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=size.width&&r.y+r.height<=size.height);assert.ok(r.y+r.height<=f.y||r.y>=f.y+f.height||r.x+r.width<=f.x||r.x>=f.x+f.width,'whole surface excludes composer including send/voice');}return now;};
   for(const [x,y]of [[1,1],[1279,899]]){b=await attached();await page.mouse.move(b.orb.x+22,b.orb.y+22);await page.mouse.down();await page.mouse.move(x,y,{steps:6});await page.mouse.up();await page.waitForTimeout(60);await safe();assert.equal((await saved()).open,true);}
   const narrow=await page.addStyleTag({content:'form{left:600px;right:16px}'});await page.waitForTimeout(60);b=await attached();await page.mouse.move(b.orb.x+22,b.orb.y+22);await page.mouse.down();await page.mouse.move(422,522,{steps:8});await page.mouse.up();await page.waitForTimeout(60);const side=await safe();const composerBox=await page.locator('form').boundingBox();near(side.orb.x+44,composerBox.x+composerBox.width-4,'narrow composer retains shared right edge');near(side.card.y+side.card.height,composerBox.y-56,'board sits above the same fixed entry');await narrow.evaluate(e=>e.remove());await page.waitForTimeout(60);
   await page.setViewportSize({width:320,height:844});await page.waitForTimeout(80);await safe();await page.setViewportSize({width:1280,height:900});await page.waitForTimeout(80);await safe();
   assert.equal(await page.evaluate(()=>fixture.text()),'');assert.equal(await page.evaluate(()=>fixture.send),0);assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);await page.evaluate(url=>history.replaceState({},'',url),url);
  });
  await check('Settings style, details and actual position-reset clicks preserve the concurrent Prompt draft and failure focus',async()=>{await openSurfaceTools(card());await surfaceReady(card());await settingsPromptPositionEvidence({h,page,card,orb,rpc,engineering});});
  await check('Settings reset retains a composing frame while a tall composer makes geometry unavailable',async()=>{
   await page.setViewportSize({width:1280,height:900});await open();
   let tall;
   const saved=()=>h.archive.evaluate(async()=> (await chrome.storage.local.get('promptSurfaceV1')).promptSurfaceV1);
   const f=card(),draft='unsaved lateral reset draft 中文 🙂';let cdp,resetWorld;
   try{
    await page.locator('#blur').focus();await page.keyboard.press('Tab');await page.keyboard.press('Alt+ArrowLeft');
    await eventually(async()=>!!(await saved()).position,'native key supplies compatible position metadata before reset');
    const geometry=await saved(),families=await rpc(engineering,'PAIA_PROMPT_QUERY',{includeHidden:true}),records=(await h.state()).records;
    resetWorld=await isolated(page,h.extensionId);await resetWorld.run("globalThis.resetPositionSeen=0;globalThis.resetPositionListener=r=>{if(r.type==='PAIA_PROMPT_SURFACE_POSITION_RESET')resetPositionSeen=r.positionGeneration;};chrome.runtime.onMessage.addListener(resetPositionListener);");
    await surfaceClick(f,'#new');const edit=f.getByRole('textbox',{name:'复用文本',includeHidden:true});await edit.fill(draft);await edit.focus();
    await edit.evaluate(node=>{globalThis.resetComposition={start:0,end:0};node.addEventListener('compositionstart',()=>resetComposition.start++);node.addEventListener('compositionend',()=>resetComposition.end++);});
    cdp=await h.context.newCDPSession(page);await cdp.send('Input.imeSetComposition',{text:'汉',selectionStart:1,selectionEnd:1});
    const editorState=()=>edit.evaluate(node=>({value:node.value,start:node.selectionStart,end:node.selectionEnd,focused:document.activeElement===node,composition:{...resetComposition}}));
    const editor=await editorState(),{focused:initialFocus,...retainedEditor}=editor;const retainedState=async()=>{const {focused,...state}=await editorState();return state;};assert.equal(initialFocus,true);assert.equal(editor.composition.start,1);assert.equal(editor.composition.end,0);assert.equal(editor.focused,true);tall=await page.addStyleTag({content:'form{left:800px;right:80px;top:50px;bottom:50px;box-sizing:border-box}'});await eventually(async()=>await (await f.frameElement()).isHidden());
    assert.deepEqual(await rpc(h.archive,'PAIA_PROMPT_SURFACE_RESET_POSITION'),{status:'reset',changed:true});
    await eventually(async()=>{const state=await saved();return state.position===null&&state.positionGeneration===(geometry.positionGeneration??0)+1;});
    await eventually(()=>resetWorld.run('resetPositionSeen').then(value=>value===(geometry.positionGeneration??0)+1),'the real host receives this reset generation');
    assert.equal(await (await f.frameElement()).isHidden(),true,'insufficient safe band is unavailable without closing the frame');
    assert.equal(card(),f);assert.deepEqual(await retainedState(),retainedEditor);assert.equal((await saved()).open,true);
    assert.deepEqual(await rpc(h.archive,'PAIA_PROMPT_SURFACE_RESET_POSITION'),{status:'reset',changed:false});
    await eventually(()=>resetWorld.run('resetPositionSeen').then(value=>value===(geometry.positionGeneration??0)+2));
    assert.equal(card(),f);assert.deepEqual(await retainedState(),retainedEditor);assert.equal((await saved()).position,null);
    assert.deepEqual(await rpc(engineering,'PAIA_PROMPT_QUERY',{includeHidden:true}),families);assert.deepEqual((await h.state()).records,records);
    assert.equal(await page.evaluate(()=>fixture.send),0);assert.equal(await page.evaluate(()=>fixture.enter),0);
    await tall.evaluate(node=>node.remove());tall=null;await eventually(async()=>await (await f.frameElement()).isVisible());await edit.focus();assert.deepEqual(await editorState(),editor,'same retained editor resumes explicit focus once the safe band is visible');
    const path=join(receiptDir,variant+'-reset-lateral-draft.png');await page.screenshot({path});screens.push(path.split('/').at(-1));
   }finally{
    if(cdp){await cdp.send('Input.insertText',{text:'汉'}).catch(()=>{});await cdp.detach();}
    if(resetWorld){await resetWorld.run('chrome.runtime.onMessage.removeListener(resetPositionListener);delete globalThis.resetPositionListener;delete globalThis.resetPositionSeen;');await resetWorld.cdp.detach();}
    if(tall)await tall.evaluate(node=>node.remove());
    if(await f.locator('#editor').isVisible())await f.getByRole('button',{name:'取消',exact:true}).click();
    await eventually(()=>f.locator('#refresh').isEnabled());
   }
  });
  await check('legacy gesture metadata persists without moving the entry; idle CPU is bounded; no send, Provider, reply capture or site storage',async()=>{
   await card().locator('#close').click();await eventually(()=>!card());const box=await orb.boundingBox();await page.mouse.move(box.x+22,box.y+22);await page.mouse.down();await page.mouse.move(40,60,{steps:8});await page.mouse.up();await page.waitForTimeout(100);assert.equal(card(),undefined);const moved=await orb.boundingBox();assert.deepEqual(moved,box,'legacy drag preserves the exact fixed entry rectangle');
   // Pointerup queues a durable write; visible mount after reload precedes its RAF layout.
   // Complete both original owners instead of treating a 100ms delay as a receipt.
   const positionWorld=await isolated(page,h.extensionId);try{await eventually(async()=>{const reply=await positionWorld.run('chrome.runtime.sendMessage({type:"PAIA_PROMPT_SURFACE_HOST"})'),viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));trace('closed-drag-durable-position-read',{ok:reply.ok,geometry:reply.data});return reply.ok&&reply.data.open===false&&reply.data.position!==null&&Math.abs(reply.data.position.x*(viewport.width-44)-moved.x)<.01&&Math.abs(reply.data.position.y*(viewport.height-44)-moved.y)<.01;},'original HOST confirms the moved closed-orb geometry is durably saved');}finally{await positionWorld.cdp.detach();}
   await page.reload();await arrange(page);await orb.waitFor({state:'visible'});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const restored=await orb.boundingBox();trace('closed-drag-reloaded-position',{moved,restored});assert.ok(Math.abs(restored.x-moved.x)<2&&Math.abs(restored.y-moved.y)<2);
   const cdp=await h.context.newCDPSession(page);await cdp.send('Performance.enable');const metric=async()=>{const {metrics}=await cdp.send('Performance.getMetrics');return Object.fromEntries(metrics.map(x=>[x.name,x.value]));};const before=await metric();await page.waitForTimeout(1500);const after=await metric();assert.ok(after.TaskDuration-before.TaskDuration<.3,'idle 1.5s must not consume 300ms main-thread task CPU');await cdp.detach();
   assert.deepEqual(await page.evaluate(()=>({send:fixture.send,enter:fixture.enter,storage:[localStorage.length,sessionStorage.length]})),{send:0,enter:0,storage:[0,0]});assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.equal(h.historyRequests,0);assert.equal((await h.state()).records.length,2);assert.deepEqual(h.errors,[]);
   await writeFile(join(receiptDir,variant+'.json'),JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),variant,status:failures?'FAIL':'PASS',evidence:'SYNTHETIC_NATIVE_CHROME',screens,idleTaskSeconds:after.TaskDuration-before.TaskDuration,send:0,providerRequests:0}));
  });
 }finally{await Promise.allSettled(diagnosticReads);await writeFile(join(receiptDir,variant+'-navigation-diagnostic.json'),JSON.stringify({variant,failures,trace:navigationTrace},null,2));await diagnosticCDP?.detach().catch(()=>{});await world?.cdp.detach().catch(()=>{});await h.close();}
});
