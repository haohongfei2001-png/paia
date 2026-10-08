import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../ui/prompt-surface.js',import.meta.url),'utf8');
function fixture(){
 const pending=[],next={hidden:true,addEventListener(_event,fn){this.click=fn;}},context=vm.createContext({next,busy:false,editing:false,drag:false,composing:false,rpc:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))});
 const start=source.indexOf('async function nextAvailable()'),end=source.indexOf('\n',start);
 assert.ok(start>0&&end>start);
 // Execute the actual UI owner function and its declared request fence, not a
 // test copy of its behavior. Only the asynchronous transport is controlled.
 const declaration=source.match(/let nextAvailabilityEpoch=0;/)?.[0]||'';
 vm.runInContext(declaration+source.slice(start,end),context);
 const clickLine=source.split('\n').find(line=>line.startsWith("next.addEventListener('click'"));vm.runInContext(clickLine,context);
 return {next,pending,read:()=>vm.runInContext('nextAvailable()',context)};
}
for(const outcome of ['available','unavailable','failure'])test('older '+outcome+' cannot overwrite the newest availability',async()=>{
 const f=fixture(),old=f.read(),latest=f.read(),newAvailable=outcome!=='available';
 f.pending[1].resolve({available:newAvailable});await latest;assert.equal(f.next.hidden,!newAvailable);
 if(outcome==='failure')f.pending[0].reject(Error('synthetic unavailable'));else f.pending[0].resolve({available:outcome==='available'});
 await old;assert.equal(f.next.hidden,!newAvailable);
});
test('current failure hides a previously available entry and later current success restores it',async()=>{
 const f=fixture();let p=f.read();f.pending[0].resolve({available:true});await p;assert.equal(f.next.hidden,false);
 p=f.read();f.pending[1].reject(Error('synthetic unavailable'));await p;assert.equal(f.next.hidden,true);
 p=f.read();f.pending[2].resolve({available:true});await p;assert.equal(f.next.hidden,false);
});

test('late reopen rejection cannot hide the newer available entry',async()=>{
 const f=fixture();f.next.click({isTrusted:true});const latest=f.read();f.pending[1].resolve({available:true});await latest;assert.equal(f.next.hidden,false);f.pending[0].reject(Error('old reopen rejected'));await new Promise(resolve=>setImmediate(resolve));assert.equal(f.next.hidden,false);
});
test('current reopen rejection still hides the unavailable entry',async()=>{
 const f=fixture();f.next.hidden=false;f.next.click({isTrusted:true});f.pending[0].reject(Error('current reopen rejected'));await new Promise(resolve=>setImmediate(resolve));assert.equal(f.next.hidden,true);
});
