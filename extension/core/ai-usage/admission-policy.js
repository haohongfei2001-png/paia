import {integer} from './contracts.js';
// Pure preflight only. The eventual trusted service must verify facts, enforce
// time windows and atomically reserve again. No returned value permits dispatch.
export const ENVELOPES=Object.freeze({
 AI_MAINTENANCE:Object.freeze({input:12000,output:2000,children:2,free:Object.freeze([3,6,72000,12000,100000,2000000]),pro:Object.freeze([24,48,576000,96000,500000,6000000])}),
 AI_ORGANIZE:Object.freeze({input:16000,output:6000,children:4,free:Object.freeze([3,12,192000,72000,380000,9000000]),pro:Object.freeze([100,200,1600000,600000,2200000,20000000])}),
 AI_ASSIST:Object.freeze({input:4000,output:600,children:1,free:Object.freeze([3,3,12000,1800,20000,1000000]),pro:Object.freeze([100,100,400000,60000,300000,4000000])})
});
const deny=reason=>({decision:'deny',reason,dispatchAllowed:false});
export function evaluateAdmission(facts){
 if(facts?.authorized!==true)return deny('AUTHORIZATION');
 if(facts.intent==='local')return {decision:'local',dispatchAllowed:false};
 if(facts.intent==='cache'&&facts.exactCurrentCache===true)return {decision:'cache_hit',reservationMicros:0,dispatchAllowed:false};
 if(!Object.hasOwn(ENVELOPES,facts.jobType)||!['free','pro'].includes(facts.tier))return deny('UNQUALIFIED_FACTS');
 const e=ENVELOPES[facts.jobType],limits=e[facts.tier];
 if(facts.intent!=='remote'||!limits||facts.verifiedServiceFacts!==true||facts.routeQualified!==true||facts.thinkingBoundQualified!==true||facts.inputBoundQualified!==true)return deny('UNQUALIFIED_FACTS');
 if(facts.attemptState!=='PLANNED')return deny('OUTCOME_OR_ATTEMPT_PENDING');
 const {inputTokens,outputCap,maxCompletionTokens,childCount,reservationMicros}=facts;
 if(![inputTokens,outputCap,maxCompletionTokens,childCount,reservationMicros].every(integer)||childCount<1||childCount>e.children||inputTokens>e.input||outputCap>e.output||maxCompletionTokens<1||maxCompletionTokens>outputCap-10)return deny('REQUEST_BOUND');
 const u=facts.usage,g=facts.global;
 const keys=['results','attempts','inputTokens','outputTokens','featureDayMicros','featureMonthMicros','userDayMicros','userMonthMicros'];
 if(!u||!keys.every(k=>integer(u[k]))||!g||!['dayLimitMicros','monthLimitMicros','dayUsedMicros','monthUsedMicros'].every(k=>integer(g[k]))||g.dayLimitMicros===0||g.monthLimitMicros===0)return deny('ALLOWANCE_UNSET');
 // Counts include outstanding reservations. An existing logical result slot is
 // retained across children; service must attest ownership of that slot.
 const resultIncrement=facts.ownsResultReservation===true?0:1;
 const checks=[[u.results,resultIncrement,limits[0]],[u.attempts,1,limits[1]],[u.inputTokens,inputTokens,limits[2]],[u.outputTokens,outputCap,limits[3]],[u.featureDayMicros,reservationMicros,limits[4]],[u.featureMonthMicros,reservationMicros,limits[5]],[u.userDayMicros,reservationMicros,facts.tier==='free'?500000:3000000],[u.userMonthMicros,reservationMicros,facts.tier==='free'?12000000:30000000],[g.dayUsedMicros,reservationMicros,g.dayLimitMicros],[g.monthUsedMicros,reservationMicros,g.monthLimitMicros]];
 if(checks.some(([used,add,cap])=>used>cap||add>cap-used))return deny('BUDGET_OR_QUOTA');
 return {decision:'eligible_for_atomic_reservation',reservationMicros,dispatchAllowed:false};
}
