import test from 'node:test';import assert from 'node:assert/strict';import {SettingsAssistState} from '../ui/settings-assist-state.js';
import {mountSettingsAssist} from '../ui/settings-assist.js';import {PresentationNode} from './harness/presentation-dom.mjs';
const snapshot=(fields={})=>({replyAccess:false,remoteProcessing:false,serviceAvailable:true,generation:'g1',...fields});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('read-only opening and two independent ACK-bound controls with generation CAS',async()=>{const calls=[],held=deferred();const s=new SettingsAssistState({send:async(type,fields)=>{calls.push({type,fields});return type.endsWith('STATUS')?snapshot():held.promise;}});await s.load();const pending=s.configure('replyAccess',true);assert.equal(s.value.replyAccess,false);assert.equal(s.busy,true);held.resolve(snapshot({replyAccess:true,generation:'g2'}));assert.equal(await pending,true);assert.deepEqual(calls[1],{type:'PAIA_PROMPT_ASSIST_CONFIGURE',fields:{replyAccess:true,remoteProcessing:false,expectedGeneration:'g1',consentVersion:2}});assert.equal(s.value.remoteProcessing,false);});
test('configuring remote permission preserves the current independently acknowledged reply control',async()=>{const calls=[],s=new SettingsAssistState({send:async(type,fields)=>{calls.push({type,fields});return type.endsWith('STATUS')?snapshot({replyAccess:true}):snapshot({replyAccess:true,remoteProcessing:true,generation:'g2'});}});await s.load();assert.equal(await s.configure('remoteProcessing',true),true);assert.deepEqual(calls.at(-1).fields,{replyAccess:true,remoteProcessing:true,expectedGeneration:'g1',consentVersion:2});});
test('stale generation refusal only rereads and does not replay an enable',async()=>{const calls=[],s=new SettingsAssistState({send:async(type,fields)=>{calls.push({type,fields});if(type.endsWith('CONFIGURE'))throw Error('STALE_BASE');return snapshot({generation:calls.length===1?'g1':'revoked'});}});await s.load();assert.equal(await s.configure('remoteProcessing',true),false);assert.equal(s.value.remoteProcessing,false);assert.equal(s.value.generation,'revoked');assert.equal(calls.filter(x=>x.type.endsWith('CONFIGURE')).length,1);assert.equal(s.feedback,'save-error');});
test('lost ACK rereads actual state but retains explicit save failure',async()=>{let enabled=false;const s=new SettingsAssistState({send:async type=>{if(type.endsWith('CONFIGURE')){enabled=true;throw Error('lost');}return snapshot({replyAccess:enabled});}});await s.load();assert.equal(await s.configure('replyAccess',true),false);assert.equal(s.value.replyAccess,true);assert.equal(s.feedback,'save-error');});
test('unknown state disables controls and never infers successful enable',async()=>{let fail=false;const s=new SettingsAssistState({send:async()=>{if(fail)throw Error('offline');return snapshot();}});await s.load();fail=true;assert.equal(await s.configure('replyAccess',true),false);assert.equal(s.value.replyAccess,false);assert.equal(s.editable,false);});
test('a stale load cannot overwrite newer configuration ACK',async()=>{const held=deferred();let n=0;const s=new SettingsAssistState({send:async type=>type.endsWith('CONFIGURE')?snapshot({replyAccess:true,generation:'g2'}):++n===1?snapshot():held.promise});await s.load();const reading=s.load();await s.configure('replyAccess',true);held.resolve(snapshot());await reading;assert.equal(s.value.replyAccess,true);});
test('notification while saving refreshes the final independent revocation',async()=>{const held=deferred();let current=snapshot();const s=new SettingsAssistState({send:async type=>type.endsWith('CONFIGURE')?held.promise:current});await s.load();const save=s.configure('replyAccess',true);await s.load();current=snapshot({generation:'revoked'});held.resolve(snapshot({replyAccess:true,generation:'g2'}));await save;assert.deepEqual(s.value,current);});
test('a malformed or mismatching ACK cannot confirm either permission',async()=>{let n=0;const s=new SettingsAssistState({send:async type=>type.endsWith('CONFIGURE')?snapshot({replyAccess:true,remoteProcessing:true}):snapshot({generation:String(++n)})});await s.load();assert.equal(await s.configure('replyAccess',true),false);assert.equal(s.value.replyAccess,false);assert.equal(s.value.remoteProcessing,false);assert.equal(s.feedback,'save-error');});

for(const field of ['replyAccess','remoteProcessing'])test(`queued revocation keeps ${field} ACK noneditable until authority settles`,async()=>{
 const write=deferred(),read=deferred(),reading=deferred(),calls=[],seen=[];let reads=0;
 const s=new SettingsAssistState({changed:state=>seen.push({editable:state.editable,generation:state.value?.generation}),send:async(type,fields)=>{calls.push({type,fields});if(type.endsWith('CONFIGURE'))return write.promise;if(++reads===1)return snapshot();reading.resolve();return read.promise;}});
 await s.load();const save=s.configure(field,true);await s.load();write.resolve(snapshot({[field]:true,generation:'old-ack'}));await reading.promise;
 try{
  assert.equal(s.editable,false,'the superseded ACK must not make either permission actionable');
  assert.equal(s.busy,true,'queued authority settlement is still part of the save');
  assert.equal(seen.some(x=>x.editable&&x.generation==='old-ack'),false,'no synchronous editable stale-ACK emission');
  assert.equal(await s.configure(field,false),false);assert.equal(calls.filter(x=>x.type.endsWith('CONFIGURE')).length,1);
 }finally{read.resolve(snapshot({generation:'revoked'}));await save;}
 assert.equal(s.editable,true);assert.equal(s.value[field],false);assert.equal(s.value.generation,'revoked');
});

test('notifications during a held settlement read coalesce and drain before controls unlock',async()=>{
 const write=deferred(),first=deferred(),second=deferred(),firstStarted=deferred(),secondStarted=deferred(),seen=[];let reads=0;
 const s=new SettingsAssistState({changed:state=>seen.push({editable:state.editable,generation:state.value?.generation}),send:async type=>{if(type.endsWith('CONFIGURE'))return write.promise;switch(++reads){case 1:return snapshot();case 2:firstStarted.resolve();return first.promise;case 3:secondStarted.resolve();return second.promise;default:throw Error('unexpected read');}}});
 await s.load();const save=s.configure('replyAccess',true);await s.load();write.resolve(snapshot({replyAccess:true,generation:'ack'}));await firstStarted.promise;
 try{
  assert.deepEqual(await Promise.all([s.load(),s.load(),s.load()]),[false,false,false]);assert.equal(reads,2,'no competing refresh while settling');
  first.resolve(snapshot({replyAccess:true,generation:'before-second-revoke'}));await secondStarted.promise;
  assert.equal(s.busy,true);assert.equal(s.editable,false);assert.equal(seen.some(x=>x.editable&&['ack','before-second-revoke'].includes(x.generation)),false);
 }finally{first.resolve(snapshot());second.resolve(snapshot({generation:'final-revoked'}));await save;}
 assert.equal(s.busy,false);assert.equal(s.editable,true);assert.equal(s.pending,false);assert.equal(s.value.generation,'final-revoked');assert.equal(reads,3);
});

test('a synchronous observer can queue a newer read but cannot reenter configure during settlement',async()=>{
 const write=deferred(),attempts=[],queued=[];let reads=0,writes=0;
 const s=new SettingsAssistState({changed:state=>{if(state.value?.generation==='intermediate'){attempts.push(state.configure('remoteProcessing',true));queued.push(state.load());}},send:async type=>{if(type.endsWith('CONFIGURE')){writes++;return write.promise;}return snapshot({generation:['initial','intermediate','final-revoked'][reads++]});}});
 await s.load();const save=s.configure('replyAccess',true);await s.load();write.resolve(snapshot({replyAccess:true,generation:'ack'}));assert.equal(await save,true);
 assert.deepEqual(await Promise.all(attempts),[false]);assert.deepEqual(await Promise.all(queued),[false]);assert.equal(writes,1);assert.equal(reads,3);assert.equal(s.value.generation,'final-revoked');assert.equal(s.editable,true);
});

for(const failure of ['rejected','malformed'])test(`${failure} queued authority read leaves acknowledged permissions noneditable until explicit recovery`,async()=>{
 const write=deferred(),read=deferred(),reading=deferred();let reads=0,writes=0;
 const s=new SettingsAssistState({send:async type=>{if(type.endsWith('CONFIGURE')){writes++;return write.promise;}if(++reads===1)return snapshot();if(reads===2){reading.resolve();return read.promise;}return snapshot({generation:'recovered-revoked'});}});
 await s.load();const save=s.configure('replyAccess',true);await s.load();write.resolve(snapshot({replyAccess:true,generation:'ack'}));await reading.promise;
 if(failure==='rejected')read.reject(Error('offline'));else read.resolve({replyAccess:false});
 assert.equal(await save,true,'the original write ACK is not rewritten as a later read result');assert.equal(s.busy,false);assert.equal(s.error,true);assert.equal(s.editable,false);assert.equal(s.feedback,'read-error');assert.equal(await s.configure('remoteProcessing',true),false);assert.equal(writes,1);
 assert.equal(await s.load(),true);assert.equal(s.value.generation,'recovered-revoked');assert.equal(s.value.replyAccess,false);assert.equal(s.editable,true);assert.equal(writes,1);
});

for(const recover of [true,false])test(`failed write retains ${recover?'save-error':'save-unknown'} through queued recovery without replay`,async()=>{
 const write=deferred(),read=deferred(),reading=deferred();let reads=0,writes=0;
 const s=new SettingsAssistState({send:async type=>{if(type.endsWith('CONFIGURE')){writes++;return write.promise;}switch(++reads){case 1:return snapshot();case 2:if(!recover)throw Error('unknown');return snapshot({generation:'failure-reread'});default:reading.resolve();return read.promise;}}});
 await s.load();const save=s.configure('replyAccess',true);await s.load();write.reject(Error('lost ACK'));await reading.promise;
 try{assert.equal(s.busy,true);assert.equal(s.editable,false);assert.equal(await s.configure('remoteProcessing',true),false);assert.equal(writes,1);}finally{read.resolve(snapshot({generation:'revoked'}));assert.equal(await save,false);}
 assert.equal(s.error,false);assert.equal(s.editable,true);assert.equal(s.feedback,recover?'save-error':'save-unknown');assert.equal(s.value.generation,'revoked');assert.equal(writes,1);
});

test('mounted Settings switches remain disabled through storage and runtime revocations without touching a draft',async()=>{
 const previous=globalThis.document,created=[],make=tag=>{const node=new PresentationNode(tag);created.push(node);node.getClientRects=()=>[{}];if(tag==='dialog'){node.showModal=()=>{node.open=true;};node.close=()=>{node.open=false;node.listeners.get('close')?.();};}return node;};
 const body=make('body');globalThis.document={body,createElement:make};const write=deferred(),first=deferred(),second=deferred(),firstStarted=deferred(),secondStarted=deferred(),calls=[];let reads=0,storageChanged,runtimeChanged;
 try{
  const host=make('section'),draft=make('textarea');draft.value='Unsent human draft';draft.selectionStart=3;draft.selectionEnd=8;body.append(host,draft);
  const owner=mountSettingsAssist(host,{language:()=> 'en',storage:{onChanged:{addListener:fn=>{storageChanged=fn;}}},runtime:{onMessage:{addListener:fn=>{runtimeChanged=fn;}}},send:async(type,fields)=>{calls.push({type,fields});if(type.endsWith('CONFIGURE'))return write.promise;switch(++reads){case 1:return snapshot();case 2:firstStarted.resolve();return first.promise;case 3:secondStarted.resolve();return second.promise;default:throw Error('unexpected read');}}});await tick();
  const get=id=>created.find(x=>x.id===id),reply=get('settings-assist-replyAccess'),remote=get('settings-assist-remoteProcessing');reply.checked=true;reply.listeners.get('change')({isTrusted:true});get('settings-assist-confirm').listeners.get('click')({isTrusted:true});draft.focus();
  storageChanged({promptAssistAutomaticPreferenceV2:{}},'local');write.resolve(snapshot({replyAccess:true,generation:'ack'}));await firstStarted.promise;
  assert.equal(reply.disabled,true);assert.equal(remote.disabled,true);assert.equal(reply.getAttribute('aria-busy'),'true');
  runtimeChanged({type:'PAIA_PROMPT_ASSIST_CHANGED'});host.remove();first.resolve(snapshot({replyAccess:true,generation:'pre-revocation'}));await secondStarted.promise;
  assert.equal(owner.state.busy,true);assert.equal(reply.disabled,true);assert.equal(remote.disabled,true);
  second.resolve(snapshot({generation:'revoked'}));await tick();body.append(host);assert.equal(mountSettingsAssist(host,{}),owner,'persistent mount is reused, not rebuilt');
  assert.equal(reply.disabled,false);assert.equal(remote.disabled,false);assert.equal(reply.checked,false);assert.equal(remote.checked,false);assert.equal(reply.getAttribute('aria-busy'),'false');assert.equal(owner.state.value.generation,'revoked');assert.equal(calls.filter(x=>x.type.endsWith('CONFIGURE')).length,1);
  assert.equal(draft.value,'Unsent human draft');assert.equal(draft.selectionStart,3);assert.equal(draft.selectionEnd,8);assert.equal(document.activeElement,draft);
 }finally{write.resolve(snapshot({replyAccess:true,generation:'ack'}));first.resolve(snapshot());second.resolve(snapshot());await tick();if(previous)globalThis.document=previous;else delete globalThis.document;}
});

