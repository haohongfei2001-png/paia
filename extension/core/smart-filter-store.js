import {searchRank,rankSearchPage} from './search-ranking.js';
import {IAStore} from './ia-store.js';
import {ArchiveError} from './constants.js';
import {queryPage} from './archive-query.js';
import {identifySource,hashText} from './dedupe.js';
import {decideLight,normalizePresence,validFilterDecision,FILTER_VERSIONS,FILTER_REASONS,UNCERTAIN_REASONS} from './smart-filter.js';

const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
const prefix=p=>IDBKeyRange.bound(p,[...p,[]],false,true);
const idOK=id=>typeof id==='string'&&id.length>0&&id.length<=200;
const sourceKeys=async(t,b)=>{const keys=[];for(const p of b.provenance){const r=await t.get('recordIndex',p.sourceRecordId);if(r)keys.push(r.sourceKey||'legacy:'+r.id);}return keys;};
const authored=(b,m)=>b.libraryText!==null||!!b.note||b.editedAt!==null||m?.contentRevision>0||b.provenance.length!==1||b.mergedSourceIds?.length>1;

export class SmartFilterStore extends IAStore {
 constructor(local,options={}){super(local,{...options,smartFilter:true});this.filterLoaded=false;this.filterMutation=0;}
 write(fn){this.filterMutation++;return super.write(fn).finally(()=>{this.filterMutation++;});}
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
 initialFilter(b,m,legacy=false){return {id:b.id,documentId:b.documentId,authorship:legacy?'legacy_unknown':authored(b,m)?'user_edited':'untouched',userEdited:authored(b,m),filterOverride:authored(b,m)?'keep':'none',presence:null,evaluationRevision:0,pendingKey:0,decision:'uncertain',reasonCode:'metadata_unknown',...FILTER_VERSIONS,basedOnContentRevision:m?.contentRevision??0};}
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
 setFilterMode(mode){if(!['light','off'].includes(mode))return Promise.reject(new ArchiveError('INVALID_REQUEST'));return this.write(async t=>{const row=await t.get('meta','smart-filter');if(row.mode!==mode){row.mode=mode;row.policyEpoch++;await t.put('meta',row);}return {ok:true,mode};});}
 takeFilterNotice(){return this.write(async t=>{const row=await t.get('meta','smart-filter');const show=row.noticePending&&row.mode==='light';if(show){row.noticePending=false;row.noticeShownAt=this.clock();await t.put('meta',row);}return {show};});}
 recoverFilters(){this.filterMutation++;return this.run(async()=>{await this.repository.transaction(true,async t=>{const row=await t.get('meta','smart-filter');row.phase='upgrading_policy';row.cursor=null;row.taskState='idle';await t.put('meta',row);});this.filterLoaded=false;await this.initializeFilter();this.filterLoaded=true;return {ok:true};}).finally(()=>{this.filterMutation++;});}
 setFilterTask(state){if(!['idle','running','failed'].includes(state))return Promise.reject(new ArchiveError('INVALID_REQUEST'));return this.write(async t=>{const row=await t.get('meta','smart-filter');row.taskState=state;if(state!=='running')row.lastCheckedAt=Date.parse(this.clock());await t.put('meta',row);if(state==='failed')for(const input of await t.all('filterInputs','byPending',0,50)){input.failed=true;await t.put('filterInputs',input);}});}
 async filterDiagnostics(){
  // Each read transaction is bounded; capture can run between pages. Never return IDs or body fields.
  for(let attempt=0;attempt<3;attempt++){
   await this.run(()=>Promise.resolve());const generation=this.filterMutation;
   const totals={active:0,checked:0,pending:0,keep:0,filter:0,uncertain:0,userProtected:0,failed:0};const reasonCounts=Object.fromEntries(Object.keys(FILTER_REASONS).map(k=>[k,0])),uncertainReasonCounts=Object.fromEntries(UNCERTAIN_REASONS.map(k=>[k,0]));let cursor=null,state;
   do{cursor=await this.run(()=>this.repository.transaction(false,async t=>{
    state=await t.get('meta','smart-filter');const page=await t.page('blockIndex',{index:'bySequence',after:cursor??undefined,limit:100});
    for(const {value:ix}of page.rows){if(ix.excluded)continue;const b=(await t.get('blocks',ix.id))?.value;if(!b||b.branchStatus)continue;totals.active++;
     const row=await t.get('filterInputs',ix.id),meta=await t.get('inputStates',ix.id);let protectedInput=!!(row?.userEdited||row?.filterOverride==='keep');
     for(const key of await sourceKeys(t,b))if(await t.get('filterIntents',key))protectedInput=true;
     if(protectedInput){totals.checked++;totals.keep++;totals.userProtected++;reasonCounts.user_protected++;continue;}
     const valid=row?.evaluatedAt&&row.pendingKey!==0&&row.basedOnContentRevision===meta?.contentRevision&&Object.entries(FILTER_VERSIONS).every(([k,v])=>row[k]===v);
     if(!valid){totals.pending++;if(row?.failed)totals.failed++;continue;}
     const reason=Object.hasOwn(FILTER_REASONS,row.reasonCode)?row.reasonCode:'other';reasonCounts[reason]++;if(row.decision==='uncertain')uncertainReasonCounts[UNCERTAIN_REASONS.includes(reason)?reason:'other']++;totals.checked++;if(await this.isFiltered(t,b,{mode:'light'}))totals.filter++;else if(row.decision==='keep')totals.keep++;else totals.uncertain++;
    }return page.next;
   }));}while(cursor!==null&&generation===this.filterMutation);
   if(generation===this.filterMutation)return {...totals,previousReasonState:state.previousReasonState==='available'?'available':'not_captured',previousReasonPolicyVersion:Number.isSafeInteger(state.previousReasonPolicyVersion)?state.previousReasonPolicyVersion:0,previousUncertainReasonCounts:Object.fromEntries(UNCERTAIN_REASONS.map(k=>[k,Number.isSafeInteger(state.previousUncertainReasons?.[k])&&state.previousUncertainReasons[k]>=0?state.previousUncertainReasons[k]:0])),reasonCounts,uncertainReasonCounts,reasonTaxonomyVersion:2,mode:state.mode==='off'?'off':'light',filterRatio:totals.active?totals.filter/totals.active:0,filterVersion:FILTER_VERSIONS.filterVersion,policyVersion:FILTER_VERSIONS.policyVersion,classifierVersion:FILTER_VERSIONS.classifierVersion,lastCheckedAt:Number.isFinite(state.lastCheckedAt)?state.lastCheckedAt:0,taskState:state.mode==='off'?'paused':['idle','running','failed'].includes(state.taskState)?state.taskState:'idle'};
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
    row.failed=false;row.pendingKey=1;row.basedOnContentRevision=item.contentRevision;row.evaluatedAt=this.clock();row.decisionSequence=++state.decisionSequence;delete row.filteredKey;if(row.decision==='filter')row.filteredKey=[0,-row.decisionSequence,row.id];await t.put('filterInputs',row);processed++;
   }
   await t.put('meta',state);return {processed};
  });
 }
 async protect(t,b,reason,userEdited=false){
  const meta=await t.get('inputStates',b.id);const row=await t.get('filterInputs',b.id)||this.initialFilter(b,meta,true);
  row.filterOverride='keep';row.userEdited||=userEdited;row.overrideReason=reason;row.overrideAt=this.clock();row.evaluationRevision++;row.failed=false;row.pendingKey=1;row.decision='keep';row.reasonCode='user_protected';delete row.filteredKey;await t.put('filterInputs',row);
  for(const key of await sourceKeys(t,b))await t.put('filterIntents',{id:key,keep:true,reason,at:this.clock()});
 }
 keepInput(id){if(!idOK(id))return Promise.reject(new ArchiveError('INVALID_REQUEST'));return this.write(async t=>{const b=(await t.get('blocks',id))?.value;if(!b||b.excluded||b.branchStatus)invalid();await this.protect(t,b,'restored_from_filter');return {ok:true};});}
 protectUserInput(id){if(!idOK(id))return Promise.reject(new ArchiveError('INVALID_REQUEST'));return this.write(async t=>{const b=(await t.get('blocks',id))?.value;if(!b)invalid();await this.protect(t,b,'user_edit',true);return {ok:true};});}
 async afterInputEdit(t,before,after,oldDoc,newDoc,request){
  await super.afterInputEdit(t,before,after,oldDoc,newDoc,request);
  for(let i=0;i<after.length;i++){const a=before[i],b=after[i],edited=a.libraryText!==b.libraryText||a.note!==b.note;if(edited||a.excluded&&!b.excluded||request.revisionReason==='restore')await this.protect(t,b,edited?'user_edit':'revision_restore',edited);}
 }
 async saveRecord(t,r,index,options={}){await super.saveRecord(t,r,index,options);if(!options.newRecord&&r.sourceKey){const old=await t.get('filterIntents','legacy:'+r.id);if(old){await t.put('filterIntents',{...old,id:r.sourceKey});await t.delete('filterIntents',old.id);}}}
 async beforeSourcePurge(t,records,blocks){
  await super.beforeSourcePurge(t,records,blocks);
  for(const [id]of blocks)await t.delete('filterInputs',id);for(const r of records)await t.delete('filterIntents',r.sourceKey||'legacy:'+r.id);
 }
 async isFiltered(t,b,state,snapshot){
  if(b.excluded||b.branchStatus)return false;
  if((snapshot?.mode??state.mode)!=='light')return false;
  const row=await t.get('filterInputs',b.id),meta=await t.get('inputStates',b.id);
  if(!validFilterDecision(row,meta)||snapshot&&row.decisionSequence>snapshot.sequence)return false;
  for(const key of await sourceKeys(t,b))if(await t.get('filterIntents',key))return false;
  return true;
 }
 page(options={}){return this.run(()=>this.repository.transaction(false,async t=>{
  const state=await t.get('meta','smart-filter');const snapshot=options.readingSnapshot??{mode:state.mode,sequence:state.decisionSequence};
  if(!snapshot||!['light','off'].includes(snapshot.mode)||!Number.isSafeInteger(snapshot.sequence)||snapshot.sequence<0)invalid();
  let queryOptions=options;
  if(options.contextInputId){if(!idOK(options.contextInputId))invalid();const ix=await t.get('blockIndex',options.contextInputId);if(!ix||ix.excluded||ix.documentId!==options.documentId)invalid();if(!options.cursor){const descending=(options.sort||(await t.get('meta','organizer-controls'))?.inputReadingSort)==='desc';let cursor=null;await new Promise((resolve,reject)=>{const req=t.tx.objectStore('blockIndex').index('byList').openCursor(descending?IDBKeyRange.bound(ix.listKey,[ix.documentId,0,[]],true,true):IDBKeyRange.bound([ix.documentId,0],ix.listKey,false,true),descending?'next':'prev');let n=0;req.onerror=()=>reject(new ArchiveError('STORAGE_FAILED'));req.onsuccess=()=>{const c=req.result;if(!c){resolve();return;}if(++n===3){cursor=c.key;resolve();return;}c.continue();};});queryOptions={...options,cursor};}}
  const result=await queryPage(t,await this.control(t),queryOptions);result.readingSnapshot=snapshot;
  if((options.view??'library')==='library'&&options.documentId&&!options.contextInputId){const visible=[];for(const id of result.pageItemIds){const b=result.library.blocks.find(b=>b.id===id);if(b&&!await this.isFiltered(t,b,state,snapshot))visible.push(id);}result.pageItemIds=visible;}
  return result;
 }));}
 searchInputs({query='',cursor=null,limit=50,ranked=false}={}){if(typeof query!=='string'||query.length>1000||!Number.isInteger(limit)||limit<1||limit>100||cursor!==null&&(ranked?(![0,1,2].includes(cursor.phase)||cursor.offset!==null&&(!Number.isSafeInteger(cursor.offset)||cursor.offset<0)):(!Number.isSafeInteger(cursor)||cursor<0)))return Promise.reject(new ArchiveError('INVALID_REQUEST'));return this.run(()=>this.repository.transaction(false,async t=>{
  const state=await t.get('meta','smart-filter'),needle=query.normalize('NFKC').trim().toLocaleLowerCase(),items=[],documents=new Map(),phase=ranked?(cursor?.phase||0):null,offset=ranked?cursor?.offset:cursor;const next=offset=>ranked?(offset!==null?{phase,offset}:phase<2?{phase:phase+1,offset:null}:null):offset;if(!needle)return {items,nextCursor:null};const page=await t.page('blockIndex',{index:'bySequence',after:offset??undefined,limit:200});let last=offset;
  for(const {key,value:ix}of page.rows){last=key;if(ix.excluded)continue;if(!documents.has(ix.documentId))documents.set(ix.documentId,(await t.get('documents',ix.documentId))?.value);const doc=documents.get(ix.documentId);if(!doc)continue;const title=doc.userTitle||doc.originalConversationTitle,titleRank=searchRank(needle,title);if(ranked&&(phase<2?titleRank!==phase:titleRank>=0))continue;const b=(await t.get('blocks',ix.id))?.value;if(!b||b.branchStatus)continue;const r=b.originalTextReference?(await t.get('records',b.originalTextReference))?.value:null,text=b.libraryText??r?.originalText??'';
   const rank=searchRank(needle,title,text+' '+(b.note||''));if(rank<0||ranked&&rank!==phase)continue;
   items.push({id:b.id,documentId:b.documentId,text,title,rank,sourceSentAt:ix.sourceSentAt,filtered:await this.isFiltered(t,b,state)});if(items.length===limit)return {items:rankSearchPage(items),nextCursor:next(last)};
  }return {items:rankSearchPage(items),nextCursor:next(page.next)};
 }));}
 recentFiltered({cursor=null,limit=50,query=''}={}){if(typeof query!=='string'||query.length>1000||!Number.isInteger(limit)||limit<1||limit>100||cursor!==null&&(!Array.isArray(cursor)||cursor.length!==3||cursor[0]!==0||!Number.isSafeInteger(cursor[1])||!idOK(cursor[2])))return Promise.reject(new ArchiveError('INVALID_REQUEST'));return this.run(()=>this.repository.transaction(false,async t=>{
  const page=await t.rangePage('filterInputs','byFiltered',prefix([0]),cursor,limit),items=[];
  for(const {value:row}of page.rows){const b=(await t.get('blocks',row.id))?.value;if(!b||b.excluded||b.branchStatus||!await this.isFiltered(t,b,{mode:'light'}))continue;const doc=(await t.get('documents',b.documentId))?.value,r=b.originalTextReference?(await t.get('records',b.originalTextReference))?.value:null;const text=b.libraryText??r?.originalText??'',title=doc?.userTitle||doc?.originalConversationTitle||'';if(query.trim()&&![text,title].some(v=>(v||'').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())))continue;items.push({id:b.id,documentId:b.documentId,text,title,sourceSentAt:r?.sourceSentAt??null,evaluatedAt:row.evaluatedAt,reason:FILTER_REASONS[row.reasonCode]||FILTER_REASONS.uncertain});}
  return {items,nextCursor:page.next};
 }));}
 // Internal candidate/context contract only; no Organizer or public Memory endpoint.
 async validateThoughtInput(t,b){if(await this.isFiltered(t,b,await t.get('meta','smart-filter')))invalid();}
 inputEligibility(id,{contextOnly=false,anchorId=null}={}){if(!idOK(id))return Promise.reject(new ArchiveError('INVALID_REQUEST'));return this.run(()=>this.repository.transaction(false,async t=>{
  const b=(await t.get('blocks',id))?.value;if(!b||b.excluded||b.branchStatus)return {eligible:false};const state=await t.get('meta','smart-filter'),filtered=await this.isFiltered(t,b,state);
  if(contextOnly){if(!idOK(anchorId)||anchorId===id)return {eligible:false};const anchor=(await t.get('blocks',anchorId))?.value;if(!anchor||anchor.excluded||anchor.branchStatus||anchor.documentId!==b.documentId||await this.isFiltered(t,anchor,state))return {eligible:false};const a=await t.get('blockIndex',anchorId),x=await t.get('blockIndex',id);const cmp=this.repository.factory.cmp(a.listKey,x.listKey),range=IDBKeyRange.bound(cmp<0?a.listKey:x.listKey,cmp<0?x.listKey:a.listKey);if(await t.count('blockIndex','byList',range)>3)return {eligible:false};}
  return {eligible:!filtered||contextOnly,role:contextOnly?'context_only':'primary',contentRevision:(await t.get('inputStates',id))?.contentRevision};
 }));}
}
