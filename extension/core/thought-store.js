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

// M1 data boundary only. There is no extraction runner, provider, or runtime
// creation command. Internal calls still revalidate all evidence and CAS guards.
export class LibraryFoundationStore extends SmartFilterStore {
 constructor(local,options={}) {super(local,{...options,thoughtLibrary:true});this.foundationLoaded=false;}
 run(fn) {return super.run(async()=>{if(!this.foundationLoaded&&!this.foundationFailure){try{const marker=await migrateThoughtLibrary(this,{maxBatches:1});this.foundationLoaded=marker.phase==='active';}catch{this.foundationFailure=true;}}return fn();});}
 async finishFoundation(){while(!this.foundationLoaded){await this.run(()=>Promise.resolve());if(this.foundationFailure)throw new ArchiveError('STORAGE_FAILED');if(!this.foundationLoaded)await new Promise(resolve=>setTimeout(resolve,0));}}
 async foundationWrite(fn){await this.finishFoundation();return IndexedArchiveStore.prototype.write.call(this,fn);}
 async libraryStatus() {await this.finishFoundation();return this.run(()=>this.repository.transaction(false,async t=>({...await t.get('meta','thought-library'),pendingInvalidations:await t.count('invalidations','byPending',prefix([0])),pendingCleanupJobs:await t.count('organizerJobs','byMaintenance',prefix(['purge_cleanup',0]))}),['meta','invalidations','organizerJobs']));}
 async snapshot(){await this.finishFoundation();return super.snapshot();}
 evidenceFor(specs) {return evidenceFor(this,specs);}
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
  return this.foundationWrite(async t=>{const prior=await receipt(t,request,digest);if(prior)return prior;const result=await fn(t);if(!result.conflict)await saveReceipt(this,t,request,digest,result);return result;});
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
   safe.thoughtText=safe.hasHumanAction&&safe.protections.body.locked?safe.thoughtText:'';
   safe.title=safe.hasHumanAction&&safe.protections.title.locked?safe.title:'';
   safe.note=safe.hasHumanAction&&safe.protections.note.locked?safe.note:'';
   if(!safe.hasHumanAction)safe.lifecycle='invalidated';return safe;
  }
  return row;
 }
 async entry(id) {
  if(!idOK(id))fail();await this.finishFoundation();const row=await this.run(()=>this.repository.transaction(false,t=>this.readableEntry(t,id)));
  if(row.staleReasons?.includes('source_purged'))return entryDTO(row);
  const state=await dependencyState(this,row);if(!state)fail();return entryDTO(state);
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
 async createEntry(request) {
  keys(request,['operationId','actor','title','body','note','type','formation','evidence','generator'],['operationId','actor','body','type','formation','evidence']);
  if(!['user','ai'].includes(request.actor))fail();validateFields({body:request.body,title:request.title??'',note:request.note??'',type:request.type,formation:request.formation});
  if(request.actor==='ai'&&request.formation==='inferred')fail();
  const prior=await this.priorOperation(request);if(prior)return prior;
  const evidence=await validateEvidence(this,request.evidence),primary=evidence.filter(e=>e.role==='primary'),nonContext=evidence.filter(e=>e.role!=='context_only');
  if(request.actor==='ai'&&!primary.length||request.formation==='synthesized'&&nonContext.length<2)fail();
  const emptyDigest=await hashText('');if(request.actor==='ai'&&(!request.body.length||nonContext.every(e=>e.selectedFields.every(f=>e.fieldDigests[f]===emptyDigest))))fail();
  const generator=request.actor==='ai'?validateGenerator(request.generator):null;
  if(request.actor==='user'&&request.generator!==undefined)fail();
  const secret=await this.run(()=>this.repository.transaction(false,async t=>(await t.get('meta','thought-suppression-key')).value,['meta']));
  const exactSignature=await keyedHash(secret,['body',request.type,request.body]);
  await this.repository.checkpoint('thought-evidence-validated');
  return this.operation(request,async t=>{
   if((await t.get('meta','thought-library')).sealed)fail();await checkEvidenceInTransaction(this,t,evidence);
   if(request.actor==='ai') {
    const suppressed=new Map();for(const e of nonContext)for(const s of await t.all('thoughtSuppressions','byScope',e.scopeToken))if(s.status==='active')suppressed.set(s.id,s);
    for(const s of await t.all('thoughtSuppressions','byExact',exactSignature))if(s.status==='active')suppressed.set(s.id,s);
    if(suppressed.size){const oldScopes=new Set([...suppressed.values()].flatMap(s=>s.scopeTokens));return {suppressed:true,eligibleFutureCandidate:nonContext.some(e=>!oldScopes.has(e.scopeToken))};}
   }
   const id=this.uuid(),at=this.clock(),sequence=await nextSequence(t),human=request.actor==='user';
   const row={id,storageSchema:2,...(request.title?.trim()?{title:request.title}:{}),thoughtText:request.body,note:request.note??'',family:FAMILY_BY_TYPE[request.type],type:request.type,formation:request.formation,origin:request.actor,revision:0,contentRevision:0,fieldRevisions:Object.fromEntries(ENTRY_FIELDS.map(f=>[f,0])),organizationRevision:0,dependencyRevision:0,createdAt:at,updatedAt:at,updatedSequence:sequence,createdSequence:sequence,hasHumanAction:human,userEdited:human,protections:protections(request.actor,request.operationId,at),authorship:Object.fromEntries(ENTRY_FIELDS.map(f=>[f,{actor:request.actor,everHumanConfirmed:human,operationId:request.operationId,at}])),organizationIntents:{included:[],excluded:[]},lifecycle:'active',freshness:'current',integrity:evidence.length?'complete':'detached',staleReasons:[],sourceRecordIds:[...new Set(evidence.flatMap(e=>e.sourceRecordIds))],inputRefs:evidence.map(e=>({inputBlockId:e.inputId,basedOnContentRevision:e.basedOnContentRevision})),exactSignature,topics:[],types:['type:'+request.type],provenanceType:evidence.length?'input_derived':'user_created'};
   refreshEntryIndex(row);await t.put('thoughts',row);
   const generationId=this.uuid();for(const e of evidence) {
    const p={id:this.uuid(),ownerKind:'entry',ownerId:id,generationId,inputId:e.inputId,basedOnContentRevision:e.basedOnContentRevision,actualVersion:{inputRevision:e.basedOnContentRevision,projectionVersion:1,selectedFields:e.selectedFields,fieldDigests:e.fieldDigests},role:e.role,contributionType:e.role==='context_only'?'context':request.formation==='synthesized'?'combination':'paraphrase',formation:request.formation,generatedAt:at,generator,inputAuthorshipAtUse:'working_input',entryFieldAuthorshipAtCommit:request.actor,sourceRecordIds:e.sourceRecordIds,sourceIdentityTokens:e.sourceIdentityTokens,scopeToken:e.scopeToken,versionToken:e.versionToken,availability:'resolvable',contributionKey:JSON.stringify([id,e.inputId,e.basedOnContentRevision,e.role,generationId])};
    await t.put('provenance',p);await t.put('dependencies',{id:JSON.stringify([e.inputId,'entry',id]),inputId:e.inputId,inputList:[e.inputId,id],thoughtId:id,targetKind:'entry',targetId:id,eligibilityEpochAtUse:e.epoch,basedOnContentRevision:e.basedOnContentRevision,selectedFields:e.selectedFields,fieldDigests:e.fieldDigests,validatedAgainstContentRevision:e.basedOnContentRevision,status:'valid',roles:[e.role],sourceRecordIds:e.sourceRecordIds,scopeToken:e.scopeToken,versionToken:e.versionToken});
   }
   await journal(this,t,{kind:'library_entry',entityId:id,before:entrySnapshot(row),after:entrySnapshot(row),fieldMask:ENTRY_FIELDS,actor:request.actor,reason:'baseline',important:true,operationId:request.operationId,baseRevision:0,afterRevision:0,sourceRecordIds:row.sourceRecordIds});
   return {id,revision:0};
  });
 }
 async editEntry(request) {
  keys(request,['id','operationId','expectedRevision','changes','actor','revisionReason','restoreRevisionId','expectedFieldRevisions'],['id','operationId','expectedRevision','changes']);
  if(!idOK(request.id)||!revisionOK(request.expectedRevision)||request.actor&&request.actor!=='user')fail();validateFields(request.changes);
  if(request.expectedFieldRevisions!==undefined){keys(request.expectedFieldRevisions,ENTRY_FIELDS);for(const f of Object.keys(request.changes))if(!revisionOK(request.expectedFieldRevisions[f]))fail();}
  const prior=await this.priorOperation(request);if(prior)return prior;
  const signature=await this.run(()=>this.repository.transaction(false,async t=>({row:await t.get('thoughts',request.id),secret:(await t.get('meta','thought-suppression-key')).value})));if(!signature.row)fail();
  const exactSignature=await keyedHash(signature.secret,['body',request.changes.type??signature.row.type,request.changes.body??signature.row.thoughtText]);
  return this.operation(request,async t=>{
   if(request.restoreRevisionId){const saved=await t.get('revisions',request.restoreRevisionId);if(!saved||saved.entityId!==request.id||!await this.sourcePresent(t,saved.sourceRecordIds))fail();}
   const row=await t.get('thoughts',request.id);if(!row||row.storageSchema!==2||row.lifecycle!=='active'||!await this.sourcePresent(t,row.sourceRecordIds))fail();
   if(request.expectedFieldRevisions?Object.keys(request.changes).some(f=>row.fieldRevisions[f]!==request.expectedFieldRevisions[f]):row.revision!==request.expectedRevision)return {conflict:true};
   if(row.thoughtText!==signature.row.thoughtText||row.type!==signature.row.type)return {conflict:true};
   const before=entrySnapshot(row),at=this.clock(),fields=[];
   for(const [f,value]of Object.entries(request.changes)){const key=f==='body'?'thoughtText':f;if(row[key]===value)continue;row[key]=value;row.fieldRevisions[f]++;markHuman(row,f,request.operationId,at);fields.push(f);}
   if(!fields.length)return {id:row.id,revision:row.revision};
   if(fields.includes('body')||fields.includes('title'))row.contentRevision++;
   row.family=FAMILY_BY_TYPE[row.type];row.types=['type:'+row.type];row.revision++;row.updatedAt=at;row.updatedSequence=await nextSequence(t);row.exactSignature=exactSignature;delete row.exactKey;
   refreshEntryIndex(row);await t.put('thoughts',row);
   await journal(this,t,{kind:'library_entry',entityId:row.id,before,after:entrySnapshot(row),fieldMask:fields,actor:'user',reason:request.revisionReason==='restore'?'restore':'edit',important:request.revisionReason==='restore',operationId:request.operationId,baseRevision:request.expectedRevision,afterRevision:row.revision,sourceRecordIds:row.sourceRecordIds});return {id:row.id,revision:row.revision};
  });
 }
 async removeEntry(request) {
  keys(request,['id','operationId','expectedRevision'],['id','operationId','expectedRevision']);if(!idOK(request.id)||!revisionOK(request.expectedRevision))fail();
  return this.operation(request,async t=>{
   const row=await this.readableEntry(t,request.id);if(row.revision!==request.expectedRevision)return {conflict:true};if(row.lifecycle!=='active')fail();
   const before=entrySnapshot(row),evidence=await t.all('provenance','byOwner',prefix(['entry',row.id]));
   await t.put('thoughtSuppressions',{id:this.uuid(),deletedEntryId:row.id,lineageId:row.id,removedAt:this.clock(),operationId:request.operationId,status:'active',scopeVersion:1,scopeTokens:[...new Set(evidence.filter(e=>e.role!=='context_only').map(e=>e.scopeToken))],evidenceVersionTokens:[...new Set(evidence.filter(e=>e.role!=='context_only').map(e=>e.versionToken))],exactSignature:row.exactSignature,noveltyRuleVersion:1});
   row.lifecycle='removed';row.revision++;refreshEntryIndex(row);await t.put('thoughts',row);
   await journal(this,t,{kind:'library_entry',entityId:row.id,before,after:entrySnapshot(row),fieldMask:['lifecycle'],actor:'user',reason:'remove',important:true,operationId:request.operationId,baseRevision:request.expectedRevision,afterRevision:row.revision,sourceRecordIds:row.sourceRecordIds});return {id:row.id,revision:row.revision};
  });
 }
 async restoreEntry(request) {
  keys(request,['id','operationId','expectedRevision'],['id','operationId','expectedRevision']);if(!idOK(request.id)||!revisionOK(request.expectedRevision))fail();
  return this.operation(request,async t=>{
   const row=await t.get('thoughts',request.id);if(!row||row.storageSchema!==2||row.lifecycle!=='removed'||!await this.sourcePresent(t,row.sourceRecordIds))fail();if(row.revision!==request.expectedRevision)return {conflict:true};
   const before=entrySnapshot(row);row.lifecycle='active';row.revision++;for(const f of ENTRY_FIELDS)markHuman(row,f,request.operationId,this.clock(),'restore');refreshEntryIndex(row);await t.put('thoughts',row);
   for(const suppression of await t.all('thoughtSuppressions','byEntry',row.id)){suppression.status='restored';await t.put('thoughtSuppressions',suppression);}
   await journal(this,t,{kind:'library_entry',entityId:row.id,before,after:entrySnapshot(row),fieldMask:['lifecycle'],actor:'user',reason:'restore',important:true,operationId:request.operationId,baseRevision:request.expectedRevision,afterRevision:row.revision,sourceRecordIds:row.sourceRecordIds});return {id:row.id,revision:row.revision};
  });
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
  if(!Object.keys(changes).length)fail();return this.editEntry({id:saved.entityId,operationId,expectedRevision,changes,revisionReason:'restore',restoreRevisionId:id});
 }
 // Old runtime routes never expose quarantined payloads or bypass the new writer.
 async thought(id) {return this.entry(id);}
 async thoughtPage(options={}) {const page=await this.entryPage({cursor:options.cursor,limit:options.limit});return {...page,categories:[],emptyText:'尚未整理思想内容'};}
 createThought() {return Promise.reject(new ArchiveError('INVALID_REQUEST'));}
 refreshThought() {return Promise.reject(new ArchiveError('INVALID_REQUEST'));}
 async editThought({id,operationId,expectedRevision,changes}={}) {keys(changes,['thoughtText','title','note','topics','types']);if(changes.topics||changes.types)fail();return this.editEntry({id,operationId,expectedRevision,changes:Object.fromEntries(Object.entries(changes).map(([k,v])=>[k==='thoughtText'?'body':k,v]))});}
 async createTopic(request) {
  keys(request,['name','operationId'],['name','operationId']);if(typeof request.name!=='string'||!request.name.trim()||request.name.length>300)fail();
  return this.operation(request,async t=>{
   const id=this.uuid(),sectionId=this.uuid(),at=this.clock(),rank=rankBetween(),row={id,defaultSectionId:sectionId,name:request.name,summary:'',nameKey:request.name.toLocaleLowerCase(),revision:0,organizationRevision:0,activeLayoutGeneration:1,activeKey:0,pinKey:1,pinRank:rank,negativeUpdatedSequence:0,lifecycle:'active',createdBy:'user',createdAt:at,protections:protections('user',request.operationId,at)};
   await t.put('topics',row);const section={id:JSON.stringify([id,1,sectionId]),topicId:id,layoutGeneration:1,sectionId,isDefault:true,title:'',rank,revision:0,activeKey:0,lifecycle:'active',protections:protections('user',request.operationId,at)};await t.put('sections',section);
   await journal(this,t,{kind:'topic',entityId:id,before:null,after:row,fieldMask:['name'],actor:'user',reason:'baseline',important:true,operationId:request.operationId,sourceRecordIds:[]});
   await journal(this,t,{kind:'section',entityId:sectionId,documentId:id,before:null,after:section,fieldMask:['title','rank'],actor:'user',reason:'baseline',important:true,operationId:request.operationId,sourceRecordIds:[]});return {id,sectionId,revision:0};
  });
 }
 async renameTopic(request) {
  keys(request,['id','name','expectedRevision','operationId','restoreRevisionId'],['id','name','expectedRevision','operationId']);
  if(!idOK(request.id)||!revisionOK(request.expectedRevision)||typeof request.name!=='string'||!request.name.trim()||request.name.length>300)fail();
  return this.operation(request,async t=>{await checkRestore(this,t,request.restoreRevisionId,'topic',request.id);const row=await this.canonicalTopic(t,request.id);if(row.id!==request.id)fail();if(row.revision!==request.expectedRevision)return {conflict:true};const before=structuredClone(row);row.name=request.name;row.nameKey=request.name.toLocaleLowerCase();row.revision++;markHuman(row,'name',request.operationId,this.clock());await t.put('topics',row);await journal(this,t,{kind:'topic',entityId:row.id,before,after:row,fieldMask:['name'],actor:'user',reason:request.restoreRevisionId?'restore':'rename',important:true,operationId:request.operationId,baseRevision:request.expectedRevision,afterRevision:row.revision,sourceRecordIds:[]});return {id:row.id,revision:row.revision};});
 }
 async createSection(request) {
  keys(request,['topicId','expectedTopicRevision','title','rank','operationId'],['topicId','expectedTopicRevision','title','operationId']);
  if(!idOK(request.topicId)||!revisionOK(request.expectedTopicRevision)||typeof request.title!=='string'||request.title.length>300)fail();const requestedRank=request.rank===undefined?null:normalizeRank(request.rank);
  return this.operation(request,async t=>{const topic=await this.canonicalTopic(t,request.topicId);if(topic.id!==request.topicId)fail();if(topic.organizationRevision!==request.expectedTopicRevision)return {conflict:true};const last=this.libraryDocumentMode?await t.edge('sections','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]),'prev'):null,rank=requestedRank||(last?String(Number(last.rank)+1024).padStart(12,'0'):rankBetween());normalizeRank(rank);const sectionId=this.uuid(),row={id:JSON.stringify([topic.id,topic.activeLayoutGeneration,sectionId]),topicId:topic.id,layoutGeneration:topic.activeLayoutGeneration,sectionId,title:request.title,rank,revision:0,activeKey:0,lifecycle:'active',protections:protections('user',request.operationId,this.clock())};await t.put('sections',row);topic.organizationRevision++;await t.put('topics',topic);await journal(this,t,{kind:'section',entityId:sectionId,documentId:topic.id,before:null,after:row,fieldMask:['title','rank'],actor:'user',reason:'baseline',important:true,operationId:request.operationId,sourceRecordIds:[]});return {id:row.id,sectionId,revision:0,topicRevision:topic.organizationRevision};});
 }
 async canonicalTopic(t,id) {const seen=new Set();for(let i=0;i<32;i++){if(seen.has(id))fail();seen.add(id);const row=await t.get('topics',id);if(!row)fail();if(!row.redirectTo)return row;id=row.redirectTo;}fail();}
 async placeEntry(request) {
  keys(request,['entryId','topicId','sectionId','rank','operationId','expectedEntryRevision','expectedTopicRevision','expectedPlacementRevision','remove','restoreRevisionId'],['entryId','topicId','operationId','expectedEntryRevision','expectedTopicRevision']);
  if(!idOK(request.entryId)||!idOK(request.topicId)||!revisionOK(request.expectedEntryRevision)||!revisionOK(request.expectedTopicRevision))fail();
  if(request.remove!==undefined&&typeof request.remove!=='boolean')fail();
  return this.operation(request,async t=>{
   const e=await this.readableEntry(t,request.entryId),topic=await this.canonicalTopic(t,request.topicId);if(e.lifecycle!=='active'||topic.id!==request.topicId)fail();if(e.revision!==request.expectedEntryRevision||topic.organizationRevision!==request.expectedTopicRevision)return {conflict:true};
   const id=JSON.stringify([topic.id,topic.activeLayoutGeneration,e.id]);await checkRestore(this,t,request.restoreRevisionId,'placement',id);const old=await t.get('placements',id);if(old&&old.revision!==request.expectedPlacementRevision&&!(this.libraryDocumentMode&&old.lifecycle==='removed'&&request.expectedPlacementRevision===undefined))return {conflict:true};
   const section=request.sectionId?await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,request.sectionId])):topic.defaultSectionId?await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,topic.defaultSectionId])):await t.edge('sections','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]));if(!section||section.lifecycle!=='active'||section.redirectTo)fail();
   const last=this.libraryDocumentMode&&request.rank===undefined&&(!old||old.sectionId!==section.sectionId)?await t.edge('placements','bySectionOrder',prefix([topic.id,topic.activeLayoutGeneration,section.sectionId,0]),'prev'):null;
   const rank=request.rank===undefined?(last?String(Number(last.rank)+1024).padStart(12,'0'):old?.rank||rankBetween()):normalizeRank(request.rank);normalizeRank(rank);const row={id,topicId:topic.id,layoutGeneration:topic.activeLayoutGeneration,entryId:e.id,sectionId:section.sectionId,rank,sectionRank:section.rank,revision:(old?.revision??-1)+1,activeKey:request.remove?1:0,lifecycle:request.remove?'removed':'active',membershipAuthorship:'user',sectionProtection:true,orderProtection:true};
   e.organizationIntents??={included:[],excluded:[]};for(const k of ['included','excluded'])e.organizationIntents[k]=e.organizationIntents[k].filter(x=>x!==topic.id);e.organizationIntents[request.remove?'excluded':'included'].push(topic.id);e.organizationRevision++;e.revision++;markHuman(e,'topics',request.operationId,this.clock());markHuman(e,'section',request.operationId,this.clock());markHuman(e,'order',request.operationId,this.clock());e.topics=e.organizationIntents.included;
   topic.organizationRevision++;await t.put('thoughts',e);await t.put('topics',topic);await t.put('placements',row);
   await journal(this,t,{kind:'placement',entityId:id,documentId:topic.id,before:old||null,after:row,fieldMask:['membership','section','order'],actor:'user',reason:request.restoreRevisionId?'restore':request.remove?'remove':'place',important:true,operationId:request.operationId,sourceRecordIds:e.sourceRecordIds});return {id:e.id,revision:e.revision,placementRevision:row.revision,topicRevision:topic.organizationRevision};
  });
 }
}
