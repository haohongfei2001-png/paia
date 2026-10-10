import {projectRef,conversationRef} from '../core/source-structure-model.js';
const sameRef=(a,b)=>a.providerKey===b.providerKey&&a.namespace===b.namespace&&a.projectId===b.projectId;
// Read only the existing Source relationship owner. Last-known membership/name
// cannot authorize a current Project search or substitute another namespace.
export async function readArchiveProjectSearch(read,subject,isCurrent=()=>true){
 if(subject?.kind!=='conversation')return null;
 let conversation;try{conversation=conversationRef(subject.conversationRef);}catch{return null;}
 const relation=await read({kind:'conversation',conversationRef:conversation});if(!isCurrent())return null;
 const row=relation?.current;if(row?.membership?.state!=='project'||row.sourceStatus==='confirmed_deleted')return null;
 let ref;try{ref=projectRef(row.membership.projectRef);}catch{return null;}
 if(ref.providerKey!==conversation.platform)return null;
 const detail=await read({kind:'project',projectRef:ref});if(!isCurrent())return null;
 const current=detail?.current;if(!current||current.sourceStatus==='confirmed_deleted'||typeof current.currentName!=='string'||!current.currentName.trim())return null;
 if(!Number.isSafeInteger(row.relationshipRevision)||row.relationshipRevision<0||!Number.isSafeInteger(current.relationshipRevision)||current.relationshipRevision<0)return null;
 const finalRelation=await read({kind:'conversation',conversationRef:conversation});if(!isCurrent())return null;
 const finalRow=finalRelation?.current;
 if(finalRow?.membership?.state!=='project'||finalRow.relationshipRevision!==row.relationshipRevision||finalRow.sourceStatus!==row.sourceStatus)return null;
 let finalRef;try{finalRef=projectRef(finalRow.membership.projectRef);}catch{return null;}
 if(!sameRef(ref,finalRef))return null;
 return {ref,title:current.currentName,conversationRevision:row.relationshipRevision,projectRevision:current.relationshipRevision};
}
export function sameArchiveProjectSearch(a,b){return !!a&&!!b&&sameRef(a.ref,b.ref)&&a.title===b.title&&a.conversationRevision===b.conversationRevision&&a.projectRevision===b.projectRevision;}
