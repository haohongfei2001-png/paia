import {createIcon} from './icons.js';
import {recoveryGuidance} from './recovery-guidance.js';
const SITE='https://inputarchive.com';
const definitions=Object.freeze([
 ['privacy','隐私说明','Privacy','privacy-policy.html'],
 ['terms','使用条款','Terms of use','terms.html'],
 ['help','帮助','Help','how-it-works.html'],
 ['feedback','反馈','Feedback',null]
]);
// These are published product destinations, verified against repository bytes.
// No private data is placed in URLs, and mounting never opens or fetches them.
export function aboutDestinations(language){const chinese=language==='zh-CN';return definitions.map(([key,zh,en,path])=>({key,label:chinese?zh:en,href:path?`${SITE}/${chinese?'zh/':''}${path}`:'mailto:haohongfei2001@gmail.com',external:!!path}));}
export function aboutUpdateText(state,chinese){
 if(state?.state==='checking')return chinese?'正在检查此安装来源的更新…':'Checking updates for this installation source…';
 if(state?.state==='checked-none')return chinese?'此安装来源目前没有待安装更新。':'This installation source currently has no pending update.';
 if(state?.state==='check-unavailable')return chinese?recoveryGuidance('UPDATE_CHECK_FAILED').detail:'This update check could not be confirmed. Keep the current installation and local data; retry manually later. This does not mean an update was installed.';
 if(state?.state==='loading')return chinese?'正在读取更新状态…':'Reading update status…';
 if(state?.state==='error')return chinese?'暂时无法读取更新状态。重新打开“关于 PAIA”可重试。':'Could not read update status. Reopen About PAIA to retry.';
 if(state?.state==='available')return chinese?`Chrome 已报告可用版本 ${state.targetVersion}。你可以继续当前工作。`:`Chrome reported version ${state.targetVersion} available. You can keep working.`;
 if(state?.state==='installed')return chinese?'Chrome 已报告当前版本安装完成。':'Chrome reported this version installed.';
 return chinese?'尚无可确认的更新状态。':'No confirmed update status is available.';
}
const owners=new WeakMap();
export function mountSettingsAbout(host,{version,language=()=>document.documentElement.lang,readUpdateStatus,checkForUpdate}={}){
 if(owners.has(host))return owners.get(host);
 let updateState={state:'unknown'},readEpoch=0,checking=false;
 const root=document.createElement('div');root.className='ux-settings-about';
 const installed=document.createElement('p');installed.className='ux-about-version';installed.textContent=`PAIA ${String(version||'')}`;
 const update=document.createElement('p');update.id='settings-update-status';update.className='ux-settings-note';update.setAttribute('role','status');
 const links=document.createElement('nav');links.className='ux-about-links';const nodes=new Map();
 for(const [key]of definitions){const link=document.createElement('a'),label=document.createElement('span');link.id=`settings-about-${key}`;link.className='ux-setting-row ux-about-link';link.append(label,createIcon('chevron-right'));links.append(link);nodes.set(key,{link,label});}
 const check=typeof checkForUpdate==='function'?document.createElement('button'):null;
 if(check){check.id='settings-check-update';check.type='button';check.className='ux-settings-secondary';check.setAttribute('aria-describedby',update.id);check.addEventListener('click',event=>{if(event.isTrusted)void performCheck();});}
 root.append(installed,update);if(check)root.append(check);root.append(links);host.append(root);
 const sync=()=>{const locale=language(),chinese=locale==='zh-CN';update.textContent=aboutUpdateText(updateState,chinese);update.setAttribute('aria-busy',String(updateState.state==='loading'||checking));if(check){check.disabled=checking;check.textContent=updateState.state==='check-unavailable'?(chinese?'重试检查':'Retry check'):(chinese?'检查此安装的更新':'Check this installation for updates');}links.setAttribute('aria-label',chinese?'关于 PAIA 的链接':'About PAIA links');for(const item of aboutDestinations(locale)){const {link,label}=nodes.get(item.key);label.textContent=item.label;link.href=item.href;link.setAttribute('aria-label',item.label+(item.external?(chinese?'（在新标签页打开）':' (opens in a new tab)'):(chinese?'（打开邮件应用）':' (opens your mail app)')));if(item.external){link.target='_blank';link.rel='noopener noreferrer';}else{link.removeAttribute('target');link.removeAttribute('rel');}}};
 const refresh=async()=>{if(!readUpdateStatus||checking)return;const epoch=++readEpoch;updateState={state:'loading'};sync();try{const value=await readUpdateStatus();if(epoch!==readEpoch)return;updateState=value?.version===version&&['available','installed','unknown'].includes(value.state)?value:{state:'unknown'};}catch{if(epoch!==readEpoch)return;updateState={state:'error'};}sync();};
 async function performCheck(){if(checking||!checkForUpdate)return;checking=true;const epoch=++readEpoch;updateState={state:'checking'};sync();try{const value=await checkForUpdate();if(epoch===readEpoch)updateState=value?.version===version&&['available','checked-none','check-unavailable'].includes(value.state)?value:{state:'check-unavailable'};}catch{if(epoch===readEpoch)updateState={state:'check-unavailable'};}finally{checking=false;sync();}}
 const owner={sync,refresh,root};owners.set(host,owner);sync();return owner;
}
