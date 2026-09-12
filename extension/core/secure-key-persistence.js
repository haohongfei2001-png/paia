const OPAQUE_RE=/^[A-Za-z0-9_.:-]{3,160}$/;
const SECRET_CLASSES=new Set(['root_keyring','device_signing_private']);
const PRODUCTION_PROTECTIONS=new Set(['os_keystore','hardware_keystore']);
const MAX_SECRET_BYTES=256*1024;

export const SECURE_KEY_PERSISTENCE_VERSION=1;

export class SecureKeyPersistenceError extends Error{
  constructor(code){super(code);this.name='SecureKeyPersistenceError';this.code=code;}
}

const fail=code=>{throw new SecureKeyPersistenceError(code);};
const plainObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const copyBytes=value=>{
  if(!(value instanceof Uint8Array)||value.length<1||value.length>MAX_SECRET_BYTES)fail('SECURE_SECRET_INVALID');
  return new Uint8Array(value);
};

function normalizeCapabilities(input){
  if(!plainObject(input)||input.version!==1||!OPAQUE_RE.test(input.providerId||''))fail('SECURE_PROVIDER_CAPABILITIES_INVALID');
  const allowed=new Set(['version','providerId','protection','isolatedFromAppStorage','supportsAtomicReplace','supportsDelete','supportsNonExportableSigningKey','testOnly']);
  if(Object.keys(input).some(key=>!allowed.has(key)))fail('SECURE_PROVIDER_CAPABILITIES_INVALID');
  if(!['os_keystore','hardware_keystore','test_memory'].includes(input.protection))fail('SECURE_PROVIDER_CAPABILITIES_INVALID');
  for(const key of ['isolatedFromAppStorage','supportsAtomicReplace','supportsDelete','supportsNonExportableSigningKey','testOnly'])if(typeof input[key]!=='boolean')fail('SECURE_PROVIDER_CAPABILITIES_INVALID');
  return Object.freeze({...input});
}

export function isProductionSecurePersistenceProvider(capabilities){
  const value=normalizeCapabilities(capabilities);
  return !value.testOnly&&PRODUCTION_PROTECTIONS.has(value.protection)&&value.isolatedFromAppStorage&&value.supportsAtomicReplace&&value.supportsDelete&&value.supportsNonExportableSigningKey;
}

export function currentExtensionSecurePersistenceReadiness(){
  return Object.freeze({
    version:SECURE_KEY_PERSISTENCE_VERSION,
    platform:'chrome_extension',
    available:false,
    reason:'SECURE_OS_KEYSTORE_PROVIDER_REQUIRED',
  });
}

export function createSecureSecretSlot({accountId,deviceId,secretClass,keyVersion=null}={}){
  if(!OPAQUE_RE.test(accountId||'')||!OPAQUE_RE.test(deviceId||'')||!SECRET_CLASSES.has(secretClass))fail('SECURE_SECRET_SLOT_INVALID');
  if(secretClass==='root_keyring'){
    if(!Number.isSafeInteger(keyVersion)||keyVersion<1||keyVersion>1_000_000)fail('SECURE_SECRET_SLOT_INVALID');
  }else if(keyVersion!==null)fail('SECURE_SECRET_SLOT_INVALID');
  return Object.freeze({version:1,accountId,deviceId,secretClass,keyVersion});
}

function slotKey(slot){
  slot=createSecureSecretSlot(slot);
  return `${slot.accountId}\u0000${slot.deviceId}\u0000${slot.secretClass}\u0000${slot.keyVersion??''}`;
}

export class TestMemorySecretProvider{
  #rows=new Map();
  capabilities=Object.freeze({
    version:1,
    providerId:'paia.test.memory',
    protection:'test_memory',
    isolatedFromAppStorage:true,
    supportsAtomicReplace:true,
    supportsDelete:true,
    supportsNonExportableSigningKey:false,
    testOnly:true,
  });
  async write(slot,secret){
    this.#rows.set(slotKey(slot),copyBytes(secret));
  }
  async read(slot){
    const value=this.#rows.get(slotKey(slot));
    return value?new Uint8Array(value):null;
  }
  async delete(slot){
    this.#rows.delete(slotKey(slot));
  }
  async has(slot){return this.#rows.has(slotKey(slot));}
  async clear(){
    for(const value of this.#rows.values())value.fill(0);
    this.#rows.clear();
  }
}

export class SecureKeyPersistenceGate{
  #provider;
  #allowTestProvider;
  constructor(provider,{allowTestProvider=false}={}){
    if(!provider||typeof provider.write!=='function'||typeof provider.read!=='function'||typeof provider.delete!=='function')fail('SECURE_PROVIDER_INVALID');
    this.capabilities=normalizeCapabilities(provider.capabilities);
    this.#provider=provider;
    this.#allowTestProvider=Boolean(allowTestProvider);
    if(this.capabilities.testOnly&&!this.#allowTestProvider)fail('SECURE_TEST_PROVIDER_FORBIDDEN');
    if(!this.capabilities.testOnly&&!isProductionSecurePersistenceProvider(this.capabilities))fail('SECURE_PROVIDER_NOT_PRODUCTION_READY');
  }
  get productionReady(){return isProductionSecurePersistenceProvider(this.capabilities);}
  async store(slot,secret){
    if(this.capabilities.testOnly&&!this.#allowTestProvider)fail('SECURE_TEST_PROVIDER_FORBIDDEN');
    await this.#provider.write(createSecureSecretSlot(slot),copyBytes(secret));
  }
  async load(slot){
    const value=await this.#provider.read(createSecureSecretSlot(slot));
    if(value===null)return null;
    return copyBytes(value);
  }
  async remove(slot){await this.#provider.delete(createSecureSecretSlot(slot));}
}

export function requireProductionSecurePersistence(provider){
  const gate=new SecureKeyPersistenceGate(provider);
  if(!gate.productionReady)fail('SECURE_PROVIDER_NOT_PRODUCTION_READY');
  return gate;
}
