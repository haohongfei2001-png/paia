import {ArchiveError,CONSENT_VERSION} from './constants.js';

const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
const unavailable=()=>{throw new ArchiveError('REMOVAL_SCOPE_UNAVAILABLE');};
const idOK=id=>typeof id==='string'&&id.length>0&&id.length<=200;
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const only=(value,keys)=>object(value)&&Object.keys(value).every(key=>keys.includes(key));
const prefix=p=>IDBKeyRange.bound(p,[...p,[]],false,true);
export const REMOVAL_LIMITS=Object.freeze({members:1000,metadata:10000,workingBytes:8*1024*1024,dependencies:10000});

export function validateRemovalTarget(target){
 if(!only(target,['kind','ref'])||!['conversation','input'].includes(target.kind)||!idOK(target.ref))invalid();
 return target;
}
// The reviewed command contains references only. It is hashed unchanged by
// the existing Working Input receipt owner; canonical bodies stay in blocks.
export function validateRemovalEdit(edit){
 if(!only(edit,['operationId','documentId','blocks','removeScope'])||!idOK(edit.documentId)||typeof edit.operationId!=='string'||edit.operationId.length<8||edit.operationId.length>128||!Array.isArray(edit.blocks)||edit.blocks.length)invalid();
 const scope=edit.removeScope;
 if(!only(scope,['version','target','members'])||scope.version!==1)invalid();
 validateRemovalTarget(scope.target);
 if(scope.target.kind==='conversation'&&scope.target.ref!==edit.documentId||!Array.isArray(scope.members)||!scope.members.length||scope.members.length>REMOVAL_LIMITS.members)invalid();
 if(scope.target.kind==='input'&&(scope.members.length!==1||scope.members[0]?.id!==scope.target.ref))invalid();
 const ids=new Set();
 for(const ref of scope.members){if(!only(ref,['id','expectedRevision'])||!idOK(ref.id)||!Number.isSafeInteger(ref.expectedRevision)||ref.expectedRevision<0||ids.has(ref.id))invalid();ids.add(ref.id);}
 return scope;
}

async function consent(store,t){if((await store.control(t)).settings.consentVersion!==CONSENT_VERSION)throw new ArchiveError('CONSENT_REQUIRED');}
async function canonicalMember(store,t,ix,documentId,budget){
 const b=(await t.get('blocks',ix.id))?.value,state=await t.get('inputStates',ix.id);
 if(!b||!state||b.id!==ix.id||b.documentId!==documentId||ix.documentId!==documentId||state.documentId!==documentId||!Number.isSafeInteger(b.revision)||b.revision<0||!Number.isSafeInteger(state.contentRevision)||state.contentRevision<0||!Array.isArray(b.provenance)||b.provenance.length>2000||b.provenance.some(p=>!object(p)||!idOK(p.sourceRecordId))||!Array.isArray(state.sourceRecordIds)||state.sourceRecordIds.length>2000||new Set(state.sourceRecordIds).size!==state.sourceRecordIds.length||state.sourceRecordIds.some(id=>!idOK(id))||typeof b.excluded!=='boolean'||!(b.libraryText===null||typeof b.libraryText==='string'&&b.libraryText.length<=200000)||typeof b.note!=='string'||b.note.length>200000||b.provenanceSignature!==JSON.stringify(b.provenance))unavailable();
 budget.bytes+=new TextEncoder().encode((b.libraryText??'')+b.note).length;
 if(budget.bytes>REMOVAL_LIMITS.workingBytes)unavailable();
 const sources=new Set([b.sourceRecordId,b.originalTextReference,...b.provenance.map(p=>p?.sourceRecordId)].filter(Boolean));
 if(sources.size>2000||b.libraryText===null&&!b.originalTextReference)unavailable();
 for(const id of sources){budget.sources.add(id);if(budget.sources.size>2000||!idOK(id))unavailable();const source=await t.get('recordIndex',id);if(!source||!await t.has('records',id)||await t.has('tombstones','source:'+source.sourceKey)||await t.has('tombstones','snapshot:'+source.dedupeKey))unavailable();}
 if(state.sourceRecordIds.some(id=>!sources.has(id)))unavailable();
 if(t.tx.objectStoreNames.contains('dependencies')){const current=t.tx.objectStore('dependencies').indexNames.contains('byInputTarget');budget.refs+=await t.count('dependencies',current?'byInputTarget':'byInput',current?prefix([b.id]):b.id);}
 if(t.tx.objectStoreNames.contains('provenance'))budget.refs+=await t.count('provenance','byInputVersion',prefix([b.id]));
 if(budget.refs>REMOVAL_LIMITS.dependencies)unavailable();
 return {b,state,filtered:store.isFiltered?await store.isFiltered(t,b,(await t.get('meta','smart-filter'))):false};
}

async function readMembers(store,t,target,documentId){
 await consent(store,t);
 if(!await t.get('documents',documentId)||!await t.get('libraryDocuments',documentId))unavailable();
 const budget={bytes:0,refs:0,sources:new Set()};
 if(target.kind==='input'){
  const ix=await t.get('blockIndex',target.ref);if(!ix||ix.documentId!==documentId)unavailable();
  return [await canonicalMember(store,t,ix,documentId,budget)];
 }
 const indexes=await t.all('blockIndex','byDocument',documentId,REMOVAL_LIMITS.members+1);
 if(!indexes.length||indexes.length>REMOVAL_LIMITS.members)unavailable();
 const states=await t.all('inputStates','byDocument',documentId,REMOVAL_LIMITS.metadata+1);
 if(states.length>REMOVAL_LIMITS.metadata)unavailable();
 const indexed=new Set(indexes.map(row=>row.id));
 if(indexed.size!==indexes.length)unavailable();
 for(const state of states)if(!indexed.has(state.id)){
  // Pure Source purge deliberately keeps these safety-floor rows. They are
  // not current members and are never deleted or recreated by this command.
  if(state.sourcePurged!==true||!Array.isArray(state.sourceRecordIds)||state.sourceRecordIds.length||await t.has('blocks',state.id))unavailable();
 }
 const members=[];for(const ix of indexes)members.push(await canonicalMember(store,t,ix,documentId,budget));
 return members;
}

export async function prepareRemoval(store,t,request){
 if(!only(request,['target']))invalid();const target=validateRemovalTarget(request.target);
 const documentId=target.kind==='conversation'?target.ref:(await t.get('blocks',target.ref))?.value?.documentId;if(!idOK(documentId))unavailable();
 const members=await readMembers(store,t,target,documentId);
 const edit={operationId:store.uuid(),documentId,blocks:[],removeScope:{version:1,target:{...target},members:members.map(({b})=>({id:b.id,expectedRevision:b.revision}))}};
 return {target:{...target},coverage:'complete',inputCount:members.length,activeCount:members.filter(({b})=>!b.excluded).length,alreadyRemovedCount:members.filter(({b})=>b.excluded).length,branchCount:members.filter(({b})=>!!b.branchStatus).length,filteredCount:members.filter(({filtered})=>filtered).length,canUndo:false,retains:{source:true,history:true},edit};
}

export async function expandRemoval(store,t,edit){
 const scope=validateRemovalEdit(edit),members=await readMembers(store,t,scope.target,edit.documentId),expected=new Map(scope.members.map(ref=>[ref.id,ref.expectedRevision]));
 if(expected.size!==members.length||members.some(({b})=>expected.get(b.id)!==b.revision))return {conflict:true};
 return {...edit,blocks:members.map(({b})=>({id:b.id,expectedRevision:b.revision,libraryText:b.libraryText,note:b.note,excluded:true}))};
}
