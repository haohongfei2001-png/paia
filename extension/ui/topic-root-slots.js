// Topic positions are local presentation state. Labels, bodies, permissions and
// canonical Topic/Section order never enter this owner. A partial read cannot
// prove that an unseen identity was removed.
const idOK=value=>typeof value==='string'&&value.length>0&&value.length<=200;
// This bounds optional history serialization, never the current library/query.
const historySlots=50000;
const columnsOK=value=>Number.isInteger(value)&&value>=1&&value<=4;
const metadataOnlyCauses=new Set(['CREATE_LIBRARY_TOPIC','EDIT_LIBRARY_TOPIC','CREATE_LIBRARY_SECTION','EDIT_LIBRARY_SECTION','EDIT_LIBRARY_FIELDS','CONTINUE_THINKING']);
export const canRetainRootMetadata=cause=>typeof cause==='string'&&metadataOnlyCauses.has(cause);
export class TopicRootSlots {
 constructor(saved=null){
  this.views=new Map();this.removed=new Set();
  if(saved?.version!==1||!Array.isArray(saved.views)||!Array.isArray(saved.removed))return;
  if(saved.views.length>4||saved.views.some(view=>!Array.isArray(view)||view.length!==2)||saved.removed.length>historySlots||saved.removed.some(id=>!idOK(id)))return;
  for(const [columns,slots]of saved.views){
   if(!columnsOK(columns)||this.views.has(columns)||!Array.isArray(slots)||slots.length>historySlots||slots.some(id=>id!==null&&!idOK(id))||new Set(slots.filter(Boolean)).size!==slots.filter(Boolean).length){this.views.clear();return;}
   this.views.set(columns,[...slots]);
  }
  this.removed=new Set(saved.removed);
 }
 reconcile(ids,{columns=4,complete=false}={}){
  if(!columnsOK(columns)||!Array.isArray(ids)||ids.some(id=>!idOK(id))||new Set(ids).size!==ids.length)throw Error('INVALID_ROOT_IDENTITIES');
  const present=new Set(ids);
  if(complete){for(const slots of this.views.values())for(const id of slots)if(id&&!present.has(id))this.removed.add(id);}
  for(const id of ids)this.removed.delete(id);
  if(!this.views.has(columns))this.views.set(columns,[...(this.views.values().next().value||[])]);
  const slots=this.views.get(columns),positions=new Map(slots.map((id,index)=>[id,index])),holes=[];let nextHole=0;
  for(let index=0;index<slots.length;index++)if(slots[index]===null||this.removed.has(slots[index]))holes.push(index);
  for(const id of ids){
   if(positions.has(id))continue;
   const hole=holes[nextHole++],index=hole??slots.length;
   if(hole!==undefined)positions.delete(slots[hole]);slots[index]=id;positions.set(id,index);
  }
  // Forgotten reservations have no surviving address to restore.
  const retained=new Set([...this.views.values()].flat());for(const id of this.removed)if(!retained.has(id))this.removed.delete(id);
  return ids.map(id=>{const slot=positions.get(id);return {id,slot,column:slot%columns+1,row:Math.floor(slot/columns)+1};}).sort((a,b)=>a.slot-b.slot);
 }
 snapshot(){return {version:1,views:[...this.views].map(([columns,slots])=>[columns,[...slots]]),removed:[...this.removed]};}
 extent(columns){return columns===undefined?Math.max(0,...[...this.views.values()].map(slots=>slots.length)):this.views.get(columns)?.length||0;}
}

// Keep the existing browser-history route owner intact. This namespace contains
// only identity addresses and may be dropped by the browser on quota failure;
// the live controller still retains its current positions.
export function readTopicRootSlots(history=globalThis.history){return new TopicRootSlots(history?.state?.paiaTopicRootSlots);}
export function saveTopicRootSlots(slots,history=globalThis.history){
 try{const snapshot=slots.snapshot();if(snapshot.views.some(([,values])=>values.length>historySlots)||JSON.stringify(snapshot).length>500000)return false;history?.replaceState({...history.state,paiaTopicRootSlots:snapshot},'');return true;}catch{return false;}
}
