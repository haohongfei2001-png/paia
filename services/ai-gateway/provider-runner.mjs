import {readQwenProfileManifest} from '../../extension/core/ai-usage/qwen-profile-source-adapter.js';
import {Pool} from 'pg';
import {createPostgresReservationService} from './reservation-service.mjs';
import {createPostgresProviderEvidencePublisher} from './postgres-provider-evidence.mjs';
import {snapshotProviderInput,prepareProviderRequest} from './provider-request.mjs';
import {createPinnedQwenTransport} from './provider-transport.mjs';
import {readProviderResponse,observedProviderUsage} from './provider-response.mjs';
import {createPostgresProviderSettlementService} from './provider-settlement.mjs';
import {requireSynchronous} from './signed-identity.mjs';
import {snapshot,freeze} from '../../extension/core/ai-usage/qwen-request-data.js';

const flags=Object.freeze({financialAuthority:false,dispatchAllowed:false,retryAllowed:false,qualification:'NOT_ESTABLISHED',sourceKind:'SERVER_SOURCE_INJECTED_TOKENIZER'});
const deny=reason=>({decision:'deny',reason,...flags});
const stopped=reason=>Object.freeze({run:async()=>deny(reason),revoke(){},dispose(){}});

// SOURCE-ONLY composition. The required server registry/tokenizer has deliberately
// no default implementation, downloaded code, approximation or HTTP selector.
// Constructor capabilities are not operational qualification. No current API or
// extension path installs this runner. A future reviewed bootstrap must provide
// real qualified inputs; all existing entries stay default-off and unchanged.
export function createPostgresProviderRunner(options={}){
 let manifest,tokenize,isCurrent,service,publisher,transport,settlementService;
 try{
  if(options?.enabled!==true)return stopped('PROVIDER_DISABLED');
  if(typeof options.tokenize!=='function')return stopped('QUALIFIED_TOKENIZER_UNAVAILABLE');
  if(!Number.isSafeInteger(options.maxConcurrent)||options.maxConcurrent<1||options.maxConcurrent>16)return stopped('PROVIDER_CAPACITY_UNCONFIGURED');
  if(typeof options.isCurrent!=='function')return stopped('PROVIDER_PROFILE_UNAVAILABLE');
  if(!(options.reservationPool instanceof Pool)||!(options.evidencePool instanceof Pool)||options.reservationPool===options.evidencePool)return stopped('DEDICATED_POOLS_REQUIRED');
  manifest=freeze(readQwenProfileManifest(options.manifest));
  if(!manifest?.profile?.endpoint||!manifest.tokenizer||!manifest.wire||!manifest.route)return stopped('PROVIDER_PROFILE_UNAVAILABLE');
  tokenize=options.tokenize;isCurrent=options.isCurrent;
  publisher=createPostgresProviderEvidencePublisher({pool:options.evidencePool,identityConfig:options.identityConfig,profileId:options.profileId,maxConcurrent:options.maxConcurrent});
  service=createPostgresReservationService({pool:options.reservationPool,identityConfig:options.identityConfig,profileId:options.profileId});
  settlementService=createPostgresProviderSettlementService({pool:options.reservationPool,identityConfig:options.identityConfig,profileId:options.profileId});
  transport=createPinnedQwenTransport({endpoint:manifest.profile.endpoint,credential:options.providerCredential});
 }catch{return stopped('PROVIDER_CONFIG_INVALID');}
 let disposed=false;const active=new Set();
 const current=()=>!disposed&&requireSynchronous(isCurrent())===true;
 const shutdown=()=>{disposed=true;for(const control of active)control.abort();};
 return Object.freeze({
  async run(value,{signal}={}){
   let control,abort,timer,ticket,input,accountingAttempted=false,financialSettlement=null,financialAckUnknown=false;
   const financial=()=>financialSettlement?{reservation:'SETTLED',financialSettlement,resultFinalization:financialSettlement.outcome==='VALIDATED'?'PENDING_DOMAIN_PROOF':'FAILED'}:financialAckUnknown?{reservation:'ACKNOWLEDGEMENT_UNKNOWN'}:{};
   const unknown=reason=>({decision:'outcome_unknown',reason,reservation:'HELD_PENDING_INDEPENDENT_FINANCIAL_PROOF',...financial(),...flags});
   const retainUnknown=async reason=>{
    control?.abort();
    if(ticket&&!accountingAttempted){const event=await publisher.unknown(ticket);if(event.decision==='published')await service.record(input.bundle,event.eventId);}
    return unknown(reason);
   };
   try{
    if(!current()||signal?.aborted)return deny('PROVIDER_STOPPED');
    if(active.size>=16)return deny('PROVIDER_BUSY');
    input=snapshotProviderInput(value);
    control=new AbortController();active.add(control);
    abort=()=>control.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)control.abort();
    timer=setTimeout(()=>control.abort(),30000);
    const live=()=>!control.signal.aborted&&current();
    const abortPromise=new Promise((_,reject)=>{const stop=()=>reject(new Error('PROVIDER_STOPPED'));control.signal.addEventListener('abort',stop,{once:true});if(control.signal.aborted)stop();});
    // Always handled, including after the synchronous physical start.
    abortPromise.catch(()=>{});
    const claim=await publisher.claim(input.bundle,input.declaration,async context=>{
     if(!live())throw Error();
     return prepareProviderRequest({input,manifest,tokenize:request=>Promise.race([Promise.resolve().then(()=>tokenize(request)),abortPromise]),...context});
    });
    if(claim.decision!=='claimed')return {...claim,...flags};
    ticket=claim.ticket;
    if(!live())return deny('PROVIDER_STOPPED');
    // This is the ORIGINAL service/ledger transition, never an evidence INSERT
    // masquerading as a financial commit. Unknown acknowledgement means ZERO send.
    const recorded=await service.record(input.bundle,ticket.eventId);
    if(recorded.decision!=='recorded'||recorded.state!=='DISPATCHED')return recorded.decision==='outcome_unknown'?unknown('DISPATCH_COMMIT_UNKNOWN'):{...recorded,...flags};
    if(!live())return unknown('PROVIDER_STOPPED');
    const send=await publisher.sendOnce(ticket,{isCurrent:live,start:material=>transport.start(material.envelope,control.signal)});
    if(send.decision!=='started')return retainUnknown(send.reason??'SEND_OUTCOME_UNKNOWN');
    const response=await Promise.race([send.pending,abortPromise]);
    const received=await readProviderResponse(response,claim.material,{signal:control.signal});
    if(!observedProviderUsage(received,claim.material)){if(received.reason==='PROVIDER_USAGE_OVER_CAP')shutdown();return retainUnknown(received.reason);}
    // Known physical consumption is accounted independently of content consent,
    // schema success, or later result publication. Never accept a caller DTO.
    accountingAttempted=true;
    const published=await publisher.publishUsage(ticket,received);
    if(published.decision!=='published')return unknown(published.decision==='outcome_unknown'?'USAGE_PUBLICATION_COMMIT_UNKNOWN':'USAGE_PUBLICATION_FAILED');
    const settled=await settlementService.settle(input.bundle.request,published.eventId);
    if(settled.decision!=='recorded'||settled.state!=='SETTLED'){
     financialAckUnknown=settled.decision==='outcome_unknown';
     return unknown(financialAckUnknown?'SETTLEMENT_COMMIT_UNKNOWN':'SETTLEMENT_FAILED');
    }
    financialSettlement={state:'SETTLED',receiptId:published.eventId,outcome:published.outcome,settledSpendMicros:settled.settledSpendMicros,effectiveResults:settled.effectiveResults};
    if(received.decision!=='response_received')return unknown(received.reason);
    // Recheck current source declarations before exposing a private derivative.
    // The client still owns its current-revision/CAS fence and protected commit.
    const checked=await publisher.revalidate(ticket,live);
    if(checked.decision!=='current'||!live())return retainUnknown('RESPONSE_AUTHORITY_CHANGED');
    return {...received,checkedAt:checked.checkedAt,...financial(),...flags};
   }catch{return ticket?retainUnknown('PROVIDER_OUTCOME_UNKNOWN'):deny('PROVIDER_REQUEST_UNAVAILABLE');}
   finally{clearTimeout(timer);if(abort)signal?.removeEventListener('abort',abort);if(control){control.abort();active.delete(control);}}
  },
  revoke:shutdown,dispose:shutdown,
 });
}
