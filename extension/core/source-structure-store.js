import {ArchiveError} from './constants.js';
import {canonicalChat} from './validation.js';
import {captureIsExcluded} from './reader-state.js';
import {
 SOURCE_STRUCTURE_PREFIXES,conversationRef,projectRef,subjectRef,
 conversationMetaId,projectMetaId,eventMetaPrefix,
 validateConversationObservation,validateProjectObservation,
 reduceConversation,reduceProject,validateSourceStructureRow
} from './source-structure-model.js';
import {
 clearSourceStructureEphemeral,projectRefsInConversationRow,
 sourceStructurePrefixRange
} from './source-structure-backup.js';

const clone=value=>structuredClone(value);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const conflict=()=>{throw new ArchiveError('SOURCE_STRUCTURE_CONFLICT');};
const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
const projectToken=ref=>JSON.stringify([ref.providerKey,ref.namespace,ref.projectId]);
const eventId=(prefix,revision)=>prefix+String(revision).padStart(20,'0');

async function preparedObservation(input){
 if(input?.kind==='conversation'){
  const observation=validateConversationObservation(input),subject={kind:'conversation',conversationRef:observation.conversationRef};
  const id=await conversationMetaId(observation.conversationRef),eventPrefix=await eventMetaPrefix(subject);
  let linkedProject=null;
  if(observation.membership?.state==='project')linkedProject={id:await projectMetaId(observation.membership.projectRef),ref:observation.membership.projectRef};
  return {kind:'conversation',observation,id,eventPrefix,linkedProject};
 }
 if(input?.kind==='project'){
  const observation=validateProjectObservation(input),subject={kind:'project',projectRef:observation.projectRef};
  return {kind:'project',observation,id:await projectMetaId(observation.projectRef),eventPrefix:await eventMetaPrefix(subject),witnessId:observation.witnessConversationRef?await conversationMetaId(observation.witnessConversationRef):null};
 }
 invalid();
}
function projectPlaceholder(id,ref,observation){
 const row={id,version:1,kind:'project',projectRef:clone(ref),currentName:null,sourceStatus:'unknown',lastObservedAt:observation.observedAt,lastEvidenceId:observation.evidence.id,relationshipRevision:0};
 validateSourceStructureRow(row);return row;
}
async function putEvent(t,row){
 validateSourceStructureRow(row);const prior=await t.get('meta',row.id);
 if(prior&&!same(prior,row))conflict();
 if(!prior)await t.put('meta',row);
}
async function scanPrefix(t,prefix,fn){
 let cursor=null;do{const page=await t.rangePage('meta',null,sourceStructurePrefixRange(prefix),cursor,100);for(const {value}of page.rows)await fn(value);cursor=page.next;}while(cursor!==null);
}
async function deletePrefix(t,prefix){
 for(;;){const page=await t.rangePage('meta',null,sourceStructurePrefixRange(prefix),null,100);if(!page.rows.length)return;for(const {value}of page.rows)await t.delete('meta',value.id);}
}
function conversationFromRecord(row){
 if(!row?.platform)return null;
 const id=row.chatId||(row.platform==='chatgpt'?canonicalChat(row.chatUrl)?.id:null);
 return id?{platform:row.platform,sourceConversationId:id}:null;
}
function rowProjectTokens(row,out){
 if(row.kind==='conversation'||row.kind==='event')projectRefsInConversationRow(row,out);
 return out;
}

export class SourceStructureStore{
 constructor(store){if(!store?.repository||typeof store.write!=='function')invalid();this.store=store;}
 async ready(){await this.store.finishFoundation?.();}
 async observeBatch(input){
  if(!Array.isArray(input)||!input.length||input.length>100||new TextEncoder().encode(JSON.stringify(input)).length>128*1024)invalid();
  await this.ready();const prepared=[];for(const item of input)prepared.push(await preparedObservation(item));
  const unique=new Set();for(const item of prepared){if(unique.has(item.id))invalid();unique.add(item.id);}
  const explicitProjects=new Set(prepared.filter(item=>item.kind==='project').map(item=>item.id));
  return this.store.write(async t=>{
   const planned=new Map(),events=[],results=[];
   const get=async id=>planned.has(id)?planned.get(id):await t.get('meta',id);
   for(const item of prepared){
    const {observation}=item;
    if(item.kind==='conversation'){
     const chatKey=observation.conversationRef.platform+':'+observation.conversationRef.sourceConversationId;
     if(!(await t.count('documents','byChat',chatKey)))invalid();
     const current=await get(item.id),reduced=reduceConversation(current,observation);
     if(reduced.conflict)conflict();if(reduced.stale){results.push({stale:true,current:clone(reduced.current)});continue;}
     if(reduced.current){reduced.current.id=item.id;validateSourceStructureRow(reduced.current);planned.set(item.id,reduced.current);}
     if(reduced.event){reduced.event.id=eventId(item.eventPrefix,reduced.current.relationshipRevision);events.push(reduced.event);}
     if(item.linkedProject&&!explicitProjects.has(item.linkedProject.id)&&!await get(item.linkedProject.id)){
      planned.set(item.linkedProject.id,projectPlaceholder(item.linkedProject.id,item.linkedProject.ref,observation));
     }
     results.push({changed:reduced.changed,current:reduced.current?clone(reduced.current):null,event:reduced.event?clone(reduced.event):null});
     continue;
    }
    let current=await get(item.id);
    if(!current){
     if(!item.witnessId)invalid();
     const witness=await get(item.witnessId);
     const linked=witness?.kind==='conversation'&&(witness.membership?.state==='project'&&same(witness.membership.projectRef,observation.projectRef)||same(witness.lastKnownSourceProject?.projectRef,observation.projectRef));
     if(!linked)invalid();
    }
    const reduced=reduceProject(current,observation);
    if(reduced.conflict)conflict();if(reduced.stale){results.push({stale:true,current:clone(reduced.current)});continue;}
    if(reduced.current){reduced.current.id=item.id;validateSourceStructureRow(reduced.current);planned.set(item.id,reduced.current);}
    if(reduced.event){reduced.event.id=eventId(item.eventPrefix,reduced.current.relationshipRevision);events.push(reduced.event);}
    results.push({changed:reduced.changed,current:reduced.current?clone(reduced.current):null,event:reduced.event?clone(reduced.event):null});
   }
   for(const event of events){const prior=await t.get('meta',event.id);if(prior&&!same(prior,event))conflict();}
   for(const row of planned.values())await t.put('meta',row);
   for(const row of events)await putEvent(t,row);
   return results;
  });
 }
 async observeConversation(input){return (await this.observeBatch([{...input,kind:'conversation'}]))[0];}
 async observeProject(input){return (await this.observeBatch([{...input,kind:'project'}]))[0];}
 async observeAdmittedBatch(input){
  if(!Array.isArray(input)||!input.length||input.length>20||
     input.some(item=>!item||!['conversation','project'].includes(item.kind)||Object.hasOwn(item,'expectedRevision')))invalid();
  await this.ready();
  const refs=new Map();
  for(const item of input){
   if(item.kind==='conversation'){
    const ref=conversationRef(item.conversationRef);
    refs.set(ref.platform+':'+ref.sourceConversationId,ref);
   }else if(item.witnessConversationRef){
    const ref=conversationRef(item.witnessConversationRef);
    refs.set(ref.platform+':'+ref.sourceConversationId,ref);
   }
  }
  for(const ref of refs.values()){
   const gate=await this.store.run(()=>this.store.repository.transaction(false,async t=>({
    excluded:ref.platform==='chatgpt'&&await captureIsExcluded(t,ref.sourceConversationId),
    archived:await t.count('documents','byChat',ref.platform+':'+ref.sourceConversationId)>0
   }),['meta','documents']));
   if(gate.excluded)return {settled:true,excluded:true,changed:false,event:false};
   if(!gate.archived)return {settled:false,excluded:false,changed:false,event:false};
  }
  for(let attempt=0;attempt<2;attempt++){
   const batch=[];
   for(const item of input){
    if(item.kind==='conversation'){
     const ref=conversationRef(item.conversationRef),current=await this.conversation(ref);
     batch.push({...item,expectedRevision:current?.relationshipRevision||0});
    }else{
     const current=await this.project(item.projectRef);
     batch.push({...item,expectedRevision:current?.relationshipRevision||0});
    }
   }
   try{
    const results=await this.observeBatch(batch);
    return {
     settled:true,excluded:false,
     changed:results.some(result=>result?.changed===true),
     event:results.some(result=>result?.event!==null&&result?.event!==undefined)
    };
   }catch(error){if(error?.code!=='SOURCE_STRUCTURE_CONFLICT'||attempt)throw error;}
  }
 }
 async observeAdmitted(input){
  return this.observeAdmittedBatch([input]);
 }

 async conversation(ref){
  await this.ready();const normalized=conversationRef(ref),id=await conversationMetaId(normalized);
  return this.store.run(()=>this.store.repository.transaction(false,async t=>clone(await t.get('meta',id)||null),['meta']));
 }
 async project(ref){
  await this.ready();const normalized=projectRef(ref),id=await projectMetaId(normalized);
  return this.store.run(()=>this.store.repository.transaction(false,async t=>clone(await t.get('meta',id)||null),['meta']));
 }
 async history(ref,{cursor=null,limit=50}={}){
  await this.ready();const subject=subjectRef(ref);if(!Number.isInteger(limit)||limit<1||limit>100||cursor!==null&&typeof cursor!=='string')invalid();
  const prefix=await eventMetaPrefix(subject),range=sourceStructurePrefixRange(prefix);
  return this.store.run(()=>this.store.repository.transaction(false,async t=>{
   const page=await t.rangePage('meta',null,range,cursor,limit);
   return {items:page.rows.map(({value})=>clone(value)),nextCursor:page.next};
  },['meta']));
 }
}

export async function purgeSourceStructureForRecords(store,t,records){
 const removed=new Set(records.map(row=>row.id)),refs=new Map();
 for(const row of records){const ref=conversationFromRecord(row);if(ref)refs.set(JSON.stringify([ref.platform,ref.sourceConversationId]),ref);}
 if(!refs.size)return;
 const removedConversationHashes=new Set();
 await scanPrefix(t,SOURCE_STRUCTURE_PREFIXES.conversation,async row=>{
  const token=JSON.stringify([row.conversationRef.platform,row.conversationRef.sourceConversationId]),ref=refs.get(token);if(!ref)return;
  const indexes=await t.all('recordIndex','byChat',ref.platform+':'+ref.sourceConversationId);
  if(indexes.some(index=>!removed.has(index.id)))return;
  removedConversationHashes.add(row.id.slice(SOURCE_STRUCTURE_PREFIXES.conversation.length));await t.delete('meta',row.id);
 });
 for(const hash of removedConversationHashes)await deletePrefix(t,SOURCE_STRUCTURE_PREFIXES.event+hash+':');
 if(!removedConversationHashes.size){await clearSourceStructureEphemeral(t);return;}
 const referencedProjects=new Set();
 await scanPrefix(t,SOURCE_STRUCTURE_PREFIXES.conversation,row=>{rowProjectTokens(row,referencedProjects);});
 await scanPrefix(t,SOURCE_STRUCTURE_PREFIXES.event,row=>{if(row.subjectRef?.kind==='conversation')rowProjectTokens(row,referencedProjects);});
 const orphanProjectHashes=[];
 await scanPrefix(t,SOURCE_STRUCTURE_PREFIXES.project,async row=>{if(!referencedProjects.has(projectToken(row.projectRef))){orphanProjectHashes.push(row.id.slice(SOURCE_STRUCTURE_PREFIXES.project.length));await t.delete('meta',row.id);}});
 for(const hash of orphanProjectHashes)await deletePrefix(t,SOURCE_STRUCTURE_PREFIXES.event+hash+':');
 await clearSourceStructureEphemeral(t);
}

