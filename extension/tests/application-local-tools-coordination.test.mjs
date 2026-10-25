import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionAdmissionWorker,tick,deferred} from './harness/selection-admission-worker.mjs';
const options=f=>({...f.bridge.tools,store:f.bridge.store,runtime:f.api.runtime});

test('fixed original tools retain staged sessions and deny new work until exact release',async t=>{
 const f=await selectionAdmissionWorker(t),c=f.bridge.localTools,{backups,integrity,imports}=f.bridge.tools;
 const draft=await backups.beginRestore(),scan=await integrity.begin(),draftState=backups.restores.get(draft.sessionId),scanState=integrity.sessions.get(scan.sessionId);
 const token=await c.hold();assert.equal(c.current(token),true);assert.equal(await c.fence(token),true);
 assert.throws(()=>backups.beginRestore(),{code:'LOCAL_TOOL_SELECTION_HELD'});assert.throws(()=>integrity.begin(),{code:'LOCAL_TOOL_SELECTION_HELD'});assert.throws(()=>imports.ledger.list(),{code:'LOCAL_TOOL_SELECTION_HELD'});
 assert.equal(backups.restores.get(draft.sessionId),draftState);assert.equal(integrity.sessions.get(scan.sessionId),scanState);
 assert.equal(c.release({}),false);assert.equal(c.current(token),true);assert.equal(c.release(token),true);assert.equal(c.release(token),false);
 assert.equal(f.bridge.selection.enabled,false);await assert.rejects(f.bridge.selection.handle({type:'PAIA_GENERATION_ACTIVATE'},f.sender),{code:'GENERATION_SELECTION_UNAVAILABLE'});
 await backups.cancel(draft);await integrity.cancel(scan);
});

test('foreign store, runtime and copied owners cannot borrow the fixed original tool proof',async t=>{
 const f=await selectionAdmissionWorker(t),base=options(f);
 for(const extra of [{store:{...base.store}},{runtime:{...base.runtime}},...['imports','backups','integrity'].map(key=>({[key]:Object.create(Object.getPrototypeOf(base[key]))}))]){
  const c=f.bridge.makeLocalTools({...base,...extra});await assert.rejects(c.hold());c.close();
 }
 const c=f.bridge.localTools,token=await c.hold();await assert.rejects(c.hold());assert.equal(await c.fence(token),true);c.release(token);
});

test('all three admissions close before waiting for an already accepted validator',async t=>{
 const f=await selectionAdmissionWorker(t),c=f.bridge.localTools,{backups,integrity,imports}=f.bridge.tools,q=await backups.beginRestore(),state=backups.restores.get(q.sessionId),entered=deferred(),gate=deferred();
 state.validator.add=async()=>{entered.resolve();await gate.promise;};
 const stage=backups.stageRestore({...q,items:[{type:'item',value:{id:'synthetic-preserved'}}]});await entered.promise;
 let ready=false;const holding=c.hold().then(token=>{ready=true;return token;});
 try{
  assert.throws(()=>integrity.begin(),{code:'LOCAL_TOOL_SELECTION_HELD'});assert.throws(()=>imports.ledger.list(),{code:'LOCAL_TOOL_SELECTION_HELD'});await tick();assert.equal(ready,false);
  gate.resolve();await stage;const token=await holding;assert.equal(state.items.length,1);assert.equal(state.staging,false);assert.equal(await c.fence(token),true);c.release(token);
 }finally{gate.resolve();await Promise.allSettled([stage,holding]);}
});

test('changed original control cut refuses and releases only this composition',async t=>{
 const f=await selectionAdmissionWorker(t),c=f.bridge.localTools,token=await c.hold();
 await f.bridge.store.repository.transaction(true,tr=>tr.put('meta',{id:'backup-data-generation',value:42}),['meta']);
 await assert.rejects(c.fence(token));assert.equal(c.current(token),false);
 const next=await c.hold();assert.equal(await c.fence(next),true);assert.equal(c.release(token),false);assert.equal(c.current(next),true);c.release(next);
});

test('original import port disconnect revokes held grant and invalidates composition',async t=>{
 const f=await selectionAdmissionWorker(t),c=f.bridge.localTools,ledger=f.bridge.tools.imports.ledger;
 ledger.adapters.add('synthetic-v1');const q={consent:true,adapterId:'synthetic-v1',fingerprint:'a'.repeat(64)},first=await ledger.begin(q,f.sender.documentId);
 await ledger.ready({...first,batches:0},f.sender.documentId);await ledger.complete(first,f.sender.documentId);
 const grant=await ledger.begin({...q,taskId:first.taskId},f.sender.documentId);
 let disconnect;f.api.runtime.onConnect.emit({name:'official-export-session',sender:f.sender,onDisconnect:{addListener:fn=>{disconnect=fn;}}});
 const token=await c.hold();assert.equal(ledger.grants.has(grant.grant),true);disconnect();await f.bridge.activity.drain();
 assert.equal(ledger.grants.has(grant.grant),false);assert.equal(c.current(token),false);await assert.rejects(c.fence(token));
 await assert.rejects(ledger.ready({...grant,batches:0},f.sender.documentId),{code:'IMPORT_SESSION_EXPIRED'});
 const next=await c.hold();assert.equal(await c.fence(next),true);c.release(next);
});
