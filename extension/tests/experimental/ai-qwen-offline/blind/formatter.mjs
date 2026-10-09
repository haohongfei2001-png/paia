import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {digest} from '../artifacts.mjs';
import {trustedData,verifyReadbacks,exact} from './readback.mjs';
const FORMAT='CALIBRATION_BLIND_FIXTURE_v1';
const warning='Labels are hidden; semantic wording can still reveal style. This fixture set provides no human review or model quality evidence.';
const sign=(seed,value)=>createHmac('sha256',Buffer.from(seed,'hex')).update(JSON.stringify([FORMAT,value])).digest('hex');
const seedCheck=seed=>assert.match(seed,/^[a-f0-9]{64}$/,'private256-bit seed');
const commitment=(seed,b)=>digest([FORMAT,seed,b.corpusDigest,b.contractDigest]);
const reviewStatus='NOT_COLLECTED';
export async function formatBlind(bundle,seed){
 seedCheck(seed);verifyReadbacks(bundle,await trustedData());const seedCommitment=commitment(seed,bundle),packets=[],assignments=[];
 for(const r of bundle.records){const key=[r.topicId,r.phaseId,r.style],packetId='P-'+sign(seed,['packet',key]),groupId='G-'+sign(seed,['group',r.topicId,r.phaseId]);
  const evidence=r.evidence.map(e=>({sourceId:e.sourceId,sourceRevision:e.ownerRevision,body:e.body,sectionId:e.sectionId,lifecycle:e.lifecycle,corpusReferenceTime:e.referenceTime}));
  const output=r.output?{blockSummary:r.output.blockSummary,currentView:r.output.currentView,keyInformation:r.output.keyInformation,preferences:r.output.preferences,decisions:r.output.decisions,judgments:r.output.judgments,openQuestions:r.output.openQuestions,possibleEvolution:r.output.possibleEvolution}:null;
  // No style/model/provider/job/route/price or seed enters the public packet.
  const content={packetId,groupId,status:r.state,reviewStatus,evidence,output,sourceTimeQualification:'CORPUS_REFERENCE_ONLY',coverage:r.evidence.map(e=>({sourceId:e.sourceId,state:e.lifecycle==='removed'?'REMOVED_UNAVAILABLE':'ELIGIBLE'}))};const packet={...content,packetDigest:digest(content)};packets.push(packet);
  assignments.push({packetId,groupId,topicId:r.topicId,phaseId:r.phaseId,style:r.style,packetDigest:packet.packetDigest,readbackDigest:r.readbackDigest,receiptDigest:r.receiptDigest,projectionDigest:r.projectionDigest,manifestDigest:r.manifestDigest,executionStatus:r.output?'FIXTURE_EXECUTED':'NO_EXECUTION_REFUSED',provider:r.output?'frozen-literal-offline-fixture':null,model:r.output?'offline-literal-fixture-not-qwen':null,route:r.output?'offline-literal-fixture-v1':null,price:null,financialQualification:'NOT_RUN'});
 }
 packets.sort((a,b)=>sign(seed,['order',a.packetId]).localeCompare(sign(seed,['order',b.packetId])));assignments.sort((a,b)=>a.packetId.localeCompare(b.packetId));
 const refused=packets.filter(p=>p.status==='REFUSED_NO_OUTPUT').length;
 const publicBundle={version:1,kind:FORMAT,corpusDigest:bundle.corpusDigest,contractDigest:bundle.contractDigest,seedCommitment,blindness:warning,qualification:'NOT_RUN',counts:{topics:bundle.selectedTopicIds.length,variantsPerTopic:3,scheduledPhases:bundle.records.length,packets:packets.length,availableFixtureOutputs:packets.length-refused,refusedNoOutput:refused,humanJudgments:0,missingReviews:packets.length,missingReviewsForAvailable:packets.length-refused,missingReviewsForRefused:refused},packets};
 const publicDigest=digest(publicBundle),privateAssignments={version:1,kind:'PRIVATE_BLIND_ASSIGNMENTS',publicDigest,seedCommitment,recordsDigest:bundle.recordsDigest,assignments},privateSeed={version:1,kind:'PRIVATE_BLIND_SEED',seed,seedCommitment,publicDigest,corpusDigest:bundle.corpusDigest,contractDigest:bundle.contractDigest};
 return {publicBundle,privateAssignments,privateSeed};
}
export async function verifyFormatted({publicBundle,privateAssignments,privateSeed},bundle){
 exact(privateSeed,['version','kind','seed','seedCommitment','publicDigest','corpusDigest','contractDigest']);assert.equal(privateSeed.version,1);assert.equal(privateSeed.kind,'PRIVATE_BLIND_SEED');seedCheck(privateSeed.seed);
 const expected=await formatBlind(bundle,privateSeed.seed);assert.deepEqual(publicBundle,expected.publicBundle,'exact public packet identity/digest/refusal/denominator');assert.deepEqual(privateAssignments,expected.privateAssignments,'exact private assignment identity/digest');assert.deepEqual(privateSeed,expected.privateSeed,'exact private seed commitment/version');return true;
}
