import test from 'node:test';
import assert from 'node:assert/strict';
import {createApplicationWorkerActivity,createApplicationSelectionCommands,drainOriginalApplicationSelectionActivity} from '../background/application-selection-commands.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const bind=activity=>createApplicationSelectionCommands({}, {activity});
const drain=(owner,control)=>drainOriginalApplicationSelectionActivity(owner,control);

test('original dispatch registers before invoking callback and excludes only its accepted promise',async()=>{
 const activity=createApplicationWorkerActivity(),owner=bind(activity);let entered=false;
 const accepted=activity.dispatch(async control=>{entered=true;assert.equal(await drain(owner,control),undefined);return 'SYNTHETIC done';});
 assert.equal(entered,true);assert.equal(await accepted,'SYNTHETIC done');await activity.drain();
});

test('selection drain still waits children, broadcasts, and another accepted dispatch',async()=>{
 const activity=createApplicationWorkerActivity(),owner=bind(activity),child=deferred(),broadcast=deferred(),other=deferred();let completed=false;
 activity.track(child.promise);activity.dispatch(()=>other.promise);
 const accepted=activity.dispatch(async control=>{await drain(owner,control);completed=true;});
 child.resolve();await tick();assert.equal(completed,false);activity.track(broadcast.promise);other.resolve();await tick();assert.equal(completed,false);broadcast.resolve();await accepted;assert.equal(completed,true);
});

test('ordinary drain includes every accepted request and cannot borrow a private exclusion',async()=>{
 const activity=createApplicationWorkerActivity({deadlineMs:25}),owner=bind(activity),held=deferred();let control;
 const accepted=activity.dispatch(value=>{control=value;return held.promise;});
 await assert.rejects(activity.drain(control),{code:'GENERATION_ACTIVITY_TIMEOUT'});held.resolve();await accepted;
 await assert.rejects(drain(owner,control),{code:'GENERATION_ACTIVITY_INVALID'});await activity.drain();
});

test('forged, foreign factory, ended and reused controls never exclude work',async()=>{
 const a=createApplicationWorkerActivity(),b=createApplicationWorkerActivity(),ownerA=bind(a),ownerB=bind(b);let old;
 await assert.rejects(drain(ownerA,{}),{code:'GENERATION_ACTIVITY_INVALID'});
 await a.dispatch(async control=>{old=control;await assert.rejects(drain(ownerB,control),{code:'GENERATION_ACTIVITY_INVALID'});await assert.rejects(drain({},control),{code:'GENERATION_ACTIVITY_INVALID'});await drain(ownerA,control);await assert.rejects(drain(ownerA,control),{code:'GENERATION_ACTIVITY_INVALID'});});
 await assert.rejects(drain(ownerA,old),{code:'GENERATION_ACTIVITY_INVALID'});
});

test('second drain rejects without releasing the first owner or its pending tasks',async()=>{
 const activity=createApplicationWorkerActivity(),owner=bind(activity),child=deferred();activity.track(child.promise);let control,settled=false;
 const accepted=activity.dispatch(async value=>{control=value;await drain(owner,value);settled=true;});
 await assert.rejects(activity.drain(),{code:'GENERATION_ACTIVITY_BUSY'});await assert.rejects(drain(owner,control),{code:'GENERATION_ACTIVITY_BUSY'});await tick();assert.equal(settled,false);child.resolve();await accepted;await activity.drain();
});

test('timeout invalidates exclusion but preserves real tracked work and late settlement never revives control',async()=>{
 const activity=createApplicationWorkerActivity({deadlineMs:20}),owner=bind(activity),child=deferred();activity.track(child.promise);let control;
 await assert.rejects(activity.dispatch(value=>{control=value;return drain(owner,value);}),{code:'GENERATION_ACTIVITY_TIMEOUT'});
 await assert.rejects(drain(owner,control),{code:'GENERATION_ACTIVITY_INVALID'});await assert.rejects(activity.drain(),{code:'GENERATION_ACTIVITY_TIMEOUT'});
 child.resolve();await activity.drain();await assert.rejects(drain(owner,control),{code:'GENERATION_ACTIVITY_INVALID'});
});

test('dispatch deadline begins before handler waits and cannot be reset when drain finally starts',async()=>{
 const activity=createApplicationWorkerActivity({deadlineMs:15}),owner=bind(activity),held=deferred();
 const accepted=activity.dispatch(async control=>{await held.promise;return drain(owner,control);});
 await new Promise(resolve=>setTimeout(resolve,25));held.resolve();await assert.rejects(accepted,{code:'GENERATION_ACTIVITY_INVALID'});await activity.drain();
});

test('remaining owner work and successor track registrations remain visible',async()=>{
 const first=deferred(),next=deferred(),remaining=deferred();let external=remaining.promise,complete=false;
 const activity=createApplicationWorkerActivity({remaining:()=>[external]}),owner=bind(activity);
 activity.track(first.promise.then(()=>activity.track(next.promise)));
 const accepted=activity.dispatch(async control=>{await drain(owner,control);complete=true;});
 first.resolve();await tick();next.resolve();await tick();assert.equal(complete,false);external=null;remaining.resolve();await accepted;assert.equal(complete,true);
});

test('captured Promise invocation ignores mutable own call and resolve overrides',async()=>{
 const activity=createApplicationWorkerActivity(),owner=bind(activity),then=Promise.prototype.then,call=Object.getOwnPropertyDescriptor(then,'call'),resolve=Promise.resolve;let calls=0,accepted;
 Object.defineProperty(then,'call',{configurable:true,value:()=>{calls++;throw Error('SYNTHETIC forged');}});Promise.resolve=()=>{calls++;throw Error('SYNTHETIC forged');};
 try{accepted=activity.dispatch(control=>drain(owner,control));await accepted;}finally{Promise.resolve=resolve;if(call)Object.defineProperty(then,'call',call);else delete then.call;}
 assert.equal(calls,0);await activity.drain();
});

test('synchronous and rejected handlers settle original accepted work without leaking drain ownership',async()=>{
 const activity=createApplicationWorkerActivity(),owner=bind(activity);
 await assert.rejects(activity.dispatch(()=>{throw Error('SYNTHETIC handler');}),/SYNTHETIC handler/);await activity.drain();
 await activity.dispatch(async control=>{await drain(owner,control);});await activity.drain();
});

for(const deadlineMs of [0,-1,30001,Infinity,1.5])test('invalid activity budget is rejected: '+deadlineMs,()=>{assert.throws(()=>createApplicationWorkerActivity({deadlineMs}),{code:'GENERATION_ACTIVITY_INVALID'});});


test('only one original selection owner can bind a factory and missing controls are refused',async()=>{
 const activity=createApplicationWorkerActivity(),owner=bind(activity);
 assert.throws(()=>bind(activity),{code:'GENERATION_ACTIVITY_BUSY'});
 for(const control of [undefined,null,0,'SYNTHETIC',{}])await assert.rejects(drain(owner,control),{code:'GENERATION_ACTIVITY_INVALID'});
 await activity.dispatch(control=>drain(owner,control));await activity.drain();
});
