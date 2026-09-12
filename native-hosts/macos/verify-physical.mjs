import assert from 'node:assert/strict';
import {randomBytes,webcrypto} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const binary=process.argv[2];
const mode=process.argv[3]??'--require-enclave';
if(!binary||!['--require-enclave','--allow-no-enclave'].includes(mode)){
  throw Error('usage: node verify-physical.mjs <native-host-binary> [--require-enclave|--allow-no-enclave]');
}

function call(request){
  const body=Buffer.from(JSON.stringify(request));
  const header=Buffer.alloc(4);header.writeUInt32LE(body.length);
  const run=spawnSync(binary,[],{input:Buffer.concat([header,body]),maxBuffer:2*1024*1024});
  assert.equal(run.status,0,run.stderr.toString());
  assert.ok(run.stdout.length>=4,'native host returned no frame');
  const size=run.stdout.readUInt32LE(0);assert.equal(run.stdout.length,4+size,'native host returned malformed frame');
  return JSON.parse(run.stdout.subarray(4).toString('utf8'));
}

const suffix=randomBytes(12).toString('hex');
const rootSlot={version:1,accountId:`physical_${suffix}`,deviceId:`device_${suffix}`,secretClass:'root_keyring',keyVersion:1};
const signSlot={version:1,accountId:`physical_${suffix}`,deviceId:`device_${suffix}`,secretClass:'device_signing_private',keyVersion:null};
let rootCreated=false,signingCreated=false;

async function verifySignature(publicKeyJwk,payload,signature){
  const key=await webcrypto.subtle.importKey('jwk',publicKeyJwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  return webcrypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,Buffer.from(signature,'base64url'),payload);
}

try{
  const probe=call({version:1,operation:'probe'});
  assert.equal(probe.ok,true);assert.equal(probe.platform,'macos');
  assert.equal(probe.isolatedFromAppStorage,true);assert.equal(probe.supportsAtomicReplace,true);assert.equal(probe.supportsDelete,true);

  const secretA=randomBytes(32).toString('base64url'),secretB=randomBytes(32).toString('base64url');
  assert.equal(call({version:1,operation:'writeSecret',slot:rootSlot,secret:secretA}).ok,true);rootCreated=true;
  assert.equal(call({version:1,operation:'readSecret',slot:rootSlot}).secret,secretA);
  assert.equal(call({version:1,operation:'writeSecret',slot:rootSlot,secret:secretB}).ok,true);
  assert.equal(call({version:1,operation:'readSecret',slot:rootSlot}).secret,secretB);
  assert.equal(call({version:1,operation:'deleteSecret',slot:rootSlot}).ok,true);rootCreated=false;
  assert.equal(call({version:1,operation:'readSecret',slot:rootSlot}).secret,null);

  if(!probe.secureEnclaveAvailable){
    const created=call({version:1,operation:'createSigningKey',slot:signSlot});
    assert.equal(created.ok,false);assert.equal(created.code,'SECURE_ENCLAVE_UNAVAILABLE');
    const evidence={schemaVersion:1,passed:mode==='--allow-no-enclave',secureEnclaveAvailable:false,keychainRestartReadVerified:true,keychainAtomicReplaceVerified:true,keychainDeleteVerified:true,persistentSigningRestartVerified:false,signingDeleteVerified:false};
    console.log(JSON.stringify(evidence));
    if(mode==='--require-enclave')process.exit(3);
    process.exit(0);
  }

  const created=call({version:1,operation:'createSigningKey',slot:signSlot});signingCreated=true;
  assert.equal(created.ok,true);assert.equal(created.publicKeyJwk.kty,'EC');assert.equal(created.publicKeyJwk.crv,'P-256');
  const reopened=call({version:1,operation:'getSigningPublicKey',slot:signSlot});
  assert.equal(reopened.ok,true);assert.deepEqual(reopened.publicKeyJwk,created.publicKeyJwk,'public key changed across native-host process restart');

  const payloadA=Buffer.from('paia-physical-validation-A-'+suffix);
  const signedA=call({version:1,operation:'sign',slot:signSlot,payload:payloadA.toString('base64url')});
  assert.equal(signedA.ok,true);assert.equal(Buffer.from(signedA.signature,'base64url').length,64);
  assert.equal(await verifySignature(created.publicKeyJwk,payloadA,signedA.signature),true,'first signature did not verify');

  const payloadB=Buffer.from('paia-physical-validation-B-'+suffix);
  const signedB=call({version:1,operation:'sign',slot:signSlot,payload:payloadB.toString('base64url')});
  assert.equal(signedB.ok,true);assert.equal(await verifySignature(created.publicKeyJwk,payloadB,signedB.signature),true,'restarted signer signature did not verify');

  assert.equal(call({version:1,operation:'deleteSigningKey',slot:signSlot}).ok,true);signingCreated=false;
  const missing=call({version:1,operation:'getSigningPublicKey',slot:signSlot});
  assert.equal(missing.ok,false);assert.equal(missing.code,'SECURE_SIGNING_KEY_NOT_FOUND');

  console.log(JSON.stringify({schemaVersion:1,passed:true,secureEnclaveAvailable:true,keychainRestartReadVerified:true,keychainAtomicReplaceVerified:true,keychainDeleteVerified:true,persistentSigningRestartVerified:true,signingDeleteVerified:true}));
}catch(error){
  console.error(JSON.stringify({schemaVersion:1,passed:false,code:'PHYSICAL_VALIDATION_FAILED'}));
  throw error;
}finally{
  if(rootCreated)call({version:1,operation:'deleteSecret',slot:rootSlot});
  if(signingCreated)call({version:1,operation:'deleteSigningKey',slot:signSlot});
}
