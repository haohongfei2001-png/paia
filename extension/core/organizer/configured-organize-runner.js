import {LocalOrganizeSession} from './local-organize-session.js';
import {createOrganizeServiceClient} from '../ai-usage/organize-service-client.js';
import {readOrganizeServiceConfiguration} from '../ai-usage/organize-service-configuration.js';
import {aiPresentationStatus} from './ai-presentation.js';
import {exact,opaque,token,fail} from '../ai-usage/contracts.js';
// The original worker RPC owns this adapter. No public argument supplies a
// profile, provider, identity, allowance, endpoint or remote-processing grant.
export function createConfiguredOrganizeRunner(store,configuration=readOrganizeServiceConfiguration()){
 const service=createOrganizeServiceClient(configuration),session=service?new LocalOrganizeSession(store,{...service.sessionOptions,service}):null;
 let active=null,last=null;const actions=new Map();
 service?.onInvalidate(()=>{if(active)active.stopped=true;session.dispose();});
 const runner={
  available:()=>service?.available()===true,
  async reconcileInterrupted(){/* No paid restart/resume. Original flight blocks unresolved operations. */},
  async status(options={}){const result=await aiPresentationStatus(store,options,service?.sessionOptions.profile??null),state=active??last;return {...result,serviceAvailable:runner.available(),runtime:state&&(!options.topicId||options.topicId===state.topicId)?{topicId:state.topicId,phase:state.phase,state:state.state,errorCode:state.error??null,requestCount:state.requestCount??0}:result.runtime};},
  async scope(options){if(!runner.available())fail('AI_SERVICE_UNAVAILABLE');exact(options,['topicId']);if(!opaque(options.topicId))fail();return session.scope(options);},
  wake(request){return runner.handle({type:'UPDATE_AI_PRESENTATION',...request});},
  async stop({topicId=null}={}){if(topicId!==null&&active?.topicId!==topicId)return {error:'STALE_BASE'};if(!active)return {stopped:true};active.stopped=true;const result=active.handle?await session.stop(active.handle):null;return {stopped:true,state:result?.state??'CANCELLED_BEFORE_DISPATCH'};},
  async handle(request){
   if(!runner.available())fail('AI_SERVICE_UNAVAILABLE');
   if(request?.type==='GET_AI_PRESENTATION_SCOPE'){exact(request,['type','options']);return runner.scope(request.options);}
   if(request?.type!=='UPDATE_AI_PRESENTATION')fail();
   exact(request,['type','topicId','userActionId','scopeBinding']);const {topicId,userActionId,scopeBinding}=request;
   if(!opaque(topicId)||!opaque(userActionId)||!token(scopeBinding))fail();
   if(active)fail('REQUEST_ALREADY_IN_FLIGHT');
   const existing=actions.get(userActionId);if(existing&&(existing.topicId!==topicId||existing.scopeBinding!==scopeBinding))fail('STALE_BASE');
   if(!existing&&actions.size>=64)fail('UNAVAILABLE');
   const state=existing??{topicId,scopeBinding,phase:'preparing',state:'preparing',requestCount:0,handle:null};active=state;actions.set(userActionId,state);
   try{
    if(!state.handle)state.handle=await session.prepare({topicId,children:'auto',scopeBinding});
    if(state.stopped){if(state.handle.jobId)await session.stop(state.handle);fail('CANCELLED');}
    if(['NO_DELTA','DEFER'].includes(state.handle.state)){state.state=state.handle.state;state.phase='completed';return {completed:state.state==='NO_DELTA',noDelta:state.state==='NO_DELTA',topicId,requestCount:0,...(state.state==='DEFER'?{error:'UNAVAILABLE'}:{})};}
    state.phase='running';state.state='running';const result=await session.run(state.handle),status=await session.status(state.handle);state.state=result.state;state.requestCount=(status.attempts??[]).reduce((n,r)=>n+r.attemptCount,0);
    if(!['COMMITTED','CACHED'].includes(result.state)){state.error=result.state==='OUTCOME_UNKNOWN'?'OUTCOME_UNKNOWN':'UNAVAILABLE';state.phase='stopped';return {error:state.error,phase:state.phase,requestCount:state.requestCount};}
    state.phase='completed';const current=await aiPresentationStatus(store,{topicId},service.sessionOptions.profile);return {completed:true,topicId,requestCount:state.requestCount,cached:result.state==='CACHED',candidateCreated:!!current.topics[0]?.candidate};
   }catch(error){state.error=error.code??'UNAVAILABLE';state.phase='stopped';if(state.handle?.jobId)try{const status=await session.status(state.handle);state.state=status.state;state.requestCount=status.attempts.reduce((n,r)=>n+r.attemptCount,0);}catch{}return {error:state.error,phase:state.phase,requestCount:state.requestCount};}
   finally{last=state;active=null;}
  }
 };
 return Object.freeze(runner);
}
