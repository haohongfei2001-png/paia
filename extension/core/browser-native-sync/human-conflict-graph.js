// Pure supplied-byte structure evidence. No store, reader, transaction or restore cap.
import {CORE_LIMITS,validateHumanCommitGroup} from './core.js';
import {restoreHumanRequest} from './human-library-request.js';
import {ENTRY_FIELDS,keys,revisionOK,validateFields} from '../thought-model.js';
import {canonical,digest,equal,fail,opaque} from './value.js';

const MiB=1024*1024,RETAINED=4*MiB,AGGREGATE=8*MiB,MAX_HANDLES=8,SCANNER=128*1024;
const brands=new WeakMap(),live=new Map();
let retained=0,busy=false;
const profile=()=>fail('BNS_HUMAN_GRAPH_PROFILE_UNSUPPORTED');
const invalid=()=>fail('BNS_VALUE_INVALID');
const limit=()=>fail('BNS_HUMAN_GRAPH_LIMIT');
const forbidden=new Set(['__proto__','constructor','prototype']);
// No JSON string or TextEncoder output is allocated to discover its byte bound.
function stringSize(s){
 if(s.length>4*MiB)limit();let octets=2,chars=2;
 for(let i=0;i<s.length;i++){
  const c=s.charCodeAt(i);
  if(c>=0xd800&&c<=0xdbff){const next=s.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))fail('BNS_TEXT_ENCODING');octets+=4;chars+=2;}
  else if(c>=0xdc00&&c<=0xdfff)fail('BNS_TEXT_ENCODING');
  else if(c===34||c===92||c===8||c===9||c===10||c===12||c===13){octets+=2;chars+=2;}
  else if(c<32){octets+=6;chars+=6;}
  else{octets+=c<128?1:c<2048?2:3;chars++;}
 }
 return {octets,chars};
}
// Secondary meter ONLY for already-source-bounded private JSON/metadata.
// Returned key vectors, including array index names and length, are charged.
function inspect(value,ceiling=Infinity){
 let nodes=0,wire=0,chars=0,containers=0,keyChars=0,keyRefs=0,keyNames=0;
 const ancestors=new Set();
 const footprint=()=>wire+2*chars+64*nodes+32*containers+2*keyChars+8*keyRefs+2*keyNames;
 const add=(b,c)=>{wire+=b;chars+=c;if(wire>CORE_LIMITS.batchBytes+1024||footprint()>ceiling)limit();};
 const visit=(v,depth)=>{
  if(++nodes>200000||depth>32)fail('BNS_VALUE_LIMIT');
  if(v===null||typeof v==='boolean'){const x=v===null?'null':v?'true':'false';add(x.length,x.length);return;}
  if(typeof v==='number'){if(!Number.isFinite(v)||Object.is(v,-0))invalid();const x=JSON.stringify(v);add(x.length,x.length);return;}
  if(typeof v==='string'){const n=stringSize(v);add(n.octets,n.chars);return;}
  if(!v||typeof v!=='object'||ancestors.has(v))invalid();
  const array=Array.isArray(v),proto=Object.getPrototypeOf(v);
  if(array?proto!==Array.prototype:proto!==Object.prototype&&proto!==null)invalid();
  const names=Reflect.ownKeys(v);if(names.some(k=>typeof k!=='string'))invalid();
  if(names.length>200001)limit();keyRefs+=names.length;for(const key of names)keyNames+=key.length;
  containers++;ancestors.add(v);
  if(array){
   const length=Object.getOwnPropertyDescriptor(v,'length');if(!length||!('value'in length)||length.value>200000||names.length!==length.value+1)invalid();add(2,2);
   for(let i=0;i<length.value;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));if(!d||!('value'in d)||!d.enumerable)invalid();if(i)add(1,1);visit(d.value,depth+1);}
  }else{
   add(2,2);let at=0;
   for(const key of names){if(forbidden.has(key))invalid();const d=Object.getOwnPropertyDescriptor(v,key);if(!d||!('value'in d)||!d.enumerable)invalid();const n=stringSize(key);keyChars+=key.length;if(at++)add(1,1);add(n.octets+1,n.chars+1);visit(d.value,depth+1);}
  }
  ancestors.delete(v);
 };
 visit(value,0);if(footprint()>ceiling)limit();return {wire,footprint:footprint(),nodes};
}
const serializedInvalid=()=>fail('BNS_HUMAN_GRAPH_SERIALIZED_INVALID');
// Fixed source scanner: no parse, clone, encoding, reflection or token/AST list.
// Its one bounded key plus previous keys/33 frames fit the reserved SCANNER.
function scanEnvelope(source){
 let at=0,wire=0,nodes=0,containers=0,keyChars=0,keyRefs=0,keyNames=0,operationCount=0,operationBytes=0,M=0,datasetId;
 const frames=Array.from({length:33},()=>({previous:null,index:null,count:0}));
 const mark=()=>({at,wire,nodes,containers,keyChars,keyRefs,keyNames});
 const footprint=(start={at:0,wire:0,nodes:0,containers:0,keyChars:0,keyRefs:0,keyNames:0})=>wire-start.wire+2*(at-start.at)+64*(nodes-start.nodes)+32*(containers-start.containers)+2*(keyChars-start.keyChars)+8*(keyRefs-start.keyRefs)+2*(keyNames-start.keyNames);
 const ascii=()=>{at++;if(++wire>CORE_LIMITS.batchBytes+1024)limit();};
 const expect=char=>{if(source[at]!==char)serializedInvalid();ascii();};
 const digits=value=>value<10?1:value<100?2:value<1000?3:value<10000?4:value<100000?5:6;
 const indexKey=key=>{
  if(!key.length||key.length>10||key.length>1&&key[0]==='0')return null;let n=0;
  for(let i=0;i<key.length;i++){const c=key.charCodeAt(i);if(c<48||c>57)return null;n=n*10+c-48;}return n<=4294967294?n:null;
 };
 const hex=(position)=>{let n=0;for(let i=0;i<4;i++){const c=source.charCodeAt(position+i);if(c>=48&&c<=57)n=n*16+c-48;else if(c>=97&&c<=102)n=n*16+c-87;else serializedInvalid();}return n;};
 function string(capture=0){
  expect('"');let result='',units=0;
  const append=(text,count)=>{units+=count;if(capture){if(units>capture){if(capture===128)fail('BNS_DATASET_INVALID');limit();}result+=text;}};
  while(at<source.length){
   const c=source.charCodeAt(at);
   if(c===34){ascii();return {text:result,units};}
   if(c===92){
    ascii();const e=source[at];if(e===undefined)serializedInvalid();ascii();
    if(e==='"'||e==='\\'){append(e,1);continue;}
    const simple=e==='b'?8:e==='t'?9:e==='n'?10:e==='f'?12:e==='r'?13:null;
    if(simple!==null){append(capture?String.fromCharCode(simple):'',1);continue;}
    if(e!=='u')serializedInvalid();const code=hex(at);
    if(code>=0xd800&&code<=0xdbff){if(source[at+4]==='\\'&&source[at+5]==='u'){const next=hex(at+6);if(next>=0xdc00&&next<=0xdfff)serializedInvalid();}fail('BNS_TEXT_ENCODING');}
    if(code>=0xdc00&&code<=0xdfff)fail('BNS_TEXT_ENCODING');
    if(code>=32||[8,9,10,12,13].includes(code))serializedInvalid();
    for(let i=0;i<4;i++)ascii();append(capture?String.fromCharCode(code):'',1);continue;
   }
   if(c<32)serializedInvalid();
   if(c>=0xd800&&c<=0xdbff){const next=source.charCodeAt(at+1);if(!(next>=0xdc00&&next<=0xdfff))fail('BNS_TEXT_ENCODING');append(capture?String.fromCharCode(c,next):'',2);at+=2;wire+=4;}
   else{if(c>=0xdc00&&c<=0xdfff)fail('BNS_TEXT_ENCODING');append(capture?String.fromCharCode(c):'',1);at++;wire+=c<128?1:c<2048?2:3;}
   if(wire>CORE_LIMITS.batchBytes+1024)limit();
  }
  serializedInvalid();
 }
 function value(depth,role='ordinary'){
  if(depth>32||++nodes>200000)fail('BNS_VALUE_LIMIT');const c=source[at];
  if(role==='dataset'){if(c!=='"')serializedInvalid();datasetId=string(128).text;if(!opaque(datasetId))fail('BNS_DATASET_INVALID');return;}
  if(role==='operations'&&c!=='['||role==='operation'&&c!=='{'||role==='envelope'&&c!=='{')serializedInvalid();
  if(c==='"'){string();return;}
  if(c==='{'){
   containers++;const frame=frames[depth];frame.previous=null;frame.index=null;frame.count=0;ascii();
   if(source[at]==='}'){if(role==='envelope')serializedInvalid();ascii();return;}
   for(;;){
    if(source[at]!=='"')serializedInvalid();const key=string(512).text,current=indexKey(key);
    if(forbidden.has(key))invalid();
    if(frame.previous!==null){if(current!==null?(frame.index===null||current<=frame.index):(frame.index===null&&key<=frame.previous))serializedInvalid();}
    if(role==='envelope'&&key!==(frame.count===0?'datasetId':frame.count===1?'operations':''))serializedInvalid();
    frame.previous=key;frame.index=current;frame.count++;keyChars+=key.length;keyRefs++;keyNames+=key.length;expect(':');
    value(depth+1,role==='envelope'?key==='datasetId'?'dataset':'operations':'ordinary');
    if(source[at]==='}'){if(role==='envelope'&&frame.count!==2)serializedInvalid();ascii();return;}expect(',');
   }
  }
  if(c==='['){
   containers++;keyRefs++;keyNames+=6;ascii();let count=0;
   if(source[at]!==']')for(;;){
    if(role==='operations'&&operationCount>=CORE_LIMITS.batch)limit();
    const start=role==='operations'?mark():null;value(depth+1,role==='operations'?'operation':'ordinary');
    keyRefs++;keyNames+=digits(count++);
    if(start){operationCount++;const bytes=wire-start.wire;operationBytes+=bytes;if(operationBytes>CORE_LIMITS.batchBytes)limit();M=Math.max(M,footprint(start));}
    if(source[at]===']')break;expect(',');
   }
   if(role==='operations'&&operationCount<2)limit();expect(']');return;
  }
  for(const literal of ['true','false','null'])if(source.startsWith(literal,at)){for(let i=0;i<literal.length;i++)ascii();return;}
  if(c==='-'||c>='0'&&c<='9'){
   const start=at;while(at<source.length&&'-+0123456789.eE'.includes(source[at])){if(at-start>=32)limit();ascii();}
   const token=source.slice(start,at);if(!/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/.test(token))serializedInvalid();
   const n=Number(token);if(!Number.isFinite(n)||Object.is(n,-0))invalid();if(JSON.stringify(n)!==token)serializedInvalid();return;
  }
  serializedInvalid();
 }
 value(0,'envelope');if(at!==source.length)serializedInvalid();return {datasetId,operationCount,operationBytes,W:footprint(),M};
}
function revoke(handle){const record=brands.get(handle);if(!record)return;brands.delete(handle);live.delete(handle);retained-=record.charge;record.operations=null;record.summary=null;}
function room(charge){while(live.size&&retained+charge>AGGREGATE)revoke(live.keys().next().value);if(retained+charge>AGGREGATE)limit();}
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;}
function entryShape(row){
 if(row===null)return;
 if(row.lifecycle!=='active'||row.origin!=='user'||row.provenanceType!=='user_created'||row.bodyBinding!=='thought'||row.organizationRevision!==0||row.dependencyRevision!==0||!Array.isArray(row.sourceRecordIds)||row.sourceRecordIds.length||!Array.isArray(row.inputRefs)||row.inputRefs.length||!Array.isArray(row.topics)||row.topics.length)profile();
}
function scope(group,request){
 const d=group.descriptor.value,entries=group.members.filter(op=>op.value.entityType==='entry');
 if(!['entry','entry-edit'].includes(d.kind)||entries.length!==1||d.allocation.indexGenerationCount!==0)profile();
 const member=entries[0],id=member.value.after.id;entryShape(member.value.before);entryShape(member.value.after);
 for(const op of group.members){
  if(op===member)continue;const v=op.value;
  if(v.entityType!=='history')profile();
  for(const row of [v.before,v.after])if(row!==null&&(row.kind!=='library_entry'||row.actor!=='user'||row.entityId!==id||!Array.isArray(row.sourceRecordIds)||row.sourceRecordIds.length))profile();
 }
 if(d.kind==='entry'){
  keys(request,['operationId','actor','title','body','note','type','formation','evidence'],['operationId','actor','body','type','formation','evidence']);
  if(request.actor!=='user'||request.formation!=='explicit'||!Array.isArray(request.evidence)||request.evidence.length||member.value.before!==null||member.parents.length)profile();
  validateFields(Object.fromEntries(ENTRY_FIELDS.filter(k=>Object.hasOwn(request,k)).map(k=>[k,request[k]])));
 }else{
  keys(request,['id','operationId','expectedRevision','changes','actor','expectedFieldRevisions'],['id','operationId','expectedRevision','changes']);
  if(request.id!==id||Object.hasOwn(request,'actor')&&request.actor!=='user'||!revisionOK(request.expectedRevision)||member.value.before===null)profile();
  keys(request.changes,['body'],['body']);validateFields(request.changes);
  if(Object.hasOwn(request,'expectedFieldRevisions')){keys(request.expectedFieldRevisions,ENTRY_FIELDS,['body']);if(Object.values(request.expectedFieldRevisions).some(v=>!revisionOK(v)))profile();}
 }
 if(member.value.after.thoughtText!==(d.kind==='entry'?request.body:request.changes.body))profile();
 return member;
}
function partition(snapshot,datasetId){
 const revisions=new Map(),opIds=new Set(),slots=new Set(),descriptors=[];
 for(const op of snapshot){
  if(op?.protocol!==1||op.codecVersion!==1||op.kind!=='put'||op.actor!=='user'||op.datasetId!==datasetId||!['humanLibraryMember','humanLibraryCommit'].includes(op.type))profile();
  const slot=JSON.stringify([op.deviceId,op.sequence]);
  if(revisions.has(op.revisionId)||opIds.has(op.operationId)||slots.has(slot))fail('BNS_GROUP_DUPLICATE');
  revisions.set(op.revisionId,op);opIds.add(op.operationId);slots.add(slot);if(op.type==='humanLibraryCommit')descriptors.push(op);
 }
 const claimed=new Set(),parts=[];
 for(const d of descriptors){
  if(!Array.isArray(d.value?.members)||!d.value.members.length)fail('BNS_HUMAN_COMMIT_INCOMPLETE');const members=[];
  for(const ref of d.value.members){const member=revisions.get(ref?.revisionId);if(!member||member.type!=='humanLibraryMember'||claimed.has(member)||ref.type!==member.type||ref.entityId!==member.entityId||ref.operationId!==member.operationId)fail('BNS_HUMAN_COMMIT_INCOMPLETE');claimed.add(member);members.push(member);}
  parts.push([...members,d]);
 }
 if(!parts.length||claimed.size+descriptors.length!==snapshot.length)fail('BNS_HUMAN_COMMIT_INCOMPLETE');return parts;
}
function metadata(groups,datasetId){
 const owners=new Map(),byRevision=new Map(),byGroup=new Map(),creations=new Map(),heads=new Map();
 for(const group of groups){
  const id=group.descriptor.revisionId;byGroup.set(id,group);
  for(const op of group.operations){owners.set(op.revisionId,id);byRevision.set(op.revisionId,op);const k=JSON.stringify([op.type,op.entityId]);let head=heads.get(k);if(!head){head={type:op.type,entityId:op.entityId,revisions:new Set()};heads.set(k,head);}head.revisions.add(op.revisionId);}
  if(group.descriptor.value.kind==='entry'){const member=group.members.find(op=>op.value.entityType==='entry');if(creations.has(member.entityId))fail('BNS_HUMAN_ANCESTRY_REQUIRED');creations.set(member.entityId,member.revisionId);}
 }
 const dependencies=new Map();
 for(const group of groups){const deps=new Set();dependencies.set(group.descriptor.revisionId,deps);
  for(const member of group.members){
   if(member.parents.length>1)profile();
   if(!member.parents.length){if(member.value.before!==null)fail('BNS_HUMAN_ANCESTRY_REQUIRED');continue;}
   const parent=byRevision.get(member.parents[0]);
   if(!parent||parent.type!==member.type||parent.entityId!==member.entityId||owners.get(parent.revisionId)===group.descriptor.revisionId)fail('BNS_HUMAN_ANCESTRY_REQUIRED');
   if(!equal(parent.value.after,member.value.before))fail('BNS_HUMAN_OWNER_CHANGED');
   deps.add(owners.get(parent.revisionId));heads.get(JSON.stringify([parent.type,parent.entityId])).revisions.delete(parent.revisionId);
  }
 }
 // A closed Entry chain must terminate at its unique creation, not a new root.
 for(const group of groups)for(const member of group.members)if(member.value.entityType==='entry'){
  let cursor=member;const seen=new Set();while(cursor.parents.length){if(seen.has(cursor.revisionId))fail('BNS_HUMAN_ANCESTRY_REQUIRED');seen.add(cursor.revisionId);cursor=byRevision.get(cursor.parents[0]);}
  if(creations.get(member.entityId)!==cursor.revisionId)fail('BNS_HUMAN_ANCESTRY_REQUIRED');
 }
 const ordered=[],remaining=new Set(byGroup.keys());
 while(remaining.size){const ready=[...remaining].filter(id=>[...dependencies.get(id)].every(dep=>!remaining.has(dep))).sort();if(!ready.length)fail('BNS_HUMAN_ANCESTRY_REQUIRED');for(const id of ready){remaining.delete(id);const group=byGroup.get(id);ordered.push({descriptorRevisionId:id,logicalCommitId:group.descriptor.value.id,memberRevisionIds:group.members.map(op=>op.revisionId),dependencyDescriptorRevisionIds:[...dependencies.get(id)].sort()});}}
 const terminals=[...heads.values()].map(h=>{if(h.revisions.size>CORE_LIMITS.heads)limit();return {type:h.type,entityId:h.entityId,revisions:[...h.revisions].sort(),purged:false,fence:null};}).sort((a,b)=>a.type<b.type?-1:a.type>b.type?1:a.entityId<b.entityId?-1:a.entityId>b.entityId?1:0);
 const inventory=[...byRevision.values()].map(op=>({revisionId:op.revisionId,type:op.type,entityId:op.entityId,deviceId:op.deviceId,sequence:op.sequence,operationId:op.operationId})).sort((a,b)=>a.revisionId<b.revisionId?-1:1);
 return {version:1,datasetId,inventory,groups:ordered,heads:terminals};
}

async function qualify(parsed,measured,charge,H){
 const snapshot=parsed.operations,parts=partition(snapshot,parsed.datasetId),groups=[],operations=[];
 for(const part of parts){const group=await validateHumanCommitGroup(part,parsed.datasetId),request=await restoreHumanRequest(group.descriptor.value);scope(group,request);groups.push(group);operations.push(...group.operations);}
 const graph=metadata(groups,parsed.datasetId),graphCharge=inspect(graph).footprint;if(graphCharge>H/4)limit();
 const graphDigest=await digest(graph);
 const summary=freeze({version:1,evidence:'PURE_HUMAN_GRAPH_STRUCTURE_ONLY',datasetId:parsed.datasetId,operationCount:operations.length,operationBytes:measured.operationBytes,graphDigest,groups:graph.groups,heads:graph.heads});
 if(inspect(summary).footprint>H/4)limit();for(const op of operations)freeze(op);
 while(live.size&&(live.size>=MAX_HANDLES||retained+charge>RETAINED))revoke(live.keys().next().value);
 const handle=Object.freeze({}),record={operations,summary,charge};brands.set(handle,record);live.set(handle,record);retained+=charge;return handle;
}
export function prepareHumanConflictGraphQualification(source){
 // Closed old object/options intake: no reflection, coercion or Promise first.
 if(arguments.length!==1||typeof source!=='string')fail('BNS_HUMAN_GRAPH_SERIALIZED_REQUIRED');
 if(busy)fail('BNS_HUMAN_GRAPH_QUALIFICATION_BUSY');if(source.length>CORE_LIMITS.batchBytes+1024)limit();busy=true;
 try{
  const S=2*source.length;room(S+SCANNER);const measured=scanEnvelope(source),{W,M,operationCount}=measured,H=4*W+4096*operationCount,charge=W+H;
  // Source-derived reservation precedes private parse and every returned key
  // vector, including index-name/length slots absent from the prior meter.
  const reservation=S+3*W+12*M+2*H+SCANNER;if(charge>RETAINED||reservation>AGGREGATE)limit();room(reservation);
  let parsed;try{parsed=JSON.parse(source);}catch{serializedInvalid();}
  if(inspect(parsed,W).footprint!==W||canonical(parsed)!==source)serializedInvalid();freeze(parsed);
  return qualify(parsed,measured,charge,H).finally(()=>{busy=false;});
 }catch(error){busy=false;throw error;}
}
export function describeHumanConflictGraphQualification(handle){const record=brands.get(handle);if(!record||!live.has(handle))fail('BNS_HUMAN_GRAPH_QUALIFICATION_REQUIRED');return record.summary;}
export function releaseHumanConflictGraphQualification(handle){if(!brands.has(handle)||!live.has(handle))fail('BNS_HUMAN_GRAPH_QUALIFICATION_REQUIRED');revoke(handle);}
