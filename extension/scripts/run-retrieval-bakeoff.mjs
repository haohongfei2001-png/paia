// Cloud synthetic bake-off only; no archive/network/model download or installation.
import {retrievalCorpus} from '../tests/fixtures/cpv1-07-retrieval-corpus.mjs';
import {validateRetrievalCorpus,productionLexicalCandidate,buildCharacterIndex,evaluateRetrieval}
  from '../experiments/retrieval-evaluation.mjs';

validateRetrievalCorpus(retrievalCorpus);
const started=performance.now();
const index=buildCharacterIndex(retrievalCorpus.records.filter(record=>!record.excluded));
const indexBuildMs=performance.now()-started;
const reports=[
  await evaluateRetrieval(retrievalCorpus,productionLexicalCandidate,{method:'lexical-production-v1'}),
  await evaluateRetrieval(retrievalCorpus,(records,query)=>index.retrieve(records,query),
    {method:'character-tfidf-lab-v1'})
];
console.log(JSON.stringify({schemaVersion:1,scope:'synthetic_only',
  qualityGate:'NOT_EVALUATED_FOR_PRODUCTION',productionIndexEnabled:false,
  semanticCandidateSelected:false,networkRequests:0,modelDownloads:0,providerCost:0,
  characterProjection:{projectedRecords:index.projectedRecords,
    serializedProjectionBytes:index.serializedProjectionBytes,indexBuildMs,
    modelWeightsBytes:0,scope:'statistical_lexical_lab_projection'},
  reports}));
