import {ArchiveError} from './constants.js';
import {conversationMetaId,projectMetaId,projectRef} from './source-structure-model.js';
import {hashText} from './dedupe.js';
import * as K from './read-projection-keys.js';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const gcPrefix=hash=>K.NAV_STATE+'gc:'+hash+':';
const hashFor=(epoch,scope)=>K.scopeHash([epoch,...scope]);
const docKey=(epoch,id)=>K.documentKey(epoch+':'+id);
const root=epoch=>hashFor(epoch,K.rootScope());
const groupSort=(kind,project)=>kind==='project'?(project?.sourceStatus==='confirmed_deleted'?'3':'')+K.projectKey(project?.currentName||'',JSON.stringify(project?.projectRef)):({unassigned:'1',unknown:'2',deleted:'4',detached:'5'}[kind]);
async function state(t,hash,scope,epoch){return await t.get('meta',K.scopeStateId(hash))||{id:K.scopeStateId(hash),version:1,epoch,hash,scope,count:0,revision:0,active:null,activeRevision:-1,shadow:null};}
async function member(t,hash,scope,epoch,id,sort,item){
 const key=K.memberId(hash,id),old=await t.get('meta',key),value=item?{id:key,version:1,epoch,sort,item}:null;
 if(equal(old||null,value))return false;
 const s=await state(t,hash,scope,epoch);s.count+=(value?1:0)-(old?1:0);s.revision++;
 if(value)await t.put('meta',value);else await t.delete('meta',key);
 await t.put('meta',s);return true;
}
async function hierarchy(t,p,epoch){
 const w=await state(t,p.windowHash,p.windowScope,epoch),gs=K.groupScope(p.providerKey);
 const item=w.count?{kind:'group',id:JSON.stringify(p.windowScope),providerKey:p.providerKey,groupKind:p.groupKind,projectRef:p.projectRef,projectMetaId:p.projectMetaId,windowCount:w.count}:null;
 const project=p.projectMetaId?await t.get('meta',p.projectMetaId):null;
 await member(t,p.groupsHash,gs,epoch,p.windowHash,groupSort(p.groupKind,project||{projectRef:p.projectRef}),item);
 const g=await state(t,p.groupsHash,gs,epoch),providerItem=g.count?{kind:'provider',id:JSON.stringify(gs),providerKey:p.providerKey,groupCount:g.count}:null;
 await member(t,p.rootHash,K.rootScope(),epoch,JSON.stringify(gs),p.providerKey===null?'3':K.providerKey(p.providerKey),providerItem);
}
async function publishDocument(t,p,epoch){
 const id=docKey(epoch,p.documentId),old=(await t.get('meta',id))?.projection||null,next=p.projection;
 if(equal(old,next))return;
 if(old&&(!next||old.windowHash!==next.windowHash)){await member(t,old.windowHash,old.windowScope,epoch,p.documentId,'',null);await hierarchy(t,old,epoch);}
 if(next){
  const item={kind:'window',id:p.documentId,documentId:p.documentId,providerKey:next.providerKey,groupKind:next.groupKind,conversationRef:next.conversationRef,projectRef:next.projectRef,projectMetaId:next.projectMetaId,viewHash:next.viewHash,sourceStatus:next.sourceStatus};
  await member(t,next.windowHash,next.windowScope,epoch,p.documentId,next.sort,item);await hierarchy(t,next,epoch);
  await t.put('meta',{id,version:1,epoch,projection:next});
 }else await t.delete('meta',id);
}

// Hashing happens outside IDB transactions. Publication rechecks a durable revision fence.
export class ArchiveNavigationIndex{
 constructor(store,{checkpoint=async()=>{}}={}){this.store=store;this.repository=store.repository;this.checkpoint=checkpoint;}
 transaction(write,fn,stores=['meta']){return this.repository.transaction(write,fn,stores);}
 async prepare(rows,epoch){
  const prepared=await Promise.all(rows.map(async row=>{
   if(!row||!row.libraryDisplay)return {documentId:row?.id,projection:null};
   const d=row.value,ref=d.sourceConversationId?{platform:K.provider(d.platform),sourceConversationId:d.sourceConversationId}:null;
   const conversationId=ref?await conversationMetaId(ref):null;
   return {row,ref,conversationId};
  }));
  await this.transaction(false,async t=>{for(const p of prepared)if(p.conversationId)p.conversation=await t.get('meta',p.conversationId);});
  for(const p of prepared){const m=p.conversation?.membership;p.projectRef=m?.state==='project'?projectRef(m.projectRef):null;p.projectId=p.projectRef?await projectMetaId(p.projectRef):null;}
  await this.transaction(false,async t=>{for(const p of prepared)if(p.projectId)p.project=await t.get('meta',p.projectId);});
  const rootHash=await root(epoch),out=[];
  for(const p of prepared){
   if(!p.row){out.push(p);continue;}
   const {row,ref,conversation:c}=p,kind=!ref?'detached':c?.sourceStatus==='confirmed_deleted'?'deleted':p.projectRef?'project':c?.membership?.state==='unassigned'?'unassigned':'unknown';
   const key=ref?.platform||null,pr=kind==='project'?p.projectRef:null,ws=K.windowScope(key,kind,pr);
   const projection={documentId:row.id,sourceStatus:c?.sourceStatus||'unknown',parentSourceStatus:p.project?.sourceStatus||'unknown',providerKey:key,conversationRef:ref,groupKind:kind,projectRef:pr,projectMetaId:pr?p.projectId:null,windowScope:ws,windowHash:await hashFor(epoch,ws),groupsHash:await hashFor(epoch,K.groupScope(key)),rootHash,groupSort:groupSort(kind,p.project||{projectRef:p.projectRef}),sort:K.windowKey(row.libraryDisplay[0],row.id),viewHash:await hashText(JSON.stringify([row.libraryDisplay,row.value.userTitle,row.value.originalConversationTitle]))};
   out.push({documentId:row.id,projection});
  }return out;
 }
 async catalogStep(){
  let c=await this.transaction(false,t=>t.get('meta',K.NAV_CATALOG));
  if(!c){
   await this.transaction(true,async t=>{if(!await t.get('meta',K.NAV_CATALOG))await t.put('meta',{id:K.NAV_CATALOG,version:1,epoch:crypto.randomUUID(),revision:0,phase:'building',cursor:null,scanComplete:false,scannedDocuments:0,pending:false});});
   return {worked:true,scanned:0,phase:'building'};
  }
  if(!c.scanComplete){
   const batch=await this.transaction(false,t=>t.primaryRangePage('documents',{after:c.cursor,limit:K.NAV_BATCH}),['documents']);
   const prepared=await this.prepare(batch.rows.map(x=>x.value),c.epoch);
   await this.checkpoint('prepared',c);
   const committed=await this.transaction(true,async t=>{
    const now=await t.get('meta',K.NAV_CATALOG);if(!now||now.epoch!==c.epoch||now.revision!==c.revision||now.cursor!==c.cursor)return false;
    for(const p of prepared)await publishDocument(t,p,c.epoch);
    now.cursor=batch.next;now.scanComplete=batch.next===null;now.scannedDocuments+=batch.rows.length;await t.put('meta',now);return true;
   });
   if(committed)await this.checkpoint('batch',c);
   return {worked:true,scanned:batch.rows.length,phase:'building',committed};
  }
  const dirty=await this.transaction(false,t=>t.primaryRangePage('meta',{prefix:K.NAV_DIRTY,limit:1}));
  if(dirty.rows.length)return this.reconcile(c,dirty.rows[0].value);
  if(c.pending||c.phase!=='complete'){
   await this.transaction(true,async t=>{const now=await t.get('meta',K.NAV_CATALOG);if(now?.epoch===c.epoch&&now.revision===c.revision){now.pending=false;now.phase='complete';await t.put('meta',now);}});
   return {worked:true,scanned:0,phase:'building'};
  }
  return {worked:false,scanned:0,phase:'complete',catalog:c};
 }
 async reconcile(c,event){
  if(event.kind==='project')return this.reconcileProject(c,event);
  let batch;
  if(event.kind==='document')batch={rows:[{value:await this.transaction(false,t=>t.get('documents',event.documentId),['documents'])||{id:event.documentId}}],next:null};
  else{
   const key=event.conversationRef.platform+':'+event.conversationRef.sourceConversationId;
   batch=await this.transaction(false,t=>t.indexPrimaryPage('documents','byChat',key,{after:event.cursor,limit:99}),['documents']);
  }
  const prepared=await this.prepare(batch.rows.map(x=>x.value),c.epoch);
  const committed=await this.transaction(true,async t=>{
   const now=await t.get('meta',K.NAV_CATALOG),latest=await t.get('meta',event.id);
   if(!now||now.epoch!==c.epoch||now.revision!==c.revision||!equal(latest,event))return false;
   for(const p of prepared)await publishDocument(t,p,c.epoch);
   if(batch.next===null)await t.delete('meta',event.id);else await t.put('meta',{...event,cursor:batch.next});return true;
  });
  if(committed)await this.checkpoint('reconciled',c);
  return {worked:true,scanned:1+batch.rows.length,phase:'building',committed};
 }
 async reconcileProject(c,event){
  const ref=projectRef(event.projectRef),id=await projectMetaId(ref),ws=K.windowScope(ref.providerKey,'project',ref);
  const p={providerKey:ref.providerKey,groupKind:'project',projectRef:ref,projectMetaId:id,windowScope:ws,windowHash:await hashFor(c.epoch,ws),groupsHash:await hashFor(c.epoch,K.groupScope(ref.providerKey)),rootHash:await root(c.epoch)};
  const committed=await this.transaction(true,async t=>{
   const now=await t.get('meta',K.NAV_CATALOG),latest=await t.get('meta',event.id);
   if(!now||now.epoch!==c.epoch||now.revision!==c.revision||!equal(latest,event))return false;
   const project=await t.get('meta',id);p.groupSort=groupSort('project',project||{projectRef:ref});
   const w=await t.get('meta',K.scopeStateId(p.windowHash));
   if(w?.count){w.revision++;await t.put('meta',w);await hierarchy(t,p,c.epoch);}
   await t.delete('meta',event.id);return true;
  });return {worked:true,scanned:1,phase:'building',committed};
 }
 async scopeStep(scope,c){
  const hash=await hashFor(c.epoch,scope),s=await this.transaction(false,t=>state(t,hash,scope,c.epoch));
  if(s.active&&s.activeRevision===s.revision)return {worked:false,scanned:0,hash,state:s};
  if(!s.shadow||s.shadow.revision!==s.revision){
   await this.transaction(true,async t=>{
    const live=await t.get('meta',K.NAV_CATALOG),now=await state(t,hash,scope,c.epoch);
    if(live?.epoch!==c.epoch||live.revision!==c.revision||live.pending||now.revision!==s.revision)return;
    if(now.shadow)await t.put('meta',{id:gcPrefix(hash)+now.shadow.generation,generation:now.shadow.generation});
    now.shadow={generation:crypto.randomUUID(),revision:now.revision,cursor:null,copied:0};await t.put('meta',now);
   });return {worked:true,scanned:0,hash};
  }
  const batch=await this.transaction(false,t=>t.primaryRangePage('meta',{prefix:K.memberPrefix(hash),after:s.shadow.cursor,limit:K.NAV_BATCH}));
  const committed=await this.transaction(true,async t=>{
   const live=await t.get('meta',K.NAV_CATALOG),now=await state(t,hash,scope,c.epoch);
   if(live?.epoch!==c.epoch||live.revision!==c.revision||live.pending||now.revision!==s.revision||!equal(now.shadow,s.shadow))return false;
   for(const {value}of batch.rows)await t.put('meta',{id:K.pagePrefix(hash,s.shadow.generation)+value.sort+K.stringKey(value.item.id),version:1,epoch:c.epoch,item:value.item});
   now.shadow.cursor=batch.next;now.shadow.copied+=batch.rows.length;
   if(batch.next===null){
    if(now.shadow.copied!==now.count)throw new ArchiveError('STORAGE_FAILED');
    if(now.active)await t.put('meta',{id:gcPrefix(hash)+now.active,generation:now.active});
    now.active=now.shadow.generation;now.activeRevision=now.revision;now.shadow=null;
   }
   await t.put('meta',now);return true;
  });
  if(committed)await this.checkpoint('scopeBatch',s);
  return {worked:true,scanned:batch.rows.length,hash,committed};
 }
 async collect(hash){
  return this.transaction(true,async t=>{
   const markers=await t.primaryRangePage('meta',{prefix:gcPrefix(hash),limit:1});if(!markers.rows.length)return 0;
   const marker=markers.rows[0].value,s=await t.get('meta',K.scopeStateId(hash));
   if(marker.generation===s?.active||marker.generation===s?.shadow?.generation){await t.delete('meta',marker.id);return 1;}
   const batch=await t.primaryRangePage('meta',{prefix:K.pagePrefix(hash,marker.generation),limit:59});
   for(const row of batch.rows)await t.delete('meta',row.key);if(batch.next===null)await t.delete('meta',marker.id);return 1+batch.rows.length;
  });
 }
 async selected(documentId,c){
  if(!documentId)return null;
  const row=await this.transaction(false,t=>t.get('documents',K.identifier(documentId)),['documents']);
  if(!row?.libraryDisplay)return {documentId,available:false};
  const [p]=await this.prepare([row],c?.epoch||'cold');
  return {documentId,available:true,providerKey:p.projection.providerKey,groupKind:p.projection.groupKind,projectRef:p.projection.projectRef,sourceStatus:p.projection.sourceStatus,parentSourceStatus:p.projection.parentSourceStatus};
 }
 scopeHash(scope,c){return hashFor(c.epoch,scope);}
}
