/* Homepage-only display-state demonstration. No persistence, AI or real grants. */
(() => {
  'use strict';
  const root=document.querySelector('.layout-adjusted');
  if(!root)return;
  const host=root.querySelector('.layout-chat-host');
  const card=host.querySelector('#pc-prompt-card');
  const orb=host.querySelector('[data-prompt-toggle]');
  const capsule=host.querySelector('[data-surface-capsule]');
  const list=host.querySelector('[data-prompt-list]');
  const composer=host.querySelector('#pc-composer');
  const switches=[...root.querySelectorAll('[data-surface-view]')];
  const zh=root.dataset.locale==='zh';
  let collapsed='orb', frame=0, inspection=null;
  const check=document.createElement('div');
  check.className='layout-check';check.hidden=true;
  const body=document.createElement('p');body.tabIndex=0;
  body.setAttribute('role','region');body.setAttribute('aria-label',zh?'核对完整原话':'Inspect complete wording');
  const actions=document.createElement('div');actions.className='layout-check-actions';
  const back=document.createElement('button');back.type='button';back.textContent=zh?'返回':'Back';
  const use=document.createElement('button');use.type='button';use.textContent=zh?'填入':'Insert';
  actions.append(back,use);check.append(body,actions);card.append(check);
  function sync(){
    const state=card.hidden?collapsed:'board';host.dataset.surfaceState=state;
    orb.hidden=state==='capsule';capsule.hidden=state!=='capsule';
    orb.setAttribute('aria-expanded',String(!card.hidden));
    capsule.setAttribute('aria-expanded',String(!card.hidden));
    switches.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.surfaceView===state)));
    schedule();
  }
  function choose(state){
    if(state!=='board')collapsed=state;
    card.hidden=state!=='board';sync();
  }
  switches.forEach(button=>{button.disabled=false;button.addEventListener('click',()=>choose(button.dataset.surfaceView));});
  capsule.disabled=false;
  capsule.addEventListener('click',()=>{choose('board');list.querySelector('[data-prompt-pick]').focus({preventScroll:true});});
  // The original button keeps its original toggle owner. Observe, don't double-toggle.
  new MutationObserver(sync).observe(card,{attributes:true,attributeFilter:['hidden']});
  function closeCheck(focus=true){
    const target=inspection?.opener;inspection=null;body.textContent='';check.hidden=true;list.hidden=false;
    if(focus&&target?.isConnected)target.focus({preventScroll:true});schedule();
  }
  host.addEventListener('click',event=>{
    const pick=event.target.closest('[data-prompt-pick]');if(!pick)return;
    const field=pick.closest('[data-prompt-row]').querySelector('[data-prompt-text]');
    const value=field.value;
    if(pick.scrollWidth<=pick.clientWidth+1&&!/[\r\n\t]| {2,}/.test(value)&&value===value.trim())return;
    event.preventDefault();event.stopImmediatePropagation();
    inspection={field,text:value,opener:pick};body.textContent=value;list.hidden=true;check.hidden=false;
    body.focus({preventScroll:true});schedule();
  },true);
  back.addEventListener('click',()=>closeCheck());
  use.addEventListener('click',()=>{
    if(!inspection)return;
    if(inspection.field.value!==inspection.text){closeCheck();return;}
    composer.dispatchEvent(new CustomEvent('paia:demo-insert',{bubbles:true,detail:{value:inspection.text}}));
  });
  check.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.isComposing){event.preventDefault();closeCheck();}});
  host.addEventListener('input',event=>{
    if(event.target.matches('[data-prompt-text]')){
      capsule.querySelector('span').textContent=host.querySelector('[data-prompt-row="0"] textarea').value;
      if(inspection?.field===event.target)closeCheck(false);
    }
    schedule();
  });
  function geometry(){
    frame=0;
    const box=host.getBoundingClientRect(),form=host.querySelector('.pc-composer').getBoundingClientRect();
    const toolbar=host.querySelector('.pc-window-bar').getBoundingClientRect();
    const wrap=host.querySelector('.pc-palette-wrap');
    wrap.style.width=`${Math.max(0,Math.min(innerWidth<=400?322:336,host.clientWidth-32))}px`;
    wrap.style.bottom=`${Math.max(12,box.bottom-form.top+12)}px`;
    const caption=host.querySelector('.pc-prompt-caption');
    const chrome=48+(caption.getClientRects().length?caption.offsetHeight+10:0);
    card.style.maxHeight=`${Math.max(90,form.top-toolbar.bottom-24-chrome)}px`;
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(geometry);}
  const observer=new ResizeObserver(schedule);observer.observe(host);observer.observe(host.querySelector('.pc-composer'));
  addEventListener('resize',schedule,{passive:true});document.fonts.ready.then(schedule);
  sync();
})();
