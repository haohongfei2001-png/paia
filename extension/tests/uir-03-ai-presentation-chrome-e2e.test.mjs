import {thoughtHistoryAction} from './harness/current-thought-navigation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,rpc,authority,savedRow,editSaved,refusedAI,setAIView,openTopic,noApproval,quiet,screenshotMatrix} from './harness/consumer-ai-browser.mjs';
import {eventually} from './harness/fake-chatgpt.mjs';

test('UIR-03 saved Organized presentation remains readable and editable while retired Provider commands refuse in source and release',{timeout:300000},async()=>{
 for(const variant of ['source','release']){const f=await fixture(variant);try{const {p,h,topic}=f,before=await authority(p);await setAIView(p,true);await p.locator('[data-ai-field="currentView"]').waitFor();await noApproval(p);await refusedAI(p,topic.id);await screenshotMatrix(p,'saved-ai',variant);const savedBefore=await savedRow(p,topic.id),savedEdit=await editSaved(f);await thoughtHistoryAction(p,'library-undo');await eventually(async()=>(await savedRow(p,topic.id)).blockSummary===savedBefore.blockSummary,'visible undo targets saved AI');await thoughtHistoryAction(p,'library-redo');await eventually(async()=>(await savedRow(p,topic.id)).blockSummary===savedEdit.blockSummary,'visible redo restores the AI edit');const after=await authority(p);assert.deepEqual(after.records,before.records);assert.deepEqual(after.thoughts,before.thoughts);const history=await rpc(p,'GET_AI_PRESENTATION_REVISIONS',{options:{topicId:topic.id}});assert.ok(history.items.length>0);await quiet(h);}finally{await f.h.close();}}
});
test('VS-05 long Topic remains interactive across refused AI, navigation and reduced motion in source and release',{timeout:300000},async()=>{
 for(const variant of ['source','release']){const f=await fixture(variant,{count:64});try{const {p,h,topic}=f;await setAIView(p,true);await refusedAI(p,topic.id);await p.emulateMedia({reducedMotion:'reduce'});await setAIView(p,false);await p.locator('#topic-search').fill('原始思想 0');await eventually(async()=>/1\+? 条匹配/.test(await p.locator('#topic-search-count').textContent()));assert.ok(await p.locator('#original-reading-body [data-entry-id]').count()<=60);await p.locator('#topic-search').fill('');await openTopic(p,topic);await setAIView(p,true);await p.locator('[data-ai-field="currentView"]').waitFor();const row=await savedRow(p,topic.id);await setAIView(p,false);await setAIView(p,true);assert.deepEqual(await savedRow(p,topic.id),row,'view transitions do not create phantom revisions');await quiet(h);}finally{await f.h.close();}}
});
for(const variant of ['source','release'])test(`D7 retired worker launch cannot create pending work or replace saved AI (${variant})`,{timeout:180000},async()=>{
 const f=await fixture(variant);try{await setAIView(f.p,true);await refusedAI(f.p,f.topic.id);await f.h.restartWorker();await refusedAI(f.p,f.topic.id);await f.p.locator('[data-ai-field="blockSummary"]').waitFor();await noApproval(f.p);await quiet(f.h);}finally{await f.h.close();}
});
