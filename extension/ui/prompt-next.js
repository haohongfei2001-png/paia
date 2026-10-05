import {copyPrompt} from '../core/prompt-clipboard.js';
const nonce=location.hash.slice(6);
const css=document.createElement('link');css.rel='stylesheet';css.href='prompt-next.css';document.head.append(css);
document.body.replaceChildren();document.body.className='next-body';
const capsule=document.createElement('section');capsule.className='next-capsule';capsule.setAttribute('aria-label','来自本条回复的可选回复');
const condition=document.createElement('p');condition.className='next-condition';
const choices=document.createElement('div');choices.className='next-choices';
const status=document.createElement('p');status.className='next-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const dismiss=document.createElement('button');dismiss.className='next-dismiss';dismiss.textContent='×';dismiss.setAttribute('aria-label','收起本轮建议');
capsule.append(condition,choices,dismiss,status);document.body.append(capsule);
let group,busy=false,remaining=12000,start=0,timer,hover=false,focus=false;
async function rpc(command){const r=await chrome.runtime.sendMessage({type:'PAIA_PROMPT_NEXT_RPC',nonce,command});if(!r?.ok)throw Error('unavailable');return r.data;}
const hide=()=>void rpc({type:'hide'}).catch(()=>{});
function timing(){if(timer){remaining-=performance.now()-start;clearTimeout(timer);timer=null;}if(hover||focus||busy)return;start=performance.now();timer=setTimeout(hide,Math.max(0,remaining));}
capsule.addEventListener('pointerenter',()=>{hover=true;timing();});capsule.addEventListener('pointerleave',()=>{hover=false;timing();});capsule.addEventListener('focusin',()=>{focus=true;timing();});capsule.addEventListener('focusout',()=>{focus=false;timing();});
dismiss.addEventListener('click',e=>{if(e.isTrusted&&!busy)hide();});
capsule.addEventListener('keydown',e=>{if(e.isTrusted&&e.key==='Escape'&&!e.isComposing&&!busy){e.preventDefault();hide();}});
function resize(){void rpc({type:'resize',height:Math.min(400,Math.max(44,Math.ceil(capsule.getBoundingClientRect().height)))}).catch(()=>{});}
async function insert(choice,button){
 if(busy||choice.attempted)return;busy=true;choice.attempted=true;timing();for(const b of choices.querySelectorAll('button'))b.disabled=true;dismiss.disabled=true;status.textContent='正在插入…';resize();
 let result;
 try{result=await rpc({type:'insert',id:choice.id,operationId:crypto.randomUUID()});}catch{result={status:'uncertain'};}
 const success=result.status==='inserted'&&result.verified===true;
 status.textContent=success?'已插入，未发送。':result.status==='failed'?'无法安全插入。请检查输入框。':'插入结果未确认。请先检查草稿，不会自动重试。';
 busy=false;dismiss.disabled=false;
 // This reply's choices are one-shot; reopening never retries an uncertain write.
 for(const b of choices.querySelectorAll('button'))b.disabled=group.choices.find(x=>x.id===b.dataset.id)?.attempted===true;
 if(success){remaining=1800;hover=false;focus=false;timing();}else{
  const copy=document.createElement('button');copy.textContent='复制';copy.addEventListener('click',async e=>{if(!e.isTrusted)return;try{const x=await rpc({type:'copy',id:choice.id}),out=await copyPrompt(x.text);status.textContent=out.status==='copied'?'已复制，请手动粘贴。':'未能复制，请检查浏览器权限。';}catch{status.textContent='建议已失效。';}resize();});status.append(copy);remaining=12000;timing();
 }
 resize();
}
try{
 group=await rpc({type:'get'});document.documentElement.dataset.theme=group.dark?'dark':'light';
 condition.textContent=group.condition;condition.hidden=!group.condition;
 for(const choice of group.choices){const button=document.createElement('button');button.type='button';button.dataset.id=choice.id;button.textContent=choice.label;button.disabled=choice.attempted;button.addEventListener('click',e=>{if(e.isTrusted)void insert(choice,button);});choices.append(button);}
 resize();timing();new ResizeObserver(resize).observe(capsule);
}catch{hide();}
