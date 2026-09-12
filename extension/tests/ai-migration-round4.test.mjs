import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,meta,rows} from './harness/original-complete.mjs';
import {migrateAIPresentations} from '../core/organizer/ai-presentation.js';

const legacyPresentation=topic=>({id:'aiPresentation:'+topic.id,topicId:topic.id,revision:3,currentView:'legacy',protections:{currentView:true}});

async function prepared(){
 const f=await completeFixture({texts:['PAIA migration bookkeeping synthetic input.']});
 await f.runner.wake({userActionId:crypto.randomUUID()});
 const topic=(await rows(f.s,'topics'))[0];
 return {f,topic};
}

test('Round 4: legacy v1 marker cannot permanently skip an unresolved Topic cache',async()=>{
 const {f,topic}=await prepared();
 const before=await Promise.all(['records','inputStates','thoughts'].map(name=>rows(f.s,name)));
 await f.s.foundationWrite(async t=>{
  const row=await t.get('topics',topic.id);delete row.activeLayoutGeneration;await t.put('topics',row);
  await t.put('meta',legacyPresentation(topic));
  await t.put('meta',{id:'aiProductizationMigration',version:1,at:'2026-01-01T00:00:00.000Z'});
 });
 let marker=await migrateAIPresentations(f.s);
 assert.equal(marker.version,2);assert.equal(marker.complete,false);assert.deepEqual(marker.pendingTopicIds,[topic.id]);
 assert.equal((await meta(f.s,'aiPresentation:'+topic.id)).schemaVersion,undefined);
 assert.equal((await rows(f.s,'libraryMigrationItems')).some(x=>x.id==='ai-presentation-fence:'+topic.id),false);
 assert.deepEqual(await Promise.all(['records','inputStates','thoughts'].map(name=>rows(f.s,name))),before);

 await f.s.foundationWrite(async t=>{const row=await t.get('topics',topic.id);row.activeLayoutGeneration=1;await t.put('topics',row);});
 marker=await migrateAIPresentations(f.s);
 assert.equal(marker.complete,true);assert.deepEqual(marker.pendingTopicIds,[]);
 const migrated=await meta(f.s,'aiPresentation:'+topic.id);assert.equal(migrated.schemaVersion,0);assert.equal(migrated.needsUpdate,true);assert.equal(migrated.currentView,'legacy');
 assert.equal((await rows(f.s,'libraryMigrationItems')).some(x=>x.id==='ai-presentation-fence:'+topic.id),true);
 assert.deepEqual(await Promise.all(['records','inputStates','thoughts'].map(name=>rows(f.s,name))),before);
});

test('Round 4: unresolved Topic without an AI cache does not keep migration incomplete',async()=>{
 const {f,topic}=await prepared();
 await f.s.foundationWrite(async t=>{const row=await t.get('topics',topic.id);delete row.activeLayoutGeneration;await t.put('topics',row);await t.delete('meta','aiProductizationMigration');});
 const marker=await migrateAIPresentations(f.s);
 assert.equal(marker.version,2);assert.equal(marker.complete,true);assert.deepEqual(marker.pendingTopicIds,[]);
});

test('Round 4: an incomplete v2 marker revisits only its pending Topic and then becomes stable',async()=>{
 const {f,topic}=await prepared();
 await f.s.foundationWrite(async t=>{
  const row=await t.get('topics',topic.id);delete row.activeLayoutGeneration;await t.put('topics',row);
  await t.put('meta',legacyPresentation(topic));
  await t.put('meta',{id:'aiProductizationMigration',version:2,complete:false,pendingTopicIds:[topic.id],unresolvedTopics:1,at:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'});
 });
 const first=await migrateAIPresentations(f.s);assert.equal(first.complete,false);
 const unchanged=await meta(f.s,'aiProductizationMigration');assert.equal(unchanged.updatedAt,'2026-01-01T00:00:00.000Z');
 await f.s.foundationWrite(async t=>{const row=await t.get('topics',topic.id);row.activeLayoutGeneration=1;await t.put('topics',row);});
 const completed=await migrateAIPresentations(f.s);assert.equal(completed.complete,true);
 const frozen=structuredClone(await meta(f.s,'aiProductizationMigration'));
 await migrateAIPresentations(f.s);
 assert.deepEqual(await meta(f.s,'aiProductizationMigration'),frozen);
});

test('Round 4: missing pending Topic/cache is retired instead of resurrected',async()=>{
 const {f,topic}=await prepared();
 await f.s.foundationWrite(async t=>{
  await t.put('meta',{id:'aiProductizationMigration',version:2,complete:false,pendingTopicIds:[topic.id],unresolvedTopics:1,at:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'});
  await t.delete('meta','aiPresentation:'+topic.id);
 });
 const marker=await migrateAIPresentations(f.s);
 assert.equal(marker.complete,true);assert.deepEqual(marker.pendingTopicIds,[]);
 assert.equal(await meta(f.s,'aiPresentation:'+topic.id),undefined);
});
