import {IndexedArchiveStore} from './indexed-store.js';
import {ArchiveError} from './constants.js';
import {hashText} from './dedupe.js';
import {nextSequence} from './thought-journal.js';

const fail=()=>{throw new ArchiveError('INVALID_REQUEST');};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=200;
const refIds=b=>b.provenance.map(p=>p.sourceRecordId);
const prefix=p=>IDBKeyRange.bound(p,[...p,[]],false,true);
const entity=(kind,id)=>kind+':'+id;
export const REVISION_POLICY=Object.freeze({days:90,importantMinimum:20,coalesceMs:60000});
const blockSnapshot=b=>({libraryText:b.libraryText,note:b.note,excluded:b.excluded,originalTextReference:b.originalTextReference,provenanceSignature:b.provenanceSignature});
const thoughtSnapshot=t=>({title:t.title,thoughtText:t.thoughtText,note:t.note,topics:t.topics,types:t.types});
const major=(a,b)=>{const x=a??'',y=b??'';let start=0,end=0;while(start<Math.min(x.length,y.length)&&x[start]===y[start])start++;while(end<Math.min(x.length,y.length)-start&&x[x.length-end-1]===y[y.length-end-1])end++;return Math.max(x.length,y.length)-start-end>=200||(x.length>=40&&x.length-start-end>x.length/2);};

// The old blocks/documents are the physical Input stores. No legacy authored
// fields are renamed or synthesized into Thoughts. Only this background store writes.
export class IAStore extends IndexedArchiveStore {
 constructor(local,options={}){super(local,{...options,ia:true});this.iaLoaded=false;}
 run(fn){return super.run(async()=>{if(!this.iaLoaded){await this.initializeIA();this.iaLoaded=true;}return fn();});}
 async initializeIA(){
  let m=await this.repository.transaction(false,t=>t.get('meta','ia-migration'));
  if(m?.phase==='active')return;
  if(!m){m={id:'ia-migration',phase:'mapping',cursor:null,count:0,version:1,startedAt:this.clock()};await this.repository.transaction(true,t=>t.put('meta',m));}
  do{
   await this.repository.transaction(true,async t=>{
    const page=await t.page('blockIndex',{index:'bySequence',after:m.cursor??undefined,limit:100});
    for(const {value:ix}of page.rows){const b=(await t.get('blocks',ix.id)).value;await this.initializeInput(t,b,'migration');m.count++;}
    m.cursor=page.next;m.phase=page.next===null?'active':'mapping';
    if(m.phase==='active'){m.verified=true;m.completedAt=this.clock();m.policy=REVISION_POLICY;}
    await t.put('meta',m);
   });
   await this.repository.checkpoint('ia-batch');
  }while(m.phase!=='active');
 }
 iaStatus(){return this.run(()=>this.repository.transaction(false,t=>t.get('meta','ia-migration')));}
 async initializeInput(t,b,reason='baseline'){
  if(await t.get('inputStates',b.id))return;
  const policy=b.branchStatus?'branch_pending':b.status?.startsWith('excluded_legacy')?'legacy_excluded':b.excluded?'user_removed':'active';
  await t.put('inputStates',{id:b.id,documentId:b.documentId,contentRevision:0,removalState:policy,filteringPolicyState:'none',sourceRecordIds:refIds(b),deltaSequence:await nextSequence(t,'input-delta-sequence')});
  if(policy==='user_removed')await this.markRemoval(t,b,true);
  await this.journal(t,{kind:'input',entityId:b.id,documentId:b.documentId,before:blockSnapshot(b),after:blockSnapshot(b),reason,important:true,sourceRecordIds:refIds(b)});
 }
 async saveRecord(t,r,index){
  await super.saveRecord(t,r,index);
  if(r.sourceKey){const legacy=await t.get('inputRemovals','legacy:'+r.id);if(legacy){await t.put('inputRemovals',{...legacy,id:r.sourceKey});await t.delete('inputRemovals',legacy.id);}}
 }
 async prepareInput(t,b,r){
  if(await t.get('inputRemovals',r.sourceKey||'legacy:'+r.id)){b.excluded=true;b.status='excluded_by_user';}
  await this.initializeInput(t,b);
 }
 async markRemoval(t,b,removed){
  for(const id of refIds(b)){const ix=await t.get('recordIndex',id);if(!ix)continue;const key=ix.sourceKey||'legacy:'+id;if(removed)await t.put('inputRemovals',{id:key,blockId:b.id,at:this.clock(),reason:'user_removed'});else await t.delete('inputRemovals',key);}
 }
 async journal(t,data){
  const now=this.clock(),entityKey=entity(data.kind,data.entityId),range=prefix([entityKey]);
  const prior=data.important?null:await t.edge('revisions','byList',range,'prev');
  if(!data.important&&prior&&!prior.important&&prior.reason===data.reason&&Date.parse(now)-Date.parse(prior.windowStartedAt||prior.at)<REVISION_POLICY.coalesceMs&&same(prior.after,data.before)){
   await t.put('revisions',{...prior,after:data.after,at:now});return prior.id;
  }
  const seq=(await t.get('meta','revision-sequence'))||{id:'revision-sequence',value:0};seq.value++;await t.put('meta',seq);const id=this.uuid();await t.put('revisions',{...data,id,entityKey,sequence:seq.value,windowStartedAt:now,at:now,listKey:[entityKey,seq.value],documentList:[data.documentId,seq.value]});if(!['baseline','migration'].includes(data.reason))await this.pruneEntity(t,entityKey);return id;
 }
 async pruneEntity(t,key){
  // Per-entity traversal, newest first; preserve ALL younger entries OR latest 20 important.
  const tx=t.tx.objectStore('revisions'),range=prefix([key]),cutoff=Date.parse(this.clock())-REVISION_POLICY.days*86400000;let important=0;
  await new Promise((resolve,reject)=>{const r=tx.index('byList').openCursor(range,'prev');r.onerror=()=>reject(new ArchiveError('STORAGE_FAILED'));r.onsuccess=()=>{const c=r.result;if(!c){resolve();return;}const row=c.value;if(row.important)important++;if(Date.parse(row.at)<cutoff&&(!row.important||important>REVISION_POLICY.importantMinimum))c.delete();c.continue();};});
 }
 pruneRevisions(){return this.run(async()=>{let cursor;do{cursor=await this.repository.transaction(true,async t=>{const page=await t.page('revisions',{after:cursor,limit:50});for(const key of new Set(page.rows.map(r=>r.value.entityKey)))await this.pruneEntity(t,key);return page.next??undefined;});}while(cursor);return {ok:true};});}
 async afterInputEdit(t,before,after,oldDoc,newDoc,request){
  for(let i=0;i<after.length;i++){
   const a=before[i],b=after[i];await this.initializeInput(t,a);const meta=await t.get('inputStates',b.id);
   const textChanged=a.libraryText!==b.libraryText||a.note!==b.note,removed=a.excluded!==b.excluded;
   if(textChanged)meta.contentRevision++;
   if(removed){meta.removalState=b.excluded?'user_removed':'active';await this.markRemoval(t,b,b.excluded);}
   if(textChanged||removed)meta.deltaSequence=await nextSequence(t,'input-delta-sequence');
   await t.put('inputStates',meta);
   const reason=removed?(b.excluded?'remove':'restore'):request.revisionReason==='restore'?'restore':major(a.libraryText,b.libraryText)?'major_edit':'edit';
   await this.journal(t,{kind:'input',entityId:b.id,documentId:b.documentId,before:blockSnapshot(a),after:blockSnapshot(b),reason,important:reason!=='edit',sourceRecordIds:refIds(b)});
   if(textChanged||removed)await this.invalidate(t,b.id,b.excluded?'input_removed':'source_updated',meta.contentRevision);
  }
  if(request.title!==undefined){await this.journal(t,{kind:'title',entityId:newDoc.id,documentId:newDoc.id,before:{title:oldDoc.userTitle},after:{title:newDoc.userTitle},reason:request.revisionReason==='restore'?'restore':'title_edit',important:true,sourceRecordIds:[]});}
 }
 async afterLegacyResolve(t,before,after){
  await this.afterInputEdit(t,[before],[after],{}, {},{});
  const meta=await t.get('inputStates',after.id);meta.removalState=after.excluded?'user_removed':'active';await t.put('inputStates',meta);await this.markRemoval(t,after,after.excluded);
 }
 // Compatibility entry points converge on the same atomic Input edit path.
 async updateLibrary(id,changes){if(!changes||Object.keys(changes).some(k=>!['libraryText','note'].includes(k)))fail();const b=await this.input(id);return this.editDocument({documentId:b.documentId,blocks:[{id,expectedRevision:b.revision,libraryText:b.libraryText,note:b.note,excluded:b.excluded,...changes}]});}
 async excludeLibrary(id,excluded){const b=await this.input(id);return this.editDocument({documentId:b.documentId,blocks:[{id,expectedRevision:b.revision,libraryText:b.libraryText,note:b.note,excluded}]});}
 async updateDocument(id,changes){if(!changes||Object.keys(changes).some(k=>k!=='userTitle'))fail();const d=await this.run(()=>this.repository.transaction(false,t=>t.get('documents',id)));if(!d)fail();return this.editDocument({documentId:id,title:changes.userTitle,expectedTitleRevision:d.value.titleRevision,blocks:[]});}
 input(id){if(!validId(id))return Promise.reject(new ArchiveError('INVALID_REQUEST'));return this.run(()=>this.repository.transaction(false,async t=>{const b=await t.get('blocks',id);if(!b)fail();return b.value;}));}
 permanentDelete(id){return super.purge(id,true);}
 async beforeSourcePurge(t,records,blocks){
  const ids=new Set(records.map(r=>r.id));
  for(const id of ids)for(const key of await t.keys('revisions','bySourceRecord',id))await t.delete('revisions',key);
  for(const [id,{value:b}]of blocks){
   await this.invalidate(t,id,'source_purged',null);
  const meta=await t.get('inputStates',id);if(meta){meta.sourceRecordIds=meta.sourceRecordIds.filter(x=>!ids.has(x));meta.sourcePurged=true;meta.deltaSequence=await nextSequence(t,'input-delta-sequence');await t.put('inputStates',meta);}
  }
  const affected=new Map();for(const id of ids)for(const row of await t.all('thoughts','bySourceRecord',id))affected.set(row.id,row);
  for(const row of affected.values()){
   if(!row.userEdited&&!row.multiSourceOrigin&&row.provenanceType==='input_derived'){for(const dep of await t.keys('dependencies','byThought',row.id))await t.delete('dependencies',dep);await t.delete('thoughts',row.id);}
   else{row.sourceRecordIds=row.sourceRecordIds.filter(id=>!ids.has(id));row.freshness='stale';row.staleReason='source_purged';row.revision++;await t.put('thoughts',row);}
  }
  // Historical payloads associated with a source are removed above, including
  // Thought revisions. Current user-authored Thoughts survive with detached refs.
 }
 async invalidate(t,inputId,reason,contentRevision){
  const eventId=this.uuid();await t.put('invalidations',{id:eventId,inputId,reason,contentRevision,at:this.clock(),state:'processing'});
  let cursor=null;do{const page=await t.rangePage('dependencies','byInputList',prefix([inputId]),cursor,100);cursor=page.next;
  for(const {value:dep} of page.rows){
   const row=await t.get('thoughts',dep.thoughtId);if(!row)continue;
   row.freshness='stale';row.staleReason=reason;row.revision++;row.updatedAt=this.clock();
   if(reason==='input_removed'||reason==='source_purged'){
    await t.delete('dependencies',dep.id);row.inputRefs=row.inputRefs.filter(r=>r.inputBlockId!==inputId);row.integrity=row.inputRefs.length?'partial':'detached';
    if(!row.userEdited&&!row.multiSourceOrigin&&row.provenanceType==='input_derived'&&!row.inputRefs.length)row.lifecycle='invalidated';
   }
   row.listKey=[row.lifecycle==='active'?0:1,row.id];await t.put('thoughts',row);
  }
  }while(cursor);
  await t.put('invalidations',{id:eventId,inputId,reason,contentRevision,at:this.clock(),state:'completed'});
 }
 revisions({documentId=null,kind=null,entityId=null,cursor=null,limit=50}={}){
  if(!validId(documentId)||kind!==null&&!['input','thought','title'].includes(kind)||entityId!==null&&!validId(entityId)||!Number.isInteger(limit)||limit<1||limit>100||cursor!==null&&(!Array.isArray(cursor)||cursor.length!==2||cursor[0]!==documentId||!Number.isSafeInteger(cursor[1])))return Promise.reject(new ArchiveError('INVALID_REQUEST'));
  return this.run(()=>this.repository.transaction(false,async t=>{
   const range=cursor?IDBKeyRange.bound([documentId],cursor,false,true):prefix([documentId]);
   return new Promise((resolve,reject)=>{const items=[],r=t.tx.objectStore('revisions').index('byDocumentList').openCursor(range,'prev');let last=null;
    r.onerror=()=>reject(new ArchiveError('STORAGE_FAILED'));r.onsuccess=()=>{const c=r.result;if(!c||items.length===limit){resolve({items,nextCursor:c?last:null,policy:REVISION_POLICY});return;}const row=c.value;last=c.key;if((kind===null||row.kind===kind)&&(entityId===null||row.entityId===entityId))items.push(row);c.continue();};
   });
  }));
 }
 async restoreRevision({id,side='before',expectedRevision,operationId}={}){
  if(!validId(id)||!['before','after'].includes(side)||!Number.isSafeInteger(expectedRevision))fail();
  const saved=await this.run(()=>this.repository.transaction(false,async t=>{const row=await t.get('revisions',id);if(!row)fail();for(const sourceId of row.sourceRecordIds)if(!await t.get('records',sourceId))fail();return row;}));
  const value=saved[side];
  if(saved.kind==='input'){
   const b=await this.input(saved.entityId);if(value.provenanceSignature!==b.provenanceSignature)fail();
   return this.editDocument({operationId,documentId:b.documentId,revisionReason:'restore',restoreRevisionId:id,blocks:[{id:b.id,expectedRevision,libraryText:value.libraryText,note:value.note,excluded:value.excluded}]});
  }
  if(saved.kind==='title')return this.editDocument({operationId,documentId:saved.entityId,title:value.title,expectedTitleRevision:expectedRevision,blocks:[],revisionReason:'restore',restoreRevisionId:id});
  return this.editThought({id:saved.entityId,expectedRevision,operationId,changes:value,revisionReason:'restore',restoreRevisionId:id});
 }
 async validateInputEdit(t,request){
  if(request.restoreRevisionId){const r=await t.get('revisions',request.restoreRevisionId);if(!r)fail();for(const id of r.sourceRecordIds)if(!await t.get('records',id))fail();}
 }
 async categoriesFor(t,dimension,values){
  if(!Array.isArray(values)||values.length>30||values.some(v=>typeof v!=='string'||v.trim().length<1||v.length>100))fail();
  const ids=[];for(const value of [...new Set(values.map(v=>v.trim()))]){const id=dimension+':'+value.toLocaleLowerCase();if(!await t.get('categories',id))await t.put('categories',{id,name:value,dimension,createdBy:'user',userAdjusted:true});ids.push(id);}return ids;
 }
 // Foundation API only, deliberately NOT exposed as a runtime UI creation command.
 createThought(data){return this.write(async t=>{
  if(!data||!['input_derived','user_created'].includes(data.provenanceType)||!Array.isArray(data.inputRefs)||data.inputRefs.length>100||data.inputRefs.some(id=>!validId(id))||new Set(data.inputRefs).size!==data.inputRefs.length||data.provenanceType==='input_derived'&&!data.inputRefs.length)fail();
  this.validateThoughtChanges({thoughtText:data.thoughtText,title:data.title??'',note:data.note??''});
  const id=this.uuid(),refs=[],sourceRecordIds=new Set();
  for(const inputId of data.inputRefs){const b=(await t.get('blocks',inputId))?.value,meta=await t.get('inputStates',inputId);if(!b||b.excluded||!meta)fail();if(this.validateThoughtInput)await this.validateThoughtInput(t,b);refs.push({inputBlockId:inputId,basedOnContentRevision:meta.contentRevision});refIds(b).forEach(x=>sourceRecordIds.add(x));}
  const topics=await this.categoriesFor(t,'topic',data.topics||[]),types=await this.categoriesFor(t,'type',data.types||[]);
  const row={id,provenanceType:data.provenanceType,inputRefs:refs,sourceRecordIds:[...sourceRecordIds],provenance:{createdBy:data.provenanceType==='user_created'?'user':'input_derivation',createdAt:this.clock()},multiSourceOrigin:sourceRecordIds.size>1||refs.length>1,title:data.title??'',thoughtText:data.thoughtText,note:data.note??'',topics,types,userEdited:data.provenanceType==='user_created',revision:0,contentRevision:0,lifecycle:'active',freshness:'current',integrity:refs.length?'complete':'detached',staleReason:null,updatedAt:this.clock(),listKey:[0,id]};
  await t.put('thoughts',row);for(const r of refs)await t.put('dependencies',{id:JSON.stringify([r.inputBlockId,id]),inputId:r.inputBlockId,inputList:[r.inputBlockId,id],thoughtId:id,basedOnContentRevision:r.basedOnContentRevision});
  await this.journal(t,{kind:'thought',entityId:id,documentId:id,before:thoughtSnapshot(row),after:thoughtSnapshot(row),reason:'baseline',important:true,sourceRecordIds:[...sourceRecordIds]});return row;
 });}
 validateThoughtChanges(changes){if(!changes||typeof changes!=='object'||Array.isArray(changes)||!Object.keys(changes).length||Object.entries(changes).some(([k,v])=>!['title','thoughtText','note','topics','types'].includes(k)||(['topics','types'].includes(k)?!Array.isArray(v):typeof v!=='string'||v.length>(k==='title'?300:200000))))fail();}
 async thoughtSources(t,row){const ids=new Set();for(const r of row.inputRefs){const b=(await t.get('blocks',r.inputBlockId))?.value;if(b)refIds(b).forEach(id=>ids.add(id));}return [...ids];}
 async checkedThought(t,id){const row=await t.get('thoughts',id);if(!row)fail();for(const ref of row.inputRefs){const meta=await t.get('inputStates',ref.inputBlockId),b=(await t.get('blocks',ref.inputBlockId))?.value;if(!b||b.excluded||meta?.contentRevision!==ref.basedOnContentRevision){row.freshness='stale';row.staleReason='source_updated';}}return row;}
 thought(id){if(!validId(id))return Promise.reject(new ArchiveError('INVALID_REQUEST'));return this.run(()=>this.repository.transaction(false,t=>this.checkedThought(t,id)));}
 thoughtPage({query='',topic='',type='',cursor=null,limit=50}={}){if(typeof query!=='string'||query.length>1000||typeof topic!=='string'||typeof type!=='string'||cursor!==null&&!Array.isArray(cursor)||!Number.isInteger(limit)||limit<1||limit>100)return Promise.reject(new ArchiveError('INVALID_REQUEST'));return this.run(()=>this.repository.transaction(false,async t=>{const page=await t.rangePage('thoughts','byList',prefix([0]),cursor,limit),items=[];for(const {value:r}of page.rows){const row=await this.checkedThought(t,r.id);if((!topic||row.topics.includes(topic))&&(!type||row.types.includes(type))&&(!query||[row.title,row.thoughtText,row.note].some(x=>x.toLocaleLowerCase().includes(query.toLocaleLowerCase()))))items.push(row);}return {items,nextCursor:page.next,categories:await t.all('categories'),emptyText:'尚未整理思想内容'};}));}
 async editThought(request){
  const {id,expectedRevision,changes,operationId,revisionReason='edit',restoreRevisionId}=request||{};if(!validId(id)||!Number.isSafeInteger(expectedRevision))fail();this.validateThoughtChanges(changes);if(operationId!==undefined&&(!validId(operationId)||operationId.length<8))fail();const digest=operationId?await hashText(JSON.stringify(request)):null;
  return this.write(async t=>{if(operationId){const receipt=await t.get('operationReceipts',operationId);if(receipt){if(receipt.digest!==digest)fail();return receipt.result;}}if(restoreRevisionId&&!await t.get('revisions',restoreRevisionId))fail();const row=await this.checkedThought(t,id);if(row.revision!==expectedRevision)return {conflict:true};const before=thoughtSnapshot(row);
   for(const [k,v]of Object.entries(changes)){if(['topics','types'].includes(k)){if(revisionReason==='restore'){for(const categoryId of v)if(!await t.get('categories',categoryId))fail();row[k]=v;}else row[k]=await this.categoriesFor(t,k==='topics'?'topic':'type',v);}else row[k]=v;}
   row.userEdited=true;row.revision++;row.contentRevision++;row.updatedAt=this.clock();await t.put('thoughts',row);const reason=revisionReason==='restore'?'restore':major(before.thoughtText,row.thoughtText)?'major_edit':'edit';await this.journal(t,{kind:'thought',entityId:id,documentId:id,before,after:thoughtSnapshot(row),reason,important:reason!=='edit',sourceRecordIds:await this.thoughtSources(t,row)});const result={ok:true,revision:row.revision};if(operationId)await t.put('operationReceipts',{id:operationId,digest,result});return result;
  });
 }
 // No generator runs in this version. A future provider must supply exact versions.
 refreshThought({id,expectedRevision,inputVersions,thoughtText}={}){this.validateThoughtChanges({thoughtText});return this.write(async t=>{const row=await this.checkedThought(t,id);if(row.userEdited)return {protected:true};if(row.revision!==expectedRevision||row.lifecycle!=='active'||!row.inputRefs.length)return {conflict:true};for(const ref of row.inputRefs){const meta=await t.get('inputStates',ref.inputBlockId),b=(await t.get('blocks',ref.inputBlockId))?.value;if(!b||b.excluded||meta?.contentRevision!==inputVersions?.[ref.inputBlockId])return {conflict:true};}
  const before=thoughtSnapshot(row);row.thoughtText=thoughtText;row.revision++;row.contentRevision++;row.freshness='current';row.staleReason=null;row.updatedAt=this.clock();for(const r of row.inputRefs){r.basedOnContentRevision=inputVersions[r.inputBlockId];await t.put('dependencies',{id:JSON.stringify([r.inputBlockId,id]),inputId:r.inputBlockId,inputList:[r.inputBlockId,id],thoughtId:id,basedOnContentRevision:r.basedOnContentRevision});}await t.put('thoughts',row);await this.journal(t,{kind:'thought',entityId:id,documentId:id,before,after:thoughtSnapshot(row),reason:'ai_update',important:true,sourceRecordIds:await this.thoughtSources(t,row)});return {ok:true};
 });}
}
