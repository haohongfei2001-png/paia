import {requireHistoricalCandidateSession} from './ai-usage/historical-candidate-session.js';
import {prepareInputSearchContext,prepareInputSearchArrival,matchesInputSearchArrival} from './qualified-input-search.js';
import {PROMPT_HISTORY_SCOPE,queryPromptHistory,readPromptHistory,readPromptHistoryInTransaction,validPromptSelectionRef,selectPromptRange} from './prompt-selection.js';
import {NextFamilyView} from './next-family-view.js';
import {ArchiveError,CONSENT_VERSION} from './constants.js';
import {requireConsumerPublicationSettled} from './browser-native-sync/consumer-publication-state.js';
const publicationSettled=async t=>{try{await requireConsumerPublicationSettled(t);}catch(e){if(e.code==='BNS_CONSUMER_PUBLICATION_PENDING')throw new ArchiveError(e.code);throw e;}};
import {inputProjection} from './thought-evidence.js';
import {materialRead} from './manual-materials.js';
import {memoryRange,validateMemoryRow} from './memory/model.js';
import {projectPromptFamilies} from './prompt-family.js';
import {PROMPT_REUSE_ROW,own,validPromptText,quickPromptEligible,readPromptPreferences,validPromptPreferences} from './prompt-reuse-preferences.js';
const fail=()=>{throw new ArchiveError('INVALID_REQUEST');};
const changed=()=>{throw new ArchiveError('MEMORY_STALE');};
const generation=async t=>(await t.get('meta','backup-data-generation'))?.value||0;
export class PromptReuseService{
 #nextFamilyView;#historyCandidates;
 constructor(store,{clock=()=>Date.now(),syncJournal=null,historyCandidates=null}={}){this.s=store;this.#historyCandidates=historyCandidates===null?null:requireHistoricalCandidateSession(historyCandidates,store);this.#historyCandidates?.bindPromptOwner(()=>this.snapshot());this.clock=clock;this.#nextFamilyView=new NextFamilyView(clock);this.syncJournal=syncJournal;if(syncJournal&&(typeof syncJournal.prepare!=='function'||typeof syncJournal.commit!=='function'))fail();}
 async syncCorrectionSnapshot(journal){if(!(#nextFamilyView in this)||this.syncJournal!==journal)fail();return this.#snapshot(false);}
 async snapshot(){return this.#snapshot(true);}
 async #snapshot(projectCorrections){
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
  const snapshot={families,preferences,generation:base,inputs};if(projectCorrections&&this.syncJournal?.correctionBindings)return {...snapshot,...await this.syncJournal.projectCorrections(snapshot,this.clock())};return snapshot;
 }
 async members(id){
  const x=await this.snapshot(),family=x.families.find(f=>f.id===id);if(!family)changed();
  return x.inputs.filter(i=>family.members.includes(i.id)).map(i=>({id:i.id,text:i.text}));
 }
 async query({includeHidden=false}={}){
  if(typeof includeHidden!=='boolean')fail();const serial=this.#nextFamilyView.begin(),x=await this.snapshot();
  this.#nextFamilyView.publish(serial,x);
  const eligible=x.families.filter(f=>(includeHidden||!f.hidden)&&(f.useful||f.pinned||f.edited||f.retained));
  return {revision:x.preferences.revision,generation:x.generation,manualOrder:[...x.preferences.pins],items:eligible.filter(f=>quickPromptEligible(f.text)),oversizedItems:eligible.filter(f=>!quickPromptEligible(f.text)),complete:true,...(x.unresolved?{unresolved:x.unresolved,bindingsComplete:x.bindingsComplete}:{})};
 }
 async historicalCandidateStatus(){return {available:this.#historyCandidates?.available()===true};}
 async refreshHistoricalCandidates(query,source){
  if(!this.#historyCandidates)throw new ArchiveError('UNAVAILABLE');
  const handle=await this.#historyCandidates.prepare({query},source);await this.#historyCandidates.run(handle);return handle;
 }
 async assertHistoricalCandidatesCurrent(handle){if(!this.#historyCandidates)throw new ArchiveError('UNAVAILABLE');await this.#historyCandidates.read(handle);}
 async adoptHistoricalCandidates(handle){
  const local=await this.query();if(!handle||!this.#historyCandidates)return local;
  try{
   const result=await this.#historyCandidates.read(handle);if(result.kind!=='CANDIDATES')return local;
   const items=[];for(const ref of result.refs){const selected=await this.resolveSelection(ref);if(!quickPromptEligible(selected.text))continue;items.push({id:ref.id,text:selected.text,ref:structuredClone(ref),members:[],pinned:false,hidden:false,edited:false,retained:false,useful:true});}
   await this.#historyCandidates.read(handle);
   // Protected human slots remain in their original relative order. AI can add
   // only already-qualified historical IDs, never replace their authored text.
   const protectedItems=local.items.filter(x=>x.pinned||x.edited||x.retained);
   return {...local,items:[...protectedItems,...items],candidateSource:'ai',complete:false};
  }catch(error){if(!['UNAVAILABLE','STALE_BASE','MEMORY_STALE','CANCELLED'].includes(error.code))throw error;return local;}
 }
 async nextFamilyView(){return this.#nextFamilyView.read(expected=>this.assertCurrent(expected));}
 async resolve({id,text}={}){
  if(typeof id!=='string'||!validPromptText(text))fail();const x=await this.snapshot();
  const f=x.families.find(f=>f.id===id&&!f.hidden&&(f.useful||f.pinned||f.edited||f.retained));
  if(!f||f.text!==text)changed();return {id:f.id,text:f.text,generation:x.generation};
 }
 async qualifyArchiveArrival(descriptor){
  const keys=['version','query','scope','searchSnapshot','ref'];
  if(!descriptor||!own(descriptor,keys)||Object.keys(descriptor).length!==keys.length||descriptor.version!==1||typeof descriptor.query!=='string'||descriptor.query.length>1000||!descriptor.scope||Object.keys(descriptor.scope).length!==6||Object.entries(PROMPT_HISTORY_SCOPE).some(([key,value])=>descriptor.scope[key]!==value))fail();
  const ref=descriptor.ref;
  if(!(await this.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
  if(!descriptor.query.trim()){if(ref!==null||descriptor.searchSnapshot!==null)fail();await this.s.run(()=>this.s.repository.transaction(false,publicationSettled,['meta']));return structuredClone(descriptor);}
  if(ref!==null&&(!validPromptSelectionRef(ref)||ref.kind!=='history_input'||ref.generation!==descriptor.searchSnapshot?.generation))fail();
  const searchContext={query:descriptor.query,knownRevision:ref?.contentRevision??0,searchSnapshot:descriptor.searchSnapshot,scope:descriptor.scope};
  const prepared=ref===null?await prepareInputSearchContext(searchContext):await prepareInputSearchArrival(this.s,{documentId:ref.documentId,qualifyContext:true,searchContext});
  await this.s.run(()=>this.s.repository.transaction(false,async t=>{
   await publicationSettled(t);if(await generation(t)!==descriptor.searchSnapshot.generation)changed();
   if(ref){const input=await readPromptHistoryInTransaction(this.s,t,ref);selectPromptRange(input.body);if(!await matchesInputSearchArrival(this.s,t,input,prepared,await t.get('meta','smart-filter')))changed();}
  }));
  return structuredClone(descriptor);
 }
 async queryHistory(options){return queryPromptHistory(this.s,options);}
 async resolveSelection(ref,range=null){
  if(!validPromptSelectionRef(ref))fail();
  if(ref.kind==='history_input')return readPromptHistory(this.s,ref,range);
  // An independent authored override has no historical member or Family
  // qualification. Read its original preference owner twice across the
  // coordinator's initial/final checks, without rebuilding the Input corpus.
  // Edited pf: identities and configured Sync correction owners keep their
  // existing complete qualification; this path grants no portable authority.
  if(this.syncJournal===null&&ref.kind==='manual_reuse'&&/^manual:[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(ref.id)){
   let selectedRange;try{selectedRange=range===null?null:structuredClone(range);}catch{fail();}
   return this.#independentManualSelection(structuredClone(ref),selectedRange);
  }
  const x=await this.snapshot();if(x.generation!==ref.generation||x.preferences.revision!==ref.revision)changed();
  const family=x.families.find(f=>f.id===ref.id&&!f.hidden&&(f.useful||f.pinned||f.edited||f.retained));
  if(!family||(family.edited?'manual_reuse':'prompt_family')!==ref.kind)changed();
  return {ref:structuredClone(ref),range:range===null?null:structuredClone(range),text:selectPromptRange(family.text,range),generation:x.generation,familyId:ref.id};
 }
 async #independentManualSelection(ref,range){
  await this.s.finishFoundation();
  return this.s.run(()=>this.s.repository.transaction(false,async t=>{
   await publicationSettled(t);
   const before=await generation(t),{settings}=await this.s.control(t);
   if(settings.consentVersion!==CONSENT_VERSION)throw new ArchiveError('CONSENT_REQUIRED');
   const preferences=await readPromptPreferences(t);
   if(before!==ref.generation||preferences.revision!==ref.revision)changed();
   const override=preferences.overrides.find(row=>row.id===ref.id&&row.text!==undefined&&!row.hidden);
   if(!override)changed();
   const text=selectPromptRange(override.text,range);
   await publicationSettled(t);
   if(await generation(t)!==before)changed();
   if((await this.s.control(t)).settings.consentVersion!==CONSENT_VERSION)throw new ArchiveError('CONSENT_REQUIRED');
   return {ref:structuredClone(ref),range:range===null?null:structuredClone(range),text,generation:before,familyId:ref.id};
  },['meta']));
 }
 async assertSelectionCurrent(selected){
  const current=await this.resolveSelection(selected.ref,selected.range);if(current.text!==selected.text)changed();return current;
 }
 async assertCurrent(expected){return this.s.run(()=>this.s.repository.transaction(false,async t=>{if(expected!==await generation(t))changed();},['meta']));}
 async change(change){return this.#change(change);}
 async createFromHistory(ref,text,revision){
  if(!validPromptSelectionRef(ref)||ref.kind!=='history_input')fail();
  return this.#change({action:'create',text,revision},ref);
 }
 async #change(change,origin=null){
  if(!own(change,['action','id','revision','text','order','inputIds','representative'])||!Number.isSafeInteger(change.revision))fail();
  const {action,id}=change,x=await this.snapshot();if(x.preferences.revision!==change.revision)changed();
  const p=structuredClone(x.preferences),f=x.families.find(f=>f.id===id);let o=p.overrides.find(o=>o.id===id);
  if(action==='create'){
   if(id!==undefined||!validPromptText(change.text))fail();if(!quickPromptEligible(change.text))throw new ArchiveError('PROMPT_TOO_LONG');o={id:'manual:'+crypto.randomUUID(),text:change.text,hidden:false,reuseCount:0};p.overrides.push(o);
  }else if(action==='delete'){
   // Delete only independent user-owned reuse work, never a supported Family.
   if(!f||f.members.length!==0||o?.text===undefined)fail();
   p.overrides=p.overrides.filter(x=>x.id!==id);p.pins=p.pins.filter(x=>x!==id);
  }else{
   if(!f&&!o)fail();if(!o){o={id,hidden:false,reuseCount:0};p.overrides.push(o);}
   if(action==='edit'){if(!validPromptText(change.text))fail();if(!quickPromptEligible(change.text))throw new ArchiveError('PROMPT_TOO_LONG');o.text=change.text;}
   else if(action==='representative'){if(!f?.members.includes(change.representative))fail();if(!quickPromptEligible(x.inputs.find(row=>row.id===change.representative)?.text))throw new ArchiveError('PROMPT_TOO_LONG');o.representative=change.representative;}
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
  const syncPrepared=this.syncJournal?await this.syncJournal.prepare(x.preferences,p,{inputs:x.inputs,generation:x.generation}):null;
  await this.s.run(()=>this.s.repository.transaction(true,async t=>{
   await publicationSettled(t);
   if(origin)await readPromptHistoryInTransaction(this.s,t,origin);
   if(await generation(t)!==x.generation||(await readPromptPreferences(t)).revision!==change.revision)changed();await t.put('meta',p);
   if(this.syncJournal)await this.syncJournal.commit(t,syncPrepared);
  }));return {revision:p.revision,id:o.id};
 }
 // Only the trusted insertion coordinator calls this after verified read-back.
 async noteVerifiedReuse(id,verifiedGeneration=null){
  // A coordinator may reuse its just-qualified selection generation. The same
  // canonical CAS below rejects every subsequent deletion/edit/revocation; no
  // usage receipt can recreate a removed override. Legacy callers requalify.
  const x=verifiedGeneration===null?await this.snapshot():{generation:verifiedGeneration};
  if(!Number.isSafeInteger(x.generation)||x.generation<0)fail();
  if(verifiedGeneration===null&&!x.families.some(f=>f.id===id&&!f.hidden))return;
  return this.s.run(()=>this.s.repository.transaction(true,async t=>{
   await publicationSettled(t);
   // A late acknowledgement cannot recreate an override deleted since selection.
   if(await generation(t)!==x.generation)changed();
   const p=await readPromptPreferences(t),before=structuredClone(p);let o=p.overrides.find(x=>x.id===id);if(!o){o={id,hidden:false,reuseCount:0};p.overrides.push(o);}
   o.reuseCount=Math.min(1000000,o.reuseCount+1);p.revision++;if(!validPromptPreferences(p))fail();await t.put('meta',p);if(this.syncJournal?.noteVerifiedReuse)await this.syncJournal.noteVerifiedReuse(t,before,p);
  }));
 }
}
