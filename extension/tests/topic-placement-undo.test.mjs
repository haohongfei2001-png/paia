import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
const uuid=()=>crypto.randomUUID();
async function fixture(run){
 const {s}=await setup(OrganizerStore),a=await s.createTopic({name:'SYNTHETIC A',operationId:uuid()}),b=await s.createTopic({name:'SYNTHETIC B',operationId:uuid()}),entry=await s.continueThinking({topicId:a.id,body:'Synthetic retained canonical text',operationId:uuid()});
 await s.placeEntry({topicId:b.id,entryId:entry.id,expectedEntryRevision:(await s.entry(entry.id)).revision,expectedTopicRevision:(await s.topic(b.id)).organizationRevision,operationId:uuid()});
 const placement=await s.libraryPlacement(a.id,entry.id),writes=[],notices=[],status=[],old=globalThis.chrome;
 const state={epoch:'synthetic-original-epoch',lose:null,hook:null,history:null};
 await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:state.epoch}));
 const route=async r=>{
  if(state.hook)await state.hook(r);
  if(r.type==='GET_LIBRARY_TOPIC')return {...await s.topic(r.id),recoveryEpoch:state.epoch};
  if(r.type==='GET_LIBRARY_ENTRY')return s.entry(r.id);
  if(r.type==='GET_LIBRARY_PLACEMENT')return s.libraryPlacement(r.topicId,r.entryId);
  if(r.type==='GET_REVISIONS')return state.history??s.revisions(r.options);
  throw Error(r.type);
 };
 globalThis.chrome={runtime:{sendMessage:async r=>({ok:true,data:await route(r)})}};
 const w=Object.assign(Object.create(TopicController.prototype),{id:a.id,view:'original',openIntent:1,presentationIntent:1,flushEditors:async()=>true,onStatus:(...args)=>status.push(args),placementRecoveryNotice:(attempt,current)=>{if(current())notices.push(attempt);},mutate:async(fn,{isCurrent})=>{try{if(!isCurrent())return;await fn();return isCurrent();}catch{return false;}},checked:async(type,dto,current)=>{
  writes.push({type,...structuredClone(dto)});const result=type==='PLACE_LIBRARY_ENTRY'?await s.placeEntry(dto.placement):await s.restoreRemovedPlacement(dto.edit);
  if(result.conflict)throw Error('CONFLICT');
  if(state.lose===type){state.lose=null;throw Error('OUTCOME_UNKNOWN');}
  return result;
 }});
 try{await run({s,w,a,b,entry,placement,writes,notices,status,state,attempt:()=>w.placementRecoveryAttempts.get(JSON.stringify([a.id,entry.id]))});}finally{globalThis.chrome=old;}
}
test('actual remove and immediate typed undo preserve body and other placement',()=>fixture(async({s,w,a,b,entry,placement,writes,attempt})=>{
 const body=(await s.entry(entry.id)).body,other=await s.libraryPlacement(b.id,entry.id);
 await w.entryActions(entry.id,placement,'removeTopic');assert.equal((await s.libraryPlacement(a.id,entry.id)).lifecycle,'removed');
 await w.removeTopicPlacement(entry.id,placement,{attempt:attempt(),undo:true});
 assert.equal(writes[1].type,'RESTORE_LIBRARY_PLACEMENT');assert.equal((await s.libraryPlacement(a.id,entry.id)).lifecycle,'active');assert.equal((await s.entry(entry.id)).body,body);assert.deepEqual(await s.libraryPlacement(b.id,entry.id),other);assert.equal(w.placementRecoveryAttempts.size,0);
}));
for(const type of ['PLACE_LIBRARY_ENTRY','RESTORE_LIBRARY_PLACEMENT'])test(type+' lost ACK retries identical DTO through original receipt',()=>fixture(async({s,w,a,entry,placement,writes,attempt,state})=>{
 if(type==='PLACE_LIBRARY_ENTRY')state.lose=type;
 await w.entryActions(entry.id,placement,'removeTopic');
 if(type==='PLACE_LIBRARY_ENTRY'){await w.removeTopicPlacement(entry.id,placement,{attempt:attempt()});assert.deepEqual(writes[1],writes[0]);}
 else{state.lose=type;await w.removeTopicPlacement(entry.id,placement,{attempt:attempt(),undo:true});const original=writes.at(-1);await w.removeTopicPlacement(entry.id,placement,{attempt:attempt(),undo:true});assert.deepEqual(writes.at(-1),original);}
 assert.equal((await s.libraryPlacement(a.id,entry.id)).revision,type==='PLACE_LIBRARY_ENTRY'?placement.revision+1:placement.revision+2);
}));
for(const mode of ['history-missing','foreign-history','epoch','entry-deleted','placement-replaced'])test('undo refuses '+mode+' without fallback writer',()=>fixture(async({s,w,a,entry,placement,writes,attempt,state})=>{
 await w.entryActions(entry.id,placement,'removeTopic');
 if(mode==='history-missing')state.history={items:[]};
 if(mode==='foreign-history'){state.history=await s.revisions({kind:'placement',entityId:placement.id,documentId:a.id});state.history.items.forEach(row=>row.operationId=uuid());}
 if(mode==='epoch'){state.epoch=uuid();await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:state.epoch}));}
 if(mode==='entry-deleted')await s.removeEntry({id:entry.id,expectedRevision:(await s.entry(entry.id)).revision,operationId:uuid()});
 if(mode==='placement-replaced')await s.repository.transaction(true,async t=>{const row=await t.get('placements',placement.id);row.revision++;await t.put('placements',row);});
 await w.removeTopicPlacement(entry.id,placement,{attempt:attempt(),undo:true});assert.equal(writes.length,1);assert.equal((await s.libraryPlacement(a.id,entry.id)).lifecycle,'removed');
}));
for(const mode of ['flush','read','history'])test('navigation during '+mode+' cannot write or install late notice',()=>fixture(async({w,entry,placement,writes,notices,attempt,state})=>{
 if(mode==='history')await w.entryActions(entry.id,placement,'removeTopic');
 const before=writes.length,oldNotices=notices.length;
 const leave=()=>{w.id='different';w.openIntent++;};
 if(mode==='flush')w.flushEditors=async()=>{leave();return true;};
 else state.hook=async r=>{if(r.type===(mode==='history'?'GET_REVISIONS':'GET_LIBRARY_ENTRY'))leave();};
 await w.removeTopicPlacement(entry.id,placement,{attempt:mode==='history'?attempt():null,undo:mode==='history'});assert.equal(writes.length,before);assert.equal(notices.length,oldNotices);
}));
test('late successful remove ACK keeps exact outcome but cannot announce in another Topic',()=>fixture(async({w,entry,placement,notices})=>{const checked=w.checked;w.checked=async(...args)=>{const r=await checked(...args);w.id='other';w.openIntent++;return r;};await w.entryActions(entry.id,placement,'removeTopic');assert.equal(notices.length,0);assert.equal(w.placementRecoveryAttempts.size,1);}));
test('confirmed operations can be evicted but eight uncertain attempts cannot',()=>fixture(async({w,entry,placement,writes})=>{
 w.placementRecoveryAttempts=new Map(Array.from({length:8},(_,i)=>['old'+i,{result:{id:'old'+i}}]));await w.entryActions(entry.id,placement,'removeTopic');assert.equal(writes.length,1);assert.equal(w.placementRecoveryAttempts.size,8);
 w.placementRecoveryAttempts=new Map(Array.from({length:8},(_,i)=>['unknown'+i,{remove:{operationId:'unknown'+i}}]));await w.entryActions(entry.id,placement,'removeTopic');assert.equal(writes.length,1);assert.equal(w.placementRecoveryAttempts.size,8);
}));
for(const mode of ['IME','dirty','duplicate'])test(mode+' cannot issue additional placement writes',()=>fixture(async({w,entry,placement,writes})=>{
 if(mode==='IME')w.editor={composing:true};
 if(mode==='dirty')w.flushEditors=async()=>false;
 if(mode==='duplicate'){let release;w.flushEditors=()=>new Promise(r=>release=r);const active=w.entryActions(entry.id,placement,'removeTopic');await Promise.resolve();await w.entryActions(entry.id,placement,'removeTopic');release(true);await active;assert.equal(writes.length,1);return;}
 await w.entryActions(entry.id,placement,'removeTopic');assert.equal(writes.length,0);
}));
test('nine sequential confirmed removals remain usable without losing unknown slots',()=>fixture(async({s,w,a,entry,placement,writes})=>{
 await w.entryActions(entry.id,placement,'removeTopic');
 for(let i=0;i<8;i++){const e=await s.continueThinking({topicId:a.id,body:'Synthetic '+i,operationId:uuid()});await w.entryActions(e.id,await s.libraryPlacement(a.id,e.id),'removeTopic');}
 assert.equal(writes.length,9);assert.equal(w.placementRecoveryAttempts.size,8);
}));
test('definitive stale removal releases attempt and never provides success Undo',()=>fixture(async({s,w,entry,placement,attempt,writes})=>{
 const checked=w.checked;w.checked=async()=>{throw Error('CONFLICT');};await w.entryActions(entry.id,placement,'removeTopic');assert.equal(attempt(),undefined);assert.equal((await s.entry(entry.id)).lifecycle,'active');w.checked=checked;await w.entryActions(entry.id,placement,'removeTopic');assert.equal(writes.length,1);
}));
test('restore epoch invalidates unknown removal without replay',()=>fixture(async({s,w,entry,placement,attempt,state,writes})=>{
 state.lose='PLACE_LIBRARY_ENTRY';await w.entryActions(entry.id,placement,'removeTopic');const original=attempt();state.epoch=uuid();await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:state.epoch}));await w.removeTopicPlacement(entry.id,placement,{attempt:original});assert.equal(writes.length,1);assert.equal(original.invalidated,true);
}));
test('changed Topic between Undo read and original transaction fails closed without a replacement request',()=>fixture(async({s,w,a,entry,placement,attempt,writes})=>{
 await w.entryActions(entry.id,placement,'removeTopic');const checked=w.checked;w.checked=async(type,...args)=>{if(type==='RESTORE_LIBRARY_PLACEMENT')await s.continueThinking({topicId:a.id,body:'Concurrent human body',operationId:uuid()});return checked(type,...args);};await w.removeTopicPlacement(entry.id,placement,{attempt:attempt(),undo:true});assert.equal((await s.libraryPlacement(a.id,entry.id)).lifecycle,'removed');assert.equal(attempt(),undefined);assert.equal(writes.length,2);
}));
test('real notice supplies scope-guarded explicit Undo and truthful unresolved state',async()=>{
 const {PresentationNode,presentationText}=await import('./harness/presentation-dom.mjs');const old=globalThis.document,host=new PresentationNode();globalThis.document={getElementById:()=>host,createTextNode:presentationText,createElement:t=>new PresentationNode(t),documentElement:{lang:'zh-CN'}};
 try{const w=Object.create(TopicController.prototype),calls=[];w.removeTopicPlacement=(...args)=>calls.push(args);let current=true;const attempt={entryId:'entry',original:{topicId:'topic'},result:{}};w.placementRecoveryNotice(attempt,()=>current);assert.equal(host.children[0].dataset.placementRecovery,'undo');host.children[0].listeners.get('click')();await new Promise(r=>setImmediate(r));assert.equal(calls.length,1);assert.equal(calls[0][2].undo,true);const before=host.textContent;current=false;w.placementRecoveryNotice({result:null},()=>current);assert.equal(host.textContent,before);current=true;w.placementRecoveryNotice({...attempt,result:null},()=>current);assert.equal(host.dataset.state,'failed');assert.equal(host.children[0].dataset.placementRecovery,'reconcile');w.placementRecoveryNotice({...attempt,restore:{operationId:'pending'}},()=>true);assert.equal(host.dataset.state,'failed');assert.match(host.textContent,/撤销结果尚未确认/);assert.equal(host.children[0].dataset.placementRecovery,'undo');w.onStatus=()=>{};w.placementRecoveryNotice({...attempt,restoreRejected:true},()=>true);assert.equal(host.children.length,0);assert.match(host.textContent,/此次撤销未保存/);}finally{globalThis.document=old;}
});
test('externally restored relationship can be removed again without reusing confirmed old removal',()=>fixture(async({s,w,a,entry,placement,attempt,writes})=>{
 await w.entryActions(entry.id,placement,'removeTopic');const original=attempt(),row=(await s.removedPlacements()).items.find(x=>x.topicId===a.id);
 await s.restoreRemovedPlacement({id:row.id,historyId:row.historyId,recoveryEpoch:row.recoveryEpoch,expectedRevision:row.revision,expectedEntryRevision:row.entryRevision,expectedTopicRevision:row.topicRevision,operationId:uuid()});
 await w.entryActions(entry.id,await s.libraryPlacement(a.id,entry.id),'removeTopic');assert.equal(writes.length,2);assert.notEqual(writes[1].placement.operationId,original.remove.operationId);assert.equal((await s.libraryPlacement(a.id,entry.id)).lifecycle,'removed');
}));
for(const code of ['CONFLICT','INVALID_REQUEST','SOURCE_UNAVAILABLE','STALE_BASE','STORAGE_FULL','STORAGE_FAILED'])test('definite Undo '+code+' releases slot without replaying stale button',()=>fixture(async({w,entry,placement,attempt,writes})=>{
 await w.entryActions(entry.id,placement,'removeTopic');const active=attempt(),checked=w.checked;let rejected=0;w.checked=async(type,...args)=>{if(type==='RESTORE_LIBRARY_PLACEMENT'){rejected++;throw Object.assign(Error(code),{code});}return checked(type,...args);};
 await w.removeTopicPlacement(entry.id,placement,{attempt:active,undo:true});assert.equal(attempt(),undefined);assert.equal(active.restoreRejected,true);await w.removeTopicPlacement(entry.id,placement,{attempt:active,undo:true});assert.equal(rejected,1);assert.equal(writes.length,1);
}));
