// Historical D5 reference contract, preserved verbatim from the pre-D7 registration.
// This is retained evidence, not current primary-route acceptance.
import {inspectScopeOrder,materializeScopeBaseline} from './harness/d5-organize-scope-order.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {confirmOrganizeScope} from './harness/ai-reviewed-browser.mjs';
const release=mkdtempSync(join(tmpdir(),'paia-d3-organize-'));
test.after(()=>rmSync(release,{recursive:true,force:true}));
console.log(execFileSync('python3',['scripts/build_current_release.py',release],{encoding:'utf8'}));
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(x=>chrome.runtime.sendMessage(x),{type,...fields});assert.equal(r?.ok,true,JSON.stringify(r));return r.data;};
const read=async(p,topicId)=>(await rpc(p,'GET_AI_PRESENTATION_STATUS',{options:{topicId}})).topics[0];
const op=()=>crypto.randomUUID(),listFields=['keyInformation','preferences','decisions','judgments','openQuestions','possibleEvolution'];
const output=(r,index)=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({topicId:r.topicCandidates[0].id,blockSummary:`SYNTHETIC reviewed overview ${index}`,currentView:`SYNTHETIC candidate ${index}: uncertainty remains; this is not the user's quoted belief.\n`+'Long conditional explanation, without invented causation. '.repeat(15),...Object.fromEntries(listFields.map(field=>[field,[{text:`SYNTHETIC ${field} ${index}: preserve conditions and attribution.`,evidenceEntryIds:[r.inputs.at(-1).ref]}]])),evidenceEntryIds:r.inputs.map(x=>x.ref)})}}]});
async function ready(h){const p=h.archive;await p.setViewportSize({width:1440,height:900});await p.locator('#enable-consent').click();if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});await rpc(p,'PAIA_MEMORY_SETTINGS',{options:{externalAccess:true,localOnly:false}});await rpc(p,'SAVE_DEEPSEEK_CREDENTIAL',{config:{apiKey:'synthetic-d3-fixture-only'}});return p;}
async function seed(p,count=160){return p.evaluate(async count=>{const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),topic=await s.createTopic({name:'SYNTHETIC D3 保留不确定与归属',operationId:crypto.randomUUID()}),ids=[];for(let i=0;i<count;i++)ids.push((await s.continueThinking({topicId:topic.id,operationId:crypto.randomUUID(),body:`SYNTHETIC_D3_${i}：受访者说“并不愿意”。我仍不确定；保留两种可能，并未决定替代。`})).id);const other=await s.createTopic({name:'SYNTHETIC unrelated Topic',operationId:crypto.randomUUID()});await s.continueThinking({topicId:other.id,operationId:crypto.randomUUID(),body:'SYNTHETIC_OTHER_TOPIC_NEVER_SEND'});await s.repository.close();return {topicId:topic.id,ids};},count);}
async function open(p,topicId){await p.locator('[data-view="thoughts"]').click();const tile=p.locator(`[data-topic-id="${topicId}"]`);await tile.waitFor();await tile.click();await p.locator('#topic-heading h1').waitFor();await eventually(()=>p.locator('#ai-presentation-toggle').isEnabled());await p.locator('#ai-presentation-toggle').check();await p.locator('[data-ai-first-generation]').waitFor();}
async function choose(p,fn){const fields=await p.locator('[data-ai-candidate-field]').evaluateAll(nodes=>nodes.map(n=>n.dataset.aiCandidateField));for(const field of fields)await p.locator(`[data-ai-candidate-field="${field}"] input[data-candidate-decision="${fn(field)}"]`).check();}
// Preference broadcasts may replace the review root after the RPC acknowledges.
// Reacquire only a detached root; all other errors and the existing wait bound fail.
async function scrollCandidate(p){
 await eventually(async()=>{
  try{await p.locator('[data-ai-candidate]').scrollIntoViewIfNeeded();return true;}
  catch(error){if(!String(error).includes('Element is not attached to the DOM'))throw error;return false;}
 },'candidate root survives viewport/theme replacement');
}
async function update(p){await p.locator('#ai-library-update').waitFor({state:'visible'});await p.locator('#ai-library-update').click();await confirmOrganizeScope(p);await p.locator('[data-ai-candidate]').waitFor();}
// Exact adopted-source and release baseline; no provider call is permitted.
test('D5 O01 records the pinned adopted consent-review ordering in source and release',{timeout:240000},async()=>{
 const paths=await materializeScopeBaseline();
 for(const variant of ['source','release']){const h=await FakeChatGPT.start({extensionPath:paths[variant],onboarding:true,deepSeekFixture:async()=>{throw Error('UNEXPECTED_SCOPE_BASELINE_PROVIDER_CALL');}});try{const p=await ready(h),seeded=await seed(p);await open(p,seeded.topicId);await inspectScopeOrder(h,variant,{baseline:true,...seeded});}finally{await h.close();}}
});
for(const variant of ['source','release'])test(`D5 O01 disclosure precedes unchanged native approval and preserves no-request exits (${variant})`,{timeout:240000},async()=>{
 const h=await FakeChatGPT.start({...variant==='release'?{extensionPath:release}:{},onboarding:true,deepSeekFixture:async()=>{throw Error('UNEXPECTED_SCOPE_ORDER_PROVIDER_CALL');}});
 try{const p=await ready(h),seeded=await seed(p);await open(p,seeded.topicId);await inspectScopeOrder(h,variant,seeded);}finally{await h.close();}
});
