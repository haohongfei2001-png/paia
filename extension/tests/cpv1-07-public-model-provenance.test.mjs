import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_MODELS,observeLicense,observeReadmeLicense,inspectPublicModel}
  from '../experiments/public-model-provenance.mjs';
const id=PUBLIC_MODELS[0],revision='1'.repeat(40);
const base={id,sha:revision,private:false,gated:false,
  cardData:{license:'mit'},siblings:[{rfilename:'README.md'},{rfilename:'LICENSE'},
    {rfilename:'onnx/model_quantized.onnx'}]};
const response=(body,status=200)=>({status,text:async()=>body});
function fixture(current=base,pinned=base,readme='---\nlicense: mit\n---\n'){
  const calls=[];
  const fetcher=async(url,options)=>{
    calls.push(url);
    assert.equal(options.redirect,'manual');
    assert.equal(Object.hasOwn(options.headers,'Authorization'),false);
    assert.equal(url.includes('onnx'),false,'no weights request');
    if(url==='https://huggingface.co/api/models/'+id)return response(JSON.stringify(current));
    if(url==='https://huggingface.co/api/models/'+id+'/revision/'+revision)
      return response(JSON.stringify(pinned));
    if(url==='https://huggingface.co/'+id+'/raw/'+revision+'/README.md')return response(readme);
    if(url==='https://huggingface.co/'+id+'/raw/'+revision+'/LICENSE')
      return response('MIT License\nPUBLIC_LICENSE_BODY_CANARY');
    assert.fail('unexpected source request');
  };
  return {fetcher,calls};
}
test('CPV1-07 source diagnosis requires pinned matching identity and remains non-admission',async()=>{
  const f=fixture();const report=await inspectPublicModel(id,f);
  assert.equal(report.diagnosis,'CONSISTENT_LITERAL_DECLARATIONS');
  assert.equal(report.revision,revision);
  assert.equal(report.weightsDownloaded,false);
  assert.equal(report.modelAdmission,'NOT_AUTHORIZED');
  assert.equal(report.conversionEquivalence,'NOT_VERIFIED');
  assert.match(report.readme.sha256,/^[a-f0-9]{64}$/);
  assert.equal(report.licenseFiles[0].recognizedTitle,'MIT_TITLE');
  assert.equal(JSON.stringify(report).includes('BODY_CANARY'),false);
  assert.equal(f.calls.length,4);
});
test('CPV1-07 source diagnosis distinguishes omitted default API card from pinned declaration',async()=>{
  const f=fixture({...base,cardData:undefined});const report=await inspectPublicModel(id,f);
  assert.equal(report.currentMetadata.observation.cardDataPresent,false);
  assert.equal(report.currentMetadata.observation.cardLicense.type,'missing');
  assert.equal(report.diagnosis,'DEFAULT_METADATA_FIELD_OMITTED');
});
test('CPV1-07 README declaration cannot silently replace two missing API declarations',async()=>{
  const missing={...base,cardData:undefined,tags:['license:mit','PRIVATE_TAG_CANARY']};
  const report=await inspectPublicModel(id,fixture(missing,missing));
  assert.equal(report.diagnosis,'API_CARD_FIELD_MISSING_README_DECLARED');
  assert.equal(report.modelAdmission,'NOT_AUTHORIZED');
  assert.deepEqual(report.currentMetadata.observation.tagLicenseCodes,['mit']);
  assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
});
test('CPV1-07 ambiguous/custom/array license representations remain unverified and non-echoing',()=>{
  for(const value of [undefined,null,['mit'],{license:'mit'},'PRIVATE_LICENSE_CANARY'])
    assert.equal(observeLicense(value).permitted,false);
  for(const text of ['---\nlicense: mit\nlicense: apache-2.0\n---\n',
    '---\nlicense: [mit]\n---\n','---\nlicense: &key mit\n---\n',
    '---\nlicense: PRIVATE_LICENSE_CANARY\n---\n','---\nlicense: mit\n'])
    assert.equal(observeReadmeLicense(text).permitted,false);
  assert.equal(observeReadmeLicense('---\r\nlicense: "mit"\r\n---\r\n').permitted,true);
});
test('CPV1-07 wrong/private/gated/mutable pinned identities stop before README',async()=>{
  for(const change of [{id:'wrong'},{private:true},{gated:'auto'},{sha:'main'},
    {sha:'2'.repeat(40)}]){
    const f=fixture(base,{...base,...change});const report=await inspectPublicModel(id,f);
    assert.equal(report.diagnosis,'PINNED_IDENTITY_UNVERIFIED');
    assert.equal(f.calls.length,2);
    assert.equal(report.readme,undefined);
  }
});
test('CPV1-07 source diagnosis rejects arbitrary repositories without any request',async()=>{
  let calls=0;
  await assert.rejects(inspectPublicModel('PRIVATE_REPOSITORY_CANARY',
    {fetcher:async()=>{calls++;}}),/public_model_not_allowlisted/);
  assert.equal(calls,0);
});
test('CPV1-07 unavailable/redirect/oversize sources do not follow, echo or load weights',async()=>{
  for(const fetcher of [async()=>response('PRIVATE_REDIRECT_CANARY',302),
    async()=>response('x'.repeat(1024*1024+1)),async()=>{
      throw new Error('PRIVATE_FETCH_EXCEPTION_CANARY');
    },async()=>response('{PRIVATE_MALFORMED_CANARY')]){
    const report=await inspectPublicModel(id,{fetcher});
    assert.equal(report.modelAdmission,'NOT_AUTHORIZED');
    assert.equal(report.weightsDownloaded,false);
    assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
    assert.equal(report.readme,undefined);
  }
});
test('CPV1-07 conflicting allowed declarations remain non-admission',async()=>{
  const report=await inspectPublicModel(id,fixture(base,base,
    '---\nlicense: apache-2.0\n---\n'));
  assert.equal(report.diagnosis,'DECLARATIONS_NOT_CONSISTENT');
  assert.equal(report.modelAdmission,'NOT_AUTHORIZED');
});
