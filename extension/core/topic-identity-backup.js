// Strict, body-free Personal Topic metadata contract for the existing restore
// boundary. This does not enable backup generation or any external access.
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const only=(x,keys)=>plain(x)&&Object.keys(x).every(k=>keys.includes(k));
const revision=x=>Number.isSafeInteger(x)&&x>=0;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=200;
const token=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const actor=x=>['user','ai','unknown'].includes(x);
const ids=x=>Array.isArray(x)&&x.every(id)&&new Set(x).size===x.length;
const event=x=>id(x.operationId)&&typeof x.at==='string'&&Number.isFinite(Date.parse(x.at));
export const topicIdentityMetaAllowed=id=>typeof id==='string'&&/^personalTopicName:[a-f0-9]{64}$/.test(id);
export function validTopicIdentity(value){
 if(!only(value,['version','revision','origin','scope','aliases','legacy','noRecreation','nameToken','lifecycleIntent'])||value.version!==1||!revision(value.revision)||!actor(value.origin)||value.scope!==null||!Array.isArray(value.aliases)||typeof value.legacy!=='boolean'||typeof value.noRecreation!=='boolean'||value.nameToken!==undefined&&!token(value.nameToken))return false;
 if(!value.aliases.every(x=>only(x,['token','actor','revision','operationId','at'])&&token(x.token)&&actor(x.actor)&&revision(x.revision)&&event(x))||new Set(value.aliases.map(x=>x.token)).size!==value.aliases.length)return false;
 const intent=value.lifecycleIntent;
 return intent===undefined||only(intent,['actor','operationId','at','previous','to'])&&['user','ai'].includes(intent.actor)&&event(intent)&&['candidate','active','dormant','merged','removed'].includes(intent.to)&&(intent.previous===undefined||['candidate','active','dormant','merged','removed'].includes(intent.previous));
}
export function validTopicNameRegistry(row){return only(row,['id','version','topicIds'])&&topicIdentityMetaAllowed(row.id)&&row.version===1&&ids(row.topicIds)&&row.topicIds.length>0;}
export function validOrganizationIntents(value){
 if(value?.version===undefined)return true; // Existing pre-PT payload remains intact.
 if(!only(value,['version','included','excluded','edges','fixed','legacyProtected'])||value.version!==1||!ids(value.included)||!ids(value.excluded)||value.included.some(x=>value.excluded.includes(x))||!plain(value.edges)||value.legacyProtected!==undefined&&typeof value.legacyProtected!=='boolean')return false;
 for(const [topicId,edge]of Object.entries(value.edges))if(!id(topicId)||!only(edge,['actor','include','operationId','at','reason','revision'])||edge.actor!=='user'||typeof edge.include!=='boolean'||!event(edge)||!revision(edge.revision)||!['user_edit','restore','delete'].includes(edge.reason)||!value[edge.include?'included':'excluded'].includes(topicId))return false;
 const fixed=value.fixed;return fixed===null||only(fixed,['topicIds','actor','operationId','revision','at'])&&ids(fixed.topicIds)&&fixed.actor==='user'&&revision(fixed.revision)&&event(fixed);
}
export function validateTopicIdentityGraph(bySection,required){
 const topics=bySection.topics,meta=bySection.organizationState;
 const canonical=id=>{const seen=new Set();for(let n=0;n<32;n++){required(topics.has(id)&&!seen.has(id));seen.add(id);const row=topics.get(id).value;if(!row.redirectTo)return id;id=row.redirectTo;}required(false);};
 let hasTokens=false;
 for(const {value:row}of topics.values())if(row.identity!==undefined){
  required(validTopicIdentity(row.identity));required(row.identity.noRecreation===(['removed','merged'].includes(row.lifecycle)||!!row.redirectTo));
  for(const token of [...row.identity.aliases.map(x=>x.token),...(row.identity.nameToken?[row.identity.nameToken]:[])]){hasTokens=true;required(meta.get('personalTopicName:'+token)?.value.data.topicIds.includes(row.id));}
 }
 for(const {value:row}of meta.values()){
  if(topicIdentityMetaAllowed(row.id)){hasTokens=true;required(validTopicNameRegistry(row.data));for(const id of row.data.topicIds){required(topics.has(id));const identity=topics.get(id).value.identity;required(identity&&(identity.nameToken===row.id.slice('personalTopicName:'.length)||identity.aliases.some(x=>x.token===row.id.slice('personalTopicName:'.length))));}}
  if(row.id.startsWith('topicKeepSeparate:')){required(id(row.data.sourceId)&&id(row.data.targetId));required(canonical(row.data.sourceId)!==canonical(row.data.targetId));}
 }
 if(hasTokens)required(meta.has('thought-suppression-key'));
 for(const {value:entry}of bySection.entries.values()){
  required(validOrganizationIntents(entry.organizationIntents));if(entry.organizationIntents?.version!==1)continue;
  for(const id of [...entry.organizationIntents.included,...entry.organizationIntents.excluded,...(entry.organizationIntents.fixed?.topicIds||[])])required(topics.has(id));
 }
}
