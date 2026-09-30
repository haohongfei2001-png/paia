// A reused entry node must not capture an old body/revision for a new response.
export async function continueThought({id,topicId,flush,read,compose,isCurrent,unavailable}){
 if(!await flush()||!isCurrent())return;
 const current=await read(id);if(!isCurrent())return;
 if(current.lifecycle!=='active'||current.staleReasons?.includes('source_purged')){unavailable();return;}
 return compose({topicId:topicId||undefined,quote:current.body,relatedThought:{id:current.id,revision:current.revision,body:current.body},isCurrent});
}
