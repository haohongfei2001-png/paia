const READ='PAIA_PROMPT_ASSIST_STATUS',WRITE='PAIA_PROMPT_ASSIST_CONFIGURE';
const fields=['replyAccess','remoteProcessing'];
function snapshot(x){if(!x||Object.keys(x).some(k=>![...fields,'generation','serviceAvailable'].includes(k))||!fields.every(k=>typeof x[k]==='boolean')||typeof x.generation!=='string'||!x.generation||typeof x.serviceAvailable!=='boolean')throw Error('UNCONFIRMED_ASSIST_STATE');return {...x};}
// Presentation only. The original worker owns consent and remote admission.
export class SettingsAssistState {
 constructor({send,changed=()=>{}}){this.send=send;this.changed=changed;this.value=null;this.error=false;this.busy=false;this.feedback='';this.epoch=0;this.pending=false;}
 get editable(){return !!this.value&&!this.error&&!this.busy;}
 emit(){this.changed(this);}
 async load(){if(this.busy){this.pending=true;return false;}return this.#read();}
 async invalidate(){
  // Unlike an ordinary refresh, an authority-change notice immediately fences
  // the old generation. Invalidate any earlier read, including a queued read
  // during a save, and keep the existing owner busy until the latest read wins.
  ++this.epoch;this.pending=true;if(this.busy)return false;
  this.busy=true;this.feedback='reading';this.emit();
  try{while(this.pending){this.pending=false;await this.#read();}}
  finally{this.busy=false;this.emit();}
  return !this.error;
 }
 async #read(){const epoch=++this.epoch;try{const value=snapshot(await this.send(READ));if(epoch!==this.epoch)return false;this.value=value;this.error=false;this.feedback='';}catch{if(epoch!==this.epoch)return false;this.error=true;this.feedback='read-error';}this.emit();return !this.error;}
 async configure(field,enabled){
  if(!this.editable||!fields.includes(field)||typeof enabled!=='boolean')return false;
  const requested=Object.fromEntries(fields.map(k=>[k,k===field?enabled:this.value[k]]));++this.epoch;this.busy=true;this.feedback='saving';this.emit();let saved=false;
  try{const value=snapshot(await this.send(WRITE,{...requested,expectedGeneration:this.value.generation,consentVersion:2}));if(fields.some(k=>value[k]!==requested[k]))throw Error('UNCONFIRMED_ASSIST_STATE');this.value=value;this.error=false;this.feedback='saved';saved=true;}
  catch{try{this.value=snapshot(await this.send(READ));this.error=false;}catch{this.error=true;}this.feedback=this.error?'save-unknown':'save-error';}
  finally{
   // A queued authority notification can supersede the write ACK. Keep both
   // controls disabled until every read settles, including notifications or
   // observer refreshes received during a read. Never replay the write.
   const feedback=this.feedback;while(this.pending){this.pending=false;await this.#read();}
   this.busy=false;if(!this.error&&feedback.startsWith('save-'))this.feedback=feedback;this.emit();
  }return saved;
 }
}
