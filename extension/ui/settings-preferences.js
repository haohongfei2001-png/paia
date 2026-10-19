import {installSettingsDetails} from './settings-details.js';
import {mountSettingsAbout} from './settings-about.js';
import {checkInstallationUpdate} from './installation-update-check.js';
import {settingsCaptureRecovery} from './settings-capture-recovery.js';
import {mountSettingsAIStyle} from './settings-ai-style.js';
import {mountSettingsNext} from './settings-next.js';
import {mountSettingsAssist} from './settings-assist.js';
import {mountSettingsCaptureConsent} from './settings-capture-consent.js';
import {mountSettingsPromptPosition} from './settings-prompt-position.js';
import {request,diagnosticText} from './common.js';
import {resolveAppearance,resolveLanguage,SETTINGS_GROUPS} from './ux-r1-state.js';
import {SettingsLocalState,timeDisplayValue,changePreferenceControl,withSettingsControlFocus} from './settings-local-state.js';
import {ArchiveOrderSettings} from './archive-order-settings.js';
import {setIconLabel,createIcon} from './icons.js';
const $=id=>document.getElementById(id);
const FONT_PX={small:16,standard:17,large:19,xlarge:21};
const WIDTH_PX={narrow:640,standard:680,wide:720};
const SETTINGS_LABELS={content:['输入档案','Input Archive'],reading:['阅读与外观','Reading & appearance'],ai:['AI 与提示词','AI & prompts'],privacy:['隐私与访问','Privacy & access'],data:['数据与恢复','Data & recovery'],about:['关于 PAIA','About PAIA']};
const PREFS=[
 ['ux-appearance','appearance','外观','Appearance',[['system','跟随系统','System'],['light','浅色','Light'],['dark','深色','Dark']]],
 ['ux-language','language','语言','Language',[['system','跟随系统','System'],['zh-CN','中文','中文'],['en','English','English']]],
 ['ux-font-size','fontSize','正文字号','Body text size',[['small','小','Small'],['standard','标准','Standard'],['large','大','Large'],['xlarge','特大','Extra large']]],
 ['ux-reading-width','readingWidth','阅读宽度','Reading width',[['narrow','紧凑','Compact'],['standard','标准','Standard'],['wide','宽','Wide']]],
 ['time-display','timeDisplay','时间显示','Time display',[['date_and_time','标准','Standard'],['date_and_seconds','详细','Detailed']]]
];
let captureConsent=null,style=null,promptNext=null,promptAssist=null,promptPosition=null,about=null,settingsDetails=null,settingsVisible=false,onBack=()=>{},onRouteChange=()=>{},group=null,installed=false,restoring=false,groupFocusSerial=0;
const groups=new Map(),tabs=new Map(),positions=new Map();
const archiveOrderSettings=new ArchiveOrderSettings();
const local=new SettingsLocalState({send:request,changed:()=>applyPreferences()});
let uxPreferences=local.preferences;
function node(tag,className='',text=''){const el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el;}
function button(text,className=''){const el=node('button',className,text);el.type='button';return el;}
function copyNode(tag,className,zh,en){const el=node(tag,className,copy(zh,en));el.dataset.settingsZh=zh;el.dataset.settingsEn=en;return el;}
function language(){return resolveLanguage(uxPreferences.language,navigator.language);}
function copy(zh,en){return language()==='zh-CN'?zh:en;}
function compact(){return globalThis.matchMedia?.('(max-width:1023px)').matches===true;}
function applyPreferences(){
 uxPreferences=local.preferences;const root=document.documentElement;
 root.dataset.paiaTheme=resolveAppearance(uxPreferences.appearance,globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches===true);
 const lang=language();root.dataset.paiaLanguage=lang;if(root.lang!==lang)root.lang=lang;
 root.style.setProperty('--paia-prose-size',`${FONT_PX[uxPreferences.fontSize]||17}px`);root.style.setProperty('--paia-prose-width',`${WIDTH_PX[uxPreferences.readingWidth]||680}px`);
 syncPreferenceControls();syncSettingsLocale();document.dispatchEvent(new CustomEvent('paia:preferences-applied'));
}
async function loadPreferences(){const wasUnknown=local.captureUnknown&&!local.capture?.consented;const page=await local.load();if(page){archiveOrderSettings.setConsented(local.capture.consented);presentSettingsStatus(page);if(wasUnknown&&local.capture.consented&&settingsVisible)document.dispatchEvent(new CustomEvent('paia:settings-capture-reconciled'));}return page;}
function syncPreferenceControls(){
 for(const [id,key] of PREFS){const el=$(id);if(!el)continue;el.disabled=!local.loaded||local.busy;const value=key==='timeDisplay'?timeDisplayValue(uxPreferences[key]):uxPreferences[key];if(document.activeElement!==el||local.busy||local.feedback==='save-error')el.value=value;}
 const capture=$('toggle-capture');if(capture){capture.disabled=!local.loaded||local.busy||local.captureUnknown||local.reading&&!local.capture?.consented;const on=local.capture?.consented===true&&local.capture.enabled===true;capture.setAttribute('aria-checked',String(on));capture.dataset.on=String(on);capture.textContent=local.captureUnknown?copy('不可用','Unavailable'):local.capture?copy(on?'开':'关',on?'On':'Off'):copy('读取中','Loading');}
 const retry=$('settings-read-retry');if(retry){retry.hidden=local.feedback!=='read-error'&&!local.captureUnknown;retry.disabled=local.busy;}
 captureConsent?.sync();const feedback=$('ux-settings-feedback');if(feedback){const text={saving:['正在保存…','Saving…'],saved:['已保存','Saved'],'read-error':['无法读取设置，保留上次确认的状态。','Could not read settings. Keeping the last confirmed state.'],'save-error':['保存未获确认，已重新核对设置。请重试。','Save was not confirmed. Settings were checked again. Please retry.']}[local.feedback];feedback.textContent=text?copy(...text):'';feedback.dataset.kind=local.feedback.endsWith('error')?'error':'status';}
}
export function presentSettingsStatus(page){
 const health=$('ux-capture-health');if(health){health.textContent=[diagnosticText(page),settingsCaptureRecovery(page,language())].filter(Boolean).join(' ');health.hidden=!health.textContent;}
 const status=$('ux-local-state');if(status){const failed=['STORAGE_FAILED','STORAGE_FULL'].includes(page?.diagnostics?.lastError?.code);status.textContent=failed?copy('本机保存遇到问题','Local storage unavailable'):copy('本机保存','Saved locally');status.dataset.kind=failed?'error':'ok';}
}
function tuneOnboarding(){
 const title=$('consent-title'),scope=$('consent-scope'),enable=$('enable-consent'),decline=$('decline-consent');
 if(title)title.textContent=copy('开始保存 AI 输入','Start saving AI inputs');
 if(scope)scope.textContent=copy('仅在本机保存普通聊天中已发送、已显示的用户文字；不保存草稿、AI 回复、附件正文或凭证，跳过临时聊天。','Save sent, visible user text in normal chats on this device. Drafts, AI replies, attachment bodies, credentials and Temporary Chat are excluded.');
 if(enable)enable.textContent=copy('开始保存','Start saving');if(decline)decline.textContent=copy('暂不开始','Not now');
 const summary=$('consent-details')?.querySelector('summary');if(summary)summary.textContent=copy('完整保存边界与本机存储说明','Full capture boundaries and local storage details');
 const english=[
 'Capture is off by default. Unsent drafts, keystrokes, AI replies and attachment bodies are excluded. Only attachment or quotation presence and confidence can inform local filtering.',
 'PAIA does not read cookies, credentials, passwords, browsing history, unrelated sites, Chrome profiles, system credential stores, clipboard or other local files.',
 'Capture and reading stay on this device. This action does not enable sync, analytics, AI services, external connections, next-input suggestions, uploads or billing.',
 'Temporary Chat is skipped, as are pages without a reliable conversation or message identity.',
 'Starting or resuming can capture eligible older user messages currently displayed, including messages sent while paused. PAIA does not scroll automatically or request server history. Capture time is not send time.',
 'Only bounded copies of history responses already received by the page can match user message IDs to reliable times; response bodies are not retained. Unreliable times remain unknown.',
 'Immutable Source records remain separate from editable Input and independent Thought content. Removing an Input preserves its Source and can be reversed; permanent Source deletion cannot restore the original from history.',
 'You can pause at any time. Existing backup files require validation, preview and explicit restore; replacement clears the current library and deletion markers prevail. Uninstalling removes local data. Storage has no application-layer encryption.',
 'Eligible user text is stored in Chrome extension local storage with the conversation title and ID, page order, first capture time, reliable send time and its source, and content hash. Page changes can cause missed capture or unknown send times; missing source times are never guessed.'
 ];
 for(const [index,item]of [...($('consent-details')?.querySelectorAll('li')||[])].entries()){item.dataset.zh??=item.textContent;item.textContent=copy(item.dataset.zh,english[index]||item.dataset.zh);}

}

function preferenceSelect([id,key,zh,en,options]){
 const label=node('label','setting ux-preference-setting');label.htmlFor=id;label.append(copyNode('span','',zh,en));const select=node('select');select.id=id;select.disabled=true;select.setAttribute('aria-describedby','ux-settings-feedback');
 for(const [value,zh,en]of options){const option=copyNode('option','',zh,en);option.value=value;select.append(option);}
 select.addEventListener('change',()=>void changePreferenceControl(local,key,select.value,select));select.addEventListener('blur',()=>{select.value=key==='timeDisplay'?timeDisplayValue(local.preferences[key]):local.preferences[key];});label.append(select);return label;
}
function row(zh,en,noteZh,noteEn,control){const row=node('div','ux-setting-row'),label=node('div','ux-setting-copy');label.append(copyNode('span','ux-setting-name',zh,en));if(noteZh)label.append(copyNode('p','ux-setting-description',noteZh,noteEn));row.append(label,control);return row;}
function detail(zh,en,children){const el=node('details','ux-settings-detail');el.append(copyNode('summary','',zh,en),...children.filter(Boolean));return el;}
function rememberPosition(){if(!settingsVisible||group===null)return;const focus=document.activeElement,host=groups.get(group);positions.set(group,{scrollTop:Math.max(0,Math.min(1000000,globalThis.scrollY||0)),focus:focus?.id&&host?.contains(focus)?focus.id.slice(0,100):null});}
export function captureSettingsView(){return {settingsGroup:group||'index',settingsPosition:positions.get(group)||{scrollTop:0,focus:null}};}
export function restoreSettingsView(value={}){const key=value.settingsGroup==='index'?'index':SETTINGS_LABELS[value.settingsGroup]?value.settingsGroup:null;if(key===null)return;restoring=true;try{if(value.settingsPosition)positions.set(key,value.settingsPosition);activateGroup(key,{history:false,focus:true});}finally{restoring=false;}}
function activateGroup(key,{history=true,focus=false}={}){
 if(key!=='about'&&about?.feedback?.dialog.open){const expected=groupFocusSerial,visible=settingsVisible;void about.leave().then(ok=>{if(ok&&groupFocusSerial===expected&&settingsVisible===visible)activateGroup(key,{history,focus});});return;}
 if(key!=='index'&&!groups.has(key))return;const serial=++groupFocusSerial;if(history)rememberPosition();const changed=group!==key;group=key;const index=key==='index';$('ux-settings-shell').dataset.settingsIndex=String(index);
 for(const [name,section]of groups)section.hidden=index||name!==key;for(const [name,tab]of tabs)tab.setAttribute('aria-current',name===key?'page':'false');
 const feedback=$('ux-settings-feedback');if(feedback){const host=groups.get(key);if(host)host.insertBefore(feedback,host.children[1]||null);else $('ux-settings-header')?.append(feedback);const retry=$('settings-read-retry');if(retry)feedback.after(retry);}
 $('ux-settings-group-back').hidden=index;syncSettingsLocale();if(history&&changed)onRouteChange({replace:false});if(settingsVisible&&key==='about')void about?.refresh();if(settingsVisible&&key==='ai'){void style?.refresh();void promptPosition?.refresh();void promptNext?.refresh();void promptAssist?.refresh();}
 if(focus&&settingsVisible){const expected=key,focused=document.activeElement;requestAnimationFrame(()=>{
  if(!settingsVisible||group!==expected||groupFocusSerial!==serial)return;
  // A delayed return must not override the user's next visible focus target.
  const active=document.activeElement;if(active&&active!==focused&&active!==document.body&&active.getClientRects().length)return;
  const position=positions.get(key),saved=position?.focus?$(position.focus):null,target=saved?.getClientRects().length?saved:index?[...tabs.values()][0]:$(`ux-settings-${key}-title`);target?.focus({preventScroll:true});globalThis.scrollTo?.(0,position?.scrollTop||0);
 });}
}
function setupSettingsShell(backup){
 const panel=$('settings-panel');if(!panel||$('ux-settings-shell'))return;const shell=node('div','ux-settings-shell');shell.id='ux-settings-shell';
 const head=node('header','ux-settings-header'),back=button('','ux-settings-back'),title=copyNode('h1','','设置','Settings'),feedback=node('p','ux-settings-feedback');
 const backLabel=setIconLabel(back,'back',copy('返回','Back'));backLabel.dataset.settingsZh='返回';backLabel.dataset.settingsEn='Back';head.id='ux-settings-header';back.id='ux-settings-back';title.id='ux-settings-title';panel.setAttribute('aria-labelledby',title.id);feedback.id='ux-settings-feedback';feedback.setAttribute('role','status');back.addEventListener('click',()=>onBack());head.append(title,back,feedback);const retry=copyNode('button','ux-settings-secondary','重试读取设置','Retry reading settings');retry.id='settings-read-retry';retry.type='button';retry.hidden=true;retry.setAttribute('aria-describedby',feedback.id);retry.addEventListener('click',event=>{if(event.isTrusted&&!local.busy)void loadPreferences();});head.append(retry);
 const layout=node('div','ux-settings-layout'),nav=node('nav','ux-settings-nav'),body=node('div','ux-settings-body'),groupBack=button('','ux-settings-group-back');groupBack.id='ux-settings-group-back';setIconLabel(groupBack,'back',copy('设置','Settings'));groupBack.addEventListener('click',()=>activateGroup('index',{focus:true}));body.append(groupBack);
 for(const [key]of SETTINGS_GROUPS){const section=node('section','ux-settings-group'),h=copyNode('h2','',...SETTINGS_LABELS[key]),tab=button('');section.dataset.group=key;section.id=`ux-settings-${key}-group`;h.id=`ux-settings-${key}-title`;h.tabIndex=-1;section.setAttribute('aria-labelledby',h.id);section.append(h);groups.set(key,section);body.append(section);tab.id=`ux-settings-${key}-link`;tab.dataset.settingsGroup=key;tab.append(copyNode('span','',...SETTINGS_LABELS[key]),createIcon('chevron-right'));tab.setAttribute('aria-controls',section.id);tab.addEventListener('click',()=>activateGroup(key,{focus:compact()}));tabs.set(key,tab);nav.append(tab);}
 layout.append(nav,body);shell.append(head,layout);panel.prepend(shell);const move=(id,key)=>{const el=$(id);if(el)groups.get(key).append(el);};
 const capture=$('toggle-capture');capture.className='ux-setting-switch';capture.type='button';capture.setAttribute('role','switch');capture.setAttribute('aria-describedby','ux-settings-feedback');capture.addEventListener('click',event=>{if(!local.loaded||local.busy||local.captureUnknown)return;if(!local.capture?.consented){if(event.isTrusted)captureConsent?.open();return;}void withSettingsControlFocus(capture,()=>local.setCapture(!local.capture.enabled));});
 groups.get('content').append(row('保存我的 AI 输入','Save my AI inputs',null,null,capture));move('smart-filter-settings','content');const health=node('p','ux-settings-note');health.id='ux-capture-health';health.hidden=true;health.setAttribute('role','status');groups.get('content').append(health,copyNode('p','ux-settings-note','当前支持 ChatGPT。临时聊天不自动保存。暂停不会删除已有输入；恢复时会保存页面中已显示的合格输入。','Currently supports ChatGPT. Temporary Chat is skipped. Pausing keeps saved inputs; resuming can save eligible inputs already visible on the page.'));
 captureConsent=mountSettingsCaptureConsent(groups.get('content'),{state:local,control:capture,language,isCurrent:()=>settingsVisible&&group==='content'});
 // SET2-UI-1.2: preferences apply to real readers; Settings has no sample corpus.
 for(const pref of PREFS)groups.get('reading').append(preferenceSelect(pref));
 move('settings-ai-context','ai');move('settings-prompt-status','ai');promptNext=mountSettingsNext($('settings-prompt-status'),{send:request,language,storage:chrome.storage,runtime:chrome.runtime});promptAssist=mountSettingsAssist($('settings-prompt-status'),{send:request,language,storage:chrome.storage,runtime:chrome.runtime});promptPosition=mountSettingsPromptPosition($('settings-prompt-status'),{send:request,language,storage:chrome.storage});style=mountSettingsAIStyle(groups.get('ai'),{send:request,language,runtime:chrome.runtime,storage:chrome.storage});move('settings-legacy-access','ai');move('settings-privacy-host','privacy');move('settings-supported-sites','privacy');
 const backupFailure=copyNode('h3','ux-backup-failure-title','这份备份未通过校验','This backup could not be validated');backupFailure.id='ux-backup-failure-title';$('backup-status')?.before(backupFailure);
 move('history-settings','data');const data=groups.get('data');data.append(detail('存储空间','Storage space',[$('r6-data-status')]),detail('从已有 PAIA 备份恢复','Restore an existing PAIA backup',[$('backup-settings')]),detail('已移除的内容','Removed content',[$('manage-excluded'),$('library-management')]));move('r6-source-records','data');move('legacy-entry','data');move('product-diagnostics','data');
 settingsDetails=installSettingsDetails({dataGroup:groups.get('data'),language,backup});
 about=mountSettingsAbout(groups.get('about'),{version:chrome.runtime.getManifest().version,language,send:request,readUpdateStatus:()=>request('PAIA_SETTINGS_UPDATE_STATUS'),checkForUpdate:typeof chrome.runtime.requestUpdateCheck==='function'?()=>checkInstallationUpdate(chrome.runtime,chrome.storage.local):undefined});
 const orderHost=$('archive-order-host');if(orderHost)orderHost.append(archiveOrderSettings.element());activateGroup(compact()?'index':'content',{history:false});
}
export function syncSettingsCopy(root=document){for(const el of root.querySelectorAll('[data-settings-zh]')){const text=copy(el.dataset.settingsZh,el.dataset.settingsEn);if(el.textContent!==text)el.textContent=text;}}
function syncSettingsLocale(){syncSettingsCopy();tuneOnboarding();captureConsent?.sync();style?.sync();promptPosition?.sync();promptNext?.sync();promptAssist?.sync();about?.sync();settingsDetails?.sync();document.querySelector('.ux-settings-nav')?.setAttribute('aria-label',copy('设置分组','Settings groups'));const back=$('ux-settings-group-back');if(back)setIconLabel(back,'back',copy('设置','Settings'));$('toggle-capture')?.setAttribute('aria-label',copy('保存我的 AI 输入','Save my AI inputs'));}
export function installSettingsPreferences({back=()=>{},routeChanged=()=>{},backup=null}={}){
 if(installed)return;installed=true;onBack=back;onRouteChange=routeChanged;setupSettingsShell(backup);tuneOnboarding();void loadPreferences();
 chrome.runtime.onMessage.addListener(message=>{if(['ARCHIVE_CHANGED','PAIA_READER_POLICY_CHANGED'].includes(message?.type))void loadPreferences();});chrome.storage?.onChanged?.addListener((changes,area)=>{if(area==='local'&&Object.keys(changes).some(key=>['settings','paia-settings'].includes(key)))void loadPreferences();if(area==='local'&&changes['paia-consumer-update:v1']&&settingsVisible&&group==='about')void about?.refresh();});
 globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.addEventListener?.('change',()=>{if(uxPreferences.appearance==='system')applyPreferences();});globalThis.addEventListener?.('languagechange',()=>{if(uxPreferences.language==='system')applyPreferences();});globalThis.matchMedia?.('(max-width:1023px)')?.addEventListener?.('change',()=>{if(!compact()&&group==='index')activateGroup('content',{history:false});});
 const savePosition=()=>{if(settingsVisible&&!restoring){rememberPosition();onRouteChange({replace:true});}};globalThis.addEventListener?.('scroll',savePosition,{passive:true});$('settings-panel')?.addEventListener('focusin',savePosition);
}
export function presentSettingsPreferences({visible=false}={}){const opening=visible&&!settingsVisible;if(!visible&&settingsVisible){rememberPosition();groupFocusSerial++;}settingsVisible=visible;captureConsent?.sync();if(opening){syncSettingsLocale();if(group===null)activateGroup(compact()?'index':'content',{history:false});else if(group==='about')void about?.refresh();else if(group==='ai'){void style?.refresh();void promptPosition?.refresh();void promptNext?.refresh();void promptAssist?.refresh();}}}
export {presentSettingsRecovery} from './maintenance-recovery.js';

export function canLeaveSettingsCapture(){return captureConsent?.canLeave()!==false;}

export function leaveSettingsFeedback(){return about?.leave()??Promise.resolve(true);}
export function settingsFeedbackEditor(){return about?.feedback?.session??null;}
