import {ArchiveError} from './constants.js';
const refuse=()=>{throw new ArchiveError('TOPIC_ACTIVITY_POLICY_INVALID');};
// No production defaults: the caller must supply a versioned, reviewed policy.
export function topicLifecyclePolicy(value){
 if(!value||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).sort().join()!=='inactivityMs,maxTopics,version'||typeof value.version!=='string'||!/^[a-z0-9][a-z0-9.-]{0,63}$/.test(value.version)||!Number.isSafeInteger(value.inactivityMs)||value.inactivityMs<=0||!Number.isSafeInteger(value.maxTopics)||value.maxTopics<1||value.maxTopics>100)refuse();
 return Object.freeze({version:value.version,inactivityMs:value.inactivityMs,maxTopics:value.maxTopics});
}
export function evaluateTopicInactivity({policy,now,previousObservedAt=null,activityAt}){
 policy=topicLifecyclePolicy(policy);
 if(!Number.isSafeInteger(now)||now<0||previousObservedAt!==null&&(!Number.isSafeInteger(previousObservedAt)||previousObservedAt<0||now<previousObservedAt))return {eligible:false,reason:'clock_regression'};
 const at=typeof activityAt==='string'?Date.parse(activityAt):NaN;
 if(!Number.isFinite(at)||at<0)return {eligible:false,reason:'unknown_activity'};
 if(at>now)return {eligible:false,reason:'future_activity'};
 return {eligible:now-at>=policy.inactivityMs,reason:now-at>=policy.inactivityMs?'inactive':'recent_activity'};
}
