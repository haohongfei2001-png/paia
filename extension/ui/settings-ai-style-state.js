import {AI_STYLES} from '../core/ai-organize-style-preference.js';

function snapshot(value){
 if(!value||typeof value.epoch!=='string'||!/^[a-zA-Z0-9:-]{1,128}$/.test(value.epoch)||Object.keys(value).some(key=>!['available','value','revision','explicit','epoch'].includes(key)))throw Error('INVALID_STYLE_SNAPSHOT');
 if(value.available===false&&value.value===null&&value.revision===null&&value.explicit===null)return {...value};
 if(value.available!==true||!AI_STYLES.includes(value.value)||!Number.isSafeInteger(value.revision)||value.revision<0||typeof value.explicit!=='boolean'||(value.explicit?value.revision===0:value.revision!==0||value.value!=='balanced'))throw Error('INVALID_STYLE_SNAPSHOT');
 return {...value};
}

// Ephemeral presenter state over the sole canonical preference/CAS owner.
export class SettingsAIStyleState {
 constructor({send,changed=()=>{}}){this.send=send;this.changed=changed;this.value=null;this.busy=false;this.readError=false;this.feedback='';this.epoch=0;this.refreshPending=false;}
 emit(){this.changed(this);}
 get editable(){return this.value?.available===true&&!this.busy&&!this.readError;}
 async read(){return snapshot(await this.send('PAIA_SETTINGS_AI_STYLE'));}
 async load(){
  if(this.busy){this.refreshPending=true;return false;}
  const epoch=++this.epoch;
  try{const value=await this.read();if(epoch!==this.epoch)return false;this.value=value;this.readError=false;this.feedback=value.available?'':'unsupported';this.emit();return true;}
  catch{if(epoch===this.epoch){this.readError=true;this.feedback='read-error';this.emit();}return false;}
 }
 async select(value){
  if(!this.editable||!AI_STYLES.includes(value))return false;
  const prior=this.value;++this.epoch;this.busy=true;this.feedback='saving';this.emit();let saved=false;
  try{
   const result=await this.send('UPDATE_PREFERENCES',{changes:{aiOrganizeStyle:{version:1,value,expectedRevision:prior.revision,expectedEpoch:prior.epoch}}});
   if(result?.conflict){this.feedback='conflict';this.value=await this.read();this.readError=false;}
   else{
    if(result?.ok!==true||typeof result.changed!=='boolean'||!result.changed&&(!prior.explicit||prior.value!==value))throw Error('UNCONFIRMED_STYLE_WRITE');
    this.value={available:true,value,revision:prior.revision+Number(result.changed),explicit:true,epoch:prior.epoch};this.readError=false;this.feedback='saved';saved=true;
   }
  }catch{
   try{this.value=await this.read();this.readError=false;}catch{this.readError=true;}
   this.feedback=this.readError?'save-unknown':'save-error';
  }finally{
   this.busy=false;this.emit();
   if(this.refreshPending){this.refreshPending=false;const feedback=this.feedback;await this.load();if(!this.readError&&['conflict','save-error','save-unknown'].includes(feedback)){this.feedback=feedback==='save-unknown'?'save-error':feedback;this.emit();}}
  }
  return saved;
 }
}
