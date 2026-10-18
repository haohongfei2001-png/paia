import {createHash} from 'node:crypto';
import {snapshotBundle} from './request-entry.mjs';
import {snapshotClientDeclaration,clientDeclarationHash} from './client-declaration.mjs';
import {canonical,equal} from '../../extension/core/ai-usage/contracts.js';
import {createQwenQualifiedRequestOwner} from '../../extension/core/ai-usage/qwen-qualified-request.js';
import {exact,snapshot,freeze} from '../../extension/core/ai-usage/qwen-request-data.js';

const digest=value=>createHash('sha256').update(canonical(value)).digest('hex');
const fail=()=>{throw new Error('PROVIDER_REQUEST_UNAVAILABLE');};
export function snapshotProviderInput(value){
 const data=snapshot(value,{maxBytes:294912,maxKeys:4096,maxDepth:16,maxString:131072});
 if(!exact(data,['bundle','declaration','childIdentity','payload','stream'])||typeof data.stream!=='boolean')fail();
 const bundle=snapshotBundle(data.bundle),declaration=snapshotClientDeclaration(bundle.request,data.declaration);
 const child=data.childIdentity,r=bundle.request;
 if(!exact(child,['logicalJobId','childOperationId','type','contractVersion','routeVersion','automaticRetries'])||
  child.logicalJobId!==r.jobId||child.childOperationId!==r.operationId||child.type!==r.jobType||child.contractVersion!==r.contractVersion||child.routeVersion!==r.routeVersion||child.automaticRetries!==0||
  !data.payload||Array.isArray(data.payload)||typeof data.payload!=='object'||declaration.payloadDigest!==digest(data.payload)||declaration.contentGeneration!==declaration.payloadDigest||
  declaration.scopeDigest!==digest({childIdentity:child,reservationRequest:r,authorizationId:declaration.authorizationId}))fail();
 return freeze({bundle,declaration,childIdentity:child,payload:data.payload,stream:data.stream,declarationDigest:clientDeclarationHash(declaration)});
}

// This is source composition of EXISTING structural owners. manifest and
// tokenize must come from a separately qualified SERVER registry/implementation,
// never HTTP metadata, client measurement, ambient credentials, or these tests.
// No callback or boolean here establishes that missing operational qualification.
// Conservative complete-input bounds are allowed: bill-identical counts are NOT
// required. The model-matched tokenizer + protocol/schema overhead still need
// independent input-bound qualification, not characters/4 or a guessed template.
export async function prepareProviderRequest({input,manifest,tokenize,row,facts,now}){
 if(typeof tokenize!=='function'||!equal(facts.route,manifest?.route))fail();
 const expiry=Math.min(input.declaration.expiresAt,manifest.profile?.validity?.expiresAt??0);
 let measurement=null;
 const auth={authorizationId:input.declaration.authorizationId,childIdentity:input.childIdentity,reservationRequest:input.bundle.request,payloadDigest:input.declaration.payloadDigest,expiresAt:expiry};
 const owner=createQwenQualifiedRequestOwner({
  clock:()=>now,resolveProfile:async()=>manifest,authorizePayload:async()=>auth,
  tokenize:async value=>{measurement=await tokenize(value);return measurement;},
  readReservation:async()=>row,
  readCurrentBinding:()=>({now,profile:manifest,authorization:auth,tokenizer:measurement,reservation:row}),
 });
 try{
  const material=await owner.bind({childIdentity:input.childIdentity,reservationRequest:input.bundle.request,payload:input.payload,stream:input.stream});
  if(material.status!=='BOUND_LOCAL'||material.identity.payloadDigest!==input.declaration.payloadDigest||!equal(material.identity.reservation.request,input.bundle.request))fail();
  // Preserve all original NOT_ESTABLISHED / false authority flags. The actual
  // DB authority guard rechecks current time/proofs after this asynchronous work.
  return freeze({...material,stream:input.stream,responseSchema:structuredClone(manifest.wire.responseFormat.json_schema.schema)});
 }finally{owner.dispose();}
}
