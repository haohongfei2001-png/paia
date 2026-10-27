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
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};

// Same original Context/Recovery owners and shared DOM fixture as local UI
// tests. This is explicit recovery interaction evidence, not native layout.
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

const lists=calls=>calls.filter(c=>c.type==='PAIA_CONTEXT_CARDS_DRAFTS').length;
const mutations=calls=>calls.filter(c=>['PAIA_CONTEXT_CARDS_CHANGE','PAIA_RECOVERY_DRAFT_SAVE','PAIA_RECOVERY_DRAFT_CLEAR'].includes(c.type));
const recoveryNotice=page=>page.host.querySelector('.context-draft-recovery');
const failFirstList=({transport,dispatch})=>{let first=true;transport.dispatch=message=>{if(message.type==='PAIA_CONTEXT_CARDS_DRAFTS'&&first){first=false;throw Object.assign(Error('SYNTHETIC transient draft read failure'),{code:'STORAGE_FAILED'});}return dispatch(message);};};

test('CTX4-02 failed new-draft read is visible and explicit retry restores protected text without writing',()=>fixture(async f=>{
 const {recovery,makePage,calls}=f,change=put('info',{body:'SYNTHETIC protected new Context draft'});await recovery.save(draft(change));failFirstList(f);
 const page=makePage();await page.open('info');const notice=recoveryNotice(page);assert.ok(notice&&!notice.hidden,'draft read refusal needs a visible recovery status');assert.match(notice.textContent,/drafts.*could not be checked/i);const retry=notice.querySelector('button');assert.ok(retry,'failed draft read needs its original explicit retry action');
 await tick();assert.equal(lists(calls),1,'no automatic retry');assert.equal(page.editors.has(change.itemId),false);const stored=await recovery.load('context_item',change.itemId),before=calls.length;
 await retry.onclick();const editor=page.editors.get(change.itemId);assert.ok(editor);assert.equal(editor.local,change.body);assert.equal(editor.field.innerText,change.body);assert.equal(editor.saved.revision,0);assert.equal(editor.fresh,true);assert.equal(editor.recovery.currentToken,change.operationId);assert.equal(lists(calls),2);assert.equal(recoveryNotice(page).hidden,true);assert.equal(mutations(calls.slice(before)).length,0);assert.deepEqual(await recovery.load('context_item',change.itemId),stored);
},{seed:false}));

test('CTX4-02 explicit draft retry is single-flight and an old card completion or button cannot recover elsewhere',()=>fixture(async f=>{
 const {recovery,makePage,calls,transport,dispatch}=f,change=put('info',{body:'SYNTHETIC late info draft'});await recovery.save(draft(change));failFirstList(f);const page=makePage();await page.open('info');const notice=recoveryNotice(page);assert.ok(notice&&!notice.hidden);const retry=notice.querySelector('button'),held=deferred(),entered=deferred();let reads=0;
 transport.dispatch=message=>{if(message.type==='PAIA_CONTEXT_CARDS_DRAFTS'&&++reads===1){entered.resolve();return held.promise;}return dispatch(message);};
 const first=retry.onclick();await entered.promise;const repeat=retry.onclick();assert.equal(lists(calls),2,'same-generation explicit repeat shares the one read');assert.equal(await page.leave(),true);await page.open('rules');const current=page.page,before=lists(calls);assert.equal(page.card,'rules');
 held.resolve([draft(change)]);await Promise.all([first,repeat]);assert.equal(page.page,current);assert.equal(page.editors.has(change.itemId),false);assert.equal(page.host.textContent.includes(change.body),false);assert.equal(recoveryNotice(page).hidden,true);await retry.onclick();assert.equal(lists(calls),before,'detached old-card retry cannot issue another read');assert.equal(mutations(calls).length,0);
},{seed:false}));

test('CTX4-02 retried draft enumeration preserves current unsaved editors and restores only missing new items',()=>fixture(async f=>{
 const {c,recovery,makePage,calls,transport,dispatch}=f,missing=put('info',{body:'SYNTHETIC earlier missing new item'});await recovery.save(draft(missing));failFirstList(f);const page=makePage();await page.open('info');const notice=recoveryNotice(page);assert.ok(notice&&!notice.hidden);const retry=notice.querySelector('button');
 await page.addItem();const fresh=[...page.editors.values()].find(e=>e.fresh),saved=[...page.editors.values()].find(e=>!e.fresh);assert.ok(fresh&&saved);
 fresh.field.innerText='SYNTHETIC newer local fresh draft';fresh.changed();fresh.autosave.cancel();saved.field.innerText='SYNTHETIC current unsaved saved-item edit';saved.changed();saved.autosave.cancel();await Promise.all([fresh.recovery.running,saved.recovery.running]);const oldRows=await dispatch({type:'PAIA_CONTEXT_CARDS_DRAFTS'}),held=deferred(),entered=deferred();
 transport.dispatch=message=>{if(message.type==='PAIA_CONTEXT_CARDS_DRAFTS'){entered.resolve();return held.promise;}return dispatch(message);};const before=calls.length,pending=retry.onclick();await entered.promise;
 fresh.field.innerText='SYNTHETIC typing after retry began';fresh.local=fresh.field.innerText;const freshText=fresh.local,savedText=saved.local;held.resolve(oldRows);await pending;
 assert.equal(page.editors.get(fresh.id),fresh);assert.equal(fresh.local,freshText);assert.equal(fresh.field.innerText,freshText);assert.equal(page.editors.get(saved.id),saved);assert.equal(saved.local,savedText);assert.equal(saved.field.innerText,savedText);assert.equal(page.editors.get(missing.itemId)?.local,missing.body);assert.equal([...page.editors.values()].filter(e=>e.id===fresh.id).length,1);assert.equal(mutations(calls.slice(before)).length,0);assert.equal((await c.snapshot()).items.find(i=>i.id===saved.id).body,saved.saved.body);
}));
