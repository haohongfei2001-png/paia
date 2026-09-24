import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{const result=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(result.ok,true,JSON.stringify(result));return result.data;};
const noOverflow=page=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);

test('CPV1-02.6 Reader and Archive keep long multilingual content, focus, 200% scale, 320px and reduced motion usable',{timeout:120000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true});
 try{
  const p=h.archive;
  await p.locator('#enable-consent').click();
  await eventually(async()=>(await rpc(p,'GET_STATUS')).consented===true);
  await eventually(()=>p.locator('#onboarding-skip').isVisible());await p.locator('#onboarding-skip').click();
  const title='跨语言长标题 Chinese English 👩‍💻 '.repeat(12),body='中文段落与 emoji 👩‍💻🚀\n```js\nconst retained = "code";\n```\nEnglish paragraph '.repeat(32);
  await h.open({id:'cpv1-026-a11y',title,base:1609459200,messages:[{id:'cpv1-026-input',text:body}]});
  await eventually(async()=>(await h.state()).records.some(row=>row.originalText===body),'synthetic long text is captured unchanged');
  await p.bringToFront();await p.setViewportSize({width:320,height:720});
  await eventually(()=>p.locator('#archive-navigator').isVisible());
  assert.ok(await noOverflow(p)<=2,'320px Archive root does not scroll horizontally');
  const overflow=p.locator('#archive-root-overflow summary');assert.ok((await overflow.boundingBox()).height>=44,'root overflow meets the touch target floor');
  const unassigned=p.locator('.archive-navigator-group-toggle').filter({hasText:'未归属 Project'}).first();
  await eventually(()=>unassigned.isVisible());await unassigned.focus();await p.keyboard.press('Enter');
  assert.equal(await unassigned.getAttribute('aria-expanded'),'true','keyboard opens the Navigator group');
  const window=p.locator('.archive-navigator-window').filter({hasText:title}).first();
  await eventually(()=>window.isVisible());await window.focus();await p.keyboard.press('Enter');await eventually(()=>p.locator('.library-prose').isVisible());
  assert.equal((await p.locator('.library-prose').textContent()).trim(),body.trim(),'long Chinese, English, code and emoji are readable without rewriting Source');
  assert.ok(await noOverflow(p)<=2,'320px Reader does not scroll horizontally');
  const more=p.locator('.reader-more').first();assert.ok((await more.boundingBox()).height>=44,'Reader overflow meets the touch target floor');
  const prose=p.locator('.library-prose').first();await prose.click({button:'right'});await p.locator('#context-menu button').filter({hasText:'查看当时记录'}).click();
  await eventually(()=>p.locator('#info-dialog').evaluate(el=>el.open),'Source dialog opens');
  assert.equal(await p.evaluate(()=>document.activeElement?.closest('dialog')?.id),'info-dialog','dialog takes focus');
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement?.closest('dialog')?.id),'info-dialog','keyboard focus stays in the dialog');
  await p.locator('#close-info').click();await eventually(()=>p.locator('#info-dialog').isHidden(),'dialog closes');
  await eventually(()=>p.evaluate(()=>document.activeElement?.closest('[data-item-id]')?.classList.contains('library-prose')),'focus returns to the Reader Input');
  await p.setViewportSize({width:1024,height:768});const cdp=await h.context.newCDPSession(p);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});
  assert.ok(await noOverflow(p)<=2,'200% page scale keeps Reader reflowed');assert.equal(await p.locator('.reader-more').isVisible(),true);
  await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await cdp.detach();
  await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  assert.equal(await p.locator('#document-body').evaluate(el=>getComputedStyle(el).scrollBehavior),'auto','Reader uses no forced smooth scrolling under reduced motion');
  assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
