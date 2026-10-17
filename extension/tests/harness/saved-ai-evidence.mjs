// Synthetic-test-only observation. Ordinary RPC payloads/ACKs are forwarded
// unchanged; evidence contains field identities, revisions and text hashes only.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {failWithBoundedEvidence} from './uir03-worker-fixture.mjs';
export function installSavedAIDiagnostic({holdRecovery=false}={}){
 const trace=globalThis.__savedAITrace={events:[],sequence:0,held:false},pending=new Set(),original=chrome.runtime.sendMessage.bind(chrome.runtime),fields=new Set(['blockSummary','currentView','keyInformation','preferences','decisions','judgments','openQuestions','possibleEvolution']);
 const record=item=>{trace.events.push({sequence:++trace.sequence,...item});if(trace.events.length>240)trace.events.shift();};
 const text=value=>{const body=String(value??''),result={codeUnits:body.length,lineFeeds:(body.match(/\n/g)||[]).length};const work=crypto.subtle.digest('SHA-256',new TextEncoder().encode(body)).then(hash=>{result.sha256=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');}).catch(()=>{result.hashUnavailable=true;}).finally(()=>pending.delete(work));pending.add(work);return result;};
 trace.describe=value=>({list:Array.isArray(value),items:(Array.isArray(value)?value.map(x=>x.text):[value]).map(text)});
 trace.mark=(label,revision)=>record({event:'checkpoint',label,revision});
 let release;const held=new Promise(resolve=>release=resolve);trace.release=()=>{holdRecovery=false;trace.held=false;release();};
 chrome.runtime.sendMessage=function(message,...args){
  const edit=message?.type==='EDIT_AI_PRESENTATION'?message.edit:null,operation=message?.type==='PAIA_RECOVERY_DRAFT_SAVE'?message.draft?.operation:null;
  const observed=!!edit||operation?.type==='AI_RECOVERY_SNAPSHOT',id=observed?++trace.sequence:null;
  if(edit)record({event:'edit-request',id,field:fields.has(edit.field)?edit.field:'other',operationId:edit.operationId,expectedRevision:edit.expectedRevision,value:trace.describe(edit.value)});
  if(operation?.type==='AI_RECOVERY_SNAPSHOT')record({event:'recovery-request',id,baseRevision:operation.baseRevision,fields:Object.fromEntries(Object.entries(operation.values||{}).filter(([key])=>fields.has(key)).map(([key,value])=>[key,trace.describe(value)]))});
  const send=()=>original(message,...args);
  let result;if(holdRecovery&&operation?.type==='AI_RECOVERY_SNAPSHOT'){holdRecovery=false;trace.held=true;result=held.then(send);}else result=send();
  if(!observed||!result||typeof result.then!=='function')return result;
  return result.then(reply=>{record({event:edit?'edit-ack':'recovery-ack',id,ok:reply?.ok===true,error:/^[A-Z][A-Z0-9_]{0,63}$/.test(reply?.error)?reply.error:undefined,revision:reply?.data?.revision});return reply;},error=>{record({event:'transport-error',id});throw error;});
 };
 const changed=message=>{if(message?.type==='ARCHIVE_CHANGED')record({event:'archive-changed',cause:message.cause==='EDIT_AI_PRESENTATION'?'EDIT_AI_PRESENTATION':'other'});};chrome.runtime.onMessage.addListener(changed);
 const event=e=>{const node=e.target?.closest?.('[data-ai-field]');if(node&&fields.has(node.dataset.aiField))record({event:e.type,field:node.dataset.aiField,connected:node.isConnected,hidden:!!node.closest('[hidden],details:not([open])'),children:[...node.children].map(n=>n.tagName).slice(0,12),textContent:text(node.textContent),innerText:text(node.innerText)});};
 for(const name of ['input','blur','compositionstart','compositionend'])document.addEventListener(name,event,true);
 trace.read=async()=>{const events=trace.events.slice(),held=trace.held;await Promise.all([...pending]);return {events:structuredClone(events),held};};
 trace.restore=()=>{trace.release();chrome.runtime.sendMessage=original;chrome.runtime.onMessage.removeListener(changed);for(const name of ['input','blur','compositionstart','compositionend'])document.removeEventListener(name,event,true);};
}
export async function savedAIEvidence({p,topic},variant){
 return p.evaluate(async({topicId,variant})=>{
  const trace=globalThis.__savedAITrace,{OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local);await s.finishFoundation();
  try{
   const data=await s.repository.transaction(false,async t=>({row:await t.get('meta','aiPresentation:'+topicId),journal:(await t.all('revisions')).filter(row=>row.kind==='ai_presentation'&&row.entityId===topicId)}),['meta','revisions']);
   const keys=['blockSummary','currentView','keyInformation','preferences','decisions','judgments','openQuestions','possibleEvolution'];
   const journal=data.journal.map(row=>({operationId:row.operationId,actor:row.actor,baseRevision:row.baseRevision,revision:row.afterRevision,changes:Object.fromEntries(keys.filter(key=>JSON.stringify(row.before?.[key])!==JSON.stringify(row.after?.[key])).map(key=>[key,{before:trace.describe(row.before?.[key]),after:trace.describe(row.after?.[key])}]))}));
   const row={revision:data.row?.revision,protections:data.row?.protections,fields:Object.fromEntries(keys.map(key=>[key,trace.describe(data.row?.[key])]))};
   return {variant,row,journal,...await trace.read()};
  }finally{await s.repository.close();}
 },{topicId:topic.id,variant});
}
export async function persistSavedAIEvidence(value,name='saved-ai-journey'){
 const dir=process.env.PAIA_CONSUMER_EVIDENCE_DIR||'work/consumer-cleanup';await mkdir(dir,{recursive:true});await writeFile(resolve(dir,value.variant+'-'+name+'.json'),JSON.stringify(value,null,2));
}
export async function failSavedAI(error,f,variant){
 return failWithBoundedEvidence(error,{fallback:{variant,diagnosticUnavailable:true},read:()=>savedAIEvidence(f,variant),persist:value=>persistSavedAIEvidence(value,'saved-ai-failure'),report:value=>console.info('SAVED_AI_FAILURE '+JSON.stringify(value))});
}

// Cleanup is best-effort and bounded; it must not replace the owning assertion.
export async function releaseSavedAI(p,timeoutMs=1000){
 let timer;try{await Promise.race([Promise.resolve().then(()=>p.evaluate(()=>globalThis.__savedAITrace?.release())).catch(()=>{}),new Promise(resolve=>{timer=setTimeout(resolve,timeoutMs);})]);}finally{clearTimeout(timer);}
}
