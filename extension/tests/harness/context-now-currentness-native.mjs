// Native qualification of explicit Now currentness, continued from preserved
// checkpoint5b20b26c on the existing UI integration candidate.
// Run from extension/, or set PAIA_EXTENSION_ROOT. PAIA_NOW_RELEASE_PATH may
// identify the single frozen release built by the parent batch. No live account,
// paid processor, fake deadline projection, Date override or timer injection.
// The explicit verifier below is the existing CTX4-05 SYNTHETIC native verifier;
// it is not evidence of production processing entitlement.
import test,{after} from 'node:test';
import {matchesCurrentContextSnapshot} from './context-snapshot-poll.mjs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {admitPreGatePurgeBrowserFixture} from './pre-gate-purge-browser-fixture.mjs';
import {startNavigatorSourceFixture,awaitNavigatorSourceCompletion} from './navigator-source-completion.mjs';

const root=resolve(process.env.PAIA_EXTENSION_ROOT||fileURLToPath(new URL('../../',import.meta.url)));
const {FakeChatGPT,eventually}=await import(pathToFileURL(join(root,'tests/harness/fake-chatgpt.mjs')));
const CHECKPOINT='5b20b26ce5c9e153bea4496c932d8a865b22149e';
const BODY='SYNTHETIC automatic Now 👩🏽‍💻 é\n不要发送；只在本阶段成立。';
const HUMAN='SYNTHETIC human Now draft 👩🏽‍💻 é\n保留否定、换行和全部文字。';
const EXPIRY_MS=8000; // Explicit synthetic evidence, never a product default TTL.
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(m=>chrome.runtime.sendMessage(m),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const read=p=>rpc(p,'PAIA_CONTEXT_CARDS_SNAPSHOT');
const item=(p,id)=>p.locator('.context-item[data-item="'+id+'"]');
const field=(p,id)=>item(p,id).locator('.item-text');
const warning=(p,id)=>item(p,id).locator('.item-temporal');
const deadlinePassed=(p,at)=>eventually(()=>p.evaluate(at=>Date.now()>=at,at),'the real browser clock reaches the explicit evidence deadline');
const stable=p=>eventually(()=>p.evaluate(()=>history.state?.paiaReader?.view==='memory'&&history.state.paiaReader.contextCard==='now'&&document.querySelector('.workspace')?.dataset.state==='ready'&&document.querySelector('.context-page')?.inert===false),'original Now route is admitted and ready');
async function openNow(p){await p.locator('.sidebar [data-view="memory"]').click();await p.locator('.context-card[data-card="now"] .card-link').click();await stable(p);}
const protectedOwners=p=>p.evaluate(()=>__nowNative.protectedOwners());
const canonical=p=>p.evaluate(()=>__nowNative.canonical());
const privateGrants=p=>p.evaluate(()=>__nowNative.grants());
function offline(h){assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.equal(h.historyRequests,0);assert.deepEqual(h.errors,[]);}

let ownedRelease=null,releasePromise=null;
after(async()=>{if(ownedRelease)await rm(ownedRelease,{recursive:true,force:true});});
const releasePath=()=>process.env.PAIA_NOW_RELEASE_PATH?Promise.resolve(process.env.PAIA_NOW_RELEASE_PATH):(releasePromise??=(async()=>{ownedRelease=await mkdtemp(join(tmpdir(),'paia-now-native-'));execFileSync('python3',['scripts/build_current_release.py',ownedRelease],{cwd:root,stdio:'pipe'});return ownedRelease;})());
async function fixture(t,variant,{neighbor=false,qualifyCapture=false}={}){
 const extensionPath=variant==='source'?root:await releasePath();
 const captureFixture=qualifyCapture?await startNavigatorSourceFixture({extensionPath,launchThroughPort:true}):null;
 const h=captureFixture?.harness||await FakeChatGPT.start({extensionPath,headless:true,launchThroughPort:true}),p=h.archive;
 const dir=join(root,'work/context-now-currentness-native',variant,t.name.replace(/[^a-zA-Z0-9-]+/g,'-'));
 t.after(async()=>{try{await p.evaluate(()=>{globalThis.__nowRelease?.();globalThis.__nowRestoreTransport?.();return globalThis.__nowNative?.close();});}catch{}
  if(captureFixture)await captureFixture.close();else await h.close();});
 if(captureFixture){const start=p.locator('#onboarding-start');if(await start.count()&&await start.isVisible())await start.click();await p.locator('#enable-consent').waitFor({state:'visible'});}
 await p.setViewportSize({width:1280,height:900});await p.locator('#enable-consent').click();
 await eventually(async()=>(await rpc(p,'GET_STATUS')).consented===true,'actual explicit consent settles');
 await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN'}});
 const capture=await h.open({id:'synthetic-now-native',title:'SYNTHETIC Now evidence only',base:1609459200,messages:[
  {id:'now-qualified-user',text:'SYNTHETIC immutable user Source 👩🏽‍💻\n不采集 assistant。'},
  {id:'now-unrelated-user',text:'SYNTHETIC unrelated user Source remains exact.'}
 ]},{arrival:'dom-first'});
 await eventually(async()=>(await h.state()).records.length===2,'all and only two user Sources captured');await capture.close();
 // A saved Source is not completion of its optional queue writes. Use the
 // existing original-worker completion barrier before freezing filter mode;
 // off correctly preserves pending work and cannot drain it for the oracle.
 const captureCompletion=captureFixture?await awaitNavigatorSourceCompletion(captureFixture):null;
 const seed=await p.evaluate(async({body,neighbor,expiryMs,qualifyCapture})=>{
  const [{OrganizerStore},{ContextMaintenanceService},{ContextCardsService,CONTEXT_CARDS_ROW},{ContextReadService},{readContextTopicScope},{inputProjection},{hashText}]=await Promise.all([
   import(chrome.runtime.getURL('core/organizer/store.js')),import(chrome.runtime.getURL('core/context-maintenance.js')),
   import(chrome.runtime.getURL('core/context-cards.js')),import(chrome.runtime.getURL('core/context-read.js')),
   import(chrome.runtime.getURL('core/context-topic-scope.js')),import(chrome.runtime.getURL('core/thought-evidence.js')),import(chrome.runtime.getURL('core/dedupe.js'))
  ]);
  // Import fails truthfully if the checkpoint has not been restored. Do not seed
  // maintenance.temporal by a meta put or substitute the projection function.
  await import(chrome.runtime.getURL('core/context-temporal.js'));
  if(!(indexedDB instanceof IDBFactory)||!/\[native code\]/.test(IDBFactory.prototype.open.toString())||!(crypto.subtle instanceof SubtleCrypto)||!/\[native code\]/.test(SubtleCrypto.prototype.digest.toString()))throw Error('Native IndexedDB/WebCrypto required');
  const s=new OrganizerStore(chrome.storage.local),op=()=>crypto.randomUUID();await s.finishFoundation();
  if(qualifyCapture){const filter=await s.filterStatus();if(filter.mode!=='light'||filter.pending!==0||filter.taskState!=='idle')throw Error('NOW_CAPTURE_FILTER_NOT_SETTLED');}
  await s.setFilterMode('off');
  const snapshot=await s.snapshot(),source=snapshot.records.find(r=>r.sourceMessageId==='now-qualified-user'),unrelated=snapshot.records.find(r=>r.sourceMessageId==='now-unrelated-user');
  if(!source||!unrelated)throw Error('Actual captured Source identities missing');
  const input=snapshot.library.blocks.find(b=>b.originalTextReference===source.id);if(!input)throw Error('Canonical Input missing');
  const topic=await s.createTopic({operationId:op(),name:'SYNTHETIC qualified Now Topic'});
  const added=await s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[topic.id]});if(added.conflict)throw Error('Real Input placement refused');
  const humanThought=await s.continueThinking({operationId:op(),body:'SYNTHETIC unrelated protected independent Thought',topicId:topic.id});await s.finishFoundation();
  const scope=await readContextTopicScope(s,{topicId:topic.id});if(!scope.available)throw Error('Original processing scope unavailable: '+scope.reason);
  const projected=await s.repository.transaction(false,t=>inputProjection(s,t,input.id));
  const caller=Object.freeze({handle:op()}),revocation=new AbortController(),authorizationExpiresAt=Date.now()+600000;
  const verifier={async verify(actual,store,processingScope){return actual===caller&&store===s?{version:1,store:s,accountId:'synthetic-native-account',processorId:'synthetic-native-processor',authorizationGeneration:1,scope:processingScope,processing:true,expiresAt:authorizationExpiresAt,revocationSignal:revocation.signal}:null;},isCurrent:(actual,receipt,store)=>actual===caller&&store===s&&receipt.authorizationGeneration===1};
  const service=new ContextMaintenanceService(s,{processingVerifier:verifier}),cards=new ContextCardsService(s),validUntil=new Date(Date.now()+expiryMs).toISOString();
  const change={operationId:op(),epoch:scope.binding.epoch,itemId:op(),card:'now',expectedRevision:0,body,section:'SYNTHETIC explicit phase',associationIds:[op()],evidence:[{topicId:topic.id,inputId:input.id,selectedFields:['body'],fieldDigests:{body:await hashText(projected.body)},expectedTopicBinding:scope.binding,expectedRemovalSequence:projected.lastRemovalSequence}],temporal:{temporalScope:'SYNTHETIC only this explicitly stated phase',uncertainty:'SYNTHETIC conditional statement, not a permanent fact',validUntil}};
  const result=await service.maintain(caller,change);if(!result.ok||result.revision!==1)throw Error('Original Maintenance seed refused');
  if(neighbor)await cards.change({kind:'put',operationId:op(),epoch:change.epoch,itemId:op(),card:'now',expectedRevision:0,body:'SYNTHETIC manual neighbor',section:change.section});
  const receipt=await s.repository.transaction(false,t=>t.get('operationReceipts','context-maintenance:'+change.operationId));
  if(receipt.digest!==await hashText(JSON.stringify(change))||JSON.stringify(receipt).includes(body))throw Error('Original digest/receipt boundary changed');
  const names=['records','blocks','inputStates','thoughts','topics','sections','placements','dependencies','provenance','tombstones','revisions'];
  const protectedOwners=()=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(names.map(async name=>[name,await t.all(name)]))));
  const canonical=()=>s.repository.transaction(false,t=>t.get('meta',CONTEXT_CARDS_ROW));
  const readerCaller=Object.freeze({handle:op()}),reader=new ContextReadService(s,{connectionVerifier:{async verify(actual,store){return actual===readerCaller&&store===s?{version:1,store:s,connectionId:'synthetic-native-connection',accountId:'synthetic-native-account',authorizationGeneration:1,readable:true,online:true,expiresAt:authorizationExpiresAt}:null;},isCurrent:(actual,receipt,store)=>actual===readerCaller&&store===s}});
  globalThis.__nowNative={s,service,cards,caller,change,sourceId:source.id,unrelated,canonical,protectedOwners,
   async grants(){const snap=await cards.snapshot();return {access:snap.access,capabilities:snap.capabilities,connections:snap.connections};},
   async denyRead(){return reader.shallow(readerCaller);},
   async refuseOverwrite(){const current=(await canonical()).items.find(x=>x.id===change.itemId);return service.maintain(caller,{...change,operationId:op(),card:current.card,expectedRevision:current.revision,body:'SYNTHETIC forbidden automatic overwrite'});},
   close:()=>s.repository.close()};
  return {id:change.itemId,epoch:change.epoch,sourceId:source.id,unrelatedId:unrelated.id,humanThoughtId:humanThought.id,deadline:Date.parse(validUntil),temporal:change.temporal,body,revision:1};
 },{body:BODY,neighbor,expiryMs:EXPIRY_MS,qualifyCapture});
 await p.bringToFront();
 await openNow(p);
 await field(p,seed.id).waitFor();assert.equal(await field(p,seed.id).innerText(),BODY);
 assert.ok(await p.evaluate(at=>Date.now()<at,seed.deadline),'the actual UI must become ready BEFORE the real deadline; no past-deadline false positive');
 const rights=await privateGrants(p);assert.equal(rights.access.global.enabled,false);assert.equal(rights.access.now.enabled,false);assert.equal(rights.capabilities.external,false);assert.equal(rights.connections,0);
 const before=await protectedOwners(p);assert.equal((await p.evaluate(()=>__nowNative.denyRead())).available,false,'time metadata cannot bypass the original closed read gate');
 async function finish(){assert.deepEqual(await protectedOwners(p),before,'Source/Working/Thought/placement/history bytes are preserved');assert.deepEqual(await privateGrants(p),rights,'deadline and UI do not grant access or attach a connection');offline(h);}
 async function evidence(name,details={}){await mkdir(dir,{recursive:true});await p.screenshot({path:join(dir,name+'.png')});await writeFile(join(dir,name+'.json'),JSON.stringify({checkpoint:CHECKPOINT,variant,id:seed.id,deadline:seed.deadline,actualBrowserNow:await p.evaluate(()=>Date.now()),network:{external:h.externalRequests,provider:h.deepSeekRequests.length,extension:h.extensionNetworkRequests},verified:true,...(captureFixture?{captureCompletion,captureBinding:captureFixture.binding,maintenance:await p.evaluate(()=>globalThis.__preGateFixtureTrace||[])}:{}),...details,scope:'This component receipt is not whole-programme, installation or owner visual acceptance.'},null,2));}
 return {h,p,seed,before,rights,finish,evidence};
}

for(const variant of ['source','release']){
 test('Now real deadline is a same-revision read-only native status '+variant,{timeout:60000},async t=>{
  const f=await fixture(t,variant,{neighbor:true}),{p,seed}=f,initial=await canonical(p);
  assert.equal((await read(p)).items.find(x=>x.id===seed.id).temporalStatus,'not_expired');assert.equal(await warning(p,seed.id).isHidden(),true);
  await field(p,seed.id).focus();await p.keyboard.press('Home');await p.keyboard.down('Shift');await p.keyboard.press('ArrowRight');await p.keyboard.up('Shift');
  const selected=await field(p,seed.id).evaluate(node=>{globalThis.__nowField=node;const s=getSelection();globalThis.__nowSelection={anchorNode:s.anchorNode,focusNode:s.focusNode,anchorOffset:s.anchorOffset,focusOffset:s.focusOffset};return s.toString();});assert.ok(selected.length>0);
  await deadlinePassed(p,seed.deadline);await warning(p,seed.id).waitFor({state:'visible'});assert.equal(await warning(p,seed.id).innerText(),'有效期已过，请核对。');
  assert.equal(await field(p,seed.id).evaluate((node,text)=>{const s=getSelection(),saved=__nowSelection;return node===__nowField&&document.activeElement===node&&s.toString()===text&&s.anchorNode===saved.anchorNode&&s.focusNode===saved.focusNode&&s.anchorOffset===saved.anchorOffset&&s.focusOffset===saved.focusOffset;},selected),true);
  assert.equal(await field(p,seed.id).innerText(),BODY);assert.deepEqual(await canonical(p),initial,'clock changes no canonical row, order, revision, temporal evidence or receipt');
  const snapshot=await read(p),row=snapshot.items.find(x=>x.id===seed.id);assert.equal(row.temporalStatus,'expired');assert.equal(row.revision,1);assert.deepEqual(row.temporal,seed.temporal);assert.equal(row.body,BODY);
  const manual=snapshot.items.find(x=>x.id!==seed.id&&x.card==='now');assert.ok(manual);assert.equal(manual.origin,'manual');assert.equal(manual.protected,true);assert.equal(Object.hasOwn(manual,'temporalStatus'),false);assert.equal(await warning(p,manual.id).isHidden(),true,'source-free human content never inherits an automatic deadline');
  await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'en'}});await eventually(()=>warning(p,seed.id).innerText().then(text=>text==='Validity period ended. Review this item.'),'same-revision locale refresh translates only temporal chrome');assert.equal(await field(p,seed.id).evaluate(node=>node===__nowField),true);assert.equal(await field(p,seed.id).innerText(),BODY);assert.deepEqual(await canonical(p),initial);
  await p.setViewportSize({width:320,height:844});await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'the actual English expiry footer fits a narrow viewport');const bounds=await warning(p,seed.id).boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=321&&bounds.height>0,'native narrow expiry chrome stays inside the existing reader');assert.equal(await field(p,seed.id).innerText(),BODY);await f.evidence('expired-en-dark-320');
  await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'zh-CN'}});await eventually(()=>warning(p,seed.id).innerText().then(text=>text==='有效期已过，请核对。'));
  const home=await rpc(p,'PAIA_CONTEXT_CARDS_SNAPSHOT',{mode:'home'});assert.deepEqual(home.items,[]);assert.equal(JSON.stringify(home).includes(BODY),false);assert.equal(JSON.stringify(home).includes(seed.temporal.temporalScope),false);
  await f.finish();await f.evidence('expired');
 });

 for(const mode of ['pending-native-draft','ime'])test('Now expiry cannot overwrite '+mode+' or steal its native owner '+variant,{timeout:60000},async t=>{
  const f=await fixture(t,variant),{p,seed}=f;
  if(mode==='pending-native-draft')await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);let armed=true;globalThis.__nowSaveHeld=false;globalThis.__nowSaveCalls=0;globalThis.__nowRestoreTransport=()=>{chrome.runtime.sendMessage=send;};chrome.runtime.sendMessage=(message,...args)=>{if(message.type==='PAIA_CONTEXT_CARDS_CHANGE'&&message.change?.kind==='put'){__nowSaveCalls++;if(armed){armed=false;__nowSaveHeld=true;return new Promise(resolve=>{globalThis.__nowRelease=()=>resolve(send(message,...args));});}}return send(message,...args);};});
  await field(p,seed.id).focus();await field(p,seed.id).evaluate(node=>globalThis.__nowField=node);
  if(mode==='ime')await field(p,seed.id).dispatchEvent('compositionstart');
  await field(p,seed.id).fill(HUMAN);await field(p,seed.id).press('Control+Enter');
  if(mode==='pending-native-draft')await eventually(()=>p.evaluate(()=>__nowSaveHeld),'hold the single original native save before its worker dispatch');
  else assert.equal((await read(p)).items.find(x=>x.id===seed.id).body,BODY,'IME shortcut cannot save incomplete composition');
  await deadlinePassed(p,seed.deadline);assert.equal(await warning(p,seed.id).isHidden(),true);assert.equal(await field(p,seed.id).innerText(),HUMAN);
  assert.equal(await field(p,seed.id).evaluate(node=>node===__nowField&&document.activeElement===node),true);assert.equal((await read(p)).items.find(x=>x.id===seed.id).body,BODY);
  if(mode==='ime'){await field(p,seed.id).press('Control+Enter');assert.equal((await read(p)).items.find(x=>x.id===seed.id).body,BODY);await field(p,seed.id).dispatchEvent('compositionend');await field(p,seed.id).press('Control+Enter');}
  else await p.evaluate(()=>__nowRelease());
  await eventually(()=>matchesCurrentContextSnapshot(message=>p.evaluate(m=>chrome.runtime.sendMessage(m),message),snapshot=>snapshot.items.find(x=>x.id===seed.id)?.body===HUMAN),'the actual original save acknowledges full human text');
  const saved=(await read(p)).items.find(x=>x.id===seed.id);assert.equal(saved.protected,true);assert.equal(saved.userEdited,true);assert.equal(saved.temporalStatus,'unknown');assert.deepEqual(saved.temporal,seed.temporal);
  assert.equal(await field(p,seed.id).evaluate(node=>node===__nowField),true);assert.equal(await warning(p,seed.id).isHidden(),true);
  if(mode==='pending-native-draft')assert.equal(await p.evaluate(()=>__nowSaveCalls),1,'deadline does not introduce another save/retry owner');
  await item(p,seed.id).locator('.item-menu summary').click();await item(p,seed.id).getByRole('button',{name:'撤销上次修改',exact:true}).click();
  await eventually(()=>matchesCurrentContextSnapshot(message=>p.evaluate(m=>chrome.runtime.sendMessage(m),message),snapshot=>snapshot.items.find(x=>x.id===seed.id)?.body===BODY),'original human Undo restores the exact automatic text');
  const undone=(await read(p)).items.find(x=>x.id===seed.id);assert.equal(undone.protected,true);assert.equal(undone.temporalStatus,'unknown','human Undo never restores automatic authority');assert.equal(await warning(p,seed.id).isHidden(),true);
  await f.finish();await f.evidence(mode);
 });

 for(const gesture of ['move','reorder'])test('Now explicit '+gesture+' protects temporal provenance without automatic expiry '+variant,{timeout:60000},async t=>{
  const f=await fixture(t,variant,{neighbor:gesture==='reorder'}),{p,seed}=f;
  await item(p,seed.id).locator('.item-menu summary').click();
  if(gesture==='move'){const confirmation=p.waitForEvent('dialog');const clicked=item(p,seed.id).locator('[data-move-target="info"]').click();const dialog=await confirmation;assert.equal(dialog.type(),'confirm');assert.match(dialog.message(),/不会更改任何开放设置/);await dialog.accept();await clicked;}
  else await item(p,seed.id).getByRole('button',{name:'下移',exact:true}).click();
  await eventually(async()=>(await read(p)).items.find(x=>x.id===seed.id)?.protected===true,'actual native gesture commits human protection');
  const before=await canonical(p);await deadlinePassed(p,seed.deadline);const row=(await read(p)).items.find(x=>x.id===seed.id);
  assert.equal(row.protected,true);assert.equal(row.userEdited,true);assert.equal(row.body,BODY);assert.equal(row.temporalStatus,'unknown');assert.deepEqual(row.temporal,seed.temporal);assert.equal(row.card,gesture==='move'?'info':'now');
  assert.deepEqual(await canonical(p),before,'the later clock cannot reorder, move, revise or remove a manually organised Item');
  assert.equal((await p.evaluate(()=>__nowNative.refuseOverwrite())).disposition,'protected');assert.deepEqual(await canonical(p),before,'same original automatic Maintenance refuses to overwrite the human result');
  await f.finish();await f.evidence(gesture);
 });

 test('Now current B-02 refusal and historical Source purge retire the timer and reject an older actual snapshot '+variant,{timeout:60000},async t=>{
  const f=await fixture(t,variant,{qualifyCapture:true}),{p,seed}=f;
  await item(p,seed.id).evaluate(node=>{globalThis.__nowPurgedField=node.querySelector('.item-text');globalThis.__nowPurgedStatus=node.querySelector('.item-temporal');});
  // Hold delivery of one genuine successful UI snapshot. No reply fields or
  // statuses are fabricated. The direct send remains available for the oracle.
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__nowDirectSend=send;let armed=true;globalThis.__nowSnapshotHeld=false;globalThis.__nowRestoreTransport=()=>{chrome.runtime.sendMessage=send;};chrome.runtime.sendMessage=(message,...args)=>{const actual=send(message,...args);if(armed&&message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'){armed=false;return actual.then(reply=>new Promise(resolve=>{globalThis.__nowSnapshotHeld=true;globalThis.__nowRelease=()=>resolve(reply);}));}return actual;};});
  // A real unrelated manual Item mutation broadcasts through the existing
  // worker and causes the actual mounted ContextCardsPage to request a read.
  await rpc(p,'PAIA_CONTEXT_CARDS_CHANGE',{change:{kind:'put',operationId:crypto.randomUUID(),epoch:seed.epoch,itemId:crypto.randomUUID(),card:'info',expectedRevision:0,body:'SYNTHETIC unrelated manual Context',section:'SYNTHETIC section'}});
  await eventually(()=>p.evaluate(()=>__nowSnapshotHeld),'an old actual UI snapshot is in flight');
  // Source-linked Context is deliberately protected by current B-02 admission.
  // The existing fixture first proves the real refusal has zero effects, then
  // forms only the pinned historical purge state in this isolated profile.
  // Current native read/UI/timer owners must still retire the historical state;
  // this is never evidence that today's product permits this deletion.
  const purge=await admitPreGatePurgeBrowserFixture(p,seed.sourceId);
  assert.equal(purge.evidenceClass,'CURRENT_B02_REFUSAL_PLUS_HISTORICAL_COMPATIBILITY');
  // runtime.sendMessage excludes the sending page. Deliver the historical
  // fixture notification from the real worker, as a successful current purge
  // would notify its open clients; never replace the original snapshot reply.
  const worker=f.h.context.serviceWorkers().find(worker=>worker.url().endsWith('/background/service-worker.js'));assert.ok(worker);
  await worker.evaluate(()=>chrome.runtime.sendMessage({type:'ARCHIVE_CHANGED',cause:'SYNTHETIC_PRE_GATE_FIXTURE'}).catch(()=>{}));
  const actual=await p.evaluate(()=>__nowDirectSend({type:'PAIA_CONTEXT_CARDS_SNAPSHOT'}));assert.equal(actual.ok,true);assert.equal(actual.data.items.some(x=>x.id===seed.id),false,'real lineage refuses the purged Item');
  await eventually(()=>item(p,seed.id).count().then(n=>n===0),'original Source notification disposes the no-longer-qualified editor');
  await p.evaluate(()=>__nowRelease());await deadlinePassed(p,seed.deadline);
  assert.equal(await item(p,seed.id).count(),0);assert.equal(await p.locator('#memory-panel').innerText().then(text=>text.includes(BODY)),false);
  assert.equal(await p.locator('.item-temporal').filter({hasText:'有效期已过'}).count(),0,'disposed timer and retired reply cannot revive Source-derived body or warning');
  assert.equal(await p.evaluate(()=>!__nowPurgedField.isConnected&&!__nowPurgedStatus.isConnected&&__nowPurgedStatus.hidden&&__nowPurgedStatus.textContent===''),true,'the actual retired temporal owner clears its detached node and cannot later paint');
  const after=await hState(p);assert.equal(after.records.some(x=>x.id===seed.sourceId),false);const owners=await protectedOwners(p),unrelatedBefore=f.before.records.find(x=>x.id===seed.unrelatedId),unrelatedAfter=owners.records.find(x=>x.id===seed.unrelatedId);assert.deepEqual(unrelatedAfter,unrelatedBefore,'unrelated immutable Source is exact');
  const unrelatedInput=f.before.blocks.find(x=>x.value?.originalTextReference===seed.unrelatedId);assert.ok(unrelatedInput);assert.deepEqual(owners.blocks.find(x=>x.id===unrelatedInput.id),unrelatedInput,'all bytes of unrelated Working Input are exact');
  const humanBefore=f.before.thoughts.find(x=>x.id===seed.humanThoughtId);assert.ok(humanBefore,'a real independently authored human Thought exists before purge');assert.deepEqual(humanBefore.sourceRecordIds,[]);assert.deepEqual(owners.thoughts.find(x=>x.id===seed.humanThoughtId),humanBefore,'the exact Source-free human Thought and its protections are preserved');
  assert.deepEqual(await privateGrants(p),f.rights);offline(f.h);await f.evidence('purged-late-snapshot',{purge});
 });
}
async function hState(p){return rpc(p,'GET_STATE');}
