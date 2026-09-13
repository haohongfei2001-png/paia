import {ArchiveError} from './constants.js';
import {inputProjection} from './thought-evidence.js';
import {prefix} from './thought-model.js';
import {safeOffset} from './reader-state.js';
import {AI_FIELDS,isStoredAIPresentation} from './organizer/ai-contract.js';
const fail=(code,restriction)=>{const error=new ArchiveError(code||'MEMORY_INVALID');if(restriction)error.restriction=restriction;throw error;};
export const own=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>keys.includes(k));
const idOK=v=>typeof v==='string'&&v.length>0&&v.length<=200;
export function validMaterialRef(ref){return own(ref,['kind','id','revision','span','sourceId','field'])&&['input','thought','source','ai'].includes(ref.kind)&&idOK(ref.id)&&Number.isSafeInteger(ref.revision)&&ref.revision>=0&&(ref.kind==='source'?idOK(ref.sourceId):ref.sourceId===undefined)&&(ref.kind==='ai'?AI_FIELDS.includes(ref.field):ref.field===undefined)&&(ref.span===undefined||own(ref.span,['start','end'])&&Number.isSafeInteger(ref.span.start)&&Number.isSafeInteger(ref.span.end)&&ref.span.start>=0&&ref.span.end>ref.span.start);}
export const materialIdentity=r=>JSON.stringify([r.kind,r.id,r.sourceId||'',r.field||'']);
export const materialKey=r=>JSON.stringify([materialIdentity(r),r.revision,r.span||null]);
export async function materialRead(memory,t,ref,{checkRevision=true}={}){
 if(!validMaterialRef(ref))fail();const s=memory.s,rows=(await memory.state(t)).rows;
 const deniedTopics=new Set(rows.filter(r=>r.kind==='topic'&&['denied','never'].includes(r.decision)).map(r=>r.topicId));
 const inputsDenied=new Set(rows.filter(r=>r.kind==='input').map(r=>r.inputId)),entriesDenied=new Set(rows.filter(r=>r.kind==='entry').map(r=>r.entryId)),sectionsDenied=new Set(rows.filter(r=>r.kind==='section').map(r=>JSON.stringify([r.topicId,r.sectionId])));
 async function entryRule(id){if(entriesDenied.has(id))fail('MEMORY_DENIED',{kind:'entry',entryId:id});for(const p of await t.all('placements','byEntry',prefix([id]))){const topic=await t.get('topics',p.topicId);if(p.lifecycle!=='active'||topic?.lifecycle!=='active'||p.layoutGeneration!==topic.activeLayoutGeneration)continue;if(deniedTopics.has(p.topicId)){const rule=rows.find(r=>r.kind==='topic'&&r.topicId===p.topicId&&['denied','never'].includes(r.decision));fail('MEMORY_DENIED',{kind:'topic',topicId:p.topicId,profileId:rule.profileId});}if(sectionsDenied.has(JSON.stringify([p.topicId,p.sectionId])))fail('MEMORY_DENIED',{kind:'section',topicId:p.topicId,sectionId:p.sectionId});}}
 async function inputRule(id){if(inputsDenied.has(id))fail('MEMORY_DENIED',{kind:'input',inputId:id});for(const p of await t.all('provenance','byInputVersion',prefix([id])))if(p.ownerKind==='entry'&&p.role!=='context_only')await entryRule(p.ownerId);}
 async function thought(id){await entryRule(id);const e=await s.readableEntry(t,id);if(!e||e.lifecycle!=='active'||!e.thoughtText?.trim())fail('MEMORY_UNAVAILABLE');const deps=await t.all('dependencies','byTarget',prefix(['entry',id])),tokens=[];for(const dep of deps){if(e.provenanceType==='user_created'&&dep.roles?.every(r=>r==='context_only'))continue;await inputRule(dep.inputId);const p=await inputProjection(s,t,dep.inputId);if(!p||(p.lastRemovalSequence||0)>(dep.eligibilityEpochAtUse||0))fail('MEMORY_UNAVAILABLE');tokens.push([p.inputId,p.contentRevision,p.lastRemovalSequence]);}if(e.provenanceType!=='user_created'&&(!deps.length||!await memory.safeSources(t,e.sourceRecordIds)))fail('MEMORY_UNAVAILABLE');return {e,tokens};}
 let body='',revision=0,title='',time=null,role='human',proof=[],documentId=null;
 if(ref.kind==='input'||ref.kind==='source'){
  await inputRule(ref.id);const p=await inputProjection(s,t,ref.id);if(!p)fail('MEMORY_UNAVAILABLE');documentId=p.documentId;
  const sourceId=p.block.originalTextReference,ix=sourceId&&await t.get('recordIndex',sourceId),source=sourceId&&await t.get('records',sourceId);time=ix?.sourceSentAt||null;
  const doc=(await t.get('libraryDocuments',p.documentId))?.value||(await t.get('documents',p.documentId))?.value||{};title=doc.userTitle||doc.originalConversationTitle||doc.originalTitle||doc.title||'Input';
  if(ref.kind==='source'){if(ref.sourceId!==sourceId||!source||!ix)fail('MEMORY_UNAVAILABLE');body=source.value.originalText;revision=0;proof=[sourceId,ix.dedupeKey];role='source';}else{body=p.body;revision=p.contentRevision;proof=[p.sourceRecordIds,p.lastRemovalSequence];}
 }else if(ref.kind==='thought'){
  const {e,tokens}=await thought(ref.id);body=e.thoughtText;revision=e.revision;title=e.title||'Thought';time=e.createdAt||null;proof=tokens;role=e.origin==='ai'&&!e.protections?.body?.locked?'ai':'human';
 }else{
  if(deniedTopics.has(ref.id)){const rule=rows.find(r=>r.kind==='topic'&&r.topicId===ref.id&&['denied','never'].includes(r.decision));fail('MEMORY_DENIED',{kind:'topic',topicId:ref.id,profileId:rule.profileId});}const topic=await t.get('topics',ref.id),row=await t.get('meta','aiPresentation:'+ref.id);
  if(topic?.lifecycle!=='active'||!row||!isStoredAIPresentation(row,new Set(row.evidenceEntryIds||[])))fail('MEMORY_UNAVAILABLE');
  for(const id of row.evidenceEntryIds){const {e,tokens}=await thought(id);proof.push([e.id,e.revision,e.dependencyRevision||0,tokens]);}
  const raw=row[ref.field];body=typeof raw==='string'?raw:raw.map(x=>x.text).join('\n\n');revision=row.revision;title=topic.name||'AI';time=row.updatedAt||null;role='ai';
 }
 if(checkRevision&&ref.revision!==revision)fail('MEMORY_STALE');if(typeof body!=='string'||!body.trim())fail('MEMORY_UNAVAILABLE');
 const fullBody=body;if(ref.span){const {start,end}=ref.span;if(end>body.length||safeOffset(body,start)!==start||safeOffset(body,end)!==end)fail('MEMORY_STALE');body=body.slice(start,end);}
 return {body,revision,title,time,role,documentId,token:JSON.stringify([revision,proof])};
}
