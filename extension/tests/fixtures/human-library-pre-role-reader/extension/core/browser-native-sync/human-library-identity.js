import {keyedHash,validateFields} from '../thought-model.js';
import {clone,exact,equal,identifier,count,hash,fail} from './value.js';
const tokenFor=(secret,name)=>keyedHash(secret,['personal-topic-name-v1',String(name).normalize('NFKC').toLocaleLowerCase().trim()]);
const stamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const nameOK=value=>typeof value==='string'&&!!value.trim()&&value.length<=300;
export function validatePortableHumanIdentity(value){
 if(!exact(value,['version','revision','origin','scope','aliases','legacy','noRecreation','lifecycleIntent'])||value.version!==1||!count(value.revision)||value.origin!=='user'||value.scope!==null||value.legacy!==false||typeof value.noRecreation!=='boolean'||!Array.isArray(value.aliases)||value.aliases.length>128)fail('BNS_HUMAN_IDENTITY_UNSUPPORTED');
 for(const alias of value.aliases)if(!exact(alias,['name','actor','revision','operationId','at'])||Object.keys(alias).length!==5||!nameOK(alias.name)||alias.actor!=='user'||!count(alias.revision)||!identifier(alias.operationId)||!stamp(alias.at))fail('BNS_HUMAN_IDENTITY_UNSUPPORTED');
 if(value.lifecycleIntent!==undefined){const x=value.lifecycleIntent;if(!exact(x,['actor','operationId','at','previous','to'])||Object.keys(x).length!==5||x.actor!=='user'||!identifier(x.operationId)||!stamp(x.at)||!['active','removed','dormant'].includes(x.previous)||!['active','removed','dormant'].includes(x.to))fail('BNS_HUMAN_IDENTITY_UNSUPPORTED');}
 return clone(value);
}
// Explicit history-backed aliases only; neither sender tokens nor a guessed
// current label can stand in for an erased historical name.
export async function portableHumanTopicIdentity(topic,histories,secret){
 const source=topic.identity;if(!source||topic.createdBy!=='user'||topic.redirectTo||source.legacy||source.scope!==null||!nameOK(topic.name)||!Array.isArray(histories)||histories.length>128||!Array.isArray(source.aliases)||source.aliases.length>128)fail('BNS_HUMAN_IDENTITY_UNSUPPORTED');
 if(source.nameToken!==await tokenFor(secret,topic.name))fail('BNS_HUMAN_IDENTITY_UNPROVEN');const aliases=[];
 for(const alias of source.aliases){if(!exact(alias,['token','actor','revision','operationId','at'])||Object.keys(alias).length!==5||!hash(alias.token)||alias.actor!=='user'||!count(alias.revision)||!identifier(alias.operationId)||!stamp(alias.at))fail('BNS_HUMAN_IDENTITY_UNPROVEN');let proven=null;
  for(const history of histories){if(history.kind!=='topic'||history.entityId!==topic.id||history.actor!=='user'||history.operationId!==alias.operationId||!history.fieldMask?.includes('name')||history.before?.revision!==alias.revision||!history.after?.identity?.aliases?.some(x=>equal(x,alias)))continue;const name=history.before.name;if(nameOK(name)&&await tokenFor(secret,name)===alias.token){if(proven!==null&&proven!==name)fail('BNS_HUMAN_IDENTITY_UNPROVEN');proven=name;}}
  if(proven===null)fail('BNS_HUMAN_IDENTITY_UNPROVEN');const {token,...metadata}=alias;aliases.push({...metadata,name:proven});
 }
 const {nameToken,...portable}=source;return validatePortableHumanIdentity({...portable,aliases});
}
export async function localHumanTopicIdentity(name,portable,secret){
 if(!nameOK(name))fail('BNS_HUMAN_IDENTITY_UNSUPPORTED');const value=validatePortableHumanIdentity(portable),aliases=[],names=[name],tokens=[await tokenFor(secret,name)];
 for(const alias of value.aliases){const {name:prior,...metadata}=alias,token=await tokenFor(secret,prior);if(aliases.some(x=>x.token===token))fail('BNS_HUMAN_IDENTITY_UNPROVEN');aliases.push({...metadata,token});names.push(prior);tokens.push(token);}
 return {identity:{...value,nameToken:tokens[0],aliases},names,tokens};
}

// Suppression signatures are installation-keyed. Carry the exact original
// removal's proven body/type, never infer them from a later edited Entry.
export async function portableHumanSuppression(row,histories,secret){
 validateHumanSuppression(row);if(!Array.isArray(histories)||histories.length>128)fail('BNS_HUMAN_SUPPRESSION_UNSUPPORTED');
 const candidates=histories.filter(h=>h.kind==='library_entry'&&h.entityId===row.deletedEntryId&&h.operationId===row.operationId&&h.actor==='user'&&h.reason==='remove'&&h.important===true&&h.after?.lifecycle==='removed'&&Array.isArray(h.sourceRecordIds)&&h.sourceRecordIds.length===0&&typeof h.before?.body==='string'&&typeof h.before?.type==='string');let input=null;
 for(const h of candidates){const candidate={body:h.before.body,type:h.before.type};if(await keyedHash(secret,['body',candidate.type,candidate.body])!==row.exactSignature)continue;if(input&&!equal(input,candidate))fail('BNS_HUMAN_SUPPRESSION_UNPROVEN');input=candidate;}
 if(!input)fail('BNS_HUMAN_SUPPRESSION_UNPROVEN');const {exactSignature,...portable}=clone(row);return {...portable,signatureInput:input};
}
export async function localHumanSuppression(portable,secret){
 if(!exact(portable,['id','deletedEntryId','lineageId','removedAt','operationId','status','scopeVersion','scopeTokens','evidenceVersionTokens','noveltyRuleVersion','signatureInput'])||!exact(portable.signatureInput,['body','type'])||Object.keys(portable.signatureInput).length!==2||typeof portable.signatureInput.body!=='string'||typeof portable.signatureInput.type!=='string')fail('BNS_HUMAN_SUPPRESSION_UNSUPPORTED');
 const {signatureInput,...row}=clone(portable);try{validateFields(signatureInput);}catch{fail('BNS_HUMAN_SUPPRESSION_UNSUPPORTED');}const mapped={...row,exactSignature:await keyedHash(secret,['body',signatureInput.type,signatureInput.body])};validateHumanSuppression(mapped);return mapped;
}

function validateHumanSuppression(row){
 if(!exact(row,['id','deletedEntryId','lineageId','removedAt','operationId','status','scopeVersion','scopeTokens','evidenceVersionTokens','exactSignature','noveltyRuleVersion'])||![row.id,row.deletedEntryId,row.lineageId,row.operationId].every(identifier)||row.lineageId!==row.deletedEntryId||!stamp(row.removedAt)||!['active','restored'].includes(row.status)||row.scopeVersion!==1||row.noveltyRuleVersion!==1||!Array.isArray(row.scopeTokens)||row.scopeTokens.length||!Array.isArray(row.evidenceVersionTokens)||row.evidenceVersionTokens.length||!hash(row.exactSignature))fail('BNS_HUMAN_SUPPRESSION_UNSUPPORTED');
}
