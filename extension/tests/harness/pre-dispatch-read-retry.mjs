// Test-only retry for an initialized independent reader. Once the original
// callback starts, its failure is never replayed, even with the same error code.
export async function runWithPreDispatchReadRetry(run, callback, beforeRetry=null) {
 for(let attempt=0;attempt<2;attempt++){
  let entered=false;
  try{return await run(()=>{entered=true;return callback();});}
  catch(error){if(attempt===1||entered||error?.code!=='CONTROL_PUBLICATION_CHANGED')throw error;if(beforeRetry)await beforeRetry(error);}
 }
}
