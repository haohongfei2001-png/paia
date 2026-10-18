/* Static orb only in host DOM. Personal text stays in a cross-origin extension frame. */
(() => {
 'use strict';
 globalThis.PAIAPromptSurface?.dispose();
 let host,root,orb,skin,hostStatus,frontCard,rearCard,frame,retiringFrame,nonce,url=location.href,position=null,positionGeneration=0,open=false,collapsedForm='orb',enabled=false,initialized=false,disposed=false,scheduled=false,geometry=null,drag=null,suppress=false,availability='surface_unavailable',contentHeight=328,minimumHeight=108,measureGeneration=0,resolvedAppearance=null,resolvedLanguage=null,hostAppearance='system',hostLanguage='system',activationEpoch=0,keyboardEntry=false;
 const adapter=new globalThis.PAIAChatGPTComposerAdapter(),listeners=[],appearance=matchMedia('(prefers-color-scheme:dark)');
 const dark=()=>frame&&resolvedAppearance!==null?resolvedAppearance==='dark':hostAppearance==='dark'||hostAppearance!=='light'&&appearance.matches;
 const english=()=>{const language=frame&&resolvedLanguage!==null?resolvedLanguage:hostLanguage;return language==='en'||language==='system'&&!String(globalThis.navigator?.language||'zh-CN').toLowerCase().startsWith('zh');};
 const hostText=(zh,en)=>english()?en:zh;
 const labelHost=()=>{if(orb){orb.setAttribute('aria-label',open?hostText('收起常用表达','Collapse frequent expressions'):hostText('展开常用表达','Expand frequent expressions'));orb.setAttribute('aria-expanded',String(open));}if(frame)frame.setAttribute('aria-label',hostText('PAIA 常用 Prompt','PAIA Frequent inputs'));};
 const listen=(node,event,fn,options)=>{node.addEventListener(event,fn,options);listeners.push(()=>node.removeEventListener(event,fn,options));};
 let observedComposer=null;
 const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;
 const observeComposer=node=>{if(node===observedComposer)return;resizeObserver?.disconnect();observedComposer=node;if(node)resizeObserver?.observe(node);};
 const rpc=async state=>{const r=await chrome.runtime.sendMessage({type:'PAIA_PROMPT_SURFACE_HOST',...(state?{state}:{})});if(!r?.ok){const error=Error('unavailable');error.code=r?.error;throw error;}return r.data;};
 // The private card owns editing/busy/IME guards. A host gesture only requests closure.
 const hostNotice=(text='')=>{if(hostStatus){hostStatus.textContent=text;hostStatus.hidden=!text;}};
 const requestClose=()=>{if(frame)void chrome.runtime.sendMessage({type:'PAIA_PROMPT_SURFACE_REQUEST_CLOSE',nonce}).then(r=>{if(!r?.ok)throw Error('unavailable');}).catch(()=>{hostNotice(hostText('无法关闭，请稍后重试','Cannot close. Please try again.'));});};
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
   if(!disposed&&sentGeneration===positionGeneration&&orb)hostNotice(hostText('位置未保存；下次打开可重试','Position not saved. Try again next time.'));
  });
 };
 function retireFrame(){
  const prior=frame;frame=null;nonce=null;if(!prior)return;retiringFrame?.remove();retiringFrame=prior;prior.style.pointerEvents='none';prior.style.clipPath='inset(calc(100% - 48px) 0 0 calc(100% - 48px) round 24px)';
  const remove=()=>{prior.remove();if(retiringFrame===prior)retiringFrame=null;};
  if(typeof prior.animate!=='function'||matchMedia('(prefers-reduced-motion:reduce)').matches){remove();return;}
  prior.animate([{opacity:1},{opacity:0}],{duration:80,easing:'ease-out'}).finished.then(remove,remove);
 }
 function close(focus=false){releaseDrag();open=false;if(collapsedForm!=='capsule')retireFrame();orb?.setAttribute('aria-expanded','false');layout();if(focus&&orb&&!orb.hidden)orb.focus();save();}
 function expand(expanded=true){
  if(!enabled)return;retiringFrame?.remove();retiringFrame=null;if(frame){open=expanded;layout();save();return;}
  nonce=crypto.randomUUID();frame=document.createElement('iframe');frame.id='paia-prompt-private';frame.allow='clipboard-write';labelHost();
  frame.src=chrome.runtime.getURL('ui/prompt-surface.html')+'#'+nonce;root.append(frame);frame.getBoundingClientRect();open=expanded;orb.setAttribute('aria-expanded',String(open));layout();save();
 }
 function layout(){
  scheduled=false;if(disposed||!host)return;
  const discovery=adapter.discover(),composer=discovery.node;availability=enabled?discovery.status:'surface_unavailable';if(!composer||!enabled){observeComposer(null);geometry=null;host.hidden=true;if(frame)frame.hidden=true;return;}
  if(url!==location.href)url=location.href;
  const completeComposer=composer.closest('form')||composer;observeComposer(completeComposer);
  const bounds=completeComposer.getBoundingClientRect(),v=window.visualViewport;
  const viewport=v?{left:v.offsetLeft,top:v.offsetTop,width:v.width,height:v.height}:{left:0,top:0,width:innerWidth,height:innerHeight};
  let topControlsBottom=viewport.top;
  for(const node of document.querySelectorAll?.('header,[role="banner"],[data-testid="top-bar"]')||[]){const r=node.getBoundingClientRect();if(r.width&&r.height&&r.bottom>viewport.top&&r.top<viewport.top+96&&r.bottom<bounds.top)topControlsBottom=Math.max(topControlsBottom,r.bottom);}
  const g=globalThis.PAIAPromptLayout(innerWidth,innerHeight,bounds,position,open,{viewport,topControlsBottom,contentHeight,minimumHeight,form:collapsedForm});
  if(!g){availability='layout_unavailable';geometry=null;host.hidden=true;if(frame)frame.hidden=true;return;}geometry=g;host.hidden=false;availability=frame&&!(open?g.card:g.capsule)?'layout_unavailable':'visible';
  host.dataset.theme=dark()?'dark':'light';host.dataset.expanded=String(open);
  const painted=frame&&(open?g.card:g.capsule),mode=painted?(open?'board':'capsule'):'orb';host.dataset.surfaceForm=mode;labelHost();
  const surface=painted||g.orb,previousArea=Number(host.dataset.surfaceArea)||2304,area=surface.w*surface.h;
  if(area!==previousArea)host.dataset.motion=area>previousArea?'open':'close';host.dataset.surfaceArea=String(area);
  const skinStyle=`width:${surface.w}px;height:${surface.h}px;border-radius:${mode==='board'?'18px 18px 24px 18px':'24px'};`;if(skin.getAttribute('style')!==skinStyle)skin.setAttribute('style',skinStyle);
  const anchor=g.orb;
  const style=`position:fixed;left:${anchor.x}px;top:${anchor.y}px;width:${anchor.w}px;height:${anchor.h}px;z-index:2147483646;`;
  if(host.getAttribute('style')!==style)host.setAttribute('style',style);
  orb.hidden=false;
  for(const card of [rearCard,frontCard])for(const [name,value] of Object.entries({x:g.mark.front.x,y:g.mark.front.y,width:g.mark.front.w,height:g.mark.front.h,rx:g.mark.front.r}))card.setAttribute(name,String(value));
  rearCard.setAttribute('transform',`translate(${g.mark.rear.dx} ${g.mark.rear.dy})`);
  if(open&&!frame&&g.card)expand();
  if(frame){const rect=open?g.card:g.capsule;frame.hidden=!rect;if(rect){
   // The original private frame keeps a stable content envelope. A real native
   // clip, not transparent pixels or forwarded events, limits its hit region.
   const w=Math.max(rect.w,g.card?.w||0),h=Math.max(rect.h,g.card?.h||0),radius=open?'18px 18px 24px 18px':'24px';
   const s=`position:fixed;left:${anchor.x+48-w}px;top:${anchor.y+48-h}px;width:${w}px;height:${h}px;clip-path:inset(${h-rect.h}px 0 0 ${w-rect.w}px round ${radius});color-scheme:${host.dataset.theme};pointer-events:${drag?.moved?'none':'auto'};`;if(frame.getAttribute('style')!==s)frame.setAttribute('style',s);
  }}
 }
 function schedule(){if(!scheduled&&!disposed){scheduled=true;requestAnimationFrame(layout);}}
 function retainAnchor(){layout();const r=host.getBoundingClientRect();position={x:Math.max(0,Math.min(1,r.x/(innerWidth-48))),y:Math.max(0,Math.min(1,r.y/(innerHeight-48)))};schedule();}
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
/* Exact R3 palette and R1 gradient roles, scoped to the original host. */
:host{color-scheme:light;pointer-events:none;--brand:#657999;--surface:#fff;--line:#dce0e7;--hover:#f3f5f8;--active:#e9edf3;--muted:#6d7480;--rear-a:#93a2be;--rear-b:#8192b1;--front-a:#899bb9;--front-b:#667c9f;--rear-alpha-a:.27;--rear-alpha-b:.37;--front-alpha-a:.36;--front-alpha-b:.55;--edge-a:#fff;--edge-b:#7185a6;--edge-alpha-a:.92;--edge-alpha-b:.30;--rear-edge:#7185a6;--rear-edge-alpha:.26;--anchor-shadow:0 2px 4px #17253e05,0 6px 18px #17253e0b;--panel-shadow:0 2px 5px #17253e04,0 10px 28px #17253e0c;--speed:80ms;--ease:cubic-bezier(.2,.7,.2,1)}
:host([data-theme=dark]){color-scheme:dark;--brand:#a4b8d8;--surface:#2b2c30;--line:#454850;--hover:#363940;--active:#41454e;--muted:#a5aab4;--rear-a:#c1cee5;--rear-b:#a0b3d2;--front-a:#d4dff2;--front-b:#9eb4d6;--rear-alpha-a:.28;--rear-alpha-b:.36;--front-alpha-a:.57;--front-alpha-b:.72;--edge-a:#e8efff;--edge-b:#a9bddc;--edge-alpha-a:.57;--edge-alpha-b:.32;--rear-edge:#a9bddc;--rear-edge-alpha:.26;--anchor-shadow:0 2px 5px #00000015,0 6px 18px #00000022;--panel-shadow:0 2px 5px #00000012,0 12px 32px #00000028}
:host([data-motion=open]){--speed:120ms}
.surface-skin{position:absolute;right:0;bottom:0;box-sizing:border-box;border:1px solid var(--line);border-radius:24px;background:var(--surface);box-shadow:var(--anchor-shadow);pointer-events:none;z-index:0;transition:width var(--speed) var(--ease),height var(--speed) var(--ease),border-radius var(--speed) var(--ease)}
:host([data-surface-form=board]) .surface-skin{box-shadow:var(--panel-shadow)}
button{position:relative;z-index:4;box-sizing:border-box;width:48px;height:48px;padding:0;border:1px solid transparent;border-radius:0;background:transparent;color:var(--brand);touch-action:none;cursor:pointer;pointer-events:auto}
button::before{content:"";position:absolute;inset:3px;border-radius:50%;pointer-events:none}button:hover::before{background:var(--hover)}button:active::before{background:var(--active)}button:focus-visible{outline:2px solid var(--brand);outline-offset:-4px}
.orb{position:absolute;left:-1px;top:-1px;display:block;width:48px;height:48px;overflow:visible;pointer-events:none}.card-rear{fill:url(#paia-card-rear);stroke:var(--rear-edge);stroke-opacity:var(--rear-edge-alpha);stroke-width:.7;transition:transform var(--speed) var(--ease)}.card-front{fill:url(#paia-card-front);stroke:url(#paia-card-edge);stroke-width:.8}
.rear-a{stop-color:var(--rear-a);stop-opacity:var(--rear-alpha-a)}.rear-b{stop-color:var(--rear-b);stop-opacity:var(--rear-alpha-b)}.front-a{stop-color:var(--front-a);stop-opacity:var(--front-alpha-a)}.front-b{stop-color:var(--front-b);stop-opacity:var(--front-alpha-b)}.edge-a{stop-color:var(--edge-a);stop-opacity:var(--edge-alpha-a)}.edge-b{stop-color:var(--edge-b);stop-opacity:var(--edge-alpha-b)}
iframe{clip-path:inset(calc(100% - 48px) 0 0 calc(100% - 48px) round 24px);z-index:2;border:0;background:transparent;box-shadow:none;box-sizing:border-box;transition:clip-path var(--speed) var(--ease)}
.host-status{position:absolute;right:0;bottom:56px;max-width:272px;padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--muted);font:12px/1.5 Arial,sans-serif;z-index:5;pointer-events:none}
@media(prefers-reduced-motion:reduce){.surface-skin,iframe,.card-rear{transition:none}}
@media(prefers-reduced-transparency:reduce){:host{--rear-alpha-a:1;--rear-alpha-b:1;--front-alpha-a:1;--front-alpha-b:1}}
@media(forced-colors:active){:host{--surface:Canvas;--line:ButtonText;--brand:Highlight;--hover:Canvas;--active:Canvas}.surface-skin{box-shadow:none}.card-front,.card-rear{fill:Canvas;stroke:ButtonText;stroke-opacity:1;stroke-width:1;forced-color-adjust:none}.host-status{color:CanvasText}button:focus-visible{outline-color:Highlight}}`;
  orb=document.createElement('button');orb.type='button';orb.setAttribute('aria-expanded','false');orb.setAttribute('aria-controls','paia-prompt-private');
  // The exact six ui/assets/prompt-r3 SVGs supply the gradients and rectangles;
  // their standalone circles are owned once by surface-skin. No asset title
  // or private text enters the host. Both static cards persist
  // across every mode; the private expression body remains in its own frame.
  const svgNS='http:'+'//www.w3.org/2000/svg',mark=document.createElementNS(svgNS,'svg');
  mark.setAttribute('class','orb');mark.setAttribute('viewBox','0 0 48 48');mark.setAttribute('width','48');mark.setAttribute('height','48');mark.setAttribute('aria-hidden','true');mark.setAttribute('focusable','false');
  const defs=document.createElementNS(svgNS,'defs');
  for(const [name,x] of [['rear','.18'],['front','.2'],['edge','.25']]){const gradient=document.createElementNS(svgNS,'linearGradient');gradient.setAttribute('id','paia-card-'+name);gradient.setAttribute('x2',x);gradient.setAttribute('y2','1');for(const [suffix,offset]of [['a','0'],['b','1']]){const stop=document.createElementNS(svgNS,'stop');stop.setAttribute('class',name+'-'+suffix);stop.setAttribute('offset',offset);gradient.append(stop);}defs.append(gradient);}
  rearCard=document.createElementNS(svgNS,'rect');rearCard.setAttribute('class','card-rear');frontCard=document.createElementNS(svgNS,'rect');frontCard.setAttribute('class','card-front');mark.append(defs,rearCard,frontCard);
  skin=document.createElement('div');skin.className='surface-skin';skin.setAttribute('aria-hidden','true');
  hostStatus=document.createElement('div');hostStatus.className='host-status';hostStatus.setAttribute('role','status');hostStatus.hidden=true;
  orb.append(mark);labelHost();host.dataset.theme=dark()?'dark':'light';root.append(style,skin,orb,hostStatus);document.documentElement.append(host);
  listen(orb,'click',e=>{if(!e.isTrusted||e.detail>1)return;if(suppress&&e.detail!==0){suppress=false;return;}suppress=false;hostNotice();keyboardEntry=e.detail===0;if(frame)requestClose();else{expand();if(keyboardEntry)frame?.focus();keyboardEntry=false;}});
  listen(orb,'pointerdown',e=>{if(!e.isTrusted||e.button!==0||e.isPrimary===false||drag)return;suppress=false;drag={x:e.clientX,y:e.clientY,start:host.getBoundingClientRect(),moved:false,pointerId:e.pointerId};orb.setPointerCapture(e.pointerId);});
  listen(orb,'pointermove',e=>{if(!drag||e.pointerId!==drag.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)<5&&!drag.moved)return;drag.moved=true;suppress=true;position={x:Math.max(0,Math.min(1,(drag.start.x+dx)/(innerWidth-48))),y:Math.max(0,Math.min(1,(drag.start.y+dy)/(innerHeight-48)))};schedule();});
  const end=e=>{if(e?.pointerId!==undefined&&e.pointerId!==drag?.pointerId)return;releaseDrag(true);};listen(orb,'pointerup',end);listen(orb,'pointercancel',e=>{end(e);suppress=false;});listen(orb,'lostpointercapture',end);listen(window,'blur',()=>releaseDrag(true));
  listen(orb,'keydown',e=>{if(e.isTrusted&&e.repeat&&['Enter',' '].includes(e.key)){e.preventDefault();return;}if(e.altKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const r=host.getBoundingClientRect();position={x:Math.max(0,Math.min(1,(r.x+(e.key==='ArrowRight'?12:e.key==='ArrowLeft'?-12:0))/(innerWidth-48))),y:Math.max(0,Math.min(1,(r.y+(e.key==='ArrowDown'?12:e.key==='ArrowUp'?-12:0))/(innerHeight-48)))};retainAnchor();save();}else if(e.key==='Escape'&&open&&!e.isComposing&&e.keyCode!==229){e.preventDefault();requestClose();}});
  schedule();
 }
 async function activate(){const ticket=++activationEpoch;try{const saved=await rpc();if(disposed||ticket!==activationEpoch)return;const prefs=saved.displayPreferences;if(prefs){hostAppearance=['system','light','dark'].includes(prefs.appearance)?prefs.appearance:'system';hostLanguage=['system','zh-CN','en'].includes(prefs.language)?prefs.language:'system';}collapsedForm=saved.collapsedForm==='capsule'?'capsule':'orb';enabled=true;if(!initialized){if((saved.positionGeneration??0)>=positionGeneration)position=saved.position;open=false;initialized=true;}reconcilePosition(saved);mount();if(collapsedForm==='capsule'&&!frame)expand(false);schedule();}catch{if(disposed||ticket!==activationEpoch)return;enabled=false;releaseDrag();if(host)host.hidden=true;frame?.remove();frame=null;}}
 const messages=(r,s,reply)=>{
  if(s.id!==chrome.runtime.id||s.tab)return;
  if(r.type==='PAIA_PROMPT_SURFACE_MEASURE'&&r.nonce===nonce&&(!Object.hasOwn(r,'appearance')||['light','dark'].includes(r.appearance))&&(!Object.hasOwn(r,'language')||['zh-CN','en'].includes(r.language))&&Number.isInteger(r.height)&&r.height>=1&&r.height<=4096&&(!('minimumHeight' in r)||(Number.isInteger(r.minimumHeight)&&r.minimumHeight>=44&&r.minimumHeight<=1024&&r.minimumHeight<=r.height))){const min=r.minimumHeight??134,generation=++measureGeneration,measuredFrame=frame,measuredNonce=nonce;contentHeight=r.height;minimumHeight=min;if(Object.hasOwn(r,'appearance'))resolvedAppearance=r.appearance;if(Object.hasOwn(r,'language'))resolvedLanguage=r.language;requestAnimationFrame(()=>{if(disposed||generation!==measureGeneration||nonce!==measuredNonce||frame!==measuredFrame){reply({measured:false});return;}layout();requestAnimationFrame(()=>reply({measured:!disposed&&generation===measureGeneration&&nonce===measuredNonce&&frame===measuredFrame}));});return true;}
  if(r.type==='PAIA_PROMPT_SURFACE_FORM'&&r.nonce===nonce&&['orb','capsule','board'].includes(r.form)){if(r.form==='board'){open=true;}else{collapsedForm=r.form;open=false;if(r.form==='orb')retireFrame();}orb?.setAttribute('aria-expanded',String(open));layout();if(r.form==='board'&&keyboardEntry)frame?.focus();keyboardEntry=false;if(r.form!=='board'&&orb&&!orb.hidden)orb.focus();save();reply({form:r.form});return;}
  if(r.type==='PAIA_PROMPT_SURFACE_POSITION_RESET'&&Number.isSafeInteger(r.positionGeneration)&&r.positionGeneration>=0)reconcilePosition({position:null,positionGeneration:r.positionGeneration});
  if(r.type==='PAIA_PROMPT_SURFACE_DIAGNOSTIC_PROBE'&&r.url===location.href){layout();reply({status:availability});}
  if(r.type==='PAIA_PROMPT_SURFACE_PROBE'){reply({open:!!frame?.isConnected&&!host.hidden,expanded:open,nonce,url:location.href,dark:dark(),dragging:!!drag});}
  if(r.type==='PAIA_PROMPT_SURFACE_CLOSE'&&r.nonce===nonce){close(true);reply({closed:true,nonce:r.nonce,form:collapsedForm});}
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
 globalThis.PAIAPromptSurface={nextPlacement(){layout();if(!geometry||host?.hidden)return null;const node=adapter.find();if(!node)return null;const b=(node.closest('form')||node).getBoundingClientRect();return {orb:geometry.orb,card:frame?(open?geometry.card:geometry.capsule):null,form:{x:b.x,y:b.y,w:b.width,h:b.height},dragging:!!drag,dark:dark()};},dispose(){disposed=true;releaseDrag();observer.disconnect();resizeObserver?.disconnect();observedComposer=null;listeners.forEach(fn=>fn());chrome.runtime.onMessage.removeListener(messages);adapter.dispose();retiringFrame?.remove();host?.remove();}};
 void activate();
})();
