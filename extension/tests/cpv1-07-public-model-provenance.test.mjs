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


test('CPV1-07 bounded source screening keeps exact identity/license/inventory fields and pinned files',async()=>{
  const {SCREENING_MODELS,METADATA_FIELDS,inspectBoundedPublicModel}=await import(
    '../experiments/public-model-provenance.mjs');
  const candidate=SCREENING_MODELS[1],calls=[];
  const metadata={...base,id:candidate};
  const report=await inspectBoundedPublicModel(candidate,{fetcher:async(url,options)=>{
    calls.push(url);assert.equal(options.redirect,'manual');
    assert.equal(Object.hasOwn(options.headers,'Authorization'),false);
    const u=new URL(url);
    if(u.pathname.startsWith('/api/models/')) {
      assert.deepEqual(u.searchParams.getAll('expand'),METADATA_FIELDS);
      assert.deepEqual([...u.searchParams.keys()],METADATA_FIELDS.map(()=>'expand'));
      assert.equal(u.pathname==='/api/models/'+candidate
        ||u.pathname==='/api/models/'+candidate+'/revision/'+revision,true);
      return response(JSON.stringify(metadata));
    }
    assert.equal(u.search,'');
    assert.equal(u.pathname==='/'+candidate+'/raw/'+revision+'/README.md'
      ||u.pathname==='/'+candidate+'/raw/'+revision+'/LICENSE',true);
    return response(u.pathname.endsWith('/README.md')?'---\nlicense: mit\n---\n':'MIT License');
  }});
  assert.equal(calls.length,4);
  assert.equal(report.quantizedAssetPresent,true);
  assert.equal(report.screeningDisposition,'DECLARED_QUANTIZED_CANDIDATE_PENDING_REVIEW');
  assert.equal(report.modelAdmission,'NOT_AUTHORIZED');
  assert.equal(report.weightsDownloaded,false);
  assert.equal(report.conversionEquivalence,'NOT_VERIFIED');
});
test('CPV1-07 bounded source screening never assigns converted license from upstream or permissive tag',async()=>{
  const {SCREENING_MODELS,inspectBoundedPublicModel}=await import('../experiments/public-model-provenance.mjs');
  const candidate=SCREENING_MODELS[0];
  const missing={...base,id:candidate,cardData:{},tags:['license:mit']};
  const report=await inspectBoundedPublicModel(candidate,{fetcher:async url=>
    response(new URL(url).pathname.startsWith('/api/models/')?
      JSON.stringify(missing):'---\nbase_model: intfloat/multilingual-e5-small\n---\n')});
  assert.equal(report.screeningDisposition,'NOT_ADMITTED');
  assert.equal(report.diagnosis,'PERMISSIBLE_DECLARATION_UNVERIFIED');
  assert.equal(report.modelAdmission,'NOT_AUTHORIZED');
});
test('CPV1-07 bounded screening distinguishes declared upstream without quantized files from a model candidate',async()=>{
  const {SCREENING_MODELS,inspectBoundedPublicModel}=await import('../experiments/public-model-provenance.mjs');
  const upstream=SCREENING_MODELS[2];
  const metadata={...base,id:upstream,siblings:[{rfilename:'README.md'}]};
  const report=await inspectBoundedPublicModel(upstream,{fetcher:async url=>
    response(new URL(url).pathname.startsWith('/api/models/')?
      JSON.stringify(metadata):'---\nlicense: mit\n---\n')});
  assert.equal(report.quantizedAssetPresent,false);
  assert.equal(report.screeningDisposition,'DECLARED_UPSTREAM_ONLY_PENDING_REVIEW');
  assert.equal(report.modelAdmission,'NOT_AUTHORIZED');
});
test('CPV1-07 bounded screening preserves original byte/refusal bound and does not follow unavailable candidates',async()=>{
  const {SCREENING_MODELS,inspectBoundedPublicModel}=await import('../experiments/public-model-provenance.mjs');
  for(const fetcher of [async()=>response('PRIVATE_NOT_FOUND_CANARY',404),
    async()=>response('PRIVATE_REDIRECT_CANARY',302),
    async()=>response('x'.repeat(1024*1024+1))]){
    const report=await inspectBoundedPublicModel(SCREENING_MODELS[0],{fetcher});
    assert.equal(report.diagnosis,'METADATA_UNAVAILABLE');
    assert.equal(report.screeningDisposition,'NOT_ADMITTED');
    assert.equal(report.weightsDownloaded,false);
    assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
  }
});
test('CPV1-07 bounded screening rejects the known unlicensed or arbitrary repository before any request',async()=>{
  const {inspectBoundedPublicModel}=await import('../experiments/public-model-provenance.mjs');
  for(const repository of ['Xenova/multilingual-e5-small','PRIVATE_OTHER_REPOSITORY']){
    let calls=0;
    await assert.rejects(inspectBoundedPublicModel(repository,
      {fetcher:async()=>{calls++;}}),/public_screening_model_not_allowlisted/);
    assert.equal(calls,0);
  }
});
