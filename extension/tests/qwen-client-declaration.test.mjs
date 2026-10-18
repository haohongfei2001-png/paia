import test from 'node:test';
import assert from 'node:assert/strict';
import {createQwenQualifiedRequestOwner} from '../core/ai-usage/qwen-qualified-request.js';
import {AtomicReservationLedger} from '../core/ai-usage/atomic-reservation.js';
import {createQwenJsonUsageParser} from '../core/ai-usage/qwen-usage-parser.js';
import {canonical} from '../core/ai-usage/contracts.js';
import {hashText} from '../core/dedupe.js';

const CORRESPONDENCE=['id','jobType','contractVersion','routeVersion','endpoint','model','apiProfileId','usageProfile','tokenizerProfileId','decodingPolicyId','responseSchemaDigest','qualityReceiptRefs'];
const clone=structuredClone;
const refresh=m=>{m.known=Object.fromEntries(CORRESPONDENCE.map(k=>[k,clone(m.profile[k])]));m.known.thinkingControl=m.profile.thinking.control;};
async function fixture(type='AI_ASSIST',withReservation=true){
 const schema={type:'object',properties:{action:{type:'string',minLength:1,maxLength:10,enum:['DEFER','KEEP']}},required:['action'],additionalProperties:false};
 const profile={version:1,kind:'synthetic-request-profile-v1',id:'fixture-profile',jobType:type,contractVersion:'fixture-contract',routeVersion:'fixture-route',endpoint:{host:'fixture.workspace.invalid',region:'fixture-region',deployment:'fixture-deployment',path:'/compatible-mode/v1/chat/completions'},model:{requested:'fixture-model',resolutionVersion:'fixture-resolution',responseAllowlist:['fixture-model']},apiProfileId:'fixture-api',usageProfile:{version:1,shape:'compatible-direct-v1',cacheMode:'implicit',reasoningAbsence:'qualified-zero-nonthinking',creationAbsence:'qualified-zero-no-markers',cachedAbsence:'reject'},thinking:{enabled:false,control:'none',thinkingBudget:null,requestedMaxCompletionTokens:500,overshootHeadroom:100},tokenizerProfileId:'fixture-tokenizer',decodingPolicyId:'fixture-decoder',responseSchemaDigest:await hashText(canonical(schema)),qualityReceiptRefs:['fixture-quality-not-established'],qualifiedLimits:{maxBytes:262144,maxFrames:128,maxDepth:12,maxKeys:2048,maxStringBytes:65536,inputTokens:16000,billableOutputCap:6000},validity:{verifiedAt:100,expiresAt:1000,revoked:false}};
 const route={provider:'qwen',model:profile.model.requested,resolutionVersion:profile.model.resolutionVersion,region:profile.endpoint.region,deployment:profile.endpoint.deployment,market:'fixture-market',api:'chat-completions',profile:profile.apiProfileId,tier:'standard',currency:'USD',tokenizer:profile.tokenizerProfileId,pricingVersion:'fixture-price'};
 const manifest={version:1,profile,known:{},route,wire:{instructions:'Synthetic bounded instructions. Return only the schema.',responseFormat:{type:'json_schema',json_schema:{name:'fixture-schema',strict:true,schema}},thinkingControls:{enable_thinking:false}},tokenizer:{profileId:profile.tokenizerProfileId,qualificationRef:'fixture-tokenizer-not-qualified',protocolOverheadTokens:20,maxWireBytes:262144}};refresh(manifest);
 const request={operationId:'fixture-child',jobId:'fixture-job',principalId:'fixture-principal',libraryId:'fixture-library',scopeFingerprint:'fixture-scope',contractVersion:profile.contractVersion,routeVersion:profile.routeVersion,consentEpoch:'fixture-consent',jobType:type,childIndex:0,childCount:1,inputTokens:100,outputCap:600,maxCompletionTokens:500};
 const child={logicalJobId:request.jobId,childOperationId:request.operationId,type,contractVersion:request.contractVersion,routeVersion:request.routeVersion,automaticRetries:0};
 const input={childIdentity:child,reservationRequest:request,payload:{version:1,evidence:[{ref:'synthetic-input',text:'SYNTHETIC_PRIVATE_PAYLOAD'}]},stream:false};
 let now=150,data=new Map(),writes=0,serial=Promise.resolve();const calls={profile:0,auth:0,tokenizer:0,reservation:0,current:0},records={auth:null,tokenizer:null},generations={auth:0,tokenizer:0};
 const hooks=new Proxy({},{set(t,k,v){if(Object.hasOwn(records,k)){generations[k]++;records[k]=null;}t[k]=v;return true;},deleteProperty(t,k){if(Object.hasOwn(t,k)&&Object.hasOwn(records,k)){generations[k]++;records[k]=null;}return Reflect.deleteProperty(t,k);}});
 const ledger=new AtomicReservationLedger({clock:()=>now,transact(fn){const run=serial.then(async()=>{const pending=clone(data),out=await fn({get:async k=>clone(pending.get(k)),put:async(k,v)=>{writes++;pending.set(k,clone(v));}});data=pending;return out;});serial=run.catch(()=>{});return run;},verify:async r=>({authorized:true,verifiedServiceFacts:true,request:r,route:clone(route),book:{route:clone(route),rates:{standardInput:1000000,cachedReadInput:500000,cacheCreateInput:2000000,completion:1000000},effectiveAt:100,verifiedAt:100,expiresAt:1000,source:'fixture-only tariff',verified:true,inputBand:{minInclusive:0,maxInclusive:16000}},tier:'pro',routeQualified:true,thinkingBoundQualified:true,inputBoundQualified:true,global:{dayLimitMicros:1000000,monthLimitMicros:1000000}})});
 if(withReservation)await ledger.reserve(request);
 const current=q=>({now,profile:manifest,authorization:records.auth,tokenizer:records.tokenizer,reservation:([...data.values()][0]?.rows||[]).find(x=>x.request.operationId===q.reservationRequest.operationId)});
 const callbacks={clock:()=>now,
  resolveProfile:async q=>{calls.profile++;return hooks.profile?hooks.profile(q):clone(manifest);},
  authorizePayload:async q=>{calls.auth++;const generation=generations.auth;const value=hooks.auth?await hooks.auth(q):{authorizationId:'fixture-authorization',childIdentity:clone(q.childIdentity),reservationRequest:clone(q.reservationRequest),payloadDigest:q.payloadDigest,expiresAt:900};if(generations.auth===generation)records.auth=value;return value;},
  tokenize:async q=>{calls.tokenizer++;const generation=generations.tokenizer;const value=hooks.tokenizer?await hooks.tokenizer(q):{profileId:q.profileId,tokenizerProfileId:q.tokenizerProfileId,qualificationRef:q.qualificationRef,requestDigest:q.requestDigest,contentTokens:80,protocolOverheadTokens:20,inputTokens:100,expiresAt:800};if(generations.tokenizer===generation)records.tokenizer=value;return value;},
  readReservation:async r=>{calls.reservation++;return hooks.reservation?hooks.reservation(r):clone(([...data.values()][0]?.rows||[]).find(x=>x.request.operationId===r.operationId));},
  // This synchronous view reads the SAME committed state as the actual ledger
  // transaction adapter, plus current content/tokenizer records. It does not
  // synthesize a verified flag or promote the fixture into service authority.
  readCurrentBinding:q=>{calls.current++;return hooks.current?hooks.current(q,current):current(q);}
 };
 const owner=createQwenQualifiedRequestOwner(callbacks);
 return {owner,input,manifest,hooks,calls,callbacks,ledger,setNow:n=>now=n,rows:()=>clone(([...data.values()][0]?.rows||[])),writes:()=>writes,mutateRow:f=>f(([...data.values()][0]?.rows||[])[0])};
}

test('original Qwen owner can declare before reserve through its real profile/content/tokenizer fence',async()=>{
 const f=await fixture('AI_ASSIST',false);const result=await f.owner.prepareDeclaration(f.input);
 assert.equal(result.status,'DECLARED_LOCAL');assert.equal(result.dispatchAllowed,false);assert.equal(f.rows().length,0);assert.equal(f.writes(),0);
 assert.equal(result.request.scopeFingerprint,f.input.reservationRequest.scopeFingerprint);assert.equal(result.declaration.payloadDigest,await hashText(canonical(f.input.payload)));
 assert.equal(JSON.stringify(result).includes('SYNTHETIC_PRIVATE_PAYLOAD'),false);
});

import {createClientDeclarationTransport} from '../core/ai-usage/client-declaration-transport.js';
import {clientDeclarationHash} from '../../services/ai-gateway/client-declaration.mjs';
const proofs={principalToken:'synthetic-principal',entitlementToken:'synthetic-entitlement'};
function transportFixture(hook){
 const calls=[];const transport=createClientDeclarationTransport({endpoint:'https://synthetic.invalid/api/declarations',fetch:request=>{
  calls.push(request.clone());return Promise.resolve(request.json()).then(async input=>{const receipt={decision:input.action==='publish'?'published':'revoked',requestHash:input.declaration.requestHash,generation:clientDeclarationHash(input.declaration),issuedAt:150,expiresAt:input.declaration.expiresAt,financialAuthority:false,dispatchAllowed:false,retryAllowed:false};return await hook?.(input,receipt)??Response.json(receipt);});
 }});return {transport,calls};
}
test('publication accepts only the original private stage handle and configured metadata transport',async()=>{
 const f=await fixture('AI_ASSIST',false),h=await f.owner.prepareDeclaration(f.input),t=transportFixture();
 for(const forged of [structuredClone(h),{},true,f.input])assert.equal((await f.owner.publishDeclaration(forged,proofs,t.transport)).status,'UNAVAILABLE');
 assert.equal(t.calls.length,0);const out=await f.owner.publishDeclaration(h,proofs,t.transport);assert.equal(out.status,'PUBLISHED_CLIENT_DECLARATION');assert.equal(out.financialAuthority,false);assert.equal(t.calls.length,1);
 const sent=await t.calls[0].clone().text().catch(()=>'' );assert.equal(sent.includes('SYNTHETIC_PRIVATE_PAYLOAD'),false);
 assert.equal((await f.owner.revalidate(h)).status,'UNAVAILABLE');assert.equal((await f.owner.bind(h)).status,'UNAVAILABLE');assert.equal((await f.owner.publishDeclaration(await f.owner.bind(f.input),proofs,t.transport)).status,'UNAVAILABLE');
 assert.equal(t.calls[0].credentials,'omit');assert.equal(t.calls[0].redirect,'error');
});
test('content, consent, tokenizer, profile and expiry changes after declare prevent HTTP publication',async()=>{
 for(const change of [f=>{f.hooks.auth=()=>null;},f=>{f.hooks.current=(q,current)=>({...current(q),authorization:{...current(q).authorization,reservationRequest:{...q.reservationRequest,consentEpoch:'changed'}}});},f=>{f.hooks.tokenizer=()=>null;},f=>{f.manifest.profile.validity.revoked=true;},f=>f.setNow(800),f=>f.owner.dispose()]){
  const f=await fixture('AI_ASSIST',false),h=await f.owner.prepareDeclaration(f.input),t=transportFixture();change(f);
  assert.equal((await f.owner.publishDeclaration(h,proofs,t.transport)).status,'UNAVAILABLE');assert.equal(t.calls.length,0);
 }
});
test('explicit local revoke is immediate and cannot be revived through reserve or a new declaration',async()=>{
 const f=await fixture('AI_ASSIST',false),h=await f.owner.prepareDeclaration(f.input),t=transportFixture();
 assert.equal((await f.owner.revokeDeclaration(h)).status,'REVOKED_LOCAL');assert.equal((await f.owner.publishDeclaration(h,proofs,t.transport)).status,'UNAVAILABLE');assert.equal(t.calls.length,0);
 await f.ledger.reserve(f.input.reservationRequest);assert.equal((await f.owner.bind(f.input)).reason,'DECLARATION_REVOKED');assert.equal((await f.owner.prepareDeclaration(f.input)).reason,'DECLARATION_REVOKED');
});
test('declaration alone never bypasses the original reservation and final financial fence',async()=>{
 const f=await fixture('AI_ASSIST',false),h=await f.owner.prepareDeclaration(f.input);assert.equal(h.status,'DECLARED_LOCAL');
 assert.equal((await f.owner.bind(f.input)).status,'UNAVAILABLE');await f.ledger.reserve(f.input.reservationRequest);assert.equal((await f.owner.bind(f.input)).status,'BOUND_LOCAL');
 f.mutateRow(row=>{row.state='OUTCOME_UNKNOWN';});assert.equal((await f.owner.bind(f.input)).status,'UNAVAILABLE');
});
test('same declaration HTTP publish is single-flight and unknown acknowledgement never remints or replays',async()=>{
 const f=await fixture('AI_ASSIST',false),h=await f.owner.prepareDeclaration(f.input),t=transportFixture(()=>{throw Error('lost synthetic acknowledgement');});
 const both=await Promise.all([f.owner.publishDeclaration(h,proofs,t.transport),f.owner.publishDeclaration(h,proofs,t.transport)]);assert.ok(both.every(r=>r.status==='PUBLICATION_UNKNOWN'));assert.equal(t.calls.length,1);
 const again=await f.owner.prepareDeclaration(f.input);assert.equal(again.declarationDigest,h.declarationDigest);assert.equal((await f.owner.publishDeclaration(again,proofs,t.transport)).status,'PUBLICATION_UNKNOWN');assert.equal(t.calls.length,1);
});
test('a content change while publish is pending invalidates locally and sends the SAME terminal revoke',async()=>{
 const f=await fixture('AI_ASSIST',false),h=await f.owner.prepareDeclaration(f.input);let release,entered;
 const began=new Promise(r=>entered=r),hold=new Promise(r=>release=r),records=[];
 const t=transportFixture(async(input,receipt)=>{records.push(input);if(input.action==='publish'){entered();await hold;}return Response.json(receipt);});
 const work=f.owner.publishDeclaration(h,proofs,t.transport);await began;f.hooks.auth=()=>null;release();assert.equal((await work).status,'UNAVAILABLE');
 const revoke=await f.owner.revokeDeclaration(h);assert.equal(revoke.status,'REVOKED_CLIENT_DECLARATION');assert.equal(records.length,2);assert.equal(records[1].action,'revoke');assert.deepEqual(records[0].request,records[1].request);assert.deepEqual(records[0].declaration,records[1].declaration);
});
test('last coherent fence runs after declaration hash and immediately before actual HTTP fetch',async()=>{
 const f=await fixture('AI_ASSIST',false),h=await f.owner.prepareDeclaration(f.input);let checked=false,calls=0;
 f.hooks.current=(q,current)=>{checked=true;return current(q);};
 const transport=createClientDeclarationTransport({endpoint:'https://synthetic.invalid/api/declarations',fetch:request=>{calls++;assert.equal(checked,true);return request.json().then(input=>Response.json({decision:'published',requestHash:input.declaration.requestHash,generation:clientDeclarationHash(input.declaration),issuedAt:150,expiresAt:700,financialAuthority:false,dispatchAllowed:false,retryAllowed:false}));}});
 const pending=f.owner.publishDeclaration(h,proofs,transport);assert.equal(calls,1,'fetch must be invoked before publishDeclaration first await');assert.equal((await pending).status,'PUBLISHED_CLIENT_DECLARATION');
});
test('two children keep their common job scope fingerprint and distinct declaration payload hashes',async()=>{
 const f=await fixture('AI_ORGANIZE',false);f.input.reservationRequest.childCount=2;const a=await f.owner.prepareDeclaration(f.input);f.input.reservationRequest.operationId='second-child';f.input.reservationRequest.childIndex=1;f.input.childIdentity.childOperationId='second-child';f.input.payload.evidence[0].text='SECOND_SYNTHETIC';const b=await f.owner.prepareDeclaration(f.input);
 assert.equal(a.status,'DECLARED_LOCAL');assert.equal(b.status,'DECLARED_LOCAL');assert.equal(a.request.scopeFingerprint,b.request.scopeFingerprint);assert.notEqual(a.declaration.payloadDigest,b.declaration.payloadDigest);
});
test('terminal declaration revoke during the original final financial identity hash defeats full bind',async()=>{
 const f=await fixture(),h=await f.owner.prepareDeclaration(f.input),digest=crypto.subtle.digest;let changed=0;
 crypto.subtle.digest=async function(algorithm,bytes){const result=await digest.call(this,algorithm,bytes);if(new TextDecoder().decode(bytes).includes('"authorizationExpiresAt"')){changed++;await f.owner.revokeDeclaration(h);}return result;};
 try{const out=await f.owner.bind(f.input);assert.equal(changed,1);assert.equal(out.status,'UNAVAILABLE');assert.equal(out.reason,'DECLARATION_REVOKED');}finally{crypto.subtle.digest=digest;}
});
test('declaration final digest awaits cannot hide original content, profile or tokenizer revocation',async()=>{
 for(const change of [f=>{f.manifest.profile.validity.revoked=true;},f=>{f.hooks.auth=()=>null;},f=>{f.hooks.tokenizer=()=>null;}]){
  const f=await fixture('AI_ASSIST',false),digest=crypto.subtle.digest;let changed=0;
  crypto.subtle.digest=async function(algorithm,bytes){const result=await digest.call(this,algorithm,bytes);if(new TextDecoder().decode(bytes).includes('"scopeDigest"')){changed++;change(f);}return result;};
  try{assert.equal((await f.owner.prepareDeclaration(f.input)).status,'UNAVAILABLE');assert.equal(changed,1);assert.equal(f.rows().length,0);assert.equal(f.writes(),0);}finally{crypto.subtle.digest=digest;}
 }
});
