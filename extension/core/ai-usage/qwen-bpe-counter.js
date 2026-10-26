// Offline byte-rank BPE mechanics, not commercial-model qualification.
// The legacy DashScope source specifies this pre-tokenization expression and
// NFC / special-token behavior. Those choices are explicit here; a qwen* name
// never selects an asset, grants processing, or proves a billing-template bound.
// https://github.com/dashscope/dashscope-sdk-python/tree/main/dashscope/tokenizers
import {hashText} from '../dedupe.js';

export const QWEN_BPE_IMPLEMENTATION='paia-byte-rank-qwen-pattern-v1';
export const QWEN_BPE_BOUNDS=Object.freeze({assetBytes:33554432,ranks:300000,tokenBytes:1024,specials:256,specialChars:128,wireBytes:262144,work:8000000});
const counters=new WeakMap(),encoder=new TextEncoder();
const pattern=/(?:'s|'t|'re|'ve|'m|'ll|'d)|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/giu;
const bad=reason=>{throw Object.assign(Error(reason),{code:reason});};
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const own=(v,k)=>Object.hasOwn(v,k);
function data(o,keys){
 if(!o||![Object.prototype,null].includes(Object.getPrototypeOf(o)))bad('TOKENIZER_DATA');
 const ds=Object.getOwnPropertyDescriptors(o),names=Reflect.ownKeys(ds);
 if(names.length!==keys.length||names.some(k=>typeof k!=='string'||!keys.includes(k)||!ds[k].enumerable||!own(ds[k],'value')))bad('TOKENIZER_DATA');
 return Object.fromEntries(keys.map(k=>[k,ds[k].value]));
}
function snapshotSpecials(value){
 if(!Array.isArray(value))bad('TOKENIZER_SPECIALS');
 const ds=Object.getOwnPropertyDescriptors(value),names=Reflect.ownKeys(ds),length=ds.length?.value;
 if(!integer(length)||length>QWEN_BPE_BOUNDS.specials||names.length!==length+1||names.some(k=>k!=='length'&&(!/^\d+$/.test(k)||Number(k)>=length||!own(ds[k],'value'))))bad('TOKENIZER_SPECIALS');
 const list=[],texts=new Set(),ids=new Set();
 for(let i=0;i<length;i++){
  const v=data(ds[i].value,['text','id']);
  if(typeof v.text!=='string'||!v.text.length||v.text.length>QWEN_BPE_BOUNDS.specialChars||!v.text.isWellFormed()||!integer(v.id)||v.id>2147483647||texts.has(v.text)||ids.has(v.id))bad('TOKENIZER_SPECIALS');
  texts.add(v.text);ids.add(v.id);list.push(Object.freeze(v));
 }
 return Object.freeze(list);
}
function specials(list,ranks){
 const root={children:new Map(),terminal:false};
 for(const v of list){if(ranks.has(v.id))bad('TOKENIZER_SPECIALS');let node=root;for(let j=0;j<v.text.length;j++){const key=v.text[j];if(!node.children.has(key))node.children.set(key,{children:new Map(),terminal:false});node=node.children.get(key);}node.terminal=true;}
 return root;
}
function parseAsset(text){
 const ranks=new Map(),ids=new Set();let start=0,maxToken=0;
 for(let at=0;at<=text.length;at++){
  if(at<text.length&&text.charCodeAt(at)!==10)continue;
  let line=text.slice(start,at);start=at+1;if(line.endsWith('\r'))line=line.slice(0,-1);if(!line&&at===text.length)continue;
  if(!line.length||line.length>1400||ranks.size>=QWEN_BPE_BOUNDS.ranks)bad('TOKENIZER_ASSET_BOUND');
  const match=/^([A-Za-z0-9+/]+={0,2}) (0|[1-9][0-9]{0,9})$/.exec(line);if(!match)bad('TOKENIZER_ASSET_FORMAT');
  let bytes;try{bytes=atob(match[1]);}catch{bad('TOKENIZER_ASSET_FORMAT');}
  const rank=Number(match[2]);if(!bytes.length||bytes.length>QWEN_BPE_BOUNDS.tokenBytes||btoa(bytes)!==match[1]||!integer(rank)||rank>2147483647||ranks.has(bytes)||ids.has(rank))bad('TOKENIZER_ASSET_FORMAT');
  ranks.set(bytes,rank);ids.add(rank);maxToken=Math.max(maxToken,bytes.length);
 }
 for(let i=0;i<256;i++)if(!ranks.has(String.fromCharCode(i)))bad('TOKENIZER_BYTE_COVERAGE');
 return {ranks,ids,maxToken};
}
// Heap order is rank, then the original left byte offset. Stale adjacent-pair
// entries are rejected by both node versions; no recursion or quadratic scans.
function piecesCount(text,ranks,maxToken,charge){
 const bytes=encoder.encode(text);charge(bytes.length);let raw='';
 for(let i=0;i<bytes.length;i+=4096)raw+=String.fromCharCode(...bytes.subarray(i,i+4096));
 const n=bytes.length;if(!n)return 0;if(n<=maxToken&&ranks.has(raw))return 1;
 const next=new Int32Array(n),prev=new Int32Array(n),end=new Int32Array(n),version=new Uint32Array(n);
 for(let i=0;i<n;i++){next[i]=i+1<n?i+1:-1;prev[i]=i-1;end[i]=i+1;}
 const heap=[],less=(a,b)=>{charge(1);return a.rank<b.rank||a.rank===b.rank&&a.left<b.left;};
 const push=v=>{charge(1);let i=heap.length;heap.push(v);while(i){const p=(i-1)>>1;if(!less(v,heap[p]))break;heap[i]=heap[p];i=p;}heap[i]=v;};
 const pop=()=>{charge(1);const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(2*i+1<heap.length){let c=2*i+1;if(c+1<heap.length&&less(heap[c+1],heap[c]))c++;if(!less(heap[c],last))break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;};
 const pair=left=>{if(left<0||end[left]<0)return;const right=next[left];if(right<0)return;const size=end[right]-left;if(size>maxToken)return;charge(size+1);const rank=ranks.get(raw.slice(left,end[right]));if(rank!==undefined)push({left,right,rank,lv:version[left],rv:version[right]});};
 for(let i=0;i<n-1;i++)pair(i);let total=n;
 while(heap.length){const p=pop(),{left,right}=p;if(end[left]<0||end[right]<0||next[left]!==right||version[left]!==p.lv||version[right]!==p.rv)continue;
  end[left]=end[right];next[left]=next[right];if(next[right]>=0)prev[next[right]]=left;end[right]=-1;version[left]++;version[right]++;total--;pair(prev[left]);pair(left);
 }
 return total;
}
function counterFrom(ranks,maxToken,trie,config){
 let disposed=false;const info=Object.freeze({...config,implementation:QWEN_BPE_IMPLEMENTATION,qualification:'NOT_ESTABLISHED',financialAuthority:false,dispatchAllowed:false});
 const counter=Object.freeze({
  countText(text){
   try{
    if(disposed)bad('TOKENIZER_DISPOSED');if(typeof text!=='string'||!text.isWellFormed()||text.length>config.maxWireBytes)bad('TOKENIZER_TEXT_BOUND');
    const rawBytes=encoder.encode(text).length;if(rawBytes>config.maxWireBytes)bad('TOKENIZER_TEXT_BOUND');let work=0;
    const charge=n=>{work+=n;if(work>config.workLimit)bad('TOKENIZER_WORK_BOUND');};charge(text.length+rawBytes);
    const normalized=config.normalization==='NFC'?text.normalize('NFC'):text;charge(normalized.length);const normalizedBytes=encoder.encode(normalized).length;if(normalizedBytes>config.maxWireBytes)bad('TOKENIZER_TEXT_BOUND');charge(normalizedBytes);
    let tokens=0;
    const ordinary=part=>{const re=new RegExp(pattern.source,pattern.flags);let at=0;for(const m of part.matchAll(re)){charge(m[0].length+1);if(m.index!==at||!m[0].length)bad('TOKENIZER_PATTERN');at+=m[0].length;tokens+=piecesCount(m[0],ranks,maxToken,charge);}if(at!==part.length)bad('TOKENIZER_PATTERN');};
    if(config.specialMode==='ordinary')ordinary(normalized);
    else{let start=0;for(let i=0;i<normalized.length;){let node=trie,found=-1,j=i;while(j<normalized.length&&node.children.has(normalized[j])){charge(1);node=node.children.get(normalized[j++]);if(node.terminal)found=j;}charge(1);if(found<0){i++;continue;}if(config.specialMode==='reject')bad('TOKENIZER_SPECIAL_LITERAL');ordinary(normalized.slice(start,i));tokens++;i=found;start=i;}ordinary(normalized.slice(start));}
    return Object.freeze({status:'COUNTED_UNQUALIFIED',...info,tokens,rawBytes,normalizedBytes,work});
   }catch(e){return Object.freeze({status:'UNAVAILABLE',reason:typeof e?.code==='string'?e.code:'TOKENIZER_UNAVAILABLE',qualification:'NOT_ESTABLISHED',financialAuthority:false,dispatchAllowed:false});}
  },
  dispose(){disposed=true;ranks.clear();trie.children.clear();},
 });
 counters.set(counter,{info,current:()=>!disposed});return counter;
}
export function inspectQwenBpeCounter(counter){const s=counters.get(counter);return s?.current()?s.info:null;}
export async function createQwenBpeCounter(options){
 try{
  const o=data(options,['format','asset','assetDigest','normalization','specialMode','specialTokens','maxWireBytes','workLimit']);
  if(o.format!=='qwen-byte-rank-table-v1'||typeof o.asset!=='string'||!o.asset.length||o.asset.length>QWEN_BPE_BOUNDS.assetBytes||!/^[\x09\x0a\x0d\x20-\x7e]+$/.test(o.asset)||! /^[a-f0-9]{64}$/.test(o.assetDigest)||!['none','NFC'].includes(o.normalization)||!['ordinary','allow-all','reject'].includes(o.specialMode)||!integer(o.maxWireBytes)||o.maxWireBytes<1||o.maxWireBytes>QWEN_BPE_BOUNDS.wireBytes||!integer(o.workLimit)||o.workLimit<1||o.workLimit>QWEN_BPE_BOUNDS.work)return null;
  const list=snapshotSpecials(o.specialTokens),specialTokensDigest=await hashText(JSON.stringify(list));
  if(await hashText(o.asset)!==o.assetDigest)return null;
  const {ranks,ids,maxToken}=parseAsset(o.asset),trie=specials(list,ids);
  return counterFrom(ranks,maxToken,trie,{assetDigest:o.assetDigest,specialTokensDigest,normalization:o.normalization,specialMode:o.specialMode,maxWireBytes:o.maxWireBytes,workLimit:o.workLimit});
 }catch{return null;}
}
