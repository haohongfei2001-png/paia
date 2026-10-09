import {fail,clone} from './value.js';
// Request-local allocation only. This capability grants no domain write or
// remote authority; the journal's separately validated plan owns that boundary.
const plans=new WeakMap(),transactions=new WeakMap(),replays=new WeakMap();
export function bindHumanReplayEntry(entry,events){if(!entry||replays.has(entry)||!Array.isArray(events))fail('BNS_HUMAN_ALLOCATION_INVALID');replays.set(entry,clone(events));return entry;}
export function prepareHumanAllocation(store,entry){
 const replay=replays.get(entry);if(replay)replays.delete(entry);const events=[];let sealed=false;const cap=Object.freeze({});
 const reserve=kind=>{if(sealed)fail('BNS_HUMAN_ALLOCATION_SEALED');const value=replay?replay[events.length]?.value:kind==='clock'?store.clock():store.uuid();if(replay&&replay[events.length]?.kind!==kind)fail('BNS_HUMAN_ALLOCATION_CHANGED');if(typeof value!=='string'||(kind==='clock'?!Number.isFinite(Date.parse(value)):!value.length))fail('BNS_HUMAN_ALLOCATION_INVALID');events.push({kind,value});return value;};
 plans.set(cap,{store,events});
 return {clock:()=>reserve('clock'),uuid:()=>reserve('uuid'),seal(){if(replay&&events.length!==replay.length)fail('BNS_HUMAN_ALLOCATION_CHANGED');sealed=true;return cap;},events:()=>clone(events)};
}
export function beginHumanAllocation(t,cap){
 const plan=plans.get(cap);if(!plan||transactions.has(t))fail('BNS_HUMAN_ALLOCATION_INVALID');transactions.set(t,{cap,...plan,index:0});
}
function next(store,t,kind){
 const current=transactions.get(t);if(!current)return kind==='clock'?store.clock():store.uuid();
 if(current.store!==store||current.events[current.index]?.kind!==kind)fail('BNS_HUMAN_ALLOCATION_CHANGED');return current.events[current.index++].value;
}
export const humanClock=(store,t)=>next(store,t,'clock');
export const humanUuid=(store,t)=>next(store,t,'uuid');
export function finishHumanAllocation(t,cap){const current=transactions.get(t);if(!current||current.cap!==cap||current.index!==current.events.length)fail('BNS_HUMAN_ALLOCATION_CHANGED');transactions.delete(t);}
export function releaseHumanAllocation(t){transactions.delete(t);}

// Deferred until the existing index owner actually starts a build. No bound
// transaction means its original UUID allocation path remains unchanged.
export function humanPreparedGeneration(store,t){return transactions.has(t)?()=>humanUuid(store,t):undefined;}

export function humanPruneTime(store,t){return transactions.has(t)?humanClock(store,t):null;}
