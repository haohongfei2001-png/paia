import {element} from '../common.js';
// One real search input. An admitted page adapter owns the query/results;
// switching scope never creates another Input/body, service or route listener.
// A responsive search may share the Reader's visual column, but its native
// editing history and composition are never owned by DocumentEditor.
export function isolateScopeSearchEditing(host){
 const isolated=event=>{if(host.closest('#document-page'))event.stopPropagation();};
 for(const type of ['beforeinput','input','compositionstart','compositionend','focusout'])host.addEventListener(type,isolated);
 host.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&((event.key.toLowerCase()==='z'&&!event.altKey)||event.key.toLowerCase()==='y'))isolated(event);});
}
export class ScopeSearch {
 constructor({host,onInput=()=>{}}){
  this.host=host;this.scope=null;this.label=element('label','scope-search');this.label.htmlFor='scope-search';this.label.hidden=true;
  this.name=element('span','scope-search-label');this.input=element('input');this.input.id='scope-search';this.input.type='search';this.input.autocomplete='off';this.input.maxLength=500;
  this.label.append(this.name,this.input);host.append(this.label);isolateScopeSearchEditing(host);this.input.addEventListener('input',event=>{if(this.scope&&!this.input.disabled&&!event.isComposing)onInput(event,this.scope);});
  this.input.addEventListener('compositionend',event=>{if(this.scope&&!this.input.disabled)onInput(event,this.scope);});
  // Native IME/editing remains owned by the input. Page keyboard navigation is
  // delegated through the existing reviewed Archive handler, not keystroke capture.
 }
 present({scope=null,owner=null,label='',query='',placeholder=''}={}){
  const changed=this.scope!==scope||this.owner!==owner;this.scope=scope;this.owner=owner;this.label.hidden=!scope;this.name.textContent=label;this.input.setAttribute('aria-label',label);this.input.placeholder=placeholder||label;
  if(scope&&(changed||document.activeElement!==this.input)&&this.input.value!==query)this.input.value=query;
 }
 focus(){if(!this.scope||this.input.disabled||!this.input.getClientRects().length)return false;this.input.focus();this.input.select();return true;}
}
