import {prepareBodyEdit,bindingRead} from './thought-binding.js';
import {prefix,keys,fail,idOK,revisionOK,ENTRY_FIELDS,validateFields,keyedHash,markHuman,FAMILY_BY_TYPE,refreshEntryIndex,entrySnapshot} from './thought-model.js';
import {journal,nextSequence} from './thought-journal.js';
import {sharedWorkingProjection,editSharedBodyFromEntry} from './shared-working-content.js';
export async function editLibraryBatch(store,r){
 keys(r,['operationId','entries','reason'],['operationId','entries']);if(!Array.isArray(r.entries)||!r.entries.length||r.entries.length>40||new Set(r.entries.map(e=>e.id)).size!==r.entries.length||new TextEncoder().encode(JSON.stringify(r)).length>1024*1024||r.reason!==undefined&&!['edit','undo','redo','restore'].includes(r.reason))fail();
 for(const e of r.entries){keys(e,['id','expectedRevision','expectedFieldRevisions','changes','expectedInputRevision'],['id','expectedRevision','expectedFieldRevisions','changes']);if(!idOK(e.id)||!revisionOK(e.expectedRevision))fail();validateFields(e.changes);keys(e.expectedFieldRevisions,ENTRY_FIELDS);for(const f of Object.keys(e.changes))if(!revisionOK(e.expectedFieldRevisions[f]))fail();}
 const prior=await store.priorOperation(r);if(prior)return prior;
 const initial=await store.run(()=>store.repository.transaction(false,async t=>{const secret=(await t.get('meta','thought-suppression-key')).value,rows=[];for(const e of r.entries){const row=await t.get('thoughts',e.id);if(!row||row.storageSchema!==2)fail();rows.push(row);}return {secret,rows};}));
 const signatures=await Promise.all(r.entries.map((e,i)=>keyedHash(initial.secret,['body',e.changes.type??initial.rows[i].type,e.changes.body??initial.rows[i].thoughtText])));
 return store.operation(r,async t=>{
  const rows=[];for(const [i,e]of r.entries.entries()){const row=await t.get('thoughts',e.id);if(!row||row.lifecycle!=='active'||!await store.sourcePresent(t,row.sourceRecordIds))return {conflict:true,unavailable:true};const fields=Object.keys(e.changes).filter(f=>row.fieldRevisions[f]!==e.expectedFieldRevisions[f]);if(fields.length||row.thoughtText!==initial.rows[i].thoughtText||row.type!==initial.rows[i].type)return {conflict:true,entryId:e.id,fields};rows.push(row);}
  const modes=new Map(),desiredByInput=new Map(),snapshots=new Map();
  for(const [i,e]of r.entries.entries()){
   snapshots.set(e.id,entrySnapshot(rows[i]));
   if(Object.hasOwn(e.changes,'body')&&e.changes.body!==rows[i].thoughtText){const mode=await prepareBodyEdit(store,t,rows[i],{...e,operationId:r.operationId},r.reason);if(mode.conflict)return mode;
    if(mode.shared){const prior=desiredByInput.get(mode.inputId);if(prior!==undefined&&prior!==e.changes.body)return {conflict:true,entryId:e.id,fields:['body']};desiredByInput.set(mode.inputId,e.changes.body);}modes.set(e.id,mode);
   }
  }
  const items=[];for(const [i,e]of r.entries.entries()){let row=rows[i],sharedBody=false,revisionId=null,sharedRevision=null;const mode=modes.get(e.id);if(mode?.shared){
    // A previous entry in this batch may already have propagated the same
    // Input body to this sibling. Re-read that transaction's current mirror.
    row=await t.get('thoughts',e.id);const shared=await editSharedBodyFromEntry(store,t,row,e.changes.body,r.operationId,{expectedInputRevision:e.expectedInputRevision});if(shared?.conflict)throw new Error('STALE_BASE');sharedBody=!!shared?.shared;row=await t.get('thoughts',e.id);if(sharedBody){sharedRevision=await t.edge('revisions','byList',prefix(['library_entry:'+row.id]),'prev');if(sharedRevision?.operationId===r.operationId)revisionId=sharedRevision.id;}
   }else if(!mode?.detached)row=await t.get('thoughts',e.id);
   const before=snapshots.get(e.id),baseRevision=row.revision,fields=[];for(const [f,v]of Object.entries(e.changes)){if(f==='body'&&sharedBody)continue;const k=f==='body'?'thoughtText':f;if(row[k]===v)continue;row[k]=v;row.fieldRevisions[f]++;markHuman(row,f,r.operationId,store.clock());fields.push(f);}if(fields.length){if(fields.includes('body'))row.thoughtEditedAt=store.clock();if(fields.includes('body')||fields.includes('title'))row.contentRevision++;row.family=FAMILY_BY_TYPE[row.type];row.types=['type:'+row.type];row.revision++;row.meaningfulContentAt=fields.includes('body')?store.clock():(row.meaningfulContentAt||row.updatedAt||row.createdAt);row.updatedAt=store.clock();row.updatedSequence=await nextSequence(t);
    // A sibling's shared edit may have changed this body since hashes were
    // prepared. Leave that signature for maintenance instead of indexing old text.
    if(row.thoughtText===(e.changes.body??initial.rows[i].thoughtText)&&row.type===(e.changes.type??initial.rows[i].type))row.exactSignature=signatures[i];else delete row.exactSignature;
    delete row.exactKey;refreshEntryIndex(row);await t.put('thoughts',row);
    if(sharedBody&&revisionId){
     // Complete the revision created by Input propagation before this atomic
     // transaction commits, so Undo includes the body and companion fields.
     await t.put('revisions',{...sharedRevision,before,after:entrySnapshot(row),fieldMask:[...new Set([...sharedRevision.fieldMask,...fields])],afterRevision:row.revision});
    }else revisionId=await journal(store,t,{kind:'library_entry',entityId:row.id,before,after:entrySnapshot(row),fieldMask:fields,actor:'user',reason:r.reason||'edit',important:true,operationId:r.operationId,baseRevision,afterRevision:row.revision,sourceRecordIds:row.sourceRecordIds});
   }items.push({id:row.id,detached:!!mode?.detached,shared:sharedBody,revisionId});}
  // Later edits in the batch can update earlier siblings through their Input.
  // Return only versions and bindings from the final state of this transaction.
  for(const item of items){const row=await t.get('thoughts',item.id),view=await bindingRead(store,t,row);Object.assign(item,{revision:row.revision,fieldRevisions:row.fieldRevisions,bodyBinding:view.bodyBinding,currentInputRevision:view.currentInputRevision});}return {items};
 });
}
