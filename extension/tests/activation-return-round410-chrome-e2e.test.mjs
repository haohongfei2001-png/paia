import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{const r=await page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
async function consent(page){await page.locator('#consent-check').check();await page.locator('#enable-consent').click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'consent becomes durable');}

async function homeState(page,state){
 await eventually(()=>page.locator('#archive-root-main').isVisible(),'Archive root is visible');
 assert.equal(await page.locator('#archive-root-recent,#archive-root-continue').count(),0);
 assert.equal(await page.locator('#revisit-open').isVisible(),false);
 await eventually(async()=>{const status=await rpc(page,'PAIA_REVISIT_STATUS');return state==='return-new'?status.newInputs.count>0:status.newInputs.count===0;},`retained Revisit service reaches ${state}`);
}

test('Round 4.10 current release: activation keeps a quiet root and preserves local visit-window semantics',{timeout:120000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;
  await consent(p);

  // Empty activation: explain the product before inventing any onboarding modal
  // or durable tutorial state. UX-R1 may render the shell in the system locale.
  await homeState(p,'activation-empty');
  assert.match(await p.locator('#empty-list').textContent(),/还没有捕获到输入|no captured inputs/i);
  assert.match(await p.locator('#consent-panel').textContent(),/本机|local/i);
  assert.equal(await p.locator('#archive-root-recent').isVisible(),false);
  assert.equal(await p.locator('#core-loop-home,#core-loop-return').count(),0,'old Archive home cannot fabricate a second action owner');

  // First captured Input is the activation event. PAIA must state clearly that
  // the archive contains the user's inputs, not AI answers.
  const first={id:'round410-first',title:'Round 4.10 First Input',base:1609459200,messages:[{id:'round410-first-message',text:'ROUND410_ACTIVATION 这是我第一次看到 PAIA 的价值。'}]};
  await h.open(first);
  await eventually(async()=>(await h.state()).records.some(row=>row.originalText.includes('ROUND410_ACTIVATION')),'first activation Input is captured');
  await p.bringToFront();
  await homeState(p,'return-new');
  const recent=(await rpc(p,'GET_PAGE',{page:{view:'library',limit:1}})).recentCapturedDocument;
  assert.equal(recent.originalConversationTitle,'Round 4.10 First Input','recent-capture metadata survives chrome cleanup');

  // UX-R2 fixes the visit window and advances it on exit. Visiting creates no read position.
  await p.evaluate(()=>document.dispatchEvent(new CustomEvent('paia:navigate',{detail:{view:'revisit'}})));
  await eventually(()=>p.locator('#revisit-panel').isVisible(),'Revisit opens as its own page');
  assert.match(await p.locator('.revisit-intro').textContent(),/不表示|does not mark/i);
  assert.deepEqual(await rpc(p,'PAIA_READER_RECENT'),[]);
  await p.locator('.revisit-close').click();

  // A later Input after that baseline is the return trigger. Verify the Revisit
  // semantic contract directly, independently of the removed root shortcut.
  const second={id:'round410-second',title:'Round 4.10 Return Input',base:1609462800,messages:[{id:'round410-second-message',text:'ROUND410_RETURN 我决定把 PAIA 的下一步重点放在第一次理解产品价值和第二次主动回来，而不是继续增加功能页。'}]};
  await h.open(second);
  await eventually(async()=>(await h.state()).records.some(row=>row.originalText.includes('ROUND410_RETURN')),'post-baseline Input is captured');
  const revisitAfterCapture=await rpc(p,'PAIA_REVISIT_STATUS');
  assert.equal(revisitAfterCapture.firstRun,false,JSON.stringify(revisitAfterCapture));
  assert.equal(revisitAfterCapture.newInputs.count,1,JSON.stringify(revisitAfterCapture));
  assert.match(revisitAfterCapture.newInputs.items[0]?.snippet||'',/ROUND410_RETURN/,JSON.stringify(revisitAfterCapture));

  // Switching back to an already-open PAIA tab must refresh the local return
  // state without restoring the removed shortcut. Focus must not advance the
  // service's fixed visit boundary.
  await p.bringToFront();
  await homeState(p,'return-new');
  const beforeFocus=await rpc(p,'PAIA_REVISIT_STATUS');
  await p.evaluate(()=>window.dispatchEvent(new Event('focus')));
  assert.equal((await rpc(p,'PAIA_REVISIT_STATUS')).newInputs.count,beforeFocus.newInputs.count,'focus preserves the established visit boundary');

  await p.evaluate(()=>document.dispatchEvent(new CustomEvent('paia:navigate',{detail:{view:'revisit'}})));
  await eventually(async()=>await p.locator('#revisit-panel').isVisible()&&(await p.locator('#revisit-panel').textContent()).includes('ROUND410_RETURN'),'internal navigation preserves the existing local Revisit result');
  assert.equal((await rpc(p,'PAIA_REVISIT_STATUS')).newInputs.count,1,'opening fixes a window without claiming read completion');
  assert.deepEqual(await rpc(p,'PAIA_READER_RECENT'),[],'visiting cannot fabricate a reading position');
  await p.locator('.revisit-close').click();
  await eventually(async()=>(await rpc(p,'PAIA_REVISIT_STATUS')).newInputs.count===0,'leaving advances only the visit boundary');
  await homeState(p,'return-quiet');

  assert.equal(h.deepSeekRequests.length,0);
  assert.equal(h.extensionNetworkRequests,0);
  assert.equal(h.externalRequests,0);
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
