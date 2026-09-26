import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const execFileAsync=promisify(execFile);
const op=()=>crypto.randomUUID();
const rpc=async(page,type,fields={})=>{const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(response.ok,true,JSON.stringify(response));return response.data;};
const requestOf=body=>JSON.parse(body.messages[1].content);
const aiOutput=(request,label,index)=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({topicId:request.topicCandidates[0].id,blockSummary:`${label} 主题速览 ${index}`,currentView:`${label} 当前理解 ${index}`,keyInformation:[],preferences:[],decisions:[],judgments:[],openQuestions:[],possibleEvolution:[],evidenceEntryIds:request.inputs.map(row=>row.ref)})}}]});
async function ready(h){const page=h.archive,action=page.locator('#enable-consent');await action.waitFor({state:'visible'});await eventually(async()=>!(await action.isDisabled()),'UIR-03 consent action is available');await action.click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'UIR-03 consent is durable');if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});await rpc(page,'PAIA_MEMORY_SETTINGS',{options:{externalAccess:true,localOnly:false}});await rpc(page,'SAVE_DEEPSEEK_CREDENTIAL',{config:{apiKey:'synthetic-uir03-candidate-key'}});await mkdir('work/ux-r3',{recursive:true});return page;}
async function createTopic(page,label){const topic=await rpc(page,'CREATE_LIBRARY_TOPIC',{topic:{name:`${label} 候选比较`,operationId:op()}});await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topic.id,body:`${label}_ORIGINAL 当前稿与更新候选必须保持清楚分离。`}});const readback=await rpc(page,'GET_LIBRARY_TOPIC',{id:topic.id});assert.equal(readback.id,topic.id);assert.equal(readback.name,`${label} 候选比较`);return readback;}
async function settleThoughtHome(page){const back=page.locator('#back'),list=page.locator('#thought-list'),documentView=page.locator('#thought-document');await eventually(async()=>await back.isVisible()||await list.isVisible()||!(await documentView.isVisible()),'Thought route settles before Topic reopen');if(await back.isVisible()){await back.click();await list.waitFor({state:'visible'});}else if(!await list.isVisible())await list.waitFor({state:'visible'});}
async function openTopic(page,topic){const nav=page.locator('[data-view="thoughts"]').first(),documentView=page.locator('#thought-document'),list=page.locator('#thought-list'),heading=page.locator('#topic-heading h1').filter({hasText:topic.name});if(await nav.getAttribute('aria-current')!=='page')await nav.click();await page.locator('#thought-panel').waitFor({state:'visible'});await eventually(async()=>await heading.isVisible()||await documentView.isVisible()||await list.isVisible(),'Thought route settles before Topic selection');if(await heading.isVisible())return;if(await documentView.isVisible())await settleThoughtHome(page);const tile=page.locator(`[data-topic-id="${topic.id}"]`);await tile.waitFor({state:'visible'});await tile.click();await heading.waitFor();}
async function reopenTopic(page,topic){await settleThoughtHome(page);await openTopic(page,topic);}
async function organized(page){const toggle=page.locator('#ai-presentation-toggle');await eventually(()=>toggle.isEnabled(),'AI presentation switch enabled');if(!await toggle.isChecked())await toggle.check();}
async function confirmGeneration(page){await page.getByRole('button',{name:'生成 AI整理',exact:true}).click();const dialog=page.locator('#library-dialog[open]');await dialog.waitFor();await dialog.locator('select[name="approval"]').selectOption('confirm');await dialog.locator('button[type="submit"]').click();}
async function state(page,topicId){const result=await rpc(page,'GET_AI_PRESENTATION_STATUS');return result.topics.find(row=>row.topicId===topicId);}
async function updateCandidate(page,h,topic,body,expectedCalls){await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topic.id,body}});await reopenTopic(page,topic);await organized(page);const update=page.locator('#ai-library-update');await update.waitFor({state:'visible'});await update.click();await page.locator('[data-ai-candidate]').waitFor();await eventually(()=>Promise.resolve(h.deepSeekRequests.length===expectedCalls),`candidate Provider call ${expectedCalls}`);}
async function shot(page,name){await page.screenshot({path:`work/ux-r3/${name}.png`,fullPage:true});}
async function pairGeometry(page,field='blockSummary'){return page.locator(`[data-ai-candidate-field="${field}"] [data-candidate-version]`).evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));}

async function sourceJourney(page,h,topic){
 await page.setViewportSize({width:1440,height:900});await openTopic(page,topic);await organized(page);await page.locator('[data-ai-first-generation]').waitFor();await confirmGeneration(page);await page.locator('[data-ai-field="blockSummary"]').filter({hasText:'UIR03_CANDIDATE 主题速览 1'}).waitFor();assert.equal(h.deepSeekRequests.length,1);
 const currentView=page.locator('[data-ai-field="currentView"]'),human='UIR03_CANDIDATE 人工维护的当前理解';await currentView.fill(human);await currentView.press('Tab');await eventually(async()=>(await state(page,topic.id))?.presentation?.currentView===human,'human current draft saved');
 await updateCandidate(page,h,topic,'UIR03_CANDIDATE 新材料 1：只形成更新候选。',2);let row=await state(page,topic.id);assert.equal(row.presentation.blockSummary,'UIR03_CANDIDATE 主题速览 1');assert.equal(row.presentation.currentView,human);assert.equal(row.candidate.proposal.blockSummary,'UIR03_CANDIDATE 主题速览 2');
 const panel=page.locator('[data-ai-candidate]');assert.equal(await panel.getAttribute('data-candidate-state'),'ready');assert.equal(await panel.locator('[data-candidate-version="current"]').count(),2);assert.equal(await panel.locator('[data-candidate-version="proposal"]').count(),2);assert.match(await panel.textContent(),/当前稿/);assert.match(await panel.textContent(),/更新候选/);
 let pair=await pairGeometry(page);assert.equal(pair.length,2);assert.ok(Math.abs(pair[0].y-pair[1].y)<=2,'1440 candidate comparison is two columns');assert.ok(pair[1].x>pair[0].x,'proposal appears after current draft in desktop reading order');
 const summary=panel.locator('[data-ai-candidate-field="blockSummary"]'),view=panel.locator('[data-ai-candidate-field="currentView"]'),save=panel.getByRole('button',{name:'保存这些选择',exact:true});assert.equal(await save.isDisabled(),true);await summary.getByRole('button',{name:'采用这段',exact:true}).click();await view.getByRole('button',{name:'保留当前',exact:true}).click();assert.equal(await save.isEnabled(),true);assert.equal((await state(page,topic.id)).presentation.blockSummary,'UIR03_CANDIDATE 主题速览 1','staging does not write');await shot(page,'uir-03-candidate-1440x900-light');
 await reopenTopic(page,topic);await organized(page);await page.locator('[data-ai-candidate]').waitFor();assert.equal(await summary.getByRole('button',{name:'采用这段',exact:true}).getAttribute('aria-pressed'),'true','Topic reopen retains staged adopt');assert.equal(await view.getByRole('button',{name:'保留当前',exact:true}).getAttribute('aria-pressed'),'true','Topic reopen retains staged keep');assert.equal(h.deepSeekRequests.length,2,'reopen is local');
 await page.setViewportSize({width:1024,height:900});await pause(80);pair=await pairGeometry(page);assert.equal(pair.length,2);assert.ok(pair.every(box=>box.width>0&&box.height>0),'1024 candidate keeps current and proposal visible');const overflow1024=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.ok(overflow1024<=2,`1024px candidate has no root overflow; got ${overflow1024}`);assert.equal(await summary.getByRole('button',{name:'采用这段',exact:true}).getAttribute('aria-pressed'),'true','1024 resize retains staged adopt');assert.equal(await view.getByRole('button',{name:'保留当前',exact:true}).getAttribute('aria-pressed'),'true','1024 resize retains staged keep');await shot(page,'uir-03-candidate-1024x900-light');
 await page.setViewportSize({width:900,height:900});await pause(80);pair=await pairGeometry(page);assert.ok(pair[1].y>pair[0].y+20,'900px candidate comparison stacks current before proposal');const overflow900=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.ok(overflow900<=2,`900px candidate has no root overflow; got ${overflow900}`);await shot(page,'uir-03-candidate-900x900-light');
 await page.setViewportSize({width:390,height:844});await pause(80);const overflow390=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.ok(overflow390<=2,`390px candidate has no root overflow; got ${overflow390}`);const mobileButtons=await panel.locator('button').evaluateAll(nodes=>nodes.map(node=>({width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height})));assert.ok(mobileButtons.every(button=>button.width>=44&&button.height>=44),'candidate mobile controls retain 44px targets');await shot(page,'uir-03-candidate-390x844-light');
 await page.setViewportSize({width:1440,height:900});await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark');await shot(page,'uir-03-candidate-1440x900-dark');await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='light');
 row=await state(page,topic.id);const beforeRevision=row.presentation.revision;await save.click();await eventually(async()=>!(await state(page,topic.id))?.candidate,'candidate saved once');row=await state(page,topic.id);assert.equal(row.presentation.revision,beforeRevision+1);assert.equal(row.presentation.blockSummary,'UIR03_CANDIDATE 主题速览 2');assert.equal(row.presentation.currentView,human);assert.equal(h.deepSeekRequests.length,2,'candidate save is local');
 await updateCandidate(page,h,topic,'UIR03_CANDIDATE 新材料 2：用于 stale 选择保留。',3);const nextPanel=page.locator('[data-ai-candidate]'),nextSummary=nextPanel.locator('[data-ai-candidate-field="blockSummary"]');await nextSummary.getByRole('button',{name:'采用这段',exact:true}).click();assert.equal(await nextSummary.getByRole('button',{name:'采用这段',exact:true}).getAttribute('aria-pressed'),'true');const latest=(await state(page,topic.id)).presentation;await rpc(page,'EDIT_AI_PRESENTATION',{edit:{topicId:topic.id,field:'currentView',value:'UIR03_CANDIDATE 另一窗口保存的人工理解',expectedRevision:latest.revision,operationId:op()}});await reopenTopic(page,topic);await organized(page);await page.locator('[data-ai-candidate]').waitFor();row=await state(page,topic.id);assert.equal(row.candidate.stale,true);assert.equal(await nextPanel.getAttribute('data-candidate-state'),'stale');const staleAdopt=nextSummary.getByRole('button',{name:'采用这段',exact:true});assert.equal(await staleAdopt.getAttribute('aria-pressed'),'true','stale candidate visibly retains staged choice');assert.equal(await staleAdopt.isDisabled(),true,'stale candidate cannot change old choice');assert.equal(await nextPanel.getByRole('button',{name:'保存这些选择',exact:true}).count(),0);await nextPanel.getByRole('button',{name:'重新更新 AI整理',exact:true}).waitFor();await shot(page,'uir-03-candidate-stale-1440x900-light');assert.equal(h.deepSeekRequests.length,3,'stale/read/reopen never retries Provider');assert.equal(h.extensionNetworkRequests,3);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
}

async function releaseJourney(page,h,topic){
 await page.setViewportSize({width:1440,height:900});await openTopic(page,topic);await organized(page);await page.locator('[data-ai-first-generation]').waitFor();await confirmGeneration(page);await page.locator('[data-ai-field="blockSummary"]').filter({hasText:'UIR03_RELEASE_CANDIDATE 主题速览 1'}).waitFor();await updateCandidate(page,h,topic,'UIR03_RELEASE_CANDIDATE 新材料：构造更新候选。',2);const panel=page.locator('[data-ai-candidate]');await panel.waitFor();const pair=await pairGeometry(page);assert.ok(Math.abs(pair[0].y-pair[1].y)<=2,'built release keeps desktop current/proposal columns');assert.equal(await panel.locator('[data-candidate-version="current"]').count(),2);assert.equal(await panel.locator('[data-candidate-version="proposal"]').count(),2);await shot(page,'uir-03-current-release-candidate-1440x900-light');assert.equal(h.extensionNetworkRequests,2);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
}

test('UIR-03 candidate comparison keeps current work distinct, stages choices locally and fails closed when stale in source and built release Chrome',{timeout:300000},async()=>{
 let calls=0,source;try{source=await FakeChatGPT.start({onboarding:true,deepSeekFixture:async body=>aiOutput(requestOf(body),'UIR03_CANDIDATE',++calls)});const page=await ready(source),topic=await createTopic(page,'UIR03_CANDIDATE');await sourceJourney(page,source,topic);}finally{await source?.close();}
 await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});
 let releaseCalls=0,release;try{release=await FakeChatGPT.start({extensionPath:'work/current-release',onboarding:true,deepSeekFixture:async body=>aiOutput(requestOf(body),'UIR03_RELEASE_CANDIDATE',++releaseCalls)});const page=await ready(release),topic=await createTopic(page,'UIR03_RELEASE_CANDIDATE');await releaseJourney(page,release,topic);}finally{await release?.close();}
});

async function addCapturedInput(page,input,topic){
 await page.locator('[data-view="library"]').first().click();
 await page.locator('#archive-navigator').waitFor({state:'visible'});
 const group=page.locator('.archive-navigator-group-toggle').filter({hasText:'未归属 Project'}).first();
 await group.waitFor();if(await group.getAttribute('aria-expanded')!=='true')await group.click();
 await page.locator('.archive-navigator-window[data-document-id="'+input.documentId+'"]').click();
 const field=page.locator('.library-prose[data-edit-id="'+input.id+'"]');await field.waitFor();
 await page.locator('[data-block-id="'+input.id+'"] .reader-more').click();
 await page.getByRole('menuitem',{name:'加入主题',exact:true}).click();
 const chooser=page.locator('#topic-action-dialog');await chooser.waitFor();
 assert.equal(await chooser.locator('.topic-selection-preview').textContent(),input.expectedText,'whole captured Input is explicitly selected');
 await chooser.getByLabel(topic.name,{exact:true}).check();
 await chooser.getByRole('button',{name:'加入',exact:true}).click();
 await eventually(async()=>!await chooser.isVisible(),'actual Reader joins the selected Input to the selected Topic');
 const doc=await rpc(page,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id,sort:'asc',limit:40}});
 const found=doc.items.find(row=>row.entry.body===input.expectedText)?.entry;
 assert.ok(found,'joined whole Input is an actual Original entry');return found;
}
async function livingTopicJourney(page,h,topic,label){
 const a={id:label.toLowerCase()+'-conversation-a',title:label+' Conversation A',base:1609459200,messages:[{id:label+'-message-a',text:label+' 会话一：只在证据足够时考虑这条路线。'}]};
 const b={id:label.toLowerCase()+'-conversation-b',title:label+' Conversation B',base:1609545600,messages:[{id:label+'-message-b',text:label+' 会话二：另一条路线仍开放，并未决定替代。'}]};
 const sourceA=await h.open(a);await h.ready(sourceA);const sourceB=await h.open(b);await h.ready(sourceB);
 await eventually(async()=>(await h.state()).records.length===2,'two separate real content-script captures finish');
 const captured=await h.state(),inputs=captured.library.blocks.map(input=>({...input,expectedText:input.libraryText??captured.records.find(record=>record.id===input.originalTextReference)?.originalText}));
 for(const input of inputs)assert.equal(typeof input.expectedText,'string','captured Input has an effective working-or-Source body');
 assert.equal(inputs.length,2);assert.notEqual(inputs[0].documentId,inputs[1].documentId,'Inputs retain different Conversation identity');
 const sourceEntries=[];for(const input of inputs)sourceEntries.push(await addCapturedInput(page,input,topic));
 assert.equal(h.deepSeekRequests.length,0,'capture and explicit Topic placement never invoke AI');
 await openTopic(page,topic);if(await page.locator('#ai-presentation-toggle').isChecked())await page.locator('#ai-presentation-toggle').uncheck();
 for(const entry of sourceEntries){
  const node=page.locator('#original-reading-body [data-entry-id="'+entry.id+'"]');await node.waitFor();
  assert.equal(await node.locator('[data-entry-field="body"]').textContent(),entry.body);
  const provenance=node.locator('.entry-provenance');await provenance.locator('summary').first().click();
  await eventually(async()=>await provenance.getByRole('button',{name:'查看输入',exact:true}).count()===1,'one direct captured source remains inspectable for each Conversation expression');
  assert.ok((await rpc(page,'GET_LIBRARY_PATHS',{id:entry.id})).length,'joined expression retains a real Topic path');
 }
 const composer=page.locator('#topic-action-dialog'),newBody=label+' 今天的新想法\n这不是过去原话的改写。';
 await page.locator('#create-entry').click();await composer.getByLabel('今天的新想法',{exact:true}).fill(newBody);
 await composer.getByRole('button',{name:'保存想法',exact:true}).click();
 await eventually(async()=>!await composer.isVisible(),'new Thought saves through the real composer');
 await page.locator('#notice').getByRole('button',{name:'查看',exact:true}).click();
 const standalone=page.locator('#library-dialog-content [data-entry-field="body"]');await standalone.waitFor();
 assert.equal(await standalone.textContent(),newBody);
 const newId=await page.locator('#library-dialog-content [data-entry-id]').getAttribute('data-entry-id');
 const newEntry=await rpc(page,'GET_LIBRARY_ENTRY',{id:newId});
 assert.equal(newEntry.provenanceType,'user_created');
 const provenance=await rpc(page,'GET_LIBRARY_PROVENANCE',{id:newId});
 assert.deepEqual(provenance,{userCreated:true,count:0,primary:0,supporting:0,contextOnly:0,items:[]},'independent Thought has no inherited evidence');
 const comparison=await rpc(page,'COMPARE_THOUGHT_INPUT',{id:newId});
 assert.equal(comparison.entry.thoughtText,newBody);assert.deepEqual(comparison.entry.sourceRecordIds,[]);
 assert.deepEqual(comparison.sources,[]);assert.equal(comparison.input,null);assert.deepEqual(comparison.relations,[]);
 assert.equal((await rpc(page,'GET_LIBRARY_PATHS',{id:newId}))[0].topicId,topic.id);
 await page.locator('#library-dialog-close').click();await reopenTopic(page,topic);
 const authority=await rpc(page,'GET_LIBRARY_TOPIC',{id:topic.id});
 const beforeEntries=await Promise.all([...sourceEntries.map(e=>e.id),newId].map(id=>rpc(page,'GET_LIBRARY_ENTRY',{id})));
 await organized(page);await confirmGeneration(page);
 await page.locator('[data-ai-field="blockSummary"]').filter({hasText:label+' 主题速览 1'}).waitFor();
 let row=await state(page,topic.id);assert.equal(h.deepSeekRequests.length,1);
 assert.deepEqual(new Set(row.presentation.evidenceEntryIds),new Set(beforeEntries.map(e=>e.id)),'one bounded generation includes both Conversations and independent Thought');
 assert.deepEqual(await rpc(page,'GET_LIBRARY_TOPIC',{id:topic.id}),authority,'generation never alters Topic authority');
 const human=label+' 人工维护第一行\n第二行保留条件和未定选择。';
 await page.locator('[data-ai-field="currentView"]').fill(human);
 await page.locator('[data-ai-field="currentView"]').press('Tab');
 await eventually(async()=>(await state(page,topic.id)).presentation.currentView===human,'actual manual multiline overview is durable');
 row=await state(page,topic.id);assert.equal(row.presentation.protections.currentView,true);
 const protectedPresentation=structuredClone(row.presentation);
 await page.locator('#ai-presentation-toggle').uncheck();
 assert.deepEqual(await Promise.all(beforeEntries.map(e=>rpc(page,'GET_LIBRARY_ENTRY',{id:e.id}))),beforeEntries,'AI/human overview edits never rewrite any Original entry');
 const newMessage={id:label+'-message-new',text:label+' 会话一新增来源：出现反例，仍需保留先前条件。'};
 await h.send(sourceA,newMessage);
 await eventually(async()=>(await h.state()).records.length===3,'new external source message is captured without AI');
 const changed=await h.state();
 const latestInput=changed.library.blocks.map(input=>({...input,expectedText:input.libraryText??changed.records.find(record=>record.id===input.originalTextReference)?.originalText})).find(input=>input.expectedText===newMessage.text);
 assert.ok(latestInput);assert.deepEqual(changed.records.filter(record=>captured.records.some(old=>old.id===record.id)),captured.records,'new capture keeps earlier immutable Source records');
 const added=await addCapturedInput(page,latestInput,topic);
 await reopenTopic(page,topic);await organized(page);
 row=await state(page,topic.id);assert.equal(row.pending,true);
 const {stale:priorStale,...protectedSaved}=protectedPresentation,{stale:addedStale,...afterAdditionSaved}=row.presentation;
 assert.equal(priorStale,false);assert.equal(addedStale,true,'new evidence truthfully marks the saved overview stale');
 assert.deepEqual(afterAdditionSaved,protectedSaved,'source addition preserves every saved content/revision/protection/timestamp field');
 assert.equal(h.deepSeekRequests.length,1,'new capture/placement/read alone does not request AI');
 const updatedAuthority=await rpc(page,'GET_LIBRARY_TOPIC',{id:topic.id});
 await page.locator('#ai-library-update').click();await page.locator('[data-ai-candidate]').waitFor();
 await eventually(()=>Promise.resolve(h.deepSeekRequests.length===2),'exactly one explicit protected update');
 row=await state(page,topic.id);assert.equal(row.pending,false);assert.equal(row.presentation.stale,false,'one explicit update acknowledges the new evidence while its proposal remains staged');assert.equal(row.presentation.currentView,human);assert.equal(row.presentation.revision,protectedPresentation.revision);
 assert.equal(row.candidate.proposal.currentView,label+' 当前理解 2');
 assert.deepEqual(new Set(row.candidate.proposal.evidenceEntryIds),new Set([...beforeEntries.map(e=>e.id),added.id]),'delta proposal retains prior cross-Conversation evidence and new source');
 const panel=page.locator('[data-ai-candidate]'),summary=panel.locator('[data-ai-candidate-field="blockSummary"]'),view=panel.locator('[data-ai-candidate-field="currentView"]');
 assert.match(await view.locator('[data-candidate-version="current"]').textContent(),/人工维护第一行/);
 await summary.getByRole('button',{name:'采用这段',exact:true}).click();await view.getByRole('button',{name:'保留当前',exact:true}).click();
 assert.deepEqual((await state(page,topic.id)).presentation,protectedPresentation,'reviewed choices remain staged until explicit save');
 await panel.getByRole('button',{name:'保存这些选择',exact:true}).click();
 await eventually(async()=>!(await state(page,topic.id)).candidate,'protected candidate is atomically adopted once');
 row=await state(page,topic.id);assert.equal(row.presentation.revision,protectedPresentation.revision+1);
 assert.equal(row.presentation.blockSummary,label+' 主题速览 2');assert.equal(row.presentation.currentView,human);assert.equal(row.presentation.protections.currentView,true);
 const saved=structuredClone(row.presentation);
 assert.deepEqual(await rpc(page,'GET_LIBRARY_TOPIC',{id:topic.id}),updatedAuthority);
 assert.deepEqual(await Promise.all(beforeEntries.map(e=>rpc(page,'GET_LIBRARY_ENTRY',{id:e.id}))),beforeEntries);
 assert.equal((await rpc(page,'GET_LIBRARY_ENTRY',{id:added.id})).body,newMessage.text);
 assert.deepEqual((await h.state()).records,changed.records,'candidate update never alters captured Source');
 await h.restartWorker();await page.reload();await openTopic(page,topic);await organized(page);
 await page.locator('[data-ai-field="currentView"]').filter({hasText:human}).waitFor();
 assert.deepEqual((await state(page,topic.id)).presentation,saved,'worker restart and route reload preserve exact reviewed human work');
 assert.equal(h.deepSeekRequests.length,2);assert.equal(h.extensionNetworkRequests,2);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 await shot(page,label.toLowerCase()+'-complete-cross-conversation-living-topic');
}
test('VS-05 complete living Topic path captures two Conversations, composes a new Thought and protects human work through new-source candidate update in source and built release',{timeout:300000},async()=>{
 for(const [extensionPath,label]of [[undefined,'VS05_LOOP_SOURCE'],['work/current-release','VS05_LOOP_RELEASE']]){
  if(extensionPath)await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});
  let calls=0,h;
  try{
   h=await FakeChatGPT.start({...(extensionPath?{extensionPath}:{}),onboarding:true,deepSeekFixture:async body=>{
    const request=requestOf(body),output=aiOutput(request,label,++calls),row=JSON.parse(output.choices[0].message.content);
    const previous=JSON.parse(request.context.find(item=>item.ref==='existing-presentation')?.text||'null');
    row.evidenceEntryIds=[...new Set([...row.evidenceEntryIds,...(previous?.evidenceEntryIds||[])])];
    output.choices[0].message.content=JSON.stringify(row);return output;
   }});
   const page=await ready(h),created=await rpc(page,'CREATE_LIBRARY_TOPIC',{topic:{name:label+' 跨会话持续主题',operationId:op()}});
   const topic=await rpc(page,'GET_LIBRARY_TOPIC',{id:created.id});
   assert.equal(topic.id,created.id);assert.equal(topic.name,label+' 跨会话持续主题','chooser identity comes from canonical Topic readback');
   await livingTopicJourney(page,h,topic,label);
  }finally{await h?.close();}
 }
});
