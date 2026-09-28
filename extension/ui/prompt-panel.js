// Human Prompt workspace. Explicit local commands and manual copy only.
import {request,element} from './common.js';
import {copyReadingText} from './reading-actions.js';
const labels={
 PROMPT_STALE:'内容已更新。请重新读取后再操作；当前编辑保留。',
 PROMPT_UNAVAILABLE:'这项内容已不可用。当前编辑保留。',
 PROMPT_LIMIT:'完整内容超出当前处理范围，未显示部分结果。',
 PROMPT_INVALID:'内容无效，未保存。请检查正文后再试。',
 MESSAGE_CHANNEL_INTERRUPTED:'保存结果尚未确认。当前内容保留，请刷新已保存模板后核对。',
 UNAVAILABLE:'结果尚未确认。当前内容保留，请刷新已保存模板后核对。',
 CONSENT_REQUIRED:'请先同意本机归档，再使用 Prompts。',
};
const button=(id,text,act)=>{const b=element('button','',text);b.type='button';b.id=id;b.addEventListener('click',()=>void act());return b;};
export class PromptPanel {
 constructor({onInput=async()=>false,onSource=async()=>null}={}){
  this.onInput=onInput;this.onSource=onSource;this.selected=null;this.createId=null;this.busy=false;this.mode='saved';this.offset=0;this.serial=0;
  this.dialog=element('dialog','prompt-dialog');this.dialog.id='prompt-dialog';
  this.dialog.setAttribute('aria-labelledby','prompt-title');
  const head=element('header'),title=element('h2','','Prompts');title.id='prompt-title';
  this.closeButton=button('prompt-close','关闭',()=>this.close());head.append(title,this.closeButton);
  const help=element('p','muted','保存可复用的表达，手动复制到需要的地方。');
  const tabs=element('nav');tabs.setAttribute('aria-label','Prompt 来源');
  this.saved=button('prompt-saved','已保存',()=>this.switch('saved'));
  this.archive=button('prompt-candidates','来自 Input Archive',()=>this.switch('candidates'));
  this.fixed=button('prompt-new','新建固定模板',()=>this.createDraft());
  tabs.append(this.saved,this.archive,this.fixed);
  const search=element('label','','查找 Prompt');
  this.query=element('input');this.query.id='prompt-query';this.query.type='search';this.query.maxLength=1000;
  search.append(this.query);
  this.refresh=button('prompt-refresh','查找 / 刷新',async()=>{this.offset=0;await this.load();});
  this.feedback=element('p','muted');this.feedback.id='prompt-status';this.feedback.setAttribute('role','status');this.feedback.setAttribute('aria-live','polite');
  this.list=element('div','prompt-list');this.list.id='prompt-list';
  const pager=element('div','prompt-pagination');
  this.previous=button('prompt-previous','上一页',async()=>{this.offset=Math.max(0,this.offset-25);await this.load();});
  this.next=button('prompt-next','下一页',async()=>{this.offset=this.nextOffset;await this.load();});
  pager.append(this.previous,this.next);
  this.edit=element('section','prompt-editor');this.edit.hidden=true;
  const bodyLabel=element('label','','完整正文');this.body=element('textarea');this.body.id='prompt-body';this.body.rows=12;bodyLabel.append(this.body);
  const pinLabel=element('label','','置顶');this.pin=element('input');this.pin.id='prompt-pinned';this.pin.type='checkbox';pinLabel.prepend(this.pin);
  this.save=button('prompt-save','保存模板',()=>this.saveCurrent());
  this.copy=button('prompt-copy','复制完整正文',()=>this.copyCurrent());
  this.remove=button('prompt-remove','移除模板',()=>this.removeCurrent());
  this.trace=element('div','prompt-trace');this.trace.id='prompt-trace';
  this.edit.append(bodyLabel,pinLabel,this.save,this.copy,this.remove,this.trace);
  this.dialog.append(head,help,tabs,search,this.refresh,this.feedback,this.list,pager,this.edit);
  document.body.append(this.dialog);
  this.dialog.addEventListener('cancel',e=>{e.preventDefault();void this.close();});
  this.dialog.addEventListener('close',()=>{if(this.dialog.open)return;this.clearClosedContent();if(this.trigger?.isConnected)this.trigger.focus({preventScroll:true});});
  window.addEventListener('beforeunload',e=>{if(this.dirty()){e.preventDefault();e.returnValue='';}});
 }
 dirty(){return !!this.selected&&!this.body.readOnly&&(this.body.value!==this.selected.text||this.pin.checked!==this.selected.pinned);}
 discard(){return !this.dirty()||window.confirm('放弃尚未保存的 Prompt 编辑？');}
 say(text){this.feedback.textContent=text;}
 fail(error){this.say(labels[error?.code]||'操作未完成，当前内容保留。请重试。');}
 controls(){
  for(const b of [this.saved,this.archive,this.fixed,this.refresh,this.previous,this.next,this.save,this.copy,this.remove,this.closeButton])b.disabled=this.busy;
  for(const b of this.list.querySelectorAll('.prompt-choose'))b.disabled=this.busy;
  for(const b of this.trace.querySelectorAll('.prompt-source-open,.prompt-record-open,#prompt-trace-more'))b.disabled=this.busy||b.dataset.unavailable==='true';
  this.body.disabled=this.busy;this.pin.disabled=this.busy||this.body.readOnly;
  this.copy.hidden=!this.selected||this.selected.kind!=='template';this.remove.hidden=this.copy.hidden;
  this.previous.hidden=this.offset===0;this.next.hidden=this.nextOffset===null||this.nextOffset===undefined;
 }
 clearEditor(){this.selected=null;this.createId=null;this.body.value='';this.pin.checked=true;this.trace.replaceChildren();this.edit.hidden=true;}
 async open(trigger){
  if(this.busy||this.dialog.open)return;this.trigger=trigger;this.mode='saved';this.offset=0;this.query.value='';
  this.clearEditor();this.dialog.showModal();await this.load();
 }
 clearClosedContent(){this.serial++;this.clearEditor();this.list.replaceChildren();this.query.value='';}
 closeDialog(){
  // Native focus restoration can precede the queued close event. Clear private
  // DOM synchronously on every owned close path, with the event as a fallback.
  this.clearClosedContent();this.dialog.close();
 }
 async close(){if(this.busy||!this.discard())return false;this.closeDialog();return true;}
 async switch(mode){if(this.busy||!this.discard())return;this.clearEditor();this.mode=mode;this.offset=0;await this.load();}
 async load(){
  if(this.busy||!this.dialog.open)return;const serial=++this.serial;this.busy=true;this.controls();this.say('正在读取本机内容…');
  try{
   const page=await request(this.mode==='saved'?'PAIA_PROMPT_PAGE':'PAIA_PROMPT_CANDIDATES',{options:{query:this.query.value,offset:this.offset,limit:25}});
   if(!this.dialog.open||serial!==this.serial)return;
   if(this.mode==='candidates'&&page.complete!==true)throw {code:'PROMPT_UNAVAILABLE'};
   this.list.replaceChildren();this.nextOffset=page.nextOffset;
   this.saved.setAttribute('aria-pressed',String(this.mode==='saved'));this.archive.setAttribute('aria-pressed',String(this.mode==='candidates'));
   for(const item of page.items){
    const row=element('article','prompt-row'),preview=element('pre','prompt-preview',item.text);
    const meta=element('p','muted',item.kind==='candidate'?'相关 Input：'+item.frequency:item.pinned?'置顶模板':'模板');
    const choose=button('',item.kind==='candidate'?'查看候选':'编辑模板',()=>this.choose(item));choose.className='prompt-choose';choose.dataset.promptId=item.id;
    row.append(meta,preview,choose);this.list.append(row);
   }
   this.say(page.total?'共 '+page.total+' 项 · 当前 '+(page.offset+1)+'–'+(page.offset+page.items.length):'还没有符合条件的 Prompt。');
  }catch(error){if(serial===this.serial){this.list.replaceChildren();this.nextOffset=null;this.fail(error);}}
  finally{if(serial===this.serial){this.busy=false;this.controls();}}
 }
 async choose(item){
  if(this.busy||!this.discard())return;this.busy=true;this.controls();this.say('正在读取完整 Prompt…');
  try{
   const current=item.kind==='template'?await request('PAIA_PROMPT_READ',{id:item.id,expectedRevision:item.revision}):item;
   this.show(current);await this.showTrace();this.say(current.kind==='candidate'?'候选正文完整保留。先保存模板，再编辑或复制。':'可编辑、置顶或手动复制此模板。');
  }catch(error){this.fail(error);}
  finally{this.busy=false;this.controls();}
 }
 show(current){
  // One explicit create identity survives a lost response and a manual retry.
  // The existing store refuses duplicate IDs; no automatic command replay.
  this.createId=current.kind==='candidate'?crypto.randomUUID():current.kind==='new'?current.id:null;
  this.selected=current;this.body.value=current.text;this.body.readOnly=current.kind==='candidate';
  this.pin.checked=current.pinned??true;this.edit.hidden=false;this.trace.replaceChildren();
 }
 createDraft(){
  if(this.busy||!this.discard())return;
  this.show({kind:'new',id:crypto.randomUUID(),text:'',pinned:true,sourceRefs:[]});
  this.body.readOnly=false;this.controls();this.say('输入固定模板正文，再由你保存。');this.body.focus();
 }
 async saveCurrent(){
  if(this.busy||!this.selected)return;this.busy=true;this.controls();const current=this.selected;
  try{
   const saved=current.kind==='template'?await request('PAIA_PROMPT_EDIT',{id:current.id,change:{expectedRevision:current.revision,text:this.body.value,pinned:this.pin.checked}}):
    await request('PAIA_PROMPT_CREATE',{template:{id:this.createId,text:this.body.value,pinned:this.pin.checked,sourceRefs:current.sourceRefs}});
   this.show(saved);await this.showTrace();this.say('模板已保存。Input 原文保留。');
  }catch(error){this.fail(error);}
  finally{this.busy=false;this.controls();}
 }
 async copyCurrent(){
  if(this.busy||this.selected?.kind!=='template')return;
  if(this.dirty()){this.say('请先保存当前编辑，再复制完整正文。');return;}
  this.busy=true;this.controls();
  try{
   const current=await request('PAIA_PROMPT_READ',{id:this.selected.id,expectedRevision:this.selected.revision});
   const copied=await copyReadingText(current.text);this.say(copied?'完整正文已复制。':'请在复制窗口选择完整正文，再使用系统复制。');
  }catch(error){this.fail(error);}
  finally{this.busy=false;this.controls();}
 }
 async removeCurrent(){
  if(this.busy||this.selected?.kind!=='template'||!window.confirm('移除此模板？相关 Input 原文会保留。'))return;
  this.busy=true;this.controls();
  try{await request('PAIA_PROMPT_REMOVE',{id:this.selected.id,change:{expectedRevision:this.selected.revision}});this.clearEditor();this.say('模板已移除。Input 原文保留。');}
  catch(error){this.fail(error);}
  finally{this.busy=false;this.controls();}
 }
 async showTrace(){
  const current=this.selected;if(!current)return;this.trace.replaceChildren();
  const refs=current.kind==='template'?(await request('PAIA_PROMPT_TRACE',{id:current.id})).sourceRefs:current.sourceRefs;
  this.trace.append(element('h3','','来源关联'),element('p','muted',refs.length?'完整关联：'+refs.length+' 项':'固定模板，没有关联 Input。'));
  let offset=0;const rows=element('div');const more=button('prompt-trace-more','更多来源关联',()=>paint());
  const paint=()=>{
   for(const ref of refs.slice(offset,offset+25)){
    const row=element('div','prompt-source'),available=current.kind==='template'&&ref.status==='CURRENT';
    row.append(element('span','muted',ref.status==='VERSION_CHANGED'?'Input 已更新':ref.status==='UNAVAILABLE'?'Input 已不可用':'关联 Input'));
    const open=button('','查看 Input',()=>this.openInput(current,ref));open.className='prompt-source-open';open.dataset.unavailable=String(!available);open.disabled=this.busy||!available;
    const original=button('','查看当时原文',()=>this.openSource(current,ref));original.className='prompt-record-open';
    const sourceAvailable=current.kind==='template'&&ref.status!=='UNAVAILABLE';original.dataset.unavailable=String(!sourceAvailable);original.disabled=this.busy||!sourceAvailable;
    row.append(open,original);rows.append(row);
   }
   offset+=25;more.hidden=offset>=refs.length;
  };
  this.trace.append(rows,more);paint();
 }
 async openSource(current,ref){
  if(this.busy||current.kind!=='template'||!this.discard())return;this.busy=true;this.controls();
  try{
   // Saved template revision and exact historical Source association both stay
   // authoritative. Source body/navigation belong to the existing Archive UI.
   await request('PAIA_PROMPT_READ',{id:current.id,expectedRevision:current.revision});
   const trace=await request('PAIA_PROMPT_TRACE',{id:current.id});
   if(trace.revision!==current.revision||!trace.sourceRefs.some(r=>r.id===ref.id&&r.sourceId===ref.sourceId&&r.revision===ref.revision&&r.status!=='UNAVAILABLE'))throw {code:'PROMPT_STALE'};
   const show=await this.onSource(ref);
   if(typeof show!=='function')throw {code:'PROMPT_UNAVAILABLE'};
   this.closeDialog();show();
  }catch(error){this.fail(error);}
  finally{this.busy=false;this.controls();}
 }
 async openInput(current,ref){
  if(this.busy||current.kind!=='template'||!this.discard())return;this.busy=true;this.controls();
  try{
   const trace=await request('PAIA_PROMPT_TRACE',{id:current.id});
   if(trace.revision!==current.revision||!trace.sourceRefs.some(r=>r.id===ref.id&&r.sourceId===ref.sourceId&&r.revision===ref.revision&&r.status==='CURRENT'))throw {code:'PROMPT_STALE'};
   if(await this.onInput(ref.id)){this.closeDialog();}
  }catch(error){this.fail(error);}
  finally{this.busy=false;this.controls();}
 }
}
