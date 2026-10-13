import {request} from './common.js';
import {SettingsLocalState} from './settings-local-state.js';
const $=id=>document.getElementById(id);
// One first-use presentation of the existing acknowledged CONSENT owner.
// Dismissal is progress only; it never supplies capture or other permissions.
export class OnboardingUI {
 constructor({refresh=()=>{},history=()=>{}}={}){
  this.state=null;this.refresh=refresh;this.history=history;this.page=null;this.settings=false;this.dismissing=false;
  this.capture=new SettingsLocalState({send:request,changed:()=>this.sync()});
  $('enable-consent').addEventListener('click',event=>{if(event.isTrusted&&!$('consent-panel').hidden)void this.accept();});
  $('decline-consent').addEventListener('click',event=>{if(event.isTrusted&&!$('consent-panel').hidden)void this.action('dismiss_consent');});
 }
 async load(){try{this.state=await request('GET_ONBOARDING');}catch{this.state=null;}}
 async accept(){
  if(this.dismissing||this.capture.busy||!this.state)return;
  const saved=await this.capture.acceptCapture();
  if(saved){await this.load();await this.refresh();}else this.sync();
 }
 async action(action){
  if(this.capture.busy||this.dismissing)return;this.dismissing=true;this.sync();
  try{this.state=await request('SET_ONBOARDING',{action});await this.refresh();}
  catch{$('onboarding-error').textContent=document.documentElement.lang==='en'?'Could not save your choice. Please retry.':'暂时无法保存选择，请再试一次。';}
  finally{this.dismissing=false;this.sync();}
 }
 sync(){
  if(!this.page)return;const c=this.capture,consented=c.capture?.consented===true;
  $('consent-panel').hidden=this.settings||consented||this.state?.step!=='consent';
  $('enable-consent').disabled=this.dismissing||c.busy||!c.loaded||c.reading||c.captureUnknown||consented;
  $('decline-consent').disabled=this.dismissing||c.busy;
  if(c.feedback){const english=document.documentElement.lang==='en';$('onboarding-error').textContent=c.captureUnknown?(english?'Capture status is unknown. Reopen Settings to check before retrying.':'无法核对保存状态，请在设置中重新读取后再试。'):c.feedback==='saving'?(english?'Saving…':'正在保存…'):c.feedback==='save-error'?(english?'Save was not confirmed. Check the status and retry.':'保存未获确认，请检查状态后重试。'):'';}
 }
 paint(page,{settings=false}={}){
  this.page=page;this.settings=settings;if(!this.capture.busy){this.capture.apply(page);}
  this.sync();
 }
}
