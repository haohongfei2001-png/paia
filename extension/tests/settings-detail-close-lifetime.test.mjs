import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {mountSettingsDetail} from '../ui/settings-details.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function fixture(beforeClose){
 const prior=globalThis.document,body=new PresentationNode('body'),queuedCloseEvents=[];
 const make=tag=>{const node=new PresentationNode(tag);if(tag==='dialog'){
  node.showModal=()=>{node.open=true;};
  node.close=()=>{if(!node.open)return;node.open=false;queuedCloseEvents.push(()=>node.listeners.get('close')?.());};
 }return node;};
 globalThis.document={body,documentElement:{lang:'en'},createElement:make,createElementNS:(_ns,tag)=>make(tag)};
 const detail=mountSettingsDetail({id:'synthetic-guarded-detail',title:['恢复','Restore'],content:make('section'),beforeClose});
 const close=detail.dialog.firstElementChild.children[1];body.append(detail.row);
 return {detail,close,open:()=>detail.row.listeners.get('click')(),request:()=>close.listeners.get('click')(),flushClose:()=>{for(const callback of queuedCloseEvents.splice(0))callback();},cleanup:()=>{globalThis.document=prior;}};
}
test('old allowed close cannot dismiss a reopened detail',async()=>{
 const old=deferred(),f=fixture(()=>old.promise);try{f.open();f.request();await tick();f.detail.dialog.close();f.open();old.resolve(true);await tick();assert.equal(f.detail.dialog.open,true,'the old acknowledgement belongs only to the old opening');assert.equal(f.close.disabled,false);}finally{f.cleanup();}
});
test('old rejected close cannot annotate a reopened detail',async()=>{
 const old=deferred(),f=fixture(()=>old.promise);try{f.open();f.request();await tick();f.detail.dialog.close();f.open();old.reject(Error('synthetic old close failure'));await tick();assert.equal(f.close.getAttribute('aria-label'),'Close Restore');assert.equal(f.detail.dialog.open,true);}finally{f.cleanup();}
});
test('reopened detail can request its own guard while prior guard is pending',async()=>{
 const old=deferred(),current=deferred();let calls=0;const f=fixture(()=>++calls===1?old.promise:current.promise);
 try{f.open();f.request();await tick();f.detail.dialog.close();f.open();assert.equal(f.close.disabled,false);f.request();await tick();assert.equal(calls,2);assert.equal(f.close.disabled,true);old.resolve(false);await tick();assert.equal(f.close.disabled,true,'old finally cannot reenable current pending close');assert.equal(f.detail.dialog.open,true);current.resolve(true);await tick();assert.equal(f.detail.dialog.open,false);assert.equal(f.close.disabled,false);}finally{old.resolve(false);current.resolve(false);await tick();f.cleanup();}
});
test('queued old native close event does not release a new pending guard',async()=>{
 const old=deferred(),current=deferred();let calls=0;const f=fixture(()=>++calls===1?old.promise:current.promise);
 try{f.open();f.request();await tick();f.detail.dialog.close();f.open();f.request();await tick();f.flushClose();assert.equal(calls,2);assert.equal(f.close.disabled,true);old.reject(Error('old'));await tick();assert.equal(f.close.disabled,true);assert.equal(f.close.getAttribute('aria-label'),'Close Restore');current.resolve(false);await tick();assert.equal(f.detail.dialog.open,true);assert.equal(f.close.disabled,false);}finally{old.resolve(false);current.resolve(false);await tick();f.cleanup();}
});
test('close superseded before guard microtask does not call old owner for new opening',async()=>{
 let calls=0;const f=fixture(()=>{calls++;return true;});try{f.open();f.request();f.detail.dialog.close();f.open();await tick();assert.equal(calls,0);assert.equal(f.detail.dialog.open,true);f.request();await tick();assert.equal(calls,1);assert.equal(f.detail.dialog.open,false);}finally{f.cleanup();}
});
test('current rejection retains detail and permits explicit retry without duplicating pending guard',async()=>{
 const old=deferred();let calls=0;const f=fixture(()=>++calls===1?old.promise:true);try{f.open();f.request();f.request();await tick();assert.equal(calls,1);old.reject(Error('current'));await tick();assert.match(f.close.getAttribute('aria-label'),/Could not close/);assert.equal(f.close.disabled,false);assert.equal(f.detail.dialog.open,true);f.request();await tick();assert.equal(calls,2);assert.equal(f.detail.dialog.open,false);}finally{f.cleanup();}
});
