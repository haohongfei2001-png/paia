/* ISOLATED world: bounded reconciliation for body-free source observations. */
(() => {
  'use strict';
  const adapter=new globalThis.ChatGPTAdapter();
  const sourceStructure=new globalThis.ChatGPTSourceStructure({adapter});
  const POLL_MS=750;
  const REQUEST_TIMEOUT_MS=5000;
  const PENDING_TTL_MS=30000;
  const MAX_ATTEMPTS=40;
  let timer=null;
  let stopped=false;
  let inFlight=false;
  let activeKey=null;
  let settledKey=null;
  let session=crypto.randomUUID();
  let pending=null;

  function reset(){
    sourceStructure.reset();
    activeKey=null;
    settledKey=null;
    pending=null;
    session=crypto.randomUUID();
  }
  function schedule(){
    if(stopped||inFlight||timer!==null)return;
    timer=setTimeout(()=>{timer=null;void cycle();},POLL_MS);
  }
  async function send(message){
    let deadline;
    try{
      if(!globalThis.chrome?.runtime?.id){stopped=true;return null;}
      return await Promise.race([
        chrome.runtime.sendMessage(message),
        new Promise(resolve=>{deadline=setTimeout(()=>resolve(null),REQUEST_TIMEOUT_MS);})
      ]);
    }catch{
      if(!globalThis.chrome?.runtime?.id)stopped=true;
      return null;
    }finally{clearTimeout(deadline);}
  }
  function currentRoute(){
    const route=adapter.route();
    return route.code==='READY'?route:null;
  }
  function sameRoute(chat){
    const route=currentRoute();
    return !!route&&route.id===chat.id&&route.url===chat.url;
  }
  async function cycle(){
    if(stopped||inFlight)return;
    inFlight=true;
    try{
      const statusReply=await send({type:'GET_STATUS'});
      const status=statusReply?.ok===true?statusReply.data:null;
      const route=currentRoute();
      const allowed=status?.consented===true&&status?.enabled===true&&
        status?.adapterVersion===adapter.version&&route;
      if(!allowed){
        if(activeKey!==null||pending)reset();
        return;
      }
      const key=`${status.epoch}:${route.id}`;
      if(activeKey!==key){
        reset();
        activeKey=key;
      }
      if(settledKey===key)return;
      if(!pending){
        const observation=sourceStructure.observe(status,{session});
        if(!observation)return;
        pending={...observation,key,startedAt:Date.now(),attempts:0,nextAt:0};
      }
      if(pending.key!==key||!sameRoute(pending.chat)){reset();return;}
      if(Date.now()<pending.nextAt)return;
      if(pending.attempts>=MAX_ATTEMPTS||Date.now()-pending.startedAt>PENDING_TTL_MS){
        pending=null;
        return;
      }
      pending.attempts++;
      const reply=await send({
        type:'OBSERVE_SOURCE_STRUCTURE',epoch:status.epoch,adapterVersion:adapter.version,
        chat:pending.chat,observation:pending.dto
      });
      if(reply?.ok===true&&reply.data?.settled===true){
        settledKey=key;
        pending=null;
        return;
      }
      if(reply?.error==='PAUSED'||reply?.error==='CONSENT_REQUIRED'||reply?.error==='STALE_CAPTURE'){
        reset();
        return;
      }
      pending.nextAt=Date.now()+POLL_MS;
    }finally{
      inFlight=false;
      schedule();
    }
  }

  globalThis.addEventListener?.('pagehide',()=>{
    stopped=true;
    clearTimeout(timer);
    timer=null;
    reset();
  });
  globalThis.addEventListener?.('pageshow',event=>{
    if(!event.persisted||!stopped)return;
    stopped=false;
    void cycle();
  });
  void cycle();
})();
