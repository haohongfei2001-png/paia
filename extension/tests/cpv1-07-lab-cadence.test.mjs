import test from 'node:test';
import assert from 'node:assert/strict';
import {semanticProbeRequired} from '../scripts/semantic-lab-change.mjs';
const valid={action:'synchronize',before:'a'.repeat(40),head:'b'.repeat(40),ancestor:true,paths:[]};
test('CPV1-07 unchanged model/evaluator/fixture inputs do not re-download weights for independent history work',()=>{
 assert.equal(semanticProbeRequired({...valid,paths:['extension/core/historical-time.js',
  'extension/core/search-material-page.js','extension/core/revisit.js',
  'extension/core/universal-search.js','extension/tests/cpv1-07-history-time.test.mjs',
  'extension/docs/consumer-product-v1/STATUS.md']}),false);
});
test('CPV1-07 any inference, provenance, corpus, lexical baseline or workflow change runs the original model gate',()=>{
 for(const path of ['extension/experiments/official-minilm-pooling.mjs',
  'extension/experiments/retrieval-evaluation.mjs','extension/experiments/semantic-lab-index.mjs',
  'extension/experiments/semantic-lab/package.json','extension/experiments/public-model-provenance.mjs',
  'extension/scripts/run-official-semantic-retrieval-lab.mjs',
  'extension/scripts/run-semantic-retrieval-lab.mjs',
  'extension/scripts/inspect-public-model-provenance.mjs',
  'extension/scripts/screen-public-semantic-candidates.mjs',
  'extension/scripts/run-retrieval-bakeoff.mjs','extension/core/search-service.js',
  'extension/core/search-ranking.js','extension/tests/fixtures/cpv1-07-retrieval-corpus.mjs',
  '.github/workflows/paia-vs07-semantic-lab.yml','extension/scripts/semantic-lab-change.mjs'])
  assert.equal(semanticProbeRequired({...valid,paths:['extension/docs/unrelated.md',path]}),true,path);
});
test('CPV1-07 unknown, malformed or rewritten event/history evidence never skips a model gate',()=>{
 for(const fault of [{action:'opened'},{action:'reopened'},{action:null},{before:''},
  {head:'PRIVATE_HEAD_CANARY'},{head:valid.before},{ancestor:false},{ancestor:1},
  {paths:null},{paths:['']},{paths:[true]},{paths:['x'.repeat(501)]}]){
  assert.equal(semanticProbeRequired({...valid,...fault}),true);
 }
 assert.equal(semanticProbeRequired(),true);
});
