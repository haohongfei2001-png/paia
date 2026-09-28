// One Actions-only, fixed PUBLIC synthetic CPU probe. Not a product model choice.
// Model downloads are public artifacts; applicant/archive data are never loaded.
import {createHash} from 'node:crypto';
import {readFile,readdir,stat,mkdir} from 'node:fs/promises';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {retrievalCorpus} from '../tests/fixtures/cpv1-07-retrieval-corpus.mjs';
import {validateRetrievalCorpus,productionLexicalCandidate,buildCharacterIndex,evaluateRetrieval}
  from '../experiments/retrieval-evaluation.mjs';
import {buildSemanticLabIndex} from '../experiments/semantic-lab-index.mjs';

const MODEL='Xenova/multilingual-e5-small';
const UPSTREAM='intfloat/multilingual-e5-small';
const METHOD='multilingual-e5-small-onnx-lab-v1';
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
  'quantized_asset_unavailable']);
function refuse(reason='semantic_probe_unavailable'){
  failureReason=REASONS.has(reason)?reason:'semantic_probe_unavailable';
  throw new Error('semantic_probe_unavailable');
}
async function metadata(id) {
  const response=await fetch('https://huggingface.co/api/models/'+id,
    {signal:AbortSignal.timeout(20000),redirect:'manual'});
  const observation={repository:id,httpStatus:response.status};
  publicObservations.push(observation);
  if(!response.ok)refuse('public_model_http_unavailable');
  const text=await response.text();
  if(Buffer.byteLength(text)>1024*1024)refuse('public_model_metadata_invalid');
  const data=JSON.parse(text);
  observation.identifierMatches=data.id===id;
  observation.revisionFormatValid=validSha(data.sha);
  observation.publicModel=data.private===false;
  observation.ungated=data.gated===false;
  const license=data.cardData?.license;
  observation.permittedLicense=['mit','apache-2.0'].includes(license);
  observation.q8AssetPresent=Array.isArray(data.siblings)
    &&data.siblings.some(item=>item.rfilename==='onnx/model_quantized.onnx');
  if(data.id!==id||!validSha(data.sha)||data.private!==false||data.gated)
    refuse('public_model_identity_unverified');
  if(!['mit','apache-2.0'].includes(license))refuse('public_model_license_unverified');
  return {revision:data.sha,license,
    files:Array.isArray(data.siblings)?data.siblings.map(item=>item.rfilename):[]};
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
  const ort=locked.packages?.['node_modules/onnxruntime-node'];
  if(ort?.version!=='1.21.0'||typeof ort.integrity!=='string')refuse('onnx_dependency_unverified');
  await mkdir(cache,{recursive:true});
  // Start with an empty per-head public cache; no ambient/private model state.
  if((await readdir(cache)).length)refuse('nonempty_public_cache');
  stage='public_model_provenance';
  const model=await metadata(MODEL),upstream=await metadata(UPSTREAM);
  if(!model.files.includes('onnx/model_quantized.onnx'))refuse('quantized_asset_unavailable');
  stage='model_load';
  const {pipeline,env}=await import(pathToFileURL(join(lab,'node_modules/@huggingface/transformers/dist/transformers.node.mjs')).href);
  env.allowLocalModels=false;env.allowRemoteModels=true;
  env.useFSCache=true;env.cacheDir=cache;
  env.useBrowserCache=false;
  const loadStarted=performance.now();
  extractor=await pipeline('feature-extraction',MODEL,
    {revision:model.revision,dtype:'q8',device:'cpu',cache_dir:cache});
  const modelLoadMs=performance.now()-loadStarted;
  // All further encoding must work from the revision-pinned downloaded cache.
  env.allowRemoteModels=false;env.allowLocalModels=true;env.localModelPath=cache+'/';
  await extractor.dispose();
  const reloadStarted=performance.now();
  extractor=await pipeline('feature-extraction',MODEL,
    {revision:model.revision,dtype:'q8',device:'cpu',cache_dir:cache,local_files_only:true});
  const offlineReloadMs=performance.now()-reloadStarted;
  const encode=async text=>{
    const tensor=await extractor(text,{pooling:'mean',normalize:true});
    const rows=tensor.tolist();
    if(!Array.isArray(rows)||rows.length!==1)refuse();
    return rows[0];
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
  stage='fixed_quality_comparison';
  const reports=[
    await evaluateRetrieval(retrievalCorpus,productionLexicalCandidate,{method:'lexical-production-v1'}),
    await evaluateRetrieval(retrievalCorpus,(scope,query)=>character.retrieve(scope,query),
      {method:'character-tfidf-lab-v1'}),
    await evaluateRetrieval(retrievalCorpus,(scope,query)=>semantic.retrieve(scope,query),
      {method:METHOD}),
  ];
  stage='public_artifact_readback';
  const assets=await publicAssets(cache);
  const modelArtifactBytes=assets.reduce((sum,item)=>sum+item.bytes,0);
  if(!assets.some(item=>item.asset.endsWith('/onnx/model_quantized.onnx'))
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
      queryPrefix:'query: ',passagePrefix:'passage: ',dimension:DIMENSION,
      minimumCosineScore:MINIMUM_SCORE,thresholdCalibrated:false,
      modelArtifactBytes,modelLoadMs,offlineReloadMs,assets,
      onnxConversionEquivalence:'NOT_VERIFIED'},
    dependency:{package:'@huggingface/transformers',version:PACKAGE_VERSION,
      onnxruntimeNodeVersion:ort.version,lockSha256:hash(lock),
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
  if(extractor)try {await extractor.dispose();}catch {process.stderr.write('semantic lab cleanup unavailable\n');process.exitCode=1;}
}
