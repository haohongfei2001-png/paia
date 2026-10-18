import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {filterMaintenanceFixture} from './maintenance-filter-fixture.mjs';
import {MAINTENANCE_SERVICE_FILTER_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_FILTER_INSTRUCTIONS} from '../../../extension/core/ai-usage/maintenance-service-response-schema.js';
import {createConfiguredMaintenanceSession} from '../../../extension/core/ai-usage/configured-maintenance-session.js';
import {createMaintenanceRunner} from '../../../extension/core/ai-usage/maintenance-runner.js';
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
// Actual signed identity/declaration/HTTP/ledger/provider/domain owners. Only
// SQL transactions and Qwen HTTPS are simulated; not live PostgreSQL evidence.
export async function sourceFilterFixture(t,{tier='pro',decision='FILTER',filterOptions={},loseReservation=false,loseProvider=false,loseResult=false,beforeSend=null,afterResponse=null,configure=null,responsePatch=null}={}){
 const local=await filterMaintenanceFixture({...filterOptions,decision});local.session.dispose();
 const server=providerFixture(),publication=publicationProtocol(server),calls=[];let live=true,listener=null,physical=0;
 const schema=structuredClone(MAINTENANCE_SERVICE_FILTER_RESPONSE_SCHEMA),manifest=server.manifest,payloads=[];
 manifest.profile.jobType='AI_MAINTENANCE';manifest.known.jobType='AI_MAINTENANCE';manifest.profile.contractVersion='synthetic-aiu-1';manifest.known.contractVersion='synthetic-aiu-1';manifest.profile.routeVersion='synthetic-maintenance-1';manifest.known.routeVersion='synthetic-maintenance-1';
 manifest.wire.instructions=MAINTENANCE_SERVICE_FILTER_INSTRUCTIONS;manifest.wire.responseFormat.json_schema.schema=schema;manifest.profile.responseSchemaDigest=await hashText(canonical(schema));manifest.known.responseSchemaDigest=manifest.profile.responseSchemaDigest;
 manifest.profile.qualifiedLimits.inputTokens=12000;manifest.profile.qualifiedLimits.billableOutputCap=2000;manifest.profile.thinking.requestedMaxCompletionTokens=1990;
 const publisher=publication.publisher(),runner=server.runner(),resultService=createPostgresResultService({...server.config,pool:server.reservationPool}),statusService=createPostgresOperationStatusService({...server.config,pool:server.reservationPool});
 const handlers={'/api/declarations':createDeclarationHandler({publisher}),'/api/reservations':createGatewayHandler({service:server.service}),'/api/provider':createProviderHandler({resolveRunner:()=>({runner,isCurrent:()=>true})}),'/api/results':createResultHandler({service:resultService}),'/api/operation-status':createOperationStatusHandler({service:statusService})};
 t.mock.method(https,'request',(options,callback)=>{
  physical++;assert.equal(options.hostname,manifest.profile.endpoint.host);const req=new EventEmitter();let done=false;
  req.destroy=e=>{if(!done){done=true;queueMicrotask(()=>{req.emit('error',e);req.emit('close');});}return req;};
  req.end=body=>{const payload=JSON.parse(JSON.parse(body).messages[1].content);queueMicrotask(async()=>{try{await beforeSend?.({payload,local,server});if(done)return;const seeded=await local.provider.execute(payload);const strip=v=>{if(v&&typeof v==='object'){delete v.field;for(const x of Object.values(v))strip(x);}};strip(seeded.fixture.topicAssessment);const value={filter:seeded.fixture.filterDecisions,version:1,logicalJobId:payload.logicalJobId,childOperationId:payload.childOperationId,topic:seeded.fixture.topicAssessment,context:Array.from({length:Math.ceil(payload.material.inputs.length/16)},(_,i)=>({operation:'ADD',card:'info',body:'SYNTHETIC source mapped context '+i,section:'Synthetic source context',inputIds:payload.material.inputs.slice(i*16,(i+1)*16).map(x=>x.inputId)}))};payloads.push(structuredClone(payload));await responsePatch?.(value,{payload,local,server});done=true;
   const incoming=Readable.from([Buffer.from(JSON.stringify(completion({choices:[{index:0,message:{role:'assistant',content:JSON.stringify(value)},finish_reason:'stop'}]})))]);incoming.statusCode=200;incoming.headers={'content-type':'application/json'};callback(incoming);incoming.once('close',()=>req.emit('close'));}catch(error){req.destroy(error);}});};
  options.signal.addEventListener('abort',()=>req.destroy(Error('SYNTHETIC abort')),{once:true});return req;
 });
 const {responseAdapter:unused,...service}=local.service;
 const configuration={origin:'https://service.invalid',scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1',service,processing:local.materialProcessing,clock:()=>server.now,
  resolveAuthority:async(_t,r)=>({allowed:live,principalId:'SYNTHETIC-principal',libraryId:'SYNTHETIC-library',consentEpoch:'SYNTHETIC-consent',jobTypes:['AI_MAINTENANCE'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),isCurrent:()=>live,onInvalidate:fn=>{listener=fn;return ()=>{listener=null;};},
  readProfile:async()=>structuredClone(manifest),currentProfile:()=>structuredClone(manifest),tokenize:server.config.tokenize,isCurrentTokenizer:()=>live,
  readProofs:async request=>{server.principals.set([request.principalId,request.libraryId].join('/'),server.principal(request));publication.principals.set([request.principalId,request.libraryId].join('/'),server.principal(request));const {request:_,...proofs}=server.bundle(request,{entitlement:{tier}});return proofs;},
  fetch:async request=>{const path=new URL(request.url).pathname,data=await request.clone().json();calls.push({path,data});const response=await handlers[path](request);if(path==='/api/declarations')for(const [id,row]of publication.rows())server.grants.set(id,row);if(path==='/api/provider')await afterResponse?.({local,server,revoke:()=>{live=false;}});if(path==='/api/reservations'&&data.action==='reserve'&&loseReservation||path==='/api/provider'&&loseProvider||path==='/api/results'&&loseResult)throw Error('SYNTHETIC lost acknowledgement');return response;}
 };
 await configure?.({local,configuration,server});const session=createConfiguredMaintenanceSession(local.s,configuration);
 return {...local,server,configuration,session,calls,payloads,run:()=>session.opportunity(),runner:()=>createMaintenanceRunner(local.s,configuration),physical:()=>physical,revoke:()=>{live=false;listener?.();}};
}
