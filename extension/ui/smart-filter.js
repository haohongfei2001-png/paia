import {withSettingsControlFocus} from './settings-local-state.js';
import {highlightText} from './search-experience.js';
import {searchExcerpt,normalizeSearch} from '../core/search-service.js';
import {request,element,dateLabel} from './common.js';
const $=id=>document.getElementById(id);
export class SmartFilterUI {
 constructor({onError,onContext}){
  this.onError=onError;this.onContext=onContext;this.noticeChecked=false;this.recentCursor=null;this.serial=0;this.protectedInputs=new Set();
  this.aiState=null;this.aiRead=0;this.aiBusy=false;this.aiConfirmation=null;this.installAIFilterDetails();
  this.mode=null;this.modeBusy=false;this.modeRead=0;this.modeRefresh=false;
  $('smart-filter-toggle').addEventListener('click',()=>void withSettingsControlFocus($('smart-filter-toggle'),()=>this.changeMode(this.mode==='light'?'off':'light')));
  document.addEventListener('paia:preferences-applied',()=>{this.paintMode();this.paintAIFilter();});
  $('document-page').addEventListener('input',e=>{const field=e.target.closest?.('.library-prose[data-edit-id]');if(field)void this.protectUserEdit(field.dataset.editId);});

  $('filter-recent-query').addEventListener('input',()=>void this.recent(false));
  $('filter-recent-open').addEventListener('click',()=>void this.recent(false));
  $('filter-recent-more').addEventListener('click',()=>void this.recent(true));
  $('filter-recent-close').addEventListener('click',()=>{$('filter-recent-dialog').close();$('filter-recent-list').replaceChildren();this.serial++;this.lastRestore=false;$('filter-recent-query').value='';this.aiConfirmation=null;this.paintAIFilter();});
 }
 installAIFilterDetails(){
  const section=element('section','filter-ai-permission');section.id='filter-ai-permission';section.setAttribute('aria-labelledby','filter-ai-title');
  const title=element('h3');title.id='filter-ai-title';const description=element('p','muted');description.id='filter-ai-description';section.append(title,description);
  for(const kind of ['optIn','remoteProcessing']){const row=element('div','ux-setting-row'),copy=element('span','ux-setting-copy'),label=element('span','ux-setting-name'),button=element('button','ux-setting-switch');label.id='filter-ai-label-'+kind;copy.append(label);button.id='filter-ai-'+kind;button.type='button';button.setAttribute('role','switch');button.setAttribute('aria-labelledby',label.id);button.addEventListener('click',()=>void this.changeAIFilter(kind));row.append(copy,button);section.append(row);}
  const state=element('p','muted');state.id='filter-ai-state';state.setAttribute('role','status');section.append(state);
  const confirmation=element('div','filter-ai-confirmation');confirmation.id='filter-ai-confirmation';confirmation.hidden=true;const explanation=element('p');explanation.id='filter-ai-confirmation-copy';const cancel=element('button'),confirm=element('button');cancel.type=confirm.type='button';cancel.id='filter-ai-cancel';confirm.id='filter-ai-confirm';cancel.addEventListener('click',()=>{this.aiConfirmation=null;this.paintAIFilter();$('filter-ai-remoteProcessing').focus();});confirm.addEventListener('click',()=>void this.saveAIFilter(this.aiConfirmation));confirmation.append(explanation,cancel,confirm);section.append(confirmation);
  $('filter-recent-dialog').insertBefore(section,$('filter-recent-query'));this.paintAIFilter();
 }
 paintAIFilter(){
  if(!$('filter-ai-title'))return;const en=document.documentElement.lang==='en',copy=(zh,english)=>en?english:zh;
  $('filter-ai-title').textContent=copy('Pro AI 过滤','Pro AI filtering');$('filter-ai-description').textContent=copy('仅复核轻度过滤无法确定的输入。原文保留，恢复或编辑后不会再自动隐藏。以下许可仅用于本次浏览器会话。','Review only Inputs that light filtering cannot decide. Originals are kept; restored or edited Inputs stay visible. These permissions last only for this browser session.');
  $('filter-ai-label-optIn').textContent=copy('允许 Pro AI 过滤','Allow Pro AI filtering');$('filter-ai-label-remoteProcessing').textContent=copy('允许远程处理所选输入','Allow remote processing of selected Inputs');
  for(const kind of ['optIn','remoteProcessing']){const b=$('filter-ai-'+kind),on=this.aiState?.[kind]===true;b.disabled=!this.aiState||this.aiBusy;b.setAttribute('aria-checked',String(on));b.dataset.on=String(on);b.textContent=on?copy('开','On'):copy('关','Off');}
  const messages={off:copy('AI 过滤已关闭。轻度过滤保持原设置。','AI filtering is off. Your light-filter setting is unchanged.'),awaiting_permission:copy('已允许 AI 过滤；远程处理尚未允许。','AI filtering is allowed; remote processing is still off.'),awaiting_qualification:copy('本次浏览器会话已允许远程处理，等待服务确认 Pro 资格和当前处理授权。','Remote processing allowed for this browser session. Waiting for verified Pro eligibility and current processing authorization.'),available:copy('本次已获验证的处理范围可用。权限或资格失效时恢复可见。','Available for the current verified processing scope. Inputs become visible if permission or eligibility expires.')};
  $('filter-ai-state').textContent=this.aiBusy?copy('正在保存…','Saving…'):this.aiError?copy('保存或读取未获确认，请重试。','Save or read not confirmed. Please retry.'):messages[this.aiState?.phase]||copy('正在读取 AI 过滤权限…','Reading AI-filter permission…');
  $('filter-ai-confirmation').hidden=!this.aiConfirmation;$('filter-ai-confirmation-copy').textContent=copy('远程服务将处理本次独立授权的候选输入及最多两条已授权的邻近输入。不会读取助手回复，也不会因升级自动开启。是否允许？','The remote service may process independently authorized candidate Inputs and at most two authorized nearby Inputs. Assistant replies are excluded. Upgrading does not turn this on. Allow remote processing?');$('filter-ai-cancel').textContent=copy('暂不允许','Not now');$('filter-ai-confirm').textContent=copy('允许远程处理','Allow remote processing');$('filter-ai-confirm').disabled=this.aiBusy;
 }
 async readAIFilter(){const serial=++this.aiRead;try{const state=await request('PAIA_AI_FILTER_STATUS');if(serial!==this.aiRead||this.aiBusy)return;if(!state||typeof state.optIn!=='boolean'||typeof state.remoteProcessing!=='boolean'||typeof state.generation!=='string'||!['off','awaiting_permission','awaiting_qualification','available'].includes(state.phase))throw Error('FILTER_PERMISSION_UNKNOWN');this.aiState=state;this.aiError=false;}catch{if(serial!==this.aiRead)return;this.aiState=null;this.aiError=true;}this.paintAIFilter();}
 async changeAIFilter(kind){if(this.aiBusy||!this.aiState)return;const next={optIn:this.aiState.optIn,remoteProcessing:this.aiState.remoteProcessing,[kind]:!this.aiState[kind],expectedGeneration:this.aiState.generation};if(kind==='remoteProcessing'&&next.remoteProcessing){this.aiConfirmation=next;this.paintAIFilter();$('filter-ai-cancel').focus();return;}await this.saveAIFilter(next);}
 async saveAIFilter(next){if(!next||this.aiBusy)return;let failed=false;this.aiBusy=true;this.aiError=false;++this.aiRead;this.paintAIFilter();try{await request('PAIA_AI_FILTER_CONFIGURE',{...next,confirmed:true});this.aiConfirmation=null;}catch{failed=true;this.aiError=true;}finally{this.aiBusy=false;await this.readAIFilter();if(failed){this.aiError=true;this.paintAIFilter();}}}
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
 renderResults(result,query=''){
  const list=$('document-list'),en=document.documentElement.lang==='en',copy=(zh,english)=>en?english:zh;
  list.replaceChildren();$('result-count').textContent=copy(`本页 ${result.items.length} 条匹配输入`,`This page: ${result.items.length} matching Inputs`);
  for(const hit of result.items){
   const button=element('button','conversation-document search-input'),excerpt=element('span','search-excerpt');
   button.type='button';button.dataset.inputId=hit.id;
   highlightText(excerpt,searchExcerpt(hit.text,query,240),query);button.append(excerpt);
   // Only facts already supplied by the search owner become attribution. In
   // particular a missing Project path is not inferred from the current tree.
   const title=element('small','search-result-path');
   const path=hit.sourcePath,parts=[];
   if(path){
    parts.push(path.providerKey==='chatgpt'?'ChatGPT':path.providerKey==='claude'?'Claude':path.providerKey||copy('来源未知','Source unknown'));
    if(path.sourceStatus==='confirmed_deleted')parts.push(copy('来源已删除','Deleted at source'));
    if(path.project){parts.push(path.project.name||copy('未命名 Project','Unnamed Project'));if(path.project.sourceStatus==='confirmed_deleted')parts.push(copy('来源已删除','Deleted at source'));}
    else parts.push(path.membership==='unassigned'?copy('未归属 Project','Not assigned to a Project'):copy('归属未知','Project unknown'));
    if(path.lastKnownProject&&(!path.project||!path.project.name||JSON.stringify(path.lastKnownProject.ref)!==JSON.stringify(path.project.ref)))parts.push(copy('最后已知 Project：','Last known Project: ')+(path.lastKnownProject.name||copy('未命名 Project','Unnamed Project')));
   }
   parts.push(hit.title||copy('位置未知','Location unknown'));highlightText(title,parts.join(' · '),query);button.append(title);
   button.append(element('small','',hit.sourceSentAt&&!Number.isNaN(Date.parse(hit.sourceSentAt))?dateLabel(hit.sourceSentAt):copy('发送时间未知','Send time unknown')));
   const needle=normalizeSearch(query);
   if(needle&&normalizeSearch(hit.title).includes(needle)&&!normalizeSearch(hit.text).includes(needle))button.append(element('small','search-title-match',copy('匹配对话标题','Conversation title match')));
   if(hit.filtered)button.append(element('small','filter-search-label',copy('智能过滤内容','Smart-filtered content')));
   button.addEventListener('click',event=>{
    const selection=document.getSelection();
    if(event.detail>0&&selection&&!selection.isCollapsed&&selection.rangeCount&&selection.getRangeAt(0).intersectsNode(button))return;
    void this.onContext(hit.documentId,hit.id,{query,bodyMatched:!!needle&&normalizeSearch(hit.text).includes(needle),...(Number.isSafeInteger(hit.contentRevision)?{knownRevision:hit.contentRevision}:{}),...(result.searchSnapshot?{searchSnapshot:{...result.searchSnapshot},scope:structuredClone(result.searchScope)}:{})});
   });list.append(button);
  }
  $('empty-list').textContent=result.restartRequired?copy('档案仍在变化，请重新搜索。','Archive is still changing. Please search again.'):result.nextCursor?copy('正在继续搜索本机输入…','Continuing to search local Inputs…'):copy('没有找到匹配内容。试试聊天标题或另一种表达。','No matches. Try a conversation title or another phrase.');
  $('empty-list').hidden=result.items.length>0;$('empty-sync').hidden=true;
 }
 async recent(more=false){const serial=++this.serial;if(!more)void this.readAIFilter();try{
  const [status,result]=await Promise.all([request('FILTER_STATUS'),request('FILTER_RECENT',{options:{cursor:more?this.recentCursor:null,limit:50,query:$('filter-recent-query').value}})]);if(serial!==this.serial)return;
  this.recentCursor=result.nextCursor;const list=$('filter-recent-list');if(!more)list.replaceChildren();$('filter-recent-state').textContent=this.lastRestore?'已恢复，今后不会自动过滤此条。':status.mode==='off'?'过滤已关闭，以下内容当前可见。':'恢复后，今后不会自动过滤该输入。';
  for(const item of result.items){const row=element('section','filter-recent-row');row.dataset.inputId=item.id;row.append(element('pre','',item.text),element('p','muted',`来自：${item.title||'独立整理文档'} · ${item.sourceSentAt?dateLabel(item.sourceSentAt):'发送时间未知'}`),element('p','muted',item.reason));const restore=element('button','','恢复到 Input Archive');restore.addEventListener('click',async()=>{restore.disabled=true;try{await request('FILTER_KEEP',{id:item.id});this.lastRestore=true;$('filter-recent-state').textContent='已恢复，今后不会自动过滤此条。';row.replaceChildren(element('p','muted','已恢复，今后不会自动过滤此条。'));}catch{restore.disabled=false;this.onError('恢复未完成，请重试。');}});row.append(restore);list.append(row);}
  if(!list.children.length&&this.recentCursor){await this.recent(true);return;}if(!list.children.length)list.append(element('p','muted',$('filter-recent-query').value.trim()?'没有匹配的过滤内容。':'目前没有被轻度智能过滤的内容。'));$('filter-recent-more').hidden=!this.recentCursor;if(!$('filter-recent-dialog').open)$('filter-recent-dialog').showModal();
 }catch{this.onError('无法读取最近过滤的内容。');}}
 changed(){if($('filter-recent-dialog').open){$('filter-recent-list').replaceChildren();void this.recent(false);}}
}
