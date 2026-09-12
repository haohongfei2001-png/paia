import {canonicalJson,createDeviceIdentity,generateRootKeyMaterial,inspectRemoteObjectHeader,openRemoteObject,sealRemoteObject,sha256Hex} from './sync-crypto.js';
import {KEYRING_TRANSFER} from './sync-key-management.js';
import {SecureKeyPersistenceError,createSecureSecretSlot} from './secure-key-persistence.js';

const encoder=new TextEncoder();
const OPAQUE_RE=/^[A-Za-z0-9_-]{8,128}$/;
const B64_RE=/^[A-Za-z0-9_-]+$/;
const INTERNAL=Symbol('paia-secure-sync-identity');

const fail=code=>{throw new SecureKeyPersistenceError(code);};
const plainObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

function b64url(bytes){
  let binary='';
  for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(bytes.length,i+0x8000)));
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function normalizeIdentity(identity){
  if(!plainObject(identity)||identity.version!==1||!OPAQUE_RE.test(identity.deviceId||'')||!Number.isSafeInteger(identity.sequence)||identity.sequence<0)fail('SECURE_DEVICE_IDENTITY_INVALID');
  return Object.freeze({version:1,deviceId:identity.deviceId,sequence:identity.sequence});
}

function normalizePublicJwk(input){
  if(!plainObject(input)||input.kty!=='EC'||input.crv!=='P-256'||typeof input.x!=='string'||typeof input.y!=='string'||!B64_RE.test(input.x)||!B64_RE.test(input.y))fail('SECURE_DEVICE_PUBLIC_KEY_INVALID');
  return Object.freeze({kty:'EC',crv:'P-256',x:input.x,y:input.y,ext:true,key_ops:Object.freeze(['verify'])});
}

async function publicCredentialFor(identity,publicKeyJwk){
  identity=normalizeIdentity(identity);publicKeyJwk=normalizePublicJwk(publicKeyJwk);
  const credentialId='credential_'+(await sha256Hex(canonicalJson(publicKeyJwk))).slice(0,40);
  return Object.freeze({version:1,deviceId:identity.deviceId,credentialId,algorithm:'ECDSA-P256-SHA256',publicKeyJwk});
}

function normalizeCredentialManifest(input){
  if(!plainObject(input)||input.version!==1||!plainObject(input.identity)||!plainObject(input.publicCredential))fail('SECURE_DEVICE_MANIFEST_INVALID');
  const identity=normalizeIdentity(input.identity),credential=input.publicCredential;
  if(credential.version!==1||credential.deviceId!==identity.deviceId||!OPAQUE_RE.test(credential.credentialId||'')||credential.algorithm!=='ECDSA-P256-SHA256')fail('SECURE_DEVICE_MANIFEST_INVALID');
  return Object.freeze({version:1,identity,publicCredential:Object.freeze({...credential,publicKeyJwk:normalizePublicJwk(credential.publicKeyJwk)})});
}

function normalizeKeyringManifest(input){
  if(!plainObject(input)||input.version!==1||!Number.isSafeInteger(input.currentVersion)||input.currentVersion<1||!Array.isArray(input.versions)||input.versions.length<1)fail('SECURE_KEYRING_MANIFEST_INVALID');
  const versions=[...new Set(input.versions)];
  if(versions.length!==input.versions.length||versions.some(v=>!Number.isSafeInteger(v)||v<1||v>1_000_000)||!versions.includes(input.currentVersion))fail('SECURE_KEYRING_MANIFEST_INVALID');
  versions.sort((a,b)=>a-b);
  return Object.freeze({version:1,currentVersion:input.currentVersion,versions:Object.freeze(versions)});
}

export class SecurePersistentTrustedDeviceCredential{
  #gate;#slot;#identity;#publicCredential;
  constructor(token,{gate,slot,identity,publicCredential}={}){
    if(token!==INTERNAL)fail('SECURE_DEVICE_CREDENTIAL_CONSTRUCTOR');
    this.#gate=gate;this.#slot=slot;this.#identity=identity;this.#publicCredential=publicCredential;
  }
  static async create({gate,accountId,identity}={}){
    if(!gate?.productionReady)fail('SECURE_PROVIDER_NOT_PRODUCTION_READY');
    identity=normalizeIdentity(identity??createDeviceIdentity());
    const slot=createSecureSecretSlot({accountId,deviceId:identity.deviceId,secretClass:'device_signing_private'});
    const publicKeyJwk=await gate.createSigningKey(slot),publicCredential=await publicCredentialFor(identity,publicKeyJwk);
    return new SecurePersistentTrustedDeviceCredential(INTERNAL,{gate,slot,identity,publicCredential});
  }
  static async open({gate,accountId,manifest}={}){
    if(!gate?.productionReady)fail('SECURE_PROVIDER_NOT_PRODUCTION_READY');
    manifest=normalizeCredentialManifest(manifest);
    const slot=createSecureSecretSlot({accountId,deviceId:manifest.identity.deviceId,secretClass:'device_signing_private'});
    const publicKeyJwk=await gate.getSigningPublicKey(slot),expected=await publicCredentialFor(manifest.identity,publicKeyJwk);
    if(expected.credentialId!==manifest.publicCredential.credentialId||canonicalJson(expected.publicKeyJwk)!==canonicalJson(manifest.publicCredential.publicKeyJwk))fail('SECURE_DEVICE_MANIFEST_MISMATCH');
    return new SecurePersistentTrustedDeviceCredential(INTERNAL,{gate,slot,identity:manifest.identity,publicCredential:expected});
  }
  get deviceIdentity(){return this.#identity;}
  get publicCredential(){return this.#publicCredential;}
  exportManifest(){return Object.freeze({version:1,identity:this.#identity,publicCredential:this.#publicCredential});}
  async sign(value){return b64url(await this.#gate.sign(this.#slot,encoder.encode(canonicalJson(value))));}
  async remove(){await this.#gate.remove(this.#slot);}
}

export class SecurePersistentSyncKeyring{
  #gate;#accountId;#deviceId;#keys=new Map();#currentVersion=1;
  constructor(token,{gate,accountId,deviceId,currentVersion,keys}={}){
    if(token!==INTERNAL)fail('SECURE_KEYRING_CONSTRUCTOR');
    this.#gate=gate;this.#accountId=accountId;this.#deviceId=deviceId;this.#currentVersion=currentVersion;
    for(const [version,key] of keys)this.#keys.set(version,new Uint8Array(key));
  }
  static async create({gate,accountId,deviceId}={}){
    if(!gate?.productionReady)fail('SECURE_PROVIDER_NOT_PRODUCTION_READY');
    const key=generateRootKeyMaterial(),slot=createSecureSecretSlot({accountId,deviceId,secretClass:'root_keyring',keyVersion:1});
    await gate.store(slot,key);
    return new SecurePersistentSyncKeyring(INTERNAL,{gate,accountId,deviceId,currentVersion:1,keys:[[1,key]]});
  }
  static async open({gate,accountId,deviceId,manifest}={}){
    if(!gate?.productionReady)fail('SECURE_PROVIDER_NOT_PRODUCTION_READY');
    manifest=normalizeKeyringManifest(manifest);
    const keys=[];
    for(const version of manifest.versions){
      const slot=createSecureSecretSlot({accountId,deviceId,secretClass:'root_keyring',keyVersion:version}),key=await gate.load(slot);
      if(!key||key.length!==32)fail('SECURE_KEYRING_SECRET_MISSING');
      keys.push([version,key]);
    }
    return new SecurePersistentSyncKeyring(INTERNAL,{gate,accountId,deviceId,currentVersion:manifest.currentVersion,keys});
  }
  get currentVersion(){return this.#currentVersion;}
  versions(){return Object.freeze([...this.#keys.keys()].sort((a,b)=>a-b));}
  exportManifest(){return normalizeKeyringManifest({version:1,currentVersion:this.#currentVersion,versions:this.versions()});}
  rootKeyFor(version){
    const key=this.#keys.get(version);if(!key)fail('SECURE_KEY_VERSION_UNAVAILABLE');return new Uint8Array(key);
  }
  async rotate(){
    if(this.#currentVersion>=1_000_000)fail('SECURE_KEY_VERSION_EXHAUSTED');
    const version=this.#currentVersion+1,key=generateRootKeyMaterial(),slot=createSecureSecretSlot({accountId:this.#accountId,deviceId:this.#deviceId,secretClass:'root_keyring',keyVersion:version});
    await this.#gate.store(slot,key);this.#keys.set(version,new Uint8Array(key));this.#currentVersion=version;return version;
  }
  async seal({syncEnvelope,payload,objectId}={}){return sealRemoteObject({rootKey:this.rootKeyFor(this.#currentVersion),keyVersion:this.#currentVersion,syncEnvelope,payload,objectId});}
  async open(remoteObject){const header=inspectRemoteObjectHeader(remoteObject);return openRemoteObject({rootKey:this.rootKeyFor(header.keyVersion),remoteObject});}
  [KEYRING_TRANSFER](){
    return Object.freeze({version:1,currentVersion:this.#currentVersion,keys:Object.freeze([...this.#keys.entries()].sort((a,b)=>a[0]-b[0]).map(([keyVersion,keyMaterial])=>Object.freeze({keyVersion,keyMaterial:b64url(keyMaterial)})))});
  }
  async removeAll(){
    for(const [version,key] of this.#keys){await this.#gate.remove(createSecureSecretSlot({accountId:this.#accountId,deviceId:this.#deviceId,secretClass:'root_keyring',keyVersion:version}));key.fill(0);}
    this.#keys.clear();
  }
}
