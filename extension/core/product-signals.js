import {ArchiveError} from './constants.js';
import {PassportService} from './passport.js';
import {createContextPackage,contextPackageEnvelope,contextPackageExpired} from './context-package.js';

// Local-only aggregate product signals for validating PAIA's repeat-use loops.
// This is derived diagnostic metadata, not user content and not a backup truth layer.

export const PRODUCT_SIGNAL_VERSION=1;
export const PRODUCT_SIGNAL_ROW='product-signals:v1';
export const PRODUCT_SIGNAL_RETENTION_DAYS=90;

const definitions=Object.freeze({
 input_search:Object.freeze({outcome:['hit','miss']}),
 input_target_open:Object.freeze({origin:['search','context','targeted'],age:['lt30','30_179','180_364','365_plus','unknown']}),
 reading_copy:Object.freeze({surface:['input','thought','ai_evolution','other'],origin:['reader','search']}),
 thought_search:Object.freeze({outcome:['hit','miss']}),
 thought_search_open:Object.freeze({}),
 thought_topic_open:Object.freeze({repeat:['first','repeat']}),
 thought_ai_view:Object.freeze({view:['ai','original']}),
 thought_ai_edit:Object.freeze({result:['saved']}),
 context_build:Object.freeze({outcome:['hit','empty'],profile:['default','custom'],budget:['short','standard','detailed']}),
 context_share:Object.freeze({format:['copy','markdown']})
});

const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const dayKey=value=>new Date(value).toISOString().slice(0,10);
const count=value=>Number.isSafeInteger(value)&&value>=0?value:0;
const ratio=(a,b)=>b?Math.round(a/b*1000)/1000:0;
const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};

export function validateProductSignal(signal){
 if(!plain(signal)||typeof signal.name!=='string'||!Object.hasOwn(definitions,signal.name))return null;
 const spec=definitions[signal.name],dimensions=signal.dimensions===undefined?{}:signal.dimensions;
 if(!plain(dimensions)||Object.keys(dimensions).length!==Object.keys(spec).length)return null;
 const clean={};
 for(const [key,allowed]of Object.entries(spec)){
  if(typeof dimensions[key]!=='string'||!allowed.includes(dimensions[key]))return null;
  clean[key]=dimensions[key];
 }
 if(Object.keys(signal).some(key=>!['name','dimensions'].includes(key)))return null;
 return {name:signal.name,dimensions:clean};
}

export function productSignalKey(signal){
 const clean=validateProductSignal(signal);if(!clean)return null;
 return [clean.name,...Object.entries(clean.dimensions).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v)].join('|');
}

export function contentAgeBucket(value,now=Date.now()){
 const at=typeof value==='number'?value:Date.parse(value||'');if(!Number.isFinite(at))return 'unknown';
 const days=Math.max(0,(now-at)/86400000);
 return days<30?'lt30':days<180?'30_179':days<365?'180_364':'365_plus';
}

export function emptyProductSignals(now=Date.now(),enabled=false){
 const at=new Date(now).toISOString();
 return {id:PRODUCT_SIGNAL_ROW,kind:'product_signals',version:PRODUCT_SIGNAL_VERSION,enabled:enabled===true,createdAt:at,updatedAt:at,daily:{}};
}
function pruneDaily(row,now=Date.now()){
 if(!plain(row.daily))row.daily={};const cutoff=dayKey(now-(PRODUCT_SIGNAL_RETENTION_DAYS-1)*86400000);let changed=false;
 for(const day of Object.keys(row.daily))if(day<cutoff){delete row.daily[day];changed=true;}return changed;
}

export function applyProductSignal(row,signal,now=Date.now()){
 const key=productSignalKey(signal);if(!key)invalid();
 const next=plain(row)&&row.id===PRODUCT_SIGNAL_ROW&&row.version===PRODUCT_SIGNAL_VERSION?structuredClone(row):emptyProductSignals(now,false);
 pruneDaily(next,now);const today=dayKey(now),bucket=plain(next.daily[today])?next.daily[today]:{};bucket[key]=count(bucket[key])+1;next.daily[today]=bucket;next.updatedAt=new Date(now).toISOString();return next;
}

function collapsed(row,days=null,now=Date.now()){
 const out={};if(!plain(row?.daily))return out;const cutoff=days===null?dayKey(now-(PRODUCT_SIGNAL_RETENTION_DAYS-1)*86400000):dayKey(now-(days-1)*86400000);
 for(const [day,bucket]of Object.entries(row.daily))if(day>=cutoff&&plain(bucket))for(const [key,value]of Object.entries(bucket))out[key]=count(out[key])+count(value);
 return out;
}
const get=(counts,name,dimensions={})=>count(counts[productSignalKey({name,dimensions})]);
const sum=(counts,name,prefix={})=>Object.entries(counts).filter(([key])=>key===name||key.startsWith(name+'|')).filter(([key])=>Object.entries(prefix).every(([k,v])=>key.includes('|'+k+'='+v))).reduce((n,[,v])=>n+count(v),0);

export function summarizeProductSignals(row,now=Date.now()){
 const all=collapsed(row,null,now),recent=collapsed(row,30,now),recentCutoff=dayKey(now-29*86400000),daily=plain(row?.daily)?Object.keys(row.daily).filter(day=>day>=recentCutoff).sort().map(day=>({day,total:Object.values(row.daily[day]||{}).reduce((n,v)=>n+count(v),0)})):[];
 const build=counts=>{
  const inputSearch=sum(counts,'input_search'),inputHits=get(counts,'input_search',{outcome:'hit'}),inputTarget=sum(counts,'input_target_open'),inputSearchOpen=sum(counts,'input_target_open',{origin:'search'}),inputOld180=sum(counts,'input_target_open',{age:'180_364'})+sum(counts,'input_target_open',{age:'365_plus'}),inputCopies=sum(counts,'reading_copy',{surface:'input'}),inputSearchCopies=sum(counts,'reading_copy',{surface:'input',origin:'search'});
  const thoughtSearch=sum(counts,'thought_search'),thoughtHits=get(counts,'thought_search',{outcome:'hit'}),thoughtSearchOpen=sum(counts,'thought_search_open'),topicOpen=sum(counts,'thought_topic_open'),topicRepeat=get(counts,'thought_topic_open',{repeat:'repeat'}),thoughtCopies=sum(counts,'reading_copy',{surface:'thought'})+sum(counts,'reading_copy',{surface:'ai_evolution'}),aiOpen=get(counts,'thought_ai_view',{view:'ai'}),aiOriginal=get(counts,'thought_ai_view',{view:'original'}),aiEdits=get(counts,'thought_ai_edit',{result:'saved'});
  const contextBuild=sum(counts,'context_build'),contextHit=sum(counts,'context_build',{outcome:'hit'}),contextCustom=sum(counts,'context_build',{profile:'custom'}),contextCopy=get(counts,'context_share',{format:'copy'}),contextMarkdown=get(counts,'context_share',{format:'markdown'}),contextShare=contextCopy+contextMarkdown;
  return {input:{searches:inputSearch,searchHits:inputHits,searchHitRate:ratio(inputHits,inputSearch),targetedOpens:inputTarget,searchOpens:inputSearchOpen,searchCopies:inputSearchCopies,copies:inputCopies,old180DayOpens:inputOld180,searchCopyPerOpen:ratio(inputSearchCopies,inputSearchOpen)},thought:{searches:thoughtSearch,searchHits:thoughtHits,searchHitRate:ratio(thoughtHits,thoughtSearch),searchOpens:thoughtSearchOpen,topicOpens:topicOpen,repeatTopicOpens:topicRepeat,repeatOpenShare:ratio(topicRepeat,topicOpen),copies:thoughtCopies,aiViewOpens:aiOpen,returnsToOriginal:aiOriginal,aiSavedEdits:aiEdits},context:{builds:contextBuild,nonEmptyBuilds:contextHit,buildHitRate:ratio(contextHit,contextBuild),customProfileBuilds:contextCustom,copies:contextCopy,markdownExports:contextMarkdown,shares:contextShare,sharePerBuild:ratio(contextShare,contextBuild)}};
 };
 const activeDays=daily.filter(x=>x.total>0).length;
 return {version:PRODUCT_SIGNAL_VERSION,enabled:row?.enabled===true,localOnly:true,containsContent:false,retentionDays:PRODUCT_SIGNAL_RETENTION_DAYS,createdAt:row?.createdAt||null,updatedAt:row?.updatedAt||null,all:build(all),last30Days:build(recent),activeDaysLast30:activeDays,daily};
}

export class ProductSignals {
 constructor(store,{clock=()=>Date.now(),uuid=()=>crypto.randomUUID()}={}){this.store=store;this.clock=clock;this.uuid=uuid;this.searchSeen=new Map();this.recentSearch=new Map();this.packages=new Map();this.passport=new PassportService(store,{clock,uuid});}
 client(sender){return String(sender?.documentId||sender?.url||'extension-ui').slice(0,300);}
 async row(write=false,fn){return this.store.run(()=>this.store.repository.transaction(write,fn,['meta']));}
 prunePackages(){for(const [id,pkg]of this.packages)if(contextPackageExpired(pkg,this.clock()))this.packages.delete(id);}
 package(previewId){this.prunePackages();const pkg=this.packages.get(previewId);if(!pkg)throw new ArchiveError('MEMORY_STALE');return pkg;}
 registerPackage(request,result){this.prunePackages();const budget=['short','standard','detailed'].includes(request.options?.budget)?request.options.budget:(result.budget||'standard'),pkg=createContextPackage({packageId:this.uuid(),previewId:result.previewId,profileId:request.options?.profileId||'default',consumer:'manual',purpose:'current_task',budget,generation:result.generation||0,itemCount:result.items?.length||0,characters:result.characters||0,tokens:result.tokens||0,retrievalConfidence:result.retrievalConfidence||'low',partial:result.partial===true,createdAt:this.clock()});this.packages.set(result.previewId,pkg);result.contextPackage=pkg;return pkg;}
 async status(){const summary=await this.row(true,async t=>{const current=await t.get('meta',PRODUCT_SIGNAL_ROW);if(!current)return summarizeProductSignals(emptyProductSignals(this.clock(),false),this.clock());const row=structuredClone(current);if(pruneDaily(row,this.clock())){row.updatedAt=new Date(this.clock()).toISOString();await t.put('meta',row);}return summarizeProductSignals(row,this.clock());});return {...summary,passport:await this.passport.status()};}
 async settings(settings={}){
  if(!plain(settings))invalid();
  if(Object.keys(settings).length===1&&typeof settings.enabled==='boolean')return this.row(true,async t=>{const current=await t.get('meta',PRODUCT_SIGNAL_ROW),row=plain(current)&&current.version===PRODUCT_SIGNAL_VERSION?current:emptyProductSignals(this.clock(),settings.enabled);pruneDaily(row,this.clock());row.enabled=settings.enabled;row.updatedAt=new Date(this.clock()).toISOString();await t.put('meta',row);return {enabled:settings.enabled};});
  if(Object.keys(settings).length===1&&plain(settings.passport)){
   const p=settings.passport,action=p.action;if(action==='create'&&Object.keys(p).every(k=>['action','consumer','purpose','profileId','duration'].includes(k)))return this.passport.create({consumer:p.consumer,purpose:p.purpose,profileId:p.profileId,duration:p.duration});
   if(action==='revoke'&&Object.keys(p).every(k=>['action','grantId'].includes(k)))return this.passport.revoke(p.grantId);
   if(action==='clear_audits'&&Object.keys(p).length===1)return this.passport.clearAudits();
  }
  invalid();
 }
 async clear(){return this.row(true,async t=>{const current=await t.get('meta',PRODUCT_SIGNAL_ROW),row=emptyProductSignals(this.clock(),current?.enabled===true);await t.put('meta',row);return {ok:true,enabled:row.enabled};});}
 async record(signal){const clean=validateProductSignal(signal);if(!clean)invalid();return this.row(true,async t=>{const current=await t.get('meta',PRODUCT_SIGNAL_ROW),row=plain(current)&&current.version===PRODUCT_SIGNAL_VERSION?current:emptyProductSignals(this.clock(),false);if(row.enabled!==true)return {recorded:false,enabled:false};await t.put('meta',applyProductSignal(row,clean,this.clock()));return {recorded:true,enabled:true};});}
 async noteSearch(surface,options,result,sender){
  if(!['input','thought'].includes(surface)||typeof options?.query!=='string'||!options.query.trim())return;
  const terminal=Array.isArray(result?.items)&&result.items.length>0||result?.nextCursor==null;if(!terminal)return;
  const now=this.clock(),client=this.client(sender),key=surface+'\u0000'+client,last=this.searchSeen.get(key)||0;if(now-last<60000)return;
  const outcome=result.items.length?'hit':'miss',saved=await this.record({name:surface+'_search',dimensions:{outcome}});if(!saved?.recorded)return;
  this.searchSeen.set(key,now);if(outcome==='hit')this.recentSearch.set(surface+'\u0000'+client,now);
 }
 consumeRecentSearch(surface,sender){const key=surface+'\u0000'+this.client(sender),at=this.recentSearch.get(key);if(!at||this.clock()-at>5*60*1000)return false;this.recentSearch.delete(key);return true;}
 async noteTopicRead(repeat,sender){
  const saved=await this.record({name:'thought_topic_open',dimensions:{repeat:repeat?'repeat':'first'}});if(saved?.recorded&&this.consumeRecentSearch('thought',sender))await this.record({name:'thought_search_open',dimensions:{}});
 }
 async observeMemoryBuild(request,result){
  this.registerPackage(request,result);const budget=['short','standard','detailed'].includes(request.options?.budget)?request.options.budget:'standard';await this.record({name:'context_build',dimensions:{outcome:result?.items?.length?'hit':'empty',profile:request.options?.profileId&&request.options.profileId!=='default'?'custom':'default',budget}});
 }
 async observeMemoryShare(request,result){
  const format=request.options?.format;if(!['copy','markdown'].includes(format))return;const current=this.package(request.options?.previewId),grantId=request.options?.grantId;let pkg=current;
  if(grantId!==undefined){
   if(typeof grantId!=='string'||!grantId)invalid();const status=await this.passport.status(),grant=status.grants.find(row=>row.grantId===grantId);if(!grant)throw new ArchiveError('MEMORY_DENIED');await this.passport.authorize({grantId,consumer:grant.consumer,purpose:grant.purpose,profileId:current.profileId});await this.passport.consume(grantId,format);pkg={...current,consumer:grant.consumer,purpose:grant.purpose};
  }else await this.passport.audit({consumer:'manual',purpose:'current_task',profileId:current.profileId,action:format==='copy'?'manual_copy':'manual_markdown'});
  pkg={...pkg,generation:result.generation||pkg.generation,characters:result.characters||pkg.characters,tokens:result.tokens||pkg.tokens};this.packages.set(pkg.previewId,pkg);result.contextPackage=contextPackageEnvelope(pkg,result.text,{format:format==='markdown'?'markdown':'plain',generation:pkg.generation}).package;await this.record({name:'context_share',dimensions:{format}});
 }
 async observe(request,result,sender){
  switch(request?.type){
   case 'SEARCH_INPUTS': return this.noteSearch('input',request.options,result,sender);
   case 'SEARCH_LIBRARY': return this.noteSearch('thought',request.options,result,sender);
   case 'GET_PAGE': {
    const id=request.page?.contextInputId;if(request.page?.view!=='library'||typeof id!=='string'||!result?.pageItemIds?.includes(id))return;
    const block=result.library?.blocks?.find(row=>row.id===id),origin=this.consumeRecentSearch('input',sender)?'search':'targeted';
    return this.record({name:'input_target_open',dimensions:{origin,age:contentAgeBucket(block?.sourceSentAt,this.clock())}});
   }
   case 'SET_ORGANIZER_CONTROLS': {
    const view=request.changes?.libraryView;if(!['ai','original'].includes(view))return;
    return this.record({name:'thought_ai_view',dimensions:{view}});
   }
   case 'EDIT_AI_PRESENTATION': return this.record({name:'thought_ai_edit',dimensions:{result:'saved'}});
   case 'PAIA_MEMORY_BUILD': return this.observeMemoryBuild(request,result);
   case 'PAIA_MEMORY_SHARE': return this.observeMemoryShare(request,result);
  }
 }
}
