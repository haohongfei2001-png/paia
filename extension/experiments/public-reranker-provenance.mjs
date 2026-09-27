// Fixed public paired-text source screening. No weights, inference or production admission.
import {createHash} from 'node:crypto';
import {METADATA_FIELDS,observeLicense,observeReadmeLicense} from './public-model-provenance.mjs';
export const RERANKER_SOURCES=Object.freeze([
  'cross-encoder/mmarco-mMiniLMv2-L12-H384-v1',
  'BAAI/bge-reranker-v2-m3'
]);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sha=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max?value:null;
const identity=(value,id,revision)=>object(value)&&value.id===id&&sha(value.sha)
  &&(!revision||value.sha===revision)&&value.private===false&&value.gated===false;
const classes=new Set(['BertForSequenceClassification','RobertaForSequenceClassification',
  'XLMRobertaForSequenceClassification','DebertaV2ForSequenceClassification']);
const tokenizers=new Set(['BertTokenizer','BertTokenizerFast','RobertaTokenizer',
  'RobertaTokenizerFast','XLMRobertaTokenizer','XLMRobertaTokenizerFast',
  'DebertaV2Tokenizer','DebertaV2TokenizerFast']);
async function boundedRead(url,fetcher,maxBytes){
  const response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(20000),
    headers:{Accept:'application/json, text/plain'}});
  const receipt={httpStatus:Number.isInteger(response.status)?response.status:0};
  if(response.status!==200)return {receipt};
  let bytes;
  if(response.body?.getReader){
    const reader=response.body.getReader(),parts=[];let size=0;
    try{
      for(;;){
        const part=await reader.read();if(part.done)break;
        if(!(part.value instanceof Uint8Array))throw Error('invalid_public_source_stream');
        size+=part.value.byteLength;
        if(size>maxBytes){receipt.bounded=false;await reader.cancel();return {receipt};}
        parts.push(Buffer.from(part.value));
      }
      bytes=Buffer.concat(parts);
    }finally{reader.releaseLock();}
  }else{
    bytes=Buffer.from(await response.text(),'utf8');
    if(bytes.byteLength>maxBytes){receipt.bounded=false;return {receipt};}
  }
  receipt.bounded=true;receipt.bytes=bytes.byteLength;receipt.sha256=hash(bytes);
  return {receipt,text:new TextDecoder('utf-8',{fatal:true}).decode(bytes)};
}
function metadataURL(id,revision){
  const url=new URL('https://huggingface.co/api/models/'+id+(revision?'/revision/'+revision:''));
  for(const field of METADATA_FIELDS)url.searchParams.append('expand',field);
  return url.href;
}
function licenseSummary(data){
  return {card:observeLicense(data?.cardData?.license),
    tagCodes:Array.isArray(data?.tags)?[...new Set(data.tags
      .filter(v=>typeof v==='string'&&v.startsWith('license:'))
      .map(v=>observeLicense(v.slice(8)).declaration))].sort():[]};
}
export async function inspectPublicRerankerSource(id,{fetcher=fetch}={}){
  if(!RERANKER_SOURCES.includes(id))throw Error('public_reranker_source_not_allowlisted');
  const result={repository:id,scope:'fixed_public_source_only',productionClaim:false,
    modelAdmission:'NOT_AUTHORIZED',weightsDownloaded:false,inferenceExecuted:false,
    pairTokenization:'NOT_VERIFIED',scoringActivation:'NOT_VERIFIED',
    chromeCompatibility:'NOT_VERIFIED',qualityGate:'NOT_EVALUATED'};
  try{
    const currentRead=await boundedRead(metadataURL(id),fetcher,1024*1024);
    result.currentMetadata=currentRead.receipt;
    if(currentRead.text===undefined){result.diagnosis='METADATA_UNAVAILABLE';return result;}
    const current=JSON.parse(currentRead.text);
    if(!identity(current,id)){result.diagnosis='IDENTITY_UNVERIFIED';return result;}
    result.revision=current.sha;
    result.currentLicense=licenseSummary(current);
    const pinnedRead=await boundedRead(metadataURL(id,current.sha),fetcher,1024*1024);
    result.pinnedMetadata=pinnedRead.receipt;
    if(pinnedRead.text===undefined){result.diagnosis='PINNED_METADATA_UNAVAILABLE';return result;}
    const pinned=JSON.parse(pinnedRead.text);
    if(!identity(pinned,id,current.sha)){result.diagnosis='PINNED_IDENTITY_UNVERIFIED';return result;}
    result.pinnedLicense=licenseSummary(pinned);
    if(!Array.isArray(pinned.siblings)||pinned.siblings.length>512
      ||pinned.siblings.some(v=>!object(v)||typeof v.rfilename!=='string'
        ||v.rfilename.length>240||!/^[-A-Za-z0-9_./]+$/.test(v.rfilename)
        ||v.rfilename.startsWith('/')||v.rfilename.split('/').some(p=>!p||p==='.'||p==='..'))
      ||new Set(pinned.siblings.map(v=>v.rfilename)).size!==pinned.siblings.length){
      result.diagnosis='INVENTORY_UNVERIFIED';return result;
    }
    const files=pinned.siblings.map(v=>v.rfilename);
    result.inventory={fileCount:files.length,
      onnxFiles:files.filter(v=>v.endsWith('.onnx')).sort(),
      onnxListed:files.some(v=>v.endsWith('.onnx')),
      quantizedOnnxListed:files.some(v=>v.endsWith('.onnx')&&/quant|qint|quint|int8|q8/.test(v)),
      tensorBytesFromMetadata:'NOT_VERIFIED'};
    const raw=file=>'https://huggingface.co/'+id+'/raw/'+current.sha+'/'+file;
    if(!files.includes('README.md')){result.diagnosis='README_UNAVAILABLE';return result;}
    const readme=await boundedRead(raw('README.md'),fetcher,256*1024);
    result.readme={...readme.receipt,license:observeReadmeLicense(readme.text??'')};
    const a=result.currentLicense.card,b=result.pinnedLicense.card,c=result.readme.license;
    if(!a.permitted||!b.permitted||!c.permitted
      ||a.declaration!==b.declaration||b.declaration!==c.declaration
      ||[result.currentLicense,result.pinnedLicense].some(v=>
        v.tagCodes.some(code=>code!==a.declaration))){
      result.diagnosis='LICENSE_DECLARATIONS_UNVERIFIED';return result;
    }
    result.licenseFiles=[];
    for(const file of ['LICENSE','LICENSE.txt','LICENSE.md'].filter(v=>files.includes(v))){
      const license=await boundedRead(raw(file),fetcher,64*1024);
      result.licenseFiles.push({file,...license.receipt,
        recognizedTitle:license.text?.includes('MIT License')?'MIT_TITLE':
          license.text?.includes('Apache License')?'APACHE_TITLE':'UNRECOGNIZED'});
      if(license.text===undefined){result.diagnosis='LICENSE_FILE_UNAVAILABLE';return result;}
    }
    if(!files.includes('config.json')||!files.includes('tokenizer_config.json')){
      result.diagnosis='CONFIGURATION_UNAVAILABLE';return result;
    }
    const configRead=await boundedRead(raw('config.json'),fetcher,64*1024);
    const tokenizerRead=await boundedRead(raw('tokenizer_config.json'),fetcher,64*1024);
    result.config=configRead.receipt;result.tokenizerConfig=tokenizerRead.receipt;
    if(configRead.text===undefined||tokenizerRead.text===undefined){
      result.diagnosis='CONFIGURATION_UNAVAILABLE';return result;
    }
    const config=JSON.parse(configRead.text),tokenizer=JSON.parse(tokenizerRead.text);
    if(!object(config)||!object(tokenizer)){
      result.diagnosis='CONFIGURATION_UNVERIFIED';return result;
    }
    const architectures=config.architectures;
    const known=Array.isArray(architectures)&&architectures.length===1&&classes.has(architectures[0]);
    const remote=Object.hasOwn(config,'auto_map')||Object.hasOwn(tokenizer,'auto_map');
    result.inputContract={architecture:known?architectures[0]:'OTHER_OR_UNVERIFIED',
      hiddenDimension:integer(config.hidden_size,1,8192),
      layers:integer(config.num_hidden_layers,1,96),
      positionLimit:integer(config.max_position_embeddings,1,32768),
      outputLabels:integer(config.num_labels??(
        object(config.id2label)?Object.keys(config.id2label).length:null),1,2),
      tokenizerClass:tokenizers.has(tokenizer.tokenizer_class)?tokenizer.tokenizer_class:'OTHER_OR_UNVERIFIED',
      tokenizerDeclaredLimit:integer(tokenizer.model_max_length,1,32768),
      remoteCodeDeclarationPresent:remote,pairedInputsExecuted:false,
      truncationPolicyVerified:false,normalizationVerified:false};
    result.diagnosis=!known||remote?'CONFIGURATION_UNVERIFIED':
      'CONSISTENT_DECLARED_SOURCE_PENDING_INPUT_AND_QUALITY';
    return result;
  }catch(error){
    result.diagnosis='SOURCE_INSPECTION_UNAVAILABLE';
    result.errorClass=['Error','TypeError','SyntaxError','AbortError','TimeoutError']
      .includes(error?.name)?error.name:'Other';
    return result;
  }
}
