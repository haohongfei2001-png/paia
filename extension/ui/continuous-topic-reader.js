const itemKey=item=>item?.entry?.id||item?.id||null;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export class ContinuousTopicReader{
 constructor({load,chunk=40,windowChunks=3,maxEmptyLoads=20,estimatedHeight=180}={}){
  if(typeof load!=='function'||!Number.isInteger(chunk)||chunk<1||chunk>40||!Number.isInteger(windowChunks)||windowChunks<1||windowChunks>5)throw new TypeError('INVALID_TOPIC_READER');
  this.load=load;this.chunk=chunk;this.windowSize=chunk*windowChunks;this.maxEmptyLoads=maxEmptyLoads;this.defaultHeight=estimatedHeight;this.measurements=new Map();this.averageHeight=estimatedHeight;this.serial=0;this.reset({});
 }
 reset({topicId=null,sort='asc',query='',anchorId=null,sectionId=null}={}){
  this.serial++;this.topicId=topicId;this.sort=sort;this.query=query;this.anchorId=anchorId;this.sectionId=sectionId;
  this.items=[];this.index=new Map();this.nextCursor=null;this.previousCursor=null;this.coverage=null;this.pageMeta=null;this.sections=new Map();this.sectionCursor=null;
  this.windowStart=0;this.initialized=false;this.indexing=false;this.loadingNext=false;this.loadingPrevious=false;this.errorNext=null;this.errorPrevious=null;this.terminalNext=false;this.terminalPrevious=anchorId===null&&sectionId===null;this.stale=false;return this.state();
 }
 matches({topicId,sort,query}){return this.topicId===topicId&&this.sort===sort&&this.query===query;}
 state(){return {
  topicId:this.topicId,sort:this.sort,query:this.query,items:[...this.items],
  nextCursor:this.nextCursor,previousCursor:this.previousCursor,
  terminalNext:this.terminalNext,terminalPrevious:this.terminalPrevious,
  loadingNext:this.loadingNext,loadingPrevious:this.loadingPrevious,
  errorNext:this.errorNext,errorPrevious:this.errorPrevious,indexing:this.indexing,
  coverage:this.coverage,pageMeta:this.pageMeta,sectionCursor:this.sectionCursor,
  initialized:this.initialized,stale:this.stale,windowStart:this.windowStart
 };}
 snapshot(anchor=null){return {topicId:this.topicId,sort:this.sort,query:this.query,anchor:anchor?{id:anchor.id,top:anchor.top}:null};}
 addSections(rows=[]){for(const row of rows)if(row?.sectionId)this.sections.set(row.sectionId,row);}
 merge(items,direction){
  const fresh=[];
  for(const item of items||[]){const key=itemKey(item);if(!key||this.index.has(key))continue;fresh.push(item);}
  if(!fresh.length)return 0;
  if(direction==='previous')this.items=[...fresh,...this.items];else this.items.push(...fresh);
  this.index=new Map(this.items.map((item,i)=>[itemKey(item),i]));
  return fresh.length;
 }
 async initial(){
  if(this.initialized||this.loadingNext)return this.state();
  return this._load('initial');
 }
 async next(){
  if(this.loadingNext||this.terminalNext)return this.state();
  return this._load('next');
 }
 async previous(){
  if(this.loadingPrevious||this.terminalPrevious)return this.state();
  return this._load('previous');
 }
 async _load(kind){
  const direction=kind==='previous'?'prev':'next',serial=this.serial,flag=kind==='previous'?'loadingPrevious':'loadingNext',errorKey=kind==='previous'?'errorPrevious':'errorNext';
  this[flag]=true;this[errorKey]=null;let empty=0,addedTotal=0;
  try{
   do{
    const cursor=kind==='initial'?null:kind==='previous'?this.previousCursor:this.nextCursor;
    const page=await this.load({topicId:this.topicId,sort:this.sort,query:this.query,cursor,direction,anchorId:kind==='initial'?this.anchorId:null,sectionId:kind==='initial'?this.sectionId:null,sectionCursor:this.sectionCursor});
    if(serial!==this.serial)return {...this.state(),stale:true};
    if(page?.cursorInvalid){this.stale=true;return this.state();}
    this.initialized=true;this.indexing=page?.indexing===true;this.coverage=page?.coverage||this.coverage;this.pageMeta=page||this.pageMeta;this.addSections(page?.sections);
    if(page?.sectionCursor!==undefined)this.sectionCursor=page.sectionCursor;
    const added=this.merge(page?.items||[],kind==='previous'?'previous':'next');addedTotal+=added;
    if(kind==='initial'){this.nextCursor=page?.nextCursor??null;this.previousCursor=page?.previousCursor??null;}
    else if(kind==='previous')this.previousCursor=page?.previousCursor??null;
    else this.nextCursor=page?.nextCursor??null;
    if(kind==='initial'){
      this.terminalPrevious=!this.previousCursor;this.terminalNext=!this.nextCursor&&!this.indexing;
      const target=this.anchorId&&this.index.get(this.anchorId);if(Number.isInteger(target))this.windowStart=clamp(Math.floor(target/this.chunk)*this.chunk-this.chunk,0,Math.max(0,this.items.length-this.windowSize));
    }else if(kind==='previous'){
      this.terminalPrevious=!page?.previousCursor&&!this.indexing;
      if(added)this.windowStart=0;
    }else{
      this.terminalNext=!page?.nextCursor&&!this.indexing;
      if(added&&this.items.length>this.windowSize)this.windowStart=Math.max(0,this.items.length-this.windowSize);
    }
    if(added||this.indexing||kind==='previous'&&!this.previousCursor||kind!=='previous'&&!this.nextCursor)break;
    empty++;if(empty>=this.maxEmptyLoads)break;
   }while(true);
   return {...this.state(),added:addedTotal};
  }catch(error){if(serial===this.serial)this[errorKey]=error||new Error('TOPIC_READ_FAILED');return this.state();}
  finally{if(serial===this.serial)this[flag]=false;}
 }
 protectedWindow(pins=new Set()){
  const count=this.items.length,start=clamp(this.windowStart,0,Math.max(0,count-this.windowSize)),end=Math.min(count,start+this.windowSize),selected=new Set();
  for(let i=start;i<end;i++)selected.add(i);
  for(const id of pins){const i=this.index.get(id);if(Number.isInteger(i))selected.add(i);}
  return [...selected].sort((a,b)=>a-b);
 }
 layout(pins=new Set()){
  const indices=this.protectedWindow(pins),out=[];let last=-1;
  for(const index of indices){
   if(index>last+1)out.push({kind:'spacer',from:last+1,to:index-1,count:index-last-1,height:this.estimateRange(last+1,index-1)});
   out.push({kind:'item',index,item:this.items[index]});last=index;
  }
  if(last<this.items.length-1)out.push({kind:'spacer',from:last+1,to:this.items.length-1,count:this.items.length-last-1,height:this.estimateRange(last+1,this.items.length-1)});
  return out;
 }
 estimateRange(from,to){if(to<from)return 0;let total=0;for(let i=from;i<=to;i++){const id=itemKey(this.items[i]);total+=this.measurements.get(id)||this.averageHeight;}return Math.max(1,Math.round(total));}
 measure(root){
  const values=[];for(const node of root?.querySelectorAll?.('[data-entry-id]')||[]){const id=node.dataset.entryId,h=node.getBoundingClientRect?.().height;if(id&&Number.isFinite(h)&&h>8){this.measurements.set(id,h);values.push(h);}}
  if(values.length){const sum=values.reduce((a,b)=>a+b,0),mean=sum/values.length;this.averageHeight=Math.max(80,Math.min(1200,this.averageHeight*.7+mean*.3));}
 }
 captureAnchor(root,{top=140}={}){
  const nodes=[...(root?.querySelectorAll?.('[data-entry-id]')||[])];let best=null;
  for(const node of nodes){const r=node.getBoundingClientRect();if(r.bottom<=top)continue;if(!best||r.top<best.rect.top)best={node,rect:r};}
  return best?{id:best.node.dataset.entryId,top:best.rect.top}:null;
 }
 restoreAnchor(root,anchor){
  if(!anchor?.id)return false;const node=[...(root?.querySelectorAll?.('[data-entry-id]')||[])].find(n=>n.dataset.entryId===anchor.id);if(!node)return false;
  const delta=node.getBoundingClientRect().top-anchor.top;if(Math.abs(delta)>0.5)scrollBy(0,delta);return true;
 }
 moveWindowAround(id){
  const index=this.index.get(id);if(!Number.isInteger(index))return false;
  this.windowStart=clamp(Math.floor(index/this.chunk)*this.chunk-this.chunk,0,Math.max(0,this.items.length-this.windowSize));return true;
 }
};
export const topicReaderItemKey=itemKey;
