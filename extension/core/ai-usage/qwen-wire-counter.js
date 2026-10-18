// Full-wire LOCAL measurement mechanics. An asset digest and a count are not
// evidence of a commercial chat-template/billing bound. Only a separately
// installed, current source qualification may use these observations.
import {canonical} from './contracts.js';
import {snapshot,exact,integer,token,freeze} from './qwen-request-data.js';
import {inspectQwenBpeCounter} from './qwen-bpe-counter.js';
import {hashText} from '../dedupe.js';

const bindings=new WeakMap(),measurements=new WeakMap(),encoder=new TextEncoder();
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const absent=reason=>Object.freeze({status:'UNAVAILABLE',reason,qualification:'NOT_ESTABLISHED',financialAuthority:false,dispatchAllowed:false});
const same=(a,b)=>canonical(a)===canonical(b);
export function inspectQwenWireCounter(value){const h=bindings.get(value);return h&&!h.disposed&&inspectQwenBpeCounter(h.counter)?h.binding:null;}
export function inspectQwenWireMeasurement(value,owner){const h=measurements.get(value);return h?.owner===owner&&inspectQwenWireCounter(owner)?h.metadata:null;}
export function createQwenWireCounter(counter,options){
 let b,info;try{
  info=inspectQwenBpeCounter(counter);if(!info)return null;
  b=snapshot(options,{maxBytes:32768,maxKeys:512,maxDepth:12,maxString:8192});
  if(!exact(b,['profileId','tokenizerProfileId','qualificationRef','endpoint','model','instructionsDigest','responseFormatDigest','thinkingControls','requestControls','protocolOverheadTokens','maxInputTokens','expiresAt'])||!['profileId','tokenizerProfileId','qualificationRef','model'].every(k=>token(b[k]))||!digest(b.instructionsDigest)||!digest(b.responseFormatDigest)||!exact(b.endpoint,['scheme','host','path'])||b.endpoint.scheme!=='https'||typeof b.endpoint.host!=='string'||!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(b.endpoint.host)||b.endpoint.path!=='/compatible-mode/v1/chat/completions')return null;
  const t=b.thinkingControls,r=b.requestControls;
  if(!(exact(t,['enable_thinking'])&&t.enable_thinking===false||exact(t,['enable_thinking','thinking_budget'])&&t.enable_thinking===true&&integer(t.thinking_budget)&&t.thinking_budget>0))return null;
  if(!(exact(r,['stream','max_completion_tokens'])&&r.stream===false||exact(r,['stream','max_completion_tokens','stream_options'])&&r.stream===true&&exact(r.stream_options,['include_usage'])&&r.stream_options.include_usage===true)||!integer(r.max_completion_tokens)||r.max_completion_tokens<1||!integer(b.protocolOverheadTokens)||b.protocolOverheadTokens<1||!integer(b.maxInputTokens)||b.maxInputTokens<1||b.maxInputTokens>1048576||!integer(b.expiresAt)||b.expiresAt<1)return null;
  b=freeze({...b,counter:info});
 }catch{return null;}
 const state={counter,binding:b,disposed:false,inFlight:0};let lastNow=0;
 function current(now){if(state.disposed||inspectQwenBpeCounter(counter)!==info||!integer(now)||now<lastNow||now>=b.expiresAt){if(integer(now)&&now<lastNow)state.disposed=true;throw Error('TOKENIZER_CURRENTNESS');}lastNow=now;}
 const owner=Object.freeze({
  async measure(options){let entered=false;try{
   if(state.inFlight>=8)return absent('TOKENIZER_BUSY');state.inFlight++;entered=true;
   // The caller's time is a mechanism input, never a trusted production clock.
   const o=snapshot(options,{maxBytes:300000,maxKeys:4096,maxDepth:16,maxString:262144});
   if(!exact(o,['envelope','requestDigest','now'])||!digest(o.requestDigest))return absent('TOKENIZER_REQUEST');current(o.now);
   const e=o.envelope;if(!exact(e,['method','endpoint','headers','body'])||e.method!=='POST'||!same(e.endpoint,b.endpoint)||!exact(e.headers,['Content-Type'])||e.headers['Content-Type']!=='application/json'||typeof e.body!=='string'||!e.body.isWellFormed()||encoder.encode(e.body).length>info.maxWireBytes)return absent('TOKENIZER_WIRE');
   const body=snapshot(JSON.parse(e.body),{maxBytes:262144,maxKeys:4096,maxDepth:16,maxString:131072});
   const keys=['model','messages','response_format','n',...Object.keys(b.requestControls),...Object.keys(b.thinkingControls)];
   if(!exact(body,keys)||body.model!==b.model||body.n!==1||canonical(body)!==e.body||!Array.isArray(body.messages)||body.messages.length!==2)return absent('TOKENIZER_WIRE');
   const [system,user]=body.messages;if(!exact(system,['role','content'])||system.role!=='system'||typeof system.content!=='string'||!exact(user,['role','content'])||user.role!=='user'||typeof user.content!=='string')return absent('TOKENIZER_WIRE');
   for(const [k,v]of Object.entries({...b.requestControls,...b.thinkingControls}))if(!same(body[k],v))return absent('TOKENIZER_WIRE');
   const payload=snapshot(JSON.parse(user.content));if(!payload||typeof payload!=='object'||Array.isArray(payload)||canonical(payload)!==user.content)return absent('TOKENIZER_WIRE');
   if(await hashText(system.content)!==b.instructionsDigest||await hashText(canonical(body.response_format))!==b.responseFormatDigest||await hashText(canonical(e))!==o.requestDigest)return absent('TOKENIZER_DIGEST');
   current(o.now);const result=counter.countText(e.body);if(result.status!=='COUNTED_UNQUALIFIED')return absent(result.reason??'TOKENIZER_UNAVAILABLE');
   const inputTokens=result.tokens+b.protocolOverheadTokens;if(!integer(inputTokens)||inputTokens>b.maxInputTokens)return absent('TOKENIZER_INPUT_BOUND');
   const metadata=freeze({profileId:b.profileId,tokenizerProfileId:b.tokenizerProfileId,qualificationRef:b.qualificationRef,requestDigest:o.requestDigest,contentTokens:result.tokens,protocolOverheadTokens:b.protocolOverheadTokens,inputTokens,expiresAt:b.expiresAt});
   const out=Object.freeze({status:'MEASURED_UNQUALIFIED',qualification:'NOT_ESTABLISHED',financialAuthority:false,dispatchAllowed:false,measurement:metadata,rawBytes:result.rawBytes,normalizedBytes:result.normalizedBytes});
   measurements.set(out,{owner,metadata});return out;
  }catch{return absent('TOKENIZER_UNAVAILABLE');}finally{if(entered)state.inFlight--;}
  },
  dispose(){state.disposed=true;}
 });bindings.set(owner,state);return owner;
}
