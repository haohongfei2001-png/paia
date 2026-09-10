/* Explicit development UI: safe metadata only. No credential or page-wide text reads. */
(() => {
 'use strict';
 const S=globalThis.PAIACompat,adapter=new globalThis.ChatGPTAdapter(),origin='https://chatgpt.com';let pending=false,mode='export',canonical=[],chat=null;
 const checkText=(capture,historical,identity,recovery,reason)=>`canonical capture: ${capture?'PASS':'FAIL'}\nhistorical metadata: ${historical?'PASS':'FAIL'}\nmessage identity match: ${identity?'PASS':'FAIL'}\nsource time recovery: ${recovery?'PASS':'FAIL'}\nreasonCode: ${reason}`;
 const aside=document.createElement('aside');aside.id='paia-compat-dev';aside.style.cssText='position:fixed;right:12px;bottom:12px;z-index:2147483647;background:#17212d;color:white;padding:12px;border:1px solid #aaa;font:12px system-ui;max-width:300px';
 const exportButton=document.createElement('button'),checkButton=document.createElement('button'),status=document.createElement('pre');
 exportButton.textContent='生成脱敏兼容性样本';exportButton.id='compat-export';checkButton.textContent='ChatGPT兼容性自检';checkButton.id='compat-check';status.id='compat-status';status.textContent='DEVELOPMENT_MODE';aside.append(exportButton,checkButton,status);document.documentElement.append(aside);
 function snapshot(){
  const main=document.querySelector('main');if(!main||document.querySelectorAll('main').length!==1)throw 0;let nodes=0;
  const tags=new Set(['main','article','div','span','p','pre','code','br','ul','ol','li','table','tbody','tr','td','time']);
  const accepted=new Set(canonical.map(c=>c.id));
  const roleSelector='[data-message-author-role="user"],[data-message-author-role="assistant"]';
  function walk(n,inside=false,depth=0){if(++nodes>4000||depth>24)throw 0;if(n.nodeType===3)return inside?{text:true}:null;if(n.nodeType!==1)return null;
   if(n.matches('textarea,input,button,a,img,svg,script,style,[contenteditable="true"],[data-testid*="attachment"],[data-testid*="file"]'))return null;
   if(n.matches('[data-message-author-role="user"]')&&!accepted.has(n.getAttribute('data-message-id')))return null;
   inside ||= n.matches(roleSelector);if(!inside&&n!==main&&!n.querySelector(roleSelector))return null;
   const tag=n.tagName.toLowerCase();if(!tags.has(tag))throw 0;const attrs={};
   if(getComputedStyle(n).display==='none'||getComputedStyle(n).visibility==='hidden')attrs.hidden='true';
   for(const k of ['data-message-id','data-message-author-role','hidden','aria-hidden','contenteditable','datetime','data-time-kind','data-message-created-at','data-message-sent-at'])if(n.hasAttribute(k))attrs[k]=k==='hidden'?'true':n.getAttribute(k);
   if(n.classList.contains('whitespace-pre-wrap'))attrs.class='whitespace-pre-wrap';
   if(['message-sent-at','message-created-at','user-message-text'].includes(n.getAttribute('data-testid'))||n.getAttribute('data-testid')?.startsWith('conversation-turn-'))attrs['data-testid']=n.getAttribute('data-testid');
   for(const key of ['title','aria-label']){const v=n.getAttribute(key);if(v&&/^(?:Sent at|Created at|发送于|创建于)\s+\d{4}-\d{2}-\d{2}T[0-9:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(v))attrs[key]=v;}
   return {tag,attrs,children:[...n.childNodes].map(child=>walk(child,inside,depth+1)).filter(Boolean)};
  }
  return walk(main);
 }
 async function request(which){if(pending)return;mode=which;pending=true;status.textContent='SAMPLING';
  try{const allowed=async()=>{const r=await chrome.runtime.sendMessage({type:'GET_STATUS'});return r?.ok&&r.data?.consented===true&&r.data?.enabled===true;};if(!await allowed())throw 0;adapter.collect();await new Promise(r=>setTimeout(r,800));if(!await allowed())throw 0;const result=adapter.collect();if(result.code!=='CAPTURING'&&!result.messages?.length)throw 0;
   chat=result.chat?.id;canonical=(result.messages||[]).map(m=>({id:m.sourceMessageId,...(m.domTime?{domTime:m.domTime.timestamp}:{})}));if(!canonical.length)throw 0;
   window.postMessage({type:'paia-dev-sample-request',chat,dom:snapshot(),canonical},origin);
   setTimeout(()=>{if(pending){pending=false;status.textContent=mode==='check'?checkText(canonical.length>0,false,false,false,'SAMPLE_TIMEOUT'):'SAMPLE_TIMEOUT';}},8000);
  }catch{pending=false;status.textContent=mode==='check'?checkText(false,false,false,false,'CANONICAL_UNAVAILABLE'):'CANONICAL_UNAVAILABLE';}
 }
 exportButton.addEventListener('click',()=>void request('export'));checkButton.addEventListener('click',()=>void request('check'));
 window.addEventListener('message',event=>{
  if(event.source!==window||event.origin!==origin||event.data?.type!=='paia-dev-sample-result'||!pending)return;
  pending=false;const b=event.data.bundle;
  if(!b||!S.scan(b)){status.textContent=['UNKNOWN_SCHEMA_KEY','NO_OBSERVED_RESPONSE','TIME_INVALID','TIME_SPAN_LIMIT','STRUCTURE_LIMIT','AMBIGUOUS_ID','SAMPLE_REJECTED'].includes(event.data.reasonCode)?event.data.reasonCode:'PRIVACY_REJECTED';if(mode==='check')status.textContent=checkText(canonical.length>0,false,false,false,status.textContent);return;}
  if(mode==='export'){
   const blob=new Blob([JSON.stringify(b,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='chatgpt-real-structure-v1.sanitized.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='SANITIZED_EXPORT_READY';
  }else{
   const mapped=b.files['identity-map.json'].messages,expected=b.files['expected-time.json'].messages;
   const fields={capture:canonical.length>0,historical:b.files['identity-map.json'].response.some(m=>m.role==='user'&&m.responseMatched),identity:mapped.some(m=>m.responseMatched)};
   void chrome.runtime.sendMessage({type:'DEV_COMPAT_CHECK',chat,ids:canonical.map(c=>c.id)}).then(reply=>{
    const recovered=reply?.ok&&reply.data?.recovered===true;status.textContent=`canonical capture: ${fields.capture?'PASS':'FAIL'}\nhistorical metadata: ${fields.historical?'PASS':'FAIL'}\nmessage identity match: ${fields.identity?'PASS':'FAIL'}\nsource time recovery: ${recovered?'PASS':'FAIL'}\nreasonCode: ${fields.capture&&fields.historical&&fields.identity&&recovered?'COMPATIBLE':'COMPATIBILITY_FAILED'}`;
   }).catch(()=>{status.textContent=checkText(fields.capture,fields.historical,fields.identity,false,'SELF_TEST_UNAVAILABLE');});
  }
 });
 window.postMessage({type:'paia-dev-drain'},origin);setTimeout(()=>window.postMessage({type:'paia-dev-drain'},origin),1000);
})();
