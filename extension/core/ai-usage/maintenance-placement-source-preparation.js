import {equal,exact,fail} from './contracts.js';
import {prefix} from '../thought-model.js';

const need=value=>{if(!value)fail('UNAVAILABLE');};
const bindingKeys=['logicalJobId','childOperationId','principalId','libraryId','consentEpoch'];
const mappingKeys=['placementId','revision','entryId','entryRevision','topicId','topicRevision','topicOrganizationRevision','sectionId','sectionRevision','layoutGeneration','inputId'];
const localFields=['body','title','note'];
const data=(value,key,optional=false)=>{const d=value&&Object.getOwnPropertyDescriptor(value,key);if(!d&&optional)return undefined;need(d&&Object.hasOwn(d,'value'));return d.value;};

// This shape is only a routing restriction. The original session's private
// CANDIDATE_ONLY selection and unchanged mapper object supply the capability.
// No public DTO or true flag authorizes a field, an ACK or a physical attempt.
function freshPlacementRequest(request){
 try{
  need(request.items.length===1&&request.coverage.length===2);
  const item=request.items[0],d=item.descriptor;
  need(d.kind==='placement'&&!d.removed&&!d.fenceOnly&&!d.independent&&d.entityId===d.recordId&&item.key===JSON.stringify(['placement',d.entityId]));
  need(request.coverage.every(u=>u.key===item.key)&&equal(request.coverage.map(u=>u.facet).sort(),['context','topic']));
  return true;
 }catch{return false;}
}

// Called only after the source owner has authenticated its original private
// permit. Local journal/Source qualification is deliberately a separate scope
// from payload processing; neither becomes outbound history or Source text.
export function validateFreshPlacementPermit(p,qualified,scope,plan){
 const m=p.freshPlacement;need(m&&freshPlacementRequest(p.request));exact(m,mappingKeys);
 const item=p.request.items[0],d=item.descriptor;
 need(d.entityId===m.placementId&&d.revision===m.revision&&p.request.coverage.every(u=>u.scope===plan.scope));
 need(['child-mapping','child','payload'].includes(p.phase));exact(p.binding,bindingKeys);
 const wanted=scope.inputs?.map(i=>i.inputId);need(Array.isArray(wanted));
 if(qualified){
  exact(scope,['purpose','phase','binding','batchFingerprint','restoreEpoch','rootAuthority','inputs','sources','entries','structures','journals']);
  need(scope.purpose==='ai-maintenance-qualification'&&scope.phase===p.phase&&equal(scope.binding,p.binding));
  need(scope.inputs.every(i=>{exact(i,['inputId','revision','selectedFields']);return equal(i.selectedFields,['body','note']);})&&scope.sources.every(s=>{exact(s,['sourceRecordId','selectedFields']);return equal(s.selectedFields,['originalText']);}));
  need(equal(scope.entries,[{entryId:m.entryId,revision:m.entryRevision,selectedFields:localFields}])&&scope.structures.length===0);
  if(p.phase==='child-mapping')need(p.parent===null&&Object.keys(p.selectionSpec).every(k=>k==='inputIds')&&wanted.length===0&&scope.sources.length===0);
  else{
   need(p.phase==='child'&&p.parent);
   exact(p.selectionSpec,['inputIds','inputMirrorInputs','entryIds','historyEntryIds','structures','topicIds','localTopicSeeds']);
   need(equal(wanted,[m.inputId])&&equal(p.selectionSpec.inputIds,[m.inputId])&&equal(p.selectionSpec.inputMirrorInputs,[m.inputId])&&equal(p.selectionSpec.entryIds,[m.entryId])&&p.selectionSpec.historyEntryIds.length===0&&p.selectionSpec.structures.length===0&&equal(p.selectionSpec.topicIds,[m.topicId])&&p.selectionSpec.localTopicSeeds.length===0);
  }
 }else{
  need(p.phase==='payload'&&p.parent===null);
  exact(scope,['purpose',...bindingKeys,'inputs','entries','placements','facets','coverage']);
  need(scope.purpose==='ai-maintenance-payload'&&equal(scope.inputs,[{inputId:m.inputId,selectedFields:['body']}])&&equal(scope.entries,[{entryId:m.entryId,revision:m.entryRevision,selectedFields:['body']}])&&equal(scope.placements,[m])&&equal(scope.facets,['context','topic'])&&equal(scope.coverage,p.request.coverage));
  for(const key of bindingKeys)need(scope[key]===p.binding[key]);
  exact(p.selectionSpec,['inputIds']);need(equal(p.selectionSpec.inputIds,[m.inputId]));
 }
 need(new TextEncoder().encode(JSON.stringify(scope)).length<=32768);
 return {p,qualified,structural:true,placement:m,ids:wanted};
}

// Metadata-only proof of the complete current singleton target. The reader and
// current callback are the source owner's original first-ledger/lifetime pair;
// this policy creates no budget, receipt, clock, transaction or grant.
export async function validateFreshPlacementPolicy(store,t,scope,permit,current){
 const m=permit.placement,d=permit.p.request.items[0].descriptor,get=async(table,id)=>{current();const row=await t.get(table,id);current();return row;};
 const row=await get('placements',m.placementId),entry=await get('thoughts',m.entryId),topic=await get('topics',m.topicId),section=await get('sections',JSON.stringify([m.topicId,m.layoutGeneration,m.sectionId])),journal=await get('revisions',d.journalId);
 need(row&&data(row,'id')===m.placementId&&data(row,'id')===JSON.stringify([m.topicId,m.layoutGeneration,m.entryId])&&data(row,'revision')===m.revision&&data(row,'lifecycle')==='active'&&data(row,'excludedByUser',true)!==true&&data(row,'membershipAuthorship')==='user'&&data(row,'sectionProtection')===true&&data(row,'orderProtection')===true&&data(row,'entryId')===m.entryId&&data(row,'topicId')===m.topicId&&data(row,'sectionId')===m.sectionId&&data(row,'layoutGeneration')===m.layoutGeneration);
 need(entry&&data(entry,'id')===m.entryId&&data(entry,'revision')===m.entryRevision&&data(entry,'lifecycle')==='active'&&data(entry,'bodyBinding')==='input'&&data(entry,'workingInputId')===m.inputId);
 const refs=data(entry,'inputRefs');need(Array.isArray(refs)&&refs.length===1&&data(refs[0],'inputBlockId')===m.inputId);
 need(topic&&data(topic,'id')===m.topicId&&data(topic,'revision')===m.topicRevision&&data(topic,'organizationRevision')===m.topicOrganizationRevision&&data(topic,'activeLayoutGeneration')===m.layoutGeneration&&data(topic,'lifecycle')==='active'&&!data(topic,'redirectTo',true)&&!data(topic,'layoutJobId',true));
 need(section&&data(section,'revision')===m.sectionRevision&&data(section,'topicId')===m.topicId&&data(section,'sectionId')===m.sectionId&&data(section,'layoutGeneration')===m.layoutGeneration&&data(section,'rank')===data(row,'sectionRank')&&data(section,'lifecycle')==='active'&&!data(section,'redirectTo',true));
 need(journal&&data(journal,'id')===d.journalId&&data(journal,'actor')==='user'&&data(journal,'kind')==='placement'&&data(journal,'entityId')===m.placementId&&data(journal,'documentId')===m.topicId&&data(journal,'reason')==='place'&&equal(data(journal,'fieldMask'),['membership','section','order']));
 const intents=data(entry,'organizationIntents'),edge=data(data(intents,'edges'),m.topicId);need(data(edge,'actor')==='user'&&data(edge,'include')===true&&data(edge,'operationId')===data(journal,'operationId')&&data(intents,'included').includes(m.topicId)&&!data(intents,'excluded').includes(m.topicId));
 const sources=data(entry,'sourceRecordIds');need(Array.isArray(sources)&&sources.length<=20&&equal([...sources].sort(),d.sourceRecordIds)&&equal([...data(journal,'sourceRecordIds')].sort(),d.sourceRecordIds));
 const range=prefix([m.topicId,m.layoutGeneration,0]);current();need(await t.count('placements','byTopicOrder',range)===1);current();const members=await t.all('placements','byTopicOrder',range);current();need(members.length===1&&data(members[0],'id')===m.placementId);
 const input=await get('inputStates',m.inputId),index=await get('blockIndex',m.inputId);need(input&&index&&data(input,'id')===m.inputId&&data(index,'id')===m.inputId&&data(input,'contentRevision')===data(entry,'bindingRevision')&&data(input,'removalState')==='active'&&data(input,'sourcePurged',true)!==true&&data(index,'excluded')===false&&equal([...data(input,'sourceRecordIds')].sort(),d.sourceRecordIds)&&equal([...data(index,'recordIds')].sort(),d.sourceRecordIds));
 if(permit.qualified){
  const historyRange=prefix(['library_entry:'+m.entryId]);current();const count=await t.count('revisions','byList',historyRange);current();need(Number.isSafeInteger(count)&&count<=4096);const history=await t.all('revisions','byList',historyRange);current();need(history.length===count);
  const expected=history.map(j=>{need(data(j,'kind')==='library_entry'&&data(j,'entityId')===m.entryId);return {journalId:data(j,'id'),entityKind:'library_entry',entityId:m.entryId,sequence:data(j,'sequence'),baseRevision:data(j,'baseRevision',true)??null,afterRevision:data(j,'afterRevision',true)??null,selectedFields:localFields.flatMap(field=>['before.'+field,'after.'+field])};}).sort((a,b)=>a.journalId.localeCompare(b.journalId));
  need(equal(scope.journals,expected));
 }
 current();return {inputs:new Map([[m.inputId,{revision:data(input,'contentRevision'),removalEpoch:data(input,'lastRemovalSequence',true)??0,sourceRecordIds:[...sources].sort()}]]),sources:new Set(sources)};
}
