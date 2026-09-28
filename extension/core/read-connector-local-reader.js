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
  return memory.s.run(()=>memory.s.repository.transaction(false,async t=>{
   const state=await memory.state(t);
   if(!state.profiles?.some(p=>p.profileId===scope.profileId))denied();
   const ref=parsed.args.ref;
   const kind={input:'input',source:'input',thought:'thought',
    ai:'topic',topic_note:'topic'}[ref.kind];
   if(!scope.allowedKinds.includes(kind))denied();
   const value=await materialRead(memory,t,ref);
   return {ref,title:value.title,body:value.body,role:value.role};
  }));
 };
}
