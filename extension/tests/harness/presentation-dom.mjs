// Minimal DOM operations shared by presentation unit fixtures. This does not
// provide layout or substitute for the owning native-browser verification.
const HTML_NAMESPACE='http://www.w3.org/1999/xhtml';
export class PresentationNode {
 constructor(tag='div',namespaceURI=HTML_NAMESPACE){
  this.namespaceURI=namespaceURI;this.tagName=namespaceURI===HTML_NAMESPACE?tag.toUpperCase():tag;this.nodeType=tag==='#text'?3:1;
  this.childNodes=[];this.parentElement=null;this.dataset={};this.attributes=new Map();this.className='';this._text='';
  this.listeners=new Map();this.value='';this.hidden=false;
  this.classList={contains:name=>this.className.split(/\s+/).includes(name),add:(...names)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...names])].join(' ');},remove:(...names)=>{this.className=this.className.split(/\s+/).filter(name=>name&&!names.includes(name)).join(' ');},toggle:(name,force)=>{const on=force??!this.classList.contains(name);if(on)this.classList.add(name);else this.classList.remove(name);return on;}};
 }
 get children(){return this.childNodes.filter(node=>node.nodeType===1);}
 get firstChild(){return this.childNodes[0]||null;}
 get firstElementChild(){return this.children[0]||null;}
 get nextSibling(){return this.parentElement?.childNodes[this.parentElement.childNodes.indexOf(this)+1]||null;}
 get isConnected(){return this===globalThis.document?.body||this.parentElement?.isConnected===true;}
 get textContent(){return this.nodeType===3?this._text:this.childNodes.map(node=>node.textContent).join('');}
 set textContent(text){if(this.nodeType===3)this._text=String(text??'');else this.replaceChildren(...(text===null||text===undefined||text===''?[]:[presentationText(text)]));}
 contains(node){return this===node||this.childNodes.some(child=>child.contains(node));}
 remove(){if(this.parentElement){const siblings=this.parentElement.childNodes;siblings.splice(siblings.indexOf(this),1);}this.parentElement=null;}
 insertBefore(node,before){if(typeof node==='string')node=presentationText(node);if(node===before)return node;if(node.contains(globalThis.document?.activeElement))document.activeElement=null;node.remove();node.parentElement=this;const index=before?this.childNodes.indexOf(before):this.childNodes.length;this.childNodes.splice(index<0?this.childNodes.length:index,0,node);return node;}
 append(...nodes){for(const node of nodes)this.insertBefore(node,null);}
 prepend(...nodes){for(const node of [...nodes].reverse())this.insertBefore(node,this.firstChild);}
 replaceChildren(...nodes){for(const child of this.childNodes)child.parentElement=null;this.childNodes=[];this.append(...nodes);}
 setAttribute(name,value){const text=String(value);this.attributes.set(name,text);if(name==='class')this.className=text;else if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=text;else this[name]=text;}
 getAttribute(name){if(name==='class')return this.className||null;if(name.startsWith('data-'))return this.dataset[name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]??null;return this.attributes.get(name)??null;}
 removeAttribute(name){this.attributes.delete(name);if(name==='class')this.className='';else if(name.startsWith('data-'))delete this.dataset[name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())];else delete this[name];}
 addEventListener(type,listener){this.listeners.set(type,listener);}
 focus(){document.activeElement=this;}
}
export function presentationText(text){const node=new PresentationNode('#text');node.textContent=text;return node;}
