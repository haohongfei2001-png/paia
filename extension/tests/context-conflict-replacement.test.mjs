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
const draft=(change)=>({kind:'context_item',ownerId:change.itemId,epoch:change.epoch,token:change.operationId,sourceRecordIds:[],operation:{type:'PAIA_CONTEXT_CARDS_CHANGE',change}});
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
   case 'PAIA_RECOVERY_DRAFT_SAVE':return recovery.save(message.draft);
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
async function failedReplacement(f){
 const {c,makePage,transport,dispatch}=f,page=makePage();await page.open('rules');await tick();const original=[...page.editors.values()][0];
 await c.change({kind:'put',operationId:op(),epoch:page.snapshot.epoch,itemId:original.id,expectedRevision:original.saved.revision,body:'SYNTHETIC concurrently saved Rules',section:original.saved.section,card:'rules'});
 await edit(original,'SYNTHETIC original human conflict');assert.equal(await original.flush(),false);assert.equal(original.conflicted,true,'original owner produced a real revision conflict');
 transport.dispatch=message=>{if(message.type==='PAIA_CONTEXT_CARDS_CHANGE'||message.type==='PAIA_CONTEXT_CARDS_OUTCOME')throw Object.assign(Error('SYNTHETIC replacement outcome unavailable'),{code:'STORAGE_FAILED'});return dispatch(message);};
 await page.keepConflict(original);const replacement=original.replacement;assert.ok(replacement);if(replacement.recovery.running)await replacement.recovery.running;assert.equal(replacement.failed,true);assert.ok(replacement.commit.pending);assert.equal(page.editors.get(original.id),original);return {page,original,replacement,pending:structuredClone(replacement.commit.pending)};
}
const writes=calls=>calls.filter(m=>['PAIA_CONTEXT_CARDS_CHANGE','PAIA_RECOVERY_DRAFT_SAVE','PAIA_RECOVERY_DRAFT_CLEAR'].includes(m.type));

test('CTX4-02 keep-as-new retry preserves independently edited replacement and both protected drafts',()=>fixture(async f=>{
 const {page,original,replacement,pending}=await failedReplacement(f),{recovery,calls,c,transport,dispatch}=f,text='SYNTHETIC newer human replacement wording';await edit(replacement,text);
 const oldDraft=await recovery.load('context_item',original.id),newDraft=await recovery.load('context_item',replacement.id),saved=await c.snapshot(),before=calls.length;transport.dispatch=dispatch;
 await page.keepConflict(original);if(replacement.recovery.running)await replacement.recovery.running;
 assert.equal(replacement.field.innerText,text,'retrying the original conflict must not replace newer human text');assert.equal(replacement.local,text);assert.equal(page.editors.get(original.id),original);assert.equal(page.editors.get(replacement.id),replacement);assert.deepEqual(replacement.commit.pending,pending);assert.deepEqual(await recovery.load('context_item',original.id),oldDraft);assert.deepEqual(await recovery.load('context_item',replacement.id),newDraft);assert.deepEqual(await c.snapshot(),saved);assert.equal(writes(calls.slice(before)).length,0);assert.match(page.message.textContent,/review.*new item/i);
}));

test('CTX4-02 keep-as-new retry does not replace an active replacement IME composition',()=>fixture(async f=>{
 const {page,original,replacement,pending}=await failedReplacement(f),{recovery,calls,c,transport,dispatch}=f,text='SYNTHETIC 正在输入的新条目';replacement.field.listeners.get('compositionstart')({});replacement.field.textContent=text;replacement.field.listeners.get('input')({isComposing:true});assert.equal(replacement.composing,true);assert.equal(replacement.local,original.local,'IME text has not yet replaced the committed editor buffer');
 const before=calls.length,oldDraft=await recovery.load('context_item',original.id),newDraft=await recovery.load('context_item',replacement.id),saved=await c.snapshot();transport.dispatch=dispatch;await page.keepConflict(original);
 assert.equal(replacement.field.innerText,text);assert.equal(replacement.composing,true);assert.equal(page.editors.get(original.id),original);assert.deepEqual(replacement.commit.pending,pending);assert.deepEqual(await recovery.load('context_item',original.id),oldDraft);assert.deepEqual(await recovery.load('context_item',replacement.id),newDraft);assert.deepEqual(await c.snapshot(),saved);assert.equal(writes(calls.slice(before)).length,0);assert.match(page.message.textContent,/review.*new item/i);
}));

test('CTX4-02 unchanged keep-as-new retry keeps the original pending operation and clears only after its ACK',()=>fixture(async f=>{
 const {page,original,replacement,pending}=await failedReplacement(f),{recovery,calls,c,transport,dispatch}=f,body=original.local,before=calls.length;transport.dispatch=dispatch;await page.keepConflict(original);await tick();
 const sent=calls.slice(before).filter(m=>m.type==='PAIA_CONTEXT_CARDS_CHANGE');assert.equal(sent.length,1);assert.deepEqual(sent[0].change,pending.change);assert.equal(sent[0].change.itemId,replacement.id);assert.equal(sent[0].change.operationId,pending.change.operationId);assert.equal(replacement.commit.pending,null);assert.equal(replacement.saved.body,body);assert.equal(original.disposed,true);assert.notEqual(page.editors.get(original.id),original);assert.equal(page.editors.get(original.id).local,'SYNTHETIC concurrently saved Rules');assert.equal(page.editors.get(original.id).conflicted,false);assert.equal(await recovery.load('context_item',original.id),null);const saved=await c.snapshot(),created=saved.items.filter(i=>i.card==='rules'&&i.id!==original.id);assert.equal(created.length,1);assert.equal(created[0].id,replacement.id);assert.equal(created[0].body,body);const outcome=await c.outcome({operationId:pending.change.operationId,digest:pending.digest,epoch:pending.change.epoch});assert.equal(outcome.state,'committed');assert.equal(outcome.result.itemId,replacement.id);assert.ok(calls.slice(before).some(m=>m.type==='PAIA_RECOVERY_DRAFT_CLEAR'&&m.draft.ownerId===original.id));
}));
