// BNS-1: byte-exact, host-neutral values. Never normalize human text.
export class SyncError extends Error {
 constructor(code){super(code);this.name='SyncError';this.code=code;}
}
export const fail=code=>{throw new SyncError(code);};
export const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
export const exact=(value,keys)=>plain(value)&&Object.keys(value).every(key=>keys.includes(key));
export const opaque=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{8,128}$/.test(value);
export const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export const identifier=value=>typeof value==='string'&&value.length>0&&value.length<=512&&!/[\u0000-\u001f]/.test(value);
export const count=value=>Number.isSafeInteger(value)&&value>=0;
const forbidden=new Set(['__proto__','constructor','prototype']);
export function canonical(value,{maxDepth=32,maxNodes=200000,maxStringChars=4*1024*1024}={}){
 let nodes=0;
 const visit=(v,depth)=>{
  if(++nodes>maxNodes||depth>maxDepth)fail('BNS_VALUE_LIMIT');
  if(v===null||typeof v==='boolean')return v;
  if(typeof v==='string'){
   if(v.length>maxStringChars)fail('BNS_VALUE_LIMIT');
   // TextEncoder silently replaces unpaired UTF-16 surrogates. Refuse, so hashes
   // cannot conflate different source strings or repair user content silently.
   for(let i=0;i<v.length;i++){const c=v.charCodeAt(i);if(c>=0xd800&&c<=0xdbff){const next=v.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))fail('BNS_TEXT_ENCODING');}else if(c>=0xdc00&&c<=0xdfff)fail('BNS_TEXT_ENCODING');}
   return v;
  }
  if(typeof v==='number'){if(!Number.isFinite(v)||Object.is(v,-0))fail('BNS_VALUE_INVALID');return v;}
  if(Array.isArray(v)){if(v.length>maxNodes||Object.keys(v).length!==v.length||Object.getOwnPropertySymbols(v).length)fail('BNS_VALUE_INVALID');for(let i=0;i<v.length;i++)if(!Object.hasOwn(v,i))fail('BNS_VALUE_INVALID');return v.map(item=>visit(item,depth+1));}
  if(!plain(v)||Object.getOwnPropertySymbols(v).length)fail('BNS_VALUE_INVALID');
  const out=Object.create(null);
  for(const key of Object.keys(v).sort()){if(forbidden.has(key))fail('BNS_VALUE_INVALID');out[key]=visit(v[key],depth+1);}
  return out;
 };
 return JSON.stringify(visit(value,0));
}
export const bytes=value=>new TextEncoder().encode(typeof value==='string'?value:canonical(value));
export async function digest(value){const data=value instanceof Uint8Array?value:bytes(value);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export const equal=(a,b)=>canonical(a)===canonical(b);
export const clone=value=>structuredClone(value);
export function decodeJSON(data,limit){
 if(!(data instanceof Uint8Array)||data.byteLength>limit)fail('BNS_DECODE_LIMIT');
 let value;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));}catch{fail('BNS_JSON_INVALID');}
 const encoded=bytes(value);if(encoded.length!==data.length||encoded.some((v,i)=>v!==data[i]))fail('BNS_NONCANONICAL_ENCODING');return value;
}
