import {request} from './common.js';
const $=id=>document.getElementById(id);
export class OnboardingUI {
 constructor({refresh=()=>{},history=()=>{}}={}){
  this.state=null;this.refresh=refresh;this.history=history;
  $('onboarding-start').addEventListener('click',()=>void this.action('start'));
  $('onboarding-skip').addEventListener('click',()=>void this.action('skip_history'));
  $('onboarding-history').addEventListener('click',async()=>{await this.action('start_history');await this.history();});
 }
 async load(){try{this.state=await request('GET_ONBOARDING');}catch{this.state={step:'consent',historyState:'not_started'};}}
 async action(action){try{this.state=await request('SET_ONBOARDING',{action});await this.refresh();}catch{$('onboarding-error').textContent='暂时无法保存进度，请再试一次。';}}
 paint(page,{home=true}={}){
  const consented=page.settings.consentVersion===1,step=this.state?.step;
  $('onboarding-welcome').hidden=consented||step!=='welcome';
  $('consent-panel').hidden=consented||step==='welcome'||!this.state;
  $('onboarding-history-step').hidden=!consented||!home||step!=='history';
 }
}
