import {authoredSelectedFields,validAuthoredFields} from '../context-authored-entry.js';
import {prefix} from '../thought-model.js';
import {equal,exact,fail} from './contracts.js';

// Fixed validation used only after the source owner opens an original Session
// permit. These functions mint no permit, receipt, mapper brand or field grant.
// p.authoredEntry is the Session's private, independently Topic-capable mapping;
// a caller DTO or a service capability boolean is never an admission route.
const need=value=>{if(!value)fail('UNAVAILABLE');};
const data=(value,key)=>{const d=value&&Object.getOwnPropertyDescriptor(value,key);need(!d||Object.hasOwn(d,'value'));return d?.value;};
const empty=value=>Array.isArray(value)&&value.length===0;
const localFields=['body','title','note'];
const bindingFields=['logicalJobId','childOperationId','principalId','libraryId','consentEpoch'];
const seedFields=['entryId','entryRevision','topicId','topicRevision','topicOrganizationRevision','layoutGeneration','placementId','placementRevision'];

export function validateFreshAuthoredPermit(p,qualified,scope,plan){
 const m=p.authoredEntry;need(m&&m.kind==='humanEntry'&&!p.structuralRestore&&!p.structuralRename);
 need(p.request.items.length===1&&p.request.coverage.length>=1&&p.request.coverage.length<=2);
 const item=p.request.items[0],d=item.descriptor,facets=[...new Set(p.request.coverage.map(u=>u.facet))].sort();
 need(d.kind==='library_entry'&&d.entityId===m.entryId&&d.recordId===m.entryId&&!d.removed&&!d.fenceOnly&&d.human===true&&empty(d.inputIds)&&empty(d.sourceRecordIds));
 need(facets.includes('topic')&&facets.length===p.request.coverage.length&&facets.every(f=>['context','topic'].includes(f))&&p.request.coverage.every(u=>u.key===item.key&&u.scope===plan.scope));
 exact(p.binding,bindingFields);
 const selectedFields=authoredSelectedFields(m);need(validAuthoredFields(selectedFields));
 if(qualified){
  exact(scope,['purpose','phase','binding','batchFingerprint','restoreEpoch','rootAuthority','inputs','sources','entries','structures','journals']);
  need(scope.purpose==='ai-maintenance-qualification'&&['child-mapping','child'].includes(p.phase)&&scope.phase===p.phase&&equal(scope.binding,p.binding)&&empty(scope.inputs)&&empty(scope.sources));
  need(equal(scope.entries,[{entryId:m.entryId,revision:m.entryRevision,selectedFields:localFields}]));
  if(p.phase==='child-mapping'){
   need(p.parent===null&&Object.keys(p.selectionSpec).every(k=>k==='inputIds')&&empty(p.selectionSpec.inputIds??[])&&empty(scope.structures));
  }else{
   exact(p.selectionSpec,['inputIds','inputMirrorInputs','entryIds','historyEntryIds','structures','topicIds','localTopicSeeds']);
   need(p.parent&&empty(p.selectionSpec.inputIds)&&empty(p.selectionSpec.inputMirrorInputs)&&equal(p.selectionSpec.entryIds,[m.entryId])&&equal(p.selectionSpec.historyEntryIds,[m.entryId])&&equal(p.selectionSpec.structures,[{store:'topics',recordId:m.topicId,selectedFields:['name']}])&&equal(p.selectionSpec.topicIds,[m.topicId])&&equal(p.selectionSpec.localTopicSeeds,[Object.fromEntries(seedFields.map(k=>[k,m[k]]))]));
   need(equal(scope.structures,[{store:'topics',recordId:m.topicId,revision:m.topicRevision,selectedFields:['name']}]));
  }
 }else{
  exact(scope,['purpose',...bindingFields,'inputs','authoredEntries','authoredTopic','facets','coverage']);
  need(p.phase==='payload'&&p.parent===null&&scope.purpose==='ai-maintenance-payload'&&empty(scope.inputs)&&equal(scope.facets,facets)&&equal(scope.coverage,p.request.coverage));
  need(equal(scope.authoredEntries,[{...structuredClone(m),selectedFields:[...selectedFields]}])&&equal(scope.authoredTopic,[{entryId:m.entryId,topicId:m.topicId,topicRevision:m.topicRevision,selectedFields:['name']}]));
  for(const key of bindingFields)need(scope[key]===p.binding[key]);
  exact(p.selectionSpec,['inputIds']);need(empty(p.selectionSpec.inputIds));
 }
 need(new TextEncoder().encode(JSON.stringify(scope)).length<=32768);
 return {p,qualified,structural:true,authored:m,ids:[]};
}

// Metadata only, on the same first-selection ledger supplied by the source
// owner. The one-member count refuses an incomplete Topic before child
// qualification can discover a sibling. No Source body, prior Context body,
// historical Entry body or journal before/after is acquired here.
export async function validateFreshAuthoredPolicy(store,t,scope,validated,check){
 const m=validated.authored,d=validated.p.request.items[0].descriptor;
 const get=async(table,id)=>{check();const row=await t.get(table,id);check();return row;};
 const count=async(table,index,key)=>{check();const n=await t.count(table,index,key);check();return n;};
 const entry=await get('thoughts',m.entryId);
 need(entry&&data(entry,'id')===m.entryId&&data(entry,'revision')===m.entryRevision&&data(entry,'storageSchema')===2&&data(entry,'origin')==='user'&&data(entry,'provenanceType')==='user_created'&&data(entry,'bodyBinding')==='thought'&&data(entry,'lifecycle')==='active'&&data(entry,'freshness')==='current'&&data(entry,'integrity')==='detached'&&data(entry,'formation')==='explicit'&&data(entry,'dependencyRevision')===0&&data(entry,'hasHumanAction')===true&&data(entry,'userEdited')===true&&data(entry,'createdAt')===m.entryCreatedAt&&empty(data(entry,'sourceRecordIds'))&&empty(data(entry,'inputRefs'))&&empty(data(entry,'staleReasons')));
 need(!['workingInputId','bindingRevision','bindingLength'].some(k=>Object.hasOwn(entry,k)));
 const revisions=data(entry,'fieldRevisions'),authorship=data(entry,'authorship'),protections=data(entry,'protections');
 for(const field of ['body','title','note','type','formation']){
  const author=data(authorship,field),protection=data(protections,field);
  need(data(author,'actor')==='user'&&data(author,'everHumanConfirmed')===true&&data(protection,'locked')===true&&data(author,'operationId')===data(protection,'operationId')&&data(author,'at')===data(protection,'at'));
  if(['type','formation'].includes(field))need(data(revisions,field)===0);
 }
 for(const field of authoredSelectedFields(m))need(data(revisions,field)===(m.fieldRevisions?.[field]??m.bodyFieldRevision)&&data(data(authorship,field),'operationId')===(m.fieldOperationIds?.[field]??m.bodyOperationId));
 need(await count('dependencies','byTarget',prefix(['entry',m.entryId]))===0&&await count('provenance','byOwner',prefix(['entry',m.entryId]))===0);
 // The original human Topic constructor omits sourceRecordIds; absence is
 // canonical source freedom, not permission to accept malformed/nonempty data.
 const topic=await get('topics',m.topicId),identity=data(topic,'identity'),topicSources=data(topic,'sourceRecordIds');
 need(topic&&data(topic,'id')===m.topicId&&data(topic,'revision')===m.topicRevision&&data(topic,'organizationRevision')===m.topicOrganizationRevision&&data(topic,'activeLayoutGeneration')===m.layoutGeneration&&data(topic,'lifecycle')==='active'&&!data(topic,'redirectTo')&&!data(topic,'layoutJobId')&&data(topic,'createdBy')==='user'&&data(identity,'origin')==='user'&&!data(identity,'noRecreation')&&(!Object.hasOwn(topic,'sourceRecordIds')||empty(topicSources)));
 need(await count('placements','byTopicOrder',prefix([m.topicId,m.layoutGeneration,0]))===1);
 const placement=await get('placements',m.placementId),section=await get('sections',JSON.stringify([m.topicId,m.layoutGeneration,m.sectionId]));
 for(const [key,value]of Object.entries({id:m.placementId,entryId:m.entryId,topicId:m.topicId,revision:m.placementRevision,layoutGeneration:m.layoutGeneration,sectionId:m.sectionId,rank:m.rank,sectionRank:m.sectionRank,lifecycle:'active',membershipAuthorship:'user',sectionProtection:true,orderProtection:true}))need(data(placement,key)===value);
 need(!data(placement,'excludedByUser')&&section&&data(section,'topicId')===m.topicId&&data(section,'sectionId')===m.sectionId&&data(section,'layoutGeneration')===m.layoutGeneration&&data(section,'revision')===m.sectionRevision&&data(section,'rank')===m.sectionRank&&data(section,'lifecycle')==='active'&&!data(section,'redirectTo'));
 const intents=data(entry,'organizationIntents'),edge=data(data(intents,'edges'),m.topicId),fixed=data(intents,'fixed');
 need(data(edge,'actor')==='user'&&data(edge,'include')===true&&data(edge,'operationId')===m.membershipOperationId&&data(intents,'included').includes(m.topicId)&&!data(intents,'excluded').includes(m.topicId)&&!data(intents,'legacyProtected')&&(!fixed||data(fixed,'topicIds').includes(m.topicId)));
 const journal=await get('revisions',d.journalId);
 need(journal&&data(journal,'id')===d.journalId&&data(journal,'kind')==='library_entry'&&data(journal,'entityId')===m.entryId&&data(journal,'actor')==='user'&&data(journal,'afterRevision')===d.revision&&d.revision<=m.entryRevision&&empty(data(journal,'sourceRecordIds')));
 if(validated.qualified){
  const range=prefix(['library_entry:'+m.entryId]),n=await count('revisions','byList',range);need(Number.isSafeInteger(n)&&n>=1&&n<=4096);
  check();const rows=await t.all('revisions','byList',range);check();need(rows.length===n);
  const expected=rows.map(row=>{need(data(row,'kind')==='library_entry'&&data(row,'entityId')===m.entryId);return {journalId:data(row,'id'),entityKind:'library_entry',entityId:m.entryId,sequence:data(row,'sequence'),baseRevision:data(row,'baseRevision')??null,afterRevision:data(row,'afterRevision')??null,selectedFields:localFields.flatMap(field=>['before.'+field,'after.'+field])};}).sort((a,b)=>a.journalId.localeCompare(b.journalId));
  need(equal(scope.journals,expected));
 }
 check();return {inputs:new Map(),sources:new Set()};
}
