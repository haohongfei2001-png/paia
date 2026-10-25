// Fresh browser-context, in-memory API fixture. No installed extension/profile.
(()=>{
 const config=globalThis.__PAIA_VISUAL_CONFIG,base=config.base;
 const event=()=>{const listeners=new Set();return {addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn),hasListener:fn=>listeners.has(fn),listeners};};
 const changed=event(),messages=event();
 const clone=value=>value===undefined?undefined:structuredClone(value);
 const area=()=>{const values={};return {
  async get(keys){if(keys==null)return clone(values);if(typeof keys==='string')return {[keys]:clone(values[keys])};if(Array.isArray(keys))return Object.fromEntries(keys.map(k=>[k,clone(values[k])]));return {...clone(keys),...Object.fromEntries(Object.keys(keys).filter(k=>k in values).map(k=>[k,clone(values[k])]))};},
  async set(data){const delta={};for(const [key,value]of Object.entries(data)){delta[key]={oldValue:clone(values[key]),newValue:clone(value)};values[key]=clone(value);}for(const fn of changed.listeners)fn(delta,'local');},
  async remove(keys){for(const key of Array.isArray(keys)?keys:[keys])delete values[key];},
  async clear(){for(const key of Object.keys(values))delete values[key];},async getBytesInUse(){return new TextEncoder().encode(JSON.stringify(values)).length;},async setAccessLevel(){}
 };};
 const emit=(message,sender={id:'paia-synthetic-visual',url:base+'/ui/archive.html'})=>new Promise(resolve=>{
  let replied=false,pending=false;const reply=value=>{if(!replied){replied=true;resolve(value);}};
  for(const listener of messages.listeners){const result=listener(clone(message),sender,reply);if(result===true)pending=true;else if(result&&typeof result.then==='function'){pending=true;result.then(reply,error=>reply({ok:false,error:String(error)}));}}
  if(!pending&&!replied)resolve(undefined);else if(pending)setTimeout(()=>reply(undefined),1500);
 });
 globalThis.__paiaVisualEmit=emit;
 globalThis.chrome={runtime:{id:'paia-synthetic-visual',getURL:path=>base+'/'+String(path).replace(/^\//,''),getManifest:()=>({version:config.version}),onMessage:messages,onConnect:event(),onInstalled:event(),onStartup:event(),onUpdateAvailable:event(),lastError:null,
  async sendMessage(message){const root=window===window.top?window:window.top;if(typeof root.__paiaVisualRPC!=='function')throw Error('VISUAL_RPC_NOT_READY');return root.__paiaVisualRPC(message);},
  connect({name}={}){const onMessage=event(),onDisconnect=event();return {name,onMessage,onDisconnect,postMessage(){},disconnect(){for(const fn of onDisconnect.listeners)fn();}};}
 },storage:{local:area(),session:area(),onChanged:changed},tabs:{async query(){return [];},async sendMessage(){return undefined;},async create(){throw Error('VISUAL_EXTERNAL_TAB_REFUSED');},onRemoved:event(),onUpdated:event(),onActivated:event()},windows:{onRemoved:event()},action:{onClicked:event()},alarms:{onAlarm:event(),async get(){return null;},async create(){},async clear(){return true;}}};
})();
