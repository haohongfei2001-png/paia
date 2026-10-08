import {element} from './common.js';

// One disposable reading-options state per owner, consumed on its next mount.
const readingOptions=new WeakMap();

// A presentation of the existing Topic owner and its nodes. No body, history,
// pagination, save or authorization state is owned here.
export function topicPresentationFacts(overview,sort='desc'){
 if(overview?.coverage!=='complete')return {caption:'表达时间范围尚未核对',coverage:'当前仅显示已载入的表达。',years:[]};
 const counts=overview.knownYearCounts||{},years=Object.keys(counts).filter(year=>/^\d{4}$/.test(year)&&Number.isInteger(counts[year])&&counts[year]>0).map(Number).sort((a,b)=>sort==='asc'?a-b:b-a),unknown=Number.isInteger(overview.unknownCount)?overview.unknownCount:0,known=years.reduce((sum,year)=>sum+counts[year],0),range=years.toSorted((a,b)=>a-b);
 return {caption:range.length?(range[0]===range.at(-1)?String(range[0]):`${range[0]}—${range.at(-1)}`)+' · 已收录的表达':'表达时间未知',coverage:`按时间完整浏览，不按“重要性”删表达。${known}条有时间${unknown?`，另${unknown}条时间未知`:''}。`,years:[...years.map(String),...(unknown?['unknown']:[])]};
}

// Chromium's native caret scrolling does not account for the compact sticky
// navigation rail. Keep only the active Topic title's selection below it;
// neither editable nodes nor the native Selection are replaced.
export function revealCompactTopicTitleSelection(root){
 const title=root?.querySelector('#topic-heading h1');
 if(!title||document.activeElement!==title||!title.isConnected||innerWidth>=768)return;
 const selection=getSelection();if(!selection?.rangeCount)return;
 const range=selection.getRangeAt(0);if(!title.contains(range.commonAncestorContainer))return;
 const rail=document.querySelector('.sidebar');if(!rail)return;
 const style=getComputedStyle(rail);if(!['sticky','fixed'].includes(style.position))return;
 const barrier=rail.getBoundingClientRect(),rect=range.getBoundingClientRect();
 if(barrier.top>0||barrier.bottom<=0||!rect.height)return;
 const top=barrier.bottom+4;
 if(rect.top<top)window.scrollBy(0,rect.top-top);
 else if(rect.bottom>innerHeight-4)window.scrollBy(0,rect.bottom-innerHeight+4);
}

export class TopicWorkspacePresentation {
 constructor(owner){
  this.owner=owner;this.topicId=owner.id;this.view=owner.view;this.root=document.getElementById('thought-document');this.moves=[];this.created=[];
  const previous=readingOptions.get(owner),active=document.activeElement;readingOptions.delete(owner);
  const get=id=>document.getElementById(id),move=(node,target)=>{if(!node)return;this.moves.push({node,parent:node.parentNode,next:node.nextSibling});target.append(node);},make=(tag,name,text)=>{const node=element(tag,name,text);this.created.push(node);return node;};
  this.selectionFrame=null;this.onTitleSelection=()=>{if(this.selectionFrame!==null)cancelAnimationFrame(this.selectionFrame);this.selectionFrame=requestAnimationFrame(()=>{this.selectionFrame=null;if(!this.disposed)revealCompactTopicTitleSelection(this.root);});};document.addEventListener('selectionchange',this.onTitleSelection);
  this.root.classList.add('dvn-topic-composition');const title=this.root.querySelector('.topic-title-row'),toolbar=get('topic-toolbar'),menu=get('topic-menu').querySelector('.library-action-list');
  move(toolbar.querySelector('.library-history-tools'),menu);
  this.caption=make('p','dvn-topic-caption');title.after(this.caption);
  this.actions=make('div','dvn-topic-action-row');this.caption.after(this.actions);move(get('topic-original-tabs'),this.actions);move(toolbar,this.actions);move(get('topic-presentation'),this.actions);
  this.line=make('div','dvn-topic-coverage-row');this.coverage=make('p','dvn-topic-coverage');this.options=make('details','dvn-topic-options');const summary=make('summary','','阅读选项');this.options.append(summary);move(get('topic-reading-controls'),this.options);move(get('topic-outline'),this.options);move(get('revision-history'),this.options);this.line.append(this.coverage,this.options);this.actions.after(this.line);
  this.options.open=previous?.topicId===this.topicId&&previous?.view===this.view&&previous.open===true;
  this.years=make('nav','dvn-topic-years');this.years.setAttribute('aria-label','年份');this.line.before(this.years);
  this.write=get('create-entry');this.writeLabel=this.write.textContent;this.write.textContent=document.documentElement.lang==='en'?'Add Thought':'写下想法';this.sync();
  // A dialog may close before its read finishes, returning focus to a control
  // that this same-view remount must move again. Preserve only that move loss.
  if(previous?.topicId===this.topicId&&previous?.view===this.view&&active?.isConnected&&document.activeElement===document.body&&this.moves.some(({node})=>node===active||node.contains(active)))active.focus({preventScroll:true});
 }
 sync(){
  const owner=this.owner;
  if(this.topicId!==owner.id||this.view!==owner.view){this.options.open=false;this.topicId=owner.id;this.view=owner.view;}
  const content=owner.view==='original';this.line.hidden=!owner.id;this.coverage.hidden=true;this.years.hidden=true;this.caption.hidden=true;
  // Date ranges, count summaries and a year index belong to evidence/history,
  // not the normal durable Section reader. Keep only the existing controls.
  this.coverage.textContent='';this.caption.textContent='';this.years.replaceChildren();
  const tabs=document.getElementById('topic-original-tabs');if(tabs)tabs.hidden=true;
  const order=document.getElementById('topic-time-order');if(order)order.hidden=true;
  if(content){const outline=document.getElementById('topic-outline');if(outline)outline.hidden=true;}
  const state=owner.topicReader?.state(),before=document.getElementById('topic-continuous-before');if(state?.terminalPrevious&&!state.loadingPrevious&&!state.errorPrevious&&content)before.hidden=true;
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;document.removeEventListener('selectionchange',this.onTitleSelection);if(this.selectionFrame!==null)cancelAnimationFrame(this.selectionFrame);
  readingOptions.set(this.owner,{topicId:this.topicId,view:this.view,open:this.options.open});
  const active=document.activeElement,moved=this.moves.some(({node})=>node===active||node.contains(active));
  this.root.classList.remove('dvn-topic-composition');this.write.textContent=this.writeLabel;for(const {node,parent,next}of this.moves.toReversed())if(parent?.isConnected)parent.insertBefore(node,next?.parentNode===parent?next:null);for(const node of this.created)node.remove();
  // Reparenting can blur the History invoker before the owner opens its dialog.
  // Restore only synchronous move loss, never replace another control's focus.
  if(moved&&active?.isConnected&&document.activeElement===document.body)active.focus({preventScroll:true});
 }
}
