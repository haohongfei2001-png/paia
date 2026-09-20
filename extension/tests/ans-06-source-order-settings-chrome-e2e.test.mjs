import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{
 const r=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
 assert.equal(r.ok,true,JSON.stringify(r));return r.data;
};
async function consent(p){
 const check=p.locator('#consent-check');if(!await check.isChecked())await check.check();
 await p.locator('#enable-consent').click();
 await eventually(async()=>(await rpc(p,'GET_STATUS')).consented===true,'ANS-06 consent');
 const skip=p.locator('#onboarding-skip');if(await skip.isVisible().catch(()=>false))await skip.click();
}
const groupBox=(p,text)=>p.locator('.archive-navigator-group').filter({has:p.locator('.archive-navigator-group-toggle').filter({hasText:text})}).first();
const windowButtons=box=>box.locator('.archive-navigator-window');
async function navResult(p,options,predicate){
 let last;for(let i=0;i<300;i++){last=await rpc(p,'PAIA_ARCHIVE_NAV_PAGE',{page:{...options,limit:40}});if(last.coverage.state==='complete'&&predicate(last))return last;}
 assert.fail('Navigator result did not settle: '+JSON.stringify({coverage:last?.coverage,ordering:last?.effectiveOrdering,reason:last?.unavailableReason}));
}
test('ANS-06 production setting, honest ChatGPT fallback and synthetic provider order survive worker restart',{timeout:240000},async()=>{
 const h=await FakeChatGPT.start(),p=h.archive;
 try{
  await p.setViewportSize({width:1440,height:900});await consent(p);
  await h.open({id:'ans06-chatgpt-real',title:'ANS-06 ChatGPT',base:1609459200,messages:[{id:'ans06-real-msg',text:'ANS06_REAL_BODY'}]},{arrival:'dom-first'});
  await eventually(async()=>{const page=await rpc(p,'GET_PAGE',{page:{view:'library',limit:100}});return page.documents.some(x=>x.sourceConversationId==='ans06-chatgpt-real');},'real ChatGPT captured');
  await p.bringToFront();
  const beforeControls=await rpc(p,'GET_ORGANIZER_CONTROLS');
  await p.locator('[data-view="settings"]').first().click();
  await p.locator('[data-settings-group="reading"]').click();
  await p.locator('#archive-order-mode').waitFor();
  assert.equal(await p.locator('#archive-order-mode').inputValue(),'paia');
  await p.locator('#archive-order-mode').selectOption('source');
  await eventually(async()=>await p.locator('#archive-order-mode').inputValue()==='source','source preference selected');
  assert.match(await p.locator('#archive-order-status').textContent(),/ChatGPT|PAIA/);
  const afterControls=await rpc(p,'GET_ORGANIZER_CONTROLS');assert.deepEqual(afterControls,beforeControls,'source-order setting is independent of Input reading sort');
  await h.restartWorker();
  const persisted=await rpc(p,'PAIA_ARCHIVE_ORDER_PREFERENCE');assert.equal(persisted.mode,'source');assert.equal(persisted.providers.chatgpt.availability,'unavailable');
  const chatgpt=await navResult(p,{providerKey:'chatgpt',groupKind:'unknown',mode:'source'},x=>x.unavailableReason==='SOURCE_ORDER_UNAVAILABLE');
  assert.equal(chatgpt.effectiveOrdering,'paia');assert.equal(chatgpt.unavailableReason,'SOURCE_ORDER_UNAVAILABLE');
  const seeded=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js');
   const {SourceStructureStore}=await import('../core/source-structure-store.js');
   const {SourceOrderRegistry,SourceOrderStore}=await import('../core/source-ordering.js');
   const s=new OrganizerStore(chrome.storage.local);await s.finishFoundation();
   const providerKey='ans06fixture',namespace='fixture-main',alpha={providerKey,namespace,projectId:'alpha'},beta={providerKey,namespace,projectId:'beta'};
   const docs=[
    {id:'ans06-s1',chat:'ans06-source-1',title:'ANS06 S1',project:alpha},
    {id:'ans06-s2',chat:'ans06-source-2',title:'ANS06 S2',project:alpha},
    {id:'ans06-s3',chat:'ans06-source-3',title:'ANS06 S3',project:alpha},
    {id:'ans06-b1',chat:'ans06-source-b1',title:'ANS06 B1',project:beta}
   ];
   const sequence=await s.repository.transaction(false,t=>t.get('meta','sequence'));
   await s.write(async t=>{
    for(let i=0;i<docs.length;i++){const d=docs[i],key=[-(1701000000000+i),d.id],value={id:d.id,platform:providerKey,sourceConversationId:d.chat,userTitle:d.title,originalConversationTitle:d.title,status:'active',titleRevision:0,firstSourceSentAt:null,lastSourceSentAt:null};await t.put('documents',{id:d.id,sequence:sequence.documents+i+1,chatKey:providerKey+':'+d.chat,displayKey:key,libraryDisplay:key,value});await t.put('libraryDocuments',{id:d.id,value});}
    await t.put('meta',{...sequence,documents:sequence.documents+docs.length});
   });
   const structure=new SourceStructureStore(s),now=Date.now(),e=n=>({id:'ans06-browser-'+n,contractId:'ans06.browser.structure',contractVersion:1,channel:'synthetic_fixture',scope:'conversation',originClass:'fixture',requestGeneration:n,evidenceKind:'relationship',digest:n.toString(16).padStart(64,'0')});
   for(let i=0;i<docs.length;i++){const d=docs[i],conversationRef={platform:providerKey,sourceConversationId:d.chat},current=await structure.conversation(conversationRef);await structure.observeConversation({conversationRef,expectedRevision:current?.relationshipRevision||0,observedAt:new Date(now+i*1000).toISOString(),evidence:e(i+1),membership:{state:'project',projectRef:d.project},projectName:d.project.projectId.toUpperCase(),sourceStatus:'observed_active'});}
   for(const [i,ref] of [alpha,beta].entries()){const current=await structure.project(ref);await structure.observeProject({projectRef:ref,expectedRevision:current?.relationshipRevision||0,observedAt:new Date(now+10000+i*1000).toISOString(),evidence:e(20+i),currentName:ref.projectId.toUpperCase(),sourceStatus:'observed_active'});}
   const provider={status:()=>({availability:'available'}),getOrder:async q=>({availability:'available',providerKey:q.providerKey,namespace:q.namespace,scopeKind:q.scopeKind,scopeRef:q.scopeRef,orderedRefs:q.scopeKind==='projects'?[beta,alpha]:q.scopeRef.projectId==='alpha'?[{providerKey,namespace,sourceConversationId:'ans06-source-2'},{providerKey,namespace,sourceConversationId:'ans06-source-1'}]:[{providerKey,namespace,sourceConversationId:'ans06-source-b1'}],contractId:'ans06.browser.order',contractVersion:1,evidenceKind:'synthetic_fixture',observationId:q.scopeKind==='projects'?'projects-v1':q.scopeRef.projectId+'-v1',observedAt:new Date(now).toISOString(),expiresAt:new Date(now+60*60*1000).toISOString(),completeness:'proven_rank_subset',generation:'v1'})};
   const registry=new SourceOrderRegistry([[providerKey,provider]]),orders=new SourceOrderStore(s);
   for(const request of [{providerKey,namespace,scopeKind:'projects',scopeRef:null},{providerKey,namespace,scopeKind:'windows',scopeRef:alpha},{providerKey,namespace,scopeKind:'windows',scopeRef:beta}])await orders.observe(await registry.getOrder({...request,now}),{now});
   return {providerKey,namespace,alpha,beta};
  });
  await p.locator('[data-view="library"]').first().click();await p.evaluate(()=>document.dispatchEvent(new Event('paia:navigator-refresh')));
  await eventually(()=>groupBox(p,'BETA').isVisible(),'synthetic beta group visible',30000);
  await eventually(async()=>{
   const provider=p.locator('.archive-navigator-provider').filter({has:p.locator('.archive-navigator-provider-title').filter({hasText:seeded.providerKey})}).first();
   const texts=await provider.locator('.archive-navigator-group-toggle').allTextContents();
   return texts.indexOf('BETA')>=0&&texts.indexOf('ALPHA')>=0&&texts.indexOf('BETA')<texts.indexOf('ALPHA');
  },'synthetic project source order',30000);
  const alphaBox=groupBox(p,'ALPHA'),alphaToggle=alphaBox.locator('.archive-navigator-group-toggle').first();
  if(await alphaToggle.getAttribute('aria-expanded')!=='true')await alphaToggle.click();
  await eventually(async()=>{
   const texts=await windowButtons(alphaBox).allTextContents();
   return texts.length>=3&&texts[0].includes('ANS06 S2')&&texts[1].includes('ANS06 S1')&&texts[2].includes('ANS06 S3');
  },'synthetic window source order with PAIA tail',30000);
  const sourcePage=await navResult(p,{providerKey:seeded.providerKey,groupKind:'project',projectRef:seeded.alpha,mode:'source'},x=>x.effectiveOrdering==='source');
  assert.deepEqual(sourcePage.items.map(x=>x.title),['ANS06 S2','ANS06 S1','ANS06 S3']);
  const s2=windowButtons(alphaBox).filter({hasText:'ANS06 S2'}).first();await s2.click();
  await eventually(async()=>await s2.getAttribute('aria-current')==='page','S2 remains selected');
  await s2.focus();
  await p.evaluate(async({providerKey,namespace,alpha})=>{
   const {OrganizerStore}=await import('../core/organizer/store.js');
   const {SourceOrderRegistry,SourceOrderStore}=await import('../core/source-ordering.js');
   const s=new OrganizerStore(chrome.storage.local),now=Date.now();
   const provider={getOrder:async q=>({availability:'available',providerKey:q.providerKey,namespace:q.namespace,scopeKind:'windows',scopeRef:q.scopeRef,orderedRefs:[{providerKey,namespace,sourceConversationId:'ans06-source-1'},{providerKey,namespace,sourceConversationId:'ans06-source-2'},{providerKey,namespace,sourceConversationId:'ans06-source-3'}],contractId:'ans06.browser.order',contractVersion:1,evidenceKind:'synthetic_fixture',observationId:'alpha-v2',observedAt:new Date(now).toISOString(),expiresAt:new Date(now+60*60*1000).toISOString(),completeness:'complete_scope',generation:'v2'})};
   const registry=new SourceOrderRegistry([[providerKey,provider]]),orders=new SourceOrderStore(s);
   await orders.observe(await registry.getOrder({providerKey,namespace,scopeKind:'windows',scopeRef:alpha,now}),{now});
   document.dispatchEvent(new Event('paia:navigator-refresh'));
  },seeded);
  await eventually(()=>p.locator('.archive-navigator-apply-order').isVisible(),'staged reorder apply visible');
  assert.deepEqual((await windowButtons(alphaBox).allTextContents()).map(x=>x.trim()).slice(0,3),['ANS06 S2','ANS06 S1','ANS06 S3']);
  await p.locator('.archive-navigator-apply-order').click();
  await eventually(async()=>{
   const box=groupBox(p,'ALPHA'),texts=(await windowButtons(box).allTextContents()).map(x=>x.trim());
   return texts.length>=3&&texts[0]==='ANS06 S1'&&texts[1]==='ANS06 S2'&&texts[2]==='ANS06 S3';
  },'atomic reordered windows',30000);
  await eventually(async()=>await windowButtons(groupBox(p,'ALPHA')).filter({hasText:'ANS06 S2'}).first().getAttribute('aria-current')==='page','selected S2 identity preserved across reorder');
  await p.locator('[data-view="settings"]').first().click();await p.locator('[data-settings-group="reading"]').click();await p.locator('#archive-order-mode').waitFor();
  assert.equal(await p.locator('#archive-order-mode').inputValue(),'source');
  const rollback=await p.evaluate(async()=>{
   const {ArchiveOrderSettings}=await import('./archive-order-settings.js');
   const control=new ArchiveOrderSettings({send:async(_type,fields)=>{
    if(fields===undefined)return {mode:'source',providers:{chatgpt:{availability:'unavailable',reasonCode:'UNVERIFIED'}}};
    throw Error('ANS06 synthetic preference failure');
   }});
   await control.load();await control.save('paia');
   return {mode:control.mode,value:control.select.value,status:control.status.textContent};
  });
  assert.equal(rollback.mode,'source');assert.equal(rollback.value,'source');assert.ok(rollback.status.length>0);
  await p.locator('#archive-order-mode').selectOption('paia');await eventually(async()=>await p.locator('#archive-order-mode').inputValue()==='paia');
  await p.locator('#archive-order-mode').selectOption('source');await eventually(async()=>await p.locator('#archive-order-mode').inputValue()==='source');
  assert.equal((await rpc(p,'PAIA_ARCHIVE_ORDER_PREFERENCE')).mode,'source');
  console.log('ANS06_BROWSER_EVIDENCE '+JSON.stringify({chatgptFallback:chatgpt.unavailableReason,syntheticProvider:seeded.providerKey,sourceTitles:sourcePage.items.map(x=>x.title),restartPersistence:persisted.mode,rollback:rollback.mode}));
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
