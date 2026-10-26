import {validateSourceAppendMember,validateSourceAppendCommit} from './source-append-codec.js';
import {validateSourceBootstrapMember,validateSourceBootstrapCommit} from './source-bootstrap-codec.js';
import {BACKUP_SECTIONS,projectBackupEntity,validateBackupItem} from '../backup-format.js';
import {validContextCards,CONTEXT_CARDS_ROW} from '../context-cards.js';
import {validPromptPreferences,PROMPT_REUSE_ROW} from '../prompt-reuse-preferences.js';
import {validateSourceStructureBackupRow,sourceStructureMetaAllowed} from '../source-structure-backup.js';
import {validTopicNameRegistry} from '../topic-identity-backup.js';
import {identify} from '../dedupe.js';
import {sourceIdentityChat,validPortableSourceRecord} from '../import/contract.js';
import {canonical,clone,count,exact,fail,hash,identifier,plain} from './value.js';

// The historical Backup allowlist remains unchanged. Each shared field list
// below is an explicitly reviewed entity codec, not permission to export stores
// or arbitrary meta rows. Coverage and writer readiness are separate facts.
const domain={
 source:['sources','records'],input:['inputs','blocks'],inputState:['inputStates','inputStates'],
 inputRemoval:['removals','inputRemovals'],timeEvidence:['timeEvidence','times'],
 filterIntent:['filterIntents','filterIntents'],topic:['topics','topics'],
 section:['sections','sections'],placement:['placements','placements'],
 revision:['revisions','revisions'],suppression:['suppressions','thoughtSuppressions'],
 relation:['relations','entryRelations'],provenance:['evidence','provenance'],dependency:['dependencies','dependencies'],
};
const spec=(type,validate,extra={})=>Object.freeze({type,version:1,validate,...extra});
const entries=Object.entries(domain).map(([type,[section,store]])=>[type,spec(type,value=>{
 validateBackupItem({type:'item',section,value,order:0});
 if(type==='topic'&&value.lifecycle==='candidate')fail('BNS_DERIVED_EXCLUDED');
 if(type==='source'&&typeof value.originalText!=='string')fail('BNS_CODEC_INVALID');
 return value;
},{section,store,immutable:type==='source'})]);
const contextItemFor=card=>value=>{
 if(!exact(value,['id','card','body','section','revision','order','origin','protected','userEdited','lifecycle','createdAt','updatedAt','deletedBy'])||value.card!==card||value.origin!=='manual'||value.protected!==true||value.userEdited!==true)fail('BNS_CODEC_UNSUPPORTED');
 const emptyAccess=Object.fromEntries(['global','info','rules','now','inputs'].map(key=>[key,{enabled:false,revision:0}]));
 if(!validContextCards({id:CONTEXT_CARDS_ROW,version:1,sequence:(value.order||0)+1,access:emptyAccess,items:[value]}))fail('BNS_CODEC_INVALID');
 return value;
};
const prompt=value=>{
 if(!exact(value,['id','version','pins','overrides','splits'])||value.id!==PROMPT_REUSE_ROW||!Array.isArray(value.overrides)||value.overrides.some(x=>!exact(x,['id','text','representative','hidden'])))fail('BNS_CODEC_INVALID');
 if(!validPromptPreferences({...value,revision:0,overrides:value.overrides.map(x=>({...x,reuseCount:0}))}))fail('BNS_CODEC_INVALID');
 return value;
};
entries.push(
 ['contextItem',spec('contextItem',contextItemFor('info'),{store:'meta',owner:'context-cards:v1'})],
 ['contextRulesItem',spec('contextRulesItem',contextItemFor('rules'),{store:'meta',owner:'context-cards:v1'})],
 ['contextNowItem',spec('contextNowItem',contextItemFor('now'),{store:'meta',owner:'context-cards:v1'})],
 ['contextDesired',spec('contextDesired',value=>{
  if(!exact(value,['id','enabled','revision'])||!['info','rules','now','inputs'].includes(value.id)||typeof value.enabled!=='boolean'||!count(value.revision))fail('BNS_CODEC_INVALID');return value;
 },{store:'meta',owner:'context-cards:v1'})],
 ['promptPreferences',spec('promptPreferences',prompt,{store:'meta',owner:PROMPT_REUSE_ROW})],
 ['sourceStructure',spec('sourceStructure',value=>{validateSourceStructureBackupRow(value);return value;},{store:'meta'})],
 ['topicName',spec('topicName',value=>{if(!validTopicNameRegistry(value))fail('BNS_CODEC_INVALID');return value;},{store:'meta'})],
 ['consumerPreference',spec('consumerPreference',value=>{
  if(!exact(value,['id','value','explicit'])||!['language','appearance','fontSize','readingWidth','timeDisplay','timeEmphasis','smartFilter'].includes(value.id)||value.explicit!==true||typeof value.value!=='string'||value.value.length>100)fail('BNS_CODEC_INVALID');return value;
 },{store:'meta',owner:'control'})],
 ['inputDocument',spec('inputDocument',value=>{
  if(!exact(value,['id','source','working'])||value.source?.id!==value.id||value.working?.id!==value.id)fail('BNS_CODEC_INVALID');
  validateBackupItem({type:'item',section:'inputDocuments',value:value.source,working:value.working,order:0});return value;
 },{store:'documents'})],
 ['thought',spec('thought',value=>{
  // Shared Input text travels once, under the Input codec. The binding carries
  // exact identity/revision/length. Unknown legacy bindings stay blocked.
  if(!['input','thought'].includes(value.bodyBinding))fail('BNS_BODY_BINDING_UNPROVEN');
  if(value.bodyBinding==='input'&&Object.hasOwn(value,'body'))fail('BNS_SHARED_BODY_DUPLICATE');
  validateBackupItem({type:'item',section:'entries',value:value.bodyBinding==='input'?{...value,body:''}:value});return value;
 },{store:'thoughts'})],
 ['deletionFence',spec('deletionFence',value=>{
  if(!exact(value,['id','targets','reason'])||!identifier(value.id)||!Array.isArray(value.targets)||!value.targets.length||value.targets.length>512||value.targets.some(x=>!exact(x,['type','id'])||!identifier(x.id)||!Object.hasOwn(CODECS,x.type))||value.reason!=='permanent')fail('BNS_CODEC_INVALID');return value;
 },{store:'tombstones'})],
);
// Candidate mappings are an inventory, not admitted codecs. Structural graphs,
// ownership and per-family migration must be proven before promoting each one.
// In particular Backup item validation alone is not graph validation.
export const CANDIDATE_CODECS=Object.freeze(Object.fromEntries(entries));
const sourceFields=['id','platform','chatId','chatUrl','sourceMessageId','originalText','contentHash','sourceKey','dedupeKey','previousVersionId'];
const sourceCodec=spec('source',value=>{
 if(!exact(value,sourceFields)||!['chatgpt'].includes(value.platform)||!identifier(value.chatId)||!identifier(value.sourceMessageId)||typeof value.originalText!=='string'||!validPortableSourceRecord(value)||!hash(value.contentHash)||!hash(value.sourceKey)||!hash(value.dedupeKey)||(value.previousVersionId!==null&&!identifier(value.previousVersionId)))fail('BNS_CODEC_INVALID');
 return value;
},{store:'records',immutable:true});
const filterIntentCodec=spec('filterIntent',value=>{
 if(!exact(value,['id','keep','reason','at'])||Object.keys(value).length!==4||!hash(value.id)||value.keep!==true||!['restored_from_filter','user_edit'].includes(value.reason)||typeof value.at!=='string'||!Number.isFinite(Date.parse(value.at))||new Date(value.at).toISOString()!==value.at)fail('BNS_CODEC_UNSUPPORTED');return value;
},{store:'filterIntents'});
// The first Working publication slice admits only existing active Input history.
// Generic backup revision envelopes are too broad for an independently admitted wire entity.
const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const inputSnapshot=value=>exact(value,['libraryText','note','excluded','originalTextReference','provenanceSignature'])&&Object.keys(value).length===5&&(value.libraryText===null||typeof value.libraryText==='string')&&typeof value.note==='string'&&value.excluded===false&&identifier(value.originalTextReference)&&typeof value.provenanceSignature==='string';
const workingRevisionCodec=spec('revision',value=>{
 if(!exact(value,['id','kind','entityId','documentId','before','after','reason','important','sourceRecordIds','entityKey','sequence','windowStartedAt','at','listKey','documentList'])||Object.keys(value).length!==15||!identifier(value.id)||value.kind!=='input'||!identifier(value.entityId)||!identifier(value.documentId)||!inputSnapshot(value.before)||!inputSnapshot(value.after)||!['baseline','edit','major_edit'].includes(value.reason)||value.important!==(value.reason!=='edit')||!Array.isArray(value.sourceRecordIds)||!value.sourceRecordIds.length||value.sourceRecordIds.length>16||value.sourceRecordIds.some(id=>!identifier(id))||new Set(value.sourceRecordIds).size!==value.sourceRecordIds.length||value.entityKey!=='input:'+value.entityId||!count(value.sequence)||value.sequence<1||!iso(value.windowStartedAt)||!iso(value.at)||JSON.stringify(value.listKey)!==JSON.stringify([value.entityKey,value.sequence])||JSON.stringify(value.documentList)!==JSON.stringify([value.documentId,value.sequence]))fail('BNS_CODEC_UNSUPPORTED');return value;
},{store:'revisions'});
const workingTypes=['input','inputState','revision','filterIntent'];
const memberCodec=spec('inputWorkingMember',value=>{
 if(!exact(value,['id','logicalCommitId','datasetId','deviceId','entityType','entity'])||Object.keys(value).length!==6||!identifier(value.logicalCommitId)||!identifier(value.datasetId)||!identifier(value.deviceId)||!workingTypes.includes(value.entityType)||value.id!==value.entityType+':'+value.entity?.id)fail('BNS_CODEC_INVALID');
 validateEntity(value.entityType,value.entity);return value;
},{store:'meta'});
const commitCodec=spec('inputWorkingCommit',value=>{
 if(!exact(value,['id','version','inputId','documentId','datasetId','deviceId','members','sourceRefs'])||Object.keys(value).length!==8||value.version!==1||![value.id,value.inputId,value.documentId,value.datasetId,value.deviceId].every(identifier)||!Array.isArray(value.members)||value.members.length<4||value.members.length>127)fail('BNS_CODEC_INVALID');
 if(!Array.isArray(value.sourceRefs)||!value.sourceRefs.length||value.sourceRefs.length>16||value.sourceRefs.some(x=>!exact(x,['id','sourceKey','dedupeKey','contentHash'])||Object.keys(x).length!==4||!identifier(x.id)||![x.sourceKey,x.dedupeKey,x.contentHash].every(hash))||new Set(value.sourceRefs.map(x=>x.id)).size!==value.sourceRefs.length)fail('BNS_CODEC_INVALID');
 const seen=new Set();for(const ref of value.members){if(!exact(ref,['type','entityId','revisionId'])||Object.keys(ref).length!==3||ref.type!=='inputWorkingMember'||!identifier(ref.entityId)||!hash(ref.revisionId)||seen.has(ref.entityId))fail('BNS_CODEC_INVALID');seen.add(ref.entityId);}return value;
},{store:'meta'});
export const CODECS=Object.freeze({sourceAppendMember:spec('sourceAppendMember',validateSourceAppendMember),sourceAppendCommit:spec('sourceAppendCommit',validateSourceAppendCommit),sourceBootstrapMember:spec('sourceBootstrapMember',validateSourceBootstrapMember),sourceBootstrapCommit:spec('sourceBootstrapCommit',validateSourceBootstrapCommit),inputWorkingMember:memberCodec,inputWorkingCommit:commitCodec,source:sourceCodec,filterIntent:filterIntentCodec,revision:workingRevisionCodec,...Object.fromEntries(entries.filter(([type])=>['input','inputState'].includes(type))),...Object.fromEntries(entries.filter(([type])=>['contextItem','contextRulesItem','contextNowItem','contextDesired','promptPreferences'].includes(type)))});
export function validateEntity(type,value,version=1){
 const codec=Object.hasOwn(CODECS,type)?CODECS[type]:null;if(!codec||version!==codec.version)fail('BNS_CODEC_UNSUPPORTED');
 canonical(value);
 if(!plain(value)||!identifier(value.id))fail('BNS_CODEC_INVALID');
 try{codec.validate(value);}catch(error){if(error.code?.startsWith('BNS_'))throw error;fail('BNS_CODEC_INVALID');}
 return clone(value);
}
export async function validateEntityAsync(type,value,version=1){
 validateEntity(type,value,version);
 if(type==='source'){
  const expected=await identify(sourceIdentityChat(value.platform,value.chatId),value.sourceMessageId,value.originalText);
  if(['contentHash','sourceKey','dedupeKey'].some(key=>value[key]!==expected[key]))fail('BNS_SOURCE_DIGEST');
 }
 return value;
}
export function projectEntity(type,row){
 let value;
 if(type==='source'){const source=row.value||row;value=Object.fromEntries(sourceFields.map(key=>[key,source[key]]));}
 else if(domain[type]){const [section]=domain[type];value=projectBackupEntity(section,['source','input'].includes(type)?row.value:row);}
 else if(type==='thought'){
  if(!['input','thought'].includes(row.bodyBinding))fail('BNS_BODY_BINDING_UNPROVEN');
  value=projectBackupEntity('entries',{...row,body:row.thoughtText});if(row.bodyBinding==='input')delete value.body;
 }else if(type==='promptPreferences'){
  const {revision,...portable}=clone(row);
  value={...portable,overrides:row.overrides.filter(x=>x.text!==undefined||x.representative!==undefined||x.hidden||row.pins.includes(x.id)).map(({reuseCount,...item})=>item)};
 }
 else value=clone(row);
 return validateEntity(type,value);
}
export function validateCoverage(coverage,supported=Object.fromEntries(Object.entries(CODECS).map(([key,c])=>[key,c.version]))){
 if(!Array.isArray(coverage)||coverage.length>128||new Set(coverage.map(x=>x.type)).size!==coverage.length)fail('BNS_COVERAGE_INVALID');
 for(const item of coverage)if(!exact(item,['type','version','count'])||!count(item.count)||!count(item.version)||item.version<1||item.count>0&&supported[item.type]!==item.version)fail('BNS_REQUIRED_CODEC_UNSUPPORTED');
 return true;
}
export const CODEC_COVERAGE=Object.freeze({
 version:1,sourceBase:'4a3cb4e663d8ae745f8385c5c854d5b060e26309',
 implemented:Object.freeze(Object.fromEntries(Object.entries(CODECS).map(([key,value])=>[key,value.version]))),
 notYetRepresented:Object.freeze(['source-user-intent-and-facts','working-input','independent-thought','topic-section-placement-graph','revision-legacy-ownership','protected-ai-artifacts','topic-keep-separate','context-rules-now-automatic','context-topic-desired','prompt-normalizer-rebinding','consumer-preference-explicitness-and-dual-store-atomicity','legacy-unknown-body-binding']),
 excluded:Object.freeze(['credentials','effective-external-grants','global-context-acknowledgement','context-operation-receipts','processing-authority','recovery-drafts','search-indexes','hidden-topic-candidates','prompt-use-ranking','device-ui-geometry']),
 productionActivation:false,
});
export {sourceStructureMetaAllowed};
