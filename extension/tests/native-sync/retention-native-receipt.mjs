import assert from 'node:assert/strict';
import {RETENTION_SPECS,NATIVE_OWNER_EXTRA} from './retention-native-fixture.mjs';
import {RETENTION_RUNTIME_PATHS,RETENTION_PROOF_PATHS} from './retention-native-paths.mjs';
import {GENERATED_PATHS} from './retention-native-proof.mjs';
import {assertNetworkLedger} from './proof-oracles.mjs';
const shape=(value,keys)=>{assert.ok(value&&typeof value==='object'&&!Array.isArray(value));assert.deepEqual(Object.keys(value).sort(),[...keys].sort());};
const hashes=(value,paths,expected)=>{shape(value,paths);shape(expected,paths);assert.notStrictEqual(value,expected,'expected hashes must come from an independent fresh read');for(const hash of [...Object.values(value),...Object.values(expected)])assert.match(hash,/^[a-f0-9]{64}$/);assert.deepEqual(value,expected);};
const databases=value=>{assert.ok(Array.isArray(value)&&value.length>0&&value.length<=512);assert.equal(new Set(value).size,value.length);for(const name of value)assert.match(name,/^(?:paia-archive|paia-retention-[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}-\d+)$/);};
export function assertRetentionNativeReceipt(receipt,{head,tree,variant,runtimeHashes,proofHashes,fixtureHashes}){
 shape(receipt,['schema','scope','head','tree','variant','result','cases','runtimeHashes','proofHashes','fixtureHashes','originalFixtures','provider','productionRegistration','browserVersion','isolation']);
 assert.match(head,/^[a-f0-9]{40}$/);assert.match(tree,/^[a-f0-9]{40}$/);assert.ok(['source','release'].includes(variant));
 assert.equal(receipt.schema,1);assert.equal(receipt.scope,'private-human-retention-native');assert.equal(receipt.head,head);assert.equal(receipt.tree,tree);assert.equal(receipt.variant,variant);assert.equal(receipt.result,'PASS');
 assert.equal(receipt.provider,false);assert.equal(receipt.productionRegistration,false);assert.match(receipt.browserVersion,/^\d+\.\d+\.\d+\.\d+$/);
 hashes(receipt.runtimeHashes,RETENTION_RUNTIME_PATHS,runtimeHashes);hashes(receipt.proofHashes,RETENTION_PROOF_PATHS,proofHashes);hashes(receipt.fixtureHashes,GENERATED_PATHS,fixtureHashes);assert.deepEqual(receipt.originalFixtures,RETENTION_SPECS);
 const expected=Object.entries(RETENTION_SPECS).flatMap(([suite,spec])=>[...spec.names,...(suite==='owner'?[NATIVE_OWNER_EXTRA]:[])].map((name,index)=>({suite,name,index})));
 assert.ok(Array.isArray(receipt.cases));assert.equal(receipt.cases.length,28);
 receipt.cases.forEach((row,index)=>{shape(row,['assertions','durationMs','index','name','nativeFactory','result','suite',...(index===27?['extra']:[])]);assert.deepEqual({suite:row.suite,name:row.name,index:row.index},expected[index]);assert.equal(row.result,'PASS');assert.equal(row.nativeFactory,true);assert.ok(Number.isSafeInteger(row.assertions)&&row.assertions>0);assert.ok(Number.isFinite(row.durationMs)&&row.durationMs>=0);});
 shape(receipt.cases[27].extra,['intercepts','removals','dtoInvocations','falseEvents','trustedCompletes']);assert.deepEqual(receipt.cases[27].extra,{intercepts:0,removals:0,dtoInvocations:0,falseEvents:1,trustedCompletes:1});
 const isolation=receipt.isolation;shape(isolation,['nativeFactory','networkAttempts','httpRequests','databases','networkLedger']);assert.equal(isolation.nativeFactory,true);assert.equal(isolation.networkAttempts,0);assert.equal(isolation.httpRequests,0);databases(isolation.databases);assert.ok(isolation.databases.length>1);
 const ledger=isolation.networkLedger;shape(ledger,['observations','transitions','complete']);assert.ok(Array.isArray(ledger.observations));assert.equal(ledger.observations.length,2);assert.deepEqual(ledger.transitions,[]);
 for(const observation of ledger.observations){shape(observation,['lifetime','nativeFactory','networkAttempts','databases','point']);assert.match(observation.lifetime,/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/);databases(observation.databases);}
 assert.deepEqual(ledger.observations.map(value=>value.point),['opened','final']);assert.deepEqual(ledger.observations[1].databases,isolation.databases);assertNetworkLedger(ledger,[]);
 return receipt;
}
