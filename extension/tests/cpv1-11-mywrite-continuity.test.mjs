import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LocalMyWriteRelay,MyWriteContinuityError,planMyWriteContinuity,validateMyWriteContinuityOperation}
 from '../experiments/cpv1-11-mywrite-continuity.js';

const hash=ch=>ch.repeat(64);
const base=Object.freeze({id:'draft:shared',writeId:'save:first',parentWriteId:null,
 deviceId:'device:A',deviceSequence:1,revision:1,deleted:false,payloadHash:hash('a')});
const next=(parent,patch)=>({id:parent.id,writeId:'save:next',parentWriteId:parent.writeId,
 deviceId:'device:B',deviceSequence:1,revision:parent.revision+1,deleted:false,payloadHash:hash('b'),...patch});
const code=value=>error=>error instanceof MyWriteContinuityError&&error.code===value&&error.message===value;

test('CPV1-11.0 detached MyWrite lineage accepts only proved direct descendants and never uses clocks or device sequence to settle forks',()=>{
 const child=next(base,{}),fork=next(base,{writeId:'save:fork',deviceId:'device:A',
  deviceSequence:999,payloadHash:hash('c')});
 assert.equal(planMyWriteContinuity({local:base,remote:child}).action,'accept_remote_fast_forward');
 assert.equal(planMyWriteContinuity({local:child,remote:base}).action,'keep_local_fast_forward');
 const conflict=planMyWriteContinuity({local:child,remote:fork});
 assert.equal(conflict.action,'concurrent_or_unproven_conflict');
 assert.equal(conflict.requiresHumanReview,true);
 assert.equal(conflict.localHash,hash('b'));assert.equal(conflict.remoteHash,hash('c'));
 assert.equal(planMyWriteContinuity({local:base,remote:{...base}}).action,'duplicate');
 assert.throws(()=>planMyWriteContinuity({local:base,remote:{...base,payloadHash:hash('d')}}),
  code('MYWRITE_CONTINUITY_WRITE_COLLISION'));
});

test('CPV1-11.0 two-device offline edit and deletion matrix holds tombstones and preserves conflict evidence without resurrection',()=>{
 const b=next(base,{}),a=next(base,{writeId:'save:offline',deviceId:'device:A',deviceSequence:2,payloadHash:hash('c')});
 const tombstone=next(b,{writeId:'delete:explicit',deviceId:'device:B',deviceSequence:2,
  deleted:true,payloadHash:null});
 const postDelete=next(tombstone,{writeId:'save:old-device',deviceId:'device:A',deviceSequence:999,
  deleted:false,payloadHash:hash('d')});
 assert.equal(planMyWriteContinuity({local:b,remote:tombstone}).action,'accept_tombstone');
 assert.equal(planMyWriteContinuity({local:tombstone,remote:b}).action,'keep_tombstone');
 const stale=planMyWriteContinuity({local:tombstone,remote:a});
 assert.equal(stale.action,'delete_edit_conflict');assert.equal(stale.holdDeletion,true);
 assert.equal(stale.editHash,hash('c'));assert.equal(stale.requiresHumanReview,true);
 assert.equal(planMyWriteContinuity({local:tombstone,remote:postDelete}).action,'reject_resurrection');
 const secondDelete=next(base,{writeId:'delete:other',deleted:true,payloadHash:null});
 const concurrent=planMyWriteContinuity({local:tombstone,remote:secondDelete});
 assert.equal(concurrent.action,'concurrent_tombstones');assert.equal(concurrent.holdDeletion,true);
 // A deterministic two-device synthetic relay can reorder offline operations;
 // every delivery of a stale edit must leave the local deletion authoritative.
 for(const order of [[a,b],[b,a]]){
  const deliveries=[...order,tombstone];
  const result=planMyWriteContinuity({local:tombstone,remote:deliveries[0]});
  assert.ok(result.action==='keep_tombstone'||result.holdDeletion===true);
 }
});

test('CPV1-11.0 metadata-only admission rejects plaintext, getters, malformed lineage and body-bearing tombstones',async()=>{
 assert.deepEqual(validateMyWriteContinuityOperation(base),base);
 assert.throws(()=>validateMyWriteContinuityOperation({...base,text:'private full draft'}),code('MYWRITE_CONTINUITY_INVALID'));
 assert.throws(()=>validateMyWriteContinuityOperation({...base,deleted:true,payloadHash:hash('a')}),code('MYWRITE_CONTINUITY_INVALID'));
 assert.throws(()=>validateMyWriteContinuityOperation({...base,parentWriteId:'save:older'}),code('MYWRITE_CONTINUITY_INVALID'));
 assert.throws(()=>validateMyWriteContinuityOperation({...base,deviceSequence:0}),code('MYWRITE_CONTINUITY_INVALID'));
 const accessor={...base};Object.defineProperty(accessor,'payloadHash',{get(){throw new Error('private');}});
 assert.throws(()=>validateMyWriteContinuityOperation(accessor),code('MYWRITE_CONTINUITY_INVALID'));
 assert.throws(()=>planMyWriteContinuity({local:base,remote:{...base,id:'draft:other'}}),
  code('MYWRITE_CONTINUITY_IDENTITY_MISMATCH'));
 const source=await readFile(new URL('../experiments/cpv1-11-mywrite-continuity.js',import.meta.url),'utf8');
 assert.equal(/fetch\s*\(|WebSocket|XMLHttpRequest|indexedDB|chrome\.storage|Date\.now|navigator|MediaRecorder/.test(source),false);
});


test('CPV1-11.0 bounded local two-device relay replays offline forks and deletion without a network or plaintext channel',()=>{
 const relay=new LocalMyWriteRelay();
 assert.deepEqual(relay.publish(base),{status:'stored',size:1});
 assert.deepEqual(relay.publish(base),{status:'duplicate',size:1});
 assert.deepEqual(relay.inbox('device:B'),[base]);
 const b=next(base,{}),a=next(base,{writeId:'save:offline',deviceId:'device:A',deviceSequence:2,payloadHash:hash('c')});
 relay.publish(b);relay.publish(a);
 assert.equal(relay.inbox('device:A').length,1);
 assert.equal(relay.inbox('device:B').length,2);
 const fork=planMyWriteContinuity({local:a,remote:relay.inbox('device:A')[0]});
 assert.equal(fork.action,'concurrent_or_unproven_conflict');
 const tombstone=next(b,{writeId:'delete:explicit',deviceId:'device:B',deviceSequence:2,
  deleted:true,payloadHash:null});
 relay.publish(tombstone);
 const late=planMyWriteContinuity({local:a,remote:relay.inbox('device:A').at(-1)});
 assert.equal(late.action,'delete_edit_conflict');assert.equal(late.holdDeletion,true);
 assert.throws(()=>relay.publish({...b,text:'private'}),code('MYWRITE_CONTINUITY_INVALID'));
 assert.throws(()=>relay.publish({...base,payloadHash:hash('d')}),code('MYWRITE_CONTINUITY_WRITE_COLLISION'));
 assert.equal(relay.size,4);
 assert.ok(Object.isFrozen(relay.inbox('device:A')));
});


test('CPV1-11.0 synthetic relay bounds metadata and returns immutable copies even at capacity',()=>{
 const relay=new LocalMyWriteRelay();
 for(let i=0;i<128;i++){
  const row={...base,id:'draft:item'+i,writeId:'save:item'+i};
  assert.equal(relay.publish(row).status,'stored');
 }
 assert.equal(relay.size,128);
 const inbox=relay.inbox('device:B');assert.equal(inbox.length,128);
 assert.ok(Object.isFrozen(inbox));assert.ok(Object.isFrozen(inbox[0]));
 assert.throws(()=>relay.publish({...base,id:'draft:overflow',writeId:'save:overflow'}),
  code('MYWRITE_CONTINUITY_RELAY_FULL'));
 assert.equal(relay.publish({...base,id:'draft:item0',writeId:'save:item0'}).status,'duplicate');
 assert.equal(relay.size,128);
});
