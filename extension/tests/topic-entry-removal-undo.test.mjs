import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {PresentationNode,presentationText} from './harness/presentation-dom.mjs';
const uuid=()=>crypto.randomUUID();
async function fixture(run){
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'Synthetic',operationId:uuid()}),entry=await s.continueThinking({topicId:topic.id,body:'Synthetic retained body',operationId:uuid()}),writes=[],state={epoch:'initial',lose:null,hook:null},host=new PresentationNode();
 const old={chrome:globalThis.chrome,document:globalThis.document};
 globalThis.document={getElementById:()=>host,createTextNode:presentationText,createElement:t=>new PresentationNode(t),documentElement:{lang:'zh-CN'}};
 const route=async r=>{if(state.hook)await state.hook(r);if(r.type==='GET_LIBRARY_ENTRY')return {...await s.readingEntry(r.id),recoveryEpoch:state.epoch};if(r.type==='GET_REVISIONS')return s.revisions(r.options);throw Error(r.type);};
 globalThis.chrome={runtime:{sendMessage:async r=>({ok:true,data:await route(r)})}};
 const w=Object.assign(Object.create(TopicController.prototype),{id:topic.id,view:'original',openIntent:1,presentationIntent:1,onStatus:()=>{},flushEditors:async()=>true,refresh:async()=>{},mutate:async(fn,{isCurrent=()=>true}={})=>{try{if(!isCurrent())return;await fn();return isCurrent();}catch{return false;}},checked:async(type,{edit})=>{writes.push({type,edit:structuredClone(edit)});const result=await s[type==='REMOVE_LIBRARY_ENTRY'?'removeEntry':'restoreEntry'](edit);if(result.conflict)throw Error('CONFLICT');if(state.lose===type){state.lose=null;throw Error('OUTCOME_UNKNOWN');}return result;}});
 const undo=async()=>{host.children.find(n=>n.tagName==='BUTTON')?.listeners.get('click')();await Promise.resolve();const deadline=Date.now()+1000;while(w.entryRemovalPending){assert.ok(Date.now()<deadline,'original removal owner must settle');await new Promise(r=>setImmediate(r));}};
 try{await run({s,w,entry,topic,host,writes,state,undo});}finally{Object.assign(globalThis,old);}
}
test('old deletion A Undo cannot restore subsequent deletion B',()=>fixture(async({s,w,entry,undo,writes})=>{
 await w.entryActions(entry.id,null,'delete');const oldUndo=undo;
 await s.restoreEntry({id:entry.id,expectedRevision:(await s.entry(entry.id)).revision,operationId:uuid()});
 await s.removeEntry({id:entry.id,expectedRevision:(await s.entry(entry.id)).revision,operationId:uuid()});
 await oldUndo();assert.equal((await s.entry(entry.id)).lifecycle,'removed');assert.equal(writes.filter(r=>r.type==='RESTORE_LIBRARY_ENTRY').length,0);
}));
test('normal delete and undo preserve exact body through original owners',()=>fixture(async({s,w,entry,undo,writes})=>{
 await w.entryActions(entry.id,null,'delete');assert.equal((await s.entry(entry.id)).lifecycle,'removed');await undo();assert.equal((await s.entry(entry.id)).lifecycle,'active');assert.equal((await s.entry(entry.id)).body,'Synthetic retained body');assert.equal(writes[1].edit.originalRemovalOperationId,writes[0].edit.operationId);assert.equal(writes[1].edit.expectedRecoveryEpoch,'initial');
}));
for(const type of ['REMOVE_LIBRARY_ENTRY','RESTORE_LIBRARY_ENTRY'])test(type+' lost ACK reuses immutable original request',()=>fixture(async({s,w,entry,undo,writes,state})=>{
 if(type==='REMOVE_LIBRARY_ENTRY')state.lose=type;await w.entryActions(entry.id,null,'delete');if(type==='REMOVE_LIBRARY_ENTRY')await undo();else{state.lose=type;await undo();await undo();}
 const requests=writes.filter(r=>r.type===type);assert.equal(requests.length,2);assert.deepEqual(requests[0],requests[1]);assert.equal((await s.entry(entry.id)).revision,type==='REMOVE_LIBRARY_ENTRY'?2:3);
}));
for(const stage of ['remove','restore'])test(stage+' dispatch after epoch replacement cannot write or replay receipt',()=>fixture(async({s,w,entry,undo,writes,state})=>{
 if(stage==='restore')await w.entryActions(entry.id,null,'delete');
 const checked=w.checked;w.checked=async(...args)=>{await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'replaced'}));return checked(...args);};
 const before=await s.entry(entry.id);if(stage==='remove')await w.entryActions(entry.id,null,'delete');else await undo();assert.deepEqual(await s.entry(entry.id),before);
 const edit=writes.at(-1).edit;assert.equal(await s.repository.transaction(false,t=>t.get('operationReceipts',edit.operationId)),undefined);await assert.rejects(()=>s[stage==='remove'?'removeEntry':'restoreEntry'](edit),e=>e.code==='BACKUP_CHANGED');
}));
test('epoch fence precedes already committed receipt replay',()=>fixture(async({s,w,entry,writes})=>{
 await w.entryActions(entry.id,null,'delete');const edit=writes[0].edit;await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'new'}));await assert.rejects(()=>s.removeEntry(edit),e=>e.code==='BACKUP_CHANGED');
}));
test('original restore transaction rejects foreign removal identity with otherwise current revision',()=>fixture(async({s,w,entry,writes})=>{
 await w.entryActions(entry.id,null,'delete');const result=await s.restoreEntry({id:entry.id,expectedRevision:2,expectedRecoveryEpoch:'initial',originalRemovalOperationId:uuid(),operationId:uuid()});assert.equal(result.conflict,true);assert.equal((await s.entry(entry.id)).lifecycle,'removed');
}));
test('journal injection refuses local guard before delegation while old DTO stays compatible',()=>fixture(async({s,entry})=>{
 const calls=[];s.humanLibraryJournal={execute:async(...args)=>{calls.push(args);return {legacy:true};}};
 for(const method of ['removeEntry','restoreEntry'])await assert.rejects(()=>s[method]({id:entry.id,expectedRevision:0,expectedRecoveryEpoch:'initial',operationId:uuid()}),e=>e.code==='BNS_HUMAN_UNSUPPORTED_MUTATION');assert.equal(calls.length,0);
 assert.deepEqual(await s.removeEntry({id:entry.id,expectedRevision:0,operationId:uuid()}),{legacy:true});assert.equal(calls.length,1);s.humanLibraryJournal=null;assert.equal((await s.entry(entry.id)).lifecycle,'active');
}));
for(const mode of ['IME','flush','navigate'])test(mode+' before mutation preserves original Entry',()=>fixture(async({s,w,entry,writes,state})=>{
 if(mode==='IME')w.editor={composing:true};if(mode==='flush')w.flushEditors=async()=>false;if(mode==='navigate')state.hook=async()=>{w.id='elsewhere';w.openIntent++;};await w.entryActions(entry.id,null,'delete');assert.equal(writes.length,0);assert.equal((await s.entry(entry.id)).lifecycle,'active');
}));
test('unknown restore receipt followed by new deletion cannot announce currently restored',()=>fixture(async({s,w,entry,undo,state,host,writes})=>{
 await w.entryActions(entry.id,null,'delete');state.lose='RESTORE_LIBRARY_ENTRY';await undo();const original=writes.at(-1);await s.removeEntry({id:entry.id,expectedRevision:3,operationId:uuid()});await undo();assert.deepEqual(writes.at(-1),original);assert.equal((await s.entry(entry.id)).lifecycle,'removed');assert.match(host.textContent,/不能再从旧按钮撤销/);
}));
test('nine known removals remain usable but unknown attempts are retained',()=>fixture(async({s,w,entry,topic,writes})=>{
 await w.entryActions(entry.id,null,'delete');for(let i=0;i<8;i++){const row=await s.continueThinking({topicId:topic.id,body:'Synthetic '+i,operationId:uuid()});await w.entryActions(row.id,null,'delete');}assert.equal(writes.length,9);assert.equal(w.entryRemovalAttempts.size,8);
 w.entryRemovalAttempts=new Map(Array.from({length:8},(_,i)=>[i,{remove:{operationId:uuid()}}]));const row=await s.continueThinking({topicId:topic.id,body:'Synthetic bounded',operationId:uuid()});await w.entryActions(row.id,null,'delete');assert.equal(writes.length,9);
}));
for(const field of ['expectedRecoveryEpoch','originalRemovalOperationId'])test('local guard '+field+' never reaches journal adapter',()=>fixture(async({s,entry})=>{
 let calls=0;s.humanLibraryJournal={execute:async()=>calls++};await assert.rejects(()=>s.restoreEntry({id:entry.id,expectedRevision:1,operationId:uuid(),[field]:'synthetic-guard'}),e=>e.code==='BNS_HUMAN_UNSUPPORTED_MUTATION');assert.equal(calls,0);
}));
test('same operation cannot be replayed with different local removal identity',()=>fixture(async({s,w,entry,undo,writes})=>{
 await w.entryActions(entry.id,null,'delete');await undo();await assert.rejects(()=>s.restoreEntry({...writes[1].edit,originalRemovalOperationId:uuid()}));assert.equal((await s.entry(entry.id)).revision,3);
}));
test('missing exact original history leaves removal and retry available without a restore write',()=>fixture(async({s,w,entry,undo,writes,state,host})=>{
 await w.entryActions(entry.id,null,'delete');globalThis.chrome.runtime.sendMessage=async r=>({ok:true,data:r.type==='GET_REVISIONS'?{items:[]}:{...await s.readingEntry(r.id),recoveryEpoch:state.epoch}});await undo();assert.equal(writes.length,1);assert.equal((await s.entry(entry.id)).lifecycle,'removed');assert.equal(host.children[0].dataset.entryRemovalRecovery,'undo');
}));
test('late confirmed removal cannot write notice on another route and keeps recovery identity',()=>fixture(async({w,entry,host})=>{
 const checked=w.checked;w.checked=async(...args)=>{const result=await checked(...args);w.id='another';w.openIntent++;return result;};await w.entryActions(entry.id,null,'delete');assert.equal(host.children.length,0);assert.equal(w.entryRemovalAttempts.size,1);
}));
test('unknown storage response after commit retains identical restoration request',()=>fixture(async({s,w,entry,undo,writes})=>{
 await w.entryActions(entry.id,null,'delete');const checked=w.checked;let lost=true;w.checked=async(...args)=>{const result=await checked(...args);if(lost){lost=false;throw Object.assign(Error('STORAGE_FAILED'),{code:'STORAGE_FAILED'});}return result;};await undo();const first=writes.at(-1);assert.equal(w.entryRemovalAttempts.size,1);await undo();assert.deepEqual(writes.at(-1),first);assert.equal((await s.entry(entry.id)).revision,3);
}));
test('receipt failure atomically rolls back restoration and original exact request can retry',()=>fixture(async({s,w,entry,undo,writes})=>{
 await w.entryActions(entry.id,null,'delete');const transaction=s.repository.transaction.bind(s.repository);let failReceipt=true;s.repository.transaction=(write,fn,...rest)=>transaction(write,async t=>{if(!write)return fn(t);const put=t.put.bind(t);t.put=async(name,row)=>{if(name==='operationReceipts'&&failReceipt){failReceipt=false;throw Error('SYNTHETIC_RECEIPT_FAILURE');}return put(name,row);};return fn(t);},...rest);
 await undo();assert.equal((await s.entry(entry.id)).lifecycle,'removed');const first=writes.at(-1);await undo();assert.deepEqual(writes.at(-1),first);assert.equal((await s.entry(entry.id)).lifecycle,'active');
}));
test('concurrent clicks and stale evicted closure cannot issue extra deletion',()=>fixture(async({w,entry,writes})=>{
 let release;w.flushEditors=()=>new Promise(r=>release=r);const active=w.entryActions(entry.id,null,'delete');await Promise.resolve();await w.entryActions(entry.id,null,'delete');release(true);await active;assert.equal(writes.length,1);const attempt=[...w.entryRemovalAttempts.values()][0];w.entryRemovalAttempts.clear();await w.removeEntryWithUndo(entry.id,{attempt,undo:true});assert.equal(writes.length,1);
}));
