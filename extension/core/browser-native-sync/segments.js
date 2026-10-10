import {validateOperation} from './core.js';
import {validateCoverage} from './codecs.js';
import {bytes,clone,count,decodeJSON,digest,exact,fail,hash,opaque} from './value.js';

// Candidate only until the SYNC-01 scale experiment freezes a supported host
// profile. These are parser limits, never a claim about a cloud provider limit.
export const SEGMENT_PROFILE=Object.freeze({id:'bns1-candidate-256',encoded:1024*1024,decoded:4*1024*1024,operations:512,chunk:64*1024,target:256*1024,dependencies:4096,decodedConcurrency:1,operationBytes:4*1024*1024,decodedOperations:4*1024*1024});
const refFields=['id','kind','codec','encodedBytes','decodedBytes','digest'];
const formats=['chunk','segment','descriptor','checkpoint-shard','checkpoint-manifest'];
function validateRef(ref,profile){
 if(!exact(ref,refFields)||Object.keys(ref).length!==refFields.length||!hash(ref.id)||!hash(ref.digest)||ref.id!==ref.digest||!formats.includes(ref.kind)||!['identity','gzip'].includes(ref.codec)||!count(ref.encodedBytes)||ref.encodedBytes<1||ref.encodedBytes>profile.encoded||!count(ref.decodedBytes)||ref.decodedBytes<1||ref.decodedBytes>profile.decoded)fail('BNS_OBJECT_REF_INVALID');
 return ref;
}
// Pure original reference assertion; no immutable read or publication grant.
export function assertProtocolObjectReference(ref,profile=SEGMENT_PROFILE){validateRef(ref,profile);}

async function transform(data,kind,limit){
 const Stream=kind==='gzip'?globalThis.CompressionStream:globalThis.DecompressionStream;if(!Stream)fail('BNS_CODEC_UNSUPPORTED');
 const stream=new Blob([data]).stream().pipeThrough(new Stream('gzip')),reader=stream.getReader(),parts=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();fail('BNS_EXPANSION_LIMIT');}parts.push(value);}}
 catch(error){if(error.code?.startsWith('BNS_'))throw error;fail('BNS_COMPRESSION_INVALID');}
 const result=new Uint8Array(length);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;
}
export async function protocolObject(kind,data,{codec='identity',profile=SEGMENT_PROFILE}={}){
 if(!formats.includes(kind)||!(data instanceof Uint8Array)||data.length<1||data.length>profile.decoded)fail('BNS_OBJECT_LIMIT');
 data=data.slice();
 const encoded=codec==='identity'?data:codec==='gzip'?await transform(data,'gzip',profile.encoded):fail('BNS_CODEC_UNSUPPORTED');
 if(encoded.length>profile.encoded)fail('BNS_OBJECT_LIMIT');const checksum=await digest(encoded);
 return {ref:{id:checksum,kind,codec,encodedBytes:encoded.length,decodedBytes:data.length,digest:checksum},bytes:encoded};
}
export async function readObject(ref,get,{profile=SEGMENT_PROFILE}={}){
 ref=clone(ref);validateRef(ref,profile);const supplied=await get(clone(ref));const input=supplied instanceof Uint8Array?supplied.slice():supplied;
 if(!(input instanceof Uint8Array)||input.length!==ref.encodedBytes||input.length>profile.encoded||await digest(input)!==ref.digest)fail('BNS_OBJECT_INTEGRITY');
 const decoded=ref.codec==='identity'?input:await transform(input,'gunzip',Math.min(profile.decoded,ref.decodedBytes));
 if(decoded.length!==ref.decodedBytes)fail('BNS_OBJECT_INTEGRITY');return decoded;
}
const coverage=operations=>{const families=new Map();for(const operation of operations){const family=families.get(operation.type)||{type:operation.type,version:operation.codecVersion,count:0};family.count++;families.set(operation.type,family);}return [...families.values()].sort((a,b)=>a.type.localeCompare(b.type));};
const rangeSummary=operations=>{const devices=new Map();for(const o of operations){const ranges=devices.get(o.deviceId)||[];ranges.push(o.sequence);devices.set(o.deviceId,ranges);}return [...devices].sort().map(([deviceId,numbers])=>{numbers.sort((a,b)=>a-b);const ranges=[];for(const n of numbers){const last=ranges.at(-1);if(last&&n===last[1]+1)last[1]=n;else if(!last||n!==last[1])ranges.push([n,n]);}return {deviceId,ranges};});};

// Bounded streaming packer. A normal Input is packed with neighbors; only a
// logical operation larger than the packing budget uses content-addressed chunks.
// Objects and final descriptors are deterministic for an unchanged committed cut.
export async function* packOperations(operations,{datasetId,producer,target=SEGMENT_PROFILE.target,profile=SEGMENT_PROFILE}={}){
 if(!opaque(datasetId)||!opaque(producer)||![64,256,1024].map(x=>x*1024).includes(target)||target>profile.encoded)fail('BNS_PROFILE_INVALID');
 let entries=[],batch=[],dependencies=[],entryBytes=0,operationBytes=0;
 const finish=async()=>{
  const payload={magic:'PAIA-BNS',protocol:1,kind:'segment',datasetId,producer,clientEncryption:'none',coverage:coverage(batch),ranges:rangeSummary(batch),count:batch.length,entries};
  const segment=await protocolObject('segment',bytes(payload),{profile});
  const descriptor=await protocolObject('descriptor',bytes({magic:'PAIA-BNS',protocol:1,kind:'descriptor',datasetId,segment:segment.ref,dependencies,count:batch.length,coverage:payload.coverage}),{profile});
  const result=[segment,descriptor];entries=[];batch=[];dependencies=[];entryBytes=0;operationBytes=0;return result;
 };
 for await(const candidate of operations){
  const operation=clone(await validateOperation(candidate));if(operation.datasetId!==datasetId)fail('BNS_DATASET_MISMATCH');
  const encoded=bytes(operation);if(encoded.length>profile.operationBytes)fail('BNS_OPERATION_RESOURCE_LIMIT');
  let entry={kind:'inline',operation},chunks=[];
  if(encoded.length>Math.min(target-4096,profile.decoded-4096)){
   const refs=[];for(let offset=0;offset<encoded.length;offset+=profile.chunk){const object=await protocolObject('chunk',encoded.slice(offset,offset+profile.chunk),{profile});refs.push(object.ref);chunks.push(object);}
   entry={kind:'chunked',revisionId:operation.revisionId,bytes:encoded.length,digest:await digest(encoded),chunks:refs};
  }
  const size=bytes(entry).length;
  if(entries.length&&(entryBytes+size+4096>target||batch.length>=profile.operations||dependencies.length+chunks.length>profile.dependencies||operationBytes+encoded.length>profile.decodedOperations))for(const object of await finish())yield object;
  if(size+4096>profile.encoded||chunks.length>profile.dependencies)fail('BNS_DESCRIPTOR_LIMIT');
  for(const chunk of chunks)yield chunk;
  entries.push(entry);batch.push(operation);dependencies.push(...chunks.map(x=>x.ref));entryBytes+=size;operationBytes+=encoded.length;
 }
 if(entries.length)for(const object of await finish())yield object;
}

export async function readSegmentDescriptor(ref,get,{datasetId,profile=SEGMENT_PROFILE,supported}={}){
 if(ref?.kind!=='descriptor')fail('BNS_DESCRIPTOR_INVALID');
 const descriptor=decodeJSON(await readObject(ref,get,{profile}),profile.decoded);
 if(!exact(descriptor,['magic','protocol','kind','datasetId','segment','dependencies','count','coverage'])||descriptor.magic!=='PAIA-BNS'||descriptor.protocol!==1||descriptor.kind!=='descriptor'||descriptor.datasetId!==datasetId||!Array.isArray(descriptor.dependencies)||descriptor.dependencies.length>profile.dependencies||!count(descriptor.count)||descriptor.count<1||descriptor.count>profile.operations)fail('BNS_DESCRIPTOR_INVALID');
 validateCoverage(descriptor.coverage,supported);validateRef(descriptor.segment,profile);if(descriptor.segment.kind!=='segment')fail('BNS_DESCRIPTOR_INVALID');
 const dependencyIds=new Set();for(const dep of descriptor.dependencies){validateRef(dep,profile);if(dep.kind!=='chunk')fail('BNS_DESCRIPTOR_INVALID');dependencyIds.add(dep.id);}
 const segment=decodeJSON(await readObject(descriptor.segment,get,{profile}),profile.decoded);
 if(!exact(segment,['magic','protocol','kind','datasetId','producer','clientEncryption','coverage','ranges','count','entries'])||segment.magic!=='PAIA-BNS'||segment.protocol!==1||segment.kind!=='segment'||segment.datasetId!==datasetId||!opaque(segment.producer)||segment.clientEncryption!=='none'||segment.count!==descriptor.count||!Array.isArray(segment.entries)||segment.entries.length!==segment.count)fail('BNS_SEGMENT_INVALID');
 let decodedTotal=0;for(const entry of segment.entries){const length=entry?.kind==='inline'?bytes(entry.operation).length:entry?.kind==='chunked'&&count(entry.bytes)?entry.bytes:Infinity;decodedTotal+=length;if(decodedTotal>profile.decodedOperations)fail('BNS_SEGMENT_EXPANSION_LIMIT');}
 const operations=[],used=new Set();
 for(const entry of segment.entries){
  let operation;
  if(entry.kind==='inline'&&exact(entry,['kind','operation']))operation=entry.operation;
  else if(entry.kind==='chunked'&&exact(entry,['kind','revisionId','bytes','digest','chunks'])&&hash(entry.revisionId)&&hash(entry.digest)&&count(entry.bytes)&&entry.bytes>0&&entry.bytes<=profile.operationBytes&&Array.isArray(entry.chunks)&&entry.chunks.length>0&&entry.chunks.length<=profile.dependencies){
   // Allocate only after validating every declared length and the total. Read
   // one chunk at a time; incomplete objects never reach Core/materialization.
   let expected=0;for(const chunk of entry.chunks){validateRef(chunk,profile);if(chunk.kind!=='chunk'||!dependencyIds.has(chunk.id))fail('BNS_DEPENDENCY_MISSING');expected+=chunk.decodedBytes;used.add(chunk.id);}if(expected!==entry.bytes)fail('BNS_CHUNK_LENGTH');
   const combined=new Uint8Array(expected);let offset=0;for(const chunk of entry.chunks){const data=await readObject(chunk,get,{profile});combined.set(data,offset);offset+=data.length;}
   if(await digest(combined)!==entry.digest)fail('BNS_CHUNK_INTEGRITY');operation=decodeJSON(combined,profile.operationBytes);if(operation.revisionId!==entry.revisionId)fail('BNS_CHUNK_INTEGRITY');
  }else fail('BNS_SEGMENT_INVALID');
  await validateOperation(operation);if(operation.datasetId!==datasetId)fail('BNS_DATASET_MISMATCH');operations.push(operation);
 }
 if(dependencyIds.size!==used.size||bytes(coverage(operations)).toString()!==bytes(descriptor.coverage).toString()||bytes(coverage(operations)).toString()!==bytes(segment.coverage).toString()||bytes(rangeSummary(operations)).toString()!==bytes(segment.ranges).toString())fail('BNS_SEGMENT_INVENTORY');
 if(new Set(operations.map(x=>x.operationId)).size!==operations.length)fail('BNS_SEGMENT_DUPLICATE');
 return operations;
}

// Transport-neutral publication test seam. Adapter must contain references in
// its authorized namespace. A descriptor is put only after every dependency
// has been verified by exact read-back; timeouts reuse these same identities.
export async function publishObjects(objects,transport,{profile=SEGMENT_PROFILE}={}){
 const verified=new Set(),published=[];
 for await(const supplied of objects){
  const object={ref:clone(supplied.ref),bytes:supplied.bytes.slice()};
  validateRef(object.ref,profile);
  if(object.ref.kind==='descriptor'){
   const descriptor=decodeJSON(object.bytes,profile.decoded);
   if(!verified.has(descriptor.segment.id)||descriptor.dependencies.some(ref=>!verified.has(ref.id)))fail('BNS_PUBLICATION_INCOMPLETE');
  }
  await transport.putImmutable(object.ref,object.bytes);
  await readObject(object.ref,ref=>transport.get(ref),{profile});verified.add(object.ref.id);
  if(object.ref.kind==='descriptor')published.push(clone(object.ref));
 }
 return published;
}
