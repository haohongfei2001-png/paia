import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {retentionNativeFixture,RETENTION_SPECS,NATIVE_OWNER_EXTRA} from './retention-native-fixture.mjs';
test('native retention bridge preserves both complete original fixtures and all 27 names',async()=>{
 let count=0;
 for(const [kind,spec]of Object.entries(RETENTION_SPECS)){
  const source=await readFile(new URL('../'+spec.file,import.meta.url),'utf8'),fixture=retentionNativeFixture(source,kind);
  count+=spec.names.length;assert.equal(spec.names.length,kind==='retention'?14:13);
  assert.ok(!/fake-indexeddb|new IDBFactory|from ['"]node:/.test(fixture));
  // Every original assertion invocation is retained; no replacements touch assertions.
  const assertions=source.match(/assert\.[a-zA-Z]+\(/g)||[];for(const method of new Set(assertions))assert.ok(fixture.split(method).length>=source.split(method).length);
  for(const name of spec.names)assert.ok(fixture.includes(JSON.stringify(name)));
  assert.throws(()=>retentionNativeFixture(source+'\n',kind),/RETENTION_ORIGINAL_HASH_CHANGED/);
 }
 assert.equal(count,27);assert.ok(NATIVE_OWNER_EXTRA.includes('listener interception'));
});

test('runtime and proof inventories are the current complete static/literal imported closures',async()=>{
 const {collectInventories,GENERATED_PATHS,generatedBytes}=await import('./retention-native-proof.mjs');
 const {RETENTION_RUNTIME_PATHS,RETENTION_PROOF_PATHS}=await import('./retention-native-paths.mjs');
 const {fileURLToPath}=await import('node:url');const base=fileURLToPath(new URL('../..',import.meta.url)),current=await collectInventories(base);
 assert.deepEqual(current.runtimePaths,RETENTION_RUNTIME_PATHS);assert.deepEqual(current.proofPaths,RETENTION_PROOF_PATHS);assert.ok(current.runtimePaths.length>96);
 for(const required of ['tests/harness/fake-chatgpt.mjs','tests/harness/synthetic-device-options.mjs','tests/native-sync/storage-harness.mjs','tests/native-sync/storage-worker-fixture.mjs','tests/native-sync/immutable-objects.mjs','tests/native-sync/proof-oracles.mjs','tests/native-sync/retention-native-fixture.mjs','tests/native-sync/retention-native-proof.mjs','tests/native-sync/retention-native-receipt.mjs','tests/native-sync/human-retention-native.test.mjs','scripts/build_current_release.py','scripts/package_assets.py'])assert.ok(current.proofPaths.includes(required),required);
 assert.deepEqual(Object.keys(await generatedBytes(base)).sort(),GENERATED_PATHS);
});
