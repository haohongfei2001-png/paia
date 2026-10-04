// Actual source/release extension screenshots. Only the controlled host page is styled.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT,eventually} from '../tests/harness/fake-chatgpt.mjs';
import {routeComposer} from '../tests/harness/prompt-composer.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const out=join(root,'work/prompt-visual');await mkdir(out,{recursive:true});
const base=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
assert.equal(execFileSync('git',['diff','--name-only','HEAD','--','extension/content','extension/ui','extension/adapter','extension/core','extension/background','extension/manifest.json'],{cwd:join(root,'..'),encoding:'utf8'}).trim(),'');
const prompts=[
 '请用三句话总结核心观点，保留重要事实。',
 '先指出问题，再给出可以直接执行的改进建议。',
 'Translate into natural English. Preserve the original meaning and tone.',
 '把这段内容整理成清晰的待办清单。',
 '请检查下面的代码：\n1. 解释错误原因，保留现有行为。\n2. 给出最小修复，不修改无关代码。\n3. 补充边界情况和验证方式。\n示例：if (a !== b) { return "不同"; }\n请保留引用、Unicode 和所有换行。',
 '解释这个概念，并举一个简单的例子。',
 '压缩到 200 字以内，保留引用和数字。',
 '比较这两个方案，分别列出优点与限制。'
];
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const css=`html{color-scheme:light}body{margin:0;min-height:100vh;background:#f7f7f6;color:#292e30;font:14px/1.6 system-ui,sans-serif}form{position:fixed;left:24px;right:24px;bottom:24px;padding:16px;border:1px solid #c9cecc;border-radius:16px;background:#fff}#mount{padding-right:60px}.ProseMirror{outline:none;min-height:52px}.ProseMirror p{margin:0}#send{position:absolute;right:14px;bottom:14px;border:1px solid #c9cecc;background:transparent;color:inherit;border-radius:10px;min-width:44px;height:44px;font:inherit}#blur{position:fixed;left:24px;top:24px;border:0;background:transparent;color:#67736f;padding:0;font:12px/1.6 system-ui;text-align:left}#fixture-note{position:fixed;left:24px;top:64px;max-width:400px;color:#818b87;font:12px/1.7 system-ui;pointer-events:none}@media(max-width:400px){form{left:12px;right:12px;bottom:12px;padding:12px}#blur,#fixture-note{left:16px;right:16px}}@media(prefers-color-scheme:dark){html{color-scheme:dark}body{background:#1d2021;color:#e0e6e3}form{background:#262a2b;border-color:#46504b}#send{border-color:#57635d}#blur,#fixture-note{color:#9ca9a3}}`;
for(const variant of ['source','release']){
 if(variant==='release')execFileSync('python3',['scripts/build_current_release.py'],{cwd:root,stdio:'inherit'});
 const h=await FakeChatGPT.start({extensionPath:variant==='source'?root:join(root,'work/current-release'),headless:true,launchThroughPort:true});
 const receipt={base,runtime:'real '+variant+' extension on offline synthetic host',certification:'DEFERRED_EXTERNAL_EVIDENCE',screens:[]};
 try{
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();
  const engineering=await h.context.newPage();await engineering.goto('chrome-extension://'+h.extensionId+'/ui/prompt-reuse-test.html');
  const ids=[];
  for(const text of prompts){const q=await rpc(engineering,'PAIA_PROMPT_QUERY');const x=await rpc(engineering,'PAIA_PROMPT_CHANGE',{change:{action:'create',text,revision:q.revision}});ids.push(x.id);}
  // Deterministic same manual order in source and release; actual service preferences.
  for(const id of ids){const q=await rpc(engineering,'PAIA_PROMPT_QUERY');await rpc(engineering,'PAIA_PROMPT_CHANGE',{change:{action:'pin',id,revision:q.revision}});}
  await routeComposer(h.context,root);const page=await h.context.newPage();page.on('pageerror',e=>h.errors.push(e.message));
  await page.setViewportSize({width:960,height:800});await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});
  await page.goto('https://chatgpt.com/c/prompt-insertion-fixture');await page.waitForFunction(()=>!!globalThis.fixture?.view);await page.addStyleTag({content:css});
  await page.evaluate(()=>{document.getElementById('blur').textContent='受控测试页面 · 非真实 ChatGPT';document.getElementById('send').textContent='发送';const p=document.createElement('p');p.id='fixture-note';p.textContent='仅使用合成 Prompt 和草稿。\nPAIA 浮球与卡片由真实扩展运行时渲染。';document.body.append(p);fixture.set('这是一段尚未发送的合成草稿。',0);});
  const orb=page.locator('[data-paia-prompt-surface]');await orb.waitFor({state:'visible'});
  const card=()=>page.frames().find(f=>f.url().includes('/ui/prompt-surface.html#'));
  const quiet=async()=>{await page.locator('#blur').focus();await page.mouse.move(480,30);await page.waitForTimeout(200);};
  const ready=async()=>{await eventually(()=>card()?.locator('.row').count().then(n=>n===8));await eventually(()=>card().locator('#refresh').isEnabled());};
  const shot=async(name,{quietMode=false}={})=>{
   if(quietMode)await quiet();await page.waitForTimeout(150);
   const file=variant+'-'+name+'.png';await page.screenshot({path:join(out,file),animations:'disabled',caret:'hide'});
   const geometry=await orb.boundingBox();assert.equal(geometry.width,44);assert.equal(geometry.height,44);
   const form=await page.locator('form').boundingBox();const disjoint=(a,b)=>a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y;assert.ok(disjoint(geometry,form));
   let panel=null;if(card()){const theme=await orb.getAttribute('data-theme');assert.equal(await card().evaluate(()=>getComputedStyle(document.documentElement).color),theme==='dark'?'rgb(225, 233, 231)':'rgb(36, 49, 51)');const el=await card().frameElement();panel=await el.boundingBox();assert.ok(disjoint(panel,form));assert.ok(panel.x>=0&&panel.x+panel.width<=page.viewportSize().width);assert.ok(panel.width<=336);assert.ok(panel.height<=400);}
   assert.equal(await page.evaluate(()=>fixture.send),0);assert.equal(await page.evaluate(()=>fixture.text()),'这是一段尚未发送的合成草稿。');
   receipt.screens.push({file,name,viewport:page.viewportSize(),orb:geometry,card:panel});console.log('CAPTURE',file);
  };
  await shot('01-orb-light',{quietMode:true});
  await orb.hover();await shot('02-orb-hover');
  await page.locator('#blur').focus();await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-paia-prompt-surface')),true);
  await shot('03-orb-keyboard-focus');
  await orb.click();await ready();
  await shot('04-card-light',{quietMode:true});
  await card().locator('.row').first().hover();await shot('05-row-hover');
  await card().locator('.row').first().locator('.more').focus();await shot('06-row-keyboard-focus');
  await card().locator('.row').first().locator('.more').click();await shot('07-management');
  await card().getByRole('button',{name:'编辑',exact:true}).click();await shot('08-edit');
  await card().getByRole('button',{name:'取消',exact:true}).click();await ready();
  await card().locator('.row').filter({hasText:prompts[4]}).scrollIntoViewIfNeeded();await shot('09-long-prompt',{quietMode:true});
  await card().locator('.row').filter({hasText:prompts[4]}).locator('.more').click();await card().getByRole('button',{name:'编辑',exact:true}).click();await shot('10-long-edit');
  await card().getByRole('button',{name:'取消',exact:true}).click();await ready();
  await card().locator('#list').evaluate(e=>e.scrollTop=0);
  await card().locator('.row').nth(1).locator('.more').click();
  const handle=await card().getByRole('button',{name:'拖动到目标行之前；也可使用上移下移'}).boundingBox();const target=await card().locator('.row').first().boundingBox();
  await page.mouse.move(handle.x+20,handle.y+20);await page.mouse.down();await page.mouse.move(target.x+20,target.y+10,{steps:8});await shot('11-drag-active');await page.mouse.up();
  await eventually(()=>card().locator('.row').first().getAttribute('data-id').then(x=>x===ids[1]));await ready();
  const q=await rpc(engineering,'PAIA_PROMPT_QUERY');assert.deepEqual(q.manualOrder.slice(0,3),[ids[1],ids[0],ids[2]]);await shot('12-manual-order',{quietMode:true});
  await card().locator('.row').first().locator('.more').click();await card().getByRole('button',{name:'隐藏',exact:true}).click();await eventually(()=>card().locator('.row').count().then(n=>n===7));
  await card().locator('#hidden').click();await ready();await card().locator('.row').filter({hasText:prompts[1]}).locator('.more').click();await card().getByRole('button',{name:'恢复',exact:true}).waitFor();await shot('13-hidden-recovery');
  await card().getByRole('button',{name:'恢复',exact:true}).click();await ready();await card().locator('#hidden').click();await ready();
  await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await card().locator('#refresh').click();await ready();await shot('14-card-dark',{quietMode:true});
  await card().locator('#close').click();await eventually(()=>!card());await shot('15-orb-dark',{quietMode:true});await orb.click();await ready();
  await page.setViewportSize({width:320,height:800});await card().locator('#refresh').click();await ready();await shot('16-compact-dark',{quietMode:true});
  await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});await card().locator('#refresh').click();await ready();await shot('17-compact-light',{quietMode:true});
  // Contract specifies 200% text scaling. Change browser root text size, never layout tokens.
  await card().evaluate(()=>document.documentElement.style.fontSize='28px');await shot('18-compact-text-200',{quietMode:true});
  assert.equal(await card().evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await card().locator('.row').first().locator('.more').click();await shot('19-compact-text-200-management');
  assert.equal(await card().evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  receipt.noSend=await page.evaluate(()=>({send:fixture.send,enter:fixture.enter}));assert.deepEqual(receipt.noSend,{send:0,enter:0});
  receipt.requests={external:h.externalRequests,provider:h.deepSeekRequests.length,extension:h.extensionNetworkRequests,history:h.historyRequests};assert.deepEqual(receipt.requests,{external:0,provider:0,extension:0,history:0});
  assert.deepEqual(h.errors,[]);receipt.result='PASS';
 }catch(e){receipt.result='FAIL';receipt.error=e.stack;throw e;}finally{await writeFile(join(out,variant+'.json'),JSON.stringify(receipt,null,2));await h.close();}
}
