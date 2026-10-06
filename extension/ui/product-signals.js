import {request} from './common.js';
import {normalizeUXPreferences,resolveAppearance} from './ux-r1-state.js';
import {setIconLabel} from './icons.js';

// This compatibility URL only manages records created before feature retirement.
const $=id=>document.getElementById(id);
setIconLabel($('local-tools-back'),'back',$('local-tools-back').textContent);
for(const summary of document.querySelectorAll('details > summary'))setIconLabel(summary,'chevron-right',summary.textContent,{side:'end',iconClass:'local-tools-disclosure-icon'});
let usage=null,passport=null,busy=false,uxPreferences=normalizeUXPreferences();
const appearanceMedia=globalThis.matchMedia?.('(prefers-color-scheme: dark)');
function applyAppearance(value){uxPreferences=normalizeUXPreferences(value);document.documentElement.dataset.paiaTheme=resolveAppearance(uxPreferences.appearance,appearanceMedia?.matches);}
appearanceMedia?.addEventListener?.('change',()=>{if(uxPreferences.appearance==='system')applyAppearance(uxPreferences);});
const labels={consumer:{chatgpt:'ChatGPT',claude:'Claude',gemini:'Gemini',coding_agent:'Coding Agent',other_ai:'其他 AI',manual:'手动'},purpose:{general:'通用协助',research:'研究',coding:'编程',career:'职业 / 求职',writing:'写作',current_task:'当时的任务'},duration:{once:'仅一次','7d':'7 天','30d':'30 天'},state:{active:'尚未撤销',revoked:'已撤销',expired:'已过期',consumed:'已使用'},action:{copy:'复制',markdown:'导出 Markdown',manual_copy:'手动复制',manual_markdown:'手动导出 Markdown'}};
const fmt=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('zh-CN'):'—';
function message(area,text,state=''){const node=$(area+'-status');node.textContent=text;node.dataset.state=state;}
function node(tag,text,className){const element=document.createElement(tag);element.textContent=text;if(className)element.className=className;return element;}
function syncControls(){
 $('signals-refresh').disabled=busy;
 $('signals-disable').disabled=busy||usage?.legacyEnabled!==true;
 $('signals-clear').disabled=busy||usage?.hasHistory!==true;
 $('passport-clear-audits').disabled=busy||!passport?.audits?.length;
 for(const button of $('passport-grants').querySelectorAll('button'))button.disabled=busy;
}
function renderUsage(){
 $('signals-collection').textContent=!usage?'记录状态暂不可用。':usage.legacyEnabled?'采集功能已停用。旧开关仍为开启状态，可以关闭；已有记录会继续保留。':usage.hasHistory?'采集功能已停用。已有记录会继续保留，直到你明确清空。':'采集功能已停用。目前没有历史聚合记录。';
}
function renderPassport(){
 const grants=$('passport-grants'),audits=$('passport-audit-list');grants.replaceChildren();audits.replaceChildren();
 if(!passport){grants.append(node('p','授权记录暂不可用，请刷新重试。','muted'));return;}
 for(const grant of passport.grants||[]){
  const card=node('div','','grant-card'),info=node('div','');
  info.append(node('strong',`${labels.consumer[grant.consumer]||grant.consumer} · ${labels.purpose[grant.purpose]||grant.purpose}`));
  info.append(node('p',`范围引用：${grant.profileId} · ${labels.duration[grant.duration]||grant.duration}${grant.expiresAt?' · 到期 '+fmt(grant.expiresAt):''}`));
  info.append(node('p',`创建：${fmt(grant.createdAt)}${grant.revokedAt?' · 撤销：'+fmt(grant.revokedAt):''}`));
  info.append(node('span',labels.state[grant.state]||'状态未知','grant-state'));
  card.append(info);
  if(grant.state==='active'){
   const revoke=node('button','撤销','danger');revoke.type='button';
   revoke.addEventListener('click',()=>void mutate({area:'passport',type:'PAIA_PASSPORT_REVOKE',fields:{grantId:grant.grantId},confirmation:'撤销这条授权？后续受控使用会被拒绝，之前已带出的文字无法收回。',success:'授权已撤销。',failure:'授权未能撤销，请刷新后重试。'}));card.append(revoke);
  }
  grants.append(card);
 }
 if(!passport.grants?.length)grants.append(node('p','没有已有授权记录。','muted'));
 for(const audit of passport.audits||[]){const item=node('div','','audit-row');item.append(node('span',fmt(audit.createdAt)),node('span',`${labels.consumer[audit.consumer]||audit.consumer} · ${labels.purpose[audit.purpose]||audit.purpose} · ${audit.profileId} · ${labels.action[audit.action]||audit.action}`));audits.append(item);}
 if(!passport.audits?.length)audits.append(node('p','没有已有访问审计。','muted'));
}
async function refreshRecords(){
 const [stored,permissions,page]=await Promise.allSettled([request('PAIA_PRODUCT_STATUS'),request('PAIA_PASSPORT_STATUS'),request('GET_PAGE',{page:{view:'settings'}})]);
 usage=stored.status==='fulfilled'?stored.value:null;passport=permissions.status==='fulfilled'?permissions.value:null;
 if(page.status==='fulfilled'&&page.value?.preferences)applyAppearance(page.value.preferences);
 renderUsage();renderPassport();
 if(!usage)message('signals','无法读取历史记录，请刷新重试。','failed');
 if(!passport)message('passport','无法读取授权记录，请刷新重试。','failed');
}
async function load(){
 if(busy)return;busy=true;syncControls();message('signals','正在读取历史记录…');message('passport','正在读取授权记录…');
 try{await refreshRecords();if(usage)message('signals','已有记录已读取。');if(passport)message('passport','已有授权记录已读取。');}finally{busy=false;syncControls();}
}
async function mutate({area,type,fields,confirmation,success,failure}){
 if(busy||confirmation&&!confirm(confirmation))return;
 busy=true;syncControls();message(area,'正在处理…');
 try{
  await request(type,fields);await refreshRecords();
  const readable=area==='signals'?usage:passport;
  message(area,success+(readable?'':' 当前记录暂未能重新读取，请刷新。'),readable?'saved':'failed');
 }catch{message(area,failure,'failed');}finally{busy=false;syncControls();}
}
$('signals-refresh').addEventListener('click',()=>void load());
$('signals-disable').addEventListener('click',()=>void mutate({area:'signals',type:'PAIA_PRODUCT_SETTINGS',fields:{settings:{enabled:false}},success:'旧记录开关已关闭。',failure:'旧记录开关未能关闭，请重试。'}));
$('signals-clear').addEventListener('click',()=>void mutate({area:'signals',type:'PAIA_PRODUCT_CLEAR',fields:{confirm:true},confirmation:'永久清空已有本机聚合统计？此操作无法撤销，不会删除档案、思想、授权记录或版本历史。',success:'已有统计已清空。',failure:'已有统计未能清空，请重试。'}));
$('passport-clear-audits').addEventListener('click',()=>void mutate({area:'passport',type:'PAIA_PASSPORT_CLEAR_AUDITS',fields:{confirm:true},confirmation:'永久清空已有访问审计？此操作无法撤销，授权记录本身会保留。',success:'访问审计已清空。',failure:'访问审计未能清空，请重试。'}));
void load();
