import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createQwenRequestProfileCompiler,createQwenSourceProfileControls} from '../core/ai-usage/qwen-request-profile.js';
import {createQwenBpeCounter,inspectQwenBpeCounter} from '../core/ai-usage/qwen-bpe-counter.js';
import * as production from '../core/ai-usage/qwen-source-profile.js';
import {ENVELOPES} from '../core/ai-usage/admission-policy.js';
import {canonical} from '../core/ai-usage/contracts.js';
import {hashText} from '../core/dedupe.js';
const correspondence=['id','jobType','contractVersion','routeVersion','endpoint','model','apiProfileId','usageProfile','tokenizerProfileId','decodingPolicyId','responseSchemaDigest','qualityReceiptRefs'];
const syncKnown=f=>{f.known=Object.fromEntries(correspondence.map(k=>[k,structuredClone(f.profile[k])]));f.known.thinkingControl=f.profile.thinking.control;};
function fixture(type='AI_ASSIST',source=false){
 const profile={version:1,kind:source?'source-request-profile-v1':'synthetic-request-profile-v1',id:'phase-profile',jobType:type,contractVersion:'phase-contract',routeVersion:'phase-route',endpoint:{host:'phase.workspace.invalid',region:'phase-region',deployment:'phase-deployment',path:'/compatible-mode/v1/chat/completions'},model:{requested:'phase-model',resolutionVersion:'phase-resolution',responseAllowlist:['phase-model']},apiProfileId:'phase-api',usageProfile:{version:1,shape:'compatible-direct-v1',cacheMode:'implicit',reasoningAbsence:'qualified-zero-nonthinking',creationAbsence:'qualified-zero-no-markers',cachedAbsence:'reject'},thinking:{enabled:false,control:'none',thinkingBudget:null,requestedMaxCompletionTokens:500,overshootHeadroom:100},tokenizerProfileId:'phase-tokenizer',decodingPolicyId:'phase-decoder',responseSchemaDigest:'a'.repeat(64),qualityReceiptRefs:['receipt-RESPONSE_QUALITY'],qualifiedLimits:{maxBytes:262144,maxFrames:128,maxDepth:12,maxKeys:2048,maxStringBytes:65536,inputTokens:16000,billableOutputCap:6000},validity:{verifiedAt:100,expiresAt:1000,revoked:false}};
 const f={profile};syncKnown(f);return f;
}
const request=type=>({childIdentity:{logicalJobId:'phase-job',childOperationId:'phase-child',type,contractVersion:'phase-contract',routeVersion:'phase-route',automaticRetries:0},inputTokens:100,outputCap:ENVELOPES[type].output,stream:false,now:150});
const factory=f=>f.profile.kind==='source-request-profile-v1'?createQwenSourceProfileControls(f):createQwenRequestProfileCompiler(f);
function split(compiler,{inputTokens,...options}){const handle=compiler.prepareControls(options);return handle.status==='CONTROLS_PREPARED'?compiler.finishInputBound(handle,{inputTokens,now:options.now}):handle;}
function noAuthority(value){for(const key of ['financialAuthority','dispatchAllowed','wireComplete','inputBoundQualified'])assert.equal(value[key],false);for(const key of ['payload','body','messages','inputTokens','reservationRequest','requestDigest','authorization','content'])assert.equal(Object.hasOwn(value,key),false);}
for(const source of [false,true])for(const type of Object.keys(ENVELOPES))test(`phase split exactly equals legacy ${source?'source metadata':'synthetic'} ${type}`,()=>{
 for(const stream of [false,true])for(const thinking of [false,true])for(const inputTokens of [0,1,ENVELOPES[type].input,ENVELOPES[type].input+1,-1,1.5,Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER+1,NaN,Infinity,'100',null]){
  const f=fixture(type,source);if(thinking){Object.assign(f.profile.thinking,{enabled:true,control:'thinking_budget',thinkingBudget:100});f.profile.usageProfile.reasoningAbsence='reject';syncKnown(f);}
  const c=factory(f),r={...request(type),stream,inputTokens};assert.deepEqual(split(c,r),c.compile(r));
 }
});
test('output intersection/headroom and malformed child/profile failures retain original compiler reasons',()=>{
 const changes=[r=>r.outputCap=0,r=>r.outputCap=601,r=>r.outputCap=599,r=>r.outputCap=NaN,r=>r.stream=0,r=>r.childIdentity.type='AI_ORGANIZE',r=>r.childIdentity.contractVersion='other',r=>r.childIdentity.routeVersion='other',r=>r.childIdentity.automaticRetries=1,r=>r.childIdentity.logicalJobId='',r=>r.childIdentity.childOperationId='bad*',r=>r.childIdentity.extra=true,r=>r.now=99,r=>r.now=1000];
 for(const change of changes){const f=fixture(),r=request('AI_ASSIST');change(r);const c=factory(f);assert.deepEqual(split(c,r),c.compile(r));assert.equal(c.compile(r).status,'UNAVAILABLE');}
 for(const headroom of [0,1,9,10,100,600])for(const completion of [489,490,491,500,590,591])for(const outputCap of [500,599,600]){const f=fixture();Object.assign(f.profile.thinking,{overshootHeadroom:headroom,requestedMaxCompletionTokens:completion});const c=factory(f),r={...request('AI_ASSIST'),outputCap};assert.deepEqual(split(c,r),c.compile(r));}
 for(const change of [f=>f.profile.validity.revoked=true,f=>f.known.routeVersion='other',f=>f.profile.qualifiedLimits.inputTokens=16001,f=>f.profile.kind='unknown']){const f=fixture();change(f);const c=factory(f),r=request('AI_ASSIST');assert.deepEqual(split(c,r),c.compile(r));assert.equal(c.compile(r).status,'UNAVAILABLE');}
});
test('prepared controls are metadata only, deeply frozen and do not claim input qualification',()=>{
 const f=fixture(),c=factory(f),{inputTokens,...r}=request('AI_ASSIST'),h=c.prepareControls(r);assert.equal(h.status,'CONTROLS_PREPARED');noAuthority(h);assert.equal(h.qualification,'NOT_ESTABLISHED');
 const frozen=v=>{if(v&&typeof v==='object'){assert.equal(Object.isFrozen(v),true);for(const x of Object.values(v))frozen(x);}};frozen(h);
 assert.throws(()=>{h.binding.limits.inputTokens=999999;},TypeError);assert.throws(()=>{h.requestControls.max_completion_tokens=1;},TypeError);
 r.childIdentity.childOperationId='changed';f.profile.validity.revoked=true;const out=c.finishInputBound(h,{inputTokens,now:151});assert.equal(out.childIdentity.childOperationId,'phase-child');assert.equal(out.status,'COMPILED_PARTIAL');noAuthority(out);
 // Existing compile results remain detached and mutable, not new capabilities.
 out.binding.limits.inputTokens=1;assert.equal(c.compile(request('AI_ASSIST')).binding.limits.inputTokens,4000);
});
test('copied, forged, foreign and consumed controls cannot finish; failed finish is terminal',()=>{
 const f=fixture(),c=factory(f),other=factory(f),{inputTokens,...r}=request('AI_ASSIST'),h=c.prepareControls(r);
 for(const invalid of [{},null,structuredClone(h),{...h},new Proxy(h,{})])assert.equal(c.finishInputBound(invalid,{inputTokens,now:150}).reason,'CONTROL_HANDLE_UNAVAILABLE');
 assert.equal(other.finishInputBound(h,{inputTokens,now:150}).reason,'CONTROL_HANDLE_UNAVAILABLE');assert.equal(c.finishInputBound(h,{inputTokens,now:150}).status,'COMPILED_PARTIAL');assert.equal(c.finishInputBound(h,{inputTokens,now:150}).reason,'CONTROL_HANDLE_UNAVAILABLE');
 for(const options of [{inputTokens:4001,now:150},{inputTokens,now:1000},{inputTokens,now:149},{inputTokens,now:150,body:'SYNTHETIC_PRIVATE'}]){const p=c.prepareControls(r);assert.equal(c.finishInputBound(p,options).status,'UNAVAILABLE');assert.equal(c.finishInputBound(p,{inputTokens,now:150}).reason,'CONTROL_HANDLE_UNAVAILABLE');}
});
test('prepare/finish reject payload and accessor traps without reading them; reentry/dispose cannot revive handles',()=>{
 let reads=0;const f=fixture(),c=factory(f),{inputTokens,...r}=request('AI_ASSIST');
 for(const field of ['payload','body','inputTokens','now']){const o={...r};Object.defineProperty(o,field,{enumerable:true,get(){reads++;throw Error('PRIVATE');}});assert.equal(c.prepareControls(o).reason,'METADATA_INVALID');}
 const h=c.prepareControls(r),o={now:150};Object.defineProperty(o,'inputTokens',{enumerable:true,get(){reads++;return inputTokens;}});assert.equal(c.finishInputBound(h,o).reason,'METADATA_INVALID');assert.equal(reads,0);
 const h2=c.prepareControls(r);let inner;const reentrant=new Proxy({inputTokens,now:150},{getPrototypeOf(t){inner=c.finishInputBound(h2,{inputTokens,now:150});return Reflect.getPrototypeOf(t);}});assert.equal(c.finishInputBound(h2,reentrant).status,'COMPILED_PARTIAL');assert.equal(inner.reason,'CONTROL_HANDLE_UNAVAILABLE');
 const h3=c.prepareControls(r),disposing=new Proxy({inputTokens,now:150},{getPrototypeOf(t){c.dispose();return Reflect.getPrototypeOf(t);}});assert.equal(c.finishInputBound(h3,disposing).status,'UNAVAILABLE');assert.equal(c.prepareControls(r).reason,'PROFILE_DISPOSED');assert.equal(c.finishInputBound(h3,{inputTokens,now:150}).reason,'PROFILE_DISPOSED');
});

const sourceURL=new URL('../core/ai-usage/qwen-source-profile.js',import.meta.url);let serial=0;
async function installation(){
 const manifest={version:1,...fixture('AI_ASSIST',true)},p=manifest.profile,verifiedAt=Date.now(),expiresAt=verifiedAt+60000;
 p.validity={verifiedAt,expiresAt,revoked:false};const schema={type:'object',properties:{answer:{type:'string',minLength:1,maxLength:50}},required:['answer'],additionalProperties:false};p.responseSchemaDigest=await hashText(canonical(schema));syncKnown(manifest);
 manifest.route={provider:'qwen',model:p.model.requested,resolutionVersion:p.model.resolutionVersion,region:p.endpoint.region,deployment:p.endpoint.deployment,market:'phase-market',api:'chat-completions',profile:p.apiProfileId,tier:'standard',currency:'USD',tokenizer:p.tokenizerProfileId,pricingVersion:'phase-price'};
 manifest.wire={instructions:'Synthetic controls phase split test only.',responseFormat:{type:'json_schema',json_schema:{name:'phase-schema',strict:true,schema}},thinkingControls:{enable_thinking:false}};manifest.tokenizer={profileId:p.tokenizerProfileId,qualificationRef:'phase-qualification',protocolOverheadTokens:20,maxWireBytes:262144};
 const asset=Array.from({length:256},(_,i)=>Buffer.from([i]).toString('base64')+' '+i).join('\n'),counter={format:'qwen-byte-rank-table-v1',asset,assetDigest:await hashText(asset),normalization:'none',specialMode:'ordinary',specialTokens:[],maxWireBytes:262144,workLimit:8000000},bpe=await createQwenBpeCounter(counter),info=inspectQwenBpeCounter(bpe);bpe.dispose();
 const qualification={version:1,id:'phase-qualification',manifestDigest:await hashText(canonical(manifest)),counter:info,boundMethod:'whole-wire-bpe-plus-qualified-overhead-v1',receipts:[],verifiedAt,expiresAt,revocationVersion:'phase-review'};
 for(const role of ['MODEL_TOKENIZER','FULL_WIRE_BOUND','NORMALIZATION','USAGE_PROFILE','RESPONSE_QUALITY','RATEBOOK']){const id='receipt-'+role,content=canonical({version:1,id,role,manifestDigest:qualification.manifestDigest,counterDigest:await hashText(canonical(info)),verifiedAt,expiresAt,result:'QUALIFIED',evidence:['1'.repeat(64)]});qualification.receipts.push({id,role,digest:await hashText(content),content});}
 return {version:1,id:p.id,manifest,counter,qualification};
}
async function installed(f){
 let source=await readFile(sourceURL,'utf8');source=source.replace("import {QWEN_SOURCE_PROFILE_INSTALLATIONS} from './qwen-source-profile-installations.js';",'const QWEN_SOURCE_PROFILE_INSTALLATIONS='+JSON.stringify([f])+';');source=source.replace(/from '(\.\.?\/[^']+)'/g,(_,p)=>'from '+JSON.stringify(new URL(p,sourceURL).href));
 // Test-only private-state intervention, absent from the runtime module, proves
 // that the original counter inspector retires controls issued before disposal.
 source+='\nexport function retireCounterForTest(cap){caps.get(cap).counter.dispose();}\n// phase '+serial++;
 const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')),cap=await api.loadInstalledQwenSourceProfile(f.id);assert.ok(cap);return {api,cap};
}
const installedRequest=()=>{const {now,...r}=request('AI_ASSIST');return r;};
async function measured(scope,f,h){const body=canonical({model:f.manifest.profile.model.requested,messages:[{role:'system',content:f.manifest.wire.instructions},{role:'user',content:canonical({text:'SYNTHETIC_PHASE_BODY'})}],response_format:f.manifest.wire.responseFormat,...h.requestControls,enable_thinking:false,n:1}),envelope={method:'POST',endpoint:{scheme:'https',host:f.manifest.profile.endpoint.host,path:f.manifest.profile.endpoint.path},headers:{'Content-Type':'application/json'},body};return scope.api.measureInstalledQwenRequest(scope.cap,{profileId:f.id,tokenizerProfileId:f.manifest.tokenizer.profileId,qualificationRef:f.qualification.id,requestDigest:await hashText(canonical(envelope)),envelope});}
test('installed phase split preserves exact legacy output and original measurement/source brand',async()=>{
 const f=await installation(),scope=await installed(f),{api,cap}=scope;
 for(const stream of [false,true]){const {inputTokens,...r}={...installedRequest(),stream},h=api.prepareInstalledQwenControls(cap,r);assert.equal(h.status,'CONTROLS_PREPARED');assert.equal(h.qualification,'SOURCE_RECEIPTS_CURRENT');noAuthority(h);const m=await measured(scope,f,h);assert.ok(m);assert.equal(api.isInstalledQwenMeasurement(m,cap),true);assert.equal(api.isInstalledQwenMeasurement({...m},cap),false);assert.equal(production.isInstalledQwenMeasurement(m,cap),false);assert.deepEqual(api.finishInstalledQwenInputBound(cap,h,{inputTokens:m.inputTokens}),api.compileInstalledQwenRequest(cap,{...r,inputTokens:m.inputTokens}));}
 for(const inputTokens of [0,4000,4001,-1,1.5,Number.MAX_SAFE_INTEGER+1,NaN]){const {inputTokens:_,...r}=installedRequest(),h=api.prepareInstalledQwenControls(cap,r);assert.deepEqual(api.finishInstalledQwenInputBound(cap,h,{inputTokens}),api.compileInstalledQwenRequest(cap,{...r,inputTokens}));}
});
test('installed controls reject copies, foreign identical sources, caller time and retired counter/source',async()=>{
 const f=await installation(),a=await installed(f),b=await installed(f),{inputTokens,...r}=installedRequest(),h=a.api.prepareInstalledQwenControls(a.cap,r);
 for(const [api,cap,handle]of [[a.api,a.cap,{...h}],[a.api,a.cap,structuredClone(h)],[a.api,b.cap,h],[b.api,b.cap,h],[production,a.cap,h]])assert.equal(api.finishInstalledQwenInputBound(cap,handle,{inputTokens}).status,'UNAVAILABLE');
 assert.equal(a.api.prepareInstalledQwenControls(a.cap,{...r,now:Date.now()}).status,'UNAVAILABLE');assert.equal(a.api.finishInstalledQwenInputBound(a.cap,h,{inputTokens,now:Date.now()}).status,'UNAVAILABLE');assert.equal(a.api.finishInstalledQwenInputBound(a.cap,h,{inputTokens}).status,'UNAVAILABLE');
 for(const retire of [s=>s.api.retireInstalledQwenSourceProfile(f.id),s=>s.api.retireCounterForTest(s.cap)]){const s=await installed(f),handle=s.api.prepareInstalledQwenControls(s.cap,r);retire(s);assert.equal(s.api.finishInstalledQwenInputBound(s.cap,handle,{inputTokens}).status,'UNAVAILABLE');assert.equal(s.api.prepareInstalledQwenControls(s.cap,r).status,'UNAVAILABLE');}
});
test('installed prepare/finish use original clock expiry and rollback, with no resurrection',async()=>{
 const f=await installation(),{inputTokens,...r}=installedRequest(),original=Date.now;
 for(const time of [f.qualification.expiresAt,f.qualification.verifiedAt-1]){const s=await installed(f),h=s.api.prepareInstalledQwenControls(s.cap,r);try{Date.now=()=>time;assert.equal(s.api.finishInstalledQwenInputBound(s.cap,h,{inputTokens}).status,'UNAVAILABLE');}finally{Date.now=original;}assert.equal(s.api.finishInstalledQwenInputBound(s.cap,h,{inputTokens}).status,'UNAVAILABLE');assert.equal(s.api.prepareInstalledQwenControls(s.cap,r).status,'UNAVAILABLE');}
});
