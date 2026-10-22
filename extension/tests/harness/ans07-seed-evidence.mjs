// Test-only counters over original calls. No body reads, authority, or retry.
export function observeANS07Seed(store,trace){
 const run=store.run,transaction=store.repository.transaction;
 trace.runs=[];trace.runCount=0;trace.committedWrites=0;
 const observedRun=function(fn){
  const row={phase:trace.phase,number:++trace.runCount,entered:false};
  trace.runs.push(row);if(trace.runs.length>32)trace.runs.shift();
  return Reflect.apply(run,this,[()=>{row.entered=true;return fn();}]).catch(error=>{row.error=/^[A-Z0-9_]{1,64}$/.test(error?.code)?error.code:'UNKNOWN';throw error;});
 };
 const observedTransaction=function(write,...args){
  const result=Reflect.apply(transaction,this,[write,...args]);
  if(write)result.then(()=>trace.committedWrites++,()=>{});
  return result;
 };
 store.run=observedRun;store.repository.transaction=observedTransaction;
 return ()=>{if(store.run===observedRun)store.run=run;if(store.repository.transaction===observedTransaction)store.repository.transaction=transaction;};
}

// Capture the one trusted UI request, not a new CONSENT or a status poll.
export function observeANS07Consent(runtime,trace){
 const send=runtime.sendMessage;let request;
 trace.consent={dispatched:0,settled:0,acknowledged:0};
 const observed=function(message,...args){
  const result=Reflect.apply(send,this,[message,...args]);
  if(message?.type==='CONSENT'){
   trace.consent.dispatched++;request=result;
   result.then(r=>{trace.consent.settled++;if(r?.ok===true&&r.data?.enabled===true)trace.consent.acknowledged++;},()=>{trace.consent.settled++;});
  }
  return result;
 };
 runtime.sendMessage=observed;
 return {
  async complete(){
   if(trace.consent.dispatched!==1||!request)throw Error('ANS07_CONSENT_NOT_DISPATCHED_ONCE');
   const response=await request;
   if(trace.consent.dispatched!==1||response?.ok!==true||response.data?.enabled!==true)throw Error('ANS07_CONSENT_NOT_ACKNOWLEDGED');
  },
  stop(){if(runtime.sendMessage===observed)runtime.sendMessage=send;}
 };
}
