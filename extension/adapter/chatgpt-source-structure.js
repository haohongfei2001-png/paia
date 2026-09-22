/* ChatGPT source structure: only capabilities with audited live evidence emit production DTOs. */
(() => {
  'use strict';
  const contract=globalThis.SourceStructureContract;
  const PROJECT_ID=/^g-p-[a-f0-9]{32}$/;
  class ChatGPTSourceStructure {
    constructor({adapter,clock=()=>new Date().toISOString(),document=globalThis.document,location=globalThis.location}={}){
      if(!adapter||!contract)throw new TypeError('source structure dependency unavailable');
      this.adapter=adapter;
      this.clock=clock;
      this.document=document;
      this.location=location;
      this.generation=0;
      this.lastIssuedKey=null;
    }
    reset(){
      this.generation++;
      this.lastIssuedKey=null;
    }
    capabilities(){
      return contract.capabilities;
    }
    normalize(value){
      return typeof value==='string'?value.replace(/\s+/g,' ').trim():'';
    }
    excluded(node){
      return !!node?.closest?.('[data-message-author-role], textarea, input, [contenteditable]:not([contenteditable="false"]), [role="textbox"]');
    }
    routeState(route){
      let url;
      try{url=new URL(this.location?.href);}catch{return null;}
      if(url.origin!=='https://chatgpt.com')return null;
      let match=url.pathname.match(/^\/g\/(g-p-[a-f0-9]{32})(?:-[^/]*)?\/c\/([A-Za-z0-9_-]{8,128})\/?$/i);
      if(match&&match[2]===route.id){
        const projectId=match[1].toLowerCase();
        if(PROJECT_ID.test(projectId))return {kind:'project',projectId};
      }
      match=url.pathname.match(/^\/c\/([A-Za-z0-9_-]{8,128})\/?$/);
      if(match&&match[1]===route.id)return {kind:'plain'};
      match=url.pathname.match(/^\/g\/[^/]+\/c\/([A-Za-z0-9_-]{8,128})\/?$/);
      if(match&&match[1]===route.id)return {kind:'other'};
      return {kind:'other'};
    }
    projectName(projectId){
      if(!this.document?.querySelectorAll)return null;
      const names=new Set();
      let inspected=0;
      for(const node of this.document.querySelectorAll('a[href]')){
        if(++inspected>160)break;
        if(this.excluded(node))continue;
        let link;
        try{link=new URL(node.getAttribute('href'),this.location?.href);}catch{continue;}
        if(link.origin!=='https://chatgpt.com')continue;
        const match=link.pathname.match(/^\/g\/(g-p-[a-f0-9]{32})(?:-[^/]*)?\/project\/?$/i);
        if(!match||match[1].toLowerCase()!==projectId||!this.adapter.visible(node))continue;
        const label=this.normalize(node.textContent)||this.normalize(node.getAttribute('aria-label'));
        if(!label||[...label].length>300)return null;
        names.add(label);
        if(names.size>1)return null;
      }
      return names.size===1?[...names][0]:null;
    }
    emit(key,build){
      if(key===this.lastIssuedKey)return null;
      this.generation++;
      const value=build(this.generation);
      if(!value)return null;
      this.lastIssuedKey=key;
      return value;
    }
    observe(status,{session}={}){
      if(status?.enabled!==true||status?.consented!==true||
         status?.adapterVersion!==this.adapter.version)return null;
      const route=this.adapter.route();
      if(route.code!=='READY')return null;
      const state=this.routeState(route);
      if(!state)return null;
      if(state.kind==='project'){
        const projectName=this.projectName(state.projectId);
        if(!projectName)return null;
        const key=`project:${route.id}:${state.projectId}:${projectName}`;
        return this.emit(key,generation=>{
          const context={chat:route,epoch:status.epoch,session,generation,observedAt:this.clock()};
          const dtos=contract.currentProjectMembership({...context,projectId:state.projectId,projectName});
          return dtos?.length?{chat:route,dtos,stateKey:key}:null;
        });
      }
      if(state.kind==='plain'){
        const key=`unassigned:${route.id}`;
        return this.emit(key,generation=>{
          const context={chat:route,epoch:status.epoch,session,generation,observedAt:this.clock()};
          const dto=contract.currentProjectUnassigned(context);
          return dto?{chat:route,dtos:[dto],stateKey:key}:null;
        });
      }
      const key=`identity:${route.id}`;
      return this.emit(key,generation=>{
        const context={chat:route,epoch:status.epoch,session,generation,observedAt:this.clock()};
        const dto=contract.currentConversationPresence(context);
        return dto?{chat:route,dtos:[dto],stateKey:key}:null;
      });
    }
    orderCandidate(capability){
      return contract.orderCandidate(capability);
    }
  }
  ChatGPTSourceStructure.capabilities=contract.capabilities;
  globalThis.ChatGPTSourceStructure=ChatGPTSourceStructure;
})();
