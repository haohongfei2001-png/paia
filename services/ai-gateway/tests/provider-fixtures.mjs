import {EventEmitter} from 'node:events';
import {Pool} from 'pg';
import {createHash} from 'node:crypto';
import {fixture as identityFixture} from './service-fixtures.mjs';
import {request} from './postgres-fixtures.mjs';
import {canonical} from '../../../extension/core/ai-usage/contracts.js';
import {clientDeclarationHash} from '../client-declaration.mjs';
import {requestBindingHash} from '../signed-identity.mjs';
import {createPostgresReservationService} from '../reservation-service.mjs';
import {createPostgresProviderRunner} from '../provider-runner.mjs';

const digest=v=>createHash('sha256').update(canonical(v)).digest('hex');
const clone=structuredClone;
// Protocol fixture, NOT PostgreSQL locking/role evidence. The shared mutex is
// explicitly a deterministic simulation. All identities/keys/content are fake.
export function providerFixture({hook,after,at}={}){
 const f=identityFixture(at);let saved=null,events=new Map(),clock=f.now,tail=Promise.resolve(),connected=0;
 const grants=new Map(),principals=new Map(),calls=[],released=[];
 function makePool(role){const pool=new Pool();pool.connect=async()=>{
  connected++;const client=new EventEmitter();let pending,pendingEvents,unlock,hasLock=false;
  const save=()=>{saved=clone(pending);events=clone(pendingEvents);};
  client.query=async(sql,args=[])=>{
   calls.push({role,sql,args});
   if(sql.startsWith('SELECT schema_version')){
    const old=tail;tail=new Promise(r=>{unlock=r;});await old;hasLock=true;pending=clone(saved);pendingEvents=clone(events);
   }
   const context={role,sql,args,save,client,setClock:value=>clock=value,now:clock};
   const override=await hook?.(context);let result;
   if(override)result=override;
   else if(sql.startsWith('SELECT schema_version'))result={rows:[{schema_version:1,snapshot:pending}]};
   else if(sql.includes('SELECT c.relrowsecurity'))result={rows:[{relrowsecurity:true,relforcerowsecurity:true,rolsuper:false,rolbypassrls:false,is_owner:false}]};
   else if(sql.includes('SELECT c.relname'))result={rows:args[0].map(relname=>({relname,relrowsecurity:true,relforcerowsecurity:true,rolsuper:false,rolbypassrls:false,is_owner:false,can_mutate:false,unsafe_privileges:role!=='publisher'}))};
   else if(sql.includes('FROM paia_ai_private.service_control'))result={rows:[clone(f.control)]};
   else if(sql.includes('FROM paia_ai_private.principal_authority'))result={rows:principals.has(args.join('/'))?[clone(principals.get(args.join('/')))]:[]};
   else if(sql.includes('FROM paia_ai_private.route_authority'))result={rows:[clone(f.routeRow)]};
   else if(sql.includes('FROM paia_ai_private.request_authority'))result={rows:grants.has(args[0])?[clone(grants.get(args[0]))]:[]};
   else if(sql.startsWith('SELECT operation_id FROM paia_ai_private.operation_evidence'))result={rows:[...(pendingEvents??events).values()].filter(e=>e.event==='DISPATCHED'&&args[0].includes(e.operation_id)).map(e=>({operation_id:e.operation_id}))};
   else if(sql.startsWith('SELECT event_id'))result={rows:[...(pendingEvents??events)].filter(([,e])=>e.operation_id===args[0]).map(([event_id])=>({event_id}))};
   else if(sql.includes('FROM paia_ai_private.operation_evidence'))result={rows:(pendingEvents??events).has(args[0])?[clone((pendingEvents??events).get(args[0]))]:[]};
   else if(sql.startsWith('SELECT floor'))result={rows:[{now_ms:String(clock)}]};
   else if(sql.includes('INSERT INTO paia_ai_private.operation_evidence')){
    if(role!=='publisher')throw Error('fixture privilege denial');
    if(clock<args[5]||clock>=args[6]||pendingEvents.has(args[0]))result={rows:[]};
    else{pendingEvents.set(args[0],{operation_id:args[1],request_hash:args[2],event:args[3],evidence:null,expires_at_ms:String(args[4])});result={rows:[{event_id:args[0]}]};}
   }else if(sql.startsWith('WITH publication')){
    if(role!=='ledger')throw Error('fixture privilege denial');
    if(clock<args[3]||clock>=args[4])result={rowCount:0};
    else{pending=JSON.parse(args[0]);pending.lastNow=clock;result={rowCount:1};}
   }else if(sql==='COMMIT'){save();result={rows:[]};}
   else result={rows:[]};
   await after?.({...context,result});return result;
  };
  client.release=discard=>{released.push({role,discard});if(hasLock){hasLock=false;unlock();}};return client;
 };return pool;}
 const reservationPool=makePool('ledger'),evidencePool=makePool('publisher');
 const r=request('SYNTHETIC-child',{jobType:'AI_ASSIST',inputTokens:100,outputCap:600,maxCompletionTokens:590});
 const schema={type:'object',properties:{action:{type:'string',minLength:1,maxLength:10,enum:['KEEP','DEFER']}},required:['action'],additionalProperties:false};
 const profile={version:1,kind:'synthetic-request-profile-v1',id:'SYNTHETIC-provider-profile',jobType:r.jobType,contractVersion:r.contractVersion,routeVersion:r.routeVersion,
  endpoint:{host:'synthetic.us-east-1.maas.aliyuncs.com',region:'us-east-1',deployment:'SYNTHETIC-deployment'},
  model:{requested:'SYNTHETIC-qwen',resolutionVersion:'SYNTHETIC-resolution',responseAllowlist:['SYNTHETIC-qwen']},apiProfileId:'SYNTHETIC-api',
  usageProfile:{version:1,shape:'compatible-direct-v1',cacheMode:'implicit',reasoningAbsence:'qualified-zero-nonthinking',creationAbsence:'qualified-zero-no-markers',cachedAbsence:'reject'},
  thinking:{enabled:false,control:'none',thinkingBudget:null,requestedMaxCompletionTokens:590,overshootHeadroom:10},tokenizerProfileId:'SYNTHETIC-tokenizer',decodingPolicyId:'SYNTHETIC-decoder',responseSchemaDigest:digest(schema),qualityReceiptRefs:['SYNTHETIC-NOT-QUALIFIED'],
  qualifiedLimits:{maxBytes:262144,maxFrames:128,maxDepth:12,maxKeys:2048,maxStringBytes:65536,inputTokens:4000,billableOutputCap:600},validity:{verifiedAt:f.now,expiresAt:f.now+60000,revoked:false}};
 profile.endpoint.path='/compatible-mode/v1/chat/completions';
 const correspondence=['id','jobType','contractVersion','routeVersion','endpoint','model','apiProfileId','usageProfile','tokenizerProfileId','decodingPolicyId','responseSchemaDigest','qualityReceiptRefs'];
 const known={...Object.fromEntries(correspondence.map(k=>[k,clone(profile[k])])),thinkingControl:'none'};
 const route={...f.routeRow.facts.route,provider:'qwen',model:profile.model.requested,resolutionVersion:profile.model.resolutionVersion,region:profile.endpoint.region,deployment:profile.endpoint.deployment,api:'chat-completions',profile:profile.apiProfileId,tokenizer:profile.tokenizerProfileId};
 f.routeRow.facts.route=clone(route);f.routeRow.facts.book.route=clone(route);
 const manifest={version:1,profile,known,route,wire:{instructions:'SYNTHETIC instructions only. Return bounded action.',responseFormat:{type:'json_schema',json_schema:{name:'SYNTHETIC-schema',strict:true,schema}},thinkingControls:{enable_thinking:false}},tokenizer:{profileId:profile.tokenizerProfileId,qualificationRef:'SYNTHETIC-NOT-QUALIFIED',protocolOverheadTokens:20,maxWireBytes:262144}};
 const childIdentity={logicalJobId:r.jobId,childOperationId:r.operationId,type:r.jobType,contractVersion:r.contractVersion,routeVersion:r.routeVersion,automaticRetries:0};
 const payload={version:1,text:'SYNTHETIC_PRIVATE_BODY'},payloadDigest=digest(payload),authorizationId='SYNTHETIC-auth';
 const declaration={version:1,requestHash:requestBindingHash(r),payloadDigest,scopeDigest:digest({childIdentity,reservationRequest:r,authorizationId}),contentGeneration:payloadDigest,consentEpoch:r.consentEpoch,authorizationId,expiresAt:f.now+50000};
 const input={bundle:f.bundle(r),declaration,childIdentity,payload,stream:false};
 grants.set(r.operationId,{...f.grant(r),generation:clientDeclarationHash(declaration)});principals.set([r.principalId,r.libraryId].join('/'),f.principal(r));
 const tokenize=async q=>({profileId:q.profileId,tokenizerProfileId:q.tokenizerProfileId,qualificationRef:q.qualificationRef,requestDigest:q.requestDigest,contentTokens:80,protocolOverheadTokens:20,inputTokens:100,expiresAt:f.now+50000});
 const config={enabled:true,reservationPool,evidencePool,identityConfig:f.identityConfig,profileId:f.profileId,maxConcurrent:2,manifest,tokenize,isCurrent:()=>true,providerCredential:'SYNTHETIC-NOT-A-KEY'};
 // The reservation service consumes its sole pool name, never the runner pair.
 const actualService=createPostgresReservationService({...config,pool:reservationPool});
 return {...f,config,input,manifest,reservationPool,evidencePool,grants,principals,calls,released,
  service:actualService,runner:patch=>createPostgresProviderRunner({...config,...patch}),
  reserve:()=>actualService.reserve(input.bundle),saved:()=>clone(saved),events:()=>clone(events),
  setClock:v=>clock=v,setSaved:v=>saved=clone(v),connected:()=>connected};
}
export function completion(overrides={}){return {id:'SYNTHETIC-response',model:'SYNTHETIC-qwen',object:'chat.completion',choices:[{index:0,message:{role:'assistant',content:'{"action":"KEEP"}'},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:20,total_tokens:120,prompt_tokens_details:{cached_tokens:0,cache_creation_input_tokens:0},completion_tokens_details:{reasoning_tokens:0}},...overrides};}
export function sseCompletion(){
 const c=completion(),base={id:c.id,model:c.model,object:'chat.completion.chunk'};
 return [{...base,choices:[{index:0,delta:{role:'assistant',content:'{"action":"KEEP"}'},finish_reason:null}],usage:null},{...base,choices:[{index:0,delta:{},finish_reason:'stop'}],usage:null},{...base,choices:[],usage:c.usage}].map(v=>'data: '+JSON.stringify(v)+'\n\n').join('')+'data: [DONE]\n\n';
}
