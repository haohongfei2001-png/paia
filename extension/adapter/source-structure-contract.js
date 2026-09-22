/* Body-free source-structure DTO contract. Page data remains untrusted. */
(() => {
  'use strict';
  const VERSION=1;
  const IDENTITY_CONTRACT_ID='chatgpt.current-conversation-presence';
  const IDENTITY_CONTRACT_VERSION=1;
  const PROJECT_CONTRACT_ID='chatgpt.current-project-membership';
  const PROJECT_CONTRACT_VERSION=1;
  const PROJECT_CHANNEL='route_plus_matching_project_home_link';
  const ABSENCE_CONTRACT_ID='chatgpt.current-project-absence';
  const ABSENCE_CONTRACT_VERSION=1;
  const ABSENCE_CHANNEL='plain_route_project_absence';
  const PROJECT_NAMESPACE='chatgpt-project';
  const ID=/^[A-Za-z0-9_-]{8,128}$/;
  const PROJECT_ID=/^g-p-[a-f0-9]{32}$/;
  const CAPABILITIES=Object.freeze({
    conversationIdentity:'verified',
    projectIdentity:'verified',
    projectName:'verified',
    membership:'verified',
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
  const envelope=(contractId,contractVersion,channel,capability,chat,{epoch,session,generation,observedAt})=>({
    schemaVersion:VERSION,contractId,contractVersion,providerKey:'chatgpt',
    capability,channel,scope:'current_conversation',
    epoch,session,generation,observedAt,
    subject:{kind:'conversation',conversationId:chat.id}
  });
  const validContext=({epoch,session,generation,observedAt}={})=>
    Number.isSafeInteger(epoch)&&epoch>=0&&
    typeof session==='string'&&session.length>=8&&session.length<=80&&
    Number.isSafeInteger(generation)&&generation>=0&&
    typeof observedAt==='string'&&Number.isFinite(Date.parse(observedAt));
  function currentConversationPresence({chat,epoch,session,generation,observedAt}={}){
    const safe=routeChat(chat),ctx={epoch,session,generation,observedAt};
    if(!safe||!validContext(ctx))return null;
    return {
      ...envelope(IDENTITY_CONTRACT_ID,IDENTITY_CONTRACT_VERSION,'isolated_route','conversationIdentity',safe,ctx),
      observation:{}
    };
  }
  function currentProjectMembership({chat,projectId,projectName,epoch,session,generation,observedAt}={}){
    const safe=routeChat(chat),ctx={epoch,session,generation,observedAt};
    const pid=typeof projectId==='string'?projectId.toLowerCase():'';
    const name=typeof projectName==='string'?projectName.replace(/\s+/g,' ').trim():'';
    if(!safe||!validContext(ctx)||!PROJECT_ID.test(pid)||![...name].length||[...name].length>300)return null;
    const common={
      schemaVersion:VERSION,contractId:PROJECT_CONTRACT_ID,contractVersion:PROJECT_CONTRACT_VERSION,
      providerKey:'chatgpt',channel:PROJECT_CHANNEL,scope:'current_conversation',
      epoch,session,generation,observedAt
    };
    return [
      {
        ...common,capability:'membership',
        subject:{kind:'conversation',conversationId:safe.id},
        observation:{
          membership:{state:'project',namespace:PROJECT_NAMESPACE,projectId:pid},
          projectName:name
        }
      },
      {
        ...common,capability:'projectName',
        subject:{kind:'project',namespace:PROJECT_NAMESPACE,projectId:pid,witnessConversationId:safe.id},
        observation:{currentName:name}
      }
    ];
  }
  function currentProjectUnassigned({chat,epoch,session,generation,observedAt}={}){
    const safe=routeChat(chat),ctx={epoch,session,generation,observedAt};
    if(!safe||!validContext(ctx))return null;
    return {
      ...envelope(ABSENCE_CONTRACT_ID,ABSENCE_CONTRACT_VERSION,ABSENCE_CHANNEL,'membership',safe,ctx),
      observation:{membership:{state:'unassigned'}}
    };
  }

  function orderCandidate(capability){
    if(!['projectOrder','windowOrder'].includes(capability))return unavailable(capability);
    return unavailable(capability);
  }
  globalThis.SourceStructureContract=Object.freeze({
    version:VERSION,
    contractId:IDENTITY_CONTRACT_ID,contractVersion:IDENTITY_CONTRACT_VERSION,
    projectContractId:PROJECT_CONTRACT_ID,projectContractVersion:PROJECT_CONTRACT_VERSION,
    projectChannel:PROJECT_CHANNEL,projectNamespace:PROJECT_NAMESPACE,
    absenceContractId:ABSENCE_CONTRACT_ID,absenceContractVersion:ABSENCE_CONTRACT_VERSION,
    absenceChannel:ABSENCE_CHANNEL,
    capabilities:CAPABILITIES,currentConversationPresence,currentProjectMembership,currentProjectUnassigned,
    orderCandidate,unavailable
  });
})();
