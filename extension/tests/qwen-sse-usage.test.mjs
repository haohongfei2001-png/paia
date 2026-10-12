import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createQwenSseUsageParser,parseQwenStreamUsage} from '../core/ai-usage/qwen-usage-parser.js';

const corpus=JSON.parse(await readFile(new URL('./fixtures/qwen-usage-contract-v1.json',import.meta.url),'utf8'));
const fixture=corpus.cases.find(c=>c.id==='stream-final-usage');
const encoder=new TextEncoder();
const binding=()=>({version:1,childId:'synthetic-child-v1',requestedModel:'qwen3.8-max-0902',responseModels:['qwen3.8-max-0902'],thinkingEnabled:true,profile:{version:1,shape:'compatible-direct-v1',cacheMode:'explicit-fixture-only',reasoningAbsence:'reject',creationAbsence:'reject',cachedAbsence:'reject'},limits:{maxBytes:262144,maxFrames:128,maxDepth:12,maxKeys:2048,maxStringBytes:65536,inputTokens:16000,billableOutputCap:6000}});
const complete={transportComplete:true,cancelled:false};
const messages=()=>[...fixture.raw.frames.map(f=>JSON.stringify(f)),'[DONE]'];
const wire=(parts=messages(),end='\n')=>parts.map(p=>'data: '+p+end+end).join('');
function parse(text,{b=binding(),status=200,state=complete,chunks=null}={}){
 const p=createQwenSseUsageParser({binding:b,httpStatus:status});
 for(const chunk of chunks||[encoder.encode(text)])p.push(chunk);
 return p.finish(state);
}
function noAuthority(r){
 assert.equal(r.financialAuthority,false);assert.equal(r.dispatchAllowed,false);
 assert.equal(r.qualification,'NOT_ESTABLISHED');assert.equal(r.domainValidity,'NOT_EVALUATED');
 assert.equal(r.reservation,'HELD_PENDING_INDEPENDENT_FINANCIAL_PROOF');
 assert.equal(Object.hasOwn(r,'frames'),false);assert.equal(Object.hasOwn(r,'body'),false);
}
const decoded=()=>parseQwenStreamUsage({binding:binding(),httpStatus:200,...complete,frames:[...fixture.raw.frames,{kind:'done'}],done:true});

test('actual wire bytes reach the existing neutral usage owner with unchanged outcome',()=>{
 const r=parse(wire());assert.equal(r.usageState,'KNOWN');assert.deepEqual(r,decoded());noAuthority(r);
});

test('every single byte split preserves UTF-8, BOM, CRLF and final ordering',()=>{
 const parts=messages(),frame=JSON.parse(parts[0]);frame.choices[0].delta.content='合成🧭\r\ntext';parts[0]=JSON.stringify(frame);
 const bytes=encoder.encode('\ufeff: keepalive\r\n\r\n'+wire(parts,'\r\n'));
 const expected=parse('',{chunks:[bytes]});assert.equal(expected.usageState,'KNOWN');
 for(let i=0;i<=bytes.length;i++)assert.deepEqual(parse('',{chunks:[bytes.slice(0,i),bytes.slice(i)]}),expected,`split ${i}`);
 assert.deepEqual(parse('',{chunks:[...bytes].map(b=>Uint8Array.of(b))}),expected);
 for(const newline of ['\n','\r','\r\n'])assert.equal(parse(wire(parts,newline)).usageState,'KNOWN');
});

test('SSE joins data lines and ignores metadata without reconnecting or creating frames',()=>{
 const first=JSON.stringify(fixture.raw.frames[0],null,2).split('\n').map(s=>'data: '+s).join('\n');
 const text='id: synthetic\nretry: 0\nunknown: ignored\nevent: message\n'+first+'\n\n'+wire(messages().slice(1))+': trailing heartbeat\n\n';
 assert.deepEqual(parse(text),decoded());
 const r=parse('event: error\n'+wire());assert.equal(r.reason,'SSE_EVENT_UNSUPPORTED');noAuthority(r);
});

test('duplicate JSON keys, including escaped aliases and nested objects, cannot disappear',()=>{
 for(const duplicate of [
  '{"model":"x","model":"y"}',
  '{"model":"x","mo\\u0064el":"x"}',
  '{"usage":{"prompt_tokens":100,"prompt_tokens":100}}',
  '{"choices":[{"delta":{"content":"SYNTHETIC_SECRET","content":""}}]}',
  '{"__proto__":{},"\\u005f_proto__":{}}'
 ]){
  const r=parse(wire([duplicate,'[DONE]']));assert.equal(r.reason,'SSE_DUPLICATE_KEY');assert.equal(r.neutral,null);noAuthority(r);
  assert.equal(JSON.stringify(r).includes('SYNTHETIC_SECRET'),false);
 }
});

test('strict JSON refuses malformed values rather than repairing or echoing them',()=>{
 for(const json of ['{"a":1,}','[1,]','{"a":01}','{"a":NaN}','{"a":1e999}','{"a":true false}','{"a":"bad\\x"}','{"a":"raw\nline"}','{"a":}','{"a":1} trailing','"unterminated']){
  const r=parse(wire([json,'[DONE]']));assert.equal(r.usageState,'INVALID',json);assert.equal(r.reason,'SSE_JSON_INVALID');noAuthority(r);
 }
});

test('wire DONE is unique and terminal; JSON cannot forge the internal marker',()=>{
 for(const parts of [
  ['[DONE]',...messages()],
  [...messages(),'[DONE]'],
  [...messages(),messages()[0]],
  [...messages().slice(0,-1),'{"kind":"done"}'],
  [...messages().slice(0,2),'[DONE]',messages()[2]]
 ]){
  const r=parse(wire(parts));assert.equal(r.usageState,'INVALID');assert.equal(r.reason,'STREAM_FINAL_CONFLICT');noAuthority(r);
 }
 for(const text of [wire(messages().slice(0,-1)),wire().slice(0,-1),wire()+'data: {"unfinished":',wire().replace('data: [DONE]\n\n','data: [DONE]')]){
  const r=parse(text);assert.equal(r.usageState,'UNKNOWN');assert.equal(r.reason,'TRANSPORT_INCOMPLETE');noAuthority(r);
 }
});

test('invalid UTF-8 is rejected and incomplete trailing UTF-8 remains unknown',()=>{
 for(const bytes of [Uint8Array.of(0xc0,0xaf),Uint8Array.of(0xff),Uint8Array.of(0xed,0xa0,0x80)]){
  const r=parse('',{chunks:[bytes]});assert.equal(r.reason,'SSE_UTF8_INVALID');assert.equal(r.usageState,'INVALID');noAuthority(r);
 }
 const r=parse('',{chunks:[encoder.encode(wire()),Uint8Array.of(0xe4,0xb8)]});assert.equal(r.reason,'TRANSPORT_INCOMPLETE');assert.equal(r.usageState,'UNKNOWN');noAuthority(r);
});

test('wire, frame, JSON depth, key and UTF-8 string budgets independently stop decoding',()=>{
 const cases=[
  ['maxBytes',100,wire()],
  ['maxFrames',2,wire()],
  ['maxDepth',2,wire()],
  ['maxKeys',4,wire()],
  ['maxStringBytes',8,wire()],
  ['maxStringBytes',3,wire(['{"a":"汉汉"}','[DONE]'])],
  ['maxBytes',100,':'+ 'x'.repeat(100)+'\n\n'+wire()],
  ['maxBytes',100,'data: '+ 'x'.repeat(100)],
 ];
 for(const [key,n,text]of cases){const b=binding();b.limits[key]=n;const r=parse(text,{b});assert.equal(r.usageState,'UNKNOWN',key);assert.equal(r.reason,'TRANSPORT_BOUND');noAuthority(r);}
 const b=binding();b.limits.maxFrames=messages().length;assert.equal(parse(wire(),{b}).usageState,'KNOWN');
});

test('HTTP failure, incomplete HTTP and cancellation never expose final usage',()=>{
 for(const status of [201,401,429,500]){const r=parse(wire(),{status});assert.equal(r.usageState,'UNKNOWN');assert.equal(r.neutral,null);noAuthority(r);}
 for(const state of [{transportComplete:false,cancelled:false},{transportComplete:true,cancelled:true},{transportComplete:false,cancelled:true}]){
  const r=parse(wire(),{state});assert.equal(r.reason,'TRANSPORT_INCOMPLETE');assert.equal(r.neutral,null);noAuthority(r);
 }
 for(const state of [{},null,{transportComplete:true,cancelled:0},{...complete,done:true}])assert.equal(parse(wire(),{state}).usageState,'INVALID');
});

test('missing final usage, identity mismatch, cap overrun and finish reasons retain existing semantics',()=>{
 const parts=messages();parts.splice(2,1);assert.equal(parse(wire(parts)).reason,'FINAL_USAGE_MISSING');
 const switched=messages();const frame=JSON.parse(switched[1]);frame.model='other';switched[1]=JSON.stringify(frame);assert.equal(parse(wire(switched)).reason,'TRANSPORT_BINDING_MISMATCH');
 const b=binding();b.limits.billableOutputCap=1;const r=parse(wire(),{b});assert.equal(r.usageState,'KNOWN');assert.equal(r.overCap,true);assert.equal(r.neutral.completionTokens,decoded().neutral.completionTokens);noAuthority(r);
 for(const reason of ['stop','length','tool_calls']){const rows=messages();const f=JSON.parse(rows[1]);f.choices[0].finish_reason=reason;rows[1]=JSON.stringify(f);assert.equal(parse(wire(rows)).finishReason,reason);}
});

test('terminal failure is sticky, final reads are detached and no raw data escapes',()=>{
 const p=createQwenSseUsageParser({binding:binding(),httpStatus:200});
 assert.equal(p.push(encoder.encode(wire())),true);const r=p.finish(complete);assert.equal(r.usageState,'KNOWN');
 r.neutral.inputTokens=-1;assert.deepEqual(p.finish(complete),decoded());assert.equal(p.push(encoder.encode(wire())),false);
 const bad=createQwenSseUsageParser({binding:binding(),httpStatus:200});assert.equal(bad.push('SYNTHETIC_PRIVATE_TEXT'),false);assert.equal(bad.push(encoder.encode(wire())),false);
 const failure=bad.finish(complete);assert.equal(failure.reason,'SSE_CHUNK_INVALID');assert.equal(JSON.stringify(failure).includes('SYNTHETIC'),false);noAuthority(failure);
});

test('binding is snapshotted and accessors cannot become transport or financial authority',()=>{
 const b=binding(),p=createQwenSseUsageParser({binding:b,httpStatus:200});b.limits.maxFrames=1;p.push(encoder.encode(wire()));assert.equal(p.finish(complete).usageState,'KNOWN');
 const invalid=binding();invalid.verified=true;assert.equal(parse(wire(),{b:invalid}).reason,'BINDING_UNAVAILABLE');
 let reads=0;const o={httpStatus:200};Object.defineProperty(o,'binding',{enumerable:true,get(){reads++;throw Error('SYNTHETIC_SECRET');}});
 const r=createQwenSseUsageParser(o).finish(complete);assert.equal(reads,0);assert.equal(r.usageState,'INVALID');assert.equal(JSON.stringify(r).includes('SECRET'),false);noAuthority(r);
});

test('actual typed-array size is charged before decode without caller property access',()=>{
 let reads=0;const bytes=encoder.encode(wire());
 for(const key of ['byteLength','byteOffset','buffer'])Object.defineProperty(bytes,key,{get(){reads++;throw Error('SYNTHETIC_SECRET');}});
 const b=binding();b.limits.maxBytes=32;
 const p=createQwenSseUsageParser({binding:b,httpStatus:200});assert.equal(p.push(bytes),false);assert.equal(p.finish(complete).reason,'TRANSPORT_BOUND');assert.equal(reads,0);
 assert.equal(parse('',{chunks:[bytes]}).usageState,'KNOWN');assert.equal(reads,0);
 for(const invalid of [new Uint16Array(2),new DataView(new ArrayBuffer(2)),new Proxy(bytes,{}),new Uint8Array(new SharedArrayBuffer(2))]){
  const r=parse('',{chunks:[invalid]});assert.equal(r.reason,'SSE_CHUNK_INVALID');noAuthority(r);
 }
 const padded=new Uint8Array(encoder.encode(wire()).length+10);padded.set(encoder.encode(wire()),5);
 assert.equal(parse('',{chunks:[padded.subarray(5,padded.length-5)]}).usageState,'KNOWN');
});

test('synchronous finish reentry returns only a finite unavailable outcome',()=>{
 const p=createQwenSseUsageParser({binding:binding(),httpStatus:200});p.push(encoder.encode(wire()));
 const nested=[];const state=new Proxy({...complete},{getPrototypeOf(target){
  nested.push(p.finish(complete));assert.equal(p.push(encoder.encode(wire())),false);return Reflect.getPrototypeOf(target);
 }});
 const r=p.finish(state);assert.deepEqual(r,decoded());assert.ok(nested.length>0);
 for(const n of nested){assert.equal(n.usageState,'UNKNOWN');assert.equal(n.reason,'TRANSPORT_INCOMPLETE');noAuthority(n);}
 assert.deepEqual(p.finish(complete),r);
});
