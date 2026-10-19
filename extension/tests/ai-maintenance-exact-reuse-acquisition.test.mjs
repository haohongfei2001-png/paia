import test from 'node:test';
import assert from 'node:assert/strict';
import {formationFixture,runFormation,addInput,rows,parameters,assessment,request} from './harness/topic-03.mjs';
import {TopicFormationService} from '../core/topic-formation.js';
import {createMaintenanceQualification,createMaintenanceTopicExactReuseQualification,maintenanceQualificationReceipt,releaseMaintenanceQualification} from '../core/ai-usage/maintenance-qualification.js';
const tick=ms=>new Promise(r=>setTimeout(r,ms));
async function selectionFixture(t,exercise){
 const f=await formationFixture();let base=null;const releases=[];t.after(async()=>{for(const release of releases)release();releaseMaintenanceQualification(base);await f.s.repository.close();});
 await runFormation(f);const old=(await rows(f.s,'thoughts')).find(x=>x.provenanceType==='input_original');assert.ok(old);await addInput(f,{text:old.thoughtText});await f.s.finishFoundation();const newInput=f.scope.find(x=>x.inputId!==old.workingInputId).inputId,scope=[{inputId:newInput,role:'primary',selectedFields:['body']}];
 const caller=Object.freeze({id:crypto.randomUUID()}),parentSignal=new AbortController(),expiry=Date.now()+600000,pending=[];let calls=0,wake=null,promiseObserver=null,currentObserver=null,failure=null;
 const rawResolve=async(tx,scope)=>{const raw={version:1,store:f.s,caller,scope,epoch:'synthetic-exact-acquisition',processing:true,expiresAt:expiry,revocationSignal:parentSignal.signal};if(scope.phase==='topic-exact-reuse'){calls++;let release;const held=new Promise(r=>release=r);releases.push(release);pending.push({release,tx,raw});wake?.();await held;}return raw;};const processing={resolve:(tx,scope)=>{if(scope.phase==='topic-exact-reuse'&&failure){calls++;const error=Error('SYNTHETIC actual issuer failure');if(failure==='throw')throw error;return Promise.reject(error);}const promise=rawResolve(tx,scope);if(scope.phase==='topic-exact-reuse')promiseObserver?.(promise);return promise;},isCurrent:r=>{currentObserver?.(r);return r.processing===true&&!parentSignal.signal.aborted;}};
 base=await f.s.repository.transaction(false,tx=>createMaintenanceQualification(f.s,tx,{items:[],coverage:[]},{processing,caller,binding:{principalId:'synthetic',libraryId:'synthetic',consentEpoch:'synthetic',generation:0},isCurrent:()=>true,selection:{inputIds:[newInput]}}));const parent=maintenanceQualificationReceipt(base,f.s);let exercised=false;
 const owner=new TopicFormationService(f.s,{...f.serviceOptions,parameters,decision:{version:'synthetic-exact-acquisition',assess:assessment},resolveQualification:()=>base,resolveExactReuse:async(selection,original)=>{assert.equal(original,base);exercised=true;const acquire=signal=>f.s.run(()=>f.s.repository.transaction(false,tx=>createMaintenanceTopicExactReuseQualification(f.s,tx,selection,{base,processing,caller,parent,signal,isCurrent:()=>true})));await exercise({f,old,pending,acquire,calls:()=>calls,next:()=>new Promise(r=>wake=r),parentSignal,expiry,observePromise:fn=>promiseObserver=fn,observeCurrent:fn=>currentObserver=fn,failResolve:mode=>failure=mode});throw Error('SYNTHETIC finished acquisition controls before any write');}});
 await assert.rejects(owner.prepare({...request(f),scope}),/SYNTHETIC finished acquisition controls/);assert.equal(exercised,true);assert.deepEqual((await rows(f.s,'thoughts')).find(x=>x.id===old.id),old);
}
test('eight cancelled original acquisitions retain slots until actual settle; ninth calls no issuer',async t=>selectionFixture(t,async({f,pending,acquire,calls,next})=>{
 for(let i=0;i<8;i++){const controller=new AbortController(),entered=next(),promise=acquire(controller.signal);await Promise.race([entered,promise.then(()=>assert.fail('unexpected grant'),e=>{throw e;})]);controller.abort();await assert.rejects(promise);assert.equal(calls(),i+1);await assert.rejects(pending[i].tx.get('meta','gate'));}
 await assert.rejects(acquire(new AbortController().signal),{code:'BUDGET_EXCEEDED'});assert.equal(calls(),8);
 // A late receipt is only dropped and its slot freed; no original Entry write,
 // refreshed selection, new grant, or follow-on task is manufactured.
 pending[0].release();await tick(0);assert.equal(calls(),8);const entered=next(),controller=new AbortController(),promise=acquire(controller.signal);await entered;assert.equal(calls(),9);controller.abort();await assert.rejects(promise);await f.s.run(()=>f.s.repository.transaction(false,tx=>tx.get('meta','gate')));
}));
test('original exact acquisition first finite deadline releases Store queue and denies late transaction reads',async t=>selectionFixture(t,async({f,pending,acquire,calls,next})=>{
 f.s.organizerBudget.limits.timeoutMs=25;const entered=next(),promise=acquire(new AbortController().signal);await entered;await assert.rejects(promise);assert.equal(calls(),1);await f.s.run(()=>f.s.repository.transaction(false,tx=>tx.get('meta','gate')));await assert.rejects(pending[0].tx.get('meta','gate'));pending[0].release();await tick(0);assert.equal(calls(),1);
}));
for(const phase of ['before issuer','after issuer'])test('cancelled exact metadata '+phase+' performs no following underlying read',async t=>selectionFixture(t,async({f,old,pending,acquire,calls,next})=>{
 const controller=new AbortController(),original=f.s.repository.transaction.bind(f.s.repository);let fired=false,following=0,afterIssuer=false;
 t.mock.method(f.s.repository,'transaction',(write,fn,...args)=>original(write,async tx=>{const get=tx.get.bind(tx);tx.get=async(...args)=>{if(fired)following++;const value=await get(...args);if(!fired&&(phase==='before issuer'?args[0]==='thoughts'&&args[1]===old.id:afterIssuer&&args[0]==='meta')){fired=true;controller.abort();}return value;};return fn(tx);},...args));
 try{const entered=next(),promise=acquire(controller.signal);if(phase==='after issuer'){await entered;afterIssuer=true;pending[0].release();}await assert.rejects(promise);assert.equal(fired,true);assert.equal(following,0);assert.equal(calls(),phase==='before issuer'?0:1);}finally{t.mock.restoreAll();}
}));

test('the original native issuer Promise own then accessor is never called or used to release a pending slot',async t=>selectionFixture(t,async({pending,acquire,calls,next,observePromise})=>{
 let touches=0;observePromise(p=>Object.defineProperty(p,'then',{get(){touches++;throw Error('SYNTHETIC own then must not run');}}));
 const entered=next(),controller=new AbortController(),promise=acquire(controller.signal);promise.catch(()=>{});await entered;controller.abort();await assert.rejects(promise);assert.equal(touches,0);assert.equal(calls(),1);pending[0].release();await tick(0);assert.equal(touches,0);
}));

test('retained original issuer reader checks absolute expiry before the timer callback',async t=>selectionFixture(t,async({pending,acquire,next,expiry})=>{
 const entered=next(),controller=new AbortController(),promise=acquire(controller.signal);promise.catch(()=>{});await entered;const now=Date.now;
 try{Date.now=()=>expiry;await assert.rejects(pending[0].tx.get('meta','gate'));}finally{Date.now=now;controller.abort();await assert.rejects(promise);}
}));

test('last original issuer callback cannot return a grant after the acquisition deadline',async t=>selectionFixture(t,async({f,pending,acquire,next,observeCurrent})=>{
 let clock=performance.now(),issued=false,roots=0,hit=false;const original=f.s.repository.transaction.bind(f.s.repository);t.mock.method(performance,'now',()=>clock);
 t.mock.method(f.s.repository,'transaction',(write,fn,...args)=>original(write,async tx=>{const get=tx.get.bind(tx);tx.get=async(...args)=>{const row=await get(...args);if(issued&&args[0]==='meta'&&args[1]==='smart-filter')roots++;return row;};return fn(tx);},...args));
 observeCurrent(raw=>{if(!hit&&roots===2&&raw.scope.phase==='topic-exact-reuse'){hit=true;clock+=f.s.organizerBudget.limits.timeoutMs+1;}});
 try{const entered=next(),promise=acquire(new AbortController().signal);await entered;issued=true;pending[0].release();await assert.rejects(promise);assert.equal(hit,true);}finally{t.mock.restoreAll();}
}));

for(const mode of ['throw','reject'])test('actual original issuer '+mode+' releases its slot only on actual settlement',async t=>selectionFixture(t,async({pending,acquire,calls,next,failResolve})=>{
 failResolve(mode);for(let i=0;i<9;i++){await assert.rejects(acquire(new AbortController().signal),{code:'STORAGE_FAILED'});assert.equal(calls(),i+1);}failResolve(null);
 const entered=next(),controller=new AbortController(),promise=acquire(controller.signal);await entered;assert.equal(calls(),10);controller.abort();await assert.rejects(promise);pending[0].release();
}));
test('a native Promise counterfeit fulfillment cannot adopt a late receipt or free any of eight held slots',async t=>selectionFixture(t,async({pending,acquire,calls,next,observePromise})=>{
 let touches=0;observePromise(p=>Object.defineProperty(p,'then',{value:yes=>{touches++;yes(pending.at(-1).raw);}}));
 for(let i=0;i<8;i++){const entered=next(),controller=new AbortController(),promise=acquire(controller.signal);let done=false;promise.then(()=>done=true,()=>done=true);await entered;await tick(0);assert.equal(done,false);controller.abort();await assert.rejects(promise);assert.equal(touches,0);}
 await assert.rejects(acquire(new AbortController().signal),{code:'BUDGET_EXCEEDED'});assert.equal(calls(),8);assert.equal(touches,0);
 for(const p of pending)p.release();await tick(0);assert.equal(touches,0);assert.equal(calls(),8);
}));
