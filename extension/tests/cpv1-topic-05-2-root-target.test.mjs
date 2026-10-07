import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {topicRootURL,topicRootTarget,resolveTopicRootTarget} from '../ui/topic-root-target.js';
const base='chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html';
test('TOPIC-05.2 native links contain only Unicode-safe stable identity and reject malformed/foreign targets',()=>{
 const id='主题 👩🏽‍💻 é / ? #',sectionId='真实分区 & +';assert.deepEqual(topicRootTarget(topicRootURL(id,sectionId,base)),{topicId:id,sectionId});
 for(const suffix of ['#paia-thought?topic=a&topic=b','#paia-thought?topic=a&body=private','#paia-thought?topic=a&section=','#paia-thought?topic=','#other','?query=a#paia-thought?topic=a'])assert.equal(topicRootTarget(base+suffix),null);
 assert.equal(topicRootTarget('https://example.com/ui/archive.html#paia-thought?topic=a'),null);assert.equal(topicRootTarget(base.replace('archive.html','settings.html')+'#paia-thought?topic=a'),null);
});
test('TOPIC-05.2 native target resolution uses actual readonly owners and refuses stale/missing/cross-Topic Section IDs',async()=>{
 const {s}=await setup(OrganizerStore),a=await s.createTopic({name:'SYNTHETIC A',operationId:crypto.randomUUID()}),b=await s.createTopic({name:'SYNTHETIC B',operationId:crypto.randomUUID()}),m=new ThoughtLibraryReadModel(s),read=options=>m.sectionPage(options);
 assert.equal(await resolveTopicRootTarget({topicId:a.id,sectionId:null},read),true);assert.equal(await resolveTopicRootTarget({topicId:a.id,sectionId:a.sectionId},read),true);assert.equal(await resolveTopicRootTarget({topicId:a.id,sectionId:b.sectionId},read),false);assert.equal(await resolveTopicRootTarget({topicId:'missing',sectionId:null},read),false);
 await s.removeTopic({id:a.id,expectedRevision:(await s.topic(a.id)).revision,operationId:crypto.randomUUID()});assert.equal(await resolveTopicRootTarget({topicId:a.id,sectionId:a.sectionId},read),false);
});
