import assert from 'node:assert/strict';

// A concurrent, acknowledged human edit can invalidate an in-flight snapshot.
// This is used only inside the existing bounded save/Undo polling assertions.
export async function matchesCurrentContextSnapshot(send,predicate){
 const reply=await send({type:'PAIA_CONTEXT_CARDS_SNAPSHOT'});
 if(reply?.ok===false&&reply.error==='CONTEXT_INVALIDATED')return false;
 assert.equal(reply?.ok,true,JSON.stringify(reply));
 return predicate(reply.data);
}
