import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{const r=await page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const reply=request=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({items:JSON.parse(request.messages[1].content).inputs.map(input=>({inputRef:input.ref,topic:{proposedName:'Round 8 共享正文'},section:{proposedName:'思考过程'},type:'idea',spans:[],uncertain:false}))})}}]});

test('Round 8 browser: opt-in direct Input Context, no denied-topic bypass, and one working body edits from Input or Thought',{timeout:120000},async()=>{
  const h=await FakeChatGPT.start({deepSeekFixture:reply});
  try{
    const p=h.archive,original='ROUND8_BROWSER_SHARED 最初的完整输入。';
    await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
    await h.open({id:'round8-shared-context',title:'Round 8 合成验收',base:1609459200,messages:[{id:'round8-one',text:original}]});
    await eventually(async()=>(await h.state()).records.length===1);

    // Direct Input is fail-closed until the explicit Settings switch is saved.
    assert.equal((await rpc(p,'PAIA_MEMORY_BUILD',{options:{query:'ROUND8_BROWSER_SHARED'}})).items.length,0);
    await p.locator('.sidebar [data-view=settings]').click();
    await eventually(async()=>!(await p.locator('#memory-include-unorganized-inputs').isChecked()));
    await p.locator('#memory-include-unorganized-inputs').check();await p.locator('#memory-settings-save').click();
    await eventually(async()=>(await rpc(p,'PAIA_MEMORY_STATUS')).config.includeUnorganizedInputs===true);
    await p.locator('[data-view=memory]').click();await eventually(async()=>await p.locator('#memory-prepare').isEnabled());
    await p.locator('#memory-prepare').click();await p.locator('#memory-query').fill('ROUND8_BROWSER_SHARED');await p.locator('#memory-build').click();
    await eventually(async()=>await p.locator('.memory-context-entry').count()===1);
    assert.match(await p.locator('#memory-preview-body').textContent(),/ROUND8_BROWSER_SHARED/);
    await p.locator('.memory-context-entry details').click();assert.equal(await p.getByRole('button',{name:'在 Input Archive 查看'}).count(),1);
    assert.equal(h.deepSeekRequests.length,0);

    // Organize the exact full Input once. It is no longer a direct-Input candidate;
    // the new Topic is still default-denied, so the opt-in cannot bypass Topic policy.
    await p.locator('.sidebar [data-view=settings]').click();await p.locator('#deepseek-api-key').fill('round8-synthetic-key');await p.locator('#deepseek-save').click();
    await eventually(async()=>(await p.locator('#deepseek-status').textContent()).includes('已配置'));
    if(!await p.locator('#original-organizer-status + button').isVisible())await p.locator('#organizer-advanced > summary').click();
    await p.locator('#original-organizer-status + button').click();
    await eventually(async()=>{const s=await rpc(p,'GET_ORIGINAL_ORGANIZER_STATUS');return s.bootstrap.processed===1&&s.state==='completed';});
    assert.equal(h.deepSeekRequests.length,1);
    const denied=await rpc(p,'PAIA_MEMORY_BUILD',{options:{query:'ROUND8_BROWSER_SHARED'}});assert.equal(denied.items.length,0);

    // Thought -> canonical Input.
    await p.locator('[data-view=thoughts]').click();await eventually(async()=>await p.locator('.topic-index-row').count()===1);await p.locator('.topic-index-row').click();
    await eventually(async()=>await p.locator('#topic-body .entry-prose').count()===1);
    const thoughtId=await p.locator('#topic-body .library-entry').getAttribute('data-entry-id');
    const thought=p.locator('#topic-body .entry-prose');await thought.fill('ROUND8_BROWSER_SHARED 从 Thought 修改。');await thought.blur();
    await eventually(async()=>{const e=await rpc(p,'GET_INPUT',{id:(await h.state()).library.blocks[0].id});return e.libraryText==='ROUND8_BROWSER_SHARED 从 Thought 修改。';});
    assert.equal((await h.state()).records[0].originalText,original);

    // Input -> same Thought.
    const inputId=(await h.state()).library.blocks[0].id,docId=(await h.state()).library.blocks[0].documentId;
    await p.locator('[data-view=library]').click();await p.locator(`.conversation-document[data-document-id="${docId}"]`).click();
    const input=p.locator('.library-prose');await input.fill('ROUND8_BROWSER_SHARED 从 Input 再修改。');await input.blur();
    await eventually(async()=>{const e=await rpc(p,'GET_LIBRARY_ENTRY',{id:thoughtId});return e.body==='ROUND8_BROWSER_SHARED 从 Input 再修改。';});
    assert.equal((await h.state()).records[0].originalText,original);

    // Explicit Topic authorization now exposes the Thought path, never a direct Input duplicate.
    await p.locator('[data-view=memory]').click();await p.locator('#memory-manage').click();
    await p.locator('.memory-topic-row select').selectOption('allowed');await eventually(async()=>(await rpc(p,'PAIA_MEMORY_STATUS')).allowed===1);
    const allowed=await rpc(p,'PAIA_MEMORY_BUILD',{options:{query:'ROUND8_BROWSER_SHARED'}});assert.ok(allowed.items.length>0);assert.ok(allowed.items.every(x=>x.kind==='entry'));assert.ok(allowed.items.every(x=>x.inputId===undefined));
    await pause(150);assert.equal(h.deepSeekRequests.length,1);assert.equal(h.extensionNetworkRequests,1);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
  } finally {await h.close();}
});
