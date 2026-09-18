import {ArchiveError} from './constants.js';
import {hashText} from './dedupe.js';

export const SOURCE_STRUCTURE_VERSION=1;
export const SOURCE_STRUCTURE_PREFIXES=Object.freeze({
 conversation:'ans:conversation:v1:',
 project:'ans:project:v1:',
 event:'ans:event:v1:'
});
export const SOURCE_STRUCTURE_EPHEMERAL_PREFIXES=Object.freeze([
 'ans:ui:v1','ans:order:v1:','ans:index:v1:','ans:index-state:v1:',
 'ans:thought-index:v1:','ans:thought-state:v1:'
]);

const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const ascii=value=>typeof value==='string'&&/^[A-Za-z0-9._:@-]{1,128}$/.test(value);
const evidenceId=value=>typeof value==='string'&&/^[A-Za-z0-9._:@-]{1,128}$/.test(value);
const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(Date.parse(value)).toISOString()===value;
const name=value=>typeof value==='string'&&[...value].length>0&&[...value].length<=300;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const clone=value=>structuredClone(value);
const invalid=(code='INVALID_REQUEST')=>{throw new ArchiveError(code);};
const exact=(value,allowed,required=[])=>{
 if(!plain(value)||Object.keys(value).some(key=>!allowed.includes(key))||required.some(key=>!Object.hasOwn(value,key)))invalid();
 return value;
};

export function conversationRef(value){
 exact(value,['platform','sourceConversationId'],['platform','sourceConversationId']);
 if(!ascii(value.platform)||!ascii(value.sourceConversationId))invalid();
 return {platform:value.platform,sourceConversationId:value.sourceConversationId};
}
export function projectRef(value){
 exact(value,['providerKey','namespace','projectId'],['providerKey','namespace','projectId']);
 if(!ascii(value.providerKey)||!ascii(value.namespace)||!ascii(value.projectId))invalid();
 return {providerKey:value.providerKey,namespace:value.namespace,projectId:value.projectId};
}
export function subjectRef(value){
 exact(value,['kind','conversationRef','projectRef'],['kind']);
 if(value.kind==='conversation'&&value.projectRef===undefined)return {kind:'conversation',conversationRef:conversationRef(value.conversationRef)};
 if(value.kind==='project'&&value.conversationRef===undefined)return {kind:'project',projectRef:projectRef(value.projectRef)};
 invalid();
}
export function subjectTuple(value){
 const subject=subjectRef(value);
 return subject.kind==='conversation'
  ?['conversation',subject.conversationRef.platform,subject.conversationRef.sourceConversationId]
  :['project',subject.projectRef.providerKey,subject.projectRef.namespace,subject.projectRef.projectId];
}
export async function sourceStructureRefHash(value){return hashText(JSON.stringify(subjectTuple(value)));}
export async function conversationMetaId(ref){return SOURCE_STRUCTURE_PREFIXES.conversation+await sourceStructureRefHash({kind:'conversation',conversationRef:ref});}
export async function projectMetaId(ref){return SOURCE_STRUCTURE_PREFIXES.project+await sourceStructureRefHash({kind:'project',projectRef:ref});}
export async function eventMetaPrefix(ref){return SOURCE_STRUCTURE_PREFIXES.event+await sourceStructureRefHash(ref)+':';}
export async function eventMetaId(ref,sequence){
 if(!Number.isSafeInteger(sequence)||sequence<1)invalid();
 return await eventMetaPrefix(ref)+String(sequence).padStart(20,'0');
}

export function sourceEvidence(value,{restored=false}={}){
 const allowed=['id','contractId','contractVersion','channel','scope','originClass','requestGeneration','providerRevision','evidenceKind','digest','restored','restoredFromChannel'];
 exact(value,allowed,['id','contractId','contractVersion','channel','scope','originClass','requestGeneration','evidenceKind','digest']);
 if(!evidenceId(value.id)||!ascii(value.contractId)||!Number.isInteger(value.contractVersion)||value.contractVersion<1||value.contractVersion>1000||
    !ascii(value.channel)||!ascii(value.scope)||!ascii(value.originClass)||!Number.isSafeInteger(value.requestGeneration)||value.requestGeneration<0||
    !ascii(value.evidenceKind)||typeof value.digest!=='string'||!/^[a-f0-9]{64}$/.test(value.digest))invalid();
 if(value.providerRevision!==undefined&&!(Number.isSafeInteger(value.providerRevision)&&value.providerRevision>=0)&&!ascii(value.providerRevision))invalid();
 if(!restored&&(value.restored!==undefined||value.restoredFromChannel!==undefined))invalid();
 if(value.restored!==undefined&&value.restored!==true)invalid();
 if(value.restoredFromChannel!==undefined&&!ascii(value.restoredFromChannel))invalid();
 if(restored&&value.restored!==true)invalid();
 return clone(value);
}
export function membership(value,{stored=true}={}){
 const allowed=stored?['state','projectRef','evidenceId']:['state','projectRef'];
 exact(value,allowed,['state','projectRef',...(stored?['evidenceId']:[])]);
 if(!['unknown','unassigned','project'].includes(value.state))invalid();
 const ref=value.projectRef===null?null:projectRef(value.projectRef);
 if(value.state==='project'&&!ref||value.state!=='project'&&ref!==null)invalid();
 if(stored){
  if(value.state==='unknown'&&value.evidenceId!==null)invalid();
  if(value.state!=='unknown'&&!evidenceId(value.evidenceId))invalid();
 }
 return {state:value.state,projectRef:ref,...(stored?{evidenceId:value.evidenceId}:{})};
}
export function lastKnownProject(value){
 if(value===undefined)return undefined;
 exact(value,['projectRef','name'],['projectRef','name']);
 if(value.name!==null&&!name(value.name))invalid();
 return {projectRef:projectRef(value.projectRef),name:value.name};
}
export function sourceStatus(value){if(!['unknown','observed_active','confirmed_deleted'].includes(value))invalid();return value;}
function revision(value){if(!Number.isSafeInteger(value)||value<0)invalid();return value;}
function nullableEvidence(value){if(value!==null&&!evidenceId(value))invalid();return value;}
function nullableTime(value){if(value!==null&&!iso(value))invalid();return value;}

function conversationSnapshot(row){
 const out={membership:membership(row.membership),sourceStatus:sourceStatus(row.sourceStatus)};
 if(row.lastKnownSourceProject!==undefined)out.lastKnownSourceProject=lastKnownProject(row.lastKnownSourceProject);
 return out;
}
function projectSnapshot(row){
 return {currentName:row.currentName===null?null:(name(row.currentName)?row.currentName:invalid()),sourceStatus:sourceStatus(row.sourceStatus)};
}
function changeValue(key,value){return key==='membership'?{state:value?.state,projectRef:value?.projectRef??null}:value;}
function changes(before,after){return Object.keys(after).filter(key=>!same(changeValue(key,before?.[key]),changeValue(key,after[key])));}
function currentObserved(row,observedAt){
 if(!row?.lastObservedAt)return 1;
 const a=Date.parse(observedAt),b=Date.parse(row.lastObservedAt);
 return a>b?1:a<b?-1:0;
}
function event(subject,before,after,row,observation,change){
 return {version:SOURCE_STRUCTURE_VERSION,kind:'event',subjectRef:clone(subject),observationSequence:row.relationshipRevision,observedAt:observation.observedAt,evidence:clone(observation.evidence),change,before:clone(before),after:clone(after)};
}

export function validateConversationObservation(value){
 exact(value,['kind','conversationRef','membership','sourceStatus','projectName','observedAt','evidence','expectedRevision'],['kind','conversationRef','observedAt','evidence','expectedRevision']);
 if(value.kind!=='conversation')invalid();
 const out={kind:'conversation',conversationRef:conversationRef(value.conversationRef),observedAt:value.observedAt,evidence:sourceEvidence(value.evidence),expectedRevision:revision(value.expectedRevision)};
 if(!iso(out.observedAt))invalid();
 if(value.membership!==undefined)out.membership=membership(value.membership,{stored:false});
 if(value.sourceStatus!==undefined)out.sourceStatus=sourceStatus(value.sourceStatus);
 if(value.projectName!==undefined){if(!name(value.projectName))invalid();out.projectName=value.projectName;}
 if(out.projectName!==undefined&&out.membership?.state!=='project')invalid();
 return out;
}
export function validateProjectObservation(value){
 exact(value,['kind','projectRef','witnessConversationRef','currentName','sourceStatus','observedAt','evidence','expectedRevision'],['kind','projectRef','observedAt','evidence','expectedRevision']);
 if(value.kind!=='project')invalid();
 const out={kind:'project',projectRef:projectRef(value.projectRef),observedAt:value.observedAt,evidence:sourceEvidence(value.evidence),expectedRevision:revision(value.expectedRevision)};
 if(!iso(out.observedAt))invalid();
 if(value.witnessConversationRef!==undefined)out.witnessConversationRef=conversationRef(value.witnessConversationRef);
 if(value.currentName!==undefined){if(!name(value.currentName))invalid();out.currentName=value.currentName;}
 if(value.sourceStatus!==undefined)out.sourceStatus=sourceStatus(value.sourceStatus);
 return out;
}

export function reduceConversation(current,input){
 const observation=validateConversationObservation(input);
 if(current)validateSourceStructureRow(current);
 const subject={kind:'conversation',conversationRef:observation.conversationRef};
 const base=current?clone(current):{version:1,kind:'conversation',conversationRef:clone(observation.conversationRef),membership:{state:'unknown',projectRef:null,evidenceId:null},sourceStatus:'unknown',lastObservedAt:null,lastEvidenceId:null,relationshipRevision:0};
 if(current&&!same(current.conversationRef,observation.conversationRef))invalid('SOURCE_STRUCTURE_CONFLICT');
 if(base.relationshipRevision!==observation.expectedRevision)return {conflict:true,current:clone(base)};
 const freshness=currentObserved(base,observation.observedAt);if(freshness<0)return {stale:true,current:clone(base)};
 const before=conversationSnapshot(base),next=clone(base);
 if(observation.membership&&observation.membership.state!=='unknown'){
  next.membership={...clone(observation.membership),evidenceId:observation.evidence.id};
  if(observation.membership.state==='project')next.lastKnownSourceProject={projectRef:clone(observation.membership.projectRef),name:observation.projectName??(same(base.lastKnownSourceProject?.projectRef,observation.membership.projectRef)?base.lastKnownSourceProject?.name??null:null)};
 }
 if(observation.sourceStatus&&observation.sourceStatus!=='unknown')next.sourceStatus=observation.sourceStatus;
 const after=conversationSnapshot(next),change=changes(before,after);
 if(freshness===0&&change.length)invalid('SOURCE_STRUCTURE_CONFLICT');
 // An identity-only observation may materialize metadata for an already
 // archived Conversation without inventing membership or lifecycle state.
 next.lastObservedAt=observation.observedAt;next.lastEvidenceId=observation.evidence.id;
 if(!change.length)return {changed:!same(base,next),current:next,event:null};
 next.relationshipRevision=base.relationshipRevision+1;
 return {changed:true,current:next,event:event(subject,before,after,next,observation,change)};
}
export function reduceProject(current,input){
 const observation=validateProjectObservation(input);
 if(current)validateSourceStructureRow(current);
 const subject={kind:'project',projectRef:observation.projectRef};
 const base=current?clone(current):{version:1,kind:'project',projectRef:clone(observation.projectRef),currentName:null,sourceStatus:'unknown',lastObservedAt:null,lastEvidenceId:null,relationshipRevision:0};
 if(current&&!same(current.projectRef,observation.projectRef))invalid('SOURCE_STRUCTURE_CONFLICT');
 if(base.relationshipRevision!==observation.expectedRevision)return {conflict:true,current:clone(base)};
 const freshness=currentObserved(base,observation.observedAt);if(freshness<0)return {stale:true,current:clone(base)};
 const before=projectSnapshot(base),next=clone(base);
 if(observation.currentName!==undefined)next.currentName=observation.currentName;
 if(observation.sourceStatus&&observation.sourceStatus!=='unknown')next.sourceStatus=observation.sourceStatus;
 const after=projectSnapshot(next),change=changes(before,after);
 if(freshness===0&&change.length)invalid('SOURCE_STRUCTURE_CONFLICT');
 if(!current&&!change.length)return {changed:false,current:null};
 next.lastObservedAt=observation.observedAt;next.lastEvidenceId=observation.evidence.id;
 if(!change.length)return {changed:!same(base,next),current:next,event:null};
 next.relationshipRevision=base.relationshipRevision+1;
 return {changed:true,current:next,event:event(subject,before,after,next,observation,change)};
}

function validateConversationRow(row){
 exact(row,['id','version','kind','conversationRef','membership','sourceStatus','lastObservedAt','lastEvidenceId','relationshipRevision','lastKnownSourceProject'],['id','version','kind','conversationRef','membership','sourceStatus','lastObservedAt','lastEvidenceId','relationshipRevision']);
 conversationRef(row.conversationRef);membership(row.membership);sourceStatus(row.sourceStatus);nullableTime(row.lastObservedAt);nullableEvidence(row.lastEvidenceId);revision(row.relationshipRevision);
 if(row.lastKnownSourceProject!==undefined)lastKnownProject(row.lastKnownSourceProject);
 if(!row.id.startsWith(SOURCE_STRUCTURE_PREFIXES.conversation)||!/^[a-f0-9]{64}$/.test(row.id.slice(SOURCE_STRUCTURE_PREFIXES.conversation.length)))invalid();
 return row;
}
function validateProjectRow(row){
 exact(row,['id','version','kind','projectRef','currentName','sourceStatus','lastObservedAt','lastEvidenceId','relationshipRevision'],['id','version','kind','projectRef','currentName','sourceStatus','lastObservedAt','lastEvidenceId','relationshipRevision']);
 projectRef(row.projectRef);if(row.currentName!==null&&!name(row.currentName))invalid();sourceStatus(row.sourceStatus);nullableTime(row.lastObservedAt);nullableEvidence(row.lastEvidenceId);revision(row.relationshipRevision);
 if(!row.id.startsWith(SOURCE_STRUCTURE_PREFIXES.project)||!/^[a-f0-9]{64}$/.test(row.id.slice(SOURCE_STRUCTURE_PREFIXES.project.length)))invalid();
 return row;
}
function validateEventRow(row){
 exact(row,['id','version','kind','subjectRef','observationSequence','observedAt','evidence','change','before','after'],['id','version','kind','subjectRef','observationSequence','observedAt','evidence','change','before','after']);
 const subject=subjectRef(row.subjectRef);if(!Number.isSafeInteger(row.observationSequence)||row.observationSequence<1||!iso(row.observedAt))invalid();sourceEvidence(row.evidence);
 if(!Array.isArray(row.change)||!row.change.length||new Set(row.change).size!==row.change.length)invalid();
 const allowed=subject.kind==='conversation'?['membership','sourceStatus','lastKnownSourceProject']:['currentName','sourceStatus'];if(row.change.some(key=>!allowed.includes(key)))invalid();
 if(subject.kind==='conversation'){if(!plain(row.before)||!plain(row.after))invalid();conversationSnapshot(row.before);conversationSnapshot(row.after);}
 else{if(!plain(row.before)||!plain(row.after))invalid();projectSnapshot(row.before);projectSnapshot(row.after);}
 const prefix=SOURCE_STRUCTURE_PREFIXES.event;if(!row.id.startsWith(prefix)||!/^[a-f0-9]{64}:\d{20}$/.test(row.id.slice(prefix.length)))invalid();
 return row;
}
export function validateSourceStructureRow(row){
 if(!plain(row))invalid();
 if(row.version!==SOURCE_STRUCTURE_VERSION)invalid('SOURCE_STRUCTURE_VERSION_UNSUPPORTED');
 if(row.kind==='conversation')return validateConversationRow(row);
 if(row.kind==='project')return validateProjectRow(row);
 if(row.kind==='event')return validateEventRow(row);
 invalid();
}
export function sourceStructureSnapshot(row){
 validateSourceStructureRow(row);
 return row.kind==='conversation'?conversationSnapshot(row):row.kind==='project'?projectSnapshot(row):clone(row.after);
}

