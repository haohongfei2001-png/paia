import {fail,keys,idOK,revisionOK,markHuman,prefix} from './thought-model.js';
import {resolveTopicIdentity} from './topic-identity.js';
import {journal} from './thought-journal.js';

export const newOrganizationIntents=()=>({version:1,included:[],excluded:[],edges:{},fixed:null});
export function organizationIntents(entry){
 const old=entry.organizationIntents||{included:[],excluded:[]};
 if(old.version===1)return structuredClone(old);if(old.version!==undefined)fail();
 // Unknown legacy locks are retained, never inferred to be AI-owned.
 return {...structuredClone(old),version:1,edges:{},fixed:null,legacyProtected:['topics','section','order'].some(f=>entry.protections?.[f]?.locked)||!['ai','user'].includes(entry.origin)};
}
export function recordMembershipIntent(entry,topicId,include,operationId,at,reason='user_edit'){
 const intents=organizationIntents(entry);for(const key of ['included','excluded'])intents[key]=intents[key].filter(id=>id!==topicId);intents[include?'included':'excluded'].push(topicId);
 intents.edges[topicId]={actor:'user',include,operationId,at,reason,revision:(intents.edges[topicId]?.revision||0)+1};
 if(intents.fixed){intents.fixed.topicIds=include?[...new Set([...intents.fixed.topicIds,topicId])]:intents.fixed.topicIds.filter(id=>id!==topicId);intents.fixed.revision++;intents.fixed.operationId=operationId;}
 entry.organizationIntents=intents;entry.topics=include?[...new Set([...(entry.topics||[]),topicId])]:(entry.topics||[]).filter(id=>id!==topicId);
 // Retain legacy display/history flags. Trusted automatic writes use the
 // specific edge contract below rather than treating these as a global freeze.
 for(const field of ['topics','section','order'])markHuman(entry,field,operationId,at,reason);
}
export async function automaticMembershipAllowed(t,entry,topicId,placement=null){
 const topic=await resolveTopicIdentity(t,topicId);if(topic.id!==topicId||topic.lifecycle!=='active'||topic.layoutJobId)return false;
 const intents=organizationIntents(entry);if(intents.legacyProtected)return false;
 for(const id of intents.excluded){if((await resolveTopicIdentity(t,id)).id===topicId)return false;}
 if(intents.fixed){let allowed=false;for(const id of intents.fixed.topicIds)if((await resolveTopicIdentity(t,id)).id===topicId)allowed=true;if(!allowed)return false;}
 return !placement||placement.lifecycle==='active'&&placement.membershipAuthorship==='ai'&&!placement.sectionProtection&&!placement.orderProtection;
}
export async function fixMembershipSet(store,r){
 keys(r,['entryId','expectedRevision','operationId'],['entryId','expectedRevision','operationId']);if(!idOK(r.entryId)||!revisionOK(r.expectedRevision))fail();
 return store.operation(r,async t=>{const entry=await store.readableEntry(t,r.entryId);if(entry.lifecycle!=='active')fail();if(entry.revision!==r.expectedRevision)return {conflict:true};
  const ids=[];for(const {topicId,layoutGeneration,lifecycle}of await t.all('placements','byEntry',prefix([entry.id]))){const topic=await t.get('topics',topicId);if(topic?.lifecycle==='active'&&!topic.redirectTo&&topic.activeLayoutGeneration===layoutGeneration&&lifecycle==='active')ids.push(topicId);}
  const before=structuredClone(entry.organizationIntents),intents=organizationIntents(entry);intents.fixed={topicIds:[...new Set(ids)],actor:'user',operationId:r.operationId,revision:(intents.fixed?.revision||0)+1,at:store.clock()};entry.organizationIntents=intents;entry.organizationRevision++;entry.revision++;markHuman(entry,'topics',r.operationId,store.clock(),'fixed_membership');await t.put('thoughts',entry);
  await journal(store,t,{kind:'membership_intent',entityId:entry.id,before,after:intents,fieldMask:['fixed'],actor:'user',reason:'fixed_membership',important:true,operationId:r.operationId,sourceRecordIds:[]});return {id:entry.id,revision:entry.revision};
 });
}
export async function moveMembership(store,r){
 keys(r,['entryId','sourceTopicId','targetTopicId','expectedEntryRevision','expectedSourceRevision','expectedTargetRevision','operationId'],['entryId','sourceTopicId','targetTopicId','expectedEntryRevision','expectedSourceRevision','expectedTargetRevision','operationId']);
 if(![r.entryId,r.sourceTopicId,r.targetTopicId].every(idOK)||r.sourceTopicId===r.targetTopicId||![r.expectedEntryRevision,r.expectedSourceRevision,r.expectedTargetRevision].every(revisionOK))fail();
 return store.operation(r,async t=>{const e=await store.readableEntry(t,r.entryId),a=await resolveTopicIdentity(t,r.sourceTopicId),b=await resolveTopicIdentity(t,r.targetTopicId);
  if(a.id!==r.sourceTopicId||b.id!==r.targetTopicId||a.lifecycle!=='active'||b.lifecycle!=='active')fail();if(e.revision!==r.expectedEntryRevision||a.organizationRevision!==r.expectedSourceRevision||b.organizationRevision!==r.expectedTargetRevision||a.layoutJobId||b.layoutJobId)return {conflict:true};
  const old=await t.get('placements',JSON.stringify([a.id,a.activeLayoutGeneration,e.id]));if(old?.lifecycle!=='active')fail();
  const target=await t.get('placements',JSON.stringify([b.id,b.activeLayoutGeneration,e.id]));
  const removed=await store.placeEntryInTransaction(t,{entryId:e.id,topicId:a.id,remove:true,expectedEntryRevision:e.revision,expectedTopicRevision:a.organizationRevision,expectedPlacementRevision:old.revision,operationId:r.operationId});if(removed.conflict)fail();
  const placed=await store.placeEntryInTransaction(t,{entryId:e.id,topicId:b.id,...(target?{sectionId:target.sectionId,rank:target.rank,expectedPlacementRevision:target.revision}:{}),expectedEntryRevision:removed.revision,expectedTopicRevision:b.organizationRevision,operationId:r.operationId});if(placed.conflict)fail();return placed;
 });
}
