import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {hashText} from '../core/dedupe.js';
import {projectBackupEntity,validateBackupItem} from '../core/backup-format.js';
const op=()=>crypto.randomUUID();
async function setup(){
 const f=await completeFixture({texts:['CPV1 source statement, not a belief inferred by PAIA.']});
 const input=(await rows(f.s,'blocks'))[0].value,topic=await f.s.createTopic({name:'Optional Topic',operationId:op()});
 const target=await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[topic.id]});
 const entry=await f.s.entry(target.id);
 return {...f,input,topic,entry,relation:{id:entry.id,expectedRevision:entry.revision,expectedBodySha256:await hashText(entry.body)}};
}
test('VS-05 new Thought has real creation time, optional Topic/relation and one idempotent identity',async()=>{
 const f=await setup(),before=structuredClone(f.entry),start=Date.now();
 const request={operationId:op(),body:'Independent new expression',relation:f.relation};
 const created=await f.s.continueThinking(request),same=await f.s.continueThinking(request),row=await f.s.entry(created.id);
 assert.equal(created.id,same.id);assert.equal(row.body,request.body);assert.equal(row.provenanceType,'user_created');assert.equal(row.bodyBinding,'thought');assert.deepEqual(row.sourceRecordIds,[]);
 assert.ok(Date.parse(row.createdAt)>=start&&Date.parse(row.createdAt)<=Date.now());assert.deepEqual(await f.s.entryPaths(row.id),[]);
 const relations=await rows(f.s,'entryRelations');assert.equal(relations.length,1);assert.equal(relations[0].value.toEntryId,before.id);assert.equal(relations[0].value.toBodySha256,f.relation.expectedBodySha256);
 const compare=await f.s.compareThought(row.id);assert.equal(compare.relations[0].state,'current');assert.equal(compare.relations[0].body,before.body);
 assert.equal((await f.s.entry(before.id)).body,before.body);assert.equal((await f.s.entry(before.id)).revision,before.revision);
 const standalone=await f.s.continueThinking({operationId:op(),body:'No Topic and no relationship'});
 assert.deepEqual((await f.s.compareThought(standalone.id)).relations,[]);assert.deepEqual(await f.s.entryPaths(standalone.id),[]);
 const placed=await f.s.continueThinking({operationId:op(),body:'Optional existing Topic',topicId:f.topic.id});
 assert.equal((await f.s.entryPaths(placed.id))[0].topicId,f.topic.id);assert.deepEqual((await f.s.compareThought(placed.id)).relations,[]);
 const portable=projectBackupEntity('relations',relations[0].value);
 validateBackupItem({type:'item',section:'relations',value:portable});assert.equal(portable.toBodySha256,f.relation.expectedBodySha256);
 for(const defect of [{toRevision:-1},{toBodySha256:'invalid'},{actor:'ai'}])assert.throws(()=>validateBackupItem({type:'item',section:'relations',value:{...portable,...defect}}));
});
test('VS-05 changed live Input body refuses a stale response even before the invalidation worker drains',async()=>{
 const f=await setup(),response=await f.s.continueThinking({operationId:op(),body:'Independent response remains intact',relation:f.relation});
 const input=await f.s.input(f.input.id);
 await f.s.editDocument({operationId:op(),documentId:input.documentId,blocks:[{id:input.id,expectedRevision:input.revision,libraryText:'New current Input body not yet reviewed',note:input.note,excluded:false}]});
 const compare=await f.s.compareThought(response.id);assert.equal(compare.relations[0].state,'changed');assert.equal(compare.relations[0].body,undefined);assert.equal(compare.relations[0].id,undefined);
 const before=(await rows(f.s,'thoughts')).length;
 const refused=await f.s.continueThinking({operationId:op(),body:'Must remain an unsaved draft',relation:f.relation});
 assert.equal(refused.conflict,true);assert.equal(refused.relatedChanged,true);assert.equal((await rows(f.s,'thoughts')).length,before);assert.equal((await f.s.entry(response.id)).body,'Independent response remains intact');
});
test('VS-05 purge fences a response link before cleanup and never deletes its independently authored body',async()=>{
 const f=await setup(),response=await f.s.continueThinking({operationId:op(),body:'Independent response, no copied Source text',relation:f.relation});
 await f.s.permanentDelete(f.input.originalTextReference);
 const compare=await f.s.compareThought(response.id);
 assert.ok(compare.relations.length===0||compare.relations.every(r=>r.state==='unavailable'&&r.id===undefined&&r.body===undefined));
 assert.equal((await f.s.entry(response.id)).body,'Independent response, no copied Source text');
 const refused=await f.s.continueThinking({operationId:op(),body:'No relation to unavailable content',relation:f.relation});assert.equal(refused.conflict,true);
 await f.s.drainPurgeCleanup();await f.s.drainInvalidations();
 assert.equal((await f.s.entry(response.id)).body,'Independent response, no copied Source text');assert.deepEqual((await f.s.compareThought(response.id)).relations,[]);assert.equal((await rows(f.s,'entryRelations')).length,0);
});
test('VS-05 relation cannot omit or coerce revision/content guards or create a dangling target',async()=>{
 const f=await setup();
 for(const relation of [{id:f.entry.id,expectedRevision:'0',expectedBodySha256:f.relation.expectedBodySha256},{id:f.entry.id,expectedRevision:0},{...f.relation,extra:true},{...f.relation,id:'missing-thought'}]){
  const before=(await rows(f.s,'thoughts')).length;await assert.rejects(()=>f.s.continueThinking({operationId:op(),body:'Uncommitted',relation}));assert.equal((await rows(f.s,'thoughts')).length,before);
 }
});
