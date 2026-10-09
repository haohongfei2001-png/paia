import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {local} from './harness/thought-m1.mjs';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {BrowserNativeSyncCore,sealOperation} from '../core/browser-native-sync/core.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {humanPlanEntry,captureHumanBranchSemanticWitness as captureWitness,revalidateHumanBranchSemanticWitness as revalidate,executeHumanPlan} from '../core/browser-native-sync/human-library-plan.js';
import {prefix} from '../core/thought-model.js';
import {prepareGroupCheckpointPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
import {prepareHumanBranchRetention,prepareHumanBranchRetentionRetry,claimHumanBranchRetention,requireHumanBranchRetentionInTransaction,finishHumanBranchRetention} from '../core/browser-native-sync/human-library-plan.js';
import {hashText} from '../core/dedupe.js';
import {humanWireRequestDigest} from '../core/browser-native-sync/human-library-request.js';
import {clone} from '../core/browser-native-sync/value.js';
globalThis.IDBKeyRange=IDBKeyRange;
const op=()=>crypto.randomUUID();
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async n=>[n,await t.all(n)]))));
const latestGroup=async(core,id)=>{const rows=[];for await(const r of core.rows('revision'))if(!r.redacted)rows.push(r.operation);const d=rows.filter(r=>r.type==='humanLibraryCommit'&&r.deviceId===core.deviceId&&r.value.request.id===id).sort((a,b)=>a.sequence-b.sequence).at(-1);return d?[...d.value.members.map(ref=>rows.find(r=>r.revisionId===ref.revisionId)),d]:null;};
const allGroups=async core=>{const rows=[];for await(const r of core.rows('revision'))if(!r.redacted)rows.push(r.operation);return rows.filter(r=>r.type==='humanLibraryCommit').sort((a,b)=>a.sequence-b.sequence).map(d=>[...d.value.members.map(ref=>rows.find(r=>r.revisionId===ref.revisionId)),d]);};
async function device(id){let tick=0;const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString()});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-historical-body',deviceId:id});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core};}
async function capture(s,core,id){const base=await humanPlanEntry(s,core);return {base,read:await s.repository.transaction(false,async t=>{const page=await t.rangePage('revisions','byList',prefix(['library_entry:'+id]),null,129);assert.equal(page.next,null);return {row:await t.get('thoughts',id),history:page.rows.map(x=>x.value),placements:await t.count('placements','byEntry',prefix([id])),placementRows:[],topics:[],epoch:(await t.get('meta','thought-epoch'))?.value||0,provenance:await t.count('provenance','byOwner',prefix(['entry',id])),dependencies:await t.count('dependencies','byTarget',prefix(['entry',id]))};})};}
async function scenario({parent='create',offset=false,incomingNoDelta=false,afterParentUnrelated=false,padding='',extraEdits=0}={}){
 const a=await device('synthetic-history-a'),b=await device('synthetic-history-b');if(offset)await b.s.createEntry({actor:'user',body:'SYNTHETIC unrelated receiver counter',type:'idea',formation:'explicit',evidence:[],operationId:op()});
 const entry=await a.s.createEntry({actor:'user',body:'SYNTHETIC historical baseline 汉字'+padding,type:'idea',formation:'explicit',evidence:[],operationId:op()});let revision=0;
 if(parent!=='create'){await a.s.editEntry({id:entry.id,expectedRevision:revision++,changes:{body:'SYNTHETIC common parent first'},operationId:op()});if(parent==='coalesced')await a.s.editEntry({id:entry.id,expectedRevision:revision++,changes:{body:'SYNTHETIC common parent coalesced'},operationId:op()});if(parent==='no-delta')await a.s.editEntry({id:entry.id,expectedRevision:revision,changes:{body:'SYNTHETIC common parent first'},operationId:op()});}
 for(let i=0;i<extraEdits;i++)await a.s.editEntry({id:entry.id,expectedRevision:revision++,changes:{body:'SYNTHETIC extra parent '+i},operationId:op()});
 for(const group of await allGroups(a.core))assert.equal((await b.s.humanLibraryJournal.receive(b.s,group)).state,'applied');
 const oracle=await capture(b.s,b.core,entry.id);if(afterParentUnrelated)await b.s.createEntry({actor:'user',body:'SYNTHETIC later unrelated history counter',type:'idea',formation:'explicit',evidence:[],operationId:op()});const body=incomingNoDelta?oracle.read.row.thoughtText:'SYNTHETIC lawful branch A 🧠';
 await a.s.editEntry({id:entry.id,expectedRevision:revision,changes:{body},operationId:op()});const incoming=await latestGroup(a.core,entry.id);
 await b.s.editEntry({id:entry.id,expectedRevision:revision,changes:{body:'SYNTHETIC current canonical branch B'},operationId:op()});return {a,b,id:entry.id,incoming,oracle};
}

import {ArchiveRepository,requireRepositoryTransactionScope,requireRepositoryTransactionCommitted,awaitRepositoryTransactionSettled} from '../core/idb-repository.js';
import FakeEvent from './vendor/fake-indexeddb/build/esm/lib/FakeEvent.js';

test('non-native repository keeps ordinary storage and cleanup but cannot prove native commit',async()=>{
 const repository=new ArchiveRepository(local(),{indexedDB:new IDBFactory(),name:'synthetic-nonnative-owner'});let scope;
 await repository.transaction(true,async t=>{scope=t;const identity=requireRepositoryTransactionScope(repository,t);assert.equal(identity.nativeTransaction,false);assert.equal(Object.isFrozen(identity),true);await t.put('meta',{id:'ordinary-node-storage',value:1});});
 await awaitRepositoryTransactionSettled(repository,scope);assert.equal((await repository.transaction(false,t=>t.get('meta','ordinary-node-storage'))).value,1);
 assert.throws(()=>requireRepositoryTransactionCommitted(repository,scope),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
 for(const forged of [Object.create(scope),new Proxy(scope,{}),{tx:scope.tx,nativeTransaction:true}])assert.throws(()=>requireRepositoryTransactionCommitted(repository,forged),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
});

test('fake trusted field and public factory constructor changes cannot mint native commit evidence',async()=>{
 const repository=new ArchiveRepository(local(),{indexedDB:new IDBFactory(),name:'synthetic-fake-native-fields'});let scope;
 const old=globalThis.IDBTransaction;
 try{
  await repository.transaction(true,async t=>{scope=t;globalThis.IDBTransaction=t.tx.constructor;const event=new FakeEvent('complete');event.isTrusted=true;t.tx.dispatchEvent(event);});
  await awaitRepositoryTransactionSettled(repository,scope);
  assert.throws(()=>requireRepositoryTransactionCommitted(repository,scope),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
 }finally{if(old===undefined)delete globalThis.IDBTransaction;else globalThis.IDBTransaction=old;}
});

test('non-native Human retention refuses before graph writes and releases its one-shot budget',async()=>{
 const f=await scenario(),witness=await captureWitness(f.b.s,f.b.core,f.incoming),plan=await prepareHumanBranchRetention(f.b.s,f.b.core,witness),before=await snapshot(f.b.s);
 await assert.rejects(f.b.core.retainHumanBranch(plan),{code:'BNS_HUMAN_RETENTION_REQUIRED'});assert.deepEqual(await snapshot(f.b.s),before);
 await assert.rejects(f.b.core.retainHumanBranch(plan),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
 const fresh=await captureWitness(f.b.s,f.b.core,f.incoming);assert.equal(Object.isFrozen(fresh),true);
});
