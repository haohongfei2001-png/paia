import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {LifetimeNetworkLedger} from './proof-oracles.mjs';
import {assertGroupCheckpointReceipt as validate,GROUP_CHECKPOINT_CASES as cases,GROUP_CHECKPOINT_PATHS as paths} from './group-checkpoint-receipt.mjs';
const expected={head:'a'.repeat(40),tree:'b'.repeat(40),variant:'source'};
function fixture(){
 const before={lifetime:'synthetic-before',nativeFactory:true,networkAttempts:[]},after={...before,lifetime:'synthetic-after'},ledger=new LifetimeNetworkLedger();ledger.observe(before,'opened');ledger.observe(before,'before-stop');const pausedNetwork=ledger.observe(before,'paused-before-stop');ledger.restarted(before,after);const last={...before,lifetime:"synthetic-last"};ledger.observe(after,"before-stop");const pausedSecond=ledger.observe(after,"paused-before-stop");ledger.restarted(after,last);ledger.finish(last);
 const restart={beforeLifetime:before.lifetime,afterLifetime:after.lifetime,phase:{name:'restart-boundary',lifetime:before.lifetime,hasNativeTransaction:false},stopped:true,restarted:true,interruptedCall:'returned',completedNoopValue:true,pausedNetwork};
 const restartSecond={...restart,beforeLifetime:after.lifetime,afterLifetime:last.lifetime,phase:{...restart.phase,lifetime:after.lifetime},pausedNetwork:pausedSecond};
 return {schema:1,...expected,result:'PASS',scope:'optional-local-bounded-admitted-groups-checkpoint-activation',productionActivation:false,remoteMaterializer:true,fullRecovery:false,scopeComplete:true,providerActivation:false,maximumReplayOperations:128,maximumReplayBytes:4194304,capacity:[{operations:128,reads:2646,writes:1160,activationMs:100}],outcome:{atomic:true,duplicate:true,noEcho:true,active:'synthetic-namespace'},cases:[...cases],hashes:Object.fromEntries(paths.map(p=>[p,'c'.repeat(64)])),browserVersion:'154.0 synthetic fixture',restarts:[restart,restartSecond],isolation:{nativeFactory:true,networkAttempts:0,httpRequests:0,networkLedger:ledger.evidence}};
}
function rejected(mutations){for(const change of mutations){const r=fixture();change(r);assert.throws(()=>validate(r,expected));}}
test('grouped receipt admits source and release with exact local scope',()=>{for(const variant of ['source','release']){const r={...fixture(),variant};assert.equal(validate(r,{...expected,variant}),r);}});
test('grouped receipt refuses unknown, stale or unfinished commit identities',()=>{for(const change of [{head:undefined},{tree:''},{head:'bad'},{variant:'other'}])assert.throws(()=>validate(fixture(),{...expected,...change}));rejected([r=>r.head='d'.repeat(40),r=>r.tree='d'.repeat(40),r=>r.variant='release',r=>r.schema=2,r=>r.result='IN_PROGRESS',r=>r.result='SKIPPED']);});
test('grouped receipt cannot claim activated provider or full restore',()=>{rejected([r=>r.scope='full-recovery',r=>r.productionActivation=true,r=>delete r.productionActivation,r=>r.remoteMaterializer=false,r=>r.fullRecovery=true,r=>delete r.fullRecovery]);});
test('grouped receipt requires each exact case and complete runtime hashes',()=>{rejected([r=>r.cases.pop(),r=>r.cases[0]='substitute',r=>r.cases[1]=r.cases[0],r=>r.cases.reverse(),r=>delete r.hashes[paths[0]],r=>r.hashes.extra='c'.repeat(64),r=>r.hashes[paths[0]]='bad',r=>r.browserVersion='']);});
test('grouped receipt refuses fictitious restart or open transaction',()=>{rejected([r=>r.restarts[0].stopped=false,r=>r.restarts[0].restarted=false,r=>r.restarts[0].afterLifetime=r.restarts[0].beforeLifetime,r=>r.restarts[0].phase.lifetime='other',r=>r.restarts[0].phase.name='other',r=>r.restarts[0].phase.hasNativeTransaction=true,r=>r.restarts[0].completedNoopValue=false,r=>r.restarts[0].interruptedCall='unknown']);});
test('grouped receipt cannot discard network attempts or paused-lifetime observations',()=>{rejected([r=>r.isolation.nativeFactory=false,r=>r.isolation.networkAttempts=1,r=>r.isolation.httpRequests=1,r=>r.isolation.networkLedger.complete=false,r=>r.isolation.networkLedger.observations[1].networkAttempts.push('https://synthetic.invalid/denied'),r=>r.isolation.networkLedger.observations.splice(2,1),r=>r.isolation.networkLedger.transitions=[],r=>r.restarts[0].pausedNetwork={},r=>r.isolation.networkLedger.observations.splice(2,0,structuredClone(r.restarts[0].pausedNetwork))]);});

test('grouped receipt rejects incomplete sequential restart, atomic outcome and resource proof',()=>{rejected([r=>r.restarts.pop(),r=>r.restarts.reverse(),r=>r.restarts[1].stopped=false,r=>r.outcome.atomic=false,r=>r.outcome.duplicate=false,r=>r.outcome.noEcho=false,r=>r.outcome.active='',r=>r.outcome.extra=true,r=>r.maximumReplayOperations=129,r=>r.maximumReplayBytes++,r=>r.capacity=[],r=>r.capacity[0].operations=127,r=>r.capacity[0].reads=0,r=>r.capacity[0].writes=NaN,r=>r.capacity[0].activationMs=Infinity,r=>r.scopeComplete=false,r=>r.providerActivation=true]);});

test('grouped native gates PASS on strict final evidence while retaining both variants and budget',async()=>{
 const text=await readFile(new URL('./group-checkpoint-chrome.test.mjs',import.meta.url),'utf8');
 assert.ok(text.includes("from './group-checkpoint-receipt.mjs'"));assert.equal(text.split("receipt.result='PASS'").length,2);
 assert.ok(text.indexOf('assertGroupCheckpointReceipt(receipt,{head,tree,variant})')>text.indexOf('receipt.restarts.push(await browser.restart())'));
 assert.ok(text.includes('timeout:240000'));assert.ok(text.includes("for(const variant of ['source','release'])"));
});
