import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService} from '../core/context-cards.js';
import {ContextTopicAccessService} from '../core/context-topic-access.js';
import {CONTEXT_TOPIC_ACCESS_ROW} from '../core/context-topic-preferences.js';
import {ContextCardsPage} from '../ui/context-cards.js';
import {ContextTopicInputs} from '../ui/context-topics.js';
import {ContextTopicCommitSession} from '../ui/context-topic-commit.js';
import {hashText} from '../core/dedupe.js';
import {installContextInputsTrace,readContextInputsTrace} from './harness/context-inputs-trace.mjs';

const op=()=>crypto.randomUUID();
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const raw=(s,store,id)=>s.repository.transaction(false,t=>t.get(store,id));
const protectedStores=['records','recordIndex','blocks','blockIndex','documents','libraryDocuments','times','thoughts','topics','sections','placements','inputStates','inputRemovals','tombstones','revisions','provenance','dependencies'];
const protectedRows=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(protectedStores.map(async name=>[name,await t.all(name)]))));
const choice=(row,epoch,extra={})=>({topicId:row.topicId,enabled:!row.enabled,expectedRevision:row.revision,expectedBinding:row.enabled?row.binding:row.expectedBinding,epoch,operationId:op(),...extra});

// Only DOM operations, never a replacement for native layout or browser default
// keyboard behavior. All positive Topic DTOs and mutations use actual services.
class Node extends PresentationNode{
 get childElementCount(){return this.children.length;}
 get innerText(){return this.textContent;}
 set innerText(value){this.textContent=value;}
 matches(selector){if(selector.startsWith('.'))return this.classList.contains(selector.slice(1));const a=/^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);return a?a[2]===undefined?this.getAttribute(a[1])!==null:this.getAttribute(a[1])===a[2]:this.tagName.toLowerCase()===selector.toLowerCase();}
 querySelectorAll(selector){const descendants=this.children.flatMap(child=>[child,...(child.querySelectorAll?.('*')||[])]);return selector==='*'?descendants:descendants.filter(node=>node.matches?.(selector));}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 closest(selector){return this.matches(selector)?this:this.parentElement?.closest?.(selector)||null;}
 focus(){document.activeElement=this;this.listeners.get('focus')?.({target:this});for(let node=this;node;node=node.parentElement)node.listeners.get('focusin')?.({target:this});}
 blur(){if(document.activeElement===this)document.activeElement=null;}
 scrollIntoView(){}
}

async function fixture(run,{count=3}={}){
 const globals=new Map(['document','chrome'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const {s,...storage}=await setup(OrganizerStore);await s.finishFoundation();await s.setFilterMode('off');
 const topics=[];for(let index=0;index<count;index++)topics.push(await s.createTopic({name:`SYNTHETIC Topic ${String(index).padStart(3,'0')}`,operationId:op()}));
 const entry=await s.createEntry({operationId:op(),actor:'user',body:'SYNTHETIC_PRIVATE_THOUGHT_BODY',note:'SYNTHETIC_PRIVATE_NOTE',type:'idea',formation:'explicit',evidence:[]});
 if(topics.length)await s.placeEntry({entryId:entry.id,topicId:topics[0].id,operationId:op(),expectedEntryRevision:(await raw(s,'thoughts',entry.id)).revision,expectedTopicRevision:(await raw(s,'topics',topics[0].id)).organizationRevision});
 const access=new ContextTopicAccessService(s),cards=new ContextCardsService(s,{topicSummary:(t,epoch)=>access.summaryInTransaction(t,epoch)});
 for(const key of ['global','inputs'])await cards.change({kind:'access',operationId:op(),epoch:'initial',key,enabled:true,expectedRevision:0});
 const body=new Node('body');globalThis.document={addEventListener(){},body,documentElement:{lang:'en'},activeElement:null,createElement:tag=>new Node(tag),createElementNS:(namespace,tag)=>new Node(tag,namespace)};
 const calls=[],pages=[],standalones=[],navigations=[];
 const dispatch=async message=>{
  switch(message.type){
   case 'PAIA_CONTEXT_CARDS_SNAPSHOT':return cards.snapshot();
   case 'PAIA_CONTEXT_CARDS_CHANGE':return cards.change(message.change);
   case 'PAIA_CONTEXT_CARDS_OUTCOME':return cards.outcome(message.query);
   case 'PAIA_CONTEXT_CARDS_DRAFTS':return [];
   case 'PAIA_CONTEXT_TOPICS_PAGE':return access.page(message.options);
   case 'PAIA_CONTEXT_TOPICS_CHANGE':return access.change(message.change);
   case 'PAIA_CONTEXT_TOPICS_OUTCOME':return access.outcome(message.query);
   default:throw Error('Unexpected synthetic UI request: '+message.type);
  }
 };
 const transport={dispatch};
 const send=async(type,fields={})=>{const message={type,...fields};calls.push(structuredClone(message));return transport.dispatch(message);};
 globalThis.chrome={runtime:{sendMessage:async message=>{try{return {ok:true,data:await send(message.type,Object.fromEntries(Object.entries(message).filter(([key])=>key!=='type')))};}catch(error){return {ok:false,error:error.code||'STORAGE_FAILED'};}}}};
 const makePage=()=>{const host=new Node('main');body.append(host);const page=new ContextCardsPage({host,onNavigate:card=>navigations.push(card)});pages.push(page);return page;};
 const makeInputs=async()=>{const host=new Node('main');body.append(host);const inputs=new ContextTopicInputs({host,access:(await cards.snapshot()).access,send});standalones.push(inputs);return inputs;};
 try{await run({s,...storage,topics,entry,access,cards,send,calls,transport,dispatch,makePage,makeInputs,navigations});}
 finally{for(const page of pages)page.close();for(const inputs of standalones)inputs.close();await tick();await s.repository.close();for(const [key,value]of globals)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
}

for(const count of [20,50,144])test(`CTX4-03 actual My Inputs traverses all ${count} Topics and preserves identity, order, focus and saved state`,()=>fixture(async({s,access,makePage,calls})=>{
 const before=await protectedRows(s),page=makePage();await page.open('inputs');const inputs=page.inputs;
 assert.ok(inputs instanceof ContextTopicInputs);assert.equal(inputs.order.length,count);assert.equal(inputs.nodes.size,count);assert.equal(new Set(inputs.order).size,count);
 const reads=calls.filter(call=>call.type==='PAIA_CONTEXT_TOPICS_PAGE');assert.equal(reads.length,Math.ceil(count/100));assert.equal(reads[0].options.cursor,null);if(count>100)assert.equal(reads[1].options.cursor.offset,100);
 const expected=(await s.repository.transaction(false,t=>t.all('topics'))).sort((a,b)=>s.repository.factory.cmp(JSON.stringify([a.createdAt,a.id]),JSON.stringify([b.createdAt,b.id]))).map(row=>row.id);
 assert.deepEqual(inputs.order,expected);assert.ok([...inputs.rows.values()].every(row=>!row.enabled));assert.equal(inputs.selectedCount,0);
 const id=inputs.order.at(-1),node=inputs.nodes.get(id);node.focus();assert.equal(await inputs.toggle(id),true);
 assert.equal(inputs.nodes.get(id),node);assert.equal(document.activeElement,node);assert.deepEqual(inputs.order,expected);assert.equal(node.getAttribute('aria-pressed'),'true');assert.equal(inputs.selectedCount,1);
 assert.equal(await inputs.toggle(id),true);assert.equal(await inputs.toggle(id),true);assert.equal(inputs.nodes.get(id),node);assert.equal(document.activeElement,node);assert.deepEqual(inputs.order,expected);
 assert.ok(!page.host.textContent.includes('SYNTHETIC_PRIVATE'));assert.equal(page.host.querySelectorAll('textarea').length,0);assert.equal(page.editors.size,0);assert.equal(page.host.querySelector('h1').textContent,'My Inputs');
 assert.deepEqual(await protectedRows(s),before);
 assert.equal(await page.leave(),true);assert.equal(page.page.inert,true);page.close();const reopened=makePage();await reopened.open('inputs');
 assert.deepEqual(reopened.inputs.order,expected);assert.equal(reopened.inputs.rows.get(id).enabled,true);assert.equal(reopened.inputs.rows.get(id).revision,3);assert.equal((await access.page()).externalAllowed,false);
},{count}));

test('CTX4-03 home uses actual selected count while global and Inputs pause retain exact choices',()=>fixture(async({s,cards,makePage})=>{
 const page=makePage();await page.open('inputs');const id=page.inputs.order[0];await page.inputs.toggle(id);const saved=await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW);
 for(const key of ['global','inputs']){const access=(await cards.snapshot()).access[key];await cards.change({kind:'access',key,enabled:false,expectedRevision:access.revision,operationId:op(),epoch:'initial'});await page.refresh();assert.equal(page.inputs.rows.get(id).enabled,true);assert.equal(page.inputs.nodes.get(id).dataset.paused,'true');assert.deepEqual(await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW),saved);}
 assert.match(page.inputs.note.textContent,/private.*retained/);assert.equal(await page.leave(),true);await page.open(null);
 assert.equal(page.host.querySelector('[data-count="inputs"]').textContent,'1 topics selected');assert.equal(page.host.querySelector('.input-summary').textContent,page.snapshot.topicChoices.selectedNames.join(' · '));assert.equal(page.snapshot.topicChoices.remainingSelectedCount,0);assert.equal(page.snapshot.connections,0);assert.equal(page.snapshot.capabilities.external,false);
}));

test('CTX4-03 malformed Topic preferences show unavailable on home while all independent card Items survive',()=>fixture(async({s,cards,access,makePage,calls})=>{
 for(const card of ['info','rules','now'])assert.equal((await cards.change({kind:'put',card,itemId:op(),operationId:op(),epoch:'initial',expectedRevision:0,section:'SYNTHETIC independent section',body:`SYNTHETIC protected ${card} Item`})).ok,true);
 const directory=await access.page();assert.equal((await access.change(choice(directory.items[0],directory.epoch))).ok,true);
 const savedItems=structuredClone((await cards.snapshot()).items),malformed={...await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW),version:2};await s.repository.transaction(true,t=>t.put('meta',malformed));const bodies=await protectedRows(s);
 const page=makePage();await page.open(null);assert.deepEqual(page.snapshot.topicChoices,{available:false,selectedCount:null,externalAllowed:false});assert.equal(page.snapshot.capabilities.inputs,false);assert.deepEqual(page.snapshot.items,savedItems);
 const count=page.host.querySelector('[data-count="inputs"]'),summary=page.host.querySelector('.input-summary');assert.equal(count.textContent,'Topic choices unavailable');assert.equal(summary.textContent,'Topic choices cannot be read right now. Existing settings are retained.');assert.doesNotMatch(count.textContent,/^0\b/);assert.doesNotMatch(summary.textContent,/No open topics|0 topics/i);
 for(const card of ['info','rules','now']){assert.equal(page.snapshot.counts[card],1);assert.equal(page.snapshot.capabilities[card],true);assert.equal(await page.leave(),true);await page.open(card);assert.equal(page.editors.size,1);const editor=[...page.editors.values()][0];assert.equal(editor.saved.card,card);assert.equal(editor.field.textContent,`SYNTHETIC protected ${card} Item`);}
 assert.deepEqual((await cards.snapshot()).items,savedItems);assert.deepEqual(await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW),malformed);assert.deepEqual(await protectedRows(s),bodies);assert.equal(calls.some(call=>call.type==='PAIA_CONTEXT_CARDS_CHANGE'||call.type==='PAIA_CONTEXT_TOPICS_CHANGE'),false);
}));

test('CTX4-03 actual same-ID rename updates only its name and a new Topic remains off',()=>fixture(async({s,makePage})=>{
 const page=makePage();await page.open('inputs');const inputs=page.inputs,id=inputs.order[0],node=inputs.nodes.get(id);await inputs.toggle(id);node.focus();const stored=await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW);
 const topic=await raw(s,'topics',id);await s.renameTopic({id,name:'SYNTHETIC renamed same identity',expectedRevision:topic.revision,operationId:op()});const newTopic=await s.createTopic({name:'SYNTHETIC New identity',operationId:op()});await page.refresh();
 assert.equal(inputs.nodes.get(id),node);assert.equal(node.querySelector('.topic-name').textContent,'SYNTHETIC renamed same identity');assert.equal(document.activeElement,node);assert.equal(inputs.rows.get(id).enabled,true);assert.equal(inputs.rows.get(newTopic.id).enabled,false);assert.equal(inputs.rows.get(newTopic.id).revision,0);assert.deepEqual(await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW),stored);
}));

test('CTX4-03 removed selection remains visible and disables using its old binding',()=>fixture(async({s,makePage,calls})=>{
 const page=makePage();await page.open('inputs');const inputs=page.inputs,id=inputs.order[0];await inputs.toggle(id);const binding=structuredClone(inputs.rows.get(id).binding),topic=await raw(s,'topics',id);
 await s.removeTopic({id,expectedRevision:topic.revision,operationId:op()});await page.refresh();const stale=inputs.rows.get(id);
 assert.equal(stale.enabled,true);assert.equal(stale.bindingValid,false);assert.equal(stale.canDisable,true);assert.equal(stale.policyAllowed,false);assert.equal(inputs.nodes.get(id).disabled,false);
 assert.equal(await inputs.toggle(id),true);const change=calls.filter(call=>call.type==='PAIA_CONTEXT_TOPICS_CHANGE').at(-1).change;assert.equal(change.topicId,id);assert.equal(change.enabled,false);assert.deepEqual(change.expectedBinding,binding);assert.equal(inputs.rows.get(id).enabled,false);
}));

test('CTX4-03 roving buttons keep one Tab stop and handle arrows, Home and End without swallowing activation keys',()=>fixture(async({makeInputs})=>{
 const inputs=await makeInputs();await inputs.refresh();const nodes=inputs.order.map(id=>inputs.nodes.get(id));
 const key=(node,key,extra={})=>{let prevented=false;inputs.move({target:node,key,preventDefault(){prevented=true;},...extra});return prevented;};
 nodes[0].focus();assert.deepEqual(nodes.map(node=>node.tabIndex),[0,-1,-1]);assert.equal(key(nodes[0],'ArrowRight'),true);assert.equal(document.activeElement,nodes[1]);assert.deepEqual(nodes.map(node=>node.tabIndex),[-1,0,-1]);
 assert.equal(key(nodes[1],'End'),true);assert.equal(document.activeElement,nodes[2]);assert.equal(key(nodes[2],'ArrowDown'),true);assert.equal(document.activeElement,nodes[2]);assert.equal(key(nodes[2],'Home'),true);assert.equal(document.activeElement,nodes[0]);assert.equal(key(nodes[0],'ArrowLeft'),true);assert.equal(document.activeElement,nodes[0]);
 assert.equal(key(nodes[0],'ArrowRight',{ctrlKey:true}),false);assert.equal(key(nodes[0],'Tab'),false);
 for(const composing of [{isComposing:true},{keyCode:229}]){assert.equal(key(nodes[0],'ArrowRight',composing),false);assert.equal(document.activeElement,nodes[0],'native composition keeps the capsule focus unchanged');}
 for(const activation of [' ','Enter']){assert.equal(key(nodes[0],activation),false);assert.equal(nodes[0].tagName,'BUTTON');assert.equal(nodes[0].type,'button');let task;const toggle=inputs.toggle.bind(inputs);inputs.toggle=id=>{task=toggle(id);return task;};nodes[0].onclick();assert.ok(task);assert.equal(await task,true);inputs.toggle=toggle;assert.equal(inputs.nodes.get(inputs.order[0]),nodes[0]);}
 assert.equal(inputs.rows.get(inputs.order[0]).enabled,false);assert.equal(document.activeElement,nodes[0]);
}));

test('CTX4-03 roving navigation skips actual unavailable retained choices',()=>fixture(async({makeInputs,s})=>{
 const inputs=await makeInputs();await inputs.refresh();const id=inputs.order[1],first=inputs.nodes.get(inputs.order[0]),last=inputs.nodes.get(inputs.order[2]);await inputs.toggle(id);await s.removeTopic({id,expectedRevision:(await raw(s,'topics',id)).revision,operationId:op()});await inputs.refresh();await inputs.toggle(id);
 assert.equal(inputs.nodes.get(id).disabled,true);first.focus();let prevented=false;inputs.move({target:first,key:'ArrowRight',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(document.activeElement,last);assert.equal(last.tabIndex,0);assert.equal(inputs.nodes.get(id).tabIndex,-1);
 inputs.move({target:last,key:'ArrowLeft',preventDefault(){}});assert.equal(document.activeElement,first);
}));

test('CTX4-03 refresh restores nearby focus when the focused unselected Topic is removed',()=>fixture(async({makeInputs,s})=>{
 const inputs=await makeInputs();await inputs.refresh();const removed=inputs.order[1],next=inputs.order[2],oldNode=inputs.nodes.get(removed);oldNode.focus();await s.removeTopic({id:removed,expectedRevision:(await raw(s,'topics',removed)).revision,operationId:op()});assert.equal(await inputs.refresh(),true);
 assert.equal(oldNode.isConnected,false);assert.equal(inputs.rows.has(removed),false);assert.equal(inputs.focusId,next);assert.equal(document.activeElement,inputs.nodes.get(next));assert.equal(inputs.nodes.get(next).tabIndex,0);
}));

test('CTX4-03 initial Topic read failure preserves the actual Inputs route and retry loads actual Topics',()=>fixture(async({makePage,transport,dispatch,calls})=>{
 transport.dispatch=message=>{if(message.type==='PAIA_CONTEXT_TOPICS_PAGE')throw Error('SYNTHETIC initial read failure');return dispatch(message);};const page=makePage();await page.open('inputs');assert.equal(page.host.querySelector('h1').textContent,'My Inputs');assert.equal(page.inputs.nodes.size,0);assert.match(page.inputs.status.textContent,/Topics could not be read/);assert.equal(calls.some(call=>call.type==='PAIA_CONTEXT_TOPICS_CHANGE'),false);
 transport.dispatch=dispatch;const retry=page.inputs.status.querySelector('button'),refresh=page.inputs.refresh.bind(page.inputs);let task;page.inputs.refresh=()=>{task=refresh();return task;};retry.onclick();assert.equal(await task,true);assert.equal(page.inputs.nodes.size,3);assert.equal(page.inputs.failedRead,false);
}));

test('CTX4-03 a read failure keeps current nodes and choices inert until actual-service retry',()=>fixture(async({makePage,transport,dispatch,s})=>{
 const page=makePage();await page.open('inputs');const inputs=page.inputs,id=inputs.order[1],node=inputs.nodes.get(id);await inputs.toggle(id);node.focus();const saved=await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW);
 transport.dispatch=message=>{if(message.type==='PAIA_CONTEXT_TOPICS_PAGE')throw Error('SYNTHETIC read failure');return dispatch(message);};assert.equal(await inputs.refresh(),false);assert.equal(inputs.nodes.get(id),node);assert.equal(node.disabled,true);assert.equal(await inputs.toggle(id),false);assert.deepEqual(await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW),saved);assert.match(inputs.status.textContent,/Existing choices are unchanged/);
 const retry=inputs.status.querySelector('button');assert.equal(retry.textContent,'Retry');assert.equal(document.activeElement,retry);transport.dispatch=dispatch;let task;const refresh=inputs.refresh.bind(inputs);inputs.refresh=()=>{task=refresh();return task;};retry.onclick();assert.equal(await task,true);assert.equal(inputs.rows.get(id).enabled,true);assert.equal(node.disabled,false);assert.equal(inputs.nodes.get(id),node);
}));

test('CTX4-03 actual postcommit stale authority preserves saved choices and Retry restores a usable directory',()=>fixture(async({makePage,transport,dispatch,s,cards,calls})=>{
 const previousTrace=globalThis.__ctx403UiTrace,notifications=new Set(),testPage={evaluate:fn=>fn()};
 chrome.runtime.getURL=path=>new URL('../'+path,import.meta.url).href;
 chrome.runtime.onMessage={addListener:listener=>notifications.add(listener),removeListener:listener=>notifications.delete(listener)};
 await installContextInputsTrace(testPage);
 const transaction=s.repository.transaction.bind(s.repository);
 try{
  const page=makePage();await page.open('inputs');const inputs=page.inputs,order=[...inputs.order],first=order[0],id=order[1],node=inputs.nodes.get(id);
  assert.equal(await inputs.toggle(first),true);const before=await protectedRows(s),nodes=[...inputs.nodes.values()];
  let armed=false,injected=false,capturedAuthority,currentAuthority,savedChoices;const replies=[];
  transport.dispatch=async message=>{
   const result=await dispatch(message);
   if(message.type==='PAIA_CONTEXT_TOPICS_CHANGE'&&result.ok){savedChoices=await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW);armed=true;}
   if(message.type==='PAIA_CONTEXT_TOPICS_PAGE')replies.push(result);
   return result;
  };
  // Change real access metadata after this real postcommit page captures its
  // authority. The service itself must return stale_authority, never a fake DTO.
  s.repository.transaction=async(write,fn,stores)=>{
   const value=await transaction(write,fn,stores);
   if(armed&&!write&&!injected&&value?.offset===0&&Array.isArray(value.items)&&value.items.some(row=>row.topicId===id)&&typeof value.authority==='string'){
    injected=true;capturedAuthority=value.authority;s.repository.transaction=transaction;
    const snapshot=await cards.snapshot();
    assert.equal((await cards.change({kind:'access',key:'global',enabled:false,expectedRevision:snapshot.access.global.revision,epoch:snapshot.epoch,operationId:op()})).ok,true);
    currentAuthority=(await transaction(false,t=>new ContextTopicAccessService(s).admission(t,undefined,{scope:true}))).authority;
   }
   return value;
  };
  node.focus();const saving=inputs.toggle(id);document.activeElement=document.body; // Native disabled-button blur.
  assert.equal(await saving,true,'the acknowledged save remains committed even when its following read fails');
  assert.equal(injected,true);assert.notEqual(capturedAuthority,currentAuthority);assert.equal(replies.length,1);assert.equal(replies[0].available,false);assert.equal(replies[0].reason,'stale_authority');assert.equal(replies[0].complete,false);assert.deepEqual(replies[0].items,[]);
  assert.equal(inputs.pending,false);assert.equal(inputs.busy,false);assert.equal(inputs.loading,false);assert.equal(inputs.failedRead,true);assert.equal(inputs.root.getAttribute('aria-busy'),'false');
  assert.deepEqual(inputs.order,order);assert.deepEqual([...inputs.nodes.values()],nodes);assert.equal(nodes.length,20);assert.ok(nodes.every(node=>node.disabled));assert.equal(nodes.filter(node=>!node.disabled&&node.tabIndex===0).length,0,'retained nodes are not a usable roving directory');
  assert.equal(inputs.rows.get(first).enabled,true);assert.equal(inputs.rows.get(id).enabled,false,'the prior UI snapshot is retained while the saved second choice awaits a complete read');
  assert.equal(savedChoices.choices.filter(choice=>choice.enabled).length,2);assert.deepEqual(await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW),savedChoices);assert.deepEqual(await protectedRows(s),before);
  assert.match(inputs.status.textContent,/Topics could not be read.*Existing choices are unchanged/);const retry=inputs.status.querySelector('button');assert.equal(retry.textContent,'Retry');assert.equal(retry.isConnected,true);assert.equal(document.activeElement,retry);
  const changes=calls.filter(call=>call.type==='PAIA_CONTEXT_TOPICS_CHANGE').length;assert.equal(await inputs.toggle(id),false);await tick();assert.equal(replies.length,1,'failure does not start a silent read retry');assert.equal(calls.filter(call=>call.type==='PAIA_CONTEXT_TOPICS_CHANGE').length,changes);
  let retryTask;const refresh=inputs.refresh.bind(inputs);inputs.refresh=()=>{retryTask=refresh();return retryTask;};retry.onclick();assert.ok(retryTask);assert.equal(await retryTask,true);
  assert.equal(replies.length,2);assert.equal(replies[1].available,true);assert.equal(replies[1].complete,true);assert.equal(replies[1].authority,currentAuthority);assert.equal(replies[1].selectedCount,2);
  assert.equal(inputs.failedRead,false);assert.equal(inputs.loading,false);assert.equal(inputs.root.getAttribute('aria-busy'),'false');assert.equal(inputs.status.querySelector('button'),null);assert.deepEqual(inputs.order,order);assert.deepEqual([...inputs.nodes.values()],nodes);assert.ok(nodes.every(node=>!node.disabled));assert.equal(nodes.filter(node=>node.tabIndex===0).length,1);assert.equal(inputs.nodes.get(id),node);assert.equal(document.activeElement,node);assert.equal(node.tabIndex,0);assert.equal(node.getAttribute('aria-pressed'),'true');assert.equal(inputs.rows.get(first).enabled,true);assert.equal(inputs.selectedCount,2);
  assert.deepEqual(await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW),savedChoices);assert.deepEqual(await protectedRows(s),before);assert.equal(calls.filter(call=>call.type==='PAIA_CONTEXT_TOPICS_CHANGE').length,changes);
  for(const listener of notifications)listener({type:'PAIA_CONTEXT_CARDS_CHANGED',body:'SYNTHETIC_PRIVATE_NOTIFICATION_BODY'});
  const trace=await readContextInputsTrace(testPage),refusal=trace.entries.find(entry=>entry.event==='page_result'&&entry.page.reason==='stale_authority');
  assert.ok(refusal);assert.equal(refusal.page.itemCount,0);assert.ok(trace.entries.some(entry=>entry.event==='refresh_end'&&entry.state.failedRead&&entry.state.enabledCount===0&&entry.state.focus.kind==='notice_button'));assert.ok(trace.entries.some(entry=>entry.event==='save_end'&&entry.result===true&&entry.state.failedRead));assert.ok(trace.entries.some(entry=>entry.event==='notification'&&entry.type==='PAIA_CONTEXT_CARDS_CHANGED'));assert.ok(trace.entries.some(entry=>entry.sequence>refusal.sequence&&entry.event==='page_result'&&entry.page.available&&entry.page.authority===currentAuthority));
  assert.doesNotMatch(JSON.stringify(trace),/SYNTHETIC|expectedBinding|operationId|topicId|outerHTML|textContent/,'trace contains only bounded metadata and categorized focus');
  for(let index=0;index<trace.capacity+1;index++)globalThis.__ctx403UiTrace.checkpoint('bounded_probe');
  const bounded=await readContextInputsTrace(testPage);assert.equal(bounded.entries.length,bounded.capacity);assert.ok(bounded.dropped>0);assert.equal(bounded.untrackedOwners,0);
 }finally{s.repository.transaction=transaction;globalThis.__ctx403UiTrace.restore();if(previousTrace)globalThis.__ctx403UiTrace=previousTrace;else delete globalThis.__ctx403UiTrace;assert.equal(notifications.size,0);}
},{count:20}));

for(const variant of ['malformed_cursor','repeated_cursor','malformed_page','mixed_count'])test(`CTX4-03 ${variant} never installs a partial list or changes choices`,()=>fixture(async({makeInputs,transport,dispatch,s})=>{
 const inputs=await makeInputs();await inputs.refresh();const order=[...inputs.order],nodes=[...inputs.nodes.values()],before=await protectedRows(s);let first=null;
 transport.dispatch=async message=>{if(message.type!=='PAIA_CONTEXT_TOPICS_PAGE')return dispatch(message);const page=await dispatch({...message,options:{...message.options,limit:1}});if(variant==='malformed_cursor')return {...page,nextCursor:'broken'};if(variant==='malformed_page')return {...page,complete:true};if(!first){first=page;return page;}if(variant==='repeated_cursor')return first;return {...page,selectedCount:page.selectedCount+1};};
 assert.equal(await inputs.refresh(),false);assert.equal(inputs.failedRead,true);assert.deepEqual(inputs.order,order);assert.deepEqual([...inputs.nodes.values()],nodes);assert.ok(nodes.every(node=>node.disabled));assert.equal(await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW),undefined);assert.deepEqual(await protectedRows(s),before);
 transport.dispatch=dispatch;assert.equal(await inputs.refresh(),true);assert.deepEqual(inputs.order,order);
}));

for(const variant of ['new_topic','saved_choice'])test(`CTX4-03 concurrent ${variant} between real pages refuses mixed authority and retries fresh`,()=>fixture(async({makeInputs,transport,dispatch,s,access})=>{
 const inputs=await makeInputs();await inputs.refresh();const original=[...inputs.order];let changed=false;
 transport.dispatch=async message=>{if(message.type!=='PAIA_CONTEXT_TOPICS_PAGE')return dispatch(message);const page=await dispatch({...message,options:{...message.options,limit:1}});if(!changed){changed=true;if(variant==='new_topic')await s.createTopic({name:'SYNTHETIC concurrent Topic',operationId:op()});else assert.equal((await access.change(choice(page.items[0],page.epoch))).ok,true);}return page;};
 assert.equal(await inputs.refresh(),false);assert.deepEqual(inputs.order,original);transport.dispatch=dispatch;assert.equal(await inputs.refresh(),true);assert.equal(inputs.order.length,variant==='new_topic'?4:3);assert.equal(inputs.selectedCount,variant==='saved_choice'?1:0);
}));

test('CTX4-03 a held stale page cannot overwrite a newer successful same-page read',()=>fixture(async({makeInputs,transport,dispatch,s})=>{
 const inputs=await makeInputs();await inputs.refresh();const id=inputs.order[0],node=inputs.nodes.get(id),entered=deferred(),held=deferred();let hold=true;
 transport.dispatch=async message=>{const result=await dispatch(message);if(message.type==='PAIA_CONTEXT_TOPICS_PAGE'&&hold){hold=false;entered.resolve();await held.promise;}return result;};
 const old=inputs.refresh();await entered.promise;await s.renameTopic({id,name:'SYNTHETIC newer name',expectedRevision:(await raw(s,'topics',id)).revision,operationId:op()});assert.equal(await inputs.refresh(),true);held.resolve();assert.equal(await old,false);assert.equal(inputs.nodes.get(id),node);assert.equal(node.querySelector('.topic-name').textContent,'SYNTHETIC newer name');assert.equal(inputs.loading,false);
}));

for(const destination of ['inputs','rules',null])test(`CTX4-03 leaving a held Inputs read and reopening ${destination||'home'} prevents stale repaint`,()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage();await page.open('inputs');const outgoing=page.page,oldInputs=page.inputs,entered=deferred(),held=deferred();let hold=true;
 transport.dispatch=async message=>{const result=await dispatch(message);if(message.type==='PAIA_CONTEXT_TOPICS_PAGE'&&hold){hold=false;entered.resolve();await held.promise;}return result;};
 const reading=oldInputs.refresh();await entered.promise;assert.equal(await page.leave(),true);assert.equal(outgoing.inert,true);await page.open(destination);const current=page.page;assert.equal(current.inert,false);held.resolve();assert.equal(await reading,false);assert.equal(page.page,current);assert.equal(page.card,destination);assert.equal(page.host.querySelector('h1').textContent,destination==='inputs'?'My Inputs':destination==='rules'?'My Rules':'AI Context');
 if(destination==='inputs')assert.equal(page.inputs.order.length,3);else {assert.equal(page.inputs,null);assert.equal(oldInputs.active,false);assert.equal(oldInputs.root.isConnected,false);}
}));

test('CTX4-03 a newer different-card open supersedes a held initial Inputs read',()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage(),entered=deferred(),held=deferred();let hold=true;transport.dispatch=async message=>{const result=await dispatch(message);if(message.type==='PAIA_CONTEXT_TOPICS_PAGE'&&hold){hold=false;entered.resolve();await held.promise;}return result;};
 const opening=page.open('inputs');await entered.promise;const old=page.inputs;await page.open('rules');const current=page.page;held.resolve();await opening;assert.equal(page.page,current);assert.equal(page.card,'rules');assert.equal(page.inputs,null);assert.equal(old.active,false);assert.equal(old.root.isConnected,false);assert.equal(document.activeElement,page.host.querySelector('h1'));
}));

test('CTX4-03 closing during a held read and reopening uses a fresh Inputs owner',()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage();await page.open('inputs');const old=page.inputs,entered=deferred(),held=deferred();let hold=true;
 transport.dispatch=async message=>{const result=await dispatch(message);if(message.type==='PAIA_CONTEXT_TOPICS_PAGE'&&hold){hold=false;entered.resolve();await held.promise;}return result;};const reading=old.refresh();await entered.promise;page.close();await page.open('inputs');const current=page.inputs;assert.notEqual(current,old);held.resolve();assert.equal(await reading,false);assert.equal(page.inputs,current);assert.equal(old.active,false);assert.equal(old.root.isConnected,false);assert.equal(current.nodes.size,3);
}));

test('CTX4-03 same-card reentry during a held save keeps the same pending Topic and control',()=>fixture(async({makePage,transport,dispatch,calls})=>{
 const page=makePage();await page.open('inputs');const inputs=page.inputs,id=inputs.order[0],node=inputs.nodes.get(id),entered=deferred(),held=deferred();
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_TOPICS_CHANGE'){entered.resolve();await held.promise;}return dispatch(message);};const saving=inputs.toggle(id);await entered.promise;const pending=inputs.commit.pending;await page.open('inputs');assert.equal(page.inputs,inputs);assert.equal(inputs.commit.pending,pending);assert.equal(inputs.nodes.get(id),node);assert.equal(await page.leave(),false);assert.equal(node.disabled,true);held.resolve();assert.equal(await saving,true);assert.equal(inputs.nodes.get(id),node);assert.equal(inputs.rows.get(id).enabled,true);assert.equal(calls.filter(call=>call.type==='PAIA_CONTEXT_TOPICS_CHANGE').length,1);
}));

test('CTX4-03 finishing a held Topic save respects focus moved to another current control',()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage();await page.open('inputs');const inputs=page.inputs,id=inputs.order[0],node=inputs.nodes.get(id),back=page.host.querySelector('.context-back'),entered=deferred(),held=deferred();node.focus();
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_TOPICS_CHANGE'){entered.resolve();await held.promise;}return dispatch(message);};const saving=inputs.toggle(id);await entered.promise;back.focus();held.resolve();assert.equal(await saving,true);assert.equal(document.activeElement,back);assert.equal(inputs.nodes.get(id),node);assert.equal(inputs.rows.get(id).enabled,true);
}));

test('CTX4-03 concurrent revision conflict refreshes the saved choice without another Topic mutation',()=>fixture(async({makeInputs,access,s,calls})=>{
 const inputs=await makeInputs();await inputs.refresh();const id=inputs.order[0],before=await protectedRows(s);assert.equal((await access.change(choice(inputs.rows.get(id),inputs.epoch))).ok,true);
 assert.equal(await inputs.toggle(id),false);assert.equal(inputs.pending,false);assert.equal(inputs.rows.get(id).enabled,true);assert.equal(inputs.rows.get(id).revision,1);assert.equal(inputs.selectedCount,1);assert.equal(calls.filter(call=>call.type==='PAIA_CONTEXT_TOPICS_CHANGE').length,1);assert.deepEqual(await protectedRows(s),before);assert.equal((await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW)).revision,1);
}));

test('CTX4-03 digest preparation reserves immutable intent and repeated clicks cannot retarget or leave',()=>fixture(async({makePage,calls})=>{
 const page=makePage();await page.open('inputs');const inputs=page.inputs,id=inputs.order[0],other=inputs.order[1],node=inputs.nodes.get(id),entered=deferred(),held=deferred(),subtle=crypto.subtle,original=subtle.digest;let hold=true,task;
 subtle.digest=async function(...args){if(hold){hold=false;entered.resolve();await held.promise;}return original.apply(this,args);};
 try{task=inputs.toggle(id);await entered.promise;const pending=inputs.commit.pending;assert.equal(inputs.busy,true);assert.equal(inputs.pending,true);assert.equal(pending.digest,null);assert.equal(pending.sent,false);assert.equal(Object.isFrozen(pending.change),true);assert.equal(Object.isFrozen(pending.change.expectedBinding),true);assert.equal(await inputs.toggle(other),false);assert.equal(await inputs.toggle(id),false);assert.equal(await page.leave(),false);assert.equal(page.page.inert,false);assert.equal(inputs.nodes.get(id),node);assert.equal(calls.filter(call=>call.type==='PAIA_CONTEXT_TOPICS_CHANGE').length,0);assert.throws(()=>{pending.change.topicId=other;},TypeError);held.resolve();assert.equal(await task,true);assert.equal(inputs.rows.get(id).enabled,true);assert.equal(inputs.rows.get(other).enabled,false);assert.equal(calls.filter(call=>call.type==='PAIA_CONTEXT_TOPICS_CHANGE').length,1);}
 finally{held.resolve();if(task)await task;subtle.digest=original;}
}));

test('CTX4-03 unknown saved outcome blocks leave and another Topic until the exact prior operation is recovered',()=>fixture(async({makePage,transport,dispatch,calls})=>{
 const page=makePage();await page.open('inputs');const inputs=page.inputs,id=inputs.order[0],other=inputs.order[1];let uncertain=true;
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_TOPICS_CHANGE'&&uncertain){await dispatch(message);throw Error('SYNTHETIC lost acknowledgment');}if(message.type==='PAIA_CONTEXT_TOPICS_OUTCOME'&&uncertain)throw Error('SYNTHETIC outcome unavailable');return dispatch(message);};
 assert.equal(await inputs.toggle(id),false);const pending=inputs.commit.pending;assert.ok(pending);assert.equal(await page.leave(),false);assert.equal(await inputs.toggle(other),false);assert.equal(inputs.commit.pending,pending);assert.match(inputs.status.textContent,/unconfirmed/);
 uncertain=false;assert.equal(await inputs.save(pending.change),true);assert.equal(inputs.pending,false);assert.equal(inputs.rows.get(id).enabled,true);assert.equal(inputs.rows.get(other).enabled,false);
 const changes=calls.filter(call=>call.type==='PAIA_CONTEXT_TOPICS_CHANGE');assert.equal(changes.length,2);assert.deepEqual(changes[0].change,changes[1].change);assert.equal(await page.leave(),true);assert.equal(page.page.inert,true);
}));

test('CTX4-03 confirmed not-committed failure permits a fresh retry without losing other choices',()=>fixture(async({makeInputs,transport,dispatch,s})=>{
 const inputs=await makeInputs();await inputs.refresh();const id=inputs.order[0];let fail=true;transport.dispatch=message=>{if(message.type==='PAIA_CONTEXT_TOPICS_CHANGE'&&fail)throw Error('SYNTHETIC pre-write storage failure');return dispatch(message);};
 assert.equal(await inputs.toggle(id),false);assert.equal(inputs.pending,false);assert.equal(await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW),undefined);fail=false;assert.equal(await inputs.toggle(id),true);assert.equal(inputs.selectedCount,1);
}));

test('CTX4-03 direct commit retries with the same intent keep the original operation ID',()=>fixture(async({access})=>{
 const page=await access.page(),change=choice(page.items[0],page.epoch),calls=[],entered=deferred(),held=deferred();
 const session=new ContextTopicCommitSession(async(type,fields)=>{calls.push({type,...structuredClone(fields)});if(type==='PAIA_CONTEXT_TOPICS_CHANGE'){entered.resolve();await held.promise;return access.change(fields.change);}return access.outcome(fields.query);});
 const first=session.save(change);await entered.promise;const again=session.save({...change,operationId:op()});await assert.rejects(session.save({...change,topicId:page.items[1].topicId,expectedBinding:page.items[1].expectedBinding}),{code:'SAVE_PENDING_OTHER'});held.resolve();const [a,b]=await Promise.all([first,again]);assert.deepEqual(a,b);assert.equal(a.change.operationId,change.operationId);assert.equal(calls.length,1);assert.equal(session.pending,null);
}));

test('CTX4-03 actual absent-off no-op receipt remains a valid acknowledgment',()=>fixture(async({access,s})=>{
 const change={topicId:'synthetic-absent-topic',enabled:false,expectedRevision:0,expectedBinding:null,epoch:'initial',operationId:op()},session=new ContextTopicCommitSession((type,fields)=>type==='PAIA_CONTEXT_TOPICS_CHANGE'?access.change(fields.change):access.outcome(fields.query));
 const acknowledgment=await session.save(change);assert.deepEqual(acknowledgment.result,{ok:true,topicId:change.topicId,enabled:false,revision:0,noOp:true,externalAllowed:false});assert.equal(session.pending,null);assert.equal(await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW),undefined);
}));

for(const variant of ['wrong_successor','cross_topic','impossible_noop'])test(`CTX4-03 ${variant} success and receipt remain unconfirmed`,()=>fixture(async({access})=>{
 const page=await access.page(),change=choice(page.items[0],page.epoch),actual=await access.change(change),invalid={...actual};if(variant==='wrong_successor')invalid.revision=actual.revision+7;if(variant==='cross_topic')invalid.topicId=page.items[1].topicId;if(variant==='impossible_noop')invalid.noOp=true;
 const session=new ContextTopicCommitSession(async type=>type==='PAIA_CONTEXT_TOPICS_CHANGE'?invalid:{state:'committed',result:invalid,externalAllowed:false});
 await assert.rejects(session.save(change));assert.ok(session.pending);assert.equal(session.pending.change.topicId,change.topicId);assert.equal(session.pending.digest,await hashText(JSON.stringify(change)));
}));

for(const phase of ['change','outcome'])test(`CTX4-03 terminal restore epoch at ${phase} releases the old pending reservation without retargeting`,()=>fixture(async({s,access})=>{
 const page=await access.page(),change=choice(page.items[0],page.epoch),calls=[];
 const session=new ContextTopicCommitSession(async(type,fields)=>{calls.push({type,...structuredClone(fields)});if(type==='PAIA_CONTEXT_TOPICS_CHANGE'&&phase==='outcome')throw Error('SYNTHETIC unknown outcome');return type==='PAIA_CONTEXT_TOPICS_CHANGE'?access.change(fields.change):access.outcome(fields.query);});
 await s.write(t=>t.put('meta',{id:'recovery-restore-epoch',value:op()}));await assert.rejects(session.save(change),{code:'CONTEXT_INVALIDATED'});assert.equal(session.pending,null);assert.equal(session.running,null);assert.ok(calls.every(call=>call.change?call.change.topicId===change.topicId:call.query.operationId===change.operationId));assert.equal(await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW),undefined);
}));

test('CTX4-03 controller terminal restore invalidation refreshes current choices and cannot retry the old enable',()=>fixture(async({s,makePage,transport,dispatch,calls})=>{
 const page=makePage();await page.open('inputs');const inputs=page.inputs,id=inputs.order[0],other=inputs.order[1];assert.equal(await inputs.toggle(other),true);const saved=await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW),entered=deferred(),held=deferred(),epoch=op(),beforeChanges=calls.filter(call=>call.type==='PAIA_CONTEXT_TOPICS_CHANGE').length;
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_TOPICS_CHANGE'){entered.resolve();await held.promise;}return dispatch(message);};const saving=inputs.toggle(id);await entered.promise;assert.equal(inputs.lastAttempt.topicId,id);assert.equal(inputs.lastAttempt.epoch,'initial');assert.equal(await page.leave(),false);const previousRetry=inputs.status.querySelector('button');assert.ok(previousRetry);
 await s.write(t=>t.put('meta',{id:'recovery-restore-epoch',value:epoch}));held.resolve();assert.equal(await saving,false);assert.equal(inputs.lastAttempt,null);assert.equal(inputs.commit.pending,null);assert.equal(inputs.commit.running,null);assert.equal(inputs.busy,false);assert.equal(inputs.failedRead,false);assert.equal(inputs.epoch,epoch);assert.equal(inputs.rows.get(id).enabled,false);assert.equal(inputs.rows.get(other).enabled,true);assert.equal(inputs.rows.get(other).bindingValid,false);assert.equal(inputs.selectedCount,1);assert.match(inputs.status.textContent,/data changed.*current Topic choices/);assert.equal(inputs.status.querySelector('button'),null);assert.equal(previousRetry.isConnected,false);assert.deepEqual(await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW),saved);
 // A previously captured retry callback must now perform only a fresh read.
 const refresh=inputs.refresh.bind(inputs);let retry;inputs.refresh=()=>{retry=refresh();return retry;};previousRetry.onclick();assert.ok(retry);assert.equal(await retry,true);await tick();assert.equal(inputs.lastAttempt,null);assert.equal(inputs.epoch,epoch);assert.equal(inputs.rows.get(id).enabled,false);assert.equal(calls.filter(call=>call.type==='PAIA_CONTEXT_TOPICS_CHANGE').length,beforeChanges+1);assert.deepEqual(await raw(s,'meta',CONTEXT_TOPIC_ACCESS_ROW),saved);assert.equal(await page.leave(),true);
}));


for(const latestFails of [false,true])test(`CTX4-03 saved Topic focus survives a superseding notification read (${latestFails?'failure':'success'})`,()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage();await page.open('inputs');const inputs=page.inputs,id=inputs.order[1],node=inputs.nodes.get(id),entered=deferred(),held=deferred();node.focus();let reads=0;
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_TOPICS_PAGE'){reads++;if(reads===1){const result=await dispatch(message);entered.resolve();await held.promise;return result;}if(latestFails&&reads===2)throw Error('SYNTHETIC_NOTIFICATION_READ_FAILURE');}return dispatch(message);};
 const saving=inputs.toggle(id);document.activeElement=document.body; // Native disabled-button blur.
 await entered.promise;await page.refresh();const expected=latestFails?inputs.status.querySelector('button'):node;
 assert.equal(document.activeElement,expected);held.resolve();assert.equal(await saving,true);assert.equal(document.activeElement,expected,'the superseded save read cannot replace the newest focus result');
 if(latestFails){assert.equal(inputs.failedRead,true);assert.equal(await inputs.refresh(),true);assert.equal(document.activeElement,node);}
 assert.equal(inputs.rows.get(id).enabled,true);assert.equal(inputs.focusIntent,null);
}));

for(const gesture of ['focus','pointer'])test(`CTX4-03 pending Topic focus is cancelled by another control's ${gesture} even if that control later blurs`,()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage();await page.open('inputs');const inputs=page.inputs,id=inputs.order[0],node=inputs.nodes.get(id),other=page.host.querySelector('.context-back'),entered=deferred(),held=deferred();node.focus();let read=0;
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_TOPICS_PAGE'&&++read===1){const result=await dispatch(message);entered.resolve();await held.promise;return result;}return dispatch(message);};
 const saving=inputs.toggle(id);document.activeElement=document.body;await entered.promise;
 if(gesture==='focus')other.focus();else inputs.host.listeners.get('pointerdown')({target:other});
 document.activeElement=document.body;await page.refresh();held.resolve();assert.equal(await saving,true);assert.equal(document.activeElement,document.body);assert.equal(inputs.focusIntent,null);assert.equal(inputs.rows.get(id).enabled,true);
}));

for(const ending of ['leave','close'])test(`CTX4-03 accepted ${ending} cancels saved Topic focus before a held post-save read finishes`,()=>fixture(async({makePage,transport,dispatch})=>{
 const page=makePage();await page.open('inputs');const inputs=page.inputs,id=inputs.order[0],node=inputs.nodes.get(id),entered=deferred(),held=deferred();node.focus();
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_TOPICS_PAGE'){const result=await dispatch(message);entered.resolve();await held.promise;return result;}return dispatch(message);};
 const saving=inputs.toggle(id);document.activeElement=document.body;await entered.promise;assert.ok(inputs.focusIntent);
 if(ending==='leave')assert.equal(await page.leave(),true);else page.close();
 assert.equal(inputs.focusIntent,null);held.resolve();await saving;assert.equal(document.activeElement,document.body);
}));

test('CTX4-03 real Inputs owns its sole pause caption while unavailable Inputs and other cards retain the parent caption',()=>fixture(async({s,cards,makePage})=>{
 const global=(await cards.snapshot()).access.global;await cards.change({kind:'access',key:'global',enabled:false,expectedRevision:global.revision,operationId:op(),epoch:'initial'});
 const page=makePage();await page.open('inputs');assert.equal(page.globalNote.hidden,true);assert.match(page.inputs.note.textContent,/paused.*retained/);
 assert.equal(await page.leave(),true);await page.open('info');assert.equal(page.globalNote.hidden,false);assert.match(page.globalNote.textContent,/paused.*retained/);
 await s.repository.transaction(true,t=>t.put('meta',{id:CONTEXT_TOPIC_ACCESS_ROW,version:2,revision:0,choices:[]}));assert.equal(await page.leave(),true);await page.open('inputs');assert.equal(page.inputs,null);assert.equal(page.globalNote.hidden,false);assert.match(page.globalNote.textContent,/paused.*retained/);
}));


test('CTX4-03 a confirmed conflict followed by a failed read preserves its connected focused Retry',()=>fixture(async({makeInputs,access,transport,dispatch})=>{
 const inputs=await makeInputs();await inputs.refresh();const id=inputs.order[0],node=inputs.nodes.get(id);assert.equal((await access.change(choice(inputs.rows.get(id),inputs.epoch))).ok,true);node.focus();
 transport.dispatch=message=>{if(message.type==='PAIA_CONTEXT_TOPICS_PAGE')throw Error('SYNTHETIC_CONFLICT_READ_FAILURE');return dispatch(message);};
 const saving=inputs.toggle(id);document.activeElement=document.body;assert.equal(await saving,false);const retry=inputs.status.querySelector('button');assert.equal(retry.textContent,'Retry');assert.equal(document.activeElement,retry);assert.equal(retry.isConnected,true);assert.equal(inputs.failedRead,true);
 transport.dispatch=dispatch;assert.equal(await inputs.refresh(),true);assert.equal(inputs.rows.get(id).enabled,true);assert.equal(document.activeElement,node);
}));

test('CTX4-03 a superseded conflict read cannot overwrite a newer read failure or its focus',()=>fixture(async({makeInputs,access,transport,dispatch})=>{
 const inputs=await makeInputs();await inputs.refresh();const id=inputs.order[0],node=inputs.nodes.get(id),entered=deferred(),held=deferred();assert.equal((await access.change(choice(inputs.rows.get(id),inputs.epoch))).ok,true);node.focus();let reads=0;
 transport.dispatch=async message=>{if(message.type==='PAIA_CONTEXT_TOPICS_PAGE'){if(++reads===1){const result=await dispatch(message);entered.resolve();await held.promise;return result;}throw Error('SYNTHETIC_NEWER_READ_FAILURE');}return dispatch(message);};
 const saving=inputs.toggle(id);document.activeElement=document.body;await entered.promise;assert.equal(await inputs.refresh(),false);const retry=inputs.status.querySelector('button'),text=inputs.status.textContent;assert.equal(document.activeElement,retry);
 held.resolve();assert.equal(await saving,false);assert.equal(inputs.status.querySelector('button'),retry);assert.equal(inputs.status.textContent,text);assert.equal(document.activeElement,retry);assert.equal(retry.isConnected,true);
}));


for(const key of ['inputs','global'])for(const phase of ['acknowledgment','snapshot'])test(`CTX4-03 persisted ${key} access and visible content do not certify settled page access at ${phase}`,()=>fixture(async({cards,makePage,transport,dispatch})=>{
 const prior=(await cards.snapshot()).access[key];
 await cards.change({kind:'access',key,enabled:false,expectedRevision:prior.revision,operationId:op(),epoch:'initial'});
 const page=makePage();await page.open(key==='inputs'?'inputs':null);const entered=deferred(),held=deferred();let captured=false;
 transport.dispatch=async message=>{
  const value=await dispatch(message),target=phase==='acknowledgment'?'PAIA_CONTEXT_CARDS_CHANGE':'PAIA_CONTEXT_CARDS_SNAPSHOT';
  if(!captured&&message.type===target){captured=true;entered.resolve();await held.promise;}
  return value;
 };
 const saving=page.toggle(key);
 try{
  await entered.promise;
  assert.equal((await cards.snapshot()).access[key].enabled,true,'actual durable access is already saved');
  if(key==='inputs'){
   assert.equal(page.inputs.root.getAttribute('aria-busy'),'false','previous complete Topic rows remain visible');
   assert.equal(page.inputs.nodes.size,3);assert.ok([...page.inputs.nodes.values()].every(node=>!node.disabled));
   assert.equal([...page.inputs.nodes.values()].filter(node=>node.tabIndex===0).length,1);
  }else assert.equal(page.host.querySelectorAll('.context-card').length,4,'Home cards remain visible before global access settles');
  const header=page.host.querySelector('.context-access');assert.equal(header.disabled,true,'page access owner still holds its operation');
  assert.equal(page.busy,true);assert.equal(await page.leave(),false,'early navigation preserves pending access and stays on the current page');assert.equal(page.page.inert,false);
  held.resolve();await saving;
  assert.equal(page.busy,false);assert.equal(header.disabled,false);assert.equal(header.getAttribute('aria-pressed'),'true');
  assert.equal(await page.leave(),true,'normal navigation succeeds after the same access owner settles');assert.equal(page.page.inert,true);
 }finally{held.resolve();await saving;}
}));

test('CTX4-03 a refused choice stays explained across automatic directory refresh until a new explicit choice',()=>fixture(async({makeInputs,access})=>{
 const inputs=await makeInputs();await inputs.refresh();const id=inputs.order[0];
 assert.equal((await access.change(choice(inputs.rows.get(id),inputs.epoch))).ok,true);
 assert.equal(await inputs.toggle(id),false,'stale revision is refused rather than silently retried');
 const notice=inputs.status.textContent;assert.match(notice,/not saved/);await inputs.refresh();assert.equal(inputs.status.textContent,notice,'background reread cannot erase the refused-action explanation');
 assert.equal(await inputs.toggle(id),true,'a later explicit choice uses the freshly read identity');assert.match(inputs.status.textContent,/Choice saved/);await inputs.refresh();assert.equal(inputs.status.textContent,'','success does not leave a stale refusal');
}));
