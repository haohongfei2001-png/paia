import {fail} from './value.js';

// Internal prerequisite for the selected Source/Working current-native profile.
// This is a physical-tree meter/comparator, never a portable codec or capability.
// Native owners legitimately use own undefined and signed zero in derived IDB
// indexes. Keep their exact identity; canonical wire data remains strict.
const own=Object.hasOwn,descriptor=Object.getOwnPropertyDescriptor;
const prototype=Object.getPrototypeOf,symbols=Object.getOwnPropertySymbols;
const array=Array.isArray,objectPrototype=Object.prototype,arrayPrototype=Array.prototype;
const required=()=>fail('BNS_SOURCE_WORKING_PHYSICAL_INVALID');
function shape(value){
 const p=prototype(value);
 if(array(value)){if(p!==arrayPrototype)required();}
 else if(p!==objectPrototype&&p!==null)required();
 if(symbols(value).length)required();
}
function field(value,key){const d=descriptor(value,key);if(!d||!own(d,'value')||!d.enumerable)required();return d.value;}
function arrayShape(value){
 const d=descriptor(value,'length');if(!d||!own(d,'value')||!Number.isSafeInteger(d.value)||d.value<0||d.value>4096)required();
 let n=0;for(const key in value)if(own(value,key)){
  if(!/^(0|[1-9][0-9]*)$/.test(key)||Number(key)>=d.value||++n>d.value)required();
 }
 if(n!==d.value||Object.getOwnPropertyNames(value).length!==n+1)required();return d.value;
}
// Same finite depth/node/string limits as the original strict native meter.
// Extra physical scalars pay fixed tagged-slot space; no representation, JSON
// string or normalized body copy is made; descriptor/name vectors belong to
// the finite prepayment ledger of the native caller, never a heap theorem.
export function measureSourceWorkingPhysicalTree(value,limit=2*1024*1024){
 if('value'in objectPrototype)required();
 if(!Number.isSafeInteger(limit)||limit<1||limit>2*1024*1024)required();
 let B=0,T=0,V=0,E=0;const add=n=>{B+=n;if(B>limit)fail('BNS_HUMAN_GRAPH_LIMIT');};
 const text=s=>{T+=s.length;add(2);for(let i=0;i<s.length;i++){
  const c=s.charCodeAt(i);if(c===34||c===92||c===8||c===9||c===10||c===12||c===13)add(2);else if(c<32)add(6);else if(c<128)add(1);else if(c<2048)add(2);
  else if(c>=0xd800&&c<=0xdbff){const next=s.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))fail('BNS_TEXT_ENCODING');add(4);}else if(c>=0xdc00&&c<=0xdfff)fail('BNS_TEXT_ENCODING');else add(3);
 }};
 const visit=(v,depth)=>{
  if(++V>200000||depth>32)fail('BNS_HUMAN_GRAPH_LIMIT');
  if(v===undefined){add(32);return;}if(v===null){add(4);return;}
  if(typeof v==='string'){text(v);return;}if(typeof v==='boolean'){add(v?4:5);return;}
  if(typeof v==='number'){if(!Number.isFinite(v))required();add(Object.is(v,-0)?32:String(v).length);return;}
  if(!v||typeof v!=='object')required();shape(v);add(2);
  if(array(v)){const length=arrayShape(v);for(let i=0;i<length;i++){if(i)add(1);E++;visit(field(v,String(i)),depth+1);}return;}
  let first=true,fields=0;for(const key in v)if(own(v,key)){if(++fields>128)fail('BNS_HUMAN_GRAPH_LIMIT');if(!first)add(1);first=false;E++;text(key);add(1);visit(field(v,key),depth+1);}
  // A native clone has no nonenumerable object fields. Do not silently ignore
  // forged fields that would otherwise disappear from the complete cut.
  if(Object.getOwnPropertyNames(v).length!==fields)required();
 };
 visit(value,0);return {B,T,V,E};
}
// Caller must first meter/pay both original operands on its live work ticket.
// Complete structural equality includes own presence, array order, undefined
// and Object.is signed-zero identity. It produces no canonical/encoded copy.
export function equalSourceWorkingPhysicalTree(a,b){
 if('value'in objectPrototype)required();
 let visited=0;
 const compare=(x,y,depth)=>{
  if(++visited>200000||depth>32)fail('BNS_HUMAN_GRAPH_LIMIT');
  if(x===null||typeof x!=='object'||y===null||typeof y!=='object'){for(const v of [x,y])if(v!==null&&v!==undefined&&!['string','boolean','number','object'].includes(typeof v)||typeof v==='number'&&!Number.isFinite(v))required();return Object.is(x,y);}
  shape(x);shape(y);if(array(x)!==array(y))return false;
  if(array(x)){const n=arrayShape(x);if(n!==arrayShape(y))return false;for(let i=0;i<n;i++)if(!compare(field(x,String(i)),field(y,String(i)),depth+1))return false;return true;}
  let nx=0,ny=0;for(const key in x)if(own(x,key)){if(++nx>128)fail('BNS_HUMAN_GRAPH_LIMIT');if(!own(y,key)||!compare(field(x,key),field(y,key),depth+1))return false;}
  for(const key in y)if(own(y,key)&&++ny>128)fail('BNS_HUMAN_GRAPH_LIMIT');
  if(Object.getOwnPropertyNames(x).length!==nx||Object.getOwnPropertyNames(y).length!==ny)required();return nx===ny;
 };
 return compare(a,b,0);
}
