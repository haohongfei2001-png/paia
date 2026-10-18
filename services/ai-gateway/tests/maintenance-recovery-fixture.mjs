import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {AIUsageFoundation} from '../../../extension/core/ai-usage/foundation.js';
import {createClientOperationStatusTransport} from '../../../extension/core/ai-usage/client-operation-status-transport.js';
import {createClientReservationTransport} from '../../../extension/core/ai-usage/client-reservation-transport.js';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
export const markerId='aiu:maintenance-service-preflight:v1';
export const usageRows=async(s,jobId)=>(await rows(s,'organizerUsage')).filter(r=>!jobId||r.jobId===jobId).sort((a,b)=>a.sequence-b.sequence);
export async function maintenanceRecoveryFixture(t,{loss='provider',lossIndex=0,configure,...options}={}){
 let dropping=true,seen=0;
 const f=await maintenanceServiceFixture(t,{...options,configure:async context=>{
  const {configuration}=context,send=configuration.fetch;
  configuration.fetch=async request=>{const path=new URL(request.url).pathname,data=await request.clone().json();
   const match=loss==='reservation'?path==='/api/reservations'&&data.action==='reserve':path==='/api/provider';
   const drop=dropping&&match&&seen++===lossIndex;
   const response=await send(request);if(drop)throw Error('SYNTHETIC original ACK loss');return response;
  };
  await configure?.(context);
 }});
 const original=await f.run();assert.equal(original.state,'OUTCOME_UNKNOWN');dropping=false;
 const foundation=new AIUsageFoundation(f.s,{resolveAuthority:f.configuration.resolveAuthority}),status=createClientOperationStatusTransport({endpoint:f.configuration.origin+'/api/operation-status',fetch:f.configuration.fetch}),reservations=createClientReservationTransport({endpoint:f.configuration.origin+'/api/reservations',fetch:f.configuration.fetch});
 async function capture(){
  const handle=await foundation.maintenanceRecovery(f.configuration.origin),observations=[],cancellations=[];
  for(const [i,request]of handle.requests.entries()){
   if(request===null){observations.push(null);cancellations.push(null);continue;}
   const proofs=await f.configuration.readProofs(request),observation=await foundation.queryMaintenanceRecovery(handle,i,proofs,status,()=>true);observations.push(observation);
   cancellations.push(['RESERVED','CANCELLED_BEFORE_DISPATCH'].includes(observation.state)?await foundation.cancelMaintenanceRecovery(handle,i,proofs,observation,status,reservations,()=>true):null);
  }
  return {handle,observations,cancellations,commit:()=>foundation.reconcileMaintenanceRecovery(handle,observations,status,{cancellations,reservations,isCurrent:()=>true})};
 }
 return {...f,original,foundation,status,reservations,capture};
}

import {providerFixture} from './provider-fixtures.mjs';
import {publicationProtocol} from './client-declaration-fixtures.mjs';
import {createDeclarationHandler} from '../client-declaration-entry.mjs';
import {createGatewayHandler} from '../request-entry.mjs';
import {createProviderHandler} from '../provider-entry.mjs';
import {createResultHandler} from '../result-entry.mjs';
import {createPostgresResultService} from '../result-service.mjs';
import {createOperationStatusHandler} from '../operation-status-entry.mjs';
import {createPostgresOperationStatusService} from '../operation-status-service.mjs';
// Reconstruct only synthetic service resources at their real next server time.
// Keep the ORIGINAL local store and durable ledger. Expired signed identities,
// declarations, profiles and tokenization are freshly issued by their owners.
export function laterMaintenanceService(f,at){
 const server=providerFixture({at}),publication=publicationProtocol(server),manifest=server.manifest;
 Object.assign(manifest,structuredClone(f.server.manifest));manifest.profile.validity={...manifest.profile.validity,verifiedAt:server.now,expiresAt:server.now+60000};
 server.setSaved(f.server.saved());
 const handlers={
  '/api/declarations':createDeclarationHandler({publisher:publication.publisher()}),
  '/api/reservations':createGatewayHandler({service:server.service}),
  '/api/provider':createProviderHandler({resolveRunner:()=>({runner:server.runner(),isCurrent:()=>true})}),
  '/api/results':createResultHandler({service:createPostgresResultService({...server.config,pool:server.reservationPool})}),
  '/api/operation-status':createOperationStatusHandler({service:createPostgresOperationStatusService({...server.config,pool:server.reservationPool})})
 };
 const calls=[],configuration={...f.configuration,clock:()=>server.now,readProfile:async()=>structuredClone(manifest),currentProfile:()=>structuredClone(manifest),tokenize:server.config.tokenize,
  readProofs:async request=>{server.principals.set([request.principalId,request.libraryId].join('/'),server.principal(request));publication.principals.set([request.principalId,request.libraryId].join('/'),server.principal(request));const {request:_,...proofs}=server.bundle(request);return proofs;},
  fetch:async request=>{const path=new URL(request.url).pathname;calls.push({path,data:await request.clone().json()});const response=await handlers[path](request);if(path==='/api/declarations')for(const [id,row]of publication.rows())server.grants.set(id,row);return response;}
 };
 return {server,configuration,calls};
}
