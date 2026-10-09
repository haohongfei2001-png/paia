import test from 'node:test';import assert from 'node:assert/strict';
import {assertRetentionNativeReceipt} from './retention-native-receipt.mjs';import {RETENTION_SPECS,NATIVE_OWNER_EXTRA} from './retention-native-fixture.mjs';
import {LifetimeNetworkLedger} from './proof-oracles.mjs';import {snapshotProof} from './retention-native-proof.mjs';
import {fileURLToPath} from 'node:url';
const fresh=await snapshotProof(fileURLToPath(new URL('../..',import.meta.url))),head='a'.repeat(40),tree='b'.repeat(40);
const expected={...fresh,head,tree,variant:'source'};
const sample=()=>{
 const database='paia-retention-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa-1',identity={lifetime:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',nativeFactory:true,networkAttempts:[],databases:['paia-archive']},ledger=new LifetimeNetworkLedger();ledger.observe(identity,'opened');ledger.finish({...identity,databases:['paia-archive',database]});
 return {schema:1,scope:'private-human-retention-native',head,tree,variant:'source',result:'PASS',provider:false,productionRegistration:false,browserVersion:'154.0.0.0',runtimeHashes:{...fresh.runtimeHashes},proofHashes:{...fresh.proofHashes},fixtureHashes:{...fresh.fixtureHashes},originalFixtures:RETENTION_SPECS,cases:Object.entries(RETENTION_SPECS).flatMap(([suite,spec])=>[...spec.names,...(suite==='owner'?[NATIVE_OWNER_EXTRA]:[])].map((name,index)=>({suite,name,index,result:'PASS',nativeFactory:true,assertions:1,durationMs:1,...(name===NATIVE_OWNER_EXTRA?{extra:{intercepts:0,removals:0,dtoInvocations:0,falseEvents:1,trustedCompletes:1}}:{})}))),isolation:{nativeFactory:true,networkAttempts:0,httpRequests:0,databases:['paia-archive',database],networkLedger:ledger.evidence}};
};
test('retention receipt rejects missing, duplicated, skipped, non-native or body-bearing rows',()=>{
 assertRetentionNativeReceipt(sample(),expected);
 for(const mutate of [r=>r.cases.pop(),r=>r.cases[1]=r.cases[0],r=>r.cases[0].result='skipped',r=>r.cases[0].nativeFactory=false,r=>r.cases[0].assertions=0,r=>r.cases[0].body='forbidden',r=>r.isolation.networkAttempts=1,r=>r.cases[27].extra.intercepts=1,r=>r.runtimeHashes[Object.keys(r.runtimeHashes)[0]]='changed']){const receipt=sample();mutate(receipt);assert.throws(()=>assertRetentionNativeReceipt(receipt,expected));}
});
test('original review counterexamples reject top-level body, empty ledger and non-hash git identity',()=>{
 const body=sample();body.body='SYNTHETIC forbidden';assert.throws(()=>assertRetentionNativeReceipt(body,expected));
 const ledger=sample();ledger.isolation.networkLedger={complete:true};assert.throws(()=>assertRetentionNativeReceipt(ledger,expected));
 const identity=sample();identity.head='synthetic-head';assert.throws(()=>assertRetentionNativeReceipt(identity,{...expected,head:'synthetic-head'}));
});
test('receipt requires complete fresh runtime/proof/generated hashes and real two-point denied-network ledger',()=>{
 for(const mutate of [r=>delete r.tree,r=>r.tree='invalid',r=>r.browserVersion='synthetic',r=>delete r.proofHashes[Object.keys(r.proofHashes)[0]],r=>r.proofHashes.extra='a'.repeat(64),r=>r.fixtureHashes[Object.keys(r.fixtureHashes)[0]]='b'.repeat(64),r=>r.isolation.body='leak',r=>r.isolation.networkLedger.observations=[],r=>r.isolation.networkLedger.observations[0].networkAttempts=['https://synthetic.invalid'],r=>r.isolation.networkLedger.observations[0].body='leak',r=>r.isolation.networkLedger.transitions=[{}],r=>r.isolation.networkLedger.observations[1].lifetime='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']){const receipt=sample();mutate(receipt);assert.throws(()=>assertRetentionNativeReceipt(receipt,expected));}
 const r=sample();assert.throws(()=>assertRetentionNativeReceipt(r,{...expected,fixtureHashes:r.fixtureHashes}));
});
