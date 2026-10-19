import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {NextPromptCommands,NEXT_AUTH_KEY} from '../background/prompt-next.js';
import {SettingsNextState} from '../ui/settings-next-state.js';
import {normalizeUXPreferences,resolveAppearance} from '../ui/ux-r1-state.js';

const source=await readFile(new URL('../ui/popup.js',import.meta.url),'utf8');
const html=await readFile(new URL('../ui/popup.html',import.meta.url),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function event(){const listeners=[];return {addListener:fn=>listeners.push(fn),emit:(...args)=>{for(const fn of listeners)fn(...args);}};}
async function fixture(){
 const elements=new Map(),storageChanged=event(),runtimeChanged=event(),stored={},calls=[],writes=[];
 const document={documentElement:{dataset:{}},activeElement:null,querySelectorAll:()=>[],getElementById:id=>{
  if(!elements.has(id))elements.set(id,{id,checked:false,disabled:id==='next-enabled',hidden:false,textContent:'',dataset:{},classList:{toggle(){}},listeners:new Map(),addEventListener(type,fn){this.listeners.set(type,fn);},focus(){document.activeElement=this;}});
  return elements.get(id);
 }};
 const f={document,calls,writes,stored,storageChanged,runtimeChanged,storageNotices:true,runtimeNotices:true,readHook:null,writeHook:null,failRead:false};
 const api={extension:{getViews:()=>[]},runtime:{id:'extension',getURL:path=>'chrome-extension://extension/'+path,getManifest:()=>({version:'0.55.0'}),onMessage:runtimeChanged,sendMessage:async message=>{if(f.runtimeNotices)runtimeChanged.emit(message);}},storage:{onChanged:storageChanged,local:{get:async key=>key===NEXT_AUTH_KEY?{[key]:stored[key]}:{},set:async values=>{Object.assign(stored,values);writes.push(structuredClone(values));if(f.storageNotices)storageChanged.emit(Object.fromEntries(Object.entries(values).map(([key,newValue])=>[key,{newValue}])),'local');}}},tabs:{query:async()=>[],sendMessage:async()=>{}}};
 const owner=new NextPromptCommands({s:{status:async()=>({consented:true})}},api,{}),popupSender={id:'extension',url:api.runtime.getURL('ui/popup.html'),frameId:0,tab:{id:1,incognito:false}},settingsSender={...popupSender,url:api.runtime.getURL('ui/archive.html'),tab:{id:2,incognito:false}};
 const request=async(type,fields={})=>{
  calls.push({type,...fields});
  if(type==='GET_PAGE')return {settings:{consentVersion:1,enabled:true},stats:{total:0},preferences:{}};
  if(type==='PAIA_PROMPT_NEXT_STATUS'){
   if(f.failRead)throw Error('SYNTHETIC_READ_UNAVAILABLE');
   const value=await owner.handle({type,...fields},popupSender);
   return f.readHook?f.readHook(value):value;
  }
  if(type==='PAIA_PROMPT_NEXT_CONFIGURE')return f.writeHook?f.writeHook(fields,()=>owner.handle({type,...fields},popupSender)):owner.handle({type,...fields},popupSender);
  throw Error('Unexpected popup request '+type);
 };
 // Execute the entire production popup module; only ESM imports and browser
 // facilities are supplied by this isolated DOM fixture. Permission responses
 // and preference writes come from the original NextPromptCommands owner.
 await runInNewContext('(async()=>{'+source.replace(/^import .*;\n/gm,'')+'\n})()',{
  document,window:{},chrome:api,request,SettingsNextState,normalizeUXPreferences,resolveAppearance,
  enabledLabel:()=>'',statusLabel:()=>'',recoveryGuidance:()=>null,setIconLabel:()=>{},setInterval:()=>{},
 });
 f.owner=owner;f.control=document.getElementById('next-enabled');f.status=document.getElementById('next-state');
 f.controlStates=[];let checked=f.control.checked,disabled=f.control.disabled;Object.defineProperties(f.control,{checked:{get:()=>checked,set:value=>{checked=value;f.controlStates.push({checked,disabled});}},disabled:{get:()=>disabled,set:value=>{disabled=value;f.controlStates.push({checked,disabled});}}});
 f.statusReads=()=>calls.filter(c=>c.type==='PAIA_PROMPT_NEXT_STATUS').length;
 f.configures=()=>calls.filter(c=>c.type==='PAIA_PROMPT_NEXT_CONFIGURE');
 f.change=(enabled,{trusted=true}={})=>{if(f.control.disabled||f.control.checked===enabled)return;f.control.focus();f.control.checked=enabled;return f.control.listeners.get('change')({target:f.control,isTrusted:trusted});};
 f.check=async(enabled,options)=>{await f.change(enabled,options);};
 f.settings=async enabled=>{const value=await owner.handle({type:'PAIA_PROMPT_NEXT_CONFIGURE',enabled},settingsSender);await flush();return value;};
 return f;
}

for(const notice of ['local-v2','runtime-change'])test('actual Settings revocation refreshes the existing popup through '+notice+' before a real re-enable',async()=>{
 const f=await fixture();assert.equal(f.control.checked,false);assert.equal(f.control.disabled,false);assert.equal(f.writes.length,0);
 await f.check(true);const enabled=await f.owner.authorization();assert.equal(enabled.enabled,true);assert.equal(f.control.checked,true);assert.equal(f.configures().length,1);
 f.runtimeNotices=notice!=='local-v2';f.storageNotices=notice!=='runtime-change';
 const revoked=await f.settings(false);assert.equal(revoked.enabled,false);assert.notEqual(revoked.generation,enabled.generation);assert.equal(f.control.checked,false,'the same popup reflects the original Settings revocation');assert.equal(f.control.disabled,false);assert.equal(f.configures().length,1,'passive synchronization never configures');assert.equal(f.document.activeElement,f.control,'the original control is retained');
 await f.check(true);assert.equal((await f.owner.authorization()).enabled,true);assert.equal(f.control.checked,true);assert.equal(f.configures().length,2,'re-enable must issue one trusted configure instead of a checked no-op');assert.equal(f.owner.groups.size,0,'changing preference cannot restore a retired candidate');assert.deepEqual(f.configures().map(c=>c.enabled),[true,true]);
 assert.match(html,/<input id="next-enabled"[^>]*> 开启自动建议（设置会保留）<\/label>/);assert.doesNotMatch(html,/本次浏览器会话开启/);
});

for(const outcome of ['success','failure'])test('late status '+outcome+' after actual revocation cannot overwrite the newer popup status',async()=>{
 const f=await fixture();await f.check(true);const held=deferred();let heldRead=false;
 f.readHook=async value=>{if(!heldRead){heldRead=true;await held.promise;if(outcome==='failure')throw Error('SYNTHETIC_LATE_READ_FAILURE');}return value;};
 f.runtimeChanged.emit({type:'PAIA_PROMPT_NEXT_CHANGED'});await flush();assert.equal(heldRead,true);
 await f.settings(false);assert.equal(f.control.checked,false);held.resolve();await flush();assert.equal(f.control.checked,false);assert.equal(f.control.disabled,false);assert.equal(f.configures().length,1);
});

test('late read started before a trusted popup configure cannot overwrite its ACK',async()=>{
 const f=await fixture(),held=deferred();let heldRead=false;
 f.readHook=async value=>{if(!heldRead){heldRead=true;await held.promise;}return value;};
 f.runtimeChanged.emit({type:'PAIA_PROMPT_NEXT_CHANGED'});await flush();assert.equal(heldRead,true);
 await f.check(true);assert.equal(f.control.checked,true);held.resolve();await flush();assert.equal(f.control.checked,true);assert.equal(f.configures().length,1);
});

test('notification bursts during a held popup ACK coalesce and preserve a newer Settings revoke',async()=>{
 const f=await fixture(),held=deferred();let written=false;
 f.writeHook=async(fields,write)=>{const value=await write();written=true;await held.promise;return value;};
 const pending=f.check(true);await flush();assert.equal(written,true);assert.equal(f.control.disabled,true);const reads=f.statusReads();
 await f.settings(false);for(let i=0;i<20;i++){f.storageChanged.emit({[NEXT_AUTH_KEY]:{newValue:f.stored[NEXT_AUTH_KEY]}},'local');f.runtimeChanged.emit({type:'PAIA_PROMPT_NEXT_CHANGED'});}
 await flush();assert.equal(f.statusReads(),reads,'notifications cannot fan out authority reads while saving');
 const finalRead=deferred();f.readHook=async value=>{await finalRead.promise;return value;};f.controlStates.length=0;held.resolve();await flush();const intermediate={disabled:f.control.disabled,states:[...f.controlStates]};finalRead.resolve();await pending;await flush();
 assert.equal(intermediate.disabled,true,'the original control stays disabled until the pending authoritative read settles');assert.equal(intermediate.states.some(x=>x.checked&&!x.disabled),false,'a stale enable ACK is never exposed as an actionable enabled preference');assert.equal(f.statusReads(),reads+1,'one final original-owner read settles the pending notifications');assert.equal(f.control.checked,false);assert.equal(f.control.disabled,false);assert.equal(f.configures().length,1);assert.equal((await f.owner.authorization()).enabled,false);
});

for(const outcome of ['revoked','unavailable'])test('a newer notification during the pending authority read remains non-actionable until '+outcome+' is settled',async()=>{
 const f=await fixture(),ack=deferred(),reading=deferred();let readCount=0;
 f.writeHook=async(fields,write)=>{const value=await write();await ack.promise;return value;};
 const pending=f.check(true);await flush();
 f.readHook=async value=>{if(++readCount===1){await reading.promise;}else if(outcome==='unavailable')throw Error('SYNTHETIC_FINAL_READ_UNAVAILABLE');return value;};
 f.controlStates.length=0;ack.resolve();await flush();assert.equal(readCount,1);assert.equal(f.control.disabled,true);
 await f.settings(false);assert.equal(readCount,1,'a reentrant notification queues rather than starting a competing read');reading.resolve();await pending;await flush();
 assert.equal(readCount,2);assert.equal(f.controlStates.some(x=>x.checked&&!x.disabled),false,'neither the old ACK nor the older status may become actionable');assert.equal((await f.owner.authorization()).enabled,false);assert.equal(f.configures().length,1);
 if(outcome==='unavailable'){assert.equal(f.control.disabled,true);assert.match(f.status.textContent,/无法读取/);f.readHook=null;f.runtimeChanged.emit({type:'PAIA_PROMPT_NEXT_CHANGED'});await flush();}
 assert.equal(f.control.checked,false);assert.equal(f.control.disabled,false);assert.equal(f.configures().length,1);
});

test('failed revoke with unavailable reconciliation remains unknown and disables the original control',async()=>{
 const f=await fixture();await f.check(true);f.writeHook=async()=>{f.failRead=true;throw Error('SYNTHETIC_WRITE_UNCONFIRMED');};await f.check(false);
 assert.equal(f.control.checked,true,'do not claim that the acknowledged enabled preference was revoked');assert.equal(f.control.disabled,true);assert.match(f.status.textContent,/结果无法确认/);assert.equal((await f.owner.authorization()).enabled,true);assert.equal(f.configures().length,2);await f.check(false);assert.equal(f.configures().length,2,'unknown state does not retry a write');
 f.failRead=false;f.runtimeChanged.emit({type:'PAIA_PROMPT_NEXT_CHANGED'});await flush();assert.equal(f.control.disabled,false);assert.equal(f.control.checked,true);
});

test('a lost enable ACK is reread without a replacement write or false disabled state',async()=>{
 const f=await fixture();f.writeHook=async(fields,write)=>{await write();throw Error('SYNTHETIC_ACK_LOST');};await f.check(true);assert.equal(f.control.checked,true);assert.equal(f.control.disabled,false);assert.match(f.status.textContent,/保存未获确认/);assert.equal(f.configures().length,1);assert.equal(f.writes.length,1);
});

test('legacy session notices and untrusted changes cannot configure or refresh the persistent preference',async()=>{
 const f=await fixture(),reads=f.statusReads();f.storageChanged.emit({promptNextAuthorizationV1:{newValue:{enabled:true}}},'session');f.runtimeChanged.emit({type:'OTHER'});await flush();assert.equal(f.statusReads(),reads);await f.check(true,{trusted:false});assert.equal(f.control.checked,false);assert.equal(f.configures().length,0);assert.equal(f.writes.length,0);assert.equal((await f.owner.authorization()).enabled,false);
});

for(const enabled of [true,false])test('one trusted popup change keeps the acknowledged value disabled until '+(enabled?'enable':'disable')+' is confirmed',async()=>{
 const f=await fixture();if(!enabled)await f.check(true);
 const beforeWrites=f.writes.length,beforeConfigures=f.configures().length,before=await f.owner.authorization(),sent=deferred(),ack=deferred();let accepted=false;
 f.writeHook=async(fields,write)=>{await sent.promise;const value=await write();accepted=true;await ack.promise;return value;};
 const pending=f.change(enabled);
 // The change listener's synchronous phase has returned. A native .check() /
 // .uncheck() post-click assertion would inspect this acknowledged old value,
 // rather than await this async listener's returned promise.
 assert.equal(f.control.checked,before.enabled,'an intent is not an acknowledged preference');assert.equal(f.control.disabled,true);assert.equal(f.status.textContent,'正在保存…');assert.equal(f.configures().length,beforeConfigures+1);assert.equal(f.writes.length,beforeWrites);assert.equal((await f.owner.authorization()).enabled,before.enabled);
 await f.check(enabled);assert.equal(f.configures().length,beforeConfigures+1,'disabled controls never resend the intent');
 sent.resolve();await flush();assert.equal(accepted,true);assert.equal((await f.owner.authorization()).enabled,enabled);assert.equal(f.writes.length,beforeWrites+1);assert.equal(f.control.checked,before.enabled,'a held ACK cannot claim the new value');assert.equal(f.control.disabled,true);
 ack.resolve();await pending;await flush();assert.equal(f.control.checked,enabled);assert.equal(f.control.disabled,false);assert.equal(f.configures().length,beforeConfigures+1);assert.equal(f.writes.length,beforeWrites+1);
});

for(const enabled of [true,false])test('one rejected popup '+(enabled?'enable':'disable')+' retains the original preference without a replacement write',async()=>{
 const f=await fixture();if(!enabled)await f.check(true);const before=await f.owner.authorization(),writes=f.writes.length,configures=f.configures().length,held=deferred();
 f.writeHook=async()=>{await held.promise;throw Error('SYNTHETIC_WRITE_REJECTED');};const pending=f.change(enabled);assert.equal(f.control.checked,before.enabled);assert.equal(f.control.disabled,true);held.resolve();await pending;
 assert.equal(f.control.checked,before.enabled);assert.equal(f.control.disabled,false);assert.match(f.status.textContent,/保存未获确认/);assert.deepEqual(await f.owner.authorization(),before);assert.equal(f.writes.length,writes);assert.equal(f.configures().length,configures+1);
});
