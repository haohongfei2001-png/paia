import {element} from './common.js';
import {ContextTopicSearch} from './context-topic-search.js';
import {ContextTopicViewer} from './context-topic-viewer.js';
const text=(zh,en)=>document.documentElement.lang==='en'?en:zh;
const names={info:['我的信息','My Information'],rules:['我的规则','My Rules'],now:['我的现在','My Now']};
const button=(label,run)=>{const node=element('button','standard-button',label);node.type='button';node.onclick=run;return node;};
const ref=item=>({id:item.id,revision:item.revision,card:item.card,section:item.section});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function validSnapshot(value){return value?.version===1&&typeof value.epoch==='string'&&Array.isArray(value.items)&&value.items.length<=512&&value.items.every(item=>names[item.card]&&typeof item.id==='string'&&typeof item.body==='string'&&item.body.length<=8192&&typeof item.section==='string'&&Number.isSafeInteger(item.revision))&&new TextEncoder().encode(JSON.stringify(value)).length<=2*1024*1024;}
// Explicit local search; Home itself still receives only mode:'home'. Result
// memory contains bounded snippets and identities, never another body store.
export class ContextHomeSearch {
 constructor({host,send,beforeSearch=async()=>true,openItem,onState=()=>{},onResults=()=>{},state=null}){
  Object.assign(this,{send,beforeSearch,openItem,onState,onResults});this.active=true;this.generation=0;this.query='';this.offset=0;this.matches=[];this.rows=new Map();this.busy=false;this.composing=false;this.savedState=state;
  this.root=element('section','context-home-search');this.form=element('form','context-search');this.field=element('input');this.field.type='search';this.field.autocomplete='off';this.field.spellcheck=false;this.field.setAttribute('aria-label',text('搜索 AI 上下文','Search AI Context'));this.field.placeholder=text('搜索 AI 上下文','Search AI Context');this.field.value=state?.query||'';
  this.submit=button(text('搜索','Search'),()=>{});this.submit.type='submit';this.clearButton=button(text('清空','Clear'),()=>this.clear());this.form.append(this.field,this.submit,this.clearButton);
  this.status=element('p','context-search-status');this.status.setAttribute('role','status');this.results=element('div','context-home-search-results');this.itemResults=element('div','context-home-item-results');this.topicHost=element('div');
  this.previous=button(text('前面的结果','Earlier results'),()=>this.page(-1));this.next=button(text('后面的结果','More results'),()=>this.page(1));const controls=element('div','context-topic-viewer-actions');controls.append(this.previous,this.next);this.results.append(this.itemResults,controls,this.topicHost);this.results.hidden=true;this.root.append(this.form,this.status,this.results);host.append(this.root);
  this.field.addEventListener('compositionstart',()=>{this.composing=true;});this.field.addEventListener('compositionend',()=>{this.composing=false;});this.form.addEventListener('submit',event=>{event.preventDefault();if(!this.composing&&!event.isComposing)void this.search(this.field.value);});
  this.changed=message=>{if(['ARCHIVE_CHANGED','PAIA_CONTEXT_CARDS_CHANGED'].includes(message?.type))this.invalidate();};this.visibility=()=>{if(document.hidden)this.invalidate();};globalThis.chrome?.runtime?.onMessage?.addListener(this.changed);document.addEventListener('visibilitychange',this.visibility);
 }
 current(generation){return this.active&&!document.hidden&&generation===this.generation;}
 state(){return {query:this.query,offset:this.offset,anchor:this.anchor?{...this.anchor}:null};}
 save(){this.onState(this.state());}
 release(){this.topics?.close();this.topics=null;this.viewer?.close();this.viewer=null;this.matches=[];this.rows.clear();this.itemResults.replaceChildren();this.topicHost.replaceChildren();}
 clear(){if(this.composing)return false;this.generation++;this.release();this.busy=false;this.query='';this.field.value='';this.offset=0;this.anchor=null;this.results.hidden=true;this.status.textContent='';this.onResults(false);this.save();return true;}
 invalidate(){if(!this.active)return;this.generation++;this.release();this.busy=false;this.status.textContent=this.query?text('内容已变化或页面已隐藏，请重新搜索。','Content changed or the page was hidden. Search again.'):'';}
 async restore(){const saved=this.savedState;this.savedState=null;if(!saved?.query)return false;return this.search(saved.query,saved);}
 async search(query,restore=null){
  if(!this.active||this.composing||document.hidden)return false;query=String(query??'').trim();if(!query)return this.clear();
  if(query.length>500){this.status.textContent=text('查询过长，请缩短后重试。','Query is too long. Shorten it and retry.');return false;}
  const generation=++this.generation;this.release();this.busy=true;this.query=query;this.field.value=query;this.offset=0;this.anchor=null;this.results.hidden=false;this.onResults(true);this.save();this.status.textContent=text('正在搜索本机上下文…','Searching local Context…');
  const focusAtStart=document.activeElement;let focusMoved=false,restoreControl=null;const moved=()=>{focusMoved=true;};
  if(restore){document.addEventListener('focusin',moved);document.addEventListener('pointerdown',moved);}
  const restoreFocusCurrent=()=>!!restore&&!focusMoved&&this.current(generation)&&document.activeElement===focusAtStart;
  try{
   if(!await this.beforeSearch()){if(this.current(generation))this.status.textContent=text('请先完成并保存当前编辑。','Finish and save the current edit first.');return false;}if(!this.current(generation))return false;
   const snapshot=await this.send('PAIA_CONTEXT_CARDS_SNAPSHOT',{});if(!this.current(generation))return false;if(!validSnapshot(snapshot))throw Error('CONTEXT_SEARCH_UNAVAILABLE');this.epoch=snapshot.epoch;
   const needle=query.toLocaleLowerCase();this.matches=snapshot.items.filter(item=>[item.body,item.section].some(value=>value.toLocaleLowerCase().includes(needle))).map(item=>{const at=Math.max(0,item.body.toLocaleLowerCase().indexOf(needle)),start=Math.max(0,at-60);return {...ref(item),snippet:item.body.slice(start,start+240),partial:start>0||item.body.length>start+240};});
   this.offset=restore?Math.min(Math.floor((restore.offset||0)/40)*40,Math.max(0,Math.floor((this.matches.length-1)/40)*40)):0;this.anchor=restore?.anchor||null;restoreControl=this.paintItems(restoreFocusCurrent);
   this.status.textContent=snapshot.automaticEvaluation?text('部分自动内容资格暂不可核对，结果可能不全。','Some automatic content could not be qualified; results may be incomplete.'):text(`三卡找到 ${this.matches.length} 项。`,`Found ${this.matches.length} items across the three cards.`);
   try{await this.loadTopics(generation);if(!this.current(generation))return false;
    this.topics=new ContextTopicSearch({host:this.topicHost,send:(...args)=>this.send(...args),query,choices:()=>this.rows,selectedOnly:()=>false,open:(target,node)=>this.openTopic(target,node,generation)});await this.topics.read();
   }catch{if(this.current(generation))this.topicHost.replaceChildren(element('p','topics-note',text('我的输入暂时无法完整搜索；三卡结果仍可使用。','My Inputs search is unavailable or incomplete; card results remain available.')));}
   if(!this.current(generation))return false;this.save();return true;
  }catch{if(this.current(generation)){this.release();this.status.textContent=text('无法读取当前上下文，请重新搜索。','Current Context could not be read. Search again.');}return false;}
  finally{if(restore){document.removeEventListener('focusin',moved);document.removeEventListener('pointerdown',moved);}if(this.current(generation)){this.busy=false;this.setItemBusy();if(restoreControl&&restoreFocusCurrent()){restoreControl.focus({preventScroll:true});restoreControl.scrollIntoView?.({block:'nearest'});}}}
 }
 async loadTopics(generation){
  let cursor=null,epoch=null,authority=null;const cursors=new Set();
  do{const page=await this.send('PAIA_CONTEXT_TOPICS_PAGE',{options:{cursor,limit:100}});if(!this.current(generation))throw Error('SEARCH_CLOSED');
   if(page?.available!==true||page.version!==1||page.externalAllowed!==false||!Array.isArray(page.items)||page.items.length>100||typeof page.epoch!=='string'||typeof page.authority!=='string'||page.complete!==(page.nextCursor===null)||epoch!==null&&(page.epoch!==epoch||page.authority!==authority)||page.epoch!==this.epoch)throw Error('TOPICS_UNAVAILABLE');
   epoch=page.epoch;authority=page.authority;for(const row of page.items){if(typeof row.topicId!=='string'||typeof row.name!=='string'||typeof row.enabled!=='boolean'||this.rows.has(row.topicId)||this.rows.size>=4096)throw Error('TOPICS_INCOMPLETE');this.rows.set(row.topicId,row);}cursor=page.nextCursor;
   if(cursor!==null){const key=JSON.stringify(cursor);if(!page.items.length||cursors.has(key)||cursors.size>=41)throw Error('TOPICS_INCOMPLETE');cursors.add(key);}
  }while(cursor!==null);
 }
 paintItems(restoreFocusCurrent=()=>false){
  let restoreControl=null;this.itemResults.replaceChildren();for(const item of this.matches.slice(this.offset,this.offset+40)){const row=element('article','context-topic-search-result');row.dataset.contextSearchItem=item.id;const path=[text(...names[item.card]),item.section].filter(Boolean).join(' · '),control=button(path,()=>this.activate(item));control.dataset.contextSearchOpen=item.id;row.append(control,element('p','entry-prose paia-search-preview',item.snippet+(item.partial?'…':'')),element('span','paia-search-preview-mask'));this.itemResults.append(row);if(this.anchor&&same(ref(item),this.anchor)&&restoreFocusCurrent()){restoreControl=control;}}
  this.setItemBusy();return restoreControl;
 }
 setItemBusy(){for(const control of this.itemResults.querySelectorAll('button'))control.disabled=this.busy;this.previous.disabled=this.busy||this.offset===0;this.next.disabled=this.busy||this.offset+40>=this.matches.length;}
 page(direction){if(!this.active||this.busy)return;this.offset=Math.max(0,Math.min(this.offset+40*direction,Math.floor(Math.max(0,this.matches.length-1)/40)*40));this.anchor=null;this.paintItems();this.save();}
 async activate(item){
  if(!this.active||this.busy||!this.matches.some(row=>same(ref(row),ref(item))))return false;const generation=this.generation;this.busy=true;this.setItemBusy();
  try{const snapshot=await this.send('PAIA_CONTEXT_CARDS_SNAPSHOT',{});if(!this.current(generation))return false;if(!validSnapshot(snapshot)||snapshot.epoch!==this.epoch||!snapshot.items.some(row=>same(ref(row),ref(item)))){this.invalidate();return false;}
   this.anchor=ref(item);this.save();return await this.openItem({...this.anchor,epoch:this.epoch},()=>this.current(generation));
  }catch{if(this.current(generation))this.invalidate();return false;}finally{if(this.current(generation)){this.busy=false;this.setItemBusy();}}
 }
 async openTopic(target,node,generation){
  if(!this.current(generation)||this.viewer||!this.rows.has(target.topicId))return false;
  this.viewer=new ContextTopicViewer({host:this.root,send:this.send,...target,topicId:target.topicId,onClose:()=>{this.viewer=null;if(this.current(generation)&&node.isConnected)node.focus({preventScroll:true});}});await this.viewer.read();return this.current(generation);
 }
 close(){if(!this.active)return;this.save();this.active=false;this.generation++;this.release();globalThis.chrome?.runtime?.onMessage?.removeListener(this.changed);document.removeEventListener('visibilitychange',this.visibility);this.form.remove();this.root.remove();}
}
