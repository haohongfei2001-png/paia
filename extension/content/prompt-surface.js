/* Static orb only in host DOM. Personal text stays in a cross-origin extension frame. */
(() => {
 'use strict';
 globalThis.PAIAPromptSurface?.dispose();
 let host,root,orb,frame,nonce,url=location.href,position=null,open=false,enabled=false,initialized=false,disposed=false,scheduled=false,drag=null,suppress=false;
 const adapter=new globalThis.PAIAChatGPTComposerAdapter(),listeners=[];
 const listen=(node,event,fn,options)=>{node.addEventListener(event,fn,options);listeners.push(()=>node.removeEventListener(event,fn,options));};
 const rpc=async state=>{const r=await chrome.runtime.sendMessage({type:'PAIA_PROMPT_SURFACE_HOST',...(state?{state}:{})});if(!r?.ok)throw Error('unavailable');return r.data;};
 const save=()=>void rpc({version:1,open,position}).catch(()=>{orb.title='位置未保存；下次打开可重试';});
 function close(focus=false){open=false;frame?.remove();frame=null;nonce=null;orb?.setAttribute('aria-expanded','false');if(focus)orb?.focus();save();}
 function expand(){
  if(!enabled||frame)return;
  nonce=crypto.randomUUID();frame=document.createElement('iframe');frame.title='PAIA 常用 Prompt';frame.allow='clipboard-write';
  frame.src=chrome.runtime.getURL('ui/prompt-surface.html')+'#'+nonce;root.append(frame);open=true;orb.setAttribute('aria-expanded','true');layout();save();
 }
 function layout(){
  scheduled=false;if(disposed||!host)return;
  const composer=adapter.find();if(!composer||!enabled){host.hidden=true;return;}
  if(url!==location.href)url=location.href;
  const bounds=(composer.closest('form')||composer).getBoundingClientRect(),g=globalThis.PAIAPromptLayout(innerWidth,innerHeight,bounds,position);
  if(!g){host.hidden=true;return;}host.hidden=false;
  host.dataset.theme=document.documentElement.classList.contains('dark')||getComputedStyle(document.documentElement).colorScheme==='dark'?'dark':'light';
  const style=`position:fixed;left:${g.orb.x}px;top:${g.orb.y}px;width:44px;height:44px;z-index:2147483646;`;
  if(host.getAttribute('style')!==style)host.setAttribute('style',style);
  if(open&&!frame&&g.card)expand();
  if(frame){frame.hidden=!g.card;if(g.card){const c=g.card;const s=`position:fixed;left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;`;if(frame.getAttribute('style')!==s)frame.setAttribute('style',s);}}
 }
 function schedule(){if(!scheduled&&!disposed){scheduled=true;requestAnimationFrame(layout);}}
 function mount(){
  if(host?.isConnected||disposed)return;
  if(!document.documentElement)return;
  host=document.createElement('div');host.dataset.paiaPromptSurface='';root=host.attachShadow({mode:'closed'});
  const style=document.createElement('style');style.textContent=`:host{color-scheme:light dark}button{box-sizing:border-box;width:44px;height:44px;padding:2px;border:0;background:transparent;touch-action:none;cursor:grab;color:inherit}span{display:grid;place-items:center;width:38px;height:38px;border:1px solid rgba(90,100,110,.22);border-radius:50%;background:rgba(250,251,253,.88);backdrop-filter:blur(16px) saturate(1.1);box-shadow:0 3px 14px #16203320;color:#365d58;font:600 9px system-ui;letter-spacing:.3px}button:focus-visible{outline:2px solid #36877b;outline-offset:2px;border-radius:50%}iframe{border:1px solid #71808040;border-radius:16px;background:#f9fafbd9;backdrop-filter:blur(18px) saturate(1.1);box-shadow:0 8px 30px #10202025;box-sizing:border-box;animation:appear .16s ease-out}@keyframes appear{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}:host([data-theme=dark]) span{background:#242b30eb;color:#a9d0c6;border-color:#9caaaa40}:host([data-theme=dark]) iframe{background:#222a30ed}@media(prefers-color-scheme:dark){span{background:#242b30eb;color:#a9d0c6;border-color:#9caaaa40}iframe{background:#222a30ed}}@media(prefers-reduced-motion:reduce){iframe{animation:none}}`;
  orb=document.createElement('button');orb.type='button';orb.setAttribute('aria-label','常用 Prompt；拖动或 Alt 加方向键移动');orb.setAttribute('aria-expanded','false');orb.title='常用 Prompt';const mark=document.createElement('span');mark.textContent='PAIA';orb.append(mark);root.append(style,orb);document.documentElement.append(host);
  listen(orb,'click',e=>{if(!e.isTrusted)return;if(suppress){suppress=false;return;}if(frame)frame.focus();else expand();});
  listen(orb,'pointerdown',e=>{if(!e.isTrusted||e.button!==0)return;drag={x:e.clientX,y:e.clientY,start:host.getBoundingClientRect(),moved:false};orb.setPointerCapture(e.pointerId);});
  listen(orb,'pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)<5&&!drag.moved)return;drag.moved=true;suppress=true;position={x:Math.max(0,Math.min(1,(drag.start.x+dx)/(innerWidth-44))),y:Math.max(0,Math.min(1,(drag.start.y+dy)/(innerHeight-44)))};schedule();});
  const end=()=>{if(drag?.moved)save();drag=null;};listen(orb,'pointerup',end);listen(orb,'pointercancel',end);
  listen(orb,'keydown',e=>{if(e.altKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const r=host.getBoundingClientRect();position={x:Math.max(0,Math.min(1,(r.x+(e.key==='ArrowRight'?12:e.key==='ArrowLeft'?-12:0))/(innerWidth-44))),y:Math.max(0,Math.min(1,(r.y+(e.key==='ArrowDown'?12:e.key==='ArrowUp'?-12:0))/(innerHeight-44)))};layout();save();}else if(e.key==='Escape'&&open){e.preventDefault();frame?.focus();}});
  schedule();
 }
 async function activate(){try{const saved=await rpc();if(disposed)return;enabled=true;if(!initialized){position=saved.position;open=saved.open;initialized=true;}mount();schedule();}catch{enabled=false;if(host)host.hidden=true;frame?.remove();frame=null;}}
 const messages=(r,s,reply)=>{
  if(s.id!==chrome.runtime.id||s.tab)return;
  if(r.type==='PAIA_PROMPT_SURFACE_PROBE'){reply({open:!!frame?.isConnected&&open&&!host.hidden,nonce,url:location.href,dark:document.documentElement.classList.contains('dark')||getComputedStyle(document.documentElement).colorScheme==='dark'||matchMedia('(prefers-color-scheme:dark)').matches});}
  if(r.type==='PAIA_PROMPT_SURFACE_CLOSE'&&r.nonce===nonce){close(true);reply({closed:true});}
  if(r.type==='PAIA_PROMPT_SURFACE_ACTIVATE')void activate();
 };
 chrome.runtime.onMessage.addListener(messages);
 const observer=new MutationObserver(records=>{if(records.some(r=>r.target!==host)){if(!host?.isConnected&&enabled)mount();schedule();}});
 const observe=()=>{observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});if(enabled)mount();};
 if(document.documentElement)observe();else listen(document,'DOMContentLoaded',observe);
 listen(window,'resize',schedule);listen(window,'scroll',schedule,{passive:true});listen(window,'popstate',schedule);listen(document,'visibilitychange',()=>{if(!document.hidden)void activate();});
 globalThis.PAIAPromptSurface={dispose(){disposed=true;observer.disconnect();listeners.forEach(fn=>fn());chrome.runtime.onMessage.removeListener(messages);adapter.dispose();host?.remove();}};
 void activate();
})();
