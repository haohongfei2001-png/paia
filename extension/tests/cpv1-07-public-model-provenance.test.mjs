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


test('CPV1-07 official embedding sources preserve pinned declarative pooling/projection and never load tensors',async()=>{
 const {EMBEDDING_SOURCES,inspectPublicEmbeddingSource}=await import('../experiments/public-embedding-provenance.mjs');
 const candidate=EMBEDDING_SOURCES[1],calls=[],rev='5'.repeat(40);
 const files=['README.md','LICENSE','config.json','tokenizer_config.json','modules.json',
  '1_Pooling/config.json','2_Dense/config.json','onnx/model_quantized.onnx'];
 const metadata={id:candidate,sha:rev,private:false,gated:false,cardData:{license:'apache-2.0'},
  siblings:files.map(rfilename=>({rfilename})),tags:['license:apache-2.0']};
 const bodies={
  'README.md':'---\nlicense: apache-2.0\n---\nPUBLIC_EMBEDDING_SOURCE_CANARY',
  LICENSE:'Apache License\nPUBLIC_LICENSE_CANARY',
  'config.json':JSON.stringify({architectures:['BertModel'],hidden_size:768,num_hidden_layers:12,max_position_embeddings:512}),
  'tokenizer_config.json':JSON.stringify({tokenizer_class:'BertTokenizer',model_max_length:512}),
  'modules.json':JSON.stringify([
   {idx:0,type:'sentence_transformers.models.Transformer',path:''},
   {idx:1,type:'sentence_transformers.models.Pooling',path:'1_Pooling'},
   {idx:2,type:'sentence_transformers.models.Dense',path:'2_Dense'},
   {idx:3,type:'sentence_transformers.models.Normalize',path:'3_Normalize'}]),
  '1_Pooling/config.json':JSON.stringify({word_embedding_dimension:768,pooling_mode_cls_token:true,
   pooling_mode_mean_tokens:false,pooling_mode_max_tokens:false,pooling_mode_mean_sqrt_len_tokens:false}),
  '2_Dense/config.json':JSON.stringify({in_features:768,out_features:768,bias:true,
   activation_function:'torch.nn.modules.activation.Tanh'})};
 const report=await inspectPublicEmbeddingSource(candidate,{fetcher:async(url,options)=>{
  calls.push(url);assert.equal(options.redirect,'manual');assert.equal(Object.hasOwn(options.headers,'Authorization'),false);
  const u=new URL(url);assert.equal(u.origin,'https://huggingface.co');
  if(u.pathname.startsWith('/api/models/')){
   assert.deepEqual(u.searchParams.getAll('expand'),['sha','private','gated','cardData','siblings','tags']);
   assert.ok(['/api/models/'+candidate,'/api/models/'+candidate+'/revision/'+rev].includes(u.pathname));
   return response(JSON.stringify(metadata));
  }
  const prefix='/'+candidate+'/raw/'+rev+'/';assert.ok(u.pathname.startsWith(prefix));
  const file=u.pathname.slice(prefix.length);assert.ok(Object.hasOwn(bodies,file));assert.equal(u.search,'');
  return response(bodies[file]);
 }});
 assert.equal(report.diagnosis,'CONSISTENT_DECLARED_SOURCE_PENDING_INPUT_AND_QUALITY');
 assert.deepEqual(report.moduleOrder,['Transformer','Pooling','Dense','Normalize']);
 assert.equal(report.pooling.modes.pooling_mode_cls_token,true);
 assert.equal(report.pooling.modes.pooling_mode_mean_tokens,false);
 assert.equal(report.pooling.modes.pooling_mode_weightedmean_tokens,null,'absence stays unknown, never invented false');
 assert.equal(report.projection.activation,'torch.nn.modules.activation.Tanh');
 assert.equal(report.projection.weightsVerified,false);assert.equal(report.normalizationDeclared,true);
 assert.equal(report.configurationFiles.length,5);assert.equal(calls.length,9);
 assert.ok(report.configurationFiles.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));
 assert.equal(report.inventory.quantizedOnnxListed,true);
 for(const key of ['weightsDownloaded','inferenceExecuted','productionClaim'])assert.equal(report[key],false);
 for(const key of ['queryPrefix','scoringActivation','conversionEquivalence','chromeCompatibility'])assert.equal(report[key],'NOT_VERIFIED');
 assert.equal(report.modelAdmission,'NOT_AUTHORIZED');assert.equal(report.qualityGate,'NOT_EVALUATED');
 assert.equal(JSON.stringify(report).includes('CANARY'),false);
 assert.ok(calls.every(url=>!url.includes('.onnx')&&!url.includes('.bin')&&!url.includes('.safetensors')));
});
test('CPV1-07 embedding source wrong/private/gated/pinned identity refuses before configuration reads',async()=>{
 const {EMBEDDING_SOURCES,inspectPublicEmbeddingSource}=await import('../experiments/public-embedding-provenance.mjs');
 const candidate=EMBEDDING_SOURCES[0],rev='6'.repeat(40);
 const current={id:candidate,sha:rev,private:false,gated:false};
 for(const change of [{id:'PRIVATE_BAD_ID'},{sha:'main'},{sha:'7'.repeat(40)},{private:true},{gated:'auto'}]){
  let calls=0;const report=await inspectPublicEmbeddingSource(candidate,{fetcher:async()=>response(
   JSON.stringify(++calls===1?current:{...current,...change}))});
  assert.equal(report.diagnosis,'PINNED_IDENTITY_UNVERIFIED');assert.equal(calls,2);
  assert.equal(report.pooling,undefined);assert.equal(report.modelAdmission,'NOT_AUTHORIZED');
  assert.equal(JSON.stringify(report).includes('PRIVATE_BAD_ID'),false);
 }
});
test('CPV1-07 embedding source rejects ambiguous inventories without reading advertised paths',async()=>{
 const {EMBEDDING_SOURCES,inspectPublicEmbeddingSource}=await import('../experiments/public-embedding-provenance.mjs');
 const candidate=EMBEDDING_SOURCES[0];
 for(const siblings of [[{rfilename:'../PRIVATE_ESCAPE'}],[{rfilename:'/LICENSE'}],
  [{rfilename:'README.md'},{rfilename:'README.md'}],Array.from({length:513},(_,i)=>({rfilename:'file'+i})),
  [{rfilename:'https://private.example/weights'}]]){
  let calls=0;const report=await inspectPublicEmbeddingSource(candidate,{fetcher:async()=>{
   calls++;return response(JSON.stringify({id:candidate,sha:'8'.repeat(40),private:false,gated:false,siblings}));}});
  assert.equal(calls,2);assert.equal(report.diagnosis,'INVENTORY_UNVERIFIED');
  assert.equal(JSON.stringify(report).includes('PRIVATE_ESCAPE'),false);
 }
});
test('CPV1-07 embedding source missing or conflicting license never inherits base model or permissive tags',async()=>{
 const {EMBEDDING_SOURCES,inspectPublicEmbeddingSource}=await import('../experiments/public-embedding-provenance.mjs');
 const candidate=EMBEDDING_SOURCES[0];
 for(const cardData of [{},{license:'mit'}, {license:['apache-2.0']}]){
  const metadata={id:candidate,sha:'9'.repeat(40),private:false,gated:false,cardData,
   tags:['license:apache-2.0'],siblings:[{rfilename:'README.md'}]};
  let calls=0;const report=await inspectPublicEmbeddingSource(candidate,{fetcher:async url=>{
   calls++;return response(new URL(url).pathname.startsWith('/api/models/')?JSON.stringify(metadata):
    '---\nlicense: apache-2.0\nbase_model: PRIVATE_BASE_MODEL\n---\n');}});
  assert.equal(report.diagnosis,'LICENSE_DECLARATIONS_UNVERIFIED');assert.equal(calls,3);
  assert.equal(report.modelAdmission,'NOT_AUTHORIZED');assert.equal(JSON.stringify(report).includes('PRIVATE_BASE_MODEL'),false);
 }
});
test('CPV1-07 embedding source bounds streams and releases ownership without decoding overflowing source',async()=>{
 const {EMBEDDING_SOURCES,inspectPublicEmbeddingSource}=await import('../experiments/public-embedding-provenance.mjs');
 let cancelled=0,released=0;
 const report=await inspectPublicEmbeddingSource(EMBEDDING_SOURCES[0],{fetcher:async()=>({
  status:200,body:{getReader:()=>({read:async()=>({done:false,value:new Uint8Array(1024*1024+1)}),
   cancel:async()=>{cancelled++;},releaseLock:()=>{released++;}})},
  text:async()=>{assert.fail('stream must not fall back to unbounded response.text');}
 })});
 assert.equal(report.diagnosis,'METADATA_UNAVAILABLE');assert.equal(report.currentMetadata.bounded,false);
 assert.equal(cancelled,1);assert.equal(released,1);assert.equal(report.weightsDownloaded,false);
});
test('CPV1-07 embedding source refuses arbitrary IDs before any request',async()=>{
 const {inspectPublicEmbeddingSource}=await import('../experiments/public-embedding-provenance.mjs');
 let calls=0;await assert.rejects(inspectPublicEmbeddingSource('PRIVATE_ARBITRARY_REPO',{fetcher:async()=>{calls++;}}),
  /public_embedding_source_not_allowlisted/);assert.equal(calls,0);
});
test('CPV1-07 embedding source module configuration is declarative only and refuses remote or ambiguous execution',async()=>{
 const {EMBEDDING_SOURCES,inspectPublicEmbeddingSource}=await import('../experiments/public-embedding-provenance.mjs');
 const candidate=EMBEDDING_SOURCES[0],rev='a'.repeat(40);
 const standard=[{idx:0,type:'sentence_transformers.models.Transformer',path:''},
  {idx:1,type:'sentence_transformers.models.Pooling',path:'1_Pooling'}];
 const files=['README.md','config.json','tokenizer_config.json','modules.json','1_Pooling/config.json'];
 const metadata={id:candidate,sha:rev,private:false,gated:false,cardData:{license:'apache-2.0'},
  siblings:files.map(rfilename=>({rfilename}))};
 for(const fault of ['remote','module_code','module_path','duplicate_module','missing_pool','pool_not_object']){
  const reads=[];
  const report=await inspectPublicEmbeddingSource(candidate,{fetcher:async url=>{
   const u=new URL(url);reads.push(u.pathname);
   if(u.pathname.startsWith('/api/models/'))return response(JSON.stringify(metadata));
   if(u.pathname.endsWith('/README.md'))return response('---\nlicense: apache-2.0\n---\n');
   if(u.pathname.endsWith('/tokenizer_config.json'))return response(JSON.stringify({tokenizer_class:'XLMRobertaTokenizer'}));
   if(u.pathname.endsWith('/config.json')&&!u.pathname.includes('1_Pooling'))return response(JSON.stringify({
    architectures:['XLMRobertaModel'],hidden_size:768,...(fault==='remote'?{auto_map:{PRIVATE:'PRIVATE_REMOTE_CODE'}}:{})}));
   if(u.pathname.endsWith('/modules.json')){
    const modules=structuredClone(standard);
    if(fault==='module_code')modules[1].type='PRIVATE_REMOTE_MODULE';
    if(fault==='module_path')modules[1].path='../PRIVATE_PATH';
    if(fault==='duplicate_module')modules[1].idx=0;
    if(fault==='missing_pool')modules[1].type='sentence_transformers.models.Normalize';
    return response(JSON.stringify(modules));
   }
   assert.ok(u.pathname.endsWith('/1_Pooling/config.json'));
   return response('[]');
  }});
  assert.equal(report.diagnosis,fault==='remote'?'CONFIGURATION_UNVERIFIED':
   fault==='pool_not_object'?'MODULE_CONFIGURATION_UNVERIFIED':'MODULE_CONTRACT_UNVERIFIED');
  assert.equal(report.modelAdmission,'NOT_AUTHORIZED');assert.equal(report.inferenceExecuted,false);
  assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
  if(fault!=='pool_not_object')assert.equal(reads.some(x=>x.endsWith('/1_Pooling/config.json')),false);
 }
});
test('CPV1-07 embedding source unavailable, redirected, malformed and non-UTF8 input remain finite refusal',async()=>{
 const {EMBEDDING_SOURCES,inspectPublicEmbeddingSource}=await import('../experiments/public-embedding-provenance.mjs');
 for(const fetcher of [async()=>response('PRIVATE_REDIRECT',302),async()=>response('{PRIVATE_JSON'),
  async()=>{throw Error('PRIVATE_FETCH');},async()=>{
   let read=false;return {status:200,body:{getReader:()=>({
    read:async()=>read?{done:true}:(read=true,{done:false,value:new Uint8Array([0xff])}),
    cancel:async()=>{},releaseLock:()=>{}
   })}};
  }]){
  const report=await inspectPublicEmbeddingSource(EMBEDDING_SOURCES[0],{fetcher});
  assert.equal(report.modelAdmission,'NOT_AUTHORIZED');assert.equal(report.weightsDownloaded,false);
  assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
  assert.ok(['METADATA_UNAVAILABLE','SOURCE_INSPECTION_UNAVAILABLE'].includes(report.diagnosis));
 }
});

test('CPV1-07 embedding source-only routing requires complete exact new-input ancestry and never reruns old inference',async()=>{
 const {semanticLabRouting}=await import('../scripts/semantic-lab-change.mjs');
 const evidence={action:'synchronize',before:'b'.repeat(40),head:'c'.repeat(40),ancestor:true,
  paths:['extension/experiments/public-embedding-provenance.mjs',
   'extension/scripts/screen-public-embeddings.mjs',
   'extension/experiments/public-reranker-provenance.mjs',
   'extension/tests/cpv1-07-public-model-provenance.test.mjs',
   'extension/scripts/semantic-lab-change.mjs','.github/workflows/paia-vs07-semantic-lab.yml',
   '.github/workflows/paia-candidate.yml','extension/docs/consumer-product-v1/STATUS.md',
   'extension/docs/consumer-product-v1/EXECUTION_PROTOCOL.md']};
 const result=semanticLabRouting(evidence);
 assert.equal(result.embeddingOnly,true);assert.equal(result.runEmbeddingScreen,true);
 assert.equal(result.runProbe,false);assert.equal(result.runPairedProbe,false);assert.equal(result.runSourceScreen,false);
 for(const changed of [{action:'opened'},{before:'main'},{head:evidence.before},{ancestor:false},
  {paths:null},{paths:[...evidence.paths,evidence.paths[0]]},
  {paths:[...evidence.paths,'extension/tests/fixtures/cpv1-07-retrieval-corpus.mjs']},
  {paths:evidence.paths.filter(x=>!x.endsWith('screen-public-embeddings.mjs'))}]){
  const fallback=semanticLabRouting({...evidence,...changed});
  assert.notEqual(fallback.embeddingOnly,true);assert.equal(fallback.runProbe,true);
 }
});

test('CPV1-07 embedding source module order and fixed module paths cannot invent an execution contract',async()=>{
 const {EMBEDDING_SOURCES,inspectPublicEmbeddingSource}=await import('../experiments/public-embedding-provenance.mjs');
 const candidate=EMBEDDING_SOURCES[1],rev='d'.repeat(40);
 const files=['README.md','config.json','tokenizer_config.json','modules.json','1_Pooling/config.json'];
 const metadata={id:candidate,sha:rev,private:false,gated:false,cardData:{license:'apache-2.0'},
  siblings:files.map(rfilename=>({rfilename}))};
 for(const modules of [
  [{idx:0,type:'sentence_transformers.models.Transformer',path:''},
   {idx:1,type:'sentence_transformers.models.Transformer',path:'0_Transformer'},
   {idx:2,type:'sentence_transformers.models.Pooling',path:'1_Pooling'}],
  [{idx:0,type:'sentence_transformers.models.Transformer',path:''},
   {idx:1,type:'sentence_transformers.models.Normalize',path:'2_Normalize'},
   {idx:2,type:'sentence_transformers.models.Pooling',path:'1_Pooling'}],
  [{idx:0,type:'sentence_transformers.models.Transformer',path:''},
   {idx:1,type:'sentence_transformers.models.Pooling',path:'1_PRIVATE_CANARY'}]]){
  const calls=[];
  const report=await inspectPublicEmbeddingSource(candidate,{fetcher:async url=>{
   calls.push(url);const u=new URL(url);
   if(u.pathname.startsWith('/api/models/'))return response(JSON.stringify(metadata));
   if(u.pathname.endsWith('/README.md'))return response('---\nlicense: apache-2.0\n---\n');
   if(u.pathname.endsWith('/tokenizer_config.json'))return response('{}');
   if(u.pathname.endsWith('/modules.json'))return response(JSON.stringify(modules));
   assert.ok(u.pathname.endsWith('/config.json')&&!u.pathname.includes('Pooling'));
   return response('{"architectures":["BertModel"]}');
  }});
  assert.equal(report.diagnosis,'MODULE_CONTRACT_UNVERIFIED');
  assert.equal(report.inferenceExecuted,false);assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
  assert.equal(calls.some(x=>x.includes('1_Pooling/config.json')),false);
 }
});


test('CPV1-07 official embedding source reads bounded sentence-transformer input length without inferring missing defaults',async()=>{
 const {EMBEDDING_SOURCES,inspectPublicEmbeddingSource}=await import('../experiments/public-embedding-provenance.mjs');
 const id=EMBEDDING_SOURCES[0],rev='b'.repeat(40);
 for(const setting of [{max_seq_length:128},{max_seq_length:true},{max_seq_length:513},
  {max_seq_length:0},{max_seq_length:1.5},{max_seq_length:128,auto_map:{PRIVATE:'PRIVATE'}},null]){
  const files=['README.md','config.json','tokenizer_config.json','modules.json',
   'sentence_bert_config.json','1_Pooling/config.json'];
  const metadata={id,sha:rev,private:false,gated:false,cardData:{license:'apache-2.0'},
   siblings:files.map(rfilename=>({rfilename}))};
  const calls=[];
  const report=await inspectPublicEmbeddingSource(id,{fetcher:async url=>{
   const path=new URL(url).pathname;calls.push(path);
   if(path.startsWith('/api/models/'))return response(JSON.stringify(metadata));
   if(path.endsWith('/README.md'))return response('---\nlicense: apache-2.0\n---\n');
   if(path.endsWith('/sentence_bert_config.json'))return response(JSON.stringify(setting));
   if(path.endsWith('/tokenizer_config.json'))return response('{"model_max_length":512}');
   if(path.endsWith('/modules.json'))return response(JSON.stringify([
    {idx:0,type:'sentence_transformers.models.Transformer',path:''},
    {idx:1,type:'sentence_transformers.models.Pooling',path:'1_Pooling'}]));
   if(path.endsWith('/1_Pooling/config.json'))return response(JSON.stringify({
    word_embedding_dimension:768,pooling_mode_cls_token:false,pooling_mode_mean_tokens:true,
    pooling_mode_max_tokens:false,pooling_mode_mean_sqrt_len_tokens:false}));
   return response('{"architectures":["XLMRobertaModel"],"hidden_size":768}');
  }});
  if(setting?.max_seq_length===128&&!setting.auto_map){
   assert.equal(report.diagnosis,'CONSISTENT_DECLARED_SOURCE_PENDING_INPUT_AND_QUALITY');
   assert.equal(report.inputContract.sentenceTransformerLimit,128);
   assert.equal(report.inputContract.tokenizerDeclaredLimit,512);
   assert.equal(report.inputContract.tokenizerClass,'OTHER_OR_UNVERIFIED');
   assert.equal(report.configurationFiles.length,5);
  }else{
   assert.equal(report.diagnosis,'INPUT_CONFIGURATION_UNVERIFIED');
   assert.equal(calls.some(x=>x.endsWith('/1_Pooling/config.json')),false);
  }
  assert.equal(report.weightsDownloaded,false);assert.equal(report.inferenceExecuted,false);
  assert.equal(report.truncationPolicy,'NOT_VERIFIED');assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
 }
});
test('CPV1-07 sentence-transformer source input overflow cancels before pooling or tensor download',async()=>{
 const {EMBEDDING_SOURCES,inspectPublicEmbeddingSource}=await import('../experiments/public-embedding-provenance.mjs');
 const id=EMBEDDING_SOURCES[0],rev='c'.repeat(40),calls=[];
 const files=['README.md','config.json','tokenizer_config.json','modules.json',
  'sentence_bert_config.json','1_Pooling/config.json'];
 const metadata={id,sha:rev,private:false,gated:false,cardData:{license:'apache-2.0'},
  siblings:files.map(rfilename=>({rfilename}))};
 let cancelled=0,released=0;
 const report=await inspectPublicEmbeddingSource(id,{fetcher:async url=>{
  const path=new URL(url).pathname;calls.push(path);
  if(path.startsWith('/api/models/'))return response(JSON.stringify(metadata));
  if(path.endsWith('/README.md'))return response('---\nlicense: apache-2.0\n---\n');
  if(path.endsWith('/sentence_bert_config.json'))return {status:200,body:{getReader:()=>({
   read:async()=>({done:false,value:new Uint8Array(64*1024+1)}),
   cancel:async()=>{cancelled++;},releaseLock:()=>{released++;}})}};
  if(path.endsWith('/tokenizer_config.json'))return response('{"model_max_length":512}');
  if(path.endsWith('/modules.json'))return response(JSON.stringify([
   {idx:0,type:'sentence_transformers.models.Transformer',path:''},
   {idx:1,type:'sentence_transformers.models.Pooling',path:'1_Pooling'}]));
  return response('{"architectures":["XLMRobertaModel"],"hidden_size":768}');
 }});
 assert.equal(report.diagnosis,'INPUT_CONFIGURATION_UNAVAILABLE');assert.equal(cancelled,1);assert.equal(released,1);
 assert.equal(calls.some(x=>x.endsWith('/1_Pooling/config.json')||x.endsWith('.onnx')),false);
 assert.equal(report.inputContract.sentenceTransformerLimit,null);
});


function distiluseSourceFixture({mutate=()=>{},head=()=>({status:302,
 headers:{get:name=>name==='x-linked-size'?'1024':name==='x-linked-etag'?'"'+'8'.repeat(64)+'"':null}})}={}){
 const candidate='sentence-transformers/distiluse-base-multilingual-cased-v1',rev='e'.repeat(40);
 const bodies={
  'README.md':'---\nlicense: apache-2.0\n---\nPRIVATE_SOURCE_CANARY',
  'config.json':{architectures:['DistilBertModel'],dim:768,n_layers:6,max_position_embeddings:512},
  'tokenizer_config.json':{tokenizer_class:'DistilBertTokenizerFast',model_max_length:512},
  'sentence_bert_config.json':{max_seq_length:128},
  'modules.json':[
   {idx:0,type:'sentence_transformers.models.Transformer',path:''},
   {idx:1,type:'sentence_transformers.models.Pooling',path:'1_Pooling'},
   {idx:2,type:'sentence_transformers.models.Dense',path:'2_Dense'}],
  '1_Pooling/config.json':{word_embedding_dimension:768,pooling_mode_cls_token:false,
   pooling_mode_mean_tokens:true,pooling_mode_max_tokens:false,pooling_mode_mean_sqrt_len_tokens:false},
  '2_Dense/config.json':{in_features:768,out_features:512,bias:true,activation_function:'torch.nn.Tanh'}
 };
 const files=[...Object.keys(bodies),'onnx/model_quint8_avx2.onnx','2_Dense/model.safetensors'];
 const metadata={id:candidate,sha:rev,private:false,gated:false,cardData:{license:'apache-2.0'},
  tags:['license:apache-2.0'],siblings:files.map(rfilename=>({rfilename}))};
 mutate(bodies,metadata);
 const calls=[],fetcher=async(url,options)=>{
  const parsed=new URL(url);calls.push({url,method:options.method??'GET'});
  assert.equal(parsed.origin,'https://huggingface.co');
  assert.equal(options.redirect,'manual');
  assert.equal(Object.hasOwn(options.headers,'Authorization'),false);
  if(parsed.pathname.startsWith('/api/models/')){
   assert.ok(['/api/models/'+candidate,'/api/models/'+candidate+'/revision/'+rev].includes(parsed.pathname));
   return response(JSON.stringify(metadata));
  }
  if(options.method==='HEAD'){
   const prefix='/'+candidate+'/resolve/'+rev+'/';
   assert.ok(parsed.pathname.startsWith(prefix),'every tensor header uses the observed immutable revision');
   assert.equal(parsed.search,'');
   const asset=parsed.pathname.slice(prefix.length);
   assert.ok(['onnx/model_quint8_avx2.onnx','2_Dense/model.safetensors'].includes(asset));
   return head(asset,calls);
  }
  const prefix='/'+candidate+'/raw/'+rev+'/';assert.ok(parsed.pathname.startsWith(prefix));
  const file=parsed.pathname.slice(prefix.length);assert.ok(Object.hasOwn(bodies,file));
  assert.ok(!file.endsWith('.onnx')&&!file.endsWith('.safetensors')&&!file.endsWith('.bin'));
  return response(typeof bodies[file]==='string'?bodies[file]:JSON.stringify(bodies[file]));
 };
 return {candidate,rev,bodies,metadata,calls,fetcher};
}
test('CPV1-07 new DistilUSE candidate observes native dimension/layer aliases and exact pinned encoder/projection headers only',async()=>{
 const {inspectPublicDistiluseCandidate,DISTILUSE_SOURCE,EMBEDDING_SOURCES}=await import('../experiments/public-embedding-provenance.mjs');
 const f=distiluseSourceFixture(),report=await inspectPublicDistiluseCandidate({fetcher:f.fetcher});
 assert.equal(DISTILUSE_SOURCE,f.candidate);assert.equal(EMBEDDING_SOURCES.at(-1),f.candidate);
 assert.equal(report.inputContract.architecture,'DistilBertModel');
 assert.equal(report.inputContract.hiddenDimension,768);assert.equal(report.inputContract.layers,6);
 assert.equal(report.inputContract.sentenceTransformerLimit,128);
 assert.equal(report.projection.outputDimension,512);assert.equal(report.projection.executionVerified,false);
 assert.equal(report.assetScreen.disposition,'DECLARED_HEADERS_PENDING_WEIGHT_INPUT_AND_QUALITY_REVIEW');
 assert.equal(report.assetScreen.declaredCombinedBytes,2048);
 assert.deepEqual(report.assetScreen.receipts.map(x=>x.asset),['onnx/model_quint8_avx2.onnx','2_Dense/model.safetensors']);
 assert.ok(report.assetScreen.receipts.every(x=>x.headerVerified&&x.bodyRequested===false
  &&x.sha256==='8'.repeat(64)));
 assert.equal(f.calls.filter(x=>x.method==='HEAD').length,2);
 assert.ok(f.calls.every(x=>x.url.includes(f.candidate)),'no earlier candidates are requested');
 assert.equal(report.modelAdmission,'NOT_AUTHORIZED');assert.equal(report.qualityGate,'NOT_EVALUATED');
 for(const field of ['weightsDownloaded','inferenceExecuted','productionClaim'])assert.equal(report[field],false);
 for(const field of ['weightsDownloaded','inferenceExecuted','bodyRequested','productionAdmission'])assert.equal(report.assetScreen[field],false);
 for(const field of ['projectionExecution','conversionEquivalence','aggregateCacheBudget'])assert.equal(report.assetScreen[field],'NOT_VERIFIED');
 assert.equal(JSON.stringify(report).includes('CANARY'),false);
});
test('CPV1-07 new DistilUSE source must declare compatible native input, mean pooling and Dense projection before any asset request',async()=>{
 const {inspectPublicDistiluseCandidate}=await import('../experiments/public-embedding-provenance.mjs');
 const mutations=[
  b=>delete b['config.json'].dim,b=>b['config.json'].dim=true,
  b=>b['config.json'].dim=512,b=>b['config.json'].n_layers=12,
  b=>delete b['config.json'].max_position_embeddings,
  b=>b['tokenizer_config.json'].tokenizer_class='PRIVATE_TOKENIZER_CANARY',
  b=>delete b['tokenizer_config.json'].model_max_length,
  b=>b['tokenizer_config.json'].model_max_length=64,
  b=>b['sentence_bert_config.json'].max_seq_length=513,
  b=>b['1_Pooling/config.json'].pooling_mode_cls_token=true,
  b=>b['1_Pooling/config.json'].pooling_mode_mean_tokens=false,
  b=>b['1_Pooling/config.json'].pooling_mode_lasttoken=true,
  b=>b['2_Dense/config.json'].in_features=512,
  b=>b['2_Dense/config.json'].out_features=768,
  b=>b['2_Dense/config.json'].bias=false,
  b=>b['2_Dense/config.json'].activation_function='torch.nn.Identity',
  b=>b['2_Dense/config.json'].auto_map={PRIVATE:'PRIVATE'},
  b=>b['config.json'].auto_map={PRIVATE:'PRIVATE'}
 ];
 for(const mutate of mutations){
  const f=distiluseSourceFixture({mutate}),report=await inspectPublicDistiluseCandidate({fetcher:f.fetcher});
  assert.equal(report.assetScreen.disposition,'NOT_ADMITTED');
  assert.equal(f.calls.some(x=>x.method==='HEAD'),false);
  assert.equal(report.assetScreen.receipts.length,0);
  assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
 }
});
test('CPV1-07 new DistilUSE source refuses absent fixed encoder or safe Dense payload instead of converting or loading pickle',async()=>{
 const {inspectPublicDistiluseCandidate}=await import('../experiments/public-embedding-provenance.mjs');
 for(const omitted of ['onnx/model_quint8_avx2.onnx','2_Dense/model.safetensors']){
  const f=distiluseSourceFixture({mutate:(b,m)=>{
   m.siblings=m.siblings.filter(x=>x.rfilename!==omitted);
   m.siblings.push({rfilename:'2_Dense/pytorch_model.bin'});
  }});
  const report=await inspectPublicDistiluseCandidate({fetcher:f.fetcher});
  assert.equal(report.assetScreen.disposition,'NOT_ADMITTED');
  assert.equal(report.assetScreen.reason,omitted.endsWith('.onnx')?
   'DECLARED_ENCODER_ASSET_UNAVAILABLE':'DECLARED_SAFE_PROJECTION_UNAVAILABLE');
  assert.equal(f.calls.some(x=>x.method==='HEAD'),false);
  assert.equal(f.calls.some(x=>x.url.includes('pytorch_model.bin')),false);
 }
});
test('CPV1-07 new DistilUSE artifact headers refuse missing ambiguous oversized or secret bearing provenance without following redirects or bodies',async()=>{
 const {inspectPublicDistiluseCandidate}=await import('../experiments/public-embedding-provenance.mjs');
 const headers=[
  {status:404,size:'1024',digest:'8'.repeat(64)},
  {status:200,size:null,digest:null},
  {status:302,size:'0',digest:'8'.repeat(64)},
  {status:302,size:'001024',digest:'8'.repeat(64)},
  {status:302,size:'1024 ',digest:'8'.repeat(64)},
  {status:302,size:'402653185',digest:'8'.repeat(64)},
  {status:302,size:'1024',digest:'8'.repeat(63)},
  {status:302,size:'1024',digest:'F'.repeat(64)},
  {status:302,size:'1024',digest:'PRIVATE_ASSET_CANARY'},
  {status:302,size:null,digest:'8'.repeat(64)},
 ];
 for(const item of headers){
  const f=distiluseSourceFixture({head:()=>({status:item.status,
   headers:{get:key=>key==='x-linked-size'?item.size:key==='x-linked-etag'?item.digest:null},
   text:async()=>{assert.fail('HEAD body forbidden');}})});
  const report=await inspectPublicDistiluseCandidate({fetcher:f.fetcher});
  assert.equal(report.assetScreen.reason,'ENCODER_HEADER_UNVERIFIED');
  assert.equal(report.assetScreen.disposition,'NOT_ADMITTED');
  assert.equal(f.calls.filter(x=>x.method==='HEAD').length,1);
  assert.equal(report.assetScreen.receipts[0].headerVerified,false);
  assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
 }
});
test('CPV1-07 new DistilUSE header budget includes encoder AND independent Dense projection',async()=>{
 const {inspectPublicDistiluseCandidate}=await import('../experiments/public-embedding-provenance.mjs');
 const f=distiluseSourceFixture({head:asset=>({status:302,headers:{get:key=>
  key==='x-linked-size'?String(asset.endsWith('.onnx')?384*1024*1024:1):
   key==='x-linked-etag'?'8'.repeat(64):null}})});
 const report=await inspectPublicDistiluseCandidate({fetcher:f.fetcher});
 assert.equal(report.assetScreen.reason,'DECLARED_COMBINED_ASSET_BUDGET_EXCEEDED');
 assert.equal(report.assetScreen.disposition,'NOT_ADMITTED');
 assert.equal(report.assetScreen.receipts.length,2);
 assert.equal(report.assetScreen.declaredCombinedBytes,undefined);
});
test('CPV1-07 new DistilUSE projection failure and header exceptions never promote partial encoder evidence',async()=>{
 const {inspectPublicDistiluseCandidate}=await import('../experiments/public-embedding-provenance.mjs');
 for(const fault of ['projection_missing','exception']){
  const f=distiluseSourceFixture({head:asset=>{
   if(asset.endsWith('.safetensors')){
    if(fault==='exception')throw Error('PRIVATE_NETWORK_CANARY');
    return {status:503,headers:{get:()=>null}};
   }
   return {status:302,headers:{get:key=>key==='x-linked-size'?'1024':key==='x-linked-etag'?'8'.repeat(64):null}};
  }});
  const report=await inspectPublicDistiluseCandidate({fetcher:f.fetcher});
  assert.equal(report.assetScreen.disposition,'NOT_ADMITTED');
  assert.equal(report.assetScreen.reason,fault==='exception'?'ASSET_HEADERS_UNAVAILABLE':'PROJECTION_HEADER_UNVERIFIED');
  assert.equal(f.calls.filter(x=>x.method==='HEAD').length,2);
  assert.equal(report.assetScreen.productionAdmission,false);
  assert.equal(JSON.stringify(report).includes('PRIVATE'),false);
 }
});
test('CPV1-07 new DistilUSE 200 direct header uses content length without reading tensor bytes',async()=>{
 const {inspectPublicDistiluseCandidate}=await import('../experiments/public-embedding-provenance.mjs');
 const f=distiluseSourceFixture({head:()=>({status:200,headers:{get:key=>
  key==='content-length'?'1024':key==='x-linked-etag'?'"'+'9'.repeat(64)+'"':null},
  text:async()=>assert.fail('no tensor body'),arrayBuffer:async()=>assert.fail('no tensor body')})});
 const report=await inspectPublicDistiluseCandidate({fetcher:f.fetcher});
 assert.equal(report.assetScreen.disposition,'DECLARED_HEADERS_PENDING_WEIGHT_INPUT_AND_QUALITY_REVIEW');
 assert.ok(report.assetScreen.receipts.every(x=>x.sha256==='9'.repeat(64)));
});


// Full 768x512 fixtures: no reduced projection or relaxed shape/budget oracle.
function distilPinnedSource(){
 const c=PUBLIC_DISTILUSE_EMBEDDING;
 return {repository:c.id,revision:c.revision,diagnosis:'CONSISTENT_DECLARED_SOURCE_PENDING_INPUT_AND_QUALITY',
  weightsDownloaded:false,inferenceExecuted:false,productionClaim:false,modelAdmission:'NOT_AUTHORIZED',
  currentLicense:{card:{permitted:true,declaration:'apache-2.0'}},
  pinnedLicense:{card:{permitted:true,declaration:'apache-2.0'}},
  readme:{sha256:c.readme,license:{permitted:true,declaration:'apache-2.0'}},
  configurationFiles:[['config.json',c.config],['tokenizer_config.json',c.tokenizer],
   ['modules.json',c.modules],['sentence_bert_config.json',c.sentence],
   ['1_Pooling/config.json',c.pooling],['2_Dense/config.json',c.projectionConfig]]
    .map(([file,sha256])=>({file,sha256,httpStatus:200,bounded:true})),
  moduleOrder:['Transformer','Pooling','Dense'],normalizationDeclared:false,
  inputContract:{architecture:'DistilBertModel',hiddenDimension:768,layers:6,positionLimit:512,
   sentenceTransformerLimit:128,tokenizerClass:'OTHER_OR_UNVERIFIED',tokenizerDeclaredLimit:null,
   remoteCodeDeclarationPresent:false},
  pooling:{dimension:768,modes:{pooling_mode_mean_tokens:true,pooling_mode_cls_token:false,
   pooling_mode_max_tokens:false,pooling_mode_mean_sqrt_len_tokens:false,
   pooling_mode_weightedmean_tokens:null,pooling_mode_lasttoken:null}},
  projection:{inputDimension:768,outputDimension:512,bias:true,activation:'torch.nn.modules.activation.Tanh'},
  inventory:{onnxFiles:[c.asset],safeProjectionFiles:[c.projectionAsset]}};
}
import {createHash as projectionTestHash} from 'node:crypto';
import {PUBLIC_DISTILUSE_EMBEDDING,preparePublicDistiluseContract,admitPublicDistiluseTokenInputs,
 observePublicDistiluseAssets,decodePublicDistiluseProjection,poolPublicDistiluseDense}
 from '../experiments/public-embedding-inputs.mjs';
const projectionDigest=bytes=>projectionTestHash('sha256').update(bytes).digest('hex');
function projectionFixture({headerChange,headerText,payloadChange}={}){
 const biasBytes=512*4,weightBytes=512*768*4;
 const header={'linear.bias':{dtype:'F32',shape:[512],data_offsets:[0,biasBytes]},
  'linear.weight':{dtype:'F32',shape:[512,768],data_offsets:[biasBytes,biasBytes+weightBytes]},
  __metadata__:{format:'pt'}};
 if(headerChange)headerChange(header);
 const text=headerText??JSON.stringify(header),size=Math.ceil(new TextEncoder().encode(text).length/8)*8;
 const bytes=new Uint8Array(8+size+biasBytes+weightBytes),view=new DataView(bytes.buffer);
 view.setBigUint64(0,BigInt(size),true);
 bytes.set(new TextEncoder().encode(text.padEnd(size,' ')),8);
 // Independent sparse affine oracle spanning both first and last input/output:
 // z0 = 2*x0 + 3*x1 + .25; z1 = -x0 - .5;
 // z511 = 4*x767; all other outputs zero.
 const start=8+size;
 view.setFloat32(start,.25,true);view.setFloat32(start+4,-.5,true);
 view.setFloat32(start+biasBytes,2,true);view.setFloat32(start+biasBytes+4,3,true);
 view.setFloat32(start+biasBytes+768*4,-1,true);
 view.setFloat32(start+biasBytes+(511*768+767)*4,4,true);
 if(payloadChange)payloadChange(bytes,view,start);
 const receipt={asset:PUBLIC_DISTILUSE_EMBEDDING.projectionAsset,
  pinnedRevision:PUBLIC_DISTILUSE_EMBEDDING.revision,bytes:bytes.length,sha256:projectionDigest(bytes),
  productionAdmission:false};
 return {bytes,receipt,header,start};
}
function distilTokens(count=3){
 return {input_ids:{type:'int64',dims:[1,count],data:new BigInt64Array(count).fill(7n)},
  attention_mask:{type:'int64',dims:[1,count],data:new BigInt64Array(count).fill(1n)}};
}
class DistilBertTokenizer {}
test('CPV1-07 DistilUSE preparation binds every actual pinned config but does not claim missing tokenizer execution',()=>{
 const contract=preparePublicDistiluseContract(distilPinnedSource());
 assert.equal(contract.inputExecutionRequired,true);assert.equal(contract.productionAdmission,false);
 assert.equal(contract.tokenizerClass,'DistilBertTokenizer');assert.equal(contract.maximumTokens,128);
 assert.equal(contract.encoderDimension,768);assert.equal(contract.dimension,512);
 assert.equal(Object.isFrozen(contract),true);
 for(const change of [
  x=>x.revision='f'.repeat(40),x=>x.readme.sha256='f'.repeat(64),
  x=>x.currentLicense.card.declaration='mit',x=>x.pinnedLicense.card.permitted=false,
  x=>x.weightsDownloaded=true,x=>x.inferenceExecuted=true,x=>x.productionClaim=true,
  x=>x.modelAdmission='AUTHORIZED',x=>x.configurationFiles.pop(),
  x=>x.configurationFiles.push({...x.configurationFiles[0]}),
  ...Array.from({length:6},(_,i)=>x=>x.configurationFiles[i].sha256='f'.repeat(64)),
  x=>x.moduleOrder.reverse(),x=>x.normalizationDeclared=true,
  x=>x.inputContract.remoteCodeDeclarationPresent=true,x=>x.inputContract.tokenizerClass='BertTokenizer',
  x=>x.inputContract.tokenizerDeclaredLimit=64,x=>x.inputContract.sentenceTransformerLimit=129,
  x=>x.inputContract.hiddenDimension=512,x=>x.inputContract.positionLimit=1024,
  x=>x.inputContract.layers=12,x=>x.pooling.modes.pooling_mode_cls_token=true,
  x=>x.projection.activation='torch.nn.Identity',x=>x.projection.bias=false,
  x=>x.projection.outputDimension=768,x=>x.inventory.safeProjectionFiles=[],
  x=>x.inventory.onnxFiles=[]
 ]){
  const source=distilPinnedSource();change(source);
  assert.throws(()=>preparePublicDistiluseContract(source),/official_embedding_contract_unverified/);
 }
});
test('CPV1-07 DistilUSE actual tensors require explicit tokenizer and exact graph with full bounded single sequence',()=>{
 const contract=preparePublicDistiluseContract(distilPinnedSource()),tokens=distilTokens();
 const input=admitPublicDistiluseTokenInputs(['input_ids','attention_mask'],tokens,contract,new DistilBertTokenizer());
 assert.deepEqual(input.input_ids.dims,[1,3]);tokens.input_ids.data[0]=99n;
 assert.equal(input.input_ids.data[0],7n,'detached full actual tensor');
 for(const change of [
  {names:['input_ids','attention_mask','token_type_ids']},{names:['input_ids','input_ids']},
  {names:['input_ids']},{tokenizer:{constructor:{name:'PreTrainedTokenizer'}}},
  {contract:{...contract}},{tokens:distilTokens(129)},
  {tokens:{...distilTokens(),attention_mask:{type:'int64',dims:[1,3],data:new BigInt64Array([1n,2n,1n])}}},
  {tokens:{...distilTokens(),input_ids:{type:'int64',dims:[1,3],data:new BigInt64Array([1n,-1n,1n])}}}
 ]){
  assert.throws(()=>admitPublicDistiluseTokenInputs(change.names??['input_ids','attention_mask'],
   change.tokens??distilTokens(),change.contract??contract,change.tokenizer??new DistilBertTokenizer()));
 }
 assert.equal(admitPublicDistiluseTokenInputs(['attention_mask','input_ids'],distilTokens(128),contract,
  new DistilBertTokenizer()).input_ids.data.length,128);
});
test('CPV1-07 DistilUSE two HEAD receipts remain exact revision, no body and unchanged combined budget',async()=>{
 const calls=[];
 const result=await observePublicDistiluseAssets({fetcher:async(url,options)=>{
  calls.push(url);assert.equal(options.method,'HEAD');assert.equal(options.redirect,'manual');
  assert.equal(Object.hasOwn(options.headers,'Authorization'),false);
  const dense=url.endsWith('/2_Dense/model.safetensors');
  return {status:302,headers:{get:name=>name==='x-linked-size'?(dense?'1575104':'135000000'):
   name==='x-linked-etag'?'"'+'a'.repeat(64)+'"':null},text:async()=>assert.fail('no response body')};
 }});
 assert.equal(calls.length,2);assert.equal(result.length,2);
 for(const [i,r] of result.entries()){
  assert.equal(calls[i],'https://huggingface.co/'+PUBLIC_DISTILUSE_EMBEDDING.id+'/resolve/'+
   PUBLIC_DISTILUSE_EMBEDDING.revision+'/'+r.asset);
  assert.equal(r.productionAdmission,false);assert.equal(r.bodyRequested,false);
 }
 for(const fault of ['redirect','missing_digest','zero','decimal','projection_overflow','combined','private_error']){
  let n=0;
  await assert.rejects(observePublicDistiluseAssets({fetcher:async()=>{
   n++;if(fault==='private_error')throw Error('PRIVATE_FETCH');
   return {status:fault==='redirect'?301:302,headers:{get:name=>
    name==='x-linked-etag'?(fault==='missing_digest'?null:'a'.repeat(64)):
    name==='x-linked-size'?(fault==='zero'?'0':fault==='decimal'?'1.5':
     fault==='projection_overflow'&&n===2?'2097153':fault==='combined'&&n===1?'402653184':'1575104'):null}};
  }}));
  assert.ok(n<=2);
 }
});
test('CPV1-07 complete safe Dense payload implements affine then Tanh with no input normalization or transpose',()=>{
 const contract=preparePublicDistiluseContract(distilPinnedSource()),f=projectionFixture();
 const projection=decodePublicDistiluseProjection(f.bytes,f.receipt,contract),mean=new Float64Array(768);
 mean[0]=1;mean[1]=2;mean[767]=-.5;
 const actual=projection.project(mean);
 assert.ok(Math.abs(actual[0]-Math.tanh(8.25))<1e-7);
 assert.ok(Math.abs(actual[1]-Math.tanh(-1.5))<1e-7);
 assert.ok(Math.abs(actual[511]-Math.tanh(-2))<1e-7);
 assert.equal(actual.slice(2,511).every(x=>x===0),true);
 f.bytes.fill(0);assert.deepEqual(projection.project(mean),actual,'admitted private copy');
 assert.equal(projection.productionAdmission,false);assert.equal(projection.weightsPrivateToProjection,true);
});
test('CPV1-07 safe Dense refuses wrong digest, revision, payload size, caller alias and arbitrary contracts',()=>{
 const contract=preparePublicDistiluseContract(distilPinnedSource()),f=projectionFixture();
 for(const [bytes,receipt,c] of [
  [f.bytes,{...f.receipt,sha256:'f'.repeat(64)},contract],
  [f.bytes,{...f.receipt,pinnedRevision:'f'.repeat(40)},contract],
  [f.bytes,{...f.receipt,asset:'2_Dense/pytorch_model.bin'},contract],
  [f.bytes,{...f.receipt,bytes:f.bytes.length+1},contract],
  [f.bytes,{...f.receipt,productionAdmission:true},contract],
  [f.bytes,f.receipt,{...contract}],
  [new Uint8Array(2097153),{...f.receipt,bytes:2097153},contract],
  [f.bytes.subarray(0,f.bytes.length-1),f.receipt,contract]
 ])assert.throws(()=>decodePublicDistiluseProjection(bytes,receipt,c));
});
test('CPV1-07 safe Dense refuses malformed duplicate or unsupported tensor declarations and all gap/overlap/trailing payloads',()=>{
 const contract=preparePublicDistiluseContract(distilPinnedSource());
 const faults=[
  {headerChange:h=>h['linear.weight'].dtype='BF16'},
  {headerChange:h=>h['linear.weight'].shape=[768,512]},
  {headerChange:h=>h['linear.weight'].shape=[512,767]},
  {headerChange:h=>delete h['linear.bias']},
  {headerChange:h=>h['linear.weight'].code='PRIVATE_REMOTE_CODE'},
  {headerChange:h=>h['other.weight']={dtype:'F32',shape:[1],data_offsets:[0,4]}},
  {headerChange:h=>h.__metadata__.private={x:'PRIVATE_META'}},
  {headerChange:h=>h['linear.bias'].data_offsets=[4,2052]},
  {headerChange:h=>h['linear.bias'].data_offsets=[2048,4096]},
  {headerChange:h=>h['linear.weight'].data_offsets=[2052,2052+512*768*4]},
  {headerChange:h=>h['linear.weight'].data_offsets=[2048,2048+512*768*4-4]},
  {headerChange:h=>h['linear.weight'].data_offsets=[2049,2049+512*768*4]},
  {headerChange:h=>h['linear.bias'].data_offsets=[0,Infinity]},
  {headerText:'{"linear.bias":{},"linear.bias":{},"linear.weight":{}}'},
  {headerText:'{"linear.bias":{"dtype":"F32","dtype":"F32"},"linear.weight":{}}'},
  {headerText:'{"__metadata__":{"format":"pt","format":"pt"},"linear.bias":{},"linear.weight":{}}'},
  {headerText:'{"PRIVATE_INVALID":}'},
  {payloadChange:(_b,v)=>v.setBigUint64(0,16385n,true)},
  {payloadChange:(_b,v)=>v.setBigUint64(0,2n**63n,true)},
  {payloadChange:(b)=>b[8]=0xff},
  {payloadChange:(_b,v,start)=>v.setFloat32(start,NaN,true)},
  {payloadChange:(_b,v,start)=>v.setFloat32(start+2048,Infinity,true)}
 ];
 for(const change of faults){
  const f=projectionFixture(change);
  assert.throws(()=>decodePublicDistiluseProjection(f.bytes,f.receipt,contract));
 }
 const f=projectionFixture(),extra=new Uint8Array(f.bytes.length+4);extra.set(f.bytes);
 assert.throws(()=>decodePublicDistiluseProjection(extra,{...f.receipt,bytes:extra.length,sha256:projectionDigest(extra)},contract));
});
test('CPV1-07 complete mean Dense chain masks padding, retains mean magnitude before bias and normalizes only final512',()=>{
 const contract=preparePublicDistiluseContract(distilPinnedSource()),f=projectionFixture();
 const projection=decodePublicDistiluseProjection(f.bytes,f.receipt,contract);
 const data=new Float32Array(3*768);data[0]=2;data[1]=4;data[767]=-1;
 data[768]=0;data[769]=0;data[1535]=0;data.fill(9000,1536);
 const output={type:'float32',dims:[1,3,768],data},mask={type:'int64',dims:[1,3],data:new BigInt64Array([1n,1n,0n])};
 const result=poolPublicDistiluseDense(output,mask,contract,projection);
 const raw=[Math.fround(Math.tanh(8.25)),Math.fround(Math.tanh(-1.5)),Math.fround(Math.tanh(-2))];
 const norm=Math.hypot(...raw);
 for(const [i,value] of [[0,raw[0]],[1,raw[1]],[511,raw[2]]])assert.ok(Math.abs(result[i]-value/norm)<1e-7);
 assert.equal(result.length,512);assert.ok(Math.abs(Math.hypot(...result)-1)<1e-7);
 assert.equal(result.slice(2,511).every(x=>x===0),true);
 for(const [o,m,c,p] of [
  [{...output,dims:[1,3,512]},mask,contract,projection],
  [{...output,type:'float64'},mask,contract,projection],
  [output,{...mask,data:new BigInt64Array([0n,0n,0n])},contract,projection],
  [output,{...mask,data:new BigInt64Array([1n,1n,2n])},contract,projection],
  [output,{...mask,dims:[3,1]},contract,projection],
  [output,mask,{...contract},projection],
  [output,mask,contract,{...projection}],
  [{type:'float32',dims:[1,129,768],data:new Float32Array(129*768)},
   {type:'int64',dims:[1,129],data:new BigInt64Array(129).fill(1n)},contract,projection]
 ])assert.throws(()=>poolPublicDistiluseDense(o,m,c,p));
 data[1536]=NaN;assert.throws(()=>poolPublicDistiluseDense(output,mask,contract,projection),'nonfinite masked data refused too');
});


test('CPV1-07 DistilUSE projected vectors satisfy existing lab index without changing its unit-vector boundary',async()=>{
 const {buildSemanticLabIndex}=await import('../experiments/semantic-lab-index.mjs');
 const c=preparePublicDistiluseContract(distilPinnedSource()),f=projectionFixture();
 const p=decodePublicDistiluseProjection(f.bytes,f.receipt,c);
 const output={type:'float32',dims:[1,1,768],data:new Float32Array(768)};
 output.data[0]=1;output.data[1]=2;output.data[767]=-.5;
 const mask={type:'int64',dims:[1,1],data:new BigInt64Array([1n])};
 const vector=poolPublicDistiluseDense(output,mask,c,p);
 assert.equal(Array.isArray(vector),true);assert.equal(Object.isFrozen(vector),true);
 const record={id:'projection',title:'public',body:'synthetic',source:'chatgpt',time:null,excluded:false};
 const index=await buildSemanticLabIndex([record],async()=>vector,{dimension:512,minimumScore:.7});
 const result=await index.retrieve([record],'public synthetic');
 assert.deepEqual(result,['projection']);assert.equal(index.float32ProjectionBytes,2048);
});
