import {keyedHash} from '../thought-model.js';
import {clone,exact,plain,identifier,hash,count,fail,equal} from './value.js';
import {validatePortableHumanIdentity,portableHumanTopicIdentity,portableHumanSuppression} from './human-library-identity.js';
import {safeJSON} from '../backup-format.js';
// This required family is a typed description, not permission to write domain
// rows. Only a complete, revalidated named-owner plan may materialize it.
export const HUMAN_LIBRARY_TYPES=Object.freeze(['entry','topic','section','placement','history','suppression','keepSeparate']);
export const HUMAN_LIBRARY_KINDS=Object.freeze(['topic','topic-edit','section','section-edit','entry','entry-edit','entry-remove','entry-restore','placement','move','fixed','topic-lifecycle','keep']);
const all=(v,k)=>exact(v,k)&&Object.keys(v).length===k.length;
const fields={
 entry:'id storageSchema title thoughtText note family type formation origin revision contentRevision fieldRevisions organizationRevision dependencyRevision createdAt updatedAt createdSequence updatedSequence hasHumanAction userEdited protections authorship organizationIntents lifecycle freshness integrity staleReasons sourceRecordIds inputRefs topics types bodyBinding provenanceType lifecycleKey activeKey listKey negativeUpdatedSequence searchVersion thoughtEditedAt',
 topic:'id defaultSectionId name summary nameKey revision organizationRevision activeLayoutGeneration activeKey pinKey pinRank negativeUpdatedSequence lifecycle createdBy createdAt updatedAt countVersion protections authorship hasHumanAction userEdited identity searchVersion removalOperationId removedAt',
 section:'id topicId layoutGeneration sectionId isDefault title rank revision activeKey lifecycle protections authorship hasHumanAction userEdited searchVersion',
 placement:'id topicId layoutGeneration entryId sectionId rank sectionRank revision lifecycle activeKey membershipAuthorship sectionProtection orderProtection membershipOperationId excludedByUser removedWithTopicOperationId',
 history:'id kind entityId before after fieldMask actor reason important operationId baseRevision afterRevision sourceRecordIds entityKey documentId sequence at windowStartedAt listKey documentList',
 suppression:'id deletedEntryId lineageId removedAt operationId status scopeVersion scopeTokens evidenceVersionTokens noveltyRuleVersion signatureInput',
 keepSeparate:'id sourceId targetId actor revision scope at',
};
const forbidLocal=(value,depth=0)=>{if(depth>32)fail('BNS_HUMAN_CODEC_INVALID');if(!value||typeof value!=='object')return;for(const [key,item]of Object.entries(value)){if(['exactSignature','exactKey','nameToken','scopeToken','versionToken','recoveryPurgeRevision','recoveryGeneration','thought-suppression-key'].includes(key))fail('BNS_HUMAN_CODEC_INVALID');forbidLocal(item,depth+1);}};
export function validateHumanLibraryEntity(type,value){
 if(!HUMAN_LIBRARY_TYPES.includes(type)||!plain(value)||!identifier(value.id)||!exact(value,fields[type].split(' ')))fail('BNS_HUMAN_CODEC_INVALID');try{safeJSON(value);}catch{fail('BNS_HUMAN_CODEC_INVALID');}forbidLocal(value);
 if(type==='entry'&&(value.storageSchema!==2||value.bodyBinding!=='thought'||value.provenanceType!=='user_created'||value.origin!=='user'||typeof value.thoughtText!=='string'||!count(value.revision)||!Array.isArray(value.sourceRecordIds)||value.sourceRecordIds.length||!Array.isArray(value.inputRefs)||value.inputRefs.length||!['active','removed'].includes(value.lifecycle)))fail('BNS_HUMAN_CODEC_INVALID');
 if(type==='entry'&&(!count(value.createdSequence)||value.createdSequence<1||!count(value.updatedSequence)||value.updatedSequence<1||value.negativeUpdatedSequence!==-value.updatedSequence))fail('BNS_HUMAN_CODEC_INVALID');
 if(type==='topic'&&(!Number.isSafeInteger(value.negativeUpdatedSequence)||value.negativeUpdatedSequence>=0))fail('BNS_HUMAN_CODEC_INVALID');
 if(type==='history'&&(value.sequence<1||!equal(value.listKey,[value.entityKey,value.sequence])||!equal(value.documentList,[value.documentId,value.sequence])))fail('BNS_HUMAN_CODEC_INVALID');
 if(type==='topic'){if(value.createdBy!=='user'||typeof value.name!=='string'||!value.name.trim()||value.name.length>300||!count(value.revision)||!identifier(value.defaultSectionId)||!['active','removed'].includes(value.lifecycle))fail('BNS_HUMAN_CODEC_INVALID');validatePortableHumanIdentity(value.identity);}
 if(type==='section'&&(!identifier(value.topicId)||!identifier(value.sectionId)||!count(value.layoutGeneration)||!count(value.revision)||typeof value.title!=='string'||value.title.length>300||value.lifecycle!=='active'))fail('BNS_HUMAN_CODEC_INVALID');
 if(type==='placement'&&(!identifier(value.topicId)||!identifier(value.entryId)||!identifier(value.sectionId)||!count(value.layoutGeneration)||!count(value.revision)||!['active','removed'].includes(value.lifecycle)))fail('BNS_HUMAN_CODEC_INVALID');
 if(type==='history'&&(!['library_entry','topic','section','placement','membership_intent'].includes(value.kind)||!identifier(value.entityId)||!identifier(value.operationId)||value.actor!=='user'||!Array.isArray(value.fieldMask)||!value.fieldMask.length||!Array.isArray(value.sourceRecordIds)||value.sourceRecordIds.length||!count(value.sequence)||typeof value.important!=='boolean'||typeof value.at!=='string'||!Number.isFinite(Date.parse(value.at))))fail('BNS_HUMAN_CODEC_INVALID');
 if(type==='suppression'&&(!identifier(value.deletedEntryId)||value.lineageId!==value.deletedEntryId||!identifier(value.operationId)||!['active','restored'].includes(value.status)||value.scopeVersion!==1||value.noveltyRuleVersion!==1||!Array.isArray(value.scopeTokens)||value.scopeTokens.length||!Array.isArray(value.evidenceVersionTokens)||value.evidenceVersionTokens.length||!all(value.signatureInput,['body','type'])||typeof value.signatureInput.body!=='string'||typeof value.signatureInput.type!=='string'))fail('BNS_HUMAN_CODEC_INVALID');
 if(type==='keepSeparate'&&(!identifier(value.sourceId)||!identifier(value.targetId)||value.sourceId===value.targetId||value.actor!=='user'||value.revision!==1||value.scope!=='identity'||typeof value.at!=='string'||!Number.isFinite(Date.parse(value.at))))fail('BNS_HUMAN_CODEC_INVALID');return value;
}
export function validateHumanLibraryMember(v){
 if(!all(v,['id','entityType','logicalCommitId','datasetId','deviceId','domainOperationId','requestDigest','before','after'])||!HUMAN_LIBRARY_TYPES.includes(v.entityType)||![v.logicalCommitId,v.datasetId,v.deviceId,v.domainOperationId].every(identifier)||!hash(v.requestDigest)||!plain(v.after)||v.id!==v.entityType+':'+v.after.id)fail('BNS_HUMAN_CODEC_INVALID');validateHumanLibraryEntity(v.entityType,v.after);if(v.before!==null){validateHumanLibraryEntity(v.entityType,v.before);if(v.before.id!==v.after.id)fail('BNS_HUMAN_CODEC_INVALID');}return v;
}
export function validateHumanLibraryCommit(v){
 if(!all(v,['id','datasetId','deviceId','domainOperationId','requestDigest','kind','request','options','events','members'])||![v.id,v.datasetId,v.deviceId,v.domainOperationId].every(identifier)||!hash(v.requestDigest)||!HUMAN_LIBRARY_KINDS.includes(v.kind)||!plain(v.request)||!Array.isArray(v.events)||!Array.isArray(v.members)||!v.members.length||v.members.length>127)fail('BNS_HUMAN_CODEC_INVALID');
 if(!all(v.options,['restore','renameOnly'])||typeof v.options.restore!=='boolean'||typeof v.options.renameOnly!=='boolean'||v.options.restore&&v.kind!=='topic-lifecycle'||v.options.renameOnly&&v.kind!=='topic-edit')fail('BNS_HUMAN_CODEC_INVALID');
 for(const e of v.events)if(!all(e,['kind','value'])||typeof e.value!=='string'||!(e.kind==='uuid'?identifier(e.value):e.kind==='clock'&&Number.isFinite(Date.parse(e.value))))fail('BNS_HUMAN_CODEC_INVALID');
 for(const r of v.members)if(!all(r,['type','entityId','revisionId','operationId'])||r.type!=='humanLibraryMember'||!identifier(r.entityId)||!hash(r.revisionId)||!identifier(r.operationId))fail('BNS_HUMAN_CODEC_INVALID');if(new Set(v.members.map(r=>r.entityId)).size!==v.members.length||new Set(v.members.map(r=>r.revisionId)).size!==v.members.length||new Set(v.members.map(r=>r.operationId)).size!==v.members.length)fail('BNS_HUMAN_CODEC_INVALID');try{safeJSON(v.request);}catch{fail('BNS_HUMAN_CODEC_INVALID');}return v;
}

// Only representation changes: the actual named owner still determines every
// semantic field. No generic backup projection or metadata stripping is used.
export async function portableHumanEntity(type,row,histories,secret){
 if(row===null)return null;const value=clone(row);
 if(type==='entry'){if(value.exactSignature!==await keyedHash(secret,['body',value.type,value.thoughtText]))fail('BNS_HUMAN_IDENTITY_UNPROVEN');delete value.exactSignature;}
 if(type==='topic')value.identity=await portableHumanTopicIdentity(row,histories,secret);
 if(type==='history'&&value.kind==='topic'){for(const side of ['before','after'])if(value[side])value[side]={...value[side],identity:await portableHumanTopicIdentity(value[side],histories,secret)};}
 if(type==='suppression')return validateHumanLibraryEntity(type,await portableHumanSuppression(row,histories,secret));
 return validateHumanLibraryEntity(type,value);
}
