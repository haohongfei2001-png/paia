import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from '../worktree-working-lifetime/extension/tests/vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../worktree-working-lifetime/extension/core/library-documents-store.js';
import {BrowserNativeSyncCore} from '../worktree-working-lifetime/extension/core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../worktree-working-lifetime/extension/core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../worktree-working-lifetime/extension/core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../worktree-working-lifetime/extension/core/browser-native-sync/input-working-journal.js';
import {InputWorkingCommitReceiver,projectOriginalWorkingHistory} from '../worktree-working-lifetime/extension/core/browser-native-sync/input-working-commit.js';
import {HumanLibrarySyncJournal} from '../worktree-working-lifetime/extension/core/browser-native-sync/human-library-journal.js';
import {buildCheckpoint,StagedSyncRestore} from '../worktree-working-lifetime/extension/core/browser-native-sync/checkpoints.js';
import {local,capture,inputEdit} from '../worktree-working-lifetime/extension/tests/harness/thought-m1.mjs';
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
const project=row=>projectOriginalWorkingHistory(row.receiver.store,row.receiver.core,row.cap,{type:'inputWorkingCommit',id:row.prepared.descriptor.revisionId,operations:[...row.prepared.members,row.prepared.descriptor]},[],0,new Map());
test('baseline original Human-first refusal creates no Working capability and preserves every row',async t=>{
 const {b}=await fixture(t,{human:true,conflict:true}),before=await snapshot(b.s),observed=observeWorking();try{await assert.rejects(b.owner.activate(),{code:'BNS_HUMAN_RESTORE_REQUIRED'});}finally{observed.restore();}assert.equal(observed.issued.length,0);assert.deepEqual(await snapshot(b.s),before);
});
test('baseline actual successful Working capability remains consumable after cold activation',async t=>{
 const {b}=await fixture(t),observed=observeWorking();try{assert.equal((await b.owner.activate()).state,'activated');}finally{observed.restore();}assert.equal(observed.issued.length,1);assert.ok((await project(observed.issued[0])).rows.length>0);
});
