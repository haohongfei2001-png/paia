import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {LibraryEntryEditor} from '../ui/library-entry-editor.js';
import {thoughtEditHistory} from '../core/thought-history.js';
import {setup,inputEdit} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';

const native=await readFile(new URL('./ans-08-topic-edit-preservation-chrome-e2e.test.mjs',import.meta.url),'utf8');
const observerStart=native.indexOf('function observeOriginalFlush(Editor,state){'),observerEnd=native.indexOf('\n   const send=',observerStart);
assert.ok(observerStart>=0&&observerEnd>observerStart);
const observeOriginalFlush=runInNewContext('('+native.slice(observerStart,observerEnd).trim()+')');
const observerState=()=>({pendingFlushes:0,flushCalls:0,flushRejected:0,flushThrows:0,flushUnexpectedValues:0});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(run){
 const {s}=await setup(OrganizerStore),block=(await s.run(()=>s.repository.transaction(false,t=>t.all('blocks'))))[0];await inputEdit(s,block.id,{libraryText:'ANS08 original'});const topic=await s.createTopic({name:'ANS08 synthetic Topic',operationId:crypto.randomUUID()}),live=await s.input(block.id),made=await s.addToTopics({kind:'input',id:live.id,expectedRevision:live.revision,operationId:crypto.randomUUID(),topicIds:[topic.id]}),row=s.documentEntry(await s.entry(made.id));assert.equal(row.bodyBinding,'input');
 const ime=await s.continueThinking({operationId:crypto.randomUUID(),body:'ANS08 original IME row',topicId:topic.id}),imeRow=s.documentEntry(await s.entry(ime.id)),rows=[row,imeRow];for(const current of rows)current.recoveryEpoch='synthetic-original-recovery';
 const prior=new Map(['chrome','document','window'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)])),calls=[],statuses=[],root=new EventTarget(),allFields=new Map(),containers=new Map();
 for(const current of rows){const map=new Map(),container={dataset:{entryId:current.id},querySelector:q=>map.get(q.match(/"([^\"]+)"/)?.[1]),remove(){}};containers.set(current.id,container);allFields.set(current.id,map);for(const key of ['body','note','type']){let value=current[key];map.set(key,{dataset:{},get textContent(){return value;},set textContent(v){value=v;},get innerText(){return value;},matches:()=>false,closest:()=>container});}}
 const fields=allFields.get(row.id);root.closest=()=>containers.get(imeRow.id);root.querySelectorAll=q=>q==='[data-entry-id]'?[...containers.values()]:q==='[data-entry-field="body"]'?[...allFields.values()].map(x=>x.get('body')):[];
 const controls={fail:false,holdSave:null,holdClear:null};
 const immutable=await s.run(()=>s.repository.transaction(false,async t=>({records:await t.all('records'),blocks:await t.all('blocks')})));
 globalThis.document={documentElement:{lang:'en'}};globalThis.window={confirm:()=>false};
 globalThis.chrome={runtime:{sendMessage:async q=>{const call={type:q.type,edit:q.edit?structuredClone(q.edit):null};calls.push(call);let data;
  if(q.type==='PAIA_RECOVERY_DRAFT_LOAD')data=null;
  else if(q.type==='PAIA_RECOVERY_DRAFT_SAVE'){if(controls.holdSave){const hold=controls.holdSave;controls.holdSave=null;hold.entered.resolve();await hold.release.promise;}data=true;}
  else if(q.type==='PAIA_RECOVERY_DRAFT_CLEAR_MANY'){if(controls.holdClear){const hold=controls.holdClear;controls.holdClear=null;hold.entered.resolve();await hold.release.promise;}data=true;}
  else if(q.type==='EDIT_LIBRARY_BATCH'){if(controls.fail)return {ok:false,error:'STORAGE_FAILED'};data=await s.editLibraryBatch(q.edit);call.result=structuredClone(data);}
  else if(q.type==='GET_LIBRARY_ENTRY')data=s.documentEntry(await s.entry(q.id));
  else if(q.type==='THOUGHT_EDIT_HISTORY')data=await thoughtEditHistory(s,q.edit);
  else throw Error('unexpected original RPC '+q.type);
  return {ok:true,data};
 }}};
 const editor=new LibraryEntryEditor(root,rows,(...a)=>statuses.push(a));await editor.recoveryReady;
 const input=body=>{fields.get('body').textContent=body;editor.collect();editor.autosave.cancel();};
 const compose=()=>{root.dispatchEvent(new Event('compositionstart'));allFields.get(imeRow.id).get('body').textContent='ANS08 IME 未提交草稿';root.dispatchEvent(new Event('compositionend'));editor.autosave.cancel();};
 try{await run({s,row,editor,input,compose,calls,statuses,controls});assert.deepEqual(await s.run(()=>s.repository.transaction(false,async t=>({records:await t.all('records'),blocks:await t.all('blocks')}))),immutable);}finally{controls.holdSave?.release.resolve();controls.holdClear?.release.resolve();editor.dispose();await s.repository.close();for(const[k,d]of prior)d?Object.defineProperty(globalThis,k,d):delete globalThis[k];}
}

test('original owner: held recovery allows two real saved revisions and Undo targets the latest persisted before',()=>fixture(async({s,row,editor,input,compose,calls,controls})=>{
 controls.fail=true;input('ANS08 original DIRTY_000');assert.equal(await editor.flush(),false);
 // A composition-end change clears the original failed latch before selection work completes.
 const gate={entered:deferred(),release:deferred()};controls.holdSave=gate;
 compose();
 const first=editor.flush();try{await Promise.race([gate.entered.promise,first.then(()=>{throw Error('flush ended before gate');})]);
 controls.fail=false;input('ANS08 original DIRTY_000 RECOVER');gate.release.resolve();assert.equal(await first,true);
 const edits=calls.filter(q=>q.type==='EDIT_LIBRARY_BATCH'&&q.result);
 assert.deepEqual(edits.map(q=>q.edit.entries[0].changes.body),['ANS08 original DIRTY_000','ANS08 original DIRTY_000 RECOVER']);
 const ids=edits.map(q=>q.result.items[0].revisionId),actual=await s.run(()=>s.repository.transaction(false,async t=>Promise.all(ids.map(id=>t.get('revisions',id)))));
 assert.deepEqual(actual.map(r=>[r.before.body,r.after.body]),[['ANS08 original','ANS08 original DIRTY_000'],['ANS08 original DIRTY_000','ANS08 original DIRTY_000 RECOVER']]);
 assert.equal(editor.journal.undo.at(-1).savedEdit[0].revisionId,ids[1]);assert.equal(editor.saving,false);await editor.history(false);
 assert.equal((await s.entry(row.id)).body,'ANS08 original DIRTY_000');
 console.log('ANS08_ORIGINAL_TWO_COMMITS '+JSON.stringify({edits:edits.map(q=>q.edit.entries[0].changes.body),revisions:actual.map(r=>({id:r.id,before:r.before.body,after:r.after.body})),undo:(await s.entry(row.id)).body}));
 }finally{gate.release.resolve();await first;}
}));

test('composition-triggered failure settles before recovery: one persisted revision, exact original Undo and saved-body Redo',()=>fixture(async({s,row,editor,input,compose,calls,statuses,controls})=>{
 controls.fail=true;input('ANS08 original DIRTY_000');assert.equal(await editor.flush(),false);
 const priorFailures=calls.filter(q=>q.type==='EDIT_LIBRARY_BATCH').length;
 compose();assert.equal(editor.failed,false);assert.notEqual(statuses.at(-1)?.[1],'error');
 assert.equal(await editor.flush(),false);assert.equal(editor.saving,false);assert.equal(editor.failed,true);
 assert.equal(calls.filter(q=>q.type==='EDIT_LIBRARY_BATCH').length,priorFailures+1);assert.equal(statuses.at(-1)[1],'error');assert.equal((await s.entry(row.id)).body,'ANS08 original');
 controls.fail=false;input('ANS08 original DIRTY_000 RECOVER');assert.equal(await editor.flush(),true);
 const edits=calls.filter(q=>q.type==='EDIT_LIBRARY_BATCH'&&q.result);assert.equal(edits.length,1);
 const revision=await s.run(()=>s.repository.transaction(false,t=>t.get('revisions',edits[0].result.items[0].revisionId)));assert.equal(revision.before.body,'ANS08 original');
 await editor.history(false);assert.equal((await s.entry(row.id)).body,'ANS08 original');await editor.history(true);assert.equal((await s.entry(row.id)).body,'ANS08 original DIRTY_000 RECOVER');
}));

test('original EDIT ACK precedes recovery-clear and savedEdit completion; full original flush establishes the undo boundary',()=>fixture(async({s,row,editor,input,calls,controls})=>{
 const state=observerState(),descriptor=Object.getOwnPropertyDescriptor(LibraryEntryEditor.prototype,'flush'),restore=observeOriginalFlush(LibraryEntryEditor,state);
 input('ANS08 original DIRTY_000 RECOVER');const gate={entered:deferred(),release:deferred()};controls.holdClear=gate;const pending=editor.flush();
 try{
  await Promise.race([gate.entered.promise,pending.then(()=>{throw Error('flush ended before recovery clear');})]);
  assert.equal((await s.entry(row.id)).body,'ANS08 original DIRTY_000 RECOVER');assert.equal(calls.filter(q=>q.type==='EDIT_LIBRARY_BATCH'&&q.result).length,1);assert.equal(editor.saving,true);assert.equal(state.pendingFlushes,1);assert.equal(editor.dirty(),false);assert.equal(editor.journal.undo.at(-1).savedEdit,undefined);
  gate.release.resolve();assert.equal(await pending,true);assert.equal(state.pendingFlushes,0);assert.equal(editor.saving,false);assert.equal(editor.journal.undo.at(-1).savedEdit.length,1);
  await editor.history(false);assert.equal((await s.entry(row.id)).body,'ANS08 original');await editor.history(true);assert.equal((await s.entry(row.id)).body,'ANS08 original DIRTY_000 RECOVER');
 }finally{gate.release.resolve();await pending;restore();assert.deepEqual(Object.getOwnPropertyDescriptor(LibraryEntryEditor.prototype,'flush'),descriptor);}
}));

 test('native observer preserves exact original Promise, receiver, arguments, descriptor and rejection visibility',async()=>{
 const gate=deferred(),calls=[],state=observerState();class Owner{flush(...args){calls.push([this,args]);return gate.promise;}}const descriptor=Object.getOwnPropertyDescriptor(Owner.prototype,'flush'),owner=new Owner(),restore=observeOriginalFlush(Owner,state);
 try{assert.equal(owner.flush('original',42),gate.promise);assert.equal(calls[0][0],owner);assert.deepEqual(calls[0][1],['original',42]);assert.equal(state.pendingFlushes,1);gate.resolve(true);await gate.promise;assert.equal(state.pendingFlushes,0);assert.equal(state.flushRejected,0);}finally{gate.resolve();restore();}assert.deepEqual(Object.getOwnPropertyDescriptor(Owner.prototype,'flush'),descriptor);
 const error=Error('original rejection');class Reject{flush(){return Promise.reject(error);}}const rejected=observerState(),restoreRejected=observeOriginalFlush(Reject,rejected);try{await assert.rejects(new Reject().flush(),e=>e===error);assert.equal(rejected.flushRejected,1);assert.equal(rejected.pendingFlushes,0);}finally{restoreRejected();}
 class Throws{flush(){throw error;}}const thrown=observerState(),restoreThrown=observeOriginalFlush(Throws,thrown);try{assert.throws(()=>new Throws().flush(),e=>e===error);assert.equal(thrown.flushThrows,1);assert.equal(thrown.pendingFlushes,0);}finally{restoreThrown();}
 });
