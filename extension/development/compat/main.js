/* Loaded only by the explicit development manifest, before the normal MAIN observer. */
(() => {
 'use strict';
 const S=globalThis.PAIACompat,cache=new Map(),readers=new Set();let gate=null,jobs=0,generation=0,lastReason='NO_OBSERVED_RESPONSE';
 const origin='https://chatgpt.com',TTL=600000;
 const current=()=>location.pathname.match(/^\/(?:g\/[A-Za-z0-9_-]+\/)?c\/([A-Za-z0-9_-]{8,128})\/?$/)?.[1]||null;
 function prune(){for(const [id,v] of cache)if(Date.now()-v.at>TTL)cache.delete(id);}
 function drain(){prune();const c=cache.get(current());if(!c?.history||!gate?.active||!gate.history||gate.chat!==current())return;
  window.postMessage({channel:'archive-response-metadata-v1',chat:gate.chat,epoch:gate.epoch,historySession:gate.historySession,history:c.history},origin);
 }
 async function observe(response){
  let reader,timer;const version=generation;
  try{
   const url=new URL(response.url),mime=response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
   if(url.origin!==origin||response.redirected||!response.ok||!/^application\/(?:json|[a-z0-9.+-]+\+json)$/.test(mime||'')||/(?:^|\/)(?:auth|oauth|token|session|credentials|login|logout)(?:\/|$)/i.test(url.pathname))return;
   if(jobs>=2||Number(response.headers.get('content-length'))>2097152)return;
   const copy=Response.prototype.clone.call(response);if(!copy.body)return;reader=copy.body.getReader();readers.add(reader);jobs++;
   let expired=false,bytes=0,text='';const decoder=new TextDecoder();timer=setTimeout(()=>{expired=true;void reader.cancel().catch(()=>{});},5000);
   while(true){const chunk=await reader.read();if(expired||generation!==version)throw 0;if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>2097152)throw 0;text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();
   const value=JSON.parse(text);const chat=value?.conversation_id||value?.id||current();if(typeof chat!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(chat))return;
   const type=/^\/backend-api\/conversation\/[A-Za-z0-9_-]+$/.test(url.pathname)?'conversation_load_candidate':'other';
   const sample=S.sanitize(value,chat,{endpointClass:type,contentType:mime});
   const parsed=globalThis.ChatGPTHistoryContract.parse(value)||globalThis.ChatGPTHistoryContract.parseStructural(value,chat);
   prune();const previous=cache.get(chat);let history=parsed;
   if(previous?.history&&parsed){const rows=new Map(previous.history.rows.map(r=>[r.id,r]));for(const r of parsed.rows){const prior=rows.get(r.id);if(prior&&JSON.stringify(prior.create)!==JSON.stringify(r.create)){rows.set(r.id,{...r,create:{state:'invalid',value:null}});}else rows.set(r.id,r);}if(rows.size>2000)throw Error('STRUCTURE_LIMIT');history={contract:parsed.contract,rows:[...rows.values()]};}
   prune();if(!cache.has(chat)&&cache.size>=4)cache.delete(cache.keys().next().value);
   cache.set(chat,{sample,history,at:Date.now()});lastReason='READY';drain();
  }catch(error){const codes=['UNKNOWN_SCHEMA_KEY','CONVERSATION_CONFLICT','TIME_INVALID','TIME_SPAN_LIMIT','STRUCTURE_LIMIT','AMBIGUOUS_ID','MESSAGE_STRUCTURE_REQUIRED','INVALID_ID'];lastReason=codes.includes(error?.message)?error.message:'SAMPLE_REJECTED';}
  finally{clearTimeout(timer);if(reader){readers.delete(reader);jobs--;void reader.cancel().catch(()=>{});}}
 }
 window.addEventListener('message',event=>{
  if(event.source!==window||event.origin!==origin)return;const d=event.data;
  if(d?.type==='paia-dev-drain'){drain();return;}
  if(d?.type!=='paia-dev-sample-request')return;
  prune();const c=cache.get(current());let bundle=null,reasonCode=lastReason;
  try{if(c&&d.chat===current()&&Array.isArray(d.canonical)&&d.canonical.length<=2000){bundle=S.bundle(c.sample,d.dom,d.canonical);reasonCode='READY';}}catch{reasonCode='PRIVACY_REJECTED';}
  window.postMessage({type:'paia-dev-sample-result',bundle,reasonCode},origin);
 });
 globalThis.PAIADevelopment=Object.freeze({observe,control(d){gate=d.active===true?{...d}:null;drain();}});
 window.addEventListener('pagehide',()=>{generation++;gate=null;cache.clear();for(const r of readers)void r.cancel().catch(()=>{});});
})();
