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

test('audit independent Thought can save, edit and open history while response relations remain retired',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({launchThroughPort:true});try{
  const p=await ready(h),topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'Synthetic independent thought audit',operationId:op()}}),created=await rpc(p,'CONTINUE_THINKING',{thought:{body:'Original Thought',topicId:topic.id,operationId:op()}});
  await p.locator('[data-view="thoughts"]').first().click();await p.locator(`[data-topic-id="${topic.id}"]`).click();const row=p.locator(`#topic-body [data-entry-id="${created.id}"]`),body=row.locator('[data-entry-field="body"]');await body.waitFor();
  await body.fill('Original Thought with a fresh saved edit');await p.locator('#create-entry').click();const dialog=p.locator('#topic-action-dialog');await dialog.waitFor({state:'visible'});
  assert.equal(await p.locator('#desktop-appearance-preview-workspace').count(),0,'ordinary compose has no held preview');assert.equal(await dialog.locator('.topic-selection-preview').count(),0,'independent draft carries no implicit reply quote');assert.equal(await dialog.getByLabel('记录与这条内容的回应关系',{exact:true}).count(),0);
  const current=await rpc(p,'GET_LIBRARY_ENTRY',{id:created.id});assert.equal(current.body,'Original Thought with a fresh saved edit');
  await dialog.getByLabel('今天的新想法',{exact:true}).fill('SYNTHETIC independently saved Thought');await dialog.getByRole('button',{name:'保存想法',exact:true}).click();await eventually(()=>dialog.isVisible().then(value=>!value));
  const contents=await rpc(p,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id,sort:'asc'}}),fresh=contents.items.find(item=>item.entry.id!==created.id).entry;
  assert.equal(fresh.body,'SYNTHETIC independently saved Thought');assert.deepEqual((await rpc(p,'COMPARE_THOUGHT_INPUT',{id:fresh.id})).relations,[]);
  const freshRow=p.locator(`#topic-body [data-entry-id="${fresh.id}"]`),freshBody=freshRow.locator('[data-entry-field="body"]');await freshBody.waitFor();await freshBody.fill('SYNTHETIC edited independent Thought');await p.locator('#topic-heading').click();await eventually(async()=>(await rpc(p,'GET_LIBRARY_ENTRY',{id:fresh.id})).body==='SYNTHETIC edited independent Thought');
  await freshRow.locator('.library-actions summary').click();for(const label of ['回应','接着写','查看关联'])assert.equal(await freshRow.getByRole('button',{name:label,exact:true}).count(),0);await freshRow.getByRole('button',{name:'版本历史',exact:true}).click();await p.locator('#library-dialog .revision-row').first().waitFor();assert.match(await p.locator('#library-dialog').textContent(),/SYNTHETIC independently saved Thought/);await p.locator('#library-dialog-close').click();
  const beforeRelation=await h.state(),rejected=await p.evaluate(thought=>chrome.runtime.sendMessage({type:'CONTINUE_THINKING',thought}),{operationId:op(),body:'Retired response must not save',topicId:topic.id,relation:{id:created.id,expectedRevision:current.revision}});assert.equal(rejected.error,'FEATURE_UNAVAILABLE');assert.deepEqual(await h.state(),beforeRelation);
  await p.locator('#create-entry').click();await dialog.getByLabel('今天的新想法',{exact:true}).fill('SYNTHETIC cancelled draft');p.once('dialog',d=>d.accept());await dialog.getByRole('button',{name:'取消',exact:true}).click();assert.equal(await dialog.isVisible(),false);assert.equal(await dialog.locator('textarea').count(),0,'closing removes the old draft owner');assert.deepEqual(await h.state(),beforeRelation);
  await record(h,'independent-thought',['ordinary-compose-save','dirty-edit-flushed','new-thought-readable','editing-and-history','relation-refused-no-side-effect','cancel-clears-owner']);
 }finally{await h.close();}
});

test('audit retired Source exports reject repeated calls without reads, downloads or data mutation',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({launchThroughPort:true});try{
  const p=await ready(h);await h.open({id:'audit-export',title:'Synthetic audit export',messages:[{id:'audit-export-one',text:'Synthetic export content'}]});await eventually(async()=>(await h.state()).records.length===1,'source captured');await p.bringToFront();
  const downloads=[];p.on('download',download=>downloads.push(download));const before=await h.state();
  assert.equal(await p.locator('#archive-root-export-json,#archive-root-export-markdown,#r6-export-json,#r6-export-markdown,#backup-create').count(),0);
  await p.evaluate(async()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__auditExportCalls=[];chrome.runtime.sendMessage=message=>{__auditExportCalls.push(message.type);return send(message);};for(let i=0;i<3;i++)document.dispatchEvent(new CustomEvent('paia:export',{detail:{format:'json'}}));});
  assert.deepEqual(await p.evaluate(()=>__auditExportCalls),[],'stale export event cannot read Source or start a download');
  for(let i=0;i<3;i++){const result=await p.evaluate(()=>chrome.runtime.sendMessage({type:'PAIA_BACKUP_BEGIN_EXPORT'}));assert.equal(result.error,'FEATURE_UNAVAILABLE');}
  assert.deepEqual(await h.state(),before);assert.equal(downloads.length,0);
  await record(h,'source-export-retired',['no-export-controls','repeated-calls-refused','no-canonical-read','no-download','data-retained']);
 }finally{await h.close();}
});
