import {syncAvailability} from '../core/browser-native-sync/availability.js';
import {request} from './common.js';

const labels={STATUS:['核对状态','Check status'],RESUME:['恢复本地同步任务','Resume local sync tasks'],PAUSE:['暂停传输','Pause transfers'],DISCONNECT:['断开本机连接','Disconnect this device'],NOW:['保存可恢复检查点','Save a recoverable checkpoint'],RESTORE:['读取已有恢复点','Read an existing recovery point'],CONTINUE:['继续原恢复任务','Continue the original recovery']};
const states=new Set(['not-started','active','paused','disconnected','account-changed','suspended','settlement-unknown']);
function valid(value){
 if(value?.version!==1||value.productionActivation!==false)return false;
 if(value.state==='unavailable')return value.reason==='provider-not-configured';
 return ['source-working-only','source-working-prompt'].includes(value.scope)&&value.wholeArchiveComplete===false&&value.purgeProtection==='original-journal-fail-closed'&&typeof value.resumeAvailable==='boolean'&&typeof value.busy==='boolean'&&states.has(value.state)&&(value.task===null||['publication','checkpoint','restore'].includes(value.task?.kind)&&['reserved','running','unknown','confirmed'].includes(value.task?.phase));
}

// The ordinary Settings owner sends only fixed zero-argument commands to the
// original worker. It cannot supply identity, storage, scope or a transport.
export function mountSettingsSync({mountDetail,language=()=>document.documentElement.lang}={}){
 const content=document.createElement('section'),status=document.createElement('p'),scope=document.createElement('p'),actions=document.createElement('div');
 content.className='ux-settings-sync-content';status.id='settings-sync-state';status.setAttribute('role','status');scope.id='settings-sync-scope';actions.className='ux-settings-sync-actions';content.append(status,scope);
 let view=null,busy=false,failed=false,serial=0,detail;
 const text=(zh,en)=>language()==='zh-CN'?zh:en;
 const controls=new Map(Object.entries(labels).map(([command,pair])=>{const button=document.createElement('button');button.type='button';button.dataset.syncCommand=command;button.addEventListener('click',()=>void invoke(command));actions.append(button);return [command,{button,pair}];}));
 const configured=()=>view&&view.state!=='unavailable';
 const allowed=command=>{
  if(command==='STATUS')return true;
  if(!configured()||failed||view.busy||view.state==='suspended'||view.state==='settlement-unknown')return false;
  if(command==='RESUME')return (view.state!=='active'||view.needsPromptEnrollment===true||view.needsPreferenceEnrollment===true||view.needsContextEnrollment===true)&&view.resumeAvailable;
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
   if(view.contextCommands===true)scope.textContent+=text(' 已接通原 Context 人工命令和显式登记；自动内容仍需完整关联验证。',' Original manual Context commands and explicit enrollment are connected; automatic content still requires complete lineage qualification.');
  }
  for(const [command,{button,pair}]of controls){button.textContent=command==='NOW'&&['publication','checkpoint'].includes(view?.task?.kind)&&view.task.phase!=='confirmed'?text('核对原发布任务','Reconcile the original publication'):text(...pair);button.hidden=!allowed(command);button.disabled=busy;}
 };
 const current=token=>token===serial&&detail.dialog.open&&detail.dialog.isConnected&&document.getElementById?.('settings-panel')?.hidden!==true;
 async function invoke(command){
  if(busy||!detail?.dialog.open||!allowed(command))return;
  const token=serial;busy=true;failed=false;render();
  try{const value=await request('PAIA_SYNC_'+command);if(!current(token))return;if(!valid(value))throw Error('invalid sync state');view=value;}
  catch{if(current(token))failed=true;}
  finally{if(current(token)){busy=false;detail.sync();}}
 }
 detail=mountDetail({id:'settings-sync',title:['同步','Sync'],content,language,value:zh=>configured()?(zh?'仅局部验证':'Limited local verification'):(zh?'尚未启用':'Not enabled'),onOpen:()=>{++serial;busy=false;failed=false;view=null;render();return invoke('STATUS');}});
 const originalSync=detail.sync;detail.sync=()=>{originalSync();render();};
 detail.dialog.addEventListener('close',()=>{++serial;busy=false;});
 detail.sync();return detail;
}
