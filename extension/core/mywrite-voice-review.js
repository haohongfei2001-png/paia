import {MAX_MESSAGE_LENGTH} from './constants.js';

// Detached local review boundary. No microphone, processor, storage, Source,
// network or product entrypoint is selected here. A platform owner supplies
// capture and transcription only for an explicit user-initiated operation.
export class MyWriteVoiceError extends Error{
 constructor(code){super(code);this.name='MyWriteVoiceError';this.code=code;}
}
const failure=code=>new MyWriteVoiceError(code);
const validText=value=>typeof value==='string'&&value.length>0&&value.length<=MAX_MESSAGE_LENGTH;
export function createMyWriteVoiceReview({capture,transcribe}={}){
 if(typeof capture?.start!=='function'||typeof transcribe!=='function')
  throw failure('MYWRITE_VOICE_INVALID');
 let generation=0,phase='idle',recording=null,transcript=null,disposed=false;
 const current=token=>!disposed&&token===generation;
 const state=()=>Object.freeze({phase,generation,hasTranscript:phase==='review'});
 const cancelRecording=async session=>{try{await session?.cancel?.();}catch{/* Cancellation remains fail closed. */}};
 function ensureOpen(){if(disposed)throw failure('MYWRITE_VOICE_DISPOSED');}
 async function start(){
  ensureOpen();if(phase!=='idle')throw failure('MYWRITE_VOICE_BUSY');
  const token=++generation;phase='starting';
  try{
   const session=await capture.start();
   if(!session||typeof session.stop!=='function'||typeof session.cancel!=='function'){
    await cancelRecording(session);throw failure('MYWRITE_VOICE_INVALID');
   }
   if(!current(token)){await cancelRecording(session);throw failure('MYWRITE_VOICE_CANCELLED');}
   recording=session;phase='recording';return state();
  }catch{
   if(current(token)){phase='failed';recording=null;transcript=null;throw failure('MYWRITE_VOICE_UNAVAILABLE');}
   throw failure('MYWRITE_VOICE_CANCELLED');
  }
 }
 async function stop(){
  ensureOpen();if(phase!=='recording'||!recording)throw failure('MYWRITE_VOICE_BUSY');
  const token=generation,session=recording;phase='transcribing';
  try{
   const audio=await session.stop();
   if(!current(token))throw failure('MYWRITE_VOICE_CANCELLED');
   const result=await transcribe(audio);
   if(!current(token))throw failure('MYWRITE_VOICE_CANCELLED');
   if(!validText(result))throw failure('MYWRITE_VOICE_TRANSCRIPT_INVALID');
   transcript=result;recording=null;phase='review';
   return Object.freeze({generation:token,text:result});
  }catch(error){
   if(!current(token))throw failure('MYWRITE_VOICE_CANCELLED');
   recording=null;transcript=null;phase='failed';
   if(error instanceof MyWriteVoiceError)throw error;
   throw failure('MYWRITE_VOICE_TRANSCRIPTION_FAILED');
  }
 }
 function preview(){
  ensureOpen();if(phase!=='review'||transcript===null)throw failure('MYWRITE_VOICE_NOT_READY');
  return Object.freeze({generation,text:transcript});
 }
 function accept({generation:expected,text}={}){
  ensureOpen();if(phase!=='review'||transcript===null||expected!==generation)
   throw failure('MYWRITE_VOICE_STALE_REVIEW');
  if(!validText(text))throw failure('MYWRITE_VOICE_TRANSCRIPT_INVALID');
  transcript=null;phase='idle';generation++;
  // The caller owns this exact reviewed text. No automatic save is performed.
  return text;
 }
 async function cancel(){
  ensureOpen();const session=recording;
  generation++;recording=null;transcript=null;phase='idle';
  await cancelRecording(session);return state();
 }
 async function dispose(){
  if(disposed)return;disposed=true;generation++;
  const session=recording;recording=null;transcript=null;phase='disposed';
  await cancelRecording(session);
 }
 return Object.freeze({start,stop,preview,accept,cancel,dispose,state});
}
