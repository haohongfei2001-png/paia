import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createQwenJsonUsageParser,parseQwenUsage} from '../core/ai-usage/qwen-usage-parser.js';

const corpus=JSON.parse(await readFile(new URL('./fixtures/qwen-usage-contract-v1.json',import.meta.url),'utf8'));
const fixture=corpus.cases.find(c=>c.id==='normal-direct-subsets');
const encoder=new TextEncoder(),complete={transportComplete:true,cancelled:false};
const binding=(c={})=>({version:1,childId:'synthetic-json-child',requestedModel:'qwen3.8-max-0902',responseModels:['qwen3.8-max-0902'],thinkingEnabled:c.shapeProfile!=='synthetic-only-direct-compatible-nonthinking',profile:{version:1,shape:'compatible-direct-v1',cacheMode:c.absenceRule?.creation?'implicit':'explicit-fixture-only',reasoningAbsence:c.absenceRule?.reasoning==='QUALIFIED_NONTHINKING_ZERO_ONLY'?'qualified-zero-nonthinking':'reject',creationAbsence:c.absenceRule?.creation==='QUALIFIED_NO_EXPLICIT_CACHE_ZERO_ONLY'?'qualified-zero-no-markers':'reject',cachedAbsence:'reject'},limits:{maxBytes:262144,maxFrames:128,maxDepth:12,maxKeys:2048,maxStringBytes:65536,inputTokens:16000,billableOutputCap:6000}});
const raw=()=>structuredClone(fixture.raw),wire=()=>JSON.stringify(raw());
function parse(text,{b=binding(),status=200,state=complete,chunks=null}={}){
 const p=createQwenJsonUsageParser({binding:b,httpStatus:status});
 for(const chunk of chunks||[encoder.encode(text)])p.push(chunk);
 return p.finish(state);
}
const decoded=(response=raw(),b=binding())=>parseQwenUsage({binding:b,response,httpStatus:200,...complete});
function noAuthority(r){
 assert.equal(r.financialAuthority,false);assert.equal(r.dispatchAllowed,false);
 assert.equal(r.qualification,'NOT_ESTABLISHED');assert.equal(r.domainValidity,'NOT_EVALUATED');
 assert.equal(r.reservation,'HELD_PENDING_INDEPENDENT_FINANCIAL_PROOF');
 for(const key of ['frames','body','content','response','reasoning','raw'])assert.equal(Object.hasOwn(r,key),false);
}

for(const c of corpus.cases.filter(c=>c.mode!=='stream'))test('literal normal wire preserves existing contract: '+c.id,()=>{
 const b=binding(c),r=parse(JSON.stringify(c.raw),{b});
 assert.deepEqual(r,decoded(c.raw,b));assert.equal(r.usageState,c.expected.usageState);assert.equal(r.reason,c.expected.reason);noAuthority(r);
});

test('every byte split, one-byte chunks, BOM and JSON whitespace preserve actual UTF-8',()=>{
 const r=raw();r.choices[0].message.content='合成🧭 é "quoted" \n line';
 const bytes=encoder.encode('\ufeff \r\n'+JSON.stringify(r)+'\t\n'),expected=decoded(r);
 assert.equal(expected.usageState,'KNOWN');
 for(let i=0;i<=bytes.length;i++)assert.deepEqual(parse('',{chunks:[bytes.slice(0,i),bytes.slice(i)]}),expected,`split ${i}`);
 assert.deepEqual(parse('',{chunks:[...bytes].map(n=>Uint8Array.of(n))}),expected);
});

test('duplicate identity and nested/escaped JSON keys reject before any collapse',()=>{
 const cases=[
  wire().replace('"model":','"model":"synthetic-conflict","model":'),
  wire().replace('"model":','"mo\\u0064el":"synthetic-conflict","model":'),
  '{"usage":{"prompt_tokens":1,"prompt_tokens":1}}',
  '{"choices":[{"message":{"content":"SYNTHETIC_SECRET","content":""}}]}',
  '{"__proto__":{},"\\u005f_proto__":{}}'
 ];
 for(const text of cases){const r=parse(text);assert.equal(r.usageState,'INVALID');assert.equal(r.reason,'JSON_DUPLICATE_KEY');assert.equal(r.neutral,null);noAuthority(r);assert.equal(JSON.stringify(r).includes('SYNTHETIC_SECRET'),false);}
});

test('strict single JSON refuses malformed values, trailing data and an SSE/DONE substitute',()=>{
 for(const text of ['', ' \r\n', '{"a":1,}', '[1,]', '{"a":01}', '{"a":NaN}', '{"a":1e999}', '{"a":true false}', '{"a":"bad\\x"}', '{"a":"raw\nline"}', '{"a":}', '{"a":1} trailing', '"unterminated',wire()+wire(),'[DONE]','data: '+wire()+'\n\n']){
  const r=parse(text);assert.equal(r.usageState,'INVALID',text.slice(0,16));assert.equal(r.reason,'JSON_VALUE_INVALID');assert.equal(r.neutral,null);noAuthority(r);
 }
 for(const text of ['null','true','[]','{"kind":"done"}']){const r=parse(text);assert.equal(r.usageState,'INVALID');assert.equal(r.neutral,null);noAuthority(r);}
});

test('invalid UTF-8 is a finite failure; incomplete trailing UTF-8 at EOF stays unknown',()=>{
 for(const chunk of [Uint8Array.of(0xc0,0xaf),Uint8Array.of(0xff),Uint8Array.of(0xed,0xa0,0x80)]){
  const r=parse('',{chunks:[chunk]});assert.equal(r.usageState,'INVALID');assert.equal(r.reason,'JSON_UTF8_INVALID');noAuthority(r);
 }
 const r=parse('',{chunks:[encoder.encode(wire()),Uint8Array.of(0xe4,0xb8)]});assert.equal(r.usageState,'UNKNOWN');assert.equal(r.reason,'TRANSPORT_INCOMPLETE');assert.equal(r.neutral,null);noAuthority(r);
});

test('actual view bytes, aggregate chunks, depth, keys and UTF-8 strings have independent limits',()=>{
 for(const [key,n,text]of [['maxBytes',32,wire()],['maxDepth',2,wire()],['maxKeys',4,wire()],['maxStringBytes',8,wire()],['maxStringBytes',3,'{"a":"汉汉"}']]){
  const b=binding();b.limits[key]=n;const r=parse(text,{b});assert.equal(r.usageState,'UNKNOWN',key);assert.equal(r.reason,'TRANSPORT_BOUND');noAuthority(r);
 }
 const b=binding();b.limits.maxBytes=32;const p=createQwenJsonUsageParser({binding:b,httpStatus:200});
 assert.equal(p.push(encoder.encode(' '.repeat(16))),true);assert.equal(p.push(encoder.encode(' '.repeat(17))),false);assert.equal(p.finish(complete).reason,'TRANSPORT_BOUND');
 const exact=binding();exact.limits.maxFrames=1;exact.limits.maxBytes=encoder.encode(wire()).length+256;assert.equal(parse(wire(),{b:exact}).usageState,'KNOWN');
});

test('intrinsic view slots ignore caller and subclass shadows, reject Proxy/shared/wrong type and respect offsets',()=>{
 let reads=0;const bytes=encoder.encode(wire());
 for(const key of ['byteLength','byteOffset','buffer'])Object.defineProperty(bytes,key,{get(){reads++;throw Error('SYNTHETIC_SECRET');}});
 const b=binding();b.limits.maxBytes=32;const p=createQwenJsonUsageParser({binding:b,httpStatus:200});
 assert.equal(p.push(bytes),false);assert.equal(p.finish(complete).reason,'TRANSPORT_BOUND');assert.equal(reads,0);
 assert.deepEqual(parse('',{chunks:[bytes]}),decoded());assert.equal(reads,0);
 class Shadow extends Uint8Array {get byteLength(){reads++;return 0;}get buffer(){reads++;return null;}}
 assert.deepEqual(parse('',{chunks:[new Shadow(encoder.encode(wire()))]}),decoded());assert.equal(reads,0);
 for(const chunk of [new Uint16Array(2),new DataView(new ArrayBuffer(2)),new Proxy(bytes,{}),new Uint8Array(new SharedArrayBuffer(2)),'private',null]){const r=parse('',{chunks:[chunk]});assert.equal(r.reason,'JSON_CHUNK_INVALID');noAuthority(r);}
 const actual=encoder.encode(wire()),padded=new Uint8Array(actual.length+10);padded.set(actual,5);assert.deepEqual(parse('',{chunks:[padded.subarray(5,-5)]}),decoded());
 const detached=new Uint8Array(2);structuredClone(detached.buffer,{transfer:[detached.buffer]});assert.equal(parse('',{chunks:[detached]}).usageState,'INVALID');
});

test('HTTP outcome, incomplete transport, cancellation and malformed final state never imply success',()=>{
 for(const status of [201,401,429,500]){const p=createQwenJsonUsageParser({binding:binding(),httpStatus:status});assert.equal(p.push(encoder.encode(wire())),false);const r=p.finish(complete);assert.equal(r.usageState,'UNKNOWN');assert.equal(r.neutral,null);noAuthority(r);}
 for(const state of [{transportComplete:false,cancelled:false},{transportComplete:true,cancelled:true},{transportComplete:false,cancelled:true}]){const r=parse(wire(),{state});assert.equal(r.reason,'TRANSPORT_INCOMPLETE');assert.equal(r.neutral,null);noAuthority(r);}
 for(const state of [{},null,{...complete,done:true},{transportComplete:true,cancelled:0}]){const r=parse(wire(),{state});assert.equal(r.usageState,'INVALID');noAuthority(r);}
 const p=createQwenJsonUsageParser({binding:binding(),httpStatus:200});p.push(encoder.encode(wire()));let reads=0;const state={cancelled:false};Object.defineProperty(state,'transportComplete',{enumerable:true,get(){reads++;return true;}});assert.equal(p.finish(state).usageState,'INVALID');assert.equal(reads,0);
});

test('private binding is mandatory, detached and structurally exact with no permissive limits',()=>{
 const b=binding(),p=createQwenJsonUsageParser({binding:b,httpStatus:200});b.limits.maxBytes=1;p.push(encoder.encode(wire()));assert.deepEqual(p.finish(complete),decoded());
 for(const mutate of [b=>{delete b.limits;},b=>{b.limits.maxBytes=1048577;},b=>{b.limits.maxKeys=0;},b=>{b.verified=true;},b=>{b.version=2;}]){const b=binding();mutate(b);const r=parse(wire(),{b});assert.equal(r.reason,'BINDING_UNAVAILABLE');noAuthority(r);}
 let reads=0;const o={httpStatus:200};Object.defineProperty(o,'binding',{enumerable:true,get(){reads++;throw Error('SYNTHETIC_SECRET');}});assert.equal(createQwenJsonUsageParser(o).finish(complete).usageState,'INVALID');assert.equal(reads,0);
 for(const o of [{httpStatus:200},{binding:binding(),httpStatus:0},{binding:binding(),httpStatus:200,transportComplete:true}]){const r=createQwenJsonUsageParser(o).finish(complete);assert.equal(r.usageState,'INVALID');noAuthority(r);}
});

test('missing final usage, identity, cap and finish reason semantics remain the original owner',()=>{
 const missing=raw();delete missing.usage;assert.equal(parse(JSON.stringify(missing)).reason,'FINAL_USAGE_MISSING');
 const switched=raw();switched.model='synthetic-other-model';assert.equal(parse(JSON.stringify(switched)).reason,'TRANSPORT_BINDING_MISMATCH');
 const b=binding();b.limits.billableOutputCap=1;const r=parse(wire(),{b});assert.equal(r.usageState,'KNOWN');assert.equal(r.overCap,true);assert.equal(r.neutral.completionTokens,decoded().neutral.completionTokens);noAuthority(r);
 for(const reason of ['stop','length','tool_calls']){const response=raw();response.choices[0].finish_reason=reason;assert.equal(parse(JSON.stringify(response)).finishReason,reason);}
});

test('finalization is detached, sticky and clears private parsing rather than allowing late input',()=>{
 const p=createQwenJsonUsageParser({binding:binding(),httpStatus:200});p.push(encoder.encode(wire()));const r=p.finish(complete);r.neutral.inputTokens=-1;assert.deepEqual(p.finish({}),decoded());assert.equal(p.push(encoder.encode(wire())),false);
 const bad=createQwenJsonUsageParser({binding:binding(),httpStatus:200});assert.equal(bad.push('SYNTHETIC_SECRET'),false);assert.equal(bad.push(encoder.encode(wire())),false);const result=bad.finish(complete);assert.equal(result.reason,'JSON_CHUNK_INVALID');assert.equal(JSON.stringify(result).includes('SYNTHETIC_SECRET'),false);assert.deepEqual(bad.finish({}),result);noAuthority(result);
});

test('real structural final-state reentry is unavailable, never null or a second parser run',()=>{
 const p=createQwenJsonUsageParser({binding:binding(),httpStatus:200});p.push(encoder.encode(wire()));const nested=[];
 const state=new Proxy({...complete},{getPrototypeOf(target){nested.push(p.finish(complete));assert.equal(p.push(encoder.encode(wire())),false);return Reflect.getPrototypeOf(target);}});
 const r=p.finish(state);assert.deepEqual(r,decoded());assert.ok(nested.length>0);for(const n of nested){assert.equal(n.usageState,'UNKNOWN');assert.equal(n.reason,'TRANSPORT_INCOMPLETE');noAuthority(n);}assert.deepEqual(p.finish(complete),r);
});
