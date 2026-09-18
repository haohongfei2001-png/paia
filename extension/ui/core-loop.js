import {request} from './common.js';
import {getMaterialTray} from './material-tray.js';
import {normalizeUXPreferences,resolveAppearance,resolveLanguage,validReturnTarget,SETTINGS_GROUPS} from './ux-r1-state.js';

const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const FONT_PX={small:16,standard:17,large:19,xlarge:21};
const WIDTH_PX={narrow:640,standard:680,wide:720};
let uxPreferences=normalizeUXPreferences(),settingsReturn='library',recentTarget=null,revisitToken=0,lastRevisitKey='',preferenceBusy=false;

function node(tag,className='',text=''){const el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el;}
function button(text,className=''){const el=node('button',className,text);el.type='button';return el;}
function noteCoreLoop(action){void request('PAIA_CORE_LOOP_ACTION',{action}).catch(()=>{});}
async function waitFor(read,{attempts=100,delay=50}={}){for(let i=0;i<attempts;i++){const value=read();if(value)return value;await sleep(delay);}return null;}
function isArchiveHome(){const nav=document.querySelector('#primary-nav [data-view="library"]');return nav?.getAttribute('aria-current')==='page'&&!$('collection-panel')?.hidden&&!String($('search')?.value||'').trim();}
function hasArchiveDocuments(){return !!$('document-list')?.querySelector('.conversation-document');}
function installStyles(){if(document.querySelector('link[data-core-loop]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href=chrome.runtime.getURL('ui/core-loop.css');link.dataset.coreLoop='true';document.head.append(link);}
function language(){return resolveLanguage(uxPreferences.language,navigator.language);}
function copy(zh,en){return language()==='zh-CN'?zh:en;}

function applyPreferences(){
 const dark=globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches===true,theme=resolveAppearance(uxPreferences.appearance,dark),root=document.documentElement;
 const lang=language();root.dataset.paiaTheme=theme;root.dataset.paiaLanguage=lang;if(root.lang!==lang)root.lang=lang;root.style.setProperty('--paia-prose-size',`${FONT_PX[uxPreferences.fontSize]||17}px`);root.style.setProperty('--paia-prose-width',`${WIDTH_PX[uxPreferences.readingWidth]||680}px`);
 document.body?.classList.toggle('ux-sidebar-collapsed',uxPreferences.sidebarCollapsed===true);applyLabels();if(!$('thought-organize-tools')){const details=document.createElement('details');details.id='thought-organize-tools';const summary=document.createElement('summary');summary.textContent='归类工具';details.append(summary,$('organizer-reading-actions'));$('thought-home-tools')?.after(details);}syncPreferenceControls();
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
 const activateGroup=key=>{const section=groups.get(key);if(!section)return;for(const [group,item] of groups)item.hidden=group!==key;for(const [group,tab] of tabs)tab.setAttribute('aria-current',group===key?'page':'false');if(mobileSelect.value!==key)mobileSelect.value=key;};
 for(const [key,zh] of SETTINGS_GROUPS){
  const label=language()==='zh-CN'?zh:groupEnglish[key],section=node('section','ux-settings-group'),h=node('h2','',label),tab=button(label),option=node('option','',label);section.dataset.group=key;section.id=`ux-settings-${key}-group`;section.hidden=key!=='content';h.id=`ux-settings-${key}-title`;section.setAttribute('aria-labelledby',h.id);section.append(h);groups.set(key,section);body.append(section);
  tab.dataset.settingsGroup=key;tab.setAttribute('aria-current',key==='content'?'page':'false');tab.setAttribute('aria-controls',section.id);tab.addEventListener('click',()=>activateGroup(key));tabs.set(key,tab);nav.append(tab);
  option.value=key;mobileSelect.append(option);
 }
 mobileSelect.value='content';mobileSelect.addEventListener('change',()=>activateGroup(mobileSelect.value));
 layout.append(nav,body);shell.append(head,layout);panel.prepend(shell);
 const move=(target,key)=>{const el=typeof target==='string'?$(target):target;if(el&&groups.get(key))groups.get(key).append(el);};
 move('enabled-state','content');move('toggle-capture','content');move('smart-filter-settings','content');move('history-settings','content');
 move($('time-display')?.closest('.setting'),'reading');move($('time-emphasis')?.closest('.setting'),'reading');
 groups.get('reading').prepend(preferenceSelect('ux-reading-width',copy('阅读宽度','Reading width'),[['narrow','640 px'],['standard','680 px'],['wide','720 px']],'readingWidth'));
 groups.get('reading').prepend(preferenceSelect('ux-font-size',copy('正文字号','Body text size'),[['small','16 px'],['standard','17 px'],['large','19 px'],['xlarge','21 px']],'fontSize'));
 groups.get('reading').prepend(preferenceSelect('ux-language',copy('界面语言','Interface language'),[['system',copy('跟随系统','Follow system')],['zh-CN','简体中文'],['en','English']],'language'));
 groups.get('reading').prepend(preferenceSelect('ux-appearance',copy('外观','Appearance'),[['system',copy('跟随系统','Follow system')],['light',copy('浅色','Light')],['dark',copy('深色','Dark')]],'appearance'));
 for(const id of ['deepseek-settings','library-updates-drawer'])move(id,'ai');move(panel.querySelector('.library-updates-bar'),'ai');move('memory-settings','privacy');
 for(const id of ['backup-settings','r6-complete-export','r6-data-status','r6-source-records','manage-excluded','legacy-entry'])move(id,'data');if(!$('r6-source-records')){const sourceButton=[...panel.querySelectorAll('[data-view="archive"]')].find(el=>!el.closest('#primary-nav'));move(sourceButton,'data');}const syncFact=node('div','ux-capability-fact');syncFact.append(node('strong','',copy('设备同步','Device sync')),node('p','muted',copy('当前版本未提供设备同步。','Device sync is not available in this version.')));groups.get('data').append(syncFact);
 for(const id of ['library-management','product-diagnostics','diagnostics'])move(id,'advanced');const prune=$('prune-revisions');if(prune){move(prune.previousElementSibling,'advanced');move(prune,'advanced');}
 for(const child of [...panel.children]){if(child===shell)continue;if(child.tagName==='H2'){child.remove();continue;}groups.get('advanced').append(child);}
 syncPreferenceControls();
}

function setPrimaryAction(id){const home=$('core-loop-home');if(!home)return;for(const item of home.querySelectorAll('.core-loop-card'))item.classList.toggle('core-loop-card-primary',!!id&&item.id===id);}
function setHomeState(state,{eyebrow,title,copy:body,primary=null}={}){const home=$('core-loop-home');if(!home)return;home.dataset.state=state;if(eyebrow)$('core-loop-eyebrow').textContent=eyebrow;if(title)$('core-loop-title').textContent=title;if(body)$('core-loop-copy').textContent=body;setPrimaryAction(primary);}
function setActivationEmpty(){setHomeState('activation-empty',{eyebrow:copy('第一次使用','First use'),title:copy('你的表达会留在这里。第一条输入会从这里开始','Your expressions will stay here. Your first input starts here.'),copy:copy('同意本机保存后，PAIA 会收录已支持 AI 页面中你已经发送的文字；也可以导入以前的历史。','After local-save consent, PAIA collects text you already sent on supported AI pages; you can also import earlier history.')});}
function setActivationReady(){setHomeState('activation-ready',{eyebrow:copy('最近收录','Recently saved'),title:copy('这里保存的是你给 AI 的输入','This keeps what you sent to AI'),copy:copy('不是 AI 的回答。最近收录只表示保存顺序；表达时间仍按来源事实显示。','Not AI replies. Recently saved reflects capture order; expression time still comes from source evidence.'),primary:'core-loop-continue'});}


async function openDocumentById(id){if(!id)return false;document.dispatchEvent(new CustomEvent('paia:navigate',{detail:{view:'library',documentId:id}}));return true;}
function createHome(){
 const panel=$('collection-panel'),search=$('search');if(!panel||!search||$('core-loop-home'))return null;
 const home=node('section','core-loop-home');home.id='core-loop-home';home.dataset.state='loading';const intro=node('div','core-loop-intro'),eyebrow=node('p','core-loop-eyebrow',copy('档案','Archive')),title=node('h2','',copy('正在读取本机档案…','Loading your local archive…')),body=node('p','core-loop-copy','');eyebrow.id='core-loop-eyebrow';title.id='core-loop-title';body.id='core-loop-copy';intro.append(eyebrow,title,body);
 const recent=button('','core-loop-card core-loop-recent');recent.id='core-loop-continue';recent.append(node('span','core-loop-card-label',copy('最近收录','Recently saved')),node('strong','',copy('还没有收录内容','Nothing saved yet')),node('small','',copy('同意本机保存或导入历史后，这里会指向最近收录的真实内容。','After local-save consent or history import, this points to real recently saved content.')));recent.disabled=true;
 const revisit=button('','core-loop-card core-loop-return');revisit.id='core-loop-return';revisit.append(node('span','core-loop-card-label',copy('回来看看','Revisit')),node('strong','',copy('查看本机变化','See local changes')),node('small','core-loop-return-state',copy('只读取本机变化，不调用 AI。','Reads local changes only; no AI call.')));
 intro.hidden=true;home.append(intro,recent,revisit);panel.insertBefore(home,search);
 recent.addEventListener('click',()=>{if(recentTarget?.id){noteCoreLoop('continue');void openDocumentById(recentTarget.id);}});revisit.addEventListener('click',()=>{noteCoreLoop('return');$('revisit-open')?.click();});return home;
}
let recentToken=0;
async function refreshRecent(){const token=++recentToken,recent=$('core-loop-continue');if(!recent)return;try{const page=await request('GET_PAGE',{page:{view:'library',limit:1}});if(token!==recentToken)return;recentTarget=page.recentCapturedDocument||null;if(!recentTarget){recent.disabled=true;recent.querySelector('strong').textContent=copy('还没有收录内容','Nothing saved yet');recent.querySelector('small').textContent=copy('同意本机保存或导入历史后，这里会指向最近收录的真实内容。','After local-save consent or history import, this points to real recently saved content.');return;}recent.disabled=false;recent.querySelector('strong').textContent=recentTarget.userTitle||recentTarget.originalConversationTitle||copy('最近收录的对话','Recently saved conversation');const at=recentTarget.capturedAt?new Intl.DateTimeFormat(language(),{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(recentTarget.capturedAt)):copy('收录时间未知','Capture time unknown');recent.querySelector('small').textContent=copy(`最近保存到本机 · ${at}`,`Saved locally most recently · ${at}`);}catch{recentTarget=null;recent.disabled=true;recent.querySelector('strong').textContent=copy('最近收录暂时不可读','Recently saved item unavailable');recent.querySelector('small').textContent=copy('档案仍可按来源浏览。','You can still browse the archive by source.');}}
async function refreshReturnCard(){const home=$('core-loop-home');if(!home||home.hidden)return;const token=++revisitToken,strong=$('core-loop-return')?.querySelector('strong'),status=home.querySelector('.core-loop-return-state');try{const data=await request('PAIA_REVISIT_STATUS');if(token!==revisitToken)return;const fresh=data.newInputs?.count||0,topics=data.topicUpdates?.length||0;home.dataset.state=fresh||topics?'return-new':hasArchiveDocuments()?'return-quiet':'activation-empty';strong.textContent=copy('回来看看','Revisit');status.textContent=fresh?copy('上次打开后留下的内容','Saved since your last visit'):topics?copy('主题有新材料','Topics have new material'):copy('在需要时找回以前的内容。','Find earlier material when you need it.');if(hasArchiveDocuments()){ $('core-loop-title').textContent=copy('档案','Archive');$('core-loop-copy').textContent=copy('从上次停下的地方继续，或打开最近留下的内容。','Continue where you stopped, or open recently saved material.');}}catch{status.textContent=copy('暂时无法读取回访状态，档案仍可使用。','Revisit is unavailable; Archive still works.');}}
function refreshHome(){const home=$('core-loop-home');if(!home)return;const visible=isArchiveHome();home.hidden=!visible;if(!visible)return;const docs=hasArchiveDocuments();if(docs){if(!home.dataset.state||home.dataset.state==='activation-empty')setActivationReady();}else setActivationEmpty();void refreshRecent();void refreshReading();void refreshReturnCard();}

async function prepareReaderReuse(inputId,buttonNode){if(!inputId)return;buttonNode.disabled=true;try{const input=await request('GET_INPUT',{id:inputId});await getMaterialTray().add([{kind:'input',id:inputId,revision:input.revision}]);}finally{buttonNode.disabled=false;}}
function decorateReader(){for(const section of document.querySelectorAll('#document-body .library-block')){if(section.querySelector('.core-loop-reuse'))continue;const prose=section.querySelector('.library-prose');if(!prose)continue;const reuse=button(copy('加入本次材料','Add to selection'),'core-loop-reuse');reuse.setAttribute('aria-label',copy('继续使用这条输入','Reuse this input'));reuse.title=copy('选择这条已保存的完整文字用于本次预览','Select this full saved text for the current preview');reuse.addEventListener('click',()=>{noteCoreLoop('reuse');void (async()=>{prose.blur();document.dispatchEvent(new CustomEvent('paia:flush-reader',{detail:{done:ok=>{if(ok)void prepareReaderReuse(prose.dataset.editId,reuse);}}}));})();});(section.querySelector('.reader-margin-actions')||section).append(reuse);}}
function preserveInternalToolAccess(){const details=$('product-diagnostics');if(!details||$('core-loop-product-signals'))return;const link=node('a','core-loop-internal-link',copy('查看本机产品验证数据 / Passport','Local product validation / Passport'));link.id='core-loop-product-signals';link.href='product-signals.html';link.target='_blank';link.rel='noopener';details.append(link);}

export function installCoreLoop(){
 if($('core-loop-home'))return;installStyles();setupShell();setupSettingsShell();tuneOnboarding();createHome();preserveInternalToolAccess();void loadPreferences();
 const documentBody=$('document-body'),documentList=$('document-list'),collection=$('collection-panel'),revisitDialog=$('revisit-dialog');if(documentBody)new MutationObserver(decorateReader).observe(documentBody,{subtree:true,childList:true});if(documentList)new MutationObserver(refreshHome).observe(documentList,{subtree:true,childList:true});if(collection)new MutationObserver(refreshHome).observe(collection,{attributes:true,attributeFilter:['hidden']});for(const nav of document.querySelectorAll('[data-view]'))new MutationObserver(()=>{applyLabels();refreshHome();}).observe(nav,{attributes:true,attributeFilter:['aria-current']});if(revisitDialog)revisitDialog.addEventListener('close',()=>{lastRevisitKey='';refreshHome();});$('search')?.addEventListener('input',refreshHome);chrome.runtime.onMessage.addListener(message=>{if(['ARCHIVE_CHANGED','PAIA_READER_POLICY_CHANGED'].includes(message?.type)){if(message.type==='ARCHIVE_CHANGED'&&!message.cause){lastRevisitKey='';refreshHome();return;}if(message.type==='PAIA_READER_POLICY_CHANGED'){recentTarget=null;$('core-loop-continue').disabled=true;$('core-loop-continue').querySelector('strong').textContent='';$('reader-resume')?.replaceChildren();if($('reader-resume'))delete $('reader-resume').dataset.signature;}lastRevisitKey='';void loadPreferences();refreshHome();}});const media=globalThis.matchMedia?.('(prefers-color-scheme: dark)');media?.addEventListener?.('change',()=>{if(uxPreferences.appearance==='system')applyPreferences();});decorateReader();refreshHome();
}

async function refreshReading(){
 const home=$('core-loop-home');if(!home||home.hidden)return;
 let group=$('reader-resume');if(!group){group=node('section','reader-resume');group.id='reader-resume';home.querySelector('.core-loop-intro').after(group);}
 try{const anchors=await request('PAIA_READER_RECENT');if(home.hidden)return;const signature=JSON.stringify(anchors);if(group.dataset.signature===signature)return;group.dataset.signature=signature;group.replaceChildren();
  for(const [index,anchor]of anchors.entries()){const action=button('','core-loop-card reader-resume-action');action.dataset.documentId=anchor.documentId;action.append(node('span','core-loop-card-label',copy(index?'最近阅读':'继续阅读',index?'Recently read':'Continue reading')),node('strong','',anchor.title),node('small','',copy('上次看到这里','Where you left off')));action.onclick=()=>document.dispatchEvent(new CustomEvent('paia:navigate',{detail:{view:'library',documentId:anchor.documentId,contextInputId:anchor.inputId,anchor}}));group.append(action);}
  group.hidden=!anchors.length;
 }catch{group.replaceChildren(node('p','muted',copy('继续位置暂时无法读取，档案仍可打开。','Reading positions are unavailable; Archive still works.')));}
}
document.addEventListener('paia:reading-saved',()=>void refreshReading());
document.addEventListener('paia:reader-policy',()=>{lastRevisitKey='';refreshHome();});
