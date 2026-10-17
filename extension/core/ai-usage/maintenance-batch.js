import {canonical,equal,exact,fail,opaque,unitKey,validateCoverage,CHILD_LIMITS} from './contracts.js';
import {DIRTY_PREFIX} from './delta.js';
const TYPE='AI_MAINTENANCE',LIMIT=100;
const result=(status,rest={})=>({status,dispatchAllowed:false,financialAuthority:false,...rest});
// Exact current session capability; this classifies metadata only, never bodies.
// Human owners require their own mapper and remain semantic obligations.
export function unsupportedMaintenanceCoverage(items,coverage,qualifiedEntries=new Set(),qualifiedPlacements=new Set(),qualifiedAuthored=new Set()){
 const units=validateCoverage(coverage,TYPE),unsupported=[];
 for(const unit of units){const item=items.find(i=>i.key===unit.key),d=item?.descriptor;
  if(!d||d.removed||d.fenceOnly)fail('STALE_BASE');
  if(d.kind==='input'){if(!Array.isArray(d.inputIds)||d.inputIds.length!==1||d.inputIds[0]!==d.entityId)fail();}
  else if(d.kind==='library_entry'&&['topic','context'].includes(unit.facet)&&qualifiedEntries.has(unit.key))continue;
  else if(d.kind==='library_entry'&&unit.facet==='context'&&qualifiedAuthored.has(unit.key))continue;
  else if(d.kind==='placement'&&unit.facet==='context'&&qualifiedPlacements.has(unit.key))continue;
  else if(['library_entry','topic','section','placement','context_item'].includes(d.kind))unsupported.push(unit);
  else fail();
 }return unsupported;
}
// A current, metadata-only candidate for the existing foundation.plan interface.
// No alarm, service window, reservation, provider call or new durable queue.
export async function readMaintenanceBatch(foundation,options){
 options=structuredClone(options);
 exact(options,['scope','contractVersion','routeVersion','cursor','limit'],['scope','contractVersion','routeVersion']);
 const {scope,contractVersion,routeVersion,cursor=null,limit=37}=options;
 if(![scope,contractVersion,routeVersion].every(opaque)||!Number.isInteger(limit)||limit<1||limit>50||cursor!==null&&(typeof cursor!=='string'||!cursor.startsWith(DIRTY_PREFIX)))fail();
 if(typeof foundation?.read!=='function'||typeof foundation?.current!=='function'||typeof foundation?.authority!=='function')fail('UNAVAILABLE');
 const read=()=>foundation.read(async t=>{
  const page=await t.primaryRangePage('meta',{prefix:DIRTY_PREFIX,after:cursor,limit});
  // Active DEFER rows have no per-unit index or executable condition owner.
  // Never silently overlook one or guess that its opaque reason has cleared.
  const deferred=await t.primaryRangePage('organizerWorkItems',{prefix:'aiu:defer:',limit:LIMIT});
  if(deferred.next!==null)return result('UNAVAILABLE',{reason:'DEFER_SCAN_BOUND'});
  const items=[],coverage=[];let blocked=0,acknowledged=0,consumed=cursor,nextCursor=page.next;
  for(const {key:rowKey,value:row}of page.rows){
   const item={key:row.descriptor.key,signature:row.signature,descriptor:row.descriptor};
   if(item.descriptor.removed||item.descriptor.fenceOnly){consumed=rowKey;continue;}
   const units=[];let rowBlocked=0,rowAcknowledged=0;
   for(const facet of row.pendingFacets||['topic','context']){
    if(!['topic','context','filter'].includes(facet))fail();
    const unit={key:item.key,facet,scope},key=unitKey(unit);
    const ack=await t.get('organizerWorkItems','aiu:coverage:'+canonical([unit.key,unit.facet,unit.scope]));
    if(ack?.kind==='ai_usage_v1'&&ack.state==='ACKNOWLEDGED'&&ack.signature===item.signature&&equal(ack.unit,unit)){rowAcknowledged++;continue;}
    if(deferred.rows.some(({value:d})=>d.kind==='ai_usage_v1'&&d.state==='DEFERRED'&&d.signature===item.signature&&equal(d.unit,unit))){rowBlocked++;continue;}
    units.push(unit);
   }
   // Validate before the capacity break: malformed rows are never empty work.
   if(units.length)validateCoverage(units,TYPE);
   // Keep every remaining facet of an Input together. The exclusive cursor
   // stays before the first unconsumed row, including when this is the last page.
   if(coverage.length+units.length>LIMIT){nextCursor=consumed;break;}
   consumed=rowKey;blocked+=rowBlocked;acknowledged+=rowAcknowledged;
   if(units.length){items.push(item);coverage.push(...units);}
  }
  const boundary={nextCursor,complete:nextCursor===null,blockedUnits:blocked,acknowledgedUnits:acknowledged,activeDeferredUnits:deferred.rows.length};
  if(!coverage.length)return result(blocked?'DEFERRED':'NO_DELTA',boundary);
  if(coverage.every(u=>u.facet==='filter'))return result('DEFERRED',{...boundary,reason:'FILTER_REQUIRES_MAINTENANCE'});
  const sorted=validateCoverage(coverage,TYPE),children=[];
  for(let offset=0;offset<sorted.length;offset+=50)children.push(sorted.slice(offset,offset+50));
  if(children.length>CHILD_LIMITS[TYPE])fail();
  const authority=await foundation.authority(t,TYPE,{items,coverage:sorted});
  await foundation.current(t,{type:TYPE,items,coverage:sorted,authority,cancelEpoch:0});
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
