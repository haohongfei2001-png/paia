import {prefix} from '../thought-model.js';

export async function entryTime(t,entryId){
 const refs=await t.all('provenance','byOwner',prefix(['entry',entryId])),sourceTimes=[],captureTimes=[];
 for(const p of refs.filter(x=>x.role!=='context_only'))for(const id of p.sourceRecordIds||[]){const row=await t.get('records',id);if(row?.value?.sourceSentAt)sourceTimes.push(row.value.sourceSentAt);if(row?.value?.capturedAt)captureTimes.push(row.value.capturedAt);}
 return {sourceSentAt:sourceTimes.sort()[0]||null,capturedAt:captureTimes.sort()[0]||null};
}
// Lazy, idempotent layout migration. A human order anywhere in a Section wins.
// No Input, Source or Entry content changes; only unprotected placement ranks.
export async function ensureTopicChronology(s,topicId){return s.foundationWrite(async t=>{
 const topic=await s.canonicalTopic(t,topicId);if(topic.layoutJobId)return;
 const id='topicChronology:'+topic.id,key=()=>`${topic.activeLayoutGeneration}:${topic.organizationRevision}`,prior=await t.get('meta',id);if(prior?.key===key())return;
 const placements=await t.all('placements','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0])),groups=new Map();
 for(const p of placements){if(!groups.has(p.sectionId))groups.set(p.sectionId,[]);groups.get(p.sectionId).push(p);}
 let changed=false;
 for(const group of groups.values()){if(group.some(p=>p.orderProtection||p.membershipAuthorship==='user'))continue;const timed=[];for(const p of group)timed.push({p,time:(await entryTime(t,p.entryId)).sourceSentAt});const ordered=[...timed].sort((a,b)=>a.time&&b.time?a.time.localeCompare(b.time)||a.p.rank.localeCompare(b.p.rank):a.time?-1:b.time?1:a.p.rank.localeCompare(b.p.rank));if(ordered.every((x,i)=>x.p.id===group[i].id))continue;for(let i=0;i<ordered.length;i++){const p=ordered[i].p;await t.put('placements',{...p,rank:String((i+1)*1024).padStart(12,'0'),revision:p.revision+1});}changed=true;}
 if(changed){topic.organizationRevision++;await t.put('topics',topic);}
 await t.put('meta',{id,version:1,key:key()});
});}
