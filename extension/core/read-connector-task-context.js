import {ArchiveError} from './constants.js';
import {ManualContext} from './manual-context.js';
import {READ_CONNECTOR_RESULT_LIMITS} from './read-connector-contract.js';

const denied=()=>{throw new ArchiveError('MEMORY_DENIED');};
const limited=()=>{throw new ArchiveError('MEMORY_LIMIT');};
const id=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const fields=['taskId','budget','grantId','consumer','profileId','scopeRevision',
 'selectionId','owner','generation','previewSha256','reviewedManifestSha256',
 'expiresAt','revokedAt'];
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)
 &&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null)
 &&Reflect.ownKeys(value).length===fields.length
 &&Reflect.ownKeys(value).every(key=>fields.includes(key)
  &&Object.getOwnPropertyDescriptor(value,key)?.enumerable===true
  &&'value' in Object.getOwnPropertyDescriptor(value,key));
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const snapshot=(a,b)=>a.generation===b.generation
 &&a.sessionRevision===b.sessionRevision&&a.profile.revision===b.profile.revision;

// Detached CPV1-08.2 host composition. A task ID never selects a tab or supplies
// authority. The future trusted host resolves an explicitly reviewed binding;
// this module creates no binding, permission, durable Context store or transport.
export function createTaskContextReader(memory,{manualSelections,resolve,
 scopedRead,clock=()=>Date.now()}={}){
 if(!(manualSelections instanceof ManualContext)||manualSelections.memory!==memory
    ||typeof resolve!=='function'||typeof scopedRead!=='function'
    ||typeof clock!=='function')throw new ArchiveError('INVALID_REQUEST');
 const binding=(value,request,scope)=>{
  if(!record(value)||value.taskId!==request.args.taskId
     ||value.budget!==request.args.budget
     ||['grantId','consumer','profileId'].some(key=>!id(value[key])
      ||value[key]!==scope[key])
     ||value.scopeRevision!==scope.scopeRevision
     ||!id(value.selectionId)||!id(value.owner)
     ||!Number.isSafeInteger(value.generation)||value.generation<0
     ||!digest(value.previewSha256)||!digest(value.reviewedManifestSha256)
     ||typeof value.expiresAt!=='number'||!Number.isFinite(value.expiresAt)
     ||value.expiresAt<=clock()||value.revokedAt!==null)denied();
  return Object.freeze(Object.fromEntries(fields.map(key=>[key,value[key]])));
 };
 return async(request,scope)=>{
  const before=binding(await resolve(request.args.taskId,scope),request,scope);
  const assertSelection=dto=>{
   if(dto.selectionId!==before.selectionId||dto.generation!==before.generation
      ||dto.state!=='ready'||dto.expiresAt<=clock()
      ||dto.manifest.complete!==true||dto.manifest.partial!==false
      ||dto.manifest.previewSha256!==before.previewSha256
      ||dto.manifest.reviewedManifestSha256!==before.reviewedManifestSha256)
    denied();
   if([...dto.text].length>READ_CONNECTOR_RESULT_LIMITS.bodyCharacters)limited();
  };
  const result=await manualSelections.withReviewedSelection({
   selectionId:before.selectionId,generation:before.generation},before.owner,
   async dto=>{
    assertSelection(dto);
    const current=await memory.candidates({profileId:scope.profileId,query:''});
    if(current.partial)limited();
    // Every exact selected ref must pass the same current profile, kind, Source,
    // human-note or saved-AI evidence admission as a standalone connector read.
    for(const item of dto.items){
     const data=await scopedRead({tool:'get_by_ref',args:{ref:item.ref}},scope);
     if(data.role!==item.role)denied();
    }
    return {value:{taskId:request.args.taskId,text:dto.text,complete:true},
     snapshot:current};
   },async(result,dto)=>{
    assertSelection(dto);
    const after=binding(await resolve(request.args.taskId,scope),request,scope);
    if(fields.some(key=>after[key]!==before[key]))denied();
    const current=await memory.candidates({profileId:scope.profileId,query:''});
    if(current.partial||!snapshot(result.snapshot,current))denied();
    if(before.expiresAt<=clock()||dto.expiresAt<=clock())denied();
   });
  return result.value;
 };
}
