import {withSettingsControlFocus} from './settings-local-state.js';
import {highlightText} from './search-experience.js';
import {searchExcerpt} from '../core/search-service.js';
import {request,element,dateLabel} from './common.js';
const $=id=>document.getElementById(id);
export class SmartFilterUI {
 constructor({onError,onContext}){
  this.onError=onError;this.onContext=onContext;this.noticeChecked=false;this.recentCursor=null;this.serial=0;this.protectedInputs=new Set();
  this.mode=null;this.modeBusy=false;this.modeRead=0;this.modeRefresh=false;
  $('smart-filter-toggle').addEventListener('click',()=>void withSettingsControlFocus($('smart-filter-toggle'),()=>this.changeMode(this.mode==='light'?'off':'light')));
  document.addEventListener('paia:preferences-applied',()=>this.paintMode());
  $('document-page').addEventListener('input',e=>{const field=e.target.closest?.('.library-prose[data-edit-id]');if(field)void this.protectUserEdit(field.dataset.editId);});

  $('filter-recent-query').addEventListener('input',()=>void this.recent(false));
  $('filter-recent-open').addEventListener('click',()=>void this.recent(false));
  $('filter-recent-more').addEventListener('click',()=>void this.recent(true));
  $('filter-recent-close').addEventListener('click',()=>{$('filter-recent-dialog').close();$('filter-recent-list').replaceChildren();this.serial++;this.lastRestore=false;$('filter-recent-query').value='';});
 }
 paintMode(){const control=$('smart-filter-toggle');if(!control)return;const en=document.documentElement.lang==='en';control.disabled=this.mode===null||this.modeBusy;control.setAttribute('aria-checked',String(this.mode==='light'));control.dataset.on=String(this.mode==='light');control.setAttribute('aria-label',en?'Smart filter':'智能过滤');control.textContent=this.mode===null?(en?'Loading':'读取中'):this.mode==='light'?(en?'On':'开'):(en?'Off':'关');}
 async changeMode(mode){if(this.modeBusy||this.mode===null||!['light','off'].includes(mode))return;this.modeBusy=true;++this.modeRead;this.paintMode();$('filter-processing').textContent='正在保存…';try{await request('FILTER_MODE',{mode});const status=await request('FILTER_STATUS');if(!['light','off'].includes(status?.mode))throw Error('FILTER_STATUS_UNKNOWN');this.mode=status.mode;$('filter-processing').textContent=document.documentElement.lang==='en'?'Saved':'已保存';}catch{try{const status=await request('FILTER_STATUS');if(['light','off'].includes(status?.mode))this.mode=status.mode;}catch{}$('filter-processing').textContent=document.documentElement.lang==='en'?'Save not confirmed. Please retry.':'保存未获确认，请重试。';}finally{this.modeBusy=false;this.paintMode();if(this.modeRefresh){this.modeRefresh=false;void this.settings();}}}
 async protectUserEdit(id){if(this.protectedInputs.has(id))return;this.protectedInputs.add(id);try{await request('FILTER_PROTECT',{id});}catch{this.protectedInputs.delete(id);this.onError('编辑保留保护尚未保存，请重试。');}}
 async settings(){if(this.modeBusy){this.modeRefresh=true;return;}const read=++this.modeRead;try{const status=await request('FILTER_STATUS');if(read!==this.modeRead)return;if(!['light','off'].includes(status?.mode))throw Error('FILTER_STATUS_UNKNOWN');this.mode=status.mode;this.paintMode();}catch{if(read!==this.modeRead)return;this.paintMode();$('filter-processing').textContent=document.documentElement.lang==='en'?'Could not read smart filter.':'无法读取智能过滤设置。';}}
 async recover(){const button=$('filter-recover');button.disabled=true;try{await request('FILTER_RECOVER');}catch{this.onError('历史输入检查暂未恢复，请稍后重试。');}finally{button.disabled=false;}}
 async home(eligible){
  if(!eligible){$('filter-onboarding').hidden=true;return;}
  if(this.noticeChecked)return;this.noticeChecked=true;
  try{const r=await request('FILTER_NOTICE');if(r.show&&!$('collection-panel').hidden){$('filter-onboarding').textContent='已启用轻度智能过滤。仅隐藏高度确定的对话操作输入，内容未删除，可在设置中调整。';$('filter-onboarding').hidden=false;setTimeout(()=>{$('filter-onboarding').hidden=true;},12000);}}catch{/* Optional notice never blocks reading. */}
 }
 renderResults(result,query=''){const list=$('document-list');list.replaceChildren();$('result-count').textContent=`${result.items.length} 条匹配输入`;
  for(const hit of result.items){const b=element('button','conversation-document search-input');b.dataset.inputId=hit.id;b.append(element('strong','',hit.title||'独立整理文档'),element('span','search-excerpt',hit.text),element('small','',hit.sourceSentAt?dateLabel(hit.sourceSentAt):'发送时间未知'));highlightText(b.querySelector('strong'),hit.title||'独立整理文档',query);const excerpt=searchExcerpt(hit.text,query,240);highlightText(b.querySelector('.search-excerpt'),excerpt,query);if(hit.filtered)b.append(element('small','filter-search-label','智能过滤内容'));b.addEventListener('click',()=>void this.onContext(hit.documentId,hit.id));list.append(b);}
  $('empty-list').textContent='没有找到匹配内容。试试聊天标题或另一种表达。';$('empty-list').hidden=result.items.length>0;$('empty-sync').hidden=true;
 }
 async recent(more=false){const serial=++this.serial;try{
  const [status,result]=await Promise.all([request('FILTER_STATUS'),request('FILTER_RECENT',{options:{cursor:more?this.recentCursor:null,limit:50,query:$('filter-recent-query').value}})]);if(serial!==this.serial)return;
  this.recentCursor=result.nextCursor;const list=$('filter-recent-list');if(!more)list.replaceChildren();$('filter-recent-state').textContent=this.lastRestore?'已恢复，今后不会自动过滤此条。':status.mode==='off'?'过滤已关闭，以下内容当前可见。':'恢复后，今后不会自动过滤该输入。';
  for(const item of result.items){const row=element('section','filter-recent-row');row.dataset.inputId=item.id;row.append(element('pre','',item.text),element('p','muted',`来自：${item.title||'独立整理文档'} · ${item.sourceSentAt?dateLabel(item.sourceSentAt):'发送时间未知'}`),element('p','muted',item.reason));const restore=element('button','','恢复到 Input Archive');restore.addEventListener('click',async()=>{restore.disabled=true;try{await request('FILTER_KEEP',{id:item.id});this.lastRestore=true;$('filter-recent-state').textContent='已恢复，今后不会自动过滤此条。';row.replaceChildren(element('p','muted','已恢复，今后不会自动过滤此条。'));}catch{restore.disabled=false;this.onError('恢复未完成，请重试。');}});row.append(restore);list.append(row);}
  if(!list.children.length&&this.recentCursor){await this.recent(true);return;}if(!list.children.length)list.append(element('p','muted',$('filter-recent-query').value.trim()?'没有匹配的过滤内容。':'目前没有被轻度智能过滤的内容。'));$('filter-recent-more').hidden=!this.recentCursor;if(!$('filter-recent-dialog').open)$('filter-recent-dialog').showModal();
 }catch{this.onError('无法读取最近过滤的内容。');}}
 changed(){if($('filter-recent-dialog').open){$('filter-recent-list').replaceChildren();void this.recent(false);}}
}
