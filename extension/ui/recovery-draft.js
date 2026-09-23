import {RecoveryDraftStore} from '../core/recovery-draft.js';

const store=new RecoveryDraftStore(chrome.storage.local);

export class RecoveryDraftSession{
 constructor({kind,ownerId,sourceRecordIds=[]}){
  this.kind=kind;this.ownerId=ownerId;this.sourceRecordIds=sourceRecordIds;this.tail=Promise.resolve();this.pending=false;this.generation=0;this.currentToken=null;
 }
 protect(operation,token){
  const generation=++this.generation;this.currentToken=token;this.pending=true;
  const run=this.tail.catch(()=>{}).then(()=>store.save({kind:this.kind,ownerId:this.ownerId,token,operation,sourceRecordIds:this.sourceRecordIds}));
  this.tail=run;run.finally(()=>{if(this.generation===generation)this.pending=false;}).catch(()=>{});return run;
 }
 load(){return this.tail.catch(()=>{}).then(()=>store.load(this.kind,this.ownerId));}
 clear(token=this.currentToken){
  const generation=++this.generation;this.pending=true;
  const run=this.tail.catch(()=>{}).then(()=>store.clear(this.kind,this.ownerId,token));
  this.tail=run;run.finally(()=>{if(this.generation===generation)this.pending=false;}).catch(()=>{});return run;
 }
}

export const pruneRecoveryDrafts=()=>store.prune();
