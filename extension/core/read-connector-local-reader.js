import {ArchiveError} from './constants.js';
import {materialRead} from './manual-materials.js';
import {policy,topicActive} from './memory/model.js';
import {parseReadConnectorRequest,READ_CONNECTOR_RESULT_LIMITS} from './read-connector-contract.js';
import {rankLexicalCandidate,searchExcerpt} from './search-service.js';

const denied=()=>{throw new ArchiveError('MEMORY_DENIED');};
const unavailable=()=>{throw new ArchiveError('MEMORY_UNAVAILABLE');};
const limited=()=>{throw new ArchiveError('MEMORY_LIMIT');};
const sameSnapshot=(a,b)=>a.generation===b.generation
 &&a.sessionRevision===b.sessionRevision
 &&a.profile.revision===b.profile.revision;
const kindOf=c=>c.kind==='input'?'input':c.kind==='entry'?'thought':null;
const refOf=c=>({kind:kindOf(c),id:c.kind==='input'?c.inputId:c.entryId,
 revision:c.revision});
const titleOf=c=>c.title||c.topicName||c.sectionTitle||'Material';
const cursorKey=(request,scope)=>JSON.stringify([request.tool,
 request.tool==='query'?request.args.text:'',request.args.kinds,
 request.args.limit,scope.grantId,scope.profileId,scope.scopeRevision]);

// CPV1-08.2 detached local reader. It uses the current Memory profile policy,
// never caller-selected profile authority. No listener, grant issuer, external
// call or packaged product entrypoint imports this module.
export function createLocalReadConnectorReader(memory){
 if(!memory?.s?.repository||typeof memory.ready!=='function'
    ||typeof memory.state!=='function'
    ||typeof memory.candidates!=='function')throw new ArchiveError('INVALID_REQUEST');
 const cursors=new Map();
 const candidates=async(profileId,query)=>{
  try{return await memory.candidates({profileId,query});}
  catch{denied();}
 };
 return async function read(request,scope){
  const parsed=parseReadConnectorRequest({tool:request?.tool,args:request?.args});
  if(!scope||typeof scope.profileId!=='string'||!scope.profileId
     ||typeof scope.grantId!=='string'||!scope.grantId
     ||!Array.isArray(scope.allowedKinds))denied();
  await memory.ready();
  if(parsed.tool==='list_material'||parsed.tool==='query'){
   // Topic query requires an independently admitted human note/AI result.
   if(parsed.args.kinds.some(kind=>!scope.allowedKinds.includes(kind))
      ||parsed.tool==='query'&&parsed.args.kinds.includes('topic'))denied();
   const query=parsed.tool==='query'?parsed.args.text:'';
   const before=await candidates(scope.profileId,query);
   if(before.partial)limited(); // never claim complete over a capped scan
   let topicItems=[];
   if(parsed.tool==='list_material'&&parsed.args.kinds.includes('topic')){
    const temporary=await memory.temporary();
    if(temporary.revision!==before.sessionRevision)denied();
    topicItems=await memory.s.run(()=>memory.s.repository.transaction(false,async t=>{
     const state=await memory.state(t);
     if(state.profiles.find(p=>p.profileId===scope.profileId)?.revision
        !==before.profile.revision
        ||((await t.get('meta','backup-data-generation'))?.value||0)
          !==before.generation)denied();
     const topics=(await t.all('topics')).filter(topicActive);
     if(topics.length>20000)limited();
     const rule=policy(state.rows,scope.profileId,temporary.grants,
      new Map(topics.map(topic=>[topic.id,topic])));
     const items=[];
     for(const topic of topics){
      if(rule.decision(topic.id)!=='allowed')continue;
      const title=await memory.safeLabel(t,topic,'name');
      if(!title?.trim())continue;
      if(typeof topic.id!=='string'||topic.id.length>200
         ||[...title].length>READ_CONNECTOR_RESULT_LIMITS.titleCharacters)unavailable();
      items.push({kind:'topic',id:topic.id,title});
     }
     return items;
    }));
   }
   const values=before.candidates.filter(c=>parsed.args.kinds.includes(kindOf(c)))
    .map(c=>parsed.tool==='query'?rankLexicalCandidate({...c,relatedScore:0},query):c)
    .filter(c=>parsed.tool!=='query'||c.score>0)
    .concat(topicItems)
    .sort((a,b)=>parsed.tool==='query'?(b.score-a.score
      ||String(a.id).localeCompare(String(b.id)))
      :String(a.id).localeCompare(String(b.id)));
   const signature=cursorKey(parsed,scope);
   let offset=0;
   if(parsed.args.cursor!==null){
    const token=parsed.args.cursor,prior=cursors.get(token);
    cursors.delete(token);
    if(!prior||prior.expiresAt<=Date.now()
       ||prior.signature!==signature
       ||!sameSnapshot(before,prior.snapshot))denied();
    offset=prior.offset;
    if(offset>=values.length)denied();
   }
   const selected=values.slice(offset,offset+parsed.args.limit);
   const items=selected.map(c=>{
    if(c.kind==='topic')return {kind:'topic',id:c.id,title:c.title};
    const title=titleOf(c),ref=refOf(c);
    if(!ref.kind||typeof ref.id!=='string'||!ref.id
       ||ref.id.length>200||!Number.isSafeInteger(ref.revision)
       ||typeof title!=='string'||!title.trim()
       ||[...title].length>READ_CONNECTOR_RESULT_LIMITS.titleCharacters)unavailable();
    if(parsed.tool==='list_material')
     return {kind:ref.kind,id:ref.id,title};
    const snippet=searchExcerpt(c.body,query,
     READ_CONNECTOR_RESULT_LIMITS.snippetCharacters);
    if(!snippet.trim())unavailable();
    return {ref,title,snippet};
   });
   const after=await candidates(scope.profileId,query);
   if(after.partial||!sameSnapshot(before,after))denied();
   // One-use, process-local opaque page cursors. Revocation is also checked by
   // the enclosing trusted boundary immediately before result release.
   const nextOffset=offset+selected.length;
   let nextCursor=null;
   if(nextOffset<values.length){
    for(const [token,row] of cursors)
     if(row.expiresAt<=Date.now())cursors.delete(token);
    if(cursors.size>=100)cursors.delete(cursors.keys().next().value);
    nextCursor=crypto.randomUUID();
    cursors.set(nextCursor,{signature,snapshot:{generation:before.generation,
     sessionRevision:before.sessionRevision,
     profile:{revision:before.profile.revision}},offset:nextOffset,
     expiresAt:Date.now()+300000});
   }
   return {items,nextCursor,complete:nextCursor===null};
  }
  if(parsed.tool!=='get_by_ref')unavailable();
  const ref=parsed.args.ref;
  // A material ref is an address, not authority. Source-original refs inherit
  // only their currently eligible Input identity.
  if(!['input','source','thought'].includes(ref.kind))denied();
  const eligible=found=>found.candidates.some(c=>ref.kind==='thought'
   ?c.kind==='entry'&&c.entryId===ref.id&&c.revision===ref.revision
   :c.kind==='input'&&c.inputId===ref.id
      &&(ref.kind==='source'||c.revision===ref.revision));
  const before=await candidates(scope.profileId,'');
  if(!eligible(before))denied();
  const value=await memory.s.run(()=>memory.s.repository.transaction(false,async t=>{
   const state=await memory.state(t);
   if(state.profiles?.find(p=>p.profileId===scope.profileId)?.revision
      !==before.profile.revision)denied();
   if(((await t.get('meta','backup-data-generation'))?.value||0)
      !==before.generation)denied();
   const kind=ref.kind==='thought'?'thought':'input';
   if(!scope.allowedKinds.includes(kind))denied();
   const data=await materialRead(memory,t,ref);
   return {ref,title:data.title,body:data.body,role:data.role};
  }));
  const after=await candidates(scope.profileId,'');
  if(!eligible(after)||!sameSnapshot(before,after))denied();
  return value;
 };
}
