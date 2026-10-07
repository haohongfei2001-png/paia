import {fail,keys,idOK,same} from './thought-model.js';
import {topicIdentityBase,assertTopicIdentityBase} from './topic-identity.js';
import {checkEvidenceInTransaction} from './thought-evidence.js';

// Internal processing is separate from capture and external Context access.
// No production resolver is installed by this slice. A future trusted service
// must authorize the exact bounded Input scope and return its current epoch.
export class TopicProcessingGuard {
 constructor(store,{resolveProcessing=null}={}){this.store=store;this.resolveProcessing=resolveProcessing;}
 async processing(t,evidence,topicIds=[]){
  if(typeof this.resolveProcessing!=='function')fail();
  const request=Object.freeze({purpose:'personal-topic-identity',inputIds:Object.freeze(evidence.map(e=>e.inputId)),topicIds:Object.freeze([...topicIds])});
  const processing=await this.resolveProcessing(t,request);
  if(processing?.allowed!==true||!idOK(processing.epoch)||!same(processing.inputIds,request.inputIds)||!same(processing.topicIds,request.topicIds))fail();
  return processing.epoch;
 }
 async authority(t,evidence,{checkEvidence=true}={}){
  const processingEpoch=await this.processing(t,evidence);
  const gate=await t.get('meta','gate'),library=await t.get('meta','thought-library');
  if(!gate?.enabled||library?.sealed)fail();
  if(checkEvidence)await checkEvidenceInTransaction(this.store,t,evidence);
  return {processingEpoch,gateEpoch:gate.epoch,thoughtEpoch:(await t.get('meta','thought-epoch'))?.value??0,generation:(await t.get('meta','backup-data-generation'))?.value??0,...await topicIdentityBase(t)};
 }
 async prepare(scope){
  if(!Array.isArray(scope)||!scope.length||scope.length>100)fail();
  for(const s of scope){keys(s,['inputId','role','selectedFields'],['inputId','role','selectedFields']);if(!idOK(s.inputId)||!['primary','supporting'].includes(s.role))fail();}
  await this.store.finishFoundation();
  const authority=await this.store.run(()=>this.store.repository.transaction(false,t=>this.authority(t,scope,{checkEvidence:false})));
  const evidence=await this.store.evidenceFor(scope);
  await this.store.run(()=>this.store.repository.transaction(false,t=>this.check(t,{evidence,authority})));
  return {evidence,authority};
 }
 async check(t,prepared,{generation=true}={}){
  await assertTopicIdentityBase(t,prepared?.authority);
  const current=await this.authority(t,prepared.evidence);
  const selected=a=>({processingEpoch:a.processingEpoch,gateEpoch:a.gateEpoch,thoughtEpoch:a.thoughtEpoch,restoreEpoch:a.restoreEpoch,...(generation?{generation:a.generation}:{})});
  if(!same(selected(current),selected(prepared.authority)))fail();
 }
}
export function publicTopicAuthority(authority){const {secret,...safe}=authority;return safe;}
