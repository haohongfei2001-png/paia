import {AI_STYLES} from '../ai-organize-style-preference.js';
import {canonical} from '../ai-usage/contracts.js';
const record=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
const exact=(x,keys)=>record(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const token=x=>typeof x==='string'&&/^[A-Za-z0-9:._/-]{1,200}$/.test(x);
export const validOrganizeCacheProfile=x=>exact(x,['contractVersion','modelVersion','promptVersion'])&&Object.values(x).every(token);
const style=x=>exact(x,['value','policyVersion'])&&AI_STYLES.includes(x.value)&&x.policyVersion==='AIOS-1.0';
// A qualification bound only: oversized metadata remains readable through its
// existing owner, but is never silently truncated into an exact cache hit.
const MAX_METADATA_BYTES=256*1024;
export function organizeCacheEvidenceVersion(metadata){
 const value=canonical(metadata);return new TextEncoder().encode(value).length<=MAX_METADATA_BYTES?value:null;
}
const binding=x=>exact(x,['version','topicId','presentationRevision','profile','style','evidenceVersion'])&&x.version===1&&typeof x.topicId==='string'&&x.topicId.length>0&&x.topicId.length<=200&&Number.isSafeInteger(x.presentationRevision)&&x.presentationRevision>=0&&validOrganizeCacheProfile(x.profile)&&style(x.style)&&typeof x.evidenceVersion==='string'&&new TextEncoder().encode(x.evidenceVersion).length<=MAX_METADATA_BYTES;
const result=(state,reason)=>({state,reason,reusable:state==='exact',dispatchAllowed:false});
// expectedProfile is explicit trusted internal configuration, never inferred
// from a saved row or a public UI request. This grants no financial authority.
export function qualifyOrganizeCache({stored,readable,snapshot,expectedProfile=null,ownerPending=false}){
 if(!stored)return result('unavailable','no_saved_presentation');
 if(!readable)return result('unreadable','evidence_unavailable');
 if(!Object.hasOwn(stored,'cacheBinding'))return result('unqualified','legacy_metadata');
 const saved=stored.cacheBinding;
 if(!binding(saved)||saved.topicId!==stored.topicId)return result('unqualified','invalid_metadata');
 if(Object.values(stored.protections||{}).some(x=>x===true))return result('stale-but-readable','human_owned');
 if(stored.needsUpdate===true||stored.stale===true)return result('stale-but-readable','owner_invalidated');
 // A pending proposal is not the accepted current result; retain both through
 // the original owner, without issuing a reusable-cache decision for either.
 if(stored.candidate)return result('stale-but-readable','candidate_pending');
 if(saved.presentationRevision!==stored.revision)return result('stale-but-readable','presentation_changed');
 if(!snapshot?.complete||!snapshot.evidenceVersion)return result('unqualified','incomplete_evidence');
 if(!validOrganizeCacheProfile(expectedProfile))return result('unqualified','profile_unavailable');
 if(canonical(saved.profile)!==canonical(expectedProfile))return result('stale-but-readable','profile_changed');
 if(!snapshot.style?.available)return result('unqualified','style_unavailable');
 if(saved.style.value!==snapshot.style.value)return result('stale-but-readable','style_changed');
 if(saved.evidenceVersion!==snapshot.evidenceVersion)return result('stale-but-readable','evidence_changed');
 if(ownerPending)return result('stale-but-readable','owner_pending');
 return result('exact','same_semantic_version');
}
