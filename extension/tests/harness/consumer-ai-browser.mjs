// Synthetic pre-retirement durable AI fixtures. They never enable a provider,
// install a credential, or enter the release package. All reads/edits use real UI/worker.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
let releaseReady=false;
import {FakeChatGPT,eventually} from './fake-chatgpt.mjs';
import {setAIView} from './ai-reviewed-browser.mjs';
export {setAIView};
export const rpc=async(p,type,fields={})=>{const r=await p.evaluate(m=>chrome.runtime.sendMessage(m),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
export async function fixture(variant='source',{saved=true,candidate=false,count=2,releasePath=null}={}){
 if(variant==='release'&&!releasePath&&!releaseReady){execFileSync('python3',['scripts/build_current_release.py'],{stdio:'pipe'});releaseReady=true;}
 const h=await FakeChatGPT.start({extensionPath:resolve(variant==='source'?'.':releasePath||'work/current-release'),headless:true}),p=h.archive;
 await p.locator('#enable-consent').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented);if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
 await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});
 const topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'SYNTHETIC 已有主题 '+variant,operationId:crypto.randomUUID()}}),entries=[];
 for(let i=0;i<count;i++)entries.push(await rpc(p,'CONTINUE_THINKING',{thought:{topicId:topic.id,body:'SYNTHETIC 原始思想 '+i+'\n原话、人工内容与证据必须保留。',operationId:crypto.randomUUID()}}));
 if(saved)await seedSavedAI(p,topic.id,entries,{candidate});
 await openTopic(p,topic);return {h,p,topic,entries};
}
export async function openTopic(p,topic){
 if(await p.locator('#thought-document').isVisible())await p.locator('#back').click();
 await p.locator('[data-view="thoughts"]').first().click();await p.locator(`.personal-topic-link[data-topic-id="${topic.id}"]`).click();await p.locator('#topic-heading h1').filter({hasText:topic.name}).waitFor();
}
export async function seedSavedAI(p,topicId,entries,{candidate=false}={}){
 return p.evaluate(async({topicId,entries,candidate})=>{
  const {OrganizerStore}=await import('../core/organizer/store.js'),{AI_FIELDS,AI_LIST_FIELDS,AI_SCHEMA_VERSION}=await import('../core/organizer/ai-contract.js');const s=new OrganizerStore(chrome.storage.local);await s.finishFoundation();
  const ids=entries.map(x=>x.id),literal='\n<literal> 👩‍💻 é\n未经确认的内容仍是候选。';
  const row={id:'aiPresentation:'+topicId,topicId,schemaVersion:AI_SCHEMA_VERSION,revision:1,evidenceEntryIds:ids,protections:{blockSummary:true},...Object.fromEntries(AI_FIELDS.map(key=>[key,AI_LIST_FIELDS.includes(key)?[{text:'SYNTHETIC 已有 '+key+literal,evidenceEntryIds:ids}]:'SYNTHETIC 已有 '+key+literal]))};
  if(candidate){const proposal={topicId,evidenceEntryIds:ids,...Object.fromEntries(AI_FIELDS.map(key=>[key,AI_LIST_FIELDS.includes(key)?[{text:'SYNTHETIC 候选 '+key+literal,evidenceEntryIds:ids}]:'SYNTHETIC 候选 '+key+literal]))};row.candidate={schemaVersion:1,expectedRevision:1,changedFields:AI_FIELDS,proposal,materialVersions:Object.fromEntries(entries.map(e=>[e.id,JSON.stringify([e.revision,e.dependencyRevision||0,[]])])),createdAt:'2026-01-01T00:00:00.000Z'};}
  await s.foundationWrite(t=>t.put('meta',row));await s.repository.close();return row;
 },{topicId,entries,candidate});
}
export async function savedRow(p,topicId){return p.evaluate(async topicId=>{const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local);await s.finishFoundation();const row=await s.repository.transaction(false,t=>t.get('meta','aiPresentation:'+topicId),['meta']);await s.repository.close();return row;},topicId);}
export async function authority(p){return p.evaluate(async()=>{const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local);await s.finishFoundation();const names=['records','blocks','thoughts','topics','placements','provenance','revisions','tombstones'];const rows=await s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(names.map(async k=>[k,await t.all(k)]))),names);await s.repository.close();return rows;});}
export async function refusedAI(p,topicId){
 const before=await authority(p),saved=await savedRow(p,topicId);
 for(const type of ['GET_DEEPSEEK_STATUS','SAVE_DEEPSEEK_CREDENTIAL','CLEAR_DEEPSEEK','START_BOUNDED_ORGANIZER','UPDATE_AI_PRESENTATION','GET_AI_PRESENTATION_SCOPE','UPDATE_ORIGINAL_LIBRARY_VIEW','SET_ORIGINAL_LIBRARY_AUTO_UPDATE','PREVIEW_AI_LIBRARY_UPDATE']){
  const result=await p.evaluate(m=>chrome.runtime.sendMessage(m),{type,options:{topicId},config:{apiKey:'SYNTHETIC never installed'},userActionId:crypto.randomUUID()});assert.equal(result.error,'AI_SERVICE_UNAVAILABLE',type);
 }
 assert.deepEqual(await savedRow(p,topicId),saved,'refused stale commands cannot replace saved AI/candidate');assert.deepEqual(await authority(p),before,'refused AI never modifies Source, Thought, organization, history or fences');
}
export async function quiet(h){assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);}
export async function noApproval(p){assert.equal(await p.locator('[data-ai-candidate] input,[data-ai-candidate] select,[data-candidate-decision],#ai-library-update,[data-ai-first-generation],#start-thought-library').count(),0,'retired generation and approval handlers are absent');}
export async function editSaved({p,topic},text='SYNTHETIC 人工改写保留\n第二行'){
 await setAIView(p,true);const field=p.locator('[data-ai-field="blockSummary"]').first();await field.waitFor();const before=await savedRow(p,topic.id);await field.fill(text);await field.press('Tab');await eventually(async()=>(await savedRow(p,topic.id)).blockSummary===text,'saved AI remains locally editable');
 const after=await savedRow(p,topic.id);assert.equal(after.revision,before.revision+1);assert.equal(after.protections.blockSummary,true);
 const stale=await p.evaluate(edit=>chrome.runtime.sendMessage({type:'EDIT_AI_PRESENTATION',edit}),{topicId:topic.id,field:'blockSummary',value:'SYNTHETIC stale overwrite',expectedRevision:before.revision,operationId:crypto.randomUUID()});assert.equal(stale.error,'STALE_BASE');assert.deepEqual(await savedRow(p,topic.id),after,'stale field edit cannot overwrite human work');return after;
}
export async function screenshotMatrix(p,name,variant){
 const dir=process.env.PAIA_CONSUMER_EVIDENCE_DIR||'work/consumer-cleanup';await mkdir(dir,{recursive:true});
 for(const appearance of ['light','dark']){await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance}});await eventually(()=>p.evaluate(a=>document.documentElement.dataset.paiaTheme===a,appearance));for(const width of [1440,320]){await p.setViewportSize({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'AI reader has no horizontal overflow');await p.screenshot({path:resolve(dir,variant+'-'+name+'-'+appearance+'-'+width+'.png'),fullPage:true});}}
 await p.setViewportSize({width:1440,height:900});
}
