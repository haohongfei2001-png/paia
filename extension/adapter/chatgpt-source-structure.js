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
      this.routeId=null;
      this.issued=false;
    }
    reset(){
      this.generation++;
      this.routeId=null;
      this.issued=false;
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
    projectRoute(route){
      let url;
      try{url=new URL(this.location?.href);}catch{return null;}
      if(url.origin!=='https://chatgpt.com')return null;
      const match=url.pathname.match(/^\/g\/(g-p-[a-f0-9]{32})(?:-[^/]*)?\/c\/([A-Za-z0-9_-]{8,128})\/?$/i);
      if(!match||match[2]!==route.id)return null;
      const projectId=match[1].toLowerCase();
      return PROJECT_ID.test(projectId)?{projectId}:null;
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
    observe(status,{session}={}){
      if(status?.enabled!==true||status?.consented!==true||
         status?.adapterVersion!==this.adapter.version)return null;
      const route=this.adapter.route();
      if(route.code!=='READY')return null;
      if(this.routeId!==route.id){
        this.generation++;
        this.routeId=route.id;
        this.issued=false;
      }
      if(this.issued)return null;
      const context={
        chat:route,epoch:status.epoch,session,
        generation:this.generation,observedAt:this.clock()
      };
      const project=this.projectRoute(route);
      if(project){
        const projectName=this.projectName(project.projectId);
        if(!projectName)return null;
        const dtos=contract.currentProjectMembership({...context,projectId:project.projectId,projectName});
        if(!dtos?.length)return null;
        this.issued=true;
        return {chat:route,dtos};
      }
      const dto=contract.currentConversationPresence(context);
      if(!dto)return null;
      this.issued=true;
      return {chat:route,dtos:[dto]};
    }
    orderCandidate(capability){
      return contract.orderCandidate(capability);
    }
  }
  ChatGPTSourceStructure.capabilities=contract.capabilities;
  globalThis.ChatGPTSourceStructure=ChatGPTSourceStructure;
})();
