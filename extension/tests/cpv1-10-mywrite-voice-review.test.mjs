import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_MESSAGE_LENGTH} from '../core/constants.js';
import {createMyWriteVoiceReview,MyWriteVoiceError} from '../core/mywrite-voice-review.js';

const whole=Array.from({length:1000},(_,i)=>'语音想法第'+i+'段🧭：保留原话、否定和换行。\n').join('')+
 '最终修订：不要自动发送，也不要自动保存。';
const code=value=>error=>error instanceof MyWriteVoiceError&&error.code===value&&error.message===value;
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function fixture({start,stop,transcribe}={}){
 const counts={start:0,stop:0,cancel:0,transcribe:0};
 const audio={synthetic:true};
 const session={
  async stop(){counts.stop++;return stop?stop():audio;},
  async cancel(){counts.cancel++;}
 };
 const capture={async start(){counts.start++;return start?start(session):session;}};
 const local=async value=>{counts.transcribe++;assert.equal(value,audio);return transcribe?transcribe(value):whole;};
 return {counts,audio,session,capture,local};
}

test('CPV1-10.3 detached voice review retains the complete transcript and explicit corrected handoff without automatic persistence',async()=>{
 const f=fixture(),flow=createMyWriteVoiceReview({capture:f.capture,transcribe:f.local});
 assert.deepEqual(f.counts,{start:0,stop:0,cancel:0,transcribe:0});
 assert.deepEqual(flow.state(),{phase:'idle',generation:0,hasTranscript:false});
 await flow.start();assert.equal(flow.state().phase,'recording');
 const result=await flow.stop();assert.equal(result.text,whole);
 assert.deepEqual(flow.preview(),result);
 assert.equal(f.counts.start,1);assert.equal(f.counts.stop,1);assert.equal(f.counts.transcribe,1);
 const corrected=whole+'\n我核对并补充了最后一句。';
 assert.equal(flow.accept({generation:result.generation,text:corrected}),corrected);
 assert.equal(flow.state().phase,'idle');assert.equal(flow.state().hasTranscript,false);
 assert.throws(()=>flow.preview(),code('MYWRITE_VOICE_NOT_READY'));
 assert.equal(f.counts.start,1);
 await flow.dispose();
});

test('CPV1-10.3 review refuses stale, empty and oversized edits without clipping or consuming the current full transcript',async()=>{
 const f=fixture(),flow=createMyWriteVoiceReview({capture:f.capture,transcribe:f.local});
 await flow.start();
 await assert.rejects(()=>flow.start(),code('MYWRITE_VOICE_BUSY'));
 const review=await flow.stop();
 await assert.rejects(()=>flow.start(),code('MYWRITE_VOICE_BUSY'));
 assert.throws(()=>flow.accept({generation:review.generation+1,text:whole}),code('MYWRITE_VOICE_STALE_REVIEW'));
 assert.throws(()=>flow.accept({generation:review.generation,text:''}),code('MYWRITE_VOICE_TRANSCRIPT_INVALID'));
 assert.throws(()=>flow.accept({generation:review.generation,text:'字'.repeat(MAX_MESSAGE_LENGTH+1)}),code('MYWRITE_VOICE_TRANSCRIPT_INVALID'));
 assert.equal(flow.preview().text,whole);
 assert.equal(flow.accept({generation:review.generation,text:whole}),whole);
 await flow.dispose();
});

test('CPV1-10.3 cancellation before capture resolves closes the late session without transcribing',async()=>{
 const pending=deferred(),f=fixture({start:()=>pending.promise});
 const flow=createMyWriteVoiceReview({capture:f.capture,transcribe:f.local});
 const started=flow.start();assert.equal(flow.state().phase,'starting');
 await flow.cancel();pending.resolve(f.session);
 await assert.rejects(started,code('MYWRITE_VOICE_CANCELLED'));
 assert.equal(f.counts.cancel,1);assert.equal(f.counts.stop,0);
 assert.equal(f.counts.transcribe,0);assert.equal(flow.state().phase,'idle');
 await flow.dispose();
});

test('CPV1-10.3 cancel during transcription fences late full text and preserves no review handoff',async()=>{
 const pending=deferred(),f=fixture({transcribe:()=>pending.promise});
 const flow=createMyWriteVoiceReview({capture:f.capture,transcribe:f.local});
 await flow.start();const stopped=flow.stop();
 while(f.counts.transcribe===0)await Promise.resolve();
 await flow.cancel();pending.resolve(whole);
 await assert.rejects(stopped,code('MYWRITE_VOICE_CANCELLED'));
 assert.equal(f.counts.cancel,1);assert.equal(flow.state().phase,'idle');
 assert.throws(()=>flow.preview(),code('MYWRITE_VOICE_NOT_READY'));
 await flow.dispose();
});

test('CPV1-10.3 disposal during pending audio stop blocks late transcription and reentry',async()=>{
 const pending=deferred(),f=fixture({stop:()=>pending.promise});
 const flow=createMyWriteVoiceReview({capture:f.capture,transcribe:f.local});
 await flow.start();const stopped=flow.stop();
 await flow.dispose();pending.resolve(f.audio);
 await assert.rejects(stopped,code('MYWRITE_VOICE_CANCELLED'));
 assert.equal(f.counts.cancel,1);assert.equal(f.counts.transcribe,0);
 assert.deepEqual(flow.state(),{phase:'disposed',generation:2,hasTranscript:false});
 await assert.rejects(()=>flow.start(),code('MYWRITE_VOICE_DISPOSED'));
 assert.throws(()=>flow.preview(),code('MYWRITE_VOICE_DISPOSED'));
});

test('CPV1-10.3 transcription failure and oversized results are finite body-free refusals with no accepted text',async()=>{
 for(const result of [new Error('private audio and transcript'), '字'.repeat(MAX_MESSAGE_LENGTH+1),'']){
  const f=fixture({transcribe:()=>{if(result instanceof Error)throw result;return result;}});
  const flow=createMyWriteVoiceReview({capture:f.capture,transcribe:f.local});
  await flow.start();
  const expected=result instanceof Error?'MYWRITE_VOICE_TRANSCRIPTION_FAILED':'MYWRITE_VOICE_TRANSCRIPT_INVALID';
  await assert.rejects(()=>flow.stop(),code(expected));
  assert.equal(flow.state().phase,'failed');
  assert.throws(()=>flow.preview(),code('MYWRITE_VOICE_NOT_READY'));
  await assert.rejects(()=>flow.start(),code('MYWRITE_VOICE_BUSY'));
  await flow.cancel();
  assert.equal(flow.state().phase,'idle');
  await flow.dispose();
 }
});

test('CPV1-10.3 missing adapters and disposed review cannot create implicit capture authority',async()=>{
 assert.throws(()=>createMyWriteVoiceReview({}),code('MYWRITE_VOICE_INVALID'));
 const f=fixture(),flow=createMyWriteVoiceReview({capture:f.capture,transcribe:f.local});
 await flow.start();const review=await flow.stop();
 await flow.dispose();await flow.dispose();
 assert.throws(()=>flow.accept({generation:review.generation,text:whole}),code('MYWRITE_VOICE_DISPOSED'));
 assert.deepEqual(f.counts,{start:1,stop:1,cancel:0,transcribe:1});
});
