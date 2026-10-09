import {humanClock} from './browser-native-sync/human-library-allocation.js';
import {fail,idOK,keyedHash,markHuman} from './thought-model.js';

// Personal identity metadata contains no copied body or label. Names remain in
// the existing Topic/revision owners; keyed tokens retain alias/removal fences.
export const TOPIC_IDENTITY_VERSION=1;
const namePrefix='personalTopicName:';
const pairPrefix='topicKeepSeparate:';
export const topicPairKey=(a,b)=>pairPrefix+JSON.stringify([a,b].sort());
export function identityMetadata(row){
 if(row.identity!==undefined){if(row.identity?.version!==TOPIC_IDENTITY_VERSION)fail();return structuredClone(row.identity);}
 return {version:TOPIC_IDENTITY_VERSION,revision:0,origin:['user','ai'].includes(row.createdBy)?row.createdBy:'unknown',scope:null,aliases:[],legacy:true,noRecreation:row.lifecycle==='removed'||row.lifecycle==='merged'||!!row.redirectTo};
}
export function initializeTopicIdentity(row,actor){row.identity={version:TOPIC_IDENTITY_VERSION,revision:0,origin:actor,scope:null,aliases:[],legacy:false,noRecreation:false};return row;}
export async function topicIdentityBase(t){return {secret:(await t.get('meta','thought-suppression-key')).value,restoreEpoch:(await t.get('meta','recovery-restore-epoch'))?.value??null};}
export async function assertTopicIdentityBase(t,base){
 if(!base||!Object.hasOwn(base,'restoreEpoch')||((await t.get('meta','recovery-restore-epoch'))?.value??null)!==base.restoreEpoch)fail();
 if(base.secret&&JSON.stringify((await t.get('meta','thought-suppression-key'))?.value)!==JSON.stringify(base.secret))fail();
}
export async function prepareTopicName(store,name){
 await store.finishFoundation();const base=await store.run(()=>store.repository.transaction(false,t=>topicIdentityBase(t),['meta']));
 return {...base,token:await keyedHash(base.secret,['personal-topic-name-v1',String(name).normalize('NFKC').toLocaleLowerCase().trim()])};
}
export async function topicNameToken(store,name){return (await prepareTopicName(store,name)).token;}
export async function prepareTopicIdentityName(store,id,newName){
 await store.finishFoundation();const snapshot=await store.run(()=>store.repository.transaction(false,async t=>({before:await t.get('topics',id),...await topicIdentityBase(t)}),['topics','meta']));
 if(!snapshot.before)fail();const normalized=name=>String(name).normalize('NFKC').toLocaleLowerCase().trim();
 return {secret:snapshot.secret,restoreEpoch:snapshot.restoreEpoch,beforeName:snapshot.before.name,beforeRevision:snapshot.before.revision,oldToken:await keyedHash(snapshot.secret,['personal-topic-name-v1',normalized(snapshot.before.name)]),...(newName!==undefined?{newToken:await keyedHash(snapshot.secret,['personal-topic-name-v1',normalized(newName)])}:{})};
}
export async function registerTopicName(t,topic,token){
 if(!/^[a-f0-9]{64}$/.test(token))fail();topic.identity=identityMetadata(topic);topic.identity.nameToken=token;const id=namePrefix+token,row=await t.get('meta',id)||{id,version:1,topicIds:[]};
 if(!row.topicIds.includes(topic.id)){row.topicIds.push(topic.id);await t.put('meta',row);}
}
export const prepareTopicRename=prepareTopicIdentityName;
export function planHumanTopicRename(row,prepared,operationId,at){
 if(row.revision!==prepared.beforeRevision||row.name!==prepared.beforeName)fail();
 const identity=identityMetadata(row);
 const priorTokens=[...new Set([identity.nameToken,prepared.oldToken].filter(Boolean))];
 // A purge may sanitize the visible name while retaining its original opaque
 // fence. Renaming must retain that token too, without recovering erased text.
 for(const token of priorTokens)if(token!==prepared.newToken&&!identity.aliases.some(x=>x.token===token))identity.aliases.push({token,actor:row.protections?.name?.locked?'user':identity.origin,revision:row.revision,operationId,at});
 identity.revision++;return {identity,priorTokens};
}
export async function recordTopicRename(t,row,prepared,operationId,at){
 await assertTopicIdentityBase(t,prepared);const {identity,priorTokens}=planHumanTopicRename(row,prepared,operationId,at);
 row.identity=identity;for(const token of priorTokens)await registerTopicName(t,row,token);await registerTopicName(t,row,prepared.newToken);
}
export async function resolveTopicIdentity(t,id){
 const seen=new Set();for(let depth=0;depth<32;depth++){
  if(!idOK(id)||seen.has(id))fail();seen.add(id);const row=await t.get('topics',id);if(!row)fail();
  if(!row.redirectTo){if(row.lifecycle==='merged')fail();return row;}
  // Older layouts used redirectTo without changing the lifecycle flag.
  // Preserve that exact identity mapping; never create a replacement object.
  if(!['active','merged'].includes(row.lifecycle))fail();id=row.redirectTo;
 }fail();
}
// Exact name history is a suppression/reuse guard, never proof that two objects
// are the same. Multiple live identities deliberately remain ambiguous.
export async function topicNameFence(t,token){
 if(!token)return {ids:[],blocked:false};const row=await t.get('meta',namePrefix+token),ids=new Set();let blocked=false;
 for(const id of row?.topicIds||[]){const original=await t.get('topics',id);if(!original){blocked=true;continue;}const current=await resolveTopicIdentity(t,id);if(['removed','candidate'].includes(current.lifecycle)||current.identity?.noRecreation&&current.lifecycle!=='active'&&current.lifecycle!=='dormant')blocked=true;else ids.add(current.id);}
 return {ids:[...ids],blocked};
}
export function setTopicLifecycle(row,to,{actor,operationId,at}={}){
 const from=row.lifecycle,allowed={candidate:['active','removed'],active:['dormant','merged','removed'],dormant:['active','merged','removed'],removed:['active'],merged:[]};
 if(!allowed[from]?.includes(to)||!['user','ai'].includes(actor))fail();
 if((to==='merged'||to==='removed'||from==='removed')&&actor!=='user')fail();
 if(to==='dormant'&&(row.pinKey===0||row.protections?.keep?.locked||row.protections?.lifecycle?.locked))fail();
 row.identity=identityMetadata(row);row.identity.revision++;row.identity.noRecreation=to==='removed'||to==='merged';row.identity.lifecycleIntent={actor,operationId,at,previous:from,to};row.lifecycle=to;row.activeKey=to==='active'?0:1;if(actor==='user')markHuman(row,'lifecycle',operationId,at,to==='active'?'restore':'user_edit');
}
export async function topicIdentitiesSeparate(t,left,right){
 const a=(await resolveTopicIdentity(t,left)).id,b=(await resolveTopicIdentity(t,right)).id;
 if(a===b)return false;
 let after=null;do{const page=await t.primaryRangePage('meta',{prefix:pairPrefix,after,limit:100});
  for(const {value:pair}of page.rows){const x=(await resolveTopicIdentity(t,pair.sourceId)).id,y=(await resolveTopicIdentity(t,pair.targetId)).id;if(x===y)fail();if(x===a&&y===b||x===b&&y===a)return true;}after=page.next;
 }while(after);return false;
}
export async function assertTopicMergeAllowed(t,sourceId,targetId){if(await topicIdentitiesSeparate(t,sourceId,targetId))fail();}
export function planHumanKeepSeparate(sourceId,targetId,at){return {id:topicPairKey(sourceId,targetId),sourceId,targetId,at,actor:'user',revision:1,scope:'identity'};}
export async function keepTopicIdentitiesSeparate(store,request){
 const {sourceId,targetId}=request;const {beginHumanOperation,finishHumanOperation,releaseHumanOperation,humanOperationError}=await import('./browser-native-sync/human-library-plan.js');
 return store.foundationWrite(async t=>{try{await beginHumanOperation(store,t,request);const result=await keepTopicIdentitiesSeparateInTransaction(store,t,{sourceId,targetId});await finishHumanOperation(store,t,request,result);return result;}catch(error){throw humanOperationError(request,error);}finally{releaseHumanOperation(t,request);}});
}
// Explicit, resumable metadata compatibility operation. It is not invoked at
// startup and does not change existing IDs, content, permissions or revisions.
export async function mapTopicIdentityBatch(store,{limit=100}={}){
 if(!Number.isInteger(limit)||limit<1||limit>100)fail();await store.finishFoundation();
 const markerId='personal-topic-identity-compat-v1';
 const snapshot=await store.run(()=>store.repository.transaction(false,async t=>{const marker=await t.get('meta',markerId)||{id:markerId,cursor:null,complete:false,mapped:0};return {marker,...await topicIdentityBase(t),page:marker.complete?null:await t.page('topics',{after:marker.cursor??undefined,limit})};}));
 if(snapshot.marker.complete)return snapshot.marker;
 const tokens=await Promise.all(snapshot.page.rows.map(async({value:row})=>({id:row.id,revision:row.revision,name:row.name,token:await keyedHash(snapshot.secret,['personal-topic-name-v1',String(row.name).normalize('NFKC').toLocaleLowerCase().trim()])})));
 return store.foundationWrite(async t=>{await assertTopicIdentityBase(t,snapshot);const current=await t.get('meta',markerId)||{id:markerId,cursor:null,complete:false,mapped:0};if(current.cursor!==snapshot.marker.cursor||current.complete)return {...current,conflict:!current.complete};
  for(const item of tokens){const row=await t.get('topics',item.id);if(!row||row.revision!==item.revision||row.name!==item.name)return {...current,conflict:true};}
  for(const item of tokens){const row=await t.get('topics',item.id);if(!row.identity){row.identity=identityMetadata(row);current.mapped++;}if(!row.identity.nameToken)await registerTopicName(t,row,item.token);await t.put('topics',row);}
  current.cursor=snapshot.page.next;current.complete=!snapshot.page.next;await t.put('meta',current);return current;
 });
}

export async function keepTopicIdentitiesSeparateInTransaction(store,t,{sourceId,targetId}){const a=await resolveTopicIdentity(t,sourceId),b=await resolveTopicIdentity(t,targetId);let result;if(a.id===b.id)result={kept:false};else{if(a.layoutJobId||b.layoutJobId)fail();
  const id=topicPairKey(a.id,b.id),prior=await t.get('meta',id);if(!prior)await t.put('meta',planHumanKeepSeparate(a.id,b.id,humanClock(store,t)));result={kept:true};}return result;}
