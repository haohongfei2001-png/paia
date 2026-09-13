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
  await homeState(p,'activation-ready');
  assert.match(await p.locator('#core-loop-title').textContent(),/这里保存的是你给 AI 的输入|keeps what you sent to AI/i);
  assert.match(await p.locator('#core-loop-copy').textContent(),/不是 AI 的回答|not AI replies/i);
  assert.equal(await p.locator('#core-loop-continue').isDisabled(),false);
  assert.equal(await p.locator('#core-loop-continue').evaluate(el=>el.classList.contains('core-loop-card-primary')),true,'continue reading is primary after first capture');

  // Establish the existing Revisit baseline through the real UI. This is the
  // only persistent return marker; Round 4.10 must not create a second tutorial
  // completion or engagement state store.
  await p.locator('#core-loop-return').click();
  await eventually(async()=>await p.locator('#revisit-dialog').evaluate(el=>el.open),'Revisit opens for first-run baseline');
  assert.match(await p.locator('.revisit-intro').textContent(),/第一次打开回访/);
  await p.locator('#revisit-dialog footer .primary').click();
  await eventually(async()=>!(await rpc(p,'PAIA_REVISIT_STATUS')).firstRun,'Revisit baseline becomes durable');
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
  await p.bringToFront();
  await homeState(p,'return-new');
  assert.match((await p.locator('#core-loop-eyebrow').textContent()).trim(),/欢迎回来|welcome back/i);
  assert.match(await p.locator('#core-loop-title').textContent(),/1 条新输入|1 new input/i);
  assert.equal(await p.locator('#core-loop-return').evaluate(el=>el.classList.contains('core-loop-card-primary')),true,'return/revisit becomes primary when real new material exists');
  assert.equal(await p.locator('#core-loop-continue').evaluate(el=>el.classList.contains('core-loop-card-primary')),false);

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
  await eventually(async()=>await p.locator('#revisit-dialog').evaluate(el=>el.open)&&(await p.locator('#revisit-dialog').textContent()).includes('ROUND410_RETURN'),'promoted return action opens the existing local Revisit result');
  // Merely opening Revisit must not silently mark content as read. The existing
  // user-controlled contract advances the marker only after “已读到这里”.
  assert.equal((await rpc(p,'PAIA_REVISIT_STATUS')).newInputs.count,1,'opening Revisit alone keeps the new-input marker');
  await p.locator('#revisit-dialog footer .primary').click();
  await eventually(async()=>(await rpc(p,'PAIA_REVISIT_STATUS')).newInputs.count===0,'explicit Revisit mark advances the new-input marker');
  await p.locator('.revisit-close').click();
  await eventually(async()=>(await p.locator('#core-loop-home').getAttribute('data-state'))!=='return-new','closing Revisit clears explicitly viewed-new state from home');
  assert.doesNotMatch(await p.locator('#core-loop-title').textContent(),/1 条新输入|1 new input/i);

  assert.equal(h.deepSeekRequests.length,0);
  assert.equal(h.extensionNetworkRequests,0);
  assert.equal(h.externalRequests,0);
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
