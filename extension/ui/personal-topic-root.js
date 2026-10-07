import {element} from './common.js';
import {placeChildren} from './retained-dom.js';
import {readTopicRootSlots,saveTopicRootSlots} from './topic-root-slots.js';
import {topicRootURL} from './topic-root-target.js';
import {continuousItemKey} from './continuous-collection.js';
import {highlightText} from './search-experience.js';

export class PersonalTopicRoot {
 constructor(host,{open,onResize=()=>{}}){
  this.host=host;this.open=open;this.slots=readTopicRootSlots();this.nodes=new Map();this.items=[];this.complete=false;
  this.resize=globalThis.ResizeObserver?new ResizeObserver(entries=>{if(!this.items.length||!host.getClientRects().length)return;const columns=this.columns();if(columns!==this.columnCount||host.clientWidth!==this.layoutWidth){this.layout();onResize();return;}for(const entry of entries){const node=entry.target.closest?.('.personal-topic-block');if(node&&this.nodes.get(node.dataset.topicId)===node&&!node.dataset.searchState)this.fit(node);}}):null;this.resize?.observe(host);

 }
 focusRef(){const active=document.activeElement;if(!this.host.contains(active)||active?.tagName!=='A'&&!active?.dataset.rootMatchKey&&!active?.dataset.rootMatchStep)return null;return {topicId:active.dataset.topicId,sectionId:active.dataset.sectionId||null,more:active.classList.contains('personal-topic-more'),...(active.dataset.rootMatchKey?{matchKey:active.dataset.rootMatchKey}:{}),...(active.dataset.rootMatchStep?{matchStep:active.dataset.rootMatchStep}:{})};}
 restoreFocus(ref){const node=this.nodes.get(ref?.topicId);if(!node)return;const match=ref.matchStep?[...node.querySelectorAll('[data-root-match-step]')].find(link=>link.dataset.rootMatchStep===ref.matchStep):ref.matchKey?[...node.querySelectorAll('[data-root-match-key]')].find(link=>link.dataset.rootMatchKey===ref.matchKey):null,section=ref.sectionId?[...node.querySelectorAll('[data-section-id]')].find(link=>link.dataset.sectionId===ref.sectionId&&!link.hidden):null,more=node.querySelector('.personal-topic-more');(match||section||(ref.more||ref.sectionId)&&!more.hidden&&more||node.querySelector('.personal-topic-link'))?.focus({preventScroll:true});}
 columns(){return Math.max(1,Math.min(4,Math.floor((this.host.clientWidth+16)/240)));}
 observeTitle(node,active){const title=node?.querySelector?.('.personal-topic-title');if(title)this.resize?.[active?'observe':'unobserve'](title);}
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
  const title=element('h2','personal-topic-title');title.append(this.link(item.name,item.id,null,'personal-topic-link'));tile.append(title);
  const overview=element('div','personal-topic-sections');
  for(const section of item.sectionOverview.items){const a=this.link(section.title,item.id,section.id,'personal-section-link');a.title=section.title;overview.append(a);}
  tile.append(overview);
  const en=document.documentElement.lang==='en',more=this.link(en?'Continue reading':'继续阅读',item.id,null,'personal-topic-more');more.setAttribute('aria-label',(en?'Continue reading ':'继续阅读 ')+item.name);tile.dataset.overviewComplete=String(item.sectionOverview.complete===true);tile.append(more);
  return tile;
 }
 render(items,{complete=false}={}){
  const focus=this.focusRef();
  this.items=items;this.complete=complete;this.host.classList.remove('topic-compact-list');this.host.classList.add('personal-topic-grid');
  const current=new Set(items.map(item=>item.id));for(const [id,node]of this.nodes)if(!current.has(id)){this.observeTitle(node,false);node.remove();this.nodes.delete(id);}
  for(const item of items){
   const signature=JSON.stringify([document.documentElement.lang,item.name,item.sectionOverview.items.map(x=>[x.id,x.title]),item.sectionOverview.complete]),prior=this.nodes.get(item.id);
   if(prior?.dataset.searchState){for(const extra of prior.querySelectorAll('.personal-root-search-extra'))extra.remove();for(const link of prior.querySelectorAll('.personal-topic-link,.personal-section-link'))link.textContent=link.title;prior.classList.remove('personal-topic-nonmatch');delete prior.dataset.searchState;}
   if(prior?.dataset.signature===signature)continue;
   // Keep an active selection/focus attached through unrelated refreshes.
   const node=this.tile(item);node.dataset.signature=signature;
   if(prior){this.observeTitle(prior,false);const active=document.activeElement,sectionId=prior.contains(active)?active.dataset.sectionId:null,titleFocused=prior.contains(active)&&active.classList.contains('personal-topic-link');prior.replaceWith(node);if(sectionId)[...node.querySelectorAll('[data-section-id]')].find(x=>x.dataset.sectionId===sectionId)?.focus({preventScroll:true});else if(titleFocused)node.querySelector('.personal-topic-link').focus({preventScroll:true});}
   this.nodes.set(item.id,node);this.observeTitle(node,true);
  }
  this.layout();if(focus&&(!this.host.contains(document.activeElement)||document.activeElement.hidden))this.restoreFocus(focus);this.host.dataset.loadedExtent=String(items.length);this.host.dataset.retainedBodies='0';
 }
 layout(){
  const columns=this.columns();this.columnCount=columns;this.layoutWidth=this.host.clientWidth;const layout=this.slots.reconcile(this.items.map(item=>item.id),{columns,complete:this.complete}),nodes=[];
  this.host.style.setProperty('--topic-root-columns',String(columns));
  this.host.style.gridTemplateRows=`repeat(${Math.ceil(this.slots.extent(columns)/columns)},var(--topic-root-block-size))`;
  for(const {id,slot,column,row}of layout){const node=this.nodes.get(id);if(!node)continue;node.style.gridColumn=String(column);node.style.gridRow=String(row);node.dataset.rootSlot=String(slot);nodes.push(node);}
  placeChildren(this.host,nodes);for(const node of nodes)this.fit(node);saveTopicRootSlots(this.slots);
 }
 fit(node){
  if(node.dataset.searchState==='true'&&['entry','ai','section'].includes(node.dataset.searchHitKind))return;
  const overview=node.querySelector('.personal-topic-sections'),more=node.querySelector('.personal-topic-more'),links=[...overview.children];more.hidden=false;for(const link of links)link.hidden=false;
  let used=0,truncated=false;const capacity=overview.clientHeight;
  for(const link of links){const size=link.getBoundingClientRect().height,hidden=used+size>capacity+.5;if(hidden){truncated=true;if(link===document.activeElement)more.focus({preventScroll:true});link.hidden=true;}else used+=size;}
  more.hidden=!truncated&&node.dataset.overviewComplete==='true';
 }
 search(results,query,{open,complete=false}){
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
 clear(){this.items=[];this.complete=false;for(const node of this.nodes.values())this.observeTitle(node,false);this.nodes.clear();this.host.replaceChildren();}
 dispose(){this.resize?.disconnect();this.clear();}
}
