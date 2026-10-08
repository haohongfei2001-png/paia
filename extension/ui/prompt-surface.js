import {PromptListSession} from '../core/prompt-family.js';
import {copyPrompt} from '../core/prompt-clipboard.js';
if(location.hash.startsWith('#next-')){void import('./prompt-next.js');}else{
const nonce=location.hash.slice(1),session=new PromptListSession(),list=document.getElementById('list'),editor=document.getElementById('editor'),status=document.getElementById('status');
let refreshing=false,manualOrder=[],revision=0,hidden=false,editing=false,busy=false,composing=false,drag=null,epoch=0;
const attempted=new Set();
async function rpc(command){const r=await chrome.runtime.sendMessage({type:'PAIA_PROMPT_SURFACE_RPC',nonce,command});if(!r?.ok)throw Error(r?.error||'UNAVAILABLE');return r.data;}
const button=(text,fn,label=text)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label);if(busy||refreshing){b.dataset.pendingDisabled='0';b.disabled=true;}b.addEventListener('click',e=>{if(e.isTrusted)void fn(e);});return b;};
function pending(value){busy=value;for(const b of document.querySelectorAll('button,textarea,input')){if(value){if(!('pendingDisabled' in b.dataset))b.dataset.pendingDisabled=b.disabled?'1':'0';b.disabled=true;}else if('pendingDisabled' in b.dataset){b.disabled=b.dataset.pendingDisabled==='1';delete b.dataset.pendingDisabled;}}}
let feedbackTimer;
const tell=(text,temporary=false)=>{clearTimeout(feedbackTimer);status.replaceChildren(...(text?[document.createTextNode(text)]:[]));if(temporary)feedbackTimer=setTimeout(()=>tell(''),1800);};
async function refresh(internal=false){
 if(editing||(busy&&internal!==true)||drag||refreshing)return;
 refreshing=true;pending(true);const ticket=++epoch;try{const q=await rpc({type:'PAIA_PROMPT_QUERY',includeHidden:hidden});if(ticket!==epoch)return;revision=q.revision;manualOrder=q.manualOrder;session.open(q);attempted.clear();render();tell('');}catch{tell('暂时不可用。请在 PAIA 启用授权后刷新。');}finally{refreshing=false;pending(false);}
}
function focusRow(id){list.querySelector(`[data-id="${id}"] .more`)?.focus();}
async function change(action,id,extra={}){
 const result=await rpc({type:'PAIA_PROMPT_CHANGE',change:{action,id,revision,...extra}});revision=result.revision;return result;
}
async function manage(action,item,extra={}){if(busy||composing)return;pending(true);try{await change(action,item.id,extra);editing=false;editor.hidden=true;list.hidden=false;await refresh(true);focusRow(item.id);}catch{tell('未保存。内容可能已变化；你的编辑仍保留，请取消后刷新再试。');}finally{pending(false);}}
async function insert(item,b){
 if(editing||busy||drag||composing||attempted.has(item.id))return;
 attempted.add(item.id);b.disabled=true;pending(true);tell('正在插入…');
 let verified=false;
 try{const r=await rpc({type:'PAIA_PROMPT_INSERT',id:item.id,text:item.text,operationId:crypto.randomUUID()});verified=r.status==='inserted'&&r.verified===true;tell(verified?'已插入，未发送。':r.status==='uncertain'||r.status==='inserted'?'插入结果未确认。请先检查草稿，不会自动重试。':'无法安全插入；请检查输入框或手动复制。',verified);}catch{tell('插入结果未确认。请先检查草稿，不会自动重试。');}finally{pending(false);}
 if(verified)return;
 const copy=button('复制',async()=>{try{const x=await rpc({type:'PAIA_PROMPT_COPY_TEXT',id:item.id,text:item.text}),r=await copyPrompt(x.text);tell(r.status==='copied'?'已复制，请手动粘贴。':'未能复制，请检查浏览器权限。');}catch{tell('此 Prompt 已变化，请刷新。');}});status.append(copy);
}
function edit(item){
 if(busy||drag||editing)return;editing=true;++epoch;parkEditor();editor.replaceChildren();editor.hidden=false;
 const row=item&&list.querySelector(`[data-id="${item.id}"]`);list.hidden=!row;if(row){for(const tools of list.querySelectorAll('.tools'))tools.remove();row.classList.add('editing-row');row.after(editor);editor.className='inline-editor';}
 const label=document.createElement('label');const caption=document.createElement('span');caption.className='editor-label';caption.textContent='复用文本';label.append(caption);const area=document.createElement('textarea');area.value=item?.text||'';area.maxLength=200000;area.setAttribute('aria-label','复用文本');label.append(area);
 area.addEventListener('compositionstart',()=>{composing=true;});area.addEventListener('compositionend',()=>{composing=false;});
 const actions=document.createElement('div');actions.className='actions';actions.append(button('保存',async()=>{if(composing||!area.value.trim()||busy)return;pending(true);try{await change(item?'edit':'create',item?.id,{text:area.value});editing=false;editor.hidden=true;list.hidden=false;await refresh(true);if(item)focusRow(item.id);}catch{tell('未保存，编辑已保留。取消后刷新可重新编辑。');}finally{pending(false);}}),button('取消',()=>{if(composing||busy)return;editing=false;editor.hidden=true;list.hidden=false;void refresh();}));editor.append(label,actions);area.style.height=Math.min(180,Math.max(36,area.scrollHeight))+'px';area.focus();
}
async function split(item){
 if(busy)return;parkEditor();editing=true;++epoch;editor.hidden=false;list.hidden=true;editor.replaceChildren();
 try{const members=await rpc({type:'members',id:item.id}),title=document.createElement('p');title.textContent='选择要独立保留、不再自动合并的原表达。';editor.append(title);
 const chosen=new Set();for(const m of members){const label=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.addEventListener('change',()=>{if(box.checked)chosen.add(m.id);else chosen.delete(m.id);});label.append(box,document.createTextNode(m.text));editor.append(label);}
 editor.append(button('拆分',()=>{if(!chosen.size||chosen.size===members.length){tell('请选择一部分表达。');return;}void manage('split',item,{inputIds:[...chosen]});}),button('取消',()=>{editing=false;editor.hidden=true;list.hidden=false;void refresh();}));
 }catch{tell('表达已变化，取消后刷新。');editor.append(button('返回',()=>{editing=false;editor.hidden=true;list.hidden=false;void refresh();}));}
}
function order(item,beforeId=null){const pins=manualOrder.filter(id=>id!==item.id);const index=pins.indexOf(beforeId);pins.splice(index<0?pins.length:index,0,item.id);return pins;}
// Presentation helpers reuse the same edit and reorder commands and guards.
function parkEditor(){document.getElementById('card').insertBefore(editor,status);editor.className='';for(const row of list.querySelectorAll('.editing-row'))row.classList.remove('editing-row');}
function dragHandle(item,row,short=false){
   const handle=button(short?'':'拖动排序',()=>{},short?'拖动此 Prompt':'拖动到目标行之前；也可使用上移下移');handle.className=short?'grip':'handle';
   handle.addEventListener('pointerdown',e=>{if(!e.isTrusted||e.button!==0||busy||editing)return;drag={item,startY:e.clientY,target:null,moved:false};handle.setPointerCapture(e.pointerId);row.classList.add('moving');});
   handle.addEventListener('pointermove',e=>{if(!drag||Math.abs(e.clientY-drag.startY)<5&&!drag.moved)return;drag.moved=true;for(const n of list.querySelectorAll('.target'))n.classList.remove('target');const target=[...list.querySelectorAll('.row')].find(n=>{const r=n.getBoundingClientRect();return e.clientY>=r.top&&e.clientY<=r.bottom;});if(target&&target!==row){drag.target=target.dataset.id;target.classList.add('target');}});
   handle.addEventListener('pointerup',()=>{const d=drag;drag=null;row.classList.remove('moving');if(d?.moved&&d.target)void manage('pin',d.item,{order:order(d.item,d.target)});});handle.addEventListener('pointercancel',()=>{drag=null;render();});return handle;
}
function render(){
 parkEditor();list.replaceChildren();const items=session.current();if(!items.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=hidden?'没有隐藏的 Prompt。':'常用表达会出现在这里，也可以新建自己的 Prompt。';list.append(empty);}
 for(const item of items){
  const row=document.createElement('div');row.className='row';row.dataset.id=item.id;
  const insertButton=button('',()=>insert(item,insertButton),item.text),text=document.createElement('span');text.className='text';text.textContent=item.text;insertButton.className='insert';insertButton.append(text);const disabled=item.hidden||attempted.has(item.id);insertButton.disabled=busy||refreshing||disabled;if(busy||refreshing)insertButton.dataset.pendingDisabled=disabled?'1':'0';
  const more=button('⋯',()=>{if(busy||refreshing||editing)return;const old=row.nextElementSibling;if(old?.className==='tools'){old.remove();more.setAttribute('aria-expanded','false');return;}for(const el of list.querySelectorAll('.tools'))el.remove();const tools=document.createElement('div');tools.className='tools';tools.setAttribute('aria-label','管理 Prompt');more.setAttribute('aria-expanded','true');
   tools.append(button('编辑',()=>edit(item)),button(item.pinned?'取消置顶':'置顶',()=>manage(item.pinned?'unpin':'pin',item)),button(item.hidden?'恢复':'隐藏',()=>manage(item.hidden?'show':'hide',item)));
   if(item.members.length>1)tools.append(button('拆分',()=>split(item)));
   if(item.edited&&item.members.length===0)tools.append(button('删除',()=>{tools.replaceChildren(document.createTextNode('删除此复用模板？历史内容不受影响。'),button('确认删除',()=>manage('delete',item)),button('取消',()=>tools.remove()));}));
   const pinned=items.filter(x=>x.pinned),index=pinned.findIndex(x=>x.id===item.id);
   tools.append(button('上移',()=>manage('pin',item,{order:order(item,item.pinned?pinned[Math.max(0,index-1)]?.id:pinned[0]?.id)})),button('下移',()=>manage('pin',item,{order:order(item,pinned[index+2]?.id)})));
   tools.append(dragHandle(item,row));row.after(tools);
  },'管理此 Prompt');more.className='more';more.setAttribute('aria-expanded','false');const editButton=button('',()=>edit(item),'编辑此 Prompt');editButton.className='edit-shortcut';row.append(insertButton,dragHandle(item,row,true),editButton,more);list.append(row);
 }
}
async function requestClose(event){
 if(composing||event?.isComposing||event?.keyCode===229)return;
 if(editing){tell('请先保存或取消编辑。');return;}
 if(busy||refreshing||drag)return;
 // Freeze admission while the existing authenticated close RPC is in flight.
 pending(true);try{await rpc({type:'close'});}catch{tell('无法关闭，请稍后重试。');}finally{pending(false);}
}
document.getElementById('new').addEventListener('click',()=>edit(null));document.getElementById('refresh').addEventListener('click',refresh);document.getElementById('hidden').addEventListener('click',()=>{if(editing||busy)return;hidden=!hidden;void refresh();});document.getElementById('close').addEventListener('click',e=>{if(e.isTrusted)void requestClose(e);});
document.getElementById('card').addEventListener('keydown',e=>{if(e.isTrusted&&e.key==='Escape'&&!composing&&!e.isComposing&&e.keyCode!==229){e.preventDefault();void requestClose(e);}});
chrome.runtime.onMessage.addListener((r,s,reply)=>{if(r?.type==='PAIA_PROMPT_NEXT_ACTIVITY'){if(s.id===chrome.runtime.id&&!s.tab&&r.nonce===nonce)reply({idle:!editing&&!busy&&!composing&&!drag&&!refreshing});return;}if(r?.type==='PAIA_PROMPT_SURFACE_REQUEST_CLOSE'){if(s.id!==chrome.runtime.id||s.tab||r.nonce!==nonce)return;void requestClose();reply({received:true});return;}if(refreshing)return;if(!['PAIA_PROMPT_CHANGED','ARCHIVE_CHANGED'].includes(r?.type))return;const ticket=++epoch;void rpc({type:'PAIA_PROMPT_QUERY',includeHidden:hidden}).then(q=>{if(ticket!==epoch)return;if(!editing)revision=q.revision;session.reconcile(q);if(!editing&&!drag){const ids=new Set(session.current().map(x=>x.id));for(const row of [...list.querySelectorAll('.row')])if(!ids.has(row.dataset.id)){if(row.nextElementSibling?.className==='tools')row.nextElementSibling.remove();row.remove();}}},()=>{if(ticket!==epoch)return;if(!editing){list.replaceChildren();tell('内容已变化，请刷新。');}});});
void refresh();
const next=document.createElement('button');next.id='next-reopen';next.textContent='本轮建议';next.hidden=true;document.querySelector('nav').insertBefore(next,document.getElementById('close'));
let nextAvailabilityEpoch=0;
async function nextAvailable(){const ticket=++nextAvailabilityEpoch;try{const value=await rpc({type:'next_available'});if(ticket===nextAvailabilityEpoch)next.hidden=!value.available;}catch{if(ticket===nextAvailabilityEpoch)next.hidden=true;}}
next.addEventListener('click',e=>{if(e.isTrusted&&!busy&&!editing&&!drag&&!composing){const ticket=nextAvailabilityEpoch;void rpc({type:'next_reopen'}).catch(()=>{if(ticket===nextAvailabilityEpoch)next.hidden=true;});}});
chrome.runtime.onMessage.addListener((r,s)=>{if(s.id===chrome.runtime.id&&!s.tab&&r.type==='PAIA_PROMPT_NEXT_CHANGED')void nextAvailable();});void nextAvailable();

// An inactive cross-origin frame retains its last focused element. Reveal controls only while this document actually owns focus.
const reflectFocus=()=>document.documentElement.toggleAttribute('data-focused',document.hasFocus());
window.addEventListener('focus',reflectFocus);window.addEventListener('blur',reflectFocus);reflectFocus();

}
