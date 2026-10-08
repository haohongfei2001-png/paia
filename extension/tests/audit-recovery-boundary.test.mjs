import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {recoveryDraftPrefix} from '../core/recovery-draft.js';
import {BackupService} from './harness/historical-backup.mjs';
import {exported} from './harness/backup-v081.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {admitPreGatePurgeFixture} from './harness/pre-gate-purge-fixture.mjs';

test('audit recovery uses the production worker: purge, stale replay, both race orders and ownership',{timeout:20000},async t=>{
 globalThis.indexedDB=new IDBFactory();globalThis.IDBKeyRange=IDBKeyRange;
 const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`,ui={id,url:origin+'ui/archive.html'};
 let listener,data={},pauseSet=null,pauseRemove=null,pauseRead=null,failRemove=false,networkCalls=0;
 globalThis.fetch=async()=>{networkCalls++;throw Error('Unexpected network')};
 const area={setAccessLevel:async()=>{},get:async keys=>{if(keys===null&&pauseRead)await pauseRead();return keys===null?structuredClone(data):Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in data).map(k=>[k,structuredClone(data[k])]));},
  set:async values=>{if(pauseSet&&Object.keys(values).some(k=>k.startsWith(recoveryDraftPrefix)))await pauseSet();Object.assign(data,structuredClone(values));},
  remove:async keys=>{const list=Array.isArray(keys)?keys:[keys];if(list.some(k=>k.startsWith(recoveryDraftPrefix))){if(failRemove)throw Error('Synthetic storage failure');if(pauseRemove)await pauseRemove();}for(const k of list)delete data[k];},getBytesInUse:async()=>0};
 globalThis.chrome={runtime:{id,getManifest:()=>({version:'0.12.0'}),getURL:path=>origin+path,sendMessage:async()=>{},onMessage:{addListener:fn=>listener=fn}},storage:{local:area}};
 await import('../background/service-worker.js');
 const send=(message,sender=ui)=>new Promise(resolve=>listener(message,sender,resolve));
 const rpc=async(type,fields={},sender=ui)=>{const reply=await send({type,...fields},sender);assert.equal(reply.ok,true,JSON.stringify(reply));return reply.data;};
 const make=async label=>{
  const chat='audit-'+label,url='https://chatgpt.com/c/'+chat,content={id,url,frameId:0,tab:{id:23,url,incognito:false}},status=await rpc('GET_STATUS',{},content);
  await rpc('CAPTURE',{epoch:status.epoch,adapterVersion:'0.3.0',contentVersion:'0.12.0',chat:{id:chat,url,title:'Synthetic '+label},messages:[{sourceMessageId:'message-'+label,pageOrder:1,originalText:'SYNTHETIC '+label}]},content);
  const state=await rpc('GET_STATE'),source=state.records.find(r=>r.chatId===chat),block=state.library.blocks.find(b=>b.sourceRecordId===source.id);
  const draft={epoch:state.recoveryEpoch,kind:'document',ownerId:block.documentId,token:'audit-token-'+label,operation:{type:'EDIT_DOCUMENT',edit:{operationId:'audit-edit-'+label,documentId:block.documentId,blocks:[{id:block.id,expectedRevision:block.revision,libraryText:source.originalText,note:'',excluded:false}]}}};
  return {source,block,draft,content};
 };
 const load=draft=>rpc('PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:draft.kind,ownerId:draft.ownerId,epoch:draft.epoch}});
 const save=draft=>rpc('PAIA_RECOVERY_DRAFT_SAVE',{draft});
 const historicalStore=new OrganizerStore(area,{indexedDB:globalThis.indexedDB});
 const historical=async source=>{
  // Finish real previously queued capture/search/purge work before measuring
  // zero effects; unrelated maintenance must not contaminate this boundary.
  await historicalStore.drainPurgeCleanup();await historicalStore.drainInvalidations();await historicalStore.drainLibraryMaintenance();
  assert.equal((await send({type:'PURGE_SOURCE',id:source.id,confirm:true})).error,'SOURCE_PURGE_OWNER_GATE');await admitPreGatePurgeFixture(historicalStore,source.id);
 };
 const latch=()=>{let entered,release;const started=new Promise(r=>entered=r),pending=new Promise(r=>release=r);return {started,release,wait:()=>{entered();return pending;}};};
 assert.equal((await send({type:'PAIA_RECOVERY_DRAFT_SAVE',draft:{}})).error,'CONSENT_REQUIRED');
 await rpc('CONSENT',{accepted:true});
 await t.test('stale post-purge save and previously persisted legacy row cannot retain purged plaintext',async()=>{
  const {source,draft,content}=await make('stale'),saved=await save(draft);
  assert.equal((await send({type:'PAIA_RECOVERY_DRAFT_SAVE',draft},content)).error,'FORBIDDEN');
  assert.deepEqual(saved.sourceRecordIds,[source.id]);
  await historical(source);assert.equal(await load(draft),null);
  assert.equal((await send({type:'PAIA_RECOVERY_DRAFT_SAVE',draft})).error,'INVALID_REQUEST');assert.equal(await load(draft),null);
  data[recoveryDraftPrefix+'document:'+draft.ownerId]=saved;
  assert.equal(await load(draft),null);assert.equal(Object.hasOwn(data,recoveryDraftPrefix+'document:'+draft.ownerId),false);
  assert.equal((await send(draft.operation)).ok,false);assert.equal((await rpc('GET_STATE')).records.some(r=>r.id===source.id),false);
 });
 await t.test('save in progress completes before mixed purge refuses; draft is never cleared',async()=>{
  const {source,draft}=await make('save-first'),gate=latch();pauseSet=gate.wait;
  const saving=save(draft);await gate.started;let done=false;const purging=send({type:'PURGE_SOURCE',id:source.id,confirm:true}).then(reply=>{done=true;return reply;});
  await new Promise(r=>setTimeout(r,10));assert.equal(done,false);pauseSet=null;gate.release();const saved=await saving;assert.equal((await purging).error,'SOURCE_PURGE_OWNER_GATE');assert.deepEqual(await load(draft),saved);assert.ok((await rpc('GET_STATE')).records.some(r=>r.id===source.id));
 });
 await t.test('save arriving during purge clear cannot refill the cleared cache',async()=>{
  const {source,draft}=await make('purge-first');const saved=await save(draft);
  assert.equal((await send({type:'PURGE_SOURCE',id:source.id,confirm:true})).error,'SOURCE_PURGE_OWNER_GATE');assert.deepEqual(await load(draft),saved);
  // Explicit user discard is separate from purge; retain the original fixture.
  await rpc('PAIA_RECOVERY_DRAFT_CLEAR',{draft:{kind:draft.kind,ownerId:draft.ownerId,token:draft.token}});
  const gate=latch();pauseRead=gate.wait;const purging=rpc('PURGE_SOURCE',{id:source.id,confirm:true});await gate.started;
  let done=false;const saving=send({type:'PAIA_RECOVERY_DRAFT_SAVE',draft}).then(reply=>{done=true;return reply;});
  await new Promise(r=>setTimeout(r,10));assert.equal(done,false);pauseRead=null;gate.release();await purging;
  assert.equal((await saving).error,'INVALID_REQUEST');assert.equal(await load(draft),null);
 });
 await t.test('failed recovery clear prevents purge and remains retryable',async()=>{
  const {source,draft}=await make('clear-failure');await save(draft);failRemove=true;
  assert.equal((await send({type:'PURGE_SOURCE',id:source.id,confirm:true})).error,'SOURCE_PURGE_OWNER_GATE');
  assert.ok((await rpc('GET_STATE')).records.some(r=>r.id===source.id));assert.ok(await load(draft));
  assert.equal((await send({type:'PAIA_RECOVERY_DRAFT_CLEAR',draft:{kind:draft.kind,ownerId:draft.ownerId,token:draft.token}})).ok,false);failRemove=false;
  assert.ok(await load(draft));await rpc('PAIA_RECOVERY_DRAFT_CLEAR',{draft:{kind:draft.kind,ownerId:draft.ownerId,token:draft.token}});
  await rpc('PURGE_SOURCE',{id:source.id,confirm:true});assert.equal(await load(draft),null);
 });
 await t.test('legitimate and conflicted drafts survive; owner spoofing and missing targets fail closed',async()=>{
  const a=await make('legitimate'),b=await make('other');await save(a.draft);
  await rpc('EDIT_DOCUMENT',{edit:{...a.draft.operation.edit,operationId:'ordinary-new-edit',blocks:[{...a.draft.operation.edit.blocks[0],libraryText:'Newer canonical edit'}]}});
  await save(a.draft);assert.ok(await load(a.draft),'ordinary stale revision is retained for conflict comparison');
  const wrong=structuredClone(a.draft);wrong.ownerId=b.block.documentId;assert.equal((await send({type:'PAIA_RECOVERY_DRAFT_SAVE',draft:wrong})).error,'INVALID_REQUEST');
  wrong.operation.edit.documentId=wrong.ownerId;assert.equal((await send({type:'PAIA_RECOVERY_DRAFT_SAVE',draft:wrong})).error,'INVALID_REQUEST');
  const missing=structuredClone(a.draft);missing.operation.edit.blocks[0].id='missing-input';assert.equal((await send({type:'PAIA_RECOVERY_DRAFT_SAVE',draft:missing})).error,'INVALID_REQUEST');
  await save(b.draft);await historical(a.source);assert.ok(await load(b.draft),'unrelated draft retained');
 });
 await t.test('replace invalidates persisted and late old-snapshot drafts even when restored identities/revisions match',async()=>{
  const live=await make('restore-boundary'),old=structuredClone(live.draft);await save(old);
  assert.equal((await send({type:'PAIA_BACKUP_BEGIN_EXPORT'})).error,'FEATURE_UNAVAILABLE');
  const fixtureStore=new OrganizerStore(area,{indexedDB:globalThis.indexedDB});const items=await exported(new BackupService(fixtureStore));
  const stage=await rpc('PAIA_BACKUP_BEGIN_RESTORE');for(let at=0;at<items.length;at+=30)await rpc('PAIA_BACKUP_STAGE',{options:{sessionId:stage.sessionId,items:items.slice(at,at+30)}});
  const preview=await rpc('PAIA_BACKUP_PREVIEW',{options:{sessionId:stage.sessionId,mode:'replace'}});assert.equal(preview.canRestore,true,preview.reason);
  await rpc('PAIA_BACKUP_RESTORE',{options:{sessionId:stage.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true}});
  assert.equal((await send({type:'PAIA_RECOVERY_DRAFT_SAVE',draft:old})).error,'INVALID_REQUEST');
  assert.equal((await send({type:'PAIA_RECOVERY_DRAFT_LOAD',draft:{kind:old.kind,ownerId:old.ownerId,epoch:old.epoch}})).error,'INVALID_REQUEST');
  const freshEpoch=(await rpc('GET_PAGE',{page:{view:'settings'}})).recoveryEpoch;assert.notEqual(freshEpoch,old.epoch);
  assert.equal(await load({...old,epoch:freshEpoch}),null);
  const current=await rpc('GET_INPUT',{id:live.block.id});assert.equal(current.revision,old.operation.edit.blocks[0].expectedRevision);assert.equal(current.recoveryEpoch,freshEpoch);
  await save({...old,epoch:freshEpoch});assert.ok(await load({...old,epoch:freshEpoch}),'fresh post-restore read supports new draft');
 });
 assert.equal(networkCalls,0);
});
