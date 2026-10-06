import {hashText} from '../core/dedupe.js';
import {request} from './common.js';

// One immutable operation survives lost replies. Newer text cannot be marked
// saved by acknowledgement of an older body. Retries keep the same operation ID.
export class ContextCommitSession {
 constructor(send=request){this.send=send;this.pending=null;}
 async save(change){
  if(this.pending){
   const prior=this.pending.change;
   // A retry may carry newer text for the same editor, but never a new target,
   // action, authorization value or restore epoch. Return the exact old edit.
   if(['kind','itemId','key','epoch','expectedRevision','enabled','deletedBy'].some(k=>prior[k]!==change[k]))
    throw Object.assign(new Error('Resolve the previous operation first'),{code:'SAVE_PENDING_OTHER'});
  }
  if(!this.pending)this.pending={change:structuredClone(change),digest:await hashText(JSON.stringify(change))};
  const attempt=this.pending;
  try{
   const result=await this.send('PAIA_CONTEXT_CARDS_CHANGE',{change:attempt.change});
   if(result?.ok!==true&&result?.conflict!==true)throw Error('SAVE_OUTCOME_UNKNOWN');
   this.pending=null;return {change:attempt.change,result};
  }catch(error){
   if(error?.code==='CONTEXT_INVALIDATED'){this.pending=null;throw error;}
   try{const outcome=await this.send('PAIA_CONTEXT_CARDS_OUTCOME',{query:{operationId:attempt.change.operationId,digest:attempt.digest,epoch:attempt.change.epoch}});if(outcome?.state==='committed'&&outcome.result?.ok===true){this.pending=null;return {change:attempt.change,result:outcome.result};}if(outcome?.state==='not_committed')this.pending=null;}catch(outcomeError){if(outcomeError?.code==='CONTEXT_INVALIDATED'){this.pending=null;throw outcomeError;}}
   throw error;
  }
 }
}
