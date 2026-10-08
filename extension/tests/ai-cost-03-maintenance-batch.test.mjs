import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,capture,inputEdit} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {AIUsageFoundation} from '../core/ai-usage/foundation.js';
import {readMaintenanceBatch} from '../core/ai-usage/maintenance-batch.js';
import {DIRTY_PREFIX} from '../core/ai-usage/delta.js';
const options={scope:'synthetic-scope',contractVersion:'synthetic-contract',routeVersion:'synthetic-route'};
async function fixture(count=1){
 const f=await setup(OrganizerStore);for(let n=1;n<count;n++)await f.s.capture(capture((await f.s.status()).epoch,'synthetic-'+n,'Synthetic independent Input '+n));
 const permission={allowed:true,principalId:'synthetic-person',libraryId:'synthetic-library',consentEpoch:'synthetic-consent',jobTypes:['AI_MAINTENANCE']};
 const ai=new AIUsageFoundation(f.s,{resolveAuthority:async(_t,r)=>({...permission,scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),committers:{topic:async(_t,r)=>({committed:true,coverage:r.units}),context:async(_t,r)=>({committed:true,coverage:r.units})}});
 await f.s.finishFoundation();return {...f,ai,permission};
}
const read=f=>readMaintenanceBatch(f.ai,options);
async function dispatchFixture(f,job){await f.ai.reserve(job.id,{reservationId:'synthetic-parent'});for(const id of job.childIds)await f.ai.dispatch(job.id,id,{describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async()=>({accepted:true,operationReceiptId:'synthetic:'+id})});}
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(['meta','organizerJobs','organizerWorkItems','organizerUsage'].map(async n=>[n,await t.all(n)]))));
test('37 actual Inputs form one existing plan with 74 exact units and at most two maintenance children',async()=>{
 const f=await fixture(37),before=await snapshot(f.s),r=await read(f);assert.equal(r.status,'CANDIDATE_ONLY');assert.equal(r.request.items.length,37);assert.equal(r.request.coverage.length,74);assert.equal(r.request.children.length,2);assert.equal(r.dispatchAllowed,false);assert.equal(r.financialAuthority,false);assert.deepEqual(await snapshot(f.s),before);
 assert.doesNotMatch(JSON.stringify(r),/Synthetic independent Input|originalText|libraryText/);
 const job=await f.ai.plan(r.request);assert.equal(job.state,'PLANNED');assert.equal(job.childIds.length,2);assert.deepEqual(await f.ai.plan(r.request),job);assert.equal((await f.ai.status(job.id)).attempts.length,0);
});
test('bounded page preserves exact continuation and never reports backlog completed',async()=>{const f=await fixture(38),a=await read(f);assert.equal(a.complete,false);assert.ok(a.nextCursor.startsWith(DIRTY_PREFIX));const b=await readMaintenanceBatch(f.ai,{...options,cursor:a.nextCursor});assert.equal(b.complete,true);assert.equal(b.request.items.length,1);assert.equal(a.request.items.some(x=>x.key===b.request.items[0].key),false);});
test('actual ACK excludes resolved facet while preserving incomplete coverage',async()=>{const f=await fixture(),r=await read(f),job=await f.ai.plan(r.request);await f.ai.resolveLocal(job.id,{facet:'topic',units:r.request.coverage.filter(u=>u.facet==='topic')});const next=await read(f);assert.equal(next.request.coverage.length,1);assert.equal(next.request.coverage[0].facet,'context');});
test('actual opaque DEFER blocks same signature without guessing retry time; changed evidence can be reconsidered',async()=>{const f=await fixture(),r=await read(f),job=await f.ai.plan(r.request);await dispatchFixture(f,job);for(const facet of ['topic','context'])await f.ai.commitFacet(job.id,job.childIds[0],{facet,units:r.request.coverage.filter(u=>u.facet===facet),outcome:'DEFER',retryCondition:'synthetic-needs-context'});
 // Raw collect still correctly retains work: it is not itself a retry planner.
 assert.equal((await f.ai.collect()).items.length,1);const next=await read(f);assert.equal(next.status,'DEFERRED');assert.equal(next.blockedUnits,2);assert.equal(next.request,undefined);
 await inputEdit(f.s,r.request.items[0].descriptor.entityId,{libraryText:'Synthetic genuinely changed evidence'});assert.equal((await read(f)).status,'CANDIDATE_ONLY');
});
test('fully local resolved work yields no candidate or attempt',async()=>{const f=await fixture(),r=await read(f),job=await f.ai.plan(r.request);for(const facet of ['topic','context'])await f.ai.resolveLocal(job.id,{facet,units:r.request.coverage.filter(u=>u.facet===facet)});assert.equal((await read(f)).status,'NO_DELTA');assert.equal((await f.ai.status(job.id)).attempts.every(a=>a.attemptCount===0),true);});
test('missing authority rejects and stale candidate is rechecked by actual plan',async()=>{const f=await fixture();await assert.rejects(readMaintenanceBatch(f.s.aiUsageFoundation,options),e=>e.code==='UNAVAILABLE');const r=await read(f);await inputEdit(f.s,r.request.items[0].descriptor.entityId,{libraryText:'Synthetic replacement'});await assert.rejects(f.ai.plan(r.request),e=>e.code==='STALE_BASE');});
test('caller cannot select another job type, timestamp, quota or unsafe size',async()=>{const f=await fixture();for(const extra of [{type:'AI_ASSIST'},{now:99},{windowId:'fake'},{limit:51},{cursor:'other'}])await assert.rejects(readMaintenanceBatch(f.ai,{...options,...extra}),e=>e.code==='INVALID_REQUEST');});
test('filter-only pending work cannot create its own maintenance call',async()=>{const f=await fixture();await f.s.foundationWrite(async t=>{for(const row of await t.all('meta'))if(row.id.startsWith(DIRTY_PREFIX))await t.put('meta',{...row,pendingFacets:['filter']});});const r=await read(f);assert.equal(r.status,'DEFERRED');assert.equal(r.reason,'FILTER_REQUIRES_MAINTENANCE');});
test('total facet bound refuses rather than silently dropping work',async()=>{const f=await fixture(37);await f.s.foundationWrite(async t=>{for(const row of await t.all('meta'))if(row.id.startsWith(DIRTY_PREFIX))await t.put('meta',{...row,pendingFacets:['topic','context','filter']});});assert.equal((await read(f)).reason,'COVERAGE_BOUND');});
test('too many existing DEFER records fails closed without guessing absence',async()=>{const f=await fixture();await f.s.foundationWrite(async t=>{for(let i=0;i<101;i++)await t.put('organizerWorkItems',{id:'aiu:defer:synthetic-'+i,kind:'ai_usage_v1',state:'DEFERRED'});});const before=await snapshot(f.s);assert.equal((await read(f)).reason,'DEFER_SCAN_BOUND');assert.deepEqual(await snapshot(f.s),before);});
test('legal DEFER history from changed Input signatures cannot permanently block current maintenance',async()=>{
 const f=await fixture();let last;
 for(let n=0;n<51;n++){
  const batch=await read(f);assert.equal(batch.status,'CANDIDATE_ONLY','legal cycle '+n);last=batch.request.items[0];
  const job=await f.ai.plan(batch.request);await dispatchFixture(f,job);
  for(const facet of ['topic','context'])await f.ai.commitFacet(job.id,job.childIds[0],{facet,units:batch.request.coverage.filter(u=>u.facet===facet),outcome:'DEFER',retryCondition:'synthetic-needs-context'});
  await inputEdit(f.s,last.descriptor.entityId,{libraryText:'Synthetic changed signature '+n});
 }
 const before=await snapshot(f.s);assert.equal(before.organizerWorkItems.filter(r=>r.id.startsWith('aiu:defer:')).length,102);
 const batch=await read(f);assert.equal(batch.status,'CANDIDATE_ONLY');assert.equal(batch.request.items.length,1);assert.notEqual(batch.request.items[0].signature,last.signature);
 const after=await snapshot(f.s);for(const store of ['meta','organizerJobs','organizerUsage'])assert.deepEqual(after[store],before[store]);assert.deepEqual(batch.cleanup,{scanned:100,archived:100,nextCursor:before.organizerWorkItems.filter(x=>x.id.startsWith('aiu:defer:')).sort((a,b)=>a.id<b.id?-1:1)[99].id});
 const histories=after.organizerWorkItems.filter(x=>x.id.startsWith('aiu:defer-history:'));assert.equal(histories.length,100);for(const {id,originalId,...fields}of histories)assert.deepEqual({...fields,id:originalId},before.organizerWorkItems.find(x=>x.id===originalId));
 assert.equal(batch.dispatchAllowed,false);assert.equal(batch.financialAuthority,false);
});
async function deferredFixture(){const f=await fixture(),batch=await read(f),job=await f.ai.plan(batch.request);await dispatchFixture(f,job);for(const facet of ['topic','context'])await f.ai.commitFacet(job.id,job.childIds[0],{facet,units:batch.request.coverage.filter(u=>u.facet===facet),outcome:'DEFER',retryCondition:'synthetic-needs-context'});return {...f,batch,job};}
test('same-signature opaque DEFER remains active; exact actual ACK can archive it without losing evidence',async()=>{
 const f=await deferredFixture(),before=await snapshot(f.s);assert.deepEqual(await f.ai.archiveObsoleteDeferred(),{scanned:2,archived:0,nextCursor:null});assert.deepEqual(await snapshot(f.s),before);
 await f.ai.commitFacet(f.job.id,f.job.childIds[0],{facet:'topic',units:f.batch.request.coverage.filter(u=>u.facet==='topic'),outcome:'NO_CHANGE'});
 const acked=await snapshot(f.s),r=await f.ai.archiveObsoleteDeferred();assert.equal(r.archived,1);const after=await snapshot(f.s);assert.deepEqual(after.organizerJobs,acked.organizerJobs);assert.deepEqual(after.organizerUsage,acked.organizerUsage);const historical=after.organizerWorkItems.find(x=>x.id.startsWith('aiu:defer-history:'));const {originalId,id,...fields}=historical;assert.deepEqual({...fields,id:originalId},before.organizerWorkItems.find(x=>x.id===originalId));assert.equal(after.organizerWorkItems.filter(x=>x.id.startsWith('aiu:defer:')).length,1);
});
test('missing KNOWN row is not proof that DEFER is obsolete',async()=>{const f=await deferredFixture();await f.s.foundationWrite(t=>t.delete('meta','aiu:delta:known:'+f.batch.request.items[0].key));const before=await snapshot(f.s);assert.equal((await f.ai.archiveObsoleteDeferred()).archived,0);assert.deepEqual(await snapshot(f.s),before);});
test('actual removed Input archives its prior DEFER without altering job or receipt',async()=>{const f=await deferredFixture();await inputEdit(f.s,f.batch.request.items[0].descriptor.entityId,{excluded:true});const before=await snapshot(f.s);assert.equal((await f.ai.archiveObsoleteDeferred()).archived,2);const after=await snapshot(f.s);assert.deepEqual(after.organizerJobs,before.organizerJobs);assert.deepEqual(after.organizerUsage,before.organizerUsage);});
test('history move and active-prefix removal roll back as one transaction',async()=>{
 const f=await deferredFixture();await inputEdit(f.s,f.batch.request.items[0].descriptor.entityId,{libraryText:'Synthetic changed before rollback'});const before=await snapshot(f.s),write=f.ai.write.bind(f.ai);let deletes=0;
 f.ai.write=fn=>write(t=>fn(new Proxy(t,{get(target,key){if(key==='delete')return async(...args)=>{await target.delete(...args);if(++deletes===2)throw Error('synthetic transaction abort');};const value=target[key];return typeof value==='function'?value.bind(target):value;}})));
 await assert.rejects(f.ai.archiveObsoleteDeferred(),e=>e.code==='STORAGE_FAILED');assert.equal(deletes,2);assert.deepEqual(await snapshot(f.s),before);
});
test('malformed record aborts whole archival page instead of silently skipping unknown evidence',async()=>{
 const f=await deferredFixture();await inputEdit(f.s,f.batch.request.items[0].descriptor.entityId,{libraryText:'Synthetic changed before malformed row'});await f.s.foundationWrite(t=>t.put('organizerWorkItems',{id:'aiu:defer:zz-malformed',kind:'ai_usage_v1',state:'DEFERRED'}));const before=await snapshot(f.s);await assert.rejects(f.ai.archiveObsoleteDeferred(),e=>e.code==='DEFER_RECORD_INVALID');assert.deepEqual(await snapshot(f.s),before);
});
test('archival reads current signature in its own transaction rather than a caller snapshot',async()=>{const f=await deferredFixture(),write=f.ai.write.bind(f.ai);f.ai.write=async fn=>{await inputEdit(f.s,f.batch.request.items[0].descriptor.entityId,{libraryText:'Synthetic interleaved change before transaction'});return write(fn);};assert.equal((await f.ai.archiveObsoleteDeferred()).archived,2);});
test('one overflowing read archives at most one hundred and reports remaining bound without looping',async()=>{
 const f=await fixture(),first=await read(f),key=first.request.items[0].key;
 for(let n=0;n<102;n++){
  const {items}=await f.ai.describe({keys:[key]}),request={...first.request,items},job=await f.ai.plan(request);await dispatchFixture(f,job);
  for(const facet of ['topic','context'])await f.ai.commitFacet(job.id,job.childIds[0],{facet,units:request.coverage.filter(u=>u.facet===facet),outcome:'DEFER',retryCondition:'synthetic-needs-context'});
  await inputEdit(f.s,items[0].descriptor.entityId,{libraryText:'Synthetic bounded backlog '+n});
 }
 const r=await read(f);assert.equal(r.status,'UNAVAILABLE');assert.equal(r.reason,'DEFER_SCAN_BOUND');assert.equal(r.cleanup.scanned,100);assert.equal(r.cleanup.archived,100);
 const snapshotAfter=await snapshot(f.s);assert.equal(snapshotAfter.organizerWorkItems.filter(r=>r.id.startsWith('aiu:defer:')).length,104);assert.equal(snapshotAfter.organizerWorkItems.filter(r=>r.id.startsWith('aiu:defer-history:')).length,100);
 const next=await read(f);assert.equal(next.status,'CANDIDATE_ONLY');assert.equal(next.cleanup.archived,100);
});
