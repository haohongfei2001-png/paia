import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture,rpc as nativeRPC} from '../../../../../../services/ai-gateway/tests/organize-native-fixture.mjs';
// Independent valid admission control; the legacy style assertions above remain
// intact. This does not turn a protected NO_DELTA into a successful update.
for(const variant of ['source','release'])test('AI-COST-01 '+variant+' genuine fresh-action ACK rollback, replay and dispose control',{timeout:60000},async t=>{
 const sizes=[],f=await nativeFixture(t,{variant,count:2,holdProvider:payload=>{sizes.push(payload.inputs.length);}});
 const add=()=>nativeRPC(f.p,'CONTINUE_THINKING',{thought:{topicId:f.topic.id,body:'SYNTHETIC fresh-action delta '+sizes.length,operationId:crypto.randomUUID()}});
 const stable=s=>({candidate:s.candidate,marker:s.marker,revisions:s.revisions.filter(r=>r.kind==='ai_presentation'),receipts:s.receipts.filter(r=>r.id.startsWith('ai-presentation-current:')),acks:s.work.filter(r=>r.state==='ACKNOWLEDGED')});
 assert.equal((await f.run()).currentPublished,true);const initial=await f.snapshot();assert.ok(Object.values(initial.candidate.protections).every(x=>x===false));
 await add();const before=await f.snapshot();await f.worker.evaluate(()=>__organizeNative.failNextACK());
 const failed=await f.run();assert.equal(failed.error,'STORAGE_FAILED');assert.equal(await f.worker.evaluate(()=>__organizeNative.failedACK()),true);
 const aborted=await f.snapshot();assert.deepEqual(stable(aborted),stable(before));assert.equal(f.backend.physical(),2);
 const replay=await f.run();assert.equal(replay.completed,true);assert.equal(replay.currentPublished,true);const committed=await f.snapshot();
 assert.equal(f.backend.physical(),2);assert.deepEqual(committed.jobs.map(j=>j.id),aborted.jobs.map(j=>j.id));assert.ok(committed.jobs.every(j=>j.state==='COMMITTED'));assert.ok(committed.usage.every(r=>r.attemptCount===1&&r.state==='COMMITTED'));
 assert.deepEqual(committed.candidate.manifest.blocks.slice(0,2),initial.candidate.manifest.blocks);assert.equal(committed.candidate.evidenceEntryIds.length,3);assert.equal(Object.keys(committed.candidate.manifest.generations).length,2);
 for(const generation of Object.values(committed.candidate.manifest.generations)){assert.equal(committed.jobs.find(j=>j.id===generation.jobId)?.state,'COMMITTED');for(const child of generation.children){const receipt=committed.usage.find(r=>r.id==='aiu:attempt:'+child.childId);assert.equal(receipt?.state,'COMMITTED');assert.equal(receipt.operationReceiptId,child.operationReceiptId);}}
 const cached=await f.run();assert.equal(cached.completed,true);assert.equal(f.backend.physical(),2);assert.deepEqual(stable(await f.snapshot()),stable(committed));
 await add();const beforeDispose=await f.snapshot();
 await f.worker.evaluate(()=>{const original=IDBObjectStore.prototype.put;__organizeNative.disposeHits=0;IDBObjectStore.prototype.put=function(row,...args){if(!__organizeNative.disposeHits&&this.name==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'){__organizeNative.disposeHits++;IDBObjectStore.prototype.put=original;__organizeNative.revoke();}return Reflect.apply(original,this,[row,...args]);};});
 const disposed=await f.run(),afterDispose=await f.snapshot(),disposeHits=await f.worker.evaluate(()=>__organizeNative.disposeHits);
 t.diagnostic(JSON.stringify({variant,phase:'dispose-observation',disposeHits,actualCode:disposed.error,expectedLegacyCode:'STALE_BASE',rollback:JSON.stringify(stable(afterDispose))===JSON.stringify(stable(beforeDispose)),sizes,physical:f.backend.physical(),failure:await f.worker.evaluate(()=>__organizeNative.failure)}));
 assert.equal(disposeHits,1);assert.deepEqual(stable(afterDispose),stable(beforeDispose));assert.deepEqual(sizes,[2,1,1]);assert.equal(f.backend.physical(),3);f.quiet();assert.equal(disposed.error,'STALE_BASE');
 t.diagnostic(JSON.stringify({variant,originalWorker:true,ACKAbort:failed.error,replayPhysical:2,disposeError:disposed.error,sizes,refs:3,generations:2,allCommitted:true,rollback:true,disposeRollback:true}));
});
