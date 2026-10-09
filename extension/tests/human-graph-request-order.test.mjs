import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore,sealOperation} from '../core/browser-native-sync/core.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {portableHumanEntity} from '../core/browser-native-sync/human-library-codec.js';
import {normalizePhysical} from '../core/browser-native-sync/human-library-journal.js';
import {humanWireRequestDigest,restoreHumanRequest} from '../core/browser-native-sync/human-library-request.js';
import {bytes,decodeJSON} from '../core/browser-native-sync/value.js';
import {hashText} from '../core/dedupe.js';
globalThis.IDBKeyRange=IDBKeyRange;
const op=()=>crypto.randomUUID();
async function fixture(device){let tick=0;const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString()});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-order-wire',deviceId:device});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core};}
async function groups(core){const rows=[];for await(const row of core.rows('revision'))rows.push(row.operation);return rows.filter(o=>o.type==='humanLibraryCommit').sort((a,b)=>a.sequence-b.sequence).map(d=>[...d.value.members.map(ref=>rows.find(o=>o.revisionId===ref.revisionId)),d]);}
const wire=g=>decodeJSON(bytes(g),4*1024*1024);
const all=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async name=>[name,await t.all(name)]))));
async function portableRows(s){const state=await all(s),secret=state.meta.find(r=>r.id==='thought-suppression-key').value;const result={};for(const [type,name]of [['entry','thoughts'],['topic','topics'],['section','sections'],['history','revisions']])result[name]=await Promise.all(state[name].map(async row=>normalizePhysical(type,await portableHumanEntity(type,row,state.revisions,secret))));return result;}
test('real canonical wire restores both legal Topic edit key orders and Entry field-revision order without changing original receipt digests',async()=>{
 for(const reversed of [false,true]){
  const a=await fixture('synthetic-order-source'),b=await fixture('synthetic-order-target'),q=await a.s.createTopic({name:'SYNTHETIC order Topic',operationId:op()}),e=await a.s.createEntry({actor:'user',body:'SYNTHETIC order Entry',type:'idea',formation:'explicit',evidence:[],operationId:op()});
  const topicValues={name:'SYNTHETIC ordered rename',summary:'SYNTHETIC ordered summary',pinned:true},changes=Object.fromEntries((reversed?['pinned','summary','name']:['name','summary','pinned']).map(key=>[key,topicValues[key]]));
  const topicBase={id:q.id,expectedRevision:0,changes,operationId:op()},topicRequest=Object.fromEntries((reversed?['operationId','changes','expectedRevision','id']:['id','expectedRevision','changes','operationId']).map(key=>[key,topicBase[key]]));await a.s.editTopic(topicRequest);
  const entryChanges=Object.fromEntries((reversed?['note','body']:['body','note']).map(key=>[key,key==='body'?'SYNTHETIC changed Entry':'SYNTHETIC ordered note'])),fieldRevisions=Object.fromEntries((reversed?['body','note']:['note','body']).map(key=>[key,0]));
  const entryBase={id:e.id,expectedRevision:0,changes:entryChanges,expectedFieldRevisions:fieldRevisions,operationId:op()},entryRequest=Object.fromEntries((reversed?['expectedFieldRevisions','operationId','changes','id','expectedRevision']:['id','changes','expectedRevision','expectedFieldRevisions','operationId']).map(key=>[key,entryBase[key]]));await a.s.editEntry(entryRequest);
  const inputs=await groups(a.core);for(const input of inputs)assert.equal((await b.s.humanLibraryJournal.receive(b.s,wire(input))).state,'applied');
  for(const [kind,request]of [['topic-edit',topicRequest],['entry-edit',entryRequest]]){
   const descriptor=inputs.find(g=>g.at(-1).value.kind===kind).at(-1).value;
   assert.deepEqual(descriptor.requestOrder,Object.keys(request));assert.equal(descriptor.ownerRequestDigest,await hashText(JSON.stringify(request)));assert.notEqual(descriptor.requestDigest,descriptor.ownerRequestDigest);
   assert.equal(JSON.stringify(await restoreHumanRequest(wire([inputs.find(g=>g.at(-1).value.kind===kind).at(-1)])[0].value)),JSON.stringify(request));
   const original=await a.s.repository.transaction(false,t=>t.get('operationReceipts',request.operationId)),restored=await b.s.repository.transaction(false,t=>t.get('operationReceipts',request.operationId));assert.equal(original.digest,descriptor.ownerRequestDigest);assert.deepEqual(restored,original);
  }
  assert.deepEqual(await portableRows(b.s),await portableRows(a.s));
  const snapshot=await all(b.s);for(const input of inputs)assert.equal((await b.s.humanLibraryJournal.receive(b.s,wire(input))).state,'duplicate');assert.deepEqual(await all(b.s),snapshot);
 }
});
test('a cryptographically resealed order mutation cannot change original meaning, history or owner receipt; every store remains unchanged',async()=>{
 const a=await fixture('synthetic-order-mutant-source'),b=await fixture('synthetic-order-mutant-target'),q=await a.s.createTopic({name:'SYNTHETIC order negatives',operationId:op()});await a.s.editTopic({id:q.id,changes:{summary:'SYNTHETIC summary',pinned:true},expectedRevision:0,operationId:op()});
 const [base,input]=await groups(a.core);await b.s.humanLibraryJournal.receive(b.s,wire(base));const before=await all(b.s);
 for(const mutate of [d=>{d.requestOrder.reverse();},d=>{d.changeOrder.reverse();},d=>{d.fieldRevisionOrder=['body'];},d=>{d.requestOrder.push('extra');},d=>{d.changeOrder.push(d.changeOrder[0]);}]){
  const rows=wire(input),d=rows.at(-1);mutate(d.value);
  // A forged digest is not permission. Bind all member references again so the
  // refusal cannot be credited merely to an unchanged outer cryptographic seal.
  d.value.requestDigest=await humanWireRequestDigest(d.value);
  for(let i=0;i<rows.length-1;i++){rows[i].value.requestDigest=d.value.requestDigest;rows[i]=await sealOperation(rows[i]);}
  d.value.members=d.value.members.map(ref=>({...ref,revisionId:rows.find(row=>row.entityId===ref.entityId).revisionId}));
  let rejected=false;try{rows[rows.length-1]=await sealOperation(d);await b.s.humanLibraryJournal.receive(b.s,wire(rows));}catch{rejected=true;}assert.equal(rejected,true);assert.deepEqual(await all(b.s),before);
 }
});
