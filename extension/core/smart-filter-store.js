import {filterVisibilityPageInputIds} from './ai-usage/filter-visibility-read-page.js';
import {takeFilterVisibilityConsumerOperations} from './ai-usage/filter-visibility-consumer-scope.js';
import {AIMaintenanceFilterOwner} from './ai-usage/ai-filter-owner.js';
import {advanceArchiveYearIndex,archiveYearKey,archiveYearPrefix} from './archive-year-index.js';
import {inputProjection} from './thought-evidence.js';
import {qualifiedInputSearch,prepareInputSearchArrival,matchesInputSearchArrival} from './qualified-input-search.js';
import {searchRank,rankSearchPage} from './search-ranking.js';
import {buildInputSearchCache,lookupInputSearchCache,matchesSourceDate,validSearchDate} from './input-search-cache.js';
import {IAStore} from './ia-store.js';
import {ArchiveError} from './constants.js';
import {validProvider} from './read-projection-keys.js';
import {conversationMetaId,projectMetaId,projectRef as canonicalProjectRef} from './source-structure-model.js';
import {queryPage,archiveReadingYear} from './archive-query.js';
import {identifySource,hashText} from './dedupe.js';
import {decideLight,normalizePresence,validFilterDecision,FILTER_VERSIONS,FILTER_REASONS,UNCERTAIN_REASONS} from './smart-filter.js';

const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
const prefix=p=>IDBKeyRange.bound(p,[...p,[]],false,true);
const idOK=id=>typeof id==='string'&&id.length>0&&id.length<=200;
const sourceKeys=async(t,b)=>{const keys=[];for(const p of b.provenance){const r=await t.get('recordIndex',p.sourceRecordId);if(r)keys.push(r.sourceKey||'legacy:'+r.id);}return keys;};
const authored=(b,m)=>b.libraryText!==null||!!b.note||b.editedAt!==null||m?.contentRevision>0||b.provenance.length!==1||b.mergedSourceIds?.length>1;
// Original default constructor only; no filter decision, native cut or write
// authority. Bounded sync consumers use the authentic creation owner values.
export function planInitialFilter(b,m,legacy=false){return {id:b.id,documentId:b.documentId,authorship:legacy?'legacy_unknown':authored(b,m)?'user_edited':'untouched',userEdited:authored(b,m),filterOverride:authored(b,m)?'keep':'none',presence:null,evaluationRevision:0,pendingKey:0,decision:'uncertain',reasonCode:'metadata_unknown',...FILTER_VERSIONS,basedOnContentRevision:m?.contentRevision??0};}

export class SmartFilterStore extends IAStore {
 #aiFilter;#aiFilterAuthority;
 constructor(local,options={}){super(local,{...options,smartFilter:true});this.filterLoaded=false;this.filterMutation=0;this.inputSearchCache=null;this.filterIntentJournal=options.filterIntentJournal??null;this.#aiFilterAuthority=options.aiFilterAuthority??null;this.#aiFilter=new AIMaintenanceFilterOwner(this,this.#aiFilterAuthority);}
 async #withAIFilterVisibility(select,read){
  if(this.#aiFilterAuthority?.canPrepareVisibility?.()!==true)return read();let prepared=null;
  try{const ids=await this.repository.transaction(false,async t=>{if((await t.get('meta','smart-filter'))?.mode!=='light')return [];const selected=[...new Set(await select(t))];if(selected.length>200||selected.some(x=>!idOK(x)))return [];const operations=new Set();for(const inputId of selected){const row=await t.get('filterInputs',inputId);if(idOK(row?.aiOperationId)&&row.aiDecision?.version===1)operations.add(row.aiOperationId);}return [...operations];},['meta','blockIndex','filterInputs']);if(ids.length)prepared=await this.#aiFilterAuthority.prepareVisibility(ids);}catch{/* Optional read admission fails open. The original read still validates. */}
  try{return await read();}finally{prepared?.release?.();}
 }
 // Internal consumers pass only a one-use original metadata admission. The
 // callback must repeat its original scope/cursor/authority checks before text.
 // Preparation is outside both metadata and content transactions and conveys
 // no eligibility result; the original Filter owner remains the read authority.
 canPrepareAIFilterVisibility(){try{return this.#aiFilterAuthority?.canPrepareVisibility?.()===true;}catch{return false;}}
 async prepareAIFilterVisibilityScope(scope){
  if(!this.canPrepareAIFilterVisibility())return null;
  try{const ids=await this.repository.transaction(false,t=>takeFilterVisibilityConsumerOperations(this,scope,t),['meta','filterInputs']);return ids?.length?await this.#aiFilterAuthority.prepareVisibility(ids):null;}catch{return null;}
 }
 async withAIFilterVisibilityScope(scope,read){
  if(typeof read!=='function')invalid();
  const prepared=await this.prepareAIFilterVisibilityScope(scope);
  try{return await read();}finally{prepared?.release?.();}
 }

 write(fn,onCommitted=null,prepare=null){this.filterMutation++;return super.write(fn,onCommitted,prepare).finally(()=>{this.filterMutation++;});}
 run(fn){return super.run(async()=>{if(!this.filterLoaded){await this.initializeFilter();this.filterLoaded=true;}return fn();});}
 async initializeFilter(){
  let state=await this.repository.transaction(false,t=>t.get('meta','smart-filter'));
  if(state?.phase==='active'){
   if(state.diagnosticsVersion===1&&Object.entries(FILTER_VERSIONS).every(([k,v])=>state[k]===v))return;
   state={...state,...(state.policyVersion!==FILTER_VERSIONS.policyVersion?{previousReasonPolicyVersion:Number.isSafeInteger(state.policyVersion)?state.policyVersion:0,previousUncertainReasons:Object.fromEntries(UNCERTAIN_REASONS.map(k=>[k,0])),capturePreviousReasons:true}:{}),phase:'upgrading_policy',cursor:null};await this.repository.transaction(true,t=>t.put('meta',state));
  }
  if(!state)state=await this.repository.transaction(true,async t=>{
   const count=await t.count('blocks');const row={id:'smart-filter',phase:'mapping',migrationVersion:1,cursor:null,mapped:0,legacyCount:count,mode:'light',noticePending:count>0,decisionSequence:0,policyEpoch:0,...FILTER_VERSIONS};await t.put('meta',row);return row;
  });
  do{
   state=await this.repository.transaction(true,async t=>{
    const row=await t.get('meta','smart-filter');const page=await t.page('blockIndex',{index:'bySequence',after:row.cursor??undefined,limit:100});
    for(const {value:ix} of page.rows){const b=(await t.get('blocks',ix.id))?.value;if(!b)invalid();const m=await t.get('inputStates',b.id);let input=await t.get('filterInputs',b.id);
     if(row.capturePreviousReasons&&!b.excluded&&!b.branchStatus&&input?.decision==='uncertain'&&input.evaluatedAt&&input.pendingKey!==0&&input.basedOnContentRevision===m?.contentRevision&&!input.userEdited&&input.filterOverride!=='keep'){
      let protectedInput=false;for(const key of await sourceKeys(t,b))if(await t.get('filterIntents',key))protectedInput=true;
      if(!protectedInput)row.previousUncertainReasons[UNCERTAIN_REASONS.includes(input.reasonCode)?input.reasonCode:'other']++;
     }
     if(!input){input=this.initialFilter(b,m,true);}else if((!input.evaluatedAt&&!input.userEdited&&input.filterOverride!=='keep')||!Object.entries(FILTER_VERSIONS).every(([k,v])=>input[k]===v)||input.basedOnContentRevision!==m?.contentRevision||input.failed){input.pendingKey=0;input.evaluationRevision++;}await t.put('filterInputs',input);if(row.phase==='mapping')row.mapped++;}
    row.cursor=page.next;if(page.next===null){row.phase='active';if(row.capturePreviousReasons){row.capturePreviousReasons=false;row.previousReasonState='available';}row.diagnosticsVersion=1;row.taskState='idle';row.verified=true;row.completedAt=this.clock();Object.assign(row,FILTER_VERSIONS);}await t.put('meta',row);return row;
   });
   await this.repository.checkpoint('filter-migration-batch');
  }while(state.phase!=='active');
 }
 initialFilter(b,m,legacy=false){return planInitialFilter(b,m,legacy);}
 async sourceOperation(request,enrich){
  this.filterMutation++;try{
  const result=await super.sourceOperation(request,enrich);
  if(!enrich){
   // A failed optional presence/queue write must not roll back a successful capture.
   try{
    const prepared=[];for(const m of request.messages)prepared.push({key:await identifySource(request.chat.id,m.sourceMessageId),hash:await hashText(m.originalText),presence:normalizePresence(m.presence),invalidPresence:m.presence!=null&&!normalizePresence(m.presence)});
    await this.write(async t=>{
     const c=await this.control(t);if(!c.settings.enabled||c.settings.epoch!==request.epoch)return;
     for(const p of prepared){if(await t.get('tombstones','source:'+p.key))continue;
      for(const r of await t.all('recordIndex','bySource',p.key)){if(r.contentHash!==p.hash)continue;
       for(const ix of await t.all('blockIndex','byRecord',r.id)){const b=(await t.get('blocks',ix.id))?.value;if(!b)continue;const meta=await t.get('inputStates',b.id);let row=await t.get('filterInputs',b.id);const previous=row?JSON.stringify(row):null;row??=this.initialFilter(b,meta);
        if(await t.get('filterIntents',p.key)){row.filterOverride='keep';row.overrideReason='source_user_protected';}
        const next=p.presence;
        // Once a source is known to carry references, incomplete later scans cannot erase that evidence.
        const merged=row.presence?.attachment==='present'||row.presence?.reference==='present'?row.presence:next;
        if(JSON.stringify(row.presence)!==JSON.stringify(merged)||!!row.presenceInvalid!==p.invalidPresence||row.decision===undefined){row.presenceInvalid=p.invalidPresence;row.presence=merged;row.evaluationRevision++;row.pendingKey=0;row.decision='uncertain';delete row.filteredKey;}
        if(row.presence&&row.decision==='uncertain'&&row.reasonCode==='metadata_unknown'&&row.authorship==='untouched')row.pendingKey=0;
        if(JSON.stringify(row)!==previous)await t.put('filterInputs',row);
       }
      }
     }
    });
   }catch{/* Capture remains saved; absent or invalid decisions remain visible. */}
  }
  return result;
  }finally{this.filterMutation++;}
 }
 filterStatus(){return this.run(()=>this.repository.transaction(false,async t=>({...await t.get('meta','smart-filter'),pending:await t.count('filterInputs','byPending',0)})));}
 setFilterMode(mode){if(!['light','off'].includes(mode))return Promise.reject(new ArchiveError('INVALID_REQUEST'));const journal=this.consumerPreferenceJournal;return this.write(async(t,prepared)=>{if(prepared)await journal.authorize(t,this,prepared);const row=await t.get('meta','smart-filter');if(row.mode!==mode){row.mode=mode;row.policyEpoch++;await t.put('meta',row);}if(prepared)await journal.commitMode(t,this,prepared);return {ok:true,mode};},null,journal?()=>journal.prepareMode(this,mode):null);}
 takeFilterNotice(){return this.write(async t=>{const row=await t.get('meta','smart-filter');const show=row.noticePending&&row.mode==='light';if(show){row.noticePending=false;row.noticeShownAt=this.clock();await t.put('meta',row);}return {show};});}
 recoverFilters(){this.filterMutation++;return this.run(async()=>{await this.repository.transaction(true,async t=>{const row=await t.get('meta','smart-filter');row.phase='upgrading_policy';row.cursor=null;row.taskState='idle';await t.put('meta',row);});this.filterLoaded=false;await this.initializeFilter();this.filterLoaded=true;return {ok:true};}).finally(()=>{this.filterMutation++;});}
 setFilterTask(state){if(!['idle','running','failed'].includes(state))return Promise.reject(new ArchiveError('INVALID_REQUEST'));return this.write(async t=>{const row=await t.get('meta','smart-filter');row.taskState=state;if(state!=='running')row.lastCheckedAt=Date.parse(this.clock());await t.put('meta',row);if(state==='failed')for(const input of await t.all('filterInputs','byPending',0,50)){input.failed=true;await t.put('filterInputs',input);}});}
 async filterDiagnostics(){
  // Each read transaction is bounded; capture can run between pages. Never return IDs or body fields.
  for(let attempt=0;attempt<3;attempt++){
   await this.run(()=>Promise.resolve());const generation=this.filterMutation;
   const totals={active:0,checked:0,pending:0,keep:0,filter:0,uncertain:0,userProtected:0,failed:0};const reasonCounts=Object.fromEntries(Object.keys(FILTER_REASONS).map(k=>[k,0])),uncertainReasonCounts=Object.fromEntries(UNCERTAIN_REASONS.map(k=>[k,0]));let cursor=null,state,canonicalGeneration=null,canonicalChanged=false;
   do{cursor=await this.run(()=>this.#withAIFilterVisibility(async t=>(await t.page('blockIndex',{index:'bySequence',after:cursor??undefined,limit:100})).rows.filter(x=>!x.value.excluded).map(x=>x.value.id),()=>this.repository.transaction(false,async t=>{
    const currentGeneration=(await t.get('meta','backup-data-generation'))?.value||0;if(canonicalGeneration===null)canonicalGeneration=currentGeneration;else if(canonicalGeneration!==currentGeneration){canonicalChanged=true;return null;}
    state=await t.get('meta','smart-filter');const page=await t.page('blockIndex',{index:'bySequence',after:cursor??undefined,limit:100});
    for(const {value:ix}of page.rows){if(ix.excluded)continue;const b=(await t.get('blocks',ix.id))?.value;if(!b||b.branchStatus)continue;totals.active++;
     const row=await t.get('filterInputs',ix.id),meta=await t.get('inputStates',ix.id);let protectedInput=!!(row?.userEdited||row?.filterOverride==='keep');
     for(const key of await sourceKeys(t,b))if(await t.get('filterIntents',key))protectedInput=true;
     if(protectedInput){totals.checked++;totals.keep++;totals.userProtected++;reasonCounts.user_protected++;continue;}
     const valid=row?.evaluatedAt&&row.pendingKey!==0&&row.basedOnContentRevision===meta?.contentRevision&&Object.entries(FILTER_VERSIONS).every(([k,v])=>row[k]===v);
     if(!valid){totals.pending++;if(row?.failed)totals.failed++;continue;}
     const reason=Object.hasOwn(FILTER_REASONS,row.reasonCode)?row.reasonCode:'other';reasonCounts[reason]++;if(row.decision==='uncertain')uncertainReasonCounts[UNCERTAIN_REASONS.includes(reason)?reason:'other']++;totals.checked++;if(await this.isFiltered(t,b,{mode:'light'}))totals.filter++;else if(row.decision==='keep')totals.keep++;else totals.uncertain++;
    }return page.next;
   })));}while(cursor!==null&&generation===this.filterMutation);
   if(!canonicalChanged&&generation===this.filterMutation)return {...totals,previousReasonState:state.previousReasonState==='available'?'available':'not_captured',previousReasonPolicyVersion:Number.isSafeInteger(state.previousReasonPolicyVersion)?state.previousReasonPolicyVersion:0,previousUncertainReasonCounts:Object.fromEntries(UNCERTAIN_REASONS.map(k=>[k,Number.isSafeInteger(state.previousUncertainReasons?.[k])&&state.previousUncertainReasons[k]>=0?state.previousUncertainReasons[k]:0])),reasonCounts,uncertainReasonCounts,reasonTaxonomyVersion:2,mode:state.mode==='off'?'off':'light',filterRatio:totals.active?totals.filter/totals.active:0,filterVersion:FILTER_VERSIONS.filterVersion,policyVersion:FILTER_VERSIONS.policyVersion,classifierVersion:FILTER_VERSIONS.classifierVersion,lastCheckedAt:Number.isFinite(state.lastCheckedAt)?state.lastCheckedAt:0,taskState:state.mode==='off'?'paused':['idle','running','failed'].includes(state.taskState)?state.taskState:'idle'};
  }throw new ArchiveError('STORAGE_FAILED');
 }
 async evaluateFilters({limit=50}={}){
  if(!Number.isInteger(limit)||limit<1||limit>100)invalid();
  const batch=await this.run(()=>this.repository.transaction(false,async t=>{
   if((await t.get('meta','smart-filter')).mode!=='light')return [];
   const rows=await t.all('filterInputs','byPending',0,limit),items=[];
   for(const row of rows){const b=(await t.get('blocks',row.id))?.value,meta=await t.get('inputStates',row.id);if(!b)continue;const text=b.libraryText??(b.originalTextReference?(await t.get('records',b.originalTextReference))?.value.originalText:'');items.push({row,contentRevision:meta?.contentRevision,decision:decideLight({text,...row})});}return items;
  }));
  if(!batch.length)return {processed:0};
  await this.repository.checkpoint('filter-evaluated');
  return this.write(async t=>{
   const state=await t.get('meta','smart-filter');if(state.mode!=='light')return {processed:0};let processed=0;
   for(const item of batch){const row=await t.get('filterInputs',item.row.id),b=(await t.get('blocks',item.row.id))?.value,meta=await t.get('inputStates',item.row.id);
    if(!row||!b||row.evaluationRevision!==item.row.evaluationRevision||meta?.contentRevision!==item.contentRevision)continue;
    const protectedInput=row.userEdited||row.filterOverride==='keep';Object.assign(row,protectedInput?{decision:'keep',reasonCode:'user_protected',...FILTER_VERSIONS}:item.decision);
    delete row.aiDecision;row.failed=false;row.pendingKey=1;row.basedOnContentRevision=item.contentRevision;row.evaluatedAt=this.clock();row.decisionSequence=++state.decisionSequence;delete row.filteredKey;if(row.decision==='filter')row.filteredKey=[0,-row.decisionSequence,row.id];await t.put('filterInputs',row);processed++;
   }
   await t.put('meta',state);return {processed};
  });
 }
 prepareAIMaintenanceFilter(t,scope){return this.#aiFilter.prepare(t,scope);}
 releaseAIMaintenanceFilter(handle){this.#aiFilter.release(handle);}
 commitAIMaintenanceFilter(t,handle,decisions){return this.#aiFilter.commit(t,handle,decisions);}
 // Conservative Maintenance participation uses the existing transaction owner.
 // It never attributes a model response to the deterministic classifier and
 // never creates a human keep override. The Foundation records NO_CHANGE.
 async maintenanceFilterSnapshot(t,inputIds,{contentBounds=false}={}){
  if(!Array.isArray(inputIds)||!inputIds.length||inputIds.length>20||new Set(inputIds).size!==inputIds.length||inputIds.some(id=>!idOK(id)))invalid();
  const state=await t.get('meta','smart-filter');
  if(state?.mode!=='light'||state.phase!=='active'||!Object.entries(FILTER_VERSIONS).every(([k,v])=>state[k]===v))throw new ArchiveError('UNAVAILABLE');
  const items=[];
  for(const inputId of [...inputIds].sort()){
   const p=await inputProjection(this,t,inputId),row=await t.get('filterInputs',inputId);
   if(!p||!row||row.authorship!=='untouched'||row.userEdited||row.filterOverride!=='none'||authored(p.block,{contentRevision:p.contentRevision})||row.decision!=='uncertain'||row.basedOnContentRevision!==p.contentRevision||row.failed||row.presenceInvalid||!Object.entries(FILTER_VERSIONS).every(([k,v])=>row[k]===v))throw new ArchiveError('STALE_BASE');
   if(p.body.length>1024||new TextEncoder().encode(p.body).length>4096)throw new ArchiveError('STALE_BASE');
   const light=decideLight({text:p.body,...row});
   if(light.decision!=='uncertain'||!['context_insufficient','rule_no_match'].includes(light.reasonCode))throw new ArchiveError('STALE_BASE');
   for(const key of p.identities)if(await t.get('filterIntents',key))throw new ArchiveError('STALE_BASE');
   items.push({inputId,contentRevision:p.contentRevision,lastRemovalSequence:p.lastRemovalSequence,sourceRecordIds:p.sourceRecordIds,identities:p.identities,row,...(contentBounds?{bodyBytes:new TextEncoder().encode(p.body).length}:{})});
  }
  return {policyEpoch:state.policyEpoch,items};
 }
 async noChangeMaintenanceFilter(t,expected,decisions){
  if(!expected||!Array.isArray(expected.items)||!Array.isArray(decisions)||decisions.length!==expected.items.length)invalid();
  if(decisions.some(d=>!d||Object.keys(d).sort().join(',')!=='decision,inputId'||!['KEEP','INSUFFICIENT'].includes(d.decision))||new Set(decisions.map(d=>d.inputId)).size!==decisions.length)invalid();
  if(JSON.stringify(decisions.map(d=>d.inputId).sort())!==JSON.stringify(expected.items.map(d=>d.inputId).sort()))invalid();
  const actual=await this.maintenanceFilterSnapshot(t,expected.items.map(d=>d.inputId));
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw new ArchiveError('STALE_BASE');
  return {ok:true,disposition:'no_change',inputIds:actual.items.map(d=>d.inputId)};
 }
 async protect(t,b,reason,userEdited=false,prepared=null){
  prepared??=this.inputWorkingJournal?.protectionFor(t,b,reason,userEdited)??null;
  const portableAt=this.filterIntentJournal?await this.filterIntentJournal.authorize(t,prepared,b,reason,userEdited):null;
  await this.updateProtectedFilterRow(t,b,reason,userEdited);
  for(const key of await sourceKeys(t,b))await t.put('filterIntents',{id:key,keep:true,reason,at:portableAt??this.clock()});
 }
 async updateProtectedFilterRow(t,b,reason,userEdited){
  const meta=await t.get('inputStates',b.id);const row=await t.get('filterInputs',b.id)||this.initialFilter(b,meta,true);
  delete row.aiDecision;row.filterOverride='keep';row.userEdited||=userEdited;row.overrideReason=reason;row.overrideAt=this.clock();row.evaluationRevision++;row.failed=false;row.pendingKey=1;row.decision='keep';row.reasonCode='user_protected';delete row.filteredKey;await t.put('filterInputs',row);
 }
 async keepInput(id){if(!idOK(id))throw new ArchiveError('INVALID_REQUEST');const journal=this.filterIntentJournal,prepared=journal?await journal.prepareKeep(this,id):null;try{return await this.write(async t=>{const b=(await t.get('blocks',id))?.value;if(!b||b.excluded||b.branchStatus)invalid();await this.protect(t,b,'restored_from_filter',false,prepared);if(journal)await journal.commit(t,prepared);return {ok:true};});}finally{journal?.release(prepared);}}
 protectUserInput(id){if(!idOK(id))return Promise.reject(new ArchiveError('INVALID_REQUEST'));return this.write(async t=>{const b=(await t.get('blocks',id))?.value;if(!b)invalid();await this.protect(t,b,'user_edit',true);return {ok:true};});}
 async afterInputEdit(t,before,after,oldDoc,newDoc,request){
  await super.afterInputEdit(t,before,after,oldDoc,newDoc,request);
  for(let i=0;i<after.length;i++){const a=before[i],b=after[i],edited=a.libraryText!==b.libraryText||a.note!==b.note;if(edited||a.excluded&&!b.excluded||request.revisionReason==='restore')await this.protect(t,b,edited?'user_edit':'revision_restore',edited);}
 }
 async saveRecord(t,r,index){await super.saveRecord(t,r,index);if(r.sourceKey){const old=await t.get('filterIntents','legacy:'+r.id);if(old){if(this.filterIntentJournal)throw new ArchiveError('BNS_FILTER_WRITER_UNSUPPORTED');await t.put('filterIntents',{...old,id:r.sourceKey});await t.delete('filterIntents',old.id);}}}
 purge(id,permanent=false){if(this.filterIntentJournal)return Promise.reject(new ArchiveError('BNS_FILTER_WRITER_UNSUPPORTED'));return super.purge(id,permanent);}
 async beforeSourcePurge(t,records,blocks){
  if(this.filterIntentJournal)throw new ArchiveError('BNS_FILTER_WRITER_UNSUPPORTED');
  await super.beforeSourcePurge(t,records,blocks);
  for(const [id]of blocks)await t.delete('filterInputs',id);for(const r of records)await t.delete('filterIntents',r.sourceKey||'legacy:'+r.id);
 }
 async isFiltered(t,b,state,snapshot){
  if(b.excluded||b.branchStatus)return false;
  if((snapshot?.mode??state.mode)!=='light')return false;
  const row=await t.get('filterInputs',b.id),meta=await t.get('inputStates',b.id);
  if(!validFilterDecision(row,meta))return this.#aiFilter.hidden(t,b,row,meta,snapshot);
  if(snapshot&&row.decisionSequence>snapshot.sequence)return false;
  for(const key of await sourceKeys(t,b))if(await t.get('filterIntents',key))return false;
  return true;
 }
 page(options={}){return options.searchContext!==undefined?prepareInputSearchArrival(this,options).then(arrival=>this.pageRead(options,arrival)):this.pageRead(options);}
 async pageRead(options={},arrival=null){if(options.contextPositionOnly!==undefined&&typeof options.contextPositionOnly!=='boolean'||options.contextPositionOnly===true&&((options.view??'library')!=='library'||!idOK(options.contextInputId)||!idOK(options.documentId)))return Promise.reject(new ArchiveError('INVALID_REQUEST'));if(options.qualifyContext!==undefined&&typeof options.qualifyContext!=='boolean'||options.qualifyContext===true&&((options.view??'library')!=='library'||!idOK(options.contextInputId)||!idOK(options.documentId)))return Promise.reject(new ArchiveError('INVALID_REQUEST'));if(options.includeFiltered!==undefined&&typeof options.includeFiltered!=='boolean')return Promise.reject(new ArchiveError('INVALID_REQUEST'));const annual=options.yearReading&&(options.view??'library')==='library'&&idOK(options.documentId),ready=annual?await advanceArchiveYearIndex(this,options.documentId):true;if(annual&&options.cursor?.[0]==='archive-year-build')options={...options,cursor:null};return this.run(()=>this.#withAIFilterVisibility(t=>filterVisibilityPageInputIds(t,options,ready),()=>this.repository.transaction(false,async t=>{
  const state=await t.get('meta','smart-filter');const snapshot=options.readingSnapshot??{mode:state.mode,sequence:state.decisionSequence};
  if(!snapshot||!['light','off'].includes(snapshot.mode)||!Number.isSafeInteger(snapshot.sequence)||snapshot.sequence<0)invalid();
  let queryOptions=options,contextUnavailable=false;const qualifiedContext=options.qualifyContext?await inputProjection(this,t,options.contextInputId):null;const scopeAvailable=!qualifiedContext||await matchesInputSearchArrival(this,t,qualifiedContext,arrival,state);
  if(options.contextInputId){if(!idOK(options.contextInputId))invalid();const ix=await t.get('blockIndex',options.contextInputId);if(!ix||ix.excluded||ix.documentId!==options.documentId||options.contextPositionOnly&&!options.includeFiltered&&await this.isFiltered(t,(await t.get('blocks',ix.id))?.value||{excluded:true},state,snapshot)||options.qualifyContext&&(!qualifiedContext||qualifiedContext.documentId!==options.documentId||!scopeAvailable)){contextUnavailable=true;options={...options,contextInputId:null,...(options.contextPositionOnly?{cursor:null}:{})};queryOptions=options;}else if(!options.cursor){if(options.yearReading){const year=archiveReadingYear(ix.sourceSentAt);queryOptions={...options,yearReading:{...options.yearReading,year:year??'undated',phase:year===null?'undated':'dated'}};}const descending=options.yearReading&&queryOptions.yearReading.phase==='undated'?false:(options.sort||(await t.get('meta','organizer-controls'))?.inputReadingSort||(options.yearReading?'desc':'asc'))==='desc';let cursor=null;await new Promise((resolve,reject)=>{const annual=!!options.yearReading,base=archiveYearPrefix(ix.documentId)+(queryOptions.yearReading?.phase==='undated'?'1:':'0:'),key=archiveYearKey(ix),target=annual?t.tx.objectStore('meta'):t.tx.objectStore('blockIndex').index('byList'),range=annual?(descending?IDBKeyRange.bound(key,base+'\uffff',true,true):IDBKeyRange.bound(base,key,false,true)):(descending?IDBKeyRange.bound(ix.listKey,[ix.documentId,0,[]],true,true):IDBKeyRange.bound([ix.documentId,0],ix.listKey,false,true));const req=target.openCursor(range,descending?'next':'prev');let n=0;req.onerror=()=>reject(new ArchiveError('STORAGE_FAILED'));req.onsuccess=()=>{const c=req.result;if(!c){resolve();return;}if(++n===3){cursor=c.key;resolve();return;}c.continue();};});queryOptions={...queryOptions,cursor:options.yearReading&&cursor?[cursor]:cursor};}}
  const result=await queryPage(t,await this.control(t),queryOptions,{ready,eligible:async ix=>{const b=(await t.get('blocks',ix.id))?.value;if(!b||b.excluded||b.documentId!==options.documentId)return false;return options.includeFiltered||!options.contextPositionOnly&&ix.id===options.contextInputId||!await this.isFiltered(t,b,state,snapshot);}});result.readingSnapshot=snapshot;result.contextUnavailable=contextUnavailable;
  if((options.view??'library')==='library'&&options.documentId){const visible=[],filtered=[];for(const id of result.pageItemIds){const b=result.library.blocks.find(b=>b.id===id);if(!b)continue;if(await this.isFiltered(t,b,state,snapshot)){filtered.push(id);if(options.includeFiltered||!options.contextPositionOnly&&id===options.contextInputId)visible.push(id);}else visible.push(id);}result.filteredPageItemIds=filtered;result.pageItemIds=visible;}
  if(options.qualifyContext){result.contextInputRevision=contextUnavailable?null:qualifiedContext.contentRevision;if(contextUnavailable){result.pageItemIds=[];result.nextCursor=null;}}
  return result;
 })));}
 async scopeSearchToProject(result,selectedProject){
  if(!selectedProject||!result.items.length)return result;
  const ids=[...new Set(result.items.map(item=>item.documentId))];
  const documents=await this.repository.transaction(false,async t=>Promise.all(ids.map(id=>t.get('documents',id))),['documents']);
  const structureIds=await Promise.all(documents.map(async row=>{
   const doc=row?.value;
   if(!doc?.sourceConversationId||doc.platform!==selectedProject.providerKey)return null;
   try{return await conversationMetaId({platform:doc.platform,sourceConversationId:doc.sourceConversationId});}
   catch{return null;}
  }));
  const conversations=await this.repository.transaction(false,async t=>Promise.all(structureIds.map(id=>id?t.get('meta',id):null)),['meta']);
  const expected=JSON.stringify(selectedProject),allowed=new Set();
  for(let i=0;i<ids.length;i++){
   const membership=conversations[i]?.membership;
   if(membership?.state!=='project')continue;
   try{if(JSON.stringify(canonicalProjectRef(membership.projectRef))===expected)allowed.add(ids[i]);}
   catch{/* Unknown or malformed source membership is never inferred. */}
  }
  return {...result,items:result.items.filter(item=>allowed.has(item.documentId))};
 }
 async searchSourcePaths(result){
  const paths=new Map(),ids=[...new Set(result.items.map(item=>item.documentId))];
  // Search pages stay in their original order. Each metadata batch is bounded;
  // SourceStructure's provider-qualified keys are hashed outside IDB lifetimes.
  for(let offset=0;offset<ids.length;offset+=50){
   const batch=ids.slice(offset,offset+50);
   const documents=await this.repository.transaction(false,t=>Promise.all(batch.map(id=>t.get('documents',id))),['documents']);
   const prepared=await Promise.all(documents.map(async row=>{
    const doc=row?.value,providerKey=validProvider(doc?.platform)?doc.platform:null;
    const ref=providerKey&&doc?.sourceConversationId?{platform:providerKey,sourceConversationId:doc.sourceConversationId}:null;
    return {providerKey,conversationId:ref?await conversationMetaId(ref):null};
   }));
   await this.repository.transaction(false,async t=>{for(const item of prepared)if(item.conversationId)item.conversation=await t.get('meta',item.conversationId);},['meta']);
   for(const item of prepared){
    const ref=item.conversation?.membership?.state==='project'?item.conversation.membership.projectRef:null;
    item.projectRef=ref&&ref.providerKey===item.providerKey?canonicalProjectRef(ref):null;
    item.projectId=item.projectRef?await projectMetaId(item.projectRef):null;
   }
   const projects=await this.repository.transaction(false,t=>Promise.all(prepared.map(item=>item.projectId?t.get('meta',item.projectId):null)),['meta']);
   prepared.forEach((item,index)=>{
    const c=item.conversation,p=projects[index],last=c?.lastKnownSourceProject;
    paths.set(batch[index],{providerKey:item.providerKey,sourceStatus:c?.sourceStatus||'unknown',
     membership:c?.membership?.state||'unknown',
     project:item.projectRef?{ref:item.projectRef,name:p?.currentName??null,sourceStatus:p?.sourceStatus||'unknown'}:null,
     lastKnownProject:last?.projectRef?.providerKey===item.providerKey?{ref:canonicalProjectRef(last.projectRef),name:last.name}:null});
   });
  }
  return {...result,items:result.items.map(item=>({...item,sourcePath:paths.get(item.documentId)}))};
 }
 searchInputs(options={}){
  const search=async()=>this.searchSourcePaths(await this.searchInputsLegacy(options));
  if(options.qualified===true)return qualifiedInputSearch(this,options,search);
  if(options.qualified!==undefined&&options.qualified!==false||options.searchSnapshot!==undefined&&options.searchSnapshot!==null)return Promise.reject(new ArchiveError('INVALID_REQUEST'));
  return search();
 }
 searchInputsLegacy({query='',cursor=null,limit=50,ranked=false,providerKey=null,projectRef:requestedProject=null,includeFiltered=true,dateFrom='',dateTo=''}={}){let selectedProject;try{selectedProject=requestedProject===null?null:canonicalProjectRef(requestedProject);}catch{return Promise.reject(new ArchiveError('INVALID_REQUEST'));}if(!validSearchDate(dateFrom)||!validSearchDate(dateTo)||dateFrom&&dateTo&&dateFrom>dateTo||typeof query!=='string'||query.length>1000||!Number.isInteger(limit)||limit<1||limit>100||providerKey!==null&&!validProvider(providerKey)||typeof includeFiltered!=='boolean'||cursor!==null&&(ranked?(![0,1,2].includes(cursor.phase)||cursor.offset!==null&&(!Number.isSafeInteger(cursor.offset)||cursor.offset<0)):(!Number.isSafeInteger(cursor)||cursor<0)))return Promise.reject(new ArchiveError('INVALID_REQUEST'));return this.run(async()=>{
  const needle=query.normalize('NFKC').trim().toLocaleLowerCase();
  if(ranked&&needle){
   const {generation,count}=await this.repository.transaction(false,async t=>({generation:(await t.get('meta','backup-data-generation'))?.value||0,count:await t.count('blockIndex')}));
   if(count>=1000&&count<=100000){
    if(this.inputSearchCache?.generation!==generation)this.inputSearchCache=await buildInputSearchCache(this.repository,generation);
    if(this.inputSearchCache&&!this.inputSearchCache.unavailable){
     const found=lookupInputSearchCache(this.inputSearchCache,{needle,cursor,limit,providerKey,dateFrom,dateTo});
     const result=await this.#withAIFilterVisibility(async()=>found.items.map(x=>x.id),()=>this.repository.transaction(false,async t=>{
      if(((await t.get('meta','backup-data-generation'))?.value||0)!==generation)return null;
      const state=await t.get('meta','smart-filter'),items=[];
      for(const row of found.items){const b=(await t.get('blocks',row.id))?.value;if(!b||b.excluded||b.branchStatus)continue;const filtered=await this.isFiltered(t,b,state);if(filtered&&!includeFiltered)continue;items.push({id:row.id,documentId:row.documentId,text:row.text,title:row.title,rank:row.rank,sourceSentAt:row.sourceSentAt,filtered});}
      return {items:rankSearchPage(items),nextCursor:found.nextCursor};
     }));
     if(result)return this.scopeSearchToProject(result,selectedProject);
     this.inputSearchCache=null;
    }
   }else this.inputSearchCache=null;
  }
  return this.scopeSearchToProject(await this.searchInputsScan({query,cursor,limit,ranked,providerKey,includeFiltered,dateFrom,dateTo}),selectedProject);
 });}
 searchInputsScan({query='',cursor=null,limit=50,ranked=false,providerKey=null,includeFiltered=true,dateFrom='',dateTo=''}={}){return this.#withAIFilterVisibility(async t=>(await t.page('blockIndex',{index:'bySequence',after:(ranked?cursor?.offset:cursor)??undefined,limit:200})).rows.filter(x=>!x.value.excluded).map(x=>x.value.id),()=>this.repository.transaction(false,async t=>{
  const state=await t.get('meta','smart-filter'),needle=query.normalize('NFKC').trim().toLocaleLowerCase(),items=[],documents=new Map(),phase=ranked?(cursor?.phase||0):null,offset=ranked?cursor?.offset:cursor;const next=offset=>ranked?(offset!==null?{phase,offset}:phase<2?{phase:phase+1,offset:null}:null):offset;if(!needle)return {items,nextCursor:null};const page=await t.page('blockIndex',{index:'bySequence',after:offset??undefined,limit:200});let last=offset;
  for(const {key,value:ix}of page.rows){last=key;if(ix.excluded)continue;if(!documents.has(ix.documentId))documents.set(ix.documentId,(await t.get('documents',ix.documentId))?.value);const doc=documents.get(ix.documentId);if(!doc||providerKey&&doc.platform!==providerKey||!matchesSourceDate(ix.sourceSentAt,dateFrom,dateTo))continue;const title=doc.userTitle||doc.originalConversationTitle,titleRank=searchRank(needle,title);if(ranked&&(phase<2?titleRank!==phase:titleRank>=0))continue;const b=(await t.get('blocks',ix.id))?.value;if(!b||b.branchStatus)continue;const r=b.originalTextReference?(await t.get('records',b.originalTextReference))?.value:null,text=b.libraryText??r?.originalText??'';
   const rank=searchRank(needle,title,text+' '+(b.note||''));if(rank<0||ranked&&rank!==phase)continue;
   const filtered=await this.isFiltered(t,b,state);if(filtered&&!includeFiltered)continue;items.push({id:b.id,documentId:b.documentId,text,title,rank,sourceSentAt:ix.sourceSentAt,filtered});if(items.length===limit)return {items:rankSearchPage(items),nextCursor:next(last)};
  }return {items:rankSearchPage(items),nextCursor:next(page.next)};
 }));}
 recentFiltered({cursor=null,limit=50,query=''}={}){if(typeof query!=='string'||query.length>1000||!Number.isInteger(limit)||limit<1||limit>100||cursor!==null&&(!Array.isArray(cursor)||cursor.length!==3||cursor[0]!==0||!Number.isSafeInteger(cursor[1])||!idOK(cursor[2])))return Promise.reject(new ArchiveError('INVALID_REQUEST'));return this.run(()=>this.#withAIFilterVisibility(async t=>(await t.rangePage('filterInputs','byFiltered',prefix([0]),cursor,limit)).rows.map(x=>x.value.id),()=>this.repository.transaction(false,async t=>{
  const page=await t.rangePage('filterInputs','byFiltered',prefix([0]),cursor,limit),items=[];
  for(const {value:row}of page.rows){const b=(await t.get('blocks',row.id))?.value;if(!b||b.excluded||b.branchStatus||!await this.isFiltered(t,b,{mode:'light'}))continue;const doc=(await t.get('documents',b.documentId))?.value,r=b.originalTextReference?(await t.get('records',b.originalTextReference))?.value:null;const text=b.libraryText??r?.originalText??'',title=doc?.userTitle||doc?.originalConversationTitle||'';if(query.trim()&&![text,title].some(v=>v.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())))continue;items.push({id:b.id,documentId:b.documentId,text,title,sourceSentAt:r?.sourceSentAt??null,evaluatedAt:row.evaluatedAt,reason:FILTER_REASONS[row.reasonCode]||FILTER_REASONS.uncertain});}
  return {items,nextCursor:page.next};
 })));}
 // Internal candidate/context contract only; no Organizer or public Memory endpoint.
 async validateThoughtInput(t,b){if(await this.isFiltered(t,b,await t.get('meta','smart-filter')))invalid();}
 inputEligibility(id,{contextOnly=false,anchorId=null}={}){if(!idOK(id))return Promise.reject(new ArchiveError('INVALID_REQUEST'));return this.run(()=>this.#withAIFilterVisibility(async()=>[id,...(contextOnly&&idOK(anchorId)?[anchorId]:[])],()=>this.repository.transaction(false,async t=>{
  const b=(await t.get('blocks',id))?.value;if(!b||b.excluded||b.branchStatus)return {eligible:false};const state=await t.get('meta','smart-filter'),filtered=await this.isFiltered(t,b,state);
  if(contextOnly){if(!idOK(anchorId)||anchorId===id)return {eligible:false};const anchor=(await t.get('blocks',anchorId))?.value;if(!anchor||anchor.excluded||anchor.branchStatus||anchor.documentId!==b.documentId||await this.isFiltered(t,anchor,state))return {eligible:false};const a=await t.get('blockIndex',anchorId),x=await t.get('blockIndex',id);const cmp=this.repository.factory.cmp(a.listKey,x.listKey),range=IDBKeyRange.bound(cmp<0?a.listKey:x.listKey,cmp<0?x.listKey:a.listKey);if(await t.count('blockIndex','byList',range)>3)return {eligible:false};}
  return {eligible:!filtered||contextOnly,role:contextOnly?'context_only':'primary',contentRevision:(await t.get('inputStates',id))?.contentRevision};
 })));}
}
