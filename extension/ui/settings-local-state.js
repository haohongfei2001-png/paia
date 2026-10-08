import {normalizeUXPreferences} from './ux-r1-state.js';

const choices={appearance:['system','light','dark'],language:['system','zh-CN','en'],fontSize:['small','standard','large','xlarge'],readingWidth:['narrow','standard','wide'],timeDisplay:['date_and_time','date_and_seconds']};
const normalize=preferences=>({...normalizeUXPreferences(preferences),timeDisplay:['date_only','date_and_time','date_and_seconds'].includes(preferences?.timeDisplay)?preferences.timeDisplay:'date_and_time'});
export const timeDisplayValue=value=>value==='date_and_seconds'?'date_and_seconds':'date_and_time';

// A presenter over the existing commands, never another preference store.
// Pending writes invalidate prior reads and retain the last acknowledged value.
export class SettingsLocalState {
 constructor({send,changed=()=>{}}){this.send=send;this.changed=changed;this.preferences=normalize();this.capture=null;this.loaded=false;this.busy=false;this.feedback='';this.epoch=0;this.refreshPending=false;}
 emit(){this.changed(this);}
 apply(page){if(!page?.settings||!page?.preferences)throw Error('INVALID_SETTINGS_SNAPSHOT');this.preferences=normalize(page.preferences);this.capture={consented:page.settings.consentVersion===1,enabled:page.settings.enabled===true};this.loaded=true;}
 async load(){
  if(this.busy){this.refreshPending=true;return null;}
  const epoch=++this.epoch;
  try{const page=await this.send('GET_PAGE',{page:{view:'settings'}});if(epoch!==this.epoch)return null;this.apply(page);this.feedback='';this.emit();return page;}
  catch{if(epoch===this.epoch){this.feedback='read-error';this.emit();}return null;}
 }
 async write(type,payload,accept){
  if(this.busy||!this.loaded)return false;
  ++this.epoch;this.busy=true;this.feedback='saving';this.emit();let saved=false;
  try{const result=await this.send(type,payload);accept(result);saved=true;this.feedback='saved';}
  catch{try{this.apply(await this.send('GET_PAGE',{page:{view:'settings'}}));}catch{/* Keep the last confirmed state when reconciliation also fails. */}this.feedback='save-error';}
  finally{this.busy=false;this.emit();if(this.refreshPending){this.refreshPending=false;const feedback=this.feedback;await this.load();if(feedback==='save-error'){this.feedback=feedback;this.emit();}}}
  return saved;
 }
 setPreference(key,value){if(!choices[key]?.includes(value))return Promise.resolve(false);return this.write('UPDATE_PREFERENCES',{changes:{[key]:value}},result=>{if(result?.ok!==true)throw Error('UNCONFIRMED_SETTINGS_WRITE');this.preferences={...this.preferences,[key]:value};});}
 setCapture(enabled){if(typeof enabled!=='boolean'||!this.capture?.consented)return Promise.resolve(false);return this.write('SET_ENABLED',{enabled},result=>{if(result?.enabled!==enabled)throw Error('UNCONFIRMED_CAPTURE_WRITE');this.capture={...this.capture,enabled};});}
}

export async function withSettingsControlFocus(control,operation){
 const document=control?.ownerDocument||globalThis.document,focused=document?.activeElement===control;
 try{return await operation();}finally{if(focused&&control.isConnected&&control.getClientRects?.().length&&[control,document.body,document.documentElement,null].includes(document.activeElement))control.focus({preventScroll:true});}
}
export async function changePreferenceControl(state,key,value,control){
 const selected=()=>key==='timeDisplay'?timeDisplayValue(state.preferences[key]):state.preferences[key];
 control.value=selected();
 return withSettingsControlFocus(control,async()=>{const saved=await state.setPreference(key,value);control.value=selected();return saved;});
}
