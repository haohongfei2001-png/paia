import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,seedMetadata,allPages,windowOptions,ArchiveNavigationQuery} from './harness/ans-navigation.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
const capture=(epoch,id,text)=>({epoch,adapterVersion:'0.3.0',chat:{id,url:'https://chatgpt.com/c/'+id,title:'Synthetic concurrent capture'},messages:[{sourceMessageId:id+'-input',pageOrder:1,originalText:text}]});
test('ANS-04 capture/edit remain usable during rebuild; record actual writer queue wait without body-backed Navigator reads',async()=>{
 const f=await completeFixture({texts:[]});await seedMetadata(f.s,400);
 const epoch=(await f.s.status()).epoch;
 await f.s.capture(capture(epoch,'ans04-before-build','Initial immutable Source'));
 const [doc]=await f.s.repository.transaction(false,t=>t.all('documents','byChat','chatgpt:ans04-before-build',1));
 const other=new OrganizerStore(f.storage,{indexedDB:f.indexedDB});await other.status();
 const q=new ArchiveNavigationQuery(f.s),transaction=q.index.transaction.bind(q.index);let pending=null,armed=false,blockedWriterMs=null,captureMs=null,editMs=null;
 q.index.transaction=(write,fn,stores)=>transaction(write,async t=>{
  if(write){const put=t.put.bind(t);t.put=(name,value,key)=>{
   if(armed&&!pending&&name==='meta'&&value.id.startsWith('ans:index:v1:member:')){
    pending=(async()=>{
     const start=performance.now();await other.repository.transaction(true,tx=>tx.get('meta','ans:index-state:v1:catalog'),['meta']);blockedWriterMs=performance.now()-start;
     const at=performance.now();await other.capture(capture(epoch,'ans04-during-build','New immutable Source during rebuild'));captureMs=performance.now()-at;
     const editAt=performance.now();await other.updateDocument(doc.id,{userTitle:'Concurrent user title'});editMs=performance.now()-editAt;
    })();
   }
   return put(name,value,key);
  };}
  return fn(t);
 },stores);
 await q.page(windowOptions);armed=true;const building=await q.page(windowOptions);assert.equal(building.coverage.state,'building');assert.ok(pending);await pending;
 const windows=await allPages(q,windowOptions);assert.equal(windows.length,402);assert.equal(new Set(windows.map(w=>w.documentId)).size,402);
 assert.equal(windows.find(w=>w.documentId===doc.id).title,'Concurrent user title');assert.ok(windows.some(w=>w.conversationRef?.sourceConversationId==='ans04-during-build'));
 assert.ok(Number.isFinite(blockedWriterMs)&&blockedWriterMs>=0);assert.ok(Number.isFinite(captureMs)&&Number.isFinite(editMs));
 console.log('ANS04_WRITER_EVIDENCE '+JSON.stringify({windows:402,blockedWriterMs,captureMs,editMs,measurement:'queued readwrite transaction through first metadata read; includes one read service time'}));
});
