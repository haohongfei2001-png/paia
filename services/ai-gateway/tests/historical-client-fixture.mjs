import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {setup} from '../../../extension/tests/harness/thought-m1.mjs';
import {append} from '../../../extension/tests/harness/original-complete.mjs';
import {OrganizerStore} from '../../../extension/core/organizer/store.js';
import {PromptReuseService} from '../../../extension/core/prompt-reuse-service.js';
import {createConfiguredHistoricalCandidateSession} from '../../../extension/core/ai-usage/configured-historical-session.js';
import {hashText} from '../../../extension/core/dedupe.js';
import {canonical} from '../../../extension/core/ai-usage/contracts.js';
import {providerFixture,completion} from './provider-fixtures.mjs';
import {publicationProtocol} from './client-declaration-fixtures.mjs';
import {createDeclarationHandler} from '../client-declaration-entry.mjs';
import {createGatewayHandler} from '../request-entry.mjs';
import {createProviderHandler} from '../provider-entry.mjs';
import {createResultHandler} from '../result-entry.mjs';
import {createPostgresResultService} from '../result-service.mjs';
import {createOperationStatusHandler} from '../operation-status-entry.mjs';
import {createPostgresOperationStatusService} from '../operation-status-service.mjs';
// Actual signed issuers + actual HTTP parsers/owners/ledger. SQL locking is the
// existing deterministic protocol simulator, NOT real PostgreSQL evidence.
// Only the external HTTPS completion is synthetic; no callback makes a receipt.
export async function historicalServiceFixture(t,{beforeResponse=null,afterResponse=null,holdProvider=null,loseReservation=false,dropRevocation=false,loseProvider=false,loseResult=false,badIds=false,defer=false}={}){
 const losses={reservation:loseReservation,provider:loseProvider,result:loseResult};
 const local=await setup(OrganizerStore);await append(local.s,'SYNTHETIC garden observation alpha','history-alpha');await append(local.s,'SYNTHETIC garden observation beta','history-beta');await local.s.finishFoundation();
 const server=providerFixture(),publication=publicationProtocol(server),calls=[];let live=true,listener=null,physical=0,lastPayload=null;
 const schema={type:'object',properties:{version:{type:'integer',minimum:1,maximum:1},kind:{type:'string',minLength:10,maxLength:10,enum:['CANDIDATES']},ids:{type:'array',items:{type:'string',minLength:1,maxLength:200},minItems:1,maxItems:8}},required:['version','kind','ids'],additionalProperties:false};
 if(defer){schema.properties={version:{type:'integer',minimum:1,maximum:1},kind:{type:'string',minLength:5,maxLength:5,enum:['DEFER']},reason:{type:'string',minLength:1,maxLength:40,enum:['NO_USEFUL_CANDIDATE']}};schema.required=['version','kind','reason'];}
 const manifest=server.manifest;manifest.wire.responseFormat.json_schema.schema=schema;manifest.profile.responseSchemaDigest=await hashText(canonical(schema));manifest.known.responseSchemaDigest=manifest.profile.responseSchemaDigest;
 const publisher=publication.publisher(),runner=server.runner(),resultService=createPostgresResultService({...server.config,pool:server.reservationPool}),statusService=createPostgresOperationStatusService({...server.config,pool:server.reservationPool});
 const handlers={'/api/declarations':createDeclarationHandler({publisher}),'/api/reservations':createGatewayHandler({service:server.service}),'/api/provider':createProviderHandler({resolveRunner:()=>({runner,isCurrent:()=>true})}),'/api/results':createResultHandler({service:resultService}),'/api/operation-status':createOperationStatusHandler({service:statusService})};
 t.mock.method(https,'request',(options,callback)=>{
  physical++;assert.equal(options.hostname,manifest.profile.endpoint.host);const request=new EventEmitter();let done=false;
  request.destroy=error=>{if(!done){done=true;queueMicrotask(()=>{request.emit('error',error);request.emit('close');});}return request;};
  request.end=body=>{const payload=JSON.parse(JSON.parse(body).messages[1].content);lastPayload=payload;queueMicrotask(async()=>{try{
   await holdProvider?.(payload);await beforeResponse?.(server);
   if(done)return;done=true;
   const value=defer?{version:1,kind:'DEFER',reason:'NO_USEFUL_CANDIDATE'}:{version:1,kind:'CANDIDATES',ids:badIds?['SYNTHETIC-unknown']:payload.candidates.map(c=>c.id).reverse()},data=completion({choices:[{index:0,message:{role:'assistant',content:JSON.stringify(value)},finish_reason:'stop'}]});
   const incoming=Readable.from([Buffer.from(JSON.stringify(data))]);incoming.statusCode=200;incoming.headers={'content-type':'application/json'};callback(incoming);incoming.once('close',()=>request.emit('close'));
  }catch(error){request.destroy(error);}});};
  options.signal.addEventListener('abort',()=>request.destroy(Error('SYNTHETIC abort')),{once:true});return request;
 });
 const configuration={origin:'https://service.invalid',contractVersion:manifest.profile.contractVersion,routeVersion:manifest.profile.routeVersion,clock:()=>server.now,
  resolveAuthority:async(_t,r)=>({allowed:live,principalId:'SYNTHETIC-principal',libraryId:'SYNTHETIC-library',consentEpoch:'SYNTHETIC-consent',jobTypes:['AI_ASSIST'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),
  resolveIntent:async(_t,scope)=>({allowed:live,remoteProcessing:live,entitlement:'pro',serviceAvailable:true,consentEpoch:'SYNTHETIC-consent',permissionEpoch:'SYNTHETIC-permission',scope}),
  isCurrentIntent:()=>live,onInvalidate:fn=>{listener=fn;return ()=>{};},
  readProfile:async()=>structuredClone(manifest),currentProfile:()=>structuredClone(manifest),tokenize:server.config.tokenize,isCurrentTokenizer:()=>live,
  readProofs:async request=>{server.principals.set([request.principalId,request.libraryId].join('/'),server.principal(request));publication.principals.set([request.principalId,request.libraryId].join('/'),server.principal(request));const {request:_,...proofs}=server.bundle(request,{entitlement:{tier:'pro'}});return proofs;},
  fetch:async request=>{
   const path=new URL(request.url).pathname,data=await request.clone().json();calls.push({path,data});
   if(dropRevocation&&path==='/api/declarations'&&data.action==='revoke')throw Error('SYNTHETIC worker lost before revocation transport');
   const response=await handlers[path](request);
   // Two original SQL protocol simulators share the rows produced by the REAL
   // signed publisher. This mirrors the shared DB, not client-asserted grants.
   if(path==='/api/declarations')for(const [id,row]of publication.rows())server.grants.set(id,row);
   if(path==='/api/provider')await afterResponse?.({server,configuration,revoke:()=>{live=false;}});
   if(path==='/api/reservations'&&data.action==='reserve'&&losses.reservation||path==='/api/provider'&&losses.provider||path==='/api/results'&&losses.result)throw Error('SYNTHETIC lost HTTP acknowledgement');
   return response;
  }
 };
 const session=createConfiguredHistoricalCandidateSession(local.s,configuration),service=new PromptReuseService(local.s,{historyCandidates:session});
 const restart=async()=>{await local.s.repository.close();const store=new OrganizerStore(local.storage,{indexedDB:local.indexedDB});await store.finishFoundation();const next=createConfiguredHistoricalCandidateSession(store,configuration);return {s:store,session:next,service:new PromptReuseService(store,{historyCandidates:next})};};
 return {...local,server,session,service,configuration,calls,restart,restoreAcks:()=>{for(const key of Object.keys(losses))losses[key]=false;},restore:()=>{live=true;},physical:()=>physical,payload:()=>lastPayload,revoke:(notify=true)=>{live=false;if(notify)listener?.();}};
}
