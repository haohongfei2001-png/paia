const $=id=>document.getElementById(id);
const SVG_NS='http:'+'//www.w3.org/2000/svg';
const SETTINGS_LABELS={
 content:['内容与收录','Content & capture'],reading:['阅读与外观','Reading & appearance'],ai:['AI','AI'],
 privacy:['隐私与对外使用','Privacy & external use'],data:['数据与设备','Data & devices'],advanced:['高级','Advanced']
};
const NAV_LABELS={library:['档案','Archive'],thoughts:['思想库','Thought Library'],memory:['用于 AI','For AI'],settings:['设置','Settings']};
const NAV_PATHS={
 library:'M4.5 5.5h15v13h-15zM8 9h8M8 13h6',
 thoughts:'M6 5.5h12v9H11l-4 3v-3H6zM9 9h6M9 12h4',
 memory:'M12 4.5l1.25 3.25L16.5 9l-3.25 1.25L12 13.5l-1.25-3.25L7.5 9l3.25-1.25zM18 14l.75 1.75L20.5 16.5l-1.75.75L18 19l-.75-1.75-1.75-.75 1.75-.75z',
 settings:'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 4v2M12 18v2M4 12h2M18 12h2M6.35 6.35l1.4 1.4M16.25 16.25l1.4 1.4M17.65 6.35l-1.4 1.4M7.75 16.25l-1.4 1.4'
};
let installed=false;
const observedSurfaces=new WeakSet();
function zh(){return document.documentElement.lang==='zh-CN';}
function copy(pair){return pair[zh()?0:1];}
function installRefreshStyles(){if(document.querySelector('link[data-ui-refresh]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href=chrome.runtime.getURL('ui/ui-refresh.css');link.dataset.uiRefresh='true';document.head.append(link);}
function icon(path,className='ux-nav-icon'){
 const svg=document.createElementNS(SVG_NS,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.classList.add(className);
 const shape=document.createElementNS(SVG_NS,'path');shape.setAttribute('d',path);shape.setAttribute('fill','none');shape.setAttribute('stroke','currentColor');shape.setAttribute('stroke-width','1.7');shape.setAttribute('stroke-linecap','round');shape.setAttribute('stroke-linejoin','round');svg.append(shape);return svg;
}
function syncNavChrome(){
 for(const [view,pair] of Object.entries(NAV_LABELS)){
  const selector=view==='settings'?'.sidebar-bottom > [data-view="settings"]':`#primary-nav > [data-view="${view}"]`,button=document.querySelector(selector);if(!button)continue;
  let label=button.querySelector('.ux-nav-label');if(!label){label=document.createElement('span');label.className='ux-nav-label';button.replaceChildren(icon(NAV_PATHS[view]),label);}const text=copy(pair);if(label.textContent!==text)label.textContent=text;
 }
}
function syncSearchLauncher(){
 const button=$('universal-search-open');if(!button)return;
 let label=button.querySelector('.ux-search-label'),key=button.querySelector('.ux-search-shortcut');
 if(!label||!key){label=document.createElement('span');label.className='ux-search-label';key=document.createElement('kbd');key.className='ux-search-shortcut';button.replaceChildren(icon('M10.5 5.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM14.25 14.25L19 19','ux-search-icon'),label,key);}
 const shortcut=/Mac|iPhone|iPad/.test(navigator.platform)?'⌘K':'Ctrl K',prompt=zh()?'搜索档案与思想…':'Search Archive & Thoughts…',aria=zh()?`搜索档案与思想，快捷键 ${shortcut}`:`Search Archive and Thoughts, shortcut ${shortcut}`;
 if(label.textContent!==prompt)label.textContent=prompt;if(key.textContent!==shortcut)key.textContent=shortcut;if(button.getAttribute('aria-label')!==aria)button.setAttribute('aria-label',aria);
}
function syncSearchHeading(){
 const title=$('universal-search-title');if(title&&title.tagName!=='H1'){const h=document.createElement('h1');h.id=title.id;h.className=title.className;h.textContent=title.textContent;title.replaceWith(h);}
}
function syncArchiveFrame(){
 const panel=$('collection-panel'),home=$('core-loop-home'),search=$('search');if(!panel||!home||!search)return;
 let frame=$('uir-archive-frame'),main=$('uir-archive-main'),assist=$('uir-archive-assist');
 if(!frame){frame=document.createElement('div');frame.id='uir-archive-frame';frame.className='uir-archive-frame';main=document.createElement('div');main.id='uir-archive-main';main.className='uir-archive-main';assist=document.createElement('aside');assist.id='uir-archive-assist';assist.className='uir-archive-assist';frame.append(main,assist);panel.prepend(frame);}
 const browse=$('core-loop-browse-title')?.parentElement,materials=$('archive-select-materials');
 for(const item of [browse,materials,search,$('result-count'),$('document-list'),$('empty-list'),$('empty-sync'),$('export-menu')])if(item&&item.parentElement!==main)main.append(item);
 if(home.parentElement!==assist)assist.append(home);
 const label=zh()?'继续与最近内容':'Continue and recent items';if(assist.getAttribute('aria-label')!==label)assist.setAttribute('aria-label',label);
}
function syncSurfaceClasses(){
 const body=document.body,settings=$('settings-panel'),search=$('universal-search-dialog');if(!body)return;
 body.classList.toggle('uir-settings-active',!!settings&&!settings.hidden);body.classList.toggle('uir-search-active',!!search&&!search.hidden);
}
function observeSurface(id){const surface=$(id);if(!surface||observedSurfaces.has(surface))return;observedSurfaces.add(surface);new MutationObserver(syncSurfaceClasses).observe(surface,{attributes:true,attributeFilter:['hidden']});}
function syncShellLocale(){
 for(const [key,pair] of Object.entries(SETTINGS_LABELS)){
  const text=copy(pair),tab=document.querySelector(`[data-settings-group="${key}"]`),heading=document.querySelector(`.ux-settings-group[data-group="${key}"] > h2`);
  if(tab&&tab.textContent!==text)tab.textContent=text;if(heading&&heading.textContent!==text)heading.textContent=text;
 }
 const capability=document.querySelector('.ux-capability-fact');if(capability){const heading=capability.querySelector('strong'),detail=capability.querySelector('p'),headingText=zh()?'设备同步':'Device sync',detailText=zh()?'当前版本未提供设备同步。':'Device sync is not available in this version.';if(heading&&heading.textContent!==headingText)heading.textContent=headingText;if(detail&&detail.textContent!==detailText)detail.textContent=detailText;}
 const read=$('history-read');if(read){const text=zh()?'读一篇':'Read one';if(read.textContent!==text)read.textContent=text;}
 const optional=$('consent-check')?.closest('.consent-checkbox')?.querySelector('.ux-consent-optional');if(optional){const text=zh()?' 可选：用于标记你已阅读上面的完整说明。':' Optional: mark that you read the detailed explanation.';if(optional.textContent!==text)optional.textContent=text;}
 syncNavChrome();syncSearchLauncher();syncSearchHeading();syncArchiveFrame();syncSurfaceClasses();observeSurface('settings-panel');observeSurface('universal-search-dialog');
}
function installLocaleSync(){
 syncShellLocale();new MutationObserver(syncShellLocale).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 const ready=()=>!!$('universal-search-open')&&!!$('core-loop-home'),workspace=document.querySelector('.workspace');
 if(workspace&&!ready()){
  const bootstrap=new MutationObserver(()=>{syncShellLocale();if(ready())bootstrap.disconnect();});bootstrap.observe(workspace,{subtree:true,childList:true});
 }
}
function installConsentPrimaryAction(){
 const button=$('enable-consent'),check=$('consent-check');if(!button)return;
 const unlock=()=>{if(button.disabled)button.disabled=false;};unlock();new MutationObserver(unlock).observe(button,{attributes:true,attributeFilter:['disabled']});button.addEventListener('click',()=>{if(check)check.checked=true;},{capture:true});
 const label=check?.closest('.consent-checkbox');if(label&&!label.querySelector('.ux-consent-optional')){const suffix=document.createElement('small');suffix.className='ux-consent-optional';label.append(suffix);}syncShellLocale();
}
function openRecentAfterHistory(){let attempts=0;const open=()=>{const dialog=$('history-dialog'),home=$('core-loop-home'),recent=$('core-loop-continue');if(!dialog?.open&&home&&!home.hidden&&recent&&!recent.disabled){recent.click();return;}if(attempts++<120)setTimeout(open,50);};open();}
function installHistoryReadThrough(){
 const read=$('history-read'),workspace=document.querySelector('.workspace');if(!read||!workspace)return;syncShellLocale();
 read.addEventListener('click',()=>{let sawLoading=workspace.dataset.state==='loading',done=false;const finish=()=>{if(done)return;done=true;observer.disconnect();clearTimeout(timeout);openRecentAfterHistory();};const observer=new MutationObserver(()=>{if(workspace.dataset.state==='loading')sawLoading=true;else if(sawLoading&&workspace.dataset.state==='ready')finish();});observer.observe(workspace,{attributes:true,attributeFilter:['data-state']});const timeout=setTimeout(()=>{observer.disconnect();},10000);},{capture:true});
}
export function installUXR1ShellCoordinator(){if(installed)return;installed=true;installRefreshStyles();installConsentPrimaryAction();installHistoryReadThrough();installLocaleSync();}
