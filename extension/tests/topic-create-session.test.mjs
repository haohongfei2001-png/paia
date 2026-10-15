import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {PresentationNode,presentationText} from './harness/presentation-dom.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(run){
 const {s}=await setup(OrganizerStore),writes=[],forms=[],opens=[],statuses=[],host=new PresentationNode(),state={lose:false,hook:null,name:'Synthetic new topic'};
 const old={chrome:globalThis.chrome,document:globalThis.document};
 globalThis.document={getElementById:()=>host,createElement:t=>new PresentationNode(t),createTextNode:presentationText,documentElement:{lang:'zh-CN'}};
 globalThis.chrome={runtime:{sendMessage:async r=>{if(state.hook)await state.hook(r);if(r.type==='GET_LIBRARY_FOUNDATION_STATUS')return {ok:true,data:await s.libraryStatus()};if(r.type==='GET_LIBRARY_TOPIC')return {ok:true,data:{...await s.topic(r.id),recoveryEpoch:await s.recoveryDraftEpoch()}};throw Error(r.type);}}};
 const w=Object.assign(Object.create(TopicController.prototype),{id:null,view:'original',openIntent:1,presentationIntent:1,statusEpoch:0,flushEditors:async()=>true,onStatus:(...a)=>statuses.push(a),form:async(...a)=>{forms.push(a);return {name:state.name};},open:async id=>{opens.push(id);w.id=id;w.openIntent++;},mutate:async(fn,{isCurrent=()=>true}={})=>{try{if(!isCurrent())return;await fn();return isCurrent();}catch{return false;}},checked:async(type,{topic})=>{assert.equal(type,'CREATE_LIBRARY_TOPIC');writes.push(structuredClone(topic));const r=await s.createTopic(topic);if(state.lose){state.lose=false;throw Error('OUTCOME_UNKNOWN');}return r;}});
 const rows=()=>s.repository.transaction(false,t=>t.all('topics'));
 try{await run({s,w,writes,forms,opens,statuses,state,host,rows});}finally{Object.assign(globalThis,old);}
}
test('lost create ACK reconciles exact operation/name and creates one real Topic',()=>fixture(async({w,writes,forms,opens,state,rows})=>{
 state.lose=true;await w.createTopic();assert.equal(opens.length,0);state.name='Changed name must not replace request';await w.createTopic();assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);assert.equal(forms.length,1);assert.equal((await rows()).length,1);assert.equal(opens.length,1);
}));
test('late create ACK does not navigate B; later explicit action reconciles known result without another create',()=>fixture(async({w,writes,opens,rows})=>{
 const entered=deferred(),held=deferred(),checked=w.checked;w.checked=async(...a)=>{const r=await checked(...a);entered.resolve();await held.promise;return r;};const p=w.createTopic();await entered.promise;w.id='B';w.openIntent++;held.resolve();await p;assert.deepEqual(opens,[]);assert.equal(w.id,'B');assert.equal((await rows()).length,1);await w.createTopic();assert.equal(writes.length,1);assert.equal(opens.length,1);
}));
for(const stage of ['flush','status','form','ack','qualification'])test('route changes during '+stage+' do not take over or show stale form',()=>fixture(async({w,forms,writes,opens,state})=>{
 const move=()=>{w.id='B';w.openIntent++;};
 if(stage==='flush')w.flushEditors=async()=>{move();return true;};
 if(stage==='status'||stage==='qualification')state.hook=async r=>{if(r.type===(stage==='status'?'GET_LIBRARY_FOUNDATION_STATUS':'GET_LIBRARY_TOPIC'))move();};
 if(stage==='form'){const f=w.form;w.form=async(...a)=>{const r=await f(...a);move();return r;};}
 if(stage==='ack'){const f=w.checked;w.checked=async(...a)=>{const r=await f(...a);move();return r;};}
 await w.createTopic();assert.equal(opens.length,0);assert.equal(writes.length,['ack','qualification'].includes(stage)?1:0);if(['flush','status'].includes(stage))assert.equal(forms.length,0);
}));
for(const mode of ['IME','failed flush','form IME','cancel','blank','too long','invalid name'])test('create refuses '+mode+' without writes',()=>fixture(async({w,writes,state})=>{
 if(mode==='IME')w.editor={composing:true};if(mode==='failed flush')w.flushEditors=async()=>false;if(mode==='form IME'){const f=w.form;w.form=async(...a)=>{const r=await f(...a);w.dialogEditor={composing:true};return r;};}if(mode==='cancel')w.form=async()=>null;if(mode==='blank')state.name=' ';if(mode==='too long')state.name='x'.repeat(301);if(mode==='invalid name')state.name=17;await w.createTopic();assert.equal(writes.length,0);assert.notEqual(w.topicCreationPending,true);
}));
test('duplicate click during held form invokes one form and writer',()=>fixture(async({w,forms,writes})=>{
 const entered=deferred(),held=deferred(),form=w.form;w.form=async(...a)=>{const value=await form(...a);entered.resolve();await held.promise;return value;};const p=w.createTopic();await entered.promise;await w.createTopic();held.resolve();await p;assert.equal(forms.length,1);assert.equal(writes.length,1);
}));
test('epoch changed after UI qualification rejects queued create atomically',()=>fixture(async({s,w,writes,rows,opens})=>{
 const f=w.checked;w.checked=async(...a)=>{await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'restored'}));return f(...a);};await w.createTopic();assert.equal((await rows()).length,0);assert.equal(opens.length,0);assert.equal(await s.repository.transaction(false,t=>t.get('operationReceipts',writes[0].operationId)),undefined);
}));
test('unknown create is never replayed into a restored epoch and name is retained for new confirmation',()=>fixture(async({s,w,state,writes,forms,opens})=>{
 state.lose=true;await w.createTopic();await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'restored'}));await w.createTopic();assert.equal(writes.length,1);assert.equal(opens.length,0);assert.equal(w.topicCreationDraft.name,state.name);assert.equal(w.topicCreationDraft.attempt,null);await w.createTopic();assert.equal(forms[1][1][0].value,state.name);assert.equal(writes[1].expectedRecoveryEpoch,'restored');assert.notEqual(writes[0].operationId,writes[1].operationId);
}));
for(const kind of ['epoch','redirect','removed'])test('receipt followed by '+kind+' cannot navigate to stale container',()=>fixture(async({s,w,state,opens})=>{
 state.hook=async r=>{if(r.type!=='GET_LIBRARY_TOPIC')return;if(kind==='epoch')await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'restored'}));if(kind==='removed')throw Error('NOT_FOUND');if(kind==='redirect')chrome.runtime.sendMessage=async()=>({ok:true,data:{id:'survivor',recoveryEpoch:'initial'}});};
 if(kind==='redirect'){const f=w.checked;w.checked=async(...a)=>{const r=await f(...a);chrome.runtime.sendMessage=async()=>({ok:true,data:{id:'survivor',recoveryEpoch:'initial'}});return r;};}
 await w.createTopic();assert.equal(opens.length,0);if(kind==='removed')assert.ok(w.topicCreationDraft.result);else assert.equal(w.topicCreationDraft.attempt,null);
}));
test('original mutate/leaveEditors own epoch increment permits normal create',()=>fixture(async({w,writes,opens})=>{
 Object.assign(w,{mutate:TopicController.prototype.mutate,leave:TopicController.prototype.leave,leaveEditors:TopicController.prototype.leaveEditors,rememberTimeline:()=>{},rememberView:()=>{},cancelTopicRestore:()=>{},readRetry:{hidden:false},setBusy:()=>{},refresh:async()=>{},resetHomeCollection:()=>{}});await w.createTopic();assert.equal(writes.length,1);assert.equal(opens.length,1);assert.equal(w.statusEpoch,1);
}));
test('post-commit refresh epoch replacement prevents navigation',()=>fixture(async({s,w,opens})=>{
 const mutate=w.mutate;w.mutate=async(...a)=>{const r=await mutate(...a);await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'restored'}));return r;};await w.createTopic();assert.equal(opens.length,0);
}));
test('owner epoch fence rejects old receipt replay and immutable guard changes',()=>fixture(async({s})=>{
 const req={name:'Guarded',operationId:crypto.randomUUID(),expectedRecoveryEpoch:'initial'},result=await s.createTopic(req);assert.deepEqual(await s.createTopic(req),result);await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'new'}));await assert.rejects(()=>s.createTopic(req),e=>e.code==='BACKUP_CHANGED');await assert.rejects(()=>s.createTopic({...req,expectedRecoveryEpoch:'new'}));
}));
test('journal guard refuses before delegation and legacy request stays compatible',()=>fixture(async({s})=>{
 const calls=[];s.humanLibraryJournal={execute:async(...a)=>{calls.push(a);return {legacy:true};}};await assert.rejects(()=>s.createTopic({name:'Guarded',operationId:crypto.randomUUID(),expectedRecoveryEpoch:'initial'}),e=>e.code==='BNS_HUMAN_UNSUPPORTED_MUTATION');assert.equal(calls.length,0);assert.deepEqual(await s.createTopic({name:'Legacy',operationId:crypto.randomUUID()}),{legacy:true});assert.equal(calls.length,1);
}));

test('confirmed create subsequently removed retires recovery only and requires explicit new form',()=>fixture(async({s,w,state,forms,writes,opens})=>{
 const checked=w.checked;w.checked=async(...a)=>{const r=await checked(...a);await s.removeTopic({id:r.id,expectedRevision:0,operationId:crypto.randomUUID()});return r;};await w.createTopic();assert.equal(opens.length,0);assert.equal(w.topicCreationDraft.attempt,null);assert.equal(writes.length,1);w.checked=checked;await w.createTopic();assert.equal(forms.length,2);assert.equal(forms[1][1][0].value,state.name);assert.equal(writes.length,2);assert.notEqual(writes[0].operationId,writes[1].operationId);
}));
test('transient post-commit read failure retries read without a second create or lost name',()=>fixture(async({w,state,writes,forms,opens})=>{
 state.hook=async r=>{if(r.type==='GET_LIBRARY_TOPIC')throw Error('temporarily unavailable');};await w.createTopic();assert.ok(w.topicCreationDraft.result);state.hook=null;await w.createTopic();assert.equal(writes.length,1);assert.equal(forms.length,1);assert.equal(opens.length,1);
}));
test('compatibility post-create transaction cannot mutate a replacement epoch',()=>fixture(async({s})=>{
 const original=s.foundationWrite.bind(s);let replaced=false;
 s.foundationWrite=async fn=>{if(!replaced){replaced=true;await s.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'new'}));}return original(fn);};
 await assert.rejects(()=>s.createTopic({name:'Guarded compatibility',operationId:crypto.randomUUID(),expectedRecoveryEpoch:'initial'}),e=>e.code==='BACKUP_CHANGED');
}));
for(const value of ['',42,'x'.repeat(201)])test('create rejects malformed optional epoch '+typeof value,()=>fixture(async({s,rows})=>{
 await assert.rejects(()=>s.createTopic({name:'Invalid guard',operationId:crypto.randomUUID(),expectedRecoveryEpoch:value}));assert.equal((await rows()).length,0);
}));
