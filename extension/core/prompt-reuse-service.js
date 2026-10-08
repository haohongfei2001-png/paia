import {ArchiveError} from './constants.js';
import {inputProjection} from './thought-evidence.js';
import {materialRead} from './manual-materials.js';
import {memoryRange,validateMemoryRow} from './memory/model.js';
import {projectPromptFamilies} from './prompt-family.js';
import {PROMPT_REUSE_ROW,own,validPromptText,readPromptPreferences,validPromptPreferences} from './prompt-reuse-preferences.js';
const fail=()=>{throw new ArchiveError('INVALID_REQUEST');};
const changed=()=>{throw new ArchiveError('MEMORY_STALE');};
const generation=async t=>(await t.get('meta','backup-data-generation'))?.value||0;
export class PromptReuseService{
 constructor(store,{clock=()=>Date.now(),syncJournal=null}={}){this.s=store;this.clock=clock;this.syncJournal=syncJournal;if(syncJournal&&(typeof syncJournal.prepare!=='function'||typeof syncJournal.commit!=='function'))fail();}
 async snapshot(){
  await this.s.finishFoundation();
  let after,base,preferences;const inputs=[];
  do{
   const page=await this.s.run(()=>this.s.repository.transaction(false,async t=>{
    const current=await generation(t);if(base!==undefined&&base!==current)changed();
    const prefs=await readPromptPreferences(t),rows=await t.all('meta',null,memoryRange());
    if(rows.some(x=>!validateMemoryRow(x)))fail();
    const memory={s:this.s,state:async()=>({rows})},filter=await t.get('meta','smart-filter');
    const batch=await t.page('inputStates',{after,limit:100}),items=[];
    for(const {value:m}of batch.rows){
     const p=await inputProjection(this.s,t,m.id);if(!p||!p.sourceRecordIds.length||await this.s.isFiltered(t,p.block,filter))continue;
     let allowed=true,conversation=null,at=null;
     // Capture and official import admit user-only source rows. Explicit contrary
     // role/quotation evidence always vetoes reuse, including future adapters.
     for(const sourceId of p.sourceRecordIds){const r=(await t.get('records',sourceId))?.value,ix=await t.get('recordIndex',sourceId);
      if(!r||!ix||r.hidden||r.deletedAt||r.role&&r.role!=='user'||r.author?.role&&r.author.role!=='user'||r.authorship&&r.authorship!=='user')allowed=false;
      if(conversation&&conversation!==ix?.chatKey)allowed=false;
      conversation=ix?.chatKey;const stamp=Date.parse(ix?.sourceSentAt);if(Number.isFinite(stamp))at=Math.max(at||0,stamp);
     }
     if(!allowed||!conversation||p.block.role&&p.block.role!=='user')continue;
     try{await materialRead(memory,t,{kind:'input',id:m.id,revision:p.contentRevision});}catch(error){if(['MEMORY_DENIED','MEMORY_UNAVAILABLE'].includes(error.code))continue;throw error;}
     items.push({id:p.inputId,conversation,at,text:p.body,role:'user',eligible:true});
    }
    return {items,next:batch.next,current,prefs};
   }));
   base=page.current;preferences=page.prefs;inputs.push(...page.items);after=page.next??undefined;
  }while(after!==undefined);
  const families=await projectPromptFamilies(inputs,preferences,this.clock());
  await this.s.run(()=>this.s.repository.transaction(false,async t=>{if(base!==await generation(t))changed();},['meta']));
  return {families,preferences,generation:base,inputs};
 }
 async members(id){
  const x=await this.snapshot(),family=x.families.find(f=>f.id===id);if(!family)changed();
  return x.inputs.filter(i=>family.members.includes(i.id)).map(i=>({id:i.id,text:i.text}));
 }
 async query({includeHidden=false}={}){
  if(typeof includeHidden!=='boolean')fail();const x=await this.snapshot();
  return {revision:x.preferences.revision,manualOrder:[...x.preferences.pins],items:x.families.filter(f=>(includeHidden||!f.hidden)&&(f.useful||f.pinned||f.edited||f.retained)),complete:true};
 }
 async resolve({id,text}={}){
  if(typeof id!=='string'||!validPromptText(text))fail();const x=await this.snapshot();
  const f=x.families.find(f=>f.id===id&&!f.hidden&&(f.useful||f.pinned||f.edited||f.retained));
  if(!f||f.text!==text)changed();return {id:f.id,text:f.text,generation:x.generation};
 }
 async assertCurrent(expected){return this.s.run(()=>this.s.repository.transaction(false,async t=>{if(expected!==await generation(t))changed();},['meta']));}
 async change(change){
  if(!own(change,['action','id','revision','text','order','inputIds','representative'])||!Number.isSafeInteger(change.revision))fail();
  const {action,id}=change,x=await this.snapshot();if(x.preferences.revision!==change.revision)changed();
  const p=structuredClone(x.preferences),f=x.families.find(f=>f.id===id);let o=p.overrides.find(o=>o.id===id);
  if(action==='create'){
   if(id!==undefined||!validPromptText(change.text))fail();o={id:'manual:'+crypto.randomUUID(),text:change.text,hidden:false,reuseCount:0};p.overrides.push(o);
  }else if(action==='delete'){
   // Delete only independent user-owned reuse work, never a supported Family.
   if(!f||f.members.length!==0||o?.text===undefined)fail();
   p.overrides=p.overrides.filter(x=>x.id!==id);p.pins=p.pins.filter(x=>x!==id);
  }else{
   if(!f&&!o)fail();if(!o){o={id,hidden:false,reuseCount:0};p.overrides.push(o);}
   if(action==='edit'){if(!validPromptText(change.text))fail();o.text=change.text;}
   else if(action==='representative'){if(!f?.members.includes(change.representative))fail();o.representative=change.representative;}
   else if(action==='hide'||action==='show')o.hidden=action==='hide';
   else if(action==='unpin')p.pins=p.pins.filter(x=>x!==id);
   else if(action==='pin'){
    if(change.order===undefined){if(!p.pins.includes(id))p.pins.push(id);}
    else{if(!Array.isArray(change.order)||new Set(change.order).size!==change.order.length||change.order.length!==new Set([...p.pins,id]).size||![...p.pins,id].every(x=>change.order.includes(x)))fail();p.pins=[...change.order];}
   }else if(action==='split'){
    const ids=change.inputIds;if(!f||!Array.isArray(ids)||!ids.length||ids.length>=f.members.length||new Set(ids).size!==ids.length||!ids.every(id=>f.members.includes(id)))fail();
    const group=crypto.randomUUID();p.splits=p.splits.filter(x=>!ids.includes(x.inputId));p.splits.push(...ids.map(inputId=>({inputId,group})));
   }else fail();
  }
  p.revision++;if(!validPromptPreferences(p))fail();
  // Optional local BNS proof: serialize/hash before opening IDB. The canonical
  // CAS write and durable outbox are acknowledged only after the same commit.
  const syncPrepared=this.syncJournal?await this.syncJournal.prepare(x.preferences,p):null;
  await this.s.run(()=>this.s.repository.transaction(true,async t=>{
   if(await generation(t)!==x.generation||(await readPromptPreferences(t)).revision!==change.revision)changed();await t.put('meta',p);
   if(this.syncJournal)await this.syncJournal.commit(t,syncPrepared);
  }));return {revision:p.revision,id:o.id};
 }
 // Only the trusted insertion coordinator calls this after verified read-back.
 async noteVerifiedReuse(id){
  const x=await this.snapshot();if(!x.families.some(f=>f.id===id&&!f.hidden))return;
  return this.s.run(()=>this.s.repository.transaction(true,async t=>{
   // A late acknowledgement cannot recreate an override deleted since selection.
   if(await generation(t)!==x.generation)changed();
   const p=await readPromptPreferences(t);let o=p.overrides.find(x=>x.id===id);if(!o){o={id,hidden:false,reuseCount:0};p.overrides.push(o);}
   o.reuseCount=Math.min(1000000,o.reuseCount+1);p.revision++;if(!validPromptPreferences(p))fail();await t.put('meta',p);
  }));
 }
}
