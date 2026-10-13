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
