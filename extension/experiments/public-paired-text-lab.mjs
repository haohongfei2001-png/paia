// Node-only public paired-text lab. No product imports, probabilities or model admission.
export const PAIRED_LAB_POLICY=Object.freeze({
 model:'cross-encoder/mmarco-mMiniLMv2-L12-H384-v1',
 revision:'1427fd652930e4ba29e8149678df786c240d8825',
 readmeSha256:'474736a65d6393a060119a8dc304563af67af4d8d86ccfee4a05dd0df107fc11',
 configSha256:'cc2cfe51aa3fd759d21d21acf5dfd6994aa67a3c9210636d22e143699d336c77',
 tokenizerConfigSha256:'e7fbfbfa6347b4e414c1cee50d142e2c2f9a895dad68b068ae83a8b564c3837e',
 method:'official-mmarco-paired-logit-lab-v1',maximumTokens:512,
 transform:'monotonic_lab_sigmoid_of_raw_single_logit_not_probability',
 truncation:false,productionClaim:false
});
const fail=()=>{throw Error('invalid public paired-text lab contract');};
const text=v=>typeof v==='string'&&v.trim().length>0;
export function admitPairedSource(source){
 const p=PAIRED_LAB_POLICY,c=source?.inputContract;
 if(source?.repository!==p.model||source.revision!==p.revision
  ||source.diagnosis!=='CONSISTENT_DECLARED_SOURCE_PENDING_INPUT_AND_QUALITY'
  ||source.currentLicense?.card?.declaration!=='apache-2.0'
  ||source.pinnedLicense?.card?.declaration!=='apache-2.0'
  ||source.readme?.license?.declaration!=='apache-2.0'
  ||source.readme?.sha256!==p.readmeSha256||source.config?.sha256!==p.configSha256
  ||source.tokenizerConfig?.sha256!==p.tokenizerConfigSha256
  ||c?.architecture!=='XLMRobertaForSequenceClassification'||c.hiddenDimension!==384
  ||c.layers!==12||c.positionLimit!==514||c.outputLabels!==1
  ||c.tokenizerClass!=='XLMRobertaTokenizer'||c.tokenizerDeclaredLimit!==512
  ||c.remoteCodeDeclarationPresent!==false)fail();
 return true;
}
export function admitPairedTokenInputs(inputNames,tokens){
 if(!Array.isArray(inputNames)||inputNames.length<2||inputNames.length>3
  ||new Set(inputNames).size!==inputNames.length
  ||inputNames.some(n=>!['input_ids','attention_mask','token_type_ids'].includes(n))
  ||!inputNames.includes('input_ids')||!inputNames.includes('attention_mask'))fail();
 const n=tokens?.input_ids?.dims?.[1];
 if(!Number.isSafeInteger(n)||n<1||n>PAIRED_LAB_POLICY.maximumTokens)fail();
 const feeds={};
 for(const name of inputNames){
  const t=tokens?.[name];
  if(t?.type!=='int64'||!Array.isArray(t.dims)||t.dims.length!==2
   ||t.dims[0]!==1||t.dims[1]!==n||!(t.data instanceof BigInt64Array)
   ||t.data.length!==n)fail();
  if(name==='input_ids'&&t.data.some(v=>v<0n))fail();
  if(name!=='input_ids'&&t.data.some(v=>v!==0n&&v!==1n))fail();
  if(name==='attention_mask'&&!t.data.some(v=>v===1n))fail();
  // Copy actual tokenizer tensors; never synthesize ids/masks/segments.
  feeds[name]={type:t.type,dims:[...t.dims],data:new BigInt64Array(t.data)};
 }
 return feeds;
}
export function pairedLogitScore(outputs){
 if(!outputs||typeof outputs!=='object'||Object.keys(outputs).join(',')!=='logits')fail();
 const t=outputs.logits;
 if(t?.type!=='float32'||!Array.isArray(t.dims)||t.dims.length!==2
  ||t.dims[0]!==1||t.dims[1]!==1||!(t.data instanceof Float32Array)
  ||t.data.length!==1||!Number.isFinite(t.data[0]))fail();
 const x=t.data[0];
 // Explicit lab transform is monotonic, including negative logits. A one-label
 // generic softmax would be constant one and cannot rank query/document pairs.
 return x>=0?1/(1+Math.exp(-x)):Math.exp(x)/(1+Math.exp(x));
}
export function createPairedTextScorer({tokenize,run,inputNames}={}){
 if(typeof tokenize!=='function'||typeof run!=='function')fail();
 // Validate names before reading any content; real tensor checks remain per pair.
 if(!Array.isArray(inputNames)||new Set(inputNames).size!==inputNames.length
  ||inputNames.length<2||inputNames.length>3
  ||inputNames.some(n=>!['input_ids','attention_mask','token_type_ids'].includes(n))
  ||!inputNames.includes('input_ids')||!inputNames.includes('attention_mask'))fail();
 const names=Object.freeze([...inputNames]);
 let pairs=0,maximumObservedTokens=0;
 const score=async(scope,query)=>{
  if(!Array.isArray(scope)||!text(query))fail();
  const seen=new Set(),documents=scope.map(r=>{
   if(!r||!text(r.id)||seen.has(r.id)||typeof r.title!=='string'
    ||!text(r.body)||r.excluded===true)fail();
   seen.add(r.id);return Object.freeze({id:r.id,document:r.title+'\n'+r.body});
  });
  const rows=[];
  for(const {id,document} of documents){
   const tokens=await tokenize(query,{text_pair:document,padding:false,truncation:false,
    return_token_type_ids:names.includes('token_type_ids')});
   const feeds=admitPairedTokenInputs(names,tokens);
   const output=await run(feeds);
   const value=pairedLogitScore(output);
   pairs++;maximumObservedTokens=Math.max(maximumObservedTokens,feeds.input_ids.dims[1]);
   rows.push({id,score:value});
  }
  return rows;
 };
 return Object.freeze({score,observation:()=>Object.freeze({pairs,maximumObservedTokens,
  pairTokenization:'EXPLICIT_QUERY_DOCUMENT_PAIR',truncation:false,
  fabricatedTokenInputs:false,transform:PAIRED_LAB_POLICY.transform,productionClaim:false})});
}
