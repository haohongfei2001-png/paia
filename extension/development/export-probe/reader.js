// Development-only structural probe. No archive writes; no schema acceptance claim.
(() => {
 'use strict';
 const stop=code=>{throw new Error(code);};
 const defaults={chunkSize:65536,maxBytes:16*1024*1024,maxConversations:3,maxNodes:4096,maxRatio:200,maxDepth:32};
 const decode=bytes=>{try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{stop('UTF8_INVALID');}};
 async function read(file,start,size){
  if(start<0||size<0||start+size>file.size||size>65557)stop('ZIP_INVALID');
  return new Uint8Array(await file.slice(start,start+size).arrayBuffer());
 }
 const u16=(b,n)=>new DataView(b.buffer,b.byteOffset,b.byteLength).getUint16(n,true);
 const u32=(b,n)=>new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(n,true);
 function crcNext(crc,bytes){for(const byte of bytes){crc^=byte;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return crc;}
 async function zipEntry(file,o){
  const tail=await read(file,Math.max(0,file.size-65557),Math.min(65557,file.size));let end=-1;
  for(let i=tail.length-22;i>=0;i--)if(u32(tail,i)===0x06054b50&&i+22+u16(tail,i+20)===tail.length){end=i;break;}
  if(end<0)stop('ZIP_INVALID');
  if(u16(tail,end+4)||u16(tail,end+6)||u16(tail,end+8)!==u16(tail,end+10))stop('ZIP_MULTIDISK');
  const count=u16(tail,end+10),size=u32(tail,end+12),offset=u32(tail,end+16);
  if(count===65535||size===0xffffffff||offset===0xffffffff)stop('ZIP64_UNSUPPORTED');
  if(size>32*1024*1024||offset+size>file.size-tail.length+end)stop('ZIP_INVALID');
  let cursor=offset,selected=null,candidates=0;
  for(let i=0;i<count;i++){
   if(o.shouldStop?.())stop('CANCELLED');
   const h=await read(file,cursor,46);if(u32(h,0)!==0x02014b50)stop('ZIP_INVALID');
   const nameLength=u16(h,28),extra=u16(h,30),comment=u16(h,32);
   if(cursor+46+nameLength+extra+comment>offset+size)stop('ZIP_INVALID');
   // Do not decode arbitrary asset names, which can contain private information.
   const name=nameLength<=128?decode(await read(file,cursor+46,nameLength)):'';
   if(/^conversations(?:[-_]?\d+)?\.json$/.test(name)){
    candidates++;
    if(!selected)selected={flags:u16(h,8),method:u16(h,10),crc:u32(h,16),compressed:u32(h,20),size:u32(h,24),offset:u32(h,42),name};
   }
   cursor+=46+nameLength+extra+comment;
  }
  if(cursor!==offset+size)stop('ZIP_INVALID');if(!selected)stop('ZIP_NO_CONVERSATIONS');
  const e=selected;
  if([e.size,e.compressed,e.offset].includes(0xffffffff))stop('ZIP64_UNSUPPORTED');
  if(e.flags&1)stop('ZIP_ENCRYPTED');if(e.flags&~(8|2048|2|4))stop('ZIP_FLAGS');
  if(![0,8].includes(e.method))stop('ZIP_COMPRESSION');
  if(e.size>Math.max(1,e.compressed)*o.maxRatio)stop('ZIP_RATIO');
  const h=await read(file,e.offset,30);
  if(u32(h,0)!==0x04034b50||u16(h,6)!==e.flags||u16(h,8)!==e.method||u16(h,26)>128)stop('ZIP_INVALID');
  if(decode(await read(file,e.offset+30,u16(h,26)))!==e.name)stop('ZIP_INVALID');
  const start=e.offset+30+u16(h,26)+u16(h,28);
  if(start+e.compressed>offset)stop('ZIP_INVALID');
  return {start,length:e.compressed,method:e.method,size:e.size,crc:e.crc,candidates};
 }
 async function* chunks(file,start,length,o){
  for(let pos=start;pos<start+length;pos+=o.chunkSize){
   if(o.shouldStop?.())stop('CANCELLED');
   yield await read(file,pos,Math.min(o.chunkSize,start+length-pos));
  }
 }
 async function* inflate(file,e,o){
  if(e.method===0){yield* chunks(file,e.start,e.length,o);return;}
  // Blob.stream + native transform provides backpressure. No whole-entry decode.
  let reader;try{reader=file.slice(e.start,e.start+e.length).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();}catch{stop('ZIP_COMPRESSION');}
  try{while(true){if(o.shouldStop?.())stop('CANCELLED');let item;try{item=await reader.read();}catch{stop('ZIP_INTEGRITY');}if(item.done)break;
    // Browser transform chunks are bounded internally; subdivide callback work.
    for(let at=0;at<item.value.length;at+=o.chunkSize)yield item.value.subarray(at,at+o.chunkSize);
  }}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 }
 class JsonStream {
  constructor(emit,o){this.emit=emit;this.o=o;this.stack=[];this.root=false;this.mode=null;this.token='';this.overflow=false;this.escape=false;this.unicode=0;this.maxTokenBuffered=0;}
  parent(){return this.stack.at(-1);}
  path(){const p=this.parent();return p?[...p.path,p.kind==='array'?null:p.key]:[];}
  value(type,value=null){
   const p=this.parent();if(p){if(!['value','valueOrEnd'].includes(p.state))stop('JSON_INVALID');p.state='commaOrEnd';}else{if(this.root)stop('JSON_INVALID');this.root=true;}
   this.emit('value',this.path(),type,value);
  }
  punctuation(c){
   const p=this.parent();
   if(c==='{'||c==='['){const path=this.path();this.value(c==='{'?'object':'array');if(this.stack.length>=this.o.maxDepth)stop('JSON_DEPTH');this.stack.push({path,kind:c==='{'?'object':'array',state:c==='{'?'keyOrEnd':'valueOrEnd',keys:new Set(),key:null});}
   else if(c==='}'||c===']'){
    if(!p||p.kind!==(c==='}'?'object':'array')||!['commaOrEnd',c==='}'?'keyOrEnd':'valueOrEnd'].includes(p.state))stop('JSON_INVALID');
    this.stack.pop();this.emit('end',p.path,p.kind);
   }else if(c===':'){if(p?.state!=='colon')stop('JSON_INVALID');p.state='value';}
   else if(c===','){if(p?.state!=='commaOrEnd')stop('JSON_INVALID');p.state=p.kind==='object'?'key':'value';}
   else stop('JSON_INVALID');
  }
  buffer(c){if(this.token.length<258)this.token+=c;else this.overflow=true;this.maxTokenBuffered=Math.max(this.maxTokenBuffered,this.token.length);}
  stringDone(){
   const p=this.parent();let value=null;
   if(!this.overflow){try{value=JSON.parse(this.token);}catch{stop('JSON_INVALID');}}
   if(p?.kind==='object'&&['key','keyOrEnd'].includes(p.state)){
    if(this.overflow)stop('JSON_KEY_LIMIT');if(p.keys.has(value))stop('JSON_DUPLICATE_KEY');if(p.keys.size>=8192)stop('SAMPLE_LIMIT');p.keys.add(value);p.key=value;p.state='colon';
   }else this.value('string',value);
   this.mode=null;this.token='';
  }
  primitiveDone(){
   const t=this.token;
   if(t==='true'||t==='false')this.value('boolean',t==='true');else if(t==='null')this.value('null');
   else if(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(t))this.value('number',Number(t));else stop('JSON_INVALID');
   this.mode=null;this.token='';
  }
  feed(text){for(const c of text){
   if(this.mode==='string'){
    this.buffer(c);
    if(this.unicode){if(!/[a-fA-F0-9]/.test(c))stop('JSON_INVALID');this.unicode--;continue;}
    if(this.escape){this.escape=false;if(c==='u')this.unicode=4;else if(!'"\\/bfnrt'.includes(c))stop('JSON_INVALID');continue;}
    if(c==='\\'){this.escape=true;continue;}if(c==='"'){this.stringDone();continue;}if(c.charCodeAt(0)<32)stop('JSON_INVALID');continue;
   }
   if(this.mode==='primitive'){
    if(!/[\s\[\]{},:]/.test(c)){if(this.token.length>=64)stop('JSON_INVALID');this.token+=c;continue;}
    this.primitiveDone();
   }
   if(' \r\n\t'.includes(c))continue;
   if(c==='"'){this.mode='string';this.token='"';this.overflow=false;this.escape=false;this.unicode=0;}
   else if('[{}],:'.includes(c))this.punctuation(c);
   else{this.mode='primitive';this.token=c;}
  }}
  finish(){if(this.mode==='primitive')this.primitiveDone();if(this.mode||this.stack.length||!this.root)stop('JSON_INVALID');}
 }
 const fields=new Set(['$','$[]',...['id','conversation_id','title','create_time','update_time','current_node','mapping'].map(k=>'$[].'+k),'$[].mapping.*',...['id','parent','children','children[]','message'].map(k=>'$[].mapping.*.'+k),...['id','create_time','update_time','status','end_turn','author','author.role','content','content.content_type','content.parts','content.parts[]'].map(k=>'$[].mapping.*.message.'+k)]);
 function safePath(path){
  if(path.some((key,i)=>key!==null&&!(i===2&&path[1]==='mapping')&&!/^[a-z_]+$/.test(key)))return '__unknown__';
  return '$'+path.map((key,i)=>key===null?'[]':i===2&&path[1]==='mapping'?'.*':'.'+key).join('');
 }
 const identity=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(v);
 function observer(report,o){
  let nodes=new Map(),node=null,current=null,convId=null,alias=null;
  return (event,path,type,value)=>{
   const p=safePath(path);
   if(event==='value'){
    if(!path.length)report.rootType=type;
    if(fields.has(p)){const row=report.fields[p]??={};row[type]=(row[type]||0)+1;}else report.unknownFields++;
    if(path.length===1&&path[0]===null&&type==='object'){nodes=new Map();current=null;convId=null;alias=null;}
    if(p==='$[].id')convId=value;
    if(p==='$[].conversation_id')alias=value;
    if(p==='$[].current_node')current=value;
    if(p==='$[].mapping.*'&&type==='object'){
     if(nodes.size>=o.maxNodes)stop('SAMPLE_LIMIT');node={key:path[2],id:null,messageId:null,parent:null,role:'other',hasMessage:false};nodes.set(path[2],node);
    }
    if(node&&p.startsWith('$[].mapping.*.')){
     if(p==='$[].mapping.*.id')node.id=value;
     if(p==='$[].mapping.*.parent')node.parent=value;
     if(p==='$[].mapping.*.message'&&type==='object')node.hasMessage=true;
     if(p==='$[].mapping.*.message.id')node.messageId=value;
     if(p==='$[].mapping.*.message.author.role')node.role=['user','assistant','system','tool'].includes(value)?value:'other';
     if(p==='$[].mapping.*.message.create_time')node.timeType=type;
     if(p==='$[].mapping.*.message.content.content_type')node.contentType=value==='text'?'text':'other';
    }
   }
   if(event==='end'&&p==='$[].mapping.*')node=null;
   if(event==='end'&&p==='$[]'&&type==='object'){
    report.conversations++;
    report.identities.conversationValid+=identity(convId)||identity(alias)?1:0;
    if(convId!==null&&alias!==null)report.identities[convId===alias?'conversationAliasesAgree':'conversationAliasesDiffer']++;
    if(current!==null)report.relations[nodes.has(current)?'currentFound':'currentMissing']++;
    for(const n of nodes.values()){
     report.nodes++;report.identities[n.id===n.key?'nodeMatchesKey':'nodeDiffersKey']++;
     if(n.parent!==null)report.relations[nodes.has(n.parent)?'parentFound':'parentMissing']++;
     if(!n.hasMessage)continue;report.roles[n.role]++;
     report.identities[identity(n.messageId)?'messageValid':'messageInvalid']++;
     report.identities[n.messageId===n.id?'messageMatchesNode':'messageDiffersNode']++;
     if(n.role==='user'){report.userContent[n.contentType||'missing']++;report.userCreateTime[n.timeType==='number'?'number':n.timeType==='null'?'null':'other']++;}
    }
    nodes.clear();if(report.conversations>=o.maxConversations)stop('SAMPLE_LIMIT');
   }
  };
 }
 async function sample(file,options={}){
  if(options.consent!==true)stop('CONSENT_REQUIRED');
  const o={...defaults,...options};for(const k of Object.keys(defaults))if(!Number.isSafeInteger(o[k])||o[k]<1||o[k]>defaults[k])stop('INVALID_OPTIONS');
  if(!Number.isSafeInteger(file?.size)||file.size<1)stop('FILE_INVALID');
  if(o.shouldStop?.())stop('CANCELLED');
  const head=await read(file,0,Math.min(4,file.size)),isZip=head.length===4&&u32(head,0)===0x04034b50;
  const e=isZip?await zipEntry(file,o):null;
  const r={format:'paia-export-structure-probe-v1',status:'STRUCTURE_SAMPLED',archiveValidated:false,container:isZip?'zip':'json',candidateEntries:e?.candidates||1,entryIntegrity:'not_checked',rootType:null,conversations:0,nodes:0,roles:{user:0,assistant:0,system:0,tool:0,other:0},identities:{conversationValid:0,conversationAliasesAgree:0,conversationAliasesDiffer:0,nodeMatchesKey:0,nodeDiffersKey:0,messageValid:0,messageInvalid:0,messageMatchesNode:0,messageDiffersNode:0},relations:{currentFound:0,currentMissing:0,parentFound:0,parentMissing:0},userContent:{text:0,other:0,missing:0},userCreateTime:{number:0,null:0,other:0},fields:{},unknownFields:0,maxTokenBuffered:0};
  const parser=new JsonStream(observer(r,o),o),decoder=new TextDecoder('utf-8',{fatal:true});let bytes=0,crc=0xffffffff;
  const stream=e?inflate(file,e,o):chunks(file,0,file.size,o);
  try{
   for await(const chunk of stream){
    if(o.shouldStop?.())stop('CANCELLED');bytes+=chunk.length;if(bytes>o.maxBytes)stop('SAMPLE_LIMIT');
    if(e){if(bytes>e.size)stop('ZIP_INTEGRITY');if(bytes>Math.max(1,e.length)*o.maxRatio)stop('ZIP_RATIO');crc=crcNext(crc,chunk);}
    let text;try{text=decoder.decode(chunk,{stream:true});}catch{stop('UTF8_INVALID');}parser.feed(text);
    o.onProgress?.();
   }
   let rest;try{rest=decoder.decode();}catch{stop('UTF8_INVALID');}parser.feed(rest);parser.finish();
   if(e){if(bytes!==e.size||((crc^0xffffffff)>>>0)!==e.crc)stop('ZIP_INTEGRITY');r.entryIntegrity='verified';}
  }catch(error){if(error.message==='SAMPLE_LIMIT')r.status='SAMPLE_LIMIT';else throw error;}
  r.maxTokenBuffered=parser.maxTokenBuffered;
  if(r.status!=='SAMPLE_LIMIT'&&(r.rootType!=='array'||!r.conversations))r.status='UNSUPPORTED_STRUCTURE';
  return r;
 }
 globalThis.PAIAExportProbe=Object.freeze({sample});
})();
