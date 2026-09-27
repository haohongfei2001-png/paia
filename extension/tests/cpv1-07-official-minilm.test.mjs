import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {meanPoolOfficialDense,officialProjectionObservation} from '../experiments/official-minilm-pooling.mjs';
const output=()=>({type:'float32',data:new Float32Array([3,0,0,4,500,500]),dims:[1,3,2]});
const mask=()=>({type:'int64',data:new BigInt64Array([1n,1n,0n]),dims:[1,3]});
test('CPV1-07 official dense pooling follows independent mean and normalization oracle without padded contamination',()=>{
  const o=output(),m=mask(),before=[...o.data];
  const vector=meanPoolOfficialDense(o,m,2);
  assert.deepEqual(vector,[.6,.8]);
  assert.equal(Object.isFrozen(vector),true);
  assert.deepEqual([...o.data],before);
  assert.deepEqual([...m.data],[1n,1n,0n]);
});
for(const [name,change] of [
  ['wrong batch',o=>{o.dims=[2,3,2];}],
  ['wrong dimension',o=>{o.dims=[1,3,3];}],
  ['unbounded sequence',o=>{o.dims=[1,513,2];}],
  ['nonfinite padded data',o=>{o.data[5]=NaN;}],
  ['wrong precision',o=>{o.data=new Float64Array(o.data);}],
])test('CPV1-07 official dense pooling rejects '+name,()=>{
  const o=output();change(o);
  assert.throws(()=>meanPoolOfficialDense(o,mask(),2),/invalid official dense projection/);
});
test('CPV1-07 official dense pooling rejects mask/zero norm uncertainty instead of manufacturing a vector',()=>{
  for(const m of [{...mask(),data:new BigInt64Array([1n,2n,0n])},
    {...mask(),dims:[1,2]},{...mask(),data:new BigInt64Array([0n,0n,0n])}])
    assert.throws(()=>meanPoolOfficialDense(output(),m,2),/invalid official dense projection/);
  const o=output();o.data.fill(0);
  assert.throws(()=>meanPoolOfficialDense(o,mask(),2),/invalid official dense projection/);
});

test('CPV1-07 actual official probe refuses invalid environment before source/model I/O and never echoes private canaries',()=>{
  const path=fileURLToPath(new URL('../scripts/run-official-semantic-retrieval-lab.mjs',import.meta.url));
  const result=spawnSync(process.execPath,[path],{encoding:'utf8',timeout:10000,
    env:{...process.env,PAIA_SEMANTIC_LAB_ROOT:'PRIVATE_OFFICIAL_LAB_CANARY',
      PAIA_PUBLIC_MODEL_CACHE:'PRIVATE_OFFICIAL_CACHE_CANARY',HF_TOKEN:'PRIVATE_OFFICIAL_TOKEN_CANARY'}});
  assert.equal(result.status,1);assert.equal(result.stderr,'');
  const report=JSON.parse(result.stdout);
  assert.equal(report.status,'UNAVAILABLE');assert.equal(report.stage,'lab_environment');
  assert.equal(report.reason,'invalid_lab_environment');
  assert.equal(report.qualityGate,'NOT_EVALUATED');assert.equal(report.productionClaim,false);
  assert.deepEqual(report.publicObservations,[]);
  assert.equal(result.stdout.includes('PRIVATE'),false);
});


test('CPV1-07 projection diagnostics distinguish a required missing segment tensor without fabricating IDs',()=>{
  const tokens={input_ids:mask(),attention_mask:mask()};
  const o=officialProjectionObservation(['input_ids','attention_mask','token_type_ids'],tokens);
  assert.equal(o.knownUniqueGraphInputs,true);
  assert.equal(o.graphRequiresTokenTypeIds,true);assert.equal(o.tokenTypeIdsPresent,false);
  assert.equal(o.inputIdsInt64Shape,true);assert.equal(o.attentionMaskBinary,true);
  assert.equal(o.inputMaskLengthsMatch,true);assert.equal(Object.isFrozen(o),true);
  assert.equal(tokens.token_type_ids,undefined);
});
test('CPV1-07 projection diagnostics serialize only fixed boolean observations under private canary inputs',()=>{
  const o=officialProjectionObservation(['PRIVATE_GRAPH_NAME'],
    {input_ids:{type:'PRIVATE_TYPE',dims:['PRIVATE_SHAPE'],data:['PRIVATE_BODY']},
      PRIVATE_FIELD:'PRIVATE_QUERY'},
    {type:'PRIVATE_OUTPUT',dims:['PRIVATE_DIMS'],data:['PRIVATE_VECTOR']});
  assert.equal(o.knownUniqueGraphInputs,false);assert.equal(o.inputIdsInt64Shape,false);
  assert.equal(o.denseFloat32Shape,false);
  assert.ok(Object.values(o).every(value=>typeof value==='boolean'));
  assert.equal(JSON.stringify(o).includes('PRIVATE'),false);
});
test('CPV1-07 projection diagnostics distinguish malformed masks and dense precision/finite data',()=>{
  const tokens={input_ids:mask(),attention_mask:{...mask(),data:new BigInt64Array([1n,2n,0n])}};
  const dense={type:'float32',dims:[1,3,384],data:new Float32Array(3*384)};
  dense.data[12]=NaN;
  const o=officialProjectionObservation(['input_ids','attention_mask'],tokens,dense);
  assert.equal(o.attentionMaskInt64Shape,true);assert.equal(o.attentionMaskBinary,false);
  assert.equal(o.denseFloat32Shape,true);assert.equal(o.denseFinite,false);
  assert.equal(officialProjectionObservation(['input_ids','attention_mask'],tokens,
    {...dense,data:new Float64Array(3*384)}).denseFloat32Shape,false);
});
