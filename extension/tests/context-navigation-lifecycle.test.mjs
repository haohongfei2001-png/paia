import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService} from '../core/context-cards.js';
import {RecoveryDraftStore} from '../core/recovery-draft.js';
import {ContextCardsPage,ContextItemEditor} from '../ui/context-cards.js';
import {RouteHistory,validRoute,routeViews} from '../ui/route-history.js';

const cards=['info'];
const names={info:'My Information',rules:'My Rules',now:'My Now'};
const op=()=>crypto.randomUUID();
const put=(card,extra={})=>({kind:'put',operationId:op(),epoch:'initial',itemId:op(),expectedRevision:0,body:`SYNTHETIC ${card} saved body`,section:'SYNTHETIC shared section',...extra});
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

for(const state of ['dirty','composing'])test(`CTX4-01 leave rechecks an earlier ${state} Info editor after a later held save`,()=>fixture(async({c,recovery,makePage,transport,dispatch})=>{
 await c.change(put('info',{body:'SYNTHETIC second Info editor'}));
 const page=makePage();await page.open('info');await tick();
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

test('CTX4-01 successful leave locks the entire outgoing page and invalidates pending opens before returning',()=>fixture(async({makePage})=>{
 const page=makePage();await page.open('info');await tick();
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

for(const outcome of ['success','failure'])test(`CTX4-01 held destination ${outcome} replaces the locked outgoing card`,()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage();await page.open('info');await tick();
 const outgoing=page.page,held=deferred(),entered=deferred();
 assert.equal(await page.leave(),true);
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'){entered.resolve();await held.promise;if(outcome==='failure')throw Object.assign(Error('SYNTHETIC held target failure'),{code:'STORAGE_FAILED'});}return dispatch(message);};
 const opening=page.open(null);await entered.promise;
 assert.equal(page.page,outgoing);
 assert.equal(outgoing.inert,true);
 assert.equal(outgoing.isConnected,true);
 held.resolve();await opening;await tick();
 assert.equal(outgoing.isConnected,false);
 assert.equal(page.host.querySelector('h1').textContent,'AI Context');
 assert.equal(document.activeElement,page.host.querySelector('h1'));
 if(outcome==='success'){
  assert.notEqual(page.page,outgoing);assert.equal(page.page.inert,false);
  assert.equal(page.editors.size,0,'Home has no outgoing Info editor');
 }else{
  assert.equal(page.page,null);assert.equal(page.editors.size,0);
  assert.equal(Boolean(page.host.querySelector('.context-load-failed').inert),false);
  assert.ok(page.host.querySelectorAll('button').some(button=>button.textContent==='Retry'));
 }
}));

for(const outcome of ['success','failure'])test(`CTX4-01 superseded same-card snapshot ${outcome} cannot thaw a newer held transition`,()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage();await page.open('info');await tick();
 const outgoing=page.page,oldRead=deferred(),newRead=deferred(),oldEntered=deferred(),newEntered=deferred();let snapshots=0;
 transport.dispatch=async message=>{
  if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'){
   if(++snapshots===1){oldEntered.resolve();await oldRead.promise;if(outcome==='failure')throw Object.assign(Error('SYNTHETIC stale read failure'),{code:'STORAGE_FAILED'});}
   else if(snapshots===2){newEntered.resolve();await newRead.promise;}
  }
  return dispatch(message);
 };
 const stale=page.open('info');await oldEntered.promise;
 assert.equal(await page.leave(),true);
 const current=page.open(null);await newEntered.promise;
 oldRead.resolve();await stale;
 assert.equal(page.card,null);assert.equal(page.page,outgoing);assert.equal(outgoing.inert,true);
 assert.equal(page.host.querySelector('.context-load-failed'),null);
 newRead.resolve();await current;await tick();
 assert.equal(page.host.querySelector('h1').textContent,'AI Context');assert.equal(page.page.inert,false);
 assert.equal(page.editors.size,0,'Home has no outgoing Info editor');
}));

test('CTX4-01 heading focus precedes recovery and stale same-card recovery cannot thaw or mount during reopening',()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage(),oldDrafts=deferred(),draftsEntered=deferred(),newRead=deferred(),readEntered=deferred();let snapshots=0;
 const change=put('info',{body:'SYNTHETIC superseded same-card draft'});
 transport.dispatch=async message=>{
  if(message.type==='PAIA_CONTEXT_CARDS_DRAFTS'){draftsEntered.resolve();return oldDrafts.promise;}
  if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'&&++snapshots===2){readEntered.resolve();await newRead.promise;}
  return dispatch(message);
 };
 const stale=page.open('info');await draftsEntered.promise;
 const outgoing=page.page;
 assert.equal(document.activeElement,page.host.querySelector('h1'),'heading focus must not wait for draft enumeration');
 assert.equal(await page.leave(),true);
 const current=page.open('info');await readEntered.promise;
 oldDrafts.resolve([draft(change)]);await stale;
 assert.equal(page.page,outgoing);assert.equal(outgoing.inert,true);
 assert.equal(page.editors.has(change.itemId),false);
 assert.equal(page.host.textContent.includes(change.body),false);
 newRead.resolve();await current;
 assert.equal(page.page,outgoing);assert.equal(outgoing.inert,false);
 assert.equal(page.editors.has(change.itemId),false);
}));

test('CTX4-01 close and same-card reopen reject recovery from the prior open generation',()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage(),held=deferred(),entered=deferred();let lists=0;
 const change=put('info',{body:'SYNTHETIC pre-close recovery body'});
 transport.dispatch=message=>{if(message.type==='PAIA_CONTEXT_CARDS_DRAFTS'&&++lists===1){entered.resolve();return held.promise;}return dispatch(message);};
 const stale=page.open('info');await entered.promise;
 const oldPage=page.page,generation=page.openGeneration;page.close();
 assert.ok(page.openGeneration>generation);
 await page.open('info');await tick();
 const current=page.page,heading=page.host.querySelector('h1');
 assert.notEqual(current,oldPage);
 held.resolve([draft(change)]);await stale;
 assert.equal(page.page,current);assert.equal(current.inert,false);
 assert.equal(page.editors.has(change.itemId),false);
 assert.equal(page.host.textContent.includes(change.body),false);
 assert.equal(document.activeElement,heading);
}));

for(const outcome of ['success','failure'])test(`CTX4-01 close rejects a held initial snapshot ${outcome} without reopening or recovering`,()=>fixture(async({makePage,transport,dispatch,calls})=>{
 const page=makePage(),held=deferred(),entered=deferred();
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'){entered.resolve();await held.promise;if(outcome==='failure')throw Object.assign(Error('SYNTHETIC closed read failure'),{code:'STORAGE_FAILED'});}return dispatch(message);};
 const opening=page.open('info');await entered.promise;page.close();held.resolve();await opening;
 assert.equal(page.active,false);assert.equal(page.page,null);assert.equal(page.editors.size,0);
 assert.equal(page.host.children.length,0);
 assert.equal(calls.some(call=>call.type==='PAIA_CONTEXT_CARDS_DRAFTS'),false);
}));

test('CTX4-01 outer navigation failure before Context open replaces the locked page and retries the selected card',()=>fixture(async({c,makePage,calls})=>{
 const page=makePage();await page.open('info');await tick();
 const outgoing=page.page,original=[...page.editors.values()][0],before=await c.snapshot();
 assert.equal(await page.leave(),true);
 page.card=null;
 const openGeneration=page.openGeneration,readGeneration=page.readGeneration,callCount=calls.length;
 page.finishNavigation();
 assert.ok(page.openGeneration>openGeneration);assert.ok(page.readGeneration>readGeneration);
 assert.equal(calls.length,callCount,'outer failure recovery must not dispatch an implicit write or load');
 assert.equal(page.card,null);assert.equal(page.page,null);assert.equal(page.editors.size,0);
 assert.equal(outgoing.isConnected,false);assert.equal(original.surface.controller.signal.aborted,true);
 const failure=page.host.querySelector('.context-load-failed');
 assert.ok(failure);assert.equal(Boolean(failure.inert),false);
 assert.equal(page.host.querySelector('h1').textContent,'AI Context');
 assert.equal(page.host.textContent.includes(original.saved.body),false);
 const retry=page.host.querySelectorAll('button').find(button=>button.textContent==='Retry'),actualOpen=page.open.bind(page);let retryTask;
 page.open=card=>{retryTask=actualOpen(card);return retryTask;};
 retry.onclick();assert.ok(retryTask);await retryTask;await tick();
 assert.equal(page.page.inert,false);assert.equal(page.host.querySelector('.context-load-failed'),null);
 assert.equal(page.host.querySelector('h1').textContent,'AI Context');
 assert.equal(page.editors.size,0,'Home has no outgoing Info editor');
 assert.equal(page.editors.has(original.id),false);
 assert.deepEqual(await c.snapshot(),before);
}));

test('CTX4-01 navigation finalizer is a no-op for a live non-inert page with dirty Info text',()=>fixture(async({recovery,makePage,calls})=>{
 const page=makePage();await page.open('info');await tick();
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

for(const outcome of ['success','failure'])test(`CTX4-01 outer navigation finalizer invalidates a pending destination ${outcome}`,()=>fixture(async({makePage,transport,dispatch,calls})=>{
 const page=makePage();await page.open('info');await tick();assert.equal(await page.leave(),true);
 const held=deferred(),entered=deferred();
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'){entered.resolve();await held.promise;if(outcome==='failure')throw Object.assign(Error('SYNTHETIC finalized stale failure'),{code:'STORAGE_FAILED'});}return dispatch(message);};
 const opening=page.open(null);await entered.promise;
 page.finishNavigation();const failure=page.host.querySelector('.context-load-failed'),callCount=calls.length;
 assert.ok(failure);
 held.resolve();await opening;await tick();
 assert.equal(page.host.querySelector('.context-load-failed'),failure,'late response cannot replace the explicit target retry state');
 assert.equal(page.host.querySelector('h1').textContent,'AI Context');assert.equal(Boolean(failure.inert),false);
 assert.equal(page.page,null);assert.equal(page.editors.size,0);
 assert.equal(calls.slice(callCount).some(call=>call.type==='PAIA_CONTEXT_CARDS_DRAFTS'),false);
}));

test('CTX4-01 failed home retry focuses the new heading instead of a detached Retry button',()=>fixture(async({makePage,transport,dispatch,calls})=>{
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


for(const outcome of ['success','failure'])test(`CTX4-01 admitted leave invalidates an older ${outcome} read before target open begins`,()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage();await page.open('info');await tick();const outgoing=page.page,held=deferred(),entered=deferred();
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'){entered.resolve();await held.promise;if(outcome==='failure')throw Error('held old read');}return dispatch(message);};
 const old=page.open('info');await entered.promise;const readGeneration=page.readGeneration;assert.equal(await page.leave(),true);assert.ok(page.readGeneration>readGeneration);
 held.resolve();await old;assert.equal(page.page,outgoing);assert.equal(outgoing.inert,true);assert.equal(page.host.querySelector('.context-load-failed'),null);
}));

for(const outcome of ['success','failure'])test(`CTX4-01 changed-notification ${outcome} during a held Info-to-Home open respects the target identity`,()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage();await page.open('info');await tick();const outgoing=page.page,held=deferred(),entered=deferred();let reads=0;
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'){if(++reads===1){entered.resolve();await held.promise;}else if(outcome==='failure')throw Error('newer target read failed');}return dispatch(message);};
 assert.equal(await page.leave(),true);const opening=page.open(null);await entered.promise;await page.refresh();assert.equal(outgoing.isConnected,false);
 assert.equal(page.host.querySelector('h1').textContent,'AI Context');assert.equal(page.editors.size,0);
 held.resolve();await opening;assert.equal(page.card,null);assert.equal(page.host.querySelector('h1').textContent,'AI Context');assert.equal(page.editors.size,0);
 if(outcome==='success'){assert.equal(page.renderedCard,null);assert.equal(page.page.inert,false);}else assert.ok(page.host.querySelector('.context-load-failed'));
}));

test('CTX4-01 older open completion cannot steal focus or composition from the correctly refreshed target editor',()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage();await page.open(null);const held=deferred(),entered=deferred();let reads=0;
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'&&++reads===1){entered.resolve();await held.promise;}return dispatch(message);};
 assert.equal(await page.leave(),true);const opening=page.open('info');await entered.promise;await page.refresh();await tick();
 const editor=[...page.editors.values()][0];editor.field.focus();editor.field.listeners.get('compositionstart')({});editor.field.textContent='SYNTHETIC current target composition';
 held.resolve();await opening;assert.equal(document.activeElement,editor.field);assert.equal(page.editors.get(editor.id),editor);assert.equal(editor.composing,true);assert.equal(editor.field.textContent,'SYNTHETIC current target composition');
 editor.field.listeners.get('compositionend')({});editor.autosave.cancel();if(editor.recovery.running)await editor.recovery.running;
}));

for(const residue of ['\n',' \n','\n\n'])test(`CTX4-01 erased fresh editor normalizes browser blank residue ${JSON.stringify(residue)} before final leave scan`,()=>fixture(async({makePage,c,recovery,calls})=>{
 const page=makePage();await page.open('info');await page.addItem();const editor=[...page.editors.values()][0];
 editor.field.textContent=residue;editor.changed();editor.autosave.cancel();if(editor.discarding)await editor.discarding;
 assert.equal(await page.leave(),true);assert.equal(editor.local,'');assert.equal(editor.dirty(),false);assert.equal(page.page.inert,true);
 assert.equal((await c.snapshot()).items.length,0);assert.equal((await recovery.list('context_item')).length,0);assert.equal(calls.some(call=>call.type==='PAIA_CONTEXT_CARDS_CHANGE'),false);
},{seed:false}));
