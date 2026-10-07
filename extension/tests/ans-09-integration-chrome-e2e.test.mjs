import {historicalBackupItems} from './harness/historical-backup-browser.mjs';
import {admitPreGatePurgeBrowserFixture} from './harness/pre-gate-purge-browser-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {failWorkingInputCommits} from './harness/working-input-failure.mjs';
import {openArchiveWindow} from './harness/archive-navigator.mjs';
import {legacy,digest} from './harness/ans09-legacy.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(m=>chrome.runtime.sendMessage(m),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const immutable=items=>items.filter(x=>x.type==='item'&&['sources','deletionFences'].includes(x.section)).sort((a,b)=>(a.section+a.value.id).localeCompare(b.section+b.value.id));
async function backup(p){
 // UI-driven local maintenance may legitimately invalidate an export. Take the
 // comparison snapshot only once actual post-restore/purge writes have settled;
 // never retry a failed export or accept a partial chain.
 await p.evaluate(async()=>{const {OrganizerStore}=await import('../core/organizer/store.js');const s=new OrganizerStore(chrome.storage.local);await s.drainPurgeCleanup();await s.drainInvalidations();await s.drainLibraryMaintenance();});
 let prior=null,stable=0;await eventually(async()=>{const generation=await p.evaluate(async()=>{const {OrganizerStore}=await import('../core/organizer/store.js');const s=new OrganizerStore(chrome.storage.local);return s.repository.transaction(false,async t=>(await t.get('meta','backup-data-generation'))?.value||0,['meta']);});stable=generation===prior?stable+1:0;prior=generation;return stable>=3;},'durable backup generation settles');
 return historicalBackupItems(p);}
async function restore(p,items){const {sessionId}=await rpc(p,'PAIA_BACKUP_BEGIN_RESTORE');for(let i=0;i<items.length;i+=30)await rpc(p,'PAIA_BACKUP_STAGE',{options:{sessionId,items:items.slice(i,i+30)}});const preview=await rpc(p,'PAIA_BACKUP_PREVIEW',{options:{sessionId}});assert.equal(preview.canRestore,true);return rpc(p,'PAIA_BACKUP_RESTORE',{options:{sessionId,confirmation:preview.integrity}});}
async function ready(h){const p=h.archive;await p.locator('#consent-check').check();await p.locator('#enable-consent').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented===true);if(await p.locator('#onboarding-skip').isVisible().catch(()=>false))await p.locator('#onboarding-skip').click();return p;}
async function relation(p,n,fields){return p.evaluate(async({n,fields})=>{const {OrganizerStore}=await import('../core/organizer/store.js'),{SourceStructureStore}=await import('../core/source-structure-store.js'),s=new OrganizerStore(chrome.storage.local),ss=new SourceStructureStore(s),conversationRef={platform:'chatgpt',sourceConversationId:'complete-synthetic'},current=await ss.conversation(conversationRef);await ss.observeConversation({conversationRef,expectedRevision:current?.relationshipRevision||0,observedAt:new Date(Date.UTC(2026,8,21,0,n)).toISOString(),evidence:{id:'ans09-browser-'+n,contractId:'ans09.synthetic',contractVersion:1,channel:'synthetic',scope:'conversation',originClass:'fixture',requestGeneration:n,evidenceKind:'relationship',digest:n.toString(16).padStart(64,'0')},...fields});document.dispatchEvent(new Event('paia:navigator-refresh'));return ss.conversation(conversationRef);},{n,fields});}

for(const artifact of ['source','release'])test(`ANS-09 ${artifact}: legacy Backup, multi-tab unsaved edit, metadata move/delete, restart, Topic and purge retain trust`,{timeout:240000},async()=>{
 let h,temp;
 try{
  // A fresh CI shard and this file alone must exercise an actual current package.
  // Keep its build isolated from other browser suites and existing runtime paths.
  let extensionPath;
  if(artifact==='release'){
   temp=await mkdtemp(join(tmpdir(),'paia-ans09-release-'));extensionPath=join(temp,'release');
   execFileSync('python3',[join(root,'scripts/build_current_release.py'),extensionPath],{cwd:root,stdio:'pipe'});
  }
  h=await FakeChatGPT.start(extensionPath?{extensionPath}:{});
  const p=await ready(h),report={artifact,baseline:legacy.baseline,fixture:'legacy-38804b9'};
  await p.setViewportSize({width:1440,height:900});await restore(p,legacy.backup);await p.reload();
  await eventually(async()=>await p.locator('#archive-navigator').isVisible(),'legacy archive opens');
  await p.evaluate(async()=>{const {OrganizerStore}=await import('../core/organizer/store.js');const s=new OrganizerStore(chrome.storage.local);await s.drainLibraryMaintenance();});
  const initial=await backup(p);assert.deepEqual(immutable(initial),immutable(legacy.backup));report.sourceDigest=digest(immutable(initial));
  assert.equal((await rpc(p,'PAIA_ARCHIVE_ORDER_PREFERENCE')).mode,'paia');
  const second=await h.context.newPage();second.on('pageerror',e=>h.errors.push(e.message));await second.goto(p.url());
  await p.locator('#primary-nav [data-view="library"]').click();await openArchiveWindow(p,{text:'虚构验收'});
  const field=p.locator('[data-edit-id="'+legacy.firstInputId+'"]');await field.waitFor({state:'visible'});assert.equal(await field.textContent(),'ANS09 human working text');
  const resumeSave=await failWorkingInputCommits(h);
  await field.fill('ANS09 unsaved surviving project move');await eventually(async()=>(await p.locator('#error').textContent()).includes('尚未保存'),'save failure acknowledged');
  const projectRef={providerKey:'chatgpt',namespace:'ans09-browser',projectId:'ans09-project'};
  await relation(second,1,{membership:{state:'project',projectRef},projectName:'ANS09 Project',sourceStatus:'observed_active'});await p.evaluate(()=>document.dispatchEvent(new Event('paia:navigator-refresh')));
  assert.equal(await field.textContent(),'ANS09 unsaved surviving project move');assert.equal((await rpc(p,'GET_INPUT',{id:legacy.firstInputId})).libraryText,'ANS09 human working text','failed save did not commit');
  await relation(second,2,{sourceStatus:'confirmed_deleted'});await p.evaluate(()=>document.dispatchEvent(new Event('paia:navigator-refresh')));
  assert.equal(await field.textContent(),'ANS09 unsaved surviving project move');assert.deepEqual(immutable(await backup(second)),immutable(initial));
  await resumeSave();await p.locator('#retry').click();await eventually(async()=>(await rpc(p,'GET_INPUT',{id:legacy.firstInputId})).libraryText==='ANS09 unsaved surviving project move','explicit retry commits exact buffer');
  // Reload restores the selected Window asynchronously. Require that real
  // restoration rather than racing it with a second navigation fallback.
  await h.restartWorker();await p.reload();await field.waitFor({state:'visible'});assert.equal(await field.textContent(),'ANS09 unsaved surviving project move');
  assert.deepEqual(immutable(await backup(p)),immutable(initial));
  const denied=await p.evaluate(()=>chrome.runtime.sendMessage({type:'OBSERVE_SOURCE_STRUCTURE',observation:{}}));assert.equal(denied.ok,false,'UI cannot forge capture-authority observations');
  const detail=await rpc(p,'PAIA_ARCHIVE_SOURCE_DETAIL',{subject:{kind:'conversation',conversationRef:{platform:'chatgpt',sourceConversationId:'complete-synthetic'}}});assert.equal(detail.current.sourceStatus,'confirmed_deleted');assert.equal(detail.history.length,2);
  for(const [width,height]of [[1440,900],[1200,800],[1024,768],[800,700],[390,844],[320,720]]){await p.setViewportSize({width,height});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'no horizontal overflow at '+width);}
  await p.setViewportSize({width:1440,height:900});await mkdir('work/ans-09',{recursive:true});await p.screenshot({path:`work/ans-09/${artifact}-legacy-reader.png`,fullPage:false});
  await p.locator('#primary-nav [data-view="thoughts"]').click();const topic=legacy.backup.find(x=>x.section==='topics').value;
  await eventually(()=>p.locator('.personal-topic-link[data-topic-id="'+topic.id+'"]').isVisible(),'legacy Topic visible');await p.locator('.personal-topic-link[data-topic-id="'+topic.id+'"]').click();await eventually(async()=>await p.locator('#topic-body [data-entry-id]').count()>0,'continuous Topic opens');
  const ids=await p.locator('#topic-body [data-entry-id]').evaluateAll(nodes=>nodes.map(x=>x.dataset.entryId));assert.equal(new Set(ids).size,ids.length);assert.ok(ids.length<=120);await p.screenshot({path:`work/ans-09/${artifact}-legacy-topic.png`,fullPage:false});
  const purgeEvidence=[];for(const source of initial.filter(x=>x.section==='sources'))purgeEvidence.push(await admitPreGatePurgeBrowserFixture(second,source.value.id,{allowCurrentPure:true}));
  const purged=await backup(second);assert.doesNotMatch(JSON.stringify(purged),/ANS09 Project|ans09-project|ANS09 legacy immutable source|ANS09 repeated exact expression/);
  const retained=await rpc(second,'GET_LIBRARY_ENTRY',{id:legacy.independentEntryId});assert.equal(retained.body,'ANS09 wholly new human thought');
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
  Object.assign(report,{legacyRestore:true,multiTabSaveFailure:true,metadataMoveDelete:true,restart:true,purgeEvidence,retainedHumanBody:true,externalRequests:0,extensionRequests:0,aiRequests:0});await writeFile(`work/ans-09/${artifact}-integration.json`,JSON.stringify(report,null,2));
 }finally{if(h)await h.close();if(temp)await rm(temp,{recursive:true,force:true});}
});
