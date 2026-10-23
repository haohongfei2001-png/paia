import {FilterIntentSyncJournal,prepareRestoredFilterSources} from './filter-intent-journal.js';
import {InputWorkingCommitReceiver,prepareWorkingApplication} from './input-working-commit.js';
import {prepareSourcePurgeWorkingCut} from './source-purge-group-working.js';
import {prepareSourcePurgeActiveCut,requireSourcePurgeActiveGraph} from './source-purge-group-active.js';
import {readOriginalControlSettings,assertOriginalControlSettingsFacts} from '../indexed-store.js';
import {compileSourcePurgeClosure} from './source-purge-closure.js';
import {prepareSourcePurgeRemote,prepareColdSourcePurgeApplication,applyColdSourcePurgeApplication,verifySourcePurgePortfolioIndexes} from './source-purge-journal.js';
import {sourcePurgeNegativeInventory,prepareGroupedSourcePurgeRemainingCanonical} from './source-purge-negative.js';
import {prepareGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {prepareGroupScope,requireGroupScope,requireSourcePurgeRemainingScope} from './group-checkpoint-scope.js';
import {prepareBootstrapApplication,applyBootstrapApplication} from './source-bootstrap-receive.js';
import {sourcePurgeGroupSnapshot,planSourcePurgeGroupPhysical,requireSourcePurgeGroupRows,sealSourcePurgeGroupRows} from './source-purge-group-physical.js';
import {encodeOriginalCheckpoint,checkpointItems} from './checkpoints.js';
import {protocolObject,readObject,SEGMENT_PROFILE,assertProtocolObjectReference} from './segments.js';
import {assertGroupedCheckpointManifest} from './group-checkpoint-manifest.js';
import {protocolPhysicalId} from './physical-key.js';
import {acceptSequence} from './core.js';
import {JournalRestoreFence} from './prompt-journal.js';
import {registerRepositoryWorkLimit} from '../idb-repository.js';
import {readControlPublicationFence} from '../local-control-publication.js';
import {CONSENT_VERSION} from '../constants.js';
import {measureSourceWorkingPhysicalTree,equalSourceWorkingPhysicalTree} from './source-working-physical.js';
import {bytes,clone,decodeJSON,digest,equal,fail} from './value.js';
const deny=()=>fail('BNS_SOURCE_PURGE_GROUP_UNSUPPORTED'),changed=()=>fail('BNS_SOURCE_PURGE_GROUP_CHANGED'),strip=({id,...v})=>v;
const configs=new WeakMap(),staged=new WeakMap(),serials=new WeakMap();
function budget(isCurrent=()=>true){
 let refs=0,size=0,active=true,timer;const at=performance.now(),current=()=>{if(!active||!isCurrent()||performance.now()-at>=30000)fail('BNS_GROUP_RESOURCE_LIMIT');};
 const charge=ref=>{current();assertProtocolObjectReference(ref);if(++refs>4096||(size+=ref.encodedBytes+ref.decodedBytes)>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');};
 return {current,retain(value){current();if((size+=measureSourceWorkingPhysicalTree(value).B)>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');},
  get:get=>async ref=>{const selected=clone(ref);charge(selected);const raw=await get(selected);current();return raw;},
  put:put=>async(ref,raw)=>{const selected=clone(ref);charge(selected);await put(selected,raw.slice());current();},
  async run(fn){try{return await Promise.race([fn(),new Promise((_,reject)=>{timer=setTimeout(()=>{active=false;reject(Object.assign(Error('BNS_GROUP_RESOURCE_LIMIT'),{code:'BNS_GROUP_RESOURCE_LIMIT'}));},30000);})]);}finally{active=false;clearTimeout(timer);}}
 };
}
async function authority(store,core,t){
 const control=await store.control(t),publication=await readControlPublicationFence(t),library=await t.get('meta','thought-library');
 if(!control.settings.enabled||control.settings.consentVersion!==CONSENT_VERSION||publication.reservation||publication.migration?.phase!=='active'||publication.migration.databaseId!==store.databaseId||library?.sealed||library?.phase!=='active'||library?.verified!==true)deny();
 return {control,publication,controlFacts:readOriginalControlSettings(store,t),fence:await new JournalRestoreFence(core).snapshot(t),namespace:await core.bind(t)};
}
function wire(revisions){
 const parents=new Set(revisions.flatMap(r=>r.operation.parents)),heads=new Map(),frontiers=new Map(),purged=new Set(revisions.filter(r=>r.operation.kind==='purge').map(r=>JSON.stringify([r.operation.type,r.operation.entityId])));
 for(const row of revisions){const op=row.operation,key=JSON.stringify([op.type,op.entityId]);frontiers.set(op.deviceId,acceptSequence(frontiers.get(op.deviceId),op.sequence));if(row.redacted&&op.kind!=='purge'||parents.has(op.revisionId))continue;if(purged.has(key)&&op.kind!=='purge')continue;heads.set(key,{kind:'head',type:op.type,entityId:op.entityId,revisions:[op.revisionId],purged:op.kind==='purge',fence:op.kind==='purge'?op.revisionId:null});}
 return [...revisions.map(row=>({kind:'revision',operation:row.operation,redacted:row.redacted})),...[...heads.values()],...[...frontiers].map(([deviceId,state])=>({kind:'frontier',deviceId,...state}))];
}
function itemsFrom(raw,core,namespace){const prefix=core.prefix+'generation:'+namespace+':';return ['revision','head','frontier'].flatMap(kind=>raw.meta.filter(r=>r.id.startsWith(prefix+kind+':')).map(row=>({kind,...strip(row)})));}
function protocolRows(core,namespace,items,before,generation,epoch,newPositive=false,controls=[]){
 const result=new Map(),key=(kind,...parts)=>protocolPhysicalId(core.prefix,namespace,kind,parts),put=(kind,parts,data)=>{const id=key(kind,...parts);result.set(id,{id,...data});};
 for(const row of controls)result.set(row.id,clone(row));
 const revisions=items.filter(x=>x.kind==='revision');
 for(const row of revisions){const o=row.operation;put('revision',[o.revisionId],{operation:o,redacted:row.redacted});put('receipt',[o.operationId],{digest:o.revisionId,deviceId:o.deviceId,sequence:o.sequence});put('sequence',[o.deviceId,String(o.sequence).padStart(16,'0')],{operationId:o.operationId,digest:o.revisionId});put('entityRevision',[o.type,o.entityId,o.revisionId],{revisionId:o.revisionId});}
 for(const item of items)if(item.kind==='head')put('head',[item.type,item.entityId],strip({id:null,...item}));else if(item.kind==='frontier')put('frontier',[item.deviceId],strip({id:null,...item}));
 // The discriminator belongs to the transport only, never physical metadata.
 for(const row of result.values())delete row.kind;
 const own=revisions.map(r=>r.operation).filter(o=>o.deviceId===core.deviceId);if(own.length)put('device',[core.deviceId],{sequence:Math.max(...own.map(o=>o.sequence))});if(revisions.length)put('generation',[],{value:generation});
 for(const row of before.meta.filter(r=>r.id.startsWith(key('outbox')))){const op=revisions.find(r=>r.operation.operationId===row.operationId);if(!op||op.redacted&&op.operation.kind!=='purge'||!equal(row,{id:key('outbox',row.operationId),operationId:row.operationId,revisionId:op.operation.revisionId,state:'queued'}))deny();result.set(row.id,clone(row));}
 const marker=before.meta.find(r=>r.id===key('ownerRecoveryEpoch'));if(marker){if(!equal(marker,{id:marker.id,version:1,epoch}))deny();result.set(marker.id,clone(marker));}else if(newPositive)put('ownerRecoveryEpoch',[],{version:1,epoch});
 for(const row of revisions.filter(r=>r.operation.type==='sourcePurgeIntent')){const v=row.operation.value,id=core.prefix+'sourcePurgeDeny:'+v.sourceKey;result.set(id,{id,version:1,intent:row.operation.revisionId,sourceKey:v.sourceKey,sourceId:v.sourceId});}
 return [...result.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
}
async function qualify(store,core,raw,base){
 const active=await prepareSourcePurgeActiveCut(store,core,raw);
 const items=itemsFrom(raw,core,base.namespace),revisions=items.filter(r=>r.kind==='revision'),negative=revisions.some(r=>r.operation.type==='sourcePurgeIntent');
 const closure=negative?await compileSourcePurgeClosure(core,items):null,plan=closure?.positivePlan??await prepareGroupCheckpointPlan(core,revisions.map(r=>r.operation));if(plan.groups.some(g=>!['sourceBootstrapCommit','inputWorkingCommit'].includes(g.type))||revisions.some(r=>r.redacted)&&!negative)deny();
 await requireSourcePurgeActiveGraph(active,plan,closure?.negative??[]);
 const generation=raw.meta.find(r=>r.id===protocolPhysicalId(core.prefix,base.namespace,'generation',[]))?.value||0;
 const coldCount=(closure?.negative??[]).filter(n=>!raw.inputStates.some(row=>row.id===n.intent.inputId)).length;if(!Number.isSafeInteger(generation)||generation!==revisions.length-coldCount*7)deny();
 const working=await prepareSourcePurgeWorkingCut(store,core,raw,plan,base.namespace,closure?.negative??[]);
 const expected=protocolRows(core,base.namespace,items,raw,generation,base.fence.epoch,false,[...active.protocol,...working.protocol]),actual=raw.meta.filter(r=>r.id.startsWith('bns:'));if(!equalSourceWorkingPhysicalTree(actual,expected))deny();
 const scope=await prepareGroupScope(plan);
 if(negative||working.working.length){const inventory=await sourcePurgeNegativeInventory(core,revisions.map(r=>({id:protocolPhysicalId(core.prefix,base.namespace,'revision',[r.operation.revisionId]),operation:r.operation,redacted:r.redacted})),raw.meta,base.namespace,prepareSourcePurgeRemote,true),qualified=await prepareGroupedSourcePurgeRemainingCanonical(store,core,plan,scope,inventory);
  await core.transaction(false,t=>requireSourcePurgeRemainingScope(store,t,qualified.scope,qualified.view,qualified.proof));verifySourcePurgePortfolioIndexes(qualified.view,qualified.plan.groups,qualified.plan.groups.length+qualified.localCount);
 }else{await core.transaction(false,t=>requireGroupScope(store,t,scope));if(plan.groups.length)verifySourcePurgePortfolioIndexes(raw,plan.groups);}
 return {items,closure,plan,generation,active,working};
}
async function scopeFor(closure){const scope=await prepareGroupScope(closure.positivePlan),negative=closure.negative.map(n=>({intent:n.intent,operations:n.operations}));return {...scope.ownerScope,families:[...scope.ownerScope.families,{type:'sourcePurgeIntent',count:negative.length,digest:await digest(bytes(negative))}].sort((a,b)=>a.type.localeCompare(b.type))};}
async function capture(store,core){return store.run(()=>core.transaction(false,async t=>({base:await authority(store,core,t),raw:await sourcePurgeGroupSnapshot(core,t)})));}
export async function buildSourcePurgeGroupedCheckpoint(core,transport,{store,profile=SEGMENT_PROFILE,parents=[]}={}){
 if(store?.repository!==core.repository||profile!==SEGMENT_PROFILE)deny();const work=budget();return work.run(async()=>{await store.finishFoundation();const before=await capture(store,core);work.retain(before);const q=await qualify(store,core,before.raw,before.base);if(!q.closure||!q.plan.groups.length)deny();
 const ownerScope=await scopeFor(q.closure),verify=async()=>{work.current();const now=await capture(store,core);if(!equalSourceWorkingPhysicalTree(now,before))changed();};
 const bounded={get:work.get(ref=>transport.get(ref)),putImmutable:work.put((ref,data)=>transport.putImmutable(ref,data))};
 await verify();const encoded=await encodeOriginalCheckpoint(core.datasetId,bounded,{profile,parents,cut:before.base,rows:async function*(kind){for(const item of q.items)if(item.kind===kind){const {kind:_,...row}=item;yield {id:'detached',...row};}},verifyCut:verify});
 const manifest={...encoded.manifest,ownerScope},object=await protocolObject('checkpoint-manifest',bytes(manifest),{profile});await verify();await bounded.putImmutable(object.ref,object.bytes);await readObject(object.ref,bounded.get,{profile});await verify();return {ref:object.ref,manifest,cut:before.base};});
}
export class SourcePurgeGroupedCheckpointRestore{
 constructor(core,{store,restoreId,profile=SEGMENT_PROFILE}){if(store?.repository!==core.repository||profile!==SEGMENT_PROFILE)deny();this.core=core;this.store=store;this.restoreId=restoreId;configs.set(this,{core,store,restoreId,profile,repository:core.repository,datasetId:core.datasetId,deviceId:core.deviceId,prefix:core.prefix,namespace:core.fixedNamespace,database:core.repository.db});}
 current(){const c=configs.get(this);if(!c||this.core!==c.core||this.store!==c.store||this.restoreId!==c.restoreId||c.store.repository!==c.repository||c.core.repository!==c.repository||c.repository.db!==c.database||c.core.datasetId!==c.datasetId||c.core.deviceId!==c.deviceId||c.core.prefix!==c.prefix||c.core.fixedNamespace!==c.namespace)changed();return c;}
 async stageCheckpoint(ref,get){staged.delete(this);const serial=(serials.get(this)||0)+1;serials.set(this,serial);const c=this.current(),work=budget(()=>serials.get(this)===serial);return work.run(async()=>{await c.store.finishFoundation();if(c.database===null)c.database=c.repository.db;const before=await capture(c.store,c.core);work.retain(before);const local=await qualify(c.store,c.core,before.raw,before.base),read=work.get(get),selected=clone(ref),manifest=decodeJSON(await readObject(selected,read,{profile:c.profile}));assertGroupedCheckpointManifest(manifest,{core:c.core});if(manifest.itemCount>384)deny();const items=[];for await(const item of checkpointItems(manifest,read,{profile:c.profile})){work.retain(item);items.push(item);}const closure=await compileSourcePurgeClosure(c.core,items);if(!closure.positivePlan.groups.length||!equal(closure.coverage,manifest.coverage)||!equal(await scopeFor(closure),manifest.ownerScope))deny();
  const revisions=new Map(local.items.filter(r=>r.kind==='revision').map(r=>[r.operation.revisionId,r]));for(const r of items.filter(r=>r.kind==='revision')){const old=revisions.get(r.operation.revisionId);if(old&&!equal(old,r))deny();revisions.set(r.operation.revisionId,r);}const mergedItems=wire([...revisions.values()]),merged=await compileSourcePurgeClosure(c.core,mergedItems),known=new Set(local.items.filter(r=>r.kind==='revision').map(r=>r.operation.revisionId)),positive=merged.positivePlan.groups.filter(g=>g.operations.some(o=>!known.has(o.revisionId))),negative=merged.negative.filter(n=>!known.has(n.operations[7].revisionId));if(positive.some(g=>g.operations.some(o=>known.has(o.revisionId))))deny();
  await requireSourcePurgeActiveGraph(local.active,merged.positivePlan,merged.negative);
  const filter=new FilterIntentSyncJournal(c.core),working=new InputWorkingCommitReceiver(c.store,c.core,{filterJournal:filter}),mergedScope=await prepareGroupScope(merged.positivePlan),sources=await prepareRestoredFilterSources(mergedScope.expected.records),apps=[];work.retain({positive,negative,mergedScope});for(const group of positive)apps.push([group,group.type==='sourceBootstrapCommit'?await prepareBootstrapApplication(c.store,c.core,group.operations):await prepareWorkingApplication(working,group.operations)]);const negApps=[];for(const n of negative)negApps.push(await prepareColdSourcePurgeApplication(c.store,c.core,n.operations));
  const protocol=protocolRows(c.core,before.base.namespace,mergedItems,before.raw,local.generation+positive.reduce((n,g)=>n+g.operations.length,0)+negative.length*8,before.base.fence.epoch,positive.length>0,[...local.active.protocol,...local.working.protocol]),physical=positive.some(g=>g.type==='inputWorkingCommit')?null:await planSourcePurgeGroupPhysical(c.store,c.core,before.raw,positive,negative,protocol,local.active);work.retain({protocol,physical});this.current();work.current();const now=await capture(c.store,c.core);if(!equalSourceWorkingPhysicalTree(now,before))changed();staged.set(this,{before,apps,negApps,physical,working,sources,positive,negative,protocol,active:local.active,manifestId:selected.id,phase:'validated'});return {phase:'validated',manifestId:selected.id};});
 }
 async activate(){const c=this.current(),p=staged.get(this);if(!p)fail('BNS_RESTORE_NOT_READY');const work=budget(()=>staged.get(this)===p);if(p.phase==='activated'){const now=await capture(c.store,c.core);if(!equalSourceWorkingPhysicalTree(now.raw,p.physical.terminal))changed();return {state:'activated'};}
  return work.run(()=>c.store.run(async()=>{let physical=p.physical;const result=await c.core.transaction(true,async t=>{registerRepositoryWorkLimit(c.repository,t);this.current();const activeAuthority=await authority(c.store,c.core,t);if(!equalSourceWorkingPhysicalTree(activeAuthority,p.before.base))changed();await requireSourcePurgeGroupRows(c.core,t,p.before.raw);for(const app of p.negApps)await applyColdSourcePurgeApplication(t,app);for(const [group,app] of p.apps){if(group.type==='sourceBootstrapCommit')await applyBootstrapApplication(t,app);else await p.working.applyRestored(t,app,p.sources);}if(!physical)physical=await planSourcePurgeGroupPhysical(c.store,c.core,p.before.raw,p.positive,p.negative,p.protocol,p.active,await sourcePurgeGroupSnapshot(c.core,t));await requireSourcePurgeGroupRows(c.core,t,physical.callback);sealSourcePurgeGroupRows(c.store,c.core,t,p.before.raw,physical.terminal,()=>{this.current();work.current();assertOriginalControlSettingsFacts(c.store,activeAuthority.controlFacts);});return {state:'activated'};});p.physical=physical;p.phase='activated';return result;}));
 }
}
