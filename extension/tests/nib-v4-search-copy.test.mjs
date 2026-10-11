import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {PromptHistorySession} from '../ui/prompt-history-session.js';
const source=await readFile(new URL('../ui/prompt-surface.js',import.meta.url),'utf8');
const copyFunction=source.slice(source.indexOf('async function copyWhole('),source.indexOf('\nfunction focusRow'));
const invalidation=source.slice(source.indexOf('function invalidateHistoryIntent('),source.indexOf("\nsearchInput.addEventListener('compositionstart'"));
function fixture(){
 const item={id:'synthetic-input',text:'SYNTHETIC exact original body'},calls=[],reads=[],messages=[];
 const state={epoch:1,busy:false,editing:false,composing:false,disposed:false,checking:null,checkingRequest:null,copyRequest:null,searchLoading:false,searchInput:{value:'new query'},history:new PromptHistorySession(()=>{throw Error('Unexpected read');}),items:[item],calls,reads,messages,
  pending(value){state.busy=value;calls.push(['pending',value]);},readSelection(i,range){reads.push({item:i,range});return new Promise((resolve,reject)=>{state.resolve=resolve;state.reject=reject;});},copyPrompt:async text=>{calls.push(['clipboard',text]);return {status:'copied'};},tell:text=>messages.push(text),currentItems:()=>state.items,leaveCheck:()=>{state.checking=null;calls.push(['leaveCheck']);},render:()=>calls.push(['render']),paintHistoryControls:()=>calls.push(['controls']),checkWhole:()=>{throw Error('Unexpected full review');}};
 state.history.items=[item];state.history.target={nonce:'synthetic'};
 const context=vm.createContext(state);vm.runInContext(copyFunction+'\n'+invalidation,context);
 return {state,item,copy:()=>vm.runInContext('copyWhole(items[0],true)',context),invalidate:()=>vm.runInContext('invalidateHistoryIntent()',context)};
}
test('actual UI copy refuses a qualified reader that arrives after the view epoch changes',async()=>{
 const f=fixture(),operation=f.copy();f.state.epoch++;f.state.items=[];f.state.resolve({text:f.item.text});await operation;
 assert.deepEqual(f.state.calls,[['pending',true],['pending',false]]);assert.deepEqual(f.state.messages,[]);
});
test('a newer query immediately clears the active page and old copy cannot release its pending owner',async()=>{
 const f=fixture(),operation=f.copy();f.invalidate();assert.equal(f.state.history.items.length,0);assert.equal(f.state.history.target,null);assert.equal(f.state.history.query,'new query');assert.equal(f.state.history.snapshot,null);
 f.state.busy=true;f.state.calls.length=0;f.state.resolve({text:f.item.text});await operation;assert.equal(f.state.busy,true);assert.deepEqual(f.state.calls,[]);assert.deepEqual(f.state.messages,['']);
});
test('actual reviewed copy retains the original selected offsets and copies only qualified selected text',async()=>{
 const f=fixture(),range={start:10,end:15};f.state.checking={item:f.item,range};const operation=f.copy();assert.equal(f.state.reads[0].range,range);f.state.resolve({text:'exact'});await operation;
 assert.deepEqual(f.state.calls,[['pending',true],['clipboard','exact'],['pending',false]]);assert.equal(f.state.messages.length,1);assert.notEqual(f.state.checking,null);
});
test('original owner refusal clears displayed full text and never copies or substitutes whole text',async()=>{
 const f=fixture();f.state.checking={item:f.item,range:{start:10,end:15}};const operation=f.copy();f.state.reject(Error('MEMORY_STALE'));await operation;
 assert.equal(f.state.checking,null);assert.deepEqual(f.state.calls,[['pending',true],['leaveCheck'],['pending',false]]);assert.equal(f.state.messages.length,1);
});
