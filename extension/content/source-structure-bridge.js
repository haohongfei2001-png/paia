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
  let session=crypto.randomUUID();
  let pending=null;

  function reset(){
    sourceStructure.reset();
    activeKey=null;
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
        chat:pending.chat,observations:pending.dtos
      });
      if(reply?.ok===true&&reply.data?.settled===true){
        pending=null;
        return;
      }
      if(reply?.error==='PAUSED'||reply?.error==='CONSENT_REQUIRED'||reply?.error==='STALE_CAPTURE'||reply?.error==='FORBIDDEN'){
        reset();
        return;
      }
      pending.nextAt=Date.now()+POLL_MS;
    }finally{
      inFlight=false;
      schedule();
    }
  }

  const CPR00_PROBE_PATH='/__paia_cpr00_project_probe/index.html';
  const cpr00PageNonce=crypto.randomUUID();
  async function cpr00ProjectDiscovery({salt,href=globalThis.location?.href}={}){
    if(typeof salt!=='string'||!/^[a-f0-9]{32}$/.test(salt)||typeof href!=='string')return null;
    let page;try{page=new URL(href);}catch{return null;}
    if(page.origin!=='https://chatgpt.com')return null;
    const encoder=new TextEncoder();
    const digest=async(kind,value)=>{
      if(typeof value!=='string'||!value.length)return null;
      const hash=await crypto.subtle.digest('SHA-256',encoder.encode(salt+'\0'+kind+'\0'+value));
      return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,32);
    };
    const projectId=segment=>{
      const match=typeof segment==='string'?segment.match(/^(g-p-[a-f0-9]{32})(?:-|$)/i):null;
      return match?match[1].toLowerCase():null;
    };
    const routeInfo=pathname=>{
      let match=pathname.match(/^\/g\/([^/]+)\/c\/([A-Za-z0-9_-]{8,128})\/?$/);
      if(match){const project=projectId(match[1]);return {kind:project?'project_chat':'g_other_chat',project,chatId:match[2]};}
      match=pathname.match(/^\/c\/([A-Za-z0-9_-]{8,128})\/?$/);
      if(match)return {kind:'plain_chat',project:null,chatId:match[1]};
      match=pathname.match(/^\/g\/([^/]+)\/project\/?$/);
      if(match){const project=projectId(match[1]);return {kind:project?'project_home':'g_other_home',project,chatId:null};}
      return {kind:'other',project:null,chatId:null};
    };
    const route=routeInfo(page.pathname);
    const routeProjectDigest=route.project?await digest('project-id',route.project):null;
    const conversationDigest=route.chatId?await digest('conversation-id',route.chatId):null;
    const pageInstanceDigest=await digest('page-instance',cpr00PageNonce);
    const zone=node=>node.closest('header')?'header':node.closest('nav')?'nav':node.closest('aside')?'aside':node.closest('main')?'main':'other';
    const excluded=node=>!!node.closest('[data-message-author-role], textarea, input, [contenteditable]:not([contenteditable="false"]), [role="textbox"]');
    const normalize=value=>typeof value==='string'?value.replace(/\s+/g,' ').trim().slice(0,300):'';
    const anchors=[],rawAnchors=[...document.querySelectorAll('a[href]')];
    for(const node of rawAnchors){
      if(anchors.length>=80||excluded(node))continue;
      let link;try{link=new URL(node.getAttribute('href'),page.href);}catch{continue;}
      if(link.origin!=='https://chatgpt.com')continue;
      const info=routeInfo(link.pathname),segment=link.pathname.match(/^\/g\/([^/]+)/)?.[1]||null;
      const pid=info.project||projectId(segment);
      if(!pid&&!link.pathname.includes('/project'))continue;
      const label=normalize(node.textContent)||normalize(node.getAttribute('aria-label'));
      const pidDigest=pid?await digest('project-id',pid):null;
      anchors.push({
        kind:info.kind,zone:zone(node),visible:adapter.visible(node),projectDigest:pidDigest,
        labelDigest:label?await digest('project-name',label):null,labelLength:[...label].length,
        matchesRouteProject:!!routeProjectDigest&&pidDigest===routeProjectDigest,
        currentConversation:!!route.chatId&&info.chatId===route.chatId,
        selected:node.getAttribute('aria-current')==='page'||node.getAttribute('data-state')==='active'
      });
    }
    const nested=[];
    if(route.chatId){
      const current=rawAnchors.filter(node=>{
        if(excluded(node))return false;
        try{return routeInfo(new URL(node.getAttribute('href'),page.href).pathname).chatId===route.chatId;}catch{return false;}
      });
      for(const link of current.slice(0,20)){
        let ancestor=link.parentElement;
        for(let depth=1;ancestor&&depth<=6;depth++,ancestor=ancestor.parentElement){
          let found=false;
          for(const node of [...ancestor.querySelectorAll('a[href]')].filter(x=>!excluded(x)).slice(0,80)){
            let target;try{target=new URL(node.getAttribute('href'),page.href);}catch{continue;}
            if(target.origin!=='https://chatgpt.com')continue;
            const segment=target.pathname.match(/^\/g\/([^/]+)\/project\/?$/)?.[1],pid=projectId(segment);
            if(!pid)continue;
            const label=normalize(node.textContent)||normalize(node.getAttribute('aria-label'));
            nested.push({distance:depth,projectDigest:await digest('project-id',pid),labelDigest:label?await digest('project-name',label):null,labelLength:[...label].length,visible:adapter.visible(node)});
            found=true;break;
          }
          if(found)break;
        }
      }
    }
    const attributes=[];
    for(const node of [...document.querySelectorAll('[data-project-id],[data-project-name],[data-testid*="project"]')]){
      if(attributes.length>=40||excluded(node))continue;
      const rawId=normalize(node.getAttribute('data-project-id')),rawName=normalize(node.getAttribute('data-project-name')),testId=normalize(node.getAttribute('data-testid'));
      attributes.push({
        tag:String(node.tagName||'').toLowerCase(),zone:zone(node),visible:adapter.visible(node),
        projectIdDigest:rawId?await digest('project-id',projectId(rawId)||rawId):null,
        projectNameDigest:rawName?await digest('project-name',rawName):null,
        testIdDigest:testId?await digest('project-testid',testId):null
      });
    }
    return {
      schemaVersion:1,code:'OK',
      route:{kind:route.kind,projectDigest:routeProjectDigest,conversationDigest},pageInstanceDigest,
      anchors,nestedMemberships:nested.slice(0,20),attributes,
      counts:{
        projectAnchors:anchors.length,
        matchingRouteProjectAnchors:anchors.filter(item=>item.matchesRouteProject).length,
        namedMatchingRouteAnchors:anchors.filter(item=>item.matchesRouteProject&&item.kind==='project_home'&&item.labelDigest).length,
        currentConversationLinks:anchors.filter(item=>item.currentConversation).length,
        nestedMemberships:nested.length,projectAttributes:attributes.length
      },
      privacy:{messageBodiesRead:false,assistantBodiesRead:false,draftsRead:false,rawProjectIdsEmitted:false,rawProjectNamesEmitted:false,urlsEmitted:false}
    };
  }
  globalThis.PAIAProjectDiscoveryProbe=Object.freeze({scan:cpr00ProjectDiscovery});
  function cpr00ProbeSender(sender){
    if(sender?.id!==chrome.runtime.id||typeof sender.url!=='string')return false;
    try{
      const url=new URL(sender.url),self=new URL(chrome.runtime.getURL(CPR00_PROBE_PATH));
      return url.origin===self.origin&&url.pathname===CPR00_PROBE_PATH;
    }catch{return false;}
  }
  chrome.runtime.onMessage.addListener((request,sender,sendResponse)=>{
    if(request?.type!=='CPR00_PROJECT_PROBE')return;
    if(!cpr00ProbeSender(sender)){sendResponse({ok:false,error:'FORBIDDEN'});return false;}
    void cpr00ProjectDiscovery({salt:request.salt})
      .then(data=>sendResponse(data?{ok:true,data}:{ok:false,error:'UNAVAILABLE'}))
      .catch(()=>sendResponse({ok:false,error:'PROBE_FAILED'}));
    return true;
  });

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
