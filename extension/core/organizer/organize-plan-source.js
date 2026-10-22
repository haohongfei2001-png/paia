import {requireOriginalOrganizeActionSource,assertOriginalOrganizeActionCurrent,assertOriginalOrganizeActionFacts} from '../../background/organize-action-source.js';
import * as scopeOwner from './organize-processing-scope.js';
import {captureOrganizeProcessingGrant,releaseOrganizeProcessingGrant} from '../../background/organize-processing-policy.js';
import {snapshot} from '../ai-usage/qwen-request-data.js';
import {canonical,fail} from '../ai-usage/contracts.js';

// An optional original-source plan is distinct from financial identity and from
// a reusable processing grant. Only this module owns each invocation, request
// binding and write-transaction selection; no public message carries this cap.
const plans=new WeakMap(),actionPlans=new WeakMap(),need=x=>{if(!x)fail('UNAVAILABLE');};
const copy=request=>snapshot(request,{maxBytes:2097152,maxKeys:65536,maxString:32000,maxDepth:16}),key=request=>canonical(copy(request));
function current(record){
 requireOriginalOrganizeActionSource(record.source,record.store);
 assertOriginalOrganizeActionCurrent(record.source,record.action,record.store);
 assertOriginalOrganizeActionFacts(record.source,record.action,record.store);
}
export function captureOriginalOrganizePlan(source,action,store,request){
 const value=copy(request);need(value?.type==='AI_ORGANIZE'&&value.intent==='explicit'&&!actionPlans.has(action));
 const record={source,action,store,key:canonical(value),started:false,closed:false,transactions:new Set(),leases:[]};current(record);
 const cap=Object.freeze({});plans.set(cap,record);actionPlans.set(action,cap);return cap;
}
function recordFor(cap,store){const record=plans.get(cap);need(record&&record.store===store&&!record.closed);return record;}
export function beginOriginalOrganizePlan(cap,store,request){
 const record=recordFor(cap,store);need(!record.started);record.started=true;try{const value=copy(request);need(record.key===canonical(value));current(record);return value;}catch(error){releaseOriginalOrganizePlan(cap);throw error;}
}
export async function qualifyOriginalOrganizePlanTransaction(cap,store,t,request){
 const record=recordFor(cap,store);need(record.started&&record.transactions.size===0&&record.key===key(request));current(record);record.transactions.add(t);
 need(typeof scopeOwner.captureOriginalOrganizeCommitScope==='function'&&typeof scopeOwner.registerOriginalOrganizeCommitSelectionFence==='function');
 const topicIds=[...new Set(request.coverage.map(x=>x.scope))];need(topicIds.length===1&&request.coverage.every(x=>x.facet==='organize'));
 const proof=await scopeOwner.captureOriginalOrganizeCommitScope(store,t,topicIds[0],record.source,record.action);let grant;
 record.leases.push(()=>{if(grant)releaseOrganizeProcessingGrant(grant);scopeOwner.releaseOriginalOrganizeScope(proof);});
 // The separate local purpose policy can still refuse the exact selection.
 // No body-reader capability is minted by planning.
 grant=captureOrganizeProcessingGrant(record.source,record.action,store,t,proof);
 const metadata=scopeOwner.readOriginalOrganizeScope(proof,store,t),allowed=new Set([...metadata.entries.map(e=>JSON.stringify(['library_entry',e.id])),...metadata.inputs.map(i=>JSON.stringify(['input',i.input.id]))]),sourceIds=new Set(metadata.sources.map(s=>s.id));
 need(metadata.topic.id===topicIds[0]&&request.items.every(item=>allowed.has(item.key)&&Array.isArray(item.descriptor.sourceRecordIds)&&item.descriptor.sourceRecordIds.every(id=>sourceIds.has(id)))&&request.coverage.every(unit=>allowed.has(unit.key)));
 current(record);scopeOwner.registerOriginalOrganizeCommitSelectionFence(proof,store,t);
}
export function assertOriginalOrganizePlanFacts(cap,store){const record=recordFor(cap,store);need(record.started);assertOriginalOrganizeActionFacts(record.source,record.action,store);return true;}
export function releaseOriginalOrganizePlan(cap){
 const record=plans.get(cap);if(!record||record.closed)return;record.closed=true;
 for(const release of record.leases)release();record.leases=[];plans.delete(cap);
}
