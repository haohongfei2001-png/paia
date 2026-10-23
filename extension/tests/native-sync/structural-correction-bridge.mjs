// Test-only replacement of Node's registration/assertion boundary. Original
// owning case bodies and original runtime imports remain unchanged.
const cases=[];
export default function test(name,fn){if(typeof name!=='string'||typeof fn!=='function')throw Error('unexpected test registration');cases.push({name,fn});}
const equal=(a,b)=>{
 if(Object.is(a,b))return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Object.getPrototypeOf(a)!==Object.getPrototypeOf(b)||Array.isArray(a)!==Array.isArray(b))return false;
 if(a instanceof Date||b instanceof Date)return a instanceof Date&&b instanceof Date&&a.getTime()===b.getTime();
 if(!Array.isArray(a)&&Object.getPrototypeOf(a)!==Object.prototype&&Object.getPrototypeOf(a)!==null)throw Error('unsupported native assertion value');
 const ak=Reflect.ownKeys(a),bk=Reflect.ownKeys(b);return ak.length===bk.length&&ak.every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]));
};
const rejected=(error,expected)=>{if(expected===undefined)return;if(typeof expected==='function'){if(expected(error))return;}else if(expected instanceof RegExp){if(expected.test(String(error)))return;}else if(Object.entries(expected).every(([k,v])=>equal(error[k],v)))return;throw Error('unexpected rejection '+error.code+': '+error.message);};
export const assert={
 equal(a,b,label){if(!Object.is(a,b))throw Error(label||'equal');},
 notEqual(a,b,label){if(Object.is(a,b))throw Error(label||'notEqual');},
 deepEqual(a,b,label){if(!equal(a,b))throw Error(label||'deepEqual');},
 ok(value,label){if(!value)throw Error(label||'truthy');},
 match(value,pattern,label){if(typeof value!=='string'||!(pattern instanceof RegExp))throw new TypeError('string and RegExp required');if(!pattern.test(value))throw Error(label||'match');},
 doesNotMatch(value,pattern,label){if(typeof value!=='string'||!(pattern instanceof RegExp))throw new TypeError('string and RegExp required');if(pattern.test(value))throw Error(label||'doesNotMatch');},
 throws(fn,expected){try{fn();}catch(e){rejected(e,expected);return;}throw Error('expected throw');},
 async rejects(fn,expected){try{await(typeof fn==='function'?fn():fn);}catch(e){rejected(e,expected);return;}throw Error('expected rejection');}
};
export async function runCorrectionCases(prefix){
 const selected=cases.filter(c=>c.name.startsWith(prefix)),passed=[];
 for(const item of selected){
  try{await item.fn();passed.push(item.name);}
  catch(e){throw Error(item.name+': '+e.stack);}
  finally{for(const s of globalThis.__contextNativeStores.splice(0)){const name=s.repository.db?.name;await s.repository.close();if(name)await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(name);r.onsuccess=resolve;r.onerror=()=>reject(Error('native cleanup'));r.onblocked=()=>reject(Error('native cleanup blocked'));});}}
 }
 return passed;
}
