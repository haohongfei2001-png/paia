// Bounded synthetic-fixture evidence; never retains content, query or RPC bodies.
export function installCaptureToggleEvidence(){
 const control=document.getElementById('toggle-capture'),send=chrome.runtime.sendMessage;
 const snapshot=()=>({disabled:control.disabled,checked:control.getAttribute('aria-checked'),connected:control.isConnected,visible:!!control.getClientRects().length,focused:document.activeElement===control});
 const trace={stage:'initial-read',before:snapshot(),events:[],writes:[],reads:[]};
 const observer=event=>{if(event.target===control||control.contains(event.target)){if(trace.events.length<12)trace.events.push({stage:trace.stage,type:event.type,trusted:event.isTrusted,pointerType:event.pointerType||null,control:snapshot()});}};
 for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,observer,true);
 function wrapped(...args){
  const message=args[0],type=message?.type,tracked=['SET_ENABLED','GET_STATUS','GET_PAGE'].includes(type);
  if(!tracked)return Reflect.apply(send,this,args);
  const rows=type==='SET_ENABLED'?trace.writes:trace.reads,row={type,stage:trace.stage,state:'pending',control:snapshot(),...(type==='SET_ENABLED'?{requested:typeof message.enabled==='boolean'?message.enabled:null}:{})};
  rows.push(row);if(rows.length>(type==='SET_ENABLED'?8:12))rows.shift();
  let result;try{result=Reflect.apply(send,this,args);}catch(error){row.state='threw';row.error=error?.name;throw error;}
  // Observe the promise while returning the original object and callback behavior.
  if(result?.then)result.then(response=>{row.state='settled';row.ok=response?.ok===true;const data=response?.data,settings=type==='GET_PAGE'?data?.settings:null;row.enabled=typeof (settings?settings.enabled:data?.enabled)==='boolean'?(settings?settings.enabled:data.enabled):null;row.consented=settings?settings.consentVersion===1:typeof data?.consented==='boolean'?data.consented:null;row.controlAfter=snapshot();},error=>{row.state='rejected';row.error=error?.name;});
  else row.state='callback';
  return result;
 }
 chrome.runtime.sendMessage=wrapped;
 globalThis.__settingsCaptureEvidence={trace,stage(value){trace.stage=value;},finish(){let failure;const attempt=fn=>{try{fn();}catch(error){failure??=error;}};attempt(()=>{trace.current=snapshot();});for(const type of ['pointerdown','pointerup','click'])attempt(()=>document.removeEventListener(type,observer,true));attempt(()=>{if(chrome.runtime.sendMessage===wrapped)chrome.runtime.sendMessage=send;});attempt(()=>{delete globalThis.__settingsCaptureEvidence;});if(failure)throw failure;return trace;}};
}
export async function captureToggleRoundTrip(page,{rpc,eventually}){
 await page.evaluate(installCaptureToggleEvidence);let originalError=null,evidence,capture;
 try{
  capture=(await rpc(page,'GET_STATUS')).enabled;
  for(const [stage,expected] of [['capture-first',!capture],['capture-restore',capture]]){
   await page.evaluate(stage=>__settingsCaptureEvidence.stage(stage),stage);
   await page.locator('#toggle-capture').click();
   await eventually(async()=>(await rpc(page,'GET_STATUS')).enabled===expected,`${stage}: persisted capture enabled matches the native toggle`);
  }
 }catch(error){originalError=error;throw error;}
 finally{
  try{evidence=await page.evaluate(()=>__settingsCaptureEvidence.finish());if(originalError)originalError.captureToggleEvidence=evidence;}
  catch(error){if(!originalError)throw error;originalError.captureToggleEvidence={unavailable:error?.name||'Error'};}
 }
 return {capture,evidence};
}

// Attempt every restoration. An action failure remains the primary identity;
// otherwise the first cleanup failure fails the successful journey.
export async function finishSettingsAttempts(primary,actions){
 let failure=primary;for(const action of actions)try{await action();}catch(error){failure??=error;}
 if(failure)throw failure;
}
