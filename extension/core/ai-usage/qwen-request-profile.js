// Dormant, pure compiler of partial generation controls and usage-parser binding.
// One synthetic metadata snapshot, not a registry, signature or dispatch grant.
// No body/evidence reader, tokenizer, provider, account, price or persistence.
import {ENVELOPES} from './admission-policy.js';
import {canonical} from './contracts.js';
import {createQwenJsonUsageParser} from './qwen-usage-parser.js';

const own=(o,k)=>Object.hasOwn(o,k);
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const positive=n=>integer(n)&&n>0;
const token=s=>typeof s==='string'&&/^[A-Za-z0-9:._/-]{1,200}$/.test(s);
const digest=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const plain=o=>!!o&&typeof o==='object'&&!Array.isArray(o)&&[Object.prototype,null].includes(Object.getPrototypeOf(o));
const exact=(o,keys)=>plain(o)&&Object.keys(o).length===keys.length&&keys.every(k=>own(o,k));
const list=a=>Array.isArray(a)&&a.length>0&&a.length<=8&&a.every(token)&&new Set(a).size===a.length;
const limitKeys=['maxBytes','maxFrames','maxDepth','maxKeys','maxStringBytes','inputTokens','billableOutputCap'];
const correspondence=['id','jobType','contractVersion','routeVersion','endpoint','model','apiProfileId','usageProfile','tokenizerProfileId','decodingPolicyId','responseSchemaDigest','qualityReceiptRefs'];
const encoder=new TextEncoder(),failures=new WeakSet();
const stop=reason=>{const e=Object.freeze({reason});failures.add(e);throw e;};
const unavailable=reason=>({status:'UNAVAILABLE',reason,sourceKind:'SYNTHETIC_PROFILE',qualification:'NOT_ESTABLISHED',wireComplete:false,inputBoundQualified:false,financialAuthority:false,dispatchAllowed:false});

// Finite own-data metadata only. Accessors, prototypes, cycles, sparse arrays
// and symbols are refused without reading their values. Proxy traps cannot be
// time-bounded by this API; it makes no claim to certify arbitrary caller code.
function snapshot(value){
 let keys=0,bytes=0;const seen=new WeakSet();
 const charge=n=>{bytes+=n;if(bytes>16384)stop('METADATA_BOUND');};
 const string=s=>{if(s.length>200)stop('METADATA_BOUND');charge(encoder.encode(s).length);return s;};
 function visit(v,depth){
  if(depth>6)stop('METADATA_BOUND');
  if(v===null||typeof v==='boolean'){charge(5);return v;}
  if(typeof v==='string')return string(v);
  if(typeof v==='number'){if(!Number.isFinite(v))stop('METADATA_INVALID');charge(24);return v;}
  if(!v||typeof v!=='object'||seen.has(v))stop('METADATA_INVALID');seen.add(v);
  const array=Array.isArray(v);if(!array&&!plain(v))stop('METADATA_INVALID');
  const names=Reflect.ownKeys(v);if(names.length>256-keys)stop('METADATA_BOUND');
  if(names.some(k=>typeof k!=='string'))stop('METADATA_INVALID');
  keys+=names.length;charge(2+names.length);
  let length;
  if(array){
   const d=Object.getOwnPropertyDescriptor(v,'length');
   if(!d||!own(d,'value')||!integer(d.value)||d.value>256)stop('METADATA_BOUND');length=d.value;
   if(names.length!==length+1||names.some(k=>k!=='length'&&!/^(0|[1-9][0-9]*)$/.test(k)))stop('METADATA_INVALID');
  }
  const out=array?[]:Object.create(null);
  for(const k of names){
   if(array&&k==='length')continue;
   const d=Object.getOwnPropertyDescriptor(v,k);
   if(!d||!d.enumerable||!own(d,'value')||array&&Number(k)>=length)stop('METADATA_INVALID');
   if(!array)string(k);out[k]=visit(d.value,depth+1);
  }
  return out;
 }
 return visit(value,0);
}

function binding(profile,childId,limits){
 return {version:1,childId,requestedModel:profile.model.requested,responseModels:[...profile.model.responseAllowlist],thinkingEnabled:profile.thinking.enabled,profile:structuredClone(profile.usageProfile),limits:{...limits}};
}
// Reuse the original structural binding owner without a response, wire data or
// provider. No second copy of its limits/usage-profile interpretation is minted.
function readableBinding(b){
 return createQwenJsonUsageParser({binding:b,httpStatus:200}).finish({transportComplete:false,cancelled:true}).reason==='TRANSPORT_INCOMPLETE';
}

function prepare(options){
 const o=snapshot(options);
 if(!exact(o,['profile','known']))stop('PROFILE_UNAVAILABLE');
 const p=o.profile,k=o.known;
 if(!exact(p,['version','kind',...correspondence,'thinking','qualifiedLimits','validity'])||p.version!==1||p.kind!=='synthetic-request-profile-v1'||!exact(k,[...correspondence,'thinkingControl']))stop('PROFILE_UNAVAILABLE');
 if(!own(ENVELOPES,p.jobType)||!['id','contractVersion','routeVersion','apiProfileId','tokenizerProfileId','decodingPolicyId'].every(key=>token(p[key]))||!digest(p.responseSchemaDigest)||!list(p.qualityReceiptRefs))stop('PROFILE_UNAVAILABLE');
 if(correspondence.some(key=>canonical(p[key])!==canonical(k[key])))stop('PROFILE_CORRESPONDENCE_MISMATCH');
 const e=p.endpoint,m=p.model,t=p.thinking,v=p.validity;
 if(!exact(e,['host','region','deployment','path'])||typeof e.host!=='string'||!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(e.host)||!token(e.region)||!token(e.deployment)||e.path!=='/compatible-mode/v1/chat/completions')stop('ENDPOINT_UNAVAILABLE');
 if(!exact(m,['requested','resolutionVersion','responseAllowlist'])||!token(m.requested)||!token(m.resolutionVersion)||!list(m.responseAllowlist))stop('MODEL_UNAVAILABLE');
 if(!exact(t,['enabled','control','thinkingBudget','requestedMaxCompletionTokens','overshootHeadroom'])||typeof t.enabled!=='boolean'||!positive(t.requestedMaxCompletionTokens)||!integer(t.overshootHeadroom)||k.thinkingControl!==t.control)stop('THINKING_UNAVAILABLE');
 if(t.enabled?(t.control!=='thinking_budget'||!positive(t.thinkingBudget)||t.thinkingBudget>=t.requestedMaxCompletionTokens):(t.control!=='none'||t.thinkingBudget!==null))stop('THINKING_UNAVAILABLE');
 if(!exact(v,['verifiedAt','expiresAt','revoked'])||!integer(v.verifiedAt)||!integer(v.expiresAt)||v.expiresAt<=v.verifiedAt||typeof v.revoked!=='boolean')stop('VALIDITY_UNAVAILABLE');
 if(!exact(p.qualifiedLimits,limitKeys)||!readableBinding(binding(p,'synthetic-binding-check',p.qualifiedLimits))||p.usageProfile.cacheMode!=='implicit')stop('PARSER_BINDING_UNAVAILABLE');
 return p;
}

// profile/known are a private caller-supplied *synthetic correspondence* for one
// job. They attest no commercial support, schema validity or human quality.
// now/inputTokens are explicit fixture observations, not a trusted clock/tokenizer.
// childIdentity is the six neutral identity fields of Foundation.childRequest;
// this compiler never dispatches it or replaces its evidence/permission owner.
export function createQwenRequestProfileCompiler(options){
 let profile,initialReason='PROFILE_UNAVAILABLE';
 try{profile=prepare(options);}catch(e){initialReason=failures.has(e)?e.reason:'PROFILE_UNAVAILABLE';}
 return Object.freeze({
  compile(options){
   if(!profile)return unavailable(initialReason);
   try{
    const o=snapshot(options);
    if(!exact(o,['childIdentity','inputTokens','outputCap','stream','now']))stop('REQUEST_UNAVAILABLE');
    const c=o.childIdentity;
    if(!exact(c,['logicalJobId','childOperationId','type','contractVersion','routeVersion','automaticRetries'])||!['logicalJobId','childOperationId','contractVersion','routeVersion'].every(key=>token(c[key]))||c.type!==profile.jobType||c.contractVersion!==profile.contractVersion||c.routeVersion!==profile.routeVersion||c.automaticRetries!==0)stop('CHILD_BINDING_MISMATCH');
    if(!integer(o.now)||o.now<profile.validity.verifiedAt||o.now>=profile.validity.expiresAt||profile.validity.revoked)stop('VALIDITY_UNAVAILABLE');
    if(!integer(o.inputTokens)||!positive(o.outputCap)||typeof o.stream!=='boolean')stop('REQUEST_BOUND');
    const envelope=ENVELOPES[c.type],limits={...profile.qualifiedLimits,inputTokens:Math.min(envelope.input,profile.qualifiedLimits.inputTokens),billableOutputCap:Math.min(envelope.output,profile.qualifiedLimits.billableOutputCap,o.outputCap)};
    const t=profile.thinking,headroom=Math.max(10,t.overshootHeadroom);
    if(o.inputTokens>limits.inputTokens||o.outputCap>envelope.output||t.requestedMaxCompletionTokens>limits.billableOutputCap-headroom)stop('REQUEST_BOUND');
    const b=binding(profile,c.childOperationId,limits);if(!readableBinding(b))stop('PARSER_BINDING_UNAVAILABLE');
    return {status:'COMPILED_PARTIAL',reason:'NONE',sourceKind:'SYNTHETIC_PROFILE',qualification:'NOT_ESTABLISHED',wireComplete:false,inputBoundQualified:false,financialAuthority:false,dispatchAllowed:false,
     childIdentity:structuredClone(c),profileId:profile.id,endpoint:structuredClone(profile.endpoint),model:structuredClone(profile.model),apiProfileId:profile.apiProfileId,tokenizerProfileId:profile.tokenizerProfileId,decodingPolicyId:profile.decodingPolicyId,responseSchemaDigest:profile.responseSchemaDigest,qualityReceiptRefs:[...profile.qualityReceiptRefs],
     thinkingPolicy:structuredClone(t),billableOutputCap:limits.billableOutputCap,headroom,
     requestControls:{stream:o.stream,max_completion_tokens:t.requestedMaxCompletionTokens,...(o.stream?{stream_options:{include_usage:true}}:{})},binding:b};
   }catch(e){return unavailable(failures.has(e)?e.reason:'REQUEST_UNAVAILABLE');}
  },
  dispose(){profile=null;initialReason='PROFILE_DISPOSED';}
 });
}
