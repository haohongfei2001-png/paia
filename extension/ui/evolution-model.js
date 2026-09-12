// Reading projection only: no persistence, invented dates, or user profiling.
export const EVOLUTION_ENTRY_LIMIT=80;
export function expressionTime(value){if(typeof value==='number')return Number.isFinite(value)?value:null;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(value))return null;const time=Date.parse(value);return Number.isFinite(time)?time:null;}
export function evolutionEntryIds(row){return [...new Set([...(row.possibleEvolution||[]).flatMap(x=>x.evidenceEntryIds||[]),...(row.evidenceEntryIds||[])].filter(x=>typeof x==='string'))].slice(0,EVOLUTION_ENTRY_LIMIT);}
export function usableEvolutionEntry(entry){return !!entry&&entry.lifecycle==='active'&&typeof entry.body==='string'&&!entry.staleReasons?.includes('source_purged')&&!entry.large;}
export function evolutionPlan(row,entries){
 const valid=new Map(entries.filter(usableEvolutionEntry).map(e=>[e.id,e])),used=new Set();
 const stages=(row.possibleEvolution||[]).map((item,index)=>{const items=(item.evidenceEntryIds||[]).filter(id=>valid.has(id)&&!used.has(id)).map(id=>{used.add(id);return valid.get(id);});return {key:'stage-'+index,index,text:item.text,items,dates:items.map(e=>expressionTime(e.sourceSentAt)).filter(n=>n!==null),inferred:true};});
 const remaining=[...valid.values()].filter(e=>!used.has(e.id));
 if(!stages.length){remaining.sort((a,b)=>(expressionTime(a.sourceSentAt)??Infinity)-(expressionTime(b.sourceSentAt)??Infinity)||a.id.localeCompare(b.id));for(const entry of remaining)stages.push({key:'expression-'+entry.id,index:-1,text:'',items:[entry],dates:expressionTime(entry.sourceSentAt)===null?[]:[expressionTime(entry.sourceSentAt)],inferred:false});return {stages,remaining:[],inferred:false};}
 return {stages,remaining,inferred:true};
}
export function evolutionDateLabel(dates,locale='zh-CN'){const finite=dates.filter(Number.isFinite);if(!finite.length)return '日期未确定';const low=Math.min(...finite),high=Math.max(...finite),format=n=>new Date(n).toLocaleDateString(locale,{year:'numeric',month:'short',day:'numeric'});return format(low)+(new Date(low).toDateString()!==new Date(high).toDateString()?' — '+format(high):'');}
