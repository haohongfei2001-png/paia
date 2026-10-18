const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const exact=(x,keys)=>!!x&&typeof x==='object'&&Object.keys(x).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(x,k));
function result(x){
 if(!x||!uuid.test(x.id))throw Error('UNCONFIRMED_ASSIST_RESULT');
 if(x.kind==='SUGGESTION'&&exact(x,['id','kind','text','condition'])&&typeof x.text==='string'&&x.text.trim()&&[...x.text].length<=120&&typeof x.condition==='string'&&[...x.condition].length<=120)return {...x};
 if(x.kind==='DEFER'&&exact(x,['id','kind','reason'])&&typeof x.reason==='string'&&x.reason.length<=200)return {...x};
 throw Error('UNCONFIRMED_ASSIST_RESULT');
}
const same=(a,b)=>a?.id===b?.id&&a?.kind===b?.kind&&a?.text===b?.text&&a?.condition===b?.condition&&a?.reason===b?.reason;
// View state only: every materialized result and insertion still belongs to the
// original authenticated worker/content owners. No automatic paid activation.
export class PromptAssistState{
 constructor({send,changed=()=>{},newId=()=>crypto.randomUUID()}){this.send=send;this.changed=changed;this.newId=newId;this.status=null;this.result=null;this.busy=false;this.attempted=false;this.presented=null;this.message='';this.epoch=0;this.readEpoch=0;this.cancelBarrier=Promise.resolve();this.disposed=false;}
 get active(){return this.busy||!!this.result;}
 emit(){if(!this.disposed)this.changed(this);}
 async refresh(){const ticket=++this.readEpoch;try{const x=await this.send({type:'assist_status'});if(ticket!==this.readEpoch||this.disposed)return false;if(!exact(x,['available','enabled','ready'])||!Object.values(x).every(v=>typeof v==='boolean'))throw Error('UNCONFIRMED_ASSIST_STATUS');this.status={...x};}catch{if(ticket!==this.readEpoch||this.disposed)return false;this.status=null;}this.emit();return !!this.status;}
 async activate(){
  if(this.disposed||this.busy)return false;
  if(!this.status?.available||!this.status.enabled||!this.status.ready){this.message=!this.status?.available?'unavailable':!this.status.enabled?'permission':'no-reply';this.emit();return false;}
  const ticket=++this.epoch;this.busy=true;this.result=null;this.presented=null;this.attempted=false;this.message='pending';this.emit();
  try{await this.cancelBarrier;if(this.disposed||ticket!==this.epoch)return false;const current=result(await this.send({type:'assist_activate'}));if(this.disposed||ticket!==this.epoch)return false;this.result=current;this.message=current.kind==='DEFER'?'defer':'';return true;}
  catch{if(!this.disposed&&ticket===this.epoch)this.message='unavailable';return false;}
  finally{if(ticket===this.epoch){this.busy=false;this.emit();}}
 }
 markPresented(value){if(same(value,this.result)&&value?.kind==='SUGGESTION')this.presented={...value};}
 async insert(){
  const shown=this.result;if(this.disposed||this.busy||this.attempted||shown?.kind!=='SUGGESTION'||!same(this.presented,shown))return false;
  const ticket=this.epoch;this.busy=true;this.message='inserting';this.emit();
  try{const qualified=result(await this.send({type:'assist_result',id:shown.id}));if(this.disposed||ticket!==this.epoch)return false;if(!same(qualified,shown))throw Error('ASSIST_CHANGED');
   this.attempted=true;const ack=await this.send({type:'assist_insert',id:shown.id,operationId:this.newId(),conditionPresented:true});if(this.disposed||ticket!==this.epoch)return false;
   const verified=ack?.status==='inserted'&&ack.verified===true;this.message=verified?'inserted':'uncertain';return verified;
  }catch{if(!this.disposed&&ticket===this.epoch){this.message=this.attempted?'uncertain':'changed';if(!this.attempted){this.result=null;this.presented=null;}}return false;}
  finally{if(ticket===this.epoch){this.busy=false;this.emit();}}
 }
 dismiss(){const previous=this.result,active=this.active;++this.epoch;this.result=null;this.presented=null;this.busy=false;this.attempted=false;this.message='';this.emit();if(active){this.cancelBarrier=this.cancelBarrier.then(()=>this.send({type:'assist_cancel'})).catch(()=>{});if(previous)void this.send({type:'assist_dismiss',id:previous.id}).catch(()=>{});}return this.cancelBarrier;}
 invalidate(){void this.dismiss();void this.refresh();}
 dispose(){void this.dismiss();this.disposed=true;++this.readEpoch;}
}
