/* Static orb only in host DOM. Personal text stays in a cross-origin extension frame. */
(() => {
 'use strict';
 globalThis.PAIAPromptSurface?.dispose();
 let host,root,orb,hint,frontCard,rearCard,frame,retiringFrame,nonce,url=location.href,position=null,positionGeneration=0,open=false,collapsedForm='orb',enabled=false,initialized=false,disposed=false,scheduled=false,geometry=null,drag=null,suppress=false,availability='surface_unavailable',contentHeight=312,minimumHeight=92,measureGeneration=0,resolvedAppearance=null,resolvedLanguage=null,hostAppearance='system',hostLanguage='system',activationEpoch=0;
 const adapter=new globalThis.PAIAChatGPTComposerAdapter(),listeners=[],appearance=matchMedia('(prefers-color-scheme:dark)');
 const dark=()=>frame&&resolvedAppearance!==null?resolvedAppearance==='dark':hostAppearance==='dark'||hostAppearance!=='light'&&appearance.matches;
 const english=()=>{const language=frame&&resolvedLanguage!==null?resolvedLanguage:hostLanguage;return language==='en'||language==='system'&&!String(globalThis.navigator?.language||'zh-CN').toLowerCase().startsWith('zh');};
 const hostText=(zh,en)=>english()?en:zh;
 const labelHost=()=>{if(orb){orb.setAttribute('aria-label',open?hostText('收起常用表达','Collapse frequent expressions'):hostText('展开常用表达','Expand frequent expressions'));orb.setAttribute('aria-expanded',String(open));}if(hint)hint.textContent=hostText('我的常用表达','My frequent expressions');if(frame)frame.title=hostText('PAIA 常用 Prompt','PAIA Frequent inputs');};
 const listen=(node,event,fn,options)=>{node.addEventListener(event,fn,options);listeners.push(()=>node.removeEventListener(event,fn,options));};
 let observedComposer=null;
 const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;
 const observeComposer=node=>{if(node===observedComposer)return;resizeObserver?.disconnect();observedComposer=node;if(node)resizeObserver?.observe(node);};
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
  prior.animate([{opacity:1},{opacity:0}],{duration:80,easing:'ease-out'}).finished.then(remove,remove);
 }
 function close(focus=false){releaseDrag();open=false;if(collapsedForm!=='capsule')retireFrame();orb?.setAttribute('aria-expanded','false');layout();if(focus&&orb&&!orb.hidden)orb.focus();save();}
 function expand(expanded=true){
  if(!enabled)return;retiringFrame?.remove();retiringFrame=null;if(frame){open=expanded;layout();save();return;}
  nonce=crypto.randomUUID();frame=document.createElement('iframe');frame.title='PAIA 常用 Prompt';frame.allow='clipboard-write';labelHost();
  frame.src=chrome.runtime.getURL('ui/prompt-surface.html')+'#'+nonce;root.append(frame);open=expanded;orb.setAttribute('aria-expanded',String(open));layout();save();
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
  host.dataset.theme=dark()?'dark':'light';host.dataset.expanded=String(open);host.dataset.surfaceForm=open?'board':frame&&g.capsule?collapsedForm:'orb';host.dataset.joined=String(!!frame&&!!(open?g.card:g.capsule));labelHost();
  const anchor=g.orb;
  const style=`position:fixed;left:${anchor.x}px;top:${anchor.y}px;width:${anchor.w}px;height:${anchor.h}px;z-index:2147483646;`;
  if(host.getAttribute('style')!==style)host.setAttribute('style',style);
  orb.hidden=false;
  for(const card of [rearCard,frontCard])for(const [name,value] of Object.entries({x:g.mark.front.x,y:g.mark.front.y,width:g.mark.front.w,height:g.mark.front.h,rx:g.mark.front.r}))card.setAttribute(name,String(value));
  rearCard.setAttribute('transform',`translate(${g.mark.rear.dx} ${g.mark.rear.dy})`);
  if(open&&!frame&&g.card)expand();
  if(frame){const rect=open?g.card:g.capsule;frame.hidden=!rect;if(rect){const c=rect;const s=`position:fixed;left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;border-radius:${open?18:23}px;color-scheme:${host.dataset.theme};pointer-events:${drag?.moved?'none':'auto'};`;if(frame.getAttribute('style')!==s)frame.setAttribute('style',s);}}
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
:host{color-scheme:light;--brand:#637397;--surface:#ffffff;--line:#e5e5e5;--hover:#f2f2f2;--active:#e9e9e9;--muted:#747474;--card-front:rgba(119,130,158,.56);--card-rear:rgba(157,165,186,.46);--card-edge:rgba(255,255,255,.68)}:host([data-theme=dark]){color-scheme:dark;--brand:#a2b0d1;--surface:#2b2b2b;--line:#454545;--hover:#373737;--active:#414141;--muted:#aaaaaa;--card-front:rgba(176,187,215,.72);--card-rear:rgba(137,151,183,.58);--card-edge:rgba(225,232,250,.36)}
button{position:relative;z-index:2;box-sizing:border-box;width:48px;height:48px;padding:0;border:1px solid var(--line);border-radius:50%;background:var(--surface);color:var(--brand);box-shadow:0 2px 7px #00000008;touch-action:none;cursor:pointer}
.orb{position:absolute;left:-1px;top:-1px;display:block;width:48px;height:48px;overflow:visible;pointer-events:none}.card-front{fill:var(--card-front);stroke:var(--card-edge);stroke-width:.65}.card-rear{fill:var(--card-rear);stroke:var(--card-edge);stroke-width:.65;transition:transform 120ms ease-out}
button:hover{background:var(--hover)}button:active{background:var(--active)}button:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.hint{position:absolute;right:54px;top:11px;white-space:nowrap;font:12px/16px Arial,"PingFang SC","Microsoft YaHei",sans-serif;padding:6px 9px;background:var(--surface);border:1px solid var(--line);border-radius:7px;color:var(--muted);box-shadow:0 2px 5px #00000007;opacity:0;pointer-events:none;transition:opacity 90ms}
button:hover .hint,button:focus-visible .hint{opacity:1;transition-delay:650ms}
iframe{z-index:0;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:0 12px 32px -12px rgba(0,0,0,.21), 0 3px 10px -4px rgba(0,0,0,.08);box-sizing:border-box;animation:appear .12s ease-out}
@keyframes appear{from{opacity:0}to{opacity:1}}
:host([data-theme=dark]) iframe{box-shadow:0 16px 36px -10px #0008, 0 2px 9px #0003}
:host([data-expanded=false]) iframe{border:0;box-shadow:0 2px 7px #00000005}
.junction{position:absolute;left:-18px;top:-12px;width:48px;height:60px;z-index:1;pointer-events:none;overflow:visible;display:none;fill:var(--surface)}.junction path{display:none}:host([data-joined=true]) .junction{display:block}:host([data-surface-form=capsule]) .capsule-neck,:host([data-surface-form=board]) .board-neck{display:block}
@media(prefers-reduced-motion:reduce){iframe{animation:none}.hint,.card-rear{transition:none}}
@media(prefers-reduced-transparency:reduce){:host{--card-front:#9aa4bd;--card-rear:#c0c6d4}:host([data-theme=dark]){--card-front:#b0bbd7;--card-rear:#8997b7}}
@media(forced-colors:active){button{color:ButtonText;background:Canvas;border-color:ButtonText;box-shadow:none}.card-front,.card-rear{fill:Canvas;stroke:ButtonText;stroke-width:1}.hint,iframe{background:Canvas;color:CanvasText;border-color:CanvasText;box-shadow:none}.junction{fill:Canvas}button:focus-visible{outline-color:Highlight}}`;
  orb=document.createElement('button');orb.type='button';orb.setAttribute('aria-expanded','false');
  // Only static geometry enters the host's closed shadow. Both cards persist
  // across every mode; the private expression body remains in its own frame.
  const svgNS='http:'+'//www.w3.org/2000/svg',mark=document.createElementNS(svgNS,'svg');
  mark.setAttribute('class','orb');mark.setAttribute('viewBox','0 0 48 48');mark.setAttribute('width','48');mark.setAttribute('height','48');mark.setAttribute('aria-hidden','true');mark.setAttribute('focusable','false');
  rearCard=document.createElementNS(svgNS,'rect');rearCard.setAttribute('class','card-rear');frontCard=document.createElementNS(svgNS,'rect');frontCard.setAttribute('class','card-front');mark.append(rearCard,frontCard);
  const junction=document.createElementNS(svgNS,'svg');junction.setAttribute('class','junction');junction.setAttribute('viewBox','-18 -12 48 60');junction.setAttribute('aria-hidden','true');junction.setAttribute('focusable','false');
  for(const [name,d] of [['capsule-neck','M-8 12 Q0 20 8 12 L8 36 Q0 28 -8 36 Z'],['board-neck','M-8 -12 H12 Q12 0 24 0 V24 H-8 Z']]){const path=document.createElementNS(svgNS,'path');path.setAttribute('class',name);path.setAttribute('d',d);junction.append(path);}
  hint=document.createElement('span');hint.className='hint';hint.setAttribute('aria-hidden','true');orb.append(mark,hint);labelHost();host.dataset.theme=dark()?'dark':'light';root.append(style,junction,orb);document.documentElement.append(host);
  listen(orb,'click',e=>{if(!e.isTrusted||e.detail>1)return;if(suppress&&e.detail!==0){suppress=false;return;}suppress=false;if(frame)requestClose();else expand();});
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
  if(r.type==='PAIA_PROMPT_SURFACE_FORM'&&r.nonce===nonce&&['orb','capsule','board'].includes(r.form)){if(r.form==='board'){open=true;}else{collapsedForm=r.form;open=false;if(r.form==='orb')retireFrame();}orb?.setAttribute('aria-expanded',String(open));layout();if(r.form!=='board'&&orb&&!orb.hidden)orb.focus();save();reply({form:r.form});return;}
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
