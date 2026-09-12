import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  LocalSyncKeyring,
  LocalTrustedDeviceCredential,
  PendingTrustedDeviceOnboarding,
  SyncKeyManagementError,
  TrustedDeviceRegistry,
  confirmTrustedDeviceOnboarding,
  createRecoveryKit,
  createTrustedDeviceOnboardingPackage,
  recoverKeyring,
} from '../core/sync-key-management.js';
import {canonicalPayloadHash,createDeviceIdentity,nextDeviceOperation} from '../core/sync-crypto.js';

async function envelopeFactory(prefix='device'){
  let state=createDeviceIdentity();
  return async(payload,{entityId='input:round5d',baseHash=null}={})=>{
    const next=nextDeviceOperation(state);state=next.state;
    return {
      version:1,
      entityType:'working_input',
      entityId,
      payloadHash:await canonicalPayloadHash(payload),
      baseHash,
      factsHash:null,
      permanentTombstone:false,
      ...next.operation,
    };
  };
}

function flipBase64url(value){
  const first=value[0]==='A'?'B':'A';
  return first+value.slice(1);
}

test('Round 5D keyring keeps historical versions and selects remote-object keyVersion after rotation',async()=>{
  const keyring=new LocalSyncKeyring(),makeEnvelope=await envelopeFactory();
  const firstPayload={body:'version one'},firstEnvelope=await makeEnvelope(firstPayload);
  const first=await keyring.seal({syncEnvelope:firstEnvelope,payload:firstPayload});
  assert.equal(first.keyVersion,1);
  assert.equal(keyring.rotate(),2);
  const secondPayload={body:'version two'},secondEnvelope=await makeEnvelope(secondPayload,{entityId:'input:round5d-2'});
  const second=await keyring.seal({syncEnvelope:secondEnvelope,payload:secondPayload});
  assert.equal(second.keyVersion,2);
  assert.deepEqual(keyring.versions(),[1,2]);
  assert.deepEqual((await keyring.open(first)).payload,firstPayload);
  assert.deepEqual((await keyring.open(second)).payload,secondPayload);
});

test('Round 5D trusted-device onboarding transfers the full keyring only after matching pairing code',async()=>{
  const inviterKeyring=new LocalSyncKeyring();inviterKeyring.rotate();
  const inviter=await LocalTrustedDeviceCredential.create(),joining=await LocalTrustedDeviceCredential.create();
  const session=await PendingTrustedDeviceOnboarding.begin(joining);
  const {onboardingPackage,pairingCode,joiningCredential}=await createTrustedDeviceOnboardingPackage({request:session.request,inviterCredential:inviter,keyring:inviterKeyring});
  assert.match(pairingCode,/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
  await assert.rejects(()=>session.accept({onboardingPackage,confirmedPairingCode:'0000-0000-0000'}),e=>e instanceof SyncKeyManagementError&&e.code==='SYNC_PAIRING_CODE_MISMATCH');
  const accepted=await session.accept({onboardingPackage,confirmedPairingCode:pairingCode});
  assert.deepEqual(accepted.keyring.versions(),[1,2]);
  assert.equal(accepted.keyring.currentVersion,2);
  assert.equal(accepted.inviterCredential.credentialId,inviter.publicCredential.credentialId);
  assert.equal(joiningCredential.credentialId,joining.publicCredential.credentialId);
  assert.deepEqual([...accepted.keyring.rootKeyFor(1)],[...inviterKeyring.rootKeyFor(1)]);
  assert.deepEqual([...accepted.keyring.rootKeyFor(2)],[...inviterKeyring.rootKeyFor(2)]);

  const inviterRegistry=new TrustedDeviceRegistry(),joiningRegistry=new TrustedDeviceRegistry();
  await confirmTrustedDeviceOnboarding({registry:inviterRegistry,joiningCredential,expectedPairingCode:pairingCode,confirmedPairingCode:pairingCode,keyVersion:inviterKeyring.currentVersion});
  await joiningRegistry.trust(accepted.inviterCredential,{keyVersion:accepted.keyring.currentVersion});
  assert.equal(inviterRegistry.isTrusted(joining.publicCredential.credentialId),true);
  assert.equal(joiningRegistry.isTrusted(inviter.publicCredential.credentialId),true);
});

test('Round 5D onboarding request and package signatures fail closed on transcript/ciphertext tampering',async()=>{
  const keyring=new LocalSyncKeyring(),inviter=await LocalTrustedDeviceCredential.create(),joining=await LocalTrustedDeviceCredential.create();
  const tamperedSession=await PendingTrustedDeviceOnboarding.begin(joining);
  const badRequest={...tamperedSession.request,sessionId:'session_tampered_request_123'};
  await assert.rejects(()=>createTrustedDeviceOnboardingPackage({request:badRequest,inviterCredential:inviter,keyring}),e=>e instanceof SyncKeyManagementError&&e.code==='SYNC_ONBOARDING_REQUEST_SIGNATURE');

  const session=await PendingTrustedDeviceOnboarding.begin(joining);
  const {onboardingPackage,pairingCode}=await createTrustedDeviceOnboardingPackage({request:session.request,inviterCredential:inviter,keyring});
  const badPackage={...onboardingPackage,ciphertext:flipBase64url(onboardingPackage.ciphertext)};
  await assert.rejects(()=>session.accept({onboardingPackage:badPackage,confirmedPairingCode:pairingCode}),e=>e instanceof SyncKeyManagementError&&e.code==='SYNC_ONBOARDING_PACKAGE_SIGNATURE');
});

test('Round 5D revoked device keeps old keys but cannot read future objects after trusted side rotates',async()=>{
  const inviterKeyring=new LocalSyncKeyring(),inviter=await LocalTrustedDeviceCredential.create(),joining=await LocalTrustedDeviceCredential.create();
  const session=await PendingTrustedDeviceOnboarding.begin(joining);
  const packageResult=await createTrustedDeviceOnboardingPackage({request:session.request,inviterCredential:inviter,keyring:inviterKeyring});
  const accepted=await session.accept({onboardingPackage:packageResult.onboardingPackage,confirmedPairingCode:packageResult.pairingCode});
  const registry=new TrustedDeviceRegistry();
  await confirmTrustedDeviceOnboarding({registry,joiningCredential:packageResult.joiningCredential,expectedPairingCode:packageResult.pairingCode,confirmedPairingCode:packageResult.pairingCode,keyVersion:1});

  const makeEnvelope=await envelopeFactory();
  const oldPayload={body:'old readable object'},oldEnvelope=await makeEnvelope(oldPayload);
  const oldObject=await inviterKeyring.seal({syncEnvelope:oldEnvelope,payload:oldPayload});
  assert.deepEqual((await accepted.keyring.open(oldObject)).payload,oldPayload);

  registry.revoke(joining.publicCredential.credentialId);
  assert.equal(registry.isTrusted(joining.publicCredential.credentialId),false);
  inviterKeyring.rotate();
  const newPayload={body:'future object after revocation'},newEnvelope=await makeEnvelope(newPayload,{entityId:'input:after-revoke'});
  const newObject=await inviterKeyring.seal({syncEnvelope:newEnvelope,payload:newPayload});
  await assert.rejects(()=>accepted.keyring.open(newObject),e=>e instanceof SyncKeyManagementError&&e.code==='SYNC_KEY_VERSION_UNAVAILABLE');
  assert.deepEqual((await accepted.keyring.open(oldObject)).payload,oldPayload);
});

test('Round 5D recovery kit uses a separate random high-entropy secret and restores all retained key versions',async()=>{
  const keyring=new LocalSyncKeyring();keyring.rotate();keyring.rotate();
  const {recoverySecret,recoveryPackage}=await createRecoveryKit(keyring);
  assert.match(recoverySecret,/^recovery_[A-Za-z0-9_-]{40,}$/);
  assert.equal(JSON.stringify(recoveryPackage).includes(recoverySecret),false);
  const recovered=await recoverKeyring({recoverySecret,recoveryPackage});
  assert.deepEqual(recovered.versions(),[1,2,3]);
  assert.equal(recovered.currentVersion,3);
  for(const version of recovered.versions())assert.deepEqual([...recovered.rootKeyFor(version)],[...keyring.rootKeyFor(version)]);
  const wrongSecret=recoverySecret.slice(0,-1)+(recoverySecret.endsWith('A')?'B':'A');
  await assert.rejects(()=>recoverKeyring({recoverySecret:wrongSecret,recoveryPackage}),e=>e instanceof SyncKeyManagementError&&e.code==='SYNC_RECOVERY_DECRYPT_FAILED');
});

test('Round 5D onboarding artifacts do not expose root key bytes in plaintext and no password-derived flow is introduced',async()=>{
  const keyring=new LocalSyncKeyring(),inviter=await LocalTrustedDeviceCredential.create(),joining=await LocalTrustedDeviceCredential.create();
  const session=await PendingTrustedDeviceOnboarding.begin(joining);
  const {onboardingPackage}=await createTrustedDeviceOnboardingPackage({request:session.request,inviterCredential:inviter,keyring});
  const rootHex=Array.from(keyring.rootKeyFor(1),b=>b.toString(16).padStart(2,'0')).join('');
  const serialized=JSON.stringify(onboardingPackage);
  assert.equal(serialized.includes(rootHex),false);
  const source=await readFile(new URL('../core/sync-key-management.js',import.meta.url),'utf8');
  assert.equal(/PBKDF2|scrypt|argon|password|passphrase/i.test(source),false);
});

test('Round 5D implementation remains local-only: no network, persistent secret storage or account backend',async()=>{
  const source=await readFile(new URL('../core/sync-key-management.js',import.meta.url),'utf8');
  assert.equal(/fetch\s*\(|XMLHttpRequest|WebSocket|indexedDB|chrome\.storage|localStorage|supabase|firebase|icloud|google drive/i.test(source),false);
  assert.equal(/keychain|secure enclave|keystore/i.test(source),false);
});
