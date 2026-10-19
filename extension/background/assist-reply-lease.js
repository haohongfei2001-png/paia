import {canonical,equal,fail,digest} from '../core/ai-usage/contracts.js';
import {ASSIST_LIMITS,assembleAssistPayload} from '../core/ai-usage/assist-response.js';
const processingOwners=new WeakMap(),processingWitnesses=new WeakMap(),processingSnapshots=new WeakMap();
const wallNow=Date.now.bind(Date),monoNow=performance.now.bind(performance);
const id=x=>typeof x==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(x);
// Original private lease, connected only by the distinct Assist commands.
// No Next authorization or persistent reply body enters this owner.
export class AssistReplyLease {
 #listeners=new Set();#leases=new Map();#caps=new WeakMap();#epoch=0;#access=false;#remote=false;#automatic=false;#session=crypto.randomUUID();#accessEpoch=crypto.randomUUID();#remoteEpoch=crypto.randomUUID();#disposed=false;#last=0;
 constructor({runtimeId,tabs,probe,current,clock=()=>performance.now()}={}){this.runtimeId=runtimeId;this.tabs=tabs;this.probe=probe;this.current=current;this.clock=clock;processingOwners.set(this,{check:cap=>this.#valid(this.#caps.get(cap)),facts:cap=>{const row=this.#caps.get(cap);return row&&!this.#disposed&&this.#access&&this.#remote&&row.epoch===this.#epoch&&this.#leases.get(row.key)===row?row:null;}});}
 configure({replyAccess,remoteProcessing,automatic=false}){if(typeof replyAccess!=='boolean'||typeof remoteProcessing!=='boolean'||typeof automatic!=='boolean')fail();if(this.#access!==replyAccess||this.#remote!==remoteProcessing||this.#automatic!==automatic){this.#epoch++;this.#leases.clear();this.#caps=new WeakMap();for(const fn of [...this.#listeners]){try{fn();}catch{}}if(this.#access!==replyAccess)this.#accessEpoch=crypto.randomUUID();if(this.#remote!==remoteProcessing)this.#remoteEpoch=crypto.randomUUID();}this.#access=replyAccess;this.#remote=remoteProcessing;this.#automatic=automatic;}
 invalidate(){this.#epoch++;this.#leases.clear();this.#caps=new WeakMap();for(const fn of [...this.#listeners]){try{fn();}catch{}}}
 onInvalidate(fn){if(typeof fn!=='function'||this.#listeners.size>=8)fail('RESOURCE_LIMIT');this.#listeners.add(fn);return ()=>this.#listeners.delete(fn);}
 #now(){const n=this.clock();if(!Number.isFinite(n)||n<0||n<this.#last){this.dispose();fail('UNAVAILABLE');}this.#last=n;return n;}
 #allowed(){if(this.#disposed||!this.#access||!this.#remote)fail('UNAVAILABLE');}
 #host(sender){if(sender?.id!==this.runtimeId||!Number.isInteger(sender.tab?.id)||sender.tab.incognito||sender.frameId!==0||!id(sender.documentId)||sender.documentLifecycle!=='active')fail('UNAVAILABLE');let u;try{u=new URL(sender.url);}catch{fail('UNAVAILABLE');}if(u.origin!=='https://chatgpt.com'||!/^\/c\/[a-zA-Z0-9_-]+$/.test(u.pathname)||u.search||u.hash)fail('UNAVAILABLE');return {tabId:sender.tab.id,documentId:sender.documentId,url:u.href};}
 async observe(sender){this.#allowed();const host=this.#host(sender),epoch=this.#epoch,tab=await this.tabs.get(host.tabId);if(epoch!==this.#epoch)fail('STALE_BASE');this.#allowed();if(tab?.active!==true||tab?.incognito||tab?.url!==host.url)fail('STALE_BASE');const observed=await this.probe(host,{snapshot:false});if(epoch!==this.#epoch)fail('STALE_BASE');this.#allowed();const b=observed?.binding;if(observed?.ready!==true||!b||b.url!==host.url||b.conversation!==new URL(host.url).pathname||!id(b.replyId)||!Number.isSafeInteger(b.cycle)||b.cycle<1||!Number.isSafeInteger(b.revision)||b.revision<1)fail('UNAVAILABLE');
  const key=canonical([host,b,this.#accessEpoch,this.#remoteEpoch]),now=this.#now();let row=this.#leases.get(key);if(row){if(!this.#valid(row))fail('STALE_BASE');return row.cap;}
  // Superseded replies are invalidated; an expired identical reply remains a
  // tombstone for this live session, never a new generation due to TTL alone.
  for(const [k,r] of this.#leases)if(r.host.documentId===host.documentId&&r.host.tabId===host.tabId&&k!==key)this.#leases.delete(k);
  if(this.#leases.size>=ASSIST_LIMITS.capacity)fail('RESOURCE_LIMIT');
  const cap=Object.freeze({}),binding={version:1,sessionId:this.#session,leaseId:crypto.randomUUID(),replyId:crypto.randomUUID(),replyGeneration:b.revision,consentEpoch:this.#remoteEpoch,permissionEpoch:this.#accessEpoch};
  row={key,host,b:structuredClone(b),binding,created:now,createdWall:wallNow(),createdMono:monoNow(),epoch,cap};this.#leases.set(key,row);this.#caps.set(cap,row);if(!this.#valid(row)){this.#leases.delete(key);fail('STALE_BASE');}return cap;
 }
 #valid(r){return !!r&&!this.#disposed&&this.#access&&this.#remote&&r.epoch===this.#epoch&&this.#leases.get(r.key)===r&&this.#now()-r.created<ASSIST_LIMITS.ttl&&typeof this.current==='function'&&this.current(r.host,r.b)===true;}
 automaticCurrent(cap){return this.#automatic&&this.isCurrent(cap);}
 isCurrent(cap){try{return this.#valid(this.#caps.get(cap));}catch{return false;}}
 metadata(cap){const r=this.#caps.get(cap);if(!this.#valid(r))fail('STALE_BASE');return {binding:structuredClone(r.binding),host:structuredClone(r.host),replyBinding:structuredClone(r.b)};}
 async snapshot(cap){const r=this.#caps.get(cap);if(!this.#valid(r))fail('STALE_BASE');const tab=await this.tabs.get(r.host.tabId);if(!this.#valid(r))fail('STALE_BASE');if(tab?.active!==true||tab?.incognito||tab?.url!==r.host.url)fail('STALE_BASE');const result=await this.probe(r.host,{snapshot:true});if(!this.#valid(r)||result?.ready!==true||!equal(result.binding,r.b))fail('STALE_BASE');const value=structuredClone(result.snapshot);if(value&&typeof value==='object'){const keys=Reflect.ownKeys(value),fields=Object.getOwnPropertyDescriptors(value);if(keys.length===4&&['completed','excluded','text','blocks'].every(k=>keys.includes(k)&&Object.hasOwn(fields[k],'value')))processingSnapshots.set(value,{owner:this,row:r,values:Object.fromEntries(keys.map(k=>[k,fields[k].value]))});}return value;}
 async replyKey(cap){const r=this.#caps.get(cap);if(!this.#valid(r))fail('STALE_BASE');const key=await digest([r.host.url,r.b.replyId]);if(!this.#valid(r))fail('STALE_BASE');return key;}
 async evaluationKey(cap,dependencies,contractVersion,routeVersion){const r=this.#caps.get(cap);if(!this.#valid(r))fail('STALE_BASE');const key=await digest([this.#session,r.host,r.b,this.#accessEpoch,this.#remoteEpoch,dependencies,contractVersion,routeVersion]);if(!this.#valid(r))fail('STALE_BASE');return key;}
 dispose(){this.#disposed=true;for(const fn of [...this.#listeners]){try{fn();}catch{}}this.#listeners.clear();this.#epoch++;this.#leases.clear();this.#caps=new WeakMap();}
}

// Private original-lease provenance only. A separate source policy must still
// grant exact Context fields. Native wall/monotonic bounds never renew a lease.
export function captureAssistReplyProcessing(owner,lease){
 const source=processingOwners.get(owner);if(!source)fail('UNAVAILABLE');
 const startedWall=wallNow(),startedMono=monoNow();if(source.check(lease)!==true)fail('UNAVAILABLE');
 const row=source.facts(lease);if(!row)fail('UNAVAILABLE');
 const witness=Object.freeze({});processingWitnesses.set(witness,{owner,lease,source,row,startedWall:row.createdWall,startedMono:row.createdMono,lastWall:startedWall,lastMono:startedMono,retired:false});
 if(!assistReplyProcessingCurrent(witness,owner,lease))fail('UNAVAILABLE');return witness;
}
function processingFacts(record,owner,lease){
 if(!record||record.retired||record.owner!==owner||record.lease!==lease||processingOwners.get(owner)!==record.source||record.source.facts(lease)!==record.row)return false;
 const wall=wallNow(),mono=monoNow();if(!Number.isFinite(wall)||!Number.isFinite(mono)||wall<record.lastWall||mono<record.lastMono||wall-record.startedWall>=ASSIST_LIMITS.ttl||mono-record.startedMono>=ASSIST_LIMITS.ttl){record.retired=true;return false;}
 record.lastWall=wall;record.lastMono=mono;return record.source.facts(lease)===record.row;
}
export function assistReplyProcessingFacts(witness,owner,lease){return processingFacts(processingWitnesses.get(witness),owner,lease);}
export function assistReplyProcessingCurrent(witness,owner,lease){
 const record=processingWitnesses.get(witness);if(!processingFacts(record,owner,lease))return false;
 let result;try{result=record.source.check(lease);}catch{record.retired=true;return false;}
 if(result!==true){record.retired=true;return false;}return processingFacts(record,owner,lease);
}
export function assistReplyProcessingMetadata(witness,owner,lease){
 if(!assistReplyProcessingCurrent(witness,owner,lease))fail('UNAVAILABLE');
 const record=processingWitnesses.get(witness);return {binding:structuredClone(record.row.binding),replyBinding:structuredClone(record.row.b),expiresAt:record.startedWall+ASSIST_LIMITS.ttl};
}

// Exact original host snapshot identity. A matching binding alone cannot let a
// caller substitute a different reply to broaden local Context discovery.
export function assistReplyProcessingSnapshot(witness,owner,lease,snapshot){
 if(!assistReplyProcessingCurrent(witness,owner,lease))fail('UNAVAILABLE');
 const record=processingWitnesses.get(witness),captured=processingSnapshots.get(snapshot);if(!captured||captured.owner!==owner||captured.row!==record.row)fail('UNAVAILABLE');
 const keys=Reflect.ownKeys(snapshot);if(keys.length!==4||!keys.every(k=>Object.hasOwn(captured.values,k)))fail('UNAVAILABLE');
 for(const key of keys){const d=Object.getOwnPropertyDescriptor(snapshot,key);if(!d||!Object.hasOwn(d,'value')||!Object.is(d.value,captured.values[key]))fail('UNAVAILABLE');}
 const value=captured.values;try{assembleAssistPayload(value,[]);}catch{fail('UNAVAILABLE');}if(value.completed!==true||value.excluded!==false||typeof value.text!=='string'||!value.text.trim()||[...value.text].length>ASSIST_LIMITS.replyCharacters||new TextEncoder().encode(value.text).byteLength>ASSIST_LIMITS.replyBytes||!Number.isInteger(value.blocks)||value.blocks<1||value.blocks>256)fail('UNAVAILABLE');
 if(!assistReplyProcessingFacts(witness,owner,lease))fail('UNAVAILABLE');return {...value};
}

export const isAssistReplyProcessingOwner=owner=>processingOwners.has(owner);
