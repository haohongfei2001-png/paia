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
  harness=await FakeChatGPT.start({onboarding:true,launchThroughPort:true});
  const page=harness.archive;
  await page.setViewportSize({width:1280,height:800});
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
  assert.equal(await projectGroup.locator('.archive-navigator-detail').count(),0,'Project rows have no per-row search or detail chrome');
  await page.locator('#back').click();
  await page.locator('#scope-search').fill('CPV1_NAV_IDENTITY_BODY');
  await eventually(async()=>await page.locator('.search-input').count()===2,'one Archive search includes matching Project and unassigned Inputs');
  assert.equal(await page.locator('#search-project-scope').isVisible(),false,'retired Project search chip is not visible');
  await page.locator('#scope-search').fill('');
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
  await eventually(async()=>await page.locator('.archive-navigator-source-state').allTextContents().then(values=>values.some(value=>value.includes('来源 Project 已删除')||value.includes('Source Project deleted'))),'deleted source Project is labeled without deleting PAIA content');
  assert.match(await page.locator('.library-prose').first().textContent(),/CPV1_NAV_IDENTITY_BODY/);
  await eventually(async()=>await page.locator(`.archive-navigator-window[data-document-id="${documentId}"][aria-current="page"]`).count()===1,'source deletion keeps the selected Conversation');
  assert.equal(harness.externalRequests,0);
 }finally{await harness?.close();}
});

test('Bounded Archive keeps one search above a quiet tree and stable same-title Reader identity',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true});
 try{
  const p=h.archive;await p.setViewportSize({width:1440,height:900});
  await p.locator('#enable-consent').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented===true);
  await p.locator('#onboarding-skip').click();
  await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:'light',language:'zh-CN',timeEmphasis:'subtle'}});
  await eventually(()=>p.evaluate(()=>document.documentElement.dataset.paiaTheme==='light'&&document.documentElement.lang==='zh-CN'),'light Chinese preferences are rendered');
  for(const [id,title] of [['bounded-a','相同标题'],['bounded-b','相同标题'],['bounded-c','独立标题']])
   await h.open({id,title,base:1609459200,messages:[{id:id+'-1',text:'BOUNDARY_'+id+' first saved expression'},{id:id+'-2',text:'BOUNDARY_'+id+' second saved expression'}]});
  await eventually(async()=>{const records=(await h.state()).records;return records.length===6&&records.every(row=>row.sourceSentAt);},'same-title fixtures have reliable captured timestamps');
  await p.bringToFront();const group=p.locator('.archive-navigator-group-toggle').filter({hasText:'未归属 Project'}).first();
  await eventually(()=>group.isVisible());if(await group.getAttribute('aria-expanded')!=='true')await group.click();
  await eventually(async()=>await p.locator('.archive-navigator-window').count()===3);
  const white=async selectors=>{for(const selector of selectors){const background=await p.locator(selector).evaluate(el=>{for(let node=el;node;node=node.parentElement){const color=getComputedStyle(node).backgroundColor;if(color!=='rgba(0, 0, 0, 0)'&&color!=='transparent')return color;}return 'transparent';});assert.equal(background,selector==='.sidebar'?'rgb(250, 251, 253)':'rgb(255, 255, 255)',selector+' uses the adopted D6.2 light rail/reading surface');}};
  await white(['body','.sidebar','.workspace','#archive-navigator']);
  const rootContract=async()=>{
   assert.equal(await p.locator('input[type="search"]:visible').count(),1);
   const tools=await p.locator('#archive-root-header-actions').boundingBox(),tree=await p.locator('#archive-navigator').boundingBox();
   assert.ok(tools&&tree&&tools.y+tools.height<=tree.y,'all primary search tools precede the Project tree');
   assert.equal(await p.locator('.archive-navigator-window-cue,.archive-navigator-window-time,.archive-navigator-detail,#archive-root-recent,#archive-root-continue').count(),0);
   assert.equal(await p.locator('#archive-search-date-scope').isVisible(),false);
   assert.equal(await p.locator('#search-project-scope').isVisible(),false);
  };
  await rootContract();
  const labels=()=>p.locator('.archive-navigator-window').evaluateAll(rows=>Object.fromEntries(rows.map(row=>[row.dataset.documentId,{title:row.querySelector('.archive-navigator-window-title')?.textContent,label:row.querySelector('.archive-navigator-window-disambiguator')?.textContent||''}])));
  const before=await labels(),duplicates=Object.entries(before).filter(([,row])=>row.title==='相同标题');
  assert.equal(duplicates.length,2);assert.deepEqual(duplicates.map(([,row])=>row.label).sort(),['同名 1','同名 2']);
  assert.equal(Object.values(before).find(row=>row.title==='独立标题').label,'');
  const quiet=await p.locator('.archive-navigator-window-disambiguator').first().evaluate(el=>{const small=getComputedStyle(el),title=getComputedStyle(el.parentElement.querySelector('strong'));return {small:Number.parseFloat(small.fontSize),title:Number.parseFloat(title.fontSize),color:small.color,titleColor:title.color};});
  assert.ok(quiet.small<quiet.title);assert.notEqual(quiet.color,quiet.titleColor);
  for(const [id] of duplicates){
   await p.locator(`.archive-navigator-window[data-document-id="${id}"]`).click();
   await eventually(async()=>await p.evaluate(()=>history.state?.paiaReader?.documentId)===id);
   assert.equal(await p.locator('input[type="search"]:visible').count(),1,'Reader has one current-document search');
   assert.equal(await p.locator('#scope-search').isVisible(),true);
   assert.equal(await p.locator('#document-filter-toggle,#document-search-include-filtered,.filtered-input-note').count(),0);
   await white(['body','.sidebar','.workspace','#archive-navigator']);
   assert.equal(await p.locator(`.archive-navigator-window[data-document-id="${id}"]`).getAttribute('aria-current'),'page');
   const stamp=p.locator('#document-body .block-time').first();await stamp.waitFor({state:'visible'});
   assert.match(await stamp.textContent(),/\d{2}:\d{2}/);
   const timestamp=await stamp.evaluate(el=>{const style=getComputedStyle(el),prose=getComputedStyle(el.closest('.library-block').querySelector('.library-prose'));return {size:Number.parseFloat(style.fontSize),proseSize:Number.parseFloat(prose.fontSize),color:style.color,proseColor:prose.color,opacity:style.opacity};});
   assert.ok(timestamp.size<timestamp.proseSize);assert.notEqual(timestamp.color,timestamp.proseColor);assert.ok(Number(timestamp.opacity)>0);
   const sources=(await h.state()).records;
   const sort=p.locator('#input-time-toggle'),previous=await sort.getAttribute('data-current-sort');await sort.click();
   await eventually(async()=>await sort.getAttribute('data-current-sort')!==previous);
   assert.equal(await p.evaluate(()=>history.state?.paiaReader?.documentId),id);
   await eventually(async()=>await p.locator('.archive-navigator-window').count()===Object.keys(before).length&&await p.locator(`.archive-navigator-window[data-document-id="${id}"][aria-current="page"]`).count()===1,'Navigator completes the actual post-sort projection');
   assert.deepEqual(await labels(),before,'same-title labels survive Reader sort');
   assert.deepEqual((await h.state()).records,sources,'sorting never mutates Source');
   await p.locator('#back').click();await eventually(()=>p.locator('#archive-root-header-actions #scope-search').isVisible(),'Back restores the current Archive header search owner');
   await eventually(async()=>await p.locator('.archive-navigator-window').count()===Object.keys(before).length,'Navigator restores the complete root projection after Back');
   await rootContract();assert.deepEqual(await labels(),before,'same-title identity survives Reader/back');
  }
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
