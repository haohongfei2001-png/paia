import assert from 'node:assert/strict';
import {aiPresentationStatus,editAIPresentation} from '../../core/organizer/ai-presentation.js';
import {aiCandidateKey} from '../../core/organizer/ai-candidate.js';

// Existing regression setup performs the product's explicit two boundaries.
// No runtime runner is patched, no response/receipt is fabricated.
export async function reviewAI(runner,options={}){
 const topics=(await aiPresentationStatus(runner.s)).topics,topicId=options.topicId||topics.find(row=>row.pending)?.topicId||topics[0]?.topicId;
 if(!topicId)throw Error('Synthetic fixture has no Topic to review');
 const scope=await runner.scope({topicId});return runner.wake({...options,topicId,scopeBinding:scope.scopeBinding});
}
export async function adoptFirstAI(store,topicId){
 const row=(await aiPresentationStatus(store,{topicId})).topics[0];
 if(!row?.candidate||row.candidate.baseKind!=='none')return;
 assert.equal(row.presentation,null,'first generation must have no Current before the explicit test adoption');
 return editAIPresentation(store,{topicId,expectedRevision:0,expectedCandidateKey:aiCandidateKey(row.candidate),candidateDecisions:Object.fromEntries(row.candidate.changedFields.map(field=>[field,'adopt'])),operationId:crypto.randomUUID()});
}
export async function reviewAndAdoptFirstAI(runner,options={}){
 const result=await reviewAI(runner,options);if(result.completed&&result.candidateCreated)await adoptFirstAI(runner.s,result.topicId);return result;
}
