import {canonical,equal,fail,digest} from '../core/ai-usage/contracts.js';
import {ASSIST_LIMITS} from '../core/ai-usage/assist-response.js';
const id=x=>typeof x==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(x);
// Dormant constructor-owned bridge. There is no worker RPC, Next authorization
// import, Settings writer or persistent reply body in this owner.
export class AssistReplyLease {
 #listeners=new Set();#leases=new Map();#caps=new WeakMap();#epoch=0;#access=false;#remote=false;#session=crypto.randomUUID();#accessEpoch=crypto.randomUUID();#remoteEpoch=crypto.randomUUID();#disposed=false;#last=0;
 constructor({runtimeId,tabs,probe,current,clock=()=>performance.now()}={}){this.runtimeId=runtimeId;this.tabs=tabs;this.probe=probe;this.current=current;this.clock=clock;}
 configure({replyAccess,remoteProcessing}){if(typeof replyAccess!=='boolean'||typeof remoteProcessing!=='boolean')fail();if(this.#access!==replyAccess||this.#remote!==remoteProcessing){this.#epoch++;this.#leases.clear();this.#caps=new WeakMap();for(const fn of this.#listeners){try{fn();}catch{}}if(this.#access!==replyAccess)this.#accessEpoch=crypto.randomUUID();if(this.#remote!==remoteProcessing)this.#remoteEpoch=crypto.randomUUID();}this.#access=replyAccess;this.#remote=remoteProcessing;}
 invalidate(){this.#epoch++;this.#leases.clear();this.#caps=new WeakMap();for(const fn of this.#listeners){try{fn();}catch{}}}
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
  row={key,host,b:structuredClone(b),binding,created:now,epoch,cap};this.#leases.set(key,row);this.#caps.set(cap,row);if(!this.#valid(row)){this.#leases.delete(key);fail('STALE_BASE');}return cap;
 }
 #valid(r){return !!r&&!this.#disposed&&this.#access&&this.#remote&&r.epoch===this.#epoch&&this.#leases.get(r.key)===r&&this.#now()-r.created<ASSIST_LIMITS.ttl&&typeof this.current==='function'&&this.current(r.host,r.b)===true;}
 isCurrent(cap){try{return this.#valid(this.#caps.get(cap));}catch{return false;}}
 metadata(cap){const r=this.#caps.get(cap);if(!this.#valid(r))fail('STALE_BASE');return {binding:structuredClone(r.binding),host:structuredClone(r.host),replyBinding:structuredClone(r.b)};}
 async snapshot(cap){const r=this.#caps.get(cap);if(!this.#valid(r))fail('STALE_BASE');const tab=await this.tabs.get(r.host.tabId);if(!this.#valid(r))fail('STALE_BASE');if(tab?.active!==true||tab?.incognito||tab?.url!==r.host.url)fail('STALE_BASE');const result=await this.probe(r.host,{snapshot:true});if(!this.#valid(r)||result?.ready!==true||!equal(result.binding,r.b))fail('STALE_BASE');return structuredClone(result.snapshot);}
 async evaluationKey(cap,dependencies,contractVersion,routeVersion){const r=this.#caps.get(cap);if(!this.#valid(r))fail('STALE_BASE');const key=await digest([this.#session,r.host,r.b,this.#accessEpoch,this.#remoteEpoch,dependencies,contractVersion,routeVersion]);if(!this.#valid(r))fail('STALE_BASE');return key;}
 dispose(){this.#disposed=true;for(const fn of this.#listeners){try{fn();}catch{}}this.#listeners.clear();this.#epoch++;this.#leases.clear();this.#caps=new WeakMap();}
}
