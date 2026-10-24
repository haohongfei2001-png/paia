import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {ConsumerPreferenceSyncJournal} from '../core/browser-native-sync/consumer-preference-journal.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';
import {GroupedCheckpointRestore} from '../core/browser-native-sync/group-checkpoint.js';
import {prepareCurrentSourceWorkingGroupCheckpointPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
import {prepareGroupScope} from '../core/browser-native-sync/group-checkpoint-scope.js';
import {assertSourceWorkingDefaultMeta,assertSourceWorkingRestoredDefaultMeta} from '../core/browser-native-sync/source-working-default-meta.js';
import {PROMPT_INSERTION_RUNTIME,validatePromptInsertionRuntimeRow,validPromptInsertionEnvelope,promptInsertionEncoding} from '../core/prompt-insertion-runtime-format.js';
import {backupMetaAllowed,validateBackupItem} from '../core/backup-format.js';
import {existingSelectionFixture} from './harness/existing-application-selection.mjs';
import {OriginalApplicationGenerationSelection,APPLICATION_SELECTION_MARKER} from '../core/browser-native-sync/application-generation-selection.js';
globalThis.IDBKeyRange=IDBKeyRange;

// Bounded synthetic fixture adapted from default-memory-checkpoint. The normal
// grouped producer/restore executes here; native-current qualification is not
// fabricated from fake IndexedDB and remains a separate integration gate.
async function device(t,id){
 const s=new OrganizerStore(local(),{indexedDB:new IDBFactory(),name:'SYNTHETIC-receipt-local-'+crypto.randomUUID(),localPublicationTerminal:true});t.after(()=>s.repository.close());await s.consent(true);await s.finishFoundation();
 const core=new BrowserNativeSyncCore(s.repository,{datasetId:'SYNTHETIC_receipt_local',deviceId:id});s.consumerPreferenceJournal=new ConsumerPreferenceSyncJournal(core);s.sourceBootstrapJournal=new SourceBootstrapJournal(core);s.filterIntentJournal=new FilterIntentSyncJournal(core);s.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:s.filterIntentJournal,logicalCommits:true});return {s,core};
}
const metadata=(f,id)=>f.s.repository.transaction(false,t=>t.get('meta',id),['meta']);
const all=f=>f.s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(f.s.repository.stores.map(async n=>[n,await t.all(n)]))));
const put=(f,row)=>f.s.repository.transaction(true,t=>t.put('meta',row),['meta']);
const cloud=()=>{const objects=new Map();return {objects,async putImmutable(ref,data){objects.set(ref.id,data.slice());},async get(ref){return objects.get(ref.id)?.slice();}};};
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(promptInsertionEncoding(value)))),n=>n.toString(16).padStart(2,'0')).join('');
async function receipt(databaseId,restoreEpoch=null){
 const domainDigest=await digest({domain:'paia-prompt-insertion-source-v1',databaseId,restoreEpoch}),epochs=[{epoch:1,receiptEpoch:crypto.randomUUID(),state:'retired'},{epoch:2,receiptEpoch:crypto.randomUUID(),state:'open'}];
 const envelope=(epoch,domain=domainDigest)=>({version:1,claimId:crypto.randomUUID(),actionId:crypto.randomUUID(),operationId:crypto.randomUUID(),receiptEpoch:epochs[epoch-1].receiptEpoch,epoch,lane:epoch===1?'manual':'next',receiver:{tabId:1,windowId:2,documentId:'SYNTHETIC_document',nonce:crypto.randomUUID()},sourceDigest:'1'.repeat(64),authorizationDigest:'2'.repeat(64),initiatorDigest:'3'.repeat(64),domainDigest:domain,digest:'4'.repeat(64)});
 // Different historical domains can coexist after genuine local restoration.
 return {id:PROMPT_INSERTION_RUNTIME,version:1,databaseId,restoreEpoch,revision:4,nextEpoch:2,retiredEpochFloor:0,legacyCoverageUnknown:true,domainDigest,retiredRanges:[],epochs,claims:[{envelope:envelope(1),state:'pending'},{envelope:envelope(2,'5'.repeat(64)),state:'inserted'}]};
}
async function seed(f){await f.s.capture(capture((await f.s.status()).epoch));const input=(await f.s.snapshot()).library.blocks[0].id;await inputEdit(f.s,input,{note:'SYNTHETIC retained Working'});return input;}
async function restore(f,cut,remote){const owner=new GroupedCheckpointRestore(f.core,{store:f.s,restoreId:crypto.randomUUID()});await owner.stageCheckpoint(cut.ref,ref=>remote.get(ref));assert.equal((await owner.activate()).state,'activated');while(!(await owner.cleanup({limit:10})).complete){}return owner;}
const freeze=value=>{if(value&&typeof value==='object'){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;};
async function sourceView(f){const operations=[];for await(const row of f.core.rows('revision'))operations.push(row.operation);const plan=await prepareCurrentSourceWorkingGroupCheckpointPlan(f.core,operations),scope=await prepareGroupScope(plan);return {plan,scope,rows:freeze(await all(f)),control:freeze(structuredClone(f.s.controlCache)),databaseId:f.s.databaseId};}
const qualify=(f,v)=>assertSourceWorkingDefaultMeta(f.core,v.scope,v.plan,v.rows,v.control,v.databaseId);
const restoredQualify=(f,v)=>assertSourceWorkingRestoredDefaultMeta(f.core,v.scope,v.plan,v.rows,v.control,v.databaseId);
const noWire=(remote,rows)=>{for(const bytes of remote.objects.values()){const text=new TextDecoder().decode(bytes);for(const row of rows){assert.equal(text.includes(PROMPT_INSERTION_RUNTIME),false);assert.equal(text.includes(row.domainDigest),false);for(const claim of row.claims)assert.equal(text.includes(claim.envelope.operationId),false);}}};

test('original checkpoint A to initialized B to empty C preserves local receipt history without portable authority',async t=>{
 const a=await device(t,'SYNTHETIC_A'),b=await device(t,'SYNTHETIC_B'),remote=cloud();await seed(a);const baseline=await buildCheckpoint(a.core,remote,{grouped:{store:a.s}}),baselineObjects=remote.objects.size;
 const ar=await receipt(a.s.databaseId),br=await receipt(b.s.databaseId,'SYNTHETIC_prior_restore');await put(a,ar);await put(b,br);const view=await sourceView(a),before=await all(a);qualify(a,view);
 const cut=await buildCheckpoint(a.core,remote,{grouped:{store:a.s}});assert.deepEqual(cut.ref,baseline.ref);assert.equal(remote.objects.size,baselineObjects);assert.deepEqual(await all(a),before);noWire(remote,[ar,br]);await a.s.repository.close();
 await restore(b,cut,remote);assert.deepEqual(await metadata(b,PROMPT_INSERTION_RUNTIME),br);assert.notEqual((await metadata(b,'recovery-restore-epoch'))?.value??null,br.restoreEpoch);await restoredQualify(b,await sourceView(b));
 const next=await buildCheckpoint(b.core,remote,{grouped:{store:b.s}});assert.deepEqual(await metadata(b,PROMPT_INSERTION_RUNTIME),br);noWire(remote,[ar,br]);await b.s.repository.close();
 const c=await device(t,'SYNTHETIC_C');await restore(c,next,remote);assert.equal(await metadata(c,PROMPT_INSERTION_RUNTIME),undefined);assert.equal(await c.s.repository.transaction(false,t=>t.count('records')),1);
 const operations=[];for await(const row of c.core.rows('revision'))operations.push(row.operation);assert.equal(JSON.stringify(operations).includes(PROMPT_INSERTION_RUNTIME),false);assert.equal(JSON.stringify(operations).includes(ar.claims[0].envelope.operationId),false);
 assert.equal((await c.s.controlCache).memoryAccessPolicy.enabled,false);assert.equal(backupMetaAllowed(PROMPT_INSERTION_RUNTIME),false);assert.throws(()=>validateBackupItem({type:'item',section:'organizationState',value:{id:PROMPT_INSERTION_RUNTIME,data:ar}}),{code:'BACKUP_INVALID'});
});

const corruptions={future:r=>r.version=2,foreign:r=>r.databaseId='SYNTHETIC_foreign_database',body:r=>r.body='SYNTHETIC forbidden body',coverage:r=>r.legacyCoverageUnknown=false,missing:r=>delete r.restoreEpoch,epoch:r=>r.epochs[0].epoch=2,range:r=>r.retiredRanges.push({start:1,end:2}),claim:r=>r.claims[0].state='unknown',envelope:r=>r.claims[0].envelope.receiver.extra=true};
for(const [name,change]of Object.entries(corruptions))test('exact local receipt '+name+' refuses original ordinary publication and strict Source inventory without writes',async t=>{
 const f=await device(t,'SYNTHETIC_negative'),remote=cloud();await seed(f);const row=await receipt(f.s.databaseId);change(row);await put(f,row);const v=await sourceView(f),before=await all(f);
 assert.throws(()=>qualify(f,v),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'});await assert.rejects(buildCheckpoint(f.core,remote,{grouped:{store:f.s}}),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'});assert.equal(remote.objects.size,0);assert.deepEqual(await all(f),before);
});

test('strict Source inventory accepts only exact reserved key, never sibling prefixes or future key versions',async t=>{
 const f=await device(t,'SYNTHETIC_keys');await seed(f);const row=await receipt(f.s.databaseId);await put(f,row);const v=await sourceView(f);qualify(f,v);
 for(const key of [PROMPT_INSERTION_RUNTIME+':sibling','prompt-insertion-runtime:v2']){const bad={...v,rows:structuredClone(v.rows)};bad.rows.meta.push({...row,id:key});assert.throws(()=>qualify(f,bad),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'});}
 assert.deepEqual(await metadata(f,PROMPT_INSERTION_RUNTIME),row);
});

test('late receipt-only physical mutation invalidates original complete selection cut without graph or backup generation drift',async t=>{
 const f=await existingSelectionFixture(t),original=await receipt(f.a.databaseId);await f.raw(f.a.repository,s=>s.put(original));const owner=new OriginalApplicationGenerationSelection(f.a,f.coreA,f.a.local);t.after(()=>owner.close());
 assert.equal((await owner.prepare()).state,'prepared');const before=await f.snapshot(f.a),target=await f.snapshot(f.b),changed={...original,revision:original.revision+1,claims:original.claims.map((c,i)=>i===0?{...c,state:'not_inserted'}:c)};
 validatePromptInsertionRuntimeRow(changed);await f.raw(f.a.repository,s=>s.put(changed));const after=await f.snapshot(f.a);assert.deepEqual(after.meta.filter(r=>r.id!==PROMPT_INSERTION_RUNTIME),before.meta.filter(r=>r.id!==PROMPT_INSERTION_RUNTIME));
 await assert.rejects(owner.activate(),{code:'GENERATION_SELECTION_CHANGED'});assert.deepEqual(await f.snapshot(f.a),after);assert.deepEqual(await f.snapshot(f.b),target);assert.equal(after.meta.some(r=>r.id===APPLICATION_SELECTION_MARKER),false);
});

test('strict pure format validates mixed historical domains but refuses body fields, accessor and sparse arrays',async()=>{
 const row=await receipt('SYNTHETIC_database','SYNTHETIC_historical_restore');assert.equal(validatePromptInsertionRuntimeRow(row),row);assert.equal(validPromptInsertionEnvelope(row.claims[0].envelope),true);
 let reads=0;for(const field of ['claims','epochs','retiredRanges']){const copy=structuredClone(row);copy[field]=[];Object.defineProperty(copy[field],'0',{enumerable:true,get(){reads++;return null;}});assert.throws(()=>validatePromptInsertionRuntimeRow(copy),{code:'PROMPT_INSERTION_STORAGE_INVALID'});}
 const sparse=structuredClone(row);sparse.claims=new Array(1);assert.throws(()=>validatePromptInsertionRuntimeRow(sparse),{code:'PROMPT_INSERTION_STORAGE_INVALID'});const extra=structuredClone(row);extra.claims.extra=true;assert.throws(()=>validatePromptInsertionRuntimeRow(extra),{code:'PROMPT_INSERTION_STORAGE_INVALID'});assert.equal(reads,0);
 const envelope={...row.claims[0].envelope,body:'SYNTHETIC forbidden'};assert.equal(validPromptInsertionEnvelope(envelope),false);const getter=structuredClone(row);Object.defineProperty(getter,'version',{get(){reads++;return 1;}});assert.throws(()=>validatePromptInsertionRuntimeRow(getter),{code:'PROMPT_INSERTION_STORAGE_INVALID'});assert.equal(reads,0);
});
