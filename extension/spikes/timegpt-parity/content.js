/* ISOLATED document_idle: listener first, active drain second; counts only UI. */
(() => {
  'use strict';
  const C=globalThis.ParityContract,A=globalThis.ParityDOM;
  let chat=null,rows=[],matched=[],hook=false,drained=false,stopped=false,manuallyStopped=false,at=0;
  let stats={observed:0,accepted:0,rejected:0};
  const host=document.createElement('aside');host.id='paia-parity-panel';
  host.style.cssText='position:fixed;bottom:12px;right:12px;z-index:2147483647;max-width:320px';
  const shadow=host.attachShadow({mode:'open'}),style=document.createElement('style');
  style.textContent='section{background:#17202b;color:#fff;border:1px solid #728096;border-radius:8px;padding:12px;font:12px/1.5 system-ui}pre{white-space:pre-wrap;margin:8px 0}button{font:inherit;padding:4px 8px}';
  const section=document.createElement('section'),title=document.createElement('strong'),pre=document.createElement('pre'),button=document.createElement('button');
  title.textContent='TimeGPT Parity · 临时实验';pre.id='paia-parity-summary';button.id='paia-parity-stop';button.textContent='停止并清空';
  section.append(title,pre,button);shadow.append(style,section);document.documentElement.append(host);
  function drain(){if(chat&&!stopped)window.postMessage({type:'parity-drain-v1',chat},C.ORIGIN);}
  function render(){
    const next=A.route();if(next!==chat){chat=next;rows=[];matched=[];drained=false;at=0;drain();}
    if(Date.now()-at>=C.TTL){rows=[];matched=[];}
    const map=new Map(rows.filter(r=>C.validTime(r.time)).map(r=>[r.id,r.time]));
    matched=!stopped&&chat?A.ids().filter(id=>map.has(id)).map(id=>({id,time:map.get(id)})):[];
    const value=`status: ${stopped?'stopped':chat?'observing':'ordinary chat required'}\nMAIN hook: ${hook?'seen':'waiting'}\ndrain received: ${drained?'yes':'no'}\nobserved detail responses: ${stats.observed}\naccepted responses: ${stats.accepted}\nrejected responses: ${stats.rejected}\ncreate_time candidates: ${stopped?0:map.size}\nmatched user messages: ${matched.length}\n`;
    if(pre.textContent!==value)pre.textContent=value;
  }
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==C.ORIGIN||stopped)return;
    const d=event.data;if(d?.type!=='parity-data-v1'||!C.ID.test(d.chat||'')||!C.validRows(d.rows)||!d.stats)return;
    if(!['observed','accepted','rejected'].every(k=>Number.isSafeInteger(d.stats[k])&&d.stats[k]>=0&&d.stats[k]<=1000000))return;
    hook=true;stats={observed:d.stats.observed,accepted:d.stats.accepted,rejected:d.stats.rejected};
    if(d.stopped===true){stopped=true;rows=[];matched=[];}
    else if(d.chat===A.route()){if(chat!==d.chat)drained=false;chat=d.chat;rows=d.rows.map(r=>({id:r.id,time:r.time}));at=Date.now();drained ||= d.drain===true;}
    render();
  });
  button.addEventListener('click',()=>{manuallyStopped=true;stopped=true;rows=[];matched=[];window.postMessage({type:'parity-stop-v1'},C.ORIGIN);render();});
  render();drain();const retry1=setTimeout(drain,1000),retry2=setTimeout(drain,3000);
  let poll=setInterval(render,250);
  window.addEventListener('pagehide',()=>{stopped=true;rows=[];matched=[];clearInterval(poll);clearTimeout(retry1);clearTimeout(retry2);});
  window.addEventListener('pageshow',event=>{if(event.persisted&&!manuallyStopped){stopped=false;chat=null;rows=[];matched=[];render();drain();poll=setInterval(render,250);}});
})();
