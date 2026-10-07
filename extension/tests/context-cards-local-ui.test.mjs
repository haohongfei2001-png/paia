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
 const body=new Node('body');
 globalThis.document={body,documentElement:{lang:'en'},activeElement:null,createElement:tag=>new Node(tag),createElementNS:(namespace,tag)=>new Node(tag,namespace)};
 const dispatch=async message=>{
  switch(message.type){
   case 'PAIA_CONTEXT_CARDS_SNAPSHOT':return c.snapshot();
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

for(const card of cards)test(`CTX4-02 ${card} editor operation binds its saved identity instead of the surrounding route`,()=>fixture(async({c,makePage,calls})=>{
 const page=makePage();page.snapshot=await c.snapshot();page.card=cards.find(value=>value!==card);
 const saved=page.snapshot.items.find(item=>item.card===card),editor=new ContextItemEditor(page,saved,{fresh:true});
 page.editors.set(saved.id,editor);
 editor.local='SYNTHETIC exact new human body';
 const change=editor.operation();
 assert.equal(change.card,card);
 assert.equal(change.itemId,saved.id);
 assert.equal(change.expectedRevision,saved.revision);
 assert.equal(change.section,saved.section);
 assert.equal(change.body,editor.local);
 assert.equal(editor.field.getAttribute('aria-label'),names[card]);
 page.card='connections';
 assert.deepEqual(editor.operation(),change,'route changes cannot replace the stable editor operation');
 assert.equal(calls.length,0);
}));

test('CTX4-02 legacy editor identity without card still saves as info',()=>fixture(async({c,makePage})=>{
 const page=makePage();page.snapshot=await c.snapshot();page.card='rules';
 const item={...page.snapshot.items.find(value=>value.card==='info')};delete item.card;
 const editor=new ContextItemEditor(page,item,{fresh:true});page.editors.set(item.id,editor);
 assert.equal(editor.operation().card,'info');
}));

for(const card of cards)test(`CTX4-02 ${card} render and refresh mount only their card and preserve dirty local text`,()=>fixture(async({c,makePage})=>{
 const page=makePage();await page.open(card);await tick();
 assert.equal(page.host.querySelector('h1').textContent,names[card]);
 assert.deepEqual([...page.editors.values()].map(editor=>editor.saved.card),[card]);
 const editor=[...page.editors.values()][0];
 editor.local='SYNTHETIC locally unsaved text';editor.field.textContent=editor.local;
 for(const value of cards)await c.change(put(value,{body:`SYNTHETIC ${value} second Item`}));
 await page.refresh();await tick();
 assert.equal(page.editors.size,2);
 assert.equal(page.editors.get(editor.id),editor);
 assert.equal(editor.field.textContent,'SYNTHETIC locally unsaved text');
 assert.ok([...page.editors.values()].every(value=>value.saved.card===card));
 assert.equal(page.host.querySelectorAll('.context-item').length,2);
 for(const other of cards.filter(value=>value!==card))assert.equal(page.host.textContent.includes(`SYNTHETIC ${other} second Item`),false);
 const clean=[...page.editors.values()].find(value=>value!==editor);
 await c.change({kind:'delete',operationId:op(),epoch:'initial',itemId:clean.id,expectedRevision:clean.saved.revision});
 await page.refresh();
 assert.deepEqual([...page.editors.keys()],[editor.id]);
 assert.equal(page.empty.hidden,true);
}));

test('CTX4-02 failed Rules-to-Now navigation removes the old card and retry loads only Now',()=>fixture(async({c,makePage,transport,dispatch,calls})=>{
 const page=makePage();await page.open('rules');await tick();
 const original=[...page.editors.values()][0],before=await c.snapshot();
 assert.equal(original.saved.card,'rules');
 assert.equal(await page.leave(),true,'the current page authorizes leaving before changing the route');
 const firstFailedCall=calls.length;
 transport.dispatch=message=>{if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT')throw Object.assign(Error('SYNTHETIC target read failure'),{code:'STORAGE_FAILED'});return dispatch(message);};
 await page.open('now');await tick();
 assert.equal(page.card,'now');
 assert.equal(page.page,null);
 assert.equal(page.editors.size,0,'Rules editors must not remain attached to the failed Now route');
 assert.equal(original.root.isConnected,false);
 assert.equal(original.surface.controller.signal.aborted,true);
 assert.equal(page.host.textContent.includes(original.saved.body),false);
 assert.equal(page.host.querySelectorAll('.context-item').length,0);
 assert.ok(page.host.querySelector('.context-load-failed'));
 assert.equal(page.host.querySelector('h1').textContent,'My Now');
 assert.equal(page.host.querySelector('[role="status"]').textContent,'Local Context could not be loaded.');
 assert.equal(calls.slice(firstFailedCall).some(call=>call.type==='PAIA_CONTEXT_CARDS_DRAFTS'),false,'failed route has no page into which fresh recovery can mount');
 const retry=page.host.querySelectorAll('button').find(button=>button.textContent==='Retry');
 assert.ok(retry);
 transport.dispatch=dispatch;
 const actualOpen=page.open.bind(page);let retryTask;
 page.open=card=>{retryTask=actualOpen(card);return retryTask;};
 retry.onclick();assert.ok(retryTask);await retryTask;await tick();
 assert.equal(page.host.querySelector('h1').textContent,'My Now');
 assert.equal(page.host.querySelector('.context-load-failed'),null);
 assert.equal(page.editors.size,1);
 assert.ok([...page.editors.values()].every(editor=>editor.saved.card==='now'));
 assert.equal(page.editors.has(original.id),false);
 assert.equal(page.host.textContent.includes(original.saved.body),false);
 assert.equal(original.saved.card,'rules','failed navigation never reclassifies the old Item');
 assert.equal(calls.some(call=>call.type==='PAIA_CONTEXT_CARDS_CHANGE'),false);
 assert.deepEqual(await c.snapshot(),before);
}));

test('CTX4-02 same-page Rules refresh failure retains the exact dirty editor and protected draft',()=>fixture(async({c,recovery,makePage,transport,dispatch,calls})=>{
 const page=makePage();await page.open('rules');await tick();
 const original=[...page.editors.values()][0],root=original.root,field=original.field,saved=structuredClone(original.saved);
 const text='SYNTHETIC exact unsaved Rules text\nsecond line';
 field.textContent=text;original.changed();original.autosave.cancel();
 if(original.recovery.running)await original.recovery.running;
 assert.equal(original.dirty(),true);
 transport.dispatch=message=>{if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT')throw Object.assign(Error('SYNTHETIC in-place read failure'),{code:'STORAGE_FAILED'});return dispatch(message);};
 await page.refresh();await tick();
 assert.equal(page.card,'rules');
 assert.equal(page.host.querySelector('h1').textContent,'My Rules');
 assert.equal(page.editors.get(original.id),original);
 assert.equal(original.root,root);
 assert.equal(original.field,field);
 assert.equal(root.isConnected,true);
 assert.equal(original.surface.controller.signal.aborted,false);
 assert.equal(original.local,text);
 assert.equal(field.textContent,text);
 assert.deepEqual(original.saved,saved);
 assert.equal(original.dirty(),true);
 assert.equal(page.host.querySelector('.context-load-failed'),null);
 assert.match(page.message.textContent,/Could not refresh\. Your current text is retained\./);
 assert.equal((await recovery.load('context_item',original.id)).operation.change.body,text);
 assert.equal((await c.snapshot()).items.find(item=>item.id===original.id).body,saved.body);
 assert.equal(calls.some(call=>call.type==='PAIA_CONTEXT_CARDS_CHANGE'),false);
}));

for(const state of ['dirty','composing'])test(`CTX4-02 leave rechecks an earlier ${state} Rules editor after a later held save`,()=>fixture(async({c,recovery,makePage,transport,dispatch})=>{
 await c.change(put('rules',{body:'SYNTHETIC second Rules editor'}));
 const page=makePage();await page.open('rules');await tick();
 const [first,second]=[...page.editors.values()],held=deferred(),entered=deferred();
 second.field.textContent='SYNTHETIC later editor committed change';second.changed();second.autosave.cancel();
 if(second.recovery.running)await second.recovery.running;
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_CARDS_CHANGE'&&message.change.itemId===second.id){entered.resolve();await held.promise;}return dispatch(message);};
 const leaving=page.leave();await entered.promise;
 const text=`SYNTHETIC earlier editor ${state} text`;
 if(state==='composing'){
  first.field.listeners.get('compositionstart')({});first.field.textContent=text;first.field.listeners.get('input')({isComposing:true});
  assert.equal(first.dirty(),false,'composition can precede the next committed input event');
 }else{first.field.textContent=text;first.changed();first.autosave.cancel();if(first.recovery.running)await first.recovery.running;}
 held.resolve();
 assert.equal(await leaving,false);
 assert.equal(page.page.inert,false);
 assert.equal(page.editors.get(first.id),first);
 assert.equal(first.root.isConnected,true);
 assert.equal(first.field.textContent,text);
 assert.equal(page.leaveBlocked,true);
 assert.match(page.message.textContent,/Unsaved text is retained on this page\./);
 assert.equal((await c.snapshot()).items.find(item=>item.id===first.id).body,first.saved.body);
 assert.equal((await c.snapshot()).items.find(item=>item.id===second.id).body,'SYNTHETIC later editor committed change');
 if(state==='composing'){assert.equal(first.composing,true);first.field.listeners.get('compositionend')({});first.autosave.cancel();if(first.recovery.running)await first.recovery.running;}
 assert.equal((await recovery.load('context_item',first.id)).operation.change.body,text);
}));

test('CTX4-02 successful leave locks the entire outgoing page and invalidates pending opens before returning',()=>fixture(async({makePage})=>{
 const page=makePage();await page.open('rules');await tick();
 const outgoing=page.page,generation=page.openGeneration,editor=[...page.editors.values()][0];
 assert.equal(outgoing.inert,false);
 assert.equal(await page.leave(),true);
 assert.equal(outgoing.inert,true);
 assert.ok(page.openGeneration>generation);
 assert.equal(outgoing.contains(editor.field),true);
 assert.equal(outgoing.contains(page.host.querySelector('.context-access')),true);
 assert.equal(outgoing.contains(page.host.querySelector('.context-back')),true);
 assert.equal(outgoing.contains(page.add),true);
 assert.equal(editor.root.isConnected,true,'the outgoing content stays visibly mounted but inert until destination resolution');
}));

for(const outcome of ['success','failure'])test(`CTX4-02 held destination ${outcome} replaces the locked outgoing card`,()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage();await page.open('rules');await tick();
 const outgoing=page.page,held=deferred(),entered=deferred();
 assert.equal(await page.leave(),true);
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'){entered.resolve();await held.promise;if(outcome==='failure')throw Object.assign(Error('SYNTHETIC held target failure'),{code:'STORAGE_FAILED'});}return dispatch(message);};
 const opening=page.open('now');await entered.promise;
 assert.equal(page.page,outgoing);
 assert.equal(outgoing.inert,true);
 assert.equal(outgoing.isConnected,true);
 held.resolve();await opening;await tick();
 assert.equal(outgoing.isConnected,false);
 assert.equal(page.host.querySelector('h1').textContent,'My Now');
 assert.equal(document.activeElement,page.host.querySelector('h1'));
 if(outcome==='success'){
  assert.notEqual(page.page,outgoing);assert.equal(page.page.inert,false);
  assert.ok([...page.editors.values()].every(editor=>editor.saved.card==='now'));
 }else{
  assert.equal(page.page,null);assert.equal(page.editors.size,0);
  assert.equal(Boolean(page.host.querySelector('.context-load-failed').inert),false);
  assert.ok(page.host.querySelectorAll('button').some(button=>button.textContent==='Retry'));
 }
}));

for(const outcome of ['success','failure'])test(`CTX4-02 superseded same-card snapshot ${outcome} cannot thaw a newer held transition`,()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage();await page.open('rules');await tick();
 const outgoing=page.page,oldRead=deferred(),newRead=deferred(),oldEntered=deferred(),newEntered=deferred();let snapshots=0;
 transport.dispatch=async message=>{
  if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'){
   if(++snapshots===1){oldEntered.resolve();await oldRead.promise;if(outcome==='failure')throw Object.assign(Error('SYNTHETIC stale read failure'),{code:'STORAGE_FAILED'});}
   else if(snapshots===2){newEntered.resolve();await newRead.promise;}
  }
  return dispatch(message);
 };
 const stale=page.open('rules');await oldEntered.promise;
 assert.equal(await page.leave(),true);
 const current=page.open('now');await newEntered.promise;
 oldRead.resolve();await stale;
 assert.equal(page.card,'now');assert.equal(page.page,outgoing);assert.equal(outgoing.inert,true);
 assert.equal(page.host.querySelector('.context-load-failed'),null);
 newRead.resolve();await current;await tick();
 assert.equal(page.host.querySelector('h1').textContent,'My Now');assert.equal(page.page.inert,false);
 assert.ok([...page.editors.values()].every(editor=>editor.saved.card==='now'));
}));

test('CTX4-02 heading focus precedes recovery and stale same-card recovery cannot thaw or mount during reopening',()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage(),oldDrafts=deferred(),draftsEntered=deferred(),newRead=deferred(),readEntered=deferred();let snapshots=0;
 const change=put('rules',{body:'SYNTHETIC superseded same-card draft'});
 transport.dispatch=async message=>{
  if(message.type==='PAIA_CONTEXT_CARDS_DRAFTS'){draftsEntered.resolve();return oldDrafts.promise;}
  if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'&&++snapshots===2){readEntered.resolve();await newRead.promise;}
  return dispatch(message);
 };
 const stale=page.open('rules');await draftsEntered.promise;
 const outgoing=page.page;
 assert.equal(document.activeElement,page.host.querySelector('h1'),'heading focus must not wait for draft enumeration');
 assert.equal(await page.leave(),true);
 const current=page.open('rules');await readEntered.promise;
 oldDrafts.resolve([draft(change)]);await stale;
 assert.equal(page.page,outgoing);assert.equal(outgoing.inert,true);
 assert.equal(page.editors.has(change.itemId),false);
 assert.equal(page.host.textContent.includes(change.body),false);
 newRead.resolve();await current;
 assert.equal(page.page,outgoing);assert.equal(outgoing.inert,false);
 assert.equal(page.editors.has(change.itemId),false);
}));

test('CTX4-02 close and same-card reopen reject recovery from the prior open generation',()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage(),held=deferred(),entered=deferred();let lists=0;
 const change=put('rules',{body:'SYNTHETIC pre-close recovery body'});
 transport.dispatch=message=>{if(message.type==='PAIA_CONTEXT_CARDS_DRAFTS'&&++lists===1){entered.resolve();return held.promise;}return dispatch(message);};
 const stale=page.open('rules');await entered.promise;
 const oldPage=page.page,generation=page.openGeneration;page.close();
 assert.ok(page.openGeneration>generation);
 await page.open('rules');await tick();
 const current=page.page,heading=page.host.querySelector('h1');
 assert.notEqual(current,oldPage);
 held.resolve([draft(change)]);await stale;
 assert.equal(page.page,current);assert.equal(current.inert,false);
 assert.equal(page.editors.has(change.itemId),false);
 assert.equal(page.host.textContent.includes(change.body),false);
 assert.equal(document.activeElement,heading);
}));

for(const outcome of ['success','failure'])test(`CTX4-02 close rejects a held initial snapshot ${outcome} without reopening or recovering`,()=>fixture(async({makePage,transport,dispatch,calls})=>{
 const page=makePage(),held=deferred(),entered=deferred();
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'){entered.resolve();await held.promise;if(outcome==='failure')throw Object.assign(Error('SYNTHETIC closed read failure'),{code:'STORAGE_FAILED'});}return dispatch(message);};
 const opening=page.open('rules');await entered.promise;page.close();held.resolve();await opening;
 assert.equal(page.active,false);assert.equal(page.page,null);assert.equal(page.editors.size,0);
 assert.equal(page.host.children.length,0);
 assert.equal(calls.some(call=>call.type==='PAIA_CONTEXT_CARDS_DRAFTS'),false);
}));

test('CTX4-02 outer navigation failure before Context open replaces the locked page and retries the selected card',()=>fixture(async({c,makePage,calls})=>{
 const page=makePage();await page.open('rules');await tick();
 const outgoing=page.page,original=[...page.editors.values()][0],before=await c.snapshot();
 assert.equal(await page.leave(),true);
 page.card='now';
 const openGeneration=page.openGeneration,readGeneration=page.readGeneration,callCount=calls.length;
 page.finishNavigation();
 assert.ok(page.openGeneration>openGeneration);assert.ok(page.readGeneration>readGeneration);
 assert.equal(calls.length,callCount,'outer failure recovery must not dispatch an implicit write or load');
 assert.equal(page.card,'now');assert.equal(page.page,null);assert.equal(page.editors.size,0);
 assert.equal(outgoing.isConnected,false);assert.equal(original.surface.controller.signal.aborted,true);
 const failure=page.host.querySelector('.context-load-failed');
 assert.ok(failure);assert.equal(Boolean(failure.inert),false);
 assert.equal(page.host.querySelector('h1').textContent,'My Now');
 assert.equal(page.host.textContent.includes(original.saved.body),false);
 const retry=page.host.querySelectorAll('button').find(button=>button.textContent==='Retry'),actualOpen=page.open.bind(page);let retryTask;
 page.open=card=>{retryTask=actualOpen(card);return retryTask;};
 retry.onclick();assert.ok(retryTask);await retryTask;await tick();
 assert.equal(page.page.inert,false);assert.equal(page.host.querySelector('.context-load-failed'),null);
 assert.equal(page.host.querySelector('h1').textContent,'My Now');
 assert.ok([...page.editors.values()].every(editor=>editor.saved.card==='now'));
 assert.equal(page.editors.has(original.id),false);
 assert.deepEqual(await c.snapshot(),before);
}));

test('CTX4-02 navigation finalizer is a no-op for a live non-inert page with dirty Rules text',()=>fixture(async({recovery,makePage,calls})=>{
 const page=makePage();await page.open('rules');await tick();
 const panel=page.page,editor=[...page.editors.values()][0],text='SYNTHETIC dirty text preserved by finalizer';
 editor.field.textContent=text;editor.changed();editor.autosave.cancel();if(editor.recovery.running)await editor.recovery.running;
 const openGeneration=page.openGeneration,readGeneration=page.readGeneration,callCount=calls.length;
 assert.equal(panel.inert,false);page.finishNavigation();
 assert.equal(page.page,panel);assert.equal(panel.inert,false);assert.equal(panel.isConnected,true);
 assert.equal(page.openGeneration,openGeneration);assert.equal(page.readGeneration,readGeneration);
 assert.equal(calls.length,callCount);
 assert.equal(page.editors.get(editor.id),editor);assert.equal(editor.surface.controller.signal.aborted,false);
 assert.equal(editor.local,text);assert.equal(editor.field.textContent,text);assert.equal(editor.dirty(),true);
 assert.equal(page.host.querySelector('.context-load-failed'),null);
 assert.equal((await recovery.load('context_item',editor.id)).operation.change.body,text);
}));

for(const outcome of ['success','failure'])test(`CTX4-02 outer navigation finalizer invalidates a pending destination ${outcome}`,()=>fixture(async({makePage,transport,dispatch,calls})=>{
 const page=makePage();await page.open('rules');await tick();assert.equal(await page.leave(),true);
 const held=deferred(),entered=deferred();
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'){entered.resolve();await held.promise;if(outcome==='failure')throw Object.assign(Error('SYNTHETIC finalized stale failure'),{code:'STORAGE_FAILED'});}return dispatch(message);};
 const opening=page.open('now');await entered.promise;
 page.finishNavigation();const failure=page.host.querySelector('.context-load-failed'),callCount=calls.length;
 assert.ok(failure);
 held.resolve();await opening;await tick();
 assert.equal(page.host.querySelector('.context-load-failed'),failure,'late response cannot replace the explicit target retry state');
 assert.equal(page.host.querySelector('h1').textContent,'My Now');assert.equal(Boolean(failure.inert),false);
 assert.equal(page.page,null);assert.equal(page.editors.size,0);
 assert.equal(calls.slice(callCount).some(call=>call.type==='PAIA_CONTEXT_CARDS_DRAFTS'),false);
}));

test('CTX4-02 failed home retry focuses the new heading instead of a detached Retry button',()=>fixture(async({makePage,transport,dispatch,calls})=>{
 const page=makePage();
 transport.dispatch=message=>{if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT')throw Object.assign(Error('SYNTHETIC home read failure'),{code:'STORAGE_FAILED'});return dispatch(message);};
 await page.open();
 assert.equal(page.card,null);assert.equal(page.page,null);assert.equal(page.renderedCard,null);
 const failedHeading=page.host.querySelector('h1'),retry=page.host.querySelectorAll('button').find(button=>button.textContent==='Retry');
 assert.equal(failedHeading.textContent,'AI Context');assert.ok(retry);
 retry.focus();assert.equal(document.activeElement,retry);
 transport.dispatch=dispatch;
 const actualOpen=page.open.bind(page);let retryTask;
 page.open=card=>{retryTask=actualOpen(card);return retryTask;};
 retry.onclick();assert.ok(retryTask);await retryTask;await tick();
 const heading=page.host.querySelector('h1');
 assert.equal(page.card,null);assert.equal(page.page.inert,false);
 assert.equal(page.host.querySelector('.context-load-failed'),null);
 assert.equal(heading.textContent,'AI Context');assert.notEqual(heading,failedHeading);
 assert.equal(retry.isConnected,false);assert.equal(document.activeElement,heading);
 assert.equal(calls.some(call=>call.type==='PAIA_CONTEXT_CARDS_DRAFTS'),false);
}));

test('CTX4-02 worker refresh rebuilds a pending Now route and old open cannot replace typed text or focus',()=>fixture(async({c,recovery,makePage,transport,dispatch})=>{
 const page=makePage();await page.open('rules');await tick();
 const outgoing=page.page,oldEditor=[...page.editors.values()][0],held=deferred(),entered=deferred();let snapshots=0;
 assert.equal(await page.leave(),true);
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'&&++snapshots===1){entered.resolve();await held.promise;}return dispatch(message);};
 const opening=page.open('now');await entered.promise;
 assert.equal(page.page,outgoing);assert.equal(outgoing.inert,true);
 await page.refresh();await tick();
 assert.equal(page.card,'now');assert.equal(page.renderedCard,'now');
 assert.notEqual(page.page,outgoing);assert.equal(outgoing.isConnected,false);
 assert.equal(page.host.querySelector('h1').textContent,'My Now');
 assert.equal(page.editors.has(oldEditor.id),false);assert.equal(page.editors.size,1);
 const editor=[...page.editors.values()][0],panel=page.page,field=editor.field,text='SYNTHETIC Now typing after worker refresh';
 assert.equal(editor.saved.card,'now');assert.equal(Boolean(panel.inert),false);
 field.focus();field.textContent=text;editor.changed();editor.autosave.cancel();if(editor.recovery.running)await editor.recovery.running;
 held.resolve();await opening;await tick();
 assert.equal(page.page,panel);assert.equal(page.card,'now');assert.equal(page.renderedCard,'now');
 assert.equal(page.editors.get(editor.id),editor);assert.equal(editor.field,field);
 assert.equal(editor.local,text);assert.equal(field.textContent,text);assert.equal(editor.dirty(),true);
 assert.equal(document.activeElement,field,'late completion must not focus the heading over an actively edited destination');
 assert.equal((await recovery.load('context_item',editor.id)).operation.change.body,text);
 assert.equal((await c.snapshot()).items.find(item=>item.id===editor.id).body,editor.saved.body);
}));

test('CTX4-02 worker refresh failure replaces locked Rules with Now retry and stale open cannot restore it',()=>fixture(async({makePage,transport,dispatch,calls})=>{
 const page=makePage();await page.open('rules');await tick();
 const outgoing=page.page,editor=[...page.editors.values()][0],held=deferred(),entered=deferred();let snapshots=0;
 assert.equal(await page.leave(),true);
 transport.dispatch=async message=>{
  if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'){
   if(++snapshots===1){entered.resolve();await held.promise;}
   else if(snapshots===2)throw Object.assign(Error('SYNTHETIC worker refresh target failure'),{code:'STORAGE_FAILED'});
  }
  return dispatch(message);
 };
 const opening=page.open('now');await entered.promise;
 assert.equal(page.page,outgoing);assert.equal(outgoing.inert,true);
 await page.refresh();
 const failure=page.host.querySelector('.context-load-failed'),callCount=calls.length;
 assert.ok(failure);assert.equal(Boolean(failure.inert),false);
 assert.equal(page.card,'now');assert.equal(page.page,null);assert.equal(page.editors.size,0);
 assert.equal(page.host.querySelector('h1').textContent,'My Now');
 assert.equal(outgoing.isConnected,false);assert.equal(editor.surface.controller.signal.aborted,true);
 assert.equal(page.host.textContent.includes(editor.saved.body),false);
 held.resolve();await opening;await tick();
 assert.equal(page.host.querySelector('.context-load-failed'),failure);
 assert.equal(page.host.querySelector('h1').textContent,'My Now');
 assert.equal(page.page,null);assert.equal(page.editors.size,0);
 assert.equal(page.host.textContent.includes(editor.saved.body),false);
 assert.equal(calls.slice(callCount).some(call=>call.type==='PAIA_CONTEXT_CARDS_DRAFTS'),false);
 assert.ok(page.host.querySelectorAll('button').some(button=>button.textContent==='Retry'));
}));

for(const outcome of ['success','failure'])test(`CTX4-02 pre-leave refresh ${outcome} cannot replace the locked page during the outer navigation gap`,()=>fixture(async({makePage,transport,dispatch,calls})=>{
 const page=makePage();await page.open('rules');await tick();
 const outgoing=page.page,editor=[...page.editors.values()][0],field=editor.field,snapshot=page.snapshot,held=deferred(),entered=deferred();let intercepted=false;
 transport.dispatch=async message=>{
  if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'&&!intercepted){
   intercepted=true;entered.resolve();await held.promise;
   if(outcome==='failure')throw Object.assign(Error('SYNTHETIC pre-leave refresh failure'),{code:'STORAGE_FAILED'});
  }
  return dispatch(message);
 };
 const stale=page.refresh();await entered.promise;
 const readGeneration=page.readGeneration,openGeneration=page.openGeneration;
 assert.equal(await page.leave(),true);
 assert.ok(page.readGeneration>readGeneration,'accepted leave invalidates already-running snapshot reads');
 assert.ok(page.openGeneration>openGeneration);
 page.card='now';
 const callCount=calls.length;
 held.resolve();await stale;await tick();
 assert.equal(page.card,'now');assert.equal(page.renderedCard,'rules','destination has not opened during the outer GET_PAGE gap');
 assert.equal(page.page,outgoing);assert.equal(outgoing.inert,true);assert.equal(outgoing.isConnected,true);
 assert.equal(page.snapshot,snapshot);assert.equal(page.editors.size,1);
 assert.equal(page.editors.get(editor.id),editor);assert.equal(editor.field,field);assert.equal(editor.saved.card,'rules');
 assert.equal(field.textContent,editor.saved.body);assert.equal(editor.surface.controller.signal.aborted,false);
 assert.equal(page.host.querySelector('h1').textContent,'My Rules');
 assert.equal(page.host.querySelector('.context-load-failed'),null);
 assert.equal(calls.slice(callCount).some(call=>call.type==='PAIA_CONTEXT_CARDS_DRAFTS'),false);
 if(outcome==='success'){
  page.finishNavigation();assert.equal(page.page,null);assert.ok(page.host.querySelector('.context-load-failed'));
 }else{
  await page.open('now');await tick();assert.equal(page.page.inert,false);
  assert.ok([...page.editors.values()].every(value=>value.saved.card==='now'));
 }
 assert.equal(outgoing.isConnected,false);assert.equal(page.host.querySelector('h1').textContent,'My Now');
}));

test('CTX4-02 home counts use actual per-card Items and connections navigation stays local',()=>fixture(async({c,makePage,calls,navigations})=>{
 await c.change(put('rules'));await c.change(put('now'));await c.change(put('now'));
 const page=makePage();await page.open();
 assert.equal(page.host.querySelector('[data-count="info"]').textContent,'1 items');
 assert.equal(page.host.querySelector('[data-count="rules"]').textContent,'2 items');
 assert.equal(page.host.querySelector('[data-count="now"]').textContent,'3 items');
 assert.equal(page.host.querySelector('[data-count="inputs"]').textContent,'0 topics open');
 const link=page.host.querySelector('.connections-link');
 assert.equal(link.querySelector('.connection-number').textContent,'0');
 link.onclick();
 assert.deepEqual(navigations,['connections']);
 assert.ok(calls.every(call=>call.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'));
}));

for(const card of cards)test(`CTX4-02 ${card} fresh recovery filters other cards and keeps legacy omitted-card drafts in info`,()=>fixture(async({recovery,makePage,calls})=>{
 const changes=cards.map(value=>put(value,{body:`SYNTHETIC ${value} unsaved draft`})),legacy=put('info',{body:'SYNTHETIC legacy unsaved draft'});delete legacy.card;
 const stale=put(card,{expectedRevision:2,body:'SYNTHETIC existing revision draft'});
 for(const change of [...changes,legacy,stale])await recovery.save(draft(change));
 const page=makePage();await page.open(card);await tick();
 const recovered=[...page.editors.values()].filter(editor=>editor.fresh);
 assert.equal(recovered.length,card==='info'?2:1);
 assert.ok(recovered.every(editor=>editor.saved.card===card));
 const expected=[changes.find(change=>change.card===card).body,...(card==='info'?[legacy.body]:[])];
 assert.deepEqual(recovered.map(editor=>editor.local).sort(),expected.sort());
 for(const editor of recovered){assert.equal(editor.field.textContent,editor.local);assert.equal(editor.operation().card,card);assert.equal(editor.saved.revision,0);}
 assert.equal(page.host.textContent.includes(stale.body),false);
 assert.equal(calls.some(call=>call.type==='PAIA_CONTEXT_CARDS_CHANGE'),false,'recovery never silently commits');
 await page.recoverNew();
 assert.equal([...page.editors.values()].filter(editor=>editor.fresh).length,recovered.length,'repeat recovery does not mount duplicate Items');
}));

test('CTX4-02 delayed fresh recovery cannot mount a prior card after navigation',()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage();await page.open('rules');
 const change=put('rules',{body:'SYNTHETIC delayed Rules draft'});let release;
 transport.dispatch=message=>message.type==='PAIA_CONTEXT_CARDS_DRAFTS'?new Promise(resolve=>{release=resolve;}):dispatch(message);
 const pending=page.recoverNew();
 page.card='now';page.render();
 release([draft(change)]);await pending;
 assert.equal(page.host.querySelector('h1').textContent,'My Now');
 assert.equal(page.editors.has(change.itemId),false);
 assert.ok([...page.editors.values()].every(editor=>editor.saved.card==='now'));
}));

test('CTX4-02 existing editor recovery cannot replace text with a wrong-card draft',()=>fixture(async({c,recovery,makePage})=>{
 const snapshot=await c.snapshot();
 for(const card of cards){
  const saved=snapshot.items.find(item=>item.card===card),page=makePage();page.snapshot=snapshot;page.card=card;
  const editor=new ContextItemEditor(page,saved,{fresh:true});page.editors.set(saved.id,editor);editor.fresh=false;
  const wrong=put(cards.find(value=>value!==card),{itemId:saved.id,expectedRevision:saved.revision,body:'SYNTHETIC wrong-card recovery body'});
  await recovery.save(draft(wrong));await editor.recover();
  assert.equal(editor.local,saved.body);
  assert.equal(editor.field.textContent,saved.body);
  assert.equal(editor.conflicted,false);
  assert.equal((await recovery.load('context_item',saved.id)).operation.change.body,wrong.body,'wrong binding is never consumed as this editor’s saved draft');
 }
}));

for(const card of cards)test(`CTX4-02 ${card} keep-as-new commits only a same-card replacement before clearing original draft`,()=>fixture(async({c,recovery,makePage})=>{
 const page=makePage();await page.open(card);await tick();
 const original=[...page.editors.values()][0],saved=structuredClone(original.saved);
 original.local=`SYNTHETIC ${card} retained conflict`;original.field.textContent=original.local;original.conflicted=true;
 const protectedDraft=draft(original.operation());
 await recovery.save(protectedDraft);original.recovery.currentToken=protectedDraft.token;
 await page.keepConflict(original);await tick();
 const snapshot=await c.snapshot(),replacement=snapshot.items.find(item=>item.id!==saved.id&&item.card===card);
 assert.ok(replacement);
 assert.equal(replacement.body,original.local);
 assert.equal(replacement.section,saved.section);
 assert.equal(replacement.card,card);
 assert.equal(replacement.protected,true);
 assert.equal(snapshot.items.find(item=>item.id===saved.id).body,saved.body);
 assert.equal(snapshot.counts[card],2);
 assert.ok(cards.filter(value=>value!==card).every(value=>snapshot.counts[value]===1));
 assert.equal(await recovery.load('context_item',saved.id),null);
 assert.equal(page.editors.get(replacement.id).saved.card,card);
}));

test('CTX4-02 failed Rules conflict replacement keeps both drafts and cannot become an Info Item',()=>fixture(async({c,recovery,calls,transport,dispatch,makePage})=>{
 const page=makePage();await page.open('rules');await tick();
 const original=[...page.editors.values()][0];original.local='SYNTHETIC unsaved Rules conflict';original.field.textContent=original.local;original.conflicted=true;
 const protectedDraft=draft(original.operation());await recovery.save(protectedDraft);original.recovery.currentToken=protectedDraft.token;
 transport.dispatch=message=>{if(message.type==='PAIA_CONTEXT_CARDS_CHANGE')throw Object.assign(Error('SYNTHETIC write failure'),{code:'STORAGE_FAILED'});return dispatch(message);};
 await page.keepConflict(original);await tick();
 assert.equal(page.editors.get(original.id),original);
 assert.ok(original.replacement);
 assert.equal(original.replacement.saved.card,'rules');
 assert.equal(original.replacement.local,original.local);
 assert.equal(original.replacement.failed,true);
 assert.equal((await recovery.load('context_item',original.id)).operation.change.body,original.local);
 assert.equal((await recovery.load('context_item',original.replacement.id)).operation.change.card,'rules');
 assert.equal(calls.some(call=>call.type==='PAIA_RECOVERY_DRAFT_CLEAR'&&call.draft.ownerId===original.id),false);
 assert.deepEqual((await c.snapshot()).counts,{info:1,rules:1,now:1,inputs:0});
}));

test('CTX4-02 connections shows honest local-only empty state without editors, grants or fake controls',()=>fixture(async({c,calls,makePage,navigations})=>{
 const before=await c.snapshot(),page=makePage();await page.open('connections');
 assert.equal(page.host.querySelector('h1').textContent,'Connected AI');
 assert.match(page.host.textContent,/No AI is connected\./);
 assert.match(page.host.textContent,/External connections are unavailable\./);
 assert.match(page.host.textContent,/Access preferences stay on this device; no content is sent\./);
 assert.equal(page.host.querySelectorAll('.context-access').length,0);
 assert.equal(page.host.querySelectorAll('.context-item').length,0);
 assert.equal(page.host.querySelectorAll('.add-item').length,0);
 assert.equal(page.editors.size,0);
 assert.ok(calls.every(call=>call.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'));
 assert.deepEqual(await c.snapshot(),before);
 page.host.querySelector('.context-back').onclick();
 assert.deepEqual(navigations,[null]);
}));

test('CTX4-02 every Context card and connections survive cold history without body or query persistence',()=>{
 for(const contextCard of ['info','rules','now','inputs','connections']){
  const route={view:'memory',contextCard,returnTo:null,searchQuery:'SYNTHETIC private local query'},history=new RouteHistory();
  assert.equal(validRoute(route),true);
  const encoded=history.encode(route),cold=new RouteHistory().decode(encoded);
  assert.equal(encoded.contextCard,contextCard);
  assert.equal(cold.view,'memory');
  assert.equal(cold.contextCard,contextCard);
  assert.equal(cold.searchQuery,'');
  assert.deepEqual(cold.navigator,{expanded:[],loaded:[],scrollTop:0,narrowCollapsed:false,sourceScope:null});
  assert.equal(JSON.stringify(encoded).includes(route.searchQuery),false);
  assert.equal(Object.hasOwn(encoded,'body'),false);
  assert.equal(history.decode(encoded).contextCard,contextCard);
 }
 const root=new RouteHistory().encode({view:'memory'});
 assert.equal(Object.hasOwn(root,'contextCard'),false);
 assert.equal(new RouteHistory().decode(root).view,'memory');
});

test('CTX4-02 Context history rejects wrong views, unknown cards and body-shaped additions on encode and cold decode',()=>{
 const history=new RouteHistory(),base={view:'memory',contextCard:'connections'},encoded=history.encode(base);
 for(const view of [...routeViews].filter(value=>value!=='memory')){
  assert.equal(validRoute({...base,view}),false);
  assert.throws(()=>history.encode({...base,view}),/INVALID_VIEW_ROUTE/);
  assert.equal(new RouteHistory().decode({...encoded,view}),null);
 }
 for(const contextCard of ['unknown','Connections','',{},['info'],false]){
  assert.equal(validRoute({...base,contextCard}),false);
  assert.throws(()=>history.encode({...base,contextCard}),/INVALID_VIEW_ROUTE/);
  assert.equal(new RouteHistory().decode({...encoded,contextCard}),null);
 }
 for(const key of ['body','text','originalText','libraryText','thoughtText','apiKey','operationId','enabled']){
  assert.equal(validRoute({...base,[key]:'SYNTHETIC forbidden payload'}),false);
  assert.throws(()=>history.encode({...base,[key]:'SYNTHETIC forbidden payload'}),/INVALID_VIEW_ROUTE/);
  assert.equal(new RouteHistory().decode({...encoded,[key]:'SYNTHETIC forbidden payload'}),null);
 }
 assert.equal(new RouteHistory().decode({...encoded,anchor:{inputId:'SYNTHETIC input',offset:0,body:'SYNTHETIC forbidden nested body'}}),null);
});
