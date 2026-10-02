import {continuousItemKey} from './continuous-collection.js';
const clone=value=>value===undefined?undefined:structuredClone(value);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const metadata=page=>Object.fromEntries(['authority','coverage','complete','indexing','operations','inputCount','entryCountHint','providerKey'].filter(k=>page[k]!==undefined).map(k=>[k,clone(page[k])]));
const reference=item=>clone(item.readRef||{kind:item.kind||'topic',id:item.entryId||item.topicId||item.id,revision:item.revision??null});

// Visited extent and replay descriptors are body-free. Only the current window
// plus explicit protected rows retain compact DTOs. Unplaced uses its original
// independent ContinuousCollection and is not silently truncated by this owner.
export class ContinuousRootReader {
 constructor({scope,query='',load,windowSize=120,chunk=40,pins=()=>new Set(),maxPins=32}){
  this.load=load;this.windowSize=windowSize;this.chunk=chunk;this.pins=pins;this.maxPins=maxPins;this.reset({scope,query});
 }
 reset({scope=this.scope,query=this.query}={}){
  this.hydration?.pending?.clear();this.hydration=null;this.scope=scope;this.query=query;this.generation=(this.generation||0)+1;this.windowRevision=(this.windowRevision||0)+1;
  this.items=[];this.keys=new Set();this.bodies=new Map();this.requests=[];this.cursor=null;this.terminal=false;this.loading=false;this.error=null;this.errorKind=null;this.coverage=null;this.complete=false;this.pageMeta=null;this.authority=null;this.windowStart=0;this.measurements=new Map();this.averageHeight=140;this.stale=false;this.protectionBlocked=false;
  return this.state();
 }
 state(){return {scope:this.scope,query:this.query,items:this.items,cursor:this.cursor,terminal:this.terminal,loading:this.loading,error:this.error,coverage:this.coverage,complete:this.complete,pageMeta:this.pageMeta,stale:this.stale,windowStart:this.windowStart,retainedBodies:this.bodies.size,protectionBlocked:this.protectionBlocked};}
 snapshot(){return {scope:this.scope,query:this.query,items:clone(this.items),requests:clone(this.requests),cursor:clone(this.cursor),terminal:this.terminal,coverage:clone(this.coverage),complete:this.complete,pageMeta:clone(this.pageMeta),authority:this.authority,windowStart:this.windowStart,measurements:[...this.measurements],averageHeight:this.averageHeight};}
 restore(saved,{scope=this.scope,query=this.query}={}){
  this.reset({scope,query});if(!saved||saved.scope!==scope||saved.query!==query)return this.state();
  this.items=(saved.items||[]).map(item=>({key:item.key,ref:clone(item.ref),requestIndex:item.requestIndex}));this.keys=new Set(this.items.map(x=>x.key));
  this.requests=(saved.requests||[]).map(row=>({cursor:clone(row.cursor),refs:clone(row.refs)}));this.cursor=clone(saved.cursor);this.terminal=!!saved.terminal;this.complete=!!saved.complete;this.coverage=clone(saved.coverage);this.pageMeta=metadata(saved.pageMeta||{});this.authority=saved.authority||null;this.windowStart=clamp(saved.windowStart||0,0,Math.max(0,this.items.length-this.windowSize));this.measurements=new Map(saved.measurements||[]);this.averageHeight=saved.averageHeight||140;return this.state();
 }
 retainedKeys(){
  const protectedKeys=this.pins(),keys=new Set(this.items.slice(this.windowStart,this.windowStart+this.windowSize).map(x=>x.key));
  this.protectionBlocked=protectedKeys.size>this.maxPins;
  for(const key of protectedKeys)if(this.keys.has(key))keys.add(key);
  return keys;
 }
 trim(){const keys=this.retainedKeys();for(const key of this.bodies.keys())if(!keys.has(key))this.bodies.delete(key);}
 releaseBodies(){this.hydration?.pending?.clear();this.generation++;this.windowRevision++;this.bodies.clear();this.loading=false;this.hydration=null;}
 invalidate(){this.releaseBodies();this.stale=true;this.error=Error('ROOT_AUTHORITY_CHANGED');this.errorKind='stale';}
 async loadNext(){
  if(this.loading||this.terminal||this.stale)return this.state();
  if(this.pins().size>this.maxPins){this.protectionBlocked=true;return this.state();}
  if(this.hydration){this.hydration.pending.clear();this.hydration=null;this.windowRevision++;}
  const ticket=this.generation;this.loading=true;this.error=null;this.errorKind=null;
  try{
   for(let n=0;n<20;n++){
    const cursor=clone(this.cursor),page=await this.load({scope:this.scope,query:this.query,cursor,authority:this.authority});
    if(ticket!==this.generation)return {stale:true};
    if(page?.cursorInvalid||this.authority&&page.authority!==this.authority){this.invalidate();return this.state();}
    if(!page||!Array.isArray(page.items)||!page.authority)throw Error('INVALID_ROOT_PAGE');
    this.authority=page.authority;
    const requestIndex=this.requests.length,refs=page.items.map(reference);this.requests.push({cursor,refs});let added=0;
    for(const item of page.items){const key=continuousItemKey(item);if(this.keys.has(key))continue;this.keys.add(key);this.items.push({key,ref:reference(item),requestIndex});this.bodies.set(key,item);added++;}
    this.cursor=clone(page.nextCursor)||null;this.pageMeta=metadata(page);this.coverage=clone(page.coverage)||this.coverage;
    this.complete=page.complete===true&&!this.cursor;this.terminal=this.complete;
    if(added){this.hydration?.pending?.clear();this.hydration=null;this.windowStart=Math.max(0,this.items.length-this.windowSize);this.windowRevision++;this.trim();break;}
    if(this.terminal||!this.cursor)break;
   }
  }catch(error){if(ticket===this.generation){this.error=error;this.errorKind='load';}}
  finally{if(ticket===this.generation)this.loading=false;}
  return this.state();
 }
 async loadUntil({minItems=1,maxLoads=30}={}){
  for(let n=0;n<maxLoads&&this.items.length<minItems&&!this.terminal&&!this.error&&!this.stale;n++){
   const before=this.items.length,cursor=JSON.stringify(this.cursor);await this.loadNext();if(before===this.items.length&&cursor===JSON.stringify(this.cursor))break;
  }
  return this.state();
 }
 async hydrateWindow(){
  if(this.stale)return false;const revision=this.windowRevision,ticket=this.generation;
  if(this.hydration?.ticket===ticket&&this.hydration.revision===revision)return this.hydration.promise;
  this.hydration?.pending?.clear();this.hydration=null;this.trim();const keys=this.retainedKeys();if(this.protectionBlocked)return false;
  this.error=null;this.errorKind=null;const indices=new Set(this.items.filter(item=>keys.has(item.key)&&!this.bodies.has(item.key)).map(x=>x.requestIndex));
  const pending=new Map();const task=(async()=>{
   try{
    for(const index of indices){
     const descriptor=this.requests[index];if(!descriptor)throw Error('ROOT_REFERENCE_UNAVAILABLE');
     const page=await this.load({scope:this.scope,query:this.query,cursor:clone(descriptor.cursor),authority:this.authority});
     if(ticket!==this.generation||revision!==this.windowRevision)return false;
     if(page?.cursorInvalid||page?.authority!==this.authority||!equal(page.items?.map(reference),descriptor.refs)){this.invalidate();return false;}
     for(const item of page.items)if(keys.has(continuousItemKey(item))&&!this.bodies.has(continuousItemKey(item)))pending.set(continuousItemKey(item),item);
    }
    if(ticket!==this.generation||revision!==this.windowRevision)return false;
    for(const [key,item]of pending)this.bodies.set(key,item);this.trim();return true;
   }catch(error){if(ticket===this.generation&&revision===this.windowRevision){this.error=error;this.errorKind='hydrate';}return false;}
  })();this.hydration={ticket,revision,promise:task,pending};try{return await task;}finally{if(this.hydration?.promise===task)this.hydration=null;}
 }
 shiftWindow(direction){const next=clamp(this.windowStart+(direction==='previous'?-this.chunk:this.chunk),0,Math.max(0,this.items.length-this.windowSize));if(next===this.windowStart)return false;this.hydration?.pending?.clear();this.windowStart=next;this.windowRevision++;return true;}
 around(key){const index=this.items.findIndex(x=>x.key===key);if(index<0)return false;this.hydration?.pending?.clear();this.windowStart=clamp(index-this.chunk,0,Math.max(0,this.items.length-this.windowSize));this.windowRevision++;return true;}
 layout(){
  const keys=this.retainedKeys(),out=[];let gap=null;
  for(let index=0;index<this.items.length;index++){
   const descriptor=this.items[index],body=this.bodies.get(descriptor.key);
   if(keys.has(descriptor.key)&&body){if(gap){out.push(gap);gap=null;}out.push({kind:'item',key:descriptor.key,item:body});}
   else{if(!gap)gap={kind:'spacer',from:index,to:index,height:0};gap.to=index;gap.height+=this.measurements.get(descriptor.key)||this.averageHeight;}
  }
  if(gap)out.push(gap);return out;
 }
 measure(root){const values=[];for(const node of root?.querySelectorAll?.('[data-root-key]')||[]){const height=node.getBoundingClientRect().height;if(height>8){this.measurements.set(node.dataset.rootKey,height);values.push(height);}}if(values.length)this.averageHeight=clamp(values.reduce((n,x)=>n+x,0)/values.length,50,800);}
}
