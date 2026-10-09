import assert from 'node:assert/strict';
import {RETENTION_SPECS,NATIVE_OWNER_EXTRA} from './retention-native-fixture.mjs';
export function assertRetentionNativeReceipt(receipt,{head,variant,runtimeHashes,fixtureHashes}){
 assert.equal(receipt.schema,1);assert.equal(receipt.scope,'private-human-retention-native');assert.equal(receipt.head,head);assert.equal(receipt.variant,variant);assert.equal(receipt.result,'PASS');
 assert.equal(receipt.provider,false);assert.equal(receipt.productionRegistration,false);assert.deepEqual(receipt.runtimeHashes,runtimeHashes);assert.deepEqual(receipt.fixtureHashes,fixtureHashes);assert.deepEqual(receipt.originalFixtures,RETENTION_SPECS);
 const expected=Object.entries(RETENTION_SPECS).flatMap(([suite,spec])=>[...spec.names,...(suite==='owner'?[NATIVE_OWNER_EXTRA]:[])].map((name,index)=>({suite,name,index})));
 assert.equal(expected.length,28);assert.equal(receipt.cases.length,expected.length);
 receipt.cases.forEach((row,index)=>{assert.deepEqual({suite:row.suite,name:row.name,index:row.index},expected[index]);assert.equal(row.result,'PASS');assert.equal(row.nativeFactory,true);assert.ok(Number.isSafeInteger(row.assertions)&&row.assertions>0);assert.ok(Number.isFinite(row.durationMs)&&row.durationMs>=0);
  assert.deepEqual(Object.keys(row).sort(),['assertions','durationMs','index','name','nativeFactory','result','suite',...(index===27?['extra']:[])].sort());
 });
 assert.deepEqual(receipt.cases[27].extra,{intercepts:0,removals:0,dtoInvocations:0,falseEvents:1,trustedCompletes:1});
 assert.equal(receipt.isolation.nativeFactory,true);assert.equal(receipt.isolation.networkAttempts,0);assert.equal(receipt.isolation.httpRequests,0);assert.equal(receipt.isolation.networkLedger.complete,true);
 return receipt;
}
