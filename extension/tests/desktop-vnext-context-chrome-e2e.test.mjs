import {compareD5Context} from './harness/d5-context-presentation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(m=>chrome.runtime.sendMessage(m),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const state=p=>p.evaluate(async()=>{const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));return getContextController().data;});
for(const variant of ['source','release'])test('D4 '+variant+' production workspace retains incoming originals, requires explicit review and clears denied output including fallback',{timeout:180000},async()=>{
 if(variant==='release')execFileSync('python3',['scripts/build_current_release.py'],{maxBuffer:16*1024*1024});
 const h=await FakeChatGPT.start(variant==='release'?{extensionPath:'work/current-release'}:{}),p=h.archive;
 try{
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented,'consent');
  await h.open({id:'d4-context',title:'D4 synthetic source',base:1609459200,messages:[{id:'d4-context-input-a',text:'D4_ORIGINAL_CANARY first human expression'},{id:'d4-context-input-b',text:'D4_ORIGINAL_CANARY second human expression'}]});
  await eventually(async()=>(await h.state()).records.length===2,'two originals');const originalRecords=(await h.state()).records;await p.bringToFront();
  await p.locator('#primary-nav [data-view=memory]').click();await p.getByRole('button',{name:'从档案选择',exact:true}).click();
  await p.getByRole('searchbox',{name:'全局搜索'}).fill('D4_ORIGINAL_CANARY');await eventually(async()=>await p.locator('.universal-hit').count()===2,'search');
  await p.locator('.universal-selection').getByRole('button',{name:'全选本页',exact:true}).click();await p.locator('.universal-selection').getByRole('button',{name:/加入本次材料/}).click();
  await eventually(async()=>(await state(p))?.items.length===2&&await p.locator('[data-material-edit=purpose]').isVisible(),'same workspace selection');
  assert.equal(await p.locator('.material-drawer').count(),0);assert.equal(await p.locator('#memory-build-form').count(),0);
  await p.locator('#material-preview').click();await eventually(async()=>/任务/.test(await p.locator('.material-status').textContent()),'missing purpose retained');assert.equal((await state(p)).items.length,2);
  await p.locator('[data-material-edit=purpose]').fill('Compare these expressions');await p.locator('#material-preview').click();
  await eventually(async()=>(await state(p)).state==='review','compile only');assert.equal(await p.locator('[data-output=copy]').isDisabled(),true);
  const compiled=await state(p);const rejected=await p.evaluate(s=>chrome.runtime.sendMessage({type:'PAIA_CONTEXT_MANUAL',options:{action:'share',selectionId:s.selectionId,generation:s.generation,format:'copy'}}),compiled);assert.equal(rejected.ok,false);
  await p.locator('#context-confirm-review').click();await eventually(async()=>(await state(p)).state==='ready','explicit review');
  await p.getByRole('button',{name:'编辑完整输出',exact:true}).click();await p.locator('[data-material-edit=output]').fill('D4_OUTPUT_ONLY edited synthesis');
  await p.getByRole('button',{name:'确认本次修改',exact:true}).click();await eventually(async()=>(await state(p)).state==='review','output edit invalidates prior review');
  assert.equal(await p.locator('[data-output=copy]').isDisabled(),true);await p.locator('#context-confirm-review').click();await eventually(async()=>(await state(p)).state==='ready','edited output reviewed');
  const reviewed=await state(p);assert.equal(reviewed.text,'D4_OUTPUT_ONLY edited synthesis');assert.equal(reviewed.outputEdited,true);
  await p.locator('#primary-nav [data-view=library]').click();await eventually(()=>p.locator('#scope-search').isEnabled(),'left Context');
  await p.locator('#primary-nav [data-view=memory]').click();await eventually(async()=>await p.locator('[data-output=copy]').isEnabled()&&await p.locator('#material-output-text').textContent()===reviewed.text,'same ready output restored only after fresh read');
  await p.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('synthetic denial');}}});});
  await p.locator('[data-output=copy]').click();await eventually(()=>p.locator('.material-copy-fallback').isVisible(),'manual fallback');assert.equal(await p.locator('.material-copy-fallback').inputValue(),reviewed.text);
  await mkdir('work/qa-dvn-context',{recursive:true});const sizes=[];
  for(const width of [1440,900,390,320]){await p.setViewportSize({width,height:900});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await p.screenshot({path:`work/qa-dvn-context/${variant}-${width}.png`,fullPage:true,animations:'disabled'});sizes.push(width);}
  await p.getByRole('button',{name:'编辑完整输出',exact:true}).click();await p.locator('[data-material-edit=output]').fill('D4_UNSENT_RECONCILE');
  const input=await rpc(p,'GET_INPUT',{id:compiled.items[0].ref.id});await rpc(p,'EDIT_DOCUMENT',{edit:{documentId:input.documentId,operationId:crypto.randomUUID(),blocks:[{id:input.id,expectedRevision:input.revision,libraryText:'D4_HUMAN_CURRENT_CHANGE',note:input.note,excluded:false}]}});
  await eventually(async()=>(await state(p)).state==='stale'&&await p.locator('.context-reconcile').isVisible(),'changed source has an explicit reconciliation action without discarding the draft');
  const draft=()=>p.evaluate(async()=>{const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));return getContextController().drafts.get('output');});
  assert.equal(await draft(),'D4_UNSENT_RECONCILE');assert.equal(await p.locator('[data-material-edit=output]').inputValue(),'');assert.equal(await p.locator('[data-material-edit=output]').isEditable(),false);assert.equal(await p.locator('.material-copy-fallback').count(),0);await p.screenshot({path:`work/qa-dvn-context/${variant}-stale-review.png`,fullPage:true,animations:'disabled'});
  const staleGeneration=(await state(p)).generation;p.once('dialog',dialog=>dialog.dismiss());await p.locator('.context-reconcile').click();await eventually(()=>p.evaluate(async()=>{const {getContextController}=await import(chrome.runtime.getURL('ui/context-workspace.js'));return !getContextController().busy;}),'cancelled reconciliation finished');
  assert.equal(await draft(),'D4_UNSENT_RECONCILE');assert.equal((await state(p)).generation,staleGeneration);
  p.once('dialog',async dialog=>{assert.match(dialog.message(),/尚未提交/);await dialog.accept();});await p.locator('.context-reconcile').click();await eventually(async()=>(await state(p)).state==='dirty','explicit reconciliation accepted');assert.equal(await draft(),undefined);
  await p.locator('#material-preview').click();await eventually(async()=>(await state(p)).state==='review','fresh reconciled output still needs review');assert.match((await state(p)).text,/D4_HUMAN_CURRENT_CHANGE/);assert.equal(await p.locator('[data-output=copy]').isDisabled(),true);await p.locator('#context-confirm-review').click();await eventually(async()=>(await state(p)).state==='ready','fresh output explicitly reviewed');
  await p.locator('[data-output=copy]').click();await eventually(()=>p.locator('.material-copy-fallback').isVisible(),'fresh fallback after explicit review');
  await rpc(p,'PAIA_MEMORY_EXCLUDE',{options:{inputId:compiled.items[0].ref.id,excluded:true}});await eventually(async()=>(await state(p)).state==='blocked','deny');assert.equal(await p.locator('.material-copy-fallback').count(),0);assert.equal(await p.locator('#material-output-text').count(),0);
  await p.getByRole('button',{name:'返回材料',exact:true}).click();const hiddenTarget=(await state(p)).items.find(item=>item.state==='ready');assert.ok(hiddenTarget);
  await p.locator('.material-permissions-open').click();await p.locator('.material-connections-dialog').getByRole('button',{name:'管理允许范围',exact:true}).click();await eventually(()=>p.locator('#memory-authorizations').isVisible(),'permission management hides the same Context root');assert.equal(await p.locator('#material-workbench').isVisible(),false);
  await rpc(p,'PAIA_MEMORY_EXCLUDE',{options:{inputId:hiddenTarget.ref.id,excluded:true}});await eventually(async()=>(await state(p)).items.every(item=>item.state==='blocked'),'hidden material denied');assert.equal((await p.locator('#material-workbench').textContent()).includes(hiddenTarget.body),false,'hidden workspace retains no denied material body');
  assert.deepEqual((await h.state()).records,originalRecords,'Context never changes original records');assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
  await writeFile(`work/qa-dvn-context/${variant}.json`,JSON.stringify({result:'PASS',head:process.env.PAIA_TESTED_HEAD||'local-uncommitted',variant,sizes,zeroExternalRequests:true,compileCannotRelease:true,denyClearsFallback:true,hiddenDeniedBodyCleared:true},null,2));
 }finally{await h.close();}
});

// Separate D5 visual fixtures preserve the original D4 interaction journeys.
for(const variant of ['source','release'])test(`D5 C04/C06/C08 preview preserves exact output, explicit review and saved reading preferences (${variant})`,{timeout:240000},async()=>{
 if(variant==='release')execFileSync('python3',['scripts/build_current_release.py'],{maxBuffer:16*1024*1024});
 const h=await FakeChatGPT.start(variant==='release'?{extensionPath:'work/current-release'}:{}),p=h.archive;
 try{
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented);
  await h.open({id:'d5-context-'+variant,title:'D5 synthetic Context',base:1609459200,messages:[{id:'d5-context-a',text:'D5_CONTEXT_LITERAL 第一段合成表达\n<literal> 👩‍💻 é\n保留原话和空行。\n\n尚未决定。'},{id:'d5-context-b',text:'D5_CONTEXT_LITERAL 第二段合成表达\n不把一次观察写成永久结论。'}]});
  await eventually(async()=>(await h.state()).records.length===2);const originalRecords=structuredClone((await h.state()).records);await p.bringToFront();
  await p.locator('#primary-nav [data-view=memory]').click();await p.getByRole('button',{name:'从档案选择',exact:true}).click();await p.getByRole('searchbox',{name:'全局搜索'}).fill('D5_CONTEXT_LITERAL');await eventually(async()=>await p.locator('.universal-hit').count()===2);await p.locator('.universal-selection').getByRole('button',{name:'全选本页',exact:true}).click();await p.locator('.universal-selection').getByRole('button',{name:/加入本次材料/}).click();await eventually(async()=>(await state(p))?.items.length===2&&await p.locator('[data-material-edit=purpose]').isVisible());
  await p.locator('[data-material-edit=purpose]').fill('核对这些明确选择的表达，保留尚未决定的部分。');await p.locator('#material-preview').click();await eventually(async()=>(await state(p)).state==='review');
  await compareD5Context(h,variant);assert.deepEqual((await h.state()).records,originalRecords,'visual review never changes immutable Source');assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
