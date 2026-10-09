// Source-owned synthetic cuts only. These tests do not authenticate native scope.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fail} from '../core/browser-native-sync/value.js';
const planURL=new URL('../core/browser-native-sync/human-library-plan.js',import.meta.url),source=await readFile(planURL,'utf8');
function absoluteImports(text,base){return text.replace(/(from\s*|import\s*)(['"])(\.[^'"]+)\2/g,(_,lead,quote,path)=>lead+quote+new URL(path,base).href+quote);}
const originalFixture=await readFile(new URL('./native-sync/fixtures/retention-original/human-sibling-retention.source.mjs',import.meta.url),'utf8');
const setup=await import('data:text/javascript;base64,'+Buffer.from(absoluteImports(originalFixture.slice(0,originalFixture.indexOf('\n\nconst bodies=')),new URL('./synthetic-fixture.mjs',import.meta.url))+'\nexport {scenario};').toString('base64'));
const inspection=`
export async function inspectCapturedPhysicalCut(core,cap){
 const p=branchWitnesses.get(cap);p.effectPlan={rows:[]};const r={owner:p,certificate:nativeRetentionCausalCertificate(p)};p.nativeWork=r;nativeRetentionCompileTasks(p,r);
 const budget=nativeRetentionTaskBudget(p);let differences=0,physicalChecks=0;
 await core.transaction(false,async t=>{for(const task of r.tasks){if(task.type!=='point')continue;const row=await t.get(task.store,task.key)??null;nativeRetentionPoint(r,task,row,false);if(task.store==='revisions')physicalChecks++;}});
 for(let i=0;i<p.raw.semantic.history.length;i++)if(!equal(p.raw.semantic.history[i],p.raw.semantic.parentPhysicalHistory[i]))differences++;
 return {differences,physicalChecks,rawBytes:branchRawSize(p.raw),budget,physicalFrozen:p.raw.semantic.parentPhysicalHistory.every(Object.isFrozen),liveControlFrozen:Object.isFrozen(p.store.controlCache)};
}`;
const owning=await import('data:text/javascript;base64,'+Buffer.from(absoluteImports(source,planURL)+inspection).toString('base64'));
test('six actual synthetic captures compare current physical parent history while preserving historical replay values',async()=>{
 for(const options of [{offset:true},{parent:'new-history',offset:true},{incomingNoDelta:true},{parent:'coalesced'},{parent:'no-delta'},{parent:'coalesced',afterParentUnrelated:true}]){
  const f=await setup.scenario(options);try{const witness=await owning.captureHumanBranchSemanticWitness(f.b.s,f.b.core,f.incoming),cap=await owning.prepareHumanBranchRetention(f.b.s,f.b.core,witness),facts=await owning.inspectCapturedPhysicalCut(f.b.core,cap);assert.ok(facts.physicalChecks>0);assert.equal(facts.physicalFrozen,true);assert.equal(facts.liveControlFrozen,false);assert.ok(facts.rawBytes>0);if(options.parent)assert.ok(facts.differences>0);}finally{f.a.s.repository.close();f.b.s.repository.close();}
 }
});
test('actual duplicate preparation accounts and freezes its owned control snapshot without freezing live control',async()=>{
 const start=source.indexOf('export async function prepareHumanBranchRetentionRetry('),end=source.indexOf('export function claimHumanBranchRetention(',start),body=source.slice(start,end).replace('export async function','async function');
 const control={settings:{enabled:true,synthetic:'owned control snapshot'}},fence={controlValues:structuredClone(control)},state={busy:false};let registered,measured;
 const immutable=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))immutable(child);Object.freeze(value);}return value;};
 const prepare=Function('branchState','branchReady','branchRawSize','branchTrim','BRANCH_BYTES','BRANCH_RAW_BYTES','branchBarrier','validateHumanCommitGroup','retentionProtocolShape','branchFence','base','retentionProtocolRead','immutable','retentionRegister','state','fence',body+'\nreturn prepareHumanBranchRetentionRetry;')(()=>state,()=>{},value=>{if(value?.controlValues){measured=value;return JSON.stringify(value).length;}return 0;},()=>{},8*1024*1024,4*1024*1024,async()=>fence,async()=>({operations:[],descriptor:{revisionId:'d'},members:[]}),()=>{},()=>{},async()=>({namespace:'initial'}),async(t,core,protocol,value)=>{value.protocol={records:[],expected:[]};return {present:1};},immutable,(s,p)=>{registered=p;return {};},state,fence);
 await prepare({controlCache:control},{datasetId:'synthetic',transaction:async(write,fn)=>fn({})},[]);
 assert.equal(measured.controlValues,fence.controlValues);assert.equal(registered.raw.controlValues,registered.controlValues);assert.equal(Object.isFrozen(registered.controlValues.settings),true);assert.equal(Object.isFrozen(control),false);control.settings.enabled=false;assert.equal(registered.controlValues.settings.enabled,true);assert.ok(registered.size>=JSON.stringify(fence.controlValues).length);assert.equal(state.busy,false);
});
test('actual parent physical capture charges the first delivered row before replay cloning or reading another row',async()=>{
 const start=source.indexOf('const history=[],parentPhysicalHistory=[];'),end=source.indexOf('  if(!history.length)',start),body=source.slice(start,end);assert.ok(start>0&&end>start);
 let reads=0,copies=0;const limit=new Error('synthetic logical raw limit');
 const run=Function('parentGroup','get','t','fail','equal','physical','clone','branchRawSize','budget','return (async()=>{'+body+'})()');
 const members=[{value:{entityType:'history',after:{id:'one',kind:'library_entry'}}},{value:{entityType:'history',after:{id:'two',kind:'library_entry'}}}];
 await assert.rejects(run(members,async()=>({local:{}}),{get:async()=>{reads++;return {id:'one',after:{body:'already delivered synthetic row'}};}},fail,()=>true,()=>({}),value=>{copies++;return structuredClone(value);},budget=>{if(budget.parentPhysicalHistory?.length)throw limit;},{}),error=>error===limit);
 assert.equal(reads,1);assert.equal(copies,0);
});
