import {ArchiveError} from '../core/constants.js';
import {own} from '../core/prompt-reuse-preferences.js';
import {detectNextAction} from '../core/next-action-detector.js';
export const NEXT_AUTH_KEY='promptNextAuthorizationV1';
const uuid=x=>typeof x==='string'&&/^[a-f0-9-]{36}$/.test(x);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const site=url=>{try{return new URL(url).origin==='https://chatgpt.com';}catch{return false;}};
const supported=url=>{try{const u=new URL(url);return u.origin==='https://chatgpt.com'&&/^\/(?:g\/[^/]+\/)?c\/[a-zA-Z0-9_-]+\/?$/.test(u.pathname);}catch{return false;}};
const validBinding=b=>own(b,['url','conversation','cycle','replyId','revision'])&&supported(b.url)&&b.conversation===new URL(b.url).pathname&&Number.isSafeInteger(b.cycle)&&b.cycle>0&&Number.isSafeInteger(b.revision)&&b.revision>=0&&typeof b.replyId==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(b.replyId);
const fail=()=>{throw new ArchiveError('FORBIDDEN');};
export class NextPromptCommands{
 constructor(service,api,surface){this.service=service;this.api=api;this.surface=surface;this.instance=crypto.randomUUID();this.groups=new Map();this.serial=0;this.changing=false;this.tail=Promise.resolve();this.offers=new Map();}
 async authorization(){
  const serial=this.serial;
  const stored=(await this.api.storage.session.get(NEXT_AUTH_KEY))[NEXT_AUTH_KEY];
  const consented=(await this.service.s.status()).consented;
  return {enabled:!this.changing&&serial===this.serial&&consented&&stored?.enabled===true&&uuid(stored.generation),generation:(stored?.generation||'off')+':'+this.instance+':'+this.serial};
 }
 async configure(enabled){
  // Synchronous invalidation precedes IO, including concurrent enable/revoke.
  const ticket=++this.serial;this.changing=true;this.groups.clear();this.offers.clear();
  const write=async()=>{
   await this.api.storage.session.set({[NEXT_AUTH_KEY]:{enabled,generation:crypto.randomUUID()}});
   if(ticket===this.serial)this.changing=false;
   const tabs=await this.api.tabs.query({url:'https://chatgpt.com/*'});
   await Promise.allSettled(tabs.filter(t=>!t.incognito).map(t=>this.api.tabs.sendMessage(t.id,{type:'PAIA_PROMPT_NEXT_AUTH_CHANGED'},{frameId:0})));
   void this.api.runtime.sendMessage({type:'PAIA_PROMPT_NEXT_CHANGED'}).catch(()=>{});
   return this.authorization();
  };
  const result=this.tail.then(write);this.tail=result.catch(()=>{});return result;
 }
 removeTab(id){this.groups.delete(id);this.offers.delete(id);}
 async top(sender){
  if(sender.id!==this.api.runtime.id||!sender.tab||sender.tab.incognito||sender.frameId!==0||typeof sender.documentId!=='string'||!sender.documentId||sender.documentLifecycle&&sender.documentLifecycle!=='active')fail();
  if(!site(sender.url))fail();
  const tab=await this.api.tabs.get(sender.tab.id);if(tab.incognito||!supported(tab.url))fail();return tab;
 }
 async probe(tab,documentId){return this.api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_NEXT_PROBE'},{documentId});}
 async assertCurrent(group){
  const auth=await this.authorization();if(!auth.enabled||auth.generation!==group.authorization||this.groups.get(group.tabId)!==group)fail();
  const tab=await this.api.tabs.get(group.tabId);if(tab.incognito||tab.url!==group.binding.url)fail();
  const live=await this.probe(tab,group.documentId);
  if(live?.authorization!==auth.generation||!same(live.binding,group.binding))fail();
  const final=await this.authorization();if(!final.enabled||final.generation!==auth.generation||this.groups.get(group.tabId)!==group)fail();
  return {tab,live};
 }
 async handle(r,sender){
  const api=this.api,popup=sender.id===api.runtime.id&&!sender.tab&&sender.url===api.runtime.getURL('ui/popup.html');
  if(r.type==='PAIA_PROMPT_NEXT_CONFIGURE'){
   if(!popup||!own(r,['type','enabled'])||typeof r.enabled!=='boolean')fail();
   if(r.enabled&&!(await this.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
   return this.configure(r.enabled);
  }
  if(r.type==='PAIA_PROMPT_NEXT_STATUS'){
   if(!own(r,['type']))fail();if(!popup)await this.top(sender);return this.authorization();
  }
  if(r.type==='PAIA_PROMPT_NEXT_INVALIDATE'){
   if(!own(r,['type','id'])||!uuid(r.id))fail();await this.top(sender);const g=this.groups.get(sender.tab.id);if(g?.documentId===sender.documentId&&g.id===r.id)this.groups.delete(sender.tab.id);return {};
  }
  if(r.type==='PAIA_PROMPT_NEXT_OFFER'){
   if(!own(r,['type','binding','authorization','snapshot'])||!validBinding(r.binding)||!own(r.snapshot,['completed','text','blocks','excluded']))fail();
   const tab=await this.top(sender),auth=await this.authorization();
   const attempt=crypto.randomUUID();this.offers.set(tab.id,attempt);
   if(!auth.enabled||auth.generation!==r.authorization||tab.url!==r.binding.url)fail();
   const live=await this.probe(tab,sender.documentId);
   if(live?.authorization!==auth.generation||!same(live.binding,r.binding))fail();
   const result=detectNextAction(r.snapshot); // snapshot is never assigned to a retained field.
   const final=await this.authorization();if(!final.enabled||final.generation!==auth.generation||this.offers.get(tab.id)!==attempt)fail();
   const latest=await this.probe(tab,sender.documentId);if(!same(latest?.binding,r.binding)||latest?.authorization!==auth.generation||this.offers.get(tab.id)!==attempt)fail();
   this.groups.delete(tab.id);
   if(result.type==='DEFER')return {available:false,reason:result.reason};
   if(this.groups.size>=100)return {available:false,reason:'RESOURCE_LIMIT'};
   const group={id:crypto.randomUUID(),tabId:tab.id,documentId:sender.documentId,binding:r.binding,authorization:auth.generation,type:result.type,condition:result.condition,evidence:result.evidence,choices:result.choices.map((text,i)=>({id:crypto.randomUUID(),text,label:result.labels?.[i]||text})),attempted:new Set(),outcomes:new Map()};
   this.groups.set(tab.id,group);
   try{await this.assertCurrent(group);}catch(error){if(this.groups.get(tab.id)===group)this.groups.delete(tab.id);throw error;}
   void api.runtime.sendMessage({type:'PAIA_PROMPT_NEXT_CHANGED'}).catch(()=>{});
   return {available:true,id:group.id};
  }
  if(r.type==='PAIA_PROMPT_NEXT_PRESENT'){
   if(!own(r,['type','id']))fail();const tab=await this.top(sender),g=this.groups.get(tab.id);if(g?.id!==r.id||g.documentId!==sender.documentId)fail();
   const {live}=await this.assertCurrent(g);return {safe:live.idle===true&&await this.surface.isIdle(tab.id)};
  }
  // Extension frame only: same resource, distinct nonce and independently bound host.
  if(r.type!=='PAIA_PROMPT_NEXT_RPC'||!own(r,['type','nonce','command'])||!uuid(r.nonce)||sender.id!==api.runtime.id||!sender.tab||sender.tab.incognito||!Number.isInteger(sender.frameId)||sender.frameId<=0||sender.url!==api.runtime.getURL('ui/prompt-surface.html')+'#next-'+r.nonce)fail();
  const g=this.groups.get(sender.tab.id);if(!g)fail();const {tab,live}=await this.assertCurrent(g);
  if(live.nonce!==r.nonce)fail();
  const c=r.command;
  if(c?.type==='get'&&own(c,['type']))return {id:g.id,type:g.type,condition:g.condition,choices:g.choices.map(x=>({...x,attempted:g.attempted.has(x.id)})),dark:live.dark};
  if(c?.type==='hide'&&own(c,['type'])){await api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_NEXT_HIDE',nonce:r.nonce},{documentId:g.documentId});return {};}
  if(c?.type==='resize'&&own(c,['type','height'])&&Number.isFinite(c.height)&&c.height>=44&&c.height<=400){await api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_NEXT_RESIZE',nonce:r.nonce,height:c.height},{documentId:g.documentId});return {};}
  if(c?.type==='copy'&&own(c,['type','id'])){const choice=g.choices.find(x=>x.id===c.id);if(!choice||!['failed','uncertain'].includes(g.outcomes.get(choice.id)))fail();return {text:choice.text};}
  if(c?.type!=='insert'||!own(c,['type','id','operationId'])||!uuid(c.operationId))fail();
  const choice=g.choices.find(x=>x.id===c.id);if(!choice||g.attempted.has(choice.id))fail();
  g.attempted.add(choice.id);
  let timer,result;
  try{
   await this.assertCurrent(g);
   result=await Promise.race([api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_NEXT_INSERT',id:g.id,text:choice.text,operationId:c.operationId,binding:g.binding,authorization:g.authorization},{documentId:g.documentId}),new Promise(resolve=>{timer=setTimeout(()=>resolve({status:'uncertain'}),2000);})]);
  }catch{result={status:'uncertain'};}finally{clearTimeout(timer);}
  const status=result?.status==='inserted'&&result.verified===true?'inserted':result?.status==='failed'?'failed':'uncertain';g.outcomes.set(choice.id,status);return {status,verified:status==='inserted'};
 }
 async card(command,tab){
  if(command?.type==='next_available'&&own(command,['type'])){
   const g=this.groups.get(tab.id);if(!g)return {available:false};try{await this.assertCurrent(g);return {available:true};}catch{if(this.groups.get(tab.id)===g)this.groups.delete(tab.id);return {available:false};}
  }
  if(command?.type==='next_reopen'&&own(command,['type'])){
   const g=this.groups.get(tab.id);if(!g)fail();await this.assertCurrent(g);
   if(!await this.surface.isIdle(tab.id))fail();
   return this.api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_NEXT_REOPEN',id:g.id},{documentId:g.documentId});
  }
  fail();
 }
}
