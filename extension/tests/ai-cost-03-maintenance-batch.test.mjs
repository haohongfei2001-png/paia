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
