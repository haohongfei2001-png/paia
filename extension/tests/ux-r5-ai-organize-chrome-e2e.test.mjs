import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const dir='work/ux-r5';
const op=()=>crypto.randomUUID();
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const nav=(p,view)=>p.locator(`[data-view="${view}"]`).first().click();
const requestOf=body=>JSON.parse(body.messages[1].content);
const aiOutput=(request,n)=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({topicId:request.topicCandidates[0].id,blockSummary:`R5 AI 摘要 ${n}`,currentView:`R5 AI 当前理解 ${n}`,keyInformation:[],preferences:[],decisions:[],judgments:[],openQuestions:[],possibleEvolution:[],evidenceEntryIds:request.inputs.map(row=>row.ref)})}}]});

async function ready(h){const p=h.archive;await p.locator('#enable-consent').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented);if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN'}});await rpc(p,'PAIA_MEMORY_SETTINGS',{options:{externalAccess:true,localOnly:false}});await rpc(p,'SAVE_DEEPSEEK_CREDENTIAL',{config:{apiKey:'synthetic-r5-browser-key'}});return p;}
async function createTopic(p,name='R5 双视图主题'){const topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name,operationId:op()}});await rpc(p,'CONTINUE_THINKING',{thought:{operationId:op(),body:'R5 原始表达：这一段必须始终可以直接阅读。',topicId:topic.id}});return topic;}
async function openTopic(p,topic){await nav(p,'thoughts');await p.locator(`[data-topic-id="${topic.id}"]`).click();await p.locator('#topic-heading h1').filter({hasText:topic.name}).waitFor();}
async function aiStatus(p,topicId){const state=await rpc(p,'GET_AI_PRESENTATION_STATUS');return {state,topic:state.topics.find(row=>row.topicId===topicId)};}


test('UX-R5 Original -> explicit first AI generation -> cached topic view -> protected candidate adopt/keep',{timeout:150000},async()=>{
 let releaseFirst;const firstGate=new Promise(resolve=>{releaseFirst=resolve;});let call=0;
 const h=await FakeChatGPT.start({onboarding:true,deepSeekFixture:async body=>{const request=requestOf(body);assert.equal(request.taskProfile,'ai_synthesis');call++;if(call===1)await firstGate;return aiOutput(request,call);}});
 try{
  const p=await ready(h),topic=await createTopic(p);await mkdir(dir,{recursive:true});await openTopic(p,topic);
  await p.getByText('R5 原始表达：这一段必须始终可以直接阅读。',{exact:true}).waitFor();assert.equal(h.deepSeekRequests.length,0);
  const toggle=p.locator('#ai-presentation-toggle');await toggle.check();await p.locator('[data-ai-first-generation]').waitFor();assert.equal(h.deepSeekRequests.length,0,'switching to Organized must not call DeepSeek');
  await p.screenshot({path:`${dir}/first-generation.png`,fullPage:true});
  await p.getByRole('button',{name:'生成 AI整理',exact:true}).click();await eventually(()=>Promise.resolve(h.deepSeekRequests.length===1),'first paid request');assert.equal(requestOf(h.deepSeekRequests[0]).inputs.length,1);assert.equal(await p.getByText('R5 原始表达：这一段必须始终可以直接阅读。',{exact:true}).isVisible(),true,'Original must stay readable while first generation is pending');
  releaseFirst();await p.locator('[data-ai-field="blockSummary"]').filter({hasText:'R5 AI 摘要 1'}).waitFor();assert.equal(h.deepSeekRequests.length,1);await p.screenshot({path:`${dir}/organized-cached.png`,fullPage:true});

  await toggle.uncheck();await p.getByText('R5 原始表达：这一段必须始终可以直接阅读。',{exact:true}).waitFor();assert.equal(h.deepSeekRequests.length,1);
  await toggle.check();await p.locator('[data-ai-field="blockSummary"]').filter({hasText:'R5 AI 摘要 1'}).waitFor();assert.equal(h.deepSeekRequests.length,1,'cached view switch must not call DeepSeek');
  await p.locator('#back').click();await p.locator(`[data-topic-id="${topic.id}"]`).click();await p.locator('[data-ai-field="blockSummary"]').filter({hasText:'R5 AI 摘要 1'}).waitFor();assert.equal(await toggle.isChecked(),true,'same-tab Topic view should stay Organized');assert.equal(h.deepSeekRequests.length,1);

  const current=p.locator('[data-ai-field="currentView"]');await current.fill('R5 人工维护的当前理解');await current.press('Tab');await eventually(async()=>{const {topic:row}=await aiStatus(p,topic.id);return row?.presentation?.currentView==='R5 人工维护的当前理解';},'human AI edit saved');
  await rpc(p,'CONTINUE_THINKING',{thought:{operationId:op(),body:'R5 新增材料：模型可以建议更新，但不能覆盖人工稿。',topicId:topic.id}});
  await p.locator('#back').click();await p.locator(`[data-topic-id="${topic.id}"]`).click();await p.locator('#ai-library-update').waitFor({state:'visible'});assert.equal(await toggle.isChecked(),true);await p.locator('#ai-library-update').click();
  await p.locator('[data-ai-candidate]').waitFor();assert.equal(h.deepSeekRequests.length,2);assert.equal(await p.locator('[data-ai-field="currentView"]').textContent(),'R5 人工维护的当前理解');assert.match(await p.locator('[data-ai-candidate-field="currentView"]').textContent(),/R5 AI 当前理解 2/);await p.screenshot({path:`${dir}/candidate-compare.png`,fullPage:true});
  await p.locator('[data-ai-candidate-field="blockSummary"]').getByRole('button',{name:'采用这段',exact:true}).click();await eventually(async()=>{const {topic:row}=await aiStatus(p,topic.id);return row?.presentation?.blockSummary==='R5 AI 摘要 2';},'candidate block adopted');
  await p.locator('[data-ai-candidate-field="currentView"]').getByRole('button',{name:'保留当前',exact:true}).click();await eventually(async()=>{const {topic:row}=await aiStatus(p,topic.id);return !row?.candidate;},'candidate fully resolved');
  const {topic:final}=await aiStatus(p,topic.id);assert.equal(final.presentation.blockSummary,'R5 AI 摘要 2');assert.equal(final.presentation.currentView,'R5 人工维护的当前理解');assert.equal(h.deepSeekRequests.length,2);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});


test('UX-R5 leaving a Topic during one paid request never starts a second request and the request reaches a terminal state',{timeout:90000},async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});let call=0;
 const h=await FakeChatGPT.start({onboarding:true,deepSeekFixture:async body=>{const request=requestOf(body);call++;await gate;return aiOutput(request,call);}});
 try{
  const p=await ready(h),topic=await createTopic(p,'R5 进行中离开');await openTopic(p,topic);await p.locator('#ai-presentation-toggle').check();await p.getByRole('button',{name:'生成 AI整理',exact:true}).click();await eventually(()=>Promise.resolve(h.deepSeekRequests.length===1),'in-flight request');
  await p.locator('#back').click();assert.equal(h.deepSeekRequests.length,1);release();
  await eventually(async()=>{const {topic:row,state}=await aiStatus(p,topic.id);return !!row?.presentation||['failed','committed','outcome_unknown'].includes(state.runtime?.state);},'terminal AI state',30000);await pause(300);assert.equal(h.deepSeekRequests.length,1,'navigation must never duplicate the paid request');
  const {topic:row}=await aiStatus(p,topic.id);assert.ok(row?.presentation,'the worker may finish after navigation and the cached result remains readable');assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});


test('UX-R5 worker interruption becomes outcome_unknown with zero automatic retry; Source purge removes derived AI output',{timeout:120000},async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});let call=0;
 const h=await FakeChatGPT.start({onboarding:true,deepSeekFixture:async body=>{const request=requestOf(body);call++;if(call===1)await gate;return aiOutput(request,call);}});
 try{
  const p=await ready(h),topic=await createTopic(p,'R5 outcome unknown');await openTopic(p,topic);await p.locator('#ai-presentation-toggle').check();const requestPromise=p.getByRole('button',{name:'生成 AI整理',exact:true}).click().catch(()=>{});await eventually(()=>Promise.resolve(h.deepSeekRequests.length===1),'request crossed network boundary');
  await h.restartWorker();release();await requestPromise;await eventually(async()=>{const state=await rpc(p,'GET_AI_PRESENTATION_STATUS');return state.runtime?.state==='outcome_unknown';},'outcome unknown after restart');
  const before=h.deepSeekRequests.length;await rpc(p,'GET_AI_PRESENTATION_STATUS');await rpc(p,'GET_AI_PRESENTATION_STATUS');await pause(300);assert.equal(h.deepSeekRequests.length,before,'status checks must not retry outcome_unknown');

  const sourceText='R5_SOURCE_PURGE 这条来源删除后，AI整理不能继续冒充有证据。';const chat=await h.open({id:'uxr5-source',title:'R5 source',base:1609459200,messages:[{id:'uxr5-source-msg',text:sourceText}]});await eventually(async()=>(await h.state()).records.length===1);await p.bringToFront();await nav(p,'archive');await p.locator('.conversation-document').first().click();const archiveField=p.locator('.library-prose').filter({hasText:'R5_SOURCE_PURGE'}).first();await archiveField.waitFor();const inputId=await archiveField.getAttribute('data-edit-id'),input=await rpc(p,'GET_INPUT',{id:inputId}),sourceTopic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'R5 Source purge Topic',operationId:op()}});await rpc(p,'ADD_TO_TOPICS',{selection:{kind:'input',id:inputId,expectedRevision:input.revision,topicIds:[sourceTopic.id],operationId:op()}});
  // Use a fresh successful request after the unknown request. No status read above is allowed to trigger it.
  await openTopic(p,sourceTopic);await p.locator('#ai-presentation-toggle').check();await p.getByRole('button',{name:'生成 AI整理',exact:true}).click();await eventually(async()=>{const {topic:row}=await aiStatus(p,sourceTopic.id);return !!row?.presentation;},'source-bound AI presentation');assert.equal(h.deepSeekRequests.length,before+1);
  const source=(await rpc(p,'GET_INPUT',{id:inputId})).originalTextReference;await rpc(p,'PURGE_SOURCE',{id:source,confirm:true});await eventually(async()=>{const {topic:row}=await aiStatus(p,sourceTopic.id);return !row?.presentation&&!row?.candidate;},'purge clears derived AI presentation');await pause(300);assert.equal(h.deepSeekRequests.length,before+1,'purge must not regenerate AI');assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);await chat.close();
 }finally{await h.close();}
});
