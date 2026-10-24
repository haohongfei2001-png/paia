import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSettingsAssist} from '../ui/settings-assist.js';
import {PresentationNode} from './harness/presentation-dom.mjs';

const snapshot=(fields={})=>({replyAccess:false,remoteProcessing:false,serviceAvailable:true,generation:'g1',...fields});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function mount(send){
 const previous=globalThis.document,created=[],make=tag=>{const node=new PresentationNode(tag);created.push(node);node.getClientRects=()=>[{}];if(tag==='dialog'){node.showModal=()=>{node.open=true;};node.close=()=>{node.open=false;node.listeners.get('close')?.();};}return node;};
 const body=make('body');globalThis.document={body,createElement:make};const host=make('section'),draft=make('textarea');draft.value='Unsent human draft';draft.selectionStart=3;draft.selectionEnd=8;body.append(host,draft);let storageChanged,runtimeChanged;
 const owner=mountSettingsAssist(host,{send,language:()=> 'en',storage:{onChanged:{addListener:fn=>{storageChanged=fn;}}},runtime:{onMessage:{addListener:fn=>{runtimeChanged=fn;}}}});
 const get=id=>created.find(node=>node.id===id),reply=get('settings-assist-replyAccess'),remote=get('settings-assist-remoteProcessing');
 return {owner,draft,reply,remote,get,storage:(changes={promptAssistAutomaticPreferenceV2:{}},area='local')=>storageChanged(changes,area),runtime:(message={type:'PAIA_PROMPT_ASSIST_CHANGED'})=>runtimeChanged(message),close:()=>{globalThis.document=previous;}};
}
function assertLocked(ui){
 for(const control of [ui.reply,ui.remote]){assert.equal(control.disabled,true,'an external authority change must immediately disable both original switches');assert.equal(control.getAttribute('aria-busy'),'true');}
 assert.equal(ui.owner.state.editable,false);
}
function assertDraft(ui){assert.equal(ui.draft.value,'Unsent human draft');assert.equal(ui.draft.selectionStart,3);assert.equal(ui.draft.selectionEnd,8);assert.equal(document.activeElement,ui.draft);}

for(const source of ['storage','runtime'])test(`idle ${source} authority notification fences the real mounted switches before its deferred read settles`,async()=>{
 const held=deferred(),calls=[];let reads=0;const ui=mount(async(type,fields)=>{calls.push({type,fields});if(type.endsWith('CONFIGURE'))return snapshot({generation:'unexpected-write'});return ++reads===1?snapshot({replyAccess:true,remoteProcessing:true}):held.promise;});
 try{
  await tick();assert.equal(ui.reply.disabled,false);ui.draft.focus();ui[source]();
  assert.equal(reads,2,'the actual listener must reach the production STATUS read');assertLocked(ui);assert.equal(ui.owner.state.value.generation,'g1');
  for(const control of [ui.reply,ui.remote]){control.checked=false;control.listeners.get('change')({isTrusted:true});assert.equal(control.checked,true,'retain the acknowledged display while authority is unknown');}
  assert.equal(await ui.owner.state.configure('replyAccess',false),false);assert.equal(calls.filter(call=>call.type.endsWith('CONFIGURE')).length,0);assertDraft(ui);
  held.resolve(snapshot({generation:'revoked'}));await tick();assert.equal(ui.owner.state.value.generation,'revoked');assert.equal(ui.reply.checked,false);assert.equal(ui.remote.checked,false);assert.equal(ui.reply.disabled,false);assert.equal(ui.remote.disabled,false);assert.equal(ui.reply.getAttribute('aria-busy'),'false');assertDraft(ui);
 }finally{held.resolve(snapshot({generation:'cleanup'}));await tick();ui.close();}
});

for(const field of ['replyAccess','remoteProcessing'])test(`an already open ${field} consent dialog cannot confirm while authority is invalidated`,async()=>{
 const held=deferred(),calls=[];let reads=0;const ui=mount(async(type,fields)=>{calls.push({type,fields});if(type.endsWith('CONFIGURE'))return snapshot({...fields,generation:'unexpected-write'});return ++reads===1?snapshot():held.promise;});
 try{
  await tick();const control=field==='replyAccess'?ui.reply:ui.remote,dialog=ui.get('settings-assist-consent'),confirm=ui.get('settings-assist-confirm');control.checked=true;control.listeners.get('change')({isTrusted:true});assert.equal(dialog.open,true);assert.equal(confirm.disabled,false);
  ui.runtime();assertLocked(ui);assert.equal(confirm.disabled,true);confirm.listeners.get('click')({isTrusted:true});assert.equal(dialog.open,true);assert.equal(calls.filter(call=>call.type.endsWith('CONFIGURE')).length,0);
  held.resolve(snapshot({generation:'current'}));await tick();assert.equal(confirm.disabled,false);assert.equal(calls.filter(call=>call.type.endsWith('CONFIGURE')).length,0,'a refreshed authority must not replay the pending consent');
  ui.get('settings-assist-cancel').listeners.get('click')();assert.equal(dialog.open,false);assert.equal(document.activeElement,control);
 }finally{held.resolve(snapshot());await tick();ui.close();}
});

for(const source of ['storage','runtime'])for(const failure of ['rejected','malformed'])test(`${source} ${failure} authority read remains fail-closed until a genuine explicit recovery read`,async()=>{
 const held=deferred(),recovery=deferred(),calls=[];let reads=0;const ui=mount(async(type,fields)=>{calls.push({type,fields});if(type.endsWith('CONFIGURE'))throw Error('unexpected write');if(++reads===1)return snapshot({replyAccess:true,remoteProcessing:true});return reads===2?held.promise:recovery.promise;});
 try{
  await tick();ui.draft.focus();ui[source]();assertLocked(ui);if(failure==='rejected')held.reject(Error('denied'));else held.resolve({replyAccess:true});await tick();
  assert.equal(ui.owner.state.error,true);assert.equal(ui.owner.state.busy,false);assert.equal(ui.owner.state.feedback,'read-error');assert.equal(ui.reply.disabled,true);assert.equal(ui.remote.disabled,true);assert.equal(ui.get('settings-assist-confirm').disabled,true);assert.equal(ui.reply.dataset.loaded,'error');assert.equal(await ui.owner.state.configure('replyAccess',false),false);assert.equal(calls.filter(call=>call.type.endsWith('CONFIGURE')).length,0);assertDraft(ui);
  const refreshed=ui.owner.refresh();assert.equal(ui.reply.disabled,true,'a recovery request is not itself proof of authority');recovery.resolve(snapshot({generation:'recovered-revocation'}));assert.equal(await refreshed,true);assert.equal(ui.owner.state.error,false);assert.equal(ui.reply.disabled,false);assert.equal(ui.reply.checked,false);assert.equal(ui.remote.checked,false);assertDraft(ui);
 }finally{held.resolve(snapshot());recovery.resolve(snapshot());await tick();ui.close();}
});

for(const superseded of ['success','failure'])test(`consecutive mounted authority events coalesce and discard a superseded ${superseded} before latest settlement`,async()=>{
 const first=deferred(),second=deferred(),seen=[];let reads=0;const ui=mount(async type=>{assert.equal(type,'PAIA_PROMPT_ASSIST_STATUS');if(++reads===1)return snapshot();return reads===2?first.promise:second.promise;});
 try{
  await tick();const changed=ui.owner.state.changed;ui.owner.state.changed=state=>{seen.push({generation:state.value?.generation,editable:state.editable,error:state.error});changed(state);};ui.draft.focus();ui.storage();assertLocked(ui);ui.runtime();ui.storage();assert.equal(await ui.owner.refresh(),false);assert.equal(reads,2,'while busy, notices coalesce instead of racing another read');
  if(superseded==='success')first.resolve(snapshot({replyAccess:true,remoteProcessing:true,generation:'stale-read'}));else first.reject(Error('obsolete read failed'));await tick();assert.equal(reads,3);assertLocked(ui);assert.equal(ui.owner.state.value.generation,'g1');assert.equal(seen.some(value=>value.generation==='stale-read'||value.error),false,'an invalidated read must not publish either success or failure');
  second.resolve(snapshot({replyAccess:true,generation:'latest'}));await tick();assert.equal(ui.owner.state.value.generation,'latest');assert.equal(ui.reply.checked,true);assert.equal(ui.remote.checked,false);assert.equal(ui.reply.disabled,false);assert.equal(ui.owner.state.pending,false);assert.equal(seen.some(value=>value.editable&&value.generation!=='latest'),false);assertDraft(ui);
 }finally{first.resolve(snapshot());second.resolve(snapshot());await tick();ui.close();}
});

for(const oldResult of ['success','failure'])for(const latestResult of ['success','failure'])test(`old plain refresh ${oldResult} cannot override newer authority ${latestResult}`,async()=>{
 const old=deferred(),authority=deferred();let reads=0;const ui=mount(async type=>{assert.equal(type,'PAIA_PROMPT_ASSIST_STATUS');if(++reads===1)return snapshot();return reads===2?old.promise:authority.promise;});
 try{
  await tick();const refreshing=ui.owner.refresh();assert.equal(ui.reply.disabled,false,'ordinary refresh retains its original supersedable semantics');ui.runtime();assertLocked(ui);
  if(latestResult==='success')authority.resolve(snapshot({generation:'current-authority'}));else authority.reject(Error('authority unavailable'));await tick();
  if(oldResult==='success')old.resolve(snapshot({replyAccess:true,remoteProcessing:true,generation:'obsolete-plain'}));else old.reject(Error('old refresh unavailable'));assert.equal(await refreshing,false);await tick();
  assert.equal(ui.owner.state.value.generation,latestResult==='success'?'current-authority':'g1');assert.equal(ui.owner.state.error,latestResult==='failure');assert.equal(ui.reply.disabled,latestResult==='failure');assert.equal(ui.remote.disabled,latestResult==='failure');assert.equal(ui.reply.checked,false);assert.equal(ui.remote.checked,false);
 }finally{old.resolve(snapshot());authority.resolve(snapshot());await tick();ui.close();}
});

test('a plain mounted refresh still yields to a newer independently acknowledged configure',async()=>{
 const old=deferred(),calls=[];let reads=0;const ui=mount(async(type,fields)=>{calls.push({type,fields});if(type.endsWith('CONFIGURE'))return snapshot({replyAccess:true,generation:'configured'});return ++reads===1?snapshot():old.promise;});
 try{
  await tick();const refreshing=ui.owner.refresh();assert.equal(ui.reply.disabled,false);assert.equal(await ui.owner.state.configure('replyAccess',true),true);old.resolve(snapshot({generation:'old-refresh'}));assert.equal(await refreshing,false);assert.equal(ui.owner.state.value.generation,'configured');assert.equal(ui.reply.checked,true);assert.equal(ui.remote.checked,false);assert.equal(ui.reply.disabled,false);assert.deepEqual(calls.find(call=>call.type.endsWith('CONFIGURE')).fields,{replyAccess:true,remoteProcessing:false,expectedGeneration:'g1',consentVersion:2});
 }finally{old.resolve(snapshot());await tick();ui.close();}
});

for(const finalResult of ['revoked','failed'])test(`a stale save ACK cannot reenable invalidated authority when the final read is ${finalResult}`,async()=>{
 const write=deferred(),first=deferred(),last=deferred(),seen=[],calls=[];let reads=0;const ui=mount(async(type,fields)=>{calls.push({type,fields});if(type.endsWith('CONFIGURE'))return write.promise;if(++reads===1)return snapshot();return reads===2?first.promise:last.promise;});let save;
 try{
  await tick();const changed=ui.owner.state.changed;ui.owner.state.changed=state=>{seen.push({generation:state.value?.generation,editable:state.editable});changed(state);};save=ui.owner.state.configure('remoteProcessing',true);ui.storage();assertLocked(ui);write.resolve(snapshot({remoteProcessing:true,generation:'stale-ack'}));await tick();assert.equal(reads,2);assertLocked(ui);ui.runtime();first.resolve(snapshot({replyAccess:true,remoteProcessing:true,generation:'stale-first-read'}));await tick();assert.equal(reads,3);assertLocked(ui);
  if(finalResult==='revoked')last.resolve(snapshot({generation:'revoked'}));else last.reject(Error('latest authority denied'));assert.equal(await save,true,'the original ACK result remains distinct from later authority');assert.equal(seen.some(value=>value.editable&&['stale-ack','stale-first-read'].includes(value.generation)),false);assert.equal(ui.reply.disabled,finalResult==='failed');assert.equal(ui.remote.disabled,finalResult==='failed');assert.equal(calls.filter(call=>call.type.endsWith('CONFIGURE')).length,1);if(finalResult==='revoked'){assert.equal(ui.owner.state.value.generation,'revoked');assert.equal(ui.remote.checked,false);}else{assert.equal(ui.owner.state.feedback,'read-error');assert.equal(await ui.owner.state.configure('remoteProcessing',false),false);}
 }finally{write.resolve(snapshot({remoteProcessing:true}));first.resolve(snapshot());last.resolve(snapshot());await save;await tick();ui.close();}
});

test('synchronous observers cannot reenter configure and a later notice during authority publication remains fenced',async()=>{
 const first=deferred(),last=deferred(),attempts=[],seen=[];let reads=0;const ui=mount(async type=>{assert.equal(type,'PAIA_PROMPT_ASSIST_STATUS');if(++reads===1)return snapshot();return reads===2?first.promise:last.promise;});
 try{
  await tick();const changed=ui.owner.state.changed;let queued=false;ui.owner.state.changed=state=>{changed(state);seen.push({generation:state.value?.generation,editable:state.editable});if(state.busy)attempts.push(state.configure('replyAccess',true));if(state.value?.generation==='intermediate'&&!queued){queued=true;ui.runtime();}};
  ui.storage();assertLocked(ui);first.resolve(snapshot({generation:'intermediate'}));await tick();assert.equal(reads,3);assertLocked(ui);assert.deepEqual(await Promise.all(attempts),[false,false]);assert.equal(seen.some(value=>value.editable),false);last.resolve(snapshot({generation:'final'}));await tick();assert.equal(ui.owner.state.value.generation,'final');assert.equal(ui.reply.disabled,false);assert.equal(seen.some(value=>value.editable&&value.generation!=='final'),false);
 }finally{first.resolve(snapshot());last.resolve(snapshot());await tick();ui.close();}
});

test('unrelated storage areas, keys and runtime notices retain the current mounted authority without a read',async()=>{
 let reads=0;const ui=mount(async type=>{assert.equal(type,'PAIA_PROMPT_ASSIST_STATUS');reads++;return snapshot();});
 try{await tick();ui.storage({promptAssistAutomaticPreferenceV2:{}},'sync');ui.storage({unrelated:{}});ui.runtime({type:'UNRELATED'});ui.runtime(null);await tick();assert.equal(reads,1);assert.equal(ui.reply.disabled,false);assert.equal(ui.owner.state.value.generation,'g1');assert.equal(ui.owner.state.busy,false);}finally{ui.close();}
});
