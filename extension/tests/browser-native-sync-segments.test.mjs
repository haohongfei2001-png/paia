import test from 'node:test';
import assert from 'node:assert/strict';
import {sealOperation} from '../core/browser-native-sync/core.js';
import {packOperations,publishObjects,readSegmentDescriptor,protocolObject,readObject,SEGMENT_PROFILE} from '../core/browser-native-sync/segments.js';
import {bytes,decodeJSON,digest} from '../core/browser-native-sync/value.js';
const datasetId='dataset_segment_01',producer='device_segment_01';
async function operation(sequence,text='Synthetic body 中文 e\u0301\n'.repeat(10)){
 return sealOperation({protocol:1,datasetId,deviceId:producer,sequence,operationId:'synthetic_operation_'+sequence,type:'promptPreferences',entityId:'prompt-reuse:v1',codecVersion:1,kind:'put',actor:'user',parents:[],value:{id:'prompt-reuse:v1',version:1,pins:[],overrides:[{id:'manual:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',text,hidden:false}],splits:[]}});
}
const collect=async items=>{const result=[];for await(const item of items)result.push(item);return result;};
function cloud(){const objects=new Map(),writes=[];return {objects,writes,async putImmutable(ref,value){const previous=objects.get(ref.id);if(previous&&!Buffer.from(previous).equals(Buffer.from(value)))throw Error('collision');objects.set(ref.id,value.slice());writes.push(ref.kind);},async get(ref){const value=objects.get(ref.id);if(!value)throw Error('missing synthetic object');return value.slice();}};}
test('BNS stable packed objects preserve exact bodies with descriptor-last verified publication',async()=>{
 const ops=await Promise.all(Array.from({length:120},(_,i)=>operation(i+1))),first=await collect(packOperations(ops,{datasetId,producer,target:64*1024})),second=await collect(packOperations(ops,{datasetId,producer,target:64*1024}));
 assert.deepEqual(first.map(x=>x.ref),second.map(x=>x.ref));const transport=cloud(),refs=await publishObjects(first,transport);
 assert.ok(refs.length<ops.length);assert.equal(transport.writes.at(-1),'descriptor');
 const restored=[];for(const ref of refs)restored.push(...await readSegmentDescriptor(ref,r=>transport.get(r),{datasetId}));assert.deepEqual(restored,ops);
 assert.ok(first.every(x=>x.ref.encodedBytes<=SEGMENT_PROFILE.encoded));
});
test('BNS one large mixed-script operation chunks losslessly and partial chunks remain invisible',async()=>{
 const long=await operation(1,'中文🙂 exact line\n'.repeat(10000)),objects=await collect(packOperations([long],{datasetId,producer,target:64*1024}));
 assert.ok(objects.filter(x=>x.ref.kind==='chunk').length>1);
 const transport=cloud(),refs=await publishObjects(objects,transport);assert.deepEqual(await readSegmentDescriptor(refs[0],r=>transport.get(r),{datasetId}),[long]);
 const chunk=objects.find(x=>x.ref.kind==='chunk');transport.objects.delete(chunk.ref.id);await assert.rejects(readSegmentDescriptor(refs[0],r=>transport.get(r),{datasetId}));
});
test('BNS lost upload acknowledgement reuses immutable IDs and never publishes early',async()=>{
 const objects=await collect(packOperations([await operation(1)],{datasetId,producer})),transport=cloud(),original=transport.putImmutable.bind(transport);let first=true;
 transport.putImmutable=async(ref,value)=>{await original(ref,value);if(first){first=false;throw Error('synthetic lost acknowledgement');}};
 await assert.rejects(publishObjects(objects,transport));assert.ok(!transport.writes.includes('descriptor'));
 const refs=await publishObjects(objects,transport);assert.equal(refs.length,1);assert.equal(transport.objects.size,objects.length);
});
test('BNS tampering, unknown reader codec, wrong namespace and malformed trailing bytes are refused',async()=>{
 const objects=await collect(packOperations([await operation(1)],{datasetId,producer})),transport=cloud(),refs=await publishObjects(objects,transport),ref=refs[0];
 await assert.rejects(readSegmentDescriptor(ref,r=>transport.get(r),{datasetId,supported:{}}),{code:'BNS_REQUIRED_CODEC_UNSUPPORTED'});
 await assert.rejects(readSegmentDescriptor(ref,r=>transport.get(r),{datasetId:'another_dataset'}),{code:'BNS_DESCRIPTOR_INVALID'});
 const good=transport.objects.get(ref.id);transport.objects.set(ref.id,good.map((x,i)=>i===0?x^1:x));await assert.rejects(readSegmentDescriptor(ref,r=>transport.get(r),{datasetId}),{code:'BNS_OBJECT_INTEGRITY'});
 assert.throws(()=>decodeJSON(bytes('{"a":1} '),100),{code:'BNS_NONCANONICAL_ENCODING'});
});
test('BNS optional gzip has streaming declared-length and expansion limits',async()=>{
 const payload=bytes({body:'x'.repeat(200000)}),object=await protocolObject('checkpoint-shard',payload,{codec:'gzip'});
 assert.ok(object.bytes.length<1000);assert.deepEqual(await readObject(object.ref,async()=>object.bytes),payload);
 await assert.rejects(readObject({...object.ref,decodedBytes:100},async()=>object.bytes),{code:'BNS_EXPANSION_LIMIT'});
 await assert.rejects(readObject({...object.ref,codec:'brotli'},async()=>object.bytes),{code:'BNS_OBJECT_REF_INVALID'});
});
test('BNS malformed operation/count/coverage fails before any returned operation',async()=>{
 const objects=await collect(packOperations([await operation(1)],{datasetId,producer})),segment=objects.find(x=>x.ref.kind==='segment');
 const content=decodeJSON(segment.bytes,SEGMENT_PROFILE.decoded);content.entries[0].operation.value.overrides[0].text='tampered';
 const altered=await protocolObject('segment',bytes(content)),descriptorContent=decodeJSON(objects.at(-1).bytes,SEGMENT_PROFILE.decoded);descriptorContent.segment=altered.ref;
 const descriptor=await protocolObject('descriptor',bytes(descriptorContent)),transport=cloud();await transport.putImmutable(altered.ref,altered.bytes);await transport.putImmutable(descriptor.ref,descriptor.bytes);
 await assert.rejects(readSegmentDescriptor(descriptor.ref,r=>transport.get(r),{datasetId}),{code:'BNS_OPERATION_DIGEST'});
});
test('BNS aggregate reassembled bodies are bounded before any chunk allocation or download',async()=>{
 const long=await operation(1,'x'.repeat(190000)),objects=await collect(packOperations([long],{datasetId,producer,target:64*1024})),transport=cloud();
 const segment=decodeJSON(objects.find(x=>x.ref.kind==='segment').bytes,SEGMENT_PROFILE.decoded);
 segment.entries=Array.from({length:24},()=>structuredClone(segment.entries[0]));segment.count=24;
 const altered=await protocolObject('segment',bytes(segment)),descriptor=decodeJSON(objects.at(-1).bytes,SEGMENT_PROFILE.decoded);descriptor.segment=altered.ref;descriptor.count=24;
 const final=await protocolObject('descriptor',bytes(descriptor));await transport.putImmutable(altered.ref,altered.bytes);await transport.putImmutable(final.ref,final.bytes);
 let chunkReads=0;await assert.rejects(readSegmentDescriptor(final.ref,async ref=>{if(ref.kind==='chunk')chunkReads++;return transport.get(ref);},{datasetId}),{code:'BNS_SEGMENT_EXPANSION_LIMIT'});assert.equal(chunkReads,0);
});
test('BNS object encoding snapshots mutable byte buffers before hashing',async()=>{
 const data=bytes('synthetic immutable bytes'),original=crypto.subtle.digest.bind(crypto.subtle);let start,release;const entered=new Promise(resolve=>start=resolve),gate=new Promise(resolve=>release=resolve);
 crypto.subtle.digest=async(...args)=>{const result=await original(...args);start();await gate;return result;};let object;
 try{const result=protocolObject('chunk',data);await entered;data.fill(65);release();object=await result;}finally{release();crypto.subtle.digest=original;}
 assert.equal(await digest(object.bytes),object.ref.digest);assert.equal(new TextDecoder().decode(object.bytes),'synthetic immutable bytes');
});
