import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {AIUsageFoundation} from '../core/ai-usage/foundation.js';
import {JOB_TYPES} from '../core/ai-usage/contracts.js';
async function fixture(){
 const f=await setup(OrganizerStore),permission={allowed:true,principalId:'synthetic-principal',libraryId:'synthetic-library',consentEpoch:'synthetic-epoch',jobTypes:JOB_TYPES};
 const options={resolveAuthority:async(_t,r)=>({...permission,scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),committers:Object.fromEntries(['topic','context'].map(facet=>[facet,async(t,r)=>{await t.put('meta',{id:'synthetic-domain:'+facet,committed:true});return {committed:true,coverage:r.units};}]))};
 const ai=new AIUsageFoundation(f.s,options),items=(await ai.collect()).items,coverage=['context','topic'].map(facet=>({key:items[0].key,facet,scope:'synthetic-scope'}));
 const job=await ai.plan({type:'AI_MAINTENANCE',items,coverage,children:coverage.map(u=>[u]),intent:'maintenance',contractVersion:'synthetic-contract',routeVersion:'synthetic-route'});
 const respond=async()=>{await ai.reserve(job.id,{reservationId:'synthetic-parent'});for(const id of job.childIds)await ai.dispatch(job.id,id,{describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async()=>({accepted:true,operationReceiptId:'synthetic-receipt:'+id})});};
 const commit=async i=>ai.commitFacet(job.id,job.childIds[i],{facet:coverage[i].facet,units:[coverage[i]]});
 return {...f,ai,job,items,permission,options,respond,commit};
}
const row=f=>f.s.repository.transaction(false,t=>t.get('organizerJobs',f.job.id));
test('original complete domain transaction owns one stable durable result receipt',async()=>{
 const f=await fixture();await f.respond();await f.commit(0);assert.equal((await row(f)).domainResultReceipt,undefined);
 await f.commit(1);const saved=(await row(f)).domainResultReceipt;assert.equal(saved.outcome,'COMMITTED');
 assert.deepEqual((await f.ai.domainResult(f.job.id)).receipt,saved);
 assert.deepEqual((await new AIUsageFoundation(f.s,f.options).domainResult(f.job.id)).receipt,saved);
 await f.commit(1);assert.deepEqual((await row(f)).domainResultReceipt,saved);
 assert.doesNotMatch(JSON.stringify(saved),/Synthetic explicit working input|originalText|libraryText|prompt|body/);
});
test('rollback loses neither the original ACK nor an invented domain receipt',async()=>{
 const f=await fixture();await f.respond();await f.commit(0);const original=f.ai.write.bind(f.ai);
 f.ai.write=fn=>original(async t=>{const put=t.put.bind(t);t.put=async(table,r)=>{if(table==='organizerJobs'&&r.domainResultReceipt)throw Error('synthetic-commit-failure');return put(table,r);};return fn(t);});
 await assert.rejects(f.commit(1),e=>e.code==='STORAGE_FAILED');assert.equal((await row(f)).domainResultReceipt,undefined);assert.equal(await f.s.repository.transaction(false,t=>t.get('meta','synthetic-domain:topic')),undefined);
 f.ai.write=original;await f.commit(1);assert.equal((await f.ai.domainResult(f.job.id)).receipt.outcome,'COMMITTED');
});
test('unknown child and schema/transport success without local commit cannot create a domain result',async()=>{
 const f=await fixture();await f.respond();assert.equal((await f.ai.domainResult(f.job.id)).status,'PENDING');await f.commit(0);assert.equal((await f.ai.domainResult(f.job.id)).status,'PENDING');
 const g=await fixture();await g.ai.reserve(g.job.id,{reservationId:'synthetic-parent'});await g.ai.dispatch(g.job.id,g.job.childIds[0],{describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async()=>{throw Error();}});await g.ai.cancel(g.job.id);assert.equal((await g.ai.domainResult(g.job.id)).status,'PENDING');
});
test('genuine before-dispatch cancellation and expired known response are distinct stable failures',async()=>{
 for(const sent of [false,true]){const f=await fixture();if(sent)await f.respond();await f.ai.cancel(f.job.id);const r=(await f.ai.domainResult(f.job.id)).receipt;assert.equal(r.outcome,'FAILED');assert.equal(r.localState,sent?'EXPIRED_UNCOMMITTED':'CANCELLED_BEFORE_DISPATCH');assert.ok(r.children.every(c=>sent?c.operationReceiptId:c.operationReceiptId===null));}
});
test('conflicting child identity and current principal or scope cannot borrow a saved local receipt',async()=>{
 for(const mode of ['child','principal','scope']){const f=await fixture();await f.respond();await f.commit(0);await f.commit(1);
  if(mode==='principal')f.permission.principalId='other';else if(mode==='scope')f.options.resolveAuthority=async()=>null;
  else await f.s.foundationWrite(async t=>{if(mode==='ack'){const rows=await t.all('organizerWorkItems'),r=rows.find(r=>r.state==='ACKNOWLEDGED');await t.put('organizerWorkItems',{...r,jobId:'other'});}else{const r=await t.get('organizerUsage','aiu:attempt:'+f.job.childIds[0]);await t.put('organizerUsage',{...r,childId:'other'});}});
  await assert.rejects((mode==='scope'?new AIUsageFoundation(f.s,f.options):f.ai).domainResult(f.job.id));
 }
});
import {createClientResultTransport} from '../core/ai-usage/client-result-transport.js';
const request={operationId:'synthetic-child',jobId:'synthetic-job',principalId:'synthetic-principal',libraryId:'synthetic-library',scopeFingerprint:'synthetic-scope',contractVersion:'synthetic-contract',routeVersion:'synthetic-route',consentEpoch:'synthetic-epoch',jobType:'AI_ASSIST',childIndex:0,childCount:1,inputTokens:100,outputCap:600,maxCompletionTokens:500};
const bundle={request,principalToken:'synthetic-principal-proof',entitlementToken:'synthetic-entitlement-proof'};
const result={receiptId:'synthetic-domain-receipt',jobId:request.jobId,outcome:'COMMITTED',children:[{operationId:request.operationId,receiptId:'synthetic-financial-receipt'}]};
const ack={decision:'finalized',operationId:request.operationId,jobId:request.jobId,receiptId:result.receiptId,resultOutcome:result.outcome,effectiveResults:1,financialAuthority:false,dispatchAllowed:false,retryAllowed:false};
test('fixed metadata finalization transport snapshots all input before send and matches exact ACK',async()=>{
 let sent;const t=createClientResultTransport({endpoint:'https://synthetic.invalid/api/results',fetch:r=>{sent=r;return Promise.resolve(Response.json(ack));}}),b=structuredClone(bundle),e=structuredClone(result),pending=t.finalize(b,e);b.request.jobId='other';e.outcome='FAILED';
 assert.deepEqual({...await pending},ack);const wire=await sent.json();assert.deepEqual(wire,{action:'finalize',...bundle,result});assert.equal(sent.credentials,'omit');assert.equal(sent.redirect,'error');
});
test('forged/extra response fields, cross identity, conflict count and lost ACK stay unknown without retry',async()=>{
 for(const patch of [{jobId:'other'},{operationId:'other'},{receiptId:'other'},{resultOutcome:'FAILED'},{effectiveResults:0},{financialAuthority:true},{value:'private'}]){let calls=0;const t=createClientResultTransport({endpoint:'https://synthetic.invalid/api/results',fetch:()=>{calls++;return Promise.resolve(Response.json({...ack,...patch}));}});assert.equal((await t.finalize(bundle,result)).decision,'outcome_unknown');assert.equal(calls,1);}
 let calls=0;const t=createClientResultTransport({endpoint:'https://synthetic.invalid/api/results',fetch:()=>{calls++;throw Error('private');}});assert.equal((await t.finalize(bundle,result)).decision,'outcome_unknown');assert.equal(calls,1);
});
test('metadata transport rejects accessors, extra body and wrong route without reading or sending',async()=>{
 let calls=0,reads=0;const t=createClientResultTransport({endpoint:'https://synthetic.invalid/api/results',fetch:()=>{calls++;throw Error();}});
 for(const e of [{...result,body:'private'},Object.defineProperty({...result},'outcome',{enumerable:true,get(){reads++;return 'COMMITTED';}})])assert.equal((await t.finalize(bundle,e)).decision,'deny');
 assert.equal(reads,0);assert.equal(calls,0);assert.equal(createClientResultTransport({endpoint:'https://synthetic.invalid/api/provider'}),null);
});
