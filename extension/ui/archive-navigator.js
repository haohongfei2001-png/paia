import {request,element} from './common.js';

const $=id=>document.getElementById(id);
const copy=(zh,en)=>document.documentElement.lang==='en'?en:zh;
const keyPart=value=>value===null?'null':JSON.stringify(value);
export const navigatorGroupKey=(providerKey,groupKind,projectRef=null)=>JSON.stringify([providerKey,groupKind,projectRef||null]);
export const navigatorInvalidationMessage=message=>!!message&&(
 message.type==='SOURCE_STRUCTURE_CHANGED'||
 message.type==='ARCHIVE_CHANGED'&&!!message.cause
);
export const navigatorScopeKey=options=>JSON.stringify([
 options.groupKind??(options.providerKey==null?'providers':'groups'),
 options.providerKey??null,
 options.projectRef??null
]);
const providerName=key=>key==='chatgpt'?'ChatGPT':key==='claude'?'Claude':key;
const groupName=item=>item.groupKind==='project'?(item.title||copy('未命名 Project','Unnamed Project')):({
 unassigned:copy('未归属 Project','Not assigned to a Project'),
 unknown:copy('归属未知','Project unknown'),
 deleted:copy('来源已删除','Deleted at source'),
 detached:copy('独立整理','Detached')
}[item.groupKind]||item.groupKind);
const focusable=root=>[...root.querySelectorAll('button:not(:disabled),[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(node=>node.getClientRects().length);

export class ArchiveNavigatorState{
 constructor(){this.expanded=new Set();this.scopes=new Map();this.selectedPath=null;this.scrollTop=0;}
 select(path){this.selectedPath=path||null;if(path?.available&&path.groupKind)this.expanded.add(navigatorGroupKey(path.providerKey,path.groupKind,path.projectRef));}
 expandedFor(item){return this.expanded.has(navigatorGroupKey(item.providerKey,item.groupKind,item.projectRef));}
 toggle(item){const key=navigatorGroupKey(item.providerKey,item.groupKind,item.projectRef);if(this.expanded.has(key))this.expanded.delete(key);else this.expanded.add(key);return this.expanded.has(key);}
 scope(options){const key=navigatorScopeKey(options);if(!this.scopes.has(key))this.scopes.set(key,{key,options,items:[],nextCursor:null,coverage:{state:'building'},generation:null,effectiveOrdering:'paia',unavailableReason:null,loading:false,error:null});return this.scopes.get(key);}
 resetScopes(){this.scopes.clear();}
 snapshot(){return {expanded:[...this.expanded],selectedPath:this.selectedPath?structuredClone(this.selectedPath):null,scrollTop:this.scrollTop};}
}

export class ArchiveNavigator{
 constructor({onOpenWindow,onSourceDetail,onStatus=()=>{},onRouteChange=()=>{}}={}){
  this.onOpenWindow=onOpenWindow;this.onSourceDetail=onSourceDetail;this.onStatus=onStatus;this.onRouteChange=onRouteChange;this.state=new ArchiveNavigatorState();this.serial=0;this.reader=false;this.active=false;this.query='';this.view='library';this.selectedDocumentId=null;this.sheetOpen=false;this.narrowCollapsed=false;this.refreshTimer=null;this.originFocus=null;this.restoreDepth=new Map();this.mode='paia';this.pointerDown=false;this.pendingInvalidate=false;
  this.host=element('aside','archive-navigator');this.host.id='archive-navigator';this.host.setAttribute('aria-label',copy('档案窗口导航','Archive window navigator'));this.host.tabIndex=-1;
  const head=element('header','archive-navigator-header'),title=element('h2','',copy('档案窗口','Archive windows'));this.status=element('p','archive-navigator-status','');this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');this.applyOrder=element('button','archive-navigator-apply-order',copy('应用','Apply'));this.applyOrder.type='button';this.applyOrder.hidden=true;this.close=element('button','archive-navigator-close',copy('关闭','Close'));this.close.type='button';head.append(title,this.status,this.applyOrder,this.close);
  this.tree=element('div','archive-navigator-tree');this.host.append(head,this.tree);
  this.toggle=$('archive-navigator-toggle');this.close.addEventListener('click',()=>this.closeOrCollapse(true));this.toggle?.addEventListener('click',()=>this.toggleSurface());this.applyOrder.addEventListener('click',()=>this.applyPending(true));
  this.host.addEventListener('scroll',()=>{this.state.scrollTop=this.host.scrollTop;},{passive:true});this.host.addEventListener('pointerdown',()=>{this.pointerDown=true;},{passive:true});window.addEventListener('pointerup',()=>{this.pointerDown=false;this.applyPending(false);},{passive:true});this.host.addEventListener('focusout',()=>queueMicrotask(()=>this.applyPending(false)));document.addEventListener('paia:archive-order-mode',event=>this.setMode(event.detail?.mode));
  void request('PAIA_ARCHIVE_ORDER_PREFERENCE').then(value=>this.setMode(value.mode)).catch(()=>{});
  this.media=matchMedia('(max-width:799px)');this.media.addEventListener?.('change',()=>this.layout());
  window.addEventListener('resize',()=>this.layout(),{passive:true});
  const collection=$('collection-panel');if(collection)new MutationObserver(()=>this.place()).observe(collection,{subtree:true,childList:true});
 }
 navigationSnapshot(){const loaded=[];for(const scope of this.state.scopes.values()){const kind=scope.options?.groupKind;if(!['project','unassigned','unknown','deleted','detached'].includes(kind))continue;const groupKey=navigatorGroupKey(scope.options.providerKey,kind,scope.options.projectRef);if(this.state.expanded.has(groupKey)&&scope.items.length)loaded.push([scope.key,Math.min(10000,scope.items.length)]);}return {expanded:[...this.state.expanded].slice(0,100),loaded:loaded.slice(0,100),scrollTop:Math.max(0,Math.round(this.state.scrollTop||0)),narrowCollapsed:!!this.narrowCollapsed};}
 restoreNavigation(snapshot){if(!snapshot)return;this.state.expanded=new Set(snapshot.expanded||[]);this.restoreDepth=new Map(snapshot.loaded||[]);this.state.scrollTop=Math.max(0,snapshot.scrollTop||0);this.narrowCollapsed=!!snapshot.narrowCollapsed;this.layout();this.paint();}
 isMobile(){return this.media.matches;}
 isNarrow(){return innerWidth>=800&&innerWidth<1200;}
 groupOptions(item){return {providerKey:item.providerKey,groupKind:item.groupKind,...(item.groupKind==='project'?{projectRef:item.projectRef}:{})};}
 async sync({view,documentId,query='',consented=false}={}){
  const previousSelected=this.selectedDocumentId;this.view=view;this.reader=!!documentId;this.selectedDocumentId=documentId||null;this.query=query||'';this.active=!!consented&&['library','archive'].includes(view);
  document.body.classList.toggle('ans-nav-surface',this.active);document.body.classList.toggle('ans-nav-reader',this.active&&this.reader);document.body.classList.toggle('ans-nav-root',this.active&&!this.reader);
  if(!this.active){this.host.hidden=true;if(this.toggle)this.toggle.hidden=true;this.restoreLegacy();return;}
  this.place();this.layout();
  if(!this.reader&&this.query.trim()){this.host.hidden=true;this.restoreLegacy();return;}
  this.host.hidden=this.reader&&this.isMobile()&&!this.sheetOpen||this.reader&&this.isNarrow()&&this.narrowCollapsed;
  if(this.toggle){this.toggle.hidden=!this.reader;this.toggle.setAttribute('aria-expanded',String(!this.host.hidden));}
  if(previousSelected!==this.selectedDocumentId&&this.selectedDocumentId)await this.refreshSelection();
  await this.refresh(false);
 }
 place(){
  if(!this.active)return;
  if(this.reader){const panel=$('document-panel'),page=$('document-page');if(panel&&page&&this.host.parentElement!==panel)panel.insertBefore(this.host,page);}
  else{const main=$('uir-archive-main')||$('collection-panel'),search=$('search');if(main&&this.host.parentElement!==main){if(search?.parentElement===main)search.after(this.host);else main.prepend(this.host);}}
 }
 layout(){
  if(!this.active)return;
  if(!this.isMobile()&&this.sheetOpen)this.closeSheet(false);
  this.host.classList.toggle('is-sheet',this.reader&&this.isMobile());
  document.body.classList.toggle('ans-nav-sheet-open',this.reader&&this.isMobile()&&this.sheetOpen);
  document.body.classList.toggle('ans-nav-collapsed',this.reader&&this.isNarrow()&&this.narrowCollapsed);
  if(this.reader&&this.isMobile())this.host.hidden=!this.sheetOpen;
  else if(this.reader&&this.isNarrow())this.host.hidden=this.narrowCollapsed;
  else this.host.hidden=false;
  if(this.toggle){this.toggle.hidden=!this.reader;this.toggle.setAttribute('aria-expanded',String(!this.host.hidden));}
 }
 toggleSurface(){if(!this.reader)return;if(this.isMobile()){if(this.sheetOpen)this.closeSheet(true);else this.openSheet();return;}if(this.isNarrow()){this.narrowCollapsed=!this.narrowCollapsed;this.layout();if(!this.narrowCollapsed)this.host.focus({preventScroll:true});}}
 openSheet(){if(!this.reader||!this.isMobile())return;this.sheetOpen=true;this.originFocus=document.activeElement;const page=$('document-page');if(page)page.inert=true;this.layout();queueMicrotask(()=>this.close.focus({preventScroll:true}));}
 closeSheet(restore=true){this.sheetOpen=false;const page=$('document-page');if(page)page.inert=false;this.layout();if(restore)(this.originFocus?.isConnected?this.originFocus:this.toggle)?.focus({preventScroll:true});this.originFocus=null;}
 closeOrCollapse(restore=false){if(this.isMobile())this.closeSheet(restore);else if(this.isNarrow()){this.narrowCollapsed=true;this.layout();if(restore)this.toggle?.focus({preventScroll:true});}}
 handleKeydown(event){
  if(event.key==='Escape'&&this.reader&&(this.isMobile()&&this.sheetOpen||this.isNarrow()&&!this.narrowCollapsed)){event.preventDefault();this.closeOrCollapse(true);return true;}
  if(!(this.isMobile()&&this.sheetOpen&&event.key==='Tab'))return false;
  const nodes=focusable(this.host);if(!nodes.length){event.preventDefault();this.host.focus();return true;}const first=nodes[0],last=nodes.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();return true;}
  if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();return true;}
  return false;
 }
 rememberLoadedDepth(){for(const scope of this.state.scopes.values()){const kind=scope.options?.groupKind;if(!['project','unassigned','unknown','deleted','detached'].includes(kind)||!scope.items.length)continue;const groupKey=navigatorGroupKey(scope.options.providerKey,kind,scope.options.projectRef);if(this.state.expanded.has(groupKey))this.restoreDepth.set(scope.key,Math.max(this.restoreDepth.get(scope.key)||0,Math.min(10000,scope.items.length)));}}
 setMode(mode){if(!['paia','source'].includes(mode)||mode===this.mode)return;this.mode=mode;this.pendingInvalidate=false;this.applyOrder.hidden=true;this.rememberLoadedDepth();this.state.resetScopes();this.lastPaintSignature=null;void this.refresh(false);}
 interactionLocked(){return this.pointerDown||this.host.contains(document.activeElement)||!!document.querySelector('#context-menu:not([hidden])');}
 invalidate(){
  if(this.mode==='source'&&this.interactionLocked()){this.pendingInvalidate=true;this.applyOrder.hidden=false;this.setStatus(copy('位置有更新','Positions updated'));document.dispatchEvent(new CustomEvent('paia:archive-order-status',{detail:{pending:true}}));return;}
  this.applyInvalidation();
 }
 applyInvalidation(){this.pendingInvalidate=false;this.applyOrder.hidden=true;this.rememberLoadedDepth();this.state.resetScopes();this.lastPaintSignature=null;void this.refresh(false);}
 applyPending(force=false){if(!this.pendingInvalidate||!force&&this.interactionLocked())return;this.applyInvalidation();}
 selectPath(path){const before=JSON.stringify(this.state.selectedPath);this.state.select(path);if(before!==JSON.stringify(this.state.selectedPath))this.onRouteChange();}
 schedule(){clearTimeout(this.refreshTimer);if(!this.active)return;this.refreshTimer=setTimeout(()=>void this.checkFreshness(),8000);}
 async refreshSelection(){try{const value=await request('PAIA_ARCHIVE_NAV_STATUS',{page:{groupKind:'providers',mode:this.mode,selectedDocumentId:this.selectedDocumentId}});if(value.selectedPath)this.selectPath(value.selectedPath);}catch{}}
 async checkFreshness(){
  if(!this.active)return;try{const status=await request('PAIA_ARCHIVE_NAV_STATUS',{page:{groupKind:'providers',mode:this.mode,selectedDocumentId:this.selectedDocumentId}}),root=this.state.scope({groupKind:'providers'}),before=JSON.stringify(this.state.selectedPath);if(status.selectedPath)this.selectPath(status.selectedPath);if(status.coverage.state!=='complete'||root.generation&&status.generation!==root.generation){this.rememberLoadedDepth();this.state.resetScopes();this.lastPaintSignature=null;await this.refresh(false);}else if(before!==JSON.stringify(this.state.selectedPath))this.paint();}catch{}finally{this.schedule();}
 }
 async readScope(options,{append=false,force=false}={}){
  const scope=this.state.scope(options);if(scope.loading)return scope;if(!append&&!force&&scope.coverage.state==='complete'&&scope.unavailableReason!=='SOURCE_ORDER_PREPARING')return scope;scope.loading=true;scope.error=null;this.paint();
  try{
   const page=await request('PAIA_ARCHIVE_NAV_PAGE',{page:{...options,...(append&&scope.nextCursor?{cursor:scope.nextCursor}:{}),limit:40,mode:this.mode,selectedDocumentId:this.selectedDocumentId}});
   if(page.selectedPath)this.selectPath(page.selectedPath);
   if(page.cursorInvalid){this.state.scopes.delete(scope.key);return this.readScope(options);}
   scope.coverage=page.coverage;scope.generation=page.generation;scope.nextCursor=page.nextCursor;scope.effectiveOrdering=page.effectiveOrdering||'paia';scope.unavailableReason=page.unavailableReason||null;
   if(page.coverage.state==='complete')scope.items=append?[...scope.items,...page.items]:page.items;
   else if(!append)scope.items=[];
   return scope;
  }catch(error){scope.error=error?.code||'UNAVAILABLE';return scope;}
  finally{scope.loading=false;this.paint();}
 }
 async refresh(hard=false){
  if(!this.active||this.host.hidden&&!this.reader)return;
  const token=++this.serial;if(hard){this.rememberLoadedDepth();this.state.resetScopes();this.lastPaintSignature=null;}
  let root=await this.readScope({groupKind:'providers'});if(token!==this.serial)return;
  if(root.coverage.state!=='complete'){this.setStatus(copy('正在整理窗口索引…','Building window index…'));this.paint();setTimeout(()=>{if(token===this.serial)void this.refresh(false);},40);return;}
  let building=false;
  for(const provider of root.items){const groups=await this.readScope({providerKey:provider.providerKey,groupKind:'groups'});if(token!==this.serial)return;if(groups.coverage.state!=='complete'||groups.unavailableReason==='SOURCE_ORDER_PREPARING')building=true;}
  const groupsToLoad=[];for(const provider of root.items){const groups=this.state.scope({providerKey:provider.providerKey,groupKind:'groups'});if(groups.coverage.state!=='complete')continue;for(const group of groups.items)if(this.state.expandedFor(group))groupsToLoad.push(group);}
  for(const group of groupsToLoad){let scope=await this.readScope(this.groupOptions(group));if(token!==this.serial)return;if(scope.coverage.state!=='complete'||scope.unavailableReason==='SOURCE_ORDER_PREPARING'){building=true;continue;}const target=this.restoreDepth.get(scope.key)||0;while(scope.items.length<target&&scope.nextCursor){scope=await this.readScope(this.groupOptions(group),{append:true});if(token!==this.serial)return;}if(scope.items.length>=target||!scope.nextCursor)this.restoreDepth.delete(scope.key);}
  if(building){this.setStatus(copy('正在整理来源与窗口…','Preparing source groups and windows…'));this.paint();setTimeout(()=>{if(token===this.serial)void this.refresh(false);},40);return;}
  if(this.mode==='source'){const scopes=[...this.state.scopes.values()],fallback=scopes.some(scope=>scope.unavailableReason&&scope.unavailableReason!=='SOURCE_ORDER_PREPARING'),effective=scopes.some(scope=>scope.effectiveOrdering==='source');this.setStatus(fallback?copy('部分来源顺序不可用 · 使用 PAIA 回退','Some source order unavailable · PAIA fallback'):copy('来源顺序已就绪','Source order ready'));document.dispatchEvent(new CustomEvent('paia:archive-order-status',{detail:{effective:effective?'source':'paia',fallback}}));}
  else this.setStatus(root.coverage.archiveComplete===false?copy('档案仍在整理，已显示可确认范围','Archive is still building; showing confirmed scope'):copy('窗口导航已就绪','Window navigation ready'));
  this.paint();this.schedule();
 }
 setStatus(text){this.status.textContent=text;}
 restoreLegacy(){const list=$('document-list'),count=$('result-count');if(list)list.hidden=false;if(count)count.hidden=false;}
 syncLegacy(){
  if(this.reader)return;const list=$('document-list'),count=$('result-count'),root=this.state.scope({groupKind:'providers'}),ready=!this.query.trim()&&root.coverage.state==='complete';
  if(list)list.hidden=ready;if(count)count.hidden=ready;
 }
 async toggleGroup(item){
  const open=this.state.toggle(item);this.paint();if(open){const scope=await this.readScope(this.groupOptions(item));this.paint();if(scope.coverage.state!=='complete')setTimeout(()=>void this.refresh(false),40);}
 }
 async more(item){
  const options=this.groupOptions(item),scope=this.state.scope(options);if(!scope.nextCursor||scope.loading)return;await this.readScope(options,{append:true});this.paint();
 }
 async openWindow(item){
  if(this.busy)return;this.busy=true;const current=item.documentId;this.host.setAttribute('aria-busy','true');
  try{const ok=await this.onOpenWindow?.(current);if(ok!==false&&this.isMobile())this.closeSheet(false);}
  finally{this.busy=false;this.host.removeAttribute('aria-busy');}
 }
 detail(subject,trigger){this.onSourceDetail?.(subject,trigger);}
 paintSignature(){return JSON.stringify({mode:this.mode,selected:this.selectedDocumentId,expanded:[...this.state.expanded].sort(),scopes:[...this.state.scopes].sort(([a],[b])=>a.localeCompare(b)).map(([key,scope])=>[key,scope.coverage?.state||null,scope.generation,scope.effectiveOrdering,scope.unavailableReason,scope.nextCursor,scope.error,scope.loading,scope.items.map(item=>[item.kind,item.id,item.title,item.providerKey,item.groupKind,item.projectRef,item.sourceStatus,item.parentSourceStatus])])});}
 syncSelection(){for(const button of this.host.querySelectorAll('.archive-navigator-window')){if(button.dataset.documentId===this.selectedDocumentId)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}}
 paint(){
  if(!this.active)return;this.place();const signature=this.paintSignature();if(signature===this.lastPaintSignature){this.syncSelection();this.syncLegacy();return;}this.lastPaintSignature=signature;const activeInside=this.host.contains(document.activeElement),activeKey=activeInside?document.activeElement?.dataset?.ansNavKey:null,scroll=this.state.scrollTop;this.tree.replaceChildren();
  const root=this.state.scope({groupKind:'providers'});
  if(root.error){this.tree.append(element('p','archive-navigator-error',copy('窗口导航暂时不可读；当前 Reader 仍可使用。','Window navigation is unavailable; the current Reader still works.')));this.syncLegacy();return;}
  if(root.coverage.state!=='complete'){this.tree.append(element('p','archive-navigator-loading',copy('正在整理窗口…','Preparing windows…')));this.syncLegacy();return;}
  if(!root.items.length)this.tree.append(element('p','archive-navigator-empty',copy('还没有可导航的窗口。','No archive windows yet.')));
  for(const provider of root.items){
   const section=element('section','archive-navigator-provider'),heading=element('h3','archive-navigator-provider-title',providerName(provider.providerKey));section.dataset.providerKey=provider.providerKey;section.append(heading);
   const groups=this.state.scope({providerKey:provider.providerKey,groupKind:'groups'});
   if(groups.coverage.state!=='complete'){section.append(element('p','archive-navigator-loading',copy('正在读取来源分组…','Loading source groups…')));this.tree.append(section);continue;}
   for(const group of groups.items){
    const groupBox=element('div','archive-navigator-group'),row=element('div','archive-navigator-group-row'),open=this.state.expandedFor(group),key=navigatorGroupKey(group.providerKey,group.groupKind,group.projectRef);
    const expand=element('button','archive-navigator-group-toggle',groupName(group));expand.type='button';expand.dataset.ansNavKey='group:'+key;expand.setAttribute('aria-expanded',String(open));expand.addEventListener('click',()=>void this.toggleGroup(group));row.append(expand);
    if(group.groupKind==='project'){const details=element('button','archive-navigator-detail',copy('详情','Details'));details.type='button';details.setAttribute('aria-label',copy('查看 Project 来源详情','View Project source details'));details.addEventListener('click',event=>this.detail({kind:'project',projectRef:group.projectRef},event.currentTarget));row.append(details);}
    groupBox.append(row);
    if(group.parentSourceStatus==='confirmed_deleted')groupBox.append(element('p','archive-navigator-source-state',copy('来源 Project 已删除；PAIA 内容保留','Source Project deleted; PAIA content retained')));
    if(open){
     const list=element('div','archive-navigator-windows'),scope=this.state.scope(this.groupOptions(group));
     if(scope.error)list.append(element('p','archive-navigator-error',copy('此分组暂时不可读。','This group is temporarily unavailable.')));
     else if(scope.coverage.state!=='complete')list.append(element('p','archive-navigator-loading',copy('正在读取窗口…','Loading windows…')));
     else{
      for(const item of scope.items){
       const windowRow=element('div','archive-navigator-window-row'),button=element('button','archive-navigator-window',item.title||copy('未命名窗口','Untitled window'));button.type='button';button.dataset.ansNavKey='window:'+item.documentId;button.dataset.documentId=item.documentId;if(item.documentId===this.selectedDocumentId)button.setAttribute('aria-current','page');button.addEventListener('click',()=>void this.openWindow(item));windowRow.append(button);
       if(item.conversationRef){const details=element('button','archive-navigator-detail',copy('详情','Details'));details.type='button';details.setAttribute('aria-label',copy('查看窗口来源详情','View window source details'));details.addEventListener('click',event=>this.detail({kind:'conversation',conversationRef:item.conversationRef},event.currentTarget));windowRow.append(details);}
       list.append(windowRow);
      }
      if(scope.nextCursor){const more=element('button','archive-navigator-more',scope.loading?copy('正在载入…','Loading…'):copy('继续载入窗口','Load more windows'));more.type='button';more.disabled=scope.loading;more.addEventListener('click',()=>void this.more(group));list.append(more);}
      else if(scope.items.length)list.append(element('p','archive-navigator-end',copy('此分组已全部载入','All windows in this group are loaded')));
     }
     groupBox.append(list);
    }
    section.append(groupBox);
   }
   this.tree.append(section);
  }
  this.syncLegacy();this.host.scrollTop=scroll;
  if(activeKey)queueMicrotask(()=>this.host.querySelector('[data-ans-nav-key="'+CSS.escape(activeKey)+'"]')?.focus({preventScroll:true}));
 }
}
