import {canonicalJson,openRemoteObject,sealRemoteObject,createDeviceIdentity,nextDeviceOperation,validateRemoteObject} from './sync-crypto.js';
import {planSyncMerge,replayDecision,validateSyncEnvelope} from './sync-contract.js';

export class SyncSimulationError extends Error{
  constructor(code){super(code);this.name='SyncSimulationError';this.code=code;}
}

const fail=code=>{throw new SyncSimulationError(code);};
const clone=value=>JSON.parse(JSON.stringify(value));

export class LocalRemoteObjectStore{
  #objects=new Map();
  put(remoteObject){
    const value=validateRemoteObject(remoteObject);
    const existing=this.#objects.get(value.objectId);
    if(existing){
      if(canonicalJson(existing)!==canonicalJson(value))fail('SYNC_REMOTE_OBJECT_COLLISION');
      return Object.freeze({status:'duplicate',objectId:value.objectId});
    }
    this.#objects.set(value.objectId,clone(value));
    return Object.freeze({status:'stored',objectId:value.objectId});
  }
  get(objectId){
    const value=this.#objects.get(objectId);
    return value?clone(value):null;
  }
  list(){
    return Array.from(this.#objects.values(),clone);
  }
  get size(){return this.#objects.size;}
}

export class LocalSyncDeviceSimulator{
  #rootKey;
  #keyVersion;
  #identity;
  constructor({rootKey,keyVersion=1,identity}={}){
    if(!(rootKey instanceof Uint8Array)||rootKey.length!==32)fail('SYNC_SIM_ROOT_KEY_INVALID');
    if(!Number.isSafeInteger(keyVersion)||keyVersion<1)fail('SYNC_SIM_KEY_VERSION_INVALID');
    this.#rootKey=new Uint8Array(rootKey);
    this.#keyVersion=keyVersion;
    this.#identity=identity??createDeviceIdentity();
  }
  get identity(){return Object.freeze({...this.#identity});}
  reinstallIdentity(){
    this.#identity=createDeviceIdentity();
    return this.identity;
  }
  nextEnvelope(draft){
    const next=nextDeviceOperation(this.#identity);
    this.#identity=next.state;
    return validateSyncEnvelope({...draft,...next.operation});
  }
  async seal({syncEnvelope,payload,objectId}={}){
    return sealRemoteObject({rootKey:this.#rootKey,keyVersion:this.#keyVersion,syncEnvelope,payload,objectId});
  }
  async upload(store,{syncEnvelope,payload,objectId}={}){
    if(!(store instanceof LocalRemoteObjectStore))fail('SYNC_SIM_STORE_INVALID');
    const remoteObject=await this.seal({syncEnvelope,payload,objectId});
    return Object.freeze({...store.put(remoteObject),remoteObject});
  }
  async download(store){
    if(!(store instanceof LocalRemoteObjectStore))fail('SYNC_SIM_STORE_INVALID');
    const bundles=[];
    for(const remoteObject of store.list())bundles.push(await openRemoteObject({rootKey:this.#rootKey,remoteObject}));
    return bundles;
  }
  plan(localEnvelope,remoteEnvelope){
    return planSyncMerge({local:localEnvelope,remote:remoteEnvelope});
  }
  replay(lastAcceptedSequence,incoming){
    return replayDecision({lastAcceptedSequence,incoming});
  }
}
