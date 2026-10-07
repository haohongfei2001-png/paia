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
const contextItem=value=>{
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
 ['contextItem',spec('contextItem',contextItem,{store:'meta',owner:'context-cards:v1'})],
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
export const CODECS=Object.freeze({source:sourceCodec,...Object.fromEntries(entries.filter(([type])=>['contextItem','contextDesired','promptPreferences'].includes(type)))});
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
