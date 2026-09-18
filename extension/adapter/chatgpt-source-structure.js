/* ChatGPT source structure: only capabilities with audited live evidence emit production DTOs. */
(() => {
  'use strict';
  const contract=globalThis.SourceStructureContract;
  class ChatGPTSourceStructure {
    constructor({adapter,clock=()=>new Date().toISOString()}={}){
      if(!adapter||!contract)throw new TypeError('source structure dependency unavailable');
      this.adapter=adapter;
      this.clock=clock;
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
      const dto=contract.currentConversationPresence({
        chat:route,epoch:status.epoch,session,
        generation:this.generation,observedAt:this.clock()
      });
      if(!dto)return null;
      this.issued=true;
      return {chat:route,dto};
    }
    orderCandidate(capability){
      return contract.orderCandidate(capability);
    }
  }
  ChatGPTSourceStructure.capabilities=contract.capabilities;
  globalThis.ChatGPTSourceStructure=ChatGPTSourceStructure;
})();
