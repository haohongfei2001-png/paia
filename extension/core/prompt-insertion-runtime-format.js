import {ArchiveError} from './constants.js';

// Strict local data format only. Validation supplies no IO, live receipt,
// insertion capability, source-cut proof, restoration grant or portable entity.
export const PROMPT_INSERTION_RUNTIME='prompt-insertion-runtime:v1';
export const PROMPT_INSERTION_LIMITS=Object.freeze({claims:500,bytes:512*1024,admissionBytes:128*1024,receivers:64,epochs:500});
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const integer=v=>Number.isSafeInteger(v)&&v>=0;
const id=v=>typeof v==='string'&&v.length>0&&v.length<=128;
const fail=(code='PROMPT_INSERTION_STALE')=>{throw new ArchiveError(code);};
const exact=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).length===keys.length&&keys.every(k=>Object.hasOwn(Object.getOwnPropertyDescriptors(v)[k]??{},'value'));
const sorted=(v,depth=0)=>{if(depth>24)fail('INVALID_REQUEST');if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return v;if(Array.isArray(v))return v.map(x=>sorted(x,depth+1));if(v&&Object.getPrototypeOf(v)===Object.prototype){const out={};for(const k of Object.keys(v).sort()){if(['__proto__','constructor','prototype'].includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(v,k),'value'))fail('INVALID_REQUEST');out[k]=sorted(v[k],depth+1);}return out;}fail('INVALID_REQUEST');};
export const promptInsertionEncoding=v=>JSON.stringify(sorted(v));
// Validate dense data-only lists before iteration, including non-enumerable keys.
const dataArray=(value,max)=>Array.isArray(value)&&Object.getPrototypeOf(value)===Array.prototype&&value.length<=max&&Reflect.ownKeys(value).length===value.length+1&&Array.from({length:value.length},(_,i)=>Object.hasOwn(Object.getOwnPropertyDescriptor(value,String(i))??{},'value')).every(Boolean);
const receiverKeys=['tabId','windowId','documentId','nonce'];
const validReceiver=r=>exact(r,receiverKeys)&&integer(r.tabId)&&integer(r.windowId)&&id(r.documentId)&&uuid(r.nonce);
const envelopeKeys=['version','claimId','actionId','operationId','receiptEpoch','epoch','lane','receiver','sourceDigest','authorizationDigest','initiatorDigest','domainDigest','digest'];
export const validPromptInsertionEnvelope=e=>exact(e,envelopeKeys)&&e.version===1&&[e.claimId,e.actionId,e.operationId,e.receiptEpoch].every(uuid)&&integer(e.epoch)&&e.epoch>0&&['manual','assist','next'].includes(e.lane)&&validReceiver(e.receiver)&&[e.sourceDigest,e.authorizationDigest,e.initiatorDigest,e.domainDigest,e.digest].every(hash);
export function validatePromptInsertionRuntimeRow(r){
 if(!exact(r,['id','version','databaseId','restoreEpoch','revision','nextEpoch','retiredEpochFloor','legacyCoverageUnknown','domainDigest','retiredRanges','epochs','claims'])||r.id!==PROMPT_INSERTION_RUNTIME||r.version!==1||!id(r.databaseId)||!(r.restoreEpoch===null||id(r.restoreEpoch))||!integer(r.revision)||!integer(r.nextEpoch)||!integer(r.retiredEpochFloor)||r.retiredEpochFloor>r.nextEpoch||r.legacyCoverageUnknown!==true||!hash(r.domainDigest)||!dataArray(r.retiredRanges,PROMPT_INSERTION_LIMITS.epochs)||!dataArray(r.epochs,PROMPT_INSERTION_LIMITS.epochs)||!dataArray(r.claims,PROMPT_INSERTION_LIMITS.claims))fail('PROMPT_INSERTION_STORAGE_INVALID');
 const nums=new Set(),nonces=new Set();for(const e of r.epochs){if(!exact(e,['epoch','receiptEpoch','state'])||!integer(e.epoch)||e.epoch<=r.retiredEpochFloor||e.epoch>r.nextEpoch||!uuid(e.receiptEpoch)||!['open','retired'].includes(e.state)||nums.has(e.epoch)||nonces.has(e.receiptEpoch))fail('PROMPT_INSERTION_STORAGE_INVALID');nums.add(e.epoch);nonces.add(e.receiptEpoch);}
 const pieces=r.epochs.map(e=>[e.epoch,e.epoch]);for(const range of r.retiredRanges){if(!exact(range,['start','end'])||!integer(range.start)||!integer(range.end)||range.start<=r.retiredEpochFloor||range.end<range.start||range.end>r.nextEpoch)fail('PROMPT_INSERTION_STORAGE_INVALID');pieces.push([range.start,range.end]);}pieces.sort((a,b)=>a[0]-b[0]);let next=r.retiredEpochFloor+1;for(const [start,end]of pieces){if(start!==next)fail('PROMPT_INSERTION_STORAGE_INVALID');next=end+1;}if(next!==r.nextEpoch+1)fail('PROMPT_INSERTION_STORAGE_INVALID');
 const claims=new Set(),ops=new Set();for(const c of r.claims){if(!exact(c,['envelope','state'])||!validPromptInsertionEnvelope(c.envelope)||!['pending','inserted','not_inserted','not_dispatched'].includes(c.state)||c.envelope.epoch>r.nextEpoch||claims.has(c.envelope.claimId)||ops.has(c.envelope.operationId))fail('PROMPT_INSERTION_STORAGE_INVALID');const epoch=r.epochs.find(e=>e.epoch===c.envelope.epoch);if(c.envelope.epoch>r.retiredEpochFloor&&!r.retiredRanges.some(x=>c.envelope.epoch>=x.start&&c.envelope.epoch<=x.end)&&epoch?.receiptEpoch!==c.envelope.receiptEpoch)fail('PROMPT_INSERTION_STORAGE_INVALID');claims.add(c.envelope.claimId);ops.add(c.envelope.operationId);}
 if(new TextEncoder().encode(promptInsertionEncoding(r)).length>PROMPT_INSERTION_LIMITS.bytes)fail('RESOURCE_LIMIT');return r;
}
