import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';
import {openArchiveWindow} from './harness/archive-navigator.mjs';
const op=()=>crypto.randomUUID();
const rpc=async(page,type,fields={})=>{const reply=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(reply.ok,true,JSON.stringify(reply));return reply.data;};
async function ready(h){const p=h.archive;await p.setViewportSize({width:1440,height:900});await p.locator('#consent-check').check();await p.locator('#enable-consent').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented);await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN'}});if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();return p;}
async function record(h,name,checks){assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);await mkdir('work/audit-boundaries',{recursive:true});await h.archive.screenshot({path:`work/audit-boundaries/${name}.png`});await writeFile(`work/audit-boundaries/${name}.json`,JSON.stringify({status:'PASS',headSha:process.env.PAIA_TESTED_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),evidence:'SYNTHETIC_HOSTED_CHROME',noExternalRequests:true,checks},null,2));}

test('audit Reader search refreshes edited/removed content, drops stale replies, and keeps header menu document-only',{timeout:120000},async()=>{
 const h=await FakeChatGPT.start({launchThroughPort:true});try{
  const p=await ready(h);await h.open({id:'audit-reader',title:'Synthetic audit Reader',messages:Array.from({length:45},(_,i)=>({id:'audit-reader-'+i,text:'AUDIT_MATCH independent synthetic reading statement '+i}))});
  await eventually(async()=>(await h.state()).records.length===45,'all synthetic Inputs captured',30000);await openArchiveWindow(p,{text:'Synthetic audit Reader'});
  await p.locator('#scope-search').fill('AUDIT_MATCH');await eventually(async()=>await p.locator('.document-search-hit').count()===40,'first search page');
  const worker=h.context.serviceWorkers().find(worker=>worker.url().endsWith('/background/service-worker.js'));
  await worker.evaluate(()=>{const put=IDBObjectStore.prototype.put;let pending=[];globalThis.__auditGenerationWrites=[];IDBObjectStore.prototype.put=function(value,...args){pending.push({store:this.name,id:value?.id,...(this.name==='meta'&&value?.id==='smart-filter'?{taskState:value.taskState,decisionSequence:value.decisionSequence,noticePending:value.noticePending}:{})});pending=pending.slice(-100);if(this.name==='meta'&&value?.id==='backup-data-generation'){globalThis.__auditGenerationWrites.push({generation:value.value,writes:pending});globalThis.__auditGenerationWrites=globalThis.__auditGenerationWrites.slice(-30);pending=[];}return put.call(this,value,...args);};});
  const old=(await h.state()).library.blocks[0],source=old.sourceRecordId;
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__auditOriginal=send;globalThis.__auditHeld=false;globalThis.__auditTrace=[];
   chrome.runtime.onMessage.addListener(message=>{if(message.type==='ARCHIVE_CHANGED')globalThis.__auditTrace.push({event:message.cause||'unlabelled'});});
   const tracked=message=>send(message).then(reply=>{if(message.type==='SEARCH_INPUTS')globalThis.__auditTrace.push({query:message.options.query,cursor:message.options.cursor,ok:reply.ok,error:reply.error,generation:reply.data?.generation,changed:reply.data?.changed,count:reply.data?.items?.length,nextCursor:reply.data?.nextCursor});return reply;});
   chrome.runtime.sendMessage=message=>{
   if(message.type==='SEARCH_INPUTS'&&message.options?.documentId&&!globalThis.__auditHeld){globalThis.__auditHeld=true;return tracked(message).then(reply=>new Promise(resolve=>globalThis.__auditRelease=()=>resolve(reply)));}return tracked(message);
  };});
  await p.locator('#scope-search').fill('AUDIT_MATCH ');await eventually(()=>p.evaluate(()=>typeof globalThis.__auditRelease==='function'),'old search reply held');
  await rpc(p,'EDIT_DOCUMENT',{edit:{operationId:op(),documentId:old.documentId,blocks:[{id:old.id,expectedRevision:old.revision,libraryText:'Updated body without the previous search term',note:'',excluded:false}]}});
  await eventually(async()=>await p.locator('.document-search-hit').count()===40&&await p.locator(`.document-search-hit[data-input-id="${old.id}"]`).count()===0,'fresh search omits old snippet');
  await p.evaluate(()=>globalThis.__auditRelease());await pause(250);assert.equal(await p.locator(`.document-search-hit[data-input-id="${old.id}"]`).count(),0);
  await p.locator('#document-search-next').click();try{await eventually(async()=>await p.locator('.document-search-hit').count()===4,'consistent next page after mutation');}
  catch(error){await mkdir('work/audit-boundaries',{recursive:true});await p.screenshot({path:'work/audit-boundaries/reader-search-menu-failure.png'});const diagnostic=await p.evaluate(()=>({trace:globalThis.__auditTrace,status:document.getElementById('document-search-status').textContent,query:document.getElementById('document-search').value,count:document.querySelectorAll('.document-search-hit').length,previousHidden:document.getElementById('document-search-previous').hidden,nextHidden:document.getElementById('document-search-next').hidden}));diagnostic.generationWrites=await worker.evaluate(()=>globalThis.__auditGenerationWrites);console.log('AUDIT_READER_PAGINATION '+JSON.stringify(diagnostic));await writeFile('work/audit-boundaries/reader-pagination-failure.json',JSON.stringify(diagnostic,null,2));throw error;}
  console.log('AUDIT_READER_PAGINATION_PASS '+JSON.stringify({trace:await p.evaluate(()=>globalThis.__auditTrace),generationWrites:await worker.evaluate(()=>globalThis.__auditGenerationWrites)}));
  const nextInput=(await h.state()).library.blocks.find(b=>b.sourceRecordId!==source),nextSource=nextInput.sourceRecordId;await rpc(p,'PURGE_SOURCE',{id:nextSource,confirm:true});
  await eventually(async()=>await p.locator('.document-search-hit').count()===40,'content change restarts first page');assert.equal(await p.locator(`.document-search-hit[data-input-id="${nextInput.id}"]`).count(),0);assert.equal(await p.locator('#document-search-previous').isVisible(),false);
  const fields=p.locator('.library-prose');await fields.nth(1).click({button:'right'});assert.equal(await p.getByRole('menuitem',{name:'从档案移除',exact:true}).count(),1);
  await p.locator('#document-menu').click();const labels=await p.locator('#context-menu [role=menuitem]').allTextContents();assert.ok(labels.includes('查看修改历史'));assert.ok(labels.includes('会话收录设置'));assert.ok(!labels.some(label=>/复制这条|从档案移除|永久删除|加入主题/.test(label)));
  await p.keyboard.press('Escape');await record(h,'reader-search-menu',['fresh-after-edit','fresh-after-purge','old-response-discarded','generation-pagination','document-only-header']);
 }finally{await h.close();}
});

test('audit legacy Thought continuation preserves fresh quote and revision while the ordinary compose entry stays held',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({launchThroughPort:true});try{
  const p=await ready(h),topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'Synthetic continuation audit',operationId:op()}}),created=await rpc(p,'CONTINUE_THINKING',{thought:{body:'Original first-render Thought',topicId:topic.id,operationId:op()}});
  await p.locator('[data-view="thoughts"]').first().click();await p.locator(`[data-topic-id="${topic.id}"]`).click();const row=p.locator(`#topic-body [data-entry-id="${created.id}"]`),body=row.locator('[data-entry-field="body"]');await body.waitFor();
  await p.evaluate(async()=>{const {TopicActions}=await import(chrome.runtime.getURL('ui/topic-actions.js')),compose=TopicActions.prototype.compose,send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__auditContinueWrites=0;globalThis.__auditRestoreCompose=()=>{TopicActions.prototype.compose=compose;chrome.runtime.sendMessage=send;const owner=globalThis.__auditComposeOwner;if(owner&&Object.hasOwn(owner,'__auditPresentation')){owner.composePresentation=owner.__auditPresentation;delete owner.__auditPresentation;}};TopicActions.prototype.compose=function(options){globalThis.__auditComposeOwner=this;return compose.call(this,options);};chrome.runtime.sendMessage=message=>{if(message.type==='CONTINUE_THINKING')globalThis.__auditContinueWrites++;return send(message);};});
  await body.fill('SYNTHETIC ordinary held continuation edit');const menu=row.locator('.library-actions');await menu.locator('summary').click();await menu.getByRole('button',{name:'接着写',exact:true}).click();
  const preview=p.locator('#desktop-appearance-preview-workspace');await preview.locator('#thought-compose-workspace-title').waitFor();assert.equal(await preview.locator('.topic-selection-preview').textContent(),'SYNTHETIC ordinary held continuation edit');
  assert.equal(await preview.locator('.thought-compose-save').isDisabled(),true);assert.equal(await preview.locator('.thought-compose-cancel').isDisabled(),true);assert.equal(await p.locator('.dvn-preview-back').isDisabled(),true);
  const heldDraft=preview.getByLabel('今天的新想法',{exact:true});await heldDraft.fill('SYNTHETIC held ordinary compose draft');await heldDraft.press('Control+Enter');await preview.locator('.thought-compose-save').evaluate(button=>button.click());assert.equal(await p.evaluate(()=>__auditContinueWrites),0);assert.equal((await rpc(p,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id,sort:'asc'}})).items.length,1);
  // Explicit retained legacy-owner compatibility. Only this isolated test
  // temporarily removes the presentation hook; normal entry above remains held.
  await heldDraft.fill('');await p.locator('[data-view="thoughts"]').first().click();await eventually(()=>p.evaluate(()=>!document.getElementById('desktop-appearance-preview-workspace')&&document.querySelector('.workspace').getAttribute('aria-busy')==='false'&&!document.getElementById('scope-search').disabled&&!document.getElementById('topic-body').inert&&!document.getElementById('topic-heading').inert),'returned topic navigation has settled before editing');await body.waitFor();assert.equal(await body.isEditable(),true);
  await p.evaluate(()=>{__auditComposeOwner.__auditPresentation=__auditComposeOwner.composePresentation;__auditComposeOwner.composePresentation=null;});
  const beforeLegacy=await rpc(p,'GET_LIBRARY_ENTRY',{id:created.id});assert.equal(beforeLegacy.body,'SYNTHETIC ordinary held continuation edit');
  await body.fill('Freshly edited Thought used for this response');assert.equal(await body.textContent(),'Freshly edited Thought used for this response');await menu.locator('summary').click();await menu.getByRole('button',{name:'接着写',exact:true}).click();
  const dialog=p.locator('#topic-action-dialog');await dialog.waitFor({state:'visible'});assert.equal(await dialog.locator('.topic-selection-preview').textContent(),'Freshly edited Thought used for this response');
  const current=await rpc(p,'GET_LIBRARY_ENTRY',{id:created.id});assert.equal(current.body,'Freshly edited Thought used for this response');assert.ok(current.revision>beforeLegacy.revision,'legacy continuation flushes a distinct dirty edit to a newer revision');
  await dialog.getByLabel('今天的新想法',{exact:true}).fill('Independent follow-on thought');await dialog.getByLabel('记录与这条内容的回应关系',{exact:true}).check();await dialog.getByRole('button',{name:'保存想法',exact:true}).click();await eventually(()=>dialog.isVisible().then(value=>!value),'response saves with current relation');
  const page=await rpc(p,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id,sort:'asc'}}),response=page.items.find(item=>item.entry.id!==created.id);assert.ok(response);assert.equal(response.entry.body,'Independent follow-on thought');
  const relation=(await rpc(p,'COMPARE_THOUGHT_INPUT',{id:response.entry.id})).relations[0];assert.equal(relation.body,current.body);assert.equal(relation.state,'current');
  assert.equal(await p.evaluate(()=>__auditContinueWrites),1);
  await record(h,'thought-continuation',['ordinary-compose-held','legacy-owner-compatibility','dirty-edit-flushed','fresh-quote','matching-relation','independent-response-saved']);
 }finally{try{await h.archive.evaluate(()=>globalThis.__auditRestoreCompose?.());}finally{await h.close();}}
});

test('audit Source export serializes repeated clicks, reports a read failure and retries without changing format',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({launchThroughPort:true});try{
  const p=await ready(h);await h.open({id:'audit-export',title:'Synthetic audit export',messages:[{id:'audit-export-one',text:'Synthetic export content'}]});await eventually(async()=>(await h.state()).records.length===1,'export source captured');await p.bringToFront();
  const downloads=[];p.on('download',download=>downloads.push(download));
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__auditExportCalls=0;globalThis.__auditExportFailed=false;chrome.runtime.sendMessage=message=>{
   if(message.type==='GET_PAGE'&&message.page?.view==='archive'&&!globalThis.__auditExportFailed){globalThis.__auditExportCalls++;if(!message.page.documentId)return new Promise(resolve=>globalThis.__auditExportRelease=()=>{send(message).then(resolve);});globalThis.__auditExportFailed=true;return Promise.resolve({ok:false,error:'STORAGE_FAILED'});}return send(message);
  };});
  await p.locator('#archive-root-overflow summary').click();await p.locator('#archive-root-export-json').click();await eventually(()=>p.evaluate(()=>typeof globalThis.__auditExportRelease==='function'),'export initial read held');
  assert.equal(await p.locator('#archive-root-export-json').isDisabled(),true);assert.equal(await p.locator('#archive-root-export-markdown').isDisabled(),true);
  await p.locator('#archive-root-export-json').evaluate(button=>button.click());assert.equal(await p.evaluate(()=>globalThis.__auditExportCalls),1);
  await p.evaluate(()=>globalThis.__auditExportRelease());await p.locator('#notice').getByRole('button',{name:'重试导出',exact:true}).waitFor();assert.equal(downloads.length,0);assert.match(await p.locator('#notice').textContent(),/没有下载不完整文件/);
  const downloaded=p.waitForEvent('download');await p.locator('#notice').getByRole('button',{name:'重试导出',exact:true}).click();const file=await downloaded;
  const stream=await file.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  assert.equal(payload.format,'personal-ai-input-archive');assert.equal(payload.schemaVersion,2);assert.equal(payload.recordCount,1);assert.equal(payload.records[0].originalText,'Synthetic export content');assert.equal(downloads.length,1);assert.equal(await p.locator('#archive-root-export-json').isDisabled(),false);
  await record(h,'source-export',['single-flight','no-partial-download','visible-failure','retry','unchanged-source-format']);
 }finally{await h.close();}
});
