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
const unavailable=(reason,sourceKind='SYNTHETIC_PROFILE')=>({status:'UNAVAILABLE',reason,sourceKind,qualification:'NOT_ESTABLISHED',wireComplete:false,inputBoundQualified:false,financialAuthority:false,dispatchAllowed:false});

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

function prepare(options,kind){
 const o=snapshot(options);
 if(!exact(o,['profile','known']))stop('PROFILE_UNAVAILABLE');
 const p=o.profile,k=o.known;
 if(!exact(p,['version','kind',...correspondence,'thinking','qualifiedLimits','validity'])||p.version!==1||p.kind!==kind||!exact(k,[...correspondence,'thinkingControl']))stop('PROFILE_UNAVAILABLE');
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
function validAt(profile,now){
 if(!integer(now)||now<profile.validity.verifiedAt||now>=profile.validity.expiresAt||profile.validity.revoked)stop('VALIDITY_UNAVAILABLE');
}
function freezeMetadata(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freezeMetadata(child);Object.freeze(value);}return value;}
// Both entry points use this original controls/binding calculation. Preparation
// omits only the as-yet unmeasured input comparison; it never supplies a guessed
// count, mints a financial request or claims a qualified input bound.
function controls(profile,o,sourceKind,checkInput){
 const c=o.childIdentity;
 if(!exact(c,['logicalJobId','childOperationId','type','contractVersion','routeVersion','automaticRetries'])||!['logicalJobId','childOperationId','contractVersion','routeVersion'].every(key=>token(c[key]))||c.type!==profile.jobType||c.contractVersion!==profile.contractVersion||c.routeVersion!==profile.routeVersion||c.automaticRetries!==0)stop('CHILD_BINDING_MISMATCH');
 validAt(profile,o.now);
 if((checkInput&&!integer(o.inputTokens))||!positive(o.outputCap)||typeof o.stream!=='boolean')stop('REQUEST_BOUND');
 const envelope=ENVELOPES[c.type],limits={...profile.qualifiedLimits,inputTokens:Math.min(envelope.input,profile.qualifiedLimits.inputTokens),billableOutputCap:Math.min(envelope.output,profile.qualifiedLimits.billableOutputCap,o.outputCap)};
 const t=profile.thinking,headroom=Math.max(10,t.overshootHeadroom);
 if((checkInput&&o.inputTokens>limits.inputTokens)||o.outputCap>envelope.output||t.requestedMaxCompletionTokens>limits.billableOutputCap-headroom)stop('REQUEST_BOUND');
 const b=binding(profile,c.childOperationId,limits);if(!readableBinding(b))stop('PARSER_BINDING_UNAVAILABLE');
 return {status:'COMPILED_PARTIAL',reason:'NONE',sourceKind,qualification:'NOT_ESTABLISHED',wireComplete:false,inputBoundQualified:false,financialAuthority:false,dispatchAllowed:false,
  childIdentity:structuredClone(c),profileId:profile.id,endpoint:structuredClone(profile.endpoint),model:structuredClone(profile.model),apiProfileId:profile.apiProfileId,tokenizerProfileId:profile.tokenizerProfileId,decodingPolicyId:profile.decodingPolicyId,responseSchemaDigest:profile.responseSchemaDigest,qualityReceiptRefs:[...profile.qualityReceiptRefs],
  thinkingPolicy:structuredClone(t),billableOutputCap:limits.billableOutputCap,headroom,
  requestControls:{stream:o.stream,max_completion_tokens:t.requestedMaxCompletionTokens,...(o.stream?{stream_options:{include_usage:true}}:{})},binding:b};
}
function createControlsCompiler(options,kind,sourceKind){
 let profile,initialReason='PROFILE_UNAVAILABLE',prepared=new WeakMap();
 try{profile=prepare(options,kind);}catch(e){initialReason=failures.has(e)?e.reason:'PROFILE_UNAVAILABLE';}
 return Object.freeze({
  compile(options){
   if(!profile)return unavailable(initialReason,sourceKind);
   try{
    const o=snapshot(options);
    if(!exact(o,['childIdentity','inputTokens','outputCap','stream','now']))stop('REQUEST_UNAVAILABLE');
    return controls(profile,o,sourceKind,true);
   }catch(e){return unavailable(failures.has(e)?e.reason:'REQUEST_UNAVAILABLE',sourceKind);}
  },
  prepareControls(options){
   if(!profile)return unavailable(initialReason,sourceKind);
   try{
    const o=snapshot(options);
    if(!exact(o,['childIdentity','outputCap','stream','now']))stop('REQUEST_UNAVAILABLE');
    const compiled=freezeMetadata(controls(profile,o,sourceKind,false));
    const handle=freezeMetadata({...compiled,status:'CONTROLS_PREPARED'});
    prepared.set(handle,{compiled,preparedAt:o.now});return handle;
   }catch(e){return unavailable(failures.has(e)?e.reason:'REQUEST_UNAVAILABLE',sourceKind);}
  },
  finishInputBound(handle,options){
   if(!profile)return unavailable(initialReason,sourceKind);
   try{
    const record=prepared.get(handle);if(!record)stop('CONTROL_HANDLE_UNAVAILABLE');
    // Claim once before inspecting caller metadata, including reentrant traps.
    // Failure/expiry cannot restore a previously used preparation.
    prepared.delete(handle);
    const o=snapshot(options);if(!exact(o,['inputTokens','now']))stop('REQUEST_UNAVAILABLE');
    validAt(profile,o.now);if(o.now<record.preparedAt)stop('VALIDITY_UNAVAILABLE');
    if(!integer(o.inputTokens)||o.inputTokens>record.compiled.binding.limits.inputTokens)stop('REQUEST_BOUND');
    return structuredClone(record.compiled);
   }catch(e){return unavailable(failures.has(e)?e.reason:'REQUEST_UNAVAILABLE',sourceKind);}
  },
  dispose(){profile=null;prepared=new WeakMap();initialReason='PROFILE_DISPOSED';}
 });
}

// Source metadata uses the identical original controls/parser implementation.
// This entry point is still unqualified mechanics, never a private capability.
export function createQwenRequestProfileCompiler(options){return createControlsCompiler(options,'synthetic-request-profile-v1','SYNTHETIC_PROFILE');}
export function createQwenSourceProfileControls(options){return createControlsCompiler(options,'source-request-profile-v1','SOURCE_METADATA_ONLY');}
