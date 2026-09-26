import {ArchiveError} from './constants.js';
import {validMaterialRef,materialKey} from './manual-materials.js';

export const MANUAL_CONTEXT_MANIFEST_VERSION=1;
export const MANUAL_CONTEXT_LIMITS=Object.freeze({items:200,materialUTF16Units:4000000,noteUTF16Units:20000});
const invalid=()=>{throw new ArchiveError('MEMORY_INVALID');};
const integer=n=>Number.isSafeInteger(n)&&n>=0;

// Ephemeral reviewed selection metadata, never another archive, grant, or
// relevance-ranked replacement for what the user explicitly selected.
export function manualContextManifest(session){
 if(!session||typeof session.id!=='string'||!integer(session.generation)||!integer(session.policyRevision??0)||!Array.isArray(session.items)||!(session.excluded instanceof Set))invalid();
 const explicit=session.items.map(item=>{
  if(typeof item.itemId!=='string'||!validMaterialRef(item.ref)||!['ready','stale','blocked'].includes(item.state))invalid();
  const text=item.override??item.body;if(typeof text!=='string')invalid();
  const ref=structuredClone(item.ref);if(ref.span)Object.freeze(ref.span);Object.freeze(ref);
  return Object.freeze({itemId:item.itemId,ref,role:item.role,origin:'explicit',state:item.state,edited:item.override!==undefined,materialUTF16Units:item.state==='blocked'?0:text.length});
 });
 const materialUTF16Units=explicit.reduce((n,item)=>n+item.materialUTF16Units,0);
 if(explicit.length>MANUAL_CONTEXT_LIMITS.items||materialUTF16Units>MANUAL_CONTEXT_LIMITS.materialUTF16Units)throw new ArchiveError('MEMORY_LIMIT');
 return Object.freeze({version:MANUAL_CONTEXT_MANIFEST_VERSION,selectionId:session.id,generation:session.generation,policyRevision:session.policyRevision??0,
  containers:Object.freeze((session.containers||[]).map(group=>Object.freeze({kind:group.kind,id:group.id,state:group.state,selectedMemberCount:group.refs.filter(ref=>session.items.some(item=>materialKey(item.ref)===materialKey(ref))).length,members:Object.freeze(group.refs.map(ref=>Object.freeze(structuredClone(ref))))}))),
  explicit:Object.freeze(explicit),retrievalSupplements:Object.freeze([]),
  exclusions:Object.freeze([...session.excluded]),redactionCount:session.redactions.length,
  budget:Object.freeze({...MANUAL_CONTEXT_LIMITS,selectedItems:explicit.length,materialUTF16Units}),
  complete:explicit.every(item=>item.state==='ready')&&(session.containers||[]).every(group=>group.state==='ready'),partial:false,automaticRelease:false,localOnly:true,persisted:false});
}
