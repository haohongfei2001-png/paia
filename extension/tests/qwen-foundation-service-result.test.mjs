import {inputEdit} from './harness/thought-m1.mjs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {fixture} from './harness/qwen-foundation-service.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {AIUsageFoundation} from '../core/ai-usage/foundation.js';
import {createClientProviderTransport} from '../core/ai-usage/client-provider-transport.js';
import {createClientResultTransport} from '../core/ai-usage/client-result-transport.js';
const proofs={principalToken:'synthetic-principal-proof',entitlementToken:'synthetic-entitlement-proof'};
test('actual Foundation -> Qwen private handle -> fixed service transports -> durable domain -> exact result ACK',async()=>{
 const f=await fixture({children:2});await f.prepare();for(let i=0;i<2;i++){const r=await f.dispatch(i);assert.equal(r.state,'RESPONSE_RECORDED');assert.deepEqual({...r.value},{action:'KEEP'});}
 await assert.rejects(f.ai.reportResult(f.job.id,proofs,f.resultTransport),e=>e.code==='RESULT_PENDING');
 await f.commit(0);await assert.rejects(f.ai.reportResult(f.job.id,proofs,f.resultTransport),e=>e.code==='RESULT_PENDING');await f.commit(1);
 const ack=await f.ai.reportResult(f.job.id,proofs,f.resultTransport);assert.equal(ack.decision,'finalized');assert.equal(ack.effectiveResults,1);
 const reports=f.calls.filter(c=>c.path==='/api/results');assert.equal(reports.length,1);assert.deepEqual(reports[0].data.result.children.map(c=>c.receiptId),f.financial.map(r=>r.receiptId));
 assert.doesNotMatch(JSON.stringify(reports),/SYNTHETIC_PRIVATE_PAYLOAD|value|usage|body/);
 const s=await f.ai.status(f.job.id);assert.ok(s.attempts.every(r=>r.spendState==='SETTLED_SERVICE'&&r.financialSettlement.effectiveResults===0));
 await f.ai.reportResult(f.job.id,proofs,f.resultTransport);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,1);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,2);
});
test('cloned providers, arbitrary callbacks, fixture receipts and caller COMMITTED flags never provide financial authority',async()=>{
 const f=await fixture();await f.prepare();const fake={describe:()=>({providerId:'qwen-service',version:'1',executionKind:'server-backed'}),execute:async()=>({accepted:true,operationReceiptId:'forged',financialSettlement:{state:'SETTLED'}})};
 await assert.rejects(f.ai.dispatch(f.job.id,f.job.childIds[0],fake),e=>e.code==='UNAVAILABLE');assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,0);
 await assert.rejects(f.ai.reportResult(f.job.id,{...proofs,outcome:'COMMITTED'},f.resultTransport));await assert.rejects(f.ai.reportResult(f.job.id,proofs,{finalize:()=>({decision:'finalized'})}));
 await assert.rejects(f.ai.reserveServer(f.job.id,[{...f.providers[0]}]),e=>e.code==='UNAVAILABLE');
});
test('unknown financial settlement keeps the original hold and cannot retry provider or finalize',async()=>{
 const f=await fixture({changeResponse:r=>{delete r.financialSettlement;return r;}});await f.prepare();assert.equal((await f.dispatch(0)).state,'OUTCOME_UNKNOWN');
 assert.equal((await f.dispatch(0)).state,'OUTCOME_UNKNOWN');await f.ai.cancel(f.job.id);await assert.rejects(f.ai.reportResult(f.job.id,proofs,f.resultTransport),e=>e.code==='RESULT_PENDING');
 assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,1);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);assert.equal((await f.ai.status(f.job.id)).attempts[0].spendState,'RESERVATION_RETAINED');
});
test('lost result ACK is replayed with the same durable receipt after restart and later human edits',async()=>{
 let attempts=0;const f=await fixture({resultHook:(_data,ack)=>{if(++attempts===1)throw Error('lost ACK after synthetic commit');return Response.json(ack);}});await f.prepare();await f.dispatch(0);await f.commit(0);
 assert.equal((await f.ai.reportResult(f.job.id,proofs,f.resultTransport)).decision,'outcome_unknown');
 await inputEdit(f.s,f.items[0].descriptor.entityId,{libraryText:'A genuinely newer human revision'});
 // A later legitimate owner replaces the same coverage ACK. The old immutable
 // event reports history, so this cannot turn its committed result into failure.
 await f.s.foundationWrite(async t=>{const rows=await t.all('organizerWorkItems'),ack=rows.find(r=>r.state==='ACKNOWLEDGED');await t.put('organizerWorkItems',{...ack,jobId:'later-job',signature:'later-human-revision'});});
 const restarted=new AIUsageFoundation(f.s,f.options);assert.equal((await restarted.reportResult(f.job.id,proofs,f.resultTransport)).decision,'finalized');
 const reports=f.calls.filter(c=>c.path==='/api/results');assert.equal(reports.length,2);assert.deepEqual(reports[0].data,reports[1].data);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,1);
});
test('current principal or consent revocation denies metadata reporting but retains original financial spend',async()=>{
 for(const field of ['principalId','consentEpoch']){const f=await fixture();await f.prepare();await f.dispatch(0);await f.commit(0);f.permission[field]='revoked';await assert.rejects(f.ai.reportResult(f.job.id,proofs,f.resultTransport),e=>e.code==='CANCELLED');assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);assert.equal((await f.ai.status(f.job.id)).attempts[0].financialSettlement.settledSpendMicros,120);}
});
test('same-origin transport and original full job scope are required',async()=>{
 const f=await fixture();await f.prepare();await f.dispatch(0);await f.commit(0);let sends=0;
 const other=createClientResultTransport({endpoint:'https://other.invalid/api/results',fetch:()=>{sends++;throw Error();}});await assert.rejects(f.ai.reportResult(f.job.id,proofs,other),e=>e.code==='RESULT_ORIGIN_MISMATCH');assert.equal(sends,0);
 const g=await fixture();const o=g.owners[0],d=await o.owner.prepareDeclaration(o.input);await o.owner.publishDeclaration(d,proofs,g.declaration);await o.owner.reserveDeclaration(d,g.reservation);const b=await o.owner.bind(o.input);
 assert.equal(o.owner.foundationProvider(b,createClientProviderTransport({endpoint:'https://other.invalid/api/provider'})),null);assert.equal(o.owner.foundationProvider(structuredClone(b),g.providerTransport),null);
});
test('original Qwen current fence rejects revoked body before HTTP and suppresses a late response without refunding spend',async()=>{
 const f=await fixture();await f.prepare();f.owners[0].hooks.auth=()=>null;await assert.rejects(f.dispatch(0));assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,0);
 let release,entered;const began=new Promise(r=>entered=r),hold=new Promise(r=>release=r),g=await fixture({holdProvider:async()=>{entered();await hold;}});await g.prepare();const pending=g.dispatch(0);await began;g.owners[0].hooks.auth=()=>null;release();const r=await pending;
 assert.equal(r.state,'EXPIRED_UNCOMMITTED');assert.equal(r.value,undefined);assert.equal((await g.ai.status(g.job.id)).attempts[0].financialSettlement.settledSpendMicros,120);assert.equal((await g.ai.domainResult(g.job.id)).receipt.outcome,'FAILED');assert.equal((await g.ai.reportResult(g.job.id,proofs,g.resultTransport)).effectiveResults,0);
});
test('actual server cancellation proof is required for null financial receipt and no provider is dispatched',async()=>{
 const f=await fixture();await f.prepare();await f.ai.cancel(f.job.id);await assert.rejects(f.ai.reportResult(f.job.id,proofs,f.resultTransport),e=>e.code==='FINANCIAL_RECEIPT_UNAVAILABLE');
 await f.ai.cancelServer(f.job.id);assert.equal((await f.ai.reportResult(f.job.id,proofs,f.resultTransport)).effectiveResults,0);
 const sent=f.calls.find(c=>c.path==='/api/results').data;assert.equal(sent.result.children[0].receiptId,null);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,0);
});
test('schema failure with genuine settled spend produces FAILED without a hidden repair call',async()=>{
 const f=await fixture({changeResponse:r=>({...r,decision:'outcome_unknown',value:undefined,financialSettlement:{...r.financialSettlement,outcome:'FAILED'},resultFinalization:'FAILED'})});await f.prepare();assert.equal((await f.dispatch(0)).state,'REJECTED');assert.equal((await f.ai.reportResult(f.job.id,proofs,f.resultTransport)).effectiveResults,0);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,1);
});
test('caller token mutation while local report persistence awaits cannot alter transmitted principal proof',async()=>{
 const f=await fixture();await f.prepare();await f.dispatch(0);await f.commit(0);let entered,release;const began=new Promise(r=>entered=r),hold=new Promise(r=>release=r),original=f.ai.write.bind(f.ai);let paused=false;
 f.ai.write=async fn=>{if(!paused){paused=true;entered();await hold;}return original(fn);};
 const tokens={...proofs},pending=f.ai.reportResult(f.job.id,tokens,f.resultTransport);await began;tokens.principalToken='mutated';release();assert.equal((await pending).decision,'finalized');assert.equal(f.calls.find(c=>c.path==='/api/results').data.principalToken,proofs.principalToken);
});
test('unknown reservation acknowledgement never creates a server provider or repeats its reserve call',async()=>{
 const f=await fixture({reserveHook:()=>{throw Error('lost reserve ACK');}}),o=f.owners[0],d=await o.owner.prepareDeclaration(o.input);await o.owner.publishDeclaration(d,proofs,f.declaration);
 assert.equal((await o.owner.reserveDeclaration(d,f.reservation)).status,'RESERVATION_UNKNOWN');assert.equal((await o.owner.reserveDeclaration(d,f.reservation)).status,'RESERVATION_UNKNOWN');
 const again=await o.owner.prepareDeclaration(o.input);assert.equal((await o.owner.reserveDeclaration(again,f.reservation)).status,'RESERVATION_UNKNOWN');assert.equal(o.owner.foundationProvider(await o.owner.bind(o.input),f.providerTransport),null);assert.equal(f.calls.filter(c=>c.path==='/api/reservations').length,1);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,0);
});
test('a privately branded provider for a different principal cannot reserve the original local job',async()=>{
 const f=await fixture(),o=f.owners[0];o.input.reservationRequest.principalId='other-principal';const d=await o.owner.prepareDeclaration(o.input);await o.owner.publishDeclaration(d,proofs,f.declaration);await o.owner.reserveDeclaration(d,f.reservation);const p=o.owner.foundationProvider(await o.owner.bind(o.input),f.providerTransport);assert.ok(p);
 await assert.rejects(f.ai.reserveServer(f.job.id,[p]),e=>e.code==='RESULT_BINDING_MISMATCH');assert.equal((await f.ai.status(f.job.id)).attempts.length,0);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,0);
});
test('late result ACK identity conflict keeps its original receipt pending for exact metadata replay',async()=>{
 let first=true;const f=await fixture({resultHook:(_data,ack)=>{if(first){first=false;return Response.json({...ack,receiptId:'other-domain-receipt'});}return Response.json(ack);}});await f.prepare();await f.dispatch(0);await f.commit(0);
 assert.equal((await f.ai.reportResult(f.job.id,proofs,f.resultTransport)).decision,'outcome_unknown');assert.equal((await f.ai.reportResult(f.job.id,proofs,f.resultTransport)).decision,'finalized');const calls=f.calls.filter(c=>c.path==='/api/results');assert.deepEqual(calls[0].data,calls[1].data);
});
test('domain rollback and local acknowledgement loss cannot manufacture a new receipt or repeat the provider',async()=>{
 const f=await fixture();await f.prepare();await f.dispatch(0);const original=f.ai.write.bind(f.ai);f.ai.write=fn=>original(async t=>{const put=t.put.bind(t);t.put=(table,row)=>{if(table==='organizerJobs'&&row.domainResultReceipt)throw Error('synthetic-rollback');return put(table,row);};return fn(t);});
 await assert.rejects(f.commit(0));f.ai.write=original;await assert.rejects(f.ai.reportResult(f.job.id,proofs,f.resultTransport),e=>e.code==='RESULT_PENDING');await f.commit(0);
 let once=true;f.ai.write=fn=>original(async t=>{const put=t.put.bind(t);t.put=(table,row)=>{if(once&&table==='organizerJobs'&&row.resultReport?.state==='ACKNOWLEDGED'){once=false;throw Error('synthetic-local-ACK-loss');}return put(table,row);};return fn(t);});
 await assert.rejects(f.ai.reportResult(f.job.id,proofs,f.resultTransport));f.ai.write=original;assert.equal((await f.ai.reportResult(f.job.id,proofs,f.resultTransport)).decision,'finalized');const reports=f.calls.filter(c=>c.path==='/api/results');assert.deepEqual(reports[0].data,reports[1].data);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,1);
});
test('a private provider response object cannot be replayed through execute after content revocation',async()=>{
 const f=await fixture();await f.prepare();await f.dispatch(0);f.owners[0].hooks.auth=()=>null;const r=await f.providers[0].execute({logicalJobId:f.job.id,childOperationId:f.job.childIds[0],type:'AI_MAINTENANCE',contractVersion:'fixture-contract',routeVersion:'fixture-route',automaticRetries:0});assert.equal(r.accepted,false);assert.equal(r.value,undefined);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,1);
});
test('original Source purge may remove local pending history but never refunds known spend or replays a provider',async()=>{
 const f=await fixture({resultHook:()=>{throw Error('lost report ACK');}});await f.prepare();await f.dispatch(0);await f.commit(0);assert.equal((await f.ai.reportResult(f.job.id,proofs,f.resultTransport)).decision,'outcome_unknown');
 await f.s.purge(f.items[0].descriptor.sourceRecordIds[0],true);await f.s.drainPurgeCleanup();
 await assert.rejects(new AIUsageFoundation(f.s,f.options).reportResult(f.job.id,proofs,f.resultTransport));
 const row=await f.s.repository.transaction(false,t=>t.get('organizerUsage','aiu:attempt:'+f.job.childIds[0]));assert.equal(row.financialSettlement.settledSpendMicros,120);assert.ok(await f.s.repository.transaction(false,t=>t.get('meta','aiu:dispatched:'+f.job.childIds[0])));assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,1);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,1);
});
test('bounded original generated job ID produces a protocol-safe stable receipt',async()=>{const f=await fixture();await f.prepare();await f.dispatch(0);await f.commit(0);const r=(await f.ai.domainResult(f.job.id)).receipt;assert.equal(r.receiptId.length,83);assert.ok(r.receiptId.length<=200);});
test('original semantic invalidation records known uncommitted failure in its transaction and keeps settled spend',async()=>{
 const f=await fixture();await f.prepare();await f.dispatch(0);await inputEdit(f.s,f.items[0].descriptor.entityId,{libraryText:'Later human semantic revision before domain commit'});
 const status=await f.ai.status(f.job.id);assert.equal(status.state,'EXPIRED_UNCOMMITTED');assert.equal(status.attempts[0].spendState,'SETTLED_SERVICE');assert.equal(status.attempts[0].financialSettlement.settledSpendMicros,120);
 assert.equal((await f.ai.domainResult(f.job.id)).receipt.outcome,'FAILED');assert.equal((await f.ai.reportResult(f.job.id,proofs,f.resultTransport)).effectiveResults,0);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,1);
 const g=await fixture({changeResponse:r=>{delete r.financialSettlement;return r;}});await g.prepare();await g.dispatch(0);await inputEdit(g.s,g.items[0].descriptor.entityId,{libraryText:'Later human revision during unresolved financial outcome'});assert.equal((await g.ai.domainResult(g.job.id)).status,'PENDING');assert.equal((await g.ai.status(g.job.id)).attempts[0].spendState,'RESERVATION_RETAINED');
});
test('legacy injected outcome callback cannot impersonate missing server financial reconciliation',async()=>{
 const f=await fixture({changeResponse:r=>{delete r.financialSettlement;return r;}});await f.prepare();await f.dispatch(0);const forged=new AIUsageFoundation(f.s,{...f.options,verifyOutcome:async binding=>({binding,outcome:'ACCEPTED',operationReceiptId:'forged-reconciliation'})});
 await assert.rejects(forged.reconcileOutcome(f.job.id,f.job.childIds[0],{}),e=>e.code==='UNAVAILABLE');assert.equal((await forged.status(f.job.id)).attempts[0].state,'OUTCOME_UNKNOWN');assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,1);
});

test('Qwen content revocation at either side of the complete Foundation write suppresses publication without refund',async()=>{
 for(const boundary of ['before-write','after-write']){
  const f=await fixture();await f.prepare();const original=f.ai.write.bind(f.ai);let writes=0;
  f.ai.write=async fn=>{const index=++writes;if(index===2&&boundary==='before-write')f.owners[0].hooks.auth=()=>null;const result=await original(fn);if(index===2&&boundary==='after-write')f.owners[0].hooks.auth=()=>null;return result;};
  const result=await f.dispatch(0);assert.equal(result.value,undefined,boundary);assert.equal(result.state,'EXPIRED_UNCOMMITTED');
  const row=(await f.ai.status(f.job.id)).attempts[0];assert.equal(row.spendState,'SETTLED_SERVICE');assert.equal(row.financialSettlement.settledSpendMicros,120);
  assert.equal((await f.ai.reportResult(f.job.id,proofs,f.resultTransport)).effectiveResults,0);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,1);
 }
});
test('the publication fence accepts the actual settled financial row without re-running RESERVED admission',async()=>{
 const f=await fixture();await f.prepare();const original=f.ai.write.bind(f.ai);let writes=0;
 f.ai.write=async fn=>{const index=++writes,result=await original(fn);if(index===2)f.owners[0].mutateRow(row=>{row.state='SETTLED';});return result;};
 const result=await f.dispatch(0);assert.equal(result.state,'RESPONSE_RECORDED');assert.deepEqual({...result.value},{action:'KEEP'});assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,1);
});
test('ordinary cancel and both Qwen revocation owners retire the unsent body but allow original metadata cancellation',async()=>{
 for(const retirement of ['cancel','revoke','declaration']){
  const f=await fixture();await f.prepare();
  if(retirement==='cancel')await f.ai.cancel(f.job.id);
  else if(retirement==='revoke')assert.equal(f.owners[0].owner.revoke(f.owners[0].manifest.profile.id),true);
  else await f.owners[0].owner.revokeDeclaration(f.declaredHandles[0]);
  const r=await f.providers[0].execute(f.owners[0].input.childIdentity);assert.equal(r.accepted,false);assert.equal(r.value,undefined);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,0);
  await f.ai.cancelServer(f.job.id);const row=(await f.ai.status(f.job.id)).attempts[0];assert.equal(row.financialCancellation,true);assert.equal(row.spendState,'RELEASED_SERVICE_BEFORE_DISPATCH');
 }
});
test('in-flight owner disposal suppresses private output and retains actual known financial settlement',async()=>{
 let enter,release;const began=new Promise(r=>enter=r),hold=new Promise(r=>release=r),f=await fixture({holdProvider:async()=>{enter();await hold;}});await f.prepare();
 const pending=f.dispatch(0);await began;f.owners[0].owner.dispose();release();const result=await pending;assert.equal(result.state,'EXPIRED_UNCOMMITTED');assert.equal(result.value,undefined);
 const row=(await f.ai.status(f.job.id)).attempts[0];assert.equal(row.spendState,'SETTLED_SERVICE');assert.equal(row.financialSettlement.settledSpendMicros,120);assert.equal((await f.ai.reportResult(f.job.id,proofs,f.resultTransport)).effectiveResults,0);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,1);
});
test('retired original bound handles and fulfilled private outputs are collectible with Foundation and providers still alive',()=>{
 const output=execFileSync(process.execPath,['--expose-gc',fileURLToPath(new URL('./harness/qwen-client-retirement.mjs',import.meta.url))],{encoding:'utf8',timeout:10000});assert.match(output,/retirement assertions passed/);
});
test('legacy job cancellation preserves the original lifecycle without minting receipts or accepting forged history',async()=>{
 for(const forged of [false,true]){
  const f=await fixture();await f.s.foundationWrite(async t=>{const job=await t.get('organizerJobs',f.job.id);await t.delete('organizerJobs',job.id);job.id='legacy-job';job.dedupeKey=job.id;delete job.scopeFingerprint;if(forged)job.domainResultReceipt={receiptId:'forged'};await t.put('organizerJobs',job);});
  if(forged)await assert.rejects(f.ai.cancel('legacy-job'),e=>e.code==='RESULT_CONFLICT');
  else{assert.equal((await f.ai.cancel('legacy-job')).state,'CANCELLED_BEFORE_DISPATCH');assert.equal((await f.ai.domainResult('legacy-job')).status,'MISSING_RECEIPT');}
 }
});

test('historical execution abort after persistence cannot publish private content or undo settled spend',async()=>{
 const f=await fixture({historical:true});await f.prepare();const controller=new AbortController(),original=f.ai.write.bind(f.ai);let writes=0;
 f.ai.write=async fn=>{const index=++writes,result=await original(fn);if(index===2)controller.abort();return result;};
 const result=await f.ai.dispatch(f.job.id,f.job.childIds[0],f.providers[0],{signal:controller.signal,timeoutMs:f.s.organizerBudget.limits.timeoutMs});assert.equal(result.state,'EXPIRED_UNCOMMITTED');assert.equal(result.value,undefined);
 const row=(await f.ai.status(f.job.id)).attempts[0];assert.equal(row.spendState,'SETTLED_SERVICE');assert.equal(row.financialSettlement.settledSpendMicros,120);assert.equal((await f.ai.reportResult(f.job.id,proofs,f.resultTransport)).effectiveResults,0);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,1);
});
