import {ArchiveError} from './constants.js';
import {parseReadConnectorRequest,sealReadConnectorResult,
 READ_CONNECTOR_TOOLS} from './read-connector-contract.js';

// CPV1-08.2 synthetic trusted-boundary kernel. No listener, grant issuer,
// storage reader or product entrypoint imports this module. The trusted host
// must resolve the connection binding and perform source-side scoped reads.
const denied=()=>{throw new ArchiveError('MEMORY_DENIED');};
const unavailable=()=>{throw new ArchiveError('MEMORY_UNAVAILABLE');};
const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)
 &&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null)
 &&Reflect.ownKeys(value).every(key=>typeof key==='string'
   &&Object.getOwnPropertyDescriptor(value,key)?.enumerable===true
   &&'value' in Object.getOwnPropertyDescriptor(value,key));
const boundedId=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const unique=(value,allowed)=>Array.isArray(value)&&value.length>0
 &&value.length<=allowed.length&&value.every(x=>allowed.includes(x))
 &&new Set(value).size===value.length;
const KINDS=['topic','input','thought'];
const kindOf=ref=>({input:'input',source:'input',thought:'thought',
 ai:'topic',topic_note:'topic'})[ref?.kind];
const scopeAllows=(grant,request)=>{
 if(!grant.allowedTools.includes(request.tool))denied();
 const kinds=request.tool==='list_material'||request.tool==='query'
  ?request.args.kinds:request.tool==='get_by_ref'?[kindOf(request.args.ref)]:[];
 if(kinds.some(kind=>!grant.allowedKinds.includes(kind)))denied();
};
const authority=(value,request,at)=>{
 if(!isRecord(value)||!boundedId(value.grantId)||!boundedId(value.consumer)
    ||!boundedId(value.profileId)||value.permission!=='read_connector'
    ||value.purpose!=='read_only_query'||value.resourceScope!=='profile'
    ||!Number.isSafeInteger(value.scopeRevision)||value.scopeRevision<0
    ||!unique(value.allowedTools,READ_CONNECTOR_TOOLS)
    ||!unique(value.allowedKinds,KINDS)
    ||typeof value.expiresAt!=='number'||!Number.isFinite(value.expiresAt)
    ||value.expiresAt<=at||value.revokedAt!==null)denied();
 scopeAllows(value,request);
 return Object.freeze({grantId:value.grantId,consumer:value.consumer,
  profileId:value.profileId,permission:value.permission,purpose:value.purpose,
  resourceScope:value.resourceScope,scopeRevision:value.scopeRevision,
  allowedTools:Object.freeze([...value.allowedTools]),
  allowedKinds:Object.freeze([...value.allowedKinds]),
  expiresAt:value.expiresAt});
};
const same=(a,b)=>a.grantId===b.grantId&&a.consumer===b.consumer
 &&a.profileId===b.profileId&&a.scopeRevision===b.scopeRevision
 &&a.expiresAt===b.expiresAt
 &&JSON.stringify(a.allowedTools)===JSON.stringify(b.allowedTools)
 &&JSON.stringify(a.allowedKinds)===JSON.stringify(b.allowedKinds);

// The local rate bound is defense in depth for this single process, not a
// distributed quota. Production admission still needs its own trusted host.
export function createReadConnectorBoundary({authorize,read,clock=()=>Date.now()}={}){
 if(typeof authorize!=='function'||typeof read!=='function'
    ||typeof clock!=='function')throw new ArchiveError('INVALID_REQUEST');
 const use=new Map(),tails=new Map();
 async function handle(binding,request){
  const parsed=parseReadConnectorRequest(request);
  if(!boundedId(binding))throw new ArchiveError('INVALID_REQUEST');
  // Serialize one binding so concurrent requests cannot evade its local bound.
  const prior=tails.get(binding)||Promise.resolve();
  const job=prior.catch(()=>{}).then(async()=>{
   let before;
   try{before=authority(await authorize(binding,parsed),parsed,clock());}
   catch{denied();}
   const at=clock(),key=before.grantId;
   const bucket=use.get(key),start=bucket&&at-bucket.start<60000?bucket.start:at;
   const calls=start===bucket?.start?bucket.calls:0;
   if(calls>=60)throw new ArchiveError('MEMORY_LIMIT');
   use.set(key,{start,calls:calls+1});
   let result;
   try{result=await read(parsed,Object.freeze({grantId:before.grantId,
    consumer:before.consumer,profileId:before.profileId,
    scopeRevision:before.scopeRevision,allowedKinds:before.allowedKinds}));}
   catch{unavailable();}
   let after;
   try{after=authority(await authorize(binding,parsed),parsed,clock());}
   catch{denied();}
   if(!same(before,after))denied();
   return sealReadConnectorResult({tool:parsed.tool,args:parsed.args},result);
  });
  tails.set(binding,job);
  try{return await job;}finally{if(tails.get(binding)===job)tails.delete(binding);}
 }
 return Object.freeze({handle});
}
