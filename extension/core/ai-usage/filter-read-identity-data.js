// Syntax only. This closed, body-free purpose is deliberately disjoint from
// financial requests. Neither a request nor its digest establishes authority.
export const FILTER_READ_IDENTITY_PURPOSE='AI_FILTER_VISIBILITY';
export const FILTER_READ_IDENTITY_DOMAIN='paia-filter-read-identity-v1\0';
const keys=Object.freeze(['version','purpose','principalId','libraryId','readerSessionId','consentEpoch','localBindingHash','policyId']);
const bounded=x=>typeof x==='string'&&x.length>0&&x.length<=200&&x.isWellFormed()&&!/[\u0000-\u001f\u007f]/u.test(x);
const fail=()=>{throw Object.assign(Error('FILTER_READ_REQUEST_INVALID'),{code:'FILTER_READ_REQUEST_INVALID'});};
export function snapshotFilterReadRequest(value){
 if(!value||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail();
 const ds=Object.getOwnPropertyDescriptors(value),actual=Reflect.ownKeys(ds);
 if(actual.length!==keys.length||actual.some(k=>typeof k!=='string'||!keys.includes(k)||!Object.hasOwn(ds[k],'value')))fail();
 const r=Object.fromEntries(keys.map(k=>[k,ds[k].value]));
 if(r.version!==1||r.purpose!==FILTER_READ_IDENTITY_PURPOSE||!['principalId','libraryId','readerSessionId','consentEpoch','policyId'].every(k=>bounded(r[k]))||typeof r.localBindingHash!=='string'||!/^[a-f0-9]{64}$/.test(r.localBindingHash))fail();
 return Object.freeze(r);
}
export function filterReadRequestBindingData(value){
 const r=snapshotFilterReadRequest(value);
 return FILTER_READ_IDENTITY_DOMAIN+JSON.stringify(Object.fromEntries(Object.keys(r).sort().map(k=>[k,r[k]])));
}
