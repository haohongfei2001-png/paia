import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
const click=()=>({userActionId:crypto.randomUUID()});
async function fixture(){const f=await completeFixture({texts:['虚构研究九月的判断','虚构研究八月的原始想法','虚构研究十月的修正']});await f.runner.wake(click());const records=await rows(f.s,'records');await f.s.foundationWrite(async t=>{for(let i=0;i<records.length;i++){const r=records[i];r.value.sourceSentAt=r.value.originalText.includes('九月')?'2026-09-01T01:00:00Z':r.value.originalText.includes('八月')?'2026-08-01T01:00:00Z':'2026-10-01T01:00:00Z';await t.put('records',r);}});return {...f,topic:(await rows(f.s,'topics'))[0]};}
test('default Topic reading is chronological and migration is idempotent',async()=>{const f=await fixture(),before=await rows(f.s,'records');const p=await f.s.topicDocumentPage({topicId:f.topic.id});assert.deepEqual(p.items.map(x=>x.entry.body),['虚构研究八月的原始想法','虚构研究九月的判断','虚构研究十月的修正']);assert.ok(p.items.every(x=>x.entry.sourceSentAt));const placements=await rows(f.s,'placements');await f.s.topicDocumentPage({topicId:f.topic.id});assert.deepEqual(await rows(f.s,'placements'),placements);assert.deepEqual(await rows(f.s,'records'),before);});
test('human-protected order remains authoritative over source-time sorting',async()=>{const f=await fixture();await f.s.foundationWrite(async t=>{for(const p of await t.all('placements'))await t.put('placements',{...p,orderProtection:true});});const page=await f.s.topicDocumentPage({topicId:f.topic.id});assert.equal(page.items[0].entry.body,'虚构研究九月的判断');});

test('bounded parallel fenced entry reads retain chronology despite out-of-order completion',async()=>{
 const f=await fixture(),options={topicId:f.topic.id,sort:'asc',limit:40};
 const {topicReadingPage}=await import('../core/organizer/topic-reading.js');
 let expected;do{expected=await topicReadingPage(f.s,options);}while(expected.indexing);
 assert.equal(expected.items.length,3);const original=f.s.readingEntry.bind(f.s),order=[],completed=[];let active=0,peak=0;
 f.s.readingEntry=async id=>{order.push(id);active++;peak=Math.max(peak,active);try{if(id===expected.items[0].entry.id)await new Promise(resolve=>setTimeout(resolve,20));const entry=await original(id);completed.push(id);return entry;}finally{active--;}};
 const page=await topicReadingPage(f.s,options);
 assert.equal(peak,2);assert.equal(active,0);assert.deepEqual(order,expected.items.map(item=>item.entry.id));assert.notEqual(completed[0],order[0]);assert.deepEqual(page.items,expected.items);assert.deepEqual(page.nextCursor,expected.nextCursor);
});

test('expression failure retains its exact error and drains its bounded companion read',async()=>{
 const f=await fixture(),{topicReadingPage}=await import('../core/organizer/topic-reading.js'),options={topicId:f.topic.id,chronology:'expression',sort:'asc',limit:40};
 let baseline;do{baseline=await topicReadingPage(f.s,options);}while(baseline.indexing);
 const original=f.s.readingEntry.bind(f.s),failure=new Error('SYNTHETIC fenced read failure');let active=0,reads=0;
 f.s.readingEntry=async id=>{reads++;active++;try{if(id===baseline.items[0].entry.id)throw failure;await new Promise(resolve=>setTimeout(resolve,10));return await original(id);}finally{active--;}};
 await assert.rejects(topicReadingPage(f.s,options),error=>error===failure);assert.equal(active,0);assert.equal(reads,2,'failure never starts another pair');
});

test('a mutation after a companion body read refuses the entire prefetched page',async()=>{
 const f=await fixture(),{topicReadingPage}=await import('../core/organizer/topic-reading.js'),options={topicId:f.topic.id,sort:'asc',limit:40};
 let before;do{before=await topicReadingPage(f.s,options);}while(before.indexing);
 const original=f.s.readingEntry.bind(f.s);let changed=false;
 f.s.readingEntry=async id=>{const entry=await original(id);if(!changed&&id===before.items[1].entry.id){changed=true;await f.s.foundationWrite(async t=>{const epoch=await t.get('meta','thought-epoch');await t.put('meta',{id:'thought-epoch',value:(epoch?.value||0)+1});});}return entry;};
 const result=await topicReadingPage(f.s,options);assert.equal(changed,true);assert.equal(result.cursorInvalid,true);assert.deepEqual(result.items,[]);assert.deepEqual(result.tracked,[]);
});

test('a real manual note edit during paired hydration invalidates all returned bodies',async()=>{
 const f=await fixture(),{topicReadingPage}=await import('../core/organizer/topic-reading.js'),options={topicId:f.topic.id,sort:'asc',limit:40};
 let before;do{before=await topicReadingPage(f.s,options);}while(before.indexing);
 const original=f.s.readingEntry.bind(f.s),target=before.items[1].entry.id;let edited=false;
 f.s.readingEntry=async id=>{const entry=await original(id);if(!edited&&id===target){edited=true;const current=await f.s.entry(id);const result=await f.s.editLibraryFields({id,expectedRevision:current.revision,expectedFieldRevisions:current.fieldRevisions,changes:{note:'SYNTHETIC concurrent manual note'},operationId:crypto.randomUUID()});assert.notEqual(result.conflict,true);}return entry;};
 const result=await topicReadingPage(f.s,options);assert.equal(edited,true);assert.equal(result.cursorInvalid,true);assert.deepEqual(result.items,[]);assert.deepEqual(result.tracked,[]);assert.equal((await f.s.entry(target)).note,'SYNTHETIC concurrent manual note');
});

test('a real synthetic Source purge during paired hydration cannot return cached bodies',async()=>{
 const f=await fixture(),{topicReadingPage}=await import('../core/organizer/topic-reading.js'),options={topicId:f.topic.id,sort:'asc',limit:40};
 let before;do{before=await topicReadingPage(f.s,options);}while(before.indexing);
 const original=f.s.readingEntry.bind(f.s),target=before.items[1].entry.id;
 const sourceId=await f.s.repository.transaction(false,async t=>(await t.get('thoughts',target)).sourceRecordIds[0]);assert.ok(sourceId);let purged=false;
 f.s.readingEntry=async id=>{const entry=await original(id);if(!purged&&id===target){purged=true;await f.s.permanentDelete(sourceId);}return entry;};
 const result=await topicReadingPage(f.s,options);assert.equal(purged,true);assert.equal(result.cursorInvalid,true);assert.deepEqual(result.items,[]);assert.deepEqual(result.tracked,[]);assert.equal(await f.s.repository.transaction(false,t=>t.get('records',sourceId)),undefined);
});

test('a real edit after tracked material is read invalidates the entire reading response',async()=>{
 const f=await fixture(),{topicReadingPage}=await import('../core/organizer/topic-reading.js'),options={topicId:f.topic.id,sort:'asc',limit:40};
 let before;do{before=await topicReadingPage(f.s,options);}while(before.indexing);
 const target=before.items[0].entry.id,original=f.s.trackedLibraryEntries.bind(f.s);let edited=false;
 f.s.trackedLibraryEntries=async args=>{const tracked=await original(args);const current=await f.s.entry(target);const result=await f.s.editLibraryFields({id:target,expectedRevision:current.revision,expectedFieldRevisions:current.fieldRevisions,changes:{note:'SYNTHETIC tracked boundary edit'},operationId:crypto.randomUUID()});assert.notEqual(result.conflict,true);edited=true;return tracked;};
 const result=await topicReadingPage(f.s,{...options,trackedEntryIds:[target]});assert.equal(edited,true);assert.equal(result.cursorInvalid,true);assert.deepEqual(result.items,[]);assert.deepEqual(result.tracked,[]);assert.equal((await f.s.entry(target)).note,'SYNTHETIC tracked boundary edit');
});

test('expression invalidation after Source purge never returns previously tracked active state',async()=>{
 const f=await fixture(),{topicReadingPage}=await import('../core/organizer/topic-reading.js'),options={topicId:f.topic.id,chronology:'expression',sort:'asc',limit:40};
 let before;do{before=await topicReadingPage(f.s,options);}while(before.indexing);
 const target=before.items[0].entry.id,sourceId=await f.s.repository.transaction(false,async t=>(await t.get('thoughts',target)).sourceRecordIds[0]);assert.ok(sourceId);
 const original=f.s.readingEntry.bind(f.s);let purged=false;
 f.s.readingEntry=async id=>{if(!purged){purged=true;await f.s.permanentDelete(sourceId);}return original(id);};
 const result=await topicReadingPage(f.s,{...options,trackedEntryIds:[target]});assert.equal(purged,true);assert.equal(result.cursorInvalid,true);assert.deepEqual(result.items,[]);assert.deepEqual(result.tracked,[]);
});
