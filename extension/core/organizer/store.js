import {AIUsageFoundation} from '../ai-usage/foundation.js';
import {rootReadAuthority,invalidRootRead,validateRootRead,compactTopic,compactSearchResult} from './root-read.js';
import {thoughtTopicGenerationMatches} from '../thought-read-index.js';
import {validateRemovalEdit} from '../archive-removal.js';
import {sourceRootPage} from '../thought-root-source-scope.js';
import {recoverAIDraft} from './ai-draft.js';
import {changeTopicContainer,removedTopics} from '../topic-governance.js';
import {topicReadingPage,topicSectionsPage,topicAdjacency} from './topic-reading.js';
import {topicTimelinePage} from './topic-timeline.js';
import {topicRootExcerpt} from './topic-excerpt.js';
import {importedTimeChanged} from '../import/library-integration.js';
import {topicMergeSuggestions,keepTopicsSeparate,topicRenameSuggestions} from './topic-quality.js';
import {entryTime,ensureTopicChronology} from './topic-chronology.js';
import {organizerControls,setOrganizerControls} from './controls.js';
import {planDynamicOriginalBatch} from './original-batch.js';
import {aiPresentationStatus,editAIPresentation,aiPresentationRevisions,aiPresentationOperationOutcome,searchSavedAI} from './ai-presentation.js';
import {safeOrganization,clearDerivedMetadata,sanitizePage} from './metadata.js';
import {LibraryDocumentsStore} from '../library-documents-store.js';
import {UniversalSearchService} from '../universal-search.js';
import {hashText} from '../dedupe.js';
import {prefix,keys,idOK} from '../thought-model.js';
import {nextSequence} from '../thought-journal.js';
import {inputProjection,checkEvidenceInTransaction} from '../thought-evidence.js';
import {BudgetPolicy,BudgetLedger} from './budget.js';
import {LibraryCommitService} from './commit.js';
import {ActionPolicy} from './policy.js';
import {reject} from './contracts.js';
import {planDelta,dualViewStatus,previewAIDelta,setOriginalAutoUpdate} from '../dual-view.js';
import {enqueueOriginalWork,planOriginalWork,originalBootstrapStatus} from './original.js';
export class OrganizerStore extends LibraryDocumentsStore {
 constructor(local,options={}){super(local,options);this.organizerBudget=options.organizerBudget||new BudgetPolicy();this.organizerLedger=new BudgetLedger(this,this.organizerBudget);this.libraryCommit=new LibraryCommitService(this);this.aiUsageFoundation=new AIUsageFoundation(this);}
 safeOrganization(t,kind,row){return safeOrganization(this,t,kind,row);}
 clearDerivedMetadata(t,marker){return clearDerivedMetadata(this,t,marker);}
 async canonicalTopic(t,id){return safeOrganization(this,t,'topic',await super.canonicalTopic(t,id));}
 async libraryIndexPage(o={}){
  validateRootRead(o);await this.finishFoundation();
  const readScope={search:!!o.query?.trim()},authority=await this.run(()=>this.repository.transaction(false,t=>rootReadAuthority(t,readScope),['meta','libraryMigrationItems']));
  const expected=o.authority??o.cursor?.authority;if(expected&&expected!==authority||o.authority&&o.cursor?.authority&&o.authority!==o.cursor.authority)return invalidRootRead();
  const scoped=o.providerKey!==undefined&&o.providerKey!==null,query=(o.query||'').trim();
  const page=scoped?await sourceRootPage(this,o,({query,cursor,limit})=>query?this.searchLibrary({query,cursor,limit}):super.libraryIndexPage({mode:'stable',cursor,limit})):query?await this.searchRoot({query,cursor:o.cursor,limit:o.limit||40}):await super.libraryIndexPage(o);
  if(page.cursorInvalid)return invalidRootRead();
  return this.run(()=>this.repository.transaction(false,async t=>{
   if(await rootReadAuthority(t,readScope)!==authority)return invalidRootRead();
   const items=[];
   for(const raw of page.items){
    if(query){items.push(compactSearchResult(raw));continue;}
    const live=await t.get('topics',raw.id);if(!live||live.lifecycle!=='active'||live.redirectTo)return invalidRootRead();
    const topic=await safeOrganization(this,t,'topic',{...live,visibleEntryCount:raw.visibleEntryCount,countComplete:raw.countComplete,countApproximate:raw.countApproximate,compatibilityUnavailable:raw.compatibilityUnavailable});
    items.push(compactTopic(topic,topic.activeLayoutGeneration?await topicRootExcerpt(this,t,topic,o.providerKey??null):null));
   }
   return {...page,items,authority,nextCursor:page.nextCursor?{...page.nextCursor,authority}:null,recent:(page.recent||[]).map(row=>({id:row.id,readAt:row.readingActivity?.at??null}))};
  }));
 }
 searchSavedAI(o){return searchSavedAI(this,o);}
 async searchRoot({query,cursor=null,limit=40}){
  const normalized=query.trim().normalize('NFKC').toLocaleLowerCase();if(cursor&&(cursor.mode!=='compact_root_search'||cursor.query!==normalized))return invalidRootRead();
  if(cursor?.phase==='ai')return this.searchSavedAI({query,cursor:cursor.key,limit});
  const page=await this.searchLibrary({query,cursor:cursor?.key||null,limit});
  return {...page,nextCursor:page.nextCursor?{mode:'compact_root_search',query:normalized,phase:'library',key:page.nextCursor}:page.complete?{mode:'compact_root_search',query:normalized,phase:'ai',key:null}:null,complete:false};
 }
 // Read-only expression chronology; never use capture/model time as expression time.
 async readingEntry(id){
  // Evidence validation and chronology use separate bounded reads. An edit may
  // commit between them; retry the read, never publish mixed versions.
  for(let attempt=0;attempt<3;attempt++){
   let entry;try{entry=await this.entry(id);}catch(error){if(error?.code==='INVALID_REQUEST'&&attempt<2){await new Promise(resolve=>setTimeout(resolve,0));continue;}throw error;}
   const result=await this.run(()=>this.repository.transaction(false,async t=>{
    const current=await this.readableEntry(t,id);
    if(current.staleReasons?.includes('source_purged'))return {value:this.documentEntry({...current,body:current.thoughtText})};
    if(current.revision!==entry.revision)return {changed:true};
    return {value:{...this.documentEntry(entry),...await entryTime(t,id),createdAt:entry.createdAt,provenanceType:entry.provenanceType}};
   }));
   if(!result.changed)return result.value;
  }
  // Throw outside the transaction so a version conflict is not relabeled as
  // an IndexedDB failure. This performs no provider call or persistent write.
  reject('STALE_BASE');
 }
 async afterSourceTimeChanged(t,recordId){return importedTimeChanged(this,t,recordId);}
 async topicSectionsPage(o={}){return topicSectionsPage(this,o);}
 async topicAdjacency(o={}){return topicAdjacency(this,o);}
 async topicTimelinePage(o={}){return topicTimelinePage(this,o);}
 async topicDocumentPage(o={}){
  const view=o.view??'original';if(!['original','ai'].includes(view))reject('INVALID_OUTPUT');
  const scoped=o.providerKey!==undefined&&o.providerKey!==null;if(view==='original'&&o.chronology!=='expression'&&!o.sort&&!scoped)await ensureTopicChronology(this,o.topicId);const page=await sanitizePage(this,o.sort||scoped||o.chronology==='expression'?await topicReadingPage(this,{...o,sort:o.sort||'asc'}):await super.topicDocumentPage(o));if(page.cursorInvalid)return o.chronology==='expression'?{cursorInvalid:true,anchorUnavailable:page.anchorUnavailable===true,items:[],tracked:[],nextCursor:null,previousCursor:null,complete:false}:page;
  const items=view==='ai'?[]:await this.run(()=>this.repository.transaction(false,async t=>{const out=[];for(const item of page.items)out.push({...item,entry:{...item.entry,...await entryTime(t,item.entry.id),originalSource:false,originalInputId:null}});return out;}));
  if(o.chronology==='expression'&&!await thoughtTopicGenerationMatches(this,{topicId:o.topicId,generation:page.coverage?.activeGeneration,viewKey:page.coverage?.activeKey,currentKey:page.coverage?.currentKey,indexing:page.indexing===true}))return {cursorInvalid:true,items:[],tracked:[],nextCursor:null,previousCursor:null,complete:false};
  return {...page,items,view,viewState:view==='ai'?'not_updated':'automatic'};
 }
 removeTopic(r){return changeTopicContainer(this,r);}
 restoreTopicContainer(r){return changeTopicContainer(this,r,true);}
 removedTopics(options={}){return removedTopics(this,options);}
 topicRenameSuggestions(){return topicRenameSuggestions(this);}
 async topicMergeSuggestions(){return topicMergeSuggestions(this);}
 async keepTopicsSeparate(options){if(!options||!idOK(options.sourceId)||!idOK(options.targetId))reject('INVALID_OUTPUT');return keepTopicsSeparate(this,options);}
 async organizerControls(){return organizerControls(this);}
 async setOrganizerControls(changes){return setOrganizerControls(this,changes);}
 async recoveryDraftEpoch(){return this.run(()=>this.repository.transaction(false,async t=>(await t.get('meta','recovery-restore-epoch'))?.value||'initial',['meta']));}
 async recoveryDraftSourceIds(draft={}){
  const {kind,operation={},ownerId,sourceRecordIds=[]}=draft,edit=operation.edit;
  if(!idOK(ownerId)||!Array.isArray(sourceRecordIds)||sourceRecordIds.length>2000||sourceRecordIds.some(id=>!idOK(id)))reject('INVALID_REQUEST');
  return this.run(()=>this.repository.transaction(true,async t=>{
   const ids=new Set(),add=row=>{for(const id of row.sourceRecordIds||[])ids.add(id);if(row.sourceRecordId)ids.add(row.sourceRecordId);if(row.originalTextReference)ids.add(row.originalTextReference);for(const p of row.provenance||[])if(p?.sourceRecordId)ids.add(p.sourceRecordId);};
   const active=row=>{if(!row||row.lifecycle&&row.lifecycle!=='active'||row.quarantineSealed)reject('INVALID_REQUEST');return row;};
   // Ordinary revision conflicts remain recoverable. A Source-purge revision
   // boundary is different: an old editor must not cache deleted Source text.
   const purgeRevision=async(row,expected,purged,save)=>{
    if(!Number.isSafeInteger(expected)||expected<0)reject('INVALID_REQUEST');
    if(purged&&row.recoveryPurgeRevision===undefined){
     // Older local survivors have no recorded floor. Establish it at the
     // current revision; subsequent ordinary conflicts remain recoverable.
     row.recoveryPurgeRevision=row.revision;await save(row);
    }
    if(row.recoveryPurgeRevision!==undefined&&expected<row.recoveryPurgeRevision)reject('INVALID_REQUEST');
   };
   if(kind==='document'){
    if(operation.type!=='EDIT_DOCUMENT')reject('INVALID_REQUEST');
    let pending;
    if(operation.pendingRequest!==undefined){if(typeof operation.pendingRequest!=='string'||operation.pendingRequest.length>800000)reject('INVALID_REQUEST');try{pending=JSON.parse(operation.pendingRequest);}catch{reject('INVALID_REQUEST');}if(!pending?.restoreRevisionId&&!pending?.removeScope)reject('INVALID_REQUEST');}
    const edits=[edit,...(pending?[pending]:[])];
    for(const candidate of edits){
     if(candidate?.documentId!==ownerId||!Array.isArray(candidate.blocks)||candidate.blocks.length>1000||!await t.get('documents',ownerId))reject('INVALID_REQUEST');
     const refs=candidate.removeScope?validateRemovalEdit(candidate).members:candidate.blocks;
     for(const change of refs){const row=(await t.get('blocks',change.id))?.value;if(!row||row.documentId!==ownerId)reject('INVALID_REQUEST');const state=await t.get('inputStates',row.id);await purgeRevision(row,change.expectedRevision,state?.sourcePurged,value=>t.put('blocks',{id:value.id,value}));add(row);}
    }
   }else if(kind==='library_entry'){
    if(operation.type!=='EDIT_LIBRARY_BATCH'||edit?.entries?.length!==1||edit.entries[0].id!==ownerId)reject('INVALID_REQUEST');
    const row=active(await t.get('thoughts',ownerId));await purgeRevision(row,edit.entries[0].expectedRevision,row.staleReasons?.includes('source_purged'),value=>t.put('thoughts',value));add(row);
   }else if(kind==='ai_presentation'){
    if(operation.type!=='AI_RECOVERY_SNAPSHOT'||operation.topicId!==ownerId)reject('INVALID_REQUEST');
    active(await t.get('topics',ownerId));const presentation=await t.get('meta','aiPresentation:'+ownerId);if(!presentation||presentation.currentState==='none'||presentation.envelopeVersion!==undefined||(operation.generation??'legacy')!==(presentation.recoveryGeneration||'legacy'))reject('INVALID_REQUEST');
    await purgeRevision(presentation,operation.baseRevision,presentation.detachedUserFields,value=>t.put('meta',value));
    const fence=await t.get('libraryMigrationItems','ai-presentation-fence:'+ownerId);
    if(fence?.sourceRecordIds?.length)add(fence);
    for(const entryId of presentation.evidenceEntryIds||[])add(active(await t.get('thoughts',entryId)));
   }else if(kind==='topic_metadata'){
    if(operation.type!=='EDIT_LIBRARY_TOPIC'||edit?.id!==ownerId)reject('INVALID_REQUEST');
    const row=active(await t.get('topics',ownerId));if(row.redirectTo)reject('INVALID_REQUEST');await purgeRevision(row,edit.expectedRevision,row.sourceUnavailable,value=>t.put('topics',value));add(row);
   }else if(kind==='section_metadata'){
    if(operation.type!=='EDIT_LIBRARY_SECTION'||ownerId!==edit?.topicId+':'+edit?.sectionId)reject('INVALID_REQUEST');
    const topic=active(await t.get('topics',edit.topicId));if(topic.redirectTo)reject('INVALID_REQUEST');
    const row=active(await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,edit.sectionId])));await purgeRevision(row,edit.expectedRevision,row.sourceUnavailable,value=>t.put('sections',value));add(row);
   }else reject('INVALID_REQUEST');
   if(!await this.sourcePresent(t,[...ids]))reject('INVALID_REQUEST');
   return [...ids];
  }));
 }
 async aiPresentationRevisions(options){return aiPresentationRevisions(this,options);}
 async revisions(o={}){const page=await super.revisions(o);return {...page,items:page.items.filter(x=>x.kind!=='ai_presentation')};}
 recoverAIDraft(r){return recoverAIDraft(this,r);}
 async aiPresentationStatus(options){return aiPresentationStatus(this,options);}
 async aiPresentationOperationOutcome(options){return aiPresentationOperationOutcome(this,options);}
 async editAIPresentation(edit){return editAIPresentation(this,edit);}
 async dualViewStatus(){return dualViewStatus(this);}
 async previewAIDelta(){return previewAIDelta(this);}
 async nextOrganizerSequence(t){return nextSequence(t);}
 async queueOriginalOrganizer(options={}){return enqueueOriginalWork(this,options);}
 async originalOrganizerStatus(){let preview,plan;try{const p=await planDynamicOriginalBatch(this);plan=p;preview={inputCount:p.selected.length,approximateBytes:p.approximateBytes,approximateTokens:p.approximateTokens,maxInputs:p.maxInputs,maxRequests:p.selected.length?1:0};}catch(error){preview={inputCount:0,approximateBytes:0,maxRequests:0,error:error?.code==='BUDGET_EXCEEDED'?'BUDGET_EXCEEDED':'STALE_BASE'};}plan??=await planOriginalWork(this);const bootstrap=plan.bootstrap||await originalBootstrapStatus(this),state=await this.run(()=>this.repository.transaction(false,async t=>{const runtime=await t.get('meta','originalOrganizerRuntime')||{lastUpdatedAt:null,lastApiProcessed:0,state:'pending',lastError:null},pointer=await t.get('meta','originalProviderRequestCurrent'),request=pointer?.requestId?await t.get('meta','originalProviderRequest:'+pointer.requestId):null;const budget=await t.get('meta','organizer-budget'),terminal=await t.all('operationReceipts','byOwner',prefix(['original-simple-input'])),latest=new Map();for(const r of terminal.sort((a,b)=>a.createdAt.localeCompare(b.createdAt))){const old=latest.get(r.result.inputId);if(!old||(r.result.inputRevision??-1)>=(old.inputRevision??-1))latest.set(r.result.inputId,r.result);}const outcomes={organizedInputCount:[...latest.values()].filter(x=>x.status==='processed').length,manualRequiredInputCount:[...latest.values()].filter(x=>x.status==='manual_required').length};return {outcomes,runtime,request:runtime.requestId===undefined||request?.requestId===runtime.requestId?request:null,budget};},['meta','operationReceipts'])),runtime=state.runtime,request=state.request;const diagnostics={stage:request?.phase||runtime.stage||'idle',localWriteStep:request?.localWriteStep||runtime.localWriteStep||'none',dbErrorCategory:request?.dbErrorCategory||runtime.dbErrorCategory||null,batchStart:runtime.batchStart||null,batchEnd:runtime.batchEnd||null,selectedCount:runtime.selectedCount||0,apiInputCount:runtime.apiInputCount||0,providerRequestCount:runtime.providerRequestCount||0,providerRequestState:request?.state||null,providerStatus:runtime.providerStatus||'not_sent',validatorResult:runtime.validatorResult||'not_started',commitResult:runtime.commitResult||'not_started',validInputCount:runtime.validInputCount||0,manualInputCount:runtime.manualInputCount||0,approximateBytes:request?.approximateBytes||0,dailyRequestCount:state.budget?.daily?.requests||0,processedInputCount:runtime.processedInputCount||0,reasonCode:runtime.reasonCode||null,claimStatus:runtime.claimStatus||null,retryRemainingMs:runtime.retryRemainingMs||0,httpStatus:Number.isInteger(request?.httpStatus)?request.httpStatus:null,responseBytes:Number.isSafeInteger(request?.responseBytes)?request.responseBytes:0,committedItemCount:Number.isSafeInteger(request?.committedItemCount)?request.committedItemCount:0,traceInputCount:Number.isSafeInteger(request?.inputCount)?request.inputCount:0,lastErrorCode:request?.errorCode||runtime.lastErrorCode||runtime.lastError||bootstrap.lastError||null};return {...state.outcomes,preview,pendingInput:bootstrap.state==='completed'?plan.counts.addedInput+plan.counts.changedInput+plan.counts.removedInput:bootstrap.remainingInput,counts:plan.counts,lastUpdatedAt:runtime.lastUpdatedAt,lastApiProcessed:runtime.lastApiProcessed,state:request?.state==='committed'?'completed':['failed','outcome_unknown'].includes(request?.state)?'failed':runtime.state,lastError:request?.errorCode||runtime.lastError||bootstrap.lastError||null,bootstrap:{state:bootstrap.state,totalEligible:bootstrap.totalEligible,processed:bootstrap.processed,remainingInput:bootstrap.remainingInput},diagnostics};}
 async updateOriginalView(){return this.queueOriginalOrganizer();}
 async setOriginalAutoUpdate(enabled){return setOriginalAutoUpdate(this,enabled);}
 // Remote Original organization is manual-only in the cost-safe internal MVP.
 async autoUpdateOriginalView(){return null;}
 async entryPaths(id){const paths=await super.entryPaths(id);return this.run(()=>this.repository.transaction(false,async t=>{for(const path of paths){const topic=await this.canonicalTopic(t,path.topicId),section=await safeOrganization(this,t,'section',await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,path.sectionId])));path.topicName=topic.name;path.sectionTitle=section?.title||'';}return paths;}));}
 async searchInputs(o={}){if(o?.universal===true){const {universal,paged,...options}=o;const service=new UniversalSearchService(this,{aiStatus:()=>this.aiPresentationStatus()});return paged===true?service.page(options):service.search(options);}return super.searchInputs(o);}
 async searchLibrary(o){const page=await super.searchLibrary(o),query=o.query.trim().normalize('NFKC').toLocaleLowerCase();const items=[];for(const item of page.items){if(item.kind==='entry'){item.paths=await this.entryPaths(item.entryId);items.push(item);continue;}const safe=await this.run(()=>this.repository.transaction(false,async t=>{const topic=await this.canonicalTopic(t,item.topicId);if(item.kind==='topic')return {...item,topicName:topic.name};const section=await safeOrganization(this,t,'section',await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,item.sectionId])));return {...item,topicName:topic.name,sectionTitle:section?.title||''};}));if((safe.kind==='topic'?safe.topicName:safe.sectionTitle).normalize('NFKC').toLocaleLowerCase().includes(query))items.push(safe);}return {...page,items};}
 async selectOrganizerInputs({documentId,cursor=null,limit=8}){if(!idOK(documentId)||!Number.isInteger(limit)||limit<1||limit>8)reject('INVALID_OUTPUT');await this.finishFoundation();return this.run(()=>this.repository.transaction(false,async t=>{const page=await t.rangePage('blockIndex','byList',prefix([documentId,0]),cursor,limit),specs=[];for(const {value:ix}of page.rows){const p=await inputProjection(this,t,ix.id);if(p&&!await this.isFiltered(t,p.block,await t.get('meta','smart-filter')))specs.push({inputId:ix.id,role:'primary',selectedFields:['body']});}return {specs,nextCursor:page.next};}));}
 async enqueueOrganizer(request){keys(request,['operationId','specs','entryIds','topicIds'],['operationId','specs']);if(!idOK(request.operationId)||!Array.isArray(request.specs)||!request.specs.length||request.specs.length>10||[request.entryIds||[],request.topicIds||[]].some(x=>!Array.isArray(x)||x.some(id=>!idOK(id)))||request.entryIds?.length>4||request.topicIds?.length>20)reject('INVALID_OUTPUT');const evidence=await this.evidenceFor(request.specs),status=await this.status();if(!status.enabled)reject('CANCELLED');const dedupeKey=await hashText(JSON.stringify(['organize',evidence.map(e=>e.versionToken),request.entryIds||[],request.topicIds||[],request.operationId]));return this.foundationWrite(async t=>{await checkEvidenceInTransaction(this,t,evidence);const old=await t.edge('organizerJobs','byDedupe',dedupeKey);if(old)return {id:old.id};const id=this.uuid(),sequence=await nextSequence(t),sourceRecordIds=[...new Set(evidence.flatMap(e=>e.sourceRecordIds))],row={id,kind:'organize',policyVersion:1,state:'queued',stateKey:0,nextAttemptAt:0,priority:0,sequence,dedupeKey,requestId:this.uuid(),scopeToken:this.uuid(),specs:request.specs,entryIds:request.entryIds||[],topicIds:request.topicIds||[],consentEpoch:status.epoch,sourceRecordIds,attempts:0,fence:0,createdAt:this.clock()};await t.put('organizerJobs',row);await t.put('organizerWorkItems',{id,jobId:id,state:'queued',stateKey:0,sequence,inputIds:evidence.map(e=>e.inputId),sourceRecordIds,checkpoint:'selected'});return {id};});}
 async claimOrganizer(owner){return this.foundationWrite(async t=>{const now=Date.parse(this.clock()),active=await t.all('organizerJobs','byMaintenance',prefix(['organize',0]),100);let concurrent=0;for(const j of active)if(j.state==='running'&&j.leaseUntil>now)concurrent++;if(concurrent>=this.organizerBudget.limits.maxConcurrentJobs)return null;const job=active.find(j=>(j.state==='queued'||j.state==='retry'||j.state==='running'&&j.leaseUntil<=now)&&j.nextAttemptAt<=now);if(!job)return null;if(job.attempts>this.organizerBudget.limits.maxRetries){job.state='failed';job.stateKey=1;job.error='TIMEOUT';await t.put('organizerJobs',job);return null;}job.state='running';job.owner=owner;job.fence++;job.requestId=this.uuid();job.scopeToken=this.uuid();job.attempts++;job.leaseUntil=now+this.organizerBudget.limits.timeoutMs+1000;await t.put('organizerJobs',job);return job;});}
 async organizerJobPage({cursor=null,limit=40}={}){if(!Number.isInteger(limit)||limit<1||limit>100)reject('INVALID_OUTPUT');await this.finishFoundation();return this.run(()=>this.repository.transaction(false,async t=>{const page=await t.rangePage('organizerJobs','byMaintenance',prefix(['organize']),cursor,limit);return {items:page.rows.map(({value:j})=>({id:j.id,state:j.state,attempts:j.attempts,error:j.error||null,createdAt:j.createdAt})),nextCursor:page.next};}));}
 async controlOrganizer({id,action}){if(!['cancel','resume'].includes(action)||!idOK(id))reject('INVALID_OUTPUT');return this.foundationWrite(async t=>{const j=await t.get('organizerJobs',id);if(!j||j.kind!=='organize')reject('INVALID_OUTPUT');if(['completed','cancelled'].includes(j.state))return {state:j.state};j.fence++;j.state=action==='cancel'?'cancelled':'queued';j.stateKey=action==='cancel'?1:0;j.nextAttemptAt=0;delete j.owner;await t.put('organizerJobs',j);return {state:j.state};});}
 async suggestionPage({cursor=null,limit=40,status='pending'}={}){if(!Number.isInteger(limit)||limit<1||limit>100||!['pending','accepted','rejected','expired','superseded'].includes(status))reject('INVALID_OUTPUT');await this.finishFoundation();return this.run(()=>this.repository.transaction(false,async t=>{const key={pending:0,accepted:1,rejected:2,expired:3,superseded:4}[status],page=await t.rangePage('organizerSuggestions','byStatus',prefix([key]),cursor,limit),items=[];for(const {value:r}of page.rows){if(!await this.sourcePresent(t,r.sourceRecordIds))continue;let valid=true;for(const e of r.item.evidence){const m=await t.get('inputStates',e.inputId);if(m?.removalState!=='active'||m.sourcePurged)valid=false;}if(valid)items.push({id:r.id,targetId:r.targetId,baseRevision:r.baseRevision,status:r.status,reason:r.reason,body:r.item.candidate.body,type:r.item.candidate.type,createdAt:r.createdAt});}return {items,nextCursor:page.next,count:await t.count('organizerSuggestions','byStatus',prefix([0]))};}));}
 async resolveSuggestion(request){keys(request,['id','action','baseRevision','operationId'],['id','action','baseRevision','operationId']);if(!['accept','reject'].includes(request.action))reject('INVALID_OUTPUT');return this.operation(request,async t=>{const r=await t.get('organizerSuggestions',request.id);if(!r||r.status!=='pending'||r.baseRevision!==request.baseRevision)reject('STALE_BASE');if(request.action==='reject'){r.status='rejected';r.statusKey=2;}else{let valid=true;try{await checkEvidenceInTransaction(this,t,r.item.evidence);}catch{valid=false;}const gate=await t.get('meta','gate'),entry=r.targetKind==='entry'?await t.get('thoughts',r.targetId):null;if(!gate?.enabled||gate.epoch!==r.consentEpoch||r.targetKind==='entry'&&!entry||entry&&(entry.revision!==r.baseRevision||entry.lifecycle!=='active'))valid=false;for(const b of Object.values(r.projection.topicMap)){const topic=await t.get('topics',b.id);if(!topic||topic.redirectTo||topic.layoutJobId||topic.revision!==b.revision||topic.organizationRevision!==b.organizationRevision||topic.activeLayoutGeneration!==b.generation)valid=false;}for(const b of Object.values(r.projection.sectionMap)){const section=await t.get('sections',b.id);if(!section||section.revision!==b.revision||section.lifecycle!=='active'||section.redirectTo)valid=false;}if(r.policyVersion!==1||ActionPolicy.evaluate({candidate:r.item.candidate,entry,actor:'user'}).decision!=='allow')valid=false;if(!valid){r.status='expired';r.statusKey=3;await t.put('organizerSuggestions',r);return {id:r.id,expired:true};}const result=await this.libraryCommit.apply(t,r.item,r.projection,entry,'user',request.operationId);r.acceptedEntryId=result.id;r.status='accepted';r.statusKey=1;}r.resolvedAt=this.clock();await t.put('organizerSuggestions',r);return {id:r.id,status:r.status,...(r.acceptedEntryId?{entryId:r.acceptedEntryId}:{})};});}
}
