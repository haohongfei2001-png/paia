import {ArchiveError} from './constants.js';
import {idOK,prefix,ENTRY_FIELDS,revisionOK} from './thought-model.js';
import {bindingRead} from './thought-binding.js';
import {readDependencyInputs,dependencyLifecycle} from './thought-evidence.js';
import {entryMatchesProvider} from './thought-source-scope.js';
import {validProvider} from './read-projection-keys.js';
import {boundedThoughtRead,thoughtSectionTransactionReader,prepareThoughtSectionVisibility,thoughtReadTopic,thoughtReadSection,thoughtReadPlacement} from './thought-library-read-model.js';
import {thoughtTopicGenerationMatches,thoughtTopicExpressionPage} from './thought-read-index.js';
import {descriptorReader} from './organizer/topic-reading.js';

const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
const unavailable=()=>{throw new ArchiveError('UNAVAILABLE');};
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
const empty=fields=>({version:1,kind:'section_reading',items:[],sections:[],tracked:[],nextCursor:null,previousCursor:null,sectionCursor:null,complete:false,coverage:{complete:false},...fields});
const sectionKey=(topic,row)=>[topic.id,topic.activeLayoutGeneration,0,row.rank,row.sectionId];
const placementKey=(topic,p)=>[topic.id,topic.activeLayoutGeneration,p.sectionId,0,p.rank,p.entryId];
const sectionDTO=row=>{const {id,...rest}=row;return {sectionId:id,...rest};};
// The same body-free identity accompanies full rows and large placeholders.
const entryIdentity=e=>({id:e.id,lifecycle:e.lifecycle,revision:e.revision,contentRevision:e.contentRevision,fieldRevisions:e.fieldRevisions,bodyBinding:e.bodyBinding,workingInputId:e.workingInputId,bindingRevision:e.bindingRevision,currentInputRevision:e.currentInputRevision});
const sameBody=(entry,ref)=>entry.id===ref.entryRef.id&&entry.revision===ref.entryRef.revision&&entry.contentRevision===ref.entryRef.contentRevision&&(ref.bodyRef.kind==='input'?entry.bodyBinding==='input'&&entry.workingInputId===ref.bodyRef.id&&entry.bindingRevision===ref.bodyRef.contentRevision:entry.bodyBinding==='thought'&&entry.fieldRevisions?.body===ref.bodyRef.fieldRevision);
const normalized=value=>String(value??'').normalize('NFKC').toLocaleLowerCase();
const sameTopic=(a,b)=>a?.id===b?.id&&a?.revision===b?.revision&&a?.organizationRevision===b?.organizationRevision&&a?.activeLayoutGeneration===b?.activeLayoutGeneration;


const filterSelections=new WeakMap();
function filterSelection(model,result,refs,sections){
 const topic=result.topic,entries=refs.map(ref=>Object.freeze({id:ref.entryRef.id,revision:ref.entryRef.revision,contentRevision:ref.entryRef.contentRevision,placementRevision:ref.placement.revision,sectionId:ref.placement.sectionId})),sectionIds=[...new Set([...sections.map(section=>section.id??section.sectionId),...entries.map(entry=>entry.sectionId)])];
 if(entries.length>40||sectionIds.length>100||entries.some(entry=>!idOK(entry.id))||sectionIds.some(id=>!idOK(id))||new Set(entries.map(entry=>entry.id)).size!==entries.length)unavailable();
 const token=Object.freeze({});filterSelections.set(token,{model,result,selection:Object.freeze({topicId:topic.id,revision:topic.revision,organizationRevision:topic.organizationRevision,layoutGeneration:topic.layoutGeneration,entries:Object.freeze(entries),sectionIds:Object.freeze(sectionIds)})});return token;
}
// Only actual original Section page selection can produce this one-use hint.
export function readSectionFilterVisibilitySelection(token,model,result){const r=filterSelections.get(token);filterSelections.delete(token);return r&&r.model===model&&r.result===result?r.selection:null;}

// Reuse the actual canonical body/binding/chronology owners, but make their
// foundation and transaction boundaries strictly read-only. No run() migration,
// chronology maintenance, alternate body store or swallowed read error.
// Canonical local Thought readability preserves existing human work. Smart
// Filter qualification of generated labels remains the 05.1 owner's stricter
// policy; this local reader never grants processing or external access.
function readOwner(model,result){
 const source=model.s,owner=Object.create(source);
 owner.run=work=>work();
 owner.finishFoundation=async()=>{if(!model.ready())unavailable();};
 owner.repository=Object.create(source.repository);
 owner.repository.transaction=(write,work,stores)=>{
  if(write)unavailable();
  return source.repository.transaction(false,t=>work(thoughtSectionTransactionReader(model,result,t)),stores);
 };
 return owner;
}

// A cursor denotes a consumed event: a durable Section's start (placement=null)
// or one of its Placements. Section starts are real metadata events, including
// empty named Sections, never fabricated Entries. This gives both directions
// finite progress even across hundreds of empty or currently ineligible rows.
function eventReader(t,topic,scopeSectionId=null){
 const range=prefix([topic.id,topic.activeLayoutGeneration,0]),sections=new Map();
 const section=async key=>{
  const id=key.at(-1);
  if(!sections.has(id))sections.set(id,await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,id])));
  return sections.get(id);
 };
 const adjacent=async(key,direction)=>{
  if(scopeSectionId!==null){if(key)return null;const value=await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,scopeSectionId]));if(!value)return null;sections.set(scopeSectionId,value);return {key:sectionKey(topic,value),value};}
  const row=(await t.rangePage('sections','byTopicOrder',range,key,1,direction)).rows[0];
  if(row)sections.set(row.value.sectionId,row.value);
  return row;
 };
 const header=row=>({position:{section:row.key,placement:null},section:row.value});
 const placement=async(raw,key,direction)=>{
  const row=(await t.rangePage('placements','bySectionOrder',prefix([topic.id,topic.activeLayoutGeneration,raw.sectionId,0]),key,1,direction)).rows[0];
  return row?{position:{section:sectionKey(topic,raw),placement:row.key},section:raw,placement:row.value}:null;
 };
 return async(position,direction)=>{
  if(position){
   const raw=await section(position.section);if(!raw)unavailable();
   if(direction==='next'||position.placement){
    const next=await placement(raw,position.placement,direction);if(next)return next;
    if(direction==='prev')return header({key:position.section,value:raw});
   }
  }
  const next=await adjacent(position?.section??null,direction);if(!next)return null;
  if(direction==='prev')return await placement(next.value,null,'prev')||header(next);
  return header(next);
 };
}

async function trackedReferences(s,t,ids){
 const out=[];
 for(const id of new Set(ids)){
  const raw=await t.get('thoughts',id);
  if(!raw||raw.storageSchema!==2||raw.quarantineSealed||raw.lifecycle==='quarantined'){out.push({id,lifecycle:'unavailable',purged:true});continue;}
  const current=await s.readableEntry(t,id),row=await bindingRead(s,t,current),lifecycle=dependencyLifecycle(current,await readDependencyInputs(s,t,current));
  if(!['active','removed','invalidated'].includes(lifecycle)||!revisionOK(row.revision)||ENTRY_FIELDS.some(field=>!revisionOK(row.fieldRevisions?.[field]))||row.currentInputRevision!==null&&!revisionOK(row.currentInputRevision))unavailable();
  out.push({id,lifecycle,purged:current.staleReasons?.includes('source_purged')===true,revision:row.revision,
   fieldRevisions:Object.fromEntries(ENTRY_FIELDS.map(field=>[field,row.fieldRevisions[field]])),currentInputRevision:row.currentInputRevision});
 }
 return out;
}

export class ThoughtSectionReading{
 constructor(readModel){this.model=readModel;this.generations=new Map();this.yearMetadata=new Map();}
 generation(key){
  if(!this.generations.has(key))this.generations.set(key,crypto.randomUUID());
  if(this.generations.size>128)this.generations.delete(this.generations.keys().next().value);
  return this.generations.get(key);
 }
 queryPage(options){
  const {topicId,cursor,limit,direction,anchorId,sectionId,trackedEntryIds,expectedReadGeneration,providerKey}=options;
  const query=normalized(options.query.trim()),model=this.model,s=model.s,scope={kind:'section_query',topicId,query,providerKey,direction};
  let lexicalFence=null;
  return model.read(scope,cursor,async(t,prior)=>{
   const raw=await t.get('topics',topicId),topic=await thoughtReadTopic(s,t,raw);
   if(!topic)return empty({unavailable:true,reason:'topic_unavailable'});
   if(prior&&expectedReadGeneration!==null&&prior.generation!==expectedReadGeneration)return empty({cursorInvalid:true});
   if(anchorId!==null){
    const p=await t.get('placements',JSON.stringify([topicId,raw.activeLayoutGeneration,anchorId]));
    if(!p||!await thoughtReadPlacement(s,t,raw,p)||sectionId!==null&&p.sectionId!==sectionId||providerKey!==null&&!await entryMatchesProvider(s,t,anchorId,providerKey))return empty({cursorInvalid:true,anchorUnavailable:true});
   }
   if(sectionId!==null&&!await thoughtReadSection(s,t,raw,await t.get('sections',JSON.stringify([topicId,raw.activeLayoutGeneration,sectionId]))))return empty({cursorInvalid:true,anchorUnavailable:true});
   const recoveryEpoch=(await t.get('meta','recovery-restore-epoch'))?.value||'initial';
   if(typeof recoveryEpoch!=='string'||recoveryEpoch.length>200)unavailable();
   return {raw,topic,recoveryEpoch,prior,tracked:await trackedReferences(s,t,trackedEntryIds)};
  },async result=>{
   if(!result.raw)return result;
   const {raw,topic,recoveryEpoch,prior,tracked,authority}=result,canonical=new Map(),owner=Object.create(s),reader=readOwner(model,result);
   // The lexical owner may maintain its original descriptor index. Use the
   // actual store queue so this adapter cannot fork tail/control publication
   // state while capture, filtering or preferences use that same store.
   owner.run=work=>s.run(work);
   // The existing lexical owner alone maintains its derived descriptor index.
   // Retain its <=40 canonical resolutions for match/revision qualification,
   // including large-body placeholders, without hydrating any body twice.
   owner.readingEntry=async id=>{
    if(canonical.size>=limit||canonical.has(id))unavailable();
    const entry=await reader.readingEntry(id);canonical.set(id,entry);return entry;
   };
   const page=await owner.topicDocumentPage({topicId,query,cursor:prior?.cursor??null,limit,direction,anchorId,sectionId,
    providerKey,expectedReadGeneration:prior?.lexicalGeneration??null,chronology:'expression',sort:'asc',view:'original'});
   const stale=()=>({...empty({cursorInvalid:true,anchorUnavailable:page.anchorUnavailable===true}),authority});
   if(page.cursorInvalid||!sameTopic(raw,page.topic))return stale();
   const lexicalGeneration=page.coverage?.activeGeneration??null;
   const generation=lexicalGeneration?this.generation(JSON.stringify(['section_query',authority,topicId,query,providerKey,lexicalGeneration])):null;
   if(expectedReadGeneration!==null&&expectedReadGeneration!==generation||prior&&prior.generation!==generation)return stale();
   if(!Array.isArray(page.items)||page.items.length>limit)unavailable();
   const qualify=()=>s.repository.transaction(false,async tx=>{
    const t=thoughtSectionTransactionReader(model,result,tx),current=await t.get('topics',topicId);
    if(!sameTopic(raw,current)||!await thoughtReadTopic(s,t,current))return null;
    const items=[],sections=new Map(),refs=[];
    for(const item of page.items){
     const e=canonical.get(item.entry?.id),p=await t.get('placements',JSON.stringify([topicId,current.activeLayoutGeneration,item.entry?.id]));
     const ref=p?await thoughtReadPlacement(s,t,current,p):null;
     if(!e||!p||item.placement?.revision!==p.revision||item.placement?.sectionId!==p.sectionId)return null;
     if(!ref)continue;
     if(e.lifecycle!=='active'||!sameBody(e,ref))return null;
     if(providerKey!==null&&!await entryMatchesProvider(s,t,e.id,providerKey))return null;
     // An excluded generated Section title cannot be the sole lexical match.
     // Canonical local Thought body/title/note visibility remains unchanged.
     if(![e.body,e.title,e.note,ref.section.title].some(value=>normalized(value).includes(query)))continue;
     items.push({entry:item.entry.large?{...item.entry,...entryIdentity(e)}:item.entry,placement:ref.placement});sections.set(ref.section.id,sectionDTO(ref.section));refs.push(ref);
    }
    return {items,sections:[...sections.values()],refs,topic:await thoughtReadTopic(s,t,current)};
   });
   let qualified=await qualify();if(!qualified)return stale();
   if(!await prepareThoughtSectionVisibility(model,result,filterSelection(model,result,qualified.refs,qualified.sections)))return stale();
   qualified=await qualify();
   if(!qualified||!await thoughtTopicGenerationMatches(reader,{topicId,generation:page.coverage?.activeGeneration,viewKey:page.coverage?.activeKey,currentKey:page.coverage?.currentKey,indexing:page.indexing===true}))return stale();
   lexicalFence={topicId,generation:lexicalGeneration,viewKey:page.coverage?.activeKey,currentKey:page.coverage?.currentKey,indexing:page.indexing===true};
   // Preserve actual consumed lexical boundaries, including empty match pages.
   // No counts, Section overview, AI fields or descriptor internals cross out.
   const issue=(direction,value)=>value?model.issue({...scope,direction},{cursor:value,generation,lexicalGeneration},authority):null;
   const nextCursor=issue('next',page.nextCursor),previousCursor=issue('prev',page.previousCursor),complete=page.indexing!==true&&page.complete===true;
   return {version:1,kind:'section_reading',topic:qualified.topic,recoveryEpoch,tracked,items:qualified.items,sections:qualified.sections,currentCursor:cursor,nextCursor,previousCursor,sectionCursor:null,
    query,sort:'asc',providerKey,complete,indexing:page.indexing===true,readingStructure:{kind:'derivative_reading',state:'not_projected'},
    coverage:{activeGeneration:generation,complete,start:!page.indexing&&!previousCursor,end:!page.indexing&&!nextCursor},
    operations:{hydratedEntries:canonical.size},authority};
  },t=>{
   if(!lexicalFence)return true;
   // Derived index generations can change without canonical authority changing.
   // Reuse its owner inside the outer final transaction, after final consent.
   const owner=Object.create(s);owner.run=work=>work();
   owner.repository={transaction:(write,work)=>{if(write)unavailable();return work(t);}};
   return thoughtTopicGenerationMatches(owner,lexicalFence);
  });
 }
 expressionPage(options){
  const {topicId,cursor,limit,direction,anchorId,sectionId,scopeSectionId,trackedEntryIds,expectedReadGeneration,providerKey,sort,year}=options;
  const model=this.model,s=model.s,scope={kind:'section_expression',topicId,scopeSectionId:scopeSectionId??sectionId,providerKey,sort,year,direction};
  let fence=null,preparedMetadata=null;
  return model.read(scope,cursor,async(t,prior)=>{
   const raw=await t.get('topics',topicId),topic=await thoughtReadTopic(s,t,raw);
   if(!topic)return empty({unavailable:true,reason:'topic_unavailable'});
   const selected=scopeSectionId??sectionId;
   const selectedSection=selected===null?null:await thoughtReadSection(s,t,raw,await t.get('sections',JSON.stringify([topicId,raw.activeLayoutGeneration,selected])));
   if(selected!==null&&!selectedSection)return empty({cursorInvalid:true,anchorUnavailable:true});
   if(scopeSectionId!==null&&sectionId!==null&&scopeSectionId!==sectionId)return empty({cursorInvalid:true,anchorUnavailable:true});
   const recoveryEpoch=(await t.get('meta','recovery-restore-epoch'))?.value||'initial';
   if(typeof recoveryEpoch!=='string'||recoveryEpoch.length>200)unavailable();
   return {raw,topic,prior,recoveryEpoch,selectedSection,tracked:await trackedReferences(s,t,trackedEntryIds)};
  },async result=>{
   if(!result.raw)return result;
   const {raw,topic,prior,authority,recoveryEpoch,tracked}=result;let selectedSection=result.selectedSection,safeTopic=topic;
   // Only the existing descriptor owner maintains its original derived index.
   // The Section adapter qualifies metadata before counting or hydrating it.
   const describe=descriptorReader(s),reader=readOwner(model,result),selected=scopeSectionId??sectionId,effectiveAnchor=prior?.anchorId??anchorId;
   const stale=(anchorUnavailable=false)=>({...empty({cursorInvalid:true,anchorUnavailable}),authority});
   const descriptor=async args=>{
    const page=await thoughtTopicExpressionPage(s,{topicId,sort,providerKey,describe,...args});
    fence={topicId,generation:page.coverage.activeGeneration,viewKey:page.coverage.activeKey,currentKey:page.coverage.currentKey,indexing:page.indexing===true};
    return page;
   };
   const qualified=async rows=>s.repository.transaction(false,async tx=>{
    const t=thoughtSectionTransactionReader(model,result,tx),current=await t.get('topics',topicId);
    if(!sameTopic(raw,current)||!await thoughtReadTopic(s,t,current))return null;
    const refs=[];
    for(const d of rows){
     if(selected!==null&&d.sectionId!==selected)continue;
     const p=await t.get('placements',JSON.stringify([topicId,current.activeLayoutGeneration,d.entryId]));
     const ref=p?await thoughtReadPlacement(s,t,current,p):null;
     if(!ref)continue;
     if(p.revision!==d.placementRevision||ref.entryRef.revision!==d.entryRevision||JSON.stringify(ref.expressionTime)!==JSON.stringify(d.expressionTime))return null;
     if(providerKey!==null&&!await entryMatchesProvider(s,t,d.entryId,providerKey))continue;
     refs.push({d,ref});
    }
    return refs;
   });
   const warm=async refs=>{
    if(!await prepareThoughtSectionVisibility(model,result,filterSelection(model,result,refs,refs.map(ref=>ref.section).concat(selectedSection?[selectedSection]:[]))))return false;
    const labels=await s.repository.transaction(false,async tx=>{const t=thoughtSectionTransactionReader(model,result,tx),current=await t.get('topics',topicId);if(!sameTopic(raw,current))return null;const topic=await thoughtReadTopic(s,t,current),section=selected===null?null:await thoughtReadSection(s,t,current,await t.get('sections',JSON.stringify([topicId,current.activeLayoutGeneration,selected])));return topic&&(selected===null||section)?{topic,section}:null;});
    if(!labels)return false;safeTopic=labels.topic;selectedSection=labels.section;return true;
   };
   let counts={...(prior?.counts||{})},metadataComplete=prior?.metadataComplete===true,chosen=prior?.chosen??year,generation=prior?.generation??null,indexGeneration=prior?.indexGeneration??null;
   const issue=(dir,key)=>model.issue({...scope,direction:dir},{counts,metadataComplete,chosen,generation,indexGeneration,anchorId:effectiveAnchor,...key},authority);
   const base=()=>({version:1,kind:'section_reading',topic:safeTopic,recoveryEpoch,tracked,sections:selectedSection?[sectionDTO(selectedSection)]:[],items:[],currentCursor:cursor,sectionCursor:null,query:'',chronology:'expression',sort,providerKey,year:chosen,readingStructure:{kind:'derivative_reading',state:'not_projected'},authority});
   if(!metadataComplete){
    const scan=await descriptor({limit:40,cursor:prior?.metadataCursor??null,expectedReadGeneration:indexGeneration});
    if(scan.cursorInvalid)return stale();
    indexGeneration=scan.coverage.activeGeneration;
    generation=indexGeneration?this.generation(JSON.stringify([authority,topicId,selected,providerKey,sort,indexGeneration])):null;
    if(expectedReadGeneration!==null&&generation!==expectedReadGeneration||prior?.generation&&prior.generation!==generation)return stale();
    if(scan.indexing){if(!await warm([]))return stale();return {...base(),indexing:true,complete:false,nextCursor:issue('next',{metadataCursor:null}),previousCursor:null,yearMetadata:{pending:true,complete:false},coverage:{activeGeneration:generation,complete:false}};}
    // A bounded worker-local preparation cache contains only fully qualified
    // year counts. Current authority and original index identity are reread
    // before reuse; no body, grant or durable domain truth is cached here.
    const cacheKey=JSON.stringify([authority,topicId,selected,providerKey,sort,raw.activeLayoutGeneration,raw.organizationRevision,indexGeneration,scan.coverage.activeKey]);
    const cached=this.yearMetadata.get(cacheKey);
    if(cached){counts={...cached};metadataComplete=true;}
    else{
     const refs=await qualified(scan.items);if(!refs)return stale();
     for(const {ref} of refs){const key=Number.isInteger(ref.expressionTime.year)?String(ref.expressionTime.year):'unknown';counts[key]=(counts[key]||0)+1;}
     metadataComplete=!scan.nextCursor;
     if(!metadataComplete){if(!await warm(refs.map(value=>value.ref)))return stale();return {...base(),indexing:true,complete:false,nextCursor:issue('next',{metadataCursor:scan.nextCursor}),previousCursor:null,yearMetadata:{pending:true,complete:false},coverage:{activeGeneration:generation,complete:false},operations:{...scan.operations,hydratedEntries:0}};}
     preparedMetadata={key:cacheKey,counts:{...counts}};
    }
   }
   if(expectedReadGeneration!==null&&generation!==expectedReadGeneration)return stale();
   const years=Object.keys(counts).filter(key=>key!=='unknown').map(Number).sort((a,b)=>sort==='desc'?b-a:a-b);if(counts.unknown)years.push('unknown');
   if(chosen===null)chosen=years[0]??null;
   if(!prior?.bodyCursor&&effectiveAnchor!==null){
    const target=await descriptor({limit:1,anchorId:effectiveAnchor,expectedReadGeneration:indexGeneration});
    if(target.cursorInvalid||target.indexing)return stale(target.anchorUnavailable===true);const refs=await qualified(target.items);
    if(!refs)return stale();if(refs.length!==1||refs[0].d.entryId!==effectiveAnchor)return stale(true);
    chosen=Number.isInteger(refs[0].ref.expressionTime.year)?refs[0].ref.expressionTime.year:'unknown';
   }
   const yearMetadata={pending:false,complete:true};
   if(chosen===null){if(!await warm([]))return stale();return {...base(),nextCursor:null,previousCursor:null,nextYear:null,yearMetadata,complete:true,coverage:{activeGeneration:generation,complete:true,start:true,end:true},operations:{hydratedEntries:0}};}
   const page=await descriptor({year:chosen,limit,direction,cursor:prior?.bodyCursor??null,anchorId:prior?.bodyCursor?null:effectiveAnchor,expectedReadGeneration:indexGeneration});
   if(page.cursorInvalid||page.indexing)return stale();let refs=await qualified(page.items);if(!refs)return stale();
   if(!await warm(refs.map(value=>value.ref)))return stale();
   refs=await qualified(page.items);if(!refs)return stale();
   const eligible=new Map(refs.map(value=>[value.d.entryId,value.ref])),items=[],sections=new Map(selectedSection?[[selectedSection.id,sectionDTO(selectedSection)]]:[]);let lastConsumed=null,stopped=false,hydrated=0;
   const ordered=direction==='prev'?[...page.items].reverse():page.items;
   for(const d of ordered){
    const ref=eligible.get(d.entryId);let item=null;
    if(ref){
     const canonical=await reader.readingEntry(ref.entryRef.id);hydrated++;
     if(canonical.lifecycle!=='active'||!sameBody(canonical,ref))return stale();
     const expressionTime=ref.expressionTime;let entry={...canonical,expressionTime,effectiveTime:expressionTime.at,timeBasis:expressionTime.basis};
     if(bytes(entry)>128*1024)entry={...entryIdentity(canonical),large:true,title:canonical.title,bodyBytes:bytes(canonical.body),expressionTime,effectiveTime:expressionTime.at,timeBasis:expressionTime.basis};
     item={entry,placement:ref.placement};
    }
    const nextSections=new Map(sections);if(ref)nextSections.set(ref.section.id,sectionDTO(ref.section));
    if(bytes({...base(),sections:[...nextSections.values()],items:item?[...items,item]:items})>256*1024-2048){stopped=true;break;}
    if(item)items.push(item);if(ref)sections.set(ref.section.id,sectionDTO(ref.section));lastConsumed=d._cursorKey;
   }
   if(stopped&&!lastConsumed)unavailable();
   const boundary=stopped?{generation:indexGeneration,viewKey:page.coverage.activeKey,sort,year:chosen,providerKey,query:'',key:lastConsumed}:null;
   const next=direction==='next'&&boundary?boundary:page.nextCursor,previous=direction==='prev'&&boundary?boundary:page.previousCursor;
   if(direction==='prev')items.reverse();
   const nextCursor=next?issue('next',{bodyCursor:next}):null,previousCursor=previous?issue('prev',{bodyCursor:previous}):null;
   const complete=direction==='next'?!nextCursor:!previousCursor,at=years.indexOf(chosen),nextYear=!nextCursor&&at>=0?years[at+1]??null:null;
   return {...base(),topic:safeTopic,items,sections:[...sections.values()],nextCursor,previousCursor,nextYear,yearMetadata,complete,coverage:{activeGeneration:generation,complete,start:!previousCursor,end:!nextCursor},operations:{...page.operations,hydratedEntries:hydrated}};
  },t=>{
   if(!fence)return true;const owner=Object.create(s);owner.run=work=>work();owner.repository={transaction:(write,work)=>{if(write)unavailable();return work(t);}};
   return thoughtTopicGenerationMatches(owner,fence);
  }).then(result=>{
   // Publish only after the final consent, authority and index-generation fence.
   if(preparedMetadata&&!result.cursorInvalid&&!result.unavailable){
    this.yearMetadata.set(preparedMetadata.key,preparedMetadata.counts);
    while(this.yearMetadata.size>32)this.yearMetadata.delete(this.yearMetadata.keys().next().value);
   }
   return result;
  });
 }
 page(options={}){
  const allowed=['topicId','cursor','limit','direction','anchorId','sectionId','trackedEntryIds','expectedReadGeneration','query','providerKey','sort','timeEdge','view','sectionCursor','scopeSectionId','chronology','year'];
  if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(key=>!allowed.includes(key)))invalid();
  const {topicId,cursor=null,limit=40,direction='next',anchorId=null,sectionId=null,trackedEntryIds=[],expectedReadGeneration=null,query='',providerKey=null,chronology=null,year=null,sort=chronology==='expression'?'desc':'asc',timeEdge=null,view='original',sectionCursor=null,scopeSectionId=null}=options;
  if(scopeSectionId!==null&&!idOK(scopeSectionId)||!idOK(topicId)||!Number.isInteger(limit)||limit<1||limit>40||!['next','prev'].includes(direction)||anchorId!==null&&!idOK(anchorId)||sectionId!==null&&!idOK(sectionId)||!Array.isArray(trackedEntryIds)||trackedEntryIds.length>100||trackedEntryIds.some(id=>!idOK(id))||expectedReadGeneration!==null&&(typeof expectedReadGeneration!=='string'||expectedReadGeneration.length>4000)||typeof query!=='string'||query.length>500||scopeSectionId!==null&&query.trim()||providerKey!==null&&!validProvider(providerKey)||!['asc','desc'].includes(sort)||!['original','ai'].includes(view)||timeEdge!==null&&!['earliest','latest','unknown'].includes(timeEdge)||sectionCursor!==null||cursor!==null&&(anchorId!==null||sectionId!==null)||direction==='prev'&&(anchorId!==null||sectionId!==null))invalid();
  if(chronology!==null&&chronology!=='expression'||year!==null&&year!=='unknown'&&(!Number.isInteger(year)||year<0||year>9999)||chronology===null&&year!==null)invalid();
  if(chronology==='expression'){if(query.trim()||timeEdge!==null||view!=='original')invalid();return this.expressionPage({topicId,cursor,limit,direction,anchorId,sectionId,scopeSectionId,trackedEntryIds,expectedReadGeneration,providerKey,sort,year});}
  if(query.trim()&&sort==='asc'&&timeEdge===null&&view==='original')return this.queryPage({topicId,cursor,limit,direction,anchorId,sectionId,trackedEntryIds,expectedReadGeneration,query,providerKey});
  const model=this.model,s=model.s,scope={kind:'section_reading',topicId,providerKey,direction,...(scopeSectionId!==null?{scopeSectionId}:{})};
  return model.read(scope,cursor,async(t,prior,authority)=>{
   // Saved-AI and nonstandard ordering need their separately admitted owners.
   // Unsupported requests cannot silently widen to all ordinary Topic prose.
   if(query.trim()||sort!=='asc'||timeEdge!==null||view!=='original')return empty({unsupported:true,reason:'reading_mode_unsupported'});
   const raw=await t.get('topics',topicId),topic=await thoughtReadTopic(s,t,raw);
   if(!topic)return expectedReadGeneration!==null?empty({cursorInvalid:true,anchorUnavailable:anchorId!==null||sectionId!==null}):empty({unavailable:true,reason:'topic_unavailable'});
   if(scopeSectionId!==null&&!await thoughtReadSection(s,t,raw,await t.get('sections',JSON.stringify([topicId,raw.activeLayoutGeneration,scopeSectionId]))))return empty({cursorInvalid:true,anchorUnavailable:true});
   if(scopeSectionId!==null&&sectionId!==null&&sectionId!==scopeSectionId)return empty({cursorInvalid:true,anchorUnavailable:true});
   const generation=this.generation(JSON.stringify([authority,topic.id,topic.revision,topic.organizationRevision,topic.layoutGeneration,providerKey,scopeSectionId]));
   const recoveryEpoch=(await t.get('meta','recovery-restore-epoch'))?.value||'initial';
   if(typeof recoveryEpoch!=='string'||recoveryEpoch.length>200)unavailable();
   if(expectedReadGeneration!==null&&expectedReadGeneration!==generation||prior&&prior.generation!==generation)return empty({cursorInvalid:true});
   const nextEvent=eventReader(t,raw,scopeSectionId),events=[];let position=prior?.position??null,initial=null,placements=0,headers=0;
   if(anchorId!==null){
    const p=await t.get('placements',JSON.stringify([topicId,raw.activeLayoutGeneration,anchorId]));
    const ref=p?await thoughtReadPlacement(s,t,raw,p):null;
    if(!ref||scopeSectionId!==null&&p.sectionId!==scopeSectionId||sectionId!==null&&p.sectionId!==sectionId||providerKey!==null&&!await entryMatchesProvider(s,t,anchorId,providerKey))return empty({cursorInvalid:true,anchorUnavailable:true});
    initial={position:{section:sectionKey(raw,{...ref.section,sectionId:ref.section.id}),placement:placementKey(raw,p)},section:await t.get('sections',JSON.stringify([topicId,raw.activeLayoutGeneration,p.sectionId])),placement:p,ref};
   }else if(sectionId!==null){
    const section=await t.get('sections',JSON.stringify([topicId,raw.activeLayoutGeneration,sectionId]));
    if(!await thoughtReadSection(s,t,raw,section))return empty({cursorInvalid:true,anchorUnavailable:true});
    initial={position:{section:sectionKey(raw,section),placement:null},section};
   }
   while(placements<limit&&headers<100){
    const event=initial||await nextEvent(position,direction);initial=null;if(!event)break;
    position=event.position;
    if(event.placement){
     placements++;
     const ref=event.ref||await thoughtReadPlacement(s,t,raw,event.placement);
     const eligible=ref&&(providerKey===null||await entryMatchesProvider(s,t,ref.entryRef.id,providerKey));
     events.push({position,ref:eligible?ref:null,section:ref?.section??null});
    }else{
     headers++;
     events.push({position,ref:null,section:await thoughtReadSection(s,t,raw,event.section)});
    }
   }
   const first=events[0]?.position,last=events.at(-1)?.position;
   const before=first?!!await nextEvent(first,direction==='next'?'prev':'next'):false;
   const after=last?!!await nextEvent(last,direction):false;
   return {topic,generation,recoveryEpoch,events,before,after,tracked:await trackedReferences(s,t,trackedEntryIds),operations:{placementCandidates:placements,sectionStarts:headers,hydratedEntries:0}};
  },async result=>{
   if(!result.events)return result;
   const selectedEvents=result.events,selection=filterSelection(model,result,selectedEvents.filter(event=>event.ref).map(event=>event.ref),selectedEvents.filter(event=>event.section).map(event=>event.section));
   if(!await prepareThoughtSectionVisibility(model,result,selection))return {...empty({cursorInvalid:true}),authority:result.authority};
   const refreshed=await s.repository.transaction(false,async tx=>{
    const t=thoughtSectionTransactionReader(model,result,tx),raw=await t.get('topics',topicId),topic=await thoughtReadTopic(s,t,raw);if(!topic||topic.revision!==result.topic.revision||topic.organizationRevision!==result.topic.organizationRevision||topic.layoutGeneration!==result.topic.layoutGeneration)return null;
    const events=[];for(const event of selectedEvents){let ref=null,section=null;
     if(event.ref){const p=await t.get('placements',event.ref.placement.id);ref=p?await thoughtReadPlacement(s,t,raw,p):null;if(!ref||ref.entryRef.id!==event.ref.entryRef.id||ref.entryRef.revision!==event.ref.entryRef.revision||ref.entryRef.contentRevision!==event.ref.entryRef.contentRevision||JSON.stringify(ref.placement)!==JSON.stringify(event.ref.placement))return null;section=ref.section;}
     else if(event.section){section=await thoughtReadSection(s,t,raw,await t.get('sections',JSON.stringify([topicId,raw.activeLayoutGeneration,event.section.id])));if(!section||section.revision!==event.section.revision)return null;}
     events.push({...event,ref,section});
    }return {topic,events};
   });
   if(!refreshed)return {...empty({cursorInvalid:true}),authority:result.authority};
   const {generation,recoveryEpoch,before,after,tracked,operations,authority}=result,{topic,events}=refreshed,owner=readOwner(model,result),items=[],sections=new Map(),consumed=[];
   let stopped=false;
   const base={version:1,kind:'section_reading',topic,recoveryEpoch,tracked,currentCursor:cursor,sectionCursor:null,query:'',sort:'asc',providerKey,readingStructure:{kind:'derivative_reading',state:'not_projected'},coverage:{activeGeneration:generation,complete:false},operations,authority};
   for(const event of events){
    let item=null;
    if(event.ref){
     const canonical=await owner.readingEntry(event.ref.entryRef.id);operations.hydratedEntries++;
     if(canonical.lifecycle!=='active'||!sameBody(canonical,event.ref))return {...empty({cursorInvalid:true,anchorUnavailable:event.ref.entryRef.id===anchorId}),authority};
     const expressionTime=event.ref.expressionTime;
     let entry={...canonical,expressionTime,effectiveTime:expressionTime.at,timeBasis:expressionTime.basis};
     if(bytes(entry)>128*1024)entry={...entryIdentity(canonical),large:true,title:canonical.title,bodyBytes:bytes(canonical.body),expressionTime,effectiveTime:expressionTime.at,timeBasis:expressionTime.basis};
     item={entry,placement:event.ref.placement};
    }
    const nextSections=new Map(sections);if(event.section)nextSections.set(event.section.id,sectionDTO(event.section));
    // Reserve cursor/envelope space, and never clip canonical prose to fit.
    if(bytes({...base,sections:[...nextSections.values()],items:item?[...items,item]:items})>256*1024-1024){stopped=true;break;}
    if(item)items.push(item);if(event.section)sections.set(event.section.id,sectionDTO(event.section));consumed.push(event.position);
   }
   if(stopped&&!consumed.length)unavailable();
   if(direction==='prev')items.reverse();
   const orderedSections=[...sections.values()].sort((a,b)=>a.rank.localeCompare(b.rank)||s.repository.factory.cmp(a.sectionId,b.sectionId));
   const atStart=direction==='next'?!before:!after&&!stopped,atEnd=direction==='next'?!after&&!stopped:!before;
   const low=direction==='next'?consumed[0]:consumed.at(-1),high=direction==='next'?consumed.at(-1):consumed[0];
   const issue=(direction,position)=>model.issue({...scope,direction},{position,generation},authority);
   const nextCursor=!atEnd&&high?issue('next',high):null,previousCursor=!atStart&&low?issue('prev',low):null;
   const complete=direction==='next'?!nextCursor:!previousCursor;
   return {...base,items,sections:orderedSections,nextCursor,previousCursor,complete,coverage:{activeGeneration:generation,complete,start:!previousCursor,end:!nextCursor}};
  });
 }
}
