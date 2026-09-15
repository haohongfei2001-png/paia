import {prefix,fail,markHuman} from './thought-model.js';
import {inputProjection} from './thought-evidence.js';
export const BINDING_ROW='thought-binding:v1',REVERSE_ROW='thought-reverse-edit:v1';
export const validReverse=row=>!!row&&row.version===1&&typeof row.enabled==='boolean'&&Object.keys(row).every(k=>['id','version','enabled'].includes(k));
const primary=r=>r.roles?.some(x=>x!=='context_only');
export async function bindingSource(store,t,row,previousInput=null){
 const deps=(await t.all('dependencies','byTarget',prefix(['entry',row.id]))).filter(primary);if(deps.length!==1||!deps[0].selectedFields?.includes('body'))return null;
 const p=previousInput?.inputId===deps[0].inputId?previousInput:await inputProjection(store,t,deps[0].inputId);if(!p)return null;
 const refs=(await t.all('provenance','byOwner',prefix(['entry',row.id]))).filter(x=>x.role!=='context_only');
 if(!refs.length||refs.some(x=>x.inputId!==p.inputId||x.contributionType!=='exact_excerpt'||x.span?.field!=='body'||x.span.start!==0))return null;
 for(const ref of refs){
  if(ref.span.full===false)return null;
  let whole=ref.span.full===true||ref.basedOnContentRevision===p.contentRevision&&ref.span.end===p.body.length;
  if(!whole)for(const id of ref.sourceRecordIds||[]){const source=await t.get('records',id);if(source?.value.originalText.length===ref.span.end)whole=true;}
  if(!whole)return null;
 }
 return {...p,dep:deps[0],refs};
}
export async function classifyBinding(store,t,row,previousInput=null){
 if(row.bodyBinding==='thought')return {bodyBinding:'thought'};
 const p=await bindingSource(store,t,row,previousInput);
 if(p&&row.thoughtText===p.body&&(!row.workingInputId||row.workingInputId===p.inputId)){
  const current=row.bodyBinding==='input'&&row.bindingRevision===p.contentRevision&&row.bindingLength===p.body.length&&row.workingInputId===p.inputId;
  const strict=p.dep.basedOnContentRevision===p.contentRevision&&p.refs.some(x=>x.basedOnContentRevision===p.contentRevision&&x.span.end===p.body.length);
  // Historical Input propagation marks the mirror human. An explicit link plus
  // a provable original whole span remains eligible; a human flag alone is not.
  let historical=false;if(row.workingInputId&&p.dep.basedOnContentRevision===p.contentRevision)for(const ref of p.refs)for(const id of ref.sourceRecordIds||[]){const source=await t.get('records',id);if(source?.value.originalText.length===ref.span.end)historical=true;}
  const inferred=!row.workingInputId&&row.provenanceType==='input_original'&&!row.protections?.body?.locked&&!row.authorship?.body?.everHumanConfirmed&&strict;
  if(current||row.workingInputId&&(strict||historical)||inferred)return {bodyBinding:'input',workingInputId:p.inputId,bindingRevision:p.contentRevision,bindingLength:p.body.length};
 }
 return {bodyBinding:'thought'};
}
export function applyBinding(row,binding){delete row.workingInputId;delete row.bindingRevision;delete row.bindingLength;Object.assign(row,binding);return row;}
export async function migrateBindings(store,{limit=100,maxBatches=Infinity}={}){
 for(let i=0;i<maxBatches;i++){
  const marker=await store.run(()=>store.repository.transaction(true,async t=>{
   const m=await t.get('meta',BINDING_ROW)||{id:BINDING_ROW,version:1,cursor:null,complete:false,input:0,thought:0};if(m.version!==1)fail();if(m.complete)return m;
   const page=await t.page('thoughts',{after:m.cursor??undefined,limit});
   for(const {value:row}of page.rows){if(row.storageSchema!==2||row.lifecycle==='quarantined')continue;const state=await classifyBinding(store,t,row);if(!row.bodyBinding&&state.bodyBinding==='thought'&&(row.workingInputId||row.provenanceType==='input_original'||row.hasHumanAction)&&row.protections?.body)row.protections.body.locked=true;applyBinding(row,state);m[state.bodyBinding]++;await t.put('thoughts',row);}
   m.cursor=page.next;m.complete=!page.next;await t.put('meta',m);
   if(!await t.get('meta',REVERSE_ROW))await t.put('meta',{id:REVERSE_ROW,version:1,enabled:false});return m;
  }));if(marker.complete)return marker;await store.repository.checkpoint('thought-binding-batch');
 }
 return store.run(()=>store.repository.transaction(false,t=>t.get('meta',BINDING_ROW),['meta']));
}
export async function bindingRead(store,t,row){
 const safe=structuredClone(row);applyBinding(safe,await classifyBinding(store,t,row));
 const p=await bindingSource(store,t,safe);safe.currentInputRevision=p?.contentRevision??null;safe.bindingInputId=p?.inputId??null;
 safe.archiveChanged=safe.bodyBinding==='thought'&&!!p&&safe.thoughtText!==p.body;
 const policy=await t.get('meta',REVERSE_ROW);safe.reverseEditEnabled=validReverse(policy)&&policy.enabled;
 return safe;
}
export async function reverseSetting(store,enabled){
 await store.finishFoundation();if(enabled!==undefined&&typeof enabled!=='boolean')fail();
 return store.run(()=>store.repository.transaction(enabled!==undefined,async t=>{if(enabled!==undefined)await t.put('meta',{id:REVERSE_ROW,version:1,enabled});const r=await t.get('meta',REVERSE_ROW);return {version:1,enabled:validReverse(r)&&r.enabled};},['meta']));
}
export async function prepareBodyEdit(store,t,row,request,reason){
 const binding=await classifyBinding(store,t,row);applyBinding(row,binding);if(binding.bodyBinding!=='input')return {shared:false};
 const p=await bindingSource(store,t,row);
 if(!p||request.expectedInputRevision!==p.contentRevision||request.expectedRevision!==row.revision)return {conflict:true,fields:['body'],sourceChanged:true};
 const policy=await t.get('meta',REVERSE_ROW);const enabled=validReverse(policy)&&policy.enabled;
 // Historical restoration is a Thought-only edit. Reconnecting is a separate,
 // explicit operation with a current Input comparison and both CAS guards.
 if(enabled&&reason!=='restore')return {shared:true,inputId:p.inputId};
 applyBinding(row,{bodyBinding:'thought'});row.thoughtEditedAt=store.clock();markHuman(row,'body',request.operationId||'thought-edit',store.clock());return {shared:false,detached:true};
}
export const THOUGHT_LAYOUT_ROW='thought-layout:v1';
export const validThoughtLayout=r=>r?.version===1&&['grid','list'].includes(r.layout)&&Object.keys(r).every(k=>['id','version','layout'].includes(k));
export async function thoughtLayout(store,layout){if(layout!==undefined&&!['grid','list'].includes(layout))fail();await store.finishFoundation();return store.run(()=>store.repository.transaction(layout!==undefined,async t=>{if(layout)await t.put('meta',{id:THOUGHT_LAYOUT_ROW,version:1,layout});const row=await t.get('meta',THOUGHT_LAYOUT_ROW);return {layout:validThoughtLayout(row)?row.layout:'grid'};},['meta']));}
