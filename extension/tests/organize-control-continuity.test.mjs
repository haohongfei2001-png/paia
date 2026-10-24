import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {readOriginalOrganizeControls,captureOriginalOrganizeControlContinuity,readOriginalOrganizeControlContinuity,assertOriginalOrganizeControlContinuityFacts} from '../core/indexed-store.js';
import {createOrganizeActionSource,assertOriginalOrganizeActionCurrent,assertOriginalOrganizeActionFacts} from '../background/organize-action-source.js';
async function fixture(t){const {s}=await setup(OrganizerStore);t.after(()=>s.repository.db.close());const cap=await s.run(()=>s.repository.transaction(false,tx=>captureOriginalOrganizeControlContinuity(s,tx,readOriginalOrganizeControls(s,tx))));return {s,cap};}
const current=(s,cap)=>assertOriginalOrganizeControlContinuityFacts(s,cap);
test('unrelated original Store runs keep the same first Organize control facts without reusing an old publication owner',async t=>{
 const {s,cap}=await fixture(t);let before;
 for(let i=0;i<5;i++){const value=await s.run(()=>s.repository.transaction(false,tx=>readOriginalOrganizeControlContinuity(s,tx,cap)));if(before)assert.deepEqual(value,before);before=value;assert.equal(current(s,cap),true);}
 assert.throws(()=>current(s,{...cap}));assert.throws(()=>current({...s},cap));assert.equal(current(s,cap),true);
});
test('an observed original OFF and later ON cannot revive the old continuity witness',async t=>{
 const {s,cap}=await fixture(t);await s.setEnabled(false);assert.throws(()=>current(s,cap));await s.setEnabled(true);assert.throws(()=>current(s,cap));
});
test('a new original style revision cannot be accepted as the first controls',async t=>{
 const {s,cap}=await fixture(t),prior=await s.aiStylePreference();await s.updatePreferences({aiOrganizeStyle:{version:1,value:'concise',expectedRevision:prior.revision,expectedEpoch:prior.epoch}});assert.throws(()=>current(s,cap));
});
test('an original restore epoch change rejects the old control witness',async t=>{
 const {s,cap}=await fixture(t);await s.run(()=>s.repository.transaction(true,tx=>tx.put('meta',{id:'recovery-restore-epoch',value:'synthetic-new-restore'})));await s.run(()=>Promise.resolve());assert.throws(()=>current(s,cap));
});
test('same-value descriptor replacement and restoration cannot revive an observed rejected witness',async t=>{
 const {s,cap}=await fixture(t),control=s.controlCache,descriptor=Object.getOwnPropertyDescriptor(control,'preferences');
 Object.defineProperty(control,'preferences',{...descriptor,value:structuredClone(descriptor.value)});assert.throws(()=>current(s,cap));Object.defineProperty(control,'preferences',descriptor);await s.run(()=>Promise.resolve());assert.throws(()=>current(s,cap));
});
test('a late style accessor is never executed by the continuity facts check',async t=>{
 const {s,cap}=await fixture(t),preferences=s.controlCache.preferences;let getters=0;Object.defineProperty(preferences,'aiOrganizeStyle',{configurable:true,enumerable:true,get(){getters++;return null;}});
 assert.throws(()=>current(s,cap));assert.equal(getters,0);delete preferences.aiOrganizeStyle;assert.throws(()=>current(s,cap));assert.equal(getters,0);
});
test('an observed original adapter method replacement stays rejected after restoration',async t=>{
 const {s,cap}=await fixture(t),get=s.local.get;s.local.get=(...args)=>Reflect.apply(get,s.local,args);assert.throws(()=>current(s,cap));s.local.get=get;await s.run(()=>Promise.resolve());assert.throws(()=>current(s,cap));
});
test('a replaced public action clock cannot execute a control mutation and actual OFF/ON still cannot revive continuity',async t=>{
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'Synthetic last clock',operationId:crypto.randomUUID()}),event=()=>({addListener(){},removeListener(){}});
 const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}},api={runtime:{id:'synthetic',getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:'document',documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}};
 const source=createOrganizeActionSource(s,api);t.after(()=>{source.dispose();s.repository.db.close();});const scope=await source.select(sender,{topicId:topic.id}),action=await source.consume(sender,{topicId:topic.id,scopeBinding:scope.scopeBinding,userActionId:crypto.randomUUID()}),cap=await s.run(()=>s.repository.transaction(false,tx=>captureOriginalOrganizeControlContinuity(s,tx,readOriginalOrganizeControls(s,tx))));
 const now=Date.now,settings=s.controlCache.settings;let changed=0;Date.now=()=>{changed++;s.controlCache.settings.enabled=false;return now();};
 try{assert.throws(()=>assertOriginalOrganizeActionCurrent(source,action,s));assert.equal(changed,0);assert.equal(settings.enabled,true);assert.equal(current(s,cap),true);}finally{Date.now=now;}
 assert.throws(()=>assertOriginalOrganizeActionFacts(source,action,s));assert.throws(()=>assertOriginalOrganizeActionCurrent(source,action,s));
 await s.setEnabled(false);assert.throws(()=>current(s,cap));await s.setEnabled(true);assert.throws(()=>current(s,cap));
});
