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
