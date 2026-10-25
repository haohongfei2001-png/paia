import {randomUUID,createHash} from 'node:crypto';
import {cp,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
// Node-only preparation. Loading a normal browser test does not load pg/service
// fixtures; explicit staging creates this bounded, offline signed service.
const ORIGIN='https://service.invalid',TYPE='PAIA_TEST_ASSIST_SERVICE_V1';
const PATHS=new Set(['/api/declarations','/api/reservations','/api/provider','/api/results','/api/operation-status']);
const exact=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).length===keys.length&&keys.every(k=>Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)??{},'value'));
const fail=()=>{throw Error('ASSIST_NATIVE_BRIDGE_REFUSED');};
const json=value=>{let text;try{text=JSON.stringify(value);}catch{fail();}if(typeof text!=='string'||Buffer.byteLength(text)>1048576)fail();return JSON.parse(text);};
function requestData(value){
 if(!exact(value,['url','method','headers','body'])||value.method!=='POST'||typeof value.body!=='string'||Buffer.byteLength(value.body)>262144||!Array.isArray(value.headers)||value.headers.length!==1)fail();
 const header=value.headers[0];if(!Array.isArray(header)||header.length!==2||header[0].toLowerCase()!=='content-type'||header[1]!=='application/json')fail();
 let u;try{u=new URL(value.url);}catch{fail();}if(u.origin!==ORIGIN||u.username||u.password||u.port||u.search||u.hash||!PATHS.has(u.pathname)||u.href!==value.url)fail();
 return new Request(value.url,{method:value.method,headers:value.headers,body:value.body});
}
export async function createAssistNativeService(t,{variant,...options}={}){
 if(!['source','release'].includes(variant))fail();
 const {assistSignedServiceFixture}=await import('../../../services/ai-gateway/tests/assist-signed-service-fixture.mjs');
 const signed=await assistSignedServiceFixture(t,options),nonce=randomUUID(),pending=new Set();let live=true;
 const descriptor=Object.freeze(json({version:1,type:TYPE,nonce,variant,origin:ORIGIN,manifest:signed.manifest,profile:signed.profile,routeVersion:signed.routeVersion,now:signed.clock()}));
 const requireSigned=()=>{if(!signed.isCurrentTokenizer())throw Object.assign(Error('ASSIST_NATIVE_SERVICE_REVOKED'),{code:'ASSIST_NATIVE_SERVICE_REVOKED'});};
 const validate=message=>{requireSigned();if(!live||!exact(message,['type','nonce','variant','operation','value'])||message.type!==TYPE||message.nonce!==nonce||message.variant!==variant||!['profile','tokenize','proofs','request'].includes(message.operation))fail();return json(message);};
 const handle=message=>{
  const request=validate(message);
  const task=(async()=>{
   let result;
   if(request.operation==='profile'){if(request.value!==null)fail();result=await signed.readProfile();}
   else if(request.operation==='tokenize'){if(!request.value||typeof request.value!=='object'||Array.isArray(request.value))fail();result=await signed.tokenize(request.value);}
   else if(request.operation==='proofs'){if(!request.value||typeof request.value!=='object'||Array.isArray(request.value))fail();result=await signed.readProofs(request.value);}
   else {const response=await signed.fetch(requestData(request.value));result={status:response.status,headers:[...response.headers],body:await response.text()};}
   requireSigned();if(!live)fail();return json(result);
  })();pending.add(task);void task.then(()=>pending.delete(task),()=>pending.delete(task));return task;
 };
 const dispatch=async message=>{try{return {ok:true,value:await handle(message)};}catch(error){return {ok:false,reason:error?.code==='ASSIST_NATIVE_SERVICE_REVOKED'?'revoked':'unavailable'};}};
 return Object.freeze({descriptor,handle,dispatch,dispose(){live=false;},pending:()=>pending.size,physical:signed.physical,payload:signed.payload,calls:signed.calls});
}
// Serializable archive relay. The caller provides only the birth descriptor
// and a private Node binding name; no content or arbitrary endpoint forwarding.
export function installAssistNativeServiceRelay({descriptor,binding}){
 const runtime=chrome.runtime,send=runtime.sendMessage,messages=runtime.onMessage,add=messages.addListener,remove=messages.removeListener,forward=globalThis[binding],id=runtime.id,workerURL=runtime.getURL('background/service-worker.js');
 if(typeof forward!=='function'||descriptor?.version!==1||descriptor?.type!=='PAIA_TEST_ASSIST_SERVICE_V1'||!['source','release'].includes(descriptor.variant))throw Error('ASSIST_NATIVE_RELAY_REFUSED');
 let live=true;
 const current=()=>live&&chrome.runtime===runtime&&runtime.id===id&&runtime.sendMessage===send&&runtime.onMessage===messages&&messages.addListener===add&&messages.removeListener===remove&&globalThis[binding]===forward;
 const listener=(message,sender,reply)=>{
  if(message?.type!==descriptor.type)return;
  if(!current()||sender?.id!==id||sender.tab||sender.url!==workerURL||message.nonce!==descriptor.nonce||message.variant!==descriptor.variant){reply({ok:false});return;}
  Promise.resolve().then(()=>forward(message)).then(value=>reply(current()&&value?.ok===true?{ok:true,value:value.value}:current()&&value?.ok===false&&value.reason==='revoked'?{ok:false,reason:'revoked'}:{ok:false}),()=>reply({ok:false}));return true;
 };
 add.call(messages,listener);
 const owner={dispose(){if(!live)return;live=false;remove.call(messages,listener);}};globalThis['__paiaAssistRelay'+descriptor.nonce]=owner;return owner;
}
export function assistNativeConfigurationSource(descriptor){
 const d=json(descriptor);if(d.version!==1||d.type!==TYPE||d.origin!==ORIGIN||!['source','release'].includes(d.variant))fail();
 return `// GENERATED TEST-ONLY; never ship this configured leaf.\nconst d=${JSON.stringify(d)},runtime=chrome.runtime,send=runtime.sendMessage,id=runtime.id;\nlet live=true;const listeners=new Set();\nconst current=()=>live&&chrome.runtime===runtime&&runtime.sendMessage===send&&runtime.id===id;\nconst call=async(operation,value)=>{if(!current())throw Error('ASSIST_NATIVE_BRIDGE_REFUSED');const r=await send.call(runtime,{type:d.type,nonce:d.nonce,variant:d.variant,operation,value});if(r?.ok===false&&r.reason==='revoked'){live=false;for(const listener of listeners){try{listener();}catch{}}}if(!current()||r?.ok!==true)throw Error('ASSIST_NATIVE_BRIDGE_REFUSED');return r.value;};\nconst configuration={origin:d.origin,profile:d.profile,routeVersion:d.routeVersion,clock:()=>d.now,resolveAuthority:async(_t,r)=>({allowed:current(),principalId:'SYNTHETIC-principal',libraryId:'SYNTHETIC-library',consentEpoch:'SYNTHETIC-consent',jobTypes:['AI_ASSIST'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}}),contextSelector:()=>[],onInvalidate:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},readProfile:()=>call('profile',null),currentProfile:()=>current()?structuredClone(d.manifest):null,tokenize:q=>call('tokenize',q),isCurrentTokenizer:()=>current(),readProofs:q=>call('proofs',q),fetch:async request=>{const value=await call('request',{url:request.url,method:request.method,headers:[...request.headers],body:await request.clone().text()});return new Response(value.body,{status:value.status,headers:value.headers});}};\nexport function readAssistServiceConfiguration(){return configuration;}\n`;
}

export function assistNativeWorkerObservationSource(nonce){
 if(typeof nonce!=='string'||!/^[a-f0-9-]{36}$/.test(nonce))fail();
 return `
// TEST-ONLY read projection: no setter, action issuer or command dispatch.
(()=>{const handles=new WeakMap();let serial=0,birth=null;const check=()=>{if(!promptAssist||!store||!promptInsertionReceipts)throw Error('ASSIST_NATIVE_OBSERVATION_NOT_READY');if(!birth)birth={assist:promptAssist,session:promptAssist.session,store,repository:store.repository,database:store.repository.db,receipts:promptInsertionReceipts};if(promptAssist!==birth.assist||promptAssist.session!==birth.session||store!==birth.store||store.repository!==birth.repository||store.repository.db!==birth.database||promptInsertionReceipts!==birth.receipts)throw Error('ASSIST_NATIVE_OBSERVATION_STALE');};Object.defineProperty(globalThis,'__paiaAssistObserve_${nonce.replaceAll('-','')}',{value:async()=>{check();const entries=[...promptAssist.activations.values()].map(state=>{let handleId=null;if(state.handle){if(!handles.has(state.handle))handles.set(state.handle,++serial);handleId=handles.get(state.handle);}return {handleId,finished:state.finished,resultId:state.resultId,stopped:state.stopped};}),rows=await store.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all([...tx.tx.objectStoreNames].map(async name=>[name,await tx.all(name)]))));check();return {entries,rows,native:indexedDB instanceof IDBFactory};},writable:false,configurable:false});})();
`;
}
export async function stageAssistNativeService(extensionPath,service){
 const directory=await mkdtemp(join(tmpdir(),'paia-assist-receipt-stage-')),workerPath='background/service-worker.js',leafPath='core/ai-usage/assist-service-configuration.js';
 try{
  await cp(extensionPath,directory,{recursive:true,filter:path=>!['work','node_modules','.git'].includes(path.split('/').at(-1))});
  const worker=await readFile(join(extensionPath,workerPath)),leaf=await readFile(join(extensionPath,leafPath)),configured=Buffer.from(assistNativeConfigurationSource(service.descriptor)),observed=Buffer.concat([worker,Buffer.from(assistNativeWorkerObservationSource(service.descriptor.nonce))]);
  await writeFile(join(directory,leafPath),configured);await writeFile(join(directory,workerPath),observed);
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const vector={variant:service.descriptor.variant,original:{[workerPath]:hash(worker),[leafPath]:hash(leaf)},staged:{[workerPath]:hash(observed),[leafPath]:hash(configured)},workerPrefixPreserved:observed.subarray(0,worker.length).equals(worker)};
  await writeFile(join(directory,'ASSIST-TEST-STAGE.json'),JSON.stringify(vector,null,2)+'\n');
  return {directory,vector,async close(){await rm(directory,{recursive:true,force:true});}};
 }catch(error){await rm(directory,{recursive:true,force:true});throw error;}
}
export async function mountAssistNativeService(archive,service){
 const binding='__paiaAssistService'+service.descriptor.nonce.replaceAll('-','');await archive.exposeFunction(binding,message=>service.dispatch(message));
 await archive.evaluate(installAssistNativeServiceRelay,{descriptor:service.descriptor,binding});
 return {async close(){service.dispose();await archive.evaluate(key=>{globalThis[key]?.dispose();delete globalThis[key];},'__paiaAssistRelay'+service.descriptor.nonce).catch(()=>{});}};
}
