import {inputProjection} from './thought-evidence.js';
import {ArchiveError} from './constants.js';
import {hashText} from './dedupe.js';
import {normalizeSearch} from './search-service.js';
import {validSearchDate,matchesSourceDate} from './input-search-cache.js';
import {validProvider} from './read-projection-keys.js';
import {projectRef as canonicalProjectRef,conversationMetaId} from './source-structure-model.js';

const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
const exact=(value,keys)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key));
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const changed=()=>({items:[],nextCursor:null,searchSnapshot:null,changed:true,restartRequired:true,complete:false});
const generation=async t=>{const value=(await t.get('meta','backup-data-generation'))?.value??0;if(!integer(value))invalid();return value;};

const scopeKeys=['ranked','providerKey','projectRef','includeFiltered','dateFrom','dateTo'];
async function scopeIdentity(query,scope){
 if(!exact(scope,scopeKeys)||typeof query!=='string'||query.length>1000||typeof scope.ranked!=='boolean'||typeof scope.includeFiltered!=='boolean'||scope.providerKey!==null&&!validProvider(scope.providerKey)||!validSearchDate(scope.dateFrom)||!validSearchDate(scope.dateTo)||scope.dateFrom&&scope.dateTo&&scope.dateFrom>scope.dateTo)invalid();
 const selectedProject=scope.projectRef===null?null:canonicalProjectRef(scope.projectRef),normalized={...scope,projectRef:selectedProject};
 return {scope:normalized,signature:await hashText(JSON.stringify([normalizeSearch(query),scope.ranked,scope.providerKey,selectedProject,scope.includeFiltered,scope.dateFrom,scope.dateTo]))};
}
const validSnapshot=(value,signature)=>exact(value,['version','generation','signature'])&&value.version===1&&integer(value.generation)&&value.signature===signature;
export async function prepareInputSearchArrival(store,options){
 const context=options.searchContext;
 if(options.qualifyContext!==true||!exact(context,['query','knownRevision','searchSnapshot','scope'])||!integer(context.knownRevision))invalid();
 const identity=await scopeIdentity(context.query,context.scope);if(!validSnapshot(context.searchSnapshot,identity.signature))invalid();
 // Hashing happens outside the final IDB transaction. Its captured source
 // identity is compared again inside that transaction before membership use.
 await store.run(()=>{});
 const doc=await store.repository.transaction(false,async t=>(await t.get('documents',options.documentId))?.value,['documents']);
 const source=doc?{platform:doc.platform,sourceConversationId:doc.sourceConversationId}:null;
 const membershipId=source&&identity.scope.projectRef?await conversationMetaId(source):null;
 return {...identity,source,membershipId};
}
export async function matchesInputSearchArrival(store,t,input,arrival,filterState){
 if(!arrival)return true;
 const scope=arrival.scope,doc=(await t.get('documents',input.documentId))?.value,ix=await t.get('blockIndex',input.inputId);
 if(!doc||!ix||!arrival.source||doc.platform!==arrival.source.platform||doc.sourceConversationId!==arrival.source.sourceConversationId||scope.providerKey&&doc.platform!==scope.providerKey||!matchesSourceDate(ix.sourceSentAt,scope.dateFrom,scope.dateTo))return false;
 if(!scope.includeFiltered&&await store.isFiltered(t,input.block,filterState))return false;
 if(scope.projectRef){const membership=(await t.get('meta',arrival.membershipId))?.membership;if(membership?.state!=='project')return false;try{if(JSON.stringify(canonicalProjectRef(membership.projectRef))!==JSON.stringify(scope.projectRef))return false;}catch{return false;}}
 return true;
}

// A read qualification fence around the existing ranked/cache/scan owners. Source
// structure and filter metadata participate in the repository's same generation.
// No cursor can continue across that fence, including the Project post-filter's
// separate read transactions. Snapshots carry no query, content or source names.
export async function qualifiedInputSearch(store,options,search){
 const {query='',cursor=null,limit=50,ranked=false,providerKey=null,projectRef=null,includeFiltered=true,dateFrom='',dateTo='',searchSnapshot=null}=options;
 if(Object.keys(options).some(key=>!['query','cursor','limit','ranked','providerKey','projectRef','includeFiltered','dateFrom','dateTo','qualified','searchSnapshot'].includes(key)))invalid();
 if(typeof query!=='string'||query.length>1000||typeof ranked!=='boolean'||!Number.isInteger(limit)||limit<1||limit>100||typeof includeFiltered!=='boolean'||providerKey!==null&&!validProvider(providerKey)||!validSearchDate(dateFrom)||!validSearchDate(dateTo)||dateFrom&&dateTo&&dateFrom>dateTo)invalid();
 const selectedProject=projectRef===null?null:canonicalProjectRef(projectRef);
 if(cursor!==null&&(ranked?(!exact(cursor,['phase','offset'])||![0,1,2].includes(cursor.phase)||cursor.offset!==null&&!integer(cursor.offset)):!integer(cursor)))invalid();
 const {signature,scope}=await scopeIdentity(query,{ranked,providerKey,projectRef:selectedProject,includeFiltered,dateFrom,dateTo});
 if(searchSnapshot!==null&&(!exact(searchSnapshot,['version','generation','signature'])||searchSnapshot.version!==1||!integer(searchSnapshot.generation)||searchSnapshot.signature!==signature))invalid();
 if(cursor!==null&&searchSnapshot===null)invalid();
 await store.finishFoundation?.();await store.run(()=>{});
 const start=await store.repository.transaction(false,generation,['meta']);
 if(searchSnapshot!==null&&searchSnapshot.generation!==start)return changed();
 const result=await search();
 return store.repository.transaction(false,async t=>{
  if(await generation(t)!==start)return changed();
  const items=[];
  for(const item of result.items){
   const current=await inputProjection(store,t,item.id);
   if(!current||!integer(current.contentRevision)||current.documentId!==item.documentId)return changed();
   items.push({...item,contentRevision:current.contentRevision});
  }
  return {...result,items,searchSnapshot:{version:1,generation:start,signature},searchScope:scope,changed:false,restartRequired:false,complete:result.nextCursor===null};
 });
}
