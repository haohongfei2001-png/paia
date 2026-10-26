// Bounded own-data snapshots for the dormant request-binding boundary.
// No authority, persistence, transport or user-content lookup.
// Descriptors reject accessors without invoking them. As with the existing
// compiler, arbitrary Proxy traps are not a time-bounded sandbox boundary.
// allowUndefined is only for the original ledger's absent optional FX field.
export const integer=n=>Number.isSafeInteger(n)&&n>=0;
export const token=s=>typeof s==='string'&&/^[A-Za-z0-9:._/-]{1,200}$/.test(s);
export const exact=(o,keys,required=keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k))&&required.every(k=>Object.hasOwn(o,k));
const failures=new WeakSet(),encoder=new TextEncoder();
export function stop(reason){const e=Object.freeze({reason});failures.add(e);throw e;}
export const failureReason=e=>failures.has(e)?e.reason:'OWNER_UNAVAILABLE';
export function freeze(v){if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;}
export function snapshot(value,{maxBytes=262144,maxKeys=4096,maxDepth=16,maxString=131072,allowUndefined=false}={}){
 let bytes=0,keys=0;const seen=new WeakSet();
 const charge=n=>{bytes+=n;if(bytes>maxBytes)stop('DATA_BOUND');};
 const string=s=>{if(s.length>maxString)stop('DATA_BOUND');const n=encoder.encode(JSON.stringify(s)).length;if(n>maxString)stop('DATA_BOUND');charge(n);return s;};
 function visit(v,depth){
  if(depth>maxDepth)stop('DATA_BOUND');
  if(v===undefined&&allowUndefined)return v;
  if(v===null||typeof v==='boolean'){charge(5);return v;}
  if(typeof v==='string')return string(v);
  if(typeof v==='number'){if(!Number.isFinite(v))stop('DATA_INVALID');charge(24);return v;}
  if(!v||typeof v!=='object'||seen.has(v))stop('DATA_INVALID');seen.add(v);
  const array=Array.isArray(v);if(!array&&![Object.prototype,null].includes(Object.getPrototypeOf(v)))stop('DATA_INVALID');
  const names=Reflect.ownKeys(v);if(names.length>maxKeys-keys)stop('DATA_BOUND');keys+=names.length;charge(2+names.length);
  if(names.some(k=>typeof k!=='string'))stop('DATA_INVALID');
  let length;
  if(array){const d=Object.getOwnPropertyDescriptor(v,'length');if(!d||!Object.hasOwn(d,'value')||!integer(d.value)||d.value>maxKeys)stop('DATA_BOUND');length=d.value;if(names.length!==length+1||names.some(k=>k!=='length'&&!/^(0|[1-9][0-9]*)$/.test(k)))stop('DATA_INVALID');}
  const out=array?[]:Object.create(null);
  for(const key of names){
   if(array&&key==='length')continue;
   const d=Object.getOwnPropertyDescriptor(v,key);if(!d||!d.enumerable||!Object.hasOwn(d,'value')||array&&Number(key)>=length)stop('DATA_INVALID');
   if(!array)string(key);out[key]=visit(d.value,depth+1);
  }
  return out;
 }
 return visit(value,0);
}

// Deliberately small closed JSON Schema subset. Unsupported schema capabilities
// must be separately implemented/qualified, never silently passed through.
export function boundedSchema(s,depth=0){
 if(depth>8||!s||Array.isArray(s)||typeof s!=='object')stop('SCHEMA_UNAVAILABLE');
 switch(s.type){
 case 'object':{
  if(!exact(s,['type','properties','required','additionalProperties'])||s.additionalProperties!==false||!s.properties||typeof s.properties!=='object'||Array.isArray(s.properties)||!Array.isArray(s.required))stop('SCHEMA_UNAVAILABLE');
  const keys=Object.keys(s.properties);
  if(!keys.length||keys.length>64||keys.some(k=>!token(k))||s.required.length!==keys.length||new Set(s.required).size!==keys.length||s.required.some(k=>!keys.includes(k)))stop('SCHEMA_UNAVAILABLE');
  for(const child of Object.values(s.properties))boundedSchema(child,depth+1);break;
 }
 case 'array':
  if(!exact(s,['type','items','minItems','maxItems'])||!integer(s.minItems)||!integer(s.maxItems)||s.maxItems>256||s.minItems>s.maxItems)stop('SCHEMA_UNAVAILABLE');boundedSchema(s.items,depth+1);break;
 case 'string':
  if(!exact(s,['type','minLength','maxLength','enum'],['type','minLength','maxLength'])||!integer(s.minLength)||!integer(s.maxLength)||s.maxLength>65536||s.minLength>s.maxLength||s.enum!==undefined&&(!Array.isArray(s.enum)||!s.enum.length||s.enum.length>64||new Set(s.enum).size!==s.enum.length||s.enum.some(x=>typeof x!=='string'||x.length<s.minLength||x.length>s.maxLength)))stop('SCHEMA_UNAVAILABLE');break;
 case 'integer':case 'number':
  if(!exact(s,['type','minimum','maximum'])||!Number.isFinite(s.minimum)||!Number.isFinite(s.maximum)||s.minimum>s.maximum||s.type==='integer'&&(!Number.isSafeInteger(s.minimum)||!Number.isSafeInteger(s.maximum)))stop('SCHEMA_UNAVAILABLE');break;
 case 'boolean':case 'null':if(!exact(s,['type']))stop('SCHEMA_UNAVAILABLE');break;
 default:stop('SCHEMA_UNAVAILABLE');
 }
}
