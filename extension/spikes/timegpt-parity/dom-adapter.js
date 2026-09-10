/* All experiment DOM selectors live here. No text getters. */
(() => {
  'use strict';
  const C=globalThis.ParityContract;
  const unsafe='textarea,input,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[data-testid*="attachment"]';
  function route(){
    if(location.origin!==C.ORIGIN||new URL(location.href).searchParams.get('temporary-chat')==='true'||
       document.querySelector('[data-testid="temporary-chat"],[data-testid="temporary-chat-indicator"],[data-is-temporary-chat="true"]'))return null;
    const id=location.pathname.match(/^\/(?:g\/[A-Za-z0-9_-]+\/)?c\/([^/]+)\/?$/)?.[1];return C.ID.test(id||'')?id:null;
  }
  function ids(){
    const mains=document.querySelectorAll('main');if(mains.length!==1)return [];
    const nodes=mains[0].querySelectorAll('[data-message-id]');if(nodes.length>4000)return [];
    const counts=new Map();for(const n of nodes){const id=n.getAttribute('data-message-id');counts.set(id,(counts.get(id)||0)+1);}
    const result=[];
    for(const n of nodes){
      const id=n.getAttribute('data-message-id');if(!C.ID.test(id||'')||counts.get(id)!==1||n.getAttribute('data-message-author-role')!=='user')continue;
      if(n.closest(unsafe)||n.querySelector(unsafe)||n.closest('[hidden],[aria-hidden="true"]')||n.getClientRects().length===0||getComputedStyle(n).visibility!=='visible')continue;
      result.push(id);if(result.length>C.LIMIT)return [];
    }
    return result;
  }
  globalThis.ParityDOM=Object.freeze({route,ids});
})();
