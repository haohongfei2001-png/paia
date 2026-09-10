import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {deflateRawSync} from 'node:zlib';

async function api(){
 const context={TextDecoder,Uint8Array,DataView,Blob,DecompressionStream,JSON,Set,Map};
 vm.runInNewContext(await readFile('development/export-probe/reader.js','utf8'),context);
 return context.PAIAExportProbe;
}
const fake=()=>[{id:'synthetic-conversation',conversation_id:'synthetic-conversation',title:'PRIVATE_TITLE',current_node:'node-user',mapping:{
 root:{id:'root',parent:null,children:['node-user'],message:null},
 'node-user':{id:'node-user',parent:'root',children:[],message:{id:'synthetic-user',author:{role:'user'},create_time:1609459200,content:{content_type:'text',parts:['PRIVATE_BODY 漢字 😀']}}},
 'node-assistant':{id:'node-assistant',parent:'node-user',children:[],message:{id:'synthetic-assistant',author:{role:'assistant'},content:{content_type:'text',parts:['PRIVATE_ASSISTANT']}}}
},PRIVATE_UNKNOWN_KEY:{email:'PRIVATE_ACCOUNT'}}];
const blob=v=>new Blob([typeof v==='string'?v:JSON.stringify(v)]);
function zip(bytes,{name='conversations.json',method=8,declaredSize=bytes.length,encrypted=false,corrupt=false}={}){
 const nameBytes=Buffer.from(name),payload=method===8?deflateRawSync(bytes):Buffer.from(bytes);
 let crc=0xffffffff;for(const b of bytes){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(encrypted?1:0,6);local.writeUInt16LE(method,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(payload.length,18);local.writeUInt32LE(declaredSize,22);local.writeUInt16LE(nameBytes.length,26);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(encrypted?1:0,8);central.writeUInt16LE(method,10);central.writeUInt32LE(corrupt?crc^1:crc,16);central.writeUInt32LE(payload.length,20);central.writeUInt32LE(declaredSize,24);central.writeUInt16LE(nameBytes.length,28);
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+nameBytes.length,12);end.writeUInt32LE(local.length+nameBytes.length+payload.length,16);
 return new Blob([local,nameBytes,payload,central,nameBytes,end]);
}
test('probe requires explicit per-file consent before any byte read',async()=>{
 const p=await api();let reads=0;await assert.rejects(p.sample({size:1,slice(){reads++;}},{}),{message:'CONSENT_REQUIRED'});assert.equal(reads,0);
});
test('synthetic schema summary exposes no bodies, titles, identifiers, times or unknown keys',async()=>{
 const p=await api(),r=await p.sample(blob(fake()),{consent:true});
 assert.equal(r.status,'STRUCTURE_SAMPLED');assert.equal(r.conversations,1);assert.equal(r.roles.user,1);assert.equal(r.roles.assistant,1);assert.equal(r.relations.parentFound,2);assert.equal(r.relations.currentFound,1);assert.equal(r.identities.messageMatchesNode,0);assert.equal(r.identities.messageDiffersNode,2);
 assert.equal(r.fields['$[].mapping.*.message.create_time'].number,1);
 const s=JSON.stringify(r);for(const value of ['PRIVATE','synthetic-conversation','node-user','synthetic-user','1609459200','漢字','email'])assert.ok(!s.includes(value));
 assert.ok(r.unknownFields>0);assert.equal(r.archiveValidated,false);
});
test('token boundaries, escapes and UTF-8 across tiny chunks retain structural results',async()=>{
 const p=await api(),a=await p.sample(blob(fake()),{consent:true,chunkSize:1}),b=await p.sample(blob(fake()),{consent:true});
 assert.equal(a.roles.user,b.roles.user);assert.equal(a.relations.parentFound,b.relations.parentFound);
});
test('arbitrarily long body is discarded with bounded token memory and sampled budget',async()=>{
 const p=await api(),f=fake();f[0].mapping['node-user'].message.content.parts=['x'.repeat(300000)];
 const r=await p.sample(blob(f),{consent:true});assert.ok(r.maxTokenBuffered<=258);assert.equal(r.roles.user,1);
 const limited=await p.sample(blob(f),{consent:true,maxBytes:10000});assert.equal(limited.status,'SAMPLE_LIMIT');assert.equal(limited.archiveValidated,false);
});
test('sample count and graph caps report a partial structural sample, never full validation',async()=>{
 const p=await api();assert.equal((await p.sample(blob([...fake(),...fake()]),{consent:true,maxConversations:1})).status,'SAMPLE_LIMIT');
 assert.equal((await p.sample(blob(fake()),{consent:true,maxNodes:1})).status,'SAMPLE_LIMIT');
});
for(const text of ['[{"id":1,}]','[1,]','[true false]','[01]','["bad\\q"]','[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[0]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]','[{"id":1,"id":2}]','[] trailing','["unterminated'])test('rejects malformed/deep/duplicate JSON without raw exception text: '+text.length,async()=>{
 const p=await api();await assert.rejects(p.sample(blob(text),{consent:true}),e=>['JSON_INVALID','JSON_DEPTH','JSON_DUPLICATE_KEY'].includes(e.message));
});
test('rejects invalid UTF-8 and reports unknown root as unsupported',async()=>{
 const p=await api();await assert.rejects(p.sample(new Blob([new Uint8Array([91,34,255,34,93])]),{consent:true}),{message:'UTF8_INVALID'});
 assert.equal((await p.sample(blob({other:'PRIVATE'}),{consent:true})).status,'UNSUPPORTED_STRUCTURE');
});
test('ZIP stored and deflated conversation entries use bounded reads and verify CRC',async()=>{
 const p=await api();for(const method of [0,8]){const r=await p.sample(zip(Buffer.from(JSON.stringify(fake())),{method}),{consent:true});assert.equal(r.roles.user,1);assert.equal(r.container,'zip');assert.equal(r.entryIntegrity,'verified');}
 await assert.rejects(p.sample(zip(Buffer.from('[]'),{corrupt:true}),{consent:true}),{message:'ZIP_INTEGRITY'});
});
test('ZIP encryption, over-limit ratio, paths and unsupported compression fail closed',async()=>{
 const p=await api();for(const [opts,code]of [[{encrypted:true},'ZIP_ENCRYPTED'],[{method:12},'ZIP_COMPRESSION'],[{declaredSize:0xffffffff},'ZIP64_UNSUPPORTED'],[{name:'../conversations.json'},'ZIP_NO_CONVERSATIONS']])await assert.rejects(p.sample(zip(Buffer.from('[]'),opts),{consent:true}),{message:code});
 await assert.rejects(p.sample(zip(Buffer.from(' '.repeat(100000))),{consent:true,maxRatio:2}),{message:'ZIP_RATIO'});
});
test('abort stops reading and restart is stateless',async()=>{
 const p=await api();let n=0;await assert.rejects(p.sample(blob(fake()),{consent:true,chunkSize:8,shouldStop:()=>++n>4}),{message:'CANCELLED'});
 assert.equal((await p.sample(blob(fake()),{consent:true})).roles.user,1);
});
test('private keys cannot impersonate nested schema paths or array positions',async()=>{
 const p=await api();const r=await p.sample(blob([{'mapping.*.message.author.role':'user','[]':{mapping:{fake:{message:{author:{role:'user'}}}}}}]),{consent:true});
 assert.equal(r.roles.user,0);assert.equal(r.fields['$[].mapping.*.message.author.role'],undefined);
});
