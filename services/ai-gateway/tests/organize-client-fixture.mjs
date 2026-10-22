import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {setup} from '../../../extension/tests/harness/thought-m1.mjs';
import {append} from '../../../extension/tests/harness/original-complete.mjs';
import {OrganizerStore} from '../../../extension/core/organizer/store.js';
import {createConfiguredOrganizeRunner} from '../../../extension/core/organizer/configured-organize-runner.js';

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
export async function organizeServiceFixture(t,{count=1,beforeResponse=null,afterResponse=null,holdProvider=null,loseReservation=false,dropRevocation=false,loseProvider=false,loseResult=false,badIds=false,defer=false,boundedResponse=false}={}){
 const losses={reservation:loseReservation,provider:loseProvider,result:loseResult};
 const local=await setup(OrganizerStore),topic=await local.s.createTopic({name:'SYNTHETIC organize topic',operationId:crypto.randomUUID()});const entries=[];for(let i=0;i<count;i++){const e=await local.s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'SYNTHETIC organize evidence '+i,type:'idea',formation:'explicit',evidence:[]});await local.s.placeEntry({topicId:topic.id,entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:(await local.s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});entries.push(e);}
 const server=providerFixture(),publication=publicationProtocol(server),calls=[];let live=true,listener=null,physical=0,lastPayload=null;
 const str={type:'string',minLength:1,maxLength:16000},ref={type:'string',minLength:1,maxLength:200};
 const span={type:'object',properties:{entryId:ref,revision:str,start:{type:'integer',minimum:0,maximum:16000},end:{type:'integer',minimum:1,maximum:16000}},required:['entryId','revision','start','end'],additionalProperties:false};
 const block={type:'object',properties:{field:{type:'string',minLength:1,maxLength:20,enum:['currentView']},text:str,evidenceEntryIds:{type:'array',items:ref,minItems:1,maxItems:20},sourceSpans:{type:'array',items:span,minItems:1,maxItems:20}},required:['field','text','evidenceEntryIds','sourceSpans'],additionalProperties:false};
 const schema={type:'object',properties:{version:{type:'integer',minimum:2,maximum:2},blocks:{type:'array',items:block,minItems:1,maxItems:20}},required:['version','blocks'],additionalProperties:false};
 const manifest=server.manifest;manifest.profile.jobType='AI_ORGANIZE';manifest.known.jobType='AI_ORGANIZE';manifest.wire.responseFormat.json_schema.schema=JSON.parse(JSON.stringify(schema));manifest.profile.responseSchemaDigest=await hashText(canonical(schema));manifest.known.responseSchemaDigest=manifest.profile.responseSchemaDigest;
 const publisher=publication.publisher(),providerRunner=server.runner(),resultService=createPostgresResultService({...server.config,pool:server.reservationPool}),statusService=createPostgresOperationStatusService({...server.config,pool:server.reservationPool});
 const handlers={'/api/declarations':createDeclarationHandler({publisher}),'/api/reservations':createGatewayHandler({service:server.service}),'/api/provider':createProviderHandler({resolveRunner:()=>({runner:providerRunner,isCurrent:()=>true})}),'/api/results':createResultHandler({service:resultService}),'/api/operation-status':createOperationStatusHandler({service:statusService})};
 t.mock.method(https,'request',(options,callback)=>{
  physical++;assert.equal(options.hostname,manifest.profile.endpoint.host);const request=new EventEmitter();let done=false;
  request.destroy=error=>{if(!done){done=true;queueMicrotask(()=>{request.emit('error',error);request.emit('close');});}return request;};
  request.end=body=>{const payload=JSON.parse(JSON.parse(body).messages[1].content);lastPayload=payload;queueMicrotask(async()=>{try{
   await holdProvider?.(payload);await beforeResponse?.(server);
   if(done)return;done=true;
   const value={version:2,blocks:payload.inputs.map(i=>({field:'currentView',text:boundedResponse?'SYNTHETIC bounded summary '+i.ref:i.text,evidenceEntryIds:[badIds?'SYNTHETIC-unknown':i.ref],sourceSpans:[{entryId:i.ref,revision:i.revision,start:0,end:i.text.length}]}))},data=completion({choices:[{index:0,message:{role:'assistant',content:JSON.stringify(value)},finish_reason:'stop'}]});
   const incoming=Readable.from([Buffer.from(JSON.stringify(data))]);incoming.statusCode=200;incoming.headers={'content-type':'application/json'};callback(incoming);incoming.once('close',()=>request.emit('close'));
  }catch(error){request.destroy(error);}});};
  options.signal.addEventListener('abort',()=>request.destroy(Error('SYNTHETIC abort')),{once:true});return request;
 });
 const configuration={origin:'https://service.invalid',profile:{contractVersion:manifest.profile.contractVersion,modelVersion:manifest.profile.model.resolutionVersion,promptVersion:await hashText(canonical(manifest.wire))},routeVersion:manifest.profile.routeVersion,clock:()=>server.now,
  resolveAuthority:async(_t,r)=>({allowed:live,principalId:'SYNTHETIC-principal',libraryId:'SYNTHETIC-library',consentEpoch:'SYNTHETIC-consent',jobTypes:['AI_ORGANIZE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),
  onInvalidate:fn=>{listener=fn;return ()=>{};},
  readProfile:async()=>JSON.parse(JSON.stringify(manifest)),currentProfile:()=>JSON.parse(JSON.stringify(manifest)),tokenize:server.config.tokenize,isCurrentTokenizer:()=>live,
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
 const runner=createConfiguredOrganizeRunner(local.s,configuration);
 const rpc=request=>runner.handle(request),run=async()=>{const scope=await rpc({type:'GET_AI_PRESENTATION_SCOPE',options:{topicId:topic.id}});return rpc({type:'UPDATE_AI_PRESENTATION',topicId:topic.id,userActionId:crypto.randomUUID(),scopeBinding:scope.scopeBinding});};
 return {...local,server,runner,rpc,run,topic,entries,configuration,calls,restoreAcks:()=>{for(const key of Object.keys(losses))losses[key]=false;},restore:()=>{live=true;},physical:()=>physical,payload:()=>lastPayload,revoke:(notify=true)=>{live=false;if(notify)listener?.();}};
}
