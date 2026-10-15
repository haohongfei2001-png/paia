import {request,element} from './common.js';
const signature=item=>JSON.stringify([item.id,item.revision,item.organizationRevision,item.layoutGeneration]);
// A transient viewport reader, separate from the unlimited body-free directory.
// Only visible cards own snippets; no text is kept in history or a backing map.
export class PersonalTopicPreviews {
 constructor(host,{nodes,open,send=request}){
  Object.assign(this,{host,nodes,open,send});this.items=[];this.generation=0;this.key='';this.active=true;this.nodeIds=new WeakMap();this.nextNodeId=0;
  this.scroll=()=>void this.refresh();this.intersection=globalThis.IntersectionObserver?new IntersectionObserver(this.scroll):null;this.visibility=()=>{if(this.suspended)return;if(document.hidden)this.clear({forget:false});else void this.refresh();};
  this.preferences=()=>{if(this.suspended)return;this.clear({forget:false});void this.refresh();};
  this.maskObserver=globalThis.MutationObserver?new MutationObserver(this.preferences):null;this.maskObserver?.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  this.changed=message=>{if(message?.type==='ARCHIVE_CHANGED'&&message.cause==='EDIT_LIBRARY_TOPIC'){if(this.suspended)return;this.clear({forget:false,reserve:true});void this.refresh();return;}if(['ARCHIVE_CHANGED','PAIA_CONTEXT_CARDS_CHANGED','PREFERENCES_CHANGED'].includes(message?.type))this.preferences();};
  globalThis.addEventListener?.('scroll',this.scroll,true);globalThis.addEventListener?.('resize',this.scroll);document.addEventListener('visibilitychange',this.visibility);document.addEventListener('paia:preferences-applied',this.preferences);globalThis.chrome?.runtime?.onMessage?.addListener(this.changed);
 }
 visible(node){const r=node?.getBoundingClientRect();return !!(node?.isConnected&&r&&r.width>0&&r.height>0&&r.bottom>0&&r.top<globalThis.innerHeight&&r.right>0&&r.left<globalThis.innerWidth);}
 update(items){this.intersection?.disconnect();for(const node of this.nodes().values())this.intersection?.observe(node);this.items=items.map(({id,revision,organizationRevision,layoutGeneration})=>({id,revision,organizationRevision,layoutGeneration}));void this.refresh();}
 release(node,{reserve=false}={}){const container=node?.querySelector('.personal-topic-preview');if(!container)return;if(container.contains(document.activeElement))node.querySelector('.personal-topic-link')?.focus({preventScroll:true});const height=reserve?container.getBoundingClientRect().height:0;container.replaceChildren();container.style.minHeight=height?`${height}px`:'';container.hidden=!height;delete container.dataset.previewSignature;}
 counts(){let count=0,chars=0;for(const node of this.nodes().values()){const p=node.querySelector('.personal-topic-preview');if(p?.childElementCount){count++;chars+=p.textContent.length;}}this.host.dataset.retainedPreviewBodies=String(count);this.host.dataset.retainedPreviewChars=String(chars);}
 clear({forget=true,reserve=false}={}){this.generation++;this.key='';if(forget){this.items=[];this.intersection?.disconnect();}this.host.dataset.previewState='off';for(const node of this.nodes().values())this.release(node,{reserve});this.counts();}
 suspend(){if(this.suspended)return;this.suspended=true;this.clear({forget:false});}
 resume(){if(!this.suspended)return;this.suspended=false;void this.refresh();}
 async refresh(){
  if(!this.active||this.suspended)return;
  const nodes=this.nodes(),visible=[];
  if(!document.hidden&&!document.documentElement.classList?.contains('paia-hide-content-previews')&&this.host.isConnected)for(const item of this.items){const node=nodes.get(item.id);if(this.visible(node)){visible.push(item);if(visible.length===12)break;}}
  const ids=new Set(visible.map(x=>x.id));for(const [id,node]of nodes)if(!ids.has(id))this.release(node,{reserve:true});this.counts();
  const key=visible.map(item=>{const node=nodes.get(item.id);if(!this.nodeIds.has(node))this.nodeIds.set(node,++this.nextNodeId);return signature(item)+':'+this.nodeIds.get(node);}).join('|');if(key===this.key)return;this.key=key;const generation=++this.generation,requestNodes=new Map(visible.map(item=>[item.id,nodes.get(item.id)]));
  // Revisions or visible identity changes retire every previous result before IO.
  for(const item of visible){const node=nodes.get(item.id),p=node?.querySelector('.personal-topic-preview');if(p?.dataset.previewSignature!==signature(item))this.release(node,{reserve:true});}this.counts();this.host.dataset.previewState=visible.length?'loading':'off';if(!visible.length)return;
  try{
   const page=await this.send('GET_LIBRARY_ROOT_PREVIEWS',{options:{topics:visible}});
   if(!this.active||generation!==this.generation||document.hidden||!this.host.isConnected)return;
   const discard=()=>{for(const item of visible)this.release(nodes.get(item.id));this.counts();};
   if(page?.kind!=='root_previews'||page.masked||page.cursorInvalid||page.unavailable||!Array.isArray(page.items)||page.items.length>12){discard();return;}
   const returned=new Set(page.items.filter(row=>row.preview).map(row=>row.topicId));for(const item of visible)if(!returned.has(item.id))this.release(nodes.get(item.id));
   for(const row of page.items){
    if(!ids.has(row.topicId))continue;const node=nodes.get(row.topicId),p=node?.querySelector('.personal-topic-preview'),v=row.preview;
    if(!p||requestNodes.get(row.topicId)!==node)continue;
    if(!this.visible(node)){this.key="";this.release(node,{reserve:true});continue;}
    if(!v||typeof v.text!=='string'||!v.text.trim()||v.text.length>140||typeof v.sectionId!=='string'||typeof v.entryId!=='string'){this.release(node);continue;}
    const ref=visible.find(item=>item.id===row.topicId),sig=signature(ref);if(p.dataset.previewSignature===sig&&p.textContent===v.text)continue;const b=element('button','',v.text);b.type='button';b.dataset.rootPreview='true';b.dataset.topicId=row.topicId;b.dataset.sectionId=v.sectionId;
    b.addEventListener('click',event=>{if(!this.active||!b.isConnected||p.firstElementChild!==b||document.hidden||!this.items.some(item=>signature(item)===sig))return;const selection=globalThis.getSelection?.();if(event.detail>0&&selection&&!selection.isCollapsed)return;void this.open(row.topicId,v.sectionId);});
    p.replaceChildren(b);p.style.minHeight='';p.dataset.previewSignature=sig;p.hidden=false;
   }this.counts();
  }catch{if(this.active&&generation===this.generation){for(const item of visible)this.release(nodes.get(item.id));this.counts();}}finally{if(this.active&&generation===this.generation)this.host.dataset.previewState='settled';}
 }
 dispose(){if(!this.active)return;this.clear();this.active=false;globalThis.removeEventListener?.('scroll',this.scroll,true);globalThis.removeEventListener?.('resize',this.scroll);document.removeEventListener('visibilitychange',this.visibility);document.removeEventListener('paia:preferences-applied',this.preferences);this.maskObserver?.disconnect();this.intersection?.disconnect();globalThis.chrome?.runtime?.onMessage?.removeListener(this.changed);}
}
