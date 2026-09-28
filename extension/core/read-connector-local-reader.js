import {ArchiveError} from './constants.js';
import {materialRead} from './manual-materials.js';
import {parseReadConnectorRequest} from './read-connector-contract.js';

const denied=()=>{throw new ArchiveError('MEMORY_DENIED');};
const unavailable=()=>{throw new ArchiveError('MEMORY_UNAVAILABLE');};

// CPV1-08.2 detached local reader for one exact material reference. A trusted
// boundary must supply a freshly resolved profile-scoped grant. This module has
// no listener, grant issuer, external call or packaged product import.
export function createLocalReadConnectorReader(memory){
 if(!memory?.s?.repository||typeof memory.ready!=='function'
    ||typeof memory.state!=='function')throw new ArchiveError('INVALID_REQUEST');
 return async function read(request,scope){
  const parsed=parseReadConnectorRequest({tool:request?.tool,args:request?.args});
  if(parsed.tool!=='get_by_ref')unavailable();
  if(!scope||typeof scope.profileId!=='string'||!scope.profileId
     ||typeof scope.grantId!=='string'||!scope.grantId
     ||!Array.isArray(scope.allowedKinds))denied();
  await memory.ready();
  const ref=parsed.args.ref;
  // A material ref is an address, not authority. Reuse the current Memory
  // profile's candidate policy before reading any body, including Source.
  // Topic/AI reads stay closed until they have an equivalent profile proof.
  if(!['input','source','thought'].includes(ref.kind))denied();
  const eligible=found=>found.candidates.some(c=>ref.kind==='thought'
   ?c.kind==='entry'&&c.entryId===ref.id&&c.revision===ref.revision
   :c.kind==='input'&&c.inputId===ref.id
      &&(ref.kind==='source'||c.revision===ref.revision));
  let before;
  try{before=await memory.candidates({profileId:scope.profileId,query:''});}
  catch{denied();}
  if(!eligible(before))denied();
  const value=await memory.s.run(()=>memory.s.repository.transaction(false,async t=>{
   const state=await memory.state(t);
   if(state.profiles?.find(p=>p.profileId===scope.profileId)?.revision
      !==before.profile.revision)denied();
   if(((await t.get('meta','backup-data-generation'))?.value||0)
      !==before.generation)denied();
   const kind={input:'input',source:'input',thought:'thought',
    ai:'topic',topic_note:'topic'}[ref.kind];
   if(!scope.allowedKinds.includes(kind))denied();
   const value=await materialRead(memory,t,ref);
   return {ref,title:value.title,body:value.body,role:value.role};
  }));
  // Candidate eligibility includes both durable generation and temporary
  // profile grants. Recheck after the transaction before returning content.
  let after;
  try{after=await memory.candidates({profileId:scope.profileId,query:''});}
  catch{denied();}
  if(!eligible(after)||after.generation!==before.generation
     ||after.sessionRevision!==before.sessionRevision
     ||after.profile.revision!==before.profile.revision)denied();
  return value;
 };
}
