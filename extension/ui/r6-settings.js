import {request,element} from './common.js';

const $=id=>document.getElementById(id);
let installed=false,storageNode=null,privacyStatus=null,previewToggle=null;
let privacyRead=0,privacyBusy=false,privacyLoaded=false,previewValue=false;
const english=()=>document.documentElement.lang==='en';
const mib=value=>(value/1024/1024).toFixed(value>=100*1024*1024?0:1);
export function storageEstimateText(estimate={},useEnglish=false){
 const usage=Number.isFinite(estimate.usage)&&estimate.usage>=0?estimate.usage:null;
 const quota=Number.isFinite(estimate.quota)&&estimate.quota>=0?estimate.quota:null;
 if(usage===null)return useEnglish?'Local storage usage is not available from this browser.':'浏览器未报告本机已用空间。';
 if(quota===null)return useEnglish?`About ${mib(usage)} MiB used locally · remaining space cannot be estimated.`:`本机已用约 ${mib(usage)} MiB · 无法估计剩余空间。`;
 const remaining=Math.max(0,quota-usage);
 return useEnglish?`About ${mib(usage)} MiB used locally · about ${mib(remaining)} MiB available.`:`本机已用约 ${mib(usage)} MiB · 可用约 ${mib(remaining)} MiB。`;
}
export const previewMaskClass=value=>value===true?'paia-hide-content-previews':'';
function installStyles(){
 if(document.querySelector('link[data-r6-settings]'))return;
 const link=document.createElement('link');link.rel='stylesheet';link.href=chrome.runtime.getURL('ui/r6.css');link.dataset.r6Settings='true';document.head.append(link);
}
function applyMask(value){document.documentElement.classList.toggle('paia-hide-content-previews',value===true);}
function text(tag,className,zh,en){const node=element(tag,className,english()?en:zh);node.dataset.r6Zh=zh;node.dataset.r6En=en;return node;}
function syncLocale(){
 for(const node of document.querySelectorAll('[data-r6-zh]'))node.textContent=english()?node.dataset.r6En:node.dataset.r6Zh;
 void refreshStorage();
}
async function syncPrivacy(){
 if(privacyBusy)return;
 const read=++privacyRead;
 try{
  const page=await request('GET_PAGE',{page:{view:'settings',limit:1}});if(read!==privacyRead)return;
  previewValue=page?.preferences?.hideContentPreviews===true;privacyLoaded=true;
  if(previewToggle){previewToggle.checked=previewValue;previewToggle.disabled=false;}applyMask(previewValue);
 }catch{
  // A failed read must never reveal previews that the user previously hid.
  if(read!==privacyRead)return;
  if(previewToggle)previewToggle.disabled=!privacyLoaded;
  if(privacyStatus)privacyStatus.textContent=english()?'Could not refresh this setting.':'无法刷新此设置。';
 }
}
async function setPreviewMask(value){
 if(!previewToggle||privacyBusy||!privacyLoaded)return;
 privacyBusy=true;privacyRead++;previewToggle.disabled=true;privacyStatus.textContent=english()?'Saving…':'正在保存…';
 try{
  await request('UPDATE_PREFERENCES',{changes:{hideContentPreviews:value}});
  previewValue=value;applyMask(value);privacyStatus.textContent=english()?'Saved':'已保存';
 }catch{
  previewToggle.checked=previewValue;applyMask(previewValue);privacyStatus.textContent=english()?'Not saved. The previous setting is still active.':'未保存，仍使用之前的设置。';
 }finally{privacyBusy=false;previewToggle.disabled=false;}
}
async function refreshStorage(){
 if(!storageNode)return;
 try{storageNode.textContent=storageEstimateText(await navigator.storage?.estimate?.()||{},english());}
 catch{storageNode.textContent=storageEstimateText({},english());}
}
export async function refreshR6Settings(){await Promise.all([syncPrivacy(),refreshStorage()]);}
function installPrivacy(){
 const host=$('memory-settings');if(!host||$('r6-hide-content-previews'))return;
 const section=element('section','r6-privacy-preview'),label=element('label','setting'),name=text('span','','隐藏内容预览','Hide content previews'),input=document.createElement('input');
 input.id='r6-hide-content-previews';input.type='checkbox';input.disabled=true;previewToggle=input;label.append(name,input);
 const note=text('p','muted','隐藏列表和搜索里的摘句，打开正文仍可阅读。不是加密，也不能阻止截图。','Hides excerpts in lists and search; opening the body still shows it. This is not encryption or screenshot protection.');
 privacyStatus=element('p','muted');privacyStatus.id='r6-preview-status';privacyStatus.setAttribute('role','status');section.append(label,note,privacyStatus);host.append(section);input.addEventListener('change',()=>void setPreviewMask(input.checked));void syncPrivacy();
}
function installData(){
 const host=$('backup-settings');if(!host||$('r6-data-status'))return;
 const heading=text('h3','r6-data-title','从备份恢复','Restore from backup');heading.id='r6-backup-heading';host.prepend(heading);host.setAttribute('aria-labelledby',heading.id);host.classList.add('r6-data-section');
 const status=element('section','r6-data-section r6-data-status');status.id='r6-data-status';status.append(text('h3','','本机存储','Local storage'));
 storageNode=text('p','muted','正在读取存储空间…','Reading storage usage…');storageNode.id='r6-storage-estimate';status.append(storageNode,text('p','muted','空间为浏览器估算值。本机数据未做应用层加密；卸载扩展会清除档案。','Storage usage is a browser estimate. Local data is not application-layer encrypted; uninstalling the extension clears the archive.'));host.after(status);
 const settings=$('settings-panel'),sourceButton=[...settings?.querySelectorAll('[data-view="archive"]')||[]].find(el=>!el.closest('#primary-nav'));
 if(sourceButton){const source=element('section','r6-data-section r6-source-records');source.id='r6-source-records';source.append(sourceButton,text('p','muted','永久删除原始来源无法撤销。','Permanently deleting original sources cannot be undone.'));status.after(source);}
 void refreshStorage();
 if(settings)new MutationObserver(()=>{if(!settings.hidden)void refreshR6Settings();}).observe(settings,{attributes:true,attributeFilter:['hidden']});
}
export function installR6Settings(){
 if(installed)return;installed=true;installStyles();installPrivacy();installData();new MutationObserver(syncLocale).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 chrome.runtime.onMessage.addListener(message=>{if(message?.type==='ARCHIVE_CHANGED'&&message.cause==='UPDATE_PREFERENCES')void syncPrivacy();});
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&Object.keys(changes).some(key=>['settings','paia-settings'].includes(key)))void syncPrivacy();});
}
