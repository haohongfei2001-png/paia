import test from 'node:test';
import assert from 'node:assert/strict';
import {SettingsAIStyleState} from '../ui/settings-ai-style-state.js';
const state=(value='balanced',revision=0,explicit=false)=>({available:true,value,revision,explicit,epoch:'initial'});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('style presenter reads without writing and records an explicit default through exact owner CAS',async()=>{
 const calls=[],s=new SettingsAIStyleState({send:async(type,payload)=>{calls.push([type,payload]);return type==='PAIA_SETTINGS_AI_STYLE'?state():{ok:true,changed:true};}});
 assert.equal(s.editable,false);await s.load();assert.deepEqual(calls,[['PAIA_SETTINGS_AI_STYLE',undefined]]);assert.equal(s.editable,true);
 assert.equal(await s.select('balanced'),true);assert.deepEqual(calls[1],['UPDATE_PREFERENCES',{changes:{aiOrganizeStyle:{version:1,value:'balanced',expectedRevision:0,expectedEpoch:'initial'}}}]);assert.deepEqual(s.value,state('balanced',1,true));
});
test('style presenter holds pending choice and discards stale reads while a newer acknowledged write wins',async()=>{
 const late=deferred(),write=deferred();let reads=0;const s=new SettingsAIStyleState({send:async type=>type==='PAIA_SETTINGS_AI_STYLE'?(++reads===1?state():late.promise):write.promise});
 await s.load();const pendingRead=s.load(),pendingWrite=s.select('original');assert.equal(s.busy,true);assert.equal(s.value.value,'balanced');assert.equal(await s.select('concise'),false);
 late.resolve(state('concise',9,true));await pendingRead;assert.equal(s.value.value,'balanced');write.resolve({ok:true,changed:true});await pendingWrite;assert.deepEqual(s.value,state('original',1,true));
});
test('style cross-window refresh waits for pending save and then reads the actual later preference',async()=>{
 const write=deferred();let reads=0;const s=new SettingsAIStyleState({send:async type=>type==='PAIA_SETTINGS_AI_STYLE'?(++reads===1?state():state('concise',2,true)):write.promise});
 await s.load();const pending=s.select('original');await s.load();assert.equal(reads,1);write.resolve({ok:true,changed:true});await pending;assert.deepEqual(s.value,state('concise',2,true));assert.equal(reads,2);
});
test('style stale/no-op acknowledgements preserve revision and never silently claim the requested value',async()=>{
 let mode='noop';const s=new SettingsAIStyleState({send:async type=>type==='PAIA_SETTINGS_AI_STYLE'?state(mode==='noop'?'balanced':'concise',3,true):mode==='noop'?{ok:true,changed:false}:{conflict:true}});
 await s.load();assert.equal(await s.select('balanced'),true);assert.equal(s.value.revision,3);mode='conflict';assert.equal(await s.select('original'),false);assert.deepEqual(s.value,state('concise',3,true));assert.equal(s.feedback,'conflict');
});
test('style lost acknowledgement reconciles committed state and unreadable outcomes remain explicitly uncertain',async()=>{
 let mode='initial';const s=new SettingsAIStyleState({send:async type=>{if(type==='UPDATE_PREFERENCES')throw Error('lost ack');if(mode==='unreadable')throw Error('read failed');return mode==='initial'?state():state('original',1,true);}});
 await s.load();mode='committed';assert.equal(await s.select('original'),false);assert.deepEqual(s.value,state('original',1,true));assert.equal(s.feedback,'save-error');
 mode='unreadable';assert.equal(await s.select('concise'),false);assert.equal(s.value.value,'original');assert.equal(s.feedback,'save-unknown');assert.equal(s.editable,false);
 mode='committed';await s.load();assert.equal(s.editable,true);assert.equal(s.feedback,'');
});
test('style future or malformed projection cannot become an editable balanced fallback',async()=>{
 let value={available:false,value:null,revision:null,explicit:null,epoch:'initial'},writes=0;const s=new SettingsAIStyleState({send:async type=>{if(type!=='PAIA_SETTINGS_AI_STYLE')writes++;return value;}});
 await s.load();assert.equal(s.feedback,'unsupported');assert.equal(await s.select('balanced'),false);
 for(value of [{...state(),revision:9},{...state(),value:'future'},{...state(),grant:true},null]){await s.load();assert.equal(s.readError,true);assert.equal(s.editable,false);}
 assert.equal(writes,0);
});


test('style presenter sends the read restore epoch and replaces it after a stale-window conflict',async()=>{
 const calls=[];let current={...state('original',1,true),epoch:'before-restore'};const s=new SettingsAIStyleState({send:async(type,payload)=>{calls.push([type,payload]);if(type==='PAIA_SETTINGS_AI_STYLE')return current;current={...state('concise',1,true),epoch:'after-restore'};return {conflict:true};}});
 await s.load();assert.equal(await s.select('balanced'),false);assert.equal(calls[1][1].changes.aiOrganizeStyle.expectedEpoch,'before-restore');assert.equal(s.value.epoch,'after-restore');assert.equal(s.value.value,'concise');
});
