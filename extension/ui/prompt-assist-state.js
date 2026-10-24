import {quickPromptEligible} from '../core/prompt-reuse-preferences.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const exact=(x,keys)=>!!x&&typeof x==='object'&&Object.keys(x).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(x,k));
function result(x){if(!x||!uuid.test(x.id)||x.kind!=='SUGGESTION'||!exact(x,['id','kind','text','condition',...(Object.hasOwn(x,'insertionAction')?['insertionAction']:[])])||!quickPromptEligible(x.text)||x.condition!=='')throw Error('UNCONFIRMED_ASSIST_RESULT');return {...x};}
const same=(a,b)=>a?.id===b?.id&&a?.text===b?.text&&a?.condition===b?.condition&&JSON.stringify(a?.insertionAction??null)===JSON.stringify(b?.insertionAction??null);
// The original R3 capsule consumes a source-qualified ready result. Refresh,
// opening, hovering and clicking never ask a model to generate anything.
export class PromptAssistState{
 constructor({send,changed=()=>{},newId=()=>crypto.randomUUID()}){this.send=send;this.changed=changed;this.newId=newId;this.source=null;this.result=null;this.busy=false;this.attempted=false;this.presented=null;this.message='';this.epoch=0;this.readEpoch=0;this.disposed=false;}
 get active(){return this.busy;}
 emit(){if(!this.disposed)this.changed(this);}
 async refresh(){if(this.disposed)return false;const ticket=++this.readEpoch;try{const value=await this.send({type:'suggestion_current'});if(this.disposed||ticket!==this.readEpoch)return false;if(!exact(value,['source','result'])||!['assist','local'].includes(value.source))throw Error('UNCONFIRMED_ASSIST_STATE');const next=value.result===null?null:result(value.result);if(!same(this.result,next)||this.source!==value.source){++this.epoch;this.result=next;this.source=value.source;this.presented=null;this.attempted=false;this.busy=false;this.message='';}}catch{if(this.disposed||ticket!==this.readEpoch)return false;++this.epoch;this.busy=false;this.result=null;this.presented=null;this.source=null;}this.emit();return !!this.result;}
 // Compatibility for private callers only: this is a read, never activation.
 activate(){return this.refresh();}
 markPresented(value){if(same(value,this.result))this.presented={...value};}
 async insert(){const shown=this.result,source=this.source;if(this.disposed||this.busy||this.attempted||!shown||!same(this.presented,shown))return false;const ticket=this.epoch;this.busy=true;this.message='inserting';this.emit();try{const qualified=result(await this.send({type:'suggestion_result',source,id:shown.id}));if(this.disposed||ticket!==this.epoch||!same(qualified,shown))throw Error('SUGGESTION_CHANGED');this.attempted=true;const ack=await this.send({type:'suggestion_insert',source,id:shown.id,operationId:shown.insertionAction?.operationId??this.newId(),...(shown.insertionAction?{insertionAction:shown.insertionAction}:{}),conditionPresented:true});if(this.disposed||ticket!==this.epoch)return false;const ok=ack?.status==='inserted'&&ack.verified===true;this.message=ok?'inserted':'uncertain';return ok;}catch{if(ticket===this.epoch){this.message=this.attempted?'uncertain':'changed';if(!this.attempted){this.result=null;this.presented=null;}}return false;}finally{if(ticket===this.epoch){this.busy=false;this.emit();}}}
 dismiss(){++this.readEpoch;++this.epoch;this.result=null;this.presented=null;this.busy=false;this.attempted=false;this.message='';this.emit();return Promise.resolve();}
 async cancel(){await this.send({type:'assist_cancel'});return this.dismiss();}
 invalidate(){if(this.busy)return;void this.refresh();}
 dispose(){this.disposed=true;++this.readEpoch;++this.epoch;this.result=null;this.presented=null;}
}
