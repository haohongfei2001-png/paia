import {ArchiveError} from '../constants.js';
import {equal,canonical} from './contracts.js';
import {snapshot,freeze,exact,integer,token} from './qwen-request-data.js';
import {sealAIFilterVisibilityWitness,serializeAIFilterVisibilityWitness,readAIFilterVisibilityWitness,openAIFilterVisibilityWitness,aiFilterVisibilityWitnessDigest} from './filter-visibility-witness.js';
import {readAIFilterConsentEpoch} from '../../background/ai-filter-consent.js';
import {identityCurrentnessHubOrigin,reserveHubIdentityObservation,releaseHubIdentityObservation,openHubIdentityObservation,readHubIdentityObservation} from './identity-currentness-hub.js';
const signalAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
const owners=new WeakSet(),HISTORY='aiFilterVisibilityHistoryV1';
export const isAIFilterVisibilityOwner=value=>owners.has(value);
export const AI_FILTER_VISIBILITY_LIMITS=Object.freeze({history:64,bytes:6*1024*1024,pending:8,admissionMs:5000,cooldownMs:5000});
const ownExact=(o,keys)=>!!o&&[Object.prototype,null].includes(Object.getPrototypeOf(o))&&Reflect.ownKeys(o).length===keys.length&&keys.every(k=>Object.hasOwn(Object.getOwnPropertyDescriptor(o,k)||{},'value'));
const fail=()=>{throw new ArchiveError('UNAVAILABLE');};
const identityFields=['principalId','libraryId','operationId','jobType','tier','principalGeneration','entitlementGeneration','authorityGeneration','requestHash'];
const signedSame=(a,b)=>identityFields.every(k=>a?.[k]===b?.[k]);
function source(value,hub){
 if(!value||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return null;const d=Object.getOwnPropertyDescriptors(value);
 for(const key of ['origin','clock','readProofs','processing','isCurrent'])if(!Object.hasOwn(d[key]||{},'value'))return null;
 const c=Object.fromEntries(['origin','clock','readProofs','processing','isCurrent'].map(k=>[k,d[k].value]));const context=Object.getOwnPropertyDescriptor(d.service?.value||{},'context')?.value;c.caller=Object.getOwnPropertyDescriptor(context||{},'caller')?.value;if(!c.caller||typeof c.caller!=='object'||!Object.isFrozen(c.caller))return null;
 return c.origin===identityCurrentnessHubOrigin(hub)&&['clock','readProofs','isCurrent'].every(k=>typeof c[k]==='function')&&typeof c.processing?.resolve==='function'&&typeof c.processing?.isCurrent==='function'?Object.freeze(c):null;
}
function qualificationScope(d,digest){return freeze({purpose:'ai-filter-visibility-qualification',logicalJobId:d.request.jobId,childOperationId:d.request.operationId,filterOperationId:d.publication.operationId,principalId:d.request.principalId,libraryId:d.request.libraryId,consentEpoch:d.request.consentEpoch,optInEpoch:d.consentEpoch,restoreEpoch:d.restoreEpoch,decisionDigest:digest,policy:structuredClone(d.publication.policy),candidateIds:[...d.publication.scope.candidateIds],neighborIds:[...d.publication.scope.neighborIds],inputs:[...d.publication.scope.candidateIds,...d.publication.scope.neighborIds].sort().map(inputId=>({inputId,selectedFields:['body','note']})),facets:['filter']});}
// Independently owned, read-only visibility. It never resolves a write grant,
// queries a reservation, refreshes an old decision, or invokes a Provider.
export function createAIFilterVisibilityOwner({getStore=()=>null,consent,policy,configuration=null,hub=null,storage=null}={}){
 const c=source(configuration,hub);if(!c||!storage||typeof storage.get!=='function'||typeof storage.set!=='function'||!consent||!exact(policy,['version','qualificationId'])||policy.version!=='pro-ambiguous-1'||!token(policy.qualificationId))return null;
 const selectedPolicy=freeze(snapshot(policy)),history=new Map(),leases=new Map(),pending=new Map(),seals=new Set(),scheduled=new Map(),grants=new WeakMap(),retired=new Set();let disposed=false,serial=0,store=null,loaded=false,loading=null,loadTimer=null,tail=Promise.resolve(),last=-1;
 const close=id=>{const l=leases.get(id);if(!l)return;leases.delete(id);clearTimeout(l.timer);l.remove?.();l.processing.revocationSignal.removeEventListener('abort',l.abort);l.connection.close();};
 const invalidate=()=>{serial++;clearTimeout(loadTimer);loadTimer=null;for(const timer of scheduled.values())clearTimeout(timer);scheduled.clear();for(const id of [...leases.keys()])close(id);};
 const currentStore=()=>{const value=getStore();if(disposed||!value?.repository?.db||c.isCurrent()!==true)fail();if(store&&store!==value){invalidate();history.clear();loaded=false;}store=value;return value;};
 const time=()=>{const at=c.clock();if(!integer(at)||at<last){invalidate();fail();}last=at;return at;};
 const consentFor=d=>{const receipt=consent.capture();if(!receipt||readAIFilterConsentEpoch(consent,receipt)!==d.consentEpoch)return null;return receipt;};
 const validReceipt=(r,s,scope)=>ownExact(r,['version','store','caller','scope','epoch','processing','expiresAt','revocationSignal'])&&r.version===1&&r.store===s&&r.caller===c.caller&&Object.isFrozen(r.caller)&&token(r.epoch)&&r.processing===true&&integer(r.expiresAt)&&r.expiresAt>Date.now()&&r.revocationSignal instanceof AbortSignal&&!signalAborted.call(r.revocationSignal)&&equal(r.scope,scope)&&c.processing.isCurrent(r,s)===true;
 const current=l=>{try{return !disposed&&l.serial===serial&&currentStore()===l.store&&l.repository===l.store.repository&&l.database===l.repository.db&&time()<l.identity.verifiedUntil&&consent.isCurrent(l.consent)===true&&readAIFilterConsentEpoch(consent,l.consent)===l.data.consentEpoch&&validReceipt(l.processing,l.store,l.scope)&&readHubIdentityObservation(hub,l.connection)?.identity===l.identity&&equal(l.data.publication.policy,selectedPolicy);}catch{return false;}};
 async function persist(){const s=currentStore(),version=serial,entries=[...history.values()].map(r=>r.envelope);if(entries.length>AI_FILTER_VISIBILITY_LIMITS.history||new TextEncoder().encode(JSON.stringify(entries)).length>AI_FILTER_VISIBILITY_LIMITS.bytes)fail();await storage.set({[HISTORY]:{version:1,entries}});if(disposed||version!==serial||getStore()!==s)fail();}
 async function load(){if(loaded)return true;if(loading)return loading;loading=(async()=>{try{await consent.status();const version=serial,s=currentStore();const saved=(await storage.get(HISTORY))[HISTORY];if(disposed||version!==serial||getStore()!==s)return false;if(saved===undefined){loaded=true;return true;}const value=snapshot(saved,{maxBytes:AI_FILTER_VISIBILITY_LIMITS.bytes,maxDepth:20,maxKeys:64*8192,maxString:4096});if(!exact(value,['version','entries'])||value.version!==1||!Array.isArray(value.entries)||value.entries.length>AI_FILTER_VISIBILITY_LIMITS.history)return false;
   for(const envelope of value.entries){const witness=await openAIFilterVisibilityWitness(s,envelope);if(disposed||version!==serial||getStore()!==s)return false;if(!witness)continue;const data=readAIFilterVisibilityWitness(witness,s);if(data.origin!==c.origin||!equal(data.publication.policy,selectedPolicy)||!consentFor(data))continue;history.set(data.publication.operationId,{witness,envelope:serializeAIFilterVisibilityWitness(witness,s),data,digest:await aiFilterVisibilityWitnessDigest(witness,s),lastAttempt:-Infinity});}
   loaded=true;return true;
  }catch{return false;}finally{loading=null;}})();return loading;}
 function schedule(id){const h=history.get(id);if(!h||disposed||retired.has(id)||pending.has(id)||scheduled.has(id)||scheduled.size>=AI_FILTER_VISIBILITY_LIMITS.pending||Date.now()-h.lastAttempt<AI_FILTER_VISIBILITY_LIMITS.cooldownMs)return;const timer=setTimeout(()=>{renew(id).catch(()=>{}).finally(()=>{if(scheduled.get(id)===timer)scheduled.delete(id);});},0);scheduled.set(id,timer);timer.unref?.();}
 async function renew(id){
  if(!await load())return false;const h=history.get(id);if(!h||disposed||retired.has(id))return false;if(pending.has(id))return pending.get(id).result;if(leases.has(id)&&current(leases.get(id)))return true;
  // Always become visible before re-admission. A new proof never extends the old
  // observation, and an unresolved issuer promise continues to occupy its slot.
  close(id);if(Date.now()-h.lastAttempt<AI_FILTER_VISIBILITY_LIMITS.cooldownMs)return false;h.lastAttempt=Date.now();const s=currentStore(),version=serial,consentReceipt=consentFor(h.data);if(!consentReceipt)return false;
  const ticket=reserveHubIdentityObservation(hub);if(!ticket)return false;let accepted=true,connection=null,permit=true,timeoutResolve;
  const deadline=new Promise(resolve=>{timeoutResolve=resolve;}),timer=setTimeout(()=>{accepted=false;connection?.close();timeoutResolve(false);},AI_FILTER_VISIBILITY_LIMITS.admissionMs);timer.unref?.();
  const check=()=>{if(!accepted||disposed||version!==serial||currentStore()!==s||!consent.isCurrent(consentReceipt)||readAIFilterConsentEpoch(consent,consentReceipt)!==h.data.consentEpoch)fail();};
  const work=Promise.resolve().then(async()=>{try{
   check();const verified=await openAIFilterVisibilityWitness(s,h.envelope);check();if(!verified)fail();
   const raw=await c.readProofs(structuredClone(h.data.request));check();const proofs=snapshot(raw,{maxBytes:24576,maxDepth:1,maxKeys:2,maxString:8192});if(!exact(proofs,['principalToken','entitlementToken'])||Object.values(proofs).some(x=>typeof x!=='string'||!x.length||x.length>8192))fail();
   connection=await openHubIdentityObservation(hub,ticket,{request:h.data.request,...proofs});permit=false;check();const observed=readHubIdentityObservation(hub,connection);if(!observed||!equal(observed.request,h.data.request)||observed.origin!==h.data.origin||!signedSame(observed.identity,h.data.identity)){retired.add(id);fail();}
   const scope=qualificationScope(h.data,h.digest),processing=await s.repository.transaction(false,async t=>{const raw=await c.processing.resolve(t,scope);check();if(!ownExact(raw,['version','store','caller','scope','epoch','processing','expiresAt','revocationSignal']))fail();const receipt=Object.freeze({...raw,scope:freeze(snapshot(raw.scope,{maxBytes:32768,maxDepth:8,maxKeys:4096,maxString:4096}))});if(!validReceipt(receipt,s,scope))fail();return receipt;},['meta','inputStates','blockIndex','filterInputs']);check();if(!validReceipt(processing,s,scope))fail();
   const identity=observed.identity,l={serial:version,store:s,repository:s.repository,database:s.repository.db,data:h.data,identity,connection,consent:consentReceipt,processing,scope,timer:null,remove:null};
   if(!current(l))fail();l.remove=connection.onInvalidate(()=>close(id));l.abort=()=>close(id);processing.revocationSignal.addEventListener('abort',l.abort,{once:true});leases.set(id,l);
   // A healthy lease is admitted afresh near its end; loss/unknown does not loop.
   l.timer=setTimeout(()=>{close(id);renew(id).catch(()=>{});},Math.max(1,Math.min(45000,identity.verifiedUntil-time()-2000,processing.expiresAt-Date.now()-2000)));l.timer.unref?.();accepted=false;return true;
  }catch{connection?.close();return false;}finally{clearTimeout(timer);if(permit)releaseHubIdentityObservation(hub,ticket);pending.delete(id);}});
  const result=Promise.race([work,deadline]);pending.set(id,{work,result});return result;
 }
 const owner=Object.freeze({
  load,renew,
  retain(args){if(disposed||seals.size>=AI_FILTER_VISIBILITY_LIMITS.pending)return false;let sealing;try{currentStore();sealing=sealAIFilterVisibilityWitness({...args,consent});}catch{return false;}
   const completion=sealing.then(witness=>{const s=currentStore(),data=readAIFilterVisibilityWitness(witness,s);if(!data||data.origin!==c.origin||!equal(data.publication.policy,selectedPolicy)||!consentFor(data))return;tail=tail.then(async()=>{if(!await load())return;const id=data.publication.operationId;if(history.size>=AI_FILTER_VISIBILITY_LIMITS.history&&!history.has(id))return;const envelope=serializeAIFilterVisibilityWitness(witness,s),digest=await aiFilterVisibilityWitnessDigest(witness,s);history.set(id,{witness,envelope,data,digest,lastAttempt:-Infinity});await persist();schedule(id);}).catch(()=>{});return tail;}).catch(()=>{});
   // A stalled storage write is still retained work. Do not recycle this bound
   // as soon as HMAC completes while an unbounded promise chain keeps growing.
   seals.add(completion);completion.finally(()=>seals.delete(completion));return true;
  },
  async resolveVisibility(_t,r){if(!loaded){if(!disposed&&!loading&&loadTimer===null){loadTimer=setTimeout(()=>{loadTimer=null;load().catch(()=>{});},0);loadTimer.unref?.();}fail();}const h=history.get(r?.operationId),l=leases.get(r?.operationId);if(!h||!exact(r,['purpose','candidateIds','neighborIds','operationId','inputId','decision'])||r.purpose!=='ai-maintenance-filter-visibility'||!equal(h.data.publication.scope,{candidateIds:r.candidateIds,neighborIds:r.neighborIds}))fail();
   const p=h.data.publication,item=p.filtered.find(x=>x.inputId===r.inputId);if(!item||!equal(r.decision,{version:1,policy:p.policy,authority:p.epochs,scope:p.scope,proof:p.proof,sequence:item.sequence}))fail();if(!l||!current(l)){close(r.operationId);schedule(r.operationId);fail();}
   const grant=freeze({allowed:true,tier:'pro',optIn:true,processingConsent:true,inputIds:[...p.scope.candidateIds,...p.scope.neighborIds].sort(),epochs:structuredClone(p.epochs),policy:structuredClone(p.policy)});grants.set(grant,l);return grant;
  },
  isCurrent:g=>{const l=grants.get(g);return !!l&&leases.get(l.data.publication.operationId)===l&&current(l);},
  async settled(){await Promise.allSettled([...seals]);await tail;},
  isDrained:()=>pending.size===0&&seals.size===0&&loading===null&&loadTimer===null&&scheduled.size===0,
  status:()=>({history:history.size,active:[...leases.values()].filter(current).length,pending:pending.size,scheduled:scheduled.size+(loadTimer===null?0:1)}),
  invalidate,
  dispose(){if(disposed)return;disposed=true;invalidate();history.clear();remove?.();}
 });
 const remove=consent.onInvalidate(invalidate);owners.add(owner);return owner;
}
