import {ImportLedger} from '../core/import/ledger.js';
import {officialExportStatus} from '../core/import/registry.js';
import {ArchiveError} from '../core/constants.js';
const methods=Object.freeze({IMPORT_BEGIN:'begin',IMPORT_PREFLIGHT:'preflight',IMPORT_READY:'ready',IMPORT_COMMIT:'commit',IMPORT_PAUSE:'pause',IMPORT_COMPLETE:'complete',IMPORT_CANCEL:'cancel',IMPORT_RESOLVE_BRANCH:'resolveBranch'});
const keys={begin:['fingerprint','adapterId','consent','taskId'],preflight:['taskId','grant','sequence','rows'],ready:['taskId','grant','batches','issues','inspection'],commit:['taskId','grant','sequence','rows'],pause:['taskId','grant'],complete:['taskId','grant'],cancel:['taskId','grant'],resolveBranch:['id','expectedRevision','operationId','action','documentId']};
export class ImportHandler {
 #originalLedger;#originalRuntime;#originalGetURL;#runtimeId;
 #selectionIdentity(){if(Object.getPrototypeOf(this)!==originalPrototype||this.ledger!==this.#originalLedger||this.runtime!==this.#originalRuntime||this.runtime.getURL!==this.#originalGetURL||this.runtime.id!==this.#runtimeId||!originalMethods.every(([k,v])=>this[k]===v))throw new ArchiveError('LOCAL_TOOL_SELECTION_STALE');}
 applicationSelectionSourceIs(store,runtime=this.#originalRuntime){try{this.#selectionIdentity();return runtime===this.#originalRuntime&&this.#originalLedger.applicationSelectionSourceIs(store);}catch{return false;}}
 holdForApplicationSelection(){this.#selectionIdentity();return this.#originalLedger.holdForApplicationSelection();}
 applicationSelectionHeld(token){try{this.#selectionIdentity();return this.#originalLedger.applicationSelectionHeld(token);}catch{return false;}}
 fenceApplicationSelection(token){this.#selectionIdentity();return this.#originalLedger.fenceApplicationSelection(token);}
 releaseApplicationSelection(token){return this.#originalLedger.releaseApplicationSelection(token);}
 releaseFailedApplicationSelection(error){return this.#originalLedger.releaseFailedApplicationSelection(error);}

 constructor(store,runtime){this.ledger=new ImportLedger(store);this.runtime=runtime;this.#originalLedger=this.ledger;this.#originalRuntime=runtime;this.#originalGetURL=runtime?.getURL;this.#runtimeId=runtime?.id;}
 trusted(sender){return sender?.id===this.runtime.id&&sender.url===this.runtime.getURL('ui/archive.html')&&!sender.tab?.incognito&&(sender.frameId===undefined||sender.frameId===0);}
 async handle(request,sender){if(!this.trusted(sender))throw new ArchiveError('FORBIDDEN');if(request.type==='IMPORT_CAPABILITIES')return officialExportStatus();if(request.type==='IMPORT_LATEST')return this.ledger.latest();if(request.type==='IMPORT_TASKS')return this.ledger.list(request.payload?.cursor);if(request.type==='IMPORT_STATUS')return this.ledger.status(request.taskId);const method=methods[request.type];if(!method||typeof sender.documentId!=='string'||!sender.documentId)throw new ArchiveError('FORBIDDEN');const q=request.payload;if(!q||typeof q!=='object'||Array.isArray(q)||Object.keys(q).some(k=>!keys[method].includes(k)))throw new ArchiveError('INVALID_REQUEST');return this.ledger[method](q,sender.documentId);}
 disconnect(sender){if(this.trusted(sender)&&sender.documentId)this.ledger.revokeOwner(sender.documentId);}
}

const originalPrototype=ImportHandler.prototype;
const originalMethods=Object.getOwnPropertyNames(originalPrototype).filter(k=>k!=='constructor').map(k=>[k,originalPrototype[k]]);
