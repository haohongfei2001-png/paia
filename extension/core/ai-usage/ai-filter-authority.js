import {isAIFilterVisibilityOwner} from './filter-visibility-owner.js';
import {ArchiveError} from '../constants.js';
import {equal} from './contracts.js';
import {readMaintenanceFilterCapability} from './maintenance-service-client.js';
import * as originalFilter from './ai-filter-owner.js';
import {createAIFilterScopeSelector} from './ai-filter-scope.js';
const fail=(code='UNAVAILABLE')=>{throw new ArchiveError(code);};
const exact=(x,keys)=>!!x&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>Object.hasOwn(Object.getOwnPropertyDescriptor(x,k)||{},'value'));
const validPolicy=p=>exact(p,['version','qualificationId'])&&p.version==='pro-ambiguous-1'&&typeof p.qualificationId==='string'&&p.qualificationId.length>0&&p.qualificationId.length<=200;
// Source-owned composition. Local consent cannot mint identity, policy quality,
// user-text authority or a reservation. No default issuer or network exists.
export function createAIFilterAuthority({getStore=()=>null,consent,policy=null}={}){
 let disposed=false,store=null,selector=null,serial=0,readOnly=null;const bindings=new Map(),visibility=new Map(),grants=new WeakMap();
 const selectedPolicy=validPolicy(policy)?Object.freeze({...policy}):null;
 const clear=()=>{serial++;bindings.clear();visibility.clear();selector?.dispose();selector=null;};
 const currentStore=()=>{const value=getStore();if(disposed||!value)fail();if(store&&store!==value)clear();store=value;return value;};
 const live=b=>{try{return !disposed&&b.serial===serial&&currentStore()===b.store&&readMaintenanceFilterCapability(b.capability,b.store)===b.view&&consent.isCurrent(b.view.consent);}catch{return false;}};
 const visibleCurrent=b=>{try{return !disposed&&b.serial===serial&&currentStore()===b.store&&b.view.isVisibilityCurrent()===true&&consent.isCurrent(b.view.consent);}catch{return false;}};
 const sweep=()=>{for(const [cap,b]of bindings)if(!live(b))bindings.delete(cap);for(const [id,b]of visibility)if(!visibleCurrent(b))visibility.delete(id);};
 const grantFor=(view,scope)=>Object.freeze({allowed:true,tier:'pro',optIn:true,processingConsent:true,inputIds:Object.freeze([...scope.candidateIds,...scope.neighborIds].sort()),epochs:Object.freeze({entitlement:'service:'+view.identity.requestHash,optIn:view.consent.generation,processing:view.processingEpoch,userRead:view.userReadEpoch}),policy:selectedPolicy});
 const issue=(binding,visibilityOnly=false)=>{const value=Object.freeze({...binding.grant});grants.set(value,{binding,visibilityOnly});return value;};
 const authority=Object.freeze({
  async resolve(t,request){sweep();if(!exact(request,['purpose','candidateIds','neighborIds'])||request.purpose!=='ai-maintenance-filter')fail();const scope={candidateIds:request.candidateIds,neighborIds:request.neighborIds},matches=[...bindings.values()].filter(b=>equal(b.scope,scope)&&live(b));if(matches.length!==1)fail();const b=matches[0],r=await t.get('organizerUsage','aiu:attempt:'+b.view.request.operationId);if(!live(b))fail('STALE_BASE');
   if(!r||r.executionKind!=='server-backed'||r.serviceOrigin!==b.view.origin||r.childId!==b.view.request.operationId||r.jobId!==b.view.request.jobId||!equal(r.financialRequest,b.view.request)||!(r.state==='RESERVED'&&r.attemptCount===0||['RESPONSE_RECORDED','VALIDATED'].includes(r.state)&&r.attemptCount===1&&r.financialSettlement?.state==='SETTLED'&&r.financialSettlement.outcome==='VALIDATED'&&r.operationReceiptId===r.financialSettlement.receiptId))fail('STALE_BASE');return issue(b);
  },
  async resolveVisibility(t,request){sweep();if(!exact(request,['purpose','candidateIds','neighborIds','operationId','inputId','decision'])||request.purpose!=='ai-maintenance-filter-visibility')fail();const b=visibility.get(request.operationId);if(!b||!visibleCurrent(b)){if(readOnly)return readOnly.resolveVisibility(t,request);fail();}if(!equal(b.publication.scope,{candidateIds:request.candidateIds,neighborIds:request.neighborIds})||!b.publication.filtered.some(i=>i.inputId===request.inputId&&equal({version:1,policy:b.publication.policy,authority:b.publication.epochs,scope:b.publication.scope,proof:b.publication.proof,sequence:i.sequence},request.decision)))fail();return issue(b,true);},
  isCurrent(raw){const known=grants.get(raw);return known?(known.visibilityOnly?visibleCurrent(known.binding):live(known.binding)):readOnly?.isCurrent(raw)===true;}
 });
 const serviceFilter=Object.freeze({enabled:true,captureConsent:()=>consent?.capture?.()??null,isConsentCurrent:r=>consent?.isCurrent(r)===true,
  async selectScope(request){const s=currentStore();if(!selectedPolicy||!consent?.capture?.())fail();selector??=createAIFilterScopeSelector(s,{isCurrent:()=>!disposed&&getStore()===s&&!!consent?.capture?.()});return selector.selectScope(request);},
  authorizeReservation(capability,scope){sweep();const s=currentStore(),view=readMaintenanceFilterCapability(capability,s);if(!selectedPolicy||!view||!view.qualityReceiptRefs.includes(selectedPolicy.qualificationId)||!consent.isCurrent(view.consent)||bindings.size>=4&&!bindings.has(capability))fail();if(!exact(scope,['candidateIds','neighborIds'])||!Array.isArray(scope.candidateIds)||scope.candidateIds.length>8||!equal([...scope.candidateIds].sort(),view.candidateIds)||!Array.isArray(scope.neighborIds)||scope.neighborIds.length<1||scope.neighborIds.length>2||new Set(scope.neighborIds).size!==scope.neighborIds.length||scope.neighborIds.some(id=>!view.inputIds.includes(id)||scope.candidateIds.includes(id)))fail('INVALID_REQUEST');const prior=bindings.get(capability);if(prior&&!equal(prior.scope,scope))fail('STALE_BASE');if(!prior){const b={serial,store:s,capability,view,scope:structuredClone(scope)};b.grant=grantFor(view,b.scope);bindings.set(capability,b);}return true;},
  releaseReservation:capability=>bindings.delete(capability),
  archivePublication:args=>readOnly?.retain(args)===true,
  retainPublication(capability,token){sweep();const b=bindings.get(capability);if(!b||!live(b)||typeof originalFilter.readAIMaintenanceFilterVisibility!=='function')return false;const publication=originalFilter.readAIMaintenanceFilterVisibility(token,b.store);if(!publication||!equal(publication.scope,b.scope)||!equal(publication.epochs,b.grant.epochs)||!equal(publication.policy,b.grant.policy)||!Array.isArray(publication.filtered)||!publication.filtered.length||visibility.size>=8&&!visibility.has(publication.operationId))return false;const view=Object.freeze({identity:b.view.identity,consent:b.view.consent,isVisibilityCurrent:b.view.isVisibilityCurrent});visibility.set(publication.operationId,{serial:b.serial,store:b.store,grant:b.grant,view,publication});return true;}
 });
 const remove=consent?.onInvalidate?.(clear);
 return Object.freeze({authority,serviceFilter,configureVisibility(owner){if(disposed||owner!==null&&!isAIFilterVisibilityOwner(owner))return false;if(readOnly&&readOnly!==owner)readOnly.dispose();readOnly=owner;return true;},status(){sweep();return {qualified:!!selectedPolicy,available:[...bindings.values()].some(live)||[...visibility.values()].some(visibleCurrent)||readOnly?.status().active>0};},invalidate:clear,dispose(){disposed=true;clear();readOnly?.dispose();readOnly=null;remove?.();}});
}
