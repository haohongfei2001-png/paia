import {PROMPT_HISTORY_SCOPE} from '../core/prompt-selection.js';
import {ArchiveError} from '../core/constants.js';
import {own} from '../core/prompt-reuse-preferences.js';
import {topicRootTarget} from '../core/topic-root-target.js';
const KEY='promptSurfaceV1',site=url=>{try{return new URL(url).origin==='https://chatgpt.com';}catch{return false;}};
// The sole optional v1 field fences device-local position resets. Absence is
// legacy generation zero; unknown fields/versions are never coerced or replaced.
const generation=v=>v.positionGeneration??0;
export const validSurface=v=>own(v,['version','open','position','positionGeneration','collapsedForm'])&&v.version===1&&typeof v.open==='boolean'&&(v.collapsedForm===undefined||['orb','capsule'].includes(v.collapsedForm))&&(v.positionGeneration===undefined||Number.isSafeInteger(v.positionGeneration)&&v.positionGeneration>=0)&&(v.position===null||own(v.position,['x','y'])&&['x','y'].every(k=>Number.isFinite(v.position[k])&&v.position[k]>=0&&v.position[k]<=1));
export class PromptSurfaceCommands{
 constructor(commands,api,{openArchiveArrival=null}={}){this.openArchiveArrival=openArchiveArrival;this.commands=commands;this.api=api;this.frames=new Map();this.candidates=new Map();this.geometryQueue=Promise.resolve();}
 removeTab(tabId){this.frames.delete(tabId);this.candidates.delete(tabId);}
 async retireCandidateFrames(){
  // Admission-time, bounded metadata liveness only. A collapsed HOST can retire
  // a cache slot without the tab being removed; no durable AI receipt is touched.
  for(const [tabId,entry]of [...this.candidates]){
   const source=entry.source;let tab,contexts,host;
   try{tab=await this.api.tabs.get(tabId);contexts=await this.api.runtime.getContexts({documentIds:[source.documentId]});host=await this.api.tabs.sendMessage(tabId,{type:'PAIA_PROMPT_SURFACE_PROBE'},{frameId:0});}catch{continue;}
   const live=tab.url===source.url&&tab.windowId===source.windowId&&!tab.incognito&&!tab.discarded&&contexts.some(c=>c.documentId===source.documentId&&c.tabId===source.tabId&&c.windowId===source.windowId&&c.frameId===source.frameId&&c.documentUrl===this.api.runtime.getURL('ui/prompt-surface.html')+'#'+source.nonce&&c.incognito!==true)&&host?.open===true&&host.nonce===source.nonce&&host.url===source.url;
   if(!live&&this.candidates.get(tabId)===entry)this.candidates.delete(tabId);
  }
 }
 async isIdle(tabId){
  const host=await this.api.tabs.sendMessage(tabId,{type:'PAIA_PROMPT_SURFACE_PROBE'},{frameId:0});
  if(!host?.open)return host?.dragging!==true;
  const frame=this.frames.get(tabId);if(!frame||frame.nonce!==host.nonce||host.dragging)return false;
  try{const r=await this.api.tabs.sendMessage(tabId,{type:'PAIA_PROMPT_NEXT_ACTIVITY',nonce:frame.nonce},{frameId:frame.id});return r?.idle===true;}catch{return false;}
 }
 geometry(operation){const result=this.geometryQueue.then(operation);this.geometryQueue=result.catch(()=>{});return result;}
 async consent(){if(!(await this.commands.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');}
 async readGeometry(){
  const saved=(await this.api.storage.local.get(KEY))[KEY];
  if(saved===undefined)return {version:1,open:false,position:null};
  if(!validSurface(saved))throw new ArchiveError('INVALID_REQUEST');
  return saved;
 }
 async hostGeometry(state){
  if(state!==undefined&&!validSurface(state))throw new ArchiveError('INVALID_REQUEST');
  return this.geometry(async()=>{
   await this.consent();const saved=await this.readGeometry();await this.consent();
   if(state===undefined){const displayPreferences=await this.readDisplayPreferences();await this.consent();return {...saved,displayPreferences};}
   // No stale open/position write, including old content scripts after restart.
   if(generation(state)!==generation(saved))throw new ArchiveError('STALE_BASE');
   // Only the authenticated private form command changes the collapsed form.
   // Late legacy geometry writes cannot reset that independent preference.
   const next={...state,...(saved.collapsedForm?{collapsedForm:saved.collapsedForm}:{})};
   if(!saved.collapsedForm)delete next.collapsedForm;
   await this.api.storage.local.set({[KEY]:next});return next;
  });
 }
 async settings(r,sender){
  const api=this.api,archive=api.runtime.getURL('ui/archive.html');
  const trustedURL=sender.url===archive||typeof sender.url==='string'&&sender.url.startsWith(archive+'#')&&topicRootTarget(sender.url)!==null;
  if(sender.id!==api.runtime.id||!trustedURL||sender.tab?.incognito||(sender.frameId!==undefined&&sender.frameId!==0)||sender.documentLifecycle&&sender.documentLifecycle!=='active'||!own(r,['type']))throw new ArchiveError('FORBIDDEN');
  if(r.type==='PAIA_PROMPT_SURFACE_SETTINGS_STATUS')return this.geometry(async()=>{
   // Stored geometry availability only: no live-page, connected or AI claim.
   try{await this.consent();const saved=await this.readGeometry();await this.consent();return {status:'ready',position:saved.position===null?'default':'custom'};}
   catch(error){if(error.code==='CONSENT_REQUIRED')return {status:'consent_required'};if(error.code==='INVALID_REQUEST')return {status:'unavailable'};throw error;}
  });
  const result=await this.geometry(async()=>{
   await this.consent();const saved=await this.readGeometry();await this.consent();
   if(generation(saved)===Number.MAX_SAFE_INTEGER)throw new ArchiveError('INVALID_REQUEST');
   const next={...saved,position:null,positionGeneration:generation(saved)+1};
   // Even an already-default reset invalidates a drag not yet persisted.
   await api.storage.local.set({[KEY]:next});return {changed:saved.position!==null,positionGeneration:next.positionGeneration};
  });
  await this.notifyPositionReset(result.positionGeneration);
  return {status:'reset',changed:result.changed};
 }
 async notifyPositionReset(positionGeneration){
  // Enqueue best-effort geometry-only notifications; persistence is the receipt.
  // A discarded/unreachable host reads the durable generation on next activation.
  try{const tabs=await this.api.tabs.query({url:'https://chatgpt.com/*'});
   for(const tab of tabs.filter(t=>!t.incognito&&!t.discarded&&site(t.url)))void Promise.resolve().then(()=>this.api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_SURFACE_POSITION_RESET',positionGeneration},{frameId:0})).catch(()=>{});
  }catch{}
 }
 async handle(r,sender){
  const api=this.api,fail=()=>{throw new ArchiveError('FORBIDDEN');};
  if(['PAIA_PROMPT_SURFACE_SETTINGS_STATUS','PAIA_PROMPT_SURFACE_RESET_POSITION'].includes(r.type))return this.settings(r,sender);
  if(r.type==='PAIA_PROMPT_SURFACE_DIAGNOSTIC')return this.diagnostic(r,sender);
  if(sender.id!==api.runtime.id||!sender.tab||sender.tab.incognito)fail();
  const tab=await api.tabs.get(sender.tab.id);if(tab.incognito||!site(tab.url))fail();
  if(!(await this.commands.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
  if(r.type==='PAIA_PROMPT_SURFACE_HOST'||r.type==='PAIA_PROMPT_SURFACE_REQUEST_CLOSE'){
   const closing=r.type==='PAIA_PROMPT_SURFACE_REQUEST_CLOSE';
   if(sender.frameId!==0||!site(sender.url)||!own(r,closing?['type','nonce']:['type','state']))fail();
   if(closing&&(typeof r.nonce!=='string'||!/^[a-f0-9-]{36}$/.test(r.nonce)))fail();
   if(closing||sender.url!==tab.url){
    // Chrome can retain the document's initial sender URL after history.pushState.
    // Bind this geometry-only request to that exact still-live top document.
    if(typeof sender.documentId!=='string'||!sender.documentId||sender.documentLifecycle&&sender.documentLifecycle!=='active')fail();
    const live=await api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_SURFACE_PROBE'},{documentId:sender.documentId});
    const current=await api.tabs.get(tab.id);
    if(live?.url!==tab.url||current.url!==tab.url||current.incognito||closing&&(!live.open||live.nonce!==r.nonce))fail();
    if(!(await this.commands.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
   }
   // A nonce-only signal reaches extension documents, never the host page or another card.
   // The addressed card runs the same guard as its own Close and Escape controls.
   if(closing){await api.runtime.sendMessage({type:'PAIA_PROMPT_SURFACE_REQUEST_CLOSE',nonce:r.nonce});return {};}
   return this.hostGeometry(r.state);
  }
  if(r.type!=='PAIA_PROMPT_SURFACE_RPC'||!own(r,['type','nonce','command'])||typeof r.nonce!=='string'||!/^[a-f0-9-]{36}$/.test(r.nonce)||(!Number.isInteger(sender.frameId)||sender.frameId<=0)||sender.url!==api.runtime.getURL('ui/prompt-surface.html')+'#'+r.nonce)fail();
  // No worker-lifetime capability cache: bind every call to the actual live host.
  const host=await api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_SURFACE_PROBE'},{frameId:0});
  if(!host?.open||host.nonce!==r.nonce||host.url!==tab.url)fail();
  this.frames.set(tab.id,{id:sender.frameId,nonce:r.nonce});
  const c=r.command;if(!c||typeof c.type!=='string')fail();
  if(['suggestion_current','suggestion_result','suggestion_insert'].includes(c.type)){
   if(typeof sender.documentId!=='string'||!sender.documentId||sender.documentLifecycle&&sender.documentLifecycle!=='active')fail();
   const source={tabId:tab.id,windowId:tab.windowId,frameId:sender.frameId,nonce:r.nonce,documentId:sender.documentId,url:tab.url},context={identity:JSON.stringify(source),assertCurrent:()=>this.currentSelectionTarget(source)};
   await context.assertCurrent();
   if(c.type==='suggestion_current'){
    if(!own(c,['type'])||Object.keys(c).length!==1)fail();
    let value;try{value=await this.assist?.card({type:'assist_current'},tab,context);}catch{/* Unavailable remote service never enables remote work here. */}
    await context.assertCurrent();if(value?.result?.kind==='SUGGESTION')return {source:'assist',result:value.result};
    const local=await this.next?.card({type:'next_current'},tab,context);await context.assertCurrent();return {source:'local',result:local?.result??null};
   }
   const keys=c.type==='suggestion_result'?['type','source','id']:['type','source','id','operationId','conditionPresented'];
   if(!own(c,keys)||Object.keys(c).length!==keys.length||!['assist','local'].includes(c.source))fail();
   const {source:kind,...command}=c;command.type=(kind==='assist'?'assist_':'next_')+(c.type==='suggestion_result'?'result':'insert');
   return kind==='assist'?this.assist.card(command,tab,context):this.next.card(command,tab,context);
  }
  if(['next_available','next_reopen'].includes(c.type))return this.next.card(c,tab);
  if(['assist_status','assist_current','assist_activate','assist_result','assist_insert','assist_dismiss','assist_cancel'].includes(c.type)){
   if(typeof sender.documentId!=='string'||!sender.documentId||sender.documentLifecycle&&sender.documentLifecycle!=='active')fail();
   const source={tabId:tab.id,windowId:tab.windowId,frameId:sender.frameId,nonce:r.nonce,documentId:sender.documentId,url:tab.url};
   return this.assist.card(c,tab,{identity:JSON.stringify(source),assertCurrent:()=>this.currentSelectionTarget(source)});
  }
  if(c.type==='surface_form'){
   if(!own(c,['type','form'])||Object.keys(c).length!==2||!['orb','capsule','board'].includes(c.form))fail();
   if(c.form!=='board')await this.geometry(async()=>{await this.consent();const saved=await this.readGeometry();await this.consent();await api.storage.local.set({[KEY]:{...saved,collapsedForm:c.form}});});
   await api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_SURFACE_FORM',nonce:r.nonce,form:c.form},{frameId:0});return {form:c.form};
  }

  if(['history_candidates_status','history_candidates_refresh','history_candidates_adopt'].includes(c.type)){
   const fields=c.type==='history_candidates_refresh'?['type','query']:['type'];
   if(!own(c,fields)||Object.keys(c).length!==fields.length||typeof sender.documentId!=='string'||!sender.documentId||sender.documentLifecycle&&sender.documentLifecycle!=='active')fail();
   const source={tabId:tab.id,windowId:tab.windowId,frameId:sender.frameId,nonce:r.nonce,documentId:sender.documentId,url:tab.url},identity=JSON.stringify(source),assertCurrent=()=>this.currentSelectionTarget(source);
   await assertCurrent();
   const service=this.commands.service;
   if(c.type==='history_candidates_status'){const status=await service.historicalCandidateStatus();await assertCurrent();return status;}
   if(c.type==='history_candidates_refresh'){
    if(typeof c.query!=='string'||!c.query.trim()||c.query.length>1000)fail();
    // One original private frame per tab. A new document replaces only its own
    // cache slot; it cannot adopt the previous frame's successful result.
    await this.retireCandidateFrames();await assertCurrent();if(!this.candidates.has(tab.id)&&this.candidates.size>=8)throw new ArchiveError('RESOURCE_LIMIT');
    const handle=await service.refreshHistoricalCandidates(c.query,{identity,assertCurrent});await assertCurrent();this.candidates.set(tab.id,{identity,handle,source});return {ready:true};
   }
   const entry=this.candidates.get(tab.id);if(entry&&entry.identity!==identity){this.candidates.delete(tab.id);throw new ArchiveError('FORBIDDEN');}
   const result=await service.adoptHistoricalCandidates(entry?.handle),displayPreferences=await this.readDisplayPreferences();await assertCurrent();await service.assertCurrent(result.generation);if(result.candidateSource==='ai')await service.assertHistoricalCandidatesCurrent(entry.handle);
   return {...result,target:{url:tab.url,documentId:sender.documentId,nonce:r.nonce},displayPreferences};
  }

  // Geometry only: the already authenticated private frame supplies a finite
  // intrinsic height. The host still owns placement and verifies the nonce.
  if(c.type==='measure'){
   const hasMinimum=Object.hasOwn(c,'minimumHeight'),hasAppearance=Object.hasOwn(c,'appearance'),hasLanguage=Object.hasOwn(c,'language');
   if(hasAppearance&&!['light','dark'].includes(c.appearance)||hasLanguage&&!['zh-CN','en'].includes(c.language))fail();
   if(!own(c,['type','height',...(hasMinimum?['minimumHeight']:[]),...(hasAppearance?['appearance']:[]),...(hasLanguage?['language']:[])])||!Number.isInteger(c.height)||c.height<1||c.height>4096||hasMinimum&&(!Number.isInteger(c.minimumHeight)||c.minimumHeight<44||c.minimumHeight>1024||c.minimumHeight>c.height))fail();
   await api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_SURFACE_MEASURE',nonce:r.nonce,height:c.height,...(hasMinimum?{minimumHeight:c.minimumHeight}:{}),...(hasAppearance?{appearance:c.appearance}:{}),...(hasLanguage?{language:c.language}:{})},{frameId:0});return {};
  }
  if(c.type==='close'&&own(c,['type'])){
   this.candidates.delete(tab.id);
   const closed=await api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_SURFACE_CLOSE',nonce:r.nonce},{frameId:0});
   // The original host alone knows whether this exact frame was retained.
   // A missing/old/foreign ACK cannot authorize focus in a retiring child.
   if(!own(closed,['closed','nonce','form'])||closed.closed!==true||closed.nonce!==r.nonce||!['orb','capsule'].includes(closed.form))fail();
   return {closed:true,nonce:r.nonce,form:closed.form};
  }
  if(c.type==='history_open_paia'){
   if(!own(c,['type','query','searchSnapshot','ref','range'])||!['query','searchSnapshot','ref'].every(key=>Object.hasOwn(c,key))||typeof sender.documentId!=='string'||!sender.documentId||sender.documentLifecycle&&sender.documentLifecycle!=='active')fail();
   if(c.ref!==null)await this.commands.service.resolveSelection(c.ref,c.range??null);else if(c.range!==undefined&&c.range!==null)fail();
   const descriptor=await this.commands.service.qualifyArchiveArrival({version:1,query:c.query,scope:{...PROMPT_HISTORY_SCOPE},searchSnapshot:c.searchSnapshot,ref:c.ref});
   if(typeof this.openArchiveArrival!=='function')throw new ArchiveError('UNAVAILABLE');
   return this.openArchiveArrival(descriptor,{tabId:tab.id,windowId:tab.windowId,frameId:sender.frameId,nonce:r.nonce,documentId:sender.documentId,url:tab.url});
  }
  if(c.type==='members'&&own(c,['type','id']))return this.commands.service.members(c.id);
  if(!['PAIA_PROMPT_QUERY','PAIA_PROMPT_CHANGE','PAIA_PROMPT_CONFLICT_RESOLVE','PAIA_PROMPT_COPY_TEXT','PAIA_PROMPT_INSERT','PAIA_PROMPT_HISTORY_QUERY','PAIA_PROMPT_HISTORY_SAVE','PAIA_PROMPT_SELECTION_READ','PAIA_PROMPT_SELECTION_INSERT'].includes(c.type))fail();
  if(c.type==='PAIA_PROMPT_INSERT'||c.type==='PAIA_PROMPT_SELECTION_INSERT'){
   if(!own(c,c.type==='PAIA_PROMPT_INSERT'?['type','id','text','operationId']:['type','ref','range','operationId','target','activationKey']))fail();
   if(Object.hasOwn(c,'activationKey')&&!['Enter',' '].includes(c.activationKey))fail();
   if(c.type==='PAIA_PROMPT_SELECTION_INSERT'){const target=c.target;if(typeof sender.documentId!=='string'||!sender.documentId||sender.documentLifecycle&&sender.documentLifecycle!=='active'||!target||!own(target,['url','documentId','nonce'])||Object.keys(target).length!==3||target.url!==tab.url||target.documentId!==sender.documentId||target.nonce!==r.nonce)fail();const source={tabId:tab.id,windowId:tab.windowId,frameId:sender.frameId,nonce:r.nonce,documentId:sender.documentId,url:tab.url};return this.commands.dispatch({type:c.type,ref:c.ref,range:c.range,operationId:c.operationId,tabId:tab.id,url:tab.url,...(c.activationKey?{activationKey:c.activationKey}:{})},{assertTarget:()=>this.currentSelectionTarget(source),targetIdentity:source});}
   return this.commands.dispatch({...c,tabId:tab.id,url:tab.url});
  }
  const reading=['PAIA_PROMPT_SELECTION_READ','PAIA_PROMPT_HISTORY_QUERY','PAIA_PROMPT_QUERY'].includes(c.type);
  const readSource=reading?{tabId:tab.id,windowId:tab.windowId,frameId:sender.frameId,nonce:r.nonce,documentId:sender.documentId,url:tab.url}:null;
  if(reading)await this.currentReadTarget(readSource);
  const result=await this.commands.dispatch(c);
  // An original read can yield while the iframe/chat is replaced or consent is
  // revoked. Do not deliver its body to the formerly valid private surface.
  if(reading){
   await this.currentReadTarget(readSource);
   // The asynchronous host check can outlive a real Working edit. Re-read the
   // original domain owner before delivering the already-read body.
   if(c.type==='PAIA_PROMPT_SELECTION_READ')await this.commands.service.assertSelectionCurrent(result);
   else if(c.type==='PAIA_PROMPT_QUERY'){await this.commands.service.assertCurrent(result.generation);if(result.manualConflict?.state==='available')await this.commands.service.assertManualConflictCurrent(result.manualConflict.token);}
   else if(result.searchSnapshot&&!result.changed)await this.commands.service.assertCurrent(result.searchSnapshot.generation);
  }
  if(['PAIA_PROMPT_CHANGE','PAIA_PROMPT_HISTORY_SAVE','PAIA_PROMPT_CONFLICT_RESOLVE'].includes(c.type))void api.runtime.sendMessage({type:'PAIA_PROMPT_CHANGED'}).catch(()=>{});
  if(['PAIA_PROMPT_SELECTION_READ','PAIA_PROMPT_HISTORY_QUERY'].includes(c.type)){if(typeof sender.documentId!=='string'||!sender.documentId)fail();return {...result,target:{url:tab.url,documentId:sender.documentId,nonce:r.nonce}};}
  if(c.type==='PAIA_PROMPT_COPY_TEXT'&&typeof sender.documentId==='string'&&sender.documentId)return {...result,target:{url:tab.url,documentId:sender.documentId,nonce:r.nonce}};
  if(c.type!=='PAIA_PROMPT_QUERY')return result;
  // Read only the two bounded display choices through the existing owner. No
  // settings body, control capability or alternate persistence is exposed.
  const displayPreferences=await this.readDisplayPreferences();
  await this.currentReadTarget(readSource);await this.commands.service.assertCurrent(result.generation);if(result.manualConflict?.state==='available')await this.commands.service.assertManualConflictCurrent(result.manualConflict.token);
  return {...result,target:{url:tab.url,documentId:sender.documentId,nonce:r.nonce},theme:host.dark?'dark':'light',displayPreferences,surfaceForm:host.expanded===false?'capsule':'board',automaticSuggestion:host.automaticSuggestion===true};
 }
 async currentReadTarget(source){
  const fail=()=>{throw new ArchiveError('FORBIDDEN');},api=this.api;
  if(typeof source.documentId!=='string'||!source.documentId)fail();
  const current=await api.tabs.get(source.tabId);
  if(current.incognito||current.discarded||current.windowId!==source.windowId||current.url!==source.url)fail();
  if(typeof api.runtime.getContexts!=='function')throw new ArchiveError('UNAVAILABLE');
  const contexts=await api.runtime.getContexts({documentIds:[source.documentId]});
  if(!contexts.some(c=>c.documentId===source.documentId&&c.tabId===source.tabId&&c.windowId===source.windowId&&c.frameId===source.frameId&&c.documentUrl===api.runtime.getURL('ui/prompt-surface.html')+'#'+source.nonce&&c.incognito!==true))fail();
  const host=await api.tabs.sendMessage(source.tabId,{type:'PAIA_PROMPT_SURFACE_PROBE'},{frameId:0});
  if(!host?.open||host.nonce!==source.nonce||host.url!==source.url)fail();
  const latest=await api.tabs.get(source.tabId);
  if(latest.incognito||latest.discarded||latest.windowId!==source.windowId||latest.url!==source.url)fail();
  await this.consent();
 }
 async currentSelectionTarget(source){
  const fail=()=>{throw new ArchiveError('FORBIDDEN');},api=this.api;
  const current=await api.tabs.get(source.tabId);
  if(current.incognito||current.discarded||current.active!==true||current.windowId!==source.windowId||current.url!==source.url)fail();
  if(typeof api.windows?.get!=='function'||typeof api.runtime.getContexts!=='function')throw new ArchiveError('UNAVAILABLE');
  const window=await api.windows.get(source.windowId);if(window.focused!==true||window.incognito===true)fail();
  const contexts=await api.runtime.getContexts({documentIds:[source.documentId]});
  if(!contexts.some(c=>c.documentId===source.documentId&&c.tabId===source.tabId&&c.windowId===source.windowId&&c.frameId===source.frameId&&c.documentUrl===api.runtime.getURL('ui/prompt-surface.html')+'#'+source.nonce&&c.incognito!==true))fail();
  const host=await api.tabs.sendMessage(source.tabId,{type:'PAIA_PROMPT_SURFACE_PROBE'},{frameId:0});
  if(!host?.open||host.nonce!==source.nonce||host.url!==source.url)fail();
  await this.consent();
  const latest=await api.tabs.get(source.tabId);if(latest.incognito||latest.discarded||latest.active!==true||latest.windowId!==source.windowId||latest.url!==source.url)fail();
  const focused=await api.windows.get(source.windowId);if(focused.focused!==true||focused.incognito===true)fail();
 }
 async readDisplayPreferences(){
  const store=this.commands.service.s;return await store.run(()=>store.repository.transaction(false,async t=>{
   const {preferences}=await store.control(t);
   return {appearance:['light','dark','system'].includes(preferences.appearance)?preferences.appearance:'system',language:['zh-CN','en','system'].includes(preferences.language)?preferences.language:'system'};
  },['meta']));
 }
 async diagnostic(r,sender){
  const api=this.api;
  if(sender.id!==api.runtime.id||sender.tab||sender.url!==api.runtime.getURL('ui/popup.html')||!own(r,['type']))throw new ArchiveError('FORBIDDEN');
  if(!(await this.commands.service.s.status()).consented)return {status:'consent_required'};
  const tabs=await api.tabs.query({active:true,lastFocusedWindow:true});
  if(tabs.length!==1||tabs[0].incognito||!site(tabs[0].url))return {status:'not_chatgpt'};
  const tab=tabs[0];let timer;
  try{
   const result=await Promise.race([api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_SURFACE_DIAGNOSTIC_PROBE',url:tab.url},{frameId:0}),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),1200);})]);
   const current=await api.tabs.get(tab.id);
   if(!current.active||current.incognito||current.url!==tab.url)return {status:'page_unavailable'};
   if(!(await this.commands.service.s.status()).consented)return {status:'consent_required'};
   return {status:['visible','composer_unrecognized','composer_ambiguous','layout_unavailable','surface_unavailable'].includes(result?.status)?result.status:'page_unavailable'};
  }catch{return {status:'page_unavailable'};}finally{clearTimeout(timer);}
 }

}
