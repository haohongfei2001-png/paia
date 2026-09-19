import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const dir='work/ux-r5';
const op=()=>crypto.randomUUID();
const originalText='R5 原始表达：这一段必须始终可以直接阅读。';
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const nav=(p,view)=>p.locator(`[data-view="${view}"]`).first().click();
const requestOf=body=>JSON.parse(body.messages[1].content);
const aiOutput=(request,n)=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({topicId:request.topicCandidates[0].id,blockSummary:`R5 AI 摘要 ${n}`,currentView:`R5 AI 当前理解 ${n}`,keyInformation:[],preferences:[],decisions:[],judgments:[],openQuestions:[],possibleEvolution:[],evidenceEntryIds:request.inputs.map(row=>row.ref)})}}]});

async function ready(h){const p=h.archive;await p.locator('#enable-consent').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented);if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN'}});await rpc(p,'PAIA_MEMORY_SETTINGS',{options:{externalAccess:true,localOnly:false}});await rpc(p,'SAVE_DEEPSEEK_CREDENTIAL',{config:{apiKey:'synthetic-r5-browser-key'}});return p;}
async function createTopic(p,name='R5 双视图主题',text=originalText){const topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name,operationId:op()}});await rpc(p,'CONTINUE_THINKING',{thought:{operationId:op(),body:text,topicId:topic.id}});return topic;}
async function openTopic(p,topic){await nav(p,'thoughts');await p.locator('#thought-panel').waitFor({state:'visible'});if(await p.locator('#thought-document').isVisible()){await p.locator('#back').click();await p.locator('#thought-list').waitFor({state:'visible'});}await p.locator(`[data-topic-id="${topic.id}"]`).click();await p.locator('#topic-heading h1').filter({hasText:topic.name}).waitFor();}
async function confirmGeneration(p){await p.getByRole('button',{name:'生成 AI整理',exact:true}).click();const dialog=p.locator('#library-dialog[open]');await dialog.waitFor();await dialog.locator('select[name="approval"]').selectOption('confirm');await dialog.locator('button[type="submit"]').click();}
async function aiStatus(p,topicId){const state=await rpc(p,'GET_AI_PRESENTATION_STATUS');return {state,topic:state.topics.find(row=>row.topicId===topicId)};}

test('UX-R5 ON-01 keeps Original readable, scopes generation to one Topic and reuses cache without provider calls',{timeout:150000},async()=>{
 let releaseFirst;const firstGate=new Promise(resolve=>{releaseFirst=resolve;});let call=0;
 const h=await FakeChatGPT.start({onboarding:true,deepSeekFixture:async body=>{const request=requestOf(body);call++;if(call===1)await firstGate;return aiOutput(request,call);}});
 try{
  const p=await ready(h),topic=await createTopic(p),other=await createTopic(p,'R5 另一个主题','另一个主题必须默认原话。');await mkdir(dir,{recursive:true});await openTopic(p,topic);
  const original=p.getByLabel('内容正文').filter({hasText:originalText}).first();await original.waitFor();const controlsBefore=await rpc(p,'GET_ORGANIZER_CONTROLS');assert.equal(h.deepSeekRequests.length,0);
  const toggle=p.locator('#ai-presentation-toggle');await eventually(()=>toggle.isEnabled(),'Topic AI switch enabled');await toggle.check();await p.locator('[data-ai-first-generation]').waitFor();assert.equal(await p.evaluate(()=>document.documentElement.classList.contains('paia-recomposing')),false,'first-generation staging must remain readable and must not run a structure transition before generated structure exists');assert.equal(h.deepSeekRequests.length,0,'view switch must not call provider');assert.equal(await original.isVisible(),true);await p.screenshot({path:`${dir}/on01-first-generation.png`,fullPage:true});
  await p.getByRole('button',{name:'生成 AI整理',exact:true}).click();await p.locator('#library-dialog[open]').waitFor();assert.equal(h.deepSeekRequests.length,0,'confirmation must precede provider request');assert.match(await p.locator('#library-dialog').textContent(),/DeepSeek/);await p.locator('#library-dialog select[name="approval"]').selectOption('confirm');await p.locator('#library-dialog button[type="submit"]').click();await eventually(()=>Promise.resolve(h.deepSeekRequests.length===1),'first request');assert.equal(requestOf(h.deepSeekRequests[0]).inputs.length,1);assert.equal(await original.isVisible(),true,'Original remains readable while processing');
  releaseFirst();await p.locator('[data-ai-field="blockSummary"]').filter({hasText:'R5 AI 摘要 1'}).waitFor();assert.equal(h.deepSeekRequests.length,1);await p.screenshot({path:`${dir}/on01-organized-cached.png`,fullPage:true});
  const controlsAfter=await rpc(p,'GET_ORGANIZER_CONTROLS');assert.equal(controlsAfter.libraryView,controlsBefore.libraryView,'Topic view must not rewrite the legacy global preference');
  await p.emulateMedia({reducedMotion:'reduce'});await p.bringToFront();await toggle.focus();await toggle.uncheck();await original.waitFor();await eventually(async()=>await p.evaluate(()=>document.activeElement?.id)==='ai-presentation-toggle','Original switch restores toggle focus');assert.equal(await p.evaluate(()=>document.activeElement?.id),'ai-presentation-toggle');assert.equal(await p.evaluate(()=>document.documentElement.classList.contains('paia-recomposing')),false);assert.equal(h.deepSeekRequests.length,1);await toggle.check();await p.locator('[data-ai-field="blockSummary"]').filter({hasText:'R5 AI 摘要 1'}).waitFor();await eventually(async()=>await p.evaluate(()=>document.activeElement?.id)==='ai-presentation-toggle','cached Organized switch restores toggle focus');assert.equal(await p.evaluate(()=>document.activeElement?.id),'ai-presentation-toggle');assert.equal(h.deepSeekRequests.length,1,'cached switch is local only');
  await p.locator('#back').click();await p.locator(`[data-topic-id="${other.id}"]`).click();await p.getByLabel('内容正文').filter({hasText:'另一个主题必须默认原话。'}).waitFor();assert.equal(await toggle.isChecked(),false,'another Topic defaults Original');assert.equal(h.deepSeekRequests.length,1);
  await p.locator('#back').click();await p.locator(`[data-topic-id="${topic.id}"]`).click();await p.locator('[data-ai-field="blockSummary"]').filter({hasText:'R5 AI 摘要 1'}).waitFor();assert.equal(await toggle.isChecked(),true,'same-tab Topic remembers its view');assert.equal(h.deepSeekRequests.length,1);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{releaseFirst?.();await h.close();}
});

test('UX-R5 ON-01 leaving during first generation never duplicates the request or navigates back',{timeout:90000},async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});let call=0;const h=await FakeChatGPT.start({onboarding:true,deepSeekFixture:async body=>{const request=requestOf(body);call++;await gate;return aiOutput(request,call);}});
 try{
  const p=await ready(h),topic=await createTopic(p,'R5 进行中离开');await openTopic(p,topic);await p.locator('#ai-presentation-toggle').check();await p.locator('[data-ai-first-generation]').waitFor();await confirmGeneration(p);await eventually(()=>Promise.resolve(h.deepSeekRequests.length===1),'in-flight request');await p.locator('#back').click();await p.locator('#thought-list').waitFor({state:'visible'});release();
  await eventually(async()=>{const {topic:row,state}=await aiStatus(p,topic.id);return !!row?.presentation||['failed','committed','outcome_unknown'].includes(state.runtime?.state);},'terminal state',30000);await pause(200);assert.equal(h.deepSeekRequests.length,1);assert.equal(await p.locator('#thought-list').isVisible(),true,'late completion must not reopen Topic');assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{release?.();await h.close();}
});

test('UX-R5 ON-01 Local-only blocks first generation before any provider request',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true,deepSeekFixture:async body=>aiOutput(requestOf(body),1)});
 try{
  const p=await ready(h),topic=await createTopic(p,'R5 Local-only');await rpc(p,'PAIA_MEMORY_SETTINGS',{options:{externalAccess:false,localOnly:true}});await openTopic(p,topic);await p.locator('#ai-presentation-toggle').check();await p.locator('[data-ai-first-generation]').waitFor();await confirmGeneration(p);await pause(500);assert.equal(h.deepSeekRequests.length,0);const {topic:row}=await aiStatus(p,topic.id);assert.equal(!!row?.presentation,false);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('UX-R5 ON-01 Source purge invalidates source-bound organized output without regeneration',{timeout:90000},async()=>{
 let call=0;const h=await FakeChatGPT.start({onboarding:true,deepSeekFixture:async body=>{const request=requestOf(body);call++;return aiOutput(request,call);}});
 try{
  const p=await ready(h),sourceText='R5_SOURCE_PURGE 删除来源后派生整理必须失效。';const chat=await h.open({id:'uxr5-on01-source',title:'R5 source',base:1609459200,messages:[{id:'uxr5-on01-source-msg',text:sourceText}]});await eventually(async()=>(await h.state()).records.length===1);await p.bringToFront();await nav(p,'library');await p.locator('.conversation-document').first().click();const field=p.locator('.library-prose').filter({hasText:'R5_SOURCE_PURGE'}).first();await field.waitFor();const inputId=await field.getAttribute('data-edit-id'),input=await rpc(p,'GET_INPUT',{id:inputId}),topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'R5 Source purge Topic',operationId:op()}});await rpc(p,'ADD_TO_TOPICS',{selection:{kind:'input',id:inputId,expectedRevision:input.revision,topicIds:[topic.id],operationId:op()}});
  await openTopic(p,topic);await p.locator('#ai-presentation-toggle').check();await p.locator('[data-ai-first-generation]').waitFor();await confirmGeneration(p);await eventually(async()=>!!(await aiStatus(p,topic.id)).topic?.presentation,'source-bound presentation');assert.equal(h.deepSeekRequests.length,1);const source=(await rpc(p,'GET_INPUT',{id:inputId})).originalTextReference;await rpc(p,'PURGE_SOURCE',{id:source,confirm:true});await eventually(async()=>!(await aiStatus(p,topic.id)).topic?.presentation,'purge invalidates presentation');await pause(200);assert.equal(h.deepSeekRequests.length,1,'purge does not regenerate');assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);await chat.close();
 }finally{await h.close();}
});