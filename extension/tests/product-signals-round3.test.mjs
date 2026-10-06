import test from 'node:test';
import assert from 'node:assert/strict';
import {LegacyUsageRecords} from '../core/legacy-usage-records.js';
import {assertFeatureAvailable} from '../core/feature-availability.js';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {backupMetaAllowed} from '../core/backup-format.js';
const ROW='product-signals:v1';
async function fixture(){const {s}=await setup(OrganizerStore);await s.finishFoundation();const row={id:ROW,version:1,enabled:true,daily:{'2020-01-01':{input_search:4},'2026-01-01':{context_build:2}}};await s.repository.transaction(true,t=>t.put('meta',row));return {s,row,service:new LegacyUsageRecords(s),read:()=>s.repository.transaction(false,t=>t.get('meta',ROW))};}

test('all historical product signal names and dimensions are refused before reading their payload',()=>{
 for(const name of ['context_build','context_share','input_search','input_target_open','reading_copy','thought_topic_open','thought_ai_view','thought_ai_edit','revisit_open','universal_result_open','unknown']){
  let reads=0;const request={type:'PAIA_PRODUCT_SIGNAL',get signal(){reads++;throw Error('private payload read');}};
  assert.throws(()=>assertFeatureAvailable(request),{code:'FEATURE_UNAVAILABLE'},name);assert.equal(reads,0);
 }
 assert.equal(backupMetaAllowed(ROW),false);
});

test('retired product signal status retains all old counters and never publishes analytics',async()=>{
 const f=await fixture();const writes=f.s.repository.metrics.writes;
 assert.deepEqual(await f.service.status(),{enabled:false,retired:true,hasHistory:true,legacyEnabled:true});
 assert.deepEqual(await f.read(),f.row);assert.equal(f.s.repository.metrics.writes,writes);
});

test('reading retired usage history does not prune sparse or old date buckets',async()=>{
 const f=await fixture();await f.service.status();await f.service.status();
 assert.deepEqual(await f.read(),f.row);assert.deepEqual(Object.keys((await f.read()).daily),['2020-01-01','2026-01-01']);
});

test('retired usage settings cannot enable collection and explicit opt-out changes only its existing flag',async()=>{
 const f=await fixture();for(const enabled of [true,undefined,null,1,'true'])await assert.rejects(f.service.settings({enabled}),{code:'FEATURE_UNAVAILABLE'});
 assert.deepEqual(await f.read(),f.row);await f.service.settings({enabled:false});assert.deepEqual(await f.read(),{...f.row,enabled:false});
 assert.deepEqual(await f.service.status(),{enabled:false,retired:true,hasHistory:true,legacyEnabled:false});
});

test('a fresh disabled usage status creates no timestamps, rows or counters',async()=>{
 const {s}=await setup(OrganizerStore);await s.finishFoundation();const service=new LegacyUsageRecords(s),before=s.repository.metrics.writes;
 assert.deepEqual(await service.status(),{enabled:false,retired:true,hasHistory:false,legacyEnabled:false});await service.settings({enabled:false});
 assert.equal(await s.repository.transaction(false,t=>t.get('meta',ROW)),undefined);assert.equal(s.repository.metrics.writes,before);
});
