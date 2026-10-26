import {readMaintenanceFilterCapability} from './maintenance-service-client.js';
import {readMaintenanceFilterSettlement} from './foundation.js';
import {readAIMaintenanceFilterVisibility} from './ai-filter-owner.js';
import {canonical,equal} from './contracts.js';
import {snapshot,freeze,exact} from './qwen-request-data.js';
import {keyedHash} from '../thought-model.js';
import {hashText} from '../dedupe.js';
import {readAIFilterConsentEpoch} from '../../background/ai-filter-consent.js';
const receipts=new WeakMap(),hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const IDENTITY_FIELDS=['principalId','libraryId','operationId','jobType','tier','principalGeneration','entitlementGeneration','authorityGeneration','requestHash'];
const bounded=x=>snapshot(x,{maxBytes:98304,maxDepth:18,maxKeys:8192,maxString:4096});
const deny=()=>{throw Object.assign(Error('Filter visibility history unavailable'),{code:'UNAVAILABLE'});};
async function base(store){
 if(!store?.repository?.db)deny();const repository=store.repository,database=repository.db;
 const result=await repository.transaction(false,async t=>{
  const migration=await t.get('meta','migration'),library=await t.get('meta','thought-library'),key=await t.get('meta','thought-suppression-key'),restore=await t.get('meta','recovery-restore-epoch');
  if(migration?.phase!=='active'||typeof migration.databaseId!=='string'||library?.phase!=='active'||library.verified!==true||library.sealed!==0||!Array.isArray(key?.value)||key.value.length!==32||key.value.some(x=>!Number.isInteger(x)||x<0||x>255))deny();
  return {databaseId:migration.databaseId,restoreEpoch:restore?.value??null,secret:[...key.value]};
 },['meta']);
 if(store.repository!==repository||repository.db!==database)deny();return {...result,repository,database};
}
const sameBase=(a,b)=>a.repository===b.repository&&a.database===b.database&&a.databaseId===b.databaseId&&a.restoreEpoch===b.restoreEpoch&&equal(a.secret,b.secret);
function remember(store,envelope){const token=Object.freeze(Object.create(null));receipts.set(token,{store,repository:store.repository,database:store.repository.db,envelope:freeze(bounded(envelope))});return token;}
// This function accepts only the original live capability plus the SAME original
// writer publication and Foundation joined-ACK token. Live rows cannot recreate
// those private objects. Crypto runs after the original transaction has ended.
export async function sealAIFilterVisibilityWitness({foundation,publication,settlement,capability,consent}){
 const store=foundation?.s,view=readMaintenanceFilterCapability(capability,store),published=readAIMaintenanceFilterVisibility(publication,store),joined=readMaintenanceFilterSettlement(settlement,foundation,publication);
 if(!view||!published||!joined||joined.outcome!=='COMMITTED'||joined.jobId!==view.request.jobId||joined.childId!==view.request.operationId||!published.filtered.length||!equal(published.scope.candidateIds,view.candidateIds)||published.scope.neighborIds.some(id=>!view.inputIds.includes(id))||!view.qualityReceiptRefs.includes(published.policy.qualificationId))deny();
 const consentEpoch=readAIFilterConsentEpoch(consent,view.consent);if(!consentEpoch)deny();
 const initial=await base(store),identity=Object.fromEntries(IDENTITY_FIELDS.map(k=>[k,view.identity[k]]));
 if(initial.restoreEpoch!==published.proof.restore||view.identity.tier!=='pro'||!equal(published.epochs,{entitlement:'service:'+view.identity.requestHash,optIn:view.consent.generation,processing:view.processingEpoch,userRead:view.userReadEpoch}))deny();
 const data=bounded({version:1,kind:'ai-filter-joined-visibility-v1',databaseId:initial.databaseId,restoreEpoch:initial.restoreEpoch,origin:view.origin,request:view.request,identity,consentEpoch,publication:published,settlement:joined});
 const signature=await keyedHash(initial.secret,['ai-filter-joined-visibility-witness-v1',canonical(data)]);
 if(!sameBase(initial,await base(store)))deny();
 // A witness is historical evidence only. Revocation or a later Keep may make
 // it ineligible immediately; no lease or hidden flag is created by signing it.
 return remember(store,{data,signature});
}
export function serializeAIFilterVisibilityWitness(token,store){const r=receipts.get(token);return r?.store===store&&r.repository===store.repository&&r.database===store.repository.db?structuredClone(r.envelope):null;}
export function readAIFilterVisibilityWitness(token,store){return serializeAIFilterVisibilityWitness(token,store)?.data??null;}
// Authenticate existing history only. No source/body read, live-row ACK join,
// issuer observation, processing permission or write capability is created.
export async function openAIFilterVisibilityWitness(store,input){
 try{
  const envelope=bounded(input);if(!exact(envelope,['data','signature'])||!hex(envelope.signature)||envelope.data?.version!==1||envelope.data.kind!=='ai-filter-joined-visibility-v1')return null;
  const initial=await base(store),d=envelope.data;if(d.databaseId!==initial.databaseId||d.restoreEpoch!==initial.restoreEpoch||d.publication?.proof?.restore!==initial.restoreEpoch||d.settlement?.outcome!=='COMMITTED')return null;
  const signature=await keyedHash(initial.secret,['ai-filter-joined-visibility-witness-v1',canonical(d)]);if(signature!==envelope.signature||!sameBase(initial,await base(store)))return null;
  return remember(store,envelope);
 }catch{return null;}
}
export async function aiFilterVisibilityWitnessDigest(token,store){const data=readAIFilterVisibilityWitness(token,store);return data?hashText(canonical(data)):null;}
