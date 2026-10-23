/* Finite, viewport-aware presentation. No service, data store or message send. */
(() => {
 'use strict';
 const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
 const zh=document.documentElement.lang.startsWith('zh');
 const words=(a,b)=>zh?a:b;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const header=$('#site-header'),menu=$('#mobile-nav'),menuButton=$('.menu-toggle');
 let scrollTick=false;
 function updateHeader(){header.classList.toggle('is-scrolled',scrollY>80);scrollTick=false;}
 addEventListener('scroll',()=>{if(!scrollTick){scrollTick=true;requestAnimationFrame(updateHeader);}},{passive:true});updateHeader();
 function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label',words('打开导航','Open navigation'));}
 menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?words('关闭导航','Close navigation'):words('打开导航','Open navigation'));menu.hidden=!open;});
 $$('#mobile-nav a').forEach(a=>a.addEventListener('click',closeMenu));
 addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){closeMenu();menuButton.focus({preventScroll:true});}});
 // Approved R3 remains the actual component. This host contains only a readonly
 // fictional draft. Timeline writes never touch visitor text or a native AI UI.
 const phrases=(zh?['保留我的原意，用更自然的语言表达。','请先给出结论，再解释原因。','发现我的前提有问题，请直接指出。','先比较不同方案，再说明取舍。','给出一个具体的例子。','把可以执行的下一步写清楚。']:['Keep my meaning, using more natural language.','Give the conclusion first, then explain why.','Point out a mistaken premise directly.','Compare the options, then explain the trade-offs.','Give a concrete example.','Make the actionable next step clear.']).map((text,i)=>({id:'example-'+i,text,revision:1,hidden:false,pinned:false}));
 const draft=$('#prompt-draft'),host=$('#r3-host');
 const initial=words('帮我改一改这段文字。','Help me revise this paragraph.');
 let surface=null,manualFloat=false;
 const adapter={list:()=>phrases,recommendation:()=>phrases[0].id,
  async insert(snapshot){const p=phrases.find(x=>x.id===snapshot.id);if(!p||p.text!==snapshot.text||p.revision!==snapshot.revision)return{ok:false};draft.value=initial+'\n'+p.text;host.closest('[data-story]').dataset.phase='3';return{ok:true};},
  async save(){return{ok:false,reason:words('这是展示画面；完整操作请进入产品示例。','This is a presentation. Explore the product example for the full interaction.')}},
  async mutate(){return{ok:false,reason:words('这里只演示复用，不修改保存的表达。','This presentation does not change your saved expressions.')}},
  open(){location.href=zh?'/zh/demo.html#prompt-reuse':'/demo.html#prompt-reuse';}
 };
 if(window.PaiaRefinement?.Surface){surface=new window.PaiaRefinement.Surface(host,$('#r3-composer'),adapter,{mode:'collapsed'});surface.previous='collapsed';}
 function floatPhase(phase){if(!surface||manualFloat)return;
  if(phase===0){draft.value=initial;surface.setMode('collapsed');}
  if(phase===1){draft.value=initial;surface.setMode('capsule');}
  if(phase===2){surface.setMode('board');draft.value=initial;}
  if(phase===3){draft.value=initial+'\n'+phrases[0].text;surface.setMode('capsule');}
 }
 // A visitor who deliberately touches the component owns it from that point.
 // Automatic animation cannot subsequently overwrite their selected state.
 host.addEventListener('pointerdown',()=>{manualFloat=true;const story=stories.find(s=>s.key==='reuse');if(story)story.pause(true);},{capture:true});
 host.addEventListener('keydown',()=>{manualFloat=true;const story=stories.find(s=>s.key==='reuse');if(story)story.pause(true);},{capture:true});
 let raf=0,last=0;
 const duration={archive:6700,thoughts:8400,reuse:10500,edit:5800,daily:6400};
 class Story {
  constructor(el){this.el=el;this.key=el.dataset.story;this.duration=duration[this.key]||7000;this.elapsed=0;this.visible=false;this.started=false;this.done=false;this.paused=false;this.phase=3;
   this.button=$('[data-story-pause]',el);this.replay=$('[data-story-replay]',el);
   this.button?.addEventListener('click',()=>{if(this.done)this.reset();else this.pause(!this.paused);});
   this.replay?.addEventListener('click',()=>this.reset());
  }
  setPhase(value){if(value===this.phase)return;this.phase=value;this.el.dataset.phase=String(value);if(this.key==='reuse')floatPhase(value);}
  showFinal(){this.started=true;this.done=true;this.paused=false;this.elapsed=this.duration;this.setPhase(3);if(this.key==='reuse')floatPhase(3);this.el.dataset.storyState='static';this.updateControl();}
  start(){if(this.started)return;this.started=true;this.elapsed=0;this.done=false;this.paused=false;this.setPhase(0);this.el.dataset.storyState='playing';this.updateControl();schedule();}
  reset(){if(reduce.matches){this.showFinal();return;}if(this.key==='reuse')manualFloat=false;this.done=false;this.started=true;this.elapsed=0;this.paused=false;this.setPhase(0);this.el.dataset.storyState='playing';this.el.getAnimations({subtree:true}).forEach(a=>a.play());this.updateControl();schedule();}
  pause(value){this.paused=value;this.el.dataset.storyState=value?'paused':this.done?'complete':'playing';this.el.getAnimations({subtree:true}).forEach(a=>value?a.pause():a.play());this.updateControl();if(!value)schedule();}
  updateControl(){if(!this.button)return;const stopped=this.paused||this.done;this.button.setAttribute('aria-pressed',String(this.paused));this.button.setAttribute('aria-label',this.done?words('重播演示','Replay presentation'):stopped?words('继续演示','Resume presentation'):words('暂停演示','Pause presentation'));this.button.querySelector('span').textContent=this.done?'↺':stopped?'▷':'Ⅱ';const label=$('.p10-control-label',this.button);if(label)label.textContent=this.done?words('重播','Replay'):stopped?words('继续','Resume'):words('暂停','Pause');}
  advance(dt){this.elapsed=Math.min(this.duration,this.elapsed+dt);const progress=this.elapsed/this.duration;const phase=progress<.2?0:progress<.43?1:progress<.78?2:3;this.setPhase(phase);if(progress===1){this.done=true;this.el.dataset.storyState='complete';this.updateControl();}}
 }
 const stories=$$('[data-story]').map(el=>new Story(el));
 function schedule(){if(!raf&&!document.hidden&&!reduce.matches){last=0;raf=requestAnimationFrame(tick);}}
 // Count visible elapsed time, not a capped frame budget. Otherwise a busy
 // device stretches a finite presentation indefinitely at a low frame rate.
 function tick(time){const delta=last?Math.max(0,time-last):0;last=time;let active=false;for(const story of stories){if(story.visible&&story.started&&!story.done&&!story.paused){story.advance(delta);active=true;}}raf=active?requestAnimationFrame(tick):0;if(!active)last=0;}
 if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries){const story=stories.find(s=>s.el===entry.target);story.visible=entry.isIntersecting;if(story.visible){if(reduce.matches)story.showFinal();else story.start();story.el.getAnimations({subtree:true}).forEach(a=>{if(!story.paused)a.play();});}else story.el.getAnimations({subtree:true}).forEach(a=>a.pause());}schedule();},{threshold:.18});stories.forEach(s=>observer.observe(s.el));}else stories.forEach(s=>s.showFinal());
 if(reduce.matches)stories.forEach(s=>s.showFinal());
 reduce.addEventListener('change',()=>{if(reduce.matches){cancelAnimationFrame(raf);raf=0;stories.forEach(s=>{s.showFinal();s.el.getAnimations({subtree:true}).forEach(a=>a.finish());});}else schedule();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;stories.forEach(s=>s.el.getAnimations({subtree:true}).forEach(a=>a.pause()));}else{stories.filter(s=>s.visible&&!s.paused).forEach(s=>s.el.getAnimations({subtree:true}).forEach(a=>a.play()));schedule();}});
 // Same-word continuity is structural: the three nodes remain in place in the
 // DOM and only their composition changes. Screen readers get them once.
 document.body.dataset.atelierReady='true';
})();
