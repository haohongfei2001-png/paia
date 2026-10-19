import {generateKeyPairSync,sign} from 'node:crypto';
import {filterReadRequestBindingHash,requestBindingHash} from '../signed-identity.mjs';
import {request as financialRequest} from './postgres-fixtures.mjs';
// Test-only ephemeral keys. No production issuer, private key persistence,
// provider, network, or account configuration is provided by this fixture.
const keys=Object.fromEntries(['principal','entitlement'].map(k=>[k,generateKeyPairSync('rsa',{modulusLength:2048})]));
export function filterReadFixture(at=Date.UTC(2026,0,1)){
 const now=Math.floor(at/1000)*1000;
 const config={maxTokenAgeSeconds:300,maxSecurityStateAgeSeconds:60,...Object.fromEntries(Object.entries(keys).map(([kind,key])=>[kind,{issuer:`https://${kind}.invalid`,audience:`SYNTHETIC-${kind}`,keys:[{kid:kind,publicKeyPem:key.publicKey.export({type:'spki',format:'pem'}),notBefore:now/1000-60,notAfter:now/1000+600,revoked:false}]}]))};
 const request={version:1,purpose:'AI_FILTER_VISIBILITY',principalId:'synthetic-principal',libraryId:'synthetic-library',readerSessionId:'synthetic-reader',consentEpoch:'synthetic-consent',localBindingHash:'a'.repeat(64),policyId:'synthetic-policy'};
 const security=r=>({principalId:r.principalId,libraryId:r.libraryId,observedAt:now/1000,expiresAt:now/1000+60,principalActive:true,entitlementActive:true,principalGeneration:'synthetic-principal-generation',entitlementGeneration:'synthetic-entitlement-generation',revokedPrincipalKeys:[],revokedEntitlementKeys:[]});
 const token=(kind,claims,header={})=>{const raw=[{alg:'RS256',typ:`paia-${kind}-filter-read+jwt`,kid:kind,...header},claims].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');return raw+'.'+sign('RSA-SHA256',Buffer.from(raw),keys[kind].privateKey).toString('base64url');};
 const bundle=(r=request,patch={},financial=false)=>({request:r,...Object.fromEntries(['principal','entitlement'].map(kind=>{
  let claims={iss:config[kind].issuer,aud:config[kind].audience,sub:r.principalId,iat:now/1000,nbf:now/1000,exp:now/1000+120,jti:`synthetic-${kind}-token`,library_id:r.libraryId,
   ...(financial?{operation_id:r.operationId,request_hash:requestBindingHash(r)}:{purpose:r.purpose,read_session_id:r.readerSessionId,read_request_hash:filterReadRequestBindingHash(r)}),generation:`synthetic-${kind}-generation`,
   ...(kind==='entitlement'?{principal_issuer:config.principal.issuer,tier:'pro',entitlements:[financial?r.jobType:r.purpose]}:{}),...(patch[kind]??{})};
  if(patch.raw?.[kind])claims=patch.raw[kind](claims);
  return [kind+'Token',token(kind,claims,{...(financial?{typ:`paia-${kind}+jwt`}:{}),...(patch.header?.[kind]??{})})];
 }))});
 const financial=financialRequest('synthetic-financial');financial.principalId=request.principalId;financial.libraryId=request.libraryId;
 return {now,config,request,security,bundle,financial,token,financialBundle:(r=financial,p={})=>bundle(r,p,true)};
}
