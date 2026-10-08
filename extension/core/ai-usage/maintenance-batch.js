import {canonical,equal,exact,fail,opaque,unitKey,validateCoverage,CHILD_LIMITS} from './contracts.js';
import {DIRTY_PREFIX} from './delta.js';
const TYPE='AI_MAINTENANCE',LIMIT=100;
const result=(status,rest={})=>({status,dispatchAllowed:false,financialAuthority:false,...rest});
// A current, metadata-only candidate for the existing foundation.plan interface.
// No alarm, service window, reservation, provider call or new durable queue.
export async function readMaintenanceBatch(foundation,options){
 options=structuredClone(options);
 exact(options,['scope','contractVersion','routeVersion','cursor','limit'],['scope','contractVersion','routeVersion']);
 const {scope,contractVersion,routeVersion,cursor=null,limit=37}=options;
 if(![scope,contractVersion,routeVersion].every(opaque)||!Number.isInteger(limit)||limit<1||limit>50||cursor!==null&&(typeof cursor!=='string'||!cursor.startsWith(DIRTY_PREFIX)))fail();
 if(typeof foundation?.read!=='function'||typeof foundation?.current!=='function'||typeof foundation?.authority!=='function')fail('UNAVAILABLE');
 return foundation.read(async t=>{
  const page=await t.primaryRangePage('meta',{prefix:DIRTY_PREFIX,after:cursor,limit});
  // Existing DEFER rows have no per-unit index or executable condition owner.
  // Never silently overlook one or guess that its opaque reason has cleared.
  const deferred=await t.primaryRangePage('organizerWorkItems',{prefix:'aiu:defer:',limit:LIMIT});
  if(deferred.next!==null)return result('UNAVAILABLE',{reason:'DEFER_SCAN_BOUND'});
  const items=[],coverage=[];let blocked=0,acknowledged=0;
  for(const {value:row}of page.rows){
   const item={key:row.descriptor.key,signature:row.signature,descriptor:row.descriptor};
   if(item.descriptor.removed||item.descriptor.fenceOnly)continue;
   const units=[];
   for(const facet of row.pendingFacets||['topic','context']){
    if(!['topic','context','filter'].includes(facet))fail();
    const unit={key:item.key,facet,scope},key=unitKey(unit);
    const ack=await t.get('organizerWorkItems','aiu:coverage:'+canonical([unit.key,unit.facet,unit.scope]));
    if(ack?.kind==='ai_usage_v1'&&ack.state==='ACKNOWLEDGED'&&ack.signature===item.signature&&equal(ack.unit,unit)){acknowledged++;continue;}
    if(deferred.rows.some(({value:d})=>d.kind==='ai_usage_v1'&&d.state==='DEFERRED'&&d.signature===item.signature&&equal(d.unit,unit))){blocked++;continue;}
    units.push(unit);
   }
   if(units.length){items.push(item);coverage.push(...units);}
  }
  const boundary={nextCursor:page.next,complete:page.next===null,blockedUnits:blocked,acknowledgedUnits:acknowledged};
  if(!coverage.length)return result(blocked?'DEFERRED':'NO_DELTA',boundary);
  if(coverage.every(u=>u.facet==='filter'))return result('DEFERRED',{...boundary,reason:'FILTER_REQUIRES_MAINTENANCE'});
  // The foundation has a 100-unit total bound. Do not silently truncate facets.
  if(coverage.length>LIMIT)return result('UNAVAILABLE',{...boundary,reason:'COVERAGE_BOUND'});
  const sorted=validateCoverage(coverage,TYPE),children=[];
  for(let offset=0;offset<sorted.length;offset+=50)children.push(sorted.slice(offset,offset+50));
  if(children.length>CHILD_LIMITS[TYPE])fail();
  const authority=await foundation.authority(t,TYPE,{items,coverage:sorted});
  await foundation.current(t,{type:TYPE,items,coverage:sorted,authority,cancelEpoch:0});
  return result('CANDIDATE_ONLY',{...boundary,request:{type:TYPE,intent:'maintenance',items,coverage:sorted,children,contractVersion,routeVersion}});
 });
}
