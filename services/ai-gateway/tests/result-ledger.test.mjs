import test from 'node:test';
import assert from 'node:assert/strict';
import {PostgresLedgerStorage,LEDGER_KEY,recoveryCapacityBytes,encodeSnapshot} from '../postgres-ledger.mjs';
import {BudgetWindowReservation} from '../../../extension/core/ai-usage/budget-window-reservation.js';
import {fixture,protocol} from './service-fixtures.mjs';
import {request} from './postgres-fixtures.mjs';

async function prepared(){
 const f=fixture(),p=protocol(f),r=request('SYNTHETIC-result'),bundle=p.admit(r),service=p.service();
 await service.reserve(bundle);p.event(r,'SYNTHETIC-dispatch','DISPATCHED');await service.record(bundle,'SYNTHETIC-dispatch');
 p.event(r,'SYNTHETIC-usage','SETTLEMENT');const e=p.events.get('SYNTHETIC-usage').evidence;e.outcome='VALIDATED';e.committedChildren=[];
 await service.settle(bundle,'SYNTHETIC-usage');
 const storage=new PostgresLedgerStorage({pool:p.pool});
 // Explicit synthetic proof for this storage-only original-function regression.
 const owner=new BudgetWindowReservation({service:{transact:callback=>storage.transact(callback,{lock:async()=>({now:f.now}),beforePublish:async()=>({notBefore:f.now,expiresAt:f.now+1000})}),clock:()=>f.now,
  verifyRequest:request=>({request,authorized:true,verifiedServiceFacts:true,tier:'free',timeZone:'UTC'}),
  verifySettlement:(request,evidence)=>({request,evidence,verifiedSettlementFacts:true}),
  verifyResult:(request,evidence)=>({request,evidence,verifiedResultFacts:true})}});
 return {f,p,r,owner,result:{receiptId:'SYNTHETIC-domain-receipt',jobId:r.jobId,outcome:'COMMITTED',children:[{operationId:r.operationId,receiptId:e.receiptId}]}};
}

test('the original finalizeResult persists separately from immutable financial settlement through real PG storage code',async()=>{
 const {p,r,owner,result}=await prepared(),before=p.saved().rows[0].settlement;
 const answer=await owner.finalizeResult(r,result);
 assert.equal(answer.resultOutcome,'COMMITTED');assert.equal(answer.effectiveResults,1);
 assert.deepEqual(p.saved().rows[0].settlement,before);assert.deepEqual(p.saved().rows[0].resultResolution,result);
 assert.equal((await owner.finalizeResult(r,result)).effectiveResults,1);
 assert.deepEqual(p.saved().rows[0].settlement,before);
});

test('result metadata allowlist refuses bodies extra child fields and invalid timestamps',async()=>{
 const {p,r,owner,result}=await prepared();await owner.finalizeResult(r,result);const good=p.saved();
 for(const mutate of [s=>s.rows[0].resultResolution.body='SYNTHETIC body',s=>s.rows[0].resultResolution.children[0].usage=1,s=>s.rows[0].resultResolvedAt=-1,s=>s.rows[0].resultResolution.children[0].receiptId='bad\n']){
  const state=structuredClone(good);mutate(state);assert.throws(()=>encodeSnapshot(state),e=>e.code==='BUDGET_SNAPSHOT_INVALID');
 }
});

test('future domain metadata stays reserved after provider settlement and is consumed by finalization',async()=>{
 const {p,r,owner,result}=await prepared(),settled=p.saved();
 const bytes=Buffer.byteLength(JSON.stringify(settled));assert.ok(recoveryCapacityBytes(settled)>bytes+10000);
 await owner.finalizeResult(r,result);assert.ok(recoveryCapacityBytes(p.saved())<recoveryCapacityBytes(settled));
});

test('legacy rows without result fields stay readable while missing paired terminal field fails original owner validation',async()=>{
 const {p,r,owner,result}=await prepared();assert.doesNotThrow(()=>encodeSnapshot(p.saved()));await owner.finalizeResult(r,result);
 for(const key of ['resultResolution','resultResolvedAt']){
  const state=structuredClone(p.saved());delete state.rows[0][key];p.setSaved(state);
  await assert.rejects(owner.finalizeResult(r,result),e=>e.code==='RESULT_HISTORY_INVALID');
  state.rows[0].resultResolution=result;state.rows[0].resultResolvedAt=state.lastNow;p.setSaved(state);
 }
});

test('additive domain receipt headroom is charged once on child zero, not on every paid child',async()=>{
 const {p}=await prepared(),base=p.saved(),anchor=base.rows[0],single=recoveryCapacityBytes(base);
 const sibling=structuredClone(anchor);sibling.request={...sibling.request,operationId:'SYNTHETIC-sibling',childIndex:1,childCount:2};
 sibling.settlement={...sibling.settlement,operationId:sibling.request.operationId,receiptId:'SYNTHETIC-sibling-usage'};
 const pair={...base,rows:[{...anchor,request:{...anchor.request,childCount:2}},sibling]};
 const serializedGrowth=Buffer.byteLength(JSON.stringify(pair))-Buffer.byteLength(JSON.stringify(base));
 assert.ok(recoveryCapacityBytes(pair)-single < serializedGrowth+300,'second child adds serialized row bytes, not a second ~10KiB result bound');
});
