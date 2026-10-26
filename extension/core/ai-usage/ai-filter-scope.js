import {ArchiveError} from '../constants.js';
import {FILTER_VERSIONS,normalizePresence,validFilterDecision} from '../smart-filter.js';
const fail=(code='UNAVAILABLE')=>{throw new ArchiveError(code);};
const id=x=>typeof x==='string'&&x.length>0&&x.length<=200;
const exact=(x,keys)=>!!x&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>Object.hasOwn(Object.getOwnPropertyDescriptor(x,k)||{},'value'));
function ids(value,max){if(!Array.isArray(value)||!value.length||value.length>max||Reflect.ownKeys(value).length!==value.length+1)fail('INVALID_REQUEST');const result=[];for(let i=0;i<value.length;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d||!Object.hasOwn(d,'value')||!id(d.value))fail('INVALID_REQUEST');result.push(d.value);}if(new Set(result).size!==result.length)fail('INVALID_REQUEST');return result.sort();}
const absent=p=>p?.version===1&&p.attachment==='absent'&&p.reference==='absent'&&p.confidence==='verified';
// Metadata selection only, inside the exact already-granted physical child.
// It creates no body read, authority, filter decision, ACK or provider request.
// All candidates must fit; truncation cannot pretend the omitted units finished.
export function createAIFilterScopeSelector(store,{isCurrent=()=>false}={}){
 let disposed=false;
 const check=()=>{let current=false;try{current=!disposed&&isCurrent()===true;}catch{}if(!current)fail();};
 return Object.freeze({async selectScope(request){
  if(!exact(request,['candidateIds','inputIds']))fail('INVALID_REQUEST');const candidateIds=ids(request.candidateIds,8),inputIds=ids(request.inputIds,20);if(candidateIds.some(id=>!inputIds.includes(id)))fail('INVALID_REQUEST');check();
  if(!store?.repository?.db)fail();
  const result=await store.repository.transaction(false,async t=>{
   const get=async(...args)=>{check();const value=await t.get(...args);check();return value;},filter=await get('meta','smart-filter');if(filter?.phase!=='active'||filter.mode!=='light'||!Object.entries(FILTER_VERSIONS).every(([k,v])=>filter[k]===v))fail();
   const metadata=new Map();for(const inputId of inputIds){const state=await get('inputStates',inputId),row=await get('filterInputs',inputId),index=await get('blockIndex',inputId);
    if(!state||state.removalState!=='active'||state.sourcePurged||!row||row.id!==inputId||!index||index.excluded||!Array.isArray(index.listKey)||index.listKey.length>12||index.listKey[0]!==index.documentId||index.listKey[1]!==0||JSON.stringify(index.listKey).length>4096||!absent(normalizePresence(row.presence))||row.presenceInvalid||!Object.entries(FILTER_VERSIONS).every(([k,v])=>row[k]===v)||row.basedOnContentRevision!==state.contentRevision||validFilterDecision(row,state)||row.aiDecision)continue;
    if(candidateIds.includes(inputId)&&(row.authorship!=='untouched'||row.userEdited!==false||row.filterOverride!=='none'||row.decision!=='uncertain'||row.failed||!['context_insufficient','rule_no_match'].includes(row.reasonCode)))continue;
    metadata.set(inputId,{inputId,documentId:index.documentId,position:index.listKey});
   }
   if(candidateIds.some(id=>!metadata.has(id)))fail();const choices=[];
   for(const inputId of inputIds.filter(id=>!candidateIds.includes(id))){const neighbor=metadata.get(inputId);if(!neighbor)continue;const covers=[];
    for(const candidateId of candidateIds){const candidate=metadata.get(candidateId);if(candidate.documentId!==neighbor.documentId)continue;check();const cmp=store.repository.factory.cmp(candidate.position,neighbor.position),count=await t.count('blockIndex','byList',IDBKeyRange.bound(cmp<0?candidate.position:neighbor.position,cmp<0?neighbor.position:candidate.position));check();if(count>=2&&count<=3)covers.push(candidateId);}
    if(covers.length)choices.push({inputId,covers});
   }
   let selected=null;for(let i=0;i<choices.length&&!selected;i++){if(choices[i].covers.length===candidateIds.length)selected=[choices[i].inputId];else for(let j=i+1;j<choices.length;j++)if(new Set([...choices[i].covers,...choices[j].covers]).size===candidateIds.length){selected=[choices[i].inputId,choices[j].inputId];break;}}
   if(!selected)fail();check();return {candidateIds,neighborIds:selected.sort()};
  },['meta','inputStates','filterInputs','blockIndex']);check();return Object.freeze({candidateIds:Object.freeze(result.candidateIds),neighborIds:Object.freeze(result.neighborIds)});
 },dispose(){disposed=true;}});
}
