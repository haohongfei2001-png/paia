import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{const r=await page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
async function consent(page){await page.locator('#consent-check').check();await page.locator('#enable-consent').click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'consent becomes durable');}

async function homeState(page,state){
 await eventually(async()=>await page.locator('#core-loop-home').isVisible()&&(await page.locator('#core-loop-home').getAttribute('data-state'))===state,`Archive home reaches ${state}`);
}

test('Round 4.10 current release: activation explains the product and return state promotes real local changes',{timeout:120000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;
  await consent(p);

  // Empty activation: explain the product before inventing any onboarding modal
  // or durable tutorial state. UX-R1 may render the shell in the system locale.
  await homeState(p,'activation-empty');
  assert.match(await p.locator('#core-loop-title').textContent(),/第一条输入|first input/i);
  assert.match(await p.locator('#core-loop-copy').textContent(),/本机|local/i);
  assert.equal(await p.locator('#core-loop-continue').isDisabled(),true);
  assert.equal(await p.locator('#core-loop-home .core-loop-card-primary').count(),0,'empty activation must not fabricate a primary action');

  // First captured Input is the activation event. PAIA must state clearly that
  // the archive contains the user's inputs, not AI answers.
  const first={id:'round410-first',title:'Round 4.10 First Input',base:1609459200,messages:[{id:'round410-first-message',text:'ROUND410_ACTIVATION 这是我第一次看到 PAIA 的价值。'}]};
  await h.open(first);
  await eventually(async()=>(await h.state()).records.some(row=>row.originalText.includes('ROUND410_ACTIVATION')),'first activation Input is captured');
  await p.bringToFront();
  await homeState(p,'return-new');
  assert.match(await p.locator('#core-loop-title').textContent(),/档案|Archive/i);
  assert.match(await p.locator('#core-loop-copy').textContent(),/上次停下|where you stopped/i);
  assert.equal(await p.locator('#core-loop-continue').isDisabled(),false);
  assert.equal(await p.locator('#core-loop-continue').evaluate(el=>el.classList.contains('core-loop-card-primary')),true,'continue reading is primary after first capture');

  // UX-R2 fixes the visit window and advances it on exit. Visiting creates no read position.
  await p.locator('#core-loop-return').click();
  await eventually(()=>p.locator('#revisit-panel').isVisible(),'Revisit opens as its own page');
  assert.match(await p.locator('.revisit-intro').textContent(),/不表示|does not mark/i);
  assert.deepEqual(await rpc(p,'PAIA_READER_RECENT'),[]);
  await p.locator('.revisit-close').click();

  // A later Input after that baseline is the return trigger. Verify the Revisit
  // semantic contract directly before asserting its home presentation, so a
  // future failure tells us whether data semantics or UI refresh regressed.
  const second={id:'round410-second',title:'Round 4.10 Return Input',base:1609462800,messages:[{id:'round410-second-message',text:'ROUND410_RETURN 我决定把 PAIA 的下一步重点放在第一次理解产品价值和第二次主动回来，而不是继续增加功能页。'}]};
  await h.open(second);
  await eventually(async()=>(await h.state()).records.some(row=>row.originalText.includes('ROUND410_RETURN')),'post-baseline Input is captured');
  const revisitAfterCapture=await rpc(p,'PAIA_REVISIT_STATUS');
  assert.equal(revisitAfterCapture.firstRun,false,JSON.stringify(revisitAfterCapture));
  assert.equal(revisitAfterCapture.newInputs.count,1,JSON.stringify(revisitAfterCapture));
  assert.match(revisitAfterCapture.newInputs.items[0]?.snippet||'',/ROUND410_RETURN/,JSON.stringify(revisitAfterCapture));

  // Switching back to an already-open PAIA tab must refresh the local return
  // state; ARCHIVE_CHANGED is the primary trigger and focus is only a fallback.
  // Observe the semantic state and its primary action together so an intermediate
  // async paint cannot be mistaken for the settled return presentation.
  await p.bringToFront();
  await homeState(p,'return-new');
  assert.match(await p.locator('#core-loop-title').textContent(),/档案|Archive/i);
  assert.doesNotMatch(await p.locator('#core-loop-return').textContent(),/\d+ 条|\d+ new input/i,'no unread debt count');

  // A focus refresh must not briefly regress an established return state back
  // through activation-ready while the async Revisit read catches up.
  const focusTransitions=await p.evaluate(()=>new Promise(resolve=>{
   const home=document.getElementById('core-loop-home'),seen=[];
   const observer=new MutationObserver(()=>seen.push(home?.dataset.state||''));
   observer.observe(home,{attributes:true,attributeFilter:['data-state']});
   window.dispatchEvent(new Event('focus'));
   setTimeout(()=>{observer.disconnect();resolve(seen);},150);
  }));
  assert.equal(focusTransitions.includes('activation-ready'),false,JSON.stringify(focusTransitions));

  await p.locator('#core-loop-return').click();
  await eventually(async()=>await p.locator('#revisit-panel').isVisible()&&(await p.locator('#revisit-panel').textContent()).includes('ROUND410_RETURN'),'promoted return action opens the existing local Revisit result');
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
