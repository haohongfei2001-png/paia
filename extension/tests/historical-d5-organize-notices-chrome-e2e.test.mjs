// Historical D5 reference contract, preserved verbatim from the pre-D7 registration.
// This is retained evidence, not current primary-route acceptance.
import {confirmOrganizeScope,adoptFirstCandidate} from './harness/ai-reviewed-browser.mjs';
import {inspectOrganizeNotices} from './harness/d5-organize-notices.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const execFileAsync=promisify(execFile);
const op=()=>crypto.randomUUID();
const rpc=async(page,type,fields={})=>{const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(response.ok,true,JSON.stringify(response));return response.data;};
const nav=(page,view)=>page.locator(`[data-view="${view}"]`).first().click();
const requestOf=body=>JSON.parse(body.messages[1].content);
const aiOutput=(request,label)=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({topicId:request.topicCandidates[0].id,blockSummary:`${label} 主题速览`,currentView:`${label} 当前理解`,keyInformation:[{text:`${label} 已有信息`,evidenceEntryIds:[request.inputs[0].ref]}],preferences:[],decisions:[],judgments:[],openQuestions:[],possibleEvolution:[{text:`${label} 线索：从这些原话中可见一个连续关注点。`,evidenceEntryIds:request.inputs.map(row=>row.ref)}],evidenceEntryIds:request.inputs.map(row=>row.ref)})}}]});

async function readyAI(h){
 const page=h.archive,action=page.locator('#enable-consent');await action.waitFor({state:'visible'});await eventually(async()=>!(await action.isDisabled()),'UIR-03 consent action is available');await action.click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'UIR-03 consent is durable');if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});await rpc(page,'PAIA_MEMORY_SETTINGS',{options:{externalAccess:true,localOnly:false}});await rpc(page,'SAVE_DEEPSEEK_CREDENTIAL',{config:{apiKey:'synthetic-uir03-ai-key'}});return page;
}
async function createTopic(page,label){const topic=await rpc(page,'CREATE_LIBRARY_TOPIC',{topic:{name:`${label} Organized 主题`,operationId:op()}});await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topic.id,body:`${label}_ORIGINAL_A 第一段原话必须在整理进行中持续可读。`}});await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topic.id,body:`${label}_ORIGINAL_B 第二段原话用于证据线索，不是虚构阶段。`}});return topic;}
async function openTopic(page,topic){await nav(page,'thoughts');await page.locator('#thought-panel').waitFor({state:'visible'});await page.locator(`[data-topic-id="${topic.id}"]`).click();await page.locator('#topic-heading h1').filter({hasText:topic.name}).waitFor();}
async function confirmGeneration(page){await page.getByRole('button',{name:'生成 AI整理',exact:true}).click();const dialog=page.locator('#library-dialog[open]');await dialog.waitFor();await dialog.locator('select[name="approval"]').selectOption('confirm');await dialog.locator('button[type="submit"]').click();}
async function shot(page,name,{fullPage=true}={}){await mkdir('work/ux-r3',{recursive:true});await page.screenshot({path:`work/ux-r3/${name}.png`,fullPage});}
async function mappedStates(page){return page.evaluate(async()=>{const {aiTopicStatusModel}=await import(chrome.runtime.getURL('ui/ai-presentation.js'));const selected={presentation:{revision:1},pending:false,candidate:null};return {
  prepared:aiTopicStatusModel({view:'ai',hasTopic:true,aiPending:true,runtime:{state:'prepared'},selected}),
  sent:aiTopicStatusModel({view:'ai',hasTopic:true,aiPending:true,runtime:{state:'sent'},selected}),
  received:aiTopicStatusModel({view:'ai',hasTopic:true,aiPending:true,runtime:{state:'response_received'},selected}),
  validated:aiTopicStatusModel({view:'ai',hasTopic:true,aiPending:true,runtime:{state:'validated'},selected}),
  unavailable:aiTopicStatusModel({view:'ai',hasTopic:true,statusUnavailable:true,selected}),
  candidate:aiTopicStatusModel({view:'ai',hasTopic:true,selected:{...selected,candidate:{stale:false}}}),
  stale:aiTopicStatusModel({view:'ai',hasTopic:true,selected:{...selected,candidate:{stale:true}}}),
  unknown:aiTopicStatusModel({view:'ai',hasTopic:true,runtime:{state:'outcome_unknown'},selected}),
  failed:aiTopicStatusModel({view:'ai',hasTopic:true,runtime:{state:'failed',errorCode:'NETWORK_ERROR'},selected})
 };});}

for(const variant of ['source','release'])test(`D5 O02/O06 notices preserve real synthetic Stop and stale refusal (${variant})`,{timeout:180000},async()=>{
 if(variant==='release')await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});
 const releases=[],gates=[0,1].map(index=>new Promise(resolve=>{releases[index]=resolve;}));let calls=0,h;
 try{
  h=await FakeChatGPT.start({onboarding:true,...variant==='release'?{extensionPath:'work/current-release'}:{},deepSeekFixture:async body=>{const index=calls++;if(index<2)await gates[index];return aiOutput(requestOf(body),'SYNTHETIC_Q12');}});
  const page=await readyAI(h),topic=await rpc(page,'CREATE_LIBRARY_TOPIC',{topic:{name:'SYNTHETIC_Q12 可读的真实整理状态',operationId:op()}}),ids=[];
  for(let i=0;i<2;i++)ids.push((await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topic.id,body:`SYNTHETIC_Q12_ORIGINAL_${i} 原话保持完整。\n<literal> 👩‍💻 é；我仍然不确定，不代替我下结论。`}})).id);
  await inspectOrganizeNotices(h,variant,{topic,ids,releaseRequest:index=>releases[index]()});
 }finally{for(const release of releases)release();await h?.close();}
});
