import {request,element} from './common.js';
const $=id=>document.getElementById(id);
export class InputReview {
 constructor({navigate,refresh}){this.navigate=navigate;this.refresh=refresh;this.origin='library';$('review-back').addEventListener('click',()=>void navigate(this.origin));$('review-inputs').addEventListener('click',()=>void navigate('library'));$('review-dialog-close').addEventListener('click',()=>$('review-dialog').close());}
 enter(origin,history=false){this.origin=origin==='settings'?'settings':'library';this.history=history;}
 paint(view){$('review-navigation').hidden=view!=='excluded';if(view!=='excluded')return;const label=this.origin==='settings'?'Settings':'Input Archive';$('review-breadcrumb').textContent=label+(this.history?' / 历史补全':'')+' / 待确认与已移除输入';$('review-back').textContent=this.origin==='settings'?'‹ 返回设置':'‹ 返回输入档案';}
 actions(b,doc){const box=element('div','review-actions'),message=element('p','muted');message.setAttribute('role','status');const add=(label,run)=>{const button=element('button','',label);button.addEventListener('click',()=>void run().catch(()=>{message.textContent='处理未完成，当前内容保留。请重新打开后再试。';}));box.append(button);};
  if(b.branchStatus){add('归入现有聊天窗口',()=>this.choose(b,doc));add('保留为独立整理文档',()=>this.resolve(b,'standalone',null,message));add('忽略',()=>this.resolve(b,'ignore',null,message));add('暂不处理',async()=>{message.textContent='已保留待确认状态，可以稍后从设置继续。';});}
  else add('恢复到输入档案',async()=>{await request('EXCLUDE_LIBRARY',{id:b.id,excluded:false});await this.navigate('library',b.documentId,b.id);});box.append(message);return box;
 }
 async choose(b,doc){const select=$('review-document');select.replaceChildren();const ids=new Set();const add=d=>{if(ids.has(d.id))return;ids.add(d.id);const o=element('option','',d.userTitle||d.originalConversationTitle||'独立整理文档');o.value=d.id;select.append(o);};add(doc);let cursor=null;
  const more=$('review-documents-more'),load=async()=>{more.disabled=true;try{const p=await request('GET_PAGE',{page:{view:'library',limit:100,cursor}});p.documents.forEach(add);cursor=p.nextCursor;more.hidden=!cursor;}finally{more.disabled=false;}};
  more.onclick=()=>void load().catch(()=>{$('review-choice-status').textContent='尚未读完列表，请再试一次。';});$('review-choice-status').textContent='只调整输入档案的整理归属，原始聊天来源保持不变。';$('review-dialog').showModal();await load();
  $('review-assign').onclick=async()=>{const button=$('review-assign');button.disabled=true;try{await this.resolve(b,'existing',select.value,$('review-choice-status'));$('review-dialog').close();}catch{$('review-choice-status').textContent='处理未完成，内容或窗口可能已变化。请关闭后重读。';}finally{button.disabled=false;}};
 }
 async resolve(b,action,documentId,message){const result=await request('IMPORT_RESOLVE_BRANCH',{payload:{id:b.id,expectedRevision:b.revision,operationId:crypto.randomUUID(),action,...(documentId?{documentId}:{})}});await this.refresh();const status=$('review-result');status.replaceChildren(element('span','',action==='ignore'?'已移入已移除输入；来源保留，可以恢复。':'已确认归属。'));if(action!=='ignore'){const open=element('button','','查看对应文档');open.addEventListener('click',()=>void this.navigate('library',result.documentId,b.id));status.append(open);}const back=element('button','',this.origin==='settings'?'返回设置':'返回输入档案');back.addEventListener('click',()=>void this.navigate(this.origin));status.append(back);status.hidden=false;}
}
