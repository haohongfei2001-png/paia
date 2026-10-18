import {snapshotDeploymentEnvironment} from './deployment-config.mjs';
import {createDeploymentRuntime} from './deployment-runtime.mjs';
import {createPostgresDeclarationPublisher} from './postgres-declaration-publisher.mjs';
import {createDeclarationHandler} from './client-declaration-entry.mjs';

// Dedicated source-only publisher configuration. Never inherit the reservation
// role/password; enabling that service does not enable authority publication.
export function snapshotDeclarationEnvironment(environment){
 try{
  if(environment?.PAIA_DECLARATIONS_ENABLED!=='true')return snapshotDeploymentEnvironment({});
  return snapshotDeploymentEnvironment({PAIA_RESERVATIONS_ENABLED:'true',
   PAIA_RESERVATIONS_CONFIG:environment.PAIA_DECLARATIONS_CONFIG,
   PAIA_RESERVATIONS_DB_PASSWORD:environment.PAIA_DECLARATIONS_DB_PASSWORD});
 }catch{return Object.freeze({enabled:true,invalid:true});}
}
export function createDeclarationDeploymentGateway({readEnvironment=()=>process.env}={}){
 return createDeploymentRuntime({readEnvironment,snapshotEnvironment:snapshotDeclarationEnvironment,
  // The original ledger readiness probe requires ledger-writing privileges.
  // This dedicated publisher instead checks its narrower role and complete
  // current authority under the actual transaction on EVERY request.
  checkReady:()=>Promise.resolve(),
  createService:(pool,config)=>createPostgresDeclarationPublisher({pool,identityConfig:config.identityConfig,profileId:config.profileId}),
  createHandler:resolveService=>createDeclarationHandler({resolvePublisher:async()=>{
   const selected=await resolveService();return selected?{publisher:selected.service,isCurrent:selected.isCurrent}:null;
  }}),
 });
}
