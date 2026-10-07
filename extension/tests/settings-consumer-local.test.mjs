import test from 'node:test';
import assert from 'node:assert/strict';
import {SettingsLocalState,changePreferenceControl,timeDisplayValue,withSettingsControlFocus} from '../ui/settings-local-state.js';
const page=(preferences={},settings={})=>({preferences,settings:{consentVersion:1,enabled:true,...settings}});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('all persisted font/width choices and legacy date-only survive reading without a write',async()=>{
 for(const fontSize of ['small','standard','large','xlarge'])for(const readingWidth of ['narrow','standard','wide']){const calls=[],state=new SettingsLocalState({send:async(...args)=>{calls.push(args);return page({fontSize,readingWidth,timeDisplay:'date_only'});}});await state.load();assert.equal(state.preferences.fontSize,fontSize);assert.equal(state.preferences.readingWidth,readingWidth);assert.equal(state.preferences.timeDisplay,'date_only');assert.equal(timeDisplayValue(state.preferences.timeDisplay),'date_and_time');assert.deepEqual(calls.map(x=>x[0]),['GET_PAGE']);}
});
test('focused initiating select receives confirmed value only after acknowledgement',async()=>{
 const pending=deferred(),state=new SettingsLocalState({send:async type=>type==='GET_PAGE'?page():pending.promise});await state.load();const document={activeElement:null,body:{},documentElement:{}},control={value:'large',ownerDocument:document,isConnected:true,getClientRects:()=>[{}],focus(){document.activeElement=this;}};document.activeElement=control;
 const saving=changePreferenceControl(state,'fontSize','large',control);assert.equal(control.value,'standard');assert.equal(state.preferences.fontSize,'standard');assert.equal(state.busy,true);pending.resolve({ok:true});assert.equal(await saving,true);assert.equal(control.value,'large');assert.equal(document.activeElement,control);
});
test('failed preference write reconciles real state and keeps visible failure feedback',async()=>{
 let reads=0;const state=new SettingsLocalState({send:async type=>{if(type==='GET_PAGE')return page({fontSize:++reads===1?'small':'large'});throw Error('lost acknowledgement');}});await state.load();assert.equal(await state.setPreference('fontSize','large'),false);assert.equal(state.preferences.fontSize,'large');assert.equal(state.feedback,'save-error');assert.equal(state.busy,false);
});
test('failed write and failed reconciliation retain previously confirmed choice',async()=>{
 let reads=0;const state=new SettingsLocalState({send:async type=>{if(type==='GET_PAGE'&&++reads===1)return page({readingWidth:'wide'});throw Error('offline');}});await state.load();await state.setPreference('readingWidth','narrow');assert.equal(state.preferences.readingWidth,'wide');assert.equal(state.feedback,'save-error');
});
test('read before a write cannot overwrite its newer acknowledged value',async()=>{
 const old=deferred();let reads=0;const state=new SettingsLocalState({send:async type=>type==='GET_PAGE'?(++reads===1?page():old.promise):{ok:true}});await state.load();const pending=state.load();await state.setPreference('appearance','dark');old.resolve(page({appearance:'light'}));await pending;assert.equal(state.preferences.appearance,'dark');
});
test('cross-tab refresh during write is deferred then reads canonical preferences',async()=>{
 const ack=deferred();let reads=0;const state=new SettingsLocalState({send:async type=>type==='GET_PAGE'?page({fontSize:++reads===1?'small':'xlarge'}):ack.promise});await state.load();const saving=state.setPreference('fontSize','large');await state.load();assert.equal(reads,1);ack.resolve({ok:true});await saving;assert.equal(reads,2);assert.equal(state.preferences.fontSize,'xlarge');
});
test('capture requires consent and exact command acknowledgement',async()=>{
 const sent=[],state=new SettingsLocalState({send:async(type,payload)=>{sent.push([type,payload]);return type==='GET_PAGE'?page({}, {consentVersion:0,enabled:false}):{enabled:false};}});await state.load();assert.equal(await state.setCapture(true),false);assert.equal(sent.length,1);state.apply(page());assert.equal(await state.setCapture(false),true);assert.deepEqual(sent.at(-1),['SET_ENABLED',{enabled:false}]);assert.equal(state.capture.enabled,false);assert.equal(state.preferences.fontSize,'standard');
});
test('malformed acknowledgement cannot optimistically apply a preference',async()=>{
 const state=new SettingsLocalState({send:async type=>type==='GET_PAGE'?page():{}});await state.load();assert.equal(await state.setPreference('language','en'),false);assert.equal(state.preferences.language,'system');assert.equal(state.feedback,'save-error');
});
test('read failure is distinct from a confirmed off value',async()=>{
 const state=new SettingsLocalState({send:async()=>{throw Error('unreadable');}});await state.load();assert.equal(state.loaded,false);assert.equal(state.capture,null);assert.equal(state.feedback,'read-error');assert.equal(await state.setCapture(false),false);
});
test('only the five local preference keys can be changed',async()=>{
 const calls=[],state=new SettingsLocalState({send:async(type,payload)=>{calls.push(type);return page();}});await state.load();for(const [key,value] of [['grant',true],['fontSize','16'],['timeDisplay','date_only']])assert.equal(await state.setPreference(key,value),false);assert.deepEqual(calls,['GET_PAGE']);
});
test('disable-induced focus is repaired but newer user focus wins',async()=>{
 const document={body:{},documentElement:{},activeElement:null},control={ownerDocument:document,isConnected:true,getClientRects:()=>[{}],focus(){document.activeElement=this;}};document.activeElement=control;await withSettingsControlFocus(control,async()=>{document.activeElement=document.body;});assert.equal(document.activeElement,control);const newer={};await withSettingsControlFocus(control,async()=>{document.activeElement=newer;});assert.equal(document.activeElement,newer);
});
