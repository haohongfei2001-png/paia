import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {createMaintenanceQualification,maintenanceQualificationReader,releaseMaintenanceQualification} from '../core/ai-usage/maintenance-qualification.js';

async function fixture(t){
 const f=await setup(OrganizerStore);t.after(()=>f.s.repository.close());
 const make=async name=>{const topic=await f.s.createTopic({name,operationId:crypto.randomUUID()});await f.s.renameTopic({id:topic.id,expectedRevision:topic.revision,name:name+' renamed',operationId:crypto.randomUUID()});return topic;};
 const topic=await make('SYNTHETIC selected structural parent'),sibling=await make('SYNTHETIC other parent');
 const descriptors=await f.s.repository.transaction(false,async tx=>(await tx.all('meta')).filter(r=>r.id.startsWith('aiu:delta:pending:')&&r.descriptor?.kind==='topic').map(r=>r.descriptor)),descriptor=descriptors.find(d=>d.entityId===topic.id),other=descriptors.find(d=>d.entityId===sibling.id);assert.ok(descriptor&&other);
 const caller=Object.freeze({id:crypto.randomUUID()}),signal=new AbortController(),state={scope:null,raw:null,reads:[],alter:null,mutate:null,onRead:null};
 const processing={resolve:async(_tx,scope)=>{state.scope=scope;return state.raw={version:1,store:f.s,caller,scope:state.alter?state.alter(structuredClone(scope)):scope,epoch:'SYNTHETIC structural summary',processing:true,expiresAt:Date.now()+60000,revocationSignal:signal.signal};},isCurrent:()=>true};
 const wrap=tx=>{const wrapped=Object.create(tx);wrapped.get=async(...args)=>{const row=await tx.get(...args);if(!row)return row;state.mutate?.(args[0],row);const observe=(object,field,label)=>{if(!object||!Object.hasOwn(object,field))return;const value=Object.getOwnPropertyDescriptor(object,field).value;Object.defineProperty(object,field,{enumerable:true,configurable:true,get(){state.reads.push(label);state.onRead?.(label);return value;}});};if(args[0]==='topics')observe(row,'summary','topic:'+row.id);if(args[0]==='revisions')for(const side of ['before','after'])observe(row[side],'summary',row.id+':'+side);return row;};return wrapped;};
 const create=async({selected=true}={})=>f.s.repository.transaction(false,tx=>createMaintenanceQualification(f.s,wrap(tx),{items:selected?[{key:'SYNTHETIC exact structural obligation',descriptor}]:[],coverage:[]},{processing,caller,binding:{jobId:crypto.randomUUID(),childId:crypto.randomUUID()},isCurrent:()=>true,signal:signal.signal,selection:selected?{}:{structures:[{store:'topics',recordId:topic.id,selectedFields:['name']}]}}));
 const read=(token,table,id,side=null)=>f.s.repository.transaction(false,async tx=>{const reader=maintenanceQualificationReader(token,f.s,wrap(tx)),row=await reader.get(table,id);return (side?row[side]:row).summary;});
 return {...f,topic,sibling,descriptor,other,state,signal,create,read};
}
for(const side of ['before','after'])test('name-only parent qualification rejects unselected '+side+'.summary before its original getter',async t=>{
 const f=await fixture(t),token=await f.create({selected:false});t.after(()=>releaseMaintenanceQualification(token));assert.deepEqual(f.state.scope.journals,[]);
 await assert.rejects(f.read(token,'revisions',f.descriptor.journalId,side));assert.deepEqual(f.state.reads,[]);
});
test('selected structural Topic requests exact current and same-journal summary permission before complete reads',async t=>{
 const f=await fixture(t),token=await f.create();t.after(()=>releaseMaintenanceQualification(token));assert.deepEqual(f.state.reads,[]);
 assert.deepEqual(f.state.scope.structures.map(r=>({recordId:r.recordId,selectedFields:r.selectedFields})),[{recordId:f.topic.id,selectedFields:['name','summary']}]);
 assert.deepEqual(f.state.scope.journals.map(r=>({journalId:r.journalId,selectedFields:r.selectedFields})),[{journalId:f.descriptor.journalId,selectedFields:['before.name','after.name','before.summary','after.summary']}]);
 for(const [table,id,side]of [['topics',f.topic.id,null],['revisions',f.descriptor.journalId,'before'],['revisions',f.descriptor.journalId,'after']])await f.read(token,table,id,side);
 assert.equal(f.state.reads.length,3);
});
for(const denied of ['summary','before.summary','after.summary'])test('original issuer denying selected structural '+denied+' stops before every summary getter',async t=>{
 const f=await fixture(t);f.state.alter=scope=>{const row=denied==='summary'?scope.structures[0]:scope.journals[0];row.selectedFields=row.selectedFields.filter(field=>field!==denied);return scope;};await assert.rejects(f.create());assert.deepEqual(f.state.reads,[]);
});
for(const side of [null,'before','after'])test('selected structural summary grant never covers another '+(side?'journal '+side:'Topic'),async t=>{
 const f=await fixture(t),token=await f.create();t.after(()=>releaseMaintenanceQualification(token));await assert.rejects(f.read(token,side?'revisions':'topics',side?f.other.journalId:f.sibling.id,side));assert.deepEqual(f.state.reads,[]);
});
for(const drift of ['expiry','revoke','topic-revision','journal-revision'])test('structural summary '+drift+' is rejected before text',async t=>{
 const f=await fixture(t),token=await f.create();t.after(()=>releaseMaintenanceQualification(token));if(drift==='expiry')t.mock.method(Date,'now',()=>f.state.raw.expiresAt);if(drift==='revoke')f.signal.abort();if(drift==='topic-revision'||drift==='journal-revision')f.state.mutate=(table,row)=>{if(table===(drift==='topic-revision'?'topics':'revisions')){if(table==='topics')row.revision++;else row.afterRevision++;}};
 await assert.rejects(f.read(token,drift==='topic-revision'?'topics':'revisions',drift==='topic-revision'?f.topic.id:f.descriptor.journalId,drift==='topic-revision'?null:'before'));assert.deepEqual(f.state.reads,[]);
});
test('expiry inside the first authorized historical summary prevents the second field',async t=>{
 const f=await fixture(t),token=await f.create();t.after(()=>releaseMaintenanceQualification(token));f.state.onRead=()=>t.mock.method(Date,'now',()=>f.state.raw.expiresAt);await assert.rejects(f.read(token,'revisions',f.descriptor.journalId,'before'));assert.deepEqual(f.state.reads,[f.descriptor.journalId+':before']);await assert.rejects(f.read(token,'revisions',f.descriptor.journalId,'after'));assert.equal(f.state.reads.length,1);
});
