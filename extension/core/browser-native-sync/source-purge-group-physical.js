import {materializePrompt,preparePromptBindingReplay} from './prompt-journal.js';
import {requireResolvedPromptReplayConflict} from './resolved-prompt-replay.js';
import {projectSourcePurgeConsumerRows} from './consumer-preference-restore.js';
import {CONSUMER_PUBLICATION_PENDING_ID} from './consumer-publication-state.js';
import {reserveControlPublication,readControlPublicationFence,CONTROL_PUBLICATION_RESERVATION} from '../local-control-publication.js';
import {originalFilterConstructor} from '../smart-filter-store-owner.js';
import {enqueueInvalidation} from '../thought-maintenance.js';
import {equal,exact,opaque} from './value.js';
import {sourcePurgeActiveTerminal} from './source-purge-group-active.js';
import {IndexedArchiveStore} from '../indexed-store.js';
import {originalIAConstructor} from '../ia-store-owner.js';
import {planInitialFilter} from '../smart-filter-store-owner.js';
import {syncArchiveYearIndex} from '../archive-year-index.js';
import {trackNavigationWrite,flushNavigationWrites} from '../archive-navigation-invalidation.js';
import {trackSemanticWrite,flushSemanticWrites} from '../ai-usage/delta.js';
import {readGroupRows} from './group-page-reader.js';
import {measureSourceWorkingPhysicalTree,equalSourceWorkingPhysicalTree} from './source-working-physical.js';
import {registerRepositoryFinalReadFence} from '../idb-repository.js';
import {fail} from './value.js';
const deny=()=>fail('BNS_SOURCE_PURGE_GROUP_CHANGED'),copy=x=>x===undefined?undefined:structuredClone(x),sort=rows=>rows.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
const snapshots=new WeakMap();
export async function sourcePurgeGroupSnapshot(core,t){
 const rows={},schema={};let refs=0,size=0;
 for(const name of core.repository.stores){rows[name]=await readGroupRows(t,name);refs+=rows[name].length;for(const row of rows[name])size+=measureSourceWorkingPhysicalTree(row).B;if(refs>4096||size>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');const table=t.tx.objectStore(name);schema[name]=Object.fromEntries([...table.indexNames].map(key=>{const i=table.index(key);return [key,{path:copy(i.keyPath),multi:i.multiEntry}];}));}
 snapshots.set(rows,{core,repository:core.repository,database:core.repository.db,schema});return rows;
}
// Detached prediction only: original domain/index/semantic writers operate on
// private Maps. No native transaction, store mutation, or alternate data truth.
export async function planSourcePurgeGroupPhysical(store,core,before,groups,negative,protocol,active,observed=null,portable=null){
 const bound=snapshots.get(before);if(!bound||bound.core!==core||bound.repository!==store.repository||bound.database!==store.repository.db)deny();
 if(measureSourceWorkingPhysicalTree(before).B*4+measureSourceWorkingPhysicalTree({groups,negative,protocol}).B*8>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');
 const maps=Object.fromEntries(Object.entries(before).map(([name,rows])=>[name,new Map(rows.map(row=>[row.id,copy(row)]))]));
 const cmp=(a,b)=>{if(Array.isArray(a)&&Array.isArray(b)){for(let i=0;i<Math.min(a.length,b.length);i++){const c=cmp(a[i],b[i]);if(c)return c;}return a.length-b.length;}return a===b?0:a<b?-1:1;};
 const matches=(key,range)=>range===undefined||range===null||range&&typeof range==='object'&&!Array.isArray(range)&&typeof range.includes==='function'?range===undefined||range===null||range.includes(key):cmp(key,range)===0;
 const query=(table,index,range)=>{const d=index?bound.schema[table]?.[index]:null;if(index&&!d)deny();const value=(row,path)=>Array.isArray(path)?path.map(k=>row[k]):row[path];const result=[];for(const row of maps[table].values()){const key=d?value(row,d.path):row.id;if(key===undefined)continue;for(const k of d?.multi?key:[key])if(matches(k,range))result.push({key:k,row});}return result.sort((a,b)=>cmp(a.key,b.key)||cmp(a.row.id,b.row.id));};
 const scratch={semanticEnabled:true,tx:{objectStoreNames:{contains:name=>Object.hasOwn(maps,name)}},get:async(table,id)=>copy(maps[table]?.get(id)),
  put:async(table,row)=>{if(!maps[table])deny();if(table==='blockIndex')await syncArchiveYearIndex(scratch,await scratch.get(table,row.id),row);await trackSemanticWrite(scratch,table,row.id,row);await trackNavigationWrite(scratch,table,row.id,row);maps[table].set(row.id,copy(row));},
  delete:async(table,id)=>{if(!maps[table])deny();if(table==='blockIndex')await syncArchiveYearIndex(scratch,await scratch.get(table,id),null);await trackSemanticWrite(scratch,table,id,null);await trackNavigationWrite(scratch,table,id,null);maps[table].delete(id);},
  rangePage:async(table,index,range,after,limit,direction='next')=>{let rows=query(table,index,range);if(direction==='prev')rows.reverse();if(after!==null)rows=rows.filter(x=>direction==='prev'?cmp(x.key,after)<0:cmp(x.key,after)>0);return {rows:rows.slice(0,limit).map(x=>({key:copy(x.key),value:copy(x.row)})),next:rows.length>limit?copy(rows[limit-1].key):null};},
  all:async(table,index,key)=>query(table,index,key).map(x=>copy(x.row)),count:async(table,index,key)=>query(table,index,key).length,
  edge:async(table,index,key,direction='next')=>{const rows=query(table,index,key);return copy((direction==='prev'?rows.at(-1):rows[0])?.row);},keys:async(table,index,key)=>query(table,index,key).map(x=>x.row.id)};
 const facade={changedSources:new Set(),control:async()=>copy(store.controlCache),saveRecord:IndexedArchiveStore.prototype.saveRecord,refreshDoc:IndexedArchiveStore.prototype.refreshDoc,initialFilter:planInitialFilter,applyInitialBaseline:(t,cap)=>originalIAConstructor().prototype.applyInitialBaseline.call(store,t,cap)};
 const working=groups.filter(g=>g.type==='inputWorkingCommit'),events=observed?.invalidations.filter(r=>!before.invalidations.some(old=>old.id===r.id))??[];
 if(working.length&&events.length!==working.length)deny();
 const knownEvents=new Set();
 for(const group of groups){
  if(group.type==='sourceBootstrapCommit'){await IndexedArchiveStore.prototype.applyInitialSource.call(facade,scratch,group.capability);continue;}
  if(['promptPreferences','promptBinding','consumerPreference'].includes(group.type)){
   if(!portable)deny();const operation=group.operations[0],previousHead=await core.get(scratch,'head',operation.type,operation.entityId),previousVersions=[];
   for(const ref of previousHead?.revisions??[])previousVersions.push((await core.get(scratch,'revision',ref)).operation);
   await core.put(scratch,'revision',[operation.revisionId],{operation,redacted:false});
   let revisions=[],stale=false;for(const head of previousHead?.revisions??[]){if(await core.ancestor(scratch,head,operation.revisionId))continue;if(await core.ancestor(scratch,operation.revisionId,head))stale=true;revisions.push(head);}if(!stale)revisions.push(operation.revisionId);revisions.sort();
   const head={type:operation.type,entityId:operation.entityId,revisions,purged:false,fence:null};await core.put(scratch,'head',[operation.type,operation.entityId],head);
   if(revisions.length>1)requireResolvedPromptReplayConflict(core,portable.plan,group,{state:'conflict',revisions});
   else if(group.type!=='consumerPreference'){const winner=(await core.get(scratch,'revision',revisions[0])).operation;await (group.type==='promptBinding'?preparePromptBindingReplay(core,portable.plan):materializePrompt)(scratch,{core,previousCore:core,operation:winner,head,origin:'remote',previousHead,previousVersions});}
   continue;
  }
  if(group.type!=='inputWorkingCommit'||!observed)deny();
  const members=group.prepared.members.map(o=>({operation:o,type:o.value.entityType,value:o.value.entity})),block=members.find(m=>m.type==='input')?.value,state=members.find(m=>m.type==='inputState')?.value;
  const event=events.find(r=>r.inputId===block.id&&r.contentRevision===state.contentRevision),at=observed.filterInputs.find(r=>r.id===block.id)?.overrideAt;
  if(!event||knownEvents.has(event.id)||!exact(event,['id','eventSchema','inputId','reason','contentRevision','sequence','at','stateKey','state','cursor','dependencyAck','organizerAck'])||!opaque(event.id)||typeof at!=='string'||!Number.isFinite(Date.parse(at))||typeof event.at!=='string'||!Number.isFinite(Date.parse(event.at))||!equal(event,{id:event.id,eventSchema:2,inputId:block.id,reason:'source_updated',contentRevision:state.contentRevision,sequence:(maps.meta.get('thought-epoch')?.value||0)+1,at:event.at,stateKey:0,state:'pending',cursor:null,dependencyAck:false,organizerAck:false}))deny();knownEvents.add(event.id);
  const history=members.filter(m=>m.type==='revision').map(m=>({...m,localSequence:maps.revisions.get(m.value.id)?.sequence??null})),clocks=[at,event.at];
  const owner={clock:()=>{if(!clocks.length)deny();return clocks.shift();},uuid:()=>event.id,initialFilter:planInitialFilter,updateProtectedFilterRow:originalFilterConstructor().prototype.updateProtectedFilterRow,invalidate(t,inputId,reason,revision){return enqueueInvalidation(this,t,inputId,reason,revision);}};
  const result=await originalIAConstructor().prototype.applyRemoteWorking.call(owner,scratch,{before:copy(maps.blocks.get(block.id)?.value),block,inputState:state,history,keeps:members.filter(m=>m.type==='filterIntent').map(m=>m.value),operationId:group.prepared.descriptor.value.id});
  if(clocks.length)deny();
  const namespace=before.meta.find(r=>r.id===core.prefix+'active')?.namespace??'initial',key=(kind,id)=>core.prefix+'generation:'+namespace+':'+kind+':'+encodeURIComponent(id);
  protocol=protocol.filter(r=>r.id!==key('workingOwner',block.id)&&!result.history.some(h=>r.id===key('workingHistory',h.id)));
  protocol.push({id:key('workingOwner',block.id),revisionId:members.find(m=>m.type==='input').operation.revisionId,deltaSequence:result.deltaSequence});for(const h of result.history)protocol.push({id:key('workingHistory',h.id),sequence:h.sequence,revisionId:members.find(m=>m.type==='revision'&&m.value.id===h.id).operation.revisionId});
 }

 for(const n of negative){const v=n.intent,id='source:'+v.sourceKey;if(maps.tombstones.has(id))continue;await scratch.put('tombstones',{id,sequence:Date.parse(v.at),value:{sourceIdentityHash:v.sourceKey,deletedAt:v.at,status:'permanently_ignored'}});}
 let publication=null,predictedControl=null;
 if(portable?.consumer){
  const control=copy(portable.beforeControl),beforeFence=await readControlPublicationFence(scratch),nonce=observed?.meta.find(r=>r.id===CONTROL_PUBLICATION_RESERVATION)?.nonce;
  const facade={repository:store.repository,consumerPreferenceJournal:store.consumerPreferenceJournal,control:async()=>copy(control),qualifyControlPublicationRead:async()=>{},saveControl:async(_t,value)=>{if(!opaque(nonce)||!/^([A-Za-z0-9_-]{8,128})$/.test(nonce))deny();await reserveControlPublication(scratch,beforeFence,{nonce,databaseId:store.databaseId,beforeDigest:portable.controlDigest});Object.assign(control,copy(value));await scratch.put('meta',{id:'gate',epoch:value.settings.epoch,enabled:value.settings.enabled});}};
  publication=await projectSourcePurgeConsumerRows(portable.consumer,scratch,facade,core);predictedControl=copy(control);
 }
 const publishing=!!publication?.operations.length;
 if(portable?.progress){const progress={...portable.progress,phase:publishing?'publishing':'activated'};protocol=protocol.map(row=>row.id===progress.id?progress:row);}
 for(const row of protocol)maps.meta.set(row.id,copy(row));
 if(publishing){const progress=portable.progress,reservation=await scratch.get('meta',CONTROL_PUBLICATION_RESERVATION);await scratch.put('meta',{id:CONSUMER_PUBLICATION_PENDING_ID,version:3,namespace:progress.namespace,databaseId:reservation.databaseId,controlRevision:reservation.revision,nonce:reservation.nonce,terminal:false,before:publication.before,operations:publication.operations,restore:{stageId:progress.id,manifestId:progress.manifestRef.id,graphDigest:progress.portableDigest,replayId:progress.namespace,operations:publication.allOperations,smartFilter:publication.smartFilter}});}

 const callback=Object.fromEntries(Object.entries(maps).map(([name,map])=>[name,sort([...map.values()].map(copy))]));
 await flushNavigationWrites(scratch);await flushSemanticWrites(scratch);
 if(groups.length||negative.length){const row=maps.meta.get('backup-data-generation');maps.meta.set('backup-data-generation',{id:'backup-data-generation',value:(row?.value||0)+1});}
 const terminal=sourcePurgeActiveTerminal(store,core,active,Object.fromEntries(Object.entries(maps).map(([name,map])=>[name,sort([...map.values()].map(copy))])));
 if(measureSourceWorkingPhysicalTree({before,callback,terminal}).B>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');return {callback,terminal,...(predictedControl?{control:predictedControl}:{})};
}
export async function requireSourcePurgeGroupRows(core,t,expected){const actual=await sourcePurgeGroupSnapshot(core,t);if(!equalSourceWorkingPhysicalTree(actual,expected))deny();}
export function sealSourcePurgeGroupRows(store,core,t,before,terminal,current){
 const bound=snapshots.get(before);if(!bound||bound.core!==core||bound.repository!==store.repository)deny();
 registerRepositoryFinalReadFence(store.repository,t,{isCurrent:()=>{current();if(core.repository!==bound.repository||core.repository.db!==bound.database)deny();return true;},plan:function*(){for(const [table,rows]of Object.entries(terminal)){if((yield {method:'count',table})!==rows.length)deny();for(const row of rows)if(!equalSourceWorkingPhysicalTree(yield {method:'get',table,key:row.id},row))deny();}return true;}});
}
