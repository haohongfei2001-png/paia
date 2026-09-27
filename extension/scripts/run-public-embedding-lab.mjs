// Pinned official DistilUSE mean + Dense/Tanh; bounded fixed public root-cause lab only.
// Model downloads are public artifacts; applicant/archive data are never loaded.
import {createHash} from 'node:crypto';
import {readFile,readdir,stat,mkdir} from 'node:fs/promises';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {retrievalCorpus} from '../tests/fixtures/cpv1-07-retrieval-corpus.mjs';
import {diagnoseCachedFixedRanks} from '../experiments/retrieval-rank-diagnostics.mjs';
import {validateRetrievalCorpus,productionLexicalCandidate,buildCharacterIndex,evaluateRetrieval,validateRetrievalMethod}
  from '../experiments/retrieval-evaluation.mjs';
import {buildSemanticLabIndex,fuseScopedLabRanks,HYBRID_RANK_RULE} from '../experiments/semantic-lab-index.mjs';
import {calibrationCorpus} from '../tests/fixtures/cpv1-07-calibration-corpus.mjs';
import {validateCalibrationCorpus,calibrateDevelopmentThreshold,rankCalibrationScores} from '../experiments/semantic-calibration.mjs';
import {inspectPublicEmbeddingSource} from '../experiments/public-embedding-provenance.mjs';
import {PUBLIC_DISTILUSE_EMBEDDING,preparePublicDistiluseContract,observePublicDistiluseAssets,
  admitPublicDistiluseTokenInputs,decodePublicDistiluseProjection,poolPublicDistiluseDense}
  from '../experiments/public-embedding-inputs.mjs';

const MODEL=PUBLIC_DISTILUSE_EMBEDDING.id;
const UPSTREAM=MODEL; // Assets are owned by the same declared official repository.
const MODEL_REVISION=PUBLIC_DISTILUSE_EMBEDDING.revision;
const README_SHA256=PUBLIC_DISTILUSE_EMBEDDING.readme;
const METHOD='official-distiluse-dense-tanh-onnx-lab-v1';
const HYBRID_METHOD='official-distiluse-hybrid-rrf-lab-v1';
const PACKAGE_VERSION='3.8.1';
const DIMENSION=PUBLIC_DISTILUSE_EMBEDDING.dimension;
const MINIMUM_SCORE=.7; // Freeze before the first model result; never tune gold.
const MAX_MODEL_BYTES=PUBLIC_DISTILUSE_EMBEDDING.maximumArtifactBytes;
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
  'lab_method_unregistered','official_dense_pooling_unverified','official_asset_budget_unverified','official_asset_digest_unverified']);
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
  stage='fixed_method_contract';failureReason='lab_method_unregistered';
  validateRetrievalMethod(METHOD);validateRetrievalMethod(HYBRID_METHOD);
  stage='lab_environment';failureReason='semantic_probe_unavailable';
  validateRetrievalCorpus(retrievalCorpus);
  validateCalibrationCorpus(calibrationCorpus,retrievalCorpus);
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
  const provenance=await inspectPublicEmbeddingSource(MODEL);
  stage='official_sentence_input_contract';failureReason='official_input_contract_unverified';
  const inputContract=preparePublicDistiluseContract(provenance);
  publicObservations.push({repository:MODEL,exactRevision:provenance.revision===MODEL_REVISION,
    consistentDeclaredLicense:true,readmeReferenceMatches:provenance.readme?.sha256===README_SHA256,
    sentenceTransformerLimit:inputContract.maximumTokens,dimension:DIMENSION,
    rawLabSingleSequence:true,sourceDefaultsAndConversion:'NOT_INDEPENDENTLY_VERIFIED'});
  stage='official_asset_budget';failureReason='official_asset_budget_unverified';
  const assetAdmissions=await observePublicDistiluseAssets();
  const projectionAdmission=assetAdmissions[1];
  const quantizedFile=inputContract.artifact;
  publicObservations.push(...assetAdmissions);
  const model={revision:MODEL_REVISION,license:'apache-2.0'},upstream=model;
  stage='model_load';failureReason='official_onnx_inference_unavailable';
  const {DistilBertTokenizer,env}=await import(pathToFileURL(join(lab,'node_modules/@huggingface/transformers/dist/transformers.node.mjs')).href);
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
  let tokenizer=await DistilBertTokenizer.from_pretrained(MODEL,{revision:MODEL_REVISION,cache_dir:cache});
  let modelPath=await getModelFile(MODEL,quantizedFile,true,
    {revision:MODEL_REVISION,cache_dir:cache},true);
  if(typeof modelPath!=='string'||!resolve(modelPath).startsWith(cache+'/'))refuse();
  const projectionPath=await getModelFile(MODEL,inputContract.projectionArtifact,true,
    {revision:MODEL_REVISION,cache_dir:cache},true);
  if(typeof projectionPath!=='string'||!resolve(projectionPath).startsWith(cache+'/'))refuse();
  const beforeLoadAssets=await publicAssets(cache);
  if(beforeLoadAssets.reduce((sum,item)=>sum+item.bytes,0)>MAX_MODEL_BYTES)refuse();
  const tokenizerConfig=beforeLoadAssets.filter(item=>item.asset.endsWith('/tokenizer_config.json'));
  if(tokenizerConfig.length!==1||tokenizerConfig[0].sha256!==PUBLIC_DISTILUSE_EMBEDDING.tokenizer)
    refuse('official_asset_digest_unverified');
  for(const receipt of assetAdmissions){
    const downloaded=beforeLoadAssets.filter(item=>item.asset.endsWith('/'+receipt.asset));
    if(downloaded.length!==1||downloaded[0].bytes!==receipt.bytes||downloaded[0].sha256!==receipt.sha256)
      refuse('official_asset_digest_unverified');
  }
  // No pickle, checkpoint conversion or remote Python. The exact observed
  // safetensors body is digest-bound, duplicate-free, finite F32 and shape-bound.
  let projection=decodePublicDistiluseProjection(await readFile(projectionPath),projectionAdmission,inputContract);
  extractor=await ort.InferenceSession.create(modelPath,{executionProviders:['cpu'],logSeverityLevel:4,logVerbosityLevel:0});
  const modelLoadMs=performance.now()-loadStarted;
  for(const settings of [env,hubEnv]){
    settings.allowRemoteModels=false;settings.allowLocalModels=true;settings.localModelPath=cache+'/';
  }
  await extractor.release();
  extractor=null;
  const reloadStarted=performance.now();
  tokenizer=await DistilBertTokenizer.from_pretrained(MODEL,
    {revision:MODEL_REVISION,cache_dir:cache,local_files_only:true});
  modelPath=await getModelFile(MODEL,quantizedFile,true,
    {revision:MODEL_REVISION,cache_dir:cache,local_files_only:true},true);
  if(typeof modelPath!=='string'||!resolve(modelPath).startsWith(cache+'/'))refuse();
  extractor=await ort.InferenceSession.create(modelPath,{executionProviders:['cpu'],logSeverityLevel:4,logVerbosityLevel:0});
  const offlineProjectionPath=await getModelFile(MODEL,inputContract.projectionArtifact,true,
    {revision:MODEL_REVISION,cache_dir:cache,local_files_only:true},true);
  if(typeof offlineProjectionPath!=='string'||!resolve(offlineProjectionPath).startsWith(cache+'/'))refuse();
  projection=decodePublicDistiluseProjection(await readFile(offlineProjectionPath),projectionAdmission,inputContract);
  const offlineReloadMs=performance.now()-reloadStarted;
  if(extractor.inputNames.length!==2||new Set(extractor.inputNames).size!==2
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
        tokenizerReturnedIds:!!tokens.input_ids,tokenizerReturnedMask:!!tokens.attention_mask,
        graphRequestsSegments:extractor.inputNames.includes('token_type_ids'),
        tokenizerReturnedSegments:!!tokens.token_type_ids,fullInputWithinDeclaredLimit:
          Number.isSafeInteger(tokens.input_ids?.dims?.[1])&&tokens.input_ids.dims[1]<=inputContract.maximumTokens});
      observedBoundaries.add(boundary+'_inputs');
    }
    const admitted=admitPublicDistiluseTokenInputs(extractor.inputNames,tokens,inputContract,tokenizer);
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
        denseReturned:!!dense,dimensionMatches:dense?.dims?.[2]===inputContract.encoderDimension,
        declaredLimitRetained:dense?.dims?.[1]<=inputContract.maximumTokens});
      observedBoundaries.add(boundary+'_dense');
    }
    return poolPublicDistiluseDense(dense,admitted.attention_mask,inputContract,projection);
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
  // One original semantic inference per fixed task. The additional hybrid
  // comparison consumes only those exact eligible-scope results; no second
  // tokenizer/ONNX call or post-result threshold/gold adjustment.
  const semanticRanks=new Map(),rankKey=(scope,query)=>JSON.stringify([scope,query]);
  const reports=[
    await evaluateRetrieval(retrievalCorpus,productionLexicalCandidate,{method:'lexical-production-v1'}),
    await evaluateRetrieval(retrievalCorpus,(scope,query)=>character.retrieve(scope,query),
      {method:'character-tfidf-lab-v1'}),
    await evaluateRetrieval(retrievalCorpus,async(scope,query)=>{
      const scores=await semantic.score(scope,query);
      const result=rankCalibrationScores(scores,MINIMUM_SCORE);
      semanticRanks.set(rankKey(scope,query),Object.freeze({
        ranks:Object.freeze([...result]),scores:Object.freeze(scores.map(row=>Object.freeze({...row})))
      }));
      return result;
    },
      {method:METHOD}),
  ];
  const hybridReport=await evaluateRetrieval(retrievalCorpus,(scope,query)=>{
    const key=rankKey(scope,query);
    if(!semanticRanks.has(key))refuse();
    return fuseScopedLabRanks(scope,productionLexicalCandidate(scope,query),semanticRanks.get(key).ranks);
  },{method:HYBRID_METHOD});
  // Cached fusion timing is deliberately NOT advertised as end-to-end model
  // query latency. The original semantic report includes the real inference.
  hybridReport.retrievalTiming.scope='ranking_only_shared_inference_not_end_to_end';
  hybridReport.sharedInferenceMethod=METHOD;
  hybridReport.hybridRankRule=HYBRID_RANK_RULE;
  hybridReport.additionalModelQueries=0;
  reports.push(hybridReport);
  // Development-only threshold selection never sees original fixed labels.
  // All original 28 records / 29 tasks and four frozen comparisons stay intact.
  stage='development_calibration_projection';
  const developmentProjection=await buildSemanticLabIndex(
    calibrationCorpus.records.filter(record=>!record.excluded),encode,
    {dimension:DIMENSION,minimumScore:MINIMUM_SCORE});
  stage='development_threshold_calibration';
  const calibration=await calibrateDevelopmentThreshold(
    calibrationCorpus,retrievalCorpus,developmentProjection.score);
  let calibratedFixedReport=null;
  if(calibration.selectedThreshold!==null){
    // Apply the already selected development threshold to original cached
    // inference. This diagnostic is NOT blind acceptance or production admission.
    stage='fixed_development_threshold_diagnostic';
    calibratedFixedReport=await evaluateRetrieval(retrievalCorpus,(scope,query)=>{
      const cached=semanticRanks.get(rankKey(scope,query));
      if(!cached)refuse();
      return rankCalibrationScores(cached.scores,calibration.selectedThreshold);
    },{method:METHOD});
    calibratedFixedReport.retrievalTiming.scope='ranking_only_shared_inference_not_end_to_end';
    calibratedFixedReport.sharedInferenceMethod=METHOD;
    calibratedFixedReport.additionalModelQueries=0;
    calibratedFixedReport.blindAcceptance=false;
    calibratedFixedReport.thresholdSelectionCorpus=calibration.developmentCorpusDigest;
    if(calibratedFixedReport.contractFailures)refuse();
  }
  // Explain ranking versus cutoff using the SAME complete cached fixed scores.
  // No additional encoder call, threshold selection or changed gold label.
  stage='fixed_cached_rank_root_cause';
  const fixedRankDiagnostic=diagnoseCachedFixedRanks(retrievalCorpus,
    (scope,query)=>semanticRanks.get(rankKey(scope,query)));
  semanticRanks.clear();
  stage='public_artifact_readback';failureReason='semantic_probe_unavailable';
  const assets=await publicAssets(cache);
  const modelArtifactBytes=assets.reduce((sum,item)=>sum+item.bytes,0);
  if(!assets.some(item=>item.asset.endsWith('/'+quantizedFile))
      ||modelArtifactBytes>MAX_MODEL_BYTES||reports.some(report=>report.contractFailures))refuse();
  const finalTokenizerConfig=assets.filter(item=>item.asset.endsWith('/tokenizer_config.json'));
  if(finalTokenizerConfig.length!==1||finalTokenizerConfig[0].sha256!==PUBLIC_DISTILUSE_EMBEDDING.tokenizer)
    refuse('official_asset_digest_unverified');
  for(const receipt of assetAdmissions){
    const actual=assets.filter(item=>item.asset.endsWith('/'+receipt.asset));
    if(actual.length!==1||actual[0].bytes!==receipt.bytes||actual[0].sha256!==receipt.sha256)
      refuse('official_asset_digest_unverified');
  }
  const memory=process.memoryUsage();
  console.log(JSON.stringify({schemaVersion:1,status:'MEASURED_LAB_ONLY',scope:'public_synthetic_only',
    productionClaim:false,semanticProductionCapabilityEstablished:false,productionIndexEnabled:false,
    chromeCompatibility:'NOT_VERIFIED',longLibraryPerformance:'NOT_VERIFIED',
    currentBeliefJudgment:false,privateCorpusUsed:false,providerApiCalls:0,providerApiCost:0,
    qualityGate:'NOT_PRODUCTION_CERTIFICATION',
    corpusDigest:reports[0].corpusDigest,
    model:{id:MODEL,revision:model.revision,license:model.license,
      upstream:{id:UPSTREAM,revision:upstream.revision,license:upstream.license},
      task:'feature-extraction',dtype:'q8',device:'cpu',pooling:'masked_mean_then_dense_tanh_then_cosine_normalization',normalize:true,
      queryPrefix:'',passagePrefix:'',dimension:DIMENSION,
      prefixScope:'RAW_SINGLE_SEQUENCE_LAB_ADAPTER_NOT_PRODUCTION_INPUT_CERTIFICATION',
      maximumTokens:inputContract.maximumTokens,truncation:false,assetAdmissions,
      encoderDimension:inputContract.encoderDimension,
      projection:{asset:projectionAdmission.asset,sha256:projection.sha256,bytes:projection.bytes,
        inputDimension:projection.inputDimension,outputDimension:projection.outputDimension,activation:projection.activation},
      explicitTokenizerClass:'DistilBertTokenizer',missingOptionalTokenizerMetadata:'NO_GENERIC_FALLBACK',
      singleSequenceTokenTypes:'DISTILBERT_GRAPH_TWO_REAL_INPUTS_ONLY',
      fabricatedTokenInputs:false,
      declaredSourceProvenance:provenance,quantizedFile,poolingConfigSha256:PUBLIC_DISTILUSE_EMBEDDING.pooling,
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
    calibration,calibratedFixedReport,fixedRankDiagnostic,reports}));
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
