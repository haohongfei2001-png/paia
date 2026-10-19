const READ='PAIA_PROMPT_NEXT_STATUS',WRITE='PAIA_PROMPT_NEXT_CONFIGURE';
function snapshot(x){if(!x||typeof x.enabled!=='boolean'||typeof x.generation!=='string'||!x.generation||Object.keys(x).some(k=>!['enabled','generation'].includes(k)))throw Error('UNCONFIRMED_NEXT_STATE');return {...x};}
// Presentation only; NextPromptCommands retains all authorization and writes.
export class SettingsNextState {
 constructor({send,changed=()=>{}}){this.send=send;this.changed=changed;this.value=null;this.error=false;this.busy=false;this.feedback='';this.epoch=0;this.pending=false;}
 get editable(){return !!this.value&&!this.error&&!this.busy;}
 emit(){this.changed(this);}
 async load(){if(this.busy){this.pending=true;return false;}const epoch=++this.epoch;try{const value=snapshot(await this.send(READ));if(epoch!==this.epoch)return false;this.value=value;this.error=false;this.feedback='';}catch{if(epoch!==this.epoch)return false;this.error=true;this.feedback='read-error';}this.emit();return !this.error;}
 async configure(enabled){if(!this.editable||typeof enabled!=='boolean')return false;++this.epoch;this.busy=true;this.feedback='saving';this.emit();let saved=false;try{const value=snapshot(await this.send(WRITE,{enabled}));if(value.enabled!==enabled)throw Error('UNCONFIRMED_NEXT_STATE');this.value=value;this.error=false;this.feedback='saved';saved=true;}catch{try{this.value=snapshot(await this.send(READ));this.error=false;}catch{this.error=true;}this.feedback=this.error?'save-unknown':'save-error';}finally{this.busy=false;this.emit();if(this.pending){this.pending=false;const feedback=this.feedback;await this.load();if(!this.error&&feedback.startsWith('save-')){this.feedback=feedback;this.emit();}}}return saved;}
}
