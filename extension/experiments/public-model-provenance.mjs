// Bounded PUBLIC model-source diagnosis. Never downloads weights or admits a model.
import {createHash} from 'node:crypto';
export const PUBLIC_MODELS=Object.freeze(['Xenova/multilingual-e5-small','intfloat/multilingual-e5-small']);
const sha=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const hash=text=>createHash('sha256').update(text).digest('hex');
const code=value=>value==='mit'?'mit':value==='apache-2.0'?'apache-2.0':
  value===undefined?'missing':'other';
export function observeLicense(value) {
  return {type:value===undefined?'missing':value===null?'null':
    Array.isArray(value)?'array':typeof value==='string'?'string':'other',
    declaration:code(value),permitted:['mit','apache-2.0'].includes(value)};
}
export function observeReadmeLicense(text) {
  // Inspect only one literal YAML front matter declaration. This is diagnosis,
  // not a general YAML parser or legal/conversion/provenance admission.
  const lines=text.replaceAll('\r\n','\n').split('\n');
  if(lines[0]!=='---')return {state:'missing',...observeLicense(undefined)};
  const end=lines.indexOf('---',1);
  if(end<0)return {state:'malformed',...observeLicense(undefined)};
  const declarations=lines.slice(1,end).filter(line=>/^license\s*:/.test(line));
  if(declarations.length!==1)return {state:declarations.length?'ambiguous':'missing',
    ...observeLicense(undefined)};
  const match=declarations[0].match(/^license\s*:\s*(mit|apache-2\.0|'mit'|'apache-2\.0'|"mit"|"apache-2\.0")\s*$/);
  if(!match)return {state:'unrecognized',...observeLicense('other')};
  return {state:'literal',...observeLicense(match[1].replaceAll(/['"]/g,''))};
}
async function readPublic(url,fetcher,maxBytes) {
  const response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(20000),
    headers:{Accept:'application/json, text/plain'}});
  const receipt={httpStatus:Number.isInteger(response.status)?response.status:0};
  if(response.status!==200)return {receipt};
  const text=await response.text();
  const bytes=Buffer.byteLength(text);
  receipt.bytes=bytes;
  if(bytes>maxBytes){receipt.bounded=false;return {receipt};}
  receipt.bounded=true;receipt.sha256=hash(text);
  return {receipt,text};
}
function identity(data,id,revision) {
  return data?.id===id&&sha(data.sha)&&(!revision||data.sha===revision)
    &&data.private===false&&data.gated===false;
}
function metadataObservation(data,id,revision) {
  return {identityVerified:identity(data,id,revision),idMatches:data?.id===id,
    revisionFormatValid:sha(data?.sha),revisionMatches:!revision||data?.sha===revision,
    publicModel:data?.private===false,ungated:data?.gated===false,
    cardDataPresent:Object.hasOwn(data??{},'cardData'),
    cardLicense:observeLicense(data?.cardData?.license),
    tagLicenseCodes:Array.isArray(data?.tags)
      ?[...new Set(data.tags.filter(tag=>typeof tag==='string'&&tag.startsWith('license:'))
        .map(tag=>code(tag.slice(8))))].sort():[]};
}
export async function inspectPublicModel(id,{fetcher=fetch}={}) {
  if(!PUBLIC_MODELS.includes(id))throw new Error('public_model_not_allowlisted');
  const result={repository:id,modelAdmission:'NOT_AUTHORIZED',
    conversionEquivalence:'NOT_VERIFIED',weightsDownloaded:false};
  try {
    const first=await readPublic('https://huggingface.co/api/models/'+id,fetcher,1024*1024);
    result.currentMetadata=first.receipt;
    if(first.text===undefined){result.diagnosis='METADATA_UNAVAILABLE';return result;}
    const current=JSON.parse(first.text);
    result.currentMetadata.observation=metadataObservation(current,id);
    if(!identity(current,id)){result.diagnosis='IDENTITY_UNVERIFIED';return result;}
    result.revision=current.sha;
    const pinned=await readPublic('https://huggingface.co/api/models/'+id+
      '/revision/'+current.sha,fetcher,1024*1024);
    result.pinnedMetadata=pinned.receipt;
    if(pinned.text===undefined){result.diagnosis='PINNED_METADATA_UNAVAILABLE';return result;}
    const data=JSON.parse(pinned.text);
    result.pinnedMetadata.observation=metadataObservation(data,id,current.sha);
    if(!identity(data,id,current.sha)){result.diagnosis='PINNED_IDENTITY_UNVERIFIED';return result;}
    // No ambient URL, redirection, arbitrary file or advertised external link.
    const files=Array.isArray(data.siblings)?data.siblings.map(item=>item.rfilename):[];
    if(files.includes('README.md')) {
      const readme=await readPublic('https://huggingface.co/'+id+'/raw/'+current.sha+
        '/README.md',fetcher,256*1024);
      result.readme={...readme.receipt,
        license:observeReadmeLicense(readme.text??'')};
    }
    result.licenseFiles=[];
    for(const file of ['LICENSE','LICENSE.txt','LICENSE.md'].filter(name=>files.includes(name))) {
      const evidence=await readPublic('https://huggingface.co/'+id+'/raw/'+current.sha+
        '/'+file,fetcher,64*1024);
      result.licenseFiles.push({file,...evidence.receipt,
        recognizedTitle:evidence.text?.includes('MIT License')?'MIT_TITLE':
          evidence.text?.includes('Apache License')?'APACHE_TITLE':'UNRECOGNIZED'});
    }
    const a=result.currentMetadata.observation.cardLicense;
    const b=result.pinnedMetadata.observation.cardLicense;
    const c=result.readme?.license;
    result.diagnosis=a.permitted&&b.permitted&&c?.permitted
      &&a.declaration===b.declaration&&b.declaration===c.declaration
      ?'CONSISTENT_LITERAL_DECLARATIONS'
      :a.type==='missing'&&b.permitted?'DEFAULT_METADATA_FIELD_OMITTED'
      :a.type==='missing'&&b.type==='missing'&&c?.permitted
        ?'API_CARD_FIELD_MISSING_README_DECLARED'
      :(a.permitted||b.permitted||c?.permitted)?'DECLARATIONS_NOT_CONSISTENT'
      :'PERMISSIBLE_DECLARATION_UNVERIFIED';
    return result;
  } catch(error) {
    result.diagnosis='SOURCE_INSPECTION_UNAVAILABLE';
    result.errorClass=['Error','SyntaxError','TypeError','AbortError','TimeoutError']
      .includes(error?.name)?error.name:'Other';
    return result;
  }
}
