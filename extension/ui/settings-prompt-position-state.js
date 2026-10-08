const READ='PAIA_PROMPT_SURFACE_SETTINGS_STATUS',RESET='PAIA_PROMPT_SURFACE_RESET_POSITION';
function snapshot(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('INVALID_POSITION_SNAPSHOT');
 if(value.status==='ready'&&Object.keys(value).length===2&&['default','custom'].includes(value.position))return {...value};
 if(['consent_required','unavailable'].includes(value.status)&&Object.keys(value).length===1)return {...value};
 throw Error('INVALID_POSITION_SNAPSHOT');
}
// UI state only; PromptSurfaceCommands remains the sole geometry writer.
export class SettingsPromptPositionState {
 constructor({send,changed=()=>{}}){this.send=send;this.changed=changed;this.value=null;this.readError=false;this.busy=false;this.feedback='';this.epoch=0;this.refreshPending=false;}
 emit(){this.changed(this);}
 get editable(){return this.value?.status==='ready'&&!this.readError&&!this.busy;}
 async read(){return snapshot(await this.send(READ));}
 async load(){
  if(this.busy){this.refreshPending=true;return false;}
  const epoch=++this.epoch;try{const value=await this.read();if(epoch!==this.epoch)return false;this.value=value;this.readError=false;this.feedback='';this.emit();return true;}catch{if(epoch===this.epoch){this.readError=true;this.feedback='read-error';this.emit();}return false;}
 }
 async reset(){
  if(!this.editable)return false;
  ++this.epoch;this.busy=true;this.feedback='saving';this.emit();let saved=false;
  try{const result=await this.send(RESET);if(!result||Object.keys(result).length!==2||result.status!=='reset'||typeof result.changed!=='boolean')throw Error('UNCONFIRMED_POSITION_RESET');this.value={status:'ready',position:'default'};this.readError=false;this.feedback='saved';saved=true;}
  catch{try{this.value=await this.read();this.readError=false;}catch{this.readError=true;}this.feedback=this.readError?'save-unknown':'save-error';}
  finally{this.busy=false;this.emit();if(this.refreshPending){this.refreshPending=false;const feedback=this.feedback;await this.load();if(!this.readError&&(feedback==='save-error'||feedback==='save-unknown'||feedback==='saved'&&this.value?.position==='default')){this.feedback=feedback==='save-unknown'?'save-error':feedback;this.emit();}}}
  return saved;
 }
}
