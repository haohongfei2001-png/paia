import {ArchiveError,CONSENT_VERSION,STORAGE_KEY} from './constants.js';
import {idOK,prefix} from './thought-model.js';
import {safeOrganization} from './organizer/metadata.js';
import {rootReadAuthority} from './organizer/root-read.js';
import {topicActivitySnapshot} from './organizer/topic-root-activity.js';
import {expressionTime} from './organizer/expression-time.js';
import {inputProjection,readDependencyInputs,dependencyLifecycle,dependencyState} from './thought-evidence.js';
import {bindingRead} from './thought-binding.js';
import {exactExcerpt} from './organizer/topic-excerpt.js';
import {AI_FIELDS} from './organizer/ai-contract.js';

// TOPIC-05.1 local read facade. No worker/UI integration, external authorization,
// body store, chronology maintenance or AI-heading synthesis. Root metadata
// stays body-free; the separate bounded original-preview reader is ephemeral.
// Foundation/compatibility preparation remains the existing owner's explicit
// responsibility. Reads refuse until it is complete; they never initialize it.
const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
const unavailable=()=>{throw new ArchiveError('UNAVAILABLE');};
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const exact=(value,keys)=>plain(value)&&Object.keys(value).every(key=>keys.includes(key));
const revision=value=>Number.isSafeInteger(value)&&value>=0;
const rank=value=>typeof value==='string'&&/^\d{12}$/.test(value);
const limitOK=(value,max)=>Number.isInteger(value)&&value>0&&value<=max;
const cursorOK=value=>value===null||typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
const visible=topic=>!!topic&&['active','dormant'].includes(topic.lifecycle)&&!topic.redirectTo;
const protection=value=>typeof value?.locked==='boolean'?value.locked:null;
const labelProtected=(row,field)=>row.protections?.[field]?.locked===true||field==='name'&&(row.createdBy==='user'||row.createdBy!=='ai'&&row.protections?.title?.locked===true);
const dateRef=value=>typeof value==='string'&&value.length<=64&&Number.isFinite(Date.parse(value))?value:null;
const sourceMetadata=entry=>({integrity:['complete','partial','detached'].includes(entry.integrity)?entry.integrity:'unknown',freshness:['current','stale'].includes(entry.freshness)?entry.freshness:'unknown',unavailable:entry.staleReasons?.includes('source_purged')===true});
const derived=()=>({kind:'derivative_reading',state:'not_projected'});
const empty=(kind,fields={})=>({version:1,kind,items:[],nextCursor:null,complete:false,coverage:{complete:false},...fields});

// Existing owner helpers get the real transaction through a bounded read-only
// adapter. Oversized legacy/corrupt dependencies refuse instead of being clipped
// into false eligibility. It never delegates a mutating operation.
function bounded(t){
 let remaining=10000;
 const spend=n=>{remaining-=n;if(remaining<0)unavailable();};
 const view=Object.create(t);
 for(const name of ['get','has','edge'])view[name]=async(...args)=>{spend(1);return t[name](...args);};
 view.all=async(store,index,key,limit)=>{const max=limit===undefined?200:Math.min(limit,200);const rows=await t.all(store,index,key,max+1);spend(rows.length);if(rows.length>max)unavailable();return rows;};
 for(const name of ['rangePage','page','indexPrimaryPage'])view[name]=async(...args)=>{const result=await t[name](...args);spend(result.rows.length);return result;};
 for(const name of ['put','delete','clear','putDerivedSearchRow','putDerivedTopicCount','putDerivedTopicRead'])view[name]=unavailable;
 return view;
}

// dependencyState owns selected-field digest/freshness resolution and hashes
// outside its read transaction. Supply only its read boundary, never the store's
// initialization-capable run() path. The outer authority fence covers all reads.
function dependencyReader(s){return {
 run:work=>work(),
 repository:{transaction:(write,work,stores)=>{if(write)unavailable();return s.repository.transaction(false,t=>work(bounded(t)),stores);}},
 readableEntry:(t,id)=>s.readableEntry(t,id)
};}

// A human Topic does not authorize an AI-derived Section label. Compose the
// existing source sanitizer with current Input/filter eligibility before using
// each unprotected label. These are finite read-work limits, not organization
// thresholds; ambiguous/oversized provenance is unavailable, never truncated.
async function organizationMetadata(s,t,kind,row,fields=[kind==='topic'?'name':'title']){
 if(fields.some(field=>typeof row[field]!=='string'))unavailable();
 // Initial human/legacy Topic creation historically protects title rather
 // than name. Preserve that existing authored fact in this read projection;
 // do not persist a new protection map or relabel it as an AI-owned field.
 const protectedRow={...row,protections:{...row.protections}};
 for(const field of fields)if(labelProtected(row,field))protectedRow.protections[field]={...row.protections?.[field],locked:true};
 const generated=fields.filter(field=>!labelProtected(row,field)&&row[field].trim());
 if(!generated.length)return safeOrganization(s,t,kind,protectedRow);
 if(!Array.isArray(row.sourceRecordIds)||!row.sourceRecordIds.length)return {...protectedRow,...Object.fromEntries(generated.map(field=>[field,''])),sourceUnavailable:true};
 const qualified={sourcePresent:async(tx,ids)=>{
  if(ids.length>20||!await s.sourcePresent(tx,ids))return false;
  const filter=await tx.get('meta','smart-filter');
  for(const id of ids){
   const source=await tx.get('recordIndex',id),page=await tx.indexPrimaryPage('blockIndex','byRecord',id,{limit:20});
   if(!source||source.hidden||source.deletedAt||page.next||!page.rows.length)return false;
   for(const {value:index}of page.rows){const input=await inputProjection(s,tx,index.id);if(!input||await s.isFiltered(tx,input.block,filter))return false;}
  }
  return true;
 }};
 return safeOrganization(qualified,t,kind,protectedRow);
}

async function topicMetadata(s,t,row){
 if(!visible(row))return null;
 if(!idOK(row.id)||!idOK(row.defaultSectionId)||!revision(row.revision)||!revision(row.organizationRevision)||!Number.isSafeInteger(row.activeLayoutGeneration)||row.activeLayoutGeneration<1)unavailable();
 const safe=await organizationMetadata(s,t,'topic',row);
 if(typeof safe.name!=='string'||safe.name.length>300)unavailable();
 return {id:row.id,name:safe.name,lifecycle:row.lifecycle,revision:row.revision,organizationRevision:row.organizationRevision,layoutGeneration:row.activeLayoutGeneration,defaultSectionId:row.defaultSectionId,
  orderRef:{pinKey:[0,1].includes(row.pinKey)?row.pinKey:null,pinRank:rank(row.pinRank)?row.pinRank:null,createdAt:dateRef(row.createdAt)},nameProtected:labelProtected(row,'name')?true:protection(row.protections?.name),sourceUnavailable:safe.sourceUnavailable===true};
}

async function sectionMetadata(s,t,topic,row){
 if(!row||row.lifecycle!=='active'||row.redirectTo)return null;
 if(row.topicId!==topic.id||row.layoutGeneration!==topic.activeLayoutGeneration||!idOK(row.sectionId)||!revision(row.revision)||!rank(row.rank))unavailable();
 if(row.isDefault===true&&row.sectionId!==topic.defaultSectionId)unavailable();
 const safe=await organizationMetadata(s,t,'section',row);
 if(typeof safe.title!=='string'||safe.title.length>300)unavailable();
 return {id:row.sectionId,topicId:topic.id,layoutGeneration:topic.activeLayoutGeneration,revision:row.revision,isDefault:row.sectionId===topic.defaultSectionId,named:!!safe.title.trim(),title:safe.title,rank:row.rank,
  titleProtected:protection(row.protections?.title),orderProtected:protection(row.protections?.order),sourceUnavailable:safe.sourceUnavailable===true};
}

async function placementMetadata(s,t,topic,p,sectionId=null){
 if(p.lifecycle!=='active'||p.excludedByUser===true)return null;
 if(p.topicId!==topic.id||p.layoutGeneration!==topic.activeLayoutGeneration||sectionId!==null&&p.sectionId!==sectionId||!idOK(p.entryId)||p.id!==JSON.stringify([topic.id,p.layoutGeneration,p.entryId])||!revision(p.revision)||!rank(p.rank)||!rank(p.sectionRank))unavailable();
 const section=await sectionMetadata(s,t,topic,await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,p.sectionId])));if(!section)return null;
 if(p.sectionRank!==section.rank)unavailable();
 const stored=await t.get('thoughts',p.entryId);
 if(!stored||stored.storageSchema!==2||stored.lifecycle!=='active'||stored.quarantineSealed)return null;
 const entry=await s.readableEntry(t,p.entryId);
 if(entry.lifecycle!=='active'||dependencyLifecycle(entry,await readDependencyInputs(s,t,entry))!=='active')return null;
 if(entry.id!==p.entryId||!revision(entry.revision)||!revision(entry.contentRevision)||!revision(entry.fieldRevisions?.body))unavailable();
 const bodyRef=entry.bodyBinding==='input'?{kind:'input',id:entry.workingInputId,contentRevision:entry.bindingRevision}:{kind:'thought',id:entry.id,contentRevision:entry.contentRevision,fieldRevision:entry.fieldRevisions.body};
 if(!idOK(bodyRef.id)||!revision(bodyRef.contentRevision))unavailable();
 return {entryRef:{id:entry.id,revision:entry.revision,contentRevision:entry.contentRevision},section,
  placement:{id:p.id,topicId:topic.id,sectionId:p.sectionId,layoutGeneration:p.layoutGeneration,revision:p.revision,rank:p.rank,sectionRank:p.sectionRank,membershipAuthorship:['user','ai','legacy_unknown'].includes(p.membershipAuthorship)?p.membershipAuthorship:'unknown',sectionProtected:typeof p.sectionProtection==='boolean'?p.sectionProtection:null,orderProtected:typeof p.orderProtection==='boolean'?p.orderProtection:null},
  bodyRef,expressionTime:await expressionTime(s,t,entry),source:sourceMetadata(entry),provenanceRef:{kind:'entry',id:entry.id}};
}

export {bounded as boundedThoughtRead,topicMetadata as thoughtReadTopic,sectionMetadata as thoughtReadSection,placementMetadata as thoughtReadPlacement};

export class ThoughtLibraryReadModel{
 constructor(store){this.s=store;this.cursors=new Map();}
 ready(){const s=this.s;return s.loaded===true&&s.foundationLoaded===true&&s.bindingsLoaded===true&&s.documentsLoaded===true&&!!s.repository?.db;}
 async consent(){const local=(await this.s.local.get(STORAGE_KEY))?.[STORAGE_KEY];if(local?.settings?.consentVersion!==CONSENT_VERSION)throw new ArchiveError('CONSENT_REQUIRED');}
 issue(scope,key,authority){
  if(key===null)return null;
  const token=crypto.randomUUID();this.cursors.set(token,{kind:scope.kind,scope:JSON.stringify(scope),key:structuredClone(key),authority});
  // Root overviews may issue many Section continuations that a reader never
  // opens. They cannot evict Root paging refs needed for unchanged Back replay.
  const peers=[...this.cursors].filter(([,value])=>value.kind===scope.kind);
  for(let i=0;i<peers.length-128;i++)this.cursors.delete(peers[i][0]);
  return token;
 }
 async read(scope,cursor,work,resolve=value=>value,qualifyCurrent=()=>true){
  if(!cursorOK(cursor))invalid();
  if(!this.ready())return empty(scope.kind,{unavailable:true,reason:'foundation_not_ready'});
  await this.consent();
  const prior=cursor===null?null:this.cursors.get(cursor);
  if(cursor!==null&&(!prior||prior.scope!==JSON.stringify(scope)))return empty(scope.kind,{cursorInvalid:true});
  let result=await this.s.repository.transaction(false,async raw=>{
   const t=bounded(raw),authority=await rootReadAuthority(t,{search:scope.kind==='search'});
   const foundation=await t.get('meta','thought-library'),binding=await t.get('meta','thought-binding:v1'),documents=await t.get('meta','library-documents-compat-v2');
   if(foundation?.phase!=='active'||binding?.complete!==true||documents?.complete!==true)return empty(scope.kind,{unavailable:true,reason:'foundation_not_ready'});
   if(prior&&prior.authority!==authority)return empty(scope.kind,{cursorInvalid:true});
   return {...await work(t,prior?.key??null,authority),authority};
  });
  if(result.authority){
   result=await resolve(result);
   // A separate current read catches edits/purge/restore queued between owner
   // resolution and publication. Consent is also asynchronous, so it must finish
   // before this last authority read; no awaited work follows the comparison.
   await this.consent();
   const current=await this.s.repository.transaction(false,async raw=>{
    const t=bounded(raw),authority=await rootReadAuthority(t,{search:scope.kind==='search'});
    return {authority,qualified:await qualifyCurrent(t)};
   });
   if(current.authority!==result.authority||!current.qualified||!this.ready())return empty(scope.kind,{cursorInvalid:true});
  }
  return result;
 }
 topicReadingMetadata(options={}){
  if(!exact(options,['id'])||!idOK(options.id))invalid();
  return this.read({kind:'topic_reading_metadata',topicId:options.id},null,async t=>{
   const row=await t.get('topics',options.id),topic=await topicMetadata(this.s,t,row);
   if(!topic)return empty('topic_reading_metadata',{unavailable:true,reason:'topic_unavailable'});
   if(typeof row.summary!=='string'||new TextEncoder().encode(row.summary).length>16384)unavailable();
   // Name and summary have independent authorship. A human Topic name never
   // grants readability to an unprotected generated summary.
   const safe=await organizationMetadata(this.s,t,'topic',row,['name','summary']);
   const recoveryEpoch=(await t.get('meta','recovery-restore-epoch'))?.value||'initial';
   if(typeof recoveryEpoch!=='string'||recoveryEpoch.length>200)unavailable();
   return {id:row.id,name:safe.name,summary:safe.summary,revision:row.revision,recoveryEpoch,
    defaultSectionId:row.defaultSectionId,organizationRevision:row.organizationRevision,activeLayoutGeneration:row.activeLayoutGeneration};
  });
 }
 // The bounded lexical owner creates snippets and owns index maintenance. This
 // read-only qualification never tokenizes or copies a canonical body. It binds
 // those already-read snippets to the same complete search authority, replacing
 // legacy path labels with current source-qualified organization metadata.
 qualifySearchPage(page,query){
  if(typeof query!=='string'||!query.trim()||query.length>300||!page||!Array.isArray(page.items)||page.items.length>100)invalid();
  if(page.cursorInvalid)return Promise.resolve(empty('search',{cursorInvalid:true}));
  const normalized=query.trim().normalize('NFKC').toLocaleLowerCase(),matches=text=>text.normalize('NFKC').toLocaleLowerCase().includes(normalized);
  return this.read({kind:'search'},null,async(t,_key,authority)=>{
   if(page.authority!==authority)return empty('search',{cursorInvalid:true});
   const topics=new Map(),sections=new Map(),items=[];
   const topicFor=async id=>{if(!idOK(id))return null;if(!topics.has(id)){const raw=await t.get('topics',id);topics.set(id,{raw,metadata:await topicMetadata(this.s,t,raw)});}return topics.get(id);};
   const pathFor=async(topicId,sectionId,entryId=null)=>{
    const topic=await topicFor(topicId);if(!topic?.metadata||!idOK(sectionId))return null;
    const key=JSON.stringify([topicId,topic.raw.activeLayoutGeneration,sectionId]);if(!sections.has(key))sections.set(key,await sectionMetadata(this.s,t,topic.raw,await t.get('sections',key)));const section=sections.get(key);if(!section)return null;
    if(entryId){const p=await t.get('placements',JSON.stringify([topicId,topic.raw.activeLayoutGeneration,entryId]));if(!p||p.lifecycle!=='active'||p.excludedByUser===true||p.topicId!==topicId||p.entryId!==entryId||p.sectionId!==sectionId)return null;}
    return {topicId,topicName:topic.metadata.name,sectionId,sectionTitle:section.title};
   };
   for(const row of page.items){
    if(row.kind==='topic'){
     const value=(await topicFor(row.topicId))?.metadata;if(!value||!matches(value.name))continue;
     items.push({kind:'topic',topicId:value.id,topicName:value.name,readRef:{kind:'topic',id:value.id,sectionId:null,aiField:null}});
    }else if(row.kind==='section'){
     const path=await pathFor(row.topicId,row.sectionId);if(!path||!path.sectionTitle||!matches(path.sectionTitle))continue;
     items.push({kind:'section',...path,readRef:{kind:'section',id:path.topicId,sectionId:path.sectionId,aiField:null}});
    }else if(row.kind==='entry'){
     if(!idOK(row.entryId)||typeof row.snippet!=='string'||row.snippet.length>1000||!Array.isArray(row.paths)||row.paths.length>100)unavailable();
     const raw=await t.get('thoughts',row.entryId);if(!raw||raw.lifecycle!=='active'||raw.storageSchema!==2||raw.quarantineSealed)continue;
     const current=await this.s.readableEntry(t,row.entryId);if(current.lifecycle!=='active'||dependencyLifecycle(current,await readDependencyInputs(this.s,t,current))!=='active')continue;
     const paths=[];for(const path of row.paths){const qualified=await pathFor(path.topicId,path.sectionId,row.entryId);if(qualified)paths.push(qualified);}
     items.push({kind:'entry',entryId:row.entryId,snippet:row.snippet,paths,readRef:{kind:'entry',id:row.entryId,sectionId:null,aiField:null}});
    }else if(row.kind==='ai'){
     const topic=(await topicFor(row.topicId))?.metadata;if(!topic||!AI_FIELDS.includes(row.aiField))continue;
     // searchSavedAI owns current saved-field eligibility and deliberately emits
     // only identity/field refs. Preserve that contract without inventing prose.
     items.push({kind:'ai',topicId:topic.id,topicName:topic.name,aiField:row.aiField,readRef:{kind:'ai',id:topic.id,sectionId:null,aiField:row.aiField}});
    }
   }
   return {version:1,kind:'search',items,nextCursor:page.nextCursor??null,complete:page.complete===true,indexing:page.indexing===true,coverage:{complete:page.complete===true}};
  });
 }
 async sections(t,topic,key,limit,namedOnly,authority){
  const scanLimit=namedOnly?Math.max(32,limit):limit;
  const page=await t.rangePage('sections','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]),key,scanLimit),items=[];
  let consumed=key,more=!!page.next;
  for(let index=0;index<page.rows.length;index++){
   const {key:next,value:raw}=page.rows[index],row=await sectionMetadata(this.s,t,topic,raw);consumed=next;
   if(row&&(!namedOnly||row.named))items.push(row);
   if(items.length===limit){more=index<page.rows.length-1||!!page.next;break;}
  }
  const nextCursor=more?this.issue({kind:'sections',topicId:topic.id,namedOnly},consumed,authority):null;
  return {items,nextCursor,complete:!nextCursor,coverage:{complete:!nextCursor}};
 }
 validateRootOptions(options={}){
  if(!exact(options,['cursor','limit','sectionLimit']))invalid();
  const {cursor=null,limit=30,sectionLimit=4}=options;
  if(!cursorOK(cursor)||!limitOK(limit,50)||!limitOK(sectionLimit,10))invalid();
  return {cursor,limit,sectionLimit};
 }
 rootPage(options={}){
  const {cursor,limit,sectionLimit}=this.validateRootOptions(options);
  return this.read({kind:'root'},cursor,async(t,key,authority)=>{
   const snapshot=topicActivitySnapshot(this.s,authority);
   if(!snapshot)return empty('root',{indexing:true});
   const start=key?.offset||0,items=[];
   for(const {id}of snapshot.items.slice(start,start+limit)){
    const row=await t.get('topics',id),topic=await topicMetadata(this.s,t,row);if(!topic)continue;
    items.push({...topic,sectionOverview:await this.sections(t,row,null,sectionLimit,true,authority)});
   }
   const offset=start+limit,nextCursor=offset<snapshot.items.length?this.issue({kind:'root'},{offset},authority):null;
   return {version:1,kind:'root',items,nextCursor,complete:!nextCursor,coverage:{complete:!nextCursor},readingStructure:derived()};
  });
 }

 // Visible-card previews are a separate bounded read. The complete Root
 // directory/cursors remain body-free and never retain these transient DTOs.
 rootPreviews(options={}){
  if(!exact(options,['topics'])||!Array.isArray(options.topics)||!options.topics.length||options.topics.length>12)invalid();
  const refs=options.topics;
  if(new Set(refs.map(ref=>ref?.id)).size!==refs.length||refs.some(ref=>!exact(ref,['id','revision','organizationRevision','layoutGeneration'])||!idOK(ref.id)||!revision(ref.revision)||!revision(ref.organizationRevision)||!Number.isSafeInteger(ref.layoutGeneration)||ref.layoutGeneration<1))invalid();
  if(!this.ready())return Promise.resolve(empty('root_previews',{unavailable:true,reason:'foundation_not_ready'}));
  // Enter the existing control-publication reader so an in-flight preference
  // or recovery publication cannot provide a guessed visibility allowance.
  return this.s.run(()=>this.read({kind:'root_previews'},null,async(t,_key,authority)=>{
   const control=await this.s.control(t);
   if(control.preferences?.hideContentPreviews!==false)return {...empty('root_previews',{masked:true}),authority};
   const items=[];let candidates=0;
   for(const ref of refs){
    const raw=await t.get('topics',ref.id),topic=await topicMetadata(this.s,t,raw);
    if(!topic||topic.revision!==ref.revision||topic.organizationRevision!==ref.organizationRevision||topic.layoutGeneration!==ref.layoutGeneration)return empty('root_previews',{cursorInvalid:true});
    const page=await t.rangePage('placements','byTopicOrder',prefix([raw.id,raw.activeLayoutGeneration,0]),null,8);
    let preview=null;
    for(const {value:placement}of page.rows){
     candidates++;
     const identity=await placementMetadata(this.s,t,raw,placement);if(!identity)continue;
     const stored=await t.get('thoughts',placement.entryId);
     if(stored?.bodyBinding==='input'){const input=stored.workingInputId?await inputProjection(this.s,t,stored.workingInputId):null;if(!input||!input.sourceRecordIds.length||await this.s.isFiltered(t,input.block,await t.get('meta','smart-filter')))continue;}
     const current=await this.s.readableEntry(t,placement.entryId);
     if(!(current.provenanceType==='input_original'||current.origin==='user'||current.authorship?.body?.actor==='user'))continue;
     const row=await bindingRead(this.s,t,current),body=row.thoughtText;
     if(stored?.bodyBinding==='input'&&(row.bodyBinding!=='input'||row.bindingInputId!==stored.workingInputId||row.workingInputId!==stored.workingInputId))continue;
     if(typeof body!=='string'||!body.trim())continue;
     preview={entryId:row.id,revision:row.revision,sectionId:identity.section.id,...exactExcerpt(body)};break;
    }
    // Exhausting eight candidates means no preview, not an empty Topic claim.
    items.push({topicId:topic.id,preview});
   }
   return {version:1,kind:'root_previews',items,complete:true,operations:{candidates,maxTopics:12,maxCandidatesPerTopic:8,maxExcerptUnits:140}};
  },async result=>{
   const local=(await this.s.local.get(STORAGE_KEY))?.[STORAGE_KEY];
   return local?.preferences?.hideContentPreviews===false?result:{...result,items:[],masked:true};
  }));
 }

 sectionPage(options={}){
  if(!exact(options,['topicId','cursor','limit','namedOnly']))invalid();
  const {topicId,cursor=null,limit=40,namedOnly=false}=options;
  if(!idOK(topicId)||!limitOK(limit,100)||typeof namedOnly!=='boolean')invalid();
  return this.read({kind:'sections',topicId,namedOnly},cursor,async(t,key,authority)=>{
   const raw=await t.get('topics',topicId),topic=await topicMetadata(this.s,t,raw);
   if(!topic)return empty('sections',{unavailable:true,reason:'topic_unavailable'});
   return {version:1,kind:'sections',topic,...await this.sections(t,raw,key,limit,namedOnly,authority),readingStructure:derived()};
  });
 }
 entryPage(options={}){
  if(!exact(options,['topicId','sectionId','cursor','limit']))invalid();
  const {topicId,sectionId=null,cursor=null,limit=40}=options;
  if(!idOK(topicId)||sectionId!==null&&!idOK(sectionId)||!limitOK(limit,40))invalid();
  return this.read({kind:'entries',topicId,sectionId},cursor,async(t,key,authority)=>{
   const raw=await t.get('topics',topicId),topic=await topicMetadata(this.s,t,raw);
   if(!topic)return empty('entries',{unavailable:true,reason:'topic_unavailable'});
   if(sectionId!==null&&!await sectionMetadata(this.s,t,raw,await t.get('sections',JSON.stringify([topicId,raw.activeLayoutGeneration,sectionId]))))return empty('entries',{unavailable:true,reason:'section_unavailable'});
   const scope=sectionId===null?[topicId,raw.activeLayoutGeneration,0]:[topicId,raw.activeLayoutGeneration,sectionId,0];
   const page=await t.rangePage('placements',sectionId===null?'byTopicOrder':'bySectionOrder',prefix(scope),key,limit),items=[];
   for(const {value:p}of page.rows){
    const item=await placementMetadata(this.s,t,raw,p,sectionId);if(item)items.push(item);
   }
   const nextCursor=page.next?this.issue({kind:'entries',topicId,sectionId},page.next,authority):null;
   return {version:1,kind:'entries',topic,items,nextCursor,complete:!nextCursor,coverage:{complete:!nextCursor},readingStructure:derived()};
  },async page=>{
   const owner=dependencyReader(this.s),items=[];
   for(const item of page.items){
    // Canonical entry() also preserves source-purge sanitization before digest
    // resolution. Never replace that stronger state with a dependency fallback.
    if(item.source.unavailable){items.push(item);continue;}
    const current=await dependencyState(owner,item.entryRef);
    if(current?.lifecycle==='active')items.push({...item,source:sourceMetadata(current)});
   }
   return {...page,items};
  });
 }
}
