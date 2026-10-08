import test from 'node:test';
import assert from 'node:assert/strict';
import {SettingsPromptPositionState} from '../ui/settings-prompt-position-state.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('Settings position presenter consumes exact stored status without fabricating live visibility',async()=>{
 for(const value of [{status:'ready',position:'custom'},{status:'ready',position:'default'},{status:'consent_required'},{status:'unavailable'}]){const calls=[],s=new SettingsPromptPositionState({send:async(...args)=>{calls.push(args);return value;}});await s.load();assert.deepEqual(calls,[['PAIA_PROMPT_SURFACE_SETTINGS_STATUS']]);assert.deepEqual(s.value,value);assert.equal(s.editable,value.status==='ready');}
});
test('explicit default-position reset remains actionable and awaits the real owner acknowledgement',async()=>{
 const write=deferred(),calls=[],s=new SettingsPromptPositionState({send:async(...args)=>{calls.push(args);return args[0].endsWith('STATUS')?{status:'ready',position:'default'}:write.promise;}});await s.load();const pending=s.reset();assert.equal(s.busy,true);assert.equal(await s.reset(),false);assert.equal(s.feedback,'saving');write.resolve({status:'reset',changed:false});assert.equal(await pending,true);assert.equal(s.feedback,'saved');assert.deepEqual(calls.at(-1),['PAIA_PROMPT_SURFACE_RESET_POSITION']);
});
test('superseded reads cannot overwrite reset and a later real move wins the queued refresh',async()=>{
 const late=deferred(),write=deferred();let reads=0;const s=new SettingsPromptPositionState({send:async type=>type.endsWith('STATUS')?(++reads===1?{status:'ready',position:'custom'}:reads===2?late.promise:{status:'ready',position:'custom'}):write.promise});await s.load();const pendingRead=s.load(),pendingReset=s.reset();await s.load();late.resolve({status:'unavailable'});await pendingRead;assert.equal(s.value.status,'ready');write.resolve({status:'reset',changed:true});await pendingReset;assert.deepEqual(s.value,{status:'ready',position:'custom'});assert.equal(s.feedback,'');
});
test('lost reset acknowledgement reconciles position and never claims live hosts acknowledged',async()=>{
 let reading={status:'ready',position:'custom'};const s=new SettingsPromptPositionState({send:async type=>{if(type.endsWith('STATUS'))return reading;reading={status:'ready',position:'default'};throw Error('lost acknowledgement');}});await s.load();assert.equal(await s.reset(),false);assert.deepEqual(s.value,reading);assert.equal(s.feedback,'save-error');assert.equal(s.editable,true);
});
test('unreadable reset result stays uncertain and unavailable/consent-required state disables writes',async()=>{
 let unreadable=false,writes=0;const s=new SettingsPromptPositionState({send:async type=>{if(type.endsWith('STATUS')){if(unreadable)throw Error('read failed');return {status:'ready',position:'custom'};}writes++;unreadable=true;throw Error('write failed');}});await s.load();await s.reset();assert.equal(s.feedback,'save-unknown');assert.equal(s.editable,false);assert.equal(s.value.position,'custom');await s.reset();assert.equal(writes,1);
 for(const value of [{status:'ready',position:'default',connected:true},{status:'unavailable',position:'default'},null,{status:'ready',position:'future'}]){const other=new SettingsPromptPositionState({send:async()=>value});await other.load();assert.equal(other.editable,false);assert.equal(other.readError,true);}
});
