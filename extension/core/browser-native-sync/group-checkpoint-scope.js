import {measureSourceWorkingPhysicalTree} from './source-working-physical.js';
import {prepareMixedRestoredAllocationProof,assertMixedRestoredPhysicalAllocations} from './mixed-restored-allocation.js';
import {borrowOriginalMixedScopeCompilationMeta,requireOriginalMixedNativeCanonicalCut,requireOriginalMixedNativeControl} from './human-library-plan.js';
import {assertMixedCurrentSourceDerivedRows} from './mixed-current-source-derived.js';
import {assertMixedInitialPhysicalAllocations,assertMixedInitialHumanPhysicalAllocations} from './mixed-initial-allocation.js';
import {syncLibrary,emptyLibrary} from '../library.js';
import {defaults} from '../workspace.js';
import {readContextCards,validContextCards,CONTEXT_CARDS_ROW} from '../context-cards.js';
import {readPromptPreferences,PROMPT_REUSE_ROW,emptyPromptPreferences,validPromptPreferences} from '../prompt-reuse-preferences.js';
import {assertManualPromptCurrentPhysicalShape} from './manual-prompt-current-shape.js';
import {assertCurrentContextSnapshot,hasCurrentContextOperations} from './manual-context-current-snapshot.js';
import {assertCompletedGroupedRestoreControl} from './completed-group-restore-control.js';
import {backupMetaAllowed} from '../backup-format.js';
import {projectEntity} from './codecs.js';
import {clone,digest,equal,fail,count,exact,hash,opaque} from './value.js';
import {compileHumanScope,prepareHumanScopeProof,hasHumanScope,requireHumanScope,assertOriginalMixedNativeHumanBodies,prepareHumanCurrentGroupScopeProjection,requireHumanCurrentGroupScope,encodeHumanCurrentGroupScope,publishHumanCurrentGroupScope,releaseHumanCurrentScopeProjection} from './human-library-scope.js';
import {normalizePhysical,physical} from './human-library-journal.js';
import {requireOriginalGroupCheckpointPlan,requireOriginalCurrentSourceWorkingGroupPlan,requireSelectedCurrentSourceWorkingGroupPlan,requireOriginalCurrentMixedGroupPlan,originalCurrentMixedGroupCore} from './group-checkpoint-plan.js';
import {acceptSequence} from './core.js';
import {protocolPhysicalId} from './physical-key.js';
import {deltaDescription,deltaSignature,KNOWN_PREFIX,DIRTY_PREFIX,HUMAN_FENCE,DELTA_COUNTER} from '../ai-usage/delta.js';
import {emptyContextCards as emptyContext} from '../context-cards.js';
import {REVISION_POLICY} from '../ia-store.js';
import {FILTER_VERSIONS} from '../smart-filter.js';
const originalScopes=new WeakMap(),ScopeWeakRef=globalThis.WeakRef,scopeDeref=ScopeWeakRef.prototype.deref;
const freezeScope=value=>{if(value&&typeof value==='object'){for(const item of Object.values(value))freezeScope(item);Object.freeze(value);}return value;};
// Called only by the original native compiler while this Scope is preparing.
// The opaque original nonce is separately authenticated by that native owner.
export function requireOriginalMixedHumanCompilationInput(core,scope,wire,plan){
 requireOriginalCurrentMixedGroupPlan(core,plan);const p=originalScopes.get(scope);
 if(arguments.length!==4||!p||p.phase!=='preparing'||scopeDeref.call(p.plan)!==plan||p.humanWire!==wire||p.expected!==scope.expected||p.ownerScope!==scope.ownerScope)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
}
export function requireGroupHumanCompilationInput(scope,wire){
 const p=originalScopes.get(scope);if(p&&(p.phase!=='preparing'||p.humanWire!==wire))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
}
export function requireOriginalCurrentGroupScope(core,scope,plan){
 const p=originalScopes.get(scope);requireOriginalGroupCheckpointPlan(core,plan);
 if(arguments.length!==3||!p||p.phase!=='ready'||scopeDeref.call(p.plan)!==plan||p.expected!==scope.expected||p.ownerScope!==scope.ownerScope||!hasHumanScope(scope)||!plan.groups.some(g=>g.type==='humanLibraryCommit')||plan.groups.some(g=>!['humanLibraryCommit','promptPreferences','contextItem','contextRulesItem','contextNowItem','contextDesired'].includes(g.type)))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
}
// Original compilation identity for the consuming mixed recovery path. This
// is not native-read authority and cannot authenticate a cloned Scope/Plan.
export function requireOriginalCurrentMixedGroupScope(core,scope,plan){
 requireOriginalCurrentMixedGroupPlan(core,plan);const p=originalScopes.get(scope);
 if(arguments.length!==3||!p||p.phase!=='ready'||scopeDeref.call(p.plan)!==plan||p.expected!==scope.expected||p.ownerScope!==scope.ownerScope||!hasHumanScope(scope)||plan.operationCount>128||!plan.groups.some(g=>g.type==='sourceBootstrapCommit')||!plan.groups.some(g=>g.type==='inputWorkingCommit')||!plan.groups.some(g=>g.type==='humanLibraryCommit'))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
}
// Selected Source/Working compilation identity only. A raw argument still has
// no native read authority; the fixed native owner must supply its private cut.
export function requireOriginalCurrentSourceWorkingGroupScope(core,scope,plan){
 const p=originalScopes.get(scope);requireSelectedCurrentSourceWorkingGroupPlan(core,plan);
 if(arguments.length!==3||!p||p.phase!=='ready'||scopeDeref.call(p.plan)!==plan||p.expected!==scope.expected||p.ownerScope!==scope.ownerScope||hasHumanScope(scope)||plan.operationCount>128||plan.groups.filter(g=>g.type==='sourceBootstrapCommit').length!==1||plan.groups.filter(g=>g.type==='inputWorkingCommit').length<1||plan.groups.filter(g=>g.type==='inputWorkingCommit').length>2||plan.groups.some(g=>!['sourceBootstrapCommit','inputWorkingCommit'].includes(g.type)))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 for(const name of ['records','blocks','inputStates','documents','libraryDocuments'])if(scope.expected[name].length!==1)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 if(scope.expected.revisions.length>96)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
}
export const currentHumanGroupEmptyStores=Object.freeze(['records','recordIndex','blocks','blockIndex','documents','libraryDocuments','times','tombstones','migrationBackup','sourceCounts','importTasks','importBatches','importEvidence','importSources','filterInputs','filterIntents','inputStates','inputRemovals','categories','dependencies','invalidations','provenance','organizerJobs','organizerWorkItems','organizerSuggestions','entryRelations','librarySearchTerms','organizerUsage']);
export const currentHumanGroupStores=Object.freeze(['meta','thoughts','topics','sections','placements','thoughtSuppressions','revisions','operationReceipts','libraryMigrationItems',...currentHumanGroupEmptyStores]);
// Called only by the fixed original native capture after metering all source
// trees and operands. No public Core or wrapper read is a source of truth.
export async function assertCurrentHumanGroupNativeSnapshot(core,scope,plan,raw,control,databaseId){
 requireOriginalCurrentGroupScope(core,scope,plan);
 if(!equal(control.preferences,defaults())||!equal(control.memoryAccessPolicy,{enabled:false,status:'disabled'})||control.classificationRules.length||control.filterRules.length)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 const rows=new Map(raw.groupMeta.map(row=>[row.id,row])),take=(id,expected)=>{const row=rows.get(id);if(!row||!equal(row,{...expected,id}))fail('BNS_GROUP_COMMIT_UNPROVEN');rows.delete(id);};
 const key=(kind,...parts)=>protocolPhysicalId(core.prefix,raw.namespace,kind,parts),frontiers=new Map(),operations=plan.groups.flatMap(g=>g.operations),latest=new Map();let promptHead=null,promptOperation=null;
 const generation=rows.get(key('generation'));if(!generation||!count(generation.value)||generation.value<1)fail('BNS_GROUP_COMMIT_UNPROVEN');take(key('generation'),{value:generation.value});
 const epoch=raw.points['recovery-restore-epoch']?.value??null,restore=rows.get(key('ownerRecoveryEpoch'));
 if(restore)take(key('ownerRecoveryEpoch'),{version:1,epoch});else if(epoch!==null)fail('BNS_RESTORE_EPOCH_UNBOUND');
 const active=raw.points[core.prefix+'active'];if(active&&(!exact(active,['id','namespace','manifestId','graphDigest'])||typeof active.namespace!=='string'||active.manifestId!==undefined&&!hash(active.manifestId)||active.graphDigest!==undefined&&!hash(active.graphDigest)))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 for(const op of operations){
  take(key('revision',op.revisionId),{operation:op,redacted:false});take(key('receipt',op.operationId),{digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence});
  take(key('sequence',op.deviceId,String(op.sequence).padStart(16,'0')),{operationId:op.operationId,digest:op.revisionId});take(key('entityRevision',op.type,op.entityId,op.revisionId),{revisionId:op.revisionId});
  frontiers.set(op.deviceId,acceptSequence(frontiers.get(op.deviceId),op.sequence));
  const out=key('outbox',op.operationId);if(rows.has(out))take(out,{operationId:op.operationId,revisionId:op.revisionId,state:'queued'});
 }
 for(const head of plan.heads){take(key('head',head.type,head.entityId),head);const op=operations.find(op=>op.revisionId===head.revisions[0]);if(head.type==='humanLibraryMember')latest.set(head.entityId,op);else if(head.type==='promptPreferences'){if(promptHead||head.entityId!==PROMPT_REUSE_ROW||head.purged||head.revisions.length!==1||!op||op.type!=='promptPreferences'||op.entityId!==PROMPT_REUSE_ROW)fail('BNS_GROUP_COMMIT_UNPROVEN');promptHead=head;promptOperation=op;}}
 for(const [deviceId,state]of frontiers)take(key('frontier',deviceId),{...state,deviceId});
 const local=operations.filter(op=>op.deviceId===core.deviceId);if(local.length)take(key('device',core.deviceId),{sequence:Math.max(...local.map(op=>op.sequence))});
 const tables={entry:'thoughts',topic:'topics',section:'sections',placement:'placements',suppression:'thoughtSuppressions',history:'revisions'};
 for(const [id,op]of latest){const {entityType:type,after}=op.value,name=tables[type],actual=name?raw.rows[name].find(row=>row.id===after.id):raw.prefixes['topicKeepSeparate:'].find(row=>row.id===after.id);if(!actual)fail('BNS_GROUP_COMMIT_UNPROVEN');take(key('humanMapping',id),{type,local:physical(type,actual),wire:physical(type,after),revisionId:op.revisionId});}
 // The initial native owner prepays this physical/expected phase. Finish
 // original validation/projector frames before later metadata comparisons.
 if(plan.groups.some(group=>group.type==='promptPreferences')){
  const physicalPrompt=rows.get(PROMPT_REUSE_ROW);if(!promptHead||!physicalPrompt)fail('BNS_GROUP_COMMIT_UNPROVEN');
  assertManualPromptCurrentPhysicalShape(physicalPrompt);
  take(key('materializedOwner','promptPreferences',PROMPT_REUSE_ROW),{version:1,revisionId:promptHead.revisions[0],ownerRevision:physicalPrompt.revision});
  assertManualPromptNativeValue(physicalPrompt,promptOperation.value,scope.expected.prompt);rows.delete(PROMPT_REUSE_ROW);
 }
 // This selected family runs only after the original native owner has paid
 // its independent physical/expected/history/transition scratch phase. Both
 // owner helpers unwind before final unknown metadata inventory.
 if(hasCurrentContextOperations(plan))assertCurrentContextSnapshot(core,scope,plan,raw,rows);
 // Exactly one terminal control for this active replay. The full native cut
 // retains every row, and the final unknown inventory still rejects leftover
 // groupItem rows, extra controls and all other inactive protocol metadata.
 // Native admission prepays this original immutable-identity phase before its
 // asynchronous digest; no public reader or caller-supplied proof is trusted.
 if(active?.manifestId!==undefined||active?.graphDigest!==undefined){
  const completed=[];for(const [id,row]of rows)if(id.startsWith(core.prefix+'generation:')&&id.endsWith(':restore:'))completed.push(row);
  if(completed.length!==1)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
  await assertCompletedGroupedRestoreControl(completed[0],{prefix:core.prefix,datasetId:core.datasetId,active,namespace:raw.namespace,epoch});rows.delete(completed[0].id);
 }
 // Exact attested Human key inventory, never a prefix exemption. The active
 // namespace and generation points are already authenticated by native R.
 for(const row of Object.values(raw.points))if(row)rows.delete(row.id);
 for(const list of Object.values(raw.prefixes))for(const row of list)rows.delete(row.id);
 for(const [id,row]of rows){
  if(id===CONTEXT_CARDS_ROW){if(!equal(row,emptyContext()))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');continue;}
  if(id===PROMPT_REUSE_ROW){if(!equal(row,emptyPromptPreferences()))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');continue;}
  if(id==='sequence'){if(!equal(row,{id,records:0,blocks:0,documents:0}))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');continue;}
  if(id==='migration'){if(!exact(row,['id','phase','databaseId','cursor','digest','verified','recoveryVerified','recordCount','blockCount'])||row.phase!=='active'||row.databaseId!==databaseId||!opaque(databaseId)||!hash(row.digest)||row.cursor!==0||row.verified!==true||row.recoveryVerified!==true||row.recordCount!==0||row.blockCount!==0)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');continue;}
  if(id==='thought-ddl'){if(!equal(row,{id,fromVersion:row.fromVersion,toVersion:5})||!count(row.fromVersion)||row.fromVersion>5)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');continue;}
  if(id==='ia-migration'){if(!exact(row,['id','phase','cursor','count','version','startedAt','verified','completedAt','policy'])||row.phase!=='active'||row.cursor!==null||row.count!==0||row.version!==1||row.verified!==true||!equal(row.policy,REVISION_POLICY)||!Number.isFinite(Date.parse(row.startedAt))||!Number.isFinite(Date.parse(row.completedAt)))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');continue;}
  if(id==='smart-filter'){if(!exact(row,['id','phase','migrationVersion','cursor','mapped','legacyCount','mode','noticePending','decisionSequence','policyEpoch',...Object.keys(FILTER_VERSIONS),'verified','diagnosticsVersion','taskState','completedAt'])||row.phase!=='active'||row.migrationVersion!==1||row.cursor!==null||row.mapped!==0||row.legacyCount!==0||row.mode!=='light'||row.noticePending!==false||row.decisionSequence!==0||row.policyEpoch!==0||row.verified!==true||row.diagnosticsVersion!==1||!Object.entries(FILTER_VERSIONS).every(([k,v])=>row[k]===v)||row.taskState!=='idle'||!Number.isFinite(Date.parse(row.completedAt)))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');continue;}
  if(id==='thought-binding:v1'){if(!equal(row,{id,version:1,cursor:null,complete:true,input:0,thought:row.thought})||!count(row.thought))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');continue;}
  if(id==='thought-reverse-edit:v1'){if(!equal(row,{id,version:1,enabled:false}))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');continue;}
  if(id==='library-documents-compat-v2'){const fields=['activeTopics','repairedTopics','repairedIndexTopics','repairedGenerationTopics','repairedDefaultSections','unresolvedLayouts','indexedActiveTopics','indexGap'];if(!exact(row,['id','cursor','complete',...fields,'completedAt'])||row.cursor!==null||row.complete!==true||!fields.every(k=>count(row[k]))||row.unresolvedLayouts!==0||row.indexGap!==0||!Number.isFinite(Date.parse(row.completedAt)))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');continue;}
  if(id===HUMAN_FENCE||id===DELTA_COUNTER||id==='backup-data-generation'||id==='input-delta-sequence'){if(!equal(row,{id,value:row.value})||!count(row.value))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');continue;}
  if(id.startsWith(KNOWN_PREFIX)||id.startsWith(DIRTY_PREFIX)){
   const known=raw.groupMeta.find(x=>x.id===KNOWN_PREFIX+row.descriptor?.key),journal=raw.rows.revisions.find(x=>x.id===row.descriptor?.journalId),descriptor=journal&&deltaDescription('revisions',journal);
   if(!descriptor||!equal(row.descriptor,descriptor)||row.signature!==deltaSignature(descriptor)||row.version!==1||!count(row.sequence)||row.sequence<1||!known)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
   const base={id,version:1,descriptor,signature:row.signature,sequence:row.sequence};
   if(id.startsWith(DIRTY_PREFIX)){if(id!==DIRTY_PREFIX+descriptor.key||!equal(row,{...base,requirements:[],pendingFacets:['topic','context']})||!equal({...known,id},base))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');}
   else if(id!==KNOWN_PREFIX+descriptor.key||!equal(row,base))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');continue;
  }
  fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 }
 const revision=raw.points['revision-sequence'];if((revision?.value||0)!==Math.max(0,...raw.rows.revisions.map(row=>row.sequence)))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 return true;
}
function assertManualPromptNativeValue(physical,operation,expected){
 if(!validPromptPreferences(physical))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 const wire=projectEntity('promptPreferences',physical);
 if(!equal(wire,operation)||!equal(wire,expected))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
}
const sort=rows=>rows.sort((a,b)=>a.id.localeCompare(b.id));
const ephemeralStores=new Set(['recordIndex','blockIndex','sourceCounts','filterInputs','invalidations','librarySearchTerms','migrationBackup','operationReceipts']);
const represented=new Set(['records','times','documents','libraryDocuments','blocks','inputStates','revisions','filterIntents','meta']);
const counters=new Set(['thought-suppression-key','thought-sequence','revision-sequence','input-delta-sequence','thought-epoch']);
const readRows=async(t,name)=>{if(await t.count(name)>128)fail('BNS_GROUP_RESOURCE_LIMIT');return t.all(name);};
// Exact portable expectations compiled from admitted typed operations, not from
// arbitrary canonical metadata. Only each owner's named physical counters map.
async function compileOriginalWireScope(plan){
 const maps=Object.fromEntries(['records','times','blocks','inputStates','revisions','filterIntents'].map(name=>[name,new Map()]));
 const context=new Map(),desired=new Map();let prompt=projectEntity('promptPreferences',emptyPromptPreferences());
 for(const group of plan.groups){
  if(group.type==='sourceBootstrapCommit'||group.type==='sourceAppendCommit')for(const op of group.prepared.members){const {entityType:type,entity:value}=op.value,name={source:'records',timeEvidence:'times',input:'blocks',inputState:'inputStates',baselineRevision:'revisions'}[type];if(name&&!(type==='timeEvidence'&&value.value===null))maps[name].set(value.id,clone(value));}
  else if(group.type==='inputWorkingCommit')for(const op of group.prepared.members){const {entityType:type,entity:value}=op.value;maps[{input:'blocks',inputState:'inputStates',revision:'revisions',filterIntent:'filterIntents'}[type]].set(value.id,clone(value));}
  else if(group.type!=='humanLibraryCommit'){const op=group.operations[0];if(group.type==='filterIntent')maps.filterIntents.set(op.entityId,clone(op.value));else if(group.type==='promptPreferences')prompt=clone(op.value);else if(group.type==='contextDesired')desired.set(op.entityId,clone(op.value));else context.set(op.entityId,clone(op.value));}
 }
 const human=plan.groups.some(group=>group.type==='humanLibraryCommit')?compileHumanScope(plan):null;if(human)for(const row of human.rows.history)maps.revisions.set(row.id,clone(row));
 const library={records:[...maps.records.values()],library:emptyLibrary()};syncLibrary(library);
 const documents=library.library.documents.map(row=>{const value={...row,titleRevision:0};delete value.sourceRecordIds;return value;});
 const expected=Object.fromEntries(Object.entries(maps).map(([name,map])=>[name,sort([...map.values()])]));
 expected.documents=sort(documents);expected.libraryDocuments=documents.map(({titleRevision,...row})=>row);
 expected.context=sort([...context.values()]);expected.desired=['info','rules','now','inputs'].map(id=>desired.get(id)||{id,enabled:false,revision:0});expected.prompt=prompt;
 if(human)expected.humanLibrary=human;
 const normalized=clone(expected);for(const row of normalized.inputStates)row.deltaSequence=0;for(const row of normalized.revisions){row.sequence=0;row.listKey=[row.entityKey,0];row.documentList=[row.documentId,0];}
 const families=[];for(const [type,value]of Object.entries(normalized)){const count=Array.isArray(value)?value.length:1;families.push({type,count,digest:await digest(value)});}
 const scope={expected:normalized,ownerScope:{version:1,profile:'bounded-admitted-local-owners',families:families.sort((a,b)=>a.type.localeCompare(b.type))}};return {scope,human};
}
// Exact original wire-family commitment only. Local keyed expectations and
// native authority are not created by this body-free imported-prefix check.
export async function prepareOriginalMixedWireOwnerScope(core,plan){
 requireOriginalCurrentMixedGroupPlan(core,plan);const {scope}=await compileOriginalWireScope(plan);requireOriginalCurrentMixedGroupPlan(core,plan);return scope.ownerScope;
}
export async function prepareGroupScope(plan,{store,nativeMixedCompilation}={}){
 const {scope,human}=await compileOriginalWireScope(plan),p={plan:new ScopeWeakRef(plan),expected:scope.expected,ownerScope:scope.ownerScope,phase:'preparing',humanWire:human,mixedCore:originalCurrentMixedGroupCore(plan)};originalScopes.set(scope,p);
 try{
  if(p.mixedCore&&store){
   const meta=nativeMixedCompilation!==undefined?borrowOriginalMixedScopeCompilationMeta(nativeMixedCompilation,store,scope,human):await store.run(()=>store.repository.transaction(false,async t=>{if(await t.count('meta')>4096)fail('BNS_GROUP_RESOURCE_LIMIT');return t.all('meta');},['meta']));
   measureSourceWorkingPhysicalTree(meta);freezeScope(meta);if(meta.some(row=>row.id===p.mixedCore.prefix+'active'))p.restoredAllocation=await prepareMixedRestoredAllocationProof(p.mixedCore,plan,meta);
  }
  if(human)await prepareHumanScopeProof(store,scope,human,nativeMixedCompilation);freezeScope(scope);p.humanWire=null;p.phase='ready';return scope;
 }catch(error){originalScopes.delete(scope);throw error;}
}
export async function requireGroupScope(store,t,scope){
 const c=await store.control(t);
 if(!equal(c.preferences,defaults())||!equal(c.memoryAccessPolicy,{enabled:false,status:'disabled'})||c.classificationRules.length||c.filterRules.length)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 const human=hasHumanScope(scope)?await requireHumanScope(store,t,scope):null,humanStores=new Set(['thoughts','topics','sections','placements','thoughtSuppressions','libraryMigrationItems']);
 for(const name of t.tx.objectStoreNames)if(!represented.has(name)&&!ephemeralStores.has(name)&&!(human&&humanStores.has(name))&&await t.count(name))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 // Only key bounded metadata inspection. Never export arbitrary meta/body rows.
 const keys=await new Promise((resolve,reject)=>{const out=[],r=t.tx.objectStore('meta').openKeyCursor();r.onerror=()=>reject(r.error);r.onsuccess=()=>{const cursor=r.result;if(!cursor)return resolve(out);if(out.length===10000)return reject(Object.assign(new Error('BNS_GROUP_RESOURCE_LIMIT'),{code:'BNS_GROUP_RESOURCE_LIMIT'}));out.push(cursor.key);cursor.continue();};});
 for(const key of keys){
  if(human?.allowed.has(key))continue;
  if(key===CONTEXT_CARDS_ROW||key===PROMPT_REUSE_ROW||counters.has(key))continue;
  if(key==='smart-filter'){const row=await t.get('meta',key);if(row.mode!=='light'||row.policyEpoch!==0)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');continue;}
  if(backupMetaAllowed(key))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 }
 const actual={};for(const name of ['records','blocks','documents','libraryDocuments'])actual[name]=sort((await readRows(t,name)).map(row=>row.value));
 for(const name of ['times','inputStates','revisions','filterIntents'])actual[name]=sort(await readRows(t,name));
 const original=originalScopes.get(scope);if(original?.mixedCore){
  const plan=scopeDeref.call(original.plan);requireOriginalCurrentMixedGroupScope(original.mixedCore,scope,plan);
  if(await t.count('meta')>4096)fail('BNS_GROUP_RESOURCE_LIMIT');const meta=await t.all('meta'),humanRows={revisions:actual.revisions};
  for(const name of ['thoughts','topics','operationReceipts'])humanRows[name]=await readRows(t,name);
  if(original.restoredAllocation)assertMixedRestoredPhysicalAllocations(original.mixedCore,scope,plan,actual,meta,original.restoredAllocation,humanRows);
  else{
   assertMixedInitialPhysicalAllocations(original.mixedCore,scope,plan,actual,{active:meta.find(row=>row.id===original.mixedCore.prefix+'active')??null,input:meta.find(row=>row.id==='input-delta-sequence')??null,history:meta.find(row=>row.id==='revision-sequence')??null});
   assertMixedInitialHumanPhysicalAllocations(original.mixedCore,scope,plan,humanRows,meta);
  }
 }
 const context=await readContextCards(t);actual.context=sort(context.items);actual.desired=['info','rules','now','inputs'].map(id=>({id,...context.access[id]}));
 actual.prompt=projectEntity('promptPreferences',await readPromptPreferences(t));
 if(human){const revisions=await t.all('revisions'),sequence=await t.get('meta','revision-sequence');if((sequence?.value||0)!==Math.max(0,...revisions.map(row=>row.sequence)))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');}
 return compareGroupCanonicalValues(scope,actual,human);
}
function compareGroupCanonicalValues(scope,actual,human){
 for(const row of actual.inputStates){if(!count(row.deltaSequence)||row.deltaSequence<1)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');row.deltaSequence=0;}
 for(const row of actual.revisions){if(!count(row.sequence)||row.sequence<1||!equal(row.listKey,[row.entityKey,row.sequence])||!equal(row.documentList,[row.documentId,row.sequence]))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');row.sequence=0;row.listKey=[row.entityKey,0];row.documentList=[row.documentId,0];}
 const expected=clone(scope.expected);if(human){const ids=new Set(human.history.map(row=>row.id));actual.revisions=actual.revisions.map(row=>ids.has(row.id)?normalizePhysical('history',row):row);expected.revisions=sort([...expected.revisions.filter(row=>!ids.has(row.id)),...human.history]);delete expected.humanLibrary;}
 if(!equal(actual,expected))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 return true;
}
// Original Scope comparison on the already frozen native R, without a fake
// transaction, a supplied repository facade or a second canonical snapshot.
// Protocol/full-metadata/search admission remains independently required.
export function assertOriginalCurrentMixedNativeBodies(core,store,scope,plan,raw,control,nonce,searchProof){
 if(arguments.length!==8)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');requireOriginalMixedNativeCanonicalCut(nonce,store,core,scope,plan,raw);
 requireOriginalMixedNativeControl(nonce,store,core,scope,plan,raw,control);
 if(!equal(control.preferences,defaults())||!equal(control.memoryAccessPolicy,{enabled:false,status:'disabled'})||control.classificationRules.length||control.filterRules.length)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 assertMixedCurrentSourceDerivedRows(core,scope,plan,raw.rows);
 const human=assertOriginalMixedNativeHumanBodies(store,core,scope,plan,raw,nonce,searchProof),actual={},original=originalScopes.get(scope);
 for(const name of ['records','blocks','documents','libraryDocuments'])actual[name]=sort(raw.rows[name].map(row=>clone(row.value)));
 for(const name of ['times','inputStates','revisions','filterIntents'])actual[name]=sort(raw.rows[name].map(row=>clone(row)));
 const humanRows={revisions:actual.revisions,thoughts:raw.rows.thoughts,topics:raw.rows.topics,operationReceipts:raw.rows.operationReceipts};
 if(original.restoredAllocation)assertMixedRestoredPhysicalAllocations(core,scope,plan,actual,raw.rows.meta,original.restoredAllocation,humanRows);
 else{assertMixedInitialPhysicalAllocations(core,scope,plan,actual,{active:raw.rows.meta.find(row=>row.id===core.prefix+'active')??null,input:raw.rows.meta.find(row=>row.id==='input-delta-sequence')??null,history:raw.rows.meta.find(row=>row.id==='revision-sequence')??null});assertMixedInitialHumanPhysicalAllocations(core,scope,plan,humanRows,raw.rows.meta);}
 const context=raw.rows.meta.find(row=>row.id===CONTEXT_CARDS_ROW)??emptyContext(),prompt=raw.rows.meta.find(row=>row.id===PROMPT_REUSE_ROW)??emptyPromptPreferences();
 if(!validContextCards(context)||!validPromptPreferences(prompt))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 actual.context=sort(context.items.map(row=>clone(row)));actual.desired=['info','rules','now','inputs'].map(id=>({id,...context.access[id]}));actual.prompt=projectEntity('promptPreferences',prompt);
 return compareGroupCanonicalValues(scope,actual,human);
}


// Local readonly export lifecycle; restore compilation calls neither function.
export async function prepareGroupCurrentProjection(store,core,scope,plan){
 requireOriginalCurrentGroupScope(core,scope,plan);await prepareHumanCurrentGroupScopeProjection(store,core,scope,plan);
}
export async function requireGroupCurrentProjection(store,core,t,scope,plan){
 requireOriginalCurrentGroupScope(core,scope,plan);await requireHumanCurrentGroupScope(store,t,scope,plan);return true;
}
export async function encodeGroupCurrentProjection(core,scope,plan,transport,options){
 requireOriginalCurrentGroupScope(core,scope,plan);return encodeHumanCurrentGroupScope(scope,plan,transport,options);
}
export async function publishGroupCurrentProjection(core,scope,plan,checkpoint,transport,options){
 requireOriginalCurrentGroupScope(core,scope,plan);return publishHumanCurrentGroupScope(scope,plan,checkpoint,transport,options);
}
export function releaseGroupCurrentProjection(scope){
 if(hasHumanScope(scope))releaseHumanCurrentScopeProjection(scope);
}
