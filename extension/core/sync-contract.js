const HASH_RE=/^[a-f0-9]{64}$/;
const OPAQUE_RE=/^[A-Za-z0-9_-]{8,128}$/;
const ENTITY_RE=/^[A-Za-z0-9:_./-]{1,256}$/;

export const SYNC_CONTRACT_VERSION=1;

export const SYNC_ENTITY_POLICY=Object.freeze({
  source_record:'sync_source_facts',
  working_input:'sync_human_work',
  document_metadata:'sync_human_work',
  thought_user:'sync_human_work',
  user_visibility_intent:'sync_human_work',
  automatic_filter_decision:'rebuild_local',
  ai_projection:'rebuild_local',
  search_index:'rebuild_local',
  context_package:'exclude_device_local',
  passport_grant:'exclude_device_local',
  passport_audit:'exclude_device_local',
  product_signals:'exclude_device_local',
  revisit_cursor:'exclude_device_local',
  provider_credential:'exclude_device_local',
});

const SYNCABLE=new Set(['source_record','working_input','document_metadata','thought_user','user_visibility_intent']);
const HUMAN_WORK=new Set(['working_input','document_metadata','thought_user','user_visibility_intent']);
const FORBIDDEN_PLAINTEXT_FIELDS=new Set(['text','body','title','note','query','context','originalText','editedText','summary']);

export class SyncContractError extends Error{
  constructor(code){super(code);this.name='SyncContractError';this.code=code;}
}

const fail=code=>{throw new SyncContractError(code);};
const plainObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

export function syncPolicy(entityType){
  const policy=SYNC_ENTITY_POLICY[entityType];
  if(!policy)fail('SYNC_ENTITY_UNSUPPORTED');
  return policy;
}

export function isSyncableEntity(entityType){
  return SYNCABLE.has(entityType);
}

export function validateDeviceIdentity(device){
  if(!plainObject(device)||!OPAQUE_RE.test(device.deviceId||'')||!Number.isSafeInteger(device.sequence)||device.sequence<1)fail('SYNC_DEVICE_INVALID');
  if(Object.keys(device).some(key=>!['deviceId','sequence'].includes(key)))fail('SYNC_DEVICE_INVALID');
  return {deviceId:device.deviceId,sequence:device.sequence};
}

export function validateSyncEnvelope(input){
  if(!plainObject(input))fail('SYNC_ENVELOPE_INVALID');
  if(Object.keys(input).some(key=>FORBIDDEN_PLAINTEXT_FIELDS.has(key)))fail('SYNC_PLAINTEXT_FORBIDDEN');
  const allowed=new Set(['version','entityType','entityId','payloadHash','baseHash','factsHash','deviceId','deviceSequence','operationId','permanentTombstone']);
  if(Object.keys(input).some(key=>!allowed.has(key)))fail('SYNC_ENVELOPE_INVALID');
  if(input.version!==SYNC_CONTRACT_VERSION||!SYNCABLE.has(input.entityType)||!ENTITY_RE.test(input.entityId||'')||!HASH_RE.test(input.payloadHash||'')||!OPAQUE_RE.test(input.deviceId||'')||!OPAQUE_RE.test(input.operationId||'')||!Number.isSafeInteger(input.deviceSequence)||input.deviceSequence<1)fail('SYNC_ENVELOPE_INVALID');
  if(input.baseHash!==null&&input.baseHash!==undefined&&!HASH_RE.test(input.baseHash))fail('SYNC_ENVELOPE_INVALID');
  if(input.factsHash!==null&&input.factsHash!==undefined&&!HASH_RE.test(input.factsHash))fail('SYNC_ENVELOPE_INVALID');
  const tombstone=input.permanentTombstone===true;
  if(input.permanentTombstone!==undefined&&typeof input.permanentTombstone!=='boolean')fail('SYNC_ENVELOPE_INVALID');
  if(tombstone&&input.entityType!=='source_record')fail('SYNC_TOMBSTONE_SCOPE');
  if(input.entityType==='source_record'&&input.baseHash!==null&&input.baseHash!==undefined)fail('SYNC_SOURCE_MUTATION');
  if(input.entityType!=='source_record'&&input.factsHash!==null&&input.factsHash!==undefined)fail('SYNC_ENVELOPE_INVALID');
  return Object.freeze({
    version:SYNC_CONTRACT_VERSION,
    entityType:input.entityType,
    entityId:input.entityId,
    payloadHash:input.payloadHash,
    baseHash:input.baseHash??null,
    factsHash:input.factsHash??null,
    deviceId:input.deviceId,
    deviceSequence:input.deviceSequence,
    operationId:input.operationId,
    permanentTombstone:tombstone,
  });
}

const conflict=(reason,local,remote)=>Object.freeze({
  action:'conflict',
  reason,
  entityType:local.entityType,
  entityId:local.entityId,
  local:Object.freeze({payloadHash:local.payloadHash,baseHash:local.baseHash,deviceId:local.deviceId,operationId:local.operationId}),
  remote:Object.freeze({payloadHash:remote.payloadHash,baseHash:remote.baseHash,deviceId:remote.deviceId,operationId:remote.operationId}),
  resolution:'user_required',
});

export function planSyncMerge({local,remote}={}){
  local=validateSyncEnvelope(local);remote=validateSyncEnvelope(remote);
  if(local.entityType!==remote.entityType||local.entityId!==remote.entityId)fail('SYNC_ENTITY_MISMATCH');

  if(local.operationId===remote.operationId)return Object.freeze({action:'duplicate_operation',entityType:local.entityType,entityId:local.entityId});

  if(local.entityType==='source_record'){
    if(local.permanentTombstone||remote.permanentTombstone)return Object.freeze({
      action:'permanent_tombstone_wins',
      entityType:'source_record',
      entityId:local.entityId,
      winner:local.permanentTombstone&&remote.permanentTombstone?'both':local.permanentTombstone?'local':'remote',
    });
    if(local.payloadHash!==remote.payloadHash)return conflict('immutable_source_mismatch',local,remote);
    if(local.factsHash===remote.factsHash)return Object.freeze({action:'equivalent',entityType:'source_record',entityId:local.entityId});
    return Object.freeze({
      action:'merge_source_facts',
      entityType:'source_record',
      entityId:local.entityId,
      originalHash:local.payloadHash,
      rule:'enrich_only_use_source_evidence_arbiter',
    });
  }

  if(!HUMAN_WORK.has(local.entityType))fail('SYNC_ENTITY_UNSUPPORTED');
  if(local.payloadHash===remote.payloadHash)return Object.freeze({action:'equivalent',entityType:local.entityType,entityId:local.entityId});
  if(remote.baseHash===local.payloadHash)return Object.freeze({action:'accept_remote_fast_forward',entityType:local.entityType,entityId:local.entityId});
  if(local.baseHash===remote.payloadHash)return Object.freeze({action:'keep_local_fast_forward',entityType:local.entityType,entityId:local.entityId});
  if(local.baseHash&&local.baseHash===remote.baseHash)return conflict('concurrent_human_edits',local,remote);
  return conflict('ancestry_unproven',local,remote);
}

export function replayDecision({lastAcceptedSequence,incoming}={}){
  incoming=validateSyncEnvelope(incoming);
  if(!Number.isSafeInteger(lastAcceptedSequence)||lastAcceptedSequence<0)fail('SYNC_SEQUENCE_INVALID');
  if(incoming.deviceSequence<=lastAcceptedSequence)return Object.freeze({action:'ignore_replay',deviceId:incoming.deviceId,sequence:incoming.deviceSequence});
  return Object.freeze({action:'accept_sequence',deviceId:incoming.deviceId,sequence:incoming.deviceSequence});
}
