// One changed-input public paired-text measurement. Never a production model selection.
import {createHash} from 'node:crypto';
import {readFile,readdir,stat,mkdir} from 'node:fs/promises';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {retrievalCorpus} from '../tests/fixtures/cpv1-07-retrieval-corpus.mjs';
import {calibrationCorpus} from '../tests/fixtures/cpv1-07-calibration-corpus.mjs';
import {validateRetrievalCorpus,productionLexicalCandidate,buildCharacterIndex,evaluateRetrieval}
 from '../experiments/retrieval-evaluation.mjs';
import {validateCalibrationCorpus,calibrateDevelopmentThreshold,rankCalibrationScores}
 from '../experiments/semantic-calibration.mjs';
import {inspectPublicRerankerSource} from '../experiments/public-reranker-provenance.mjs';
import {PAIRED_LAB_POLICY,admitPairedSource,createPairedTextScorer}
 from '../experiments/public-paired-text-lab.mjs';
const {model:MODEL,revision:MODEL_REVISION,method:METHOD}=PAIRED_LAB_POLICY;
const PACKAGE_VERSION='3.8.1',MINIMUM_SCORE=.7,MAX_MODEL_BYTES=384*1024*1024;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
let stage='lab_environment',extractor,failureReason='paired_probe_unavailable';
const publicObservations=[];
const REASONS=new Set(['paired_probe_unavailable','invalid_lab_environment',
 'lab_package_unverified','onnx_dependency_unverified','nonempty_public_cache',
 'paired_source_contract_unverified','quantized_asset_unavailable',
 'paired_input_or_single_logit_contract_unverified','offline_asset_readback_unverified']);
function refuse(reason='paired_probe_unavailable'){
 failureReason=REASONS.has(reason)?reason:'paired_probe_unavailable';
 throw Error('public_paired_probe_unavailable');
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

try{
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

 stage='pinned_paired_source';failureReason='paired_source_contract_unverified';
 const provenance=await inspectPublicRerankerSource(MODEL);
 admitPairedSource(provenance);
 const files=provenance.inventory?.onnxFiles;
 if(!Array.isArray(files))refuse('quantized_asset_unavailable');
 // Fixed ordered selection from the exact public repository, no third-party conversion.
 const quantizedFile=['onnx/model_qint8_avx2.onnx','onnx/model_quint8_avx2.onnx',
  'onnx/model_qint8_avx512_vnni.onnx','onnx/model_quantized.onnx',
  'onnx/model_quint8_avx512_vnni.onnx','onnx/model_qint8_avx512.onnx',
  'onnx/model_qint8_arm64.onnx'].find(file=>files.includes(file));
 if(!quantizedFile)refuse('quantized_asset_unavailable');
 publicObservations.push({repository:MODEL,revision:MODEL_REVISION,quantizedFile,
  sourceDigestMatches:true,licenseDeclaration:'apache-2.0'});
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

 if(extractor.outputNames.length!==1||extractor.outputNames[0]!=='logits')
  refuse('paired_input_or_single_logit_contract_unverified');
 const paired=createPairedTextScorer({inputNames:extractor.inputNames,
  tokenize:(query,options)=>tokenizer(query,options),
  run:async admitted=>{
   stage='paired_single_logit_inference';failureReason='paired_input_or_single_logit_contract_unverified';
   const feeds={};
   for(const [name,tensor] of Object.entries(admitted))
    feeds[name]=new ort.Tensor(tensor.type,tensor.data,tensor.dims);
   return extractor.run(feeds);
  }});
 // Development cutoff is selected FIRST without access to the original fixed labels.
 stage='development_paired_calibration';
 failureReason='paired_input_or_single_logit_contract_unverified';
 const calibration=await calibrateDevelopmentThreshold(calibrationCorpus,retrievalCorpus,paired.score);
 const rankKey=(scope,query)=>JSON.stringify([scope.map(({id,title,body})=>({id,title,body})),query]);
 const cached=new Map(),eligible=retrievalCorpus.records.filter(r=>!r.excluded);
 const character=buildCharacterIndex(eligible);
 stage='fixed_paired_diagnostics';
 const reports=[
  await evaluateRetrieval(retrievalCorpus,productionLexicalCandidate,{method:'lexical-production-v1'}),
  await evaluateRetrieval(retrievalCorpus,(scope,query)=>character.retrieve(scope,query),
   {method:'character-tfidf-lab-v1'}),
  await evaluateRetrieval(retrievalCorpus,async(scope,query)=>{
   const rows=await paired.score(scope,query);
   cached.set(rankKey(scope,query),Object.freeze(rows.map(r=>Object.freeze({...r}))));
   return rankCalibrationScores(rows,MINIMUM_SCORE);
  },{method:METHOD})
 ];
 let calibratedFixedReport=null;
 if(calibration.selectedThreshold!==null){
  calibratedFixedReport=await evaluateRetrieval(retrievalCorpus,(scope,query)=>{
   const rows=cached.get(rankKey(scope,query));if(!rows)refuse();
   return rankCalibrationScores(rows,calibration.selectedThreshold);
  },{method:METHOD});
  calibratedFixedReport.retrievalTiming.scope='ranking_only_shared_inference_not_end_to_end';
  calibratedFixedReport.additionalModelQueries=0;
  calibratedFixedReport.blindAcceptance=false;
  calibratedFixedReport.thresholdSelectionCorpus=calibration.developmentCorpusDigest;
 }
 cached.clear();
 stage='offline_public_asset_readback';failureReason='offline_asset_readback_unverified';
 const assets=await publicAssets(cache);
 const modelArtifactBytes=assets.reduce((sum,a)=>sum+a.bytes,0);
 if(modelArtifactBytes>MAX_MODEL_BYTES||!assets.some(a=>a.asset.endsWith('/'+quantizedFile))
  ||reports.some(r=>r.contractFailures)||calibratedFixedReport?.contractFailures)refuse();
 const memory=process.memoryUsage();
 console.log(JSON.stringify({schemaVersion:1,status:'MEASURED_LAB_ONLY',scope:'public_synthetic_only',
  productionClaim:false,modelAdmitted:false,productionIndexEnabled:false,
  semanticProductionCapabilityEstablished:false,qualityGate:'NOT_PRODUCTION_CERTIFICATION',
  chromeCompatibility:'NOT_VERIFIED',longLibraryPerformance:'NOT_VERIFIED',
  privateCorpusUsed:false,currentBeliefJudgment:false,providerApiCalls:0,providerApiCost:0,
  corpusDigest:reports[0].corpusDigest,
  model:{id:MODEL,revision:MODEL_REVISION,license:'apache-2.0',task:'paired-sequence-classification',
   dtype:'q8',device:'cpu',policy:PAIRED_LAB_POLICY,quantizedFile,declaredSourceProvenance:provenance,
   scoringActivation:'EXPLICIT_LAB_TRANSFORM_NOT_MODEL_PROBABILITY',genericClassifierUsed:false,
   minimumLabScore:MINIMUM_SCORE,productionThresholdChanged:false,
   modelArtifactBytes,modelLoadMs,offlineReloadMs,assets,onnxConversionEquivalence:'NOT_VERIFIED'},
  dependency:{package:'@huggingface/transformers',version:PACKAGE_VERSION,
   onnxruntimeNodeVersion:ortLock.version,lockSha256:hash(lock),
   lockStatus:'RESOLVED_PUBLIC_LAB_NOT_PRODUCTION_LOCK'},
  pairedInputs:paired.observation(),
  memory:{nodeRssBytes:memory.rss,nodeHeapUsedBytes:memory.heapUsed,
   scope:'node_process_after_fixed_probe_not_chrome_peak'},
  calibration,calibratedFixedReport,reports}));
}catch(error){
 const errorClass=['AbortError','TimeoutError','SyntaxError','TypeError','Error'].includes(error?.name)
  ?error.name:'Other';
 console.log(JSON.stringify({schemaVersion:1,status:'UNAVAILABLE',stage,reason:failureReason,
  errorClass,publicObservations,scope:'public_synthetic_only',productionClaim:false,
  modelAdmitted:false,qualityGate:'NOT_EVALUATED',privateCorpusUsed:false}));
 process.exitCode=1;
}finally{
 if(extractor)try{await extractor.release();}catch{
  process.stderr.write('public paired lab cleanup unavailable\n');process.exitCode=1;
 }
}
