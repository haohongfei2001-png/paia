import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {setup} from '../../../extension/tests/harness/thought-m1.mjs';
import {append} from '../../../extension/tests/harness/original-complete.mjs';
import {OrganizerStore} from '../../../extension/core/organizer/store.js';
import {PromptSurfaceCommands} from '../../../extension/background/prompt-surface.js';
import {PromptReuseCommands} from '../../../extension/background/prompt-reuse-commands.js';
import {PromptReuseService} from '../../../extension/core/prompt-reuse-service.js';
import {AssistPromptCommands} from '../../../extension/background/prompt-assist.js';

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
export async function assistServiceFixture(t,{beforeResponse=null,afterResponse=null,holdProvider=null,loseReservation=false,dropRevocation=false,loseProvider=false,loseResult=false,defer=false,unknownUsage=false}={}){
 const losses={reservation:loseReservation,provider:loseProvider,result:loseResult};
 const local=await setup(OrganizerStore);await local.s.finishFoundation();
 const sender={id:'synthetic-extension',tab:{id:1},frameId:0,documentId:'synthetic-document',documentLifecycle:'active',url:'https://chatgpt.com/c/synthetic'};
 const snapshot={completed:true,text:'SYNTHETIC newly completed reply.',blocks:1,excluded:false};
 let binding={url:sender.url,conversation:'/c/synthetic',cycle:1,replyId:'reply-one',revision:1},authorization=null,ready=false;
 const nonce=crypto.randomUUID(),surfaceState={open:true,nonce,url:sender.url},frame={id:sender.id,tab:{id:1},frameId:2,documentId:'synthetic-frame',documentLifecycle:'active',url:'chrome-extension://'+sender.id+'/ui/prompt-surface.html#'+nonce};
 const sessionStorage={},listeners=new Set(),broadcasts=[],insertions=[];
 const api={runtime:{id:sender.id,getURL:p=>'chrome-extension://'+sender.id+'/'+p,sendMessage:async r=>{broadcasts.push(r);},getContexts:async()=>[{documentId:frame.documentId,tabId:1,windowId:1,frameId:2,documentUrl:frame.url,incognito:false}]},storage:{session:{get:async k=>({[k]:sessionStorage[k]}),set:async r=>{const changes=Object.fromEntries(Object.entries(r).map(([key,newValue])=>[key,{oldValue:sessionStorage[key],newValue}]));Object.assign(sessionStorage,r);for(const listener of listeners)listener(changes,'session');}},onChanged:{addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn)}},windows:{get:async()=>({focused:true,incognito:false})},tabs:{get:async()=>({id:1,windowId:1,url:sender.url,active:true,incognito:false}),query:async()=>[],sendMessage:async(_id,r)=>{
  if(r.type==='PAIA_PROMPT_SURFACE_PROBE')return {...surfaceState};
  if(r.type==='PAIA_PROMPT_SURFACE_CLOSE'){surfaceState.open=false;return {closed:true,nonce,form:'orb'};}
  if(r.type==='PAIA_PROMPT_ASSIST_PROBE')return {generation:authorization,ready:ready&&r.generation===authorization,binding:ready?structuredClone(binding):null,...(r.snapshot&&ready?{snapshot:structuredClone(snapshot)}:{})};
  if(r.type==='PAIA_PROMPT_ASSIST_INSERT'){const q=await commands.handle({type:'PAIA_PROMPT_ASSIST_QUALIFY',id:r.id,operationId:r.operationId,generation:r.generation},sender);if(!q.qualified)return {status:'failed'};insertions.push(r.text);return {status:'inserted',verified:true};}
  return {};
 }}};
 const server=providerFixture(),publication=publicationProtocol(server),calls=[];let live=true,listener=null,physical=0,lastPayload=null;
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
   const value=defer?{version:1,kind:'DEFER',reason:'NO_USEFUL_SUGGESTION',text:'',condition:''}:{version:1,kind:'SUGGESTION',text:'SYNTHETIC explain the next step.',condition:'If you want more detail.',reason:''},data=completion({...unknownUsage?{usage:null}:{},choices:[{index:0,message:{role:'assistant',content:JSON.stringify(value)},finish_reason:'stop'}]});
   const incoming=Readable.from([Buffer.from(JSON.stringify(data))]);incoming.statusCode=200;incoming.headers={'content-type':'application/json'};callback(incoming);incoming.once('close',()=>request.emit('close'));
  }catch(error){request.destroy(error);}});};
  options.signal.addEventListener('abort',()=>request.destroy(Error('SYNTHETIC abort')),{once:true});return request;
 });
 const selected=[],contextRequests=[],contextAbort=new AbortController(),contextExpires=Date.now()+600000;
 const contextProcessing={resolve:async(_t,scope)=>{contextRequests.push(structuredClone(scope));return {version:1,store:local.s,scope,epoch:'SYNTHETIC-context-processing',processing:true,expiresAt:contextExpires,revocationSignal:contextAbort.signal};},isCurrent:()=>!contextAbort.signal.aborted};
 const configuration={origin:'https://service.invalid',profile:{contractVersion:manifest.profile.contractVersion,modelVersion:manifest.profile.model.resolutionVersion,promptVersion:await hashText(canonical(manifest.wire))},routeVersion:manifest.profile.routeVersion,clock:()=>server.now,
  resolveAuthority:async(_t,r)=>({allowed:live,principalId:'SYNTHETIC-principal',libraryId:'SYNTHETIC-library',consentEpoch:'SYNTHETIC-consent',jobTypes:['AI_ASSIST'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),
  contextSelector:()=>selected,contextProcessing,
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
 let commands=new AssistPromptCommands(local.s,api,{configuration});
 const settings={id:sender.id,url:api.runtime.getURL('ui/archive.html')};
 const enable=async()=>{await commands.handle({type:'PAIA_PROMPT_ASSIST_CONFIGURE',replyAccess:true,remoteProcessing:true,expectedGeneration:(await commands.handle({type:'PAIA_PROMPT_ASSIST_STATUS'},settings)).generation},settings);authorization=(await commands.handle({type:'PAIA_PROMPT_ASSIST_STATUS'},sender)).generation;ready=true;};
 const surface=new PromptSurfaceCommands(new PromptReuseCommands(new PromptReuseService(local.s),api),api);surface.assist=commands;
 const rpc=command=>surface.handle({type:'PAIA_PROMPT_SURFACE_RPC',nonce,command},frame),run=()=>rpc({type:'assist_activate'});
 await enable();
 return {...local,server,api,sender,settings,surface,frame,surfaceState,selected,contextRequests,revokeContext:()=>contextAbort.abort(),rpc,run,enable,configuration,calls,broadcasts,insertions,snapshot,get commands(){return commands;},get binding(){return binding;},restoreAcks:()=>{for(const key of Object.keys(losses))losses[key]=false;},restore:()=>{live=true;},physical:()=>physical,payload:()=>lastPayload,
  newerReply:async()=>{await commands.handle({type:'PAIA_PROMPT_ASSIST_INVALIDATE',generation:authorization},sender);binding={...binding,replyId:'reply-'+crypto.randomUUID(),cycle:binding.cycle+1,revision:binding.revision+1};},
  restart:async()=>{commands.dispose();commands=new AssistPromptCommands(local.s,api,{configuration});surface.assist=commands;const status=await commands.handle({type:'PAIA_PROMPT_ASSIST_STATUS'},sender);authorization=status.generation;ready=false;},
  ready:value=>{ready=value;},revoke:(notify=true)=>{live=false;if(notify)listener?.();}};
}
