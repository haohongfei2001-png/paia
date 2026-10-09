// Isolated primitive-contract execution of the original owner helper. The VM
// fixtures below are not native IDB evidence and never alter production trust.
import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {runInNewContext} from 'node:vm';import {ArchiveError} from '../../core/constants.js';
const source=await readFile(new URL('../../core/idb-repository.js',import.meta.url),'utf8'),start=source.indexOf('// Only this owner'),end=source.indexOf('const backupDataStores',start),helper=source.slice(start,end).replaceAll('export ','');
assert.ok(start>0&&end>start);
const coreSource=await readFile(new URL('../../core/browser-native-sync/core.js',import.meta.url),'utf8'),coreStart=coreSource.indexOf(' async retainHumanBranch('),coreEnd=coreSource.indexOf(' async prepareWorkingReceive(',coreStart),retain=coreSource.slice(coreStart,coreEnd);
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
 const promise=runInNewContext('(async()=>{'+helper+`;
 const claim={repository,database:repository.db,namespace:'initial',group:{}};let cleanupCount=0;
 function claimHumanBranchRetention(){return claim;}function assertHumanBranchRetentionCurrent(){}function finishHumanBranchRetention(){cleanupCount++;}
 function requireRepositoryTransactionScope(){return identity;}const identity={token:{},database:repository.db,mode:'readwrite',nativeTransaction:true};
 function fail(){throw Error('unexpected guard');}
 class BrowserNativeSyncCore{static #humanRetentionTransactions=new WeakMap();constructor(){this.repository=repository;}async #retentionTransaction(fn){return fn(scope);}async bind(){throw primary;}${retain}}
 const record={repository,identity:{nativeTransaction:true},settled:Promise.resolve()};repositoryScopes.set(scope,record);
 return (new BrowserNativeSyncCore()).retainHumanBranch({}).then(()=>({resolved:true}),error=>({same:error===primary,cleanupCount}));})()`,context);
 const result=await promise;assert.equal(result.same,true);assert.equal(result.cleanupCount,1);assert.equal(controls.closeAttempts,2);
});
