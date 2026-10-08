import {CANDIDATE_CODECS,CODECS,CODEC_COVERAGE} from './codecs.js';
import {PromptSyncJournal,materializePrompt,restorePromptPreferences} from './prompt-journal.js';
import {PROMPT_REUSE_ROW} from '../prompt-reuse-preferences.js';
import {CONTEXT_CARDS_ROW} from '../context-cards.js';
import {backupMetaAllowed} from '../backup-format.js';
import {sourceStructureMetaAllowed} from '../source-structure-backup.js';
import {topicIdentityMetaAllowed} from '../topic-identity-backup.js';
import {fail} from './value.js';
const META_LIMIT=10000;
// Key-only traversal: no arbitrary meta payloads, bodies or portable export.
function metaKeys(t){return new Promise((resolve,reject)=>{const keys=[],r=t.tx.objectStore('meta').openKeyCursor();r.onerror=()=>reject(r.error);r.onsuccess=()=>{const c=r.result;if(!c){resolve({keys,complete:true});return;}if(keys.length===META_LIMIT){resolve({keys,complete:false});return;}keys.push(c.key);c.continue();};});}
// Explicit implementation registry. Availability does not prove current writer
// coverage: the present Prompt journal stores no local canonical revision fence.
const owners={promptPreferences:{restore:restorePromptPreferences,matchProof:false}};
export async function readCanonicalReadiness(core,{promptService=null}={}){
 if(typeof core?.transaction!=='function'||!core.repository)fail('BNS_READINESS_UNAVAILABLE');
 return core.transaction(false,async t=>{
  const namespace=await core.bind(t),ownerGeneration=(await t.get('meta','backup-data-generation'))?.value||0,protocolGeneration=(await core.get(t,'generation'))?.value||0;
  const scan=await metaKeys(t),keys=new Set(scan.keys),families=[];
  for(const [type,codec]of Object.entries(CANDIDATE_CODECS)){
   let count=0;
   if(codec.store!=='meta')count=await t.count(codec.store);
   else if(type==='promptPreferences')count=keys.has(PROMPT_REUSE_ROW)?1:0;
   else if(type==='sourceStructure')count=scan.keys.filter(sourceStructureMetaAllowed).length;
   else if(type==='topicName')count=scan.keys.filter(topicIdentityMetaAllowed).length;
   else if(type==='consumerPreference')count=keys.has(codec.owner)?1:0;
   else if(['contextItem','contextRulesItem','contextNowItem','contextDesired'].includes(type)){
    // Aggregate canonical owner has no item-count index. Read its shape only;
    // no body is compared, hashed, retained or returned by this preflight.
    const row=keys.has(CONTEXT_CARDS_ROW)?await t.get('meta',CONTEXT_CARDS_ROW):null;
    if(row&&(!Array.isArray(row.items)||!row.access||typeof row.access!=='object'))fail('BNS_CODEC_INVALID');
    // Keep the pre-existing aggregate Context blocker: automatic/unknown Items
    // remain unrepresented. New card counts do not assert per-item journal proof.
    count=row?(type==='contextDesired'?Object.keys(row.access).filter(k=>k!=='global').length:type==='contextItem'?row.items.length:row.items.filter(item=>item.card===(type==='contextRulesItem'?'rules':'now')).length):0;
   }
   const journalBound=type==='promptPreferences'&&promptService?.s?.repository===core.repository&&promptService.syncJournal instanceof PromptSyncJournal&&promptService.syncJournal.core===core&&core.materialize===materializePrompt;
   const head=type==='promptPreferences'&&count?await core.get(t,'head',type,PROMPT_REUSE_ROW):null;
   const reasons=[];
   if(count){if(!CODECS[type])reasons.push('CODEC_NOT_ADMITTED');if(!journalBound)reasons.push('WRITER_NOT_BOUND');if(typeof owners[type]?.restore!=='function')reasons.push('RESTORE_OWNER_UNAVAILABLE');
    if(type==='promptPreferences'){if(!head)reasons.push('JOURNAL_HEAD_MISSING');else if(head.purged)reasons.push('PURGE_OWNER_UNAVAILABLE');else if(head.revisions.length!==1)reasons.push('UNRESOLVED_CONFLICT');}
    if(!owners[type]?.matchProof)reasons.push('CANONICAL_COVERAGE_UNPROVEN');
   }
   families.push({type,count,candidateCodec:codec.version,admittedCodec:CODECS[type]?.version??null,journalBound,restoreOwnerAvailable:typeof owners[type]?.restore==='function',registeredHead:!!head,ready:count===0||reasons.length===0,reasons});
  }
  const recognized=key=>key===PROMPT_REUSE_ROW||key===CONTEXT_CARDS_ROW||sourceStructureMetaAllowed(key)||topicIdentityMetaAllowed(key);
  const otherPortableMetadata=scan.keys.filter(key=>backupMetaAllowed(key)&&!recognized(key)).length;
  // Registry lists current unrepresented canonical domains, rather than treating
  // absent protocol heads as proof that the corresponding local data is empty.
  const unresolvedDomains=[...CODEC_COVERAGE.notYetRepresented];
  const blockers=families.filter(f=>!f.ready).map(f=>f.type);
  if(!scan.complete)blockers.push('META_INVENTORY_BOUND');
  if(otherPortableMetadata)blockers.push('OTHER_PORTABLE_METADATA');
  if(unresolvedDomains.length)blockers.push('CANONICAL_REGISTRY_INCOMPLETE');
  return {version:1,namespace,ownerGeneration,protocolGeneration,inventoryComplete:scan.complete,fullCanonicalReady:blockers.length===0,productionActivation:false,families,otherPortableMetadata,unresolvedDomains,blockers};
 });
}
