import {validateSyncEnvelope} from './sync-contract.js';

const encoder=new TextEncoder();
const decoder=new TextDecoder();
const HASH_RE=/^[a-f0-9]{64}$/;
const OPAQUE_RE=/^[A-Za-z0-9_-]{8,128}$/;
const MAX_PLAINTEXT_BYTES=2*1024*1024;
const MAX_CIPHERTEXT_CHARS=3*1024*1024;

export const REMOTE_OBJECT_PROTOCOL_VERSION=1;
export const REMOTE_OBJECT_CIPHER='AES-256-GCM';
export const REMOTE_OBJECT_KDF='HKDF-SHA-256';

export class SyncCryptoError extends Error{
  constructor(code){super(code);this.name='SyncCryptoError';this.code=code;}
}

const fail=code=>{throw new SyncCryptoError(code);};
const plainObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const cryptoApi=()=>{
  const value=globalThis.crypto;
  if(!value?.subtle||typeof value.getRandomValues!=='function')fail('SYNC_CRYPTO_UNAVAILABLE');
  return value;
};
const randomBytes=length=>cryptoApi().getRandomValues(new Uint8Array(length));

function b64url(bytes){
  let binary='';
  for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(bytes.length,i+0x8000)));
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function unb64url(value){
  if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value))fail('SYNC_REMOTE_ENCODING');
  const padded=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4);
  let binary;
  try{binary=atob(padded);}catch{fail('SYNC_REMOTE_ENCODING');}
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return bytes;
}

function canonicalValue(value,depth=0){
  if(depth>32)fail('SYNC_CANONICAL_DEPTH');
  if(value===null||typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value==='number'){
    if(!Number.isFinite(value))fail('SYNC_CANONICAL_VALUE');
    return value;
  }
  if(Array.isArray(value))return value.map(item=>canonicalValue(item,depth+1));
  if(!plainObject(value))fail('SYNC_CANONICAL_VALUE');
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null)fail('SYNC_CANONICAL_VALUE');
  const out={};
  for(const key of Object.keys(value).sort()){
    if(['__proto__','prototype','constructor'].includes(key))fail('SYNC_CANONICAL_KEY');
    if(value[key]===undefined||typeof value[key]==='function'||typeof value[key]==='bigint'||typeof value[key]==='symbol')fail('SYNC_CANONICAL_VALUE');
    out[key]=canonicalValue(value[key],depth+1);
  }
  return out;
}

export function canonicalJson(value){
  return JSON.stringify(canonicalValue(value));
}

export async function sha256Hex(value){
  const bytes=value instanceof Uint8Array?value:encoder.encode(typeof value==='string'?value:canonicalJson(value));
  const digest=new Uint8Array(await cryptoApi().subtle.digest('SHA-256',bytes));
  return Array.from(digest,byte=>byte.toString(16).padStart(2,'0')).join('');
}

export function generateRootKeyMaterial(){
  return randomBytes(32);
}

function rootKeyBytes(value){
  if(!(value instanceof Uint8Array)||value.length!==32)fail('SYNC_ROOT_KEY_INVALID');
  return new Uint8Array(value);
}

const randomOpaque=(prefix,length)=>prefix+b64url(randomBytes(length));

export function createDeviceIdentity(){
  return Object.freeze({version:1,deviceId:randomOpaque('device_',16),sequence:0});
}

function validateDeviceState(state){
  if(!plainObject(state)||state.version!==1||!OPAQUE_RE.test(state.deviceId||'')||!Number.isSafeInteger(state.sequence)||state.sequence<0)fail('SYNC_DEVICE_STATE_INVALID');
  if(Object.keys(state).some(key=>!['version','deviceId','sequence'].includes(key)))fail('SYNC_DEVICE_STATE_INVALID');
  return state;
}

export function nextDeviceOperation(state){
  state=validateDeviceState(state);
  if(state.sequence>=Number.MAX_SAFE_INTEGER)fail('SYNC_DEVICE_SEQUENCE_EXHAUSTED');
  const sequence=state.sequence+1;
  return Object.freeze({
    state:Object.freeze({version:1,deviceId:state.deviceId,sequence}),
    operation:Object.freeze({deviceId:state.deviceId,deviceSequence:sequence,operationId:randomOpaque('operation_',18)}),
  });
}

function publicHeader({objectId,keyVersion,salt,nonce}){
  return Object.freeze({
    protocolVersion:REMOTE_OBJECT_PROTOCOL_VERSION,
    objectId,
    keyVersion,
    cipher:REMOTE_OBJECT_CIPHER,
    kdf:REMOTE_OBJECT_KDF,
    salt:b64url(salt),
    nonce:b64url(nonce),
  });
}

async function deriveObjectKey(rootKey,salt,{objectId,keyVersion}){
  const material=await cryptoApi().subtle.importKey('raw',rootKeyBytes(rootKey),'HKDF',false,['deriveKey']);
  const info=encoder.encode(`paia-sync-object/v${REMOTE_OBJECT_PROTOCOL_VERSION}/${objectId}/key/${keyVersion}`);
  return cryptoApi().subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt,info},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}

export function validateRemoteObject(input){
  if(!plainObject(input))fail('SYNC_REMOTE_OBJECT_INVALID');
  const allowed=new Set(['protocolVersion','objectId','keyVersion','cipher','kdf','salt','nonce','ciphertext']);
  if(Object.keys(input).some(key=>!allowed.has(key)))fail('SYNC_REMOTE_OBJECT_INVALID');
  if(input.protocolVersion!==REMOTE_OBJECT_PROTOCOL_VERSION||!OPAQUE_RE.test(input.objectId||'')||!Number.isSafeInteger(input.keyVersion)||input.keyVersion<1||input.keyVersion>1_000_000||input.cipher!==REMOTE_OBJECT_CIPHER||input.kdf!==REMOTE_OBJECT_KDF)fail('SYNC_REMOTE_OBJECT_INVALID');
  const salt=unb64url(input.salt),nonce=unb64url(input.nonce);
  if(salt.length!==16||nonce.length!==12||typeof input.ciphertext!=='string'||input.ciphertext.length<16||input.ciphertext.length>MAX_CIPHERTEXT_CHARS)fail('SYNC_REMOTE_OBJECT_INVALID');
  unb64url(input.ciphertext);
  return Object.freeze({...input});
}

export function inspectRemoteObjectHeader(input){
  const value=validateRemoteObject(input);
  const {ciphertext,...header}=value;
  return Object.freeze(header);
}

export async function sealRemoteObject({rootKey,keyVersion=1,syncEnvelope,payload,objectId}={}){
  const envelope=validateSyncEnvelope(syncEnvelope);
  if(envelope.permanentTombstone){
    if(payload!==null&&payload!==undefined)fail('SYNC_TOMBSTONE_PAYLOAD_FORBIDDEN');
    payload=null;
  }else if(payload===undefined)fail('SYNC_PAYLOAD_REQUIRED');
  const bundle={bundleVersion:1,syncEnvelope:envelope,payload};
  const plaintext=encoder.encode(canonicalJson(bundle));
  if(plaintext.length>MAX_PLAINTEXT_BYTES)fail('SYNC_PAYLOAD_TOO_LARGE');
  if(!Number.isSafeInteger(keyVersion)||keyVersion<1||keyVersion>1_000_000)fail('SYNC_KEY_VERSION_INVALID');
  objectId=objectId??randomOpaque('object_',18);
  if(!OPAQUE_RE.test(objectId))fail('SYNC_REMOTE_OBJECT_ID_INVALID');
  const salt=randomBytes(16),nonce=randomBytes(12),header=publicHeader({objectId,keyVersion,salt,nonce});
  const aad=encoder.encode(canonicalJson(header));
  const key=await deriveObjectKey(rootKey,salt,{objectId,keyVersion});
  const ciphertext=new Uint8Array(await cryptoApi().subtle.encrypt({name:'AES-GCM',iv:nonce,additionalData:aad,tagLength:128},key,plaintext));
  return Object.freeze({...header,ciphertext:b64url(ciphertext)});
}

export async function openRemoteObject({rootKey,remoteObject}={}){
  const object=validateRemoteObject(remoteObject);
  const {ciphertext,...header}=object;
  const salt=unb64url(object.salt),nonce=unb64url(object.nonce),aad=encoder.encode(canonicalJson(header));
  const key=await deriveObjectKey(rootKey,salt,{objectId:object.objectId,keyVersion:object.keyVersion});
  let plaintext;
  try{
    plaintext=new Uint8Array(await cryptoApi().subtle.decrypt({name:'AES-GCM',iv:nonce,additionalData:aad,tagLength:128},key,unb64url(ciphertext)));
  }catch{fail('SYNC_DECRYPT_FAILED');}
  if(plaintext.length>MAX_PLAINTEXT_BYTES)fail('SYNC_PAYLOAD_TOO_LARGE');
  let parsed;
  try{parsed=JSON.parse(decoder.decode(plaintext));}catch{fail('SYNC_DECRYPT_PAYLOAD_INVALID');}
  if(!plainObject(parsed)||parsed.bundleVersion!==1||Object.keys(parsed).some(key=>!['bundleVersion','syncEnvelope','payload'].includes(key)))fail('SYNC_DECRYPT_PAYLOAD_INVALID');
  const envelope=validateSyncEnvelope(parsed.syncEnvelope);
  if(envelope.permanentTombstone&&parsed.payload!==null)fail('SYNC_DECRYPT_PAYLOAD_INVALID');
  return Object.freeze({bundleVersion:1,syncEnvelope:envelope,payload:parsed.payload});
}

export async function canonicalPayloadHash(payload){
  const hash=await sha256Hex(canonicalJson(payload));
  if(!HASH_RE.test(hash))fail('SYNC_HASH_INVALID');
  return hash;
}
