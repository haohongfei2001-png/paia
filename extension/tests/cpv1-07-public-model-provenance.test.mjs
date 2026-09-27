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


// Paired-text alternatives are source-only observations, never model admission.
import {RERANKER_SOURCES,inspectPublicRerankerSource}
  from '../experiments/public-reranker-provenance.mjs';
import {METADATA_FIELDS} from '../experiments/public-model-provenance.mjs';
import {semanticLabRouting,semanticProbeRequired} from '../scripts/semantic-lab-change.mjs';
function rerankerFixture(repository=RERANKER_SOURCES[0],overrides={}){
  const calls=[];
  const metadata={id:repository,sha:revision,private:false,gated:false,
    cardData:{license:'mit'},tags:['license:mit','PRIVATE_METADATA_CANARY'],
    siblings:['README.md','LICENSE','config.json','tokenizer_config.json',
      'model.safetensors','onnx/model_quantized.onnx'].map(rfilename=>({rfilename}))};
  const config={architectures:['BertForSequenceClassification'],hidden_size:384,
    num_hidden_layers:12,max_position_embeddings:512,num_labels:1,
    id2label:{0:'PRIVATE_LABEL_CANARY'},irrelevant:'PRIVATE_CONFIG_CANARY'};
  const tokenizer={tokenizer_class:'BertTokenizerFast',model_max_length:512,
    irrelevant:'PRIVATE_TOKENIZER_CANARY'};
  const sources={current:JSON.stringify(overrides.current??metadata),
    pinned:JSON.stringify(overrides.pinned??metadata),
    'README.md':overrides.readme??'---\nlicense: mit\n---\nPRIVATE_README_CANARY',
    LICENSE:overrides.license??'MIT License\nPRIVATE_LICENSE_BODY_CANARY',
    'config.json':JSON.stringify(overrides.config??config),
    'tokenizer_config.json':JSON.stringify(overrides.tokenizer??tokenizer)};
  return {calls,metadata,config,tokenizer,fetcher:async(url,options)=>{
    calls.push(url);assert.equal(options.redirect,'manual');
    assert.equal(Object.hasOwn(options.headers,'Authorization'),false);
    assert.equal(new URL(url).hostname,'huggingface.co');
    const u=new URL(url);let key;
    if(u.pathname==='/api/models/'+repository)key='current';
    else if(u.pathname==='/api/models/'+repository+'/revision/'+revision)key='pinned';
    else {
      const prefix='/'+repository+'/raw/'+revision+'/';
      assert.equal(u.pathname.startsWith(prefix),true,'only immutable allowlisted raw URL');
      key=u.pathname.slice(prefix.length);
      assert.equal(['README.md','LICENSE','config.json','tokenizer_config.json'].includes(key),true,
        'never request weights, tokenizer payload or arbitrary inventory file');
      assert.equal(u.search,'');
    }
    if(key==='current'||key==='pinned'){
      assert.deepEqual(u.searchParams.getAll('expand'),METADATA_FIELDS);
      assert.deepEqual([...u.searchParams.keys()],METADATA_FIELDS.map(()=>'expand'));
    }
    return response(sources[key]);
  }};
}
test('CPV1-07 paired-text screening pins both public sources without weights, inference or admission',async()=>{
  assert.deepEqual(RERANKER_SOURCES,[
    'cross-encoder/mmarco-mMiniLMv2-L12-H384-v1','BAAI/bge-reranker-v2-m3']);
  assert.equal(Object.isFrozen(RERANKER_SOURCES),true);
  for(const repository of RERANKER_SOURCES){
    const f=rerankerFixture(repository),report=await inspectPublicRerankerSource(repository,f);
    assert.equal(f.calls.length,6);
    assert.equal(report.diagnosis,'CONSISTENT_DECLARED_SOURCE_PENDING_INPUT_AND_QUALITY');
    assert.equal(report.revision,revision);
    assert.equal(report.modelAdmission,'NOT_AUTHORIZED');
    assert.equal(report.productionClaim,false);
    assert.equal(report.weightsDownloaded,false);
    assert.equal(report.inferenceExecuted,false);
    assert.equal(report.pairTokenization,'NOT_VERIFIED');
    assert.equal(report.scoringActivation,'NOT_VERIFIED');
    assert.equal(report.chromeCompatibility,'NOT_VERIFIED');
    assert.equal(report.qualityGate,'NOT_EVALUATED');
    assert.equal(report.inventory.quantizedOnnxListed,true);
    assert.equal(report.inventory.tensorBytesFromMetadata,'NOT_VERIFIED');
    assert.equal(report.inputContract.hiddenDimension,384);
    assert.equal(report.inputContract.pairedInputsExecuted,false);
    assert.equal(report.inputContract.truncationPolicyVerified,false);
    assert.equal(report.inputContract.normalizationVerified,false);
    assert.match(report.config.sha256,/^[a-f0-9]{64}$/);
    assert.equal(report.licenseFiles[0].recognizedTitle,'MIT_TITLE');
    assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
  }
});
test('CPV1-07 paired-text screening refuses arbitrary and previously tested encoder repositories before requests',async()=>{
  for(const repository of ['PRIVATE_SOURCE_CANARY',PUBLIC_MODELS[4]]){
    let calls=0;
    await assert.rejects(inspectPublicRerankerSource(repository,{fetcher:async()=>{calls++;}}),
      /public_reranker_source_not_allowlisted/);
    assert.equal(calls,0);
  }
});
test('CPV1-07 paired-text screening fails closed on current and pinned identity drift',async()=>{
  const base=rerankerFixture().metadata;
  for(const change of [{id:'PRIVATE_WRONG_ID'},{sha:'main'},{private:true},{gated:'auto'},
    {private:undefined},{gated:undefined}]){
    const f=rerankerFixture(RERANKER_SOURCES[0],{current:{...base,...change}});
    const report=await inspectPublicRerankerSource(RERANKER_SOURCES[0],f);
    assert.equal(report.diagnosis,'IDENTITY_UNVERIFIED');assert.equal(f.calls.length,1);
    assert.equal(report.readme,undefined);assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
  }
  for(const change of [{id:'PRIVATE_WRONG_ID'},{sha:'2'.repeat(40)},{private:true},
    {gated:'auto'},{sha:'main'}]){
    const f=rerankerFixture(RERANKER_SOURCES[0],{pinned:{...base,...change}});
    const report=await inspectPublicRerankerSource(RERANKER_SOURCES[0],f);
    assert.equal(report.diagnosis,'PINNED_IDENTITY_UNVERIFIED');assert.equal(f.calls.length,2);
    assert.equal(report.readme,undefined);assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
  }
});
test('CPV1-07 paired-text declaration conflicts, missing cards and oversized licenses cannot imply admission',async()=>{
  const base=rerankerFixture().metadata;
  for(const overrides of [
    {current:{...base,cardData:{}}},
    {pinned:{...base,cardData:{license:['mit']}}},
    {pinned:{...base,tags:['license:apache-2.0']}},
    {readme:'---\nlicense: apache-2.0\n---\n'},
    {readme:'---\nlicense: mit\nlicense: mit\n---\n'},
    {readme:'x'.repeat(256*1024+1)}
  ]){
    const f=rerankerFixture(RERANKER_SOURCES[0],overrides);
    const report=await inspectPublicRerankerSource(RERANKER_SOURCES[0],f);
    assert.equal(report.diagnosis,'LICENSE_DECLARATIONS_UNVERIFIED');
    assert.equal(report.modelAdmission,'NOT_AUTHORIZED');assert.equal(report.config,undefined);
  }
  const report=await inspectPublicRerankerSource(RERANKER_SOURCES[0],
    rerankerFixture(RERANKER_SOURCES[0],{license:'x'.repeat(64*1024+1)}));
  assert.equal(report.diagnosis,'LICENSE_FILE_UNAVAILABLE');
  assert.equal(report.config,undefined);
});
test('CPV1-07 paired-text configuration is finite, non-executing and refuses remote code declarations',async()=>{
  const f=rerankerFixture();
  for(const overrides of [
    {config:{...f.config,architectures:['PRIVATE_REMOTE_CLASS']}},
    {config:{...f.config,architectures:['BertForSequenceClassification','RobertaForSequenceClassification']}},
    {config:{...f.config,auto_map:{PRIVATE_REMOTE_KEY:'PRIVATE_REMOTE_CODE'}}},
    {tokenizer:{...f.tokenizer,auto_map:{PRIVATE_REMOTE_KEY:'PRIVATE_REMOTE_CODE'}}},
    {config:[]},{tokenizer:[]}
  ]){
    const report=await inspectPublicRerankerSource(RERANKER_SOURCES[0],
      rerankerFixture(RERANKER_SOURCES[0],overrides));
    assert.equal(report.diagnosis,'CONFIGURATION_UNVERIFIED');
    assert.equal(report.inferenceExecuted,false);
    assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
  }
  const report=await inspectPublicRerankerSource(RERANKER_SOURCES[0],
    rerankerFixture(RERANKER_SOURCES[0],{config:{...f.config,hidden_size:'384',
      max_position_embeddings:-1,num_hidden_layers:NaN,num_labels:99},
      tokenizer:{...f.tokenizer,tokenizer_class:'PRIVATE_TOKENIZER',model_max_length:1e30}}));
  assert.deepEqual([report.inputContract.hiddenDimension,report.inputContract.positionLimit,
    report.inputContract.layers,report.inputContract.outputLabels,
    report.inputContract.tokenizerDeclaredLimit],[null,null,null,null,null]);
  assert.equal(report.inputContract.tokenizerClass,'OTHER_OR_UNVERIFIED');
  assert.equal(report.pairTokenization,'NOT_VERIFIED');
  assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
});
test('CPV1-07 paired-text streaming bounds cancel and release without reading redirects or leaking bad UTF8',async()=>{
  let reads=0,cancelled=0,released=0;
  const report=await inspectPublicRerankerSource(RERANKER_SOURCES[0],{fetcher:async()=>({
    status:200,body:{getReader:()=>({read:async()=>{reads++;
      return {done:false,value:new Uint8Array(1024*1024+1)};},
      cancel:async()=>{cancelled++;},releaseLock:()=>{released++;}})},
    text:async()=>assert.fail('real stream must not use unbounded text')
  })});
  assert.equal(report.diagnosis,'METADATA_UNAVAILABLE');
  assert.deepEqual([reads,cancelled,released],[1,1,1]);
  assert.equal(report.currentMetadata.bounded,false);
  let consumed=0;
  const redirect=await inspectPublicRerankerSource(RERANKER_SOURCES[0],{fetcher:async()=>({
    status:302,text:async()=>{consumed++;return 'PRIVATE_REDIRECT';},
    body:{getReader:()=>{consumed++;assert.fail('redirect must not be consumed');}}
  })});
  assert.equal(redirect.diagnosis,'METADATA_UNAVAILABLE');assert.equal(consumed,0);
  let read=0,release=0;
  const invalid=await inspectPublicRerankerSource(RERANKER_SOURCES[0],{fetcher:async()=>({
    status:200,body:{getReader:()=>({read:async()=>read++===0?
      {done:false,value:Uint8Array.from([0xc3,0x28])}:{done:true},
      cancel:async()=>{},releaseLock:()=>{release++;}})}
  })});
  assert.equal(invalid.diagnosis,'SOURCE_INSPECTION_UNAVAILABLE');assert.equal(release,1);
  assert.equal(JSON.stringify(invalid).includes('PRIVATE'),false);
});
test('CPV1-07 paired-text inventory rejects traversal, aliases, duplicates and unbounded lists before raw files',async()=>{
  const base=rerankerFixture().metadata;
  for(const siblings of [null,[{rfilename:'../PRIVATE_FILE'}],
    [{rfilename:'/PRIVATE_FILE'}],[{rfilename:'folder//PRIVATE_FILE'}],
    [{rfilename:'./PRIVATE_FILE'}],[{rfilename:'a'.repeat(241)}],
    [{rfilename:'README.md'},{rfilename:'README.md'}],
    Array.from({length:513},(_,i)=>({rfilename:'file-'+i}))]){
    const f=rerankerFixture(RERANKER_SOURCES[0],{pinned:{...base,siblings}});
    const report=await inspectPublicRerankerSource(RERANKER_SOURCES[0],f);
    assert.equal(report.diagnosis,'INVENTORY_UNVERIFIED');assert.equal(f.calls.length,2);
    assert.equal(report.readme,undefined);assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
  }
});
test('CPV1-07 paired-text source-only routing requires full coherent scope and verified synchronization history',()=>{
  const paths=['extension/experiments/public-reranker-provenance.mjs',
    'extension/scripts/screen-public-rerankers.mjs',
    'extension/tests/cpv1-07-public-model-provenance.test.mjs',
    'extension/scripts/semantic-lab-change.mjs',
    '.github/workflows/paia-vs07-semantic-lab.yml','.github/workflows/paia-candidate.yml',
    'extension/docs/consumer-product-v1/STATUS.md',
    'extension/docs/consumer-product-v1/EXECUTION_PROTOCOL.md'];
  const evidence={action:'synchronize',before:'2'.repeat(40),head:revision,ancestor:true,paths};
  assert.deepEqual(semanticLabRouting(evidence),{runProbe:false,runSourceScreen:true,sourceOnly:true});
  assert.equal(semanticProbeRequired(evidence),true,'original model classifier contract unchanged');
  for(const change of [{action:'opened'},{before:'main'},{head:'main'},{before:revision},
    {ancestor:false},{paths:null},{paths:[]},{paths:[...paths,paths[0]]},
    {paths:[...paths,'extension/core/search-service.js']},
    {paths:[...paths,'extension/experiments/semantic-calibration.mjs']},
    {paths:[...paths,'extension/tests/fixtures/cpv1-07-retrieval-corpus.mjs']},
    {paths:paths.filter(p=>!p.endsWith('screen-public-rerankers.mjs'))}]){
    const routing=semanticLabRouting({...evidence,...change});
    assert.equal(routing.sourceOnly,false);assert.equal(routing.runProbe,true);
  }
  assert.deepEqual(semanticLabRouting({...evidence,paths:[
    'extension/tests/cpv1-07-public-model-provenance.test.mjs']}),
    {runProbe:false,runSourceScreen:false,sourceOnly:false});
});
test('CPV1-07 paired-text unavailable source observations stay bounded and non-echoing',async()=>{
  for(const fetcher of [async()=>response('PRIVATE_NOT_FOUND',404),
    async()=>response('{PRIVATE_MALFORMED'),async()=>{throw Error('PRIVATE_FETCH_FAILURE');}]){
    const report=await inspectPublicRerankerSource(RERANKER_SOURCES[0],{fetcher});
    assert.equal(report.modelAdmission,'NOT_AUTHORIZED');
    assert.equal(report.weightsDownloaded,false);assert.equal(report.inferenceExecuted,false);
    assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
    assert.equal(report.config,undefined);
  }
});

test('CPV1-07 exact public ONNX inventory is emitted without fetching tensor payloads',async()=>{
 const f=rerankerFixture(),report=await inspectPublicRerankerSource(RERANKER_SOURCES[0],f);
 assert.deepEqual(report.inventory.onnxFiles,['onnx/model_quantized.onnx']);
 assert.equal(f.calls.some(url=>url.endsWith('.onnx')||url.endsWith('.safetensors')),false);
 assert.equal(report.weightsDownloaded,false);assert.equal(report.inferenceExecuted,false);
 const empty=rerankerFixture(RERANKER_SOURCES[0],{pinned:{
  ...f.metadata,siblings:f.metadata.siblings.filter(v=>!v.rfilename.endsWith('.onnx'))}});
 assert.deepEqual((await inspectPublicRerankerSource(RERANKER_SOURCES[0],empty)).inventory.onnxFiles,[]);
});
