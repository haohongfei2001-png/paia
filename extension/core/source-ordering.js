import {ArchiveError} from './constants.js';
import {hashText} from './dedupe.js';
import {projectRef} from './source-structure-model.js';
import * as K from './read-projection-keys.js';

export const SOURCE_ORDER_PREFIX='ans:order:v1:';
export const SOURCE_ORDER_UI_ID='ans:ui:v1';
export const SOURCE_ORDER_BATCH=100;
export const SOURCE_ORDER_MAX_REFS=10000;
const DAY=24*60*60*1000,FUTURE_SKEW=5*60*1000;
const invalid=(code='INVALID_REQUEST')=>{throw new ArchiveError(code);};
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const exact=(value,allowed,required=[])=>{if(!plain(value)||Object.keys(value).some(k=>!allowed.includes(k))||required.some(k=>!Object.hasOwn(value,k)))invalid();return value;};
const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(Date.parse(value)).toISOString()===value;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const scopeRef=(kind,value)=>{
 if(kind==='projects'){if(value!==null&&value!==undefined)invalid();return null;}
 if(kind!=='windows')invalid();
 return value==null?null:projectRef(value);
};
const requestShape=(value={})=>{
 exact(value,['providerKey','namespace','scopeKind','scopeRef','archiveGeneration','now'],['providerKey','namespace','scopeKind']);
 const providerKey=K.provider(value.providerKey),namespace=K.provider(value.namespace),kind=value.scopeKind;
 if(!['projects','windows'].includes(kind))invalid();
 const now=value.now===undefined?Date.now():value.now;if(!Number.isSafeInteger(now))invalid();
 return {providerKey,namespace,scopeKind:kind,scopeRef:scopeRef(kind,value.scopeRef),archiveGeneration:value.archiveGeneration??null,now};
};
export function sourceOrderRefToken(value,kind,providerKey,namespace){
 if(kind==='projects'){const ref=projectRef(value);if(ref.providerKey!==providerKey||ref.namespace!==namespace)invalid('SOURCE_ORDER_CONFLICT');return JSON.stringify(['project',ref.providerKey,ref.namespace,ref.projectId]);}
 exact(value,['providerKey','namespace','sourceConversationId'],['providerKey','namespace','sourceConversationId']);
 if(K.provider(value.providerKey)!==providerKey||K.provider(value.namespace)!==namespace)invalid('SOURCE_ORDER_CONFLICT');
 const id=K.identifier(value.sourceConversationId);return JSON.stringify(['window',providerKey,namespace,id]);
}
export function validateSourceOrderResult(value,request={}){
 const q=requestShape(request);
 if(!plain(value)||!['available','unavailable'].includes(value.availability))invalid();
 if(value.availability==='unavailable'){
  exact(value,['availability','reasonCode','lastObservedAt'],['availability','reasonCode']);
  if(typeof value.reasonCode!=='string'||!value.reasonCode||value.reasonCode.length>128)invalid();
  if(value.lastObservedAt!=null&&!iso(value.lastObservedAt))invalid();
  return {availability:'unavailable',providerKey:q.providerKey,namespace:q.namespace,scopeKind:q.scopeKind,scopeRef:q.scopeRef,reasonCode:value.reasonCode,lastObservedAt:value.lastObservedAt??null};
 }
 exact(value,['availability','providerKey','namespace','scopeKind','scopeRef','orderedRefs','contractId','contractVersion','evidenceKind','observationId','observedAt','expiresAt','effectiveExpiresAt','completeness','generation'],
  ['availability','providerKey','namespace','scopeKind','scopeRef','orderedRefs','contractId','contractVersion','evidenceKind','observationId','observedAt','expiresAt','completeness','generation']);
 if(K.provider(value.providerKey)!==q.providerKey||K.provider(value.namespace)!==q.namespace||value.scopeKind!==q.scopeKind||!same(scopeRef(value.scopeKind,value.scopeRef),q.scopeRef))invalid('SOURCE_ORDER_CONFLICT');
 if(!Array.isArray(value.orderedRefs)||value.orderedRefs.length>SOURCE_ORDER_MAX_REFS||!['complete_scope','proven_rank_subset'].includes(value.completeness))invalid();
 if(typeof value.contractId!=='string'||!value.contractId||value.contractId.length>128||!Number.isSafeInteger(value.contractVersion)||value.contractVersion<1)invalid();
 if(typeof value.evidenceKind!=='string'||!value.evidenceKind||value.evidenceKind.length>128||typeof value.observationId!=='string'||!value.observationId||value.observationId.length>160)invalid();
 if(!iso(value.observedAt)||!iso(value.expiresAt))invalid();
 const observed=Date.parse(value.observedAt),expires=Date.parse(value.expiresAt),effectiveExpiresAt=new Date(Math.min(expires,observed+DAY)).toISOString();
 if(observed>q.now+FUTURE_SKEW||expires<=observed||value.effectiveExpiresAt!==undefined&&value.effectiveExpiresAt!==effectiveExpiresAt)invalid();
 if(!(typeof value.generation==='string'&&value.generation.length&&value.generation.length<=160||Number.isSafeInteger(value.generation)&&value.generation>=0))invalid();
 const refs=[],tokens=new Set();for(const ref of value.orderedRefs){const token=sourceOrderRefToken(ref,value.scopeKind,q.providerKey,q.namespace);if(tokens.has(token))invalid('SOURCE_ORDER_CONFLICT');tokens.add(token);refs.push(structuredClone(ref));}
 return {availability:'available',providerKey:q.providerKey,namespace:q.namespace,scopeKind:q.scopeKind,scopeRef:q.scopeRef,orderedRefs:refs,contractId:value.contractId,contractVersion:value.contractVersion,evidenceKind:value.evidenceKind,observationId:value.observationId,observedAt:value.observedAt,expiresAt:value.expiresAt,effectiveExpiresAt,completeness:value.completeness,generation:value.generation};
}
export function unavailableSourceOrderProvider(reasonCode='UNVERIFIED'){
 return Object.freeze({status:()=>({availability:'unavailable',reasonCode}),getOrder:async()=>({availability:'unavailable',reasonCode,lastObservedAt:null})});
}
export class SourceOrderRegistry{
 constructor(entries=[]){this.providers=new Map();for(const [key,provider] of entries)this.register(key,provider);}
 register(key,provider){key=K.provider(key);if(!provider||typeof provider.getOrder!=='function'||this.providers.has(key))invalid();this.providers.set(key,provider);return this;}
 status(key){key=K.provider(key);const provider=this.providers.get(key);return provider?.status?.()||{availability:'unavailable',reasonCode:'PROVIDER_UNAVAILABLE'};}
 async getOrder(options){const q=requestShape(options),provider=this.providers.get(q.providerKey);if(!provider)return {...q,availability:'unavailable',reasonCode:'PROVIDER_UNAVAILABLE',lastObservedAt:null};return validateSourceOrderResult(await provider.getOrder(q),q);}
}
const pointerPrefix=(providerKey,kind)=>SOURCE_ORDER_PREFIX+'pointer:'+K.stringKey(providerKey)+K.stringKey(kind);
const pointerId=(providerKey,kind,namespace,token)=>pointerPrefix(providerKey,kind)+K.stringKey(namespace)+token;
const batchId=(token,generation,index)=>SOURCE_ORDER_PREFIX+'batch:'+token+':'+generation+':'+String(index).padStart(4,'0');
const projectionStateId=hash=>SOURCE_ORDER_PREFIX+'projection:'+hash;
const projectionPagePrefix=(hash,generation)=>SOURCE_ORDER_PREFIX+'page:'+hash+':'+generation+':';
const orderToken=async value=>hashText(JSON.stringify([value.providerKey,value.namespace,value.scopeKind,value.scopeRef]));
const storageGeneration=async value=>hashText(JSON.stringify([value.contractId,value.contractVersion,value.observationId,value.generation,value.orderedRefs]));
const unavailable=(q,reason,last=null)=>({availability:'unavailable',providerKey:q.providerKey,namespace:q.namespace,scopeKind:q.scopeKind,scopeRef:q.scopeRef,reasonCode:reason,lastObservedAt:last});
export class SourceOrderStore{
 constructor(store,{checkpoint=async()=>{}}={}){if(!store?.repository)invalid();this.store=store;this.repository=store.repository;this.checkpoint=checkpoint;}
 async observe(value,{now=Date.now()}={}){
  await this.store.finishFoundation?.();
  const q={providerKey:value?.providerKey,namespace:value?.namespace,scopeKind:value?.scopeKind,scopeRef:value?.scopeRef,now},order=validateSourceOrderResult(value,q);
  if(order.availability!=='available')invalid();
  const token=await orderToken(order),generation=await storageGeneration(order),batchCount=Math.ceil(order.orderedRefs.length/SOURCE_ORDER_BATCH);
  return this.store.run(async()=>{
   for(let i=0;i<batchCount;i++){
    const refs=order.orderedRefs.slice(i*SOURCE_ORDER_BATCH,(i+1)*SOURCE_ORDER_BATCH);
    await this.repository.transaction(true,t=>t.put('meta',{id:batchId(token,generation,i),version:1,kind:'source_order_batch',refs}));
    await this.checkpoint('batch',{index:i,count:refs.length,generation});
   }
   const id=pointerId(order.providerKey,order.scopeKind,order.namespace,token),old=await this.repository.transaction(false,t=>t.get('meta',id));
   const pointer={...order,id,kind:'source_order_pointer',version:1,orderedRefs:undefined,storageGeneration:generation,batchCount,totalRefs:order.orderedRefs.length};
   delete pointer.orderedRefs;await this.checkpoint('beforePointer',pointer);
   await this.repository.transaction(true,t=>t.put('meta',pointer));await this.checkpoint('pointer',pointer);
   if(old?.storageGeneration&&old.storageGeneration!==generation)for(let start=0;start<(old.batchCount||0);start+=SOURCE_ORDER_BATCH)await this.repository.transaction(true,async t=>{for(let i=start;i<Math.min(start+SOURCE_ORDER_BATCH,old.batchCount);i++)await t.delete('meta',batchId(token,old.storageGeneration,i));});
   return {availability:'available',observationId:order.observationId,generation:order.generation,totalRefs:order.orderedRefs.length};
  });
 }
 async _load(pointer,now){
  const q={providerKey:pointer.providerKey,namespace:pointer.namespace,scopeKind:pointer.scopeKind,scopeRef:pointer.scopeRef,now};
  const observed=Date.parse(pointer.observedAt),effective=Date.parse(pointer.effectiveExpiresAt||pointer.expiresAt);
  if(observed>now)return unavailable(q,'CLOCK_ROLLBACK',pointer.observedAt);
  if(now>effective)return unavailable(q,'STALE',pointer.observedAt);
  if(!Number.isInteger(pointer.batchCount)||pointer.batchCount<0||pointer.batchCount>Math.ceil(SOURCE_ORDER_MAX_REFS/SOURCE_ORDER_BATCH)||!Number.isInteger(pointer.totalRefs)||pointer.totalRefs<0||pointer.totalRefs>SOURCE_ORDER_MAX_REFS)return unavailable(q,'CORRUPT_CACHE',pointer.observedAt);
  const token=await orderToken(pointer),refs=[];
  for(let i=0;i<pointer.batchCount;i++){const row=await this.repository.transaction(false,t=>t.get('meta',batchId(token,pointer.storageGeneration,i)));if(!row||!Array.isArray(row.refs)||row.refs.length>SOURCE_ORDER_BATCH)return unavailable(q,'PARTIAL_GENERATION',pointer.observedAt);refs.push(...row.refs);}
  if(refs.length!==pointer.totalRefs)return unavailable(q,'PARTIAL_GENERATION',pointer.observedAt);
  try{return validateSourceOrderResult({availability:'available',providerKey:pointer.providerKey,namespace:pointer.namespace,scopeKind:pointer.scopeKind,scopeRef:pointer.scopeRef,orderedRefs:refs,contractId:pointer.contractId,contractVersion:pointer.contractVersion,evidenceKind:pointer.evidenceKind,observationId:pointer.observationId,observedAt:pointer.observedAt,expiresAt:pointer.expiresAt,completeness:pointer.completeness,generation:pointer.generation},q);}catch{return unavailable(q,'CORRUPT_CACHE',pointer.observedAt);}
 }
 async active(options){const q=requestShape(options),token=await orderToken(q),id=pointerId(q.providerKey,q.scopeKind,q.namespace,token),pointer=await this.repository.transaction(false,t=>t.get('meta',id));return pointer?this._load(pointer,q.now):unavailable(q,'SOURCE_ORDER_UNAVAILABLE');}
 async activeProjects(providerKey,{now=Date.now()}={}){
  providerKey=K.provider(providerKey);const prefix=pointerPrefix(providerKey,'projects'),page=await this.repository.transaction(false,t=>t.primaryRangePage('meta',{prefix,limit:100}));
  if(page.next!==null)return {availability:'unavailable',providerKey,reasonCode:'NAMESPACE_CONFLICT',lastObservedAt:null};
  const available=[];let fallback=null;for(const {value}of page.rows){const item=await this._load(value,now);if(item.availability==='available')available.push(item);else fallback??=item;}
  if(available.length>1)return {availability:'unavailable',providerKey,reasonCode:'NAMESPACE_CONFLICT',lastObservedAt:null};
  return available[0]||fallback||{availability:'unavailable',providerKey,reasonCode:'SOURCE_ORDER_UNAVAILABLE',lastObservedAt:null};
 }
}
function sourceSort(member,q,order,ranks){
 if(q.groupKind==='groups'){
  if(member.item.groupKind!=='project'||!member.sort.startsWith('0'))return {sort:member.sort,conflict:false};
  const ref=member.item.projectRef;if(!ref||ref.providerKey!==order.providerKey||ref.namespace!==order.namespace)return {sort:member.sort,conflict:true};
  const rank=ranks.get(sourceOrderRefToken(ref,'projects',order.providerKey,order.namespace));return {sort:'0'+(rank===undefined?K.unrankedKey(member.sort):K.rankKey(rank)),conflict:false};
 }
 if(q.groupKind==='project'){
  const ref=member.item.conversationRef;if(!ref||ref.platform!==order.providerKey)return {sort:member.sort,conflict:true};
  const token=sourceOrderRefToken({providerKey:order.providerKey,namespace:order.namespace,sourceConversationId:ref.sourceConversationId},'windows',order.providerKey,order.namespace),rank=ranks.get(token);
  return {sort:rank===undefined?K.unrankedKey(member.sort):K.rankKey(rank),conflict:false};
 }
 return {sort:member.sort,conflict:true};
}
const paiaContext=(state,reason=null)=>({effectiveOrdering:'paia',unavailableReason:reason,generation:state.active,prefix:K.pagePrefix(state.hash,state.active),sourceRefsScanned:0});
export class SourceOrderProjection{
 constructor(store,orders=new SourceOrderStore(store)){this.store=store;this.repository=store.repository;this.orders=orders;}
 async prepare({query:q,hash,state,catalog,now=Date.now(),build=true}){
  if(q.mode!=='source')return paiaContext({...state,hash});
  if(q.groupKind==='providers')return {...paiaContext({...state,hash}),effectiveOrdering:'source',unavailableReason:null};
  let order;
  if(q.groupKind==='groups'&&q.providerKey)order=await this.orders.activeProjects(q.providerKey,{now});
  else if(q.groupKind==='project'&&q.providerKey&&q.projectRef)order=await this.orders.active({providerKey:q.providerKey,namespace:q.projectRef.namespace,scopeKind:'windows',scopeRef:q.projectRef,now});
  else return paiaContext({...state,hash},'SOURCE_ORDER_UNAVAILABLE');
  if(order.availability!=='available')return paiaContext({...state,hash},order.reasonCode||'SOURCE_ORDER_UNAVAILABLE');
  const desired=await hashText(JSON.stringify([catalog.epoch,state.revision,order.providerKey,order.namespace,order.scopeKind,order.scopeRef,order.observationId,order.generation])),id=projectionStateId(hash);
  let overlay=await this.repository.transaction(false,t=>t.get('meta',id));
  if(overlay?.blocked?.key===desired)return paiaContext({...state,hash},overlay.blocked.reason);
  if(overlay?.active?.key===desired)return {effectiveOrdering:'source',unavailableReason:null,generation:overlay.active.generation,prefix:projectionPagePrefix(hash,overlay.active.generation),sourceRefsScanned:0};
  if(!build)return paiaContext({...state,hash},'SOURCE_ORDER_PREPARING');
  if(!overlay?.shadow||overlay.shadow.key!==desired){
   await this.repository.transaction(true,async t=>{const current=await t.get('meta',id)||{id,version:1,hash,active:null,shadow:null,blocked:null};current.shadow={key:desired,generation:crypto.randomUUID(),cursor:null,copied:0,conflict:false};current.blocked=null;await t.put('meta',current);});
   return paiaContext({...state,hash},'SOURCE_ORDER_PREPARING');
  }
  const shadow=overlay.shadow,batch=await this.repository.transaction(false,t=>t.primaryRangePage('meta',{prefix:K.memberPrefix(hash),after:shadow.cursor,limit:SOURCE_ORDER_BATCH})),ranks=new Map(order.orderedRefs.map((ref,index)=>[sourceOrderRefToken(ref,order.scopeKind,order.providerKey,order.namespace),index]));
  const rows=[];let conflict=shadow.conflict;for(const {value}of batch.rows){const derived=sourceSort(value,q,order,ranks);conflict||=derived.conflict;rows.push({sort:derived.sort,item:value.item});}
  const final=batch.next===null;let published=false,blocked=false;
  await this.repository.transaction(true,async t=>{
   const current=await t.get('meta',id);if(!current?.shadow||current.shadow.key!==desired||current.shadow.cursor!==shadow.cursor)return;
   for(const row of rows)await t.put('meta',{id:projectionPagePrefix(hash,shadow.generation)+row.sort+K.stringKey(row.item.id),version:1,item:row.item});
   current.shadow.cursor=batch.next;current.shadow.copied+=rows.length;current.shadow.conflict=conflict;
   if(final){
    if(current.shadow.copied!==state.count){current.blocked={key:desired,reason:'PARTIAL_GENERATION'};current.shadow=null;blocked=true;}
    else if(conflict){current.blocked={key:desired,reason:'NAMESPACE_CONFLICT'};current.shadow=null;blocked=true;}
    else{current.active={key:desired,generation:shadow.generation,memberRevision:state.revision,observationId:order.observationId};current.shadow=null;current.blocked=null;published=true;}
   }
   await t.put('meta',current);
  });
  if(published)return {effectiveOrdering:'source',unavailableReason:null,generation:shadow.generation,prefix:projectionPagePrefix(hash,shadow.generation),sourceRefsScanned:rows.length};
  return paiaContext({...state,hash},blocked?(conflict?'NAMESPACE_CONFLICT':'PARTIAL_GENERATION'):'SOURCE_ORDER_PREPARING');
 }
}
export class ArchiveOrderPreferenceService{
 constructor(store){if(!store?.repository)invalid();this.store=store;this.repository=store.repository;}
 async read(){await this.store.finishFoundation?.();const row=await this.repository.transaction(false,t=>t.get('meta',SOURCE_ORDER_UI_ID));return {mode:row?.archiveOrdering==='source'?'source':'paia'};}
 async write(mode){if(!['paia','source'].includes(mode))invalid();await this.store.finishFoundation?.();return this.store.run(async()=>{await this.repository.transaction(true,t=>t.put('meta',{id:SOURCE_ORDER_UI_ID,version:1,archiveOrdering:mode}));return {mode};});}
}