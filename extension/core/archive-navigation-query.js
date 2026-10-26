import {ArchiveError} from './constants.js';
import {projectRef} from './source-structure-model.js';
import {ArchiveNavigationIndex} from './archive-navigation-index.js';
import {SourceOrderStore,SourceOrderProjection} from './source-ordering.js';
import * as K from './read-projection-keys.js';
const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
export function navigationRequest(options={}){
 if(!options||typeof options!=='object'||Array.isArray(options)||![Object.prototype,null].includes(Object.getPrototypeOf(options))||Object.keys(options).some(k=>!['providerKey','groupKind','projectRef','cursor','limit','mode','selectedDocumentId'].includes(k)))invalid();
 const key=options.providerKey===undefined||options.providerKey===null?null:K.provider(options.providerKey),kind=options.groupKind??(key===null?'providers':'groups'),mode=options.mode??'paia',limit=options.limit??K.NAV_LIMIT;
 if(!['paia','source'].includes(mode)||!Number.isInteger(limit)||limit<1||limit>K.NAV_LIMIT)invalid();
 let scope,ref=null;
 if(kind==='providers'){if(key!==null)invalid();scope=K.rootScope();}
 else if(kind==='groups')scope=K.groupScope(key);
 else if(['project','unassigned','unknown','deleted','detached'].includes(kind)){
  if(kind==='detached'?key!==null:key===null)invalid();
  ref=kind==='project'?projectRef(options.projectRef):null;if(ref&&ref.providerKey!==key)invalid();scope=K.windowScope(key,kind,ref);
 }else invalid();
 if(kind!=='project'&&options.projectRef!==undefined&&options.projectRef!==null)invalid();
 let cursor=null;
 if(options.cursor!==undefined&&options.cursor!==null){
  if(typeof options.cursor!=='string'||options.cursor.length>16384)invalid();
  try{cursor=JSON.parse(options.cursor);}catch{invalid();}
  if(!cursor||cursor.version!==1||Object.keys(cursor).some(k=>!['version','scopeHash','generation','lastKey','mode'].includes(k))||typeof cursor.scopeHash!=='string'||typeof cursor.generation!=='string'||typeof cursor.lastKey!=='string'||!['paia','source'].includes(cursor.mode))invalid();
 }
 return {scope,providerKey:key,groupKind:kind,projectRef:ref,mode,limit,cursor,selectedDocumentId:options.selectedDocumentId==null?null:K.identifier(options.selectedDocumentId)};
}
const base=(q,selectedPath)=>({items:[],nextCursor:null,coverage:{state:'building'},generation:null,effectiveOrdering:'paia',unavailableReason:null,selectedPath,cursorInvalid:false,oldReaderAvailable:true,operations:{metadataScanned:0,sourceRefsScanned:0,inputBodyReads:0}});
export class ArchiveNavigationQuery{
 constructor(store,options={}){this.store=store;this.index=new ArchiveNavigationIndex(store,options);this.sourceOrders=options.sourceOrders||new SourceOrderStore(store);this.sourceProjection=options.sourceProjection||new SourceOrderProjection(store,this.sourceOrders);}
 page(options={}){const q=navigationRequest(options);return this.store.run(async()=>{
  const step=await this.index.catalogStep(),c=await this.index.transaction(false,t=>t.get('meta',K.NAV_CATALOG));
  const selected=await this.index.selected(q.selectedDocumentId,c),result=base(q,selected);
  result.coverage={state:'building',scannedDocuments:c?.scannedDocuments||0,archiveComplete:c?.phase==='complete'&&!c?.pending};
  result.operations.metadataScanned=step.scanned;
  if(step.worked)return this.fenceSelection(result,c);
  const built=await this.index.scopeStep(q.scope,c);result.operations.metadataScanned+=built.scanned;
  if(built.worked)return this.fenceSelection(result,c);
  const ordering=await this.sourceProjection.prepare({query:q,hash:built.hash,state:built.state,catalog:c});
  result.effectiveOrdering=ordering.effectiveOrdering;result.unavailableReason=ordering.unavailableReason;result.operations.sourceRefsScanned=ordering.sourceRefsScanned||0;
  const gc=await this.index.collect(built.hash),prefix=ordering.prefix,generation=ordering.generation;
  return this.index.transaction(false,async t=>{
   const live=await t.get('meta',K.NAV_CATALOG),s=await t.get('meta',K.scopeStateId(built.hash));
   if(live?.epoch!==c.epoch||live.revision!==c.revision||live.pending||s?.active!==built.state.active||s.activeRevision!==s.revision){result.selectedPath=null;return result;}
   result.generation=generation;result.coverage={state:'complete',archiveComplete:true,total:s.count,scannedDocuments:c.scannedDocuments};
   if(q.cursor&&(q.cursor.scopeHash!==built.hash||q.cursor.generation!==generation||q.cursor.mode!==q.mode||!q.cursor.lastKey.startsWith(prefix))){result.cursorInvalid=true;return result;}
   const batch=await t.primaryRangePage('meta',{prefix,after:q.cursor?.lastKey||null,limit:q.limit}),projects=new Map();
   for(const {value}of batch.rows){
    const {viewHash,projectMetaId,...item}=value.item;
    if(item.kind==='window'){
     const row=await t.get('documents',item.documentId);
     if(!row?.libraryDisplay){result.items=[];result.coverage.state='unavailable';result.unavailableReason='INDEX_STALE';return result;}
     item.title=row.value.userTitle||row.value.originalConversationTitle||'';
    }
    if(projectMetaId){
     if(!projects.has(projectMetaId))projects.set(projectMetaId,await t.get('meta',projectMetaId)||null);
     const p=projects.get(projectMetaId);item.parentSourceStatus=p?.sourceStatus||'unknown';
     if(item.kind==='group')item.title=p?.currentName||'';
    }
    result.items.push(item);
   }
   result.operations.metadataScanned=gc+batch.rows.length;
   result.nextCursor=batch.next?JSON.stringify({version:1,scopeHash:built.hash,generation,lastKey:batch.next,mode:q.mode}):null;
   return result;
  },['meta','documents']);
 });}
 async fenceSelection(result,c){
  const live=await this.index.transaction(false,t=>t.get('meta',K.NAV_CATALOG));
  if(!c||live?.epoch!==c.epoch||live.revision!==c.revision)result.selectedPath=null;
  return result;
 }
 status(options={}){const q=navigationRequest(options);return this.store.run(async()=>{
  const snapshot=await this.index.transaction(false,async t=>({catalog:await t.get('meta',K.NAV_CATALOG),backupRevision:(await t.get('meta','backup-data-generation'))?.value||0}));
  const c=snapshot.catalog,result=base(q,await this.index.selected(q.selectedDocumentId,c));
  if(!c){const revision=await this.index.transaction(false,async t=>(await t.get('meta','backup-data-generation'))?.value||0);if(revision!==snapshot.backupRevision)result.selectedPath=null;return result;}
  const hash=await this.index.scopeHash(q.scope,c);
  return this.index.transaction(false,async t=>{
   const live=await t.get('meta',K.NAV_CATALOG),s=await t.get('meta',K.scopeStateId(hash));
   const stable=live?.epoch===c.epoch&&live.revision===c.revision,valid=stable&&!live.pending&&live.phase==='complete';
   if(!stable)result.selectedPath=null;
   result.coverage={state:valid&&s?.active&&s.activeRevision===s.revision?'complete':'building',archiveComplete:valid,scannedDocuments:c.scannedDocuments};
   result.generation=s?.active||null;if(q.mode==='source'&&q.groupKind==='providers'){result.effectiveOrdering='source';result.unavailableReason=null;}else if(q.mode==='source')result.unavailableReason='SOURCE_ORDER_STATUS_PENDING';return result;
  });
 });}
}
