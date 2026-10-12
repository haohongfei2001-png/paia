import {withSettingsControlFocus} from './settings-local-state.js';

// Presentation of the existing CONSENT owner; opening never starts capture.
export function mountSettingsCaptureConsent(host,{state,control,language,isCurrent}){
 let openedEpoch=null,saving=false,enteredUncertain=false;
 const make=(tag,id)=>{const node=document.createElement(tag);if(id)node.id=id;return node;};
 const dialog=make('dialog','settings-capture-consent'),header=make('header'),title=make('h2','settings-capture-consent-title'),close=make('button','settings-capture-close'),scope=make('p'),existing=make('p'),feedback=make('p','settings-capture-consent-feedback'),actions=make('div'),cancel=make('button','settings-capture-cancel'),confirm=make('button','settings-capture-confirm');
 dialog.className='ux-settings-detail-dialog ux-settings-capture-consent';dialog.setAttribute('aria-labelledby',title.id);close.className='ux-settings-detail-close';actions.className='ux-settings-consent-actions';feedback.setAttribute('role','status');feedback.hidden=true;
 for(const button of [close,cancel,confirm])button.type='button';header.append(title,close);actions.append(cancel,confirm);dialog.append(header,scope,existing,feedback,actions);host.append(dialog);
 function sync(){
  if(dialog.open&&!saving&&(!isCurrent()||(openedEpoch!==state.epoch&&!(enteredUncertain&&state.captureUnknown)))){dialog.close();return;}
  const copy=(zh,en)=>language()==='zh-CN'?zh:en;
  title.textContent=copy('开始保存 AI 输入','Start saving AI inputs');close.textContent=copy('关闭','Close');close.setAttribute('aria-label',copy('关闭开始保存确认','Close capture confirmation'));cancel.textContent=copy('取消','Cancel');confirm.textContent=copy('同意并开启','Agree and enable');
  scope.textContent=copy('只保存普通聊天中已发送、已显示的用户文字。不会保存草稿、完整 AI 回复、附件正文或账户凭证。临时聊天不自动保存。','Only sent, visible user text in normal chats is saved. Drafts, full AI replies, attachment bodies and account credentials are excluded. Temporary chats are not saved automatically.');
  existing.textContent=copy('开始或恢复保存时，当前页面已显示的合格旧输入也可能被收录。收录、导入和阅读都在本机；不会开启 AI 服务、同步或下一句建议。','Starting or resuming can also save eligible older inputs visible on the current page. Capture, import and reading stay on this device; this does not enable AI services, sync or next-input suggestions.');
  close.disabled=cancel.disabled=state.busy;confirm.disabled=state.busy||state.reading||!state.loaded||state.captureUnknown||state.capture?.consented===true||openedEpoch!==state.epoch||!isCurrent();
  feedback.hidden=!state.captureUnknown&&!['saving','save-error'].includes(state.feedback);feedback.textContent=state.captureUnknown?copy('无法核对保存状态，请重新读取设置后再试。','Capture status could not be checked. Read settings again before retrying.'):state.feedback==='saving'?copy('正在保存…','Saving…'):state.feedback==='save-error'?copy('保存未获确认，已重新核对设置。请检查状态后再试。','Save was not confirmed. Settings were checked again. Check the status before retrying.'):'';
 }
 confirm.addEventListener('click',async event=>{if(!event.isTrusted||state.busy||state.reading||!state.loaded||state.captureUnknown||state.capture?.consented||!isCurrent()||openedEpoch!==state.epoch)return;saving=true;openedEpoch=state.epoch+1;try{const saved=await withSettingsControlFocus(control,()=>state.acceptCapture());if(saved)dialog.close();else{openedEpoch=state.epoch;enteredUncertain=state.captureUnknown;}}finally{saving=false;sync();}});
 for(const button of [cancel,close])button.addEventListener('click',()=>{if(!state.busy)dialog.close();});for(const type of ['cancel','paia:request-close'])dialog.addEventListener(type,event=>{if(saving||state.busy)event.preventDefault();});dialog.addEventListener('close',()=>{openedEpoch=null;enteredUncertain=false;if(control.isConnected&&control.getClientRects().length)control.focus({preventScroll:true});});
 return {sync,canLeave:()=>!saving,open(){if(isCurrent()&&state.loaded&&!state.reading&&!state.busy&&!state.captureUnknown&&!state.capture?.consented){openedEpoch=state.epoch;sync();if(!dialog.open)dialog.showModal();cancel.focus();}}};
}
