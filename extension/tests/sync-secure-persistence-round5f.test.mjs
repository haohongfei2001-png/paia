import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SecureKeyPersistenceError,
  SecureKeyPersistenceGate,
  createSecureSecretSlot,
} from '../core/secure-key-persistence.js';
import {
  MacOSNativeSecureSecretProvider,
  probeCurrentExtensionSecurePersistenceReadiness,
} from '../core/macos-native-secure-store.js';
import {
  SecurePersistentSyncKeyring,
  SecurePersistentTrustedDeviceCredential,
} from '../core/secure-sync-identity.js';
import {TrustedDeviceRegistry} from '../core/sync-key-management.js';

const enc=new TextEncoder();
const b64=bytes=>Buffer.from(bytes).toString('base64url');
const unb64=value=>new Uint8Array(Buffer.from(value,'base64url'));
const slotKey=slot=>`${slot.accountId}\0${slot.deviceId}\0${slot.secretClass}\0${slot.keyVersion??''}`;

function createFakeNativeHost(){
  const roots=new Map(),signers=new Map();
  async function handle(request){
    if(request.operation==='probe')return {ok:true,version:1,platform:'macos',providerId:'paia.fake.secure_enclave',secureEnclaveAvailable:true,isolatedFromAppStorage:true,supportsAtomicReplace:true,supportsDelete:true,supportsNonExportableSigningKey:true};
    const key=slotKey(request.slot||{});
    if(request.operation==='writeSecret'){roots.set(key,request.secret);return {ok:true};}
    if(request.operation==='readSecret')return {ok:true,secret:roots.get(key)??null};
    if(request.operation==='deleteSecret'){roots.delete(key);return {ok:true};}
    if(request.operation==='createSigningKey'){
      let pair=signers.get(key);
      if(!pair){pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);signers.set(key,pair);}
      return {ok:true,publicKeyJwk:await crypto.subtle.exportKey('jwk',pair.publicKey)};
    }
    if(request.operation==='getSigningPublicKey'){
      const pair=signers.get(key);return pair?{ok:true,publicKeyJwk:await crypto.subtle.exportKey('jwk',pair.publicKey)}:{ok:false,code:'SECURE_SIGNING_KEY_NOT_FOUND'};
    }
    if(request.operation==='sign'){
      const pair=signers.get(key);if(!pair)return {ok:false,code:'SECURE_SIGNING_KEY_NOT_FOUND'};
      return {ok:true,signature:b64(new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,unb64(request.payload))))};
    }
    if(request.operation==='deleteSigningKey'){signers.delete(key);return {ok:true};}
    return {ok:false,code:'SECURE_NATIVE_HOST_OPERATION_INVALID'};
  }
  const runtime={lastError:null,sendNativeMessage(host,request,callback){assert.equal(host,'com.paia.secure_store');handle(request).then(callback);}};
  return {runtime,roots,signers};
}

test('Round 5F probes the native bridge and fails closed when the host is unavailable',async()=>{
  const fake=createFakeNativeHost();
  assert.deepEqual(await probeCurrentExtensionSecurePersistenceReadiness({runtime:fake.runtime}),{version:1,platform:'chrome_extension_macos',available:true,providerId:'paia.fake.secure_enclave',reason:null});
  const missing={lastError:null,sendNativeMessage(_host,_request,callback){this.lastError={message:'Specified native messaging host not found.'};callback(undefined);this.lastError=null;}};
  assert.equal((await probeCurrentExtensionSecurePersistenceReadiness({runtime:missing})).reason,'SECURE_NATIVE_HOST_UNAVAILABLE');
});

test('Round 5F production provider persists root material but forbids raw private signing-key persistence',async()=>{
  const fake=createFakeNativeHost(),provider=await MacOSNativeSecureSecretProvider.connect({runtime:fake.runtime}),gate=new SecureKeyPersistenceGate(provider);
  assert.equal(gate.productionReady,true);
  const rootSlot=createSecureSecretSlot({accountId:'account_round5f',deviceId:'device_round5f',secretClass:'root_keyring',keyVersion:1});
  await gate.store(rootSlot,new Uint8Array([1,2,3,4]));assert.deepEqual([...await gate.load(rootSlot)],[1,2,3,4]);
  const signingSlot=createSecureSecretSlot({accountId:'account_round5f',deviceId:'device_round5f',secretClass:'device_signing_private'});
  await assert.rejects(gate.store(signingSlot,new Uint8Array([9])),e=>e instanceof SecureKeyPersistenceError&&e.code==='SECURE_NON_EXPORTABLE_SIGNING_KEY_REQUIRED');
});

test('Round 5F persistent keyring survives provider reconnect and preserves rotated roots',async()=>{
  const fake=createFakeNativeHost();
  const firstGate=new SecureKeyPersistenceGate(await MacOSNativeSecureSecretProvider.connect({runtime:fake.runtime}));
  const first=await SecurePersistentSyncKeyring.create({gate:firstGate,accountId:'account_restart',deviceId:'device_restart'});
  const root1=first.rootKeyFor(1);await first.rotate();const root2=first.rootKeyFor(2),manifest=first.exportManifest();
  const secondGate=new SecureKeyPersistenceGate(await MacOSNativeSecureSecretProvider.connect({runtime:fake.runtime}));
  const reopened=await SecurePersistentSyncKeyring.open({gate:secondGate,accountId:'account_restart',deviceId:'device_restart',manifest});
  assert.deepEqual(reopened.versions(),[1,2]);assert.equal(reopened.currentVersion,2);
  assert.deepEqual([...reopened.rootKeyFor(1)],[...root1]);assert.deepEqual([...reopened.rootKeyFor(2)],[...root2]);
  await reopened.removeAll();
});

test('Round 5F Secure Enclave credential can reopen without exporting the private key and stays 5D-public-credential compatible',async()=>{
  const fake=createFakeNativeHost();
  const firstGate=new SecureKeyPersistenceGate(await MacOSNativeSecureSecretProvider.connect({runtime:fake.runtime}));
  const credential=await SecurePersistentTrustedDeviceCredential.create({gate:firstGate,accountId:'account_signer'}),manifest=credential.exportManifest();
  const value={purpose:'round5f',counter:1},signature=credential.sign(value);
  assert.equal(typeof await signature,'string');

  const secondGate=new SecureKeyPersistenceGate(await MacOSNativeSecureSecretProvider.connect({runtime:fake.runtime}));
  const reopened=await SecurePersistentTrustedDeviceCredential.open({gate:secondGate,accountId:'account_signer',manifest});
  assert.equal(reopened.publicCredential.credentialId,credential.publicCredential.credentialId);
  const registry=new TrustedDeviceRegistry();await registry.trust(reopened.publicCredential,{keyVersion:1});assert.equal(registry.isTrusted(reopened.publicCredential.credentialId),true);

  const publicKey=await crypto.subtle.importKey('jwk',reopened.publicCredential.publicKeyJwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  const signed=await reopened.sign(value);
  const canonical='{"counter":1,"purpose":"round5f"}';
  assert.equal(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},publicKey,unb64(signed),enc.encode(canonical)),true);
  await reopened.remove();
});

test('Round 5F production capability claims require the non-exportable signer interface',()=>{
  const provider={
    capabilities:{version:1,providerId:'paia.invalid.claim',protection:'hardware_keystore',isolatedFromAppStorage:true,supportsAtomicReplace:true,supportsDelete:true,supportsNonExportableSigningKey:true,testOnly:false},
    async write(){},async read(){return null;},async delete(){},
  };
  assert.throws(()=>new SecureKeyPersistenceGate(provider),e=>e instanceof SecureKeyPersistenceError&&e.code==='SECURE_PROVIDER_SIGNING_INTERFACE_INVALID');
});
