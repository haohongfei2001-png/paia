import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore,validateOperation} from '../core/browser-native-sync/core.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {validateHumanLibraryEntity} from '../core/browser-native-sync/human-library-codec.js';
import {digest} from '../core/browser-native-sync/value.js';
globalThis.IDBKeyRange=IDBKeyRange;
async function fixture(deviceId){
 let tick=0;const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString()});
 await s.consent(true);await s.finishFoundation();
 const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-derived-refusal',deviceId});
 s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core};
}
async function snapshot(s){return s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async key=>[key,await t.all(key)]))));}
async function topicGroup(core){const ops=[];for await(const row of core.rows('revision'))if(!row.redacted)ops.push(row.operation);const descriptor=ops.find(op=>op.type==='humanLibraryCommit');return [...descriptor.value.members.map(ref=>ops.find(op=>op.revisionId===ref.revisionId)),descriptor];}
async function tamper(group,side,where='snapshot'){
 const rows=structuredClone(group),member=rows.find(op=>op.type==='humanLibraryMember'&&op.value.entityType==='history'&&op.value.after.kind==='topic');
 if(where==='snapshot')member.value[side].after.indexedSearchVersion='0:active:0';
 else member.value[side].after.identity.syntheticNested={indexedSearchVersion:'0:active:0'};
 const unsigned=structuredClone(member);delete unsigned.revisionId;member.revisionId=await digest(unsigned);
 const descriptor=rows.at(-1),ref=descriptor.value.members.find(item=>item.entityId===member.entityId);ref.revisionId=member.revisionId;
 const unsignedDescriptor=structuredClone(descriptor);delete unsignedDescriptor.revisionId;descriptor.revisionId=await digest(unsignedDescriptor);return rows;
}
test('incoming Topic history cannot carry sender-local indexed completion, including nested identity leaves',async()=>{
 const sender=await fixture('synthetic-source');await sender.s.createTopic({name:'Synthetic local index refusal',operationId:crypto.randomUUID()});
 const original=await topicGroup(sender.core),history=original.find(op=>op.value.entityType==='history'&&op.value.after.kind==='topic').value.after;
 assert.equal(validateHumanLibraryEntity('history',structuredClone(history)).id,history.id);
 for(const where of ['snapshot','identity']){
  const bad=await tamper(original,'after',where),row=bad.find(op=>op.value.entityType==='history'&&op.value.after.kind==='topic').value.after;
  assert.throws(()=>validateHumanLibraryEntity('history',row),{code:'BNS_HUMAN_CODEC_INVALID'},'required codec rejects local completion even in retained history');
 }
});
test('resealed remote completion tag refuses before original receive and leaves every store unchanged',async()=>{
 const sender=await fixture('synthetic-source');await sender.s.createTopic({name:'Synthetic remote derived refusal',operationId:crypto.randomUUID()});const original=await topicGroup(sender.core);
 const target=await fixture('synthetic-target'),before=await snapshot(target.s);
 for(const where of ['snapshot','identity']){
  const bad=await tamper(original,'after',where),member=bad.find(op=>op.value.entityType==='history'&&op.value.after.kind==='topic');
  await assert.rejects(validateOperation(member),{code:'BNS_HUMAN_CODEC_INVALID'});
  await assert.rejects(target.s.humanLibraryJournal.receive(target.s,bad));
  assert.deepEqual(await snapshot(target.s),before,'no canonical, Core, mapping, queue, history or pointer writes');
 }
 assert.equal((await target.s.humanLibraryJournal.receive(target.s,original)).state,'applied','unchanged canonical history remains receivable');
});
