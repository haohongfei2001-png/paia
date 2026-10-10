import {CONSENT_VERSION} from '../constants.js';
import {assertGroupedCheckpointManifest} from './group-checkpoint-manifest.js';
import {assertProtocolObjectReference,protocolObject,SEGMENT_PROFILE} from './segments.js';
import {protocolPhysicalId} from './physical-key.js';
import {bytes,count,equal,fail,hash,opaque} from './value.js';

const refused=()=>fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
function fields(value,names){
 if(!value||typeof value!=='object'||Array.isArray(value)||!Object.isFrozen(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Object.getOwnPropertySymbols(value).length||'toJSON'in value)refused();
 const keys=Object.getOwnPropertyNames(value);
 if(keys.length!==names.length||!keys.every(key=>names.includes(key)))refused();
 for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!Object.hasOwn(d,'value')||!d.enumerable)refused();}
}
// Frozen original native structured-clone trees only. No Proxy or native heap claim.
// Reject accessors before the original immutable encoder can observe a value.
function dataTree(value,depth=0){
 if(depth>12)refused();
 if(value===null||['string','boolean','number'].includes(typeof value))return;
 if(Array.isArray(value)){
  if(!Object.isFrozen(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>128||Object.getOwnPropertySymbols(value).length||'toJSON'in value||Object.getOwnPropertyNames(value).length!==value.length+1||Object.keys(value).length!==value.length)refused();
  for(let i=0;i<value.length;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d||!Object.hasOwn(d,'value')||!d.enumerable)refused();dataTree(d.value,depth+1);}return;
 }
 if(!value||typeof value!=='object'||!Object.isFrozen(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Object.getOwnPropertySymbols(value).length||'toJSON'in value)refused();
 const keys=Object.getOwnPropertyNames(value);if(keys.length>16)refused();
 for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!Object.hasOwn(d,'value')||!d.enumerable)refused();dataTree(d.value,depth+1);}
}
const namespace=value=>value==='initial'||opaque(value);

// UNUSED preparation until original native admission prepays every frame and
// authenticates the complete source cut. This void assertion neither consumes
// metadata nor grants Scope. Historical base counters and manifest families
// are deliberately not compared with a later, genuinely edited current plan.
export async function assertCompletedGroupedRestoreControl(row,{prefix,datasetId,active,namespace:currentNamespace,epoch}={}){
 if('value'in Object.prototype)refused();
 fields(row,['id','manifestId','manifestRef','manifest','phase','base','replayId','received','graphDigest','cleanup']);
 fields(active,['id','namespace','manifestId','graphDigest']);
 fields(row.cleanup,['namespace','after','complete']);
 fields(row.base,['namespace','generation','ownerGeneration','fence','settings']);
 fields(row.base.fence,['epoch','namespace','marker']);
 fields(row.base.settings,['consentVersion','consentAt','enabled','epoch']);
 dataTree(row.manifest);dataTree(row.manifestRef);
 if(!opaque(datasetId)||prefix!=='bns:v1:'+datasetId+':'||!opaque(currentNamespace)||epoch!==null&&!opaque(epoch)||active.id!==prefix+'active'||active.namespace!==currentNamespace||!hash(active.manifestId)||!hash(active.graphDigest))refused();
 const start=prefix+'generation:',end=':restore:';
 if(typeof row.id!=='string'||!row.id.startsWith(start)||!row.id.endsWith(end))refused();
 const stage=row.id.slice(start.length,-end.length);
 if(!opaque(stage)||stage===currentNamespace||row.id!==protocolPhysicalId(prefix,stage,'restore',[]))refused();
 if(row.phase!=='activated'||row.replayId!==currentNamespace||row.manifestId!==active.manifestId||row.graphDigest!==active.graphDigest||row.cleanup.namespace!==1||row.cleanup.after!==null||row.cleanup.complete!==true||!count(row.received)||row.received!==row.manifest.itemCount)refused();
 const b=row.base,f=b.fence,s=b.settings;
 if(!namespace(b.namespace)||b.namespace===currentNamespace||!count(b.generation)||!count(b.ownerGeneration)||f.namespace!==b.namespace||f.epoch!==epoch||typeof f.marker!=='boolean'||s.consentVersion!==CONSENT_VERSION||s.enabled!==true||!count(s.epoch)||typeof s.consentAt!=='string'||!Number.isFinite(Date.parse(s.consentAt)))refused();
 assertGroupedCheckpointManifest(row.manifest,{core:{datasetId}});
 assertProtocolObjectReference(row.manifest.root);
 assertProtocolObjectReference(row.manifestRef);
 if(row.manifest.root.kind!=='checkpoint-shard'||row.manifestRef.kind!=='checkpoint-manifest'||row.manifestRef.codec!=='identity')refused();
 // Re-encode the exact original immutable manifest, never trust merely equal
 // digest strings. This narrowed local profile refuses compressed manifests.
 // A future caller must prepay canonical UTF-8, original encoder copies and
 // digest/ref equality on its unchanged original live work ticket BEFORE here.
 const object=await protocolObject('checkpoint-manifest',bytes(row.manifest),{profile:SEGMENT_PROFILE});
 if(object.ref.id!==row.manifestId||!equal(object.ref,row.manifestRef))fail('BNS_OBJECT_INTEGRITY');
}
