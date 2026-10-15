import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {invalidateThoughtTopicIndex} from '../core/thought-read-index.js';
const op=()=>crypto.randomUUID();
test('retired relation cardinality remains canonical when a real timed generation is invalidated',async()=>{
 const f=await completeFixture({texts:['SYNTHETIC source expression']}),input=(await rows(f.s,'blocks'))[0].value;
 const topic=await f.s.createTopic({name:'SYNTHETIC relation oracle',operationId:op()});
 const prior=await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[topic.id]});
 const before=await f.s.topicDocumentPage({topicId:topic.id});assert.equal(before.items.length,1);
 const tables=['thoughts','placements','entryRelations','operationReceipts'],snapshot=async()=>Object.fromEntries(await Promise.all(tables.map(async name=>[name,await rows(f.s,name)]))),saved=await snapshot();
 await assert.rejects(f.s.continueThinking({operationId:op(),topicId:topic.id,body:'SYNTHETIC refused',relation:{toEntryId:prior.id}}),{code:'INVALID_REQUEST'});
 assert.deepEqual(await snapshot(),saved,'actual retired relation refusal writes no Entry, placement, relation or receipt');
 // Inject only an existing source-time invalidation between real index build
 // and its final generation check. Never synthesize a TOPIC_DOCUMENT_PAGE DTO.
 const run=f.s.run.bind(f.s);let invalidated=false;
 f.s.run=async task=>{const value=await run(task);if(!invalidated&&value?.pending===false&&value?.activeGeneration&&value?.key){invalidated=true;await f.s.foundationWrite(t=>invalidateThoughtTopicIndex(f.s,t,topic.id,{sourceTime:true}));}return value;};
 const timed=await f.s.topicDocumentPage({topicId:topic.id,sort:'asc'});assert.equal(invalidated,true);
 assert.equal(timed.indexing,true);assert.notEqual(timed.coverage.activeKey,timed.coverage.currentKey);assert.deepEqual(timed.items,[],'an unavailable timed generation is not proof that the canonical Topic is empty');
 const after=await f.s.topicDocumentPage({topicId:topic.id});assert.equal(after.items.length,1,'rejected relation cannot create an Entry');assert.equal(after.nextCursor,null);assert.deepEqual(after.items,before.items,'same canonical Entry and placement before and after refusal');assert.deepEqual(await snapshot(),saved);
 const recovered=await f.s.topicDocumentPage({topicId:topic.id,sort:'asc'});assert.equal(recovered.indexing,undefined);assert.equal(recovered.complete,true);assert.equal(recovered.items.length,1);assert.equal(recovered.items[0].entry.id,prior.id,'real timed reader still qualifies the original identity');
});
