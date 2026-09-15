import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const op=()=>crypto.randomUUID();
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const nav=(p,view)=>p.locator(`[data-view="${view}"]`).first().click();
const requestOf=body=>JSON.parse(body.messages[1].content);
const aiOutput=(request,n)=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({topicId:request.topicCandidates[0].id,blockSummary:`R5 AI 摘要 ${n}`,currentView:`R5 AI 当前理解 ${n}`,keyInformation:[],preferences:[],decisions:[],judgments:[],openQuestions:[],possibleEvolution:[],evidenceEntryIds:request.inputs.map(row=>row.ref)})}}]});
async function ready(h){const p=h.archive;await p.locator('#enable-consent').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented);if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN'}});await rpc(p,'PAIA_MEMORY_SETTINGS',{options:{externalAccess:true,localOnly:false}});await rpc(p,'SAVE_DEEPSEEK_CREDENTIAL',{config:{apiKey:'synthetic-r5-on02-key'}});return p;}
async function createTopic(p){const topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'R5 候选原子保存',operationId:op()}});await rpc(p,'CONTINUE_THINKING',{thought:{operationId:op(),body:'R5 原始材料：先保留当前稿。',topicId:topic.id}});return topic;}
async function openTopic(p,topic){await nav(p,'thoughts');await p.locator('#thought-panel').waitFor({state:'visible'});if(await p.locator('#thought-document').isVisible()){await p.locator('#back').click();await p.locator('#thought-list').waitFor({state:'visible'});}await p.locator(`[data-topic-id="${topic.id}"]`).click();await p.locator('#topic-heading h1').filter({hasText:topic.name}).waitFor();}
async function confirmFirst(p){await p.getByRole('button',{name:'生成 AI整理',exact:true}).click();const dialog=p.locator('#library-dialog[open]');await dialog.waitFor();await dialog.locator('select[name="approval"]').selectOption('confirm');await dialog.locator('button[type="submit"]').click();}
async function status(p,topicId){const state=await rpc(p,'GET_AI_PRESENTATION_STATUS');return state.topics.find(row=>row.topicId===topicId);}

test('UX-R5 ON-02 stages candidate decisions and saves adopt/keep once without overwriting the current draft',{timeout:150000},async()=>{
 let calls=0;const h=await FakeChatGPT.start({onboarding:true,deepSeekFixture:async body=>{calls++;const request=requestOf(body);return aiOutput(request,calls);}});
 try{
  const p=await ready(h),topic=await createTopic(p);await openTopic(p,topic);const toggle=p.locator('#ai-presentation-toggle');await toggle.check();await p.locator('[data-ai-first-generation]').waitFor();await confirmFirst(p);await p.locator('[data-ai-field="blockSummary"]').filter({hasText:'R5 AI 摘要 1'}).waitFor();assert.equal(h.deepSeekRequests.length,1);
  const current=p.locator('[data-ai-field="currentView"]');await current.fill('R5 人工维护的当前理解');await current.press('Tab');await eventually(async()=>(await status(p,topic.id))?.presentation?.currentView==='R5 人工维护的当前理解','human AI draft saved');
  await rpc(p,'CONTINUE_THINKING',{thought:{operationId:op(),body:'R5 新增材料：更新只能形成候选，不能直接覆盖。',topicId:topic.id}});await p.locator('#back').click();await p.locator(`[data-topic-id="${topic.id}"]`).click();await p.locator('#ai-library-update').waitFor({state:'visible'});await p.locator('#ai-library-update').click();await p.locator('[data-ai-candidate]').waitFor();assert.equal(h.deepSeekRequests.length,2);
  let row=await status(p,topic.id);assert.equal(row.presentation.blockSummary,'R5 AI 摘要 1');assert.equal(row.presentation.currentView,'R5 人工维护的当前理解');assert.equal(row.candidate.proposal.blockSummary,'R5 AI 摘要 2');assert.equal(row.candidate.proposal.currentView,'R5 AI 当前理解 2');
  const summary=p.locator('[data-ai-candidate-field="blockSummary"]'),view=p.locator('[data-ai-candidate-field="currentView"]'),save=p.getByRole('button',{name:'保存这些选择',exact:true});assert.equal(await save.isDisabled(),true);await summary.getByRole('button',{name:'采用这段',exact:true}).click();await view.getByRole('button',{name:'保留当前',exact:true}).click();assert.equal(await save.isEnabled(),true);
  row=await status(p,topic.id);assert.equal(row.presentation.blockSummary,'R5 AI 摘要 1','staged adopt must not write before Save');assert.equal(row.presentation.currentView,'R5 人工维护的当前理解');assert.ok(row.candidate);
  const beforeRevision=row.presentation.revision;await save.click();await eventually(async()=>!(await status(p,topic.id))?.candidate,'atomic candidate save');row=await status(p,topic.id);assert.equal(row.presentation.revision,beforeRevision+1);assert.equal(row.presentation.blockSummary,'R5 AI 摘要 2');assert.equal(row.presentation.currentView,'R5 人工维护的当前理解');assert.equal(row.presentation.protections.blockSummary,true);assert.equal(row.presentation.protections.currentView,true);assert.equal(h.deepSeekRequests.length,2,'candidate save is local and must not call provider');assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
