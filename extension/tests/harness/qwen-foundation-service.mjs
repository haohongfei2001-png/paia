import assert from 'node:assert/strict';
import {setup,inputEdit} from './thought-m1.mjs';
import {serviceFixture} from './qwen-client-service-fixture.mjs';
import {OrganizerStore} from '../../core/organizer/store.js';
import {AIUsageFoundation} from '../../core/ai-usage/foundation.js';
import {JOB_TYPES,canonical} from '../../core/ai-usage/contracts.js';
import {hashText} from '../../core/dedupe.js';
import {createClientDeclarationTransport} from '../../core/ai-usage/client-declaration-transport.js';
import {createClientReservationTransport} from '../../core/ai-usage/client-reservation-transport.js';
import {createClientProviderTransport} from '../../core/ai-usage/client-provider-transport.js';
import {createClientResultTransport} from '../../core/ai-usage/client-result-transport.js';
const flags={financialAuthority:false,dispatchAllowed:false,retryAllowed:false};
const proofs={principalToken:'synthetic-principal-proof',entitlementToken:'synthetic-entitlement-proof'};
export async function fixture({historical=false,children=1,holdProvider=null,changeResponse=null,resultHook=null,reserveHook=null}={}){
 const f=await setup(OrganizerStore),permission={allowed:true,principalId:'fixture-principal',libraryId:'fixture-library',consentEpoch:'fixture-consent',jobTypes:JOB_TYPES};
 const options={...(historical?{resolveHistoricalIntent:async(_t,r)=>({allowed:true,remoteProcessing:true,...r}),candidateResult:async()=>null}:{}),resolveAuthority:async(_t,r)=>({...permission,scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),committers:Object.fromEntries(['topic','context'].map(facet=>[facet,async(t,r)=>{await t.put('meta',{id:'synthetic-domain:'+facet,committed:true});return {committed:true,coverage:r.units};}]))};
 const ai=new AIUsageFoundation(f.s,options),items=(await ai.collect()).items,coverage=(historical?['assist']:children===2?['context','topic']:['topic']).map(facet=>({key:items[0].key,facet,scope:'fixture-scope'}));
 const job=await ai.plan({type:historical?'AI_ASSIST':'AI_MAINTENANCE',items,coverage,...(historical?{historicalIntent:{version:1,evaluationKey:'a'.repeat(64),consentEpoch:'fixture-consent',permissionEpoch:'fixture-permission'},candidateObligation:{version:1,evaluationKey:'a'.repeat(64)},intent:'explicit'}:{children:coverage.map(u=>[u]),intent:'maintenance'}),contractVersion:'fixture-contract',routeVersion:'fixture-route'});
 const requests=await Promise.all(job.childIds.map(id=>ai.serverRequest(job.id,id,{inputTokens:100,outputCap:600,maxCompletionTokens:500}))),owners=await Promise.all(requests.map(r=>serviceFixture(historical?'AI_ASSIST':'AI_MAINTENANCE',r))),calls=[],financial=[];
 const fetch=async req=>{
  const data=await req.json(),path=new URL(req.url).pathname;calls.push({path,data});
  if(path==='/api/declarations')return Response.json({decision:data.action==='publish'?'published':'revoked',requestHash:data.declaration.requestHash,generation:await hashText(canonical(data.declaration)),issuedAt:150,expiresAt:data.declaration.expiresAt,...flags});
  if(path==='/api/reservations'){
   if(reserveHook)return reserveHook(data);
   const owner=owners.find(f=>f.input.reservationRequest.operationId===data.request.operationId),r=data.action==='reserve'?await owner.ledger.reserve(data.request):await owner.ledger.record(data.request,'CANCELLED_BEFORE_DISPATCH');
   return Response.json({decision:data.action==='reserve'?'reserved':'cancelled',...r,...flags});
  }
  if(path==='/api/provider'){
   if(holdProvider)await holdProvider(data);
   const receipt={state:'SETTLED',receiptId:'synthetic-financial:'+data.bundle.request.operationId,outcome:'VALIDATED',settledSpendMicros:120,effectiveResults:0};financial.push(receipt);
   const response={decision:'response_received',value:{action:'KEEP'},providerRequestId:'synthetic-provider-id',usage:{},domainValidity:'NOT_EVALUATED',reservation:'SETTLED',checkedAt:160,financialSettlement:receipt,resultFinalization:'PENDING_DOMAIN_PROOF',qualification:'NOT_ESTABLISHED',sourceKind:'SERVER_SOURCE_INJECTED_TOKENIZER',...flags};
   return Response.json(changeResponse?changeResponse(response):response);
  }
  if(path==='/api/results'){
   const ack={decision:'finalized',operationId:data.request.operationId,jobId:data.request.jobId,receiptId:data.result.receiptId,resultOutcome:data.result.outcome,effectiveResults:data.result.outcome==='COMMITTED'?1:0,...flags};return resultHook?resultHook(data,ack):Response.json(ack);
  }
  throw Error('unexpected route');
 };
 const declaration=createClientDeclarationTransport({endpoint:'https://synthetic.invalid/api/declarations',fetch}),reservation=createClientReservationTransport({endpoint:'https://synthetic.invalid/api/reservations',fetch}),providerTransport=createClientProviderTransport({endpoint:'https://synthetic.invalid/api/provider',fetch}),resultTransport=createClientResultTransport({endpoint:'https://synthetic.invalid/api/results',fetch}),providers=[],boundRefs=[],declaredHandles=[];
 const prepare=async()=>{for(const o of owners){const declared=await o.owner.prepareDeclaration(o.input);assert.equal(declared.status,'DECLARED_LOCAL');declaredHandles.push(declared);assert.equal((await o.owner.publishDeclaration(declared,proofs,declaration)).status,'PUBLISHED_CLIENT_DECLARATION');assert.equal((await o.owner.reserveDeclaration(declared,reservation)).status,'RESERVED_SERVICE');const bound=await o.owner.bind(o.input);assert.equal(bound.status,'BOUND_LOCAL');boundRefs.push(new WeakRef(bound));providers.push(o.owner.foundationProvider(bound,providerTransport));assert.ok(providers.at(-1));}await ai.reserveServer(job.id,providers);};
 const dispatch=async i=>ai.dispatch(job.id,job.childIds[i],providers[i]);
 const commit=async i=>ai.commitFacet(job.id,job.childIds[i],{facet:coverage[i].facet,units:[coverage[i]]});
 return {...f,ai,job,items,permission,options,owners,requests,providers,boundRefs,declaredHandles,calls,financial,prepare,dispatch,commit,resultTransport,declaration,reservation,providerTransport};
}
