import {createHash as distilCreateHash} from 'node:crypto';
const denseHash=bytes=>distilCreateHash('sha256').update(bytes).digest('hex');
// Fixed official XLM-R sentence-embedding lab admission, never a product model.
import {admitOfficialTokenInputs,meanPoolOfficialDense} from './official-minilm-pooling.mjs';
export const PUBLIC_XLM_EMBEDDING=Object.freeze({
 id:'sentence-transformers/paraphrase-multilingual-mpnet-base-v2',
 revision:'4328cf26390c98c5e3c738b4460a05b95f4911f5',
 readme:'06184100d14bfb314649996e8e68d1aae5ec2efd6ff8865a7eec7e3741736154',
 config:'8b94b5c10efd3c3ca667e5ccd501314eb670cefbf7a465f0a3fc0928a1a0ab87',
 tokenizer:'a312d5bef89ec4c9355638520a31582e761f205d79df3002a3bd390d7077455f',
 modules:'8f4b264b80206c830bebbdcae377e137925650a433b689343a63bdc9b3145460',
 pooling:'a37f83ada23e7887be6b88f4998927dbeac0038af301553c7cd5461413bf1a56',
 asset:'onnx/model_quint8_avx2.onnx',dimension:768,
 maximumArtifactBytes:384*1024*1024
});
const reject=()=>{throw Error('official_embedding_contract_unverified');};
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export function admitPublicXlmEmbedding(source){
 const c=PUBLIC_XLM_EMBEDDING,files=source?.configurationFiles;
 const read=(file,digest)=>Array.isArray(files)&&files.filter(x=>x?.file===file).length===1
  &&files.some(x=>x.file===file&&x.httpStatus===200&&x.bounded===true&&x.sha256===digest);
 const modes=source?.pooling?.modes,input=source?.inputContract;
 if(source?.repository!==c.id||source.revision!==c.revision
  ||source.diagnosis!=='CONSISTENT_DECLARED_SOURCE_PENDING_INPUT_AND_QUALITY'
  ||source.weightsDownloaded!==false||source.inferenceExecuted!==false||source.productionClaim!==false
  ||source.modelAdmission!=='NOT_AUTHORIZED'
  ||source.currentLicense?.card?.permitted!==true||source.pinnedLicense?.card?.permitted!==true
  ||source.readme?.license?.permitted!==true
  ||source.currentLicense?.card?.declaration!=='apache-2.0'
  ||source.pinnedLicense?.card?.declaration!=='apache-2.0'
  ||source.readme?.license?.declaration!=='apache-2.0'||source.readme?.sha256!==c.readme
  ||!read('config.json',c.config)||!read('tokenizer_config.json',c.tokenizer)
  ||!read('modules.json',c.modules)||!read('1_Pooling/config.json',c.pooling)
  ||!Array.isArray(source.moduleOrder)||source.moduleOrder.join(',')!=='Transformer,Pooling'
  ||source.projection!==null||source.normalizationDeclared!==false
  ||input?.architecture!=='XLMRobertaModel'||input.hiddenDimension!==c.dimension
  ||input.remoteCodeDeclarationPresent!==false||source.pooling?.dimension!==c.dimension
  ||modes?.pooling_mode_mean_tokens!==true
  ||['pooling_mode_cls_token','pooling_mode_max_tokens','pooling_mode_mean_sqrt_len_tokens']
    .some(key=>modes?.[key]!==false)
  ||['pooling_mode_weightedmean_tokens','pooling_mode_lasttoken']
    .some(key=>modes?.[key]!==false&&modes?.[key]!==null)
  ||!Number.isSafeInteger(input.sentenceTransformerLimit)||input.sentenceTransformerLimit<1
  ||input.sentenceTransformerLimit>512||!Number.isSafeInteger(input.tokenizerDeclaredLimit)
  ||input.sentenceTransformerLimit>input.tokenizerDeclaredLimit
  ||!read('sentence_bert_config.json',source.sentenceTransformerConfiguration?.sha256)
  ||!hash(source.sentenceTransformerConfiguration?.sha256)
  ||!source.inventory?.onnxFiles?.includes(c.asset))reject();
 return Object.freeze({dimension:c.dimension,maximumTokens:input.sentenceTransformerLimit,
  artifact:c.asset,labInputPrefix:'',pooling:'masked_mean_then_cosine_normalization',
  productionAdmission:false,conversionEquivalence:'NOT_VERIFIED'});
}
export async function observePublicXlmAsset({fetcher=fetch}={}){
 const c=PUBLIC_XLM_EMBEDDING;
 const response=await fetcher('https://huggingface.co/'+c.id+'/resolve/'+c.revision+'/'+c.asset,
  {method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(20000),headers:{Accept:'application/octet-stream'}});
 if(![200,302,303,307,308].includes(response.status))reject();
 const raw=response.headers?.get('x-linked-size')??
  (response.status===200?response.headers?.get('content-length'):null);
 const digest=response.headers?.get('x-linked-etag')?.replace(/^"|"$/g,'');
 if(typeof raw!=='string'||!/^[1-9][0-9]{0,9}$/.test(raw)||!hash(digest))reject();
 const bytes=Number(raw);
 if(!Number.isSafeInteger(bytes)||bytes>c.maximumArtifactBytes)reject();
 return Object.freeze({asset:c.asset,bytes,sha256:digest,pinnedRevision:c.revision,
  bodyRequested:false,productionAdmission:false});
}
export function admitPublicXlmTokenInputs(names,tokens,contract){
 if(contract?.dimension!==PUBLIC_XLM_EMBEDDING.dimension
  ||!Number.isSafeInteger(contract.maximumTokens)||contract.maximumTokens<1
  ||contract.maximumTokens>512||contract.productionAdmission!==false)reject();
 const original=admitOfficialTokenInputs(names,tokens);
 if(tokens.input_ids.dims[1]>contract.maximumTokens)reject();
 // Detached actual returned tensors, never fabricated segments or sliced text.
 return Object.freeze(Object.fromEntries(Object.entries(original).map(([name,tensor])=>
  [name,Object.freeze({type:tensor.type,dims:Object.freeze([...tensor.dims]),
    data:new BigInt64Array(tensor.data)})])));
}
export function poolPublicXlmDense(output,mask,contract){
 if(contract?.dimension!==PUBLIC_XLM_EMBEDDING.dimension
  ||!Number.isSafeInteger(contract.maximumTokens)||contract.maximumTokens<1
  ||contract.maximumTokens>512||contract.productionAdmission!==false
  ||!Array.isArray(output?.dims)||output.dims[1]>contract.maximumTokens)reject();
 return meanPoolOfficialDense(output,mask,contract.dimension);
}


// DistilUSE is a separate bounded lab contract. Missing optional tokenizer
// declarations never authorize AutoTokenizer's generic fallback. The caller
// must execute the explicitly selected pinned DistilBertTokenizer on FULL text.
export const PUBLIC_DISTILUSE_EMBEDDING=Object.freeze({
 id:'sentence-transformers/distiluse-base-multilingual-cased-v1',
 revision:'826fee3d516ebb14987355af373f5b69101c7006',
 readme:'8422376ace4232543fd22f72c98db8b66b97e98b5c8436102f464e4c7efd6c6a',
 config:'3160640e4ce35901d951dc929e803c828d4b086fb309dd12369f4106d66ade4f',
 tokenizer:'80d83a2078632f19353e410c7d7d2582d6f44a9818effa5114cc1146dd71ac8b',
 modules:'f83ea5d68ac85ec15f650b350f0dc37b03d63abd60442f518e14c06f479beee6',
 sentence:'70f4448f31320443fe3557cacea5abf2dcc4915dda8c80646bec9f3bb0aa5a1f',
 pooling:'a37f83ada23e7887be6b88f4998927dbeac0038af301553c7cd5461413bf1a56',
 projectionConfig:'3f8cb931199629aac321339504a3258b5de76b568bf718d724cd921bcd22bd14',
 asset:'onnx/model_quint8_avx2.onnx',projectionAsset:'2_Dense/model.safetensors',
 encoderDimension:768,dimension:512,maximumTokens:128,
 maximumArtifactBytes:384*1024*1024,maximumProjectionBytes:2*1024*1024
});
const distilContracts=new WeakSet(),denseProjections=new WeakSet();
export function preparePublicDistiluseContract(source){
 const c=PUBLIC_DISTILUSE_EMBEDDING,input=source?.inputContract,modes=source?.pooling?.modes;
 const read=(file,digest)=>Array.isArray(source?.configurationFiles)
  &&source.configurationFiles.filter(x=>x?.file===file).length===1
  &&source.configurationFiles.some(x=>x.file===file&&x.httpStatus===200&&x.bounded===true&&x.sha256===digest);
 if(source?.repository!==c.id||source.revision!==c.revision
  ||source.diagnosis!=='CONSISTENT_DECLARED_SOURCE_PENDING_INPUT_AND_QUALITY'
  ||source.weightsDownloaded!==false||source.inferenceExecuted!==false||source.productionClaim!==false
  ||source.modelAdmission!=='NOT_AUTHORIZED'
  ||[source.currentLicense?.card,source.pinnedLicense?.card,source.readme?.license]
   .some(x=>x?.permitted!==true||x?.declaration!=='apache-2.0')
  ||source.readme?.sha256!==c.readme
  ||!read('config.json',c.config)||!read('tokenizer_config.json',c.tokenizer)
  ||!read('modules.json',c.modules)||!read('sentence_bert_config.json',c.sentence)
  ||!read('1_Pooling/config.json',c.pooling)||!read('2_Dense/config.json',c.projectionConfig)
  ||source.moduleOrder?.join(',')!=='Transformer,Pooling,Dense'||source.normalizationDeclared!==false
  ||input?.architecture!=='DistilBertModel'||input.hiddenDimension!==c.encoderDimension
  ||input.layers!==6||input.positionLimit!==512||input.sentenceTransformerLimit!==c.maximumTokens
  ||input.remoteCodeDeclarationPresent!==false
  ||!['OTHER_OR_UNVERIFIED','DistilBertTokenizer','DistilBertTokenizerFast'].includes(input.tokenizerClass)
  ||!(input.tokenizerDeclaredLimit===null
    ||Number.isSafeInteger(input.tokenizerDeclaredLimit)&&input.tokenizerDeclaredLimit>=c.maximumTokens
      &&input.tokenizerDeclaredLimit<=512)
  ||source.pooling?.dimension!==c.encoderDimension||modes?.pooling_mode_mean_tokens!==true
  ||['pooling_mode_cls_token','pooling_mode_max_tokens','pooling_mode_mean_sqrt_len_tokens']
   .some(key=>modes?.[key]!==false)
  ||['pooling_mode_weightedmean_tokens','pooling_mode_lasttoken']
   .some(key=>modes?.[key]!==false&&modes?.[key]!==null)
  ||source.projection?.inputDimension!==c.encoderDimension||source.projection.outputDimension!==c.dimension
  ||source.projection.bias!==true||source.projection.activation!=='torch.nn.modules.activation.Tanh'
  ||!source.inventory?.onnxFiles?.includes(c.asset)
  ||!source.inventory?.safeProjectionFiles?.includes(c.projectionAsset))reject();
 const result=Object.freeze({candidate:c.id,dimension:c.dimension,encoderDimension:c.encoderDimension,
  maximumTokens:c.maximumTokens,artifact:c.asset,projectionArtifact:c.projectionAsset,
  tokenizerClass:'DistilBertTokenizer',inputExecutionRequired:true,productionAdmission:false,
  pooling:'masked_mean_then_dense_tanh_then_cosine_normalization',conversionEquivalence:'NOT_VERIFIED'});
 distilContracts.add(result);return result;
}
export function admitPublicDistiluseTokenInputs(names,tokens,contract,tokenizer){
 if(!distilContracts.has(contract)||tokenizer?.constructor?.name!==contract.tokenizerClass
  ||!Array.isArray(names)||names.length!==2||new Set(names).size!==2
  ||!names.includes('input_ids')||!names.includes('attention_mask'))reject();
 // Full observed tensors only. No max_length override, slicing, artificial
 // segment IDs, preprocessing prefix or invented tokenizer configuration.
 const actual=admitOfficialTokenInputs(names,tokens);
 if(tokens.input_ids.dims[1]>contract.maximumTokens)reject();
 return Object.freeze(Object.fromEntries(Object.entries(actual).map(([name,tensor])=>
  [name,Object.freeze({type:tensor.type,dims:Object.freeze([...tensor.dims]),
   data:new BigInt64Array(tensor.data)})])));
}
export async function observePublicDistiluseAssets({fetcher=fetch}={}){
 const c=PUBLIC_DISTILUSE_EMBEDDING,receipts=[];
 for(const asset of [c.asset,c.projectionAsset]){
  const response=await fetcher('https://huggingface.co/'+c.id+'/resolve/'+c.revision+'/'+asset,
   {method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(20000),headers:{Accept:'application/octet-stream'}});
  if(![200,302,303,307,308].includes(response.status))reject();
  const raw=response.headers?.get('x-linked-size')??
   (response.status===200?response.headers?.get('content-length'):null);
  const sha256=response.headers?.get('x-linked-etag')?.replace(/^"|"$/g,'');
  if(typeof raw!=='string'||!/^[1-9][0-9]{0,9}$/.test(raw)||!hash(sha256))reject();
  const bytes=Number(raw);
  if(!Number.isSafeInteger(bytes)||bytes>c.maximumArtifactBytes
   ||asset===c.projectionAsset&&bytes>c.maximumProjectionBytes)reject();
  receipts.push(Object.freeze({asset,bytes,sha256,pinnedRevision:c.revision,bodyRequested:false,
   productionAdmission:false}));
 }
 if(receipts.reduce((sum,x)=>sum+x.bytes,0)>c.maximumArtifactBytes)reject();
 return Object.freeze(receipts);
}
// JSON.parse alone silently accepts duplicate tensor names and offsets.
// This bounded grammar walk rejects duplicates at every object depth BEFORE
// consuming the separately validated JSON value; no model-provided code runs.
function uniqueHeaderJson(text){
 let i=0,keys=0;
 const space=()=>{while(i<text.length&&/\s/.test(text[i]))i++;};
 function string(){
  const match=/^"(?:[^"\\\u0000-\u001f]|\\["\\\/bfnrt]|\\u[0-9a-fA-F]{4})*"/.exec(text.slice(i));
  if(!match)reject();i+=match[0].length;return JSON.parse(match[0]);
 }
 function value(depth){
  if(depth>8)reject();space();
  if(text[i]==='{'){
   i++;space();const seen=new Set();
   if(text[i]==='}'){i++;return;}
   for(;;){
    space();const key=string();if(seen.has(key)||++keys>64)reject();seen.add(key);
    space();if(text[i++]!==':')reject();value(depth+1);space();
    const end=text[i++];if(end==='}')return;if(end!==',')reject();
   }
  }
  if(text[i]==='['){
   i++;space();if(text[i]===']'){i++;return;}
   for(;;){value(depth+1);space();const end=text[i++];if(end===']')return;if(end!==',')reject();}
  }
  if(text[i]==='"'){string();return;}
  const primitive=/^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(text.slice(i));
  if(!primitive)reject();i+=primitive[0].length;
 }
 value(0);space();if(i!==text.length)reject();return JSON.parse(text);
}
export function decodePublicDistiluseProjection(payload,receipt,contract){
 const c=PUBLIC_DISTILUSE_EMBEDDING;
 if(!distilContracts.has(contract)||!(payload instanceof Uint8Array)
  ||receipt?.asset!==c.projectionAsset||receipt.pinnedRevision!==c.revision
  ||receipt.productionAdmission!==false||!hash(receipt.sha256)
  ||!Number.isSafeInteger(receipt.bytes)||payload.byteLength!==receipt.bytes
  ||payload.byteLength<8||payload.byteLength>c.maximumProjectionBytes)reject();
 // Copy before hashing/parsing so a caller cannot mutate admitted weights.
 const bytes=new Uint8Array(payload);
 if(denseHash(bytes)!==receipt.sha256)reject();
 const view=new DataView(bytes.buffer),length=view.getBigUint64(0,true);
 if(length<2n||length>16384n||length>BigInt(bytes.length-8))reject();
 const start=8+Number(length);
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(8,start));
 const header=uniqueHeaderJson(text);
 if(!header||typeof header!=='object'||Array.isArray(header)
  ||Object.keys(header).some(key=>!['linear.weight','linear.bias','__metadata__'].includes(key))
  ||!Object.hasOwn(header,'linear.weight')||!Object.hasOwn(header,'linear.bias'))reject();
 if(Object.hasOwn(header,'__metadata__')){
  const meta=header.__metadata__;
  if(!meta||typeof meta!=='object'||Array.isArray(meta)||Object.keys(meta).length>16
   ||Object.entries(meta).some(([k,v])=>k.length>128||typeof v!=='string'||v.length>256))reject();
 }
 const ranges=[],arrays={};
 for(const [name,shape] of [['linear.weight',[512,768]],['linear.bias',[512]]]){
  const tensor=header[name],count=shape.reduce((a,b)=>a*b,1);
  if(!tensor||typeof tensor!=='object'||Array.isArray(tensor)
   ||Object.keys(tensor).sort().join(',')!=='data_offsets,dtype,shape'
   ||tensor.dtype!=='F32'||!Array.isArray(tensor.shape)||tensor.shape.join(',')!==shape.join(',')
   ||tensor.shape.some(x=>!Number.isSafeInteger(x))
   ||!Array.isArray(tensor.data_offsets)||tensor.data_offsets.length!==2
   ||tensor.data_offsets.some(x=>!Number.isSafeInteger(x)||x<0||x%4!==0))reject();
  const [from,to]=tensor.data_offsets;
  if(to-from!==count*4||to>bytes.length-start)reject();
  ranges.push([from,to]);
  const result=new Float32Array(count);
  for(let j=0;j<count;j++){
   result[j]=view.getFloat32(start+from+j*4,true);if(!Number.isFinite(result[j]))reject();
  }
  arrays[name]=result;
 }
 ranges.sort((a,b)=>a[0]-b[0]);
 if(ranges[0][0]!==0||ranges[0][1]!==ranges[1][0]||ranges[1][1]!==bytes.length-start)reject();
 const project=mean=>{
  if(!(mean instanceof Float64Array)||mean.length!==768||mean.some(x=>!Number.isFinite(x)))reject();
  const out=new Float32Array(512),weight=arrays['linear.weight'],bias=arrays['linear.bias'];
  for(let row=0;row<512;row++){
   let sum=bias[row];for(let col=0;col<768;col++)sum+=weight[row*768+col]*mean[col];
   if(!Number.isFinite(sum))reject();out[row]=Math.tanh(sum);
  }
  return out;
 };
 const result=Object.freeze({sha256:receipt.sha256,bytes:bytes.length,inputDimension:768,outputDimension:512,
  activation:'Tanh',weightsPrivateToProjection:true,productionAdmission:false,project});
 denseProjections.add(result);return result;
}
export function poolPublicDistiluseDense(output,mask,contract,projection){
 if(!distilContracts.has(contract)||!denseProjections.has(projection)
  ||output?.type!=='float32'||!(output.data instanceof Float32Array)
  ||!Array.isArray(output.dims)||output.dims.length!==3||output.dims[0]!==1||output.dims[2]!==768
  ||!Number.isSafeInteger(output.dims[1])||output.dims[1]<1||output.dims[1]>128
  ||output.data.length!==output.dims[1]*768||output.data.some(x=>!Number.isFinite(x))
  ||mask?.type!=='int64'||!(mask.data instanceof BigInt64Array)
  ||!Array.isArray(mask.dims)||mask.dims.join(',')!=='1,'+output.dims[1]
  ||mask.data.length!==output.dims[1]||mask.data.some(x=>x!==0n&&x!==1n))reject();
 const mean=new Float64Array(768);let count=0;
 for(let token=0;token<mask.data.length;token++)if(mask.data[token]===1n){
  count++;for(let col=0;col<768;col++)mean[col]+=output.data[token*768+col];
 }
 if(!count)reject();for(let col=0;col<768;col++)mean[col]/=count;
 // Preserve the unnormalized mean into official biased Dense/Tanh. Only the
 // final 512-dimensional retrieval vector receives cosine normalization.
 const out=projection.project(mean);
 let norm=0;for(const x of out)norm+=x*x;
 norm=Math.sqrt(norm);if(!Number.isFinite(norm)||norm===0)reject();
 for(let col=0;col<out.length;col++)out[col]/=norm;
 return Object.freeze(Array.from(out));
}
