import {CONTEXT_TOPIC_SCOPE_LIMITS} from './context-topic-scope.js';
import {captureTopicFormationMembers} from './topic-formation-terminal.js';
import {idOK,revisionOK} from './thought-model.js';
import {equal,fail} from './ai-usage/contracts.js';

// Positive, closed metadata schemas. This module grants nothing and never
// examines a semantic data value, even to compare an exact-index candidate.
const need=(x,code='UNAVAILABLE')=>{if(!x)fail(code);};
const own=(row,key)=>{const d=Object.getOwnPropertyDescriptor(row||{},key);need(!d||Object.hasOwn(d,'value'));return d?.value;};
const scalar=x=>{need(x===null||x===undefined||['string','boolean'].includes(typeof x)||typeof x==='number'&&Number.isFinite(x));return x;};
const array=(x,project=scalar)=>{need(Array.isArray(x));const n=own(x,'length');need(Number.isSafeInteger(n)&&n<=CONTEXT_TOPIC_SCOPE_LIMITS.refs,'BUDGET_EXCEEDED');need(Reflect.ownKeys(x).length===n+1);return Array.from({length:n},(_,i)=>project(own(x,String(i))));};
const fields=['body','title','note','type','formation'],organization=['topics','section','order'];
const object=(row,keys,project=scalar)=>{if(row===null||row===undefined)return row;need(typeof row==='object'&&!Array.isArray(row));const actual=Reflect.ownKeys(row);need(actual.every(k=>typeof k==='string'&&keys.includes(k)));return Object.fromEntries(actual.map(k=>[k,project(own(row,k),k)]));};
const entryKeys=['id','storageSchema','family','type','formation','origin','revision','contentRevision','fieldRevisions','organizationRevision','dependencyRevision','createdAt','updatedAt','updatedSequence','createdSequence','hasHumanAction','userEdited','protections','authorship','organizationIntents','lifecycle','freshness','integrity','staleReasons','sourceRecordIds','inputRefs','exactSignature','exactKey','topics','types','bodyBinding','provenanceType','workingInputId','bindingRevision','bindingLength','thoughtEditedAt','meaningfulContentAt','lifecycleKey','activeKey','listKey','negativeUpdatedSequence','searchVersion','indexedSearchVersion','searchSafetyVersion'];
const textKeys=['thoughtText','title','note'];
function metadata(value,key){
 if(['sourceRecordIds','staleReasons','topics','types','listKey','included','excluded','topicIds'].includes(key))return array(value);
 if(key==='inputRefs')return array(value,x=>object(x,['inputBlockId','basedOnContentRevision']));
 if(key==='fieldRevisions')return object(value,fields);
 if(key==='authorship')return object(value,[...fields,...organization],x=>object(x,['actor','everHumanConfirmed','operationId','at']));
 if(key==='protections')return object(value,[...fields,...organization],x=>object(x,['locked','reason','operationId','at']));
 if(key==='organizationIntents')return object(value,['version','included','excluded','edges','fixed','legacyProtected'],(x,k)=>{
  if(k==='fixed')return object(x,['topicIds','actor','operationId','revision','at'],metadata);
  if(k==='edges'){need(x&&typeof x==='object'&&!Array.isArray(x));const keys=Reflect.ownKeys(x);need(keys.length<=1000&&keys.every(idOK));return object(x,keys,v=>object(v,['actor','include','operationId','at','reason','revision']));}
  return metadata(x,k);
 });return scalar(value);
}
export function topicExactReuseEntryMetadata(row){
 need(row&&typeof row==='object'&&!Array.isArray(row));const keys=Reflect.ownKeys(row);need(keys.every(k=>typeof k==='string'&&[...entryKeys,...textKeys].includes(k)));
 // Checking the descriptor kind does not acquire a body/title/note value.
 for(const key of textKeys){const d=Object.getOwnPropertyDescriptor(row,key);need(!d||Object.hasOwn(d,'value'));}
 return Object.fromEntries(keys.filter(k=>entryKeys.includes(k)).map(k=>[k,metadata(own(row,k),k)]));
}
const inputState=row=>object(row&&Object.fromEntries(['id','contentRevision','lastRemovalSequence','sourceRecordIds','removalState','sourcePurged'].filter(k=>Object.hasOwn(row,k)).map(k=>[k,own(row,k)])),['id','contentRevision','lastRemovalSequence','sourceRecordIds','removalState','sourcePurged'],(v,k)=>k==='sourceRecordIds'?array(v):scalar(v));
const sort=xs=>[...xs].sort((a,b)=>a.id.localeCompare(b.id));
export async function captureTopicExactReuseMetadata(t,{matches,sentInputIds,maxInputs=20,charge=null}){
 need(Array.isArray(matches)&&matches.length>0&&matches.length<=20&&Array.isArray(sentInputIds)&&sentInputIds.every(idOK)&&new Set(sentInputIds).size===sentInputIds.length);
 need(Number.isSafeInteger(maxInputs)&&maxInputs>0&&maxInputs<=20);const ids=new Set(),entries=[],inputIds=new Set();
 for(const match of matches){need(match&&idOK(match.entryId)&&typeof match.exactKey==='string'&&!ids.has(match.entryId));ids.add(match.entryId);const row=await t.get('thoughts',match.entryId),entry=topicExactReuseEntryMetadata(row);
  need(entry.id===match.entryId&&entry.exactKey===match.exactKey&&entry.storageSchema===2&&entry.lifecycle==='active'&&entry.provenanceType==='input_original'&&['input','thought'].includes(entry.bodyBinding)&&entry.freshness==='current'&&entry.integrity==='complete'&&revisionOK(entry.revision)&&revisionOK(entry.contentRevision),'STALE_BASE');entries.push(entry);
 }
 const members=await captureTopicFormationMembers(t,[...ids],{charge});
 for(const entry of entries){const collections=members.find(x=>x.entryId===entry.id).collections,deps=collections.find(x=>x.table==='dependencies').rows,refs=collections.find(x=>x.table==='provenance').rows;
  need(deps.length>0&&deps.length<=20&&refs.length>0);const dependencyIds=new Set();
  for(const d of deps){need(idOK(d.inputId)&&!dependencyIds.has(d.inputId)&&d.status==='valid'&&equal(d.selectedFields,['body'])&&d.roles?.length&&d.roles.every(r=>['primary','supporting'].includes(r)));dependencyIds.add(d.inputId);inputIds.add(d.inputId);}
  need((entry.inputRefs||[]).every(x=>dependencyIds.has(x.inputBlockId))&&(!entry.workingInputId||dependencyIds.has(entry.workingInputId)));
  for(const p of refs)need(dependencyIds.has(p.inputId)&&['primary','supporting'].includes(p.role)&&p.contributionType==='exact_excerpt'&&p.span?.field==='body'&&p.span.start===0&&Number.isSafeInteger(p.span.end)&&p.span.end>0&&p.span.full!==false&&equal(p.actualVersion?.selectedFields,['body']));
 }
 need(new Set([...sentInputIds,...inputIds]).size<=maxInputs,'BUDGET_EXCEEDED');const inputs=[];
 for(const id of [...inputIds].sort()){const m=inputState(await t.get('inputStates',id));need(m&&m.id===id&&revisionOK(m.contentRevision)&&m.removalState==='active'&&!m.sourcePurged&&m.sourceRecordIds?.length&&m.sourceRecordIds.every(idOK),'STALE_BASE');inputs.push(m);}
 const sources=[...new Set(inputs.flatMap(x=>x.sourceRecordIds))].sort();need(sources.length<=128,'BUDGET_EXCEEDED');
 for(const entry of entries){const {collections}=members.find(x=>x.entryId===entry.id);for(const d of collections.find(x=>x.table==='dependencies').rows){const input=inputs.find(x=>x.id===d.inputId);need(d.basedOnContentRevision===input.contentRevision&&d.validatedAgainstContentRevision===input.contentRevision&&equal([...d.sourceRecordIds].sort(),[...input.sourceRecordIds].sort()),'STALE_BASE');}need((entry.sourceRecordIds||[]).every(id=>sources.includes(id)));for(const p of collections.find(x=>x.table==='provenance').rows)need((p.sourceRecordIds||[]).every(id=>sources.includes(id)));}
 const out={entries:sort(entries),members,inputs,sources};const encoded=JSON.stringify(out);need(new TextEncoder().encode(encoded).length<=32768,'BUDGET_EXCEEDED');if(charge)charge(encoded);return out;
}
