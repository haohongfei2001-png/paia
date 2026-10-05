/* Independent isolated-world reader. Never used by the user-only capture parser. */
(() => {
 'use strict';
 const visible=node=>!!node?.isConnected&&!node.closest('[hidden],[inert],[aria-hidden="true"]')&&!!node.getClientRects().length;
 const id=node=>node?.getAttribute('data-message-id')||'';
 class ChatGPTCurrentReplyAdapter{
  constructor({document=globalThis.document,location=globalThis.location}={}){this.document=document;this.location=location;this.serial=0;this.reset();}
  reset(){this.cycle=0;this.revision=0;this.armed=false;this.seenIdle=false;this.streaming=false;this.current=null;this.url=this.location.href;this.signature='';this.stableAt=0;this.lastAssistantId='';this.cycleStartReplyId='';this.cycleReplyId='';this.finalized=false;}
  inspect(){
   const d=this.document,url=this.location.href;
   if(this.location.origin!=='https://chatgpt.com'||!/^\/(?:g\/[^/]+\/)?c\/[a-zA-Z0-9_-]+\/?$/.test(this.location.pathname)||d.querySelector('[data-testid="temporary-chat-indicator"]'))return null;
   // Metadata only. No old reply body, textContent or host response is read here.
   const nodes=[...d.querySelectorAll('[data-message-author-role]')].filter(visible);
   const last=nodes.at(-1);if(nodes.length>2000)return null;
   const users=nodes.filter(n=>n.getAttribute('data-message-author-role')==='user');
   const turn=last?.closest('[data-testid^="conversation-turn"],article');
   const latest=last?.getAttribute('data-message-author-role')==='assistant'?last:null;
   const replyId=id(latest),userId=id(users.at(-1));
   const stop=[...d.querySelectorAll('[data-testid="stop-button"],button[aria-label="Stop generating"],button[aria-label="停止生成"]')].some(visible);
   const uncertain=[...d.querySelectorAll('[data-testid="continue-button"],button[aria-label="Continue generating"],[data-testid="conversation-turn-error"],[data-testid="error-message"]')].some(visible)||!!latest?.closest('[data-is-streaming="true"]');
   const complete=!!latest&&!!turn&&[...turn.querySelectorAll('button[data-testid="copy-turn-action-button"]')].some(visible);
   return {url,latest,turn,replyId,userId,signature:users.length+':'+userId,streaming:stop,complete:complete&&!stop&&!uncertain,uncertain};
  }
  observe(now=performance.now(),mutated=false){
   const s=this.inspect();
   if(!s||s.url!==this.url){this.reset();return {invalidated:true};}
   let invalidated=false;
   if(!s.streaming&&this.finalized&&(mutated||s.latest!==this.current||s.replyId!==this.cycleReplyId)){this.armed=false;invalidated=true;}
   if(this.signature&&s.signature!==this.signature){this.armed=false;this.current=null;invalidated=true;}
   if(this.current&&s.latest!==this.current){this.revision++;this.stableAt=now;invalidated=true;}
   if(mutated){this.revision++;this.stableAt=now;invalidated=true;}
   this.signature=s.signature;
   if(!s.streaming)this.seenIdle=true;
   if(s.streaming&&!this.streaming){this.cycleStartReplyId=this.lastAssistantId;this.cycleReplyId='';this.finalized=false;invalidated=true;this.armed=this.seenIdle;this.cycle=++this.serial;this.revision++;this.stableAt=now;}
   if(s.streaming&&this.armed&&s.replyId&&s.replyId!==this.cycleStartReplyId){if(this.cycleReplyId&&this.cycleReplyId!==s.replyId)this.armed=false;else this.cycleReplyId=s.replyId;}
   if(this.streaming&&!s.streaming){this.revision++;this.stableAt=now;}
   this.streaming=s.streaming;this.current=s.latest;if(s.replyId)this.lastAssistantId=s.replyId;
   const validId=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
   if(!this.armed||!this.cycleReplyId||s.replyId!==this.cycleReplyId||s.replyId===this.cycleStartReplyId||!s.complete||!validId.test(s.replyId)||!validId.test(s.userId))return {invalidated};
   if(now-this.stableAt>=600)this.finalized=true;
   return {invalidated,binding:{url:s.url,conversation:this.location.pathname,cycle:this.cycle,replyId:s.replyId,revision:this.revision},ready:now-this.stableAt>=600};
  }
  invalidate(){this.armed=false;this.revision++;this.stableAt=performance.now();}
  snapshot(){
   const s=this.inspect();if(!this.armed||!s?.complete||s.latest!==this.current)return null;
   const bodies=[...s.latest.querySelectorAll('.markdown')].filter(visible);if(bodies.length!==1)return null;
   const body=bodies[0];let text='',blocks=0,excluded=false,characters=0,bytes=0;
   const encoder=new TextEncoder();
   const add=value=>{characters+=Array.from(value).length;bytes+=encoder.encode(value).length;if(characters>32768||bytes>131072)throw Error('limit');text+=value;};
   const walk=node=>{
    if(node.nodeType===3){add(node.data);return;}
    if(node.nodeType!==1)return;
    if(node.matches('[hidden],[inert],[aria-hidden="true"],script,style,textarea,input,button'))throw Error('structure');
    if(node.matches('blockquote,pre,code'))excluded=true;
    if(node.matches('p,li,h1,h2,h3,h4,h5,h6,blockquote,pre,div,br')){if(++blocks>256)throw Error('limit');if(text&&!text.endsWith('\n'))add('\n');}
    for(const child of node.childNodes)walk(child);
    if(node.matches('p,li,h1,h2,h3,h4,h5,h6,blockquote,pre,div')&&!text.endsWith('\n'))add('\n');
   };
   try{walk(body);return {completed:true,text,blocks:Math.max(1,blocks),excluded};}catch{return null;}
  }
 }
 globalThis.PAIAChatGPTCurrentReplyAdapter=ChatGPTCurrentReplyAdapter;
})();
