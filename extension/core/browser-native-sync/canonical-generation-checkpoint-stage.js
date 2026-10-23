import {CANONICAL_PHASED_TASK,GENERATION_TASK_LIMITS,enterOriginalGenerationTaskInvocation,leaveOriginalGenerationTaskInvocation,originalGenerationTaskData,originalGenerationTaskStart,originalGenerationTaskReserve,originalGenerationTaskSettle,originalGenerationTaskBurn} from './canonical-generation-task-ledger.js';
import {requireNoSourcePurgeDeny} from './source-purge-journal.js';
import {ArchiveError,CONSENT_VERSION} from '../constants.js';
import {requireOriginalLibraryDocumentsStore} from '../library-documents-owner.js';
import {prepareGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {prepareGroupScope,requireGroupScope} from './group-checkpoint-scope.js';
import {equalSourceWorkingPhysicalTree} from './source-working-physical.js';
import {requireRepositoryTransactionDataMethods,registerRepositoryWorkLimit,registerRepositoryFinalReadFence,readOriginalCommittedTransactionWork} from '../idb-repository.js';
import {CanonicalGenerationPublication,originalCheckpointStagingWrite,CANONICAL_GENERATION_GATE} from './canonical-generation-publication.js';
import {BrowserNativeSyncCore} from './core.js';
import {readObject,assertProtocolObjectReference,SEGMENT_PROFILE} from './segments.js';
import {checkpointItems,originalPhasedHumanCheckpointItems} from './checkpoints.js';
import {assertGroupedCheckpointManifest} from './group-checkpoint-manifest.js';
import {validateGroupedCheckpointGraph,prepareValidatedGroupedCheckpointGraph} from './group-checkpoint.js';
import {createGroupPageBudget,chargeGroupPageValue,chargeGroupPageBytes,checkGroupPageBudget,GROUP_PAGE_LIMITS} from './group-page-reader.js';
import {bytes,clone,decodeJSON,digest,equal,hash} from './value.js';

// Explicit shadow-generation consumer. It authenticates checkpoint transport and
// the original bounded complete graph; it does not materialize canonical rows,
// grant product access, publish chrome.local or choose the application's DB.
export const CANONICAL_CHECKPOINT_PREFIX='canonical-generation:checkpoint:';
export const CANONICAL_CHECKPOINT_STATE=CANONICAL_CHECKPOINT_PREFIX+'state:v1';
const ITEM=CANONICAL_CHECKPOINT_PREFIX+'item:',PAGE=CANONICAL_CHECKPOINT_PREFIX+'page:',PAGE_ITEMS=32;
const repositoryAuthorities=new WeakMap(),PROTECTION='canonical-generation:repository-protection:v1';
const phasedProofs=new WeakMap(),iteratorAuthorities=new WeakMap();
export function requireOriginalPhasedCheckpointIterator(stage,manifest,get){const p=iteratorAuthorities.get(stage);if(!p||p.manifest!==manifest||p.get!==get)throw new ArchiveError('GENERATION_TASK_REQUIRED');p.check();}
const proofs=new WeakMap(),fail=(code='GENERATION_CHECKPOINT_CHANGED')=>{throw new ArchiveError(code);};
const key=(prefix,n)=>prefix+String(n).padStart(8,'0');
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const own=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
function stateData(row,core){
 if(!own(row,['id','version','phase','manifestRef','manifest','manifestEncoded','received','pages','payloadBytes','chain','pageChain','graphDigest','sourceBase'])||row.id!==CANONICAL_CHECKPOINT_STATE||row.version!==1||!['staging','authenticated','validated'].includes(row.phase)||!Number.isSafeInteger(row.received)||row.received<0||row.received>GROUP_PAGE_LIMITS.refs||!Number.isSafeInteger(row.pages)||row.pages<0||row.pages>Math.ceil(GROUP_PAGE_LIMITS.refs/PAGE_ITEMS)||!Number.isSafeInteger(row.payloadBytes)||row.payloadBytes<0||row.payloadBytes>GROUP_PAGE_LIMITS.bytes||row.pages!==Math.ceil(row.received/PAGE_ITEMS)||row.chain!==''&&!hash(row.chain)||row.pageChain!==''&&!hash(row.pageChain)||row.graphDigest!==null&&!hash(row.graphDigest)||row.phase==='validated'&&!hash(row.graphDigest))fail();
 assertProtocolObjectReference(row.manifestRef);if(row.manifestRef.kind!=='checkpoint-manifest'||!Array.isArray(row.manifestEncoded)||row.manifestEncoded.length!==row.manifestRef.encodedBytes||row.manifestEncoded.some(v=>!Number.isInteger(v)||v<0||v>255))fail();
 assertGroupedCheckpointManifest(row.manifest,{core});if(row.received>row.manifest.itemCount||row.phase!=='staging'&&(row.received!==row.manifest.itemCount||row.chain!==row.manifest.chain))fail();return row;
}
function binding(store,core){if(!(core instanceof BrowserNativeSyncCore)||store?.repository!==core.repository)fail('GENERATION_CHECKPOINT_BINDING');return {store,core,repository:core.repository,datasetId:core.datasetId,prefix:core.prefix,namespace:core.fixedNamespace};}
function current(b){if(b.store.repository!==b.repository||b.core.repository!==b.repository||b.core.datasetId!==b.datasetId||b.core.prefix!==b.prefix||b.core.fixedNamespace!==b.namespace)fail('GENERATION_CHECKPOINT_BINDING');return true;}
export function readOriginalCheckpointRepositoryAuthority(token,repository,scope){
 const r=repositoryAuthorities.get(token);if(!r)return null;current(r.binding);if(r.binding.repository!==repository||scope!==null&&r.scope!==null&&r.scope!==scope)fail('GENERATION_REPOSITORY_WRITE_DENIED');if(scope!==null&&r.scope===null)r.scope=scope;return r.authority;
}
// Only the original completed, empty Foundation metadata is admitted. No old
// protocol namespace, staged body copy, diagnostic row or unknown field survives
// installation merely because it happened to remain stable during this TX.
const freshMetadataShapes={
 'backup-data-generation':'id,value','gate':'enabled,epoch,id','ia-migration':'completedAt,count,cursor,id,phase,policy,startedAt,verified,version',
 'library-documents-compat-v2':'activeTopics,complete,completedAt,cursor,id,indexGap,indexedActiveTopics,repairedDefaultSections,repairedGenerationTopics,repairedIndexTopics,repairedTopics,unresolvedLayouts',
 'local-control-publication:revision':'id,revision,version','migration':'blockCount,cursor,databaseId,digest,id,phase,recordCount,recoveryVerified,verified','sequence':'blocks,documents,id,records',
 'smart-filter':'classifierVersion,completedAt,cursor,decisionSequence,diagnosticsVersion,filterVersion,id,legacyCount,mapped,migrationVersion,mode,noticePending,phase,policyEpoch,policyVersion,taskState,verified',
 'thought-binding:v1':'complete,cursor,id,input,thought,version','thought-ddl':'fromVersion,id,toVersion','thought-library':'completedAt,cursor,fromVersion,id,libraryActivation,mapped,migrationVersion,phase,quarantined,schemaVersion,sealed,startedAt,targetVersion,verified',
 'thought-reverse-edit:v1':'enabled,id,version','thought-suppression-key':'id,value'
};
function freshMetadata(row){
 const shape=freshMetadataShapes[row?.id];if(!shape||Object.keys(row).sort().join(',')!==shape)fail('GENERATION_CHECKPOINT_NOT_EMPTY');
 const literals={phase:'active',mode:'light',taskState:'idle',classifierVersion:'deterministic-light-2',libraryActivation:'ready'};
 for(const [key,value]of Object.entries(row)){
  if(key==='id')continue;if(Object.hasOwn(literals,key)){if(value!==literals[key])fail('GENERATION_CHECKPOINT_NOT_EMPTY');continue;}
  if(key==='startedAt'||key==='completedAt'){if(typeof value!=='string'||!Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value)fail('GENERATION_CHECKPOINT_NOT_EMPTY');continue;}
  if(key==='databaseId'){if(typeof value!=='string'||!/^[a-f0-9-]{36}$/.test(value))fail('GENERATION_CHECKPOINT_NOT_EMPTY');continue;}
  if(key==='digest'){if(!hash(value))fail('GENERATION_CHECKPOINT_NOT_EMPTY');continue;}
  if(key==='policy'){if(!equal(value,{days:90,importantMinimum:20,coalesceMs:60000}))fail('GENERATION_CHECKPOINT_NOT_EMPTY');continue;}
  if(row.id==='thought-suppression-key'){if(!Array.isArray(value)||value.length!==32||value.some(x=>!Number.isInteger(x)||x<0||x>255))fail('GENERATION_CHECKPOINT_NOT_EMPTY');continue;}
  if(key==='cursor'){if(value!==null&&value!==0)fail('GENERATION_CHECKPOINT_NOT_EMPTY');continue;}
  if(typeof value==='boolean')continue;if(!Number.isSafeInteger(value)||value<0)fail('GENERATION_CHECKPOINT_NOT_EMPTY');
 }
 for(const key of ['count','mapped','quarantined','sealed','input','thought','records','blocks','documents','blockCount','recordCount','activeTopics','indexGap','indexedActiveTopics','repairedDefaultSections','repairedGenerationTopics','repairedIndexTopics','repairedTopics','unresolvedLayouts','legacyCount','decisionSequence','policyEpoch'])if(Object.hasOwn(row,key)&&row[key]!==0)fail('GENERATION_CHECKPOINT_NOT_EMPTY');
}
// Read-only fixed initial metadata capture for the phased original owner.
// The checkpoint copies are separately authenticated by its private graph.
export async function captureOriginalPhasedEmptyMetadata(store,t){requireOriginalLibraryDocumentsStore(store);const rows=[];for(const key of await t.keys('meta',null,null,4096)){if(key.startsWith(CANONICAL_CHECKPOINT_PREFIX))continue;const row=await t.get('meta',key);if(![PROTECTION,CANONICAL_GENERATION_GATE].includes(key))freshMetadata(row);rows.push(row);}if(!equal(rows.map(r=>r.id).sort(),[...Object.keys(freshMetadataShapes),PROTECTION,CANONICAL_GENERATION_GATE].sort()))fail('GENERATION_CHECKPOINT_NOT_EMPTY');return rows;}
async function protectedEmptyClosure(binding,t,scope){
 requireOriginalLibraryDocumentsStore(binding.store);const c=await binding.store.control(t);if(!c.settings.enabled||c.settings.consentVersion!==CONSENT_VERSION)fail('GENERATION_CHECKPOINT_BINDING');await requireGroupScope(binding.store,t,scope);
 const rows=[],counts=[];for(const table of t.tx.objectStoreNames){const keys=await t.keys(table,null,null,4096);if(table!=='meta'&&keys.length)fail('GENERATION_CHECKPOINT_NOT_EMPTY');if(table==='meta'&&(!equal([...keys].sort(),[...Object.keys(freshMetadataShapes),PROTECTION,CANONICAL_GENERATION_GATE].sort())))fail('GENERATION_CHECKPOINT_NOT_EMPTY');counts.push([table,keys.length]);for(const key of keys){if(table==='meta'&&key===CANONICAL_GENERATION_GATE)continue;const row=await t.get(table,key);if(key!==PROTECTION)freshMetadata(row);rows.push([table,key,row]);}}
 registerRepositoryFinalReadFence(binding.repository,t,{isCurrent:()=>current(binding),plan:function*(){for(const [table,count]of counts)if((yield {method:'count',table})!==count)fail();for(const [table,key,value]of rows)if(!equalSourceWorkingPhysicalTree(yield {method:'get',table,key},value))fail();return true;}});
}
function pointPlan(points,counts){return function*(){for(const [prefix,total]of counts)if((yield {method:'count',table:'meta',key:IDBKeyRange.bound(prefix,prefix+'\uffff',false,true)})!==total)fail();for(const row of points)if(!equal((yield {method:'get',table:'meta',key:row.id})??null,row))fail();return true;};}
function sealRows(repository,t,points,counts,isCurrent=()=>true){registerRepositoryFinalReadFence(repository,t,{isCurrent,plan:pointPlan(points,counts)});}
async function readRows(t,prefix,budget=createGroupPageBudget()){let after=null,out=[];do{const page=await t.primaryRangePage('meta',{prefix,after,limit:1});checkGroupPageBudget(budget);for(const {key:k,value}of page.rows){if(k!==value.id)fail();chargeGroupPageValue(budget,value);out.push(value);if(out.length>GROUP_PAGE_LIMITS.refs)fail('BNS_GROUP_RESOURCE_LIMIT');}after=page.next;}while(after!==null);return out;}
function held(proof,options){const p=proofs.get(proof);if(!p||p.binding.store!==options?.store||p.binding.core!==options?.core)fail('GENERATION_CHECKPOINT_PROOF_REQUIRED');current(p.binding);if(performance.now()-p.created>=30000)fail('BNS_GROUP_RESOURCE_LIMIT');return p;}
export function readCanonicalCheckpointProof(proof,options){const p=held(proof,options);return freeze(clone({manifestRef:p.state.manifestRef,manifest:p.state.manifest,items:p.items.map(x=>x.item),graphDigest:p.state.graphDigest,stateId:p.state.id,generationIdentity:p.gate.identity,sourceBase:p.state.sourceBase}));}
async function requireProof(proof,options,t,sealGate){
 const p=held(proof,options),repository=p.binding.repository;requireRepositoryTransactionDataMethods(repository,t);registerRepositoryWorkLimit(repository,t);
 await requireNoSourcePurgeDeny(p.binding.core,t);
 const points=[p.state,p.gate,...p.items,...p.pages];for(const row of points)if(!equal(await t.get('meta',row.id)??null,row))fail();
 const itemRows=await readRows(t,ITEM),pageRows=await readRows(t,PAGE);if(!equal(itemRows,p.items)||!equal(pageRows,p.pages))fail();
 sealRows(repository,t,sealGate?points:points.filter(row=>row.id!==CANONICAL_GENERATION_GATE),[[ITEM,p.items.length],[PAGE,p.pages.length]],()=>{held(proof,options);return true;});return true;
}
export const requireCanonicalCheckpointProof=(proof,options,t)=>requireProof(proof,options,t,true);
// Original sealing coordinator still reads the old gate here; the publication
// owner alone writes and seals its successor gate in this same transaction.
export const requireCanonicalCheckpointProofForSeal=(proof,options,t)=>requireProof(proof,options,t,false);
export const requireCanonicalCheckpointInputProof=requireCanonicalCheckpointProofForSeal;
// Read-only original graph qualification. The opaque proof remains separate
// from both old whole-TX proofs and every repository writer capability.
export function readCanonicalPhasedHumanProof(proof,options){const p=phasedProofs.get(proof);if(!p||p.binding.store!==options?.store||p.binding.core!==options?.core)fail('GENERATION_TASK_PROOF_REQUIRED');current(p.binding);return p.packet;}

function boundedTransport(get,budget){const started=performance.now();let ended=false;return {close(){ended=true;},get:async ref=>{if(ended)fail('BNS_GROUP_RESOURCE_LIMIT');checkGroupPageBudget(budget);assertProtocolObjectReference(ref);chargeGroupPageBytes(budget,ref.decodedBytes);let timer;try{const remaining=30000-(performance.now()-started);if(remaining<=0)fail('BNS_GROUP_RESOURCE_LIMIT');const raw=await Promise.race([Promise.resolve().then(()=>get(ref)),new Promise((_,reject)=>{timer=setTimeout(()=>{ended=true;reject(new ArchiveError('BNS_GROUP_RESOURCE_LIMIT'));},remaining);})]);if(ended)fail('BNS_GROUP_RESOURCE_LIMIT');checkGroupPageBudget(budget);if(raw instanceof Uint8Array)chargeGroupPageBytes(budget,raw.byteLength);return raw;}finally{clearTimeout(timer);}}};}
export class CanonicalGenerationCheckpointStage {
 #publication;#handle;#binding;#checkpoint;#protect;
 constructor(publication,handle,{store,core,checkpoint=async()=>{},protectRepository=false}){if(!(publication instanceof CanonicalGenerationPublication)||typeof checkpoint!=='function'||typeof protectRepository!=='boolean')fail('GENERATION_CHECKPOINT_BINDING');this.#publication=publication;this.#handle=handle;this.#binding=binding(store,core);this.#checkpoint=checkpoint;this.#protect=protectRepository;}
 async #read(){current(this.#binding);return this.#binding.repository.transaction(false,async t=>{const state=await t.get('meta',CANONICAL_CHECKPOINT_STATE);return state===undefined?null:stateData(state,this.#binding.core);},['meta']);}
 async #write(fn,kind='checkpoint',phased=false){
  current(this.#binding);const token=Object.freeze(Object.create(null));repositoryAuthorities.set(token,{binding:this.#binding,scope:null,authority:Object.freeze({kind})});try{return await originalCheckpointStagingWrite(this.#publication,this.#handle,async t=>{requireRepositoryTransactionDataMethods(this.#binding.repository,t);await requireNoSourcePurgeDeny(this.#binding.core,t);if(!phased&&await t.get('meta',CANONICAL_PHASED_TASK))fail('GENERATION_TASK_REQUIRED');return fn(t);},token,kind==='checkpoint-install'?undefined:['meta']);}finally{repositoryAuthorities.delete(token);}
 }
 async #protectRepository(){
  if(!this.#protect)return;requireOriginalLibraryDocumentsStore(this.#binding.store);const marker=await this.#binding.repository.transaction(false,t=>t.get('meta',PROTECTION),['meta']);if(marker!=null)return;
  const plan=await prepareGroupCheckpointPlan(this.#binding.core,[]),scope=await prepareGroupScope(plan,{store:this.#binding.store});
  await this.#write(async t=>{if(await t.get('meta',PROTECTION)!=null)fail('GENERATION_CHECKPOINT_COLLISION');const gate=await t.get('meta',CANONICAL_GENERATION_GATE);await t.put('meta',{id:PROTECTION,version:1,mode:'shadow-v1',identity:gate.identity,registryName:gate.registryName});await protectedEmptyClosure(this.#binding,t,scope);},'checkpoint-install');
 }
 async begin(ref,get){const budget=createGroupPageBudget(),transport=boundedTransport(get,budget);try{return await this.#begin(ref,transport.get,budget);}finally{transport.close();}}
 async #begin(ref,get,budget){
  ref=clone(ref);current(this.#binding);if(ref?.kind!=='checkpoint-manifest'||typeof get!=='function')fail('BNS_CHECKPOINT_INVALID');
  const prior=await this.#read(),sourceToken=await this.#publication.captureSourceBase(prior?.sourceBase),sourceBase=this.#publication.sourceBaseSnapshot(sourceToken);
  let manifestEncoded;const decoded=await readObject(ref,async requested=>{const raw=await get(requested);if(!(raw instanceof Uint8Array))return raw;const owned=raw.slice();manifestEncoded=Array.from(owned);return owned;},{profile:SEGMENT_PROFILE});checkGroupPageBudget(budget);const manifest=decodeJSON(decoded,SEGMENT_PROFILE.decoded);assertGroupedCheckpointManifest(manifest,{core:this.#binding.core});
  await this.#publication.captureSourceBase(sourceBase);await this.#protectRepository();const before=await this.#read();if(before){if(!equal(before.manifestRef,ref)||!equal(before.manifest,manifest))fail('GENERATION_CHECKPOINT_COLLISION');return clone(before);}
  const state={id:CANONICAL_CHECKPOINT_STATE,version:1,phase:'staging',manifestRef:clone(ref),manifest,manifestEncoded,received:0,pages:0,payloadBytes:0,chain:'',pageChain:'',graphDigest:null,sourceBase};
  await this.#write(async t=>{if(await t.get('meta',state.id)||(await t.primaryRangePage('meta',{prefix:CANONICAL_CHECKPOINT_PREFIX,limit:1})).rows.length)fail('GENERATION_CHECKPOINT_COLLISION');await t.put('meta',state);sealRows(this.#binding.repository,t,[state],[[ITEM,0],[PAGE,0]],()=>current(this.#binding));});return clone(state);
 }
 async #append(expected,items,phase=null){
  if(!items.length||items.length>PAGE_ITEMS||expected.received%PAGE_ITEMS!==0)fail();
  let chain=expected.chain,payloadBytes=expected.payloadBytes;for(const item of items){const raw=bytes(item);payloadBytes+=raw.length;if(payloadBytes>GROUP_PAGE_LIMITS.bytes)fail('BNS_GROUP_RESOURCE_LIMIT');chain=await digest(bytes(chain+'\n'+new TextDecoder().decode(raw)));}
  const pageDigest=await digest(bytes(items)),pageChain=await digest(bytes(expected.pageChain+'\n'+pageDigest)),rows=items.map((item,i)=>({id:key(ITEM,expected.received+i),item:clone(item)}));
  const receipt={id:key(PAGE,expected.pages),version:1,index:expected.pages,start:expected.received,count:items.length,pageDigest,pageChain};
  const next={...expected,received:expected.received+items.length,pages:expected.pages+1,payloadBytes,chain,pageChain};stateData(next,this.#binding.core);
  let committed;await this.#write(async t=>{committed=t;if(phase){phase.check();if(!equal(await t.get('meta',CANONICAL_PHASED_TASK),phase.task))fail('GENERATION_TASK_CHANGED');registerRepositoryWorkLimit(this.#binding.repository,t,{bytes:Math.max(1,phase.ticket.bytes-phase.bytes),ms:Math.max(1,Math.floor(phase.ticket.ms-(performance.now()-phase.started)))});}if(!equal(await t.get('meta',expected.id),expected)||await t.get('meta',receipt.id))fail();for(const row of rows){if(await t.get('meta',row.id))fail();await t.put('meta',row);}await t.put('meta',receipt);await t.put('meta',next);sealRows(this.#binding.repository,t,[next,receipt,...rows],[],()=>current(this.#binding));},'checkpoint',!!phase);if(phase){phase.bytes+=readOriginalCommittedTransactionWork(this.#binding.repository,committed).bytes;phase.check();}await this.#checkpoint('committed-page',{index:receipt.index,received:next.received});return next;
 }
 async stageCheckpoint(ref,get){const budget=createGroupPageBudget(),transport=boundedTransport(get,budget);try{return await this.#stageCheckpoint(ref,transport.get,budget);}finally{transport.close();}}
 async #stageCheckpoint(ref,get,budget){
  let state=await this.#begin(ref,get,budget);if(state.phase!=='staging')return state;
  let at=0,page=[],replayedChain='';
  // Replay authenticates the complete immutable transport chain on every resume;
  // the original iterator's cumulative budget is not reset for each page.
  for await(const item of checkpointItems(state.manifest,get,{profile:SEGMENT_PROFILE})){
   chargeGroupPageValue(budget,item);
   replayedChain=await digest(bytes(replayedChain+'\n'+new TextDecoder().decode(bytes(item))));at++;
   if(at<=state.received){const stored=await this.#binding.repository.transaction(false,t=>t.get('meta',key(ITEM,at-1)),['meta']);if(!equal(stored,{id:key(ITEM,at-1),item}))fail();continue;}
   page.push(item);if(page.length===PAGE_ITEMS){state=await this.#append(state,page);page=[];}
  }
  if(page.length)state=await this.#append(state,page);
  if(at!==state.manifest.itemCount||state.received!==at||state.chain!==replayedChain||state.chain!==state.manifest.chain)fail('BNS_CHECKPOINT_COUNT');
  const next={...state,phase:'authenticated'};await this.#write(async t=>{if(!equal(await t.get('meta',state.id),state))fail();await t.put('meta',next);sealRows(this.#binding.repository,t,[next],[[ITEM,state.received],[PAGE,state.pages]],()=>current(this.#binding));});return clone(next);
 }
 // New explicit task. The caller first uses the unchanged bounded begin()
 // to authenticate the manifest and capture sourceBase. No old invocation has
 // its meter reset. This method owns its durable continuation ledger.
 async stagePhasedHumanCheckpoint(get){const lease=enterOriginalGenerationTaskInvocation(this.#binding.repository);try{return await this.#stagePhasedHumanCheckpoint(get);}finally{leaveOriginalGenerationTaskInvocation(this.#binding.repository,lease);}}
 async #stagePhasedHumanCheckpoint(get){
  if(typeof get!=='function')fail('BNS_CHECKPOINT_INVALID');let state=await this.#read();
  if(!state||state.manifest.coverage.some(x=>!['humanLibraryCommit','humanLibraryMember'].includes(x.type)))fail('GENERATION_TASK_PROFILE');
  await this.#publication.captureSourceBase(state.sourceBase);
  const gate=await this.#binding.repository.transaction(false,t=>t.get('meta',CANONICAL_GENERATION_GATE),['meta']);
  const identity={manifestId:state.manifestRef.id,generationIdentity:gate.identity,sourceBase:state.sourceBase};
  let task=await this.#binding.repository.transaction(false,t=>t.get('meta',CANONICAL_PHASED_TASK),['meta']);
  if(!task){if(state.phase!=='staging'||state.received!==0)fail('GENERATION_TASK_PROFILE');task=originalGenerationTaskStart(identity);await this.#write(async t=>{if(await t.get('meta',task.id)||!equal(await t.get('meta',state.id),state))fail();await t.put('meta',task);sealRows(this.#binding.repository,t,[task,state],[]);},'checkpoint',true);}
  originalGenerationTaskData(task);if(!equal(task.identity,identity))fail();
  const persist=async(before,after)=>{await this.#write(async t=>{if(!equal(await t.get('meta',before.id),before))fail('GENERATION_TASK_CHANGED');await t.put('meta',after);sealRows(this.#binding.repository,t,[after],[]);},'checkpoint',true);task=after;};
  if(task.pending)await persist(task,originalGenerationTaskBurn(task));
  if(state.phase==='authenticated'&&task.phase==='authenticated')return {state:clone(state),task:clone(task)};
  if(!['staging','authenticated'].includes(state.phase)||task.phase!=='staging')fail('GENERATION_TASK_CHANGED');
  let phase=null,ended=false,iterator;const transportIds=new Set(task.transportIds);
  const phaseCurrent=()=>{if(ended||!phase||phase.bytes>phase.ticket.bytes||performance.now()-phase.started>=phase.ticket.ms)fail('BNS_GROUP_RESOURCE_LIMIT');};
  const read=async ref=>{phaseCurrent();ref=clone(ref);assertProtocolObjectReference(ref);transportIds.add(ref.id);if(transportIds.size+state.manifest.itemCount>GENERATION_TASK_LIMITS.graphReferences)fail('BNS_GROUP_RESOURCE_LIMIT');phase.bytes+=ref.decodedBytes;phaseCurrent();let timer;try{const raw=await Promise.race([Promise.resolve().then(()=>get(clone(ref))),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new ArchiveError('BNS_GROUP_RESOURCE_LIMIT')),Math.max(1,phase.ticket.ms-(performance.now()-phase.started)));})]);phaseCurrent();if(raw instanceof Uint8Array)phase.bytes+=raw.byteLength;phaseCurrent();return raw;}finally{clearTimeout(timer);}};
  const reserve=async()=>{const next=originalGenerationTaskReserve(task,'authenticate',{bytes:Math.min(2*1024*1024,GENERATION_TASK_LIMITS.workBytes-task.workBytes),ms:Math.min(30000,GENERATION_TASK_LIMITS.activeMs-task.activeMs)});await persist(task,next);phase={ticket:task.pending,task:clone(task),started:performance.now(),bytes:0,check:phaseCurrent};};
  const settle=async(nextPhase='staging')=>{phaseCurrent();const next=originalGenerationTaskSettle(task,phase.ticket,{bytes:phase.bytes,activeMs:performance.now()-phase.started,transportIds:[...transportIds]},nextPhase);phase=null;await persist(task,next);};
  try{
   // Resume reauthenticates the complete immutable chain; prior pages are read
   // and compared, and that repeated work is charged again to the same task.
   iteratorAuthorities.set(this,{manifest:state.manifest,get:read,check:()=>{if(ended)fail('GENERATION_TASK_REQUIRED');}});iterator=originalPhasedHumanCheckpointItems(this,state.manifest,read)[Symbol.asyncIterator]();let at=0,done=false;
   while(!done){await reserve();const page=[];let processed=0;while(processed++<PAGE_ITEMS){const item=await iterator.next();phaseCurrent();if(item.done){done=true;break;}if(item.value.kind==='revision'&&(item.value.operation?.type==='humanLibraryCommit'&&item.value.operation.value?.kind!=='entry'||!['humanLibraryCommit','humanLibraryMember'].includes(item.value.operation?.type)))fail('GENERATION_TASK_PROFILE');const raw=bytes(item.value);phase.bytes+=raw.length;phaseCurrent();if(++at<=state.received){let scope;const stored=await this.#write(async t=>{scope=t;phaseCurrent();registerRepositoryWorkLimit(this.#binding.repository,t,{bytes:Math.max(1,phase.ticket.bytes-phase.bytes),ms:Math.max(1,Math.floor(phase.ticket.ms-(performance.now()-phase.started)))});if(!equal(await t.get('meta',CANONICAL_PHASED_TASK),phase.task))fail('GENERATION_TASK_CHANGED');return t.get('meta',key(ITEM,at-1));},'checkpoint',true);phase.bytes+=readOriginalCommittedTransactionWork(this.#binding.repository,scope).bytes;if(!equal(stored,{id:key(ITEM,at-1),item:item.value}))fail();phaseCurrent();continue;}page.push(item.value);}
    if(page.length)state=await this.#append(state,page,phase);
    if(done){if(at!==state.manifest.itemCount||state.received!==at||state.chain!==state.manifest.chain)fail('BNS_CHECKPOINT_COUNT');const next={...state,phase:'authenticated'};let scope;await this.#write(async t=>{scope=t;phase.check();if(!equal(await t.get('meta',CANONICAL_PHASED_TASK),phase.task))fail('GENERATION_TASK_CHANGED');registerRepositoryWorkLimit(this.#binding.repository,t,{bytes:Math.max(1,phase.ticket.bytes-phase.bytes),ms:Math.max(1,Math.floor(phase.ticket.ms-(performance.now()-phase.started)))});if(!equal(await t.get('meta',state.id),state))fail();await t.put('meta',next);sealRows(this.#binding.repository,t,[next],[[ITEM,state.received],[PAGE,state.pages]]);},'checkpoint',true);phase.bytes+=readOriginalCommittedTransactionWork(this.#binding.repository,scope).bytes;state=next;}
    await settle(done?'authenticated':'staging');
   }
   return {state:clone(state),task:clone(task)};
  }finally{ended=true;phase=null;iteratorAuthorities.delete(this);}
 }
 async validatePhasedHumanCheckpoint(){const lease=enterOriginalGenerationTaskInvocation(this.#binding.repository);try{return await this.#validatePhasedHumanCheckpoint();}finally{leaveOriginalGenerationTaskInvocation(this.#binding.repository,lease);}}
 async #validatePhasedHumanCheckpoint(){
  const before=await this.#read();if(!before||before.phase!=='authenticated')fail('GENERATION_CHECKPOINT_NOT_READY');
  await this.#publication.captureSourceBase(before.sourceBase);
  let task=originalGenerationTaskData(await this.#binding.repository.transaction(false,t=>t.get('meta',CANONICAL_PHASED_TASK),['meta']));
  if(task.identity.manifestId!==before.manifestRef.id||!equal(task.identity.sourceBase,before.sourceBase)||task.phase!=='authenticated')fail('GENERATION_TASK_CHANGED');
  const persist=async(old,next)=>{await this.#write(async t=>{if(!equal(await t.get('meta',old.id),old))fail();await t.put('meta',next);sealRows(this.#binding.repository,t,[next],[]);},'checkpoint',true);task=next;};
  if(task.pending)await persist(task,originalGenerationTaskBurn(task));
  let phase=null;const items=[],pages=[],validationPrefix=CANONICAL_CHECKPOINT_PREFIX+'validated-page:';
  const currentPhase=()=>{current(this.#binding);if(!phase||phase.bytes>phase.ticket.bytes||performance.now()-phase.started>=phase.ticket.ms)fail('BNS_GROUP_RESOURCE_LIMIT');};
  const reserve=async()=>{const next=originalGenerationTaskReserve(task,'validate',{bytes:Math.min(2*1024*1024,GENERATION_TASK_LIMITS.workBytes-task.workBytes),ms:Math.min(30000,GENERATION_TASK_LIMITS.activeMs-task.activeMs)});await persist(task,next);phase={ticket:task.pending,started:performance.now(),bytes:0};};
  const dataWrite=async fn=>{currentPhase();let scope;const result=await this.#write(async t=>{scope=t;currentPhase();registerRepositoryWorkLimit(this.#binding.repository,t,{bytes:Math.max(1,phase.ticket.bytes-phase.bytes),ms:Math.max(1,Math.floor(phase.ticket.ms-(performance.now()-phase.started)))});if(!equal(await t.get('meta',CANONICAL_PHASED_TASK),task)||!equal(await t.get('meta',before.id),before))fail();return fn(t);},'checkpoint',true);phase.bytes+=readOriginalCommittedTransactionWork(this.#binding.repository,scope).bytes;currentPhase();return result;};
  const settle=async(nextPhase='authenticated')=>{currentPhase();const next=originalGenerationTaskSettle(task,phase.ticket,{bytes:phase.bytes,activeMs:performance.now()-phase.started},nextPhase);phase=null;await persist(task,next);};
  // Reauthenticate the original encoded manifest under this task; mutable
  // durable decoded fields or an alternative ref cannot manufacture a proof.
  await reserve();phase.bytes+=before.manifestRef.encodedBytes+before.manifestRef.decodedBytes;currentPhase();const decoded=await readObject(before.manifestRef,async()=>Uint8Array.from(before.manifestEncoded),{profile:SEGMENT_PROFILE});currentPhase();if(!equal(decodeJSON(decoded,SEGMENT_PROFILE.decoded),before.manifest))fail();await settle();
  let chain='',pageChain='',payloadBytes=0;
  for(let n=0;n<before.pages;n++){
   await reserve();const read=await dataWrite(async t=>{const page=await t.get('meta',key(PAGE,n)),rows=[];for(let i=n*PAGE_ITEMS;i<Math.min(before.received,(n+1)*PAGE_ITEMS);i++){const row=await t.get('meta',key(ITEM,i));if(!own(row,['id','item'])||row.id!==key(ITEM,i))fail();rows.push(row);}const gate=await t.get('meta',CANONICAL_GENERATION_GATE);sealRows(this.#binding.repository,t,[before,page,{...gate,writeRevision:gate.writeRevision+1},...rows],[[ITEM,before.received],[PAGE,before.pages]]);return {page,rows,gate:{...gate,writeRevision:gate.writeRevision+1}};});
   const values=read.rows.map(x=>x.item),raw=bytes(values);phase.bytes+=raw.length;currentPhase();const pageDigest=await digest(raw);pageChain=await digest(bytes(pageChain+'\n'+pageDigest));
   const expected={id:key(PAGE,n),version:1,index:n,start:n*PAGE_ITEMS,count:values.length,pageDigest,pageChain};if(!equal(read.page,expected))fail();
   for(const row of read.rows){const encoded=bytes(row.item);payloadBytes+=encoded.length;if(payloadBytes>GENERATION_TASK_LIMITS.payloadBytes)fail('BNS_GROUP_RESOURCE_LIMIT');chain=await digest(bytes(chain+'\n'+new TextDecoder().decode(encoded)));}
   const receipt={id:key(validationPrefix,n),version:1,taskId:task.taskId,manifestId:before.manifestRef.id,index:n,pageDigest,pageChain,count:values.length};
   await dataWrite(async t=>{if(!equal(await t.get('meta',CANONICAL_GENERATION_GATE),read.gate))fail();const old=await t.get('meta',receipt.id);if(old&&!equal(old,receipt))fail();await t.put('meta',receipt);sealRows(this.#binding.repository,t,[before,receipt],[]);});items.push(...values);pages.push(receipt);await settle();
  }
  if(items.length!==before.manifest.itemCount||chain!==before.chain||pageChain!==before.pageChain||payloadBytes!==before.payloadBytes)fail();
  await reserve();phase.bytes+=payloadBytes;currentPhase();const plan=await prepareValidatedGroupedCheckpointGraph(this.#binding.core,items,before.manifest,{store:this.#binding.store});currentPhase();const graphDigest=plan.digest;
  if(plan.digest!==graphDigest||plan.groups.some(g=>g.type!=='humanLibraryCommit'||g.prepared.descriptor.value.kind!=='entry'||g.prepared.members.some(m=>!['entry','history'].includes(m.value.entityType)||m.value.before!==null||m.value.after.sourceRecordIds?.length)))fail('GENERATION_TASK_PROFILE');
  await this.#publication.captureSourceBase(before.sourceBase);const final={id:CANONICAL_CHECKPOINT_PREFIX+'validated-task:v1',version:1,taskId:task.taskId,manifestId:before.manifestRef.id,graphDigest,generationIdentity:task.identity.generationIdentity,sourceBase:before.sourceBase,itemCount:items.length,pageCount:pages.length,chain,pageChain};
  await dataWrite(async t=>{const gate=await t.get('meta',CANONICAL_GENERATION_GATE);if(!equal(gate.identity,task.identity.generationIdentity))fail();if((await t.keys('meta',null,IDBKeyRange.bound(validationPrefix,validationPrefix+'\uffff',false,true),4096)).length!==pages.length)fail();for(const row of pages)if(!equal(await t.get('meta',row.id),row))fail();await t.put('meta',final);sealRows(this.#binding.repository,t,[before,final,...pages],[[ITEM,before.received],[PAGE,before.pages],[validationPrefix,pages.length]]);});await settle('validated');
  const proof=Object.freeze(Object.create(null));phasedProofs.set(proof,{binding:this.#binding,packet:Object.freeze({plan,manifestRef:freeze(clone(before.manifestRef)),graphDigest,generationIdentity:freeze(clone(task.identity.generationIdentity)),sourceBase:freeze(clone(before.sourceBase)),task:freeze(clone(task)),state:freeze(clone(before)),items:freeze(clone(items)),validation:freeze(clone(final)),pages:freeze(clone(pages))})});return proof;
 }
 async validate(){
  const before=await this.#read();if(!before||before.phase==='staging')fail('GENERATION_CHECKPOINT_NOT_READY');await this.#publication.captureSourceBase(before.sourceBase);const budget=createGroupPageBudget();chargeGroupPageValue(budget,before);const manifestBytes=await readObject(before.manifestRef,async()=>Uint8Array.from(before.manifestEncoded),{profile:SEGMENT_PROFILE});checkGroupPageBudget(budget);if(!equal(decodeJSON(manifestBytes,SEGMENT_PROFILE.decoded),before.manifest))fail('GENERATION_CHECKPOINT_CHANGED');const snapshot=await this.#binding.repository.transaction(false,async t=>{
   if(!equal(await t.get('meta',before.id),before))fail();const items=await readRows(t,ITEM,budget),pages=await readRows(t,PAGE,budget),gate=await t.get('meta',CANONICAL_GENERATION_GATE);return {items,pages,gate};
  },['meta']);
  if(snapshot.items.length!==before.received||snapshot.pages.length!==before.pages||snapshot.gate?.phase!=='staging')fail();let chain='',pageChain='',payloadBytes=0;
  for(let n=0;n<snapshot.pages.length;n++){const page=snapshot.items.slice(n*PAGE_ITEMS,(n+1)*PAGE_ITEMS).map(row=>row.item),pageDigest=await digest(bytes(page));pageChain=await digest(bytes(pageChain+'\n'+pageDigest));const expected={id:key(PAGE,n),version:1,index:n,start:n*PAGE_ITEMS,count:page.length,pageDigest,pageChain};if(!equal(snapshot.pages[n],expected))fail();}
  for(let n=0;n<snapshot.items.length;n++){const row=snapshot.items[n];if(!own(row,['id','item'])||row.id!==key(ITEM,n))fail();const raw=bytes(row.item);payloadBytes+=raw.length;chain=await digest(bytes(chain+'\n'+new TextDecoder().decode(raw)));}
  if(payloadBytes!==before.payloadBytes||chain!==before.chain||pageChain!==before.pageChain)fail();
  const graphDigest=await validateGroupedCheckpointGraph(this.#binding.core,snapshot.items.map(x=>x.item),before.manifest,{store:this.#binding.store});checkGroupPageBudget(budget);if(before.graphDigest!==null&&before.graphDigest!==graphDigest)fail();
  await this.#publication.captureSourceBase(before.sourceBase);const next={...before,phase:'validated',graphDigest};let expectedGate=snapshot.gate;
  await this.#write(async t=>{const points=[before,snapshot.gate,...snapshot.items,...snapshot.pages];for(const row of points)if(!equal(await t.get('meta',row.id)??null,row))fail();await t.put('meta',next);sealRows(this.#binding.repository,t,[next,...snapshot.items,...snapshot.pages],[[ITEM,snapshot.items.length],[PAGE,snapshot.pages.length]],()=>current(this.#binding));expectedGate={...snapshot.gate,writeRevision:snapshot.gate.writeRevision+1};});
  const proof=Object.freeze(Object.create(null));proofs.set(proof,{binding:this.#binding,state:clone(next),items:clone(snapshot.items),pages:clone(snapshot.pages),gate:clone(expectedGate),created:performance.now()});return proof;
 }
}
