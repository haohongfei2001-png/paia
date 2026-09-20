import {prefix} from './thought-model.js';

export const THOUGHT_ROOT_INDEX_VERSION=1;
export const THOUGHT_ROOT_BUILD_BATCH=100;
export const THOUGHT_ROOT_COLD_BATCHES=4;
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
 let buildRowsScanned=0,buildBatches=0,maxBuildBatch=0,build=null;
 for(let i=0;i<THOUGHT_ROOT_COLD_BATCHES;i++){
  build=await advanceThoughtRootIndex(store);const processed=build.processed||0;
  buildRowsScanned+=processed;buildBatches+=processed?1:0;maxBuildBatch=Math.max(maxBuildBatch,processed);
  if(build.complete||!build.pending)break;
  await store.repository.checkpoint('thought-root-index-batch');
 }
 const meta=await store.run(()=>store.repository.transaction(false,t=>readMeta(t),['meta']));
 const coverage=snapshot(meta),buildOps={buildRowsScanned,buildBatches,maxBuildBatch};
 if(!coverage.activeGeneration)return {items:[],nextCursor:null,coverage,complete:false,operations:{indexRowsRead:0,topicRowsRead:0,...buildOps}};
 if(cursor&&(cursor.mode!=='stable'||cursor.generation!==coverage.activeGeneration))return {items:[],nextCursor:null,cursorInvalid:true,coverage,complete:false,operations:{indexRowsRead:0,topicRowsRead:0,...buildOps}};
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
  operations:{indexRowsRead:data.page.rows.length,topicRowsRead:data.topics.length,...buildOps}
 };
}

// ANS-08 Topic Reader projection. Projection rows intentionally contain only
// ordering / placement / time descriptors. Thought body/title/note remain in
// the canonical Thought store and are resolved only for the visible response.
export const THOUGHT_TOPIC_INDEX_VERSION=1;
export const THOUGHT_TOPIC_BUILD_BATCH=100;
export const THOUGHT_TOPIC_STATUS_KEY=3;
export const THOUGHT_TOPIC_MAX_BUILD_BATCHES=100;
const TOPIC_META_PREFIX='thought-read-index:v1:topic:';
const TOPIC_KIND_PREFIX='thought_topic_v1:';
const MAX_TIME=9007199254740991;

const topicMetaId=id=>TOPIC_META_PREFIX+id;
const topicKind=(generationId,sort)=>TOPIC_KIND_PREFIX+generationId+':'+sort;
const codeKey=value=>Array.from(String(value),ch=>ch.codePointAt(0).toString(16).padStart(6,'0')).join('');
const inverseHex=value=>value.replace(/[0-9a-f]/g,ch=>(15-parseInt(ch,16)).toString(16));
const millis=value=>{const n=Date.parse(value||'');return Number.isFinite(n)?Math.max(0,Math.min(MAX_TIME,n)):0;};
const timeKey=(value,sort)=>{
 const n=millis(value),v=sort==='desc'?MAX_TIME-n:n;
 return String(v).padStart(16,'0');
};
const entryKey=(id,sort)=>sort==='desc'?inverseHex(codeKey(id)):codeKey(id);
const descriptorId=(generationId,sort,d)=>[
 'thought-topic',generationId,sort,
 String(d.sectionRank||'').padStart(12,'0'),
 codeKey(d.sectionId),
 timeKey(d.effectiveTime,sort),
 entryKey(d.entryId,sort)
].join(':');
const topicSnapshot=meta=>({
 version:meta?.version||THOUGHT_TOPIC_INDEX_VERSION,
 activeGeneration:meta?.activeGeneration||null,
 activeKey:meta?.activeKey||null,
 buildingGeneration:meta?.buildingGeneration||null,
 buildingKey:meta?.buildingKey||null,
 sourceCursor:meta?.sourceCursor??null,
 scanned:meta?.scanned||0,
 indexed:meta?.indexed||0,
 activeCount:meta?.activeCount||0,
 timeRevision:meta?.timeRevision||0,
 complete:!!meta?.activeGeneration,
 building:!!meta?.buildingGeneration
});
const liveTopicKey=(topic,epoch,timeRevision=0)=>JSON.stringify([
 topic.activeLayoutGeneration,
 topic.organizationRevision||0,
 topic.countVersion||0,
 epoch||0,
 timeRevision||0
]);
function startTopicBuild(store,meta,key){
 meta.buildingGeneration=generation(store);
 meta.buildingKey=key;
 meta.sourceCursor=null;
 meta.scanned=0;
 meta.indexed=0;
}
async function topicMeta(store,t,topic){
 let meta=await t.get('meta',topicMetaId(topic.id));
 if(meta?.version!==THOUGHT_TOPIC_INDEX_VERSION){
  meta={id:topicMetaId(topic.id),version:THOUGHT_TOPIC_INDEX_VERSION,timeRevision:0,activeGeneration:null,activeKey:null,buildingGeneration:null,buildingKey:null,sourceCursor:null,scanned:0,indexed:0};
 }
 const epoch=(await t.get('meta','thought-epoch'))?.value||0,key=liveTopicKey(topic,epoch,meta.timeRevision||0);
 if(meta.activeKey!==key&&meta.buildingKey!==key)startTopicBuild(store,meta,key);
 await t.put('meta',meta);
 return {meta,key,epoch};
}
export async function invalidateThoughtTopicIndex(store,t,topicId,{sourceTime=false}={}){
 const id=topicMetaId(topicId),meta=await t.get('meta',id);
 if(!meta||meta.version!==THOUGHT_TOPIC_INDEX_VERSION)return false;
 const topic=await t.get('topics',topicId);
 if(!activeTopic(topic))return false;
 if(sourceTime)meta.timeRevision=(meta.timeRevision||0)+1;
 const epoch=(await t.get('meta','thought-epoch'))?.value||0,key=liveTopicKey(topic,epoch,meta.timeRevision||0);
 if(meta.activeKey!==key||meta.buildingKey!==key)startTopicBuild(store,meta,key);
 await t.put('meta',meta);
 return true;
}
async function writeTopicDescriptor(t,generationId,descriptor){
 for(const sort of ['asc','desc']){
  const id=descriptorId(generationId,sort,descriptor);
  await t.put('libraryMigrationItems',{
   id,statusKey:THOUGHT_TOPIC_STATUS_KEY,entityKind:topicKind(generationId,sort),
   topicId:descriptor.topicId,layoutGeneration:descriptor.layoutGeneration,
   entryId:descriptor.entryId,sectionId:descriptor.sectionId,
   sectionRank:descriptor.sectionRank,rank:descriptor.rank,
   placementRevision:descriptor.placementRevision,
   sourceSentAt:descriptor.sourceSentAt||null,
   capturedAt:descriptor.capturedAt||null,
   effectiveTime:descriptor.effectiveTime||null,
   timeBasis:descriptor.timeBasis||'unknown',
   sourceRecordIds:[]
  });
 }
}
export async function advanceThoughtTopicIndex(store,{topicId,describe}){
 return store.run(()=>store.repository.transaction(true,async t=>{
  const topic=await store.canonicalTopic(t,topicId);
  if(!activeTopic(topic))throw new Error('INVALID_TOPIC');
  const {meta,key}=await topicMeta(store,t,topic);
  if(meta.activeKey===key&&!meta.buildingGeneration)return {...topicSnapshot(meta),pending:false,processed:0,key};
  if(meta.buildingKey!==key)startTopicBuild(store,meta,key);
  const page=await t.rangePage('placements','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]),meta.sourceCursor??null,THOUGHT_TOPIC_BUILD_BATCH);
  let added=0;
  for(const {value:placement} of page.rows){
   const descriptor=await describe(t,topic,placement);
   meta.scanned++;
   if(descriptor){await writeTopicDescriptor(t,meta.buildingGeneration,descriptor);meta.indexed++;added++;}
  }
  meta.sourceCursor=page.next;
  if(!page.next){
   meta.activeGeneration=meta.buildingGeneration;
   meta.activeKey=meta.buildingKey;
   meta.activeCount=meta.indexed;
   meta.completedAt=store.clock();
   meta.buildingGeneration=null;meta.buildingKey=null;meta.sourceCursor=null;
  }
  await t.put('meta',meta);
  return {...topicSnapshot(meta),pending:!!meta.buildingGeneration,processed:page.rows.length,added,key};
 }));
}
export async function ensureThoughtTopicIndex(store,{topicId,describe,maxBatches=THOUGHT_TOPIC_MAX_BUILD_BATCHES}){
 let buildRowsScanned=0,buildBatches=0,maxBuildBatch=0,last=null;
 for(let i=0;i<maxBatches;i++){
  last=await advanceThoughtTopicIndex(store,{topicId,describe});
  const processed=last.processed||0;
  buildRowsScanned+=processed;buildBatches+=processed?1:0;maxBuildBatch=Math.max(maxBuildBatch,processed);
  if(!last.pending)break;
  await store.repository.checkpoint('thought-topic-index-batch');
 }
 return {...last,operations:{buildRowsScanned,buildBatches,maxBuildBatch}};
}
async function currentTopicMeta(store,topicId){
 return store.run(()=>store.repository.transaction(false,async t=>{
  const topic=await store.canonicalTopic(t,topicId),meta=await t.get('meta',topicMetaId(topic.id)),epoch=(await t.get('meta','thought-epoch'))?.value||0;
  return {topic,meta,key:liveTopicKey(topic,epoch,meta?.timeRevision||0)};
 }));
}
async function seekDescriptor(store,{generationId,sort,entryId=null,sectionId=null}){
 const kind=topicKind(generationId,sort),range=prefix([THOUGHT_TOPIC_STATUS_KEY,kind]);let cursor=null,scanned=0;
 for(let batch=0;batch<THOUGHT_TOPIC_MAX_BUILD_BATCHES;batch++){
  const page=await store.run(()=>store.repository.transaction(false,t=>t.rangePage('libraryMigrationItems','byStatus',range,cursor,THOUGHT_TOPIC_BUILD_BATCH)));
  for(const row of page.rows){scanned++;if(entryId&&row.value.entryId===entryId||sectionId&&row.value.sectionId===sectionId)return {key:row.key,row:row.value,scanned};}
  if(!page.next)return {key:null,row:null,scanned};cursor=page.next;
  await store.repository.checkpoint('thought-topic-seek-batch');
 }
 return {key:null,row:null,scanned,truncated:true};
}
export async function thoughtTopicDescriptorPage(store,{topicId,sort='asc',cursor=null,limit=40,direction='next',anchorId=null,sectionId=null,describe}={}){
 if(!['asc','desc'].includes(sort)||!['next','prev'].includes(direction)||!Number.isInteger(limit)||limit<1||limit>100)throw new Error('INVALID_TOPIC_INDEX_REQUEST');
 const build=await ensureThoughtTopicIndex(store,{topicId,describe});
 const state=await currentTopicMeta(store,topicId),meta=state.meta,coverage={...topicSnapshot(meta),currentKey:state.key};
 const operations={...(build?.operations||{}),descriptorRowsRead:0,seekRowsScanned:0};
 if(!meta?.activeGeneration||meta.activeKey!==state.key)return {items:[],nextCursor:null,previousCursor:null,coverage,complete:false,indexing:true,operations};
 if(cursor&&(cursor.generation!==meta.activeGeneration||cursor.viewKey!==meta.activeKey||cursor.sort!==sort))return {items:[],nextCursor:null,previousCursor:null,coverage,complete:false,cursorInvalid:true,operations};
 const kind=topicKind(meta.activeGeneration,sort),range=prefix([THOUGHT_TOPIC_STATUS_KEY,kind]);
 let start=cursor?.key||null,anchor=null;
 if(!start&&(anchorId||sectionId)){
  const seek=await seekDescriptor(store,{generationId:meta.activeGeneration,sort,entryId:anchorId,sectionId});
  operations.seekRowsScanned+=seek.scanned;
  if(seek.key){start=seek.key;anchor=seek.row;}
 }
 const data=await store.run(()=>store.repository.transaction(false,async t=>{
  if(direction==='prev'){
   if(!start)return {rows:[],next:null};
   const page=await t.rangePage('libraryMigrationItems','byStatus',range,start,limit,'prev');
   return {rows:[...page.rows].reverse(),next:page.next};
  }
  const take=anchor?Math.max(0,limit-1):limit,page=take?await t.rangePage('libraryMigrationItems','byStatus',range,start,take):{rows:[],next:null};
  return {rows:anchor?[{key:start,value:anchor},...page.rows]:page.rows,next:page.next};
 }));
 operations.descriptorRowsRead+=data.rows.length;
 const items=data.rows.map(x=>x.value),firstKey=data.rows[0]?.key||null,lastKey=data.rows.at(-1)?.key||null;
 let nextCursor=null,previousCursor=null;
 if(direction==='next'){
  if(data.next&&lastKey)nextCursor={generation:meta.activeGeneration,viewKey:meta.activeKey,sort,key:lastKey};
  if(start&&firstKey)previousCursor={generation:meta.activeGeneration,viewKey:meta.activeKey,sort,key:firstKey};
 }else{
  if(data.next&&firstKey)previousCursor={generation:meta.activeGeneration,viewKey:meta.activeKey,sort,key:firstKey};
  if(lastKey)nextCursor={generation:meta.activeGeneration,viewKey:meta.activeKey,sort,key:lastKey};
 }
 return {items,nextCursor,previousCursor,coverage,complete:direction==='next'?!nextCursor:!previousCursor,indexing:false,operations};
}
