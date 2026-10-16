import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {FakeChatGPT,conversation,eventually} from './harness/fake-chatgpt.mjs';
const suppliedExtension=process.env.PAIA_ARCHIVE_EXTENSION_PATH;
const root=fileURLToPath(new URL('../',import.meta.url));let releasePath=null;
function extensionFor(variant){
 if(suppliedExtension)return suppliedExtension;
 if(variant==='source')return root;
 if(!releasePath){const output=join(root,'work/current-release');execFileSync('python3',[join(root,'scripts/build_current_release.py'),output],{cwd:root,stdio:'pipe'});releasePath=output;}
 return releasePath;
}

async function traceYearReads(page){await page.evaluate(()=>{window.__archiveYearTrace=[];const send=chrome.runtime.sendMessage.bind(chrome.runtime);chrome.runtime.sendMessage=async(message,...rest)=>{const result=await send(message,...rest);if(message.type==='GET_PAGE'&&message.page?.documentId){window.__archiveYearTrace.push({year:message.page.yearReading,cursor:message.page.cursor,context:message.page.contextInputId,reply:{ok:result.ok,error:result.error,year:result.data?.yearReading,ids:result.data?.pageItemIds,epoch:result.data?.recoveryEpoch}});if(window.__archiveYearTrace.length>50)window.__archiveYearTrace.shift();}return result;};});}
async function diagnostic(page,error){try{console.error('SYNTHETIC_ARCHIVE_YEAR_FAILURE',JSON.stringify(await page.evaluate(()=>({notice:document.querySelector('#notice')?.textContent,status:document.querySelector('#save-status')?.textContent,error:document.querySelector('#error')?.textContent,rows:document.querySelectorAll('.library-prose').length,year:document.querySelector('#reader-next-year')?.textContent,trace:window.__archiveYearTrace}))));}catch{}throw error;}

// Complete Source/release current coverage by default. All release cases share
// the one standard-builder cache audit; explicit coordinated artifacts stay usable.
for(const variant of suppliedExtension?['release']:['source','release']){

test('Archive original reader opens newest populated year and appends older year only on explicit action '+variant,{timeout:60000},async()=>{
 const h=await FakeChatGPT.start({extensionPath:extensionFor(variant),headless:true});try{
 const p=h.archive;await traceYearReads(p);await p.locator('#enable-consent').click();const c=conversation('year-harmony-native');c.base=Date.parse('2025-12-31T23:59:30Z')/1000;await h.open(c);await eventually(async()=>(await h.state()).records.length===3);
 await eventually(()=>p.locator('.archive-navigator-group-toggle').filter({hasText:'未归属 Project'}).first().isVisible());const group=p.locator('.archive-navigator-group-toggle').filter({hasText:'未归属 Project'}).first();await group.click();await p.locator('.archive-navigator-window').first().click();
 await eventually(async()=>await p.locator('.library-prose').count()===2,'only newest populated year');assert.equal(await p.locator('input[type=search]:visible').count(),0);
 await eventually(()=>p.locator('#reader-next-year').isVisible(),'qualified old year boundary');assert.equal(await p.locator('#reader-next-year').textContent(),'↓ 2025');
 const original=await p.locator('.library-prose').first().elementHandle(),sourceBefore=(await h.state()).records;await p.locator('.library-prose').first().fill('SYNTHETIC edited current expression before year append');await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);let fail=true;chrome.runtime.sendMessage=(message,...rest)=>{if(fail&&message.type==='GET_PAGE'&&message.page?.yearReading?.year===2025){fail=false;window.__archiveYearTrace?.push({injected:'SYNTHETIC_YEAR_READ_FAILED',year:message.page.yearReading});return Promise.resolve({ok:false,error:'SYNTHETIC_YEAR_READ_FAILED'});}return send(message,...rest);};});await p.locator('#reader-next-year').click();await eventually(async()=>(await p.locator('#notice').textContent()).includes('下一段暂时无法读取'),'injected annual read actually settled as failed');await eventually(()=>p.locator('#reader-next-year').isVisible(),'failed annual read offers same explicit retry');assert.equal(await p.locator('.library-prose').count(),2,'failed read does not open or erase a year');await p.locator('#reader-next-year').click();await eventually(async()=>await p.locator('.library-prose').count()===3,'explicit append');assert.equal(await original.evaluate(el=>el.isConnected),true,'existing editor node retained');assert.equal(await original.textContent(),'SYNTHETIC edited current expression before year append');assert.deepEqual((await h.state()).records,sourceBefore,'saving before yearly append cannot rewrite original Source');
 await p.locator('[data-view=settings]').first().click();await p.locator('#settings-panel').waitFor({state:'visible'});await p.locator('#ux-settings-back').click();await eventually(async()=>await p.locator('.library-prose').count()===3,'existing reader session restores already opened year');assert.equal(await p.locator('#reader-next-year').isVisible(),false);await p.locator('#input-time-toggle').click();await eventually(async()=>await p.locator('.library-prose').count()===1,'explicit oldest-first starts earliest qualified year');assert.equal(await p.locator('#reader-next-year').textContent(),'↓ 2026');await p.locator('#reader-next-year').click();await eventually(async()=>await p.locator('.library-prose').count()===3,'oldest-first explicit append');assert.deepEqual((await h.state()).records,sourceBefore);assert.deepEqual(h.errors,[]);
 }catch(error){await diagnostic(h.archive,error);}finally{await h.close();}
});
test('Archive all-undated original Inputs open directly without a made-up year '+variant,{timeout:60000},async()=>{
 const h=await FakeChatGPT.start({extensionPath:extensionFor(variant),headless:true});try{
 const p=h.archive;await traceYearReads(p);await p.locator('#enable-consent').click();await h.open({id:'year-unknown-native',title:'Unknown synthetic time',messages:[{id:'unknown-input',text:'SYNTHETIC original Input without timestamp'}]});await eventually(async()=>(await h.state()).records.length===1);
 const group=p.locator('.archive-navigator-group-toggle').filter({hasText:'未归属 Project'}).first();await eventually(()=>group.isVisible());await group.click();await p.locator('.archive-navigator-window').first().click();await eventually(()=>p.locator('.library-prose').isVisible());assert.equal(await p.locator('.block-time').textContent(),'发送时间未知');assert.equal(await p.locator('input[type=search]:visible').count(),0);assert.equal(await p.locator('#reader-next-year').isVisible(),false);assert.deepEqual(h.errors,[]);
 }catch(error){await diagnostic(h.archive,error);}finally{await h.close();}
});

test('Archive capture changes annual authority without replacing composing original editor '+variant,{timeout:60000},async()=>{
 const h=await FakeChatGPT.start({extensionPath:extensionFor(variant),headless:true});try{
  const p=h.archive;await traceYearReads(p);await p.locator('#enable-consent').click();const c=conversation('year-live-capture-continuity');c.base=Date.parse('2025-12-31T23:59:30Z')/1000;const sourcePage=await h.open(c);await eventually(async()=>(await h.state()).records.length===3);
  const group=p.locator('.archive-navigator-group-toggle').filter({hasText:'未归属 Project'}).first();await eventually(()=>group.isVisible());await group.click();await p.locator('.archive-navigator-window').first().click();await eventually(async()=>await p.locator('.library-prose').count()===2);await eventually(()=>p.locator('#reader-next-year').isVisible());
  const field=p.locator('.library-prose').first(),original=await field.elementHandle();await field.dispatchEvent('compositionstart');await field.fill('SYNTHETIC composing draft survives new capture');
  await sourcePage.evaluate(()=>window.fake.send({id:'year-live-new-input',text:'SYNTHETIC another newly captured user Input'}));await eventually(async()=>(await h.state()).records.length===4);await eventually(async()=>(await h.state()).records.find(row=>row.sourceMessageId==='year-live-new-input')?.sourceSentAt===null,'new DOM Input has no invented timestamp');
  await p.locator('#reader-next-year').click();assert.equal(await original.evaluate(node=>node.isConnected),true);assert.equal(await field.textContent(),'SYNTHETIC composing draft survives new capture');assert.equal(await p.locator('.library-prose').count(),2,'capture and guarded click cannot unfold another year during composition');
  await field.dispatchEvent('compositionend');await p.locator('#reader-next-year').click();await eventually(async()=>await p.locator('.library-prose').count()===3,'same-session yearly continuation recovers a fresh index generation');
  assert.equal(await original.evaluate(node=>node.isConnected),true,'fresh qualification keeps original native editable node');assert.equal(await original.textContent(),'SYNTHETIC composing draft survives new capture');assert.equal((await h.state()).records.some(row=>row.originalText==='SYNTHETIC composing draft survives new capture'),false,'Working edit cannot become original Source');
  await eventually(()=>p.locator('#reader-next-year').isVisible(),'new unknown-time Input remains separately qualified');assert.equal(await p.locator('#reader-next-year').textContent(),'↓ 发送时间未知');
  // A later real response can qualify this Input's timestamp. If that moves it
  // before the active window, preserve the document and offer guarded reread;
  // attaching a fresh generation must never silently skip the now-known Input.
  await h.open({...c,messages:[...c.messages,{id:'year-live-new-input',text:'SYNTHETIC another newly captured user Input'}]});await eventually(async()=>!!(await h.state()).records.find(row=>row.sourceMessageId==='year-live-new-input')?.sourceSentAt,'actual response qualifies the newly captured Source timestamp');
  if(!await p.locator('#reader-load-new').isVisible())await p.locator('#reader-next-year').click();await eventually(()=>p.locator('#reader-load-new').isVisible(),'moved latest Source stays explicit');assert.equal(await p.locator('.library-prose').count(),3);assert.equal(await original.evaluate(node=>node.isConnected),true);assert.equal(await original.textContent(),'SYNTHETIC composing draft survives new capture');assert.deepEqual(h.errors,[]);
 }catch(error){await diagnostic(h.archive,error);}finally{await h.close();}
});

}
