// Tab-local Reader metadata only. Each return re-reads current authority.
const ref=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const dense=(value,predicate)=>Array.isArray(value)&&Object.keys(value).length===value.length&&Array.from(value).every(predicate);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const cursor=value=>value===null||Array.isArray(value)&&value.length<=8&&dense(value,part=>typeof part==='string'&&part.length<600||typeof part==='number'&&Number.isFinite(part));
const keys=(value,allowed)=>value&&Object.getPrototypeOf(value)===Object.prototype&&Object.keys(value).every(key=>allowed.includes(key));
function validAnchor(value,documentId,sort){return value===null||keys(value,['documentId','inputId','revision','offset','sort','expanded','viewportTop'])&&value.documentId===documentId&&ref(value.inputId)&&integer(value.revision)&&integer(value.offset)&&value.offset<=1000000&&value.sort===sort&&Array.isArray(value.expanded)&&value.expanded.length<=100&&dense(value.expanded,ref)&&(value.viewportTop===undefined||Number.isFinite(value.viewportTop)&&Math.abs(value.viewportTop)<=1000000);}
function validFocus(value){return value===null||keys(value,['kind','inputId','anchorOffset','focusOffset'])&&['body','more','title'].includes(value.kind)&&(value.kind==='title'?value.inputId==null:ref(value.inputId))&&['anchorOffset','focusOffset'].every(key=>value[key]==null||integer(value[key])&&value[key]<=1000000);}
export function validReaderWindow(value){
 if(!keys(value,['documentId','sort','snapshot','includeFiltered','cursors','first','last','highWater','endCursor','pages','anchor','focus'])||!ref(value.documentId)||!['asc','desc'].includes(value.sort)||typeof value.includeFiltered!=='boolean')return false;
 if(!keys(value.snapshot,['mode','sequence'])||!['off','light'].includes(value.snapshot.mode)||!integer(value.snapshot.sequence))return false;
 if(!['first','last','highWater'].every(key=>integer(value[key]))||value.last<value.first||value.last-value.first>1||value.highWater<value.last||!Array.isArray(value.cursors)||value.cursors.length!==value.highWater+1||value.cursors.length>65536||!dense(value.cursors,cursor)||!cursor(value.endCursor))return false;
 if(!Array.isArray(value.pages)||value.pages.length!==value.last-value.first+1||!dense(value.pages,(page,index)=>keys(page,['index','ids','contextInputId','nextCursor'])&&page.index===value.first+index&&cursor(page.nextCursor)&&Array.isArray(page.ids)&&page.ids.length<=40&&dense(page.ids,ref)&&new Set(page.ids).size===page.ids.length&&(page.contextInputId==null||ref(page.contextInputId))))return false;
 return validAnchor(value.anchor,value.documentId,value.sort)&&validFocus(value.focus);
}
// The budget is global across all retained owners, not a per-entry allowance.
// Eviction is atomic: never trim a cursor spine and claim its extent survived.
export class ReaderWindowSessions {
 constructor({limit=5,maxBytes=2097152}={}){if(!Number.isInteger(limit)||limit<1||limit>32||!Number.isInteger(maxBytes)||maxBytes<128||maxBytes>16777216)throw Error('Invalid Reader session bound');this.limit=limit;this.maxBytes=maxBytes;this.entries=new Map();this.bytes=0;}
 save(value){
  if(!validReaderWindow(value))return {key:null,reason:'extent-unavailable'};
  const json=JSON.stringify(value),bytes=new TextEncoder().encode(json).byteLength;if(bytes>this.maxBytes)return {key:null,reason:'extent-unavailable'};
  while(this.entries.size>=this.limit||this.bytes+bytes>this.maxBytes)this.delete(this.entries.keys().next().value);
  const key=crypto.randomUUID();this.entries.set(key,{value:JSON.parse(json),bytes});this.bytes+=bytes;return {key,reason:null};
 }
 get(key){const saved=this.entries.get(key);if(!saved)return null;this.entries.delete(key);this.entries.set(key,saved);return structuredClone(saved.value);}
 delete(key){const saved=this.entries.get(key);if(saved){this.bytes-=saved.bytes;this.entries.delete(key);}return !!saved;}
 clear(){this.entries.clear();this.bytes=0;}
}

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Check the same live owner again after each asynchronous boundary. A flush
// may apply a deferred conflicting read before resolving successfully.
export async function settleReaderDeparture(active,isCurrent=()=>true){
 if(!active||!isCurrent())return false;
 await active.recoveryReady;
 if(!isCurrent()||active.disposed||active.composing||active.removalLocks)return false;
 active.collect();const saved=await active.flush();
 return !!saved&&isCurrent()&&!active.disposed&&!active.composing&&!active.dirty()&&!active.saving&&!active.failed&&!active.conflicted&&!active.saveSession?.pending&&!active.removalLocks;
}
// Publish nothing until both current reads finish on one fresh generation.
// This returns invocation-local DTOs; ReaderWindowSessions never stores them.
export async function readReaderWindow(saved,{read,isCurrent=()=>true,historyIds=[]}={}){
 if(!validReaderWindow(saved)||!Array.isArray(historyIds)||historyIds.length>900||!dense(historyIds,ref))throw Error('INVALID_READER_RETURN');
 if(!isCurrent())return null;const results=[];
 for(const descriptor of saved.pages){
  const trackedBlockIds=[...new Set([...historyIds,...(results[0]?.pageItemIds||[])])];
  const page=await read({view:'library',documentId:saved.documentId,cursor:structuredClone(saved.cursors[descriptor.index]),sort:saved.sort,readingSnapshot:structuredClone(saved.snapshot),includeFiltered:saved.includeFiltered,limit:40,trackedBlockIds,...(descriptor.contextInputId?{contextInputId:descriptor.contextInputId}:{}),...(results.length?{expectedGeneration:results[0].dataGeneration}:{})});
  if(!isCurrent())return null;
  if(!Number.isSafeInteger(page?.dataGeneration)||page.dataGeneration<0||results.length&&page.dataGeneration!==results[0].dataGeneration||!cursor(page.effectivePageCursor)||!cursor(page.nextCursor)||!Array.isArray(page.pageItemIds)||page.pageItemIds.length>40||!dense(page.pageItemIds,ref)||!Array.isArray(page.records)||!Array.isArray(page.library?.blocks)||!Array.isArray(page.conversations)||page.readingSort!==saved.sort)throw Error('READER_RETURN_CHANGED');
  results.push(page);
  if(!page.conversations?.some(row=>row.id===saved.documentId))return {unavailable:true,state:page};
 }
 const latest=results.at(-1),admitted=new Set((latest.library?.blocks||[]).filter(row=>row.documentId===saved.documentId&&!row.excluded&&!row.branchStatus).map(row=>row.id)),seen=new Set();
 const pages=results.map((page,index)=>({index:saved.pages[index].index,nextCursor:structuredClone(page.nextCursor),contextInputId:page.contextUnavailable?null:saved.pages[index].contextInputId||null,ids:page.pageItemIds.filter(id=>{if(!admitted.has(id)||seen.has(id))return false;seen.add(id);return true;})}));
 const exact=pages.every((page,index)=>same(results[index].pageItemIds,saved.pages[index].ids)&&same(page.ids,saved.pages[index].ids)&&same(page.nextCursor,saved.pages[index].nextCursor)&&same(results[index].effectivePageCursor,saved.cursors[page.index])&&!results[index].contextUnavailable);
 let window,published,publishedResults;
 if(exact){window=structuredClone(saved);window.pages=pages;window.endCursor=structuredClone(latest.nextCursor);published=pages;publishedResults=results;}
 else{
  const found=pages.findIndex(page=>page.ids.includes(saved.anchor?.inputId)),index=found>=0?found:pages.findIndex(page=>page.ids.length),chosen=index>=0?index:0,page=results[chosen];
  const chosenIds=[...new Set(page.pageItemIds.filter(id=>admitted.has(id)))];
  published=[{...pages[chosen],index:0,ids:chosenIds}];publishedResults=[page];window={...structuredClone(saved),cursors:[structuredClone(page.effectivePageCursor)],first:0,last:0,highWater:0,endCursor:structuredClone(page.nextCursor),pages:published};
 }
 // Equality certifies these mounted pages only. Older spine entries remain
 // navigation hints; forward continuation uses the fresh final nextCursor.
 return {unavailable:false,exactMountedWindow:exact,state:{...latest,effectivePageCursor:structuredClone(publishedResults[0].effectivePageCursor),nextCursor:structuredClone(publishedResults.at(-1).nextCursor),contextUnavailable:publishedResults.some(page=>page.contextUnavailable),filteredPageItemIds:[...new Set(publishedResults.flatMap(page=>page.filteredPageItemIds||[]))],pageItemIds:published.flatMap(page=>page.ids)},pages:published,window};
}
