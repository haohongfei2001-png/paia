/* Static orb only in host DOM. Personal text stays in a cross-origin extension frame. */
(() => {
 'use strict';
 globalThis.PAIAPromptSurface?.dispose();
 let host,root,orb,frame,nonce,url=location.href,position=null,open=false,enabled=false,initialized=false,disposed=false,scheduled=false,geometry=null,drag=null,suppress=false,availability='surface_unavailable';
 const adapter=new globalThis.PAIAChatGPTComposerAdapter(),listeners=[],appearance=matchMedia('(prefers-color-scheme:dark)');
 const dark=()=>{const el=document.documentElement,scheme=getComputedStyle(el).colorScheme;return el.classList.contains('dark')||(!el.classList.contains('light')&&scheme!=='light'&&(scheme==='dark'||appearance.matches));};
 const listen=(node,event,fn,options)=>{node.addEventListener(event,fn,options);listeners.push(()=>node.removeEventListener(event,fn,options));};
 const rpc=async state=>{const r=await chrome.runtime.sendMessage({type:'PAIA_PROMPT_SURFACE_HOST',...(state?{state}:{})});if(!r?.ok)throw Error('unavailable');return r.data;};
 // The private card owns editing/busy/IME guards. A host gesture only requests closure.
 const requestClose=()=>{if(frame)void chrome.runtime.sendMessage({type:'PAIA_PROMPT_SURFACE_REQUEST_CLOSE',nonce}).then(r=>{if(!r?.ok)throw Error('unavailable');}).catch(()=>{orb.title='无法关闭，请稍后重试';});};
 const save=()=>void rpc({version:1,open,position}).catch(()=>{orb.title='位置未保存；下次打开可重试';});
 function close(focus=false){open=false;frame?.remove();frame=null;nonce=null;orb?.setAttribute('aria-expanded','false');layout();if(focus)orb?.focus();save();}
 function expand(){
  if(!enabled||frame)return;
  nonce=crypto.randomUUID();frame=document.createElement('iframe');frame.title='PAIA 常用 Prompt';frame.allow='clipboard-write';
  frame.src=chrome.runtime.getURL('ui/prompt-surface.html')+'#'+nonce;root.append(frame);open=true;orb.setAttribute('aria-expanded','true');layout();save();
 }
 function layout(){
  scheduled=false;if(disposed||!host)return;
  const discovery=adapter.discover(),composer=discovery.node;availability=enabled?discovery.status:'surface_unavailable';if(!composer||!enabled){host.hidden=true;return;}
  if(url!==location.href)url=location.href;
  const bounds=(composer.closest('form')||composer).getBoundingClientRect(),g=globalThis.PAIAPromptLayout(innerWidth,innerHeight,bounds,position,open);
  if(!g){availability='layout_unavailable';host.hidden=true;return;}geometry=g;host.hidden=false;availability='visible';
  host.dataset.theme=dark()?'dark':'light';
  const anchor=g.orb;
  const style=`position:fixed;left:${anchor.x}px;top:${anchor.y}px;width:44px;height:44px;z-index:2147483646;`;
  if(host.getAttribute('style')!==style)host.setAttribute('style',style);
  if(open&&!frame&&g.card)expand();
  if(frame){frame.hidden=!g.card;if(g.card){const c=g.card;const s=`position:fixed;left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;color-scheme:${host.dataset.theme};`;if(frame.getAttribute('style')!==s)frame.setAttribute('style',s);}}
 }
 function schedule(){if(!scheduled&&!disposed){scheduled=true;requestAnimationFrame(layout);}}
 function mount(){
  if(host?.isConnected||disposed)return;
  if(!document.documentElement)return;
  host=document.createElement('div');host.dataset.paiaPromptSurface='';root=host.attachShadow({mode:'closed'});
  const style=document.createElement('style');style.textContent=`
:host{color-scheme:light}:host([data-theme=dark]){color-scheme:dark}
button{position:relative;z-index:1;box-sizing:border-box;width:44px;height:44px;padding:2px;border:0;background:transparent;touch-action:none;cursor:grab}
.orb{position:relative;display:block;box-sizing:border-box;width:40px;height:40px;border:1px solid #7f95b847;border-radius:50%;background:radial-gradient(circle 32px at 34% 28%,#fffffffa 0%,#eaf5fffa 22%,#c8dcfff0 48%,#d5c8ffeb 68%,#c6f0e4e0 84%,#ffffffb3 100%);box-shadow:0 7px 20px #52627f38;backdrop-filter:blur(16px) saturate(1.1)}
.orb:before{content:'';position:absolute;inset:-3px;border:1px solid #ffffffb8;border-radius:50%}
.orb:after{content:'';position:absolute;left:6px;top:7px;width:14px;height:10px;border-radius:50%;background:#ffffffc7}
.reflection{position:absolute;left:20px;top:18px;width:12px;height:12px;border-radius:50%;background:#8f95ff26}
button:focus-visible{outline:2px solid #5e8ee8;outline-offset:3px;border-radius:50%}
iframe{border:1px solid #ffffffd9;border-radius:20px;background:linear-gradient(136deg,#fffffff0 0%,#f5f8ffe6 52%,#eaf1ffd1 100%);backdrop-filter:blur(18px) saturate(1.1);box-shadow:0 18px 48px #22314d24;box-sizing:border-box;animation:appear .16s ease-out}
@keyframes appear{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
:host([data-theme=dark]) iframe{background:linear-gradient(136deg,#313a48db 0%,#202734d1 52%,#252d39c7 100%);border-color:#ffffff28;box-shadow:0 18px 48px #00000057}
@media(prefers-reduced-motion:reduce){iframe{animation:none}}`;
  orb=document.createElement('button');orb.type='button';orb.setAttribute('aria-label','常用 Prompt；拖动或 Alt 加方向键移动');orb.setAttribute('aria-expanded','false');orb.title='常用 Prompt';const mark=document.createElement('span');mark.className='orb';mark.setAttribute('aria-hidden','true');const reflection=document.createElement('span');reflection.className='reflection';mark.append(reflection);orb.append(mark);root.append(style,orb);document.documentElement.append(host);
  listen(orb,'click',e=>{if(!e.isTrusted)return;if(suppress&&e.detail!==0){suppress=false;return;}suppress=false;if(frame)requestClose();else expand();});
  listen(orb,'pointerdown',e=>{if(!e.isTrusted||e.button!==0)return;suppress=false;drag={x:e.clientX,y:e.clientY,start:host.getBoundingClientRect(),moved:false};orb.setPointerCapture(e.pointerId);});
  listen(orb,'pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)<5&&!drag.moved)return;drag.moved=true;suppress=true;position={x:Math.max(0,Math.min(1,(drag.start.x+dx)/(innerWidth-44))),y:Math.max(0,Math.min(1,(drag.start.y+dy)/(innerHeight-44)))};schedule();});
  const retainAnchor=()=>{layout();const r=host.getBoundingClientRect();position={x:Math.max(0,Math.min(1,r.x/(innerWidth-44))),y:Math.max(0,Math.min(1,r.y/(innerHeight-44)))};};
  const end=()=>{if(drag?.moved){retainAnchor();save();}drag=null;};listen(orb,'pointerup',end);listen(orb,'pointercancel',()=>{end();suppress=false;});
  listen(orb,'keydown',e=>{if(e.altKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const r=host.getBoundingClientRect();position={x:Math.max(0,Math.min(1,(r.x+(e.key==='ArrowRight'?12:e.key==='ArrowLeft'?-12:0))/(innerWidth-44))),y:Math.max(0,Math.min(1,(r.y+(e.key==='ArrowDown'?12:e.key==='ArrowUp'?-12:0))/(innerHeight-44)))};retainAnchor();save();}else if(e.key==='Escape'&&open&&!e.isComposing&&e.keyCode!==229){e.preventDefault();requestClose();}});
  schedule();
 }
 async function activate(){try{const saved=await rpc();if(disposed)return;enabled=true;if(!initialized){position=saved.position;open=saved.open;initialized=true;}mount();schedule();}catch{enabled=false;if(host)host.hidden=true;frame?.remove();frame=null;}}
 const messages=(r,s,reply)=>{
  if(s.id!==chrome.runtime.id||s.tab)return;
  if(r.type==='PAIA_PROMPT_SURFACE_DIAGNOSTIC_PROBE'&&r.url===location.href){layout();reply({status:availability});}
  if(r.type==='PAIA_PROMPT_SURFACE_PROBE'){reply({open:!!frame?.isConnected&&open&&!host.hidden,nonce,url:location.href,dark:dark(),dragging:!!drag});}
  if(r.type==='PAIA_PROMPT_SURFACE_CLOSE'&&r.nonce===nonce){close(true);reply({closed:true});}
  if(r.type==='PAIA_PROMPT_SURFACE_ACTIVATE')void activate();
 };
 chrome.runtime.onMessage.addListener(messages);
 const observer=new MutationObserver(records=>{if(records.some(r=>r.target!==host)){if(!host?.isConnected&&enabled)mount();schedule();}});
 const observe=()=>{observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','id','role','contenteditable','hidden','inert','disabled','readonly','aria-hidden','aria-disabled','aria-readonly','data-chatgpt-composer','data-composer-markdown','data-testid','data-message-author-role','data-message-id','data-turn']});if(enabled)mount();};
 if(document.documentElement)observe();else listen(document,'DOMContentLoaded',observe);
 listen(appearance,'change',schedule);listen(window,'resize',schedule);listen(window,'scroll',schedule,{passive:true});listen(window,'popstate',schedule);listen(document,'visibilitychange',()=>{if(!document.hidden)void activate();});
 globalThis.PAIAPromptSurface={nextPlacement(){layout();if(!geometry||host?.hidden)return null;const node=adapter.find();if(!node)return null;const b=(node.closest('form')||node).getBoundingClientRect();return {orb:geometry.orb,card:open?geometry.card:null,form:{x:b.x,y:b.y,w:b.width,h:b.height},dragging:!!drag,dark:dark()};},dispose(){disposed=true;observer.disconnect();listeners.forEach(fn=>fn());chrome.runtime.onMessage.removeListener(messages);adapter.dispose();host?.remove();}};
 void activate();
})();
