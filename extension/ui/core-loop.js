import {request} from './common.js';
import {normalizeUXPreferences,resolveAppearance,resolveLanguage,validReturnTarget,SETTINGS_GROUPS} from './ux-r1-state.js';
import {ArchiveOrderSettings} from './archive-order-settings.js';

const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const FONT_PX={small:16,standard:17,large:19,xlarge:21};
const WIDTH_PX={narrow:640,standard:680,wide:720};
let uxPreferences=normalizeUXPreferences(),settingsReturn='library',recentTarget=null,archiveActionToken=0,preferenceBusy=false;
const archiveOrderSettings=new ArchiveOrderSettings();

function node(tag,className='',text=''){const el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el;}
function button(text,className=''){const el=node('button',className,text);el.type='button';return el;}
function noteCoreLoop(action){void request('PAIA_CORE_LOOP_ACTION',{action}).catch(()=>{});}
async function waitFor(read,{attempts=100,delay=50}={}){for(let i=0;i<attempts;i++){const value=read();if(value)return value;await sleep(delay);}return null;}
function isArchiveHome(){const nav=document.querySelector('#primary-nav [data-view="library"]');return nav?.getAttribute('aria-current')==='page'&&!$('collection-panel')?.hidden&&!String($('search')?.value||'').trim();}
function installStyles(){if(document.querySelector('link[data-core-loop]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href=chrome.runtime.getURL('ui/core-loop.css');link.dataset.coreLoop='true';document.head.append(link);}
function language(){return resolveLanguage(uxPreferences.language,navigator.language);}
function copy(zh,en){return language()==='zh-CN'?zh:en;}

function applyPreferences(){
 const dark=globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches===true,theme=resolveAppearance(uxPreferences.appearance,dark),root=document.documentElement;
 const lang=language();root.dataset.paiaTheme=theme;root.dataset.paiaLanguage=lang;if(root.lang!==lang)root.lang=lang;root.style.setProperty('--paia-prose-size',`${FONT_PX[uxPreferences.fontSize]||17}px`);root.style.setProperty('--paia-prose-width',`${WIDTH_PX[uxPreferences.readingWidth]||680}px`);
 document.body?.classList.toggle('ux-sidebar-collapsed',uxPreferences.sidebarCollapsed===true);applyLabels();syncPreferenceControls();
}
function applyLabels(){
 const labels=language()==='zh-CN'?{library:'档案',thoughts:'思想库',memory:'用于 AI',settings:'设置',archive:'来源记录'}:{library:'Archive',thoughts:'Thought Library',memory:'For AI',settings:'Settings',archive:'Source Records'};
 for(const [view,label] of Object.entries(labels))for(const el of document.querySelectorAll(`[data-view="${view}"]`))if(el.closest('#primary-nav,.sidebar-bottom')){const chromeLabel=el.querySelector('.ux-nav-label');if(chromeLabel){if(chromeLabel.textContent!==label)chromeLabel.textContent=label;}else if(el.textContent!==label)el.textContent=label;}
 const current=document.querySelector('#primary-nav [aria-current="page"],.sidebar-bottom [aria-current="page"]')?.dataset.view,title=$('view-title');if(title&&current&&labels[current]&&!title.hidden&&title.textContent!==labels[current])title.textContent=labels[current];
 const settingsTitle=$('ux-settings-title'),settingsText=copy('设置','Settings');if(settingsTitle&&settingsTitle.textContent!==settingsText)settingsTitle.textContent=settingsText;
}
async function loadPreferences(){
 try{const page=await request('GET_PAGE',{page:{view:'settings'}});uxPreferences=normalizeUXPreferences(page.preferences);applyPreferences();updateLocalStatus(page);return page;}catch{applyPreferences();const state=$('ux-local-state');if(state)state.textContent=copy('本机保存遇到问题','Local storage unavailable');return null;}
}
async function savePreference(key,value,control){
 if(preferenceBusy)return;preferenceBusy=true;const before=uxPreferences[key],status=$('ux-settings-feedback');
 try{await request('UPDATE_PREFERENCES',{changes:{[key]:value}});uxPreferences={...uxPreferences,[key]:value};applyPreferences();if(status){status.textContent=copy('立即应用','Applied');status.dataset.kind='success';}}
 catch{uxPreferences={...uxPreferences,[key]:before};if(control){if(control.type==='checkbox')control.checked=!!before;else control.value=String(before);}applyPreferences();if(status){status.textContent=copy('设置尚未保存，已恢复原值。','Setting was not saved; the previous value was restored.');status.dataset.kind='error';}}
 finally{preferenceBusy=false;}
}
function updateLocalStatus(page){const el=$('ux-local-state');if(!el)return;const failed=page?.diagnostics?.lastError?.code==='STORAGE_FAILED'||page?.diagnostics?.lastError?.code==='STORAGE_FULL';el.textContent=failed?copy('本机保存遇到问题','Local storage unavailable'):copy('本机保存','Saved locally');el.dataset.kind=failed?'error':'ok';}

function setupShell(){
 const sidebar=document.querySelector('.sidebar'),workspace=document.querySelector('.workspace'),nav=$('primary-nav'),bottom=document.querySelector('.sidebar-bottom');if(!sidebar||!workspace||!nav||!bottom)return;
 if(!$('ux-skip-main')){const skip=node('a','ux-skip-main',copy('跳到主要内容','Skip to main content'));skip.id='ux-skip-main';skip.href='#paia-main';document.body.prepend(skip);}workspace.id='paia-main';workspace.tabIndex=-1;nav.setAttribute('aria-label',copy('主要导航','Primary navigation'));
 const brand=sidebar.querySelector('.brand');if(brand){brand.childNodes[0].textContent='PAIA';const small=brand.querySelector('small');if(small)small.textContent=copy('私人输入与思想','PERSONAL ARCHIVE');}
 const memory=nav.querySelector('[data-view="memory"]');if(memory)memory.classList.add('ux-nav-ai');
 let status=bottom.querySelector('#ux-local-state');if(!status){status=node('span','ux-local-state',copy('本机保存','Saved locally'));status.id='ux-local-state';bottom.append(status);}
 if(!$('ux-sidebar-toggle')){const toggle=button(copy('收起侧栏','Collapse sidebar'),'ux-sidebar-toggle');toggle.id='ux-sidebar-toggle';toggle.setAttribute('aria-label',copy('收起或展开侧栏','Collapse or expand sidebar'));toggle.addEventListener('click',()=>void savePreference('sidebarCollapsed',!uxPreferences.sidebarCollapsed,toggle));brand?.after(toggle);}
 document.addEventListener('click',event=>{const hit=event.target.closest?.('[data-view="settings"]');if(!hit)return;const active=document.querySelector('#primary-nav [aria-current="page"]')?.dataset.view;if(active&&active!=='settings')settingsReturn=validReturnTarget(active);},{capture:true});
 const title=$('view-title');if(title)new MutationObserver(applyLabels).observe(title,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 const panels=[$('document-panel'),$('thought-document')].filter(Boolean);for(const panel of panels)new MutationObserver(updateSurfaceClass).observe(panel,{attributes:true,attributeFilter:['hidden']});updateSurfaceClass();
}
function updateSurfaceClass(){const reader=!$('document-panel')?.hidden||!$('thought-document')?.hidden;document.body.classList.toggle('ux-reader-active',reader);}

function tuneOnboarding(){
 const consent=$('consent-panel');if(consent){const eyebrow=consent.querySelector('.eyebrow'),title=$('consent-title'),paras=[...consent.querySelectorAll(':scope > p:not(.muted)')];if(eyebrow)eyebrow.textContent=copy('本机保存','LOCAL SAVE');if(title)title.textContent=copy('你对 AI 说过的，不必只留在那次聊天里。','What you told AI does not have to stay in that one chat.');if(paras[0])paras[0].textContent=copy('PAIA 把你发给 AI 的文字留在本机，方便以后阅读、找到，并继续使用。','PAIA keeps the text you send to AI on this device so you can read, find and reuse it later.');if(paras[1])paras[1].textContent=copy('保存范围：普通聊天中已经发送、已经显示的用户文字；不保存草稿、完整 AI 回复、附件正文或账户凭证。Temporary Chat 默认跳过。','Saved scope: user text already sent and visible in normal chats. Drafts, full AI replies, attachment bodies and credentials are excluded. Temporary Chat is skipped by default.');if(paras[2])paras[2].textContent=copy('捕获、历史导入和普通阅读都在本机。云端 AI 处理、同步和对外提供是另外的授权。','Capture, history import and ordinary reading stay local. Cloud AI processing, sync and external access are separate permissions.');const enable=$('enable-consent');if(enable)enable.textContent=copy('开始在本机保存','Start saving locally');
  if(!$('ux-onboarding-example')){const demo=button(copy('先看看示例','View an example'),'ux-onboarding-example');demo.id='ux-onboarding-example';demo.addEventListener('click',()=>$('ux-example-dialog')?.showModal());enable?.after(demo);}
 }
 const history=$('onboarding-history-step');if(history){const h=history.querySelector('h2'),p=history.querySelector('p');if(h)h.textContent=copy('把以前的内容也带进来。','Bring your earlier content too.');if(p)p.textContent=copy('可选择 ChatGPT 官方导出 ZIP 或聊天 JSON。先预览，再确认写入；整个导入过程不会调用 AI。','Choose an official ChatGPT export ZIP or chat JSON. Preview first, then confirm; importing does not call AI.');if($('onboarding-history'))$('onboarding-history').textContent=copy('选择历史导出文件','Choose history export');if($('onboarding-skip'))$('onboarding-skip').textContent=copy('以后再说','Maybe later');}
 if(!$('ux-example-dialog')){const dialog=node('dialog','ux-example-dialog');dialog.id='ux-example-dialog';dialog.setAttribute('aria-labelledby','ux-example-title');const h=node('h2','',copy('一条输入在 PAIA 里会这样留下','An input can stay in PAIA like this'));h.id='ux-example-title';const body=node('div','ux-example-body');body.append(node('small','',copy('2026年9月 · 示例，不会写入你的档案','September 2026 · Example only; not saved')),node('p','',copy('我希望把散落在 AI 聊天里的长期想法真正留给自己，而不是每次从头开始。','I want the long-term ideas scattered across AI chats to remain mine, instead of starting over each time.')));const close=button(copy('关闭示例','Close example'));close.addEventListener('click',()=>dialog.close());dialog.append(h,body,close);document.body.append(dialog);}
}

function preferenceSelect(id,labelText,options,key){const label=node('label','setting ux-preference-setting');label.htmlFor=id;label.append(node('span','',labelText));const select=node('select');select.id=id;for(const [value,text] of options){const option=node('option','',text);option.value=value;select.append(option);}select.addEventListener('change',()=>void savePreference(key,select.value,select));label.append(select);return label;}
function syncPreferenceControls(){for(const [id,key] of [['ux-appearance','appearance'],['ux-language','language'],['ux-font-size','fontSize'],['ux-reading-width','readingWidth']]){const el=$(id);if(el&&document.activeElement!==el)el.value=String(uxPreferences[key]);}}
function setupSettingsShell(){
 const panel=$('settings-panel');if(!panel||$('ux-settings-shell'))return;
 const shell=node('div','ux-settings-shell');shell.id='ux-settings-shell';const head=node('header','ux-settings-header'),back=button(copy('‹ 返回','‹ Back'),'ux-settings-back'),title=node('h1','',copy('设置','Settings')),feedback=node('p','ux-settings-feedback');back.id='ux-settings-back';title.id='ux-settings-title';feedback.id='ux-settings-feedback';feedback.setAttribute('role','status');back.addEventListener('click',()=>document.querySelector(`#primary-nav [data-view="${settingsReturn}"]`)?.click());head.append(back,title,feedback);
 const layout=node('div','ux-settings-layout'),nav=node('nav','ux-settings-nav'),body=node('div','ux-settings-body');nav.setAttribute('aria-label',copy('设置分组','Settings groups'));const groups=new Map(),tabs=new Map();
 const groupEnglish={content:'Content & capture',reading:'Reading & appearance',ai:'AI',privacy:'Privacy & external use',data:'Data & devices',advanced:'Advanced'};
 const mobileSwitch=node('label','ux-settings-mobile-switch'),mobileSwitchLabel=node('span','',copy('当前分组','Current group')),mobileSelect=node('select');mobileSelect.id='ux-settings-group-switch';mobileSelect.setAttribute('aria-label',copy('切换设置分组','Switch settings group'));mobileSwitch.append(mobileSwitchLabel,mobileSelect);nav.append(mobileSwitch);
 const notifyOrganizerSettings=()=>{const group=groups.get('ai');if(group&&!panel.hidden&&!group.hidden)document.dispatchEvent(new CustomEvent('paia:organizer-settings-visible'));};
 const activateGroup=key=>{const section=groups.get(key);if(!section)return;for(const [group,item] of groups)item.hidden=group!==key;for(const [group,tab] of tabs)tab.setAttribute('aria-current',group===key?'page':'false');if(mobileSelect.value!==key)mobileSelect.value=key;notifyOrganizerSettings();};
 for(const [key,zh] of SETTINGS_GROUPS){
  const label=language()==='zh-CN'?zh:groupEnglish[key],section=node('section','ux-settings-group'),h=node('h2','',label),tab=button(label),option=node('option','',label);section.dataset.group=key;section.id=`ux-settings-${key}-group`;section.hidden=key!=='content';h.id=`ux-settings-${key}-title`;section.setAttribute('aria-labelledby',h.id);section.append(h);groups.set(key,section);body.append(section);
  tab.dataset.settingsGroup=key;tab.setAttribute('aria-current',key==='content'?'page':'false');tab.setAttribute('aria-controls',section.id);tab.addEventListener('click',()=>activateGroup(key));tabs.set(key,tab);nav.append(tab);
  option.value=key;mobileSelect.append(option);
 }
 mobileSelect.value='content';mobileSelect.addEventListener('change',()=>activateGroup(mobileSelect.value));
 layout.append(nav,body);shell.append(head,layout);panel.prepend(shell);new MutationObserver(notifyOrganizerSettings).observe(panel,{attributes:true,attributeFilter:['hidden']});
 const move=(target,key)=>{const el=typeof target==='string'?$(target):target;if(el&&groups.get(key))groups.get(key).append(el);};
 move('enabled-state','content');move('toggle-capture','content');move('smart-filter-settings','content');move('history-settings','content');
 move($('time-display')?.closest('.setting'),'reading');move($('time-emphasis')?.closest('.setting'),'reading');
 groups.get('reading').prepend(preferenceSelect('ux-reading-width',copy('阅读宽度','Reading width'),[['narrow','640 px'],['standard','680 px'],['wide','720 px']],'readingWidth'));
 groups.get('reading').prepend(preferenceSelect('ux-font-size',copy('正文字号','Body text size'),[['small','16 px'],['standard','17 px'],['large','19 px'],['xlarge','21 px']],'fontSize'));
 groups.get('reading').prepend(preferenceSelect('ux-language',copy('界面语言','Interface language'),[['system',copy('跟随系统','Follow system')],['zh-CN','简体中文'],['en','English']],'language'));
 groups.get('reading').prepend(preferenceSelect('ux-appearance',copy('外观','Appearance'),[['system',copy('跟随系统','Follow system')],['light',copy('浅色','Light')],['dark',copy('深色','Dark')]],'appearance'));
 groups.get('reading').append(archiveOrderSettings.element());
 for(const id of ['organizer-reading-actions','deepseek-settings','library-updates-drawer'])move(id,'ai');move(panel.querySelector('.library-updates-bar'),'ai');move('memory-settings','privacy');
 for(const id of ['backup-settings','r6-complete-export','r6-data-status','r6-source-records','manage-excluded','legacy-entry'])move(id,'data');if(!$('r6-source-records')){const sourceButton=[...panel.querySelectorAll('[data-view="archive"]')].find(el=>!el.closest('#primary-nav'));move(sourceButton,'data');}const syncFact=node('div','ux-capability-fact');syncFact.append(node('strong','',copy('设备同步','Device sync')),node('p','muted',copy('当前版本未提供设备同步。','Device sync is not available in this version.')));groups.get('data').append(syncFact);
 for(const id of ['library-management','product-diagnostics','diagnostics'])move(id,'advanced');const prune=$('prune-revisions');if(prune){move(prune.previousElementSibling,'advanced');move(prune,'advanced');}
 for(const child of [...panel.children]){if(child===shell)continue;if(child.tagName==='H2'){child.remove();continue;}groups.get('advanced').append(child);}
 syncPreferenceControls();
}

async function refreshArchiveActions(){
 const recent=$('archive-root-recent'),revisit=$('revisit-open');if(!recent||!revisit)return;
 const visible=isArchiveHome();recent.hidden=!visible;if(!visible)return;
 const token=++archiveActionToken;
 try{
  const [page,status]=await Promise.all([request('GET_PAGE',{page:{view:'library',limit:1}}),request('PAIA_REVISIT_STATUS')]);
  if(token!==archiveActionToken||!isArchiveHome())return;
  recentTarget=page.recentCapturedDocument||null;recent.hidden=!recentTarget;
  if(recentTarget)recent.textContent=copy('最近收录 · ','Recently saved · ')+(recentTarget.userTitle||recentTarget.originalConversationTitle||copy('最近的对话','Recent conversation'));
  const newContent=!!(status.newInputs?.count||status.topicUpdates?.length);
  revisit.dataset.returnState=newContent?'new':'quiet';
  revisit.setAttribute('aria-label',copy('打开回来看看','Open Revisit')+(newContent?copy(' · 有新内容',' · New local changes'):''));
 }catch{if(token===archiveActionToken){recent.hidden=true;revisit.dataset.returnState='unavailable';}}
}
function installArchiveActions(){
 const recent=$('archive-root-recent'),revisit=$('revisit-open');if(!recent)return;
 recent.addEventListener('click',()=>{if(recentTarget?.id){noteCoreLoop('continue');document.dispatchEvent(new CustomEvent('paia:navigate',{detail:{view:'library',documentId:recentTarget.id}}));}});
 revisit?.addEventListener('click',()=>noteCoreLoop('return'));
 const collection=$('collection-panel');if(collection)new MutationObserver(()=>void refreshArchiveActions()).observe(collection,{attributes:true,attributeFilter:['hidden']});
 for(const nav of document.querySelectorAll('[data-view]'))new MutationObserver(()=>{applyLabels();void refreshArchiveActions();}).observe(nav,{attributes:true,attributeFilter:['aria-current']});
 $('search')?.addEventListener('input',()=>void refreshArchiveActions());
 $('revisit-dialog')?.addEventListener('close',()=>void refreshArchiveActions());
 chrome.runtime.onMessage.addListener(message=>{if(['ARCHIVE_CHANGED','PAIA_READER_POLICY_CHANGED'].includes(message?.type)){recentTarget=null;void loadPreferences();void refreshArchiveActions();}});
 document.addEventListener('paia:reader-policy',()=>void refreshArchiveActions());
 const media=globalThis.matchMedia?.('(prefers-color-scheme: dark)');media?.addEventListener?.('change',()=>{if(uxPreferences.appearance==='system')applyPreferences();});
 void refreshArchiveActions();
}

function preserveInternalToolAccess(){const details=$('product-diagnostics');if(!details||$('core-loop-product-signals'))return;const link=node('a','core-loop-internal-link',copy('查看本机产品验证数据 / Passport','Local product validation / Passport'));link.id='core-loop-product-signals';link.href='product-signals.html';link.target='_blank';link.rel='noopener';details.append(link);}

let installed=false;
export function installCoreLoop(){
 if(installed)return;installed=true;installStyles();setupShell();setupSettingsShell();tuneOnboarding();preserveInternalToolAccess();void loadPreferences();void archiveOrderSettings.load();
 installArchiveActions();
}
