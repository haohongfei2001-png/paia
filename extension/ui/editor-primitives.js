// Trusted extension UI only. These primitives know nothing about storage or sources.
export const textOf=el=>el.matches('input,textarea,select')?el.value:el.textContent===''?'':el.innerText;
export class PlainTextSurface {
 constructor(root,{start=()=>{},end=()=>{},input=()=>{},leave=()=>{},paste=null}={}){this.controller=new AbortController();const options={signal:this.controller.signal};this.composing=false;root.addEventListener('compositionstart',event=>{this.composing=true;start(event);},options);root.addEventListener('compositionend',()=>{this.composing=false;end();},options);root.addEventListener('input',()=>{if(!this.composing)input();},options);root.addEventListener('focusout',()=>{if(!this.composing)leave();},options);if(paste)root.addEventListener('paste',paste,options);}
 dispose(){this.controller.abort();}
}
export class AutosaveSession {
 constructor(flush,{delay=750,maxWait=3000,set=(...args)=>setTimeout(...args),clear=id=>clearTimeout(id)}={}){this.flush=flush;this.delay=delay;this.maxWait=maxWait;this.set=set;this.clear=clear;this.timer=null;this.maxTimer=null;}
 schedule(){this.clear(this.timer);this.timer=this.set(()=>this.flush(),this.delay);if(!this.maxTimer)this.maxTimer=this.set(()=>this.flush(),this.maxWait);}
 cancel(){this.clear(this.timer);this.clear(this.maxTimer);this.timer=this.maxTimer=null;}
 dispose(){this.cancel();}
}
export class UndoJournal {
 constructor({maxSteps=50,maxBytes=2000000}={}){this.undo=[];this.redo=[];this.maxSteps=maxSteps;this.maxBytes=maxBytes;}
 record(patch){this.undo.push(structuredClone(patch));this.redo=[];this.trim();}
 trim(){while(this.undo.length>this.maxSteps||JSON.stringify(this.undo).length>this.maxBytes)this.undo.shift();while(this.redo.length>this.maxSteps||JSON.stringify(this.redo).length>this.maxBytes)this.redo.shift();}
 clear(){this.undo=[];this.redo=[];}
 get bytes(){return JSON.stringify([this.undo,this.redo]).length;}
}
export class RevisionSession {
 constructor({idFactory=()=>crypto.randomUUID()}={}){this.idFactory=idFactory;this.last=null;this.deferred=null;}
 attempt(edit){const signature=JSON.stringify(edit);if(this.last?.signature!==signature)this.last={signature,operationId:this.idFactory()};return {...edit,operationId:this.last.operationId};}
 defer(value){this.deferred=value;}
 take(){const value=this.deferred;this.deferred=null;return value;}
 static conflicts(saved,local,versions,incoming,fields){return fields.filter(f=>versions[f]!==incoming.fieldRevisions[f]&&local[f]!==saved[f]);}
}
