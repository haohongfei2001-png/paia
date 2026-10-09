import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseStrict,readFrozenBytes,readArtifacts,validateArtifacts,ARTIFACT_SHA,digest} from './artifacts.mjs';
import {runTopic,protectedRefusal,loadTopic,addPhase,unknownAttemptNoReplay} from './replay.mjs';
test('strict offline reader rejects duplicate JSON, byte mutation, crossed corpus/style/phase and extra fields before execution',async()=>{
 const data=await readArtifacts(),bytes=await readFile(new URL('literal-outputs.json',import.meta.url));assert.equal(readFrozenBytes(bytes,ARTIFACT_SHA).cases.length,102);
 assert.throws(()=>parseStrict(new TextEncoder().encode('{"version":1,"version":2}')),{code:'JSON_DUPLICATE_KEY'});
 assert.throws(()=>parseStrict(new Uint8Array([255])));assert.throws(()=>readFrozenBytes(new TextEncoder().encode('{}'),ARTIFACT_SHA));
 for(const mutate of [x=>x.corpusDigest='0'.repeat(64),x=>x.contractDigest='0'.repeat(64),x=>x.cases[0].style='pro',x=>x.cases[0].phaseId='other',x=>x.extra=true,x=>x.cases[0].blocks[0].sourceRef.corpusRevision++,x=>x.cases[0].blocks[0].text+='虚构结论']){const changed=structuredClone(data.artifact);mutate(changed);assert.throws(()=>validateArtifacts(changed,data.corpus,data.freeze));}
});
test('three short Topics use actual typed creation/style/session/candidate/adoption owners across all styles with identical evidence; no models or scores',async()=>{
 const data=await readArtifacts();for(const topicId of ['SYN-T01','SYN-T02','SYN-T03']){const evidence=[];for(const style of data.corpus.modes){const {f,results}=await runTopic(topicId,style,data);assert.equal(results.length,1);assert.equal(f.calls,1);assert.equal(results[0].children.length,1);assert.equal(results[0].sourceRecords,0);assert.equal(results[0].workingBlocks,0);assert.equal(results[0].quality,'NOT_RUN');assert.match(results[0].candidateKeyDigest,/^[a-f0-9]{64}$/);assert.equal(results[0].acknowledged,f.definition.entries.filter(e=>e.lifecycle==='active').length);assert.match(results[0].manifestDigest,/^[a-f0-9]{64}$/);evidence.push(f.receipts[0].evidenceDigest);}assert.equal(new Set(evidence).size,1,'same evidence for three style variants');}
});
test('actual adopted projection then human edit blocks private refresh, retains exact bytes, and creates no new attempt',async()=>{const {f}=await runTopic('SYN-T02','original');const result=await protectedRefusal(f);assert.equal(result.newAttempts,0);assert.equal(result.newProviderCalls,0);assert.equal(result.state,'STALE_BASE');assert.equal(result.quality,'NOT_RUN');});
test('actual lost fixture output then fresh session retains one unknown job/attempt and cannot redispatch or publish',async()=>{const f=await loadTopic(await readArtifacts(),'SYN-T01','original'),phase=f.definition.phases[0];await addPhase(f,phase);const result=await unknownAttemptNoReplay(f,phase);assert.equal(result.attemptCount,1);assert.equal(result.providerCalls,1);assert.equal(result.acknowledged,0);assert.equal(result.candidate,false);});
test('complete24 Topic three-style schedule records99 committed closures plus3 actual removed-scope refusals and105 physical fixtures, including200+5 and60-entry closure',async()=>{
 const data=await readArtifacts();let jobs=0,calls=0,refused=0,scheduled=0;
 for(const topic of data.corpus.topics){const evidence=[];
  for(const style of data.corpus.modes){const {f,results}=await runTopic(topic.id,style,data);scheduled+=results.length;jobs+=results.filter(r=>r.state==='COMMITTED').length;refused+=results.filter(r=>r.state==='STALE_REFUSED').length;calls+=f.calls;evidence.push(f.receipts.map(r=>({phase:r.phase,evidenceDigest:r.evidenceDigest})).sort((a,b)=>a.phase.localeCompare(b.phase)||a.evidenceDigest.localeCompare(b.evidenceDigest))); assert.ok(results.every(r=>r.quality==='NOT_RUN'&&r.sourceRecords===0&&r.workingBlocks===0));
   if(topic.id==='SYN-T12'){assert.equal(results[0].state,'STALE_REFUSED');assert.equal(results[0].ownerCode,'STALE_BASE');assert.equal(results[0].newAttempts,0);assert.equal(results[0].newProviderCalls,0);assert.equal(f.calls,0);}else assert.ok(results.every(r=>r.state==='COMMITTED'));
   if(topic.id==='SYN-T14'){assert.equal(results.length,11);assert.equal(f.calls,11);assert.deepEqual(f.receipts.map(r=>r.requestedRefs.length),[20,20,20,20,20,20,20,20,20,20,5]);assert.equal(f.entries.size,205);}
   if(topic.id==='SYN-T15'){assert.equal(results.length,1);assert.equal(results[0].children.length,3);assert.equal(results[0].acknowledged,60);assert.deepEqual(f.receipts.map(r=>r.requestedRefs.length),[20,20,20]);}
  }
  assert.deepEqual(evidence[0],evidence[1]);assert.deepEqual(evidence[0],evidence[2]);
 }
 assert.equal(scheduled,102);assert.equal(jobs,99);assert.equal(refused,3);assert.equal(calls,105);
});
