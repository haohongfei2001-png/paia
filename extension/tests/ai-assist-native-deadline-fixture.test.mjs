import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {AssistReplyLease} from '../background/assist-reply-lease.js';
import {LocalAssistSession} from '../core/ai-usage/local-assist-session.js';
import {installAssistDeadlineFixture} from './harness/assist-deadline-fixture.mjs';
const authority=async(_t,r)=>({allowed:true,principalId:'synthetic',libraryId:'synthetic',consentEpoch:'synthetic',jobTypes:['AI_ASSIST'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}});
const suggestion=JSON.stringify({version:1,kind:'SUGGESTION',text:'Late result must not publish.',condition:''});
const nativeSet=setTimeout,nativeClear=clearTimeout;
const pause=ms=>new Promise(resolve=>nativeSet(resolve,ms));
async function fixture(execute){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();s.organizerBudget.limits={...s.organizerBudget.limits,timeoutMs:25};
 const sender={id:'synthetic-extension',tab:{id:1},frameId:0,documentId:'synthetic-document',documentLifecycle:'active',url:'https://chatgpt.com/c/synthetic'},binding={url:sender.url,conversation:'/c/synthetic',cycle:1,replyId:'reply-one',revision:1},snapshot={completed:true,text:'Synthetic completed answer.',blocks:1,excluded:false};
 const lease=new AssistReplyLease({runtimeId:sender.id,tabs:{get:async()=>({url:sender.url,incognito:false,active:true})},probe:async(_host,{snapshot:read})=>({ready:true,binding:structuredClone(binding),...(read?{snapshot:structuredClone(snapshot)}:{})}),current:()=>true,clock:()=>1000});lease.configure({replyAccess:true,remoteProcessing:true});
 const session=new LocalAssistSession(s,{lease,provider:{describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute},resolveAuthority:authority,clock:()=>1000}),cap=await lease.observe(sender),handle=await session.prepare({lease:cap});
 const all=()=>s.repository.transaction(false,async t=>({jobs:await t.all('organizerJobs'),usage:await t.all('organizerUsage'),acks:await t.all('organizerWorkItems')}));
 return {s,lease,session,handle,all,async close(){session.dispose();lease.dispose();await s.repository.close();}};
}
function holdFinalSnapshot(lease){let release,ready,finish;const held=new Promise(r=>release=r),entered=new Promise(r=>ready=r),completed=new Promise(r=>finish=r),original=lease.snapshot.bind(lease);let count=0;
 lease.snapshot=async(...args)=>{count++;if(count!==3)return original(...args);ready();try{await held;return await original(...args);}finally{finish();}};return {release,entered,completed};
}
function unknown(rows){assert.deepEqual(rows.jobs.map(j=>j.state),['OUTCOME_UNKNOWN']);assert.deepEqual(rows.usage.map(r=>[r.state,r.attemptCount,r.spendState]),[['OUTCOME_UNKNOWN',1,'RESERVATION_RETAINED']]);assert.equal(rows.acks.length,0);}
test('actual 25ms deadline before provider entry settles UNKNOWN rather than satisfying the native entered promise',async()=>{
 let calls=0,entered=false;const f=await fixture(async()=>{calls++;entered=true;return suggestion;}),held=holdFinalSnapshot(f.lease);
 try{const run=f.session.run(f.handle).then(()=>({published:true}),e=>({code:e.code}));await held.entered;assert.deepEqual(await run,{code:'OUTCOME_UNKNOWN'});assert.equal(entered,false);assert.equal(calls,0);const before=await f.all();unknown(before);held.release();await held.completed;await pause(0);assert.equal(calls,0);assert.deepEqual(await f.all(),before);await assert.rejects(f.session.result(f.handle));}
 finally{held.release();await f.close();}
});
for(const stop of ['timeout','dispose','dismiss','revoke'])for(const late of ['resolve','reject'])test('native provider-entered scheduling preserves '+stop+' / late '+late,async()=>{
 let enter,finish,calls=0,controls;const entered=new Promise(r=>enter=r),physical=new Promise((resolve,reject)=>finish=()=>late==='resolve'?resolve(suggestion):reject(Error('synthetic late error')));
 const f=await fixture(async(_payload,options)=>{calls++;controls=options;enter();return physical;}),held=holdFinalSnapshot(f.lease);installAssistDeadlineFixture();const timer=__controlAssistProviderDeadline(25);let settled=false;
 try{
  const run=f.session.run(f.handle).then(()=>({published:true}),e=>({code:e.code})).finally(()=>settled=true);await held.entered;
  await pause(35);assert.equal(settled,false);assert.equal(calls,0);assert.deepEqual(timer.state(),{captured:true,armed:false,cancelled:false});held.release();await held.completed;
  const first=await Promise.race([entered.then(()=>({entered:true})),run.then(outcome=>({outcome}))]);assert.equal(first.entered,true,JSON.stringify(first));assert.equal(calls,1);assert.equal(controls.timeoutMs,25);assert.equal(controls.signal.aborted,false);timer.arm();
  if(stop==='dispose')f.session.dispose();if(stop==='dismiss')f.session.dismiss(f.handle);if(stop==='revoke')f.lease.configure({replyAccess:true,remoteProcessing:false});
  assert.deepEqual(await run,{code:stop==='timeout'?'OUTCOME_UNKNOWN':'STALE_BASE'});assert.equal(controls.signal.aborted,true);assert.deepEqual(timer.state(),{captured:true,armed:true,cancelled:true});const before=await f.all();unknown(before);finish();await physical.catch(()=>{});await pause(0);assert.deepEqual(await f.all(),before);await assert.rejects(async()=>f.session.run(f.handle));await assert.rejects(f.session.result(f.handle));assert.equal(calls,1);
 }finally{held.release();timer.restore();assert.equal(setTimeout,nativeSet);assert.equal(clearTimeout,nativeClear);await f.close();}
});
test('timer fixture forwards unrelated timers and restores exact native functions on early failure',async()=>{
 installAssistDeadlineFixture();const control=__controlAssistProviderDeadline(25);let ran=false;await new Promise(resolve=>setTimeout(()=>{ran=true;resolve();},25));assert.equal(ran,true);assert.deepEqual(control.state(),{captured:false,armed:false,cancelled:false});assert.throws(()=>control.arm(),/unavailable/);control.restore();assert.equal(setTimeout,nativeSet);assert.equal(clearTimeout,nativeClear);
});
