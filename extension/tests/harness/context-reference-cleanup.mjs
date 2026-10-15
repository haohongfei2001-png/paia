// Only synthetic acceptance pages are discarded. Production dirty-save
// protections are unchanged. Every cleanup action is attempted independently.
export async function closeContextReferencePages({prototype,harness,record=async()=>{}}){
 let firstError;
 const attempt=async action=>{try{await action();}catch(error){firstError??=error;}};
 for(const [owner,page] of [['prototype',prototype],['archive',harness?.archive]]){
  if(!page)continue;
  await attempt(()=>record(owner));
  await attempt(()=>page.close({runBeforeUnload:false}));
 }
 await attempt(()=>record('harness'));
 await attempt(()=>harness?.close());
 await attempt(()=>record('complete'));
 if(firstError)throw firstError;
}

// A failed evidence write or release disposal must neither skip browser cleanup
// nor replace the original acceptance error. With no primary error, fail on the
// first cleanup error so cleanup failures cannot silently produce a passing test.
export async function finalizeContextReference({primaryError,writeExecution,closePages,removeRelease,reportError}){
 let firstError;
 const attempt=async action=>{try{await action();}catch(error){firstError??=error;}};
 await attempt(writeExecution);
 await attempt(closePages);
 await attempt(removeRelease);
 if(firstError)await attempt(()=>reportError(firstError));
 if(primaryError)throw primaryError;
 if(firstError)throw firstError;
}
