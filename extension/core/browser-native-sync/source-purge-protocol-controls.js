import {GOOGLE_APPDATA_SCOPE} from './providers/google-drive.js';
import {observeOriginalControlPublication,requireOriginalControlObservation} from '../indexed-store.js';
import {assertProtocolObjectReference,protocolObject} from './segments.js';
import {assertGroupedCheckpointManifest} from './group-checkpoint-manifest.js';
import {protocolPhysicalId} from './physical-key.js';
import {exact,hash,opaque,equal,fail,clone,digest,bytes} from './value.js';
const own=(v,keys)=>exact(v,keys)&&Object.keys(v).length===keys.length;
export const sourcePurgeRestoreKey=(core,restoreId)=>protocolPhysicalId(core.prefix,restoreId,'sourcePurgeRestore',[]);
// These records carry no canonical-write authority. Retain only the original
// transport allocation schemas and this owner's body-free progress schema.
// All other bns metadata still participates in the exact protocol comparison.
export function sourcePurgeProtocolControls(core,rows,namespace){
 const result=[];const prefix=core.prefix+'generation:'+namespace+':';
 for(const row of rows){
  const google=row.id?.startsWith(prefix+'google-appdata-allocation:'),one=row.id?.startsWith(prefix+'onedrive-upload-attempt:');
  if(google||one){const kind=google?'google-appdata-allocation':'onedrive-upload-attempt',parts=row.id.slice((prefix+kind+':').length).split(':');
   assertProtocolObjectReference(row.ref);if(parts.length!==2||!hash(parts[0])||parts[1]!==row.ref.id||row.id!==protocolPhysicalId(core.prefix,namespace,kind,parts))fail('BNS_SOURCE_PURGE_GROUP_UNSUPPORTED');
   if(google?!own(row,['id','file','ref'])||typeof row.file!=='string'||!/^[A-Za-z0-9_-]{1,256}$/.test(row.file):!own(row,['id','ref','phase','expiresAt'])||!['issued','session'].includes(row.phase)||(row.phase==='issued'?row.expiresAt!==null:!Number.isFinite(row.expiresAt)))fail('BNS_SOURCE_PURGE_GROUP_UNSUPPORTED');
   result.push(clone(row));continue;
  }
  if(row.id?.startsWith(core.prefix+'generation:')&&row.id.includes(':sourcePurgeRestore:')){
   if(!own(row,['id','version','restoreId','datasetId','deviceId','databaseId','namespace','epoch','manifestRef','manifest','phase','baseDigest','revisionIds'])||row.version!==1||!opaque(row.restoreId)||row.id!==sourcePurgeRestoreKey(core,row.restoreId)||row.datasetId!==core.datasetId||row.deviceId!==core.deviceId||typeof row.databaseId!=='string'||row.namespace!==namespace||row.epoch!==null&&typeof row.epoch!=='string'||!hash(row.baseDigest)||!['validated','activated'].includes(row.phase)||!Array.isArray(row.revisionIds)||row.revisionIds.length>128||row.revisionIds.some(x=>!hash(x))||new Set(row.revisionIds).size!==row.revisionIds.length)fail('BNS_SOURCE_PURGE_GROUP_UNSUPPORTED');
   assertProtocolObjectReference(row.manifestRef);assertGroupedCheckpointManifest(row.manifest,{core});if(row.manifestRef.kind!=='checkpoint-manifest'||!row.manifest.ownerScope.families.some(x=>x.type==='sourcePurgeIntent'&&x.count>0))fail('BNS_SOURCE_PURGE_GROUP_UNSUPPORTED');result.push(clone(row));
  }
 }
 return result;
}

export async function requireSourcePurgeProtocolControlReceipts(store,core,rows,namespace){
 const controls=sourcePurgeProtocolControls(core,rows,namespace),allocations=controls.filter(r=>!r.id.includes(':sourcePurgeRestore:'));
 for(const control of controls.filter(r=>r.id.includes(':sourcePurgeRestore:'))){if(control.databaseId!==store.databaseId||!equal((await protocolObject('checkpoint-manifest',bytes(control.manifest))).ref,control.manifestRef))fail('BNS_SOURCE_PURGE_GROUP_UNSUPPORTED');}
 if(!allocations.length)return controls;
 const key='paia-sync-checkpoint-publication:v1:'+await digest({datasetId:core.datasetId,deviceId:core.deviceId,databaseId:store.databaseId}),{token}=await observeOriginalControlPublication(store),row=(await store.local.get(key))[key];requireOriginalControlObservation(store,token);
 if(!row||bytes(row).length>256*1024||!own(row,['version','identity','taskId','state','cut','ref','parents','objects',...(Object.hasOwn(row,'previousObjects')?['previousObjects']:[])])||row.version!==1||!opaque(row.taskId)||!['prepared','publishing','confirmed'].includes(row.state)||!own(row.identity,['datasetId','deviceId','databaseId','namespace','binding'])||row.identity.datasetId!==core.datasetId||row.identity.deviceId!==core.deviceId||row.identity.databaseId!==store.databaseId||row.identity.namespace!==namespace||!Array.isArray(row.objects)||!row.objects.length||row.objects.length>4096)fail('BNS_SOURCE_PURGE_GROUP_UNSUPPORTED');
 const b=row.identity.binding,google=b?.provider==='google-drive-appdata',one=b?.provider==='onedrive-appfolder';
 if(!(google||one)||!own(b,['provider','subject','clientId','generation','scopes',...(one?['tenantId']:[])])||typeof b.subject!=='string'||!b.subject||typeof b.clientId!=='string'||!b.clientId||!opaque(b.generation)||!equal(b.scopes,[google?GOOGLE_APPDATA_SCOPE:'Files.ReadWrite.AppFolder'])||one&&b.tenantId!=='9188040d-6c67-4c5b-b112-36a304b66dad')fail('BNS_SOURCE_PURGE_GROUP_UNSUPPORTED');
 const identity=await digest({provider:google?'google-drive-appdata-v1':'onedrive-appfolder-v1',subject:b.subject,...(one?{tenantId:b.tenantId}:{}),clientId:b.clientId,datasetId:core.datasetId}),kind=google?'google-appdata-allocation':'onedrive-upload-attempt',refs=new Map();
 for(const object of row.objects){if(!own(object,['ref','state'])||!['ready','attempting','verified'].includes(object.state))fail('BNS_SOURCE_PURGE_GROUP_UNSUPPORTED');assertProtocolObjectReference(object.ref);if(refs.has(object.ref.id))fail('BNS_SOURCE_PURGE_GROUP_UNSUPPORTED');refs.set(object.ref.id,object.ref);}
 assertProtocolObjectReference(row.ref);if(!equal(row.objects.at(-1).ref,row.ref)||row.state==='confirmed'&&row.objects.some(x=>x.state!=='verified'))fail('BNS_SOURCE_PURGE_GROUP_UNSUPPORTED');
 const previous=row.previousObjects??[];if(!Array.isArray(previous)||previous.length>4096)fail('BNS_SOURCE_PURGE_GROUP_UNSUPPORTED');const priorIds=new Set();for(const ref of previous){assertProtocolObjectReference(ref);if(priorIds.has(ref.id)||refs.has(ref.id)&&!equal(refs.get(ref.id),ref))fail('BNS_SOURCE_PURGE_GROUP_UNSUPPORTED');priorIds.add(ref.id);refs.set(ref.id,ref);}
 for(const allocation of allocations)if(allocation.id!==protocolPhysicalId(core.prefix,namespace,kind,[identity,allocation.ref.id])||!equal(refs.get(allocation.ref.id)??null,allocation.ref))fail('BNS_SOURCE_PURGE_GROUP_UNSUPPORTED');
 return controls;
}
