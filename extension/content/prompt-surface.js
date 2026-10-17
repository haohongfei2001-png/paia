/* Static orb only in host DOM. Personal text stays in a cross-origin extension frame. */
(() => {
 'use strict';
 globalThis.PAIAPromptSurface?.dispose();
 let host,root,orb,frame,retiringFrame,nonce,url=location.href,position=null,positionGeneration=0,open=false,collapsedForm='orb',enabled=false,initialized=false,disposed=false,scheduled=false,geometry=null,drag=null,suppress=false,availability='surface_unavailable',contentHeight=312,minimumHeight=92,measureGeneration=0,resolvedAppearance=null,resolvedLanguage=null,hostAppearance='system',hostLanguage='system',activationEpoch=0;
 const adapter=new globalThis.PAIAChatGPTComposerAdapter(),listeners=[],appearance=matchMedia('(prefers-color-scheme:dark)');
 const dark=()=>frame&&resolvedAppearance!==null?resolvedAppearance==='dark':hostAppearance==='dark'||hostAppearance!=='light'&&appearance.matches;
 const english=()=>{const language=frame&&resolvedLanguage!==null?resolvedLanguage:hostLanguage;return language==='en'||language==='system'&&!String(globalThis.navigator?.language||'zh-CN').toLowerCase().startsWith('zh');};
 const hostText=(zh,en)=>english()?en:zh;
 const labelHost=()=>{if(orb){orb.setAttribute('aria-label',hostText('常用 Prompt；拖动或 Alt 加方向键移动','Frequent inputs; drag or use Alt + arrow keys to move'));orb.title=hostText('常用 Prompt','Frequent inputs');}if(frame)frame.title=hostText('PAIA 常用 Prompt','PAIA Frequent inputs');};
 const listen=(node,event,fn,options)=>{node.addEventListener(event,fn,options);listeners.push(()=>node.removeEventListener(event,fn,options));};
 const rpc=async state=>{const r=await chrome.runtime.sendMessage({type:'PAIA_PROMPT_SURFACE_HOST',...(state?{state}:{})});if(!r?.ok){const error=Error('unavailable');error.code=r?.error;throw error;}return r.data;};
 // The private card owns editing/busy/IME guards. A host gesture only requests closure.
 const requestClose=()=>{if(frame)void chrome.runtime.sendMessage({type:'PAIA_PROMPT_SURFACE_REQUEST_CLOSE',nonce}).then(r=>{if(!r?.ok)throw Error('unavailable');}).catch(()=>{orb.title=hostText('无法关闭，请稍后重试','Cannot close. Please try again.');});};
 const reconcilePosition=saved=>{
  const next=saved.positionGeneration??0;if(disposed||!Number.isSafeInteger(next)||next<=positionGeneration)return;
  positionGeneration=next;position=saved.position;
  // Reset cancels the old gesture, never the private frame, its edit or its focus.
  if(drag){releaseDrag();suppress=true;}
  schedule();
 };
 const save=()=>{const sentGeneration=positionGeneration;
  void rpc({version:1,open,position,positionGeneration,collapsedForm}).then(reconcilePosition).catch(async error=>{
   if(disposed||sentGeneration!==positionGeneration)return;
   // Never replay a refused stale write. A single read recovers a missed reset.
   if(error.code==='STALE_BASE'){try{reconcilePosition(await rpc());return;}catch{}}
   if(!disposed&&sentGeneration===positionGeneration&&orb)orb.title=hostText('位置未保存；下次打开可重试','Position not saved. Try again next time.');
  });
 };
 function retireFrame(){
  const prior=frame;frame=null;nonce=null;if(!prior)return;retiringFrame?.remove();retiringFrame=prior;prior.style.pointerEvents='none';
  const remove=()=>{prior.remove();if(retiringFrame===prior)retiringFrame=null;};
  if(typeof prior.animate!=='function'||matchMedia('(prefers-reduced-motion:reduce)').matches){remove();return;}
  prior.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(3px)'}],{duration:80,easing:'ease-out'}).finished.then(remove,remove);
 }
 function close(focus=false){releaseDrag();open=false;if(collapsedForm!=='capsule')retireFrame();orb?.setAttribute('aria-expanded','false');layout();if(focus)orb?.focus();save();}
 function expand(expanded=true){
  if(!enabled)return;retiringFrame?.remove();retiringFrame=null;if(frame){open=expanded;layout();save();return;}
  nonce=crypto.randomUUID();frame=document.createElement('iframe');frame.title='PAIA 常用 Prompt';frame.allow='clipboard-write';labelHost();
  frame.src=chrome.runtime.getURL('ui/prompt-surface.html')+'#'+nonce;root.append(frame);open=expanded;orb.setAttribute('aria-expanded',String(open));layout();save();
 }
 function layout(){
  scheduled=false;if(disposed||!host)return;
  const discovery=adapter.discover(),composer=discovery.node;availability=enabled?discovery.status:'surface_unavailable';if(!composer||!enabled){host.hidden=true;return;}
  if(url!==location.href)url=location.href;
  const bounds=(composer.closest('form')||composer).getBoundingClientRect(),v=window.visualViewport;
  const viewport=v?{left:v.offsetLeft,top:v.offsetTop,width:v.width,height:v.height}:{left:0,top:0,width:innerWidth,height:innerHeight};
  let topControlsBottom=viewport.top;
  for(const node of document.querySelectorAll?.('header,[role="banner"],[data-testid="top-bar"]')||[]){const r=node.getBoundingClientRect();if(r.width&&r.height&&r.bottom>viewport.top&&r.top<viewport.top+96&&r.bottom<bounds.top)topControlsBottom=Math.max(topControlsBottom,r.bottom);}
  const g=globalThis.PAIAPromptLayout(innerWidth,innerHeight,bounds,position,open,{viewport,topControlsBottom,contentHeight,minimumHeight});
  if(!g){availability='layout_unavailable';host.hidden=true;return;}geometry=g;host.hidden=false;availability=frame&&!(open?g.card:g.capsule)?'layout_unavailable':'visible';
  host.dataset.theme=dark()?'dark':'light';labelHost();
  const anchor=g.orb;
  const style=`position:fixed;left:${anchor.x}px;top:${anchor.y}px;width:44px;height:44px;z-index:2147483646;`;
  if(host.getAttribute('style')!==style)host.setAttribute('style',style);
  orb.hidden=!!frame&&!open&&collapsedForm==='capsule';
  if(open&&!frame&&g.card)expand();
  if(frame){const rect=open?g.card:g.capsule;frame.hidden=!rect;if(rect){const c=rect;const s=`position:fixed;left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;border-radius:${open?20:22}px;color-scheme:${host.dataset.theme};pointer-events:${drag?.moved?'none':'auto'};`;if(frame.getAttribute('style')!==s)frame.setAttribute('style',s);}}
 }
 function schedule(){if(!scheduled&&!disposed){scheduled=true;requestAnimationFrame(layout);}}
 function retainAnchor(){layout();const r=host.getBoundingClientRect();position={x:Math.max(0,Math.min(1,r.x/(innerWidth-44))),y:Math.max(0,Math.min(1,r.y/(innerHeight-44)))};}
 function releaseDrag(persist=false){
  const d=drag;if(!d)return;drag=null;
  // Clear first: release can synchronously deliver lostpointercapture.
  if(orb?.hasPointerCapture?.(d.pointerId))orb.releasePointerCapture(d.pointerId);
  if(persist&&d.moved){retainAnchor();save();}else schedule();
 }
 function mount(){
  if(host?.isConnected||disposed)return;
  if(!document.documentElement)return;
  releaseDrag();host=document.createElement('div');host.dataset.paiaPromptSurface='';root=host.attachShadow({mode:'closed'});
  const style=document.createElement('style');style.textContent=`
:host{color-scheme:light}:host([data-theme=dark]){color-scheme:dark}
button{position:relative;z-index:1;box-sizing:border-box;width:44px;height:44px;padding:2px;border:0;background:transparent;touch-action:none;cursor:grab}
.orb{position:relative;display:block;box-sizing:border-box;width:40px;height:40px;overflow:hidden;border:1px solid #cbd4e17a;border-radius:50%;background:radial-gradient(ellipse 72% 64% at 72% 30%,#273a5fe0 0%,#273a5f85 34%,#273a5f00 76%),radial-gradient(ellipse 60% 68% at 32% 57%,#7f91abed 0%,#7f91ab38 77%,transparent 100%),radial-gradient(ellipse 66% 48% at 63% 80%,#8a8fb8ab 0%,#cbd4e168 70%,transparent 100%),linear-gradient(150deg,#cbd4e1a8,#f6f7f88c);box-shadow:0 3px 8px -3px #273a5f47,inset 0 0 5px #f6f7f8a8;backdrop-filter:blur(9px) saturate(.88)}
.orb:before{content:'';position:absolute;inset:0;border-radius:inherit;background:radial-gradient(ellipse 68% 26% at 38% 91%,#f6f7f8c9,transparent 80%);filter:blur(2px);pointer-events:none}
button:hover .orb,button:focus-visible .orb{box-shadow:0 3px 9px -3px #273a5f57,inset 0 0 5px #f6f7f8bf}
:host([data-theme=dark]) .orb{border-color:#cbd4e16e;box-shadow:0 3px 8px -3px #0007,inset 0 0 5px #cbd4e17a}
button:focus-visible{outline:2px solid #5e8ee8;outline-offset:3px;border-radius:50%}
iframe{border:1px solid #ffffff75;border-radius:20px;background:linear-gradient(136deg,#f6f7f8f0 0%,#ffffffdc 70%,#cbd4e1d4 100%);backdrop-filter:blur(18px) saturate(.92);box-shadow:0 18px 52px #22314d1a;box-sizing:border-box;animation:appear .12s ease-out}
@keyframes appear{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
:host([data-theme=dark]) iframe{background:linear-gradient(136deg,#313a48f7 0%,#202734f7 52%,#252d39f7 100%);border-color:#ffffff1f;box-shadow:0 18px 52px #00000047}
@media(prefers-reduced-motion:reduce){iframe{animation:none}}
@media(prefers-reduced-transparency:reduce){iframe{backdrop-filter:none;background:#f6f7f8}:host([data-theme=dark]) iframe{background:#252d39}.orb{backdrop-filter:none;background:radial-gradient(ellipse at 70% 30%,#273a5f,#7f91ab 60%,#cbd4e1)}}
@media(forced-colors:active){.orb,iframe{background:Canvas;border:1px solid CanvasText;box-shadow:none;backdrop-filter:none}.orb:before{display:none}button:focus-visible{outline-color:Highlight}}`;
  orb=document.createElement('button');orb.type='button';orb.setAttribute('aria-label','常用 Prompt；拖动或 Alt 加方向键移动');orb.setAttribute('aria-expanded','false');orb.title='常用 Prompt';const mark=document.createElement('span');mark.className='orb';mark.setAttribute('aria-hidden','true');orb.append(mark);labelHost();host.dataset.theme=dark()?'dark':'light';root.append(style,orb);document.documentElement.append(host);
  listen(orb,'click',e=>{if(!e.isTrusted)return;if(suppress&&e.detail!==0){suppress=false;return;}suppress=false;if(frame)requestClose();else expand();});
  listen(orb,'pointerdown',e=>{if(!e.isTrusted||e.button!==0||e.isPrimary===false||drag)return;suppress=false;drag={x:e.clientX,y:e.clientY,start:host.getBoundingClientRect(),moved:false,pointerId:e.pointerId};orb.setPointerCapture(e.pointerId);});
  listen(orb,'pointermove',e=>{if(!drag||e.pointerId!==drag.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)<5&&!drag.moved)return;drag.moved=true;suppress=true;position={x:Math.max(0,Math.min(1,(drag.start.x+dx)/(innerWidth-44))),y:Math.max(0,Math.min(1,(drag.start.y+dy)/(innerHeight-44)))};schedule();});
  const end=e=>{if(e?.pointerId!==undefined&&e.pointerId!==drag?.pointerId)return;releaseDrag(true);};listen(orb,'pointerup',end);listen(orb,'pointercancel',e=>{end(e);suppress=false;});listen(orb,'lostpointercapture',end);listen(window,'blur',()=>releaseDrag(true));
  listen(orb,'keydown',e=>{if(e.altKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const r=host.getBoundingClientRect();position={x:Math.max(0,Math.min(1,(r.x+(e.key==='ArrowRight'?12:e.key==='ArrowLeft'?-12:0))/(innerWidth-44))),y:Math.max(0,Math.min(1,(r.y+(e.key==='ArrowDown'?12:e.key==='ArrowUp'?-12:0))/(innerHeight-44)))};retainAnchor();save();}else if(e.key==='Escape'&&open&&!e.isComposing&&e.keyCode!==229){e.preventDefault();requestClose();}});
  schedule();
 }
 async function activate(){const ticket=++activationEpoch;try{const saved=await rpc();if(disposed||ticket!==activationEpoch)return;const prefs=saved.displayPreferences;if(prefs){hostAppearance=['system','light','dark'].includes(prefs.appearance)?prefs.appearance:'system';hostLanguage=['system','zh-CN','en'].includes(prefs.language)?prefs.language:'system';}collapsedForm=saved.collapsedForm==='capsule'?'capsule':'orb';enabled=true;if(!initialized){if((saved.positionGeneration??0)>=positionGeneration)position=saved.position;open=false;initialized=true;}reconcilePosition(saved);mount();if(collapsedForm==='capsule'&&!frame)expand(false);schedule();}catch{if(disposed||ticket!==activationEpoch)return;enabled=false;releaseDrag();if(host)host.hidden=true;frame?.remove();frame=null;}}
 const messages=(r,s,reply)=>{
  if(s.id!==chrome.runtime.id||s.tab)return;
  if(r.type==='PAIA_PROMPT_SURFACE_MEASURE'&&r.nonce===nonce&&(!Object.hasOwn(r,'appearance')||['light','dark'].includes(r.appearance))&&(!Object.hasOwn(r,'language')||['zh-CN','en'].includes(r.language))&&Number.isInteger(r.height)&&r.height>=1&&r.height<=4096&&(!('minimumHeight' in r)||(Number.isInteger(r.minimumHeight)&&r.minimumHeight>=44&&r.minimumHeight<=1024&&r.minimumHeight<=r.height))){const min=r.minimumHeight??134,generation=++measureGeneration,measuredFrame=frame,measuredNonce=nonce;contentHeight=r.height;minimumHeight=min;if(Object.hasOwn(r,'appearance'))resolvedAppearance=r.appearance;if(Object.hasOwn(r,'language'))resolvedLanguage=r.language;requestAnimationFrame(()=>{if(disposed||generation!==measureGeneration||nonce!==measuredNonce||frame!==measuredFrame){reply({measured:false});return;}layout();requestAnimationFrame(()=>reply({measured:!disposed&&generation===measureGeneration&&nonce===measuredNonce&&frame===measuredFrame}));});return true;}
  if(r.type==='PAIA_PROMPT_SURFACE_FORM'&&r.nonce===nonce&&['orb','capsule','board'].includes(r.form)){if(r.form==='board'){open=true;}else{collapsedForm=r.form;open=false;if(r.form==='orb')retireFrame();}orb?.setAttribute('aria-expanded',String(open));layout();save();reply({form:r.form});return;}
  if(r.type==='PAIA_PROMPT_SURFACE_POSITION_RESET'&&Number.isSafeInteger(r.positionGeneration)&&r.positionGeneration>=0)reconcilePosition({position:null,positionGeneration:r.positionGeneration});
  if(r.type==='PAIA_PROMPT_SURFACE_DIAGNOSTIC_PROBE'&&r.url===location.href){layout();reply({status:availability});}
  if(r.type==='PAIA_PROMPT_SURFACE_PROBE'){reply({open:!!frame?.isConnected&&!host.hidden,expanded:open,nonce,url:location.href,dark:dark(),dragging:!!drag});}
  if(r.type==='PAIA_PROMPT_SURFACE_CLOSE'&&r.nonce===nonce){close(true);reply({closed:true});}
  // An open private card already receives the original ARCHIVE_CHANGED query.
  // Display-only notification must not replace its edit with a second HOST read.
  if(r.type==='PAIA_PROMPT_SURFACE_ACTIVATE'&&!(r.reason==='display-preferences'&&frame&&open)||r.type==='ARCHIVE_CHANGED'&&!frame)void activate();
 };
 chrome.runtime.onMessage.addListener(messages);
 const observer=new MutationObserver(records=>{if(records.some(r=>r.target!==host)){if(!host?.isConnected&&enabled)mount();schedule();}});
 const observe=()=>{observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','id','role','contenteditable','hidden','inert','disabled','readonly','aria-hidden','aria-disabled','aria-readonly','data-chatgpt-composer','data-composer-markdown','data-testid','data-message-author-role','data-message-id','data-turn']});if(enabled)mount();};
 if(document.documentElement)observe();else listen(document,'DOMContentLoaded',observe);
 if(window.visualViewport){listen(window.visualViewport,'resize',schedule);listen(window.visualViewport,'scroll',schedule,{passive:true});}
 listen(appearance,'change',schedule);listen(window,'resize',schedule);listen(window,'scroll',schedule,{passive:true});listen(window,'popstate',schedule);listen(document,'visibilitychange',()=>{if(!document.hidden)void activate();});
 globalThis.PAIAPromptSurface={nextPlacement(){layout();if(!geometry||host?.hidden)return null;const node=adapter.find();if(!node)return null;const b=(node.closest('form')||node).getBoundingClientRect();return {orb:geometry.orb,card:frame?(open?geometry.card:geometry.capsule):null,form:{x:b.x,y:b.y,w:b.width,h:b.height},dragging:!!drag,dark:dark()};},dispose(){disposed=true;releaseDrag();observer.disconnect();listeners.forEach(fn=>fn());chrome.runtime.onMessage.removeListener(messages);adapter.dispose();retiringFrame?.remove();host?.remove();}};
 void activate();
})();
