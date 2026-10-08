import {request,element} from './common.js';
import {setIconLabel} from './icons.js';
const $=id=>document.getElementById(id);
export class InputReview {
 constructor({navigate,refresh}){this.navigate=navigate;this.refresh=refresh;this.origin='library';this.reviewEpoch=0;this.reviewActive=false;this.restoringInputs=new Map();this.choice=null;this.assigningInputs=new Set();$('review-back').addEventListener('click',()=>void navigate(this.origin));$('review-inputs').addEventListener('click',()=>void navigate('library'));$('review-dialog-close').addEventListener('click',()=>this.closeChoice());$('review-dialog').addEventListener('cancel',()=>this.invalidateChoice());$('review-dialog').addEventListener('close',()=>{if(!$('review-dialog').open)this.invalidateChoice();});}
 enter(origin,history=false){this.closeChoice();this.reviewEpoch++;this.origin=origin==='settings'?'settings':'library';this.history=history;}
 paint(view){const active=view==='excluded';if(this.reviewActive!==active){if(!active)this.closeChoice();this.reviewEpoch++;this.reviewActive=active;}$('review-navigation').hidden=view!=='excluded';if(view!=='excluded')return;const label=this.origin==='settings'?'Settings':'Input Archive';$('review-breadcrumb').textContent=label+(this.history?' / 历史补全':'')+' / 待确认与已移除输入';setIconLabel($('review-back'),'back',this.origin==='settings'?'返回设置':'返回输入档案');}
 actions(b,doc){const box=element('div','review-actions'),message=element('p','muted');message.setAttribute('role','status');const pending=!!b.branchStatus;box.dataset.reviewState=pending?'pending':'removed';box.append(element('strong','review-state-label',pending?'待确认归属':'已移除'),element('p','muted review-state-copy',pending?'先确认这条输入应归入哪个聊天窗口；当时记录保持不变。':'当前工作文字仍保留，可恢复到 Input Archive；当时记录不会被改写。'));const add=(label,run)=>{const button=element('button','',label);button.addEventListener('click',()=>void run().catch(()=>{message.textContent='处理未完成，当前内容保留。请重新打开后再试。';}));box.append(button);return button;};
  if(pending){add('归入现有聊天窗口',()=>this.choose(b,doc));add('保留为独立整理文档',()=>this.resolve(b,'standalone',null,message));add('忽略',()=>this.resolve(b,'ignore',null,message));add('暂不处理',async()=>{message.textContent='已保留待确认状态，可以稍后从设置继续。';});}
  else {const input={id:b.id,documentId:b.documentId},button=add('恢复到输入档案',()=>this.restoreRemoved(input,button,message));const pending=this.restoringInputs.get(input.id);if(pending){pending.add({button,message});button.disabled=true;button.setAttribute('aria-busy','true');}}box.append(message);return box;
 }
 async restoreRemoved(input,button,message){
  if(!this.reviewActive||!button.isConnected||this.restoringInputs.has(input.id))return;
  const epoch=this.reviewEpoch,buttons=new Set([{button,message}]);this.restoringInputs.set(input.id,buttons);button.disabled=true;button.setAttribute('aria-busy','true');
  const current=()=>this.reviewActive&&this.reviewEpoch===epoch;
  try{await request('EXCLUDE_LIBRARY',{id:input.id,excluded:false});if(current())await this.navigate('library',input.documentId,input.id);}
  catch{if(current())for(const control of buttons)if(control.button.isConnected)control.message.textContent='处理未完成，当前内容保留。请重新打开后再试。';}
  finally{this.restoringInputs.delete(input.id);for(const {button:node} of buttons){node.disabled=false;node.setAttribute('aria-busy','false');}}
 }
 invalidateChoice(){this.choice=null;$('review-assign').onclick=null;$('review-assign').disabled=true;$('review-documents-more').onclick=null;}
 closeChoice(){this.invalidateChoice();if($('review-dialog').open)$('review-dialog').close();}
 async choose(b,doc){
  this.invalidateChoice();const session={input:{id:b.id,revision:b.revision},epoch:this.reviewEpoch,ready:false,loading:false,busy:false},dialog=$('review-dialog'),select=$('review-document'),button=$('review-assign'),more=$('review-documents-more'),message=$('review-choice-status');this.choice=session;
  const current=()=>this.choice===session&&this.reviewActive&&this.reviewEpoch===session.epoch&&dialog.open;
  select.replaceChildren();const ids=new Set(),add=d=>{if(ids.has(d.id))return;ids.add(d.id);const o=element('option','',d.userTitle||d.originalConversationTitle||'独立整理文档');o.value=d.id;select.append(o);};add(doc);let cursor=null;
  const controls=()=>{if(current()){button.disabled=!session.ready||session.busy||this.assigningInputs.has(session.input.id);more.disabled=session.loading||session.busy;}};
  const load=async()=>{if(!current()||session.loading||session.busy)return;session.loading=true;controls();try{const p=await request('GET_PAGE',{page:{view:'library',limit:100,cursor}});if(!current())return;p.documents.forEach(add);cursor=p.nextCursor;more.hidden=!cursor;session.ready=true;}catch{if(current()){message.textContent='尚未读完列表，请再试一次。';more.hidden=false;}}finally{session.loading=false;controls();}};
  more.hidden=true;more.onclick=()=>void load();message.textContent='只调整输入档案的整理归属，原始聊天来源保持不变。';
  button.onclick=async()=>{if(!current()||!session.ready||session.busy||this.assigningInputs.has(session.input.id))return;session.busy=true;this.assigningInputs.add(session.input.id);controls();try{await this.resolve(session.input,'existing',select.value,message,current);if(current())this.closeChoice();}catch{if(current())message.textContent='处理未完成，内容或窗口可能已变化。请关闭后重读。';}finally{this.assigningInputs.delete(session.input.id);session.busy=false;controls();const next=this.choice;if(next!==session&&next?.input.id===session.input.id&&next.ready&&!next.busy)button.disabled=false;}};
  if(!dialog.open)dialog.showModal();controls();await load();
 }
 async resolve(b,action,documentId,message,current=()=>true){const result=await request('IMPORT_RESOLVE_BRANCH',{payload:{id:b.id,expectedRevision:b.revision,operationId:crypto.randomUUID(),action,...(documentId?{documentId}:{})}});if(!current())return;await this.refresh();if(!current())return;const status=$('review-result');status.replaceChildren(element('span','',action==='ignore'?'已移入已移除输入；来源保留，可以恢复。':'已确认归属。'));if(action!=='ignore'){const open=element('button','','查看对应文档');open.addEventListener('click',()=>void this.navigate('library',result.documentId,b.id));status.append(open);}const back=element('button','',this.origin==='settings'?'返回设置':'返回输入档案');back.addEventListener('click',()=>void this.navigate(this.origin));status.append(back);status.hidden=false;}
}
