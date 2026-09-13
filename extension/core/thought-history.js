import {keys,fail,entrySnapshot,markHuman,refreshEntryIndex,FAMILY_BY_TYPE} from './thought-model.js';
import {bindingSource,applyBinding,REVERSE_ROW,validReverse,bindingRead} from './thought-binding.js';
import {editSharedBodyFromEntry} from './shared-working-content.js';
import {journal,nextSequence} from './thought-journal.js';
export async function thoughtEditHistory(s,r){
 keys(r,['operationId','items','confirmArchive'],['operationId','items']);if(!Array.isArray(r.items)||!r.items.length||r.items.length>40||new Set(r.items.map(x=>x.id)).size!==r.items.length||r.confirmArchive!==undefined&&typeof r.confirmArchive!=='boolean')fail();
 return s.operation(r,async t=>{
  const plans=[],sharedTargets=new Map();for(const item of r.items){keys(item,['id','revisionId','side','expectedRevision','expectedInputRevision'],['id','revisionId','side','expectedRevision']);if(!['before','after'].includes(item.side))fail();
   const rev=await t.get('revisions',item.revisionId),row=await s.readableEntry(t,item.id);if(!rev||rev.kind!=='library_entry'||rev.entityId!==row.id||!await s.sourcePresent(t,rev.sourceRecordIds))fail();
   const target=rev[item.side],opposite=rev[item.side==='before'?'after':'before'];if(row.lifecycle!=='active'||row.revision!==item.expectedRevision||!target)return {conflict:true};
   const p=await bindingSource(s,t,row),shared=rev.reason==='shared_entry_edit';
   if(shared&&(!p||row.bodyBinding!=='input'||p.contentRevision!==item.expectedInputRevision||row.thoughtText!==opposite.body))return {conflict:true};
   if(!shared&&rev.fieldMask.includes('body')&&target.bodyBinding==='input'&&(!p||p.body!==target.body||p.contentRevision!==target.bindingRevision))return {conflict:true,sourceChanged:true};
   if(shared){if(sharedTargets.has(p.inputId)&&sharedTargets.get(p.inputId)!==target.body)return {conflict:true};sharedTargets.set(p.inputId,target.body);}
   const policy=await t.get('meta',REVERSE_ROW);if(shared&&!(validReverse(policy)&&policy.enabled)&&r.confirmArchive!==true)return {conflict:true,requiresArchiveConfirmation:true};
   plans.push({item,rev,row,target,p,shared});
  }
  // Rebinding a historical body must agree with every Input write planned by
  // this batch. Validate both orders before changing any body or history row.
  for(const {rev,target,p,shared}of plans)if(!shared&&rev.fieldMask.includes('body')&&target.bodyBinding==='input'&&sharedTargets.has(p.inputId)&&sharedTargets.get(p.inputId)!==target.body)return {conflict:true,sourceChanged:true};
  const items=[],writtenInputs=new Set();for(const plan of plans){let {item,rev,row,target,p,shared}=plan;const before=entrySnapshot(row);row=await t.get('thoughts',row.id);
   if(shared&&!writtenInputs.has(p.inputId)){const result=await editSharedBodyFromEntry(s,t,row,target.body,r.operationId,{expectedInputRevision:p.contentRevision,undoAuthorized:true});if(!result?.shared)fail();writtenInputs.add(p.inputId);row=await t.get('thoughts',row.id);}
   for(const field of rev.fieldMask.filter(x=>['body','note','type','title','formation'].includes(x)&&!(shared&&x==='body'))){row[field==='body'?'thoughtText':field]=target[field];row.fieldRevisions[field]++;markHuman(row,field,r.operationId,s.clock(),'restore');}
   if(rev.fieldMask.includes('body')){if(!shared)applyBinding(row,target.bodyBinding==='input'?{bodyBinding:'input',workingInputId:p.inputId,bindingRevision:p.contentRevision,bindingLength:p.body.length}:{bodyBinding:'thought'});if(target.bodyProtection)row.protections.body=structuredClone(target.bodyProtection);if(target.bodyAuthorship)row.authorship.body=structuredClone(target.bodyAuthorship);for(const key of ['hasHumanAction','userEdited'])if(typeof target[key]==='boolean')row[key]=target[key];delete row.thoughtEditedAt;if(target.thoughtEditedAt)row.thoughtEditedAt=target.thoughtEditedAt;
    // These flags describe the entire Thought. A body snapshot cannot revoke
    // protection for a note/title/organization field that remains human work.
    if(Object.entries(row.protections||{}).some(([field,value])=>field!=='body'&&value.locked)||Object.entries(row.authorship||{}).some(([field,value])=>field!=='body'&&value.everHumanConfirmed)){row.hasHumanAction=true;row.userEdited=true;}
   }
   row.family=FAMILY_BY_TYPE[row.type];row.types=['type:'+row.type];row.revision++;row.contentRevision++;row.updatedAt=s.clock();row.updatedSequence=await nextSequence(t);delete row.exactKey;delete row.exactSignature;refreshEntryIndex(row);await t.put('thoughts',row);await journal(s,t,{kind:'library_entry',entityId:row.id,before,after:entrySnapshot(row),fieldMask:rev.fieldMask,actor:'user',reason:'restore',important:true,operationId:r.operationId,baseRevision:item.expectedRevision,afterRevision:row.revision,sourceRecordIds:row.sourceRecordIds});
   items.push({id:row.id});
  }
  // A later shared-body restoration can propagate into a preceding metadata
  // restoration. Publish the final committed versions for the whole batch.
  for(const item of items)item.revision=(await t.get('thoughts',item.id)).revision;
  return {items};
 });
}
