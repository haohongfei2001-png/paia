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
   case 'PAIA_CONTEXT_CARDS_SNAPSHOT':return c.snapshot();
   case 'PAIA_CONTEXT_CARDS_CHANGE':return c.change(message.change);
   case 'PAIA_CONTEXT_CARDS_OUTCOME':return c.outcome(message.query);
   case 'PAIA_CONTEXT_CARDS_DRAFTS':{
    const values=[];for(const ref of await recovery.list('context_item')){
     const value=await recovery.load(ref.kind,ref.ownerId);if(!value)continue;
     if(await c.recoveryCommitted(value)){await recovery.clear(ref.kind,ref.ownerId,value.token);continue;}
     await c.recoverySources(value,{stored:true});values.push(value);
    }return values;
   }
   case 'PAIA_RECOVERY_DRAFT_LOAD':{
    const query=message.draft,current=await s.recoveryDraftEpoch();
    assert.equal(query.epoch,current);
    const value=await recovery.load(query.kind,query.ownerId);if(!value)return null;
    if(await c.recoveryCommitted(value)){await recovery.clear(query.kind,query.ownerId,value.token);return null;}
    await c.recoverySources(value,{stored:true});return value;
   }
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


const allStores=s=>s.run(()=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await t.all(name)])))));
const currentItem=async(c,id)=>(await c.snapshot()).items.find(item=>item.id===id);
const finishRecovery=async editor=>{for(let i=0;i<30;i++){await tick();if(!editor.recovery.running&&!editor.recovery.pending)return;}assert.fail('original recovery protection must complete');};

test('original manual committed recovery envelope must not conflict a later legitimate revision on card reopen',()=>fixture(async({s,c,recovery,makePage,transport,dispatch})=>{
 const page=makePage();await page.open('now');await tick();const editor=[...page.editors.values()][0];
 const text='SYNTHETIC now committed through original UI';editor.field.textContent=text;editor.changed();editor.autosave.cancel();await finishRecovery(editor);
 const protectedDraft=await recovery.load('context_item',editor.id);assert.ok(protectedDraft);assert.equal(protectedDraft.operation.change.body,text);
 const savedDispatch=dispatch;let clearFailures=0;
 transport.dispatch=async message=>{if(message.type==='PAIA_RECOVERY_DRAFT_CLEAR'&&message.draft.token===protectedDraft.token){clearFailures++;throw Object.assign(Error('Synthetic original cleanup refusal'),{code:'STORAGE_FAILED'});}return savedDispatch(message);};
 assert.equal(await editor.flush(),true,'the original Context write and acknowledgement actually succeed');
 const first=await currentItem(c,editor.id);assert.equal(first.body,text);assert.equal(first.revision,2);assert.equal(clearFailures,1);assert.ok(await recovery.load('context_item',editor.id));
 const digest=(await import('../core/dedupe.js')).hashText;const receipt=await c.outcome({operationId:protectedDraft.token,digest:await digest(JSON.stringify(protectedDraft.operation.change)),epoch:protectedDraft.epoch});
 assert.equal(receipt.state,'committed');assert.equal(receipt.result.revision,first.revision);
 transport.dispatch=dispatch;
 await c.change({kind:'put',operationId:op(),epoch:'initial',itemId:first.id,expectedRevision:first.revision,body:first.body+' [other card]',section:first.section,card:'now'});
 const later=await currentItem(c,first.id);assert.equal(later.revision,3);assert.equal(later.origin,'manual');
 assert.equal(await c.recoveryCommitted(protectedDraft),true,'exact original manual receipt proves this resident draft is already committed');
 const before=await allStores(s);page.close();const reopened=makePage();await reopened.open('now');await tick();await tick();
 const restored=[...reopened.editors.values()][0];assert.equal(restored.saved.revision,3);assert.deepEqual(await allStores(s),before,'recovery read never rewrites canonical rows');
 console.log('ORIGINAL_MANUAL_RECOVERY_FACT',JSON.stringify({firstRevision:first.revision,laterRevision:later.revision,receipt:receipt.state,sameSavedRevision:restored.saved.revision,conflicted:restored.conflicted,bodyIsCommittedOld:restored.field.textContent===text,clearFailures}));
 assert.equal(restored.conflicted,false,'an exact already-committed manual recovery envelope is not unsaved human work');
 assert.equal(restored.field.textContent,later.body,'current original body remains on reopen');
}));

test('original superseded snapshot during Rules to Now switch cannot admit the old card or revision',()=>fixture(async({c,makePage,transport,dispatch})=>{
 const page=makePage();await page.open();await tick();const held=deferred(),entered=deferred();let captureOnce=true;
 transport.dispatch=async message=>{if(captureOnce&&message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'){captureOnce=false;const actual=await dispatch(message);entered.resolve();await held.promise;return actual;}return dispatch(message);};
 const openingOld=page.open('rules');await entered.promise;
 const old=(await c.snapshot()).items.find(item=>item.card==='now');await c.change({kind:'put',operationId:op(),epoch:'initial',itemId:old.id,expectedRevision:old.revision,body:old.body+' [other card]',section:old.section,card:'now'});
 const openingCurrent=page.open('now');await openingCurrent;held.resolve();await openingOld;await tick();
 assert.equal(page.card,'now');assert.equal(page.renderedCard,'now');assert.equal(page.page.inert,false);assert.equal(page.editors.size,1);
 const e=[...page.editors.values()][0];assert.equal(e.id,old.id);assert.equal(e.saved.revision,2);assert.equal(e.local,old.body+' [other card]');assert.equal(e.conflicted,false);
 e.field.textContent='SYNTHETIC now manual edit';e.changed();e.autosave.cancel();await finishRecovery(e);assert.equal(await e.flush(),true);
 const actual=await currentItem(c,old.id);assert.equal(actual.body,'SYNTHETIC now manual edit');assert.equal(actual.revision,3);
 console.log('ORIGINAL_SUPERSEDED_READ_FACT',JSON.stringify({card:page.card,renderedCard:page.renderedCard,revision:actual.revision,conflicted:e.conflicted}));
}));

test('a real held snapshot followed by a genuine newer Context write retains strict CAS and the rejected draft',()=>fixture(async({s,c,makePage,transport,dispatch,calls})=>{
 const page=makePage();await page.open();await tick();const held=deferred(),entered=deferred();let captureOnce=true;
 transport.dispatch=async message=>{if(captureOnce&&message.type==='PAIA_CONTEXT_CARDS_SNAPSHOT'){captureOnce=false;const actual=await dispatch(message);entered.resolve();await held.promise;return actual;}return dispatch(message);};
 const opening=page.open('now');await entered.promise;const old=(await c.snapshot()).items.find(item=>item.card==='now');
 await c.change({kind:'put',operationId:op(),epoch:'initial',itemId:old.id,expectedRevision:old.revision,body:old.body+' [other card]',section:old.section,card:'now'});
 const latest=await currentItem(c,old.id);held.resolve();await opening;await tick();const editor=[...page.editors.values()][0];assert.equal(editor.saved.revision,1);
 const before=await allStores(s);editor.field.textContent='SYNTHETIC now manual edit';editor.changed();editor.autosave.cancel();await finishRecovery(editor);
 assert.equal(await editor.flush(),false,'original CAS refuses a real intervening writer');assert.equal(editor.conflicted,true);assert.equal(editor.field.textContent,'SYNTHETIC now manual edit');assert.equal(editor.saved.revision,1);
 assert.deepEqual(await allStores(s),before,'conflicting edit writes no canonical row or receipt');assert.deepEqual(await currentItem(c,old.id),latest);
 const changes=calls.filter(message=>message.type==='PAIA_CONTEXT_CARDS_CHANGE');assert.equal(changes.length,1);assert.equal(changes[0].change.expectedRevision,1);
 console.log('ORIGINAL_HELD_READ_CAS_FACT',JSON.stringify({renderedRevision:editor.saved.revision,currentRevision:latest.revision,changes:changes.length,conflicted:editor.conflicted,draftRetained:true}));
}));

test('original two-input protection queue cannot resurrect an already-committed manual draft after ACK clear',()=>fixture(async({s,c,recovery,makePage,transport,dispatch})=>{
 const page=makePage();await page.open('now');await tick();await tick();const editor=[...page.editors.values()][0],held=deferred(),entered=deferred();let first=true;
 transport.dispatch=async message=>{
  if(first&&message.type==='PAIA_RECOVERY_DRAFT_SAVE'&&message.draft.ownerId===editor.id){first=false;const actual=await dispatch(message);entered.resolve();await held.promise;return actual;}
  return dispatch(message);
 };
 // Two input notifications drive the actual PlainTextSurface / protect queue.
 editor.field.textContent='SYNTHETIC now natural-language item';editor.field.listeners.get('input')({inputType:'insertText'});editor.autosave.cancel();await entered.promise;
 editor.field.textContent+='\nSecond line';editor.field.listeners.get('input')({inputType:'insertParagraph'});editor.autosave.cancel();
 assert.ok(editor.recovery.running);assert.ok(editor.recovery.latest);const pendingToken=editor.recovery.latest.token,pendingChange=structuredClone(editor.recovery.latest.operation.change),committedText=editor.field.textContent;
 let flushSettled=false;const flushPromise=editor.flush().finally(()=>{flushSettled=true;});
 for(let i=0;i<30;i++){if((await currentItem(c,editor.id)).body===committedText)break;await tick();}
 const committed=await currentItem(c,editor.id);assert.equal(committed.body,committedText);assert.equal(committed.revision,2);
 const earlyStored=await recovery.load('context_item',editor.id);assert.notEqual(earlyStored?.token,pendingToken,'clear cannot consume a later protection that has not entered yet');
 assert.equal(flushSettled,false,'original save completion waits its actual queued draft cleanup');
 held.resolve();assert.equal(await flushPromise,true);await finishRecovery(editor);const resurrected=await recovery.load('context_item',editor.id);
 assert.equal(resurrected,null,'ACK cleanup consumes the actual committed protection after drain');
 const {hashText}=await import('../core/dedupe.js'),outcome=await c.outcome({operationId:pendingToken,digest:await hashText(JSON.stringify(pendingChange)),epoch:'initial'});
 assert.equal(outcome.state,'committed');assert.equal(outcome.result.revision,2);
 await c.change({kind:'put',operationId:op(),epoch:'initial',itemId:committed.id,expectedRevision:committed.revision,body:committed.body+' [other card]',section:committed.section,card:'now'});
 const later=await currentItem(c,editor.id),before=await allStores(s);page.close();const reopened=makePage();await reopened.open('now');await tick();await tick();const restored=[...reopened.editors.values()][0];
 assert.deepEqual(await allStores(s),before);assert.equal(restored.saved.revision,later.revision);
 console.log('ORIGINAL_PROTECTION_QUEUE_FACT',JSON.stringify({commitRevision:committed.revision,currentRevision:later.revision,pendingOriginally:true,receipt:outcome.state,committedDraftRemoved:resurrected===null,conflicted:restored.conflicted,bodyIsCommittedOld:restored.field.textContent===committedText}));
 assert.equal(await recovery.load('context_item',editor.id),null,'ACK cleanup must finish after all actual queued protection writes, not before them');
 assert.equal(restored.conflicted,false,'original confirmed work cannot return as a fake unsaved conflict');
}));

test('old original ACK discard waits protection and cannot erase a newer token before its actual write',()=>fixture(async({c,recovery,makePage,transport,dispatch})=>{
 const page=makePage();await page.open('now');await tick();await tick();const editor=[...page.editors.values()][0],held=deferred(),entered=deferred(),secondWrite=deferred(),secondEntered=deferred();let first=true,blockSecond=false,newerToken,oldToken,clearSawNewer=false;
 transport.dispatch=async message=>{
  if(first&&message.type==='PAIA_RECOVERY_DRAFT_SAVE'&&message.draft.ownerId===editor.id){first=false;const actual=await dispatch(message);entered.resolve();await held.promise;return actual;}
  if(message.type==='PAIA_RECOVERY_DRAFT_CLEAR'&&message.draft.token===oldToken){const stored=await recovery.load('context_item',editor.id);assert.equal(stored.token,newerToken);const result=await dispatch(message);assert.equal(result,false);assert.equal((await recovery.load('context_item',editor.id)).token,newerToken);clearSawNewer=true;return result;}
  if(blockSecond&&message.type==='PAIA_CONTEXT_CARDS_CHANGE'&&message.change.operationId===newerToken){secondEntered.resolve();await secondWrite.promise;}
  return dispatch(message);
 };
 editor.field.textContent='SYNTHETIC older committed text';editor.changed();editor.autosave.cancel();await entered.promise;oldToken=editor.recovery.runningItem.token;
 const saving=editor.flush();for(let i=0;i<30;i++){if((await currentItem(c,editor.id)).revision===2)break;await tick();}assert.equal((await currentItem(c,editor.id)).revision,2);
 editor.field.textContent='SYNTHETIC newer still protected draft';editor.changed();editor.autosave.cancel();newerToken=editor.recovery.latest.token;assert.notEqual(newerToken,oldToken);blockSecond=true;
 held.resolve();await secondEntered.promise;assert.equal(clearSawNewer,true);assert.equal((await recovery.load('context_item',editor.id)).token,newerToken);assert.equal((await currentItem(c,editor.id)).body,'SYNTHETIC older committed text');
 secondWrite.resolve();assert.equal(await saving,true);assert.equal((await currentItem(c,editor.id)).body,'SYNTHETIC newer still protected draft');assert.equal((await currentItem(c,editor.id)).revision,3);assert.equal(await recovery.load('context_item',editor.id),null);
}));

test('original discard cleanup refusal preserves the exact protected draft and original committed body',()=>fixture(async({c,recovery,makePage,transport,dispatch})=>{
 const page=makePage();await page.open('now');await tick();await tick();const editor=[...page.editors.values()][0];editor.field.textContent='SYNTHETIC committed cleanup refusal';editor.changed();editor.autosave.cancel();await finishRecovery(editor);const protectedDraft=await recovery.load('context_item',editor.id);
 transport.dispatch=async message=>{if(message.type==='PAIA_RECOVERY_DRAFT_CLEAR'&&message.draft.token===protectedDraft.token)throw Object.assign(Error('Synthetic cleanup refusal'),{code:'STORAGE_FAILED'});return dispatch(message);};
 assert.equal(await editor.flush(),true,'a cleanup refusal never pretends the original successful Context transaction failed');assert.equal((await currentItem(c,editor.id)).body,protectedDraft.operation.change.body);assert.deepEqual(await recovery.load('context_item',editor.id),protectedDraft);assert.equal(editor.recovery.currentToken,protectedDraft.token);
}));
