import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectFile,fingerprintFile} from '../core/import/reader.js';
import {JsonTokens} from '../core/import/json-tokens.js';
import {zip} from './fixtures/import-zip.mjs';
const read=async(text,options={})=>inspectFile(new Blob([text]),{consent:true,...options});
test('import file grant gates every read and content fingerprint',async()=>{
 let reads=0;const f={size:12,slice(){reads++;throw Error('PRIVATE');}};
 await assert.rejects(inspectFile(f),{code:'CONSENT_REQUIRED'});
 await assert.rejects(fingerprintFile(f),{code:'CONSENT_REQUIRED'});assert.equal(reads,0);
});
test('full content fingerprint ignores names and detects a changed middle chunk',async()=>{
 const a=new Blob(['a'.repeat(180000)]),b=new Blob(['a'.repeat(90000)+'b'+'a'.repeat(89999)]);
 assert.equal(await fingerprintFile(a,{consent:true}),await fingerprintFile(a,{consent:true}));
 assert.notEqual(await fingerprintFile(a,{consent:true}),await fingerprintFile(b,{consent:true}));
});
test('generic tokenizer retains selected scalars exactly across UTF-8 boundaries',async()=>{
 const events=[];await read('[{"body":" 漢字 😀 \\n ","skip":"PRIVATE"}]',{limits:{chunkBytes:1},selectString:p=>p.at(-1)==='body',onEvent:e=>events.push(e)});
 assert.equal(events.find(e=>e.path.at(-1)==='body').value,' 漢字 😀 \n ');
 assert.equal(events.find(e=>e.path.at(-1)==='skip').value,null);
});
for(const bad of ['[1,]','{"a":1,"a":2}','{"a":1,}','[01]','[1e999]','["bad\\q"]','[] trailing'])test('stream rejects malformed or ambiguous JSON '+bad.length,async()=>{await assert.rejects(read(bad));});
test('stream rejects bad UTF-8 and resource overruns without raw exceptions',async()=>{
 await assert.rejects(read(new Uint8Array([91,34,255,34,93])),{code:'UTF8_INVALID'});
 await assert.rejects(read('["'+'x'.repeat(500)+'"]',{selectString:()=>true,limits:{stringChars:32}}),{code:'JSON_STRING_LIMIT'});
 await assert.rejects(read('[[[0]]]',{limits:{depth:2}}),{code:'JSON_DEPTH'});
});
test('very long skipped body and many array members do not accumulate conversation JSON',async()=>{
 let values=0;const r=await read('[{"body":"'+'x'.repeat(300000)+'"},'+Array(10000).fill('0').join(',')+']',{onEvent:e=>{if(e.kind==='value')values++;}});
 assert.ok(values>10000);assert.ok(r.maxBufferedChars<512);assert.equal(r.integrityVerified,true);assert.equal(r.schemaVerified,false);
});
test('ZIP validates every candidate including a corrupt later shard before acceptance',async()=>{
 const f=zip([{name:'conversations.json',text:'[]'},{name:'conversations-2.json',text:'[]',corrupt:true}]);
 await assert.rejects(inspectFile(f,{consent:true}),{code:'ZIP_INTEGRITY'});
});
test('ZIP resource/path/encryption/local-header guards',async()=>{
 for(const [entry,code] of [[{name:'../conversations.json',text:'[]'},'ZIP_PATH'],[{name:'conversations.json',text:'[]',encrypted:true},'ZIP_ENCRYPTED'],[{name:'conversations.json',text:'[]',localMismatch:true},'ZIP_INVALID']])await assert.rejects(inspectFile(zip([entry]),{consent:true}),{code});
 await assert.rejects(inspectFile(zip([{name:'conversations.json',text:'[]'},{name:'conversations.json',text:'[]'}]),{consent:true}),{code:'ZIP_DUPLICATE_ENTRY'});
});
test('stored and deflate candidates pass CRC and unknown assets are not decoded',async()=>{
 const r=await inspectFile(zip([{name:'conversations.json',text:'[]'},{name:'conversations-2.json',text:'[]',stored:true},{name:'account.json',text:'NOT JSON'}]),{consent:true});
 assert.equal(r.candidateEntries,2);assert.equal(r.integrityVerified,true);assert.equal(r.schemaVerified,false);
});
test('backpressure awaits consumer and abort halts subsequent file reads',async()=>{
 const control=new AbortController();let n=0;
 await assert.rejects(read('[1,2,3]',{signal:control.signal,onEvent:async()=>{n++;control.abort();}}),{code:'CANCELLED'});assert.equal(n,1);
});
test('signed and unsigned ZIP descriptors are checked and truncated metadata stays a fixed error',async()=>{
 for(const descriptor of ['signed','unsigned'])assert.equal((await inspectFile(zip([{name:'conversations.json',text:'[]',descriptor}]),{consent:true})).integrityVerified,true);
 const b=new Uint8Array(await zip([{name:'conversations.json',text:'[]',descriptor:'signed'}]).arrayBuffer());const sig=b.findIndex((v,i)=>v===80&&b[i+1]===75&&b[i+2]===7&&b[i+3]===8);b[sig+4]^=1;await assert.rejects(inspectFile(new Blob([b]),{consent:true}),{code:'ZIP_INTEGRITY'});
 await assert.rejects(inspectFile(new Blob([b.slice(0,20)]),{consent:true}),{code:'ZIP_INVALID'});
});
test('reader applies decompression, candidate, total, and key limits and rejects raising ceilings',async()=>{
 const f=zip([{name:'conversations.json',text:'["'+'x'.repeat(20000)+'"]'}]);await assert.rejects(inspectFile(f,{consent:true,limits:{ratio:2}}),{code:'ZIP_RATIO'});
 const two=zip([{name:'conversations.json',text:'[0]'},{name:'conversations-2.json',text:'[0]'}]);await assert.rejects(inspectFile(two,{consent:true,limits:{candidates:1}}),{code:'RESOURCE_LIMIT'});await assert.rejects(inspectFile(two,{consent:true,limits:{totalBytes:5}}),{code:'RESOURCE_LIMIT'});
 await assert.rejects(read('{"a":0,"b":0}',{limits:{keys:1}}),{code:'JSON_KEY_LIMIT'});await assert.rejects(read('[]',{limits:{depth:999}}),{code:'RESOURCE_LIMIT'});
});
test('reader rejects multidisk and ZIP64 sentinels before any JSON consumer',async()=>{
 for(const kind of ['disk','zip64']){const b=new Uint8Array(await zip([{name:'conversations.json',text:'[]'}]).arrayBuffer()),d=new DataView(b.buffer),at=b.length-22;if(kind==='disk')d.setUint16(at+4,1,true);else{d.setUint16(at+8,65535,true);d.setUint16(at+10,65535,true);}await assert.rejects(inspectFile(new Blob([b]),{consent:true}),{code:kind==='disk'?'ZIP_MULTIDISK':'ZIP64_UNSUPPORTED'});}
});
