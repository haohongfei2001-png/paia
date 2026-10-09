// Isolated primitive-contract execution of the original owner helper. The VM
// fixtures below are not native IDB evidence and never alter production trust.
import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {runInNewContext} from 'node:vm';import {ArchiveError} from '../../core/constants.js';
const source=await readFile(new URL('../../core/idb-repository.js',import.meta.url),'utf8'),start=source.indexOf('// Only this owner'),end=source.indexOf('const backupDataStores',start),helper=source.slice(start,end).replaceAll('export ','');
assert.ok(start>0&&end>start);
const coreSource=await readFile(new URL('../../core/browser-native-sync/core.js',import.meta.url),'utf8'),coreStart=coreSource.indexOf(' async retainHumanBranch('),coreEnd=coreSource.indexOf(' async prepareWorkingReceive(',coreStart),retain=coreSource.slice(coreStart,coreEnd);
const retentionMap=coreSource.match(/^const humanRetentionTransactions=new WeakMap\(\);$/gm);assert.equal(retentionMap?.length,1);
const preparationStart=coreSource.indexOf('const humanRetentionPreparations=new WeakMap();'),preparationEnd=coreSource.indexOf('export function requireHumanRetentionOwnerPhase(',preparationStart);assert.ok(preparationStart>0&&preparationEnd>preparationStart);
const preparationOwner=coreSource.slice(preparationStart,preparationEnd).replaceAll('export ','');
const coreDataMethods=['get','put'].map(name=>{const matches=coreSource.match(new RegExp('^ async '+name+'\\(.*$','gm'));assert.equal(matches?.length,1);return matches[0];}).join('\n');
const coreProfileStart=coreSource.indexOf('// BEGIN original retention Core data methods.'),coreProfileEnd=coreSource.indexOf('// END original retention Core data methods.',coreProfileStart);
assert.ok(coreProfileStart>0&&coreProfileEnd>coreProfileStart);
const coreDataProfile=coreSource.slice(coreProfileStart,coreProfileEnd);
function setup(failAt=null){
 const controls={channels:0,posts:0,closeAttempts:0,closed:0,starts:0,queue:[],failAt},events=new WeakMap();
 class Event{constructor(target){events.set(this,target);this.isTrusted=true;}get target(){return events.get(this);}get currentTarget(){return events.get(this);}}
 class EventTarget{addEventListener(type,fn){if(controls.failAt==='listen')throw Error('listen');this.listeners??=new Map();this.listeners.set(type,fn);}removeEventListener(type){if(controls.failAt==='remove')throw Error('remove');this.listeners?.delete(type);}}
 class MessagePort extends EventTarget{start(){controls.starts++;if(controls.failAt==='start')throw Error('start');}postMessage(value){assert.equal(value,0);controls.posts++;if(controls.failAt==='post')throw Error('post');controls.queue.push(()=>this.peer.listeners?.get('message')?.(new Event(this.peer)));}close(){controls.closeAttempts++;if(controls.failAt==='close')throw Error('close');controls.closed++;}}
 class MessageChannel{constructor(){controls.channels++;if(controls.failAt==='construct')throw Error('construct');this.port1=new MessagePort();this.port2=new MessagePort();this.port1.peer=this.port2;this.port2.peer=this.port1;}}
 class IDBTransaction{get db(){return {};}get mode(){return 'readwrite';}}
 const context={ArchiveError,Event,EventTarget,MessagePort,MessageChannel,IDBTransaction,console};
 const api=runInNewContext(helper+`;({add(repository,scope,record){repositoryScopes.set(scope,record);},wait:awaitRepositoryTransactionSettled,helperContext:globalThis})`,context);
 return {api,controls,context};
}
const tick=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
test('dispatch barrier is lazy, starts only after terminal+unwind, and all waiters share one task',async()=>{
 const {api,controls}=setup(),repository={},scope={};let release;const settled=new Promise(r=>release=r),record={repository,identity:{nativeTransaction:true},settled};api.add(repository,scope,record);
 assert.equal(controls.channels,0);let finished=0;const a=api.wait(repository,scope).then(()=>finished++),b=api.wait(repository,scope).then(()=>finished++);
 await tick();assert.equal(controls.channels,0);assert.equal(finished,0);release();await tick();assert.equal(controls.channels,1);assert.equal(controls.posts,1);assert.equal(finished,0);
 controls.queue.shift()();await Promise.all([a,b]);assert.equal(finished,2);assert.equal(controls.closeAttempts,2);assert.equal(controls.closed,2);await api.wait(repository,scope);assert.equal(controls.channels,1);
});
test('ordinary non-native cleanup does not allocate a dispatch task',async()=>{
 const {api,controls}=setup(),repository={},scope={};api.add(repository,scope,{repository,identity:{nativeTransaction:false},settled:Promise.resolve()});await api.wait(repository,scope);assert.equal(controls.channels,0);
});
test('every channel setup or cleanup failure rejects, closes reachable ports, and cannot retry a record',async()=>{
 for(const failAt of ['construct','listen','start','post','remove','close']){
  const {api,controls}=setup(failAt),repository={},scope={};api.add(repository,scope,{repository,identity:{nativeTransaction:true},settled:Promise.resolve()});
  const pending=api.wait(repository,scope);const rejected=assert.rejects(pending,{code:'BNS_HUMAN_RETENTION_REQUIRED'});await tick();if(controls.queue.length)controls.queue.shift()();await rejected;
  assert.equal(controls.channels,1);assert.equal(controls.closeAttempts,failAt==='construct'?0:2);await assert.rejects(api.wait(repository,scope),{code:'BNS_HUMAN_RETENTION_REQUIRED'});assert.equal(controls.channels,1);
 }
});
test('original Core finally keeps the original error when dispatch cleanup also fails',async()=>{
 const {api,controls,context}=setup('post'),repository={db:{}},scope={},primary=Error('original transaction refusal');
 api.add(repository,scope,{repository,identity:{nativeTransaction:true},settled:Promise.resolve()});
 context.repository=repository;context.scope=scope;context.primary=primary;
 const dataStart=source.indexOf('class Transaction {'),dataEnd=source.indexOf('export class ArchiveRepository {',dataStart),originalDataOwner=source.slice(dataStart,dataEnd);
 assert.ok(dataStart>end&&dataEnd>dataStart);
 const promise=runInNewContext('(async()=>{'+helper+originalDataOwner+`;
 const scope=new Transaction({db:repository.db,mode:'readwrite'},{});
 const claim={repository,database:repository.db,namespace:'initial',group:{}};let cleanupCount=0,originalFinishCalls=0,heldCharge=true;
 function claimHumanBranchRetention(){return claim;}function assertHumanBranchRetentionCurrent(){}function finishHumanBranchRetention(){originalFinishCalls++;heldCharge=false;}
 // Isolated lifecycle fixture: preparation consumes the actual original Core
 // phase. cleanupCount counts the fixed finalizer attempt, not a successful
 // refund; its actual phase assertion refuses an unproved dispatch drain.
 async function prepareHumanRetentionNativeEffects(core,handle){requireHumanRetentionEffectPreparation(core,handle,claim.group);}
 async function finalizeHumanRetentionNativeEffects(core,handle,claimed){cleanupCount++;requireHumanRetentionEffectFinalization(core,handle,claimed);return true;}
 const identity={token:{},database:repository.db,mode:'readwrite',nativeTransaction:true};
 function fail(){throw Error('unexpected guard');}
 ${retentionMap[0]}
 ${preparationOwner}
 class BrowserNativeSyncCore{constructor(){this.repository=repository;}async #retentionTransaction(fn){return fn(scope);}async bind(){throw primary;}${retain}\n${coreDataMethods}}
 ${coreDataProfile}
 const record={repository,transaction:scope.tx,dataPrototype:Object.getPrototypeOf(scope),identity,settled:Promise.resolve()};repositoryScopes.set(scope,record);
 return (new BrowserNativeSyncCore()).retainHumanBranch({}).then(()=>({resolved:true}),error=>({same:error===primary,cleanupCount,originalFinishCalls,heldCharge}));})()`,context);
 const result=await promise;assert.equal(result.same,true);assert.equal(result.cleanupCount,1);assert.equal(controls.closeAttempts,2);assert.equal(result.originalFinishCalls,0);assert.equal(result.heldCharge,true);
});

const valueSource=await readFile(new URL('../../core/browser-native-sync/value.js',import.meta.url),'utf8');
const synchronousValues=valueSource.match(/^export const plain=.*$/m)[0].replace('export ','')+'\n'+valueSource.slice(valueSource.indexOf('const forbidden='),valueSource.indexOf('export const bytes=')).replaceAll('export ','')+'\n'+valueSource.match(/^export const equal=.*$/m)[0].replace('export ','');
const planSource=await readFile(new URL('../../core/browser-native-sync/human-library-plan.js',import.meta.url),'utf8');
const branchStart=planSource.indexOf('const branchWitnesses='),branchEnd=planSource.indexOf('async function branchRaw(',branchStart),branchOwner=planSource.slice(branchStart,branchEnd);
const finalAssert=planSource.match(/^export function assertHumanBranchRetentionCurrent\(.*$/m)[0].replace('export ',''),originalFinish=planSource.match(/^export function finishHumanBranchRetention\(.*$/m)[0].replace('export ','');
const fixedOwnerStart=coreSource.indexOf('export function requireHumanRetentionOwnerPhase('),fixedClosingStart=coreSource.indexOf('export function requireHumanRetentionClosingPhase('),fixedClosingEnd=coreSource.indexOf('const opFields=',fixedClosingStart);
const fixedOwners=coreSource.slice(fixedOwnerStart,fixedClosingEnd).replaceAll('export ','');
async function finalResolutionFixture(mode){
 const {api,controls,context}=setup(),repository={db:{}},dataStart=source.indexOf('class Transaction {'),dataEnd=source.indexOf('export class ArchiveRepository {',dataStart);
 context.repository=repository;context.queueMicrotask=queueMicrotask;context.mode=mode;
 const pending=runInNewContext('(async()=>{'+helper+source.slice(dataStart,dataEnd)+synchronousValues+branchOwner+`;
 const cap={},group={},scope=new Transaction({db:repository.db,mode:'readwrite'},{});let finishCalls=0,finalizerCalls=0;
 function fail(code){throw new ArchiveError(code);}
 const retentionKind=p=>p&&(p.kind==='retention'||p.kind==='duplicate');
 ${finalAssert}\n${originalFinish}\n${retentionMap[0]}\n${preparationOwner}\n${fixedOwners}
 const claim={repository,database:repository.db,namespace:'initial',group};
 function claimHumanBranchRetention(){return claim;}
 async function prepareHumanRetentionNativeEffects(core,handle){requireHumanRetentionEffectPreparation(core,handle,group);}
 async function requireHumanBranchRetentionInTransaction(t,core,handle){requireHumanRetentionOwnerPhase(core,t,handle,group);return {duplicate:true};}
 async function verifyHumanRetentionNativeCommitted(core,t,handle){requireHumanRetentionClosingPhase(core,t,handle,group);}
 async function finalizeHumanRetentionNativeEffects(core,handle,c){requireHumanRetentionEffectFinalization(core,handle,c);finalizerCalls++;
  if(mode==='cancel')queueMicrotask(()=>{finishHumanBranchRetention(core,handle,c);finishCalls++;});
  if(mode==='control')queueMicrotask(()=>{store.controlCache.a=2;});if(mode==='scope')queueMicrotask(()=>{scope.tx={};});if(mode==='repository')queueMicrotask(()=>{core.repository={};});return true;
 }
 const identity={token:{},database:repository.db,mode:'readwrite',nativeTransaction:true},record={repository,transaction:scope.tx,dataPrototype:Object.getPrototypeOf(scope),identity,settled:Promise.resolve(),nativeSettled:false,unwound:false};repositoryScopes.set(scope,record);
 class BrowserNativeSyncCore{constructor(){this.repository=repository;this.datasetId='synthetic-final';this.deviceId='synthetic-final-device';this.prefix='bns:v1:synthetic-final:';this.fixedNamespace=null;this.boundTransactions=new WeakMap();}
  async #retentionTransaction(fn){const result=await fn(scope);record.nativeOutcome='completed';record.trustedNativeOutcome='completed';record.originalSuccess=true;record.nativeSettled=true;record.unwound=true;return result;}
  async bind(t){this.boundTransactions.set(t,'initial');return 'initial';}${retain}\n${coreDataMethods}}
 ${coreDataProfile}
 const core=new BrowserNativeSyncCore(),store={libraryDocumentMode:true,loaded:true,iaLoaded:true,filterLoaded:true,foundationLoaded:true,bindingsLoaded:true,documentsLoaded:true,repository,controlCache:{a:1},pendingControl:null,tail:{},humanLibraryJournal:{core},databaseId:'synthetic-db'};
 const p={kind:'duplicate',store,core,claimed:true,claim,size:1000,fence:{binding:branchReady(store,core),tail:store.tail,control:store.controlCache,controlValues:{a:1}}},state=branchState(store);branchWitnesses.set(cap,p);state.handles.push(cap);state.bytes=1000;state.busy=true;
 const result=await core.retainHumanBranch(cap).then(value=>({value}),error=>({code:error.code}));return {...result,finalizerCalls,bytes:state.bytes,busy:state.busy,cap:branchWitnesses.has(cap),finishCalls};})()`,context);
 for(let i=0;i<12;i++){await tick();if(controls.queue.length)controls.queue.shift()();}
 return pending;
}
test('current Core performs the real cap assertion after finalizer resolution and leaves no awaited success window',async()=>{
 const success=await finalResolutionFixture('normal');assert.equal(success.value.state,'duplicate');assert.equal(success.finalizerCalls,1);assert.equal(success.bytes,0);assert.equal(success.busy,false);
 for(const mode of ['cancel','control','scope','repository']){const result=await finalResolutionFixture(mode);assert.equal(result.value,undefined);assert.equal(result.code,mode==='control'?'BNS_HUMAN_CHANGED':'BNS_HUMAN_RETENTION_REQUIRED');assert.equal(result.finalizerCalls,1);assert.equal(result.bytes,0);assert.equal(result.busy,false);assert.equal(result.cap,false);if(mode==='cancel')assert.equal(result.finishCalls,1);}
 const marker=retain.indexOf('// All awaits, native drains');assert.ok(marker>0);assert.equal(/\bawait\b/.test(retain.slice(marker).replace(/\/\/.*$/gm,'')),false);
});
