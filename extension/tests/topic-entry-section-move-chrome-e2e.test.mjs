import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {mkdtemp,rm,mkdir,readFile,writeFile} from 'node:fs/promises';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {thoughtPrimary} from './harness/current-thought-navigation.mjs';
const seedEvidence=(await readFile(new URL('./harness/ans07-seed-evidence.mjs',import.meta.url),'utf8')).replaceAll('export function','function');
const entrySeed = async()=>{const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local),op=()=>crypto.randomUUID();globalThis.__entryStore=s;const trace=globalThis.__entryTrace;trace.seedAttempts++;const stop=globalThis.__entryObserveSeed(s,trace);try{trace.phase='foundation';await s.finishFoundation();trace.foundationCompleted=true;trace.phase='topic';const t=await s.createTopic({name:'SYNTHETIC Entry movement',operationId:op()});trace.topicCompleted=true;trace.phase='section';const section=await s.createSection({topicId:t.id,expectedTopicRevision:(await s.topic(t.id)).organizationRevision,title:'SYNTHETIC destination',operationId:op()});trace.sectionCompleted=true;trace.phase='entry';const e=await s.continueThinking({topicId:t.id,body:'SYNTHETIC entire Entry\n\n保留条件，不是选中文字。',operationId:op()});trace.entryCompleted=true;trace.phase='final-topic';return {topic:t.id,defaultId:(await s.topic(t.id)).defaultSectionId,section:section.sectionId,entry:e.id};}catch(error){trace.error=error.code||'UNKNOWN';throw error;}finally{stop();}};
async function observeConsent(p,{held=false,interruptSeed=false}={}){
 await p.evaluate(`(()=>{${seedEvidence}globalThis.__entryObserveSeed=observeANS07Seed;globalThis.__entryObserveConsent=observeANS07Consent;})()`);
 await p.evaluate(({held,interruptSeed})=>{
  const send=chrome.runtime.sendMessage;globalThis.__entryTrace={phase:'consent',seedAttempts:0};
  if(held){const gate=new Promise(resolve=>globalThis.__entryRelease=resolve);chrome.runtime.sendMessage=function(message,...args){return message?.type==='CONSENT'?gate.then(()=>Reflect.apply(send,this,[message,...args])):Reflect.apply(send,this,[message,...args]);};}
  const wrapped=chrome.runtime.sendMessage;globalThis.__entryConsent=__entryObserveConsent(chrome.runtime,__entryTrace);
  globalThis.__entryStop=()=>{__entryConsent.stop();if(chrome.runtime.sendMessage===wrapped)chrome.runtime.sendMessage=send;};

 },{held,interruptSeed});
 if(interruptSeed)await p.evaluate(async()=>{
  const {readControlPublicationFence}=await import('../core/local-control-publication.js');
  // The observer attaches to the same store used by the original seed below.
  const observe=__entryObserveSeed;globalThis.__entryObserveSeed=(store,trace)=>{
   const stop=observe(store,trace),transaction=store.repository.transaction;let released=false;
   store.repository.transaction=async function(write,callback,...rest){const value=await Reflect.apply(transaction,this,[write,callback,...rest]);if(!released&&!write&&callback===readControlPublicationFence){released=true;trace.firstFenceRead=true;__entryRelease();await __entryConsent.complete();}return value;};
   return ()=>{store.repository.transaction=transaction;stop();};
  };
 });
}
async function saveSeedTrace(p,variant){
 const trace=await p.evaluate(()=>globalThis.__entryTrace);await mkdir('work/qa-entry-move/'+variant,{recursive:true});await writeFile('work/qa-entry-move/'+variant+'/seed.json',JSON.stringify(trace,null,2)+'\n');return trace;
}
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(m=>chrome.runtime.sendMessage(m),{type,...fields});assert.equal(r?.ok,true,JSON.stringify(r));return r.data;};
for(const variant of ['source','release'])test('whole Entry move and existing restore '+variant,{timeout:90000},async()=>{
 const release=variant==='release'?await mkdtemp(resolve(tmpdir(),'paia-entry-move-')):null;
 if(release)execFileSync('python3',['scripts/build_current_release.py',release],{stdio:'pipe'});
 const h=await FakeChatGPT.start({extensionPath:release||resolve('.')}),p=h.archive;let primaryError;
 try{
  await p.setViewportSize({width:1280,height:900});await observeConsent(p,{held:true});await p.locator('#enable-consent').click();
  const ready=p.evaluate(()=>__entryConsent.complete());assert.deepEqual(await p.evaluate(()=>({seedAttempts:__entryTrace.seedAttempts,consent:__entryTrace.consent})),{seedAttempts:0,consent:{dispatched:1,settled:0,acknowledged:0}});await p.evaluate(()=>__entryRelease());await ready;await p.evaluate(()=>__entryStop());if(await p.locator('#onboarding-skip').isVisible())await p.locator('#onboarding-skip').click();
  const f=await p.evaluate(entrySeed);await saveSeedTrace(p,variant);
  const before=await rpc(p,'GET_LIBRARY_ENTRY',{id:f.entry});await thoughtPrimary(p,'thoughts');await p.locator(`.personal-topic-block[data-topic-id="${f.topic}"] .personal-topic-link`).click();
  const entry=()=>p.locator(`#original-reading-body [data-entry-id="${f.entry}"]`),move=async(label='移动到章节')=>{await eventually(async()=>await entry().locator('.topic-entry-actions').getAttribute('aria-busy')==='false','entry action lifecycle complete');await entry().hover();const menu=entry().locator('.library-actions');await menu.locator('summary').focus();await p.keyboard.press('Enter');await menu.getByRole('button',{name:label,exact:true}).focus();await p.keyboard.press('Enter');await p.locator('#library-form select').waitFor({state:'visible'});};
  await move();assert.match(await p.locator('#library-form select').getAttribute('aria-label'),/整条内容.*不是所选文字/);await p.keyboard.press('Escape');assert.equal((await rpc(p,'GET_LIBRARY_PLACEMENT',{topicId:f.topic,entryId:f.entry})).sectionId,f.defaultId);
  await move();await p.locator('#library-form select').selectOption(f.section);await p.locator('#library-form button[type="submit"]').click();await eventually(async()=>await entry().getAttribute('data-section-id')===f.section,'named Section arrival');assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:f.entry})).body,before.body);
  // Cold restoration has a durable reading precondition, not merely a move
  // receipt. Revisit through the actual title and observe the scheduled owner ACK.
  await p.locator('#back').click();await p.locator(`.personal-topic-link[data-topic-id="${f.topic}"]`).click();await eventually(async()=>await entry().getAttribute('data-section-id')===f.section,'same-session title returns to the actual moved Section');await eventually(async()=>{const position=await rpc(p,'THOUGHT_POSITION',{position:{topicId:f.topic}});return position?.entryId===f.entry;},'the original scheduled reader acknowledges its exact Entry before cold reload');await p.reload();await entry().waitFor();assert.equal(await entry().getAttribute('data-section-id'),f.section);
  await move();await p.locator('#library-form select').selectOption(f.defaultId);await p.locator('#library-form button[type="submit"]').click();await eventually(async()=>await entry().getAttribute('data-section-id')===f.defaultId,'default Section arrival');
  await entry().hover();const menu=entry().locator('.library-actions');await menu.locator('summary').click();await menu.getByRole('button',{name:'位置与成员版本',exact:true}).click();await p.locator('.revision-row').first().getByRole('button',{name:'恢复操作前',exact:true}).click();await eventually(async()=>(await rpc(p,'GET_LIBRARY_PLACEMENT',{topicId:f.topic,entryId:f.entry})).sectionId===f.section,'the original history owner restores the exact preceding placement');await p.locator('.topic-section-directory button[data-section-id="'+f.section+'"]').click();await eventually(async()=>await entry().getAttribute('data-section-id')===f.section,'explicit current directory opens the restored Entry within its actual Section');assert.equal((await rpc(p,'GET_LIBRARY_ENTRY',{id:f.entry})).body,before.body);
  const retained=await entry().evaluate(n=>n.entryMovePlacement),durable=await rpc(p,'GET_LIBRARY_PLACEMENT',{topicId:f.topic,entryId:f.entry});for(const field of ['id','topicId','sectionId','layoutGeneration','revision'])assert.equal(retained[field],durable[field],'retained menu current placement '+field);assert.equal(retained.sectionProtected,durable.sectionProtection);assert.equal(retained.orderProtected,durable.orderProtection);
  await rpc(p,'UPDATE_PREFERENCES',{changes:{language:'en'}});await p.setViewportSize({width:320,height:760});await p.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await move('Move to Section');assert.equal(await p.locator('#library-dialog-title').textContent(),'Move entire Entry');assert.equal(await p.locator('#library-form select').getAttribute('aria-label'),'Destination for the entire Entry (not selected text)');assert.equal(await p.locator('#library-dialog-close').textContent(),'Close');assert.ok(await p.locator('#library-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1));const dir='work/qa-entry-move/'+variant;await mkdir(dir,{recursive:true});await p.screenshot({path:dir+'/move-320-dark-en.png',fullPage:true});await p.keyboard.press('Escape');
 assert.deepEqual(h.errors,[]);assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);
 }catch(error){primaryError=error;try{await saveSeedTrace(p,variant);}catch{}throw error;}finally{try{try{await h.close();}finally{if(release)await rm(release,{recursive:true,force:true});}}catch(error){if(!primaryError)throw error;console.error('ENTRY_MOVE_CLEANUP_FAILED_AFTER_PRIMARY',variant);}}
});

for(const variant of ['source','release'])test('Entry seed original publication rejects unadmitted '+variant+' without replay',{timeout:30000},async()=>{
 const release=variant==='release'?await mkdtemp(resolve(tmpdir(),'paia-entry-control-')):null;if(release)execFileSync('python3',['scripts/build_current_release.py',release],{stdio:'pipe'});
 const h=await FakeChatGPT.start({extensionPath:release||resolve('.')}),p=h.archive;let primaryError;
 try{
  await observeConsent(p,{held:true,interruptSeed:true});await p.locator('#enable-consent').click();
  await assert.rejects(p.evaluate(entrySeed),/CONTROL_PUBLICATION_CHANGED/);const trace=await saveSeedTrace(p,variant+'-negative');
  assert.equal(trace.seedAttempts,1);assert.deepEqual(trace.consent,{dispatched:1,settled:1,acknowledged:1});assert.equal(trace.firstFenceRead,true);assert.equal(trace.topicCompleted,undefined);assert.equal(trace.entryCompleted,undefined);assert.ok(trace.runs.some(r=>r.error==='CONTROL_PUBLICATION_CHANGED'&&!r.entered));
  const counts=await p.evaluate(()=>__entryStore.repository.transaction(false,async t=>({topics:await t.count('topics'),entries:await t.count('thoughts')}),['topics','thoughts']));assert.deepEqual(counts,{topics:0,entries:0});
  await p.evaluate(()=>__entryStop());assert.deepEqual(h.errors,[]);assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);
 }catch(error){primaryError=error;throw error;}finally{try{try{await h.close();}finally{if(release)await rm(release,{recursive:true,force:true});}}catch(error){if(!primaryError)throw error;console.error('ENTRY_MOVE_CLEANUP_FAILED_AFTER_PRIMARY',variant);}}
});
