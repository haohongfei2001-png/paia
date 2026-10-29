// Synthetic read boundary for the published Settings Sync detail only.
// No production controller/DOM replacement; no Sync engine or store-switch guard.
export const syncRecoverySceneIds=Object.freeze([
 'settings-sync-prepared','settings-sync-outcome-unknown',
 'settings-sync-finishing','settings-sync-read-close-reopen'
]);
export const anticipatedRPC=Object.freeze(['PAIA_GENERATION_STATUS']);
export const controlKeys=Object.freeze(['release-stale-selected','arm-next-status-failure']);
const scenes={
 'settings-sync-prepared':{state:'prepared',width:1280,height:900,theme:'light'},
 'settings-sync-outcome-unknown':{state:'outcome-unknown',width:390,height:844,theme:'dark'},
 'settings-sync-finishing':{state:'finishing',width:390,height:844,theme:'light'},
 'settings-sync-read-close-reopen':{state:null,width:1280,height:900,theme:'light'}
};
const heldScene='settings-sync-read-close-reopen';
const known=scene=>syncRecoverySceneIds.includes(scene?.id);
const need=(condition,code)=>{if(!condition)throw Error(code);};
const exactStatus=message=>message?.type==='PAIA_GENERATION_STATUS'&&Object.keys(message).length===1;
const handled=data=>({handled:true,data});
let current=null;

export function configure(scene,{fixture}={}){
 if(!known(scene)){current=null;return null;}
 const expected=scenes[scene.id];
 need(fixture?.synthetic===true,'SYNC_RECOVERY_SYNTHETIC_FIXTURE_REQUIRED');
 need(scene.group==='settings'&&['width','height','theme'].every(key=>scene[key]===expected[key]),'SYNC_RECOVERY_SCENE_PLAN_MISMATCH');
 need(fixture.topics.length<=8&&fixture.topics.every(topic=>topic.sections.length<=2)&&fixture.inputs.length<=12&&fixture.entries.length<=12,'SYNC_RECOVERY_FIXTURE_BOUNDS');
 need(!current||current.pending===0,'SYNC_RECOVERY_CANNOT_RECONFIGURE_PENDING_READ');
 current={scene,fixture,reads:[],pending:0,peakPending:0,deferred:null,controls:[],nextFailure:false,expectedFailure:null,forbiddenGenerationCalls:[]};
 return {handled:true};
}
function owner(scene,fixture){
 need(current&&current.scene.id===scene.id&&current.fixture===fixture,'SYNC_RECOVERY_CONFIGURATION_MISMATCH');
 return current;
}

export async function fixtureRPC(message,{scene,fixture}){
 if(!known(scene))return null;
 const state=owner(scene,fixture),type=message?.type;
 if(typeof type==='string'&&type.startsWith('PAIA_GENERATION_')&&type!=='PAIA_GENERATION_STATUS'){
  state.forbiddenGenerationCalls.push(type);
  throw Error('SYNC_RECOVERY_OPERATION_REFUSED: '+type);
 }
 // Other original read owners remain in the shared responder chain. This
 // adapter must never fabricate support for an unrelated new RPC.
 if(type!=='PAIA_GENERATION_STATUS')return null;
 need(exactStatus(message),'SYNC_RECOVERY_STATUS_SHAPE');
 need(state.pending===0,'SYNC_RECOVERY_PHYSICAL_SINGLEFLIGHT_VIOLATION');
 const number=state.reads.length+1,max=scene.id===heldScene?3:1;
 need(number<=max,'SYNC_RECOVERY_EXPLICIT_READ_BUDGET');
 const row={number,type,settled:false,state:null,error:null};state.reads.push(row);
 state.pending++;state.peakPending=Math.max(state.peakPending,state.pending);
 try{
  if(scene.id===heldScene&&number===1){
   const data=await new Promise(resolve=>{state.deferred={number,resolve};});
   row.state=data.state;return handled(data);
  }
  if(scene.id===heldScene&&number===3){
   need(state.nextFailure===true,'SYNC_RECOVERY_FAILURE_NOT_EXPLICITLY_ARMED');
   state.nextFailure=false;row.error='UNAVAILABLE';
   const response={handled:true,expectedFailure:{error:'UNAVAILABLE'}};
   state.expectedFailure={message,response,number};return response;
  }
  need(!state.nextFailure,'SYNC_RECOVERY_FAILURE_READ_MISMATCH');
  const observed=scene.id===heldScene?'outcome-unknown':scenes[scene.id].state;
  row.state=observed;return handled({version:1,state:observed});
 }finally{row.settled=true;state.pending--;}
}

export function acceptsExpectedFailure(message,response,scene){
 if(!known(scene)||scene.id!==heldScene||!current||current.scene.id!==scene.id)return false;
 const expected=current.expectedFailure;
 return !!expected&&expected.number===3&&expected.message===message&&expected.response===response&&
  exactStatus(message)&&response.handled===true&&Object.keys(response).length===2&&
  response.expectedFailure?.error==='UNAVAILABLE'&&Object.keys(response.expectedFailure).length===1&&
  current.reads.length===3&&current.reads[2].error==='UNAVAILABLE'&&current.reads[2].settled===true;
}

// Fixed commands only settle/arm the bounded in-memory service response. They
// never call UI APIs, change the DOM, dispatch events or open/close the modal.
export function control(command){
 if(!current)return null;
 need(current.scene.id===heldScene&&controlKeys.includes(command),'SYNC_RECOVERY_CONTROL_SCOPE');
 if(command==='release-stale-selected'){
  need(current.reads.length===1&&current.pending===1&&current.deferred?.number===1&&!current.controls.includes(command),'SYNC_RECOVERY_STALE_SETTLEMENT_SCOPE');
  const deferred=current.deferred;current.deferred=null;current.controls.push(command);
  deferred.resolve({version:1,state:'selected'});
 }else{
  need(current.reads.length===2&&current.pending===0&&current.reads[1].state==='outcome-unknown'&&!current.nextFailure&&!current.controls.includes(command),'SYNC_RECOVERY_FAILURE_ARM_SCOPE');
  current.nextFailure=true;current.controls.push(command);
 }
 return {handled:true};
}

export function evidence(){
 if(!current)return null;
 const doc=globalThis.document,status=doc?.querySelector('#settings-sync-status'),refresh=doc?.querySelector('#settings-sync-refresh');
 const gap=globalThis.__paiaGapStateEvidence?.();
 return {
  scene:current.scene.id,scope:'synthetic read-only status boundary; original Settings modal and controller',
  statusReads:current.reads.length,pendingReads:current.pending,peakPendingReads:current.peakPending,
  reads:structuredClone(current.reads),controls:[...current.controls],nextFailureArmed:current.nextFailure,
  expectedFailureCount:current.expectedFailure?1:0,forbiddenGenerationCalls:[...current.forbiddenGenerationCalls],
  sharedContentMutations:gap?gap.writes.length+gap.created.length:null,
  newBodies:0,adapterContentMutations:0,providerCalls:0,realAccounts:0,grantChanges:0,
  observation:{dialogOpen:doc?.querySelector('#settings-sync-dialog')?.open??null,
   status:status?.querySelector('[role="status"]')?.textContent??null,
   description:status?.children[1]?.textContent??null,boundary:status?.children[2]?.textContent??null,
   busy:status?.getAttribute('aria-busy')??null,refreshDisabled:refresh?.disabled??null,
   statusActionCount:status?.querySelectorAll('button').length??null}
 };
}

const click=selector=>({action:'click',selector});
const wait=(selector,state='visible')=>({action:'wait',selector,state});
const assert=(selector,assertion,value,extra={})=>({action:'assert',selector,assertion,value,...extra});
const count=(selector,value)=>({action:'assertCount',selector,value});
const recovery=(path,value)=>({action:'assertRecovery',owner:'syncRecovery',path,value});
const fixtureControl=command=>({action:'fixtureControl',owner:'syncRecovery',command});
const dialog='#settings-sync-dialog',status='#settings-sync-status',refresh='#settings-sync-refresh';
const statusLine=status+' > [role="status"]',close=dialog+' .ux-settings-detail-close';
// Exact, independent expected copy from the bound 0.55.30 controller. These are
// assertions, not substitute UI content, and respect the original preferences.
const expectedCopy={
 prepared:[['本机恢复尚未完成：已准备','Local recovery incomplete: prepared'],['原操作仍保留。重新打开后无法核对原累计工作量与截止时间，因此这里不能继续、重试或取消它。','The original operation remains recorded. Its original cumulative work accounting and deadline are unavailable after reopening, so this page cannot continue, retry or cancel it.']],
 'outcome-unknown':[['本机恢复结果尚未确认','Local recovery outcome unknown'],['已发出的原操作结果仍未知，不能视为成功或失败。原累计工作量与截止时间不可用；这里保留未知结果，不会再次发送、继续或取消。','The dispatched original operation still has an unknown outcome, not success or failure. Its original cumulative work accounting and deadline are unavailable; this page preserves that unknown outcome without redispatching, continuing or cancelling.']],
 finishing:[['本机恢复收尾尚未确认','Local recovery completion unconfirmed'],['已有本机选择记录，但收尾尚未确认完成。原累计工作量与截止时间不可用；这里不会补做、重试或取消。','A local selection is recorded, but its final cleanup is not confirmed complete. The original cumulative work accounting and deadline are unavailable; this page will not finish, retry or cancel the operation.']]
};

export async function prepareScene(scene,{owners,fixture}){
 if(!known(scene))return null;
 owner(scene,fixture);need(typeof owners?.navigate==='function','SYNC_RECOVERY_SOURCE_OWNER_REQUIRED');
 need(await owners.navigate('settings')!==false,'SYNC_RECOVERY_ORIGINAL_NAVIGATION_REFUSED');
 const language=document.documentElement.lang,index=language==='zh-CN'?0:1;
 need(['zh-CN','en'].includes(language),'SYNC_RECOVERY_ORIGINAL_LANGUAGE_UNEXPECTED');
 const copy=(zh,en)=>index===0?zh:en;
 const boundary=copy('只读查看：刷新不会重试、取消、重载应用或更改权限。这里不提供云端同步或完整档案恢复的成功证明。','Read-only inspection: refreshing does not retry, cancel, reload the app or change permissions. This page does not establish successful cloud synchronization or whole-archive recovery.');
 const settled=()=>[wait(refresh+':not(:disabled)'),assert(status,'attribute','false',{name:'aria-busy'})];
 const observed=state=>[...settled(),assert(statusLine,'text',expectedCopy[state][0][index]),assert(status+' > p:nth-child(2)','text',expectedCopy[state][1][index]),assert(status+'-boundary','text',boundary),assert(refresh,'text',copy('刷新状态','Refresh status'))];
 const actions=[
  wait('#ux-settings-data-link'),recovery(['statusReads'],0),click('#ux-settings-data-link'),
  wait('#ux-settings-data-group:not([hidden])'),assert('#ux-settings-data-link','attribute','page',{name:'aria-current'}),
  recovery(['statusReads'],0),count(status+' button',1),click('#settings-sync'),wait(dialog+'[open]')
 ];
 if(scene.id!==heldScene){
  actions.push(...observed(scenes[scene.id].state),recovery(['statusReads'],1),recovery(['pendingReads'],0));
 }else{
  actions.push(
   wait(refresh+':disabled'),assert(status,'attribute','true',{name:'aria-busy'}),recovery(['statusReads'],1),recovery(['pendingReads'],1),
   click(close),wait(dialog,'hidden'),assert('#settings-sync','focused'),click('#settings-sync'),wait(dialog+'[open]'),
   assert(statusLine,'text',copy('先前的状态读取仍在进行','Previous status read still running')),
   assert(status+' > p:nth-child(2)','text',copy('未发送新的请求。等原读取结束后，可手动刷新状态。','No new request was sent. After the original read settles, you can refresh status manually.')),
   count(refresh+':disabled',1),assert(status,'attribute','true',{name:'aria-busy'}),recovery(['statusReads'],1),recovery(['pendingReads'],1),
   // With Refresh natively disabled, the original keyboard owner keeps Tab at
   // the sole enabled Close control. Do not force-click a disabled UI action.
   {action:'press',selector:close,key:'Tab'},assert(close,'focused'),recovery(['statusReads'],1),
   fixtureControl('release-stale-selected'),...settled(),
   assert(statusLine,'text',copy('只读状态','Read-only status')),recovery(['statusReads'],1),recovery(['pendingReads'],0),
   recovery(['reads',0,'state'],'selected'),
   click(refresh),...observed('outcome-unknown'),recovery(['statusReads'],2),
   fixtureControl('arm-next-status-failure'),click(refresh),...settled(),
   assert(statusLine,'text',copy('当前状态无法读取。上次观察（不是当前确认）：本机恢复结果尚未确认','Current status unavailable; last observed (not a current confirmation): Local recovery outcome unknown')),
   assert(status+' > p:nth-child(2)','text',expectedCopy['outcome-unknown'][1][index]),assert(status+'-boundary','text',boundary),
   recovery(['statusReads'],3),recovery(['pendingReads'],0),recovery(['expectedFailureCount'],1),recovery(['nextFailureArmed'],false)
  );
 }
 actions.push(count(status+' button',1),count(dialog+' button',2),recovery(['peakPendingReads'],1),recovery(['forbiddenGenerationCalls'],[]),recovery(['sharedContentMutations'],0));
 return {handled:true,readySelector:dialog+'[open] '+refresh+':not(:disabled)',actions,evidence:{
  owner:'actual archive.navigate(settings) + Settings Data tab + original Sync row/modal/Refresh',
  openingRead:'Original mountSettingsDetail onOpen reads once; mounting Settings/Data remains inert',
  soleReadCommand:'PAIA_GENERATION_STATUS',readBudget:scene.id===heldScene?3:1,syntheticOnly:true,sourceHTMLCloned:false,
  heldRead:scene.id===heldScene,disabledRefreshNotForceClicked:scene.id===heldScene,
  newBodies:0,contentMutations:0,grantChanges:0,storeSwitchGuardInstalled:false,
  expectedFailure:scene.id===heldScene?'Third explicit status read only: UNAVAILABLE':null
 }};
}
