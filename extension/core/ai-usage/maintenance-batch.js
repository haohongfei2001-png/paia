import {canonical,equal,exact,fail,opaque,unitKey,validateCoverage,CHILD_LIMITS} from './contracts.js';
import {DIRTY_PREFIX,KNOWN_PREFIX} from './delta.js';
import {contextScopeTransactionReader} from '../context-topic-scope.js';
const deferredSelections=new WeakMap();
const frozen=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))frozen(v);Object.freeze(x);}return x;};
// An original bounded-page metadata witness, never an executable request or grant.
export function readMaintenanceDeferredRestoreBatch(batch,foundation){const held=deferredSelections.get(batch);return held?.foundation===foundation?held:null;}
async function deferredRestoreCandidate(t,item,unit,row,options){
 if(unit.facet!=='topic'||row.retryCondition!=='TOPIC_MAPPING_UNAVAILABLE'||!['topic','section'].includes(item.descriptor.kind))return null;
 const d=item.descriptor,known=await t.get('meta',KNOWN_PREFIX+item.key),dirty=await t.get('meta',DIRTY_PREFIX+item.key),job=await t.get('organizerJobs',row.jobId);
 if(!known||!dirty||!job||job.type!=='AI_MAINTENANCE'||job.kind!=='ai_usage_v1'||!['COMMITTED','CANCELLED_BEFORE_DISPATCH','REJECTED','EXPIRED_UNCOMMITTED'].includes(job.state)||job.routeVersion===options.routeVersion||job.contractVersion!==options.contractVersion||known.signature!==item.signature||dirty.signature!==item.signature||!equal(known.descriptor,d)||!equal(dirty.descriptor,d)||d.removed||d.fenceOnly||d.independent||!job.items?.some(i=>equal(i,item))||!job.childCoverage?.[row.sequence]?.some(u=>equal(u,unit)))return null;
 const journal=await t.get('revisions',d.journalId);
 if(!journal||journal.kind!==d.kind||journal.entityId!==d.entityId||journal.afterRevision!==d.revision||journal.actor!=='user'||journal.reason!=='restore'||!equal(journal.fieldMask,[d.kind==='topic'?'name':'title']))return null;
 // Only metadata scalars are projected; local before/after fields are not read.
 const metadata=Object.fromEntries(['id','kind','entityId','afterRevision','operationId','actor','reason','fieldMask'].map(k=>[k,journal[k]]));
 return frozen(structuredClone({item,unit,row,known,dirty,job:{id:job.id,kind:job.kind,type:job.type,state:job.state,routeVersion:job.routeVersion,contractVersion:job.contractVersion,childId:job.childIds?.[row.sequence],coverage:job.childCoverage[row.sequence],item:job.items.find(i=>i.key===item.key)},journal:metadata}));
}
const TYPE='AI_MAINTENANCE',LIMIT=100;
const result=(status,rest={})=>({status,dispatchAllowed:false,financialAuthority:false,...rest});
// Exact current session capability; this classifies metadata only, never bodies.
// Human owners require their own mapper and remain semantic obligations.
export function unsupportedMaintenanceCoverage(items,coverage,qualifiedEntries=new Set(),qualifiedPlacements=new Set(),qualifiedAuthored=new Set(),qualifiedBound=new Set(),qualifiedStructural=new Set(),qualifiedStructuralTopics=new Set(),qualifiedContextEdits=new Set(),qualifiedAuthoredTopics=new Set(),qualifiedPlacementTopics=new Set()){
 const units=validateCoverage(coverage,TYPE),unsupported=[];
 for(const unit of units){const item=items.find(i=>i.key===unit.key),d=item?.descriptor;
  if(!d||d.removed||d.fenceOnly)fail('STALE_BASE');
  if(d.kind==='input'){if(!Array.isArray(d.inputIds)||d.inputIds.length!==1||d.inputIds[0]!==d.entityId)fail();}
  else if(d.kind==='library_entry'&&['topic','context'].includes(unit.facet)&&qualifiedEntries.has(unit.key))continue;
  else if(d.kind==='library_entry'&&(unit.facet==='context'&&qualifiedAuthored.has(unit.key)||unit.facet==='topic'&&qualifiedAuthoredTopics.has(unit.key)))continue;
  else if(['library_entry','placement'].includes(d.kind)&&unit.facet==='context'&&qualifiedBound.has(unit.key))continue;
  else if(d.kind==='placement'&&(unit.facet==='context'&&qualifiedPlacements.has(unit.key)||unit.facet==='topic'&&qualifiedPlacementTopics.has(unit.key)))continue;
  else if(['section','topic'].includes(d.kind)&&unit.facet==='topic'&&qualifiedStructuralTopics.has(unit.key))continue;
  else if(['section','topic'].includes(d.kind)&&unit.facet==='context'&&qualifiedStructural.has(unit.key))continue;
  else if(d.kind==='context_item'&&unit.facet==='context'&&qualifiedContextEdits.has(unit.key))continue;
  else if(['library_entry','topic','section','placement','context_item'].includes(d.kind))unsupported.push(unit);
  else fail();
 }return unsupported;
}
// A current, metadata-only candidate for the existing foundation.plan interface.
// No alarm, service window, reservation, provider call or new durable queue.
export async function readMaintenanceBatch(foundation,options,workBudget=null){
 options=structuredClone(options);
 exact(options,['scope','contractVersion','routeVersion','cursor','limit'],['scope','contractVersion','routeVersion']);
 const {scope,contractVersion,routeVersion,cursor=null,limit=37}=options;
 if(![scope,contractVersion,routeVersion].every(opaque)||!Number.isInteger(limit)||limit<1||limit>50||cursor!==null&&(typeof cursor!=='string'||!cursor.startsWith(DIRTY_PREFIX)))fail();
 if(typeof foundation?.read!=='function'||typeof foundation?.current!=='function'||typeof foundation?.authority!=='function')fail('UNAVAILABLE');
 const read=()=>foundation.read(async transaction=>{
  const t=workBudget===null?transaction:contextScopeTransactionReader(foundation.s,transaction,workBudget);
  const page=await t.primaryRangePage('meta',{prefix:DIRTY_PREFIX,after:cursor,limit});
  // Active DEFER rows have no per-unit index or executable condition owner.
  // Never silently overlook one or guess that its opaque reason has cleared.
  const deferred=await t.primaryRangePage('organizerWorkItems',{prefix:'aiu:defer:',limit:LIMIT});
  if(deferred.next!==null)return result('UNAVAILABLE',{reason:'DEFER_SCAN_BOUND'});
  const items=[],coverage=[];let selectedRestore=null,blocked=0,acknowledged=0,consumed=cursor,nextCursor=page.next;
  for(const {key:rowKey,value:row}of page.rows){
   const item={key:row.descriptor.key,signature:row.signature,descriptor:row.descriptor};
   if(item.descriptor.removed||item.descriptor.fenceOnly){consumed=rowKey;continue;}
   const units=[],blockedRows=[];let rowBlocked=0,rowAcknowledged=0;
   for(const facet of row.pendingFacets||['topic','context']){
    if(!['topic','context','filter'].includes(facet))fail();
    const unit={key:item.key,facet,scope},key=unitKey(unit);
    const ack=await t.get('organizerWorkItems','aiu:coverage:'+canonical([unit.key,unit.facet,unit.scope]));
    if(ack?.kind==='ai_usage_v1'&&ack.state==='ACKNOWLEDGED'&&ack.signature===item.signature&&equal(ack.unit,unit)){rowAcknowledged++;continue;}
    const matches=deferred.rows.filter(({value:d})=>d.kind==='ai_usage_v1'&&d.state==='DEFERRED'&&d.signature===item.signature&&equal(d.unit,unit));
    if(matches.length){rowBlocked++;if(matches.length===1)blockedRows.push({unit,row:matches[0].value});continue;}
    units.push(unit);
   }
   // Validate before the capacity break: malformed rows are never empty work.
   if(units.length)validateCoverage(units,TYPE);
   // Keep every remaining facet of an Input together. The exclusive cursor
   // stays before the first unconsumed row, including when this is the last page.
   if(coverage.length+units.length>LIMIT){nextCursor=consumed;break;}
   consumed=rowKey;blocked+=rowBlocked;acknowledged+=rowAcknowledged;
   if(workBudget!==null&&!selectedRestore&&!units.length&&rowBlocked===1&&blockedRows.length===1&&blockedRows[0].unit.facet==='topic')selectedRestore=await deferredRestoreCandidate(t,item,blockedRows[0].unit,blockedRows[0].row,options);
   if(units.length){items.push(item);coverage.push(...units);}
  }
  const boundary={nextCursor,complete:nextCursor===null,blockedUnits:blocked,acknowledgedUnits:acknowledged,activeDeferredUnits:deferred.rows.length};
  if(!coverage.length){const batch=result(blocked?'DEFERRED':'NO_DELTA',boundary);if(selectedRestore)deferredSelections.set(batch,Object.freeze({foundation,budget:workBudget,options:frozen(structuredClone(options)),candidate:selectedRestore}));return batch;}
  if(coverage.every(u=>u.facet==='filter'))return result('DEFERRED',{...boundary,reason:'FILTER_REQUIRES_MAINTENANCE'});
  const sorted=validateCoverage(coverage,TYPE),children=[];
  for(let offset=0;offset<sorted.length;offset+=50)children.push(sorted.slice(offset,offset+50));
  if(children.length>CHILD_LIMITS[TYPE])fail();
  const authority=await foundation.authority(transaction,TYPE,{items,coverage:sorted});
  await foundation.current(transaction,{type:TYPE,items,coverage:sorted,authority,cancelEpoch:0});
  return result('CANDIDATE_ONLY',{...boundary,request:{type:TYPE,intent:'maintenance',items,coverage:sorted,children,contractVersion,routeVersion}});
 });
 const initial=await read();
 if(initial.reason!=='DEFER_SCAN_BOUND'||typeof foundation.archiveObsoleteDeferred!=='function')return initial;
 let cleanup;
 try{cleanup=await foundation.archiveObsoleteDeferred({limit:LIMIT});}catch(error){if(error.code==='DEFER_RECORD_INVALID')return {...initial,cleanup:{blocked:true,reason:error.code}};throw error;}
 // One bounded archival transaction and one fresh qualification read, never a
 // loop, background scheduler, condition guess or provider retry.
 return {...await read(),cleanup};
}
