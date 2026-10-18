// Client-owned metadata, never server attestation of local content or consent.
// The original Qwen owner alone creates the live private publication handle.
import {canonical,JOB_TYPES} from './contracts.js';
import {exact,integer,snapshot,stop} from './qwen-request-data.js';

export const CLIENT_DECLARATION_REQUEST_FIELDS=Object.freeze(['operationId','jobId','principalId','libraryId','scopeFingerprint','contractVersion','routeVersion','consentEpoch','jobType','childIndex','childCount','inputTokens','outputCap','maxCompletionTokens']);
const numeric=new Set(['childIndex','childCount','inputTokens','outputCap','maxCompletionTokens']);
export const CLIENT_DECLARATION_FIELDS=Object.freeze(['version','requestHash','payloadDigest','scopeDigest','contentGeneration','consentEpoch','authorizationId','expiresAt']);
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const text=value=>typeof value==='string'&&value.length>0&&value.length<=200&&value.isWellFormed()&&!/[\u0000-\u001f\u007f]/u.test(value);
export function clientDeclarationData(value){
 const d=snapshot(value,{maxBytes:2048,maxKeys:8,maxDepth:1,maxString:200});
 if(!exact(d,CLIENT_DECLARATION_FIELDS)||d.version!==1||!['requestHash','payloadDigest','scopeDigest'].every(k=>hash(d[k]))||!['contentGeneration','consentEpoch','authorizationId'].every(k=>text(d[k]))||!integer(d.expiresAt))stop('DECLARATION_INVALID');
 return Object.freeze({...d});
}
export const clientDeclarationCanonical=value=>canonical(clientDeclarationData(value));

// Network DTO narrowing only; it cannot establish authorization or reservation.
export function clientDeclarationRequestData(value){
 const r=snapshot(value,{maxBytes:4096,maxKeys:14,maxDepth:1,maxString:256});
 if(!exact(r,CLIENT_DECLARATION_REQUEST_FIELDS)||!CLIENT_DECLARATION_REQUEST_FIELDS.every(k=>numeric.has(k)?integer(r[k]):text(r[k]))||!JOB_TYPES.includes(r.jobType)||r.childCount<1||r.childIndex>=r.childCount)stop('DECLARATION_INVALID');
 return Object.freeze({...r});
}
