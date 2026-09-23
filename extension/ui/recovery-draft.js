import {request} from './common.js';

export class RecoveryDraftSession{
 constructor({kind,ownerId,sourceRecordIds=[]}){
  this.kind=kind;this.ownerId=ownerId;this.sourceRecordIds=sourceRecordIds;this.tail=Promise.resolve();this.pending=false;this.generation=0;this.currentToken=null;
 }
 protect(operation,token){
  const generation=++this.generation;this.currentToken=token;this.pending=true;
  const run=this.tail.catch(()=>{}).then(()=>request('PAIA_RECOVERY_DRAFT_SAVE',{draft:{kind:this.kind,ownerId:this.ownerId,token,operation,sourceRecordIds:this.sourceRecordIds}}));
  this.tail=run;run.finally(()=>{if(this.generation===generation)this.pending=false;}).catch(()=>{});return run;
 }
 load(){return this.tail.catch(()=>{}).then(()=>request('PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:this.kind,ownerId:this.ownerId}}));}
 clear(token=this.currentToken){
  const generation=++this.generation;this.pending=true;
  const run=this.tail.catch(()=>{}).then(()=>request('PAIA_RECOVERY_DRAFT_CLEAR',{draft:{kind:this.kind,ownerId:this.ownerId,token}}));
  this.tail=run;run.finally(()=>{if(this.generation===generation)this.pending=false;}).catch(()=>{});return run;
 }
}

export const pruneRecoveryDrafts=()=>request('PAIA_RECOVERY_DRAFT_PRUNE');
