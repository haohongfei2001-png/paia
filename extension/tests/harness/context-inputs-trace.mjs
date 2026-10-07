// Native-test diagnostics only. Observe the actual Inputs owner without changing
// its promises, responses, retry policy or focus decisions. Never record bodies,
// labels, full messages, bindings, operation IDs or arbitrary error text.
export async function installContextInputsTrace(page){
 return page.evaluate(async()=>{
  globalThis.__ctx403UiTrace?.restore();
  const {ContextTopicInputs}=await import(chrome.runtime.getURL('ui/context-topics.js'));
  const capacity=512,ownerLimit=32,entries=[],owners=new Map(),originals=new Map();
  let sequence=0,invocation=0,read=0,dropped=0,untrackedOwners=0;
  const code=(value,pattern)=>typeof value==='string'&&pattern.test(value)?value:null;
  const token=value=>typeof value==='string'&&value.length<=512?value:null;
  const integer=value=>Number.isSafeInteger(value)&&value>=0?value:null;
  const boolean=value=>typeof value==='boolean'?value:null;
  const focus=owner=>{
   const node=document.activeElement;
   if(!node||node===document.body)return {kind:'body'};
   for(const [id,topic]of owner.nodes)if(topic===node)return {kind:'topic',index:owner.order.indexOf(id)};
   if(owner.status.contains(node))return {kind:node.tagName==='BUTTON'?'notice_button':'notice'};
   if(node.closest?.('.context-back'))return {kind:'back'};
   if(node.closest?.('.context-access'))return {kind:'access'};
   return {kind:'other'};
  };
  const state=owner=>{
   const nodes=[...owner.nodes.values()],enabled=nodes.filter(node=>!node.disabled),stops=enabled.filter(node=>node.tabIndex===0);
   return {generation:owner.generation,active:owner.active,busy:owner.busy,loading:owner.loading,failedRead:owner.failedRead,pending:owner.pending,count:nodes.length,enabledCount:enabled.length,rovingCount:stops.length,focus:focus(owner)};
  };
  const record=(event,owner,fields={})=>{
   if(entries.length===capacity){entries.shift();dropped++;}
   entries.push({sequence:++sequence,event,...(owner?{owner:owners.get(owner)?.id,state:state(owner)}:{}),...fields});
  };
  const result=page=>({available:boolean(page?.available),reason:code(page?.reason,/^[a-z_]{1,80}$/),version:integer(page?.version),epoch:token(page?.epoch),authority:token(page?.authority),selectedCount:integer(page?.selectedCount),itemCount:Array.isArray(page?.items)?page.items.length:null,complete:boolean(page?.complete),nextOffset:integer(page?.nextCursor?.offset),hasNext:page?.nextCursor!==null});
  const observe=owner=>{
   if(owners.has(owner))return true;
   if(owners.size===ownerLimit){untrackedOwners++;return false;}
   const original=owner.send,entry={id:owners.size+1,original,wrapped:null};owners.set(owner,entry);
   entry.wrapped=function(type,...fields){
    if(type!=='PAIA_CONTEXT_TOPICS_PAGE')return original.call(this,type,...fields);
    const request=++read,generation=owner.generation;
    record('page_start',owner,{request,generation,offset:integer(fields[0]?.options?.cursor?.offset)||0});
    let pending;
    try{pending=original.call(this,type,...fields);}catch(error){record('page_error',owner,{request,generation,error:code(error?.code,/^[A-Z][A-Z0-9_]{1,63}$/)});throw error;}
    // Return the original promise, including its identity and settlement order.
    pending.then(page=>record('page_result',owner,{request,generation,page:result(page)}),error=>record('page_error',owner,{request,generation,error:code(error?.code,/^[A-Z][A-Z0-9_]{1,63}$/)}));
    return pending;
   };
   owner.send=entry.wrapped;record('owner_observed',owner);return true;
  };
  for(const name of ['refresh','save','restoreFocus']){
   const original=ContextTopicInputs.prototype[name];originals.set(name,original);
   ContextTopicInputs.prototype[name]=function(...args){
    if(!observe(this))return original.apply(this,args);
    const call=++invocation;record(name+'_start',this,{call});
    let pending;
    try{pending=original.apply(this,args);}catch(error){record(name+'_error',this,{call,error:code(error?.code,/^[A-Z][A-Z0-9_]{1,63}$/)});throw error;}
    if(pending?.then){record(name+'_pending',this,{call});pending.then(value=>record(name+'_end',this,{call,result:boolean(value)}),error=>record(name+'_error',this,{call,error:code(error?.code,/^[A-Z][A-Z0-9_]{1,63}$/)}));}
    else record(name+'_end',this,{call});
    return pending;
   };
  }
  const notification=message=>{
   if(!['PAIA_CONTEXT_CARDS_CHANGED','ARCHIVE_CHANGED'].includes(message?.type))return;
   record('notification',null,{type:message.type,cause:code(message.cause,/^[A-Z][A-Z0-9_]{1,63}$/)});
  };
  chrome.runtime.onMessage?.addListener(notification);
  globalThis.__ctx403UiTrace={
   checkpoint(label){record('checkpoint',null,{label:code(label,/^[a-z0-9_]{1,64}$/)});},
   snapshot(){return {version:1,capacity,ownerLimit,dropped,untrackedOwners,entries:structuredClone(entries)};},
   restore(){for(const [name,original]of originals)ContextTopicInputs.prototype[name]=original;for(const [owner,entry]of owners)if(owner.send===entry.wrapped)owner.send=entry.original;chrome.runtime.onMessage?.removeListener(notification);}
  };
  record('installed');
 });
}

export const readContextInputsTrace=page=>page.evaluate(()=>globalThis.__ctx403UiTrace?.snapshot()||null);
