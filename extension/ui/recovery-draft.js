import {request} from './common.js';

export class RecoveryDraftSession{
 #retained=null;
 // The existing snapshot stays private to its original writer. Consumers get
 // only exact receipt state, never a snapshot accessor or a new storage DTO.
 retain(operation,token){
  const signature=JSON.stringify(operation);this.#retained={operation:structuredClone(operation),token,signature};
  if(this.lastFailure?.token===token&&this.lastFailure.signature===signature)return Promise.resolve(false);
  return this.protect(operation,token,{revalidate:true}).then(()=>this.retainedProtected,()=>false);
 }
 get retainedProtected(){const item=this.#retained;return !!item&&!(this.lastFailure?.token===item.token&&this.lastFailure.signature===item.signature)&&this.persisted?.token===item.token&&this.persisted.signature===item.signature;}
 async retryRetained(){const item=this.#retained;if(!item)return false;try{await this.protect(item.operation,item.token,{revalidate:true});return this.#retained===item&&this.retainedProtected;}catch{return false;}}
 async discardRetained(){
  const item=this.#retained;if(!item)return true;if(this.running)await this.running;
  const prior=this.persisted;let cleared=await this.clear(item.token);
  if(!cleared){
   // Failed B may have left our own acknowledged A. Never clear an unknown
   // token or mistake load()'s live-editor suppression for actual absence.
   const stored=await request('PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:this.kind,ownerId:this.ownerId,epoch:this.epoch}});
   if(!stored)cleared=true;
   else if(prior?.token===stored.token&&prior.signature===JSON.stringify(stored.operation))cleared=await this.clear(prior.token);
  }
  if(!cleared||this.#retained!==item)return false;
  if(this.currentToken===item.token)this.currentToken=null;this.#retained=null;return true;
 }
 releaseRetained(){this.#retained=null;}

 constructor({kind,ownerId,sourceRecordIds=[],epoch}){
  this.kind=kind;this.ownerId=ownerId;this.sourceRecordIds=sourceRecordIds;this.pending=false;this.sequence=0;this.currentToken=null;this.latest=null;this.running=null;this.runningItem=null;this.persisted=null;this.waiters=[];
  this.epoch=epoch??null;
 }
 protect(operation,token,{revalidate=false}={}){
  const signature=JSON.stringify(operation);this.currentToken=token;
  if(!revalidate&&this.persisted?.token===token&&this.persisted.signature===signature)return Promise.resolve(this.persisted.result);
  const active=[this.latest,this.runningItem].find(item=>item?.token===token&&item.signature===signature);
  if(active){this.pending=true;return new Promise((resolve,reject)=>this.waiters.push({sequence:active.sequence,resolve,reject}));}
  const sequence=++this.sequence;this.latest={sequence,operation,token,signature};this.pending=true;
  const promise=new Promise((resolve,reject)=>this.waiters.push({sequence,resolve,reject}));
  void this.drain();return promise;
 }
 settle(sequence,error=null,result=null){
  const remaining=[];for(const waiter of this.waiters){if(waiter.sequence<=sequence){if(error)waiter.reject(error);else waiter.resolve(result);}else remaining.push(waiter);}this.waiters=remaining;
 }
 drain(){
  if(this.running)return this.running;
  this.running=(async()=>{
   while(this.latest){
    const item=this.latest;this.latest=null;this.runningItem=item;
    try{
     const epoch=this.epoch;if(!epoch)throw Error('RECOVERY_CONTEXT_UNAVAILABLE');
     const result=await request('PAIA_RECOVERY_DRAFT_SAVE',{draft:{epoch,kind:this.kind,ownerId:this.ownerId,token:item.token,operation:item.operation,sourceRecordIds:this.sourceRecordIds}});
     this.lastFailure=null;this.persisted={token:item.token,signature:item.signature,result};this.settle(item.sequence,null,result);
    }catch(error){
     // A newer snapshot supersedes this failed write. Let that write satisfy
     // older waiters instead of surfacing a failure for state that is obsolete.
     if(this.latest)continue;
     this.lastFailure={token:item.token,signature:item.signature};this.settle(item.sequence,error);
    }finally{this.runningItem=null;}
   }
  })().finally(()=>{this.running=null;this.pending=!!this.latest||this.waiters.length>0;if(this.latest)void this.drain();});
  return this.running;
 }
 async load(){
  if(this.running)await this.running.catch(()=>{});
  // Recovery is only for a prior interrupted session. Once this live editor has
  // protected a newer local change, a delayed load must not replay either the
  // just-written draft or an older draft over the active in-memory edit.
  if(this.currentToken)return null;
  const draft=await request('PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:this.kind,ownerId:this.ownerId,epoch:this.epoch}});
  return this.currentToken?null:draft;
 }
 async discard(token=this.currentToken){
  // Wait for every already queued protection write before clearing its token.
  // A newer edit has a different token and must survive this delayed discard.
  if(!token)return true;
  if(this.running)await this.running.catch(()=>{});
  const result=await this.clear(token);
  if(this.currentToken===token){this.currentToken=null;this.persisted=null;}
  return result;
 }
 async clear(token=this.currentToken){const result=await request('PAIA_RECOVERY_DRAFT_CLEAR',{draft:{kind:this.kind,ownerId:this.ownerId,token}});if(result&&this.persisted?.token===token)this.persisted=null;return result;}
}

export const clearRecoveryDrafts=drafts=>request('PAIA_RECOVERY_DRAFT_CLEAR_MANY',{drafts});
export const pruneRecoveryDrafts=()=>request('PAIA_RECOVERY_DRAFT_PRUNE');