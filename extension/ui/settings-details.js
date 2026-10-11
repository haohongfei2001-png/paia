import {createIcon} from './icons.js';
import {refreshStorage,subscribeStorageEstimate,storageSummaryText} from './r6-settings.js';

export function mountSettingsDetail({id,title,dialogTitle=()=>title,content,value=()=>'',language=()=>document.documentElement.lang,onOpen=()=>{},beforeClose=null}){
 const row=document.createElement('button');row.type='button';row.id=id;row.className='ux-setting-row ux-settings-destination';row.setAttribute('aria-haspopup','dialog');
 const label=document.createElement('span');label.className='ux-setting-name';const summary=document.createElement('span');summary.className='ux-setting-destination-value';row.append(label,summary,createIcon('chevron-right'));
 const dialog=document.createElement('dialog');dialog.id=id+'-dialog';dialog.className='ux-settings-detail-dialog';const header=document.createElement('header'),heading=document.createElement('h2'),close=document.createElement('button');heading.id=id+'-title';dialog.setAttribute('aria-labelledby',heading.id);row.setAttribute('aria-controls',dialog.id);close.type='button';close.className='ux-settings-detail-close';header.append(heading,close);dialog.append(header,content);document.body.append(dialog);
 const sync=()=>{const chinese=language()==='zh-CN';label.textContent=title[chinese?0:1];heading.textContent=dialogTitle()[chinese?0:1];summary.textContent=value(chinese);close.textContent=chinese?'关闭':'Close';close.setAttribute('aria-label',(chinese?'关闭':'Close ')+heading.textContent);};
 // Keep sequential keyboard navigation inside the open modal. Native dialog
 // Escape/close and return focus remain browser-owned.
 dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab'||event.altKey||event.ctrlKey||event.metaKey)return;
  const visible=[...dialog.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')].filter(node=>!node.disabled&&node.tabIndex>=0&&node.getClientRects().length);
  const stops=visible.filter(node=>node.type!=='radio'||!node.name||node===(visible.find(other=>other.type==='radio'&&other.name===node.name&&other.checked)||visible.find(other=>other.type==='radio'&&other.name===node.name)));
  const first=stops[0],last=stops.at(-1),active=document.activeElement;
  if(!first)return;
  if(event.shiftKey?(active===first||!dialog.contains(active)):(active===last||!dialog.contains(active))){event.preventDefault();(event.shiftKey?last:first).focus();}
 });
 let closing=false;
 const requestClose=()=>{
  if(!beforeClose){dialog.close();return;}
  if(closing||!dialog.open)return;
  closing=true;close.disabled=true;
  return Promise.resolve().then(beforeClose).then(allowed=>{if(allowed===true&&dialog.open)dialog.close();}).catch(()=>{
   // Failed owner acknowledgement leaves the detail and its current state open.
   close.setAttribute('aria-label',(language()==='zh-CN'?'尚未关闭，请重试：':'Could not close; retry: ')+heading.textContent);
  }).finally(()=>{closing=false;close.disabled=false;});
 };
 row.addEventListener('click',()=>{if(dialog.open)return;sync();dialog.showModal();void onOpen();});close.addEventListener('click',()=>void requestClose());
 if(beforeClose)for(const type of ['cancel','paia:request-close'])dialog.addEventListener(type,event=>{event.preventDefault();void requestClose();});sync();
 return {row,dialog,sync};
}
// Re-present the original control, preserving its installed listener, identity
// and navigation/consent owner. Mounting never activates the destination.
export function mountSettingsDestination(button,{title,description=null,language=()=>document.documentElement.lang,dialogId=null}){
 const label=document.createElement('span');label.className='ux-setting-name';
 const copy=document.createElement('span');copy.className='ux-setting-copy';copy.append(label);if(description){description.classList.add('ux-setting-description');copy.append(description);}
 button.classList.add('ux-setting-row','ux-settings-destination');button.replaceChildren(copy,createIcon('chevron-right'));
 button.removeAttribute('data-settings-zh');button.removeAttribute('data-settings-en');
 if(dialogId){button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',dialogId);}
 const sync=()=>{label.textContent=title[language()==='zh-CN'?0:1];};sync();return {row:button,sync};
}
let owner=null;
export function installSettingsDetails({dataGroup,language,backup=null}={}){
 if(owner)return owner;const storage=document.getElementById('r6-data-status'),sites=document.getElementById('settings-supported-sites');if(!storage||!sites)return null;
 const storageWrapper=storage.closest('.ux-settings-detail');let storageState;const storageDetail=mountSettingsDetail({id:'settings-storage',title:['存储空间','Storage space'],content:storage,language,value:chinese=>storageSummaryText(storageState,!chinese),onOpen:refreshStorage});
 if(storageWrapper)storageWrapper.replaceWith(storageDetail.row);else dataGroup.append(storageDetail.row);
 const siteContent=document.createElement('div');siteContent.className='ux-settings-site-facts';for(const child of [...sites.children])if(child.tagName!=='SUMMARY')siteContent.append(child);
 const siteDetail=mountSettingsDetail({id:'settings-supported-sites-open',title:['支持的网站','Supported websites'],content:siteContent,language,value:()=> 'ChatGPT'});sites.replaceWith(siteDetail.row);
 const history=document.getElementById('history-settings'),historyButton=document.getElementById('settings-history'),latest=document.getElementById('history-latest');
 const importDetail=mountSettingsDestination(historyButton,{title:['导入历史输入','Import earlier inputs'],description:latest,language,dialogId:'history-dialog'});history.replaceWith(importDetail.row);
 const source=document.getElementById('r6-source-records'),sourceButton=source.querySelector('[data-view="archive"]');
 sourceButton.id='settings-source-records';
 const sourceDetail=mountSettingsDestination(sourceButton,{title:['原始来源记录','Original source records'],language});source.replaceWith(sourceDetail.row);
 const restore=document.getElementById('backup-settings'),restoreWrapper=restore.closest('.ux-settings-detail');
 const restoreTitle=['从已有 PAIA 备份恢复','Restore an existing PAIA backup'];
 const restoreDetail=mountSettingsDetail({id:'settings-backup',title:restoreTitle,dialogTitle:()=>restore.dataset.inspectionFailure==='true'?['这份备份无法恢复','This backup cannot be restored']:restoreTitle,content:restore,language,beforeClose:()=>backup?.leaveSettings()??false});
 new MutationObserver(()=>restoreDetail.sync()).observe(restore,{attributes:true,attributeFilter:['data-inspection-failure']});
 restoreWrapper.replaceWith(restoreDetail.row);restoreDetail.row.disabled=!backup;
 subscribeStorageEstimate(state=>{storageState=state;storageDetail.sync();});
 owner={sync:()=>{for(const detail of [storageDetail,siteDetail,importDetail,sourceDetail,restoreDetail])detail.sync();},storage:storageDetail,sites:siteDetail,restore:restoreDetail};return owner;
}
