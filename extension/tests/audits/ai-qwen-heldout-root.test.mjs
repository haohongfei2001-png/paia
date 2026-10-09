import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir=new URL('../fixtures/ai-qwen-offline-v1/',import.meta.url);
const bytes=await readFile(new URL('held-out-root-v1.json',dir));
const corpus=JSON.parse(bytes),freeze=JSON.parse(await readFile(new URL('held-out-root-freeze.json',dir)));
const calibration=JSON.parse(await readFile(new URL('freeze.json',dir)));
test('separate frozen held-out has exact bytes, 12 synthetic Topics and36 current entries; no model or human ratings',()=>{
 assert.equal(bytes.length,freeze.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),freeze.sha256);
 assert.equal(freeze.calibrationDigest,calibration.files['calibration.json'].sha256);assert.equal(freeze.reviewContractDigest,calibration.files['review-contract.json'].sha256);
 assert.equal(corpus.topics.length,12);assert.equal(corpus.modelRunStatus,'NOT_RUN');assert.equal(corpus.humanAuthorReviewStatus,'NOT_RUN');
 const ids=new Set();let entries=0;
 for(const topic of corpus.topics){
  assert.equal(topic.partition,'held-out');assert.equal(topic.authorRatings,null);assert.equal(topic.semanticReferenceStatus,'NOT_RUN');assert.ok(!ids.has(topic.id));ids.add(topic.id);
  const sections=new Set(topic.sections.map(s=>s.id)),ownIds=new Set();
  for(const entry of topic.entries){
   entries++;assert.ok(!ids.has(entry.id));ids.add(entry.id);ownIds.add(entry.id);assert.equal(entry.revision,0);assert.equal(entry.lifecycle,'active');assert.equal(entry.human,true);assert.ok(sections.has(entry.sectionId));
   const bounds=new Set([0,entry.body.length,...[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(entry.body)].map(g=>g.index)]);
   assert.equal(entry.obligation.start,0);assert.equal(entry.obligation.end,entry.body.length);assert.equal(entry.obligation.adjudication,'NOT_RUN');
   for(const a of entry.annotations){assert.ok(bounds.has(a.start)&&bounds.has(a.end));assert.equal(entry.body.slice(a.start,a.end),a.literal);}
   if(entry.time.kind==='unknown')assert.equal(entry.time.iso,null);else{assert.equal(entry.time.kind,'known');assert.ok(Number.isFinite(Date.parse(entry.time.iso)));}
  }
  for(const phase of topic.phases)for(const id of phase.visibleEntryIds)assert.ok(ownIds.has(id));
 }
 assert.equal(entries,36);assert.equal(freeze.qualityQualification,'NOT_RUN');assert.equal(freeze.semanticReference,'NOT_RUN');
});
