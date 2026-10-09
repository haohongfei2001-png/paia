// Pure decoded-response parsing. No service/registry, SSE decoder or authority.
import {normalizeUsage} from './usage-normalization.js';

const HARD=Object.freeze({maxBytes:1048576,maxFrames:4096,maxDepth:16,maxKeys:16384,maxStringBytes:262144,inputTokens:16000,billableOutputCap:6000});
const encoder=new TextEncoder();
const own=(o,k)=>Object.hasOwn(o,k);
const plain=o=>!!o&&typeof o==='object'&&!Array.isArray(o)&&[Object.prototype,null].includes(Object.getPrototypeOf(o));
const exact=(o,keys,required=keys)=>plain(o)&&Object.keys(o).every(k=>keys.includes(k))&&required.every(k=>own(o,k));
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const token=s=>typeof s==='string'&&/^[A-Za-z0-9:._/-]{1,200}$/.test(s);
const failures=new WeakSet();
const stop=(reason,unknown=false)=>{const e=Object.freeze({reason,unknown});failures.add(e);throw e;};
const error=reason=>stop(reason);
const unknown=reason=>stop(reason,true);
const failure=e=>failures.has(e)?output(e.unknown?'UNKNOWN':'INVALID',e.reason):output('INVALID','USAGE_INVALID');
const output=(usageState,reason,extra={})=>({usageState,reason,neutral:null,normalized:null,transportComplete:false,finishReason:null,overCap:false,domainValidity:'NOT_EVALUATED',qualification:'NOT_ESTABLISHED',financialAuthority:false,dispatchAllowed:false,reservation:'HELD_PENDING_INDEPENDENT_FINANCIAL_PROOF',...extra});

// Copy own data descriptors before interpreting caller input. JSON values only;
// no getters, inherited values, cycles, sparse arrays or symbol/extra array keys.
// This bounds validation/copy work, not memory already allocated by a decoder.
function snapshot(value,limits){
 let bytes=0,keys=0;const seen=new WeakSet();
 const charge=n=>{bytes+=n;if(bytes>limits.maxBytes)unknown('TRANSPORT_BOUND');};
 const string=s=>{if(s.length>limits.maxStringBytes)unknown('TRANSPORT_BOUND');const n=encoder.encode(s).length;if(n>limits.maxStringBytes)unknown('TRANSPORT_BOUND');charge(encoder.encode(JSON.stringify(s)).length);return s;};
 function visit(v,depth){
  if(depth>limits.maxDepth)unknown('TRANSPORT_BOUND');
  if(v===null){charge(4);return v;}
  if(typeof v==='string')return string(v);
  if(typeof v==='boolean'){charge(5);return v;}
  if(typeof v==='number'){if(!Number.isFinite(v))error('USAGE_INVALID');charge(24);return v;}
  if(typeof v!=='object'||!v)error('USAGE_INVALID');
  if(seen.has(v))error('USAGE_INVALID');seen.add(v);
  const array=Array.isArray(v);if(!array&&!plain(v))error('USAGE_INVALID');
  // ownKeys necessarily allocates the caller's name list. Reject its known size
  // before any descriptor sweep; count intrinsic array length as a key too.
  const names=Reflect.ownKeys(v),count=names.length;
  if(count>limits.maxKeys-keys)unknown('TRANSPORT_BOUND');
  if(names.some(k=>typeof k!=='string'))error('USAGE_INVALID');
  let length;
  if(array){
   const d=Object.getOwnPropertyDescriptor(v,'length');
   if(!d||!own(d,'value')||!integer(d.value))error('USAGE_INVALID');length=d.value;
   if(length>limits.maxKeys-keys)unknown('TRANSPORT_BOUND');
   if(names.length!==length+1||names.some(k=>k!=='length'&&!/^(0|[1-9][0-9]*)$/.test(k)))error('USAGE_INVALID');
  }
  keys+=count;charge(2+count);
  const copy=array?[]:Object.create(null);
  for(const name of names){
   if(array&&name==='length')continue;
   const d=Object.getOwnPropertyDescriptor(v,name);if(!d||!d.enumerable||!own(d,'value'))error('USAGE_INVALID');
   if(array&&Number(name)>=length)error('USAGE_INVALID');
   if(!array)string(name);
   copy[name]=visit(d.value,depth+1);
  }
  return copy;
 }
 return visit(value,0);
}

function prepareBinding(value){
 try{
  const b=snapshot(value,{maxBytes:8192,maxDepth:5,maxKeys:64,maxStringBytes:200});
  if(!exact(b,['version','childId','requestedModel','responseModels','thinkingEnabled','profile','limits'])||b.version!==1||!token(b.childId)||!token(b.requestedModel)||typeof b.thinkingEnabled!=='boolean'||!Array.isArray(b.responseModels)||!b.responseModels.length||b.responseModels.length>8||!b.responseModels.every(token)||new Set(b.responseModels).size!==b.responseModels.length) return null;
  const p=b.profile;
  if(!exact(p,['version','shape','cacheMode','reasoningAbsence','creationAbsence','cachedAbsence'])||p.version!==1||p.shape!=='compatible-direct-v1'||!['implicit','explicit-fixture-only'].includes(p.cacheMode)||!['reject','qualified-zero-nonthinking'].includes(p.reasoningAbsence)||!['reject','qualified-zero-no-markers'].includes(p.creationAbsence)||p.cachedAbsence!=='reject'||b.thinkingEnabled&&p.reasoningAbsence!=='reject'||p.cacheMode!=='implicit'&&p.creationAbsence!=='reject')return null;
  if(!exact(b.limits,Object.keys(HARD))||Object.entries(b.limits).some(([k,n])=>!integer(n)||n<1||n>HARD[k]))return null;
  return b;
 }catch{return null;}
}

const baseKeys=['id','model','object','choices','usage','created','service_tier','system_fingerprint'];
const finishValues=['stop','length','tool_calls'];
function responseIdentity(raw,binding,object){
 if(!exact(raw,baseKeys,['id','model','object','choices'])||!token(raw.id)||raw.object!==object||!binding.responseModels.includes(raw.model)||!Array.isArray(raw.choices))error('TRANSPORT_BINDING_MISMATCH');
 if(own(raw,'created')&&!integer(raw.created)||own(raw,'service_tier')&&raw.service_tier!==null||own(raw,'system_fingerprint')&&raw.system_fingerprint!==null)error('TRANSPORT_BINDING_MISMATCH');
}
function finish(choice,stream){
 const key=stream?'delta':'message';
 if(!exact(choice,['index',key,'finish_reason','logprobs'],['index',key,'finish_reason'])||choice.index!==0||own(choice,'logprobs')&&choice.logprobs!==null)error('RESPONSE_SHAPE_INVALID');
 const m=choice[key],allowed=['role','content','reasoning_content','refusal','audio','function_call','tool_calls'];
 if(!exact(m,allowed,stream?[]:['role','content']))error('RESPONSE_SHAPE_INVALID');
 if(own(m,'role')&&m.role!==null&&m.role!=='assistant'||!stream&&m.role!=='assistant')error('RESPONSE_SHAPE_INVALID');
 for(const k of ['content','reasoning_content','refusal'])if(own(m,k)&&m[k]!==null&&typeof m[k]!=='string')error('RESPONSE_SHAPE_INVALID');
 for(const k of ['audio','function_call'])if(own(m,k)&&m[k]!==null)error('UNSUPPORTED_MODALITY');
 if(own(m,'tool_calls')&&m.tool_calls!==null&&!Array.isArray(m.tool_calls))error('RESPONSE_SHAPE_INVALID');
 const f=choice.finish_reason;
 if(f!==null&&!finishValues.includes(f)||!stream&&f===null)error('RESPONSE_SHAPE_INVALID');
 return f;
}

function count(value){if(!integer(value))error('USAGE_INVALID');return value;}
function detail(value,keys){
 if(value===null||value===undefined)return null;
 if(!exact(value,keys,[]))error('USAGE_INVALID');
 for(const [k,n]of Object.entries(value)){
  if(['audio_tokens','image_tokens','video_tokens'].includes(k)&&n!==null&&count(n)>0)error('UNSUPPORTED_MODALITY');
  else if(k!=='cache_creation'&&n!==null)count(n);
 }
 return value;
}
function usage(raw,b){
 if(raw===null||raw===undefined)unknown('FINAL_USAGE_MISSING');
 if(!exact(raw,['prompt_tokens','completion_tokens','total_tokens','completion_tokens_details','prompt_tokens_details'],[]))error('USAGE_INVALID');
 for(const k of ['prompt_tokens','completion_tokens','total_tokens'])if(!own(raw,k)||raw[k]===null)unknown('FINAL_USAGE_MISSING');
 const inputTokens=count(raw.prompt_tokens),completionTokens=count(raw.completion_tokens),totalTokens=count(raw.total_tokens);
 const out=detail(raw.completion_tokens_details,['reasoning_tokens','text_tokens','audio_tokens']);
 const input=detail(raw.prompt_tokens_details,['cached_tokens','cache_creation_input_tokens','cache_creation','text_tokens','audio_tokens','image_tokens','video_tokens']);
 if(input&&own(input,'cache_creation')){
  if(own(input,'cache_creation_input_tokens'))error('USAGE_INVALID');
  unknown('USAGE_SHAPE_UNQUALIFIED');
 }
 let reasoningTokens;
 if(!out||!own(out,'reasoning_tokens')||out.reasoning_tokens===null){
  if(b.profile.reasoningAbsence!=='qualified-zero-nonthinking')unknown('REASONING_DETAILS_UNQUALIFIED');
  reasoningTokens=0;
 }else reasoningTokens=count(out.reasoning_tokens);
 if(!b.thinkingEnabled&&reasoningTokens!==0)error('USAGE_INVALID');
 if(!input||!own(input,'cached_tokens')||input.cached_tokens===null)unknown('CACHE_DETAILS_UNQUALIFIED');
 const cachedReadTokens=count(input.cached_tokens);let cacheCreateTokens;
 if(!own(input,'cache_creation_input_tokens')){
  if(b.profile.creationAbsence!=='qualified-zero-no-markers')unknown('CACHE_DETAILS_UNQUALIFIED');
  cacheCreateTokens=0;
 }else if(input.cache_creation_input_tokens===null)unknown('CACHE_DETAILS_UNQUALIFIED');
 else cacheCreateTokens=count(input.cache_creation_input_tokens);
 if(b.profile.cacheMode==='implicit'&&cacheCreateTokens!==0)error('USAGE_INVALID');
 if(out&&own(out,'text_tokens')&&out.text_tokens!==null&&out.text_tokens!==completionTokens||input&&own(input,'text_tokens')&&input.text_tokens!==null&&input.text_tokens!==inputTokens)error('USAGE_INVALID');
 const neutral={inputTokens,completionTokens,totalTokens,reasoningTokens,cachedReadTokens,cacheCreateTokens};
 let normalized;try{normalized=normalizeUsage(neutral);}catch{error('USAGE_INVALID');}
 return {neutral,normalized,overCap:inputTokens>b.limits.inputTokens||completionTokens>b.limits.billableOutputCap};
}

function execute(options,stream){
 // Access options through descriptors as well; do not invoke caller accessors.
 let o;
 try{o=snapshot(options,{maxBytes:HARD.maxBytes+16384,maxDepth:HARD.maxDepth+3,maxKeys:HARD.maxKeys,maxStringBytes:HARD.maxStringBytes});}
 catch(e){return failure(e);}
 const fields=stream?['binding','frames','done','transportComplete','httpStatus','cancelled']:['binding','response','transportComplete','httpStatus','cancelled'];
 if(!exact(o,fields))return output('INVALID','RESPONSE_SHAPE_INVALID');
 const b=prepareBinding(o.binding);if(!b)return output('UNKNOWN','BINDING_UNAVAILABLE');
 if(typeof o.transportComplete!=='boolean'||typeof o.cancelled!=='boolean'||!integer(o.httpStatus)||o.httpStatus<100||o.httpStatus>599||stream&&typeof o.done!=='boolean')return output('INVALID','RESPONSE_SHAPE_INVALID');
 if(o.cancelled||!o.transportComplete||stream&&!o.done)return output('UNKNOWN','TRANSPORT_INCOMPLETE');
 if(o.httpStatus!==200)return output('UNKNOWN','FINAL_USAGE_MISSING');
 try{
  const raw=snapshot(stream?o.frames:o.response,b.limits);
  let value,finishReason;
  if(!stream){
   if(plain(raw)&&own(raw,'error'))unknown('FINAL_USAGE_MISSING');
   responseIdentity(raw,b,'chat.completion');
   if(raw.choices.length!==1)error('RESPONSE_SHAPE_INVALID');
   finishReason=finish(raw.choices[0],false);value=usage(raw.usage,b);
  }else{
   if(!Array.isArray(raw)||!raw.length)unknown('FINAL_USAGE_MISSING');
   if(raw.length>b.limits.maxFrames)unknown('TRANSPORT_BOUND');
   let id=null,model=null,phase='OPEN',finalUsage;
   for(const frame of raw){
    if(phase==='DONE')error('STREAM_FINAL_CONFLICT');
    // A future SSE decoder supplies this exact typed marker at its real position.
    // It is not a provider JSON chunk or evidence of trusted wire/service origin.
    if(exact(frame,['kind'])&&frame.kind==='done'){phase='DONE';continue;}
    if(plain(frame)&&own(frame,'error'))unknown('FINAL_USAGE_MISSING');
    responseIdentity(frame,b,'chat.completion.chunk');
    if(id===null){id=frame.id;model=frame.model;}else if(frame.id!==id||frame.model!==model)error('TRANSPORT_BINDING_MISMATCH');
    if(phase==='USAGE')error('STREAM_FINAL_CONFLICT');
    if(frame.choices.length===0){
     if(phase!=='FINISHED')error('STREAM_FINAL_CONFLICT');
     finalUsage=frame.usage;phase='USAGE';continue;
    }
    if(phase!=='OPEN'||frame.choices.length!==1||own(frame,'usage')&&frame.usage!==null)error('STREAM_FINAL_CONFLICT');
    const f=finish(frame.choices[0],true);if(f!==null){finishReason=f;phase='FINISHED';}
   }
   if(phase!=='DONE')unknown('TRANSPORT_INCOMPLETE');
   value=usage(finalUsage,b);
  }
  return output('KNOWN',value.overCap?'USAGE_OVER_CAP':'NONE',{...value,finishReason,transportComplete:true});
 }catch(e){return failure(e);}
}

export const parseQwenUsage=options=>execute(options,false);
export const parseQwenStreamUsage=options=>execute(options,true);
