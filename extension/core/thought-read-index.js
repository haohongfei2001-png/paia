import {prefix} from './thought-model.js';

export const THOUGHT_ROOT_INDEX_VERSION=1;
export const THOUGHT_ROOT_BUILD_BATCH=100;
const META_ID='thought-read-index:v1:root';
const STATUS_KEY=2;
const KIND_PREFIX='thought_root_v1:';

const activeTopic=row=>row?.lifecycle==='active'&&!row.redirectTo;
const generationKind=generation=>KIND_PREFIX+generation;
const sortPart=topic=>JSON.stringify([String(topic.createdAt??''),String(topic.id)]);
const rowId=(generation,topic)=>'thought-root:'+generation+':'+sortPart(topic);
const snapshot=meta=>({
 version:meta.version,
 activeGeneration:meta.activeGeneration||null,
 buildingGeneration:meta.buildingGeneration||null,
 sourceCursor:meta.sourceCursor??null,
 scanned:meta.scanned||0,
 indexed:meta.indexed||0,
 complete:!!meta.activeGeneration,
 building:!!meta.buildingGeneration
});
function generation(store){return String(store.uuid()).replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,80)||String(Date.now());}
async function readMeta(t){return t.get('meta',META_ID);}
async function initialize(store,t){
 let meta=await readMeta(t);
 if(meta?.version===THOUGHT_ROOT_INDEX_VERSION)return meta;
 meta={id:META_ID,version:THOUGHT_ROOT_INDEX_VERSION,activeGeneration:null,buildingGeneration:generation(store),sourceCursor:null,scanned:0,indexed:0};
 await t.put('meta',meta);
 return meta;
}
async function writeProjection(t,generationId,topic){
 const id=rowId(generationId,topic);
 if(activeTopic(topic)){
  await t.put('libraryMigrationItems',{id,statusKey:STATUS_KEY,entityKind:generationKind(generationId),topicId:topic.id,createdAt:topic.createdAt??null,sourceRecordIds:[]});
 }else await t.delete('libraryMigrationItems',id);
}
export async function ensureThoughtRootIndex(store){
 return store.run(()=>store.repository.transaction(true,async t=>snapshot(await initialize(store,t))));
}
export async function syncThoughtRootTopic(store,t,topic){
 const meta=await readMeta(t);
 if(!meta||meta.version!==THOUGHT_ROOT_INDEX_VERSION)return;
 for(const g of new Set([meta.activeGeneration,meta.buildingGeneration].filter(Boolean)))await writeProjection(t,g,topic);
}
export async function invalidateThoughtRootIndex(store){
 return store.run(()=>store.repository.transaction(true,async t=>{
  const meta=await initialize(store,t);
  if(!meta.buildingGeneration){
   meta.buildingGeneration=generation(store);meta.sourceCursor=null;meta.scanned=0;meta.indexed=0;
   await t.put('meta',meta);
  }
  return snapshot(meta);
 }));
}
export async function advanceThoughtRootIndex(store){
 return store.run(()=>store.repository.transaction(true,async t=>{
  const meta=await initialize(store,t);
  if(!meta.buildingGeneration)return {...snapshot(meta),pending:false,processed:0};
  const page=await t.page('topics',{after:meta.sourceCursor??undefined,limit:THOUGHT_ROOT_BUILD_BATCH});
  let added=0;
  for(const {value:topic} of page.rows){
   meta.scanned++;
   if(activeTopic(topic)){await writeProjection(t,meta.buildingGeneration,topic);meta.indexed++;added++;}
  }
  meta.sourceCursor=page.next;
  if(!page.next){
   meta.activeGeneration=meta.buildingGeneration;
   meta.buildingGeneration=null;
   meta.sourceCursor=null;
   meta.activeCount=meta.indexed;
   meta.completedAt=store.clock();
  }
  await t.put('meta',meta);
  return {...snapshot(meta),pending:!!meta.buildingGeneration,processed:page.rows.length,added};
 }));
}
export async function thoughtRootIndexPage(store,{cursor=null,limit=40}={}){
 if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('INVALID_ROOT_LIMIT');
 const build=await advanceThoughtRootIndex(store);
 const meta=await store.run(()=>store.repository.transaction(false,t=>readMeta(t),['meta']));
 const coverage=snapshot(meta);
 if(!coverage.activeGeneration)return {items:[],nextCursor:null,coverage,complete:false,operations:{indexRowsRead:0,topicRowsRead:0,buildRowsScanned:build.processed||0}};
 if(cursor&&(cursor.mode!=='stable'||cursor.generation!==coverage.activeGeneration))return {items:[],nextCursor:null,cursorInvalid:true,coverage,complete:false,operations:{indexRowsRead:0,topicRowsRead:0,buildRowsScanned:build.processed||0}};
 const generationId=coverage.activeGeneration;
 const data=await store.run(()=>store.repository.transaction(false,async t=>{
  const page=await t.rangePage('libraryMigrationItems','byStatus',prefix([STATUS_KEY,generationKind(generationId)]),cursor?.key||null,limit);
  const topics=[];
  for(const {value:indexRow} of page.rows){
   const topic=await t.get('topics',indexRow.topicId);
   if(activeTopic(topic)&&rowId(generationId,topic)===indexRow.id)topics.push(topic);
  }
  return {page,topics};
 }));
 const nextCursor=data.page.next?{mode:'stable',generation:generationId,key:data.page.next}:null;
 return {
  items:data.topics,
  nextCursor,
  coverage,
  complete:!nextCursor&&coverage.complete,
  operations:{indexRowsRead:data.page.rows.length,topicRowsRead:data.topics.length,buildRowsScanned:build.processed||0}
 };
}
