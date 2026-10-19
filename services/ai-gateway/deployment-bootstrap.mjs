import {PostgresLedgerStorage} from './postgres-ledger.mjs';
import {createPostgresReservationService} from './reservation-service.mjs';
import {createGatewayHandler} from './request-entry.mjs';
import {snapshotDeploymentEnvironment} from './deployment-config.mjs';
import {createDeploymentRuntime} from './deployment-runtime.mjs';

// Same original readiness/financial owner, with shared fixed pg lifecycle.
export function createDeploymentGateway({readEnvironment=()=>process.env}={}) {
 return createDeploymentRuntime({readEnvironment,snapshotEnvironment:snapshotDeploymentEnvironment,
  checkReady:pool=>new PostgresLedgerStorage({pool}).checkReady(),
  createService:(pool,config)=>createPostgresReservationService({pool,identityConfig:config.identityConfig,profileId:config.profileId}),
  createHandler:resolveService=>createGatewayHandler({resolveService}),
 });
}
