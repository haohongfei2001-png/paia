import {ArchiveError} from '../constants.js';
import {exact,fail,integer} from './contracts.js';

const HOUR=3600000,DAY=24*HOUR,MONTH=30*DAY,MAX_TIME=8640000000000000-MONTH;
const unsettled=row=>!['SETTLED','CANCELLED_BEFORE_DISPATCH'].includes(row.state);
const recent=(at,now,span)=>at>now-span;
const amount=rows=>rows.reduce((sum,row)=>{const value=row.state==='SETTLED'?row.settlement.usdMicros:row.reservationMicros;if(!integer(value)||!integer(sum+value))fail('COST_OVERFLOW');return sum+value;},0);
const tokens=(rows,key)=>rows.reduce((sum,row)=>{if(!integer(row.request[key])||!integer(sum+row.request[key]))fail('COST_OVERFLOW');return sum+row.request[key];},0);

function formatter(timeZone){
 if(typeof timeZone!=='string'||!timeZone.length||timeZone.length>100)fail('UNQUALIFIED_TIME_ZONE');
 try{return new Intl.DateTimeFormat('en-US',{timeZone,calendar:'iso8601',numberingSystem:'latn',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});}catch{fail('UNQUALIFIED_TIME_ZONE');}
}
function calendar(format,now,tier){
 const parts=Object.fromEntries(format.formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 const dayId=parts.year+'-'+parts.month+'-'+parts.day;
 return {dayId,windowId:dayId+':'+Math.floor(Number(parts.hour)/(tier==='free'?8:1))};
}
function nextBoundary(format,now,tier,id){
 // A repeated DST hour has the same identifier. Search real server time, never
 // add 24h to a local date or assume that a local hour has one UTC occurrence.
 let high=now;
 for(let i=0;i<36;i++){high+=HOUR;if(calendar(format,high,tier).windowId!==id)break;}
 if(calendar(format,high,tier).windowId===id)fail('UNQUALIFIED_TIME_ZONE');
 let low=now;while(high-low>1){const mid=low+Math.floor((high-low)/2);if(calendar(format,mid,tier).windowId===id)low=mid;else high=mid;}
 return high;
}
export function budgetWindow(facts,now){
 if(!integer(now)||now>MAX_TIME)fail('UNTRUSTED_CLOCK');
 if(!['free','pro'].includes(facts.tier))fail('UNQUALIFIED_FACTS');
 const format=formatter(facts.timeZone),timeZone=format.resolvedOptions().timeZone;
 const {dayId,windowId}=calendar(format,now,facts.tier),interval=(facts.tier==='free'?8:1)*HOUR;
 const endsAt=nextBoundary(format,now,facts.tier,windowId);
 return {version:1,timeZone,dayId,windowId:facts.tier+':'+timeZone+':'+windowId,endsAt,nextEligibilityAt:Math.max(now+interval,endsAt)};
}
export function validateWindowHistory(state,now){
 if(state.windowPolicyVersion!==1)fail('WINDOW_HISTORY_UNQUALIFIED');
 const formats=new Map();
 const getFormat=zone=>{if(!formats.has(zone))formats.set(zone,formatter(zone));return formats.get(zone);};
 for(const row of state.rows){
  if(!row||!integer(row.reservedAt)||row.reservedAt>now||!integer(row.reservationMicros)||!row.window||!['RESERVED','DISPATCHED','OUTCOME_UNKNOWN','SETTLED','CANCELLED_BEFORE_DISPATCH'].includes(row.state))fail('BUDGET_STATE_INVALID');
  exact(row.window,['version','timeZone','dayId','windowId','endsAt','nextEligibilityAt']);
  if(row.window.version!==1||!integer(row.window.nextEligibilityAt)||row.window.nextEligibilityAt<=row.reservedAt)fail('BUDGET_STATE_INVALID');
  const tier=row.window.windowId?.split(':')[0],format=getFormat(row.window.timeZone);
  if(!['free','pro'].includes(tier)||!integer(row.window.endsAt)||row.window.endsAt<=row.reservedAt||row.window.endsAt>row.reservedAt+36*HOUR)fail('BUDGET_STATE_INVALID');
  const local=calendar(format,row.reservedAt,tier),interval=(tier==='free'?8:1)*HOUR;
  if(row.window.dayId!==local.dayId||row.window.windowId!==tier+':'+format.resolvedOptions().timeZone+':'+local.windowId||row.window.nextEligibilityAt!==Math.max(row.reservedAt+interval,row.window.endsAt)||calendar(format,row.window.endsAt-1,tier).windowId!==local.windowId||calendar(format,row.window.endsAt,tier).windowId===local.windowId)fail('BUDGET_STATE_INVALID');
  if(row.state!=='RESERVED'&&row.state!=='CANCELLED_BEFORE_DISPATCH'&&(!integer(row.dispatchedAt)||row.dispatchedAt<row.reservedAt||row.dispatchedAt>now||typeof row.dispatchedDayId!=='string'||typeof row.dispatchedTimeZone!=='string'))fail('BUDGET_STATE_INVALID');
  if(row.state==='SETTLED'&&(!integer(row.settledAt)||row.settledAt<row.dispatchedAt||row.settledAt>now||!integer(row.settlement?.usdMicros)))fail('BUDGET_STATE_INVALID');
  if(row.dispatchedAt!==undefined&&calendar(getFormat(row.dispatchedTimeZone),row.dispatchedAt,tier).dayId!==row.dispatchedDayId)fail('BUDGET_STATE_INVALID');
  if(row.resultCommitted&&(!integer(row.resultCommittedAt)||row.resultCommittedAt<row.dispatchedAt||row.resultCommittedAt>now||typeof row.resultDayId!=='string'||typeof row.resultTimeZone!=='string'||row.settlement?.outcome!=='COMMITTED'&&row.resultResolution?.outcome!=='COMMITTED'||calendar(getFormat(row.resultTimeZone),row.resultCommittedAt,tier).dayId!==row.resultDayId))fail('BUDGET_STATE_INVALID');
 }
}
function sameDay(row,now,kind,formats){
 const zone=kind==='result'?row.resultTimeZone:row.dispatchedTimeZone??row.window.timeZone;
 const day=kind==='result'?row.resultDayId:row.dispatchedDayId??row.window.dayId;
 // A declared-zone change cannot cancel the unexpired historical day. Each
 // charge keeps its own calendar boundary as well as the rolling 24h fence.
 if(!formats.has(zone))formats.set(zone,formatter(zone));
 return day===calendar(formats.get(zone),now,'free').dayId;
}
export function windowUsage({rows,request:r,now,quotaJob}){
 const formats=new Map();
 const active=rows.filter(row=>row.state!=='CANCELLED_BEFORE_DISPATCH');
 const inMoney=span=>row=>unsettled(row)||recent(row.dispatchedAt??row.reservedAt,now,span);
 const daily=row=>unsettled(row)||recent(row.dispatchedAt??row.reservedAt,now,DAY)||sameDay(row,now,'attempt',formats);
 const user=active.filter(row=>row.request.principalId===r.principalId),feature=user.filter(row=>row.request.jobType===r.jobType),attempts=feature.filter(daily);
 const resultRows=rows.filter(row=>row.request.principalId===r.principalId&&row.request.jobType===r.jobType),jobs=new Map();
 for(const row of resultRows){const group=jobs.get(row.request.jobId)||[];group.push(row);jobs.set(row.request.jobId,group);}
 let results=0;
 for(const group of jobs.values()){
  if(!quotaJob(group))continue;
  const committed=group.find(row=>row.resultCommitted);
  // An uncommitted logical slot is retained even when all physical spend is
  // known. A late successful commit belongs to its actual completion day.
  if(!committed||recent(committed.resultCommittedAt,now,DAY)||sameDay(committed,now,'result',formats))results++;
 }
 const money=(group,span)=>amount(group.filter(inMoney(span)));
 return {usage:{results,attempts:attempts.length,inputTokens:tokens(attempts,'inputTokens'),outputTokens:tokens(attempts,'outputCap'),featureDayMicros:money(feature,DAY),featureMonthMicros:money(feature,MONTH),userDayMicros:money(user,DAY),userMonthMicros:money(user,MONTH)},globalUsage:{dayUsedMicros:money(active,DAY),monthUsedMicros:money(active,MONTH)}};
}
export function checkMaintenanceCadence(rows,r,now,window){
 if(r.jobType!=='AI_MAINTENANCE'||rows.some(row=>row.request.jobId===r.jobId))return;
 const cycles=new Map();
 for(const row of rows){if(row.request.principalId!==r.principalId||row.request.jobType!=='AI_MAINTENANCE')continue;const prior=cycles.get(row.request.jobId);if(!prior||row.reservedAt<prior.reservedAt)cycles.set(row.request.jobId,row);}
 const interval=(window.windowId.startsWith('free:')?8:1)*HOUR;
 let nextEligibilityAt=now;
 for(const row of cycles.values()){
  // Already-admitted cycles retain their actual server-time deadline across
  // time-zone and tier changes. The current tier can tighten, never retract it.
  nextEligibilityAt=Math.max(nextEligibilityAt,row.reservedAt+interval,row.window.nextEligibilityAt);
 }
 if(nextEligibilityAt>now){const error=new ArchiveError('MAINTENANCE_CADENCE');error.nextEligibilityAt=nextEligibilityAt;throw error;}
}
