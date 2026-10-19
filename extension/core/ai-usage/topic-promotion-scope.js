import {equal,fail} from './contracts.js';
import {prefix} from '../thought-model.js';

// Work bounds only. An oversized/incomplete whole Section is deferred, never
// silently reduced to the prefix that happened to fit a Maintenance child.
export const SECTION_PROMOTION_SCOPE_LIMITS=Object.freeze({topics:8,inputs:20,entries:16,placementsPerEntry:8,candidates:1,reads:160});
const captures=new WeakMap(),id=s=>typeof s==='string'&&s.length>0&&s.length<=200;
const unique=xs=>Array.isArray(xs)&&new Set(xs).size===xs.length&&xs.every(id);
const project=(row,keys)=>row&&Object.fromEntries(keys.filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));
const topicFields=['id','revision','organizationRevision','lifecycle','redirectTo','activeLayoutGeneration','layoutJobId'];
const sectionFields=['id','topicId','sectionId','revision','layoutGeneration','lifecycle','redirectTo','isDefault'];
const entryFields=['id','revision','contentRevision','organizationRevision','dependencyRevision','lifecycle','origin','bodyBinding','workingInputId'];
const placementFields=['id','topicId','layoutGeneration','entryId','sectionId','revision','rank','sectionRank','lifecycle','membershipAuthorship','sectionProtection','orderProtection','membershipOperationId','excludedByUser'];
const dependencyFields=['id','inputId','targetKind','targetId','status','basedOnContentRevision','selectedFields','fieldDigests','roles'];
const freeze=x=>{if(x&&typeof x==='object'){for(const y of Object.values(x))freeze(y);Object.freeze(x);}return x;};
function checked(request){
 if(!request||Object.keys(request).length!==3||!unique(request.topicIds)||request.topicIds.length>8||!unique(request.entryIds)||request.entryIds.length>16||!Array.isArray(request.inputs)||request.inputs.length>20)fail('UNAVAILABLE');
 const inputs=request.inputs;if(new Set(inputs.map(i=>i?.inputId)).size!==inputs.length||inputs.some(i=>!i||Object.keys(i).length!==2||!id(i.inputId)||!Array.isArray(i.selectedFields)||!i.selectedFields.length||new Set(i.selectedFields).size!==i.selectedFields.length||i.selectedFields.some(f=>!['body','note'].includes(f))))fail('UNAVAILABLE');
 return {topicIds:[...request.topicIds].sort(),entryIds:[...request.entryIds].sort(),inputs:inputs.map(i=>({inputId:i.inputId,selectedFields:[...i.selectedFields].sort()})).sort((a,b)=>a.inputId.localeCompare(b.inputId))};
}
async function capture(t,request){
 let reads=0;const charge=()=>{if(++reads>160)fail('BUDGET_EXCEEDED');},get=async(...args)=>{charge();return t.get(...args);},all=async(...args)=>{charge();return t.all(...args);},count=async(...args)=>{charge();return t.count(...args);};
 const topics=new Map();for(const id of request.topicIds){const row=project(await get('topics',id),topicFields);if(row?.lifecycle==='active'&&!row.redirectTo&&!row.layoutJobId)topics.set(id,row);}
 const groups=new Map(),omitted=[];
 for(const entryId of request.entryIds){
  const rows=await all('placements','byEntry',prefix([entryId]),9);if(rows.length>8){omitted.push({entryId,reason:'PLACEMENT_SCOPE_OVER_BUDGET'});continue;}
  for(const p of rows){const topic=topics.get(p.topicId);if(!topic||p.lifecycle!=='active'||p.layoutGeneration!==topic.activeLayoutGeneration||p.excludedByUser)continue;
   const key=JSON.stringify([p.topicId,p.layoutGeneration,p.sectionId]);if(!groups.has(key))groups.set(key,{topic,sectionId:p.sectionId});
  }
 }
 const inputs=new Map(request.inputs.map(i=>[i.inputId,i])),selected=new Set(request.entryIds),candidates=[];
 for(const [sectionRowId,g]of [...groups].sort(([a],[b])=>a.localeCompare(b))){
  const reject=reason=>omitted.push({topicId:g.topic.id,sectionId:g.sectionId,reason});
  if(candidates.length>=1){reject('CANDIDATE_SCOPE_OVER_BUDGET');continue;}
  const section=project(await get('sections',sectionRowId),sectionFields);if(!section||section.lifecycle!=='active'||section.redirectTo||section.isDefault){reject('SECTION_UNAVAILABLE');continue;}
  const range=prefix([g.topic.id,g.topic.activeLayoutGeneration,g.sectionId,0]),total=await count('placements','bySectionOrder',range);
  if(total<1||total>16){reject(total?'WHOLE_SECTION_OVER_BUDGET':'EMPTY_SECTION');continue;}
  const rows=await all('placements','bySectionOrder',range,17);
  if(rows.length!==total||rows.some(p=>!selected.has(p.entryId)||p.lifecycle!=='active'||p.excludedByUser)){reject('WHOLE_SECTION_NOT_SELECTED');continue;}
  const entries=[],dependencies=[],placements=rows.map(p=>project(p,placementFields));let reason=null;
  for(const p of placements){
   const entry=project(await get('thoughts',p.entryId),entryFields);if(!entry||entry.lifecycle!=='active'){reason='ENTRY_UNAVAILABLE';break;}
   const deps=await all('dependencies','byTarget',prefix(['entry',p.entryId]),21);
   if(!deps.length||deps.length>20){reason='ENTRY_EVIDENCE_UNSUPPORTED';break;}
   if(deps.some(d=>d.status!=='valid'||d.targetKind!=='entry'||d.targetId!==p.entryId||!Array.isArray(d.selectedFields)||!d.selectedFields.length||d.selectedFields.some(f=>!inputs.get(d.inputId)?.selectedFields.includes(f)))){reason='ENTRY_INPUT_OUTSIDE_SCOPE';break;}
   entries.push(entry);dependencies.push(...deps.map(d=>project(d,dependencyFields)));
  }
  if(reason){reject(reason);continue;}
  const inputIds=[...new Set(dependencies.map(d=>d.inputId))].sort();
  candidates.push({version:1,selection:'whole_section',topic:g.topic,section,placements,entries,dependencies,inputs:inputIds.map(id=>inputs.get(id)),entryIds:placements.map(p=>p.entryId),count:total});
 }
 return freeze({version:1,coverage:'selected_processing_scope',candidates,omitted});
}
// Caller supplies only already-selected metadata identifiers. No model target,
// label, Input text, Source text, title or note is read by this pre-grant owner.
export async function selectSectionPromotionScope(store,t,request){
 const input=checked(request),data=await capture(t,input),handle=Object.freeze(Object.create(null));captures.set(handle,{store,input,data});return handle;
}
export function sectionPromotionScopeData(handle,store){const state=captures.get(handle);return state?.store===store?state.data:null;}
export async function assertSectionPromotionScope(store,t,handle){const state=captures.get(handle);if(!state||state.store!==store||!equal(state.data,await capture(t,state.input)))fail('STALE_BASE');return true;}
export function releaseSectionPromotionScope(handle){captures.delete(handle);}
