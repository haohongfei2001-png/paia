// Production original owners with synthetic DOM/transport. NOT native/browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './harness/ai-reading-flush-fixture.mjs';
import {TopicController} from '../ui/topic-workspace.js';
import {SECTION_AI_FIELDS,qualifySectionAI} from '../ui/topic-section-ai.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {recoveryDraftPrefix} from '../core/recovery-draft.js';
import {installSaveLifecycle} from '../ui/session-lifecycle.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const turn=()=>new Promise(r=>setImmediate(r));
function input(node,value,data=value){node.textContent=value;node.listeners.get('input')({inputType:value?'insertText':'deleteContentBackward',data:value?data:null});}
async function withdrawnFixture({fail=true,older=false}={}){
 const f=await fixture({revision:7,lists:true}),original=f.editor,reader=new ThoughtSectionReading(new ThoughtLibraryReadModel(f.s)),paintEntered=deferred(),paintRelease=deferred(),saveEntered=deferred(),saveRelease=deferred();
 const options={topicId:f.topic.id,scopeSectionId:f.topic.sectionId,limit:1},initial=await reader.page(options),old=structuredClone(original.row),Node=original.root.constructor,docNodes=new Map();
 original.admittedFields=new Set(SECTION_AI_FIELDS);original.sectionEvidence=new Set([f.entry.id]);
 document.getElementById=id=>{if(!docNodes.has(id)){const n=new Node();n.style={};docNodes.set(id,n);}return docNodes.get(id);};document.body=new Node('body');document.body.append(original.root);original.root.style={};
 const created=await f.s.createSection({topicId:f.topic.id,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,title:'SYNTHETIC other Section',operationId:crypto.randomUUID()}),entry=await f.s.entry(f.entry.id),topic=await f.s.topic(f.topic.id),placement=await f.s.libraryPlacement(topic.id,entry.id);
 await f.s.placeEntry({entryId:entry.id,topicId:topic.id,sectionId:created.sectionId,expectedEntryRevision:entry.revision,expectedTopicRevision:topic.organizationRevision,expectedPlacementRevision:placement.revision,operationId:crypto.randomUUID()});
 const post=await reader.page(options),anchor=await reader.page({...options,anchorId:entry.id}),cached={...(await f.s.aiPresentationStatus({topicId:topic.id})).topics[0].presentation,recoveryEpoch:post.recoveryEpoch};
 assert.deepEqual(post.items,[]);assert.equal(anchor.anchorUnavailable,true);assert.equal((await f.s.entry(entry.id)).lifecycle,'active');
 const q=await qualifySectionAI(cached,{topicId:topic.id,sectionId:f.topic.sectionId,load:o=>reader.page(o)});assert.equal(q.complete,true);assert.equal(q.admittedFields.size,0);
 const send=chrome.runtime.sendMessage;
 chrome.runtime.sendMessage=async m=>m.type==='GET_LIBRARY_SECTION_PROJECTION'?{ok:true,data:{topic:post.topic,items:post.sections.map(r=>({...r,id:r.sectionId}))}}:m.type==='GET_LIBRARY_SECTION_READING'?{ok:true,data:await reader.page(m.options)}:send(m);
 let rounds=0,writes=0,sourceChecks=0;
 f.setSave(async message=>{if(!(await f.s.status()).consented)throw {code:'CONSENT_REQUIRED'};if(message.draft.epoch!==await f.s.recoveryDraftEpoch())throw {code:'INVALID_REQUEST'};await f.s.recoveryDraftSourceIds(message.draft);sourceChecks++;});
 const owner=Object.assign(Object.create(TopicController.prototype),{serial:1,openIntent:1,id:topic.id,view:'ai',topic:post.topic,activeSectionId:f.topic.sectionId,aiTopics:new Map([[topic.id,{presentation:cached}]]),aiScopeKey:JSON.stringify([topic.id,f.topic.sectionId,true,[...SECTION_AI_FIELDS].sort(),initial.coverage.activeGeneration,initial.recoveryEpoch]),aiEditor:original,originalPane:new Node(),aiPane:original.root,syncReadingControls(){},ensurePanes(){},updateViewStatus:async()=>({}),filterAIReading(){},renderSectionNav(){},topicAnchor:()=>null,topicSectionAnchor:()=>null,checkAllTracked:async()=>true,updateTopicSearchCount(){},readKey:()=>topic.id,
 async refreshOnce(){rounds++;await owner.readContentRefresh();},async resetTopicReader({beforePaint}){if(rounds===1){paintEntered.resolve();await paintRelease.promise;}assert.equal(beforePaint(await reader.page(options)),true);return {stale:false};}});
 const set=f.s.local.set;
 f.s.local.set=async values=>{if(Object.keys(values).some(k=>k.startsWith(recoveryDraftPrefix))){writes++;if(!(older&&writes===1)){saveEntered.resolve();await saveRelease.promise;if(fail)throw {code:'STORAGE_FULL'};}}return set.call(f.s.local,values);};
 return {...f,original,owner,old,paintEntered,paintRelease,saveEntered,saveRelease,writes:()=>writes,checks:()=>sourceChecks,restoreStorage:()=>f.s.local.set=set,async close(){paintRelease.resolve();saveRelease.resolve();await owner.refreshRun?.promise;await original.recovery.running;f.s.local.set=set;await f.close();}};
}
for(const [label,{value,startFlush=true,older=false,fail=true}]of Object.entries({
 replacement:{value:'人工 replacement\nsecond line 👩‍💻'},clear:{value:''},before_flush:{value:'人工 before autosave',startFlush:false},newer_failure:{value:'人工 latest correction',older:true},held_success:{value:'人工 protected',fail:false}
}))test('withdrawn Section preserves reachable latest human delta: '+label,{timeout:10000},async()=>{
 const f=await withdrawnFixture({fail,older});let reading,flush;
 try{
  reading=f.owner.refresh();await f.paintEntered.promise;const changed=f.original.nodes.get('blockSummary')[0],untouched=f.original.nodes.get('currentView')[0];
  if(older){input(changed,'人工 older');await f.original.recovery.running;}
  input(changed,value);if(startFlush)flush=f.original.flush();await f.saveEntered.promise;const exact=structuredClone(f.saves.at(-1).draft);
  f.paintRelease.resolve();await reading;
  assert.equal(f.owner.aiEditor,f.original);assert.equal(f.original.disposed,true);assert.equal(f.original.recoveryOnly,true);assert.equal(changed.isConnected,false);assert.equal(untouched.isConnected,false);assert.equal(f.original.nodes.size,0);assert.equal(f.original.evidenceRows.size,0);assert.deepEqual(f.original.draft,{});assert.equal(f.original.journal.undo.length,0);assert.doesNotMatch(f.original.root.textContent,/SYNTHETIC|evidenceEntryIds/);assert.equal(f.edits.length,0);
  if(value)assert.ok(f.original.root.textContent.includes(value));if(!value)assert.match(f.original.root.textContent,/清空此项/);
  f.saveRelease.resolve();if(flush)assert.equal(await flush,false);await f.original.recoveryProtection;await turn();
  assert.equal(f.original.dirty(),fail);assert.equal(await f.owner.flushEditors(),!fail);assert.match(f.original.recoveryStatus.textContent,fail?/尚未保存在本机/:/已保存在本机/);
  const load=await chrome.runtime.sendMessage({type:'PAIA_RECOVERY_DRAFT_LOAD',draft:{kind:'ai_presentation',ownerId:f.topic.id}});assert.equal(load.data?.operation.values.blockSummary??null,fail?(older?'人工 older':null):value);
  const saves=f.saves.length;await f.owner.refresh();assert.equal(f.saves.length,saves,'ordinary refresh does not retry a failed snapshot');assert.equal(f.owner.aiEditor,f.original);
  let copied=null;Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:async text=>{copied=text;}}},configurable:true});assert.equal(await f.original.copyHumanRecovery(),true);assert.doesNotMatch(copied,/SYNTHETIC|evidenceEntryIds|人工 older/);if(value)assert.ok(copied.includes(value));else assert.match(copied,/清空此项/);
  if(fail){f.restoreStorage();assert.equal(await f.original.retryRecovery(),true);assert.deepEqual(f.saves.at(-1).draft,exact,'same operation/token/epoch/source envelope');assert.equal(f.original.dirty(),false);assert.equal(await f.owner.flushEditors(),true);assert.ok(f.checks()>=2);}
  assert.equal(f.edits.length,0);assert.equal((await f.read()).revision,7);
 }finally{f.paintRelease.resolve();f.saveRelease.resolve();await Promise.allSettled([reading,flush]);await f.close();}
});
test('mixed list retains only human insertion; untouched AI list items and evidence never appear or copy',{timeout:10000},async()=>{
 const f=await withdrawnFixture();let reading;
 try{reading=f.owner.refresh();await f.paintEntered.promise;const field=f.original.nodes.get('openQuestions')[0],old=field.textContent;input(field,old+'人工插入','人工插入');await f.saveEntered.promise;f.paintRelease.resolve();await reading;assert.doesNotMatch(f.original.root.textContent,/SYNTHETIC|literal|evidenceEntryIds/);assert.match(f.original.root.textContent,/人工插入/);assert.equal(f.original.humanRecovery.length,1);assert.equal(f.original.humanRecovery[0].field,'openQuestions');f.saveRelease.resolve();await f.original.recoveryProtection;assert.equal(await f.owner.flushEditors(),false);}
 finally{f.paintRelease.resolve();f.saveRelease.resolve();await reading;await f.close();}
});
test('unverified full-field replacement is retained privately but never displayed as human prose',{timeout:10000},async()=>{
 const f=await withdrawnFixture();let reading;
 try{reading=f.owner.refresh();await f.paintEntered.promise;const node=f.original.nodes.get('blockSummary')[0];node.textContent='unverified includes SYNTHETIC currentView';node.listeners.get('input')();await f.saveEntered.promise;f.paintRelease.resolve();await reading;assert.doesNotMatch(f.original.root.textContent,/SYNTHETIC|unverified includes/);assert.match(f.original.root.textContent,/无法确认文本来源/);f.saveRelease.resolve();await f.original.recoveryProtection;assert.equal(f.original.dirty(),true);}
 finally{f.paintRelease.resolve();f.saveRelease.resolve();await reading;await f.close();}
});
test('unconsented original authority refuses explicit retry retains delta and beforeunload/leave protection',{timeout:10000},async()=>{
 const f=await withdrawnFixture();let reading,lifecycle;const events=new Map();
 try{reading=f.owner.refresh();await f.paintEntered.promise;input(f.original.nodes.get('blockSummary')[0],'人工 permission refusal');await f.saveEntered.promise;f.paintRelease.resolve();await reading;f.saveRelease.resolve();await f.original.recoveryProtection;f.restoreStorage();await f.s.write(async t=>{const control=await f.s.control(t);control.settings.consentVersion=0;await f.s.saveControl(t,control);});assert.equal((await f.s.status()).consented,false);assert.equal(await f.original.retryRecovery(),false);assert.equal(f.original.dirty(),true);assert.equal(await f.owner.flushReadingNavigation(),false);assert.match(f.original.root.textContent,/人工 permission refusal/);assert.match(f.original.recoveryStatus.textContent,/尚未保存在本机/);
 lifecycle=installSaveLifecycle(()=>[f.owner.aiEditor],{target:{addEventListener:(name,fn)=>events.set(name,fn)},documentTarget:{addEventListener(){}}});let prevented=false;const saves=f.saves.length;events.get('beforeunload')({preventDefault(){prevented=true;}});await turn();assert.equal(prevented,true);assert.equal(f.saves.length,saves,'leave guard does not silently retry');assert.equal(f.edits.length,0);
 }finally{lifecycle?.dispose();f.paintRelease.resolve();f.saveRelease.resolve();await reading;await f.close();}
});
test('late canonical ACK only records the sent identity and cannot clear newer withdrawn delta',{timeout:10000},async()=>{
 const f=await fixture({revision:7}),entered=deferred(),release=deferred();let flush;
 try{f.setEdit(async()=>{entered.resolve();await release.promise;});const node=f.editor.nodes.get('blockSummary')[0];input(node,'人工 sent');flush=f.editor.flush();await entered.promise;input(node,'人工 latest');await f.editor.recovery.running;const token=f.saves.at(-1).draft.token;assert.equal(f.editor.withdraw(),true);release.resolve();assert.equal(await flush,false);await f.editor.recoveryProtection;assert.equal(f.editor.recovery.currentToken,token);assert.match(f.editor.root.textContent,/latest/);assert.equal(f.edits.length,1);assert.deepEqual(f.editor.recoveryAcknowledgement,{operationId:f.edits[0].edit.operationId,revision:8});assert.equal((await f.read()).blockSummary,'人工 sent');assert.equal(f.editor.nodes.size,0);}
 finally{release.resolve();await flush;await f.close();}
});
test('retiring a recovery-only owner while SAVE is held never remounts a late result',{timeout:10000},async()=>{
 const f=await fixture(),entered=deferred(),release=deferred();
 try{f.setSave(async()=>{entered.resolve();await release.promise;});input(f.editor.nodes.get('blockSummary')[0],'人工 retiring');await entered.promise;assert.equal(f.editor.withdraw(),true);f.editor.dispose();const statuses=f.statuses.length;release.resolve();await f.editor.recoveryProtection;assert.equal(f.editor.root.textContent,'');assert.equal(f.statuses.length,statuses);assert.equal(f.edits.length,0);}
 finally{release.resolve();await f.close();}
});
test('explicit discard handles an earlier own saved token without clearing a newer foreign token',async()=>{
 const f=await fixture();const confirm=globalThis.confirm;globalThis.confirm=()=>true;
 try{const node=f.editor.nodes.get('blockSummary')[0];input(node,'人工 older');await f.editor.recovery.running;const prior=structuredClone(f.saves.at(-1).draft);f.setSave(async()=>{throw {code:'STORAGE_FULL'};});input(node,'人工 newest');await f.editor.recovery.running;assert.equal(f.editor.withdraw(),true);await f.editor.recoveryProtection;
  // An independently newer token cannot be cleared by this owner's discard.
  const {RecoveryDraftStore}=await import('../core/recovery-draft.js'),store=new RecoveryDraftStore(f.s.local);await store.save({...prior,token:'foreign-newer-token'});assert.equal(await f.editor.discardHumanRecovery(),false);assert.equal(f.editor.dirty(),true);assert.equal((await store.load('ai_presentation',f.topic.id)).token,'foreign-newer-token');
  await store.save(prior);assert.equal(await f.editor.discardHumanRecovery(),true);assert.equal(await store.load('ai_presentation',f.topic.id),null);assert.equal(f.editor.dirty(),false);assert.equal(f.edits.length,0);
 }finally{globalThis.confirm=confirm;await f.close();}
});
test('closed details retain verified multiline delta rather than sampling flattened hidden DOM',async()=>{
 const f=await fixture(),node=f.editor.nodes.get('blockSummary')[0];
 try{input(node,'人工 first\nsecond 👩‍💻');await f.editor.recovery.running;node.closest=()=>({open:false});node.renderedText='人工 firstsecond 👩‍💻';assert.equal(f.editor.withdraw(),true);await f.editor.recoveryProtection;assert.match(f.editor.root.textContent,/人工 first\nsecond 👩‍💻/);assert.equal(f.editor.humanRecovery[0].changes[0].unverified,false);}
 finally{await f.close();}
});
for(const boundary of ['epoch','generation'])test('withdrawn exact retry refuses changed '+boundary+' without refreshing authority',{timeout:10000},async()=>{
 const f=await withdrawnFixture();let reading;
 try{reading=f.owner.refresh();await f.paintEntered.promise;input(f.original.nodes.get('blockSummary')[0],'人工 fenced');await f.saveEntered.promise;const exact=structuredClone(f.saves.at(-1).draft);f.paintRelease.resolve();await reading;f.saveRelease.resolve();await f.original.recoveryProtection;f.restoreStorage();
  if(boundary==='epoch')await f.s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:'new-epoch'}));
  else await f.s.foundationWrite(async t=>{const row=await t.get('meta','aiPresentation:'+f.topic.id);row.recoveryGeneration='new-owner-generation';await t.put('meta',row);});
  assert.equal(await f.original.retryRecovery(),false);assert.deepEqual(f.saves.at(-1).draft,exact);assert.equal(f.original.dirty(),true);assert.equal(await f.owner.flushReadingNavigation(),false);assert.match(f.original.root.textContent,/人工 fenced/);assert.equal(f.edits.length,0);assert.equal((await f.read()).revision,7);
 }finally{f.paintRelease.resolve();f.saveRelease.resolve();await reading;await f.close();}
});
