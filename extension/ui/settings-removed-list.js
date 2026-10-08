import {removedCopy,refreshRemovedCopy} from './settings-removed-copy.js';
import {request,element} from './common.js';
import {showLocalFailure} from './product-state.js';
// View-local read ownership only. Recovery remains with the existing typed commands.
export class SettingsRemovedList {
 constructor({host,panel,group,restore,history,refresh}){
  Object.assign(this,{host,panel,group,restore,history,refresh});this.generation=0;this.kind=null;this.next=null;this.pending=null;this.ids=new Set();
  document.addEventListener('paia:preferences-applied',()=>refreshRemovedCopy(this.host));
  if(globalThis.MutationObserver){this.observer=new MutationObserver(()=>this.invalidate());for(const node of [panel,group])if(node)this.observer.observe(node,{attributes:true,attributeFilter:['hidden']});}
 }
 invalidate(){this.generation++;this.pending=null;this.kind=null;this.next=null;this.more?.remove();this.more=null;}
 active(){if(this.observer?.takeRecords().length)this.invalidate();return !this.panel?.hidden&&!this.group?.hidden&&this.host.isConnected;}
 current(generation,kind){return this.active()&&generation===this.generation&&kind===this.kind;}
 action(label,run){const b=removedCopy(element('button'),label);b.type='button';b.addEventListener('click',()=>void Promise.resolve().then(run).catch(()=>showLocalFailure()));return b;}
 async show(kind,cursor=null){
  if(!this.active())return;
  if(cursor!==null&&(kind!==this.kind||cursor!==this.next))return;
  if(this.pending?.kind===kind&&this.pending.cursor===cursor)return this.pending.promise;
  if(cursor===null){this.generation++;this.kind=kind;this.next=null;}
  const generation=this.generation,read={kind,cursor,promise:null};this.pending=read;if(this.more)this.more.disabled=true;
  read.promise=(async()=>{
   const result=await request(kind==='placement'?'GET_LIBRARY_REMOVED_PLACEMENTS':kind==='topic'?'GET_LIBRARY_REMOVED_TOPICS':'GET_LIBRARY_REMOVED',{options:{cursor}});
   if(!this.current(generation,kind))return;
   if(result.cursorInvalid){this.more?.remove();this.next=null;this.more=this.action('列表已改变，重新加载',()=>{if(this.current(generation,kind))return this.show(kind);});this.host.append(this.more);return;}
   if(cursor===null){this.host.replaceChildren();this.ids.clear();if(kind==='topic')this.host.append(removedCopy(element('p','muted'),'删除主题只移除组织容器，内容仍保留。'));}
   this.more?.remove();this.more=null;
   for(const item of result.items){if(this.ids.has(item.id))continue;this.ids.add(item.id);const body=kind==='placement'?(item.label||'')+' — '+item.topicName+(item.sectionName?' · '+item.sectionName:''):kind==='topic'?item.name:item.body.slice(0,80),row=element('p','',body);if(kind==='entry'&&!body)row.append(removedCopy(element('span'),'空内容'));let operationId=null,busy=false;
    const recover=this.action(kind==='placement'?'恢复主题关系':kind==='topic'?'恢复主题':'恢复内容',async()=>{
     if(busy||!this.current(generation,kind))return;busy=true;recover.disabled=true;operationId??=crypto.randomUUID();
     try{await this.restore(kind==='placement'?'RESTORE_LIBRARY_PLACEMENT':kind==='topic'?'RESTORE_LIBRARY_TOPIC':'RESTORE_LIBRARY_ENTRY',{edit:{id:item.id,expectedRevision:item.revision,operationId,...(kind==='placement'?{historyId:item.historyId,recoveryEpoch:item.recoveryEpoch,expectedEntryRevision:item.entryRevision,expectedTopicRevision:item.topicRevision}:{})}},()=>this.current(generation,kind));}
     catch(error){if(this.current(generation,kind))throw error;return;}
     finally{busy=false;recover.disabled=false;}
     if(!this.current(generation,kind))return;const reloadGeneration=this.generation+1;await this.show(kind);if(this.current(reloadGeneration,kind))await this.refresh();
    });
    row.append(recover);if(kind!=='placement')row.append(this.action(kind==='topic'?'版本历史':'版本',()=>{if(this.current(generation,kind))return this.history(kind==='topic'?'topic':'library_entry',item.id,item.id);}));this.host.append(row);
   }
   if(!this.ids.size&&!result.nextCursor)this.host.append(removedCopy(element('p','muted'),kind==='placement'?'没有可恢复的主题关系。':kind==='topic'?'没有已删除的主题。':'没有已删除的内容。'));
   this.next=result.nextCursor??null;
   if(this.next){const next=this.next;this.more=this.action(kind==='placement'?'更多已移除关系':kind==='topic'?'更多已删除主题':'更多已删除内容',()=>this.show(kind,next));this.host.append(this.more);}
  })();
  try{return await read.promise;}catch(error){if(this.current(generation,kind))throw error;}finally{if(this.pending===read){this.pending=null;if(this.more)this.more.disabled=false;}}
 }
}
