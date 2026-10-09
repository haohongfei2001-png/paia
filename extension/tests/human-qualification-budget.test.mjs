import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as budget from '../core/browser-native-sync/human-qualification-budget.js';

const {beginHumanQualificationWork:begin,resizeHumanQualificationLease:resize,
 retainHumanQualificationLease:retain,releaseHumanQualificationLease:release}=budget;
const MiB=1024*1024,ARG='BNS_HUMAN_QUALIFICATION_ARGUMENT_INVALID',
 LEASE='BNS_HUMAN_QUALIFICATION_LEASE_REQUIRED',LIMIT='BNS_HUMAN_QUALIFICATION_LIMIT',
 BUSY='BNS_HUMAN_QUALIFICATION_BUSY',owned=[];
const keep=lease=>(owned.push(lease),lease);
const start=(kind='graph',bytes=256)=>keep(begin(kind,bytes));
const commit=(work,bytes=256)=>keep(retain(work,bytes));
const throws=(fn,code)=>assert.throws(fn,{code});
function full(){const lease=start('graph',8*MiB);release(lease);}
test.afterEach(()=>{while(owned.length){try{release(owned.pop());}catch(error){assert.equal(error.code,LEASE);}}});

test('exact four synchronous exports issue empty frozen exact-brand leases',()=>{
 assert.deepEqual(Object.keys(budget).sort(),['beginHumanQualificationWork','resizeHumanQualificationLease','retainHumanQualificationLease','releaseHumanQualificationLease'].sort());
 const work=start();assert.equal(Object.isFrozen(work),true);assert.deepEqual(Reflect.ownKeys(work),[]);assert.equal(work instanceof Promise,false);
 assert.equal(resize(work,512),undefined);const kept=commit(work,256);
 assert.notEqual(kept,work);assert.equal(Object.isFrozen(kept),true);assert.deepEqual(Reflect.ownKeys(kept),[]);
 release(work);release(kept);full();
});

test('argument checks are strict and never coerce or inspect hostile objects',()=>{
 let touches=0;const hostile=new Proxy({}, {get(){touches++;throw Error('get');},getPrototypeOf(){touches++;throw Error('prototype');},ownKeys(){touches++;throw Error('keys');}});
 for(const kind of [hostile,new String('graph'),'',null,undefined,'Graph'])throws(()=>begin(kind,256),ARG);
 for(const bytes of [hostile,new Number(256),NaN,Infinity,-Infinity,-0,0,255,256.5,Number.MAX_SAFE_INTEGER,256n,'256',undefined]){
  throws(()=>begin('graph',bytes),ARG);throws(()=>resize(hostile,bytes),ARG);throws(()=>retain(hostile,bytes),ARG);
 }
 throws(()=>begin('graph',8*MiB+1),ARG);throws(()=>retain(hostile,4*MiB+1),ARG);
 for(const call of [()=>begin(),()=>begin('graph'),()=>begin('graph',256,undefined),()=>resize(),()=>resize(hostile,256,undefined),()=>retain(),()=>retain(hostile,256,undefined),()=>release(),()=>release(hostile,undefined)])throws(call,ARG);
 assert.equal(touches,0);full();
});

test('forged cloned spread proxied and revoked leases never grant access or trigger traps',()=>{
 const work=start();let traps=0;
 const proxy=new Proxy(work,{get(){traps++;throw Error('get');},getPrototypeOf(){traps++;throw Error('prototype');},ownKeys(){traps++;throw Error('keys');}});
 const revoked=Proxy.revocable(work,{});revoked.revoke();
 for(const fake of [{},structuredClone(work),{...work},proxy,revoked.proxy,null,undefined,'lease',1,Symbol('lease')]){
  throws(()=>resize(fake,256),LEASE);throws(()=>retain(fake,256),LEASE);throws(()=>release(fake),LEASE);
 }
 assert.equal(traps,0);release(work);throws(()=>release(work),LEASE);throws(()=>resize(work,256),LEASE);full();
});

test('one work slot spans both kinds and failed begin leaves current work intact',()=>{
 for(const kind of ['graph','projection']){
  const work=start(kind,512);throws(()=>begin(kind==='graph'?'projection':'graph',256),BUSY);
  throws(()=>begin(kind,8*MiB),BUSY);resize(work,1024);release(work);full();
 }
});

test('same canonical module import shares the busy slot rather than minting a new service',async()=>{
 const same=await import('../core/browser-native-sync/human-qualification-budget.js');
 const work=start('graph');throws(()=>same.beginHumanQualificationWork('projection',256),BUSY);
 same.releaseHumanQualificationLease(work);const next=keep(same.beginHumanQualificationWork('projection',256));release(next);full();
});

test('work resize boundaries and every failed mutation preserve a valid exact lease',()=>{
 const work=start('graph',256);resize(work,8*MiB);throws(()=>resize(work,8*MiB+1),ARG);
 throws(()=>retain(work,4*MiB+1),ARG);resize(work,256);
 throws(()=>retain(work,512),LIMIT);const kept=commit(work,256);
 throws(()=>resize(work,512),LEASE);throws(()=>retain(work,256),LEASE);
 release(work);release(kept);full();
});

test('retained four MiB and aggregate eight MiB boundaries stay shared',()=>{
 const work=start('graph',4*MiB),kept=commit(work,4*MiB);release(work);
 const next=start('projection',4*MiB);throws(()=>resize(next,4*MiB+1),LIMIT);
 throws(()=>retain(next,256),LIMIT);throws(()=>begin('graph',256),BUSY);
 release(kept);const final=commit(next,4*MiB);release(next);release(final);full();
});

test('eight retained slots across kinds refuse ninth commit without consuming its work',()=>{
 const kept=[];for(let i=0;i<8;i++){const work=start(i%2?'graph':'projection');kept.push(commit(work));release(work);}
 const ninth=start('projection',512);throws(()=>retain(ninth,256),LIMIT);throws(()=>begin('graph',256),BUSY);
 release(kept[0]);const replacement=commit(ninth,256);release(ninth);
 for(const lease of kept.slice(1))release(lease);release(replacement);full();
});

for(const residual of [0,512])for(const order of ['work-first','retained-first']){
 test(`committed work keeps busy with residual ${residual}; ${order} releases both tickets cleanly`,()=>{
  const work=start('graph',256+residual),kept=commit(work,256);
  throws(()=>begin('projection',256),BUSY);throws(()=>resize(work,256),LEASE);throws(()=>retain(work,256),LEASE);
  if(order==='retained-first'){
   release(kept);throws(()=>release(kept),LEASE);throws(()=>begin('projection',256),BUSY);release(work);
  }else{
   release(work);throws(()=>release(work),LEASE);
   const next=start('projection',8*MiB-256);throws(()=>resize(next,8*MiB-255),LIMIT);release(next);release(kept);
  }
  throws(()=>release(kept),LEASE);throws(()=>release(work),LEASE);full();
 });
}

test('releasing an unrelated retained ticket cannot unlock or alter the active ticket ownership',()=>{
 const oldWork=start('projection',256),old=commit(oldWork);release(oldWork);
 const work=start('graph',512),current=commit(work,256);release(old);
 throws(()=>begin('projection',256),BUSY);throws(()=>resize(work,256),LEASE);
 release(current);throws(()=>begin('projection',256),BUSY);release(work);full();
});

test('failure cleanup after commit uses both real tickets and preserves unrelated retained work',()=>{
 const first=start('graph',256),old=commit(first);release(first);
 const work=start('projection',512),unpublished=commit(work,256);
 try{throw Error('synthetic publication failure');}catch(error){assert.equal(error.message,'synthetic publication failure');release(unpublished);release(work);}
 const next=start('projection',8*MiB-256);throws(()=>resize(next,8*MiB-255),LIMIT);release(next);release(old);full();
});

test('numeric service does not call an owner cleanup callback or access caller data',()=>{
 let calls=0;const owner={raw:{synthetic:'still caller owned'},cleanup(){calls++;}};
 throws(()=>begin(owner,256),ARG);throws(()=>begin('graph',256,owner.cleanup),ARG);
 const work=start(),kept=commit(work);release(kept);release(work);
 assert.equal(calls,0);assert.deepEqual(owner.raw,{synthetic:'still caller owned'});full();
});

test('fresh process import and numeric operations have zero storage network clock or encoding effects',()=>{
 const url=new URL('../core/browser-native-sync/human-qualification-budget.js',import.meta.url).href;
 const source=`let effects=0;const bad=()=>{effects++;throw Error('forbidden effect');};
  globalThis.fetch=bad;globalThis.indexedDB=new Proxy({}, {get:bad});globalThis.chrome=new Proxy({}, {get:bad});
  globalThis.localStorage=new Proxy({}, {get:bad});globalThis.TextEncoder=bad;globalThis.TextDecoder=bad;
  Date.now=bad;crypto.randomUUID=bad;crypto.subtle.digest=bad;
  const q=await import(${JSON.stringify(url)});const w=q.beginHumanQualificationWork('graph',512);
  const r=q.retainHumanQualificationLease(w,256);q.releaseHumanQualificationLease(r);q.releaseHumanQualificationLease(w);
  if(effects!==0||Object.keys(q).length!==4)throw Error('effect or export');process.stdout.write('ZERO_EFFECTS_4_EXPORTS\\n');`;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8'}),'ZERO_EFFECTS_4_EXPORTS\n');
});
