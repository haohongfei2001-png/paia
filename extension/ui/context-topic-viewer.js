import {element} from './common.js';
import {ContinuousTopicReader} from './continuous-topic-reader.js';
import {renderTopicSectionProse} from './topic-section-prose.js';

const copy=(zh,en)=>document.documentElement.lang==='en'?en:zh;
const button=(text,run)=>{const node=element('button','standard-button',text);node.type='button';node.onclick=run;return node;};
// Explicit local viewing only. No selection mutation, external Context reader,
// lexical query, read-history write or persistent body/cache is introduced.
export class ContextTopicViewer {
 constructor({host,send,topicId,name,sectionId=null,anchorId=null,onClose=()=>{}}){
  this.send=send;this.topicId=topicId;this.start={topicId,sectionId,anchorId};this.active=true;this.busy=false;this.generation=0;this.onClose=onClose;
  this.root=element('dialog','topic-action-dialog context-topic-viewer');this.root.setAttribute('aria-label',copy('查看主题','View Topic'));
  this.title=element('h2','',name);this.back=button(copy('返回','Back'),()=>this.close());
  this.status=element('p','context-topic-viewer-status');this.status.setAttribute('role','status');
  this.body=element('div','context-topic-viewer-body');this.previous=button(copy('前面的内容','Earlier content'),()=>void this.read('previous'));
  this.next=button(copy('接着读','Continue reading'),()=>void this.read('next'));this.retry=button(copy('重新读取','Reload content'),()=>void this.restart());
  const header=element('header'),actions=element('div','context-topic-viewer-actions');header.append(this.title,this.back);actions.append(this.previous,this.next,this.retry);
  this.root.append(header,element('p','quiet-footnote',copy('仅本人本地查看，不改变 AI 访问选择。','Local viewing only. AI access choices are unchanged.')),this.body,this.status,actions);host.append(this.root);
  this.root.addEventListener('cancel',event=>{event.preventDefault();this.close();});
  this.changed=message=>{if(['ARCHIVE_CHANGED','PAIA_CONTEXT_CARDS_CHANGED'].includes(message?.type))this.invalidate();};
  this.visibility=()=>{if(document.hidden)this.invalidate();};
  globalThis.chrome?.runtime?.onMessage?.addListener(this.changed);document.addEventListener('visibilitychange',this.visibility);
  this.reader=new ContinuousTopicReader({chunk:40,windowChunks:1,maxReferences:400,loadEntry:id=>this.fullEntry(id),load:options=>this.load(options)});this.reader.reset(this.start);
  this.root.showModal();this.back.focus();
 }
 async load(options){
  if(!this.active||this.invalidated)throw Error('TOPIC_VIEW_CLOSED');
  const generation=this.generation,page=await this.send('GET_LIBRARY_SECTION_READING',{options:{...options,topicId:this.topicId,query:'',view:'original',sort:'asc',limit:options.limit??40}});
  if(!this.active||this.invalidated||generation!==this.generation)throw Error('TOPIC_VIEW_STALE');
  if(page?.cursorInvalid||page?.unavailable||page?.unsupported)return page;
  if(new TextEncoder().encode(JSON.stringify(page)).length>256*1024||page?.version!==1||page.kind!=='section_reading'||page.topic?.id!==this.topicId||!Array.isArray(page.items)||page.items.length>40||!Array.isArray(page.sections)||page.sections.length>100||typeof page.recoveryEpoch!=='string'||!page.recoveryEpoch||typeof page.coverage?.activeGeneration!=='string'||typeof page.authority!=='string'||typeof page.complete!=='boolean'||page.complete!==((options.direction==='prev'?page.previousCursor:page.nextCursor)===null)||page.items.some(item=>!item.entry||typeof item.entry.id!=='string'||!Number.isSafeInteger(item.entry.revision)||!item.entry.large&&typeof item.entry.body!=='string'))throw Error('TOPIC_VIEW_INVALID');
  if(this.authority&&this.authority!==page.authority){this.invalidate();throw Error('TOPIC_VIEW_STALE');}this.authority=page.authority;
  return page;
 }
 async restart(){if(!this.active||this.busy)return false;this.invalidated=false;this.authority=null;this.reader.reset(this.start);this.body.replaceChildren();return this.read('initial');}
 async read(direction='initial'){
  if(!this.active||this.busy||this.invalidated)return false;
  const generation=this.generation;this.busy=true;this.paintControls();
  try{
   if(direction!=='initial'&&this.reader.shiftWindow(direction))await this.reader.hydrateWindow();else await this.reader[direction]();
   if(!this.active||generation!==this.generation)return false;
   const state=this.reader.state();if(state.stale){this.invalidate();return false;}
   if(state.errorNext||state.errorPrevious){this.invalidate(copy('暂时无法读取，请重新读取。','Content could not be read. Reload to retry.'));return false;}
   this.paintPage();return true;
  }catch{if(this.active&&generation===this.generation)this.invalidate(copy('暂时无法读取，请重新读取。','Content could not be read. Reload to retry.'));return false;}
  finally{if(this.active&&generation===this.generation){this.busy=false;this.paintControls();}}
 }
 async fullEntry(id){
  if(!this.active||this.invalidated)throw Error('TOPIC_VIEW_CLOSED');
  const generation=this.generation,row=await this.send('GET_LIBRARY_ENTRY',{id});
  if(!this.active||this.invalidated||generation!==this.generation)throw Error('TOPIC_VIEW_STALE');
  if(typeof row?.body!=='string'||new TextEncoder().encode(row.body).length>4*1024*1024)throw Error('TOPIC_VIEW_BODY_LIMIT');
  return row;
 }
 async expand(item){
  if(!this.active||this.busy||this.invalidated)return false;
  const generation=this.generation;this.busy=true;this.paintControls();
  try{const result=await this.reader.expandEntry(item,{isCurrent:()=>this.active&&!this.invalidated&&generation===this.generation});if(!this.active||generation!==this.generation)return false;if(!result||this.reader.stale){this.invalidate();return false;}this.paintPage();return true;}
  catch{if(this.active&&generation===this.generation)this.invalidate(copy('暂时无法读取全文，请重新读取。','Full text could not be read. Reload to retry.'));return false;}
  finally{if(this.active&&generation===this.generation){this.busy=false;this.paintControls();}}
 }
 paintPage(){
  const state=this.reader.state(),items=this.reader.layout().filter(part=>part.kind==='item').map(part=>part.item),meta=this.reader.pageMeta;
   if(!meta)throw Error('TOPIC_VIEW_EMPTY');
   this.title.textContent=meta.topic.name;
   renderTopicSectionProse({body:this.body,page:{...meta,sections:[...this.reader.sections.values()],items},entryNode:item=>{
    const node=element('article','context-topic-viewer-entry');node.dataset.entryId=item.entry.id;
    node.append(element('p','entry-prose',item.entry.large?copy('这条内容过长，当前核对窗口未读取全文。','This item is too large for this viewing window. Its full text has not been loaded.'):item.entry.body));if(item.entry.large)node.append(button(copy('读取这条全文','Read full item'),()=>void this.expand(item)));return node;
   },updateEntry:(node,item)=>{if(!item.entry.large)node.querySelector('button')?.remove();node.querySelector('.entry-prose').textContent=item.entry.large?copy('这条内容过长，当前核对窗口未读取全文。','This item is too large for this viewing window. Its full text has not been loaded.'):item.entry.body;}});
   this.status.textContent=items.some(item=>item.entry.large)?copy('含未完整读取的条目。','Some items have not been fully loaded.'):state.terminalNext&&state.windowStart+this.reader.windowSize>=state.items.length?copy('已到主题末尾。','End of Topic.'):copy('后面还有内容。','More content follows.');
 }
 paintControls(){const state=this.reader.state();this.previous.disabled=this.busy||this.invalidated||state.windowStart===0&&state.terminalPrevious;this.next.disabled=this.busy||this.invalidated||state.terminalNext&&state.windowStart+this.reader.windowSize>=state.items.length;this.retry.hidden=!this.invalidated;this.retry.disabled=this.busy;this.root.setAttribute('aria-busy',String(this.busy));}
 invalidate(text=copy('内容已变化，请重新读取。','Content changed. Reload to continue.')){if(!this.active)return;this.generation++;this.invalidated=true;this.busy=false;this.reader.reset(this.start);this.body.replaceChildren();this.status.textContent=text;this.paintControls();}
 close(){if(!this.active)return;this.active=false;this.generation++;this.reader.reset({});this.body.replaceChildren();globalThis.chrome?.runtime?.onMessage?.removeListener(this.changed);document.removeEventListener?.('visibilitychange',this.visibility);this.root.close();this.root.remove();this.onClose();}
}
