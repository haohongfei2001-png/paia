import test from 'node:test';import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {humanPlanEntry,prepareHumanTopicPlan,humanTopicPlan,requireHumanTopicPlan} from '../core/browser-native-sync/human-library-plan.js';
import {beginHumanAllocation,finishHumanAllocation,releaseHumanAllocation,humanClock} from '../core/browser-native-sync/human-library-allocation.js';
globalThis.IDBKeyRange=IDBKeyRange;
async function fixture(){let tick=0;const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString()});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-human-plan',deviceId:'synthetic-owner'});return {s,core};}
import {executeHumanPlan} from '../core/browser-native-sync/human-library-plan.js';
test('private move composes the original two placement owners atomically with both histories and exact touches',async()=>{
 const {prepareHumanMovePlan,humanMovePlan}=await import('../core/browser-native-sync/human-library-plan.js');
 const {s,core}=await fixture(),a=await s.createTopic({name:'SYNTHETIC move A',operationId:crypto.randomUUID()}),b=await s.createTopic({name:'SYNTHETIC move B',operationId:crypto.randomUUID()}),e=await s.createEntry({actor:'user',body:'SYNTHETIC moving',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});
 await s.placeEntry({entryId:e.id,topicId:a.id,expectedEntryRevision:0,expectedTopicRevision:0,operationId:crypto.randomUUID()});
 const request={entryId:e.id,sourceTopicId:a.id,targetTopicId:b.id,expectedEntryRevision:1,expectedSourceRevision:1,expectedTargetRevision:0,operationId:crypto.randomUUID()},cap=await prepareHumanMovePlan(s,core,request,await humanPlanEntry(s,core)),expected=humanMovePlan(cap);
 assert.deepEqual(await executeHumanPlan(cap),expected.result);const actual=await s.repository.transaction(false,async t=>({entry:await t.get('thoughts',e.id),topics:await t.all('topics'),placements:await t.all('placements'),history:await t.all('revisions')}));assert.deepEqual(actual.entry,expected.entry);for(const row of expected.topics)assert.deepEqual(actual.topics.find(x=>x.id===row.id),row);for(const row of expected.placements)assert.deepEqual(actual.placements.find(x=>x.id===row.id),row);for(const row of expected.history)assert.deepEqual(actual.history.find(x=>x.id===row.id),row);assert.deepEqual(actual.entry.organizationIntents.included,[b.id]);assert.deepEqual(actual.entry.organizationIntents.excluded,[a.id]);
});
test('prepared move rejects a changed target and rolls back a failure after both canonical placement writes',async()=>{
 const {prepareHumanMovePlan}=await import('../core/browser-native-sync/human-library-plan.js');
 const {ArchiveError}=await import('../core/constants.js');
 for(const mode of ['stale','rollback']){const {s,core}=await fixture(),a=await s.createTopic({name:'SYNTHETIC source',operationId:crypto.randomUUID()}),b=await s.createTopic({name:'SYNTHETIC target',operationId:crypto.randomUUID()}),e=await s.createEntry({actor:'user',body:'SYNTHETIC atomic move',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});await s.placeEntry({entryId:e.id,topicId:a.id,expectedEntryRevision:0,expectedTopicRevision:0,operationId:crypto.randomUUID()});const cap=await prepareHumanMovePlan(s,core,{entryId:e.id,sourceTopicId:a.id,targetTopicId:b.id,expectedEntryRevision:1,expectedSourceRevision:1,expectedTargetRevision:0,operationId:crypto.randomUUID()},await humanPlanEntry(s,core));
  if(mode==='stale')await s.repository.transaction(true,async t=>{const row=await t.get('topics',b.id);row.organizationRevision++;await t.put('topics',row);});
  const snapshot=()=>s.repository.transaction(false,async t=>({entries:await t.all('thoughts'),topics:await t.all('topics'),placements:await t.all('placements'),revisions:await t.all('revisions'),receipts:await t.all('operationReceipts'),meta:await t.all('meta')})),before=await snapshot();
  if(mode==='rollback'){const original=s.placeEntryInTransaction.bind(s);let calls=0;s.placeEntryInTransaction=async(t,r)=>{const result=await original(t,r);if(++calls===2)throw new ArchiveError('SYNTHETIC_MOVE_ROLLBACK');return result;};}
  await assert.rejects(executeHumanPlan(cap),{code:mode==='stale'?'BNS_HUMAN_CHANGED':'SYNTHETIC_MOVE_ROLLBACK'});assert.deepEqual(await snapshot(),before);
 }
});
