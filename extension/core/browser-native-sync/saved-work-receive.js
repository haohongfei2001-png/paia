import {requireOriginalLibraryDocumentsStore} from '../library-documents-owner.js';
import {prepareSourceSavedWorkBootstrap,commitSavedWorkProtocol,prepareSavedWorkProtocol} from './saved-work-bootstrap.js';
import {prepareBootstrapApplication,applyBootstrapApplication} from './source-bootstrap-receive.js';
import {prepareInitialSourcePlan} from './source-bootstrap-plan.js';
import {bytes,clone,fail} from './value.js';

// Explicit consuming owner only. It uses the existing Core and original Source
// and Foundation writers in one transaction. No provider/default worker wiring.
export class SourceSavedWorkReceiver{
 constructor(store,core){requireOriginalLibraryDocumentsStore(store);if(store.repository!==core.repository)fail('BNS_SAVED_WORK_BINDING');this.store=store;this.core=core;}
 async receiveOperation(input){
  const startedAt=Date.now();if(!input||Object.keys(input).length!==2||!Object.hasOwn(input,'sourceOperations')||!Object.hasOwn(input,'operation')||bytes(input).length>2*1024*1024)fail('BNS_SAVED_WORK_LIMIT');
  const operation=await prepareSavedWorkProtocol(input.operation);if(operation.type!=='savedWorkBootstrap'||operation.datasetId!==this.core.datasetId)fail('BNS_SAVED_WORK_OPERATION');
  return this.#receive({sourceOperations:input.sourceOperations,payload:operation.value.payload},operation,startedAt);
 }
 async receive(input){return this.#receive(input);}
 async #receive(input,wireOperation=null,wireStartedAt=null){
  const startedAt=wireStartedAt??Date.now();
  if(!input||Object.keys(input).length!==2||!Object.hasOwn(input,'sourceOperations')||!Object.hasOwn(input,'payload')||!Array.isArray(input.sourceOperations)||input.sourceOperations.length!==7||bytes(input).length>2*1024*1024)fail('BNS_SAVED_WORK_LIMIT');
  const {sourceOperations,payload}=clone(input),{store,core}=this,sourceProtocol=await core.prepareSourceBootstrapReceive(sourceOperations),sourcePlan=await prepareInitialSourcePlan(Object.fromEntries(sourceProtocol.members.map(op=>[op.value.entityType,op.value.entity]))),sourceApplication=await prepareBootstrapApplication(store,core,sourceOperations),saved=await prepareSourceSavedWorkBootstrap(store,core,payload,sourcePlan,sourceOperations,startedAt);
  return store.foundationWrite(async t=>{await applyBootstrapApplication(t,sourceApplication);const result=await store.applySavedWorkBootstrapInTransaction(t,saved);if(wireOperation)await commitSavedWorkProtocol(t,core,saved,wireOperation);return result;});
 }
}
