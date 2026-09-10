import {inputProjection} from './thought-evidence.js';
import {prefix} from './thought-model.js';

const VIEWS=Object.freeze(['original','ai']);
const checkpointId=view=>view==='original'?'originalOrganizerCheckpoint':'aiOrganizerCheckpoint';
const emptyCheckpoint=view=>({id:checkpointId(view),view,version:2,inputVersions:{},lastSequence:0,updatedAt:null});
const publicPlan=plan=>({view:plan.view,counts:plan.counts,approximateContentBytes:plan.approximateContentBytes});

function classify(before,current) {
 if(!current)return before?'removed':null;
 const eligible=current.removalState==='active'&&!current.sourcePurged&&current.eligible;
 if(!before)return eligible?'added':null;
 const changed=before.contentRevision!==current.contentRevision||before.removalState!==current.removalState||before.sourcePurged!==!!current.sourcePurged||Object.hasOwn(before,'eligible')&&before.eligible!==current.eligible;
 return changed?(eligible?'changed':'removed'):null;
}

// This is deliberately a read/plan layer. It stores only revision tokens and
// opaque IDs; no Input body is duplicated in a second Library database.
export async function planDelta(store,view) {
 if(!VIEWS.includes(view))throw Error('INVALID_VIEW');
 await store.finishFoundation();
 return store.run(()=>store.repository.transaction(false,async t=>{
  const checkpoint=await t.get('meta',checkpointId(view))||emptyCheckpoint(view);
  const currentRows=await t.all('inputStates'),filter=await t.get('meta','smart-filter'),current=new Map();
  for(const row of currentRows){const projection=await inputProjection(store,t,row.id),eligible=!!projection&&!await store.isFiltered(t,projection.block,filter);current.set(row.id,{...row,eligible});}
  const ids=new Set([...Object.keys(checkpoint.inputVersions),...current.keys()]);
  const changes=[],affectedEntries=new Set(),affectedTopics=new Set();let approximateContentBytes=0;
  for(const id of ids){
   const before=checkpoint.inputVersions[id],row=current.get(id),kind=classify(before,row);
   if(!kind)continue;
   changes.push({id,kind,eligible:row?.eligible===true,deltaSequence:row?.deltaSequence||0});
   if(kind!=='removed'&&row){const projection=await inputProjection(store,t,id);if(projection)approximateContentBytes+=new TextEncoder().encode(projection.body).length;}
   for(const dep of await t.all('dependencies','byInput',id)){affectedEntries.add(dep.targetId||dep.thoughtId);}
  }
  for(const id of affectedEntries)for(const placement of await t.all('placements','byEntry',prefix([id])))affectedTopics.add(placement.topicId);
  const counts={addedInput:changes.filter(x=>x.kind==='added').length,changedInput:changes.filter(x=>x.kind==='changed').length,removedInput:changes.filter(x=>x.kind==='removed').length,affectedTopic:affectedTopics.size,affectedEntry:affectedEntries.size};
  const inputVersions=Object.fromEntries([...current.values()].map(row=>[row.id,{contentRevision:row.contentRevision,removalState:row.removalState,sourcePurged:!!row.sourcePurged,eligible:row.eligible}]));
  return {view,checkpoint,counts,approximateContentBytes,changes,inputIds:changes.map(x=>x.id),affectedTopicIds:[...affectedTopics],affectedEntryIds:[...affectedEntries],nextCheckpoint:{...checkpoint,version:2,inputVersions,lastSequence:Math.max(0,...currentRows.map(x=>x.deltaSequence||0))}};
 }));
}

export async function commitOriginalDelta(store,inputIds=null) {
 const plan=await planDelta(store,'original');
 return store.foundationWrite(async t=>{
  const current=await t.get('meta',checkpointId('original'))||emptyCheckpoint('original'),ids=inputIds?new Set(inputIds):null,versions={...current.inputVersions};
  for(const [id,value] of Object.entries(plan.nextCheckpoint.inputVersions))if(!ids||ids.has(id))versions[id]={...versions[id],...value};
  if(ids)for(const id of ids)if(!Object.hasOwn(plan.nextCheckpoint.inputVersions,id))delete versions[id];
  await t.put('meta',{...current,version:2,inputVersions:versions,lastSequence:plan.nextCheckpoint.lastSequence,updatedAt:store.clock(),state:'automatic_updated'});
  return {...plan,applied:true};
 });
}

export async function dualViewStatus(store) {
 const [original,ai]=await Promise.all([planDelta(store,'original'),planDelta(store,'ai')]);
 const settings=await store.run(()=>store.repository.transaction(false,async t=>await t.get('meta','dualViewSettings')||{id:'dualViewSettings',originalAutoUpdate:true},['meta']));
 return {original:{...publicPlan(original),autoUpdate:settings.originalAutoUpdate,updateState:original.counts.addedInput+original.counts.changedInput+original.counts.removedInput?'pending':'updated'},ai:{...publicPlan(ai),providerConfigured:false,updateState:'not_updated'}};
}

export async function previewAIDelta(store) {
 return publicPlan(await planDelta(store,'ai'));
}

export async function setOriginalAutoUpdate(store,enabled) {
 return store.foundationWrite(async t=>{const row={id:'dualViewSettings',originalAutoUpdate:enabled===true,updatedAt:store.clock()};await t.put('meta',row);return row;});
}

export async function originalAutoUpdateEnabled(store) {
 return store.run(()=>store.repository.transaction(false,async t=>(await t.get('meta','dualViewSettings'))?.originalAutoUpdate!==false,['meta']));
}
