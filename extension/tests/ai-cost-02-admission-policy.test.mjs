import test from 'node:test';import assert from 'node:assert/strict';import {evaluateAdmission as evaluate,ENVELOPES} from '../core/ai-usage/admission-policy.js';
const fixture=()=>({authorized:true,intent:'remote',jobType:'AI_ORGANIZE',tier:'free',verifiedServiceFacts:true,routeQualified:true,thinkingBoundQualified:true,inputBoundQualified:true,attemptState:'PLANNED',inputTokens:1000,outputCap:6000,maxCompletionTokens:5990,childCount:1,reservationMicros:10000,usage:{results:0,attempts:0,inputTokens:0,outputTokens:0,featureDayMicros:0,featureMonthMicros:0,userDayMicros:0,userMonthMicros:0},global:{dayLimitMicros:1000000,monthLimitMicros:10000000,dayUsedMicros:0,monthUsedMicros:0}});
test('eligible policy output never grants dispatch or claims atomic reservation',()=>{assert.deepEqual(evaluate(fixture()),{decision:'eligible_for_atomic_reservation',reservationMicros:10000,dispatchAllowed:false});assert.throws(()=>{ENVELOPES.AI_ORGANIZE.free[0]=999;});});
test('authorized local and exact current cache survive financial stops, unauthorized cache does not',()=>{
 assert.equal(evaluate({authorized:true,intent:'local'}).decision,'local');assert.equal(evaluate({authorized:true,intent:'cache',exactCurrentCache:true}).reservationMicros,0);
 assert.equal(evaluate({authorized:false,intent:'cache',exactCurrentCache:true}).decision,'deny');assert.equal(evaluate({authorized:true,intent:'cache',exactCurrentCache:false}).decision,'deny');
});
test('raw tier, missing global allowance, unbounded thinking and approximate input are never admission',()=>{
 for(const patch of [{verifiedServiceFacts:false},{global:null},{routeQualified:false},{thinkingBoundQualified:false},{inputBoundQualified:false},{maxCompletionTokens:6000},{childCount:5},{tier:'forged'}])assert.equal(evaluate({...fixture(),...patch}).decision,'deny');
 for(const state of ['DISPATCHED','OUTCOME_UNKNOWN','CANCELLED','REJECTED'])assert.equal(evaluate({...fixture(),attemptState:state}).decision,'deny');
});
test('each separate feature/user/global quota and monetary cap binds without borrowing',()=>{
 for(const [key,value] of [['results',3],['attempts',12],['inputTokens',192000],['outputTokens',72000],['featureDayMicros',380000],['featureMonthMicros',9000000],['userDayMicros',500000],['userMonthMicros',12000000]]){const f=fixture();f.usage[key]=value;assert.equal(evaluate(f).decision,'deny',key);}
 for(const key of ['day','month']){const f=fixture();f.global[key+'UsedMicros']=f.global[key+'LimitMicros'];assert.equal(evaluate(f).decision,'deny');}
 const f=fixture();f.usage.results=3;f.ownsResultReservation=true;assert.equal(evaluate(f).decision,'eligible_for_atomic_reservation');
});
test('caller snapshots are not mutated and time changes never refill supplied usage',()=>{
 const f=fixture();f.usage.results=3;const before=structuredClone(f);assert.equal(evaluate({...f,now:9999999999999}).decision,'deny');assert.deepEqual(f,before);
});

test('prototype names cannot impersonate a feature or tier',()=>{for(const name of ['__proto__','constructor','toString']){assert.equal(evaluate({...fixture(),jobType:name}).decision,'deny');assert.equal(evaluate({...fixture(),tier:name}).decision,'deny');}});
