import {assertProtocolObjectReference,readObject} from '../segments.js';
import {assertGroupedCheckpointManifest} from '../group-checkpoint-manifest.js';
import {clone,decodeJSON,digest,equal,exact,fail,opaque,SyncError} from '../value.js';

export const GOOGLE_APPDATA_SCOPE='https://www.googleapis.com/auth/drive.appdata';
const API='https://www.googleapis.com/drive/v3/files';
const FIELDS='id,name,mimeType,spaces,trashed,size,appProperties';
const clientId=value=>typeof value==='string'&&value.length<=255&&/^[0-9]{6,32}(?:-[A-Za-z0-9_-]{1,128})?\.apps\.googleusercontent\.com$/.test(value);
const subject=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,255}$/.test(value);
const fileId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,256}$/.test(value);
const token=value=>typeof value==='string'&&value.length>0&&value.length<=2048&&!/[\u0000-\u001f]/.test(value);
const encode=value=>new TextEncoder().encode(value);
function json(raw){try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{fail('BNS_PROVIDER_RESPONSE_INVALID');}}
function status(code){if(code===401)fail('BNS_PROVIDER_AUTH_REQUIRED');if(code===403)fail('BNS_PROVIDER_FORBIDDEN');if(code===429)fail('BNS_PROVIDER_RATE_LIMIT');if(code===404)fail('BNS_PROVIDER_MISSING');if(code>=500)fail('BNS_PROVIDER_UNAVAILABLE');fail('BNS_PROVIDER_RESPONSE_INVALID');}

// Explicit injected HTTP boundary only. No OAuth, fetch default, credentials or
// activation. The host must verify identity and bind its request capability to
// this exact subject/client/generation before constructing this transport.
export class GoogleDriveAppDataTransport {
 #core;#binding;#request;#current;#identity;#dataset;#namespace;#closed=false;#timeout;#pending=new Set();#budget=null;
 #dispatchQualification=null;
 constructor(core,{binding,request,isCurrent,requestTimeoutMs=30000,dispatchQualification=null}={}){
  if(dispatchQualification!==null&&typeof dispatchQualification!=='function')fail('BNS_PROVIDER_BINDING');
  if(!core?.repository||!opaque(core.datasetId)||!exact(binding,['subject','clientId','generation','scopes'])||!subject(binding.subject)||!clientId(binding.clientId)||!opaque(binding.generation)||!Array.isArray(binding.scopes)||binding.scopes.length!==1||binding.scopes[0]!==GOOGLE_APPDATA_SCOPE||typeof request!=='function'||typeof isCurrent!=='function'||!Number.isSafeInteger(requestTimeoutMs)||requestTimeoutMs<1||requestTimeoutMs>30000)fail('BNS_PROVIDER_BINDING');
  this.#dispatchQualification=dispatchQualification;this.#core=core;this.#binding=Object.freeze({...clone(binding),scopes:Object.freeze([...binding.scopes])});this.#request=request;this.#current=isCurrent;this.#timeout=requestTimeoutMs;
  // Account/client bind the local retry journal; generation fences in-flight
  // work but does not allocate a new remote ID on ordinary reauthorization.
  this.#identity=digest({provider:'google-drive-appdata-v1',subject:binding.subject,clientId:binding.clientId,datasetId:core.datasetId});this.#dataset=digest(core.datasetId);this.#namespace=core.namespace();
 }
 close(){this.#closed=true;for(const cancel of this.#pending)cancel();}
 #check(){if(this.#closed||this.#current(this.#binding)!==true)fail('BNS_PROVIDER_BINDING_CHANGED');}
 async #guard(){this.#check();if(await this.#core.namespace()!==await this.#namespace)fail('BNS_PROVIDER_BINDING_CHANGED');this.#check();}
 async #run(action){
  if(this.#budget)fail('BNS_PROVIDER_BUSY');this.#check();const budget={deadline:performance.now()+this.#timeout,received:0,requests:0,writeDispatched:false};this.#budget=budget;
  try{const result=await action();await this.#guard();if(performance.now()>=budget.deadline)fail('BNS_PROVIDER_RESOURCE_LIMIT');return result;}catch(error){if(budget.writeDispatched&&['BNS_PROVIDER_BINDING_CHANGED','BNS_PROVIDER_RESOURCE_LIMIT'].includes(error?.code))fail('BNS_PROVIDER_COMPLETION_UNKNOWN');throw error;}finally{this.#budget=null;}
 }
 async #http(method,url,{body=null,headers={},limit=65536,allow=[]}={}){
  await this.#guard();const budget=this.#budget,remaining=budget?.deadline-performance.now();if(!budget||++budget.requests>4096||remaining<=0)fail('BNS_PROVIDER_RESOURCE_LIMIT');const controller=new AbortController();let timer,cancel,dispatched=false;
  const interrupted=new Promise((_,reject)=>{cancel=()=>{controller.abort();reject(new SyncError('BNS_PROVIDER_BINDING_CHANGED'));};timer=setTimeout(()=>{controller.abort();reject(new SyncError('BNS_PROVIDER_COMPLETION_UNKNOWN'));},remaining);this.#pending.add(cancel);});
  try{
   let response;try{response=await Promise.race([Promise.resolve().then(async()=>{const assertDispatch=this.#dispatchQualification?await this.#dispatchQualification(Object.freeze({method,url})):null;this.#check();if(controller.signal.aborted||this.#budget!==budget||performance.now()>=budget.deadline)fail('BNS_PROVIDER_COMPLETION_UNKNOWN');if(this.#dispatchQualification){if(typeof assertDispatch!=='function')fail('BNS_PROVIDER_BINDING');assertDispatch();}dispatched=true;if(method==='POST')budget.writeDispatched=true;return this.#request(Object.freeze({method,url,headers:Object.freeze({...headers}),body,signal:controller.signal,maxResponseBytes:limit,binding:this.#binding}));}),interrupted]);}catch(error){if(error instanceof SyncError)throw error;fail('BNS_PROVIDER_COMPLETION_UNKNOWN');}
   await this.#guard();if(!response||!Number.isInteger(response.status))fail('BNS_PROVIDER_RESPONSE_INVALID');
   // The host must also enforce the streaming bound before allocation. This
   // check bounds our copy and parse, not allocations inside the host seam.
   if(!(response.body instanceof Uint8Array)||response.body.byteLength>limit)fail('BNS_PROVIDER_RESPONSE_INVALID');budget.received+=response.body.byteLength;if(budget.received>2*1024*1024||performance.now()>=budget.deadline)fail('BNS_PROVIDER_RESOURCE_LIMIT');
   if(allow.includes(response.status))return {status:response.status};if(response.status<200||response.status>=300)status(response.status);
   return {status:response.status,body:response.body.slice()};
  }catch(error){
   // Revocation fences consumption, not a remote write already dispatched.
   // Its reserved ID remains the only permitted reconciliation target.
   if(method==='POST'&&dispatched&&error?.code==='BNS_PROVIDER_BINDING_CHANGED')fail('BNS_PROVIDER_COMPLETION_UNKNOWN');throw error;
  }finally{clearTimeout(timer);this.#pending.delete(cancel);}
 }
 listCheckpoints(options={}){return this.#run(()=>this.#listCheckpoints(options));}
 get(reference){return this.#run(()=>this.#get(reference));}
 putImmutable(reference,input){return this.#run(()=>this.#putImmutable(reference,input));}
 async #properties(ref){return {paiaProtocol:'1',paiaDataset:await this.#dataset,paiaDigest:ref.digest,paiaKind:ref.kind,paiaCodec:ref.codec,paiaEncoded:String(ref.encodedBytes),paiaDecoded:String(ref.decodedBytes)};}
 async #metadata(row,expected=null){
  const p=row?.appProperties,ref={id:p?.paiaDigest,digest:p?.paiaDigest,kind:p?.paiaKind,codec:p?.paiaCodec,encodedBytes:Number(p?.paiaEncoded),decodedBytes:Number(p?.paiaDecoded)};
  assertProtocolObjectReference(ref);
  if(!fileId(row.id)||row.name!==`paia-bns1-${ref.id}`||row.mimeType!=='application/octet-stream'||row.trashed!==false||!Array.isArray(row.spaces)||row.spaces.length!==1||row.spaces[0]!=='appDataFolder'||row.size!==String(ref.encodedBytes)||!equal(p,{...await this.#properties(ref),...(p.paiaRecovery===undefined?{}:{paiaRecovery:'grouped-v1'})})||p.paiaRecovery!==undefined&&ref.kind!=='checkpoint-manifest'||expected&&!equal(ref,expected))fail('BNS_PROVIDER_CONTAINMENT');
  return ref;
 }
 async #list({cursor=null,limit=100,ref=null,checkpoints=false}={}){
  if(cursor!==null&&!token(cursor)||!Number.isInteger(limit)||limit<1||limit>100)fail('BNS_PROVIDER_PAGE_INVALID');
  const clauses=["trashed = false", "appProperties has { key='paiaProtocol' and value='1' }",`appProperties has { key='paiaDataset' and value='${await this.#dataset}' }`];
  if(ref)clauses.push(`appProperties has { key='paiaDigest' and value='${ref.id}' }`);
  if(checkpoints){clauses.push("appProperties has { key='paiaKind' and value='checkpoint-manifest' }");clauses.push("appProperties has { key='paiaRecovery' and value='grouped-v1' }");}
  const url=new URL(API);url.search=new URLSearchParams({spaces:'appDataFolder',q:clauses.join(' and '),pageSize:String(limit),fields:`nextPageToken,incompleteSearch,files(${FIELDS})`,...(cursor===null?{}:{pageToken:cursor})});
  const result=json((await this.#http('GET',url.href,{limit:262144})).body);
  if(!result||!Array.isArray(result.files)||result.files.length>limit||result.incompleteSearch===true||result.nextPageToken!==undefined&&!token(result.nextPageToken))fail('BNS_PROVIDER_PAGE_INVALID');
  const rows=[];for(const row of result.files){const object=await this.#metadata(row,ref);if(checkpoints&&(object.kind!=='checkpoint-manifest'||row.appProperties.paiaRecovery!=='grouped-v1'))fail('BNS_PROVIDER_CONTAINMENT');rows.push({file:row.id,ref:object});}
  return {rows,nextCursor:result.nextPageToken??null};
 }
 async #listCheckpoints(options={}){if(!exact(options,['cursor','limit']))fail('BNS_PROVIDER_PAGE_INVALID');const page=await this.#list({cursor:options.cursor??null,limit:options.limit??100,checkpoints:true});return {items:page.rows.map(row=>row.ref),nextCursor:page.nextCursor};}
 async #find(ref){
  let cursor=null;const seen=new Set(),files=new Set();
  for(let n=0;n<16;n++){
   const page=await this.#list({cursor,ref});for(const row of page.rows)files.add(row.file);cursor=page.nextCursor;
   if(cursor===null){
    // Drive names/properties are not unique. A first hit cannot conceal a
    // divergent physical duplicate on a later page. Preserve every file.
    if(files.size>1)for(const file of files)if(await this.#read(file,ref)===null)fail('BNS_OBJECT_NOT_FOUND');
    return files.values().next().value??null;
   }
   if(seen.has(cursor))fail('BNS_PROVIDER_PAGE_INVALID');seen.add(cursor);
  }
  fail('BNS_PROVIDER_PAGE_LIMIT');
 }
 async #read(file,ref){
  if(!fileId(file))fail('BNS_PROVIDER_CONTAINMENT');const url=new URL(`${API}/${file}`);url.searchParams.set('fields',FIELDS);
  const response=await this.#http('GET',url.href,{allow:[404]});if(response.status===404)return null;
  const row=json(response.body);if(row.id!==file)fail('BNS_PROVIDER_CONTAINMENT');await this.#metadata(row,ref);
  const raw=(await this.#http('GET',`${API}/${file}?alt=media`,{limit:ref.encodedBytes})).body;
  if(raw.length!==ref.encodedBytes||await digest(raw)!==ref.digest)fail('BNS_OBJECT_INTEGRITY');await this.#guard();return raw;
 }
 async #get(reference){const ref=clone(reference);assertProtocolObjectReference(ref);const file=await this.#find(ref);if(file===null)fail('BNS_OBJECT_NOT_FOUND');const raw=await this.#read(file,ref);if(raw===null)fail('BNS_OBJECT_NOT_FOUND');return raw;}
 async #reservation(ref,proposed=null){
  const identity=await this.#identity,namespace=await this.#namespace;await this.#guard();
  return this.#core.transaction(proposed!==null,async t=>{
   this.#check();if(await this.#core.bind(t)!==namespace)fail('BNS_PROVIDER_BINDING_CHANGED');
   const old=await this.#core.get(t,'google-appdata-allocation',identity,ref.id);this.#check();
   if(old){if(!fileId(old.file)||!equal(old.ref,ref))fail('BNS_PROVIDER_ALLOCATION_INVALID');return old.file;}
   if(proposed===null)return null;
   await this.#core.put(t,'google-appdata-allocation',[identity,ref.id],{file:proposed,ref:clone(ref)});this.#check();return proposed;
  },['meta']);
 }
 async #putImmutable(reference,input){
  const ref=clone(reference);assertProtocolObjectReference(ref);if(!(input instanceof Uint8Array)||input.byteLength!==ref.encodedBytes)fail('BNS_OBJECT_INTEGRITY');const raw=input.slice();if(await digest(raw)!==ref.digest)fail('BNS_OBJECT_INTEGRITY');
  // Reuse durable allocation first, including after a lost create response.
  // Listing is discovery, never a filename-based uniqueness claim.
  let file=await this.#reservation(ref);
  if(file===null){file=await this.#find(ref);if(file!==null){await this.#reservation(ref,file);if(await this.#read(file,ref)===null)fail('BNS_PROVIDER_MISSING');return;}
   const ids=json((await this.#http('GET',`${API}/generateIds?count=1&space=appDataFolder&type=files`)).body);if(!Array.isArray(ids?.ids)||ids.ids.length!==1||!fileId(ids.ids[0]))fail('BNS_PROVIDER_RESPONSE_INVALID');file=await this.#reservation(ref,ids.ids[0]);
  }
  if(await this.#read(file,ref)!==null)return;
  const properties=await this.#properties(ref);
  // The grouped builder first publishes an internal unscoped manifest. Only
  // its final original-owner manifest is a consumer recovery candidate. This
  // index is a hint; recovery still authenticates the full graph itself.
  if(ref.kind==='checkpoint-manifest'){const value=decodeJSON(await readObject(ref,async()=>raw),4*1024*1024);if(Object.hasOwn(value,'ownerScope')){assertGroupedCheckpointManifest(value,{core:this.#core});properties.paiaRecovery='grouped-v1';}}
  const metadata={id:file,name:`paia-bns1-${ref.id}`,mimeType:'application/octet-stream',parents:['appDataFolder'],appProperties:properties};
  const boundary=`paia_${crypto.randomUUID().replaceAll('-','')}`;
  // ASCII boundary must not occur in the opaque payload, even for hostile data.
  const needle=encode(boundary);outer:for(let i=0;i<=raw.length-needle.length;i++){for(let j=0;j<needle.length;j++)if(raw[i+j]!==needle[j])continue outer;fail('BNS_PROVIDER_MULTIPART_BOUNDARY');}
  const prefix=encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`),suffix=encode(`\r\n--${boundary}--\r\n`),body=new Uint8Array(prefix.length+raw.length+suffix.length);body.set(prefix);body.set(raw,prefix.length);body.set(suffix,prefix.length+raw.length);
  await this.#http('POST',`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id`,{body,headers:{'Content-Type':`multipart/related; boundary=${boundary}`},allow:[409]});
  // Both success and an existing-ID collision require contained exact readback.
  if(await this.#read(file,ref)===null)fail('BNS_PROVIDER_COMPLETION_UNKNOWN');
 }
}
