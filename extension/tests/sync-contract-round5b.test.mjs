import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  SYNC_ENTITY_POLICY,
  SyncContractError,
  isSyncableEntity,
  planSyncMerge,
  replayDecision,
  syncPolicy,
  validateDeviceIdentity,
  validateSyncEnvelope,
} from '../core/sync-contract.js';

const hash=ch=>ch.repeat(64);
const base=(overrides={})=>({
  version:1,
  entityType:'working_input',
  entityId:'input:abc12345',
  payloadHash:hash('a'),
  baseHash:null,
  deviceId:'device_A1',
  deviceSequence:1,
  operationId:'operation_A1',
  ...overrides,
});

test('Round 5B sync scope excludes derived/device-local state and keeps canonical user work explicit',()=>{
  assert.equal(syncPolicy('source_record'),'sync_source_facts');
  assert.equal(syncPolicy('working_input'),'sync_human_work');
  assert.equal(syncPolicy('thought_user'),'sync_human_work');
  assert.equal(syncPolicy('ai_projection'),'rebuild_local');
  assert.equal(syncPolicy('search_index'),'rebuild_local');
  assert.equal(syncPolicy('context_package'),'exclude_device_local');
  assert.equal(syncPolicy('passport_grant'),'exclude_device_local');
  assert.equal(syncPolicy('product_signals'),'exclude_device_local');
  assert.equal(syncPolicy('revisit_cursor'),'exclude_device_local');
  assert.equal(isSyncableEntity('working_input'),true);
  assert.equal(isSyncableEntity('ai_projection'),false);
  assert.equal(Object.isFrozen(SYNC_ENTITY_POLICY),true);
});

test('Round 5B source merge is enrichment-only, immutable-body mismatch conflicts, and body-free permanent tombstone wins',()=>{
  const local=base({entityType:'source_record',entityId:'source:stable123',payloadHash:hash('a'),factsHash:hash('b'),baseHash:null});
  const remote=base({entityType:'source_record',entityId:'source:stable123',payloadHash:hash('a'),factsHash:hash('c'),baseHash:null,deviceId:'device_B1',deviceSequence:2,operationId:'operation_B1'});
  assert.deepEqual(planSyncMerge({local,remote}),{
    action:'merge_source_facts',entityType:'source_record',entityId:'source:stable123',originalHash:hash('a'),rule:'enrich_only_use_source_evidence_arbiter'
  });
  const mismatch={...remote,payloadHash:hash('d')};
  const conflict=planSyncMerge({local,remote:mismatch});
  assert.equal(conflict.action,'conflict');
  assert.equal(conflict.reason,'immutable_source_mismatch');
  assert.equal(conflict.resolution,'user_required');
  const tombstone={...remote,payloadHash:null,factsHash:null,permanentTombstone:true};
  assert.equal(planSyncMerge({local,remote:tombstone}).action,'permanent_tombstone_wins');
  assert.equal(validateSyncEnvelope(tombstone).payloadHash,null);
  assert.throws(()=>validateSyncEnvelope({...tombstone,payloadHash:hash('a')}),e=>e instanceof SyncContractError&&e.code==='SYNC_TOMBSTONE_BODY_FORBIDDEN');
});

test('Round 5B human work only fast-forwards with ancestry proof and never latest-write-wins concurrent edits',()=>{
  const ancestor=base({payloadHash:hash('a'),baseHash:hash('0')});
  const remoteChild=base({payloadHash:hash('b'),baseHash:hash('a'),deviceId:'device_B1',deviceSequence:9,operationId:'operation_B1'});
  assert.equal(planSyncMerge({local:ancestor,remote:remoteChild}).action,'accept_remote_fast_forward');
  assert.equal(planSyncMerge({local:remoteChild,remote:ancestor}).action,'keep_local_fast_forward');

  const localFork=base({payloadHash:hash('b'),baseHash:hash('a'),deviceSequence:2});
  const remoteFork=base({payloadHash:hash('c'),baseHash:hash('a'),deviceId:'device_B1',deviceSequence:999,operationId:'operation_B1'});
  const fork=planSyncMerge({local:localFork,remote:remoteFork});
  assert.equal(fork.action,'conflict');
  assert.equal(fork.reason,'concurrent_human_edits');
  assert.equal(fork.resolution,'user_required');
  assert.equal(fork.local.payloadHash,hash('b'));
  assert.equal(fork.remote.payloadHash,hash('c'));
});

test('Round 5B unproven ancestry conflicts and identical payloads dedupe without relying on wall-clock time',()=>{
  const local=base({payloadHash:hash('b'),baseHash:hash('a')});
  const remote=base({payloadHash:hash('c'),baseHash:hash('d'),deviceId:'device_B1',deviceSequence:100000,operationId:'operation_B1'});
  assert.equal(planSyncMerge({local,remote}).reason,'ancestry_unproven');
  assert.equal(planSyncMerge({local,remote:{...remote,payloadHash:hash('b')}}).action,'equivalent');
});

test('Round 5B operation idempotence requires the exact same envelope and rejects operation-id collisions',()=>{
  const local=base();
  assert.equal(planSyncMerge({local,remote:{...local}}).action,'duplicate_operation');
  assert.throws(()=>planSyncMerge({local,remote:{...local,payloadHash:hash('b')}}),e=>e instanceof SyncContractError&&e.code==='SYNC_OPERATION_COLLISION');
  assert.throws(()=>planSyncMerge({local,remote:{...local,deviceSequence:2}}),e=>e instanceof SyncContractError&&e.code==='SYNC_OPERATION_COLLISION');
});

test('Round 5B envelopes are metadata-only and reject raw private text or tombstones outside immutable Source',()=>{
  assert.throws(()=>validateSyncEnvelope({...base(),text:'private'}),e=>e instanceof SyncContractError&&e.code==='SYNC_PLAINTEXT_FORBIDDEN');
  assert.throws(()=>validateSyncEnvelope({...base(),title:'private'}),e=>e instanceof SyncContractError&&e.code==='SYNC_PLAINTEXT_FORBIDDEN');
  assert.throws(()=>validateSyncEnvelope({...base(),payloadHash:null,permanentTombstone:true}),e=>e instanceof SyncContractError&&e.code==='SYNC_TOMBSTONE_SCOPE');
  assert.throws(()=>validateSyncEnvelope({...base({entityType:'source_record',entityId:'source:stable123'}),baseHash:hash('a')}),e=>e instanceof SyncContractError&&e.code==='SYNC_SOURCE_MUTATION');
});

test('Round 5B device sequence prevents replay only; it is not a conflict-resolution clock',()=>{
  assert.deepEqual(validateDeviceIdentity({deviceId:'device_A1',sequence:7}),{deviceId:'device_A1',sequence:7});
  const incoming=base({deviceSequence:7});
  assert.equal(replayDecision({lastAcceptedSequence:7,incoming}).action,'ignore_replay');
  assert.equal(replayDecision({lastAcceptedSequence:6,incoming}).action,'accept_sequence');
  const local=base({payloadHash:hash('b'),baseHash:hash('a'),deviceSequence:1});
  const remote=base({payloadHash:hash('c'),baseHash:hash('a'),deviceId:'device_B1',deviceSequence:999999,operationId:'operation_B1'});
  assert.equal(planSyncMerge({local,remote}).action,'conflict');
});

test('Round 5B contract is backend-neutral and introduces no network, storage or crypto transport implementation',async()=>{
  const source=await readFile(new URL('../core/sync-contract.js',import.meta.url),'utf8');
  assert.equal(/fetch\s*\(|XMLHttpRequest|WebSocket|chrome\.storage|indexedDB|supabase|firebase|icloud/i.test(source),false);
  assert.equal(/Date\.now|modifiedAt|updatedAt|lastWrite/i.test(source),false);
});
