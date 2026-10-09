import {beginHumanOperation,finishHumanOperation,releaseHumanOperation,humanOperationError} from './browser-native-sync/human-library-plan.js';
import {humanClock,humanUuid} from './browser-native-sync/human-library-allocation.js';
import {assertMemoryPlacementChangeAllowed} from './memory/organization-guard.js';
import {initializeTopicIdentity,prepareTopicName,assertTopicIdentityBase,registerTopicName,prepareTopicRename,recordTopicRename,planHumanTopicField,resolveTopicIdentity,mapTopicIdentityBatch} from './topic-identity.js';
import {newOrganizationIntents,recordMembershipIntent,fixMembershipSet,moveMembership} from './topic-intent.js';
import {BINDING_ROW,applyBinding,classifyBinding,thoughtLayout,bindingRead,migrateBindings,reverseSetting,prepareBodyEdit} from './thought-binding.js';
import {IndexedArchiveStore} from './indexed-store.js';
import {editSection,checkRestore,restoreOrganization} from './thought-organization.js';
import {SmartFilterStore} from './smart-filter-store.js';
import {hashText} from './dedupe.js';
import {ArchiveError} from './constants.js';
import {migrateThoughtLibrary} from './thought-migration.js';
import {evidenceFor,validateEvidence,checkEvidenceInTransaction,dependencyState} from './thought-evidence.js';
import {enqueueInvalidation,beforeSourcePurge,invalidationBatch,purgeBatch} from './thought-maintenance.js';
import {journal,nextSequence,receipt,saveReceipt} from './thought-journal.js';
import {FAMILY_BY_TYPE,ENTRY_FIELDS,fail,keys,idOK,revisionOK,prefix,same,validateFields,validateGenerator,protections,markHuman,refreshEntryIndex,entrySnapshot,entryDTO,keyedHash,rankBetween,normalizeRank} from './thought-model.js';
import {editSharedBodyFromEntry} from './shared-working-content.js';

// Named domain computation; callers still need the existing operation/CAS and
// private identity authority before any write. No transaction callback accepted.
export function planHumanTopicCreation(request,{id,sectionId,at}) {
 const rank=rankBetween(),topic={id,defaultSectionId:sectionId,name:request.name,summary:'',nameKey:request.name.toLocaleLowerCase(),revision:0,organizationRevision:0,activeLayoutGeneration:1,activeKey:0,pinKey:1,pinRank:rank,negativeUpdatedSequence:0,lifecycle:'active',createdBy:'user',createdAt:at,protections:protections('user',request.operationId,at)};
 initializeTopicIdentity(topic,'user');
 const section={id:JSON.stringify([id,1,sectionId]),topicId:id,layoutGeneration:1,sectionId,isDefault:true,title:'',rank,revision:0,activeKey:0,lifecycle:'active',protections:protections('user',request.operationId,at)};
 return {topic,section};
}

export function planHumanPlacement({entry,topic,placement},request,at) {
 const e=structuredClone(entry),owner=structuredClone(topic);
 recordMembershipIntent(e,owner.id,!request.remove,request.operationId,at,request.restoreRevisionId?'restore':'user_edit');e.organizationRevision++;e.revision++;owner.organizationRevision++;
 return {entry:e,topic:owner,placement:structuredClone(placement)};
}

export function planHumanEntryCreation(request,{id,at,sequence,exactSignature,evidence,nonContext}) {
 const human=request.actor==='user';
 const row={id,storageSchema:2,...(request.title?.trim()?{title:request.title}:{}),thoughtText:request.body,note:request.note??'',family:FAMILY_BY_TYPE[request.type],type:request.type,formation:request.formation,origin:request.actor,revision:0,contentRevision:0,fieldRevisions:Object.fromEntries(ENTRY_FIELDS.map(f=>[f,0])),organizationRevision:0,dependencyRevision:0,createdAt:at,updatedAt:at,updatedSequence:sequence,createdSequence:sequence,hasHumanAction:human,userEdited:human,protections:protections(request.actor,request.operationId,at),authorship:Object.fromEntries(ENTRY_FIELDS.map(f=>[f,{actor:request.actor,everHumanConfirmed:human,operationId:request.operationId,at}])),organizationIntents:newOrganizationIntents(),lifecycle:'active',freshness:'current',integrity:evidence.length?'complete':'detached',staleReasons:[],sourceRecordIds:[...new Set(evidence.flatMap(e=>e.sourceRecordIds))],inputRefs:evidence.map(e=>({inputBlockId:e.inputId,basedOnContentRevision:e.basedOnContentRevision})),exactSignature,topics:[],types:['type:'+request.type],bodyBinding:'thought',provenanceType:nonContext.length?'input_derived':'user_created'};
 refreshEntryIndex(row);return row;
}

export function planHumanEntryRemoval(row,request,evidence,{suppressionId,removedAt}) {
 const entry=structuredClone(row),suppression={id:suppressionId,deletedEntryId:row.id,lineageId:row.id,removedAt,operationId:request.operationId,status:'active',scopeVersion:1,scopeTokens:[...new Set(evidence.filter(e=>e.role!=='context_only').map(e=>e.scopeToken))],evidenceVersionTokens:[...new Set(evidence.filter(e=>e.role!=='context_only').map(e=>e.versionToken))],exactSignature:row.exactSignature,noveltyRuleVersion:1};
 entry.lifecycle='removed';entry.revision++;refreshEntryIndex(entry);return {entry,suppression};
}
export function planHumanEntryRestoration(row,request,timeSlots) {
 if(timeSlots.length!==ENTRY_FIELDS.length)fail();const entry=structuredClone(row);entry.lifecycle='active';entry.revision++;
 for(let i=0;i<ENTRY_FIELDS.length;i++)markHuman(entry,ENTRY_FIELDS[i],request.operationId,timeSlots[i],'restore');refreshEntryIndex(entry);return entry;
}

// M1 data boundary only. There is no extraction runner, provider, or runtime
// creation command. Internal calls still revalidate all evidence and CAS guards.
export function planHumanEntryFields(source,request,{at,sharedBody=false}) {
 const row=structuredClone(source),fields=[];
 for(const [f,value]of Object.entries(request.changes)){if(f==='body'&&sharedBody)continue;const key=f==='body'?'thoughtText':f;if(row[key]===value)continue;row[key]=value;row.fieldRevisions[f]++;markHuman(row,f,request.operationId,at);fields.push(f);}
 return {row,fields};
}
export function finishHumanEntryFields(row,fields,{at,sequence,exactSignature}) {
 const result=structuredClone(row);if(fields.includes('body'))result.thoughtEditedAt=at;if(fields.includes('body')||fields.includes('title'))result.contentRevision++;
 result.family=FAMILY_BY_TYPE[result.type];result.types=['type:'+result.type];result.revision++;result.updatedAt=at;result.updatedSequence=sequence;result.exactSignature=exactSignature;delete result.exactKey;refreshEntryIndex(result);return result;
}
export function planHumanTopicTouch(row,{at,sequence}){return {...row,updatedAt:at,negativeUpdatedSequence:-sequence,countVersion:(row.countVersion||0)+1};}
export function humanSectionRank(last,requestedRank){const rank=requestedRank||(last?String(Number(last.rank)+1024).padStart(12,'0'):rankBetween());return normalizeRank(rank);}
export function planHumanSectionCreation(request,topic,{sectionId,rank,at}){return {id:JSON.stringify([topic.id,topic.activeLayoutGeneration,sectionId]),topicId:topic.id,layoutGeneration:topic.activeLayoutGeneration,sectionId,title:request.title,rank,revision:0,activeKey:0,lifecycle:'active',protections:protections('user',request.operationId,at)};}
export function humanPlacementRank(last,old,requestedRank){const rank=requestedRank===undefined?(last?String(Number(last.rank)+1024).padStart(12,'0'):old?.rank||rankBetween()):normalizeRank(requestedRank);return normalizeRank(rank);}
export function planHumanPlacementRow(topic,entry,old,section,rank,remove){return {id:JSON.stringify([topic.id,topic.activeLayoutGeneration,entry.id]),topicId:topic.id,layoutGeneration:topic.activeLayoutGeneration,entryId:entry.id,sectionId:section.sectionId,rank,sectionRank:section.rank,revision:(old?.revision??-1)+1,activeKey:remove?1:0,lifecycle:remove?'removed':'active',membershipAuthorship:'user',sectionProtection:true,orderProtection:true};}
export class LibraryFoundationStore extends SmartFilterStore {
 constructor(local,options={}) {super(local,{...options,thoughtLibrary:true});this.foundationLoaded=false;}
 run(fn) {return super.run(async()=>{if(!this.foundationLoaded&&!this.foundationFailure){try{const marker=await migrateThoughtLibrary(this,{maxBatches:1});this.foundationLoaded=marker.phase==='active';}catch{this.foundationFailure=true;}}return fn();});}
 async finishFoundation(){while(!this.foundationLoaded){await this.run(()=>Promise.resolve());if(this.foundationFailure)throw new ArchiveError('STORAGE_FAILED');if(!this.foundationLoaded)await new Promise(resolve=>setTimeout(resolve,0));}if(!this.bindingsLoaded){await migrateBindings(this);this.bindingsLoaded=true;}}
 async foundationWrite(fn){await this.finishFoundation();return IndexedArchiveStore.prototype.write.call(this,fn);}
 thoughtLayout(layout){return thoughtLayout(this,layout);}
 reverseEditSetting(enabled){return reverseSetting(this,enabled);}
 async bindingMigrationStatus(t){const {version,complete,input,thought}=await t.get('meta',BINDING_ROW)||{};return {version,complete,input,thought};}
 async libraryStatus() {await this.finishFoundation();return this.run(()=>this.repository.transaction(false,async t=>({...await t.get('meta','thought-library'),bindingMigration:await this.bindingMigrationStatus(t),pendingInvalidations:await t.count('invalidations','byPending',prefix([0])),pendingCleanupJobs:await t.count('organizerJobs','byMaintenance',prefix(['purge_cleanup',0]))}),['meta','invalidations','organizerJobs']));}
 async snapshot(){await this.finishFoundation();return super.snapshot();}
 evidenceFor(specs,options) {return evidenceFor(this,specs,options);}
 invalidate(t,inputId,reason,revision) {return enqueueInvalidation(this,t,inputId,reason,revision);}
 async purge(id,permanent=false){const result=await super.purge(id,permanent);return {...result,libraryCleanup:'pending'};}
 permanentDelete(id){return this.purge(id,true);}
 beforeSourcePurge(t,records,blocks) {return beforeSourcePurge(this,t,records,blocks);}
 async processInvalidations(options={}) {await this.finishFoundation();return invalidationBatch(this,options.limit??100);}
 async processPurgeCleanup(options={}) {await this.finishFoundation();return purgeBatch(this,options.limit??100);}
 async drainInvalidations() {let batches=0;for(;;){const r=await this.processInvalidations();if(!r.pending)return {batches};batches++;await this.repository.checkpoint('thought-invalidation-batch');}}
 async drainPurgeCleanup() {let batches=0;for(;;){const r=await this.processPurgeCleanup();if(!r.pending)return {batches};batches++;await this.repository.checkpoint('thought-purge-batch');}}
 async operation(request,fn) {
  if(!idOK(request?.operationId)||request.operationId.length<8)fail();
  const digest=await hashText(JSON.stringify(request));
  return this.foundationWrite(t=>this.operationInTransaction(t,request,digest,fn));
 }
 async operationInTransaction(t,request,digest,fn){try{await beginHumanOperation(this,t,request);const prior=await receipt(t,request,digest);if(prior)return prior;const result=await fn(t);if(!result.conflict)await saveReceipt(this,t,request,digest,result);await finishHumanOperation(this,t,request,result);return result;}catch(error){throw humanOperationError(request,error);}finally{releaseHumanOperation(t,request);}
 }
 async priorOperation(request) {
  if(!idOK(request?.operationId)||request.operationId.length<8)fail();const digest=await hashText(JSON.stringify(request));
  return this.run(()=>this.repository.transaction(false,t=>receipt(t,request,digest),['operationReceipts']));
 }
 async sourcePresent(t,ids) {for(const id of ids||[]){const r=await t.get('recordIndex',id);if(!r||!await t.get('records',id)||await t.get('tombstones','source:'+r.sourceKey)||await t.get('tombstones','snapshot:'+r.dedupeKey))return false;}return true;}
 async readableEntry(t,id) {
  const row=await t.get('thoughts',id);if(!row||row.storageSchema!==2||row.lifecycle==='quarantined')fail();
  if(!await this.sourcePresent(t,row.sourceRecordIds)) {
   const safe=structuredClone(row);safe.freshness='stale';safe.staleReasons=['source_purged'];safe.integrity='detached';
   safe.thoughtText=safe.provenanceType==='user_created'&&safe.hasHumanAction&&safe.protections.body.locked?safe.thoughtText:'';
   safe.title=safe.hasHumanAction&&safe.protections.title.locked?safe.title:'';
   safe.note=safe.hasHumanAction&&safe.protections.note.locked?safe.note:'';
   if(!safe.hasHumanAction)safe.lifecycle='invalidated';return safe;
  }
  return applyBinding(structuredClone(row),await classifyBinding(this,t,row));
 }
 async entry(id) {
  if(!idOK(id))fail();await this.finishFoundation();const row=await this.run(()=>this.repository.transaction(false,async t=>bindingRead(this,t,await this.readableEntry(t,id))));
  if(row.staleReasons?.includes('source_purged'))return entryDTO(row);
  const state=await dependencyState(this,row,bindingRead);if(!state)fail();return entryDTO(state);
 }
 async entryPage({cursor=null,limit=50}={}) {
  await this.finishFoundation();
  if(!Number.isInteger(limit)||limit<1||limit>100)fail();
  const page=await this.run(()=>this.repository.transaction(false,t=>t.rangePage('thoughts','byLifecycle',prefix([0]),cursor,limit)));
  const items=[];for(const {value:r}of page.rows){try{const e=await this.entry(r.id);if(e.lifecycle==='active')items.push(e);}catch(e){if(e.code!=='INVALID_REQUEST')throw e;}}
  return {items,nextCursor:page.next};
 }
 entryDependencies(id) {if(!idOK(id))fail();return this.run(()=>this.repository.transaction(false,t=>t.all('dependencies','byTarget',prefix(['entry',id]))));}
 async entryProvenance(id) {
  await this.entry(id);return this.run(()=>this.repository.transaction(false,async t=>{const rows=await t.all('provenance','byOwner',prefix(['entry',id])),out=[];for(const row of rows){const m=await t.get('inputStates',row.inputId);if(m?.removalState==='active'&&!m.sourcePurged&&await this.sourcePresent(t,row.sourceRecordIds))out.push({...row,availability:m.contentRevision===row.basedOnContentRevision?'resolvable':'version_unavailable'});}return out;}));
 }
 async createEntry(request,hooks={}) {
  keys(request,['operationId','actor','title','body','note','type','formation','evidence','generator'],['operationId','actor','body','type','formation','evidence']);
  if(!['user','ai'].includes(request.actor))fail();validateFields({body:request.body,title:request.title??'',note:request.note??'',type:request.type,formation:request.formation});
  if(request.actor==='ai'&&request.formation==='inferred')fail();
  const prior=await this.priorOperation(hooks.receiptRequest||request);if(prior)return prior;
  const evidence=await validateEvidence(this,request.evidence,{independentContext:hooks.independentContext===true}),primary=evidence.filter(e=>e.role==='primary'),nonContext=evidence.filter(e=>e.role!=='context_only');
  if(request.actor==='ai'&&!primary.length||request.formation==='synthesized'&&nonContext.length<2)fail();
  const emptyDigest=await hashText('');if(request.actor==='ai'&&(!request.body.length||nonContext.every(e=>e.selectedFields.every(f=>e.fieldDigests[f]===emptyDigest))))fail();
  const generator=request.actor==='ai'?validateGenerator(request.generator):null;
  if(request.actor==='user'&&request.generator!==undefined)fail();
  const secret=await this.run(()=>this.repository.transaction(false,async t=>(await t.get('meta','thought-suppression-key')).value,['meta']));
  const exactSignature=await keyedHash(secret,['body',request.type,request.body]);
  await this.repository.checkpoint('thought-evidence-validated');
  return this.operation(hooks.receiptRequest||request,t=>this.createEntryInTransaction(t,request,{evidence,nonContext,generator,exactSignature,hooks}));
 }
 async createEntryInTransaction(t,request,{evidence,nonContext,generator,exactSignature,hooks}){
   if((await t.get('meta','thought-library')).sealed)fail();await checkEvidenceInTransaction(this,t,evidence);const reused=await hooks.before?.(t,evidence);if(reused)return reused;
   if(request.actor==='ai') {
    const suppressed=new Map();for(const e of nonContext)for(const s of await t.all('thoughtSuppressions','byScope',e.scopeToken))if(s.status==='active')suppressed.set(s.id,s);
    for(const s of await t.all('thoughtSuppressions','byExact',exactSignature))if(s.status==='active')suppressed.set(s.id,s);
    if(suppressed.size){const oldScopes=new Set([...suppressed.values()].flatMap(s=>s.scopeTokens));return {suppressed:true,eligibleFutureCandidate:nonContext.some(e=>!oldScopes.has(e.scopeToken))};}
   }
   const id=humanUuid(this,t),at=humanClock(this,t),sequence=await nextSequence(t),human=request.actor==='user';
   const row=planHumanEntryCreation(request,{id,at,sequence,exactSignature,evidence,nonContext});await t.put('thoughts',row);
   const generationId=humanUuid(this,t);for(const e of evidence) {
    const p={id:this.uuid(),ownerKind:'entry',ownerId:id,generationId,inputId:e.inputId,basedOnContentRevision:e.basedOnContentRevision,actualVersion:{inputRevision:e.basedOnContentRevision,projectionVersion:1,selectedFields:e.selectedFields,fieldDigests:e.fieldDigests},role:e.role,contributionType:e.role==='context_only'?'context':request.formation==='synthesized'?'combination':'paraphrase',formation:request.formation,generatedAt:at,generator,inputAuthorshipAtUse:'working_input',entryFieldAuthorshipAtCommit:request.actor,sourceRecordIds:e.sourceRecordIds,sourceIdentityTokens:e.sourceIdentityTokens,scopeToken:e.scopeToken,versionToken:e.versionToken,availability:'resolvable',contributionKey:JSON.stringify([id,e.inputId,e.basedOnContentRevision,e.role,generationId])};
    await t.put('provenance',p);await t.put('dependencies',{id:JSON.stringify([e.inputId,'entry',id]),inputId:e.inputId,inputList:[e.inputId,id],thoughtId:id,targetKind:'entry',targetId:id,eligibilityEpochAtUse:e.epoch,basedOnContentRevision:e.basedOnContentRevision,selectedFields:e.selectedFields,fieldDigests:e.fieldDigests,validatedAgainstContentRevision:e.basedOnContentRevision,status:'valid',roles:[e.role],sourceRecordIds:e.sourceRecordIds,scopeToken:e.scopeToken,versionToken:e.versionToken});
   }
   await hooks.after?.(t,row,evidence);await t.put('thoughts',row);
   await journal(this,t,{kind:'library_entry',entityId:id,before:entrySnapshot(row),after:entrySnapshot(row),fieldMask:ENTRY_FIELDS,actor:request.actor,reason:'baseline',important:true,operationId:request.operationId,baseRevision:0,afterRevision:0,sourceRecordIds:row.sourceRecordIds});
   return {id,revision:row.revision,...(hooks.independentExpression===true&&human&&request.body.trim()?{independentExpression:{version:1,kind:'committed_human_expression',at}}:{})};

 }
 async editEntry(request) {
  keys(request,['id','operationId','expectedRevision','changes','actor','revisionReason','restoreRevisionId','expectedFieldRevisions','expectedInputRevision'],['id','operationId','expectedRevision','changes']);
  if(!idOK(request.id)||!revisionOK(request.expectedRevision)||request.actor&&request.actor!=='user')fail();validateFields(request.changes);
  if(request.expectedFieldRevisions!==undefined){keys(request.expectedFieldRevisions,ENTRY_FIELDS);for(const f of Object.keys(request.changes))if(!revisionOK(request.expectedFieldRevisions[f]))fail();}
  const prior=await this.priorOperation(request);if(prior)return prior;
  const signature=await this.run(()=>this.repository.transaction(false,async t=>({row:await t.get('thoughts',request.id),secret:(await t.get('meta','thought-suppression-key')).value})));if(!signature.row)fail();
  const exactSignature=await keyedHash(signature.secret,['body',request.changes.type??signature.row.type,request.changes.body??signature.row.thoughtText]);
  return this.operation(request,t=>this.editEntryInTransaction(t,request,{signature,exactSignature}));
 }
 async editEntryInTransaction(t,request,{signature,exactSignature}){
   if(request.restoreRevisionId){const saved=await t.get('revisions',request.restoreRevisionId);if(!saved||saved.entityId!==request.id||!await this.sourcePresent(t,saved.sourceRecordIds))fail();}
   let row=await t.get('thoughts',request.id);if(!row||row.storageSchema!==2||row.lifecycle!=='active'||!await this.sourcePresent(t,row.sourceRecordIds))fail();
   if(request.expectedFieldRevisions?Object.keys(request.changes).some(f=>row.fieldRevisions[f]!==request.expectedFieldRevisions[f]):row.revision!==request.expectedRevision)return {conflict:true};
   if(row.thoughtText!==signature.row.thoughtText||row.type!==signature.row.type)return {conflict:true};
   const originalSnapshot=entrySnapshot(row);let detached=false,sharedBody=false;
   if(Object.hasOwn(request.changes,'body')&&request.changes.body!==row.thoughtText){const mode=await prepareBodyEdit(this,t,row,request,request.revisionReason);if(mode.conflict)return mode;detached=mode.detached;if(mode.shared){const shared=await editSharedBodyFromEntry(this,t,row,request.changes.body,request.operationId,{expectedInputRevision:request.expectedInputRevision});if(shared?.conflict)return shared;sharedBody=!!shared?.shared;if(sharedBody)row=await t.get('thoughts',request.id);}}
   const before=originalSnapshot,at=humanClock(this,t),planned=planHumanEntryFields(row,request,{at,sharedBody}),fields=planned.fields;row=planned.row;
   if(!fields.length)return {id:row.id,revision:row.revision};
   row=finishHumanEntryFields(row,fields,{at,sequence:await nextSequence(t),exactSignature});await t.put('thoughts',row);
   await journal(this,t,{kind:'library_entry',entityId:row.id,before,after:entrySnapshot(row),fieldMask:fields,actor:'user',reason:request.revisionReason==='restore'?'restore':'edit',important:request.revisionReason==='restore',operationId:request.operationId,baseRevision:request.expectedRevision,afterRevision:row.revision,sourceRecordIds:row.sourceRecordIds});return {id:row.id,revision:row.revision};

 }
 async removeEntry(request) {
  keys(request,['id','operationId','expectedRevision'],['id','operationId','expectedRevision']);if(!idOK(request.id)||!revisionOK(request.expectedRevision))fail();
  return this.operation(request,t=>this.removeEntryInTransaction(t,request));
 }
 async removeEntryInTransaction(t,request){
   const row=await this.readableEntry(t,request.id);if(row.revision!==request.expectedRevision)return {conflict:true};if(row.lifecycle!=='active')fail();
   const before=entrySnapshot(row),evidence=await t.all('provenance','byOwner',prefix(['entry',row.id]));
   const planned=planHumanEntryRemoval(row,request,evidence,{suppressionId:humanUuid(this,t),removedAt:humanClock(this,t)});await t.put('thoughtSuppressions',planned.suppression);
   Object.assign(row,planned.entry);await t.put('thoughts',row);
   await journal(this,t,{kind:'library_entry',entityId:row.id,before,after:entrySnapshot(row),fieldMask:['lifecycle'],actor:'user',reason:'remove',important:true,operationId:request.operationId,baseRevision:request.expectedRevision,afterRevision:row.revision,sourceRecordIds:row.sourceRecordIds});return {id:row.id,revision:row.revision};

 }
 async restoreEntry(request) {
  keys(request,['id','operationId','expectedRevision'],['id','operationId','expectedRevision']);if(!idOK(request.id)||!revisionOK(request.expectedRevision))fail();
  return this.operation(request,t=>this.restoreEntryInTransaction(t,request));
 }
 async restoreEntryInTransaction(t,request){
   const row=await t.get('thoughts',request.id);if(!row||row.storageSchema!==2||row.lifecycle!=='removed'||!await this.sourcePresent(t,row.sourceRecordIds))fail();if(row.revision!==request.expectedRevision)return {conflict:true};
   const before=entrySnapshot(row),planned=planHumanEntryRestoration(row,request,ENTRY_FIELDS.map(()=>humanClock(this,t)));Object.assign(row,planned);await t.put('thoughts',row);
   for(const suppression of await t.all('thoughtSuppressions','byEntry',row.id)){suppression.status='restored';await t.put('thoughtSuppressions',suppression);}
   await journal(this,t,{kind:'library_entry',entityId:row.id,before,after:entrySnapshot(row),fieldMask:['lifecycle'],actor:'user',reason:'restore',important:true,operationId:request.operationId,baseRevision:request.expectedRevision,afterRevision:row.revision,sourceRecordIds:row.sourceRecordIds});return {id:row.id,revision:row.revision};

 }
 async revisions(options={}) {
  const {kind=null}=options,newKinds=['library_entry','topic','section','placement'];
  if(kind!==null&&!newKinds.includes(kind))return super.revisions(options).then(page=>this.filterSafeRevisions(page));
  // Reuse the frozen paginated reader; filter the new kinds after its source fence.
  const page=await super.revisions({...options,kind:null});const safe=await this.filterSafeRevisions(page);return {...safe,items:kind?safe.items.filter(r=>r.kind===kind):safe.items};
 }
 filterSafeRevisions(page){return this.run(()=>this.repository.transaction(false,async t=>{const items=[];for(const row of page.items){const owner=['thought','library_entry'].includes(row.kind)?await t.get('thoughts',row.entityId):null;if(!(['thought','library_entry'].includes(row.kind)&&(!this.foundationLoaded||this.foundationFailure))&&!owner?.quarantineSealed&&await this.sourcePresent(t,row.sourceRecordIds))items.push(row);}return {...page,items};}));}
 async restoreRevision(request={}){
  const saved=await this.run(()=>this.repository.transaction(false,t=>t.get('revisions',request.id)));if(!saved)fail();
  if(saved.kind==='library_entry')return this.restoreLibraryRevision(request);
  if(['topic','section','placement'].includes(saved.kind)){
   if(!revisionOK(request.expectedRevision)||request.side!==undefined&&!['before','after'].includes(request.side))fail();
   if(!await this.run(()=>this.repository.transaction(false,t=>this.sourcePresent(t,saved.sourceRecordIds))))fail();return restoreOrganization(this,request,saved);
  }
  return super.restoreRevision(request);
 }
 editSection(request){return editSection(this,request);}
 async restoreLibraryRevision({id,expectedRevision,side='before',operationId}={}) {
  if(!idOK(id)||!revisionOK(expectedRevision)||!['before','after'].includes(side))fail();
  const saved=await this.run(()=>this.repository.transaction(false,async t=>{const row=await t.get('revisions',id);if(!row||row.kind!=='library_entry'||!await this.sourcePresent(t,row.sourceRecordIds))fail();return row;}));
  const changes=Object.fromEntries(ENTRY_FIELDS.filter(f=>saved.fieldMask.includes(f)).map(f=>[f,saved[side][f]]));
  if(!Object.keys(changes).length)fail();const current=await this.entry(saved.entityId);return this.editEntry({id:saved.entityId,operationId,expectedRevision,expectedInputRevision:current.currentInputRevision,changes,revisionReason:'restore',restoreRevisionId:id});
 }
 // Old runtime routes never expose quarantined payloads or bypass the new writer.
 async thought(id) {return this.entry(id);}
 async thoughtPage(options={}) {const page=await this.entryPage({cursor:options.cursor,limit:options.limit});return {...page,categories:[],emptyText:'尚未整理思想内容'};}
 createThought() {return Promise.reject(new ArchiveError('INVALID_REQUEST'));}
 refreshThought() {return Promise.reject(new ArchiveError('INVALID_REQUEST'));}
 async editThought({id,operationId,expectedRevision,changes}={}) {keys(changes,['thoughtText','title','note','topics','types']);if(changes.topics||changes.types)fail();return this.editEntry({id,operationId,expectedRevision,changes:Object.fromEntries(Object.entries(changes).map(([k,v])=>[k==='thoughtText'?'body':k,v]))});}
 async createTopic(request) {
  keys(request,['name','operationId'],['name','operationId']);if(typeof request.name!=='string'||!request.name.trim()||request.name.length>300)fail();
  const nameIdentity=await prepareTopicName(this,request.name);
  return this.operation(request,t=>this.createTopicInTransaction(t,request,nameIdentity));
 }
 async createTopicInTransaction(t,request,nameIdentity){
   await assertTopicIdentityBase(t,nameIdentity);const id=humanUuid(this,t),sectionId=humanUuid(this,t),at=humanClock(this,t),{topic:row,section}=planHumanTopicCreation(request,{id,sectionId,at});
   await registerTopicName(t,row,nameIdentity.token);await t.put('topics',row);await t.put('sections',section);
   await journal(this,t,{kind:'topic',entityId:id,before:null,after:row,fieldMask:['name'],actor:'user',reason:'baseline',important:true,operationId:request.operationId,sourceRecordIds:[]});
   await journal(this,t,{kind:'section',entityId:sectionId,documentId:id,before:null,after:section,fieldMask:['title','rank'],actor:'user',reason:'baseline',important:true,operationId:request.operationId,sourceRecordIds:[]});return {id,sectionId,revision:0};

 }
 async renameTopic(request) {
  keys(request,['id','name','expectedRevision','operationId','restoreRevisionId'],['id','name','expectedRevision','operationId']);
  if(!idOK(request.id)||!revisionOK(request.expectedRevision)||typeof request.name!=='string'||!request.name.trim()||request.name.length>300)fail();
  const rename=await prepareTopicRename(this,request.id,request.name);
  return this.operation(request,t=>this.renameTopicInTransaction(t,request,rename));
 }
 async renameTopicInTransaction(t,request,rename){await checkRestore(this,t,request.restoreRevisionId,'topic',request.id);const row=await this.canonicalTopic(t,request.id);if(row.id!==request.id)fail();if(row.revision!==request.expectedRevision)return {conflict:true};const before=structuredClone(row);await recordTopicRename(t,row,rename,request.operationId,humanClock(this,t));row.name=request.name;row.nameKey=request.name.toLocaleLowerCase();row.revision++;Object.assign(row,planHumanTopicField(row,'name',request.name,request.operationId,humanClock(this,t)));await t.put('topics',row);await journal(this,t,{kind:'topic',entityId:row.id,before,after:row,fieldMask:['name'],actor:'user',reason:request.restoreRevisionId?'restore':'rename',important:true,operationId:request.operationId,baseRevision:request.expectedRevision,afterRevision:row.revision,sourceRecordIds:[]});return {id:row.id,revision:row.revision};
 }
 async createSection(request) {
  keys(request,['topicId','expectedTopicRevision','title','rank','operationId'],['topicId','expectedTopicRevision','title','operationId']);
  if(!idOK(request.topicId)||!revisionOK(request.expectedTopicRevision)||typeof request.title!=='string'||request.title.length>300)fail();const requestedRank=request.rank===undefined?null:normalizeRank(request.rank);
  return this.operation(request,t=>this.createSectionInTransaction(t,request,requestedRank));
 }
 async createSectionInTransaction(t,request,requestedRank){const topic=await this.canonicalTopic(t,request.topicId);if(topic.id!==request.topicId)fail();if(topic.organizationRevision!==request.expectedTopicRevision)return {conflict:true};const last=this.libraryDocumentMode?await t.edge('sections','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]),'prev'):null,rank=humanSectionRank(last,requestedRank);const sectionId=humanUuid(this,t),row=planHumanSectionCreation(request,topic,{sectionId,rank,at:humanClock(this,t)});await t.put('sections',row);topic.organizationRevision++;await t.put('topics',topic);await journal(this,t,{kind:'section',entityId:sectionId,documentId:topic.id,before:null,after:row,fieldMask:['title','rank'],actor:'user',reason:'baseline',important:true,operationId:request.operationId,sourceRecordIds:[]});return {id:row.id,sectionId,revision:0,topicRevision:topic.organizationRevision};
 }
 async canonicalTopic(t,id) {return resolveTopicIdentity(t,id);}
 mapTopicIdentityBatch(options){return mapTopicIdentityBatch(this,options);}
 fixMembershipSet(request){return fixMembershipSet(this,request);}
 moveMembership(request){return moveMembership(this,request);}
 async placeEntry(request) {
  keys(request,['entryId','topicId','sectionId','rank','operationId','expectedEntryRevision','expectedTopicRevision','expectedPlacementRevision','remove','restoreRevisionId'],['entryId','topicId','operationId','expectedEntryRevision','expectedTopicRevision']);
  if(!idOK(request.entryId)||!idOK(request.topicId)||!revisionOK(request.expectedEntryRevision)||!revisionOK(request.expectedTopicRevision))fail();
  if(request.remove!==undefined&&typeof request.remove!=='boolean')fail();
  return this.operation(request,t=>this.placeEntryInTransaction(t,request));
 }
 async placeEntryInTransaction(t,request){
   const e=await this.readableEntry(t,request.entryId),topic=await this.canonicalTopic(t,request.topicId);if(e.lifecycle!=='active'||topic.lifecycle!=='active'||topic.id!==request.topicId)fail();if(e.revision!==request.expectedEntryRevision||topic.organizationRevision!==request.expectedTopicRevision)return {conflict:true};
   const id=JSON.stringify([topic.id,topic.activeLayoutGeneration,e.id]);await checkRestore(this,t,request.restoreRevisionId,'placement',id);const old=await t.get('placements',id);if(old&&old.revision!==request.expectedPlacementRevision&&!(this.libraryDocumentMode&&old.lifecycle==='removed'&&request.expectedPlacementRevision===undefined))return {conflict:true};
   const section=request.sectionId?await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,request.sectionId])):topic.defaultSectionId?await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,topic.defaultSectionId])):await t.edge('sections','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]));if(!section||section.lifecycle!=='active'||section.redirectTo)fail();
   const last=this.libraryDocumentMode&&request.rank===undefined&&(!old||old.sectionId!==section.sectionId)?await t.edge('placements','bySectionOrder',prefix([topic.id,topic.activeLayoutGeneration,section.sectionId,0]),'prev'):null;
   const rank=humanPlacementRank(last,old,request.rank),row=planHumanPlacementRow(topic,e,old,section,rank,request.remove);
   await assertMemoryPlacementChangeAllowed(t,topic.id,old,row);
   const planned=planHumanPlacement({entry:e,topic,placement:row},request,humanClock(this,t));
   Object.assign(e,planned.entry);Object.assign(topic,planned.topic);await t.put('thoughts',e);await t.put('topics',topic);await t.put('placements',planned.placement);
   await journal(this,t,{kind:'placement',entityId:id,documentId:topic.id,before:old||null,after:row,fieldMask:['membership','section','order'],actor:'user',reason:request.restoreRevisionId?'restore':request.remove?'remove':'place',important:true,operationId:request.operationId,sourceRecordIds:e.sourceRecordIds});return {id:e.id,revision:e.revision,placementRevision:row.revision,topicRevision:topic.organizationRevision};
 }
}
