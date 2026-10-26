import {ArchiveError} from '../constants.js';
// No production adapter is registered. Fixture adapters live under tests only.
export const productionProviders=Object.freeze([]);
export const SCHEMA_VERSION=1;
export class OrganizerError extends ArchiveError {constructor(code){super(code);this.code=code;}}
export const reject=code=>{throw new OrganizerError(code);};
export const bytes=value=>new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value)).length;
export function object(value,allowed,required=allowed){if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).some(k=>!allowed.includes(k))||required.some(k=>!(k in value)))reject('INVALID_OUTPUT');}
export class OrganizerProvider {describe(){reject('UNAVAILABLE');}async execute(){reject('UNAVAILABLE');}}
export class CredentialProvider {
 describeRequirements(){return {kind:'none'};}
 getStatus(){return {status:'ready'};}
 async acquire(){return {status:'ready',handle:null};}
 revoke(){return {status:'revoked'};}
}
export const SAFE_ERRORS=new Set(['UNAVAILABLE','TIMEOUT','RATE_LIMIT','CREDENTIAL_FAILURE','BUDGET_EXCEEDED','INVALID_OUTPUT','STALE_BASE','CANCELLED','STORAGE_FAILED','INVALID_CREDENTIAL','RATE_LIMITED','PROVIDER_TIMEOUT','NETWORK_ERROR','INVALID_PROVIDER_OUTPUT','PROVIDER_BAD_REQUEST','MODEL_NOT_AVAILABLE','PROVIDER_UNAVAILABLE','REQUEST_ALREADY_IN_FLIGHT','OUTCOME_UNKNOWN','RESPONSE_BODY_READ_FAILED','INVALID_JSON','INVALID_SCHEMA','SPAN_VALIDATION_FAILED','COMMIT_FAILED','MESSAGE_CHANNEL_INTERRUPTED','MESSAGE_RESPONSE_TIMEOUT','PREPARE_LEDGER_WRITE_FAILED','BATCH_STATE_WRITE_FAILED','SINGLE_FLIGHT_ACQUIRE_FAILED','TRACE_WRITE_FAILED','BOOTSTRAP_STATE_WRITE_FAILED','LIBRARY_COMMIT_FAILED','BUDGET_RESERVATION_FAILED','HOST_PERMISSION_MISSING','HOST_PERMISSION_NOT_GRANTED','CSP_BLOCKED','WRONG_FETCH_CONTEXT','INTERNAL_RUNTIME_ERROR']);
export const safeError=e=>SAFE_ERRORS.has(e?.code)?e.code:'STORAGE_FAILED';
export const descriptorOK=d=>{object(d,['providerId','adapterVersion','capabilityVersion','modelVersion','executionKind','supportedTaskSchemas','credentialRequirement']);if(![d.providerId,d.adapterVersion,d.modelVersion].every(x=>typeof x==='string'&&/^[a-zA-Z0-9_.-]{1,80}$/.test(x))||d.capabilityVersion!==1||!['fixture','local','remote'].includes(d.executionKind)||!Array.isArray(d.supportedTaskSchemas)||!d.supportedTaskSchemas.includes('organize.v1')||!['none','opaque'].includes(d.credentialRequirement))reject('UNAVAILABLE');return d;};
