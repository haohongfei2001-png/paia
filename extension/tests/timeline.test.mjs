import test from 'node:test';
import assert from 'node:assert/strict';
import {timelineCompare,conversationCompare} from '../core/timeline.js';
test('timeline: historical source time outranks capture time and unknown is explicitly last',()=>{
 const a={id:'a',chatId:'c',sourceSentAt:'2020-01-01T00:00:00Z',capturedAt:'2026-01-01T00:00:00Z',conversationOrder:1};
 const b={...a,id:'b',sourceSentAt:'2021-01-01T00:00:00Z',capturedAt:'2025-01-01T00:00:00Z',conversationOrder:2};
 const c={...a,id:'c',sourceSentAt:null,capturedAt:'2027-01-01T00:00:00Z'};
 assert.deepEqual([a,c,b].sort(timelineCompare).map(r=>r.id),['b','a','c']);
});
test('timeline: same chat equal sent time uses conversation order; chat group is ascending conversation order',()=>{
 const a={id:'a',chatId:'c',sourceSentAt:'2020-01-01T00:00:00Z',capturedAt:'2026-01-01T00:00:00Z',conversationOrder:1};
 const b={...a,id:'b',conversationOrder:2};assert.ok(timelineCompare(b,a)<0);assert.ok(conversationCompare(a,b)<0);
});
test('timeline: comparator is transitive across interleaved chats and missing fields',()=>{
 const rows=Array.from({length:12},(_,i)=>({id:String(i),chatId:String(i%3),sourceSentAt:i%4?'2020-01-0'+(i%3+1)+'T00:00:00Z':null,capturedAt:'2026-01-01T00:00:00Z',conversationOrder:i}));
 for(const a of rows)for(const b of rows)for(const c of rows)if(timelineCompare(a,b)<=0&&timelineCompare(b,c)<=0)assert.ok(timelineCompare(a,c)<=0);
});
test('conversation ordering remains transitive when migrated records have unknown ordinals',()=>{
 const rows=[{id:'a',conversationOrder:1,sourceSentAt:'2022'},{id:'b',conversationOrder:2,sourceSentAt:'2020'},{id:'c',conversationOrder:null,sourceSentAt:'2021'}];
 for(const a of rows)for(const b of rows)for(const c of rows)if(conversationCompare(a,b)<=0&&conversationCompare(b,c)<=0)assert.ok(conversationCompare(a,c)<=0);
});
