// Official public sentence-embedding source contracts only. Never load model code or weights.
import {observeReadmeLicense} from './public-model-provenance.mjs';
import {boundedRead,metadataURL,licenseSummary} from './public-reranker-provenance.mjs';
export const EMBEDDING_SOURCES=Object.freeze([
 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2',
 'sentence-transformers/LaBSE',
 'sentence-transformers/distiluse-base-multilingual-cased-v1'
]);
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const sha=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
const identity=(v,id,revision)=>object(v)&&v.id===id&&sha(v.sha)
 &&(!revision||v.sha===revision)&&v.private===false&&v.gated===false;
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max?v:null;
const architectures=new Set(['BertModel','RobertaModel','XLMRobertaModel','MPNetModel','DistilBertModel']);
const tokenizers=new Set(['BertTokenizer','BertTokenizerFast','RobertaTokenizer','RobertaTokenizerFast',
 'XLMRobertaTokenizer','XLMRobertaTokenizerFast','MPNetTokenizer','MPNetTokenizerFast',
 'DistilBertTokenizer','DistilBertTokenizerFast']);
const moduleClasses=new Set(['Transformer','Pooling','Dense','Normalize']);
const modulePaths=new Set(['0_Transformer','1_Pooling','2_Dense','2_Normalize','3_Normalize']);
const moduleOrders=new Set(['Transformer,Pooling','Transformer,Pooling,Normalize',
 'Transformer,Pooling,Dense','Transformer,Pooling,Dense,Normalize']);
const poolKeys=['pooling_mode_cls_token','pooling_mode_mean_tokens','pooling_mode_max_tokens',
 'pooling_mode_mean_sqrt_len_tokens','pooling_mode_weightedmean_tokens','pooling_mode_lasttoken'];
const activations=new Set(['torch.nn.modules.activation.Tanh','torch.nn.modules.linear.Identity',
 'torch.nn.Tanh','torch.nn.Identity']);
export async function inspectPublicEmbeddingSource(id,{fetcher=fetch}={}){
 if(!EMBEDDING_SOURCES.includes(id))throw Error('public_embedding_source_not_allowlisted');
 const result={repository:id,scope:'fixed_public_source_only',productionClaim:false,
  modelAdmission:'NOT_AUTHORIZED',weightsDownloaded:false,inferenceExecuted:false,
  scoringActivation:'NOT_VERIFIED',queryPrefix:'NOT_VERIFIED',truncationPolicy:'NOT_VERIFIED',
  conversionEquivalence:'NOT_VERIFIED',chromeCompatibility:'NOT_VERIFIED',qualityGate:'NOT_EVALUATED'};
 try{
  const first=await boundedRead(metadataURL(id),fetcher,1024*1024);
  result.currentMetadata=first.receipt;
  if(first.text===undefined){result.diagnosis='METADATA_UNAVAILABLE';return result;}
  const current=JSON.parse(first.text);
  if(!identity(current,id)){result.diagnosis='IDENTITY_UNVERIFIED';return result;}
  result.revision=current.sha;result.currentLicense=licenseSummary(current);
  const second=await boundedRead(metadataURL(id,current.sha),fetcher,1024*1024);
  result.pinnedMetadata=second.receipt;
  if(second.text===undefined){result.diagnosis='PINNED_METADATA_UNAVAILABLE';return result;}
  const pinned=JSON.parse(second.text);
  if(!identity(pinned,id,current.sha)){result.diagnosis='PINNED_IDENTITY_UNVERIFIED';return result;}
  result.pinnedLicense=licenseSummary(pinned);
  if(!Array.isArray(pinned.siblings)||pinned.siblings.length>512
   ||pinned.siblings.some(v=>!object(v)||typeof v.rfilename!=='string'||v.rfilename.length>240
    ||!/^[-A-Za-z0-9_./]+$/.test(v.rfilename)||v.rfilename.startsWith('/')
    ||v.rfilename.split('/').some(p=>!p||p==='.'||p==='..'))
   ||new Set(pinned.siblings.map(v=>v.rfilename)).size!==pinned.siblings.length){
   result.diagnosis='INVENTORY_UNVERIFIED';return result;
  }
  const files=pinned.siblings.map(v=>v.rfilename),raw=file=>
   'https://huggingface.co/'+id+'/raw/'+current.sha+'/'+file;
  result.inventory={fileCount:files.length,onnxFiles:files.filter(v=>v.endsWith('.onnx')).sort(),
   quantizedOnnxListed:files.some(v=>v.endsWith('.onnx')&&/quant|qint|quint|int8|q8/.test(v)),
   tensorBytesFromMetadata:'NOT_VERIFIED',
   safeProjectionFiles:files.filter(v=>v==='2_Dense/model.safetensors')};
  if(!files.includes('README.md')){result.diagnosis='README_UNAVAILABLE';return result;}
  const readme=await boundedRead(raw('README.md'),fetcher,256*1024);
  result.readme={...readme.receipt,license:observeReadmeLicense(readme.text??'')};
  const a=result.currentLicense.card,b=result.pinnedLicense.card,c=result.readme.license;
  if(!a.permitted||!b.permitted||!c.permitted||a.declaration!==b.declaration
   ||b.declaration!==c.declaration||[result.currentLicense,result.pinnedLicense].some(v=>
    v.tagCodes.some(code=>code!==a.declaration))){
   result.diagnosis='LICENSE_DECLARATIONS_UNVERIFIED';return result;
  }
  result.licenseFiles=[];
  for(const file of ['LICENSE','LICENSE.txt','LICENSE.md'].filter(v=>files.includes(v))){
   const value=await boundedRead(raw(file),fetcher,64*1024);
   result.licenseFiles.push({file,...value.receipt,
    recognizedTitle:value.text?.includes('MIT License')?'MIT_TITLE':
     value.text?.includes('Apache License')?'APACHE_TITLE':'UNRECOGNIZED'});
   if(value.text===undefined){result.diagnosis='LICENSE_FILE_UNAVAILABLE';return result;}
  }
  const mandatory=['config.json','tokenizer_config.json','modules.json'];
  if(!mandatory.every(v=>files.includes(v))){result.diagnosis='CONFIGURATION_UNAVAILABLE';return result;}
  const values={};result.configurationFiles=[];
  for(const file of mandatory){
   const value=await boundedRead(raw(file),fetcher,64*1024);
   result.configurationFiles.push({file,...value.receipt});
   if(value.text===undefined){result.diagnosis='CONFIGURATION_UNAVAILABLE';return result;}
   values[file]=JSON.parse(value.text);
  }
  const config=values['config.json'],tokenizer=values['tokenizer_config.json'],modules=values['modules.json'];
  if(!object(config)||!object(tokenizer)||!Array.isArray(modules)||modules.length<2||modules.length>4
   ||modules.some((v,i)=>!object(v)||v.idx!==i||!Number.isSafeInteger(v.idx)
    ||typeof v.type!=='string'||!v.type.startsWith('sentence_transformers.models.')
    ||!moduleClasses.has(v.type.slice('sentence_transformers.models.'.length))
    ||typeof v.path!=='string'||!(i===0&&v.path===''||modulePaths.has(v.path)))
   ||new Set(modules.map(v=>v.path)).size!==modules.length
   ||!moduleOrders.has(modules.map(v=>v.type.slice('sentence_transformers.models.'.length)).join(','))
   ||modules[0].type!=='sentence_transformers.models.Transformer'
   ||modules.filter(v=>v.type==='sentence_transformers.models.Pooling').length!==1
   ||modules.filter(v=>v.type==='sentence_transformers.models.Dense').length>1
   ||modules.filter(v=>v.type==='sentence_transformers.models.Normalize').length>1){
   result.diagnosis='MODULE_CONTRACT_UNVERIFIED';return result;
  }
  const known=Array.isArray(config.architectures)&&config.architectures.length===1
   &&architectures.has(config.architectures[0]);
  const remote=Object.hasOwn(config,'auto_map')||Object.hasOwn(tokenizer,'auto_map');
  result.inputContract={architecture:known?config.architectures[0]:'OTHER_OR_UNVERIFIED',
   hiddenDimension:integer(config.architectures?.[0]==='DistilBertModel'?config.dim:config.hidden_size,1,8192),
   layers:integer(config.architectures?.[0]==='DistilBertModel'?config.n_layers:config.num_hidden_layers,1,96),
   positionLimit:integer(config.max_position_embeddings,1,32768),
   tokenizerClass:tokenizers.has(tokenizer.tokenizer_class)?tokenizer.tokenizer_class:'OTHER_OR_UNVERIFIED',
   tokenizerDeclaredLimit:integer(tokenizer.model_max_length,1,32768),
   remoteCodeDeclarationPresent:remote,inputExecutionVerified:false};
  if(!known||remote){result.diagnosis='CONFIGURATION_UNVERIFIED';return result;}
  result.sentenceTransformerConfiguration=null;
  result.inputContract.sentenceTransformerLimit=null;
  if(files.includes('sentence_bert_config.json')){
   const read=await boundedRead(raw('sentence_bert_config.json'),fetcher,64*1024);
   result.sentenceTransformerConfiguration={file:'sentence_bert_config.json',...read.receipt};
   result.configurationFiles.push(result.sentenceTransformerConfiguration);
   if(read.text===undefined){result.diagnosis='INPUT_CONFIGURATION_UNAVAILABLE';return result;}
   const value=JSON.parse(read.text);
   if(!object(value)||Object.hasOwn(value,'auto_map')
    ||integer(value.max_seq_length,1,512)===null){
    result.diagnosis='INPUT_CONFIGURATION_UNVERIFIED';return result;
   }
   result.inputContract.sentenceTransformerLimit=value.max_seq_length;
  }
  result.moduleOrder=modules.map(v=>v.type.slice('sentence_transformers.models.'.length));
  result.pooling=null;result.projection=null;result.normalizationDeclared=modules.some(v=>
   v.type==='sentence_transformers.models.Normalize');
  for(const entry of modules.filter(v=>['sentence_transformers.models.Pooling',
   'sentence_transformers.models.Dense'].includes(v.type))){
   const file=entry.path+'/config.json';
   if(!files.includes(file)){result.diagnosis='MODULE_CONFIGURATION_UNAVAILABLE';return result;}
   const read=await boundedRead(raw(file),fetcher,64*1024);
   result.configurationFiles.push({file,...read.receipt});
   if(read.text===undefined){result.diagnosis='MODULE_CONFIGURATION_UNAVAILABLE';return result;}
   const value=JSON.parse(read.text);
   if(!object(value)||Object.hasOwn(value,'auto_map')){
    result.diagnosis='MODULE_CONFIGURATION_UNVERIFIED';return result;
   }
   if(entry.type.endsWith('.Pooling')){
    if(integer(value.word_embedding_dimension,1,8192)===null
     ||poolKeys.slice(0,4).some(key=>typeof value[key]!=='boolean')){
     result.diagnosis='MODULE_CONFIGURATION_UNVERIFIED';return result;
    }
    result.pooling={dimension:integer(value.word_embedding_dimension,1,8192),
     modes:Object.fromEntries(poolKeys.map(key=>[key,typeof value[key]==='boolean'?value[key]:null])),
     executionVerified:false};
   }else{
    if(integer(value.in_features,1,8192)===null||integer(value.out_features,1,8192)===null
     ||typeof value.bias!=='boolean'||!activations.has(value.activation_function)){
     result.diagnosis='MODULE_CONFIGURATION_UNVERIFIED';return result;
    }
    result.projection={inputDimension:integer(value.in_features,1,8192),
     outputDimension:integer(value.out_features,1,8192),
     bias:typeof value.bias==='boolean'?value.bias:null,
     activation:activations.has(value.activation_function)?value.activation_function:'OTHER_OR_UNVERIFIED',
     weightsVerified:false,executionVerified:false};
   }
  }
  result.diagnosis='CONSISTENT_DECLARED_SOURCE_PENDING_INPUT_AND_QUALITY';
  return result;
 }catch(error){
  result.diagnosis='SOURCE_INSPECTION_UNAVAILABLE';
  result.errorClass=['Error','TypeError','SyntaxError','AbortError','TimeoutError'].includes(error?.name)?error.name:'Other';
  return result;
 }
}


// One new source candidate only. Existing measured candidates retain their
// receipts; this report authorizes neither weights nor inference or production.
export const DISTILUSE_SOURCE='sentence-transformers/distiluse-base-multilingual-cased-v1';
const distiluseAssets=Object.freeze([
 'onnx/model_quint8_avx2.onnx','onnx/model_qint8_avx512_vnni.onnx','onnx/model_quantized.onnx'
]);
const projectionAsset='2_Dense/model.safetensors';
const artifactBudget=384*1024*1024;
async function observeDeclaredAsset(id,revision,asset,fetcher){
 const response=await fetcher('https://huggingface.co/'+id+'/resolve/'+revision+'/'+asset,
  {method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(20000),
   headers:{Accept:'application/octet-stream'}});
 const receipt={asset,httpStatus:Number.isInteger(response.status)?response.status:0,
  bodyRequested:false,headerVerified:false};
 if(![200,302,303,307,308].includes(response.status))return receipt;
 const raw=response.headers?.get('x-linked-size')??
  (response.status===200?response.headers?.get('content-length'):null);
 const digest=response.headers?.get('x-linked-etag')?.replace(/^"|"$/g,'');
 if(typeof raw!=='string'||!/^[1-9][0-9]{0,9}$/.test(raw)
  ||typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))return receipt;
 const bytes=Number(raw);
 if(!Number.isSafeInteger(bytes)||bytes>artifactBudget)return receipt;
 return {...receipt,bytes,sha256:digest,headerVerified:true};
}
export async function inspectPublicDistiluseCandidate({fetcher=fetch}={}){
 const source=await inspectPublicEmbeddingSource(DISTILUSE_SOURCE,{fetcher});
 const result={...source,assetScreen:{disposition:'NOT_ADMITTED',weightsDownloaded:false,
  inferenceExecuted:false,bodyRequested:false,productionAdmission:false,
  artifactByteCeiling:artifactBudget,aggregateCacheBudget:'NOT_VERIFIED',
  projectionExecution:'NOT_VERIFIED',conversionEquivalence:'NOT_VERIFIED',receipts:[]}};
 const screen=result.assetScreen,input=source.inputContract,modes=source.pooling?.modes;
 if(source.diagnosis!=='CONSISTENT_DECLARED_SOURCE_PENDING_INPUT_AND_QUALITY'){
  screen.reason='SOURCE_CONTRACT_UNVERIFIED';return result;
 }
 // Observe a specific declared family. A model name never supplies omitted
 // configuration defaults, pooling, projection weights or a tokenizer limit.
 if(input?.architecture!=='DistilBertModel'||input.hiddenDimension!==768
  ||input.layers!==6||input.positionLimit!==512
  ||!['DistilBertTokenizer','DistilBertTokenizerFast'].includes(input.tokenizerClass)
  ||!Number.isSafeInteger(input.sentenceTransformerLimit)||input.sentenceTransformerLimit<1
  ||input.sentenceTransformerLimit>512||!Number.isSafeInteger(input.tokenizerDeclaredLimit)
  ||input.sentenceTransformerLimit>input.tokenizerDeclaredLimit
  ||source.pooling?.dimension!==768||modes?.pooling_mode_mean_tokens!==true
  ||['pooling_mode_cls_token','pooling_mode_max_tokens','pooling_mode_mean_sqrt_len_tokens']
    .some(key=>modes?.[key]!==false)
  ||['pooling_mode_weightedmean_tokens','pooling_mode_lasttoken']
    .some(key=>modes?.[key]!==false&&modes?.[key]!==null)
  ||!['Transformer,Pooling,Dense','Transformer,Pooling,Dense,Normalize']
    .includes(source.moduleOrder?.join(','))
  ||source.projection?.inputDimension!==768||source.projection.outputDimension!==512
  ||source.projection.bias!==true
  ||!['torch.nn.modules.activation.Tanh','torch.nn.Tanh'].includes(source.projection.activation)){
  screen.reason='DISTILUSE_INPUT_OR_PROJECTION_UNVERIFIED';return result;
 }
 const files=source.inventory?.onnxFiles??[];
 const encoder=distiluseAssets.find(file=>files.includes(file));
 // A safe projection payload must be advertised by the SAME pinned inventory.
 // Never load pickle, convert a checkpoint, follow an arbitrary model path, or
 // infer that an encoder-only ONNX graph includes the Dense projection.
 if(!encoder){screen.reason='DECLARED_ENCODER_ASSET_UNAVAILABLE';return result;}
 if(!source.inventory?.safeProjectionFiles?.includes(projectionAsset)){
  screen.reason='DECLARED_SAFE_PROJECTION_UNAVAILABLE';return result;
 }
 try{
  const encoded=await observeDeclaredAsset(DISTILUSE_SOURCE,source.revision,encoder,fetcher);
  screen.receipts.push(encoded);
  if(!encoded.headerVerified){screen.reason='ENCODER_HEADER_UNVERIFIED';return result;}
  const projected=await observeDeclaredAsset(DISTILUSE_SOURCE,source.revision,projectionAsset,fetcher);
  screen.receipts.push(projected);
  if(!projected.headerVerified){screen.reason='PROJECTION_HEADER_UNVERIFIED';return result;}
  if(encoded.bytes+projected.bytes>artifactBudget){
   screen.reason='DECLARED_COMBINED_ASSET_BUDGET_EXCEEDED';return result;
  }
  screen.declaredCombinedBytes=encoded.bytes+projected.bytes;
  screen.disposition='DECLARED_HEADERS_PENDING_WEIGHT_INPUT_AND_QUALITY_REVIEW';
  screen.reason='NO_EXECUTION_OR_MODEL_ADMISSION';
  return result;
 }catch(error){
  screen.reason='ASSET_HEADERS_UNAVAILABLE';
  screen.errorClass=['Error','TypeError','SyntaxError','AbortError','TimeoutError'].includes(error?.name)?error.name:'Other';
  return result;
 }
}
