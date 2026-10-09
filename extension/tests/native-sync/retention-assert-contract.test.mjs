import test from 'node:test';import nodeAssert from 'node:assert/strict';import nativeAssert from './retention-assert.mjs';
const vectors=[
 ['equal',NaN,NaN],['equal',0,-0],['notEqual',0,-0],['notEqual',NaN,NaN],
 ['deepEqual',[],Object.create(Array.prototype)],['deepEqual',Object.create(Array.prototype),[]],['notDeepEqual',[],Object.create(Array.prototype)],
 ['deepEqual',{a:undefined},{}],['deepEqual',{a:undefined},{a:undefined}],['deepEqual',{b:2,a:1},{a:1,b:2}],
 ['deepEqual',Object.create(null),{}],['deepEqual',Object.assign(Object.create(null),{a:1}),Object.assign(Object.create(null),{a:1})],
 ['deepEqual',[,1],[undefined,1]],['deepEqual',[1,2],[2,1]],['deepEqual',[NaN,-0],[NaN,-0]],['deepEqual',[NaN,-0],[NaN,0]],
 ['notDeepEqual',{a:undefined},{}],['notDeepEqual',{a:1},{a:1}],['ok',1],['ok',false],
 ['deepEqual',new Number(1),new Number(2)],['deepEqual',new Number(NaN),new Number(NaN)],['deepEqual',new Boolean(true),new Boolean(false)],
 ['deepEqual',new Date(0),new Date(0)],['deepEqual',new Date(0),new Date(1)],['deepEqual',/a/i,/a/g],
 ['deepEqual',Object.assign(new Error('x'),{code:'A'}),Object.assign(new Error('x'),{code:'A'})],
 ['throws',()=>{throw Object.assign(new Error('x'),{code:'A'});},{code:'A',message:/^x$/}],
 ['throws',()=>{throw Object.assign(new Error('x'),{code:'B'});},{code:'A'}],
 ['throws',()=>{throw new TypeError('x');},TypeError],['throws',()=>{throw new Error('x');},TypeError],
 ['throws',()=>{throw {code:'A'};},error=>error.code==='A'],['throws',()=>{throw {code:'A'};},()=>1],['throws',()=>{},undefined],
 ['rejects',()=>Promise.reject(Object.assign(new Error('x'),{code:'A'})),{code:'A'}],
 ['rejects',()=>Promise.reject({code:'B'}),{code:'A'}],['rejects',()=>Promise.resolve('x'),undefined],
 ['rejects',()=>Promise.reject(new TypeError('x')),TypeError],['rejects',()=>Promise.reject({code:'A'}),error=>error.code==='A']
];
const outcome=async(assert,method,args)=>{try{await assert[method](...args);return 'PASS';}catch{return 'FAIL';}};
test('native seven-method assertion shim matches original strict assertions on finite conformance vectors',async()=>{
 for(const [method,...args]of vectors)nodeAssert.equal(await outcome(nativeAssert,method,args),await outcome(nodeAssert,method,args),method);
 const symbol=Symbol('x');for(const [a,b]of [[{[symbol]:undefined},{}],[{[symbol]:1},{[symbol]:1}],[[1],Object.assign([1],{extra:2})]])nodeAssert.equal(await outcome(nativeAssert,'deepEqual',[a,b]),await outcome(nodeAssert,'deepEqual',[a,b]));
 const shared={x:1};nodeAssert.equal(await outcome(nativeAssert,'deepEqual',[[shared,shared],[{x:1},{x:1}]]),await outcome(nodeAssert,'deepEqual',[[shared,shared],[{x:1},{x:1}]]));
 const cycA={},cycB={};cycA.self=cycA;cycB.self=cycB;nodeAssert.equal(await outcome(nativeAssert,'deepEqual',[cycA,cycB]),await outcome(nodeAssert,'deepEqual',[cycA,cycB]));
 class A{}class B{};for(const [a,b]of [[new A(),new B()],[new A(),new A()]])nodeAssert.equal(await outcome(nativeAssert,'deepEqual',[a,b]),await outcome(nodeAssert,'deepEqual',[a,b]));
 const proto={kind:'x'};nodeAssert.equal(await outcome(nativeAssert,'deepEqual',[Object.assign(Object.create(proto),{a:1}),{a:1}]),await outcome(nodeAssert,'deepEqual',[Object.assign(Object.create(proto),{a:1}),{a:1}]));
});
