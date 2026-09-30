import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {hashText} from '../core/dedupe.js';
import {OperationAttemptLedger} from '../core/operation-outcome.js';
import {WorkingInputSaveSession} from '../ui/working-input-save.js';

async function fixture(){
 const {s,storage,indexedDB}=await setup(OrganizerStore),page=await s.snapshot(),b=page.library.blocks[0];
 const edit={operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id:b.id,expectedRevision:b.revision,libraryText:'SYNTHETIC durable edit, not a private source',note:b.note,excluded:b.excluded}]};
 const query={version:1,namespace:'working-input',ownerRef:b.documentId,operationId:edit.operationId,requestDigest:await hashText(JSON.stringify(edit)),epoch:await s.recoveryDraftEpoch()};
 return {s,storage,indexedDB,b,edit,query};
}

test('Q1 reads a durable, owner/digest-bound receipt after lost acknowledgement without duplicating revisions',async()=>{
 const {s,storage,indexedDB,b,edit,query}=await fixture();
 const publish=s.publish.bind(s);s.publish=async()=>{await publish();throw Error('Synthetic acknowledgement loss after transaction commit');};
 await assert.rejects(s.editDocument(edit));
 const restarted=new OrganizerStore(storage,{indexedDB});
 assert.deepEqual(await restarted.operationOutcome(query),{state:'committed',result:{ok:true}});
 assert.equal((await restarted.input(b.id)).revision,b.revision+1);
 assert.deepEqual(await restarted.editDocument(edit),{ok:true});
 assert.equal((await restarted.input(b.id)).revision,b.revision+1);
 assert.deepEqual(await restarted.operationOutcome({...query,requestDigest:'0'.repeat(64)}),{state:'unknown'});
 assert.deepEqual(await restarted.operationOutcome({...query,ownerRef:'another-owner'}),{state:'unknown'});
 assert.deepEqual(await restarted.operationOutcome({...query,epoch:'pre-restore'}),{state:'unknown'});
 assert.equal(JSON.stringify(await restarted.operationOutcome(query)).includes('SYNTHETIC'),false);
 await s.repository.transaction(true,t=>t.delete('operationReceipts',edit.operationId));
 assert.deepEqual(await s.operationOutcome(query),{state:'unknown'},'a publish failure after durable commit cannot leave false negative knowledge when the receipt is unavailable');
});

test('Q1 never infers non-commit from absence; an actual aborted transaction provides only bounded worker-lifetime negative knowledge',async()=>{
 const {s,storage,indexedDB,b,edit,query}=await fixture();
 assert.deepEqual(await s.operationOutcome(query),{state:'unknown'});
 const transaction=s.repository.transaction.bind(s.repository);
 s.repository.transaction=(write,fn,...rest)=>transaction(write,async t=>{const result=await fn(t);if(write)throw Error('Synthetic transaction abort');return result;},...rest);
 await assert.rejects(s.editDocument(edit));
 assert.equal((await s.input(b.id)).revision,b.revision);
 assert.deepEqual(await s.operationOutcome(query),{state:'not_committed'});
 const restarted=new OrganizerStore(storage,{indexedDB});
 assert.deepEqual(await restarted.operationOutcome(query),{state:'unknown'});
 s.repository.transaction=transaction;
 await s.editDocument(edit);
 assert.deepEqual(await s.operationOutcome(query),{state:'committed',result:{ok:true}});
});

test('Q1 serialized fresh read waits for the actual in-flight transaction',async()=>{
 const {s,edit,query}=await fixture();let release,entered;
 const started=new Promise(r=>entered=r),held=new Promise(r=>release=r),transaction=s.repository.transaction.bind(s.repository);
 s.repository.transaction=async(write,fn,...rest)=>{if(write){entered();await held;}return transaction(write,fn,...rest);};
 const saving=s.editDocument(edit);await started;
 let resolved=false;const reading=s.operationOutcome(query).then(result=>{resolved=true;return result;});
 await new Promise(r=>setImmediate(r));assert.equal(resolved,false);
 release();await saving;assert.deepEqual(await reading,{state:'committed',result:{ok:true}});
});

test('Q1 rejects enumeration/extra data, isolates legacy receipts, and invalidates acknowledgement after restore',async()=>{
 const {s,edit,query}=await fixture();
 for(const changes of [{body:'private'},{namespace:'thought'},{version:2},{requestDigest:'not-a-digest'},{operationId:[]},{epoch:null}])assert.throws(()=>s.operationOutcome({...query,...changes}),{code:'INVALID_REQUEST'});
 await s.editDocument(edit);
 await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'synthetic-new-restore'}));
 assert.deepEqual(await s.operationOutcome(query),{state:'unknown'});
 await s.repository.transaction(true,t=>t.put('operationReceipts',{id:query.operationId,digest:query.requestDigest,result:{ok:true}}));
 assert.deepEqual(await s.operationOutcome({...query,epoch:'synthetic-new-restore'}),{state:'unknown'});
});

test('Q1 negative knowledge is body-free, bounded and conservatively evicted',()=>{
 const ledger=new OperationAttemptLedger(2),query={ownerRef:'owner',operationId:'operation-1',requestDigest:'digest',epoch:'initial'};
 const pending=ledger.begin(query);pending.epoch='initial';assert.equal(ledger.read(query),'unknown');
 ledger.settle(query,pending,false);assert.equal(ledger.read(query),'not_committed');
 ledger.begin({...query,operationId:'operation-2'});ledger.begin({...query,operationId:'operation-3'});
 assert.equal(ledger.attempts.size,2);assert.equal(ledger.read(query),'unknown');
});

test('Reader reconciles a lost acknowledgement through the production receipt, keeping a newer local edit separate',async()=>{
 const {s,b,edit,query}=await fixture();let writes=0;
 const session=new WorkingInputSaveSession(async(type,fields)=>{if(type==='EDIT_DOCUMENT'){writes++;await s.editDocument(fields.edit);throw Error('Synthetic response channel loss');}return s.operationOutcome(fields.query);});
 const acknowledged=await session.save(edit,query.epoch);
 assert.deepEqual(acknowledged,{edit,result:{ok:true}});assert.equal(writes,1);assert.equal(session.pending,null);
 const next={...edit,operationId:crypto.randomUUID(),blocks:[{...edit.blocks[0],expectedRevision:b.revision+1,libraryText:'SYNTHETIC newer typing'}]};
 await session.save(next,query.epoch);assert.equal(writes,2);assert.equal((await s.input(b.id)).libraryText,next.blocks[0].libraryText);
});

test('Reader keeps unknown operations stable and blocks autosave/new UUID retry until trusted reconciliation',async()=>{
 const {edit,query}=await fixture();let writes=0,state='unknown';const seen=[];
 const session=new WorkingInputSaveSession(async(type,fields)=>{seen.push({type,fields});if(type==='EDIT_DOCUMENT'){writes++;throw Error('Synthetic request never reached worker');}return state==='committed'?{state,result:{ok:true}}:{state};});
 await assert.rejects(session.save(edit,query.epoch),{code:'SAVE_OUTCOME_UNKNOWN'});
 const newer={...edit,operationId:crypto.randomUUID(),blocks:[{...edit.blocks[0],libraryText:'SYNTHETIC new draft'}]};
 await assert.rejects(session.save(newer,query.epoch),{code:'SAVE_OUTCOME_UNKNOWN'});
 assert.equal(writes,1);assert.equal(session.pending.edit,edit);assert.equal(session.unresolved,true);
 assert.equal(seen.at(-1).fields.query.operationId,edit.operationId);
 state='committed';assert.equal((await session.save(newer,query.epoch)).edit,edit);assert.equal(writes,1);
});

test('Reader retries only a known aborted attempt and retains its exact operation ID and payload',async()=>{
 const {s,b,edit,query}=await fixture();const transaction=s.repository.transaction.bind(s.repository);let abort=true,writes=0;
 s.repository.transaction=(write,fn,...rest)=>transaction(write,async t=>{const result=await fn(t);if(write&&abort)throw Error('Synthetic atomic failure');return result;},...rest);
 const session=new WorkingInputSaveSession(async(type,fields)=>{if(type==='EDIT_DOCUMENT'){writes++;return s.editDocument(fields.edit);}return s.operationOutcome(fields.query);});
 await assert.rejects(session.save(edit,query.epoch));assert.equal(session.unresolved,false);
 abort=false;const newer={...edit,operationId:crypto.randomUUID()};
 const acknowledged=await session.save(newer,query.epoch);assert.equal(acknowledged.edit,edit);assert.equal(writes,2);
 assert.equal((await s.input(b.id)).revision,b.revision+1);
});

test('Reader protects an undo back to the old baseline while the earlier save outcome is unknown',async()=>{
 const {DocumentEditor}=await import('../ui/library.js');const {RevisionSession}=await import('../ui/editor-primitives.js');
 const {b,edit}=await fixture();
 const editor=Object.create(DocumentEditor.prototype);
 Object.assign(editor,{id:edit.documentId,title:'',savedTitle:'',titleRevision:0,revisions:new RevisionSession(),entries:new Map([[b.id,{revision:b.revision,saved:{libraryText:b.libraryText,note:b.note,excluded:b.excluded},local:{libraryText:b.libraryText,note:b.note,excluded:b.excluded}}]]),saveSession:{pending:{edit,state:'unknown'}}});
 assert.equal(editor.dirty(),false,'undo matches the old baseline but cannot discard unknown-save recovery intent');
 const recoveryEdit=editor.buildEdit();assert.ok(recoveryEdit);
 assert.equal(recoveryEdit.blocks[0].libraryText,b.libraryText);
 assert.equal(recoveryEdit.blocks[0].expectedRevision,b.revision);
 assert.notEqual(recoveryEdit.operationId,edit.operationId,'changed recovery body never reuses the unresolved operation ID');
 assert.equal(editor.saveSession.pending.edit,edit,'the acknowledgement query still refers to the earlier exact operation');
 editor.saveSession.pending.edit={...edit,title:'SYNTHETIC pending title',expectedTitleRevision:0,blocks:[]};
 const titleUndo=editor.buildEdit();assert.equal(titleUndo.title,'');assert.equal(titleUndo.expectedTitleRevision,0);
});
