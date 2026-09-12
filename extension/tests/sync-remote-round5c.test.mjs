import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  SyncCryptoError,
  canonicalPayloadHash,
  createDeviceIdentity,
  generateRootKeyMaterial,
  inspectRemoteObjectHeader,
  nextDeviceOperation,
  openRemoteObject,
  sealRemoteObject,
} from '../core/sync-crypto.js';
import {LocalRemoteObjectStore,LocalSyncDeviceSimulator,SyncSimulationError} from '../core/sync-simulator.js';
import {planSyncMerge} from '../core/sync-contract.js';

async function workingEnvelope(device,payload,{entityId='input:round5c',baseHash=null}={}){
  return device.nextEnvelope({version:1,entityType:'working_input',entityId,payloadHash:await canonicalPayloadHash(payload),baseHash,factsHash:null,permanentTombstone:false});
}

test('Round 5C remote object hides entity/device/revision metadata and private payload from the simulated backend',async()=>{
  const rootKey=generateRootKeyMaterial(),device=new LocalSyncDeviceSimulator({rootKey}),store=new LocalRemoteObjectStore();
  const payload={body:'private sync text',title:'private title',nested:{note:'private note'}};
  const envelope=await workingEnvelope(device,payload,{entityId:'input:secret-item'});
  const uploaded=await device.upload(store,{syncEnvelope:envelope,payload});
  const serialized=JSON.stringify(uploaded.remoteObject);
  for(const secret of ['private sync text','private title','private note','input:secret-item',envelope.deviceId,envelope.operationId])assert.equal(serialized.includes(secret),false,secret);
  assert.deepEqual(Object.keys(inspectRemoteObjectHeader(uploaded.remoteObject)).sort(),['cipher','kdf','keyVersion','nonce','objectId','protocolVersion','salt'].sort());
  const [opened]=await device.download(store);
  assert.deepEqual(opened.payload,payload);
  assert.equal(opened.syncEnvelope.entityId,'input:secret-item');
});

test('Round 5C AES-GCM fails closed for wrong root key, ciphertext tampering and authenticated-header tampering',async()=>{
  const rootKey=generateRootKeyMaterial(),wrongKey=generateRootKeyMaterial(),device=new LocalSyncDeviceSimulator({rootKey});
  const payload={body:'authenticated'};
  const envelope=await workingEnvelope(device,payload);
  const remoteObject=await sealRemoteObject({rootKey,syncEnvelope:envelope,payload});
  await assert.rejects(()=>openRemoteObject({rootKey:wrongKey,remoteObject}),e=>e instanceof SyncCryptoError&&e.code==='SYNC_DECRYPT_FAILED');
  const flipped=remoteObject.ciphertext[0]==='A'?'B':'A';
  await assert.rejects(()=>openRemoteObject({rootKey,remoteObject:{...remoteObject,ciphertext:flipped+remoteObject.ciphertext.slice(1)}}),e=>e instanceof SyncCryptoError&&e.code==='SYNC_DECRYPT_FAILED');
  await assert.rejects(()=>openRemoteObject({rootKey,remoteObject:{...remoteObject,objectId:'object_tampered_123456'}}),e=>e instanceof SyncCryptoError&&e.code==='SYNC_DECRYPT_FAILED');
});

test('Round 5C encrypted payload is semantically bound to the Round 5B hash contract before upload',async()=>{
  const rootKey=generateRootKeyMaterial(),device=new LocalSyncDeviceSimulator({rootKey});
  const payload={body:'actual body'};
  const wrongEnvelope=device.nextEnvelope({version:1,entityType:'working_input',entityId:'input:hash-bound',payloadHash:await canonicalPayloadHash({body:'different body'}),baseHash:null,factsHash:null,permanentTombstone:false});
  await assert.rejects(()=>sealRemoteObject({rootKey,syncEnvelope:wrongEnvelope,payload}),e=>e instanceof SyncCryptoError&&e.code==='SYNC_PAYLOAD_HASH_MISMATCH');

  const immutable={original:'source body'},facts={sentAt:'2026-01-01T00:00:00Z'};
  const source=device.nextEnvelope({version:1,entityType:'source_record',entityId:'source:hash-bound',payloadHash:await canonicalPayloadHash(immutable),baseHash:null,factsHash:await canonicalPayloadHash(facts),permanentTombstone:false});
  const sealed=await sealRemoteObject({rootKey,syncEnvelope:source,payload:{immutable,facts}});
  assert.deepEqual((await openRemoteObject({rootKey,remoteObject:sealed})).payload,{immutable,facts});
  await assert.rejects(()=>sealRemoteObject({rootKey,syncEnvelope:source,payload:{immutable,facts:{sentAt:'wrong'}}}),e=>e instanceof SyncCryptoError&&e.code==='SYNC_FACTS_HASH_MISMATCH');
});

test('Round 5C device identity is random per installation and sequence is local replay metadata only',()=>{
  const first=createDeviceIdentity(),second=createDeviceIdentity();
  assert.notEqual(first.deviceId,second.deviceId);
  assert.equal(first.sequence,0);
  const one=nextDeviceOperation(first),two=nextDeviceOperation(one.state);
  assert.equal(one.operation.deviceSequence,1);
  assert.equal(two.operation.deviceSequence,2);
  assert.equal(one.operation.deviceId,two.operation.deviceId);
  assert.notEqual(one.operation.operationId,two.operation.operationId);
  const simulator=new LocalSyncDeviceSimulator({rootKey:generateRootKeyMaterial(),identity:two.state});
  const before=simulator.identity.deviceId,after=simulator.reinstallIdentity();
  assert.notEqual(after.deviceId,before);
  assert.equal(after.sequence,0);
});

test('Round 5C local remote store is opaque/idempotent by objectId and rejects objectId collisions',async()=>{
  const rootKey=generateRootKeyMaterial(),device=new LocalSyncDeviceSimulator({rootKey}),store=new LocalRemoteObjectStore();
  const payload={body:'one'},envelope=await workingEnvelope(device,payload);
  const first=await device.seal({syncEnvelope:envelope,payload,objectId:'object_collision_test_1'});
  assert.equal(store.put(first).status,'stored');
  assert.equal(store.put({...first}).status,'duplicate');
  const otherPayload={body:'two'},otherEnvelope=await workingEnvelope(device,otherPayload);
  const second=await device.seal({syncEnvelope:otherEnvelope,payload:otherPayload,objectId:'object_collision_test_1'});
  assert.throws(()=>store.put(second),e=>e instanceof SyncSimulationError&&e.code==='SYNC_REMOTE_OBJECT_COLLISION');
  assert.equal(store.size,1);
});

test('Round 5C two-device local simulation decrypts shared remote objects but preserves concurrent human-edit conflict',async()=>{
  const rootKey=generateRootKeyMaterial(),store=new LocalRemoteObjectStore();
  const a=new LocalSyncDeviceSimulator({rootKey}),b=new LocalSyncDeviceSimulator({rootKey});
  const ancestorPayload={body:'ancestor'},ancestor=await workingEnvelope(a,ancestorPayload,{entityId:'input:shared'});
  await a.upload(store,{syncEnvelope:ancestor,payload:ancestorPayload});
  const [fromA]=await b.download(store);
  assert.equal(fromA.syncEnvelope.payloadHash,ancestor.payloadHash);

  const aPayload={body:'edit from A'},bPayload={body:'edit from B'};
  const aEdit=await workingEnvelope(a,aPayload,{entityId:'input:shared',baseHash:ancestor.payloadHash});
  const bEdit=await workingEnvelope(b,bPayload,{entityId:'input:shared',baseHash:ancestor.payloadHash});
  await a.upload(store,{syncEnvelope:aEdit,payload:aPayload});
  await b.upload(store,{syncEnvelope:bEdit,payload:bPayload});
  const conflict=planSyncMerge({local:aEdit,remote:bEdit});
  assert.equal(conflict.action,'conflict');
  assert.equal(conflict.reason,'concurrent_human_edits');
  assert.equal(conflict.resolution,'user_required');
  assert.equal((await a.download(store)).length,3);
});

test('Round 5C body-free permanent tombstone encrypts/decrypts and still dominates a stale Source object',async()=>{
  const rootKey=generateRootKeyMaterial(),store=new LocalRemoteObjectStore();
  const a=new LocalSyncDeviceSimulator({rootKey}),b=new LocalSyncDeviceSimulator({rootKey});
  const immutable={original:'source body'},facts={sentAt:'2026-01-01T00:00:00Z'},sourcePayload={immutable,facts};
  const source=a.nextEnvelope({version:1,entityType:'source_record',entityId:'source:shared',payloadHash:await canonicalPayloadHash(immutable),baseHash:null,factsHash:await canonicalPayloadHash(facts),permanentTombstone:false});
  const tombstone=b.nextEnvelope({version:1,entityType:'source_record',entityId:'source:shared',payloadHash:null,baseHash:null,factsHash:null,permanentTombstone:true});
  await a.upload(store,{syncEnvelope:source,payload:sourcePayload});
  await b.upload(store,{syncEnvelope:tombstone,payload:null});
  const opened=await a.download(store),deleted=opened.find(item=>item.syncEnvelope.permanentTombstone);
  assert.equal(deleted.payload,null);
  assert.equal(planSyncMerge({local:source,remote:tombstone}).action,'permanent_tombstone_wins');
  assert.equal(JSON.stringify(store.list()).includes('source body'),false);
});

test('Round 5C protocol/simulator contain no network, persistent storage, account or backend implementation',async()=>{
  const cryptoSource=await readFile(new URL('../core/sync-crypto.js',import.meta.url),'utf8');
  const simulatorSource=await readFile(new URL('../core/sync-simulator.js',import.meta.url),'utf8');
  const source=cryptoSource+'\n'+simulatorSource;
  assert.equal(/fetch\s*\(|XMLHttpRequest|WebSocket|indexedDB|chrome\.storage|localStorage|supabase|firebase|icloud|google drive/i.test(source),false);
  assert.equal(/password|email|hardwareSerial|machineName/i.test(source),false);
});
