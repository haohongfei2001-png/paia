// One transient owner for Original / History. Closing or switching invalidates
// pending reads before they can repaint; no body or durable route is retained.
export class ReadingModalHost {
 constructor(dialogs,{clear=()=>{}}={}){this.dialogs=dialogs;this.clear=clear;this.epoch=0;this.active=null;for(const dialog of dialogs){dialog.addEventListener('cancel',()=>this.clear(dialog));dialog.addEventListener('close',()=>{if(dialog.open)return;this.clear(dialog);if(this.active?.dialog===dialog){const prior=this.active;this.invalidate();const epoch=this.epoch;queueMicrotask(()=>{if(this.epoch===epoch&&!this.active&&prior.trigger?.isConnected){prior.trigger.focus({preventScroll:true});window.scrollTo(prior.scroll.x,prior.scroll.y);}});}});}
 }
 invalidate(){++this.epoch;this.active=null;}
 close(){this.invalidate();for(const dialog of this.dialogs){this.clear(dialog);if(dialog.open)dialog.close();}}
 open(dialog,{trigger=document.activeElement,target=null}={}){
  this.close();const token=++this.epoch;this.active={dialog,target,trigger,token,scroll:{x:window.scrollX,y:window.scrollY}};
  dialog.showModal();const heading=dialog.querySelector('h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  return ()=>this.active?.token===token&&dialog.open;
 }
}
