import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {InputWorkingCommitReceiver,prepareWorkingApplication,projectOriginalWorkingHistory,releaseOriginalWorkingApplication} from '../core/browser-native-sync/input-working-commit.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
globalThis.IDBKeyRange=IDBKeyRange;
const id=()=>crypto.randomUUID(),snapshot=s=>s.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await tx.all(name)]))));
async function device(t){const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();t.after(()=>s.repository.close());const core=new BrowserNativeSyncCore(s.repository,{datasetId:'SYNTHETIC_working_lifetime',deviceId:id()});return {s,core};}
async function fixture(t,{human=false,conflict=false,checkpoint=async()=>{}}={}){
 const a=await device(t);a.s.sourceBootstrapJournal=new SourceBootstrapJournal(a.core);a.s.filterIntentJournal=new FilterIntentSyncJournal(a.core);a.s.inputWorkingJournal=new InputWorkingSyncJournal(a.core,{filterJournal:a.s.filterIntentJournal,logicalCommits:true});if(human)a.s.humanLibraryJournal=new HumanLibrarySyncJournal(a.core);
 await a.s.capture(capture((await a.s.status()).epoch));const input=(await a.s.snapshot()).library.blocks[0];await inputEdit(a.s,input.id,{libraryText:'SYNTHETIC protected Working lifetime'});
 if(human)await a.s.createEntry({actor:'user',operationId:id(),body:'SYNTHETIC independent Human',type:'idea',formation:'explicit',evidence:[]});
 const objects=new Map(),cloud={async putImmutable(ref,raw){objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cut=await buildCheckpoint(a.core,cloud,{grouped:{store:a.s}}),b=await device(t);
 if(conflict)await b.s.createEntry({actor:'user',operationId:id(),body:'SYNTHETIC existing unjournaled Human',type:'idea',formation:'explicit',evidence:[]});
 b.owner=new StagedSyncRestore(b.core,{grouped:{store:b.s},checkpoint});await b.owner.stageCheckpoint(cut.ref,ref=>cloud.get(ref));return {a,b,input};
}
function observeWorking(){const original=WeakMap.prototype.set,issued=[];WeakMap.prototype.set=function(key,value){const result=Reflect.apply(original,this,[key,value]);if(value?.receiver instanceof InputWorkingCommitReceiver&&value.prepared?.descriptor?.type==='inputWorkingCommit')issued.push({cap:key,...value});return result;};return {issued,restore(){WeakMap.prototype.set=original;}};}
const project=async row=>{const rows=await snapshot(row.receiver.store);return projectOriginalWorkingHistory(row.receiver.store,row.receiver.core,row.cap,{type:'inputWorkingCommit',id:row.prepared.descriptor.revisionId,operations:[...row.prepared.members,row.prepared.descriptor]},rows.revisions,rows.meta.find(r=>r.id==='revision-sequence')?.value||0,new Map());};
test('actual Human preparation refusal revokes every previously prepared original Working capability',async t=>{
 const {b}=await fixture(t,{human:true,conflict:true}),before=await snapshot(b.s),observed=observeWorking();try{await assert.rejects(b.owner.activate(),{code:'BNS_HUMAN_RESTORE_REQUIRED'});}finally{observed.restore();}assert.equal(observed.issued.length,1);assert.deepEqual(await snapshot(b.s),before);await assert.rejects(project(observed.issued[0]),{code:'BNS_PREPARATION_REQUIRED'});
});
test('successful cold Working activation revokes its original capability only after the real owner completes',async t=>{
 const {b,input}=await fixture(t),observed=observeWorking();try{assert.equal((await b.owner.activate()).state,'activated');}finally{observed.restore();}assert.equal(observed.issued.length,1);assert.equal((await b.s.input(input.id)).libraryText,'SYNTHETIC protected Working lifetime');await assert.rejects(project(observed.issued[0]),{code:'BNS_PREPARATION_REQUIRED'});
});
