import {requireRepositoryTransactionScope} from '../idb-repository.js';
import {assertThoughtReadTransactionOrigin} from '../thought-library-read-model.js';
import {assertContextScopeTransactionOrigin} from '../context-topic-scope.js';
import {readAIFilterVisibilityWitness} from './filter-visibility-witness.js';
import {readAIFilterConsentEpoch,isAIFilterConsentSnapshotCurrent} from '../../background/ai-filter-consent.js';
import {canonical,equal} from './contracts.js';
import {hashText} from '../dedupe.js';
import {snapshotFilterReadRequest} from './filter-read-identity-data.js';
// Only the source can select a current local binding. A request DTO, persisted
// witness envelope, UI-supplied hash, or copied handle cannot create this token.
// The token is NOT identity, processing authority, or permission to hide.
const bindings=new WeakMap(),stores=new WeakMap();
const text=x=>typeof x==='string'&&x.length>0&&x.length<=200;
const exact=(x,keys)=>!!x&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>Object.hasOwn(Object.getOwnPropertyDescriptor(x,k)||{},'value'));
const deny=()=>{throw Object.assign(Error('Filter read binding unavailable'),{code:'UNAVAILABLE'});};
async function base(t,check){
 check();const migration=await t.get('meta','migration');check();const library=await t.get('meta','thought-library');check();const restore=await t.get('meta','recovery-restore-epoch');check();
 if(migration?.phase!=='active'||!text(migration.databaseId)||library?.phase!=='active'||library.verified!==true||library.sealed!==0||restore&&!text(restore.value))deny();
 return Object.freeze({databaseId:migration.databaseId,restoreEpoch:restore?.value??null});
}
function current(s){try{return s.getStore()===s.store&&s.store.repository===s.repository&&s.repository.db===s.database&&s.configuration.isCurrent()===true&&s.consent.isCurrent(s.receipt)===true&&readAIFilterConsentEpoch(s.consent,s.receipt)===s.request.consentEpoch;}catch{return false;}}
export function readFilterReadIdentityBinding(token,store){const s=bindings.get(token);return s?.store===store&&current(s)?s.request:null;}
export async function assertFilterReadIdentityBinding(t,token,store){
 const s=bindings.get(token);if(!s||s.store!==store)deny();
 const check=()=>{
  if(!current(s))deny();
  // Only the original Context owner can attest its own bounded adapter. A
  // copied view, prototype chain or public tx-like field is not an alias.
  // Every persisted binding read still goes through the supplied guarded t.
  try{requireRepositoryTransactionScope(s.repository,t);}catch{try{assertContextScopeTransactionOrigin(t,s.repository);}catch{assertThoughtReadTransactionOrigin(t,s.repository);}}
  if(readFilterReadIdentityBindingFacts(token,store)!==s.request)deny();
 };
 check();if(!equal(await base(t,check),s.base))deny();check();return s.request;
}
export async function createFilterReadIdentityBinding({getStore,consent,witness,policy,configuration}={}){
 try{
  if(typeof getStore!=='function'||!consent||!exact(policy,['version','qualificationId'])||policy.version!=='pro-ambiguous-1'||!text(policy.qualificationId)||!configuration||typeof Object.getOwnPropertyDescriptor(configuration,'isCurrent')?.value!=='function'||typeof Object.getOwnPropertyDescriptor(configuration,'origin')?.value!=='string')return null;
  const store=getStore(),data=readAIFilterVisibilityWitness(witness,store),repository=store?.repository,database=repository?.db;
  if(!data||!database||data.origin!==configuration.origin||!equal(data.publication.policy,policy)||data.identity.principalId!==data.request.principalId||data.identity.libraryId!==data.request.libraryId)return null;
  const receipt=consent.capture(),consentEpoch=readAIFilterConsentEpoch(consent,receipt);if(!receipt||!consentEpoch)return null;
  let nonce=stores.get(store);if(!nonce){nonce=crypto.randomUUID();stores.set(store,nonce);}const readerSessionId=crypto.randomUUID();
  const check=()=>{if(getStore()!==store||store.repository!==repository||repository.db!==database||configuration.isCurrent()!==true||!consent.isCurrent(receipt)||readAIFilterConsentEpoch(consent,receipt)!==consentEpoch)deny();};check();
  const original=await repository.transaction(false,t=>base(t,check),['meta']);check();if(original.databaseId!==data.databaseId||original.restoreEpoch!==data.restoreEpoch)return null;
  // Neither the historical consent nor a caller-provided hash is used as the
  // current binding. Only current local owner facts and private fresh nonces.
  const localBindingHash=await hashText(canonical({purpose:'AI_FILTER_VISIBILITY_LOCAL_V1',origin:configuration.origin,storeNonce:nonce,readerSessionId,...original,consentEpoch,consentGeneration:receipt.generation,policy}));check();
  if(!equal(original,await repository.transaction(false,t=>base(t,check),['meta'])))return null;check();
  const request=snapshotFilterReadRequest({version:1,purpose:'AI_FILTER_VISIBILITY',principalId:data.identity.principalId,libraryId:data.identity.libraryId,readerSessionId,consentEpoch,localBindingHash,policyId:policy.qualificationId}),token=Object.freeze(Object.create(null));
  bindings.set(token,{store,repository,database,getStore,consent,receipt,configuration,base:original,request});return token;
 }catch{return null;}
}

// Local lifetime only. Current persisted restore metadata remains checked by
// assertFilterReadIdentityBinding and the original Filter reader transaction.
export function readFilterReadIdentityBindingFacts(token,store){const s=bindings.get(token);return s?.store===store&&s.store.repository===s.repository&&s.repository.db===s.database&&isAIFilterConsentSnapshotCurrent(s.receipt)?s.request:null;}
