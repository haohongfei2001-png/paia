import {assertProtocolObjectReference,readObject} from '../segments.js';
import {assertGroupedCheckpointManifest} from '../group-checkpoint-manifest.js';
import {bytes,clone,decodeJSON,digest,equal,exact,fail,opaque,SyncError} from '../value.js';

export const ONEDRIVE_APPFOLDER_SCOPE='Files.ReadWrite.AppFolder';
const API='https://graph.microsoft.com/v1.0/me/drive';
const FIELDS='id,name,size,file,folder,deleted,remoteItem,parentReference,eTag,@microsoft.graph.downloadUrl';
const id=x=>typeof x==='string'&&/^[A-Za-z0-9!_-]{1,256}$/.test(x);
const guid=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
const token=x=>typeof x==='string'&&x.length>0&&x.length<=4096&&!/[\u0000-\u001f]/.test(x);
function json(raw){try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{fail('BNS_PROVIDER_RESPONSE_INVALID');}}
function asset(value,kind){
 let u;try{u=new URL(value);}catch{fail('BNS_PROVIDER_ASSET_REJECTED');}
 // Closed personal-OneDrive candidate host profile. Unknown provider/CDN hosts
 // require separate qualification; never forward a Graph token to these URLs.
 const suffix=kind==='upload'?'.up.1drv.com':'.files.1drv.com';
 if(!token(value)||u.href!==value||u.protocol!=='https:'||u.username||u.password||u.port||u.hash||!u.hostname.endsWith(suffix)||!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/.test(u.hostname.slice(0,-suffix.length)))fail('BNS_PROVIDER_ASSET_REJECTED');return value;
}
function status(n){fail(n===401?'BNS_PROVIDER_AUTH_REQUIRED':n===403?'BNS_PROVIDER_FORBIDDEN':n===429?'BNS_PROVIDER_RATE_LIMIT':n===507?'BNS_PROVIDER_QUOTA':n===404?'BNS_PROVIDER_MISSING':n>=500?'BNS_PROVIDER_UNAVAILABLE':'BNS_PROVIDER_RESPONSE_INVALID');}

// Injected transport only, personal-account AppFolder profile. No default
// network, token, login, provider selection, broader scope or product enablement.
export class OneDriveAppFolderTransport {
 #core;#binding;#request;#current;#namespace;#dataset;#identity;#timeout;#closed=false;#budget=null;#pending=new Set();#root=null;
 #dispatchQualification=null;
 constructor(core,{binding,request,isCurrent,requestTimeoutMs=30000,dispatchQualification=null}={}){
  if(dispatchQualification!==null&&typeof dispatchQualification!=='function')fail('BNS_PROVIDER_BINDING');
  if(!core?.repository||!opaque(core.datasetId)||!exact(binding,['subject','tenantId','clientId','generation','scopes'])||!id(binding.subject)||binding.tenantId!=='9188040d-6c67-4c5b-b112-36a304b66dad'||!guid(binding.clientId)||!opaque(binding.generation)||!equal(binding.scopes,[ONEDRIVE_APPFOLDER_SCOPE])||typeof request!=='function'||typeof isCurrent!=='function'||!Number.isInteger(requestTimeoutMs)||requestTimeoutMs<1||requestTimeoutMs>30000)fail('BNS_PROVIDER_BINDING');
  this.#dispatchQualification=dispatchQualification;this.#core=core;this.#binding=Object.freeze({...clone(binding),scopes:Object.freeze([...binding.scopes])});this.#request=request;this.#current=isCurrent;this.#timeout=requestTimeoutMs;this.#namespace=core.namespace();this.#dataset=digest(core.datasetId);this.#identity=digest({provider:'onedrive-appfolder-v1',subject:binding.subject,tenantId:binding.tenantId,clientId:binding.clientId,datasetId:core.datasetId});
 }
 close(){this.#closed=true;for(const cancel of this.#pending)cancel();}
 #check(){if(this.#closed||this.#current(this.#binding)!==true)fail('BNS_PROVIDER_BINDING_CHANGED');}
 async #guard(){this.#check();if(await this.#core.namespace()!==await this.#namespace)fail('BNS_PROVIDER_BINDING_CHANGED');this.#check();}
 async #run(fn){if(this.#budget)fail('BNS_PROVIDER_BUSY');this.#check();const b={deadline:performance.now()+this.#timeout,received:0,requests:0,write:false};this.#budget=b;try{const v=await fn();await this.#guard();if(performance.now()>=b.deadline)fail('BNS_PROVIDER_RESOURCE_LIMIT');return v;}catch(e){if(b.write&&['BNS_PROVIDER_BINDING_CHANGED','BNS_PROVIDER_RESOURCE_LIMIT'].includes(e?.code))fail('BNS_PROVIDER_COMPLETION_UNKNOWN');throw e;}finally{this.#budget=null;}}
 async #http(method,url,{body=null,headers={},limit=65536,allow=[],authorization='graph'}={}){
  await this.#guard();const b=this.#budget,remaining=b?.deadline-performance.now();if(!b||++b.requests>4096||remaining<=0)fail('BNS_PROVIDER_RESOURCE_LIMIT');
  const controller=new AbortController();let cancel,timer;const interruption=new Promise((_,reject)=>{cancel=()=>{controller.abort();reject(new SyncError('BNS_PROVIDER_BINDING_CHANGED'));};timer=setTimeout(()=>{controller.abort();reject(new SyncError('BNS_PROVIDER_COMPLETION_UNKNOWN'));},remaining);this.#pending.add(cancel);});
  try{let r;try{r=await Promise.race([Promise.resolve().then(async()=>{const assertDispatch=this.#dispatchQualification?await this.#dispatchQualification(Object.freeze({method,url})):null;this.#check();if(controller.signal.aborted||this.#budget!==b||performance.now()>=b.deadline)fail('BNS_PROVIDER_COMPLETION_UNKNOWN');if(this.#dispatchQualification){if(typeof assertDispatch!=='function')fail('BNS_PROVIDER_BINDING');assertDispatch();}if(method==='POST'||method==='PUT')b.write=true;return this.#request(Object.freeze({method,url,headers:Object.freeze({...headers}),body,signal:controller.signal,maxResponseBytes:limit,binding:this.#binding,authorization}));}),interruption]);}catch(e){if(e instanceof SyncError)throw e;fail('BNS_PROVIDER_COMPLETION_UNKNOWN');}
   await this.#guard();if(!r||!Number.isInteger(r.status)||!(r.body instanceof Uint8Array))fail('BNS_PROVIDER_RESPONSE_INVALID');if(r.body.length>limit||(b.received+=r.body.length)>2*1024*1024)fail('BNS_PROVIDER_RESOURCE_LIMIT');if(!allow.includes(r.status)&&(r.status<200||r.status>=300))status(r.status);return {...r,body:r.body.slice()};
  }finally{clearTimeout(timer);this.#pending.delete(cancel);controller.abort();}
 }
 async #approot(){
  const r=json((await this.#http('GET',`${API}/special/approot?$select=id,folder,specialFolder,parentReference`)).body);
  if(!id(r.id)||!r.folder||r.specialFolder?.name!=='approot'||!id(r.parentReference?.driveId)||r.deleted||r.remoteItem)fail('BNS_PROVIDER_CONTAINMENT');const root={id:r.id,driveId:r.parentReference.driveId};if(this.#root&&!equal(root,this.#root))fail('BNS_PROVIDER_BINDING_CHANGED');this.#root=root;return root;
 }
 async #name(ref,grouped=false){return `paia-bns1_${await this.#dataset}_${ref.kind}_${ref.codec}_${ref.encodedBytes}_${ref.decodedBytes}_${ref.digest}_${grouped?'g':'o'}.bin`;}
 async #parse(name){
  if(typeof name!=='string'||!name.startsWith(`paia-bns1_${await this.#dataset}_`))return null;const m=/^paia-bns1_([a-f0-9]{64})_(chunk|segment|descriptor|checkpoint-shard|checkpoint-manifest)_(identity|gzip)_([1-9][0-9]*)_([1-9][0-9]*)_([a-f0-9]{64})_([go])\.bin$/.exec(name);if(!m)fail('BNS_PROVIDER_CONTAINMENT');const ref={id:m[6],digest:m[6],kind:m[2],codec:m[3],encodedBytes:Number(m[4]),decodedBytes:Number(m[5])};assertProtocolObjectReference(ref);if(m[7]==='g'&&ref.kind!=='checkpoint-manifest'||name!==await this.#name(ref,m[7]==='g'))fail('BNS_PROVIDER_CONTAINMENT');return {ref,grouped:m[7]==='g'};
 }
 async #metadata(row,root,expected=null){
  const parsed=await this.#parse(row?.name);if(!parsed||!id(row.id)||row.size!==parsed.ref.encodedBytes||!row.file||row.folder||row.deleted||row.remoteItem||row.parentReference?.id!==root.id||row.parentReference?.driveId!==root.driveId||!token(row.eTag)||expected&&!equal(parsed.ref,expected))fail('BNS_PROVIDER_CONTAINMENT');return parsed;
 }
 async #row(root,name){const r=await this.#http('GET',`${API}/items/${root.id}:/${name}?$select=${FIELDS}`,{allow:[404]});return r.status===404?null:json(r.body);}
 async #find(root,ref){let found=null;for(const g of ref.kind==='checkpoint-manifest'?[false,true]:[false]){const row=await this.#row(root,await this.#name(ref,g));if(row){await this.#metadata(row,root,ref);if(found)fail('BNS_PROVIDER_DUPLICATE');found=row;}}return found;}
 async #read(root,row,ref){
  await this.#metadata(row,root,ref);const url=asset(row['@microsoft.graph.downloadUrl'],'download'),raw=(await this.#http('GET',url,{authorization:'none',limit:ref.encodedBytes})).body;
  if(raw.length!==ref.encodedBytes||await digest(raw)!==ref.digest)fail('BNS_OBJECT_INTEGRITY');const after=await this.#row(root,row.name);await this.#metadata(after,root,ref);if(after.id!==row.id||after.eTag!==row.eTag)fail('BNS_PROVIDER_CONTAINMENT');return raw;
 }
 get(reference){const ref=clone(reference);assertProtocolObjectReference(ref);return this.#run(async()=>{const root=await this.#approot(),row=await this.#find(root,ref);if(!row)fail('BNS_OBJECT_NOT_FOUND');return this.#read(root,row,ref);});}
 async #attempt(ref,change=null){const identity=await this.#identity,namespace=await this.#namespace;await this.#guard();return this.#core.transaction(change!==null,async t=>{this.#check();if(await this.#core.bind(t)!==namespace)fail('BNS_PROVIDER_BINDING_CHANGED');const prior=await this.#core.get(t,'onedrive-upload-attempt',identity,ref.id);if(prior&&!equal(prior.ref,ref))fail('BNS_PROVIDER_ALLOCATION_INVALID');if(change){if(change.phase==='issued'&&prior&&(prior.expiresAt===null||prior.expiresAt>Date.now()))fail('BNS_PROVIDER_COMPLETION_UNKNOWN');await this.#core.put(t,'onedrive-upload-attempt',[identity,ref.id],{ref:clone(ref),...change});}this.#check();return prior;},['meta']);}
 putImmutable(reference,input){const ref=clone(reference);assertProtocolObjectReference(ref);if(!(input instanceof Uint8Array)||input.length!==ref.encodedBytes)fail('BNS_OBJECT_INTEGRITY');const raw=input.slice();return this.#run(async()=>{
  if(await digest(raw)!==ref.digest)fail('BNS_OBJECT_INTEGRITY');let grouped=false;if(ref.kind==='checkpoint-manifest'){const v=decodeJSON(await readObject(ref,async()=>raw),ref.decodedBytes);if(v.ownerScope){assertGroupedCheckpointManifest(v,{core:this.#core});grouped=true;}}
  const root=await this.#approot(),prior=await this.#find(root,ref);if(prior){await this.#read(root,prior,ref);return;}
  const name=await this.#name(ref,grouped);await this.#attempt(ref,{phase:'issued',expiresAt:null});
  const created=await this.#http('POST',`${API}/items/${root.id}:/${name}:/createUploadSession`,{headers:{'Content-Type':'application/json'},body:bytes({item:{'@microsoft.graph.conflictBehavior':'fail',name},deferCommit:false}),allow:[409]});
  if(created.status!==409){const session=json(created.body),url=asset(session.uploadUrl,'upload'),expiresAt=Date.parse(session.expirationDateTime);if(!Number.isFinite(expiresAt)||expiresAt<=Date.now())fail('BNS_PROVIDER_RESPONSE_INVALID');await this.#attempt(ref,{phase:'session',expiresAt});
   const completed=await this.#http('PUT',url,{authorization:'none',body:raw,headers:{'Content-Length':String(raw.length),'Content-Range':`bytes 0-${raw.length-1}/${raw.length}`},allow:[409]});if(![200,201,409].includes(completed.status))fail('BNS_PROVIDER_COMPLETION_UNKNOWN');if(completed.status!==409)await this.#metadata(json(completed.body),root,ref);
  }
  const row=await this.#find(root,ref);if(!row)fail('BNS_PROVIDER_COMPLETION_UNKNOWN');await this.#read(root,row,ref);
 });}
 listCheckpoints(options={}){if(!exact(options,['cursor','limit']))fail('BNS_PROVIDER_PAGE_INVALID');const {cursor=null,limit=100}=options;return this.#run(async()=>{
  if(!Number.isInteger(limit)||limit<1||limit>100||cursor!==null&&!token(cursor))fail('BNS_PROVIDER_PAGE_INVALID');const root=await this.#approot(),base=`${API}/items/${root.id}/children`,initial=`${base}?$top=${limit}&$select=${FIELDS}`;
  const validate=url=>{let u;try{u=new URL(url);}catch{fail('BNS_PROVIDER_PAGE_INVALID');}const keys=[...u.searchParams.keys()];if(u.origin!=='https://graph.microsoft.com'||u.pathname!==new URL(base).pathname||u.username||u.password||u.hash||u.href!==url||new Set(keys).size!==keys.length||keys.some(k=>!['$top','$select','$skiptoken'].includes(k))||u.searchParams.get('$top')!==String(limit)||u.searchParams.get('$select')!==FIELDS||u.searchParams.has('$skiptoken')&&!token(u.searchParams.get('$skiptoken')))fail('BNS_PROVIDER_PAGE_INVALID');return url;};
  const page=json((await this.#http('GET',cursor===null?initial:validate(cursor),{limit:262144})).body);if(!Array.isArray(page.value)||page.value.length>limit)fail('BNS_PROVIDER_PAGE_INVALID');const items=[];for(const row of page.value){const parsed=await this.#parse(row?.name);if(!parsed)continue;await this.#metadata(row,root);if(parsed.grouped)items.push(parsed.ref);}const nextCursor=page['@odata.nextLink']===undefined?null:validate(page['@odata.nextLink']);if(nextCursor===cursor&&cursor!==null)fail('BNS_PROVIDER_PAGE_INVALID');return {items,nextCursor};
 });}
}
