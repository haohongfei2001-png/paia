/* Body-free source-structure DTO contract. Page data remains untrusted. */
(() => {
  'use strict';
  const VERSION=1;
  const CONTRACT_ID='chatgpt.current-conversation-presence';
  const CONTRACT_VERSION=1;
  const ID=/^[A-Za-z0-9_-]{8,128}$/;
  const CAPABILITIES=Object.freeze({
    conversationIdentity:'verified',
    projectIdentity:'unverified',
    projectName:'unverified',
    membership:'unverified',
    projectOrder:'unverified',
    windowOrder:'unverified',
    rename:'unverified',
    move:'unverified',
    conversationDeletion:'unverified',
    projectDeletion:'unverified'
  });
  const unavailable=capability=>Object.freeze({
    state:'unavailable',capability,
    reason:CAPABILITIES[capability]==='unverified'?'UNVERIFIED':'UNSUPPORTED'
  });
  const routeChat=chat=>{
    if(!chat||typeof chat!=='object'||Array.isArray(chat)||!ID.test(chat.id||''))return null;
    if(chat.url!==`https://chatgpt.com/c/${chat.id}`)return null;
    return {id:chat.id,url:chat.url};
  };
  function currentConversationPresence({chat,epoch,session,generation,observedAt}={}){
    const safe=routeChat(chat);
    if(!safe||!Number.isSafeInteger(epoch)||epoch<0||
       typeof session!=='string'||session.length<8||session.length>80||
       !Number.isSafeInteger(generation)||generation<0||
       typeof observedAt!=='string'||!Number.isFinite(Date.parse(observedAt)))return null;
    return {
      schemaVersion:VERSION,contractId:CONTRACT_ID,contractVersion:CONTRACT_VERSION,
      providerKey:'chatgpt',capability:'conversationIdentity',
      channel:'isolated_route',scope:'current_conversation',
      epoch,session,generation,observedAt,
      subject:{kind:'conversation',conversationId:safe.id},
      // A current canonical route proves conversation identity only. It is not
      // evidence that can create or reverse external source lifecycle state.
      observation:{}
    };
  }
  function orderCandidate(capability){
    if(!['projectOrder','windowOrder'].includes(capability))return unavailable(capability);
    return unavailable(capability);
  }
  globalThis.SourceStructureContract=Object.freeze({
    version:VERSION,contractId:CONTRACT_ID,contractVersion:CONTRACT_VERSION,
    capabilities:CAPABILITIES,currentConversationPresence,orderCandidate,unavailable
  });
})();
