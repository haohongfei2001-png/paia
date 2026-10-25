import {sourcePurgeProtocolControls} from './source-purge-protocol-controls.js';
import {protocolPhysicalId} from './physical-key.js';
import {measureSourceWorkingPhysicalTree} from './source-working-physical.js';
import {assertSourceBootstrapUnionSelection} from './source-bootstrap-union.js';
import {requireCheckpointRevisionRetention} from './source-purge-group.js';
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
// Fixed producer-private accounting identity. Consumers can restrict this
// invocation but cannot create, renew or substitute its existing outer ledger.
const publicationWorkBindings=new WeakMap();
function originalPublicationWork(token,core,store){
 const p=publicationWorkBindings.get(token);if(!p||p.core!==core||p.store!==store||core.repository!==p.repository||store.repository!==p.repository||store.databaseId!==p.databaseId)fail('BNS_CHECKPOINT_PUBLICATION_BINDING');p.current();return p;
}
export function requireOriginalCheckpointPublicationCleanup(token,core,store){return originalPublicationWork(token,core,store).work.action==='prepare';}
export function chargeOriginalCheckpointPublicationWork(token,core,store,value,references=1){
 const p=originalPublicationWork(token,core,store);if(!Number.isSafeInteger(references)||references<0)fail('BNS_CHECKPOINT_PUBLICATION_LIMIT');p.work.refs+=references;if(value!==undefined)p.work.bytes+=measureSourceWorkingPhysicalTree(value).B;
 if(p.work.refs>LIMIT.refs||p.work.bytes>LIMIT.bytes)fail('BNS_CHECKPOINT_PUBLICATION_LIMIT');p.current();
}
export function requireOriginalCheckpointPublicationControls(token,core,store,rows,namespace){
 const p=originalPublicationWork(token,core,store),row=p.work.journal;chargeOriginalCheckpointPublicationWork(token,core,store,rows,rows.length);
 const controls=sourcePurgeProtocolControls(core,rows,namespace);if(controls.length!==rows.length)fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');if(!rows.length)return;
 if(!row||row.identity.namespace!==namespace||!equal(row.identity.binding,p.binding)||!p.work.transportIdentity)fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');
 chargeOriginalCheckpointPublicationWork(token,core,store,row);const refs=new Map([...(row.previousObjects??[]),...row.objects.map(object=>object.ref)].map(ref=>[ref.id,ref]));
 const kind=p.binding.provider==='google-drive-appdata'?'google-appdata-allocation':'onedrive-upload-attempt';
 for(const control of controls)if(control.id!==protocolPhysicalId(core.prefix,namespace,kind,[p.work.transportIdentity,control.ref.id])||!equal(refs.get(control.ref.id),control.ref))fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');
}

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
 async #exclusive(fn){this.#check();if(locks.has(this.#local))fail('BNS_CHECKPOINT_PUBLICATION_BUSY');locks.add(this.#local);const work={serial:this.#serial,deadline:performance.now()+this.#timeout,bytes:0,refs:0,unsettled:new Set()};this.#active=work;work.publicationToken=Object.freeze({});publicationWorkBindings.set(work.publicationToken,{core:this.#core,store:this.#store,repository:this.#core.repository,databaseId:this.#store.databaseId,binding:this.#binding,work,current:()=>this.#check(work)});
  try{return await fn(work);}finally{publicationWorkBindings.delete(work.publicationToken);this.#transport?.close();this.#transport=null;this.#active=null;this.#row=null;const release=()=>locks.delete(this.#local);if(work.unsettled.size)Promise.allSettled([...work.unsettled]).then(release);else release();}
 }
 #adapter(){if(this.#transport)return;const work=this.#active;const {provider,...binding}=this.#binding,C=provider==='google-drive-appdata'?GoogleDriveAppDataTransport:OneDriveAppFolderTransport;
  this.#transport=new C(this.#core,{binding,request:this.#request,isCurrent:()=>!this.#paused&&!this.#closed&&this.#active===work&&work.serial===this.#serial&&this.#current(clone(this.#binding))===true,dispatchQualification:async({method})=>{
   this.#check(work);if(!work)fail('BNS_CHECKPOINT_PUBLICATION_INTERRUPTED');
   if(method==='POST'||method==='PUT'){if(!this.#row)fail('BNS_CHECKPOINT_PUBLICATION_NOT_PREPARED');const prepared=await this.#same(work,this.#row,true);return()=>{this.#check(work);requireGroupedCheckpointDispatchCut(this.#core,this.#store,prepared.result);};}
   return()=>this.#check(work);
  }});
 }
 async #identity(work){await this.#await(work,()=>this.#store.finishFoundation());publicationWorkBindings.get(work.publicationToken).databaseId=this.#store.databaseId;await this.#await(work,()=>observeOriginalControlPublication(this.#store));const identity={datasetId:this.#core.datasetId,deviceId:this.#core.deviceId,databaseId:this.#store.databaseId,namespace:await this.#await(work,()=>this.#core.namespace()),binding:this.#binding};this.#adapter();this.#key=KEY+await digest({datasetId:identity.datasetId,deviceId:identity.deviceId,databaseId:identity.databaseId});
  const {provider,subject,clientId,tenantId}=this.#binding,input={provider:provider==='google-drive-appdata'?'google-drive-appdata-v1':'onedrive-appfolder-v1',subject,...(tenantId?{tenantId}:{}),clientId,datasetId:this.#core.datasetId};chargeOriginalCheckpointPublicationWork(work.publicationToken,this.#core,this.#store,input);work.transportIdentity=await this.#await(work,()=>digest(input));return identity;}
 async #load(work,identity){const {token}=await this.#await(work,()=>observeOriginalControlPublication(this.#store));const row=(await this.#await(work,()=>this.#get.call(this.#local,this.#key)))[this.#key]??null;requireOriginalControlObservation(this.#store,token);if(row===null){work.journal=null;return null;}
  if(bytes(row).length>256*1024||!exact(row,['version','identity','taskId','state','cut','ref','parents','objects','previousObjects'])||row.version!==1||!equal(row.identity,identity)||!opaque(row.taskId)||!['prepared','publishing','confirmed'].includes(row.state)||!Array.isArray(row.objects)||row.objects.length<1||row.objects.length>LIMIT.refs||!Array.isArray(row.parents)||row.parents.length>2||row.parents.some(x=>!hash(x))||new Set(row.parents).size!==row.parents.length||!equal(row.parents,[...row.parents].sort()))fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');
  if(row.previousObjects!==undefined){if(!Array.isArray(row.previousObjects)||row.previousObjects.length>LIMIT.refs)fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');const seen=new Set();for(const ref of row.previousObjects){assertProtocolObjectReference(ref);if(seen.has(ref.id))fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');seen.add(ref.id);}}
  const ids=new Set();for(const object of row.objects){if(!exact(object,['ref','state'])||!['ready','attempting','verified'].includes(object.state))fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');assertProtocolObjectReference(object.ref);if(ids.has(object.ref.id))fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');ids.add(object.ref.id);}
  if(row.state==='confirmed'&&row.objects.some(x=>x.state!=='verified')||row.state==='prepared'&&row.objects.some(x=>x.state!=='ready'))fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');
  let pending=false,attempting=false;for(const object of row.objects){if(object.state==='verified'&&pending||object.state==='attempting'&&attempting)fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');if(object.state!=='verified')pending=true;if(object.state==='attempting')attempting=true;}
  assertProtocolObjectReference(row.ref);if(row.ref.kind!=='checkpoint-manifest'||!equal(row.ref,row.objects.at(-1).ref))fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');work.journal=clone(row);return clone(row);
 }
 async #save(work,row){if(bytes(row).length>256*1024)fail('BNS_CHECKPOINT_PUBLICATION_LIMIT');const {token}=await this.#await(work,()=>observeOriginalControlPublication(this.#store));let error;
  try{await this.#await(work,()=>{const pending=Promise.resolve(this.#set.call(this.#local,{[this.#key]:clone(row)}));work.unsettled.add(pending);pending.then(()=>work.unsettled.delete(pending),()=>work.unsettled.delete(pending));return pending;});}catch(e){error=e;}
  // One exact readback settles a lost local set acknowledgement. Never retry
  // the write, grant a new identity, or proceed after an ambiguous result.
  this.#check(work);const actual=(await this.#await(work,()=>this.#get.call(this.#local,this.#key)))[this.#key];requireOriginalControlObservation(this.#store,token);if(!equal(actual??null,row))throw error??new SyncError('BNS_CHECKPOINT_PUBLICATION_JOURNAL');work.journal=clone(row);
 }
 #charge(work,ref){assertProtocolObjectReference(ref);work.refs++;work.bytes+=ref.encodedBytes+ref.decodedBytes;if(work.refs>LIMIT.refs||work.bytes>LIMIT.bytes)fail('BNS_CHECKPOINT_PUBLICATION_LIMIT');this.#check(work);}
 async #remote(work,ref){this.#charge(work,ref);return this.#await(work,()=>readObject(ref,r=>this.#transport.get(r)));}
 async #head(work){const transport={get:async ref=>{this.#charge(work,ref);return this.#await(work,()=>this.#transport.get(ref));},listCheckpoints:async options=>{this.#check(work);if(++work.refs>LIMIT.refs)fail('BNS_CHECKPOINT_PUBLICATION_LIMIT');const page=await this.#await(work,()=>this.#transport.listCheckpoints(options));work.bytes+=bytes(page).length;if(work.bytes>LIMIT.bytes)fail('BNS_CHECKPOINT_PUBLICATION_LIMIT');return page;}};const recovery=new LocalSyncRecoverySession(this.#core,{store:this.#store,transport,discoveryTimeoutMs:Math.max(1,Math.min(this.#timeout,Math.floor(work.deadline-performance.now())))});try{return await this.#await(work,()=>recovery.discoverPublicationParents({publicationWork:work.publicationToken}));}catch(e){if(e?.code==='BNS_RECOVERY_REMOTE_MISSING'){const active=await this.#await(work,()=>this.#core.transaction(false,t=>t.get('meta',this.#core.prefix+'active')));if(active?.selection?.kind==='source-bootstrap-union')fail('BNS_CHECKPOINT_PUBLICATION_REMOTE_CHANGED');return null;}throw e;}finally{recovery.close();}}
 #headRefs(head){if(!head)return [];if(head.kind==='source-bootstrap-union'){assertSourceBootstrapUnionSelection(head);return head.headRefs;}return [head];}
 async #prepareObjects(work,parents,publicationFinalCut=false){const objects=new Map();let retained=0;
  const local={putImmutable:async(ref,raw)=>{this.#check(work);assertProtocolObjectReference(ref);if(!(raw instanceof Uint8Array)||raw.length!==ref.encodedBytes)fail('BNS_OBJECT_INTEGRITY');const old=objects.get(ref.id);if(old){if(!equal(old.ref,ref)||await digest(raw)!==ref.id)fail('BNS_OBJECT_INTEGRITY');return;}retained+=2*raw.length+bytes(ref).length;if(objects.size>=LIMIT.refs||retained>LIMIT.bytes)fail('BNS_CHECKPOINT_PUBLICATION_LIMIT');if(await digest(raw)!==ref.id)fail('BNS_OBJECT_INTEGRITY');objects.set(ref.id,{ref:clone(ref),bytes:raw.slice()});},get:async ref=>{this.#check(work);const value=objects.get(ref.id);if(!value||!equal(value.ref,ref))fail('BNS_OBJECT_NOT_FOUND');return value.bytes.slice();}};
  let sourcePurgeProjection=false;for await(const row of this.#core.rows('revision')){if(row.operation.type==='sourcePurgeIntent')sourcePurgeProjection=true;}
  const result=await this.#await(work,()=>buildCheckpoint(this.#core,local,{grouped:{store:this.#store,dispatchQualification:true,sourcePurgeProjection,publicationWork:work.publicationToken,publicationFinalCut},parents}));
  if(!objects.has(result.ref.id)||!result.manifest.ownerScope)fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');
  // Keep the encoder's complete map for its original local readback and for
  // exact old journals. New tasks omit only the authenticated, unreferenced
  // intermediate manifest, never a shard, chunk, parent or arbitrary subset.
  const final=objects.get(result.ref.id);objects.delete(result.ref.id);objects.set(result.ref.id,final);
  const expected=clone(result.manifest);delete expected.ownerScope;
  chargeOriginalCheckpointPublicationWork(work.publicationToken,this.#core,this.#store,expected);
  let intermediate=null;
  for(const object of objects.values())if(object.ref.kind==='checkpoint-manifest'&&object.ref.id!==result.ref.id){
   this.#charge(work,object.ref);
   const value=decodeJSON(await this.#await(work,()=>readObject(object.ref,local.get)),SEGMENT_PROFILE.decoded);
   chargeOriginalCheckpointPublicationWork(work.publicationToken,this.#core,this.#store,value);
   if(equal(value,expected)){
    if(intermediate!==null||result.manifest.parents.includes(object.ref.id)||result.manifest.root.id===object.ref.id)fail('BNS_CHECKPOINT_PUBLICATION_JOURNAL');
    intermediate=object.ref.id;
   }
  }
  const outbound=new Map(objects);if(intermediate!==null)outbound.delete(intermediate);
  return {result,objects:outbound,fullObjects:objects,local};
 }
 async #causal(work,prepared,parent){if(!parent)return;const manifest=decodeJSON(await this.#remote(work,parent),SEGMENT_PROFILE.decoded),old=[];for await(const item of checkpointItems(manifest,ref=>this.#remote(work,ref))){if(++work.refs>LIMIT.refs||(work.bytes+=bytes(item).length)>LIMIT.bytes)fail('BNS_CHECKPOINT_PUBLICATION_LIMIT');if(item.kind==='revision')old.push(item);}
  const next=[];for await(const item of checkpointItems(prepared.result.manifest,prepared.local.get)){if(++work.refs>LIMIT.refs||(work.bytes+=bytes(item).length)>LIMIT.bytes)fail('BNS_CHECKPOINT_PUBLICATION_LIMIT');next.push(item);}
  await requireCheckpointRevisionRetention(this.#core,old,next,'BNS_CHECKPOINT_PUBLICATION_CAUSAL');
 }
 async #same(work,row,finalCut=false){
  const prepared=await this.#prepareObjects(work,row.parents,finalCut),refs=row.objects.map(x=>x.ref);
  if(!equal(prepared.result.ref,row.ref)||!equal(prepared.result.cut,row.cut))fail('BNS_CHECKPOINT_PUBLICATION_CUT_CHANGED');
  if(equal([...prepared.objects.values()].map(x=>x.ref),refs))return prepared;
  // An old task keeps its complete original ordered vector and every object's
  // durable attempting/verified state. No migration, omitted GET or replay.
  if(equal([...prepared.fullObjects.values()].map(x=>x.ref),refs))return {...prepared,objects:prepared.fullObjects};
  fail('BNS_CHECKPOINT_PUBLICATION_CUT_CHANGED');
 }
 async status(){return this.#exclusive(async work=>{const identity=await this.#identity(work),row=await this.#load(work,identity);return row?this.#view(row):{state:'idle',readiness:'not-prepared'};});}
 #view(row){return {state:row.state,taskId:row.taskId,ref:clone(row.ref),readiness:row.state==='confirmed'?'recoverable-checkpoint-confirmed':'checkpoint-publication-incomplete',verified:row.objects.filter(x=>x.state==='verified').length,objects:row.objects.length};}
 async prepare(){return this.#exclusive(async work=>{work.action='prepare';const identity=await this.#identity(work),previous=await this.#load(work,identity);if(previous&&previous.state!=='confirmed')return this.#view(previous);
  const head=await this.#head(work),parentRefs=this.#headRefs(head),parents=parentRefs.map(ref=>ref.id).sort();const prepared=await this.#prepareObjects(work,parents);for(const parent of parentRefs)await this.#causal(work,prepared,parent);
  const row={version:1,identity,taskId:crypto.randomUUID(),state:'prepared',cut:clone(prepared.result.cut),ref:clone(prepared.result.ref),parents,previousObjects:[...new Map([...(previous?.previousObjects??[]),...(previous?.objects??[]).map(x=>x.ref)].map(ref=>[ref.id,ref])).values()],objects:[...prepared.objects.values()].map(x=>({ref:x.ref,state:'ready'}))};await this.#save(work,row);return this.#view(row);
 });}
 async publish(){return this.#exclusive(async work=>{const identity=await this.#identity(work),row=await this.#load(work,identity);if(!row)fail('BNS_CHECKPOINT_PUBLICATION_NOT_PREPARED');this.#row=row;
  // Reauthenticate parents and bind the private union cut before rebuilding.
  // Rebuild under the original compiler before any network write; a deleted
  // body, new local edit, namespace switch or changed graph cannot reuse a cut.
  const head=await this.#head(work),parentRefs=this.#headRefs(head);let prepared=await this.#same(work,row);if(head?.id!==row.ref.id&&!equal(parentRefs.map(ref=>ref.id).sort(),row.parents))fail('BNS_CHECKPOINT_PUBLICATION_REMOTE_CHANGED');if(head?.kind==='source-bootstrap-union')for(const parent of parentRefs)await this.#causal(work,prepared,parent);
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
  await this.#same(work,row,true);row.state='confirmed';await this.#save(work,row);return this.#view(row);
 });}
}
