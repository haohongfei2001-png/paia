import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService} from '../core/context-cards.js';
import {RecoveryDraftStore} from '../core/recovery-draft.js';
import {ContextCardsPage} from '../ui/context-cards.js';

const cards=['info','rules','now'];
const op=()=>crypto.randomUUID();
const put=(card,extra={})=>({kind:'put',operationId:op(),epoch:'initial',itemId:op(),expectedRevision:0,body:`SYNTHETIC ${card} saved body`,section:'SYNTHETIC shared section',card,...extra});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

// Extend only the shared DOM fixture operations used by the production UI.
// These assertions exercise identity and presentation, not native layout/IME.
class Node extends PresentationNode{
 get childElementCount(){return this.children.length;}
 get innerText(){return this.textContent;}
 set innerText(value){this.textContent=value;}
 querySelectorAll(selector){
  const descendants=this.children.flatMap(child=>[child,...(child.querySelectorAll?.('*')||[])]);
  if(selector==='*')return descendants;
  if(selector.startsWith('.'))return descendants.filter(node=>node.classList.contains(selector.slice(1)));
  const attribute=/^\[([^=]+)="([^"]*)"\]$/.exec(selector);
  if(attribute)return descendants.filter(node=>node.getAttribute(attribute[1])===attribute[2]);
  return descendants.filter(node=>node.tagName.toLowerCase()===selector.toLowerCase());
 }
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 blur(){if(document.activeElement===this)document.activeElement=null;}
 scrollIntoView(){}
}

function localStorage(){
 const values={};
 return {
  async get(keys){if(keys===null)return structuredClone(values);return Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(key=>[key,structuredClone(values[key])]));},
  async set(next){Object.assign(values,structuredClone(next));},
  async remove(keys){for(const key of Array.isArray(keys)?keys:[keys])delete values[key];}
 };
}

async function fixture(run,{seed=true}={}){
 const globals=new Map(['document','chrome'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const {s}=await setup(OrganizerStore);await s.finishFoundation();
 const c=new ContextCardsService(s),recovery=new RecoveryDraftStore(localStorage()),calls=[],navigations=[],pages=[];
 const items=seed?cards.map(card=>put(card)):[];
 for(const item of items)await c.change(item);
 const body=new Node('body'),documentListeners=new Map();
 globalThis.document={addEventListener(type,listener){if(!documentListeners.has(type))documentListeners.set(type,[]);documentListeners.get(type).push(listener);},removeEventListener(type,listener){const listeners=documentListeners.get(type)||[];documentListeners.set(type,listeners.filter(value=>value!==listener));},dispatchEvent(event){for(const listener of documentListeners.get(event.type)||[])listener(event);},body,documentElement:{lang:'en'},activeElement:null,createElement:tag=>new Node(tag),createElementNS:(namespace,tag)=>new Node(tag,namespace)};
 const dispatch=async message=>{
  switch(message.type){
   case 'PAIA_CONTEXT_CARDS_SNAPSHOT':return c.snapshot(message.mode);
   case 'PAIA_CONTEXT_CARDS_CHANGE':return c.change(message.change);
   case 'PAIA_CONTEXT_CARDS_OUTCOME':return c.outcome(message.query);
   case 'PAIA_CONTEXT_CARDS_DRAFTS':return Promise.all((await recovery.list('context_item')).map(item=>recovery.load(item.kind,item.ownerId)));
   case 'PAIA_RECOVERY_DRAFT_LOAD':return recovery.load(message.draft.kind,message.draft.ownerId);
   case 'PAIA_RECOVERY_DRAFT_SAVE':return recovery.save({...message.draft,sourceRecordIds:await c.recoverySources(message.draft)});
   case 'PAIA_RECOVERY_DRAFT_CLEAR':return recovery.clear(message.draft.kind,message.draft.ownerId,message.draft.token);
   default:throw Error('Unexpected synthetic UI request: '+message.type);
  }
 };
 const transport={dispatch};
 globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(structuredClone(message));try{return {ok:true,data:await transport.dispatch(message)};}catch(error){return {ok:false,error:error.code||'STORAGE_FAILED'};}}}};
 const makePage=()=>{const host=new Node('main');body.append(host);const page=new ContextCardsPage({host,onNavigate:card=>navigations.push(card)});pages.push(page);return page;};
 try{await run({s,c,recovery,calls,navigations,items,transport,dispatch,makePage});}
 finally{for(const page of pages)page.close();await tick();for(const [key,value]of globals)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
}

async function edit(editor,text){editor.field.textContent=text;editor.field.listeners.get('input')({});editor.autosave.cancel();if(editor.recovery.running)await editor.recovery.running;}
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
async function heldDelete(f){
 const page=f.makePage();await page.open('rules');await tick();const editor=[...page.editors.values()][0],gate=deferred(),entered=deferred();
 f.transport.dispatch=async message=>{const result=await f.dispatch(message);if(message.type==='PAIA_CONTEXT_CARDS_CHANGE'&&message.change.kind==='delete'){entered.resolve(result);await gate.promise;}return result;};
 const removing=page.remove(editor),ack=await entered.promise;assert.equal(ack.lifecycle,'removed');return {page,editor,gate,removing,ack};
}
const originalItem=(f,id)=>f.s.run(()=>f.s.repository.transaction(false,async t=>(await f.c.row(t)).items.find(item=>item.id===id)));
async function keepNew(f,page,editor,text){
 const before=f.calls.length;await page.keepConflict(editor);await tick();const creates=f.calls.slice(before).filter(m=>m.type==='PAIA_CONTEXT_CARDS_CHANGE');
 assert.equal(creates.length,1);assert.equal(creates[0].change.kind,'put');assert.equal(creates[0].change.expectedRevision,0);assert.notEqual(creates[0].change.itemId,editor.id);
 const items=(await f.c.snapshot()).items.filter(item=>item.card==='rules');assert.equal(items.length,1);assert.equal(items[0].body,text);assert.equal(items[0].id,creates[0].change.itemId);assert.equal((await originalItem(f,editor.id)).lifecycle,'removed');assert.equal(editor.disposed,true);
}

test('CTX4-02 delete ACK retains newer local text until explicit keep-as-new without reviving the removed Item',()=>fixture(async f=>{
 const {page,editor,gate,removing}=await heldDelete(f),text='SYNTHETIC human text written while deletion ACK is pending',before=f.calls.length;
 try{await edit(editor,text);const token=editor.recovery.currentToken;assert.ok(token);assert.equal(editor.recovery.lastFailure.token,token,'the real owner refuses to protect a removed Item');const latest=f.calls.findLast(m=>m.type==='PAIA_RECOVERY_DRAFT_SAVE').draft;await assert.rejects(()=>f.c.recoverySources(latest),{code:'CONTEXT_INVALIDATED'});
  gate.resolve();await removing;assert.equal(page.editors.get(editor.id)===editor,true,'late delete ACK must not retire newer human text');assert.equal(editor.disposed,undefined);assert.equal(editor.local,text);assert.equal(editor.field.innerText,text);assert.equal(editor.conflicted,true);assert.equal(editor.recovery.currentToken,token);assert.equal(f.calls.slice(before).filter(m=>m.type==='PAIA_RECOVERY_DRAFT_CLEAR').length,0);assert.equal(page.journal.undo.length,1);assert.equal(page.deleteCommit.pending,null);assert.equal((await originalItem(f,editor.id)).lifecycle,'removed');assert.match(page.message.textContent,/deleted.*current page.*Keep as new/i);assert.equal(await page.leave(),false);assert.equal(f.calls.slice(before).filter(m=>m.type==='PAIA_CONTEXT_CARDS_CHANGE').length,0,'retaining text does not create or restore any Item');
  await keepNew(f,page,editor,text);
 }finally{gate.resolve();await removing;}
}));

test('CTX4-02 delete ACK retains an active IME and its completed text for explicit keep-as-new',()=>fixture(async f=>{
 const {page,editor,gate,removing}=await heldDelete(f),text='SYNTHETIC 删除期间正在输入';
 try{editor.field.listeners.get('compositionstart')({});editor.field.textContent=text;editor.field.listeners.get('input')({isComposing:true});assert.notEqual(editor.local,text);const before=f.calls.length;
  gate.resolve();await removing;assert.equal(page.editors.get(editor.id)===editor,true);assert.equal(editor.composing,true);assert.equal(editor.field.innerText,text);assert.equal(editor.conflicted,true);assert.equal(f.calls.slice(before).filter(m=>m.type==='PAIA_RECOVERY_DRAFT_CLEAR').length,0);assert.equal(await page.leave(),false);
  editor.field.listeners.get('compositionend')({});editor.autosave.cancel();if(editor.recovery.running)await editor.recovery.running;assert.equal(editor.local,text);assert.ok(editor.recovery.lastFailure,'original removed-Item recovery fence remains closed');assert.equal(await editor.flush(true),false);assert.equal((await originalItem(f,editor.id)).lifecycle,'removed');await keepNew(f,page,editor,text);
 }finally{gate.resolve();await removing;}
}));

test('CTX4-02 unchanged delete still retires its editor and explicit Undo restores original identity and access',()=>fixture(async f=>{
 const {page,editor,gate,removing}=await heldDelete(f),saved=structuredClone(editor.saved),access=(await f.c.snapshot()).access;
 gate.resolve();await removing;assert.equal(page.editors.has(editor.id),false);assert.equal(editor.disposed,true);assert.equal(page.journal.undo.length,1);assert.equal((await originalItem(f,editor.id)).lifecycle,'removed');assert.equal(page.deleteCommit.pending,null);
 await page.undoDelete();const restored=(await f.c.snapshot()).items.find(item=>item.id===editor.id);assert.equal(restored.body,saved.body);assert.equal(restored.revision,saved.revision+2);assert.equal(restored.lifecycle,'active');assert.equal(restored.deletedBy,null);assert.equal(page.journal.undo.length,0);assert.deepEqual((await f.c.snapshot()).access,access);assert.equal(f.calls.filter(m=>m.type==='PAIA_CONTEXT_CARDS_CHANGE').length,2);
}));
