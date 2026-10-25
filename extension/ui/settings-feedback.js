import {FEEDBACK_DRAFT_OWNER,validFeedbackDraft} from '../core/recovery-draft.js';
import {copyReadingText} from './reading-actions.js';
const failure=code=>Object.assign(new Error(code),{code});
// The original recovery RPC/fence is the only persistence owner. No archive or
// diagnostic content is read, copied, attached, or placed in an outgoing URL.
export class SettingsFeedbackSession{
 constructor({send,changed=()=>{},uuid=()=>crypto.randomUUID()}){this.send=send;this.changed=changed;this.uuid=uuid;this.body='';this.savedBody='';this.token=null;this.epoch=null;this.loaded=false;this.consented=false;this.composing=false;this.saving=null;this.pending=null;this.state='loading';this.generation=0;}
 dirty(){return this.pending!==null||this.body!==this.savedBody;}
 collect(){}
 invalidate(){this.generation++;this.state='invalidated';this.changed();}
 edit(body){this.body=body;this.changed();}
 async validate(){
  if(!this.loaded)return this.load();
  try{const status=await this.send('GET_STATUS');if(status.consented!==this.consented)throw failure('INVALID_REQUEST');if(this.consented){const page=await this.send('GET_PAGE',{page:{view:'settings',limit:1}});if(page.recoveryEpoch!==this.epoch)throw failure('INVALID_REQUEST');}return true;}catch{this.state='invalidated';this.changed();return false;}
 }
 async load(){
  if(this.loaded||this.saving)return this.loaded;const generation=++this.generation;this.state='loading';this.changed();
  try{const status=await this.send('GET_STATUS');if(generation!==this.generation)return false;
   this.consented=status.consented===true;
   if(!this.consented){this.loaded=true;this.state='session';this.changed();return true;}
   const page=await this.send('GET_PAGE',{page:{view:'settings',limit:1}});if(generation!==this.generation)return false;
   if(typeof page.recoveryEpoch!=='string')throw failure('INVALID_REQUEST');this.epoch=page.recoveryEpoch;
   const row=await this.send('PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:'settings_feedback',ownerId:FEEDBACK_DRAFT_OWNER,epoch:this.epoch}});if(generation!==this.generation)return false;
   if(row&&!validFeedbackDraft(row))throw failure('INVALID_REQUEST');
   this.token=row?.token??null;this.body=this.savedBody=row?.operation.body??'';this.loaded=true;this.state=row?'saved':'ready';
  }catch{if(generation===this.generation)this.state='read-error';}
  this.changed();return this.loaded;
 }
 flush(){
  if(this.saving)return this.saving;if(!this.loaded||this.composing)return Promise.resolve(false);
  if(!this.consented){this.state='session';this.changed();return Promise.resolve(true);}
  this.saving=this.persist().finally(()=>{this.saving=null;this.changed();});return this.saving;
 }
 async persist(){
  if(this.state==='conflict'||this.state==='invalidated')return false;
  while(this.pending||this.dirty()){
   if(this.composing)return false;
   const draft=this.pending??{kind:'settings_feedback',ownerId:FEEDBACK_DRAFT_OWNER,token:this.uuid(),epoch:this.epoch,sourceRecordIds:[],operation:{type:'SETTINGS_FEEDBACK_DRAFT',body:this.body,expectedToken:this.token}};
   const generation=this.generation;this.pending=draft;this.state='saving';this.changed();
   try{const row=await this.send('PAIA_RECOVERY_DRAFT_SAVE',{draft});
    if(generation!==this.generation)return false;
    if(!validFeedbackDraft(row)||row.token!==draft.token||row.epoch!==draft.epoch||row.operation.body!==draft.operation.body)throw failure('UNCONFIRMED');
    this.token=row.token;this.savedBody=row.operation.body;this.pending=null;this.state='saved';
   }catch(error){if(generation!==this.generation)return false;this.state=error?.code==='CONFLICT'?'conflict':['INVALID_REQUEST','CONSENT_REQUIRED'].includes(error?.code)?'invalidated':'save-error';this.changed();return false;}
  }
  return true;
 }
}
const messages={
 loading:['正在读取反馈草稿…','Reading feedback draft…'],ready:['正文仅保留在本机，不会自动发送。','Text stays on this device and is never sent automatically.'],saved:['反馈草稿已保存在本机。尚未发送。','Feedback draft saved locally. Nothing has been sent.'],session:['尚未同意本地保存。文字仅保留在当前页面；关闭浏览器前请复制。','Local saving has not been consented to. Text stays only in this page; copy it before closing the browser.'],saving:['正在保存本地草稿…','Saving local draft…'],
 'read-error':['无法读取草稿。请重试，未覆盖已有内容。','Could not read the draft. Retry; existing text was not overwritten.'],'save-error':['保存未获确认，文字仍保留。请重试或复制。','Saving was not confirmed. Text is retained; retry or copy it.'],conflict:['另一窗口已修改草稿。当前文字仍保留，请复制；不会覆盖另一份草稿。','Another window changed the draft. Your text is retained; copy it. The other draft will not be overwritten.'],invalidated:['本地保存状态已变化。当前文字仍保留，请复制；未写入新的恢复版本。','Local saving state changed. Your text is retained; copy it. Nothing was written to a new recovery version.'],composing:['请先完成当前输入。文字仍保留。','Finish the current composition. Text is retained.'],copied:['已复制当前正文，尚未发送。','Current text copied. Nothing has been sent.'],'copy-error':['未能复制。请选中正文，使用系统复制。','Could not copy. Select the text and use system copy.']};
export function mountSettingsFeedback(host,{send,language=()=>document.documentElement.lang,control}={}){
 const node=(tag,id)=>{const el=document.createElement(tag);if(id)el.id=id;return el;},dialog=node('dialog','settings-feedback-dialog'),header=node('header'),title=node('h2','settings-feedback-title'),field=node('textarea','settings-feedback-body'),label=node('label'),note=node('p','settings-feedback-status'),actions=node('div'),close=node('button','settings-feedback-close'),retry=node('button','settings-feedback-retry'),copy=node('button','settings-feedback-copy'),mail=node('a','settings-feedback-mail');
 dialog.className='ux-settings-detail-dialog';dialog.setAttribute('aria-labelledby',title.id);field.setAttribute('aria-describedby',note.id);label.htmlFor=field.id;note.setAttribute('role','status');actions.className='ux-settings-consent-actions';for(const b of [close,retry,copy])b.type='button';mail.href='mailto:haohongfei2001@gmail.com';header.append(title,close);actions.append(retry,copy,mail);dialog.append(header,label,field,note,actions);host.append(dialog);
 let outcome=null,closing=false,copiedBody=null,opening=0,copyRequest=0,activeCopyObservation=null;
 const session=new SettingsFeedbackSession({send,changed:()=>{outcome=null;sync();}});
 function sync(){const zh=language()==='zh-CN',text=(a,b)=>zh?a:b;title.textContent=text('反馈','Feedback');label.textContent=text('反馈正文','Feedback text');close.textContent=text('关闭','Close');copy.textContent=text('复制正文','Copy text');retry.textContent=text('重试','Retry');mail.textContent=text('打开邮件应用','Open email app');field.disabled=!session.loaded;copy.disabled=!session.loaded||session.composing;retry.hidden=!['read-error','save-error'].includes(session.state);retry.disabled=!!session.saving||session.composing;const message=messages[outcome||session.state]||messages.ready;note.textContent=message[zh?0:1];}
 field.addEventListener('input',()=>{outcome=null;session.edit(field.value);if(!session.composing)void session.flush();});field.addEventListener('compositionstart',()=>{++copyRequest;activeCopyObservation?.();session.composing=true;outcome=null;sync();});field.addEventListener('compositionend',()=>{session.composing=false;session.edit(field.value);void session.flush();});field.addEventListener('blur',()=>{if(!session.composing)void session.flush();});
 retry.addEventListener('click',async()=>{outcome=null;if(!session.loaded){if(await session.load())field.value=session.body;}else await session.flush();sync();});
 copy.addEventListener('click',async()=>{
  if(session.composing||!dialog.open)return;
  const value=field.value,generation=opening,ticket=++copyRequest;session.edit(value);
  const focused=document.activeElement,start=field.selectionStart,end=field.selectionEnd,direction=field.selectionDirection;
  activeCopyObservation?.();
  let newerIntent=false;const changed=()=>{newerIntent=true;},events=['focusin','selectionchange','pointerdown','keydown','input'];
  // Track intervening intent, including away-and-back changes, only while this
  // original clipboard attempt is pending. Copy's initiating click is already past.
  for(const type of events)document.addEventListener?.(type,changed,true);
  let observing=true;const retire=()=>{if(!observing)return;observing=false;for(const type of events)document.removeEventListener?.(type,changed,true);if(activeCopyObservation===retire)activeCopyObservation=null;};activeCopyObservation=retire;
  let ok;try{ok=await copyReadingText(value,{fallback:false});}
  finally{retire();}
  if(generation!==opening||ticket!==copyRequest||!dialog.open)return;
  if(ok)copiedBody=value;
  if(field.value===value){outcome=ok?'copied':'copy-error';sync();
   if(!ok&&!newerIntent&&document.activeElement===focused&&field.selectionStart===start&&field.selectionEnd===end&&field.selectionDirection===direction){field.focus();field.select();}
  }
 });
 async function leave(){if(closing)return false;if(!dialog.open)return true;if(!session.loaded&&!session.body){opening++;session.generation++;activeCopyObservation?.();dialog.close();return true;}if(session.composing){outcome='composing';sync();return false;}closing=true;try{session.edit(field.value);if(!await session.flush()&&copiedBody!==session.body)return false;opening++;activeCopyObservation?.();dialog.close();return true;}finally{closing=false;}}
 mail.addEventListener('click',event=>{if(!event.isTrusted)event.preventDefault();});
 const runtime=globalThis.chrome?.runtime,storage=globalThis.chrome?.storage;
 runtime?.onMessage?.addListener(message=>{if(session.generation>0&&message?.type==='ARCHIVE_CHANGED'&&['PAIA_BACKUP_RESTORE','CONSENT'].includes(message.cause))session.invalidate();});
 storage?.onChanged?.addListener((changes,area)=>{if(area!=='local'||!session.loaded)return;const change=changes['paia-recovery-draft:v1:settings_feedback:'+FEEDBACK_DRAFT_OWNER];if(change){const token=change.newValue?.token;if(token!==session.pending?.token&&token!==session.token)session.invalidate();}});
 dialog.addEventListener('close',()=>{if(!dialog.open)activeCopyObservation?.();});
 close.addEventListener('click',()=>void leave());for(const type of ['cancel','paia:request-close'])dialog.addEventListener(type,event=>{event.preventDefault();void leave();});
 return {dialog,session,sync,leave,async show(){if(dialog.open)return;const generation=++opening;activeCopyObservation?.();outcome=null;dialog.showModal();sync();await session.validate();if(generation!==opening||!dialog.open)return;field.value=session.body;if(dialog.open&&session.loaded)field.focus();sync();},control};
}
