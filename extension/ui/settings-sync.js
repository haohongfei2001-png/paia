import {syncAvailability} from '../core/browser-native-sync/availability.js';
import {request} from './common.js';

const labels={STATUS:['核对状态','Check status'],RESUME:['恢复本地同步任务','Resume local sync tasks'],PAUSE:['暂停传输','Pause transfers'],DISCONNECT:['断开本机连接','Disconnect this device'],NOW:['保存可恢复检查点','Save a recoverable checkpoint'],RESTORE:['读取已有恢复点','Read an existing recovery point'],CONTINUE:['继续原恢复任务','Continue the original recovery']};
const selectionLabels={GENERATION_PREPARE:['核对已有档案内容','Check the existing archive'],GENERATION_ACTIVATE:['确认使用已核对的档案','Confirm the verified archive'],GENERATION_CONTINUE:['核对并继续原选择','Reconcile the original selection'],GENERATION_CANCEL:['取消尚未生效的选择','Cancel the pending selection'],GENERATION_RESTART:['已保存编辑，重启完成切换','Edits saved; restart to finish']};
const selectionStates=new Set(['not-prepared','review-ready','prepared','outcome-unknown','finishing','selected','restart-requested']);
function selectionValid(value){return value?.version===1&&value.productionActivation===false&&selectionStates.has(value.state)&&typeof value.canPrepare==='boolean'&&typeof value.reloadRequired==='boolean'&&typeof value.busy==='boolean'&&value.reloadRequired===(value.state==='selected');}
const states=new Set(['not-started','active','paused','disconnected','account-changed','suspended','settlement-unknown']);
function valid(value){
 if(value?.version!==1||value.productionActivation!==false)return false;
 if(value.state==='unavailable')return value.reason==='provider-not-configured';
 return ['source-working-only','source-working-prompt'].includes(value.scope)&&value.wholeArchiveComplete===false&&value.purgeProtection==='original-journal-fail-closed'&&typeof value.resumeAvailable==='boolean'&&typeof value.busy==='boolean'&&states.has(value.state)&&(value.task===null||['publication','checkpoint','restore'].includes(value.task?.kind)&&['reserved','running','unknown','confirmed'].includes(value.task?.phase));
}

// The ordinary Settings owner sends only fixed zero-argument commands to the
// original worker. It cannot supply identity, storage, scope or a transport.
export function mountSettingsSync({mountDetail,language=()=>document.documentElement.lang}={}){
 const content=document.createElement('section'),status=document.createElement('p'),scope=document.createElement('p'),actions=document.createElement('div'),selection=document.createElement('p');
 content.className='ux-settings-sync-content';status.id='settings-sync-state';status.setAttribute('role','status');scope.id='settings-sync-scope';actions.className='ux-settings-sync-actions';content.append(status,scope);
 let view=null,busy=false,failed=false,serial=0,detail;
 const text=(zh,en)=>language()==='zh-CN'?zh:en;
 const controls=new Map(Object.entries({...labels,...selectionLabels}).map(([command,pair])=>{const button=document.createElement('button');button.type='button';button.dataset.syncCommand=command;button.addEventListener('click',()=>void invoke(command));actions.append(button);return [command,{button,pair}];}));
 const configured=()=>view&&view.state!=='unavailable';
 const selected=()=>selectionValid(view?.applicationSelection)?view.applicationSelection:null;
 const allowed=command=>{
  if(command==='STATUS')return true;
  if(command.startsWith('GENERATION_')){const value=selected();if(!value||failed||value.busy)return false;const state=value.state;return command==='GENERATION_PREPARE'?state==='not-prepared'&&value.canPrepare:command==='GENERATION_ACTIVATE'?state==='review-ready':command==='GENERATION_CONTINUE'?['prepared','outcome-unknown','finishing'].includes(state):command==='GENERATION_CANCEL'?['prepared','review-ready'].includes(state):command==='GENERATION_RESTART'&&state==='selected'&&value.reloadRequired;}
  if(['prepared','outcome-unknown','finishing','selected','restart-requested'].includes(selected()?.state))return false;
  if(!configured()||failed||view.busy||view.state==='suspended'||view.state==='settlement-unknown')return false;
  if(command==='RESUME')return (view.state!=='active'||view.needsPromptEnrollment===true||view.needsPreferenceEnrollment===true)&&view.resumeAvailable;
  if(command==='PAUSE')return view.state==='active';
  if(command==='DISCONNECT')return view.state!=='disconnected';
  if(view.state!=='active')return false;
  const pending=view.task&&view.task.phase!=='confirmed';
  if(command==='NOW')return !pending||['publication','checkpoint'].includes(view.task.kind);
  if(command==='RESTORE')return !pending;
  return command==='CONTINUE'&&view.task?.kind==='restore';
 };
 const render=()=>{
  const limited=configured();content.dataset.syncState=view?.state??syncAvailability().state;
  if(!limited){status.textContent=failed?text('暂时无法核对同步状态；没有自动重试。','Sync status could not be confirmed. Nothing was retried automatically.'):text('此版本尚未提供云端同步。','Cloud sync is not available in this version.');scope.textContent=text('你的内容仍保存在此设备。打开此页面不会登录账号、上传内容或更改已有数据。','Your content stays on this device. Opening this page does not sign in, upload content or change existing data.');actions.remove();}
  else{
   if(actions.parentElement!==content)content.append(actions);
   const copy={active:['本地任务可用；整库同步尚未完成。','Local tasks are available; whole-archive sync is incomplete.'],paused:['传输已暂停，本机内容保留。','Transfers are paused. Local content is retained.'],disconnected:['本机连接已断开，没有删除本机或云端内容。','This device is disconnected. Local and remote content was not deleted.'],'not-started':['本地验证配置已准备，尚未开始传输。','The local verification configuration is ready. Transfers have not started.'],'account-changed':['账号绑定已变化，旧任务仍保留。','The account binding changed. The original task is retained.'],suspended:['后台已暂停，请重新核对状态。','The background is suspended. Check its status again.'],'settlement-unknown':['结果尚未确定；请重新打开后台后核对原任务。','The result is undetermined. Reopen the background and check the original task.']};
   status.textContent=busy?text('正在处理本次请求…','Processing this request…'):failed?text('本次结果未确定。先核对状态；不会自动重试。','This result is undetermined. Check status first; no automatic retry will occur.'):text(...copy[view.state]);
   scope.textContent=view.scope==='source-working-prompt'?text('此配置可保存原始输入、工作副本、Prompt 及便携显示和筛选偏好的可恢复检查点。未接入的 Thought、Context、Topic 或非便携设置内容会阻止完整检查点，不能视为整库已备份。恢复使用已确认的检查点，不会自动开始。','This configuration can save recoverable checkpoints for Source, Working Input, Prompt and portable display/filter preferences. Unrepresented Thought, Context, Topic or nonportable settings content blocks the complete checkpoint. This is not a whole-archive backup. Restore uses a confirmed checkpoint and never starts automatically.'):text('当前仅验证原始输入与工作副本。Thought、Prompt、Context 和 Topic 的完整同步尚未接通。发布会创建原范围的可恢复检查点；未接入内容会被拒绝，不代表整库已备份。','Only Source and Working Input are covered by this local verification. Complete Thought, Prompt, Context and Topic sync is not connected. Publication creates a recoverable checkpoint for the original supported scope; unrepresented content is refused. This is not a whole-archive backup.');
  }
  const choice=selected();
  if(choice){if(selection.parentElement!==content)content.append(selection);if(actions.parentElement!==content)content.append(actions);const descriptions={'not-prepared':['可核对原档案与已恢复候选的完整已支持内容；不会自动切换。','You can compare the original archive with the restored candidate. Nothing switches automatically.'],'review-ready':['内容核对完成。确认后保留原档案，使用已核对的候选；这不是整库同步完成。','The content comparison passed. Confirmation retains the original archive and selects the verified candidate. This is not completed whole-archive sync.'],prepared:['原选择尚未完成，已有档案仍保留。继续核对原操作，或取消尚未生效的选择。','The original selection is unfinished and both archives are retained. Reconcile it or cancel before it takes effect.'],'outcome-unknown':['原选择结果未确定，两边写入受保护。只能核对原操作；不会重发或自动重启。','The original outcome is unknown; writes to both archives are protected. Only reconcile the original operation; nothing is resent or restarted automatically.'],finishing:['选择已提交，正在等待原收尾核对。完成前不能重启。','Selection is committed but needs its original completion check. Restart is unavailable until it finishes.'],selected:['已确认原选择，旧档案完整保留。请先保存尚未提交的编辑，再点击重启以使用所选档案。以后新增编辑不能通过简单切回而丢弃。','The selection is confirmed and the original archive is retained. Save any unsubmitted edits before clicking restart to use the selected archive. Later edits cannot be discarded by simply switching back.'],'restart-requested':['重启已请求；没有重复请求。','Restart was requested once.']};selection.textContent=choice.state==='not-prepared'&&choice.priorLibraryRetained?text('原选择已取消，已有档案保留。若本次后台启动被中断，下次扩展启动仍使用原档案；不会自动重启。','The selection was cancelled and the original archive is retained. If this background startup was interrupted, the next extension startup uses the original archive. Nothing restarts automatically.'):text(...descriptions[choice.state]);}else selection.remove();
  for(const [command,{button,pair}]of controls){button.textContent=command==='NOW'&&['publication','checkpoint'].includes(view?.task?.kind)&&view.task.phase!=='confirmed'?text('核对原发布任务','Reconcile the original publication'):text(...pair);button.hidden=!allowed(command);button.disabled=busy;}
 };
 const current=token=>token===serial&&detail.dialog.open&&detail.dialog.isConnected&&document.getElementById?.('settings-panel')?.hidden!==true;
 async function invoke(command){
  if(busy||!detail?.dialog.open||!allowed(command))return;
  const token=serial;busy=true;failed=false;render();
  try{if(command.startsWith('GENERATION_')){const value=await request('PAIA_'+command);if(!current(token))return;if(!selectionValid(value))throw Error('invalid selection state');view={...view,applicationSelection:value};}else{const value=await request('PAIA_SYNC_'+command);if(!current(token))return;if(!valid(value))throw Error('invalid sync state');view={...value,applicationSelection:value.applicationSelection??view?.applicationSelection};}}
  catch{if(current(token))failed=true;}
  finally{if(current(token)){busy=false;detail.sync();}}
 }
 detail=mountDetail({id:'settings-sync',title:['同步','Sync'],content,language,value:zh=>configured()?(zh?'仅局部验证':'Limited local verification'):(zh?'尚未启用':'Not enabled'),onOpen:()=>{++serial;busy=false;failed=false;view=null;render();return invoke('STATUS');}});
 const originalSync=detail.sync;detail.sync=()=>{originalSync();render();};
 detail.dialog.addEventListener('close',()=>{++serial;busy=false;});
 detail.sync();return detail;
}
