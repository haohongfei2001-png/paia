// Fixed finite source screening after the converted E5 license refusal.
// No dependency install, model download/inference or arbitrary repository input.
import {SCREENING_MODELS,inspectBoundedPublicModel}
  from '../experiments/public-model-provenance.mjs';
process.env.HF_TOKEN='';process.env.HF_ACCESS_TOKEN='';
const observations=[];
for(const id of SCREENING_MODELS)observations.push(await inspectBoundedPublicModel(id));
console.log(JSON.stringify({schemaVersion:1,status:'PUBLIC_CANDIDATE_SOURCE_SCREENING_ONLY',
  scope:'fixed_public_model_sources',modelAdmission:'NOT_AUTHORIZED',
  qualityGate:'NOT_EVALUATED',productionClaim:false,privateCorpusUsed:false,
  weightsDownloaded:false,providerApiCalls:0,observations}));
process.exitCode=1; // A source read never satisfies the owning semantic gate.
