import {request,element} from './common.js';
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
  this.send=send;this.access=access;this.onStateChange=onStateChange;this.active=true;this.generation=0;this.rows=new Map();this.nodes=new Map();this.order=[];this.focusId=null;this.focusIntent=null;this.busy=false;this.loading=false;this.failedRead=false;this.lastAttempt=null;this.commit=new ContextTopicCommitSession(send);
  this.root=element('div','context-inputs');this.note=element('p','topics-note');this.field=element('div','topic-field');this.field.setAttribute('role','group');this.field.setAttribute('aria-label',copy('思想库主题','Thought Library Topics'));
  this.footnote=element('p','topics-note',copy('新主题默认仅自己可见。','New Topics are private by default.'));this.status=element('div','context-notice');this.status.setAttribute('role','status');this.root.append(this.note,this.field,this.footnote,this.status);host.append(this.root);
  this.field.addEventListener('keydown',event=>this.move(event));
  this.host=host;this.cancelMovedFocus=event=>{const intent=this.focusIntent;if(intent&&event.target!==intent.origin&&event.target?.closest?.('[data-topic-id]')?.dataset.topicId!==intent.topicId)this.focusIntent=null;};
  host.addEventListener('focusin',this.cancelMovedFocus);host.addEventListener('pointerdown',this.cancelMovedFocus);this.setAccess(access);
 }
 get pending(){return !!this.commit.pending;}
 setAccess(access){this.access=access;this.note.textContent=!access.inputs.enabled?copy('此类内容仅自己可见，主题选择已保留。','This category is private. Topic choices are retained.'):!access.global.enabled?copy('AI 访问已暂停，主题选择已保留。','AI access is paused. Topic choices are retained.'):copy('选择可以开放的主题。外部读取目前不可用。','Choose Topics to make available. External reading is unavailable.');this.paint();}
 paint(){
  this.root.setAttribute('aria-busy',String(this.loading||this.busy));
  if(!this.loading&&!this.busy&&!this.failedRead){const row=this.rows.get(this.focusId);if(!row||(row.enabled?!row.canDisable:!row.canEnable))this.focusId=this.order.find(id=>{const value=this.rows.get(id);return value.enabled?value.canDisable:value.canEnable;})||null;}
  for(const [id,node]of this.nodes){const row=this.rows.get(id);if(!row)continue;node.dataset.on=String(row.enabled);node.dataset.paused=String(row.enabled&&(!row.policyAllowed||!this.access.global.enabled||!this.access.inputs.enabled));node.setAttribute('aria-pressed',String(row.enabled));node.tabIndex=id===this.focusId?0:-1;node.disabled=this.loading||this.busy||this.failedRead||(row.enabled?!row.canDisable:!row.canEnable);node.title=row.enabled&&!row.policyAllowed?explain(row.reason):copy('仅保存主题选择；外部读取目前不可用。','Saves the Topic choice only. External reading is unavailable.');}
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
  const wanted=this.nodes.get(intent.topicId),target=failed?this.status.querySelector('button'):wanted&&!wanted.disabled?wanted:this.nodes.get(this.focusId);
  if(target&&!target.disabled)target.focus({preventScroll:true});
 }
 async refresh(){
  if(!this.active||this.busy||this.pending)return false;
  this.rememberFocus();const generation=++this.generation;this.loading=true;this.failedRead=false;this.paint();
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
  for(const [id,node]of this.nodes)if(!this.rows.has(id)){node.remove();this.nodes.delete(id);}
  for(const [index,row]of rows.entries()){
   let node=this.nodes.get(row.topicId);
   if(!node){node=button('',()=>void this.toggle(row.topicId));node.className='topic-access';node.dataset.topicId=row.topicId;node.addEventListener('focus',()=>{this.focusId=row.topicId;this.paint();});node.append(element('span','topic-name'),element('span','state-dot'));this.nodes.set(row.topicId,node);}
   node.querySelector('.topic-name').textContent=row.name;
   if(this.field.children[index]!==node)this.field.insertBefore(node,this.field.children[index]||null);
  }
  this.empty?.remove();this.empty=null;
  if(!rows.length){this.empty=element('p','empty-detail',copy('思想库还没有可选择的主题。','There are no Topics to choose yet.'));this.field.append(this.empty);}
  if(!this.rows.has(this.focusId))this.focusId=this.order[Math.max(0,Math.min(oldIndex,this.order.length-1))]||null;
  this.paint();
 }
 move(event){
  const id=event.target?.closest?.('[data-topic-id]')?.dataset.topicId,index=this.order.indexOf(id);if(index<0||this.loading||this.busy||event.isComposing||event.keyCode===229||event.altKey||event.ctrlKey||event.metaKey)return;
  let next;
  if(event.key==='Home')next=0;else if(event.key==='End')next=this.order.length-1;else if(['ArrowLeft','ArrowUp'].includes(event.key))next=Math.max(0,index-1);else if(['ArrowRight','ArrowDown'].includes(event.key))next=Math.min(this.order.length-1,index+1);else return;
  event.preventDefault();const step=event.key==='Home'?1:event.key==='End'?-1:next>=index?1:-1;
  while(next>=0&&next<this.order.length&&this.nodes.get(this.order[next])?.disabled)next+=step;
  const target=this.nodes.get(this.order[next]);if(target&&!target.disabled){this.focusId=this.order[next];this.paint();target.focus();target.scrollIntoView({block:'nearest'});}
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
 suspend(){++this.generation;this.loading=false;this.focusIntent=null;}
 close(){this.active=false;++this.generation;this.focusIntent=null;this.host.removeEventListener?.('focusin',this.cancelMovedFocus);this.host.removeEventListener?.('pointerdown',this.cancelMovedFocus);}
}
