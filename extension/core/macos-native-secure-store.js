import {SecureKeyPersistenceError,createSecureSecretSlot,isProductionSecurePersistenceProvider} from './secure-key-persistence.js';

const HOST_NAME='com.paia.secure_store';
const PROTOCOL_VERSION=1;
const B64_RE=/^[A-Za-z0-9_-]+$/;
const OPAQUE_RE=/^[A-Za-z0-9_.:-]{3,160}$/;
const NATIVE_PERMISSION=Object.freeze({permissions:Object.freeze(['nativeMessaging'])});

const fail=code=>{throw new SecureKeyPersistenceError(code);};

function b64url(bytes){
  let binary='';
  for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(bytes.length,i+0x8000)));
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function unb64url(value){
  if(typeof value!=='string'||!B64_RE.test(value))fail('SECURE_NATIVE_HOST_PROTOCOL_INVALID');
  const padded=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4);
  let binary;
  try{binary=atob(padded);}catch{fail('SECURE_NATIVE_HOST_PROTOCOL_INVALID');}
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return bytes;
}

function normalizePublicJwk(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||value.kty!=='EC'||value.crv!=='P-256'||typeof value.x!=='string'||typeof value.y!=='string'||!B64_RE.test(value.x)||!B64_RE.test(value.y))fail('SECURE_NATIVE_HOST_PROTOCOL_INVALID');
  return Object.freeze({kty:'EC',crv:'P-256',x:value.x,y:value.y,ext:true,key_ops:Object.freeze(['verify'])});
}

function wireSlot(slot){
  slot=createSecureSecretSlot(slot);
  return {version:slot.version,accountId:slot.accountId,deviceId:slot.deviceId,secretClass:slot.secretClass,keyVersion:slot.keyVersion};
}

function runtimeOrFail(runtime){
  runtime=runtime??globalThis.chrome?.runtime;
  if(!runtime||typeof runtime.sendNativeMessage!=='function')fail('SECURE_NATIVE_MESSAGING_UNAVAILABLE');
  return runtime;
}

function permissionApi(permissions){return permissions??globalThis.chrome?.permissions??null;}

export async function hasMacOSNativeSecureStorePermission({permissions}={}){
  const api=permissionApi(permissions);
  if(!api||typeof api.contains!=='function')return false;
  try{return Boolean(await api.contains(NATIVE_PERMISSION));}
  catch{return false;}
}

export async function requestMacOSNativeSecureStorePermission({permissions}={}){
  const api=permissionApi(permissions);
  if(!api||typeof api.request!=='function')fail('SECURE_NATIVE_MESSAGING_PERMISSION_API_UNAVAILABLE');
  try{return Boolean(await api.request(NATIVE_PERMISSION));}
  catch{fail('SECURE_NATIVE_MESSAGING_PERMISSION_REQUEST_FAILED');}
}

function mapRuntimeFailure(message=''){
  if(/native messaging host not found|specified native messaging host not found/i.test(message))return 'SECURE_NATIVE_HOST_UNAVAILABLE';
  if(/access to the specified native messaging host is forbidden/i.test(message))return 'SECURE_NATIVE_HOST_FORBIDDEN';
  return 'SECURE_NATIVE_HOST_COMMUNICATION_FAILED';
}

async function sendNative(runtime,request){
  runtime=runtimeOrFail(runtime);
  return new Promise((resolve,reject)=>{
    try{
      runtime.sendNativeMessage(HOST_NAME,request,response=>{
        const lastError=runtime.lastError;
        if(lastError){reject(new SecureKeyPersistenceError(mapRuntimeFailure(lastError.message||'')));return;}
        if(!response||typeof response!=='object'||Array.isArray(response)){reject(new SecureKeyPersistenceError('SECURE_NATIVE_HOST_PROTOCOL_INVALID'));return;}
        if(response.ok!==true){reject(new SecureKeyPersistenceError(typeof response.code==='string'&&OPAQUE_RE.test(response.code)?response.code:'SECURE_NATIVE_HOST_REQUEST_FAILED'));return;}
        resolve(response);
      });
    }catch{reject(new SecureKeyPersistenceError('SECURE_NATIVE_HOST_COMMUNICATION_FAILED'));}
  });
}

function capabilitiesFromProbe(response){
  if(response.version!==PROTOCOL_VERSION||response.platform!=='macos'||typeof response.providerId!=='string'||!OPAQUE_RE.test(response.providerId)||response.secureEnclaveAvailable!==true)fail('SECURE_ENCLAVE_REQUIRED');
  const capabilities={
    version:1,
    providerId:response.providerId,
    protection:'os_keystore',
    isolatedFromAppStorage:response.isolatedFromAppStorage===true,
    supportsAtomicReplace:response.supportsAtomicReplace===true,
    supportsDelete:response.supportsDelete===true,
    supportsNonExportableSigningKey:response.supportsNonExportableSigningKey===true,
    testOnly:false,
  };
  if(!isProductionSecurePersistenceProvider(capabilities))fail('SECURE_PROVIDER_NOT_PRODUCTION_READY');
  return Object.freeze(capabilities);
}

export class MacOSNativeSecureSecretProvider{
  #runtime;
  constructor(token,{runtime,capabilities}={}){
    if(token!==HOST_NAME)fail('SECURE_NATIVE_PROVIDER_CONSTRUCTOR');
    this.#runtime=runtime;
    this.capabilities=capabilities;
  }
  static async connect({runtime,permissions}={}){
    if(!(await hasMacOSNativeSecureStorePermission({permissions})))fail('SECURE_NATIVE_MESSAGING_PERMISSION_REQUIRED');
    runtime=runtimeOrFail(runtime);
    const response=await sendNative(runtime,{version:PROTOCOL_VERSION,operation:'probe'});
    return new MacOSNativeSecureSecretProvider(HOST_NAME,{runtime,capabilities:capabilitiesFromProbe(response)});
  }
  async write(slot,secret){
    slot=createSecureSecretSlot(slot);
    if(slot.secretClass!=='root_keyring')fail('SECURE_NON_EXPORTABLE_SIGNING_KEY_REQUIRED');
    await sendNative(this.#runtime,{version:PROTOCOL_VERSION,operation:'writeSecret',slot:wireSlot(slot),secret:b64url(secret)});
  }
  async read(slot){
    slot=createSecureSecretSlot(slot);
    if(slot.secretClass!=='root_keyring')fail('SECURE_NON_EXPORTABLE_SIGNING_KEY_REQUIRED');
    const response=await sendNative(this.#runtime,{version:PROTOCOL_VERSION,operation:'readSecret',slot:wireSlot(slot)});
    if(response.secret===null)return null;
    return unb64url(response.secret);
  }
  async delete(slot){
    slot=createSecureSecretSlot(slot);
    if(slot.secretClass!=='root_keyring')fail('SECURE_NON_EXPORTABLE_SIGNING_KEY_REQUIRED');
    await sendNative(this.#runtime,{version:PROTOCOL_VERSION,operation:'deleteSecret',slot:wireSlot(slot)});
  }
  async createSigningKey(slot){
    slot=createSecureSecretSlot(slot);
    if(slot.secretClass!=='device_signing_private')fail('SECURE_SIGNING_SLOT_REQUIRED');
    const response=await sendNative(this.#runtime,{version:PROTOCOL_VERSION,operation:'createSigningKey',slot:wireSlot(slot)});
    return normalizePublicJwk(response.publicKeyJwk);
  }
  async getSigningPublicKey(slot){
    slot=createSecureSecretSlot(slot);
    if(slot.secretClass!=='device_signing_private')fail('SECURE_SIGNING_SLOT_REQUIRED');
    const response=await sendNative(this.#runtime,{version:PROTOCOL_VERSION,operation:'getSigningPublicKey',slot:wireSlot(slot)});
    return normalizePublicJwk(response.publicKeyJwk);
  }
  async sign(slot,message){
    slot=createSecureSecretSlot(slot);
    if(slot.secretClass!=='device_signing_private')fail('SECURE_SIGNING_SLOT_REQUIRED');
    const response=await sendNative(this.#runtime,{version:PROTOCOL_VERSION,operation:'sign',slot:wireSlot(slot),payload:b64url(message)});
    const signature=unb64url(response.signature);
    if(signature.length!==64)fail('SECURE_NATIVE_HOST_PROTOCOL_INVALID');
    return signature;
  }
  async deleteSigningKey(slot){
    slot=createSecureSecretSlot(slot);
    if(slot.secretClass!=='device_signing_private')fail('SECURE_SIGNING_SLOT_REQUIRED');
    await sendNative(this.#runtime,{version:PROTOCOL_VERSION,operation:'deleteSigningKey',slot:wireSlot(slot)});
  }
}

export async function probeCurrentExtensionSecurePersistenceReadiness({runtime,permissions}={}){
  if(!(await hasMacOSNativeSecureStorePermission({permissions})))return Object.freeze({version:1,platform:'chrome_extension_macos',available:false,providerId:null,reason:'SECURE_NATIVE_MESSAGING_PERMISSION_REQUIRED'});
  try{
    const provider=await MacOSNativeSecureSecretProvider.connect({runtime,permissions});
    return Object.freeze({version:1,platform:'chrome_extension_macos',available:true,providerId:provider.capabilities.providerId,reason:null});
  }catch(error){
    const code=error instanceof SecureKeyPersistenceError?error.code:'SECURE_NATIVE_HOST_COMMUNICATION_FAILED';
    return Object.freeze({version:1,platform:'chrome_extension_macos',available:false,providerId:null,reason:code});
  }
}

export const MACOS_NATIVE_SECURE_STORE_HOST=HOST_NAME;
