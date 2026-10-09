import {syncLibrary,emptyLibrary} from '../library.js';
import {defaults} from '../workspace.js';
import {readContextCards,CONTEXT_CARDS_ROW} from '../context-cards.js';
import {readPromptPreferences,PROMPT_REUSE_ROW,emptyPromptPreferences} from '../prompt-reuse-preferences.js';
import {backupMetaAllowed} from '../backup-format.js';
import {projectEntity} from './codecs.js';
import {clone,digest,equal,fail,count} from './value.js';
import {compileHumanScope,prepareHumanScopeProof,hasHumanScope,requireHumanScope} from './human-library-scope.js';
import {normalizePhysical} from './human-library-journal.js';
const sort=rows=>rows.sort((a,b)=>a.id.localeCompare(b.id));
const ephemeralStores=new Set(['recordIndex','blockIndex','sourceCounts','filterInputs','invalidations','librarySearchTerms','migrationBackup','operationReceipts']);
const represented=new Set(['records','times','documents','libraryDocuments','blocks','inputStates','revisions','filterIntents','meta']);
const counters=new Set(['thought-suppression-key','thought-sequence','revision-sequence','input-delta-sequence','thought-epoch']);
const readRows=async(t,name)=>{if(await t.count(name)>128)fail('BNS_GROUP_RESOURCE_LIMIT');return t.all(name);};
// Exact portable expectations compiled from admitted typed operations, not from
// arbitrary canonical metadata. Only each owner's named physical counters map.
export async function prepareGroupScope(plan,{store}={}){
 const maps=Object.fromEntries(['records','times','blocks','inputStates','revisions','filterIntents'].map(name=>[name,new Map()]));
 const context=new Map(),desired=new Map();let prompt=projectEntity('promptPreferences',emptyPromptPreferences());
 for(const group of plan.groups){
  if(group.type==='sourceBootstrapCommit'||group.type==='sourceAppendCommit')for(const op of group.prepared.members){const {entityType:type,entity:value}=op.value,name={source:'records',timeEvidence:'times',input:'blocks',inputState:'inputStates',baselineRevision:'revisions'}[type];if(name&&!(type==='timeEvidence'&&value.value===null))maps[name].set(value.id,clone(value));}
  else if(group.type==='inputWorkingCommit')for(const op of group.prepared.members){const {entityType:type,entity:value}=op.value;maps[{input:'blocks',inputState:'inputStates',revision:'revisions',filterIntent:'filterIntents'}[type]].set(value.id,clone(value));}
  else if(group.type!=='humanLibraryCommit'){const op=group.operations[0];if(group.type==='filterIntent')maps.filterIntents.set(op.entityId,clone(op.value));else if(group.type==='promptPreferences')prompt=clone(op.value);else if(group.type==='contextDesired')desired.set(op.entityId,clone(op.value));else context.set(op.entityId,clone(op.value));}
 }
 const human=plan.groups.some(group=>group.type==='humanLibraryCommit')?compileHumanScope(plan):null;if(human)for(const row of human.rows.history)maps.revisions.set(row.id,clone(row));
 const library={records:[...maps.records.values()],library:emptyLibrary()};syncLibrary(library);
 const documents=library.library.documents.map(row=>{const value={...row,titleRevision:0};delete value.sourceRecordIds;return value;});
 const expected=Object.fromEntries(Object.entries(maps).map(([name,map])=>[name,sort([...map.values()])]));
 expected.documents=sort(documents);expected.libraryDocuments=documents.map(({titleRevision,...row})=>row);
 expected.context=sort([...context.values()]);expected.desired=['info','rules','now','inputs'].map(id=>desired.get(id)||{id,enabled:false,revision:0});expected.prompt=prompt;
 if(human)expected.humanLibrary=human;
 const normalized=clone(expected);for(const row of normalized.inputStates)row.deltaSequence=0;for(const row of normalized.revisions){row.sequence=0;row.listKey=[row.entityKey,0];row.documentList=[row.documentId,0];}
 const families=[];for(const [type,value]of Object.entries(normalized)){const count=Array.isArray(value)?value.length:1;families.push({type,count,digest:await digest(value)});}
 const scope={expected:normalized,ownerScope:{version:1,profile:'bounded-admitted-local-owners',families:families.sort((a,b)=>a.type.localeCompare(b.type))}};if(human)await prepareHumanScopeProof(store,scope,human);return scope;
}
export async function requireGroupScope(store,t,scope){
 const c=await store.control(t);
 if(!equal(c.preferences,defaults())||!equal(c.memoryAccessPolicy,{enabled:false,status:'disabled'})||c.classificationRules.length||c.filterRules.length)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 const human=hasHumanScope(scope)?await requireHumanScope(store,t,scope):null,humanStores=new Set(['thoughts','topics','sections','placements','thoughtSuppressions','libraryMigrationItems']);
 for(const name of t.tx.objectStoreNames)if(!represented.has(name)&&!ephemeralStores.has(name)&&!(human&&humanStores.has(name))&&await t.count(name))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 // Only key bounded metadata inspection. Never export arbitrary meta/body rows.
 const keys=await new Promise((resolve,reject)=>{const out=[],r=t.tx.objectStore('meta').openKeyCursor();r.onerror=()=>reject(r.error);r.onsuccess=()=>{const cursor=r.result;if(!cursor)return resolve(out);if(out.length===10000)return reject(Object.assign(new Error('BNS_GROUP_RESOURCE_LIMIT'),{code:'BNS_GROUP_RESOURCE_LIMIT'}));out.push(cursor.key);cursor.continue();};});
 for(const key of keys){
  if(human?.allowed.has(key))continue;
  if(key===CONTEXT_CARDS_ROW||key===PROMPT_REUSE_ROW||counters.has(key))continue;
  if(key==='smart-filter'){const row=await t.get('meta',key);if(row.mode!=='light'||row.policyEpoch!==0)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');continue;}
  if(backupMetaAllowed(key))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 }
 const actual={};for(const name of ['records','blocks','documents','libraryDocuments'])actual[name]=sort((await readRows(t,name)).map(row=>row.value));
 for(const name of ['times','inputStates','revisions','filterIntents'])actual[name]=sort(await readRows(t,name));
 for(const row of actual.inputStates){if(!count(row.deltaSequence)||row.deltaSequence<1)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');row.deltaSequence=0;}
 for(const row of actual.revisions){if(!count(row.sequence)||row.sequence<1||!equal(row.listKey,[row.entityKey,row.sequence])||!equal(row.documentList,[row.documentId,row.sequence]))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');row.sequence=0;row.listKey=[row.entityKey,0];row.documentList=[row.documentId,0];}
 const context=await readContextCards(t);actual.context=sort(context.items);actual.desired=['info','rules','now','inputs'].map(id=>({id,...context.access[id]}));
 actual.prompt=projectEntity('promptPreferences',await readPromptPreferences(t));
 const expected=clone(scope.expected);if(human){const ids=new Set(human.history.map(row=>row.id));actual.revisions=actual.revisions.map(row=>ids.has(row.id)?normalizePhysical('history',row):row);expected.revisions=sort([...expected.revisions.filter(row=>!ids.has(row.id)),...human.history]);delete expected.humanLibrary;const revisions=await t.all('revisions'),sequence=await t.get('meta','revision-sequence');if((sequence?.value||0)!==Math.max(0,...revisions.map(row=>row.sequence)))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');}
 if(!equal(actual,expected))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 return true;
}
