import {createQwenJsonDecoder} from '../../extension/core/ai-usage/qwen-json-decoder.js';
import {createQwenSseDecoder} from '../../extension/core/ai-usage/qwen-sse-decoder.js';
import {createQwenJsonUsageParser,createQwenSseUsageParser} from '../../extension/core/ai-usage/qwen-usage-parser.js';
import {parseQwenWireJson} from '../../extension/core/ai-usage/qwen-wire-primitives.js';

const observations=new WeakMap(),bindings=new WeakMap();
// An object clone, client usage claim or response from another ticket is not evidence.
export function observedProviderUsage(result,material){const item=observations.get(result);return item&&bindings.get(material)===item.binding?structuredClone(item.observed):null;}

const flags={financialAuthority:false,dispatchAllowed:false,retryAllowed:false,domainValidity:'NOT_EVALUATED',reservation:'HELD_PENDING_INDEPENDENT_FINANCIAL_PROOF'};
const unknown=reason=>({decision:'outcome_unknown',reason,...flags});
const stop=()=>{throw new Error('PROVIDER_RESPONSE_INVALID');};
function schemaValue(schema,value){
 switch(schema.type){
 case 'object':return value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===schema.required.length&&schema.required.every(k=>Object.hasOwn(value,k)&&schemaValue(schema.properties[k],value[k]));
 case 'array':return Array.isArray(value)&&value.length>=schema.minItems&&value.length<=schema.maxItems&&value.every(v=>schemaValue(schema.items,v));
 case 'string':return typeof value==='string'&&value.isWellFormed()&&[...value].length>=schema.minLength&&[...value].length<=schema.maxLength&&(!schema.enum||schema.enum.includes(value));
 case 'integer':case 'number':return typeof value==='number'&&Number.isFinite(value)&&(schema.type!=='integer'||Number.isSafeInteger(value))&&value>=schema.minimum&&value<=schema.maximum;
 case 'boolean':return typeof value==='boolean';case 'null':return value===null;default:return false;
 }
}

// Only actual EOF can complete usage. Raw provider body/reasoning/error text is
// never returned or logged; a bounded parsed derivative is not domain approval,
// financial settlement, a result-quota commit or permission to call again.
export async function readProviderResponse(response,material,{signal}={}){
 let reader,decoder,timer,onAbort,known=null;
 const finish=result=>{if(known){if(!bindings.has(material))bindings.set(material,Symbol());observations.set(result,{binding:bindings.get(material),observed:Object.freeze({...known,outcome:result.decision==='response_received'?'VALIDATED':'FAILED'})});}return result;};
 try{
  if(!(response instanceof Response)||signal?.aborted||response.status!==200||
   ![null,'identity'].includes(response.headers.get('content-encoding')))return unknown('PROVIDER_HTTP_UNQUALIFIED');
  const type=material.stream?'text/event-stream':'application/json';
  if(!new RegExp(`^${type}(?:\\s*;\\s*charset=utf-8)?$`,'i').test(response.headers.get('content-type')??''))return unknown('PROVIDER_HTTP_UNQUALIFIED');
  const limits=material.usageBinding.limits,length=response.headers.get('content-length');
  if(length!==null&&(!/^(?:0|[1-9][0-9]{0,7})$/.test(length)||Number(length)>limits.maxBytes))return unknown('PROVIDER_RESPONSE_BOUND');
  if(!response.body)return unknown('PROVIDER_RESPONSE_INCOMPLETE');
  const usage=(material.stream?createQwenSseUsageParser:createQwenJsonUsageParser)({binding:material.usageBinding,httpStatus:response.status});
  let content='',providerRequestId=null,forbidden=false;
  const take=raw=>{
   if(raw?.kind==='done')return;
   providerRequestId??=raw?.id;
   const message=raw?.choices?.[0]?.[material.stream?'delta':'message'];
   if(message?.content!==undefined&&message.content!==null){if(typeof message.content!=='string')stop();content+=message.content;}
   if(message?.refusal||message?.tool_calls?.length)forbidden=true;
  };
  decoder=material.stream?createQwenSseDecoder(limits,take,stop):createQwenJsonDecoder(limits,stop);
  reader=response.body.getReader();
  const stopped=new Promise((_,reject)=>{
   timer=setTimeout(()=>reject(new Error('STOPPED')),15000);
   onAbort=()=>reject(new Error('STOPPED'));signal?.addEventListener('abort',onAbort,{once:true});if(signal?.aborted)onAbort();
  });
  let bytes=0,chunks=0;
  for(;;){
   const {done,value}=await Promise.race([reader.read(),stopped]);if(done)break;
   if(!(value instanceof Uint8Array)||++chunks>4096||(bytes+=value.byteLength)>limits.maxBytes)stop();
   if(!usage.push(value))stop();decoder.push(value);
  }
  if(signal?.aborted||length!==null&&bytes!==Number(length))stop();
  const decoded=decoder.finish();if(!material.stream)take(decoded);
  const observed=usage.finish({transportComplete:true,cancelled:false});
  // The profile's product cap is not the exact original reservation bound.
  // Mirror the original ledger's input/output ceiling without repricing,
  // enlarging the hold, clamping usage or changing the shared decoder contract.
  const reserved=material.identity.reservation.request;
  const overCap=observed.overCap||observed.usageState==='KNOWN'&&
   (observed.neutral.inputTokens>reserved.inputTokens||observed.neutral.completionTokens>reserved.outputCap);
  if(observed.usageState!=='KNOWN'||overCap)return unknown(overCap?'PROVIDER_USAGE_OVER_CAP':'PROVIDER_RESPONSE_UNQUALIFIED');
  // Capture only qualified complete usage, independently of derivative validity.
  // No body/reasoning is retained in this private evidence association.
  known={identityDigest:material.identityDigest,usageBinding:structuredClone(material.usageBinding),usage:structuredClone(observed.neutral)};
  if(observed.finishReason!=='stop'||forbidden||!content)return finish(unknown('PROVIDER_RESPONSE_UNQUALIFIED'));
  const value=parseQwenWireJson(content,limits,{keys:0},stop,{json:'VALUE_INVALID',duplicate:'VALUE_INVALID'});
  if(!schemaValue(material.responseSchema,value))return finish(unknown('PROVIDER_SCHEMA_INVALID'));
  return finish({decision:'response_received',value,providerRequestId,usage:observed,...flags});
 }catch{return finish(unknown('PROVIDER_RESPONSE_INCOMPLETE'));}
 finally{
  clearTimeout(timer);signal?.removeEventListener('abort',onAbort);decoder?.dispose();
  if(reader){reader.cancel().catch(()=>{});reader.releaseLock();}
  else response?.body?.cancel().catch(()=>{});
 }
}
