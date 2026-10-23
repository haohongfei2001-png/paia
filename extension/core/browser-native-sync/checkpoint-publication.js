import {buildCheckpoint,checkpointItems} from './checkpoints.js';
import {requireGroupedCheckpointDispatchCut} from './group-checkpoint.js';
import {GoogleDriveAppDataTransport,GOOGLE_APPDATA_SCOPE} from './providers/google-drive.js';
import {OneDriveAppFolderTransport,ONEDRIVE_APPFOLDER_SCOPE} from './providers/onedrive.js';
import {LocalSyncRecoverySession} from './recovery-session.js';
import {observeOriginalControlPublication,requireOriginalControlObservation} from '../indexed-store.js';
import {assertProtocolObjectReference,readObject,SEGMENT_PROFILE} from './segments.js';
import {bytes,clone,decodeJSON,digest,equal,exact,fail,hash,opaque,SyncError} from './value.js';

const LIMIT=Object.freeze({refs:4096,bytes:2*1024*1024,ms:30000});
const locks=new WeakSet(),KEY='paia-sync-checkpoint-publication:v1:';
// One host-owned producer, no RPC DTO, supplied graph, or alternative restore
// engine. The original grouped compiler remains the sole content authority.
// The fixed local journal contains identities/receipts only, never source text.
export class RecoverableCheckpointPublication {
 #core;#store;#transport;#request;#active=null;#row=null;#binding;#current;#local;#get;#set;#key;#paused=false;#closed=false;#serial=0;#cancel=null;#timeout;
 constructor(core,{store,binding,request,isCurrent,timeoutMs=LIMIT.ms}={}){
  if(store?.repository!==core?.repository||!core?.repository||typeof request!=='function'||typeof isCurrent!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>LIMIT.ms)fail('BNS_CHECKPOINT_PUBLICATION_BINDING');
  // Binding is supplied by the already-qualified host, never message fields.
  // Its complete canonical value (including provider/account/generation) is
  // compared on cold reopen; tokens and arbitrary additional keys are refused.
  if(!exact(binding,['provider','subject','clientId','tenantId','generation','scopes'])||!['google-drive-appdata','onedrive-appfolder'].includes(binding.provider)||typeof binding.subject!=='string'||!/^[A-Za-z0-9!_-]{1,256}$/.test(binding.subject)||!opaque(binding.generation)||typeof binding.clientId!=='string'||!binding.clientId||!Array.isArray(binding.scopes)||binding.scopes.length!==1||binding.scopes.some(x=>typeof x!=='string'))fail('BNS_CHECKPOINT_PUBLICATION_BINDING');
  if(binding.provider==='google-drive-appdata'&&('tenantId'in binding||binding.clientId.length>255||! /^[0-9]{6,32}(?:-[A-Za-z0-9_-]{1,128})?\.apps\.googleusercontent\.com$/.test(binding.clientId)||!equal(binding.scopes,[GOOGLE_APPDATA_SCOPE]))||binding.provider==='onedrive-appfolder'&&(binding.tenantId!=='9188040d-6c67-4c5b-b112-36a304b66dad'||! /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(binding.clientId)||!equal(binding.scopes,[ONEDRIVE_APPFOLDER_SCOPE])))fail('BNS_CHECKPOINT_PUBLICATION_BINDING');
  this.#core=core;this.#store=store;this.#request=request;this.#binding=clone(binding);this.#current=isCurrent;this.#timeout=timeoutMs;
  this.#local=store.local;this.#get=store.local?.get;this.#set=store.local?.set;
  if(typeof this.#get!=='function'||typeof this.#set!=='function')fail('BNS_CHECKPOINT_PUBLICATION_BINDING');
 }
 pause(){this.#paused=true;++this.#serial;this.#cancel?.();}
 resume(){if(this.#closed)fail('BNS_CHECKPOINT_PUBLICATION_INTERRUPTED');this.#paused=false;}
 close(){this.#closed=true;++this.#serial;this.#cancel?.();}
 #check(work){if(this.#paused||this.#closed||work&&(work.serial!==this.#serial||work!==this.#active)||this.#current(clone(this.#binding))!==true)fail('BNS_CHECKPOINT_PUBLICATION_INTERRUPTED');if(work&&performance.now()>=work.deadline)fail('BNS_CHECKPOINT_PUBLICATION_LIMIT');if(this.#store.local!==this.#local||this.#local.get!==this.#get||this.#local.set!==this.#set)fail('BNS_CHECKPOINT_PUBLICATION_BINDING');}
 async #await(work,fn){this.#check(work);let timer,cancel;const stop=new Promise((_,reject)=>{cancel=()=>reject(new SyncError('BNS_CHECKPOINT_PUBLICATION_INTERRUPTED'));this.#cancel=cancel;timer=setTimeout(()=>reject(new SyncError('BNS_CHECKPOINT_PUBLICATION_LIMIT')),Math.max(1,work.deadline-performance.now()));});try{const value=await Promise.race([Promise.resolve().then(()=>{this.#check(work);return fn();}),stop]);this.#check(work);return value;}finally{clearTimeout(timer);if(this.#cancel===cancel)this.#cancel=null;}}
 async #exclusive(fn){this.#check();if(locks.has(this.#local))fail('BNS_CHECKPOINT_PUBLICATION_BUSY');locks.add(this.#local);const work={serial:this.#serial,deadline:performance.now()+this.#timeout,bytes:0,refs:0,unsettled:new Set()};this.#active=work;
  try{return await fn(work);}finally{this.#transport?.close();this.#transport=null;this.#active=null;this.#row=null;const release=()=>locks.delete(this.#local);if(work.unsettled.size)Promise.allSettled([...work.unsettled]).then(release);else release();}
 }
 #adapter(){if(this.#transport)return;const work=this.#active;const {provider,...binding}=this.#binding,C=provider==='google-drive-appdata'?GoogleDriveAppDataTransport:OneDriveAppFolderTransport;
  this.#transport=new C(this.#core,{binding,request:this.#request,isCurrent:()=>!this.#paused&&!this.#closed&&this.#active===work&&work.serial===this.#serial&&this.#current(clone(this.#binding))===true,dispatchQualification:async({method})=>{
   this.#check(work);if(!work)fail('BNS_CHECKPOINT_PUBLICATION_INTERRUPTED');
   if(method==='POST'||method==='PUT'){if(!this.#row)fail('BNS_CHECKPOINT_PUBLICATION_NOT_PREPARED');const prepared=await this.#same(work,this.#row);return()=>{this.#check(work);requireGroupedCheckpointDispatchCut(this.#core,this.#store,prepared.result);};}
   return()=>this.#check(work);
  }});
 }
 async #identity(work){await this.#await(work,()=>this.#store.finishFoundation());await this.#await(work,()=>observeOriginalControlPublication(this.#store));const identity={datasetId:this.#core.datasetId,deviceId:this.#core.deviceId,databaseId:this.#store.databaseId,namespace:await this.#await(work,()=>this.#core.namespace()),binding:this.#binding};this.#adapter();this.#key=KEY+await digest({datasetId:identity.datasetId,deviceId:identity.deviceId,databaseId:identity.databaseId});return identity;}
 async #load(work,identity){const {token}=await this.#await(work,()=>observeOriginalControlPublication(this.#store));const row=(await this.#await(work,()=>this.#get.call(this.#local,this.#key)))[this.#key]??null;requireOriginalControlObservation(this.#store,token);if(row===null)return null;
  if(bytes(row).length>256*1024||!exact(row,['version','identity','taskId','state','cut','ref','parents','objects'])||row.version!==1||!equal(row.identity,identity)||!opaque(row.taskId)||!['prepared','publishing','confirmed'].includes(row.state)||!Array.isArray(row.objects)||row.objects.length<1||row.objects.length>LIMIT.refs||!Array.isArray(row.parents)||row.parents.length>1||row.parents.some(x=>!hash(x)))fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');
  const ids=new Set();for(const object of row.objects){if(!exact(object,['ref','state'])||!['ready','attempting','verified'].includes(object.state))fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');assertProtocolObjectReference(object.ref);if(ids.has(object.ref.id))fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');ids.add(object.ref.id);}
  if(row.state==='confirmed'&&row.objects.some(x=>x.state!=='verified')||row.state==='prepared'&&row.objects.some(x=>x.state!=='ready'))fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');
  let pending=false,attempting=false;for(const object of row.objects){if(object.state==='verified'&&pending||object.state==='attempting'&&attempting)fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');if(object.state!=='verified')pending=true;if(object.state==='attempting')attempting=true;}
  assertProtocolObjectReference(row.ref);if(row.ref.kind!=='checkpoint-manifest'||!equal(row.ref,row.objects.at(-1).ref))fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');return clone(row);
 }
 async #save(work,row){if(bytes(row).length>256*1024)fail('BNS_CHECKPOINT_PUBLICATION_LIMIT');const {token}=await this.#await(work,()=>observeOriginalControlPublication(this.#store));let error;
  try{await this.#await(work,()=>{const pending=Promise.resolve(this.#set.call(this.#local,{[this.#key]:clone(row)}));work.unsettled.add(pending);pending.then(()=>work.unsettled.delete(pending),()=>work.unsettled.delete(pending));return pending;});}catch(e){error=e;}
  // One exact readback settles a lost local set acknowledgement. Never retry
  // the write, grant a new identity, or proceed after an ambiguous result.
  this.#check(work);const actual=(await this.#await(work,()=>this.#get.call(this.#local,this.#key)))[this.#key];requireOriginalControlObservation(this.#store,token);if(!equal(actual??null,row))throw error??new SyncError('BNS_CHECKPOINT_PUBLICATION_JOURNAL');
 }
 #charge(work,ref){assertProtocolObjectReference(ref);work.refs++;work.bytes+=ref.encodedBytes+ref.decodedBytes;if(work.refs>LIMIT.refs||work.bytes>LIMIT.bytes)fail('BNS_CHECKPOINT_PUBLICATION_LIMIT');this.#check(work);}
 async #remote(work,ref){this.#charge(work,ref);return this.#await(work,()=>readObject(ref,r=>this.#transport.get(r)));}
 async #head(work){const transport={get:async ref=>{this.#charge(work,ref);return this.#await(work,()=>this.#transport.get(ref));},listCheckpoints:async options=>{this.#check(work);if(++work.refs>LIMIT.refs)fail('BNS_CHECKPOINT_PUBLICATION_LIMIT');const page=await this.#await(work,()=>this.#transport.listCheckpoints(options));work.bytes+=bytes(page).length;if(work.bytes>LIMIT.bytes)fail('BNS_CHECKPOINT_PUBLICATION_LIMIT');return page;}};const recovery=new LocalSyncRecoverySession(this.#core,{store:this.#store,transport,discoveryTimeoutMs:Math.max(1,Math.min(this.#timeout,Math.floor(work.deadline-performance.now())))});try{return await this.#await(work,()=>recovery.discover());}catch(e){if(e?.code==='BNS_RECOVERY_REMOTE_MISSING')return null;throw e;}finally{recovery.close();}}
 async #prepareObjects(work,parents){const objects=new Map();let retained=0;
  const local={putImmutable:async(ref,raw)=>{this.#check(work);assertProtocolObjectReference(ref);if(!(raw instanceof Uint8Array)||raw.length!==ref.encodedBytes)fail('BNS_OBJECT_INTEGRITY');const old=objects.get(ref.id);if(old){if(!equal(old.ref,ref)||await digest(raw)!==ref.id)fail('BNS_OBJECT_INTEGRITY');return;}retained+=2*raw.length+bytes(ref).length;if(objects.size>=LIMIT.refs||retained>LIMIT.bytes)fail('BNS_CHECKPOINT_PUBLICATION_LIMIT');if(await digest(raw)!==ref.id)fail('BNS_OBJECT_INTEGRITY');objects.set(ref.id,{ref:clone(ref),bytes:raw.slice()});},get:async ref=>{this.#check(work);const value=objects.get(ref.id);if(!value||!equal(value.ref,ref))fail('BNS_OBJECT_NOT_FOUND');return value.bytes.slice();}};
  const result=await this.#await(work,()=>buildCheckpoint(this.#core,local,{grouped:{store:this.#store,dispatchQualification:true},parents}));
  if(!objects.has(result.ref.id)||!result.manifest.ownerScope)fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');
  // The encoder's internal unscoped manifest is not discoverable; keep original
  // dependency order and move only the final authenticated owner manifest last.
  const final=objects.get(result.ref.id);objects.delete(result.ref.id);objects.set(result.ref.id,final);
  return {result,objects,local};
 }
 async #causal(work,prepared,parent){if(!parent)return;const manifest=decodeJSON(await this.#remote(work,parent),SEGMENT_PROFILE.decoded),old=[];for await(const item of checkpointItems(manifest,ref=>this.#remote(work,ref))){if(++work.refs>LIMIT.refs||(work.bytes+=bytes(item).length)>LIMIT.bytes)fail('BNS_CHECKPOINT_PUBLICATION_LIMIT');if(item.kind==='revision')old.push(item);}
  const next=new Map();for await(const item of checkpointItems(prepared.result.manifest,prepared.local.get)){if(++work.refs>LIMIT.refs||(work.bytes+=bytes(item).length)>LIMIT.bytes)fail('BNS_CHECKPOINT_PUBLICATION_LIMIT');if(item.kind==='revision')next.set(item.operation.revisionId,item);}
  for(const item of old)if(!equal(next.get(item.operation.revisionId)??null,item))fail('BNS_CHECKPOINT_PUBLICATION_CAUSAL');
 }
 async #same(work,row){const prepared=await this.#prepareObjects(work,row.parents);if(!equal(prepared.result.ref,row.ref)||!equal(prepared.result.cut,row.cut)||!equal([...prepared.objects.values()].map(x=>x.ref),row.objects.map(x=>x.ref)))fail('BNS_CHECKPOINT_PUBLICATION_CUT_CHANGED');return prepared;}
 async status(){return this.#exclusive(async work=>{const identity=await this.#identity(work),row=await this.#load(work,identity);return row?this.#view(row):{state:'idle',readiness:'not-prepared'};});}
 #view(row){return {state:row.state,taskId:row.taskId,ref:clone(row.ref),readiness:row.state==='confirmed'?'recoverable-checkpoint-confirmed':'checkpoint-publication-incomplete',verified:row.objects.filter(x=>x.state==='verified').length,objects:row.objects.length};}
 async prepare(){return this.#exclusive(async work=>{const identity=await this.#identity(work),previous=await this.#load(work,identity);if(previous&&previous.state!=='confirmed')return this.#view(previous);
  const parent=await this.#head(work),parents=parent?[parent.id]:[],prepared=await this.#prepareObjects(work,parents);await this.#causal(work,prepared,parent);
  const row={version:1,identity,taskId:crypto.randomUUID(),state:'prepared',cut:clone(prepared.result.cut),ref:clone(prepared.result.ref),parents,objects:[...prepared.objects.values()].map(x=>({ref:x.ref,state:'ready'}))};await this.#save(work,row);return this.#view(row);
 });}
 async publish(){return this.#exclusive(async work=>{const identity=await this.#identity(work),row=await this.#load(work,identity);if(!row)fail('BNS_CHECKPOINT_PUBLICATION_NOT_PREPARED');this.#row=row;
  // Rebuild under the original compiler before any network write; a deleted
  // body, new local edit, namespace switch or changed graph cannot reuse a cut.
  let prepared=await this.#same(work,row);const head=await this.#head(work);if(head?.id!==row.ref.id&&(head?.id??null)!==(row.parents[0]??null))fail('BNS_CHECKPOINT_PUBLICATION_REMOTE_CHANGED');
  for(const object of row.objects){this.#check(work);if(object.state!=='ready'){
    // A durable attempted object is GET-only forever on an unresolved miss.
    // This is deliberately stricter than a provider's possible retry policy.
    try{await this.#remote(work,object.ref);}catch(e){if(e?.code==='BNS_OBJECT_NOT_FOUND')fail('BNS_CHECKPOINT_PUBLICATION_UNKNOWN');throw e;}
   }else{
    prepared=await this.#same(work,row);object.state='attempting';row.state='publishing';await this.#save(work,row);this.#charge(work,object.ref);
    await this.#await(work,()=>this.#transport.putImmutable(clone(object.ref),prepared.objects.get(object.ref.id).bytes.slice()));await this.#remote(work,object.ref);
   }
   object.state='verified';await this.#save(work,row);
  }
  await this.#same(work,row);row.state='confirmed';await this.#save(work,row);return this.#view(row);
 });}
}
