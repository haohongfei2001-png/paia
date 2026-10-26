import {fixtureRPC as archiveThoughtRPC} from './archive-thought.mjs';

// Harness-only adapter: original Settings navigation, controls and consent
// handlers. No confirmation action is emitted and no grant/configuration write
// is accepted by this boundary. The original source files stay untouched.
export const settingsGapSceneIds=Object.freeze([
 'settings-reply-consent','settings-remote-consent','settings-next-consent',
 'settings-capture-consent','settings-cancel-focus'
]);
export const anticipatedRPC=Object.freeze([
 'GET_PAGE','PAIA_PROMPT_ASSIST_STATUS','PAIA_PROMPT_NEXT_STATUS'
]);
export const forbiddenConfigurationRPC=Object.freeze([
 'CONSENT','SET_ENABLED','UPDATE_PREFERENCES','SET_ORGANIZER_CONTROLS',
 'PAIA_PROMPT_ASSIST_CONFIGURE','PAIA_PROMPT_NEXT_CONFIGURE',
 'PAIA_MAINTENANCE_PROCESSING_CONFIGURE'
]);
const known=id=>settingsGapSceneIds.includes(id);
const handled=data=>({handled:true,data});
const writeType=/^(?:CONSENT|SET_|UPDATE_)|_(?:CONFIGURE|GRANT|AUTHORIZE|ACTIVATE|ENABLE|DISABLE|REVOKE|SET)(?:_|$)/;

export async function fixtureRPC(message,{scene,fixture}){
 if(!known(scene.id))return null;
 const type=message?.type;
 if(typeof type!=='string')throw Error('SETTINGS_GAP_INVALID_RPC');
 if(writeType.test(type)||message.command!==undefined||
    ['accepted','enabled','replyAccess','remoteProcessing','changes'].some(key=>Object.hasOwn(message,key))||
    type==='PAIA_ARCHIVE_ORDER_PREFERENCE'&&Object.hasOwn(message,'mode')||
    type==='PAIA_SETTINGS_AI_STYLE'&&['value','style','revision'].some(key=>Object.hasOwn(message,key)))
  throw Error('SETTINGS_GAP_CONFIGURATION_REFUSED: '+type);
 if(type==='PAIA_PROMPT_ASSIST_STATUS')return handled({replyAccess:false,remoteProcessing:false,generation:'visual-assist-generation',serviceAvailable:false});
 if(type==='PAIA_PROMPT_NEXT_STATUS')return handled({enabled:false,generation:'visual-next-generation'});
 if(scene.id==='settings-capture-consent'&&type==='GET_PAGE'){
  const original=await archiveThoughtRPC(message,{scene,fixture});
  if(!original?.handled||!original.data?.settings||original.data.settings.captureEnabled!==false||original.data.capture?.enabled!==false)
   throw Error('SETTINGS_GAP_CAPTURE_OFF_FIXTURE_REQUIRED');
  const data=structuredClone(original.data);
  // A never-consented synthetic page is required by the actual first-consent
  // owner. Only this scene's clone changes; the shared fixture stays unchanged.
  data.settings.consentVersion=0;
  return handled(data);
 }
 return null;
}

const assert=(selector,assertion,extra={})=>({action:'assert',selector,assertion,...extra});
const wait=(selector,state='visible')=>({action:'wait',selector,state});
const click=selector=>({action:'click',selector});
const allOff=()=>[
 assert('#settings-assist-replyAccess','unchecked'),
 assert('#settings-assist-remoteProcessing','unchecked'),
 assert('#settings-next-enabled','unchecked'),
 assert('#toggle-capture','attribute',{name:'aria-checked',value:'false'})
];
async function awaitControl(selector){
 const until=performance.now()+7000;
 while(!document.querySelector(selector)){
  if(globalThis.__paiaVisualFatal)throw Error(globalThis.__paiaVisualFatal);
  if(performance.now()>until)throw Error('SETTINGS_GAP_ORIGINAL_CONTROL_NOT_READY: '+selector);
  await new Promise(resolve=>setTimeout(resolve,25));
 }
}

export async function prepareScene(scene,{owners,fixture}){
 if(!known(scene.id))return null;
 if(fixture?.synthetic!==true||!owners?.navigate)throw Error('SETTINGS_GAP_SOURCE_BOUNDARY_MISSING');
 const isCapture=scene.id==='settings-capture-consent',group=isCapture?'content':'ai';
 const navigated=await owners.navigate('settings');
 if(navigated===false)throw Error('SETTINGS_GAP_ORIGINAL_NAVIGATION_REFUSED');
 const api=await import('/ui/settings-preferences.js');
 api.presentSettingsPreferences({visible:true});
 api.restoreSettingsView({settingsGroup:group});
 const field=scene.id==='settings-remote-consent'?'remoteProcessing':'replyAccess';
 const control=isCapture?'#toggle-capture':scene.id==='settings-next-consent'?'#settings-next-enabled':'#settings-assist-'+field;
 await awaitControl(control+':not(:disabled)'+(isCapture?'[aria-checked="false"]':'[data-loaded="true"]:not(:checked)'));
 const evidence={owner:'actual archive.navigate + settings-preferences + original consent handlers',group,syntheticOnly:true,configurationWrites:'refused',confirmationActions:0,sourceHTMLCloned:false,settingsCaptureConsentVersion:isCapture?0:1};
 if(scene.id==='settings-cancel-focus'){
  const dialog='#settings-assist-consent',cancel='#settings-assist-cancel',trigger='label[for="settings-assist-replyAccess"]';
  return {handled:true,readySelector:control+':focus:not(:checked)',actions:[
   click(trigger),wait(dialog+'[open]'),assert(cancel,'focused'),
   {action:'press',selector:cancel,key:'Escape'},wait(dialog,'hidden'),assert(control,'focused'),
   click(trigger),wait(dialog+'[open]'),assert(cancel,'focused'),click(cancel),
   wait(dialog,'hidden'),assert(control,'focused'),...allOff()
  ],evidence:{...evidence,cancelPaths:['trusted Escape on original dialog','trusted original Cancel button'],returnFocusTarget:control}};
 }
 const isNext=scene.id==='settings-next-consent';
 const dialog=isCapture?'#settings-capture-consent':isNext?'#settings-next-consent':'#settings-assist-consent';
 const cancel=isCapture?'#settings-capture-cancel':isNext?'#settings-next-cancel':'#settings-assist-cancel';
 const trigger=isCapture?control:'label[for="'+control.slice(1)+'"]';
 const confirm=isCapture?'#settings-capture-confirm':isNext?'#settings-next-confirm':'#settings-assist-confirm';
 return {handled:true,readySelector:dialog+'[open]',actions:[click(trigger),wait(dialog+'[open]'),assert(cancel,'focused'),...allOff()],evidence:{...evidence,dialog,originalTrigger:control,initialFocus:cancel,confirmNotClicked:confirm,scope:isCapture?'local sent-user-input capture':isNext?'local next-input suggestion':field==='replyAccess'?'temporary current-reply access only':'separate remote processing'}};
}
