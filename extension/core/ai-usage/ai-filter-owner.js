// Original SmartFilterStore's default-off AI visibility facet. No Provider,
// remote dispatch, entitlement minting, Source writer or canonical body store.
// The private adapter is installed only by a separately qualified service. Its
// resolve result is bound to exact user input ids; isCurrent must synchronously
// retire that grant on opt-in, entitlement, consent or policy changes. A model
// response or caller-supplied version string is never this constructor capability.
import {ArchiveError,CONSENT_VERSION} from '../constants.js';
import {inputProjection} from '../thought-evidence.js';
import {normalizePresence,validFilterDecision,FILTER_VERSIONS} from '../smart-filter.js';
const fail=(code='UNAVAILABLE')=>{throw new ArchiveError(code);};
const id=x=>typeof x==='string'&&x.length>0&&x.length<=200;
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const bytes=x=>new TextEncoder().encode(x).length;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
function exact(x,keys){if(!plain(x)||Reflect.ownKeys(x).length!==keys.length||keys.some(k=>!Object.hasOwn(Object.getOwnPropertyDescriptor(x,k)||{},'value')))fail('INVALID_REQUEST');}
function list(x,max){if(!Array.isArray(x)||!x.length||x.length>max||Reflect.ownKeys(x).length!==x.length+1||Array.from({length:x.length},(_,i)=>Object.getOwnPropertyDescriptor(x,String(i))).some(d=>!d||!Object.hasOwn(d,'value'))||x.some(v=>!id(v))||new Set(x).size!==x.length)fail('INVALID_REQUEST');return [...x].sort();}
function scope(value){exact(value,['candidateIds','neighborIds']);const candidateIds=list(value.candidateIds,8),neighborIds=list(value.neighborIds,2);if(neighborIds.some(x=>candidateIds.includes(x)))fail('INVALID_REQUEST');return {candidateIds,neighborIds};}
// Read only own data descriptors: accessors, holes and extra array keys never
// execute while admitting an operation. No caller-owned object survives this cut.
function decisionSnapshot(value,candidateIds){
 if(!Array.isArray(value)||value.length!==candidateIds.length||Reflect.ownKeys(value).length!==value.length+1)fail('INVALID_REQUEST');
 const result=[];
 for(let i=0;i<value.length;i++){
  const slot=Object.getOwnPropertyDescriptor(value,String(i));if(!slot||!Object.hasOwn(slot,'value'))fail('INVALID_REQUEST');
  const d=slot.value;exact(d,['inputId','decision']);
  const inputId=Object.getOwnPropertyDescriptor(d,'inputId').value,decision=Object.getOwnPropertyDescriptor(d,'decision').value;
  if(!id(inputId)||!['FILTER','KEEP','INSUFFICIENT'].includes(decision))fail('INVALID_REQUEST');
  result.push(Object.freeze({inputId,decision}));
 }
 if(!same(result.map(d=>d.inputId).sort(),candidateIds))fail('INVALID_REQUEST');return Object.freeze(result);
}
const absent=p=>p?.version===1&&p.confidence==='verified'&&p.attachment==='absent'&&p.reference==='absent';
const cleanRow=row=>{const r=structuredClone(row);delete r.aiDecision;delete r.filteredKey;return r;};
const request=s=>({purpose:'ai-maintenance-filter',candidateIds:[...s.candidateIds],neighborIds:[...s.neighborIds]});
function permission(value,s){
 exact(value,['allowed','tier','optIn','processingConsent','inputIds','epochs','policy']);
 if(value.allowed!==true||value.tier!=='pro'||value.optIn!==true||value.processingConsent!==true||!same(list(value.inputIds,10),[...s.candidateIds,...s.neighborIds].sort()))fail();
 exact(value.epochs,['entitlement','optIn','processing','userRead']);if(!Object.values(value.epochs).every(id))fail();
 exact(value.policy,['version','qualificationId']);if(value.policy.version!=='pro-ambiguous-1'||!id(value.policy.qualificationId))fail();
 return structuredClone(value);
}
export class AIMaintenanceFilterOwner {
 #store;#authority;#handles=new WeakMap();#last=null;#states=new Set();#preparing=0;
 constructor(store,authority=null){this.#store=store;this.#authority=authority;}
 #retire(state){state.active=false;state.proof=null;this.#states.delete(state);}
 release(handle){const state=this.#handles.get(handle);if(state)this.#retire(state);}
 // Read-only original-handle fence for an already selected service packet.
 // Never resolves a replacement grant or reads bodies; stale handles retire.
 assertCurrent(handle){this.#live(this.#handles.get(handle));return true;}
 #time(){const value=Date.parse(this.#store.clock());if(!integer(value)||this.#last!==null&&value<this.#last){for(const state of this.#states)this.#retire(state);fail('STALE_BASE');}this.#last=value;for(const state of this.#states)if(value>=state.created+300000)this.#retire(state);return value;}
 #ready(){if(typeof this.#authority?.resolve!=='function'||typeof this.#authority?.isCurrent!=='function')fail();}
 #current(grant){this.#ready();if(this.#authority.isCurrent(grant)!==true)fail('STALE_BASE');}
 #live(state,currentGrant=null){
  if(!state?.active)fail('STALE_BASE');
  try{
   if(this.#time()>=state.created+300000)fail('STALE_BASE');
   this.#current(state.raw);if(currentGrant)this.#current(currentGrant);
   if(!state.active||this.#time()>=state.created+300000)fail('STALE_BASE');
  }catch(error){this.#retire(state);throw error;}
 }
 async #read(t,s,previous=null,guard=raw=>{if(raw)this.#current(raw);}){
  this.#ready();guard();const raw=await this.#authority.resolve(t,Object.freeze(request(s)));guard(raw);
  const grant=permission(raw,s);if(previous&&!same(previous,grant))fail('STALE_BASE');
  const check=()=>guard(raw),guarded=method=>async(...args)=>{check();const v=await t[method](...args);check();return v;};
  const g={get:guarded('get'),count:guarded('count')};
  const gate=await g.get('meta','gate'),control=await this.#store.control(g),library=await g.get('meta','thought-library'),restore=await g.get('meta','recovery-restore-epoch');check();
  if(gate?.enabled!==true||control.settings?.enabled!==true||control.settings.consentVersion!==CONSENT_VERSION||control.settings.epoch!==gate.epoch||!integer(gate.epoch)||library?.phase!=='active'||library.schemaVersion!==1||library.verified!==true||library.sealed!==0||restore&&!id(restore.value))fail('STALE_BASE');
  const snapshot=await this.#store.maintenanceFilterSnapshot(g,s.candidateIds,{contentBounds:true});check();
  const neighbors=[];let total=0;
  for(const inputId of s.neighborIds){
   const p=await inputProjection(this.#store,g,inputId),row=await g.get('filterInputs',inputId),m=await g.get('inputStates',inputId),ix=await g.get('blockIndex',inputId);
   if(!p||!row||!ix||p.sourceRecordIds.length!==1||p.identities.length!==1||p.block.originalTextReference!==p.sourceRecordIds[0]||!absent(normalizePresence(row.presence))||row.presenceInvalid||!Object.entries(FILTER_VERSIONS).every(([k,v])=>row[k]===v)||validFilterDecision(row,m)||row.aiDecision||!p.body.length||p.body.length>2048||bytes(p.body)>4096||!Array.isArray(ix.listKey)||ix.listKey[0]!==p.documentId||ix.listKey[1]!==0||ix.excluded)fail('STALE_BASE');
   total+=bytes(p.body);neighbors.push({inputId,documentId:p.documentId,contentRevision:p.contentRevision,lastRemovalSequence:p.lastRemovalSequence,sourceRecordIds:p.sourceRecordIds,identities:p.identities,position:ix.listKey});
  }
  if(total>4096||total+snapshot.items.reduce((n,x)=>n+x.bodyBytes,0)>16384)fail('BUDGET_EXCEEDED');
  for(const item of snapshot.items){
   const b=(await g.get('blocks',item.inputId))?.value,ix=await g.get('blockIndex',item.inputId);
   if(!b||!ix||item.sourceRecordIds.length!==1||item.identities.length!==1||b.originalTextReference!==item.sourceRecordIds[0]||item.row.userEdited!==false||!absent(normalizePresence(item.row.presence))||!Array.isArray(ix.listKey)||ix.listKey[0]!==b.documentId||ix.listKey[1]!==0||ix.excluded)fail('STALE_BASE');
   let nearby=false;for(const n of neighbors){if(n.documentId!==b.documentId)continue;const cmp=this.#store.repository.factory.cmp(ix.listKey,n.position);if(await g.count('blockIndex','byList',IDBKeyRange.bound(cmp<0?ix.listKey:n.position,cmp<0?n.position:ix.listKey))<=3)nearby=true;}
   if(!nearby)fail('STALE_BASE');item.row=cleanRow(item.row);item.position=ix.listKey;
  }
  const proof={gateEpoch:gate.epoch,restore:restore?.value??null,snapshot,neighbors};if(bytes(JSON.stringify(proof))>65536)fail('BUDGET_EXCEEDED');check();return {grant,raw,proof,check};
 }
 async prepare(t,value){
  const s=scope(value),created=this.#time();if(this.#states.size+this.#preparing>=8)fail('BUDGET_EXCEEDED');this.#preparing++;
  try{const guard=raw=>{if(this.#time()>=created+300000)fail('STALE_BASE');if(raw)this.#current(raw);};const read=await this.#read(t,s,null,guard);read.check();
   const handle=Object.freeze(Object.create(null)),state={scope:s,grant:read.grant,raw:read.raw,proof:read.proof,created,operationId:this.#store.uuid(),active:true};this.#handles.set(handle,state);this.#states.add(state);return handle;
  }finally{this.#preparing--;}
 }
 async commit(t,handle,decisions){
  const saved=this.#handles.get(handle);this.#live(saved);
  decisions=decisionSnapshot(decisions,saved.scope.candidateIds);
  if(saved.decisions&&!same(saved.decisions,decisions))fail('STALE_BASE');
  // Lock the immutable operation before any await, including concurrent callers.
  saved.decisions??=decisions;
  let read;try{read=await this.#read(t,saved.scope,saved.grant,raw=>this.#live(saved,raw));}
  catch(error){if(['STALE_BASE','UNAVAILABLE','INVALID_REQUEST'].includes(error?.code))this.#retire(saved);throw error;}
  read.check();
  const committedProof=structuredClone(saved.proof);for(const item of committedProof.snapshot.items)item.row.aiOperationId=saved.operationId;
  const replay=same(read.proof,committedProof);if(!replay&&!same(read.proof,saved.proof))fail('STALE_BASE');
  if(replay&&!same(saved.decisions,decisions))fail('STALE_BASE');
  const current=()=>read.check();current();
  const filtered=decisions.filter(d=>d.decision==='FILTER').length,result=()=>({ok:true,disposition:filtered?'committed':'no_change',inputIds:[...saved.scope.candidateIds],filtered,isCurrent:()=>{try{current();return true;}catch{return false;}}});
  if(replay)return result();
  current();const state=await t.get('meta','smart-filter');current();if(!integer(state?.decisionSequence)||state.decisionSequence>=Number.MAX_SAFE_INTEGER-decisions.length)fail('STALE_BASE');
  for(const d of decisions){current();const row=await t.get('filterInputs',d.inputId);current();delete row.aiDecision;delete row.filteredKey;row.aiOperationId=saved.operationId;
   if(d.decision==='FILTER'){const sequence=++state.decisionSequence;row.aiDecision={version:1,policy:read.grant.policy,authority:read.grant.epochs,scope:saved.scope,proof:committedProof,sequence};row.filteredKey=[0,-sequence,row.id];}
   current();await t.put('filterInputs',row);current();
  }
  current();await t.put('meta',state);current();
  return result();
 }
 async hidden(t,b,row,meta,readingSnapshot){
  const d=row?.aiDecision;if(!d||d.version!==1||!integer(d.sequence)||readingSnapshot&&d.sequence>readingSnapshot.sequence||row.basedOnContentRevision!==meta?.contentRevision)return false;
  try{const s=scope(d.scope),read=await this.#read(t,s);if(!s.candidateIds.includes(b.id)||!same(read.grant.policy,d.policy)||!same(read.grant.epochs,d.authority)||!same(read.proof,d.proof))return false;read.check();return true;}catch{return false;}
 }
}
