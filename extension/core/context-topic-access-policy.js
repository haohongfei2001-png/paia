import {idOK,validateMemoryRow} from './memory/model.js';

// CTX4-03 preparation only: a pure local permission-policy prerequisite, not a
// trusted reader, persistent grant owner, connection, or external capability.
// The eventual caller must supply raw Topic-owner rows (before redirect
// resolution), a ContextCardsService snapshot, complete legacy rows, and one
// coherent body-free scope assessment from the existing eligibility owners.
// No whole-Topic assessment producer exists yet. Missing/partial/unknown facts
// refuse; a matching rootReadAuthority token is freshness, not authentication.
// Topic validation below covers consumed identity/lifecycle fields, not alias
// history semantics. The Topic owner retains full identity/graph validation;
// names and alias tokens are never authorization inputs here.
// externalAllowed deliberately remains false until separately reviewed CTX4-04
// integration checks the connection and current eligibility before every egress.
const MAX_REFS=4096;
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const exact=(value,keys)=>plain(value)&&Object.keys(value).every(key=>keys.includes(key));
const revision=value=>Number.isSafeInteger(value)&&value>=0;
const epoch=value=>typeof value==='string'&&value.length>0&&value.length<=128;
const stamp=value=>typeof value==='string'&&value.length<=64&&Number.isFinite(Date.parse(value));
const token=value=>typeof value==='string'&&value.length>0&&value.length<=500;
const ids=value=>Array.isArray(value)&&value.length<=MAX_REFS&&value.every(idOK)&&new Set(value).size===value.length;
const states=['candidate','active','dormant','merged','removed'];
const bindingKeys=['topicId','epoch','createdAt','layoutGeneration','removalOperationId'];
const bindingValid=value=>exact(value,[...bindingKeys,'enabled'])&&idOK(value.topicId)&&epoch(value.epoch)&&stamp(value.createdAt)&&revision(value.layoutGeneration)&&value.layoutGeneration>0&&(value.removalOperationId===null||idOK(value.removalOperationId))&&typeof value.enabled==='boolean';
const topicValid=row=>plain(row)&&idOK(row.id)&&stamp(row.createdAt)&&revision(row.revision)&&revision(row.organizationRevision)&&revision(row.activeLayoutGeneration)&&row.activeLayoutGeneration>0&&states.includes(row.lifecycle)&&(row.redirectTo==null||idOK(row.redirectTo))&&(row.layoutJobId==null||idOK(row.layoutJobId))&&(row.removalOperationId==null||idOK(row.removalOperationId))&&plain(row.identity)&&row.identity.version===1&&revision(row.identity.revision)&&['user','ai','unknown'].includes(row.identity.origin)&&row.identity.scope===null&&Array.isArray(row.identity.aliases)&&row.identity.aliases.length<=MAX_REFS&&typeof row.identity.noRecreation==='boolean';
const available=row=>['active','dormant'].includes(row.lifecycle)&&!row.redirectTo&&!row.layoutJobId&&!row.identity.noRecreation;
const accessValid=value=>exact(value,['enabled','revision'])&&typeof value.enabled==='boolean'&&revision(value.revision);
const contextValid=value=>plain(value)&&value.version===1&&epoch(value.epoch)&&exact(value.access,['global','info','rules','now','inputs'])&&Object.keys(value.access).length===5&&Object.values(value.access).every(accessValid);
const scopeValid=value=>exact(value,['complete','legacyComplete','eligibility','topicIds','entryIds','inputIds','sections'])&&value.complete===true&&value.legacyComplete===true&&['eligible','ineligible','unknown'].includes(value.eligibility)&&ids(value.topicIds)&&ids(value.entryIds)&&ids(value.inputIds)&&Array.isArray(value.sections)&&value.sections.length<=MAX_REFS&&value.sections.every(row=>exact(row,['topicId','sectionId'])&&idOK(row.topicId)&&idOK(row.sectionId)&&value.topicIds.includes(row.topicId))&&new Set(value.sections.map(row=>JSON.stringify([row.topicId,row.sectionId]))).size===value.sections.length;
const result=(selected,reason)=>({selected,policyAllowed:reason==='policy_allowed',externalAllowed:false,reason});

// Only restrictions traverse redirects. This is an in-memory veto closure over
// raw owner facts, not a replacement canonical identity resolver. Missing,
// cyclic, incompatible or over-depth restrictive ancestry cannot be dropped.
function restrictionTarget(byId,id){
 const seen=new Set();
 for(let depth=0;depth<32;depth++){
  if(seen.has(id))return null;seen.add(id);const row=byId.get(id);if(!row)return null;
  if(!row.redirectTo)return row.lifecycle==='merged'?null:id;
  if(!['active','merged'].includes(row.lifecycle))return null;
  id=row.redirectTo;
 }
 return null;
}

// Body-free prospective selection binding. This does not turn anything on or
// persist a choice. A later trusted explicit toggle may pair it with enabled.
// Rename/dormancy do not change it. Layout changes, restored databases, replaced
// identities and remove/restore cycles invalidate old choices without deleting
// them. Topic-01 retains removalOperationId after an explicit Topic restore.
export function contextTopicSelectionBinding(topic,restoreEpoch){
 if(!topicValid(topic)||!available(topic)||!epoch(restoreEpoch))return null;
 return {topicId:topic.id,epoch:restoreEpoch,createdAt:topic.createdAt,layoutGeneration:topic.activeLayoutGeneration,removalOperationId:topic.removalOperationId??null};
}

export function evaluateContextTopicAccess(input){
 if(!exact(input,['context','topics','topicId','selection','legacyRows','scope','capturedAuthority','currentAuthority']))return result(false,'invalid_snapshot');
 const {context,topics,topicId,selection=null,legacyRows,scope,capturedAuthority,currentAuthority}=input;
 const selected=bindingValid(selection)&&selection.topicId===topicId&&selection.enabled;
 if(!contextValid(context)||!idOK(topicId)||!Array.isArray(topics)||topics.length>MAX_REFS||!topics.every(topicValid)||new Set(topics.map(row=>row.id)).size!==topics.length)return result(selected,'invalid_snapshot');
 if(!token(capturedAuthority)||!token(currentAuthority)||capturedAuthority!==currentAuthority)return result(selected,'stale_authority');
 if(!scopeValid(scope)||!scope.topicIds.includes(topicId))return result(selected,'incomplete_scope');
 // Scope topicIds includes every shared membership relevant to these exact
 // Entry/Input/Section refs. complete covers that scope; legacyComplete attests
 // full legacy-row enumeration, not a selected Profile or first page. Raw
 // topics must additionally include every restrictive redirect ancestry.
 const byId=new Map(topics.map(row=>[row.id,row]));
 if(scope.topicIds.some(id=>!byId.has(id)))return result(selected,'incomplete_scope');
 const topic=byId.get(topicId);
 if(!topic||!available(topic)||scope.topicIds.some(id=>!available(byId.get(id))))return result(selected,'topic_unavailable');
 if(!Array.isArray(legacyRows)||legacyRows.length>MAX_REFS||!legacyRows.every(validateMemoryRow)||new Set(legacyRows.map(row=>row.id)).size!==legacyRows.length)return result(selected,'legacy_unavailable');
 const relevant=new Set(scope.topicIds),entries=new Set(scope.entryIds),inputs=new Set(scope.inputIds),sections=new Set(scope.sections.map(row=>JSON.stringify([row.topicId,row.sectionId])));
 for(const row of legacyRows){
  // A single PAIA-wide selection cannot discard a restriction from another
  // legacy Profile. Old allows, temporary grants and Profile instructions
  // never create a new selection or union permitted scopes.
  if(row.kind==='topic'&&['denied','never'].includes(row.decision)||row.kind==='section'){
   const target=restrictionTarget(byId,row.topicId);
   if(target===null)return result(selected,'legacy_unavailable');
   if(row.kind==='topic'&&(relevant.has(row.topicId)||relevant.has(target)))return result(selected,'legacy_restricted');
   // Merged Section IDs do not have a lossless portable mapping here. Preserve
   // their restriction across the survivor rather than guessing a new Section.
   if(row.kind==='section'&&target!==row.topicId&&relevant.has(target))return result(selected,'legacy_restricted');
  }
  if(row.kind==='entry'&&entries.has(row.entryId)||row.kind==='input'&&inputs.has(row.inputId)||row.kind==='section'&&sections.has(JSON.stringify([row.topicId,row.sectionId])))return result(selected,'legacy_restricted');
  if(row.kind==='config'&&(row.localOnly===true||row.userTouched===true&&row.externalAccess===false))return result(selected,'legacy_restricted');
 }
 if(scope.eligibility!=='eligible')return result(selected,'content_unavailable');
 if(selection===null)return result(false,'topic_off');
 if(!bindingValid(selection)||selection.topicId!==topicId)return result(false,'invalid_selection');
 const binding=contextTopicSelectionBinding(topic,context.epoch);
 if(bindingKeys.some(key=>selection[key]!==binding[key]))return result(selected,'selection_stale');
 if(!selection.enabled)return result(false,'topic_off');
 if(!context.access.global.enabled)return result(true,'global_off');
 if(!context.access.inputs.enabled)return result(true,'inputs_off');
 return result(true,'policy_allowed');
}
