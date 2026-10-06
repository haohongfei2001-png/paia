import {request} from './common.js';
import {setProductState} from './product-state.js';

const $=id=>document.getElementById(id);
const copy=(zh,en)=>document.documentElement.lang==='en'?en:zh;

// Privacy remains available while the retired Context workspace has no owner.
// This panel can restrict local processing or revoke access, never grant access.
export class MemoryPanel {
 constructor(){
  this.contextDisabled=true;this.active=false;this.busy=false;this.loaded=false;this.serial=0;this.localOnly=false;
  $('memory-local-only')?.addEventListener('change',()=>void this.perform(()=>this.saveLocalOnly()));
  $('memory-clear-session')?.addEventListener('click',()=>void this.perform(()=>this.revoke()));
  this.lock();
 }
 lock(){
  const local=$('memory-local-only'),external=$('memory-external-access'),revoke=$('memory-clear-session');
  if(local)local.disabled=this.busy||!this.loaded;
  if(external){external.checked=false;external.disabled=true;}
  if(revoke)revoke.disabled=this.busy;
 }
 feedback(text,state='ready'){const el=$('memory-settings-status');if(el){setProductState(el,state);el.textContent=text;}}
 async perform(fn){try{return await fn();}catch{this.feedback(copy('操作未完成，请重试。已保存的设置保持不变。','Could not complete the action. Saved settings are unchanged.'),'failed');return null;}}
 leave(){return true;}
 activate(active){this.active=active===true;}
 invalidate(){this.serial++;}
 open(){return false;}
 refresh(){return Promise.resolve(false);}
 async refreshSettings(){
  if(this.busy)return;
  const serial=++this.serial;
  try{
   const result=await request('PAIA_MEMORY_STATUS');if(serial!==this.serial)return;
   this.localOnly=result.config.localOnly===true;this.loaded=true;
   const local=$('memory-local-only');if(local)local.checked=this.localOnly;
  }catch(error){if(serial===this.serial){this.loaded=false;this.feedback(copy('无法读取隐私设置，请重新打开设置。','Privacy settings could not be loaded. Reopen Settings to retry.'),'failed');}throw error;}
  finally{if(serial===this.serial)this.lock();}
 }
 async saveLocalOnly(){
  const local=$('memory-local-only');if(this.busy||!this.loaded||!local){if(local)local.checked=this.localOnly;return;}
  const value=local.checked===true;this.busy=true;this.serial++;this.lock();
  try{
   await request('PAIA_MEMORY_SETTINGS',{options:{localOnly:value,externalAccess:false}});
   this.localOnly=value;this.feedback(copy('已保存','Saved'),'saved');
  }catch(error){local.checked=this.localOnly;throw error;}
  finally{this.busy=false;this.lock();}
 }
 async revoke(){
  if(this.busy)return;this.busy=true;this.serial++;this.lock();
  try{
   await request('PAIA_MEMORY_SETTINGS',{options:{externalAccess:false,clearTemporary:true}});
   this.feedback(copy('已有连接与临时授权已撤销。','Previous connections and temporary permissions were revoked.'),'saved');
  }finally{this.busy=false;this.lock();}
 }
}
