import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from './vendor/fake-indexeddb/build/esm/index.js';
import {MyWriteDraftStore} from '../core/mywrite-draft.js';
import {MAX_MESSAGE_LENGTH} from '../core/constants.js';

const complete=Array.from({length:1000},(_,i)=>'第'+i+'段：完整想法🧭，不要删除否定词，不要概括。\n').join('')+'尾部：绝对不要自动发送。';
const command=(text=complete,expectedRevision=0,operationId='write:1')=>({
 id:'draft:one',expectedRevision,text,topicId:null,operationId
});
const code=value=>error=>error.code===value&&error.message===value;
function fixture(){
 const indexedDB=new IDBFactory();let now=1720000000000;
 const first=new MyWriteDraftStore({indexedDB,clock:()=>now});
 const second=new MyWriteDraftStore({indexedDB,clock:()=>now});
 return {indexedDB,first,second,setTime:value=>{now=value;}};
}
async function raw(store,operation){
 const db=await store.open();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('drafts','readwrite');operation(tx.objectStore('drafts'),tx);
  tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
 });
}

test('CPV1-10 local MyWrite preserves complete text and actual first-save time across close/reopen',async()=>{
 const f=fixture(),saved=await f.first.save(command());
 assert.equal(saved.text,complete);assert.equal(saved.revision,1);
 assert.equal(saved.createdAt,1720000000000);assert.equal(saved.updatedAt,saved.createdAt);
 f.first.close();f.setTime(1720000009000);
 const recovered=await f.second.read('draft:one');
 assert.deepEqual(recovered,saved);
 const edited=await f.second.save({...command(complete+'\n更正，不要丢失原文。',1,'write:2'),topicId:'topic:optional'});
 assert.equal(edited.createdAt,saved.createdAt);assert.equal(edited.updatedAt,1720000009000);
 assert.equal(edited.text,complete+'\n更正，不要丢失原文。');assert.equal(edited.topicId,'topic:optional');
 const reviewed=await f.second.review('draft:one',2);
 assert.equal(reviewed.text,edited.text);assert.equal(reviewed.authorRole,'human');assert.equal(reviewed.origin,'mywrite');
 assert.equal(reviewed.createdAt,saved.createdAt);assert.ok(Object.isFrozen(reviewed));
 assert.deepEqual(await f.second.read('draft:one'),edited,'review does not promote or rewrite the draft');
 f.second.close();
});

test('CPV1-10 two connections serialize optimistic edits without losing either conflict text',async()=>{
 const f=fixture();await f.first.save(command());
 const texts=[complete+'\n第一个会话的完整更正。',complete+'\n第二个会话的完整更正。'];
 const outcomes=await Promise.allSettled([
  f.first.save(command(texts[0],1,'write:first')),
  f.second.save(command(texts[1],1,'write:second'))
 ]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 const rejected=outcomes.find(x=>x.status==='rejected');assert.ok(code('MYWRITE_CONFLICT')(rejected.reason));
 const winner=outcomes.find(x=>x.status==='fulfilled').value;
 assert.equal(winner.revision,2);assert.ok(texts.includes(winner.text));
 assert.deepEqual(await f.first.read('draft:one'),winner);
 assert.deepEqual(await f.second.read('draft:one'),winner);
 assert.equal(texts[0],complete+'\n第一个会话的完整更正。');
 assert.equal(texts[1],complete+'\n第二个会话的完整更正。');
 f.first.close();f.second.close();
});

test('CPV1-10 committed save with lost acknowledgement retries the same identity exactly once',async()=>{
 const f=fixture();const saved=await f.first.save(command());
 // Ignore the returned acknowledgement, close the client, and reissue the
 // exact full command from another connection after the commit completed.
 f.first.close();f.setTime(1720000009999);
 assert.deepEqual(await f.second.save(command()),saved);
 await assert.rejects(()=>f.second.save(command(complete+'changed',0,'write:1')),code('MYWRITE_CONFLICT'));
 const edited=await f.second.save(command(complete+'\n完整更新。',1,'write:2'));
 assert.deepEqual(await f.second.save(command(complete+'\n完整更新。',1,'write:2')),edited);
 await assert.rejects(()=>f.second.save(command(complete,0,'write:1')),code('MYWRITE_CONFLICT'));
 assert.deepEqual(await f.second.read('draft:one'),edited);
 f.second.close();
});

test('CPV1-10 explicit delete retains an empty tombstone and stale clients cannot resurrect work',async()=>{
 const f=fixture();const initial=await f.first.save(command());f.setTime(1720000000001);
 const removed=await f.second.remove({id:initial.id,expectedRevision:1,operationId:'delete:1'});
 assert.equal(removed.revision,2);assert.equal(removed.text,null);assert.equal(removed.topicId,null);
 assert.equal(removed.lifecycle,'deleted');assert.equal(removed.createdAt,initial.createdAt);
 assert.deepEqual(await f.first.remove({id:initial.id,expectedRevision:1,operationId:'delete:1'}),removed);
 await assert.rejects(()=>f.first.save(command(complete+'resurrect',1,'write:old')),code('MYWRITE_DELETED'));
 await assert.rejects(()=>f.first.save(command()),code('MYWRITE_DELETED'));
 await assert.rejects(()=>f.first.review(initial.id,2),code('MYWRITE_DELETED'));
 assert.deepEqual(await f.first.read(initial.id),removed);
 assert.ok(!JSON.stringify(removed).includes('不要删除否定词'));
 f.first.close();f.second.close();
});

test('CPV1-10 stale review and stale deletion refuse while the current full draft remains intact',async()=>{
 const f=fixture();await f.first.save(command());
 const current=await f.second.save(command(complete+'\n当前全量正文。',1,'write:2'));
 await assert.rejects(()=>f.first.review('draft:one',1),code('MYWRITE_CONFLICT'));
 await assert.rejects(()=>f.first.remove({id:'draft:one',expectedRevision:1,operationId:'delete:stale'}),code('MYWRITE_CONFLICT'));
 assert.deepEqual(await f.first.read('draft:one'),current);
 assert.equal((await f.first.review('draft:one',2)).text,current.text);
 f.first.close();f.second.close();
});

test('CPV1-10 denied quota aborts one whole transaction and retains previous full text',async()=>{
 const f=fixture();const initial=await f.first.save(command());const db=await f.first.open();
 const realTransaction=db.transaction.bind(db);
 db.transaction=(...args)=>{
  const tx=realTransaction(...args),realStore=tx.objectStore.bind(tx);
  tx.objectStore=(...storeArgs)=>{
   const store=realStore(...storeArgs);
   store.put=()=>{throw new DOMException('PRIVATE_BROWSER_EXCEPTION_CANARY','QuotaExceededError');};
   return store;
  };
  return tx;
 };
 await assert.rejects(()=>f.first.save(command(complete+'\n本地仍持有待保存正文。',1,'write:2')),error=>{
  assert.ok(!error.message.includes('PRIVATE_BROWSER_EXCEPTION_CANARY'));
  return error.code==='MYWRITE_STORAGE_FULL';
 });
 db.transaction=realTransaction;
 assert.deepEqual(await f.second.read('draft:one'),initial);
 f.first.close();f.second.close();
});

test('CPV1-10 aborted transaction never acknowledges an uncommitted draft',async()=>{
 const f=fixture();await f.first.open();const db=f.first.database,realTransaction=db.transaction.bind(db);
 db.transaction=(...args)=>{
  const tx=realTransaction(...args),realStore=tx.objectStore.bind(tx);
  tx.objectStore=(...storeArgs)=>{
   const store=realStore(...storeArgs),realPut=store.put.bind(store);
   store.put=value=>{const request=realPut(value);tx.abort();return request;};
   return store;
  };return tx;
 };
 await assert.rejects(()=>f.first.save(command()),code('MYWRITE_UNAVAILABLE'));
 db.transaction=realTransaction;
 assert.equal(await f.second.read('draft:one'),null);
 f.first.close();f.second.close();
});

test('CPV1-10 corrupt stored rows refuse and are preserved for diagnosis instead of repaired',async()=>{
 const f=fixture();const initial=await f.first.save(command());
 const corrupt={...initial,createdAt:initial.updatedAt+1};
 await raw(f.first,store=>store.put(corrupt));
 await assert.rejects(()=>f.second.read('draft:one'),code('MYWRITE_CORRUPT'));
 await assert.rejects(()=>f.second.save(command(complete,1,'write:2')),code('MYWRITE_CORRUPT'));
 const observed=await new Promise((resolve,reject)=>{
  const tx=f.first.database.transaction('drafts','readonly'),request=tx.objectStore('drafts').get('draft:one');
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
 assert.deepEqual(observed,corrupt);
 f.first.close();f.second.close();
});

test('CPV1-10 clock rollback preserves original creation time and last acknowledged update',async()=>{
 const f=fixture();const first=await f.first.save(command());f.setTime(first.createdAt-86400000);
 const second=await f.second.save(command(complete+'\n设备时钟回退，正文保留。',1,'write:2'));
 assert.equal(second.createdAt,first.createdAt);assert.equal(second.updatedAt,first.updatedAt);
 f.setTime(Number.NaN);
 await assert.rejects(()=>f.first.save(command(complete,2,'write:3')),code('MYWRITE_INVALID_TIME'));
 assert.deepEqual(await f.second.read('draft:one'),second);
 f.first.close();f.second.close();
});

test('CPV1-10 input bounds refuse whole oversize text and accept exact existing archive ceiling',async()=>{
 const f=fixture(),body='否'.repeat(MAX_MESSAGE_LENGTH-1)+'。';
 const saved=await f.first.save(command(body));assert.equal(saved.text,body);assert.equal(saved.text.length,MAX_MESSAGE_LENGTH);
 await assert.rejects(()=>f.first.save(command(body+'尾',1,'write:2')),code('MYWRITE_INVALID'));
 assert.equal((await f.second.read('draft:one')).text,body);
 f.first.close();f.second.close();
});

test('CPV1-10 descriptor-only admission rejects private getters, extras and forged timestamps',async()=>{
 const f=fixture();let reads=0;
 const invalid=command();Object.defineProperty(invalid,'text',{get(){reads++;throw Error('PRIVATE_GETTER_CANARY');},enumerable:true});
 await assert.rejects(()=>f.first.save(invalid),code('MYWRITE_INVALID'));assert.equal(reads,0);
 for(const extra of [{createdAt:1},{authorRole:'assistant'},{origin:'ai'},{sourceId:'source:fake'}]){
  await assert.rejects(()=>f.first.save({...command(),...extra}),code('MYWRITE_INVALID'));
 }
 assert.equal(await f.first.read('draft:one'),null);
 assert.equal(reads,0);f.first.close();f.second.close();
});

test('CPV1-10 operation arguments are frozen by value before asynchronous persistence admission',async()=>{
 const f=fixture(),value=command();const pending=f.first.save(value);
 value.text='PRIVATE_CHANGED_CALLER_BODY';value.operationId='write:changed';value.topicId='topic:changed';
 const saved=await pending;assert.equal(saved.text,complete);assert.equal(saved.lastWriteId,'write:1');assert.equal(saved.topicId,null);
 assert.deepEqual(await f.second.read('draft:one'),saved);f.first.close();f.second.close();
});

test('CPV1-10 no automatic expiry or draft eviction occurs when unrelated drafts are saved',async()=>{
 const f=fixture();const first=await f.first.save(command());f.setTime(first.createdAt+365*86400000);
 for(let i=0;i<40;i++)await f.second.save({...command(complete,0,'write:other:'+i),id:'draft:other:'+i});
 assert.deepEqual(await f.first.read('draft:one'),first,'human unsaved work has no hidden TTL or old-draft eviction');
 assert.equal((await f.first.review('draft:one',1)).text,complete);
 f.first.close();f.second.close();
});

test('CPV1-10 closed client fails promptly and never opens a new storage connection',async()=>{
 const f=fixture();f.first.close();
 await assert.rejects(()=>f.first.save(command()),code('MYWRITE_CLOSED'));
 await assert.rejects(()=>f.first.read('draft:one'),code('MYWRITE_CLOSED'));
 assert.equal(await f.second.read('draft:one'),null);f.second.close();
});
