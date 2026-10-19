import * as organizeRead from '../../background/organize-processing-policy.js';
import {ArchiveError} from '../constants.js';
import {canonical,equal} from './contracts.js';
import {snapshot,freeze,exact,integer,token} from './qwen-request-data.js';
import {sealAIFilterVisibilityWitness,readAIFilterVisibilityWitness,aiFilterVisibilityWitnessDigest} from './filter-visibility-witness.js';
import {createAIFilterVisibilityHistory} from './filter-visibility-history.js';
import {createFilterReadIdentityBinding,readFilterReadIdentityBinding,assertFilterReadIdentityBinding,readFilterReadIdentityBindingFacts} from './filter-read-identity-binding.js';
import {readAIFilterConsentEpoch} from '../../background/ai-filter-consent.js';
import {identityCurrentnessHubOrigin,reserveHubIdentityObservation,releaseHubIdentityObservation,openHubFilterReadIdentityObservation,readHubFilterReadIdentityObservation,readHubFilterReadIdentityObservationFacts} from './identity-currentness-hub.js';
const signalAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get,nativeNow=Date.now;
const LIMITS=Object.freeze({cache:64,pending:8,pageOperations:200,pages:8,pageLeaseMs:60000,cacheBytes:48*1024*1024,admissionMs:5000,cooldownMs:5000}),fail=()=>{throw new ArchiveError('UNAVAILABLE');};
const own=(o,keys)=>!!o&&[Object.prototype,null].includes(Object.getPrototypeOf(o))&&Reflect.ownKeys(o).length===keys.length&&keys.every(k=>Object.hasOwn(Object.getOwnPropertyDescriptor(o,k)||{},'value'));
const id=x=>typeof x==='string'&&x.length>0&&x.length<=200;
const ownValue=(value,key)=>{const d=Object.getOwnPropertyDescriptor(value??{},key);return d&&Object.hasOwn(d,'value')?d.value:undefined;};
// Only this original source owner can mint a historical read capability. Its
// original processing lease already covers the exact historical Input scope;
// the Organize admission contributes only its own selected Input and lifetime.
const historicalReaderOwners=new WeakMap(),historicalReaderCaps=new WeakMap();
export function captureAIFilterHistoricalReader(owner,store,admission){const capture=historicalReaderOwners.get(owner);if(!capture)fail();return capture(store,admission);}
function historicalReader(cap,store,admission){const r=historicalReaderCaps.get(cap);if(!r||r.store!==store||r.admission!==admission)fail();return r;}
export function readAIFilterHistoricalReaderBinding(cap,store){const r=historicalReaderCaps.get(cap);if(!r||r.store!==store)fail();r.current();return Object.freeze({admission:r.admission,scope:r.view});}
export function readAIFilterHistoricalReaderScope(cap,store,admission){const r=historicalReader(cap,store,admission);r.current();return r.view;}
export function assertAIFilterHistoricalReaderCurrent(cap,store,admission){return historicalReader(cap,store,admission).current();}
export function assertAIFilterHistoricalReaderFacts(cap,store,admission){return historicalReader(cap,store,admission).facts();}
// Fixed internal projection input. No Source/Input text is retained in this
// original closed history proof. The cap never leaves the boolean consumer.
export function readAIFilterHistoricalReaderProof(cap,store,admission){const r=historicalReader(cap,store,admission);r.facts();return r.proof;}
const sharedResources=new WeakMap();
const resourcesFor=hub=>{let r=sharedResources.get(hub);if(!r){r={pending:0,pages:0,seals:0,cacheBytes:0,pinned:new Map()};sharedResources.set(hub,r);}return r;};
const receiptFields=['version','store','caller','scope','epoch','processing','expiresAt','revocationSignal'];
// One fresh read-purpose identity supports independently qualified decisions.
// History remains original publication/ACK. Neither old epochs nor decision,
// proof, sequence, or paid write capability is renewed or rewritten here.
// Compare the admitted closed scope by descriptors. A late nested getter is
// denied before evaluation, while the issuer still receives its original token.
function sameReceiptScope(a,b,depth=0,budget={keys:0}){
 if(Object.is(a,b))return true;if(depth>10||!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 if(!Array.isArray(a)&&![Object.prototype,null].includes(Object.getPrototypeOf(a)))return false;
 const actual=Reflect.ownKeys(a),expected=Reflect.ownKeys(b);if(actual.length!==expected.length||(budget.keys+=expected.length)>4096)return false;
 for(const key of expected){const x=Object.getOwnPropertyDescriptor(a,key),y=Object.getOwnPropertyDescriptor(b,key);if(!x||!y||!Object.hasOwn(x,'value')||!Object.hasOwn(y,'value')||!sameReceiptScope(x.value,y.value,depth+1,budget))return false;}return true;
}
export function createAIFilterReadSession({getStore,consent,policy,configuration:c,hub}={}){
 const caller=Object.getOwnPropertyDescriptor(Object.getOwnPropertyDescriptor(c?.service||{},'context')?.value||{},'caller')?.value;
 if(typeof getStore!=='function'||!c||c.origin!==identityCurrentnessHubOrigin(hub)||!['readFilterReadProofs','isCurrent','clock'].every(k=>typeof Object.getOwnPropertyDescriptor(c,k)?.value==='function')||typeof c.processing?.resolve!=='function'||typeof c.processing?.isCurrent!=='function'||!caller||!Object.isFrozen(caller)||!consent||!exact(policy,['version','qualificationId'])||policy.version!=='pro-ambiguous-1'||!id(policy.qualificationId))return null;
 const selectedPolicy=freeze(snapshot(policy)),cache=new Map(),leases=new Map(),pending=new Map(),scheduled=new Map(),pinned=new Map(),pages=new Map(),seals=new Set(),grants=new WeakMap();let store=null,history=null,disposed=false,serial=0,session=null,identityWork=null,identityTimer=null,last=-1,cleanupCursor=null,cleanupWork=null;
 const closeLease=id=>{const l=leases.get(id);if(l){leases.delete(id);l.processing.snapshot.revocationSignal.removeEventListener('abort',l.abort);}};
 const dropIdentity=()=>{clearTimeout(identityTimer);identityTimer=null;const old=session;session=null;old?.remove?.();old?.connection.close();for(const id of [...leases.keys()])closeLease(id);};
 const invalidate=()=>{serial++;for(const timer of scheduled.values())clearTimeout(timer);scheduled.clear();for(const handle of [...pages.keys()])releasePage(handle);dropIdentity();};
 const currentStore=()=>{const s=getStore(),repository=ownValue(s,'repository'),database=ownValue(repository,'db');if(disposed||!database||c.isCurrent()!==true||ownValue(s,'repository')!==repository||ownValue(repository,'db')!==database)fail();if(store&&store!==s){invalidate();history?.dispose();history=null;cleanupCursor=null;clearCache();}store=s;history??=createAIFilterVisibilityHistory(s);if(!history)fail();return s;};
 const now=()=>{const at=c.clock();if(!integer(at)||at<last){invalidate();fail();}last=at;return at;};
 const consentNow=()=>{const receipt=consent.capture();return receipt&&readAIFilterConsentEpoch(consent,receipt)?receipt:null;};
 const identityCurrent=s=>{try{return !!s&&!disposed&&s.serial===serial&&currentStore()===s.store&&ownValue(s.store,'repository')===s.repository&&ownValue(s.repository,'db')===s.database&&readFilterReadIdentityBinding(s.binding,s.store)!==null&&readHubFilterReadIdentityObservation(hub,s.connection)?.identity===s.identity&&s.identity.tier==='pro'&&now()<s.identity.verifiedUntil;}catch{return false;}};
 // Preserve the issuer's private receipt identity. Frozen local facts are a CAS
 // snapshot, never a replacement authority passed back to a branded issuer.
 const receiptFacts=(held,s,scope)=>{const r=held?.original,v=held?.snapshot;return own(r,receiptFields)&&!!v&&receiptFields.filter(k=>k!=='scope').every(k=>r[k]===v[k])&&sameReceiptScope(r.scope,v.scope)&&v.version===1&&v.store===s&&v.caller===caller&&Object.isFrozen(v.caller)&&token(v.epoch)&&v.processing===true&&integer(v.expiresAt)&&v.expiresAt>nativeNow()&&v.revocationSignal instanceof AbortSignal&&!signalAborted.call(v.revocationSignal)&&sameReceiptScope(v.scope,scope);};
 const validReceipt=(held,s,scope)=>receiptFacts(held,s,scope)&&c.processing.isCurrent(held.original,s)===true&&receiptFacts(held,s,scope);
 // A synchronous issuer may trigger another original capability's revocation.
 // Its listeners tear down these private identities immediately. Recheck them
 // after the issuer without calling it (or another mutable verifier) again.
 const heldLease=l=>!disposed&&leases.get(l.id)===l&&cache.get(l.id)===l.history&&session===l.session&&l.session.serial===serial&&store===l.store&&ownValue(l.store,'repository')===l.session.repository&&ownValue(l.session.repository,'db')===l.session.database;
 const current=l=>{try{if(!heldLease(l)||!identityCurrent(l.session)||!validReceipt(l.processing,l.store,l.scope))return false;const at=now();return heldLease(l)&&readFilterReadIdentityBindingFacts(l.session.binding,l.store)===l.session.request&&readHubFilterReadIdentityObservationFacts(hub,l.session.connection,at)?.identity===l.session.identity&&receiptFacts(l.processing,l.store,l.scope);}catch{return false;}};
 function forget(id){const h=cache.get(id);if(!h)return;closeLease(id);cache.delete(id);h.resource.cacheBytes-=h.bytes;}
 function clearCache(){for(const id of [...cache.keys()])forget(id);}
 function trim(){while(cache.size>LIMITS.cache){const oldest=[...cache.keys()].find(k=>!pinned.has(k));if(oldest===undefined)break;forget(oldest);}}
 function remember(id,h){if(cache.has(id)){cache.delete(id);cache.set(id,h);return true;}if(h.resource.cacheBytes+h.bytes>LIMITS.cacheBytes)return false;h.resource.cacheBytes+=h.bytes;cache.set(id,h);trim();return cache.has(id);}
 function releasePage(handle){const page=pages.get(handle);if(!page)return false;pages.delete(handle);clearTimeout(page.timer);page.resource.pages--;for(const id of page.ids){for(const map of [pinned,page.resource.pinned]){const count=map.get(id)-1;if(count>0)map.set(id,count);else map.delete(id);}}trim();return true;}
 async function loadOne(id){if(!id)return null;const s=currentStore(),version=serial;let h=cache.get(id);if(h){remember(id,h);return h;}const witness=await history.load(id);if(version!==serial||currentStore()!==s||!witness)return null;const data=readAIFilterVisibilityWitness(witness,s);if(!data||data.origin!==c.origin||!equal(data.publication.policy,selectedPolicy))return null;const digest=await aiFilterVisibilityWitnessDigest(witness,s);if(version!==serial||currentStore()!==s||!digest)return null;h={witness,data,digest,lastAttempt:-Infinity,resource:resourcesFor(hub),bytes:2*new TextEncoder().encode(canonical(data)).length+256};return remember(id,h)?h:null;}
 async function cleanupOne(){if(cleanupWork)return cleanupWork;const h=history,version=serial;const work=Promise.resolve().then(async()=>{try{const result=await h.cleanup(cleanupCursor);if(result&&version===serial&&history===h)cleanupCursor=result.next;return result;}catch{return null;}finally{cleanupWork=null;}});cleanupWork=work;return work;}
 function scopeFor(h,s){const d=h.data,r=s.request;return freeze({purpose:'ai-filter-history-visibility-qualification',principalId:r.principalId,libraryId:r.libraryId,readerSessionId:r.readerSessionId,consentEpoch:r.consentEpoch,localBindingHash:r.localBindingHash,restoreEpoch:d.restoreEpoch,history:{logicalJobId:d.request.jobId,childOperationId:d.request.operationId,filterOperationId:d.publication.operationId,decisionDigest:h.digest,authority:structuredClone(d.publication.epochs)},policy:structuredClone(d.publication.policy),candidateIds:[...d.publication.scope.candidateIds],neighborIds:[...d.publication.scope.neighborIds],inputs:[...d.publication.scope.candidateIds,...d.publication.scope.neighborIds].sort().map(inputId=>({inputId,selectedFields:['body','note']})),facets:['filter']});}
 async function acquireIdentity(h){
  if(identityCurrent(session))return session.identity.principalId===h.data.identity.principalId&&session.identity.libraryId===h.data.identity.libraryId?session:null;
  if(identityWork)return identityWork.result;dropIdentity();const s=currentStore(),version=serial;if(!consentNow())return null;const ticket=reserveHubIdentityObservation(hub);if(!ticket)return null;
  let accepted=true,connection=null,held=true,timeout;const deadline=new Promise(resolve=>{timeout=setTimeout(()=>{accepted=false;connection?.close();resolve(null);},LIMITS.admissionMs);timeout.unref?.();});
  const check=()=>{if(!accepted||version!==serial||currentStore()!==s||!consentNow())fail();};
  const work=Promise.resolve().then(async()=>{try{check();const binding=await createFilterReadIdentityBinding({getStore,consent,witness:h.witness,policy:selectedPolicy,configuration:c});check();const request=readFilterReadIdentityBinding(binding,s);if(!request)fail();
   const raw=await c.readFilterReadProofs(structuredClone(request));check();const proofs=snapshot(raw,{maxBytes:24576,maxDepth:1,maxKeys:2,maxString:8192});if(!exact(proofs,['principalToken','entitlementToken'])||Object.values(proofs).some(x=>typeof x!=='string'||!x.length||x.length>8192))fail();
   if(!readFilterReadIdentityBinding(binding,s))fail();connection=await openHubFilterReadIdentityObservation(hub,ticket,{request,...proofs});held=false;check();const observed=readHubFilterReadIdentityObservation(hub,connection);if(!observed||!equal(observed.request,request)||observed.identity.tier!=='pro')fail();
   const next={serial:version,store:s,repository:ownValue(s,'repository'),database:ownValue(ownValue(s,'repository'),'db'),binding,request,identity:observed.identity,connection,remove:null};if(!identityCurrent(next))fail();session=next;next.remove=connection.onInvalidate(()=>{if(session===next)dropIdentity();});
   identityTimer=setTimeout(()=>{const ids=[...leases.keys()];dropIdentity();if(disposed||!ids.length)return;refresh(ids).catch(()=>{});},Math.max(1,Math.min(45000,next.identity.verifiedUntil-now()-2000)));identityTimer.unref?.();accepted=false;return next;
  }catch{connection?.close();return null;}finally{clearTimeout(timeout);if(held)releaseHubIdentityObservation(hub,ticket);identityWork=null;}});
  const result=Promise.race([work,deadline]);identityWork={work,result};return result;
 }
 async function qualify(id){
  if(!id||disposed)return false;if(pending.has(id))return pending.get(id).result;if(current(leases.get(id)))return true;if(pending.size>=LIMITS.pending)return false;let resource;try{currentStore();resource=resourcesFor(hub);}catch{return false;}if(resource.pending>=LIMITS.pending)return false;resource.pending++;
  let accepted=true,timeout;const deadline=new Promise(resolve=>{timeout=setTimeout(()=>{accepted=false;closeLease(id);resolve(false);},LIMITS.admissionMs);timeout.unref?.();});
  const work=Promise.resolve().then(async()=>{try{const h=await loadOne(id);if(!accepted||!h||Date.now()-h.lastAttempt<LIMITS.cooldownMs)return false;h.lastAttempt=Date.now();closeLease(id);const s=currentStore(),version=serial,identity=await acquireIdentity(h);if(!accepted||version!==serial||currentStore()!==s||!identityCurrent(identity)||identity.identity.principalId!==h.data.identity.principalId||identity.identity.libraryId!==h.data.identity.libraryId)fail();const scope=scopeFor(h,identity);
   const check=()=>{if(!accepted||version!==serial||currentStore()!==s||cache.get(id)!==h||session!==identity||!identityCurrent(identity))fail();};
   const processing=await s.repository.transaction(false,async t=>{check();await assertFilterReadIdentityBinding(t,identity.binding,s);check();const raw=await c.processing.resolve(t,scope);check();if(!own(raw,receiptFields))fail();const r=Object.freeze({original:raw,snapshot:Object.freeze({...raw,scope:freeze(snapshot(raw.scope,{maxBytes:32768,maxDepth:10,maxKeys:4096,maxString:4096}))})});if(!validReceipt(r,s,scope))fail();return r;},['meta','inputStates','blockIndex','filterInputs']);check();if(!validReceipt(processing,s,scope))fail();
   const l={id,store:s,history:h,session:identity,scope,processing,abort:()=>closeLease(id)};processing.snapshot.revocationSignal.addEventListener('abort',l.abort,{once:true});leases.set(id,l);if(!current(l)){closeLease(id);fail();}return true;
  }catch{return false;}finally{clearTimeout(timeout);pending.delete(id);resource.pending--;}});const result=Promise.race([work,deadline]);pending.set(id,{work,result});return result;
 }
 async function refresh(ids){for(let i=0;i<ids.length&&!disposed;i+=LIMITS.pending)await Promise.all(ids.slice(i,i+LIMITS.pending).map(qualify));}
 function schedule(id){if(!id||disposed||pending.has(id)||scheduled.has(id)||scheduled.size>=LIMITS.pending)return;const h=cache.get(id);if(h&&Date.now()-h.lastAttempt<LIMITS.cooldownMs)return;const timer=setTimeout(()=>qualify(id).finally(()=>{if(scheduled.get(id)===timer)scheduled.delete(id);}),0);timer.unref?.();scheduled.set(id,timer);}
 const owner=Object.freeze({
  load:async()=>{try{currentStore();await consent.status();return true;}catch{return false;}},renew:qualify,
  async preparePage(ids){
   if(disposed||!Array.isArray(ids)||ids.length>LIMITS.pageOperations||ids.some(x=>!id(x))||new Set(ids).size!==ids.length)return null;
   let resource;try{currentStore();resource=resourcesFor(hub);}catch{return null;}if(resource.pages>=LIMITS.pages||new Set([...resource.pinned.keys(),...ids]).size>LIMITS.pageOperations)return null;
   const handle=Object.freeze(Object.create(null)),page={ids:[...ids],resource,timer:null},until=Date.now()+LIMITS.admissionMs;resource.pages++;pages.set(handle,page);for(const id of ids)for(const map of [pinned,resource.pinned])map.set(id,(map.get(id)||0)+1);
   page.timer=setTimeout(()=>releasePage(handle),LIMITS.pageLeaseMs);page.timer.unref?.();
   try{for(let i=0;i<ids.length&&!disposed&&pages.has(handle)&&Date.now()<until;i+=LIMITS.pending)await Promise.all(ids.slice(i,i+LIMITS.pending).map(qualify));if(disposed||!pages.has(handle)){releasePage(handle);return null;}return handle;}catch{releasePage(handle);return null;}
  },releasePage,
  async prepare(ids){if(!Array.isArray(ids)||ids.length>LIMITS.pending||ids.some(x=>!id(x))||new Set(ids).size!==ids.length)return false;return (await Promise.all(ids.map(qualify))).every(Boolean);},
  retain(args){if(disposed||seals.size>=LIMITS.pending)return false;let work,resource;try{currentStore();resource=resourcesFor(hub);if(resource.seals>=LIMITS.pending)return false;work=sealAIFilterVisibilityWitness({...args,consent});}catch{return false;}
   const completion=work.then(async witness=>{const s=currentStore(),h=history;let saved=await h.persist(witness);await cleanupOne();if(!saved&&currentStore()===s&&history===h)saved=await h.persist(witness);if(!saved)return;const data=readAIFilterVisibilityWitness(witness,s);if(data)schedule(data.publication.operationId);}).catch(()=>{});resource.seals++;seals.add(completion);completion.finally(()=>{seals.delete(completion);resource.seals--;});return true;},
  async resolveVisibility(t,r){if(!exact(r,['purpose','candidateIds','neighborIds','operationId','inputId','decision'])||r.purpose!=='ai-maintenance-filter-visibility')fail();const h=cache.get(r.operationId),l=leases.get(r.operationId);if(!h){schedule(r.operationId);fail();}const p=h.data.publication,item=p.filtered.find(x=>x.inputId===r.inputId);if(!item||!equal(p.scope,{candidateIds:r.candidateIds,neighborIds:r.neighborIds})||!equal(r.decision,{version:1,policy:p.policy,authority:p.epochs,scope:p.scope,proof:p.proof,sequence:item.sequence}))fail();if(!current(l)){closeLease(r.operationId);schedule(r.operationId);fail();}
   await assertFilterReadIdentityBinding(t,l.session.binding,l.store);if(!current(l))fail();const grant=freeze({allowed:true,tier:'pro',optIn:true,processingConsent:true,inputIds:[...p.scope.candidateIds,...p.scope.neighborIds].sort(),epochs:structuredClone(p.epochs),policy:structuredClone(p.policy)});grants.set(grant,l);return grant;
  },
  isCurrent:grant=>current(grants.get(grant)),async settled(){await Promise.allSettled([...seals]);},isDrained:()=>!identityWork&&!cleanupWork&&pages.size===0&&pending.size===0&&seals.size===0&&scheduled.size===0&&(!history||history.isDrained()),
  status:()=>({history:cache.size,active:[...leases.values()].filter(current).length,pending:pending.size,scheduled:scheduled.size,pages:pages.size,pinned:pinned.size,identity:identityCurrent(session)?1:0}),invalidate,
  dispose(){if(disposed)return;disposed=true;invalidate();for(const handle of [...pages.keys()])releasePage(handle);history?.dispose();clearCache();remove?.();}
 });
 const consumerCaps=new WeakMap();
 historicalReaderOwners.set(owner,(requestedStore,admission)=>{
  if(typeof organizeRead.readOriginalOrganizeFilterAdmission!=='function'||typeof organizeRead.assertOriginalOrganizeFilterAdmissionFacts!=='function')fail();
  const selected=organizeRead.readOriginalOrganizeFilterAdmission(admission,requestedStore);
  if(!selected||!Object.isFrozen(selected)||!id(selected.inputId)||!id(selected.operationId)||selected.decisionVersion!==1||currentStore()!==requestedStore)fail();
  const previous=consumerCaps.get(admission);if(previous){assertAIFilterHistoricalReaderCurrent(previous,requestedStore,admission);return previous;}
  const l=leases.get(selected.operationId),h=cache.get(selected.operationId),p=h?.data.publication,item=p?.filtered.find(x=>x.inputId===selected.inputId);
  if(!l||l.history!==h||!item||!current(l))fail();
  const sources=[...p.proof.snapshot.items,...p.proof.neighbors].map(x=>Object.freeze({inputId:x.inputId,recordId:x.sourceRecordIds[0],sourceKey:x.identities[0]}));
  const view=freeze({inputId:selected.inputId,operationId:selected.operationId,candidateIds:[...p.scope.candidateIds],neighborIds:[...p.scope.neighborIds],sources,restoreEpoch:h.data.restoreEpoch});
  let active=true,sample=null,sampleSerial=0;
  const local=()=>{
   if(!active||!sample||!heldLease(l)||l.store!==requestedStore||cache.get(selected.operationId)!==h||!organizeRead.assertOriginalOrganizeFilterAdmissionFacts(admission,requestedStore)||readFilterReadIdentityBindingFacts(l.session.binding,l.store)!==l.session.request||readHubFilterReadIdentityObservationFacts(hub,l.session.connection,sample.at)?.identity!==l.session.identity||!receiptFacts(l.processing,l.store,l.scope))fail();
   return true;
  };
  const facts=()=>{try{return local();}catch(error){active=false;sample=null;throw error;}};
  const currentConsumer=()=>{try{
   if(!active)fail();const next=organizeRead.readOriginalOrganizeFilterAdmission(admission,requestedStore);
   if(next.inputId!==selected.inputId||next.operationId!==selected.operationId||next.decisionVersion!==1||!current(l))fail();
   const serial=++sampleSerial;sample={at:last};queueMicrotask(()=>{if(sampleSerial===serial)sample=null;});return local();
  }catch(error){active=false;sample=null;throw error;}};
  const cap=Object.freeze({});historicalReaderCaps.set(cap,{store:requestedStore,admission,view,proof:freeze(p.proof),current:currentConsumer,facts});consumerCaps.set(admission,cap);currentConsumer();return cap;
 });
 const remove=consent.onInvalidate(invalidate);return owner;
}
