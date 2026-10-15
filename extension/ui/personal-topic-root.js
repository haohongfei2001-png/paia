import {element} from './common.js';
import {createIcon} from './icons.js';
import {PersonalTopicPreviews} from './personal-topic-previews.js';
import {placeChildren} from './retained-dom.js';
import {TopicRootSlots,readTopicRootSlots,saveTopicRootSlots} from './topic-root-slots.js';
import {topicRootURL} from './topic-root-target.js';
import {continuousItemKey} from './continuous-collection.js';
import {highlightText} from './search-experience.js';

export class PersonalTopicRoot {
 constructor(host,{open,onResize=()=>{}}){
  this.host=host;this.open=open;this.slots=readTopicRootSlots();this.nodes=new Map();this.items=[];this.complete=false;this.previews=null;
  this.resize=globalThis.ResizeObserver?new ResizeObserver(entries=>{if(!this.items.length||!host.getClientRects().length)return;const columns=this.columns();if(columns!==this.columnCount||host.clientWidth!==this.layoutWidth){this.layout();onResize();return;}for(const entry of entries){const node=entry.target.closest?.('.personal-topic-block');if(node&&this.nodes.get(node.dataset.topicId)===node&&!node.dataset.searchState){this.fit(node);if(Math.abs((node.getBoundingClientRect?.().height||0)-(this.flowHeights?.get(node.dataset.topicId)||0))>.5){this.layout();onResize();return;}}}}):null;this.resize?.observe(host);

 }
 focusRef(){const active=document.activeElement;if(!this.host.contains(active)||active?.tagName!=='A'&&!active?.dataset.rootMatchKey&&!active?.dataset.rootMatchStep&&!active?.dataset.rootPreview)return null;return {topicId:active.dataset.topicId,sectionId:active.dataset.sectionId||null,more:active.classList.contains('personal-topic-more'),...(active.dataset.rootPreview?{preview:true}:{}),...(active.dataset.rootMatchKey?{matchKey:active.dataset.rootMatchKey}:{}),...(active.dataset.rootMatchStep?{matchStep:active.dataset.rootMatchStep}:{})};}
 restoreFocus(ref){const node=this.nodes.get(ref?.topicId);if(!node)return;const preview=ref.preview?node.querySelector('.personal-topic-preview button'):null,match=ref.matchStep?[...node.querySelectorAll('[data-root-match-step]')].find(link=>link.dataset.rootMatchStep===ref.matchStep):ref.matchKey?[...node.querySelectorAll('[data-root-match-key]')].find(link=>link.dataset.rootMatchKey===ref.matchKey):null,section=ref.sectionId?[...node.querySelectorAll('[data-section-id]')].find(link=>link.dataset.sectionId===ref.sectionId&&!link.hidden):null,more=node.querySelector('.personal-topic-more');(preview||match||section||(ref.more||ref.sectionId)&&!more.hidden&&more||node.querySelector('.personal-topic-link'))?.focus({preventScroll:true});}
 columns(){const columns=Number.parseInt(getComputedStyle(this.host).getPropertyValue('--topic-root-columns'),10);return Number.isFinite(columns)?Math.max(1,Math.min(3,columns)):1;}
 observeTitle(node,active){const title=node?.querySelector?.('.personal-topic-title');if(title)this.resize?.[active?'observe':'unobserve'](title);if(node)this.resize?.[active?'observe':'unobserve'](node);}
 link(text,topicId,sectionId=null,className='',isCurrent=()=>true){
  const a=element('a',className,text);a.href=topicRootURL(topicId,sectionId);a.draggable=false;a.dataset.topicId=topicId;if(sectionId)a.dataset.sectionId=sectionId;
  a.title=text;
  a.addEventListener('click',event=>{
   if(!isCurrent()){event.preventDefault();return;}
   const selection=getSelection();if(event.detail>0&&selection&&!selection.isCollapsed){event.preventDefault();return;}
   if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   event.preventDefault();void this.open(topicId,sectionId);
  });return a;
 }
 tile(item){
  const tile=element('article','personal-topic-block');tile.dataset.rootKey=continuousItemKey(item);tile.dataset.topicId=item.id;
  const title=element('h2','personal-topic-title'),symbol=element('span','personal-topic-symbol');symbol.setAttribute('aria-hidden','true');symbol.append(createIcon('thoughts'));title.append(symbol,this.link(item.name,item.id,null,'personal-topic-link'));tile.append(title);
  const overview=element('div','personal-topic-sections');
  for(const section of item.sectionOverview.items){const a=this.link(section.title,item.id,section.id,'personal-section-link');a.title=section.title;overview.append(a);}
  tile.append(overview);
  const preview=element('p','personal-topic-preview');preview.hidden=true;tile.append(preview);
  const en=document.documentElement.lang==='en',more=this.link(en?'Continue reading':'继续阅读',item.id,null,'personal-topic-more');more.setAttribute('aria-label',(en?'Continue reading ':'继续阅读 ')+item.name);tile.dataset.overviewComplete=String(item.sectionOverview.complete===true);tile.append(more);
  return tile;
 }
 lockSearchGeometry(){
  if(this.searchGeometry)return;
  // Read every currently displayed rectangle before clearing any private preview.
  // The reservation contains numeric geometry only and ends with this search.
  const rows=new Map([...this.nodes].map(([id,node])=>[id,{height:node.getBoundingClientRect().height,row:node.style.gridRow,column:node.style.gridColumn}]));
  this.searchGeometry={columns:this.columnCount,ids:this.items?.map(item=>item.id)||[...this.nodes.keys()],rows};
  for(const [id,node]of this.nodes)node.style.height=`${rows.get(id).height}px`;
 }
 beginSearch(){this.lockSearchGeometry();this.previews?.clear();}
 releaseSearchGeometry(){this.searchGeometry=null;for(const node of this.nodes.values())if(node.style?.height)node.style.removeProperty('height');}
 // Back may retain geometry, never nodes or body text; locale and ordered
 // metadata qualify it again before a fresh card receives the reservation.
 searchMetadata(items){return JSON.stringify([document.documentElement.lang,items.map(item=>[item.id,item.revision,item.organizationRevision,item.layoutGeneration,item.name,item.sectionOverview.items.map(section=>[section.id,section.title,section.revision]),item.sectionOverview.complete])]);}
 // Match the existing bounded identity-address envelope. This is one current
 // Root departure, not an accumulating body cache or a persistent history field.
 captureReturnGeometry(){
  if(this.searchQuery||!this.previews||this.items.length>50000)return null;
  const rows=[];for(const item of this.items){const height=this.nodes.get(item.id)?.querySelector('.personal-topic-preview')?.getBoundingClientRect().height;if(Number.isFinite(height)&&height>0)rows.push({id:item.id,revision:item.revision??null,organizationRevision:item.organizationRevision??null,layoutGeneration:item.layoutGeneration??null,height});}
  return {width:this.host.clientWidth,columns:this.columns(),presentation:this.previews.presentationKey(),epoch:this.previews.geometryEpoch||0,count:this.items.length,rows};
 }
 restoreReturnGeometry(saved,items){
  if(!saved||items.length>50000||saved.rows.length>50000||saved.count!==items.length||saved.width!==this.host.clientWidth||saved.columns!==this.columns()||saved.presentation!==this.previews.presentationKey()||saved.epoch!==(this.previews.geometryEpoch||0))return;
  const refs=new Map(items.map(item=>[item.id,item]));
  if(saved.rows.some(row=>{const item=refs.get(row.id);return !item||['revision','organizationRevision','layoutGeneration'].some(key=>(item[key]??null)!==row[key]);}))return;
  for(const {id,height}of saved.rows){const preview=this.nodes.get(id)?.querySelector('.personal-topic-preview');if(preview&&Number.isFinite(height)&&height>0){preview.style.minHeight=`${height}px`;preview.hidden=false;}}
 }
 render(items,{complete=false,preserveSearch=false,searchSession=null,query='',returnGeometry=null}={}){
  this.previews??=new PersonalTopicPreviews(this.host,{nodes:()=>this.nodes,open:(topicId,sectionId)=>this.open(topicId,sectionId)});
  this.rememberRows();
  const focus=this.focusRef();
  const signature=item=>JSON.stringify([document.documentElement.lang,item.name,item.sectionOverview.items.map(x=>[x.id,x.title]),item.sectionOverview.complete]);
  const retained=preserveSearch&&items.length===this.nodes.size&&items.every((item,index)=>this.items?.[index]?.id===item.id&&this.nodes.get(item.id)?.dataset.signature===signature(item));
  const saved=this.suspendedSearchGeometry;this.suspendedSearchGeometry=null;
  const restored=preserveSearch&&saved&&saved.session===searchSession&&saved.query===query&&saved.width===this.host.clientWidth&&saved.columns===this.columns()&&saved.metadata===this.searchMetadata(items);
  if(retained)this.lockSearchGeometry();else this.releaseSearchGeometry();
  if(restored)this.searchGeometry=saved.geometry;
  this.items=items;this.complete=complete;this.host.classList.remove('topic-compact-list');this.host.classList.add('personal-topic-grid');
  const current=new Set(items.map(item=>item.id));for(const [id,node]of this.nodes)if(!current.has(id)){this.previews?.release(node);this.observeTitle(node,false);node.remove();this.nodes.delete(id);}
  for(const item of items){
   const signature=JSON.stringify([document.documentElement.lang,item.name,item.sectionOverview.items.map(x=>[x.id,x.title]),item.sectionOverview.complete]),prior=this.nodes.get(item.id);
   if(prior?.dataset.searchState&&!retained){for(const extra of prior.querySelectorAll('.personal-root-search-extra'))extra.remove();for(const link of prior.querySelectorAll('.personal-topic-link,.personal-section-link'))link.textContent=link.title;prior.classList.remove('personal-topic-nonmatch');delete prior.dataset.searchState;prior.style.removeProperty('height');}
   if(prior?.dataset.signature===signature)continue;
   const title=prior?.querySelector('.personal-topic-link');
   if(!preserveSearch&&title&&prior.dataset.signature===JSON.stringify([document.documentElement.lang,title.title,item.sectionOverview.items.map(x=>[x.id,x.title]),item.sectionOverview.complete])){
    // A name-only edit retains the identity node and measured preview shell.
    // The preview owner has already revoked text and requalifies visible rows.
    title.title=item.name;title.textContent=item.name;prior.dataset.signature=signature;
    prior.querySelector('.personal-topic-more').setAttribute('aria-label',(document.documentElement.lang==='en'?'Continue reading ':'继续阅读 ')+item.name);continue;
   }
   // Keep an active selection/focus attached through unrelated refreshes.
   const node=this.tile(item);node.dataset.signature=signature;
   if(prior){this.previews?.release(prior);this.observeTitle(prior,false);const active=document.activeElement,sectionId=prior.contains(active)?active.dataset.sectionId:null,titleFocused=prior.contains(active)&&active.classList.contains('personal-topic-link');prior.replaceWith(node);if(sectionId)[...node.querySelectorAll('[data-section-id]')].find(x=>x.dataset.sectionId===sectionId)?.focus({preventScroll:true});else if(titleFocused)node.querySelector('.personal-topic-link').focus({preventScroll:true});}
   this.nodes.set(item.id,node);this.observeTitle(node,true);
  }
  if(restored)for(const [id,node]of this.nodes)node.style.height=`${this.searchGeometry.rows.get(id).height}px`;
  if(!preserveSearch)this.restoreReturnGeometry(returnGeometry,items);
  this.layout();if(focus&&(!this.host.contains(document.activeElement)||document.activeElement.hidden))this.restoreFocus(focus);this.host.dataset.loadedExtent=String(items.length);this.host.dataset.retainedBodies='0';if(preserveSearch)this.lockSearchGeometry();else this.previews?.update(items);
 }
 rememberRows(){
  // Permanent blank row reservations were superseded by TL-PT1-UI-1.1 V2.
  // Identity history remains metadata-only; actual heights follow content.
 }
 layout(){
  const columns=this.columns();
  if(this.searchGeometry&&(this.searchGeometry.columns!==columns||this.items.length!==this.searchGeometry.ids.length||this.items.some((item,index)=>item.id!==this.searchGeometry.ids[index])))this.releaseSearchGeometry();
  const locked=this.searchGeometry;this.columnCount=columns;this.layoutWidth=this.host.clientWidth;
  const layout=this.slots.reconcile(this.items.map(item=>item.id),{columns,complete:this.complete}),nodes=[];
  this.host.style.gridTemplateRows='none';
  for(const {id,slot}of layout){const node=this.nodes.get(id);if(!node)continue;node.style.gridColumn=String(nodes.length%columns+1);node.dataset.rootSlot=String(slot);nodes.push(node);}
  placeChildren(this.host,nodes);for(const node of nodes)this.fit(node);
  // Explicit one-pixel grid tracks give deterministic independent column
  // stacking without wrappers, random shortest-column packing, or DOM moves.
  // Keep existing identity/focus/selection nodes and natural card heights.
  const ends=Array(columns).fill(1),heights=nodes.map(node=>locked?.rows.get(node.dataset.topicId)?.height??node.getBoundingClientRect().height);this.flowHeights=new Map();
  nodes.forEach((node,index)=>{const column=index%columns,height=heights[index];this.flowHeights.set(node.dataset.topicId,height);const span=Math.max(1,Math.ceil(height));node.style.gridRow=locked?.rows.get(node.dataset.topicId)?.row||`${ends[column]} / span ${span}`;ends[column]+=span+20;});
  saveTopicRootSlots(this.slots);if(!locked&&nodes.some(node=>node.dataset.searchState==='true'))this.lockSearchGeometry();
 }
 fit(node){
  if(node.dataset.searchState==='true'&&['entry','ai','section'].includes(node.dataset.searchHitKind))return;
  const overview=node.querySelector('.personal-topic-sections'),more=node.querySelector('.personal-topic-more'),links=[...overview.children];more.hidden=false;for(const link of links)link.hidden=false;
  // The qualified bounded overview controls continuation; available pixels do
  // not hide authentic chapter links. Cards grow with their actual content.
  more.hidden=node.dataset.overviewComplete==='true';
 }
 search(results,query,{open,complete=false}){
  this.beginSearch();
  const matches=new Map();
  if(this.searchQuery!==query){this.searchQuery=query;this.searchPositions=new Map();}this.searchPositions??=new Map();
  const token=this.searchRevision=(this.searchRevision||0)+1;
  for(const item of results)for(const path of item.paths||[item]){const id=path.topicId||item.topicId;if(!id)continue;const key=JSON.stringify([item.kind,item.entryId||null,path.sectionId||item.sectionId||null,item.aiField||null]),group=matches.get(id)||{hits:[],keys:new Set()};if(!group.keys.has(key)){group.hits.push({item,path,key});group.keys.add(key);}matches.set(id,group);}
  for(const id of this.searchPositions.keys())if(!matches.has(id))this.searchPositions.delete(id);
  for(const [id,node]of this.nodes){
   node.dataset.searchState='true';
   for(const extra of node.querySelectorAll('.personal-root-search-extra'))extra.remove();
   for(const link of node.querySelectorAll('.personal-topic-link,.personal-section-link')){link.textContent=link.title;highlightText(link,link.title,query);}
   const hits=matches.get(id)?.hits;node.classList.toggle('personal-topic-nonmatch',!hits);
   if(hits){
    const overview=node.querySelector('.personal-topic-sections'),links=[...overview.children],en=document.documentElement.lang==='en';
    let index=Math.max(0,hits.findIndex(hit=>hit.key===this.searchPositions.get(id))),status;
    const current=()=>this.searchRevision===token&&this.nodes.get(id)===node&&node.isConnected&&this.host.contains(node)&&node.dataset.searchState==='true';
    const show=next=>{
     if(!current())return;index=(next+hits.length)%hits.length;const {item,path,key}=hits[index];this.searchPositions.set(id,key);
     for(const extra of [...overview.children].filter(link=>link.classList.contains('personal-root-search-extra')))extra.remove();for(const link of links)link.hidden=false;
     node.dataset.searchHitKind=item.kind;node.dataset.searchHitKey=key;
     if(status)status.textContent=`${index+1} / ${hits.length}${complete?'':'+'}`;
     if(item.kind==='entry'||item.kind==='ai'){
     for(const link of overview.children)link.hidden=true;
     const match=element('button','personal-root-search-extra personal-entry-match'),preview=element('span','personal-entry-preview'),masked=element('span','personal-entry-mask-label',en?'Content preview hidden · Open match':'内容预览已隐藏 · 查看匹配');match.type='button';match.dataset.topicId=id;match.dataset.rootMatchKey=key;match.addEventListener('click',()=>{if(current()&&match.isConnected&&node.contains(match)&&this.searchPositions.get(id)===key)void open(item,path);});highlightText(preview,item.snippet||(en?'Open match':'查看匹配'),query);match.append(preview,masked);overview.append(match);
    }else if(path.sectionId||item.sectionId){
     for(const link of overview.children)link.hidden=true;
     const match=this.link(path.sectionTitle||item.sectionTitle,id,path.sectionId||item.sectionId,'personal-root-search-extra personal-section-link',()=>current()&&match.isConnected&&node.contains(match)&&this.searchPositions.get(id)===key);match.dataset.rootMatchKey=key;highlightText(match,match.title,query);overview.append(match);
    }else this.fit?.(node);
    };
    if(hits.length>1){
     const nav=element('div','personal-root-search-extra personal-root-match-nav');status=element('span','personal-root-match-status');status.setAttribute('aria-live','polite');
     for(const [direction,label,delta]of [['previous',en?'Previous match':'上一个匹配',-1],['next',en?'Next match':'下一个匹配',1]]){const step=element('button','personal-root-match-step',direction==='previous'?'‹':'›');step.type='button';step.dataset.topicId=id;step.dataset.rootMatchStep=direction;step.setAttribute('aria-label',label);step.addEventListener('click',()=>show(index+delta));nav.append(step);if(direction==='previous')nav.append(status);}
     node.insertBefore(nav,node.querySelector('.personal-topic-more'));
    }
    show(index);
   }else{delete node.dataset.searchHitKind;delete node.dataset.searchHitKey;this.fit?.(node);}
  }
 }
 beginOrder(){this.clear();this.rowHeights?.clear();this.slots=new TopicRootSlots();}
 clear({searchSession=null}={}){this.suspendedSearchGeometry=searchSession&&this.searchGeometry?{session:searchSession,query:this.searchQuery,width:this.host.clientWidth,columns:this.columnCount,metadata:this.searchMetadata(this.items),geometry:this.searchGeometry}:searchSession&&this.suspendedSearchGeometry?.session===searchSession?this.suspendedSearchGeometry:null;this.releaseSearchGeometry();this.previews?.clear();this.items=[];this.complete=false;for(const node of this.nodes.values())this.observeTitle(node,false);this.nodes.clear();this.flowHeights?.clear();this.host.replaceChildren();}
 dispose(){this.previews?.dispose();this.resize?.disconnect();this.clear();}
}
