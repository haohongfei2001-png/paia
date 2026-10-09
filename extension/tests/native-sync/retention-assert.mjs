// Test-only strict assertions shared by Node differential checks and temporary
// native workers. No production module imports this file.
let calls=0;
export const assertionCount=()=>calls;
const enumerableKeys=value=>Reflect.ownKeys(value).filter(key=>Object.prototype.propertyIsEnumerable.call(value,key));
const builtinConstructors=new Set([Object,Array,Date,RegExp,Error,TypeError,RangeError,ArrayBuffer,DataView,Number,String,Boolean,Map,Set,WeakMap,WeakSet,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,Float32Array,Float64Array]);
const sameData=(a,b,pairs=new Map())=>{
 if(Object.is(a,b))return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b)||ArrayBuffer.isView(a)!==ArrayBuffer.isView(b))return false;
 // Match Node 26 strict comparison: inherited/builtin constructor identity,
 // with exact prototype fallback for constructor-less or own custom values.
 const constructor=a.constructor;
 if(builtinConstructors.has(constructor)||(constructor!==undefined&&!Object.hasOwn(a,'constructor'))){if(constructor!==b.constructor)return false;}
 else if(Object.getPrototypeOf(a)!==Object.getPrototypeOf(b))return false;
 if(pairs.has(a))return pairs.get(a)===b;pairs.set(a,b);
 try{
 if(Array.isArray(a)&&a.length!==b.length)return false;
 if(a instanceof Number&&!Object.is(Number.prototype.valueOf.call(a),Number.prototype.valueOf.call(b)))return false;
 if(a instanceof Boolean&&!Object.is(Boolean.prototype.valueOf.call(a),Boolean.prototype.valueOf.call(b)))return false;
 if(a instanceof String&&!Object.is(String.prototype.valueOf.call(a),String.prototype.valueOf.call(b)))return false;
 if(a instanceof Date&&!Object.is(a.getTime(),b.getTime()))return false;
 if(a instanceof RegExp&&(a.source!==b.source||a.flags!==b.flags||a.lastIndex!==b.lastIndex))return false;
 if(a instanceof Error&&(a.name!==b.name||a.message!==b.message||!sameData(a.cause,b.cause,pairs)))return false;
 if(a instanceof Map||a instanceof Set||a instanceof WeakMap||a instanceof WeakSet)throw Error('Unsupported native assertion value');
 if(ArrayBuffer.isView(a)){if(a.byteLength!==b.byteLength)return false;const x=new Uint8Array(a.buffer,a.byteOffset,a.byteLength),y=new Uint8Array(b.buffer,b.byteOffset,b.byteLength);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;}
 if(a instanceof ArrayBuffer){if(a.byteLength!==b.byteLength)return false;const x=new Uint8Array(a),y=new Uint8Array(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;}
 const x=enumerableKeys(a),y=enumerableKeys(b);if(x.length!==y.length)return false;
 for(const key of x)if(!y.includes(key)||!sameData(a[key],b[key],pairs))return false;
 return true;
 }finally{pairs.delete(a);}
};
class NativeAssertionError extends Error{constructor(operator,message){super(message||'Native strict assertion failed: '+operator);this.name='AssertionError';this.code='ERR_ASSERTION';this.operator=operator;}}
const fail=(operator,message)=>{throw new NativeAssertionError(operator,message);};
const match=(error,expected)=>{
 if(expected===undefined)return true;
 if(expected instanceof RegExp)return expected.test(String(error));
 if(typeof expected==='function')return expected===Error||expected.prototype instanceof Error?error instanceof expected:expected(error)===true;
 if(expected&&typeof expected==='object'){
  const keys=enumerableKeys(expected);if(!keys.length)throw new TypeError('Empty expected error is unsupported');
  return keys.every(key=>key in Object(error)&&(expected[key] instanceof RegExp?typeof error[key]==='string'&&expected[key].test(error[key]):sameData(error[key],expected[key])));
 }
 throw new TypeError('Invalid expected error');
};
const assert={
 equal(actual,expected,message){calls++;if(!Object.is(actual,expected))fail('strictEqual',message);},
 notEqual(actual,expected,message){calls++;if(Object.is(actual,expected))fail('notStrictEqual',message);},
 deepEqual(actual,expected,message){calls++;if(!sameData(actual,expected))fail('deepStrictEqual',message);},
 notDeepEqual(actual,expected,message){calls++;if(sameData(actual,expected))fail('notDeepStrictEqual',message);},
 ok(value,message){calls++;if(!value)fail('ok',message);},
 throws(fn,expected,message){calls++;let caught=false,error;try{fn();}catch(value){caught=true;error=value;}if(!caught||!match(error,expected))fail('throws',message);return error;},
 async rejects(value,expected,message){calls++;let caught=false,error;try{await(typeof value==='function'?value():value);}catch(reason){caught=true;error=reason;}if(!caught||!match(error,expected))fail('rejects',message);}
};
export default assert;
