import {instrumentedExtension} from './harness/ans-navigation-chrome.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
const rpc=async(page,type,fields={})=>{const r=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
async function settled(page,options){for(let i=0;i<1000;i++){const r=await rpc(page,'PAIA_ARCHIVE_NAV_PAGE',{page:options});assert.ok(r.items.length<=40);assert.ok(r.operations.metadataScanned<=100);assert.equal(r.operations.inputBodyReads,0);if(r.coverage.state==='complete')return r;assert.equal(r.coverage.state,'building');assert.deepEqual(r.items,[]);}assert.fail('Navigator did not complete');}
async function all(page,options){let p=await settled(page,options),out=[...p.items];while(p.nextCursor){p=await rpc(page,'PAIA_ARCHIVE_NAV_PAGE',{page:{...options,cursor:p.nextCursor}});assert.equal(p.cursorInvalid,false);assert.equal(p.coverage.state,'complete');out.push(...p.items);}return out;}
const worker=h=>h.context.serviceWorkers().find(w=>w.url().endsWith('/background/service-worker.js'));
async function guard(h){await worker(h).evaluate(()=>{globalThis.__ans04GuardEnabled=true;});}
async function restart(h,options){
 const url=worker(h).url();await worker(h).evaluate(()=>{globalThis.__ans04Lifetime=true;});
 const c=await h.context.newCDPSession(h.archive),versions=[];c.on('ServiceWorker.workerVersionUpdated',e=>versions.push(...e.versions.filter(v=>v.scriptURL===url)));
 try{await c.send('ServiceWorker.enable');await eventually(()=>versions.some(v=>v.runningStatus==='running'));const versionId=versions.at(-1).versionId;versions.length=0;await c.send('ServiceWorker.stopWorker',{versionId});await eventually(()=>versions.some(v=>v.runningStatus==='stopped'));await rpc(h.archive,'PAIA_ARCHIVE_NAV_STATUS',{page:options});await eventually(()=>versions.at(-1)?.runningStatus==='running');assert.equal(await worker(h).evaluate(()=>typeof globalThis.__ans04Lifetime),'undefined');}finally{await c.detach();}
}
test('ANS-04 real Chrome: cold bounded navigation, worker restart, lossless Reader fallback and active-path relocation',{timeout:240000},async()=>{
 const copy=await instrumentedExtension();let h;
 try{
  h=await FakeChatGPT.start({extensionPath:copy.path,headless:true});const p=h.archive;
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
  await eventually(async()=>(await rpc(p,'GET_STATUS')).consented,'ANS04 consent');
  const skip=p.locator('#onboarding-skip');if(await skip.isVisible().catch(()=>false))await skip.click();
  const chatId='ans04-browser-real',chat=await h.open({id:chatId,title:'ANS-04 Reader',base:1609459200,messages:[{id:'ans04-browser-input',text:'ANS04_REAL_INPUT_BODY'}]});
  let doc;
  await eventually(async()=>{const page=await rpc(p,'GET_PAGE',{page:{view:'library'}});doc=page.documents.find(d=>d.sourceConversationId===chatId);return !!doc?.lastSourceSentAt;},'real capture + time enrichment');
  await p.bringToFront();await eventually(()=>p.locator('.conversation-document').isVisible());await p.locator('.conversation-document').first().click();
  await eventually(()=>p.locator('#input-time-toggle').isVisible(),'existing Reader opens');
  assert.match(await p.locator('.library-prose').first().textContent(),/ANS04_REAL_INPUT_BODY/);await chat.close();
  const expected=await p.evaluate(async realId=>{
   const {OrganizerStore}=await import('../core/organizer/store.js');const s=new OrganizerStore(chrome.storage.local);await s.finishFoundation();
   const sequence=await s.repository.transaction(false,t=>t.get('meta','sequence'));
   const real=await s.repository.transaction(false,t=>t.get('documents',realId));const keys=[{id:realId,key:real.libraryDisplay}];
   for(let start=0;start<1000;start+=100)await s.write(async t=>{
    for(let i=start;i<start+100;i++){
     const id='ans04-browser-doc-'+String(i).padStart(6,'0'),sourceConversationId='ans04-browser-chat-'+i,key=[-(1609459200000+i%13),id];
     const value={id,platform:'chatgpt',sourceConversationId,userTitle:'User '+i,originalConversationTitle:'Synthetic '+i,status:'active',titleRevision:0,firstSourceSentAt:null,lastSourceSentAt:null};
     await t.put('documents',{id,sequence:sequence.documents+i+1,chatKey:'chatgpt:'+sourceConversationId,displayKey:key,libraryDisplay:key,value});await t.put('libraryDocuments',{id,value});keys.push({id,key});
    }
   });
   await s.write(t=>t.put('meta',{...sequence,documents:sequence.documents+1001}));
   return keys.sort((a,b)=>a.key[0]-b.key[0]||(a.id<b.id?-1:a.id>b.id?1:0)).map(x=>x.id);
  },doc.id);
  await guard(h);const options={providerKey:'chatgpt',groupKind:'unknown',selectedDocumentId:doc.id};
  const coldStart=performance.now(),cold=await rpc(p,'PAIA_ARCHIVE_NAV_PAGE',{page:options}),coldMs=performance.now()-coldStart;
  assert.equal(cold.coverage.state,'building');assert.deepEqual(cold.items,[]);assert.equal(cold.selectedPath.documentId,doc.id);assert.ok(coldMs<=1500);
  await rpc(p,'PAIA_ARCHIVE_NAV_PAGE',{page:options});
  const partial=await rpc(p,'PAIA_ARCHIVE_NAV_STATUS',{page:options});assert.equal(partial.coverage.state,'building');assert.equal(partial.selectedPath.available,true);
  const reader=await rpc(p,'GET_PAGE',{page:{view:'library',documentId:doc.id,limit:40}});assert.equal(reader.library.blocks.length,1);assert.equal(reader.records[0].originalText,'ANS04_REAL_INPUT_BODY');
  const beforeRestart=await worker(h).evaluate(()=>globalThis.__ans04Nav);assert.equal(beforeRestart.bodyReads,0);assert.equal(beforeRestart.fullScans,0);assert.equal(beforeRestart.snapshots,0);assert.equal(beforeRestart.maxBatch,100);
  await restart(h,options);await guard(h);
  const windows=await all(p,options);assert.deepEqual(windows.map(w=>w.documentId),expected);assert.equal(new Set(windows.map(w=>w.documentId)).size,1001);assert.doesNotMatch(JSON.stringify(windows),/ANS04_REAL_INPUT_BODY/);
  const samples=[];for(let i=0;i<30;i++){const at=performance.now();await rpc(p,'PAIA_ARCHIVE_NAV_PAGE',{page:options});samples.push(performance.now()-at);}samples.sort((a,b)=>a-b);const p95=samples[28];assert.ok(p95<=500,`warm p95 ${p95}ms`);
  const first=await settled(p,options);assert.ok(first.nextCursor);
  const projectRef=await p.evaluate(async({documentId,chatId})=>{
   const {OrganizerStore}=await import('../core/organizer/store.js');const {SourceStructureStore}=await import('../core/source-structure-store.js');
   const s=new OrganizerStore(chrome.storage.local),structure=new SourceStructureStore(s),ref={platform:'chatgpt',sourceConversationId:chatId};
   await s.updateDocument(documentId,{userTitle:'Browser user title'});
   const current=await structure.conversation(ref),start=Math.max(Date.now(),Date.parse(current?.lastObservedAt||'')||0)+1000;
   const projectRef={providerKey:'chatgpt',namespace:'synthetic-ans04',projectId:'browser-project'};
   const evidence=n=>({id:'ans04-browser-evidence-'+n,contractId:'ans04.synthetic',contractVersion:1,channel:'synthetic_fixture',scope:'conversation',originClass:'fixture',requestGeneration:n,evidenceKind:'relationship',digest:n.toString(16).padStart(64,'0')});
   await structure.observeConversation({conversationRef:ref,expectedRevision:current?.relationshipRevision||0,observedAt:new Date(start).toISOString(),evidence:evidence(1),membership:{state:'project',projectRef},projectName:'Synthetic Project',sourceStatus:'observed_active'});
   await structure.observeProject({projectRef,expectedRevision:0,observedAt:new Date(start+1000).toISOString(),evidence:evidence(2),currentName:'Synthetic Project',sourceStatus:'observed_active'});
   return projectRef;
  },{documentId:doc.id,chatId});
  const relocated=await settled(p,{providerKey:'chatgpt',groupKind:'project',projectRef,selectedDocumentId:doc.id});
  assert.equal(relocated.items.length,1);assert.equal(relocated.items[0].title,'Browser user title');assert.deepEqual(relocated.selectedPath.projectRef,projectRef);
  const invalid=await settled(p,{...options,cursor:first.nextCursor});assert.equal(invalid.cursorInvalid,true);assert.deepEqual(invalid.items,[]);
  assert.equal((await all(p,options)).length,1000);
  assert.match(await p.locator('.library-prose').first().textContent(),/ANS04_REAL_INPUT_BODY/);
  assert.equal(await p.locator('#input-time-toggle').isVisible(),true);
  const metrics=await worker(h).evaluate(()=>globalThis.__ans04Nav);
  assert.equal(metrics.bodyReads,0);assert.equal(metrics.fullScans,0);assert.equal(metrics.snapshots,0);assert.equal(metrics.maxBatch,100);
  console.log('ANS04_CHROME_RESOURCE_EVIDENCE '+JSON.stringify({windows:1001,coldMs,warmSamples:30,p95Ms:p95,...metrics}));
  await mkdir('work/ans-04-navigation-query',{recursive:true});
  await p.screenshot({path:'work/ans-04-navigation-query/reader-after-index.png',fullPage:true});
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
 }finally{if(h)await h.close();await copy.cleanup();}
});
