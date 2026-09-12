import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  LocalTrustedDeviceCredential,
  LocalSyncKeyring,
  PendingTrustedDeviceOnboarding,
  prepareTrustedDeviceOnboarding,
} from '../core/sync-key-management.js';
import {
  SecureKeyPersistenceError,
  SecureKeyPersistenceGate,
  TestMemorySecretProvider,
  createSecureSecretSlot,
  currentExtensionSecurePersistenceReadiness,
  isProductionSecurePersistenceProvider,
} from '../core/secure-key-persistence.js';
import {AccountDeviceServiceError,LocalAccountDeviceServiceSimulator} from '../core/account-device-service-contract.js';

function fakeProvider(capabilities){
  const rows=new Map();
  return {
    capabilities,
    async write(slot,secret){rows.set(JSON.stringify(slot),new Uint8Array(secret));},
    async read(slot){const value=rows.get(JSON.stringify(slot));return value?new Uint8Array(value):null;},
    async delete(slot){rows.delete(JSON.stringify(slot));},
  };
}

test('Round 5E current Chrome extension fails closed instead of treating app storage as a secure keystore',()=>{
  assert.deepEqual(currentExtensionSecurePersistenceReadiness(),{
    version:1,
    platform:'chrome_extension',
    available:false,
    reason:'SECURE_OS_KEYSTORE_PROVIDER_REQUIRED',
  });
});

test('Round 5E secure persistence gate rejects test/inadequate providers unless explicitly isolated for tests',async()=>{
  const memory=new TestMemorySecretProvider();
  assert.equal(isProductionSecurePersistenceProvider(memory.capabilities),false);
  assert.throws(()=>new SecureKeyPersistenceGate(memory),e=>e instanceof SecureKeyPersistenceError&&e.code==='SECURE_TEST_PROVIDER_FORBIDDEN');
  const gate=new SecureKeyPersistenceGate(memory,{allowTestProvider:true});
  assert.equal(gate.productionReady,false);
  const slot=createSecureSecretSlot({accountId:'account_round5e',deviceId:'device_round5e',secretClass:'root_keyring',keyVersion:1});
  const source=new Uint8Array([1,2,3,4,5]);
  await gate.store(slot,source);source.fill(9);
  assert.deepEqual([...await gate.load(slot)],[1,2,3,4,5]);
  await gate.remove(slot);assert.equal(await gate.load(slot),null);

  const inadequate=fakeProvider({
    version:1,providerId:'provider.fake.os',protection:'os_keystore',isolatedFromAppStorage:false,
    supportsAtomicReplace:true,supportsDelete:true,supportsNonExportableSigningKey:true,testOnly:false,
  });
  assert.throws(()=>new SecureKeyPersistenceGate(inadequate),e=>e instanceof SecureKeyPersistenceError&&e.code==='SECURE_PROVIDER_NOT_PRODUCTION_READY');
});

test('Round 5E production provider contract requires OS/hardware isolation and non-exportable signing-key support',()=>{
  const ready={version:1,providerId:'provider.native.keychain',protection:'os_keystore',isolatedFromAppStorage:true,supportsAtomicReplace:true,supportsDelete:true,supportsNonExportableSigningKey:true,testOnly:false};
  assert.equal(isProductionSecurePersistenceProvider(ready),true);
  assert.equal(isProductionSecurePersistenceProvider({...ready,protection:'hardware_keystore'}),true);
  assert.equal(isProductionSecurePersistenceProvider({...ready,supportsNonExportableSigningKey:false}),false);
  assert.equal(isProductionSecurePersistenceProvider({...ready,testOnly:true,protection:'test_memory'}),false);
});

test('Round 5E trusted invite + local relay carries the real 5D ceremony without becoming key or merge authority',async()=>{
  const service=new LocalAccountDeviceServiceSimulator();
  const inviter=await LocalTrustedDeviceCredential.create(),joining=await LocalTrustedDeviceCredential.create();
  const boot=service.bootstrap({publicCredential:inviter.publicCredential,keyVersion:1});
  const keyring=new LocalSyncKeyring();keyring.rotate();
  const joiningSession=await PendingTrustedDeviceOnboarding.begin(joining);
  const invite=service.createPairingInvite({sessionToken:boot.sessionToken});
  const relay=service.createPairingRelay({inviteToken:invite.inviteToken,request:joiningSession.request});
  assert.throws(()=>service.createPairingRelay({inviteToken:invite.inviteToken,request:joiningSession.request}),e=>e instanceof AccountDeviceServiceError&&e.code==='ACCOUNT_INVITE_USED');

  const request=service.readPairingRequest({sessionToken:boot.sessionToken,relayId:relay.relayId});
  const approval=await prepareTrustedDeviceOnboarding({request,inviterCredential:inviter});
  service.publishPairingChallenge({sessionToken:boot.sessionToken,relayId:relay.relayId,challenge:approval.challenge});
  const challenge=service.readPairingChallenge({relayId:relay.relayId,accessToken:relay.accessToken});
  const joiningView=await joiningSession.inspectChallenge(challenge);
  assert.equal(joiningView.pairingCode,approval.pairingCode);

  const released=await approval.release({keyring,confirmedPairingCode:joiningView.pairingCode});
  service.publishPairingPackage({sessionToken:boot.sessionToken,relayId:relay.relayId,onboardingPackage:released.onboardingPackage});
  const received=service.consumePairingPackage({relayId:relay.relayId,accessToken:relay.accessToken});
  const accepted=await joiningSession.accept({onboardingPackage:received,confirmedPairingCode:joiningView.pairingCode});
  assert.deepEqual(accepted.keyring.versions(),[1,2]);

  const trusted=service.trustDevice({sessionToken:boot.sessionToken,publicCredential:joining.publicCredential,keyVersion:2});
  assert.equal(service.listDevices({sessionToken:trusted.sessionToken}).length,2);
  assert.throws(()=>service.consumePairingPackage({relayId:relay.relayId,accessToken:relay.accessToken}),e=>e instanceof AccountDeviceServiceError&&e.code==='ACCOUNT_RELAY_STATE');
});

test('Round 5E revoked device session loses account/device-service authority including invite issuance',async()=>{
  const service=new LocalAccountDeviceServiceSimulator();
  const first=await LocalTrustedDeviceCredential.create(),second=await LocalTrustedDeviceCredential.create();
  const boot=service.bootstrap({publicCredential:first.publicCredential,keyVersion:1});
  const secondAuth=service.trustDevice({sessionToken:boot.sessionToken,publicCredential:second.publicCredential,keyVersion:1});
  assert.equal(service.listDevices({sessionToken:secondAuth.sessionToken}).length,2);
  service.revokeDevice({sessionToken:boot.sessionToken,credentialId:second.publicCredential.credentialId});
  assert.throws(()=>service.listDevices({sessionToken:secondAuth.sessionToken}),e=>e instanceof AccountDeviceServiceError&&e.code==='ACCOUNT_SESSION_REVOKED');
  assert.throws(()=>service.createPairingInvite({sessionToken:secondAuth.sessionToken}),e=>e instanceof AccountDeviceServiceError&&e.code==='ACCOUNT_SESSION_REVOKED');
  const rows=service.listDevices({sessionToken:boot.sessionToken});
  assert.equal(rows.find(row=>row.publicCredential.credentialId===second.publicCredential.credentialId).status,'revoked');
});

test('Round 5E invite/relay is bounded, expiring and rejects plaintext secret or merge-authority fields',async()=>{
  let now=1_000_000;
  const service=new LocalAccountDeviceServiceSimulator({now:()=>now});
  const credential=await LocalTrustedDeviceCredential.create();
  const boot=service.bootstrap({publicCredential:credential.publicCredential,keyVersion:1});
  const secretInvite=service.createPairingInvite({sessionToken:boot.sessionToken});
  assert.throws(()=>service.createPairingRelay({inviteToken:secretInvite.inviteToken,request:{rootKey:'secret'}}),e=>e instanceof AccountDeviceServiceError&&e.code==='ACCOUNT_RELAY_SECRET_FORBIDDEN');
  const mergeInvite=service.createPairingInvite({sessionToken:boot.sessionToken});
  assert.throws(()=>service.createPairingRelay({inviteToken:mergeInvite.inviteToken,request:{entityId:'input:private'}}),e=>e instanceof AccountDeviceServiceError&&e.code==='ACCOUNT_RELAY_SECRET_FORBIDDEN');
  const invite=service.createPairingInvite({sessionToken:boot.sessionToken,ttlMs:30_000});
  const relay=service.createPairingRelay({inviteToken:invite.inviteToken,request:{protocolVersion:1,sessionId:'session_safe_123'}});
  now+=30_000;
  assert.throws(()=>service.readPairingRequest({sessionToken:boot.sessionToken,relayId:relay.relayId}),e=>e instanceof AccountDeviceServiceError&&e.code==='ACCOUNT_RELAY_EXPIRED');
});

test('Round 5E expired invite cannot open a relay and accountId alone is not a joining capability',async()=>{
  let now=2_000_000;
  const service=new LocalAccountDeviceServiceSimulator({now:()=>now});
  const credential=await LocalTrustedDeviceCredential.create();
  const boot=service.bootstrap({publicCredential:credential.publicCredential,keyVersion:1});
  const invite=service.createPairingInvite({sessionToken:boot.sessionToken,ttlMs:30_000});
  now+=30_000;
  assert.throws(()=>service.createPairingRelay({inviteToken:invite.inviteToken,request:{protocolVersion:1}}),e=>e instanceof AccountDeviceServiceError&&e.code==='ACCOUNT_INVITE_EXPIRED');
  assert.throws(()=>service.createPairingRelay({accountId:boot.accountId,request:{protocolVersion:1}}),e=>e instanceof AccountDeviceServiceError&&e.code==='ACCOUNT_INVITE_INVALID');
});

test('Round 5E service directory accepts only public credentials, never private JWK material',async()=>{
  const service=new LocalAccountDeviceServiceSimulator();
  const credential=await LocalTrustedDeviceCredential.create();
  const bad={...credential.publicCredential,publicKeyJwk:{...credential.publicCredential.publicKeyJwk,d:'private-scalar'}};
  assert.throws(()=>service.bootstrap({publicCredential:bad,keyVersion:1}),e=>e instanceof AccountDeviceServiceError&&e.code==='ACCOUNT_DEVICE_CREDENTIAL_INVALID');
});

test('Round 5E runtime contracts remain local-only and ordinary PAIA Backup does not become secret persistence',async()=>{
  const persistenceSource=await readFile(new URL('../core/secure-key-persistence.js',import.meta.url),'utf8');
  const serviceSource=await readFile(new URL('../core/account-device-service-contract.js',import.meta.url),'utf8');
  for(const source of [persistenceSource,serviceSource]){
    assert.equal(/fetch\s*\(|XMLHttpRequest|WebSocket|indexedDB|chrome\.storage|localStorage|supabase|firebase|icloud/i.test(source),false);
  }
  const backup=await readFile(new URL('../core/backup-format.js',import.meta.url),'utf8');
  assert.equal(/root_keyring|device_signing_private|recoverySecret|secure-key-persistence|sync-key-management/i.test(backup),false);
});
