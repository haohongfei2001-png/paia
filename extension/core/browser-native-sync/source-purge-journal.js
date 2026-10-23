import {planSourcePurgeMetadata} from './source-purge-metadata.js';
import {sourcePurgeNegativeInventory,prepareSourcePurgeRemainingCanonical} from './source-purge-negative.js';
import {planInitialFilter} from '../smart-filter-store-owner.js';
import {archiveYearPrefix,archiveYearMeta} from '../archive-year-index.js';
import {prepareGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {prepareGroupScope,requireGroupScope,requireSourcePurgeRemainingScope} from './group-checkpoint-scope.js';
import {readGroupRows} from './group-page-reader.js';
import {recordIndex,blockIndex,sourceCount,chatOf} from '../idb-repository.js';
import {measureSourceWorkingPhysicalTree,equalSourceWorkingPhysicalTree} from './source-working-physical.js';
import {PreparedPublicationJournal} from './publications.js';
import {assertProtocolObjectReference} from './segments.js';
import {acceptSequence,validateOperation} from './core.js';
import {validateSourcePurgeIntent} from './source-purge-codec.js';
import {prepareInitialSourcePlan,initialSourcePlan} from './source-bootstrap-plan.js';
import {JournalRestoreFence} from './prompt-journal.js';
import {bytes,clone,equal,fail,exact} from './value.js';
import {CONSENT_VERSION} from '../constants.js';
import {requireRepositoryTransactionScope,requireRepositoryTransactionDataMethods,registerRepositoryFinalReadFence,registerRepositoryWorkLimit} from '../idb-repository.js';
import {readOriginalControlSettings,assertOriginalControlSettingsFacts} from '../indexed-store.js';
import {CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION,readControlPublicationFence} from '../local-control-publication.js';
const owners=new WeakMap(),plans=new WeakMap(),applications=new WeakMap(),incoming=new WeakMap(),maintenance=new WeakMap();
const denied=()=>fail('BNS_SOURCE_PURGE_UNSUPPORTED');
const prefixRange=p=>IDBKeyRange.bound(p,p+'\uffff',false,true);
const residentCheckpointPrefix='canonical-generation:checkpoint:';
async function requireNoResidentCheckpoint(t){if((await t.primaryRangePage('meta',{prefix:residentCheckpointPrefix,limit:1})).rows.length)denied();}
const allowedKinds=new Set(['revision','head','receipt','sequence','frontier','generation','device','outbox','entityRevision','ownerRecoveryEpoch']);
async function rows(t,prefix){const result=[];let after=null;do{const p=await t.primaryRangePage('meta',{prefix,after,limit:64});for(const row of p.rows){result.push(row.value);if(result.length>512||bytes(result).length>2*1024*1024)denied();}after=p.next;}while(after!==null);return result;}
async function authority(store,core,t){
 await requireNoResidentCheckpoint(t);
 const control=await store.control(t),publication=await readControlPublicationFence(t),library=await t.get('meta','thought-library');
 if(!control.settings.enabled||control.settings.consentVersion!==CONSENT_VERSION||publication.reservation||publication.migration?.phase!=='active'||publication.migration.databaseId!==store.databaseId||library?.sealed||library?.phase!=='active'||library?.verified!==true)denied();
 return {settings:clone(control.settings),fence:await new JournalRestoreFence(core).snapshot(t),control:readOriginalControlSettings(store,t),roots:await Promise.all(['recovery-restore-epoch','migration',CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION,'thought-library',core.prefix+'active'].map(async id=>[id,await t.get('meta',id)??null])),generation:(await t.get('meta','backup-data-generation'))?.value||0};
}
function binding(store,journal){const owner=owners.get(journal);if(!owner||Object.getPrototypeOf(journal)!==SourcePurgeJournal.prototype||journal.core!==owner.core||store.sourcePurgeJournal!==journal||store.repository!==owner.core.repository)denied();return owner.core;}
export class SourcePurgeJournal{constructor(core){this.core=core;owners.set(this,{core});}}
// Core observes this identity; callers cannot mint it or install a transaction.
export function requireSourcePurgeProtocolOwner(t,core,operation,origin){const p=applications.get(t);if(!p||p.core!==core||p.operation!==operation||p.origin!==origin)fail('BNS_SOURCE_PURGE_OWNER_REQUIRED');requireRepositoryTransactionScope(core.repository,t);requireRepositoryTransactionDataMethods(core.repository,t);}

async function confirmedPublicationRows(core,all,namespace){
 const prefix=core.prefix+'generation:'+namespace+':',map=new Map(all.map(row=>[row.id,row])),allowed=new Set(),journal=new PreparedPublicationJournal(core);
 const exactKeys=(row,keys)=>row&&exact(row,keys)&&Object.keys(row).length===keys.length;
 for(const row of all.filter(row=>row.id.startsWith(prefix+'publication:'))){
  if(!exactKeys(row,['id','version','publicationId','namespace','datasetId','producer','target','profile','operationRefs','objectRefs','state','nextIndex','error','blueprintDigest'])||row.state!=='confirmed'||row.error!==null||row.nextIndex!==row.objectRefs.length||(await journal.state(row.publicationId))?.state!=='confirmed')denied();
  for(const ref of row.objectRefs)assertProtocolObjectReference(ref);
  for(const ref of row.operationRefs)if(!exactKeys(ref,['operationId','revisionId','bytes']))denied();
  const identityId=core.prefix+'publicationIdentity:'+row.publicationId,identity=map.get(identityId);if(!equal(identity,{id:identityId,namespace,blueprintDigest:row.blueprintDigest}))denied();allowed.add(identityId);allowed.add(row.id);
  const receiptId=prefix+'publicationReceipt:'+encodeURIComponent(row.publicationId),receipt=map.get(receiptId);if(!equal(receipt,{id:receiptId,publicationId:row.publicationId,namespace,state:'confirmed',blueprintDigest:row.blueprintDigest,operationCount:row.operationRefs.length,descriptors:row.objectRefs.filter(ref=>ref.kind==='descriptor')}))denied();allowed.add(receiptId);
  for(let i=0;i<row.objectRefs.length;i++){const id=prefix+'publicationObject:'+encodeURIComponent(row.publicationId)+':'+String(i).padStart(6,'0'),item=map.get(id);if(!exactKeys(item,['id','ref','state','attempts'])||item.state!=='verified'||!Number.isSafeInteger(item.attempts)||item.attempts<1||!equal(item.ref,row.objectRefs[i]))denied();allowed.add(id);}
 }
 return allowed;
}
async function portfolioRows(t){
 const all={};let retained=0;for(const name of t.tx.objectStoreNames){all[name]=await readGroupRows(t,name);for(const row of all[name]){retained+=measureSourceWorkingPhysicalTree(row).B;if(retained>2*1024*1024)denied();}}return all;
}
function verifyPortfolioIndexes(raw,groups,total=groups.length){
 const n=groups.length,metadata=new Map(raw.meta.map(row=>[row.id,row]));
 for(const name of ['recordIndex','blockIndex','documents'])if(raw[name].length!==n||new Set(raw[name].map(r=>r.sequence)).size!==n||raw[name].some(r=>!Number.isSafeInteger(r.sequence)||r.sequence<0||r.sequence>=total))denied();
 for(const name of ['inputStates','revisions']){const key=name==='inputStates'?'deltaSequence':'sequence';if(raw[name].length!==n||new Set(raw[name].map(r=>r[key])).size!==n||raw[name].some(r=>!Number.isSafeInteger(r[key])||r[key]<1||r[key]>total))denied();}
 for(const [id,value]of [['sequence',{records:total,blocks:total,documents:total}],['input-delta-sequence',{value:total}],['revision-sequence',{value:total}]])if(!equal(metadata.get(id),{id,...value}))denied();
 if(raw.sourceCounts.length!==n||raw.filterInputs.length!==n||['invalidations','operationReceipts','librarySearchTerms','migrationBackup'].some(name=>raw[name].length))denied();
 for(const group of groups){const e=initialSourcePlan(group.capability),r=e.source,b=e.input,ri=raw.recordIndex.find(row=>row.id===r.id),bi=raw.blockIndex.find(row=>row.id===b.id),doc=raw.documents.find(row=>row.id===b.documentId),count=sourceCount(b.documentId,r.sourceKey,[r],[b],r.chatId);
  if(!equal(raw.filterInputs.find(row=>row.id===b.id),planInitialFilter(b,raw.inputStates.find(row=>row.id===b.id))))denied();
  if(!ri||!bi||!doc||!equalSourceWorkingPhysicalTree(ri,recordIndex(r,ri.sequence))||!equalSourceWorkingPhysicalTree(bi,blockIndex(b,bi.sequence,[r]))||!equalSourceWorkingPhysicalTree(raw.sourceCounts.find(row=>row.id===count.id),count))denied();
  const expected={id:doc.id,chatKey:chatOf(r),sequence:doc.sequence,displayKey:[-(Date.parse(e.inputDocument.source.lastSourceSentAt)||0),doc.id],value:e.inputDocument.source};for(const view of ['library','archive','excluded'])if(count.views.includes(JSON.stringify([doc.id,view])))expected[view+'Display']=[-(Date.parse(count[view+'Last'][1]===0?count[view+'Last'][2]:null)||0),doc.id];
  if(!equalSourceWorkingPhysicalTree(doc,expected))denied();
 }
}
async function preparePortfolio(store,core,before,plan,inventory){
 const negative=inventory.negative;
 if(plan.groups.length===1&&!negative.length)return null;const scope=await prepareGroupScope(plan),qualified=negative.length?await prepareSourcePurgeRemainingCanonical(store,core,plan,scope,inventory):null;
 return core.transaction(false,async t=>{if(!equal(await authority(store,core,t),before.authority)||!equal(await rows(t,'bns:v1:'),before.rows))denied();let raw;if(!negative.length){raw=await portfolioRows(t);await requireGroupScope(store,t,scope);verifyPortfolioIndexes(raw,plan.groups);}else{raw=qualified.raw;await requireSourcePurgeRemainingScope(store,t,scope,qualified.view,qualified.proof);verifyPortfolioIndexes(qualified.view,plan.groups,plan.groups.length+negative.length);}return raw;});
}
function remainingPortfolio(p){
 if(!p.portfolio)return null;const result=Object.fromEntries(Object.entries(p.portfolio).filter(([name])=>name!=='meta').map(([name,rows])=>[name,new Map(rows.map(row=>[row.id,structuredClone(row)]))]));
 for(const [table,id]of [['records',p.intent.sourceId],['recordIndex',p.intent.sourceId],['blocks',p.intent.inputId],['blockIndex',p.intent.inputId],['times',p.intent.sourceKey],['documents',p.intent.documentId],['libraryDocuments',p.intent.documentId],['sourceCounts',JSON.stringify([p.intent.documentId,p.intent.sourceKey])],['filterInputs',p.intent.inputId]])result[table].delete(id);
 for(const [table,id,row]of p.cleanupPoints.values())if(table!=='meta')result[table].set(id,row);result.tombstones.set(p.tombstone.id,p.tombstone);
 return Object.fromEntries(Object.entries(result).map(([name,map])=>[name,[...map.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)]));
}
export async function prepareOriginalSourcePurge(store,id,key){
 if(store.sourcePurgeJournal===null)return null;
 const journal=store.sourcePurgeJournal,core=binding(store,journal),start=Date.now();
 const before=await core.transaction(false,async t=>({authority:await authority(store,core,t),namespace:await core.bind(t),rows:await rows(t,'bns:v1:')}));
 const generationPrefix=core.prefix+'generation:'+before.namespace+':';
 // Other datasets, retired generations, staged groupItem copies, inboxes and
 // prepared publications are deliberately refused. A selected active vector
 // alone cannot prove that all resident copies were retired.
 const publicationRows=await confirmedPublicationRows(core,before.rows,before.namespace);
 for(const row of before.rows){if(row.id===core.prefix+'active'||row.id.startsWith(core.prefix+'sourcePurgeDeny:')||publicationRows.has(row.id))continue;if(!row.id.startsWith(generationPrefix)||!allowedKinds.has(row.id.slice(generationPrefix.length).split(':')[0]))denied();}
 const revisions=before.rows.filter(row=>row.id.startsWith(generationPrefix+'revision:'));
 if(!revisions.length||revisions.length>128)denied();const inventory=await sourcePurgeNegativeInventory(core,revisions,before.rows,before.namespace,prepareSourcePurgeRemote),{negative,entries}=inventory,allOperations=inventory.active;if(!allOperations.length||allOperations.length%7)denied();
 const plan=await prepareGroupCheckpointPlan(core,allOperations);if(plan.groups.some(group=>group.type!=='sourceBootstrapCommit'))denied();
 // Every group must be its original complete, independent creation. A shared
 // document/chat, reused entity or orphan member cannot authorize deletion.
 const identities=new Map();for(const group of plan.groups){const e=initialSourcePlan(group.capability);for(const [kind,value]of [['source',e.source.id],['sourceKey',e.source.sourceKey],['chat',chatOf(e.source)],['document',e.inputDocument.id],['input',e.input.id],['history',e.baselineRevision.id]]){const k=kind+':'+value;if(identities.has(k))denied();identities.set(k,group.id);}}
 const matches=plan.groups.filter(group=>group.prepared.descriptor.value.sourceId===id&&group.prepared.descriptor.value.sourceKey===key);if(matches.length!==1)denied();const selectedGroup=matches[0],operations=allOperations.filter(op=>selectedGroup.operations.some(member=>member.revisionId===op.revisionId)),verified=selectedGroup.prepared,v=verified.descriptor.value,initial=initialSourcePlan(selectedGroup.capability);if(initial.source.id!==id||initial.source.sourceKey!==key)denied();
 for(const p of negative)for(const [kind,value]of [['source',p.intent.sourceId],['sourceKey',p.intent.sourceKey],['document',p.intent.documentId],['input',p.intent.inputId],['history',p.intent.baselineId]])if(identities.has(kind+':'+value))denied();
 const portfolio=await preparePortfolio(store,core,before,plan,inventory);
 const byId=new Map(before.rows.map(row=>[row.id,row]));
 const exactProtocol=new Map(),set=async(kind,ids,data)=>{const rid=await core.transaction(false,t=>core.idIn(t,kind,...ids),['meta']);exactProtocol.set(rid,{...data,id:rid});},frontiers=new Map();
 for(const entry of entries){const op=entry.operation,purged=op.kind==='purge';await set('revision',[op.revisionId],{operation:op,redacted:entry.redacted});await set('head',[op.type,op.entityId],{type:op.type,entityId:op.entityId,revisions:[op.revisionId],purged,fence:purged?op.revisionId:null});await set('receipt',[op.operationId],{digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence});await set('sequence',[op.deviceId,String(op.sequence).padStart(16,'0')],{operationId:op.operationId,digest:op.revisionId});await set('entityRevision',[op.type,op.entityId,op.revisionId],{revisionId:op.revisionId});const outboxId=await core.transaction(false,t=>core.idIn(t,'outbox',op.operationId),['meta']);if(entry.original&&byId.has(outboxId))denied();if(byId.has(outboxId))exactProtocol.set(outboxId,{id:outboxId,operationId:op.operationId,revisionId:op.revisionId,state:'queued'});frontiers.set(op.deviceId,acceptSequence(frontiers.get(op.deviceId),op.sequence));}
 for(const [deviceId,f]of frontiers)await set('frontier',[deviceId],{...f,deviceId});await set('generation',[],{value:entries.length});const ownOps=entries.map(e=>e.operation).filter(op=>op.deviceId===core.deviceId);if(ownOps.length)await set('device',[core.deviceId],{sequence:Math.max(...ownOps.map(op=>op.sequence))});
 for(const p of negative)exactProtocol.set(p.deny.id,p.deny);
 const marker=before.rows.find(row=>row.id===generationPrefix+'ownerRecoveryEpoch:');if(marker){if(!exact(marker,['id','version','epoch'])||Object.keys(marker).length!==3||marker.version!==1||marker.epoch!==null&&(typeof marker.epoch!=='string'||marker.epoch.length>512))denied();exactProtocol.set(marker.id,marker);}
 for(const row of before.rows)if(!publicationRows.has(row.id)){if(row.id===core.prefix+'active'){if(!exact(row,['id','namespace','manifestId'])||Object.keys(row).length!==3||row.namespace!==before.namespace||!/^([a-f0-9]{64})$/.test(row.manifestId))denied();}else if(!equal(row,exactProtocol.get(row.id)))denied();}
 for(const [rid,row]of exactProtocol)if(!equal(byId.get(rid),row))denied();

 const changes=operations.map(op=>({type:op.type,entityId:op.entityId,kind:'purge',expectedParents:[op.revisionId]})),operationIds=Array.from({length:8},()=>crypto.randomUUID()),first=await core.prepare(changes,{operationIds:operationIds.slice(0,7)});
 const intent={id:key,version:1,datasetId:core.datasetId,sourceId:id,sourceKey:key,documentId:v.documentId,inputId:v.inputId,baselineId:v.baselineId,at:store.clock(),targets:operations.map((op,i)=>({before:{...op,value:null},purgeRevisionId:first.operations[i].revisionId,purgeOperationId:first.operations[i].operationId,purgeSequence:first.operations[i].sequence}))};validateSourcePurgeIntent(intent);
 const prepared=await core.prepare([...changes,{type:'sourcePurgeIntent',entityId:key,expectedParents:[],value:intent}],{operationIds});
 if(!equal(prepared.operations.slice(0,7),first.operations)||Date.now()-start>30000||bytes({before,operations,prepared}).length+(portfolio?measureSourceWorkingPhysicalTree(portfolio).B:0)>2*1024*1024)denied();
 const remote=incoming.get(journal);let selectedPrepared=prepared,selectedIntent=intent,origin='local';
 if(remote){if(remote.intent.sourceId!==id||remote.intent.sourceKey!==key||!equal(remote.intent.targets.map(x=>x.before),operations.map(op=>({...op,value:null}))))denied();selectedPrepared={...prepared,operations:remote.operations};selectedIntent=remote.intent;origin='remote';}
 const cap=Object.freeze({});plans.set(cap,{store,journal,core,start,before,portfolio,operations,prepared:selectedPrepared,intent:selectedIntent,origin,transaction:null,expected:null});return cap;
}
function selected(store,cap){const p=plans.get(cap);if(!p||p.store!==store||binding(store,p.journal)!==p.core||Date.now()-p.start>30000)denied();return p;}
async function expectedProtocol(t,p){
 const {core,prepared,before}=p,result=new Map(before.rows.map(row=>[row.id,clone(row)]));
 const put=async(kind,ids,value)=>{const id=await core.idIn(t,kind,...ids);result.set(id,{...value,id});};
 const get=async(kind,...ids)=>result.get(await core.idIn(t,kind,...ids));
 if(p.cold)for(const op of p.operations){await put('revision',[op.revisionId],{operation:op,redacted:true});await put('entityRevision',[op.type,op.entityId,op.revisionId],{revisionId:op.revisionId});await put('receipt',[op.operationId],{digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence});await put('sequence',[op.deviceId,String(op.sequence).padStart(16,'0')],{operationId:op.operationId,digest:op.revisionId});const old=await get('frontier',op.deviceId);await put('frontier',[op.deviceId],{...acceptSequence(old?{frontier:old.frontier,ranges:old.ranges}:null,op.sequence),deviceId:op.deviceId});if(op.deviceId===core.deviceId)await put('device',[core.deviceId],{sequence:Math.max((await get('device',core.deviceId))?.sequence||0,op.sequence)});}
 for(const op of prepared.operations){
  const purged=op.kind==='purge';
  if(purged){const old=p.operations.find(x=>x.type===op.type&&x.entityId===op.entityId);await put('revision',[old.revisionId],{operation:{...old,value:null},redacted:true});result.delete(await core.idIn(t,'outbox',old.operationId));}
  await put('revision',[op.revisionId],{operation:op,redacted:purged});await put('head',[op.type,op.entityId],{type:op.type,entityId:op.entityId,revisions:[op.revisionId],purged,fence:purged?op.revisionId:null});await put('entityRevision',[op.type,op.entityId,op.revisionId],{revisionId:op.revisionId});
  await put('receipt',[op.operationId],{digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence});await put('sequence',[op.deviceId,String(op.sequence).padStart(16,'0')],{operationId:op.operationId,digest:op.revisionId});const frontier=await get('frontier',op.deviceId);await put('frontier',[op.deviceId],{...acceptSequence(frontier?{frontier:frontier.frontier,ranges:frontier.ranges}:null,op.sequence),deviceId:op.deviceId});
  if(p.origin==='local')await put('outbox',[op.operationId],{operationId:op.operationId,revisionId:op.revisionId,state:'queued'});if(op.deviceId===core.deviceId)await put('device',[core.deviceId],{sequence:Math.max((await get('device',core.deviceId))?.sequence||0,op.sequence)});
 }
 await put('generation',[],{value:prepared.baseGeneration+8});
 result.set(core.prefix+'sourcePurgeDeny:'+p.intent.sourceKey,{id:core.prefix+'sourcePurgeDeny:'+p.intent.sourceKey,version:1,intent:prepared.operations[7].revisionId,sourceKey:p.intent.sourceKey,sourceId:p.intent.sourceId});return result;
}
export async function beginOriginalSourcePurge(t,store,cap){
 if(cap===null)return;const p=selected(store,cap),current=await authority(store,p.core,t);if(!equal(current,p.before.authority)||await p.core.bind(t)!==p.before.namespace||!equal(await rows(t,'bns:v1:'),p.before.rows))denied();
 if(p.portfolio&&!equalSourceWorkingPhysicalTree(await portfolioRows(t),p.portfolio))denied();
 p.expected=await expectedProtocol(t,p);p.transaction=t;p.cleanupPoints=new Map();p.cleanupJobs=0;p.cleanupEvents=0;p.cleanupStates=0;
 if(!p.cold){const epoch=await t.get('meta','thought-epoch');if(epoch&&!equal(epoch,{id:'thought-epoch',value:epoch.value})||epoch&&!Number.isSafeInteger(epoch.value))denied();p.cleanupSequence=epoch?.value||0;maintenance.set(t,cap);}
 const deny=p.expected.get(p.core.prefix+'sourcePurgeDeny:'+p.intent.sourceKey);await t.put('meta',deny);
 if(p.cold)for(const op of p.operations){await p.core.put(t,'revision',[op.revisionId],{operation:op,redacted:true});await p.core.put(t,'entityRevision',[op.type,op.entityId,op.revisionId],{revisionId:op.revisionId});await p.core.recordReceipt(t,op);}
 try{for(const operation of p.prepared.operations){applications.set(t,{core:p.core,operation,origin:p.origin});const result=await p.core.applyInTransaction(t,operation,{origin:p.origin,materialize:false});if(result.state!==(operation.kind==='purge'?'purged':'applied'))denied();if(p.origin==='local')await p.core.put(t,'outbox',[operation.operationId],{operationId:operation.operationId,revisionId:operation.revisionId,state:'queued'});}}finally{applications.delete(t);}
}
// Original maintenance owner invokes this immediately before its actual put.
// It records no data and grants no writer capability outside this exact TX.
export function observeOriginalSourcePurgeRow(store,t,table,row){
 const cap=maintenance.get(t);if(!cap)return;const p=selected(store,cap);if(p.transaction!==t)denied();
 if(table==='organizerJobs'){if(row.kind!=='purge_cleanup'||!equal(row.sourceRecordIds,[p.intent.sourceId])||++p.cleanupJobs!==1)denied();}
 else if(table==='invalidations'){if(row.reason!=='source_purged'||row.inputId!==p.intent.inputId||++p.cleanupEvents!==1)denied();}
 else if(table!=='inputStates'||row.id!==p.intent.inputId||row.sourcePurged!==true||++p.cleanupStates!==1)denied();
 if(table!=='inputStates'){if(row.sequence!==++p.cleanupSequence)denied();p.cleanupPoints.set('meta:thought-epoch',['meta','thought-epoch',{id:'thought-epoch',value:p.cleanupSequence}]);}
 p.cleanupPoints.set(table+':'+row.id,[table,row.id,clone(row)]);
}
export function closeOriginalSourcePurge(t,cap){if(maintenance.get(t)===cap)maintenance.delete(t);}
export function observeOriginalSourcePurgeTombstone(t,store,cap,row){
 if(cap===null)return;const p=selected(store,cap);if(p.transaction!==t||row.id!=='source:'+p.intent.sourceKey||row.value?.sourceIdentityHash!==p.intent.sourceKey||row.value.status!=='permanently_ignored')denied();p.tombstone=clone(row);
}
export async function finishOriginalSourcePurge(t,store,cap){
 if(cap===null)return;const p=selected(store,cap);if(p.transaction!==t||!p.expected)denied();
 const actual=await rows(t,'bns:v1:'),expected=[...p.expected.values()].sort((a,b)=>a.id.localeCompare(b.id)),ordered=actual.slice().sort((a,b)=>a.id.localeCompare(b.id));if(!equal(ordered,expected))denied();
 const tombstone=await t.get('tombstones','source:'+p.intent.sourceKey);if(!p.tombstone||!equal(tombstone,p.tombstone))denied();
 if(!p.cold&&(p.cleanupJobs!==1||p.cleanupEvents!==1||!p.cleanupPoints.has('inputStates:'+p.intent.inputId)))denied();
 const points=[...p.cleanupPoints.values(),['tombstones',tombstone.id,tombstone],['records',p.intent.sourceId,null],['recordIndex',p.intent.sourceId,null],['blocks',p.intent.inputId,null],['blockIndex',p.intent.inputId,null],['times',p.intent.sourceKey,null],...expected.map(row=>['meta',row.id,row]),...p.before.authority.roots.map(([id,row])=>['meta',id,row])];
 for(const [table,key,row]of points)if(!equal((await t.get(table,key))??null,row))denied();
 const retained=remainingPortfolio(p),counts=[],metaRanges=[];let completeMeta=null;if(retained){const metadata=await planSourcePurgeMetadata(p,retained),raw=await portfolioRows(t);if(!equalSourceWorkingPhysicalTree(raw.meta,metadata.callback))denied();completeMeta=metadata.terminal;for(const [table,expectedRows]of Object.entries(retained)){if(!equalSourceWorkingPhysicalTree(raw[table],expectedRows))denied();counts.push([table,expectedRows.length]);for(const row of expectedRows)points.push([table,row.id,row]);}
  for(const id of ['sequence','input-delta-sequence','revision-sequence','thought-suppression-key','gate'])points.push(['meta',id,p.portfolio.meta.find(row=>row.id===id)??null]);
  for(const doc of retained.documents){const prefix=archiveYearPrefix(doc.id),rows=p.portfolio.meta.filter(row=>row.id.startsWith(prefix)),marker=archiveYearMeta(doc.id);metaRanges.push([prefixRange(prefix),rows.length]);for(const row of rows)points.push(['meta',row.id,row]);points.push(['meta',marker,p.portfolio.meta.find(row=>row.id===marker)??null]);}
 }
 if(completeMeta){for(let i=points.length-1;i>=0;i--)if(points[i][0]==='meta')points.splice(i,1);for(const row of completeMeta)points.push(['meta',row.id,row]);counts.push(['meta',completeMeta.length]);}
 const current=()=>{selected(store,cap);assertOriginalControlSettingsFacts(store,p.before.authority.control);return true;};registerRepositoryFinalReadFence(store.repository,t,{isCurrent:current,plan:function*(){for(const [key,value]of metaRanges)if((yield {method:'count',table:'meta',key})!==value)denied();for(const [table,value]of counts)if((yield {method:'count',table})!==value)denied();for(const [table,key,row]of points)if(!equalSourceWorkingPhysicalTree((yield {method:'get',table,key})??null,row))denied();if((yield {method:'count',table:'meta',key:prefixRange('bns:v1:')})!==expected.length)denied();if((yield {method:'count',table:'meta',key:prefixRange(residentCheckpointPrefix)})!==0)denied();return true;}});
}

export async function prepareSourcePurgeRemote(input,core){
 if(!Array.isArray(input)||input.length!==8||bytes(input).length>2*1024*1024)denied();const copy=clone(input),operations=[];for(const row of copy)operations.push(await validateOperation(row));
 const descriptor=operations.filter(op=>op.type==='sourcePurgeIntent');if(descriptor.length!==1)denied();const d=descriptor[0],intent=validateSourcePurgeIntent(d.value);if(d.datasetId!==core.datasetId||intent.datasetId!==core.datasetId||d.entityId!==intent.sourceKey)denied();
 const ordered=[];for(const target of intent.targets){const hits=operations.filter(op=>op.type===target.before.type&&op.entityId===target.before.entityId&&op.revisionId===target.purgeRevisionId&&op.operationId===target.purgeOperationId&&op.sequence===target.purgeSequence);if(hits.length!==1)denied();const op=hits[0];if(op.datasetId!==core.datasetId||op.deviceId!==d.deviceId||op.kind!=='purge'||op.actor!=='user'||!equal(op.parents,[target.before.revisionId]))denied();ordered.push(op);}
 if(new Set(ordered.map(op=>op.operationId)).size!==7||new Set(ordered.map(op=>op.revisionId)).size!==7||ordered.some((op,i)=>op.sequence!==d.sequence-7+i)||new Set(intent.targets.map(x=>x.before.sequence)).size!==7)denied();
 return {intent,operations:[...ordered,d]};
}
// Explicit local receiver only. Provider possession is the v1 trust boundary;
// this bodyfree envelope conveys denial, never Source/body creation authority.
export class SourcePurgeReceiver{
 constructor(store,core){if(store.repository!==core.repository)denied();this.store=store;this.core=core;}
 async receive(input){
  const {store,core}=this;await store.finishFoundation();const remote=await prepareSourcePurgeRemote(input,core),journal=store.sourcePurgeJournal;if(binding(store,journal)!==core)denied();
  const state=await store.run(()=>core.transaction(false,async t=>({source:await t.get('records',remote.intent.sourceId),deny:await t.get('meta',core.prefix+'sourcePurgeDeny:'+remote.intent.sourceKey)})));
  if(state.deny){return store.run(()=>core.transaction(false,async t=>{await requireNoResidentCheckpoint(t);const deny=await t.get('meta',core.prefix+'sourcePurgeDeny:'+remote.intent.sourceKey),tomb=await t.get('tombstones','source:'+remote.intent.sourceKey);if(!equal(deny,state.deny)||deny.intent!==remote.operations[7].revisionId||tomb?.value?.status!=='permanently_ignored'||await t.get('records',remote.intent.sourceId))denied();for(const op of remote.operations){const receipt=await core.get(t,'receipt',op.operationId);if(!equal(receipt,{id:receipt?.id,digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence}))denied();}return {state:'duplicate'};}));}
  if(state.source){if(incoming.has(journal))denied();incoming.set(journal,remote);try{await store.purge(remote.intent.sourceId,true);return {state:'purged'};}finally{incoming.delete(journal);}}
  return store.run(async()=>{
   const start=Date.now(),before=await core.transaction(false,async t=>({authority:await authority(store,core,t),namespace:await core.bind(t),rows:await rows(t,'bns:v1:')}));if(before.rows.length)denied();
   const prepared={operations:remote.operations,baseGeneration:0,baseSequence:0},cap=Object.freeze({}),p={store,journal,core,start,before,operations:remote.intent.targets.map(x=>x.before),prepared,intent:remote.intent,origin:'remote',cold:true,transaction:null,expected:null};plans.set(cap,p);
   const result=await core.transaction(true,async t=>{registerRepositoryWorkLimit(store.repository,t,{});for(const name of ['records','blocks','thoughts','revisions','documents','tombstones'])if(await t.count(name))denied();await beginOriginalSourcePurge(t,store,cap);const tombstone={id:'source:'+remote.intent.sourceKey,sequence:Date.parse(remote.intent.at),value:{sourceIdentityHash:remote.intent.sourceKey,deletedAt:remote.intent.at,status:'permanently_ignored'}};observeOriginalSourcePurgeTombstone(t,store,cap,tombstone);await t.put('tombstones',tombstone);await finishOriginalSourcePurge(t,store,cap);registerRepositoryFinalReadFence(store.repository,t,{isCurrent:()=>{selected(store,cap);return true;},plan:function*(){for(const table of ['records','blocks','thoughts','revisions','documents'])if((yield {method:'count',table})!==0)denied();return true;}});return {state:'purged'};});await store.publish();return result;
  });
 }
}

export async function requireNoSourcePurgeDeny(core,t){
 const repository=core.repository,prefix=core.prefix+'sourcePurgeDeny:',identity=requireRepositoryTransactionScope(repository,t);
 requireRepositoryTransactionDataMethods(repository,t);
 const current=()=>{if(core.repository!==repository||core.prefix+'sourcePurgeDeny:'!==prefix)fail('BNS_SOURCE_PURGE_RECONCILIATION_REQUIRED');return true;};
 if(identity.mode==='readwrite')registerRepositoryWorkLimit(repository,t);
 if((await t.primaryRangePage('meta',{prefix,limit:1})).rows.length)fail('BNS_SOURCE_PURGE_RECONCILIATION_REQUIRED');current();
 if(identity.mode==='readwrite')registerRepositoryFinalReadFence(repository,t,{isCurrent:current,plan:function*(){
  if((yield {method:'count',table:'meta',key:prefixRange(prefix)})!==0)fail('BNS_SOURCE_PURGE_RECONCILIATION_REQUIRED');return true;
 }});
}
