// Test-only encoder for pre-retirement synthetic backup files. Restore uses production methods.
import {PROMPT_REUSE_ROW} from '../../core/prompt-reuse-preferences.js';
import {BINDING_ROW,REVERSE_ROW} from '../../core/thought-binding.js';
import {READING_ROW,VISIT_ROW,REVISIT_POLICY_ROW,CAPTURE_POLICY_ROW,validReaderPolicy} from '../../core/reader-state.js';
import {validateMemoryRow,memoryRange,key,DEFAULT_PROFILE} from '../../core/memory/model.js';
import {BACKUP_VERSION,BACKUP_SCHEMA,BACKUP_SECTIONS,BACKUP_LIMITS,BackupValidator,backupMetaAllowed,backupHash,backupError,projectBackupEntity,projectImportEvidence,validateBackupItem} from '../../core/backup-format.js';
import {recordIndex,blockIndex,chatOf} from '../../core/idb-repository.js';
import {refreshEntryIndex,ENTRY_FIELDS,FAMILY_BY_TYPE,prefix} from '../../core/thought-model.js';
import {isStoredAIPresentation} from '../../core/organizer/ai-contract.js';
import {validAIPresentationCandidate,isBaseNoneEnvelope} from '../../core/organizer/ai-candidate.js';
import {identify,hashText} from '../../core/dedupe.js';
import {sourceIdentityChat} from '../../core/import/contract.js';
import {SOURCE_STRUCTURE_PREFIXES} from '../../core/source-structure-model.js';
import {sourceStructureMetaAllowed,validateSourceStructureBackupGraph,restoreSourceStructureRow,clearSourceStructureEphemeral,sourceStructurePrefixRange} from '../../core/source-structure-backup.js';
import {STORAGE_KEY} from '../../core/constants.js';
import {validatePreferences,defaults} from '../../core/workspace.js';
const stores={sources:'records',inputDocuments:'documents',inputs:'blocks',inputStates:'inputStates',removals:'inputRemovals',timeEvidence:'times',filterIntents:'filterIntents',filterStates:'filterInputs',entries:'thoughts',topics:'topics',sections:'sections',placements:'placements',evidence:'provenance',dependencies:'dependencies',revisions:'revisions',suppressions:'thoughtSuppressions',relations:'entryRelations',completedLayouts:'organizerJobs',receipts:'operationReceipts',deletionFences:'tombstones',organizationState:'meta'};
const sections=Object.keys(BACKUP_SECTIONS),plain=value=>value&&typeof value==='object'&&!Array.isArray(value),activeRequest=row=>['prepared','sent','response_received','validated'].includes(row?.state);
// These stores can retain user work or migration/import evidence even when the
// portable library stores have no rows. Never treat that state as an empty target.
const RESTORE_NONEMPTY_GUARD_STORES=['recordIndex','blockIndex','migrationBackup','sourceCounts','importTasks','importBatches','importEvidence','importSources'];
const REPLACE_CLEAR_STORES=[...new Set([
 ...Object.values(stores).filter(name=>!['meta','tombstones'].includes(name)),
 'recordIndex','blockIndex','libraryDocuments','sourceCounts','importTasks','importBatches',
 'importEvidence','importSources','categories','invalidations','organizerWorkItems',
 'organizerSuggestions','librarySearchTerms','libraryMigrationItems','organizerUsage',
])];
const normalize=value=>JSON.parse(JSON.stringify(value));
async function busy(t){for(const key of ['originalProviderRequest','aiPresentationRequest']){const p=await t.get('meta',key+'Current');if(p&&activeRequest(await t.get('meta',key+':'+p.requestId)))return true;}const p=await t.get('meta','boundedOrganizerCurrent');if(p&&(await t.get('meta','boundedOrganizerAction:'+p.actionId))?.state==='running')return true;return (await t.all('topics')).some(x=>x.layoutJobId);}
function sourceIds(value,out=new Set()){if(!value||typeof value!=='object')return out;if(Array.isArray(value)){for(const v of value)sourceIds(v,out);return out;}for(const [key,v]of Object.entries(value)){if(key==='sourceRecordIds'&&Array.isArray(v))for(const id of v)out.add(id);else if(['sourceRecordId','originalTextReference'].includes(key)&&typeof v==='string')out.add(v);else if(typeof v==='object')sourceIds(v,out);}return out;}
import {BackupService as ProductionBackupService} from '../../core/backup-service.js';
export class BackupService extends ProductionBackupService {
 constructor(store,options={}){super(store,options);this.exports=new Map();}
 expire(){for(const map of [this.exports,this.restores])for(const [id,row]of map)if(Date.now()-row.lastAt>15*60*1000)map.delete(id);}
 session(map,id){this.expire();const row=map.get(id);if(!row)backupError('BACKUP_SESSION_EXPIRED');row.lastAt=Date.now();return row;}
 async beginExport(){this.expire();await this.s.finishFoundation();await this.s.drainPurgeCleanup();await this.s.drainInvalidations();const state=await this.s.run(()=>this.s.repository.transaction(false,async t=>{if(await busy(t))backupError('BACKUP_BUSY');const c=await this.s.control(t);return {generation:(await t.get('meta','backup-data-generation'))?.value||0,settings:projectBackupEntity('settings',{id:'preferences',preferences:c.preferences,memoryAccessPolicy:c.memoryAccessPolicy,classificationRules:c.classificationRules,filterRules:c.filterRules})};}));
  const sessionId=crypto.randomUUID(),header={type:'header',format:'PAIA Backup',formatVersion:BACKUP_VERSION,appVersion:this.appVersion,createdAt:this.s.clock(),schemaVersion:BACKUP_SCHEMA,contentSections:sections,privacy:{localOnly:true,credentialsIncluded:false,sourceDeletionFences:true}},hash=await backupHash('',header);this.exports.clear();this.exports.set(sessionId,{...state,header,hash,section:0,after:null,sequence:0,count:0,counts:Object.fromEntries(sections.map(k=>[k,0])),lastAt:Date.now()});return {sessionId,header};
 }
 async project(t,section,row){let value=row,extra={};
  if(section==='sources'){value=row.value;const imported=value.sourceKey&&await t.get('importSources',value.sourceKey);if(imported)value={...value,importEvidence:projectImportEvidence(imported)};if(!await this.s.sourcePresent(t,[row.id]))return null;extra.order=(await t.get('recordIndex',row.id)).sequence;}
  if(section==='inputDocuments'){value=row.value;extra={order:row.sequence,working:projectBackupEntity(section,(await t.get('libraryDocuments',row.id))?.value||row.value)};}
  if(section==='inputs'){value=row.value;if(!await this.s.sourcePresent(t,[...sourceIds(value)]))return null;extra.order=(await t.get('blockIndex',row.id)).sequence;}
  if(section==='entries'){if(row.lifecycle==='quarantined'){if(row.quarantineSealed||!await this.s.sourcePresent(t,row.sourceRecordIds))return null;}else{row=await this.s.readableEntry(t,row.id);if(row.lifecycle==='invalidated'&&!row.hasHumanAction)return null;}value={...row,body:row.thoughtText};delete value.thoughtText;}
  // Derived entries excluded by the export privacy/lifecycle gate cannot leave
  // portable references behind. Restore still rejects malformed input graphs.
  if(section==='placements'||section==='evidence'){
   const entry=await t.get('thoughts',section==='placements'?row.entryId:row.ownerId);
   if(!entry||!await this.project(t,'entries',entry))return null;
  }
  if(['topics','sections'].includes(section))value=await this.s.safeOrganization(t,section==='topics'?'topic':'section',row);
  if(section==='completedLayouts'&&(row.kind!=='library_layout'||row.state!=='complete'))return null;
  if(section==='organizationState'){if(!backupMetaAllowed(row.id))return null;if(row.id.startsWith('memory:')){if(!validateMemoryRow(row))backupError('BACKUP_INVALID');if(row.kind==='topic'&&!await t.get('topics',row.topicId)||row.kind==='entry'&&(!await t.get('thoughts',row.entryId)||!await this.project(t,'entries',await t.get('thoughts',row.entryId)))||row.kind==='input'&&(!await t.get('inputStates',row.inputId)||!await t.get('blocks',row.inputId))||row.kind==='section'&&!await t.get('topics',row.topicId))return null;}if(row.id.startsWith('aiPresentation:')){
 const none=isBaseNoneEnvelope(row),evidence=new Set(row.evidenceEntryIds||[]);
 if((row.currentState==='none'||row.envelopeVersion!==undefined)&&!none)backupError('BACKUP_INVALID');
 if(!await t.get('topics',row.topicId)||!none&&(!evidence.size||!isStoredAIPresentation(row,evidence)))return null;
 for(const id of evidence){const entry=await t.get('thoughts',id);if(!entry||!await this.project(t,'entries',entry))return null;}
 if(row.candidate){const candidateEvidence=new Set(row.candidate.proposal?.evidenceEntryIds||[]),allowed=new Set([...evidence,...candidateEvidence]);let candidateSafe=validAIPresentationCandidate(row.candidate,allowed)&&row.candidate.proposal.topicId===row.topicId&&(none?row.candidate.baseKind==='none':row.candidate.baseKind!=='none');
  if(candidateSafe)for(const id of candidateEvidence){const entry=await t.get('thoughts',id);if(!entry||!await this.project(t,'entries',entry)){candidateSafe=false;break;}}
  if(!candidateSafe){row={...row};delete row.candidate;row.needsUpdate=true;}
 }
}const {recoveryPurgeRevision,...portable}=row;value={id:row.id,data:portable};}
  if(section==='relations'){
   const from=await t.get('thoughts',row.fromEntryId),to=await t.get('thoughts',row.toEntryId);
   if(!from||!to||!await this.project(t,'entries',from)||!await this.project(t,'entries',to))return null;
  }
  if(['evidence','dependencies','revisions','relations'].includes(section)&&!await this.s.sourcePresent(t,[...sourceIds(value)]))return null;
  if(section==='timeEvidence'&&await t.get('tombstones','source:'+row.id))return null;
  // Export explicit domain fields; transient indexes, caches, jobs and secrets
  // outside the suppression key are never selected from any database table.
  const item=normalize({type:'item',section,value:projectBackupEntity(section,value),...extra});validateBackupItem(item);return item;
 }
 async checkExportState(sessionId,state){if(this.exports.get(sessionId)!==state)backupError('BACKUP_SESSION_EXPIRED');await this.s.run(()=>this.s.repository.transaction(false,async t=>{if(((await t.get('meta','backup-data-generation'))?.value||0)!==state.generation)backupError('BACKUP_CHANGED');},['meta']));}
 async exportPage({sessionId,sequence}){const state=this.session(this.exports,sessionId);if(state.inflight){if(sequence===state.inflightSequence)return state.inflight;backupError('BACKUP_BUSY');}state.inflightSequence=sequence;state.inflight=this.exportChunk(sessionId,sequence,state).finally(()=>{state.inflight=null;});return state.inflight;}
 async exportChunk(sessionId,sequence,state){await this.checkExportState(sessionId,state);if(sequence===state.sequence-1&&state.lastPage)return state.lastPage;if(sequence!==state.sequence)backupError('BACKUP_INVALID');if(state.done)return {items:[],done:true};
  const result=await this.s.run(()=>this.s.repository.transaction(false,async t=>{if(((await t.get('meta','backup-data-generation'))?.value||0)!==state.generation)backupError('BACKUP_CHANGED');const items=[];let section=state.section,after=state.after,totalBytes=0;
   while(section<sections.length&&items.length<BACKUP_LIMITS.chunkItems){const name=sections[section];if(name==='settings'){items.push({type:'item',section:name,value:state.settings});section++;continue;}const page=await t.page(stores[name],{after:after??undefined,limit:BACKUP_LIMITS.chunkItems-items.length});for(const raw of page.rows){const item=await this.project(t,name,raw.value);if(item){const size=new TextEncoder().encode(JSON.stringify(item)).length;if(size>BACKUP_LIMITS.lineBytes)backupError('BACKUP_TOO_LARGE');if(items.length&&totalBytes+size>1024*1024)return {items,section,after};items.push(item);totalBytes+=size;}after=raw.key;}if(!page.next){section++;after=null;}}
   return {items,section,after};
  }));
  for(const item of result.items){state.hash=await backupHash(state.hash,item);state.count++;state.counts[item.section]++;}state.section=result.section;state.after=result.after;state.sequence++;state.done=result.section>=sections.length;if(state.done)result.items.push({type:'footer',itemCount:state.count,sectionCounts:state.counts,integrity:{algorithm:'SHA-256-chain',root:state.hash}});state.lastPage={items:result.items,done:state.done};await this.checkExportState(sessionId,state);return state.lastPage;
 }
}
