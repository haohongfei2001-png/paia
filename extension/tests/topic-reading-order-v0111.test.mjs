import test from 'node:test';import assert from 'node:assert/strict';
import {compareReadingTopics,recordRead,decayedReads} from '../core/topic-reading-order.js';
import {projectBackupEntity,validateBackupItem} from '../core/backup-format.js';
const now=1800000000000,day=86400000;
test('Reading order prioritizes meaningful content, then recent reading; pins and cumulative visits cannot dominate',()=>{
 const rows=[{id:'old',meaningfulContentAt:now-90*day,pinKey:0,readingActivity:{at:now-30*day,weight:100000}},{id:'new',meaningfulContentAt:now-1000},{id:'read',meaningfulContentAt:now-90*day,readingActivity:{at:now-1000,weight:1}},{id:'a',meaningfulContentAt:0},{id:'b',meaningfulContentAt:0}];
 const rank=xs=>xs.sort((a,b)=>compareReadingTopics(a,b,now)).map(x=>x.id);
 assert.deepEqual(rank([...rows]),['new','read','old','a','b']);assert.deepEqual(rank([...rows].reverse()),rank([...rows]));assert.ok(decayedReads(rows[0].readingActivity,now)<.5);assert.equal(recordRead({at:now-100,weight:1},now).at,now-100);assert.ok(recordRead({at:now-90*day,weight:8},now).weight<1.01);
});
test('Backup omits empty legacy Entry titles, preserves unexpected nonempty text, and accepts both forms',()=>{
 const base={id:'synthetic',storageSchema:2,body:'正文',sourceRecordIds:[],protections:{}};
 for(const title of ['', '  ',null,undefined]){const row=projectBackupEntity('entries',{...base,title});if(typeof title==='string')assert.equal(Object.hasOwn(row,'title'),false);validateBackupItem({type:'item',section:'entries',value:row});}
 const legacy=projectBackupEntity('entries',{...base,title:'意外的旧标题'});assert.equal(legacy.title,'意外的旧标题');validateBackupItem({type:'item',section:'entries',value:legacy});
});

import {setup} from './harness/thought-m1.mjs';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
test('Actual store indexes meaningful body time; note/rename/pin/read leave content revisions alone; new title absent',async()=>{
 let clock=now;const {s}=await setup(LibraryDocumentsStore,{clock:()=>new Date(clock).toISOString()});
 const topic=await s.createTopic({name:'Synthetic reading order',operationId:crypto.randomUUID()});
 const e=await s.createEntry({actor:'user',body:'Meaningful thought',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});
 assert.equal(Object.hasOwn(await s.repository.transaction(false,t=>t.get('thoughts',e.id)),'title'),false);
 await s.placeEntry({topicId:topic.id,entryId:e.id,expectedEntryRevision:0,expectedTopicRevision:0,operationId:crypto.randomUUID()});await s.libraryIndexPage({mode:'reading'});await s.drainLibraryMaintenance();
 const original=(await s.libraryIndexPage({mode:'reading'})).items[0];assert.equal(original.meaningfulContentAt,now);
 clock+=86400000;const entry=await s.entry(e.id);await s.editLibraryFields({id:e.id,expectedRevision:entry.revision,expectedFieldRevisions:entry.fieldRevisions,changes:{note:'note only'},operationId:crypto.randomUUID()});
 await s.libraryIndexPage({mode:'reading'});await s.drainLibraryMaintenance();assert.equal((await s.libraryIndexPage({mode:'reading'})).items[0].meaningfulContentAt,now);
 const before=await s.topic(topic.id);await s.recordTopicRead(topic.id);const after=await s.topic(topic.id);assert.equal(after.revision,before.revision);assert.equal(after.organizationRevision,before.organizationRevision);assert.equal(after.readingActivity.at,clock);
});
test('An isolated old visit eventually loses every ranking signal',()=>{const a={id:'a'},b={id:'b',readingActivity:{at:now-100*day,weight:1}};assert.ok(compareReadingTopics(a,b,now)<0);});
