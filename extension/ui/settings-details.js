import {createSettingsSupportedSites} from './settings-supported-sites.js';
import {createSettingsSyncRecovery} from './settings-sync-recovery.js';
import {refreshSettingsRecovery} from './maintenance-recovery.js';
import {createIcon} from './icons.js';
import {refreshStorage,subscribeStorageEstimate,storageSummaryText} from './r6-settings.js';
import {SettingsRemovedComposite,REMOVED_KINDS} from './settings-removed-composite.js';

// Shared original Settings modal focus containment; native Escape stays untouched.
export function installSettingsDialogKeyboard(dialog){
 dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab'||event.altKey||event.ctrlKey||event.metaKey)return;
  const visible=[...dialog.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')].filter(node=>!node.disabled&&node.tabIndex>=0&&node.getClientRects().length);
  const stops=visible.filter(node=>node.type!=='radio'||!node.name||node===(visible.find(other=>other.type==='radio'&&other.name===node.name&&other.checked)||visible.find(other=>other.type==='radio'&&other.name===node.name)));
  const first=stops[0],last=stops.at(-1),active=document.activeElement;
  if(!first)return;
  if(event.shiftKey?(active===first||!dialog.contains(active)):(active===last||!dialog.contains(active))){event.preventDefault();(event.shiftKey?last:first).focus();}
 });
}

export function mountSettingsDetail({id,title,dialogTitle=()=>title,content,value=()=>'',language=()=>document.documentElement.lang,onOpen=()=>{},beforeClose=null}){
 const row=document.createElement('button');row.type='button';row.id=id;row.className='ux-setting-row ux-settings-destination';row.setAttribute('aria-haspopup','dialog');
 const label=document.createElement('span');label.className='ux-setting-name';const summary=document.createElement('span');summary.className='ux-setting-destination-value';row.append(label,summary,createIcon('chevron-right'));
 const dialog=document.createElement('dialog');dialog.id=id+'-dialog';dialog.className='ux-settings-detail-dialog';const header=document.createElement('header'),heading=document.createElement('h2'),close=document.createElement('button');heading.id=id+'-title';dialog.setAttribute('aria-labelledby',heading.id);row.setAttribute('aria-controls',dialog.id);close.type='button';close.className='ux-settings-detail-close';header.append(heading,close);dialog.append(header,content);document.body.append(dialog);
 const sync=()=>{const chinese=language()==='zh-CN';label.textContent=title[chinese?0:1];heading.textContent=dialogTitle()[chinese?0:1];summary.textContent=value(chinese);close.textContent=chinese?'关闭':'Close';close.setAttribute('aria-label',(chinese?'关闭':'Close ')+heading.textContent);};
 // Keep sequential keyboard navigation inside the open modal. Native dialog
 // Escape/close and return focus remain browser-owned.
 installSettingsDialogKeyboard(dialog);
 let closing=false;
 const requestClose=()=>{
  if(!beforeClose){dialog.close();return;}
  if(closing||!dialog.open)return;
  closing=true;close.disabled=true;
  return Promise.resolve().then(beforeClose).then(allowed=>{if(allowed===true&&dialog.open)dialog.close();}).catch(()=>{
   // Failed owner acknowledgement leaves the detail and its current state open.
   close.setAttribute('aria-label',(language()==='zh-CN'?'尚未关闭，请重试：':'Could not close; retry: ')+heading.textContent);
  }).finally(()=>{closing=false;close.disabled=false;});
 };
 row.addEventListener('click',()=>{if(dialog.open)return;sync();dialog.showModal();void onOpen();});close.addEventListener('click',()=>void requestClose());
 if(beforeClose)for(const type of ['cancel','paia:request-close'])dialog.addEventListener(type,event=>{event.preventDefault();void requestClose();});sync();
 return {row,dialog,sync};
}
// Re-present the original control, preserving its installed listener, identity
// and navigation/consent owner. Mounting never activates the destination.
export function mountSettingsDestination(button,{title,description=null,language=()=>document.documentElement.lang,dialogId=null}){
 const label=document.createElement('span');label.className='ux-setting-name';
 const copy=document.createElement('span');copy.className='ux-setting-copy';copy.append(label);if(description){description.classList.add('ux-setting-description');copy.append(description);}
 button.classList.add('ux-setting-row','ux-settings-destination');button.replaceChildren(copy,createIcon('chevron-right'));
 button.removeAttribute('data-settings-zh');button.removeAttribute('data-settings-en');
 if(dialogId){button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',dialogId);}
 const sync=()=>{label.textContent=title[language()==='zh-CN'?0:1];};sync();return {row:button,sync};
}
let owner=null;
function mountRemovedDetail(language) {
 let detail,viewSerial=0,keepRows=false,statusState=null,statusError=null;
 const renderedLanguage=()=>document.documentElement.lang||language();
 const visible=()=>!!detail?.dialog.open&&!document.getElementById('settings-panel').hidden&&!document.getElementById('ux-settings-data-group').hidden;
 const model=new SettingsRemovedComposite(undefined,visible),content=document.createElement('div'),intro=document.createElement('p'),status=document.createElement('p'),list=document.createElement('div'),more=document.createElement('div'),footer=document.createElement('p');
 content.className='ux-settings-removed-content';intro.className=footer.className='ux-settings-removed-note';status.setAttribute('role','status');list.id='settings-removed-composite-list';more.className='ux-settings-removed-more';content.append(intro,status,list,more,footer);
 const text=(zh,en)=>renderedLanguage()==='zh-CN'?zh:en,cached=new Map(),moreControls=new Map();
 const current=serial=>serial===viewSerial&&visible();
 const labels={input:['输入 · 从档案中移除','Input · Removed from Archive'],topic:['主题 · 从思想库中移除','Topic · Removed from Thought Library'],entry:['内容 · 从思想库中移除','Content · Removed from Thought Library'],placement:['内容仍保留 · 从主题中移除','Content retained · Removed from a Topic']};
 const actions={input:['恢复到档案','Restore to Archive'],topic:['恢复主题','Restore topic'],entry:['恢复内容','Restore content'],placement:['放回这个主题','Put back in this topic']};
 const titles={input:['更多已移除输入','More removed Inputs'],topic:['更多已移除主题','More removed Topics'],entry:['更多已移除内容','More removed content'],placement:['更多已移除关系','More removed relationships']};
 const failure=error=>error?.code==='BACKUP_CHANGED'?text('列表已改变，请重新加载。','The list changed. Reload before continuing.'):error?.code==='CONFLICT'?text('内容或组织已更新，请重新加载后再试。','The content or organization changed. Reload before trying again.'):text('处理尚未完成，当前内容保留。请核对结果或重试。','This has not completed. Content is preserved. Check the result or retry.');
 const button=(label,run)=>{const node=document.createElement('button');node.type='button';node.textContent=label;node.addEventListener('click',()=>void run());return node;};
 const statusCopy=()=>statusError?failure(statusError):statusState==='reading'?text('正在读取已移除内容…','Reading removed content…'):statusState==='partial-empty'?text('当前页没有可恢复内容，可以继续加载。','No restorable content on this page. Continue loading.'):statusState==='empty'?text('没有当前可恢复的已移除内容。','There is no removed content currently available to restore.'):statusState==='retained'?text('已核对原恢复结果；当前内容仍保留在列表中。','The original result is confirmed; the current item remains in the list.'):statusState==='restored'?text('已恢复，AI 权限未改变。','Restored. AI access is unchanged.') : '';
 const syncCopy=()=>{
  intro.textContent=text('移除不等于永久删除。这里只列出当前仍可恢复的内容。','Removal is not permanent deletion. Only currently restorable items are listed here.');footer.textContent=text('恢复不会重新开放 AI 权限。','Restoring never re-opens AI access.');
  for(const row of cached.values()){
   const {kind,item}=row.record;row.feedback.textContent=row.error?failure(row.error):'';
   (row.preview||row.title).textContent=kind==='topic'?item.name:kind==='placement'?(item.label||text('空内容','Empty content')):item.label||item.title||item.body?.slice(0,80)||text('空内容','Empty content');
   row.description.textContent=row.unknown?text('上次恢复结果尚未核对；这不是新的恢复请求。','The previous recovery result is unconfirmed; this is the original request.'):kind==='placement'?text('内容仍保留 · 从「'+item.topicName+'」中移除',`Content retained · Removed from ${item.topicName}`)+(item.sectionName?' · '+item.sectionName:''):text(...labels[kind]);
   row.action.textContent=row.unconfirmed?text('核对结果或重试','Check result or retry'):text(...actions[kind]);
   if(row.history)row.history.textContent=kind==='topic'?text('版本历史','Version history'):text('版本','Versions');
  }
  for(const [kind,control]of moreControls)control.textContent=kind==='reload'?text('重新加载列表','Reload list'):text(...titles[kind]);
  status.textContent=statusCopy();
 };
 const render=()=>{
  const wanted=[],seen=new Set();
  for(const kind of REMOVED_KINDS)for(const record of [...(model.rows?.values()??[]),...model.attempts.values(),...(keepRows?[...cached.values()].filter(row=>!model.pages?.get(row.record.kind)?.started).map(row=>row.record):[])].map(value=>value.row??value)) {
   if(record.kind!==kind)continue;const {item}=record,key=JSON.stringify([kind,item.id]);if(seen.has(key))continue;seen.add(key);
   let row=cached.get(key);
   if(!row) {
    const node=document.createElement('div'),title=document.createElement('p'),description=document.createElement('p'),feedback=document.createElement('p');node.className='ux-settings-recovery-entry';description.className='ux-settings-removed-note';feedback.className='ux-settings-recovery-feedback';feedback.setAttribute('role','status');
    const action=button('',async()=>{
     const serial=viewSerial,focused=document.activeElement===action,index=[...list.querySelectorAll('[data-recovery-kind]')].indexOf(action);let focusMoved=false,failed=false;const trackFocus=event=>{if(event.target!==action)focusMoved=true;};if(focused)document.addEventListener('focusin',trackFocus);action.disabled=true;row.error=null;feedback.textContent='';
     // Transfer keyboard ownership in the same render that removes the
     // restored row, rather than leaving focus on body until unrelated pages finish.
     const transferFocus=next=>{
      if(!current(next)||statusError||!focused||focusMoved||action.isConnected||document.activeElement!==document.body)return;
      const available=[...list.querySelectorAll('[data-recovery-kind]')].filter(node=>!node.disabled);
      const target=available[Math.min(Math.max(0,index),available.length-1)];
      if(target)target.focus({preventScroll:true});
      else if([...model.pages.values()].every(page=>page.done))detail.dialog.querySelector('.ux-settings-detail-close').focus({preventScroll:true});
     };
     try {await model.restore(kind,item.id);if(!current(serial))return;const next=await open(true,transferFocus);if(!current(next)||statusError)return;statusState=model.rows.has(key)?'retained':'restored';statusError=null;status.textContent=statusCopy();if(focused&&!focusMoved&&(document.activeElement===action||document.activeElement===document.body)){const actions=[...list.querySelectorAll('[data-recovery-kind]')];(actions[Math.min(Math.max(0,index),actions.length-1)]||detail.dialog.querySelector('.ux-settings-detail-close')).focus({preventScroll:true});}}
     catch(error) {failed=true;if(current(serial))row.error=error;}
     finally {if(current(serial)){render();if(failed&&focused&&!focusMoved&&(document.activeElement===action||document.activeElement===document.body))action.focus({preventScroll:true});}if(focused)document.removeEventListener('focusin',trackFocus);}
    });action.dataset.recoveryKind=kind;node.append(title,description,action);let history=null;
    if(kind==='topic'||kind==='entry'){history=button('',async()=>{const serial=viewSerial,isCurrent=()=>current(serial)&&model.rows.has(key);if(isCurrent())document.dispatchEvent(new CustomEvent('paia:removed-history',{detail:{kind,id:item.id,isCurrent}}));});node.append(history);}node.append(feedback);title.dataset.removedLabel='';let preview=null;if(kind!=='topic'){preview=document.createElement('span');preview.className='paia-removed-preview';const mask=document.createElement('span');mask.className='paia-removed-preview-mask';title.append(preview,mask);}row={node,title,preview,description,action,history,feedback};cached.set(key,row);
   }
   row.record=record;const attempt=model.attempts.get(key);row.unconfirmed=!!attempt?.edit;row.unknown=!!attempt?.edit&&!model.rows.has(key);row.action.disabled=!!attempt?.busy||!model.rows.has(key)&&!attempt;
   if(row.history)row.history.disabled=!!attempt?.busy||!model.rows.has(key);
   wanted.push(row.node);
  }
  let cursor=list.firstChild;for(const node of wanted){if(node!==cursor)list.insertBefore(node,cursor);cursor=node.nextSibling;}for(const node of [...list.children])if(!wanted.includes(node))node.remove();
  for(const [key,row]of cached)if(!seen.has(key)){row.node.remove();cached.delete(key);}
  const controls=[];for(const kind of REMOVED_KINDS){const page=model.pages?.get(kind);if(!page||page.done&&!page.error)continue;let control=moreControls.get(kind);if(!control){control=button('',async()=>{const serial=viewSerial;control.disabled=true;try{await model.load(kind);}catch(error){if(current(serial)){statusError=error;status.textContent=statusCopy();}}if(current(serial))render();});moreControls.set(kind,control);}control.textContent=text(...titles[kind]);control.disabled=!!page.pending||!model.fence||page.error?.code==='BACKUP_CHANGED';controls.push(control);}
  let reload=moreControls.get('reload');if(!reload){reload=button('',()=>open());moreControls.set('reload',reload);}reload.textContent=text('重新加载列表','Reload list');if(statusError||model.attempts.size||[...model.pages.values()].some(page=>page.error))controls.push(reload);let position=more.firstChild;for(const node of controls){if(position!==node)more.insertBefore(node,position);position=node.nextSibling;}for(const node of [...more.children])if(!controls.includes(node))node.remove();
  if(model.fence&&[...model.pages.values()].every(page=>page.done)&&!wanted.length&&(statusState==='reading'||statusState==='partial-empty'||statusState===null)&&!statusError)statusState='empty';if(statusState==='partial-empty'&&wanted.length)statusState=null;syncCopy();
 };
 const open=async(preserve=false,afterRender=()=>{})=>{
  const serial=++viewSerial,focused=preserve&&list.contains(document.activeElement)?document.activeElement:null;let focusMoved=false;
  const trackFocus=event=>{if(event.target!==focused&&event.target!==document.body)focusMoved=true;};if(focused)document.addEventListener('focusin',trackFocus);
  keepRows=preserve;statusState='reading';statusError=null;status.textContent=statusCopy();if(!preserve){cached.clear();list.replaceChildren();}
  const refresh=()=>{render();afterRender(serial);};
  try{
   if(!await model.open()||!current(serial))return;refresh();
   const reads=REMOVED_KINDS.map(async kind=>{try{await model.load(kind);}catch(error){if(current(serial)){statusError=error;status.textContent=statusCopy();}}if(current(serial))refresh();});await Promise.allSettled(reads);
   if(current(serial)&&![...model.pages.values()].some(page=>page.error)){statusState=model.rows.size?null:[...model.pages.values()].every(page=>page.done)?'empty':'partial-empty';status.textContent=statusCopy();}
   return current(serial)?serial:null;
  }catch(error){if(current(serial)){statusError=error;status.textContent=statusCopy();refresh();}return current(serial)?serial:null;}
  finally{
   // A bounded refresh disables unqualified old rows while it reads. Return
   // focus only to the same newly qualified node if no newer intent took over.
   if(focused){document.removeEventListener('focusin',trackFocus);if(current(serial)&&!focusMoved&&focused.isConnected&&!focused.disabled&&document.activeElement===document.body)focused.focus({preventScroll:true});}
  }
 };

 detail=mountSettingsDetail({id:'settings-removed',title:['已移除的内容','Removed content'],content,language:renderedLanguage,onOpen:open});
 detail.dialog.addEventListener('close',()=>{++viewSerial;model.close();cached.clear();list.replaceChildren();more.replaceChildren();});
 const observer=new MutationObserver(()=>{if(detail.dialog.open&&(document.getElementById('settings-panel').hidden||document.getElementById('ux-settings-data-group').hidden))detail.dialog.close();});for(const id of ['settings-panel','ux-settings-data-group'])observer.observe(document.getElementById(id),{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('paia:preferences-applied',()=>{detail.sync();if(detail.dialog.open)syncCopy();});return detail;
}
function mountSearchRepair(dataGroup,language){
 const warning=document.createElement('section'),heading=document.createElement('h3'),description=document.createElement('p'),content=document.createElement('div'),intro=document.createElement('p'),actions=document.createElement('footer'),cancel=document.createElement('button');
 const rebuild=document.getElementById('library-rebuild-search'),status=document.getElementById('library-maintenance-status');
 warning.id='settings-search-warning';warning.className='ux-settings-search-warning';warning.hidden=true;warning.setAttribute('role','status');
 // Move the existing identities before retiring their former legacy ancestor.
 // The original Topic controller remains the sole repair command writer.
 actions.className='ux-settings-search-actions';actions.append(cancel,rebuild);content.append(intro,status,actions);cancel.type='button';
 const detail=mountSettingsDetail({id:'settings-search-repair',title:['修复搜索','Repair search'],content,language});
 detail.row.className='ux-settings-search-repair';detail.row.lastElementChild.remove();detail.row.querySelector('.ux-setting-destination-value').remove();
 warning.append(heading,description,detail.row);dataGroup.querySelector('h2').after(warning);
 const sync=()=>{
  const chinese=language()==='zh-CN';detail.sync();
  heading.textContent=chinese?'PAIA 检测到搜索索引问题':'PAIA detected a search index issue';
  description.textContent=chinese?'部分内容可能无法被搜索到；已保存的正文仍可阅读。':'Some content may be missing from search. Saved text is still readable.';
  intro.textContent=chinese?'根据现有正文重新建立搜索索引，不修改输入、主题或版本历史。':'Rebuild search from existing text without modifying inputs, topics or version history.';
  cancel.textContent=chinese?'取消':'Cancel';rebuild.textContent=chinese?'开始修复':'Repair';refreshSettingsRecovery();
 };
 cancel.addEventListener('click',()=>detail.dialog.close());detail.dialog.addEventListener('close',()=>refreshSettingsRecovery());
 const observer=new MutationObserver(()=>{if(detail.dialog.open&&(document.getElementById('settings-panel').hidden||dataGroup.hidden))detail.dialog.close();});
 for(const node of [document.getElementById('settings-panel'),dataGroup])observer.observe(node,{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('paia:preferences-applied',sync);sync();return {...detail,sync};
}
export function installSettingsDetails({dataGroup,language,backup=null}={}){
 if(owner)return owner;const storage=document.getElementById('r6-data-status'),sites=document.getElementById('settings-supported-sites');if(!storage||!sites)return null;
 const syncDetail=createSettingsSyncRecovery({dataGroup,language,mountDetail:mountSettingsDetail});
 const storageWrapper=storage.closest('.ux-settings-detail');let storageState;const storageDetail=mountSettingsDetail({id:'settings-storage',title:['存储空间','Storage space'],content:storage,language,value:chinese=>storageSummaryText(storageState,!chinese),onOpen:refreshStorage});
 if(storageWrapper)storageWrapper.replaceWith(storageDetail.row);else dataGroup.append(storageDetail.row);
 const siteFacts=createSettingsSupportedSites({language});
 const siteDetail=mountSettingsDetail({id:'settings-supported-sites-open',title:['支持的网站','Supported websites'],content:siteFacts.content,language,value:()=> 'ChatGPT',onOpen:siteFacts.sync});const syncSiteDetail=siteDetail.sync;siteDetail.sync=()=>{siteFacts.sync();syncSiteDetail();};sites.replaceWith(siteDetail.row);
 const history=document.getElementById('history-settings'),historyButton=document.getElementById('settings-history'),latest=document.getElementById('history-latest');
 const importDetail=mountSettingsDestination(historyButton,{title:['导入历史输入','Import earlier inputs'],description:latest,language,dialogId:'history-dialog'});history.replaceWith(importDetail.row);
 const source=document.getElementById('r6-source-records'),sourceButton=source.querySelector('[data-view="archive"]');
 sourceButton.id='settings-source-records';
 const sourceDetail=mountSettingsDestination(sourceButton,{title:['原始来源记录','Original source records'],language});source.replaceWith(sourceDetail.row);
 const restore=document.getElementById('backup-settings'),restoreWrapper=restore.closest('.ux-settings-detail');
 const restoreTitle=['从已有 PAIA 备份恢复','Restore an existing PAIA backup'];
 const restoreDetail=mountSettingsDetail({id:'settings-backup',title:restoreTitle,dialogTitle:()=>restore.dataset.inspectionFailure==='true'?['这份备份无法恢复','This backup cannot be restored']:restore.dataset.backupStage==='confirm'?['确认恢复','Confirm restoration']:restore.dataset.backupStage==='preview'?['预览恢复内容','Preview restoration']:restoreTitle,content:restore,language,beforeClose:()=>backup?.leaveSettings()??false});
 new MutationObserver(()=>restoreDetail.sync()).observe(restore,{attributes:true,attributeFilter:['data-inspection-failure','data-backup-stage']});
 restoreWrapper.replaceWith(restoreDetail.row);restoreDetail.row.disabled=!backup;
 const removed=document.getElementById('library-management'),pending=document.getElementById('manage-excluded'),removedWrapper=removed.closest('.ux-settings-detail'),removedDetail=mountRemovedDetail(language);
 // The original legacy controllers still bind these identities. Their former
 // nested Settings presentation is retired; import results retain pending review.
 const searchRepair=mountSearchRepair(dataGroup,language);
 const retired=document.createElement('div');retired.hidden=true;retired.append(removed);document.body.append(retired);pending.removeAttribute('data-settings-zh');pending.removeAttribute('data-settings-en');document.getElementById('history-dialog').append(pending);removedWrapper.replaceWith(removedDetail.row);
 subscribeStorageEstimate(state=>{storageState=state;storageDetail.sync();});
 owner={sync:()=>{for(const detail of [syncDetail,storageDetail,siteDetail,importDetail,sourceDetail,restoreDetail,removedDetail,searchRepair])detail.sync();},syncRecovery:syncDetail,storage:storageDetail,sites:siteDetail,restore:restoreDetail,removed:removedDetail,searchRepair};return owner;
}
