import {request} from './common.js';

export class RecoveryDraftSession{
 constructor({kind,ownerId,sourceRecordIds=[]}){
  this.kind=kind;this.ownerId=ownerId;this.sourceRecordIds=sourceRecordIds;this.pending=false;this.sequence=0;this.currentToken=null;this.latest=null;this.running=null;this.waiters=[];
 }
 protect(operation,token){
  const sequence=++this.sequence;this.currentToken=token;this.latest={sequence,operation,token};this.pending=true;
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
    const item=this.latest;this.latest=null;
    try{
     const result=await request('PAIA_RECOVERY_DRAFT_SAVE',{draft:{kind:this.kind,ownerId:this.ownerId,token:item.token,operation:item.operation,sourceRecordIds:this.sourceRecordIds}});
     this.settle(item.sequence,null,result);
    }catch(error){
     // A newer snapshot supersedes this failed write. Let that write satisfy
     // older waiters instead of surfacing a failure for state that is obsolete.
     if(this.latest)continue;
     this.settle(item.sequence,error);
    }
   }
  })().finally(()=>{this.running=null;this.pending=!!this.latest||this.waiters.length>0;if(this.latest)void this.drain();});
  return this.running;
 }
 async load(){if(this.running)await this.running.catch(()=>{});return request('PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:this.kind,ownerId:this.ownerId}});}
 clear(token=this.currentToken){return request('PAIA_RECOVERY_DRAFT_CLEAR',{draft:{kind:this.kind,ownerId:this.ownerId,token}});}
}

export const clearRecoveryDrafts=drafts=>request('PAIA_RECOVERY_DRAFT_CLEAR_MANY',{drafts});
export const pruneRecoveryDrafts=()=>request('PAIA_RECOVERY_DRAFT_PRUNE');
