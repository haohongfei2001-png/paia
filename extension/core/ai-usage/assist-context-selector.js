import {CONTEXT_CARDS_ROW,CONTEXT_ITEM_CARDS,CONTEXT_LIMITS} from '../context-cards.js';
import {CONTEXT_READ_LIMITS} from '../context-read.js';
import {contextTemporalProjection,validContextTemporal} from '../context-temporal.js';
import {ContextTopicAccessService} from '../context-topic-access.js';
import {contextTopicOperationId} from '../context-topic-preferences.js';
import {captureContextEvidence,contextLineageAdmission,releaseContextLineage,validContextMaintenance,contextEvidenceKey,CONTEXT_LINEAGE_LIMITS} from '../context-item-lineage.js';
import {createContextScopeWorkBudget,contextScopeTransactionReader,CONTEXT_TOPIC_SCOPE_LIMITS} from '../context-topic-scope.js';
import {readAuthoredEntryContext,authoredSelectedFields,authoredSelectedText} from '../context-authored-entry.js';
import {readBoundEntryContext,boundSelectedText} from '../context-bound-entry.js';
import {readStructuralContextEvidence} from './structural-context-mapping.js';
import {inputProjection} from '../thought-evidence.js';
import {identityMetadata} from '../topic-identity.js';
import {canonicalChat} from '../validation.js';
import {MemoryService} from '../memory/service.js';
import {prefix,revisionOK} from '../thought-model.js';
import {KNOWN_PREFIX} from './delta.js';
import {ASSIST_LIMITS} from './assist-response.js';
import {matchAssistSectionLabels} from './assist-section-relevance.js';
import {canonical,equal,exact,opaque,fail} from './contracts.js';
import {snapshot as ownDataSnapshot} from './qwen-request-data.js';

// Local, source-owned relevance and qualification. Rules are behavioral Context;
// Info/Now use exact current-conversation Source metadata and one-hop original
// Topic bindings from those concrete matching evidence rows.
// This is deliberately not general semantic retrieval. In particular, a reply,
// callback ID, external-read switch or matching name cannot grant processing.
export const ASSIST_CONTEXT_LIMITS=Object.freeze({items:CONTEXT_READ_LIMITS.page,evidence:CONTEXT_LINEAGE_LIMITS.inputs,topics:CONTEXT_LINEAGE_LIMITS.topics,sources:CONTEXT_LINEAGE_LIMITS.sources});
const held=new WeakMap(),copy=x=>structuredClone(x),bytes=x=>new TextEncoder().encode(JSON.stringify(x)).byteLength;
const need=(x,code='STALE_BASE')=>{if(!x)fail(code);};
const own=(row,key)=>{const d=Object.getOwnPropertyDescriptor(row||{},key);need(d&&Object.hasOwn(d,'value'),'UNAVAILABLE');return d.value;};
const pick=(row,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(row||{},k)).map(k=>[k,copy(own(row,k))]));
const entryEvidence=e=>['humanEntry','boundEntry'].includes(e.kind),structure=e=>e.humanTopic||e.humanSection;
const array=(a,max)=>Array.isArray(a)&&a.length<=max&&Reflect.ownKeys(a).length===a.length+1&&Array.from({length:a.length},(_,i)=>Object.hasOwn(a,i)).every(Boolean);
const sort=rows=>rows.sort((a,b)=>a.id.localeCompare(b.id));
const entryKeys=['id','storageSchema','revision','contentRevision','lifecycle','freshness','staleReasons','type','formation','bodyBinding','workingInputId','bindingRevision','bindingLength','sourceRecordIds','inputRefs','provenanceType','integrity','origin','hasHumanAction','protections','authorship','fieldRevisions','organizationIntents','createdAt'];
const topicKeys=['id','revision','createdAt','organizationRevision','activeLayoutGeneration','lifecycle','redirectTo','layoutJobId','removalOperationId','defaultSectionId','protections'];
const sectionKeys=['id','topicId','sectionId','layoutGeneration','revision','rank','lifecycle','redirectTo','activeKey','protections','authorship'];
function metadata(item){
 const m=pick(item,['id','card','revision','order','origin','protected','userEdited','lifecycle','createdAt','updatedAt','deletedBy']);
 need(contextTopicOperationId(m.id)&&CONTEXT_ITEM_CARDS.includes(m.card)&&revisionOK(m.revision)&&m.revision>0&&['manual','automatic'].includes(m.origin)&&typeof m.protected==='boolean'&&typeof m.userEdited==='boolean');
 if(m.origin==='automatic'){const original=own(item,'maintenance');m.maintenance=pick(original,['version','associationIds','provenance','invalidation']);need(validContextMaintenance(m.maintenance));m.hasTemporal=Object.hasOwn(original,'temporal');}
 else need(m.protected&&m.userEdited);
 return m;
}
function state(handle){const h=held.get(handle);need(h&&!h.released,'UNAVAILABLE');return h;}
function alive(h){need(!h.released&&h.store.repository.db===h.database&&!h.signal?.aborted&&h.isCurrent()===true,'UNAVAILABLE');for(const [receipt,capability]of [[h.receipt,h.processing],[h.discoveryReceipt,h.discovery]])if(receipt){need(receipt.expiresAt>Date.now()&&!receipt.revocationSignal.aborted,'UNAVAILABLE');let value;try{value=capability.isCurrent(receipt,h.store);}catch{fail('UNAVAILABLE');}if(value!==true){Promise.resolve(value).catch(()=>{});fail('UNAVAILABLE');}}}
async function read(h,fn){alive(h);const result=await h.read(t=>fn(contextScopeTransactionReader(h.store,t,h.budget)));alive(h);return result;}
function itemScope(m){return {itemId:m.id,revision:m.revision,card:m.card,origin:m.origin,protected:m.protected,userEdited:m.userEdited,lifecycle:m.lifecycle,selectedFields:['body','section',...(m.hasTemporal?['temporal']:[])]};}
function evidenceSpec(e){if(entryEvidence(e))return copy(e);const {contentRevision,sourceRecordIds,sourceIdentityTokens,...spec}=e;return copy(spec);}
function scopeEvidence(items){const evidence=new Map();for(const m of items)for(const e of m.maintenance?.provenance.evidence||[]){const key=JSON.stringify([e.topicId,contextEvidenceKey(e)]),prior=evidence.get(key);const semantic=value=>{const {contentRevision,...rest}=value;return rest;};need(!prior||equal(semantic(prior),semantic(e)),'UNAVAILABLE');evidence.set(key,copy(e));}return [...evidence.values()];}
// The original eligibility owners inspect Input body/note and Entry body/title/
// note. Request those exact local qualification fields before calling them;
// this does not add semantic evidence to an Item or disclose them to Assist.
function inputScope(evidence){const inputs=new Map();for(const e of evidence)if(e.kind!=='humanEntry'){const fields=inputs.get(e.inputId)||new Set(['body','note']);for(const field of e.kind==='boundEntry'?['body']:e.selectedFields)fields.add(field);inputs.set(e.inputId,fields);}return [...inputs].map(([inputId,fields])=>({inputId,selectedFields:[...fields].sort()})).sort((a,b)=>a.inputId.localeCompare(b.inputId));}
async function restrictions(t){const rows=[];await t.scanPrimary('meta','memory:',r=>{if(['config','topic','section','entry','input'].includes(r.kind))rows.push(copy(r));});return rows;}

// This guard is entirely metadata-only. It proves the original full Topic
// eligibility reader cannot acquire a sibling Input or independent Entry outside
// the exact original evidence closure. Unsupported closures are no-send.
async function graph(h,t,evidence){
 if(!evidence.length)return {topics:[],sections:[],entries:[],placements:[],dependencies:[],provenance:[],registries:[],receipts:[],restrictions:[]};
 const inputs=inputScope(evidence),entrySpecs=evidence.filter(entryEvidence),topics=new Map(),sections=new Map(),entries=new Map(),placements=new Map(),dependencies=new Map(),provenance=new Map(),registries=new Map(),receipts=new Map();
 const topic=async(id,{negative=false}={})=>{if(topics.has(id))return topics.get(id);const raw=await t.get('topics',id);need(raw&&(negative||['active','dormant'].includes(raw.lifecycle)&&!raw.redirectTo&&!raw.layoutJobId&&!raw.identity?.noRecreation),'UNAVAILABLE');const value={...pick(raw,topicKeys),identity:identityMetadata(raw)};topics.set(id,value);need(topics.size<=ASSIST_CONTEXT_LIMITS.topics,'RESOURCE_LIMIT');for(const token of [raw.identity?.nameToken,...(raw.identity?.aliases||[]).map(x=>x.token)].filter(Boolean)){const row=await t.get('meta','personalTopicName:'+token);need(row,'UNAVAILABLE');registries.set(row.id,copy(row));}if(raw.protections?.organization){const row=await t.get('operationReceipts',raw.protections.organization.operationId);need(row,'UNAVAILABLE');receipts.set(row.id,copy(row));}return value;};
 for(const topicId of new Set(evidence.map(e=>e.topicId))){const target=await topic(topicId),binding=await new ContextTopicAccessService(h.store).prospective(t,await t.get('topics',topicId),h.admission.epoch);need(binding&&evidence.filter(e=>e.topicId===topicId).every(e=>equal(binding,e.expectedTopicBinding)),'UNAVAILABLE');
  const rows=await t.all('placements','byTopicEntry',prefix([topicId,target.activeLayoutGeneration]));
  for(const p of rows){placements.set(p.id,copy(p));if(p.lifecycle!=='active')continue;need(!p.excludedByUser,'UNAVAILABLE');const e=await t.get('thoughts',p.entryId);need(e&&e.lifecycle==='active','UNAVAILABLE');const m=pick(e,entryKeys);entries.set(e.id,m);need(entries.size<=ASSIST_CONTEXT_LIMITS.evidence,'RESOURCE_LIMIT');
   const deps=await t.all('dependencies','byTarget',prefix(['entry',e.id])),refs=new Set([...(m.inputRefs||[]).map(x=>x.inputBlockId),...deps.map(x=>x.inputId),...(m.bodyBinding==='input'?[m.workingInputId]:[])]);need([...refs].every(id=>inputs.some(i=>i.inputId===id)),'UNAVAILABLE');need(deps.every(d=>d.selectedFields?.every(f=>inputs.find(i=>i.inputId===d.inputId)?.selectedFields.includes(f))),'UNAVAILABLE');
   need(m.bodyBinding==='input'||entrySpecs.some(s=>s.entryId===e.id),'UNAVAILABLE');for(const d of deps)dependencies.set(d.id,copy(d));for(const r of await t.all('provenance','byOwner',prefix(['entry',e.id])))provenance.set(r.id,copy(r));
   for(const membership of await t.all('placements','byEntry',prefix([e.id]))){placements.set(membership.id,copy(membership));const owner=await topic(membership.topicId);if(membership.lifecycle==='active'&&membership.layoutGeneration===owner.activeLayoutGeneration){const s=await t.get('sections',JSON.stringify([owner.id,owner.activeLayoutGeneration,membership.sectionId]));need(s,'UNAVAILABLE');sections.set(s.id,pick(s,sectionKeys));}}
  }
  for(const s of await t.all('sections','byTopicOrder',prefix([topicId,target.activeLayoutGeneration])))sections.set(s.id,pick(s,sectionKeys));
 }
 const negatives=await restrictions(t);
 // Original negative Topic restrictions follow redirects. Freeze those exact
 // metadata ancestors too; a changed redirect cannot introduce an unseen veto.
 for(const r of negatives)if(r.kind==='section'||r.kind==='topic'&&['denied','never'].includes(r.decision)){
  const visited=new Set();let id=r.topicId;
  while(id){need(!visited.has(id)&&visited.size<32,'UNAVAILABLE');visited.add(id);const row=await topic(id,{negative:true});id=row.redirectTo||null;}
 }
 return {topics:sort([...topics.values()]),sections:sort([...sections.values()]),entries:sort([...entries.values()]),placements:sort([...placements.values()]),dependencies:sort([...dependencies.values()]),provenance:sort([...provenance.values()]),registries:sort([...registries.values()]),receipts:sort([...receipts.values()]),restrictions:negatives};
}

async function candidatesIn(t,{chatKey,narrow,epoch}){
 const row=await t.get('meta',CONTEXT_CARDS_ROW),rows=[],selected=new Set(),seen=new Set(),seeds=new Map();
 if(row){need(row.id===CONTEXT_CARDS_ROW&&row.version===1&&array(row.items,CONTEXT_LIMITS.items),'UNAVAILABLE');for(const item of row.items){const id=own(item,'id');need(!seen.has(id),'UNAVAILABLE');seen.add(id);if(own(item,'lifecycle')!=='active')continue;const m=metadata(item);if(narrow!==null&&!narrow.includes(m.id))continue;rows.push(m);
   let currentSource=false;
   // Only a concrete evidence row whose original Source belongs to this
   // current conversation can seed its exact original Topic binding. Rules
   // remain behavioral Context, but an unrelated Rules Topic is not a seed.
   if(m.origin==='automatic')for(const e of m.maintenance.provenance.evidence){let matches=false;for(const sourceId of e.sourceRecordIds||[]){const source=await t.get('recordIndex',sourceId);if(source?.chatKey===chatKey&&!source.hidden&&!source.deletedAt)matches=true;}if(matches){currentSource=true;const key=canonical(e.expectedTopicBinding);seeds.set(key,copy(e.expectedTopicBinding));}}
   if(m.card==='rules'||currentSource)selected.add(m.id);
  }}
 // Deliberately one hop. Other Topics in an expanded Item's full lineage are
 // required qualification facts, not permission to discover another Item.
 for(const m of rows)if(m.origin==='automatic'&&m.maintenance.provenance.evidence.some(e=>seeds.has(canonical(e.expectedTopicBinding))))selected.add(m.id);
 const candidates=rows.filter(m=>selected.has(m.id));need(candidates.length<=ASSIST_CONTEXT_LIMITS.items,'RESOURCE_LIMIT');for(const m of candidates)need(m.origin!=='automatic'||m.maintenance.provenance.epoch===epoch,'UNAVAILABLE');
 const discovery=rows.filter(m=>!selected.has(m.id)&&['info','now'].includes(m.card)&&(m.origin==='manual'||m.protected&&m.userEdited));need(discovery.length<=ASSIST_CONTEXT_LIMITS.items,'RESOURCE_LIMIT');
 return {items:candidates,seeds:[...seeds].sort(([a],[b])=>a.localeCompare(b)).map(([,binding])=>binding),discovery};
}
export async function selectAssistContext(store,t,{binding,replyBinding,replyText=null,narrow=null,isCurrent=()=>true,signal=null}={}){
 need(typeof isCurrent==='function'&&(signal===null||signal instanceof AbortSignal),'UNAVAILABLE');const chat=canonicalChat(replyBinding?.url);need(chat&&replyBinding.conversation===new URL(chat.url).pathname,'UNAVAILABLE');
 const controller=new AbortController(),stop=()=>controller.abort(),removeSignal=()=>signal?.removeEventListener('abort',stop);signal?.addEventListener('abort',stop,{once:true});if(signal?.aborted)controller.abort();
 let active=null;
 try{
 const budget=createContextScopeWorkBudget({database:store.repository.db,signal:controller.signal,isCurrent:()=>{try{if(active)alive(active);else need(isCurrent()===true&&!controller.signal.aborted);return true;}catch{controller.abort();return false;}}}),reader=contextScopeTransactionReader(store,t,budget),admission=await contextLineageAdmission(store,reader);need((await reader.get('meta','gate'))?.enabled===true,'UNAVAILABLE');
 if(narrow!==null)need(array(narrow,CONTEXT_LIMITS.items)&&new Set(narrow).size===narrow.length&&narrow.every(contextTopicOperationId),'UNAVAILABLE');
 if(replyText!==null){need(typeof replyText==='string'&&[...replyText].length<=ASSIST_LIMITS.replyCharacters&&new TextEncoder().encode(replyText).byteLength<=ASSIST_LIMITS.replyBytes,'UNAVAILABLE');replyText=normalized(replyText);budget.hashFields++;budget.hashBytes+=new TextEncoder().encode(replyText).byteLength;need(budget.hashBytes<=CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes,'RESOURCE_LIMIT');}
 const relevance={chatKey:'chatgpt:'+chat.id,narrow:copy(narrow),epoch:admission.epoch},selection=await candidatesIn(reader,relevance),candidates=selection.items;
 const evidence=scopeEvidence(candidates),inputs=inputScope(evidence),sources=[...new Set(evidence.flatMap(e=>e.sourceRecordIds||[]))].sort();need(evidence.length<=ASSIST_CONTEXT_LIMITS.evidence&&new Set(evidence.map(e=>e.topicId)).size<=ASSIST_CONTEXT_LIMITS.topics&&sources.length<=ASSIST_CONTEXT_LIMITS.sources,'RESOURCE_LIMIT');
 const handle=Object.freeze({}),h={store,database:store.repository.db,binding:copy(binding),replyBinding:copy(replyBinding),replyText,admission,budget,relevance,selection,selected:candidates,evidence,signal:controller.signal,controller,removeSignal,isCurrent,read:null,processing:null,receipt:null,discovery:null,discoveryReceipt:null,removeAbort:null,expiryTimer:null,removeDiscoveryAbort:null,discoveryExpiryTimer:null,onRevoke:null,captured:false,released:false,items:[],snapshots:null,lineages:[]};
 active=h;held.set(handle,h);try{await buildScope(h,reader,candidates);alive(h);return handle;
 }catch(error){releaseAssistContext(handle);throw error;}
 }catch(error){controller.abort();removeSignal();throw error;}
}
async function buildScope(h,t,candidates){
 const evidence=scopeEvidence(candidates),inputs=inputScope(evidence),sources=[...new Set(evidence.flatMap(e=>e.sourceRecordIds||[]))].sort();need(candidates.length<=ASSIST_CONTEXT_LIMITS.items&&evidence.length<=ASSIST_CONTEXT_LIMITS.evidence&&new Set(evidence.map(e=>e.topicId)).size<=ASSIST_CONTEXT_LIMITS.topics&&sources.length<=ASSIST_CONTEXT_LIMITS.sources,'RESOURCE_LIMIT');
 const closure=await graph(h,t,evidence),entries=closure.entries.map(e=>({entryId:e.id,revision:e.revision,selectedFields:entrySpecsFields(e,evidence)})),structures=[...new Map(evidence.filter(e=>structure(e)).map(e=>[JSON.stringify(structure(e)),copy(structure(e))])).values()];
 const scope={purpose:'assist-context-processing',version:1,binding:copy(h.binding),contextItems:candidates.map(itemScope),inputs,entries,structuralTopics:structures.filter(x=>x.kind==='topic'),structuralSections:structures.filter(x=>x.kind!=='topic'),sourceRecordIds:sources};need(bytes(scope)<=32768,'RESOURCE_LIMIT');h.selected=candidates;h.evidence=evidence;h.graph=closure;h.scope=scope;
}
function capability(value){if(value===null)return null;need(value&&[Object.prototype,null].includes(Object.getPrototypeOf(value)),'UNAVAILABLE');const ds=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(ds);need(keys.length===2&&['resolve','isCurrent'].every(k=>keys.includes(k)&&Object.hasOwn(ds[k],'value')&&typeof ds[k].value==='function'),'UNAVAILABLE');return Object.freeze({resolve:ds.resolve.value,isCurrent:ds.isCurrent.value});}
function trackReceipt(h,handle,receipt,{discovery=false}={}){const receiptKey=discovery?'discoveryReceipt':'receipt',removeKey=discovery?'removeDiscoveryAbort':'removeAbort',timerKey=discovery?'discoveryExpiryTimer':'expiryTimer';h[removeKey]?.();clearTimeout(h[timerKey]);h[receiptKey]=receipt;const abort=()=>{try{h.onRevoke?.();}finally{releaseAssistContext(handle);}};receipt.revocationSignal.addEventListener('abort',abort,{once:true});h[removeKey]=()=>receipt.revocationSignal.removeEventListener('abort',abort);const schedule=()=>{if(Date.now()>=receipt.expiresAt){abort();return;}h[timerKey]=setTimeout(schedule,Math.min(receipt.expiresAt-Date.now(),2147483647));h[timerKey]?.unref?.();};schedule();}
// Reply normalization is local to its original independently granted lease.
const normalized=s=>s.normalize('NFKC').replace(/\s+/gu,' ').trim().toLowerCase();
async function discover(h,t,handle,base){
 if(!base.discovery.length)return {items:base.items,seeds:base.seeds};need(h.discovery&&typeof h.replyText==='string'&&h.replyText.length<=CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes,'UNAVAILABLE');
 const scope={purpose:'assist-context-discovery',version:1,binding:copy(h.binding),contextItems:base.discovery.map(m=>({itemId:m.id,revision:m.revision,card:m.card,selectedFields:['section']}))};need(bytes(scope)+bytes(h.scope)<=32768,'RESOURCE_LIMIT');
 const receipt=grant(h,await h.discovery.resolve(t,copy(scope)),scope);alive(h);trackReceipt(h,handle,receipt,{discovery:true});alive(h);
 const row=await t.get('meta',CONTEXT_CARDS_ROW),labels=[];
 for(const m of base.discovery){alive(h);const item=row?.items.find(x=>x.id===m.id);need(item&&equal(metadata(item),m));need(h.budget.hashFields<CONTEXT_TOPIC_SCOPE_LIMITS.hashFields&&h.budget.hashBytes+320<=CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes,'RESOURCE_LIMIT');const label=own(item,'section');need(typeof label==='string'&&label.length<=80&&!label.includes('\u0000'),'UNAVAILABLE');h.budget.hashFields++;h.budget.hashBytes+=new TextEncoder().encode(label).byteLength;labels.push(label);alive(h);}
 // One bounded calculation over independently granted labels. Its output is
 // only an index; exact metadata/selected-body authority remains here.
 alive(h);const matching=matchAssistSectionLabels(h.replyText,labels);alive(h);
 const matches=matching.decisions.filter(x=>x.disposition==='MATCH').map(x=>base.discovery[x.index]);
 const items=[...base.items,...matches];need(items.length<=ASSIST_CONTEXT_LIMITS.items,'RESOURCE_LIMIT');return {items,seeds:base.seeds};
}
function entrySpecsFields(entry,evidence){return [...new Set(['body','title','note',...evidence.filter(e=>entryEvidence(e)&&e.entryId===entry.id).flatMap(e=>e.selectedFields)])].sort();}
export function assistContextScope(handle){return copy(state(handle).scope);}
function grant(h,raw,scope=h.scope){const keys=['version','store','scope','epoch','processing','expiresAt','revocationSignal'];exact(raw,keys);need([Object.prototype,null].includes(Object.getPrototypeOf(raw))&&Reflect.ownKeys(raw).length===keys.length&&Reflect.ownKeys(raw).every(k=>Object.hasOwn(Object.getOwnPropertyDescriptor(raw,k),'value'))&&raw.version===1&&raw.store===h.store&&opaque(raw.epoch)&&raw.processing===true&&Number.isSafeInteger(raw.expiresAt)&&raw.expiresAt>Date.now()&&raw.revocationSignal instanceof AbortSignal&&!raw.revocationSignal.aborted,'UNAVAILABLE');let actualScope;try{actualScope=ownDataSnapshot(raw.scope,{maxBytes:32768});}catch{fail('UNAVAILABLE');}need(equal(actualScope,scope),'UNAVAILABLE');return Object.freeze({...raw,scope:copy(scope)});}
async function authorize(h,t){alive(h);if(!h.selected.length)return;need(h.processing&&typeof h.processing.resolve==='function'&&typeof h.processing.isCurrent==='function','UNAVAILABLE');const current=grant(h,await h.processing.resolve(t,copy(h.scope)));if(h.receipt)need(current.epoch===h.receipt.epoch&&current.expiresAt===h.receipt.expiresAt&&current.revocationSignal===h.receipt.revocationSignal&&equal(current.scope,h.receipt.scope),'UNAVAILABLE');else h.receipt=current;alive(h);}
async function material(h,t){
 if(!h.evidence.length)return null;
 const inputs=[],sources=[],entries=[],structures=[],memory=new MemoryService(h.store),filter=await t.get('meta','smart-filter');let retained=0;const retain=value=>{retained+=bytes(value);need(retained<=CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes,'RESOURCE_LIMIT');return value;};
 for(const selected of h.scope.inputs){const raw=await t.get('blocks',selected.inputId);need(array(raw?.value?.provenance,ASSIST_CONTEXT_LIMITS.sources)&&raw.value.provenance.every(p=>h.scope.sourceRecordIds.includes(p.sourceRecordId)),'UNAVAILABLE');const p=await inputProjection(h.store,t,selected.inputId);need(p&&!await h.store.isFiltered(t,p.block,filter)&&await memory.safeSources(t,p.sourceRecordIds),'UNAVAILABLE');need(p.sourceRecordIds.every(id=>h.scope.sourceRecordIds.includes(id)),'UNAVAILABLE');inputs.push(retain({inputId:p.inputId,fields:Object.fromEntries(selected.selectedFields.map(f=>[f,p[f]])),lastRemovalSequence:p.lastRemovalSequence,sourceRecordIds:p.sourceRecordIds,identities:p.identities,state:await t.get('inputStates',p.inputId),index:await t.get('blockIndex',p.inputId)}));}
 for(const id of h.scope.sourceRecordIds){const index=await t.get('recordIndex',id),record=await t.get('records',id);need(index&&record,'UNAVAILABLE');sources.push(retain({id,index,record:pick(record.value,['id','platform','chatId','chatUrl','sourceKey','sourceMessageId','originalText','contentHash','dedupeKey','hidden','deletedAt']),sourceTombstone:await t.get('tombstones','source:'+index.sourceKey),snapshotTombstone:await t.get('tombstones','snapshot:'+index.dedupeKey)}));}
 for(const selected of h.scope.entries){const row=await t.get('thoughts',selected.entryId);need(row,'UNAVAILABLE');entries.push(retain({entryId:row.id,fields:Object.fromEntries(selected.selectedFields.map(f=>[f,f==='body'?row.thoughtText:f==='title'?row.title??'':row[f]]))}));}
 for(const spec of h.evidence.filter(entryEvidence)){const bound=spec.kind==='boundEntry',mapping=bound?await readBoundEntryContext(h.store,t,spec.entryId,null,spec.topicId):await readAuthoredEntryContext(h.store,t,spec.entryId);need(mapping,'UNAVAILABLE');const selected=bound?mapping.selectedFields:authoredSelectedFields(mapping);need(selected.every(f=>h.scope.entries.find(e=>e.entryId===spec.entryId)?.selectedFields.includes(f)),'UNAVAILABLE');const row=await t.get('thoughts',spec.entryId),fields=bound?boundSelectedText(row,mapping.selectedFields):authoredSelectedText(row,authoredSelectedFields(mapping));structures.push(retain({spec:copy(spec),mapping,fields}));}
 for(const spec of [...h.scope.structuralTopics,...h.scope.structuralSections]){const snapshot=await readStructuralContextEvidence(h.store,t,spec);need(snapshot,'UNAVAILABLE');structures.push(retain({spec:copy(spec),snapshot}));}
 return {inputs,sources,entries,structures,filter};
}
export async function captureAssistContext(store,handle,{read:reader,processing=null,discovery=null,onRevoke=null}={}){
 const h=state(handle);need(h.store===store&&!h.captured&&h.read===null&&typeof reader==='function'&&(onRevoke===null||typeof onRevoke==='function'),'UNAVAILABLE');h.read=reader;h.onRevoke=onRevoke;
 try{
 h.processing=capability(processing);h.discovery=capability(discovery);
 await read(h,async t=>{const now=await contextLineageAdmission(store,t,h.admission.epoch);need(now.gate===h.admission.gate&&(!h.selected.length&&!h.selection.discovery.length||now.authority===h.admission.authority));const base=await candidatesIn(t,h.relevance);need(equal(base,h.selection));need(equal(await graph(h,t,h.evidence),h.graph));const selected=await discover(h,t,handle,base);await buildScope(h,t,selected.items);h.selection=selected;await authorize(h,t);});
  if(h.receipt)trackReceipt(h,handle,h.receipt);
  h.snapshots=await read(h,t=>material(h,t));
  for(const m of h.selected.filter(x=>x.origin==='automatic')){const old=m.maintenance.provenance,proof=await captureContextEvidence(store,old.evidence.map(evidenceSpec),{epoch:h.admission.epoch,expectedAuthority:h.admission.authority,signal:h.signal,workBudget:h.budget});h.lineages.push(proof.captured);alive(h);need(proof.provenance.evidence.length===old.evidence.length&&old.evidence.every(e=>{const now=proof.provenance.evidence.find(x=>contextEvidenceKey(x)===contextEvidenceKey(e));if(!now)return false;const {contentRevision,...a}=e,{contentRevision:ignored,...b}=now;return equal(a,b);}),'UNAVAILABLE');}
  h.items=await read(h,async t=>{const row=await t.get('meta',CONTEXT_CARDS_ROW),out=[];for(const m of h.selected){const item=row?.items.find(x=>x.id===m.id);need(item&&equal(metadata(item),m));const body=own(item,'body'),section=own(item,'section');need(typeof body==='string'&&body.length<=CONTEXT_LIMITS.body&&typeof section==='string'&&section.length<=80,'UNAVAILABLE');const original={...copy(m),body,section};delete original.hasTemporal;if(m.hasTemporal){const temporal=own(item.maintenance,'temporal');need(validContextTemporal(temporal),'UNAVAILABLE');original.maintenance.temporal=copy(temporal);}const temporal=contextTemporalProjection(original);need(temporal?.temporalStatus!=='expired','UNAVAILABLE');const value={card:m.card,body,section,...temporal},key=JSON.stringify(['context_item',m.id]),known=await t.get('meta',KNOWN_PREFIX+key);need(m.origin==='automatic'&&!m.protected||known&&!known.descriptor.removed&&known.descriptor.revision===m.revision);out.push({original,temporal,context:JSON.stringify(value),item:known?{key,signature:known.signature,descriptor:copy(known.descriptor)}:null});}need(bytes(out.map(x=>x.context))<=ASSIST_LIMITS.contextBytes,'RESOURCE_LIMIT');return out;});
  h.captured=true;await read(h,t=>assertAssistContext(store,t,handle));return handle;
 }catch(error){releaseAssistContext(handle);throw error;}
}
export async function assertAssistContext(store,t,handle){const h=state(handle);need(h.store===store&&h.captured,'UNAVAILABLE');alive(h);const reader=contextScopeTransactionReader(store,t,h.budget);await authorize(h,reader);const now=await contextLineageAdmission(store,reader,h.admission.epoch);need(now.gate===h.admission.gate);need(equal(await discover(h,reader,handle,await candidatesIn(reader,h.relevance)),h.selection));const row=await reader.get('meta',CONTEXT_CARDS_ROW);for(const x of h.items){const item=row?.items.find(i=>i.id===x.original.id);need(item&&equal(item,x.original)&&equal(contextTemporalProjection(item),x.temporal));if(x.item){const known=await reader.get('meta',KNOWN_PREFIX+x.item.key);need(known&&equal({key:x.item.key,signature:known.signature,descriptor:known.descriptor},x.item));}}need(equal(await graph(h,reader,h.evidence),h.graph)&&equal(await material(h,reader),h.snapshots));alive(h);return true;}
export function assistContextCurrent(handle){try{alive(state(handle));return true;}catch{return false;}}
export function assistContextValue(handle){const h=state(handle);alive(h);need(h.captured,'UNAVAILABLE');return {items:h.items.filter(x=>x.item).map(x=>copy(x.item)),context:h.items.map(x=>x.context),dependencies:{items:h.items.map(x=>({itemId:x.original.id,revision:x.original.revision,card:x.original.card,origin:x.original.origin,protected:x.original.protected,temporal:x.temporal})),processing:h.receipt?{epoch:h.receipt.epoch}:null,evidence:copy(h.evidence)}};}
export function releaseAssistContext(handle){const h=held.get(handle);if(!h)return;h.released=true;h.controller.abort();h.removeSignal();h.removeAbort?.();h.removeDiscoveryAbort?.();clearTimeout(h.expiryTimer);clearTimeout(h.discoveryExpiryTimer);for(const capture of h.lineages)releaseContextLineage(capture);h.lineages.length=0;h.items.length=0;h.selected.length=0;h.snapshots=null;h.graph=null;h.scope=null;h.selection=null;h.evidence=null;h.receipt=null;h.discoveryReceipt=null;h.replyText=null;h.onRevoke=null;h.read=null;held.delete(handle);}
