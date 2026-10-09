import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseQwenUsage,parseQwenStreamUsage} from '../core/ai-usage/qwen-usage-parser.js';
const corpus=JSON.parse(await readFile(new URL('./fixtures/qwen-usage-contract-v1.json',import.meta.url),'utf8'));
const binding=(c={})=>({version:1,childId:'synthetic-child-v1',requestedModel:'qwen3.8-max-0902',responseModels:['qwen3.8-max-0902'],thinkingEnabled:c.shapeProfile!=='synthetic-only-direct-compatible-nonthinking',profile:{version:1,shape:'compatible-direct-v1',cacheMode:'explicit-fixture-only',reasoningAbsence:c.absenceRule?.reasoning==='QUALIFIED_NONTHINKING_ZERO_ONLY'?'qualified-zero-nonthinking':'reject',creationAbsence:c.absenceRule?.creation==='QUALIFIED_NO_EXPLICIT_CACHE_ZERO_ONLY'?'qualified-zero-no-markers':'reject',cachedAbsence:'reject'},limits:{maxBytes:262144,maxFrames:128,maxDepth:12,maxKeys:2048,maxStringBytes:65536,inputTokens:16000,billableOutputCap:6000}});
function parse(c,b=binding(c)){
 const options={binding:b,httpStatus:200,cancelled:false,transportComplete:true};
 // Synthetic corpus stores JSON frames + terminal flag. This fixture adapter
 // supplies the new decoded marker; it is not a real SSE framing proof.
 return c.mode==='stream'?parseQwenStreamUsage({...options,...c.raw,frames:[...c.raw.frames,...(c.raw.done?[{kind:'done'}]:[])]}):parseQwenUsage({...options,response:c.raw});
}
for(const c of corpus.cases)test('raw contract: '+c.id,()=>{
 const b=binding(c);if(c.absenceRule?.creation)b.profile.cacheMode='implicit';
 const result=parse(c,b);
 assert.equal(result.usageState,c.expected.usageState,c.id);
 assert.equal(result.reason,c.expected.reason,c.id);
 assert.equal(result.financialAuthority,false);assert.equal(result.dispatchAllowed,false);
 assert.equal(result.reservation,'HELD_PENDING_INDEPENDENT_FINANCIAL_PROOF');
 assert.equal(result.domainValidity,'NOT_EVALUATED');
 if(c.expected.neutral)assert.deepEqual(result.neutral,c.expected.neutral);else assert.equal(result.neutral,null);
 if(c.productOutputComplete===false)assert.ok(['length','tool_calls'].includes(result.finishReason));
 assert.equal(Object.hasOwn(result,'body'),false);assert.equal(Object.hasOwn(result,'content'),false);
});

test('one stream cannot switch between two individually allowlisted models',()=>{
 const c=structuredClone(corpus.cases.find(c=>c.id==='stream-final-usage')),b=binding(c);
 b.responseModels.push('qwen3.8-max');c.raw.frames[2].model='qwen3.8-max';
 assert.equal(parse(c,b).reason,'TRANSPORT_BINDING_MISMATCH');
});

const sample=()=>structuredClone(corpus.cases.find(c=>c.id==='normal-direct-subsets'));
const streamSample=()=>structuredClone(corpus.cases.find(c=>c.id==='stream-final-usage'));
const noAuthority=r=>{assert.equal(r.financialAuthority,false);assert.equal(r.dispatchAllowed,false);assert.equal(r.qualification,'NOT_ESTABLISHED');assert.equal(r.reservation,'HELD_PENDING_INDEPENDENT_FINANCIAL_PROOF');};

test('minimal internal binding is strict shape, never verified service authority',()=>{
 for(const mutate of [b=>{b.verified=true;},b=>{delete b.childId;},b=>{b.version=2;},b=>{b.responseModels=['*'];},b=>{b.responseModels=['qwen3.8-max-0902','qwen3.8-max-0902'];},b=>{b.profile.shape='dashscope-v1';},b=>{b.profile.newAlias=true;},b=>{b.profile.cachedAbsence='zero';},b=>{b.thinkingEnabled=true;b.profile.reasoningAbsence='qualified-zero-nonthinking';},b=>{b.profile.creationAbsence='qualified-zero-no-markers';},b=>{b.limits.maxFrames=0;},b=>{b.limits.maxBytes=1048577;},b=>{delete b.limits.maxKeys;}]){
  const c=sample(),b=binding(c);mutate(b);const r=parse(c,b);assert.equal(r.reason,'BINDING_UNAVAILABLE');noAuthority(r);
 }
});

test('actual parser retains unknown on every transport bound without truncation',()=>{
 for(const [key,value]of [['maxFrames',2],['maxKeys',3],['maxDepth',1],['maxBytes',100],['maxStringBytes',8]]){
  const c=streamSample(),b=binding(c);b.limits[key]=value;const r=parse(c,b);assert.equal(r.usageState,'UNKNOWN');assert.equal(r.reason,'TRANSPORT_BOUND');assert.equal(r.neutral,null);noAuthority(r);
 }
 const c=sample(),b=binding(c);b.limits.maxStringBytes=32;c.raw.choices[0].message.content='汉'.repeat(20);assert.equal(parse(c,b).reason,'TRANSPORT_BOUND');
});

test('aggregate byte bound counts escaped JSON rather than raw character length',()=>{
 const c=sample();c.raw.choices[0].message.content='\u0000'.repeat(200);const b=binding(c);b.limits.maxBytes=1000;
 assert.equal(parse(c,b).reason,'TRANSPORT_BOUND');
});

test('accessors, sparse arrays, symbol properties, cycles and non-JSON objects fail without accessor execution',()=>{
 let reads=0;
 const c=sample();Object.defineProperty(c.raw,'usage',{enumerable:true,get(){reads++;throw Error('PRIVATE BODY');}});
 assert.equal(parse(c).usageState,'INVALID');assert.equal(reads,0);
 const options={binding:binding(),response:sample().raw,httpStatus:200,transportComplete:true,cancelled:false};
 Object.defineProperty(options,'binding',{enumerable:true,get(){reads++;throw Error('PRIVATE BODY');}});assert.equal(parseQwenUsage(options).usageState,'INVALID');assert.equal(reads,0);
 for(const mutate of [r=>{r.choices.length=2;},r=>{r[Symbol('SYNTHETIC')]=1;},r=>{r.self=r;},r=>{r.usage=new Date(0);},r=>{r.choices.extra=1;},r=>{r.usage=1n;},r=>{r.usage=()=>0;}]){
  const x=sample();mutate(x.raw);const r=parse(x);assert.equal(r.usageState,'INVALID');assert.equal(r.neutral,null);noAuthority(r);
 }
});

test('HTTP failure, cancellation, incomplete transport and absent DONE never release spend',()=>{
 const c=sample(),base={binding:binding(c),response:c.raw,transportComplete:true,httpStatus:200,cancelled:false};
 for(const patch of [{httpStatus:401},{httpStatus:429},{httpStatus:500},{cancelled:true},{transportComplete:false}]){
  const r=parseQwenUsage({...base,...patch});assert.equal(r.usageState,'UNKNOWN');assert.equal(r.neutral,null);noAuthority(r);
 }
 const s=streamSample(),b=binding(s);for(const patch of [{done:false},{cancelled:true},{transportComplete:false}])assert.equal(parseQwenStreamUsage({binding:b,...s.raw,httpStatus:200,cancelled:false,...patch}).usageState,'UNKNOWN');
 for(const patch of [{httpStatus:0},{httpStatus:'200'},{transportComplete:1},{cancelled:null}])assert.equal(parseQwenUsage({...base,...patch}).usageState,'INVALID');
 const missing={...base};delete missing.transportComplete;assert.equal(parseQwenUsage(missing).usageState,'INVALID');
});

test('zero and absent/null remain distinct; aliases cannot select a usage profile',()=>{
 for(const k of ['prompt_tokens','completion_tokens','total_tokens']){const c=sample();c.raw.usage[k]=null;assert.equal(parse(c).usageState,'UNKNOWN');}
 const c=sample(),b=binding(c);b.profile.cacheMode='implicit';b.profile.creationAbsence='qualified-zero-no-markers';delete c.raw.usage.prompt_tokens_details.cache_creation_input_tokens;
 assert.equal(parse(c,b).neutral.cacheCreateTokens,0);
 c.raw.usage.prompt_tokens_details.cache_creation_input_tokens=null;assert.equal(parse(c,b).usageState,'UNKNOWN');
 for(const k of ['input_tokens','cache_read_input_tokens','reasoningTokens']){const x=sample();x.raw.usage[k]=0;assert.equal(parse(x).usageState,'INVALID');}
 const x=sample(),nb=binding(x);nb.thinkingEnabled=false;x.raw.usage.completion_tokens_details.reasoning_tokens=1;assert.equal(parse(x,nb).usageState,'INVALID');
});

test('safe totals and every partition are checked by existing neutral owner',()=>{
 const changes=[u=>{u.prompt_tokens=Number.MAX_SAFE_INTEGER;u.completion_tokens=1;u.total_tokens=Number.MAX_SAFE_INTEGER;},u=>{u.prompt_tokens_details.cache_creation_input_tokens=71;},u=>{u.completion_tokens_details.text_tokens=49;},u=>{u.prompt_tokens_details.text_tokens=99;},u=>{u.prompt_tokens_details.cached_tokens='30';},u=>{u.completion_tokens_details.reasoning_tokens=NaN;},u=>{u.prompt_tokens_details.cached_tokens=Infinity;}];
 for(const mutate of changes){const c=sample();mutate(c.raw.usage);assert.equal(parse(c).usageState,'INVALID');}
});

test('over-cap valid observed usage is retained exactly and never clamped or refunded',()=>{
 for(const key of ['inputTokens','billableOutputCap']){
  const c=sample(),b=binding(c);b.limits[key]=key==='inputTokens'?99:49;const r=parse(c,b);
  assert.equal(r.usageState,'KNOWN');assert.equal(r.reason,'USAGE_OVER_CAP');assert.equal(r.overCap,true);assert.deepEqual(r.neutral,c.expected.neutral);assert.equal(r.normalized.releaseReservation,false);noAuthority(r);
 }
});

test('finish reason and transport completion do not certify domain validity',()=>{
 for(const reason of ['stop','length','tool_calls']){
  const c=sample();c.raw.choices[0].finish_reason=reason;const r=parse(c);
  assert.equal(r.usageState,'KNOWN');assert.equal(r.transportComplete,true);assert.equal(r.finishReason,reason);assert.equal(r.domainValidity,'NOT_EVALUATED');assert.equal(Object.hasOwn(r,'domainValid'),false);noAuthority(r);
 }
});

test('normal identity, choice index and unsupported modality cannot bypass strict profile',()=>{
 for(const mutate of [r=>{r.object='chat.completion.chunk';},r=>{r.id='private response body with spaces';},r=>{r.choices.push(structuredClone(r.choices[0]));},r=>{r.choices[0].index=1;},r=>{r.choices[0].message.audio={data:'SYNTHETIC'};},r=>{r.usage.prompt_tokens_details.video_tokens=1;},r=>{r.usage.prompt_tokens_details.audio_tokens=-1;},r=>{r.system_fingerprint='unknown';},r=>{r.choices[0].finish_reason='unknown';}]){
  const c=sample();mutate(c.raw);assert.equal(parse(c).usageState,'INVALID');
 }
});

test('stream state rejects post-finish content, repeated finish, intermediate usage and unknown frame schema',()=>{
 for(const mutate of [f=>{f.splice(2,0,structuredClone(f[0]));},f=>{f.splice(2,0,structuredClone(f[1]));},f=>{f[0].usage=structuredClone(f[2].usage);},f=>{f[0].object='chat.completion';},f=>{f[0].choices[0].index=1;},f=>{f[0].unknown_alias=1;}]){
  const c=streamSample();mutate(c.raw.frames);const r=parse(c);assert.equal(r.usageState,'INVALID');assert.equal(r.neutral,null);noAuthority(r);
 }
 const c=streamSample();c.raw.frames[2].usage=null;assert.equal(parse(c).reason,'FINAL_USAGE_MISSING');
 const s=streamSample();s.raw.frames[0].error={message:'PRIVATE ERROR BODY'};assert.equal(parse(s).usageState,'UNKNOWN');
 const empty=streamSample();empty.raw.frames=[];assert.equal(parse(empty).usageState,'UNKNOWN');
});

test('decoded body/reasoning/error strings stay out of outputs and input is never mutated',()=>{
 for(const c of [sample(),streamSample()]){
  if(c.mode==='normal'){c.raw.choices[0].message.content='SYNTHETIC_BODY_SENTINEL';c.raw.choices[0].message.reasoning_content='SYNTHETIC_REASONING_SENTINEL';}
  else c.raw.frames[0].choices[0].delta.content='SYNTHETIC_BODY_SENTINEL';
  const b=binding(c),before=structuredClone({c,b}),r=parse(c,b);
  assert.equal(r.usageState,'KNOWN');assert.deepEqual({c,b},before);
  assert.equal(JSON.stringify(r).includes('SENTINEL'),false);
  r.neutral.inputTokens=0;assert.deepEqual({c,b},before);
 }
 const c=sample();c.raw={error:{message:'SYNTHETIC_PRIVATE_ERROR_SENTINEL'}};assert.equal(JSON.stringify(parse(c)).includes('SENTINEL'),false);
});

test('unexpected reflective exceptions cannot expose arbitrary caller error fields',()=>{
 const c=sample();c.raw=new Proxy(c.raw,{ownKeys(){throw {reason:'SYNTHETIC_PRIVATE_ERROR_SENTINEL',unknown:true};}});
 const r=parse(c);assert.equal(r.reason,'USAGE_INVALID');assert.equal(JSON.stringify(r).includes('SENTINEL'),false);noAuthority(r);
});

test('decoded DONE must be unique, after usage and at its actual terminal position',()=>{
 const s=streamSample(),base={binding:binding(s),done:true,transportComplete:true,httpStatus:200,cancelled:false};
 const good=[...s.raw.frames,{kind:'done'}];assert.equal(parseQwenStreamUsage({...base,frames:good}).usageState,'KNOWN');
 for(const frames of [[{kind:'done'},...s.raw.frames],[...s.raw.frames.slice(0,2),{kind:'done'},s.raw.frames[2]],[...good,{kind:'done'}],[...good,s.raw.frames[0]]]){
  const r=parseQwenStreamUsage({...base,frames:frames.map(f=>structuredClone(f))});assert.equal(r.usageState,'INVALID');assert.equal(r.reason,'STREAM_FINAL_CONFLICT');noAuthority(r);
 }
 assert.equal(parseQwenStreamUsage({...base,frames:s.raw.frames}).reason,'TRANSPORT_INCOMPLETE');
 const invalid=[...s.raw.frames,{kind:'done',body:'SYNTHETIC'}];assert.equal(parseQwenStreamUsage({...base,frames:invalid}).usageState,'INVALID');
});

test('known over-bound own-key and array sizes refuse before descriptor sweep',()=>{
 for(const target of [Object.fromEntries(Array.from({length:17000},(_,i)=>['k'+i,0])),Array.from({length:17000},()=>0)]){
  let inspected=0;const response=new Proxy(target,{getOwnPropertyDescriptor(t,k){inspected++;return Reflect.getOwnPropertyDescriptor(t,k);}});
  const r=parseQwenUsage({binding:null,response,transportComplete:true,httpStatus:200,cancelled:false});
  assert.equal(r.reason,'TRANSPORT_BOUND');assert.equal(inspected,0);noAuthority(r);
 }
});
