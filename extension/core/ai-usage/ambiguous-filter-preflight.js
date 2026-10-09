// Unused private read-only preflight. No Provider, job, decision or ACK writer.
import {inputProjection} from '../thought-evidence.js';
import {decideLight,normalizePresence,FILTER_VERSIONS} from '../smart-filter.js';
import {CONSENT_VERSION,ArchiveError} from '../constants.js';

const encoder=new TextEncoder(),failures=new WeakSet();
// Original repository preserves ArchiveError identity through readonly aborts.
// Only our private brand, never an arbitrary error field, can expose a reason.
const stop=reason=>{const e=new ArchiveError('FORBIDDEN');e.reason=reason;Object.freeze(e);failures.add(e);throw e;};
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
const exact=(x,keys)=>plain(x)&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k)&&Object.hasOwn(Object.getOwnPropertyDescriptor(x,k),'value'));
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=200;
const array=(x,max)=>Array.isArray(x)&&x.length<=max&&Reflect.ownKeys(x).length===x.length+1&&Array.from({length:x.length},(_,i)=>Object.getOwnPropertyDescriptor(x,String(i))).every(d=>d&&Object.hasOwn(d,'value'));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const bytes=x=>encoder.encode(x).length;
const result=(status,reason,candidates=[],capability=null)=>Object.freeze({status,reason,candidates:Object.freeze(candidates.map(x=>Object.freeze(x))),capability,financialAuthority:false,dispatchAllowed:false});
const denied=(inputId,reason,lightDecision=null)=>({inputId,eligibility:'INELIGIBLE',reason,lightDecision});
const absent=p=>p?.version===1&&p.confidence==='verified'&&p.attachment==='absent'&&p.reference==='absent';

function scope(value){
 if(!exact(value,['candidates'])||!array(value.candidates,8)||value.candidates.length<1)stop('INVALID_SCOPE');
 const candidates=[],ids=new Set(),neighborIds=new Set();
 for(const c of value.candidates){
  if(!exact(c,['inputId','expectedContentRevision','expectedEvaluationRevision','neighbors'])||!id(c.inputId)||!integer(c.expectedContentRevision)||!integer(c.expectedEvaluationRevision)||ids.has(c.inputId)||!array(c.neighbors,2))stop('INVALID_SCOPE');
  ids.add(c.inputId);const neighbors=[],seen=new Set();
  for(const n of c.neighbors){if(!exact(n,['inputId','expectedContentRevision'])||!id(n.inputId)||!integer(n.expectedContentRevision)||seen.has(n.inputId))stop('INVALID_SCOPE');seen.add(n.inputId);neighborIds.add(n.inputId);neighbors.push({inputId:n.inputId,expectedContentRevision:n.expectedContentRevision});}
  candidates.push({inputId:c.inputId,expectedContentRevision:c.expectedContentRevision,expectedEvaluationRevision:c.expectedEvaluationRevision,neighbors});
 }
 if(neighborIds.size>2||[...neighborIds].some(n=>ids.has(n)))stop('INVALID_SCOPE');
 return {candidates,request:{purpose:'ai-filter-preflight',candidateIds:[...ids].sort(),neighborIds:[...neighborIds].sort()}};
}
function permission(value,request){
 if(!exact(value,['allowed','tier','optIn','processingConsent','userInputIds','scope','epochs'])||value.allowed!==true||value.tier!=='pro'||value.optIn!==true||value.processingConsent!==true||!exact(value.scope,['candidateIds','neighborIds'])||!array(value.scope.candidateIds,8)||!array(value.scope.neighborIds,2)||!equal(value.scope,{candidateIds:request.candidateIds,neighborIds:request.neighborIds})||!array(value.userInputIds,10)||!value.userInputIds.every(id)||!equal([...value.userInputIds].sort(),[...request.candidateIds,...request.neighborIds].sort())||!exact(value.epochs,['entitlement','optIn','processing','userRead'])||!Object.values(value.epochs).every(id))stop('PERMISSION_UNAVAILABLE');
 return structuredClone(value);
}

export class AmbiguousFilterPreflight {
 #store;#resolve;#clock;#last=null;#closed=false;#epoch=0;#handles=new WeakMap();#states=new Set();
 constructor(store,{resolvePermission=null,clock=null}={}){this.#store=store;this.#resolve=resolvePermission;this.#clock=clock;}
 #retire(s){s.proof=null;s.bodies=null;s.active=false;this.#states.delete(s);}
 #clear(){for(const s of this.#states)this.#retire(s);this.#epoch++;}
 dispose(){this.#closed=true;this.#clear();}
 #time(){
  if(typeof this.#clock!=='function')stop('UNAVAILABLE');const now=this.#clock();
  if(!integer(now)||this.#last!==null&&now<this.#last){this.#clear();stop('CLOCK_INVALID');}
  this.#last=now;for(const s of this.#states)if(now>=s.expiresAt)this.#retire(s);return now;
 }
 #ready(){const s=this.#store;return !this.#closed&&typeof this.#resolve==='function'&&typeof this.#clock==='function'&&s?.loaded===true&&s.filterLoaded===true&&s.repository?.db&&typeof s.isFiltered==='function'&&typeof s.control==='function'&&(!Object.hasOwn(s,'foundationLoaded')||s.foundationLoaded===true)&&(!Object.hasOwn(s,'bindingsLoaded')||s.bindingsLoaded===true);}
 #active(epoch){if(this.#closed||epoch!==this.#epoch)stop('REVOKED');}
 #failure(e,candidates=[]){return result('UNAVAILABLE',failures.has(e)?e.reason:'READ_FAILED',candidates);}
 async #read(plan,epoch){
  const s=this.#store;
  return s.repository.transaction(false,async t=>{
   this.#active(epoch);
   const gate=await t.get('meta','gate'),control=await s.control(t),filter=await t.get('meta','smart-filter'),library=await t.get('meta','thought-library'),restore=await t.get('meta','recovery-restore-epoch');
   if(gate?.enabled!==true||control.settings?.enabled!==true||control.settings.consentVersion!==CONSENT_VERSION||control.settings.epoch!==gate.epoch||library?.phase!=='active'||library.schemaVersion!==1||library.verified!==true||library.sealed!==0||restore&&!id(restore.value)||!integer(gate.epoch)||!filter||filter.phase!=='active'||filter.mode!=='light'||!integer(filter.policyEpoch)||!Object.entries(FILTER_VERSIONS).every(([k,v])=>filter[k]===v))stop('OWNER_UNAVAILABLE');
   this.#active(epoch);const authority=permission(await this.#resolve(t,structuredClone(plan.request)),plan.request);this.#active(epoch);
   const fence={gate:{epoch:gate.epoch,enabled:gate.enabled},filter:{policyEpoch:filter.policyEpoch,...FILTER_VERSIONS},restore:{present:!!restore,value:restore?.value??null}};
   const cache=new Map();
   const read=async inputId=>{
    if(cache.has(inputId))return cache.get(inputId);this.#active(epoch);
    const b=(await t.get('blocks',inputId))?.value,m=await t.get('inputStates',inputId),f=await t.get('filterInputs',inputId),ix=await t.get('blockIndex',inputId);
    this.#active(epoch);
    if(!b||!m||!f||!ix||!Array.isArray(b.provenance)||b.provenance.length!==1||!id(b.provenance[0]?.sourceRecordId)||b.originalTextReference!==b.provenance[0].sourceRecordId||b.excluded||b.branchStatus||m.removalState!=='active'||m.sourcePurged){cache.set(inputId,null);return null;}
    if(!integer(m.contentRevision)||!integer(m.lastRemovalSequence??0)||!integer(f.evaluationRevision)||!absent(normalizePresence(f.presence))||f.presenceInvalid||!Object.entries(FILTER_VERSIONS).every(([k,v])=>f[k]===v)){cache.set(inputId,null);return null;}
    const p=await inputProjection(s,t,inputId);this.#active(epoch);
    if(!p||p.sourceRecordIds.length!==1||p.identities.length!==1||!id(p.documentId)||ix.id!==inputId||ix.documentId!==p.documentId||ix.excluded||!array(ix.listKey,12)||ix.listKey[0]!==p.documentId||ix.listKey[1]!==0||bytes(JSON.stringify(ix.listKey))>4096||typeof p.body!=='string'){cache.set(inputId,null);return null;}
    let kept=false;for(const source of p.identities)if(await t.get('filterIntents',source))kept=true;this.#active(epoch);
    const row={inputId,documentId:p.documentId,body:p.body,contentRevision:p.contentRevision,lastRemovalSequence:p.lastRemovalSequence,sources:p.sourceRecordIds,identities:p.identities,position:ix.listKey,filter:{authorship:f.authorship,userEdited:f.userEdited,filterOverride:f.filterOverride,evaluationRevision:f.evaluationRevision,presence:f.presence,presenceInvalid:!!f.presenceInvalid,basedOnContentRevision:f.basedOnContentRevision??null,decision:f.decision??null},kept,edited:b.libraryText!==null||!!b.note||b.editedAt!==null||m.contentRevision>0||b.mergedSourceIds?.length>1,filtered:await s.isFiltered(t,b,filter)};
    this.#active(epoch);cache.set(inputId,row);return row;
   };
   const publicRows=[],admitted=[],selected=new Map();
   for(const c of plan.candidates){
    const p=await read(c.inputId);if(!p){publicRows.push(denied(c.inputId,'INPUT_UNAVAILABLE'));continue;}
    if(p.contentRevision!==c.expectedContentRevision||p.filter.evaluationRevision!==c.expectedEvaluationRevision){publicRows.push(denied(c.inputId,'INPUT_STALE'));continue;}
    if(p.edited||p.kept||p.filter.authorship!=='untouched'||p.filter.userEdited!==false||p.filter.filterOverride!=='none'){publicRows.push(denied(c.inputId,'HUMAN_PROTECTED'));continue;}
    if(p.body.length>1024||bytes(p.body)>4096){publicRows.push(denied(c.inputId,'TEXT_BOUND'));continue;}
    const light=decideLight({text:p.body,...p.filter});
    if(light.decision!=='uncertain'||!['context_insufficient','rule_no_match'].includes(light.reasonCode)){publicRows.push(denied(c.inputId,'LIGHT_RESOLVED',light.decision));continue;}
    if(!c.neighbors.length){publicRows.push(denied(c.inputId,'CONTEXT_INSUFFICIENT',light.decision));continue;}
    const neighbors=[];let reason=null;
    for(const n of c.neighbors){
     const q=await read(n.inputId);
     if(!q||q.filtered||q.documentId!==p.documentId||q.body.length===0){reason='NEIGHBOR_UNAVAILABLE';break;}
     if(q.contentRevision!==n.expectedContentRevision){reason='NEIGHBOR_STALE';break;}
     if(q.body.length>2048||bytes(q.body)>4096){reason='TEXT_BOUND';break;}
     const cmp=s.repository.factory.cmp(p.position,q.position),range=IDBKeyRange.bound(cmp<0?p.position:q.position,cmp<0?q.position:p.position);
     if(await t.count('blockIndex','byList',range)>3){reason='POSITION_UNAVAILABLE';break;}
     neighbors.push(q);
    }
    this.#active(epoch);
    if(reason){publicRows.push(denied(c.inputId,reason,light.decision));continue;}
    admitted.push(c.inputId);selected.set(p.inputId,p);for(const q of neighbors)selected.set(q.inputId,q);
    publicRows.push({inputId:c.inputId,eligibility:'PRIVATE_CANDIDATE',reason:'LOCAL_SCOPE_ONLY',lightDecision:light.decision});
   }
   const uniqueNeighbors=[...selected.values()].filter(p=>plan.request.neighborIds.includes(p.inputId));
   if(uniqueNeighbors.reduce((n,p)=>n+bytes(p.body),0)>4096||[...selected.values()].reduce((n,p)=>n+bytes(p.body),0)>16384)stop('TEXT_BOUND');
   const currentPermission=permission(await this.#resolve(t,structuredClone(plan.request)),plan.request);this.#active(epoch);
   if(!equal(authority,currentPermission))stop('PERMISSION_CHANGED');
   const proof={scope:plan.request,authority,fence,admitted,inputs:[...selected.values()].sort((a,b)=>a.inputId.localeCompare(b.inputId))};
   if(bytes(JSON.stringify(proof))>65536)stop('PROOF_BOUND');
   return {publicRows,admitted,proof,bodies:[...selected.values()].map(p=>p.body)};
  });
 }
 async prepare(request){
  try{
   if(!this.#ready()){this.#clear();return result('UNAVAILABLE','STORE_NOT_READY');}const now=this.#time(),epoch=this.#epoch,plan=scope(request);
   if(!integer(now+300000))stop('CLOCK_INVALID');
   if(this.#states.size>=8)return result('UNAVAILABLE','CAPABILITY_BOUND');const read=await this.#read(plan,epoch);this.#active(epoch);if(this.#time()>=now+300000)stop('CAPABILITY_EXPIRED');
   if(!read.admitted.length)return result('NO_CAPABILITY','KEEP_OR_LOCAL_ONLY',read.publicRows);
   if(this.#states.size>=8)return result('UNAVAILABLE','CAPABILITY_BOUND',read.publicRows);
   const handle=Object.freeze(Object.create(null)),state={active:true,plan,epoch,expiresAt:now+300000,proof:read.proof,bodies:read.bodies};
   this.#handles.set(handle,state);this.#states.add(state);return result('CANDIDATE_ONLY','LOCAL_SCOPE_ONLY',read.publicRows,handle);
  }catch(e){return this.#failure(e);}
 }
 async revalidate(handle){
  try{
   if(!this.#ready()){this.#clear();return result('UNAVAILABLE','STORE_NOT_READY');}this.#time();const state=this.#handles.get(handle);
   if(!state?.active)return result('STALE','CAPABILITY_UNAVAILABLE');const read=await this.#read(state.plan,state.epoch);this.#active(state.epoch);this.#time();
   if(!state.active||!equal(state.proof,read.proof)){this.#retire(state);return result('STALE','SCOPE_CHANGED',read.publicRows);}
   return result('CURRENT','READ_SNAPSHOT_ONLY',read.publicRows,handle);
  }catch(e){const state=this.#handles.get(handle);if(state?.active)this.#retire(state);return this.#failure(e);}
 }
}
