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


const bodies=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].filter(n=>n!=='meta').map(async n=>[n,await t.all(n)]))));
test('first complete human sibling retained atomically without canonical writes or echo; exact retry is write-free',async()=>{
 const f=await scenario(),before=await snapshot(f.b.s),originalBodies=await bodies(f.b.s),mapping=await f.b.core.read('humanMapping','entry:'+f.id);
 const result=await f.b.s.humanLibraryJournal.retainSibling(f.b.s,f.incoming);assert.deepEqual(result,{state:'retained-conflict'});
 assert.deepEqual(await bodies(f.b.s),originalBodies);assert.deepEqual(await f.b.core.read('humanMapping','entry:'+f.id),mapping);
 const member=f.incoming.find(op=>op.value.entityType==='entry'),head=await f.b.core.read('head',member.type,member.entityId);assert.equal(head.revisions.length,2);assert.ok(head.revisions.includes(member.revisionId));
 for(const op of f.incoming){assert.equal((await f.b.core.read('receipt',op.operationId)).digest,op.revisionId);assert.deepEqual((await f.b.core.read('revision',op.revisionId)).operation,op);assert.equal(await f.b.core.read('outbox',op.operationId),undefined);}
 const after=await snapshot(f.b.s);assert.notDeepEqual(after,before);assert.deepEqual(await f.b.s.humanLibraryJournal.retainSibling(f.b.s,f.incoming),{state:'duplicate',materialization:'not-reapplied'});assert.deepEqual(await snapshot(f.b.s),after);
});
test('retention consumes semantic handle; clones, ordinary plans and fake transactions cannot authorize it',async()=>{
 const f=await scenario(),w=await captureWitness(f.b.s,f.b.core,f.incoming),p=await prepareHumanBranchRetention(f.b.s,f.b.core,w);
 await assert.rejects(revalidate(f.b.s,f.b.core,w),{code:'BNS_HUMAN_BRANCH_WITNESS_REQUIRED'});await assert.rejects(prepareHumanBranchRetention(f.b.s,f.b.core,w),{code:'BNS_HUMAN_BRANCH_WITNESS_REQUIRED'});
 const before=await snapshot(f.b.s);for(const fake of [w,clone(p),{}])await assert.rejects(f.b.core.retainHumanBranch(fake),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
 claimHumanBranchRetention(f.b.core,p);await assert.rejects(requireHumanBranchRetentionInTransaction({tx:{db:f.b.s.repository.db,mode:'readwrite'}},f.b.core,p),{code:'BNS_HUMAN_RETENTION_REQUIRED'});finishHumanBranchRetention(f.b.core,p);assert.deepEqual(await snapshot(f.b.s),before);
 await assert.rejects(f.b.core.retainHumanBranch(p),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
});

test('new body, protection, permission or namespace after prepare invalidates retention without undoing the change',async()=>{
 for(const kind of ['body','protection','control','namespace']){
  const f=await scenario(),w=await captureWitness(f.b.s,f.b.core,f.incoming),p=await prepareHumanBranchRetention(f.b.s,f.b.core,w);
  if(kind==='control')f.b.s.controlCache.settings.enabled=false;
  else if(kind==='namespace')await f.b.core.transaction(true,t=>t.put('meta',{id:f.b.core.prefix+'active',namespace:'synthetic-new-namespace'}));
  else await f.b.s.repository.transaction(true,async t=>{const row=await t.get('thoughts',f.id);if(kind==='body')row.thoughtText+=' unjournaled';else row.protections.body={actor:'user',reason:'retention-race',at:'2026-10-09T00:00:00.000Z'};await t.put('thoughts',row);});
  const changed=await snapshot(f.b.s);await assert.rejects(f.b.core.retainHumanBranch(p));assert.deepEqual(await snapshot(f.b.s),changed);
  await assert.rejects(f.b.core.retainHumanBranch(p),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
 }
});
test('native repository fault after protocol writes aborts every head, receipt and frontier before exact retry',async()=>{
 for(const fault of ['revision','receipt','frontier']){
  const f=await scenario(),before=await snapshot(f.b.s),prototype=Object.getPrototypeOf(f.b.s.repository.db.transaction(['meta'],'readonly').objectStore('meta')),original=prototype.put;let injected=false;
  prototype.put=function(row,...args){const result=original.call(this,row,...args);if(!injected&&row?.id?.startsWith(f.b.core.prefix)&&row.id.includes(':'+fault+':')){injected=true;throw Error('synthetic '+fault+' failure');}return result;};
  try{await assert.rejects(f.b.s.humanLibraryJournal.retainSibling(f.b.s,f.incoming));}finally{prototype.put=original;}
  assert.equal(injected,true);assert.deepEqual(await snapshot(f.b.s),before);
  assert.deepEqual(await f.b.s.humanLibraryJournal.retainSibling(f.b.s,f.incoming),{state:'retained-conflict'});
 }
});
test('after durable commit a late control loss is unknown to the caller, and exact duplicate reconciles without writes',async()=>{
 const f=await scenario(),w=await captureWitness(f.b.s,f.b.core,f.incoming),p=await prepareHumanBranchRetention(f.b.s,f.b.core,w),prototype=Object.getPrototypeOf(f.b.s.repository.db.transaction(['meta'],'readonly').objectStore('meta')),original=prototype.put;let injected=false;
 prototype.put=function(row,...args){const result=original.call(this,row,...args);if(!injected&&row?.id?.includes(':frontier:')){injected=true;this.transaction.addEventListener('complete',()=>{f.b.s.pendingControl=clone(f.b.s.controlCache);},{once:true});}return result;};
 try{await assert.rejects(f.b.core.retainHumanBranch(p),{code:'BNS_HUMAN_CHANGED'});}finally{prototype.put=original;}
 assert.equal(injected,true);for(const op of f.incoming)assert.equal((await f.b.core.read('receipt',op.operationId)).digest,op.revisionId);
 f.b.s.pendingControl=null;const before=await snapshot(f.b.s);assert.deepEqual(await f.b.s.humanLibraryJournal.retainSibling(f.b.s,f.incoming),{state:'duplicate',materialization:'not-reapplied'});assert.deepEqual(await snapshot(f.b.s),before);
});
test('complete receipts only: missing member cannot be repaired under duplicate authority',async()=>{
 const f=await scenario();await f.b.s.humanLibraryJournal.retainSibling(f.b.s,f.incoming);await f.b.core.transaction(true,async t=>t.delete('meta',await f.b.core.idIn(t,'receipt',f.incoming[0].operationId)));const before=await snapshot(f.b.s);
 await assert.rejects(f.b.s.humanLibraryJournal.retainSibling(f.b.s,f.incoming),{code:'BNS_OPERATION_COLLISION'});assert.deepEqual(await snapshot(f.b.s),before);
});
test('mixed semantic, retention and duplicate handles share the original eight-handle lifetime',async()=>{
 const f=await scenario({parent:'new-history'}),accepted=(await allGroups(f.a.core)).filter(group=>group.at(-1).value.kind==='entry-edit').at(-2),handles=[];
 for(let i=0;i<8;i++)handles.push(await captureWitness(f.b.s,f.b.core,f.incoming));
 const retention=await prepareHumanBranchRetention(f.b.s,f.b.core,handles[0]);await assert.rejects(revalidate(f.b.s,f.b.core,handles[0]),{code:'BNS_HUMAN_BRANCH_WITNESS_REQUIRED'});
 const duplicate=await prepareHumanBranchRetentionRetry(f.b.s,f.b.core,accepted);assert.ok(duplicate);await assert.rejects(revalidate(f.b.s,f.b.core,handles[1]),{code:'BNS_HUMAN_BRANCH_WITNESS_REQUIRED'});
 await f.b.core.retainHumanBranch(duplicate);await assert.rejects(f.b.core.retainHumanBranch(duplicate),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
 await f.b.core.retainHumanBranch(retention);await assert.rejects(f.b.core.retainHumanBranch(retention),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
});
test('ordinary bound edit of unresolved body is refused, unrelated Entry still progresses',async()=>{
 const f=await scenario();await f.b.s.humanLibraryJournal.retainSibling(f.b.s,f.incoming);const before=await snapshot(f.b.s),row=await f.b.s.repository.transaction(false,t=>t.get('thoughts',f.id));
 await assert.rejects(f.b.s.editEntry({id:f.id,expectedRevision:row.revision,changes:{body:'SYNTHETIC implicit resolution refused'},operationId:op()}),{code:'BNS_HUMAN_OWNER_CHANGED'});assert.deepEqual(await snapshot(f.b.s),before);
 const unrelated=await f.b.s.createEntry({actor:'user',body:'SYNTHETIC unaffected Entry',type:'idea',formation:'explicit',evidence:[],operationId:op()});assert.ok(unrelated.id);
});

test('both offline directions retain identical logical graphs while preserving each current body',async()=>{
 const f=await scenario(),other=await latestGroup(f.b.core,f.id),a=await bodies(f.a.s),b=await bodies(f.b.s);
 assert.deepEqual(await f.b.s.humanLibraryJournal.retainSibling(f.b.s,f.incoming),{state:'retained-conflict'});
 assert.deepEqual(await f.a.s.humanLibraryJournal.retainSibling(f.a.s,other),{state:'retained-conflict'});
 assert.deepEqual(await bodies(f.a.s),a);assert.deepEqual(await bodies(f.b.s),b);assert.deepEqual(await f.a.core.state(),await f.b.core.state());
 const operations=[];for await(const row of f.b.core.rows('revision'))operations.push(row.operation);const before=await snapshot(f.b.s);
 await assert.rejects(prepareGroupCheckpointPlan(f.b.core,operations),{code:'BNS_CONFLICT_REQUIRES_RESOLUTION'});assert.deepEqual(await snapshot(f.b.s),before);
});
test('all six original semantic scenarios retain complete groups without allocating domain counters',async()=>{
 for(const options of [{offset:true},{parent:'new-history',offset:true},{incomingNoDelta:true},{parent:'coalesced'},{parent:'no-delta'},{parent:'coalesced',afterParentUnrelated:true}]){
  const f=await scenario(options),before=await bodies(f.b.s),revision=await f.b.s.repository.transaction(false,t=>t.get('meta','revision-sequence')),sequence=await f.b.s.repository.transaction(false,t=>t.get('meta','thought-sequence'));
  assert.deepEqual(await f.b.s.humanLibraryJournal.retainSibling(f.b.s,f.incoming),{state:'retained-conflict'});assert.deepEqual(await bodies(f.b.s),before);
  assert.deepEqual(await f.b.s.repository.transaction(false,t=>t.get('meta','revision-sequence')),revision);assert.deepEqual(await f.b.s.repository.transaction(false,t=>t.get('meta','thought-sequence')),sequence);
 }
});

test('a genuine unrelated transaction has no retention provenance, and overriding public transaction cannot inject a DTO',async()=>{
 const f=await scenario(),w=await captureWitness(f.b.s,f.b.core,f.incoming),p=await prepareHumanBranchRetention(f.b.s,f.b.core,w),claim=claimHumanBranchRetention(f.b.core,p),before=await snapshot(f.b.s);
 await f.b.core.transaction(true,async t=>{assert.throws(()=>f.b.core.requireHumanRetentionTransaction(t,p,claim.group),{code:'BNS_HUMAN_RETENTION_REQUIRED'});await assert.rejects(requireHumanBranchRetentionInTransaction(t,f.b.core,p),{code:'BNS_HUMAN_RETENTION_REQUIRED'});});
 finishHumanBranchRetention(f.b.core,p);assert.deepEqual(await snapshot(f.b.s),before);
 const w2=await captureWitness(f.b.s,f.b.core,f.incoming),p2=await prepareHumanBranchRetention(f.b.s,f.b.core,w2),original=f.b.core.transaction;let injected=false;
 f.b.core.transaction=async()=>{injected=true;throw Error('fake transaction entry');};
 try{assert.deepEqual(await f.b.core.retainHumanBranch(p2),{state:'retained-conflict'});}finally{f.b.core.transaction=original;}
 assert.equal(injected,false,'retention must use the captured actual repository entry');
});

test('duplicate authority remains standalone body-only even for a previously accepted placed edit',async()=>{
 const a=await device('synthetic-placed-a'),b=await device('synthetic-placed-b'),topic=await a.s.createTopic({name:'SYNTHETIC placed',operationId:op()}),entry=await a.s.createEntry({actor:'user',body:'SYNTHETIC placed baseline',type:'idea',formation:'explicit',evidence:[],operationId:op()});
 await a.s.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:0,expectedTopicRevision:0,operationId:op()});const beforeEdit=await a.s.entry(entry.id);await a.s.editEntry({id:entry.id,expectedRevision:beforeEdit.revision,changes:{body:'SYNTHETIC placed edit'},operationId:op()});
 for(const group of await allGroups(a.core))await b.s.humanLibraryJournal.receive(b.s,group);const group=await latestGroup(a.core,entry.id),before=await snapshot(b.s);
 await assert.rejects(b.s.humanLibraryJournal.retainSibling(b.s,group),{code:'BNS_HUMAN_BRANCH_UNAVAILABLE'});assert.deepEqual(await snapshot(b.s),before);
});
