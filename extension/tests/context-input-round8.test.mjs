import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,local,capture,derived,inputEdit} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {MemoryService} from '../core/memory/service.js';
import {key,validateMemoryRow} from '../core/memory/model.js';
import {BackupService} from '../core/backup-service.js';
import {exported,prepared} from './harness/backup-v081.mjs';

async function fixture({text='ROUND8_DIRECT_INPUT unique reusable input'}={}){
  const {s}=await setup(OrganizerStore);
  await s.setFilterMode('off');
  const first=(await s.snapshot()).library.blocks[0];
  await inputEdit(s,first.id,{libraryText:text});
  const session=local();
  const m=new MemoryService(s,{session});
  return {s,m,session,input:await s.input(first.id)};
}

async function placeDerived(s,inputId,{topicName='Private topic',body='Derived thought'}={}){
  const e=await derived(s,[inputId],{body});
  const topic=await s.createTopic({operationId:crypto.randomUUID(),name:topicName});
  await s.placeEntry({operationId:crypto.randomUUID(),topicId:topic.id,entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision});
  return {e,topic};
}

test('Round 8 Context: unorganized Input is fail-closed by default and explicit opt-in makes only that local Input retrievable',async()=>{
  const {m,input}=await fixture();
  assert.equal((await m.status()).config.includeUnorganizedInputs,false);
  assert.equal((await m.build({query:'ROUND8_DIRECT_INPUT'})).items.length,0);
  await m.settings({includeUnorganizedInputs:true});
  const p=await m.build({query:'ROUND8_DIRECT_INPUT'});
  assert.equal(p.items.length,1);
  assert.equal(p.items[0].kind,'input');
  assert.equal(p.items[0].inputId,input.id);
  assert.equal(p.items[0].topicId,'input-archive');
  assert.match(p.text,/ROUND8_DIRECT_INPUT/);
  assert.equal(p.localOnly,true);
});

test('Round 8 Context: an Input represented by a Thought never bypasses denied/default Topic authorization through the direct-input path',async()=>{
  const {s,m,input}=await fixture({text:'ROUND8_DENY_BYPASS protected input'});
  const {topic}=await placeDerived(s,input.id,{topicName:'Denied topic',body:'ROUND8_DENY_BYPASS represented Thought'});
  await m.settings({includeUnorganizedInputs:true});
  assert.equal((await m.build({query:'ROUND8_DENY_BYPASS'})).items.length,0);
  await m.authorize({topicIds:[topic.id],decision:'denied'});
  const denied=await m.build({query:'ROUND8_DENY_BYPASS'});
  assert.equal(denied.items.length,0);
  assert.doesNotMatch(denied.text,/ROUND8_DENY_BYPASS/);
  await m.authorize({topicIds:[topic.id],decision:'allowed'});
  const allowed=await m.build({query:'ROUND8_DENY_BYPASS'});
  assert.ok(allowed.items.length>0);
  assert.ok(allowed.items.every(x=>x.kind==='entry'));
  assert.ok(allowed.items.every(x=>x.inputId===undefined));
});

test('Round 8 Context: remove and restore cannot turn a previously represented denied Input into an unorganized bypass',async()=>{
  const {s,m,input}=await fixture({text:'ROUND8_RESTORE_DENIED represented input'});
  const {topic}=await placeDerived(s,input.id,{topicName:'Denied restore topic',body:'ROUND8_RESTORE_DENIED represented Thought'});
  await m.settings({includeUnorganizedInputs:true});
  await m.authorize({topicIds:[topic.id],decision:'denied'});
  await s.excludeLibrary(input.id,true);
  await s.drainInvalidations();
  await s.excludeLibrary(input.id,false);
  await s.drainInvalidations();
  const preview=await m.build({query:'ROUND8_RESTORE_DENIED'});
  assert.equal(preview.items.length,0);
  assert.doesNotMatch(preview.text,/ROUND8_RESTORE_DENIED/);
});

test('Round 8 Context: Smart Filter, user removal and direct-input exclusion all fail closed and exclusion is reversible',async()=>{
  const {s,m}=await fixture({text:'ROUND8_VISIBLE_DIRECT active input'});
  const epoch=(await s.status()).epoch;
  await s.capture(capture(epoch,'round8-filtered','继续'));
  await s.setFilterMode('light');
  await s.evaluateFilters({limit:100});
  await m.settings({includeUnorganizedInputs:true});
  assert.equal((await m.build({query:'继续'})).items.length,0);
  await s.setFilterMode('off');
  const blocks=(await s.snapshot()).library.blocks;
  const visible=blocks.find(x=>(x.libraryText||'').includes('ROUND8_VISIBLE_DIRECT'));
  await s.excludeLibrary(visible.id,true);
  assert.equal((await m.build({query:'ROUND8_VISIBLE_DIRECT'})).items.length,0);
  await s.excludeLibrary(visible.id,false);
  let p=await m.build({query:'ROUND8_VISIBLE_DIRECT'});
  assert.equal(p.items[0].inputId,visible.id);
  await m.exclude({inputId:visible.id,excluded:true});
  assert.equal((await m.status()).excludedInputs,1);
  assert.equal((await m.build({query:'ROUND8_VISIBLE_DIRECT'})).items.length,0);
  await m.exclude({inputId:visible.id,excluded:false});
  p=await m.build({query:'ROUND8_VISIBLE_DIRECT'});
  assert.equal(p.items[0].inputId,visible.id);
});

test('Round 8 Context: activity stores only IDs and query digest for direct Input, never query or body plaintext',async()=>{
  const {s,m,input}=await fixture({text:'ROUND8_ACTIVITY_BODY secret body marker'});
  await m.settings({includeUnorganizedInputs:true});
  const query='ROUND8_ACTIVITY_BODY PRIVATE_QUERY_SENTINEL';
  const p=await m.build({query});
  await m.share({previewId:p.previewId,format:'copy'});
  const rows=await s.run(()=>s.repository.transaction(false,t=>t.all('meta'))),memory=rows.filter(r=>String(r.id).startsWith('memory:'));
  const serialized=JSON.stringify(memory);
  assert.doesNotMatch(serialized,/PRIVATE_QUERY_SENTINEL|secret body marker/);
  const activity=memory.filter(r=>r.kind==='activity');
  assert.ok(activity.some(r=>r.inputIds?.includes(input.id)));
  assert.ok(activity.every(r=>/^[a-f0-9]{64}$/.test(r.queryDigest)));
});

test('Round 8 Context: legacy config backfills includeUnorganizedInputs=false atomically and never loosens access',async()=>{
  const {s,m}=await fixture({text:'ROUND8_LEGACY_INPUT should remain denied'});
  await m.ready();
  const old=await s.repository.transaction(false,t=>t.get('meta','memory:config'));
  delete old.includeUnorganizedInputs;
  assert.equal(validateMemoryRow(old),true);
  await s.repository.transaction(true,t=>t.put('meta',old));
  const next=new MemoryService(s,{session:local()});
  const status=await next.status();
  assert.equal(status.config.includeUnorganizedInputs,false);
  assert.equal((await next.build({query:'ROUND8_LEGACY_INPUT'})).items.length,0);
  const stored=await s.repository.transaction(false,t=>t.get('meta','memory:config'));
  assert.equal(stored.includeUnorganizedInputs,false);
});

test('Round 8 Context: editing a direct Input after preview makes sharing stale rather than publishing old content',async()=>{
  const {s,m,input}=await fixture({text:'ROUND8_STALE_INPUT version one'});
  await m.settings({includeUnorganizedInputs:true});
  const p=await m.build({query:'ROUND8_STALE_INPUT'});
  await inputEdit(s,input.id,{libraryText:'ROUND8_STALE_INPUT version two'});
  await assert.rejects(m.share({previewId:p.previewId,format:'copy'}),e=>e.code==='MEMORY_STALE');
  const q=await m.build({query:'ROUND8_STALE_INPUT'});
  assert.match(q.text,/version two/);
  assert.doesNotMatch(q.text,/version one/);
});


test('Round 8 Context: Settings can clear all direct-Input exclusions without changing Topic authorization',async()=>{
  const {m,input}=await fixture({text:'ROUND8_CLEAR_INPUT_EXCLUSION visible after restore-all'});
  await m.settings({includeUnorganizedInputs:true});
  await m.exclude({inputId:input.id,excluded:true});
  assert.equal((await m.status()).excludedInputs,1);
  assert.equal((await m.build({query:'ROUND8_CLEAR_INPUT_EXCLUSION'})).items.length,0);
  await m.settings({clearInputExclusions:true});
  assert.equal((await m.status()).excludedInputs,0);
  const p=await m.build({query:'ROUND8_CLEAR_INPUT_EXCLUSION'});
  assert.equal(p.items.length,1);
  assert.equal(p.items[0].inputId,input.id);
});

test('Round 8 Context: direct-Input exclusion and opt-in survive Backup restore without persisting a preview',async()=>{
  const {s,m,input}=await fixture({text:'ROUND8_BACKUP_DIRECT_INPUT should remain excluded'});
  await m.settings({includeUnorganizedInputs:true});
  await m.exclude({inputId:input.id,excluded:true});
  const items=await exported(new BackupService(s,{appVersion:'0.11.1'}));
  const serialized=JSON.stringify(items.filter(x=>x.section==='organizationState'));
  assert.match(serialized,/\"kind\":\"input\"/);
  assert.doesNotMatch(serialized,/previewId|ROUND8_BACKUP_DIRECT_INPUT/);
  const {IDBFactory}=await import('./vendor/fake-indexeddb/build/esm/index.js');
  const target=new OrganizerStore(local(),{indexedDB:new IDBFactory()});
  await target.consent(true);await target.finishFoundation();
  const restore=new BackupService(target,{appVersion:'0.11.1'}),stage=await prepared(restore,items);
  assert.equal(stage.preview.canRestore,true);
  await restore.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity});
  const restored=new MemoryService(target,{session:local()}),status=await restored.status();
  assert.equal(status.config.includeUnorganizedInputs,true);
  assert.equal(status.excludedInputs,1);
  assert.equal((await restored.build({query:'ROUND8_BACKUP_DIRECT_INPUT'})).items.length,0);
});

test('Round 8 Context: purging a Source also removes its now-meaningless direct-Input exclusion',async()=>{
  const {s,m,input}=await fixture({text:'ROUND8_PURGE_INPUT exclusion must not dangle'});
  await m.settings({includeUnorganizedInputs:true});
  await m.exclude({inputId:input.id,excluded:true});
  assert.equal((await m.status()).excludedInputs,1);
  await s.permanentDelete(input.sourceRecordId);
  await s.drainPurgeCleanup();
  await s.drainInvalidations();
  assert.equal((await m.status()).excludedInputs,0);
  const dangling=await s.repository.transaction(false,t=>t.get('meta',key('input',input.id)));
  assert.equal(dangling,undefined);
});
