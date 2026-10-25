import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {assistNativeConfigurationSource,assistNativeWorkerObservationSource,stageAssistNativeService} from './harness/assist-receipt-native-service.mjs';
// Pure extension contract: no service fixture, pg import, issuer or browser run.
const descriptor={version:1,type:'PAIA_TEST_ASSIST_SERVICE_V1',nonce:'00000000-0000-4000-8000-000000000001',variant:'source',origin:'https://service.invalid',manifest:{synthetic:true},profile:{},routeVersion:'SYNTHETIC',now:1000};
test('pure staged configuration propagates explicit service invalidation and keeps ordinary loss distinct',async()=>{
 let response={ok:false},calls=0,invalidated=0;const runtime={id:'syntheticextension',sendMessage:async()=>{calls++;return response;}};
 const source=assistNativeConfigurationSource(descriptor),config=new Function('chrome','Response','structuredClone',source.replace('export function readAssistServiceConfiguration','function readAssistServiceConfiguration')+'\nreturn readAssistServiceConfiguration();')({runtime},Response,structuredClone);
 config.onInvalidate(()=>invalidated++);await assert.rejects(config.readProfile(),/REFUSED/);assert.equal(config.isCurrentTokenizer(),true);assert.equal(invalidated,0);
 response={ok:false,reason:'revoked'};await assert.rejects(config.readProfile(),/REFUSED/);assert.equal(config.isCurrentTokenizer(),false);assert.equal(invalidated,1);await assert.rejects(config.readProfile(),/REFUSED/);assert.equal(calls,2);
});
test('read-only worker projection exposes observations, never original owner capabilities or dispatch',async()=>{
 const source=assistNativeWorkerObservationSource(descriptor.nonce);assert.doesNotMatch(source,/\.handle\(|\.insert\(|issueAction|activate\(|setItem|\.put\(/);
 const db={},handle={},repository={db,transaction:async(_write,fn)=>fn({tx:{objectStoreNames:['meta']},all:async()=>[]})},store={repository},session={},promptAssist={session,activations:new Map([['original',{handle,finished:true,resultId:'synthetic-result',stopped:false}]])};
 const context=vm.createContext({promptAssist,store,promptInsertionReceipts:{},indexedDB:{},IDBFactory:class{},WeakMap,Promise,Error,Object});context.globalThis=context;new vm.Script(source).runInContext(context);const name='__paiaAssistObserve_'+descriptor.nonce.replaceAll('-','');
 const first=await context[name](),second=await context[name]();assert.equal(first.entries[0].handleId,second.entries[0].handleId);assert.deepEqual(Object.keys(first).sort(),['entries','native','rows']);assert.equal(first.entries[0].handle,undefined);promptAssist.session={};await assert.rejects(context[name](),/STALE/);
});
test('fresh test stage retains exact original worker prefix and never writes original source',async t=>{
 const source=await mkdtemp(join(tmpdir(),'paia-assist-stage-contract-'));t.after(()=>rm(source,{recursive:true,force:true}));await mkdir(join(source,'background'));await mkdir(join(source,'core/ai-usage'),{recursive:true});const worker='// SYNTHETIC source prefix\n',leaf='export function readAssistServiceConfiguration(){return null;}\n';await writeFile(join(source,'background/service-worker.js'),worker);await writeFile(join(source,'core/ai-usage/assist-service-configuration.js'),leaf);
 const stage=await stageAssistNativeService(source,{descriptor});t.after(()=>stage.close());assert.equal(stage.vector.workerPrefixPreserved,true);assert.ok((await readFile(join(stage.directory,'background/service-worker.js'),'utf8')).startsWith(worker));assert.equal(await readFile(join(source,'background/service-worker.js'),'utf8'),worker);assert.equal(await readFile(join(source,'core/ai-usage/assist-service-configuration.js'),'utf8'),leaf);assert.notEqual(stage.vector.original['core/ai-usage/assist-service-configuration.js'],stage.vector.staged['core/ai-usage/assist-service-configuration.js']);
});
