import {settingsPromptPositionEvidence} from './harness/settings-prompt-position-browser.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {join} from 'node:path';import {mkdir,writeFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';import {routeComposer,isolated} from './harness/prompt-composer.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),url='https://chatgpt.com/c/prompt-insertion-fixture',receiptDir=join(root,'work/prompt-surface');
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
for(const variant of ['source','release'])test('CPV1-09 surface '+variant+' isolated native Chrome',{timeout:240000},async t=>{
 const extensionPath=variant==='source'?root:join(root,'work/current-release');if(variant==='release')execFileSync('python3',['scripts/build_current_release.py'],{cwd:root,stdio:'pipe'});
 let failures=0;const check=(name,fn)=>t.test(name,async()=>{try{await fn();}catch(error){failures++;throw error;}});
 const h=await FakeChatGPT.start({extensionPath,headless:!process.env.DISPLAY,launchThroughPort:true}),screens=[];let world;await mkdir(receiptDir,{recursive:true});
 try{
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();
  const engineering=await h.context.newPage();await engineering.goto('chrome-extension://'+h.extensionId+'/ui/prompt-reuse-test.html');
  const text='请保留引用。\nOnly test.🙂',secret='PRIVATE_LIBRARY_NEVER_IN_HOST';let q=await rpc(engineering,'PAIA_PROMPT_QUERY');
  const a=await rpc(engineering,'PAIA_PROMPT_CHANGE',{change:{action:'create',revision:q.revision,text}});await rpc(engineering,'PAIA_PROMPT_CHANGE',{change:{action:'create',revision:a.revision,text:secret}});
  await routeComposer(h.context,root);const page=await h.context.newPage();page.on('pageerror',e=>h.errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>!!globalThis.fixture?.view);
  const arrange=async p=>{await p.addStyleTag({content:'body{margin:0;min-height:100vh}form{position:fixed;left:16px;right:16px;bottom:16px;border:1px solid #aaa;padding:12px;background:#fafafa}#blur{position:fixed;top:8px;left:8px}@media(prefers-color-scheme:dark){body{background:#1f1f1f;color:#eee}form{background:#292929}}'});};await arrange(page);
  const orb=page.locator('[data-paia-prompt-surface]');await orb.waitFor({state:'visible'});
  const card=()=>page.frames().find(f=>f.url().includes('/ui/prompt-surface.html#'));
  const open=async()=>{if(!card())await orb.click();await eventually(()=>!!card());await card().locator('.row').first().waitFor();await (await card().frameElement()).evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished));});return card();};
  const collapsedBeforeOpen=await orb.boundingBox();await open();await card().locator('#close').click();await eventually(()=>!card());assert.deepEqual(await orb.boundingBox(),collapsedBeforeOpen);await open();world=await isolated(page,h.extensionId);
  await check('orb toggle collapses idle card, preserves anchor and uses native Enter and Space',async()=>{
   // Preserve the user's saved visible anchor across both states (default placement stays unchanged).
   await page.locator('#blur').focus();await page.keyboard.press('Tab');await page.keyboard.press('Alt+ArrowLeft');await page.waitForTimeout(100);
   const anchor=await orb.boundingBox();await orb.click();await eventually(()=>!card(),'idle orb click must collapse');assert.deepEqual(await orb.boundingBox(),anchor);
   await open();assert.deepEqual(await orb.boundingBox(),anchor);
   for(const key of ['Enter','Space']){
    await page.locator('#blur').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-paia-prompt-surface')),true);await page.keyboard.press(key);await eventually(()=>!card(),key+' closes');await page.keyboard.press(key);await eventually(()=>!!card(),key+' reopens');await open();assert.deepEqual(await orb.boundingBox(),anchor);
   }
   // A sub-threshold pointer excursion remains an ordinary click.
   const b=await orb.boundingBox();await page.mouse.move(b.x+22,b.y+22);await page.mouse.down();await page.mouse.move(b.x+24,b.y+24);await page.mouse.up();await eventually(()=>!card(),'short pointer movement still toggles');await open();
  });
  await check('orb, Close and both Escape owners preserve editing, composition and pending work',async()=>{
   const f=card(),draft='unsaved toggle draft\n中文 🙂';await f.locator('#new').click();await f.getByRole('textbox',{name:'复用文本'}).fill(draft);
   for(const gesture of [()=>orb.click(),()=>f.locator('#close').click(),async()=>{await f.getByRole('textbox',{name:'复用文本'}).focus();await page.keyboard.press('Escape');},async()=>{await page.locator('#blur').focus();await page.keyboard.press('Tab');await page.keyboard.press('Escape');}]){
    await gesture();await eventually(()=>f.locator('#status').textContent().then(x=>x==='请先保存或取消编辑。'));assert.equal(card(),f);assert.equal(await f.getByRole('textbox',{name:'复用文本'}).inputValue(),draft);
   }
   await f.getByRole('textbox',{name:'复用文本'}).focus();const cdp=await h.context.newCDPSession(page);await cdp.send('Input.imeSetComposition',{text:'汉',selectionStart:1,selectionEnd:1});await page.keyboard.press('Escape');assert.equal(card(),f);await orb.click();assert.equal(card(),f);assert.match(await f.getByRole('textbox',{name:'复用文本'}).inputValue(),/unsaved toggle draft/);await f.getByRole('textbox',{name:'复用文本'}).focus();await cdp.send('Input.insertText',{text:'汉'});await cdp.detach();
   await f.getByRole('button',{name:'取消',exact:true}).click();await eventually(()=>f.locator('#refresh').isEnabled());
   // Hold the actual frame RPC, rather than replacing the close guard or worker.
   await f.evaluate(()=>{globalThis.toggleSend=chrome.runtime.sendMessage.bind(chrome.runtime);chrome.runtime.sendMessage=r=>r.type==='PAIA_PROMPT_SURFACE_RPC'&&r.command?.type==='PAIA_PROMPT_QUERY'?new Promise(resolve=>{globalThis.releaseToggleQuery=()=>toggleSend(r).then(resolve);}):toggleSend(r);});
   try{await f.locator('#refresh').click();await eventually(()=>f.evaluate(()=>typeof releaseToggleQuery==='function'));await orb.click();await page.locator('#blur').focus();await page.keyboard.press('Tab');await page.keyboard.press('Escape');await page.waitForTimeout(150);assert.equal(card(),f);assert.equal(await f.locator('#close').isDisabled(),true);}
   finally{await f.evaluate(()=>{chrome.runtime.sendMessage=toggleSend;releaseToggleQuery();});}
   await eventually(()=>f.locator('#refresh').isEnabled());
   await f.evaluate(()=>{chrome.runtime.sendMessage=r=>r.type==='PAIA_PROMPT_SURFACE_RPC'&&r.command?.type==='close'?new Promise(resolve=>{globalThis.releaseToggleClose=()=>toggleSend(r).then(resolve);}):toggleSend(r);});
   await orb.click();await eventually(()=>f.evaluate(()=>typeof releaseToggleClose==='function'));assert.equal(await f.locator('#new').isDisabled(),true);assert.equal(await f.locator('#close').isDisabled(),true);assert.equal(card(),f);await f.evaluate(()=>{chrome.runtime.sendMessage=toggleSend;releaseToggleClose();});await eventually(()=>!card(),'only the authenticated close result destroys the idle frame');await open();
   await page.locator('#blur').focus();await page.keyboard.press('Tab');await page.keyboard.press('Escape');await eventually(()=>!card(),'orb Escape closes idle card');await open();await card().locator('.row').first().locator('.insert').focus();await page.keyboard.press('Escape');await eventually(()=>!card(),'card Escape closes idle card');await open();
  });
  await check('private card is a cross-origin frame, prompt-only rows and one-click exact retained draft',async()=>{
   assert.equal(await page.evaluate(()=>document.querySelector('[data-paia-prompt-surface]').shadowRoot),null);
   assert.doesNotMatch(await page.locator('body').textContent(),/PRIVATE_LIBRARY_NEVER_IN_HOST|Only test/);
   assert.equal(await page.evaluate(()=>{try{return !!frames[0].document;}catch{return false;}}),false);
   await page.evaluate(()=>fixture.set('原草稿-A｜B',6));await page.waitForTimeout(60);
   await card().getByRole('button',{name:text,exact:true}).click();await eventually(()=>card().locator('#status').textContent().then(x=>x.includes('已插入，未发送')));
   assert.equal(await page.evaluate(()=>fixture.text()),'原草稿-A｜'+text+'B');assert.equal(await page.evaluate(()=>document.activeElement.id),'prompt-textarea');
   await page.keyboard.insertText('续');await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>fixture.text()),'原草稿-A｜'+text+'续B');assert.ok(card());
   const f=card(),rows=await f.locator('.row').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.id,y:n.getBoundingClientRect().y})));assert.equal(await f.locator('#status').textContent(),'已插入，未发送。');assert.equal(await f.locator('#status button').count(),0);
   await eventually(()=>f.locator('#status').textContent().then(x=>x===''));assert.equal(await f.locator('#status').isVisible(),false);assert.equal(card(),f);assert.deepEqual(await f.locator('.row').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.id,y:n.getBoundingClientRect().y}))),rows);assert.equal(await f.getByRole('button',{name:text,exact:true}).isDisabled(),true);assert.equal(await page.evaluate(()=>fixture.text()),'原草稿-A｜'+text+'续B');
  });
  await check('success feedback timer cannot erase a newer unsaved-edit warning',async()=>{
   const f=card();await f.locator('#refresh').click();await page.evaluate(()=>fixture.set('timer draft',11));await f.getByRole('button',{name:text,exact:true}).click();await eventually(()=>f.locator('#status').textContent().then(x=>x==='已插入，未发送。'));
   await f.locator('#new').click();await f.getByRole('textbox',{name:'复用文本'}).fill('unsaved timer test');await f.locator('#close').click();assert.equal(await f.locator('#status').textContent(),'请先保存或取消编辑。');await page.waitForTimeout(1900);assert.equal(await f.locator('#status').textContent(),'请先保存或取消编辑。');assert.equal(await f.getByRole('textbox',{name:'复用文本'}).inputValue(),'unsaved timer test');await f.getByRole('button',{name:'取消',exact:true}).click();await eventually(()=>f.locator('#refresh').isEnabled());
  });
  await check('visual master management reveal keeps geometry and editing stays inside the same list',async()=>{
   const f=card();await f.locator('#refresh').click();await eventually(()=>f.locator('#refresh').isEnabled());
   await page.locator('#blur').focus();await page.mouse.move(2,2);const row=f.locator('.row').first(),before=await row.boundingBox();
   assert.equal(await f.locator('#list').evaluate(e=>getComputedStyle(e,'::-webkit-scrollbar').width),'3px');
   assert.equal(await row.locator('.more').evaluate(e=>getComputedStyle(e).opacity),'0');
   await row.hover();await page.waitForTimeout(160);assert.deepEqual(await row.boundingBox(),before);
   for(const selector of ['.grip','.edit-shortcut','.more'])assert.equal(await row.locator(selector).evaluate(e=>getComputedStyle(e).opacity),'1');
   await row.locator('.edit-shortcut').focus();await page.keyboard.press('Enter');assert.equal(await f.locator('#list').isVisible(),true);assert.equal(await f.locator('#list > #editor').count(),1);
   assert.equal(await f.getByRole('textbox',{name:'复用文本'}).inputValue(),text);assert.equal(await f.locator('.row:not(.editing-row)').count(),1);
   await f.getByRole('button',{name:'取消',exact:true}).click();await eventually(()=>f.locator('#refresh').isEnabled());assert.equal(await f.locator('.editing-row').count(),0);
  });
  await check('edit, pin/unpin, hidden recovery, explicit independent delete and no management insertion',async()=>{
   const before=await page.evaluate(()=>fixture.text());let f=card();await f.locator('#refresh').click();const row=f.locator('.row').filter({hasText:secret});await row.locator('.more').click();await f.getByRole('button',{name:'编辑',exact:true}).click();await f.getByRole('textbox',{name:'复用文本'}).fill('edited synthetic template');await orb.click();await f.locator('#close').click();assert.equal(await f.getByRole('textbox',{name:'复用文本'}).inputValue(),'edited synthetic template');await page.evaluate(()=>{history.pushState({},'',location.pathname+'?editing=1');document.body.append(document.createElement('i'));});await page.waitForTimeout(100);assert.equal(await f.getByRole('textbox',{name:'复用文本'}).inputValue(),'edited synthetic template');await f.getByRole('button',{name:'保存',exact:true}).click();await f.getByRole('button',{name:'edited synthetic template',exact:true}).waitFor();
   await f.locator('.row').filter({hasText:'edited synthetic template'}).locator('.more').click();await f.getByRole('button',{name:'置顶',exact:true}).click();await eventually(async()=>await f.locator('.row').first().innerText()==='edited synthetic template\n⋯');
   await f.locator('.row').first().locator('.more').click();await f.getByRole('button',{name:'取消置顶',exact:true}).click();await f.locator('.row').filter({hasText:'edited synthetic template'}).locator('.more').click();await f.getByRole('button',{name:'隐藏',exact:true}).click();await eventually(()=>f.locator('.row').filter({hasText:'edited synthetic template'}).count().then(n=>n===0));
   await f.locator('#hidden').click();await f.locator('.row').filter({hasText:'edited synthetic template'}).locator('.more').click();await f.getByRole('button',{name:'恢复',exact:true}).click();await f.locator('.row').filter({hasText:'edited synthetic template'}).locator('.more').click();await f.getByRole('button',{name:'删除',exact:true}).click();await f.getByRole('button',{name:'确认删除',exact:true}).click();await eventually(()=>f.locator('.row').filter({hasText:'edited synthetic template'}).count().then(n=>n===0));
   assert.equal(await page.evaluate(()=>fixture.text()),before);assert.equal((await rpc(engineering,'PAIA_PROMPT_QUERY',{includeHidden:true})).items.some(x=>x.text==='edited synthetic template'),false);await f.locator('#hidden').click();
  });
  await check('new template, keyboard move controls and drag pin retain manual order without inserting',async()=>{
   const f=card(),before=await page.evaluate(()=>fixture.text());await f.locator('#new').click();await f.getByRole('textbox',{name:'复用文本'}).fill('move me synthetic');await f.getByRole('button',{name:'保存',exact:true}).click();await f.locator('.row').filter({hasText:'move me synthetic'}).locator('.more').click();await f.getByRole('button',{name:'上移',exact:true}).focus();await page.keyboard.press('Enter');
   await eventually(async()=>await f.locator('.row').first().innerText()==='move me synthetic\n⋯');assert.equal((await rpc(engineering,'PAIA_PROMPT_QUERY')).items[0].pinned,true);
   const moving=f.locator('.row').filter({hasText:text});await moving.hover();const handle=moving.locator('.grip'),from=await handle.boundingBox(),to=await f.locator('.row').first().boundingBox();await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(to.x+20,to.y+10,{steps:8});await page.mouse.up();
   await eventually(async()=>await f.locator('.row').first().innerText()===text+'\n⋯');const q=await rpc(engineering,'PAIA_PROMPT_QUERY');assert.equal(q.items[0].id,a.id);assert.equal(q.items[0].pinned,true);assert.equal(await page.evaluate(()=>fixture.text()),before);
  });
  await check('older failed background query cannot erase a newer explicit refresh',async()=>{
   const f=card();await f.locator('#refresh').click();await eventually(()=>f.locator('#refresh').isEnabled());
   await f.evaluate(()=>{globalThis.originalPromptSend=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.holdOneQuery=true;chrome.runtime.sendMessage=request=>{if(request?.command?.type==='PAIA_PROMPT_QUERY'&&globalThis.holdOneQuery){globalThis.holdOneQuery=false;return new Promise(resolve=>{globalThis.failOlderQuery=()=>resolve({ok:false,error:'MEMORY_STALE'});});}return globalThis.originalPromptSend(request);};});
   await engineering.evaluate(()=>chrome.runtime.sendMessage({type:'PAIA_PROMPT_CHANGED'}));await f.waitForFunction(()=>typeof globalThis.failOlderQuery==='function');
   await f.locator('#refresh').click();await eventually(()=>f.getByRole('button',{name:text,exact:true}).isEnabled());const ids=await f.locator('.row').evaluateAll(rows=>rows.map(r=>r.dataset.id));assert.equal(ids.length,2);
   await f.evaluate(async()=>{globalThis.failOlderQuery();await new Promise(resolve=>setTimeout(resolve,0));chrome.runtime.sendMessage=globalThis.originalPromptSend;});
   assert.deepEqual(await f.locator('.row').evaluateAll(rows=>rows.map(r=>r.dataset.id)),ids);assert.doesNotMatch(await f.locator('#status').textContent(),/内容已变化/);
  });
  await check('split correction uses selected historical expressions without changing archive bodies',async()=>{
   await h.archive.evaluate(async()=>{const {OrganizerStore}=await import('../core/organizer/store.js');const s=new OrganizerStore(chrome.storage.local);await s.finishFoundation();for(const [i,text]of ['解释这个算法','请解释这个算法'].entries())await s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'surface-synthetic-history',url:'https://chatgpt.com/c/surface-synthetic-history',title:'Synthetic'},messages:[{sourceMessageId:'surface-'+i,pageOrder:i+1,originalText:text}]});});
   const before=(await h.state()).records;assert.equal(before.length,2);
   // Direct fixture capture runs outside the worker's queue. Establish the complete
   // production projection before the explicit UI snapshot refresh.
   let ready;await eventually(async()=>{const r=await engineering.evaluate(()=>chrome.runtime.sendMessage({type:'PAIA_PROMPT_QUERY'}));if(!r.ok){assert.equal(r.error,'MEMORY_STALE','only a concurrent fixture projection may delay readiness');return false;}ready=r.data;return ready.items.find(x=>x.text.includes('解释这个算法'))?.members.length===2;},'both captured inputs must be in the production family before refreshing the card');const family=ready.items.find(x=>x.text.includes('解释这个算法'));assert.equal(family.members.length,2);
   const f=card();await f.locator('#refresh').click();await eventually(()=>f.locator('#refresh').isEnabled());assert.equal(await f.locator('.row').filter({hasText:'解释这个算法'}).count(),1,JSON.stringify({status:await f.locator('#status').textContent(),rows:await f.locator('.row').allTextContents()}));await f.locator('.row').filter({hasText:'解释这个算法'}).locator('.more').click();await f.getByRole('button',{name:'拆分',exact:true}).click();await f.locator('#editor input[type=checkbox]').first().check();await f.getByRole('button',{name:'拆分',exact:true}).click();await eventually(()=>f.locator('#editor').isHidden());assert.equal((await rpc(engineering,'PAIA_PROMPT_QUERY')).items.filter(x=>x.text.includes('解释这个算法')).length,2);assert.deepEqual((await h.state()).records,before);
  });
  await check('worker restart, SPA and page reload preserve durable templates without duplicate surface',async()=>{
   await h.restartWorker();await card().locator('#refresh').click();await card().locator('.row').first().waitFor();
   await page.evaluate(()=>{history.pushState({},'', '/c/prompt-insertion-fixture?route=project');document.body.append(document.createElement('i'));});await eventually(()=>card()?.url().includes('prompt-surface.html#'));await page.waitForTimeout(150);assert.equal(await orb.count(),1);
   await page.goto(url);await arrange(page);await orb.waitFor({state:'visible'});await open();assert.equal(await orb.count(),1);assert.ok((await rpc(engineering,'PAIA_PROMPT_QUERY')).items.find(x=>x.text==='move me synthetic'));
   await world.cdp.detach();world=await isolated(page,h.extensionId);
  });
  await check('second tab and actual tab discard restore their own surface and draft target',async()=>{
   const second=await h.context.newPage();await second.goto(url+'#second-tab');await arrange(second);await second.waitForFunction(()=>!!globalThis.fixture?.view);await second.locator('[data-paia-prompt-surface]').waitFor({state:'visible'});await page.evaluate(()=>fixture.set('first-tab-draft',15));await second.evaluate(()=>fixture.set('second-tab-draft',16));
   let sf=second.frames().find(f=>f.url().includes('prompt-surface.html#'));if(!sf){await second.locator('[data-paia-prompt-surface]').click();await eventually(()=>!!second.frames().find(f=>f.url().includes('prompt-surface.html#')),'second tab opens its own card');sf=second.frames().find(f=>f.url().includes('prompt-surface.html#'));}await sf.locator('.row').first().waitFor();const firstFrame=card();await second.locator('[data-paia-prompt-surface]').click();await eventually(()=>!second.frames().some(f=>f.url().includes('prompt-surface.html#')),'second tab closes its own card');assert.equal(card(),firstFrame);await second.locator('[data-paia-prompt-surface]').click();await eventually(()=>!!second.frames().find(f=>f.url().includes('prompt-surface.html#')),'second tab opens its own card');sf=second.frames().find(f=>f.url().includes('prompt-surface.html#'));await sf.getByRole('button',{name:text,exact:true}).click();await eventually(()=>sf.locator('#status').textContent().then(x=>x.includes('已插入')),'second tab insertion acknowledges its own selected draft');assert.equal(await page.evaluate(()=>fixture.text()),'first-tab-draft');assert.equal(await second.evaluate(()=>fixture.text()),'second-tab-draft'+text);
   await page.bringToFront();const worker=h.context.serviceWorkers().find(w=>w.url().endsWith('/background/service-worker.js'));const tabs=await worker.evaluate(()=>chrome.tabs.query({url:'https://chatgpt.com/*'}));const inactive=tabs.find(x=>x.url===url+'#second-tab');assert.ok(inactive&&!inactive.active);const discarded=await worker.evaluate(id=>chrome.tabs.discard(id),inactive.id);assert.equal(discarded.discarded,true);await worker.evaluate(id=>chrome.tabs.update(id,{active:true}),discarded.id);await eventually(()=>h.context.pages().some(p=>!p.isClosed()&&p.url()===url+'#second-tab'));const restored=h.context.pages().find(p=>!p.isClosed()&&p.url()===url+'#second-tab');await restored.waitForFunction(()=>!!globalThis.fixture?.view);await arrange(restored);await restored.locator('[data-paia-prompt-surface]').waitFor({state:'visible'});assert.equal(await restored.locator('[data-paia-prompt-surface]').count(),1);await restored.close();await page.bringToFront();
  });
  await check('current/last selection, native IME and uncertain outcome keep one-shot safety through the real card',async()=>{
   let f=card();await f.locator('#refresh').click();await page.evaluate(()=>fixture.set('ABCDE',1,4));await page.waitForTimeout(60);await f.getByRole('button',{name:text,exact:true}).click();await eventually(()=>f.locator('#status').textContent().then(x=>x.includes('已插入')));assert.equal(await page.evaluate(()=>fixture.text()),'ABCD'+text+'E');
   await f.locator('#refresh').click();await page.evaluate(()=>fixture.set(''));await page.evaluate(()=>{fixture.ended=0;document.getElementById('prompt-textarea').addEventListener('compositionend',()=>fixture.ended++);});const cdp=await h.context.newCDPSession(page);await cdp.send('Input.imeSetComposition',{text:'汉',selectionStart:1,selectionEnd:1});await f.getByRole('button',{name:text,exact:true}).click();await eventually(()=>f.locator('#status').textContent().then(x=>!x.includes('正在插入')));assert.notEqual(await page.evaluate(()=>fixture.text()),text);await page.locator('#prompt-textarea').focus();await cdp.send('Input.insertText',{text:'汉'});await page.waitForTimeout(70);assert.ok((await page.evaluate(()=>fixture.text())).includes('汉'));await cdp.detach();
   await f.locator('#refresh').click();await page.evaluate(()=>fixture.set('draft',5));await world.run("globalThis.nativeCommand=document.execCommand.bind(document);document.execCommand=(...args)=>{nativeCommand(...args);return false;}");await f.getByRole('button',{name:text,exact:true}).click();await eventually(()=>f.locator('#status').textContent().then(x=>x.includes('未确认')));assert.equal(await page.evaluate(()=>fixture.text()),'draft'+text);assert.equal(await f.getByRole('button',{name:text,exact:true}).isDisabled(),true);await world.run('document.execCommand=nativeCommand;');await page.waitForTimeout(1900);assert.match(await f.locator('#status').textContent(),/未确认/);assert.equal(await page.evaluate(()=>fixture.text()),'draft'+text);
   await f.getByRole('button',{name:'复制',exact:true}).click();await eventually(()=>f.locator('#status').textContent().then(x=>/已复制|未能复制/.test(x)));assert.match(await f.locator('#status').textContent(),/已复制|未能复制/);
   await f.locator('#refresh').click();await page.evaluate(()=>fixture.set('failed draft',12));await world.run('document.execCommand=()=>false;');await f.getByRole('button',{name:text,exact:true}).click();await eventually(()=>f.locator('#status').textContent().then(x=>x.includes('无法安全插入')));await world.run('document.execCommand=nativeCommand;');await page.waitForTimeout(1900);assert.equal(await page.evaluate(()=>fixture.text()),'failed draft');assert.equal(await f.getByRole('button',{name:text,exact:true}).isDisabled(),true);assert.equal(await f.getByRole('button',{name:'复制',exact:true}).isVisible(),true);await f.getByRole('button',{name:'复制',exact:true}).click();await eventually(()=>f.locator('#status').textContent().then(x=>/已复制|未能复制/.test(x)));
  });
  await check('light/dark, long scroll, 320px, 200% text, coarse input, keyboard and reduced motion remain bounded',async()=>{
   for(let i=0;i<6;i++){const q=await rpc(engineering,'PAIA_PROMPT_QUERY');await rpc(engineering,'PAIA_PROMPT_CHANGE',{change:{action:'create',revision:q.revision,text:'长段落 '+i+'\n'+('保留完整内容和代码 `a !== b`。Unicode 🙂 English.\n').repeat(20)}});}await card().locator('#refresh').click();await eventually(()=>card().locator('.row').count().then(n=>n===10));assert.ok(await card().locator('#list').evaluate(e=>e.scrollHeight>e.clientHeight));await card().locator('.row').last().scrollIntoViewIfNeeded();assert.equal(await card().locator('.row').last().isVisible(),true);await card().locator('#list').evaluate(e=>e.scrollTop=0);
   for(const theme of ['light','dark'])for(const width of [1280,320]){await page.setViewportSize({width,height:800});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.waitForTimeout(120);const f=card();await f.locator('#refresh').click();await f.locator('.row').first().waitFor();assert.ok(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await f.evaluate(()=>document.scrollingElement.scrollTop),0,'footer focus must not shift card contents');assert.ok(await f.evaluate(()=>document.querySelector('#list').clientHeight>0));assert.ok(await f.locator('#new').evaluate(e=>e.getBoundingClientRect().height>=44));const path=join(receiptDir,variant+'-'+theme+'-'+width+'.png');await page.screenshot({path});screens.push(path.split('/').at(-1));}
   await card().evaluate(()=>document.documentElement.style.fontSize='28px');await page.screenshot({path:join(receiptDir,variant+'-200-percent.png')});screens.push(variant+'-200-percent.png');assert.ok(await card().evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await card().locator('#close').focus();await page.keyboard.press('Enter');await eventually(()=>!card());await orb.click();await eventually(()=>!!card(),'explicit pointer click reopens before coarse-input checks');await open();
   const cdp=await h.context.newCDPSession(page),frameCdp=await h.context.newCDPSession(card());
   for(const session of [cdp,frameCdp])await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
   await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
   assert.equal(await card().evaluate(()=>matchMedia('(pointer:coarse)').matches),true);
   assert.equal(await card().locator('nav').evaluate(e=>getComputedStyle(e).opacity),'1');
   const more=await card().locator('.more').first().boundingBox();assert.ok(more.width>=44&&more.height>=44);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:more.x+more.width/2,y:more.y+more.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await card().getByRole('button',{name:'编辑',exact:true}).waitFor();
   for(const session of [cdp,frameCdp]){await session.send('Emulation.setTouchEmulationEnabled',{enabled:false});await session.detach();}
  });
  await check('native 200% browser zoom keeps the card and management clear of the composer',async()=>{
   await page.setViewportSize({width:1280,height:900});await page.emulateMedia({colorScheme:'light'});await card().locator('#refresh').click();await eventually(()=>card().locator('#refresh').isEnabled());
   const worker=h.context.serviceWorkers().find(w=>w.url().endsWith('/background/service-worker.js'));
   const tab=await worker.evaluate(async url=>(await chrome.tabs.query({url:'https://chatgpt.com/*'})).find(t=>t.url===url).id,page.url());
   const before=await page.evaluate(()=>({width:innerWidth,dpr:devicePixelRatio}));
   try{
    await worker.evaluate(id=>chrome.tabs.setZoom(id,2),tab);assert.equal(await worker.evaluate(id=>chrome.tabs.getZoom(id),tab),2);
    await eventually(()=>page.evaluate(()=>devicePixelRatio).then(value=>value===before.dpr*2));
    assert.equal(await page.evaluate(()=>innerWidth),before.width/2);
    const bounds=await page.evaluate(()=>{const form=document.querySelector('form').getBoundingClientRect(),orb=document.querySelector('[data-paia-prompt-surface]').getBoundingClientRect();return {form:{x:form.x,y:form.y,right:form.right,bottom:form.bottom},orb:{x:orb.x,y:orb.y,right:orb.right,bottom:orb.bottom},width:innerWidth,height:innerHeight};});
    const frame=await card().frameElement(),box=await frame.boundingBox();
    for(const rect of [{x:box.x,y:box.y,right:box.x+box.width,bottom:box.y+box.height},bounds.orb]){assert.ok(rect.x>=0&&rect.y>=0&&rect.right<=bounds.width&&rect.bottom<=bounds.height);assert.ok(rect.bottom<=bounds.form.y||rect.y>=bounds.form.bottom||rect.right<=bounds.form.x||rect.x>=bounds.form.right);}
    assert.ok(await card().evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await card().locator('#new').click();await card().getByRole('textbox',{name:'复用文本'}).fill('zoom draft');await card().getByRole('button',{name:'取消',exact:true}).click();await eventually(()=>card().locator('#refresh').isEnabled());
    const path=join(receiptDir,variant+'-browser-zoom200.png');await page.screenshot({path});screens.push(path.split('/').at(-1));
   }finally{await worker.evaluate(id=>chrome.tabs.setZoom(id,1),tab);await eventually(()=>page.evaluate(()=>devicePixelRatio).then(value=>value===before.dpr));}
  });
  await check('system and host theme transitions keep frame contrast without refresh, reordering or losing an edit',async()=>{
   await page.emulateMedia({colorScheme:'light'});await card().locator('#refresh').click();await eventually(()=>card().locator('#refresh').isEnabled());
   const f=card(),ids=await f.locator('.row').evaluateAll(rows=>rows.map(r=>r.dataset.id));
   const expectTheme=async theme=>{await eventually(()=>orb.getAttribute('data-theme').then(x=>x===theme),'host theme '+theme);await eventually(()=>f.evaluate(()=>getComputedStyle(document.documentElement).color).then(x=>x===(theme==='dark'?'rgb(233, 238, 246)':'rgb(29, 39, 56)')),'frame contrast '+theme);assert.deepEqual(await f.locator('.row').evaluateAll(rows=>rows.map(r=>r.dataset.id)),ids);};
   for(const theme of ['dark','light','dark','light']){await page.emulateMedia({colorScheme:theme});await expectTheme(theme);}
   await f.locator('.row').first().locator('.more').click();await f.getByRole('button',{name:'编辑',exact:true}).click();await f.getByRole('textbox',{name:'复用文本'}).fill('unsaved theme transition');
   // CDP media emulation pins every frame directly; release it to test native inherited iframe appearance.
   await page.emulateMedia({colorScheme:null});await page.evaluate(()=>document.documentElement.classList.add('dark'));await expectTheme('dark');assert.equal(await f.getByRole('textbox',{name:'复用文本'}).inputValue(),'unsaved theme transition');
   await page.evaluate(()=>document.documentElement.classList.remove('dark'));await expectTheme('light');assert.equal(await f.getByRole('textbox',{name:'复用文本'}).inputValue(),'unsaved theme transition');await f.getByRole('button',{name:'取消',exact:true}).click();
  });
  await check('open orb owns pointer and keyboard motion, safe clamp and persisted whole-surface lifecycle',async()=>{
   await page.setViewportSize({width:1280,height:900});await open();await page.evaluate(()=>fixture.set('DRAG_DRAFT_UNCHANGED',4));await page.waitForTimeout(80);
   const bounds=async()=>({orb:await orb.boundingBox(),card:await (await card().frameElement()).boundingBox()});
   const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1,label+': '+a+' vs '+b);
   const attached=async()=>{assert.ok(card(),'card stays open');const b=await bounds();near(b.orb.x,b.card.x+b.card.width-40,'attached x');near(b.orb.y,b.card.y-32,'attached y');return b;};
   const saved=()=>engineering.evaluate(async()=> (await chrome.storage.local.get('promptSurfaceV1')).promptSurfaceV1);
   // The preceding zoom/viewport cases leave a valid near-edge saved anchor.
   // Put this free-motion test inside the safe band with a real drag before
   // asserting exact deltas; the later boundary drags retain the clamp oracle.
   const origin=await attached();await page.mouse.move(origin.orb.x+22,origin.orb.y+22);await page.mouse.down();
   await page.mouse.move(922,272,{steps:8});await page.mouse.up();
   await eventually(async()=>{const b=await attached(),v=await saved();return Math.abs(b.orb.x-900)<1&&Math.abs(b.orb.y-250)<1&&v.position&&Math.abs(v.position.x*1236-b.orb.x)<1&&Math.abs(v.position.y*856-b.orb.y)<1;},'native free-motion anchor is safely away from clamp boundaries');
   const initial=await attached(),sameFrame=card();await page.mouse.move(initial.orb.x+22,initial.orb.y+22);await page.mouse.down();
   assert.deepEqual(await bounds(),initial,'pointerdown does not jump');
   await page.mouse.move(initial.orb.x+14,initial.orb.y+16);await page.waitForTimeout(40);let b=await attached();near(b.orb.x,initial.orb.x-8,'first movement x');near(b.orb.y,initial.orb.y-6,'first movement y');near(b.card.x,initial.card.x-8,'card first movement x');near(b.card.y,initial.card.y-6,'card first movement y');near(b.card.height,initial.card.height,'card height stays stable');assert.equal(card(),sameFrame);
   for(const [dx,dy]of [[-40,-20],[-80,-50],[-120,-80]]){await page.mouse.move(initial.orb.x+22+dx,initial.orb.y+22+dy);await page.waitForTimeout(35);b=await attached();near(b.orb.x,initial.orb.x+dx,'pointer x');near(b.orb.y,initial.orb.y+dy,'pointer y');assert.equal(card(),sameFrame);}
   await page.mouse.up();const moved=await attached();await eventually(async()=>{const v=await saved();return v?.open&&v.position&&Math.abs(v.position.x*1236-moved.orb.x)<1&&Math.abs(v.position.y*856-moved.orb.y)<1;});
   assert.equal(await page.evaluate(()=>fixture.text()),'DRAG_DRAFT_UNCHANGED');assert.equal(await page.evaluate(()=>fixture.send),0);assert.equal(await page.evaluate(()=>fixture.enter),0);
   await orb.click();await eventually(()=>!card(),'ordinary click after true drag closes');near((await orb.boundingBox()).x,moved.orb.x,'closed anchor x');near((await orb.boundingBox()).y,moved.orb.y,'closed anchor y');await open();assert.deepEqual(await attached(),moved);
   await page.reload();await arrange(page);await page.waitForFunction(()=>!!globalThis.fixture?.view);await orb.waitFor({state:'visible'});await eventually(()=>!!card());await card().locator('.row').first().waitFor();assert.deepEqual(await attached(),moved);
   const restartTrace=[];let restartFailure=false;
   const restartState=async phase=>{const f=card();restartTrace.push({phase,framePresent:!!f,refreshEnabled:f?await f.locator('#refresh').isEnabled():null,closeEnabled:f?await f.locator('#close').isEnabled():null,rows:f?await f.locator('.row').count():0,savedOpen:(await saved())?.open===true});};
   try{
    await page.evaluate(()=>{history.pushState({},'',location.pathname+'?drag-route=1');document.body.append(document.createElement('i'));});await page.waitForTimeout(80);assert.deepEqual(await attached(),moved);
    await h.restartWorker();const refreshed=card();await refreshed.locator('#refresh').click();await restartState('refresh-requested');
    // Existing rows remain visible during refresh; the real card refuses closure
    // while busy, as the held-RPC refusal case above verifies explicitly.
    await eventually(()=>refreshed.locator('#refresh').isEnabled(),'Prompt refresh finishes after worker restart');await refreshed.locator('.row').first().waitFor();await restartState('refresh-ready');assert.deepEqual(await attached(),moved);assert.equal((await saved()).open,true);
    await orb.click();await eventually(()=>!card(),'toggle after SPA and worker restart');await restartState('closed');await eventually(async()=>(await saved()).open===false);assert.deepEqual(await orb.boundingBox(),moved.orb);await open();assert.deepEqual(await attached(),moved);await eventually(async()=>(await saved()).open===true);
    // Reach the production closed-shadow handle through native keyboard traversal.
    b=await attached();await page.locator('#blur').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-paia-prompt-surface')),true);await page.keyboard.press('Alt+ArrowLeft');await page.waitForTimeout(60);const keyed=await attached();near(keyed.orb.x,b.orb.x-12,'keyboard moves visible orb');near(keyed.card.x,b.card.x-12,'keyboard moves card');
    await eventually(async()=>Math.abs((await saved()).position.x*1236-keyed.orb.x)<1,'keyboard position persists after SPA and worker restart');
   }catch(error){restartFailure=true;await restartState('failed').catch(()=>{});await writeFile(join(receiptDir,variant+'-restart-state.json'),JSON.stringify({variant,status:'FAIL',trace:restartTrace})).catch(()=>{});throw error;}
   finally{try{await page.evaluate(url=>history.replaceState({},'',url),url);}catch(error){if(!restartFailure)throw error;}}
   const safe=async()=>{const now=await attached(),f=await page.locator('form').boundingBox(),size=page.viewportSize();for(const r of [now.orb,now.card]){assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=size.width&&r.y+r.height<=size.height);assert.ok(r.y+r.height<=f.y||r.y>=f.y+f.height||r.x+r.width<=f.x||r.x>=f.x+f.width,'whole surface excludes composer including send/voice');}return now;};
   for(const [x,y]of [[1,1],[1279,899]]){b=await attached();await page.mouse.move(b.orb.x+22,b.orb.y+22);await page.mouse.down();await page.mouse.move(x,y,{steps:6});await page.mouse.up();await page.waitForTimeout(60);await safe();assert.equal((await saved()).open,true);}
   const narrow=await page.addStyleTag({content:'form{left:600px;right:16px}'});await page.waitForTimeout(60);b=await attached();await page.mouse.move(b.orb.x+22,b.orb.y+22);await page.mouse.down();await page.mouse.move(422,522,{steps:8});await page.mouse.up();await page.waitForTimeout(60);const side=await safe();near(side.orb.x,400,'free lateral position x');near(side.orb.y,500,'free lateral position y');await narrow.evaluate(e=>e.remove());await page.waitForTimeout(60);
   await page.setViewportSize({width:320,height:844});await page.waitForTimeout(80);await safe();await page.setViewportSize({width:1280,height:900});await page.waitForTimeout(80);await safe();
   assert.equal(await page.evaluate(()=>fixture.text()),'');assert.equal(await page.evaluate(()=>fixture.send),0);assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);await page.evaluate(url=>history.replaceState({},'',url),url);
  });
  await check('Settings style, details and actual position-reset clicks preserve the concurrent Prompt draft and failure focus',()=>settingsPromptPositionEvidence({h,page,card,orb,rpc,engineering}));
  await check('Settings position reset keeps the same composing card visible beside a tall composer',async()=>{
   await page.setViewportSize({width:1280,height:900});await open();
   const tall=await page.addStyleTag({content:'form{left:800px;right:80px;top:50px;bottom:50px;box-sizing:border-box}'});
   const saved=()=>h.archive.evaluate(async()=> (await chrome.storage.local.get('promptSurfaceV1')).promptSurfaceV1);
   const f=card(),draft='unsaved lateral reset draft 中文 🙂';let cdp,resetWorld;
   try{
    await page.locator('#blur').focus();await page.keyboard.press('Tab');await page.keyboard.press('Alt+ArrowLeft');
    await eventually(async()=>!!(await saved()).position,'native move supplies a real custom position before reset');
    const geometry=await saved(),families=await rpc(engineering,'PAIA_PROMPT_QUERY',{includeHidden:true}),records=(await h.state()).records;
    resetWorld=await isolated(page,h.extensionId);await resetWorld.run("globalThis.resetPositionSeen=0;globalThis.resetPositionListener=r=>{if(r.type==='PAIA_PROMPT_SURFACE_POSITION_RESET')resetPositionSeen=r.positionGeneration;};chrome.runtime.onMessage.addListener(resetPositionListener);");
    await f.locator('#new').click();const edit=f.getByRole('textbox',{name:'复用文本'});await edit.fill(draft);await edit.focus();
    await edit.evaluate(node=>{globalThis.resetComposition={start:0,end:0};node.addEventListener('compositionstart',()=>resetComposition.start++);node.addEventListener('compositionend',()=>resetComposition.end++);});
    cdp=await h.context.newCDPSession(page);await cdp.send('Input.imeSetComposition',{text:'汉',selectionStart:1,selectionEnd:1});
    const editorState=()=>edit.evaluate(node=>({value:node.value,start:node.selectionStart,end:node.selectionEnd,focused:document.activeElement===node,composition:{...resetComposition}}));
    const editor=await editorState();assert.equal(editor.composition.start,1);assert.equal(editor.composition.end,0);assert.equal(editor.focused,true);
    assert.deepEqual(await rpc(h.archive,'PAIA_PROMPT_SURFACE_RESET_POSITION'),{status:'reset',changed:true});
    await eventually(async()=>{const state=await saved();return state.position===null&&state.positionGeneration===(geometry.positionGeneration??0)+1;});
    await eventually(()=>resetWorld.run('resetPositionSeen').then(value=>value===(geometry.positionGeneration??0)+1),'the real host receives this reset generation');
    await eventually(async()=>{const box=await (await f.frameElement()).boundingBox();return box&&Math.abs(box.x-448)<1&&Math.abs(box.y-82)<1;},'default reset must keep the composing card visible in the available lateral band');
    assert.equal(card(),f);assert.deepEqual(await editorState(),editor);assert.equal((await saved()).open,true);
    const form=await page.locator('form').boundingBox();
    for(const box of [await orb.boundingBox(),await (await f.frameElement()).boundingBox()]){
     assert.ok(box&&box.x>=8&&box.y>=8&&box.x+box.width<=1272&&box.y+box.height<=892);
     assert.ok(box.x+box.width<=form.x-8||box.x>=form.x+form.width+8,'default card and attached handle stay outside the tall composer');
    }
    assert.deepEqual(await rpc(h.archive,'PAIA_PROMPT_SURFACE_RESET_POSITION'),{status:'reset',changed:false});
    await eventually(()=>resetWorld.run('resetPositionSeen').then(value=>value===(geometry.positionGeneration??0)+2));
    assert.equal(card(),f);assert.deepEqual(await editorState(),editor);assert.equal((await saved()).position,null);
    assert.deepEqual(await rpc(engineering,'PAIA_PROMPT_QUERY',{includeHidden:true}),families);assert.deepEqual((await h.state()).records,records);
    assert.equal(await page.evaluate(()=>fixture.send),0);assert.equal(await page.evaluate(()=>fixture.enter),0);
    const path=join(receiptDir,variant+'-reset-lateral-draft.png');await page.screenshot({path});screens.push(path.split('/').at(-1));
   }finally{
    if(cdp){await cdp.send('Input.insertText',{text:'汉'}).catch(()=>{});await cdp.detach();}
    if(resetWorld){await resetWorld.run('chrome.runtime.onMessage.removeListener(resetPositionListener);delete globalThis.resetPositionListener;delete globalThis.resetPositionSeen;');await resetWorld.cdp.detach();}
    await tall.evaluate(node=>node.remove());
    if(await f.locator('#editor').isVisible())await f.getByRole('button',{name:'取消',exact:true}).click();
    await eventually(()=>f.locator('#refresh').isEnabled());
   }
  });
  await check('orb movement persists safely; idle CPU is bounded; no send, Provider, reply capture or site storage',async()=>{
   await card().locator('#close').click();await eventually(()=>!card());const box=await orb.boundingBox();await page.mouse.move(box.x+22,box.y+22);await page.mouse.down();await page.mouse.move(40,60,{steps:8});await page.mouse.up();await page.waitForTimeout(100);assert.equal(card(),undefined);const moved=await orb.boundingBox();assert.ok(Math.abs(moved.x-box.x)>5||Math.abs(moved.y-box.y)>5);
   await page.reload();await arrange(page);await orb.waitFor({state:'visible'});const restored=await orb.boundingBox();assert.ok(Math.abs(restored.x-moved.x)<2&&Math.abs(restored.y-moved.y)<2);
   const cdp=await h.context.newCDPSession(page);await cdp.send('Performance.enable');const metric=async()=>{const {metrics}=await cdp.send('Performance.getMetrics');return Object.fromEntries(metrics.map(x=>[x.name,x.value]));};const before=await metric();await page.waitForTimeout(1500);const after=await metric();assert.ok(after.TaskDuration-before.TaskDuration<.3,'idle 1.5s must not consume 300ms main-thread task CPU');await cdp.detach();
   assert.deepEqual(await page.evaluate(()=>({send:fixture.send,enter:fixture.enter,storage:[localStorage.length,sessionStorage.length]})),{send:0,enter:0,storage:[0,0]});assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.equal(h.historyRequests,0);assert.equal((await h.state()).records.length,2);assert.deepEqual(h.errors,[]);
   await writeFile(join(receiptDir,variant+'.json'),JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),variant,status:failures?'FAIL':'PASS',evidence:'SYNTHETIC_NATIVE_CHROME',screens,idleTaskSeconds:after.TaskDuration-before.TaskDuration,send:0,providerRequests:0}));
  });
 }finally{await world?.cdp.detach().catch(()=>{});await h.close();}
});
