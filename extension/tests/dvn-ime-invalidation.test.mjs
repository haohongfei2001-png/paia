import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {capture} from './harness/thought-m1.mjs';
import {DocumentEditor} from '../ui/library.js';
globalThis.IDBKeyRange=IDBKeyRange;
function local(){let data={};return {async get(keys){return keys===null?structuredClone(data):Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(data[k])]));},async set(values){Object.assign(data,structuredClone(values));},async remove(keys){for(const key of Array.isArray(keys)?keys:[keys])delete data[key];}};}
async function fixture(){const s=new OrganizerStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.capture(capture((await s.status()).epoch,'first','SYNTHETIC eligible Original'));await s.capture(capture((await s.status()).epoch,'second','SYNTHETIC forbidden Original'));await s.finishFoundation();const snapshot=await s.snapshot(),source=id=>snapshot.records.find(r=>r.sourceMessageId===id).id;return {s,first:snapshot.library.blocks.find(b=>b.sourceRecordId===source('first')),second:snapshot.library.blocks.find(b=>b.sourceRecordId===source('second'))};}

test('Trusted tracked-ID read distinguishes a physically purged Input from an excluded or page-omitted survivor without body fallback',async()=>{
 const {s,first,second}=await fixture();await s.excludeLibrary(first.id,true);
 const before=await s.page({view:'library',documentId:first.documentId,trackedBlockIds:[first.id,second.id]});assert.equal(before.unavailableTrackedInputIds,undefined);assert.ok(before.library.blocks.some(b=>b.id===first.id&&b.excluded));
 await s.permanentDelete(second.sourceRecordId);const page=await s.page({view:'library',documentId:first.documentId,trackedBlockIds:[first.id,second.id]});assert.deepEqual(page.unavailableTrackedInputIds,[second.id]);assert.ok(page.library.blocks.some(b=>b.id===first.id));assert.equal(page.records.some(r=>r.originalText.includes('forbidden')),false);assert.equal((await s.input(first.id)).excluded,true);
});
test('Tracked absence is proved even after the last untouched Source removes its document owner; a moved physical Input is never called absent',async()=>{
 const {s,first,second}=await fixture();await s.repository.transaction(true,async t=>{const row=await t.get('blocks',second.id),ix=await t.get('blockIndex',second.id),meta=await t.get('inputStates',second.id);row.value.documentId=ix.documentId=meta.documentId='SYNTHETIC moved owner';ix.listKey[0]=ix.documentId;await t.put('blocks',row);await t.put('blockIndex',ix);await t.put('inputStates',meta);});
 const moved=await s.page({view:'library',documentId:first.documentId,trackedBlockIds:[second.id]});assert.equal(moved.unavailableTrackedInputIds,undefined);assert.equal((await s.input(second.id)).documentId,'SYNTHETIC moved owner');
 const f=await fixture();await f.s.permanentDelete(f.second.sourceRecordId);await f.s.permanentDelete(f.first.sourceRecordId);const missing=await f.s.page({view:'library',documentId:f.first.documentId,trackedBlockIds:[f.first.id,f.second.id]});assert.deepEqual(missing.conversations,[]);assert.deepEqual(missing.unavailableTrackedInputIds,[f.first.id,f.second.id]);
});

test('Physical invalidation clears only forbidden nodes/cache/journal entries before IME/save deferral; surviving draft, operation and caret owner stay pinned',()=>{
 for(const mode of ['composing','saving']){
  let removed=false,changed=0,invalidated;const scroll=[];
  const firstField={isConnected:true,contains:el=>el===firstField,getBoundingClientRect:()=>({top:removed?35:50}),textContent:'SYNTHETIC full eligible composition'},secondField={textContent:'SYNTHETIC forbidden Original',contains:()=>false};
  const section={replaceChildren(){secondField.textContent='';},remove(){removed=true;}};secondField.closest=()=>section;
  const saved={libraryText:null,note:'',excluded:false},first={saved,local:{libraryText:'SYNTHETIC complete eligible draft',note:'kept',excluded:false},original:'SYNTHETIC eligible Original',sources:['source:first']},second={saved,local:{...saved},original:'SYNTHETIC forbidden Original',sources:['source:second']};
  const pending={edit:{operationId:'SYNTHETIC exact unknown identity',blocks:[{id:'first',libraryText:first.local.libraryText}]},state:'unknown'},survivingPatch={id:'first',before:saved,after:first.local};
  const e=Object.create(DocumentEditor.prototype);Object.assign(e,{id:'doc',root:{contains:()=>true},entries:new Map([['first',first],['second',second]]),journal:{undo:[[survivingPatch,{id:'second',before:saved,after:saved}]],redo:[[{id:'second',before:saved,after:saved}]]},recovery:{sourceRecordIds:['source:first','source:second']},saveSession:{pending,unresolved:true},[mode]:true,field:id=>id==='first'?firstField:secondField,onChange:()=>changed++,onInvalidated:ids=>invalidated=ids});
  const incoming={conversations:[{id:'doc'}],library:{blocks:[{id:'first',documentId:'doc'}]},unavailableTrackedInputIds:['second']},priorDocument=globalThis.document,priorWindow=globalThis.window;
  globalThis.document={activeElement:firstField};globalThis.window={scrollBy:(...args)=>scroll.push(args)};
  try{assert.deepEqual(e.receive(incoming),{removed:true});}finally{if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;if(priorWindow===undefined)delete globalThis.window;else globalThis.window=priorWindow;}
  assert.equal(secondField.textContent,'');assert.equal(second.original,'');assert.equal(e.entries.has('second'),false);assert.equal(e.entries.get('first'),first);assert.equal(firstField.textContent,'SYNTHETIC full eligible composition');assert.equal(first.local.libraryText,'SYNTHETIC complete eligible draft');assert.equal(e.saveSession.pending,pending);assert.deepEqual(e.undoStack,[[survivingPatch]]);assert.deepEqual(e.redoStack,[]);assert.deepEqual(e.recovery.sourceRecordIds,['source:first']);assert.equal(e.deferredState,incoming);assert.deepEqual(invalidated,['second']);assert.equal(changed,1);assert.deepEqual(scroll,[[0,-15]]);
 }
});
test('An incomplete ordinary page or conflicting owner is not physical Source absence and cannot erase a composing draft',()=>{
 const e=Object.create(DocumentEditor.prototype),entry={original:'SYNTHETIC eligible Original',local:{libraryText:'SYNTHETIC complete draft'}};Object.assign(e,{entries:new Map([['first',entry]]),composing:true});const incoming={conversations:[],library:{blocks:[]}};assert.equal(e.receive(incoming),undefined);assert.equal(e.entries.get('first'),entry);assert.equal(entry.local.libraryText,'SYNTHETIC complete draft');assert.equal(e.deferredState,incoming);
});
