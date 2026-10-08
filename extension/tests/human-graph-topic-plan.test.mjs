import test from 'node:test';import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {humanPlanEntry,prepareHumanTopicPlan,humanTopicPlan,requireHumanTopicPlan} from '../core/browser-native-sync/human-library-plan.js';
import {beginHumanAllocation,finishHumanAllocation,releaseHumanAllocation,humanClock} from '../core/browser-native-sync/human-library-allocation.js';
globalThis.IDBKeyRange=IDBKeyRange;
async function fixture(){let tick=0;const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString()});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-human-plan',deviceId:'synthetic-owner'});return {s,core};}
test('private Topic plan exactly predicts the actual existing owner rows, ordered history times and receipt',async()=>{
 const {s,core}=await fixture(),request={name:'SYNTHETIC planned Topic',operationId:crypto.randomUUID()},entry=await humanPlanEntry(s,core),cap=await prepareHumanTopicPlan(s,core,request,entry),expected=humanTopicPlan(cap);
 const original=s.foundationWrite.bind(s);let first=true;
 // Test instrumentation enters the real owner's transaction; it does not
 // substitute a reducer, repository, clock or UUID implementation.
 s.foundationWrite=fn=>original(async t=>{if(!first)return fn(t);first=false;const allocation=await requireHumanTopicPlan(t,cap,s,core);beginHumanAllocation(t,allocation);const active=new WeakSet([t]);s.humanLibraryJournal={pruneTime:tx=>active.has(tx)?humanClock(s,tx):null};try{const result=await fn(t);finishHumanAllocation(t,allocation);return result;}finally{active.delete(t);releaseHumanAllocation(t);}});
 const result=await s.createTopic(request);assert.deepEqual(result,expected.result);
 const actual=await s.repository.transaction(false,async t=>({topic:await t.get('topics',result.id),section:await t.get('sections',expected.section.id),history:await t.all('revisions'),operationReceipt:await t.get('operationReceipts',request.operationId)}));
 assert.deepEqual(actual.topic,expected.topic);assert.deepEqual(actual.section,expected.section);assert.deepEqual(actual.history.sort((a,b)=>a.sequence-b.sequence),expected.history);assert.deepEqual(actual.operationReceipt,expected.operationReceipt);
});
test('private Topic plan rechecks actual restore and sequence authority before any owner writes',async()=>{
 const {s,core}=await fixture(),request={name:'SYNTHETIC stale plan',operationId:crypto.randomUUID()},cap=await prepareHumanTopicPlan(s,core,request,await humanPlanEntry(s,core));
 await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'synthetic-restore'}));
 await assert.rejects(core.transaction(true,t=>requireHumanTopicPlan(t,cap,s,core)),{code:'BNS_HUMAN_CHANGED'});assert.equal(await s.repository.transaction(false,t=>t.count('topics')),0);
 await assert.rejects(core.transaction(true,t=>requireHumanTopicPlan(t,{},s,core)),{code:'BNS_HUMAN_PLAN_REQUIRED'});
});
test('prepared new Topic refuses a newly appearing read index before consuming slots or writing canonical rows',async()=>{
 const {s,core}=await fixture(),request={name:'SYNTHETIC index read-set',operationId:crypto.randomUUID()},cap=await prepareHumanTopicPlan(s,core,request,await humanPlanEntry(s,core)),planned=humanTopicPlan(cap);
 await s.repository.transaction(true,t=>t.put('meta',{id:'thought-read-index:v1:topic:'+planned.topic.id,version:6,activeKey:null,buildingKey:null}));
 await assert.rejects(core.transaction(true,t=>requireHumanTopicPlan(t,cap,s,core)),{code:'BNS_HUMAN_CHANGED'});assert.equal(await s.repository.transaction(false,t=>t.count('topics')),0);
});
import {prepareHumanEntryPlan,humanEntryPlan,requireHumanEntryPlan} from '../core/browser-native-sync/human-library-plan.js';
test('independent Entry plan consumes the real empty-provenance generation slot and predicts original owner history',async()=>{
 const {s,core}=await fixture(),request={actor:'user',body:'SYNTHETIC body',title:'SYNTHETIC title',note:'SYNTHETIC note',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()},cap=await prepareHumanEntryPlan(s,core,request,await humanPlanEntry(s,core)),expected=humanEntryPlan(cap),original=s.foundationWrite.bind(s);let first=true;
 s.foundationWrite=fn=>original(async t=>{if(!first)return fn(t);first=false;const allocation=await requireHumanEntryPlan(t,cap,s,core);beginHumanAllocation(t,allocation);const active=new WeakSet([t]);s.humanLibraryJournal={pruneTime:tx=>active.has(tx)?humanClock(s,tx):null};try{const result=await fn(t);finishHumanAllocation(t,allocation);return result;}finally{active.delete(t);releaseHumanAllocation(t);}});
 assert.deepEqual(await s.createEntry(request),expected.result);const actual=await s.repository.transaction(false,async t=>({entry:await t.get('thoughts',expected.result.id),history:await t.all('revisions'),operationReceipt:await t.get('operationReceipts',request.operationId)}));assert.deepEqual(actual.entry,expected.entry);assert.deepEqual(actual.history,expected.history);assert.deepEqual(actual.operationReceipt,expected.operationReceipt);
});
import {prepareHumanEntryEditPlan,humanEntryEditPlan,requireHumanEntryEditPlan} from '../core/browser-native-sync/human-library-plan.js';
test('actual independent edit and same-window coalescing consume the exact private plan without replacing the domain writer',async()=>{
 const {s,core}=await fixture(),created=await s.createEntry({actor:'user',body:'SYNTHETIC first',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()}),original=s.foundationWrite.bind(s);let revision=0,previousHistoryId=null;
 for(const body of ['SYNTHETIC second','SYNTHETIC third','SYNTHETIC third']){
  const request={id:created.id,expectedRevision:revision,changes:{body},operationId:crypto.randomUUID()},cap=await prepareHumanEntryEditPlan(s,core,request,await humanPlanEntry(s,core)),expected=humanEntryEditPlan(cap);let first=true;
  s.foundationWrite=fn=>original(async t=>{if(!first)return fn(t);first=false;const allocation=await requireHumanEntryEditPlan(t,cap,s,core);beginHumanAllocation(t,allocation);const active=new WeakSet([t]);s.humanLibraryJournal={pruneTime:tx=>active.has(tx)?humanClock(s,tx):null};try{const result=await fn(t);finishHumanAllocation(t,allocation);return result;}finally{active.delete(t);releaseHumanAllocation(t);}});
  const result=await s.editEntry(request);revision=result.revision;assert.deepEqual(result,expected.result);const actual=await s.repository.transaction(false,async t=>({entry:await t.get('thoughts',created.id),history:await t.all('revisions'),operationReceipt:await t.get('operationReceipts',request.operationId)}));assert.deepEqual(actual.entry,expected.entry);assert.deepEqual(actual.history.sort((a,b)=>a.sequence-b.sequence),expected.history);assert.deepEqual(actual.operationReceipt,expected.operationReceipt);const id=actual.history.at(-1).id;if(previousHistoryId)assert.equal(id,previousHistoryId);previousHistoryId=id;
 }
});
test('private edit refuses unrepresented history retirement before any canonical change',async()=>{
 const {s,core}=await fixture(),created=await s.createEntry({actor:'user',body:'SYNTHETIC first',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});await s.editEntry({id:created.id,expectedRevision:0,changes:{body:'SYNTHETIC second'},operationId:crypto.randomUUID()});
 await s.repository.transaction(true,async t=>{for(const row of await t.all('revisions'))if(!row.important){row.at='2000-01-01T00:00:00.000Z';await t.put('revisions',row);}});
 const snapshot=()=>s.repository.transaction(false,async t=>({rows:await t.all('thoughts'),history:await t.all('revisions'),receipts:await t.all('operationReceipts')})),before=await snapshot();
 await assert.rejects(prepareHumanEntryEditPlan(s,core,{id:created.id,expectedRevision:1,changes:{note:'SYNTHETIC different field'},operationId:crypto.randomUUID()},await humanPlanEntry(s,core)),{code:'BNS_HUMAN_HISTORY_RETIREMENT_UNAVAILABLE'});assert.deepEqual(await snapshot(),before);
});
import {executeHumanPlan} from '../core/browser-native-sync/human-library-plan.js';
test('private execution enters the original real transaction and refuses reuse or forged plans',async()=>{
 const {s,core}=await fixture();for(const kind of ['topic','entry']){const request=kind==='topic'?{name:'SYNTHETIC executed Topic',operationId:crypto.randomUUID()}:{actor:'user',body:'SYNTHETIC executed Entry',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()},prepare=kind==='topic'?prepareHumanTopicPlan:prepareHumanEntryPlan,view=kind==='topic'?humanTopicPlan:humanEntryPlan,cap=await prepare(s,core,request,await humanPlanEntry(s,core)),expected=view(cap);assert.deepEqual(await executeHumanPlan(cap),expected.result);await assert.rejects(executeHumanPlan(cap),{code:'BNS_HUMAN_CHANGED'});}
 await assert.rejects(executeHumanPlan({}),{code:'BNS_HUMAN_PLAN_REQUIRED'});
});
import {prepareHumanEntryLifecyclePlan,humanEntryLifecyclePlan} from '../core/browser-native-sync/human-library-plan.js';
test('private removal and restoration execute original suppression/history owners and preserve five distinct field times',async()=>{
 const {s,core}=await fixture(),created=await s.createEntry({actor:'user',body:'SYNTHETIC lifecycle',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});let revision=0;
 for(const restore of [false,true]){const request={id:created.id,expectedRevision:revision,operationId:crypto.randomUUID()},cap=await prepareHumanEntryLifecyclePlan(s,core,request,await humanPlanEntry(s,core),{restore}),expected=humanEntryLifecyclePlan(cap);assert.deepEqual(await executeHumanPlan(cap),expected.result);revision=expected.result.revision;const actual=await s.repository.transaction(false,async t=>({entry:await t.get('thoughts',created.id),suppressions:await t.all('thoughtSuppressions'),history:await t.all('revisions')}));assert.deepEqual(actual.entry,expected.entry);assert.deepEqual(actual.suppressions,expected.suppressions);assert.deepEqual(actual.history.sort((a,b)=>a.sequence-b.sequence),expected.history);if(restore)assert.equal(new Set(['title','body','note','type','formation'].map(f=>actual.entry.protections[f].at)).size,5);}
});
import {prepareHumanSectionPlan,humanSectionPlan} from '../core/browser-native-sync/human-library-plan.js';
test('named Section plan preserves actual rank/default section and existing-index allocation',async()=>{
 const {s,core}=await fixture(),q=await s.createTopic({name:'SYNTHETIC Section owner',operationId:crypto.randomUUID()});
 await s.repository.transaction(true,t=>t.put('meta',{id:'thought-read-index:v1:topic:'+q.id,version:6,activeKey:null,buildingKey:null,timeRevision:0}));
 const request={topicId:q.id,expectedTopicRevision:0,title:'SYNTHETIC named',operationId:crypto.randomUUID()},cap=await prepareHumanSectionPlan(s,core,request,await humanPlanEntry(s,core)),expected=humanSectionPlan(cap);assert.deepEqual(await executeHumanPlan(cap),expected.result);const data=await s.repository.transaction(false,async t=>({topic:await t.get('topics',q.id),section:await t.get('sections',expected.section.id),sections:await t.all('sections')}));assert.deepEqual(data.topic,expected.topic);assert.deepEqual(data.section,expected.section);assert.equal(data.sections.filter(x=>x.isDefault).length,1);assert.equal(data.topic.defaultSectionId,q.sectionId);
});
