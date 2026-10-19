import {compileDeploymentConfig,snapshotDeploymentEnvironment,sameDeploymentSnapshot} from './deployment-config.mjs';
import {canonical} from '../../extension/core/ai-usage/contracts.js';
import {isProviderDeploymentRegistry} from './provider-deployment-registry.mjs';

const unavailable=reason=>Object.freeze({enabled:false,reason});
const invalid=()=>{throw Error('PROVIDER_CONFIG_INVALID');};
export function snapshotProviderDeploymentEnvironment(environment,registry){
 try{
  if(environment?.PAIA_PROVIDER_ENABLED!=='true')return unavailable('PROVIDER_DISABLED');
  if(!isProviderDeploymentRegistry(registry))return unavailable('PROVIDER_REGISTRY_UNAVAILABLE');
  const capability=registry.resolve(environment.PAIA_PROVIDER_CAPABILITY_ID);
  if(!capability)return unavailable('PROVIDER_REGISTRY_UNAVAILABLE');
  if(typeof capability.tokenize!=='function')return unavailable('QUALIFIED_TOKENIZER_UNAVAILABLE');
  if(!registry.isCurrent(capability))return unavailable('PROVIDER_PROFILE_UNAVAILABLE');
  const reservation=snapshotDeploymentEnvironment({PAIA_RESERVATIONS_ENABLED:'true',
   PAIA_RESERVATIONS_CONFIG:environment.PAIA_PROVIDER_RESERVATION_CONFIG,
   PAIA_RESERVATIONS_DB_PASSWORD:environment.PAIA_PROVIDER_RESERVATION_DB_PASSWORD});
  const evidence=snapshotDeploymentEnvironment({PAIA_RESERVATIONS_ENABLED:'true',
   PAIA_RESERVATIONS_CONFIG:environment.PAIA_PROVIDER_EVIDENCE_CONFIG,
   PAIA_RESERVATIONS_DB_PASSWORD:environment.PAIA_PROVIDER_EVIDENCE_DB_PASSWORD});
  const credential=environment.PAIA_PROVIDER_CREDENTIAL,capacity=environment.PAIA_PROVIDER_MAX_CONCURRENT;
  if(reservation.invalid||evidence.invalid||typeof credential!=='string'||!credential.length||credential.length>4096||!credential.isWellFormed()||/[\u0000-\u0020\u007f]/u.test(credential)||
     typeof capacity!=='string'||! /^(?:[1-9]|1[0-6])$/.test(capacity))return unavailable('PROVIDER_CONFIG_INVALID');
  return Object.freeze({enabled:true,capability,reservation,evidence,credential,maxConcurrent:Number(capacity)});
 }catch{return unavailable('PROVIDER_CONFIG_INVALID');}
}
export const sameProviderDeploymentSnapshot=(a,b)=>a?.enabled===b?.enabled&&a?.reason===b?.reason&&a?.capability===b?.capability&&
 a?.credential===b?.credential&&a?.maxConcurrent===b?.maxConcurrent&&sameDeploymentSnapshot(a?.reservation,b?.reservation)&&sameDeploymentSnapshot(a?.evidence,b?.evidence);
export function compileProviderDeploymentConfig(input){
 if(!input?.enabled)return null;
 const reservation=compileDeploymentConfig(input.reservation),evidence=compileDeploymentConfig(input.evidence);
 const a=reservation.poolOptions,b=evidence.poolOptions;
 // Two dedicated roles against the SAME original ledger/authority database.
 // Neither a connection URL nor ambient PG* can replace an explicit target.
 if(reservation.profileId!==evidence.profileId||canonical(reservation.identityConfig)!==canonical(evidence.identityConfig)||
    a.host!==b.host||a.port!==b.port||a.database!==b.database||a.ssl.ca!==b.ssl.ca||a.user===b.user)invalid();
 return {identityConfig:reservation.identityConfig,profileId:reservation.profileId,
  reservationPoolOptions:{...a,application_name:'paia-provider-reservation-v1',fallback_application_name:'paia-provider-reservation-v1'},
  evidencePoolOptions:{...b,application_name:'paia-provider-evidence-v1',fallback_application_name:'paia-provider-evidence-v1'}};
}
