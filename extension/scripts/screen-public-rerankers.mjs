// One finite source-only read after failed pure-cosine calibration.
// No weights/tokenizer/dependencies/inference, no private data or model selection.
import {RERANKER_SOURCES,inspectPublicRerankerSource}
  from '../experiments/public-reranker-provenance.mjs';
process.env.HF_TOKEN='';process.env.HF_ACCESS_TOKEN='';
const observations=[];
for(const id of RERANKER_SOURCES)observations.push(await inspectPublicRerankerSource(id));
console.log(JSON.stringify({schemaVersion:1,status:'PUBLIC_RERANKER_SOURCE_SCREENING_ONLY',
  scope:'fixed_public_source_only',productionClaim:false,modelAdmission:'NOT_AUTHORIZED',
  weightsDownloaded:false,inferenceExecuted:false,privateCorpusUsed:false,
  qualityGate:'NOT_EVALUATED',providerApiCalls:0,observations}));
// Completion of observations is not source/model/quality admission.
