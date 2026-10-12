import test from 'node:test';
import assert from 'node:assert/strict';
import {createQwenRequestProfileCompiler} from '../core/ai-usage/qwen-request-profile.js';
import {createQwenJsonUsageParser,createQwenSseUsageParser} from '../core/ai-usage/qwen-usage-parser.js';
import {AIUsageFoundation} from '../core/ai-usage/foundation.js';
import {ENVELOPES} from '../core/ai-usage/admission-policy.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {setup as setupStore} from './harness/thought-m1.mjs';

const correspondence=['id','jobType','contractVersion','routeVersion','endpoint','model','apiProfileId','usageProfile','tokenizerProfileId','decodingPolicyId','responseSchemaDigest','qualityReceiptRefs'];
function setup(type='AI_ASSIST'){
 const profile={version:1,kind:'synthetic-request-profile-v1',id:'synthetic-profile-1',jobType:type,contractVersion:'synthetic-contract-v1',routeVersion:'synthetic-route-v1',
  endpoint:{host:'synthetic.workspace.invalid',region:'synthetic-region',deployment:'synthetic-deployment',path:'/compatible-mode/v1/chat/completions'},model:{requested:'synthetic-qwen-model',resolutionVersion:'synthetic-resolution-1',responseAllowlist:['synthetic-qwen-model','synthetic-qwen-snapshot']},apiProfileId:'synthetic-text-chat-v1',
  usageProfile:{version:1,shape:'compatible-direct-v1',cacheMode:'implicit',reasoningAbsence:'qualified-zero-nonthinking',creationAbsence:'qualified-zero-no-markers',cachedAbsence:'reject'},thinking:{enabled:false,control:'none',thinkingBudget:null,requestedMaxCompletionTokens:500,overshootHeadroom:100},
  tokenizerProfileId:'synthetic-tokenizer-1',decodingPolicyId:'synthetic-decoder-1',responseSchemaDigest:'a'.repeat(64),qualityReceiptRefs:['synthetic-quality-unproven-1'],
  qualifiedLimits:{maxBytes:262144,maxFrames:128,maxDepth:12,maxKeys:2048,maxStringBytes:65536,inputTokens:16000,billableOutputCap:6000},validity:{verifiedAt:100,expiresAt:200,revoked:false}};
 const options={profile,known:{}};syncKnown(options);
 const request={childIdentity:{logicalJobId:'synthetic-job-1',childOperationId:'synthetic-child-1',type,contractVersion:profile.contractVersion,routeVersion:profile.routeVersion,automaticRetries:0},inputTokens:100,outputCap:ENVELOPES[type].output,stream:false,now:150};
 return {options,request};
}
function syncKnown(o){o.known=Object.fromEntries(correspondence.map(k=>[k,structuredClone(o.profile[k])]));o.known.thinkingControl=o.profile.thinking.control;}
const run=({options,request})=>createQwenRequestProfileCompiler(options).compile(request);
function noAuthority(r){
 assert.equal(r.qualification,'NOT_ESTABLISHED');assert.equal(r.wireComplete,false);assert.equal(r.inputBoundQualified,false);assert.equal(r.financialAuthority,false);assert.equal(r.dispatchAllowed,false);assert.equal(r.sourceKind,'SYNTHETIC_PROFILE');
 for(const key of ['body','messages','evidence','content','reasoning','signature','reservation','price','max_tokens','verified','requestDigest'])assert.equal(Object.hasOwn(r,key),false);
}
function refused(s,reason){const r=run(s);assert.equal(r.status,'UNAVAILABLE');if(reason)assert.equal(r.reason,reason);noAuthority(r);assert.equal(Object.hasOwn(r,'binding'),false);assert.equal(Object.hasOwn(r,'requestControls'),false);return r;}

for(const type of Object.keys(ENVELOPES))test('synthetic '+type+' compiles only partial controls with exact original job envelope',()=>{
 const s=setup(type),r=run(s);assert.equal(r.status,'COMPILED_PARTIAL');noAuthority(r);
 assert.deepEqual(r.requestControls,{stream:false,max_completion_tokens:500});assert.equal(r.billableOutputCap,ENVELOPES[type].output);assert.equal(r.binding.limits.inputTokens,ENVELOPES[type].input);assert.equal(r.binding.limits.billableOutputCap,r.billableOutputCap);assert.equal(r.binding.childId,s.request.childIdentity.childOperationId);assert.deepEqual(r.childIdentity,s.request.childIdentity);assert.equal(r.headroom,100);
 assert.equal(r.thinkingPolicy.enabled,false);assert.equal(r.thinkingPolicy.control,'none');assert.equal(Object.hasOwn(r.requestControls,'enable_thinking'),false);assert.equal(Object.hasOwn(r.requestControls,'response_format'),false);
});

test('stream explicitly includes final usage, normal request has no streaming wire fields',()=>{
 const s=setup();s.request.stream=true;assert.deepEqual(run(s).requestControls,{stream:true,max_completion_tokens:500,stream_options:{include_usage:true}});s.request.stream=false;assert.deepEqual(run(s).requestControls,{stream:false,max_completion_tokens:500});
});

test('C600 qualified H100 refuses590 and permits500; H less than10 cannot remove minimum headroom',()=>{
 const s=setup();s.options.profile.thinking.requestedMaxCompletionTokens=590;refused(s,'REQUEST_BOUND');s.options.profile.thinking.requestedMaxCompletionTokens=500;assert.equal(run(s).status,'COMPILED_PARTIAL');
 for(const h of [0,1,9,10]){s.options.profile.thinking.overshootHeadroom=h;s.options.profile.thinking.requestedMaxCompletionTokens=590;assert.equal(run(s).headroom,10);s.options.profile.thinking.requestedMaxCompletionTokens=591;refused(s,'REQUEST_BOUND');}
 s.options.profile.thinking.overshootHeadroom=600;refused(s,'REQUEST_BOUND');
});

test('all billable caps intersect and parser reserves C including thinking, not requested maximum plus reasoning',()=>{
 const s=setup();s.options.profile.qualifiedLimits.billableOutputCap=400;s.options.profile.thinking.requestedMaxCompletionTokens=300;
 let r=run(s);assert.equal(r.billableOutputCap,400);assert.equal(r.binding.limits.billableOutputCap,400);assert.equal(r.requestControls.max_completion_tokens,300);
 s.request.outputCap=350;refused(s,'REQUEST_BOUND');s.options.profile.thinking.requestedMaxCompletionTokens=250;r=run(s);assert.equal(r.billableOutputCap,350);assert.equal(r.binding.limits.billableOutputCap,350);
 s.request.outputCap=601;refused(s,'REQUEST_BOUND');s.request.outputCap=350;s.request.inputTokens=4001;refused(s,'REQUEST_BOUND');s.request.inputTokens=4000;assert.equal(run(s).status,'COMPILED_PARTIAL');
});

test('one explicit supported thinking policy leaves answer room, without guessing provider wire controls',()=>{
 const s=setup();Object.assign(s.options.profile.thinking,{enabled:true,control:'thinking_budget',thinkingBudget:100});s.options.profile.usageProfile.reasoningAbsence='reject';syncKnown(s.options);
 const r=run(s);assert.equal(r.status,'COMPILED_PARTIAL');assert.equal(r.binding.thinkingEnabled,true);assert.equal(r.binding.profile.reasoningAbsence,'reject');assert.equal(r.binding.limits.billableOutputCap,600);assert.equal(r.thinkingPolicy.thinkingBudget,100);assert.equal(Object.hasOwn(r.requestControls,'thinking_budget'),false);assert.equal(Object.hasOwn(r.requestControls,'reasoning_effort'),false);noAuthority(r);
 for(const budget of [0,500,501,null,1.5]){s.options.profile.thinking.thinkingBudget=budget;refused(s,'THINKING_UNAVAILABLE');}
 s.options.profile.thinking.thinkingBudget=100;s.options.known.thinkingControl='none';refused(s,'THINKING_UNAVAILABLE');
});

for(const dimension of correspondence)test('unknown/mismatched private correspondence refuses '+dimension,()=>{
 const s=setup();const v=s.options.known[dimension];s.options.known[dimension]=typeof v==='string'?'unknown':Array.isArray(v)?[]:{};refused(s,'PROFILE_CORRESPONDENCE_MISMATCH');delete s.options.known[dimension];refused(s,'PROFILE_UNAVAILABLE');
});

test('finite endpoint/model/schema/quality identities do not infer support from hosts, suffixes or wildcard names',()=>{
 for(const mutate of [p=>p.endpoint.path='/v1/responses',p=>p.endpoint.host='https://synthetic.workspace.invalid',p=>p.endpoint.host='*.invalid',p=>p.model.responseAllowlist=['synthetic-model','synthetic-model'],p=>p.model.responseAllowlist=['synthetic-*'],p=>p.model.responseAllowlist=[],p=>p.model.resolutionVersion='',p=>p.responseSchemaDigest='A'.repeat(64),p=>p.qualityReceiptRefs=[],p=>p.qualityReceiptRefs=['same','same'],p=>p.apiProfileId='',p=>p.tokenizerProfileId='',p=>p.decodingPolicyId='']){
  const s=setup();mutate(s.options.profile);syncKnown(s.options);refused(s);
 }
});

test('expiry/revocation and nonfinite time have no default or inherited validity',()=>{
 for(const now of [99,200,201,-1,NaN,Infinity,'150',null]){const s=setup();s.request.now=now;refused(s);}
 const s=setup();s.options.profile.validity.revoked=true;refused(s,'VALIDITY_UNAVAILABLE');s.options.profile.validity.revoked=false;s.options.profile.validity.expiresAt=100;refused(s,'VALIDITY_UNAVAILABLE');delete s.options.profile.validity.verifiedAt;refused(s,'VALIDITY_UNAVAILABLE');
 const valid=setup();valid.request.now=100;assert.equal(run(valid).status,'COMPILED_PARTIAL');valid.request.now=199;assert.equal(run(valid).status,'COMPILED_PARTIAL');delete valid.request.now;refused(valid,'REQUEST_UNAVAILABLE');
});

test('no extension-selected model, endpoint, verified flag, wire/body field or automatic retry enters compile',()=>{
 for(const [key,value]of Object.entries({model:'synthetic-other',endpoint:'synthetic-other',verified:true,messages:[{content:'SYNTHETIC_PRIVATE'}],max_tokens:500,max_completion_tokens:500,retry:0,thinking:true,responseSchemaDigest:'b'.repeat(64),usageProfile:{}})){
  const s=setup();s.request[key]=value;const r=refused(s,'REQUEST_UNAVAILABLE');assert.equal(JSON.stringify(r).includes('SYNTHETIC_PRIVATE'),false);
 }
 for(const key of ['version','type','provider','tier','intent']){const s=setup();s.request.childIdentity[key==='type'?'verified':key]=true;refused(s,'CHILD_BINDING_MISMATCH');}
 for(const mutate of [c=>c.type='AI_ORGANIZE',c=>c.routeVersion='other',c=>c.contractVersion='other',c=>c.automaticRetries=1,c=>c.automaticRetries='0',c=>c.logicalJobId='',c=>c.childOperationId='wild*']){const s=setup();mutate(s.request.childIdentity);refused(s,'CHILD_BINDING_MISMATCH');}
});

test('transport/profile binding validation is the original parser owner, never a permissive default',()=>{
 for(const mutate of [p=>delete p.qualifiedLimits.maxFrames,p=>p.qualifiedLimits.extra=1,p=>p.qualifiedLimits.maxBytes=1048577,p=>p.qualifiedLimits.maxDepth=17,p=>p.qualifiedLimits.maxKeys=0,p=>p.qualifiedLimits.inputTokens=16001,p=>p.qualifiedLimits.billableOutputCap=6001,p=>p.usageProfile.shape='future',p=>p.usageProfile.cachedAbsence='qualified-zero',p=>p.usageProfile.cacheMode='explicit-fixture-only',p=>p.usageProfile.extra=true]){
  const s=setup();mutate(s.options.profile);syncKnown(s.options);refused(s,'PARSER_BINDING_UNAVAILABLE');
 }
 const s=setup();Object.assign(s.options.profile.thinking,{enabled:true,control:'thinking_budget',thinkingBudget:100});syncKnown(s.options);refused(s,'PARSER_BINDING_UNAVAILABLE');
});

test('factory schemas and bound own metadata reject accessors, inherited/sparse/cyclic/symbol/oversize values without invoking getters',()=>{
 let reads=0;
 for(const key of ['profile','known']){const s=setup();Object.defineProperty(s.options,key,{enumerable:true,get(){reads++;throw Error('SYNTHETIC_PRIVATE');}});refused(s,'METADATA_INVALID');}
 const s=setup();Object.defineProperty(s.options.profile.endpoint,'host',{enumerable:true,get(){reads++;return 'synthetic.workspace.invalid';}});refused(s,'METADATA_INVALID');
 for(const mutate of [s=>s.options.profile.extra=true,s=>s.options.profile.kind='commercial',s=>s.options.profile.version=2,s=>s.options.known.verified=true,s=>s.options.profile.qualityReceiptRefs=new Array(2),s=>s.options.profile.model.responseAllowlist[Symbol('private')]=true,s=>s.options.profile.validity.self=s.options.profile,s=>s.options.profile.id='a'.repeat(201),s=>Object.setPrototypeOf(s.options.profile.endpoint,{secret:true})]){const s=setup();mutate(s);refused(s);}
 const many=setup();for(let i=0;i<300;i++)many.options.profile['key'+i]=i;refused(many,'METADATA_BOUND');assert.equal(reads,0);
 const safe=setup(),compiler=createQwenRequestProfileCompiler(safe.options);Object.defineProperty(safe.request,'now',{enumerable:true,get(){reads++;return 150;}});const r=compiler.compile(safe.request);assert.equal(r.status,'UNAVAILABLE');assert.equal(r.reason,'METADATA_INVALID');assert.equal(reads,0);noAuthority(r);
});

test('snapshots and returned bindings are detached; dispose invalidates future compile and reentry cannot revive it',()=>{
 const s=setup(),compiler=createQwenRequestProfileCompiler(s.options);s.options.profile.model.requested='changed';s.options.known.model.requested='changed';s.options.profile.validity.revoked=true;
 const r=compiler.compile(s.request);assert.equal(r.status,'COMPILED_PARTIAL');r.binding.limits.billableOutputCap=1;r.binding.responseModels.length=0;r.requestControls.max_completion_tokens=999;r.endpoint.host='changed';assert.equal(compiler.compile(s.request).binding.limits.billableOutputCap,600);assert.equal(compiler.compile(s.request).model.requested,'synthetic-qwen-model');
 const request=new Proxy(s.request,{getPrototypeOf(t){compiler.dispose();return Reflect.getPrototypeOf(t);}});assert.equal(compiler.compile(request).status,'UNAVAILABLE');assert.equal(compiler.compile(s.request).reason,'PROFILE_DISPOSED');noAuthority(compiler.compile(s.request));
});

test('actual typed Foundation plan/childRequest projects identity with all stores unchanged by compilation',async()=>{
 const s=setup('AI_MAINTENANCE'),f=await setupStore(OrganizerStore),owner=new AIUsageFoundation(f.s,{resolveAuthority:async(_t,r)=>({allowed:true,principalId:'synthetic-principal',libraryId:'synthetic-library',consentEpoch:'synthetic-consent',jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}})});
 const {items}=await owner.collect(),coverage=items.map(i=>({key:i.key,facet:'topic',scope:'synthetic-topic'}));
 const planned=await owner.plan({type:'AI_MAINTENANCE',items,coverage,contractVersion:s.options.profile.contractVersion,routeVersion:s.options.profile.routeVersion,intent:'maintenance'});
 const job=await owner.read(t=>t.get('organizerJobs',planned.id)),actual=owner.childRequest(job,0);
 s.request.childIdentity=Object.fromEntries(['logicalJobId','childOperationId','type','contractVersion','routeVersion','automaticRetries'].map(k=>[k,actual[k]]));
 const all=()=>f.s.repository.transaction(false,async t=>{const out={};for(const name of f.s.repository.stores)out[name]=await t.all(name);return out;}),before=await all(),writes=f.s.repository.metrics.writes;
 const r=run(s);assert.equal(r.status,'COMPILED_PARTIAL');assert.equal(r.binding.childId,actual.childOperationId);assert.equal(actual.evidence.length,items.length);assert.equal(Object.hasOwn(r,'evidence'),false);assert.equal(JSON.stringify(r).includes(actual.evidence[0].key),false);noAuthority(r);
 assert.deepEqual(await all(),before);assert.equal(f.s.repository.metrics.writes,writes);assert.equal(before.organizerJobs.length,1);assert.equal(before.organizerUsage.length,0);assert.equal((await owner.counters()).physicalAttempt,0);
});

test('compiled binding drives both original raw usage entry points with exact model and child semantics',()=>{
 const s=setup(),r=run(s),encode=s=>new TextEncoder().encode(s),complete={transportComplete:true,cancelled:false};
 const usage={prompt_tokens:100,completion_tokens:20,total_tokens:120,completion_tokens_details:{reasoning_tokens:0},prompt_tokens_details:{cached_tokens:10,cache_creation_input_tokens:0}};
 const raw={id:'synthetic-response-1',model:'synthetic-qwen-snapshot',object:'chat.completion',choices:[{index:0,message:{role:'assistant',content:'SYNTHETIC_PRIVATE'},finish_reason:'stop'}],usage};
 const p=createQwenJsonUsageParser({binding:r.binding,httpStatus:200});assert.equal(p.push(encode(JSON.stringify(raw))),true);const known=p.finish(complete);assert.equal(known.usageState,'KNOWN');assert.equal(known.neutral.completionTokens,20);noAuthority(r);assert.equal(JSON.stringify(known).includes('SYNTHETIC_PRIVATE'),false);assert.equal(known.dispatchAllowed,false);
 const frames=[{id:raw.id,model:raw.model,object:'chat.completion.chunk',choices:[{index:0,delta:{role:'assistant',content:'SYNTHETIC_PRIVATE'},finish_reason:'stop'}]}, {id:raw.id,model:raw.model,object:'chat.completion.chunk',choices:[],usage}];
 s.request.stream=true;const stream=run(s),q=createQwenSseUsageParser({binding:stream.binding,httpStatus:200});assert.equal(q.push(encode(frames.map(f=>'data: '+JSON.stringify(f)+'\n\n').join('')+'data: [DONE]\n\n')),true);assert.deepEqual(q.finish(complete),known);
 raw.model='synthetic-other';const bad=createQwenJsonUsageParser({binding:r.binding,httpStatus:200});bad.push(encode(JSON.stringify(raw)));assert.equal(bad.finish(complete).reason,'TRANSPORT_BINDING_MISMATCH');
});
