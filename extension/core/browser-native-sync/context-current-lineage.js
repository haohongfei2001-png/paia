import {readableContextItems,fenceContextLineage,releaseContextLineage,measureContextLineageRetention} from '../context-item-lineage.js';
import {requireOriginalMixedNativeCanonicalCut} from './human-library-plan.js';
import {CONTEXT_CARDS_ROW} from '../context-cards.js';
import {equal,fail} from './value.js';
const captures=new WeakMap();
const automatic=raw=>raw.groupMeta.find(row=>row.id===CONTEXT_CARDS_ROW)?.items.filter(item=>item.origin==='automatic')??[];
// Called only from the original native compiler after its complete cut drained.
// The caller prepays original raw/scope reader peaks on the same Human ticket.
export async function captureCurrentContextLineage(nonce,store,core,scope,plan,raw){
 requireOriginalMixedNativeCanonicalCut(nonce,store,core,scope,plan,raw);
 if(captures.has(raw))fail('BNS_CONTEXT_OWNER_REQUIRED');
 const items=automatic(raw);if(!items.length)return;
 if(items.some(item=>item.lifecycle==='invalidated'))fail('BNS_CONTEXT_LINEAGE_UNAVAILABLE');
 const row=raw.groupMeta.find(row=>row.id===CONTEXT_CARDS_ROW),epoch=raw.points['recovery-restore-epoch']?.value??'initial';let lineage=null;
 try{
  const result=await readableContextItems(store,items.map(item=>({...item,lifecycle:'active',deletedBy:null})),{epoch,rowSerialized:JSON.stringify(row),retainAuthoredCapture:true});lineage=result.captured;
  if(!lineage||result.automaticEvaluation||result.items.length!==items.length)fail('BNS_CONTEXT_LINEAGE_UNAVAILABLE');
  requireOriginalMixedNativeCanonicalCut(nonce,store,core,scope,plan,raw);
  captures.set(raw,{store,core,scope,plan,lineage,row});lineage=null;
 }finally{releaseContextLineage(lineage);}
}
export function requireCurrentContextLineage(core,scope,plan,raw){
 const p=captures.get(raw);if(!p||p.core!==core||p.scope!==scope||p.plan!==plan)fail('BNS_CONTEXT_LINEAGE_UNAVAILABLE');
 return true;
}
export function measureCurrentContextLineage(raw){const p=captures.get(raw);return p?measureContextLineageRetention(p.lineage):null;}
export async function fenceCurrentContextLineage(core,store,scope,plan,raw){
 if(!automatic(raw).length)return;
 requireCurrentContextLineage(core,scope,plan,raw);const p=captures.get(raw);if(p.store!==store)fail('BNS_CONTEXT_OWNER_REQUIRED');
 await fenceContextLineage(store,p.lineage,{rowSerialized:JSON.stringify(p.row)});
 if(!equal(p.row,raw.groupMeta.find(row=>row.id===CONTEXT_CARDS_ROW)))fail('BNS_CONTEXT_OWNER_CHANGED');
}
export function releaseCurrentContextLineage(raw){const p=captures.get(raw);if(p){releaseContextLineage(p.lineage);captures.delete(raw);}}
