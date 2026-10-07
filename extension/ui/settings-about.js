import {createIcon} from './icons.js';
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
const owners=new WeakMap();
export function mountSettingsAbout(host,{version,language=()=>document.documentElement.lang}={}){
 if(owners.has(host))return owners.get(host);
 const root=document.createElement('div');root.className='ux-settings-about';
 const installed=document.createElement('p');installed.className='ux-about-version';installed.textContent=`PAIA ${String(version||'')}`;
 const update=document.createElement('p');update.id='settings-update-status';update.className='ux-settings-note';update.setAttribute('role','status');
 const links=document.createElement('nav');links.className='ux-about-links';const nodes=new Map();
 for(const [key]of definitions){const link=document.createElement('a'),label=document.createElement('span');link.id=`settings-about-${key}`;link.className='ux-setting-row ux-about-link';link.append(label,createIcon('chevron-right'));links.append(link);nodes.set(key,{link,label});}
 root.append(installed,update,links);host.append(root);
 const sync=()=>{const locale=language(),chinese=locale==='zh-CN';update.textContent=chinese?'尚无可确认的更新状态。':'No confirmed update status is available.';links.setAttribute('aria-label',chinese?'关于 PAIA 的链接':'About PAIA links');for(const item of aboutDestinations(locale)){const {link,label}=nodes.get(item.key);label.textContent=item.label;link.href=item.href;link.setAttribute('aria-label',item.label+(item.external?(chinese?'（在新标签页打开）':' (opens in a new tab)'):(chinese?'（打开邮件应用）':' (opens your mail app)')));if(item.external){link.target='_blank';link.rel='noopener noreferrer';}else{link.removeAttribute('target');link.removeAttribute('rel');}}};
 const owner={sync,root};owners.set(host,owner);sync();return owner;
}
