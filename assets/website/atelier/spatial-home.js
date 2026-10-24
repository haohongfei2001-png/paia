/* Official-home promotion of the owner-approved spatial study.
 * Complete V13 content remains the no-JS/network fallback. Shadow DOM isolates
 * the material system from Context/R3. Only two fixed first-party static GETs.
 */
export async function mount() {
  'use strict';
  const host=document.querySelector('#thoughts');
  if(!host||host.shadowRoot)return;
  const zh=document.documentElement.lang.startsWith('zh'),words=(a,b)=>zh?a:b;
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),10000);
  let html,css;
  try{[html,css]=await Promise.all(['index.html','space.css'].map(async name=>{
    const r=await fetch('/design/thought-space/'+name+'?home=20261024-sp14',{credentials:'omit',signal:ctl.signal});
    if(!r.ok)throw new Error('Spatial asset unavailable: '+name);return r.text();
  }));}finally{clearTimeout(timer);}
  const source=new DOMParser().parseFromString(html,'text/html'),scene=source.querySelector('.experience');
  if(!scene||!source.querySelector('.reader')||!css.includes('.projection'))throw new Error('Invalid spatial composition');
  const $=(s,r=scene)=>r.querySelector(s),$$=(s,r=scene)=>Array.from(r.querySelectorAll(s));
  scene.removeAttribute('id');scene.setAttribute('aria-label',words('思想库立体呈现','Spatial Thought Library presentation'));
  const heading=(el,name)=>{const next=document.createElement(name);next.innerHTML=el.innerHTML;el.replaceWith(next);return next;};
  const title=heading($('.intro h1'),'h2');title.id='sp14-title';
  title.innerHTML=host.querySelector('h2').innerHTML.replace(/<em>/g,'<span>').replace(/<\/em>/g,'</span>');
  $('.intro-copy').innerHTML=host.querySelector('.p13-description').innerHTML;
  $$('.topic h2').forEach(h=>heading(h,'h3'));
  const chapterTitle=heading($('.reader h2'),'h3');chapterTitle.id='sp14-reader-title';
  $('.reader').setAttribute('aria-labelledby','sp14-reader-title');
  const topics=Array.from(host.querySelectorAll('.p13-topic'));
  if(topics.length!==3)throw new Error('Expected three existing topics');
  $$('.topic').forEach((el,i)=>{
    $('h3',el).textContent=topics[i].querySelector('h3').textContent;
    $$('.chapter-list span',el).forEach((line,j)=>{line.textContent=topics[i].querySelectorAll('.p13-topic-chapters>span')[j].textContent;});
  });
  $('.reader-breadcrumb>span:nth-child(2)').textContent=host.querySelector('.p13-reader-identity').textContent;
  $$('.reader-chapters span').forEach((s,i)=>{s.textContent=host.querySelectorAll('.p13-reader-tabs>span')[i].textContent;});
  chapterTitle.textContent=host.querySelector('.p13-reader-body h3').textContent;
  const originals=Array.from(host.querySelectorAll('.p13-thought-entry'));
  if(originals.length!==2)throw new Error('Expected complete selected chapter');
  $$('.reader .entry').forEach((entry,i)=>{entry.replaceChildren(originals[i].querySelector('time').cloneNode(true),...Array.from(originals[i].querySelectorAll('.p13-entry-body p')).map(p=>p.cloneNode(true)));});
  $('.reader-end>span').textContent=host.querySelector('.p13-reader-footer>span').textContent;
  $('.reader-end a').href=host.querySelector('.p13-section-end a').getAttribute('href');
  $('.reader-end a').setAttribute('aria-label',words('在产品示例中打开这个主题','Open this topic in the product example'));
  if(!zh){
    $('.intro .eyebrow').innerHTML='<span></span> THOUGHT LIBRARY <span></span>';
    $('.window-title').textContent='My topics';
    $$('.view-control [data-view]').forEach((b,i)=>b.textContent=['Overview','Unfold','Read'][i]);
    $('.view-control').setAttribute('aria-label','Presentation view');
    $('.scroll-hint').innerHTML='Scroll to explore <span aria-hidden="true">↓</span>';
    $('#motion-toggle').setAttribute('aria-label','Static view');
  }
  css=css.replace(/:root/g,'.sp14').replace(/(^|[\s{},])body(?=[\s.\[:{])/g,'$1.sp14').replace(/(^|[\s{},])html(?=[\s.{:])/g,'$1.sp14').replace(/\.intro h1/g,'.intro h2').replace(/\.topic h2/g,'.topic h3').replace(/\.reader h2/g,'.reader h3');
  css+='\n:host{display:block;contain:style}.sp14{position:relative;width:100%;margin:0}.sp14 .scene-bottom{z-index:12}.sp14 h2,.sp14 h3,.sp14 p{box-sizing:border-box}.sp14 .intro{padding-top:20px}.sp14 .reader-body{scrollbar-width:thin}.sp14-tail{display:flex;align-items:center;justify-content:space-between;gap:28px;padding:30px max(6%,24px) 50px;background:#fafbfc;color:#697d98;font:12px/1.9 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}.sp14-tail p{margin:0}.sp14-tail a{color:#5b77a0;min-height:44px;display:inline-flex;align-items:center;gap:24px;border-bottom:1px solid #b6c7dc}.sp14[data-lang=en] .intro h2,.sp14[data-lang=en] .topic h3,.sp14[data-lang=en] .reader h3{font-family:Instrument,Georgia,serif;font-weight:400}.sp14[data-lang=en] .intro h2{font-size:clamp(44px,5vw,72px);line-height:1.15}.sp14[data-motion=static] .intro{padding-top:100px}.sp14[data-motion=static] .reader-body{overflow:auto}.sp14 .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}@media(max-width:760px){.sp14 .intro{padding-top:12px}.sp14[data-lang=en] .intro h2{font-size:43px}.sp14-tail{align-items:flex-start;flex-direction:column;gap:12px;padding-top:24px}.sp14[data-motion=static] .intro{padding-top:90px}.sp14 .view-control button{min-height:44px}}';
  const root=document.createElement('div');root.className='sp14';root.dataset.lang=zh?'zh':'en';
  const style=document.createElement('style');style.textContent=css;root.append(scene);
  const tail=document.createElement('div');tail.className='sp14-tail';tail.append(...Array.from(host.querySelector('.p13-section-end').children).map(n=>n.cloneNode(true)));root.append(tail);
  // All required content is validated before the visible fallback is replaced.
  const shadow=host.attachShadow({mode:'open'});shadow.append(style,root);
  host.style.padding='0';host.style.maxWidth='none';host.style.width='100%';host.style.overflow='visible';
  host.removeAttribute('aria-labelledby');host.setAttribute('aria-label',words('思想库','Thought Library'));
  const stage=$('.sticky-scene'),reader=$('.reader'),cards=$$('.topic'),views=$$('[data-view]'),motion=$('#motion-toggle');
  const reduce=matchMedia('(prefers-reduced-motion:reduce)');let still=reduce.matches,raf=0,pointerX=0,pointerY=0;
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t,smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  const set=(el,k,v)=>el.style.setProperty(k,String(v)),ns='http://www.w3.org/2000/svg';
  ['writing-lines','product-lines','travel-lines'].forEach((id,kind)=>{
    const g=shadow.getElementById(id);
    for(let j=0;j<19;j++){let d='';const q=j/18;
      for(let i=0;i<=150;i++){const t=i/150*Math.PI*2;let x,y;
        if(kind===0){x=120+78*Math.cos(t)*(.70+q*.3)+9*Math.sin(t*2);y=66+37*Math.sin(t)*(.5+q*.5)+15*Math.cos(t)*(q-.5);}
        else if(kind===1){x=120+65*Math.cos(t)+15*Math.cos(t*2)*(q-.5);y=68+39*Math.sin(t)*(.35+q*.65)+21*Math.cos(t)*(q-.5);}
        else{x=120+82*Math.cos(t)*(.6+q*.4);y=68+25*Math.sin(t)+25*Math.sin(t*2)*(q-.5);}
        d+=(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)+' ';
      }
      const path=document.createElementNS(ns,'path');path.setAttribute('d',d+'Z');path.setAttribute('opacity',String(.36+q*.27));g.append(path);
    }
  });
  function paint(){
    raf=0;const mobile=innerWidth<=760,sh=stage.clientHeight,travel=Math.max(1,scene.offsetHeight-sh),p=still?1:clamp(-scene.getBoundingClientRect().top/travel);
    const e=smooth(.22,.70,p),turn=smooth(.02,.83,p),reveal=smooth(.50,.67,p),width=mobile?Math.min(innerWidth-32,520):1180;
    const height=mobile?Math.round(mix(546,Math.min(704,sh-125),e)/2)*2:550,fit=mobile?1:Math.min(mix(1.02,1,turn),(innerWidth-100)/1180,(sh-205)/560);
    set(root,'--progress',p.toFixed(4));set(root,'--expand',e.toFixed(4));set(root,'--board-w',width+'px');set(root,'--board-h',height+'px');set(root,'--fit',fit.toFixed(4));set(root,'--world-y',Math.round(sh*mix(.68,.51,turn))+'px');
    set(root,'--rx',(p>=.84?0:mix(mobile?12:13,0,turn)+(still?0:pointerY*.55))+'deg');set(root,'--ry',(p>=.84?0:mix(mobile?-8:-12,0,turn)+(still?0:pointerX*.65))+'deg');set(root,'--rz',(p>=.84?0:mix(mobile?-3.5:-4,0,turn))+'deg');
    const ht=smooth(.09,.41,p);set(root,'--heading-opacity',1-ht);set(root,'--heading-y',(-55*ht)+'px');set(root,'--heading-scale',1-.08*ht);
    set(root,'--read-opacity',smooth(0,.3,reveal));set(root,'--reader-visibility',reveal>.001?'visible':'hidden');set(root,'--read-y',(1-reveal)*32+'px');set(root,'--read-z',(1-reveal)*65+'px');set(root,'--read-scale',mix(.9,1,reveal));
    reader.inert=reveal<.9;reader.setAttribute('aria-hidden',String(reveal<.02));set(root,'--art-opacity',1-smooth(.03,.48,e));set(root,'--content-y',(-147*e)+'px');set(root,'--chapter-opacity',mobile?1-smooth(.05,.5,e):1);
    cards.forEach((card,i)=>{
      card.style.left='0';card.style.top='0';
      if(mobile){const normal=[-166,(width-244)/2,width-78][i],endX=12+i*(width-24)/3;
        card.style.width=mix(244,(width-34)/3,e)+'px';card.style.height=mix(370,54,e)+'px';set(card,'--tx',mix(normal,endX,e)+'px');set(card,'--ty',mix(i===1?94:115,77,e)+'px');set(card,'--tz',mix(i===1?24:0,0,e)+'px');card.style.opacity=String(mix(i===1?1:.58,1,e));
        set(card,'--topic-font',mix(23,10.5,e)+'px');set(card,'--chapter-font','12px');$('.topic-content',card).style.padding=mix(24,10,e)+'px';$('h3',card).style.marginBottom=mix(17,0,e)+'px';$('.chapter-list',card).style.gap='11px';$('.topic-art',card).style.height='128px';
      }else{const size=smooth(0,.55,e),shift=smooth(.15,1,e);card.style.width=mix(352,224,size)+'px';card.style.height=mix(382,118,size)+'px';set(card,'--tx',mix([32,414,796][i],32,shift)+'px');set(card,'--ty',mix(106,[98,238,378][i],shift)+'px');set(card,'--tz',mix(i===1?22:6,0,e)+'px');card.style.opacity='1';
        set(card,'--topic-font',mix(27,17,e)+'px');set(card,'--chapter-font',mix(13,10.5,e)+'px');$('.topic-content',card).style.padding=mix(28,16,e)+'px';$('h3',card).style.marginBottom=mix(18,7,e)+'px';$('.chapter-list',card).style.gap=mix(10,3,e)+'px';
      }
    });
    reader.style.top=mobile?'142px':'94px';reader.style.bottom=mobile?'15px':'26px';const active=p<.28?0:p<.83?1:2;views.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===active)));root.dataset.view=String(active);root.dataset.motion=still?'static':'scroll';
  }
  function schedule(){if(!raf&&!document.hidden)raf=requestAnimationFrame(paint);}
  function go(value){if(reduce.matches){still=true;schedule();return;}if(still){still=false;root.dataset.motion='scroll';motion.setAttribute('aria-pressed','false');motion.setAttribute('aria-label',words('静态查看','Static view'));paint();}const y=scene.getBoundingClientRect().top+scrollY+value*(scene.offsetHeight-stage.clientHeight);scrollTo({top:y,behavior:'smooth'});schedule();}
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
  stage.addEventListener('pointermove',ev=>{if(still||ev.pointerType==='touch')return;pointerX=clamp((ev.clientX/innerWidth-.5)*2,-1,1);pointerY=clamp((ev.clientY/innerHeight-.5)*2,-1,1);set(root,'--shine-x',(50+pointerX*20)+'%');set(root,'--shine-y',(25+pointerY*13)+'%');schedule();},{passive:true});stage.addEventListener('pointerleave',()=>{pointerX=pointerY=0;schedule();});
  views.forEach(b=>b.addEventListener('click',()=>go(Number(b.dataset.view))));
  motion.addEventListener('click',()=>{still=reduce.matches||!still;root.dataset.motion=still?'static':'scroll';motion.setAttribute('aria-pressed',String(still));motion.setAttribute('aria-label',still?words('恢复滚动动效','Resume scroll motion'):words('静态查看','Static view'));schedule();});
  reduce.addEventListener('change',()=>{still=reduce.matches;root.dataset.reduced=String(reduce.matches);root.dataset.motion=still?'static':'scroll';motion.setAttribute('aria-pressed',String(still));schedule();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else schedule();});
  root.dataset.reduced=String(reduce.matches);if(still)motion.setAttribute('aria-pressed','true');paint();host.dataset.spatial14='ready';document.body.dataset.spatial14='ready';
}
