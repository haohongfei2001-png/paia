import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{const r=await page.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r?.ok,true,JSON.stringify(r));return r.data;};
const digestSources=page=>page.evaluate(async()=>{
 const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),rows=await s.run(()=>s.repository.transaction(false,t=>t.all('records'))),text=JSON.stringify(rows.map(r=>[r.id,r.value.sourceKey,r.value.originalText,r.value.sourceSentAt,r.value.capturedAt]).sort((a,b)=>a[0].localeCompare(b[0]))),hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));await s.repository.close();return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
});

test('ANS-08 Chrome windowing preserves dirty, IME, selection and bounded save/undo state',{timeout:180000},async()=>{
 const h=await FakeChatGPT.start({headless:false}),page=h.archive;
 try{
  await page.setViewportSize({width:1280,height:720});await page.locator('#consent-check').check();await page.locator('#enable-consent').click();
  await eventually(async()=>{const status=await rpc(page,'GET_STATUS');return status.consented===true&&status.enabled===true;},'ANS-08 consent is durable before synthetic capture');
  const seed=await page.evaluate(async()=>{
   const [{OrganizerStore},{refreshEntryIndex}]=await Promise.all([import('../core/organizer/store.js'),import('../core/thought-model.js')]),s=new OrganizerStore(chrome.storage.local),op=()=>crypto.randomUUID(),rank=n=>String(n*1024).padStart(12,'0'),pad=n=>String(n).padStart(4,'0');
   const epoch=(await s.status()).epoch;await s.capture({epoch,adapterVersion:'0.3.0',chat:{id:'ans08-edit-source',url:'https://chatgpt.com/c/ans08-edit-source',title:'ANS08 synthetic source'},messages:[{sourceMessageId:'ans08-source-message',pageOrder:1,originalText:'ANS08 immutable source text'}]});
   const block=(await s.run(()=>s.repository.transaction(false,t=>t.all('blocks'))))[0].value,topic=await s.createTopic({name:'ANS08_EDIT_SAFE_TOPIC',operationId:op()}),backed=await s.addToTopics({kind:'input',id:block.id,expectedRevision:block.revision,operationId:op(),topicIds:[topic.id]}),user=await s.continueThinking({operationId:op(),body:'ANS08 editable 0001',topicId:topic.id});
   await s.foundationWrite(async t=>{const live=await t.get('topics',topic.id),template=await t.get('thoughts',user.id),section=await t.get('sections',JSON.stringify([topic.id,live.activeLayoutGeneration,live.defaultSectionId])),base=await t.get('placements',JSON.stringify([topic.id,live.activeLayoutGeneration,user.id]));section.rank=rank(1);await t.put('sections',section);
    const backedPlacement=await t.get('placements',JSON.stringify([topic.id,live.activeLayoutGeneration,backed.id]));backedPlacement.sectionRank=section.rank;backedPlacement.rank=rank(1);backedPlacement.revision++;await t.put('placements',backedPlacement);
    base.sectionRank=section.rank;base.rank=rank(2);base.revision++;await t.put('placements',base);
    for(let i=2;i<180;i++){const id='ans08-edit-entry-'+pad(i),row={...structuredClone(template),id},at=new Date(Date.UTC(2026,2,1)+i*1000).toISOString();row.thoughtText='ANS08 editable '+pad(i);row.createdAt=at;row.updatedAt=at;row.createdSequence=(template.createdSequence||1)+i;row.updatedSequence=(template.updatedSequence||1)+i;row.sourceRecordIds=[];row.provenanceType='user_created';refreshEntryIndex(row);await t.put('thoughts',row);await t.put('placements',{...structuredClone(base),id:JSON.stringify([topic.id,live.activeLayoutGeneration,id]),entryId:id,rank:rank(i+1),revision:0});}
    live.organizationRevision++;live.countVersion=(live.countVersion||0)+1;await t.put('topics',live);
   });await s.repository.close();return {topicId:topic.id,backedId:backed.id,count:180};
  });
  const sourceBefore=await digestSources(page),reverseBefore=await rpc(page,'GET_THOUGHT_REVERSE_EDIT');assert.equal(reverseBefore.enabled,false);

  await page.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);window.ans08Edit={failEdits:false,tracked:[],failedBatchSizes:[],savedBatchSizes:[],completedBatchSizes:[],pendingSaves:0,historySizes:[]};window.ans08EditRestore=()=>chrome.runtime.sendMessage=send;chrome.runtime.sendMessage=(message,...args)=>{if(message?.type==='GET_LIBRARY_TRACKED_ENTRIES')window.ans08Edit.tracked.push(message.options?.ids?.length||0);if(message?.type==='EDIT_LIBRARY_BATCH'){const n=message.edit?.entries?.length||0;if(window.ans08Edit.failEdits){window.ans08Edit.failedBatchSizes.push(n);return Promise.resolve({ok:false,error:'STORAGE_FAILED'});}window.ans08Edit.savedBatchSizes.push(n);window.ans08Edit.pendingSaves++;return send(message,...args).then(result=>{if(result?.ok&&!result.data?.conflict)window.ans08Edit.completedBatchSizes.push(n);return result;}).finally(()=>window.ans08Edit.pendingSaves--);}if(message?.type==='THOUGHT_EDIT_HISTORY')window.ans08Edit.historySizes.push(message.edit?.items?.length||0);return send(message,...args);};});

  await page.locator('[data-view=thoughts]').click();await eventually(async()=>await page.locator('[data-topic-id="'+seed.topicId+'"]').count()===1,'edit topic root',30000);await page.locator('[data-topic-id="'+seed.topicId+'"]').click();await eventually(async()=>await page.locator('#topic-body [data-entry-id]').count()>=40,'initial edit rows',30000);
  const sentinel=page.locator('#topic-continuous-after');for(let i=0;i<2;i++){const before=await page.locator('#topic-body [data-entry-id]').count();await sentinel.focus();await sentinel.press('Enter');await eventually(async()=>await page.locator('#topic-body [data-entry-id]').count()>before,'load edit window',20000);}
  assert.ok(await page.locator('#topic-body [data-entry-id]').count()>=110);

  const setup=await page.evaluate(()=>{
   const nodes=[...document.querySelectorAll('#topic-body [data-entry-id]')],dirty=[],ime=nodes[5],selection=nodes[45],originalBody=nodes[0].querySelector('[data-entry-field="body"]').textContent;window.ans08Nodes={dirty:nodes[0],ime,selection};
   for(let i=0;i<100;i++){if(i===5||i===45)continue;const field=nodes[i].querySelector('[data-entry-field="body"]');field.textContent=field.textContent+' DIRTY_'+String(i).padStart(3,'0');field.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'x'}));dirty.push(nodes[i].dataset.entryId);}
   window.ans08Edit.failEdits=true;return {originalBody,dirtyIds:dirty,dirtyId:nodes[0].dataset.entryId,imeId:ime.dataset.entryId,selectionId:selection.dataset.entryId,imeText:'ANS08 IME 未提交草稿'};
  });
  await pause(1000);await eventually(async()=>await page.evaluate(()=>window.ans08Edit.failedBatchSizes.length>0),'synthetic save failure',10000);
  await page.evaluate(({imeId,imeText})=>{const ime=document.querySelector('[data-entry-id="'+imeId+'"]'),imeField=ime.querySelector('[data-entry-field="body"]');window.ans08Nodes.ime=ime;imeField.focus();imeField.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));imeField.textContent=imeText;const text=imeField.firstChild||imeField.appendChild(document.createTextNode(''));const range=document.createRange();range.setStart(text,Math.min(7,text.length));range.collapse(true);getSelection().removeAllRanges();getSelection().addRange(range);},setup);

  await page.evaluate(()=>document.getElementById('topic-continuous-after').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
  await eventually(async()=>await page.evaluate(()=>window.ans08Edit.tracked.length>=2),'tracked batches over 100',20000);
  // Tracking is the preflight; the bounded read/render happens afterwards. Wait for the actual
  // protected layout so the assertion observes 120 clean rows plus off-window dirty/IME pins.
  await eventually(async()=>await page.locator('#topic-body [data-entry-id]').count()>120,'pinned rows materialize beyond the clean 120-row window',20000);
  const afterIme=await page.evaluate(({dirtyId,imeId,imeText})=>{const dirty=document.querySelector('[data-entry-id="'+dirtyId+'"]'),ime=document.querySelector('[data-entry-id="'+imeId+'"]'),sel=getSelection();return {dirtySame:dirty===window.ans08Nodes.dirty,imeSame:ime===window.ans08Nodes.ime,imeText:ime?.querySelector('[data-entry-field="body"]')?.textContent,focused:document.activeElement===ime?.querySelector('[data-entry-field="body"]'),caret:sel?.isCollapsed?sel.anchorOffset:null,expected:imeText,dom:document.querySelectorAll('#topic-body [data-entry-id]').length};},setup);
  assert.equal(afterIme.dirtySame,true);assert.equal(afterIme.imeSame,true);assert.equal(afterIme.imeText,setup.imeText);assert.equal(afterIme.focused,true);assert.equal(afterIme.caret,7);assert.ok(afterIme.dom>120,'pins may exceed the clean 120-row target rather than discard user work');
  const tracked1=await page.evaluate(()=>[...window.ans08Edit.tracked]);assert.ok(tracked1.some(n=>n===100));assert.ok(tracked1.some(n=>n>0&&n<=100));

  await page.evaluate(({selectionId})=>{const ime=window.ans08Nodes.ime.querySelector('[data-entry-field="body"]');ime.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));const field=document.querySelector('[data-entry-id="'+selectionId+'"] [data-entry-field="body"]'),node=field.firstChild||field.appendChild(document.createTextNode(field.textContent||'')),range=document.createRange();range.setStart(node,0);range.setEnd(node,Math.min(6,node.length));getSelection().removeAllRanges();getSelection().addRange(range);window.ans08SelectionText=range.toString();},setup);
  const callsBefore=await page.evaluate(()=>window.ans08Edit.tracked.length);await page.evaluate(()=>document.getElementById('topic-continuous-after').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
  await eventually(async()=>await page.evaluate(n=>window.ans08Edit.tracked.length>n,callsBefore),'selection protected load',20000);
  const selectionAfter=await page.evaluate(({selectionId})=>({same:document.querySelector('[data-entry-id="'+selectionId+'"]')===window.ans08Nodes.selection,text:getSelection()?.toString(),expected:window.ans08SelectionText}),setup);assert.equal(selectionAfter.same,true);assert.equal(selectionAfter.text,selectionAfter.expected);

  await page.evaluate(()=>{window.ans08Edit.failEdits=false;const field=window.ans08Nodes.dirty.querySelector('[data-entry-field="body"]');field.textContent=field.textContent+' RECOVER';field.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'R'}));getSelection().removeAllRanges();});
  await eventually(async()=>{const state=await page.evaluate(()=>window.ans08Edit);return state.pendingSaves===0&&state.completedBatchSizes.length>=3&&state.completedBatchSizes.length===state.savedBatchSizes.length&&state.completedBatchSizes.every(n=>n>0&&n<=40);},'bounded retry save batches',30000);
  const savedBody=await rpc(page,'GET_LIBRARY_ENTRY',{id:setup.dirtyId});assert.equal(savedBody.body,setup.originalBody+' DIRTY_000 RECOVER');
  assert.equal((await rpc(page,'GET_LIBRARY_ENTRY',{id:setup.imeId})).body,setup.imeText);
  const saveSizes=await page.evaluate(()=>[...window.ans08Edit.savedBatchSizes]);assert.ok(saveSizes.every(n=>n<=40));assert.ok(saveSizes.length>=3);

  // Undo is global: focus another row, but verify the last saved edit on nodes[0].
  const undoTarget=setup.dirtyId,focusedId=setup.dirtyIds.at(-1),otherBody=(await rpc(page,'GET_LIBRARY_ENTRY',{id:focusedId})).body;await page.locator('[data-entry-id="'+focusedId+'"] [data-entry-field="body"]').focus();await page.keyboard.press(process.platform==='darwin'?'Meta+z':'Control+z');
  await eventually(async()=>(await rpc(page,'GET_LIBRARY_ENTRY',{id:undoTarget})).body===setup.originalBody,'bounded undo restores the exact persisted pre-edit body',20000);
  assert.equal((await rpc(page,'GET_LIBRARY_ENTRY',{id:focusedId})).body,otherBody,'focus does not choose the undo target');
  await page.keyboard.press(process.platform==='darwin'?'Meta+Shift+z':'Control+Shift+z');
  await eventually(async()=>(await rpc(page,'GET_LIBRARY_ENTRY',{id:undoTarget})).body===savedBody.body,'redo restores the exact saved body',20000);
  const historySizes=await page.evaluate(()=>[...window.ans08Edit.historySizes]);assert.ok(historySizes.length>0);assert.ok(historySizes.every(n=>n>0&&n<=40));

  const sourceAfter=await digestSources(page),reverseAfter=await rpc(page,'GET_THOUGHT_REVERSE_EDIT');assert.equal(sourceAfter,sourceBefore,'Source truth is byte-stable across windowed Thought edits');assert.equal(reverseAfter.enabled,false);
  await mkdir('work/ans-08',{recursive:true});await page.screenshot({path:'work/ans-08/topic-edit-preservation.png',fullPage:true});
  const evidence={trackedBatches:await page.evaluate(()=>[...window.ans08Edit.tracked]),failedBatchSizes:await page.evaluate(()=>[...window.ans08Edit.failedBatchSizes]),savedBatchSizes:saveSizes,completedBatchSizes:await page.evaluate(()=>[...window.ans08Edit.completedBatchSizes]),undoTarget,globalUndoVerified:true,exactUndoRedoVerified:true,historySizes,dirtyNodePreserved:afterIme.dirtySame,imeNodePreserved:afterIme.imeSame,imeCaret:afterIme.caret,selectionPreserved:selectionAfter.same,sourceDigestBefore:sourceBefore,sourceDigestAfter:sourceAfter,reverseEdit:false,externalRequests:h.externalRequests,extensionNetworkRequests:h.extensionNetworkRequests,deepSeekRequests:h.deepSeekRequests.length};
  await writeFile('work/ans-08/topic-edit-preservation.json',JSON.stringify(evidence,null,2));console.log('ANS08_EDIT_EVIDENCE '+JSON.stringify(evidence));
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
 }finally{await page.evaluate(()=>window.ans08EditRestore?.()).catch(()=>{});await h.close();}
});
