// History owns a transient comparison and confirmation inside the existing
// modal. The caller's existing DocumentEditor remains the sole write owner.
import {setIconLabel} from './icons.js';
// Only the latest explicit selection may present/confirm a prepared revision.
// This is modal-local UI ownership, not another write or operation owner.
const selections=new WeakMap(),preparing=new WeakSet();
const restorePending=container=>{const owner=selections.get(container);return owner?.submitting===true&&owner.current();};
const syncPreviewButtons=container=>{for(const button of container.querySelectorAll('.working-history-actions button'))button.disabled=preparing.has(button)||restorePending(container);};
export function appendWorkingRevision({container,entry,read,restore,isCurrent,tc,dateLabel,onError}){
 const make=(tag,cls='',text='')=>{const node=document.createElement(tag);node.className=cls;node.textContent=text;return node;};
 const row=make('section','revision-row'),reason={migration:'迁移初始版本',baseline:'初始版本',edit:'编辑',title_edit:'标题编辑',major_edit:'重大编辑',remove:'整条删除',restore:'恢复'};
 row.append(make('p','',dateLabel(entry.at)+' · '+tc(reason[entry.reason]||'编辑')+(entry.important?' · '+tc('重要版本'):'')));
 const text=(value,prepared)=>{
  if(entry.kind==='title')return value.title||tc('使用来源标题');
  const body=value.libraryText??prepared.records.find(r=>r.id===value.originalTextReference)?.originalText;
  if(typeof body!=='string')throw Error('SOURCE_UNAVAILABLE');
  return body+(value.note?'\n\n'+tc('备注')+'：'+value.note:'')+'\n\n'+tc(value.excluded?'已从 Input Archive 移除':'保留在 Input Archive');
 };
 const controls=make('div','working-history-actions');
 for(const [label,side]of [['恢复操作前','before'],['恢复此版本','after']]){
  const button=make('button','',tc(label));button.type='button';button.onclick=async()=>{
   if(!isCurrent()||!container.contains(row)||button.disabled||restorePending(container))return;
   const selection={submitting:false,current:()=>isCurrent()&&container.contains(row)&&selections.get(container)===selection};selections.set(container,selection);
   for(const old of container.querySelectorAll('[data-restore-confirm]'))old.remove();
   button.disabled=true;preparing.add(button);
   try{
    const prepared=await read({id:entry.id,side,documentId:entry.documentId});if(!selection.current())return;
    const confirmation=make('section','working-history-confirm');confirmation.dataset.restoreConfirm='true';
    const comparison=make('div','working-history-compare');
    for(const [title,value]of [['当前工作版本',prepared.current],['所选工作版本',prepared.historical]]){const part=make('section');part.append(make('h3','',tc(title)),make('pre','reader-version-preview',text(value,prepared)));comparison.append(part);}
    confirmation.append(comparison,make('p','',tc('恢复会建立今天的新版本，并保留后来的历史。请核对所选文字。')));
    const commit=make('button','',tc('确认恢复这个工作版本')),cancel=make('button','',tc('取消'));
    commit.type=cancel.type='button';let failed=false;
    const ownsConfirmation=()=>selection.current()&&container.contains(confirmation);
    const feedback=make('p','working-history-feedback');feedback.setAttribute('role','alert');feedback.hidden=true;
    const failedSave=message=>{failed=true;feedback.hidden=false;feedback.textContent=message+' '+tc('请关闭修改历史后核对保存结果。');setIconLabel(cancel,'close',tc('关闭修改历史'));cancel.onclick=()=>{if(ownsConfirmation())container.closest('dialog').close();};onError(message);};
    cancel.onclick=()=>{if(!ownsConfirmation()||selection.submitting)return;confirmation.remove();selections.delete(container);button.focus({preventScroll:true});};
    commit.onclick=async()=>{
     if(selection.submitting||failed||!ownsConfirmation())return;selection.submitting=true;commit.disabled=cancel.disabled=true;syncPreviewButtons(container);
     try{const ok=await restore(prepared);if(ownsConfirmation()){if(ok)confirmation.remove();else failedSave(tc('版本已变化或保存尚未确认。当前草稿保留，请核对保存结果。'));}}
     catch{if(ownsConfirmation())failedSave(tc('恢复尚未完成，当前草稿保留，请核对保存结果。'));}
     finally{selection.submitting=false;if(selection.current()){syncPreviewButtons(container);if(ownsConfirmation()){commit.disabled=failed;cancel.disabled=false;}}}
    };
    confirmation.append(feedback,commit,cancel);row.append(confirmation);commit.focus({preventScroll:true});
   }catch{if(selection.current())onError(tc('这个版本或来源已变化，请重新打开修改历史。'));}
   finally{preparing.delete(button);button.disabled=restorePending(container);}
  };controls.append(button);
 }
 row.append(controls);container.append(row);if(restorePending(container))syncPreviewButtons(container);
}
