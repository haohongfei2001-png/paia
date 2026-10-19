import {PostgresLedgerStorage} from './postgres-ledger.mjs';
import {snapshotDeploymentEnvironment} from './deployment-config.mjs';
import {createDeploymentRuntime} from './deployment-runtime.mjs';
import {createPostgresResultService} from './result-service.mjs';
import {createResultHandler} from './result-entry.mjs';

// Explicit independent enable switch; reuse the original reservation runtime
// role/configuration and bounded lifecycle, never a publisher role or new ledger.
export function snapshotResultEnvironment(environment){
 try{return environment?.PAIA_RESULTS_ENABLED==='true'?snapshotDeploymentEnvironment(environment):snapshotDeploymentEnvironment({});}
 catch{return Object.freeze({enabled:true,invalid:true});}
}
export function createResultDeploymentGateway({readEnvironment=()=>process.env}={}){
 return createDeploymentRuntime({readEnvironment,snapshotEnvironment:snapshotResultEnvironment,
  checkReady:pool=>new PostgresLedgerStorage({pool}).checkReady(),
  createService:(pool,config)=>createPostgresResultService({pool,identityConfig:config.identityConfig,profileId:config.profileId}),
  createHandler:resolveService=>createResultHandler({resolveService})});
}
