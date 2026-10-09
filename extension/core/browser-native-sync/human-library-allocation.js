import {fail,clone,plain,exact,count,identifier} from './value.js';
// Request-local allocation only; no domain write, virtual store or global clock.
const plans=new WeakMap(),transactions=new WeakMap(),replays=new WeakMap();
const all=(value,keys)=>plain(value)&&exact(value,keys)&&Object.keys(value).length===keys.length;
const generationOK=value=>typeof value==='string'&&/^[a-zA-Z0-9_.-]{1,80}$/.test(value);
export function validateHumanAllocationEvents(events,allocation){
 if(!Array.isArray(events)||!all(allocation,['domainCount','indexGenerationCount'])||!count(allocation.domainCount)||!count(allocation.indexGenerationCount))fail('BNS_HUMAN_ALLOCATION_INVALID');let domain=0,index=0,lastDomain=null;const anchors=new Set();
 for(const event of events){
  if(event?.role==='domain'){if(!all(event,['kind','role','ordinal','value'])||event.ordinal!==domain++||!(event.kind==='clock'?typeof event.value==='string'&&Number.isFinite(Date.parse(event.value)):event.kind==='uuid'&&identifier(event.value)))fail('BNS_HUMAN_ALLOCATION_INVALID');lastDomain=event;}
  else if(event?.role==='index-generation'){if(!all(event,['kind','role','ordinal','value','afterDomainOrdinal'])||event.kind!=='uuid'||event.ordinal!==index++||!generationOK(event.value)||lastDomain?.kind!=='clock'||event.afterDomainOrdinal!==lastDomain.ordinal||anchors.has(event.afterDomainOrdinal))fail('BNS_HUMAN_ALLOCATION_INVALID');anchors.add(event.afterDomainOrdinal);}
  else fail('BNS_HUMAN_ALLOCATION_INVALID');
 }
 if(domain!==allocation.domainCount||index!==allocation.indexGenerationCount)fail('BNS_HUMAN_ALLOCATION_INVALID');return allocation;
}
export function bindHumanReplayEntry(entry,events,allocation){if(!entry||replays.has(entry))fail('BNS_HUMAN_ALLOCATION_INVALID');validateHumanAllocationEvents(events,allocation);replays.set(entry,{events:clone(events),allocation:clone(allocation)});return entry;}
export function prepareHumanAllocation(store,entry){
 const replay=replays.get(entry);if(replay)replays.delete(entry);const events=[];let sealed=false,domain=0,index=0,sourceAt=0,openSlot=null;const cap=Object.freeze({});
 const reserve=kind=>{
  if(sealed)fail('BNS_HUMAN_ALLOCATION_SEALED');if(openSlot)fail('BNS_HUMAN_ALLOCATION_CHANGED');const source=replay?.events[sourceAt];if(replay&&(source?.role!=='domain'||source.kind!==kind||source.ordinal!==domain))fail('BNS_HUMAN_ALLOCATION_CHANGED');const value=replay?source.value:kind==='clock'?store.clock():store.uuid();if(typeof value!=='string'||(kind==='clock'?!Number.isFinite(Date.parse(value)):!identifier(value)))fail('BNS_HUMAN_ALLOCATION_INVALID');events.push({kind,role:'domain',ordinal:domain++,value});if(replay)sourceAt++;return value;
 };
 plans.set(cap,{store,events});
 return {
  clock:()=>reserve('clock'),uuid:()=>reserve('uuid'),
  indexGenerationSlot(){
   if(sealed)fail('BNS_HUMAN_ALLOCATION_SEALED');if(openSlot||events.at(-1)?.role!=='domain'||events.at(-1)?.kind!=='clock')fail('BNS_HUMAN_ALLOCATION_CHANGED');const anchor=domain-1,source=replay?.events[sourceAt];if(source?.role==='index-generation'){if(source.afterDomainOrdinal!==anchor)fail('BNS_HUMAN_ALLOCATION_CHANGED');sourceAt++;}
   const slot={used:false,closed:false};openSlot=slot;
   return {allocate(){if(openSlot!==slot||slot.closed||slot.used)fail('BNS_HUMAN_ALLOCATION_CHANGED');const value=store.uuid();if(!generationOK(value))fail('BNS_HUMAN_ALLOCATION_INVALID');slot.used=true;events.push({kind:'uuid',role:'index-generation',ordinal:index++,value,afterDomainOrdinal:anchor});return value;},close(){if(openSlot!==slot||slot.closed)fail('BNS_HUMAN_ALLOCATION_CHANGED');slot.closed=true;openSlot=null;}};
  },
  seal(){if(openSlot||replay&&sourceAt!==replay.events.length)fail('BNS_HUMAN_ALLOCATION_CHANGED');sealed=true;validateHumanAllocationEvents(events,{domainCount:domain,indexGenerationCount:index});return cap;},
  events:()=>clone(events),counts:()=>({domainCount:domain,indexGenerationCount:index})
 };
}
export function beginHumanAllocation(t,cap){const plan=plans.get(cap);if(!plan||transactions.has(t))fail('BNS_HUMAN_ALLOCATION_INVALID');transactions.set(t,{cap,...plan,index:0,domain:0,generation:0,lastDomain:null});}
function next(store,t,kind,role='domain'){
 const current=transactions.get(t);if(!current)return kind==='clock'?store.clock():store.uuid();const event=current.events[current.index];if(current.store!==store||event?.kind!==kind||event.role!==role)fail('BNS_HUMAN_ALLOCATION_CHANGED');
 if(role==='domain'){if(event.ordinal!==current.domain++)fail('BNS_HUMAN_ALLOCATION_CHANGED');current.lastDomain=event;}else if(event.ordinal!==current.generation++||current.lastDomain?.kind!=='clock'||event.afterDomainOrdinal!==current.lastDomain.ordinal)fail('BNS_HUMAN_ALLOCATION_CHANGED');current.index++;return event.value;
}
export const humanClock=(store,t)=>next(store,t,'clock');
export const humanUuid=(store,t)=>next(store,t,'uuid');
export function finishHumanAllocation(t,cap){const current=transactions.get(t);if(!current||current.cap!==cap||current.index!==current.events.length)fail('BNS_HUMAN_ALLOCATION_CHANGED');transactions.delete(t);}
export function releaseHumanAllocation(t){transactions.delete(t);}
export function humanPreparedGeneration(store,t){return transactions.has(t)?()=>next(store,t,'uuid','index-generation'):undefined;}
export function humanPruneTime(store,t){return transactions.has(t)?humanClock(store,t):null;}
