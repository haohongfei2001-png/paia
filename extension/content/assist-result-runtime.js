(() => {
'use strict';
// Shared original controller for the explicit Assist content bridge.
// Uses the existing prospective reply reader and native composer implementation.
class AssistResultController {
 constructor({reader,composer,document=globalThis.document,clock=()=>performance.now(),Observer=globalThis.MutationObserver,onInvalidated=()=>{}}={}){this.onInvalidated=onInvalidated;this.reader=reader;this.composer=composer;this.document=document;this.clock=clock;this.enabled=false;this.disposed=false;this.observer=new Observer(records=>this.scan(records));this.observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-message-id','data-message-author-role','data-is-streaming','data-testid','hidden','aria-hidden']});this.pagehide=()=>this.configure(false);document.defaultView.addEventListener('pagehide',this.pagehide);}
 configure(enabled){if(typeof enabled!=='boolean')throw Error('invalid');if(enabled!==this.enabled){this.enabled=enabled;this.reader.reset();this.onInvalidated();}return this.scan();}
 scan(delivered=[]){if(this.disposed||!this.enabled)return null;const current=this.reader.current,records=[...delivered,...this.observer.takeRecords()];const mutated=records.some(r=>current&&(r.target===current||current.contains(r.target))||r.type==='childList'&&[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&n.matches?.('[data-message-author-role],[data-testid^="conversation-turn"],[data-testid="stop-button"],[data-testid="continue-button"]')));const state=this.reader.observe(this.clock(),mutated);if(state.invalidated)this.onInvalidated();return state;}
 probe({snapshot=false}={}){const state=this.scan();if(!state?.ready)return state;return {...state,...(snapshot?{snapshot:this.reader.snapshot()}:{})};}
 current(binding){const s=this.scan();return s?.ready===true&&JSON.stringify(s.binding)===JSON.stringify(binding);}
 async insert({binding,text,condition,operationId,isCurrent,qualify,conditionPresented=false}){
  const current=()=>this.current(binding)&&typeof isCurrent==='function'&&isCurrent()===true;
  if(condition&&!conditionPresented||typeof qualify!=='function'||!current())return {status:'failed',reason:'stale_assist'};
  // The private host may await a transport handoff after session.result().
  // Re-read its actual dependencies here, then enter the synchronous native
  // composer transaction without another asynchronous transport boundary.
  try{if(await qualify()!==true||!current())return {status:'failed',reason:'stale_assist'};}
  catch{return {status:'failed',reason:'stale_assist'};}
  return this.composer.insert({text,operationId,url:binding.url,guard:current});
 }
 dispose(){this.disposed=true;this.enabled=false;this.observer.disconnect();this.document.defaultView.removeEventListener('pagehide',this.pagehide);this.reader.reset();this.onInvalidated();this.composer.dispose();}
}

globalThis.PAIAAssistResultController=AssistResultController;
})();
