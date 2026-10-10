import {assertSourceWorkingCanonicalAndProtocolRows} from './source-working-canonical.js';
import {assertSourceWorkingSpecialScalars} from './source-working-derived.js';
import {defaults} from '../workspace.js';
import {CONSENT_VERSION} from '../constants.js';
import {FILTER_VERSIONS} from '../smart-filter.js';
import {REVISION_POLICY} from '../ia-store.js';
import {deltaDescription,deltaSignature,KNOWN_PREFIX,DIRTY_PREFIX,DELTA_COUNTER} from '../ai-usage/delta.js';
import {equal,exact,hash,count,opaque,fail} from './value.js';

const refuse=()=>fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
// Selected initial Source/Working profile only. The original native owner must
// authenticate rows/control/databaseId and pay all original builder/Map/equality
// frames. This pure complete inventory check creates no read or export grant.
export function assertSourceWorkingDefaultMeta(core,scope,plan,rows,control,databaseId){
 if(arguments.length!==6)refuse();assertSourceWorkingCanonicalAndProtocolRows(core,scope,plan,rows);
 assertSourceWorkingSpecialScalars('meta',control);
 if(!equal(control.preferences,defaults())||!equal(control.memoryAccessPolicy,{enabled:false,status:'disabled'})||!Array.isArray(control.classificationRules)||control.classificationRules.length||!Array.isArray(control.filterRules)||control.filterRules.length)refuse();
 const settings=control.settings;if(!exact(settings,['consentVersion','consentAt','enabled','epoch'])||settings.consentVersion!==CONSENT_VERSION||settings.enabled!==true||!iso(settings.consentAt)||!count(settings.epoch)||settings.epoch<1||!opaque(databaseId))refuse();
 const meta=new Map(rows.meta.map(row=>[row.id,row])),admitted=new Set(),working=plan.groups.filter(group=>group.type==='inputWorkingCommit').length;
 const take=(id,expected)=>{if(!equal(meta.get(id),{id,...expected}))refuse();admitted.add(id);};
 const read=id=>{const row=meta.get(id);if(!row)refuse();return row;};
 take('sequence',{records:1,blocks:1,documents:1});take('gate',{epoch:settings.epoch,enabled:true});
 const migration=read('migration');if(!hash(migration.digest))refuse();take('migration',{phase:'active',databaseId,cursor:0,digest:migration.digest,verified:true,recoveryVerified:true,recordCount:0,blockCount:0});
 const ddl=read('thought-ddl');if(!count(ddl.fromVersion)||ddl.fromVersion>5)refuse();take('thought-ddl',{fromVersion:ddl.fromVersion,toVersion:5});
 const ia=read('ia-migration');if(!iso(ia.startedAt)||!iso(ia.completedAt))refuse();take('ia-migration',{phase:'active',cursor:null,count:0,version:1,startedAt:ia.startedAt,verified:true,completedAt:ia.completedAt,policy:REVISION_POLICY});
 const filter=read('smart-filter');if(!iso(filter.completedAt))refuse();take('smart-filter',{phase:'active',migrationVersion:1,cursor:null,mapped:0,legacyCount:0,mode:'light',noticePending:false,decisionSequence:0,policyEpoch:0,...FILTER_VERSIONS,verified:true,diagnosticsVersion:1,taskState:'idle',completedAt:filter.completedAt});
 take('thought-binding:v1',{version:1,cursor:null,complete:true,input:0,thought:0});take('thought-reverse-edit:v1',{version:1,enabled:false});
 const library=read('thought-library');if(!count(library.fromVersion)||library.fromVersion>5||!iso(library.startedAt)||!iso(library.completedAt))refuse();take('thought-library',{schemaVersion:1,migrationVersion:1,fromVersion:library.fromVersion,targetVersion:5,phase:'active',cursor:null,mapped:0,quarantined:0,sealed:0,startedAt:library.startedAt,libraryActivation:'ready',verified:true,completedAt:library.completedAt});
 const compat=read('library-documents-compat-v2');if(!iso(compat.completedAt))refuse();take('library-documents-compat-v2',{cursor:null,complete:true,activeTopics:0,repairedTopics:0,repairedIndexTopics:0,repairedGenerationTopics:0,repairedDefaultSections:0,unresolvedLayouts:0,indexedActiveTopics:0,indexGap:0,completedAt:compat.completedAt});
 const secret=read('thought-suppression-key');if(!Array.isArray(secret.value)||secret.value.length!==32||secret.value.some(value=>!Number.isInteger(value)||value<0||value>255))refuse();take('thought-suppression-key',{value:secret.value});
 take('thought-epoch',{value:working});take('input-delta-sequence',{value:working+1});take('revision-sequence',{value:rows.revisions.length});take(DELTA_COUNTER,{value:working+1});
 const generation=read('backup-data-generation');if(!count(generation.value)||generation.value<working+1)refuse();take('backup-data-generation',{value:generation.value});
 const descriptor=deltaDescription('inputStates',rows.inputStates[0]);if(!descriptor)refuse();const signature=deltaSignature(descriptor),sequence=working+1;
 take(KNOWN_PREFIX+descriptor.key,{version:1,descriptor,signature,sequence});take(DIRTY_PREFIX+descriptor.key,{version:1,descriptor,signature,sequence,requirements:[],pendingFacets:['topic','context']});
 // The preceding canonical checker individually checked every original protocol
 // ID, including full operations/receipt/head/history and foreign namespaces.
 // No unvalidated protocol prefix or arbitrary local key is exempted here.
 for(const row of rows.meta)if(!admitted.has(row.id)&&!row.id.startsWith('bns:'))refuse();
}
