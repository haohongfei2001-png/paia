import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{const result=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(result.ok,true,JSON.stringify(result));return result.data;};
const noOverflow=page=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
const releaseRoot=mkdtempSync(join(tmpdir(),'paia-a11y-original-release-'));
test.after(()=>rmSync(releaseRoot,{recursive:true,force:true}));
try{console.log(execFileSync('python3',['scripts/build_current_release.py',releaseRoot],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'}));}catch(error){console.log(String(error.stdout||''));console.error(String(error.stderr||''));throw error;}

for(const variant of ['source','release'])test('CPV1-02.6 Reader and Archive keep long multilingual content, focus, 200% scale, 320px and reduced motion usable '+variant,{timeout:120000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true,...(variant==='release'?{extensionPath:releaseRoot}:{})});
 try{
  const p=h.archive;
  // Read-only, bounded lifecycle evidence for failures; never retry the action.
  await p.evaluate(()=>{const events=[];globalThis.__sourceDialogEvidence=events;const add=value=>{events.push(value);if(events.length>24)events.shift();};chrome.runtime.onMessage.addListener(m=>{if(m.type==='ARCHIVE_CHANGED')add({event:'archive-changed',cause:typeof m.cause==='string'&&/^[A-Z0-9_]{1,64}$/.test(m.cause)?m.cause:'unknown',open:document.getElementById('info-dialog')?.open});});document.getElementById('info-dialog').addEventListener('close',()=>add({event:'dialog-close',open:document.getElementById('info-dialog').open}));});
  await p.locator('#enable-consent').click();
  await eventually(async()=>(await rpc(p,'GET_STATUS')).consented===true);
  assert.equal(await p.locator('#onboarding-history-step').isVisible(),false,'Archive root stays blank; optional history import belongs to Settings');
  const title='跨语言长标题 Chinese English 👩‍💻 '.repeat(12),body='中文段落与 emoji 👩‍💻🚀\n```js\nconst retained = "code";\n```\nEnglish paragraph '.repeat(32);
  const capturePage=await h.open({id:'cpv1-026-a11y',title,base:1609459200,messages:[{id:'cpv1-026-input',text:body}]});
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
  // Capture and its original Navigator/Reader assertions are complete. Retire this fixture's producer before the independent
  // read-only accessibility journey; a later capture legitimately closes an
  // Original dialog and is not part of the keyboard/focus behavior under test.
  await capturePage.close();await rpc(p,'GET_STATUS');
  await eventually(async()=>{const filter=await rpc(p,'FILTER_STATUS');return filter.pending===0&&(filter.mode==='off'||filter.taskState==='idle');},'original filter owner completes fixture capture work');
  const beforeTitle=(await h.state()).conversations.find(doc=>doc.sourceConversationId==='cpv1-026-a11y');assert.ok(beforeTitle);assert.ok(title.length>300);assert.equal(beforeTitle.originalConversationTitle,title.trim(),'original adapter removes only its surrounding page-title whitespace');assert.equal(beforeTitle.userTitle,'');
  const prose=p.locator('.library-prose').first();await prose.click({button:'right'});await p.locator('#context-menu button').filter({hasText:'查看原始内容'}).click();
  await eventually(()=>p.locator('#info-dialog').evaluate(el=>el.open),'Source dialog opens');
  assert.equal(await p.evaluate(()=>document.activeElement?.closest('dialog')?.id),'info-dialog','dialog takes focus');
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement?.closest('dialog')?.id),'info-dialog','keyboard focus stays in the dialog');
  await p.locator('#close-info').click();await eventually(()=>p.locator('#info-dialog').isHidden(),'dialog closes');
  await eventually(()=>p.evaluate(()=>document.activeElement?.closest('[data-item-id]')?.classList.contains('library-prose')),'focus returns to the Reader Input');
  const afterTitle=(await h.state()).conversations.find(doc=>doc.id===beforeTitle.id);assert.deepEqual({original:afterTitle.originalConversationTitle,manual:afterTitle.userTitle,revision:afterTitle.titleRevision},{original:beforeTitle.originalConversationTitle,manual:'',revision:beforeTitle.titleRevision},'opening and closing Original must not rename the untouched long captured title');
  await p.setViewportSize({width:1024,height:768});const cdp=await h.context.newCDPSession(p);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});
  assert.ok(await noOverflow(p)<=2,'200% page scale keeps Reader reflowed');assert.equal(await p.locator('.reader-more').isVisible(),true);
  await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await cdp.detach();
  await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  assert.equal(await p.locator('#document-body').evaluate(el=>getComputedStyle(el).scrollBehavior),'auto','Reader uses no forced smooth scrolling under reduced motion');
  assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }catch(error){try{const evidence=await h.archive.evaluate(()=>({events:globalThis.__sourceDialogEvidence,dialogOpen:document.getElementById('info-dialog')?.open,sourceRows:document.querySelectorAll('#info-content .source-original').length,contextHidden:document.getElementById('context-menu')?.hidden,readerVisible:!!document.getElementById('document-panel')?.getClientRects().length,activeTag:document.activeElement?.tagName}));const out=new URL('../work/cpv1-026-a11y/'+variant+'/',import.meta.url);await mkdir(out,{recursive:true});await writeFile(new URL('failure.json',out),JSON.stringify(evidence,null,2));console.error('A11Y_ORIGINAL_MODAL_FAILURE',JSON.stringify(evidence));}catch(diagnosticError){console.error('A11Y_ORIGINAL_MODAL_DIAGNOSTIC_FAILED',diagnosticError?.name);}throw error;}finally{await h.close();}
});
