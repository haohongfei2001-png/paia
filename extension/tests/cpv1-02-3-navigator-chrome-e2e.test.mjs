import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{
 const result=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
 assert.equal(result.ok,true,JSON.stringify(result));
 return result.data;
};

test('CPV1-02.3 Navigator projects a Project move, rename and source deletion without losing the selected Conversation',{timeout:150000},async()=>{
 let harness;
 try{
  harness=await FakeChatGPT.start({onboarding:true});
  const page=harness.archive;
  await page.locator('#enable-consent').waitFor({state:'visible'});
  await eventually(async()=>!(await page.locator('#enable-consent').isDisabled()));
  await page.locator('#enable-consent').click();
  await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true);
  await page.locator('#onboarding-skip').click();
  const chatId='cpv1-023-move';
  await harness.open({id:chatId,title:'Stable Conversation identity',base:1609459200,messages:[{id:'cpv1-023-input',text:'CPV1_NAV_IDENTITY_BODY'}]});
  await harness.open({id:'cpv1-023-other',title:'Unassigned search control',base:1609459200,messages:[{id:'cpv1-023-other-input',text:'CPV1_NAV_IDENTITY_BODY'}]});
  await eventually(async()=>(await harness.state()).records.length===2);
  let documentId;
  await eventually(async()=>{const result=await rpc(page,'GET_PAGE',{page:{view:'library'}});documentId=result.documents.find(row=>row.sourceConversationId===chatId)?.id;return !!documentId;});
  await page.bringToFront();
  await eventually(()=>page.locator('.archive-navigator-group-toggle').first().isVisible());
  for(const group of await page.locator('.archive-navigator-group-toggle').all()){
   await group.click();
   if(await page.locator(`.archive-navigator-window[data-document-id="${documentId}"]`).count())break;
  }
  await page.locator(`.archive-navigator-window[data-document-id="${documentId}"]`).click();
  await eventually(()=>page.locator('.archive-navigator-window[aria-current="page"]').isVisible());
  assert.match(await page.locator('.library-prose').first().textContent(),/CPV1_NAV_IDENTITY_BODY/);

  const projectRef=await page.evaluate(async({chatId,documentId})=>{
   const {OrganizerStore}=await import('../core/organizer/store.js');
   const {SourceStructureStore}=await import('../core/source-structure-store.js');
   const store=new OrganizerStore(chrome.storage.local),structure=new SourceStructureStore(store);
   await store.finishFoundation();
   const ref={platform:'chatgpt',sourceConversationId:chatId};
   const previous=await structure.conversation(ref);
   const at=Math.max(Date.now(),Date.parse(previous?.lastObservedAt||'')||0)+1000;
   const projectRef={providerKey:'chatgpt',namespace:'cpv1-synthetic',projectId:'alpha'};
   const evidence=n=>({id:'cpv1-023-evidence-'+n,contractId:'cpv1.synthetic',contractVersion:1,channel:'synthetic_fixture',scope:'conversation',originClass:'fixture',requestGeneration:n,evidenceKind:'relationship',digest:n.toString(16).padStart(64,'0')});
   await structure.observeConversation({conversationRef:ref,expectedRevision:previous?.relationshipRevision||0,observedAt:new Date(at).toISOString(),evidence:evidence(1),membership:{state:'project',projectRef},projectName:'Synthetic Alpha',sourceStatus:'observed_active'});
   await structure.observeProject({projectRef,expectedRevision:0,observedAt:new Date(at+1000).toISOString(),evidence:evidence(2),currentName:'Synthetic Alpha',sourceStatus:'observed_active'});
   return projectRef;
  },{chatId,documentId});
  await page.evaluate(()=>document.dispatchEvent(new Event('paia:navigator-refresh')));
  await eventually(async()=>{
   const status=await rpc(page,'PAIA_ARCHIVE_NAV_STATUS',{page:{selectedDocumentId:documentId}});
   return status.selectedPath?.groupKind==='project';
  },'new Project membership reaches the indexed projection');
  await eventually(async()=>await page.locator('.archive-navigator-group-toggle').allTextContents().then(values=>values.some(value=>value.includes('Synthetic Alpha'))),'new Project appears');
  await eventually(async()=>await page.locator(`.archive-navigator-window[data-document-id="${documentId}"][aria-current="page"]`).count()===1,'selected Conversation moves without duplication');
  const projectGroup=page.locator('.archive-navigator-group').filter({has:page.locator('.archive-navigator-group-toggle').filter({hasText:'Synthetic Alpha'})}).first();
  await projectGroup.getByRole('button',{name:'在此 Project 搜索'}).click();
  await page.locator('#search').fill('CPV1_NAV_IDENTITY_BODY');
  await eventually(async()=>await page.locator('.search-input').count()===1,'Project search excludes the same text in an unassigned Conversation');
  assert.match(await page.locator('#search-project-scope').textContent(),/Synthetic Alpha/);
  await page.locator('#search-project-scope').click();
  await eventually(async()=>await page.locator('.search-input').count()===2,'clearing Project scope restores both matching Inputs');
  await page.locator('#search').fill('');
  await page.locator(`.archive-navigator-window[data-document-id="${documentId}"]`).click();
  await eventually(async()=>await page.locator(`.archive-navigator-window[data-document-id="${documentId}"][aria-current="page"]`).count()===1,'Reader reopens the same Conversation after scoped search');

  await page.evaluate(async projectRef=>{
   const {OrganizerStore}=await import('../core/organizer/store.js');
   const {SourceStructureStore}=await import('../core/source-structure-store.js');
   const store=new OrganizerStore(chrome.storage.local),structure=new SourceStructureStore(store);
   await store.finishFoundation();
   const current=await structure.project(projectRef);
   const evidence={id:'cpv1-023-evidence-3',contractId:'cpv1.synthetic',contractVersion:1,channel:'synthetic_fixture',scope:'project',originClass:'fixture',requestGeneration:3,evidenceKind:'relationship',digest:'3'.padStart(64,'0')};
   await structure.observeProject({projectRef,expectedRevision:current.relationshipRevision,observedAt:new Date(Date.now()+3000).toISOString(),evidence,currentName:'Synthetic Alpha Renamed',sourceStatus:'observed_active'});
  },projectRef);
  await page.evaluate(()=>document.dispatchEvent(new Event('paia:navigator-refresh')));
  await eventually(async()=>await page.locator('.archive-navigator-group-toggle').allTextContents().then(values=>values.some(value=>value.includes('Synthetic Alpha Renamed'))),'Project rename updates the tree');
  assert.match(await page.locator('.library-prose').first().textContent(),/CPV1_NAV_IDENTITY_BODY/);
  await eventually(async()=>await page.locator(`.archive-navigator-window[data-document-id="${documentId}"]`).count()===1,'renamed Project keeps one selected Conversation');
  await page.evaluate(async projectRef=>{
   const {OrganizerStore}=await import('../core/organizer/store.js');
   const {SourceStructureStore}=await import('../core/source-structure-store.js');
   const store=new OrganizerStore(chrome.storage.local),structure=new SourceStructureStore(store);
   await store.finishFoundation();
   const current=await structure.project(projectRef);
   const evidence={id:'cpv1-023-evidence-4',contractId:'cpv1.synthetic',contractVersion:1,channel:'synthetic_fixture',scope:'project',originClass:'fixture',requestGeneration:4,evidenceKind:'relationship',digest:'4'.padStart(64,'0')};
   await structure.observeProject({projectRef,expectedRevision:current.relationshipRevision,observedAt:new Date(Math.max(Date.now(),Date.parse(current.lastObservedAt||'')+1000)).toISOString(),evidence,sourceStatus:'confirmed_deleted'});
  },projectRef);
  await page.evaluate(()=>document.dispatchEvent(new Event('paia:navigator-refresh')));
  await eventually(async()=>await page.locator('.archive-navigator-source-state').allTextContents().then(values=>values.some(value=>value.includes('来源 Project 已删除'))),'deleted source Project is labeled without deleting PAIA content');
  assert.match(await page.locator('.library-prose').first().textContent(),/CPV1_NAV_IDENTITY_BODY/);
  await eventually(async()=>await page.locator(`.archive-navigator-window[data-document-id="${documentId}"][aria-current="page"]`).count()===1,'source deletion keeps the selected Conversation');
  assert.equal(harness.externalRequests,0);
 }finally{await harness?.close();}
});
