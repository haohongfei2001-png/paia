import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {PromptListSession} from '../core/prompt-family.js';
const source=readFileSync(new URL('../ui/prompt-reuse-test.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const action={version:1,actionId:'11111111-1111-4111-8111-111111111111',operationId:'22222222-2222-4222-8222-222222222222',receiptEpoch:'33333333-3333-4333-8333-333333333333'};
const deferred=()=>{let resolve;return {promise:new Promise(r=>{resolve=r;}),resolve:value=>resolve(value)};};
function fixture({prepare,insert}={}){
 const calls=[],elements=new Map();
 const element=()=>({children:[],dataset:{},listeners:new Map(),value:'',textContent:'',isConnected:false,addEventListener(type,fn){this.listeners.set(type,fn);},append(...items){for(const x of items){x.parent=this;x.isConnected=this.isConnected;this.children.push(x);if(!this.value&&x.value)this.value=x.value;}},replaceChildren(){for(const x of this.children)x.remove();this.children=[];this.value='';},remove(){this.isConnected=false;for(const x of this.children)x.remove();},async click(){return this.listeners.get('click')?.();}});
 for(const id of ['status','prompts','target','refresh']){const x=element();x.isConnected=true;elements.set(id,x);}
 const context={PromptListSession,copyPrompt:async()=>{throw Error('Copy not requested');},document:{getElementById:id=>elements.get(id),createElement:element},chrome:{runtime:{onMessage:{addListener(){}},sendMessage:async request=>{calls.push(structuredClone(request));let data;if(request.type==='PAIA_PROMPT_QUERY')data={items:[{id:'synthetic-source',text:'SYNTHETIC expression'}]};else if(request.type==='PAIA_PROMPT_TARGETS')data=[{id:1,url:'https://chatgpt.com/c/synthetic'}];else if(request.type==='PAIA_PROMPT_INSERT_PREPARE')data=prepare?await prepare:{text:'SYNTHETIC expression',insertionAction:action};else if(request.type==='PAIA_PROMPT_INSERT')data=insert?await insert:{status:'inserted',verified:true};else assert.fail('Unexpected UI command');return {ok:true,data};}}}};
 vm.createContext(context);vm.runInContext(source,context);return {calls,elements,refresh:()=>elements.get('refresh').click(),button:()=>elements.get('prompts').children[0].children[0]};
}
test('original standalone manual UI echoes prepared action and never creates a fresh operation ID',async()=>{
 const f=fixture();await f.refresh();await f.button().click();const request=f.calls.at(-1);assert.equal(request.type,'PAIA_PROMPT_INSERT');assert.deepEqual(request.insertionAction,action);assert.equal(request.operationId,action.operationId);assert.equal(f.elements.get('status').textContent,'Inserted and verified. Not sent.');
});
test('standalone manual explicit refresh while preparation is pending prevents insertion of the old view',async()=>{
 const held=deferred(),f=fixture({prepare:held.promise});await f.refresh();const pending=f.button().click();await f.refresh();held.resolve({text:'SYNTHETIC expression',insertionAction:action});await pending;assert.equal(f.calls.some(x=>x.type==='PAIA_PROMPT_INSERT'),false);assert.match(f.elements.get('status').textContent,/Snapshot ready/);
});
test('standalone manual exact late response cannot repaint a refreshed original view',async()=>{
 const held=deferred(),f=fixture({insert:held.promise});await f.refresh();const pending=f.button().click();for(let n=0;n<5;n++)await Promise.resolve();assert.equal(f.calls.filter(x=>x.type==='PAIA_PROMPT_INSERT').length,1);await f.refresh();held.resolve({status:'inserted',verified:true});await pending;assert.match(f.elements.get('status').textContent,/Snapshot ready/);assert.equal(f.calls.filter(x=>x.type==='PAIA_PROMPT_INSERT').length,1);
});
