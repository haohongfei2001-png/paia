import {AI_SCHEMA_VERSION} from './ai-contract.js';
import {prefix} from '../thought-model.js';
import {validTopicGeneration} from '../topic-compatibility.js';

const MARKER='aiProductizationMigration',ROW='aiPresentation:',FENCE='ai-presentation-fence:';
const sameIds=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((id,index)=>id===b[index]);

async function migratePresentationRow(t,topic,row){
 if(row.schemaVersion!==AI_SCHEMA_VERSION)await t.put('meta',{...row,schemaVersion:0,needsUpdate:true});
 const sourceRecordIds=[];
 for(const placement of await t.all('placements','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]))){
  const entry=await t.get('thoughts',placement.entryId);
  sourceRecordIds.push(...(entry?.sourceRecordIds||[]));
 }
 await t.put('libraryMigrationItems',{id:FENCE+topic.id,entityKind:'organizer_metadata',ownerKind:'ai_presentation',ownerId:topic.id,statusKey:1,sourceRecordIds:[...new Set(sourceRecordIds)]});
}

// v1 used one global done marker. If a Topic had no valid active layout at that
// moment, its legacy AI cache was skipped forever. v2 records only unresolved
// Topics that actually own an AI cache, then revisits that bounded set later.
// No Topic identity, Source/Input data, user field or organization is changed.
export async function migrateAIPresentationProductization(store){
 return store.foundationWrite(async t=>{
  const marker=await t.get('meta',MARKER);
  if(marker?.version===2&&marker.complete===true)return marker;

  let ids;
  if(marker?.version===2&&Array.isArray(marker.pendingTopicIds))ids=[...new Set(marker.pendingTopicIds)];
  else ids=(await t.all('topics')).map(topic=>topic.id);

  const pending=[];
  for(const id of ids){
   const topic=await t.get('topics',id),row=await t.get('meta',ROW+id);
   if(!topic||!row)continue;
   if(!validTopicGeneration(topic.activeLayoutGeneration)){pending.push(id);continue;}
   await migratePresentationRow(t,topic,row);
  }

  pending.sort();
  const complete=pending.length===0;
  if(marker?.version===2&&marker.complete===complete&&sameIds(marker.pendingTopicIds||[],pending))return marker;
  const next={id:MARKER,version:2,complete,pendingTopicIds:pending,unresolvedTopics:pending.length,at:marker?.at||store.clock(),updatedAt:store.clock()};
  await t.put('meta',next);
  return next;
 });
}
