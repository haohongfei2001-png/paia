import {assertRetiredContext} from './harness/retired-context.mjs';
import {admitPreGatePurgeFixture} from './harness/pre-gate-purge-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,local,capture,derived,inputEdit} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {MemoryService} from '../core/memory/service.js';
import {key,validateMemoryRow} from '../core/memory/model.js';
import {BackupService} from './harness/historical-backup.mjs';
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

test("Current retirement / historical scenario: Round 8 Context: unorganized Input is fail-closed by default and explicit opt-in makes only that local Input retrievable",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "settings", "action": "create", "variant": "allowed", "payload": {"includeUnorganizedInputs": true}});
});

test("Current retirement / historical scenario: Round 8 Context: an Input represented by a Thought never bypasses denied/default Topic authorization through the direct-input path",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "inputCandidate", "action": "create", "variant": "denied"});
});

test("Current retirement / historical scenario: Round 8 Context: remove and restore cannot turn a previously represented denied Input into an unorganized bypass",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "build", "action": "create", "variant": "removed"});
});

test("Current retirement / historical scenario: Round 8 Context: Smart Filter, user removal and direct-input exclusion all fail closed and exclusion is reversible",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "build", "action": "create", "variant": "excluded"});
});

test("Current retirement / historical scenario: Round 8 Context: activity stores only IDs and query digest for direct Input, never query or body plaintext",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "share", "action": "share", "variant": "allowed"});
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
  await assert.rejects(next.build({query:'ROUND8_LEGACY_INPUT'}),{code:'FEATURE_UNAVAILABLE'});
  const stored=await s.repository.transaction(false,t=>t.get('meta','memory:config'));
  assert.equal(stored.includeUnorganizedInputs,false);
});

test("Current retirement / historical scenario: Round 8 Context: editing a direct Input after preview makes sharing stale rather than publishing old content",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "share", "action": "share", "variant": "edited"});
});


test('Round 8 Context: Settings can clear all direct-Input exclusions without changing Topic authorization',async()=>{
  const {s,m,input}=await fixture({text:'ROUND8_CLEAR_INPUT_EXCLUSION visible after restore-all'});
  // Synthetic legacy opt-in metadata, not a current user capability.
  await m.ready();await s.repository.transaction(true,async t=>{const c=await t.get('meta','memory:config');await t.put('meta',{...c,includeUnorganizedInputs:true});});
  await m.exclude({inputId:input.id,excluded:true});
  assert.equal((await m.status()).excludedInputs,1);
  await assert.rejects(m.build({query:'ROUND8_CLEAR_INPUT_EXCLUSION'}),{code:'FEATURE_UNAVAILABLE'});
  await m.settings({clearInputExclusions:true});
  assert.equal((await m.status()).excludedInputs,0);
  await assert.rejects(m.build({query:'ROUND8_CLEAR_INPUT_EXCLUSION'}),{code:'FEATURE_UNAVAILABLE'});assert.equal((await m.status()).excludedInputs,0);
});

test('Round 8 Context: direct-Input exclusion and opt-in survive Backup restore without persisting a preview',async()=>{
  const {s,m,input}=await fixture({text:'ROUND8_BACKUP_DIRECT_INPUT should remain excluded'});
  // Synthetic legacy opt-in metadata, not a current user capability.
  await m.ready();await s.repository.transaction(true,async t=>{const c=await t.get('meta','memory:config');await t.put('meta',{...c,includeUnorganizedInputs:true});});
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
  await assert.rejects(restored.build({query:'ROUND8_BACKUP_DIRECT_INPUT'}),{code:'FEATURE_UNAVAILABLE'});
});

test('CURRENT B-02 refusal + historical fixture: Round 8 Context: purging a Source also removes its now-meaningless direct-Input exclusion',async()=>{
  const {s,m,input}=await fixture({text:'ROUND8_PURGE_INPUT exclusion must not dangle'});
  // Synthetic legacy opt-in metadata, not a current user capability.
  await m.ready();await s.repository.transaction(true,async t=>{const c=await t.get('meta','memory:config');await t.put('meta',{...c,includeUnorganizedInputs:true});});
  await m.exclude({inputId:input.id,excluded:true});
  assert.equal((await m.status()).excludedInputs,1);
  await admitPreGatePurgeFixture(s,input.sourceRecordId);
  await s.drainPurgeCleanup();
  await s.drainInvalidations();
  assert.equal((await m.status()).excludedInputs,0);
  const dangling=await s.repository.transaction(false,t=>t.get('meta',key('input',input.id)));
  assert.equal(dangling,undefined);
});
