import {hashText} from '../core/dedupe.js';
import {validateContextTopicChange} from '../core/context-topic-preferences.js';
import {request} from './common.js';

const sameIntent=(left,right)=>['topicId','enabled','expectedRevision','epoch'].every(key=>left[key]===right[key])&&JSON.stringify(left.expectedBinding)===JSON.stringify(right.expectedBinding);
const acknowledged=(result,change)=>{
 if(!result||result.externalAllowed!==false)return false;
 if(result.ok===true)return result.topicId===change.topicId&&result.enabled===change.enabled&&Number.isSafeInteger(result.revision)&&typeof result.noOp==='boolean'&&(result.noOp?change.enabled===false&&change.expectedRevision===0&&change.expectedBinding===null&&result.revision===0:result.revision===change.expectedRevision+1);
 return result.ok===false&&typeof result.conflict==='boolean'&&typeof result.reason==='string';
};
const invalidated=error=>error?.code==='CONTEXT_INVALIDATED';

// A local preference attempt keeps its exact identity through preparation,
// dispatch and an unknown response. It never changes to another Topic or intent.
export class ContextTopicCommitSession {
 constructor(send=request){this.send=send;this.pending=null;this.running=null;}
 async save(change){
  validateContextTopicChange(change);
  if(this.pending&&!sameIntent(this.pending.change,change))throw Object.assign(new Error('Resolve the previous Topic choice first'),{code:'SAVE_PENDING_OTHER'});
  if(!this.pending){
   const captured=structuredClone(change);if(captured.expectedBinding)Object.freeze(captured.expectedBinding);Object.freeze(captured);
   // Reserve before the digest await, so a second click cannot create a new
   // operation while the first operation is still preparing its receipt key.
   this.pending={change:captured,digest:null,sent:false};
  }
  if(this.running)return this.running;
  const attempt=this.pending;
  this.running=(async()=>{
   try{
    if(!attempt.digest)attempt.digest=await hashText(JSON.stringify(attempt.change));
    attempt.sent=true;
    const result=await this.send('PAIA_CONTEXT_TOPICS_CHANGE',{change:attempt.change});
    if(!acknowledged(result,attempt.change))throw Error('SAVE_OUTCOME_UNKNOWN');
    this.pending=null;return {change:attempt.change,result};
   }catch(error){
    if(!attempt.sent||invalidated(error)){this.pending=null;throw error;}
    try{
     const outcome=await this.send('PAIA_CONTEXT_TOPICS_OUTCOME',{query:{operationId:attempt.change.operationId,digest:attempt.digest,epoch:attempt.change.epoch}});
     if(outcome?.externalAllowed===false&&outcome.state==='committed'&&outcome.result?.ok===true&&acknowledged(outcome.result,attempt.change)){this.pending=null;return {change:attempt.change,result:outcome.result};}
     if(outcome?.externalAllowed===false&&outcome.state==='not_committed')this.pending=null;
    }catch(outcomeError){if(invalidated(outcomeError)){this.pending=null;throw outcomeError;}}
    throw error;
   }
  })();
  try{return await this.running;}finally{this.running=null;}
 }
}
