import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {LifetimeNetworkLedger} from './proof-oracles.mjs';
import {assertSourceBootstrapReceipt as validate,SOURCE_BOOTSTRAP_CASES as cases,SOURCE_BOOTSTRAP_PATHS as paths} from './source-bootstrap-receipt.mjs';
const expected={head:'a'.repeat(40),tree:'b'.repeat(40),variant:'source'};
function fixture(){
 const before={lifetime:'synthetic-before',nativeFactory:true,networkAttempts:[]},after={...before,lifetime:'synthetic-after'},ledger=new LifetimeNetworkLedger();ledger.observe(before,'opened');ledger.observe(before,'before-stop');const pausedNetwork=ledger.observe(before,'paused-before-stop');ledger.restarted(before,after);ledger.finish(after);
 const restart={beforeLifetime:before.lifetime,afterLifetime:after.lifetime,phase:{name:'restart-boundary',lifetime:before.lifetime,hasNativeTransaction:false},stopped:true,restarted:true,interruptedCall:'returned',completedNoopValue:true,pausedNetwork};
 return {schema:1,...expected,result:'PASS',scope:'optional-local-initial-ChatGPT-Source-bootstrap',productionActivation:false,remoteMaterializer:true,fullRecovery:false,cases:[...cases],hashes:Object.fromEntries(paths.map(p=>[p,'c'.repeat(64)])),browserVersion:'154.0 synthetic fixture',restart,isolation:{nativeFactory:true,networkAttempts:0,httpRequests:0,networkLedger:ledger.evidence}};
}
function rejected(mutations){for(const change of mutations){const r=fixture();change(r);assert.throws(()=>validate(r,expected));}}
test('bootstrap receipt admits source and release with exact local scope',()=>{for(const variant of ['source','release']){const r={...fixture(),variant};assert.equal(validate(r,{...expected,variant}),r);}});
test('bootstrap receipt refuses unknown, stale or unfinished commit identities',()=>{for(const change of [{head:undefined},{tree:''},{head:'bad'},{variant:'other'}])assert.throws(()=>validate(fixture(),{...expected,...change}));rejected([r=>r.head='d'.repeat(40),r=>r.tree='d'.repeat(40),r=>r.variant='release',r=>r.schema=2,r=>r.result='IN_PROGRESS',r=>r.result='SKIPPED']);});
test('bootstrap receipt cannot claim activated provider or full restore',()=>{rejected([r=>r.scope='full-recovery',r=>r.productionActivation=true,r=>delete r.productionActivation,r=>r.remoteMaterializer=false,r=>r.fullRecovery=true,r=>delete r.fullRecovery]);});
test('bootstrap receipt requires each exact case and complete runtime hashes',()=>{rejected([r=>r.cases.pop(),r=>r.cases[0]='substitute',r=>r.cases[1]=r.cases[0],r=>r.cases.reverse(),r=>delete r.hashes[paths[0]],r=>r.hashes.extra='c'.repeat(64),r=>r.hashes[paths[0]]='bad',r=>r.browserVersion='']);});
test('bootstrap receipt refuses fictitious restart or open transaction',()=>{rejected([r=>r.restart.stopped=false,r=>r.restart.restarted=false,r=>r.restart.afterLifetime=r.restart.beforeLifetime,r=>r.restart.phase.lifetime='other',r=>r.restart.phase.name='other',r=>r.restart.phase.hasNativeTransaction=true,r=>r.restart.completedNoopValue=false,r=>r.restart.interruptedCall='unknown']);});
test('bootstrap receipt cannot discard network attempts or paused-lifetime observations',()=>{rejected([r=>r.isolation.nativeFactory=false,r=>r.isolation.networkAttempts=1,r=>r.isolation.httpRequests=1,r=>r.isolation.networkLedger.complete=false,r=>r.isolation.networkLedger.observations[1].networkAttempts.push('https://synthetic.invalid/denied'),r=>r.isolation.networkLedger.observations.splice(2,1),r=>r.isolation.networkLedger.transitions=[],r=>r.restart.pausedNetwork={},r=>r.isolation.networkLedger.observations.splice(2,0,structuredClone(r.restart.pausedNetwork))]);});

test('native bootstrap gates PASS on strict final evidence after actual restart without weakening its budget',async()=>{
 const source=await readFile(new URL('./source-bootstrap-chrome.test.mjs',import.meta.url),'utf8');
 assert.ok(source.includes("from './source-bootstrap-receipt.mjs'"));
 assert.equal(source.split("receipt.result='PASS'").length,2);
 assert.ok(source.indexOf('assertSourceBootstrapReceipt(receipt,{head,tree,variant})')>source.indexOf('receipt.restart=await browser.restart()'));
 assert.ok(source.includes('timeout:180000'));assert.ok(source.includes("for(const variant of ['source','release'])"));
});
