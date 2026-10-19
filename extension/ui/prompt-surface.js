import {quickPromptEligible,promptGraphemeCount} from '../core/prompt-reuse-preferences.js';
import {mountPromptAssist} from './prompt-assist-view.js';
import {createIcon} from './icons.js';
import {PromptHistorySession} from './prompt-history-session.js';
import {PromptListSession} from '../core/prompt-family.js';
import {copyPrompt} from '../core/prompt-clipboard.js';
import {resolveAppearance,resolveLanguage} from './ux-r1-state.js';
if(location.hash.startsWith('#next-')){void import('./prompt-next.js');}else{
const nonce=location.hash.slice(1),session=new PromptListSession(),list=document.getElementById('list'),editor=document.getElementById('editor'),status=document.getElementById('status');
const checkText=document.getElementById('check-text'),searchInput=document.getElementById('search-query'),history=new PromptHistorySession(({query,cursor,searchSnapshot})=>rpc({type:'PAIA_PROMPT_HISTORY_QUERY',query,cursor,searchSnapshot}));
let assistSurface=null,automaticSuggestion=false;
let candidateTarget=null,candidateReady=false,candidateRequest=0;
let mode='candidates',projectionGeneration=0,searchComposing=false,searchLoading=false,historyFailure=false,searchTimer=null;
let checking=null,checkingRequest=null,copyRequest=null,layoutScheduled=false,lastMeasuredHeight=0,lastMinimumHeight=0,lastAppearance=null,lastLanguage=null,layoutPending=false,layoutDirty=false,pointerGesture=false,layoutTicket=0,disposed=false;
let representativeChoice=null,splitChoice=null,historyReturnView=null,pendingListReturn=null,historyFocusedRow=null,returnIntent=0;
let oversizedItems=[],showOversized=false,heldActivationKey=null;
const activationKey=event=>event?.detail===0?heldActivationKey:null;
function trackActivation(button){
 if(button?.tagName!=='BUTTON')throw Error('INVALID_ACTIVATION_CONTROL');
 button.addEventListener('keydown',event=>{if(!event.isTrusted||event.isComposing||event.keyCode===229||!['Enter',' '].includes(event.key))return;if(event.repeat){event.preventDefault();event.stopImmediatePropagation();return;}heldActivationKey=event.key;});
 button.addEventListener('keyup',event=>{if(event.isTrusted&&event.key===heldActivationKey)heldActivationKey=null;});
}
let refreshing=false,manualOrder=[],revision=0,hidden=false,editing=false,busy=false,composing=false,drag=null,epoch=0;
const attempted=new Set();

// Translate only this surface's UI copy. Original authored bodies stay untouched.
const copy={
 '本轮 AI 建议':'Current AI suggestion','正在准备本轮建议；常用输入仍可使用。':'Preparing a suggestion. Saved prompts remain available.','本轮 AI 建议暂不可用；常用输入仍可使用。':'AI suggestions are unavailable. Saved prompts remain available.','请先在 PAIA 设置中分别允许本轮回复读取与远端处理。':'In PAIA settings, separately allow current-reply access and remote processing.','启用后等待当前回复完成，再明确请求建议。':'Wait for a reply to finish after enabling, then explicitly request a suggestion.','本轮没有必要的新建议。':'No new suggestion is necessary for this reply.','本轮回复或相关 Context 已变化，请重新请求。':'The current reply or relevant Context changed. Request a suggestion again.',
 '较长的常用表达':'Long expressions','仅匹配到较长表达，请在 PAIA 中继续查看。':'These matches are longer expressions. Continue in PAIA.','没有可快速复用的表达。':'No quick expressions available.','最多 150 个字符；编辑仍保留。':'At most 150 characters. Your edit is retained.','当前输入框无法原样保留 CRLF 换行，请复制原文。':'This composer cannot preserve CRLF line endings exactly. Copy the original text.','核对全文':'View full text','展开常用表达':'Expand frequent expressions','收起为胶囊':'Collapse to capsule','收起为圆球':'Collapse to orb',
 '为当前任务选择历史候选':'Select historical candidates for this task','采用已准备的历史候选':'Use prepared historical candidates','候选已准备；返回常用输入后可明确采用。':'Candidates are ready. Return to frequent inputs to use them explicitly.','历史候选暂不可用；常用输入和本机搜索仍可使用。':'Historical candidates are unavailable. Frequent inputs and local search remain available.',
 '选择代表原文':'Choose representative original','选择此 Family 的代表原文。':'Choose the original expression that represents this Family.','正在读取当前原文…':'Reading current original expressions…','原文已变化，请取消后重新选择。':'The original expressions changed. Cancel and choose again.',
 '更多列表操作':'More list actions','清除搜索':'Clear search','搜索全部档案':'Search all Archive Inputs','搜索':'Search','返回常用输入':'Back to frequent inputs','上一页':'Previous page','下一页':'Next page','打开 PAIA':'Open PAIA','请输入搜索词。':'Enter a search term.','正在继续搜索本机输入…':'Searching local Inputs…','没有找到匹配内容。':'No matches.','本页结果；还有更多内容。':'This page; more results are available.','档案仍在变化，请重新搜索。':'Archive is still changing. Search again.','当前档案输入':'Current Archive Input','填入选段':'Insert selection','复制选段':'Copy selection','取消选区':'Clear selection','已保存为独立常用表达。':'Saved as an independent expression.',
 '常用输入':'Frequent inputs','PAIA 常用输入':'PAIA Frequent inputs','Prompt 列表':'Prompt list','核对完整表达':'Review full text','列表操作':'List actions','新建 Prompt':'New Prompt','刷新列表':'Refresh list','显示隐藏的 Prompt':'Show hidden Prompts','关闭卡片':'Close card','隐藏项':'Hidden','本轮建议':'Suggestions',
 '暂时不可用。请在 PAIA 启用授权后刷新。':'Temporarily unavailable. Enable access in PAIA, then refresh.',
 '手工创建的常用表达':'Your manually created expression','你修改的常用表达':'Your edited expression','常用表达':'Frequent expression','填入整条':'Insert full text','复制整条':'Copy full text','返回':'Back',
 '此表达已变化，请刷新。':'This expression changed. Please refresh.','已复制，请手动粘贴。':'Copied. Paste it manually.','未能复制，请检查浏览器权限。':'Could not copy. Check browser permissions.',
 '未保存。内容可能已变化；你的编辑仍保留，请取消后刷新再试。':'Not saved. The content may have changed. Your edit is retained; cancel and refresh to retry.',
 '正在插入…':'Inserting…','已插入，未发送。':'Inserted, not sent.','插入结果未确认。请先检查草稿，不会自动重试。':'Insertion is unconfirmed. Check your draft; it will not retry automatically.','无法安全插入；请检查输入框或手动复制。':'Cannot insert safely. Check the input or copy manually.','复制':'Copy','此 Prompt 已变化，请刷新。':'This Prompt changed. Please refresh.',
 '复用文本':'Reusable text','保存':'Save','未保存，编辑已保留。取消后刷新可重新编辑。':'Not saved. Your edit is retained. Cancel and refresh to edit again.','取消':'Cancel','选择要独立保留、不再自动合并的原表达。':'Select original expressions to keep separate from automatic grouping.','拆分':'Split','请选择一部分表达。':'Select some, but not all, expressions.','表达已变化，取消后刷新。':'The expression changed. Cancel and refresh.',
 '拖动排序':'Drag to reorder','拖动此 Prompt':'Drag this Prompt','拖动到目标行之前；也可使用上移下移':'Drag before another row, or use Move up and Move down.','没有隐藏的 Prompt。':'No hidden Prompts.','常用表达会出现在这里，也可以新建自己的 Prompt。':'Frequent expressions appear here. You can also create a Prompt.',
 '管理 Prompt':'Manage Prompt','编辑':'Edit','取消置顶':'Unpin','置顶':'Pin','恢复':'Restore','隐藏':'Hide','删除':'Delete','删除此复用模板？历史内容不受影响。':'Delete this reusable template? Historical content is unchanged.','确认删除':'Confirm delete','上移':'Move up','下移':'Move down','管理此 Prompt':'Manage this Prompt','复制此 Prompt':'Copy this Prompt','编辑此 Prompt':'Edit this Prompt','请先保存或取消编辑。':'Save or cancel your edit first.','无法关闭，请稍后重试。':'Cannot close. Please try again.','内容已变化，请刷新。':'Content changed. Please refresh.'
};
let displayEpoch=0,language='zh-CN',displayPreferences={appearance:'system',language:'system'};
const copyBindings=new Map(),systemAppearance=matchMedia('(prefers-color-scheme:dark)');
const localize=value=>language==='en'?(copy[value]??value):value;
function bindCopy(node,value,attribute=null){let entries=copyBindings.get(node);if(!entries){entries=new Map();copyBindings.set(node,entries);}entries.set(attribute,value);if(attribute)node.setAttribute(attribute,localize(value));else node.textContent=localize(value);return node;}
function copyText(value){return bindCopy(document.createTextNode(''),value);}
function applyDisplay(preferences=displayPreferences){
 displayPreferences=preferences??displayPreferences;language=resolveLanguage(displayPreferences.language,navigator.language);
 document.documentElement.lang=language;document.documentElement.dataset.paiaTheme=resolveAppearance(displayPreferences.appearance,systemAppearance.matches);
 for(const [node,entries]of copyBindings){if(!node.isConnected){copyBindings.delete(node);continue;}for(const [attribute,value]of entries){if(attribute)node.setAttribute(attribute,localize(value));else node.textContent=localize(value);}}
 document.title=localize('PAIA 常用输入');scheduleLayout();
}
for(const [selector,label,attribute]of [['#capsule','常用表达','aria-label'],['#long-expressions','较长的常用表达'],['#collapse-capsule','收起为胶囊'],['#collapse-orb','收起为圆球'],['#surface-more','更多列表操作','aria-label'],['#search-clear','清除搜索','aria-label'],['#open-search','搜索全部档案','aria-label'],['#leave-search','返回常用输入','aria-label'],['#search-query','搜索全部档案','aria-label'],['#search-query','搜索全部档案','placeholder'],['#search-previous','上一页'],['#search-next','下一页'],['#open-paia','打开 PAIA'],['#card','常用输入','aria-label'],['header span','常用输入'],['#list','Prompt 列表','aria-label'],['#check-text','核对完整表达','aria-label'],['#surface-tools','列表操作','aria-label'],['#new','新建 Prompt','aria-label'],['#refresh','刷新列表','aria-label'],['#hidden','显示隐藏的 Prompt','aria-label'],['#hidden','隐藏项'],['#close','关闭卡片','aria-label']])bindCopy(document.querySelector(selector),label,attribute);
document.getElementById('open-search').replaceChildren(createIcon('search'));
systemAppearance.addEventListener('change',()=>applyDisplay());

async function rpc(command){const r=await chrome.runtime.sendMessage({type:'PAIA_PROMPT_SURFACE_RPC',nonce,command});if(!r?.ok)throw Error(r?.error||'UNAVAILABLE');return r.data;}
const button=(text,fn,label=text)=>{const b=document.createElement('button');b.type='button';bindCopy(b,text);bindCopy(b,label,'aria-label');if(busy||refreshing){b.dataset.pendingDisabled='0';b.disabled=true;}trackActivation(b);b.addEventListener('click',e=>{if(e.isTrusted&&e.detail<2)void fn(e);});return b;};
function pending(value){busy=value;for(const b of document.querySelectorAll('button,textarea,input')){if((b===searchInput||b.id==='search-clear')&&mode==='search')continue;if(value){if(!('pendingDisabled' in b.dataset))b.dataset.pendingDisabled=b.disabled?'1':'0';b.disabled=true;}else if('pendingDisabled' in b.dataset){b.disabled=b.dataset.pendingDisabled==='1';delete b.dataset.pendingDisabled;}}}
let feedbackTimer,feedbackOwner=null;
const assistFeedbackOwner=Object.freeze({});
const tell=(text,temporary=false,owner=null)=>{feedbackOwner=owner;clearTimeout(feedbackTimer);status.dataset.quiet=String(temporary);status.replaceChildren(...(text?[copyText(text)]:[]));if(temporary)feedbackTimer=setTimeout(()=>tell(''),480);};
async function refresh(internal=false){
 if(mode==='search'){if(!editing&&!checking)await runHistory();return;}
 if(checking||editing||(busy&&internal!==true)||drag||refreshing)return;
 refreshing=true;pending(true);const ticket=++epoch,displayTicket=++displayEpoch;try{const q=await rpc({type:'PAIA_PROMPT_QUERY',includeHidden:hidden});if(ticket!==epoch)return;if(displayTicket===displayEpoch)applyDisplay(q.displayPreferences);if(q.surfaceForm)document.documentElement.dataset.surfaceForm=q.surfaceForm;automaticSuggestion=q.automaticSuggestion===true;revision=q.revision;projectionGeneration=q.generation;manualOrder=q.manualOrder;oversizedItems=q.oversizedItems||[];session.open(q);candidateTarget=q.target;attempted.clear();render();tell('');}catch{tell('暂时不可用。请在 PAIA 启用授权后刷新。');}finally{refreshing=false;pending(false);if(document.hasFocus?.()&&document.activeElement===document.body&&document.documentElement.dataset.surfaceForm!=='capsule')list.querySelector('.insert:not(:disabled)')?.focus();}
}
// The board retains one fixed ordinary rectangle in every internal view.
// Accessibility minimums may constrain its viewport, never its content identity.
function contentHeight(node){
 const style=getComputedStyle(node);let total=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);
 for(const child of node.children){if(child.hidden||getComputedStyle(child).display==='none')continue;const css=getComputedStyle(child);total+=child.getBoundingClientRect().height+(parseFloat(css.marginTop)||0)+(parseFloat(css.marginBottom)||0);}
 return total;
}
// Only flow boxes consume the board budget; quiet live feedback is absolute.
function flowHeight(node){
 const style=getComputedStyle(node);if(style.display==='none'||['absolute','fixed'].includes(style.position))return 0;
 return node.getBoundingClientRect().height+(parseFloat(style.marginTop)||0)+(parseFloat(style.marginBottom)||0);
}
function measureLayout(){
 layoutScheduled=false;if(disposed)return;if(layoutPending||pointerGesture){layoutDirty=true;return;}const card=document.getElementById('card'),visible=card.clientWidth>0;if(!visible&&document.documentElement.dataset.surfaceForm!=='capsule')return;
 // The R3 capsule hides the board, not its display owner. Publish appearance
 // and language with the last valid envelope; hidden boxes cannot remeasure it.
 let minimumHeight=lastMinimumHeight||108,height=lastMeasuredHeight||328;
 if(visible){
  const header=document.querySelector('header'),chrome=flowHeight(header)+flowHeight(status);
  const row=list.querySelector('.row'),line=Math.max(44,row?.getBoundingClientRect().height||0,parseFloat(getComputedStyle(card).fontSize)*1.55);
  minimumHeight=Math.min(1024,Math.ceil(chrome+line+16));height=Math.max(328,minimumHeight);
 }
 const appearance=document.documentElement.dataset.paiaTheme||resolveAppearance(displayPreferences.appearance,systemAppearance.matches);
 if(height===lastMeasuredHeight&&minimumHeight===lastMinimumHeight&&appearance===lastAppearance&&language===lastLanguage){restoreListReturn();return;}lastMeasuredHeight=height;lastMinimumHeight=minimumHeight;lastAppearance=appearance;lastLanguage=language;
 const ticket=++layoutTicket;let acknowledged=false;layoutPending=true;document.documentElement.setAttribute('data-layout-pending','');
 void rpc({type:'measure',height,minimumHeight,appearance,language}).then(()=>{acknowledged=true;}).catch(()=>{if(!disposed&&ticket===layoutTicket){lastMeasuredHeight=0;lastMinimumHeight=0;}}).finally(()=>{if(disposed||ticket!==layoutTicket)return;layoutPending=false;document.documentElement.removeAttribute('data-layout-pending');if(!acknowledged)pendingListReturn=null;if(layoutDirty){layoutDirty=false;scheduleLayout();}else if(acknowledged)restoreListReturn();});
}
function scheduleLayout(){if(!layoutScheduled){layoutScheduled=true;requestAnimationFrame(measureLayout);}}
// A live pointer gesture owns its current frame geometry through the click.
// Defer only the next measurement; keyboard, blur and IME logic keep their owners.
document.addEventListener('pointerdown',event=>{if(event.isTrusted)pointerGesture=true;},true);
const finishPointer=()=>{if(!pointerGesture)return;pointerGesture=false;if(layoutDirty){layoutDirty=false;scheduleLayout();}};
document.addEventListener('pointerup',finishPointer,true);document.addEventListener('pointercancel',finishPointer,true);document.addEventListener('pointerout',event=>{if(!event.relatedTarget)finishPointer();},true);window.addEventListener('blur',finishPointer);
new ResizeObserver(scheduleLayout).observe(document.getElementById('card'));
new MutationObserver(scheduleLayout).observe(document.getElementById('card'),{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden','style']});
const currentItems=()=>mode==='search'?history.items:showOversized?structuredClone(oversizedItems):session.current();
const selectionRef=item=>item.ref??{kind:item.edited?'manual_reuse':'prompt_family',id:item.id,revision,generation:projectionGeneration};
// A completion may change eligibility while another original action owns pending.
// Update its saved state without enabling the control before that action's ACK.
function setPendingEligibility(control,disabled){
 if('pendingDisabled' in control.dataset){control.dataset.pendingDisabled=disabled?'1':'0';control.disabled=true;}
 else control.disabled=busy||refreshing||disabled;
}
function paintCapsule(){
 const item=session.current().find(row=>!row.hidden&&quickPromptEligible(row.text)),text=document.getElementById('capsule-text'),use=document.getElementById('capsule-use');
 if(!text||!use)return;const suggestion=assistSurface?.state.result;if(suggestion&&quickPromptEligible(suggestion.text)){text.textContent=suggestion.text;setPendingEligibility(use,assistSurface.state.busy||assistSurface.state.attempted);assistSurface.state.markPresented(suggestion);use.dataset.suggestion='true';return;}delete use.dataset.suggestion;text.textContent=automaticSuggestion?'':item?.text||localize('没有可快速复用的表达。');setPendingEligibility(use,automaticSuggestion||!item||attempted.has(item.id));
}
async function setSurfaceForm(form){
 if(editing||checking||busy||refreshing||drag||composing||searchComposing)return;
 pending(true);try{const result=await rpc({type:'surface_form',form});document.documentElement.dataset.surfaceForm=result.form==='orb'?'board':result.form;paintCapsule();}catch{tell('无法关闭，请稍后重试。');}finally{pending(false);if(form==='board'&&document.hasFocus?.())list.querySelector('.insert:not(:disabled)')?.focus();}
}
function clipped(item,node){return /[\r\n\t]/.test(item.text)||/^\s|\s$| {2}/.test(item.text)||node.scrollWidth>node.clientWidth+1;}
function leaveCheck(restoreFocus=true){
 if(!checking)return;const prior=checking;checking=null;checkText.hidden=true;checkText.replaceChildren();list.hidden=false;list.scrollTop=prior.scrollTop;
 // CHECK_TEXT may have a shorter viewport. Returning focus there would scroll
 // the original row before the host has acknowledged the list's real height.
 pendingListReturn=restoreFocus?{...prior.returnView,ticket:epoch,intent:returnIntent}:null;scheduleLayout();
}
async function readSelection(item,range=null){
 if(item.ref||range!==null)return rpc({type:'PAIA_PROMPT_SELECTION_READ',ref:selectionRef(item),range});
 return rpc({type:'PAIA_PROMPT_COPY_TEXT',id:item.id,text:item.text});
}
async function checkWhole(item){
 if(busy||editing||composing||drag)return;const ticket=++epoch;checkingRequest=ticket;pending(true);
 try{const current=await readSelection(item);if(disposed||checkingRequest!==ticket||ticket!==epoch||current.text!==item.text||!currentItems().some(x=>x.id===item.id&&x.text===item.text))throw Error('changed');const row=[...list.querySelectorAll('.row')].find(n=>n.dataset.id===item.id),ref=current.ref??selectionRef(item);checking={item,ref,range:null,target:current.target,scrollTop:list.scrollTop,returnView:{mode,query:history.query,cursor:history.cursor,snapshot:history.snapshot,revision,generation:projectionGeneration,ref:structuredClone(ref),id:item.id,control:'more',offset:row?row.getBoundingClientRect().top-list.getBoundingClientRect().top:0,scroll:list.scrollTop}};list.hidden=true;checkText.hidden=false;checkText.replaceChildren();
 const note=document.createElement('p');bindCopy(note,item.ref?.kind==='history_input'?'当前档案输入':item.members.length===0?'手工创建的常用表达':item.edited?'你修改的常用表达':'常用表达');const body=document.createElement('div');body.className='check-body';body.tabIndex=0;body.textContent=current.text;
 const actions=document.createElement('div');actions.className='actions';const fill=button('填入整条',async e=>{await insert(item,e.currentTarget,true,activationKey(e));}),copy=button('复制整条',()=>copyWhole(item,true)),clear=button('取消选区',()=>{if(checking){checking.range=null;getSelection()?.removeAllRanges();labels();}});clear.hidden=true;
 const labels=()=>{if(!checking)return;bindCopy(fill,checking.range?'填入选段':'填入整条');bindCopy(fill,checking.range?'填入选段':'填入整条','aria-label');bindCopy(copy,checking.range?'复制选段':'复制整条');bindCopy(copy,checking.range?'复制选段':'复制整条','aria-label');clear.hidden=!checking.range;};
 const selected=()=>{if(checking?.item!==item)return;const selection=getSelection();if(!selection?.rangeCount)return;const range=selection.getRangeAt(0);if(!body.contains(range.startContainer)||!body.contains(range.endContainer))return;const before=range.cloneRange();before.selectNodeContents(body);before.setEnd(range.startContainer,range.startOffset);const start=before.toString().length,end=start+range.toString().length;checking.range=end>start?{start,end}:null;labels();};
 checking.readRange=selected;body.addEventListener('pointerup',selected);body.addEventListener('keyup',selected);actions.addEventListener('pointerdown',e=>{if(e.isTrusted)e.preventDefault();});actions.append(fill,copy,clear,button('返回',()=>leaveCheck()));checkText.append(note,body,actions);body.focus();scheduleLayout();
 }catch{if(!disposed&&checkingRequest===ticket)tell('此表达已变化，请刷新。');}finally{if(checkingRequest===ticket){checkingRequest=null;pending(false);}}
}
async function copyWhole(item,reviewed=false){
 if(busy||editing||composing)return;if(!reviewed){await checkWhole(item);return;}
 const request={ticket:epoch,review:checking?.item===item?checking:null};copyRequest=request;const range=request.review?.range??null;pending(true);
 try{const x=await readSelection(item,range);
  // A qualified reader may finish after a notification or a newer query. Its
  // old body must not reach the clipboard once this view has been invalidated.
  if(disposed||copyRequest!==request||epoch!==request.ticket||request.review&&checking!==request.review||!currentItems().some(x=>x.id===item.id&&x.text===item.text))return;
  const r=await copyPrompt(x.text);if(copyRequest===request&&epoch===request.ticket)tell(r.status==='copied'?'已复制，请手动粘贴。':'未能复制，请检查浏览器权限。');
 }catch{if(copyRequest===request){leaveCheck(false);tell('此表达已变化，请刷新。');}}finally{if(copyRequest===request){copyRequest=null;pending(false);}}
}
function focusRow(id){list.querySelector(`[data-id="${id}"] .more`)?.focus();}
async function change(action,id,extra={}){
 const result=await rpc({type:'PAIA_PROMPT_CHANGE',change:{action,id,revision,...extra}});revision=result.revision;return result;
}
async function manage(action,item,extra={}){if(busy||composing)return;pending(true);try{await change(action,item.id,extra);representativeChoice=null;splitChoice=null;editing=false;editor.hidden=true;list.hidden=false;await refresh(true);focusRow(item.id);}catch{if(action==='representative')invalidateRepresentative();if(action==='split')invalidateSplit();tell('未保存。内容可能已变化；你的编辑仍保留，请取消后刷新再试。');}finally{pending(false);}}
async function insert(item,b,reviewed=false,key=null){
 if(editing||busy||drag||composing||attempted.has(item.id))return;
 const selectedRange=checking?.item===item?checking.range:null;if(!selectedRange&&!quickPromptEligible(item.text)){tell('最多 150 个字符；编辑仍保留。');return;}
 attempted.add(item.id);const original=list.querySelector(`[data-id="${item.id}"] .insert`);if(original)original.disabled=true;b.disabled=true;pending(true);tell('正在插入…');
 let verified=false;
 try{const typed=true;const r=await rpc(typed?{type:'PAIA_PROMPT_SELECTION_INSERT',...(key?{activationKey:key}:{}),ref:checking?.item===item?checking.ref:selectionRef(item),range:checking?.item===item?checking.range:null,target:checking?.item===item?checking.target:mode==='search'?history.target:candidateTarget,operationId:crypto.randomUUID()}:{type:'PAIA_PROMPT_INSERT',id:item.id,text:item.text,operationId:crypto.randomUUID()});verified=r.status==='inserted'&&r.verified===true;tell(verified?'已插入，未发送。':r.reason==='unsupported_line_endings'?'当前输入框无法原样保留 CRLF 换行，请复制原文。':r.status==='uncertain'||r.status==='inserted'?'插入结果未确认。请先检查草稿，不会自动重试。':'无法安全插入；请检查输入框或手动复制。',verified);}catch{tell('插入结果未确认。请先检查草稿，不会自动重试。');}finally{pending(false);}
 if(verified){const feedback=b.id==='capsule-use'?b:original?.closest('.row');if(feedback)feedback.dataset.inserted='true';setTimeout(()=>{if(feedback)delete feedback.dataset.inserted;attempted.delete(item.id);if(original&&currentItems().some(current=>current.id===item.id&&current.text===item.text&&!current.hidden&&quickPromptEligible(current.text)))setPendingEligibility(original,false);paintCapsule();},480);paintCapsule();leaveCheck(false);return;}
 const copy=button('复制',()=>copyWhole(item,true));status.append(copy);
}
function edit(item){
 if(busy||drag||editing||checking)return;editing=true;++epoch;parkEditor();editor.replaceChildren();editor.hidden=false;
 const row=item&&list.querySelector(`[data-id="${item.id}"]`);list.hidden=!row;if(row){for(const tools of list.querySelectorAll('.tools'))tools.remove();row.classList.add('editing-row');row.after(editor);editor.className='inline-editor';}
 const label=document.createElement('label');const caption=document.createElement('span');caption.className='editor-label';bindCopy(caption,'复用文本');label.append(caption);const area=document.createElement('textarea');area.value=item?.text||'';const editorText=()=>item&&area.value===item.text.replace(/\r\n/g,'\n')?item.text:area.value;area.maxLength=200000;bindCopy(area,'复用文本','aria-label');label.append(area);
 area.addEventListener('compositionstart',()=>{composing=true;});area.addEventListener('compositionend',()=>{composing=false;});
 const count=document.createElement('output');count.className='expression-count';const countText=()=>{count.textContent=`${promptGraphemeCount(editorText())} / 150`;count.dataset.overLimit=String(!quickPromptEligible(editorText()));};area.addEventListener('input',countText);countText();
 const actions=document.createElement('div');actions.className='actions';actions.append(button('保存',async()=>{if(composing||!area.value.trim()||busy)return;if(!quickPromptEligible(editorText())){tell('最多 150 个字符；编辑仍保留。');return;}pending(true);try{if(item?.ref?.kind==='history_input'){const result=await rpc({type:'PAIA_PROMPT_HISTORY_SAVE',ref:item.ref,text:editorText(),revision});revision=result.revision;}else await change(item?'edit':'create',item?.id,{text:editorText()});editing=false;editor.hidden=true;list.hidden=false;await refresh(true);if(item)focusRow(item.id);if(item?.ref?.kind==='history_input')tell('已保存为独立常用表达。');}catch{tell('未保存，编辑已保留。取消后刷新可重新编辑。');}finally{pending(false);}}),button('取消',()=>{if(composing||busy)return;editing=false;editor.hidden=true;list.hidden=false;void refresh();}));editor.append(label,count,actions);area.style.height=Math.min(180,Math.max(36,area.scrollHeight))+'px';area.focus();
}
function invalidateRepresentative(){
 const choice=representativeChoice;if(!choice)return;choice.invalid=true;choice.members.replaceChildren();choice.save.disabled=true;if('pendingDisabled'in choice.save.dataset)choice.save.dataset.pendingDisabled='1';bindCopy(choice.note,'原文已变化，请取消后重新选择。');
}
async function chooseRepresentative(item){
 if(busy||drag||editing||checking||composing)return;parkEditor();editing=true;const ticket=++epoch;editor.hidden=false;list.hidden=true;editor.replaceChildren();
 const title=document.createElement('p');bindCopy(title,'选择此 Family 的代表原文。');const note=document.createElement('p');bindCopy(note,'正在读取当前原文…');const members=document.createElement('div');members.className='representative-members';
 const choice={item,ticket,note,members,chosen:null,invalid:false,save:null};representativeChoice=choice;
 const save=button('保存',()=>{if(representativeChoice!==choice||choice.invalid||!choice.chosen||busy||composing)return;void manage('representative',item,{representative:choice.chosen});});save.disabled=true;choice.save=save;
 const cancel=button('取消',()=>{if(busy||composing)return;representativeChoice=null;++epoch;editing=false;editor.hidden=true;list.hidden=false;void refresh();});const actions=document.createElement('div');actions.className='actions';actions.append(save,cancel);editor.append(title,note,members,actions);
 try{const current=await rpc({type:'members',id:item.id});
  if(disposed||representativeChoice!==choice||ticket!==epoch||choice.invalid||!currentItems().some(x=>x.id===item.id&&x.text===item.text)){if(representativeChoice===choice)invalidateRepresentative();return;}
  note.replaceChildren();for(const member of current){const label=document.createElement('label'),radio=document.createElement('input');radio.type='radio';radio.name='prompt-representative';radio.value=member.id;radio.addEventListener('change',()=>{if(representativeChoice===choice&&!choice.invalid&&radio.checked){choice.chosen=member.id;save.disabled=false;}});label.append(radio,document.createTextNode(member.text));members.append(label);}
  members.querySelector('input')?.focus();scheduleLayout();
 }catch{if(representativeChoice===choice)invalidateRepresentative();}
}
function invalidateSplit(){
 const choice=splitChoice;if(!choice)return;choice.invalid=true;choice.chosen.clear();choice.members.replaceChildren();choice.save.disabled=true;if('pendingDisabled'in choice.save.dataset)choice.save.dataset.pendingDisabled='1';bindCopy(choice.note,'原文已变化，请取消后重新选择。');
}
async function split(item){
 if(busy||drag||editing||checking||composing||disposed)return;parkEditor();editing=true;const ticket=++epoch;editor.hidden=false;list.hidden=true;editor.replaceChildren();
 const title=document.createElement('p');bindCopy(title,'选择要独立保留、不再自动合并的原表达。');const note=document.createElement('p');bindCopy(note,'正在读取当前原文…');const members=document.createElement('div');
 const choice={item,ticket,note,members,chosen:new Set(),count:0,invalid:false,save:null};splitChoice=choice;
 const save=button('拆分',()=>{if(disposed||splitChoice!==choice||choice.invalid||busy||composing)return;if(!choice.chosen.size||choice.chosen.size===choice.count){tell('请选择一部分表达。');return;}void manage('split',item,{inputIds:[...choice.chosen]});});save.disabled=true;choice.save=save;
 const cancel=button('取消',()=>{if(busy||composing)return;invalidateSplit();splitChoice=null;++epoch;editing=false;editor.hidden=true;list.hidden=false;void refresh();});const actions=document.createElement('div');actions.className='actions';actions.append(save,cancel);editor.append(title,note,members,actions);
 try{const current=await rpc({type:'members',id:item.id});
  if(disposed||splitChoice!==choice||ticket!==epoch||choice.invalid||!currentItems().some(x=>x.id===item.id&&x.text===item.text)){if(splitChoice===choice)invalidateSplit();return;}
  choice.count=current.length;note.replaceChildren();for(const member of current){const label=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.addEventListener('change',()=>{if(disposed||splitChoice!==choice||choice.invalid)return;if(box.checked)choice.chosen.add(member.id);else choice.chosen.delete(member.id);});label.append(box,document.createTextNode(member.text));members.append(label);}save.disabled=false;members.querySelector('input')?.focus();scheduleLayout();
 }catch{if(splitChoice===choice)invalidateSplit();}
}

function order(item,beforeId=null){if(beforeId===item.id)return [...manualOrder];const pins=manualOrder.filter(id=>id!==item.id);const index=pins.indexOf(beforeId);pins.splice(index<0?pins.length:index,0,item.id);return pins;}
// Presentation helpers reuse the same edit and reorder commands and guards.
function parkEditor(){document.getElementById('card').insertBefore(editor,status);editor.className='';for(const row of list.querySelectorAll('.editing-row'))row.classList.remove('editing-row');}
function dragHandle(item,row,short=false){
   const handle=button(short?'':'拖动排序',()=>{},short?'拖动此 Prompt':'拖动到目标行之前；也可使用上移下移');handle.className=short?'grip':'handle';
   handle.addEventListener('pointerdown',e=>{if(!e.isTrusted||e.button!==0||busy||editing)return;drag={item,startY:e.clientY,target:null,moved:false};handle.setPointerCapture(e.pointerId);row.classList.add('moving');});
   handle.addEventListener('pointermove',e=>{if(!drag||Math.abs(e.clientY-drag.startY)<5&&!drag.moved)return;drag.moved=true;for(const n of list.querySelectorAll('.target'))n.classList.remove('target');const target=[...list.querySelectorAll('.row')].find(n=>{const r=n.getBoundingClientRect();return e.clientY>=r.top&&e.clientY<=r.bottom;});if(target&&target!==row){drag.target=target.dataset.id;target.classList.add('target');}});
   handle.addEventListener('pointerup',()=>{const d=drag;drag=null;row.classList.remove('moving');if(d?.moved&&d.target)void manage('pin',d.item,{order:order(d.item,d.target)});});handle.addEventListener('pointercancel',()=>{drag=null;render();});return handle;
}
function render(){
 parkEditor();list.replaceChildren();paintCapsule();const items=currentItems();if(!items.length){const empty=document.createElement('p');empty.className='empty';bindCopy(empty,mode==='search'?(searchLoading?'正在继续搜索本机输入…':historyFailure?'暂时不可用。请在 PAIA 启用授权后刷新。':history.stale?'档案仍在变化，请重新搜索。':history.query.trim()?(history.longMatchCount?'仅匹配到较长表达，请在 PAIA 中继续查看。':'没有找到匹配内容。'):'请输入搜索词。'):hidden?'没有隐藏的 Prompt。':'常用表达会出现在这里，也可以新建自己的 Prompt。');list.append(empty);if(mode==='search'&&history.longMatchCount){list.append(button('打开 PAIA',openPaia));if(history.nextCursor)list.append(button('下一页',()=>runHistory(history.nextCursor,[...history.history,history.cursor])));}}
 for(const item of items){
  const row=document.createElement('div');row.className=item.ref?.kind==='history_input'?'row history':'row';row.dataset.id=item.id;
  const insertButton=button('',event=>insert(item,insertButton,false,activationKey(event))),text=document.createElement('span');insertButton.setAttribute('aria-label',item.text);copyBindings.delete(insertButton);text.className='text';text.textContent=item.text;insertButton.className='insert';insertButton.append(text);const disabled=item.hidden||attempted.has(item.id)||!quickPromptEligible(item.text);insertButton.disabled=busy||refreshing||disabled;if(busy||refreshing)insertButton.dataset.pendingDisabled=disabled?'1':'0';
  const more=button('⋯',()=>{if(busy||refreshing||editing)return;const old=row.nextElementSibling;if(old?.className==='tools'){old.remove();more.setAttribute('aria-expanded','false');return;}for(const el of list.querySelectorAll('.tools'))el.remove();const tools=document.createElement('div');tools.className='tools';bindCopy(tools,'管理 Prompt','aria-label');more.setAttribute('aria-expanded','true');
   tools.append(button('核对全文',()=>checkWhole(item)),button('复制整条',()=>copyWhole(item,true)));
   if(item.ref?.kind==='history_input'){tools.append(button('编辑',()=>edit(item)));row.after(tools);return;}
   tools.append(button('编辑',()=>edit(item)),button(item.pinned?'取消置顶':'置顶',()=>manage(item.pinned?'unpin':'pin',item)),button(item.hidden?'恢复':'隐藏',()=>manage(item.hidden?'show':'hide',item)));
   if(item.members.length>1)tools.append(button('选择代表原文',()=>chooseRepresentative(item)),button('拆分',()=>split(item)));
   if(item.edited&&item.members.length===0)tools.append(button('删除',()=>{tools.replaceChildren(copyText('删除此复用模板？历史内容不受影响。'),button('确认删除',()=>manage('delete',item)),button('取消',()=>tools.remove()));}));
   const pinned=items.filter(x=>x.pinned),index=pinned.findIndex(x=>x.id===item.id);
   const first=item.pinned&&index===0,last=item.pinned&&index===pinned.length-1;const up=button('上移',()=>{if(!first)void manage('pin',item,{order:order(item,item.pinned?pinned[index-1]?.id:pinned[0]?.id)});}),down=button('下移',()=>{if(!last)void manage('pin',item,{order:order(item,pinned[index+2]?.id)});});for(const [control,boundary]of [[up,first],[down,last]])if(boundary){control.disabled=true;if('pendingDisabled'in control.dataset)control.dataset.pendingDisabled='1';}tools.append(up,down);
   tools.append(dragHandle(item,row));row.after(tools);
  },'管理此 Prompt');more.className='more';more.setAttribute('aria-expanded','false');const copyButton=button('',()=>{if(clipped(item,text))void checkWhole(item);else void copyWhole(item,true);},'复制此 Prompt');copyButton.className='copy-shortcut';const editButton=button('',()=>edit(item),'编辑此 Prompt');editButton.className='edit-shortcut';row.append(insertButton,more);list.append(row);
 }
}
async function requestClose(event){
 if(composing||searchComposing||event?.isComposing||event?.keyCode===229)return;
 if(editing){tell('请先保存或取消编辑。');return;}
 if(busy||refreshing||drag)return;
 // Freeze admission while the existing authenticated close RPC is in flight.
 pending(true);try{
  const closed=await rpc({type:'close'});
  if(closed?.closed!==true||closed.nonce!==nonce||!['orb','capsule'].includes(closed.form))throw Error('unconfirmed close');
  if(closed.form==='capsule')document.documentElement.dataset.surfaceForm='capsule';
 }catch{tell('无法关闭，请稍后重试。');}finally{pending(false);}
 // The authenticated host ACK restores its same persistent circle in both
 // collapsed forms. A retained or retiring child must never take focus back.
}
function closeSurfaceTools(){document.getElementById('surface-tools').hidden=true;document.getElementById('surface-more').setAttribute('aria-expanded','false');}
function paintHistoryControls(){
 paintCandidateControls();
 document.documentElement.dataset.mode=mode;document.querySelector('header span').hidden=mode==='search';document.getElementById('search-clear').hidden=mode!=='search';
 document.getElementById('open-search').hidden=mode==='search';document.getElementById('leave-search').hidden=mode!=='search';document.getElementById('search-bar').hidden=mode!=='search';document.getElementById('hidden').hidden=mode==='search';
 document.getElementById('search-previous').hidden=mode!=='search'||!history.history.length;document.getElementById('search-next').hidden=mode!=='search'||!history.nextCursor;
}
// Return metadata is local to this live surface and contains no Input body.
// The original signed reader must qualify the saved cursor before any row is restored.
list.addEventListener('focusin',event=>{
 if(mode!=='search')return;const row=event.target.closest('.row');if(!row||!list.contains(row))return;
 historyFocusedRow={id:row.dataset.id,control:['insert','more','copy-shortcut','edit-shortcut'].find(name=>event.target.classList.contains(name))||'more'};
});
function captureHistoryView(){
 const focus=historyFocusedRow,row=[...list.querySelectorAll('.row')].find(n=>n.dataset.id===focus?.id);
 return {query:history.query,id:row?.dataset.id??null,control:focus?.control??'more',offset:row?row.getBoundingClientRect().top-list.getBoundingClientRect().top:0,scroll:list.scrollTop};
}
const cancelListReturn=()=>{++returnIntent;pendingListReturn=null;};
for(const type of ['pointerdown','keydown','wheel'])document.getElementById('card').addEventListener(type,event=>{if(event.isTrusted)cancelListReturn();},true);
document.addEventListener('focusin',cancelListReturn,true);window.addEventListener('blur',cancelListReturn);
function restoreListReturn(){
 const view=pendingListReturn;if(!view)return;
 const expectedMode=view.mode??'search';
 if(view.ticket!==epoch||mode!==expectedMode||checking||editing||view.intent!==returnIntent||mode==='search'&&(history.query!==view.query||view.cursor!==history.cursor||view.snapshot!==history.snapshot)||mode==='candidates'&&(view.revision!==revision||view.generation!==projectionGeneration)||view.ref&&!currentItems().some(item=>item.id===view.id&&JSON.stringify(selectionRef(item))===JSON.stringify(view.ref))){pendingListReturn=null;return;}
 pendingListReturn=null;const row=[...list.querySelectorAll('.row')].find(n=>n.dataset.id===view.id);
 list.scrollTop=view.scroll;if(!row)return;
 row.querySelector('.'+view.control)?.focus({preventScroll:true});
 list.scrollTop+=row.getBoundingClientRect().top-list.getBoundingClientRect().top-view.offset;
}
async function runHistory(cursor=null,pages=[],returnView=null){
 if(mode!=='search'||editing||checking||composing||searchComposing)return;const ticket=++epoch,intent=returnIntent;searchLoading=true;historyFailure=false;pending(true);tell('正在继续搜索本机输入…');if(!history.items.length)render();
 try{const result=await history.search(searchInput.value,{cursor,history:pages});if(!result||ticket!==epoch)return;attempted.clear();render();paintHistoryControls();if(returnView&&!result.restarted&&!result.restartRequired&&returnView.query===history.query&&intent===returnIntent){pendingListReturn={...returnView,ticket,intent,cursor:history.cursor,snapshot:history.snapshot};scheduleLayout();}tell(result.restartRequired?'档案仍在变化，请重新搜索。':result.nextCursor?'本页结果；还有更多内容。':'');}
 catch{if(ticket===epoch){historyFailure=true;history.invalidate();paintHistoryControls();tell('暂时不可用。请在 PAIA 启用授权后刷新。');}}finally{if(ticket===epoch){searchLoading=false;pending(false);if(!history.items.length)render();}}
}
// The query is explicit task text, never a processing or membership grant.
// Prepare does not replace an open list. A later explicit adoption requalifies
// the result and opens the original frozen list session.
const candidateRefresh=button('为当前任务选择历史候选',async()=>{
 if(mode!=='search'||!history.query.trim()||busy||editing||checking||composing||searchComposing)return;
 const ticket=++candidateRequest,query=history.query;pending(true);searchInput.disabled=true;document.getElementById('search-clear').disabled=true;
 try{const value=await rpc({type:'history_candidates_refresh',query});if(disposed||ticket!==candidateRequest)return;candidateReady=value.ready===true;candidateAdopt.hidden=!candidateReady;tell('候选已准备；返回常用输入后可明确采用。');}
 catch{if(ticket===candidateRequest)tell('历史候选暂不可用；常用输入和本机搜索仍可使用。');}finally{if(ticket===candidateRequest){searchInput.disabled=false;document.getElementById('search-clear').disabled=false;pending(false);}}
});candidateRefresh.id='history-candidates-refresh';candidateRefresh.hidden=true;
const candidateAdopt=button('采用已准备的历史候选',async()=>{
 if(mode!=='candidates'||busy||editing||checking||composing||drag)return;const ticket=++epoch;pending(true);
 try{const q=await rpc({type:'history_candidates_adopt'});if(disposed||ticket!==epoch)return;revision=q.revision;projectionGeneration=q.generation;manualOrder=q.manualOrder;applyDisplay(q.displayPreferences);session.open(q);candidateTarget=q.target;attempted.clear();render();tell('');}
 catch{if(ticket===epoch)tell('历史候选暂不可用；常用输入和本机搜索仍可使用。');}finally{if(ticket===epoch)pending(false);}
});candidateAdopt.id='history-candidates-adopt';candidateAdopt.hidden=true;
document.getElementById('surface-tools').append(candidateRefresh,candidateAdopt);
assistSurface=mountPromptAssist({card:document.getElementById('card'),list,tools:document.getElementById('surface-tools'),send:rpc,button,bindCopy,tell:text=>tell(text,false,assistFeedbackOwner),clearFeedback:()=>{if(feedbackOwner===assistFeedbackOwner)tell('');},canActivate:()=>!disposed&&!editing&&!checking&&!busy&&!refreshing&&!drag&&!composing&&!searchComposing,changed:()=>{paintCapsule();scheduleLayout();}});
let candidateAvailable=false;
function paintCandidateControls(){candidateRefresh.hidden=!candidateAvailable||mode!=='search';candidateRefresh.disabled=!history.query.trim();candidateAdopt.hidden=!candidateReady||mode!=='candidates';}
void rpc({type:'history_candidates_status'}).then(value=>{if(!disposed){candidateAvailable=value.available===true;paintCandidateControls();}},()=>{});
trackActivation(document.getElementById('capsule-use'));
document.getElementById('capsule-use').addEventListener('click',e=>{if(!e.isTrusted||e.detail>1)return;if(assistSurface?.state.result){void assistSurface.state.insert();return;}if(automaticSuggestion)return;const item=session.current().find(row=>!row.hidden&&quickPromptEligible(row.text));if(item)void insert(item,e.currentTarget,false,activationKey(e));});
for(const form of ['orb','capsule'])document.getElementById('collapse-'+form).addEventListener('click',e=>{if(e.isTrusted)void setSurfaceForm(form);});
document.getElementById('long-expressions').addEventListener('click',()=>{if(busy||editing||checking||composing)return;showOversized=!showOversized;mode='candidates';paintHistoryControls();render();});
document.getElementById('surface-more').addEventListener('click',()=>{if(busy||composing||searchComposing||drag)return;const tools=document.getElementById('surface-tools');tools.hidden=!tools.hidden;document.getElementById('surface-more').setAttribute('aria-expanded',String(!tools.hidden));scheduleLayout();});
document.getElementById('search-clear').addEventListener('click',()=>{if(editing||checking||composing||searchComposing||drag)return;clearTimeout(searchTimer);searchInput.value='';invalidateHistoryIntent();history.history=[];history.cursor=null;paintHistoryControls();searchInput.focus();});
document.getElementById('surface-tools').addEventListener('click',event=>{if(event.target.closest('button'))closeSurfaceTools();});
document.getElementById('open-search').addEventListener('click',()=>{if(editing||busy||checking||drag||composing)return;closeSurfaceTools();++epoch;mode='search';history.invalidate();paintHistoryControls();searchInput.focus();if(history.query.trim())void runHistory(history.cursor,[...history.history],historyReturnView);else render();historyReturnView=null;});
document.getElementById('leave-search').addEventListener('click',()=>{if(editing||busy||checking||drag||composing)return;historyReturnView=captureHistoryView();closeSurfaceTools();pendingListReturn=null;++epoch;++history.serial;mode='candidates';paintHistoryControls();render();tell('');});
function invalidateHistoryIntent(){
 historyReturnView=null;pendingListReturn=null;historyFocusedRow=null;++epoch;history.invalidate();history.query=searchInput.value;history.stale=false;historyFailure=false;
 if(copyRequest){copyRequest=null;pending(false);}if(checkingRequest!==null){checkingRequest=null;pending(false);}if(searchLoading){searchLoading=false;pending(false);}
 if(checking)leaveCheck(false);if(!editing){render();paintHistoryControls();tell('');}
}
searchInput.addEventListener('compositionstart',()=>{searchComposing=true;clearTimeout(searchTimer);invalidateHistoryIntent();});searchInput.addEventListener('compositionend',()=>{searchComposing=false;void runHistory();});
searchInput.addEventListener('input',()=>{clearTimeout(searchTimer);invalidateHistoryIntent();if(!searchComposing)searchTimer=setTimeout(()=>void runHistory(),150);});
document.addEventListener('selectionchange',()=>checking?.readRange?.());
document.getElementById('search-next').addEventListener('click',()=>{if(!searchLoading&&history.nextCursor)void runHistory(history.nextCursor,[...history.history,history.cursor]);});
document.getElementById('search-previous').addEventListener('click',()=>{if(!searchLoading&&history.history.length){const pages=[...history.history],cursor=pages.pop();void runHistory(cursor,pages);}});
async function openPaia(){if(busy||editing||drag||composing||searchLoading)return;pending(true);try{const result=await rpc({type:'history_open_paia',query:mode==='search'?history.query:'',searchSnapshot:mode==='search'?history.snapshot:null,ref:mode==='search'&&checking?.ref?.kind==='history_input'?checking.ref:null,range:mode==='search'?checking?.range??null:null});if(result?.status!=='opened')tell('暂时不可用。请在 PAIA 启用授权后刷新。');}catch{if(checking)leaveCheck(false);tell('此表达已变化，请刷新。');}finally{pending(false);}}
document.getElementById('open-paia').addEventListener('click',openPaia);
document.getElementById('new').addEventListener('click',()=>edit(null));document.getElementById('refresh').addEventListener('click',refresh);document.getElementById('hidden').addEventListener('click',()=>{if(editing||busy)return;hidden=!hidden;void refresh();});document.getElementById('close').addEventListener('click',e=>{if(e.isTrusted)void requestClose(e);});
document.getElementById('card').addEventListener('keydown',e=>{if(e.isTrusted&&e.key==='Escape'&&!composing&&!e.isComposing&&e.keyCode!==229){e.preventDefault();void requestClose(e);}});
chrome.runtime.onMessage.addListener((r,s,reply)=>{if(r?.type==='PAIA_PROMPT_ASSIST_CHANGED'||r?.type==='PAIA_PROMPT_NEXT_CHANGED'){if(s.id===chrome.runtime.id&&!s.tab)assistSurface?.invalidate();return;}if(r?.type==='PAIA_PROMPT_NEXT_ACTIVITY'){if(s.id===chrome.runtime.id&&!s.tab&&r.nonce===nonce)reply({idle:!editing&&!busy&&!composing&&!drag&&!refreshing&&!assistSurface?.active});return;}if(r?.type==='PAIA_PROMPT_SURFACE_REQUEST_CLOSE'){if(s.id!==chrome.runtime.id||s.tab||r.nonce!==nonce)return;if(document.documentElement.dataset.surfaceForm==='capsule')void setSurfaceForm('board');else void requestClose();reply({received:true});return;}if(!['PAIA_PROMPT_CHANGED','ARCHIVE_CHANGED'].includes(r?.type))return;assistSurface?.invalidate();invalidateRepresentative();invalidateSplit();if(mode!=='search')history.invalidate();if(copyRequest){copyRequest=null;pending(false);}if(mode==='search'){const displayTicket=++displayEpoch;void rpc({type:'PAIA_PROMPT_QUERY',includeHidden:hidden}).then(q=>{if(!disposed&&displayTicket===displayEpoch)applyDisplay(q.displayPreferences);},()=>{});++epoch;history.invalidate();if(searchLoading){searchLoading=false;pending(false);}if(checkingRequest!==null){checkingRequest=null;pending(false);}if(checking)leaveCheck(false);if(!editing){render();tell('内容已变化，请刷新。');}return;}if(refreshing)return;const ticket=++epoch,displayTicket=++displayEpoch;if(checkingRequest!==null){checkingRequest=null;pending(false);tell('此表达已变化，请刷新。');}void rpc({type:'PAIA_PROMPT_QUERY',includeHidden:hidden}).then(q=>{if(ticket!==epoch)return;if(displayTicket===displayEpoch)applyDisplay(q.displayPreferences);if(!editing){revision=q.revision;projectionGeneration=q.generation;candidateTarget=q.target;}session.reconcile(q);const longCurrent=new Map((q.oversizedItems||[]).map(item=>[item.id,item]));oversizedItems=oversizedItems.filter(item=>longCurrent.get(item.id)?.text===item.text);paintCapsule();if(checking&&!session.current().some(x=>x.id===checking.item.id&&x.text===checking.item.text)){leaveCheck();tell('此表达已变化，请刷新。');}if(!editing&&!drag){const ids=new Set(session.current().map(x=>x.id));for(const row of [...list.querySelectorAll('.row')])if(!ids.has(row.dataset.id)){if(row.nextElementSibling?.className==='tools')row.nextElementSibling.remove();row.remove();}}},()=>{if(ticket!==epoch)return;if(checking)leaveCheck(false);if(!editing){list.replaceChildren();tell('内容已变化，请刷新。');}});});
void refresh();
// An inactive cross-origin frame retains its last focused element. Reveal controls only while this document actually owns focus.
const reflectFocus=()=>document.documentElement.toggleAttribute('data-focused',document.hasFocus());
window.addEventListener('pagehide',()=>{disposed=true;assistSurface?.dispose();invalidateSplit();++candidateRequest;++epoch;copyRequest=null;checkingRequest=null;++layoutTicket;});
window.addEventListener('focus',reflectFocus);window.addEventListener('blur',reflectFocus);reflectFocus();

}
