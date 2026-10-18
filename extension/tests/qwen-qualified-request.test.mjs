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
async function fixture(type='AI_ASSIST'){
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
 await ledger.reserve(request);
 const current=q=>({now,profile:manifest,authorization:records.auth,tokenizer:records.tokenizer,reservation:[...data.values()][0].rows.find(x=>x.request.operationId===q.reservationRequest.operationId)});
 const callbacks={clock:()=>now,
  resolveProfile:async q=>{calls.profile++;return hooks.profile?hooks.profile(q):clone(manifest);},
  authorizePayload:async q=>{calls.auth++;const generation=generations.auth;const value=hooks.auth?await hooks.auth(q):{authorizationId:'fixture-authorization',childIdentity:clone(q.childIdentity),reservationRequest:clone(q.reservationRequest),payloadDigest:q.payloadDigest,expiresAt:900};if(generations.auth===generation)records.auth=value;return value;},
  tokenize:async q=>{calls.tokenizer++;const generation=generations.tokenizer;const value=hooks.tokenizer?await hooks.tokenizer(q):{profileId:q.profileId,tokenizerProfileId:q.tokenizerProfileId,qualificationRef:q.qualificationRef,requestDigest:q.requestDigest,contentTokens:80,protocolOverheadTokens:20,inputTokens:100,expiresAt:800};if(generations.tokenizer===generation)records.tokenizer=value;return value;},
  readReservation:async r=>{calls.reservation++;return hooks.reservation?hooks.reservation(r):clone([...data.values()][0].rows.find(x=>x.request.operationId===r.operationId));},
  // This synchronous view reads the SAME committed state as the actual ledger
  // transaction adapter, plus current content/tokenizer records. It does not
  // synthesize a verified flag or promote the fixture into service authority.
  readCurrentBinding:q=>{calls.current++;return hooks.current?hooks.current(q,current):current(q);}
 };
 const owner=createQwenQualifiedRequestOwner(callbacks);
 return {owner,input,manifest,hooks,calls,callbacks,ledger,setNow:n=>now=n,rows:()=>clone([...data.values()][0].rows),writes:()=>writes,mutateRow:f=>f([...data.values()][0].rows[0])};
}
function noAuthority(out){assert.equal(out.qualification,'NOT_ESTABLISHED');assert.equal(out.inputBoundQualified,false);assert.equal(out.financialAuthority,false);assert.equal(out.dispatchAllowed,false);assert.equal(out.sourceKind,'LOCAL_INJECTED_OWNERS');}
function denied(out,reason){assert.equal(out.status,'UNAVAILABLE');if(reason)assert.equal(out.reason,reason);noAuthority(out);assert.equal(out.wireComplete,false);assert.equal(Object.hasOwn(out,'envelope'),false);assert.equal(JSON.stringify(out).includes('SYNTHETIC_PRIVATE'),false);}
const bind=f=>f.owner.bind(f.input);

test('full immutable envelope binds original RESERVED row without any extra ledger writes',async()=>{
 const f=await fixture(),rows=f.rows(),writes=f.writes(),r=await bind(f);assert.equal(r.status,'BOUND_LOCAL');noAuthority(r);assert.equal(r.wireComplete,true);assert.equal(r.localBindingComplete,true);
 assert.deepEqual(f.rows(),rows);assert.equal(f.writes(),writes);assert.equal(rows[0].state,'RESERVED');assert.equal(r.identity.reservation.reservationMicros,800);assert.deepEqual(r.identity.reservation.request,f.input.reservationRequest);
 assert.equal(r.envelope.method,'POST');assert.deepEqual(r.envelope.endpoint,{scheme:'https',host:'fixture.workspace.invalid',path:'/compatible-mode/v1/chat/completions'});assert.deepEqual(r.envelope.headers,{'Content-Type':'application/json'});
 const body=JSON.parse(r.envelope.body);assert.deepEqual(Object.keys(body).sort(),['enable_thinking','max_completion_tokens','messages','model','n','response_format','stream'].sort());assert.equal(body.n,1);assert.equal(body.enable_thinking,false);assert.equal(body.max_completion_tokens,500);assert.equal(body.messages.length,2);assert.deepEqual(JSON.parse(body.messages[1].content),f.input.payload);assert.deepEqual(body.response_format,f.manifest.wire.responseFormat);
 assert.equal(r.identity.requestDigest,await hashText(canonical(r.envelope)));assert.equal(r.identity.payloadDigest,await hashText(canonical(f.input.payload)));assert.deepEqual(r.identity.childIdentity,f.input.childIdentity);assert.equal(r.usageBinding.childId,f.input.childIdentity.childOperationId);assert.equal(r.usageBinding.limits.billableOutputCap,600);
 assert.throws(()=>{r.envelope.body='changed';},TypeError);assert.throws(()=>{r.identity.reservation.request.principalId='changed';},TypeError);assert.throws(()=>{r.usageBinding.limits.billableOutputCap=999;},TypeError);
 assert.equal((await f.owner.revalidate(r)).status,'CURRENT_LOCAL');assert.deepEqual(f.rows(),rows);assert.equal(f.writes(),writes);
 denied(await f.owner.revalidate(clone(r)),'BINDING_UNAVAILABLE');
});
test('only explicit stream mode adds usage envelope and the original parser consumes its binding',async()=>{
 const f=await fixture();f.input.stream=true;const r=await bind(f);assert.equal(r.status,'BOUND_LOCAL');const body=JSON.parse(r.envelope.body);assert.deepEqual(body.stream_options,{include_usage:true});
 const parser=createQwenJsonUsageParser({binding:r.usageBinding,httpStatus:200});parser.push(new TextEncoder().encode(JSON.stringify({id:'fixture-response',model:'fixture-model',object:'chat.completion',choices:[{index:0,message:{role:'assistant',content:'{"action":"KEEP"}'},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:20,total_tokens:120,prompt_tokens_details:{cached_tokens:0,cache_creation_input_tokens:0},completion_tokens_details:{reasoning_tokens:0}}})));assert.equal(parser.finish({transportComplete:true,cancelled:false}).usageState,'KNOWN');
});
test('thinking is explicit, Organize-only, bounded and never borrows the total billable cap',async()=>{
 const f=await fixture('AI_ORGANIZE');Object.assign(f.manifest.profile.thinking,{enabled:true,control:'thinking_budget',thinkingBudget:100});f.manifest.profile.usageProfile.reasoningAbsence='reject';f.manifest.wire.thinkingControls={enable_thinking:true,thinking_budget:100};refresh(f.manifest);
 const r=await bind(f);assert.equal(r.status,'BOUND_LOCAL');assert.equal(JSON.parse(r.envelope.body).thinking_budget,100);assert.equal(r.usageBinding.limits.billableOutputCap,600);
 for(const type of ['AI_ASSIST','AI_MAINTENANCE']){const f=await fixture(type);Object.assign(f.manifest.profile.thinking,{enabled:true,control:'thinking_budget',thinkingBudget:100});f.manifest.wire.thinkingControls={enable_thinking:true,thinking_budget:100};refresh(f.manifest);denied(await bind(f),'THINKING_UNAVAILABLE');}
});
test('request cannot choose route/model/trust, inject wire fields or enable automatic retries',async()=>{
 for(const patch of [{model:'other'},{profileId:'other'},{verified:true},{endpoint:'other'},{wire:{}},{now:150},{inputBoundQualified:true}]){const f=await fixture();Object.assign(f.input,patch);denied(await bind(f),'REQUEST_UNAVAILABLE');assert.equal(f.calls.tokenizer,0);}
 const f=await fixture();f.input.childIdentity.automaticRetries=1;denied(await bind(f),'CHILD_BINDING_MISMATCH');
});
test('every neutral child and financial request identity remains exact',async()=>{
 for(const k of ['operationId','jobId','jobType','contractVersion','routeVersion']){const f=await fixture();f.input.reservationRequest[k]='other';denied(await bind(f),'RESERVATION_BINDING_MISMATCH');}
 for(const k of ['principalId','libraryId','scopeFingerprint','consentEpoch','childIndex','childCount','inputTokens','outputCap','maxCompletionTokens']){const f=await fixture();f.mutateRow(row=>{row.request[k]=typeof row.request[k]==='number'?row.request[k]+1:'other';});denied(await bind(f),'RESERVATION_UNAVAILABLE');}
});
test('payload authority must attest exact bytes and both original identities, never a caller boolean',async()=>{
 for(const change of [a=>true,a=>({...a,payloadDigest:'a'.repeat(64)}),a=>({...a,childIdentity:{...a.childIdentity,childOperationId:'other'}}),a=>({...a,reservationRequest:{...a.reservationRequest,consentEpoch:'other'}}),a=>({...a,expiresAt:150}),a=>({...a,verified:true})]){const f=await fixture();f.hooks.auth=q=>change({authorizationId:'fixture-authorization',childIdentity:clone(q.childIdentity),reservationRequest:clone(q.reservationRequest),payloadDigest:q.payloadDigest,expiresAt:900});denied(await bind(f),'PAYLOAD_AUTHORITY_UNAVAILABLE');assert.equal(f.calls.tokenizer,0);}
});
test('all tokenizer evidence dimensions bind the complete envelope and measured overhead',async()=>{
 for(const patch of [{profileId:'other'},{tokenizerProfileId:'other'},{qualificationRef:'other'},{requestDigest:'a'.repeat(64)},{contentTokens:81},{protocolOverheadTokens:19},{inputTokens:99},{expiresAt:150},{expiresAt:1001},{inputBoundQualified:true}]){const f=await fixture();f.hooks.tokenizer=q=>({...{profileId:q.profileId,tokenizerProfileId:q.tokenizerProfileId,qualificationRef:q.qualificationRef,requestDigest:q.requestDigest,contentTokens:80,protocolOverheadTokens:20,inputTokens:100,expiresAt:800},...patch});denied(await bind(f),'TOKENIZER_BINDING_MISMATCH');assert.equal(f.calls.reservation,0);}
 const f=await fixture();f.hooks.tokenizer=()=>true;denied(await bind(f),'TOKENIZER_BINDING_MISMATCH');
});
test('tokenizer receives the actual instructions/schema/messages, never a chars-only estimate',async()=>{
 const f=await fixture(),original=f.callbacks.tokenize;let seen;
 f.hooks.tokenizer=q=>{seen=q;delete f.hooks.tokenizer;return original(q);};const r=await bind(f);assert.equal(r.status,'BOUND_LOCAL');assert.equal(seen.envelope.body,r.envelope.body);assert.equal(seen.requestDigest,r.identity.requestDigest);assert.equal(JSON.parse(seen.envelope.body).response_format.json_schema.schema.additionalProperties,false);assert.equal(Object.isFrozen(seen.envelope),true);
});
test('body mutation while awaiting tokenizer cannot alter the authorized snapshot',async()=>{
 const f=await fixture(),original=f.callbacks.tokenize;let entered,release;const began=new Promise(r=>entered=r),held=new Promise(r=>release=r);
 f.hooks.tokenizer=async q=>{entered();await held;delete f.hooks.tokenizer;return original(q);};const pending=bind(f);await began;f.input.payload.evidence[0].text='MUTATED';f.input.reservationRequest.principalId='changed';release();const r=await pending;assert.equal(r.status,'BOUND_LOCAL');assert.match(r.envelope.body,/SYNTHETIC_PRIVATE_PAYLOAD/);assert.doesNotMatch(r.envelope.body,/MUTATED/);assert.equal(r.identity.reservation.request.principalId,'fixture-principal');
});
test('same original operation cannot be rebound to a new authorized payload or stream envelope',async()=>{
 const f=await fixture(),first=await bind(f);assert.equal(first.status,'BOUND_LOCAL');assert.equal((await bind(f)).identityDigest,first.identityDigest);
 f.input.payload.evidence[0].text='SYNTHETIC_CHANGED';denied(await bind(f),'OPERATION_REBOUND');f.input.payload.evidence[0].text='SYNTHETIC_PRIVATE_PAYLOAD';f.input.stream=true;denied(await bind(f),'OPERATION_REBOUND');assert.equal(f.rows().length,1);
});
test('profile id is immutable across route, instructions and expiry changes',async()=>{
 for(const change of [m=>m.wire.instructions='Other instructions',m=>m.profile.validity.expiresAt=1001,m=>m.route.market='other']){const f=await fixture();assert.equal((await bind(f)).status,'BOUND_LOCAL');change(f.manifest);denied(await bind(f),'PROFILE_REBOUND');}
});
test('declared expiry, source revocation and local tombstones revoke already bound handles',async()=>{
 for(const action of [f=>f.setNow(1000),f=>f.manifest.profile.validity.revoked=true,f=>f.owner.revoke('fixture-profile')]){const f=await fixture(),r=await bind(f);assert.equal(r.status,'BOUND_LOCAL');action(f);denied(await f.owner.revalidate(r));denied(await bind(f));}
 const f=await fixture();assert.equal(f.owner.revoke('fixture-profile'),true);denied(await bind(f),'PROFILE_REVOKED');
});
test('rollback, missing clock and disposal never reuse an earlier successful binding',async()=>{
 const f=await fixture(),r=await bind(f);f.setNow(149);denied(await bind(f),'CLOCK_UNAVAILABLE');f.setNow(151);assert.equal((await f.owner.revalidate(r)).status,'CURRENT_LOCAL');f.owner.dispose();denied(await bind(f),'OWNER_DISPOSED');denied(await f.owner.revalidate(r),'OWNER_DISPOSED');
 const callbacks={...f.callbacks};delete callbacks.clock;denied(await createQwenQualifiedRequestOwner(callbacks).bind(f.input),'OWNER_UNAVAILABLE');
});
test('profile revoke, content revoke, unknown reservation and expiry during async tokenization all refuse',async()=>{
 for(const action of [f=>f.owner.revoke('fixture-profile'),f=>{f.hooks.auth=()=>null;},f=>f.mutateRow(r=>r.state='OUTCOME_UNKNOWN'),f=>f.setNow(800),f=>f.owner.dispose()]){const f=await fixture(),original=f.callbacks.tokenize;f.hooks.tokenizer=async q=>{action(f);delete f.hooks.tokenizer;return original(q);};denied(await bind(f));}
});
test('final owner rereads detect payload authorization and financial changes',async()=>{
 const f=await fixture(),original=f.callbacks.authorizePayload;f.hooks.auth=async q=>{delete f.hooks.auth;const proof=await original(q);f.hooks.auth=()=>({...proof,authorizationId:'changed'});return proof;};denied(await bind(f),'PAYLOAD_AUTHORITY_CHANGED');
 const g=await fixture();let reads=0;g.hooks.reservation=()=>{const row=g.rows()[0];if(++reads===2)row.state='DISPATCHED';return row;};denied(await bind(g),'RESERVATION_UNAVAILABLE');
});
test('revalidation checks current content authorization as well as original financial state',async()=>{
 const f=await fixture(),r=await bind(f);f.hooks.auth=()=>null;denied(await f.owner.revalidate(r),'PAYLOAD_AUTHORITY_UNAVAILABLE');
 const g=await fixture(),s=await bind(g);await g.ledger.record(g.input.reservationRequest,'DISPATCHED');denied(await g.owner.revalidate(s),'RESERVATION_UNAVAILABLE');assert.equal(g.rows()[0].state,'DISPATCHED');
});
test('original reserved quote and every route dimension are required; no new financial authority',async()=>{
 for(const change of [r=>r.reservationMicros++,r=>r.quote.nativeMicros++,r=>r.quote.pricingVersion='other',r=>r.pricing.book.expiresAt=150,r=>r.pricing.book.verified=false,r=>r.state='CANCELLED_BEFORE_DISPATCH',r=>r.reservedAt=151]){const f=await fixture();f.mutateRow(change);denied(await bind(f),'RESERVATION_UNAVAILABLE');}
 for(const key of ['provider','model','resolutionVersion','region','deployment','market','api','profile','tier','currency','tokenizer','pricingVersion']){const f=await fixture();f.mutateRow(r=>r.pricing.route[key]='other');denied(await bind(f),'RESERVATION_UNAVAILABLE');}
});
test('schema, response format, tokenizer bounds and wire controls cannot be loose or augmented',async()=>{
 for(const change of [m=>m.wire.responseFormat.json_schema.strict=false,m=>m.wire.responseFormat.json_schema.schema.additionalProperties=true,m=>delete m.wire.responseFormat.json_schema.schema.properties.action.maxLength,m=>m.wire.responseFormat.json_schema.schema.properties.action.pattern='.*',m=>m.wire.responseFormat.json_schema.schema.required=[],m=>m.wire.thinkingControls.tools=[],m=>m.wire.thinkingControls.enable_thinking=true,m=>m.tokenizer.protocolOverheadTokens=0,m=>m.tokenizer.maxWireBytes=262145,m=>m.profile.responseSchemaDigest='a'.repeat(64),m=>m.profile.validity.expiresAt=86400200,m=>m.profile.thinking.requestedMaxCompletionTokens=501]){const f=await fixture();change(f.manifest);refresh(f.manifest);denied(await bind(f));}
 const f=await fixture();f.manifest.tokenizer.maxWireBytes=10;denied(await bind(f),'WIRE_BOUND');
});
test('body/accessor/inherited/symbol/cycle/sparse/oversize values refuse without invoking getters',async()=>{
 let reads=0;for(const change of [x=>Object.defineProperty(x.payload,'private',{enumerable:true,get(){reads++;throw Error('private');}}),x=>Object.setPrototypeOf(x.payload,{inherited:true}),x=>x.payload.evidence=new Array(2),x=>x.payload.evidence[Symbol('private')]=true,x=>x.payload.self=x.payload,x=>x.payload.text='x'.repeat(131073),x=>{for(let i=0;i<5000;i++)x.payload['k'+i]=i;}]){const f=await fixture();change(f.input);denied(await bind(f));assert.equal(f.calls.auth,0);}
 const f=await fixture();Object.defineProperty(f.manifest.profile.endpoint,'host',{enumerable:true,get(){reads++;return 'private';}});f.hooks.profile=()=>f.manifest;denied(await bind(f),'DATA_INVALID');
 const g=await fixture();g.hooks.auth=()=>Object.defineProperty({},'authorizationId',{enumerable:true,get(){reads++;return 'private';}});denied(await bind(g),'DATA_INVALID');
 const h=await fixture(),opts={...h.callbacks};Object.defineProperty(opts,'clock',{enumerable:true,get(){reads++;return ()=>150;}});denied(await createQwenQualifiedRequestOwner(opts).bind(h.input),'OWNER_UNAVAILABLE');assert.equal(reads,0);
});
test('profile and revocation capacity is bounded without recycling tombstones',async()=>{
 const f=await fixture();for(let i=0;i<16;i++)assert.equal(f.owner.revoke('revoked-'+i),true);assert.equal(f.owner.revoke('revoked-overflow'),false);denied(await bind(f),'PROFILE_CAPACITY');assert.equal(f.owner.revoke('revoked-0'),true);
});
test('profile mutation during outstanding resolver work and callback failures do not leak bodies',async()=>{
 for(const name of ['profile','auth','tokenizer','reservation']){const f=await fixture();f.hooks[name]=()=>{throw Error('SYNTHETIC_PRIVATE_PAYLOAD');};denied(await bind(f),'OWNER_UNAVAILABLE');}
 const f=await fixture(),original=f.callbacks.tokenize;f.hooks.tokenizer=async q=>{f.manifest.wire.instructions='changed after tokenization';delete f.hooks.tokenizer;return original(q);};denied(await bind(f),'PROFILE_REBOUND');
});

test('pending work has a hard local concurrency bound and disposal prevents all late publication',async()=>{
 const f=await fixture();let release;const held=new Promise(r=>release=r);let started=0;
 f.hooks.profile=async()=>{started++;await held;return clone(f.manifest);};
 const pending=Array.from({length:8},()=>bind(f));assert.equal(started,8);denied(await bind(f),'OWNER_BUSY');f.owner.dispose();release();for(const result of await Promise.all(pending))denied(result,'OWNER_DISPOSED');assert.equal(f.calls.tokenizer,0);assert.equal(f.writes(),1);
});
test('operation binding capacity stops rather than evicting identity history',async()=>{
 const f=await fixture(),originalRow=f.rows()[0];
 // Capacity mechanics only: this injected reader copies one original ledger row
 // into bounded synthetic identities. This is NOT new financial reservation.
 f.hooks.reservation=r=>({...clone(originalRow),request:clone(r)});
 f.hooks.current=(q,current)=>({...current(q),reservation:{...clone(originalRow),request:clone(q.reservationRequest)}});
 for(let i=0;i<128;i++){f.input.childIdentity.childOperationId='fixture-child-'+i;f.input.reservationRequest.operationId='fixture-child-'+i;assert.equal((await bind(f)).status,'BOUND_LOCAL');}
 f.input.childIdentity.childOperationId='overflow';f.input.reservationRequest.operationId='overflow';denied(await bind(f),'OPERATION_CAPACITY');
 f.input.childIdentity.childOperationId='fixture-child-0';f.input.reservationRequest.operationId='fixture-child-0';assert.equal((await bind(f)).status,'BOUND_LOCAL');f.input.payload.changed=true;denied(await bind(f),'OPERATION_REBOUND');assert.equal(f.rows().length,1);assert.equal(f.writes(),1);
});
test('original pricing metadata is bound even if a changed tariff computes the same quote',async()=>{
 const f=await fixture();let reads=0;f.hooks.reservation=()=>{const row=f.rows()[0];if(++reads===2)row.pricing.book.source='different source for same quote';return row;};denied(await bind(f),'RESERVATION_CHANGED');
});


test('observed resolver revocation latches a tombstone even if the source later flips false',async()=>{
 const f=await fixture(),r=await bind(f);f.manifest.profile.validity.revoked=true;denied(await f.owner.revalidate(r),'PROFILE_REVOKED');f.manifest.profile.validity.revoked=false;denied(await bind(f),'PROFILE_REVOKED');
 const g=await fixture();g.manifest.profile.validity.revoked=true;denied(await bind(g),'PROFILE_REVOKED');g.manifest.profile.validity.revoked=false;denied(await bind(g),'PROFILE_REVOKED');
});

// Retain the independent cb66 review's three failing orderings. The callback
// contract now additionally supplies a genuine synchronous owner-backed fence.
test('REV-1 source profile revocation in the last reservation read defeats publication',async()=>{
 const f=await fixture();let reads=0;f.hooks.reservation=()=>{if(++reads===2)f.manifest.profile.validity.revoked=true;return f.rows()[0];};denied(await bind(f),'PROFILE_REVOKED');assert.equal(f.writes(),1);f.manifest.profile.validity.revoked=false;denied(await bind(f),'PROFILE_REVOKED');
});
test('REV-2 content revocation in the last reservation read defeats publication',async()=>{
 const f=await fixture();let reads=0;f.hooks.reservation=()=>{if(++reads===2)f.hooks.auth=()=>null;return f.rows()[0];};denied(await bind(f),'PAYLOAD_AUTHORITY_CHANGED');assert.equal(f.writes(),1);
});
test('REV-3 final authorization await cannot hide an original ledger DISPATCHED transition',async()=>{
 const f=await fixture(),result=await bind(f),original=f.callbacks.authorizePayload;assert.equal(result.status,'BOUND_LOCAL');f.hooks.auth=async q=>{delete f.hooks.auth;const proof=await original(q);await f.ledger.record(f.input.reservationRequest,'DISPATCHED');return proof;};denied(await f.owner.revalidate(result),'RESERVATION_CHANGED');assert.equal(f.rows()[0].state,'DISPATCHED');assert.equal(f.writes(),2);
});
test('the final identity-hash await is followed by all four owner checks without another await',async()=>{
 for(const change of [f=>{f.manifest.profile.validity.revoked=true;},f=>{f.hooks.auth=()=>null;},f=>{f.hooks.tokenizer=()=>null;},f=>f.ledger.record(f.input.reservationRequest,'DISPATCHED')]){
  const f=await fixture(),digest=crypto.subtle.digest;let changed=0;
  crypto.subtle.digest=async function(algorithm,bytes){const value=await digest.call(this,algorithm,bytes);if(new TextDecoder().decode(bytes).includes('"authorizationExpiresAt"')){changed++;await change(f);}return value;};
  try{denied(await bind(f));assert.equal(changed,1);assert.equal(f.calls.current,1);}finally{crypto.subtle.digest=digest;}
 }
});
test('the synchronous currentness capability is mandatory and cannot be a boolean, Promise or echoed request',async()=>{
 const f=await fixture(),missing={...f.callbacks};delete missing.readCurrentBinding;denied(await createQwenQualifiedRequestOwner(missing).bind(f.input),'OWNER_UNAVAILABLE');
 for(const value of [true,false,null,Promise.resolve(true),{}, {verified:true}]){const g=await fixture();g.hooks.current=()=>value;denied(await bind(g));}
 const g=await fixture();g.hooks.current=q=>q;denied(await bind(g),'CURRENTNESS_UNAVAILABLE');
});
test('final currentness snapshots are own-data, exact, bounded and tied to authoritative time',async()=>{
 let reads=0;
 for(const change of [x=>Object.defineProperty(x,'authorization',{enumerable:true,get(){reads++;return true;}}),x=>{x.now=149;},x=>{x.now=800;},x=>{x.tokenizer={...x.tokenizer,requestDigest:'a'.repeat(64)};},x=>{x.reservation={...x.reservation,state:'DISPATCHED'};},x=>{x.extra=true;}]){const f=await fixture();f.hooks.current=(q,current)=>{const value=current(q);change(value);return value;};denied(await bind(f));}
 assert.equal(reads,0);
 const f=await fixture();f.hooks.current=(q,current)=>{const value=current(q);f.owner.dispose();return value;};denied(await bind(f),'OWNER_DISPOSED');
});
test('final price expiry and tokenizer revocation also invalidate revalidation',async()=>{
 const f=await fixture(),result=await bind(f);f.hooks.tokenizer=()=>null;denied(await f.owner.revalidate(result),'TOKENIZER_AUTHORITY_CHANGED');
 const g=await fixture();g.mutateRow(r=>r.pricing.book.expiresAt=160);g.hooks.current=(q,current)=>({...current(q),now:160});denied(await bind(g),'RESERVATION_UNAVAILABLE');
});

test('publication performs no callbacks or asynchronous work after the coherent final snapshot',async()=>{
 const f=await fixture();let final=false;
 const callbacks=Object.fromEntries(Object.entries(f.callbacks).map(([key,fn])=>[key,key==='readCurrentBinding'?q=>{const value=fn(q);final=true;return value;}:(...args)=>{assert.equal(final,false,'callback after final fence: '+key);return fn(...args);} ]));
 const result=await createQwenQualifiedRequestOwner(callbacks).bind(f.input);assert.equal(result.status,'BOUND_LOCAL');assert.equal(result.checkedAt,150);assert.equal(final,true);assert.equal(f.writes(),1);
});
