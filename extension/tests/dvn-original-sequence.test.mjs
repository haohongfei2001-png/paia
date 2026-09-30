import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,capture,inputEdit} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ArchiveOriginalQuery} from '../core/archive-original-query.js';
import {readOriginalText} from '../ui/original-sequence.js';
async function fixture(count=1){const {s,indexedDB}=await setup(OrganizerStore);const epoch=(await s.status()).epoch;for(let i=1;i<count;i++){const request=capture(epoch,'dvn-original-'+i,'SYNTHETIC 原话 '+i+' 👩‍💻');request.messages[0].pageOrder=i+1;await s.capture(request);}const b=(await s.snapshot()).library.blocks[0];return {s,b,q:new ArchiveOriginalQuery(s)};}
test('Q2 Conversation reads every immutable Source through bounded pages even after Input removal and Source hiding',async()=>{
 const {s,b,q}=await fixture(123),original=(await s.snapshot()).records.sort((a,b)=>a.conversationOrder-b.conversationOrder);await inputEdit(s,b.id,{libraryText:'SYNTHETIC human working version',excluded:true});await s.update(original[51].id,{hidden:true});await s.trash(original[96].id);
 const target={kind:'conversation',ref:b.documentId},ids=[];let cursor=null,generation;
 do{const p=await q.page({target,cursor,limit:17,...(generation===undefined?{}:{expectedGeneration:generation})});generation=p.generation;assert.equal(p.availability,'available');assert.equal(p.intended,123);assert.ok(p.records.length<=17);ids.push(...p.records.map(r=>r.id));cursor=p.nextCursor;}while(cursor);
 assert.equal(new Set(ids).size,123);assert.deepEqual(new Set(ids),new Set(original.map(r=>r.id)));assert.equal(ids[51],original[51].id);assert.equal(ids[96],original[96].id);
 const copied=await readOriginalText({read:page=>q.page(page),target,generation});assert.equal(copied,original.map(r=>r.originalText).join('\n\n'));assert.equal(copied.includes('human working version'),false);
});
test('Q2 selected Input scope never substitutes another Input or Working text; unavailable Source is explicit',async()=>{
 const {s,b,q}=await fixture(4);await inputEdit(s,b.id,{libraryText:'SYNTHETIC changed working prose'});const target={kind:'input',ref:b.id};const p=await q.page({target});assert.equal(p.intended,1);assert.equal(p.records.length,1);assert.equal(p.records[0].originalText,'Synthetic explicit working input');assert.deepEqual(Object.keys(p.records[0]).sort(),['id','originalText','sourceSentAt']);assert.equal(p.records[0].sourceSentAt,null);
 await s.permanentDelete(b.sourceRecordId);const missing=await q.page({target});assert.equal(missing.availability,'unavailable');assert.deepEqual(missing.records,[]);
 await assert.rejects(readOriginalText({read:page=>q.page(page),target,generation:missing.generation}),/SOURCE_UNAVAILABLE/);
});
test('Q2 rejects stale/cross-target/forged bounds and discloses no technical or capture metadata',async()=>{
 const {s,b,q}=await fixture(4),target={kind:'conversation',ref:b.documentId},p=await q.page({target,limit:1});assert.ok(p.nextCursor);
 for(const bad of [{target:{...target,extra:true}},{target,limit:101},{target,cursor:{...p.nextCursor,visible:['other-chat',0,1,'',1,'id']}},{target:{kind:'input',ref:b.id},cursor:p.nextCursor},{target,body:'untrusted'},{target,cursor:0},{target,cursor:false},{target,cursor:''}])await assert.rejects(async()=>q.page(bad),{code:'INVALID_REQUEST'});
 await inputEdit(s,b.id,{note:'SYNTHETIC new note'});await assert.rejects(q.page({target,cursor:p.nextCursor}),{code:'BACKUP_CHANGED'});
 assert.equal(JSON.stringify(p).includes('capturedAt'),false);assert.equal(JSON.stringify(p).includes('timeCandidates'),false);
});
test('Q2 complete Copy fails closed on late generation changes, unavailable tail, duplicate pages or abandoned modal',async()=>{
 const {s,b,q}=await fixture(104),target={kind:'conversation',ref:b.documentId},first=await q.page({target});let reads=0;
 await assert.rejects(readOriginalText({target,generation:first.generation,read:async page=>{const result=await q.page(page);if(++reads===2)await inputEdit(s,b.id,{note:'SYNTHETIC invalidate after final body page'});return result;}}),{code:'BACKUP_CHANGED'});
 const current=await q.page({target});let active=true;await assert.rejects(readOriginalText({target,generation:current.generation,isCurrent:()=>active,read:async page=>{const result=await q.page(page);active=false;return result;}}),/BACKUP_CHANGED/);
 await assert.rejects(readOriginalText({target,generation:0,read:async()=>({generation:0,availability:'partial',unavailable:1,records:[],nextCursor:null})}),/SOURCE_UNAVAILABLE/);
 await assert.rejects(readOriginalText({target,generation:0,read:async()=>({generation:0,availability:'available',unavailable:0,records:[{id:'duplicate',originalText:'SYNTHETIC'}],nextCursor:['repeat']})}),/INVALID_ORIGINAL_CURSOR/);
});
