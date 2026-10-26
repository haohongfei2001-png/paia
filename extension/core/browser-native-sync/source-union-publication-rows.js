import {currentOriginalRecoveryWork,checkOriginalRecoveryWork,observeRepositoryWriteFence,requireRepositoryWriteFence,requireRepositoryTransactionScope,requireRepositoryTransactionDataMethods} from '../idb-repository.js';
import {readGroupRows,groupTablePages} from './group-page-reader.js';
import {fail} from './value.js';

// Read reuse only, never a source of authority or a cross-transaction cut. The
// original continuation owners still perform every physical/canonical proof.
// Returned rows cannot be edited into a self-certifying retention snapshot.
const reads=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function current(t,expected=null){
 const r=reads.get(t);if(!r){if(expected)fail('BNS_SOURCE_UNION_PROOF_REQUIRED');return null;}
 if(expected&&r!==expected)fail('BNS_SOURCE_UNION_PROOF_REQUIRED');
 if(r.core.repository!==r.repository||currentOriginalRecoveryWork(r.repository)!==r.ticket)fail('BNS_SOURCE_UNION_PROOF_REQUIRED');
 checkOriginalRecoveryWork(r.repository,r.ticket);requireRepositoryTransactionDataMethods(r.repository,t);
 if(requireRepositoryTransactionScope(r.repository,t)!==r.identity)fail('BNS_SOURCE_UNION_PROOF_REQUIRED');
 requireRepositoryWriteFence(r.repository,r.fence);return r;
}
export function requireSourceUnionPublicationRowsCurrent(t){current(t);}
export async function withSourceUnionPublicationRows(core,t,fn){
 const repository=core.repository,ticket=currentOriginalRecoveryWork(repository);
 if(reads.has(t)||!ticket||typeof fn!=='function')fail('BNS_SOURCE_UNION_PROOF_REQUIRED');
 checkOriginalRecoveryWork(repository,ticket);requireRepositoryTransactionDataMethods(repository,t);
 const identity=requireRepositoryTransactionScope(repository,t);if(identity.mode!=='readonly')fail('BNS_SOURCE_UNION_PROOF_REQUIRED');
 const r={core,repository,ticket,identity,fence:observeRepositoryWriteFence(repository),tables:new Map()};reads.set(t,r);
 try{current(t,r);const result=await fn();current(t,r);return result;}finally{reads.delete(t);}
}
async function readOriginalPages(t,name,r){
 const rows=[],pages=groupTablePages(t,name);
 for(;;){
  // The original iterator owns page bounds, strict keys and its unchanged
  // transaction budget. Authenticate methods at EVERY page await, not merely
  // around the aggregate; a temporary substitution cannot supply later rows.
  current(t,r);const page=await pages.next();current(t,r);
  if(page.done)return rows;rows.push(...page.value);
 }
}
export async function readSourceUnionPublicationRows(t,name){
 const r=current(t);if(!r)return readGroupRows(t,name);
 if(![...t.tx.objectStoreNames].includes(name))fail('BNS_SOURCE_UNION_PROOF_REQUIRED');
 if(!r.tables.has(name)){
  // Store the pending original read as well: concurrent consumers cannot cause
  // a second native acquisition. An unsuccessful read is never reused.
  const pending=readOriginalPages(t,name,r);r.tables.set(name,pending);
  try{const rows=await pending;current(t,r);r.tables.set(name,freeze(rows));}catch(error){r.tables.delete(name);throw error;}
 }
 const rows=await r.tables.get(name);current(t,r);return rows;
}
export async function readSourceUnionPublicationPoint(t,name,id){
 const r=current(t);if(!r)return t.get(name,id);
 if(r.tables.has(name)){const rows=await readSourceUnionPublicationRows(t,name);current(t,r);return rows.find(row=>row.id===id);}
 const row=await t.get(name,id);current(t,r);return row;
}
