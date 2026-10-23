import {protocolPhysicalId} from './physical-key.js';
import {deltaDescription,semanticDeltaLiveEligible,KNOWN_PREFIX,DIRTY_PREFIX,DELTA_COUNTER,HUMAN_FENCE} from '../ai-usage/delta.js';
import {bytes,fail} from './value.js';
// Pure request schedule for the fixed source-free create profile. It grants no
// repository, transaction or content truth; final publication still rereads all
// actual rows/counts and compares its independently accumulated raw key set.
export function planPhasedHumanReferences({plan,items,pages,prefix,namespace,deviceId,baselineKeys,stores}){
 const keys=new Set(),add=(table,key)=>keys.add(JSON.stringify([table,key])),meta=key=>add('meta',key),protocol=(kind,...ids)=>meta(protocolPhysicalId(prefix,namespace,kind,ids));
 const checkpoint='canonical-generation:checkpoint:',gate='canonical-generation:gate:v1',devices=new Set();
 let groups=0,operations=0;
 for(const group of plan.groups){
  const prepared=group.prepared,entry=prepared.members.find(m=>m.value.entityType==='entry')?.value.after,history=prepared.members.filter(m=>m.value.entityType==='history').map(m=>m.value.after);
  if(group.type!=='humanLibraryCommit'||prepared.descriptor.value.kind!=='entry'||group.operations.length!==3||prepared.members.length!==2||!entry||history.length!==1||prepared.members.some(m=>m.value.before!==null||m.value.after.sourceRecordIds?.length))fail('GENERATION_TASK_PROFILE');
  add('thoughts',entry.id);add('libraryMigrationItems',JSON.stringify(['search','entry',entry.id]));for(const h of history)add('revisions',h.id);add('operationReceipts',prepared.descriptor.value.domainOperationId);meta('thought-sequence');meta('revision-sequence');
  for(const op of group.operations){operations++;devices.add(op.deviceId);protocol('revision',op.revisionId);protocol('receipt',op.operationId);protocol('sequence',op.deviceId,String(op.sequence).padStart(16,'0'));protocol('entityRevision',op.type,op.entityId,op.revisionId);protocol('head',op.type,op.entityId);}
  for(const member of prepared.members)protocol('humanMapping',member.entityId);
  for(const h of history){const description=deltaDescription('revisions',h);if(!description||description.kind!=='library_entry'||description.recordId!==entry.id||description.topicId!==null)fail('GENERATION_TASK_PROFILE');if(semanticDeltaLiveEligible(description,{ownerPresent:true,live:entry,topicPresent:true,topic:null})){meta(KNOWN_PREFIX+description.key);meta(DIRTY_PREFIX+description.key);meta(DELTA_COUNTER);if(description.human)meta(HUMAN_FENCE);}}
  meta('canonical-generation:phased-human:receipt:'+String(groups++).padStart(8,'0'));
 }
 for(const device of devices){protocol('frontier',device);if(device===deviceId)protocol('device',device);}protocol('generation');
 meta('canonical-generation:phased-human:origin:v1');for(const key of baselineKeys)if(key!==gate)meta(key);
 for(const key of [checkpoint+'state:v1',checkpoint+'validated-task:v1','canonical-generation:phased-human:state:v1',checkpoint+'phased-task:v1'])meta(key);
 for(let i=0;i<items.length;i++)meta(checkpoint+'item:'+String(i).padStart(8,'0'));for(const page of pages){meta(page.id);meta(checkpoint+'page:'+String(page.index).padStart(8,'0'));}
 const points=[...keys].sort(),references=19+stores.length+points.length;
 if(groups<1||groups>129||operations>387||items.length>775||references>4096)fail('BNS_GROUP_RESOURCE_LIMIT');
 const schedule={version:1,groups,operations,items:items.length,pages:pages.length,stores:[...stores].sort(),points,references,fixedReferences:19,storeCounts:stores.length,rawPoints:points.length};
 return {schedule,chargedBytes:bytes(schedule).length};
}
