import {backupMetaAllowed} from './backup-format.js';
import {ArchiveError,STORAGE_KEY} from './constants.js';
import {ArchiveStore} from './store.js';
import {workspaceDocuments} from './workspace.js';
import {canonicalChat} from './validation.js';
import {hashText} from './dedupe.js';
import {LIBRARY_STORES,upgradeLibrarySchema} from './thought-schema.js';

export const DATABASE_NAME='paia-archive';
export const STORES=['meta','records','recordIndex','blocks','blockIndex','documents','libraryDocuments','times','tombstones','migrationBackup','sourceCounts','operationReceipts','importTasks','importBatches','importEvidence','importSources'];
export const FILTER_STORES=['filterInputs','filterIntents'];
export const IA_STORES=['inputStates','inputRemovals','thoughts','categories','dependencies','revisions','invalidations'];
const dbCategory=error=>({NotFoundError:'missing_store_or_index',TransactionInactiveError:'transaction_inactive',ConstraintError:'constraint',DataError:'invalid_key_or_index_value',DataCloneError:'uncloneable_value',QuotaExceededError:'quota',AbortError:'transaction_aborted'}[error?.name]||'database_error');
const fail=(error=null)=>Object.assign(new ArchiveError(error?.name==='QuotaExceededError'?'STORAGE_FULL':'STORAGE_FAILED'),{dbCategory:dbCategory(error)});
const req=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(fail(request.error));});
const ordered=v=>Array.isArray(v)?v.map(ordered):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])])):v;
const same=(a,b)=>JSON.stringify(ordered(a))===JSON.stringify(ordered(b));
export const sourceOf=r=>r.sourceKey||null;
export const chatOf=r=>`${r.platform}:${r.chatId||canonicalChat(r.chatUrl)?.id}`;
export const sortOf=r=>[r.sourceSentAt?0:1,r.sourceSentAt||'',r.conversationOrder??1000001,r.id];
export const tombstoneId=t=>typeof t==='string'?'snapshot:'+t:'source:'+t.sourceIdentityHash;
const stripDoc=d=>{const v=structuredClone(d);delete v.sourceRecordIds;return v;};

const backupDataStores=new Set(['importSources','records','blocks','documents','libraryDocuments','inputStates','inputRemovals','thoughts','topics','sections','placements','provenance','dependencies','revisions','thoughtSuppressions','entryRelations','filterInputs','filterIntents','times','tombstones','operationReceipts']);
class Transaction {
 constructor(tx,metrics){this.tx=tx;this.metrics=metrics;}
 async has(store,key){this.metrics.reads++;return (await req(this.tx.objectStore(store).getKey(key)))!==undefined;}
 async get(store,key){this.metrics.reads++;return req(this.tx.objectStore(store).get(key));}
 async put(store,value,key){if(backupDataStores.has(store)||store==='meta'&&backupMetaAllowed(value.id))this.backupChanged=true;this.metrics.writes++;return req(key===undefined?this.tx.objectStore(store).put(value):this.tx.objectStore(store).put(value,key));}
 async delete(store,key){if(backupDataStores.has(store)||store==='meta'&&backupMetaAllowed(key))this.backupChanged=true;this.metrics.writes++;return req(this.tx.objectStore(store).delete(key));}
 async clear(store){if(backupDataStores.has(store))this.backupChanged=true;return req(this.tx.objectStore(store).clear());}
 async count(store,index,key){return req(index?this.tx.objectStore(store).index(index).count(key):this.tx.objectStore(store).count());}
 async all(store,index,key,limit){this.metrics.scans++;const target=index?this.tx.objectStore(store).index(index):this.tx.objectStore(store);const rows=await req(target.getAll(key,limit));this.metrics.reads+=rows.length;return rows;}
 async keys(store,index,key){return req((index?this.tx.objectStore(store).index(index):this.tx.objectStore(store)).getAllKeys(key));}
 async edge(store,index,key,direction='next'){return new Promise((resolve,reject)=>{const r=this.tx.objectStore(store).index(index).openCursor(key,direction);r.onsuccess=()=>resolve(r.result?.value);r.onerror=()=>reject(fail());});}
 async rangePage(store,index,range,after,limit,direction='next'){return new Promise((resolve,reject)=>{const reverse=direction==='prev',rows=[],effective=after?(reverse?(range?.lower!==undefined?IDBKeyRange.bound(range.lower,after,range.lowerOpen,true):IDBKeyRange.upperBound(after,true)):(range?.upper!==undefined?IDBKeyRange.bound(after,range.upper,true,range.upperOpen):IDBKeyRange.lowerBound(after,true))):range,r=this.tx.objectStore(store).index(index).openCursor(effective,direction);r.onerror=()=>reject(fail());r.onsuccess=()=>{const c=r.result;if(!c||rows.length===limit){resolve({rows,next:c?rows.at(-1).key:null});return;}if(after&&(reverse?indexedKeyCompare(c.key,after)>=0:indexedKeyCompare(c.key,after)<=0)){c.continue();return;}this.metrics.reads++;rows.push({key:c.key,value:c.value});c.continue();};});}
 async page(store,{index,after,limit=100}={}){
  const target=index?this.tx.objectStore(store).index(index):this.tx.objectStore(store);
  const range=after===undefined?undefined:IDBKeyRange.lowerBound(after,true);
  return new Promise((resolve,reject)=>{const rows=[],r=target.openCursor(range);r.onerror=()=>reject(fail());r.onsuccess=()=>{const c=r.result;if(!c||rows.length===limit){resolve({rows,next:c?rows.at(-1).key:null});return;}this.metrics.reads++;rows.push({key:c.key,value:c.value});c.continue();};});
 }
}

export class ArchiveRepository {
 constructor(local,{indexedDB=globalThis.indexedDB,name=DATABASE_NAME,checkpoint=async()=>{},ia=false,smartFilter=false,thoughtLibrary=false}={}){this.local=local;this.ia=ia;this.smartFilter=smartFilter;this.thoughtLibrary=thoughtLibrary;this.stores=[...STORES,...(ia?IA_STORES:[]),...(smartFilter?FILTER_STORES:[]),...(thoughtLibrary?LIBRARY_STORES:[])];this.factory=indexedDB;this.name=name;this.checkpoint=checkpoint;this.metrics={reads:0,writes:0,scans:0};}
 async open(){
  if(this.db)return; if(!this.factory)throw fail();
  this.db=await new Promise((resolve,reject)=>{
   let blocked=false;const r=this.factory.open(this.name,this.thoughtLibrary?5:this.smartFilter?4:this.ia?3:2);
   r.onupgradeneeded=event=>{
    const db=r.result;for(const name of this.stores)if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:'id'});
    for(const name of ['importEvidence','importSources']){const st=r.transaction.objectStore(name);if(!st.indexNames.contains('bySource'))st.createIndex('bySource','sourceKey');}
    if(this.ia){
     const indexes={inputStates:{byDocument:'documentId'},inputRemovals:{byBlock:'blockId'},thoughts:{byList:'listKey',bySourceRecord:['sourceRecordIds',{multiEntry:true}]},categories:{byDimension:'dimension'},dependencies:{byInput:'inputId',byInputList:'inputList',byThought:'thoughtId'},revisions:{byEntity:'entityKey',byDocument:'documentId',byDocumentList:'documentList',bySourceRecord:['sourceRecordIds',{multiEntry:true}],byList:'listKey'},invalidations:{byInput:'inputId'}};
     for(const [name,defs] of Object.entries(indexes)){const st=r.transaction.objectStore(name);for(const [key,def] of Object.entries(defs)){const [path,opts]=Array.isArray(def)?def:[def,{}];if(!st.indexNames.contains(key))st.createIndex(key,path,opts);}}
    }
    if(this.smartFilter){const st=r.transaction.objectStore('filterInputs');for(const [name,path] of Object.entries({byDocument:'documentId',byPending:'pendingKey',byFiltered:'filteredKey'}))if(!st.indexNames.contains(name))st.createIndex(name,path);}
    if(this.thoughtLibrary){upgradeLibrarySchema(r.transaction);r.transaction.objectStore('meta').put({id:'thought-ddl',fromVersion:event.oldVersion,toVersion:5});}
    if(event.oldVersion===0){
    const index=r.transaction.objectStore('recordIndex');
    index.createIndex('bySource','sourceKey');index.createIndex('byIdentity',['chatKey','sourceMessageId']);index.createIndex('byChat','chatKey');index.createIndex('byLegacyChat','legacyChat');index.createIndex('byDedupe','dedupeKey',{unique:true});index.createIndex('bySequence','sequence',{unique:true});index.createIndex('byList','listKey');index.createIndex('byTrash','trashKey');index.createIndex('byHidden','hiddenKey');index.createIndex('byKnown',['chatKey','visibleKey','known']);
    const blocks=r.transaction.objectStore('blockIndex');blocks.createIndex('byDocument','documentId');blocks.createIndex('byRecord','recordIds',{multiEntry:true});blocks.createIndex('bySequence','sequence',{unique:true});blocks.createIndex('byTime',['documentId','known','stamp','id']);blocks.createIndex('byExcluded',['documentId','excludedKey']);blocks.createIndex('byAttached','attachedDocument');blocks.createIndex('byList','listKey');
    blocks.createIndex('byKnown',['documentId','excludedKey','known']);
    const docs=r.transaction.objectStore('documents');docs.createIndex('byChat','chatKey');docs.createIndex('bySequence','sequence',{unique:true});docs.createIndex('byDisplay','displayKey');for(const view of ['library','archive','excluded'])docs.createIndex(view+'Display',view+'Display');
    const counts=r.transaction.objectStore('sourceCounts');counts.createIndex('byDocument','documentId');counts.createIndex('byView','views',{multiEntry:true});for(const view of ['library','archive','excluded'])for(const edge of ['First','Last'])counts.createIndex(view+edge,view+edge);
    }
   };
   r.onerror=()=>reject(fail());r.onblocked=()=>{blocked=true;reject(fail());};r.onsuccess=()=>{const db=r.result;if(blocked){db.close();return;}db.onversionchange=()=>{db.close();this.db=null;};resolve(db);};
  });
 }
 async transaction(write,fn,stores=this.stores){
  await this.open();if(write&&!stores.includes('meta'))stores=[...stores,'meta'];let tx;try{tx=this.db.transaction(stores,write?'readwrite':'readonly',write?{durability:'strict'}:undefined);}catch(error){throw fail(error);}
  const done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(fail(tx.error));tx.onerror=()=>{};});
  // The rejection is observed immediately even when the operation also rejects.
  done.catch(()=>{});
  try{const scope=new Transaction(tx,this.metrics),result=await fn(scope);if(write&&scope.backupChanged){const marker=await scope.get('meta','backup-data-generation');await scope.put('meta',{id:'backup-data-generation',value:(marker?.value||0)+1});}await done;return result;}catch(e){try{tx.abort();}catch{}await done.catch(()=>{});if(tx.error?.name==='QuotaExceededError')throw fail(tx.error);if(e instanceof ArchiveError||['STORAGE_FAILED','STORAGE_FULL'].includes(e?.code))throw e;throw fail(e?.name?e:tx.error);}
 }
 async initialize(){
  await this.open();let m=await this.transaction(false,t=>t.get('meta','migration'));
  if(m?.phase==='active'){
   const local=(await this.local.get(STORAGE_KEY))[STORAGE_KEY];
   if(local?.schemaVersion!==6||local.databaseId!==m.databaseId)throw fail();return;
  }
  let saved=(await this.local.get(STORAGE_KEY))[STORAGE_KEY];
  if(!m){
   if(saved?.schemaVersion===6)throw fail();
   // The frozen loader performs the old schema normalization exactly once.
   const memory={async get(){return {[STORAGE_KEY]:structuredClone(saved)};},async set(v){saved=structuredClone(v[STORAGE_KEY]);},async getBytesInUse(){return 0;}};
   const old=new ArchiveStore(memory);await old.load();const state=structuredClone(old.state);
   const digest=await hashText(JSON.stringify(state));
   m={id:'migration',phase:'copying',databaseId:crypto.randomUUID(),cursor:0,digest,verified:false,recoveryVerified:false};
   await this.transaction(true,async t=>{await t.put('migrationBackup',{id:'schema5',state});await t.put('meta',m);});await this.checkpoint('backup');
  }
  if(m.phase==='copying'){
   const backup=await this.transaction(false,t=>t.get('migrationBackup','schema5'));if(!backup||await hashText(JSON.stringify(backup.state))!==m.digest)throw fail();
   // Exercise restoration through the frozen loader; no local writes occur.
   let restored=structuredClone(backup.state);const recovery=new ArchiveStore({async get(){return {[STORAGE_KEY]:restored};},async set(v){restored=v[STORAGE_KEY];}});await recovery.load();
   if(!same(recovery.state,backup.state))throw fail();
   const s=backup.state,rows=[];
   s.records.forEach((r,i)=>{rows.push(['records',{id:r.id,value:r}]);rows.push(['recordIndex',recordIndex(r,i)]);});
   s.library.blocks.forEach((b,i)=>{rows.push(['blocks',{id:b.id,value:b}]);rows.push(['blockIndex',blockIndex(b,i,s.records)]);});
   s.conversations.forEach((d,i)=>rows.push(['documents',{id:d.id,sequence:i,chatKey:d.sourceConversationId?`${d.platform}:${d.sourceConversationId}`:undefined,displayKey:[-(Date.parse(d.lastSourceSentAt)||0),d.id],value:stripDoc(d)}]));
   for(const view of ['library','archive','excluded'])for(const d of workspaceDocuments(s,view)){const row=rows.find(([store,r])=>store==='documents'&&r.id===d.id)[1];row[view+'Display']=[-(Date.parse(d.lastSourceSentAt)||0),d.id];}
   s.library.documents.forEach(d=>rows.push(['libraryDocuments',{id:d.id,value:stripDoc(d)}]));
   Object.entries(s.sourceTimes).forEach(([id,value])=>rows.push(['times',{id,value}]));
   s.tombstones.forEach((value,sequence)=>rows.push(['tombstones',{id:tombstoneId(value),sequence,value}]));
   const byId=new Map(s.records.map(r=>[r.id,r]));
   for(const d of s.conversations){const groups=new Map();for(const b of s.library.blocks.filter(b=>b.documentId===d.id))for(const p of b.provenance){const r=byId.get(p.sourceRecordId);if(!r)continue;const key=r.sourceKey||'legacy:'+r.id;let g=groups.get(key);if(!g){g={records:new Map(),blocks:new Map()};groups.set(key,g);}g.records.set(r.id,r);g.blocks.set(b.id,b);}for(const [key,g]of groups)rows.push(['sourceCounts',sourceCount(d.id,key,[...g.records.values()],[...g.blocks.values()],d.sourceConversationId)]);}
   for(let offset=m.cursor;offset<rows.length;offset+=100){const end=Math.min(offset+100,rows.length);await this.transaction(true,async t=>{for(const [store,value]of rows.slice(offset,end))await t.put(store,value);m={...m,cursor:end};await t.put('meta',m);});await this.checkpoint('copy');}
   const control={settings:s.settings,preferences:s.preferences,diagnostics:s.diagnostics,memoryAccessPolicy:s.memoryAccessPolicy,classificationRules:s.library.classificationRules,filterRules:s.library.filterRules};
   await this.transaction(true,async t=>{await t.put('meta',{id:'control',value:control});await t.put('meta',{id:'sequence',records:s.records.length,blocks:s.library.blocks.length,documents:s.conversations.length});});
   const migrated=await this.materialize();
   // Compare the complete schema5 state, not just counts or selected fields.
   if(!same(migrated,s))throw fail();
   m={...m,phase:'verified',verified:true,recoveryVerified:true,recordCount:s.records.length,blockCount:s.library.blocks.length};
   await this.transaction(true,t=>t.put('meta',m));await this.checkpoint('verified');
  }
  if(m.phase==='verified'){
   const backup=await this.transaction(false,t=>t.get('migrationBackup','schema5'));if(!backup||!same(await this.materialize(),backup.state))throw fail();
   const control=await this.transaction(false,t=>t.get('meta','control'));
   // Old code is tested against this incompatible schema; downgrade is unsupported.
   await this.local.set({[STORAGE_KEY]:{schemaVersion:6,databaseId:m.databaseId,...control.value}});
   await this.checkpoint('sealed');
   await this.transaction(true,async t=>{await t.delete('migrationBackup','schema5');await t.put('meta',{id:'gate',epoch:control.value.settings.epoch,enabled:control.value.settings.enabled});await t.delete('meta','control');await t.put('meta',{...m,phase:'active'});});await this.checkpoint('active');
  }
 }
 async recoverMigration(){
  const {migration,backup}=await this.transaction(false,async t=>({migration:await t.get('meta','migration'),backup:await t.get('migrationBackup','schema5')}));
  if(!migration||migration.phase==='active')throw new ArchiveError('FORBIDDEN');
  if(!['copying','verified'].includes(migration.phase)||!backup||await hashText(JSON.stringify(backup.state))!==migration.digest)throw fail();
  await this.transaction(true,async t=>{
   const current=await t.get('meta','migration');if(current?.phase==='active'||current?.databaseId!==migration.databaseId)throw new ArchiveError('FORBIDDEN');
   for(const name of STORES)if(name!=='migrationBackup')await t.clear(name);
   await t.put('meta',{...migration,phase:'copying',cursor:0,verified:false,recoveryVerified:false});
  });
  await this.initialize();
 }
 async materialize(){const local=(await this.local.get(STORAGE_KEY))[STORAGE_KEY];return this.transaction(false,async t=>{
  const control=(await t.get('meta','control'))?.value||local;if(!control)throw fail();
  const indexes=await t.all('recordIndex','bySequence');const records=[];for(const r of indexes)records.push((await t.get('records',r.id)).value);
  const bs=await t.all('blockIndex','bySequence'),blocks=[];for(const b of bs)blocks.push((await t.get('blocks',b.id)).value);
  const ds=await t.all('documents','bySequence'),documents=[],libraryDocuments=[];
  for(const row of ds){const ids=new Set(blocks.filter(b=>b.documentId===row.id).flatMap(b=>b.provenance.map(p=>p.sourceRecordId)));const selected=records.filter(r=>ids.has(r.id));const sourceRecordIds=selected.map(r=>r.id);documents.push({...row.value,sourceRecordIds});libraryDocuments.push({...((await t.get('libraryDocuments',row.id)).value),sourceRecordIds});}
  const sourceTimes=Object.fromEntries((await t.all('times')).map(r=>[r.id,r.value]));const tombstones=(await t.all('tombstones')).sort((a,b)=>(a.sequence??0)-(b.sequence??0)).map(r=>r.value);
  return {schemaVersion:5,library:{documents:libraryDocuments,blocks,classificationRules:control.classificationRules,filterRules:control.filterRules},memoryAccessPolicy:control.memoryAccessPolicy,settings:control.settings,records,tombstones,sourceTimes,diagnostics:control.diagnostics,conversations:documents,preferences:control.preferences};
 });}
 async tombstones(){return this.transaction(false,async t=>(await t.all('tombstones')).map(r=>r.value));}
 async close(){this.db?.close();this.db=null;}
}
export function recordIndex(r,sequence){return {id:r.id,sequence,sourceKey:r.sourceKey,sourceMessageId:r.sourceMessageId,chatKey:chatOf(r),legacyChat:r.sourceKey?undefined:chatOf(r),dedupeKey:r.dedupeKey,contentHash:r.contentHash,listKey:[chatOf(r),r.hidden||r.deletedAt?1:0,...sortOf(r)],sort:sortOf(r),sourceSentAt:r.sourceSentAt,conversationOrder:r.conversationOrder,hidden:r.hidden,deletedAt:r.deletedAt,trashKey:r.deletedAt?1:0,hiddenKey:r.hidden&&!r.deletedAt?1:0,visibleKey:r.hidden||r.deletedAt?1:0,known:r.sourceSentAt?0:1};}
export function blockIndex(b,sequence,records){const r=records.find(r=>r.id===b.sourceRecordId);return {id:b.id,sequence,documentId:b.documentId,recordIds:b.provenance.map(p=>p.sourceRecordId),attachedDocument:b.provenance.length?b.documentId:undefined,sourceRecordId:b.sourceRecordId,excluded:b.excluded,excludedKey:b.excluded?1:0,known:r?.sourceSentAt?0:1,stamp:r?.sourceSentAt||'',listKey:[b.documentId,b.excluded?1:0,...sortOf({...r,id:b.id})],sort:sortOf({...r,id:b.id}),sourceSentAt:r?.sourceSentAt||null,conversationOrder:r?.conversationOrder??null};}
function indexedKeyCompare(a,b){for(let i=0;i<Math.min(a.length,b.length);i++){if(a[i]<b[i])return -1;if(a[i]>b[i])return 1;}return a.length-b.length;}
export function sourceCount(docId,key,records,blocks,chatId){
 const id=JSON.stringify([docId,key]),row={id,documentId:docId,views:[]};for(const view of ['archive','library','excluded']){
  const selected=view==='archive'?records.filter(r=>(r.chatId===chatId||r.chatKey==='chatgpt:'+chatId)&&!r.hidden&&!r.deletedAt):records.filter(r=>blocks.some(b=>(b.excluded===(view==='excluded'))&&(b.provenance?b.provenance.some(p=>p.sourceRecordId===r.id):b.recordIds.includes(r.id))));
  if(!selected.length)continue;row.views.push(JSON.stringify([docId,view]));const times=selected.map(r=>r.sourceSentAt).filter(Boolean).sort();row[view+'First']=[docId,times.length?0:1,times[0]||'',id];row[view+'Last']=[docId,times.length?0:1,times.at(-1)||'',id];
 }return row;
}
