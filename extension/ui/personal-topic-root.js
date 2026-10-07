import {element} from './common.js';
import {placeChildren} from './retained-dom.js';
import {readTopicRootSlots,saveTopicRootSlots} from './topic-root-slots.js';
import {topicRootURL} from './topic-root-target.js';
import {continuousItemKey} from './continuous-collection.js';
import {highlightText} from './search-experience.js';

export class PersonalTopicRoot {
 constructor(host,{open,onResize=()=>{}}){
  this.host=host;this.open=open;this.slots=readTopicRootSlots();this.nodes=new Map();this.items=[];this.complete=false;
  this.resize=globalThis.ResizeObserver?new ResizeObserver(()=>{if(!this.items.length||!host.getClientRects().length)return;const columns=this.columns();if(columns===this.columnCount)return;this.layout();onResize();}):null;this.resize?.observe(host);

 }
 focusRef(){const active=document.activeElement;if(!this.host.contains(active)||active?.tagName!=='A')return null;return {topicId:active.dataset.topicId,sectionId:active.dataset.sectionId||null,more:active.classList.contains('personal-topic-more')};}
 restoreFocus(ref){const node=this.nodes.get(ref?.topicId);if(!node)return;const section=ref.sectionId?[...node.querySelectorAll('[data-section-id]')].find(link=>link.dataset.sectionId===ref.sectionId&&!link.hidden):null,more=node.querySelector('.personal-topic-more');(section||(ref.more||ref.sectionId)&&!more.hidden&&more||node.querySelector('.personal-topic-link'))?.focus({preventScroll:true});}
 columns(){return Math.max(1,Math.min(4,Math.floor((this.host.clientWidth+16)/240)));}
 link(text,topicId,sectionId=null,className=''){
  const a=element('a',className,text);a.href=topicRootURL(topicId,sectionId);a.dataset.topicId=topicId;if(sectionId)a.dataset.sectionId=sectionId;
  a.title=text;
  a.addEventListener('click',event=>{
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
  const current=new Set(items.map(item=>item.id));for(const [id,node]of this.nodes)if(!current.has(id)){node.remove();this.nodes.delete(id);}
  for(const item of items){
   const signature=JSON.stringify([document.documentElement.lang,item.name,item.sectionOverview.items.map(x=>[x.id,x.title]),item.sectionOverview.complete]),prior=this.nodes.get(item.id);
   if(prior?.dataset.searchState){for(const extra of prior.querySelectorAll('.personal-root-search-extra'))extra.remove();for(const link of prior.querySelectorAll('.personal-topic-link,.personal-section-link'))link.textContent=link.title;prior.classList.remove('personal-topic-nonmatch');delete prior.dataset.searchState;}
   if(prior?.dataset.signature===signature)continue;
   // Keep an active selection/focus attached through unrelated refreshes.
   const node=this.tile(item);node.dataset.signature=signature;
   if(prior){const active=document.activeElement,sectionId=prior.contains(active)?active.dataset.sectionId:null,titleFocused=prior.contains(active)&&active.classList.contains('personal-topic-link');prior.replaceWith(node);if(sectionId)[...node.querySelectorAll('[data-section-id]')].find(x=>x.dataset.sectionId===sectionId)?.focus({preventScroll:true});else if(titleFocused)node.querySelector('.personal-topic-link').focus({preventScroll:true});}
   this.nodes.set(item.id,node);
  }
  this.layout();if(focus&&(!this.host.contains(document.activeElement)||document.activeElement.hidden))this.restoreFocus(focus);this.host.dataset.loadedExtent=String(items.length);this.host.dataset.retainedBodies='0';
 }
 layout(){
  const columns=this.columns();this.columnCount=columns;const layout=this.slots.reconcile(this.items.map(item=>item.id),{columns,complete:this.complete}),nodes=[];
  this.host.style.setProperty('--topic-root-columns',String(columns));
  this.host.style.gridTemplateRows=`repeat(${Math.ceil(this.slots.extent(columns)/columns)},var(--topic-root-block-size))`;
  for(const {id,slot,column,row}of layout){const node=this.nodes.get(id);if(!node)continue;node.style.gridColumn=String(column);node.style.gridRow=String(row);node.dataset.rootSlot=String(slot);nodes.push(node);}
  placeChildren(this.host,nodes);for(const node of nodes)this.fit(node);saveTopicRootSlots(this.slots);
 }
 fit(node){
  const overview=node.querySelector('.personal-topic-sections'),more=node.querySelector('.personal-topic-more'),links=[...overview.children];more.hidden=false;for(const link of links)link.hidden=false;
  let used=0,truncated=false;const capacity=overview.clientHeight;
  for(const link of links){const size=link.getBoundingClientRect().height,hidden=used+size>capacity+.5;if(hidden){truncated=true;if(link===document.activeElement)more.focus({preventScroll:true});link.hidden=true;}else used+=size;}
  more.hidden=!truncated&&node.dataset.overviewComplete==='true';
 }
 search(results,query,{open}){
  const matches=new Map();
  for(const item of results)for(const path of item.paths||[item]){const id=path.topicId||item.topicId;if(id&&!matches.has(id))matches.set(id,{item,path});}
  for(const [id,node]of this.nodes){
   node.dataset.searchState='true';
   for(const extra of node.querySelectorAll('.personal-root-search-extra'))extra.remove();
   for(const link of node.querySelectorAll('.personal-topic-link,.personal-section-link')){link.textContent=link.title;highlightText(link,link.title,query);}
   const hit=matches.get(id);node.classList.toggle('personal-topic-nonmatch',!hit);
   if(hit){
    const {item,path}=hit,overview=node.querySelector('.personal-topic-sections');
    if(item.kind==='entry'||item.kind==='ai'){
     for(const link of overview.children)link.hidden=true;
     const en=document.documentElement.lang==='en',match=element('button','personal-root-search-extra personal-entry-match'),preview=element('span','personal-entry-preview'),masked=element('span','personal-entry-mask-label',en?'Content preview hidden · Open match':'内容预览已隐藏 · 查看匹配');match.type='button';match.addEventListener('click',()=>void open(item,path));highlightText(preview,item.snippet||(en?'Open match':'查看匹配'),query);match.append(preview,masked);overview.append(match);
    }else if((path.sectionId||item.sectionId)&&![...overview.children].some(link=>link.dataset.sectionId===(path.sectionId||item.sectionId)&&!link.hidden)){
     for(const link of overview.children)link.hidden=true;
     const match=this.link(path.sectionTitle||item.sectionTitle,id,path.sectionId||item.sectionId,'personal-root-search-extra personal-section-link');highlightText(match,match.title,query);overview.append(match);
    }
   }
  }
 }
 clear(){this.items=[];this.complete=false;this.nodes.clear();this.host.replaceChildren();}
 dispose(){this.resize?.disconnect();this.clear();}
}
