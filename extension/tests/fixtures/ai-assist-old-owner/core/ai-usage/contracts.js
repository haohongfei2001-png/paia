import {ArchiveError} from '../constants.js';
import {hashText} from '../dedupe.js';
export const JOB_TYPES=Object.freeze(['AI_MAINTENANCE','AI_ORGANIZE','AI_ASSIST']);
export const CHILD_LIMITS=Object.freeze({AI_MAINTENANCE:2,AI_ORGANIZE:4,AI_ASSIST:1});
export const FACETS=Object.freeze({AI_MAINTENANCE:['topic','context','filter'],AI_ORGANIZE:['organize'],AI_ASSIST:['assist']});
export const fail=(code='INVALID_REQUEST')=>{throw new ArchiveError(code);};
export const opaque=x=>typeof x==='string'&&x.length>0&&x.length<=200;
export const token=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export const integer=x=>Number.isSafeInteger(x)&&x>=0;
export const sorted=value=>Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,sorted(value[k])])):value;
export const canonical=value=>JSON.stringify(sorted(value));
export const equal=(a,b)=>canonical(a)===canonical(b);
export const digest=value=>hashText(canonical(value));
export function exact(value,keys,required=keys){if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).some(k=>!keys.includes(k))||required.some(k=>!Object.hasOwn(value,k)))fail();}
export const unitKey=u=>canonical([u.key,u.facet,u.scope]);
export function validateCoverage(units,type){
 if(!Array.isArray(units)||!units.length||units.length>100)fail();
 const seen=new Set();for(const u of units){exact(u,['key','facet','scope']);if(typeof u.key!=='string'||u.key.length>450||!FACETS[type]?.includes(u.facet)||!opaque(u.scope)||seen.has(unitKey(u)))fail();seen.add(unitKey(u));}
 return [...units].sort((a,b)=>unitKey(a).localeCompare(unitKey(b)));
}
export function validateAuthority(a,type){
 exact(a,['allowed','principalId','libraryId','consentEpoch','jobTypes']);
 if(a.allowed!==true||![a.principalId,a.libraryId,a.consentEpoch].every(opaque)||!Array.isArray(a.jobTypes)||!a.jobTypes.includes(type)||a.jobTypes.some(t=>!JOB_TYPES.includes(t)))fail('UNAVAILABLE');
 return {principalId:a.principalId,libraryId:a.libraryId,consentEpoch:a.consentEpoch};
}
// A descriptor is a strict metadata DTO. There is intentionally no request body,
// arbitrary diagnostics/error text, credentials or a production remote route.
export function localProviderDescriptor(provider){
 const d=structuredClone(provider?.describe?.());exact(d,['providerId','version','executionKind']);
 if(!opaque(d.providerId)||!opaque(d.version)||!['fixture','local'].includes(d.executionKind))fail('UNAVAILABLE');return d;
}
