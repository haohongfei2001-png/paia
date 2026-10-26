import test from 'node:test';import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
// Load the original Library owner before its Organizer subclass (shared module cycle).
import '../core/library-documents-store.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {SavedWorkSyncJournal} from '../core/browser-native-sync/saved-work-journal.js';
import {prepareSavedWorkPublication,publishSavedWorkBootstrap} from '../core/browser-native-sync/saved-work-bootstrap.js';
import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {prepareGroupCheckpointPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
import {local,capture} from './harness/thought-m1.mjs';
globalThis.IDBKeyRange=IDBKeyRange;
const generator={providerId:'fixture',providerVersion:'1',modelVersion:'deterministic-1',taskSchemaVersion:1,promptTemplateVersion:1,policyVersion:1};
async function make(t,id){const s=new OrganizerStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();t.after(()=>s.repository.db?.close());return {s,core:new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-multiple-saved',deviceId:id})};}
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async k=>[k,await t.all(k)]))));
const cloud=()=>{const objects=new Map();return {async putImmutable(ref,raw){objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}};};
async function fixture(t){const a=await make(t,'synthetic-multi-A');a.s.humanLibraryJournal=new HumanLibrarySyncJournal(a.core);a.human=await a.s.createEntry({actor:'user',body:'SYNTHETIC independent human body',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});a.s.humanLibraryJournal=null;a.s.sourceBootstrapJournal=new SourceBootstrapJournal(a.core);await a.s.capture(capture((await a.s.status()).epoch));a.input=(await a.s.snapshot()).library.blocks[0];a.ids=[];a.anchors=[];
 for(let i=0;i<1;i++){const evidence=await a.s.evidenceFor([{inputId:a.input.id,role:'primary',selectedFields:['body']}]),entry=await a.s.createEntry({actor:'ai',operationId:crypto.randomUUID(),body:'SYNTHETIC AI artifact '+i,type:'idea',formation:'explicit',evidence,generator});a.ids.push(entry.id);await a.s.editEntry({id:entry.id,expectedRevision:0,operationId:crypto.randomUUID(),changes:{body:'SYNTHETIC protected result '+i,note:'SYNTHETIC personal note '+i}});a.anchors.push(await publishSavedWorkBootstrap(a.s,await prepareSavedWorkPublication(a.s,a.core,entry.id)));}
 const transport=cloud(),cut=await buildCheckpoint(a.core,transport,{grouped:{store:a.s}});return {a,transport,cut};}
async function restore(t,data,id,checkpoint=async()=>{}){const b=await make(t,id),owner=new StagedSyncRestore(b.core,{grouped:{store:b.s},checkpoint});await owner.stageCheckpoint(data.cut.ref,r=>data.transport.get(r));return {...b,owner};}

import {OrganizerStore} from '../core/organizer/store.js';
import {AIUsageFoundation} from '../core/ai-usage/foundation.js';
async function resident(t,{kind='planned',related=true,checkpoint=async()=>{},steps=1}={}){
 const data=await fixture(t),b=await restore(t,data,'synthetic-resident-B');await b.owner.activate();
 b.s.humanLibraryJournal=new SavedWorkSyncJournal(b.core);data.a.s.humanLibraryJournal=new SavedWorkSyncJournal(data.a.core);
 const ai=new AIUsageFoundation(b.s,{qualifyMaintenanceEntries:async(_t,r)=>r.coverage,committers:{context:async(_t,r)=>({committed:true,coverage:r.units})},resolveAuthority:async(_t,r)=>({allowed:true,principalId:'synthetic',libraryId:'synthetic',consentEpoch:'synthetic',jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}})});
 const items=(await ai.collect()).items.filter(i=>i.descriptor.entityId===(related?data.a.ids[0]:data.a.human.id));assert.equal(items.length,1);
 const coverage=items.map(i=>({key:i.key,facet:'context',scope:'synthetic'})),job=await ai.plan({type:'AI_MAINTENANCE',intent:'maintenance',items,coverage,contractVersion:'synthetic',routeVersion:'synthetic'});
 let calls=0;
 if(kind==='committed')await ai.resolveLocal(job.id,{facet:'context',units:coverage});
 else if(kind!=='planned'){
  await ai.reserve(job.id,{reservationId:'synthetic'});
  if(kind!=='reserved')await ai.dispatch(job.id,job.childIds[0],{describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async()=>{calls++;if(kind==='unknown')throw Error('SYNTHETIC interrupted');return {accepted:true,operationReceiptId:'synthetic'};}});
  // This preexisting synthetic settled receipt is a preservation fixture, not
  // proof of real provider payment or authorization to create a settlement.
  if(kind==='settled')await b.s.foundationWrite(async tx=>{const row=await tx.get('organizerUsage','aiu:attempt:'+job.childIds[0]);await tx.put('organizerUsage',{...row,financialSettlement:{state:'SETTLED',receiptId:'SYNTHETIC paid receipt',settledSpendMicros:19},spendState:'SETTLED_SERVICE'});});
 }
 for(let index=0;index<steps;index++)await data.a.s.editEntry({id:data.a.ids[0],expectedRevision:1+index,operationId:crypto.randomUUID(),changes:{title:'SYNTHETIC remote Saved successor '+index}});
 const cut=await buildCheckpoint(data.a.core,data.transport,{grouped:{store:data.a.s}}),owner=new StagedSyncRestore(b.core,{grouped:{store:b.s},checkpoint});await owner.stageCheckpoint(cut.ref,r=>data.transport.get(r));
 return {...data,b,ai,job,owner,get calls(){return calls;},cut};
}
const rows=(s,table)=>s.repository.transaction(false,tx=>tx.all(table));
for(const kind of ['planned','reserved','responded','unknown','settled','committed'])test('existing mixed Saved receive preserves original '+kind+' resident job semantics',async t=>{
 const f=await resident(t,{kind}),before=await f.ai.status(f.job.id),usage=await rows(f.b.s,'organizerUsage'),jobs=await rows(f.b.s,'organizerJobs'),acks=await rows(f.b.s,'organizerWorkItems');
 assert.equal((await f.owner.activate()).merged,true);const after=await f.ai.status(f.job.id),expected={planned:'CANCELLED_BEFORE_DISPATCH',reserved:'CANCELLED_BEFORE_DISPATCH',responded:'EXPIRED_UNCOMMITTED',unknown:'OUTCOME_UNKNOWN',settled:'EXPIRED_UNCOMMITTED',committed:'COMMITTED'};
 assert.equal(after.state,expected[kind]);assert.deepEqual(await rows(f.b.s,'organizerWorkItems'),acks);
 if(kind==='committed'){assert.deepEqual(await rows(f.b.s,'organizerJobs'),jobs);assert.deepEqual(after,before);assert.deepEqual(await rows(f.b.s,'organizerUsage'),usage);}
 if(['responded','unknown','settled'].includes(kind)){assert.equal(after.attempts[0].attemptCount,1);assert.equal(after.attempts[0].spendState,kind==='settled'?'SETTLED_SERVICE':'RESERVATION_RETAINED');assert.equal(f.calls,1);}
 if(kind==='settled')assert.deepEqual(after.attempts[0].financialSettlement,before.attempts[0].financialSettlement);
 if(kind==='reserved'){assert.equal(after.attempts[0].attemptCount,0);assert.equal(after.attempts[0].spendState,'RELEASED_BEFORE_DISPATCH');assert.equal(f.calls,0);}
 assert.equal((await f.b.s.entry(f.a.ids[0])).title,'SYNTHETIC remote Saved successor 0');assert.equal((await f.b.s.entry(f.a.human.id)).body,'SYNTHETIC independent human body');
 const settled=await snapshot(f.b.s);await f.owner.activate();assert.deepEqual(await snapshot(f.b.s),settled);
});
test('unrelated resident job is retained byte-for-byte across a Saved receive',async t=>{const f=await resident(t,{related:false}),before=await f.ai.status(f.job.id);await f.owner.activate();assert.deepEqual(await f.ai.status(f.job.id),before);});
test('unknown resident receipt is cancelled only once across two incoming Saved successors',async t=>{const f=await resident(t,{kind:'unknown',steps:2});await f.owner.activate();assert.equal((await f.ai.status(f.job.id)).cancelEpoch,1);assert.equal((await f.ai.status(f.job.id)).attempts[0].attemptCount,1);assert.equal((await f.b.s.entry(f.a.ids[0])).revision,3);});
test('missing receipt behind an original dispatch fence stays unknown without fabricated refund',async t=>{const f=await resident(t);await f.b.s.foundationWrite(tx=>tx.put('meta',{id:'aiu:dispatched:'+f.job.childIds[0],version:1,jobId:f.job.id,childId:f.job.childIds[0]}));const before=await f.ai.status(f.job.id);await f.owner.activate();assert.deepEqual(await f.ai.status(f.job.id),before);});
const rawPut=(tx,table,row)=>new Promise((resolve,reject)=>{const q=tx.tx.objectStore(table).put(row);q.onsuccess=resolve;q.onerror=reject;});
for(const table of ['organizerJobs','organizerUsage','organizerWorkItems'])test('final raw '+table+' drift aborts the Saved edit and its local financial state',async t=>{
 let injected=false;const f=await resident(t,{kind:'unknown',checkpoint:async(name,tx)=>{if(name!=='after-saved-step-commit')return;const put=tx.put.bind(tx);tx.put=async(tableName,row,...args)=>{const result=await put(tableName,row,...args);if(!injected&&tableName==='meta'&&row.id==='backup-data-generation'){const original=(await tx.all(table))[0];await rawPut(tx,table,original?{...original,unexpected:'SYNTHETIC tamper'}:{id:'SYNTHETIC injected ACK',state:'ACKNOWLEDGED'});injected=true;}return result;};}}),before=await snapshot(f.b.s);
 await assert.rejects(f.owner.activate());assert.equal(injected,true);assert.deepEqual(await snapshot(f.b.s),before);
});
test('a storage abort rolls back canonical, job, usage and stage then explicit retry commits once',async t=>{let stop=true;const f=await resident(t,{kind:'reserved',checkpoint:async name=>{if(name==='before-saved-step-commit'&&stop)throw Error('SYNTHETIC abort');}}),before=await snapshot(f.b.s);await assert.rejects(f.owner.activate());assert.deepEqual(await snapshot(f.b.s),before);stop=false;await f.owner.activate();assert.equal((await f.ai.status(f.job.id)).cancelEpoch,1);});

import {prepareGroupScope,requireGroupScope} from '../core/browser-native-sync/group-checkpoint-scope.js';
import {prepareSavedMixedRetention,requireSavedMixedResidentRetention} from '../core/browser-native-sync/saved-work-bootstrap.js';
async function scopeFor(f){const operations=[];for await(const row of f.b.core.rows('revision'))operations.push(row.operation);const plan=await prepareGroupCheckpointPlan(f.b.core,operations);return prepareGroupScope(plan,{store:f.b.s});}
test('plain scope and checkpoint export cannot admit resident jobs without the private merge proof',async t=>{const f=await resident(t),scope=await scopeFor(f),before=await snapshot(f.b.s);await assert.rejects(f.b.s.foundationWrite(tx=>requireGroupScope(f.b.s,tx,scope)));await assert.rejects(buildCheckpoint(f.b.core,f.transport,{grouped:{store:f.b.s}}));assert.deepEqual(await snapshot(f.b.s),before);});
test('a forged resident proof is refused and a genuine unsealed proof cannot commit',async t=>{const f=await resident(t),scope=await scopeFor(f),before=await snapshot(f.b.s);await assert.rejects(f.b.s.foundationWrite(tx=>requireGroupScope(f.b.s,tx,scope,{})));await assert.rejects(f.b.s.foundationWrite(async tx=>{const cap=await prepareSavedMixedRetention(f.b.s,f.b.core,tx,scope,null,f.owner.stage);await requireGroupScope(f.b.s,tx,scope,cap);}));assert.deepEqual(await snapshot(f.b.s),before);});
test('a resident proof cannot qualify a different scope identity in its same transaction',async t=>{const f=await resident(t),scope=await scopeFor(f),other=await scopeFor(f);let checked=false;await assert.rejects(f.b.s.foundationWrite(async tx=>{const cap=await prepareSavedMixedRetention(f.b.s,f.b.core,tx,scope,null,f.owner.stage);assert.throws(()=>requireSavedMixedResidentRetention(f.b.s,tx,other,cap));checked=true;}));assert.equal(checked,true);});

test('101 active resident jobs retain the original bounded invalidator and stale dispatch refusal',async t=>{const f=await resident(t),job=(await rows(f.b.s,'organizerJobs'))[0];await f.b.s.foundationWrite(async tx=>{for(let index=0;index<100;index++)await tx.put('organizerJobs',{...job,id:'SYNTHETIC overflow '+index,dedupeKey:'SYNTHETIC '+index});});const before=await rows(f.b.s,'organizerJobs');await f.owner.activate();assert.deepEqual(await rows(f.b.s,'organizerJobs'),before);await assert.rejects(f.ai.reserve(f.job.id,{reservationId:'synthetic'}),e=>e.code==='CANCELLED');});
test('failure in the real invalidator put rolls back the original Saved receive, not only its projection',async t=>{let reached=false;const f=await resident(t,{kind:'reserved',checkpoint:async(name,tx)=>{if(name!=='after-saved-step-commit')return;const put=tx.put.bind(tx);tx.put=async(table,row,...rest)=>{if(table==='organizerJobs'&&row.cancelEpoch>0){reached=true;throw Error('SYNTHETIC actual invalidation write failed');}return put(table,row,...rest);};}}),before=await snapshot(f.b.s);await assert.rejects(f.owner.activate());assert.equal(reached,true);assert.deepEqual(await snapshot(f.b.s),before);});
