import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';

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
// Existing signed server assembly, shared by synthetic client and explicitly staged native fixtures.
// SQL is the original deterministic simulator. Only external HTTPS completion is synthetic.
export async function assistSignedServiceFixture(t,{beforeResponse=null,afterResponse=null,holdProvider=null,loseReservation=false,dropRevocation=false,loseProvider=false,loseResult=false,defer=false,unknownUsage=false,condition='',tier='pro',statusTransform=null}={}){
 const losses={reservation:loseReservation,provider:loseProvider,result:loseResult};
 const server=providerFixture(),publication=publicationProtocol(server),calls=[];let live=true,physical=0,lastPayload=null;
 const schema={type:'object',properties:{version:{type:'integer',minimum:1,maximum:1},kind:{type:'string',minLength:1,maxLength:20,enum:['SUGGESTION','DEFER']},reason:{type:'string',minLength:0,maxLength:40,enum:['','NO_USEFUL_SUGGESTION']},text:{type:'string',minLength:0,maxLength:120},condition:{type:'string',minLength:0,maxLength:120}},required:['version','kind','text','condition','reason'],additionalProperties:false};
 const manifest=server.manifest;manifest.profile.jobType='AI_ASSIST';manifest.known.jobType='AI_ASSIST';manifest.wire.responseFormat.json_schema.schema=JSON.parse(JSON.stringify(schema));manifest.profile.responseSchemaDigest=await hashText(canonical(schema));manifest.known.responseSchemaDigest=manifest.profile.responseSchemaDigest;
 const publisher=publication.publisher(),providerRunner=server.runner(),resultService=createPostgresResultService({...server.config,pool:server.reservationPool}),statusService=createPostgresOperationStatusService({...server.config,pool:server.reservationPool});
 const handlers={'/api/declarations':createDeclarationHandler({publisher}),'/api/reservations':createGatewayHandler({service:server.service}),'/api/provider':createProviderHandler({resolveRunner:()=>({runner:providerRunner,isCurrent:()=>true})}),'/api/results':createResultHandler({service:resultService}),'/api/operation-status':createOperationStatusHandler({service:statusService})};
 t.mock.method(https,'request',(options,callback)=>{
  physical++;assert.equal(options.hostname,manifest.profile.endpoint.host);const request=new EventEmitter();let done=false;
  request.destroy=error=>{if(!done){done=true;queueMicrotask(()=>{request.emit('error',error);request.emit('close');});}return request;};
  request.end=body=>{const payload=JSON.parse(JSON.parse(body).messages[1].content);lastPayload=payload;queueMicrotask(async()=>{try{
   await holdProvider?.(payload);await beforeResponse?.(server);
   if(done)return;done=true;
   const value=defer?{version:1,kind:'DEFER',reason:'NO_USEFUL_SUGGESTION',text:'',condition:''}:{version:1,kind:'SUGGESTION',text:'SYNTHETIC explain the next step.',condition,reason:''},data=completion({...unknownUsage?{usage:null}:{},choices:[{index:0,message:{role:'assistant',content:JSON.stringify(value)},finish_reason:'stop'}]});
   const incoming=Readable.from([Buffer.from(JSON.stringify(data))]);incoming.statusCode=200;incoming.headers={'content-type':'application/json'};callback(incoming);incoming.once('close',()=>request.emit('close'));
  }catch(error){request.destroy(error);}});};
  options.signal.addEventListener('abort',()=>request.destroy(Error('SYNTHETIC abort')),{once:true});return request;
 });
 const protocol={
  readProofs:async request=>{server.principals.set([request.principalId,request.libraryId].join('/'),server.principal(request));publication.principals.set([request.principalId,request.libraryId].join('/'),server.principal(request));const {request:_,...proofs}=server.bundle(request,{entitlement:{tier}});return proofs;},
  fetch:async request=>{
   const path=new URL(request.url).pathname,data=await request.clone().json();calls.push({path,data});
   if(dropRevocation&&path==='/api/declarations'&&data.action==='revoke')throw Error('SYNTHETIC worker lost before revocation transport');
   const response=await handlers[path](request);
   // Two original SQL protocol simulators share the rows produced by the REAL
   // signed publisher. This mirrors the shared DB, not client-asserted grants.
   if(path==='/api/declarations')for(const [id,row]of publication.rows())server.grants.set(id,row);
   if(path==='/api/provider')await afterResponse?.({server,revoke:()=>{live=false;}});
   if(path==='/api/reservations'&&data.action==='reserve'&&losses.reservation||path==='/api/provider'&&losses.provider||path==='/api/results'&&losses.result)throw Error('SYNTHETIC lost HTTP acknowledgement');
   if(path==='/api/operation-status'&&statusTransform){const value=await response.clone().json();return Response.json(await statusTransform(value),{status:response.status,headers:response.headers});}
   return response;
  }
 };
 return {server,manifest,calls,...protocol,
  profile:{contractVersion:manifest.profile.contractVersion,modelVersion:manifest.profile.model.resolutionVersion,promptVersion:await hashText(canonical(manifest.wire))},routeVersion:manifest.profile.routeVersion,clock:()=>server.now,
  readProfile:async()=>JSON.parse(JSON.stringify(manifest)),currentProfile:()=>JSON.parse(JSON.stringify(manifest)),tokenize:server.config.tokenize,isCurrentTokenizer:()=>live,
  physical:()=>physical,payload:()=>lastPayload,restoreAcks:()=>{for(const key of Object.keys(losses))losses[key]=false;},restore:()=>{live=true;},revoke:()=>{live=false;}
 };
}
