import {ArchiveError} from './constants.js';
import {idOK,prefix,ENTRY_FIELDS,revisionOK} from './thought-model.js';
import {bindingRead} from './thought-binding.js';
import {readDependencyInputs,dependencyLifecycle} from './thought-evidence.js';
import {entryMatchesProvider} from './thought-source-scope.js';
import {validProvider} from './read-projection-keys.js';
import {boundedThoughtRead,thoughtReadTopic,thoughtReadSection,thoughtReadPlacement} from './thought-library-read-model.js';
import {thoughtTopicGenerationMatches} from './thought-read-index.js';

const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
const unavailable=()=>{throw new ArchiveError('UNAVAILABLE');};
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
const empty=fields=>({version:1,kind:'section_reading',items:[],sections:[],tracked:[],nextCursor:null,previousCursor:null,sectionCursor:null,complete:false,coverage:{complete:false},...fields});
const sectionKey=(topic,row)=>[topic.id,topic.activeLayoutGeneration,0,row.rank,row.sectionId];
const placementKey=(topic,p)=>[topic.id,topic.activeLayoutGeneration,p.sectionId,0,p.rank,p.entryId];
const sectionDTO=row=>{const {id,...rest}=row;return {sectionId:id,...rest};};
// The same body-free identity accompanies full rows and large placeholders.
const entryIdentity=e=>({id:e.id,revision:e.revision,contentRevision:e.contentRevision,fieldRevisions:e.fieldRevisions,bodyBinding:e.bodyBinding,workingInputId:e.workingInputId,bindingRevision:e.bindingRevision,currentInputRevision:e.currentInputRevision});
const sameBody=(entry,ref)=>entry.id===ref.entryRef.id&&entry.revision===ref.entryRef.revision&&entry.contentRevision===ref.entryRef.contentRevision&&(ref.bodyRef.kind==='input'?entry.bodyBinding==='input'&&entry.workingInputId===ref.bodyRef.id&&entry.bindingRevision===ref.bodyRef.contentRevision:entry.bodyBinding==='thought'&&entry.fieldRevisions?.body===ref.bodyRef.fieldRevision);
const normalized=value=>String(value??'').normalize('NFKC').toLocaleLowerCase();
const sameTopic=(a,b)=>a?.id===b?.id&&a?.revision===b?.revision&&a?.organizationRevision===b?.organizationRevision&&a?.activeLayoutGeneration===b?.activeLayoutGeneration;

// Reuse the actual canonical body/binding/chronology owners, but make their
// foundation and transaction boundaries strictly read-only. No run() migration,
// chronology maintenance, alternate body store or swallowed read error.
// Canonical local Thought readability preserves existing human work. Smart
// Filter qualification of generated labels remains the 05.1 owner's stricter
// policy; this local reader never grants processing or external access.
function readOwner(model){
 const source=model.s,owner=Object.create(source);
 owner.run=work=>work();
 owner.finishFoundation=async()=>{if(!model.ready())unavailable();};
 owner.repository=Object.create(source.repository);
 owner.repository.transaction=(write,work,stores)=>{
  if(write)unavailable();
  return source.repository.transaction(false,t=>work(boundedThoughtRead(t)),stores);
 };
 return owner;
}

// A cursor denotes a consumed event: a durable Section's start (placement=null)
// or one of its Placements. Section starts are real metadata events, including
// empty named Sections, never fabricated Entries. This gives both directions
// finite progress even across hundreds of empty or currently ineligible rows.
function eventReader(t,topic){
 const range=prefix([topic.id,topic.activeLayoutGeneration,0]),sections=new Map();
 const section=async key=>{
  const id=key.at(-1);
  if(!sections.has(id))sections.set(id,await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,id])));
  return sections.get(id);
 };
 const adjacent=async(key,direction)=>{
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
 constructor(readModel){this.model=readModel;this.generations=new Map();}
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
   const {raw,topic,recoveryEpoch,prior,tracked,authority}=result,canonical=new Map(),owner=Object.create(s),reader=readOwner(model);
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
   const qualified=await s.repository.transaction(false,async tx=>{
    const t=boundedThoughtRead(tx),current=await t.get('topics',topicId);
    if(!sameTopic(raw,current)||!await thoughtReadTopic(s,t,current))return null;
    const items=[],sections=new Map();
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
     items.push({entry:item.entry.large?{...item.entry,...entryIdentity(e)}:item.entry,placement:ref.placement});sections.set(ref.section.id,sectionDTO(ref.section));
    }
    return {items,sections:[...sections.values()]};
   });
   if(!qualified||!await thoughtTopicGenerationMatches(reader,{topicId,generation:page.coverage?.activeGeneration,viewKey:page.coverage?.activeKey,currentKey:page.coverage?.currentKey,indexing:page.indexing===true}))return stale();
   lexicalFence={topicId,generation:lexicalGeneration,viewKey:page.coverage?.activeKey,currentKey:page.coverage?.currentKey,indexing:page.indexing===true};
   // Preserve actual consumed lexical boundaries, including empty match pages.
   // No counts, Section overview, AI fields or descriptor internals cross out.
   const issue=(direction,value)=>value?model.issue({...scope,direction},{cursor:value,generation,lexicalGeneration},authority):null;
   const nextCursor=issue('next',page.nextCursor),previousCursor=issue('prev',page.previousCursor),complete=page.indexing!==true&&page.complete===true;
   return {version:1,kind:'section_reading',topic,recoveryEpoch,tracked,...qualified,currentCursor:cursor,nextCursor,previousCursor,sectionCursor:null,
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
 page(options={}){
  const allowed=['topicId','cursor','limit','direction','anchorId','sectionId','trackedEntryIds','expectedReadGeneration','query','providerKey','sort','timeEdge','view','sectionCursor'];
  if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(key=>!allowed.includes(key)))invalid();
  const {topicId,cursor=null,limit=40,direction='next',anchorId=null,sectionId=null,trackedEntryIds=[],expectedReadGeneration=null,query='',providerKey=null,sort='asc',timeEdge=null,view='original',sectionCursor=null}=options;
  if(!idOK(topicId)||!Number.isInteger(limit)||limit<1||limit>40||!['next','prev'].includes(direction)||anchorId!==null&&!idOK(anchorId)||sectionId!==null&&!idOK(sectionId)||!Array.isArray(trackedEntryIds)||trackedEntryIds.length>100||trackedEntryIds.some(id=>!idOK(id))||expectedReadGeneration!==null&&(typeof expectedReadGeneration!=='string'||expectedReadGeneration.length>4000)||typeof query!=='string'||query.length>500||providerKey!==null&&!validProvider(providerKey)||!['asc','desc'].includes(sort)||!['original','ai'].includes(view)||timeEdge!==null&&!['earliest','latest','unknown'].includes(timeEdge)||sectionCursor!==null||cursor!==null&&(anchorId!==null||sectionId!==null)||direction==='prev'&&(anchorId!==null||sectionId!==null))invalid();
  if(query.trim()&&sort==='asc'&&timeEdge===null&&view==='original')return this.queryPage({topicId,cursor,limit,direction,anchorId,sectionId,trackedEntryIds,expectedReadGeneration,query,providerKey});
  const model=this.model,s=model.s,scope={kind:'section_reading',topicId,providerKey,direction};
  return model.read(scope,cursor,async(t,prior,authority)=>{
   // Saved-AI and nonstandard ordering need their separately admitted owners.
   // Unsupported requests cannot silently widen to all ordinary Topic prose.
   if(query.trim()||sort!=='asc'||timeEdge!==null||view!=='original')return empty({unsupported:true,reason:'reading_mode_unsupported'});
   const raw=await t.get('topics',topicId),topic=await thoughtReadTopic(s,t,raw);
   if(!topic)return expectedReadGeneration!==null?empty({cursorInvalid:true,anchorUnavailable:anchorId!==null||sectionId!==null}):empty({unavailable:true,reason:'topic_unavailable'});
   const generation=this.generation(JSON.stringify([authority,topic.id,topic.revision,topic.organizationRevision,topic.layoutGeneration,providerKey]));
   const recoveryEpoch=(await t.get('meta','recovery-restore-epoch'))?.value||'initial';
   if(typeof recoveryEpoch!=='string'||recoveryEpoch.length>200)unavailable();
   if(expectedReadGeneration!==null&&expectedReadGeneration!==generation||prior&&prior.generation!==generation)return empty({cursorInvalid:true});
   const nextEvent=eventReader(t,raw),events=[];let position=prior?.position??null,initial=null,placements=0,headers=0;
   if(anchorId!==null){
    const p=await t.get('placements',JSON.stringify([topicId,raw.activeLayoutGeneration,anchorId]));
    const ref=p?await thoughtReadPlacement(s,t,raw,p):null;
    if(!ref||sectionId!==null&&p.sectionId!==sectionId||providerKey!==null&&!await entryMatchesProvider(s,t,anchorId,providerKey))return empty({cursorInvalid:true,anchorUnavailable:true});
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
   const {topic,generation,recoveryEpoch,events,before,after,tracked,operations,authority}=result,owner=readOwner(model),items=[],sections=new Map(),consumed=[];
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
