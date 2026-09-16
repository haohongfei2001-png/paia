import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const execFileAsync=promisify(execFile);
const op=()=>crypto.randomUUID();
const rpc=async(page,type,fields={})=>{const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(response.ok,true,JSON.stringify(response));return response.data;};
const nav=(page,view)=>page.locator(`[data-view="${view}"]`).first().click();
const requestOf=body=>JSON.parse(body.messages[1].content);
const aiOutput=(request,label)=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({topicId:request.topicCandidates[0].id,blockSummary:`${label}_BLOCK_SUMMARY`,currentView:`${label}_CURRENT_VIEW`,keyInformation:[],preferences:[],decisions:[],judgments:[],openQuestions:[],possibleEvolution:[{text:`${label}_EVOLUTION_LINE`,evidenceEntryIds:request.inputs.map(row=>row.ref)}],evidenceEntryIds:request.inputs.map(row=>row.ref)})}}]});

async function ready(h){
 const page=h.archive,action=page.locator('#enable-consent');
 await action.waitFor({state:'visible'});await eventually(async()=>!(await action.isDisabled()),'UIR-03 preview-mask consent action is available');await action.click();
 await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'UIR-03 preview-mask consent is durable');
 if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();
 await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light',hideContentPreviews:false}});
 await rpc(page,'PAIA_MEMORY_SETTINGS',{options:{externalAccess:true,localOnly:false}});
 await rpc(page,'SAVE_DEEPSEEK_CREDENTIAL',{config:{apiKey:'synthetic-uir03-preview-mask-key'}});
 return page;
}

async function seed(page,label){
 const topic=await rpc(page,'CREATE_LIBRARY_TOPIC',{topic:{name:`${label} Preview Mask 主题`,operationId:op()}});
 await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topic.id,body:`${label}_ORIGINAL_A 主动打开的 Original 正文必须保持可读。`}});
 await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topic.id,body:`${label}_ORIGINAL_B 这段正文也会成为 Organized evidence。`}});
 const saved=await rpc(page,'GET_LIBRARY_TOPIC',{id:topic.id});
 await rpc(page,'EDIT_LIBRARY_TOPIC',{edit:{id:topic.id,expectedRevision:saved.revision,changes:{summary:`${label}_TOPIC_SUMMARY 私人主题摘要`},operationId:op()}});
 return topic;
}

async function openTopic(page,topic){
 await nav(page,'thoughts');await page.locator('#thought-panel').waitFor({state:'visible'});await page.locator(`[data-topic-id="${topic.id}"]`).click();await page.locator('#topic-heading h1').filter({hasText:topic.name}).waitFor();
}

async function confirmGeneration(page){
 await page.getByRole('button',{name:'生成 AI整理',exact:true}).click();const dialog=page.locator('#library-dialog[open]');await dialog.waitFor();await dialog.locator('select[name="approval"]').selectOption('confirm');await dialog.locator('button[type="submit"]').click();
}

async function shot(page,name){await mkdir('work/ux-r3',{recursive:true});await page.screenshot({path:`work/ux-r3/${name}.png`,fullPage:true});}

async function previewScopeProbe(page){
 return page.evaluate(()=>{
  const root=document.createElement('div');root.id='uir03-preview-mask-probe';
  const add=document.createElement('div');add.className='topic-action-content';const addPreview=document.createElement('pre');addPreview.className='topic-selection-preview';addPreview.textContent='UIR03_ADD_PREVIEW_PRIVATE_TEXT';const choices=document.createElement('div');choices.className='topic-choice-list';add.append(addPreview,choices);
  const quote=document.createElement('div');quote.className='topic-action-content';const details=document.createElement('details');details.open=true;const quotePreview=document.createElement('pre');quotePreview.className='topic-selection-preview';quotePreview.textContent='UIR03_QUOTE_PREVIEW_PRIVATE_TEXT';details.append(quotePreview);quote.append(details);
  const compare=document.createElement('div');compare.className='topic-action-content';const comparePreview=document.createElement('pre');comparePreview.className='topic-selection-preview';comparePreview.textContent='UIR03_EXPLICIT_COMPARE_FULL_BODY';compare.append(comparePreview);
  root.append(add,quote,compare);document.body.append(root);
  const result={add:getComputedStyle(addPreview).display,quote:getComputedStyle(quotePreview).display,compare:getComputedStyle(comparePreview).display,leaks:[addPreview,quotePreview,comparePreview].flatMap(node=>[node.getAttribute('title'),node.getAttribute('aria-label')]).filter(Boolean)};
  root.remove();return result;
 });
}

async function journey(page,h,topic,label,{release=false}={}){
 await page.setViewportSize({width:1440,height:900});await nav(page,'thoughts');await page.locator(`[data-topic-id="${topic.id}"]`).waitFor();
 const card=page.locator(`[data-topic-id="${topic.id}"]`),summary=card.locator('.summary');await summary.waitFor();assert.match(await summary.textContent(),new RegExp(`${label}_TOPIC_SUMMARY`));assert.equal(await summary.isVisible(),true,'Topic summary is visible while preview masking is off');
 const attrs=await card.evaluate(el=>({title:el.getAttribute('title'),aria:el.getAttribute('aria-label'),summaryTitle:el.querySelector('.summary')?.getAttribute('title'),summaryAria:el.querySelector('.summary')?.getAttribute('aria-label')}));assert.equal(Object.values(attrs).some(value=>value?.includes(`${label}_TOPIC_SUMMARY`)),false,'masked Topic summary is not duplicated into title or aria-label attributes');
 await rpc(page,'UPDATE_PREFERENCES',{changes:{hideContentPreviews:true}});await eventually(async()=>page.evaluate(()=>document.documentElement.classList.contains('paia-hide-content-previews')),'preview mask class applies');assert.equal(await summary.isVisible(),false,'Topic summary/sourceHint slot is masked on the home card');
 const probe=await previewScopeProbe(page);assert.equal(probe.add,'none','add-to-Topic selection preview is masked');assert.equal(probe.quote,'none','quoted related-text preview is masked');assert.notEqual(probe.compare,'none','explicitly opened compare/full-body content keeps the existing readable boundary');assert.deepEqual(probe.leaks,[],'preview probe does not move private body text into title or aria-label');
 await shot(page,release?'uir-03-current-release-preview-mask-home-1440x900-light':'uir-03-preview-mask-home-1440x900-light');

 await openTopic(page,topic);const original=page.locator('#original-reading-body [data-entry-field="body"]').first();await original.waitFor();assert.equal(await original.isVisible(),true,'explicitly opened Original body remains readable while preview masking is on');assert.match(await original.textContent(),new RegExp(`${label}_ORIGINAL_A`));
 const toggle=page.locator('#ai-presentation-toggle');await eventually(()=>toggle.isEnabled(),'AI presentation switch is available');await toggle.check();await page.locator('[data-ai-first-generation]').waitFor();assert.equal(h.deepSeekRequests.length,0,'masking and cached view switching do not call the Provider');await confirmGeneration(page);await page.locator('[data-ai-field="blockSummary"]').filter({hasText:`${label}_BLOCK_SUMMARY`}).waitFor();
 const organized=page.locator('[data-ai-field="currentView"]'),evidence=page.locator('.evolution-excerpt .entry-prose').first();await organized.waitFor();await evidence.waitFor();assert.equal(await organized.isVisible(),true,'explicitly opened Organized body remains readable while preview masking is on');assert.equal(await evidence.isVisible(),true,'explicitly opened evidence body remains readable while preview masking is on');assert.match(await evidence.textContent(),new RegExp(`${label}_ORIGINAL_`));
 const privateTextInAttrs=await page.evaluate(prefix=>[...document.querySelectorAll('#topic-body [title],#topic-body [aria-label]')].some(node=>[node.getAttribute('title'),node.getAttribute('aria-label')].some(value=>value?.includes(prefix))),label);assert.equal(privateTextInAttrs,false,'opened body text is not copied into title or aria-label as a masking bypass');
 await shot(page,release?'uir-03-current-release-preview-mask-organized-1440x900-light':'uir-03-preview-mask-organized-1440x900-light');
 assert.equal(h.deepSeekRequests.length,1,'only the explicitly confirmed AI generation calls the Provider');assert.equal(h.extensionNetworkRequests,1,'only the explicit DeepSeek fixture request leaves the extension');assert.equal(h.externalRequests,0,'no unexpected external request occurs');assert.deepEqual(h.errors,[]);
}

test('UIR-03 preview mask hides card/selection previews without hiding explicitly opened Original, Organized or evidence bodies in source and built release Chrome',{timeout:300000},async()=>{
 let source;try{source=await FakeChatGPT.start({onboarding:true,deepSeekFixture:async body=>aiOutput(requestOf(body),'UIR03_MASK')});const page=await ready(source),topic=await seed(page,'UIR03_MASK');await journey(page,source,topic,'UIR03_MASK');}finally{await source?.close();}
 await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});
 let release;try{release=await FakeChatGPT.start({extensionPath:'work/current-release',onboarding:true,deepSeekFixture:async body=>aiOutput(requestOf(body),'UIR03_MASK_RELEASE')});const page=await ready(release),topic=await seed(page,'UIR03_MASK_RELEASE');await journey(page,release,topic,'UIR03_MASK_RELEASE',{release:true});}finally{await release?.close();}
});
