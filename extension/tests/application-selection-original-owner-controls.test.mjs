import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {createApplicationEditorGuard,APPLICATION_EDITOR_PORT,isOriginalApplicationEditorGuard,holdOriginalApplicationSelectionEditor,currentOriginalApplicationSelectionEditor,releaseOriginalApplicationSelectionEditor} from '../background/application-editor-guard.js';
import {PromptInsertionReceipts,isOriginalPromptInsertionReceipts,readOriginalPromptInsertionReceiptSelectionMethods,holdOriginalApplicationSelectionReceipts,currentOriginalApplicationSelectionReceipts,releaseOriginalApplicationSelectionReceipts} from '../background/prompt-insertion-receipts.js';
import {createApplicationTransportCoordination,isOriginalApplicationTransportCoordination,readOriginalApplicationSelectionTransportMembers,holdOriginalApplicationSelectionTransport} from '../background/application-transport-coordination.js';

// Narrow synthetic refusal/compatibility controls. These do not mint a private
// action, mock bridge authority, execute a selection, or prove host lifetime.
const fakeAction=()=>Object.freeze(Object.create(null));
const signal=()=>{const listeners=[];return {addListener(fn){listeners.push(fn);},emit(value){for(const fn of listeners)fn(value);}};};
const event=()=>({addListener(){},removeListener(){}});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function editor(t){
 const id='a'.repeat(32),url=`chrome-extension://${id}/ui/archive.html`,documentId='synthetic-editor-original';
 let inventories=0;const messages=[];
 const api={runtime:{id,getURL:path=>`chrome-extension://${id}/${path}`,getContexts:async()=>{inventories++;return [{contextType:'TAB',documentId,documentUrl:url,frameId:0,incognito:false}];}}};
 const owner=createApplicationEditorGuard(api),port={name:APPLICATION_EDITOR_PORT,sender:{id,url,documentId,frameId:0,tab:{incognito:false}},onMessage:signal(),onDisconnect:signal(),disconnect(){this.onDisconnect.emit();},postMessage(message){messages.push(message);if(message.type==='PREPARE')queueMicrotask(()=>this.onMessage.emit({type:'FROZEN',nonce:message.nonce}));if(message.type==='CHECK')queueMicrotask(()=>this.onMessage.emit({type:'CHECKED',nonce:message.nonce,challenge:message.challenge}));}};
 owner.connect(port);port.onMessage.emit({type:'READY',version:1});t.after(()=>owner.close());
 return {owner,api,documentId,messages,inventories:()=>inventories};
}

async function receipts(t){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();let nativeCalls=0;
 const api={runtime:{id:'b'.repeat(32)},tabs:{get:async()=>{nativeCalls++;return {};},sendMessage:async()=>{nativeCalls++;return undefined;},query:async()=>{nativeCalls++;return [];},onCreated:event(),onRemoved:event(),onReplaced:event(),onUpdated:event()},scripting:{executeScript:async()=>{nativeCalls++;return [];}}};
 const owner=new PromptInsertionReceipts(s,api);await owner.inspect();
 t.after(async()=>{owner.dispose();await s.repository.close();});return {owner,store:s,api,nativeCalls:()=>nativeCalls};
}

test('counterfeit action cannot borrow an original editor or start its inventory; ordinary editor API remains usable',async t=>{
 const f=editor(t),action=fakeAction();assert.equal(isOriginalApplicationEditorGuard(f.owner,f.api),true);
 assert.equal(isOriginalApplicationEditorGuard({...f.owner},f.api),false);assert.equal(isOriginalApplicationEditorGuard(f.owner,{...f.api}),false);
 assert.throws(()=>holdOriginalApplicationSelectionEditor(action,f.owner,f.documentId),{code:'GENERATION_SELECTION_CAPABILITY'});
 assert.equal(currentOriginalApplicationSelectionEditor(action,f.owner,{}),false);assert.equal(releaseOriginalApplicationSelectionEditor(action,f.owner,{}),false);assert.equal(f.inventories(),0);
 const token=await f.owner.freezeExtensionPages(f.documentId);assert.equal(f.owner.assertFrozenExtensionPages(token),true);assert.equal(f.owner.release(token),undefined);await tick();assert.equal(f.owner.blocksMutation({documentId:f.documentId}),false);
});

test('counterfeit action and same-prototype receipt copy cannot trigger original receipt native probes',async t=>{
 const f=await receipts(t),action=fakeAction(),before=f.nativeCalls();assert.equal(isOriginalPromptInsertionReceipts(f.owner,f.store,f.api),true);
 assert.equal(isOriginalPromptInsertionReceipts(Object.create(Object.getPrototypeOf(f.owner)),f.store,f.api),false);
 assert.equal(isOriginalPromptInsertionReceipts(f.owner,f.store,{...f.api}),false);
 assert.throws(()=>holdOriginalApplicationSelectionReceipts(action,f.owner),{code:'GENERATION_SELECTION_CAPABILITY'});
 assert.equal(currentOriginalApplicationSelectionReceipts(action,f.owner,{}),false);assert.equal(await releaseOriginalApplicationSelectionReceipts(action,f.owner,{}),false);assert.equal(f.nativeCalls(),before);
 assert.equal((await f.owner.inspect()).legacyCoverageUnknown,true);
});

test('receipt definition-time identities reject prototype mutation before first selection-method reader composition',async t=>{
 const f=await receipts(t),prototype=PromptInsertionReceipts.prototype,original=prototype.holdCurrentTopDocumentsForApplicationSelection;let substituted=0;
 const replacement=async()=>{substituted++;return Object.freeze({ready:true});};prototype.holdCurrentTopDocumentsForApplicationSelection=replacement;
 try{
  // This is the first selection-method reader call in this test module. A
  // first-use snapshot of the mutable prototype would incorrectly adopt it.
  const captured=readOriginalPromptInsertionReceiptSelectionMethods();assert.equal(captured.hold,original);assert.notEqual(captured.hold,replacement);assert.equal(Object.isFrozen(captured),true);
  assert.equal(isOriginalPromptInsertionReceipts(f.owner,f.store,f.api),false);
  assert.throws(()=>holdOriginalApplicationSelectionReceipts(fakeAction(),f.owner),{code:'GENERATION_SELECTION_CAPABILITY'});assert.equal(substituted,0);assert.equal(f.nativeCalls(),0);
 }finally{prototype.holdCurrentTopDocumentsForApplicationSelection=original;}
 assert.equal(isOriginalPromptInsertionReceipts(f.owner,f.store,f.api),true);
});

test('transport factory branding never upgrades caller-shaped owners or their callbacks into fixed membership',async()=>{
 let called=0;const supplied=Object.freeze({holdApplicationSources(){called++;},applicationSourcesHeld(){return true;},fenceApplicationSources(){return true;},releaseApplicationSources(){return true;},holdForApplicationSelection(){called++;},applicationSelectionHeld(){return true;},fenceApplicationSelection(){return true;},releaseApplicationSelection(){return true;}}),store={},api={};
 const owner=createApplicationTransportCoordination({sourceCoordination:supplied,captureRecovery:supplied,promptInsertionReceipts:supplied,store,api});
 assert.equal(isOriginalApplicationTransportCoordination(owner,store,api),false);assert.equal(isOriginalApplicationTransportCoordination({...owner},store,api),false);
 assert.throws(()=>readOriginalApplicationSelectionTransportMembers(owner,store,api),{code:'GENERATION_WORKER_NOT_QUIET'});
 assert.throws(()=>holdOriginalApplicationSelectionTransport(fakeAction(),owner),{code:'GENERATION_SELECTION_CAPABILITY'});await assert.rejects(owner.hold(),{code:'GENERATION_WORKER_NOT_QUIET'});assert.equal(called,0);assert.equal(await owner.close(),true);
});
