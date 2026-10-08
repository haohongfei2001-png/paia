import {SettingsPromptPositionState} from './settings-prompt-position-state.js';
import {withSettingsControlFocus} from './settings-local-state.js';

const owners=new WeakMap();
const messages={saving:['正在重置…','Resetting…'],saved:['位置已重置','Position reset'],'read-error':['暂时无法读取位置。重新打开可重试。','Could not read position. Reopen to retry.'],'save-error':['重置未获确认，已重新核对位置。请重试。','Reset was not confirmed. Position was checked again. Please retry.'],'save-unknown':['重置结果暂时无法确认。重新打开核对后再试。','Reset result is unknown. Reopen to check before retrying.']};
export function mountSettingsPromptPosition(host,{send,language=()=>document.documentElement.lang,storage}={}){
 if(!host)return null;if(owners.has(host))return owners.get(host);
 const note=host.querySelector('p[data-settings-zh]'),control=document.createElement('button'),status=document.createElement('p');
 control.type='button';control.id='settings-prompt-position-reset';control.className='secondary';control.setAttribute('aria-describedby','settings-prompt-position-feedback');
 status.id='settings-prompt-position-feedback';status.className='ux-settings-note';status.setAttribute('role','status');host.append(control,status);
 const state=new SettingsPromptPositionState({send,changed:()=>sync()});
 function sync(){
  const zh=language()==='zh-CN';control.textContent=zh?'重置悬浮按钮位置':'Reset floating button position';control.disabled=!state.editable;control.setAttribute('aria-busy',String(state.busy));
  if(note){note.dataset.settingsZh='当前支持 ChatGPT。位置重置仅影响本机悬浮按钮的位置。';note.dataset.settingsEn='Currently supports ChatGPT. Position reset affects only the floating button on this device.';note.textContent=zh?note.dataset.settingsZh:note.dataset.settingsEn;}
  const unavailable=state.value?.status==='consent_required'?['请先同意在本机保存，再重置位置。','Enable local saving before resetting position.']:['当前版本无法重置已保存的位置。','This version cannot reset the saved position.'];
  status.textContent=messages[state.feedback]?.[zh?0:1]||(!state.value?(zh?'正在读取位置…':'Reading position…'):state.value.status!=='ready'?unavailable[zh?0:1]:'');
 }
 control.addEventListener('click',()=>withSettingsControlFocus(control,()=>state.reset()));
 storage?.onChanged?.addListener((changes,area)=>{if(area==='local'&&changes.promptSurfaceV1)void state.load();});
 const owner={state,control,status,sync,refresh:()=>state.load()};owners.set(host,owner);sync();void state.load();return owner;
}
