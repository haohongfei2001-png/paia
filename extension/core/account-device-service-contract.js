const encoder=new TextEncoder();
const OPAQUE_RE=/^[A-Za-z0-9_-]{8,160}$/;
const MAX_RELAY_BYTES=96*1024;
const DEFAULT_RELAY_TTL_MS=5*60*1000;
const MAX_RELAY_TTL_MS=15*60*1000;
const SENSITIVE_KEYS=new Set(['keyMaterial','rootKey','rootKeys','privateKey','privateKeyJwk','recoverySecret','password','passphrase','body','title','note','query','contextText','payloadHash','baseHash','factsHash','entityId','revisionId']);

export const ACCOUNT_DEVICE_SERVICE_CONTRACT_VERSION=1;

export class AccountDeviceServiceError extends Error{
  constructor(code){super(code);this.name='AccountDeviceServiceError';this.code=code;}
}

const fail=code=>{throw new AccountDeviceServiceError(code);};
const plainObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const cryptoApi=()=>{
  const value=globalThis.crypto;
  if(!value?.getRandomValues)fail('ACCOUNT_SERVICE_CRYPTO_UNAVAILABLE');
  return value;
};
function b64url(bytes){
  let binary='';
  for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(bytes.length,i+0x8000)));
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function randomOpaque(prefix,length=18){return prefix+b64url(cryptoApi().getRandomValues(new Uint8Array(length)));}

function cloneJson(value){return JSON.parse(JSON.stringify(value));}

function validatePublicCredential(input){
  if(!plainObject(input)||input.version!==1||!OPAQUE_RE.test(input.deviceId||'')||!OPAQUE_RE.test(input.credentialId||'')||input.algorithm!=='ECDSA-P256-SHA256'||!plainObject(input.publicKeyJwk))fail('ACCOUNT_DEVICE_CREDENTIAL_INVALID');
  const allowed=new Set(['version','deviceId','credentialId','algorithm','publicKeyJwk']);
  if(Object.keys(input).some(key=>!allowed.has(key)))fail('ACCOUNT_DEVICE_CREDENTIAL_INVALID');
  const jwk=input.publicKeyJwk;
  if(jwk.kty!=='EC'||jwk.crv!=='P-256'||typeof jwk.x!=='string'||typeof jwk.y!=='string'||Object.hasOwn(jwk,'d'))fail('ACCOUNT_DEVICE_CREDENTIAL_INVALID');
  return Object.freeze(cloneJson(input));
}

function validateRelayArtifact(input,depth=0){
  if(depth>20)fail('ACCOUNT_RELAY_ARTIFACT_INVALID');
  if(input===null||typeof input==='string'||typeof input==='boolean')return;
  if(typeof input==='number'){
    if(!Number.isFinite(input))fail('ACCOUNT_RELAY_ARTIFACT_INVALID');
    return;
  }
  if(Array.isArray(input)){
    for(const item of input)validateRelayArtifact(item,depth+1);
    return;
  }
  if(!plainObject(input))fail('ACCOUNT_RELAY_ARTIFACT_INVALID');
  for(const [key,value] of Object.entries(input)){
    if(SENSITIVE_KEYS.has(key))fail('ACCOUNT_RELAY_SECRET_FORBIDDEN');
    if(key==='publicKeyJwk'&&plainObject(value)&&Object.hasOwn(value,'d'))fail('ACCOUNT_RELAY_SECRET_FORBIDDEN');
    validateRelayArtifact(value,depth+1);
  }
}

function boundedArtifact(input){
  validateRelayArtifact(input);
  let encoded;
  try{encoded=JSON.stringify(input);}catch{fail('ACCOUNT_RELAY_ARTIFACT_INVALID');}
  if(encoder.encode(encoded).length>MAX_RELAY_BYTES)fail('ACCOUNT_RELAY_ARTIFACT_TOO_LARGE');
  return Object.freeze(cloneJson(input));
}

export class LocalAccountDeviceServiceSimulator{
  #accounts=new Map();
  #sessions=new Map();
  #relays=new Map();
  #now;
  constructor({now=()=>Date.now()}={}){
    if(typeof now!=='function')fail('ACCOUNT_SERVICE_CLOCK_INVALID');
    this.#now=now;
  }
  #account(accountId){
    const account=this.#accounts.get(accountId);
    if(!account)fail('ACCOUNT_NOT_FOUND');
    return account;
  }
  #authorized(sessionToken){
    if(!OPAQUE_RE.test(sessionToken||''))fail('ACCOUNT_SESSION_INVALID');
    const session=this.#sessions.get(sessionToken);
    if(!session)fail('ACCOUNT_SESSION_INVALID');
    const account=this.#account(session.accountId),row=account.devices.get(session.credentialId);
    if(!row||row.status!=='trusted')fail('ACCOUNT_SESSION_REVOKED');
    return {account,row,session};
  }
  #newSession(accountId,credentialId){
    const token=randomOpaque('session_',24);
    this.#sessions.set(token,{accountId,credentialId,issuedAt:this.#now()});
    return token;
  }
  bootstrap({publicCredential,keyVersion=1}={}){
    publicCredential=validatePublicCredential(publicCredential);
    if(!Number.isSafeInteger(keyVersion)||keyVersion<1||keyVersion>1_000_000)fail('ACCOUNT_KEY_VERSION_INVALID');
    const accountId=randomOpaque('account_',18),devices=new Map();
    devices.set(publicCredential.credentialId,{publicCredential,status:'trusted',latestKeyVersion:keyVersion,addedAt:this.#now(),revokedAt:null});
    this.#accounts.set(accountId,{accountId,devices,membershipEpoch:1});
    return Object.freeze({accountId,sessionToken:this.#newSession(accountId,publicCredential.credentialId)});
  }
  listDevices({sessionToken}={}){
    const {account}=this.#authorized(sessionToken);
    return Object.freeze([...account.devices.values()].map(row=>Object.freeze({
      publicCredential:row.publicCredential,
      status:row.status,
      latestKeyVersion:row.latestKeyVersion,
      addedAt:row.addedAt,
      revokedAt:row.revokedAt,
    })));
  }
  trustDevice({sessionToken,publicCredential,keyVersion}={}){
    const {account}=this.#authorized(sessionToken);
    publicCredential=validatePublicCredential(publicCredential);
    if(!Number.isSafeInteger(keyVersion)||keyVersion<1||keyVersion>1_000_000)fail('ACCOUNT_KEY_VERSION_INVALID');
    const prior=account.devices.get(publicCredential.credentialId);
    if(prior&&prior.status==='trusted')fail('ACCOUNT_DEVICE_ALREADY_TRUSTED');
    account.devices.set(publicCredential.credentialId,{publicCredential,status:'trusted',latestKeyVersion:keyVersion,addedAt:this.#now(),revokedAt:null});
    account.membershipEpoch++;
    return Object.freeze({sessionToken:this.#newSession(account.accountId,publicCredential.credentialId),membershipEpoch:account.membershipEpoch});
  }
  updateDeviceKeyVersion({sessionToken,credentialId,keyVersion}={}){
    const {account}=this.#authorized(sessionToken);
    const row=account.devices.get(credentialId);
    if(!row||row.status!=='trusted')fail('ACCOUNT_DEVICE_NOT_TRUSTED');
    if(!Number.isSafeInteger(keyVersion)||keyVersion<row.latestKeyVersion||keyVersion>1_000_000)fail('ACCOUNT_KEY_VERSION_INVALID');
    row.latestKeyVersion=keyVersion;
  }
  revokeDevice({sessionToken,credentialId}={}){
    const {account}=this.#authorized(sessionToken),row=account.devices.get(credentialId);
    if(!row||row.status!=='trusted')fail('ACCOUNT_DEVICE_NOT_TRUSTED');
    const trusted=[...account.devices.values()].filter(item=>item.status==='trusted');
    if(trusted.length<=1)fail('ACCOUNT_LAST_TRUSTED_DEVICE');
    row.status='revoked';row.revokedAt=this.#now();account.membershipEpoch++;
    return account.membershipEpoch;
  }
  createPairingRelay({accountId,request,ttlMs=DEFAULT_RELAY_TTL_MS}={}){
    const account=this.#account(accountId);
    if(!Number.isSafeInteger(ttlMs)||ttlMs<30_000||ttlMs>MAX_RELAY_TTL_MS)fail('ACCOUNT_RELAY_TTL_INVALID');
    const relayId=randomOpaque('relay_',18),accessToken=randomOpaque('relay_access_',24),now=this.#now();
    this.#relays.set(relayId,{accountId:account.accountId,accessToken,request:boundedArtifact(request),challenge:null,finalPackage:null,state:'request',createdAt:now,expiresAt:now+ttlMs});
    return Object.freeze({relayId,accessToken,expiresAt:now+ttlMs});
  }
  #relay(relayId){
    const relay=this.#relays.get(relayId);
    if(!relay)fail('ACCOUNT_RELAY_NOT_FOUND');
    if(this.#now()>=relay.expiresAt){relay.state='expired';fail('ACCOUNT_RELAY_EXPIRED');}
    return relay;
  }
  readPairingRequest({sessionToken,relayId}={}){
    const {account}=this.#authorized(sessionToken),relay=this.#relay(relayId);
    if(relay.accountId!==account.accountId)fail('ACCOUNT_RELAY_ACCOUNT_MISMATCH');
    return relay.request;
  }
  publishPairingChallenge({sessionToken,relayId,challenge}={}){
    const {account}=this.#authorized(sessionToken),relay=this.#relay(relayId);
    if(relay.accountId!==account.accountId)fail('ACCOUNT_RELAY_ACCOUNT_MISMATCH');
    if(relay.state!=='request')fail('ACCOUNT_RELAY_STATE');
    relay.challenge=boundedArtifact(challenge);relay.state='challenge';
  }
  readPairingChallenge({relayId,accessToken}={}){
    const relay=this.#relay(relayId);
    if(relay.accessToken!==accessToken)fail('ACCOUNT_RELAY_ACCESS');
    if(!['challenge','package'].includes(relay.state))fail('ACCOUNT_RELAY_STATE');
    return relay.challenge;
  }
  publishPairingPackage({sessionToken,relayId,onboardingPackage}={}){
    const {account}=this.#authorized(sessionToken),relay=this.#relay(relayId);
    if(relay.accountId!==account.accountId)fail('ACCOUNT_RELAY_ACCOUNT_MISMATCH');
    if(relay.state!=='challenge')fail('ACCOUNT_RELAY_STATE');
    relay.finalPackage=boundedArtifact(onboardingPackage);relay.state='package';
  }
  consumePairingPackage({relayId,accessToken}={}){
    const relay=this.#relay(relayId);
    if(relay.accessToken!==accessToken)fail('ACCOUNT_RELAY_ACCESS');
    if(relay.state!=='package')fail('ACCOUNT_RELAY_STATE');
    relay.state='consumed';
    const value=relay.finalPackage;
    relay.finalPackage=null;
    return value;
  }
  relayStatus({relayId,accessToken}={}){
    const relay=this.#relay(relayId);
    if(relay.accessToken!==accessToken)fail('ACCOUNT_RELAY_ACCESS');
    return Object.freeze({state:relay.state,expiresAt:relay.expiresAt});
  }
}
