// Root-cause evidence only after two failed provenance gates. No ML rerun.
import {PUBLIC_MODELS,inspectPublicModel} from '../experiments/public-model-provenance.mjs';
process.env.HF_TOKEN='';process.env.HF_ACCESS_TOKEN='';
const observations=[];
for(const id of PUBLIC_MODELS)observations.push(await inspectPublicModel(id));
console.log(JSON.stringify({schemaVersion:1,status:'SOURCE_DIAGNOSIS_ONLY',
  scope:'fixed_public_model_sources',modelAdmission:'NOT_AUTHORIZED',
  qualityGate:'NOT_EVALUATED',productionClaim:false,privateCorpusUsed:false,
  weightsDownloaded:false,providerApiCalls:0,observations}));
// Preserve the owning semantic gate. A successful diagnostic read is not
// a passed model/license/conversion/quality or Chrome certification.
process.exitCode=1;
