import {request,element} from './common.js';
import {requestNavigation} from './reader-navigation.js';
import {readerCopy as copy,confirmReaderAction} from './reader-experience.js';
const $=id=>document.getElementById(id);
const button=text=>{const b=element('button','',text);b.type='button';return b;};
let windowId=null,serial=0,active=false,snapshot=null,opener=null;
const date=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleDateString(document.documentElement.lang||'zh-CN'):copy('发送时间未知','Send time unknown');
export const revisitPage={
 async show(){active=true;$('revisit-panel').hidden=false;try{const window=await request('PAIA_REVISIT_OPEN',{options:{windowId}});windowId=window.id;history.replaceState({...history.state,paiaRevisitWindow:windowId},'',location.href);await refresh();}catch{$('revisit-status').textContent=copy('暂时无法读取回访内容 · 重试','Revisit is unavailable. Retry.');}},
 async leave({toReader=false}={}){active=false;$('revisit-panel').hidden=true;if(!toReader&&windowId){await request('PAIA_REVISIT_CLOSE',{options:{windowId}});windowId=null;const state={...history.state};delete state.paiaRevisitWindow;history.replaceState(state,'',location.href);}},
 refresh:()=>active?refresh():Promise.resolve()
};
async function exclude(kind,id){
 try{await request('PAIA_READER_CONFIGURE',{change:{kind,id,excluded:true}});document.dispatchEvent(new Event('paia:reader-policy'));await refresh();$('revisit-body button')?.focus();}catch{$('revisit-status').textContent=copy('排除尚未保存，请重试。','The exclusion was not saved. Retry.');}
}
function section(title){const s=element('section','revisit-section');s.append(element('h2','',title));$('revisit-body').append(s);return s;}
function card(item,kind){
 const row=element('article','revisit-card'),open=button('');open.className='revisit-card-open';row.dataset.inputId=item.id||'';row.dataset.topicId=item.topicId||'';
 open.append(element('strong','',item.title||item.name),element('p','',item.snippet||''),element('small','',kind==='topic'?copy(`多了 ${item.pendingEntryCount}${item.truncated?'+':''} 段相关内容`,`${item.pendingEntryCount}${item.truncated?'+':''} new or changed entries`):`${date(item.sourceSentAt)}${item.meaningful?copy(' · 曾编辑或加入主题',' · Edited or added to a topic'):''}`));
 open.onclick=()=>{
  if(kind==='topic'){requestNavigation({view:'thoughts',returnTo:'revisit'});document.dispatchEvent(new CustomEvent('paia:open-topic',{detail:{topicId:item.topicId}}));}
  else requestNavigation({view:'library',documentId:item.documentId,contextInputId:item.id,returnTo:'revisit'});
 };row.append(open);
 const more=element('details','revisit-more'),summary=element('summary','',copy('更多','More'));more.append(summary);
 const kinds=kind==='topic'?[['topic',item.topicId,copy('不主动回顾这个主题','Do not revisit this topic')]]:[['input',item.id,copy('不主动回顾这条','Do not revisit this input')],['document',item.documentId,copy('不主动回顾这个对话','Do not revisit this conversation')]];
 for(const [scope,id,label]of kinds){const action=button(label);action.onclick=()=>void exclude(scope,id);more.append(action);}row.append(more);return row;
}
async function refresh(){
 const token=++serial;try{
  const [visit,positions]=await Promise.allSettled([request('PAIA_REVISIT_STATUS',{options:{windowId,includeOld:true}}),request('PAIA_READER_RECENT')]);if(token!==serial)return;const reading=positions.status==='fulfilled'?positions.value:[],data=visit.status==='fulfilled'?visit.value:{oldContent:snapshot?.oldContent||false,newInputs:{items:[]},topicUpdates:[],resurface:[]};snapshot=data;
  const body=$('revisit-body');body.replaceChildren();$('revisit-status').textContent='';$('revisit-old-toggle').checked=data.oldContent;
  if(reading.length){const s=section(copy('继续阅读','Continue reading'));for(const anchor of reading){const open=button(anchor.title);open.className='revisit-resume';open.onclick=()=>requestNavigation({view:'library',documentId:anchor.documentId,contextInputId:anchor.inputId,anchor,returnTo:'revisit'});s.append(open);}}
  if(data.newInputs.items.length){const s=section(copy('上次打开后留下的内容','Saved since your last visit'));for(const item of data.newInputs.items)s.append(card(item,'input'));if(data.newInputs.truncated)s.append(element('p','muted',copy('仅显示当前有界范围，可从档案继续浏览。','Showing a bounded range. Continue browsing in Archive.')));}
  if(data.topicUpdates.length){const s=section(copy('主题有新材料','Topics with new material'));for(const item of data.topicUpdates)s.append(card(item,'topic'));}
  if(data.oldContent&&data.resurface.length){const s=section(copy('以前留下的内容','Earlier material'));for(const item of data.resurface)s.append(card(item,'input'));}
  if(data.topicsTruncated)body.append(element('p','muted',copy('仅查看部分主题，完整材料可从思想库打开。','A bounded set of topics is shown. Open Thought Library for all material.')));
  if(!data.newInputs.items.length&&!data.topicUpdates.length&&!data.resurface.length)body.append(element('p','revisit-quiet',copy('可以继续阅读，或在需要时找回以前的内容。','Continue reading, or find earlier material when you need it.')));
  if(visit.status==='rejected')$('revisit-status').textContent=copy('旧内容暂时无法读取，请重试。继续阅读仍可使用。','Earlier material is unavailable. Retry; reading positions remain available.');else if(positions.status==='rejected')$('revisit-status').textContent=copy('继续位置暂时无法读取，仍可打开档案。','Reading positions are unavailable; Archive still works.');else if(data.topicsUnavailable)$('revisit-status').textContent=copy('主题新材料暂时无法读取，档案仍可打开。','Topic updates are unavailable; Archive still works.');
 }catch{if(token===serial)$('revisit-status').textContent=copy('暂时无法读取回访内容，请重试。','Revisit is unavailable. Please retry.');}
}
async function settings(){
 const host=document.querySelector('[data-group="reading"]');if(!host||$('reader-revisit-settings'))return;
 const panel=element('section');panel.id='reader-revisit-settings';const label=element('label','setting',copy('偶尔回顾以前的内容','Occasionally revisit earlier material')),toggle=document.createElement('input');toggle.type='checkbox';toggle.id='reader-old-content';label.append(toggle);
 const captureList=element('div');captureList.id='reader-capture-list';const list=element('div');list.id='reader-exclusion-list';const status=element('p','muted');status.setAttribute('role','status');panel.append(label,element('h3','',copy('不主动回顾的内容','Excluded from Revisit')),list,element('h3','',copy('停止收录的对话','Conversations excluded from capture')),captureList,status);host.append(panel);
 const load=async()=>{try{const data=await request('PAIA_READER_POLICY');toggle.checked=data.revisit.oldContent;captureList.replaceChildren();for(const key of data.capture.excludedChats){const row=element('div','reader-exclusion-row'),resume=button(copy('恢复收录','Resume capture'));row.append(element('span','',copy('来源对话','Source conversation')+' · '+key.slice(-12)),resume);resume.onclick=async()=>{if(!await confirmReaderAction({title:copy('恢复这个对话的收录','Resume this conversation'),text:copy('恢复后可能补录这个来源对话已经显示的输入。永久删除的来源仍不会恢复。','Visible inputs in this conversation may be captured again. Permanently deleted sources remain blocked.'),confirm:copy('恢复收录','Resume capture')}))return;try{await request('PAIA_READER_CAPTURE_SCOPE',{options:{chatKey:key,excluded:false}});document.dispatchEvent(new Event('paia:reader-policy'));await load();}catch{status.textContent=copy('收录设置尚未保存，请重试。','Capture setting not saved. Retry.');}};captureList.append(row);}list.replaceChildren();for(const rule of data.revisit.exclusions){const row=element('div','reader-exclusion-row');let title=copy('已失效的内容规则','Unavailable content rule');try{if(rule.kind==='topic')title=(await request('GET_LIBRARY_TOPIC',{id:rule.id})).name;else{const id=rule.kind==='input'?(await request('GET_INPUT',{id:rule.id})).documentId:rule.id;const p=await request('GET_PAGE',{page:{view:'library',documentId:id,limit:1}});const d=p.conversations[0];title=d?.userTitle||d?.originalConversationTitle||title;}}catch{}const remove=button(copy('取消这项排除','Remove this exclusion'));row.append(element('span','',title+' · '+copy({input:'单条',document:'对话',topic:'主题'}[rule.kind],rule.kind)),remove);remove.onclick=async()=>{if(!await confirmReaderAction({title:copy('重新参与回顾','Include in Revisit again'),text:copy('所选内容及其派生预览会重新参与回顾。其他限制保持有效。','This content and its derived previews can appear in Revisit again. Other restrictions still apply.'),confirm:copy('取消这项排除','Remove this exclusion')}))return;try{await request('PAIA_READER_CONFIGURE',{change:{kind:rule.kind,id:rule.id,excluded:false}});await load();document.dispatchEvent(new Event('paia:reader-policy'));}catch{status.textContent=copy('设置尚未保存，请重试。','The setting was not saved. Retry.');}};list.append(row);}}catch{status.textContent=copy('回顾设置暂不可读。','Revisit settings are unavailable.');}};
 toggle.onchange=async()=>{const before=!toggle.checked;toggle.disabled=true;try{await request('PAIA_READER_CONFIGURE',{change:{oldContent:toggle.checked}});document.dispatchEvent(new Event('paia:reader-policy'));}catch{toggle.checked=before;status.textContent=copy('设置尚未保存，已恢复原值。','Setting not saved. Previous value restored.');}finally{toggle.disabled=false;}};
 document.addEventListener('paia:reader-policy',()=>void load());document.querySelector('[data-settings-group="reading"]')?.addEventListener('click',()=>void load());
}
export function installRevisit(){
 if($('revisit-open'))return;
 windowId=history.state?.paiaRevisitWindow||null;
 const open=button(copy('回来看看','Revisit'));open.id='revisit-open';open.onclick=()=>{opener=document.activeElement;requestNavigation({view:'revisit'});};$('universal-search-open')?.after(open);
 const panel=element('section');panel.id='revisit-panel';panel.hidden=true;const head=element('header'),back=button(copy('‹ 返回档案','‹ Back to Archive')),title=element('h1','',copy('回来看看','Revisit'));back.className='revisit-close';back.onclick=()=>{requestNavigation({view:'library'});opener?.isConnected&&opener.focus({preventScroll:true});};head.append(back,title);
 const intro=element('p','muted revisit-intro',copy('这里呈现上次打开后的本机变化，不表示哪些内容已经读完。','Local changes since your last visit. This does not mark anything as read.')),body=element('div');body.id='revisit-body';
 const label=element('label','setting',copy('偶尔回顾以前的内容','Occasionally revisit earlier material')),toggle=document.createElement('input');toggle.type='checkbox';toggle.id='revisit-old-toggle';label.append(toggle);
 const status=element('p');status.id='revisit-status';status.setAttribute('role','status');const retry=button(copy('刷新本次内容','Refresh this visit'));retry.id='revisit-refresh';retry.onclick=()=>void (windowId?refresh():revisitPage.show());
 toggle.onchange=async()=>{toggle.disabled=true;try{await request('PAIA_READER_CONFIGURE',{change:{oldContent:toggle.checked}});document.dispatchEvent(new Event('paia:reader-policy'));await refresh();}catch{toggle.checked=snapshot?.oldContent||false;status.textContent=copy('设置尚未保存，已恢复原值。','Setting not saved. Previous value restored.');}finally{toggle.disabled=false;}};
 panel.append(head,intro,body,label,retry,status);document.querySelector('.workspace').append(panel);
 const invalidate=()=>{++serial;snapshot=snapshot?{oldContent:snapshot.oldContent}:null;$('revisit-body').replaceChildren();void revisitPage.refresh();};document.addEventListener('paia:reader-policy',invalidate);
 chrome.runtime.onMessage.addListener(m=>{if(['ARCHIVE_CHANGED','PAIA_READER_POLICY_CHANGED'].includes(m.type)&&active)invalidate();});
 queueMicrotask(()=>void settings());
}
