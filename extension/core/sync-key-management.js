import {canonicalJson,createDeviceIdentity,generateRootKeyMaterial,inspectRemoteObjectHeader,openRemoteObject,sealRemoteObject,sha256Hex} from './sync-crypto.js';

const encoder=new TextEncoder();
const decoder=new TextDecoder();
const INTERNAL=Symbol('paia-keyring-internal');
const KEYRING_TRANSFER=Symbol('paia-keyring-transfer');
const OPAQUE_RE=/^[A-Za-z0-9_-]{8,128}$/;
const B64_RE=/^[A-Za-z0-9_-]+$/;
const PAIRING_CODE_RE=/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/;

export const KEY_MANAGEMENT_PROTOCOL_VERSION=1;
export const DEVICE_CREDENTIAL_ALGORITHM='ECDSA-P256-SHA256';
export const ONBOARDING_KEY_AGREEMENT='ECDH-P256';
export const KEY_WRAP_KDF='HKDF-SHA-256';
export const KEY_WRAP_CIPHER='AES-256-GCM';

export class SyncKeyManagementError extends Error{
  constructor(code){super(code);this.name='SyncKeyManagementError';this.code=code;}
}

const fail=code=>{throw new SyncKeyManagementError(code);};
const plainObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const cryptoApi=()=>{
  const value=globalThis.crypto;
  if(!value?.subtle||typeof value.getRandomValues!=='function')fail('SYNC_KEY_CRYPTO_UNAVAILABLE');
  return value;
};
const randomBytes=length=>cryptoApi().getRandomValues(new Uint8Array(length));

function b64url(bytes){
  let binary='';
  for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(bytes.length,i+0x8000)));
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function unb64url(value){
  if(typeof value!=='string'||!B64_RE.test(value))fail('SYNC_KEY_ENCODING');
  const padded=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4);
  let binary;
  try{binary=atob(padded);}catch{fail('SYNC_KEY_ENCODING');}
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return bytes;
}

function randomOpaque(prefix,length=18){return prefix+b64url(randomBytes(length));}

function normalizeSigningJwk(input){
  if(!plainObject(input)||input.kty!=='EC'||input.crv!=='P-256'||typeof input.x!=='string'||typeof input.y!=='string'||!B64_RE.test(input.x)||!B64_RE.test(input.y))fail('SYNC_DEVICE_CREDENTIAL_INVALID');
  return Object.freeze({kty:'EC',crv:'P-256',x:input.x,y:input.y,ext:true,key_ops:['verify']});
}

async function credentialIdForJwk(jwk){
  return 'credential_'+(await sha256Hex(canonicalJson(normalizeSigningJwk(jwk)))).slice(0,40);
}

async function validatePublicCredential(input){
  if(!plainObject(input)||input.version!==1||input.algorithm!==DEVICE_CREDENTIAL_ALGORITHM||!OPAQUE_RE.test(input.deviceId||'')||!OPAQUE_RE.test(input.credentialId||''))fail('SYNC_DEVICE_CREDENTIAL_INVALID');
  if(Object.keys(input).some(key=>!['version','deviceId','credentialId','algorithm','publicKeyJwk'].includes(key)))fail('SYNC_DEVICE_CREDENTIAL_INVALID');
  const publicKeyJwk=normalizeSigningJwk(input.publicKeyJwk);
  if(await credentialIdForJwk(publicKeyJwk)!==input.credentialId)fail('SYNC_DEVICE_CREDENTIAL_INVALID');
  return Object.freeze({version:1,deviceId:input.deviceId,credentialId:input.credentialId,algorithm:DEVICE_CREDENTIAL_ALGORITHM,publicKeyJwk});
}

async function importSigningPublic(publicCredential){
  const credential=await validatePublicCredential(publicCredential);
  return cryptoApi().subtle.importKey('jwk',credential.publicKeyJwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
}

async function verifyCredentialSignature(publicCredential,value,signature){
  if(typeof signature!=='string')return false;
  let bytes;
  try{bytes=unb64url(signature);}catch{return false;}
  const key=await importSigningPublic(publicCredential);
  return cryptoApi().subtle.verify({name:'ECDSA',hash:'SHA-256'},key,bytes,encoder.encode(canonicalJson(value)));
}

function normalizeKeyringSnapshot(input){
  if(!plainObject(input)||input.version!==1||!Number.isSafeInteger(input.currentVersion)||input.currentVersion<1||!Array.isArray(input.keys)||input.keys.length<1)fail('SYNC_KEYRING_SNAPSHOT_INVALID');
  if(Object.keys(input).some(key=>!['version','currentVersion','keys'].includes(key)))fail('SYNC_KEYRING_SNAPSHOT_INVALID');
  const seen=new Set(),keys=[];
  for(const row of input.keys){
    if(!plainObject(row)||Object.keys(row).some(key=>!['keyVersion','keyMaterial'].includes(key))||!Number.isSafeInteger(row.keyVersion)||row.keyVersion<1||row.keyVersion>1_000_000||seen.has(row.keyVersion))fail('SYNC_KEYRING_SNAPSHOT_INVALID');
    const bytes=unb64url(row.keyMaterial);
    if(bytes.length!==32)fail('SYNC_KEYRING_SNAPSHOT_INVALID');
    seen.add(row.keyVersion);keys.push({keyVersion:row.keyVersion,keyMaterial:b64url(bytes)});
  }
  keys.sort((a,b)=>a.keyVersion-b.keyVersion);
  if(!seen.has(input.currentVersion))fail('SYNC_KEYRING_SNAPSHOT_INVALID');
  return Object.freeze({version:1,currentVersion:input.currentVersion,keys:Object.freeze(keys.map(Object.freeze))});
}

export class LocalSyncKeyring{
  #keys=new Map();
  #currentVersion=1;
  constructor(token,snapshot){
    if(token===INTERNAL){
      const normalized=normalizeKeyringSnapshot(snapshot);
      this.#currentVersion=normalized.currentVersion;
      for(const row of normalized.keys)this.#keys.set(row.keyVersion,unb64url(row.keyMaterial));
      return;
    }
    if(token!==undefined||snapshot!==undefined)fail('SYNC_KEYRING_CONSTRUCTOR');
    this.#keys.set(1,generateRootKeyMaterial());
  }
  get currentVersion(){return this.#currentVersion;}
  versions(){return Object.freeze([...this.#keys.keys()].sort((a,b)=>a-b));}
  hasVersion(version){return this.#keys.has(version);}
  rootKeyFor(version){
    const key=this.#keys.get(version);
    if(!key)fail('SYNC_KEY_VERSION_UNAVAILABLE');
    return new Uint8Array(key);
  }
  rotate(){
    if(this.#currentVersion>=1_000_000)fail('SYNC_KEY_VERSION_EXHAUSTED');
    const version=this.#currentVersion+1;
    this.#keys.set(version,generateRootKeyMaterial());
    this.#currentVersion=version;
    return version;
  }
  async seal({syncEnvelope,payload,objectId}={}){
    return sealRemoteObject({rootKey:this.rootKeyFor(this.#currentVersion),keyVersion:this.#currentVersion,syncEnvelope,payload,objectId});
  }
  async open(remoteObject){
    const header=inspectRemoteObjectHeader(remoteObject);
    return openRemoteObject({rootKey:this.rootKeyFor(header.keyVersion),remoteObject});
  }
  [KEYRING_TRANSFER](){
    return normalizeKeyringSnapshot({
      version:1,
      currentVersion:this.#currentVersion,
      keys:[...this.#keys.entries()].sort((a,b)=>a[0]-b[0]).map(([keyVersion,keyMaterial])=>({keyVersion,keyMaterial:b64url(keyMaterial)})),
    });
  }
}

function keyringFromSnapshot(snapshot){return new LocalSyncKeyring(INTERNAL,snapshot);}

export class LocalTrustedDeviceCredential{
  #identity;
  #privateKey;
  #publicCredential;
  constructor(token,{identity,privateKey,publicCredential}={}){
    if(token!==INTERNAL)fail('SYNC_DEVICE_CREDENTIAL_CONSTRUCTOR');
    this.#identity=Object.freeze({...identity});
    this.#privateKey=privateKey;
    this.#publicCredential=Object.freeze({...publicCredential,publicKeyJwk:Object.freeze({...publicCredential.publicKeyJwk,key_ops:Object.freeze([...publicCredential.publicKeyJwk.key_ops])})});
  }
  static async create({identity}={}){
    identity=identity??createDeviceIdentity();
    if(!plainObject(identity)||identity.version!==1||!OPAQUE_RE.test(identity.deviceId||'')||!Number.isSafeInteger(identity.sequence)||identity.sequence<0)fail('SYNC_DEVICE_IDENTITY_INVALID');
    const pair=await cryptoApi().subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
    const publicKeyJwk=normalizeSigningJwk(await cryptoApi().subtle.exportKey('jwk',pair.publicKey));
    const credentialId=await credentialIdForJwk(publicKeyJwk);
    const publicCredential=await validatePublicCredential({version:1,deviceId:identity.deviceId,credentialId,algorithm:DEVICE_CREDENTIAL_ALGORITHM,publicKeyJwk});
    return new LocalTrustedDeviceCredential(INTERNAL,{identity,privateKey:pair.privateKey,publicCredential});
  }
  get deviceIdentity(){return Object.freeze({...this.#identity});}
  get publicCredential(){return this.#publicCredential;}
  async sign(value){
    const signature=new Uint8Array(await cryptoApi().subtle.sign({name:'ECDSA',hash:'SHA-256'},this.#privateKey,encoder.encode(canonicalJson(value))));
    return b64url(signature);
  }
}

function validateEphemeralPublic(value){
  const bytes=unb64url(value);
  if(bytes.length!==65||bytes[0]!==4)fail('SYNC_ONBOARDING_EPHEMERAL_INVALID');
  return bytes;
}

async function importEcdhPublic(value){
  return cryptoApi().subtle.importKey('raw',validateEphemeralPublic(value),{name:'ECDH',namedCurve:'P-256'},false,[]);
}

async function exportEcdhPublic(key){return b64url(new Uint8Array(await cryptoApi().subtle.exportKey('raw',key)));}

async function deriveSharedSecret(privateKey,publicValue){
  const publicKey=await importEcdhPublic(publicValue);
  return new Uint8Array(await cryptoApi().subtle.deriveBits({name:'ECDH',public:publicKey},privateKey,256));
}

async function deriveWrappingKey(sharedSecret,salt,info){
  const material=await cryptoApi().subtle.importKey('raw',sharedSecret,'HKDF',false,['deriveKey']);
  return cryptoApi().subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt,info:encoder.encode(canonicalJson(info))},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}

function onboardingRequestCore(input){
  return {
    protocolVersion:KEY_MANAGEMENT_PROTOCOL_VERSION,
    sessionId:input.sessionId,
    keyAgreement:ONBOARDING_KEY_AGREEMENT,
    joiningCredential:input.joiningCredential,
    joiningEphemeralPublic:input.joiningEphemeralPublic,
  };
}

async function validateOnboardingRequest(input){
  if(!plainObject(input)||Object.keys(input).some(key=>!['protocolVersion','sessionId','keyAgreement','joiningCredential','joiningEphemeralPublic','signature'].includes(key)))fail('SYNC_ONBOARDING_REQUEST_INVALID');
  if(input.protocolVersion!==KEY_MANAGEMENT_PROTOCOL_VERSION||input.keyAgreement!==ONBOARDING_KEY_AGREEMENT||!OPAQUE_RE.test(input.sessionId||''))fail('SYNC_ONBOARDING_REQUEST_INVALID');
  const joiningCredential=await validatePublicCredential(input.joiningCredential);
  validateEphemeralPublic(input.joiningEphemeralPublic);
  if(!(await verifyCredentialSignature(joiningCredential,onboardingRequestCore({...input,joiningCredential}),input.signature)))fail('SYNC_ONBOARDING_REQUEST_SIGNATURE');
  return Object.freeze({...input,joiningCredential});
}

function challengeCore(input){
  return {
    protocolVersion:KEY_MANAGEMENT_PROTOCOL_VERSION,
    sessionId:input.sessionId,
    joiningCredentialId:input.joiningCredentialId,
    inviterCredential:input.inviterCredential,
    keyAgreement:ONBOARDING_KEY_AGREEMENT,
    joiningEphemeralPublic:input.joiningEphemeralPublic,
    inviterEphemeralPublic:input.inviterEphemeralPublic,
  };
}

async function validateOnboardingChallenge(input){
  if(!plainObject(input)||Object.keys(input).some(key=>!['protocolVersion','sessionId','joiningCredentialId','inviterCredential','keyAgreement','joiningEphemeralPublic','inviterEphemeralPublic','signature'].includes(key)))fail('SYNC_ONBOARDING_CHALLENGE_INVALID');
  if(input.protocolVersion!==KEY_MANAGEMENT_PROTOCOL_VERSION||input.keyAgreement!==ONBOARDING_KEY_AGREEMENT||!OPAQUE_RE.test(input.sessionId||'')||!OPAQUE_RE.test(input.joiningCredentialId||''))fail('SYNC_ONBOARDING_CHALLENGE_INVALID');
  const inviterCredential=await validatePublicCredential(input.inviterCredential);
  validateEphemeralPublic(input.joiningEphemeralPublic);validateEphemeralPublic(input.inviterEphemeralPublic);
  if(!(await verifyCredentialSignature(inviterCredential,challengeCore({...input,inviterCredential}),input.signature)))fail('SYNC_ONBOARDING_CHALLENGE_SIGNATURE');
  return Object.freeze({...input,inviterCredential});
}

function pairingInfo({sessionId,joiningCredentialId,inviterCredentialId,joiningEphemeralPublic,inviterEphemeralPublic}){
  return {protocolVersion:KEY_MANAGEMENT_PROTOCOL_VERSION,sessionId,joiningCredentialId,inviterCredentialId,joiningEphemeralPublic,inviterEphemeralPublic};
}

async function pairingCodeFor(info){
  const hash=(await sha256Hex(canonicalJson(pairingInfo(info)))).slice(0,12).toUpperCase();
  return `${hash.slice(0,4)}-${hash.slice(4,8)}-${hash.slice(8,12)}`;
}

function packageHeader(input){
  return {
    protocolVersion:KEY_MANAGEMENT_PROTOCOL_VERSION,
    sessionId:input.sessionId,
    joiningCredentialId:input.joiningCredentialId,
    inviterCredential:input.inviterCredential,
    keyAgreement:ONBOARDING_KEY_AGREEMENT,
    cipher:KEY_WRAP_CIPHER,
    kdf:KEY_WRAP_KDF,
    salt:input.salt,
    nonce:input.nonce,
    joiningEphemeralPublic:input.joiningEphemeralPublic,
    inviterEphemeralPublic:input.inviterEphemeralPublic,
  };
}

function packageSignedCore(input){return {...packageHeader(input),ciphertext:input.ciphertext};}

async function validateOnboardingPackage(input){
  if(!plainObject(input)||Object.keys(input).some(key=>!['protocolVersion','sessionId','joiningCredentialId','inviterCredential','keyAgreement','cipher','kdf','salt','nonce','joiningEphemeralPublic','inviterEphemeralPublic','ciphertext','signature'].includes(key)))fail('SYNC_ONBOARDING_PACKAGE_INVALID');
  if(input.protocolVersion!==KEY_MANAGEMENT_PROTOCOL_VERSION||input.keyAgreement!==ONBOARDING_KEY_AGREEMENT||input.cipher!==KEY_WRAP_CIPHER||input.kdf!==KEY_WRAP_KDF||!OPAQUE_RE.test(input.sessionId||'')||!OPAQUE_RE.test(input.joiningCredentialId||''))fail('SYNC_ONBOARDING_PACKAGE_INVALID');
  const inviterCredential=await validatePublicCredential(input.inviterCredential),salt=unb64url(input.salt),nonce=unb64url(input.nonce);
  validateEphemeralPublic(input.joiningEphemeralPublic);validateEphemeralPublic(input.inviterEphemeralPublic);
  if(salt.length!==16||nonce.length!==12||typeof input.ciphertext!=='string'||unb64url(input.ciphertext).length<16)fail('SYNC_ONBOARDING_PACKAGE_INVALID');
  if(!(await verifyCredentialSignature(inviterCredential,packageSignedCore({...input,inviterCredential}),input.signature)))fail('SYNC_ONBOARDING_PACKAGE_SIGNATURE');
  return Object.freeze({...input,inviterCredential});
}

function sameChallengeTranscript(challenge,pkg){
  return challenge.sessionId===pkg.sessionId&&
    challenge.joiningCredentialId===pkg.joiningCredentialId&&
    challenge.inviterCredential.credentialId===pkg.inviterCredential.credentialId&&
    challenge.joiningEphemeralPublic===pkg.joiningEphemeralPublic&&
    challenge.inviterEphemeralPublic===pkg.inviterEphemeralPublic;
}

export class PendingTrustedDeviceOnboarding{
  #credential;
  #privateKey;
  #request;
  #challenge=null;
  #pairingCode=null;
  constructor(token,{credential,privateKey,request}={}){
    if(token!==INTERNAL)fail('SYNC_ONBOARDING_SESSION_CONSTRUCTOR');
    this.#credential=credential;this.#privateKey=privateKey;this.#request=request;
  }
  static async begin(credential){
    if(!(credential instanceof LocalTrustedDeviceCredential))fail('SYNC_ONBOARDING_CREDENTIAL_REQUIRED');
    const pair=await cryptoApi().subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
    const joiningEphemeralPublic=await exportEcdhPublic(pair.publicKey),sessionId=randomOpaque('session_',18);
    const core={protocolVersion:KEY_MANAGEMENT_PROTOCOL_VERSION,sessionId,keyAgreement:ONBOARDING_KEY_AGREEMENT,joiningCredential:credential.publicCredential,joiningEphemeralPublic};
    const request=Object.freeze({...core,signature:await credential.sign(core)});
    return new PendingTrustedDeviceOnboarding(INTERNAL,{credential,privateKey:pair.privateKey,request});
  }
  get request(){return this.#request;}
  async inspectChallenge(challenge){
    challenge=await validateOnboardingChallenge(challenge);
    if(challenge.sessionId!==this.#request.sessionId||challenge.joiningCredentialId!==this.#credential.publicCredential.credentialId||challenge.joiningEphemeralPublic!==this.#request.joiningEphemeralPublic)fail('SYNC_ONBOARDING_SESSION_MISMATCH');
    const pairingCode=await pairingCodeFor({sessionId:challenge.sessionId,joiningCredentialId:challenge.joiningCredentialId,inviterCredentialId:challenge.inviterCredential.credentialId,joiningEphemeralPublic:challenge.joiningEphemeralPublic,inviterEphemeralPublic:challenge.inviterEphemeralPublic});
    this.#challenge=challenge;this.#pairingCode=pairingCode;
    return Object.freeze({pairingCode,inviterCredential:challenge.inviterCredential});
  }
  async accept({onboardingPackage,confirmedPairingCode}={}){
    if(!this.#challenge||!this.#pairingCode)fail('SYNC_ONBOARDING_CHALLENGE_REQUIRED');
    const pkg=await validateOnboardingPackage(onboardingPackage);
    if(!sameChallengeTranscript(this.#challenge,pkg))fail('SYNC_ONBOARDING_SESSION_MISMATCH');
    if(typeof confirmedPairingCode!=='string'||!PAIRING_CODE_RE.test(confirmedPairingCode)||confirmedPairingCode!==this.#pairingCode)fail('SYNC_PAIRING_CODE_MISMATCH');
    const sharedSecret=await deriveSharedSecret(this.#privateKey,pkg.inviterEphemeralPublic),salt=unb64url(pkg.salt),nonce=unb64url(pkg.nonce);
    const key=await deriveWrappingKey(sharedSecret,salt,pairingInfo({sessionId:pkg.sessionId,joiningCredentialId:pkg.joiningCredentialId,inviterCredentialId:pkg.inviterCredential.credentialId,joiningEphemeralPublic:pkg.joiningEphemeralPublic,inviterEphemeralPublic:pkg.inviterEphemeralPublic}));
    let plaintext;
    try{plaintext=new Uint8Array(await cryptoApi().subtle.decrypt({name:'AES-GCM',iv:nonce,additionalData:encoder.encode(canonicalJson(packageHeader(pkg))),tagLength:128},key,unb64url(pkg.ciphertext)));}
    catch{fail('SYNC_ONBOARDING_DECRYPT_FAILED');}
    let parsed;
    try{parsed=JSON.parse(decoder.decode(plaintext));}catch{fail('SYNC_ONBOARDING_PAYLOAD_INVALID');}
    if(!plainObject(parsed)||parsed.bundleVersion!==1||Object.keys(parsed).some(key=>!['bundleVersion','keyring','approvedJoiningCredential'].includes(key)))fail('SYNC_ONBOARDING_PAYLOAD_INVALID');
    const approved=await validatePublicCredential(parsed.approvedJoiningCredential);
    if(approved.credentialId!==this.#credential.publicCredential.credentialId||approved.deviceId!==this.#credential.publicCredential.deviceId)fail('SYNC_ONBOARDING_PAYLOAD_INVALID');
    return Object.freeze({keyring:keyringFromSnapshot(parsed.keyring),inviterCredential:pkg.inviterCredential,pairingCode:this.#pairingCode});
  }
}

export class PendingTrustedDeviceApproval{
  #request;
  #inviterCredential;
  #privateKey;
  #challenge;
  #pairingCode;
  #released=false;
  constructor(token,{request,inviterCredential,privateKey,challenge,pairingCode}={}){
    if(token!==INTERNAL)fail('SYNC_ONBOARDING_APPROVAL_CONSTRUCTOR');
    this.#request=request;this.#inviterCredential=inviterCredential;this.#privateKey=privateKey;this.#challenge=challenge;this.#pairingCode=pairingCode;
  }
  static async prepare({request,inviterCredential}={}){
    request=await validateOnboardingRequest(request);
    if(!(inviterCredential instanceof LocalTrustedDeviceCredential))fail('SYNC_ONBOARDING_INVITER_INVALID');
    const pair=await cryptoApi().subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
    const inviterEphemeralPublic=await exportEcdhPublic(pair.publicKey);
    const core={protocolVersion:KEY_MANAGEMENT_PROTOCOL_VERSION,sessionId:request.sessionId,joiningCredentialId:request.joiningCredential.credentialId,inviterCredential:inviterCredential.publicCredential,keyAgreement:ONBOARDING_KEY_AGREEMENT,joiningEphemeralPublic:request.joiningEphemeralPublic,inviterEphemeralPublic};
    const challenge=Object.freeze({...core,signature:await inviterCredential.sign(core)});
    const pairingCode=await pairingCodeFor({sessionId:request.sessionId,joiningCredentialId:request.joiningCredential.credentialId,inviterCredentialId:inviterCredential.publicCredential.credentialId,joiningEphemeralPublic:request.joiningEphemeralPublic,inviterEphemeralPublic});
    return new PendingTrustedDeviceApproval(INTERNAL,{request,inviterCredential,privateKey:pair.privateKey,challenge,pairingCode});
  }
  get challenge(){return this.#challenge;}
  get pairingCode(){return this.#pairingCode;}
  get joiningCredential(){return this.#request.joiningCredential;}
  async release({keyring,confirmedPairingCode}={}){
    if(this.#released)fail('SYNC_ONBOARDING_ALREADY_RELEASED');
    if(!(keyring instanceof LocalSyncKeyring))fail('SYNC_ONBOARDING_KEYRING_REQUIRED');
    if(typeof confirmedPairingCode!=='string'||!PAIRING_CODE_RE.test(confirmedPairingCode)||confirmedPairingCode!==this.#pairingCode)fail('SYNC_PAIRING_CODE_MISMATCH');
    const salt=randomBytes(16),nonce=randomBytes(12),sharedSecret=await deriveSharedSecret(this.#privateKey,this.#request.joiningEphemeralPublic);
    const info=pairingInfo({sessionId:this.#request.sessionId,joiningCredentialId:this.#request.joiningCredential.credentialId,inviterCredentialId:this.#inviterCredential.publicCredential.credentialId,joiningEphemeralPublic:this.#request.joiningEphemeralPublic,inviterEphemeralPublic:this.#challenge.inviterEphemeralPublic});
    const key=await deriveWrappingKey(sharedSecret,salt,info);
    const header=packageHeader({sessionId:this.#request.sessionId,joiningCredentialId:this.#request.joiningCredential.credentialId,inviterCredential:this.#inviterCredential.publicCredential,salt:b64url(salt),nonce:b64url(nonce),joiningEphemeralPublic:this.#request.joiningEphemeralPublic,inviterEphemeralPublic:this.#challenge.inviterEphemeralPublic});
    const payload={bundleVersion:1,keyring:keyring[KEYRING_TRANSFER](),approvedJoiningCredential:this.#request.joiningCredential};
    const ciphertext=b64url(new Uint8Array(await cryptoApi().subtle.encrypt({name:'AES-GCM',iv:nonce,additionalData:encoder.encode(canonicalJson(header)),tagLength:128},key,encoder.encode(canonicalJson(payload)))));
    const signedCore={...header,ciphertext},signature=await this.#inviterCredential.sign(signedCore);
    this.#released=true;
    return Object.freeze({onboardingPackage:Object.freeze({...signedCore,signature}),pairingCode:this.#pairingCode,joiningCredential:this.#request.joiningCredential});
  }
}

export async function prepareTrustedDeviceOnboarding({request,inviterCredential}={}){
  return PendingTrustedDeviceApproval.prepare({request,inviterCredential});
}

export class TrustedDeviceRegistry{
  #records=new Map();
  async trust(publicCredential,{keyVersion}={}){
    const credential=await validatePublicCredential(publicCredential);
    if(!Number.isSafeInteger(keyVersion)||keyVersion<1)fail('SYNC_TRUST_KEY_VERSION_INVALID');
    this.#records.set(credential.credentialId,Object.freeze({credential,status:'trusted',keyVersion}));
    return this.record(credential.credentialId);
  }
  revoke(credentialId){
    const record=this.#records.get(credentialId);
    if(!record)fail('SYNC_TRUSTED_DEVICE_UNKNOWN');
    this.#records.set(credentialId,Object.freeze({...record,status:'revoked'}));
    return this.record(credentialId);
  }
  isTrusted(credentialId){return this.#records.get(credentialId)?.status==='trusted';}
  record(credentialId){
    const record=this.#records.get(credentialId);
    return record?Object.freeze({credential:record.credential,status:record.status,keyVersion:record.keyVersion}):null;
  }
  list(){return Object.freeze([...this.#records.values()].map(record=>Object.freeze({credential:record.credential,status:record.status,keyVersion:record.keyVersion})));}
}

export async function confirmTrustedDeviceOnboarding({registry,joiningCredential,expectedPairingCode,confirmedPairingCode,keyVersion}={}){
  if(!(registry instanceof TrustedDeviceRegistry)||typeof expectedPairingCode!=='string'||expectedPairingCode!==confirmedPairingCode||!PAIRING_CODE_RE.test(expectedPairingCode))fail('SYNC_PAIRING_CODE_MISMATCH');
  return registry.trust(joiningCredential,{keyVersion});
}

function recoveryHeader({recoveryId,salt,nonce}){
  return Object.freeze({protocolVersion:KEY_MANAGEMENT_PROTOCOL_VERSION,recoveryId,cipher:KEY_WRAP_CIPHER,kdf:KEY_WRAP_KDF,salt:b64url(salt),nonce:b64url(nonce)});
}

async function deriveRecoveryKey(secretBytes,salt,recoveryId){
  const material=await cryptoApi().subtle.importKey('raw',secretBytes,'HKDF',false,['deriveKey']);
  return cryptoApi().subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt,info:encoder.encode(`paia-sync-recovery/v${KEY_MANAGEMENT_PROTOCOL_VERSION}/${recoveryId}`)},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}

export async function createRecoveryKit(keyring){
  if(!(keyring instanceof LocalSyncKeyring))fail('SYNC_RECOVERY_KEYRING_REQUIRED');
  const secretBytes=randomBytes(32),recoverySecret='recovery_'+b64url(secretBytes),recoveryId=randomOpaque('recovery_',18),salt=randomBytes(16),nonce=randomBytes(12),header=recoveryHeader({recoveryId,salt,nonce});
  const key=await deriveRecoveryKey(secretBytes,salt,recoveryId),plaintext=encoder.encode(canonicalJson({bundleVersion:1,keyring:keyring[KEYRING_TRANSFER]()}));
  const ciphertext=b64url(new Uint8Array(await cryptoApi().subtle.encrypt({name:'AES-GCM',iv:nonce,additionalData:encoder.encode(canonicalJson(header)),tagLength:128},key,plaintext)));
  return Object.freeze({recoverySecret,recoveryPackage:Object.freeze({...header,ciphertext})});
}

export async function recoverKeyring({recoverySecret,recoveryPackage}={}){
  if(typeof recoverySecret!=='string'||!recoverySecret.startsWith('recovery_'))fail('SYNC_RECOVERY_SECRET_INVALID');
  const secretBytes=unb64url(recoverySecret.slice('recovery_'.length));
  if(secretBytes.length!==32||!plainObject(recoveryPackage)||Object.keys(recoveryPackage).some(key=>!['protocolVersion','recoveryId','cipher','kdf','salt','nonce','ciphertext'].includes(key)))fail('SYNC_RECOVERY_PACKAGE_INVALID');
  if(recoveryPackage.protocolVersion!==KEY_MANAGEMENT_PROTOCOL_VERSION||recoveryPackage.cipher!==KEY_WRAP_CIPHER||recoveryPackage.kdf!==KEY_WRAP_KDF||!OPAQUE_RE.test(recoveryPackage.recoveryId||''))fail('SYNC_RECOVERY_PACKAGE_INVALID');
  const salt=unb64url(recoveryPackage.salt),nonce=unb64url(recoveryPackage.nonce);
  if(salt.length!==16||nonce.length!==12||typeof recoveryPackage.ciphertext!=='string')fail('SYNC_RECOVERY_PACKAGE_INVALID');
  const key=await deriveRecoveryKey(secretBytes,salt,recoveryPackage.recoveryId),{ciphertext,...header}=recoveryPackage;
  let plaintext;
  try{plaintext=new Uint8Array(await cryptoApi().subtle.decrypt({name:'AES-GCM',iv:nonce,additionalData:encoder.encode(canonicalJson(header)),tagLength:128},key,unb64url(ciphertext)));}
  catch{fail('SYNC_RECOVERY_DECRYPT_FAILED');}
  let parsed;
  try{parsed=JSON.parse(decoder.decode(plaintext));}catch{fail('SYNC_RECOVERY_PAYLOAD_INVALID');}
  if(!plainObject(parsed)||parsed.bundleVersion!==1||Object.keys(parsed).some(key=>!['bundleVersion','keyring'].includes(key)))fail('SYNC_RECOVERY_PAYLOAD_INVALID');
  return keyringFromSnapshot(parsed.keyring);
}
