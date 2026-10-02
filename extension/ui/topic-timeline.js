import {request,element} from './common.js';
import {TopicTimelineWindow,timelineYears} from './topic-timeline-window.js';
import {exactExcerpt} from '../core/organizer/topic-excerpt.js';
import {highlightReading} from './search-experience.js';
import {readingCopyButton} from './reading-actions.js';
const en=()=>document.documentElement.lang==='en';
const text=(zh,english)=>en()?english:zh;
const button=(label,action)=>{const b=element('button','',label);b.type='button';b.addEventListener('click',()=>void action());return b;};
const yearLabel=year=>year==='unknown'?text('时间未知','Unknown time'):String(year);
export function expressionCaption(entry,english=false){
 const t=entry.expressionTime,role=entry.provenanceType==='input_original'?(english?'Input expression':'输入表达'):entry.provenanceType==='user_created'?(english?'Human Thought':'人工思想'):(english?'Retained material':'收录材料');
 if(!t?.at)return role+' · '+(english?'Expression time unknown':'表达时间未知');
 const date=new Intl.DateTimeFormat(english?'en':'zh-CN',{timeZone:'UTC',dateStyle:'medium',timeStyle:'short'}).format(new Date(t.at));
 return role+' · '+(t.basis==='source'?(english?'Sent ':'发送于 '):(english?'Created ':'创建于 '))+date+' UTC';
}
export class TopicTimeline {
 constructor({host,onStatus,onQueryReset=()=>{}}){this.host=host;this.onStatus=onStatus;this.onQueryReset=onQueryReset;this.epoch=0;this.yearOffset=0;this.window=new TopicTimelineWindow(options=>request('GET_LIBRARY_TOPIC_TIMELINE',{options}));this.state={year:null,query:'',position:null,anchor:null};this.autoForward=true;}
 visible(){return this.active===true&&this.host.isConnected&&!this.host.hidden;}
 anchor(){const node=[...this.host.querySelectorAll('[data-expression-id]')].find(node=>node.getBoundingClientRect().bottom>140);return node?{id:node.dataset.expressionId,top:node.getBoundingClientRect().top}:null;}
 restoreAnchor(anchor){if(!anchor)return false;const node=[...this.host.querySelectorAll('[data-expression-id]')].find(node=>node.dataset.expressionId===anchor.id);if(node){scrollBy(0,node.getBoundingClientRect().top-anchor.top);return true;}return false;}
 snapshot(){return {...this.state,position:this.window.snapshot(),anchor:this.anchor(),yearOffset:this.yearOffset,scroll:scrollY,autoForward:this.autoForward};}
 dispose(){this.active=false;this.host.hidden=true;this.epoch++;this.openIntent=(this.openIntent||0)+1;this.observer?.disconnect();clearTimeout(this.retryTimer);this.window.clear();this.overview=null;this.host.replaceChildren();this.dialog?.close();this.dialog?.remove();this.dialog=null;}
 invalidate(){const saved=this.snapshot();this.dispose();this.state={...saved,position:null,anchor:null};return saved;}
 async open({topicId,providerKey=null,sort='asc',saved=null,query=''}){
  this.dispose();this.active=true;this.host.hidden=false;this.topicId=topicId;this.providerKey=providerKey;this.sort=sort;this.state={year:null,query:'',position:null,anchor:null,...saved};this.yearOffset=saved?.yearOffset||0;this.autoForward=saved?.autoForward??true;
  if(query!==this.state.query){if(query&&!this.state.query)this.preSearch={...this.state};this.state={...this.state,query,position:null,anchor:null};}
  await this.render();
 }
 async changeQuery(query){
  if(query===this.state.query)return;
  if(query&&!this.state.query)this.preSearch=this.snapshot();
  this.state=query?{...this.state,query,position:null,anchor:null}:{...(this.preSearch||this.state),query:''};
  this.autoForward=query?true:this.state.autoForward??true;if(!query)this.preSearch=null;await this.render();
 }
 async showYear(year){this.autoForward=true;this.onQueryReset();this.preSearch=null;this.state={year,query:'',position:null,anchor:null};await this.render();this.host.querySelector('h2')?.focus({preventScroll:true});}
 async render(){
  const epoch=++this.epoch;delete this.host.dataset.timelineQuery;this.observer?.disconnect();clearTimeout(this.retryTimer);this.window.clear();this.host.replaceChildren(element('p','muted',text('正在读取表达时间…','Reading expression dates…')));
  const current=()=>epoch===this.epoch&&this.visible();
  if(this.state.year===null&&!this.state.query){
   let page;try{page=await request('GET_LIBRARY_TOPIC_TIMELINE',{options:{topicId:this.topicId,providerKey:this.providerKey,limit:1}});}catch{if(current())this.failure(()=>this.render());return;}
   if(!current())return;
   if(page.indexing||page.cursorInvalid){this.pending();return;}
   this.overview=page.overview;this.host.replaceChildren();await this.renderOverview(epoch);if(current()&&!this.restoreAnchor(this.state.anchor)&&Number.isFinite(this.state.scroll))scrollTo(0,this.state.scroll);return;
  }
  this.window.reset({topicId:this.topicId,providerKey:this.providerKey,sort:this.sort,year:this.state.query?null:this.state.year,query:this.state.query},this.state.position);
  await this.window.initial();if(!current())return;
  if(this.window.stale){this.state.position=null;this.state.anchor=null;this.onStatus(text('内容刚有更新，已重新核对表达时间。','Material changed; expression dates were rechecked.'));await this.render();return;}
  if(this.window.indexing){this.pending();return;}
  if(this.window.error){this.failure(()=>this.render());return;}
  this.overview=this.window.overview;this.renderWindow();this.restoreAnchor(this.state.anchor);
 }
 pending(){this.host.replaceChildren(element('p','muted',text('正在准备年份索引，当前范围尚未完整。','Preparing the year index; coverage is not complete yet.')),button(text('继续读取','Continue reading'),()=>this.render()));this.retryTimer=setTimeout(()=>{if(this.visible())void this.render();},350);}
 failure(retry){this.host.append(element('p','muted',text('读取中断，尚不能判断此范围为空。','Reading was interrupted; this does not establish an empty range.')),button(text('重试读取','Retry reading'),retry));}
 async renderOverview(epoch){
  const overview=this.overview;if(!overview||overview.coverage!=='complete'){this.pending();return;}
  this.host.append(element('p','topic-year-coverage',text(`已收录 ${overview.total} 条表达 · 年份按 UTC 计算`,` ${overview.total} retained expressions · Years use UTC`).trim()),element('p','muted',text('每年预览最早与最近的已收录表达，不按重要性筛选。收录不代表完整历史；引文和第三方说法按原文保留，不推断立场。','Each year previews the earliest and latest retained expressions, without importance ranking. This is not a complete history. Quotations and third-party statements remain as written, without inferred beliefs.')));
  const rows=timelineYears(overview),nav=element('nav','topic-year-links');nav.setAttribute('aria-label',text('年份','Years'));
  for(const row of rows.slice(this.yearOffset,this.yearOffset+6)){if(row.empty)continue;const b=button(yearLabel(row.year),()=>this.host.querySelector(`[data-year-section="${row.year}"]`)?.scrollIntoView({block:'start'}));nav.append(b);}this.host.append(nav);
  if(!rows.length)this.host.append(element('p','muted',text('这个主题还没有可读取的表达，可以直接写下想法。','This Topic has no readable expressions yet. You can write a Thought.')));
  for(const row of rows.slice(this.yearOffset,this.yearOffset+6)){
   if(epoch!==this.epoch)return;
   const section=element('section','topic-year-section');section.dataset.yearSection=String(row.year??`${row.from}-${row.to}`);
   section.append(element('h2','',row.empty&&row.year===null?`${row.from}–${row.to}`:yearLabel(row.year)));
   if(row.empty){section.append(element('p','muted',text('没有已收录记录','No retained records')));this.host.append(section);continue;}
   const total=element('p','muted',text(`已收录 ${row.count} 条`,` ${row.count} retained expressions`).trim());section.append(total);
   const previews=element('div','topic-year-previews');section.append(previews);this.host.append(section);
   const collected=[];let partial=false;
   for(const sort of row.count>1&&row.year!=='unknown'?['asc','desc']:['asc']){
    let cursor=null,found=null;
    for(let i=0;i<25;i++){
     let page;try{page=await request('GET_LIBRARY_TOPIC_TIMELINE',{options:{topicId:this.topicId,providerKey:this.providerKey,year:row.year,sort,limit:40,cursor,expectedReadGeneration:overview.generation}});}catch{partial=true;break;}
     if(epoch!==this.epoch)return;
     if(page.cursorInvalid||page.indexing){this.window.clear();this.overview=null;this.pending();return;}
     found=page.items[0]?.entry;if(found||!page.nextCursor)break;cursor=page.nextCursor;if(i===24)partial=true;
    }
    if(found&&!collected.some(entry=>entry.id===found.id)){
     // Keep only a bounded exact excerpt, never a hidden full preview body.
     const excerpt=found.large?null:exactExcerpt(found.body||'',420);collected.push({id:found.id,revision:found.revision,provenanceType:found.provenanceType,expressionTime:found.expressionTime,large:found.large,body:excerpt?.text||'',truncated:excerpt?.truncated===true});
    }
   }
   for(const entry of collected)previews.append(this.entryNode(entry,true));
   const shown=collected.length;total.textContent=text(`预览 ${shown} / ${row.count} 条 · 其余 ${Math.max(0,row.count-shown)} 条`,`Previewing ${shown} of ${row.count} · ${Math.max(0,row.count-shown)} remaining`);
   if(partial)section.append(element('p','muted',text('本次预览尚未读完整，请打开这一年的全部表达。','This preview is incomplete; open the complete year.')));
   const open=button(row.year==='unknown'?text('查看全部时间未知的表达','Read all expressions with unknown time'):text('查看这一年的全部表达','Read every expression from this year'),()=>this.showYear(row.year));open.dataset.openYear=String(row.year);section.append(open);
  }
  if(this.yearOffset>0)this.host.append(button(text('查看较近年份','Show more recent years'),async()=>{this.yearOffset=Math.max(0,this.yearOffset-6);await this.render();}));
  if(rows.length>this.yearOffset+6)this.host.append(button(text('查看更早年份','Show earlier years'),async()=>{this.yearOffset+=6;await this.render();}));
 }
 entryNode(entry,preview=false){
  const node=element('article','topic-year-expression');node.dataset.expressionId=entry.id;node.append(element('p','entry-sent-time',expressionCaption(entry,en())));
  if(entry.large)node.append(element('p','muted',text('这条表达较长，请打开完整内容。','This expression is long. Open its complete text.')));
  else{node.append(element('p','entry-prose',entry.body||''));if(entry.truncated)node.append(element('span','muted',text('摘录未显示完整内容','This excerpt is not the complete text')));}
  const actions=element('div','topic-expression-actions'),open=button(text('查看完整表达','Open complete expression'),()=>this.openExpression(entry));actions.append(open);
  if(!preview&&!entry.large)actions.append(readingCopyButton(async()=>{const fresh=await this.freshEntry(entry);if(fresh.body!==entry.body)throw Error('CHANGED');return fresh.body;},this.onStatus));
  node.append(actions);return node;
 }
 async freshEntry(entry){
  const epoch=this.epoch,topicId=this.topicId,generation=this.overview?.generation;
  const live=await request('GET_LIBRARY_ENTRY',{id:entry.id});
  const guard=await request('GET_LIBRARY_TOPIC_TIMELINE',{options:{topicId,providerKey:this.providerKey,limit:1,expectedReadGeneration:generation}});
  if(epoch!==this.epoch||!this.visible()||guard.cursorInvalid||guard.indexing||live.lifecycle!=='active'||live.revision!==entry.revision||live.staleReasons?.includes('source_purged'))throw Error('STALE_EXPRESSION');
  return live;
 }
 async openExpression(entry){
  const intent=this.openIntent=(this.openIntent||0)+1;
  try{const live=await this.freshEntry(entry);if(intent!==this.openIntent)return;this.dialog?.remove();const trigger=document.activeElement,dialog=element('dialog','topic-expression-dialog');this.dialog=dialog;dialog.append(element('h2','',text('完整表达','Complete expression')),element('p','muted',expressionCaption(entry,en())),element('p','entry-prose',live.body),button(text('关闭','Close'),()=>dialog.close()));dialog.addEventListener('close',()=>{dialog.remove();if(this.dialog===dialog)this.dialog=null;trigger?.focus({preventScroll:true});});document.body.append(dialog);dialog.showModal();}
  catch{if(intent!==this.openIntent)return;this.onStatus(text('内容已变化或暂不可读，请重新读取。','This expression changed or is unavailable. Read it again.'),'error');}
 }
 renderWindow(){
  this.host.dataset.timelineQuery=this.state.query;this.observer?.disconnect();this.host.replaceChildren();
  const heading=element('h2','',this.state.query?text('此主题的匹配表达','Matching expressions in this Topic'):yearLabel(this.state.year));heading.tabIndex=-1;
  this.host.append(button(text('返回这些年','Back to years'),()=>this.showYear(null)),heading);
  const total=this.state.query?null:this.state.year==='unknown'?this.overview.unknownCount:this.overview.knownYearCounts[this.state.year]||0;
  this.host.append(element('p','topic-year-coverage',total===null?text('检索整个主题，包含未展开的年份；继续读取可查到范围末尾。','Searching the whole Topic, including collapsed years. Continue reading to reach the end.'):text(`这一年已收录 ${total} 条 · 当前窗口 ${this.window.items.length} 条 · UTC`,` ${total} retained expressions · ${this.window.items.length} in this window · UTC`).trim()));
  const before=button(text('继续读取前面的表达','Read earlier expressions'),()=>this.load('prev'));before.dataset.timelineBefore='';before.hidden=!this.window.previousCursor;this.host.append(before);
  for(const item of this.window.items)this.host.append(this.entryNode(item.entry));
  const after=button(this.window.error?text('重试读取','Retry reading'):text('继续读取全部表达','Continue reading all expressions'),()=>this.load('next'));after.dataset.timelineAfter='';after.hidden=!this.window.nextCursor;this.host.append(after);
  if(!this.window.nextCursor)this.host.append(element('p','muted',text('已到此范围的末尾','End of this range')));
  if(this.window.error)this.failure(()=>this.load(this.failedDirection||'next'));
  if(this.state.query)highlightReading(this.host,this.state.query);
  // Only forward continuation is automatic. Earlier windows remain explicitly
  // reachable; two visible empty-result edges cannot bounce between cursors.
  if('IntersectionObserver'in window&&!after.hidden&&this.autoForward&&!this.window.error){this.observer=new IntersectionObserver(entries=>{if(!this.visible()||this.window.loading)return;if(entries.some(entry=>entry.isIntersecting&&!entry.target.hidden))void this.load('next',{automatic:true});},{rootMargin:'250px 0px'});this.observer.observe(after);}
 }
 async load(direction,{automatic=false}={}){
  if(this.window.loading||!this.visible()||automatic&&(!this.autoForward||this.window.error))return;if(!automatic)this.autoForward=direction==='next';this.host.setAttribute('aria-busy','true');const epoch=this.epoch,anchor=this.anchor();this.failedDirection=direction;
  const loaded=await (direction==='prev'?this.window.previous():this.window.next());this.host.setAttribute('aria-busy','false');if(epoch!==this.epoch||!this.visible())return;
  if(this.window.stale){this.state.position=null;this.state.anchor=null;await this.render();return;}if(this.window.indexing){this.pending();return;}
  if(loaded||this.window.error){this.renderWindow();this.restoreAnchor(anchor);}
 }
}
