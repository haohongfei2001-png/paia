import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const binary=process.argv[2];
if(!binary)throw Error('usage: node test-host.mjs <native-host-binary>');

function call(request){
  const body=Buffer.from(JSON.stringify(request));
  const header=Buffer.alloc(4);header.writeUInt32LE(body.length);
  const run=spawnSync(binary,[],{input:Buffer.concat([header,body]),maxBuffer:2*1024*1024});
  assert.equal(run.status,0,run.stderr.toString());
  assert.ok(run.stdout.length>=4,'native host returned no frame');
  const size=run.stdout.readUInt32LE(0);assert.equal(run.stdout.length,4+size);
  return JSON.parse(run.stdout.subarray(4).toString('utf8'));
}

const suffix=randomBytes(8).toString('hex');
const rootSlot={version:1,accountId:`account_${suffix}`,deviceId:`device_${suffix}`,secretClass:'root_keyring',keyVersion:1};
const signSlot={version:1,accountId:`account_${suffix}`,deviceId:`device_${suffix}`,secretClass:'device_signing_private',keyVersion:null};
const secret=randomBytes(32).toString('base64url');

const probe=call({version:1,operation:'probe'});
assert.equal(probe.ok,true);assert.equal(probe.platform,'macos');assert.equal(probe.isolatedFromAppStorage,true);
assert.equal(probe.supportsAtomicReplace,true);assert.equal(probe.supportsDelete,true);

assert.equal(call({version:1,operation:'writeSecret',slot:rootSlot,secret}).ok,true);
assert.equal(call({version:1,operation:'readSecret',slot:rootSlot}).secret,secret);
assert.equal(call({version:1,operation:'deleteSecret',slot:rootSlot}).ok,true);
assert.equal(call({version:1,operation:'readSecret',slot:rootSlot}).secret,null);

if(probe.secureEnclaveAvailable){
  const created=call({version:1,operation:'createSigningKey',slot:signSlot});
  assert.equal(created.ok,true);assert.equal(created.publicKeyJwk.kty,'EC');assert.equal(created.publicKeyJwk.crv,'P-256');
  const payload=Buffer.from('paia-round5f-native-host').toString('base64url');
  const signed=call({version:1,operation:'sign',slot:signSlot,payload});
  assert.equal(signed.ok,true);assert.equal(Buffer.from(signed.signature,'base64url').length,64);
  assert.equal(call({version:1,operation:'deleteSigningKey',slot:signSlot}).ok,true);
}else{
  const created=call({version:1,operation:'createSigningKey',slot:signSlot});
  assert.equal(created.ok,false);assert.equal(created.code,'SECURE_ENCLAVE_UNAVAILABLE');
}

console.log(JSON.stringify({ok:true,secureEnclaveAvailable:probe.secureEnclaveAvailable}));
