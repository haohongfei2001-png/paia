import {ownerVersion,planSearchQueueLocator,planSearchPostings,planSearchPostingRow} from '../library-search.js';
import {humanSearchPlanWitness,branchRawMeasure,requireOriginalMixedNativeCanonicalCut,requireOriginalMixedNativeSearchInputs} from './human-library-plan.js';
import {bytes,clone,equal,fail} from './value.js';
const proofs=new WeakMap();
const mixedProofs=new WeakMap();
const kinds={entry:'thoughts',topic:'topics',section:'sections'};
const limits={thoughts:128,topics:128,sections:128,revisions:128,libraryMigrationItems:128,librarySearchTerms:32768};
const sort=rows=>[...rows].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
const key=(kind,id)=>JSON.stringify([kind,id]);
function binding(store,core){
 if(!store?.libraryDocumentMode||!store.foundationLoaded||!store.bindingsLoaded||!store.documentsLoaded||store.repository!==core?.repository||store.humanLibraryJournal?.core!==core)fail('BNS_HUMAN_BINDING_REQUIRED');
}
async function read(store,core,t){
 const raw={coreIdentity:{datasetId:core.datasetId,deviceId:core.deviceId,prefix:core.prefix,fixedNamespace:core.fixedNamespace},namespace:await core.bind(t),rows:{}};
 for(const [name,limit]of Object.entries(limits)){
  if(await t.count(name)>limit)fail('BNS_HUMAN_GRAPH_LIMIT');
  raw.rows[name]=sort(await t.all(name));
 }
 raw.rebuild=await t.get('meta','library-search-rebuild')??null;
 if(bytes(raw).length>4*1024*1024)fail('BNS_HUMAN_GRAPH_LIMIT');
 return raw;
}
function qualify(raw){
 if(raw.rebuild!==null&&!equal(raw.rebuild,{id:'library-search-rebuild',phase:3,cursor:null,complete:true}))fail('BNS_HUMAN_SEARCH_UNPROVEN');
 const owners=new Map(),tasks=new Map(),postings=new Map(),completed=new Set();
 for(const [kind,name]of Object.entries(kinds))for(const row of raw.rows[name]){
  if(kind==='entry'&&(row.storageSchema!==2||row.provenanceType!=='user_created'||row.origin!=='user')||kind==='topic'&&row.createdBy!=='user'||!['active','removed'].includes(row.lifecycle)||!Array.isArray(row.sourceRecordIds??[])||(row.sourceRecordIds??[]).length)fail('BNS_HUMAN_SEARCH_UNPROVEN');
  const id=key(kind,row.id);if(owners.has(id)||row.searchVersion!==ownerVersion(kind,row))fail('BNS_HUMAN_SEARCH_UNPROVEN');owners.set(id,row);
 }
 for(const task of raw.rows.libraryMigrationItems){
  const id=key(task.ownerKind,task.ownerId),owner=owners.get(id);
  if(!owner||tasks.has(id)||!equal(task,planSearchQueueLocator(task.ownerKind,owner)))fail('BNS_HUMAN_SEARCH_UNPROVEN');tasks.set(id,task);
 }
 for(const posting of raw.rows.librarySearchTerms){
  const id=key(posting.ownerKind,posting.ownerId);if(!owners.has(id))fail('BNS_HUMAN_SEARCH_UNPROVEN');const list=postings.get(id)??[];list.push(posting);postings.set(id,list);
 }
 for(const [id,row]of owners){
  const [kind]=JSON.parse(id),actual=postings.get(id)??[];
  if(Object.hasOwn(row,'indexedSearchVersion')){
   if(row.indexedSearchVersion!==ownerVersion(kind,row)||tasks.has(id))fail('BNS_HUMAN_SEARCH_UNPROVEN');
   const task=planSearchQueueLocator(kind,row),expected=planSearchPostings(kind,row).map(item=>planSearchPostingRow(task,item,row));
   if(!equal(sort(actual),sort(expected)))fail('BNS_HUMAN_SEARCH_UNPROVEN');completed.add(id);
  }else if(actual.length)fail('BNS_HUMAN_SEARCH_UNPROVEN');
 }
 return {owners,completed};
}
// Same original search semantics on a borrowed authenticated native cut. The
// original query owner must first exactly consume every non-search migration
// row. Neither arbitrary subsets nor another captured repository are accepted.
export function prepareOriginalMixedNativeSearch(nonce,store,core,scope,plan,raw,queue){
 if(arguments.length!==7)fail('BNS_HUMAN_SEARCH_PROOF_REQUIRED');requireOriginalMixedNativeSearchInputs(nonce,store,core,scope,plan,raw,queue);
 const search={rows:{thoughts:raw.rows.thoughts,topics:raw.rows.topics,sections:raw.rows.sections,revisions:raw.rows.revisions,libraryMigrationItems:queue,librarySearchTerms:raw.rows.librarySearchTerms},rebuild:raw.rows.meta.find(row=>row.id==='library-search-rebuild')??null},verified=qualify(search);
 // Pending owners still owe their exact original locator. The old standalone
 // qualifier's permissive absent-task state is not native completion proof.
 if(queue.length!==verified.owners.size-verified.completed.size)fail('BNS_HUMAN_SEARCH_UNPROVEN');
 const cap=Object.freeze({});mixedProofs.set(cap,{nonce,store,core,scope,plan,raw,...verified});return cap;
}
function mixedProof(cap){const p=mixedProofs.get(cap);if(!p)fail('BNS_HUMAN_SEARCH_PROOF_REQUIRED');requireOriginalMixedNativeCanonicalCut(p.nonce,p.store,p.core,p.scope,p.plan,p.raw);return p;}
export function originalMixedNativeSearchCounts(cap){const p=mixedProof(cap);return Object.freeze({owners:p.owners.size,completed:p.completed.size});}
export function projectOriginalMixedNativeSearchRow(cap,type,row){
 const p=mixedProof(cap),out=clone(row);
 if(Object.hasOwn(kinds,type)){
  const id=key(type,row.id);if(p.owners.get(id)!==row)fail('BNS_HUMAN_SEARCH_PROOF_REQUIRED');
  if(Object.hasOwn(out,'indexedSearchVersion')){if(!p.completed.has(id)||out.indexedSearchVersion!==ownerVersion(type,row))fail('BNS_HUMAN_SEARCH_UNPROVEN');delete out.indexedSearchVersion;}
 }else if(type==='history'){
  if(!p.raw.rows.revisions.includes(row))fail('BNS_HUMAN_SEARCH_PROOF_REQUIRED');
  // This finite creation profile has no named historical indexed-phase grant.
  // In particular, a current Topic's tag cannot authorize its old baseline.
  if(Object.hasOwn(out,'indexedSearchVersion')||out.kind==='topic'&&['before','after'].some(side=>out[side]&&Object.hasOwn(out[side],'indexedSearchVersion')))fail('BNS_HUMAN_SEARCH_UNPROVEN');
 }
 return out;
}
export function releaseOriginalMixedNativeSearch(cap){const p=mixedProofs.get(cap);if(!p)fail('BNS_HUMAN_SEARCH_PROOF_REQUIRED');p.owners.clear();p.completed.clear();mixedProofs.delete(cap);}
const pendingDescriptor=Object.getOwnPropertyDescriptor,pendingOwn=Object.hasOwn;
function pendingDataField(value,key,required=false,code='BNS_HUMAN_SEARCH_UNPROVEN'){
 const d=pendingDescriptor(value,key);
 if(!d){if(required||key in value)fail(code);return;}
 if(!pendingOwn(d,'value')||!d.enumerable)fail(code);
}
// Unused computation for the restricted pending-search family. Its caller
// must first qualify every excluded physical migration row independently.
// Supplied rows/counts never authenticate a cut, budget, scope or permission.
export function inspectHumanUnindexedSearch(raw){
 if(arguments.length!==1||!raw||typeof raw!=='object'||'value'in Object.prototype)fail('BNS_HUMAN_SEARCH_UNPROVEN');
 // Shape only: an original parent still owes native origin, cut and budget.
 // Ordinary immutable data is the supported input, not a Proxy guarantee.
 pendingDataField(raw,'rows',true);pendingDataField(raw,'rebuild',true);
 if(!raw.rows||typeof raw.rows!=='object')fail('BNS_HUMAN_SEARCH_UNPROVEN');
 for(const name of Object.keys(limits))pendingDataField(raw.rows,name,true,'BNS_HUMAN_GRAPH_LIMIT');
 let total=0;
 for(const [name,limit]of Object.entries(limits)){
  const rows=raw?.rows?.[name];
  if(!Array.isArray(rows)||rows.length>limit)fail('BNS_HUMAN_GRAPH_LIMIT');
  if(Object.getPrototypeOf(rows)!==Array.prototype||Object.getOwnPropertySymbols(rows).length||Object.getOwnPropertyNames(rows).length!==rows.length+1)fail('BNS_HUMAN_SEARCH_UNPROVEN');
 }
 for(const name of Object.values(kinds)){
  for(let i=0;i<raw.rows[name].length;i++){
   pendingDataField(raw.rows[name],String(i),true);const row=pendingDescriptor(raw.rows[name],String(i)).value;
   if(!row||typeof row!=='object'||Object.getOwnPropertySymbols(row).length||Object.hasOwn(row,'indexedSearchVersion'))fail('BNS_HUMAN_SEARCH_UNPROVEN');
   for(const key of ['id','storageSchema','provenanceType','origin','createdBy','lifecycle','sourceRecordIds','searchVersion','contentRevision','fieldRevisions','searchSafetyVersion','revision','layoutGeneration'])pendingDataField(row,key);
   for(const key of ['id','storageSchema','provenanceType','origin','createdBy','lifecycle','searchVersion','contentRevision','searchSafetyVersion','revision','layoutGeneration'])if(row[key]!==null&&typeof row[key]==='object'||typeof row[key]==='function'||typeof row[key]==='symbol')fail('BNS_HUMAN_SEARCH_UNPROVEN');
   if(row.fieldRevisions!==undefined&&row.fieldRevisions!==null){if(typeof row.fieldRevisions!=='object')fail('BNS_HUMAN_SEARCH_UNPROVEN');pendingDataField(row.fieldRevisions,'type');if(row.fieldRevisions.type!==null&&typeof row.fieldRevisions.type==='object'||typeof row.fieldRevisions.type==='function'||typeof row.fieldRevisions.type==='symbol')fail('BNS_HUMAN_SEARCH_UNPROVEN');}
  }
  total+=raw.rows[name].length;
 }
 // One exact task per owner follows from original uniqueness/locator checks
 // plus equal total cardinality. Never send an indexed owner into tokens.
 if(total>128||raw.rows.libraryMigrationItems.length!==total||raw.rows.librarySearchTerms.length)fail('BNS_HUMAN_SEARCH_UNPROVEN');
 for(let i=0;i<raw.rows.libraryMigrationItems.length;i++){pendingDataField(raw.rows.libraryMigrationItems,String(i),true);const task=pendingDescriptor(raw.rows.libraryMigrationItems,String(i)).value;if(!task||typeof task!=='object')fail('BNS_HUMAN_SEARCH_UNPROVEN');pendingDataField(task,'ownerKind',true);pendingDataField(task,'ownerId',true);}
 branchRawMeasure(raw,4*1024*1024,null,true);
 branchRawMeasure(raw,4*1024*1024,null,'native');
 const verified=qualify(raw);
 const owners=verified.owners.size,completed=verified.completed.size;
 verified.owners.clear();verified.completed.clear();
 if(owners!==total||completed)fail('BNS_HUMAN_SEARCH_UNPROVEN');
 return Object.freeze({version:1,state:'NOT_ADMITTED',unindexedOwners:owners,exactQueueTasks:total,postings:0,executionProfileQualified:false,budgetAuthority:false,nativeQualified:false});
}
// Private readonly prerequisite only; no production caller registers it.
export async function captureHumanCompletedSearch(store,core){
 binding(store,core);const database=store.repository.db,raw=await store.run(()=>core.transaction(false,t=>{if(t.tx.db!==database)fail('BNS_HUMAN_CHANGED');return read(store,core,t);}));if(store.repository.db!==database)fail('BNS_HUMAN_CHANGED');const qualified=qualify(raw),cap=Object.freeze({});
 proofs.set(cap,{store,core,repository:store.repository,database,raw,...qualified});return cap;
}
function proofBinding(p){binding(p.store,p.core);if(p.store.repository!==p.repository||p.repository.db!==p.database||!equal(p.raw.coreIdentity,{datasetId:p.core.datasetId,deviceId:p.core.deviceId,prefix:p.core.prefix,fixedNamespace:p.core.fixedNamespace}))fail('BNS_HUMAN_CHANGED');}
export async function requireHumanCompletedSearch(t,cap){
 const p=proofs.get(cap);if(!p||!t?.tx||t.tx.mode!=='readwrite')fail('BNS_HUMAN_SEARCH_PROOF_REQUIRED');proofBinding(p);if(t.tx.db!==p.database)fail('BNS_HUMAN_CHANGED');
 if(!equal(await read(p.store,p.core,t),p.raw))fail('BNS_HUMAN_CHANGED');
}
function original(cap,namedPlan,type,row,phase){
 const p=proofs.get(cap);if(!p)fail('BNS_HUMAN_SEARCH_PROOF_REQUIRED');proofBinding(p);
 const view=humanSearchPlanWitness(namedPlan,p.store,p.core),hit=view.rows.find(item=>item.type===type&&item.after.id===row?.id);
 if(!hit||!['CANONICAL_BEFORE','CANONICAL_AFTER'].includes(phase)||!equal(row,phase==='CANONICAL_BEFORE'?hit.before:hit.after))fail('BNS_HUMAN_SEARCH_PROOF_REQUIRED');return {p,view,hit};
}
function canonicalRow(p,view,type,row){
 const out=clone(row);if(!Object.hasOwn(out,'indexedSearchVersion'))return out;
 const id=key(type,row.id),captured=p.owners.get(id),before=view.rows.find(item=>item.type===type&&item.after.id===row.id)?.before;
 if(!kinds[type]||!p.completed.has(id)||!equal(captured,before)||out.indexedSearchVersion!==captured.indexedSearchVersion)fail('BNS_HUMAN_SEARCH_UNPROVEN');
 delete out.indexedSearchVersion;return out;
}
export function projectHumanSearchRow(cap,namedPlan,type,row,phase){
 if(row===null){const p=proofs.get(cap);if(!p)fail('BNS_HUMAN_SEARCH_PROOF_REQUIRED');proofBinding(p);const view=humanSearchPlanWitness(namedPlan,p.store,p.core);if(phase!=='CANONICAL_BEFORE'||!view.rows.some(item=>item.type===type&&item.before===null))fail('BNS_HUMAN_SEARCH_PROOF_REQUIRED');return null;}const {p,view}=original(cap,namedPlan,type,row,phase);
 if(kinds[type])return canonicalRow(p,view,type,row);
 const out=clone(row);
 if(type==='history'&&row.kind==='topic'){
  const topic=view.rows.find(item=>item.type==='topic'&&item.after.id===row.entityId),id=key('topic',row.entityId),captured=p.owners.get(id);
  for(const side of ['before','after'])if(out[side]&&Object.hasOwn(out[side],'indexedSearchVersion')){
   // These are exact original history phases, before queueSearch/touch. Never
   // compare with the final Topic or erase phase-specific semantic fields.
   if(!topic||!p.completed.has(id)||!equal(topic.before,captured)||out[side].indexedSearchVersion!==captured.indexedSearchVersion||side==='before'&&!equal(out[side],captured))fail('BNS_HUMAN_SEARCH_UNPROVEN');
   delete out[side].indexedSearchVersion;
  }
 }
 return out;
}
