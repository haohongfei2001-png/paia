import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readArtifacts,digest,ARTIFACT_SHA,OWNER_SHA} from '../artifacts.mjs';
import {loadTopic,addPhase,replayPhase,saved} from '../replay.mjs';
const PARENT={
 'artifacts.mjs':'b4fda491807433ddf351b2873ac3cd2c065a0e72030678f583436eb1f3ba4f1e',
 'replay.mjs':'1061efddc89a96e97257e73ae07a7243e6baaf70483706d2cec38c6d46e9e1cc'
};
export const exact=(value,fields)=>assert.deepEqual(Object.keys(value).sort(),[...fields].sort(),'exact blind experiment schema');
export async function trustedData(){for(const [file,hash]of Object.entries(PARENT))assert.equal(createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex'),hash,'frozen parent '+file);return readArtifacts();}
export function selectedTopics(data,ids){assert.ok(Array.isArray(ids)&&ids.length>0&&ids.length<=24&&new Set(ids).size===ids.length);for(const id of ids)assert.ok(data.corpus.topics.some(t=>t.id===id));return data.corpus.topics.filter(t=>ids.includes(t.id));}
const caseKey=r=>JSON.stringify([r.topicId,r.phaseId,r.style]);
const evidenceFields=['sourceId','corpusRevision','ownerRevision','body','sectionId','lifecycle','referenceTime'];
export function verifyReadbacks(bundle,data){
 exact(bundle,['version','kind','sourceBase','parentCode','corpusDigest','contractDigest','artifactDigest','ownerManifestDigest','selectedTopicIds','records','recordsDigest']);
 assert.equal(bundle.version,1);assert.equal(bundle.kind,'ACTUAL_CALIBRATION_ADOPTED_READBACK');assert.equal(bundle.sourceBase,data.freeze.sourceBase);assert.equal(bundle.parentCode,'fc7ee6cb4097156d693ad54da08c0de1e305e20b');assert.equal(bundle.corpusDigest,data.freeze.files['calibration.json'].sha256);assert.equal(bundle.contractDigest,data.freeze.files['review-contract.json'].sha256);assert.equal(bundle.artifactDigest,ARTIFACT_SHA);assert.equal(bundle.ownerManifestDigest,OWNER_SHA);assert.equal(bundle.recordsDigest,digest(bundle.records));
 const expected=new Map();for(const topic of selectedTopics(data,bundle.selectedTopicIds)){const visible=new Set();for(const phase of topic.phases){for(const id of phase.addEntryIds??phase.visibleEntryIds)visible.add(id);const scope=phase.addEntryIds?[...visible]:topic.entries.map(e=>e.id);for(const style of data.corpus.modes)expected.set(JSON.stringify([topic.id,phase.id,style]),{topic,phase,scope:[...scope]});}}
 assert.ok(Array.isArray(bundle.records));assert.equal(bundle.records.length,expected.size);const seen=new Set();
 for(const r of bundle.records){
  exact(r,['topicId','phaseId','style','state','evidence','output','receipt','receiptDigest','projectionDigest','manifestDigest','readbackDigest']);const key=caseKey(r),spec=expected.get(key);assert.ok(spec&&!seen.has(key),'known unique complete case');seen.add(key);
  const {readbackDigest,...rest}=r;assert.equal(readbackDigest,digest(rest));assert.equal(r.receiptDigest,digest(r.receipt));assert.equal(r.receipt.topicId,r.topicId);assert.equal(r.receipt.phaseId,r.phaseId);assert.equal(r.receipt.style,r.style);assert.equal(r.receipt.fixtureOnly,true);assert.equal(r.receipt.quality,'NOT_RUN');assert.equal(r.receipt.sourceRecords,0);assert.equal(r.receipt.workingBlocks,0);
  const entries=spec.topic.entries.filter(e=>spec.scope.includes(e.id));assert.equal(r.evidence.length,entries.length);
  for(let n=0;n<entries.length;n++){const source=r.evidence[n],e=entries[n];exact(source,evidenceFields);assert.equal(source.sourceId,e.id);assert.equal(source.corpusRevision,e.revision);assert.equal(source.ownerRevision,e.revision+(e.lifecycle==='removed'?1:0),'exact existing fixture typed revision schedule');assert.equal(source.sectionId,e.sectionId);assert.equal(source.lifecycle,e.lifecycle);assert.deepEqual(source.referenceTime,e.time);assert.equal(source.body,e.lifecycle==='active'?e.body:null);}
  if(r.topicId==='SYN-T12'){exact(r.receipt,['fixtureOnly','quality','topicId','phaseId','style','state','ownerCode','reason','jobId','children','newProviderCalls','newAttempts','sourceRecords','workingBlocks','canonicalEntryDigest','timeMetadata']);assert.equal(r.state,'REFUSED_NO_OUTPUT');assert.equal(r.output,null);assert.equal(r.projectionDigest,null);assert.equal(r.manifestDigest,null);assert.equal(r.receipt.state,'STALE_REFUSED');assert.equal(r.receipt.ownerCode,'STALE_BASE');assert.equal(r.receipt.jobId,null);assert.deepEqual(r.receipt.children,[]);assert.equal(r.receipt.newAttempts,0);assert.equal(r.receipt.newProviderCalls,0);}
  else{
   exact(r.receipt,['fixtureOnly','quality','topicId','phaseId','style','ownerTopicId','jobId','state','children','candidateKeyDigest','proposalDigest','decisionsDigest','presentationDigest','manifestDigest','acknowledged','canonicalEntryDigest','sourceRecords','workingBlocks','timeMetadata']);
   exact(r.output,['topicId','blockSummary','currentView','keyInformation','preferences','decisions','judgments','openQuestions','possibleEvolution','evidenceEntryIds']);assert.equal(r.output.topicId,r.receipt.ownerTopicId);assert.equal(r.output.blockSummary,'');for(const field of ['keyInformation','preferences','decisions','judgments','openQuestions','possibleEvolution'])assert.deepEqual(r.output[field],[]);
   assert.equal(r.state,'AVAILABLE_FIXTURE_OUTPUT');assert.equal(r.receipt.state,'COMMITTED');assert.equal(r.projectionDigest,digest(r.output));assert.equal(r.projectionDigest,r.receipt.presentationDigest);assert.equal(r.manifestDigest,r.receipt.manifestDigest);assert.ok(r.receipt.children.length>0&&r.receipt.children.length<=4);for(const c of r.receipt.children){exact(c,['id','state','attemptCount','operationReceiptId','payloadDigest','validatedOutputDigest']);assert.equal(c.state,'COMMITTED');assert.equal(c.attemptCount,1);assert.equal(c.operationReceiptId,c.id);assert.match(c.payloadDigest,/^[a-f0-9]{64}$/);assert.match(c.validatedOutputDigest,/^[a-f0-9]{64}$/);}assert.equal(r.output.currentView,r.evidence.filter(e=>e.lifecycle==='active').map(e=>e.body).join('\n'));
  }
 }
 return bundle;
}
export async function collectReadbacks(topicIds=null){
 const data=await trustedData(),topics=selectedTopics(data,topicIds??data.corpus.topics.map(t=>t.id)),records=[];
 for(const topic of topics)for(const style of data.corpus.modes){const f=await loadTopic(data,topic.id,style);
  for(const phase of topic.phases){await addPhase(f,phase);const receipt=await replayPhase(f,phase),row=await saved(f),evidence=[];
   for(const e of topic.entries){const mapping=f.entries.get(e.id);if(!mapping)continue;let body=null,ownerRevision;
    if(e.lifecycle==='active'){const actual=await f.store.entry(mapping.id);assert.equal(actual.body,e.body);body=actual.body;ownerRevision=actual.revision;}
    else{const actual=await f.store.run(()=>f.store.repository.transaction(false,t=>t.get('thoughts',mapping.id)));assert.equal(actual.lifecycle,'removed');ownerRevision=actual.revision;}
    evidence.push({sourceId:e.id,corpusRevision:e.revision,ownerRevision,body,sectionId:e.sectionId,lifecycle:e.lifecycle,referenceTime:structuredClone(e.time)});
   }
   const record={topicId:topic.id,phaseId:phase.id,style,state:row?'AVAILABLE_FIXTURE_OUTPUT':'REFUSED_NO_OUTPUT',evidence,output:row?structuredClone(row.projection):null,receipt,receiptDigest:digest(receipt),projectionDigest:row?digest(row.projection):null,manifestDigest:row?digest(row.manifest):null};records.push({...record,readbackDigest:digest(record)});
  }
 }
 const bundle={version:1,kind:'ACTUAL_CALIBRATION_ADOPTED_READBACK',sourceBase:data.freeze.sourceBase,parentCode:'fc7ee6cb4097156d693ad54da08c0de1e305e20b',corpusDigest:data.freeze.files['calibration.json'].sha256,contractDigest:data.freeze.files['review-contract.json'].sha256,artifactDigest:ARTIFACT_SHA,ownerManifestDigest:OWNER_SHA,selectedTopicIds:topics.map(t=>t.id),records,recordsDigest:digest(records)};
 verifyReadbacks(bundle,data);return bundle;
}
