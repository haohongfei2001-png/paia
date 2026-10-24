/* PAIA V15 visual owner: a complete editorial folio in an ordinary-height section.
 * Exact source text is cloned from the existing semantic V13 fallback.
 * No account access, storage, model calls, permissions or automatic message sends.
 */
export async function mount(){
  'use strict';
  const host=document.getElementById('thoughts');
  if(!host||host.shadowRoot)return;
  const zh=document.documentElement.lang.startsWith('zh');
  const tr=(cn,en)=>zh?cn:en;
  const heading=host.querySelector('.p13-section-head h2');
  const description=host.querySelector('.p13-description');
  const originals=[...host.querySelectorAll('.p13-thought-entry')];
  const subjects=[...host.querySelectorAll('.p13-topic')];
  if(!heading||!description||subjects.length!==3||originals.length!==2)throw new Error('Required Thought Library contents missing');
  const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),10000);
  let html,css;
  try{
    const resources=await Promise.all(['thought15.html','thought15.css'].map(async path=>{
      const response=await fetch('/assets/website/atelier/'+path+'?v=20261024-v15',{credentials:'omit',signal:ctl.signal});
      if(!response.ok)throw new Error('Thought visual file unavailable');
      return response.text();
    }));
    html=resources[0];css=resources[1];
  } finally {clearTimeout(timer);}
  if(!html.includes('pa15-story')||!css.includes('.pa15-stage'))throw new Error('Incomplete Thought presentation');
  const fragment=document.createElement('template');fragment.innerHTML=html.trim();
  const root=fragment.content.firstElementChild;
  if(!root)throw new Error('No Thought root');
  const $=(s,parent=root)=>parent.querySelector(s);
  const $$=(s,parent=root)=>[...parent.querySelectorAll(s)];
  root.setAttribute('aria-label',tr('思想库完整呈现','Thought Library presentation'));
  $('.pa15-kicker').textContent=tr('02 / 形成自己的积累','02 / A BODY OF YOUR OWN THOUGHTS');
  $('#pa15-headline').innerHTML=heading.innerHTML;
  $('.pa15-intro-desc').innerHTML=description.innerHTML;
  $('.pa15-head-mid').textContent=tr('我的主题','My topics');
  $('.pa15-index').setAttribute('aria-label',tr('三个主题与章节','Three topics and chapters'));
  $('.pa15-index-head').textContent=tr('我的主题','MY TOPICS');
  $('.pa15-story').setAttribute('aria-label',tr('当前主题的完整章节','A complete chapter of the current topic'));
  subjects.forEach((subject,index)=>{
    const node=document.createElement('section');node.className='pa15-topic'+(index===1?' is-current':'');
    const number=document.createElement('span');number.className='pa15-topic-number';number.textContent=String(index+1).padStart(2,'0');
    const info=document.createElement('div');
    const name=document.createElement('strong');name.textContent=subject.querySelector('h3')?.textContent.trim()||'';
    const chapters=document.createElement('p');
    subject.querySelectorAll('.p13-topic-chapters>span').forEach(label=>{
      const span=document.createElement('span');span.textContent=label.textContent.trim();chapters.append(span);
    });
    info.append(name,chapters);node.append(number,info);$('.pa15-index-items').append(node);
  });
  $('.pa15-story-identity').textContent=host.querySelector('.p13-reader-identity')?.textContent.trim()||'';
  host.querySelectorAll('.p13-reader-tabs>span').forEach(tab=>{
    const span=document.createElement('span');span.textContent=tab.textContent.trim();
    if(tab.classList.contains('is-current'))span.classList.add('is-active');
    $('.pa15-chapters').append(span);
  });
  $('.pa15-story-title').textContent=host.querySelector('.p13-reader-body h3')?.textContent.trim()||tr('第一步','The first step');
  originals.forEach(original=>{
    const article=document.createElement('section');article.className='pa15-entry';
    article.append(original.querySelector('time').cloneNode(true));
    original.querySelectorAll('.p13-entry-body p').forEach(p=>article.append(p.cloneNode(true)));
    $('.pa15-entries').append(article);
  });
  $('.pa15-end span').textContent=host.querySelector('.p13-reader-footer span')?.textContent.trim()||'';
  const link=tr('/zh/demo.html#topic-reader','/demo.html#topic-reader');
  $('.pa15-end a').href=link;
  $('.pa15-end a').setAttribute('aria-label',tr('在产品示例中打开这一章节','Open this chapter in the product example'));
  $('.pa15-tail a').href=link;
  $('.pa15-tail a').innerHTML=tr('打开这个主题 <span aria-hidden="true">↗</span>','Open this topic <span aria-hidden="true">↗</span>');
  $('.pa15-tail p').textContent=tr('保留自己的判断，也容得下后来改变的想法。','Keep your earlier judgments, while making room for thoughts that change.');
  const shadow=host.attachShadow({mode:'open'}),style=document.createElement('style');style.textContent=css;
  shadow.append(style,root);
  host.style.padding='0';host.style.maxWidth='none';host.style.width='100%';host.style.margin='0';host.style.overflow='visible';
  host.setAttribute('aria-label',tr('思想库','Thought Library'));host.removeAttribute('aria-labelledby');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let raf=0;
  function paint(){
    raf=0;
    if(reduce.matches||innerWidth<=800){
      root.style.setProperty('--rot','0deg');
      root.style.setProperty('--xrot','0deg');
      root.style.setProperty('--scale','1');
      return;
    }
    const rect=$('.pa15-stage').getBoundingClientRect();
    const fraction=Math.max(0,Math.min(1,(innerHeight-rect.top)/(innerHeight+rect.height)));
    const eased=fraction*fraction*(3-2*fraction);
    root.style.setProperty('--rot',(-3.5*(1-eased)).toFixed(3)+'deg');
    root.style.setProperty('--xrot',(8*(1-eased)).toFixed(3)+'deg');
    root.style.setProperty('--scale',(0.982+0.018*eased).toFixed(4));
  }
  function schedule(){if(!raf)raf=requestAnimationFrame(paint);}
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
  reduce.addEventListener('change',schedule);
  paint();
  host.dataset.spatial15='ready';
  document.body.dataset.spatial15='ready';
}
