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
