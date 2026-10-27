const PORT='paia-application-editor-guard:v1';
const exact=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).length===keys.length&&keys.every(k=>Object.hasOwn(Object.getOwnPropertyDescriptors(v)[k]??{},'value'));
const nonce=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
// Owners remain responsible for dirty/IME/unknown handling. Messages contain no
// draft text or entity IDs. Disconnection never means "saved" or "safe".
// Ordinary unheld pages remain editable if registration is unavailable; a page
// disconnected during a held transition stays blocked with its draft intact.
export function installApplicationEditorGuard({prepare,current,release},{api=globalThis.chrome,document:doc=globalThis.document,target=globalThis.window}={}){
 if(typeof prepare!=='function'||typeof current!=='function'||typeof release!=='function')throw Error('EDITOR_OWNER_REQUIRED');
 let registered=false,held=null,serial=0,disposed=false,disconnectedWhileHeld=false;let port;
 // Early enrollment must not prevent an ordinary unheld page from loading if
 // its extension connection is unavailable. No listeners or READY are issued.
 // Preserve error visibility; all later installation errors still propagate.
 try{port=api.runtime.connect({name:PORT});}catch(error){globalThis.reportError?.(error);return null;}
 const send=value=>{try{port.postMessage(value);}catch{registered=false;++serial;}};
 const isFixedControl=event=>{const button=event.target?.closest?.('#settings-sync-dialog button[data-sync-command]');return !!button&&['STATUS','GENERATION_CANCEL','GENERATION_RESTART'].includes(button.dataset.syncCommand);};
 const intercept=event=>{if((held||disconnectedWhileHeld)&&!isFixedControl(event)){event.preventDefault();event.stopImmediatePropagation();}};
 const changed=()=>{if(held){++serial;send({type:'INVALIDATED',nonce:held});}};
 for(const name of ['beforeinput','keydown','pointerdown','click','submit','compositionstart'])doc.addEventListener(name,intercept,true);
 for(const name of ['input','compositionend'])doc.addEventListener(name,changed,true);
 const disconnected=()=>{if(held)disconnectedWhileHeld=true;registered=false;++serial;};port.onDisconnect.addListener(disconnected);
 port.onMessage.addListener(async value=>{
  if(disposed)return;
  if(exact(value,['type','version'])&&value.type==='REGISTERED'&&value.version===1&&!held){registered=true;return;}
  if(exact(value,['type','nonce','challenge'])&&value.type==='CHECK'&&value.nonce===held&&nonce(value.challenge)){let safe=false;try{safe=registered&&current()===true;}catch{}send(safe?{type:'CHECKED',nonce:held,challenge:value.challenge}:{type:'INVALIDATED',nonce:held});return;}
  if(!exact(value,['type','nonce'])||!nonce(value.nonce))return disconnected();
  if(value.type==='RELEASE'&&held===value.nonce){held=null;++serial;try{release();}catch{registered=false;}return;}
  if(value.type!=='PREPARE'||held||!registered)return disconnected();
  held=value.nonce;const claim=++serial;let safe=false;
  try{safe=await prepare()===true&&current()===true;}catch{}
  // A released or superseded preparation belongs to its original request.
  // Its late completion must not send a denial into a newer freeze lifetime.
  if(disposed||claim!==serial||held!==value.nonce)return;
  if(!registered)safe=false;
  send({type:safe?'FROZEN':'DENIED',nonce:value.nonce});
 });
 const leave=()=>{disconnected();try{port.disconnect();}catch{}};target.addEventListener('pagehide',leave);send({type:'READY',version:1});
 return Object.freeze({isFrozen:()=>disconnectedWhileHeld||held!==null,invalidate:changed,dispose(){disposed=true;leave();for(const name of ['beforeinput','keydown','pointerdown','click','submit','compositionstart'])doc.removeEventListener(name,intercept,true);for(const name of ['input','compositionend'])doc.removeEventListener(name,changed,true);target.removeEventListener('pagehide',leave);}});
}
