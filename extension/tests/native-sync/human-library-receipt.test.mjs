import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {LifetimeNetworkLedger} from './proof-oracles.mjs';
import {HUMAN_LIBRARY_CASE_NAMES as cases,HUMAN_LIBRARY_PATHS as paths,assertHumanLibraryReceipt as validate} from './human-library-receipt.mjs';
// These are validation fixtures, not fabricated browser evidence. Expected
// digests are independently read from every actual current checkout file.
const expectedHashes=Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(new URL('../../'+path,import.meta.url))).digest('hex')])));
const expected={head:'a'.repeat(40),tree:'b'.repeat(40),variant:'source',expectedHashes};
function fixture(){
 const before={lifetime:'synthetic-before',nativeFactory:true,networkAttempts:[],databases:['paia-archive']},middle={...before,lifetime:'synthetic-middle'},after={...before,lifetime:'synthetic-after'},ledger=new LifetimeNetworkLedger();
 ledger.observe(before,'opened');ledger.observe(before,'before-stop');const pausedFirst=ledger.observe(before,'paused-before-stop');ledger.restarted(before,middle);ledger.observe(middle,'before-stop');const pausedSecond=ledger.observe(middle,'paused-before-stop');ledger.restarted(middle,after);ledger.finish(after);
 const restart=(from,to,pausedNetwork)=>({beforeLifetime:from.lifetime,afterLifetime:to.lifetime,phase:{name:'restart-boundary',lifetime:from.lifetime,hasNativeTransaction:false,preparedOperation:null},stopped:true,restarted:true,interruptedCall:'returned',completedNoopValue:true,pausedNetwork});
 return {schema:1,head:expected.head,tree:expected.tree,variant:'source',scope:'private-local-human-named-owners-and-bounded-partial-grouped-recovery',result:'PASS',productionActivation:false,fullRecovery:false,groupCheckpointImplemented:true,derivedProjectionRecovery:false,browserVersion:'154.0.8037.99',cases:[...cases],hashes:{...expectedHashes},restart:restart(before,middle,pausedFirst),groupRestart:restart(middle,after,pausedSecond),durable:{duplicate:true,noEcho:true,history:2},groupDurable:{duplicate:true,noEcho:true,allStoresPreserved:true,sections:2,coalescedEdits:1,history:12,active:'synthetic-active-namespace',entryRevision:3},isolation:{nativeFactory:true,networkAttempts:0,httpRequests:0,databases:['paia-archive','bns-human-durable','bns-human-group-durable'],networkLedger:ledger.evidence}};
}
function rejected(mutations){for(const mutation of mutations){const r=fixture();mutation(r);assert.throws(()=>validate(r,expected));}}
test('Human receipt requires actual independently read29 checkout hashes and exact private source/release scope',()=>{
 assert.equal(paths.length,29);assert.equal(cases.length,24);for(const variant of ['source','release']){const r={...fixture(),variant};assert.equal(validate(r,{...expected,variant}),r);}
 for(const expectedHashes of [undefined,{},Object.fromEntries(paths.map(path=>[path,true])),Object.fromEntries(paths.map(path=>[path,'c'.repeat(64)]))])assert.throws(()=>validate(fixture(),{...expected,expectedHashes}));
});
test('Human receipt rejects stale, incomplete or expanded identity, partial flags, case inventory and exact byte manifests',()=>{
 rejected([r=>r.head='d'.repeat(40),r=>r.tree='d'.repeat(40),r=>r.variant='release',r=>r.schema=2,r=>r.result='FAIL',r=>r.result='CANCELLED',r=>r.scope='full-recovery',r=>r.productionActivation=true,r=>r.fullRecovery=true,r=>r.groupCheckpointImplemented=false,r=>r.derivedProjectionRecovery=true,r=>r.cases.pop(),r=>r.cases[0]='substitute',r=>r.cases[1]=r.cases[0],r=>r.cases.reverse(),r=>r.browserVersion='154 fixture']);
 for(const path of paths)rejected([r=>delete r.hashes[path],r=>r.hashes[path]='c'.repeat(64),r=>r.hashes[path]=true]);
 for(const bad of [{head:undefined},{tree:'bad'},{variant:'other'}])assert.throws(()=>validate(fixture(),{...expected,...bad}));
});
test('Human receipt rejects missing and unknown additional fields throughout every admitted proof shape',()=>{
 const selectors=[r=>r,r=>r.hashes,r=>r.durable,r=>r.groupDurable,r=>r.isolation,r=>r.restart,r=>r.groupRestart,r=>r.restart.phase,r=>r.groupRestart.phase,r=>r.isolation.networkLedger,r=>r.isolation.networkLedger.transitions[0],r=>r.isolation.networkLedger.observations[0],r=>r.restart.pausedNetwork];
 for(const select of selectors){rejected([r=>select(r).unexpected=true]);for(const key of Object.keys(select(fixture())))if(key!=='databases')rejected([r=>delete select(r)[key]]);}
});
test('Human receipt rejects fictional, reordered, partial or transaction-bearing actual worker transitions',()=>{
 for(const field of ['restart','groupRestart'])rejected([r=>r[field].stopped=false,r=>r[field].restarted=false,r=>r[field].afterLifetime=r[field].beforeLifetime,r=>r[field].phase.lifetime='other',r=>r[field].phase.name='other',r=>r[field].phase.hasNativeTransaction=true,r=>r[field].phase.preparedOperation={},r=>r[field].completedNoopValue=false,r=>r[field].interruptedCall='terminated',r=>r[field].pausedNetwork={}]);
 rejected([r=>r.groupRestart.beforeLifetime='other',r=>{[r.restart,r.groupRestart]=[r.groupRestart,r.restart];},r=>r.groupRestart.afterLifetime=r.restart.beforeLifetime]);
});
test('Human receipt retains both complete paused network lifetimes and refuses denied attempts, missing observations and foreign databases',()=>{
 rejected([r=>r.isolation.nativeFactory=false,r=>r.isolation.networkAttempts=1,r=>r.isolation.httpRequests=1,r=>r.isolation.networkLedger.complete=false,r=>r.isolation.networkLedger.transitions=[],r=>r.isolation.networkLedger.observations.pop(),r=>r.isolation.networkLedger.observations.splice(2,1),r=>r.isolation.networkLedger.observations.splice(2,0,structuredClone(r.restart.pausedNetwork)),r=>r.isolation.databases.push('foreign-body-database'),r=>r.isolation.databases.pop(),r=>r.isolation.databases.push(r.isolation.databases[0])]);
 for(let i=0;i<8;i++)rejected([r=>r.isolation.networkLedger.observations[i].networkAttempts.push('https://synthetic.invalid/denied'),r=>r.isolation.networkLedger.observations[i].nativeFactory=false,r=>r.isolation.networkLedger.observations[i].lifetime='foreign']);
});
test('Human receipt cannot replace original durable canonical/history outcomes with booleans, alternate revisions or weaker counts',()=>{
 for(const [path,fields] of [['durable',['duplicate','noEcho','history']],['groupDurable',['duplicate','noEcho','allStoresPreserved','sections','coalescedEdits','history','entryRevision']]])for(const field of fields)rejected([r=>r[path][field]=false,r=>r[path][field]=0,r=>r[path][field]=NaN]);
 rejected([r=>r.groupDurable.active='',r=>r.groupDurable.entryRevision=2,r=>r.groupDurable.sections=3,r=>r.groupDurable.coalescedEdits=2,r=>r.groupDurable.history=13,r=>r.durable.history=3]);
});
test('native outer gate compares current actual bytes and real unique snapshot revision without changing original cases, fixture or180s deadline',async()=>{
 const text=await readFile(new URL('./human-library-chrome.test.mjs',import.meta.url),'utf8');assert.ok(text.includes("from './human-library-receipt.mjs'"));assert.equal(text.split("receipt.result='PASS'").length,2);assert.ok(text.includes('timeout:180000'));assert.ok(text.includes("for(const variant of ['source','release'])"));assert.ok(text.includes('const files=HUMAN_LIBRARY_PATHS'));assert.ok(text.includes('grouped.canonical.thoughts.filter(row=>row.id===grouped.entryId)'));assert.ok(text.includes('assert.equal(groupedEntries.length,1)'));assert.ok(text.includes('receipt.groupDurable.entryRevision=groupedEntries[0].revision'));
 assert.ok(text.indexOf('const expectedHashes=')>text.indexOf("receipt.result='PASS'"));assert.ok(text.includes('readFile(join(root,file))'));assert.ok(text.includes('assertHumanLibraryReceipt(receipt,{head,tree,variant,expectedHashes})'));
});
