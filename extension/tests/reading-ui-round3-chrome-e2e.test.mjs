import test from 'node:test';
import assert from 'node:assert/strict';
import {uiHarness} from './harness/library-ui-round3.mjs';
const optional=['GET_AI_PRESENTATION_STATUS','GET_ORIGINAL_ORGANIZER_STATUS','GET_ORGANIZER_CONTROLS','GET_BOUNDED_ORGANIZER','GET_DEEPSEEK_STATUS','GET_LIBRARY_UNPLACED'];

test('Round 3 native DOM: every optional failure leaves the core Home readable',{timeout:30000},async()=>{
 const h=await uiHarness();try{for(const type of optional){const p=await h.page();
  await p.evaluate(type=>{behavior[type]='fail';return workspace.refresh();},type);
  assert.equal(await p.locator('[data-topic-id]').count(),2,type);
  assert.equal(await p.locator('#thought-collection').getAttribute('data-state'),'ready');
  assert.equal(await p.evaluate(()=>calls[0]),'LIBRARY_INDEX_PAGE');
  await p.waitForTimeout(80);assert.equal(await p.evaluate(()=>workspace.readFailed===true),false,type);
  await p.close();
 }assert.equal(h.externalRequests,0);}finally{await h.close();}
});
test('Round 3 native DOM: hanging optional calls block neither Home nor original Topic',{timeout:15000},async()=>{
 const h=await uiHarness();try{const p=await h.page();await p.evaluate(types=>{for(const t of types)behavior[t]='hang';return workspace.refresh();},optional);
 assert.equal(await p.locator('[data-topic-id]').count(),2);
 await p.evaluate(id=>workspace.open(id),h.topics[0].id);
 assert.match(await p.locator('#original-reading-body').innerText(),/Synthetic original/);
 assert.equal(await p.locator('#topic-body').evaluate(n=>n.inert),false);
 assert.equal(await p.evaluate(()=>workspace.readFailed===true),false);
 }finally{await h.close();}
});
test('Round 3 native DOM: cold failure is not an empty library; explicit retry restores reading',{timeout:15000},async()=>{
 const h=await uiHarness();try{const p=await h.page();await p.evaluate(()=>{behavior.LIBRARY_INDEX_PAGE='fail';return workspace.refresh();});
 assert.match(await p.locator('#error').innerText(),/尚未获得/);assert.doesNotMatch(await p.locator('#error').innerText(),/内容保留|仍显示/);
 assert.equal(await p.locator('#thought-empty').isVisible(),false);assert.equal(await p.locator('#library-read-retry').isVisible(),true);
 await p.evaluate(()=>delete behavior.LIBRARY_INDEX_PAGE);await p.locator('#library-read-retry').click();
 await p.waitForFunction(()=>document.querySelectorAll('[data-topic-id]').length===2);
 assert.equal(await p.locator('#library-read-retry').isVisible(),false);
 }finally{await h.close();}
});
test('Round 3 native DOM: warm failure keeps the exact previously rendered node',{timeout:15000},async()=>{
 const h=await uiHarness();try{const p=await h.page();await p.evaluate(()=>workspace.refresh());await p.waitForTimeout(150);
 await p.evaluate(()=>{window.kept=document.querySelector('[data-topic-id]');behavior.LIBRARY_INDEX_PAGE='fail';return workspace.refresh();});
 assert.match(await p.locator('#error').innerText(),/上次成功读取/);assert.equal(await p.evaluate(()=>kept===document.querySelector('[data-topic-id]')),true);
 }finally{await h.close();}
});
test('Round 3 native DOM: first failed Topic read cannot claim to retain Home as Topic content',{timeout:15000},async()=>{
 const h=await uiHarness();try{const p=await h.page();await p.evaluate(()=>workspace.refresh());
 await p.evaluate(id=>{behavior.TOPIC_DOCUMENT_PAGE='fail';return workspace.open(id);},h.topics[0].id);
 assert.match(await p.locator('#error').innerText(),/尚未获得/);assert.equal(await p.locator('#topic-body').evaluate(n=>n.inert),true);
 }finally{await h.close();}
});
test('Round 3 native DOM: late Topic A response cannot publish a snapshot for Topic B',{timeout:15000},async()=>{
 const h=await uiHarness();try{const p=await h.page();await p.evaluate(id=>{behavior.TOPIC_DOCUMENT_PAGE='defer';window.openA=workspace.open(id);},h.topics[0].id);
 await p.waitForFunction(()=>deferred.TOPIC_DOCUMENT_PAGE?.length===1);
 await p.evaluate(id=>{delete behavior.TOPIC_DOCUMENT_PAGE;window.openB=workspace.open(id);},h.topics[1].id);
 await p.waitForFunction(id=>workspace.id===id,h.topics[1].id);
 await p.evaluate(async()=>{deferred.TOPIC_DOCUMENT_PAGE.shift()();await Promise.all([openA,openB]);});
 assert.match(await p.locator('#topic-heading').innerText(),/Topic B/);assert.doesNotMatch(await p.locator('#original-reading-body').innerText(),/Topic A/);
 assert.equal(await p.evaluate(()=>workspace.snapshotKey===workspace.readKey()),true);
 }finally{await h.close();}
});
test('Round 3 native DOM: optional status completion preserves composition, node, caret and core read count',{timeout:15000},async()=>{
 const h=await uiHarness();try{const p=await h.page();await p.evaluate(id=>{behavior.GET_AI_PRESENTATION_STATUS='defer';return workspace.open(id);},h.topics[0].id);
 await p.waitForFunction(()=>deferred.GET_AI_PRESENTATION_STATUS?.length===1);
 await p.evaluate(()=>{const n=document.querySelector('[data-entry-field=body]');n.focus();n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));n.textContent='Synthetic composing draft';const r=new Range();r.setStart(n.firstChild,7);r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r);window.kept=n;window.readCount=calls.filter(t=>t==='TOPIC_DOCUMENT_PAGE').length;deferred.GET_AI_PRESENTATION_STATUS.shift()();});
 await p.waitForTimeout(200);
 assert.deepEqual(await p.evaluate(()=>({same:kept===document.querySelector('[data-entry-field=body]'),focused:document.activeElement===kept,caret:getSelection().anchorOffset,reads:calls.filter(t=>t==='TOPIC_DOCUMENT_PAGE').length===readCount})),{same:true,focused:true,caret:7,reads:true});
 }finally{await h.close();}
});
test('Round 3 native DOM: unavailable AI read is not a successful empty AI presentation',{timeout:15000},async()=>{
 const h=await uiHarness();try{const p=await h.page();await p.evaluate(id=>{workspace.view='ai';workspace.viewPreferenceChosen=true;behavior.GET_AI_PRESENTATION_STATUS='fail';return workspace.open(id);},h.topics[0].id);
 assert.match(await p.locator('#error').innerText(),/尚未获得/);assert.doesNotMatch(await p.locator('#ai-reading-body').innerText(),/尚无 AI整理/);
 }finally{await h.close();}
});

test('Round 3 native DOM: late optional success cannot bless a failed core refresh',{timeout:15000},async()=>{
 const h=await uiHarness();try{const p=await h.page();await p.evaluate(()=>{behavior.GET_AI_PRESENTATION_STATUS='defer';return workspace.refresh();});
 await p.waitForFunction(()=>deferred.GET_AI_PRESENTATION_STATUS?.length===1);
 await p.evaluate(()=>{behavior.LIBRARY_INDEX_PAGE='fail';return workspace.refresh();});
 await p.evaluate(()=>deferred.GET_AI_PRESENTATION_STATUS.shift()());await p.waitForTimeout(150);
 assert.equal(await p.evaluate(()=>workspace.readFailed),true);
 assert.equal(await p.locator('#library-read-retry').isVisible(),true);
 assert.match(await p.locator('#error').innerText(),/上次成功读取/);
 }finally{await h.close();}
});
test('Round 3 native DOM: stored reading preference restores once without a perpetual list loop',{timeout:15000},async()=>{
 const h=await uiHarness();try{await h.s.setOrganizerControls({readingSort:'desc'});const p=await h.page();await p.evaluate(()=>workspace.refresh());
 await p.waitForFunction(()=>workspace.preferencesLoaded&&workspace.readingSort==='desc');await p.waitForTimeout(200);
 const reads=await p.evaluate(()=>calls.filter(t=>t==='LIBRARY_INDEX_PAGE').length);assert.ok(reads<=2);assert.equal(await p.locator('[data-topic-id]').count(),2);
 }finally{await h.close();}
});
test('Round 3 native DOM: a search failure cannot claim a previous query as a retained result',{timeout:15000},async()=>{
 const h=await uiHarness();try{const p=await h.page();await p.evaluate(()=>workspace.refresh());await p.waitForTimeout(150);
 await p.evaluate(()=>{document.getElementById('thought-search').value='different synthetic query';behavior.SEARCH_LIBRARY='fail';return workspace.refresh();});
 assert.match(await p.locator('#error').innerText(),/尚未获得/);assert.doesNotMatch(await p.locator('#error').innerText(),/上次成功读取/);
 }finally{await h.close();}
});
