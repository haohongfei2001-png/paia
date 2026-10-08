// Disposable projection only; never insertion authority or another library.
import {NEXT_FAMILY_LIMITS} from './next-family-matcher.js';
export const NEXT_FAMILY_VIEW_TTL=30000;
const cold=()=>({available:false,complete:false});
export class NextFamilyView{
 #value=null;#serial=0;
 constructor(clock){this.clock=clock;}
 begin(){this.#value=null;return ++this.#serial;}
 publish(serial,snapshot){
  if(serial!==this.#serial)return;
  const items=[];let bytes=0;
  for(const f of snapshot.families){
   if(f.hidden||!(f.useful||f.pinned||f.edited||f.retained))continue;
   if(typeof f.text!=='string'||Array.from(f.text).length>NEXT_FAMILY_LIMITS.textCharacters)return;
   bytes+=new TextEncoder().encode(f.text).length;
   if(bytes>NEXT_FAMILY_LIMITS.totalBytes||items.length===NEXT_FAMILY_LIMITS.families)return;
   items.push({id:f.id,text:f.text,...Object.fromEntries(['hidden','useful','pinned','edited','retained'].map(k=>[k,f[k]===true]))});
  }
  const at=this.clock();if(!Number.isFinite(at)||!Number.isSafeInteger(snapshot.generation)||snapshot.generation<0)return;
  this.#value={at,view:{available:true,complete:true,generation:snapshot.generation,items}};
 }
 async read(assertCurrent){
  const value=this.#value,serial=this.#serial,now=this.clock();
  if(!value)return cold();
  if(!Number.isFinite(now)||now<value.at||now-value.at>=NEXT_FAMILY_VIEW_TTL){this.#value=null;return cold();}
  try{await assertCurrent(value.view.generation);}catch{if(this.#value===value)this.#value=null;return cold();}
  const end=this.clock();
  if(serial!==this.#serial||this.#value!==value)return cold();
  if(!Number.isFinite(end)||end<value.at||end-value.at>=NEXT_FAMILY_VIEW_TTL){this.#value=null;return cold();}
  return structuredClone(value.view);
 }
}
