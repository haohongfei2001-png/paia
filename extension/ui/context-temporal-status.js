import {contextTemporalProjection} from '../core/context-temporal.js';

// A read-only clock projection of the current canonical editor metadata. This
// owns no body, revision, processing opportunity or external-read permission.
export class ContextTemporalStatus {
 constructor({node,item,isEditing=()=>false,isCurrent=()=>true,clock=()=>Date.now(),schedule=setTimeout,cancel=clearTimeout}){
  this.node=node;this.item=item;this.isEditing=isEditing;this.isCurrent=isCurrent;this.clock=clock;this.schedule=(callback,delay)=>schedule(callback,delay);this.cancel=timer=>cancel(timer);this.generation=0;this.timer=null;this.disposed=false;
  node.setAttribute('role','status');this.refresh();
 }
 refresh(){
  const generation=++this.generation;this.cancel(this.timer);this.timer=null;
  this.node.textContent='';this.node.hidden=true;
  if(this.disposed||!this.isCurrent()||this.isEditing())return;
  const at=this.clock(),state=contextTemporalProjection(this.item(),at);
  if(state?.temporalStatus==='expired'){
   this.node.textContent=document.documentElement.lang==='en'?'Validity period ended. Review this item.':'有效期已过，请核对。';this.node.hidden=false;
  }else if(state?.temporalStatus==='not_expired'){
   const remaining=Date.parse(state.temporal.validUntil)-at;
   if(remaining>0){
    // The platform timer bound is not a validity duration or default TTL.
    this.timer=this.schedule(()=>{if(!this.disposed&&generation===this.generation)this.refresh();},Math.min(remaining,2147483647));this.timer?.unref?.();
   }
  }
 }
 dispose(){this.disposed=true;++this.generation;this.cancel(this.timer);this.timer=null;this.node.textContent='';this.node.hidden=true;}
}
