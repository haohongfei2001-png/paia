import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {openArchiveWindow} from './harness/archive-navigator.mjs';

const rpc=async(page,type,fields={})=>{
 const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
 assert.equal(response.ok,true,JSON.stringify(response));return response.data;
};
async function consent(page){
 await page.locator('#consent-check').check();await page.locator('#enable-consent').click();
 await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'ANS-02 consent persists');
 const skip=page.locator('#onboarding-skip');if(await skip.isVisible().catch(()=>false))await skip.click();
}
async function openReader(page){
 await page.locator('#primary-nav [data-view="library"]').click();await openArchiveWindow(page,{label:'ANS-02 Archive document appears'});
 await eventually(async()=>await page.locator('.library-block').count()>0&&await page.locator('.library-block').first().isVisible(),'ANS-02 Reader opens');
}

test('ANS-02 trusted source metadata survives restart and Backup restore while edited Input/source truth remains unchanged',{timeout:240000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  const p=h.archive;await consent(p);
  await h.open({id:'ans02-browser-chat',title:'ANS-02 Browser Source',base:1609459200,messages:[
   {id:'ans02-browser-message-001',text:'ANS02_BROWSER_ORIGINAL immutable source'},
   {id:'ans02-browser-message-002',text:'ANS02_BROWSER_SECOND independent source'}
  ]});
  await eventually(async()=>(await h.state()).records.length===2,'ANS-02 browser capture complete');
  const setup=await p.evaluate(async()=>{
   const {OrganizerStore}=await import('../core/organizer/store.js');
   const {SourceStructureStore}=await import('../core/source-structure-store.js');
   const s=new OrganizerStore(chrome.storage.local),before=await s.snapshot(),b=before.library.blocks[0];
   await s.editDocument({documentId:b.documentId,blocks:[{id:b.id,expectedRevision:b.revision,libraryText:'ANS02_BROWSER_WORKING_EDIT',note:b.note,excluded:b.excluded}],operationId:crypto.randomUUID()});
   const structure=new SourceStructureStore(s),conv={platform:'chatgpt',sourceConversationId:'ans02-browser-chat'};
   const A={providerKey:'chatgpt',namespace:'browser-account',projectId:'browser-project-a'},B={providerKey:'chatgpt',namespace:'browser-account',projectId:'browser-project-b'};
   const ev=(id,n)=>({id,contractId:'ans-browser-fixture',contractVersion:1,channel:'synthetic',scope:'conversation',originClass:'fixture',requestGeneration:n,evidenceKind:'relationship',digest:n.toString(16).padStart(64,'0')});
   const at=n=>new Date(Date.UTC(2026,8,18,20,n,0)).toISOString();
   await structure.observeConversation({conversationRef:conv,expectedRevision:0,observedAt:at(1),evidence:ev('browser-rel-a',1),membership:{state:'project',projectRef:A},projectName:'Browser Project A',sourceStatus:'observed_active'});
   await structure.observeProject({projectRef:A,witnessConversationRef:conv,expectedRevision:0,observedAt:at(2),evidence:ev('browser-project-a',2),currentName:'Browser Project A'});
   await structure.observeConversation({conversationRef:conv,expectedRevision:1,observedAt:at(3),evidence:ev('browser-rel-b',3),membership:{state:'project',projectRef:B},projectName:'Browser Project B'});
   await structure.observeProject({projectRef:B,witnessConversationRef:conv,expectedRevision:0,observedAt:at(4),evidence:ev('browser-project-b',4),currentName:'Browser Project B'});
   await structure.observeConversation({conversationRef:conv,expectedRevision:2,observedAt:at(5),evidence:ev('browser-conversation-delete',5),sourceStatus:'confirmed_deleted'});
   const after=await s.snapshot(),history=await structure.history({kind:'conversation',conversationRef:conv});
   return {conv,A,B,original:after.records.map(r=>[r.id,r.sourceKey,r.originalText,r.contentHash]),working:after.library.blocks.map(x=>[x.id,x.libraryText,x.revision]),relationship:await structure.conversation(conv),history:history.items.length};
  });
  assert.equal(setup.relationship.sourceStatus,'confirmed_deleted');assert.deepEqual(setup.relationship.membership.projectRef,setup.B);assert.equal(setup.history,4);
  assert.ok(setup.original.some(row=>row[2].includes('ANS02_BROWSER_ORIGINAL')));assert.ok(setup.working.some(row=>row[1]==='ANS02_BROWSER_WORKING_EDIT'));
  await p.bringToFront();await openReader(p);assert.equal(await p.locator('.library-prose').filter({hasText:'ANS02_BROWSER_WORKING_EDIT'}).count(),1);
  await h.restartWorker();
  const persisted=await p.evaluate(async conv=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),{SourceStructureStore}=await import('../core/source-structure-store.js'),{BackupService}=await import('../core/backup-service.js');
   const s=new OrganizerStore(chrome.storage.local),structure=new SourceStructureStore(s),current=await structure.conversation(conv),history=await structure.history({kind:'conversation',conversationRef:conv}),snapshot=await s.snapshot();
   const backup=new BackupService(s,{appVersion:'0.12.0'}),{sessionId,header}=await backup.beginExport(),items=[header];let sequence=0;
   for(;;){const page=await backup.exportPage({sessionId,sequence:sequence++});items.push(...page.items);if(page.done)break;}
   return {current,history:history.items,snapshot:{records:snapshot.records.map(r=>[r.id,r.sourceKey,r.originalText,r.contentHash]),working:snapshot.library.blocks.map(x=>[x.id,x.libraryText,x.revision])},items};
  },setup.conv);
  assert.deepEqual(persisted.snapshot.records,setup.original);assert.deepEqual(persisted.snapshot.working,setup.working);assert.equal(persisted.current.relationshipRevision,4);
  const restored=await p.evaluate(async items=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),{SourceStructureStore}=await import('../core/source-structure-store.js'),{BackupService}=await import('../core/backup-service.js');
   const memory={},local={async get(k){return {[k]:structuredClone(memory[k])};},async set(v){Object.assign(memory,structuredClone(v));},async getBytesInUse(){return 0;}};
   const target=new OrganizerStore(local,{name:'paia-ans02-browser-restore'});await target.consent(true);const backup=new BackupService(target,{appVersion:'0.12.0'}),{sessionId}=await backup.beginRestore();
   for(let i=0;i<items.length;i+=30)await backup.stageRestore({sessionId,items:items.slice(i,i+30)});const preview=await backup.previewRestore({sessionId});if(!preview.canRestore)throw Error(preview.reason);
   await backup.restore({sessionId,confirmation:preview.integrity});const snapshot=await target.snapshot(),structure=new SourceStructureStore(target),conv={platform:'chatgpt',sourceConversationId:'ans02-browser-chat'},history=await structure.history({kind:'conversation',conversationRef:conv});
   return {current:await structure.conversation(conv),history:history.items,snapshot:{records:snapshot.records.map(r=>[r.id,r.sourceKey,r.originalText,r.contentHash]),working:snapshot.library.blocks.map(x=>[x.id,x.libraryText,x.revision])}};
  },persisted.items);
  assert.deepEqual(restored.snapshot.records,setup.original);assert.deepEqual(restored.snapshot.working,setup.working);assert.equal(restored.current.sourceStatus,'confirmed_deleted');assert.equal(restored.history.length,4);assert.ok(restored.history.every(e=>e.evidence.channel==='restored'));
  await p.reload();await eventually(async()=>await p.locator('.library-block').count()>0||await p.locator('#archive-navigator').isVisible()||await p.locator('.conversation-document').first().isVisible().catch(()=>false),'ANS-02 UI recovers after worker restart');if(!await p.locator('.library-block').count())await openReader(p);
  assert.equal(await p.locator('.library-prose').filter({hasText:'ANS02_BROWSER_WORKING_EDIT'}).count(),1);
  await mkdir('work/ans-02',{recursive:true});await p.screenshot({path:'work/ans-02/source-foundation-reader.png',fullPage:false});
  assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

