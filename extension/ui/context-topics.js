import {request,element} from './common.js';
import {ContextTopicViewer} from './context-topic-viewer.js';
import {ContextTopicCommitSession} from './context-topic-commit.js';

const copy=(zh,en)=>document.documentElement.lang==='en'?en:zh;
const button=(text,action)=>{const node=element('button','',text);node.type='button';node.onclick=action;return node;};
const reasons={
 legacy_restricted:['现有隐私限制阻止开放这个主题。','An existing privacy restriction blocks this Topic.'],
 content_unavailable:['这个主题目前没有可开放的完整内容。','This Topic currently has no complete eligible content.'],
 selection_stale:['这个选择需要重新确认。可先关闭，再重新选择。','This choice needs confirmation. Turn it off before selecting it again.'],
 topic_unavailable:['这个主题目前不可用。','This Topic is currently unavailable.'],
 global_off:['AI 访问已暂停，主题选择已保留。','AI access is paused. Topic choices are retained.'],
 inputs_off:['此类内容仅自己可见，主题选择已保留。','This category is private. Topic choices are retained.']
};
const explain=reason=>reasons[reason]?copy(...reasons[reason]):copy('选择尚未保存，请刷新后再试。','The choice is not saved. Refresh, then try again.');
function pageValid(page){
 return page?.available===true&&page.version===1&&page.externalAllowed===false&&typeof page.epoch==='string'&&typeof page.authority==='string'&&Array.isArray(page.items)&&page.items.length<=100&&typeof page.complete==='boolean'&&page.complete===(page.nextCursor===null)&&Number.isSafeInteger(page.selectedCount)&&page.selectedCount>=0&&page.items.every(row=>typeof row.topicId==='string'&&row.topicId.length>0&&typeof row.name==='string'&&typeof row.enabled==='boolean'&&Number.isSafeInteger(row.revision)&&row.revision>=0&&typeof row.canEnable==='boolean'&&typeof row.canDisable==='boolean'&&typeof row.policyAllowed==='boolean'&&row.externalAllowed===false);
}

// Actual local choices over stable Topic IDs. There is no body reader or client
// connection here. Saved selection and present eligibility remain separate.
export class ContextTopicInputs {
 constructor({host,access,send=request,onStateChange=()=>{}}){
  this.send=send;this.access=access;this.onStateChange=onStateChange;this.active=true;this.generation=0;this.rows=new Map();this.nodes=new Map();this.openNodes=new Map();this.rowNodes=new Map();this.viewer=null;this.order=[];this.focusId=null;this.openFocusId=null;this.focusIntent=null;this.busy=false;this.loading=false;this.failedRead=false;this.lastAttempt=null;this.commit=new ContextTopicCommitSession(send);this.query='';this.selectedOnly=false;this.composing=false;
  this.root=element('div','context-inputs');this.note=element('p','topics-note');this.field=element('div','topic-field');this.field.setAttribute('role','group');this.field.setAttribute('aria-label',copy('思想库主题','Thought Library Topics'));
  this.footnote=element('p','topics-note',copy('新主题默认仅自己可见。','New Topics are private by default.'));this.status=element('div','context-notice');this.status.setAttribute('role','status');this.createFilters();this.root.append(this.note,this.filters,this.filterStatus,this.field,this.footnote,this.status);host.append(this.root);
  this.field.addEventListener('keydown',event=>this.move(event));
  this.host=host;this.cancelMovedFocus=event=>{const intent=this.focusIntent;if(intent&&event.target!==intent.origin&&event.target?.closest?.('[data-topic-id]')?.dataset.topicId!==intent.topicId)this.focusIntent=null;};
  host.addEventListener('focusin',this.cancelMovedFocus);host.addEventListener('pointerdown',this.cancelMovedFocus);this.setAccess(access);
 }
 createFilters(){
  this.filters=element('form','context-search');this.searchField=element('input');this.searchField.type='search';this.searchField.autocomplete='off';this.searchField.spellcheck=false;this.searchField.placeholder=copy('搜索主题名称','Search Topic names');this.searchField.setAttribute('aria-label',copy('搜索主题名称','Search Topic names'));
  this.searchSubmit=button(copy('搜索','Search'),()=>{});this.searchSubmit.type='submit';this.clearFilter=button(copy('清空','Clear'),()=>{if(this.filter(this.selectedOnly,''))this.searchField.value='';});
  this.allFilter=button(copy('全部','All'),()=>this.filter(false,this.query));this.selectedFilter=button(copy('已选','Selected'),()=>this.filter(true,this.query));
  for(const node of [this.allFilter,this.selectedFilter])node.className='context-topic-filter';
  this.filterStatus=element('p','topics-note context-topic-filter-status');this.filterStatus.setAttribute('role','status');
  this.searchField.addEventListener('compositionstart',()=>{this.composing=true;});this.searchField.addEventListener('compositionend',()=>{this.composing=false;});
  this.filters.addEventListener('submit',event=>{event.preventDefault();if(!event.isComposing)this.filter(this.selectedOnly,this.searchField.value);});
  this.filters.append(this.searchField,this.searchSubmit,this.clearFilter,this.allFilter,this.selectedFilter);
 }
 filter(selectedOnly,query){
  if(!this.active||this.composing||this.loading||this.busy||this.failedRead)return false;
  if(this.pending){this.unconfirmed();return false;}
  this.selectedOnly=selectedOnly===true;this.query=String(query??'');this.focusIntent=null;this.paint();return true;
 }
 visibleIds(){const query=this.query.toLowerCase();return this.order.filter(id=>{const row=this.rows.get(id);return row&&(!this.selectedOnly||row.enabled)&&row.name.toLowerCase().includes(query);});}
 get pending(){return !!this.commit.pending;}
 setAccess(access){this.access=access;this.note.textContent=!access.inputs.enabled?copy('此类内容仅自己可见，主题选择已保留。','This category is private. Topic choices are retained.'):!access.global.enabled?copy('AI 访问已暂停，主题选择已保留。','AI access is paused. Topic choices are retained.'):copy('选择可以开放的主题。外部读取目前不可用。','Choose Topics to make available. External reading is unavailable.');this.paint();}
 paint(){
  this.root.setAttribute('aria-busy',String(this.loading||this.busy));
  const visible=this.visibleIds(),shown=new Set(visible);
  for(const [node,on]of [[this.allFilter,!this.selectedOnly],[this.selectedFilter,this.selectedOnly]]){node.setAttribute('aria-pressed',String(on));node.dataset.on=String(on);}
  for(const node of [this.searchField,this.searchSubmit,this.clearFilter,this.allFilter,this.selectedFilter])node.disabled=this.loading||this.busy||this.failedRead||this.pending;
  this.filterStatus.textContent=this.failedRead?copy('主题名称暂不可用，请重试读取。','Topic names are unavailable. Retry loading.'):(this.query||this.selectedOnly)&&!visible.length?copy('没有匹配的主题。仅搜索主题名称。','No matching Topics. Search covers Topic names only.'):this.query?copy('仅搜索主题名称，不搜索正文。','Search covers Topic names, not content.'):'';
  if(!this.loading&&!this.busy&&!this.failedRead){const row=this.rows.get(this.focusId);if(!row||!shown.has(this.focusId)||(row.enabled?!row.canDisable:!row.canEnable))this.focusId=visible.find(id=>{const value=this.rows.get(id);return value.enabled?value.canDisable:value.canEnable;})||null;}
  if(!shown.has(this.openFocusId))this.openFocusId=this.focusId||visible[0]||null;
  for(const [id,node]of this.nodes){const row=this.rows.get(id);if(!row)continue;node.hidden=!shown.has(id);this.rowNodes.get(id).hidden=node.hidden;this.openNodes.get(id).tabIndex=id===this.openFocusId?0:-1;this.openNodes.get(id).disabled=this.loading||this.busy||this.failedRead||this.pending;node.dataset.on=String(row.enabled);node.dataset.paused=String(row.enabled&&(!row.policyAllowed||!this.access.global.enabled||!this.access.inputs.enabled));node.setAttribute('aria-pressed',String(row.enabled));node.tabIndex=id===this.focusId?0:-1;node.disabled=this.loading||this.busy||this.failedRead||(row.enabled?!row.canDisable:!row.canEnable);node.title=row.enabled&&!row.policyAllowed?explain(row.reason):copy('仅保存主题选择；外部读取目前不可用。','Saves the Topic choice only. External reading is unavailable.');}
 }
 notify(text,action=null){this.status.replaceChildren(element('span','',text));if(action)this.status.append(button(action.text,action.run));}
 rememberFocus(topicId=null){
  const focused=document.activeElement;
  if(this.field.contains(focused)||this.status.contains(focused)){const id=topicId||focused?.dataset?.topicId||this.focusIntent?.topicId||this.focusId;if(id)this.focusIntent={topicId:id,origin:focused};}
  else if(focused&&focused!==document.body)this.focusIntent=null;
 }
 restoreFocus(failed=false){
  const intent=this.focusIntent;this.focusIntent=null;if(!this.active||!intent)return;
  const focused=document.activeElement;if(focused&&focused!==document.body&&focused!==intent.origin&&focused.dataset?.topicId!==intent.topicId)return;
  const wanted=this.nodes.get(intent.topicId),target=failed?this.status.querySelector('button'):wanted&&!wanted.disabled&&!wanted.hidden?wanted:this.nodes.get(this.focusId);
  if(target&&!target.disabled&&!target.hidden)target.focus({preventScroll:true});else if(!failed&&!this.searchField.disabled)this.searchField.focus({preventScroll:true});
 }
 async refresh(){
  if(!this.active||this.busy||this.pending)return false;
  this.viewer?.invalidate();this.rememberFocus();const generation=++this.generation;this.loading=true;this.failedRead=false;this.paint();
  try{
   const rows=[],ids=new Set(),cursors=new Set();let cursor=null,epoch=null,authority=null,selectedCount=null;
   do{
    const page=await this.send('PAIA_CONTEXT_TOPICS_PAGE',{options:{cursor,limit:100}});
    if(!this.active||generation!==this.generation)return false;
    if(!pageValid(page))throw Error('TOPICS_UNAVAILABLE');
    if(epoch!==null&&(page.epoch!==epoch||page.authority!==authority||page.selectedCount!==selectedCount))throw Error('TOPICS_CHANGED');
    epoch=page.epoch;authority=page.authority;selectedCount=page.selectedCount;
    for(const row of page.items){if(ids.has(row.topicId)||rows.length>=4096)throw Error('TOPICS_INCOMPLETE');ids.add(row.topicId);rows.push(row);}
    cursor=page.nextCursor;
    if(cursor!==null){const key=JSON.stringify(cursor);if(!page.items.length||cursors.has(key)||cursors.size>=41)throw Error('TOPICS_INCOMPLETE');cursors.add(key);}
   }while(cursor!==null);
   this.epoch=epoch;this.authority=authority;this.selectedCount=selectedCount;this.receive(rows,this.focusIntent?.topicId);if(this.choiceRefusal)this.notify(explain(this.choiceRefusal));else this.status.replaceChildren();return true;
  }catch{
   if(!this.active||generation!==this.generation)return false;
   this.failedRead=true;this.notify(copy('暂时无法读取主题，已有选择未被更改。','Topics could not be read. Existing choices are unchanged.'),{text:copy('重试','Retry'),run:()=>void this.refresh()});return false;
  }finally{if(this.active&&generation===this.generation){this.loading=false;this.paint();this.restoreFocus(this.failedRead);this.onStateChange();}}
 }
 receive(rows,previousFocus=null){
  const focused=document.activeElement?.dataset?.topicId||previousFocus,oldIndex=this.order.indexOf(focused);this.rows=new Map(rows.map(row=>[row.topicId,row]));this.order=rows.map(row=>row.topicId);
  for(const [id,node]of this.nodes)if(!this.rows.has(id)){this.rowNodes.get(id)?.remove();this.rowNodes.delete(id);this.openNodes.delete(id);this.nodes.delete(id);}
  for(const [index,row]of rows.entries()){
   let node=this.nodes.get(row.topicId);
   if(!node){node=button('',()=>void this.toggle(row.topicId));node.className='topic-access';node.dataset.topicId=row.topicId;node.addEventListener('focus',()=>{this.focusId=row.topicId;this.openFocusId=row.topicId;this.paint();});node.append(element('span','topic-name'),element('span','state-dot'));this.nodes.set(row.topicId,node);const line=element('div','context-topic-row'),open=button('',()=>void this.openTopic(row.topicId));open.className='context-topic-open';open.dataset.topicId=row.topicId;open.addEventListener('focus',()=>{this.openFocusId=row.topicId;this.paint();});line.append(open,node);this.openNodes.set(row.topicId,open);this.rowNodes.set(row.topicId,line);}
   node.querySelector('.topic-name').textContent=row.name;this.openNodes.get(row.topicId).textContent=row.name;
   const line=this.rowNodes.get(row.topicId);if(this.field.children[index]!==line)this.field.insertBefore(line,this.field.children[index]||null);
  }
  this.empty?.remove();this.empty=null;
  if(!rows.length){this.empty=element('p','empty-detail',copy('思想库还没有可选择的主题。','There are no Topics to choose yet.'));this.field.append(this.empty);}
  if(!this.rows.has(this.focusId))this.focusId=this.order[Math.max(0,Math.min(oldIndex,this.order.length-1))]||null;
  this.paint();
 }
 async openTopic(topicId){
  if(!this.active||this.loading||this.busy||this.failedRead||this.pending||this.composing||!this.rows.has(topicId)||!this.visibleIds().includes(topicId))return false;
  this.viewer?.close();const row=this.rows.get(topicId);
  this.viewer=new ContextTopicViewer({host:this.root,send:this.send,topicId,name:row.name,onClose:()=>{this.viewer=null;const target=this.openNodes.get(topicId);if(this.active&&target&&!target.disabled&&!this.rowNodes.get(topicId)?.hidden)target.focus({preventScroll:true});}});
  return this.viewer.read();
 }
 move(event){
  const reading=event.target?.classList?.contains('context-topic-open');
  const order=this.visibleIds(),id=event.target?.closest?.('[data-topic-id]')?.dataset.topicId,index=order.indexOf(id);if(index<0||this.loading||this.busy||event.isComposing||event.keyCode===229||event.altKey||event.ctrlKey||event.metaKey)return;
  let next;
  if(event.key==='Home')next=0;else if(event.key==='End')next=order.length-1;else if(['ArrowLeft','ArrowUp'].includes(event.key))next=Math.max(0,index-1);else if(['ArrowRight','ArrowDown'].includes(event.key))next=Math.min(order.length-1,index+1);else return;
  event.preventDefault();const step=event.key==='Home'?1:event.key==='End'?-1:next>=index?1:-1;
  const nodes=reading?this.openNodes:this.nodes;while(next>=0&&next<order.length&&nodes.get(order[next])?.disabled)next+=step;
  const target=nodes.get(order[next]);if(target&&!target.disabled){if(reading)this.openFocusId=order[next];else this.focusId=order[next];this.paint();target.focus();target.scrollIntoView({block:'nearest'});}
 }
 async toggle(id){
  if(!this.active||this.busy||this.loading||this.failedRead)return false;
  if(this.pending){this.unconfirmed();return false;}
  const row=this.rows.get(id);if(!row||(row.enabled?!row.canDisable:!row.canEnable))return false;
  const change={topicId:id,enabled:!row.enabled,expectedRevision:row.revision,expectedBinding:row.enabled?row.binding:row.expectedBinding,epoch:this.epoch,operationId:crypto.randomUUID()};
  return this.save(change);
 }
 async save(change){
  if(!this.active||this.busy)return false;this.choiceRefusal=null;this.rememberFocus(change.topicId);this.busy=true;++this.generation;this.lastAttempt=change;this.paint();this.onStateChange();this.notify(copy('正在保存选择…','Saving choice…'));
  let acknowledgment=null,error=null;
  try{acknowledgment=await this.commit.save(change);}catch(reason){error=reason;}
  finally{this.busy=false;if(this.active){this.paint();this.onStateChange();}}
  if(!this.active)return false;
  if(error){
   if(error.code==='CONTEXT_INVALIDATED'){this.lastAttempt=null;const refreshed=await this.refresh();if(refreshed)this.notify(copy('内容已更新，请重新核对主题选择。','The data changed. Review the current Topic choices.'));return false;}
   this.unconfirmed();this.restoreFocus(true);return false;
  }
  this.lastAttempt=null;this.choiceRefusal=acknowledgment.result.ok?null:acknowledgment.result.reason;
  const refreshed=await this.refresh();
  if(acknowledgment.result.ok){if(refreshed){this.notify(copy('选择已保存。外部读取目前不可用。','Choice saved. External reading is unavailable.'));}return true;}
  if(refreshed)this.notify(explain(acknowledgment.result.reason));return false;
 }
 unconfirmed(){this.notify(copy('选择尚未确认，请核对上次操作。','The choice is unconfirmed. Check the previous operation.'),{text:copy('核对上次操作','Check previous operation'),run:()=>{const change=this.commit.pending?.change||this.lastAttempt;if(change)void this.save(change);else void this.refresh();}});}
 leave(){if(this.busy||this.pending){this.unconfirmed();return false;}this.suspend();return true;}
 suspend(){this.viewer?.close();++this.generation;this.loading=false;this.focusIntent=null;}
 close(){this.active=false;this.viewer?.close();++this.generation;this.focusIntent=null;this.host.removeEventListener?.('focusin',this.cancelMovedFocus);this.host.removeEventListener?.('pointerdown',this.cancelMovedFocus);}
}
