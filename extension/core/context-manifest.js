import {isBudget} from './memory/model.js';
import {ArchiveError} from './constants.js';
import {validMaterialRef,materialKey} from './manual-materials.js';

export const MANUAL_CONTEXT_MANIFEST_VERSION=1;
export const MANUAL_CONTEXT_LIMITS=Object.freeze({items:200,materialUTF16Units:4000000,noteUTF16Units:20000});
const invalid=()=>{throw new ArchiveError('MEMORY_INVALID');};
const integer=n=>Number.isSafeInteger(n)&&n>=0;

// Ephemeral reviewed selection metadata, never another archive, grant, or
// relevance-ranked replacement for what the user explicitly selected.
export function manualContextManifest(session){
 if(session?.outputBudget!==undefined&&session.outputBudget!==null&&!isBudget(session.outputBudget))invalid();
 if(!session||typeof session.id!=='string'||!integer(session.generation)||!integer(session.policyRevision??0)||!integer(session.temporaryPolicyRevision??0)||!Array.isArray(session.items)||!(session.excluded instanceof Set))invalid();
 const selected=session.items.map(item=>{
  if(typeof item.itemId!=='string'||!validMaterialRef(item.ref)||!['ready','stale','blocked'].includes(item.state))invalid();
  const text=item.override??item.body;if(typeof text!=='string')invalid();
  if(item.origin==='retrieval'&&(!item.retrieval||typeof item.retrieval.profileId!=='string'||!integer(item.retrieval.profileRevision)||typeof item.retrieval.querySha256!=='string'||!/^[a-f0-9]{64}$/.test(item.retrieval.querySha256)||typeof item.retrieval.partial!=='boolean'||!integer(item.retrieval.inspected)))invalid();
  const ref=structuredClone(item.ref);if(ref.span)Object.freeze(ref.span);Object.freeze(ref);
  return Object.freeze({itemId:item.itemId,ref,role:item.role,origin:item.origin==='retrieval'?'retrieval':'explicit',...(item.origin==='retrieval'?{retrieval:Object.freeze({...item.retrieval})}:{}),state:item.state,edited:item.override!==undefined,materialUTF16Units:item.state==='blocked'?0:text.length});
 });
 const explicit=selected.filter(item=>item.origin==='explicit'),retrievalSupplements=selected.filter(item=>item.origin==='retrieval');
 const materialUTF16Units=selected.reduce((n,item)=>n+item.materialUTF16Units,0);
 if(selected.length>MANUAL_CONTEXT_LIMITS.items||materialUTF16Units>MANUAL_CONTEXT_LIMITS.materialUTF16Units)throw new ArchiveError('MEMORY_LIMIT');
 return Object.freeze({version:MANUAL_CONTEXT_MANIFEST_VERSION,selectionId:session.id,generation:session.generation,policyRevision:session.policyRevision??0,temporaryPolicyRevision:session.temporaryPolicyRevision??0,
  containers:Object.freeze((session.containers||[]).map(group=>Object.freeze({kind:group.kind,id:group.id,state:group.state,selectedMemberCount:group.refs.filter(ref=>session.items.some(item=>materialKey(item.ref)===materialKey(ref))).length,members:Object.freeze(group.refs.map(ref=>Object.freeze(structuredClone(ref))))}))),
  explicit:Object.freeze(explicit),retrievalSupplements:Object.freeze(retrievalSupplements),
  exclusions:Object.freeze([...session.excluded]),redactionCount:session.redactions.length,
  budget:Object.freeze({...MANUAL_CONTEXT_LIMITS,selectedItems:selected.length,materialUTF16Units,outputBudget:session.outputBudget??null,outputMode:session.outputBudget?'split':'full'}),
  complete:selected.every(item=>item.state==='ready')&&(session.containers||[]).every(group=>group.state==='ready'),partial:false,automaticRelease:false,localOnly:true,persisted:false});
}
