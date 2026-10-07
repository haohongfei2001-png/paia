import {createIcon} from './icons.js';
import {refreshStorage,subscribeStorageEstimate,storageSummaryText} from './r6-settings.js';

export function mountSettingsDetail({id,title,content,value=()=>'',language=()=>document.documentElement.lang,onOpen=()=>{}}){
 const row=document.createElement('button');row.type='button';row.id=id;row.className='ux-setting-row ux-settings-destination';row.setAttribute('aria-haspopup','dialog');
 const label=document.createElement('span');label.className='ux-setting-name';const summary=document.createElement('span');summary.className='ux-setting-destination-value';row.append(label,summary,createIcon('chevron-right'));
 const dialog=document.createElement('dialog');dialog.id=id+'-dialog';dialog.className='ux-settings-detail-dialog';const header=document.createElement('header'),heading=document.createElement('h2'),close=document.createElement('button');heading.id=id+'-title';dialog.setAttribute('aria-labelledby',heading.id);row.setAttribute('aria-controls',dialog.id);close.type='button';close.className='ux-settings-detail-close';header.append(heading,close);dialog.append(header,content);document.body.append(dialog);
 const sync=()=>{const chinese=language()==='zh-CN';label.textContent=heading.textContent=title[chinese?0:1];summary.textContent=value(chinese);close.textContent=chinese?'关闭':'Close';close.setAttribute('aria-label',(chinese?'关闭':'Close ')+heading.textContent);};
 row.addEventListener('click',()=>{if(dialog.open)return;sync();dialog.showModal();void onOpen();});close.addEventListener('click',()=>dialog.close());sync();
 return {row,dialog,sync};
}
let owner=null;
export function installSettingsDetails({dataGroup,language}={}){
 if(owner)return owner;const storage=document.getElementById('r6-data-status'),sites=document.getElementById('settings-supported-sites');if(!storage||!sites)return null;
 const storageWrapper=storage.closest('.ux-settings-detail');let storageState;const storageDetail=mountSettingsDetail({id:'settings-storage',title:['存储空间','Storage space'],content:storage,language,value:chinese=>storageSummaryText(storageState,!chinese),onOpen:refreshStorage});
 if(storageWrapper)storageWrapper.replaceWith(storageDetail.row);else dataGroup.append(storageDetail.row);
 const siteContent=document.createElement('div');siteContent.className='ux-settings-site-facts';for(const child of [...sites.children])if(child.tagName!=='SUMMARY')siteContent.append(child);
 const siteDetail=mountSettingsDetail({id:'settings-supported-sites-open',title:['支持的网站','Supported websites'],content:siteContent,language,value:()=> 'ChatGPT'});sites.replaceWith(siteDetail.row);
 subscribeStorageEstimate(state=>{storageState=state;storageDetail.sync();});
 owner={sync:()=>{storageDetail.sync();siteDetail.sync();},storage:storageDetail,sites:siteDetail};return owner;
}
