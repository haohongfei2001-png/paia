import {request} from './common.js';

const $=id=>document.getElementById(id);
const SHELL_VIEWS=new Set(['library','thoughts','memory','settings']);
const SETTINGS_LABELS={
 content:['内容与收录','Content & capture'],reading:['阅读与外观','Reading & appearance'],ai:['AI','AI'],
 privacy:['隐私与对外使用','Privacy & external use'],data:['数据与设备','Data & devices'],advanced:['高级','Advanced']
};
let installed=false,initialized=false,lastView=null,applyingTarget=null,recentFallbackToken=0;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function currentView(){
 const active=document.querySelector('#primary-nav [aria-current="page"],.sidebar-bottom [data-view="settings"][aria-current="page"]');
 return SHELL_VIEWS.has(active?.dataset?.view)?active.dataset.view:null;
}
function targetButton(view){
 if(!SHELL_VIEWS.has(view))return null;
 return view==='settings'?document.querySelector('.sidebar-bottom [data-view="settings"]'):document.querySelector(`#primary-nav [data-view="${view}"]`);
}
function stateFor(view,returnTo=null){
 return {...(history.state&&typeof history.state==='object'?history.state:{}),paiaShell:{version:1,view,returnTo:SHELL_VIEWS.has(returnTo)?returnTo:null}};
}
function explainFallback(){const notice=$('notice');if(!notice)return;notice.textContent='这个位置已不可用，已返回档案。';notice.hidden=false;}
function zh(){return document.documentElement.lang==='zh-CN';}

function syncShellLocale(){
 for(const [key,pair] of Object.entries(SETTINGS_LABELS)){
  const text=pair[zh()?0:1],tab=document.querySelector(`[data-settings-group="${key}"]`),heading=document.querySelector(`.ux-settings-group[data-group="${key}"] > h2`);
  if(tab&&tab.textContent!==text)tab.textContent=text;if(heading&&heading.textContent!==text)heading.textContent=text;
 }
 const capability=document.querySelector('.ux-capability-fact');
 if(capability){
  const heading=capability.querySelector('strong'),detail=capability.querySelector('p'),headingText=zh()?'设备同步':'Device sync',detailText=zh()?'当前版本未提供设备同步。':'Device sync is not available in this version.';
  if(heading&&heading.textContent!==headingText)heading.textContent=headingText;if(detail&&detail.textContent!==detailText)detail.textContent=detailText;
 }
 const read=$('history-read');if(read){const text=zh()?'读一篇':'Read one';if(read.textContent!==text)read.textContent=text;}
 const optional=$('consent-check')?.closest('.consent-checkbox')?.querySelector('.ux-consent-optional');if(optional)optional.textContent=zh()?' 可选：用于标记你已阅读上面的完整说明。':' Optional: mark that you read the detailed explanation.';
}
function installLocaleSync(){syncShellLocale();new MutationObserver(syncShellLocale).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});}

function installConsentPrimaryAction(){
 const button=$('enable-consent'),check=$('consent-check');if(!button)return;
 // UX-R1: the primary action itself is explicit local-save consent. Keep the
 // legacy checkbox as a compatible acknowledgement, but never require it.
 const unlock=()=>{if(button.disabled)button.disabled=false;};
 unlock();new MutationObserver(unlock).observe(button,{attributes:true,attributeFilter:['disabled']});
 button.addEventListener('click',()=>{if(check)check.checked=true;},{capture:true});
 const label=check?.closest('.consent-checkbox');if(label&&!label.querySelector('.ux-consent-optional')){
  const suffix=document.createElement('small');suffix.className='ux-consent-optional';label.append(suffix);
 }
 syncShellLocale();
}

function syncHistory(){
 const current=currentView();if(!current)return;
 if(!initialized){
  initialized=true;const saved=history.state?.paiaShell?.view;
  if(SHELL_VIEWS.has(saved)&&saved!==current){lastView=current;applyingTarget=saved;targetButton(saved)?.click();return;}
  lastView=current;history.replaceState(stateFor(current,null),'',location.href);return;
 }
 if(applyingTarget){if(current===applyingTarget){lastView=current;applyingTarget=null;}return;}
 if(current===lastView)return;
 const previous=lastView;lastView=current;history.pushState(stateFor(current,previous),'',location.href);
}
function installShellHistory(){
 const roots=[...document.querySelectorAll('#primary-nav [data-view],.sidebar-bottom [data-view="settings"]')];if(!roots.length)return;
 const settingsBack=document.querySelector('.ux-settings-back');if(settingsBack&&!settingsBack.id)settingsBack.id='ux-settings-back';
 for(const node of roots)new MutationObserver(syncHistory).observe(node,{attributes:true,attributeFilter:['aria-current']});
 window.addEventListener('popstate',event=>{
  const raw=event.state?.paiaShell?.view,target=SHELL_VIEWS.has(raw)?raw:'library';
  if(raw!==undefined&&!SHELL_VIEWS.has(raw))explainFallback();
  if(target===currentView()){lastView=target;applyingTarget=null;return;}
  applyingTarget=target;targetButton(target)?.click();
 });
 document.addEventListener('click',event=>{
  const back=event.target.closest?.('#ux-settings-back');if(!back||currentView()!=='settings')return;
  const returnTo=history.state?.paiaShell?.returnTo;if(!SHELL_VIEWS.has(returnTo))return;
  event.preventDefault();event.stopImmediatePropagation();history.back();
 },{capture:true});
 syncHistory();
}

async function waitForReader(token,attempts=12){
 for(let i=0;i<attempts&&token===recentFallbackToken;i++){if(!$('document-panel')?.hidden)return true;await delay(50);}return !$('document-panel')?.hidden;
}
async function retryRecentRoute(token){
 if(await waitForReader(token))return;
 let recent;try{recent=(await request('GET_PAGE',{page:{view:'library',limit:1}})).recentCapturedDocument;}catch{return;}
 const id=recent?.id;if(!id||token!==recentFallbackToken)return;
 if(currentView()!=='library'){targetButton('library')?.click();for(let i=0;i<40&&currentView()!=='library'&&token===recentFallbackToken;i++)await delay(50);}
 for(let page=0;page<20&&token===recentFallbackToken;page++){
  let row=[...document.querySelectorAll('#document-list .conversation-document')].find(el=>el.dataset.documentId===id);
  if(row){
   for(let attempt=0;attempt<3&&token===recentFallbackToken;attempt++){
    row.click();if(await waitForReader(token,20))return;row=[...document.querySelectorAll('#document-list .conversation-document')].find(el=>el.dataset.documentId===id);if(!row)break;
   }
   return;
  }
  const next=document.querySelector('.workspace > .pagination button:last-child');if(!next||next.disabled||next.hidden||!next.getClientRects().length)return;
  const before=$('document-list')?.textContent||'';next.click();for(let i=0;i<40&&token===recentFallbackToken&&($('document-list')?.textContent||'')===before;i++)await delay(50);
 }
}
function installRecentRouteFallback(){
 document.addEventListener('click',event=>{
  if(!event.target.closest?.('#core-loop-continue'))return;const token=++recentFallbackToken;void retryRecentRoute(token);
 },{capture:true});
}

function installHistoryReadThrough(){
 const read=$('history-read'),workspace=document.querySelector('.workspace');if(!read||!workspace)return;syncShellLocale();
 read.addEventListener('click',()=>{
  let sawLoading=workspace.dataset.state==='loading',done=false;const token=++recentFallbackToken;
  const finish=()=>{if(done)return;done=true;observer.disconnect();clearTimeout(timeout);void retryRecentRoute(token);};
  const observer=new MutationObserver(()=>{if(workspace.dataset.state==='loading')sawLoading=true;else if(sawLoading&&workspace.dataset.state==='ready')finish();});
  observer.observe(workspace,{attributes:true,attributeFilter:['data-state']});
  const timeout=setTimeout(()=>{observer.disconnect();},10000);
 },{capture:true});
}

export function installUXR1ShellCoordinator(){
 if(installed)return;installed=true;installConsentPrimaryAction();installShellHistory();installRecentRouteFallback();installHistoryReadThrough();installLocaleSync();
}
