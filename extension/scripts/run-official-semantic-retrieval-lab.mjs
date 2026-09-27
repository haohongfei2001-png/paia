// One pinned OFFICIAL licensed source, fixed PUBLIC synthetic CPU probe. Not a product model choice.
// Model downloads are public artifacts; applicant/archive data are never loaded.
import {createHash} from 'node:crypto';
import {readFile,readdir,stat,mkdir} from 'node:fs/promises';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {retrievalCorpus} from '../tests/fixtures/cpv1-07-retrieval-corpus.mjs';
import {validateRetrievalCorpus,productionLexicalCandidate,buildCharacterIndex,evaluateRetrieval}
  from '../experiments/retrieval-evaluation.mjs';
import {buildSemanticLabIndex} from '../experiments/semantic-lab-index.mjs';
import {inspectBoundedPublicModel,METADATA_FIELDS} from '../experiments/public-model-provenance.mjs';
import {meanPoolOfficialDense,officialProjectionObservation,admitOfficialTokenInputs} from '../experiments/official-minilm-pooling.mjs';

const MODEL='sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';
const UPSTREAM=MODEL; // Assets are owned by the same declared official repository.
const MODEL_REVISION='e8f8c211226b894fcb81acc59f3b34ba3efd5f42';
const README_SHA256='1e98ea05b0de579fcaad3d625b62ea55647142ed674d5f5ebf1440e4bbbb6f23';
const METHOD='official-multilingual-minilm-onnx-lab-v1';
const PACKAGE_VERSION='3.8.1';
const DIMENSION=384;
const MINIMUM_SCORE=.7; // Freeze before the first model result; never tune gold.
const MAX_MODEL_BYTES=384*1024*1024;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const validSha=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
let stage='lab_environment';
let extractor;
let failureReason='semantic_probe_unavailable';
const publicObservations=[];
const REASONS=new Set(['semantic_probe_unavailable','invalid_lab_environment',
  'lab_package_unverified','onnx_dependency_unverified','nonempty_public_cache',
  'public_model_http_unavailable','public_model_metadata_invalid',
  'public_model_identity_unverified','public_model_license_unverified',
  'quantized_asset_unavailable','official_tokenization_unavailable',
  'official_input_contract_unverified','official_onnx_inference_unavailable',
  'official_dense_pooling_unverified']);
function refuse(reason='semantic_probe_unavailable'){
  failureReason=REASONS.has(reason)?reason:'semantic_probe_unavailable';
  throw new Error('semantic_probe_unavailable');
}
async function publicAssets(root,directory=root) {
  const result=[];
  for(const entry of await readdir(directory,{withFileTypes:true})) {
    const path=join(directory,entry.name);
    if(entry.isSymbolicLink())refuse();
    if(entry.isDirectory())result.push(...await publicAssets(root,path));
    else if(entry.isFile()) {
      const info=await stat(path);
      if(info.size>MAX_MODEL_BYTES)refuse();
      const bytes=await readFile(path);
      result.push({asset:relative(root,path).split('\\').join('/'),
        bytes:bytes.length,sha256:hash(bytes)});
    }else refuse();
  }
  return result.sort((a,b)=>a.asset.localeCompare(b.asset));
}

try {
  validateRetrievalCorpus(retrievalCorpus);
  const labValue=process.env.PAIA_SEMANTIC_LAB_ROOT;
  const cacheValue=process.env.PAIA_PUBLIC_MODEL_CACHE;
  if(!labValue||!cacheValue||!isAbsolute(labValue)||!isAbsolute(cacheValue))refuse('invalid_lab_environment');
  const lab=resolve(labValue),cache=resolve(cacheValue);
  if(lab===cache)refuse('invalid_lab_environment');
  // Never supply an account token to public model downloads.
  process.env.HF_TOKEN='';process.env.HF_ACCESS_TOKEN='';
  const packageInfo=JSON.parse(await readFile(join(lab,'node_modules/@huggingface/transformers/package.json'),'utf8'));
  if(packageInfo.name!=='@huggingface/transformers'||packageInfo.version!==PACKAGE_VERSION)refuse('lab_package_unverified');
  const lock=await readFile(join(lab,'package-lock.json'));
  const locked=JSON.parse(lock);
  const ortLock=locked.packages?.['node_modules/onnxruntime-node'];
  if(ortLock?.version!=='1.21.0'||typeof ortLock.integrity!=='string')refuse('onnx_dependency_unverified');
  await mkdir(cache,{recursive:true});
  // Start with an empty per-head public cache; no ambient/private model state.
  if((await readdir(cache)).length)refuse('nonempty_public_cache');
  stage='public_model_provenance';
  const provenance=await inspectBoundedPublicModel(MODEL);
  if(provenance.revision!==MODEL_REVISION
      ||provenance.diagnosis!=='CONSISTENT_LITERAL_DECLARATIONS'
      ||provenance.currentMetadata?.observation?.cardLicense?.declaration!=='apache-2.0'
      ||provenance.pinnedMetadata?.observation?.cardLicense?.declaration!=='apache-2.0'
      ||provenance.readme?.sha256!==README_SHA256)refuse('public_model_license_unverified');
  publicObservations.push({repository:MODEL,exactRevision:provenance.revision===MODEL_REVISION,
    consistentDeclaredLicense:provenance.diagnosis==='CONSISTENT_LITERAL_DECLARATIONS',
    readmeReferenceMatches:provenance.readme?.sha256===README_SHA256});
  stage='official_quantized_asset_admission';
  const metadataUrl=new URL('https://huggingface.co/api/models/'+MODEL+'/revision/'+MODEL_REVISION);
  for(const field of METADATA_FIELDS)metadataUrl.searchParams.append('expand',field);
  const inventoryResponse=await fetch(metadataUrl,{redirect:'manual',signal:AbortSignal.timeout(20000)});
  if(inventoryResponse.status!==200)refuse('public_model_http_unavailable');
  const inventoryText=await inventoryResponse.text();
  if(Buffer.byteLength(inventoryText)>1024*1024)refuse('public_model_metadata_invalid');
  const inventory=JSON.parse(inventoryText);
  if(inventory.id!==MODEL||inventory.sha!==MODEL_REVISION||inventory.private!==false
      ||inventory.gated!==false||inventory.cardData?.license!=='apache-2.0')
    refuse('public_model_identity_unverified');
  const files=Array.isArray(inventory.siblings)?inventory.siblings.map(item=>item.rfilename):[];
  const quantizedFile=['onnx/model_qint8_avx2.onnx','onnx/model_quint8_avx2.onnx',
    'onnx/model_qint8_avx512_vnni.onnx','onnx/model_quint8_avx512_vnni.onnx',
    'onnx/model_qint8_avx512.onnx','onnx/model_qint8_arm64.onnx'].find(file=>files.includes(file));
  publicObservations.push({repository:MODEL,quantizedFile:quantizedFile??null,
    poolingConfigListed:files.includes('1_Pooling/config.json')});
  if(!quantizedFile||!files.includes('1_Pooling/config.json'))refuse('quantized_asset_unavailable');
  stage='official_pooling_contract';
  const poolingResponse=await fetch('https://huggingface.co/'+MODEL+'/raw/'+MODEL_REVISION+
    '/1_Pooling/config.json',{redirect:'manual',signal:AbortSignal.timeout(20000)});
  if(poolingResponse.status!==200)refuse('public_model_metadata_invalid');
  const poolingText=await poolingResponse.text();
  if(Buffer.byteLength(poolingText)>64*1024)refuse('public_model_metadata_invalid');
  const pooling=JSON.parse(poolingText);
  if(pooling.word_embedding_dimension!==DIMENSION||pooling.pooling_mode_mean_tokens!==true
      ||['pooling_mode_cls_token','pooling_mode_max_tokens','pooling_mode_mean_sqrt_len_tokens',
        'pooling_mode_weightedmean_tokens','pooling_mode_lasttoken'].some(key=>pooling[key]===true))
    refuse('public_model_metadata_invalid');
  const model={revision:MODEL_REVISION,license:'apache-2.0',files},upstream=model;
  stage='model_load';
  const {AutoTokenizer,env}=await import(pathToFileURL(join(lab,'node_modules/@huggingface/transformers/dist/transformers.node.mjs')).href);
  const {env:hubEnv}=await import(pathToFileURL(join(lab,'node_modules/@huggingface/transformers/src/env.js')).href);
  const {getModelFile}=await import(pathToFileURL(join(lab,'node_modules/@huggingface/transformers/src/utils/hub.js')).href);
  const ortNamespace=await import(pathToFileURL(join(lab,'node_modules/onnxruntime-node/dist/index.js')).href);
  const ort=ortNamespace.default??ortNamespace;
  // The packaged dist tokenizer and source hub helper have distinct env objects.
  // Configure BOTH; neither may consult ambient local models or custom caches.
  for(const settings of [env,hubEnv]){
    settings.allowLocalModels=false;settings.allowRemoteModels=true;
    settings.useFSCache=true;settings.cacheDir=cache;settings.useBrowserCache=false;
    settings.useCustomCache=false;settings.localModelPath=cache+'/';
  }
  const loadStarted=performance.now();
  let tokenizer=await AutoTokenizer.from_pretrained(MODEL,{revision:MODEL_REVISION,cache_dir:cache});
  let modelPath=await getModelFile(MODEL,quantizedFile,true,
    {revision:MODEL_REVISION,cache_dir:cache},true);
  if(typeof modelPath!=='string'||!resolve(modelPath).startsWith(cache+'/'))refuse();
  const beforeLoadAssets=await publicAssets(cache);
  if(beforeLoadAssets.reduce((sum,item)=>sum+item.bytes,0)>MAX_MODEL_BYTES)refuse();
  extractor=await ort.InferenceSession.create(modelPath,{executionProviders:['cpu'],logSeverityLevel:4,logVerbosityLevel:0});
  const modelLoadMs=performance.now()-loadStarted;
  for(const settings of [env,hubEnv]){
    settings.allowRemoteModels=false;settings.allowLocalModels=true;settings.localModelPath=cache+'/';
  }
  await extractor.release();
  extractor=null;
  const reloadStarted=performance.now();
  tokenizer=await AutoTokenizer.from_pretrained(MODEL,
    {revision:MODEL_REVISION,cache_dir:cache,local_files_only:true});
  modelPath=await getModelFile(MODEL,quantizedFile,true,
    {revision:MODEL_REVISION,cache_dir:cache,local_files_only:true},true);
  if(typeof modelPath!=='string'||!resolve(modelPath).startsWith(cache+'/'))refuse();
  extractor=await ort.InferenceSession.create(modelPath,{executionProviders:['cpu'],logSeverityLevel:4,logVerbosityLevel:0});
  const offlineReloadMs=performance.now()-reloadStarted;
  if(!extractor.inputNames.length
      ||extractor.inputNames.some(name=>!['input_ids','attention_mask','token_type_ids'].includes(name))
      ||!extractor.inputNames.includes('input_ids')||!extractor.inputNames.includes('attention_mask'))
    refuse();
  const observedBoundaries=new Set();
  const encode=async text=>{
    // Shared lab framing is not part of this official model's input contract.
    if(!text.startsWith('query: ')&&!text.startsWith('passage: '))refuse();
    const boundary=text.startsWith('query: ')?'query':'document';
    const plain=text.slice(boundary==='query'?7:9);
    stage='fixed_'+boundary+'_tokenization';
    failureReason='official_tokenization_unavailable';
    // transformers.js3.8.1 explicitly supports this option; request the
    // tokenizer's real single-sequence segment tensor when the graph needs it.
    const tokens=await tokenizer(plain,{padding:true,truncation:false,
      return_token_type_ids:extractor.inputNames.includes('token_type_ids')});
    stage='fixed_'+boundary+'_input_contract';
    failureReason='official_input_contract_unverified';
    if(!observedBoundaries.has(boundary+'_inputs')){
      publicObservations.push({boundary:boundary+'_inputs',
        contract:officialProjectionObservation(extractor.inputNames,tokens)});
      observedBoundaries.add(boundary+'_inputs');
    }
    const admitted=admitOfficialTokenInputs(extractor.inputNames,tokens);
    const feeds={};
    for(const [name,tensor] of Object.entries(admitted)){
      feeds[name]=new ort.Tensor('int64',tensor.data,tensor.dims);
    }
    stage='fixed_'+boundary+'_onnx_inference';
    failureReason='official_onnx_inference_unavailable';
    const outputs=await extractor.run(feeds);
    const dense=outputs.last_hidden_state??outputs.token_embeddings;
    stage='fixed_'+boundary+'_dense_pooling';
    failureReason='official_dense_pooling_unverified';
    if(!observedBoundaries.has(boundary+'_dense')){
      publicObservations.push({boundary:boundary+'_dense',
        contract:officialProjectionObservation(extractor.inputNames,tokens,dense)});
      observedBoundaries.add(boundary+'_dense');
    }
    return meanPoolOfficialDense(dense,tokens.attention_mask,DIMENSION);
  };
  stage='fixed_document_projection';
  const eligible=retrievalCorpus.records.filter(record=>!record.excluded);
  const projectionStarted=performance.now();
  const semantic=await buildSemanticLabIndex(eligible,encode,
    {dimension:DIMENSION,minimumScore:MINIMUM_SCORE});
  const semanticBuildMs=performance.now()-projectionStarted;
  const lexicalStarted=performance.now();
  const character=buildCharacterIndex(eligible);
  const characterBuildMs=performance.now()-lexicalStarted;
  stage='fixed_quality_comparison';failureReason='semantic_probe_unavailable';
  const reports=[
    await evaluateRetrieval(retrievalCorpus,productionLexicalCandidate,{method:'lexical-production-v1'}),
    await evaluateRetrieval(retrievalCorpus,(scope,query)=>character.retrieve(scope,query),
      {method:'character-tfidf-lab-v1'}),
    await evaluateRetrieval(retrievalCorpus,(scope,query)=>semantic.retrieve(scope,query),
      {method:METHOD}),
  ];
  stage='public_artifact_readback';failureReason='semantic_probe_unavailable';
  const assets=await publicAssets(cache);
  const modelArtifactBytes=assets.reduce((sum,item)=>sum+item.bytes,0);
  if(!assets.some(item=>item.asset.endsWith('/'+quantizedFile))
      ||modelArtifactBytes>MAX_MODEL_BYTES||reports.some(report=>report.contractFailures))refuse();
  const memory=process.memoryUsage();
  console.log(JSON.stringify({schemaVersion:1,status:'MEASURED_LAB_ONLY',scope:'public_synthetic_only',
    productionClaim:false,semanticProductionCapabilityEstablished:false,productionIndexEnabled:false,
    chromeCompatibility:'NOT_VERIFIED',longLibraryPerformance:'NOT_VERIFIED',
    currentBeliefJudgment:false,privateCorpusUsed:false,providerApiCalls:0,providerApiCost:0,
    qualityGate:'NOT_PRODUCTION_CERTIFICATION',
    corpusDigest:reports[0].corpusDigest,
    model:{id:MODEL,revision:model.revision,license:model.license,
      upstream:{id:UPSTREAM,revision:upstream.revision,license:upstream.license},
      task:'feature-extraction',dtype:'q8',device:'cpu',pooling:'mean',normalize:true,
      queryPrefix:'',passagePrefix:'',dimension:DIMENSION,
      singleSequenceTokenTypes:'RETURNED_BY_PINNED_TOKENIZER_WHEN_REQUIRED',
      fabricatedTokenInputs:false,
      declaredSourceProvenance:provenance,quantizedFile,poolingConfigSha256:hash(poolingText),
      minimumCosineScore:MINIMUM_SCORE,thresholdCalibrated:false,
      modelArtifactBytes,modelLoadMs,offlineReloadMs,assets,
      onnxConversionEquivalence:'NOT_VERIFIED'},
    dependency:{package:'@huggingface/transformers',version:PACKAGE_VERSION,
      onnxruntimeNodeVersion:ortLock.version,lockSha256:hash(lock),
      lockStatus:'RESOLVED_FIRST_LAB_PROBE_NOT_PRODUCTION_LOCK'},
    projection:{projectedRecords:semantic.projectedRecords,
      semanticBuildMs,float32ProjectionBytes:semantic.float32ProjectionBytes,
      serializedProjectionBytes:semantic.serializedProjectionBytes,
      characterBuildMs,characterProjectionBytes:character.serializedProjectionBytes},
    memory:{nodeRssBytes:memory.rss,nodeHeapUsedBytes:memory.heapUsed,
      scope:'node_process_after_fixed_probe_not_chrome_peak'},
    reports}));
} catch(error) {
  const errorClass=['AbortError','TimeoutError','SyntaxError','TypeError','Error'].includes(error?.name)
    ?error.name:'Other';
  console.log(JSON.stringify({schemaVersion:1,status:'UNAVAILABLE',stage,
    reason:failureReason,errorClass,publicObservations,scope:'public_synthetic_only',productionClaim:false,
    qualityGate:'NOT_EVALUATED',chromeCompatibility:'NOT_VERIFIED',privateCorpusUsed:false}));
  process.exitCode=1;
} finally {
  if(extractor)try {await extractor.release();}catch {process.stderr.write('semantic lab cleanup unavailable\n');process.exitCode=1;}
}
