import {PostgresLedgerStorage} from './postgres-ledger.mjs';
import {snapshotDeploymentEnvironment} from './deployment-config.mjs';
import {createDeploymentRuntime} from './deployment-runtime.mjs';
import {createPostgresOperationStatusService} from './operation-status-service.mjs';
import {createOperationStatusHandler} from './operation-status-entry.mjs';
// Independent explicit opt-in; original least-privilege ledger runtime only.
export function snapshotOperationStatusEnvironment(environment){
 try{return environment?.PAIA_OPERATION_STATUS_ENABLED==='true'?snapshotDeploymentEnvironment(environment):snapshotDeploymentEnvironment({});}
 catch{return Object.freeze({enabled:true,invalid:true});}
}
export function createOperationStatusDeploymentGateway({readEnvironment=()=>process.env}={}){
 return createDeploymentRuntime({readEnvironment,snapshotEnvironment:snapshotOperationStatusEnvironment,
  checkReady:pool=>new PostgresLedgerStorage({pool}).checkReady(),
  createService:(pool,config)=>createPostgresOperationStatusService({pool,identityConfig:config.identityConfig,profileId:config.profileId}),
  createHandler:resolveService=>createOperationStatusHandler({resolveService})});
}
