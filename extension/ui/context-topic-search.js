import {element} from './common.js';
import {ContinuousRootReader} from './continuous-root-reader.js';
const copy=(zh,en)=>document.documentElement.lang==='en'?en:zh;
const button=(text,run)=>{const node=element('button','standard-button',text);node.type='button';node.onclick=run;return node;};
// Explicit human search over the original qualified Thought query owner. Only
// the current bounded window retains snippets; no Context corpus or grant.
export class ContextTopicSearch {
 constructor({host,send,query,choices,selectedOnly,open}){
  this.send=send;this.query=query;this.choices=choices;this.selectedOnly=selectedOnly;this.open=open;this.active=true;this.generation=0;this.busy=false;
  this.root=element('section','context-topic-search-results');this.body=element('div');this.status=element('p','topics-note');this.status.setAttribute('role','status');
  this.previous=button(copy('前面的结果','Earlier results'),()=>void this.read('previous'));this.next=button(copy('接着查找','Continue searching'),()=>void this.read('next'));this.retry=button(copy('重新搜索','Search again'),()=>void this.restart());
  const actions=element('div','context-topic-viewer-actions');actions.append(this.previous,this.next,this.retry);this.root.append(element('p','topics-note',copy('搜索主题名称、章节和原文；不包含 AI 概括。','Search covers Topic names, sections and original text, not AI summaries.')),this.body,this.status,actions);host.append(this.root);
  this.reader=new ContinuousRootReader({scope:'context-inputs-human-search',query,windowSize:40,chunk:40,load:options=>this.load(options)});
  this.changed=message=>{if(['ARCHIVE_CHANGED','PAIA_CONTEXT_CARDS_CHANGED'].includes(message?.type))this.invalidate();};this.visibility=()=>{if(document.hidden)this.invalidate();};
  globalThis.chrome?.runtime?.onMessage?.addListener(this.changed);document.addEventListener('visibilitychange',this.visibility);this.paint();
 }
 async load({query,cursor,authority}){
  if(!this.active||this.invalidated)throw Error('SEARCH_CLOSED');const generation=this.generation;
  const page=await this.send('GET_LIBRARY_ROOT_SEARCH',{options:{query,cursor,authority,limit:40}});
  if(!this.active||this.invalidated||generation!==this.generation)throw Error('SEARCH_STALE');
  if(page?.cursorInvalid)return page;
  if(page?.unavailable||page?.version!==1||page.kind!=='search'||typeof page.authority!=='string'||!Array.isArray(page.items)||page.items.length>40||typeof page.complete!=='boolean'||new TextEncoder().encode(JSON.stringify(page)).length>256*1024)throw Error('SEARCH_UNAVAILABLE');
  return page;
 }
 allowed(id){const row=this.choices().get(id);return !!row&&(!this.selectedOnly()||row.enabled);}
 targets(item){
  if(item.kind==='topic')return this.allowed(item.topicId)?[{topicId:item.topicId,name:item.topicName}]:[];
  if(item.kind==='section')return this.allowed(item.topicId)?[{topicId:item.topicId,name:item.topicName,sectionId:item.sectionId,label:item.sectionTitle}]:[];
  if(item.kind==='entry')return (item.paths||[]).filter(path=>this.allowed(path.topicId)).map(path=>({topicId:path.topicId,name:path.topicName,sectionId:path.sectionId,anchorId:item.entryId,label:path.sectionTitle}));
  return [];
 }
 async activate(item,target,node){
  if(!this.active||this.busy||this.invalidated||!this.allowed(target.topicId))return false;
  const generation=this.generation,descriptor=this.reader.items.find(row=>row.ref.kind===item.readRef.kind&&row.ref.id===item.readRef.id&&row.ref.sectionId===item.readRef.sectionId),request=this.reader.requests[descriptor?.requestIndex];if(!request)return false;
  this.busy=true;node.disabled=true;
  try{const page=await this.load({query:this.query,cursor:request.cursor,authority:this.reader.authority});if(!this.active||generation!==this.generation)return false;
   const fresh=page.items?.find(row=>JSON.stringify(row.readRef)===JSON.stringify(item.readRef));
   if(page.authority!==this.reader.authority||!fresh||!this.targets(fresh).some(value=>JSON.stringify(value)===JSON.stringify(target))){this.invalidate();return false;}
   this.busy=false;return await this.open(target,node);
  }catch{if(this.active&&generation===this.generation)this.invalidate();return false;}finally{if(this.active&&generation===this.generation){this.busy=false;node.disabled=false;}}
 }
 async read(direction='next'){
  if(!this.active||this.busy||this.invalidated)return false;this.busy=true;const generation=this.generation;this.paint();
  try{if(this.reader.shiftWindow(direction))await this.reader.hydrateWindow();else if(direction!=='previous')await this.reader.loadNext();if(!this.active||generation!==this.generation)return false;if(this.reader.stale||this.reader.error){this.invalidate();return false;}this.paint();return true;}
  catch{if(this.active&&generation===this.generation)this.invalidate();return false;}
  finally{if(this.active&&generation===this.generation){this.busy=false;this.paint();}}
 }
 async restart(){if(!this.active||this.busy)return false;this.invalidated=false;this.reader.reset();this.body.replaceChildren();return this.read();}
 paint(){
  this.body.replaceChildren();const state=this.reader.state();let count=0;
  if(!this.invalidated)for(const part of this.reader.layout())if(part.kind==='item'){
   const item=part.item,targets=this.targets(item);if(!targets.length)continue;const row=element('article','context-topic-search-result');
   if(item.kind==='entry')row.append(element('p','entry-prose',item.snippet));
   for(const target of targets){const node=button([target.name,target.label].filter(Boolean).join(' · '),()=>this.activate(item,target,node));node.disabled=this.busy;row.append(node);}
   this.body.append(row);count++;
  }
  this.status.textContent=this.invalidated?copy('搜索内容已失效，请重新搜索。','Search content is unavailable or changed. Search again.'):this.busy?copy('正在查找…','Searching…'):state.pageMeta?.indexing||state.coverage?.complete===false&&!state.cursor?copy('索引尚未完整，结果可能不全。请重新搜索。','The index is incomplete. Results may be missing; search again.'):state.terminal&&state.windowStart+this.reader.windowSize>=state.items.length?copy(count?'已到搜索末尾。':'当前这部分没有匹配结果，已到搜索末尾。',count?'End of search.':'No matching results in this portion. End of search.'):copy('尚未查到末尾，可继续查找。','Search is not complete. Continue searching.');
  this.previous.disabled=this.busy||this.invalidated||state.windowStart===0;this.next.disabled=this.busy||this.invalidated||state.terminal&&state.windowStart+this.reader.windowSize>=state.items.length;this.retry.disabled=this.busy;this.root.setAttribute('aria-busy',String(this.busy));
 }
 invalidate(){if(!this.active)return;this.generation++;this.invalidated=true;this.busy=false;this.reader.invalidate();this.paint();}
 close(){if(!this.active)return;this.active=false;this.generation++;this.reader.reset();this.body.replaceChildren();this.root.remove();globalThis.chrome?.runtime?.onMessage?.removeListener(this.changed);document.removeEventListener?.('visibilitychange',this.visibility);}
}
