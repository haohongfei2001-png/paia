import {request} from './common.js';
const $=id=>document.getElementById(id);
const SETTINGS_LABELS={
 content:['内容与收录','Content & capture'],reading:['阅读与外观','Reading & appearance'],ai:['AI','AI'],
 privacy:['隐私与对外使用','Privacy & external use'],data:['数据与设备','Data & devices'],advanced:['高级','Advanced']
};
let installed=false;
const observedSurfaces=new WeakSet();
function zh(){return document.documentElement.lang==='zh-CN';}
function copy(pair){return pair[zh()?0:1];}
function installRefreshStyles(){if(document.querySelector('link[data-ui-refresh]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href=chrome.runtime.getURL('ui/ui-refresh.css');link.dataset.uiRefresh='true';document.head.append(link);}
function syncSurfaceClasses(){
 const body=document.body,settings=$('settings-panel'),search=$('universal-search-dialog');if(!body)return;
 body.classList.toggle('uir-settings-active',!!settings&&!settings.hidden);body.classList.toggle('uir-search-active',!!search&&!search.hidden);
}
function observeSurface(id){const surface=$(id);if(!surface||observedSurfaces.has(surface))return;observedSurfaces.add(surface);new MutationObserver(syncSurfaceClasses).observe(surface,{attributes:true,attributeFilter:['hidden']});}
function syncShellLocale(){
 for(const [key,pair] of Object.entries(SETTINGS_LABELS)){
  const text=copy(pair),tab=document.querySelector(`[data-settings-group="${key}"]`),heading=document.querySelector(`.ux-settings-group[data-group="${key}"] > h2`),option=document.querySelector(`#ux-settings-group-switch option[value="${key}"]`);
  if(tab&&tab.textContent!==text)tab.textContent=text;if(heading&&heading.textContent!==text)heading.textContent=text;if(option&&option.textContent!==text)option.textContent=text;
 }
 const switcher=$('ux-settings-group-switch'),switcherLabel=document.querySelector('.ux-settings-mobile-switch > span');if(switcher){const text=zh()?'切换设置分组':'Switch settings group';if(switcher.getAttribute('aria-label')!==text)switcher.setAttribute('aria-label',text);}if(switcherLabel){const text=zh()?'当前分组':'Current group';if(switcherLabel.textContent!==text)switcherLabel.textContent=text;}
 const capability=document.querySelector('.ux-capability-fact');if(capability){const heading=capability.querySelector('strong'),detail=capability.querySelector('p'),headingText=zh()?'设备同步':'Device sync',detailText=zh()?'当前版本未提供设备同步。':'Device sync is not available in this version.';if(heading&&heading.textContent!==headingText)heading.textContent=headingText;if(detail&&detail.textContent!==detailText)detail.textContent=detailText;}
 const read=$('history-read');if(read){const text=zh()?'读一篇':'Read one';if(read.textContent!==text)read.textContent=text;}
 const optional=$('consent-check')?.closest('.consent-checkbox')?.querySelector('.ux-consent-optional');if(optional){const text=zh()?' 可选：用于标记你已阅读上面的完整说明。':' Optional: mark that you read the detailed explanation.';if(optional.textContent!==text)optional.textContent=text;}
 syncSurfaceClasses();observeSurface('settings-panel');observeSurface('universal-search-dialog');
}
function installLocaleSync(){
 syncShellLocale();new MutationObserver(syncShellLocale).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 const ready=()=>!!$('universal-search-dialog')&&!!$('revisit-open'),workspace=document.querySelector('.workspace');
 if(workspace&&!ready()){
  const bootstrap=new MutationObserver(()=>{syncShellLocale();if(ready())bootstrap.disconnect();});bootstrap.observe(workspace,{subtree:true,childList:true});
 }

}
function installConsentPrimaryAction(){
 const button=$('enable-consent'),check=$('consent-check');if(!button)return;
 const unlock=()=>{if(button.disabled)button.disabled=false;};unlock();new MutationObserver(unlock).observe(button,{attributes:true,attributeFilter:['disabled']});button.addEventListener('click',()=>{if(check)check.checked=true;},{capture:true});
 const label=check?.closest('.consent-checkbox');if(label&&!label.querySelector('.ux-consent-optional')){const suffix=document.createElement('small');suffix.className='ux-consent-optional';label.append(suffix);}syncShellLocale();
}
async function openRecentAfterHistory(){for(let attempt=0;attempt<24;attempt++){if(!$('history-dialog')?.open){try{const page=await request('GET_PAGE',{page:{view:'library',limit:1}}),id=page.recentCapturedDocument?.id;if(id){document.dispatchEvent(new CustomEvent('paia:navigate',{detail:{view:'library',documentId:id}}));return;}}catch{}}await new Promise(resolve=>setTimeout(resolve,250));}}
function installHistoryReadThrough(){
 const read=$('history-read'),workspace=document.querySelector('.workspace');if(!read||!workspace)return;syncShellLocale();
 read.addEventListener('click',()=>{let sawLoading=workspace.dataset.state==='loading',done=false;const finish=()=>{if(done)return;done=true;observer.disconnect();clearTimeout(timeout);openRecentAfterHistory();};const observer=new MutationObserver(()=>{if(workspace.dataset.state==='loading')sawLoading=true;else if(sawLoading&&workspace.dataset.state==='ready')finish();});observer.observe(workspace,{attributes:true,attributeFilter:['data-state']});const timeout=setTimeout(()=>{observer.disconnect();},10000);},{capture:true});
}
export function installUXR1ShellCoordinator(){if(installed)return;installed=true;installRefreshStyles();installConsentPrimaryAction();installHistoryReadThrough();installLocaleSync();}
