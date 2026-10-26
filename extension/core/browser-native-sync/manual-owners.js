import {contextManualMaterializer} from './context-journal.js';
import {materializePrompt} from './prompt-journal.js';
import {fail} from './value.js';

// Explicit local injection only. Bind a live Core for receive, or restore.stage
// for activation: Context ancestry must be read from that exact namespace.
// These four owners are partial coverage, not full canonical sync readiness.
export function manualSyncOwners(core){
 const context=contextManualMaterializer(core);
 const owners=Object.freeze({promptPreferences:materializePrompt,contextItem:context,contextRulesItem:context,contextNowItem:context});
 return Object.freeze({owners,materialize:async(t,change)=>{
  if(!Object.hasOwn(owners,change.operation.type))fail('BNS_MATERIALIZER_UNSUPPORTED');
  return owners[change.operation.type](t,change);
 }});
}
