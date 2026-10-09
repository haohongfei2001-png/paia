import {ownerVersion,planSearchQueueLocator,planSearchPostings,planSearchPostingRow} from '../library-search.js';
import {humanSearchPlanWitness} from './human-library-plan.js';
import {bytes,clone,equal,fail} from './value.js';
const proofs=new WeakMap();
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
