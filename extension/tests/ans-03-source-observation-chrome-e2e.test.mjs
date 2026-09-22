import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{
 const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
 assert.equal(response.ok,true,JSON.stringify(response));return response.data;
};
async function consent(page){
 await page.locator('#consent-check').check();await page.locator('#enable-consent').click();
 await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'ANS-03 consent persists');
 const skip=page.locator('#onboarding-skip');if(await skip.isVisible().catch(()=>false))await skip.click();
}
async function sourceRow(page,id){
 return page.evaluate(async id=>{
  const {OrganizerStore}=await import('../core/organizer/store.js');
  const {SourceStructureStore}=await import('../core/source-structure-store.js');
  const s=new OrganizerStore(chrome.storage.local),structure=new SourceStructureStore(s);
  const ref={platform:'chatgpt',sourceConversationId:id},row=await structure.conversation(ref);
  const history=await structure.history({kind:'conversation',conversationRef:ref});
  return {row,history:history.items};
 },id);
}
test('ANS-03 trusted current-route observation settles after capture, respects exclusion/pause, and synthetic lifecycle stays separate',{timeout:240000},async()=>{
 const h=await FakeChatGPT.start({headless:true});
 try{
  const archive=h.archive;await consent(archive);
  const a={id:'ans03-browser-presence',title:'ANS-03 Presence',base:1609459200,messages:[
   {id:'ans03-browser-message-001',text:'ANS03 SAME SYNTHETIC TEXT'},
   {id:'ans03-browser-message-002',text:'ANS03 SAME SYNTHETIC TEXT'}
  ]};
  const chat=await h.open(a,{arrival:'dom-first'});
  await eventually(async()=>(await h.state()).records.filter(r=>r.chatId===a.id).length===2,
    'ANS-03 production capture completes');
  await eventually(async()=>Boolean((await sourceRow(archive,a.id)).row?.lastObservedAt),
    'ANS-03 production plain-route observation settles after source exists');
  let observed=await sourceRow(archive,a.id);
  assert.equal(observed.row.membership.state,'unassigned');assert.equal(observed.row.sourceStatus,'unknown');
  assert.equal(observed.row.relationshipRevision,1);assert.match(observed.row.lastEvidenceId,/^obs:/);
  assert.equal(observed.history.length,1,'plain-route negative evidence records one unassigned relationship');
  const captured=(await h.state()).records.filter(r=>r.chatId===a.id);
  assert.equal(new Set(captured.map(r=>r.sourceKey)).size,2,'same text with different IDs remains separate');
  const documentId=(await h.state()).library.documents.find(d=>d.sourceConversationId===a.id)?.id;
  assert.ok(documentId);
  await rpc(archive,'PAIA_READER_CAPTURE_SCOPE',{options:{documentId,excluded:true}});
  const lastObservedAt=observed.row.lastObservedAt;
  await chat.reload();await pause(2600);
  observed=await sourceRow(archive,a.id);
  assert.equal(observed.row.lastObservedAt,lastObservedAt,'capture exclusion blocks later structure writes');
  assert.equal(observed.history.length,1);

  const b={id:'ans03-browser-lifecycle',title:'ANS-03 Lifecycle',base:1609469200,messages:[
   {id:'ans03-life-message-001',text:'ANS03 lifecycle source'}
  ]};
  await h.spa(chat,b);
  await eventually(async()=>(await h.state()).records.some(r=>r.chatId===b.id),'ANS-03 second source captures');
  await eventually(async()=>Boolean((await sourceRow(archive,b.id)).row?.lastObservedAt),
    'ANS-03 second production plain-route observation settles');
  const synthetic=await archive.evaluate(async id=>{
   const {OrganizerStore}=await import('../core/organizer/store.js');
   const {SourceStructureStore}=await import('../core/source-structure-store.js');
   const {createSourceStructurePolicy,admitSourceStructureDTO}=await import('../core/source-structure-admission.js');
   const s=new OrganizerStore(chrome.storage.local),structure=new SourceStructureStore(s);
   const ref={platform:'chatgpt',sourceConversationId:id},initial=await structure.conversation(ref);
   const policy=createSourceStructurePolicy({
    providerKey:'chatgpt',contractId:'ans03.browser.synthetic',contractVersion:1,
    channel:'synthetic_fixture',scope:'conversation',originClass:'fixture',namespace:'account-main',
    capabilities:{conversationIdentity:'verified',membership:'verified',move:'verified',
     projectName:'verified',rename:'verified',conversationDeletion:'verified'},
    rules:{
     conversationIdentity:{subject:'conversation',fields:['sourceStatus'],sourceStatus:['observed_active']},
     membership:{subject:'conversation',fields:['membership']},
     move:{subject:'conversation',fields:['membership']},
     projectName:{subject:'project',fields:['currentName']},
     rename:{subject:'project',fields:['currentName']},
     conversationDeletion:{subject:'conversation',fields:['sourceStatus'],sourceStatus:['confirmed_deleted']}
    }
   });
   const start=Date.parse(initial.lastObservedAt)+1000;
   const make=(capability,subject,observation,n)=>({
    schemaVersion:1,contractId:policy.contractId,contractVersion:1,providerKey:'chatgpt',
    capability,channel:policy.channel,scope:policy.scope,epoch:99,session:'ans03-browser-synthetic',
    generation:n,observedAt:new Date(start+n*1000).toISOString(),subject,observation
   });
   const conversation={kind:'conversation',conversationId:id};
   const A={namespace:'account-main',projectId:'browser-project-a'};
   const B={namespace:'account-main',projectId:'browser-project-b'};
   const apply=async dto=>structure.observeAdmitted(await admitSourceStructureDTO(dto,policy));
   await apply(make('membership',conversation,{membership:{state:'unassigned'}},1));
   await apply(make('membership',conversation,{membership:{state:'project',...A}},2));
   await apply(make('projectName',{kind:'project',...A,witnessConversationId:id},{currentName:'Browser A'},3));
   await apply(make('move',conversation,{membership:{state:'project',...B}},4));
   await apply(make('projectName',{kind:'project',...B,witnessConversationId:id},{currentName:'Browser B'},5));
   await apply(make('rename',{kind:'project',...B,witnessConversationId:id},{currentName:'Browser B Renamed'},6));
   await apply(make('conversationDeletion',conversation,{sourceStatus:'confirmed_deleted'},7));
   await apply(make('conversationIdentity',conversation,{sourceStatus:'observed_active'},8));
   const current=await structure.conversation(ref),project=await structure.project({providerKey:'chatgpt',...B});
   const history=await structure.history({kind:'conversation',conversationRef:ref});
   return {current,project,history:history.items};
  },b.id);
  assert.equal(synthetic.current.membership.projectRef.projectId,'browser-project-b');
  assert.equal(synthetic.current.sourceStatus,'observed_active');assert.equal(synthetic.current.relationshipRevision,5);
  assert.equal(synthetic.project.currentName,'Browser B Renamed');assert.equal(synthetic.project.relationshipRevision,2);
  assert.equal(synthetic.history.length,5);
  await h.restartWorker();await chat.reload();await pause(2600);
  const afterRestart=await sourceRow(archive,b.id);
  assert.equal(afterRestart.row.membership.state,'unassigned','plain route corrects synthetic Project membership after restart');
  assert.equal(afterRestart.row.lastKnownSourceProject.projectRef.projectId,'browser-project-b');
  assert.equal(afterRestart.row.relationshipRevision,6,'one effective Project → unassigned correction is recorded');
  assert.equal(afterRestart.history.length,6);

  await rpc(archive,'SET_ENABLED',{enabled:false});
  const c={id:'ans03-browser-paused',title:'ANS-03 Paused',base:1609479200,messages:[
   {id:'ans03-paused-message-001',text:'ANS03 paused source must not persist'}
  ]};
  await h.spa(chat,c);await pause(2600);
  assert.equal((await sourceRow(archive,c.id)).row,null,'paused capture cannot persist source metadata');
  assert.equal((await h.state()).records.some(r=>r.chatId===c.id),false);
  assert.equal(h.extensionNetworkRequests,0,'source observation adds no active extension request');
  assert.equal(h.externalRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
