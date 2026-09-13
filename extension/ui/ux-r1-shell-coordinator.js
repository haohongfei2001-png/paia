const $=id=>document.getElementById(id);
const SHELL_VIEWS=new Set(['library','thoughts','memory','settings']);
let installed=false,initialized=false,lastView=null,applyingTarget=null;

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

function installConsentPrimaryAction(){
 const button=$('enable-consent'),check=$('consent-check');if(!button)return;
 // UX-R1: the primary action itself is explicit local-save consent. Keep the
 // legacy checkbox as a compatible acknowledgement, but never require it.
 const unlock=()=>{if(!button.closest('#consent-panel')?.hidden&&button.disabled)button.disabled=false;};
 unlock();new MutationObserver(unlock).observe(button,{attributes:true,attributeFilter:['disabled']});
 button.addEventListener('click',()=>{if(check)check.checked=true;},{capture:true});
 const label=check?.closest('.consent-checkbox');if(label){
  const suffix=document.createElement('small');suffix.className='ux-consent-optional';suffix.textContent=' 可选：用于标记你已阅读上面的完整说明。';label.append(suffix);
 }
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

export function installUXR1ShellCoordinator(){
 if(installed)return;installed=true;installConsentPrimaryAction();installShellHistory();
}
