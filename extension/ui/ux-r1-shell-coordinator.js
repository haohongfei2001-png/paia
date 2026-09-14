const $=id=>document.getElementById(id);
const SETTINGS_LABELS={
 content:['内容与收录','Content & capture'],reading:['阅读与外观','Reading & appearance'],ai:['AI','AI'],
 privacy:['隐私与对外使用','Privacy & external use'],data:['数据与设备','Data & devices'],advanced:['高级','Advanced']
};
let installed=false;

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

function openRecentAfterHistory(){
 let attempts=0;
 const open=()=>{
  const dialog=$('history-dialog'),home=$('core-loop-home'),recent=$('core-loop-continue');
  if(!dialog?.open&&home&&!home.hidden&&recent&&!recent.disabled){recent.click();return;}
  if(attempts++<120)setTimeout(open,50);
 };
 open();
}
function installHistoryReadThrough(){
 const read=$('history-read'),workspace=document.querySelector('.workspace');if(!read||!workspace)return;syncShellLocale();
 read.addEventListener('click',()=>{
  let sawLoading=workspace.dataset.state==='loading',done=false;
  const finish=()=>{if(done)return;done=true;observer.disconnect();clearTimeout(timeout);openRecentAfterHistory();};
  const observer=new MutationObserver(()=>{if(workspace.dataset.state==='loading')sawLoading=true;else if(sawLoading&&workspace.dataset.state==='ready')finish();});
  observer.observe(workspace,{attributes:true,attributeFilter:['data-state']});
  const timeout=setTimeout(()=>{observer.disconnect();},10000);
 },{capture:true});
}

export function installUXR1ShellCoordinator(){
 if(installed)return;installed=true;installConsentPrimaryAction();installHistoryReadThrough();installLocaleSync();
}
