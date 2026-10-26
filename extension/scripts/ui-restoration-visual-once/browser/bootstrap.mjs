import * as archiveThought from './archive-thought.mjs';
import * as prompt from './prompt.mjs';
import * as settingsGap from './settings-gap.mjs';
import * as gapScenes from './gap-scenes.mjs';
import * as gapState from './gap-state.mjs';

const scene=globalThis.__PAIA_VISUAL_CONFIG.scene;
const fixture=archiveThought.fixture;
gapState.configureGapState(scene,fixture);
const topics=fixture?.topics||[],inputs=fixture?.inputs||[];
const contextItems=[
 {id:'visual-context-info',card:'info',section:'补充信息',body:'我正在整理自己的学习笔记，希望保留原本表达的细节。'},
 {id:'visual-context-rules',card:'rules',section:'工作方式',body:'先给出清晰结论，再解释依据；不确定的地方请直接说明。'},
 {id:'visual-context-now',card:'now',section:'阶段重点',body:'这个阶段专注于阅读、写作，以及让已有想法逐渐形成结构。'}
].map((item,index)=>({...item,revision:1,order:index,lifecycle:'active',createdAt:'2026-10-25T08:00:00.000Z',updatedAt:'2026-10-25T08:00:00.000Z'}));
const sections=topics.map(t=>t.sections?.length??2);
globalThis.__paiaVisualFixtureLimits={topics:topics.length,sectionsPerTopic:sections,inputsTotal:inputs.length,contextItems:contextItems.length,syntheticOnly:true,effectiveExternalAccess:false,syntheticContextChoiceStates:true,realAccounts:0,providers:0};
globalThis.__paiaVisualRPCLog=[];
function fail(message){globalThis.__paiaVisualFatal=String(message);throw Error(message);}
if(!fixture||topics.length>8||inputs.length>12||sections.some(n=>n>2)||contextItems.length>3)fail('FIXTURE_LIMIT_OR_IDENTITY_FAILURE');
const off={enabled:false,revision:0};
const access=Object.fromEntries(['global','info','rules','now','inputs'].map(key=>[key,{...off}]));
const handled=data=>({handled:true,data});
async function ownRPC(message){
 switch(message.type){
  case 'PAIA_CONTEXT_CARDS_SNAPSHOT':return handled({epoch:'visual-context-epoch',access,counts:{info:1,rules:1,now:1,inputs:topics.length},items:message.mode==='home'?[]:contextItems,connections:0,connectionStatus:{available:false,reason:'not-configured',connections:[]},capabilities:{inputs:true,external:false},maintenance:{available:false},topicChoices:{available:true,selectedCount:0,selectedNames:[]}});
  case 'PAIA_CONTEXT_TOPICS_PAGE':return handled({available:true,version:1,externalAllowed:false,epoch:'visual-context-epoch',authority:'visual-topic-authority',items:topics.map(t=>({topicId:t.id,name:t.name,enabled:false,revision:0,canEnable:false,canDisable:false,policyAllowed:false,externalAllowed:false})),complete:true,nextCursor:null,selectedCount:0});
  case 'GET_ONBOARDING':return handled({step:'done'});
  case 'FILTER_STATUS':return handled({mode:'off'});
  case 'FILTER_NOTICE':return handled({show:false});
  case 'PAIA_AI_FILTER_STATUS':return handled({optIn:false,remoteProcessing:false,generation:'visual-filter-generation',phase:'off'});
  case 'IMPORT_LATEST':return handled({lastImport:null});
  case 'IMPORT_TASKS':return handled({tasks:[],nextCursor:null});
  case 'GET_MIGRATION_STATUS':return handled({phase:'active',verified:false,recoveryVerified:false,recordCount:12,blockCount:12});
  case 'PAIA_MEMORY_STATUS':return handled({config:{localOnly:true,externalAccess:false}});
  case 'PAIA_ARCHIVE_ARRIVAL_READY':return handled(null);
  case 'PAIA_CONTEXT_CARDS_DRAFTS':return handled([]);
  case 'PAIA_RECOVERY_DRAFT_LOAD':return handled(null);
  case 'PAIA_RECOVERY_DRAFT_LIST':return handled([]);
  case 'PAIA_RECOVERY_DRAFT_PRUNE':return handled({removed:0});
  case 'PAIA_PROMPT_NEXT_STATUS':return handled({enabled:false,generation:'visual-next-generation'});
  case 'PAIA_PROMPT_ASSIST_STATUS':return handled({replyAccess:false,remoteProcessing:false,generation:'visual-assist-generation',serviceAvailable:false});
  case 'PAIA_MAINTENANCE_PROCESSING_STATUS':return handled({enabled:false,savedEnabled:false,generation:'visual-maintenance-generation',phase:'off',serviceAvailable:false});
  case 'PAIA_PROMPT_SURFACE_SETTINGS_STATUS':return handled({status:'ready',position:'default'});
  case 'PAIA_SETTINGS_AI_STYLE':return handled({available:true,value:'balanced',revision:0,explicit:false,epoch:'visual-style-epoch'});
  case 'PAIA_SETTINGS_UPDATE_STATUS':return handled({state:'unknown',version:globalThis.__PAIA_VISUAL_CONFIG.version});
  case 'PAIA_SYNC_STATUS':return handled({version:1,productionActivation:false,state:'unavailable',reason:'provider-not-configured'});
  default:return null;
 }
}
globalThis.__paiaVisualRPC=async message=>{
 if(!message||typeof message.type!=='string')fail('INVALID_SYNTHETIC_RPC');
 const log={type:message.type,...(message.command?{command:message.command.type||message.command}:{}),at:performance.now()};globalThis.__paiaVisualRPCLog.push(log);
 if(globalThis.__paiaVisualRPCLog.length>1000)fail('SYNTHETIC_RPC_BUDGET_EXCEEDED');
 try{
  for(const responder of [settingsGap.fixtureRPC,gapState.fixtureRPC,prompt.fixtureRPC,ownRPC,archiveThought.fixtureRPC]){
   if(typeof responder!=='function')continue;const response=await responder(message,{scene,fixture});
   if(response?.handled){
    log.handled=true;
    if(response.expectedFailure){
     const allowed=(scene.id==='context-now-leave-blocked'&&message.type==='PAIA_CONTEXT_CARDS_CHANGE'&&response.expectedFailure.error==='UNAVAILABLE')||(scene.id==='thought-dirty-section-cancel'&&message.type==='CONTINUE_THINKING'&&response.expectedFailure.error==='UNAVAILABLE')||(['nib-long-notice','nib-long-notice-narrow','nib-copy-failure'].includes(scene.id)&&message.type==='PAIA_PROMPT_SURFACE_RPC'&&message.command?.type==='PAIA_PROMPT_SELECTION_INSERT'&&response.expectedFailure.error==='UNAVAILABLE'&&response.expectedFailure.boundary==='synthetic_no_receiver');
     if(!allowed)fail('UNDECLARED_EXPECTED_FAILURE');log.expectedFailure=response.expectedFailure.error;if(response.expectedFailure.boundary)log.boundary=response.expectedFailure.boundary;return {ok:false,error:response.expectedFailure.error};
    }
    return {ok:true,data:structuredClone(response.data)};
   }
  }
  fail('UNHANDLED_SYNTHETIC_RPC: '+message.type);
 }catch(error){globalThis.__paiaVisualFatal??=String(error);return {ok:false,error:'VISUAL_FIXTURE_REFUSED'};}
};
async function waitFor(predicate,ms=7000){const end=performance.now()+ms;while(!predicate()){if(globalThis.__paiaVisualFatal)throw Error(globalThis.__paiaVisualFatal);if(performance.now()>end)throw Error('SOURCE_OWNER_READY_TIMEOUT');await new Promise(r=>setTimeout(r,25));}}
try{
 let result;
 if(scene.group==='prompt')result=await prompt.prepareScene(scene,{owners:null,fixture});
 else{
  await import('/ui/archive.js');const owners=globalThis.__paiaVisualOwners;
  if(!owners)throw Error('ACTUAL_SOURCE_OWNER_BRIDGE_MISSING');
  await waitFor(()=>owners.getState());
  result=await settingsGap.prepareScene(scene,{owners,fixture})||await gapScenes.prepareScene(scene,{owners,fixture});
 }
 if(!result?.handled){globalThis.__paiaVisualResult={status:'NOT_RUN',reason:'No source adapter supports '+scene.id};}
 else globalThis.__paiaVisualResult={status:'READY',...result};
}catch(error){globalThis.__paiaVisualFatal=String(error.stack||error);}
