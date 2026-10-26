import {setup} from '../../../extension/tests/harness/thought-m1.mjs';
import {append} from '../../../extension/tests/harness/original-complete.mjs';
import {OrganizerStore} from '../../../extension/core/organizer/store.js';
import {PromptSurfaceCommands} from '../../../extension/background/prompt-surface.js';
import {PromptReuseCommands} from '../../../extension/background/prompt-reuse-commands.js';
import {PromptReuseService} from '../../../extension/core/prompt-reuse-service.js';
import {AssistPromptCommands} from '../../../extension/background/prompt-assist.js';

import {assistSignedServiceFixture} from './assist-signed-service-fixture.mjs';
// Actual signed issuers + actual HTTP parsers/owners/ledger. SQL locking is the
// existing deterministic protocol simulator, NOT real PostgreSQL evidence.
// Only the external HTTPS completion is synthetic; no callback makes a receipt.
export async function assistServiceFixture(t,{beforeResponse=null,afterResponse=null,holdProvider=null,loseReservation=false,dropRevocation=false,loseProvider=false,loseResult=false,defer=false,unknownUsage=false,condition='',tier='pro',statusTransform=null}={}){
 const local=await setup(OrganizerStore);await local.s.finishFoundation();
 const sender={id:'synthetic-extension',tab:{id:1},frameId:0,documentId:'synthetic-document',documentLifecycle:'active',url:'https://chatgpt.com/c/synthetic'};
 const snapshot={completed:true,text:'SYNTHETIC newly completed reply.',blocks:1,excluded:false};
 let binding={url:sender.url,conversation:'/c/synthetic',cycle:1,replyId:'reply-one',revision:1},authorization=null,ready=false;
 const nonce=crypto.randomUUID(),surfaceState={open:true,nonce,url:sender.url},frame={id:sender.id,tab:{id:1},frameId:2,documentId:'synthetic-frame',documentLifecycle:'active',url:'chrome-extension://'+sender.id+'/ui/prompt-surface.html#'+nonce};
 const sessionStorage={},localStorage={},listeners=new Set(),broadcasts=[],insertions=[];
 const api={runtime:{id:sender.id,getURL:p=>'chrome-extension://'+sender.id+'/'+p,sendMessage:async r=>{broadcasts.push(r);},getContexts:async()=>[{documentId:frame.documentId,tabId:1,windowId:1,frameId:2,documentUrl:frame.url,incognito:false}]},storage:{local:{get:async k=>({[k]:localStorage[k]}),set:async r=>{const changes=Object.fromEntries(Object.entries(r).map(([key,newValue])=>[key,{oldValue:localStorage[key],newValue}]));Object.assign(localStorage,r);for(const listener of listeners)listener(changes,'local');}},session:{get:async k=>({[k]:sessionStorage[k]}),set:async r=>{const changes=Object.fromEntries(Object.entries(r).map(([key,newValue])=>[key,{oldValue:sessionStorage[key],newValue}]));Object.assign(sessionStorage,r);for(const listener of listeners)listener(changes,'session');}},onChanged:{addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn)}},windows:{get:async()=>({focused:true,incognito:false})},tabs:{get:async()=>({id:1,windowId:1,url:sender.url,active:true,incognito:false}),query:async()=>[],sendMessage:async(_id,r)=>{
  if(r.type==='PAIA_PROMPT_SURFACE_PROBE')return {...surfaceState};
  if(r.type==='PAIA_PROMPT_SURFACE_CLOSE'){surfaceState.open=false;return {closed:true,nonce,form:'orb'};}
  if(r.type==='PAIA_PROMPT_ASSIST_PROBE')return {generation:authorization,ready:ready&&r.generation===authorization,binding:ready?structuredClone(binding):null,...(r.snapshot&&ready?{snapshot:structuredClone(snapshot)}:{})};
  if(r.type==='PAIA_PROMPT_ASSIST_INSERT'){const q=await commands.handle({type:'PAIA_PROMPT_ASSIST_QUALIFY',id:r.id,operationId:r.operationId,generation:r.generation},sender);if(!q.qualified)return {status:'failed'};insertions.push(r.text);return {status:'inserted',verified:true};}
  return {};
 }}};
 const signed=await assistSignedServiceFixture(t,{beforeResponse,afterResponse:async value=>afterResponse?.({...value,configuration}),holdProvider,loseReservation,dropRevocation,loseProvider,loseResult,defer,unknownUsage,condition,tier,statusTransform}),{server,manifest,calls}=signed;let listener=null;
 const selected=[],contextRequests=[],contextAbort=new AbortController(),contextExpires=Date.now()+600000;let contextEpoch='SYNTHETIC-context-processing';
 const contextProcessing={resolve:async(_t,scope)=>{contextRequests.push(structuredClone(scope));return {version:1,store:local.s,scope,epoch:contextEpoch,processing:true,expiresAt:contextExpires,revocationSignal:contextAbort.signal};},isCurrent:receipt=>receipt.epoch===contextEpoch&&!contextAbort.signal.aborted};
 const configuration={origin:'https://service.invalid',profile:signed.profile,routeVersion:signed.routeVersion,clock:signed.clock,
  resolveAuthority:async(_t,r)=>({allowed:signed.isCurrentTokenizer(),principalId:'SYNTHETIC-principal',libraryId:'SYNTHETIC-library',consentEpoch:'SYNTHETIC-consent',jobTypes:['AI_ASSIST'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),
  contextSelector:()=>selected,contextProcessing,
  onInvalidate:fn=>{listener=fn;return ()=>{};},
  readProfile:signed.readProfile,currentProfile:signed.currentProfile,tokenize:signed.tokenize,isCurrentTokenizer:signed.isCurrentTokenizer,readProofs:signed.readProofs,fetch:signed.fetch
 };
 let commands=new AssistPromptCommands(local.s,api,{configuration});
 const settings={id:sender.id,url:api.runtime.getURL('ui/archive.html')};
 const enable=async()=>{await commands.handle({type:'PAIA_PROMPT_ASSIST_CONFIGURE',consentVersion:2,replyAccess:true,remoteProcessing:true,expectedGeneration:(await commands.handle({type:'PAIA_PROMPT_ASSIST_STATUS'},settings)).generation},settings);authorization=(await commands.handle({type:'PAIA_PROMPT_ASSIST_STATUS'},sender)).generation;ready=true;};
 const surface=new PromptSurfaceCommands(new PromptReuseCommands(new PromptReuseService(local.s),api),api);surface.assist=commands;
 const rpc=command=>surface.handle({type:'PAIA_PROMPT_SURFACE_RPC',nonce,command},frame),run=async()=>{await commands.handle({type:'PAIA_PROMPT_ASSIST_READY',generation:authorization},sender);const value=await rpc({type:'assist_current'});if(!value.result)throw Object.assign(Error('NO_CURRENT_SUGGESTION'),{code:'UNAVAILABLE'});return value.result;};
 await enable();
 return {...local,server,api,sender,settings,surface,frame,surfaceState,selected,contextRequests,revokeContext:()=>contextAbort.abort(),advanceContextAuthority:()=>{contextEpoch='SYNTHETIC-'+crypto.randomUUID();},rpc,run,enable,configuration,calls,broadcasts,insertions,snapshot,get commands(){return commands;},get binding(){return binding;},restoreAcks:signed.restoreAcks,restore:signed.restore,physical:signed.physical,payload:signed.payload,
  newerReply:async()=>{await commands.handle({type:'PAIA_PROMPT_ASSIST_INVALIDATE',generation:authorization},sender);binding={...binding,replyId:'reply-'+crypto.randomUUID(),cycle:binding.cycle+1,revision:binding.revision+1};},
  restart:async()=>{commands.dispose();commands=new AssistPromptCommands(local.s,api,{configuration});surface.assist=commands;const status=await commands.handle({type:'PAIA_PROMPT_ASSIST_STATUS'},sender);authorization=status.generation;ready=false;},
  ready:value=>{ready=value;},revoke:(notify=true)=>{signed.revoke();if(notify)listener?.();}};
}
