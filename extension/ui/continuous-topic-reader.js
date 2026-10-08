const itemKey=item=>item?.entry?.id||item?.id||null;
const pick=(row,fields)=>Object.fromEntries(fields.filter(key=>row?.[key]!==undefined).map(key=>[key,row[key]]));
const identity=item=>({entry:{id:itemKey(item),...pick(item?.entry,['revision','contentRevision','bodyBinding','workingInputId','bindingRevision','currentInputRevision']),...(item?.entry?.fieldRevisions?{fieldRevisions:pick(item.entry.fieldRevisions,['body'])}:{})},...(item?.placement?{placement:pick(item.placement,['id','topicId','sectionId','layoutGeneration','revision','rank','sectionRank'])}:{})});
const reference=item=>({...identity(item),...(item?.expanded===true?{expanded:true,...(Number.isFinite(item.height)&&item.height>0&&item.height<10000000?{height:item.height}:{})}:{}),unloaded:true});
const sameReference=(old,item)=>JSON.stringify(identity(old))===JSON.stringify(identity(item));
const sectionReference=row=>pick(row,['sectionId','topicId','layoutGeneration','revision','isDefault','named','title','rank','titleProtected','orderProtected','sourceUnavailable','lifecycle','redirectTo']);
const clone=value=>value===undefined?undefined:structuredClone(value);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const sectionAnchorRef=value=>{
 if(!value||typeof value.sectionId!=='string'||!value.sectionId.length||value.sectionId.length>200||typeof value.topicId!=='string'||!value.topicId.length||value.topicId.length>200||!Number.isSafeInteger(value.revision)||value.revision<0||!Number.isSafeInteger(value.layoutGeneration)||value.layoutGeneration<1||typeof value.rank!=='string'||!/^\d{12}$/.test(value.rank)||typeof value.recoveryEpoch!=='string'||!value.recoveryEpoch.length||value.recoveryEpoch.length>200||!Number.isFinite(value.top)||Math.abs(value.top)>10000000)return null;
 return pick(value,['sectionId','topicId','revision','layoutGeneration','rank','recoveryEpoch','top']);
};
const sameSection=(row,anchor)=>!!row&&['sectionId','topicId','revision','layoutGeneration','rank'].every(key=>row[key]===anchor[key]);

export class ContinuousTopicReader{
 constructor({load,loadEntry=null,chunk=40,windowChunks=3,maxEmptyLoads=20,estimatedHeight=180,maxReferences=10000,pins=()=>new Set()}={}){
  if(typeof load!=='function'||loadEntry!==null&&typeof loadEntry!=='function'||!Number.isInteger(chunk)||chunk<1||chunk>40||!Number.isInteger(windowChunks)||windowChunks<1||windowChunks>5||!Number.isInteger(maxEmptyLoads)||maxEmptyLoads<1||maxEmptyLoads>100||!Number.isInteger(maxReferences)||maxReferences<chunk*windowChunks||maxReferences>20000)throw new TypeError('INVALID_TOPIC_READER');
  this.load=load;this.loadEntry=loadEntry;this.pins=pins;this.maxReferences=maxReferences;this.chunk=chunk;this.windowSize=chunk*windowChunks;this.maxEmptyLoads=maxEmptyLoads;this.defaultHeight=estimatedHeight;this.measurements=new Map();this.averageHeight=estimatedHeight;this.serial=0;this.reset({});
 }
 reset({topicId=null,sort='asc',query='',anchorId=null,sectionId=null,timeEdge=null}={}){
  this.serial++;this.topicId=topicId;this.sort=sort;this.query=query;this.anchorId=anchorId;this.sectionId=sectionId;this.timeEdge=timeEdge;
  this.measurements.clear();this.items=[];this.index=new Map();this.bodyRevision=0;this.protectionBlocked=false;this.hydrating=false;this.hydrationPromise=null;this.hydrationError=null;this.windowRevision=0;this.nextCursor=null;this.previousCursor=null;this.coverage=null;this.pageMeta=null;this.sections=new Map();this.sectionCursor=null;
  this.frontiers=[];this.boundsBlocked=false;this.recoveryEpoch=null;this.pendingSectionAnchor=null;this.sectionRestoreAnchor=null;this.sectionRestoreRequested=false;this.sectionAnchorRestored=false;this.sectionRestoreRefused=false;this.windowStart=0;this.initialized=false;this.indexing=false;this.continuationNext=false;this.continuationPrevious=false;this.loadingNext=false;this.loadingPrevious=false;this.errorNext=null;this.errorPrevious=null;this.terminalNext=false;this.terminalPrevious=anchorId===null&&sectionId===null;this.stale=false;this.anchorUnavailable=false;return this.state();
 }
 matches({topicId,sort,query}){return this.topicId===topicId&&this.sort===sort&&this.query===query;}
 state(){return {
  topicId:this.topicId,sort:this.sort,query:this.query,items:[...this.items],
  nextCursor:this.nextCursor,previousCursor:this.previousCursor,
  terminalNext:this.terminalNext,terminalPrevious:this.terminalPrevious,
  loadingNext:this.loadingNext,loadingPrevious:this.loadingPrevious,
  errorNext:this.errorNext||this.hydrationError,errorPrevious:this.errorPrevious,indexing:this.indexing,continuationNext:this.continuationNext,continuationPrevious:this.continuationPrevious,
  coverage:this.coverage,pageMeta:this.pageMeta,sectionCursor:this.sectionCursor,
  initialized:this.initialized,stale:this.stale,anchorUnavailable:this.anchorUnavailable,windowStart:this.windowStart,bodyRevision:this.bodyRevision,protectionBlocked:this.protectionBlocked,retainedBodies:this.items.filter(item=>!item.unloaded).length
 };}
 snapshot(anchor=null,sectionAnchor=null){
  const fallback=!anchor?.id&&!this.query?sectionAnchorRef(sectionAnchor):null;
  return {topicId:this.topicId,sort:this.sort,query:this.query,anchor:anchor?.id?{id:anchor.id,top:anchor.top}:null,
   sectionAnchor:fallback&&fallback.topicId===this.topicId&&fallback.recoveryEpoch===this.recoveryEpoch&&sameSection(this.sections.get(fallback.sectionId),fallback)?fallback:null,
   extent:this.items.map(reference),sections:[...this.sections.values()].map(sectionReference),recoveryEpoch:this.recoveryEpoch,frontiers:clone(this.frontiers),windowStart:this.windowStart,nextCursor:clone(this.nextCursor),previousCursor:clone(this.previousCursor),terminalNext:this.terminalNext,terminalPrevious:this.terminalPrevious,generation:this.coverage?.activeGeneration||null};
 }
 restore(saved){
  if(!saved||!this.matches(saved)||!Array.isArray(saved.extent)||saved.extent.length>this.maxReferences+this.chunk||!Array.isArray(saved.sections??[])||(saved.sections?.length||0)>this.maxReferences+100)return false;
  const sections=new Map((saved.sections||[]).map(row=>[row.sectionId,sectionReference(row)])),fallback=!saved.anchor?.id&&!this.anchorId&&!this.query?sectionAnchorRef(saved.sectionAnchor):null;
  const sectionAnchor=fallback&&fallback.topicId===this.topicId&&fallback.recoveryEpoch===saved.recoveryEpoch&&sameSection(sections.get(fallback.sectionId),fallback)?fallback:null;
  if(!saved.extent.length&&!sectionAnchor)return false;
  this.sections=sections;this.recoveryEpoch=saved.recoveryEpoch||null;this.frontiers=clone(saved.frontiers||[]);this.items=saved.extent.map(reference);this.index=new Map(this.items.map((item,i)=>[itemKey(item),i]));this.windowStart=clamp(saved.windowStart||0,0,Math.max(0,this.items.length-this.windowSize));
  for(const item of this.items)if(item.expanded&&item.height)this.measurements.set(itemKey(item),item.height);
  this.pendingSectionAnchor=sectionAnchor;this.sectionRestoreRequested=!!sectionAnchor;
  this.nextCursor=clone(saved.nextCursor);this.previousCursor=clone(saved.previousCursor);this.terminalNext=!!saved.terminalNext;this.terminalPrevious=!!saved.terminalPrevious;this.coverage={activeGeneration:saved.generation};this.initialized=true;return true;
 }
 trimBodies(pins=this.pins()){
  const keep=new Set(this.protectedWindow(pins));
  for(let i=0;i<this.items.length;i++)if(!keep.has(i)&&!this.items[i].unloaded)this.items[i]=reference(this.items[i]);
  this.protectionBlocked=pins.size>this.windowSize||this.boundsBlocked;
 }
 async hydrateWindow(){
  const serial=this.serial;
  if(this.hydrationPromise){const revision=this.hydrationRevision,result=await this.hydrationPromise;if(serial!==this.serial)return false;return revision===this.windowRevision?result:this.hydrateWindow();}
  this.hydrationRevision=this.windowRevision;const run=this._hydrateWindow(serial,this.windowRevision);this.hydrationPromise=run;
  try{return await run;}finally{if(this.hydrationPromise===run)this.hydrationPromise=null;}
 }
 async _hydrateWindow(serial,windowRevision){
  this.hydrating=true;
  try{
   if(this.pendingSectionAnchor&&!await this.hydrateSectionAnchor(serial,windowRevision))return false;
   const maxReads=this.protectedWindow(this.pins()).length;
   for(let read=0;read<maxReads;read++){
    const indices=this.protectedWindow(this.pins()),missing=indices.find(i=>this.items[i]?.unloaded);
    if(missing===undefined){this.hydrationError=null;this.trimBodies();return true;}
    const id=itemKey(this.items[missing]),page=await this.load({topicId:this.topicId,sort:this.sort,query:this.query,anchorId:id,cursor:null,direction:'next',expectedReadGeneration:this.coverage?.activeGeneration||null});
    if(serial!==this.serial||windowRevision!==this.windowRevision)return false;
    if(this.invalidPage(page)||page?.indexing){this.invalidate(page);return false;}
    const rows=page.items||[],target=rows.find(item=>itemKey(item)===id);
    if(!target||!sameReference(this.items[missing],target)){this.invalidate({anchorUnavailable:!target});return false;}
    this.readMeta(page);
    const selected=new Set(this.protectedWindow(this.pins()));
    for(const item of rows){const at=this.index.get(itemKey(item));if(Number.isInteger(at)&&selected.has(at)&&this.items[at].unloaded){
     const expected=this.items[at];if(!sameReference(expected,item)){this.invalidate();return false;}
     const resolved=expected.expanded?await this.readExpandedEntry(item,expected,()=>serial===this.serial&&windowRevision===this.windowRevision):item;
     if(serial!==this.serial||windowRevision!==this.windowRevision||!resolved)return false;this.items[at]=resolved;this.bodyRevision++;
    }}
    this.trimBodies();
   }
   if(this.protectedWindow(this.pins()).every(i=>!this.items[i]?.unloaded)){this.hydrationError=null;this.trimBodies();return true;}
   throw Error('TOPIC_WINDOW_INCOMPLETE');
  }catch(error){if(serial===this.serial&&windowRevision===this.windowRevision)this.hydrationError=error;return false;}
  finally{if(serial===this.serial)this.hydrating=false;}
 }
 async readExpandedEntry(descriptor,expected,isCurrent){
  if(typeof this.loadEntry!=='function')throw Error('EXPANDED_ENTRY_READ_UNAVAILABLE');
  const generation=this.coverage?.activeGeneration,epoch=this.recoveryEpoch,id=itemKey(expected);
  if(!generation||!epoch)throw Error('EXPANDED_ENTRY_CONTEXT_UNAVAILABLE');
  const row=await this.loadEntry(id);if(!isCurrent())return null;
  // A full canonical body is admitted only after its original Section/query
  // generation and placement have been revalidated across the full-body await.
  const page=await this.load({topicId:this.topicId,query:this.query,sort:this.sort,anchorId:id,cursor:null,direction:'next',limit:1,expectedReadGeneration:generation});
  if(!isCurrent())return null;
  if(this.invalidPage(page)||page.indexing){this.invalidate(page);return null;}
  const current=page.items?.find(item=>itemKey(item)===id);
  if(!current||!sameReference(expected,current)||!sameReference(descriptor,current)||row?.recoveryEpoch!==epoch||page.recoveryEpoch!==epoch||row.lifecycle!=='active'||row.staleReasons?.includes('source_purged')||typeof row.body!=='string'||!sameReference(current,{entry:row,placement:current.placement})){
   this.invalidate({anchorUnavailable:!current});return null;
  }
  this.readMeta(page);
  return {...current,expanded:true,...(expected.height?{height:expected.height}:{}),entry:{...row,expressionTime:current.entry.expressionTime,timeBasis:current.entry.timeBasis,effectiveTime:current.entry.effectiveTime}};
 }
 async expandEntry(item,{isCurrent=()=>true}={}){
  const serial=this.serial,id=itemKey(item),at=this.index.get(id),current=()=>serial===this.serial&&isCurrent();
  if(!Number.isInteger(at)||!sameReference(this.items[at],item))return null;
  const full=await this.readExpandedEntry(item,reference(this.items[at]),current);if(!full||!current())return null;
  const index=this.index.get(id);if(!Number.isInteger(index)||!sameReference(this.items[index],item))return null;
  this.items[index]=full;this.bodyRevision++;this.trimBodies();return full;
 }

 async hydrateSectionAnchor(serial,windowRevision){
  const anchor=this.pendingSectionAnchor,generation=this.coverage?.activeGeneration||null,current=()=>serial===this.serial&&windowRevision===this.windowRevision;
  const read=expectedReadGeneration=>this.load({topicId:this.topicId,sort:this.sort,query:this.query,sectionId:anchor.sectionId,anchorId:null,cursor:null,direction:'next',expectedReadGeneration});
  let page=await read(generation);if(!current())return false;
  // Cursor/generation caches may expire while Settings is open. One fresh
  // exact-Section read can recover a still-identical reference; epoch, revision,
  // layout and order must all agree before any cached metadata is painted.
  if(page?.cursorInvalid&&!page.anchorUnavailable&&generation){page=await read(null);if(!current())return false;}
  if(page?.unavailable||page?.unsupported)throw Error(page.reason||'TOPIC_READ_UNAVAILABLE');
  const row=page?.sections?.find(section=>section.sectionId===anchor.sectionId);
  if(page?.cursorInvalid||page?.indexing||page?.topic?.id!==this.topicId||page?.recoveryEpoch!==anchor.recoveryEpoch||!sameSection(row,anchor)||!row.title?.trim()){
   this.invalidate({anchorUnavailable:true});this.sectionRestoreRefused=true;return false;
  }
  // Rebase to this exact, validated Section even when earlier clean Entry
  // references remain. Only actual Entry anchors outrank this fallback. Its
  // freshly issued directional cursors replace expired tab-local tokens, and
  // the Section's measured top restores the viewport without fake Entries.
  const pins=this.pins(),protectedRefs=this.items.filter(item=>pins.has(itemKey(item))).map(reference);
  this.items=protectedRefs;this.index=new Map(protectedRefs.map((item,i)=>[itemKey(item),i]));this.sections.clear();this.frontiers=[];this.measurements.clear();this.windowStart=0;
  this.rememberFrontier(page,'next');this.readMeta(page);this.merge(page.items||[],'next');if(this.stale)return false;
  this.nextCursor=page.nextCursor??null;this.previousCursor=page.previousCursor??null;this.terminalNext=!this.nextCursor;this.terminalPrevious=!this.previousCursor;
  this.pendingSectionAnchor=null;this.sectionRestoreAnchor=anchor;this.bodyRevision++;return true;
 }

 invalidPage(page){
  if(page?.unavailable||page?.unsupported)throw Error(page.reason||'TOPIC_READ_UNAVAILABLE');
  return page?.cursorInvalid||this.coverage?.activeGeneration&&page.coverage?.activeGeneration!==this.coverage.activeGeneration||this.recoveryEpoch&&page.recoveryEpoch!==this.recoveryEpoch;
 }
 invalidate(page={}){this.stale=true;this.anchorUnavailable=page.anchorUnavailable===true;this.items=this.items.map(reference);this.sections.clear();this.frontiers=[];this.pageMeta=null;this.pendingSectionAnchor=null;this.sectionRestoreAnchor=null;}
 readMeta(page){const {items,tracked,...meta}=page||{};this.pageMeta=meta;this.addSections(page?.sections);this.coverage=page?.coverage||this.coverage;this.recoveryEpoch=page?.recoveryEpoch||this.recoveryEpoch;}

 // Opaque page frontiers permit a finite tab-local extent without losing the
 // ability to read backwards. No cursor is interpreted or written to storage.
 rememberFrontier(page,direction){
  const ids=(page.items||[]).map(itemKey),sections=(page.sections||[]).map(row=>row.sectionId);
  const fresh=ids.some(id=>!this.index.has(id))||sections.some(id=>!this.sections.has(id));
  if(fresh){const point={ids,sections,before:clone(page.previousCursor),after:clone(page.nextCursor)};if(direction==='previous')this.frontiers.unshift(point);else this.frontiers.push(point);}
  else if(this.frontiers.length){if(direction==='previous')this.frontiers[0].before=clone(page.previousCursor);else this.frontiers.at(-1).after=clone(page.nextCursor);}
 }
 pruneExtent(direction='next'){
  this.boundsBlocked=false;
  while(this.items.length>this.maxReferences||this.sections.size>this.maxReferences){
   if(this.frontiers.length<2){this.boundsBlocked=true;break;}
   const previous=direction==='previous',point=previous?this.frontiers.at(-1):this.frontiers[0],rest=previous?this.frontiers.slice(0,-1):this.frontiers.slice(1);
   const keepIds=new Set(rest.flatMap(value=>value.ids)),drop=new Set(point.ids.filter(id=>!keepIds.has(id))),pins=this.pins();
   // Pins are never discarded for a cache limit. The next explicit load can
   // continue after the real editor releases them. Clean body windows remain
   // intact unless metadata alone exceeds the finite reference budget.
   const protectedIds=this.items.length>this.maxReferences?new Set(this.protectedWindow(pins).map(index=>itemKey(this.items[index]))):pins;
   if([...drop].some(id=>protectedIds.has(id))){this.boundsBlocked=true;break;}
   const windowId=itemKey(this.items[this.windowStart]);this.frontiers=rest;
   this.items=this.items.filter(item=>!drop.has(itemKey(item)));this.index=new Map(this.items.map((item,i)=>[itemKey(item),i]));
   this.windowStart=this.index.get(windowId)??0;
   const keptSections=new Set([...rest.flatMap(value=>value.sections),...this.items.map(item=>item.placement?.sectionId)]);
   for(const id of this.sections.keys())if(!keptSections.has(id))this.sections.delete(id);
   if(previous){this.nextCursor=clone(rest.at(-1).after);this.terminalNext=!this.nextCursor;}
   else{this.previousCursor=clone(rest[0].before);this.terminalPrevious=!this.previousCursor;}
   for(const id of this.measurements.keys())if(!this.index.has(id))this.measurements.delete(id);
   this.windowRevision++;
  }
  this.protectionBlocked=this.boundsBlocked||this.pins().size>this.windowSize;
 }

 addSections(rows=[]){for(const row of rows)if(row?.sectionId)this.sections.set(row.sectionId,sectionReference(row));}
 merge(items,direction){
  const fresh=[];
  for(const item of items||[]){const key=itemKey(item);if(!key)continue;const at=this.index.get(key);if(Number.isInteger(at)){if(!sameReference(this.items[at],item)){this.invalidate();return 0;}if(this.items[at].unloaded){if(!this.items[at].expanded)this.items[at]=item;this.bodyRevision++;}continue;}fresh.push(item);}
  if(!fresh.length)return 0;this.bodyRevision++;
  if(direction==='previous')this.items=[...fresh,...this.items];else this.items.push(...fresh);
  this.index=new Map(this.items.map((item,i)=>[itemKey(item),i]));
  return fresh.length;
 }
 async initial(){
  if(this.initialized){await this.hydrateWindow();return this.state();}if(this.loadingNext)return this.state();
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
  this.pruneExtent(kind==='previous'?'previous':'next');this.protectionBlocked=this.pins().size>this.windowSize||this.boundsBlocked;if(this.protectionBlocked)return this.state();
  this[flag]=true;this[errorKey]=null;const continuation=kind==='previous'?'continuationPrevious':'continuationNext';this[continuation]=false;let empty=0,addedTotal=0,initialPass=true;
  try{
   do{
    const cursor=kind==='initial'?(initialPass?null:this.nextCursor):kind==='previous'?this.previousCursor:this.nextCursor;
    const page=await this.load({topicId:this.topicId,sort:this.sort,query:this.query,cursor,direction,anchorId:kind==='initial'&&initialPass?this.anchorId:null,sectionId:kind==='initial'&&initialPass?this.sectionId:null,timeEdge:kind==='initial'&&initialPass?this.timeEdge:null,sectionCursor:this.sectionCursor,expectedReadGeneration:this.coverage?.activeGeneration||null});
    if(serial!==this.serial)return {...this.state(),stale:true};
    if(this.invalidPage(page)){this.invalidate(page);return this.state();}
    this.initialized=true;this.indexing=page?.indexing===true;const sectionCount=this.sections.size,visibleSection=!this.query&&(page?.sections||[]).some(row=>!row.isDefault&&row.title?.trim()&&!this.sections.get(row.sectionId)?.title?.trim());this.rememberFrontier(page,kind==='previous'?'previous':'next');this.readMeta(page);if(this.sections.size!==sectionCount)this.bodyRevision++;
    if(page?.sectionCursor!==undefined)this.sectionCursor=page.sectionCursor;
    const added=this.merge(page?.items||[],kind==='previous'?'previous':'next');addedTotal+=added;if(this.stale)return this.state();
    if(kind==='initial'){this.nextCursor=page?.nextCursor??null;if(initialPass)this.previousCursor=page?.previousCursor??null;}
    else if(kind==='previous')this.previousCursor=page?.previousCursor??null;
    else this.nextCursor=page?.nextCursor??null;
    const previousWindow=this.windowStart;
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
    if(this.windowStart!==previousWindow||kind==='previous'&&added)this.windowRevision++;
    this.pruneExtent(kind==='previous'?'previous':'next');this.trimBodies();initialPass=false;
    if(added||visibleSection||this.indexing||kind==='previous'&&!this.previousCursor||kind!=='previous'&&!this.nextCursor)break;
    empty++;if(empty>=this.maxEmptyLoads){this[continuation]=true;break;}
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
  // Each spacer belongs to exactly one durable Section, including mixed loaded
  // and evicted bodies. Hydration validates these refs before they are reused.
  const gap=(from,to)=>{for(let start=from;start<=to;){const sectionId=this.items[start]?.placement?.sectionId||null;let end=start;while(end<to&&(this.items[end+1]?.placement?.sectionId||null)===sectionId)end++;out.push({kind:'spacer',sectionId,from:start,to:end,count:end-start+1,height:this.estimateRange(start,end)});start=end+1;}};
  for(const index of indices){
   if(index>last+1)gap(last+1,index-1);
   if(this.items[index].unloaded)gap(index,index);else out.push({kind:'item',index,item:this.items[index]});last=index;
  }
  if(last<this.items.length-1)gap(last+1,this.items.length-1);
  return out;
 }
 estimateRange(from,to){if(to<from)return 0;let total=0;for(let i=from;i<=to;i++){const id=itemKey(this.items[i]);total+=this.measurements.get(id)||this.averageHeight;}return Math.max(1,Math.round(total));}
 measure(root){
  const values=[];for(const node of root?.querySelectorAll?.('[data-entry-id]')||[]){const id=node.dataset.entryId,h=node.getBoundingClientRect?.().height;if(id&&Number.isFinite(h)&&h>8){this.measurements.set(id,h);const item=this.items[this.index.get(id)];if(item?.expanded)item.height=h;values.push(h);}}
  if(values.length){const sum=values.reduce((a,b)=>a+b,0),mean=sum/values.length;this.averageHeight=Math.max(80,Math.min(1200,this.averageHeight*.7+mean*.3));}
 }
 captureAnchor(root,{top=140}={}){
  const nodes=[...(root?.querySelectorAll?.('[data-entry-id]')||[])];let best=null;
  for(const node of nodes){const r=node.getBoundingClientRect();if(r.bottom<=top)continue;if(!best||r.top<best.rect.top)best={node,rect:r};}
  return best?{id:best.node.dataset.entryId,top:best.rect.top}:null;
 }
 captureSectionAnchor(root,{top=140}={}){
  if(this.query||this.pageMeta?.kind!=='section_reading'||!this.recoveryEpoch)return null;
  let best=null;
  for(const node of root?.querySelectorAll?.('.topic-section')||[]){
   const row=this.sections.get(node.dataset.sectionId);if(!row)continue;const rect=node.getBoundingClientRect();if(rect.bottom<=top)continue;
   if(!best||rect.top<best.top)best=sectionAnchorRef({...row,recoveryEpoch:this.recoveryEpoch,top:rect.top});
  }
  return best;
 }
 restoreAnchor(root,anchor){
  let node;
  if(anchor?.id)node=[...(root?.querySelectorAll?.('[data-entry-id]')||[])].find(n=>n.dataset.entryId===anchor.id);
  else{
   const ref=sectionAnchorRef(anchor);if(!ref||ref.topicId!==this.topicId||ref.recoveryEpoch!==this.recoveryEpoch||!sameSection(this.sections.get(ref.sectionId),ref))return false;
   node=[...(root?.querySelectorAll?.('.topic-section')||[])].find(n=>n.dataset.sectionId===ref.sectionId);
  }
  if(!node)return false;const delta=node.getBoundingClientRect().top-anchor.top;if(Math.abs(delta)>0.5)scrollBy(0,delta);
  if(!anchor.id)this.sectionAnchorRestored=true;return true;
 }
 moveWindowAround(id){
  const index=this.index.get(id);if(!Number.isInteger(index))return false;
  this.windowStart=clamp(Math.floor(index/this.chunk)*this.chunk-this.chunk,0,Math.max(0,this.items.length-this.windowSize));this.windowRevision++;return true;
 }
 moveWindowToStart(){if(this.windowStart===0)return false;this.windowStart=0;this.windowRevision++;return true;}
 shiftWindow(direction){
  if(!['previous','next'].includes(direction))return false;const maxStart=Math.max(0,this.items.length-this.windowSize),delta=direction==='previous'?-this.chunk:this.chunk,next=clamp(this.windowStart+delta,0,maxStart);
  if(next===this.windowStart)return false;this.windowStart=next;this.windowRevision++;return true;
 }
};
export const topicReaderItemKey=itemKey;
