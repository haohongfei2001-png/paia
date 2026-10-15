import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService} from '../core/context-cards.js';
import {RecoveryDraftStore} from '../core/recovery-draft.js';
import {ContextCardsPage,ContextItemEditor} from '../ui/context-cards.js';
import {RouteHistory,validRoute,routeViews} from '../ui/route-history.js';

const cards=['info','rules','now'];
const names={info:'My Information',rules:'My Rules',now:'My Now'};
const op=()=>crypto.randomUUID();
const put=(card,extra={})=>({kind:'put',operationId:op(),epoch:'initial',itemId:op(),expectedRevision:0,body:`SYNTHETIC ${card} saved body`,section:'SYNTHETIC shared section',card,...extra});
const draft=(change)=>({kind:'context_item',ownerId:change.itemId,epoch:change.epoch,token:change.operationId,sourceRecordIds:[],operation:{type:'PAIA_CONTEXT_CARDS_CHANGE',change}});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};

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

test('white Context Home separates the content heading and fallback from bottom access without Item facts',()=>fixture(async({c,makePage,navigations})=>{
 const page=makePage();await page.open();
 const cards=page.host.querySelectorAll('.context-card');assert.equal(cards.length,4);
 for(const card of cards){
  const heading=card.querySelector('.card-link'),footer=card.querySelector('.card-footer'),access=card.querySelector('.context-access'),entry=card.querySelector('.context-directory-link');
  assert.ok(heading);assert.ok(entry);assert.equal(access.parentElement,footer);assert.equal(heading.contains(access),false);
  assert.equal(card.querySelectorAll('.card-symbol').length,1);assert.equal(card.querySelectorAll('[data-count="'+card.dataset.card+'"]').length,0);
  assert.doesNotMatch(card.textContent,/SYNTHETIC|shared section/);
  assert.equal(access.getAttribute('aria-pressed'),'false');
  entry.onclick();assert.equal(navigations.at(-1),card.dataset.card);
 }
 assert.equal((await c.snapshot()).access.global.enabled,false);
 assert.ok(page.host.querySelector('.context-card').querySelector('.context-directory-link').textContent.includes('View content'));
}));
test('white Context Home empty fallback is truthful and refresh updates the existing control',()=>fixture(async({c,makePage})=>{
 const page=makePage();await page.open();const card=page.host.querySelector('.context-card'),entry=card.querySelector('.context-directory-link');
 assert.match(entry.textContent,/Add content/);await c.change(put('info'));await page.refresh();
 assert.equal(card.querySelector('.context-directory-link'),entry);assert.match(entry.textContent,/View content/);
} ,{seed:false}));
test('white Context Home uses only admitted Home metadata and access never navigates',()=>fixture(async({makePage,calls,navigations,transport,dispatch,c})=>{
 transport.dispatch=async message=>{const result=await dispatch(message);if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT')result.topicChoices={available:true,selectedCount:2,selectedNames:['SYNTHETIC actual Topic A','SYNTHETIC actual Topic B'],remainingSelectedCount:0,externalAllowed:false};return result;};
 const page=makePage();await page.open();
 const requests=calls.filter(call=>call.type==='PAIA_CONTEXT_CARDS_SNAPSHOT');assert.ok(requests.length);assert.ok(requests.every(call=>call.mode==='home'));
 const cards=page.host.querySelectorAll('.context-card'),inputs=cards.find(card=>card.dataset.card==='inputs');assert.match(inputs.textContent,/SYNTHETIC actual Topic A/);
 const serialized=node=>[node.textContent,...node.attributes.values(),...node.children.flatMap(serialized)];
 for(const card of cards.filter(card=>card.dataset.card!=='inputs'))assert.doesNotMatch(serialized(card).join(' '),/SYNTHETIC|shared section/);
 const access=cards[0].querySelector('.context-access');access.onclick();while(page.busy)await tick();
 assert.equal(navigations.length,0);assert.equal((await c.snapshot()).access.info.enabled,true);assert.equal((await c.snapshot()).access.global.enabled,false);
 assert.equal(calls.some(call=>call.type.includes('SEARCH')),false);
 assert.ok(calls.filter(call=>call.type==='PAIA_CONTEXT_CARDS_SNAPSHOT').every(call=>call.mode==='home'));
}));

test('Context Home puts only the real global gate in the independent access bar',()=>fixture(async({makePage,c})=>{
 const page=makePage();await page.open();const head=page.host.querySelector('.context-head'),bar=page.host.querySelector('.context-access-bar');
 assert.ok(bar);assert.equal(head.querySelector('.context-access'),null);const gate=bar.querySelector('.context-access');assert.equal(gate.dataset.key,'global');assert.equal(gate.getAttribute('aria-pressed'),'false');assert.ok(bar.querySelector('.connections-link'));
 assert.equal(page.host.querySelectorAll('.context-switch').length,5);for(const track of page.host.querySelectorAll('.context-switch'))assert.equal(track.getAttribute('aria-hidden'),'true');
 gate.onclick();while(page.busy)await tick();assert.equal((await c.snapshot()).access.global.enabled,true);assert.equal(page.card,null);
 for(const key of ['info','rules','now','inputs'])assert.equal((await c.snapshot()).access[key].enabled,false);
}));
