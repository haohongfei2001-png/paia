// Test-only owned memory transport. No provider, external map, delete callback,
// filesystem path or production transport can be passed into this collector.
import {planCompaction} from '../../core/browser-native-sync/compaction.js';
import {assertProtocolObjectReference,readObject} from '../../core/browser-native-sync/segments.js';
import {GROUP_PAGE_LIMITS} from '../../core/browser-native-sync/group-page-reader.js';
import {clone,equal,fail} from '../../core/browser-native-sync/value.js';
export class SyntheticCompactionTransport{
 #objects=new Map();#pins=new Map();#version=0;#bytes=0;
 constructor(){if(arguments.length)fail('SYNTHETIC_TRANSPORT_ONLY');}
 async putImmutable(input,value){const ref=clone(input);assertProtocolObjectReference(ref);if(!(value instanceof Uint8Array))fail('BNS_OBJECT_INTEGRITY');const raw=value.slice();await readObject(ref,async()=>raw);const old=this.#objects.get(ref.id);if(old){if(!equal(old.ref,ref)||old.raw.length!==raw.length||old.raw.some((n,i)=>n!==raw[i]))fail('BNS_OBJECT_INTEGRITY');return;}if(this.#objects.size>=GROUP_PAGE_LIMITS.refs||this.#bytes+raw.length>GROUP_PAGE_LIMITS.bytes)fail('BNS_GROUP_RESOURCE_LIMIT');this.#objects.set(ref.id,{ref,raw});this.#bytes+=raw.length;this.#version++;}
 #read(input){const ref=clone(input);assertProtocolObjectReference(ref);const row=this.#objects.get(ref.id);if(!row||!equal(row.ref,ref))fail('SYNTHETIC_OBJECT_MISSING');return row.raw.slice();}
 async get(ref){return this.#read(ref);}
 inventory(){return [...this.#objects.values()].map(row=>clone(row.ref));}
 pinRestore(refs){if(!Array.isArray(refs)||refs.length===0||refs.length>GROUP_PAGE_LIMITS.refs||this.#pins.size>=GROUP_PAGE_LIMITS.refs)fail('SYNTHETIC_RESTORE_PIN');const ids=new Set();for(const ref of refs){this.#read(ref);ids.add(ref.id);}const token=Object.freeze({});this.#pins.set(token,ids);this.#version++;return token;}
 finishRestorePin(token){if(!this.#pins.delete(token))fail('SYNTHETIC_RESTORE_PIN');this.#version++;}
 async collect({older,newer}={}){
  const version=this.#version,descriptors=[...this.#objects.values()].filter(row=>row.ref.kind==='descriptor').map(row=>clone(row.ref)),pinned=[...new Set([...this.#pins.values()].flatMap(ids=>[...ids]))];
  const plan=await planCompaction({older,newer,descriptors,pinned,get:ref=>this.#read(ref)});
  // All mutable fake inventory and pin state is owned here. No await or user
  // callback occurs between this exact version check and bounded deletion.
  if(this.#version!==version)fail('SYNTHETIC_COLLECTION_CHANGED');
  if(plan.eligible.length>GROUP_PAGE_LIMITS.refs)fail('BNS_GROUP_RESOURCE_LIMIT');
  for(const ref of plan.eligible){const row=this.#objects.get(ref.id);if(!row||!equal(row.ref,ref)||!['descriptor','segment','chunk'].includes(ref.kind))fail('SYNTHETIC_COLLECTION_CHANGED');}
  const deleted=[];for(const ref of plan.eligible){this.#bytes-=this.#objects.get(ref.id).raw.length;this.#objects.delete(ref.id);deleted.push(ref.id);}if(deleted.length)this.#version++;
  return {state:'complete',performedDeletion:deleted.length>0,deleted,retainedCheckpoints:clone(plan.retainedCheckpoints),retained:clone(plan.retained),frontiers:clone(plan.frontiers),syntheticOnly:true};
 }
}
