import test from 'node:test';
import assert from 'node:assert/strict';
import {applyProductSignal,contentAgeBucket,emptyProductSignals,productSignalKey,summarizeProductSignals,validateProductSignal} from '../core/product-signals.js';

const day=Date.parse('2026-09-12T12:00:00Z');

test('product signals accept only fixed event names and fixed enum dimensions',()=>{
 const valid={name:'context_build',dimensions:{outcome:'hit',profile:'default',budget:'standard'}};
 assert.deepEqual(validateProductSignal(valid),valid);
 assert.equal(validateProductSignal({...valid,query:'private text'}),null);
 assert.equal(validateProductSignal({name:'context_build',dimensions:{outcome:'hit',profile:'default',budget:'standard',topicId:'private'}}),null);
 assert.equal(validateProductSignal({name:'unknown',dimensions:{}}),null);
 assert.equal(productSignalKey(valid),'context_build|budget=standard|outcome=hit|profile=default');
});

test('product signal rows retain aggregate counters only and prune old date buckets',()=>{
 let row=emptyProductSignals(day,true);
 row=applyProductSignal(row,{name:'input_search',dimensions:{outcome:'hit'}},day-91*86400000);
 row=applyProductSignal(row,{name:'input_search',dimensions:{outcome:'hit'}},day);
 row=applyProductSignal(row,{name:'input_target_open',dimensions:{origin:'search',age:'365_plus'}},day);
 row=applyProductSignal(row,{name:'reading_copy',dimensions:{surface:'input',origin:'search'}},day);
 assert.equal(Object.keys(row.daily).length,1);
 assert.equal(JSON.stringify(row).includes('private'),false);
 const summary=summarizeProductSignals(row,day);
 assert.equal(summary.input,undefined);
 assert.equal(summary.all.input.searches,1);
 assert.equal(summary.all.input.searchHits,1);
 assert.equal(summary.all.input.searchOpens,1);
 assert.equal(summary.all.input.searchCopies,1);
 assert.equal(summary.all.input.old180DayOpens,1);
 assert.equal(summary.all.input.searchCopyPerOpen,1);
});

test('summaries expose observable product loops without claiming user intent',()=>{
 let row=emptyProductSignals(day,true);
 for(const signal of [
  {name:'thought_topic_open',dimensions:{repeat:'first'}},
  {name:'thought_topic_open',dimensions:{repeat:'repeat'}},
  {name:'thought_ai_view',dimensions:{view:'ai'}},
  {name:'thought_ai_view',dimensions:{view:'original'}},
  {name:'thought_ai_edit',dimensions:{result:'saved'}},
  {name:'context_build',dimensions:{outcome:'hit',profile:'custom',budget:'detailed'}},
  {name:'context_share',dimensions:{format:'copy'}}
 ])row=applyProductSignal(row,signal,day);
 const summary=summarizeProductSignals(row,day);
 assert.equal(summary.all.thought.topicOpens,2);
 assert.equal(summary.all.thought.repeatTopicOpens,1);
 assert.equal(summary.all.thought.repeatOpenShare,.5);
 assert.equal(summary.all.thought.aiViewOpens,1);
 assert.equal(summary.all.thought.returnsToOriginal,1);
 assert.equal(summary.all.thought.aiSavedEdits,1);
 assert.equal(summary.all.context.builds,1);
 assert.equal(summary.all.context.customProfileBuilds,1);
 assert.equal(summary.all.context.shares,1);
 assert.equal(summary.all.context.sharePerBuild,1);
});

test('age buckets are coarse and never retain a source timestamp',()=>{
 assert.equal(contentAgeBucket('2026-09-01T00:00:00Z',day),'lt30');
 assert.equal(contentAgeBucket('2026-05-01T00:00:00Z',day),'30_179');
 assert.equal(contentAgeBucket('2026-01-01T00:00:00Z',day),'180_364');
 assert.equal(contentAgeBucket('2025-01-01T00:00:00Z',day),'365_plus');
 assert.equal(contentAgeBucket(null,day),'unknown');
});
