import {request,element} from './common.js';
import {OpenExportWriter} from '../core/open-export.js';

const $=id=>document.getElementById(id);
const LAST_BACKUP_KEY='paia-r6-last-backup-at';
let installed=false,lastBackupNode=null,storageNode=null,privacyStatus=null,previewToggle=null;

const english=()=>document.documentElement.lang==='en';
const mib=value=>(value/1024/1024).toFixed(value>=100*1024*1024?0:1);
export function storageEstimateText(estimate={},useEnglish=false){
 const usage=Number.isFinite(estimate.usage)&&estimate.usage>=0?estimate.usage:null;
 const quota=Number.isFinite(estimate.quota)&&estimate.quota>=0?estimate.quota:null;
 if(usage===null)return useEnglish?'Local storage usage is not available from this browser.':'浏览器未报告本机已用空间。';
 if(quota===null)return useEnglish?`About ${mib(usage)} MiB used locally · remaining space cannot be estimated.`:`本机已用约 ${mib(usage)} MiB · 无法估计剩余空间。`;
 const remaining=Math.max(0,quota-usage);
 return useEnglish?`About ${mib(usage)} MiB used locally · about ${mib(remaining)} MiB available to this origin.`:`本机已用约 ${mib(usage)} MiB · 此来源可用空间约 ${mib(remaining)} MiB。`;
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
 void refreshLastBackup();
}
async function currentPreferences(){
 const page=await request('GET_PAGE',{page:{view:'settings',limit:1}});
 return page?.preferences||{};
}
async function syncPrivacy(){
 try{
  const preferences=await currentPreferences(),value=preferences.hideContentPreviews===true;
  if(previewToggle)previewToggle.checked=value;applyMask(value);
 }catch{applyMask(false);}
}
async function setPreviewMask(value){
 if(!previewToggle)return;
 previewToggle.disabled=true;privacyStatus.textContent=english()?'Saving…':'正在保存…';
 try{
  await request('UPDATE_PREFERENCES',{changes:{hideContentPreviews:value}});
  applyMask(value);privacyStatus.textContent=english()?'Saved locally. This only hides previews; it is not encryption or screenshot protection.':'已保存到本机。这里只隐藏预览，不是加密，也不能阻止系统截图。';
 }catch{
  previewToggle.checked=!value;applyMask(!value);privacyStatus.textContent=english()?'Not saved. The previous setting is still active.':'未保存，仍使用之前的设置。';
 }finally{previewToggle.disabled=false;}
}
async function refreshStorage(){
 if(!storageNode)return;
 try{storageNode.textContent=storageEstimateText(await navigator.storage?.estimate?.()||{},english());}
 catch{storageNode.textContent=storageEstimateText({},english());}
}
async function readLastBackup(){
 try{const row=await chrome.storage.local.get(LAST_BACKUP_KEY);return row?.[LAST_BACKUP_KEY]||null;}catch{return null;}
}
async function refreshLastBackup(){
 if(!lastBackupNode)return;
 const value=await readLastBackup(),valid=value&&Number.isFinite(Date.parse(value));
 lastBackupNode.textContent=valid?(english()?`Last successful backup in this browser: ${new Date(value).toLocaleString()}`:`此浏览器最近成功创建备份：${new Date(value).toLocaleString()}`):(english()?'No successful backup has been recorded in this browser yet.':'此浏览器尚未记录成功创建的备份。');
}
export async function refreshR6Settings(){
 await Promise.all([syncPrivacy(),refreshStorage(),refreshLastBackup()]);
}
export async function recordR6BackupSuccess(at=new Date().toISOString()){
 const value=Number.isFinite(Date.parse(at))?new Date(at).toISOString():new Date().toISOString();
 try{await chrome.storage.local.set({[LAST_BACKUP_KEY]:value});}catch{}
 await refreshLastBackup();await refreshStorage();
}
function downloadParts(parts,name,type){
 const url=URL.createObjectURL(new Blob(parts,{type})),a=element('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function completeExport(format,panel){
 if(panel.isBusy())return;
 panel.lock(true);panel.status(english()?'Preparing a complete local export…':'正在生成完整本地导出…','loading');let sessionId;
 try{
  const begin=await request('PAIA_BACKUP_BEGIN_EXPORT');sessionId=begin.sessionId;const writer=new OpenExportWriter(format,begin.header),stamp=new Date().toISOString().replace(/[:.]/g,'-');let sequence=0;
  for(;;){const page=await request('PAIA_BACKUP_EXPORT_PAGE',{options:{sessionId,sequence:sequence++}});writer.add(page.items);if(page.done)break;await new Promise(resolve=>setTimeout(resolve,0));}
  const parts=writer.finish();downloadParts(parts,`PAIA-Complete-Open-Export-${stamp}.${format==='json'?'json':'md'}`,format==='json'?'application/json':'text/markdown');
  panel.status(english()?'File generated and download started. Confirm that you saved it in a secure location; the complete export file is not encrypted.':'文件已生成并开始下载。请确认保存在安全位置；完整导出文件本身未加密。','saved');
 }catch{panel.status(english()?'Complete export was not created. No automatic retry was made.':'完整导出未生成，也没有自动重试。','failed');}
 finally{if(sessionId)await request('PAIA_BACKUP_CANCEL',{options:{sessionId}}).catch(()=>{});panel.lock(false);}
}
function installPrivacy(){
 const host=$('memory-settings');if(!host||$('r6-hide-content-previews'))return;
 const section=element('section','r6-privacy-preview'),label=element('label','setting'),name=text('span','','隐藏内容预览','Hide content previews'),input=document.createElement('input');
 input.id='r6-hide-content-previews';input.type='checkbox';previewToggle=input;label.append(name,input);
 const note=text('p','muted','打开后，首页/搜索/主题列表等卡片不显示私人摘句；主动进入正文仍可阅读。不会改变搜索或数据，也不提供加密、账户锁或截图保护。','When enabled, private excerpts are hidden on home/search/topic cards; opening the full body still shows it. This does not change search or data and is not encryption, an account lock, or screenshot protection.');
 privacyStatus=element('p','muted');privacyStatus.id='r6-preview-status';section.append(label,note,privacyStatus);host.append(section);input.addEventListener('change',()=>void setPreviewMask(input.checked));void syncPrivacy();
}
function installData(panel){
 const host=$('backup-settings');if(!host||$('r6-complete-export'))return;
 const section=element('section','r6-data-exit');section.id='r6-complete-export';
 section.append(text('h3','','完整导出','Complete export'),text('p','muted','完整导出覆盖 Source、Input、Thought、人工版本与 AI 整理等明确角色；当前筛选 Source Records 的导出仍只代表当前筛选来源，不能冒充完整导出。PAIA Backup 与完整导出文件本身均未做应用层加密。','Complete export separates Source, Input, Thought, human revision and AI-presentation roles. The filtered Source Records export remains a filtered source export and is not a complete export. PAIA Backup and complete-export files are not application-layer encrypted.'));
 const actions=element('div','r6-export-actions'),json=text('button','','完整导出 JSON','Complete JSON export'),markdown=text('button','','完整导出 Markdown','Complete Markdown export');json.id='r6-export-json';markdown.id='r6-export-markdown';actions.append(json,markdown);section.append(actions);
 storageNode=text('p','muted','正在读取本机存储…','Reading local storage…');storageNode.id='r6-storage-estimate';lastBackupNode=element('p','muted');lastBackupNode.id='r6-last-backup';section.append(storageNode,lastBackupNode,text('p','muted','卸载扩展会清除扩展本机档案；导出或备份文件离开 PAIA 后由你自行保管。当前版本未提供设备同步。','Uninstalling the extension clears its local archive. Export/backup files are yours to store after they leave PAIA. Device sync is not available in this version.'));
 host.append(section);json.addEventListener('click',()=>void completeExport('json',panel));markdown.addEventListener('click',()=>void completeExport('markdown',panel));void refreshStorage();void refreshLastBackup();
 const settings=$('settings-panel');if(settings)new MutationObserver(()=>{if(!settings.hidden){void refreshStorage();void refreshLastBackup();void syncPrivacy();}}).observe(settings,{attributes:true,attributeFilter:['hidden']});
}
export function installR6Settings(panel){
 if(installed)return;installed=true;installStyles();installPrivacy();installData(panel);new MutationObserver(syncLocale).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 chrome.runtime.onMessage.addListener(message=>{if(message?.type==='ARCHIVE_CHANGED'&&message.cause==='UPDATE_PREFERENCES')void syncPrivacy();});
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&Object.keys(changes).some(key=>['settings','paia-settings'].includes(key)))void syncPrivacy();});
}
