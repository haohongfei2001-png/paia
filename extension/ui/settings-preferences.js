import {request,diagnosticText} from './common.js';
import {normalizeUXPreferences,resolveAppearance,resolveLanguage,SETTINGS_GROUPS} from './ux-r1-state.js';
import {ArchiveOrderSettings} from './archive-order-settings.js';
import {setIconLabel} from './icons.js';

const $=id=>document.getElementById(id);
const FONT_PX={small:16,standard:17,large:19,xlarge:21};
const WIDTH_PX={narrow:640,standard:680,wide:720};
let preferenceRead=0;
let uxPreferences=normalizeUXPreferences(),preferenceBusy=false,settingsVisible=false;let onBack=()=>{};
const archiveOrderSettings=new ArchiveOrderSettings();

function node(tag,className='',text=''){const el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el;}
function button(text,className=''){const el=node('button',className,text);el.type='button';return el;}
function copyNode(tag,className,zh,en){const el=node(tag,className,copy(zh,en));el.dataset.settingsZh=zh;el.dataset.settingsEn=en;return el;}
function language(){return resolveLanguage(uxPreferences.language,navigator.language);}
function copy(zh,en){return language()==='zh-CN'?zh:en;}

function applyPreferences(){
 const dark=globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches===true,theme=resolveAppearance(uxPreferences.appearance,dark),root=document.documentElement;
 const lang=language();root.dataset.paiaTheme=theme;root.dataset.paiaLanguage=lang;if(root.lang!==lang)root.lang=lang;root.style.setProperty('--paia-prose-size',`${FONT_PX[uxPreferences.fontSize]||17}px`);root.style.setProperty('--paia-prose-width',`${WIDTH_PX[uxPreferences.readingWidth]||680}px`);
 syncPreferenceControls();syncSettingsLocale();document.dispatchEvent(new CustomEvent('paia:preferences-applied'));
}
async function loadPreferences(){
 const read=++preferenceRead;
 try{const page=await request('GET_PAGE',{page:{view:'settings'}});if(read!==preferenceRead)return null;archiveOrderSettings.setConsented(page.settings?.consentVersion===1);uxPreferences=normalizeUXPreferences(page.preferences);applyPreferences();updateLocalStatus(page);return page;}catch{if(read!==preferenceRead)return null;applyPreferences();const state=$('ux-local-state');if(state)state.textContent=copy('本机保存遇到问题','Local storage unavailable');return null;}
}
async function savePreference(key,value,control){
 if(preferenceBusy)return;preferenceBusy=true;const before=uxPreferences[key],status=$('ux-settings-feedback');
 try{await request('UPDATE_PREFERENCES',{changes:{[key]:value}});uxPreferences={...uxPreferences,[key]:value};applyPreferences();if(status){status.textContent=copy('立即应用','Applied');status.dataset.kind='success';}}
 catch{uxPreferences={...uxPreferences,[key]:before};if(control){if(control.type==='checkbox')control.checked=!!before;else control.value=String(before);}applyPreferences();if(status){status.textContent=copy('设置尚未保存，已恢复原值。','Setting was not saved; the previous value was restored.');status.dataset.kind='error';}}
 finally{preferenceBusy=false;}
}
export function presentSettingsStatus(page){
 const scan=$('ux-capture-last'),health=$('ux-capture-health');if(scan){const at=page?.diagnostics?.lastSuccessAt,valid=typeof at==='string'&&Number.isFinite(Date.parse(at));scan.textContent=valid?copy('最近一次成功扫描：','Last successful scan: ')+new Date(at).toLocaleString(language()):copy('尚无成功扫描的时间记录。','No successful scan time has been recorded.');}if(health)health.textContent=diagnosticText(page);
}
function updateLocalStatus(page){presentSettingsStatus(page);const el=$('ux-local-state');if(!el)return;const failed=page?.diagnostics?.lastError?.code==='STORAGE_FAILED'||page?.diagnostics?.lastError?.code==='STORAGE_FULL';el.textContent=failed?copy('本机保存遇到问题','Local storage unavailable'):copy('本机保存','Saved locally');el.dataset.kind=failed?'error':'ok';}

function tuneOnboarding(){
 const consent=$('consent-panel');if(consent){const eyebrow=consent.querySelector('.eyebrow'),title=$('consent-title'),paras=[...consent.querySelectorAll(':scope > p:not(.muted)')];if(eyebrow)eyebrow.textContent=copy('本机保存','LOCAL SAVE');if(title)title.textContent=copy('保存你的表达','Save what you share');if(paras[0])paras[0].textContent=copy('PAIA 把你发给 AI 的文字留在本机，方便以后阅读、找到，并继续使用。','PAIA keeps the text you send to AI on this device so you can read, find and reuse it later.');if(paras[1])paras[1].textContent=copy('保存范围：普通聊天中已经发送、已经显示的用户文字；不保存草稿、完整 AI 回复、附件正文或账户凭证。Temporary Chat 默认跳过。','Saved scope: user text already sent and visible in normal chats. Drafts, full AI replies, attachment bodies and credentials are excluded. Temporary Chat is skipped by default.');if(paras[2])paras[2].textContent=copy('收录、导入和阅读都在本机。会员 AI 服务、同步和外部连接尚未开放。','Capture, import and reading stay on this device. Membership AI, sync and external connections are not available.');const enable=$('enable-consent');if(enable)enable.textContent=copy('开始在本机保存','Start saving locally');
  if(!$('ux-onboarding-example')){const demo=button(copy('先看看示例','View an example'),'ux-onboarding-example');demo.id='ux-onboarding-example';demo.addEventListener('click',()=>$('ux-example-dialog')?.showModal());enable?.after(demo);}
 }
 const history=$('onboarding-history-step');if(history){const h=history.querySelector('h2'),p=history.querySelector('p');if(h)h.textContent=copy('导入历史内容','Import earlier content');if(p)p.textContent=copy('可选择 ChatGPT 官方导出 ZIP 或聊天 JSON。先预览，再确认写入；整个导入过程不会调用 AI。','Choose an official ChatGPT export ZIP or chat JSON. Preview first, then confirm; importing does not call AI.');if($('onboarding-history'))$('onboarding-history').textContent=copy('选择历史导出文件','Choose history export');if($('onboarding-skip'))$('onboarding-skip').textContent=copy('以后再说','Maybe later');const later=history.querySelector('p.muted');if(later)later.textContent=copy('以后也可在此导入。','You can import here later.');}
 if(!$('ux-example-dialog')){const dialog=node('dialog','ux-example-dialog');dialog.id='ux-example-dialog';dialog.setAttribute('aria-labelledby','ux-example-title');const h=node('h2','',copy('一条输入在 PAIA 里会这样留下','An input can stay in PAIA like this'));h.id='ux-example-title';const body=node('div','ux-example-body');body.append(node('small','',copy('2026年9月 · 示例，不会写入你的档案','September 2026 · Example only; not saved')),node('p','',copy('我希望把散落在 AI 聊天里的长期想法真正留给自己，而不是每次从头开始。','I want the long-term ideas scattered across AI chats to remain mine, instead of starting over each time.')));const close=button(copy('关闭示例','Close example'));close.addEventListener('click',()=>dialog.close());dialog.append(h,body,close);document.body.append(dialog);}
}

function preferenceSelect(id,labelText,options,key){const label=node('label','setting ux-preference-setting');label.htmlFor=id;label.append(node('span','',labelText));const select=node('select');select.id=id;for(const [value,text] of options){const option=node('option','',text);option.value=value;select.append(option);}select.addEventListener('change',()=>void savePreference(key,select.value,select));label.append(select);return label;}
function syncPreferenceControls(){for(const [id,key] of [['ux-appearance','appearance'],['ux-language','language'],['ux-font-size','fontSize'],['ux-reading-width','readingWidth']]){const el=$(id);if(el&&document.activeElement!==el)el.value=String(uxPreferences[key]);}}
function setupSettingsShell(){
 const panel=$('settings-panel');if(!panel||$('ux-settings-shell'))return;
 const shell=node('div','ux-settings-shell');shell.id='ux-settings-shell';const head=node('header','ux-settings-header'),back=button('','ux-settings-back'),title=copyNode('h1','','设置','Settings'),feedback=node('p','ux-settings-feedback');const backLabel=setIconLabel(back,'back',copy('返回','Back'));backLabel.dataset.settingsZh='返回';backLabel.dataset.settingsEn='Back';back.id='ux-settings-back';title.id='ux-settings-title';feedback.id='ux-settings-feedback';feedback.setAttribute('role','status');back.addEventListener('click',()=>onBack());head.append(back,title,feedback);
 const layout=node('div','ux-settings-layout'),nav=node('nav','ux-settings-nav'),body=node('div','ux-settings-body');nav.setAttribute('aria-label',copy('设置分组','Settings groups'));const groups=new Map(),tabs=new Map();
 const groupEnglish=Object.fromEntries(Object.entries(SETTINGS_LABELS).map(([key,pair])=>[key,pair[1]]));
 const mobileSwitch=node('label','ux-settings-mobile-switch'),mobileSwitchLabel=copyNode('span','','当前分组','Current group'),mobileSelect=node('select');mobileSelect.id='ux-settings-group-switch';mobileSelect.setAttribute('aria-label',copy('切换设置分组','Switch settings group'));mobileSwitch.append(mobileSwitchLabel,mobileSelect);nav.append(mobileSwitch);
 const activateGroup=key=>{const section=groups.get(key);if(!section)return;for(const [group,item] of groups)item.hidden=group!==key;for(const [group,tab] of tabs)tab.setAttribute('aria-current',group===key?'page':'false');if(mobileSelect.value!==key)mobileSelect.value=key;};
 for(const [key,zh] of SETTINGS_GROUPS){
  const label=language()==='zh-CN'?SETTINGS_LABELS[key][0]:groupEnglish[key],section=node('section','ux-settings-group'),h=node('h2','',label),tab=button(label),option=node('option','',label);section.dataset.group=key;section.id=`ux-settings-${key}-group`;section.hidden=key!=='content';h.id=`ux-settings-${key}-title`;section.setAttribute('aria-labelledby',h.id);section.append(h);groups.set(key,section);body.append(section);
  tab.dataset.settingsGroup=key;tab.setAttribute('aria-current',key==='content'?'page':'false');tab.setAttribute('aria-controls',section.id);tab.addEventListener('click',()=>activateGroup(key));tabs.set(key,tab);nav.append(tab);
  option.value=key;mobileSelect.append(option);
 }
 mobileSelect.value='content';mobileSelect.addEventListener('change',()=>activateGroup(mobileSelect.value));
 layout.append(nav,body);shell.append(head,layout);panel.prepend(shell);
 const move=(target,key)=>{const el=typeof target==='string'?$(target):target;if(el&&groups.get(key))groups.get(key).append(el);};
 const capture=node('section','ux-capture-summary');capture.id='ux-capture-summary';capture.setAttribute('aria-labelledby','ux-capture-title');
 const captureTitle=copyNode('h3','','捕获状态','Capture status');captureTitle.id='ux-capture-title';capture.append(captureTitle);
 for(const id of ['enabled-state','toggle-capture'])if($(id))capture.append($(id));
 const provider=copyNode('p','','当前适用来源：ChatGPT','Current supported source: ChatGPT'),last=node('p','muted'),health=node('p','muted');last.id='ux-capture-last';health.id='ux-capture-health';
 capture.append(provider,last,health,copyNode('p','muted','临时会话不会自动保存。','Temporary chats are not saved automatically.'));
 groups.get('content').append(capture);
 move('smart-filter-settings','content');move('history-settings','data');

 move($('time-display')?.closest('.setting'),'reading');move($('time-emphasis')?.closest('.setting'),'reading');
 const reading=groups.get('reading'),existing=[...reading.children].filter(child=>child.tagName!=='H2');
 reading.append(preferenceSelect('ux-appearance',copy('外观','Appearance'),[['system',copy('跟随系统','Follow system')],['light',copy('浅色','Light')],['dark',copy('深色','Dark')]],'appearance'));
 reading.append(preferenceSelect('ux-font-size',copy('阅读字号','Body text size'),[['small','16 px'],['standard','17 px'],['large','19 px'],['xlarge','21 px']],'fontSize'));
 reading.append(preferenceSelect('ux-reading-width',copy('正文宽度','Reading width'),[['narrow','640 px'],['standard','680 px'],['wide','720 px']],'readingWidth'));
 const motion=node('div','setting ux-reduced-motion');motion.id='ux-reduced-motion';motion.append(copyNode('span','','减少动态效果','Reduced motion'),copyNode('span','ux-setting-value','跟随系统','Follow system'));reading.append(motion);
 reading.append(preferenceSelect('ux-language',copy('界面语言','Interface language'),[['system',copy('跟随系统','Follow system')],['zh-CN','简体中文'],['en','English']],'language'));
 reading.append(...existing);
 groups.get('reading').append(archiveOrderSettings.element());
 move('membership-ai-service','ai');move('memory-settings','privacy');
 const backupFailure=copyNode('h3','ux-backup-failure-title','这份备份未通过校验','This backup could not be validated');backupFailure.id='ux-backup-failure-title';$('backup-status')?.before(backupFailure);
 for(const id of ['onboarding-history-step','onboarding-error','backup-settings','r6-data-status','r6-source-records','library-management','manage-excluded','legacy-entry'])move(id,'data');if(!$('r6-source-records')){const sourceButton=[...panel.querySelectorAll('[data-view="archive"]')].find(el=>!el.closest('#primary-nav'));move(sourceButton,'data');}const syncFact=node('div','ux-capability-fact');syncFact.append(copyNode('strong','','设备同步','Device sync'),copyNode('p','muted','当前版本未提供设备同步。','Device sync is not available in this version.'));groups.get('data').append(syncFact);
 for(const id of ['settings-version-history','product-diagnostics','diagnostics'])move(id,'advanced');
 for(const child of [...panel.children]){if(child===shell)continue;if(child.tagName==='H2'){child.remove();continue;}groups.get('advanced').append(child);}
 syncPreferenceControls();
}

// Preference refresh stays independent of the retired Archive shortcut cards.
function installPreferenceUpdates(){
 chrome.runtime.onMessage.addListener(message=>{if(['ARCHIVE_CHANGED','PAIA_READER_POLICY_CHANGED'].includes(message?.type))void loadPreferences();});
 const media=globalThis.matchMedia?.('(prefers-color-scheme: dark)');media?.addEventListener?.('change',()=>{if(uxPreferences.appearance==='system')applyPreferences();});
}


let installed=false;
export function installSettingsPreferences({back=()=>{}}={}){
 if(installed)return;installed=true;onBack=back;setupSettingsShell();tuneOnboarding();void loadPreferences();
 installPreferenceUpdates();
}

const SETTINGS_LABELS={
 content:['收录','Capture'],reading:['阅读与外观','Reading & appearance'],ai:['会员与 AI 服务','Membership & AI service'],
 privacy:['隐私','Privacy'],data:['数据与恢复','Data & recovery'],advanced:['高级','Advanced']
};
export function syncSettingsCopy(root=document){for(const el of root.querySelectorAll('[data-settings-zh]')){const text=copy(el.dataset.settingsZh,el.dataset.settingsEn);if(el.textContent!==text)el.textContent=text;}}
function syncSettingsLocale(){
 syncSettingsCopy();
 for(const [id,zh,en]of [['ux-appearance','外观','Appearance'],['ux-font-size','阅读字号','Body text size'],['ux-reading-width','正文宽度','Reading width'],['ux-language','界面语言','Interface language']]){const label=$(id)?.closest('label')?.querySelector('span');if(label)label.textContent=copy(zh,en);}


 for(const [key,pair] of Object.entries(SETTINGS_LABELS)){
  const text=pair[language()==='zh-CN'?0:1],tab=document.querySelector(`[data-settings-group="${key}"]`),heading=document.querySelector(`.ux-settings-group[data-group="${key}"] > h2`),option=document.querySelector(`#ux-settings-group-switch option[value="${key}"]`);
  if(tab&&tab.textContent!==text)tab.textContent=text;if(heading&&heading.textContent!==text)heading.textContent=text;if(option&&option.textContent!==text)option.textContent=text;
 }
 const switcher=$('ux-settings-group-switch'),switcherLabel=document.querySelector('.ux-settings-mobile-switch > span');if(switcher){const text=language()==='zh-CN'?'切换设置分组':'Switch settings group';if(switcher.getAttribute('aria-label')!==text)switcher.setAttribute('aria-label',text);}if(switcherLabel){const text=language()==='zh-CN'?'当前分组':'Current group';if(switcherLabel.textContent!==text)switcherLabel.textContent=text;}
 const capability=document.querySelector('.ux-capability-fact');if(capability){const heading=capability.querySelector('strong'),detail=capability.querySelector('p'),headingText=language()==='zh-CN'?'设备同步':'Device sync',detailText=language()==='zh-CN'?'当前版本未提供设备同步。':'Device sync is not available in this version.';if(heading&&heading.textContent!==headingText)heading.textContent=headingText;if(detail&&detail.textContent!==detailText)detail.textContent=detailText;}
 const read=$('history-read');if(read){const text=language()==='zh-CN'?'读一篇':'Read one';if(read.textContent!==text)read.textContent=text;}
 const optional=$('consent-check')?.closest('.consent-checkbox')?.querySelector('.ux-consent-optional');if(optional){const text=language()==='zh-CN'?' 可选：用于标记你已阅读上面的完整说明。':' Optional: mark that you read the detailed explanation.';if(optional.textContent!==text)optional.textContent=text;}

}

export function presentSettingsPreferences({visible=false}={}) {
 settingsVisible=visible;if(settingsVisible)syncSettingsLocale();
}

export {presentSettingsRecovery} from './maintenance-recovery.js';
